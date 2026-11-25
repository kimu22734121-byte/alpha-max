// マシンのパーツの表。数値は最初は 攻撃・防御・重さ が中心
// slot: head / body / arm / legs / engine
// armor: 装甲値（ロボットのHP） / def: 防御 / wt: 重さ
// head: hit（命中）, scan（索敵） / arm: atkMul（攻撃倍率）, hit, eva, power（重い腕武器を持てる）
// legs: eva（回避）, spd（素早さ・フィールドの移動速度）, legType / engine: cap（積める重さ）, en（エネルギー）
// body: mtype（マシンのタイプ）, slots（武器スロットの初期値）, maxSlots
// only: その機体専用（alpha / omega） / limited: 隠し通路の宝箱でしか手に入らない限定パーツ
export const PARTS = {
  // ---- 頭（レーダー・センサー） ----
  head_sensor: { name: 'センサーヘッドS1', slot: 'head', model: 'head_sensor', armor: 18, def: 3, wt: 3, hit: 4, scan: 2, price: 600 },
  head_radar: { name: 'レーダーヘッドR1', slot: 'head', model: 'head_radar', armor: 16, def: 2, wt: 4, hit: 12, scan: 8, price: 1800 },
  head_heavy: { name: '重装ヘッドH1', slot: 'head', model: 'head_heavy', armor: 40, def: 7, wt: 6, hit: 0, scan: 0, price: 1500 },
  head_sharp: { name: 'シャープヘッドX1', slot: 'head', model: 'head_sharp', armor: 14, def: 2, wt: 2, hit: 9, scan: 4, price: 1400 },
  head_oracle: { name: 'オラクルアイ【限定】', slot: 'head', model: 'head_radar', armor: 30, def: 5, wt: 3, hit: 22, scan: 14, price: 0, limited: true },
  head_alpha: { name: 'アルファヘッド', slot: 'head', model: 'head_legend', armor: 40, def: 8, wt: 3, hit: 14, scan: 8, price: 0, only: 'alpha' },
  head_gaia: { name: 'ガイアヘッド', slot: 'head', model: 'head_heavy', armor: 60, def: 12, wt: 6, hit: 6, scan: 4, price: 0, only: 'gaia' },
  head_omega: { name: 'オメガヘッド', slot: 'head', model: 'head_legend', armor: 40, def: 8, wt: 3, hit: 12, scan: 8, price: 0, only: 'omega' },
  // 第2章（風の惑星）のお店
  head_gale: { name: 'ゲイルヘッドR2', slot: 'head', model: 'head_radar', armor: 24, def: 4, wt: 3, hit: 16, scan: 10, price: 6200 },
  head_heavy2: { name: '重装ヘッドH2', slot: 'head', model: 'head_heavy', armor: 62, def: 11, wt: 7, hit: 2, scan: 1, price: 5600 },
  head_sharp2: { name: 'シャープヘッドX2', slot: 'head', model: 'head_sharp', armor: 22, def: 4, wt: 2, hit: 13, scan: 6, price: 5400 },
  // 第3章（水の惑星）のお店
  head_sonar: { name: 'ソナーヘッドR3', slot: 'head', model: 'head_radar', armor: 32, def: 6, wt: 3, hit: 20, scan: 14, price: 14000 },
  head_heavy3: { name: '重装ヘッドH3', slot: 'head', model: 'head_heavy', armor: 88, def: 15, wt: 7, hit: 4, scan: 2, price: 12500 },

  // ---- ボディ（フレーム）。マシンのタイプはボディで決まる ----
  body_balance: { name: 'バランスフレームB1', slot: 'body', mtype: 'balance', model: 'body_std', armor: 130, def: 7, wt: 14, slots: 3, maxSlots: 6, price: 3000 },
  body_heavy: { name: '重装フレームH1', slot: 'body', mtype: 'heavy', model: 'body_heavy', armor: 190, def: 11, wt: 20, slots: 3, maxSlots: 6, price: 4200 },
  body_sharp: { name: 'シャープフレームS1', slot: 'body', mtype: 'sharp', model: 'body_sharp', armor: 95, def: 4, wt: 9, slots: 3, maxSlots: 6, price: 3800 },
  // アルファの外装（専用の装甲）：封印が解けるたびに進化する（stages の番号＝封印の段階。数値と名前と光り方が変わる）
  body_alpha: { name: 'アルファフレーム', slot: 'body', mtype: 'legend', model: 'body_legend', armor: 260, def: 14, wt: 10, slots: 4, maxSlots: 6, price: 0, only: 'alpha', coreSlot: true, evolveBy: 'seal',
    stages: [
      { name: '封じられた外装', armor: 180, def: 9 },
      { name: '目覚めの外装', armor: 260, def: 14 },
      { name: '白金の外装', armor: 340, def: 18 },
      { name: '星光の外装', armor: 430, def: 22 },
      { name: 'アルファマックス外装', armor: 560, def: 28, wingSpread: true },
    ] },
  body_gaia: { name: 'ガイアフレーム', slot: 'body', mtype: 'heavy', model: 'body_heavy', armor: 380, def: 20, wt: 18, slots: 5, maxSlots: 6, price: 0, only: 'gaia' },
  body_omega: { name: 'オメガフレーム', slot: 'body', mtype: 'legend', model: 'body_legend', armor: 300, def: 14, wt: 10, slots: 6, maxSlots: 6, price: 0, only: 'omega' },
  // 第2章（風の惑星）のお店
  body_balance2: { name: 'バランスフレームB2', slot: 'body', mtype: 'balance', model: 'body_std', armor: 190, def: 10, wt: 14, slots: 3, maxSlots: 6, price: 9800 },
  body_heavy2: { name: '重装フレームH2', slot: 'body', mtype: 'heavy', model: 'body_heavy', armor: 270, def: 15, wt: 20, slots: 3, maxSlots: 6, price: 12500 },
  body_sharp2: { name: 'シャープフレームS2', slot: 'body', mtype: 'sharp', model: 'body_sharp', armor: 140, def: 6, wt: 9, slots: 3, maxSlots: 6, price: 11000 },
  // 第3章（水の惑星）のお店
  body_balance3: { name: 'バランスフレームB3', slot: 'body', mtype: 'balance', model: 'body_std', armor: 250, def: 13, wt: 14, slots: 3, maxSlots: 6, price: 21000 },
  body_heavy3: { name: '重装フレームH3', slot: 'body', mtype: 'heavy', model: 'body_heavy', armor: 350, def: 19, wt: 21, slots: 3, maxSlots: 6, price: 26000 },
  body_sharp3: { name: 'シャープフレームS3', slot: 'body', mtype: 'sharp', model: 'body_sharp', armor: 185, def: 8, wt: 9, slots: 3, maxSlots: 6, price: 23000 },

  // ---- 腕（右と左を別々に装備） ----
  arm_std: { name: '標準アーム', slot: 'arm', model: 'arm_std', armor: 22, def: 3, wt: 4, atkMul: 1.0, hit: 0, eva: 0, price: 500 },
  arm_heavy: { name: 'ヘビーアームHA', slot: 'arm', model: 'arm_heavy', armor: 34, def: 5, wt: 7, atkMul: 1.2, hit: -8, eva: -2, price: 1600 },
  arm_light: { name: 'ライトアームLA', slot: 'arm', model: 'arm_light', armor: 16, def: 2, wt: 2, atkMul: 0.9, hit: 8, eva: 5, price: 1400 },
  arm_power: { name: 'パワーアームPA', slot: 'arm', model: 'arm_power', armor: 30, def: 4, wt: 8, atkMul: 1.1, hit: -2, eva: -1, power: true, price: 2600 },
  arm_sharp: { name: 'シャープアームSA', slot: 'arm', model: 'arm_sharp', armor: 18, def: 2, wt: 2, atkMul: 1.0, hit: 6, eva: 6, price: 1800 },
  arm_titan: { name: 'タイタンアーム【限定】', slot: 'arm', model: 'arm_power', armor: 48, def: 7, wt: 7, atkMul: 1.35, hit: 2, eva: 0, power: true, price: 0, limited: true },
  arm_alpha: { name: 'アルファアーム', slot: 'arm', model: 'arm_sharp', armor: 45, def: 6, wt: 3, atkMul: 1.2, hit: 10, eva: 8, power: true, price: 0, only: 'alpha' },
  arm_gaia: { name: 'ガイアアーム', slot: 'arm', model: 'arm_power', armor: 70, def: 9, wt: 7, atkMul: 1.3, hit: 0, eva: -1, power: true, price: 0, only: 'gaia' },
  arm_omega: { name: 'オメガアーム', slot: 'arm', model: 'arm_sharp', armor: 45, def: 6, wt: 3, atkMul: 1.2, hit: 8, eva: 8, power: true, price: 0, only: 'omega' },
  // 第2章（風の惑星）のお店
  arm_gale: { name: 'ゲイルアーム', slot: 'arm', model: 'arm_light', armor: 28, def: 3, wt: 3, atkMul: 1.1, hit: 8, eva: 8, price: 6400 },
  arm_heavy2: { name: 'ヘビーアームHA2', slot: 'arm', model: 'arm_heavy', armor: 50, def: 7, wt: 7, atkMul: 1.3, hit: -6, eva: -2, price: 6200 },
  arm_power2: { name: 'パワーアームPA2', slot: 'arm', model: 'arm_power', armor: 44, def: 6, wt: 8, atkMul: 1.2, hit: 0, eva: -1, power: true, price: 7800 },
  // 第3章（水の惑星）のお店
  arm_hydro: { name: 'ハイドロアーム', slot: 'arm', model: 'arm_sharp', armor: 40, def: 5, wt: 4, atkMul: 1.15, hit: 10, eva: 8, price: 13000 },
  arm_power3: { name: 'パワーアームPA3', slot: 'arm', model: 'arm_power', armor: 60, def: 8, wt: 8, atkMul: 1.3, hit: 0, eva: -1, power: true, price: 15000 },

  // ---- 脚（左右セットで1パーツ。脚で乗り物の形が変わる） ----
  legs_biped: { name: '二脚レッグB1', slot: 'legs', model: 'legs_biped', legType: 'biped', armor: 40, def: 5, wt: 8, eva: 6, spd: 0, price: 900 },
  legs_quad: { name: '四脚レッグQ1', slot: 'legs', model: 'legs_quad', legType: 'quad', armor: 62, def: 9, wt: 12, eva: -2, spd: -1, price: 2200 },
  legs_tread: { name: 'キャタピラT1（戦車型）', slot: 'legs', model: 'legs_tread', legType: 'tread', armor: 74, def: 11, wt: 14, eva: -6, spd: -2, price: 2600 },
  legs_wheel: { name: 'タイヤW1（バイク型）', slot: 'legs', model: 'legs_wheel', legType: 'wheel', armor: 34, def: 3, wt: 7, eva: 10, spd: 4, price: 2400 },
  legs_hover: { name: 'ホバーユニットH1', slot: 'legs', model: 'legs_hover', legType: 'hover', armor: 30, def: 3, wt: 6, eva: 14, spd: 3, price: 3000 },
  legs_sharp: { name: 'シャープレッグSL', slot: 'legs', model: 'legs_sharp', legType: 'biped', armor: 36, def: 4, wt: 5, eva: 12, spd: 3, price: 2800 },
  legs_jet: { name: 'ジェットホバー【限定】', slot: 'legs', model: 'legs_hover', legType: 'hover', armor: 55, def: 6, wt: 6, eva: 20, spd: 6, price: 0, limited: true },
  legs_alpha: { name: 'アルファレッグ', slot: 'legs', model: 'legs_sharp', legType: 'biped', armor: 90, def: 10, wt: 5, eva: 16, spd: 5, price: 0, only: 'alpha' },
  legs_gaia: { name: 'ガイアレッグ', slot: 'legs', model: 'legs_biped', legType: 'biped', armor: 140, def: 16, wt: 12, eva: 2, spd: 1, price: 0, only: 'gaia' },
  legs_omega: { name: 'オメガレッグ', slot: 'legs', model: 'legs_sharp', legType: 'biped', armor: 90, def: 10, wt: 5, eva: 14, spd: 5, price: 0, only: 'omega' },
  // 第2章（風の惑星）のお店
  legs_biped2: { name: '二脚レッグB2', slot: 'legs', model: 'legs_biped', legType: 'biped', armor: 62, def: 8, wt: 8, eva: 8, spd: 1, price: 4800 },
  legs_hover2: { name: 'ホバーユニットH2', slot: 'legs', model: 'legs_hover', legType: 'hover', armor: 46, def: 5, wt: 6, eva: 17, spd: 5, price: 8600 },
  legs_tread2: { name: 'キャタピラT2（戦車型）', slot: 'legs', model: 'legs_tread', legType: 'tread', armor: 110, def: 16, wt: 14, eva: -5, spd: -1, price: 8200 },
  // 第3章（水の惑星）のお店
  legs_marine: { name: 'マリンホバーM1', slot: 'legs', model: 'legs_hover', legType: 'hover', armor: 70, def: 7, wt: 6, eva: 20, spd: 6, price: 16000 },
  legs_quad2: { name: '四脚レッグQ2', slot: 'legs', model: 'legs_quad', legType: 'quad', armor: 110, def: 14, wt: 12, eva: 0, spd: 0, price: 14000 },
  legs_abyss: { name: 'アビスウォーカー【限定】', slot: 'legs', model: 'legs_sharp', legType: 'biped', armor: 120, def: 14, wt: 6, eva: 18, spd: 6, price: 0, limited: true },

  // ---- エンジン（中に積む。見た目には出ない） ----
  eng_v6: { name: 'V6ディーゼル', slot: 'engine', cap: 40, en: 60, wt: 0, price: 800 },
  eng_turbo: { name: 'ツインターボTT', slot: 'engine', cap: 50, en: 70, wt: 0, price: 2400 },
  eng_heavy: { name: '重機用エンジンHX', slot: 'engine', cap: 80, en: 60, wt: 0, price: 4500 },
  eng_jet: { name: 'ジェットタービンJT', slot: 'engine', cap: 64, en: 90, wt: 0, price: 8400 },
  eng_heavy2: { name: '重機用エンジンHX2', slot: 'engine', cap: 100, en: 80, wt: 0, price: 11000 },
  eng_hydro: { name: 'ハイドロタービンHT', slot: 'engine', cap: 84, en: 110, wt: 0, price: 17000 },
  eng_alpha: { name: 'アルファコア', slot: 'engine', cap: 70, en: 140, wt: 0, price: 0, only: 'alpha' },
  eng_omega: { name: 'オメガコア', slot: 'engine', cap: 85, en: 120, wt: 0, price: 0, only: 'omega' },
  eng_gaia: { name: 'ガイアコア', slot: 'engine', cap: 110, en: 100, wt: 0, price: 0, only: 'gaia' },
};

