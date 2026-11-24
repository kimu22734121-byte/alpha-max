// 簡単なトゥイーンとタイマー。メインループの update(dt) で進む。
// await を使って演出を順番に書けるようにする。
const tweens = new Set();
// 時間の流れの速さ（必殺技のスローモーションで使う）
export const timeScale = { k: 1 };

export const Ease = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
};

// dur 秒かけて fn(0..1) を呼ぶ
export function tween(dur, fn, ease = Ease.inOut) {
  return new Promise((resolve) => {
    if (dur <= 0) { fn(1); resolve(); return; }
    tweens.add({ t: 0, dur, fn, ease, resolve });
  });
}

// obj の数値プロパティを to の値まで動かす（Vector3 や position にも使える）
export function tweenTo(obj, to, dur, ease = Ease.inOut) {
  const from = {};
  for (const k of Object.keys(to)) from[k] = obj[k];
  return tween(dur, (t) => { for (const k of Object.keys(to)) obj[k] = from[k] + (to[k] - from[k]) * t; }, ease);
}

export function wait(sec) { return tween(sec, () => {}, Ease.linear); }

export function updateTweens(dt) {
  for (const tw of [...tweens]) {
    tw.t += dt;
    const p = Math.min(1, tw.t / tw.dur);
    tw.fn(tw.ease(p));
    if (p >= 1) { tweens.delete(tw); tw.resolve(); }
  }
}

export function clearTweens() {
  for (const tw of tweens) tw.resolve();
  tweens.clear();
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
