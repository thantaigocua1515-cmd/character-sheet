import { configOk } from './lib/supabase.js';
import { getSession, signIn, signUp, signOut, onAuthChange } from './lib/auth.js';
import { listKeys, testKey, addKey, toggleKey, deleteKey, maskKey } from './lib/keys.js';
import { defaultCharacters, loadCharacters, saveCharacter } from './lib/characters.js';
import { generateSheet, saveSheet } from './lib/generate.js';
import { listSheets, signedImageUrl, deleteSheet } from './lib/gallery.js';

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let keys = [];
let characters = []; // [{...} + slot], có id khi đã lưu DB
let authMode = 'signin';

/* ---------------- Theme: sáng / tối ---------------- */
function initTheme() {
  const saved = localStorage.getItem('cs-theme');
  const theme =
    saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  updateThemeIcon();
}
function updateThemeIcon() {
  const dark = document.documentElement.dataset.theme === 'dark';
  $('btn-theme').textContent = dark ? '☀️' : '🌙';
  $('btn-theme').title = dark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối';
}

init();

async function init() {
  initTheme();
  $('btn-theme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('cs-theme', next);
    updateThemeIcon();
  });
  if (!configOk) {
    $('config-error').hidden = false;
    return;
  }
  wireAuth();
  wireTabs();
  $('btn-logout').addEventListener('click', async () => { await signOut(); });
  const session = await getSession();
  await renderForSession(session);
  onAuthChange((s) => renderForSession(s));
}

async function renderForSession(session) {
  const logged = Boolean(session?.user);
  $('auth-view').hidden = logged;
  $('main-view').hidden = !logged;
  $('userbox').hidden = !logged;
  if (!logged) return;
  $('user-email').textContent = session.user.email;
  await reloadAll();
}

async function reloadAll() {
  try {
    keys = await listKeys();
  } catch (e) {
    console.error(e);
    keys = [];
  }
  renderKeys();
  await loadCharacterForms();
  renderGenCards();
  await renderGallery();
}

/* ---------------- Auth ---------------- */

function wireAuth() {
  $('auth-switch-link').addEventListener('click', (e) => {
    e.preventDefault();
    authMode = authMode === 'signin' ? 'signup' : 'signin';
    $('auth-title').textContent = authMode === 'signin' ? 'Đăng nhập' : 'Đăng ký';
    $('btn-auth-submit').textContent = authMode === 'signin' ? 'Đăng nhập' : 'Đăng ký';
    $('auth-switch-text').textContent = authMode === 'signin' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?';
    $('auth-switch-link').textContent = authMode === 'signin' ? 'Đăng ký' : 'Đăng nhập';
    $('auth-error').hidden = true;
    $('auth-info').hidden = true;
  });
  $('btn-auth-submit').addEventListener('click', async () => {
    const email = $('auth-email').value.trim();
    const password = $('auth-password').value;
    const errBox = $('auth-error');
    const infoBox = $('auth-info');
    errBox.hidden = true;
    infoBox.hidden = true;
    if (!email || !password) {
      errBox.textContent = 'Nhập email và mật khẩu.';
      errBox.hidden = false;
      return;
    }
    const btn = $('btn-auth-submit');
    btn.disabled = true;
    try {
      if (authMode === 'signin') {
        await signIn(email, password);
        // onAuthStateChange sẽ tự chuyển sang màn hình chính
      } else {
        const { session } = await signUp(email, password);
        if (session) {
          // Xác nhận email đang TẮT → có session ngay, onAuthStateChange lo tiếp
        } else {
          // Supabase đang BẬT "Confirm email" → chưa có session
          infoBox.textContent =
            'Đăng ký thành công! Kiểm tra email để xác nhận tài khoản, rồi đăng nhập. ' +
            '(Muốn bỏ bước này: Supabase Dashboard → Authentication → Providers → Email → tắt "Confirm email".)';
          infoBox.hidden = false;
        }
      }
    } catch (e) {
      errBox.textContent = friendlyAuthError(e.message);
      errBox.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
}

function friendlyAuthError(msg = '') {
  if (/email not confirmed/i.test(msg))
    return 'Email chưa được xác nhận. Kiểm tra hộp thư của bạn, hoặc tắt "Confirm email" trong Supabase (Authentication → Providers → Email).';
  if (/invalid login credentials/i.test(msg)) return 'Sai email hoặc mật khẩu.';
  if (/already registered|already exists|duplicate/i.test(msg))
    return 'Email này đã được đăng ký — hãy đăng nhập.';
  if (/password.*(short|weak|6 characters)/i.test(msg)) return 'Mật khẩu phải từ 6 ký tự trở lên.';
  return msg || 'Đã có lỗi xảy ra.';
}

/* ---------------- Tabs ---------------- */

function wireTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = true));
      $('tab-' + btn.dataset.tab).hidden = false;
    });
  });
}

