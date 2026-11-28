// 家に帰ったときのエンディング（v2.1〜。約3分）
// マザーコアを倒したあと、ラストヘイヴンのレンの修理屋に帰ると流れる。
//  1. 夕焼けのラストヘイヴン：三機と三人が帰ってくる（約45秒）
//  2. 六つの星のその後（約60秒）
//  3. スタッフロール：星の海を三機が飛ぶ（約60秒）
//  4. 夜のラストヘイヴン：「ただいま」→ ALPHA MAX（約20秒）
// スキップできる。終わると修理屋の中にもどる（クリア後もそのまま遊べる）
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { tween, wait, Ease, rand } from '../core/tween.js';
import { disposeObject } from '../core/assets.js';
import { input } from '../core/input.js';
import { G } from '../game/state.js';
import { MACHINES } from '../data/machines.js';
import { buildMachineModel, animateMachine, animateChar } from '../models/mech.js';
import { buildCharModel } from '../models/char-look.js';
import { buildStruct } from './world-objects.js';
import { machineSpec } from './world.js';
import { makePlanet } from './flight.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// スタッフロール（名前はすべてこのゲームのもの）
const CREDITS = [
  ['ALPHA MAX', '星の果て、鋼を駆る者'],
  ['登場人物', 'メカニック　{ren}', 'パイロット　{shion}', '傭兵　{gina}'],
  ['三機の兄弟機', 'アルファマックス', 'オメガマックス', 'ガイアマックス'],
  ['旅の仲間', '宇宙船の船長　キール', 'ドームの整備長　マリン', '酒場のマスターたち', '各地のガレージの整備士たち'],
  ['立ちはだかった者たち', 'グラインドタイタン', 'コアガーディアン', 'アビスリヴァイア', '炎帝イグニス', 'ルクス・ガーディアン', 'アンブラキング', 'マザーコア'],
  ['めぐった星', '土の惑星　ガラン荒野', '風の惑星　疾風高原', '水の惑星　蒼海諸島', '火の惑星　灼熱の大地', '光の惑星　白光の遺跡原', '闇の惑星　常夜の荒野', 'マザーコアの世界　虹の深淵'],
  ['原案・企画', 'このゲームを考えたあなた'],
  ['プログラム・3D・音楽', 'Claude Code'],
  ['使わせてもらったもの', '3D：three.js', '楽器の音：FluidR3_GM（CC BY 3.0）'],
  ['そして', '遊んでくれた、あなたへ'],
];

// 六つの星のその後
const PLANETS = [
  ['earth', '土の星では、ガラン荒野に緑の芽が出はじめた。坑道の町グレイロックは、今日もにぎやかだ。'],
  ['wind', '風の星の風車は、やわらかな風を受けてゆっくり回る。空の島々を、飛行船がのんびり渡っていく。'],
  ['water', '水の星の海は、どこまでも青い。沈んだ都市には、魚たちが帰ってきた。'],
  ['fire', '火の星の溶岩は静かに冷え、溶鉱炉の町では、新しいマシンが生まれている。'],
  ['light', '光の星の遺跡は、帰ってきた星の光を受けて、いっそう白く輝いている。'],
  ['dark', 'そして闇の星にも――はじめての朝が来た。ランタンの灯は、今は窓辺でそっと揺れている。'],
];

