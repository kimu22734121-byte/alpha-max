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
  town10: { floor: 'stone', floorColor: '#4a3a34', wallColor: '#3a2a26', light: 0xffa060, mood: '石の床と炉の火の明かり' },
  town11: { floor: 'metal', floorColor: '#5a5a62', wallColor: '#3a3a44', light: 0xffc080, mood: '金属の耐熱ドームの中' },
  town12: { floor: 'wood', floorColor: '#6a5a4a', wallColor: '#4a3e34', light: 0xffb070, mood: '灰をかぶった港の倉庫' },
  town13: { floor: 'stone', floorColor: '#e8dcc0', wallColor: '#f0e8d4', light: 0xfff4d8, mood: '白い石と金の飾り' },
  town14: { floor: 'stone', floorColor: '#c8d4e0', wallColor: '#d8e4f0', light: 0xd8f0ff, mood: '水晶の壁が光る' },
  town15: { floor: 'stone', floorColor: '#e8d8b0', wallColor: '#f4ecd8', light: 0xffe8b0, mood: '大神殿の金色の広間' },
  town16: { floor: 'wood', floorColor: '#3a3040', wallColor: '#2a2434', light: 0xffc86a, mood: 'ランタンの灯る夜の家' },
  town17: { floor: 'metal', floorColor: '#2e2a3a', wallColor: '#1e1a26', light: 0xb8a0ff, mood: '黒い鉄の要塞' },
  town18: { floor: 'wood', floorColor: '#4a4458', wallColor: '#2a3a4a', light: 0xa8e8ff, mood: '最後の隠れ里の青い灯' },
  town19: { floor: 'metal', floorColor: '#5a6470', wallColor: '#3a4250', light: 0xbfeaff, mood: '前線基地の白い照明' },
};
// 施設ごとの特色（照明の色・床の敷物など）
const FAC_THEME = {
  inn: { light: 0xffa860, lightK: 1.2, rug: [7, 5, 13, 9], rugColor: '#8a2a2a' },
  weapon: { light: 0xff8a6a, lightK: 0.9 },
  parts: { light: 0xd8f0ff },
  item: { light: 0xfff0c8, rug: [5, 6, 12, 9], rugColor: '#2a6a5a' },
  bar: { light: 0xc070ff, lightK: 0.8, rug: [6, 4, 14, 10], rugColor: '#4a1a3a' },
  office: { light: 0xf0f0e0 },
  garage: { floor: 'metal', floorColor: '#4e535a', light: 0xffffff, lightK: 1.2 },
  home: { light: 0xffd090, rug: [9, 5, 12, 8], rugColor: '#3a5a8a' },
};