// マシンのタイプ（ボディの mtype）。武器は共通で、タイプごとに得意な武器の相性がある
// boost: 武器の威力倍率（cat=カテゴリ / elec=電気属性 / all=すべて）
// wtRate: 得意な武器の重さの割合（重厚は主砲・ミサイルを多く積める）
export const MACHINE_TYPES = {
  heavy: { name: '重厚', desc: '装甲が厚く遅い。重い主砲・ミサイルが得意（威力+15%・重さ-20%）', boost: { cannon: 1.15, missile: 1.15 }, wtCats: ['cannon', 'missile'], wtRate: 0.8, spd: -2, eva: -3 },
  balance: { name: 'バランス', desc: '平均的。どの武器も標準', boost: {}, spd: 0, eva: 0 },
  sharp: { name: 'シャープ', desc: '軽くて速いが打たれ弱い。軽いレーザー（電気）と近接武器が得意（威力+20%）', boost: { elec: 1.2, melee: 1.2 }, spd: 3, eva: 5 },
  legend: { name: '伝説', desc: '欠点のない別格の機体。どの武器も威力+10%', boost: { all: 1.1 }, spd: 3, eva: 4 },
};

// 改造（ガレージ）。メカニック割引でギアが安くなる
export const MODS = {
  mechanicDiscount: 0.3, // 改造・強化費用 30%引き
  frame: [ // フレーム強化 → 武器スロット +1
    { gear: 1500, materials: { scrap: 4, alloy: 1 } },
    { gear: 4000, materials: { alloy: 3, cell: 1 } },
    { gear: 9000, materials: { alloy: 6, cell: 3, core: 1 } },
  ],
  engine: [ // エンジン強化 → 積める重さ +6
    { gear: 1000, materials: { scrap: 3 }, cap: 6 },
    { gear: 2500, materials: { cell: 2 }, cap: 6 },
    { gear: 5000, materials: { cell: 2, alloy: 2 }, cap: 8 },
  ],
};

