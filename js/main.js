// 起動とシーン切り替え
import { engine } from './core/engine.js';
import { CHAPTERS } from './data/chapters.js';
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
flow.flyTo = async ({ to, at, from, planet, lines, after, chapter }) => {
  ui.closeAll();
  await ui.fade(true, 0.6);
  for (const m of partyMembers()) {
    const mc = m.machine && G.machines[m.machine];
    if (mc?.owned && (mc.loc.type === 'garage' || mc.loc.type === 'party')) mc.loc = { type: 'garage', town: to };
  }
  // 目覚めたアルファは、ガレージに置いたままでも必ず一緒に運ぶ（v1.4.2）。だれも乗っていなければレンが乗る
  let alphaNote = false;
  const alpha = G.machines.alpha;
  if (alpha?.owned && G.seal >= 1 && alpha.loc.type !== 'map') {
    alpha.loc = { type: 'garage', town: to };
    if (!partyMembers().some((m) => m.machine === 'alpha')) { G.members.ren.machine = 'alpha'; alphaNote = true; }
  }
  // at は広げる前の町の座標で書いてある（map-scale.js）
  const k = MAPS[to]?.spread || 1;
  G.pos = { map: to, x: at[0] * k, y: at[1] * k, dir: 0 };
  G.lastTown = to; (G.flags.visited ||= {})[to] = true;
  await engine.setScene(scenes.flight, {
    from, to: planet, lines,
    onDone: async () => {
      // 初めて着いた星では、章の題目を出す（chapters.js）
      if (chapter && CHAPTERS[chapter]) await ui.chapterTitle({ num: chapter, ...CHAPTERS[chapter] });
      await engine.setScene(scenes.world, { banner: true, after });
      await ui.fade(false, 0.6);
      if (alphaNote) ui.toast(`アルファも貨物室で運んできた！ ${G.members.ren.name}はアルファに乗る（町のガレージで乗りこむ）`, 4);
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
  } else if (BOSS_TALK[def.bounty || def.flag]) {
    const t = BOSS_TALK[def.bounty || def.flag];
    if (t.key) { G.flags[t.key] = true; audio.sfx('levelup'); }
    await ui.say(t.lines.map(([who, text]) => ({ name: who === 'r' ? r : who === 's' ? G.members.shion.name : who === 'g' ? G.members.gina.name : '', text })));
    if (t.banner) ui.banner(t.banner[0], t.banner[1]);
  } else if (def.bounty === 'flameemperor') {
    await chapterEnding(4);
  } else if (def.bounty === 'luxguardian') {
    await chapterEnding(5);
  } else if (def.bounty === 'umbraking') {
    await chapterEnding(6);
  } else if (def.bounty === 'mothercore') {
    await finalEnding();
  }
};

// 第4〜7章の賞金首・小ボスを倒したあとの話（key があれば、その鍵のフラグを立てる）
const BOSS_TALK = {
  magmasaurus: { lines: [['r', '熱かった……！ でも、このうろこ、熱をまったく通さないぞ。'], ['g', 'カルデラリムの耐熱工房に持っていけば、何か作ってくれるんじゃないかい？']] },
  blazefort: { lines: [['r', '空の要塞を撃ち落とした！'], ['', '残骸の航海日誌に「三機の技師は、息子の住む辺境の星へ向かった」と書かれていた。'], ['r', '息子の住む……辺境の星……？']] },
  milBoss: { key: 'volcanoKey', banner: ['火山の防壁の鍵を手に入れた', '炎帝の火山に入れるようになった'], lines: [['', '狂った司令機が止まると、胸の装甲から「火山防壁の鍵」がこぼれ落ちた。'], ['', '研究所の記録：「技師カイ・アマギ、三機の封印処置を完了。オメガのみ封印を拒否」'], ['r', 'カイ・アマギ……それ、父さんの名前だ！'], ['s', '……あなたの父親が、三機を？']] },
  prismdragon: { lines: [['r', '虹色の竜も、やっつけたぞ！'], ['g', 'あの翼、マントにしたらきれいだろうね。']] },
  seraphdrone: { lines: [['r', '古代の守護ドローンだったのか……。宇宙生物に乗っ取られてたんだ。'], ['', 'ドローンの記録装置に、白・黒・赤の三機の設計図が映っていた。']] },
  baseBoss: { key: 'templeKey', banner: ['光の神殿の鍵を手に入れた', '光の神殿に入れるようになった'], lines: [['', '番人が崩れ落ちると、台座の上の光の鍵が輝いた。'], ['', '旧基地の記録：「パイロット候補 シオン。オメガとの神経接続に適合」'], ['s', '……私が、オメガに選ばれていた？ ずっと前から……。']] },
  nightmaw: { lines: [['r', '影の顎が消えた……！'], ['', '影の中から、使い込まれた機械の手袋が出てきた。']] },
  gravemech: { lines: [['r', '墓場の重機も止まった！'], ['', '重機のコックピットに、照準用の手袋が残されていた。']] },
  dockBoss: { key: 'spireKey', banner: ['霧払いの装置を手に入れた', '闇の尖塔に入れるようになった'], lines: [['', 'ドックマスターが崩れ落ちると、霧を払う装置が転がり出た。'], ['g', 'これで闇の尖塔の霧が晴れるね。……それと、このごつい籠手、あたしにぴったりだ。']] },
  corewarden: { lines: [['r', 'マザーコアの番人を倒した！'], ['s', '……次は、虹の回廊。その奥に女王がいる。']] },
  broodqueen: { key: 'heartKey', banner: ['心臓への道が開いた', 'マザーコアの心臓に入れるようになった'], lines: [['', '女王が崩れ落ちると、大地が七色に光り、北の結晶の壁が砕け散った。'], ['r', 'マザーコアの心臓への道だ……！'], ['g', '行くよ、二人とも。最後の戦いだ！']] },
};

// 第4〜6章のクリア
async function chapterEnding(ch) {
  const r = G.members.ren.name, s = G.members.shion.name, g = G.members.gina.name;
  G.flags[`ch${ch}Clear`] = true;
  if (ch === 4) {
    audio.sfx('seal');
    await ui.say([
      { name: '', text: '炎帝イグニスが崩れ落ちると、火山の溶岩がゆっくりと冷えはじめた。' },
      { name: '', text: '火口の奥の記録装置に、ひとりの男の姿が映し出された。油で汚れた作業着、腰に工具――。' },
      { name: '', text: '「……この記録を見ているのが、レン、おまえだといいんだが」' },
      { name: r, text: '父さん……！' },
      { name: '', text: '「三機はマザーコアと戦うために作られた。だが、まだ力が足りない。わたしは三機を眠らせ、おまえの住む星に隠した」' },
      { name: '', text: '「オメガだけは封印を拒んだ。だから、わたしたちの家の地下に。……いつか、おまえが三機を目覚めさせてくれると信じている」' },
      { name: s, text: '……あなたの父親は、ずっとあなたを待っていた。' },
      { name: g, text: 'いい親父さんじゃないか。最後まで付き合うよ、レン。' },
      { name: '', text: '記録の最後に、光の惑星への星図が残されていた。' },
    ]);
  } else if (ch === 5) {
    audio.sfx('seal');
    await ui.say([
      { name: '', text: 'ルクス・ガーディアンが光の粒になって消えると、神殿の奥の扉が開いた。' },
      { name: '', text: '中には、アルファとそっくりの白い機体の像。その胸には、空っぽの台座があった。' },
      { name: '', text: '古代の記録：「ステラの結晶――星の核の光。三機の心臓。白き翼はその光を、すべての星へ届けるために生まれた」' },
      { name: r, text: 'アルファの胸のコアは……星の核の光そのものなんだ。' },
      { name: '', text: '「マザーコアは星の光を食べて育つ。ゆえに、星の光を宿す三機だけが、それを止められる」' },
      { name: s, text: '……だから、寄生体はマシンを狙う。光を探して。' },
      { name: g, text: 'それなら、あたしたちが一番のごちそうってわけだ。望むところさ！' },
      { name: '', text: 'アルファのモニターに、闇の惑星への星図が浮かび上がった。' },
    ]);
  } else if (ch === 6) {
    G.seal = Math.max(G.seal, 4);
    audio.sfx('seal');
    await ui.say([
      { name: '', text: 'アンブラキングが消えると、闇の尖塔の頂上に、はじめて星の光が差しこんだ。' },
      { name: '', text: 'その光が、アルファの胸のコアに吸いこまれていく。' },
      { name: '', text: '――最後の封印が、音を立てて砕け散った。' },
      { name: '', text: '白金の装甲が星の光で満たされ、背中の翼が光となって大きく広がる。' },
      { name: r, text: 'これが……アルファの、本当の姿……！' },
    ]);
    ui.banner('アルファマックス 覚醒', 'すべての封印が解けた。光の翼が大きく広がる');
    await wait(2.8);
    await ui.say([
      { name: '', text: '伝説の機体アルファは、完全な姿――「アルファマックス」になった。' },
      { name: s, text: '……オメガも、共鳴している。' },
      { name: g, text: 'ガイアもだ。三機そろって、震えてるよ。' },
      { name: r, text: 'マザーコアの世界への星図が見えた。……行こう、みんな。最後の戦いへ！' },
    ]);
  }
  audio.playSong('title', { restart: true });
  const titles = { 4: '火', 5: '光', 6: '闇' };
  const notes = {
    4: 'レンの父が三機を隠した理由が明かされた。次は光の惑星へ――',
    5: 'アルファの胸のコアの正体が明かされた。次は闇の惑星へ――',
    6: 'アルファはすべての封印を解き、アルファマックスとなった。次は、マザーコアの世界へ――',
  };
  await ui.panel(`<div class="ending">
    <div class="ending-big">第${ch}章「${titles[ch]}」の惑星　クリア！</div>
    <p>${notes[ch]}</p>
    <p class="note">（この星の最初の町にいる宇宙船の船長キールに話すと、次の星へ飛べます。頭の上に「次の惑星へ」の目印が出ています）</p></div>`, { title: 'アルファマックス', closeText: '旅を続ける' });
  audio.playSong(MAPS[G.pos.map].bgm, { restart: true });
  autosave();
}

// 最終章：マザーコアを倒した。エンディングとスタッフロール
async function finalEnding() {
  const r = G.members.ren.name, s = G.members.shion.name, g = G.members.gina.name;
  G.flags.ch7Clear = true;
  G.flags.gameClear = true;
  audio.sfx('bigexplosion');
  await ui.say([
    { name: '', text: 'アルファマックスの光の翼、オメガの赤い刃、ガイアの深紅の拳――三機の光がひとつになり、マザーコアの核を貫いた。' },
    { name: '', text: 'マザーコアの巨大な目が、ゆっくりと閉じていく。' },
    { name: '', text: '「……ヒカリ……ホシノ……ヒカリ……」' },
    { name: '', text: '虹色に燃えていた空が静まり、吸い込まれていた六つの星の光が、それぞれの星へ帰っていく。' },
    { name: '', text: '雲の切れ間から、たくさんの星の光が降りそそいだ。' },
  ]);
  await wait(1.5);
  await ui.say([
    { name: g, text: '……終わった、のかい？' },
    { name: s, text: '寄生体の反応が、すべて消えていく。……どの星からも。' },
    { name: r, text: 'やった……！ やったんだ、みんな！' },
    { name: '', text: 'アルファマックスの翼が、ゆっくりとたたまれる。胸のコアの光が、やさしく瞬いた。まるで、ありがとうと言うように。' },
    { name: r, text: '父さん……見てる？ 三機は、ちゃんと目覚めたよ。' },
  ]);
  audio.playSong('ending', { restart: true });
  await ui.panel(`<div class="ending">
    <div class="ending-big">ALPHA MAX</div>
    <p>星の果て、鋼を駆る者</p>
    <p>――マザーコアは倒れ、宇宙じゅうのマシンが、寄生体から解き放たれた。</p>
    <p>土の星では、ラストヘイヴンの修理屋に、今日も壊れたマシンが運びこまれる。</p>
    <p>風の星の風車は、やわらかな風に回り、水の星の海は、どこまでも青い。</p>
    <p>火の星の溶岩は静かに冷え、光の星の遺跡は、星の光を受けて輝いている。</p>
    <p>そして闇の星にも――はじめての朝が来た。</p>
    <p>メカニックのレン、パイロットのシオン、傭兵のジーナ。そして三機の兄弟機、アルファ、オメガ、ガイア。</p>
    <p>彼らの旅は、ここで終わる。けれど、星の海は、まだどこまでも続いている。</p>
    <p class="note">THE END　――　遊んでくれて、ありがとう！</p>
    <p class="note">（クリア後もこのまま遊び続けられます。行ったことのある星へは、宇宙船と転送台で自由に行けます）</p></div>`, { title: 'エンディング', closeText: 'おわり' });
  audio.playSong(MAPS[G.pos.map].bgm, { restart: true });
  autosave();
}

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
    <p class="note">To be continued…　（シーゲートの宇宙船の船長キールに話すと、次の星「火の惑星」へ飛べます。頭の上に「次の惑星へ」の目印が出ています）</p></div>`, { title: 'アルファマックス', closeText: '旅を続ける' });
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
    <p class="note">To be continued…　（ブリーズヒルの宇宙船の船長キールに話すと、次の星「水の惑星」へ飛べます。頭の上に「次の惑星へ」の目印が出ています）</p></div>`, { title: 'アルファマックス', closeText: '旅を続ける' });
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
    <p>（ウェイポイントの交易マーケットの前にいる宇宙船の船長キールに話すと、次の惑星へ飛べます。頭の上に「次の惑星へ」の目印が出ています）</p>
    <p>宇宙生物「マザーコア」の謎を追い、旅は次の惑星へ――</p>
    <p class="note">To be continued…　（このまま第1章を遊び続けられます）</p></div>`, { title: 'アルファマックス', closeText: '旅を続ける' });
  audio.playSong(MAPS[G.pos.map].bgm, { restart: true });
  autosave();
}

async function startNewGame() {
  const names = await ui.nameEntry(['ren', 'shion', 'gina'].map((id) => ({ role: `${CHARACTERS[id].roleName}`, value: CHARACTERS[id].defaultName })));
  newGame(names);
  await ui.fade(true, 0.5);
  await ui.chapterTitle({ num: 1, ...CHAPTERS[1] });
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
