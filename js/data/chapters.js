// 章の題目（新しい星に初めて着いたとき・はじめから遊ぶときに出る）と、メニューの「つぎの目的」（v1.4〜）
//  題目：num＝何章、planet＝星の名前、sub＝副題
//  目的：steps を上から順に見て、まだ終わっていない最初の1つを出す（done が false のもの）。
//        done は G（セーブデータ）を受け取って true／false を返す。hint は「つぎの目的」を開いたときに添える一言
export const CHAPTERS = {
  // grad：星の名前の文字のグラデーション（左→右）、color：光と副題・飾り線の色、bg：背景のほのかな色
  1: { planet: '土の惑星', sub: '錆びた荒野と、眠れる白き機体', color: '#e8a858', grad: ['#ffe0a0', '#e8a050', '#b8602a'], bg: '#2a1608' },
  2: { planet: '風の惑星', sub: '雲海に浮かぶ島々', color: '#8ad8ff', grad: ['#ffffff', '#8ad8ff', '#6ad89a'], bg: '#08182a' },
  3: { planet: '水の惑星', sub: '蒼き海と、沈んだ都市', color: '#4ac8ff', grad: ['#c8f8ff', '#4ac8ff', '#2a6ae0'], bg: '#041428' },
  4: { planet: '火の惑星', sub: '灼熱の大地と、父の名', color: '#ff7a2a', grad: ['#fff08a', '#ff8a2a', '#e82a1a'], bg: '#2a0804' },
  5: { planet: '光の惑星', sub: '天上の聖域と、星の核', color: '#ffd860', grad: ['#ffffff', '#ffe890', '#e8b030', '#b890ff'], bg: '#1a1630' },
  6: { planet: '闇の惑星', sub: '終焉の夜、最後の封印', color: '#ff3a4a', grad: ['#ff9aa8', '#ff2a3a', '#8a0a2a', '#5a2a8a'], bg: '#14020a' },
  7: { planet: 'マザーコアの世界', sub: '虹の深淵、最終決戦', color: '#e0b8ff', grad: ['#ff5a5a', '#ffd84a', '#5aff8a', '#5ac8ff', '#c85aff', '#ff5ad8'], bg: '#0a0420' },
};

const B = (G, id) => !!G.bounties?.[id];
const F = (G, k) => !!G.flags?.[k];
const J = (G, id) => !!G.members?.[id]?.joined;

// いまの章（クリアした章の次）
export function currentChapter(G) {
  if (F(G, 'gameClear')) return 7;
  if (F(G, 'ch6Clear')) return 7;
  if (F(G, 'ch5Clear')) return 6;
  if (F(G, 'ch4Clear')) return 5;
  if (G.seal >= 3) return 4;
  if (G.seal >= 2) return 3;
  if (G.seal >= 1) return 2;
  return 1;
}