/* ---------------- Nhân vật ---------------- */

function charField(slot, name, label, value, type = 'text', placeholder = '') {
  return `<label>${esc(label)}<input id="c${slot}-${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" /></label>`;
}

function renderCharacterForm(char) {
  const slot = char.slot;
  const exprInputs = [0, 1, 2, 3, 4, 5]
    .map((i) => `<input id="c${slot}-expr-${i}" value="${esc((char.expressions || [])[i] || '')}" />`)
    .join('');
  const actionInputs = [0, 1, 2]
    .map((i) => `<label>Hành động ${i + 1}<input id="c${slot}-act-${i}" value="${esc((char.actions || [])[i] || '')}" /></label>`)
    .join('');
  const paletteRows = (char.palette || [])
    .map(
      (p, i) => `<div class="palette-row" data-i="${i}">
        <input id="c${slot}-pal-label-${i}" value="${esc(p.label || '')}" placeholder="vd: burnt orange fur" />
        <input id="c${slot}-pal-hex-${i}" type="color" value="${esc(p.hex || '#B85C2B')}" />
        <button class="btn btn-sm" data-pal-del="${slot}:${i}">✕</button>
      </div>`
    )
    .join('');
  return `<div class="card">
    <h3>Nhân vật ${slot}</h3>
    <div class="form-grid">
      ${charField(slot, 'name', 'Tên', char.name, 'text', 'Squirrel')}
      ${charField(slot, 'species', 'Loài', char.species, 'text', 'Red squirrel')}
      ${charField(slot, 'role', 'Vai trò', char.role)}
      ${charField(slot, 'age', 'Tuổi', char.age, 'text', 'Young (Adult)')}
    </div>
    ${charField(slot, 'personality', 'Tính cách', char.personality, 'text', 'Energetic, clever, playful, brave')}
    ${charField(slot, 'traits', 'Đặc điểm', char.traits, 'text', 'Quick, curious, determined')}
    ${charField(slot, 'art_style', 'Phong cách vẽ', char.art_style)}
    ${charField(slot, 'hero_pose', 'Dáng pose chính', char.hero_pose)}
    <div class="subhead">Bảng màu <button class="btn btn-sm" data-pal-add="${slot}">+ Thêm màu</button></div>
    <div id="c${slot}-palette">${paletteRows}</div>
    <div class="subhead">6 biểu cảm</div>
    <div class="expr-grid">${exprInputs}</div>
    <div class="subhead">3 dáng hành động</div>
    ${actionInputs}
  </div>`;
}

async function loadCharacterForms() {
  let saved = [];
  try {
    saved = await loadCharacters();
  } catch (e) {
    console.error(e);
  }
  const defaults = defaultCharacters();
  characters = [1, 2].map((slot) => {
    const row = saved.find((r) => r.slot === slot);
    return row ? { ...row } : { ...defaults[slot - 1], id: null };
  });
  $('char-forms').innerHTML = characters.map(renderCharacterForm).join('');

  // Nút thêm / xóa màu
  document.querySelectorAll('[data-pal-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slot = Number(btn.dataset.palAdd);
      const box = $('c' + slot + '-palette');
      const i = box.children.length;
      const div = document.createElement('div');
      div.className = 'palette-row';
      div.dataset.i = i;
      div.innerHTML = `<input id="c${slot}-pal-label-${i}" placeholder="vd: white fur" />
        <input id="c${slot}-pal-hex-${i}" type="color" value="#F7F3EC" />
        <button class="btn btn-sm" data-pal-del="${slot}:${i}">✕</button>`;
      box.appendChild(div);
      div.querySelector('[data-pal-del]').addEventListener('click', () => div.remove());
    });
  });
  document.querySelectorAll('[data-pal-del]').forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('.palette-row').remove());
  });

  $('btn-save-chars').onclick = saveCharacters;
}

