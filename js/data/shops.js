// 町ごとのお店の品ぞろえ。町を進むほど強いものが売られる
export const SHOPS = {
  town1: {
    weapon: {
      keeper: '武器屋のダッジ',
      greet: 'いらっしゃい！ 荒野を生き抜くなら火力だぜ。',
      machine: ['mg7', 'gt1', 'sc1', 'c75', 'rg1', 'rpod', 'hm1', 'cm1', 'flm1', 'emp1', 'tsl1'],
      foot: ['handgun', 'shotgun', 'rifle', 'vest'],
    },
    parts: {
      keeper: 'パーツ屋のミナ',
      greet: '新品も中古もそろってるよ。見ていって！',
      parts: ['head_sensor', 'head_radar', 'head_heavy', 'arm_std', 'arm_light', 'arm_heavy', 'arm_power', 'legs_biped', 'legs_quad', 'legs_tread', 'legs_hover'],
    },
    item: {
      keeper: '道具屋のおばちゃん',
      greet: 'ケガも故障も、そなえあればうれいなしだよ。',
      items: ['kitS', 'kitM', 'repS', 'repM', 'batS', 'batM', 'maint', 'revive'],
    },
    inn: { pricePerMember: 20, keeper: '宿屋のハル' },
    garage: { keeper: 'ガレージ長のトト', repairPerArmor: 1, repairPerEn: 1, towFee: 200 },
  },
};
