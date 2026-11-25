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
  weapon: { model: 'npc_pirate', colors: { primary: 0x3a2a24, secondary: 0x1e1612, accent: 0x6a6a6a, hair: 0x101010 }, scale: 1.3 }, // いかつい店主
  parts: { model: 'npc_a', colors: { primary: 0x3a6a5a } },
  item: { model: 'npc_b', colors: { primary: 0x8a5a7a } },
  bar: { model: 'npc_a', colors: { primary: 0x2a2a2a } },
  office: { model: 'npc_clerk', colors: { primary: 0x2f5f7a } },
  garage: { model: 'npc_a', colors: { primary: 0xd0a040 } },
};
const TITLES = { inn: '宿屋', weapon: '武器屋', parts: 'パーツ屋', item: '道具屋', bar: '酒場', office: 'ハンターオフィス', garage: 'ガレージ', home: 'レンの修理屋' };

// 町ごとの内装の雰囲気（床の素材・色・壁・照明）
const TOWN_THEME = {
  town1: { floor: 'wood', floorColor: '#8a6440', wallColor: '#5a4a3e', light: 0xffd8a0, mood: '木のぬくもりのある辺境の店' },
  town2: { floor: 'stone', floorColor: '#6e665c', wallColor: '#4a4038', light: 0xffb060, mood: '石造りでランプの灯る鉱山町の店' },
  town3: { floor: 'metal', floorColor: '#56606c', wallColor: '#36404e', light: 0xbfe0ff, mood: '金属パネルと白い照明の中継ステーション' },
  town4: { floor: 'wood', floorColor: '#b08a5a', wallColor: '#d8d0bc', light: 0xfff0c8, mood: '白い漆喰と明るい木の床の風車の町' },
  town5: { floor: 'stone', floorColor: '#8a9298', wallColor: '#5a6e82', light: 0xd8f0ff, mood: '青い壁と石の床の浮遊島の店' },
  town6: { floor: 'metal', floorColor: '#7a6a5a', wallColor: '#4a3a2e', light: 0xffd8a8, mood: '真ちゅうと革の空港の店（飛行船の内装ふう）' },
  town7: { floor: 'wood', floorColor: '#a89070', wallColor: '#e8e4d8', light: 0xfff4d8, mood: '白い壁と潮風の木の床の港町' },
  town8: { floor: 'wood', floorColor: '#7a5a3a', wallColor: '#5a7a6a', light: 0xffd8a0, mood: '高床の木の家。窓の外は海' },
  town9: { floor: 'metal', floorColor: '#5a7a8a', wallColor: '#2a4a5a', light: 0xa8e8ff, mood: '青いガラスと金属の海上ドーム' },
};
// 施設ごとの特色（照明の色・床の敷物など）
const FAC_THEME = {
  inn: { light: 0xffa860, lightK: 1.2, rug: [6, 3, 11, 7], rugColor: '#8a2a2a' },
  weapon: { light: 0xff8a6a, lightK: 0.9 },
  parts: { light: 0xd8f0ff },
  item: { light: 0xfff0c8, rug: [4, 4, 8, 7], rugColor: '#2a6a5a' },
  bar: { light: 0xc070ff, lightK: 0.8, rug: [2, 4, 11, 7], rugColor: '#4a1a3a' },
  office: { light: 0xf0f0e0 },
  garage: { floor: 'metal', floorColor: '#4e535a', light: 0xffffff, lightK: 1.2 },
  home: { light: 0xffd090, rug: [9, 5, 12, 8], rugColor: '#3a5a8a' },
};

