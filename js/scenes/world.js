// フィールド探索（町・荒野・ダンジョン）。2Dタイルの地面＋3Dのキャラ・マシン・敵
import * as THREE from 'three';
import { engine } from '../core/engine.js';
import { input } from '../core/input.js';
import { ui, esc } from '../core/ui.js';
import { hud } from '../core/hud.js';
import { audio } from '../core/audio.js';
import { tween, Ease, wait, randInt } from '../core/tween.js';
import { getModel, disposeObject, setOpacity } from '../core/assets.js';
import { createMapView, heightAt, cutawayWalls } from '../core/map-renderer.js';
import { buildMachineModel, animateMachine, animateChar, animateEnemy } from '../models/mech.js';
import { buildCharModel } from '../models/char-look.js';
import { devStore, robotStation, charStation, showcaseModel } from './devroom.js';
import { hangarList, machineViewer } from './hangar.js';
import { MAPS } from '../data/maps.js';
import { planetOfTown } from '../data/planets.js';
import { addClimaxWorld } from './climax-fx.js';
import { TILES, tileAt, isWalkable } from '../data/tiles.js';
import { CHARACTERS } from '../data/characters.js';
import { MACHINES } from '../data/machines.js';
import { ENEMIES, BOUNTIES } from '../data/enemies.js';
import {
  G, alphaSeal, maxFormOf, partyMembers, machineStats, machineName, canPilot, sealOf, stellaStage, partNow, machinesOnMap, hiddenMachinesOnMap, weaponByUid, giveLoot, machinesInGarage, createMachine,
} from '../game/state.js';
import { flow } from '../game/flow.js';
import { openMapView, itemMenu, shuttleReady, openFacility, openFieldMenu, autosave, settings, runEvent, bountyList, restAtHome, alphaInShop, teleportMenu, keypad, gearMachine, devDoorOpen, openDevDoor, tuningMenu } from './menus.js';
import { addBuildings, updateBuildings, addProps, addChests, makeSparkle, addStructures, updateStructures } from './world-objects.js';

const MACHINE_SCALE = 0.72;
// 遭遇の確率（3歩ごとに判定）。道（road）は0＝町と町をつなぐ安全な道
// 敵に出会う確率（3歩ごと）。v0.12 で約3割減らした
const ENC_RATE = { sand: 0.13, rock: 0.18, metal: 0.16, road: 0, ship: 0.16, sea: 0.16, lava: 0.18 };
const GRACE_STEPS = 14; // 戦闘の後・マップに入った後の、敵が出ない歩数
// 転送・ワープユニットで着く場所（町の入口の少し内側）
// 町の出口（warps の最初）から内側へ進んで、最初の歩ける場所（マップを広げても自動で合う）
const townGate = (id) => {
  const m = MAPS[id];
  const w = m?.warps?.[0];
  if (!w) return [Math.floor((m?.width || 2) / 2), Math.floor((m?.height || 2) / 2)];
  const d = { down: [0, -1], up: [0, 1], left: [1, 0], right: [-1, 0] }[w.dir] || [0, -1];
  for (let i = 2; i < 8; i++) { const x = w.x + d[0] * i, y = w.y + d[1] * i; if (isWalkable(m, x, y)) return [x, y]; }
  return [w.x + d[0] * 2, w.y + d[1] * 2];
};
// 惑星ごとの空・霧・光（out＝屋外、in＝暗いダンジョン）
const BIOME_LOOK = {
  fire: {
    out: { bg: 0x3a1a10, fog: 0x7a3a1e, near: 26, far: 64, sky: 0xffd0a8, ground: 0x6a3a22, hemi: 1.45, sun: 0xffc090, sunK: 2.2 }, // v2.0 で明るく
    in: { bg: 0x200a06, fog: 0x3e1a0e, near: 18, far: 44, sky: 0xffb08a, ground: 0x3a1a0e, hemi: 1.05, sun: 0xffa070, sunK: 0.9, lamp: 0xffb878, lampK: 30 },
  },
  // 光＝天上の聖域：黄昏の金色の光と、群青・紫の空（空と光の柱などは climax-fx.js）
  light: {
    out: { bg: 0x2a2a6a, fog: 0xc8a0c8, near: 26, far: 78, sky: 0xb0a0ff, ground: 0xd88a50, hemi: 0.95, sun: 0xffb070, sunK: 2.6 },
    in: { bg: 0x10142e, fog: 0x2a2450, near: 16, far: 42, sky: 0xd8c8ff, ground: 0x3a2a40, hemi: 0.8, sun: 0xffd898, sunK: 0.7, lamp: 0xfff0c0, lampK: 24 },
  },
  // 闇＝終焉の夜：赤い日食の光・血の色の霧・赤い稲妻
  dark: {
    out: { bg: 0x2a0a12, fog: 0x4a1622, near: 20, far: 56, sky: 0xe89ab0, ground: 0x3a1a26, hemi: 1.25, sun: 0xff9a8a, sunK: 1.5, lamp: 0xffd0a0, lampK: 34 }, // v2.0 で明るく
    in: { bg: 0x221020, fog: 0x3a1a2a, near: 18, far: 50, sky: 0xe8b0c8, ground: 0x4a2a3a, hemi: 1.3, sun: 0xffb0a0, sunK: 1.1, lamp: 0xffe0b8, lampK: 44 },
  },
  // 虹の深淵（v1.2〜）：宇宙色の空と、七色に移り変わる光（色の動きは climax-fx.js）
  core: {
    out: { bg: 0x0a0420, fog: 0x6a5ab8, near: 28, far: 84, sky: 0xffffff, ground: 0x8a6aff, hemi: 1.1, sun: 0xffffff, sunK: 2.0 },
    in: { bg: 0x0a0420, fog: 0x3a2a7a, near: 16, far: 44, sky: 0xffffff, ground: 0x6a4ad8, hemi: 0.95, sun: 0xffffff, sunK: 0.9, lamp: 0xffffff, lampK: 26 },
  },
};
// 漂う粒（泡・火の粉・光の粒・闇の粒・胞子）：色と昇る速さ
const PARTICLES = { deep: { color: 0xbfefff, up: 0.9 }, fire: { color: 0xff8a3a, up: 1.3 } };
const CHAR_SCALE = 0.9;
// フィールドのカメラ（画面の右半分をスワイプ）
//  左右（yaw）：360度ぐるりと回せる（v1.7〜。「正面に戻す」はいちばん近い正面へ）
//  上下（pitch）：0度＝真横（地面すれすれ）〜 90度＝真上から。いつもの角度は CAM_PITCH0（約54度）
const CAM_PITCH0 = (40 * Math.PI) / 180; // いつもの上下の角度（v2.9.4 で約54度→46度、v2.9.5 で40度に下げた）
const CAM_SWIPE = 0.007; // 1ピクセルあたりの回転（ラジアン）
const TAU = Math.PI * 2;
const clampYaw = (y) => y; // 360度回せる（角度は回した分だけ増える。正面に戻すときは近いほうの正面へ）
const yawOff = (y) => { const r = ((y % TAU) + TAU) % TAU; return Math.min(r, TAU - r); }; // 正面からのずれ
const clampPitch = (a) => Math.max(0, Math.min(Math.PI / 2, a));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// 光の粒子（アルファ・オメガが動くと舞う）
let glowTex = null;
function getGlowTex() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

export function machineSpec(mc) {
  const def = MACHINES[mc.type];
  // アルファは封印中はくすんだ色で光らない。封印が解けるたびに光が増え、完全解放で翼が広がる（展示台は sealOverride で段階を切り替えられる）
  const seal = sealOf(mc);
  const sealed = mc.type === 'alpha' && seal < 1;
  const body = partNow(mc.parts.body, mc);
  return {
    parts: mc.parts,
    colors: sealed ? def.brokenColors : maxFormOf(mc) ? { ...def.colors, ...maxFormOf(mc).colors } : def.colors,
    weapons: mc.slots.map((uid) => (uid ? weaponByUid(uid) : null)),
    sealStage: mc.type === 'alpha' ? seal : 0,
    stellaStage: mc.type === 'alpha' ? stellaStage(mc) : 0,
    wingSpread: !!body?.wingSpread,
    // 光の強さ：アルファは封印の段階、ほかは glowK（開発者の部屋で調整できる。1 のときはそのまま）
    glow: mc.type === 'alpha' ? def.seal[seal].glow : maxFormOf(mc) ? maxFormOf(mc).glow : def.glowK !== 1 ? 1.4 * def.glowK : undefined,
    maxForm: !!maxFormOf(mc), // オメガマックス・ガイアマックス（光のオーラ）
  };
}
export const inMachine = (m) => !!(m.machine && G.machines[m.machine]?.loc.type === 'party');

