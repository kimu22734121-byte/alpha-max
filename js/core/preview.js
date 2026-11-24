// 展示台（3Dプレビュー）。ガレージ・装備画面の「変更前／変更後」の比較と、開発者の部屋の調整場所で使い回す
// 画面の上に小さなキャンバスを置き、そこにだけ描く。描画用の WebGL は1つだけ作って使い回す（スマホでも重くならないように）
import * as THREE from 'three';

let renderer = null;
function getRenderer() {
  if (renderer) return renderer;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'stage-canvas';
  return renderer;
}

// container の中に展示台を count 台並べる。戻り値の set(i, obj) で台の上に物を置く
export function createStage(container, { count = 1, labels = [] } = {}) {
  const r = getRenderer();
  container.appendChild(r.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x404858, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 6, 5);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8fd0ff, 1.2);
  rim.position.set(-4, 3, -4);
  scene.add(rim);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
  const gap = 2.4;
  const slots = [];
  const padMat = new THREE.MeshStandardMaterial({ color: 0x3a404a, metalness: 0.5, roughness: 0.4 });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x6ad8ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * gap;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.14, 32), padMat);
    pad.position.set(x, -0.07, 0);
    scene.add(pad);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 40), ringMat.clone());
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.01, 0);
    scene.add(ring);
    const holder = new THREE.Group();
    holder.position.set(x, 0, 0);
    scene.add(holder);
    slots.push({ holder, ring, obj: null, flash: 0 });
  }
  camera.position.set(0, 1.7, 3.6 + count * 1.1);
  const look = new THREE.Vector3(0, 0.75, 0);
  let spin = 0.5, drag = null, auto = true, alive = true;
  const el = r.domElement;
  const down = (e) => { drag = e.clientX; auto = false; el.setPointerCapture?.(e.pointerId); };
  const move = (e) => { if (drag != null) { spin += (e.clientX - drag) * 0.01; drag = e.clientX; } };
  const up = () => { drag = null; };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  const resize = () => {
    const w = container.clientWidth || 300, h = container.clientHeight || 200;
    r.setSize(w, h, false);
    el.style.width = '100%'; el.style.height = '100%';
    camera.aspect = w / h;
    // 横が狭いときは引いて全部入るように
    const need = (count * gap) / 2 + 1.2;
    const dist = Math.max(3.6, need / Math.tan((camera.fov * Math.PI) / 360) / Math.max(0.6, camera.aspect));
    camera.position.set(0, 1.5 + dist * 0.12, dist);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  let last = performance.now();
  const loop = () => {
    if (!alive) return;
    requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (auto) spin += dt * 0.5;
    for (const s of slots) {
      s.holder.rotation.y = spin;
      if (s.flash > 0) { s.flash = Math.max(0, s.flash - dt * 1.8); s.ring.material.opacity = 0.7 + s.flash * 2; s.ring.scale.setScalar(1 + s.flash * 0.6); }
      s.obj?.userData.tick?.(now / 1000);
    }
    camera.lookAt(look);
    r.render(scene, camera);
  };
  loop();

  // 台の上に置く（高さ1.5くらいに大きさをそろえる）
  const fit = (obj, height = 1.5) => {
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const h = Math.max(0.01, box.max.y - box.min.y);
    const k = height / h;
    obj.scale.multiplyScalar(k);
    obj.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(obj);
    obj.position.y -= b2.min.y;
    return obj;
  };
  const api = {
    scene, camera, slots, labels,
    set(i, obj, { height = 1.5 } = {}) {
      const s = slots[i];
      if (s.obj) s.holder.remove(s.obj);
      s.obj = obj;
      if (obj) { obj.position.set(0, 0, 0); obj.rotation.set(0, 0, 0); s.holder.add(fit(obj, height)); }
    },
    flash(i) { slots[i].flash = 1; },
    // パーツが切り替わる演出：光ってから入れ替わる
    async swap(i, obj, opts) {
      const s = slots[i];
      const old = s.obj;
      s.flash = 1;
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xcff4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      glow.position.y = 1.1;
      s.holder.add(glow);
      const t0 = performance.now();
      let base = null;
      await new Promise((res) => {
        const step = () => {
          const k = Math.min(1, (performance.now() - t0) / 700);
          glow.material.opacity = Math.sin(k * Math.PI) * 0.8;
          glow.scale.set(1 + k * 0.3, 1, 1 + k * 0.3);
          if (k >= 0.5 && base == null) { api.set(i, obj, opts); base = obj ? obj.scale.x : 1; }
          if (base != null && obj) obj.scale.setScalar(base * (0.6 + Math.min(1, (k - 0.5) / 0.5) * 0.4));
          if (k < 1) requestAnimationFrame(step); else res();
        };
        step();
      });
      if (obj && base != null) obj.scale.setScalar(base);
      void old;
      s.holder.remove(glow);
      glow.geometry.dispose(); glow.material.dispose();
    },
    dispose() {
      alive = false;
      ro.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.remove();
    },
  };
  return api;
}
