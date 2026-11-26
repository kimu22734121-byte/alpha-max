// フィールド画面のHUD（仲間の体力・マシンの装甲・ギア・メニューボタン・調べるボタン・ダッシュボタン）
//  調べるボタンは、会話やメニューが開いているときは「決定」ボタンになる（v1.3〜。Enter キーと同じ。戦闘のコマンドでも使える）
//  ダッシュボタンは押すたびにオン・オフ（オンの間は走る。PCは Shift を押している間）
import { G, partyMembers, memberStats, machineStats, machineName } from '../game/state.js';
import { MAPS } from '../data/maps.js';
import { input } from './input.js';
import { ui, esc, fmt } from './ui.js';

let root, plates, gearEl, mapEl, actBtn, menuBtn, dashBtn, last = '', actLabel = '調べる', actReady = false, shown = false;
// 決定ボタンを出さない画面（お店・3Dで比べる画面・テンキー・名前の入力は、自分のボタンで決める）
const NO_CONFIRM = '.shop-panel, .compare-panel, .keypad-wrap, #ui input';

export const hud = {
  init(parent) {
    root = document.createElement('div');
    root.className = 'hud hidden';
    root.innerHTML = `
      <div class="hud-party"></div>
      <div class="hud-top"><div class="hud-map"></div><div class="hud-gear"></div></div>
      <button class="hud-menu" aria-label="メニュー">☰<span>メニュー</span></button>`;
    parent.appendChild(root);
    plates = root.querySelector('.hud-party');
    gearEl = root.querySelector('.hud-gear');
    mapEl = root.querySelector('.hud-map');
    menuBtn = root.querySelector('.hud-menu');
    // 調べる／決定ボタンとダッシュボタンは、メニューの上にも出せるように画面のいちばん上の層に置く
    actBtn = document.createElement('button'); actBtn.className = 'hud-action hidden'; actBtn.textContent = '調べる';
    dashBtn = document.createElement('button'); dashBtn.className = 'hud-dash hidden'; dashBtn.innerHTML = '<b>»</b>ダッシュ';
    document.body.append(actBtn, dashBtn);
    const stop = (e) => { e.stopPropagation(); };
    for (const b of [menuBtn, actBtn, dashBtn]) { b.addEventListener('pointerdown', stop); }
    menuBtn.addEventListener('click', (e) => { e.stopPropagation(); input.emit('menu'); });
    actBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (ui.busy) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); // 決定（Enter と同じ）
      else input.emit('action');
    });
    dashBtn.addEventListener('click', (e) => { e.stopPropagation(); input.dashOn = !input.dashOn; dashBtn.classList.toggle('on', input.dashOn); });
    setInterval(() => this.refreshButtons(), 120);
  },
  show() { root.classList.remove('hidden'); shown = true; this.update(true); this.refreshButtons(); },
  hide() { root.classList.add('hidden'); shown = false; this.refreshButtons(); },
  setAction(label, ready = false) {
    actLabel = label; actReady = ready;
    this.refreshButtons();
  },
  // 調べる／決定ボタンの見た目：メニューや会話が開いていれば「決定」、フィールドなら「調べる」
  refreshButtons() {
    if (!actBtn) return;
    const battle = !!document.querySelector('.battle-hud');
    const confirm = ui.busy && (shown || battle) && !document.querySelector(NO_CONFIRM);
    const field = shown && !ui.busy;
    const label = confirm ? '決定' : actLabel;
    if (actBtn.textContent !== label) actBtn.textContent = label;
    actBtn.classList.toggle('hidden', !(confirm || field));
    actBtn.classList.toggle('confirm', confirm);
    actBtn.classList.toggle('ready', field && actReady); // 近くに調べられる物があると光る
    dashBtn.classList.toggle('hidden', !field);
  },
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
