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
