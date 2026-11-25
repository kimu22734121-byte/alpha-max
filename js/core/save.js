// セーブ（localStorage）。手動セーブ3枠＋オートセーブ
export const SAVE_VERSION = 7;
import { START_EQUIP } from '../data/footgear.js';
const KEY_AUTO = 'alphamax.auto';
const slotKey = (n) => `alphamax.slot${n}`;

// 開発者の部屋（デバッグ用）にいた印は残さない：中でセーブしたら地下格納庫の入口にいたことにする
function clean(state) {
  if (state?.pos?.map !== 'devroom') return state;
  return { ...state, pos: { map: 'basement', x: 22.5, y: 4.5, dir: 0 } };
}

function write(key, state, label) {
  try {
    const data = { v: SAVE_VERSION, savedAt: Date.now(), label: state?.pos?.map === 'devroom' ? label.replace('開発者の部屋', '修理屋の地下') : label, state: clean(state) };
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
// v2 → v3：フィールドとダンジョンを約2倍に作り直したので、そこにいたら最後の町から再開する
// v3 → v4：町3つの形とお店の配置を作り直したので、町の中（建物の中も）にいたら町の入口から再開する
const RESHAPED = ['field1', 'mine1', 'ship1', 'factory1'];
const TOWN_GATE = { town1: [15, 23], town2: [12, 43], town3: [20, 31] };
function migrate(data) {
  if (!data || !data.state) return null;
  if ((data.v || 1) < 2) return null;
  if (data.v < 3) {
    const G = data.state;
    const town = G.lastTown || 'town1';
    if (RESHAPED.includes(G.pos.map)) {
      const [x, y] = TOWN_GATE[town] || TOWN_GATE.town1;
      G.pos = { map: town, x: x + 0.5, y: y + 0.5, dir: Math.PI };
    }
    for (const mc of Object.values(G.machines || {})) {
      if ((mc.loc?.type === 'map' && RESHAPED.includes(mc.loc.map)) || mc.loc?.type === 'party') mc.loc = { type: 'garage', town };
    }
    G.flags ||= {};
    (G.flags.visited ||= {})[town] = true;
    data.v = 3;
  }
  if (data.v < 4) {
    const G = data.state;
    const m = G.pos.map;
    const town = /^town[123]/.exec(m)?.[0];
    if (town && m !== `${town}_shop`) {
      const [x, y] = TOWN_GATE[town];
      G.pos = { map: town, x: x + 0.5, y: y + 0.5, dir: Math.PI };
    }
    data.v = 4;
  }
  // v4 → v5：生身の装備が「武器・防具」から「武器・頭・体・手・足・アクセサリー」になった
  if (data.v < 5) {
    for (const m of Object.values(data.state.members || {})) {
      const old = m.equip || {};
      const base = START_EQUIP[m.id] || {};
      m.equip = { weapon: old.weapon ?? base.weapon ?? null, head: base.head ?? null, body: old.armor ?? base.body ?? null, hands: base.hands ?? null, feet: base.feet ?? null, acc: null };
    }
    data.v = 5;
  }
  // v5 → v6：同じマシン・パーツを複数持てるように、1台・1個ずつ別のものとして管理する
  if (data.v < 6) {
    const G = data.state;
    let uid = G.uid || 1;
    for (const [key, mc] of Object.entries(G.machines || {})) {
      mc.id = key; mc.type ||= key;
      mc.partInst ||= Object.fromEntries(Object.keys(mc.parts || {}).map((k) => [k, { uid: `p${uid++}` }]));
    }
    const old = G.inv?.parts || {};
    if (!Array.isArray(old)) G.inv.parts = Object.entries(old).flatMap(([id, n]) => Array.from({ length: Math.max(0, n) }, () => ({ uid: `p${uid++}`, id })));
    G.testGot ||= { foot: {}, items: {}, mats: {}, gear: 0 };
    G.uid = uid;
    data.v = 6;
  }
  // v6 → v7：武器の取り付け位置を6か所（右腕・左腕・右肩・左肩・背中右・背中左）＋アルファの胸のコアに変えた
  //   旧「背中・中央」の武器は右肩へ、旧「背中・右／左」は新しい背中・右／左へ。まだ開いていない場所なら、開いている空きへ移す（無ければ外して持ち物に残る）
  //   アルファバスターはアルファの専用武器「ルミナス・ランス」に、アルファには胸のコアのステラ・ブレイカーを付ける
  if (data.v < 7) {
    const G = data.state;
    let uid = G.uid || 1;
    for (const w of G.inv?.weapons || []) if (w.id === 'abuster') w.id = 'alpha_lance';
    const BASE = { body_alpha: 4, body_omega: 6, body_gaia: 5 };
    for (const mc of Object.values(G.machines || {})) {
      const o = mc.slots || [];
      const n = [o[0] || null, o[1] || null, o[2] || null, null, o[3] || null, o[4] || null, null];
      const open = Math.min(6, (BASE[mc.parts?.body] || 3) + (mc.mods?.frame || 0));
      for (let i = open; i < 6; i++) {
        if (!n[i]) continue;
        const free = [2, 3, 4, 5].find((k) => k < open && !n[k]);
        if (free != null) n[free] = n[i];
        n[i] = null;
      }
      mc.slots = n;
      if (mc.type === 'alpha') {
        const st = `w${uid++}`;
        G.inv.weapons.push({ uid: st, id: 'stella', plus: 0 });
        mc.slots[6] = st;
      }
    }
    G.uid = uid;
    data.v = 7;
  }
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
