import { supabase } from './supabase.js';

// Cooldown key dính 429/quota: 60s (pattern tái dùng từ AI Markdown Writer / metruyen)
const cooldownUntil = new Map();

export async function listKeys() {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('*')
    .eq('provider', 'gemini')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function testKey(apiKey) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`,
      { signal: ctrl.signal }
    );
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export async function addKey(label, apiKey) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('user_api_keys')
    .insert({
      user_id: user.id,
      provider: 'gemini',
      label: label.trim() || 'Key 1',
      api_key: apiKey.trim(),
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleKey(id, isActive) {
  const { error } = await supabase
    .from('user_api_keys')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteKey(id) {
  const { error } = await supabase.from('user_api_keys').delete().eq('id', id);
  if (error) throw error;
  cooldownUntil.delete(id);
}

export function maskKey(k) {
  const s = (k || '').trim();
  if (s.length <= 8) return '••••';
  return s.slice(0, 4) + '••••••••' + s.slice(-4);
}

// Lọc key đang bật và không trong thời gian cooldown
export function pickUsableKeys(keys) {
  const now = Date.now();
  return keys.filter((k) => k.is_active && (cooldownUntil.get(k.id) || 0) <= now);
}

export function markKeyCooldown(id, ms = 60000) {
  cooldownUntil.set(id, Date.now() + ms);
}
