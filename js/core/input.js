// 入力：指を置いた所に出るバーチャルスティック／タップ／キーボード（矢印・WASD・Enter・Esc）
const listeners = {};
const keys = new Set();
export const STICK_ZONE = 0.5; // 画面の左からこの割合までがスティック。右側はカメラのスワイプ

export const input = {
  move: { x: 0, y: 0 }, // -1..1（y は画面の下方向が +）
  enabled: false, // フィールドで動ける状態か
  stick: null,

  on(ev, fn) { (listeners[ev] ||= new Set()).add(fn); return () => listeners[ev].delete(fn); },
  emit(ev, data) { for (const fn of listeners[ev] || []) fn(data); },

  init(layer) {
    this.layer = layer;
    const base = document.createElement('div'); base.className = 'stick-base';
    const knob = document.createElement('div'); knob.className = 'stick-knob';
    base.appendChild(knob); layer.appendChild(base);
    this.stickEl = base; this.knobEl = knob;
    const pointers = new Map();
    const R = 56;

    layer.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const p = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lastX: e.clientX, lastY: e.clientY, t0: performance.now(), moved: false, stick: false };
      // 画面の左半分で置いた指はスティックになる（右半分はカメラのスワイプ・タップ用）
      if (this.enabled && !this.stick && e.clientX < window.innerWidth * STICK_ZONE) {
        p.stick = true;
        this.stick = p;
        base.style.left = `${e.clientX}px`; base.style.top = `${e.clientY}px`;
        base.classList.add('on');
        knob.style.transform = 'translate(-50%,-50%)';
      }
      pointers.set(e.pointerId, p);
      try { layer.setPointerCapture(e.pointerId); } catch { /* 無視 */ }
    });
    layer.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x0, dy = e.clientY - p.y0;
      if (Math.hypot(dx, dy) > 12) p.moved = true;
      // スティックではない指（画面の右側）を横に動かすと「スワイプ」（フィールドのカメラを回す）
      if (!p.stick && p.moved) { this.emit('swipe', { dx: e.clientX - p.lastX, dy: e.clientY - p.lastY }); }
      p.lastX = e.clientX; p.lastY = e.clientY;
      if (p.stick) {
        const len = Math.hypot(dx, dy);
        const k = len > R ? R / len : 1;
        knob.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
        const mag = Math.min(1, len / R);
        const dead = 0.18;
        if (mag < dead) { this.move.x = 0; this.move.y = 0; } else {
          const s = (mag - dead) / (1 - dead) / (len || 1);
          this.move.x = dx * s; this.move.y = dy * s;
        }
      }
    });
    const end = (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      pointers.delete(e.pointerId);
      if (p.stick) {
        this.stick = null; this.move.x = 0; this.move.y = 0;
        base.classList.remove('on');
      }
      if (!p.moved && performance.now() - p.t0 < 350) this.emit('tap', { x: e.clientX, y: e.clientY });
    };
    layer.addEventListener('pointerup', end);
    layer.addEventListener('pointercancel', end);

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      keys.add(e.key);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      this.emit('key', e);
      if (!e.repeat) {
        if (['Enter', ' ', 'z', 'Z'].includes(e.key)) this.emit('action');
        if (['Escape', 'x', 'X', 'm', 'M'].includes(e.key)) this.emit('menu');
      }
    });
    window.addEventListener('keyup', (e) => keys.delete(e.key));
    window.addEventListener('blur', () => keys.clear());
  },

  isDown(k) { return keys.has(k); },
  // キーボードとスティックをまとめた移動量
  getMove() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = this.move.x, y = this.move.y;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) x += 1;
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  },

  setEnabled(v) {
    this.enabled = v;
    if (!v) {
      this.move.x = 0; this.move.y = 0; this.stick = null;
      this.stickEl?.classList.remove('on');
    }
  },
};