// ひな形。x, y はタイル座標（小数OK）、rot は向き（ラジアン）
// v1.7 で部屋を広く（お店 16×12、宿屋 17×12、酒場 18×12、ガレージ 24×15）。deco は町ごとの飾りを置く場所
const TEMPLATES = {
  // 宿屋：暖かい照明とベッドが並び、くつろげるソファの一角
  inn: () => ({
    W: 17, H: 12, keeper: { x: 3, y: 2.1 }, windows: [6.5, 15.2], deco: [[1.4, 8.2], [15.6, 10.2]],
    props: [
      { id: 'counter', model: 'f_counter', x: 3, y: 3.1, block: [2.4, 0.7] },
      { id: 'bed1', model: 'f_bed', x: 8.5, y: 2.2, block: [1, 1.9], search: { loot: { gear: 60 }, found: 'ベッドの下に、だれかの忘れたギアが落ちていた。' } },
      { id: 'bed2', model: 'f_bed', x: 10.3, y: 2.2, block: [1, 1.9], search: { text: 'ふかふかのベッドだ。泊まるなら受付で。' } },
      { id: 'bed3', model: 'f_bed', x: 12.1, y: 2.2, block: [1, 1.9], search: { text: 'シーツからお日さまのにおいがする。' } },
      { id: 'bed5', model: 'f_bed', x: 13.9, y: 2.2, block: [1, 1.9], search: { text: '旅の商人がいびきをかいて眠っている。' } },
      { id: 'bed4', model: 'f_bed', x: 15.6, y: 6.6, rot: -Math.PI / 2, block: [1.9, 1], search: { loot: { item: 'kitS', n: 1 }, found: 'まくらの下に救急キットがはさまっていた。' } },
      { id: 'dresser', model: 'f_dresser', x: 1.4, y: 5.6, rot: Math.PI / 2, block: [0.6, 1], search: { loot: { item: 'kitS', n: 1 }, rare: { mat: 'cell', n: 1, rate: 0.3 } } },
      { id: 'sofa', model: 'f_sofa', x: 4.6, y: 9.2, block: [1.8, 0.8], search: { text: '暖炉の前のソファ。座ると眠くなってしまいそうだ。' } },
      { id: 'table', model: 'f_table', x: 4.6, y: 7.6, block: [1, 1], search: { text: '湯気の立つスープが置いてある。宿のサービスらしい。' } },
      { id: 'lamp1', model: 'f_lamp', x: 6.8, y: 4.4, block: [0.5, 0.5] },
      { id: 'lamp2', model: 'f_lamp', x: 15.6, y: 1.5, block: [0.5, 0.5] },
      { id: 'plant', model: 'f_plant', x: 1.4, y: 10.4, block: [0.6, 0.6], search: { text: 'よく手入れされた鉢植え。この星では貴重な緑だ。' } },
    ],
  }),
  // 武器屋：壁一面に武器が飾られ、いかつい店主。奥に試し撃ちの的
  weapon: () => ({
    W: 16, H: 12, keeper: { x: 8, y: 2.1 }, windows: [], deco: [[1.4, 8.2], [14.6, 8.2]],
    props: [
      { id: 'counter', model: 'f_counter', x: 8, y: 3.1, block: [2.4, 0.7] },
      { id: 'rack1', model: 'f_rack', x: 2.2, y: 1.15, block: [1.8, 0.4], search: { text: '銃がずらりと並んでいる。どれもよく手入れされている。' } },
      { id: 'rack2', model: 'f_rack', x: 4.3, y: 1.15, block: [1.8, 0.4], search: { text: '大口径のライフルだ。持ち上げただけで肩が外れそう。' } },
      { id: 'rack3', model: 'f_rack', x: 11.7, y: 1.15, block: [1.8, 0.4], search: { text: '「試し撃ち禁止」の札が下がっている。' } },
      { id: 'rack4', model: 'f_rack', x: 13.8, y: 1.15, block: [1.8, 0.4], search: { text: 'ブレードとハンマーの見本。刃がぎらりと光る。' } },
      { id: 'rack5', model: 'f_rack', x: 14.8, y: 5, rot: -Math.PI / 2, block: [0.4, 1.8], search: { text: 'マシン用の主砲の砲身が立てかけてある。' } },
      { id: 'rack6', model: 'f_rack', x: 1.2, y: 5, rot: Math.PI / 2, block: [0.4, 1.8], search: { text: '古い軍の払い下げ品。弾帯がじゃらじゃら下がっている。' } },
      { id: 'target1', model: 'f_target', x: 11.4, y: 7.4, block: [0.6, 0.5], search: { text: '穴だらけの的。店主の腕前はかなりのものらしい。' } },
      { id: 'target2', model: 'f_target', x: 12.6, y: 7.6, block: [0.6, 0.5] },
      { id: 'crate1', model: 'f_crate', x: 1.5, y: 10.2, block: [0.8, 0.8], search: { loot: { item: 'kitS', n: 2 } } },
      { id: 'crate2', model: 'f_crate', x: 2.4, y: 10.3, rot: 0.4, block: [0.8, 0.8], search: { loot: { mat: 'scrap', n: 2 }, rare: { mat: 'alloy', n: 1, rate: 0.25 } } },
      { id: 'barrel', model: 'f_barrel', x: 14.5, y: 10.3, block: [0.7, 0.7], search: { text: '火薬のにおいがする。近づかないほうがよさそうだ。' } },
      { id: 'lamp', model: 'f_lamp', x: 5, y: 7, block: [0.5, 0.5] },
    ],
  }),
  // パーツ屋：歯車や部品の棚と作業台。真ん中にエンジンの見本
  parts: () => ({
    W: 16, H: 12, keeper: { x: 8, y: 2.1 }, windows: [], deco: [[1.4, 8.6], [14.6, 4.4]],
    props: [
      { id: 'counter', model: 'f_counter', x: 8, y: 3.1, block: [2.4, 0.7] },
      { id: 'shelf', model: 'f_shelf', x: 2.4, y: 1.3, block: [1.8, 0.5], search: { text: '中古のセンサーや配線がぎっしり詰まっている。' } },
      { id: 'shelf3', model: 'f_shelf', x: 4.4, y: 1.3, block: [1.8, 0.5], search: { text: '腕パーツの関節がずらり。油のにおいがする。' } },
      { id: 'shelf2', model: 'f_shelf', x: 11.6, y: 1.3, block: [1.8, 0.5], search: { text: '脚パーツのサスペンションが山積みだ。' } },
      { id: 'shelf4', model: 'f_shelf', x: 13.6, y: 1.3, block: [1.8, 0.5], search: { text: 'エンジンのピストンが番号順に並べてある。' } },
      { id: 'bench', model: 'f_workbench', x: 12.4, y: 7.4, block: [1.8, 0.8], search: { text: '分解中のセンサーヘッドが置いてある。作業の途中らしい。' } },
      { id: 'engine', model: 'f_gearmachine', x: 8, y: 7.2, block: [1.4, 0.8], search: { text: 'ぴかぴかに磨かれたエンジンの見本。「非売品」の札。' } },
      { id: 'gears', model: 'f_gears', x: 2.2, y: 6, block: [0.8, 0.8], search: { text: '大きな歯車が積んである。重くて持ち上がらない。' } },
      { id: 'gears2', model: 'f_gears', x: 3.2, y: 6.4, block: [0.8, 0.8] },
      { id: 'crate', model: 'f_crate', x: 14.6, y: 10.2, block: [0.8, 0.8], search: { loot: { mat: 'scrap', n: 3 }, rare: { mat: 'cell', n: 1, rate: 0.3 } } },
      { id: 'toolbox', model: 'f_toolbox', x: 1.4, y: 10.3, block: [0.8, 0.6], search: { loot: { gear: 40 } } },
    ],
  }),
  // 道具屋：薬や食料の棚と、試食のテーブル
  item: () => ({
    W: 16, H: 12, keeper: { x: 8, y: 2.1 }, windows: [6.2, 9.8], deco: [[1.4, 8.4], [14.6, 8.4]],
    props: [
      { id: 'counter', model: 'f_counter', x: 8, y: 3.1, block: [2.4, 0.7] },
      { id: 'potions1', model: 'f_potions', x: 2.4, y: 1.3, block: [1.8, 0.5], search: { text: '色とりどりの薬のびん。救急キットの中身もここで作っているらしい。' } },
      { id: 'potions3', model: 'f_potions', x: 4.4, y: 1.3, block: [1.8, 0.5], search: { text: '「バッテリーは日の当たらない所に」と書いてある。' } },
      { id: 'potions2', model: 'f_potions', x: 11.6, y: 1.3, block: [1.8, 0.5], search: { text: '「本日の特売：バッテリーS」と書いてある。' } },
      { id: 'potions4', model: 'f_potions', x: 13.6, y: 1.3, block: [1.8, 0.5], search: { text: '修理キットの部品が小分けにして並べてある。' } },
      { id: 'food1', model: 'f_food', x: 1.6, y: 5.4, block: [0.9, 0.6], search: { text: '缶詰と固いパン。旅の保存食だ。' } },
      { id: 'food2', model: 'f_food', x: 14.4, y: 5.4, block: [0.9, 0.6], search: { loot: { item: 'kitS', n: 1 }, found: '缶詰の箱のすき間に救急キットが入っていた。' } },
      { id: 'table', model: 'f_table', x: 5.2, y: 7.6, block: [1, 1], search: { text: '試食コーナー。乾パンがほんのり甘い。' } },
      { id: 'table2', model: 'f_table', x: 10.8, y: 7.6, block: [1, 1], search: { text: '「ご自由にどうぞ」のあめ玉。ひとつもらった。' } },
      { id: 'barrel', model: 'f_barrel', x: 1.5, y: 10.3, block: [0.7, 0.7], search: { loot: { item: 'repS', n: 1 } } },
      { id: 'plant', model: 'f_plant', x: 14.5, y: 10.4, block: [0.6, 0.6], search: { text: '鉢の土の中に……何もなかった。' } },
    ],
  }),
  // 酒場：カウンターと丸テーブルとジュークボックス、奥にソファ
  bar: () => ({
    W: 18, H: 12, keeper: { x: 9, y: 1.6 }, windows: [], deco: [[1.4, 9.6], [16.6, 5.2]],
    props: [
      { id: 'counter', model: 'f_counter', x: 9, y: 2.6, block: [2.4, 0.7] },
      { id: 'counter2', model: 'f_counter', x: 11.4, y: 2.6, block: [2.4, 0.7] },
      { id: 'bottles', model: 'f_bottles', x: 9, y: 2.6, y0: 0.92 },
      { id: 'table1', model: 'f_table', x: 3.5, y: 5.5, block: [1, 1], search: { text: '飲みかけのグラスが置いてある。' } },
      { id: 'chair1', model: 'f_chair', x: 2.6, y: 5.5, rot: Math.PI / 2, block: [0.4, 0.4] },
      { id: 'chair1b', model: 'f_chair', x: 4.4, y: 5.5, rot: -Math.PI / 2, block: [0.4, 0.4] },
      { id: 'table2', model: 'f_table', x: 12.5, y: 7.5, block: [1, 1], search: { loot: { gear: 25 }, found: 'テーブルの上にチップが置きっぱなしだ。' } },
      { id: 'chair2', model: 'f_chair', x: 13.4, y: 7.5, rot: -Math.PI / 2, block: [0.4, 0.4] },
      { id: 'chair2b', model: 'f_chair', x: 11.6, y: 7.5, rot: Math.PI / 2, block: [0.4, 0.4] },
      { id: 'table3', model: 'f_table', x: 14.5, y: 4.5, block: [1, 1], search: { text: 'カードゲームのチップが散らばっている。' } },
      { id: 'chair3', model: 'f_chair', x: 15.4, y: 4.5, rot: -Math.PI / 2, block: [0.4, 0.4] },
      { id: 'table4', model: 'f_table', x: 5.5, y: 8.8, block: [1, 1], search: { text: '腕相撲の跡だろうか、テーブルがへこんでいる。' } },
      { id: 'chair4', model: 'f_chair', x: 4.6, y: 8.8, rot: Math.PI / 2, block: [0.4, 0.4] },
      { id: 'sofa', model: 'f_sofa', x: 15.6, y: 9.8, rot: -Math.PI / 2, block: [1.8, 0.8], search: { text: '常連のハンターが寝息を立てている。' } },
      { id: 'jukebox', model: 'f_jukebox', x: 16.5, y: 1.4, block: [0.8, 0.5], search: { text: '古いジュークボックス。ノイズまじりの電子音が流れている。' } },
      { id: 'barrel1', model: 'f_barrel', x: 1.3, y: 1.5, block: [0.7, 0.7], search: { loot: { item: 'batS', n: 1 }, rare: { mat: 'cell', n: 1, rate: 0.2 } } },
      { id: 'barrel2', model: 'f_barrel', x: 2.1, y: 1.5, block: [0.7, 0.7], search: { text: '中身は……強そうなお酒だ。' } },
    ],
  }),
  office: () => ({
    W: 16, H: 11, keeper: { x: 8, y: 2.1 }, windows: [12.5], deco: [[14.6, 6.4], [1.4, 9.4]],
    props: [
      { id: 'counter', model: 'f_counter', x: 8, y: 3.1, block: [2.4, 0.7] },
      { id: 'board', model: 'f_board', x: 2.6, y: 1.0, block: [1.6, 0.3], search: { event: 'wanted' } },
      { id: 'board2', model: 'f_board', x: 4.6, y: 1.0, block: [1.6, 0.3], search: { text: '「賞金首を倒したら、ここで賞金を受け取れます」と書いてある。' } },
      { id: 'cabinet', model: 'f_dresser', x: 14.6, y: 1.5, block: [1, 0.6], search: { loot: { item: 'kitS', n: 1 }, rare: { mat: 'alloy', n: 1, rate: 0.2 } } },
      { id: 'sofa', model: 'f_sofa', x: 3.4, y: 6.6, block: [1.8, 0.8], search: { text: '順番待ちのソファ。いかついハンターのにおいがする。' } },
      { id: 'table', model: 'f_table', x: 3.4, y: 5.2, block: [1, 1], search: { text: '古い手配書の束。もう倒された賞金首ばかりだ。' } },
      { id: 'pc', model: 'f_devpc', x: 11, y: 6.6, block: [1.6, 0.6], search: { text: '賞金首の目撃情報が地図の上に赤い点で表示されている。' } },
      { id: 'lamp', model: 'f_lamp', x: 14.6, y: 9.3, block: [0.5, 0.5] },
    ],
  }),
  // ガレージ：工具と整備中のマシン。広い整備場にリフトが並ぶ
  garage: () => ({
    // 床に並べるのは仲間が使っているマシン（最大3台）と目覚めたアルファ、展示台の1台だけ。ほかは奥のモニター（格納庫）に収納
    W: 24, H: 15, keeper: { x: 3.5, y: 3.2 }, showMachines: [[11, 5.6], [15.5, 5.6], [20, 5.6], [6.5, 6.6]], maintenance: true, windows: [], deco: [[22.6, 9.6], [1.4, 9.6]],
    props: [
      { id: 'lift', model: 'f_lift', x: 11, y: 5.6 },
      { id: 'lift2', model: 'f_lift', x: 15.5, y: 5.6 },
      { id: 'lift3', model: 'f_lift', x: 20, y: 5.6 },
      { id: 'hangarmon', model: 'f_devpc', x: 15.5, y: 1.3, block: [1.6, 0.6], search: { event: 'hangar' } }, // 格納庫モニター（全部のマシン・パーツの一覧）
      { id: 'hangarPedestal', model: 'f_pedestal', x: 18.5, y: 11, block: [2.1, 2.1], showcase: 'garage', search: { event: 'hangarView' } }, // 一覧で選んだ機体を出す展示台
      // 転送台：調べると行ったことのある町へ転送できる（上に乗って調べる）
      { id: 'teleporter', model: 'f_teleporter', x: 5.5, y: 11, block: null, pad: true, search: { event: 'teleport' } },
      { id: 'workbench', model: 'f_workbench', x: 3.5, y: 1.6, block: [1.8, 0.8], search: { text: '整備用の作業台。工具がきれいに並べてある。' } },
      { id: 'toolbox', model: 'f_toolbox', x: 1.4, y: 6.5, rot: Math.PI / 2, block: [0.6, 0.8], search: { loot: { mat: 'scrap', n: 2 }, rare: { mat: 'alloy', n: 1, rate: 0.3 } } },
      { id: 'toolbox2', model: 'f_toolbox', x: 6, y: 1.5, block: [0.8, 0.5], search: { text: 'レンチにトルクドライバー……どれも年季が入っている。' } },
      { id: 'shelf1', model: 'f_shelf', x: 9.5, y: 1.3, block: [1.8, 0.5], search: { text: '交換用の装甲板が積み重ねてある。' } },
      { id: 'shelf2', model: 'f_shelf', x: 11.5, y: 1.3, block: [1.8, 0.5], search: { text: 'ネジとボルトの引き出しがずらり。' } },
      { id: 'engine', model: 'f_gearmachine', x: 19.5, y: 1.6, block: [1.4, 0.8], search: { text: '整備中のエンジン。うなるような音をたてている。' } },
      { id: 'gears', model: 'f_gears', x: 22.4, y: 4.2, block: [0.8, 0.8], search: { text: 'マシンの関節用の大歯車。' } },
      { id: 'barrel', model: 'f_barrel', x: 22.4, y: 1.5, block: [0.7, 0.7], search: { text: 'オイルのドラム缶。べとべとだ。' } },
      { id: 'barrel2', model: 'f_barrel', x: 22.4, y: 2.3, block: [0.7, 0.7] },
      { id: 'barrel3', model: 'f_barrel', x: 21.6, y: 1.6, block: [0.7, 0.7] },
      { id: 'crate', model: 'f_crate', x: 1.5, y: 13, block: [0.8, 0.8], search: { loot: { item: 'repS', n: 1 } } },
      { id: 'crate2', model: 'f_crate', x: 22.4, y: 13, block: [0.8, 0.8], search: { text: '「取り扱い注意：ミサイル」と書いてある。そっとしておこう。' } },
      { id: 'crate3', model: 'f_crate', x: 21.6, y: 13.1, rot: 0.3, block: [0.8, 0.8] },
      { id: 'lamp1', model: 'f_lamp', x: 8.5, y: 9.5, block: [0.5, 0.5] },
      { id: 'lamp2', model: 'f_lamp', x: 15.5, y: 9.5, block: [0.5, 0.5] },
    ],
  }),
  // レンの修理屋（主人公の家）。本棚を調べると地下への階段が現れる
  home: () => ({
    W: 16, H: 11, extra: [[9, 1, 'x']], alphaAt: [4.5, 5.2], windows: [13.8], deco: [],
    props: [
      { id: 'workbench', model: 'f_workbench', x: 3, y: 1.6, block: [1.8, 0.8], search: { text: '油のしみた作業台。アルファを拾ったときの写真が貼ってある。' } },
      { id: 'toolbox', model: 'f_toolbox', x: 5.4, y: 1.5, block: [0.8, 0.5], search: { text: '父さんの形見の工具箱。いつもピカピカに磨いている。' } },
      { id: 'alpha', model: null, x: 4.5, y: 5.2, block: [1.8, 1.4], search: { event: 'alpha' } },
      { id: 'bed', model: 'f_bed', x: 12, y: 2.2, block: [1, 1.9], search: { event: 'rest' } },
      { id: 'underbed', model: null, x: 12, y: 3.4, block: null, search: { loot: { gear: 50 }, found: 'ベッドの下から、へそくりのギアが出てきた！' } },
      { id: 'bookshelf', model: 'f_bookshelf', x: 9.5, y: 1.3, block: [1, 0.5], search: { event: 'bookshelf' }, secret: true },
      { id: 'dresser', model: 'f_dresser', x: 14.5, y: 6, rot: -Math.PI / 2, block: [0.6, 1], search: { loot: { item: 'kitS', n: 2 }, rare: { mat: 'cell', n: 1, rate: 0.3 } } },
      { id: 'sofa', model: 'f_sofa', x: 11.5, y: 8.6, block: [1.8, 0.8], search: { text: 'ばねの飛び出たソファ。直す時間がない。' } },
      { id: 'cart', model: 'f_cart', x: 2, y: 8.8, block: [1.1, 0.7], search: { text: 'ジャンクを運ぶ手押し車。拾った部品が山になっている。' } },
      { id: 'crate', model: 'f_crate', x: 1.5, y: 6.5, block: [0.8, 0.8], search: { loot: { mat: 'scrap', n: 2 }, rare: { mat: 'alloy', n: 1, rate: 0.25 } } },
      { id: 'lamp', model: 'f_lamp', x: 7.5, y: 1.5, block: [0.5, 0.5] },
    ],
  }),
};

