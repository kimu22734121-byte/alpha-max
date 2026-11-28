// オートバトルの作戦（v2.4〜）。戦闘の「作戦」ボタン・コマンドの「オート」・「せってい」で選べる（G.flags.autoMode に覚える）
//  heal：装甲・体力がこの割合より減ったら回復・修理 / items：道具を使うか（'all'＝何でも、'revive'＝気つけスプレーだけ）
//  en：エネルギーを使う武器を使うか / allfire：全砲門一斉発射（'smart'＝ボス戦か敵が多いとき、'always'＝撃てるときはいつでも、'boss'＝ボス戦だけ、false＝使わない）
export const AUTO_MODES = {
  smart: { name: 'おまかせ', heal: 0.35, items: 'all', en: true, allfire: 'smart', desc: 'バランスよく戦う。いちばんダメージが出る武器と相手、弱ったら回復。ボス戦や敵が多いときは全砲門一斉発射' },
  full: { name: '全力', heal: 0.3, items: 'all', en: true, allfire: 'always', desc: 'ボス向け。エネルギーも道具も惜しまず、いちばん強い攻撃を続ける。一斉発射は撃てるときはいつでも' },
  save: { name: '節約', heal: 0.35, items: 'revive', en: false, allfire: false, desc: 'ザコ戦・長いダンジョン向け。エネルギーを使う武器と道具（気つけスプレー以外）は使わない。修理はレンの特技で' },
  safe: { name: 'いのちだいじに', heal: 0.6, items: 'all', en: true, allfire: 'boss', guard: 0.25, desc: '回復を早めに。体力・装甲が6割を切ったら回復・修理し、危ないときは防御。一斉発射はボス戦だけ' },
};
export const AUTO_ORDER = ['smart', 'full', 'save', 'safe'];
export const autoModeOf = (G) => AUTO_MODES[G?.flags?.autoMode] || AUTO_MODES.smart;
