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
      items: ['kitS', 'repS', 'batS', 'kitM', 'revive', 'warpunit', 'repelS'],
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
      items: ['kitS', 'kitM', 'repS', 'repM', 'batS', 'batM', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'],
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
      items: ['kitM', 'repM', 'batM', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'],
    },
    // 交易マーケット（大きな店）と広場の屋台
    market: {
      keeper: 'マーケットの支配人ルゥ',
      greet: '宇宙港から届いた上物ばかり。ボス戦の準備ならここで全部そろうよ。',
      items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'megaheal', 'warpunit', 'repelS', 'repelL'],
      foot: ['hpring', 'powerbelt', 'reflexchip', 'medpack'],
    },
    stall_food: { keeper: '屋台のおやじ', greet: '安いよ安いよ！ 旅のおともにどうだい！', items: ['kitS', 'repS', 'batS', 'warpunit', 'repelS', 'repelL'] },
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
      items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'],
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
      machine: ['rg2', 'lm2', 'cm2', 'galemissile', 'emp2', 'flm2', 'windblade', 'pzblade', 'haxe'],
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
      items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'],
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
      machine: ['rg2', 'sm1', 'galemissile', 'lm2', 'emp2', 'windblade', 'pzblade', 'v30', 'gigahammer'],
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
      items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'],
    },
    market: {
      keeper: '交易所の主人バロウ',
      greet: '星の外から届いた上物ばかりさ。嵐の塔の準備なら、ここで全部そろう。',
      items: ['kitL', 'repL', 'batL', 'maint', 'revive', 'megaheal', 'warpunit', 'repelS', 'repelL'],
      foot: ['stormcharm', 'windmuffler', 'medpack', 'reflexchip'],
    },
    stall_wind1: { keeper: '風船売りの子', greet: 'いらっしゃい！ 空港名物の救急セットだよ。', items: ['kitM', 'repM', 'batM', 'warpunit', 'repelS', 'repelL'] },
    stall_wind2: { keeper: '空賊あがりの武器商', greet: '……元空賊さ。いまは足を洗った。品物は本物だぜ。', machine: ['gt2', 'cm2', 'haxe', 'flm2'], foot: ['windcutter', 'aerorifle'] },
    stall_wind3: { keeper: 'ジャンクパーツ屋', greet: '飛行船の解体で出た部品だよ。', parts: ['arm_gale', 'legs_biped2', 'head_sharp2'] },
    inn: { pricePerMember: 80, keeper: '空港ホテルの支配人' },
    garage: { keeper: '整備長ハヤテ', repairPerArmor: 1, repairPerEn: 1, towFee: 500 },
  },

  // ================================================================ 第3章「水」の惑星
  // 町7：港町シーゲート（宇宙船が着く人工島の港）
  town7: {
    weapon: {
      keeper: '武器屋のマリナ',
      greet: '海の星へようこそ！ 水の中でも撃てる武器がそろってるよ。',
      machine: ['rg2', 'sm1', 'galemissile', 'tidalgat', 'torpedo', 'emp2', 'pzblade'],
      foot: ['harpoongun', 'coralblade', 'plasmarifle', 'divemask', 'aquagloves'],
    },
    parts: {
      keeper: 'パーツ屋のシオリ',
      greet: '海で使うなら、さびに強いパーツを選んでね。',
      parts: ['head_sonar', 'arm_hydro', 'legs_marine', 'legs_quad2', 'eng_hydro', 'body_balance2'],
    },
    item: {
      keeper: '道具屋のおやじウミ',
      greet: '潮風で体が冷える。救急キットは多めにな。',
      items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'],
      foot: ['pearlcharm'],
    },
    inn: { pricePerMember: 100, keeper: '灯台守の宿のナミ' },
    garage: { keeper: 'ドック長のスクリュー', repairPerArmor: 1, repairPerEn: 1, towFee: 600 },
  },
  // 町8：水上集落タイドウォーク（パーツ屋＋ドック工房の2軒。水中ユニットの改造もここ）
  town8: {
    weapon: {
      keeper: '武器屋のカイリ',
      greet: '集落の漁師も使ってる、頑丈な武器さ。',
      machine: ['aquacannon', 'torpedo', 'tidalgat', 'cryoray', 'hydrocutter', 'pc2', 'cm3'],
      foot: ['bubblebomb', 'coralblade', 'stormgat', 'wetsuit', 'finboots'],
    },
    parts: {
      keeper: 'パーツ屋のサザ',
      greet: '腕と頭なら、うちにまかせときな。',
      parts: ['head_sonar', 'head_heavy3', 'arm_hydro', 'arm_power3', 'legs_marine', 'legs_quad2'],
    },
    frame: {
      keeper: 'ドック工房の親方テツ',
      greet: '海の上で組むフレームは、水圧にも負けねえ。',
      parts: ['body_balance3', 'body_heavy3', 'body_sharp3', 'eng_hydro', 'eng_heavy2', 'legs_tread2'],
    },
    item: {
      keeper: '道具屋のアサリ',
      greet: '海上プラントに行くなら、生身の回復が大事よ。',
      items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'],
      foot: ['pearlcharm', 'tidering'],
    },
    inn: { pricePerMember: 110, keeper: '水上の宿のシズク' },
    garage: { keeper: '整備士のアンカ', repairPerArmor: 1, repairPerEn: 1, towFee: 650 },
  },
  // 町9：海上ドーム都市アクアドーム（いちばん広い。交易所と屋台）
  town9: {
    weapon: {
      keeper: '武器商人ネプト',
      greet: '星の外から届いた最新型だ。水没都市に挑むならこれくらいはな。',
      machine: ['aquacannon', 'torpedo', 'tidalgat', 'cryoray', 'hydrocutter', 'pc2', 'v30', 'tsl2', 'cm3', 'gigahammer'],
      foot: ['harpoongun', 'coralblade', 'bubblebomb', 'plasmarifle', 'stormgat', 'divemask', 'wetsuit', 'aquagloves', 'finboots'],
    },
    parts: {
      keeper: 'パーツ屋のコーラ',
      greet: 'ドームの工場で作った新品よ。なんでもそろうわ。',
      parts: ['head_sonar', 'head_heavy3', 'body_balance3', 'body_heavy3', 'body_sharp3', 'arm_hydro', 'arm_power3', 'legs_marine', 'legs_quad2', 'eng_hydro'],
    },
    item: {
      keeper: '補給係のミオ',
      greet: 'ドームの補給品です。旅の前にまとめてどうぞ。',
      items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'],
    },
    market: {
      keeper: '交易所の主人タイド',
      greet: '海の底の遺跡から上がった品もあるよ。ボス戦の準備ならここで。',
      items: ['kitL', 'repL', 'batL', 'maint', 'revive', 'megaheal', 'warpunit', 'repelS', 'repelL'],
      foot: ['pearlcharm', 'tidering', 'nanohelm', 'nanogloves'],
    },
    stall_sea1: { keeper: '貝がら売りの子', greet: 'いらっしゃい！ 貝がらの薬はよく効くよ。', items: ['kitM', 'kitL', 'repM', 'warpunit', 'repelS', 'repelL'] },
    stall_sea2: { keeper: '元海賊の武器商', greet: '……海賊はやめたさ。品物は本物だ。', machine: ['tidalgat', 'torpedo', 'galemissile', 'windblade'], foot: ['harpoongun', 'coralblade'] },
    stall_sea3: { keeper: 'サルベージ屋', greet: '沈んだ船から引き上げた部品だよ。', parts: ['arm_hydro', 'legs_quad2', 'head_sonar'] },
    inn: { pricePerMember: 120, keeper: 'ドームホテルの支配人' },
    garage: { keeper: '整備長マリン', repairPerArmor: 1, repairPerEn: 1, towFee: 700 },
  },
  // ================================================================ 第4〜7章
  // 第4章：クリムゾンフォージ
  town10: {
    weapon: { keeper: '武器屋のダグ', greet: '溶鉱炉の火で鍛えた武器だ。', machine: ['magmacannon', 'lavagat', 'flaremissile', 'heatsaber', 'hrg', 'plg'], foot: ['flamethrower', 'magmapistol', 'heatvisor', 'fireproof', 'forgegloves', 'lavaboots', 'plasmarifle', 'stormgat'] },
    parts: { keeper: 'パーツ屋のスミス', greet: '熱に強いパーツならまかせとけ。', parts: ['head_f4', 'body_bf4', 'body_hf4', 'body_sf4', 'arm_f4', 'legs_f4', 'eng_f4'] },
    item: { keeper: '道具屋のアカネ', greet: '火傷にはこれ。修理キットも忘れずにね。', items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'], foot: ['embercharm'] },
    inn: { pricePerMember: 220, keeper: 'クリムゾンフォージの宿の主人' },
    garage: { keeper: 'クリムゾンフォージの整備長', repairPerArmor: 1, repairPerEn: 1, towFee: 1000 },
  },
  // 第4章：カルデラリム
  town11: {
    weapon: { keeper: '武器屋のマグナ', greet: '火口のふちで鍛えた品さ。', machine: ['magmacannon', 'lavagat', 'flaremissile', 'heatsaber', 'hrg', 'plg', 'sm2', 'inferno'], foot: ['flamethrower', 'magmapistol', 'heatvisor', 'fireproof', 'forgegloves', 'lavaboots', 'plasmarifle', 'stormgat'] },
    parts: { keeper: 'パーツ屋のコークス', greet: '腕と頭はこっちだよ。', parts: ['head_f4', 'arm_f4', 'legs_f4'] },
    frame: { keeper: 'カルデラリムの工房の親方', greet: 'フレームとエンジンは工房で組むんだ。', parts: ['body_bf4', 'body_hf4', 'body_sf4', 'eng_f4'] },
    item: { keeper: '道具屋のヒバナ', greet: '耐熱工房の帰りにどうぞ。', items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'], foot: ['embercharm'] },
    inn: { pricePerMember: 230, keeper: 'カルデラリムの宿の主人' },
    garage: { keeper: 'カルデラリムの整備長', repairPerArmor: 1, repairPerEn: 1, towFee: 1050 },
  },
  // 第4章：アッシュポート
  town12: {
    weapon: { keeper: '武器商人ブレイズ', greet: '灰の港に集まる最新の武器だ。', machine: ['magmacannon', 'lavagat', 'flaremissile', 'heatsaber', 'hrg', 'plg', 'sm2', 'inferno', 'pile3'], foot: ['flamethrower', 'magmapistol', 'heatvisor', 'fireproof', 'forgegloves', 'lavaboots', 'plasmarifle', 'stormgat'] },
    parts: { keeper: 'パーツ屋のスラグ', greet: '港の倉庫から出した新品だよ。', parts: ['head_f4', 'body_bf4', 'body_hf4', 'body_sf4', 'arm_f4', 'legs_f4', 'eng_f4'] },
    item: { keeper: '補給係のホムラ', greet: '火山に入るなら回復は多めに。', items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'], foot: ['embercharm'] },
    market: { keeper: 'アッシュポートの交易所の主人', greet: 'ボス戦の準備ならここで全部そろうよ。', items: ['kitL', 'repL', 'batL', 'maint', 'revive', 'megaheal', 'warpunit', 'repelL'], foot: ['embercharm', 'medpack', 'reflexchip'] },
    stall_town12a: { keeper: '屋台の売り子', greet: 'いらっしゃい！ 安いよ！', items: ['kitM', 'kitL', 'repM', 'batM', 'warpunit', 'repelS'] },
    stall_town12b: { keeper: '流れの武器商', greet: '……出どころは聞かないでくれ。', machine: ['magmacannon', 'lavagat', 'flaremissile'], foot: ['flamethrower', 'magmapistol'] },
    stall_town12c: { keeper: 'ジャンクパーツ屋', greet: '拾ってきた部品だよ。', parts: ['arm_f4', 'legs_f4', 'eng_f4'] },
    inn: { pricePerMember: 240, keeper: 'アッシュポートの宿の主人' },
    garage: { keeper: 'アッシュポートの整備長', repairPerArmor: 1, repairPerEn: 1, towFee: 1100 },
  },
  // 第5章：ルミナ
  town13: {
    weapon: { keeper: '武器屋のアウラ', greet: '古代の技術で作った武器ですよ。', machine: ['lumencannon', 'prismgat', 'halomissile', 'crystallance', 'gpc', 'hvg'], foot: ['photonrifle', 'radiantblade', 'halocrown', 'lightmail', 'lumengloves', 'skywalkers', 'antimat', 'mortar'] },
    parts: { keeper: 'パーツ屋のソル', greet: '光の力で動くパーツです。', parts: ['head_l5', 'body_bl5', 'body_hl5', 'body_sl5', 'arm_l5', 'legs_l5', 'eng_l5'] },
    item: { keeper: '道具屋のヒカリ', greet: '光の星の薬はよく効きますよ。', items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'], foot: ['sunamulet'] },
    inn: { pricePerMember: 250, keeper: 'ルミナの宿の主人' },
    garage: { keeper: 'ルミナの整備長', repairPerArmor: 1, repairPerEn: 1, towFee: 1100 },
  },
  // 第5章：クリスタリア
  town14: {
    weapon: { keeper: '武器屋のジェム', greet: '水晶で磨いた武器だよ。', machine: ['lumencannon', 'prismgat', 'halomissile', 'crystallance', 'gpc', 'hvg', 'nova', 'thor'], foot: ['photonrifle', 'radiantblade', 'halocrown', 'lightmail', 'lumengloves', 'skywalkers', 'antimat', 'mortar'] },
    parts: { keeper: 'パーツ屋のクオーツ', greet: '頭と腕ならこっち。', parts: ['head_l5', 'arm_l5', 'legs_l5'] },
    frame: { keeper: 'クリスタリアの工房の親方', greet: 'フレームとエンジンは工房で組むんだ。', parts: ['body_bl5', 'body_hl5', 'body_sl5', 'eng_l5'] },
    item: { keeper: '道具屋のミラ', greet: '旧基地に行くなら、救急キットをね。', items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'], foot: ['sunamulet'] },
    inn: { pricePerMember: 260, keeper: 'クリスタリアの宿の主人' },
    garage: { keeper: 'クリスタリアの整備長', repairPerArmor: 1, repairPerEn: 1, towFee: 1150 },
  },
  // 第5章：サンクトゥム
  town15: {
    weapon: { keeper: '武器商人セイント', greet: '神殿の都の最高の品をどうぞ。', machine: ['lumencannon', 'prismgat', 'halomissile', 'crystallance', 'gpc', 'hvg', 'nova', 'thor', 'photon'], foot: ['photonrifle', 'radiantblade', 'halocrown', 'lightmail', 'lumengloves', 'skywalkers', 'antimat', 'mortar'] },
    parts: { keeper: 'パーツ屋のルクス', greet: 'フレームもエンジンもそろっています。', parts: ['head_l5', 'body_bl5', 'body_hl5', 'body_sl5', 'arm_l5', 'legs_l5', 'eng_l5'] },
    item: { keeper: '補給係のステラ', greet: '神殿の奥は長いですよ。', items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'], foot: ['sunamulet'] },
    market: { keeper: 'サンクトゥムの交易所の主人', greet: 'ボス戦の準備ならここで全部そろうよ。', items: ['kitL', 'repL', 'batL', 'maint', 'revive', 'megaheal', 'warpunit', 'repelL'], foot: ['sunamulet', 'medpack', 'reflexchip'] },
    stall_town15a: { keeper: '屋台の売り子', greet: 'いらっしゃい！ 安いよ！', items: ['kitM', 'kitL', 'repM', 'batM', 'warpunit', 'repelS'] },
    stall_town15b: { keeper: '流れの武器商', greet: '……出どころは聞かないでくれ。', machine: ['lumencannon', 'prismgat', 'halomissile'], foot: ['photonrifle', 'radiantblade'] },
    stall_town15c: { keeper: 'ジャンクパーツ屋', greet: '拾ってきた部品だよ。', parts: ['arm_l5', 'legs_l5', 'eng_l5'] },
    inn: { pricePerMember: 270, keeper: 'サンクトゥムの宿の主人' },
    garage: { keeper: 'サンクトゥムの整備長', repairPerArmor: 1, repairPerEn: 1, towFee: 1200 },
  },
  // 第6章：ダスクヴェイル
  town16: {
    weapon: { keeper: '武器屋のノクト', greet: '闇の中でも光る照準つきだ。', machine: ['shadowcannon', 'nightvulcan', 'umbralnova', 'voidscythe', 'gpc', 'hvg'], foot: ['shadowsniper', 'nightbomb', 'nighthelm', 'shadowcloak', 'umbragloves', 'phantomboots', 'antimat', 'mortar'] },
    parts: { keeper: 'パーツ屋のシェイド', greet: '夜でも見えるパーツさ。', parts: ['head_d6', 'body_bd6', 'body_hd6', 'body_sd6', 'arm_d6', 'legs_d6', 'eng_d6'] },
    item: { keeper: '道具屋のトモシビ', greet: 'ランタンの灯りの下でどうぞ。', items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'], foot: ['moonpendant'] },
    inn: { pricePerMember: 280, keeper: 'ダスクヴェイルの宿の主人' },
    garage: { keeper: 'ダスクヴェイルの整備長', repairPerArmor: 1, repairPerEn: 1, towFee: 1200 },
  },
  // 第6章：ブラックフォート
  town17: {
    weapon: { keeper: '武器屋のアイアン', greet: '要塞の武器庫の品だ。', machine: ['shadowcannon', 'nightvulcan', 'umbralnova', 'voidscythe', 'gpc', 'hvg', 'nova', 'thor'], foot: ['shadowsniper', 'nightbomb', 'nighthelm', 'shadowcloak', 'umbragloves', 'phantomboots', 'antimat', 'mortar'] },
    parts: { keeper: 'パーツ屋のボルト', greet: '頭と腕ならこっちだ。', parts: ['head_d6', 'arm_d6', 'legs_d6'] },
    frame: { keeper: 'ブラックフォートの工房の親方', greet: 'フレームとエンジンは工房で組むんだ。', parts: ['body_bd6', 'body_hd6', 'body_sd6', 'eng_d6'] },
    item: { keeper: '道具屋のクロ', greet: '浮遊ドックに行くなら生身の回復を。', items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'], foot: ['moonpendant'] },
    inn: { pricePerMember: 290, keeper: 'ブラックフォートの宿の主人' },
    garage: { keeper: 'ブラックフォートの整備長', repairPerArmor: 1, repairPerEn: 1, towFee: 1250 },
  },
  // 第6章：ラストランタン
  town18: {
    weapon: { keeper: '武器商人エンバー', greet: '最後の隠れ里の、最後の品ぞろえさ。', machine: ['shadowcannon', 'nightvulcan', 'umbralnova', 'voidscythe', 'gpc', 'hvg', 'nova', 'thor', 'photon'], foot: ['shadowsniper', 'nightbomb', 'nighthelm', 'shadowcloak', 'umbragloves', 'phantomboots', 'antimat', 'mortar'] },
    parts: { keeper: 'パーツ屋のルーメ', greet: '尖塔に挑むなら、いちばん強いのを。', parts: ['head_d6', 'body_bd6', 'body_hd6', 'body_sd6', 'arm_d6', 'legs_d6', 'eng_d6'] },
    item: { keeper: '補給係のホタル', greet: '闇の王の前に、準備はしっかりね。', items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'], foot: ['moonpendant'] },
    market: { keeper: 'ラストランタンの交易所の主人', greet: 'ボス戦の準備ならここで全部そろうよ。', items: ['kitL', 'repL', 'batL', 'maint', 'revive', 'megaheal', 'warpunit', 'repelL'], foot: ['moonpendant', 'medpack', 'reflexchip'] },
    stall_town18a: { keeper: '屋台の売り子', greet: 'いらっしゃい！ 安いよ！', items: ['kitM', 'kitL', 'repM', 'batM', 'warpunit', 'repelS'] },
    stall_town18b: { keeper: '流れの武器商', greet: '……出どころは聞かないでくれ。', machine: ['shadowcannon', 'nightvulcan', 'umbralnova'], foot: ['shadowsniper', 'nightbomb'] },
    stall_town18c: { keeper: 'ジャンクパーツ屋', greet: '拾ってきた部品だよ。', parts: ['arm_d6', 'legs_d6', 'eng_d6'] },
    inn: { pricePerMember: 300, keeper: 'ラストランタンの宿の主人' },
    garage: { keeper: 'ラストランタンの整備長', repairPerArmor: 1, repairPerEn: 1, towFee: 1300 },
  },
  // 第7章：ラストホープ
  town19: {
    weapon: { keeper: '武器商人ゼロ', greet: 'これが宇宙で最後の、最強の品ぞろえだ。', machine: ['starfall', 'gpc', 'hvg', 'nova', 'thor', 'photon', 'shadowcannon', 'nightvulcan', 'umbralnova', 'voidscythe'], foot: [] },
    parts: { keeper: 'パーツ屋のオメガ', greet: '三機を信じて、最高のパーツを。', parts: ['head_s7', 'body_bs7', 'body_hs7', 'body_ss7', 'arm_s7', 'legs_s7', 'eng_s7'] },
    item: { keeper: '補給係のアイ', greet: 'マザーコアの心臓へ……必ず帰ってきて。', items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'warpunit', 'repelS', 'repelL'] },
    market: { keeper: 'ラストホープの交易所の主人', greet: 'ボス戦の準備ならここで全部そろうよ。', items: ['kitL', 'repL', 'batL', 'maint', 'revive', 'megaheal', 'warpunit', 'repelL'], foot: ['medpack', 'reflexchip'] },
    inn: { pricePerMember: 310, keeper: 'ラストホープの宿の主人' },
    garage: { keeper: 'ラストホープの整備長', repairPerArmor: 1, repairPerEn: 1, towFee: 1300 },
  },
};