export class WorldScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
    this.raycaster = new THREE.Raycaster();
    this.busy = false;
    this.t = 0;
    input.on('action', () => { if (this.active && !this.busy && !ui.busy) this.onAction(); });
    input.on('menu', () => { if (this.active && !this.busy && !ui.busy) this.onMenu(); });
    input.on('items', async () => {
      if (!this.active || this.busy || ui.busy) return;
      this.lock(true);
      try { await itemMenu(false, this); } finally { if (this.active) this.lock(false); }
      hud.update(true);
    });
    input.on('mapview', async () => { if (!this.active || this.busy || ui.busy) return; this.lock(true); try { await openMapView(this); } finally { if (this.active) this.lock(false); } });
    input.on('tap', (p) => { if (this.active && !this.busy && !ui.busy) this.onTap(p); });
    // フィールドでは画面の右側を横にスワイプするとカメラが左右に回る（最大90度ずつ。指を離した角度で止まる）
    // 横に動かすと左右に回り、縦に動かすと上下の角度が変わる（下へ動かすと真上寄り、上へ動かすと地面すれすれ寄り）
    input.on('swipe', ({ dx, dy }) => {
      if (!this.active || ui.busy || !this.canRotate()) return;
      this.camYawTarget = null; this.camPitchTarget = null;
      this.manualCamT = this.t || 0; // 自分で回した直後は、自動で後ろへ回さない
      this.camYaw = clampYaw((this.camYaw || 0) - dx * CAM_SWIPE);
      this.camPitch = clampPitch((this.camPitch ?? CAM_PITCH0) + (dy || 0) * CAM_SWIPE);
    });
    this.camResetBtn = document.createElement('button');
    this.camResetBtn.className = 'cam-reset';
    this.camResetBtn.textContent = '⟲ 正面に戻す';
    this.camResetBtn.addEventListener('click', (e) => { e.stopPropagation(); this.camYawTarget = Math.round((this.camYaw || 0) / TAU) * TAU; this.camPitchTarget = CAM_PITCH0; });
    this.camResetBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    // 歩く向きに合わせて、カメラが自動でキャラの後ろに回る（v2.9〜。押すたびにオン・オフ、設定に覚える）
    this.camFollowBtn = document.createElement('button');
    this.camFollowBtn.className = 'cam-follow';
    const drawFollow = () => { const on = !!audio.settings.followCam; this.camFollowBtn.innerHTML = `🎥<span> 自動で後ろへ：${on ? 'オン' : 'オフ'}</span>`; this.camFollowBtn.title = `自動で後ろへ：${on ? 'オン' : 'オフ'}`; this.camFollowBtn.classList.toggle('active', on); };
    drawFollow();
    this.camFollowBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.camFollowBtn.addEventListener('click', (e) => { e.stopPropagation(); audio.settings.followCam = !audio.settings.followCam; audio.saveSettings(); audio.sfx('cursor'); drawFollow(); });
    document.body.appendChild(this.camFollowBtn);
    // 調べられる物の正面に立つと出る「調べる」ボタン
    this.pop = document.createElement('button');
    this.pop.className = 'examine-pop';
    this.pop.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.pop.addEventListener('click', (e) => { e.stopPropagation(); if (this.active && !this.busy && !ui.busy) this.onAction(); });
    document.body.appendChild(this.pop);
    document.body.appendChild(this.camResetBtn);
  }

  get map() { return MAPS[G.pos.map]; }

  // 目覚めたアルファがほかの星のガレージに取り残されていたら、いまの星の町のガレージへ運ぶ（v1.4.2。以前のセーブの直し）
  alphaFollow() {
    const alpha = G.machines.alpha, here = planetOfTown(G.lastTown);
    if (!alpha?.owned || alphaSeal() < 1 || !here || alpha.loc.type !== 'garage') return;
    if (planetOfTown(alpha.loc.town)?.id === here.id) return;
    alpha.loc = { type: 'garage', town: G.lastTown };
    setTimeout(() => ui.toast(`アルファが${MAPS[G.lastTown].name}のガレージに届いた！ ガレージの「乗る人を決める」で乗れる`, 4.5), 1200);
  }

  async enter(opts = {}) {
    this.active = true;
    this.alphaFollow();
    this.build();
    hud.show();
    audio.playSong(this.map.bgm);
    this.lock(true);
    await ui.fade(false, 0.45);
    if (opts.banner) ui.banner(esc(this.map.name), esc(this.map.subtitle || ''));
    if (opts.after) await opts.after(this);
    if (this.active) this.lock(false);
    hud.update(true);
  }

  async exit() {
    this.active = false;
    this.pop.classList.remove('on');
    this.camResetBtn.classList.remove('on');
    this.camFollowBtn.classList.remove('show');
    input.setEnabled(false);
    hud.hide();
  }

  lock(v) {
    this.busy = v;
    input.setEnabled(!v);
  }

  // ---------------------------------------------------------------- 組み立て
  clear() {
    this.particles = [];
    this.npcMarks = [];
    this.clickPath = null; this.clickAfter = null; this.clickMark = null; // クリック移動の目印も作り直す
    for (const o of [...this.scene.children]) { this.scene.remove(o); disposeObject(o); }
    this.mapView?.dispose();
  }

  build() {
    this.clear();
    const map = this.map;
    const dark = !!map.dark;
    const indoor = map.type === 'interior';
    // 風の惑星の外は青空と雲海（遠くまで見えるように霧を薄く）
    const sky = !indoor && !dark && (map.biome === 'wind' || map.biome === 'water');
    const sea = map.biome === 'water';
    const deep = dark && map.biome === 'deep';
    this.scene.background = new THREE.Color(indoor ? 0x140e0a : deep ? 0x06182a : dark ? 0x101014 : sea ? 0x7cc8f0 : sky ? 0x8ec4ee : 0x2a2018);
    this.scene.fog = indoor ? null : deep ? new THREE.Fog(0x0a2438, 14, 34) : sky ? new THREE.Fog(sea ? 0xa8dcf0 : 0xc4dcf0, 26, 62) : new THREE.Fog(dark ? 0x101014 : (map.type === 'town' ? 0x4a4640 : 0xb89868), 22, 46);
    const hemi = new THREE.HemisphereLight(indoor ? 0xffe8c8 : deep ? 0x6ab0d8 : dark ? 0x8a90a8 : sea ? 0xf0faff : sky ? 0xeaf6ff : 0xfff2dc, indoor ? 0x4a3020 : deep ? 0x0a2030 : dark ? 0x201820 : sea ? 0x4a8a9a : sky ? 0x5a7a5a : 0x6a5038, indoor ? 0.9 : deep ? 0.7 : dark ? 0.55 : sky ? 1.15 : 1.0);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(dark ? 0xb0b8ff : sky ? 0xfff8ec : 0xfff0d0, dark ? 0.5 : 1.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 60;
    sun.shadow.bias = -0.0015;
    this.scene.add(sun, sun.target);
    this.sun = sun;
    if (dark) {
      this.lamp = new THREE.PointLight(deep ? 0xa8e8ff : 0xffd8a0, deep ? 24 : 18, deep ? 11 : 9, 1.6);
      this.scene.add(this.lamp);
    } else this.lamp = null;
    // 第4〜7章の惑星の空と光（火＝赤い空と溶岩の光、光＝まぶしい白金、闇＝夜、マザーコア＝虹の深淵）
    const look = !indoor && BIOME_LOOK[map.biome]?.[dark ? 'in' : 'out'];
    if (look) {
      this.scene.background = new THREE.Color(look.bg);
      this.scene.fog = new THREE.Fog(look.fog, look.near, look.far);
      hemi.color.setHex(look.sky); hemi.groundColor.setHex(look.ground); hemi.intensity = look.hemi;
      sun.color.setHex(look.sun); sun.intensity = look.sunK;
      if (look.lamp) { if (!this.lamp) { this.lamp = new THREE.PointLight(look.lamp, look.lampK || 20, 10, 1.6); this.scene.add(this.lamp); } else this.lamp.color.setHex(look.lamp); }
    }
    // 光と闇の惑星：空・光の柱・水晶／日食・稲妻・灰（climax-fx.js）
    this.climax = addClimaxWorld(this.scene, map, { indoor, dark, hemi, sun });
    if (indoor) {
      sun.intensity = 1.0;
      // 町ごと・お店ごとの照明の色（宿屋は暖かく、パーツ屋は白っぽく、酒場は紫がかって……）
      const th = map.theme || {};
      const col = th.light ?? 0xffd8a0, k = th.lightK ?? 1;
      hemi.color.setHex(col).lerp(new THREE.Color(0xffffff), 0.35);
      const room = new THREE.PointLight(col, 25 * k, 14, 1.4);
      room.position.set(map.width / 2, 3.2, map.height / 2);
      this.scene.add(room);
      // 奥の壁ぎわにもう1つ（部屋の奥を明るく）
      const back = new THREE.PointLight(col, 10 * k, 9, 1.6);
      back.position.set(map.width / 2, 2.4, 1.6);
      this.scene.add(back);
    }

    this.mapView = createMapView(map, settings.mapMode, engine.renderer);
    this.scene.add(this.mapView.group);

    // 町の建物（ローポリ3D）と、何の店かわかるアイコン
    this.buildings = map.buildings3d ? addBuildings(this.scene, map) : [];
    // 建物の中の家具・ダンジョンの宝箱
    const fl = (G.flags.taken ||= {});
    this.props = addProps(this.scene, map, (pr) => !!fl[`${map.id}:${pr.id}`]);
    for (const pr of this.props) {
      if (pr.obj && map.type !== 'interior') pr.obj.position.y += heightAt(map, pr.x, pr.z);
      // 開発者の部屋の扉：このプレイ中に開けていたら上がったまま
      if (pr.data.devDoor && devDoorOpen() && pr.obj) pr.obj.position.y = 2.2;
      // 本棚が動いたあと（隠し階段が見えている）
      if (pr.data.secret && G.flags.stairsOpen) { pr.x += 1.1; if (pr.obj) pr.obj.position.x = pr.x; }
    }
    this.spinners = this.props.map((pr) => pr.obj?.getObjectByName('spin')).filter(Boolean);
    this.refreshShowcases();
    const op = (G.flags.opened ||= {});
    this.chests = addChests(this.scene, map, (c) => !!op[`${map.id}:${c.id}`]);
    for (const c of this.chests) c.obj.position.y = heightAt(map, c.x, c.z);
    // フィールドの建造物（町の外観・ダンジョンの入口・遺跡）
    this.structures = addStructures(this.scene, map, heightAt);
    this.extras = [];
    // 修理屋の中の、修理中のアルファ
    if (map.alphaAt && alphaInShop()) {
      const a = G.machines.alpha;
      const obj = buildMachineModel(machineSpec(a));
      obj.scale.setScalar(0.8);
      obj.position.set(map.alphaAt[0], 0, map.alphaAt[1]);
      obj.rotation.y = 0.5;
      this.scene.add(obj);
      this.extras.push(obj);
    }
    // ガレージの中には預けてあるマシンが並ぶ
    if (map.showMachines) {
      // 仲間が使っているマシンだけを並べる（台数が増えても重くならない）。目覚めたアルファは、だれも乗っていなくても必ず並べる（v1.4.3）
      // オメガ・ガイアも、持っていてだれも乗っていなければ並べる（v2.8.2。最強スタートでガレージにいるのに見えなかったため）
      const piloted = (mc) => partyMembers().some((m) => m.machine === mc.id);
      const freeAlpha = (mc) => !piloted(mc) && mc.owned && (mc.type === 'alpha' ? alphaSeal() >= 1 : mc.type === 'omega' || mc.type === 'gaia');
      machinesInGarage(map.town).filter((mc) => piloted(mc) || freeAlpha(mc)).sort((a, b) => freeAlpha(b) - freeAlpha(a)).slice(0, map.showMachines.length).forEach((mc, i) => {
        const obj = buildMachineModel(machineSpec(mc));
        obj.scale.setScalar(0.78);
        obj.position.set(map.showMachines[i][0], 0, map.showMachines[i][1]);
        obj.userData.entity = { kind: 'garageMachine', mc };
        this.scene.add(obj);
        this.extras.push(obj);
        if (freeAlpha(mc)) {
          // だれも乗っていない伝説の機体：調べると「乗る」（光の目印つき）
          const pr = { data: { id: `mc_${mc.id}`, block: [1.6, 1.4], search: { event: 'rideAlpha' } }, obj, x: obj.position.x, z: obj.position.z, taken: false, mc };
          this.props.push(pr);
          this.addSparkle(pr, pr.x, pr.z, 2.2);
          return;
        }
        this.props.push({ data: { id: `mc_${mc.id}`, block: [1.6, 1.4], search: { text: `${machineName(mc)}。整備士がていねいに磨いてくれている。（店の人に話すと出発できます）` } }, obj, x: obj.position.x, z: obj.position.z, taken: false });
      });
    }
    // 調べられる物の上の光の目印
    this.sparkles = [];
    for (const pr of this.props) if (pr.data.search?.loot && !pr.taken) this.addSparkle(pr, pr.x, pr.z, 1.3);
    for (const c of this.chests) if (!c.opened) this.addSparkle(c, c.x, c.z, (c.data.big ? 1.3 : 1.0) + c.obj.position.y);
    this.markExplored();

    // NPC
    this.npcs = (map.npcs || []).filter((n) => !(n.hideIfJoined && G.members[n.hideIfJoined]?.joined)).map((n) => {
      const obj = getModel(n.model, n.colors || {});
      obj.scale.setScalar(CHAR_SCALE * (n.scale || 1));
      obj.position.set(n.x + 0.5, heightAt(map, n.x + 0.5, n.y + 0.5), n.y + 0.5);
      obj.rotation.y = 0;
      obj.userData.entity = { kind: 'npc', data: n };
      this.scene.add(obj);
      // 船長キールの頭の上にはいつも目印（v1.6.2）。次の星へ飛べるときは金色の「次の惑星へ」、それ以外は青い「宇宙船の船長」
      if (n.event === 'shuttleCaptain') {
        const ready = shuttleReady();
        const c = document.createElement('canvas'); c.width = 256; c.height = 96;
        const g = c.getContext('2d');
        const edge = ready ? '#ffe08a' : '#8ad8ff';
        g.fillStyle = 'rgba(20,30,60,0.85)'; g.strokeStyle = edge; g.lineWidth = 4;
        g.beginPath(); g.roundRect(6, 6, 244, 60, 14); g.fill(); g.stroke();
        g.fillStyle = edge; g.beginPath(); g.moveTo(112, 66); g.lineTo(144, 66); g.lineTo(128, 90); g.fill();
        g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
        g.fillText(ready ? '🚀 次の惑星へ' : '🚀 宇宙船の船長', 128, 37);
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
        const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
        mark.scale.set(2.4, 0.9, 1); mark.renderOrder = 20;
        mark.position.set(n.x + 0.5, obj.position.y + 2.6, n.y + 0.5);
        mark.userData.baseY = mark.position.y; mark.userData.npcMark = true;
        this.scene.add(mark);
        (this.npcMarks ||= []).push(mark);
      }
      return { data: n, obj, x: n.x + 0.5, z: n.y + 0.5 };
    });

    // 賞金首のシンボル
    this.symbols = (map.symbols || []).filter((s) => (s.bounty ? !G.bounties[s.bounty] : !G.flags[s.flag])).map((s) => {
      const def = ENEMIES[s.enemies[0][0]];
      const obj = getModel(s.model, def.colors || {});
      obj.scale.setScalar(s.scale || 0.5);
      obj.position.set(s.x + 0.5, heightAt(map, s.x + 0.5, s.y + 0.5), s.y + 0.5);
      obj.rotation.y = Math.PI * 0.15;
      obj.userData.entity = { kind: 'symbol', data: s };
      this.scene.add(obj);
      // 足元の赤いマーカー
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 24), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.6 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(s.x + 0.5, obj.position.y + 0.03, s.y + 0.5);
      this.scene.add(ring);
      return { data: s, obj, ring, x: s.x + 0.5, z: s.y + 0.5 };
    });

    // 停めてあるマシン・まだ見つけていないマシン
    this.parked = [];
    // まだ見つけていない隠しマシン（第2章のガイアなど）：マップの hiddenMachine に置いておく
    const hm = map.hiddenMachine;
    if (hm && !G.flags[hm.flag] && !Object.values(G.machines).some((mc) => mc.type === hm.type && !mc.owned && mc.loc.type === 'map')) {
      createMachine(hm.type, { owned: false, loc: { type: 'map', map: map.id, x: hm.x, y: hm.y } });
    }
    for (const mc of [...machinesOnMap(map.id), ...hiddenMachinesOnMap(map.id)]) this.addParked(mc);

    // パーティ（先頭＋ついてくる仲間）
    this.buildParty();
    this.trail = [];
    const p = G.pos;
    for (let i = 0; i < 80; i++) this.trail.push({ x: p.x - Math.sin(p.dir || 0) * i * 0.05, z: p.y - Math.cos(p.dir || 0) * i * 0.05 });
    this.updateFollowers(0, true);
    this.lastTile = `${Math.floor(p.x)},${Math.floor(p.y)}`;
    // 風の惑星：風の筋が流れる
    this.windLines = [];
    this.diveHint = false;
    this.cutKey = null;
    // 水の惑星の海の底・水没した都市：泡が立ちのぼる
    this.bubbles = [];
    const pt = !indoor && (deep || map.bubbles ? PARTICLES.deep : PARTICLES[map.biome]);
    this.bubbleUp = pt?.up || 0.9;
    if (pt) {
      const bg = new THREE.SphereGeometry(0.06, 6, 4);
      for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: pt.color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); m.userData.life = Math.random() * 4; this.scene.add(m); this.bubbles.push(m); }
    }
    if ((sky && !sea) || (map.wind && !indoor)) {
      const geo = new THREE.PlaneGeometry(1.6, 0.04);
      for (let i = 0; i < 26; i++) {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
        m.userData.life = Math.random() * 3;
        this.scene.add(m);
        this.windLines.push(m);
      }
    }
    this.updateCamera(1);
  }

  // 風の筋：プレイヤーのまわりに生まれて、風下（右手前）へ流れて消える
  updateWind(dt) {
    const p = G.pos;
    for (const m of this.windLines) {
      const u = m.userData;
      u.life += dt;
      if (u.life > u.max || !u.max) {
        u.life = 0; u.max = 1.4 + Math.random() * 1.6;
        u.vx = 5 + Math.random() * 4; u.vz = 1.2 + Math.random();
        m.position.set(p.x - 10 + Math.random() * 12, heightAt(this.map, p.x, p.y) + 0.4 + Math.random() * 3.2, p.y - 7 + Math.random() * 12);
        m.rotation.set(-Math.PI / 2 + 0.4, 0, -Math.atan2(u.vz, u.vx));
        m.scale.x = 0.6 + Math.random() * 1.2;
      }
      m.position.x += u.vx * dt; m.position.z += u.vz * dt;
      const k = u.life / u.max;
      m.material.opacity = Math.sin(k * Math.PI) * 0.45;
    }
  }

  addSparkle(ref, x, z, y) {
    const sp = makeSparkle(getGlowTex(), ref.data?.secret ? 0xff9af0 : 0xffe08a);
    sp.position.set(x, y, z);
    this.scene.add(sp);
    this.sparkles.push({ ref, sp, y });
  }

  addDome(map) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x6a8aa8, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.35 });
    const g = new THREE.Group();
    const R = map.width * 0.62;
    for (let i = 0; i < 6; i++) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 4, 40, Math.PI), mat);
      arc.rotation.y = (i / 6) * Math.PI;
      g.add(arc);
    }
    g.position.set(map.width / 2, -2, map.height / 2);
    g.scale.set(1, 0.55, map.height / map.width + 0.15);
    this.scene.add(g);
  }

  makeAvatar(m) {
    if (inMachine(m)) {
      const mc = G.machines[m.machine];
      const obj = buildMachineModel(machineSpec(mc));
      obj.scale.setScalar(MACHINE_SCALE);
      obj.userData.entity = { kind: 'myMachine', mc, member: m };
      return { member: m, obj, kind: 'machine', mc };
    }
    const obj = buildCharModel(m);
    obj.scale.setScalar(CHAR_SCALE);
    obj.userData.entity = { kind: 'member', member: m };
    return { member: m, obj, kind: 'char' };
  }

  buildParty() {
    for (const a of this.avatars || []) { this.scene.remove(a.obj); }
    this.avatars = partyMembers().map((m) => this.makeAvatar(m));
    const p = G.pos;
    for (const a of this.avatars) {
      a.obj.position.set(p.x, 0, p.y);
      a.obj.rotation.y = p.dir || 0;
      this.scene.add(a.obj);
    }
  }

  addParked(mc) {
    const obj = buildMachineModel(machineSpec(mc));
    obj.scale.setScalar(MACHINE_SCALE);
    obj.position.set(mc.loc.x, heightAt(this.map, mc.loc.x, mc.loc.y), mc.loc.y);
    obj.rotation.y = mc.loc.dir || 0;
    obj.userData.entity = { kind: mc.owned ? 'parked' : 'hiddenMachine', mc };
    this.scene.add(obj);
    this.parked.push({ mc, obj });
  }

  // ---------------------------------------------------------------- 毎フレーム
  update(dt) {
    this.t += dt;
    const t = this.t;
    if (!this.avatars) return;
    const lead = this.avatars[0];
    let moving = 0;
    this.followMag = 0;
    if (!this.busy && !ui.busy) {
      const mv = input.getMove();
      let mag = Math.hypot(mv.x, mv.y);
      // カメラが回っていても、スティックを倒した画面上の向きに進む
      const yaw = this.camYawView || 0, cy = Math.cos(yaw), sy = Math.sin(yaw);
      let wx = mv.x * cy + mv.y * sy, wz = -mv.x * sy + mv.y * cy;
      if (mag > 0.05) this.clearClickPath(); // スティックやキーで動かしたらクリック移動はやめる
      else if (this.clickPath) {
        // クリックした場所へ歩いていく（v2.6〜。PCのマウス）
        const st = this.clickStep(dt);
        if (st) { wx = st.x; wz = st.z; mag = 1; }
      }
      if (mag > 0.05) {
        const mspd = lead.kind === 'machine' ? machineStats(lead.mc).spd : 0;
        // ダッシュ（ボタンかShift）で1.8倍の速さ
        const speed = (lead.kind === 'machine' ? 4.4 + mspd * 0.18 : 3.6) * Math.min(1, mag * 1.2) * (input.dashing ? 1.8 : 1);
        const dx = wx * speed * dt / Math.max(mag, 1), dz = wz * speed * dt / Math.max(mag, 1);
        const r = lead.kind === 'machine' ? 0.4 : 0.26;
        const p = G.pos;
        const ox = p.x, oy = p.y;
        let nx = p.x + dx, ny = p.y;
        if (this.canStand(nx, ny, r)) p.x = nx;
        nx = p.x; ny = p.y + dz;
        if (this.canStand(nx, ny, r)) p.y = ny;
        if (this.clickPath) this.clickStuck = Math.hypot(p.x - ox, p.y - oy) < speed * dt * 0.2 ? (this.clickStuck || 0) + dt : 0;
        const target = Math.atan2(wx, wz);
        p.dir = target;
        moving = Math.min(1, mag * 1.3);
        this.followDir = target; this.followMag = moving;
        const last = this.trail[0];
        if (Math.hypot(p.x - last.x, p.y - last.z) > 0.05) {
          this.trail.unshift({ x: p.x, z: p.y });
          if (this.trail.length > 200) this.trail.pop();
        }
        this.checkTile();
      }
    }
    // 先頭の見た目
    const p = G.pos;
    lead.obj.position.x = p.x; lead.obj.position.z = p.y;
    const gy = heightAt(this.map, p.x, p.y);
    lead.obj.position.y = gy;
    lead.obj.rotation.y = turnTo(lead.obj.rotation.y, p.dir || 0, dt * 12);
    this.animAvatar(lead, t, moving);
    this.updateFollowers(dt, false, moving);
    this.updateParticles(dt, moving);
    // NPC・シンボル
    for (const n of this.npcs) animateChar(n.obj, t + n.x, 0);
    for (const mk of this.npcMarks || []) mk.position.y = mk.userData.baseY + Math.sin(t * 2.5) * 0.15;
    for (const sp of this.spinners || []) sp.rotation.z += dt * 2.2; // 建物の中の小さな風車
    for (const s of this.symbols) {
      animateEnemy(s.obj, t);
      const fly = s.obj.userData.flying;
      s.obj.position.y = heightAt(this.map, s.x, s.z) + (fly ? 0.6 + Math.sin(t * 2) * 0.15 : 0);
      s.obj.rotation.y = Math.PI * 0.15 + Math.sin(t * 0.6) * 0.4;
      s.ring.material.opacity = 0.35 + Math.sin(t * 4) * 0.25;
    }
    for (const pk of this.parked) animateMachine(pk.obj, t, 0);
    for (const o of this.extras) animateMachine(o, t, 0);
    updateBuildings(this.buildings, p.x, p.y, this.camera.position.x, this.camera.position.z, this.camera.position.y - heightAt(this.map, p.x, p.y));
    updateStructures(this.structures, t, dt, this.scene, getGlowTex());
    if (this.windLines.length) this.updateWind(dt);
    this.climax?.update(dt, t, p, this.camera);
    // 水面の波がゆっくり流れる・泡がのぼる
    if (this.mapView.water) { const o = this.mapView.water.material.map.offset; o.x += dt * 0.03; o.y += dt * 0.012; this.mapView.water.position.y = -0.12 + Math.sin(t * 1.2) * 0.03; }
    for (const b of this.bubbles) {
      const u = b.userData; u.life += dt;
      if (u.life > (u.max || 0)) { u.life = 0; u.max = 2 + Math.random() * 3; b.position.set(p.x - 8 + Math.random() * 16, heightAt(this.map, p.x, p.y), p.y - 6 + Math.random() * 10); }
      b.position.y += dt * this.bubbleUp; b.position.x += Math.sin(t * 3 + u.max * 10) * dt * 0.2;
    }
    // 隠し通路の壁は近づくと透ける
    // 少し近づく（7マス以内）と、隠し通路の壁がゆっくり明滅して、ときどききらりと光る
    for (const h of this.mapView.hidden || []) {
      let dmin = Infinity, cx = 0, cz = 0;
      for (const [x, y] of h.cells) { const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y); if (d < dmin) { dmin = d; cx = x + 0.5; cz = y + 0.5; } }
      const near = dmin < 2.2;
      h.mesh.material.opacity += ((near ? 0.3 : 1) - h.mesh.material.opacity) * Math.min(1, dt * 6);
      // 開発者の部屋への壁（修理屋の地下）は見つけにくいまま
      const hint = dmin < 7 && this.map.id !== 'basement' ? 1 - dmin / 7 : 0;
      if (h.mesh.material.emissive) h.mesh.material.emissiveIntensity = hint * (0.25 + 0.25 * Math.sin(t * 3));
      if (hint > 0 && Math.random() < dt * (0.6 + hint * 1.5)) this.spark(new THREE.Vector3(cx, heightAt(this.map, cx, cz) - 0.4 + Math.random() * 0.8, cz - 0.6), 0xffe0a0);
    }
    for (const o of this.showcases || []) { o.rotation.y = t * 0.6; if (o.userData.showcase !== 'char') animateMachine(o, t, 0); }
    // 転送台の光の輪がゆっくり回る
    for (const pr of this.props) if (pr.data.pad && pr.obj) { const r = pr.obj.getObjectByName('padRing'); if (r) r.rotation.y = t * 0.8; const c = pr.obj.getObjectByName('padCore'); if (c?.material.emissive) c.material.emissiveIntensity = 1.2 + Math.sin(t * 3) * 0.6; }
    // ガレージで整備中のマシンから火花
    if (this.map.maintenance && this.extras[0] && Math.random() < dt * 6) this.spark(this.extras[0].position, 0xffc060);
    for (const s of this.sparkles) {
      const gone = s.ref.opened || s.ref.taken;
      const d = Math.hypot(s.ref.x - p.x, s.ref.z - p.y);
      s.sp.visible = !gone && d < 6;
      s.sp.position.y = s.y + Math.sin(t * 3 + s.ref.x) * 0.1;
      s.sp.material.opacity = 0.55 + Math.sin(t * 5 + s.ref.z) * 0.35;
    }
    this.updateCamera(dt);
    this.updateFocus();
    if (Math.floor(t * 4) !== this.hudTick) { this.hudTick = Math.floor(t * 4); hud.update(); this.updateActionLabel(); }
    // 賞金首にぶつかったら
    if (!this.busy && !ui.busy) {
      for (const s of this.symbols) {
        if (Math.hypot(s.x - p.x, s.z - p.y) < 1.1) { this.challengeSymbol(s); break; }
      }
    }
  }

  spark(at, color) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: getGlowTex(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.position.set(at.x + (Math.random() - 0.5) * 0.8, at.y + 0.8 + Math.random() * 0.8, at.z + 0.6);
    sp.scale.setScalar(0.15);
    this.scene.add(sp);
    (this.particles ||= []).push({ sp, t: 0, life: 0.4, vy: -1.5 });
  }

  updateParticles(dt, moving) {
    this.particles ||= [];
    for (const a of this.avatars) {
      const color = a.kind === 'machine' ? MACHINES[a.mc.type].particle : null;
      if (!color || (a.mc.type === 'alpha' && alphaSeal() < 1)) continue;
      const rate = moving ? 40 : 5;
      a.pAcc = (a.pAcc || 0) + dt * rate;
      while (a.pAcc > 1) {
        a.pAcc -= 1;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: getGlowTex(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        const o = a.obj.position;
        sp.position.set(o.x + (Math.random() - 0.5) * 0.9, 0.4 + Math.random() * 1.3, o.z + (Math.random() - 0.5) * 0.9);
        sp.scale.setScalar(0.12 + Math.random() * 0.12);
        this.scene.add(sp);
        this.particles.push({ sp, t: 0, life: 0.8 + Math.random() * 0.6, vy: 0.4 + Math.random() * 0.6 });
      }
    }
    for (const p of [...this.particles]) {
      p.t += dt;
      p.sp.position.y += p.vy * dt;
      p.sp.material.opacity = 1 - p.t / p.life;
      if (p.t >= p.life) { this.scene.remove(p.sp); p.sp.material.dispose(); this.particles.splice(this.particles.indexOf(p), 1); }
    }
  }

  animAvatar(a, t, moving) {
    if (a.kind === 'machine') animateMachine(a.obj, t, moving);
    else animateChar(a.obj, t, moving);
  }

  updateFollowers(dt, snap = false, moving = 0) {
    let dist = 0;
    for (let i = 1; i < this.avatars.length; i++) {
      const a = this.avatars[i];
      const prevKind = this.avatars[i - 1].kind;
      dist += (a.kind === 'machine' || prevKind === 'machine') ? 1.5 : 1.0;
      const pt = this.trailAt(dist);
      const o = a.obj;
      if (snap) { o.position.set(pt.x, heightAt(this.map, pt.x, pt.z), pt.z); continue; }
      const dx = pt.x - o.position.x, dz = pt.z - o.position.z;
      const d = Math.hypot(dx, dz);
      o.position.x += dx * Math.min(1, dt * 10);
      o.position.z += dz * Math.min(1, dt * 10);
      o.position.y = heightAt(this.map, o.position.x, o.position.z);
      if (d > 0.01) o.rotation.y = turnTo(o.rotation.y, Math.atan2(dx, dz), dt * 10);
      this.animAvatar(a, this.t + i * 0.3, moving && d > 0.02 ? moving : 0);
    }
  }

  trailAt(dist) {
    let acc = 0;
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1], b = this.trail[i];
      const seg = Math.hypot(a.x - b.x, a.z - b.z);
      if (acc + seg >= dist) { const k = (dist - acc) / (seg || 1); return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k }; }
      acc += seg;
    }
    return this.trail[this.trail.length - 1];
  }

  updateCamera(dt) {
    const p = G.pos;
    const town = this.map.type === 'town';
    const indoor = this.map.type === 'interior';
    const off = indoor ? V(0, 8, 6.4).multiplyScalar(Math.min(1.3, Math.max(1, this.map.width / 17))) : town ? V(0, 11, 8.2) : V(0, 13, 9.6);
    // フィールドで町の門に近づくと、カメラが少し寄る
    let zoom = 1;
    for (const st of this.structures || []) {
      if (st.data.kind !== 'town') continue;
      const d = Math.hypot(st.x - p.x, st.z - p.y);
      if (d < 7) zoom = Math.min(zoom, 0.66 + 0.34 * (d / 7));
    }
    this.camZoom = (this.camZoom ?? zoom) + (zoom - (this.camZoom ?? zoom)) * Math.min(1, dt * 3);
    off.multiplyScalar(this.camZoom);
    // フィールドのカメラ：Q／E で左右、R／F で上下にも動かせる。「正面に戻す」でゆっくりいつもの角度へ
    let rotated = false;
    if (this.canRotate()) {
      const kq = (input.isDown('q') || input.isDown('Q') ? 1 : 0) - (input.isDown('e') || input.isDown('E') ? 1 : 0);
      const kr = (input.isDown('f') || input.isDown('F') ? 1 : 0) - (input.isDown('r') || input.isDown('R') ? 1 : 0);
      if (kq && !ui.busy) { this.camYawTarget = null; this.camYaw = clampYaw((this.camYaw || 0) + kq * dt * 1.6); }
      if (kr && !ui.busy) { this.camPitchTarget = null; this.camPitch = clampPitch((this.camPitch ?? CAM_PITCH0) + kr * dt * 1.2); }
      // 自動で後ろへ（v2.9）：歩いている間、カメラがゆっくりキャラの後ろへ回る（v2.9.4 から建物の中も。自分で回した直後の1秒は回さない）
      if (audio.settings.followCam && this.followMag > 0 && !ui.busy && (this.t || 0) - (this.manualCamT ?? -9) > 1) {
        const want = this.followDir + Math.PI;
        let d = (want - (this.camYaw || 0)) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
        this.camYawTarget = null;
        this.camYaw = (this.camYaw || 0) + d * Math.min(1, dt * 3.4 * this.followMag); // 追いつく速さ（v2.9.3 で 1.6→3.4）
      }
      const ease = Math.min(1, dt * 4);
      if (!Number.isFinite(this.camYaw)) this.camYaw = 0;
      if (!Number.isFinite(this.camPitch)) this.camPitch = CAM_PITCH0;
      if (this.camYawTarget != null) { this.camYaw += (this.camYawTarget - this.camYaw) * ease; if (Math.abs(this.camYaw - this.camYawTarget) < 0.003) { this.camYaw = this.camYawTarget; this.camYawTarget = null; } }
      if (this.camPitchTarget != null) { this.camPitch += (this.camPitchTarget - this.camPitch) * ease; if (Math.abs(this.camPitch - this.camPitchTarget) < 0.003) { this.camPitch = this.camPitchTarget; this.camPitchTarget = null; } }
      // 見た目は少しなめらかに追いかける
      this.camYawView = (this.camYawView ?? 0) + ((this.camYaw || 0) - (this.camYawView ?? 0)) * Math.min(1, dt * 12);
      this.camPitchView = (this.camPitchView ?? CAM_PITCH0) + ((this.camPitch ?? CAM_PITCH0) - (this.camPitchView ?? CAM_PITCH0)) * Math.min(1, dt * 12);
      // キャラを中心にした球の上にカメラを置く（距離はいつもと同じ）
      const dist = off.length(), yw = this.camYawView, pt = this.camPitchView;
      off.set(dist * Math.cos(pt) * Math.sin(yw), dist * Math.sin(pt), dist * Math.cos(pt) * Math.cos(yw));
      rotated = yawOff(this.camYaw || 0) > 0.01 || Math.abs((this.camPitch ?? CAM_PITCH0) - CAM_PITCH0) > 0.01;
    } else { this.camYaw = 0; this.camYawTarget = null; this.camPitch = CAM_PITCH0; this.camPitchTarget = null; this.camYawView = 0; this.camPitchView = CAM_PITCH0; }
    this.camResetBtn.classList.toggle('on', rotated && !ui.busy);
    this.camFollowBtn.classList.toggle('show', this.canRotate() && !ui.busy && this.active);
    let target = V(p.x, heightAt(this.map, p.x, p.y), p.y - 0.6);
    // 部屋の中は部屋全体が見えるように、カメラを部屋の真ん中寄りにする
    // 「自動で後ろへ」がオンのときは、部屋の中でもキャラを中心に見る（v2.9.4）
    if (indoor && !audio.settings.followCam) target = V(this.map.width / 2 + (p.x - this.map.width / 2) * 0.4, 0, this.map.height / 2 - 0.6 + (p.y - this.map.height / 2) * 0.3);
    // 低い角度のときは目の高さから見る（マシンに乗っているときはマシンの頭の上から。真横でも前が見えるように）
    if (this.canRotate()) target.y += (this.avatars?.[0]?.kind === 'machine' ? 3.6 : 1.4) * (1 - Math.sin(this.camPitchView ?? CAM_PITCH0));
    const k = Math.min(1, dt * 6);
    this.camLook = this.camLook ? this.camLook.lerp(target, k) : target.clone();
    let want;
    if (this.canRotate()) {
      // フィールド：注視点から角度どおりの位置（回転中に視点がぶれないよう、位置はそのまま決める）。地面の下にはもぐらない
      want = this.camLook.clone().add(off);
      want.y = Math.max(want.y, heightAt(this.map, want.x, want.z) + 0.6);
      this.camera.position.copy(want);
    } else {
      want = target.clone().add(off);
      this.camera.position.lerp(want, k);
    }
    this.camera.lookAt(this.camLook);
    if (this.map.type === 'dungeon' || this.map.type === 'interior') this.updateCutaway();
    this.sun.position.set(p.x - 9, 20, p.y + 7);
    this.sun.target.position.set(p.x, 0, p.y);
    if (this.lamp) this.lamp.position.set(p.x, 2.5, p.y + 0.5);
  }

  // カメラを回せるマップ：フィールド・町・ダンジョン・建物の中（v1.7〜 建物の中も）
  canRotate() { const t = this.map?.type; return t === 'field' || t === 'town' || t === 'dungeon' || t === 'interior'; }

  // ダンジョン：キャラとカメラの間にある壁を低く縮める（カメラを回しても中が見えるように）
  updateCutaway() {
    const view = this.mapView;
    if (!view?.cut) return;
    // 建物の中：カメラのある側の壁をぜんぶ低くする（ドールハウスのように中が見える）
    if (this.map.type === 'interior') {
      const W = this.map.width, H = this.map.height, cx = W / 2, cz = H / 2;
      const yw = this.camYawView || 0, dx = Math.sin(yw), dz = Math.cos(yw);
      const key = `in${Math.round(yw * 20)}`;
      if (key === this.cutKey) return;
      this.cutKey = key;
      const cells = new Set();
      for (const k of view.cut.keys()) {
        const [x, y] = k.split(',').map(Number);
        const ux = (x + 0.5 - cx) / (W / 2), uz = (y + 0.5 - cz) / (H / 2);
        if (ux * dx + uz * dz > 0.35) cells.add(k);
      }
      cutawayWalls(view, cells);
      return;
    }
    const p = G.pos, c = this.camera.position;
    const dx = c.x - p.x, dz = c.z - p.y, len = Math.hypot(dx, dz) || 1;
    const cy = c.y - heightAt(this.map, p.x, p.y);
    const reach = Math.min(len, 8, (2.2 * len) / Math.max(cy, 0.5)) + 0.6;
    const key = `${Math.round(p.x * 4)},${Math.round(p.y * 4)},${Math.round(dx * 4)},${Math.round(dz * 4)},${Math.round(reach * 4)}`;
    if (key === this.cutKey) return;
    this.cutKey = key;
    const cells = new Set();
    for (let i = 0; i <= 20; i++) {
      const d = (i / 20) * reach, x = p.x + (dx / len) * d, z = p.y + (dz / len) * d;
      for (const [ox, oz] of [[0, 0], [0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]]) cells.add(`${Math.floor(x + ox)},${Math.floor(z + oz)}`);
    }
    cutawayWalls(view, cells);
  }

  // 海の底（タイル8）に入れるか：水中仕様のマップで、水中ユニットがあり、マシンに乗っているとき
  canDive(x, z) {
    const map = this.map;
    // 第4章：溶岩の流れ（8）はマシンに乗っていれば渡れる（耐熱装甲がないと熱でダメージ）。生身は入れない
    if (map.heat && tileAt(map, x, z) === 8) {
      if (this.avatars?.[0]?.kind === 'machine') return true;
      if (!this.diveHint && this.active) { this.diveHint = true; ui.banner('溶岩が流れている', '生身では渡れない。マシンに乗っていこう'); }
      return false;
    }
    if (!map.dive || tileAt(map, x, z) !== 8) return false;
    const lead = this.avatars?.[0];
    if (lead?.kind === 'machine' && (G.flags.diveUnit || MACHINES[lead.mc?.type]?.amphibious)) return true;
    if (!this.diveHint && this.active) {
      this.diveHint = true;
      ui.banner('この先は海の中', G.flags.diveUnit ? 'マシンに乗っていないと入れない' : '水中仕様のマシンでないと進めない（タイドウォークの工房で改造できるらしい。伝説の機体ならそのまま歩ける）');
    }
    return false;
  }

  canStand(x, z, r) {
    const map = this.map;
    for (const [ox, oz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      const fx = Math.floor(x + ox), fz = Math.floor(z + oz);
      if (!isWalkable(map, fx, fz) && !this.canDive(fx, fz)) return false;
    }
    for (const n of this.npcs) if (Math.hypot(n.x - x, n.z - z) < 0.55) return false;
    for (const pk of this.parked) if (Math.hypot(pk.mc.loc.x - x, pk.mc.loc.y - z) < 0.75) return false;
    for (const pr of this.props) {
      const b = pr.data.block;
      if (!b || (pr.data.id === 'alpha' && !alphaInShop())) continue;
      const sideways = Math.abs(Math.sin(pr.data.rot || 0)) > 0.7;
      const hw = (sideways ? b[1] : b[0]) / 2 + r * 0.6, hd = (sideways ? b[0] : b[1]) / 2 + r * 0.6;
      if (Math.abs(x - pr.x) < hw && Math.abs(z - pr.z) < hd) return false;
    }
    for (const c of this.chests) if (Math.hypot(c.x - x, c.z - z) < (c.data.big ? 0.75 : 0.55)) return false;
    return true;
  }

  // ---------------------------------------------------------------- タイルの処理
  async checkTile() {
    const p = G.pos;
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    const key = `${tx},${ty}`;
    if (key === this.lastTile) return;
    this.lastTile = key;
    const map = this.map;
    const tile = tileAt(map, tx, ty);
    // 第3章：海の底（8）は、水中ユニットを付けたマシンで歩ける。敵は 'sea' の表から出る
    const info = tile === 8 && map.dive ? { ...TILES[8], enc: 'sea' } : tile === 8 && map.heat ? { ...TILES[8], enc: 'lava' } : TILES[tile];
    // 溶岩の上：耐熱装甲がないと、仲間のマシンの装甲が少しずつ減る（0にはならない）
    if (tile === 8 && map.heat && !G.flags.heatArmor) {
      let hurt = false;
      for (const mc of Object.values(G.machines)) if (mc.owned && mc.loc.type === 'party' && mc.armor > 1) { mc.armor = Math.max(1, mc.armor - Math.ceil(machineStats(mc).maxArmor * 0.03)); hurt = true; }
      if (hurt) { audio.sfx('flame'); this.heatHint = (this.heatHint || 0) + 1; if (this.heatHint % 6 === 1) ui.banner('熱い！ 装甲がとけていく', '耐熱装甲がないと溶岩の上ではダメージを受ける'); hud.update(true); }
    }
    if (info?.step === 'door') {
      const b = (map.buildings || []).find((bb) => bb.door[0] === tx && bb.door[1] === ty);
      if (b?.interior) {
        // 建物の中へ
        const inside = MAPS[b.interior];
        this.warp({ to: b.interior, tx: inside.arrive[0], ty: inside.arrive[1], dir: 'up', door: true });
        return;
      }
      if (b) {
        this.lock(true);
        const mapBefore = G.pos.map;
        await openFacility(b.facility, this);
        if (G.pos.map !== mapBefore || !this.active) return; // ガレージから出発した
        // ドアから一歩下がる
        G.pos.y = ty + 1.5; G.pos.x = tx + 0.5; G.pos.dir = 0;
        this.lastTile = `${tx},${ty + 1}`;
        this.trail.unshift({ x: G.pos.x, z: G.pos.y });
        hud.update(true);
        if (this.active) this.lock(false);
      }
      return;
    }
    if (info?.step === 'warp') {
      const w = (map.warps || []).find((ww) => ww.x === tx && ww.y === ty);
      if (w) { this.warp(w); return; }
    }
    this.markExplored();
    // エンカウント：3歩ごとに確率で判定。道の上は出ない。戦闘の直後とマップに入った直後の数歩も出ない
    if (map.encounter && info?.enc) {
      const enc = map.encounter;
      G.steps++;
      // 敵よけ（敵よけスプレー・ジャミングユニット）：歩くたびに残りの歩数が減る
      let repelK = 1;
      if (G.repel?.steps > 0) {
        G.repel.steps--;
        repelK = G.repel.rate;
        if (G.repel.steps === 30) ui.toast(`${esc(G.repel.name)}の効果が、もうすぐ切れそうだ（あと30歩）`);
        if (G.repel.steps <= 0) {
          const name = G.repel.name;
          G.repel = null;
          audio.sfx('cancel');
          ui.banner(`${name}の効果が切れた`, '敵に出会いやすさが元にもどった');
          // 切れたときはひとこと知らせる（v1.8）
          this.lock(true);
          await ui.say(`${name}の効果が切れた。また敵が出てくるかもしれない……`);
          if (this.active) this.lock(false);
        }
      }
      if ((G.encGrace || 0) > 0) { G.encGrace--; return; }
      G.encStep = (G.encStep || 0) + 1;
      if (G.encStep < (enc.every || 3)) return;
      G.encStep = 0;
      const rate = ((enc.rate || ENC_RATE)[info.enc] ?? 0.16) * repelK;
      if (Math.random() < rate) {
        const zone = (enc.zones || []).find((z) => tx >= z.x0 && tx < z.x1 && ty >= z.y0 && ty < z.y1);
        const tables = zone ? zone.tables : enc.tables;
        const table = tables[info.enc] || tables[Object.keys(tables)[0]];
        if (!table) return;
        const group = pickWeighted(table);
        G.encGrace = GRACE_STEPS;
        this.startBattle({ enemies: group.enemies, terrain: info.enc });
      }
    }
  }

  // ダンジョンの地図用に、歩いた場所（まわり3マス）を記録する
  markExplored() {
    const map = this.map;
    if (map.type === 'town' || map.type === 'interior' || map.noMap) return;
    const ex = (G.explored ||= {});
    let row = ex[map.id];
    if (!row || row.length !== map.width * map.height) row = '0'.repeat(map.width * map.height);
    const arr = row.split('');
    const px = Math.floor(G.pos.x), py = Math.floor(G.pos.y);
    for (let y = py - 3; y <= py + 3; y++) for (let x = px - 3; x <= px + 3; x++) {
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      if ((x - px) ** 2 + (y - py) ** 2 <= 12) arr[y * map.width + x] = '1';
    }
    ex[map.id] = arr.join('');
  }

  async warp(w) {
    this.lock(true);
    // 鍵が必要な入口
    if ((w.require && !G.flags[w.require]) || (w.requireDev && !devDoorOpen())) {
      await ui.say(w.lockedText || 'ここはまだ通れないようだ。');
      const p = G.pos;
      p.y += 1; // 一歩下がる
      this.lastTile = `${Math.floor(p.x)},${Math.floor(p.y)}`;
      this.lock(false);
      return;
    }
    audio.sfx(w.door || MAPS[w.to]?.type === 'interior' || this.map.type === 'interior' ? 'door' : 'warp');
    await ui.fade(true, 0.3);
    const toMap = MAPS[w.to];
    const fromMap = this.map;
    // 町に入る時：乗っているマシンは入口のガレージに預ける
    let note = null;
    if (toMap.type === 'town') {
      const riding = Object.values(G.machines).filter((mc) => mc.loc.type === 'party');
      for (const mc of riding) mc.loc = { type: 'garage', town: toMap.id };
      if (riding.length) note = 'マシンを入口のガレージに預けた';
    } else if (!toMap.machineAllowed) {
      // 生身でしか入れない場所：マシンは入口に停めておく
      Object.values(G.machines).filter((mc) => mc.loc.type === 'party').forEach((mc, i) => {
        mc.loc = { type: 'map', map: fromMap.id, x: G.pos.x + (i - 1) * 1.6, y: G.pos.y + 1.2, dir: 0 };
      });
    }
    G.pos = { map: w.to, x: w.tx + 0.5, y: w.ty + 0.5, dir: w.dir === 'up' ? Math.PI : 0 };
    if (toMap.encounter) { G.encGrace = Math.max(G.encGrace || 0, GRACE_STEPS); G.encStep = 0; }
    if (toMap.type === 'town') { G.lastTown = toMap.id; (G.flags.visited ||= {})[toMap.id] = true; }
    autosave();
    this.build();
    audio.playSong(toMap.bgm);
    await ui.fade(false, 0.35);
    if (toMap.type === 'interior') ui.toast(esc(toMap.name));
    else if (fromMap.type !== 'interior') ui.banner(esc(toMap.name), esc(toMap.subtitle || ''));
    if (note) ui.toast(note);
    hud.update(true);
    this.lock(false);
    // クリアしたあと、はじめてレンの修理屋に帰るとエンディング（v2.1〜）
    if (toMap.id === 'town1_shop' && G.flags.gameClear && !G.flags.homeEnding) flow.homeEnding?.();
  }

  // 開発者の部屋の展示台の上に、いま組んでいるロボット・キャラを飾る
  refreshShowcases() {
    for (const o of this.showcases || []) { this.scene.remove(o); disposeObject(o); }
    this.showcases = [];
    for (const pr of this.props || []) {
      if (!pr.data.showcase) continue;
      let o;
      if (pr.data.showcase === 'garage') {
        const mc = G.machines[G.flags.garageShow?.[this.map.town]];
        if (!mc?.owned) continue;
        o = buildMachineModel(machineSpec(mc));
      } else o = showcaseModel(pr.data.showcase);
      o.scale.multiplyScalar(pr.data.showcase === 'char' ? CHAR_SCALE * 1.4 : pr.data.showcase === 'garage' ? 0.78 : MACHINE_SCALE);
      o.position.set(pr.x, 0.42, pr.z);
      o.userData.showcase = pr.data.showcase;
      this.scene.add(o);
      this.showcases.push(o);
    }
  }

  // ---------------------------------------------------------------- 転送（ガレージの転送台・ワープユニット）
  // 体が光に包まれて消え、行き先の町の転送台（ワープユニットは町の入口）に光とともに現れる
  // ワープユニットで「ダンジョンの外へ」：入ってきた入口の外（フィールド）へ一瞬で出る（v1.8）
  async escapeDungeon() {
    const w = this.map.type === 'dungeon' && !this.map.noMap ? this.map.warps?.[0] : null;
    if (!w) return false;
    this.lock(true);
    audio.sfx('charge');
    await this.beam(false);
    audio.sfx('warp');
    this.lock(false);
    await this.warp({ ...w, door: false });
    return true;
  }

  async teleport(to, { pad = false, from = null } = {}) {
    this.lock(true);
    audio.sfx('charge');
    await this.beam(false);
    audio.sfx('warp');
    await ui.fade(true, 0.25, '#e8f6ff');
    // 乗っているマシンと、転送台を使ったガレージのマシンは行き先のガレージへ。
    // 仲間が使うマシンは、外に置いてきた物・ほかの町のガレージにある物も、行き先の町のガレージへ自動で戻る（v1.6）
    const mine = new Set(partyMembers().map((m) => m.machine).filter(Boolean));
    for (const mc of Object.values(G.machines)) {
      if (!mc.owned) continue;
      if (mc.loc.type === 'party' || mine.has(mc.id) || (pad && mc.loc.type === 'garage' && mc.loc.town === from)) mc.loc = { type: 'garage', town: to };
    }
    const gid = `${to}_garage`;
    const tp = MAPS[gid]?.props?.find((q) => q.pad);
    if (pad && tp) G.pos = { map: gid, x: tp.x, y: tp.y, dir: 0 };
    else { const [x, y] = townGate(to); G.pos = { map: to, x: x + 0.5, y: y + 0.5, dir: Math.PI }; }
    G.lastTown = to; (G.flags.visited ||= {})[to] = true;
    autosave();
    this.build();
    audio.playSong(MAPS[G.pos.map].bgm);
    for (const a of this.avatars) setOpacity(a.obj, 0);
    await ui.fade(false, 0.3);
    audio.sfx('heal');
    await this.beam(true);
    ui.banner(esc(MAPS[to].name), '転送完了');
    hud.update(true);
    this.lock(false);
  }

  // 光の柱（appear=false：光に包まれて消える／true：光の中から現れる）
  async beam(appear) {
    const p = G.pos;
    const gy = heightAt(this.map, p.x, p.y);
    const tex = getGlowTex();
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 3.6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    col.position.set(p.x, gy + 1.8, p.y);
    this.scene.add(col);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.2, 32), new THREE.MeshBasicMaterial({ color: 0xcff4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, gy + 0.05, p.y);
    this.scene.add(ring);
    const objs = this.avatars.map((a) => a.obj);
    const sparks = [];
    await tween(1.1, (k) => {
      const glow = Math.sin(k * Math.PI);
      col.material.opacity = glow * 0.38;
      const w = appear ? 0.5 + k * 0.5 : 1 - k * 0.5;
      col.scale.set(w, 1, w);
      ring.material.opacity = glow;
      ring.scale.setScalar(1 + k * 1.5);
      const vis = appear ? Math.min(1, Math.max(0, (k - 0.35) / 0.4)) : 1 - Math.min(1, Math.max(0, (k - 0.25) / 0.45));
      for (const o of objs) { setOpacity(o, vis); o.scale.y = o.userData.sy0 ?? (o.userData.sy0 = o.scale.x); o.scale.y = o.userData.sy0 * (0.6 + vis * 0.4 + (1 - vis) * 0.8); }
      if (Math.random() < 0.6) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xbff0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        sp.position.set(p.x + (Math.random() - 0.5) * 1.4, gy + Math.random() * 2.4, p.y + (Math.random() - 0.5) * 1.4);
        sp.scale.setScalar(0.15 + Math.random() * 0.15);
        this.scene.add(sp); sparks.push(sp);
      }
      for (const sp of sparks) sp.position.y += 0.05;
    }, Ease.linear);
    for (const o of objs) { o.scale.y = o.userData.sy0 ?? o.scale.x; if (appear) setOpacity(o, 1); }
    for (const m of [col, ring, ...sparks]) { this.scene.remove(m); m.geometry?.dispose?.(); m.material.dispose(); }
  }

  // ---------------------------------------------------------------- 戦闘へ
  async startBattle(opts) {
    this.lock(true);
    audio.sfx('encounter');
    await flashScreen();
    flow.startBattle(opts);
  }

  async challengeSymbol(s) {
    this.lock(true);
    const def = ENEMIES[s.data.enemies[0][0]];
    const b = BOUNTIES[s.data.bounty];
    if (b) await ui.say([{ name: '', text: `賞金首「${def.name}」だ！` }, { name: '', text: `賞金 ${b.reward.toLocaleString()} ギア。${def.desc}` }]);
    else await ui.say([{ name: '', text: `奥に巨大な影がうごめいている……「${def.name}」だ！` }, { name: '', text: def.desc }]);
    const ok = await ui.confirm('戦いますか？', '戦う', 'やめておく');
    if (!ok) {
      // 少し離れる
      const p = G.pos;
      const dx = p.x - s.x, dz = p.y - s.z, d = Math.hypot(dx, dz) || 1;
      for (const k of [2.4, 2.0, 1.6]) { const nx = s.x + (dx / d) * k, nz = s.z + (dz / d) * k; if (this.canStand(nx, nz, 0.4)) { p.x = nx; p.y = nz; break; } }
      this.lock(false);
      return;
    }
    this.startBattle({ enemies: s.data.enemies, terrain: tileTerrain(this.map, s.data), boss: true, symbol: s.data });
  }

  // ---------------------------------------------------------------- 調べる・タップ
  // 調べられる物の候補（正面にあるものを優先）
  candidates() {
    const p = G.pos;
    const out = [];
    const push = (kind, ref, x, z, edge, range, label, y = 1.2) => out.push({ kind, ref, x, z, d: Math.max(0, Math.hypot(x - p.x, z - p.y) - edge), range, label, y });
    for (const n of this.npcs) push('npc', n, n.x, n.z, 0, n.data.range || 1.6, '話す', 1.5);
    for (const pk of this.parked) push(pk.mc.owned ? 'parked' : 'hiddenMachine', pk, pk.mc.loc.x, pk.mc.loc.y, 0.5, 1.3, pk.mc.owned ? '乗る' : '調べる', 2.0);
    for (const s of this.symbols) push('symbol', s, s.x, s.z, 0.6, 1.0, '調べる', 1.6);
    for (const pr of this.props) {
      if (!pr.data.search || (pr.data.id === 'alpha' && !alphaInShop() && !pr.data.search.text)) continue;
      const b = pr.data.block || [0.8, 0.8];
      const dx = Math.max(0, Math.abs(p.x - pr.x) - b[0] / 2), dz = Math.max(0, Math.abs(p.y - pr.z) - b[1] / 2);
      out.push({ kind: 'prop', ref: pr, x: pr.x, z: pr.z, d: Math.hypot(dx, dz), range: 0.9, label: '調べる', y: 1.4 });
    }
    for (const c of this.chests) push('chest', c, c.x, c.z, c.data.big ? 0.6 : 0.4, 0.9, c.opened ? '調べる' : '開ける', 1.0);
    return out;
  }

  nearest() {
    const p = G.pos;
    const fx = Math.sin(p.dir || 0), fz = Math.cos(p.dir || 0);
    let best = null, bestScore = Infinity;
    for (const c of this.candidates()) {
      if (c.d > c.range) continue;
      const vx = c.x - p.x, vz = c.z - p.y, len = Math.hypot(vx, vz) || 1;
      const facing = (vx * fx + vz * fz) / len;
      if (facing < 0.25 && c.d > 0.3) continue; // 正面にないものは選ばない
      const score = c.d - facing * 0.5;
      if (score < bestScore) { bestScore = score; best = c; }
    }
    if (best) return best;
    // 崩れた岩（隠し通路）
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (tileAt(this.map, tx + dx, ty + dy) === 21) return { kind: 'crumble', label: '調べる' };
    return null;
  }

  // 正面に調べられる物があれば「調べる」ボタンをその上にポップアップ
  updateFocus() {
    const c = (!this.busy && !ui.busy) ? this.nearest() : null;
    this.focus = c;
    const pop = this.pop;
    if (!c || c.x == null) { pop.classList.remove('on'); return; }
    const v = V(c.x, c.y, c.z).project(this.camera);
    pop.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
    pop.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
    const label = `🔍 ${c.label}`;
    if (pop.textContent !== label) pop.textContent = label;
    pop.classList.add('on');
  }

  updateActionLabel() {
    const c = this.focus;
    const lead = this.avatars?.[0];
    let label = '調べる';
    if (c) label = c.label;
    else if (lead?.kind === 'machine' && this.map.type !== 'town') label = '降りる';
    hud.setAction(label, !!c);
  }

  async onAction() {
    const c = this.nearest();
    this.lock(true);
    try {
      if (!c) {
        if (this.avatars[0].kind === 'machine') await this.askUnboard();
        else ui.toast('とくに何もないようだ');
      } else await this.interact(c.kind, c.ref);
    } finally { if (this.active) this.lock(false); }
  }

  async interact(kind, ref) {
    if (kind === 'npc') await this.talk(ref);
    else if (kind === 'parked') await this.askBoard(ref.mc, ref.obj);
    else if (kind === 'hiddenMachine') await this.discoverMachine(ref);
    else if (kind === 'symbol') { this.lock(false); await this.challengeSymbol(ref); }
    else if (kind === 'prop') await this.searchProp(ref);
    else if (kind === 'chest') await this.openChest(ref);
    else if (kind === 'crumble') await ui.say('岩がもろく崩れている。……すき間を通り抜けられそうだ。');
    else if (kind === 'myMachine') await this.askUnboard();
  }

  // 調べる動作：先頭のキャラ（またはマシンのアーム）が手をのばす
  async reachAnim(x, z) {
    const lead = this.avatars[0];
    const p = G.pos;
    p.dir = Math.atan2(x - p.x, z - p.y);
    lead.obj.rotation.y = p.dir;
    if (lead.kind === 'machine') {
      const arm = lead.obj.userData.armR;
      if (arm) { audio.sfx('hatch'); await tween(0.3, (k) => { arm.rotation.x = -1.3 * k; }); }
      return async () => { if (arm) await tween(0.25, (k) => { arm.rotation.x = -1.3 * (1 - k); }); };
    }
    const armR = lead.obj.getObjectByName('armR');
    await tween(0.2, (k) => { if (armR) armR.rotation.x = -1.4 * k; lead.obj.position.y = Math.sin(k * Math.PI) * 0.08; });
    return async () => { await tween(0.15, (k) => { if (armR) armR.rotation.x = -1.4 * (1 - k); }); };
  }

  // 家具を調べる
  async searchProp(pr) {
    const sr = pr.data.search;
    const back = await this.reachAnim(pr.x, pr.z);
    try {
      if (sr.event) { await this.propEvent(sr.event, pr); return; }
      if (sr.text) { await ui.say(sr.text); return; }
      if (!sr.loot) return;
      const key = `${this.map.id}:${pr.data.id}`;
      if (G.flags.taken[key]) { await ui.say('もう何も入っていない。'); return; }
      G.flags.taken[key] = true;
      pr.taken = true;
      const got = [giveLoot(sr.loot)];
      if (sr.rare && Math.random() < sr.rare.rate) got.push(giveLoot(sr.rare));
      audio.sfx(got.length > 1 ? 'levelup' : 'buy');
      const head = sr.found || `${{ f_dresser: 'タンス', f_crate: '木箱', f_barrel: 'たる', f_toolbox: '工具箱', f_table: 'テーブル' }[pr.data.model] || 'それ'}を調べた。`;
      await ui.say([head, `${got.join('と')}を手に入れた！${got.length > 1 ? '（めずらしい素材だ！）' : ''}`]);
      autosave();
    } finally { await back(); }
  }

  async propEvent(name, pr) {
    if (name === 'rideAlpha') {
      // だれも乗っていない伝説の機体に乗る（いままでのマシンはこのガレージに預ける）。
      // アルファはレン。オメガ・ガイアは専用の仲間がいればその仲間、いなければレン（v2.8.2）
      const mc = pr?.mc || G.machines.alpha;
      const nm = machineName(mc);
      const own = { omega: 'shion', gaia: 'gina' }[mc.type];
      const cands = partyMembers().filter((m) => canPilot(m, mc));
      const intro = { alpha: '目を覚ましたアルファが、ガレージで静かに待っている。胸のコアが青白く光った。', omega: `${nm}が、ガレージで静かに待っている。漆黒の装甲に赤い光が走った。`, gaia: `${nm}が、ガレージで静かに待っている。深紅の装甲が熱をおびて光った。` }[mc.type];
      await ui.say([{ name: '', text: intro }]);
      let r = cands.find((m) => m.id === own) || G.members.ren;
      if (cands.length > 1) {
        const pick = await ui.menu({ title: `${esc(nm)}にだれが乗る？`, items: cands.map((m) => ({ label: esc(m.name), right: m.machine ? esc(machineName(G.machines[m.machine])) : '', value: m })), cancel: true });
        if (!pick) return;
        r = pick;
      } else if (!(await ui.confirm(`${esc(r.name)}が${esc(nm)}に乗りますか？（いまのマシンはこのガレージに預けます）`))) return;
      r.machine = mc.id;
      audio.sfx('seal');
      const line = { alpha: 'いくぞ、アルファ！ ……今度は、いっしょに戦おう！', omega: '……行こう、オメガ。', gaia: 'さあ、暴れるよ、ガイア！' }[mc.type];
      await ui.say([{ name: r.name, text: line }, { name: '', text: `（店の人に話して「乗り込んで出発」で、${nm}に乗って出られる）` }]);
      this.build();
      hud.update(true);
      return;
    }
    if (name === 'teleport') {
      // 転送台：上に乗ってから行き先を選ぶ
      const p = G.pos;
      if (Math.hypot(p.x - pr.x, p.y - pr.z) > 0.5) {
        await tween(0.3, (k) => { p.x += (pr.x - p.x) * k; p.y += (pr.z - p.y) * k; });
      }
      await ui.say('転送台が青白く光っている。行ったことのある町の転送台へ、一瞬で移動できるらしい。');
      await teleportMenu(this, true);
      return;
    }
    if (name === 'keypad') {
      if (devDoorOpen()) { await ui.say('扉はもう開いている。'); return; }
      await ui.say('扉の横のキーパネル。8桁の暗証番号を入れると開くようだ。');
      if (!(await keypad())) return;
      openDevDoor();
      audio.sfx('hatch');
      const door = this.props.find((d) => d.data.devDoor);
      if (door?.obj) await tween(1.0, (k) => { door.obj.position.y = k * 2.2; }, Ease.inOut);
      await ui.say('ピッ……ゴゴゴゴ。重い扉がゆっくりと上がっていった。');
      return;
    }
    if (name === 'gearMachine') { await gearMachine(); return; }
    if (name === 'devStore') { await devStore(this); return; }
    if (name === 'hangar') { await ui.say('格納庫モニター。持っているマシンとパーツが全部ここに記録されている。'); await hangarList(this); this.refreshShowcases(); return; }
    if (name === 'hangarView') {
      const mc = G.machines[G.flags.garageShow?.[this.map.town]];
      if (mc?.owned) await machineViewer(this, mc); else { await ui.say('展示台。格納庫モニターの一覧で選んだマシンがここに出てくる。'); await hangarList(this); }
      this.refreshShowcases();
      return;
    }
    if (name === 'robotStation') { await robotStation(this); this.refreshShowcases(); return; }
    if (name === 'charStation') { await charStation(this); this.refreshShowcases(); return; }
    if (name === 'testTargets') {
      const v = await ui.menu({ title: '試し撃ちの的', header: '単体・グループ・全体の3種類の並びで、武器の威力や演出を確かめられる', items: [{ label: 'ロボットで試し撃ち（ロボットの展示台）', value: 'robot' }, { label: '生身で試し撃ち（キャラの展示台）', value: 'char' }] });
      if (v === 'robot') await robotStation(this);
      if (v === 'char') await charStation(this);
      this.refreshShowcases();
      return;
    }
    if (name === 'tuning') { await ui.say('バランス調整の端末だ。値段・攻撃力・敵の強さを数字で変えられるらしい。'); await tuningMenu(); return; }
    if (name === 'rest') await restAtHome();
    else if (name === 'alpha') await runEvent('alphaRepair', this);
    else if (name === 'wanted') await bountyList();
    else if (name === 'bookshelf') {
      if (G.flags.stairsOpen) { await ui.say('本棚の裏に、地下へ続く階段がある。'); return; }
      const r = G.members.ren.name;
      await ui.say([
        '古い本や設計図がぎっしり並んだ本棚だ。',
        '……一冊だけ、やけに重たい本がある。引っぱってみると――',
      ]);
      audio.sfx('press');
      G.flags.stairsOpen = true;
      const from = pr.x;
      await tween(1.2, (k) => { pr.x = from + 1.1 * k; if (pr.obj) { pr.obj.position.x = pr.x; pr.obj.position.y = Math.sin(k * 40) * 0.01; } }, Ease.inOut);
      audio.sfx('hatch');
      await ui.say([
        { name: '', text: 'ゴゴゴ……と音を立てて本棚が動き、床に地下への階段が現れた！' },
        { name: r, text: 'こんな仕掛けが……！ ボルツじいさんの言ってた変な音って、これのことか！' },
      ]);
      autosave();
    }
  }

  // 宝箱を開ける（マシンに乗っているときはアームで開ける）
  async openChest(c) {
    const key = `${this.map.id}:${c.data.id}`;
    if (c.opened) { await ui.say('宝箱はからっぽだ。'); return; }
    const back = await this.reachAnim(c.x, c.z);
    audio.sfx('hatch');
    if (c.lid) await tween(0.45, (k) => { c.lid.rotation.x = -1.9 * k; }, Ease.outBack);
    c.opened = true;
    G.flags.opened[key] = true;
    const got = c.data.contents.map((x) => giveLoot(x));
    audio.sfx(c.data.big || c.data.secret ? 'seal' : 'levelup');
    const lead = this.avatars[0];
    const how = lead.kind === 'machine' ? `${machineName(lead.mc)}のアームで宝箱を開けた！` : '宝箱を開けた！';
    const lines = [how, `${got.join('と')}を手に入れた！`];
    if (c.data.secret) lines.push('隠し通路の奥でしか手に入らない、限定パーツだ！');
    await back();
    await ui.say(lines);
    autosave();
  }

  // ---------------------------------------------------------------- クリックで歩く（v2.6〜。PCのマウス）
  clearClickPath() {
    this.clickPath = null; this.clickAfter = null; this.clickStuck = 0;
    if (this.clickMark) this.clickMark.visible = false;
  }
  // (tx, tz) へ歩く。after を渡すと、着いたらその物に話しかける・調べる
  walkTo(tx, tz, after = null) {
    const p = G.pos, r = this.avatars?.[0]?.kind === 'machine' ? 0.4 : 0.26;
    const path = this.findPath(Math.floor(p.x), Math.floor(p.y), Math.floor(tx), Math.floor(tz), !!after);
    if (!path) { ui.toast('そこへは行けないようだ'); return; }
    // 最後の点は、物なら手前のマス、地面ならクリックした場所そのもの
    if (!after && this.canStand(tx, tz, r)) path.push({ x: tx, z: tz });
    this.clickPath = path; this.clickAfter = after; this.clickStuck = 0;
    if (!this.clickMark) {
      this.clickMark = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.4, 24), new THREE.MeshBasicMaterial({ color: 0x7af0ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
      this.clickMark.rotation.x = -Math.PI / 2;
    }
    if (this.clickMark.parent !== this.scene) this.scene.add(this.clickMark);
    const last = path[path.length - 1] || { x: tx, z: tz };
    this.clickMark.position.set(after ? tx : last.x, heightAt(this.map, last.x, last.z) + 0.05, after ? tz : last.z);
    this.clickMark.visible = true;
  }
  // 1フレーム分：つぎの点への向き（着いたら null）
  clickStep() {
    const p = G.pos;
    while (this.clickPath.length && Math.hypot(this.clickPath[0].x - p.x, this.clickPath[0].z - p.y) < 0.18) this.clickPath.shift();
    if (this.clickAfter) {
      const o = this.clickAfter;
      const ent = o.userData.entity;
      const ref = ent?.ref;
      const d = ref ? Math.hypot(ref.x - p.x, ref.z - p.y) : Math.hypot(o.position.x - p.x, o.position.z - p.y);
      const reach = { parked: 2.6, hiddenMachine: 2.6, npc: 2.2, prop: 1.6, chest: 1.6, symbol: 3 }[ent?.kind] ?? 1.8;
      if (d < reach) { this.clearClickPath(); p.dir = Math.atan2(o.position.x - p.x, o.position.z - p.y); this.actOn(o); return null; }
    }
    if (!this.clickPath.length || (this.clickStuck || 0) > 0.6) { this.clearClickPath(); return null; }
    const w = this.clickPath[0];
    const dx = w.x - p.x, dz = w.z - p.y, len = Math.hypot(dx, dz) || 1;
    return { x: dx / len, z: dz / len };
  }
  // マスの上の道のり（A*、斜めも）。toObj＝行き先が物のときは、その手前の歩けるマスまで
  findPath(sx, sy, tx, ty, toObj) {
    const map = this.map, W = map.width, H = map.height;
    const ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (isWalkable(map, x, y) || this.canDive(x, y));
    if (!ok(tx, ty) || toObj) {
      // 行き先が歩けないとき（物の上など）は、まわりのいちばん近い歩けるマス
      let best = null;
      for (let r = toObj ? 1 : 0; r <= 4 && !best; r++) for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) {
        if (!ok(x, y)) continue;
        const d = Math.hypot(x - sx, y - sy);
        if (!best || d < best.d) best = { x, y, d };
      }
      if (!best) return null;
      tx = best.x; ty = best.y;
    }
    const key = (x, y) => y * W + x;
    const open = [{ x: sx, y: sy, g: 0, f: 0 }];
    const came = new Map(), gs = new Map([[key(sx, sy), 0]]);
    const goal = key(tx, ty);
    let n = 0;
    while (open.length && n++ < 30000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const c = open.splice(bi, 1)[0];
      const ck = key(c.x, c.y);
      if (ck === goal) {
        const pts = [];
        for (let k = ck; k !== key(sx, sy); k = came.get(k)) pts.unshift({ x: (k % W) + 0.5, z: Math.floor(k / W) + 0.5 });
        return pts;
      }
      for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = c.x + ddx, ny = c.y + ddy;
        if (!ok(nx, ny)) continue;
        if (ddx && ddy && (!ok(c.x + ddx, c.y) || !ok(c.x, c.y + ddy))) continue; // 角はすり抜けない
        const g = c.g + (ddx && ddy ? 1.414 : 1);
        const nk = key(nx, ny);
        if (g >= (gs.get(nk) ?? Infinity)) continue;
        gs.set(nk, g); came.set(nk, ck);
        open.push({ x: nx, y: ny, g, f: g + Math.hypot(tx - nx, ty - ny) });
      }
    }
    return null;
  }

  async onTap(pt) {
    const ndc = new THREE.Vector2((pt.x / window.innerWidth) * 2 - 1, -(pt.y / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.pickEntity();
    if (hit) {
      // マウスで遠くの人・宝箱などをクリックしたら、近くまで歩いていってから話す・調べる
      if (pt.mouse && hit.dist > hit.reach) { this.walkTo(hit.o.position.x, hit.o.position.z, hit.o); return; }
      await this.actOn(hit.o);
      return;
    }
    // マウスで地面をクリック：そこへ歩いていく
    if (pt.mouse) {
      const p = G.pos;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -heightAt(this.map, p.x, p.y));
      const at = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(plane, at)) this.walkTo(at.x, at.z);
    }
  }

  // 画面でクリック・タップした物（人・マシン・賞金首・家具・宝箱）。reach＝そこから話せる・調べられる距離
  pickEntity() {
    const objs = [...this.npcs.map((n) => n.obj), ...this.parked.map((p) => p.obj), ...this.symbols.map((s) => s.obj), ...this.avatars.map((a) => a.obj), ...this.props.filter((pr) => pr.obj && pr.data.search).map((pr) => { pr.obj.userData.entity = { kind: 'prop', ref: pr }; return pr.obj; }), ...this.chests.map((c) => { c.obj.userData.entity = { kind: 'chest', ref: c }; return c.obj; })];
    const hits = this.raycaster.intersectObjects(objs, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.entity) o = o.parent;
    if (!o) return null;
    const ent = o.userData.entity;
    const p = G.pos;
    const dist = ent.ref ? Math.hypot(ent.ref.x - p.x, ent.ref.z - p.y) : Math.hypot(o.position.x - p.x, o.position.z - p.y);
    const reach = { myMachine: 99, parked: 3, hiddenMachine: 3, npc: 2.6, prop: 2.0, chest: 2.0, symbol: 99 }[ent.kind] ?? 2;
    return { o, ent, dist, reach };
  }

  async actOn(o) {
    const ent = o.userData.entity;
    const p = G.pos;
    const dist = o.position.distanceTo(V(p.x, 0, p.y));
    this.lock(true);
    try {
      if (ent.kind === 'myMachine') { if (ent.member === this.avatars[0].member) await this.askUnboard(); }
      else if (ent.kind === 'parked' || ent.kind === 'hiddenMachine') {
        if (dist > 3) ui.toast('もっと近づこう');
        else if (ent.kind === 'parked') await this.askBoard(ent.mc, o);
        else await this.discoverMachine(this.parked.find((pk) => pk.obj === o));
      } else if (ent.kind === 'npc') {
        if (dist > 2.6) ui.toast('もっと近づこう');
        else await this.talk(this.npcs.find((n) => n.obj === o));
      } else if (ent.kind === 'prop' || ent.kind === 'chest') {
        const r = ent.ref;
        if (Math.hypot(r.x - p.x, r.z - p.y) > 2.0) ui.toast('もっと近づこう');
        else if (ent.kind === 'prop') await this.searchProp(r); else await this.openChest(r);
      } else if (ent.kind === 'symbol') {
        if (dist > 3.5) ui.toast('賞金首だ。近づくと戦闘になる');
        else { this.lock(false); await this.challengeSymbol(this.symbols.find((s) => s.obj === o)); }
      }
    } finally { if (this.active) this.lock(false); }
  }

  async talk(n) {
    if (n.data.facility) {
      // お店の人：施設のメニューを開く
      const p0 = G.pos;
      this.avatars[0].obj.rotation.y = Math.atan2(n.x - p0.x, n.z - p0.y);
      const mapBefore = G.pos.map;
      await openFacility(n.data.facility, this, n.data.shop);
      if (G.pos.map !== mapBefore) return;
      hud.update(true);
      return;
    }
    if (n.data.event) {
      const p0 = G.pos;
      n.obj.rotation.y = Math.atan2(p0.x - n.x, p0.y - n.z);
      await runEvent(n.data.event, this);
      if (this.active) this.build();
      return;
    }
    const p = G.pos;
    n.obj.rotation.y = Math.atan2(p.x - n.x, p.y - n.z);
    this.avatars[0].obj.rotation.y = Math.atan2(n.x - p.x, n.z - p.y);
    G.pos.dir = this.avatars[0].obj.rotation.y;
    const lines = n.data.lines.map((l) => ({ name: n.data.name, text: l.replace(/レン/g, G.members.ren.name) }));
    await ui.say(lines);
  }

  // ---------------------------------------------------------------- 乗る・降りる
  async askBoard(mc, obj) {
    let pilot = partyMembers().find((m) => m.machine === mc.id);
    const name = machineName(mc);
    if (mc.broken) { await ui.say(`${name}は大破している。ガレージで修理しないと動かない。`); return; }
    if (!pilot) {
      const cands = partyMembers().filter((m) => canPilot(m, mc) && !inMachine(m));
      if (!cands.length) { await ui.say('乗れる仲間がいない。'); return; }
      const v = await ui.menu({ title: `${esc(name)}に誰が乗る？`, items: cands.map((m) => ({ label: esc(m.name), value: m.id, right: m.machine ? `今：${esc(machineName(G.machines[m.machine]))}` : '生身' })) });
      if (!v) return;
      pilot = G.members[v];
      pilot.machine = mc.id;
    } else if (inMachine(pilot)) { return; } else {
      const ok = await ui.menu({ title: esc(name), items: [{ label: '乗る', value: true }, { label: 'やめる', value: false }] });
      if (!ok) return;
    }
    await this.boardAnim(pilot, mc, obj);
  }

  async boardAnim(pilot, mc, obj) {
    const av = this.avatars.find((a) => a.member === pilot);
    const hatch = obj.userData.hatch;
    audio.sfx('hatch');
    if (hatch) await tween(0.35, (t) => { hatch.rotation.x = -1.8 * t; });
    const start = av.obj.position.clone();
    const target = hatch ? hatch.getWorldPosition(new THREE.Vector3()) : obj.position.clone().add(V(0, 1.4, 0));
    await tween(0.55, (t) => {
      av.obj.position.lerpVectors(start, target, t);
      av.obj.position.y += Math.sin(t * Math.PI) * 0.9;
      av.obj.scale.setScalar(CHAR_SCALE * (1 - t * 0.6));
    }, Ease.inOut);
    av.obj.visible = false;
    if (hatch) await tween(0.3, (t) => { hatch.rotation.x = -1.8 * (1 - t); });
    audio.sfx('ok');
    // 乗り込み完了：停めてあったマシンが先頭の位置になる
    mc.loc = { type: 'party' };
    if (pilot === partyMembers()[0]) { G.pos.x = obj.position.x; G.pos.y = obj.position.z; G.pos.dir = obj.rotation.y; }
    this.scene.remove(obj);
    this.parked = this.parked.filter((pk) => pk.obj !== obj);
    // 近くに自分のマシンがある仲間も一緒に乗る
    for (const m of partyMembers()) {
      if (m === pilot || !m.machine || inMachine(m)) continue;
      const pk = this.parked.find((pp) => pp.mc.id === m.machine);
      if (pk && Math.hypot(pk.mc.loc.x - G.pos.x, pk.mc.loc.y - G.pos.y) < 7) {
        pk.mc.loc = { type: 'party' };
        this.scene.remove(pk.obj);
        this.parked = this.parked.filter((pp) => pp !== pk);
      }
    }
    this.buildParty();
    this.trail = [{ x: G.pos.x, z: G.pos.y }, { x: G.pos.x, z: G.pos.y + 0.01 }];
    this.updateFollowers(0, true);
    hud.update(true);
    autosave();
  }

  async askUnboard() {
    const lead = this.avatars[0];
    if (lead.kind !== 'machine') return;
    if (this.map.type === 'town') return;
    const ok = await ui.menu({ title: esc(machineName(lead.mc)), items: [{ label: '降りる', value: true }, { label: 'やめる', value: false }] });
    if (!ok) return;
    // 全員降りて、マシンはその場に停める
    const riding = this.avatars.filter((a) => a.kind === 'machine');
    for (const a of riding) {
      a.mc.loc = { type: 'map', map: this.map.id, x: a.obj.position.x, y: a.obj.position.z, dir: a.obj.rotation.y };
    }
    audio.sfx('hatch');
    const leadObj = lead.obj;
    const hatch = leadObj.userData.hatch;
    if (hatch) await tween(0.3, (t) => { hatch.rotation.x = -1.8 * t; });
    for (const a of riding) { this.scene.remove(a.obj); this.addParked(a.mc); }
    // 先頭はマシンの横に降りる
    const p = G.pos;
    const side = [[1.1, 0.6], [-1.1, 0.6], [0, 1.2], [0, -1.2], [1.1, -0.6], [-1.1, -0.6]];
    for (const [ox, oz] of side) { if (this.canStand(p.x + ox, p.y + oz, 0.26)) { p.x += ox; p.y += oz; break; } }
    this.buildParty();
    const av = this.avatars[0];
    const pk = this.parked.find((pp) => pp.mc === lead.mc);
    const from = pk ? pk.obj.userData.hatch?.getWorldPosition(new THREE.Vector3()) : null;
    if (from) {
      const to = V(p.x, 0, p.y);
      av.obj.scale.setScalar(CHAR_SCALE * 0.4);
      await tween(0.45, (t) => { av.obj.position.lerpVectors(from, to, t); av.obj.position.y += Math.sin(t * Math.PI) * 0.6; av.obj.scale.setScalar(CHAR_SCALE * (0.4 + 0.6 * t)); });
    }
    this.trail = [{ x: p.x, z: p.y }, { x: p.x, z: p.y + 0.01 }];
    this.updateFollowers(0, true);
    hud.update(true);
    autosave();
  }

  // シークレットマシン（レンの家の地下に眠るオメガ）を見つける
  async discoverMachine(pk) {
    const mc = pk.mc;
    const def = MACHINES[mc.type];
    const r = G.members.ren.name;
    if (mc.type === 'gaia') { await this.discoverGaia(pk); return; }
    await ui.say([
      { name: '', text: '格納庫の奥で、漆黒の機体が静かに眠っている。赤いラインが、呼吸するように明滅している……。' },
      { name: r, text: 'うそだろ……うちの地下に、こんなものが……！？' },
      { name: r, text: 'この形……アルファにそっくりだ。フレームも、コアの作りも。まるで兄弟みたいな……。' },
      { name: '', text: '機体の胸に、かすれた文字が刻まれている。「OMEGA」――。' },
      { name: r, text: 'オメガ……。こっちは封印もない。完全に動く。誰でも乗れるぞ！' },
      { name: r, text: '父さんは、どうしてこんなものを隠してたんだろう……。' },
    ]);
    mc.owned = true;
    G.flags.omegaFound = true;
    const st = machineStats(mc);
    mc.armor = st.maxArmor; mc.en = st.maxEn;
    audio.sfx('seal');
    // 格納庫のリフトでガレージへ上げる
    pk.obj.userData.entity = null;
    await tween(1.2, (k) => { pk.obj.position.y = k * 4; });
    this.scene.remove(pk.obj);
    this.parked = this.parked.filter((p) => p !== pk);
    mc.loc = { type: 'garage', town: 'town1' };
    ui.banner(`${esc(def.name)}を手に入れた！`, '制限なしで誰でも乗れる最強クラスのシークレットマシン');
    await ui.say('オメガは格納庫のリフトで、ラストヘイヴンのガレージへ運ばれた。（ガレージの「乗る人を決める」で乗りかえられます）');
    autosave();
  }

  // 第2章：風の惑星の大地の底に眠る深紅の重装機ガイア（ジーナの最強機）
  async discoverGaia(pk) {
    const mc = pk.mc;
    const r = G.members.ren.name, g = G.members.gina.name;
    const gj = G.members.gina.joined;
    await ui.say([
      { name: '', text: '崩れた岩の奥の古い格納庫。その真ん中で、深紅の巨人がひざをついて眠っている。' },
      { name: r, text: 'でっかい……！ 装甲の厚さ、ゴライアスの倍はあるぞ。' },
      { name: '', text: '胸の装甲に、土ぼこりにまみれた文字が刻まれている。「GAIA」――。' },
      ...(gj ? [
        { name: g, text: '……なんだい、この感じ。こいつが、あたしを呼んでる気がする。' },
        { name: '', text: `${g}が操縦席に手をかけると、機体の目に赤い光がともった。` },
        { name: g, text: 'ははっ、動いた！ 決まりだね。こいつはあたしの相棒だ！' },
        { name: r, text: 'アルファとオメガに似た作りだ……。三機目の兄弟機、なのかな。' },
      ] : [{ name: r, text: 'アルファやオメガと同じ作りだ……。三機目の兄弟機、なのかも。' }]),
    ]);
    mc.owned = true;
    G.flags.gaiaFound = true;
    const st = machineStats(mc);
    mc.armor = st.maxArmor; mc.en = st.maxEn;
    audio.sfx('seal');
    pk.obj.userData.entity = null;
    await tween(1.2, (k) => { pk.obj.position.y = k * 4; });
    this.scene.remove(pk.obj);
    this.parked = this.parked.filter((p) => p !== pk);
    const town = G.lastTown && MAPS[G.lastTown] ? G.lastTown : 'town4';
    mc.loc = { type: 'garage', town };
    ui.banner('ガイアを手に入れた！', '深紅の重装機。ジーナとレンが乗れる');
    await ui.say(`ガイアは格納庫のリフトで、${MAPS[town].name}のガレージへ運ばれた。（ガレージの「乗る人を決める」で${gj ? g : 'ジーナ'}を乗せられます）`);
    autosave();
  }

  // ---------------------------------------------------------------- メニュー
  async onMenu() {
    this.lock(true);
    try { await openFieldMenu(this); } finally { if (this.active) this.lock(false); }
    hud.update(true);
  }
}

function turnTo(cur, target, k) {
  let d = target - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return cur + d * Math.min(1, k);
}

function pickWeighted(table) {
  const total = table.reduce((a, e) => a + e.w, 0);
  let r = Math.random() * total;
  for (const e of table) { r -= e.w; if (r <= 0) return e; }
  return table[0];
}

function tileTerrain(map, s) {
  return TILES[tileAt(map, s.x, s.y)]?.enc || (map.type === 'dungeon' ? 'metal' : 'sand');
}

async function flashScreen() {
  for (let i = 0; i < 2; i++) { await ui.fade(true, 0.08, '#fff'); await ui.fade(false, 0.08, '#fff'); }
  await ui.fade(true, 0.25, '#000');
  await wait(0.05);
}
