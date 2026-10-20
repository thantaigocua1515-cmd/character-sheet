import { supabase } from './supabase.js';
import { pickUsableKeys, markKeyCooldown } from './keys.js';
import { buildSheetPrompt } from './prompt.js';

// Model ảnh mặc định (Nano Banana 2) — đã verify trong metruyen.
// LƯU Ý: model text như gemini-3.8-flash KHÔNG tạo được ảnh (Google chỉ cho output text).
export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image';
export const KNOWN_IMAGE_MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image-preview'];
const TIMEOUT_MS = 120000;

function base64ToBlob(base64, mimeType) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || 'image/png' });
}

async function readGeminiError(res) {
  let msg = '';
  let details = null;
  try {
    const j = await res.json();
    msg = j?.error?.message || '';
    details = j?.error?.details || null;
  } catch {
    /* bỏ qua — giữ message rỗng */
  }
  return { msg, details };
}

// Dịch chi tiết quota của Google thành hướng xử lý cụ thể
function quotaHint(details, msg) {
  const s = JSON.stringify(details || '') + ' ' + (msg || '');
  if (/free_tier/i.test(s) || /limit:\s*0/i.test(s)) {
    return (
      'Quota model ảnh = 0: project của key này chưa bật thanh toán (billing) — ' +
      'model ảnh Gemini không có free tier. Vào Google AI Studio, chọn đúng project của key ' +
      'rồi bật Billing (mỗi ảnh ~$0.04). Thêm key mới trong cùng project cũng không hết lỗi này.'
    );
  }
  return 'Quota tính theo project (không phải theo key). Đợi vài phút rồi thử lại, hoặc xem hạn mức ở AI Studio → Rate limits.';
}

async function callGeminiImage(apiKey, prompt, model) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      }
    );
    if (res.status === 429) {
      const { msg, details } = await readGeminiError(res);
      const e = new Error(`Hết quota (429). ${quotaHint(details, msg)}${msg ? ` Chi tiết từ Google: ${msg}` : ''}`);
      e.code = 429;
      throw e;
    }
    if (!res.ok) {
      const { msg } = await readGeminiError(res);
      throw new Error(`Gemini lỗi HTTP ${res.status}${msg ? ': ' + msg : ''}`);
    }
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'Gemini báo lỗi');
    const parts = json.candidates?.[0]?.content?.parts || [];
    const img = parts.find((p) => p.inlineData?.data);
    if (!img) throw new Error('Gemini không trả về ảnh');
    return base64ToBlob(img.inlineData.data, img.inlineData.mimeType || 'image/png');
  } finally {
    clearTimeout(t);
  }
}

// Test nhanh 1 key có tạo được ảnh không (prompt tối thiểu) — dùng ở tab API Keys
export async function testImageGeneration(apiKey, model) {
  const useModel = (model || '').trim() || DEFAULT_IMAGE_MODEL;
  const blob = await callGeminiImage(
    apiKey,
    'A simple red circle on a plain white background, flat icon style.',
    useModel
  );
  return blob.size > 0;
}

// Pollinations.ai — miễn phí, không cần key. Prompt dài nên timeout rộng.
const POLL_TIMEOUT_MS = 180000;
async function callPollinationsImage(prompt, model) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), POLL_TIMEOUT_MS);
  try {
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=1024&height=1024&nologo=true&model=${encodeURIComponent(model || 'flux')}` +
      `&seed=${Math.floor(Math.random() * 1000000)}`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Pollinations lỗi HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error('Pollinations không trả về ảnh');
    return blob;
  } finally {
    clearTimeout(t);
  }
}

// Tạo ảnh 1 nhân vật.
// provider: 'gemini' (cần API key, tự xoay vòng khi 429) | 'pollinations' (miễn phí, không cần key)
export async function generateSheet(character, keys, onProgress, model, provider) {
  const prompt = buildSheetPrompt(character);
  if (provider === 'pollinations') {
    const pModel = (model || '').trim() || 'flux';
    onProgress?.(`Đang tạo ảnh "${character.name}" bằng Pollinations (miễn phí, model ${pModel})...`);
    const blob = await callPollinationsImage(prompt, pModel);
    return { blob, prompt, keyLabel: 'Pollinations', model: `pollinations/${pModel}` };
  }
  const useModel = (model || '').trim() || DEFAULT_IMAGE_MODEL;
  const usable = pickUsableKeys(keys);
  if (!usable.length) {
    throw new Error('Không có API key khả dụng — thêm key ở tab "API Keys".');
  }
  let lastErr = null;
  for (const k of usable) {
    try {
      onProgress?.(`Đang tạo ảnh "${character.name}" bằng ${k.label} (model ${useModel})...`);
      const blob = await callGeminiImage(k.api_key, prompt, useModel);
      return { blob, prompt, keyLabel: k.label, model: useModel };
    } catch (e) {
      lastErr = e;
      if (e.code === 429) markKeyCooldown(k.id);
    }
  }
  throw new Error(`Tạo ảnh thất bại ở mọi key (model ${useModel}): ${lastErr?.message || 'lỗi không rõ'}`);
}

// Upload ảnh lên Storage + ghi record vào cs_sheets
export async function saveSheet({ characterId, characterName, prompt, blob, keyLabel, model }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Chưa đăng nhập');
  const path = `${user.id}/${Date.now()}.png`;
  const { error: upErr } = await supabase.storage
    .from('cs-sheets')
    .upload(path, blob, { contentType: 'image/png' });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from('cs_sheets')
    .insert({
      user_id: user.id,
      character_id: characterId || null,
      character_name: characterName,
      prompt,
      storage_path: path,
      model: model || DEFAULT_IMAGE_MODEL,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...data, keyLabel };
}
