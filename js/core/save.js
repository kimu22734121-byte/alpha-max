// セーブ（localStorage）。手動セーブ3枠＋オートセーブ
export const SAVE_VERSION = 2;
const KEY_AUTO = 'alphamax.auto';
const slotKey = (n) => `alphamax.slot${n}`;

function write(key, state, label) {
  try {
    const data = { v: SAVE_VERSION, savedAt: Date.now(), label, state };
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('save failed', e);
    return false;
  }
}

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return migrate(data);
  } catch (e) {
    console.warn('load failed', e);
    return null;
  }
}

// セーブ形式を変えたらここで古いデータを直す
// v1 → v2：第1章の流れ（町3つ・仲間の加入・マシン構成）を作り直したので、v1 のデータは使わない
function migrate(data) {
  if (!data || !data.state) return null;
  if ((data.v || 1) < 2) return null;
  return data;
}

export const save = {
  auto(state, label) { return write(KEY_AUTO, state, label); },
  slot(n, state, label) { return write(slotKey(n), state, label); },
  loadAuto() { return read(KEY_AUTO); },
  loadSlot(n) { return read(slotKey(n)); },
  hasAny() { return !!(read(KEY_AUTO) || [1, 2, 3].some((n) => read(slotKey(n)))); },
  summaries() {
    return [1, 2, 3].map((n) => ({ n, data: read(slotKey(n)) }));
  },
};

export function describeSave(data) {
  if (!data) return '― データなし ―';
  const d = new Date(data.savedAt);
  const ts = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${data.label || ''}　${ts}`;
}
