// タイトル画面：「アルファマックス」のロゴとスタート。続きから／はじめからを選ぶ
import * as THREE from 'three';
import { ui, esc } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { save, describeSave } from '../core/save.js';
import { input } from '../core/input.js';
import { setGlow, disposeObject } from '../core/assets.js';
import { buildMachineModel, animateMachine } from '../models/mech.js';
import { MACHINES } from '../data/machines.js';
import { rand } from '../core/tween.js';
import { makeLogo } from '../core/logo.js';

export class TitleScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 3000);
    this.t = 0;
  }

  async enter(handlers) {
    this.handlers = handlers;
    this.busy = false;
    const s = this.scene;
    s.background = new THREE.Color(0x05060c);
    const starGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i < 2000; i++) { const v = new THREE.Vector3(rand(-1, 1), rand(-0.2, 1), rand(-1, -0.2)).normalize().multiplyScalar(rand(400, 1200)); pts.push(v.x, v.y, v.z); }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    s.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false })));
    s.add(new THREE.HemisphereLight(0x8090c0, 0x201810, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-4, 6, 6); s.add(key);
    const rim = new THREE.DirectionalLight(0x60c0ff, 2.5); rim.position.set(5, 3, -6); s.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.6, metalness: 0.4 }));
    floor.rotation.x = -Math.PI / 2; s.add(floor);
    const def = MACHINES.alpha;
    this.alpha = buildMachineModel({ parts: def.parts, colors: def.colors, weapons: [{ id: 'lm1' }, { id: 'lzblade', plus: 5 }, { id: 'rg1' }, { id: 'hm1' }, { id: 'hm1' }], glow: 1.8 });
    s.add(this.alpha);
    this.camera.position.set(0, 1.8, 7.2);
    this.camera.lookAt(0, 2.3, 0);

    this.el = document.createElement('div');
    this.el.className = 'title-screen';
    this.el.innerHTML = `
      <div class="title-logo"></div>
      <div class="title-press">タップしてスタート</div>
      <div class="title-foot">v0.9 第1章「土」の惑星 ／ © Alpha Max project</div>`;
    this.el.querySelector('.title-logo').appendChild(makeLogo());
    document.body.appendChild(this.el);
    this.el.addEventListener('click', () => this.start());
    this.offKey = input.on('action', () => this.start());
    audio.playSong('title');
  }

  async exit() {
    this.el?.remove();
    this.offKey?.();
    for (const o of [...this.scene.children]) { this.scene.remove(o); disposeObject(o); }
  }

  update(dt) {
    this.t += dt;
    if (this.alpha) {
      this.alpha.rotation.y = Math.sin(this.t * 0.3) * 0.6 + 0.4;
      animateMachine(this.alpha, this.t, 0);
      setGlow(this.alpha, 1.3 + Math.sin(this.t * 2) * 0.5);
    }
  }

  async start() {
    if (this.busy || ui.busy) return;
    this.busy = true;
    audio.sfx('ok');
    const auto = save.loadAuto();
    const slots = save.summaries();
    const anySlot = slots.some((s) => s.data);
    for (;;) {
      const v = await ui.menu({
        title: 'スタート', wide: true,
        items: [
          { label: 'オートセーブから続ける', value: 'auto', disabled: !auto, right: auto ? esc(describeSave(auto)) : '' },
          { label: 'セーブした所から続ける', value: 'slot', disabled: !anySlot },
          { label: 'はじめから', value: 'new' },
        ],
      });
      if (!v) break;
      if (v === 'auto') { this.handlers.continue(auto); return; }
      if (v === 'new') {
        if ((auto || anySlot) && !(await ui.confirm('はじめから遊びますか？（セーブデータは消えません）'))) continue;
        // 一度クリアしていたら、伝説の機体をすべて最強にして始めることもできる（v2.0〜）
        let legend = false;
        if (save.hasCleared()) {
          const how = await ui.menu({
            title: 'どちらで始める？', wide: true, desc: true,
            items: [
              { label: 'ふつうに始める', value: 'normal', desc: '最初の旅と同じ。アルファは封印されたところから' },
              { label: '✦ 伝説の機体をすべて最強にして始める', value: 'legend', desc: 'アルファは最初から「アルファマックス」（ステラ・ブレイカーも最終段階）。オメガ・ガイアもラストヘイヴンのガレージにいて、3機ともフレーム・エンジン強化が最大、武器は+5' },
            ],
          });
          if (!how) continue;
          legend = how === 'legend';
        }
        this.handlers.newGame({ legend }); return;
      }
      if (v === 'slot') {
        const n = await ui.menu({ title: 'どのデータで続ける？', wide: true, items: slots.map((s) => ({ label: `セーブ${s.n}`, right: esc(describeSave(s.data)), value: s.n, disabled: !s.data })) });
        if (!n) continue;
        this.handlers.continue(save.loadSlot(n)); return;
      }
    }
    this.busy = false;
  }
}
