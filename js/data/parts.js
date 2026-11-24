// マシンのパーツの表。数値は最初は 攻撃・防御・重さ が中心
// slot: head / body / arm / legs / engine
// armor: 装甲値（ロボットのHP） / def: 防御 / wt: 重さ
// head: hit（命中）, scan（索敵：先制しやすい） / arm: atkMul（攻撃倍率）, hit, eva, power（重い腕武器を持てる）
// legs: eva（回避）, legType / body: slots（武器スロット数の初期値）, maxSlots / engine: cap（積める重さ）, en（エネルギー）
export const PARTS = {
  // ---- 頭（レーダー・センサー） ----
  head_alpha: { name: 'アルファヘッド', slot: 'head', model: 'head_sensor', armor: 24, def: 4, wt: 3, hit: 6, scan: 4, price: 0, alphaOnly: true },
  head_sensor: { name: 'センサーヘッドS1', slot: 'head', model: 'head_sensor', armor: 18, def: 3, wt: 3, hit: 4, scan: 2, price: 600 },
  head_radar: { name: 'レーダーヘッドR1', slot: 'head', model: 'head_radar', armor: 16, def: 2, wt: 4, hit: 12, scan: 8, price: 1800 },
  head_heavy: { name: '重装ヘッドH1', slot: 'head', model: 'head_heavy', armor: 40, def: 7, wt: 6, hit: 0, scan: 0, price: 1500 },

  // ---- ボディ（フレーム） ----
  body_alpha: { name: 'アルファフレーム', slot: 'body', model: 'body_std', armor: 120, def: 6, wt: 14, slots: 3, maxSlots: 5, price: 0, alphaOnly: true },
  body_jg: { name: 'JG重装フレーム', slot: 'body', model: 'body_heavy', armor: 260, def: 12, wt: 18, slots: 5, maxSlots: 5, price: 0 },

  // ---- 腕（右と左を別々に装備） ----
  arm_std: { name: '標準アーム', slot: 'arm', model: 'arm_std', armor: 22, def: 3, wt: 4, atkMul: 1.0, hit: 0, eva: 0, price: 500 },
  arm_heavy: { name: 'ヘビーアームHA', slot: 'arm', model: 'arm_heavy', armor: 34, def: 5, wt: 7, atkMul: 1.2, hit: -8, eva: -2, price: 1600 },
  arm_light: { name: 'ライトアームLA', slot: 'arm', model: 'arm_light', armor: 16, def: 2, wt: 2, atkMul: 0.9, hit: 8, eva: 5, price: 1400 },
  arm_power: { name: 'パワーアームPA', slot: 'arm', model: 'arm_power', armor: 30, def: 4, wt: 8, atkMul: 1.1, hit: -2, eva: -1, power: true, price: 2600 },

  // ---- 脚（左右セットで1パーツ） ----
  legs_biped: { name: '二脚レッグB1', slot: 'legs', model: 'legs_biped', legType: 'biped', armor: 40, def: 5, wt: 8, eva: 6, price: 900 },
  legs_quad: { name: '四脚レッグQ1', slot: 'legs', model: 'legs_quad', legType: 'quad', armor: 62, def: 9, wt: 12, eva: -2, price: 2200 },
  legs_tread: { name: 'キャタピラT1', slot: 'legs', model: 'legs_tread', legType: 'tread', armor: 74, def: 11, wt: 14, eva: -6, price: 2600 },
  legs_hover: { name: 'ホバーユニットH1', slot: 'legs', model: 'legs_hover', legType: 'hover', armor: 30, def: 3, wt: 6, eva: 14, price: 3000 },

  // ---- エンジン（中に積む。見た目には出ない） ----
  eng_alpha: { name: 'アルファコア（封印）', slot: 'engine', cap: 52, en: 100, wt: 0, price: 0, alphaOnly: true },
  eng_v6: { name: 'V6ディーゼル', slot: 'engine', cap: 40, en: 60, wt: 0, price: 800 },
  eng_turbo: { name: 'ツインターボTT', slot: 'engine', cap: 50, en: 70, wt: 0, price: 2400 },
  eng_jg: { name: 'JG高出力炉', slot: 'engine', cap: 80, en: 90, wt: 0, price: 0 },
};

// 改造（ガレージ）。メカニック割引でギアが安くなる
export const MODS = {
  mechanicDiscount: 0.3, // 改造・強化費用 30%引き
  frame: [ // フレーム強化 → 武器スロット +1
    { gear: 1500, materials: { scrap: 4, alloy: 1 } },
    { gear: 4000, materials: { alloy: 3, cell: 1 } },
  ],
  engine: [ // エンジン強化 → 積める重さ +6
    { gear: 1000, materials: { scrap: 3 }, cap: 6 },
    { gear: 2500, materials: { cell: 2 }, cap: 6 },
    { gear: 5000, materials: { cell: 2, alloy: 2 }, cap: 8 },
  ],
};

// 武器スロットの場所。0,1 は腕、2〜4 は背中
export const SLOT_INFO = [
  { name: '右腕', mount: 'arm', side: 'R', socket: 'hand' },
  { name: '左腕', mount: 'arm', side: 'L', socket: 'hand' },
  { name: '背中・中央', mount: 'back', socket: 'socket_back1' },
  { name: '背中・右', mount: 'back', socket: 'socket_back2' },
  { name: '背中・左', mount: 'back', socket: 'socket_back3' },
];
export const HEAVY_ARM_WEAPON = 6; // 重さがこれより大きい腕武器はパワーアームが必要
