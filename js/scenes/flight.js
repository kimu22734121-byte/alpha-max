// 宇宙船で次の惑星へ飛ぶ演出（第1章 → 第2章など）
// 星空の中、出発した惑星が後ろに遠ざかり、行き先の惑星が近づいてくる。スキップできる
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { tween, wait, Ease, rand } from '../core/tween.js';
import { disposeObject } from '../core/assets.js';
import { input } from '../core/input.js';
import { buildStruct } from './world-objects.js';

// 惑星の見た目（色の帯と雲）。PLANET_LOOK に足せば、先の章の惑星も同じ演出で飛べる
export const PLANET_LOOK = {
  earth: { base: '#9a6a3e', bands: [[120, 80, 40], [170, 120, 70]], spots: 'rgba(60,36,20,0.45)', clouds: 0.18, atmo: 0xffc890 },
  water: { base: '#1a5aa8', bands: [[30, 90, 170], [40, 120, 200], [20, 70, 140]], spots: 'rgba(230,210,150,0.55)', clouds: 0.4, atmo: 0x9adcff },
  fire: { base: '#3a1a10', bands: [[200, 70, 20], [120, 40, 20], [240, 120, 40]], spots: 'rgba(255,140,40,0.6)', clouds: 0.12, atmo: 0xff8a4a },
  light: { base: '#f0e4c0', bands: [[255, 240, 200], [220, 200, 150], [200, 220, 240]], spots: 'rgba(255,255,255,0.5)', clouds: 0.35, atmo: 0xfff0b0 },
  dark: { base: '#14101e', bands: [[40, 30, 60], [60, 40, 90], [20, 16, 30]], spots: 'rgba(140,110,255,0.4)', clouds: 0.1, atmo: 0x7a5aff },
  core: { base: '#3a0a2a', bands: [[120, 30, 90], [80, 10, 60], [200, 60, 160]], spots: 'rgba(255,80,210,0.5)', clouds: 0.15, atmo: 0xff4ad0 },
  wind: { base: '#4a8ac8', bands: [[90, 160, 90], [120, 190, 110], [70, 130, 190]], spots: 'rgba(60,120,60,0.5)', clouds: 0.55, atmo: 0xbfe8ff },
};
function planetTexture(look) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = look.base; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 40; i++) { const b = look.bands[i % look.bands.length]; g.fillStyle = `rgba(${b[0] + rand(-20, 20)},${b[1] + rand(-20, 20)},${b[2] + rand(-20, 20)},0.4)`; g.fillRect(0, rand(0, 512), 1024, rand(6, 30)); }
  for (let i = 0; i < 120; i++) { const x = rand(0, 1024), y = rand(40, 472), r = rand(4, 26); g.fillStyle = look.spots; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${look.clouds})`; g.beginPath(); g.ellipse(rand(0, 1024), rand(0, 512), rand(40, 160), rand(5, 16), 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function makePlanet(kind, r) {
  const look = PLANET_LOOK[kind] || PLANET_LOOK.earth;
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), new THREE.MeshStandardMaterial({ map: planetTexture(look), roughness: 1 })));
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.04, 48, 32), new THREE.MeshBasicMaterial({ color: look.atmo, transparent: true, opacity: 0.18, side: THREE.BackSide })));
  return grp;
}

export class FlightScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 6000);
  }

  async enter({ from = 'earth', to = 'wind', lines = [], onDone }) {
    this.done = false; this.onDone = onDone; this.t = 0;
    this.sub = document.createElement('div'); this.sub.className = 'op-sub'; document.body.appendChild(this.sub);
    this.skip = document.createElement('button'); this.skip.className = 'op-skip'; this.skip.textContent = 'スキップ ▶▶';
    this.skip.addEventListener('click', (e) => { e.stopPropagation(); this.finish(); });
    document.body.appendChild(this.skip);
    this.offKey = input.on('action', () => this.finish());
    audio.playSong('opening', { restart: true });
    this.play(from, to, lines);
  }

  async exit() {
    this.sub.remove(); this.skip.remove(); this.offKey?.();
    for (const o of [...this.scene.children]) { this.scene.remove(o); disposeObject(o); }
  }

  say(text) { this.sub.classList.remove('in'); setTimeout(() => { this.sub.textContent = text; this.sub.classList.add('in'); }, 250); }

  finish() {
    if (this.done) return;
    this.done = true;
    const fade = document.querySelector('.fade');
    fade.style.transitionDuration = '0.5s'; fade.style.background = '#000'; fade.style.opacity = '1';
    setTimeout(() => this.onDone?.(), 550);
  }

  update(dt) {
    this.t += dt;
    if (this.p1) this.p1.rotation.y += dt * 0.05;
    if (this.p2) this.p2.rotation.y += dt * 0.04;
    if (this.ship) { this.ship.position.y = Math.sin(this.t * 1.3) * 0.15; this.ship.rotation.z = Math.sin(this.t * 0.8) * 0.06; }
    // 流れる星（光の筋）
    for (const s of this.streaks || []) { s.position.z += dt * 260; if (s.position.z > 40) s.position.z -= 600; }
    if (this.look) this.camera.lookAt(this.look);
  }

  async play(from, to, lines) {
    const s = this.scene;
    const fade = document.querySelector('.fade');
    s.background = new THREE.Color(0x02030a);
    const pts = [];
    for (let i = 0; i < 2500; i++) { const v = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(900, 2500)); pts.push(v.x, v.y, v.z); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    s.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false })));
    s.add(new THREE.AmbientLight(0x8090b0, 1.0));
    const fill = new THREE.DirectionalLight(0xdfe8ff, 1.8); fill.position.set(80, 60, 160); s.add(fill);
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.4); sun.position.set(-200, 120, 160); s.add(sun);
    // 出発した惑星（後ろ）と行き先の惑星（前）
    this.p1 = makePlanet(from, 60); this.p1.position.set(45, -75, -40); s.add(this.p1);
    this.p2 = makePlanet(to, 90); this.p2.position.set(-60, -40, -1400); s.add(this.p2);
    // 宇宙船（機首が -z ＝行き先を向く）
    const ship = buildStruct('shuttle');
    ship.rotation.y = Math.PI; ship.position.set(0, 0, 0);
    this.ship = new THREE.Group(); this.ship.add(ship); s.add(this.ship);
    const glow = new THREE.PointLight(0xff9a4a, 30, 12); glow.position.set(0, 1.3, 4.5); this.ship.add(glow);
    // 光の筋
    this.streaks = [];
    const stg = new THREE.BoxGeometry(0.04, 0.04, 6);
    for (let i = 0; i < 80; i++) { const m = new THREE.Mesh(stg, new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.5 })); m.position.set(rand(-30, 30), rand(-20, 20), rand(-560, 40)); m.visible = false; s.add(m); this.streaks.push(m); }
    // カメラ：船の後ろ → 横に回り込む → 前の惑星へ
    this.camera.position.set(4, 3, 14); this.look = new THREE.Vector3(0, 1, 0);
    fade.style.transitionDuration = '1s'; fade.style.opacity = '0';
    const L = lines.length ? lines : ['宇宙船は土の惑星を飛び立った。', '目指すは、星図に浮かんだ次の惑星――。'];
    this.say(L[0]);
    audio.sfx('teleport');
    await tween(3.2, (k) => { this.camera.position.set(4 + k * 6, 3 + k * 1, 14 - k * 10); this.p1.position.z = -40 + k * 260; this.p1.position.y = -75 - k * 30; }, Ease.inOut);
    if (this.done) return;
    for (const m of this.streaks) m.visible = true;
    if (L[1]) this.say(L[1]);
    await tween(3.0, (k) => { this.camera.position.set(10 - k * 4, 4 - k * 1.5, 4 - k * 12); this.look.set(0, 1, -k * 20); this.p2.position.z = -1400 + k * 700; }, Ease.inOut);
    if (this.done) return;
    for (const m of this.streaks) m.visible = false;
    if (L[2]) this.say(L[2]);
    await tween(3.2, (k) => { this.p2.position.z = -700 + k * 520; this.p2.position.y = -40 - k * 40; this.ship.position.z = -k * 30; this.look.set(-k * 10, 1 - k * 8, -20 - k * 80); }, Ease.inOut);
    if (this.done) return;
    await wait(0.6);
    this.finish();
  }
}