// ひな形。x, y はタイル座標（小数OK）、rot は向き（ラジアン）
const TEMPLATES = {
  // 宿屋：暖かい照明とベッドが並ぶ
  inn: () => ({
    W: 13, H: 9, keeper: { x: 3, y: 2.1 },
    props: [
      { id: 'counter', model: 'f_counter', x: 3, y: 3.1, block: [2.4, 0.7] },
      { id: 'bed1', model: 'f_bed', x: 7, y: 2.2, block: [1, 1.9], search: { loot: { gear: 60 }, found: 'ベッドの下に、だれかの忘れたギアが落ちていた。' } },
      { id: 'bed2', model: 'f_bed', x: 8.6, y: 2.2, block: [1, 1.9], search: { text: 'ふかふかのベッドだ。泊まるなら受付で。' } },
      { id: 'bed3', model: 'f_bed', x: 10.2, y: 2.2, block: [1, 1.9], search: { text: 'シーツからお日さまのにおいがする。' } },
      { id: 'bed4', model: 'f_bed', x: 11.6, y: 5.6, rot: -Math.PI / 2, block: [1.9, 1], search: { loot: { item: 'kitS', n: 1 }, found: 'まくらの下に救急キットがはさまっていた。' } },
      { id: 'dresser', model: 'f_dresser', x: 1.4, y: 5.6, rot: Math.PI / 2, block: [0.6, 1], search: { loot: { item: 'kitS', n: 1 }, rare: { mat: 'cell', n: 1, rate: 0.3 } } },
      { id: 'lamp1', model: 'f_lamp', x: 5.4, y: 1.5, block: [0.5, 0.5] },
      { id: 'lamp2', model: 'f_lamp', x: 11.6, y: 1.5, block: [0.5, 0.5] },
      { id: 'plant', model: 'f_plant', x: 1.4, y: 7.4, block: [0.6, 0.6], search: { text: 'よく手入れされた鉢植え。この星では貴重な緑だ。' } },
    ],
  }),
  // 武器屋：壁一面に武器が飾られ、いかつい店主
  weapon: () => ({
    W: 12, H: 9, keeper: { x: 6, y: 2.1 },
    props: [
      { id: 'counter', model: 'f_counter', x: 6, y: 3.1, block: [2.4, 0.7] },
      { id: 'rack1', model: 'f_rack', x: 2.2, y: 1.15, block: [1.8, 0.4], search: { text: '銃がずらりと並んでいる。どれもよく手入れされている。' } },
      { id: 'rack2', model: 'f_rack', x: 4.2, y: 1.15, block: [1.8, 0.4], search: { text: '大口径のライフルだ。持ち上げただけで肩が外れそう。' } },
      { id: 'rack3', model: 'f_rack', x: 7.8, y: 1.15, block: [1.8, 0.4], search: { text: '「試し撃ち禁止」の札が下がっている。' } },
      { id: 'rack4', model: 'f_rack', x: 9.8, y: 1.15, block: [1.8, 0.4], search: { text: 'ブレードとハンマーの見本。刃がぎらりと光る。' } },
      { id: 'rack5', model: 'f_rack', x: 10.8, y: 4.5, rot: -Math.PI / 2, block: [0.4, 1.8], search: { text: 'マシン用の主砲の砲身が立てかけてある。' } },
      { id: 'crate1', model: 'f_crate', x: 1.5, y: 6.5, block: [0.8, 0.8], search: { loot: { item: 'kitS', n: 2 } } },
      { id: 'crate2', model: 'f_crate', x: 2.4, y: 6.6, rot: 0.4, block: [0.8, 0.8], search: { loot: { mat: 'scrap', n: 2 }, rare: { mat: 'alloy', n: 1, rate: 0.25 } } },
      { id: 'barrel', model: 'f_barrel', x: 10.5, y: 7, block: [0.7, 0.7], search: { text: '火薬のにおいがする。近づかないほうがよさそうだ。' } },
    ],
  }),
  // パーツ屋：歯車や部品の棚と作業台
  parts: () => ({
    W: 12, H: 9, keeper: { x: 6, y: 2.1 },
    props: [
      { id: 'counter', model: 'f_counter', x: 6, y: 3.1, block: [2.4, 0.7] },
      { id: 'shelf', model: 'f_shelf', x: 2.4, y: 1.3, block: [1.8, 0.5], search: { text: '中古のセンサーや配線がぎっしり詰まっている。' } },
      { id: 'shelf2', model: 'f_shelf', x: 9.6, y: 1.3, block: [1.8, 0.5], search: { text: '脚パーツのサスペンションが山積みだ。' } },
      { id: 'bench', model: 'f_workbench', x: 9.4, y: 5.4, block: [1.8, 0.8], search: { text: '分解中のセンサーヘッドが置いてある。作業の途中らしい。' } },
      { id: 'gears', model: 'f_gears', x: 2.0, y: 5.2, block: [0.8, 0.8], search: { text: '大きな歯車が積んである。重くて持ち上がらない。' } },
      { id: 'gears2', model: 'f_gears', x: 3.0, y: 5.6, block: [0.8, 0.8] },
      { id: 'crate', model: 'f_crate', x: 10.6, y: 7.2, block: [0.8, 0.8], search: { loot: { mat: 'scrap', n: 3 }, rare: { mat: 'cell', n: 1, rate: 0.3 } } },
      { id: 'toolbox', model: 'f_toolbox', x: 1.4, y: 7.2, block: [0.8, 0.6], search: { loot: { gear: 40 } } },
    ],
  }),
  // 道具屋：薬や食料の棚
  item: () => ({
    W: 12, H: 9, keeper: { x: 6, y: 2.1 },
    props: [
      { id: 'counter', model: 'f_counter', x: 6, y: 3.1, block: [2.4, 0.7] },
      { id: 'potions1', model: 'f_potions', x: 2.4, y: 1.3, block: [1.8, 0.5], search: { text: '色とりどりの薬のびん。救急キットの中身もここで作っているらしい。' } },
      { id: 'potions2', model: 'f_potions', x: 9.6, y: 1.3, block: [1.8, 0.5], search: { text: '「本日の特売：バッテリーS」と書いてある。' } },
      { id: 'food1', model: 'f_food', x: 1.6, y: 5.4, block: [0.9, 0.6], search: { text: '缶詰と固いパン。旅の保存食だ。' } },
      { id: 'food2', model: 'f_food', x: 10.4, y: 5.4, block: [0.9, 0.6], search: { loot: { item: 'kitS', n: 1 }, found: '缶詰の箱のすき間に救急キットが入っていた。' } },
      { id: 'barrel', model: 'f_barrel', x: 1.5, y: 7.2, block: [0.7, 0.7], search: { loot: { item: 'repS', n: 1 } } },
      { id: 'plant', model: 'f_plant', x: 10.5, y: 7.4, block: [0.6, 0.6], search: { text: '鉢の土の中に……何もなかった。' } },
    ],
  }),
  // 酒場：カウンターと丸テーブルとジュークボックス
  bar: () => ({
    W: 13, H: 9, keeper: { x: 6.5, y: 1.6 },
    props: [
      { id: 'counter', model: 'f_counter', x: 6.5, y: 2.6, block: [2.4, 0.7] },
      { id: 'bottles', model: 'f_bottles', x: 6.5, y: 2.6, y0: 0.92 },
      { id: 'table1', model: 'f_table', x: 3, y: 5, block: [1, 1], search: { text: '飲みかけのグラスが置いてある。' } },
      { id: 'chair1', model: 'f_chair', x: 2.1, y: 5, rot: Math.PI / 2, block: [0.4, 0.4] },
      { id: 'chair1b', model: 'f_chair', x: 3.9, y: 5, rot: -Math.PI / 2, block: [0.4, 0.4] },
      { id: 'table2', model: 'f_table', x: 6.5, y: 6, block: [1, 1], search: { loot: { gear: 25 }, found: 'テーブルの上にチップが置きっぱなしだ。' } },
      { id: 'chair2', model: 'f_chair', x: 7.4, y: 6, rot: -Math.PI / 2, block: [0.4, 0.4] },
      { id: 'table3', model: 'f_table', x: 10, y: 5, block: [1, 1], search: { text: 'カードゲームのチップが散らばっている。' } },
      { id: 'chair3', model: 'f_chair', x: 10.9, y: 5, rot: -Math.PI / 2, block: [0.4, 0.4] },
      { id: 'jukebox', model: 'f_jukebox', x: 11.5, y: 1.4, block: [0.8, 0.5], search: { text: '古いジュークボックス。ノイズまじりの電子音が流れている。' } },
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
  // ガレージ：工具と整備中のマシン
  garage: () => ({
    // 床に並べるのは仲間が使っているマシン（最大3台）と、展示台の1台だけ。ほかは奥のモニター（格納庫）に収納
    W: 16, H: 10, keeper: { x: 3, y: 3.2 }, showMachines: [[8.5, 4.4], [12.5, 4.4], [8.5, 7.4]], maintenance: true,
    props: [
      { id: 'lift', model: 'f_lift', x: 8.5, y: 4.4 },
      { id: 'hangarmon', model: 'f_devpc', x: 10.6, y: 1.3, block: [1.6, 0.6], search: { event: 'hangar' } }, // 格納庫モニター（全部のマシン・パーツの一覧）
      { id: 'hangarPedestal', model: 'f_pedestal', x: 12.8, y: 7.4, block: [2.1, 2.1], showcase: 'garage', search: { event: 'hangarView' } }, // 一覧で選んだ機体を出す展示台
      // 転送台：調べると行ったことのある町へ転送できる（上に乗って調べる）
      { id: 'teleporter', model: 'f_teleporter', x: 4.6, y: 7.0, block: null, pad: true, search: { event: 'teleport' } },
      { id: 'workbench', model: 'f_workbench', x: 3, y: 1.6, block: [1.8, 0.8], search: { text: '整備用の作業台。工具がきれいに並べてある。' } },
      { id: 'toolbox', model: 'f_toolbox', x: 1.4, y: 6, rot: Math.PI / 2, block: [0.6, 0.8], search: { loot: { mat: 'scrap', n: 2 }, rare: { mat: 'alloy', n: 1, rate: 0.3 } } },
      { id: 'toolbox2', model: 'f_toolbox', x: 5.6, y: 1.5, block: [0.8, 0.5], search: { text: 'レンチにトルクドライバー……どれも年季が入っている。' } },
      { id: 'barrel', model: 'f_barrel', x: 14.4, y: 1.5, block: [0.7, 0.7], search: { text: 'オイルのドラム缶。べとべとだ。' } },
      { id: 'barrel2', model: 'f_barrel', x: 14.4, y: 2.3, block: [0.7, 0.7] },
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
        name: b.facility === 'home' ? 'レンの修理屋' : `${town.name}の${b.title || TITLES[b.facility]}`,
        shopKey: b.shop, // 同じ種類の店が町に2軒あるときなどの品ぞろえの切り替え（shops.js のキー）
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
        npcs: tpl.keeper ? [{ id: 'keeper', name: '', model: KEEPERS[b.facility].model, colors: KEEPERS[b.facility].colors, scale: KEEPERS[b.facility].scale, x: tpl.keeper.x - 0.5, y: tpl.keeper.y - 0.5, facility: b.facility, shop: b.shop, range: 2.6, lines: [] }] : [],
        theme: { ...TOWN_THEME[town.id], ...FAC_THEME[b.facility] },
        maintenance: tpl.maintenance,
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

// ---------------- 開発者の部屋（デバッグ用の隠し部屋） ----------------
// 修理屋の地下（オメガの格納庫）の奥、機械の陰の隠し通路の先。扉の暗証番号は js/data/debug.js
export function addDevRoom(MAPS) {
  const W = 20, H = 12;
  const map = {
    id: 'devroom',
    name: '開発者の部屋',
    type: 'interior',
    bgm: 'town',
    machineAllowed: false,
    ground: '#101418',
    rows: room(W, H),
    warps: [{ x: 10, y: H - 1, to: 'basement', tx: 22, ty: 4, dir: 'down', door: true }],
    arrive: [10, H - 2],
    theme: { floor: 'metal', floorColor: '#2a3340', wallColor: '#1a2028', light: 0x8fe8ff, lightK: 1.3, rug: [7, 5, 13, 9], rugColor: '#1a4a5a' },
    props: [
      { id: 'pc1', model: 'f_devpc', x: 2.4, y: 1.4, block: [1.6, 0.6], search: { text: '画面に数字の表がびっしり……「catalog.js」と書いてある。ここに足したものは、ゲームのあちこちに自動で現れるらしい。' } },
      { id: 'pc2', model: 'f_devpc', x: 4.6, y: 1.4, block: [1.6, 0.6], search: { event: 'tuning' } }, // バランス調整の端末
      { id: 'store', model: 'f_devpc', x: 15.4, y: 1.4, block: [1.6, 0.6], search: { event: 'devStore' } }, // 入手端末
      { id: 'gearmachine', model: 'f_gearmachine', x: 18.2, y: 1.6, block: [1.4, 0.8], search: { event: 'gearMachine' } },
      // ロボットの展示台（38）とキャラの展示台（41）
      { id: 'robotPedestal', model: 'f_pedestal', x: 4.5, y: 6.8, block: [2.1, 2.1], showcase: 'robot', search: { event: 'robotStation' } },
      { id: 'charPedestal', model: 'f_pedestal', x: 15.5, y: 6.8, block: [2.1, 2.1], showcase: 'char', search: { event: 'charStation' } },
      // 試し撃ちの的（単体・グループ・全体）
      { id: 'target1', model: 'f_target', x: 9.0, y: 3.4, rot: 0, block: [0.6, 0.5], search: { event: 'testTargets' } },
      { id: 'target2', model: 'f_target', x: 10.0, y: 3.2, block: [0.6, 0.5], search: { event: 'testTargets' } },
      { id: 'target3', model: 'f_target', x: 11.0, y: 3.4, block: [0.6, 0.5], search: { event: 'testTargets' } },
      { id: 'shelf1', model: 'f_shelf', x: 1.4, y: 9.2, rot: Math.PI / 2, block: [0.5, 1.8], search: { text: 'まだどこにも登場していない武器の設計図が並んでいる。' } },
      { id: 'crate1', model: 'f_crate', x: 18.4, y: 9.8, block: [0.8, 0.8], search: { text: '「テスト用」とだけ書かれた木箱。中は空っぽだ。' } },
      { id: 'lamp1', model: 'f_lamp', x: 18.6, y: 5.4, block: [0.5, 0.5] },
      { id: 'plant1', model: 'f_plant', x: 1.4, y: 4.2, block: [0.6, 0.6], search: { text: 'プラスチックの観葉植物。ほこりひとつない。' } },
    ],
    npcs: [{ id: 'devkeeper', name: '開発者', model: 'npc_clerk', colors: { primary: 0x1a2a3a, secondary: 0x0a0e14 }, x: 7.0, y: 1.6, facility: 'dev', range: 2.8, lines: [] }],
  };
  map.grid = parseRows(map.rows);
  map.width = W; map.height = H;
  MAPS.devroom = map;
}
