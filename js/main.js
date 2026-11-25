// 起動とシーン切り替え
import { engine } from './core/engine.js';
import { input } from './core/input.js';
import { ui, esc } from './core/ui.js';
import { hud } from './core/hud.js';
import { audio } from './core/audio.js';
import { loadModels } from './core/assets.js';
import { flow } from './game/flow.js';
import { G, newGame, setState, partyMembers, healParty, machineName, machineStats } from './game/state.js';
import { MAPS } from './data/maps.js';
import { CHARACTERS } from './data/characters.js';
import { MACHINES } from './data/machines.js';
import { OpeningScene } from './scenes/opening.js';
import { TitleScene } from './scenes/title.js';
import { WorldScene } from './scenes/world.js';
import { BattleScene } from './scenes/battle.js';
import { FlightScene } from './scenes/flight.js';
import { autosave } from './scenes/menus.js';
import { applyTuning } from './game/tuning.js';
// 開発者の部屋で調整した数値（ブラウザに保存）を、お店や戦闘で使う表に反映する
applyTuning();
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
  flight: new FlightScene(),
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

// 宇宙船で別の惑星へ（第1章 → 第2章など）。仲間が使っているマシンも貨物室で一緒に運ぶ
// to：着く町 / at：着く場所 / from・planet：演出の惑星（flight.js の PLANET_LOOK）/ lines：字幕 / after：着いた後の話
flow.flyTo = async ({ to, at, from, planet, lines, after }) => {
  ui.closeAll();
  await ui.fade(true, 0.6);
  for (const m of partyMembers()) {
    const mc = m.machine && G.machines[m.machine];
    if (mc?.owned && (mc.loc.type === 'garage' || mc.loc.type === 'party')) mc.loc = { type: 'garage', town: to };
  }
  G.pos = { map: to, x: at[0], y: at[1], dir: 0 };
  G.lastTown = to; (G.flags.visited ||= {})[to] = true;
  await engine.setScene(scenes.flight, {
    from, to: planet, lines,
    onDone: async () => {
      await engine.setScene(scenes.world, { banner: true, after });
      await ui.fade(false, 0.6);
      autosave();
    },
  });
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
      { name: '', text: '（ハンターオフィスで賞金を受け取ろう。この先、北の鉱山町グレイロックへ行けそうだ）' },
    ]);
  } else if (def.bounty === 'skywraith') {
    await ui.say([
      { name: r, text: '空の賞金首も撃ち落としたぞ！' },
      { name: '', text: '墜ちた輸送ドローンの積み荷には、東の廃工場の紋章が刻まれていた。' },
    ]);
  } else if (def.flag === 'shipBoss') {
    const g = G.members.gina.joined ? G.members.gina.name : r;
    G.flags.factoryKey = true;
    audio.sfx('levelup');
    await ui.say([
      { name: '', text: 'ネストクイーンが崩れ落ちると、巣の奥で何かが光った。' },
      { name: '', text: '海賊の船長室の金庫から「セキュリティキー」を手に入れた！' },
      { name: g, text: 'これで東の廃工場のゲートが開くね。いよいよ本番だよ！' },
    ]);
    ui.banner('セキュリティキーを手に入れた', '廃工場のゲートが開けられるようになった');
  } else if (def.bounty === 'grindtitan') {
    await endingChapter1();
  } else if (def.bounty === 'windraptor') {
    await ui.say([
      { name: r, text: 'でっかい鳥も、これでおとなしくなった！' },
      { name: '', text: 'ウィンドラプターの羽の下から、紫に光る「寄生コア」が転がり落ちた。土の惑星のものと同じだ。' },
      { name: G.members.shion.name, text: '……どの星でも、同じものがマシンや生き物に取りついている。' },
    ]);
  } else if (def.bounty === 'aerofort') {
    await ui.say([
      { name: r, text: '空の要塞を撃ち落としたぞ！' },
      { name: '', text: '砲艦の残骸から航海日誌が見つかった。最後のページに「研究所の連中は“マザー”と呼んでいた」と書かれている。' },
    ]);
  } else if (def.flag === 'labBoss') {
    G.flags.towerKey = true;
    audio.sfx('levelup');
    await ui.say([
      { name: '', text: 'ゲイルキメラが崩れ落ちると、研究室の奥の端末が息を吹き返した。' },
      { name: '', text: '「……研究記録 第88号。寄生体の親個体を“マザーコア”と呼称。三機の兄弟機は、それに対抗するために――」' },
      { name: r, text: '三機の兄弟機……！ アルファとオメガ、それに……。' },
      { name: '', text: '記録はそこでとぎれた。端末の横から「嵐の塔 起動キー」を手に入れた！' },
      { name: G.members.gina.name, text: 'これで北東の嵐の塔に入れるね。行こうじゃないか！' },
    ]);
    ui.banner('嵐の塔 起動キーを手に入れた', '嵐の塔のゲートが開けられるようになった');
  } else if (def.bounty === 'coreguardian') {
    await endingChapter2();
  } else if (def.bounty === 'shellcrusher') {
    await ui.say([
      { name: r, text: 'かったい甲羅だった……！ でも、この甲羅の板、すごく丈夫だぞ。' },
      { name: G.members.gina.name, text: 'タイドウォークのドック工房に持っていけば、何か作ってくれるんじゃないかい？' },
      { name: '', text: '（シェルクラッシャーの甲羅を手に入れた。タイドウォークのドック工房で水中ユニットを作ってもらえる）' },
    ]);
  } else if (def.bounty === 'vortexeel') {
    await ui.say([
      { name: r, text: '渦が消えていく……！ 大うなぎもやっつけたぞ！' },
      { name: '', text: '渦の底に、古い石板が沈んでいた。「白き翼は光を、黒き刃は闇を、赤き拳は大地を守る」と刻まれている。' },
    ]);
  } else if (def.flag === 'plantBoss') {
    G.flags.abyssKey = true;
    audio.sfx('levelup');
    await ui.say([
      { name: '', text: 'アビススクイッドが崩れ落ちると、貯水槽の底で何かが光った。' },
      { name: '', text: 'プラントの所長の認識票と、「水没都市 隔壁の鍵」を手に入れた！' },
      { name: '', text: '所長の手帳には、走り書きが残っていた。「沈んだ都市の奥で、マザーコアの“声”を聞いた」' },
      { name: G.members.shion.name, text: '……北東の水没都市。そこに親玉がいる。' },
    ]);
    ui.banner('水没都市 隔壁の鍵を手に入れた', '北東の水没都市の入口が開けられるようになった');
  } else if (def.bounty === 'abyssleviathan') {
    await endingChapter3();
  }
};

