// 入力：指を置いた所に出るバーチャルスティック／タップ・クリック／キーボード（矢印・S/Z/X/C・Enter・Esc）
// v2.5〜：スマホは画面のどこに指を置いてもスティック（左利きでも使える）、2本指でなぞるとカメラを回す。
//         PC（マウス）は左クリックで歩いていく（v2.6〜）、ドラッグ（右ボタンでも）でカメラを回す、ホイールで上下の角度。キーボードは S＝上・Z＝左・X＝下・C＝右、矢印キーも使える
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

    const touches = () => [...pointers.values()].filter((q) => q.touch);
    layer.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const touch = e.pointerType !== 'mouse';
      const p = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lastX: e.clientX, lastY: e.clientY, t0: performance.now(), moved: false, stick: false, touch, rot: !touch };
      // スマホ：スティックで歩いている間（動かした・少し長く押している）に置いた2本目の指は、それだけでカメラを回す（歩きながら回せる。v2.8）
      const st = this.stick;
      if (touch && st && touches().length === 1 && (st.moved || performance.now() - st.t0 > 250)) {
        p.rot = true; p.solo = true;
      }
      // スマホ：2本の指をほぼ同時に置いたら、スティックをやめて2本指でカメラを回す
      else if (touch && touches().length >= 1) {
        p.rot = true;
        for (const q of touches()) { q.rot = true; q.moved = true; if (q.stick) { q.stick = false; this.stick = null; this.move.x = 0; this.move.y = 0; base.classList.remove('on'); } }
      }
      // スマホ：1本目の指はどこに置いてもスティック（PCのマウスはドラッグでカメラを回す）
      else if (touch && this.enabled && !this.stick) {
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
      // カメラを回す：スマホは2本指（2本の動きの平均）、PCはマウスのドラッグ
      if (p.rot && p.moved) { const k = p.touch && !p.solo ? 0.5 : 1; this.emit('swipe', { dx: (e.clientX - p.lastX) * k, dy: (e.clientY - p.lastY) * k }); }
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
      if (!p.moved && performance.now() - p.t0 < 350 && (p.touch || e.button === 0)) this.emit('tap', { x: e.clientX, y: e.clientY, mouse: !p.touch });
    };
    layer.addEventListener('pointerup', end);
    // マウス：右クリックのメニューを出さない（右ドラッグでカメラを回すため）、ホイールで上下の角度
    layer.addEventListener('contextmenu', (e) => e.preventDefault());
    layer.addEventListener('wheel', (e) => { e.preventDefault(); this.emit('swipe', { dx: 0, dy: e.deltaY * 0.35 }); }, { passive: false });
    layer.addEventListener('pointercancel', end);

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      keys.add(e.key);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      this.emit('key', e);
      if (!e.repeat) {
        if (['Enter', ' '].includes(e.key)) this.emit('action');
        if (['Escape', 'm', 'M'].includes(e.key)) this.emit('menu');
      }
    });
    window.addEventListener('keyup', (e) => keys.delete(e.key));
    window.addEventListener('blur', () => keys.clear());
  },

  isDown(k) { return keys.has(k); },
  // ダッシュ中か（ダッシュボタンがオン、または Shift を押している）
  dashOn: false,
  get dashing() { return this.dashOn || keys.has('Shift'); },
  // キーボードとスティックをまとめた移動量
  getMove() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = this.move.x, y = this.move.y;
    // S＝上・Z＝左・X＝下・C＝右（v2.5〜）。矢印キーも使える
    const any = (...ks) => ks.some((k) => keys.has(k));
    if (any('ArrowLeft', 'z', 'Z')) x -= 1;
    if (any('ArrowRight', 'c', 'C')) x += 1;
    if (any('ArrowUp', 's', 'S')) y -= 1;
    if (any('ArrowDown', 'x', 'X')) y += 1;
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
