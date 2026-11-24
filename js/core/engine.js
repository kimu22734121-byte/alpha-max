// 描画とメインループ。シーンは { scene, camera, update(dt), enter(), exit() } の形
import * as THREE from 'three';
import { updateTweens, timeScale } from './tween.js';

export const engine = {
  renderer: null,
  current: null,
  clock: new THREE.Clock(),
  time: 0,
  listeners: new Set(),

  init(container) {
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(window.innerWidth, window.innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    container.appendChild(r.domElement);
    this.renderer = r;
    window.addEventListener('resize', () => this.resize());
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  },

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    const cam = this.current?.camera;
    if (cam) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
    this.current?.onResize?.(w, h);
  },

  async setScene(sc, ...args) {
    if (this.current?.exit) await this.current.exit();
    this.current = sc;
    if (sc.camera) { sc.camera.aspect = window.innerWidth / window.innerHeight; sc.camera.updateProjectionMatrix(); }
    if (sc.enter) await sc.enter(...args);
  },

  onFrame(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },

  loop() {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05) * timeScale.k;
    this.time += dt;
    updateTweens(dt);
    for (const fn of this.listeners) fn(dt);
    const sc = this.current;
    if (!sc) return;
    sc.update?.(dt);
    if (sc.scene && sc.camera) this.renderer.render(sc.scene, sc.camera);
  },
};