function collectCharacter(slot) {
  const val = (id) => $(id)?.value.trim() || '';
  const palette = [...$('c' + slot + '-palette').children].map((row, i) => {
    const idx = row.dataset.i;
    return {
      label: val(`c${slot}-pal-label-${idx}`),
      hex: $(`c${slot}-pal-hex-${idx}`)?.value || '#000000',
    };
  }).filter((p) => p.hex);
  const prev = characters.find((c) => c.slot === slot) || {};
  return {
    id: prev.id || null,
    slot,
    name: val(`c${slot}-name`),
    species: val(`c${slot}-species`),
    role: val(`c${slot}-role`),
    personality: val(`c${slot}-personality`),
    traits: val(`c${slot}-traits`),
    age: val(`c${slot}-age`),
    palette,
    art_style: val(`c${slot}-art_style`),
    hero_pose: val(`c${slot}-hero_pose`),
    expressions: [0, 1, 2, 3, 4, 5].map((i) => val(`c${slot}-expr-${i}`)),
    actions: [0, 1, 2].map((i) => val(`c${slot}-act-${i}`)),
  };
}

async function saveCharacters() {
  const msg = $('chars-saved-msg');
  msg.hidden = true;
  try {
    for (const slot of [1, 2]) {
      const saved = await saveCharacter(collectCharacter(slot));
      const idx = characters.findIndex((c) => c.slot === slot);
      characters[idx] = { ...saved };
    }
    renderGenCards();
    msg.hidden = false;
    setTimeout(() => (msg.hidden = true), 2500);
  } catch (e) {
    alert('Lưu thất bại: ' + e.message);
  }
}

/* ---------------- Tạo ảnh ---------------- */

function renderGenCards() {
  $('gen-cards').innerHTML = characters
    .map(
      (c) => `<div class="card">
        <h3>${esc(c.name || 'Nhân vật ' + c.slot)}</h3>
        <p class="hint">${esc(c.species || '')} — ${esc(c.role || '')}</p>
        <button class="btn btn-primary" data-gen="${c.slot}">✨ Tạo model sheet</button>
      </div>`
    )
    .join('') + `<div class="card"><h3>Cả 2 nhân vật</h3>
      <p class="hint">Tạo lần lượt từng nhân vật (mỗi nhân vật 1 ảnh riêng).</p>
      <button class="btn btn-primary" id="btn-gen-both">✨ Tạo cả 2</button></div>`;

  document.querySelectorAll('[data-gen]').forEach((btn) => {
    btn.addEventListener('click', () => generateOne(Number(btn.dataset.gen)));
  });
  $('btn-gen-both').addEventListener('click', generateBoth);
}

function setProgress(text) {
  const el = $('gen-progress');
  if (!text) {
    el.hidden = true;
    el.textContent = '';
  } else {
    el.hidden = false;
    el.textContent = text;
  }
}

async function generateOne(slot) {
  const char = collectCharacter(slot);
  if (!char.name) {
    alert('Nhập tên nhân vật trước.');
    return;
  }
  setProgress('');
  $('gen-result').hidden = true;
  try {
    const { blob, prompt, keyLabel } = await generateSheet(char, keys, setProgress);
    setProgress('Đang lưu ảnh lên Supabase...');
    const saved = await saveCharacter(char).catch(() => null); // lưu nhân vật nếu chưa lưu
    const row = await saveSheet({
      characterId: saved?.id || char.id,
      characterName: char.name,
      prompt,
      blob,
      keyLabel,
    });
    const url = URL.createObjectURL(blob);
    $('gen-result').innerHTML = `<h3>✓ Xong — ${esc(char.name)} <span class="hint">(qua ${esc(keyLabel)})</span></h3>
      <img src="${url}" alt="sheet" />
      <p class="hint">Đã lưu vào Gallery lúc ${new Date(row.created_at).toLocaleString('vi-VN')}.</p>`;
    $('gen-result').hidden = false;
    setProgress('');
    await renderGallery();
  } catch (e) {
    setProgress('');
    alert(e.message);
  }
}

async function generateBoth() {
  for (const slot of [1, 2]) {
    await generateOne(slot);
  }
}

/* ---------------- Gallery ---------------- */

