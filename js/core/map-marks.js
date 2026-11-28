// ちず・ミニ地図の宝箱と賞金首の印（むずかしさで変わる。v2.0〜）
//  イージー：歩いていなくても、賞金首（赤）と全部の宝箱（レア＝赤で少し大きく点滅、ふつう＝青で点滅）
//  ノーマル：見つけた（歩いた所の）宝箱が青で点滅。賞金首は見つけた所だけ
//  ハード：宝箱・賞金首の印は出さない
//  開けた宝箱は点滅をやめて、色はそのまま。クリアした章の地図（revealed）はどのむずかしさでも全部出す
import { difficultyOf, isRareChest } from '../data/difficulty.js';

const PURPLE = '#c45aff'; // 手配書の賞金首は紫で点滅（v2.3）
const RED = '#ff3a4a', BLUE = '#4aa8ff', GOLD = '#ffcc33', GREY = '#5a5a5a';

// seen(x, y)：その場所を見つけているか。revealed：クリアした章のマップ
export function mapMarks(map, G, settings, { seen, revealed }) {
  const d = difficultyOf(settings).map;
  const out = { chests: [], bosses: [] };
  for (const c of map.chests || []) {
    const opened = !!G.flags.opened?.[`${map.id}:${c.id}`];
    const rare = isRareChest(c);
    const found = revealed || seen(c.x, c.y);
    if (d.chests === 'all') out.chests.push({ x: c.x, y: c.y, color: rare ? RED : BLUE, size: rare ? 1.5 : 1, blink: !opened });
    else if (d.chests === 'found' && found) out.chests.push({ x: c.x, y: c.y, color: BLUE, size: 1, blink: !opened });
    else if (revealed) out.chests.push({ x: c.x, y: c.y, color: opened ? GREY : GOLD, size: 1, blink: false });
  }
  for (const s of map.symbols || []) {
    if (s.bounty ? G.bounties[s.bounty] : G.flags[s.flag]) continue; // 倒した
    const show = revealed || (d.bosses && s.bounty) || (d.chests !== 'none' && seen(s.x, s.y));
    if (show) out.bosses.push({ x: s.x, y: s.y, bounty: !!s.bounty, color: s.bounty ? PURPLE : '#ff3a2a', blink: !!s.bounty });
  }
  return out;
}
// 点滅の明るさ（0.25〜1）
export const blinkAlpha = (t) => 0.25 + 0.75 * Math.abs(Math.sin(t * 4));
