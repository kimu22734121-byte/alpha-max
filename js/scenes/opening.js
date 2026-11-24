// オープニング：宇宙の星空 → 廃墟の惑星へ降下 → 辺境コロニーで主人公が壊れたロボットを見つける
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { tween, wait, Ease, rand } from '../core/tween.js';
import { getModel, setGlow, disposeObject } from '../core/assets.js';
import { buildMachineModel, animateChar } from '../models/mech.js';
import { MACHINES } from '../data/machines.js';
import { input } from '../core/input.js';

function planetTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#9a6a3e'; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${120 + rand(0, 60)},${80 + rand(0, 40)},${40 + rand(0, 30)},0.35)`; g.fillRect(0, rand(0, 512), 1024, rand(6, 30)); }
  for (let i = 0; i < 160; i++) {
    const x = rand(0, 1024), y = rand(40, 472), r = rand(3, 22);
    g.fillStyle = 'rgba(60,36,20,0.45)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = 'rgba(210,170,120,0.35)'; g.beginPath(); g.arc(x - r * 0.2, y - r * 0.2, r * 0.7, 0, 7); g.fill();
  }
  for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(250,235,210,0.18)'; g.beginPath(); g.ellipse(rand(0, 1024), rand(0, 512), rand(40, 140), rand(6, 16), 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class OpeningScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
  }

  async enter(onDone) {
    this.done = false;
    this.onDone = onDone;
    this.sub = document.createElement('div');
    this.sub.className = 'op-sub';
    document.body.appendChild(this.sub);
    this.skip = document.createElement('button');
    this.skip.className = 'op-skip';
    this.skip.textContent = 'スキップ ▶▶';
    this.skip.addEventListener('click', (e) => { e.stopPropagation(); this.finish(); });
    document.body.appendChild(this.skip);
    this.offKey = input.on('action', () => this.finish());
    this.offTap = input.on('tap', () => { if ((this.t || 0) > 1) this.finish(); });
    audio.playSong('title', { restart: true });
    this.play();
  }

  async exit() {
    this.sub.remove(); this.skip.remove(); this.offKey?.(); this.offTap?.();
    for (const o of [...this.scene.children]) { this.scene.remove(o); disposeObject(o); }
  }

  say(text) {
    this.sub.classList.remove('in');
    setTimeout(() => { this.sub.textContent = text; this.sub.classList.add('in'); }, 250);
  }

  finish() {
    if (this.done) return;
    this.done = true;
    const fade = document.querySelector('.fade');
    fade.style.transitionDuration = '0.5s'; fade.style.background = '#000'; fade.style.opacity = '1';
    setTimeout(() => this.onDone?.(), 550);
  }

  update(dt) {
    this.t = (this.t || 0) + dt;
    if (this.planet) this.planet.rotation.y += dt * 0.03;
    if (this.ren && this.renWalk) animateChar(this.ren, this.t, this.renWalk);
    if (this.look) this.camera.lookAt(this.look);
  }

  async play() {
    const s = this.scene;
    const fade = document.querySelector('.fade');
    // ---- 宇宙 ----
    s.background = new THREE.Color(0x02030a);
    const starGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i < 3000; i++) { const v = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(800, 2000)); pts.push(v.x, v.y, v.z); }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false }));
    s.add(stars);
    const planet = new THREE.Mesh(new THREE.SphereGeometry(100, 64, 32), new THREE.MeshStandardMaterial({ map: planetTexture(), roughness: 1 }));
    s.add(planet);
    this.planet = planet;
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(104, 48, 24), new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.35, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.add(atmo);
    const sunL = new THREE.DirectionalLight(0xfff0e0, 2.5); sunL.position.set(-300, 120, 200); s.add(sunL);
    s.add(new THREE.AmbientLight(0x404060, 0.4));
    this.camera.position.set(80, 60, 520);
    this.look = new THREE.Vector3(0, 0, 0);
    fade.style.transitionDuration = '1.2s'; fade.style.opacity = '0';
    this.say('はるか未来。人類は宇宙のすみずみまで広がり……そして、忘れられた星もあった。');
    await tween(5, (k) => { this.camera.position.set(80 - k * 60, 60 - k * 40, 520 - k * 330); }, Ease.inOut);
    if (this.done) return;
    this.say('辺境の惑星「ガラン」。荒野と廃墟だけが広がる、土の星。');
    await tween(3, (k) => { this.camera.position.set(20 - k * 10, 20 - k * 5, 190 - k * 75); this.look.set(0, 0, 0); }, Ease.in);
    if (this.done) return;
    fade.style.transitionDuration = '0.4s'; fade.style.background = '#ffd9a0'; fade.style.opacity = '1';
    await wait(0.45);
    if (this.done) return;
    // ---- コロニーの外れ ----
    for (const o of [...s.children]) { s.remove(o); disposeObject(o); }
    this.planet = null;
    s.background = new THREE.Color(0xd8a070);
    s.fog = new THREE.Fog(0xd8a070, 20, 90);
    s.add(new THREE.HemisphereLight(0xfff0d8, 0x6a4a30, 1.0));
    const sun = new THREE.DirectionalLight(0xffe0b0, 2.2); sun.position.set(-10, 14, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
    s.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0xb48a58, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    // 遠くのドーム
    const dome = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9ac8e8, transparent: true, opacity: 0.45, metalness: 0.4, roughness: 0.2 }));
    dome.position.set(-30, 0, -55); s.add(dome);
    // がらくたの山
    const junkMat = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, flatShading: true });
    const junkMat2 = new THREE.MeshStandardMaterial({ color: 0x5a6068, flatShading: true, metalness: 0.5 });
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(i % 3 ? new THREE.BoxGeometry(rand(0.5, 2), rand(0.4, 1.4), rand(0.5, 2)) : new THREE.CylinderGeometry(0.3, 0.3, rand(1, 3), 6), i % 2 ? junkMat : junkMat2);
      const a = rand(0, Math.PI * 2), r = rand(3, 14);
      m.position.set(Math.cos(a) * r, rand(0, 0.4), Math.sin(a) * r - 2);
      if (m.position.z > 0 && m.position.x > -2) continue; // カメラの通り道は空けておく
      m.rotation.set(rand(0, 1), rand(0, 3), rand(0, 1));
      m.castShadow = true; s.add(m);
    }
    // 壊れたアルファ
    const def = MACHINES.alpha;
    const alpha = buildMachineModel({ parts: def.parts, colors: def.brokenColors, weapons: [], glow: 0.0 });
    alpha.position.set(0, -0.35, -3);
    alpha.rotation.set(0.12, 0.5, 0.18);
    s.add(alpha);
    const ren = getModel('ren');
    ren.scale.setScalar(1.0);
    ren.position.set(6, 0, 4);
    ren.rotation.y = -2.2;
    s.add(ren);
    this.ren = ren;
    this.renWalk = 1;
    this.camera.position.set(9, 2.2, 9);
    this.look = new THREE.Vector3(3, 1, 1);
    fade.style.transitionDuration = '0.8s'; fade.style.opacity = '0';
    this.say('コロニーのはずれ、がらくたの山。修理屋のレンは、今日も部品を探していた。');
    await tween(3.2, (k) => {
      ren.position.set(6 - k * 4.2, 0, 4 - k * 4.4);
      this.camera.position.set(9 - k * 3, 2.2 + k * 0.6, 9 - k * 2);
      this.look.set(ren.position.x - 1, 1, ren.position.z - 1);
    }, Ease.linear);
    if (this.done) return;
    this.renWalk = 0;
    this.say('「……なんだ、これ？ ロボット……？」');
    await tween(1.8, (k) => { this.camera.position.set(6 - k * 3.5, 2.8 - k * 0.6, 7 - k * 2); this.look.set(0, 1.4 + k * 0.4, -3); }, Ease.inOut);
    if (this.done) return;
    await wait(0.8);
    if (this.done) return;
    this.say('そのとき――錆びついた機体の奥で、何かが光った。');
    audio.sfx('charge');
    await tween(1.6, (k) => { setGlow(alpha, k * 3); }, Ease.in);
    if (this.done) return;
    await tween(1.2, (k) => { this.camera.position.set(2.5 - k * 1.5, 2.2 + k * 2, 5 + k * 5); this.look.set(0, 1.6, -3); }, Ease.inOut);
    if (this.done) return;
    await wait(0.6);
    this.finish();
  }
}
