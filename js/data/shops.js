// 町ごとのお店の品ぞろえ。町を進むほど強いものが売られる
export const SHOPS = {
  // 町1：辺境の町ラストヘイヴン
  town1: {
    weapon: {
      keeper: '武器屋のダッジ',
      greet: 'いらっしゃい！ 荒野を生き抜くなら火力だぜ。',
      machine: ['mg7', 'gt1', 'sc1', 'c75', 'rpod', 'hm1', 'flm1', 'hblade'],
      foot: ['handgun', 'vest'],
    },
    parts: {
      keeper: 'パーツ屋のミナ',
      greet: '新品も中古もそろってるよ。見ていって！',
      parts: ['head_sensor', 'arm_std', 'arm_light', 'legs_biped', 'legs_wheel', 'eng_v6', 'eng_turbo'],
    },
    item: {
      keeper: '道具屋のおばちゃん',
      greet: 'ケガも故障も、そなえあればうれいなしだよ。',
      items: ['kitS', 'repS', 'batS', 'kitM', 'revive'],
    },
    inn: { pricePerMember: 20, keeper: '宿屋のハル' },
    garage: { keeper: 'ガレージ長のトト', repairPerArmor: 1, repairPerEn: 1, towFee: 200 },
  },
  // 町2：鉱山町グレイロック
  town2: {
    weapon: {
      keeper: '武器屋のボーグ',
      greet: '掘り出し物ばかりだ。……鉱山だけにな。',
      machine: ['gt1', 'lm1', 'c75', 'rg1', 'hm1', 'cm1', 'emp1', 'tsl1', 'lzblade'],
      foot: ['shotgun', 'rifle', 'pilotsuit'],
    },
    parts: {
      keeper: 'パーツ屋のドク',
      greet: '採掘マシン用の頑丈なパーツならまかせとけ。',
      parts: ['head_radar', 'head_sharp', 'arm_heavy', 'arm_power', 'arm_sharp', 'legs_quad', 'legs_tread', 'legs_wheel', 'body_balance', 'body_sharp', 'eng_turbo'],
    },
    item: {
      keeper: '道具屋のピコ',
      greet: '坑道に入るなら、修理キットは多めにね。',
      items: ['kitS', 'kitM', 'repS', 'repM', 'batS', 'batM', 'maint', 'revive'],
    },
    inn: { pricePerMember: 30, keeper: '宿屋のおかみ' },
    garage: { keeper: '整備士のロック', repairPerArmor: 1, repairPerEn: 1, towFee: 250 },
  },
  // 町3：中継ステーション・ウェイポイント
  town3: {
    weapon: {
      keeper: '武器商人ヴァンス',
      greet: '宇宙港から流れてきた品だ。値は張るが、性能は保証する。',
      machine: ['v20', 'lm1', 'rg1', 'pc1', 'hm2', 'cm1', 'npm1', 'tsl1', 'lzblade'],
      foot: ['rifle', 'lblade', 'heavyarmor'],
    },
    parts: {
      keeper: 'パーツ屋のリズ',
      greet: '重装フレームもホバーも、ここならそろうわ。',
      parts: ['head_radar', 'head_heavy', 'head_sharp', 'arm_power', 'arm_sharp', 'legs_hover', 'legs_sharp', 'legs_tread', 'body_heavy', 'body_balance', 'body_sharp', 'eng_heavy'],
    },
    item: {
      keeper: '補給係のモモ',
      greet: '上位の救急キットも修理キットもあるよ。',
      items: ['kitM', 'kitL', 'repM', 'repL', 'batM', 'batL', 'maint', 'revive', 'megaheal'],
    },
    inn: { pricePerMember: 40, keeper: '宿の主人' },
    garage: { keeper: '整備長カイ', repairPerArmor: 1, repairPerEn: 1, towFee: 300 },
  },
};