export const OBJECTIVES = {
  1: {
    hint: '町の人や酒場のマスターの話にもヒントがある。手配書はハンターオフィスで見られる',
    steps: [
      { done: (G) => J(G, 'shion'), text: '鉱山町グレイロック（2つ目の町）へ行き、パイロットのシオンを仲間にしよう' },
      { done: (G) => J(G, 'gina'), text: '中継ステーション・ウェイポイント（3つ目の町）で、傭兵のジーナを仲間にしよう' },
      { done: (G) => F(G, 'factoryKey'), text: '墜落した宇宙船（生身でしか入れない）の奥でネストクイーンを倒し、廃工場のセキュリティキーを手に入れよう' },
      { done: (G) => B(G, 'grindtitan'), text: '廃工場（マシンで入る）のいちばん奥で、グラインドタイタンを倒そう' },
    ],
  },
  2: {
    hint: '北の高原へは、スカイアンカーの島の地下の「風鳴りの洞窟」を抜けて行く',
    steps: [
      { done: (G) => F(G, 'ch2Started') || Object.values(G.members || {}).some((m) => m.joined && m.machine === 'alpha'), text: 'ラストヘイヴンのガレージで、目を覚ましたアルファに乗ろう（光っているアルファを調べる）' },
      { done: (G) => F(G, 'ch2Started'), text: 'ウェイポイントの交易マーケットの前にいる宇宙船の船長キールに話して、風の惑星へ飛ぼう' },
      { done: (G) => F(G, 'towerKey'), text: '浮遊研究所（生身でしか入れない）でゲイルキメラを倒し、嵐の塔の起動キーを手に入れよう' },
      { done: (G) => B(G, 'coreguardian'), text: '嵐の塔の最上階で、コアガーディアンを倒そう' },
    ],
  },
  3: {
    hint: '北の浅い海は、海の底をマシンで歩いて進む（水中ユニットが必要）',
    steps: [
      { done: (G) => F(G, 'ch3Started'), text: 'ブリーズヒルの宇宙船の船長キールに話して、水の惑星へ飛ぼう' },
      { done: (G) => F(G, 'diveUnit') || B(G, 'shellcrusher'), text: '南の島の砂浜にいる賞金首シェルクラッシャーを倒そう（甲羅で水中ユニットが作れる）' },
      { done: (G) => F(G, 'diveUnit'), text: 'タイドウォークのドック工房で、甲羅から水中ユニットを付けてもらおう' },
      { done: (G) => F(G, 'abyssKey'), text: '海上プラント（生身でしか入れない）でアビススクイッドを倒し、水没都市の隔壁の鍵を手に入れよう' },
      { done: (G) => B(G, 'abyssleviathan'), text: '水没都市のいちばん奥で、アビスリヴァイアを倒そう' },
    ],
  },
  4: {
    hint: '北の大地へは「溶鉱炉跡」を抜けて行く。溶岩の上は耐熱装甲がないと装甲が減る',
    steps: [
      { done: (G) => F(G, 'ch4Started'), text: 'シーゲートの宇宙船の船長キールに話して、火の惑星へ飛ぼう' },
      { done: (G) => F(G, 'heatArmor') || B(G, 'magmasaurus'), text: '賞金首マグマサウルスを倒そう（うろこで耐熱装甲が作れる）' },
      { done: (G) => F(G, 'heatArmor'), text: 'カルデラリムの耐熱工房で、うろこから耐熱装甲を作ってもらおう' },
      { done: (G) => F(G, 'volcanoKey'), text: '沈んだ軍の研究所（生身でしか入れない）で狂った司令機を倒し、火山防壁の鍵を手に入れよう' },
      { done: (G) => B(G, 'flameemperor'), text: '炎帝の火山で、炎帝イグニスを倒そう' },
    ],
  },
  5: {
    hint: '北の大地へは「古代工房」を抜けて行く',
    steps: [
      { done: (G) => F(G, 'ch5Started'), text: 'クリムゾンフォージの宇宙船の船長キールに話して、光の惑星へ飛ぼう' },
      { done: (G) => F(G, 'templeKey'), text: '宇宙軍の旧基地（生身でしか入れない）で古代の番人を倒し、光の神殿の鍵を手に入れよう' },
      { done: (G) => B(G, 'luxguardian'), text: '光の神殿で、ルクス・ガーディアンを倒そう' },
    ],
  },
  6: {
    hint: '北の大地へは「影の地下道」を抜けて行く',
    steps: [
      { done: (G) => F(G, 'ch6Started'), text: 'ルミナの宇宙船の船長キールに話して、闇の惑星へ飛ぼう' },
      { done: (G) => F(G, 'spireKey'), text: '浮遊ドック（生身でしか入れない）でドックマスターを倒し、霧払いの装置を手に入れよう' },
      { done: (G) => B(G, 'umbraking'), text: '闇の尖塔で、アンブラキングを倒そう' },
    ],
  },
  7: {
    hint: '北の大地へは「虹の回廊」を抜けて行く。ガレージで専用装備を最終の姿にしておこう',
    steps: [
      { done: (G) => F(G, 'ch7Started'), text: 'ダスクヴェイルの宇宙船の船長キールに話して、マザーコアの世界へ飛ぼう' },
      { done: (G) => F(G, 'heartKey'), text: '虹の回廊の奥でブルードクイーンを倒し、マザーコアの心臓への道を開こう' },
      { done: (G) => B(G, 'mothercore'), text: 'マザーコアの心臓で、マザーコアを倒そう' },
    ],
  },
};

// いまの目的 { chapter, text, hint }
export function nextObjective(G) {
  if (F(G, 'gameClear')) return { chapter: 7, text: 'クリアおめでとう！ 残った賞金首・宝箱・隠し通路を探してみよう', hint: '宇宙船や転送台で、行ったことのある星へ自由に行ける' };
  const ch = currentChapter(G);
  const o = OBJECTIVES[ch];
  const step = o.steps.find((s) => !s.done(G));
  return { chapter: ch, text: step ? step.text : 'この章の目的はぜんぶ終わった', hint: o.hint };
}
