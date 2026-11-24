// 建物の中（小さな部屋のマップ）。町の建物ごとに、施設の種類のひな形から作る
// 部屋の床も数字の表（s=木の床 t=部屋の壁 b=出口 x=地下への階段）
// props: 3Dの家具。block=ぶつかる大きさ（タイル）/ search=調べたときの中身
//   search.loot: { gear } / { item, n } / { mat, n } / { foot } … 一度取ったら空になる
//   search.rare: { mat, n, rate } … たまに見つかるレア素材（最初に調べたときに判定）
//   search.text: 何度調べても同じメッセージが出るだけの飾り
//   search.event: 特別な処理（rest=休む / bookshelf=隠し階段 / alpha=修理中のアルファ / wanted=手配書）
// keeper: お店の人。話しかけると施設のメニューが開く
import { parseRows } from './tiles.js';

function room(W, H, extra = []) {
  const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 't' : 's')));
  g[H - 1][Math.floor(W / 2)] = 'b';
  for (const [x, y, c] of extra) g[y][x] = c;
  return g.map((r) => r.join(''));
}

const KEEPERS = {
  inn: { model: 'npc_clerk', colors: { primary: 0x7a4a3a } },
  weapon: { model: 'npc_a', colors: { primary: 0x5a3a2a } },
  parts: { model: 'npc_a', colors: { primary: 0x3a6a5a } },
  item: { model: 'npc_b', colors: { primary: 0x8a5a7a } },
  bar: { model: 'npc_a', colors: { primary: 0x2a2a2a } },
  office: { model: 'npc_clerk', colors: { primary: 0x2f5f7a } },
  garage: { model: 'npc_a', colors: { primary: 0xd0a040 } },
};
const TITLES = { inn: '宿屋', weapon: '武器屋', parts: 'パーツ屋', item: '道具屋', bar: '酒場', office: 'ハンターオフィス', garage: 'ガレージ', home: 'レンの修理屋' };

