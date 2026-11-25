// マップを広々させる（v0.13〜）
// データ（maps.js / maps2.js / maps3.js）の座標は「広げる前」の小さな表のまま書いておき、読み込むときに SPREAD 倍に広げる。
//  - 地面の表は、1マスをタテ・ヨコ k 倍に引き伸ばす（通りや通路、広場、島が広くなる。ダンジョンの通路は2マス→3マス）
//  - 町の建物は大きさを変えず、真ん中の位置だけを k 倍の所へ動かす（建物と建物の間が広くなる）
//  - NPC・宝箱・賞金首・入口（warps）・家具・建造物・段差（tiers）・敵の出る範囲（zones）・隠しマシンも新しい位置へ
//  - 建物の中（interior）と、修理屋の地下・開発者の部屋は広げない
// 広さを変えたいときは SPREAD の数字だけ変える（セーブデータの位置は save.js が広げた後の位置に直す）
export const SPREAD = { town: 1.5, dungeon: 1.5, field: 1.25 };
const NO_SPREAD = new Set(['basement', 'devroom']);

export const spreadOf = (m) => (m && !NO_SPREAD.has(m.id) && SPREAD[m.type]) || 1;
// 広げる前のマス目 → 広げた後のマス目（ブロックの真ん中）
const cell = (v, k) => Math.floor((v + 0.5) * k);

const WALKABLE = (TILES, t) => !!TILES[t]?.walk;

export function spreadMaps(MAPS, TILES) {
  const ks = Object.fromEntries(Object.values(MAPS).map((m) => [m.id, spreadOf(m)]));
  for (const m of Object.values(MAPS)) {
    const k = ks[m.id];
    if (k === 1) continue;
    const W = m.grid[0].length, H = m.grid.length;
    const NW = Math.round(W * k), NH = Math.round(H * k);
    // 建物の床（6・7）は、まわりの地面で埋めてから建物を置き直す
    const count = {};
    for (const row of m.grid) for (const t of row) if (WALKABLE(TILES, t) && t !== 7 && !TILES[t]?.step) count[t] = (count[t] || 0) + 1;
    const fill = Number(Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0);
    const g = [];
    for (let y = 0; y < NH; y++) {
      const oy = Math.min(H - 1, Math.floor((y + 0.5) / k));
      const row = [];
      for (let x = 0; x < NW; x++) {
        const t = m.grid[oy][Math.min(W - 1, Math.floor((x + 0.5) / k))];
        row.push(m.buildings && (t === 6 || t === 7) ? fill : t);
      }
      g.push(row);
    }
    const ok = (x, y) => y >= 0 && y < NH && x >= 0 && x < NW && WALKABLE(TILES, g[y][x]);
    // 歩けない所に落ちたら、いちばん近い歩ける所へ
    const near = (x, y) => {
      if (ok(x, y)) return [x, y];
      for (let r = 1; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (ok(x + dx, y + dy)) return [x + dx, y + dy];
      return [x, y];
    };
    // 建物：大きさはそのまま、真ん中を k 倍の位置へ
    for (const b of m.buildings || []) {
      const nx = Math.round((b.x + b.w / 2) * k - b.w / 2), ny = Math.round((b.y + b.h / 2) * k - b.h / 2);
      const door = [b.door[0] - b.x + nx, b.door[1] - b.y + ny];
      Object.assign(b, { x: nx, y: ny, door });
      for (let y = ny; y < ny + b.h; y++) for (let x = nx; x < nx + b.w; x++) g[y][x] = 6;
      g[door[1]][door[0]] = 7;
      if (!ok(door[0], door[1] + 1)) g[door[1] + 1][door[0]] = fill;
    }
    m.grid = g; m.width = NW; m.height = NH;
    m.spread = k;
    for (const n of m.npcs || []) [n.x, n.y] = near(cell(n.x, k), cell(n.y, k));
    for (const c of m.chests || []) [c.x, c.y] = near(cell(c.x, k), cell(c.y, k));
    for (const s of m.symbols || []) [s.x, s.y] = near(cell(s.x, k), cell(s.y, k));
    for (const p of m.props || []) { p.x *= k; p.y *= k; }
    // 建造物（町の外観・宇宙船・風車など）は、広がった土台に合わせて少し大きく
    for (const s of m.structures || []) { s.x = (s.x + 0.5) * k - 0.5; s.y = (s.y + 0.5) * k - 0.5; s.scale = (s.scale || 1) * k; }
    if (m.hiddenMachine) { m.hiddenMachine.x *= k; m.hiddenMachine.y *= k; }
    if (m.tiers) m.tiers = m.tiers.map(([a, b, h]) => [Math.floor(a * k), Math.ceil((b + 1) * k) - 1, h]);
    for (const z of m.encounter?.zones || []) { z.x0 = Math.floor(z.x0 * k); z.y0 = Math.floor(z.y0 * k); z.x1 = Math.ceil(z.x1 * k); z.y1 = Math.ceil(z.y1 * k); }
    // 入口：元の1マスが広がったブロックの、同じ種類のマスすべてを入口にする
    if (m.warps) {
      const out = [], seen = new Set();
      for (const w of m.warps) {
        for (let y = Math.floor(w.y * k); y < Math.ceil((w.y + 1) * k); y++) for (let x = Math.floor(w.x * k); x < Math.ceil((w.x + 1) * k); x++) {
          if (Math.min(W - 1, Math.floor((x + 0.5) / k)) !== w.x || Math.min(H - 1, Math.floor((y + 0.5) / k)) !== w.y) continue;
          const key = `${x},${y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ ...w, x, y });
        }
      }
      m.warps = out;
    }
  }
  // 入口の行き先（tx, ty）を、行き先のマップの広さに合わせる
  for (const m of Object.values(MAPS)) {
    for (const w of m.warps || []) {
      const k2 = ks[w.to] || 1;
      if (k2 === 1 || w._done) continue;
      w.tx = cell(w.tx, k2); w.ty = cell(w.ty, k2); w._done = true;
    }
  }
}

// 広げる前の座標（コードに書いた町の中の位置など）→ 広げた後の座標
export function spreadPos(MAPS, mapId, x, y) {
  const k = MAPS[mapId]?.spread || 1;
  return [x * k, y * k];
}
