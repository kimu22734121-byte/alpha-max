// むずかしさ（v2.0〜）。「せってい」でいつでも切り替えられる（audio.settings.difficulty に保存）
//  enemy：敵の体力・攻撃・防御の倍率（イージー＝今までの強さ）
//  map：ちず・ミニ地図に出す印
//    bosses＝手配書の賞金首の場所を、歩いていなくても出す
//    chests＝'all'（歩いていなくても全部の宝箱。レアは赤く大きく、ふつうは青で点滅）/ 'found'（見つけた宝箱だけ青で点滅）/ 'none'（出さない）
//  開けた宝箱は点滅をやめて、色はそのまま。クリアした章の地図はどのむずかしさでも全部見える（chapters.js の mapRevealed）
export const DIFFICULTY = {
  easy: { name: 'イージー', enemy: 1.0, map: { bosses: true, chests: 'all' }, desc: '敵は今までの強さ。賞金首とすべての宝箱の場所が地図に出る（レアは赤、ふつうは青で点滅）' },
  normal: { name: 'ノーマル', enemy: 1.1, map: { bosses: false, chests: 'found' }, desc: '敵が1.1倍強い。見つけた宝箱が地図に青で点滅する' },
  hard: { name: 'ハード', enemy: 1.5, map: { bosses: false, chests: 'none' }, desc: '敵が1.5倍強い。地図に宝箱の印は出ない' },
};
export const DIFF_ORDER = ['easy', 'normal', 'hard'];
export const difficultyOf = (settings) => DIFFICULTY[settings?.difficulty] || DIFFICULTY.normal;
// レアな宝箱（大きな宝箱・隠し宝箱・マシンや限定品が入っている宝箱）
export const isRareChest = (c) => !!(c.big || c.secret || c.contents?.some((x) => x.machine || x.weapon));