async function endingChapter3() {
  const r = G.members.ren.name, s = G.members.shion.name, g = G.members.gina.name;
  G.seal = Math.max(G.seal, 3);
  audio.sfx('seal');
  await ui.say([
    { name: '', text: 'アビスリヴァイアが崩れ落ちると、水没都市の奥の大きな扉が、静かに開いた。' },
    { name: '', text: '扉の奥には、海の水を青く光らせる古い装置――「海の記憶装置」が眠っていた。' },
    { name: '', text: 'アルファが装置に近づくと、胸のコアが共鳴するように輝きはじめた。' },
    { name: '', text: '三つ目の封印がはじけ飛ぶ。白金の装甲に星の光が走り、翼の先から青い光の粒子がこぼれ落ちた。' },
  ]);
  ui.banner('アルファ 第三封印 解放', '星光の外装・ステラ・ブレイカーがさらに強くなった');
  await wait(2.6);
  await ui.say([
    { name: '', text: '記憶装置が、遠い昔の映像を映し出した。白・黒・赤の三機が、巨大な影と戦っている。' },
    { name: '', text: '「マザーコアは星から星へ、マシンに種をまいて広がる。三機の力を一つにしなければ、止められない」' },
    { name: r, text: '三機の力を、一つに……。アルファとオメガとガイアは、いっしょに戦うために作られたんだ。' },
    { name: s, text: '……オメガがレンの家に隠されていたのも、そのため、かもしれない。' },
    { name: g, text: '謎がどんどん大きくなるね。でも、あたしたちならやれるさ！' },
    { name: '', text: 'アルファのモニターに、次の星図が浮かび上がった。赤く燃える、溶岩の惑星――。' },
  ]);
  audio.playSong('title', { restart: true });
  await ui.panel(`<div class="ending">
    <div class="ending-big">第3章「水」の惑星　クリア！</div>
    <p>アルファは三つ目の封印を取り戻し、星の光をまとった。</p>
    <p>三機の兄弟機の使命と、マザーコアの謎を追い、旅は次の惑星へ――</p>
    <p class="note">To be continued…　（このまま第3章を遊び続けられます。転送台や宇宙船でほかの星にも行けます）</p></div>`, { title: 'アルファマックス', closeText: '旅を続ける' });
  audio.playSong(MAPS[G.pos.map].bgm, { restart: true });
  autosave();
}