// 町ごとの建物の中の飾り（v1.7〜）。同じお店でも町によって置いてある物が違う
const TOWN_DECO = {
  town1: [{ model: 'f_cart', text: 'ジャンクを積んだ手押し車。辺境ではなんでも直して使う。' }, { model: 'f_plant', text: 'ドームの中で育てた小さな緑。大事にされている。' }],
  town2: [{ model: 'f_cart', text: '鉱石を積んだトロッコ。きらりと光るかけらが混じっている。' }, { model: 'f_lantern', text: '坑夫のカンテラ。油の燃えるにおいがする。' }],
  town3: [{ model: 'f_devpc', colors: { glow: 0x7ae0ff }, text: '星間便の運行表が流れている。「土の惑星 ⇔ 風の惑星」……' }, { model: 'f_sofa', colors: { primary: 0x3a4a6a, secondary: 0x2a3448 }, text: '待合のソファ。旅人の忘れ物の地図が落ちている。' }],
  town4: [{ model: 'f_pinwheel', text: '小さな風車。窓から入る風でくるくる回っている。' }, { model: 'f_plant', text: '高原の花が生けてある。いい香りだ。' }],
  town5: [{ model: 'f_crystal', colors: { glow: 0x8ad8ff }, text: '浮遊石のかけら。台の上でほんの少し浮いている。' }, { model: 'f_pinwheel', text: '雲海の風で回る風車の模型。' }],
  town6: [{ model: 'f_sofa', colors: { primary: 0x6a4a2a, secondary: 0x4a3018 }, text: '飛行船の客室から運んできた革のソファ。' }, { model: 'f_window', colors: { glow: 0xffe0a8 }, text: '丸い窓の外を、飛行船がゆっくり横切っていく。' }],
  town7: [{ model: 'f_tank', text: '水槽。小さな南の魚がひらひら泳いでいる。' }, { model: 'f_barrel', colors: { primary: 0x3a6a8a }, text: '魚のにおいのする樽。今朝の水あげらしい。' }],
  town8: [{ model: 'f_tank', text: '床下の海から引いた水槽。カニがこちらをにらんでいる。' }, { model: 'f_plant', text: 'ヤシの若木の鉢植え。' }],
  town9: [{ model: 'f_tank', colors: { accent: 0xffd040 }, text: 'ドームの外の海とつながった大きな水槽。' }, { model: 'f_crystal', colors: { glow: 0x6ae8e0 }, text: '海の底で採れた青い結晶。' }],
  town10: [{ model: 'f_furnace', text: '小さな炉。ごうごうと燃えていて、そばにいると汗が出る。' }, { model: 'f_cart', colors: { accent: 0xff7a3a }, text: '赤く光る鉱石を積んだトロッコ。まだ熱い。' }],
  town11: [{ model: 'f_furnace', colors: { glow: 0xffa04a }, text: '耐熱工房のための試験炉。' }, { model: 'f_gears', text: '耐熱合金の歯車。熱で少しゆがんでいる。' }],
  town12: [{ model: 'f_lantern', text: '灰で曇ったランタン。' }, { model: 'f_crate', text: '灰をかぶった荷箱。「火の惑星産・耐熱タイル」' }],
  town13: [{ model: 'f_crystal', colors: { glow: 0xffe080, secondary: 0xe8dcc0 }, text: '金色に光る結晶。あたたかい光がこぼれている。' }, { model: 'f_pillar', text: '古代の柱。表面に読めない文字が刻まれている。' }],
  town14: [{ model: 'f_crystal', text: '水晶工房の作品。のぞくと光が七つに分かれる。' }, { model: 'f_crystal', colors: { glow: 0xd8a8ff }, text: '紫の水晶。かすかに歌うような音がする。' }],
  town15: [{ model: 'f_pillar', text: '大神殿と同じ金の柱。' }, { model: 'f_crystal', colors: { glow: 0xfff0c0 }, text: '祈りのための光の結晶。' }],
  town16: [{ model: 'f_lantern', text: '夜の明けないこの星で、絶やしてはいけない灯。' }, { model: 'f_lantern', colors: { glow: 0xffa060 }, text: 'ランタンの油は町のみんなで分け合っているらしい。' }],
  town17: [{ model: 'f_rack', text: '要塞の武器庫から運びこまれた銃。' }, { model: 'f_lantern', colors: { glow: 0xb8a0ff, dark: 0x1a1824 }, text: '紫の非常灯。' }],
  town18: [{ model: 'f_lantern', colors: { glow: 0x8ae8ff }, text: '青い灯。この里の人は「希望の灯」と呼んでいる。' }, { model: 'f_plant', text: '暗がりで育つ光る苔の鉢。' }],
  town19: [{ model: 'f_devpc', colors: { glow: 0x9fe8ff }, text: 'マザーコアの観測データが流れ続けている。' }, { model: 'f_crate', text: '補給物資の箱。「最終作戦用」' }],
};
// 窓の外の光の色（町ごと）
const WINDOW_GLOW = { town5: 0xd8f0ff, town7: 0xbfe8ff, town8: 0x8ad8f0, town9: 0x6ab8e8, town10: 0xff9a4a, town11: 0xffb070, town12: 0xd8a878, town13: 0xfff0c0, town14: 0xd8f0ff, town15: 0xffe8a8, town16: 0x4a4a8a, town17: 0x5a4a8a, town18: 0x4a6a9a, town19: 0x9fe8ff };

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
        props: [
          ...tpl.props,
          // 奥の壁の窓（外の光の色は町ごと）
          ...(tpl.windows || []).map((x, i) => ({ id: `win${i}`, model: 'f_window', x, y: 0.62, colors: { glow: WINDOW_GLOW[town.id] ?? 0xffe8b0 }, search: { text: '窓の外に町の景色が見える。' } })),
          // 町ごとの飾り
          ...(tpl.deco || []).map((pos, i) => { const d = TOWN_DECO[town.id]?.[i]; return d ? { id: `deco${i}`, model: d.model, colors: d.colors, x: pos[0], y: pos[1], block: [0.9, 0.9], search: { text: d.text } } : null; }).filter(Boolean),
        ],
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