async function renderGallery() {
  const grid = $('gallery-grid');
  const empty = $('gallery-empty');
  grid.innerHTML = '';
  let sheets = [];
  try {
    sheets = await listSheets();
  } catch (e) {
    grid.innerHTML = `<p class="form-error">${esc(e.message)}</p>`;
    return;
  }
  empty.hidden = sheets.length > 0;
  for (const s of sheets) {
    const card = document.createElement('div');
    card.className = 'gcard';
    card.innerHTML = `<div class="gthumb">đang tải...</div>
      <div class="gmeta"><b>${esc(s.character_name || '—')}</b>
      <span class="hint">${new Date(s.created_at).toLocaleString('vi-VN')}</span></div>
      <div class="grow-btns">
        <button class="btn btn-sm" data-view>👁 Xem</button>
        <button class="btn btn-sm" data-dl>⬇ Tải</button>
        <button class="btn btn-sm btn-danger" data-del>🗑 Xóa</button>
      </div>`;
    grid.appendChild(card);
    try {
      const url = await signedImageUrl(s.storage_path);
      card.querySelector('.gthumb').innerHTML = `<img src="${url}" loading="lazy" alt="sheet" />`;
      card.querySelector('[data-view]').addEventListener('click', () => openModal(url));
      card.querySelector('[data-dl]').addEventListener('click', () => downloadUrl(url, `${s.character_name || 'sheet'}-${s.id.slice(0, 8)}.png`));
    } catch (e) {
      card.querySelector('.gthumb').textContent = 'Lỗi tải ảnh';
    }
    card.querySelector('[data-del]').addEventListener('click', async () => {
      if (!confirm(`Xóa ảnh "${s.character_name}"?`)) return;
      try {
        await deleteSheet(s);
        await renderGallery();
      } catch (e) {
        alert('Xóa thất bại: ' + e.message);
      }
    });
  }
}

async function downloadUrl(url, filename) {
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function openModal(url) {
  $('modal-img').src = url;
  $('img-modal').hidden = false;
}
$('modal-close').addEventListener('click', () => ($('img-modal').hidden = true));
$('modal-bg').addEventListener('click', () => ($('img-modal').hidden = true));
$('btn-reload-gallery').addEventListener('click', renderGallery);

/* ---------------- API Keys ---------------- */

function renderKeys() {
  const box = $('keys-list');
  if (!keys.length) {
    box.innerHTML = '<p class="hint">Chưa có key nào. Thêm key Gemini ở trên.</p>';
    return;
  }
  box.innerHTML = keys
    .map(
      (k) => `<div class="key-row">
        <b>${esc(k.label)}</b>
        <code>${esc(maskKey(k.api_key))}</code>
        <label class="switch"><input type="checkbox" data-key-toggle="${k.id}" ${k.is_active ? 'checked' : ''} /> Bật</label>
        <button class="btn btn-sm btn-danger" data-key-del="${k.id}">Xóa</button>
      </div>`
    )
    .join('');
  box.querySelectorAll('[data-key-toggle]').forEach((cb) => {
    cb.addEventListener('change', async () => {
      try {
        await toggleKey(cb.dataset.keyToggle, cb.checked);
        keys = await listKeys();
        renderKeys();
      } catch (e) {
        alert('Lỗi: ' + e.message);
      }
    });
  });
  box.querySelectorAll('[data-key-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Xóa key này?')) return;
      try {
        await deleteKey(btn.dataset.keyDel);
        keys = await listKeys();
        renderKeys();
      } catch (e) {
        alert('Lỗi: ' + e.message);
      }
    });
  });
}

$('btn-test-key').addEventListener('click', async () => {
  const msg = $('key-test-msg');
  const v = $('key-value').value.trim();
  if (!v) {
    msg.textContent = 'Nhập key trước.';
    return;
  }
  msg.textContent = 'Đang kiểm tra...';
  const ok = await testKey(v);
  msg.textContent = ok ? '✓ Key hợp lệ' : '✕ Key không hợp lệ hoặc lỗi mạng';
});

$('btn-add-key').addEventListener('click', async () => {
  const label = $('key-label').value.trim() || `Key ${keys.length + 1}`;
  const value = $('key-value').value.trim();
  if (!value) {
    alert('Nhập API key.');
    return;
  }
  try {
    await addKey(label, value);
    $('key-label').value = '';
    $('key-value').value = '';
    $('key-test-msg').textContent = '';
    keys = await listKeys();
    renderKeys();
  } catch (e) {
    alert('Thêm key thất bại: ' + e.message);
  }
});