async function endingChapter2() {
  const r = G.members.ren.name, s = G.members.shion.name, g = G.members.gina.name;
  G.seal = Math.max(G.seal, 2);
  audio.sfx('seal');
  await ui.say([
    { name: '', text: 'コアガーディアンが崩れ落ちると、塔の中枢で暴れていた風の制御コアが、静かに青い光を取り戻した。' },
    { name: '', text: '荒れ狂っていた風がやみ、窓の外の雲の海に、何年ぶりかのやわらかな風が吹きわたる。' },
    { name: '', text: '――そのとき。アルファの胸のコアが、制御コアの光に呼ばれるように強く脈打った。' },
    { name: '', text: '二つ目の封印がはじけ飛ぶ。白い装甲が白金に輝き、背中の翼から光の粒子があふれ出した。' },
  ]);
  ui.banner('アルファ 第二封印 解放', '白金の外装・ステラ・ブレイカーが強くなった');
  await wait(2.6);
  await ui.say([
    { name: '', text: '制御コアの記録装置に、古い映像が残っていた。白・黒・赤の三機の機体が、並んで空を飛んでいく。' },
    { name: '', text: '「アルファ、オメガ、ガイア。三機がそろうとき、マザーコアへの道が開く」――映像の声はそう告げて、消えた。' },
    { name: r, text: '三機の兄弟機……。やっぱり、アルファたちは宇宙生物と戦うために作られたんだ。' },
    { name: s, text: '……マザーコア。すべての寄生体の親。そこまで、たどり着く。' },
    { name: g, text: 'へっ、上等じゃないか。次の星でも、あたしたちが暴れてやろうよ！' },
    { name: '', text: 'アルファのモニターに、新しい星図が浮かび上がった。青い海に覆われた惑星――。' },
  ]);
  audio.playSong('title', { restart: true });
  await ui.panel(`<div class="ending">
    <div class="ending-big">第2章「風」の惑星　クリア！</div>
    <p>アルファは二つ目の封印を取り戻し、白金の輝きをまとった。</p>
    <p>三機の兄弟機と「マザーコア」の謎を追い、旅は次の惑星へ――</p>
    <p class="note">To be continued…　（このまま第2章を遊び続けられます。転送台で第1章の町にも行けます）</p></div>`, { title: 'アルファマックス', closeText: '旅を続ける' });
  audio.playSong(MAPS[G.pos.map].bgm, { restart: true });
  autosave();
}

