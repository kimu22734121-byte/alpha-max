// 第4〜7章のフィールドの向き（v2.0〜）
// 第4〜7章のフィールドは同じ生成スクリプトで作ったので、町やダンジョンの位置がそっくりだった。
// 章ごとに地図を裏返したり（左右・上下）、縦横を入れかえたりして、位置と道のりを変える。
//   h＝左右を反対に（東と西が入れかわる） / v＝上下を反対に（北と南が入れかわる） / hv＝両方 / t＝縦と横を入れかえる（北→西・南→東）
// 町の人の話や「つぎの目的」に出てくる東西南北も、同じように入れかえる（swapDirs）
export const ORIENT = { 4: 'h', 5: 'v', 6: 'hv', 7: 't' };

const SWAP = {
  h: { 東: '西', 西: '東' },
  v: { 北: '南', 南: '北' },
  hv: { 東: '西', 西: '東', 北: '南', 南: '北' },
  t: { 北: '西', 西: '北', 南: '東', 東: '南' },
};
export function swapDirs(s, ch) {
  const m = SWAP[ORIENT[ch]];
  if (!m || typeof s !== 'string') return s;
  return s.replace(/[東西南北]/g, (c) => m[c] || c);
}

const DIRS = {
  h: { left: 'right', right: 'left' },
  v: { up: 'down', down: 'up' },
  hv: { left: 'right', right: 'left', up: 'down', down: 'up' },
  t: { up: 'left', left: 'up', down: 'right', right: 'down' },
};

// 1マスの点（タイル座標）を向きに合わせて動かす。W・H は元の大きさ
function pt(mode, x, y, W, H) {
  if (mode === 't') return [y, x];
  return [mode.includes('h') ? W - 1 - x : x, mode.includes('v') ? H - 1 - y : y];
}
// 範囲（x0〜x1・y0〜y1、x1・y1 は含まない）
function rect(mode, z, W, H) {
  if (mode === 't') return { ...z, x0: z.y0, x1: z.y1, y0: z.x0, y1: z.x1 };
  const o = { ...z };
  if (mode.includes('h')) { o.x0 = W - z.x1; o.x1 = W - z.x0; }
  if (mode.includes('v')) { o.y0 = H - z.y1; o.y1 = H - z.y0; }
  return o;
}

const KEEP_KEYS = new Set(['id', 'model', 'to', 'style', 'kind', 'bgm', 'biome', 'require', 'flag', 'bounty', 'shop', 'facility', 'event', 'ground', 'dir', 'rows']);
function swapAll(o, ch) {
  if (Array.isArray(o)) return o.map((v) => (typeof v === 'string' ? swapDirs(v, ch) : swapAll(v, ch)));
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      if (KEEP_KEYS.has(k)) continue;
      o[k] = typeof v === 'string' ? swapDirs(v, ch) : swapAll(v, ch);
    }
  }
  return o;
}

// MAPS（広げる前・grid を作る前）の章ごとのフィールドの向きを変える。chapterMaps＝{ 章: その章のマップの表 }
export function orientChapters(MAPS, chapterMaps) {
  for (const [chs, group] of Object.entries(chapterMaps)) {
    const ch = Number(chs), mode = ORIENT[ch];
    if (!mode) continue;
    const field = MAPS[`field${ch}`];
    const H = field.rows.length, W = field.rows[0].length;
    // 地面の表
    if (mode === 't') field.rows = Array.from({ length: W }, (_, y) => Array.from({ length: H }, (_, x) => field.rows[x][y]).join(''));
    else {
      let rows = field.rows;
      if (mode.includes('v')) rows = [...rows].reverse();
      if (mode.includes('h')) rows = rows.map((r) => [...r].reverse().join(''));
      field.rows = rows;
    }
    const mv = (o) => { const [x, y] = pt(mode, o.x, o.y, W, H); o.x = x; o.y = y; };
    for (const w of field.warps || []) { mv(w); if (w.dir) w.dir = DIRS[mode][w.dir] || w.dir; }
    for (const c of field.chests || []) mv(c);
    for (const s of field.symbols || []) mv(s);
    for (const s of field.structures || []) mv(s);
    for (const n of field.npcs || []) mv(n);
    if (field.hiddenMachine) mv(field.hiddenMachine);
    if (field.encounter?.zones) field.encounter.zones = field.encounter.zones.map((z) => rect(mode, z, W, H));
    // ほかのマップからこのフィールドへの入口（着く場所）
    for (const m of Object.values(MAPS)) for (const w of m.warps || []) {
      if (w.to !== field.id || w.tx == null) continue;
      const [x, y] = pt(mode, w.tx, w.ty, W, H); w.tx = x; w.ty = y;
      if (w.dir) w.dir = DIRS[mode][w.dir] || w.dir;
    }
    // この章のマップの文の東西南北
    for (const m of Object.values(group)) swapAll(m, ch);
  }
}
