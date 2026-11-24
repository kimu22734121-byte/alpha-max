// 起動とシーン切り替え
import { engine } from './core/engine.js';
import { input } from './core/input.js';
import { ui, esc } from './core/ui.js';
import { hud } from './core/hud.js';
import { audio } from './core/audio.js';
import { loadModels } from './core/assets.js';
import { flow } from './game/flow.js';
import { G, newGame, setState, partyMembers, healParty, machineName } from './game/state.js';
import { MAPS } from './data/maps.js';
import { CHARACTERS } from './data/characters.js';
import { MACHINES } from './data/machines.js';
import { OpeningScene } from './scenes/opening.js';
import { TitleScene } from './scenes/title.js';
import { WorldScene } from './scenes/world.js';
import { BattleScene } from './scenes/battle.js';
import { autosave } from './scenes/menus.js';
import { wait } from './core/tween.js';

audio.loadSettings();
engine.init(document.getElementById('game'));
input.init(document.getElementById('touch'));
ui.init(document.getElementById('ui'));
hud.init(document.getElementById('ui-hud'));

const scenes = {
  opening: new OpeningScene(),
  title: new TitleScene(),
  world: new WorldScene(),
  battle: new BattleScene(),
};
flow.scenes = scenes;

flow.toTitle = async () => {
  ui.closeAll();
  await ui.fade(true, 0.4);
  await engine.setScene(scenes.title, { newGame: startNewGame, continue: continueGame });
  await ui.fade(false, 0.6);
};

flow.startBattle = async (opts) => {
  await engine.setScene(scenes.battle, opts);
};

flow.toWorld = async (opts = {}) => {
  await engine.setScene(scenes.world, { after: opts.after });
  await ui.fade(false, 0.4);
  autosave();
};

// 全滅：最後にセーブした町に戻され、所持ギアが半分になる
flow.gameOver = async () => {
  const town = MAPS[G.lastTown] || MAPS.town1;
  const inn = town.buildings.find((b) => b.facility === 'inn');
  G.pos = { map: town.id, x: inn.door[0] + 0.5, y: inn.door[1] + 1.5, dir: 0 };
  const lost = Math.floor(G.gear / 2);
  G.gear -= lost;
  healParty();
  for (const mc of Object.values(G.machines)) {
    if (mc.loc.type === 'party') { mc.loc = { type: 'garage', town: town.id }; if (mc.armor <= 0) mc.broken = true; }
  }
  await engine.setScene(scenes.world, {
    after: async () => {
      await ui.say([`……${G.members.ren.name}たちは${town.name}の宿屋で目を覚ました。`, `所持ギアが半分になった（−${lost.toLocaleString()} ギア）。`, 'マシンはレッカーでガレージに運ばれている。']);
    },
  });
  await ui.fade(false, 0.6);
  autosave();
};

// 賞金首を倒した後の話
flow.onBossDefeated = async (def) => {
  const r = G.members.ren.name;
  if (def.bounty === 'rustdriller') {
    await ui.say([
      { name: r, text: 'やった……！ アルファ、きみ本当にすごいよ！' },
      { name: '', text: 'ラストドリラーの残骸から、脈打つ「寄生コア」がこぼれ落ちた。' },
      { name: r, text: 'これが宇宙生物の核……？ マシンに取りついて動かしてたのか。' },
      { name: '', text: '（ハンターオフィスで賞金を受け取ろう。酒場の無口なパイロットも、何か知っていそうだ）' },
    ]);
  } else if (def.bounty === 'skywraith') {
    await ui.say([
      { name: r, text: '空の賞金首も撃ち落としたぞ！' },
      { name: '', text: '墜ちた輸送ドローンの積み荷には、東の廃工場の紋章が刻まれていた。' },
    ]);
  } else if (def.bounty === 'grindtitan') {
    await endingChapter1();
  }
};