// 武器スロットの場所（6か所＋アルファだけの胸のコア）
// mount：arm＝腕用の武器（機銃・近接・特殊の一部）／back＝肩・背中用（主砲・ミサイル・特殊の一部）／core＝胸のコア（ステラ・ブレイカー専用）
// 武器の mount が 'any' なら、通常の6か所のどこにでも付けられる（特別機の専用武器）
// 顔の真後ろ（旧「背中・中央」）には何も付けない。肩の上は頭の横を通る間隔、背中は頭より後ろ・下
// 開く順番：最初の3枠＝右腕・左腕・右肩、フレーム強化で左肩 → 背中・右 → 背中・左（最大6枠）
export const SLOT_INFO = [
  { name: '右腕', short: '右腕', mount: 'arm', side: 'R', place: 'hand', icon: '✋' },
  { name: '左腕', short: '左腕', mount: 'arm', side: 'L', place: 'hand', icon: '✋' },
  { name: '右肩の上', short: '右肩', mount: 'back', side: 'R', place: 'shoulder', icon: '◤' },
  { name: '左肩の上', short: '左肩', mount: 'back', side: 'L', place: 'shoulder', icon: '◥' },
  { name: '背中・右', short: '背右', mount: 'back', side: 'R', place: 'back', icon: '◣' },
  { name: '背中・左', short: '背左', mount: 'back', side: 'L', place: 'back', icon: '◢' },
  { name: '胸のコア（第7の専用スロット）', short: 'コア', mount: 'core', place: 'core', core: true, icon: '✦' },
];
export const NORMAL_SLOTS = 6; // 通常の武器スロットの数（胸のコアは別）
export const CORE_SLOT = 6;
export const HEAVY_ARM_WEAPON = 6; // 重さがこれより大きい腕武器はパワーアームが必要
