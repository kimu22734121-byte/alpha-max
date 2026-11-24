// マシンのパーツの表。数値は最初は 攻撃・防御・重さ が中心
// slot: head / body / arm / legs / engine
// armor: 装甲値（ロボットのHP） / def: 防御 / wt: 重さ
// head: hit（命中）, scan（索敵） / arm: atkMul（攻撃倍率）, hit, eva, power（重い腕武器を持てる）
// legs: eva（回避）, spd（素早さ・フィールドの移動速度）, legType / engine: cap（積める重さ）, en（エネルギー）
// body: mtype（マシンのタイプ）, slots（武器スロットの初期値）, maxSlots
// only: その機体専用（alpha / omega）
export const PARTS = {
  // ---- 頭（レーダー・センサー） ----
  head_sensor: { name: 'センサーヘッドS1', slot: 'head', model: 'head_sensor', armor: 18, def: 3, wt: 3, hit: 4, scan: 2, price: 600 },
  head_radar: { name: 'レーダーヘッドR1', slot: 'head', model: 'head_radar', armor: 16, def: 2, wt: 4, hit: 12, scan: 8, price: 1800 },
  head_heavy: { name: '重装ヘッドH1', slot: 'head', model: 'head_heavy', armor: 40, def: 7, wt: 6, hit: 0, scan: 0, price: 1500 },
  head_sharp: { name: 'シャープヘッドX1', slot: 'head', model: 'head_sharp', armor: 14, def: 2, wt: 2, hit: 9, scan: 4, price: 1400 },
  head_alpha: { name: 'アルファヘッド', slot: 'head', model: 'head_legend', armor: 40, def: 8, wt: 3, hit: 14, scan: 8, price: 0, only: 'alpha' },
  head_omega: { name: 'オメガヘッド', slot: 'head', model: 'head_legend', armor: 40, def: 8, wt: 3, hit: 12, scan: 8, price: 0, only: 'omega' },

  // ---- ボディ（フレーム）。マシンのタイプはボディで決まる ----
  body_balance: { name: 'バランスフレームB1', slot: 'body', mtype: 'balance', model: 'body_std', armor: 130, def: 7, wt: 14, slots: 3, maxSlots: 5, price: 3000 },
  body_heavy: { name: '重装フレームH1', slot: 'body', mtype: 'heavy', model: 'body_heavy', armor: 190, def: 11, wt: 20, slots: 3, maxSlots: 5, price: 4200 },
  body_sharp: { name: 'シャープフレームS1', slot: 'body', mtype: 'sharp', model: 'body_sharp', armor: 95, def: 4, wt: 9, slots: 3, maxSlots: 5, price: 3800 },
  body_alpha: { name: 'アルファフレーム', slot: 'body', mtype: 'legend', model: 'body_legend', armor: 260, def: 14, wt: 10, slots: 4, maxSlots: 5, price: 0, only: 'alpha' },
  body_omega: { name: 'オメガフレーム', slot: 'body', mtype: 'legend', model: 'body_legend', armor: 300, def: 14, wt: 10, slots: 5, maxSlots: 5, price: 0, only: 'omega' },

  // ---- 腕（右と左を別々に装備） ----
  arm_std: { name: '標準アーム', slot: 'arm', model: 'arm_std', armor: 22, def: 3, wt: 4, atkMul: 1.0, hit: 0, eva: 0, price: 500 },
  arm_heavy: { name: 'ヘビーアームHA', slot: 'arm', model: 'arm_heavy', armor: 34, def: 5, wt: 7, atkMul: 1.2, hit: -8, eva: -2, price: 1600 },
  arm_light: { name: 'ライトアームLA', slot: 'arm', model: 'arm_light', armor: 16, def: 2, wt: 2, atkMul: 0.9, hit: 8, eva: 5, price: 1400 },
  arm_power: { name: 'パワーアームPA', slot: 'arm', model: 'arm_power', armor: 30, def: 4, wt: 8, atkMul: 1.1, hit: -2, eva: -1, power: true, price: 2600 },
  arm_sharp: { name: 'シャープアームSA', slot: 'arm', model: 'arm_sharp', armor: 18, def: 2, wt: 2, atkMul: 1.0, hit: 6, eva: 6, price: 1800 },
  arm_alpha: { name: 'アルファアーム', slot: 'arm', model: 'arm_sharp', armor: 45, def: 6, wt: 3, atkMul: 1.2, hit: 10, eva: 8, power: true, price: 0, only: 'alpha' },
  arm_omega: { name: 'オメガアーム', slot: 'arm', model: 'arm_sharp', armor: 45, def: 6, wt: 3, atkMul: 1.2, hit: 8, eva: 8, power: true, price: 0, only: 'omega' },

  // ---- 脚（左右セットで1パーツ。脚で乗り物の形が変わる） ----
  legs_biped: { name: '二脚レッグB1', slot: 'legs', model: 'legs_biped', legType: 'biped', armor: 40, def: 5, wt: 8, eva: 6, spd: 0, price: 900 },
  legs_quad: { name: '四脚レッグQ1', slot: 'legs', model: 'legs_quad', legType: 'quad', armor: 62, def: 9, wt: 12, eva: -2, spd: -1, price: 2200 },
  legs_tread: { name: 'キャタピラT1（戦車型）', slot: 'legs', model: 'legs_tread', legType: 'tread', armor: 74, def: 11, wt: 14, eva: -6, spd: -2, price: 2600 },
  legs_wheel: { name: 'タイヤW1（バイク型）', slot: 'legs', model: 'legs_wheel', legType: 'wheel', armor: 34, def: 3, wt: 7, eva: 10, spd: 4, price: 2400 },
  legs_hover: { name: 'ホバーユニットH1', slot: 'legs', model: 'legs_hover', legType: 'hover', armor: 30, def: 3, wt: 6, eva: 14, spd: 3, price: 3000 },
  legs_sharp: { name: 'シャープレッグSL', slot: 'legs', model: 'legs_sharp', legType: 'biped', armor: 36, def: 4, wt: 5, eva: 12, spd: 3, price: 2800 },
  legs_alpha: { name: 'アルファレッグ', slot: 'legs', model: 'legs_sharp', legType: 'biped', armor: 90, def: 10, wt: 5, eva: 16, spd: 5, price: 0, only: 'alpha' },
  legs_omega: { name: 'オメガレッグ', slot: 'legs', model: 'legs_sharp', legType: 'biped', armor: 90, def: 10, wt: 5, eva: 14, spd: 5, price: 0, only: 'omega' },

  // ---- エンジン（中に積む。見た目には出ない） ----
  eng_v6: { name: 'V6ディーゼル', slot: 'engine', cap: 40, en: 60, wt: 0, price: 800 },
  eng_turbo: { name: 'ツインターボTT', slot: 'engine', cap: 50, en: 70, wt: 0, price: 2400 },
  eng_heavy: { name: '重機用エンジンHX', slot: 'engine', cap: 80, en: 60, wt: 0, price: 4500 },
  eng_alpha: { name: 'アルファコア', slot: 'engine', cap: 70, en: 140, wt: 0, price: 0, only: 'alpha' },
  eng_omega: { name: 'オメガコア', slot: 'engine', cap: 85, en: 120, wt: 0, price: 0, only: 'omega' },
};

// マシンのタイプ（ボディの mtype）。武器は共通で、タイプごとに得意な武器の相性がある
// boost: 武器の威力倍率（cat=カテゴリ / elec=電気属性 / all=すべて）
// wtRate: 得意な武器の重さの割合（重厚は主砲・ミサイルを多く積める）
export const MACHINE_TYPES = {
  heavy: { name: '重厚', desc: '装甲が厚く遅い。重い主砲・ミサイルが得意（威力+15%・重さ-20%）', boost: { cannon: 1.15, missile: 1.15 }, wtCats: ['cannon', 'missile'], wtRate: 0.8, spd: -2, eva: -3 },
  balance: { name: 'バランス', desc: '平均的。どの武器も標準', boost: {}, spd: 0, eva: 0 },
  sharp: { name: 'シャープ', desc: '軽くて速いが打たれ弱い。軽いレーザー（電気）と近接武器が得意（威力+20%）', boost: { elec: 1.2, blade: 1.2 }, spd: 3, eva: 5 },
  legend: { name: '伝説', desc: '欠点のない別格の機体。どの武器も威力+10%', boost: { all: 1.1 }, spd: 3, eva: 4 },
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