// ひな形。x, y はタイル座標（小数OK）、rot は向き（ラジアン）
const TEMPLATES = {
  inn: () => ({
    W: 12, H: 9, keeper: { x: 3, y: 2.1 },
    props: [
      { id: 'counter', model: 'f_counter', x: 3, y: 3.1, block: [2.4, 0.7] },
      { id: 'bed1', model: 'f_bed', x: 8, y: 2.2, block: [1, 1.9], search: { loot: { gear: 60 }, found: 'ベッドの下に、だれかの忘れたギアが落ちていた。' } },
      { id: 'bed2', model: 'f_bed', x: 10, y: 2.2, block: [1, 1.9], search: { text: 'ふかふかのベッドだ。泊まるなら受付で。' } },
      { id: 'dresser', model: 'f_dresser', x: 10.4, y: 5.6, rot: -Math.PI / 2, block: [0.6, 1], search: { loot: { item: 'kitS', n: 1 }, rare: { mat: 'cell', n: 1, rate: 0.3 } } },
      { id: 'plant', model: 'f_plant', x: 1.4, y: 6.6, block: [0.6, 0.6], search: { text: 'よく手入れされた鉢植え。この星では貴重な緑だ。' } },
      { id: 'lamp', model: 'f_lamp', x: 5.3, y: 1.5, block: [0.5, 0.5] },
    ],
  }),
  weapon: () => ({
    W: 12, H: 9, keeper: { x: 6, y: 2.1 },
    props: [
      { id: 'counter', model: 'f_counter', x: 6, y: 3.1, block: [2.4, 0.7] },
      { id: 'rack1', model: 'f_rack', x: 2.4, y: 1.3, block: [1.8, 0.4], search: { text: '銃がずらりと並んでいる。どれもよく手入れされている。' } },
      { id: 'rack2', model: 'f_rack', x: 9.6, y: 1.3, block: [1.8, 0.4], search: { text: '「試し撃ち禁止」の札が下がっている。' } },
      { id: 'crate1', model: 'f_crate', x: 1.5, y: 6.5, block: [0.8, 0.8], search: { loot: { item: 'kitS', n: 2 } } },
      { id: 'crate2', model: 'f_crate', x: 2.4, y: 6.6, rot: 0.4, block: [0.8, 0.8], search: { loot: { mat: 'scrap', n: 2 }, rare: { mat: 'alloy', n: 1, rate: 0.25 } } },
      { id: 'barrel', model: 'f_barrel', x: 10.5, y: 6.5, block: [0.7, 0.7], search: { text: '火薬のにおいがする。近づかないほうがよさそうだ。' } },
    ],
  }),
  parts: () => ({
    W: 12, H: 9, keeper: { x: 6, y: 2.1 },
    props: [
      { id: 'counter', model: 'f_counter', x: 6, y: 3.1, block: [2.4, 0.7] },
      { id: 'shelf', model: 'f_shelf', x: 2.4, y: 1.3, block: [1.8, 0.5], search: { text: '中古のセンサーや配線がぎっしり詰まっている。' } },
      { id: 'gears', model: 'f_gears', x: 9.8, y: 5.8, block: [0.8, 0.8], search: { text: '大きな歯車が積んである。重くて持ち上がらない。' } },
      { id: 'crate', model: 'f_crate', x: 10.4, y: 1.6, block: [0.8, 0.8], search: { loot: { mat: 'scrap', n: 3 }, rare: { mat: 'cell', n: 1, rate: 0.3 } } },
      { id: 'toolbox', model: 'f_toolbox', x: 1.4, y: 6.4, block: [0.8, 0.6], search: { loot: { gear: 40 } } },
    ],
  }),
  item: () => ({
    W: 12, H: 9, keeper: { x: 6, y: 2.1 },
    props: [
      { id: 'counter', model: 'f_counter', x: 6, y: 3.1, block: [2.4, 0.7] },
      { id: 'shelf1', model: 'f_shelf', x: 2.4, y: 1.3, block: [1.8, 0.5], search: { text: '商品の救急キットが並んでいる。勝手に取ってはいけない。' } },
      { id: 'shelf2', model: 'f_shelf', x: 9.6, y: 1.3, block: [1.8, 0.5], search: { text: '「本日の特売：バッテリーS」と書いてある。' } },
      { id: 'barrel', model: 'f_barrel', x: 1.5, y: 6.5, block: [0.7, 0.7], search: { loot: { item: 'repS', n: 1 } } },
      { id: 'plant', model: 'f_plant', x: 10.5, y: 6.6, block: [0.6, 0.6], search: { text: '鉢の土の中に……何もなかった。' } },
    ],
  }),
  bar: () => ({
    W: 12, H: 9, keeper: { x: 6, y: 1.6 },
    props: [
      { id: 'counter', model: 'f_counter', x: 6, y: 2.6, block: [2.4, 0.7] },
      { id: 'table1', model: 'f_table', x: 3, y: 5, block: [1, 1], search: { text: '飲みかけのグラスが置いてある。' } },
      { id: 'chair1', model: 'f_chair', x: 2.1, y: 5, rot: Math.PI / 2, block: [0.4, 0.4] },
      { id: 'table2', model: 'f_table', x: 9, y: 5, block: [1, 1], search: { loot: { gear: 25 }, found: 'テーブルの上にチップが置きっぱなしだ。' } },
      { id: 'chair2', model: 'f_chair', x: 9.9, y: 5, rot: -Math.PI / 2, block: [0.4, 0.4] },
      { id: 'jukebox', model: 'f_jukebox', x: 10.5, y: 1.4, block: [0.8, 0.5], search: { text: '古いジュークボックス。ノイズまじりの電子音が流れている。' } },
      { id: 'barrel1', model: 'f_barrel', x: 1.3, y: 1.5, block: [0.7, 0.7], search: { loot: { item: 'batS', n: 1 }, rare: { mat: 'cell', n: 1, rate: 0.2 } } },
      { id: 'barrel2', model: 'f_barrel', x: 2.1, y: 1.5, block: [0.7, 0.7], search: { text: '中身は……強そうなお酒だ。' } },
    ],
  }),
  office: () => ({
    W: 12, H: 9, keeper: { x: 6, y: 2.1 },
    props: [
      { id: 'counter', model: 'f_counter', x: 6, y: 3.1, block: [2.4, 0.7] },
      { id: 'board', model: 'f_board', x: 2.5, y: 1.0, block: [1.6, 0.3], search: { event: 'wanted' } },
      { id: 'cabinet', model: 'f_dresser', x: 10.2, y: 1.5, block: [1, 0.6], search: { loot: { item: 'kitS', n: 1 }, rare: { mat: 'alloy', n: 1, rate: 0.2 } } },
      { id: 'plant', model: 'f_plant', x: 1.4, y: 6.6, block: [0.6, 0.6], search: { text: '受付の人がかわいがっている観葉植物。' } },
      { id: 'lamp', model: 'f_lamp', x: 10.6, y: 6.5, block: [0.5, 0.5] },
    ],
  }),
  garage: () => ({
    W: 16, H: 10, keeper: { x: 3, y: 3.2 }, showMachines: [[8.5, 4.4], [12.5, 4.4], [8.5, 7.2], [12.5, 7.2]],
    props: [
      { id: 'workbench', model: 'f_workbench', x: 3, y: 1.6, block: [1.8, 0.8], search: { text: '整備用の作業台。工具がきれいに並べてある。' } },
      { id: 'toolbox', model: 'f_toolbox', x: 1.4, y: 6, rot: Math.PI / 2, block: [0.6, 0.8], search: { loot: { mat: 'scrap', n: 2 }, rare: { mat: 'alloy', n: 1, rate: 0.3 } } },
      { id: 'barrel', model: 'f_barrel', x: 14.4, y: 1.5, block: [0.7, 0.7], search: { text: 'オイルのドラム缶。べとべとだ。' } },
      { id: 'crate', model: 'f_crate', x: 1.5, y: 8, block: [0.8, 0.8], search: { loot: { item: 'repS', n: 1 } } },
    ],
  }),
  // レンの修理屋（主人公の家）。本棚を調べると地下への階段が現れる
  home: () => ({
    W: 14, H: 10, extra: [[9, 1, 'x']], alphaAt: [4.5, 5.2],
    props: [
      { id: 'workbench', model: 'f_workbench', x: 3, y: 1.6, block: [1.8, 0.8], search: { text: '油のしみた作業台。アルファを拾ったときの写真が貼ってある。' } },
      { id: 'toolbox', model: 'f_toolbox', x: 5.4, y: 1.5, block: [0.8, 0.5], search: { text: '父さんの形見の工具箱。いつもピカピカに磨いている。' } },
      { id: 'alpha', model: null, x: 4.5, y: 5.2, block: [1.8, 1.4], search: { event: 'alpha' } },
      { id: 'bed', model: 'f_bed', x: 12, y: 2.2, block: [1, 1.9], search: { event: 'rest' } },
      { id: 'underbed', model: null, x: 12, y: 3.4, block: null, search: { loot: { gear: 50 }, found: 'ベッドの下から、へそくりのギアが出てきた！' } },
      { id: 'bookshelf', model: 'f_bookshelf', x: 9.5, y: 1.3, block: [1, 0.5], search: { event: 'bookshelf' }, secret: true },
      { id: 'dresser', model: 'f_dresser', x: 12.5, y: 6, rot: -Math.PI / 2, block: [0.6, 1], search: { loot: { item: 'kitS', n: 2 }, rare: { mat: 'cell', n: 1, rate: 0.3 } } },
      { id: 'crate', model: 'f_crate', x: 1.5, y: 8, block: [0.8, 0.8], search: { loot: { mat: 'scrap', n: 2 }, rare: { mat: 'alloy', n: 1, rate: 0.25 } } },
      { id: 'lamp', model: 'f_lamp', x: 7.5, y: 1.5, block: [0.5, 0.5] },
    ],
  }),
};