async function endingChapter1() {
  const r = G.members.ren.name;
  G.seal = Math.max(G.seal, 1);
  // アルファが目覚める：ラストヘイヴンのガレージで乗れるようになる
  const alpha = G.machines.alpha;
  alpha.owned = true;
  alpha.loc = { type: 'garage', town: 'town1' };
  alpha.armor = machineStats(alpha).maxArmor;
  alpha.en = machineStats(alpha).maxEn;
  audio.sfx('seal');
  await ui.say([
    { name: '', text: 'グラインドタイタンが崩れ落ちると、工場の奥から紫の光があふれ出した……。' },
    { name: '', text: '光の筋は空へ昇り、西へ――ラストヘイヴンの方角へと飛んでいった。' },
    { name: '', text: '――同じころ。修理屋の作業場で眠っていた白い機体の胸に、青白い光がともった。' },
    { name: '', text: 'コアの封印が、ひとつ音を立てて外れる。金の装甲に光のラインが走り、背中の翼がゆっくりと開いた。' },
  ]);
  ui.banner('アルファ 第一封印 解放', '伝説の機体アルファが目を覚ました');
  await wait(2.6);
  // 胸のコア（第7の専用スロット）のステラ・ブレイカーも、封印の解放で使えるようになる
  await ui.say([{ name: '', text: 'アルファの胸のコアがまばゆく脈打った。――専用武器「ステラ・ブレイカー」が目覚めた。' }]);
  ui.banner('ステラ・ブレイカー 解放', '胸のコアから撃つ、アルファだけの光の主砲');
  await wait(2.2);
  await ui.say([
    { name: '', text: 'アルファのモニターに、見知らぬ星図が浮かび上がる。' },
    { name: '', text: '「……マザー……コア……」　かすかなノイズの向こうで、誰かの声がした。' },
    { name: r, text: 'ガレージから通信……アルファが、動いた!? ' },
    { name: r, text: 'モニターに見知らぬ星図が出てる。宇宙生物がマシンを乗っ取る理由……きっとこの先にあるんだ。' },
    { name: r, text: 'それに、地下に眠ってたオメガのことも。……行こう、アルファ。次の惑星へ！' },
  ]);
  audio.playSong('title', { restart: true });
  await ui.panel(`<div class="ending">
    <div class="ending-big">第1章「土」の惑星　クリア！</div>
    <p>伝説の機体アルファは、封印のひとつを取り戻して目を覚ました。</p>
    <p>（アルファはラストヘイヴンのガレージにいます。「乗る人を決める」でレンが乗れます）</p>
    <p>（ウェイポイントの宇宙船の船長に話すと、次の惑星へ飛べます）</p>
    <p>宇宙生物「マザーコア」の謎を追い、旅は次の惑星へ――</p>
    <p class="note">To be continued…　（このまま第1章を遊び続けられます）</p></div>`, { title: 'アルファマックス', closeText: '旅を続ける' });
  audio.playSong(MAPS[G.pos.map].bgm, { restart: true });
  autosave();
}

async function startNewGame() {
  const names = await ui.nameEntry(['ren', 'shion', 'gina'].map((id) => ({ role: `${CHARACTERS[id].roleName}`, value: CHARACTERS[id].defaultName })));
  newGame(names);
  await ui.fade(true, 0.5);
  await engine.setScene(scenes.world, {
    banner: true,
    after: async () => {
      const r = G.members.ren.name;
      await ui.say([
        { name: '', text: '――あの日から三か月。' },
        { name: r, text: 'よし……装甲も関節も、ぜんぶ直した。がらくたの山で拾った、白と金のロボット。' },
        { name: r, text: '名前は「アルファ」。コアに刻まれてた文字なんだ。……なのに、コアの「封印」だけが開かない。' },
        { name: r, text: '封印を解く手がかりを探さなきゃ。それに、宇宙生物に乗っ取られたマシンが荒野で暴れてる。' },
        { name: r, text: 'アルファが動けるようになるまで、相棒のハウンドで出発だ！' },
        { name: '', text: '（ハウンドは町の入口のガレージに預けてある。ハンターオフィスで手配書を見てみよう）' },
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
msg.textContent = 'タップしてスタート';
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
