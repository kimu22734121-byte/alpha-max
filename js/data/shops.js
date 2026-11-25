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
      foot: ['charm', 'scarf'],
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
      foot: ['guardcharm', 'luckycoin', 'hpring', 'cape'],
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

  // ================================================================ 第2章「風」の惑星
  // 町4：風車の町ブリーズヒル（宇宙船の発着場がある、最初に着く町）
  town4: {
    weapon: {
      keeper: '武器屋のトルネ',
      greet: '風の星へようこそ！ 空を飛ぶ敵には、ミサイルとガトリングが効くよ。',
      machine: ['c105', 'gt2', 'hm2', 'cm2', 'flm2', 'lm1', 'haxe'],
      foot: ['railpistol', 'aerorifle', 'windcutter', 'aerohelm', 'glidegloves'],
    },
    parts: {
      keeper: 'パーツ屋のフウ',
      greet: '風の強い星だから、軽くて速いパーツがよく売れるの。',
      parts: ['head_gale', 'head_sharp2', 'arm_gale', 'legs_biped2', 'legs_hover2', 'eng_jet'],
    },
    item: {
      keeper: '道具屋のミルおばあさん',
      greet: '風車で作った電気で、バッテリーはいつも満タンさ。',
      items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit'],
      foot: ['windmuffler'],
    },
    inn: { pricePerMember: 60, keeper: '宿屋のソヨ' },
    garage: { keeper: 'ガレージ長のボルト', repairPerArmor: 1, repairPerEn: 1, towFee: 400 },
  },
  // 町5：浮遊島の町スカイアンカー（パーツ屋＋風読み工房の2軒）
  town5: {
    weapon: {
      keeper: '武器屋のカザミ',
      greet: '島の上は狭いけど、品ぞろえは負けないよ。',
      machine: ['rg2', 'lm2', 'cm2', 'emp2', 'flm2', 'pzblade', 'haxe'],
      foot: ['shockrod', 'gustlauncher', 'windcutter', 'skyjacket', 'windboots'],
    },
    parts: {
      keeper: 'パーツ屋のアンカ',
      greet: '浮遊装置の部品もあるけど……マシンには付かないね。',
      parts: ['head_gale', 'head_heavy2', 'arm_heavy2', 'arm_power2', 'arm_gale', 'legs_hover2'],
    },
    frame: {
      keeper: '風読み工房の親方ゼフ',
      greet: 'フレームは風を読んで組むんだ。島の上の工房をなめるなよ。',
      parts: ['body_balance2', 'body_sharp2', 'body_heavy2', 'eng_jet', 'eng_heavy2', 'legs_tread2', 'legs_biped2'],
    },
    item: {
      keeper: '道具屋のハネ',
      greet: '研究所に行くなら、救急キットは多めにね。生身だと危ないから。',
      items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit'],
      foot: ['stormcharm', 'windmuffler'],
    },
    inn: { pricePerMember: 70, keeper: '宿屋のクモイ' },
    garage: { keeper: '整備士のアオ', repairPerArmor: 1, repairPerEn: 1, towFee: 450 },
  },
  // 町6：空港の町ゲイルポート（いちばん広い。交易所と屋台）
  town6: {
    weapon: {
      keeper: '武器商人ガスト',
      greet: '飛行船で運ばれてきた最新型だ。嵐の塔に挑むなら、これくらいは積んでいきな。',
      machine: ['rg2', 'sm1', 'lm2', 'emp2', 'pzblade', 'v30', 'gigahammer'],
      foot: ['railpistol', 'shockrod', 'aerorifle', 'gustlauncher', 'aerohelm', 'skyjacket', 'glidegloves', 'windboots'],
    },
    parts: {
      keeper: 'パーツ屋のプロペ',
      greet: '空港のパーツ屋だよ。フレームもエンジンもなんでもござれ。',
      parts: ['head_gale', 'head_heavy2', 'head_sharp2', 'body_balance2', 'body_heavy2', 'body_sharp2', 'arm_gale', 'arm_heavy2', 'arm_power2', 'legs_biped2', 'legs_hover2', 'legs_tread2', 'eng_jet', 'eng_heavy2'],
    },
    item: {
      keeper: '補給係のエアリ',
      greet: '空港の補給品よ。旅の前にまとめてどうぞ。',
      items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit'],
    },
    market: {
      keeper: '交易所の主人バロウ',
      greet: '星の外から届いた上物ばかりさ。嵐の塔の準備なら、ここで全部そろう。',
      items: ['kitL', 'repL', 'batL', 'maint', 'revive', 'megaheal', 'warpunit'],
      foot: ['stormcharm', 'windmuffler', 'medpack', 'reflexchip'],
    },
    stall_wind1: { keeper: '風船売りの子', greet: 'いらっしゃい！ 空港名物の救急セットだよ。', items: ['kitM', 'repM', 'batM', 'warpunit'] },
    stall_wind2: { keeper: '空賊あがりの武器商', greet: '……元空賊さ。いまは足を洗った。品物は本物だぜ。', machine: ['gt2', 'cm2', 'haxe', 'flm2'], foot: ['windcutter', 'aerorifle'] },
    stall_wind3: { keeper: 'ジャンクパーツ屋', greet: '飛行船の解体で出た部品だよ。', parts: ['arm_gale', 'legs_biped2', 'head_sharp2'] },
    inn: { pricePerMember: 80, keeper: '空港ホテルの支配人' },
    garage: { keeper: '整備長ハヤテ', repairPerArmor: 1, repairPerEn: 1, towFee: 500 },
  },
};