async function endingChapter1() {
  const r = G.members.ren.name;
  G.seal = Math.max(G.seal, 1);
  const alpha = G.machines.alpha;
  alpha.armor = Math.max(alpha.armor, 1);
  audio.sfx('seal');
  await ui.say([
    { name: '', text: 'グラインドタイタンが崩れ落ちると、工場の奥から紫の光があふれ出した……。' },
    { name: '', text: '光はアルファへと吸い込まれ――コアの封印が、ひとつ音を立てて外れた。' },
    { name: r, text: 'アルファが……光ってる！ 出力が上がってる、こんなの見たことない！' },
  ]);
  ui.banner('アルファ 第一封印 解放', '装甲・攻撃・エネルギーが大きく上がった');
  await wait(2.6);
  await ui.say([
    { name: '', text: 'アルファのモニターに、見知らぬ星図が浮かび上がる。' },
    { name: '', text: '「……マザー……コア……」　かすかなノイズの向こうで、誰かの声がした。' },
    { name: r, text: '宇宙生物がマシンを乗っ取る理由……きっとこの先にあるんだ。' },
    { name: r, text: '行こう、アルファ。次の惑星へ！' },
  ]);
  audio.playSong('title', { restart: true });
  await ui.panel(`<div class="ending">
    <div class="ending-big">第1章「土」の惑星　クリア！</div>
    <p>伝説の機体アルファは、封印のひとつを取り戻した。</p>
    <p>宇宙生物「マザーコア」の謎を追い、旅は次の惑星へ――</p>
    <p class="note">To be continued…　（このまま第1章を遊び続けられます）</p></div>`, { title: 'アルファマックス', closeText: '旅を続ける' });
  audio.playSong(MAPS[G.pos.map].bgm, { restart: true });
  autosave();
}

async function startNewGame() {
  const names = await ui.nameEntry(['ren', 'shion', 'gald'].map((id) => ({ role: `${CHARACTERS[id].roleName}`, value: CHARACTERS[id].defaultName })));
  newGame(names);
  await ui.fade(true, 0.5);
  await engine.setScene(scenes.world, {
    banner: true,
    after: async () => {
      const r = G.members.ren.name;
      await ui.say([
        { name: '', text: '――あの日から三か月。' },
        { name: r, text: 'できた……！ 拾ってきたロボット、ついに動くようになったぞ！' },
        { name: r, text: '名前は「アルファ」。コアに刻まれてた文字なんだ。メカニック以外は動かせない、不思議な機体……。' },
        { name: r, text: '最近、宇宙生物に乗っ取られたマシンが荒野で暴れてる。アルファとなら、なんとかできるかもしれない！' },
        { name: '', text: '（アルファは町の入口のガレージに預けてある。ハンターオフィスで手配書を見てみよう）' },
        { name: '', text: '【操作】左手で画面をなぞると移動／右下のボタンで調べる・話す／右上でメニュー。PCは矢印キー・Enter・Esc' },
      ]);
    },
  });
  await ui.fade(false, 0.6);
  autosave();
}

async function continueGame(data) {
  if (!data) return;
  setState(data.state);
  await ui.fade(true, 0.5);
  await engine.setScene(scenes.world, { banner: true });
  await ui.fade(false, 0.6);
}

// ---------------- 起動 ----------------
const boot = document.getElementById('boot');
const bar = boot.querySelector('.boot-bar i');
const msg = boot.querySelector('.boot-msg');
await loadModels((p) => { bar.style.width = `${Math.round(p * 100)}%`; });
msg.textContent = '画面をタップしてください';
boot.classList.add('ready');

boot.addEventListener('click', async () => {
  audio.unlock();
  // スマホは全画面＋横向き固定を試す（できない端末もある）
  if (matchMedia('(pointer: coarse)').matches) {
    try { await document.documentElement.requestFullscreen?.(); await screen.orientation?.lock?.('landscape'); } catch { /* 無視 */ }
  }
  boot.remove();
  const fade = document.querySelector('.fade');
  fade.style.transitionDuration = '0s'; fade.style.background = '#000'; fade.style.opacity = '1';
  const params = new URLSearchParams(location.search);
  if (params.has('skip')) { await flow.toTitle(); return; }
  await engine.setScene(scenes.opening, () => flow.toTitle());
}, { once: true });

// デバッグ用（ブラウザのコンソールから）
window.alphamax = { G: () => G, flow, scenes, partyMembers, machineName, MACHINES, esc };
