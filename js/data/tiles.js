// タイルの種類。マップの表は1文字＝1タイルで、文字は36進数のID（'0'〜'9','a'〜'z'）
// walk: 歩けるか / enc: 出現する敵の表（マップの encounter.tables のキー）/ step: 踏んだ時の処理
export const TILES = {
  0: { name: '砂地', walk: true, enc: 'sand' },
  1: { name: '岩場', walk: true, enc: 'rock' },
  2: { name: '金属の床', walk: true, enc: 'metal' },
  3: { name: '山', walk: false },
  4: { name: '壁', walk: false },
  5: { name: '道', walk: true, enc: 'road' },
  6: { name: '建物', walk: false },
  7: { name: 'ドア', walk: true, step: 'door' },
  8: { name: '酸の池', walk: false },
  9: { name: '枯れ草', walk: true, enc: 'sand' },
  10: { name: 'ドーム外壁', walk: false }, // a
  11: { name: '出入口', walk: true, step: 'warp' }, // b
  12: { name: 'ベルトコンベア', walk: true, enc: 'metal' }, // c
  13: { name: '瓦礫', walk: false }, // d
  14: { name: '石畳', walk: true }, // e
  15: { name: '機械', walk: false }, // f
  16: { name: 'パイプ', walk: false }, // g
  17: { name: '中枢の床', walk: true }, // h
  18: { name: 'がらくたの山', walk: false }, // i
  19: { name: '町', walk: true, step: 'warp' }, // j
  20: { name: '廃工場', walk: true, step: 'warp' }, // k
  21: { name: '崩れた岩', walk: true, enc: 'rock' }, // l（見た目は山。隠し通路）
};

export function tileAt(map, x, y) {
  if (y < 0 || y >= map.grid.length || x < 0 || x >= map.grid[0].length) return 4;
  return map.grid[y][x];
}

export function isWalkable(map, x, y) {
  const t = TILES[tileAt(map, x, y)];
  return !!(t && t.walk);
}

// 文字の表 → 数字の2次元配列
export function parseRows(rows) {
  return rows.map((r) => Array.from(r, (c) => parseInt(c, 36)));
}