// 町のマップに建物の中のマップを足す（maps.js から呼ばれる）
export function addInteriors(MAPS) {
  for (const town of Object.values(MAPS)) {
    if (town.type !== 'town') continue;
    for (const b of town.buildings || []) {
      const tpl = TEMPLATES[b.facility]?.();
      if (!tpl) continue;
      const id = `${town.id}_${b.id}`;
      const exitX = Math.floor(tpl.W / 2);
      const map = {
        id,
        name: b.facility === 'home' ? 'レンの修理屋' : `${town.name}の${TITLES[b.facility]}`,
        type: 'interior',
        town: town.id,
        facility: b.facility,
        bgm: 'town',
        machineAllowed: false,
        ground: '#2a2018',
        rows: room(tpl.W, tpl.H, tpl.extra),
        warps: [{ x: exitX, y: tpl.H - 1, to: town.id, tx: b.door[0], ty: b.door[1] + 1, dir: 'down' }],
        arrive: [exitX, tpl.H - 2],
        props: tpl.props,
        showMachines: tpl.showMachines,
        npcs: tpl.keeper ? [{ id: 'keeper', name: '', model: KEEPERS[b.facility].model, colors: KEEPERS[b.facility].colors, x: tpl.keeper.x - 0.5, y: tpl.keeper.y - 0.5, facility: b.facility, range: 2.6, lines: [] }] : [],
      };
      if (b.facility === 'home') {
        // 本棚の裏の階段 → 地下格納庫
        map.warps.push({ x: 9, y: 1, to: 'basement', tx: 2, ty: 10, dir: 'up', require: 'stairsOpen' });
        map.alphaAt = tpl.alphaAt;
      }
      map.grid = parseRows(map.rows);
      map.width = map.grid[0].length;
      map.height = map.grid.length;
      MAPS[id] = map;
      b.interior = id;
    }
  }
}
