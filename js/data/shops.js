// 町ごとのお店の品ぞろえ。町を進むほど強いものが売られる
// 生身の装備（foot）は footgear.js の tier の順：町1＝tier1、町2＝tier2、町3＝tier3。tier4以降は第2章からのお店に並べる
export const SHOPS = {
  // 町1：辺境の町ラストヘイヴン（武器屋はなく、ジャンク屋が中古の武器を少しだけ売っている）
  town1: {
    junk: {
      keeper: 'ジャンク屋のネジ',
      greet: 'ボルツじいちゃんが拾ってきた中古品だよ。ちゃんと動くって！ ……たぶん。',
      machine: ['mg7', 'sc1', 'c75', 'hblade'],
      foot: ['handgun', 'stunrod', 'pipebomb', 'knife', 'cap', 'helmet', 'vest', 'gloves', 'runshoes', 'scope'],
    },
    parts: {
      keeper: 'パーツ屋のミナ',
      greet: '新品も中古もそろってるよ。見ていって！',
      parts: ['head_sensor', 'arm_std', 'arm_light', 'legs_biped', 'legs_wheel', 'eng_v6', 'eng_turbo'],
    },
    item: {
      keeper: '道具屋のおばちゃん',
      greet: 'ケガも故障も、そなえあればうれいなしだよ。',
      items: ['kitS', 'repS', 'batS', 'kitM', 'revive', 'warpunit'],
      foot: ['charm'],
    },
    inn: { pricePerMember: 20, keeper: '宿屋のハル' },
    garage: { keeper: 'ガレージ長のトト', repairPerArmor: 1, repairPerEn: 1, towFee: 200 },
  },
  // 町2：鉱山町グレイロック
  town2: {
    weapon: {
      keeper: '武器屋のボーグ',
      greet: '掘り出し物ばかりだ。……鉱山だけにな。',
      machine: ['gt1', 'lm1', 'c75', 'rg1', 'rpod', 'hm1', 'cm1', 'flm1', 'emp1', 'tsl1', 'lzblade', 'hammer1', 'pile1'],
      foot: ['shotgun', 'rifle', 'magnum', 'grenadel', 'handgat', 'combathelm', 'pilotsuit', 'heavyarmor', 'tacgloves', 'gauntlet', 'combatboots'],
    },
    // グレイロックはパーツが充実：パーツ屋（頭・腕・脚）とフレーム工房（ボディ・エンジン・脚）の2軒
    parts: {
      keeper: 'パーツ屋のドク',
      greet: '採掘マシン用の頑丈なパーツならまかせとけ。',
      parts: ['head_sensor', 'head_radar', 'head_sharp', 'head_heavy', 'arm_std', 'arm_light', 'arm_heavy', 'arm_power', 'arm_sharp', 'legs_quad', 'legs_tread', 'legs_wheel'],
    },
    frame: {
      keeper: 'フレーム工房の親方ガンツ',
      greet: '骨組みとエンジンは機体の命だ。ここのは鉱山仕込みで頑丈だぜ。',
      parts: ['body_balance', 'body_sharp', 'body_heavy', 'eng_v6', 'eng_turbo', 'eng_heavy', 'legs_biped', 'legs_hover'],
    },
    item: {
      keeper: '道具屋のピコ',
      greet: '坑道に入るなら、修理キットは多めにね。',
      items: ['kitS', 'kitM', 'repS', 'repM', 'batS', 'batM', 'maint', 'revive', 'warpunit'],
      foot: ['guardcharm', 'luckycoin', 'hpring'],
    },
    inn: { pricePerMember: 30, keeper: '宿屋のおかみ' },
    garage: { keeper: '整備士のロック', repairPerArmor: 1, repairPerEn: 1, towFee: 250 },
  },
  // 町3：中継ステーション・ウェイポイント
  town3: {
    weapon: {
      keeper: '武器商人ヴァンス',
      greet: '宇宙港から流れてきた品だ。値は張るが、性能は保証する。',
      machine: ['v20', 'lm1', 'rg1', 'pc1', 'hm2', 'cm1', 'npm1', 'tsl1', 'lzblade', 'pile1'],
      foot: ['sniper1', 'lblade', 'lasergun', 'riotgun', 'greatsword', 'clusterbomb', 'visorhelm', 'compvest', 'powergloves', 'jetboots'],
    },
    parts: {
      keeper: 'パーツ屋のリズ',
      greet: '重装フレームもホバーも、ここならそろうわ。',
      parts: ['head_radar', 'head_heavy', 'head_sharp', 'arm_power', 'arm_sharp', 'legs_hover', 'legs_sharp', 'legs_tread', 'body_heavy', 'body_balance', 'body_sharp', 'eng_heavy'],
    },
    item: {
      keeper: '補給係のモモ',
      greet: '上位の救急キットも修理キットもあるよ。',
      items: ['kitM', 'repM', 'batM', 'maint', 'revive', 'warpunit'],
    },
    // 交易マーケット（大きな店）と広場の屋台
    market: {
      keeper: 'マーケットの支配人ルゥ',
      greet: '宇宙港から届いた上物ばかり。ボス戦の準備ならここで全部そろうよ。',
      items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'megaheal', 'warpunit'],
      foot: ['hpring', 'powerbelt', 'reflexchip', 'medpack'],
    },
    stall_food: { keeper: '屋台のおやじ', greet: '安いよ安いよ！ 旅のおともにどうだい！', items: ['kitS', 'repS', 'batS', 'warpunit'] },
    stall_food2: { keeper: '果物売りの娘', greet: 'となりの星の果物でつくった薬よ。よく効くんだから。', items: ['kitS', 'kitM', 'revive'] },
    stall_arms: { keeper: '流れ者の武器商', greet: '……出どころは聞かないでくれ。性能はたしかだ。', machine: ['gt1', 'rpod', 'flm1', 'hammer1', 'sc1'], foot: ['shotgun', 'knife', 'handgat', 'combatboots'] },
    stall_parts: { keeper: '中古パーツ屋', greet: '中古だけど、ちゃんと整備してあるよ。', parts: ['arm_light', 'legs_wheel', 'head_sensor', 'eng_v6'] },
    stall_parts2: { keeper: 'がらくた拾い', greet: '墜落船のまわりで拾ったんだ。見ていってよ。', parts: ['arm_std', 'legs_biped', 'legs_quad'] },
    inn: { pricePerMember: 40, keeper: '宿の主人' },
    garage: { keeper: '整備長カイ', repairPerArmor: 1, repairPerEn: 1, towFee: 300 },
  },
};
