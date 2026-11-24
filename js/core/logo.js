// タイトルロゴ「ALPHA MAX」＋サブタイトル（タイトル画面とオープニングの最後で使う）
export const SUBTITLE = '星の果て、鋼を駆る者';

export function makeLogo(extraClass = '') {
  const el = document.createElement('div');
  el.className = `logo ${extraClass}`;
  // 金色のきらめき（ランダムな位置でまたたく）
  const sparks = Array.from({ length: 14 }, (_, i) => {
    const x = 4 + Math.random() * 92, y = 10 + Math.random() * 70;
    const d = (Math.random() * 3).toFixed(2), s = (0.6 + Math.random() * 0.9).toFixed(2);
    return `<i class="spark" style="left:${x}%;top:${y}%;animation-delay:${d}s;--s:${s}"></i>`;
  }).join('');
  el.innerHTML = `
    <div class="logo-wrap">
      <div class="logo-glow" aria-hidden="true">ALPHA MAX</div>
      <div class="logo-main">ALPHA MAX</div>
      <div class="logo-shine" aria-hidden="true">ALPHA MAX</div>
      ${sparks}
    </div>
    <div class="logo-sub">${SUBTITLE}</div>`;
  return el;
}
