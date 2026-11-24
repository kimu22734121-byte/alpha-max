// フィールド画面のHUD（仲間の体力・マシンの装甲・ギア・メニューボタン・調べるボタン）
import { G, partyMembers, memberStats, machineStats, machineName } from '../game/state.js';
import { MAPS } from '../data/maps.js';
import { input } from './input.js';
import { esc, fmt } from './ui.js';

let root, plates, gearEl, mapEl, actBtn, menuBtn, last = '';

export const hud = {
  init(parent) {
    root = document.createElement('div');
    root.className = 'hud hidden';
    root.innerHTML = `
      <div class="hud-party"></div>
      <div class="hud-top"><div class="hud-map"></div><div class="hud-gear"></div></div>
      <button class="hud-menu" aria-label="メニュー">☰<span>メニュー</span></button>
      <button class="hud-action" aria-label="調べる">調べる</button>`;
    parent.appendChild(root);
    plates = root.querySelector('.hud-party');
    gearEl = root.querySelector('.hud-gear');
    mapEl = root.querySelector('.hud-map');
    menuBtn = root.querySelector('.hud-menu');
    actBtn = root.querySelector('.hud-action');
    const stop = (e) => { e.stopPropagation(); };
    for (const b of [menuBtn, actBtn]) { b.addEventListener('pointerdown', stop); }
    menuBtn.addEventListener('click', (e) => { e.stopPropagation(); input.emit('menu'); });
    actBtn.addEventListener('click', (e) => { e.stopPropagation(); input.emit('action'); });
  },
  show() { root.classList.remove('hidden'); this.update(true); },
  hide() { root.classList.add('hidden'); },
  setAction(label) { if (actBtn.textContent !== label) actBtn.textContent = label; },
  update(force = false) {
    if (!G) return;
    const html = partyMembers().map((m) => {
      const st = memberStats(m);
      const mc = m.machine ? G.machines[m.machine] : null;
      const riding = mc && mc.loc.type === 'party';
      let mline = '';
      if (riding) {
        const ms = machineStats(mc);
        mline = `<div class="pl-mc"><span class="pl-mcname">${esc(machineName(mc))}</span>
          <div class="bar armor"><i style="width:${(100 * mc.armor) / ms.maxArmor}%"></i></div><span class="pl-num">${mc.armor}</span>
          <div class="bar en"><i style="width:${(100 * mc.en) / ms.maxEn}%"></i></div></div>`;
      }
      return `<div class="plate${m.ko ? ' ko' : ''}${riding ? ' riding' : ''}">
        <div class="pl-name">${esc(m.name)}<span class="pl-lv">Lv${m.lv}</span></div>
        <div class="pl-hp"><div class="bar hp"><i style="width:${(100 * m.hp) / st.maxHp}%"></i></div><span class="pl-num">${m.hp}</span></div>
        ${mline}</div>`;
    }).join('');
    const map = MAPS[G.pos.map];
    const key = html + G.gear + map.name;
    if (!force && key === last) return;
    last = key;
    plates.innerHTML = html;
    gearEl.innerHTML = `<span class="gear-icon">⚙</span>${fmt(G.gear)} ギア`;
    mapEl.textContent = map.name;
  },
};
