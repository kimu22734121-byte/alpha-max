// 曲データ（MML風）。和音やベースは下のヘルパーでコード進行から作る
// 第1弾：町・フィールド・戦闘・ボス戦（＋ダンジョン・タイトル・ファンファーレ）

const NN = ['c', 'c+', 'd', 'd+', 'e', 'f', 'f+', 'g', 'g+', 'a', 'a+', 'b'];
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], '5': [0, 7, 12], sus4: [0, 5, 7], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14] };
const tok = (m) => `o${Math.floor(m / 12) - 1}${NN[((m % 12) + 12) % 12]}`;

function parseChord(name) {
  const m = /^([A-G])([b#]?)([^/]*)(?:\/([A-G])([b#]?))?$/.exec(name);
  const pc = (PC[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0) + 12) % 12;
  const iv = QUAL[m[3]] ?? QUAL[''];
  const bass = m[4] != null ? (PC[m[4]] + (m[5] === 'b' ? -1 : m[5] === '#' ? 1 : 0) + 12) % 12 : pc;
  return { pc, iv, bass };
}
// low 以上で一番近い位置に並べた和音
function voicing(name, low = 55) {
  const { pc, iv } = parseChord(name);
  let root = Math.floor(low / 12) * 12 + pc;
  if (root < low) root += 12;
  if (root - low > 6) root -= 12;
  return iv.map((i) => root + i).map((m) => (m < low ? m + 12 : m)).sort((a, b) => a - b);
}
const chordTok = (ms, len) => `(${ms.map(tok).join('')})${len}`;
const LEN = { 4: '1', 3: '2.', 2: '2', 1: '4' };

// 1小節ずつのコード列を展開する。"Bb C" のように空白で区切ると半小節ずつ
function perBar(chords, fn) {
  return chords.map((bar) => {
    const parts = bar.split(' ');
    const beats = 4 / parts.length;
    return parts.map((c) => fn(c, beats)).join(' ');
  }).join(' | ');
}
const pad = (chords, low = 55) => perBar(chords, (c, b) => chordTok(voicing(c, low), LEN[b]));
const stabs = (chords, low = 53) => perBar(chords, (c, b) => Array.from({ length: b }, () => `r8 ${chordTok(voicing(c, low), 8)}`).join(' '));
const chug = (chords, low = 40, len = 8) => perBar(chords, (c, b) => Array.from({ length: b * (len / 4) }, () => chordTok(voicing(c, low), len)).join(' '));
const hits = (chords, low, rhythm) => perBar(chords, (c, b) => rhythm[b].replace(/X/g, () => `(${voicing(c, low).map(tok).join('')})`));
function arp(chords, low, pat, len = 8) {
  return perBar(chords, (c, b) => {
    const v = voicing(c, low);
    const tones = [...v, ...v.map((m) => m + 12), ...v.map((m) => m + 24)];
    const n = b * (len / 4);
    return Array.from({ length: n }, (_, i) => `${tok(tones[pat[i % pat.length]])}${len}`).join(' ');
  });
}
// R=ルート F=5度 O=オクターブ上 T=3度 / r=休符
function bass(chords, rhythm, oct = 2) {
  return perBar(chords, (c, b) => {
    const { pc, iv, bass: bpc } = parseChord(c);
    const root = (oct + 1) * 12 + bpc;
    const map = { R: root, F: (oct + 1) * 12 + pc + 7, O: root + 12, T: (oct + 1) * 12 + pc + iv[1] };
    return rhythm[b].replace(/([RFOT])/g, (s) => tok(map[s]));
  });
}

// ---------------------------------------------------------------- 町
const townA = ['F', 'C/E', 'Dm', 'Bb', 'F', 'C', 'Bb C', 'F'];
const townB = ['Gm', 'C', 'Am', 'Dm', 'Bb', 'C', 'Dm C', 'Bb C'];
const town = [...townA, ...townB];

// ---------------------------------------------------------------- フィールド
const fieldA = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'];
const fieldB = ['Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'Gm', 'A'];
const field = [...fieldA, ...fieldB];

// ---------------------------------------------------------------- 第2章のフィールド（風の惑星：明るく広がりのある長調）
const windA = ['Dadd9', 'Gmaj7', 'Dadd9', 'Asus4 A', 'Bm7', 'Gmaj7', 'Em7', 'A'];
const windB = ['Gmaj7', 'A', 'F#m7', 'Bm7', 'Gmaj7', 'Dadd9 A', 'Em7', 'Asus4 A'];
const wind = [...windA, ...windB];

// ---------------------------------------------------------------- 第3章のフィールド（水の惑星：のんびりした南の海の長調）
const waterA = ['Fmaj7', 'C/E', 'Dm7', 'Bbmaj7', 'Gm7', 'C', 'Fmaj7', 'C'];
const waterB = ['Bbmaj7', 'C', 'Am7', 'Dm7', 'Gm7', 'C', 'F', 'C7'];
const water = [...waterA, ...waterB];

// ---------------------------------------------------------------- 第4〜7章のフィールド・最後のボス・エンディング
const fire = ['Am', 'Am', 'F', 'G', 'Am', 'Dm', 'E', 'E', 'F', 'G', 'Am', 'Am', 'Dm', 'E', 'Am', 'E'];       // 火：熱くて力強い短調
const light = ['C', 'G/B', 'Am', 'Em', 'F', 'C/E', 'Dm', 'G', 'C', 'Em', 'F', 'G', 'Am', 'F', 'Gsus4 G', 'C'];  // 光：おごそかで明るい長調
const dark = ['Dm', 'Dm', 'Bb', 'A', 'Gm', 'Dm', 'Eb', 'A', 'Dm', 'F', 'Gm', 'A', 'Bb', 'Gm', 'A', 'A'];     // 闇：静かで不気味な短調
// 光（v1.1〜）：天へ昇る壮大な長調／闇（v1.1〜）：決戦前の張りつめた短調
const light5 = ['C', 'G/B', 'Am', 'F', 'Dm', 'G', 'Esus4 E', 'Am', 'F', 'G', 'Em', 'Am', 'Dm', 'Bb', 'Gsus4 G', 'C'];
const light5Mel = `o5 l4
  c2 g e | d2. < b > | c e a g | f2. r |
  d f a > c < | b2 g d | e2 g+ b | > c2. < r |
  a > c f e < | d2 g2 | g b > e d < | c2 e2 |
  f a > d c < | d f g a | g2 > d2 < | > c1 < |`;
const dark6 = ['Dm', 'Dm', 'Bb', 'C', 'Gm', 'A', 'Dm', 'A', 'Bb', 'C', 'Am', 'Dm', 'Gm', 'Eb', 'A', 'A'];
const dark6Mel = `o4 l4
  d2 a2 | f2. e8 d8 | d2 f2 | e2. r |
  g2 b-2 | a2. c+ | d2 f e | a2. r |
  b-2 > d2 < | > c2. < g | a > c e d < | d1 |
  b- > d g f < | g2 b- a | a2 > c+2 < | > d2. < r |`;
// 虹の深淵（v1.2〜）：最終決戦へ向かう勇ましい長調
const rainbow = ['D', 'A', 'Bm', 'G', 'Em', 'A', 'D', 'Asus4 A', 'G', 'A', 'F#m', 'Bm', 'G', 'Em', 'A', 'D'];
const rainbowMel = `o5 l4
  d2 a f+ | e2. c+ | d f+ b a | g2. b |
  e g b a | a2 > c+ e < | d2 f+ a | a2. r |
  g b > d c+ < | a2. e | f+ a > c+ < b | b2. r |
  b > d g f+ < | e g b > e < | a2 > c+2 < | > d1 < |`;
const core = ['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Db', 'Bb', 'G', 'Ab', 'Fm', 'Cm', 'G', 'Ab', 'Db', 'G', 'G'];    // マザーコアの世界：重く不安な短調
const lastA = ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B'];
const lastB = ['C', 'D', 'Bm', 'Em', 'Am', 'D', 'B', 'B'];
const last = [...lastA, ...lastB];
const ending = ['D', 'A/C#', 'Bm', 'F#m', 'G', 'D/F#', 'Em', 'A', 'D', 'A', 'Bm', 'G', 'Em', 'A', 'D', 'D'];

// ---------------------------------------------------------------- 戦闘
const battleIntro = ['E5', 'E5'];
const battleA = ['Em', 'C', 'D', 'B', 'Em', 'C', 'D', 'B'];
const battleB = ['Am', 'Em', 'C', 'D', 'Am', 'Em', 'C D', 'B'];
const battle = [...battleIntro, ...battleA, ...battleB];
const battleMelody = `o5 l8 r1 r1
  e4. f+ g4 b4 | a4. g e2 | f+4. g a4 > d4 < | d+2. r4 |
  e4. f+ g4 b4 | > c4. < b a4 g4 | a4 b4 > c4 d4 < | b2. r4 |
  > c4. < b a4 e4 | g4. f+ e2 | e4 g4 > c4 e4 < | > d2 < a2 |
  > c4. d e4 c4 < | b4. a g4 e4 | e4 g4 f+4 a4 | b2 d+2 |`;

// ---------------------------------------------------------------- ボス戦
const bossA = ['Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'Cm', 'Ab', 'G'];
const bossB = ['Fm', 'G', 'Cm', 'Ab', 'Fm', 'G', 'Ab', 'G'];
const boss = [...bossA, ...bossB];
const bossMelody = `o5 l8
  c4 r c e-4 g4 | f+4 g4 r4 c4 | a-4. g f4 e-4 | d2 f2 |
  c4 r c e-4 g4 | b-4 a-4 g4 e-4 | f4 a-4 > c4 < a-4 | b2 g2 |
  a-4. g f4 c4 | d4. e- d4 < b4 > | c4 e-4 g4 > c4 < | > e-2 < a-2 |
  f4 a-4 > c4 < a-4 | g4 b4 > d4 < b4 | > c4. < b- a-4 g4 | b2 > d2 < |`;

// ---------------------------------------------------------------- ダンジョン
const dungeon = ['Am', 'Am', 'F', 'E', 'Am', 'Dm', 'F', 'E'];

// ---------------------------------------------------------------- タイトル
const title = ['Dm', 'Bb', 'C', 'Dm', 'Gm', 'Bb', 'A', 'A'];

export const SONGS = {
  town: {
    bpm: 104,
    tracks: [
      { inst: 'flute', vol: 1.0, mml: `o5 l8
        a4 g f c4 f4 | g4. a g4 e4 | f4 e d < a4 > d4 | d4. c d2 |
        a4 g f c4 a4 | g2 e4 c4 | d e f g a4 g4 | f2. r4 |
        b-4 a g d4 g4 | a4. g e2 | c4 e a > c4 < b4 | a2 f4 d4 |
        d4 f b- > d4 c4 < | b-4 a4 g2 | a4 f4 g4 e4 | f4 d4 e4 g4 |` },
      { inst: 'piano', vol: 0.55, mml: `q5 ${stabs(town, 53)}` },
      { inst: 'strings', vol: 0.35, mml: pad(town, 60) },
      { inst: 'ebass', vol: 0.9, mml: bass(town, { 4: 'R4. R8 F4 R4', 2: 'R4 F4' }, 2) },
      { inst: 'drums', vol: 0.7, mml: '[o4 c4 d4 c8 c8 d4]16' },
      { inst: 'drums', vol: 0.35, mml: '[o4 r8 e8 r8 e8 r8 e8 r8 e8]16' },
    ],
  },

  field: {
    bpm: 80,
    tracks: [
      { inst: 'flute', vol: 1.0, mml: `o5 l4
        d e f a | g2. f | a2 > c < a | g1 |
        f g a > d < | > c2. < b- | a g f d | e1 |
        f4. g8 f4 d4 | c2. f4 | e4 g4 > c4 < g4 | a1 |
        b-4 a4 g4 f4 | a2 > c2 < | d4 c4 < b-4 > c4 | c+1 |` },
      { inst: 'strings', vol: 0.5, mml: pad(field, 57) },
      { inst: 'warmpad', vol: 0.4, mml: pad(field, 45) },
      { inst: 'harp', vol: 0.55, mml: arp(field, 50, [0, 1, 2, 3, 4, 3, 2, 1]) },
      { inst: 'ebass', vol: 0.6, mml: bass(field, { 4: 'R2. F4', 2: 'R2' }, 2) },
      { inst: 'drums', vol: 0.35, mml: '[o4 g2 r4 g8 a8]16' },
    ],
  },

  // 第2章「風」の惑星のフィールド
  field2: {
    bpm: 92,
    tracks: [
      { inst: 'flute', vol: 1.0, mml: `o5 l4
        d e f+ a | b2. a | f+ e d e | e2. r |
        f+ a > d c+ < | b2 a g | g f+ e d | e1 |
        b > d < b a | a2. e | f+ a > c+ < a | b2. a |
        g b > d e < | > f+2 e2 < | d e g f+ | e2 r2 |` },
      { inst: 'harp', vol: 0.6, mml: arp(wind, 50, [0, 1, 2, 3, 4, 5, 4, 2]) },
      { inst: 'strings', vol: 0.45, mml: pad(wind, 57) },
      { inst: 'warmpad', vol: 0.35, mml: pad(wind, 45) },
      { inst: 'ebass', vol: 0.6, mml: bass(wind, { 4: 'R2 F4 O4', 2: 'R4 F4' }, 2) },
      { inst: 'drums', vol: 0.4, mml: '[o4 c4 e8 e8 d4 e8 e8]16' },
    ],
  },

  // 第3章「水」の惑星のフィールド
  field3: {
    bpm: 96,
    tracks: [
      { inst: 'flute', vol: 1.0, mml: `o5 l4
        c f a g | e2. c | d f a > c < | b-2. a |
        g a b- > d < | > c2 < g2 | a g f e | g1 |
        f b- > d c < | b- a g2 | a > c e d < | > c2 < a2 |
        b- a g f | e g > c < b- | a2 f2 | g2 r2 |` },
      { inst: 'piano', vol: 0.45, mml: `q5 ${stabs(water, 55)}` },
      { inst: 'harp', vol: 0.5, mml: arp(water, 48, [0, 2, 1, 3, 2, 4, 3, 1]) },
      { inst: 'strings', vol: 0.3, mml: pad(water, 60) },
      { inst: 'ebass', vol: 0.75, mml: bass(water, { 4: 'R4. R8 F4 O4', 2: 'R4 F4' }, 2) },
      { inst: 'drums', vol: 0.45, mml: '[o4 c8 e8 d8 e8 c8 c8 d8 e8]16' },
    ],
  },

  // 第4章「火」の惑星のフィールド
  field4: {
    bpm: 112,
    tracks: [
      { inst: 'brass', vol: 0.9, mml: `o4 l4
        a > c e d < | a2. g | f a > c < b | g2. e |
        a > c e g | f2 e d | e g+ b > d < | b2. r |
        > c < a f g | g2 b g | a > c e d < | e2 a2 |
        f a > d c < | b g+ e g+ | a2 e2 | g+2. r |` },
      { inst: 'guitar', vol: 0.6, mml: `q6 ${chug(fire, 40)}` },
      { inst: 'strings', vol: 0.35, mml: pad(fire, 57) },
      { inst: 'ebass', vol: 0.85, mml: bass(fire, { 4: 'R8 R8 O8 R8 F8 R8 O8 R8', 2: 'R8 O8 F8 O8' }, 1) },
      { inst: 'drums', vol: 0.75, mml: '[o4 c8 c8 d8 r8 c8 c8 d8 e8]16' },
    ],
  },
  // 第5章「光」の惑星のフィールド（天上の聖域：おごそかで、天へ昇っていくような壮大な長調）
  field5: {
    bpm: 108,
    tracks: [
      { inst: 'brass', vol: 0.95, mml: light5Mel },
      { inst: 'strings', vol: 0.45, transpose: 12, mml: light5Mel },
      { inst: 'harp', vol: 0.55, mml: arp(light5, 55, [0, 1, 2, 3, 4, 3, 2, 1]) },
      { inst: 'warmpad', vol: 0.4, mml: pad(light5, 48) },
      { inst: 'ebass', vol: 0.8, mml: bass(light5, { 4: 'R4 R4 F4 O4', 2: 'R4 F4' }, 2) },
      { inst: 'drums', vol: 0.6, mml: '[o4 c4 g8 g8 c4 a8 a8]16' },
      { inst: 'drums', vol: 0.5, mml: '[o4 b1 r1 r1 r1]4' },
    ],
  },
  // 第6章「闇」の惑星のフィールド（終焉の夜：決戦が近い、張りつめた速い短調）
  field6: {
    bpm: 132,
    tracks: [
      { inst: 'brass', vol: 0.9, mml: dark6Mel },
      { inst: 'strings', vol: 0.5, mml: `q7 ${arp(dark6, 50, [0, 1, 2, 1, 0, 1, 2, 3])}` },
      { inst: 'guitar', vol: 0.5, mml: `q6 ${chug(dark6, 38)}` },
      { inst: 'warmpad', vol: 0.3, mml: pad(dark6, 45) },
      { inst: 'ebass', vol: 0.95, mml: `q6 ${bass(dark6, { 4: 'R8 R8 R8 R8 R8 R8 O8 R8', 2: 'R8 R8 O8 R8' }, 1)}` },
      { inst: 'drums', vol: 0.8, mml: '[o4 c8 c8 d8 c8 c8 c8 d8 g8]16' },
      { inst: 'drums', vol: 0.3, mml: '[o4 e8 e8 e8 e8 e8 e8 e8 e8]16' },
      { inst: 'drums', vol: 0.5, mml: '[o4 b1 r1 r1 r1]4' },
    ],
  },
  // 第7章「虹の深淵」のフィールド（v1.2〜：最終決戦へ向かう、きらびやかで勇ましい長調のマーチ）
  field7: {
    bpm: 126,
    tracks: [
      { inst: 'brass', vol: 0.95, mml: rainbowMel },
      { inst: 'lead', vol: 0.3, transpose: 12, mml: rainbowMel },
      { inst: 'bell', vol: 0.4, mml: arp(rainbow, 66, [0, 1, 2, 3, 4, 5, 4, 3]) },
      { inst: 'harp', vol: 0.45, mml: arp(rainbow, 55, [0, 2, 1, 2, 0, 2, 1, 2]) },
      { inst: 'strings', vol: 0.45, mml: pad(rainbow, 57) },
      { inst: 'ebass', vol: 0.9, mml: `q6 ${bass(rainbow, { 4: 'R8 R8 F8 R8 O8 R8 F8 R8', 2: 'R8 R8 O8 R8' }, 1)}` },
      { inst: 'drums', vol: 0.75, mml: '[o4 c8 c8 d8 c8 c8 c8 d8 e8]16' },
      { inst: 'drums', vol: 0.5, mml: '[o4 b1 r1 r1 r1]4' },
    ],
  },
  // 最後のボス（マザーコア）
  lastboss: {
    bpm: 176,
    tracks: [
      { inst: 'lead', vol: 1.0, mml: `o5 l8
        e4. f+ g4 b4 | > c4. < b a4 e4 | f+4. g a4 > d4 < | d+2. r4 |
        e4. g b4 > e4 < | > c4. < b a4 g4 | a4 > c4 < b4 a4 | b2. r4 |
        > c4. d e4 c4 < | b4. a g4 e4 | e4 g4 f+4 a4 | b2 > d+2 < |
        > e4. d c4 < b4 | a4. g f+4 e4 | f+4 a4 b4 > d+4 < | e1 |` },
      { inst: 'brass', vol: 0.55, transpose: -12, mml: `o5 l8
        e4. f+ g4 b4 | > c4. < b a4 e4 | f+4. g a4 > d4 < | d+2. r4 |
        e4. g b4 > e4 < | > c4. < b a4 g4 | a4 > c4 < b4 a4 | b2. r4 |
        > c4. d e4 c4 < | b4. a g4 e4 | e4 g4 f+4 a4 | b2 > d+2 < |
        > e4. d c4 < b4 | a4. g f+4 e4 | f+4 a4 b4 > d+4 < | e1 |` },
      { inst: 'guitar', vol: 0.8, mml: `q6 ${chug(last, 40)}` },
      { inst: 'ebass', vol: 1.0, mml: `q6 ${bass(last, { 4: 'R8 R8 O8 R8 R8 R8 O8 R8', 2: 'R8 R8 O8 R8' }, 1)}` },
      { inst: 'strings', vol: 0.35, mml: pad(last, 59) },
      { inst: 'bell', vol: 0.3, mml: arp(last, 64, [0, 1, 2, 3, 4, 3, 2, 1]) },
      { inst: 'warmpad', vol: 0.3, mml: pad(last, 48) },
      { inst: 'drums', vol: 0.95, mml: '[o4 c8 c8 d8 c8 c8 c8 d8 e8]16' },
      { inst: 'drums', vol: 0.5, mml: '[o4 b1 r1 r1 r1]4' },
    ],
  },
  // エンディング（スタッフロール）
  ending: {
    bpm: 80,
    tracks: [
      { inst: 'flute', vol: 1.0, mml: `o5 l4
        f+ a > d < a | e2. c+ | d f+ b a | f+2. r |
        g b > d < b | a2 f+2 | g f+ e g | a1 |
        f+ a > d e | f+2 e2 | d < b > d < b | g2. r |
        e g b a | a > c+ e d | d2 < a2 > | d1 |` },
      { inst: 'piano', vol: 0.55, mml: arp(ending, 50, [0, 1, 2, 3, 2, 1, 2, 1]) },
      { inst: 'strings', vol: 0.5, mml: pad(ending, 57) },
      { inst: 'warmpad', vol: 0.35, mml: pad(ending, 45) },
      { inst: 'ebass', vol: 0.55, mml: bass(ending, { 4: 'R2 F2', 2: 'R2' }, 2) },
    ],
  },

  battle: {
    bpm: 168,
    tracks: [
      { inst: 'lead', vol: 1.0, mml: battleMelody },
      { inst: 'brass', vol: 0.55, transpose: -12, mml: battleMelody },
      { inst: 'guitar', vol: 0.8, mml: `q6 ${chug(battle, 40)}` },
      { inst: 'ebass', vol: 1.0, mml: `q6 ${bass(battle, { 4: 'R8 R8 R8 R8 R8 R8 O8 R8', 2: 'R8 R8 R8 O8' }, 1)}` },
      { inst: 'strings', vol: 0.3, mml: `r1 r1 ${pad([...battleA, ...battleB], 59)}` },
      { inst: 'drums', vol: 0.9, mml: '[o4 c8 r8 d8 r8 c8 c8 d8 r8]18' },
      { inst: 'drums', vol: 0.4, mml: '[o4 e8 e8 e8 e8 e8 e8 e8 e8]18' },
      { inst: 'drums', vol: 0.5, mml: 'o4 b1 r1 b1 r1 r1 r1 r1 r1 r1 r1 b1 r1 r1 r1 r1 r1 r1 r1' },
    ],
  },

  boss: {
    bpm: 152,
    tracks: [
      { inst: 'lead', vol: 0.9, mml: bossMelody },
      { inst: 'strings', vol: 0.45, mml: pad(boss, 55) },
      { inst: 'brass', vol: 0.55, mml: `q6 ${hits(boss, 55, { 4: 'X4 r8 X8 r2', 2: 'X4 r4' })}` },
      { inst: 'ebass', vol: 1.0, mml: `q6 ${bass(boss, { 4: 'R8 R8 O8 R8 R8 R8 F8 R8', 2: 'R8 R8 O8 R8' }, 1)}` },
      { inst: 'drums', vol: 0.9, mml: '[o4 c8 c8 d8 c8 c8 c8 d8 c8]16' },
      { inst: 'drums', vol: 0.35, mml: '[o4 e8 e8 f8 e8 e8 e8 f8 e8]16' },
      { inst: 'drums', vol: 0.5, mml: '[o4 b1 r1 r1 r1]4' },
    ],
  },

  dungeon: {
    bpm: 92,
    tracks: [
      { inst: 'bell', vol: 0.8, mml: `o5 e2 r4 a8 g8 | e1 | f4 e4 c4 < a4 > | g+1 | e2 r4 c8 d8 | f2 e4 d4 | c4 < a4 > c4 d4 | < b1 > |` },
      { inst: 'warmpad', vol: 0.5, mml: pad(dungeon, 52) },
      { inst: 'tribass', vol: 0.8, mml: bass(dungeon, { 4: 'R2 r4 R4', 2: 'R2' }, 2) },
      { inst: 'pluck', vol: 0.35, mml: arp(dungeon, 57, [0, 2, 1, 2], 8) },
      { inst: 'drums', vol: 0.35, mml: '[o4 c4 r8 e8 r8 e8 g4]8' },
    ],
  },

  title: {
    bpm: 88,
    tracks: [
      { inst: 'brass', vol: 0.8, mml: `o4 d2 a2 | b-2. a4 | g2 > c2 < | a1 | b-2 a2 | g4 f4 e4 d4 | c+2 e2 | a1 |` },
      { inst: 'strings', vol: 0.55, mml: pad(title, 57) },
      { inst: 'warmpad', vol: 0.35, mml: pad(title, 45) },
      { inst: 'ebass', vol: 0.7, mml: bass(title, { 4: 'R1', 2: 'R2' }, 1) },
      { inst: 'drums', vol: 0.55, mml: '[o4 g4 r4 g8 g8 g4]7 o4 g8 g8 a8 a8 g8 g8 b4' },
    ],
  },

  // オープニング：宇宙をただよう静かな曲から、だんだん広がっていく
  opening: {
    bpm: 72,
    tracks: [
      { inst: 'bell', vol: 0.7, mml: `o5 l8 d a > d < a f a > c < a | d a > d < a g b- > d < b- | c g > c < g e g > c < g | c+ a > c+ < a e a > c+ < a |
        d a > d < a f a > c < a | b- > f b- f < g > d g d < | a > e a e < c+ a > e < a | d1 |` },
      { inst: 'warmpad', vol: 0.55, mml: pad(['Dm', 'Gm', 'C', 'A', 'Dm', 'Bb Gm', 'A', 'Dm'], 50) },
      { inst: 'strings', vol: 0.4, mml: `r1 r1 r1 r1 ${pad(['Dm', 'Bb Gm', 'A', 'Dm'], 62)}` },
      { inst: 'ebass', vol: 0.5, mml: bass(['Dm', 'Gm', 'C', 'A', 'Dm', 'Bb Gm', 'A', 'Dm'], { 4: 'R1', 2: 'R2' }, 1) },
      { inst: 'drums', vol: 0.35, mml: 'r1 r1 r1 r1 [o4 g2 r4 g4]3 o4 g8 g8 a8 a8 b2' },
    ],
  },

  fanfare: {
    bpm: 150,
    loop: false,
    tracks: [
      { inst: 'lead', vol: 1.0, mml: 'o5 l8 c c c c4 r < g > c e g4 e g > c2 < r4' },
      { inst: 'brass', vol: 0.7, mml: 'o4 l8 (ceg) (ceg) (ceg) (ceg)4 r (<b>dg) (ceg) (ceg) (dg>c<)4 (ceg) (dg>c<) (eg>c<)2 r4' },
      { inst: 'ebass', vol: 0.8, mml: 'o2 l8 c c c c4 r < g > c c g4 c g > c2 < r4' },
      { inst: 'drums', vol: 0.7, mml: 'o4 l8 c d d d4 r d c c d4 c d b2 r4' },
    ],
  },

  gameover: {
    bpm: 70,
    loop: false,
    tracks: [
      { inst: 'flute', vol: 0.9, mml: 'o5 e4 d4 c4 < b4 | a2. r4 | f4 e4 d4 c4 | < b1 >' },
      { inst: 'strings', vol: 0.5, mml: pad(['Am', 'Am', 'Dm', 'E'], 52) },
    ],
  },
};
