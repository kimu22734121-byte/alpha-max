// フィールド画面のHUD（仲間の体力・マシンの装甲・ギア・メニューボタン・調べるボタン・ダッシュボタン）
//  調べるボタンは、会話やメニューが開いているときは「決定」ボタンになる（v1.3〜。Enter キーと同じ。戦闘のコマンドでも使える）
//  ダッシュボタンは押すたびにオン・オフ（オンの間は走る。PCは Shift を押している間）
import { G, partyMembers, memberStats, machineStats, machineName } from '../game/state.js';
import { MAPS } from '../data/maps.js';
import { TILES } from '../data/tiles.js';
import { audio } from './audio.js';
import { nextObjective, currentChapter, CHAPTERS } from '../data/chapters.js';
import { input } from './input.js';
import { ui, esc, fmt } from './ui.js';

let root, plates, gearEl, mapEl, goalEl, actBtn, menuBtn, mapBtn, mini, miniG, dashBtn, last = '', actLabel = '調べる', actReady = false, shown = false;
// 決定ボタンを出さない画面（お店・3Dで比べる画面・テンキー・名前の入力は、自分のボタンで決める）
const NO_CONFIRM = '.shop-panel, .compare-panel, .keypad-wrap, #ui input';

export const hud = {
  init(parent) {
    root = document.createElement('div');
    root.className = 'hud hidden';
    root.innerHTML = `
      <div class="hud-party"></div>
      <div class="hud-top"><div class="hud-map"></div><div class="hud-gear"></div></div>
      <div class="hud-goal"></div>
      <canvas class="hud-mini" width="300" height="200" aria-label="ミニ地図"></canvas>
      <button class="hud-menu" aria-label="メニュー">☰<span>メニュー</span></button>
      <button class="hud-menu hud-mapbtn" aria-label="ちず">🗺<span>ちず</span></button>`;
    parent.appendChild(root);
    plates = root.querySelector('.hud-party');
    gearEl = root.querySelector('.hud-gear');
    mapEl = root.querySelector('.hud-map');
    goalEl = root.querySelector('.hud-goal');
    // ミニ地図（v1.6.3）：左上、仲間の体力の下。北が上。タップで大きな「ちず」
    mini = root.querySelector('.hud-mini'); miniG = mini.getContext('2d');
    mini.addEventListener('pointerdown', (e) => e.stopPropagation());
    mini.addEventListener('click', (e) => { e.stopPropagation(); input.emit('mapview'); });
    setInterval(() => this.drawMini(), 200);
    menuBtn = root.querySelector('.hud-menu');
    mapBtn = root.querySelector('.hud-mapbtn');
    // 調べる／決定ボタンとダッシュボタンは、メニューの上にも出せるように画面のいちばん上の層に置く
    actBtn = document.createElement('button'); actBtn.className = 'hud-action hidden'; actBtn.textContent = '調べる';
    dashBtn = document.createElement('button'); dashBtn.className = 'hud-dash hidden'; dashBtn.innerHTML = '<b>»</b>ダッシュ';
    document.body.append(actBtn, dashBtn);
    const stop = (e) => { e.stopPropagation(); };
    for (const b of [menuBtn, mapBtn, actBtn, dashBtn]) { b.addEventListener('pointerdown', stop); }
    mapBtn.addEventListener('click', (e) => { e.stopPropagation(); input.emit('mapview'); }); // メニューの横の「ちず」ボタン（v1.6）
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
  // ミニ地図を描く：まわり約 25×17 マス。フィールド・ダンジョンは歩いた所だけ（町は全部見える）。建物の中では出さない
  drawMini() {
    if (!mini || !shown || !G) return;
    const map = MAPS[G.pos.map];
    const off = !map || map.type === 'interior' || map.noMap || audio.settings.minimap === false;
    mini.style.display = off ? 'none' : '';
    if (off) return;
    const W = map.width, H = map.height, RX = 25, RY = 17, k = mini.width / RX;
    const px = G.pos.x, py = G.pos.y, x0 = px - RX / 2, y0 = py - RY / 2;
    const fog = map.type !== 'town';
    const ex = fog ? (G.explored?.[map.id] || '') : '';
    const g = miniG;
    g.fillStyle = 'rgba(6,8,14,0.92)'; g.fillRect(0, 0, mini.width, mini.height);
    const walkCol = { 5: '#c8a060', 2: '#7a8496', 1: '#9a8672', 25: '#9a8672', 26: '#6a7090', 17: '#7a5a90', 12: '#6a6a6a', 9: '#a8a060', 0: '#c8b088', 7: '#ffd040' };
    for (let ty = Math.floor(y0); ty < y0 + RY + 1; ty++) for (let tx = Math.floor(x0); tx < x0 + RX + 1; tx++) {
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
      if (fog && ex[ty * W + tx] !== '1') continue;
      const t = map.grid[ty][tx], info = TILES[t];
      g.fillStyle = t === 6 ? '#5a4a3e' : info?.walk && !info.hidden ? (walkCol[t] || '#b09a78') : t === 35 ? '#1a2a44' : t === 8 ? '#3a6a8a' : '#2e2a2a';
      g.fillRect((tx - x0) * k, (ty - y0) * k, k + 0.5, k + 0.5);
    }
    const dot = (x, y, col, r) => { const sx = (x + 0.5 - x0) * k, sy = (y + 0.5 - y0) * k; if (sx < -r || sy < -r || sx > mini.width + r || sy > mini.height + r) return; g.fillStyle = col; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill(); };
    const seen = (x, y) => !fog || ex[y * W + x] === '1';
    for (const w of map.warps || []) if (seen(w.x, w.y)) dot(w.x, w.y, '#ffd040', k * 0.7);
    for (const c of map.chests || []) if (seen(c.x, c.y) && !G.flags.opened?.[`${map.id}:${c.id}`]) dot(c.x, c.y, '#ffcc33', k * 0.8);
    for (const s of map.symbols || []) if (seen(s.x, s.y) && !(s.bounty ? G.bounties[s.bounty] : G.flags[s.flag])) dot(s.x, s.y, '#ff3a2a', k * 1.1);
    for (const n of map.npcs || []) if (n.event === 'shuttleCaptain') dot(n.x, n.y, '#8ad8ff', k * 0.9);
    // 自分（向きの三角）
    const cx = (px - x0) * k, cy = (py - y0) * k, a = G.pos.dir || 0;
    g.save(); g.translate(cx, cy); g.rotate(-a + Math.PI);
    g.fillStyle = '#5ff2ff'; g.strokeStyle = '#003040'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -k * 1.5); g.lineTo(k * 1.05, k * 1.05); g.lineTo(-k * 1.05, k * 1.05); g.closePath(); g.stroke(); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(255,220,160,0.6)'; g.lineWidth = 2; g.strokeRect(1, 1, mini.width - 2, mini.height - 2);
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
    const goal = map.type === 'interior' ? '' : nextObjective(G).text; // 建物の中では出さない
    const key = html + G.gear + map.name + goal;
    if (!force && key === last) return;
    last = key;
    plates.innerHTML = html;
    gearEl.innerHTML = `<span class="gear-icon">⚙</span>${fmt(G.gear)} ギア`;
    mapEl.textContent = map.name;
    goalEl.innerHTML = goal ? `<b>目的</b>${esc(goal)}` : '';
    goalEl.style.setProperty('--goal', CHAPTERS[currentChapter(G)].color); // 目的の印はいまの章の色
  },
};