export class EndingScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 6000);
  }

  async enter({ onDone }) {
    this.done = false; this.onDone = onDone; this.t = 0; this.anim = []; this.machines = []; this.chars = [];
    this.sub = document.createElement('div'); this.sub.className = 'op-sub ending-sub'; document.body.appendChild(this.sub);
    this.roll = document.createElement('div'); this.roll.className = 'ending-roll'; document.body.appendChild(this.roll);
    this.skip = document.createElement('button'); this.skip.className = 'op-skip'; this.skip.textContent = 'スキップ ▶▶';
    this.skip.addEventListener('click', (e) => { e.stopPropagation(); this.finish(); });
    document.body.appendChild(this.skip);
    audio.playSong('ending', { restart: true });
    this.play();
  }

  async exit() {
    this.sub.remove(); this.roll.remove(); this.skip.remove();
    this.clear();
  }

  clear() {
    this.anim = []; this.machines = []; this.chars = []; this.planet = null;
    for (const o of [...this.scene.children]) { this.scene.remove(o); disposeObject(o); }
  }

  say(text) { this.sub.classList.remove('in'); setTimeout(() => { if (!this.done) { this.sub.innerHTML = text; this.sub.classList.add('in'); } }, 300); }
  hush() { this.sub.classList.remove('in'); }

  finish() {
    if (this.done) return;
    this.done = true;
    const fade = document.querySelector('.fade');
    fade.style.transitionDuration = '0.8s'; fade.style.background = '#000'; fade.style.opacity = '1';
    setTimeout(() => this.onDone?.(), 900);
  }

  update(dt) {
    this.t += dt;
    for (const m of this.machines || []) animateMachine(m, this.t, m.userData.walk || 0);
    for (const c of this.chars || []) animateChar(c, this.t, c.userData.walk || 0);
    for (const f of this.anim) f(dt, this.t);
    if (this.planet) this.planet.rotation.y += dt * 0.08;
    if (this.look) this.camera.lookAt(this.look);
  }

  // 三機（持っていなければ見た目だけ作る）
  machine(type) {
    const mc = G.machines[type];
    const def = MACHINES[type];
    const base = mc ? machineSpec(mc) : { parts: def.parts, colors: { ...def.colors, ...(def.maxForm?.colors || {}) }, weapons: [], sealStage: type === 'alpha' ? 4 : 0, stellaStage: type === 'alpha' ? 5 : 0 };
    const obj = buildMachineModel({ ...base, sealStage: type === 'alpha' ? 4 : base.sealStage, glow: type === 'alpha' ? MACHINES.alpha.seal[4].glow : MACHINES[type].maxForm?.glow, maxForm: type !== 'alpha', wingSpread: type === 'alpha' ? true : undefined });
    this.machines.push(obj);
    return obj;
  }

  addStars(n = 2500, near = 600) {
    const pts = [];
    for (let i = 0; i < n; i++) { const v = V(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(near, near * 3)); pts.push(v.x, v.y, v.z); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.9 }));
    this.scene.add(p);
    return p;
  }

  // 1. 夕焼けのラストヘイヴン
  async homecoming() {
    const s = this.scene, r = G.members.ren.name, sh = G.members.shion.name, gi = G.members.gina.name;
    s.background = new THREE.Color(0xe8905a);
    s.fog = new THREE.Fog(0xe8a070, 30, 110);
    s.add(new THREE.HemisphereLight(0xffd0a0, 0x6a3a2a, 1.2));
    const sun = new THREE.DirectionalLight(0xffb070, 2.4); sun.position.set(-30, 18, -20); s.add(sun);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 48), new THREE.MeshStandardMaterial({ color: 0xc89060, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; s.add(ground);
    // 夕日
    const disc = new THREE.Mesh(new THREE.CircleGeometry(9, 40), new THREE.MeshBasicMaterial({ color: 0xffe0a0, fog: false }));
    disc.position.set(-60, 14, -120); s.add(disc);
    // ラストヘイヴンのドーム（町の外観）を大きく
    const dome = buildStruct('dome');
    if (dome) { dome.scale.setScalar(4.2); dome.position.set(0, 0, -26); s.add(dome); }
    // 岩
    for (let i = 0; i < 26; i++) {
      const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.6, 2.2), 0), new THREE.MeshStandardMaterial({ color: 0x8a6442, flatShading: true }));
      const a = rand(0, Math.PI * 2), d = rand(18, 70); rk.position.set(Math.cos(a) * d, 0.3, Math.sin(a) * d - 10); s.add(rk);
    }
    // 三機と三人（左から歩いてくる）
    const order = [['omega', -4.2], ['alpha', 0], ['gaia', 4.2]];
    const ms = order.map(([type, x]) => { const o = this.machine(type); o.position.set(x - 30, 0, 6); o.rotation.y = Math.PI / 2; o.userData.walk = 1; s.add(o); return [o, x]; });
    this.chars = ['ren', 'shion', 'gina'].map((id, i) => { const c = buildCharModel(G.members[id]); c.scale.setScalar(0.9); c.position.set(-2 + i * 2 - 26, 0, 10.5); c.rotation.y = Math.PI / 2; c.userData.walk = 1; s.add(c); return c; });
    this.camera.position.set(14, 4.5, 22); this.look = V(0, 2.5, 4);
    document.querySelector('.fade').style.transitionDuration = '1.5s';
    document.querySelector('.fade').style.opacity = '0';
    this.say('――マザーコアとの戦いから、しばらくして。');
    await tween(10, (k) => {
      for (const [o, x] of ms) o.position.x = x - 30 + k * 30;
      this.chars.forEach((c, i) => { c.position.x = -2 + i * 2 - 26 + k * 26; });
      this.camera.position.set(14 - k * 8, 4.5 - k * 1, 22 - k * 4);
    }, Ease.out);
    if (this.done) return;
    for (const [o] of ms) { o.userData.walk = 0; tween(1, (k) => { o.rotation.y = Math.PI / 2 * (1 - k); }); }
    for (const c of this.chars) { c.userData.walk = 0; tween(1, (k) => { c.rotation.y = Math.PI / 2 * (1 - k); }); }
    this.say('夕焼けのラストヘイヴンに、白と黒と深紅の三機が帰ってきた。');
    await wait(6); if (this.done) return;
    this.say(`${r}「……ただいま、ラストヘイヴン！」`);
    await tween(6, (k) => { this.camera.position.set(6 - k * 6, 3.5 + k * 1.5, 18 + k * 6); this.look.set(0, 2.5 + k * 0.5, 4); }, Ease.inOut);
    if (this.done) return;
    this.say('町の人たちがドームから飛び出してきた。整備長マリンは、油まみれの手で三人を抱きしめた。');
    await wait(6); if (this.done) return;
    this.say(`${sh}「……悪くない。帰る場所があるというのは」`);
    await wait(5); if (this.done) return;
    this.say(`${gi}「さあ、今夜は宴会だよ！ 賞金は全部、酒場のツケに回しな！」`);
    await tween(6, (k) => { this.camera.position.set(-k * 10, 5 + k * 3, 24 + k * 4); this.look.set(0, 3, 0); }, Ease.inOut);
    if (this.done) return;
    this.hush();
    await wait(1);
  }

  // 2. 六つの星のその後
  async planets() {
    const s = this.scene;
    for (const [kind, text] of PLANETS) {
      if (this.done) return;
      await this.fadeTo(1, 0.6);
      this.clear();
      s.background = new THREE.Color(0x02030a); s.fog = null;
      this.addStars();
      s.add(new THREE.AmbientLight(0x8090b0, 0.9));
      const sun = new THREE.DirectionalLight(0xfff4e0, 2.6); sun.position.set(-200, 120, 160); s.add(sun);
      this.planet = makePlanet(kind, 60);
      this.planet.position.set(18, 0, -40); s.add(this.planet);
      this.camera.position.set(0, 0, 120); this.look = V(10, 0, -40);
      await this.fadeTo(0, 0.6);
      this.say(text);
      await tween(8.5, (k) => { this.camera.position.set(-k * 10, k * 6, 120 - k * 30); }, Ease.inOut);
    }
    this.hush();
  }

  // 3. スタッフロール：星の海を三機が飛ぶ
  async credits() {
    const s = this.scene;
    await this.fadeTo(1, 0.8);
    this.clear();
    s.background = new THREE.Color(0x03040c); s.fog = null;
    const st = this.addStars(3000, 300);
    s.add(new THREE.HemisphereLight(0xbfd8ff, 0x202040, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(10, 20, 15); s.add(key);
    // 三機が並んで飛ぶ
    const trio = [['alpha', 0, 0], ['omega', -6, -3], ['gaia', 6, -3]].map(([type, x, z]) => { const o = this.machine(type); o.position.set(x, 0, z); s.add(o); return [o, x, z]; });
    // 流れる光の筋
    const streaks = [];
    const sg = new THREE.BoxGeometry(0.05, 0.05, 8);
    for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.45 })); m.position.set(rand(-40, 40), rand(-25, 25), rand(-300, 40)); s.add(m); streaks.push(m); }
    this.anim.push((dt, t) => {
      for (const m of streaks) { m.position.z += dt * 120; if (m.position.z > 40) m.position.z -= 340; }
      trio.forEach(([o, x, z], i) => { o.position.y = Math.sin(t * 1.2 + i) * 0.6; o.position.x = x + Math.sin(t * 0.5 + i * 2) * 0.8; o.rotation.z = Math.sin(t * 0.8 + i) * 0.12; });
      st.rotation.z += dt * 0.01;
    });
    this.camera.position.set(-6, 3, 16); this.look = V(0, 1.5, -2);
    await this.fadeTo(0, 0.8);
    // 名前を下から上へ流す
    const names = { ren: G.members.ren.name, shion: G.members.shion.name, gina: G.members.gina.name };
    this.roll.innerHTML = `<div class="roll-inner">${CREDITS.map(([head, ...rows]) => `<div class="roll-sec"><div class="roll-head">${head}</div>${rows.map((r) => `<div class="roll-row">${r.replace(/\{(\w+)\}/g, (m, k) => names[k] || m)}</div>`).join('')}</div>`).join('')}</div>`;
    this.roll.classList.add('on');
    const inner = this.roll.firstChild;
    const H = inner.offsetHeight, vh = window.innerHeight;
    const dur = 58;
    await tween(dur, (k) => {
      inner.style.transform = `translateY(${vh - k * (H + vh)}px)`;
      // カメラはゆっくり三機のまわりを回る
      const a = -0.5 + k * 2.2;
      this.camera.position.set(Math.sin(a) * 16, 3 + Math.sin(k * 6) * 1.5, Math.cos(a) * 16);
    });
    this.roll.classList.remove('on');
  }

  // 4. 夜のラストヘイヴン
  async finale() {
    const s = this.scene, r = G.members.ren.name;
    await this.fadeTo(1, 0.8);
    this.clear();
    s.background = new THREE.Color(0x0a1028); s.fog = new THREE.Fog(0x0a1028, 40, 140);
    this.addStars(2500, 400);
    s.add(new THREE.HemisphereLight(0x8aa0e0, 0x1a1a2a, 0.9));
    const moon = new THREE.DirectionalLight(0xbfd0ff, 1.4); moon.position.set(20, 30, 10); s.add(moon);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 48), new THREE.MeshStandardMaterial({ color: 0x4a4050, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; s.add(ground);
    const dome = buildStruct('dome');
    if (dome) { dome.scale.setScalar(4.2); dome.position.set(0, 0, -26); s.add(dome); }
    const lamp = new THREE.PointLight(0xffc890, 40, 30); lamp.position.set(0, 4, -10); s.add(lamp);
    const a = this.machine('alpha'); a.position.set(0, 0, 0); s.add(a);
    this.camera.position.set(0, 2.5, 14); this.look = V(0, 2.5, 0);
    await this.fadeTo(0, 1.2);
    this.say(`${r}「父さん。アルファは、こんなにきれいに光ってるよ」`);
    await tween(7, (k) => { this.camera.position.set(Math.sin(k * 0.8) * 12, 3 + k * 2, 16 + k * 4); this.look.set(0, 2.8 + k * 3, -6 * k); });
    if (this.done) return;
    this.say('胸のコアの光が、星空に向かって、やさしくまたたいた。');
    await wait(5); if (this.done) return;
    this.hush();
    // ロゴ
    this.sub.classList.add('ending-logo');
    this.say('<div class="ending-logo-main">ALPHA MAX</div><div class="ending-logo-sub">星の果て、鋼を駆る者</div><div class="ending-logo-end">THE END　―　遊んでくれて、ありがとう！</div>');
    await wait(9);
    this.finish();
  }

  async fadeTo(v, sec) {
    const fade = document.querySelector('.fade');
    fade.style.background = '#000'; fade.style.transitionDuration = `${sec}s`; fade.style.opacity = String(v);
    await wait(sec + 0.05);
  }

  async play() {
    await this.homecoming();
    if (!this.done) await this.planets();
    if (!this.done) await this.credits();
    if (!this.done) await this.finale();
  }
}
