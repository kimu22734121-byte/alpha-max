// マップの描画。数字の表からタイル画像をキャンバスに描き、地面の板に貼る
// mode: '2d' = 2Dタイル（標準） / '3d' = 山や壁を立体にした試験版
// どちらも { group, dispose() } を返すので、今後 3D マップを作り込む時も差し替えやすい
import * as THREE from 'three';
import { TILES } from '../data/tiles.js';

const TS = 32; // 1タイルのピクセル数

function rng(x, y, k = 0) {
  let h = (x * 374761393 + y * 668265263 + k * 1442695041) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function speckle(g, px, py, x, y, colors, n, size = 2) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(rng(x, y, i) * colors.length)];
    g.fillRect(px + Math.floor(rng(x, y, i + 50) * (TS - size)), py + Math.floor(rng(x, y, i + 99) * (TS - size)), size, size);
  }
}

const DRAW = {
  0(g, px, py, x, y) { g.fillStyle = '#c8a46a'; g.fillRect(px, py, TS, TS); speckle(g, px, py, x, y, ['#b89458', '#d6b47a', '#bf9a60'], 10); },
  1(g, px, py, x, y) {
    g.fillStyle = '#8f7a62'; g.fillRect(px, py, TS, TS);
    speckle(g, px, py, x, y, ['#7a6650', '#a08a70'], 8, 3);
    for (let i = 0; i < 2; i++) {
      const cx = px + 6 + rng(x, y, i + 7) * 20, cy = py + 6 + rng(x, y, i + 9) * 20, r = 3 + rng(x, y, i) * 4;
      g.fillStyle = '#6e6458'; g.beginPath(); g.ellipse(cx, cy + 1, r, r * 0.7, 0, 0, 7); g.fill();
      g.fillStyle = '#a59a8a'; g.beginPath(); g.ellipse(cx - 1, cy - 1, r * 0.8, r * 0.55, 0, 0, 7); g.fill();
    }
  },
  2(g, px, py, x, y) {
    g.fillStyle = '#7c838b'; g.fillRect(px, py, TS, TS);
    g.fillStyle = '#6a7078'; g.fillRect(px, py + TS - 2, TS, 2); g.fillRect(px + TS - 2, py, 2, TS);
    g.fillStyle = '#9aa1a8'; g.fillRect(px, py, TS, 1); g.fillRect(px, py, 1, TS);
    g.fillStyle = '#5a6068'; for (const [a, b] of [[4, 4], [TS - 6, 4], [4, TS - 6], [TS - 6, TS - 6]]) g.fillRect(px + a, py + b, 2, 2);
    if (rng(x, y) < 0.15) { g.fillStyle = 'rgba(120,70,40,0.35)'; g.fillRect(px + 8, py + 10, 12, 8); }
  },
  3(g, px, py, x, y) {
    g.fillStyle = '#6f5034'; g.fillRect(px, py, TS, TS);
    const ox = (rng(x, y) - 0.5) * 6;
    g.fillStyle = '#5a3e26'; g.beginPath(); g.moveTo(px + 1, py + TS); g.lineTo(px + TS / 2 + ox, py + 2); g.lineTo(px + TS - 1, py + TS); g.fill();
    g.fillStyle = '#9a7650'; g.beginPath(); g.moveTo(px + 1, py + TS); g.lineTo(px + TS / 2 + ox, py + 2); g.lineTo(px + TS / 2 + ox - 2, py + TS); g.fill();
    g.fillStyle = '#c8a070'; g.beginPath(); g.moveTo(px + TS / 2 + ox - 4, py + 9); g.lineTo(px + TS / 2 + ox, py + 2); g.lineTo(px + TS / 2 + ox + 3, py + 8); g.fill();
  },
  4(g, px, py) {
    g.fillStyle = '#3c4148'; g.fillRect(px, py, TS, TS);
    g.fillStyle = '#4d535b'; g.fillRect(px + 2, py + 2, TS - 4, TS / 2 - 3); g.fillRect(px + 2, py + TS / 2 + 1, TS - 4, TS / 2 - 3);
    g.fillStyle = '#2a2e33'; g.fillRect(px, py + TS / 2 - 1, TS, 2);
  },
  5(g, px, py, x, y) { g.fillStyle = '#a88c60'; g.fillRect(px, py, TS, TS); speckle(g, px, py, x, y, ['#977b52', '#b69a6c'], 6); g.fillStyle = 'rgba(80,60,40,0.18)'; g.fillRect(px + 7, py, 3, TS); g.fillRect(px + TS - 10, py, 3, TS); },
  7(g, px, py) { g.fillStyle = '#2a2420'; g.fillRect(px + 4, py + 4, TS - 8, TS - 4); g.fillStyle = '#ffcf6a'; g.fillRect(px + 6, py + 6, TS - 12, 3); },
  8(g, px, py, x, y) {
    g.fillStyle = '#3f9a2f'; g.fillRect(px, py, TS, TS);
    g.fillStyle = '#62c843'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(px + 5 + rng(x, y, i) * 22, py + 5 + rng(x, y, i + 3) * 22, 2 + rng(x, y, i + 6) * 3, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(200,255,160,0.35)'; g.fillRect(px + 4, py + 8, 10, 2);
  },
  9(g, px, py, x, y) { DRAW[0](g, px, py, x, y); g.strokeStyle = '#7f7030'; g.lineWidth = 1.5; for (let i = 0; i < 5; i++) { const bx = px + 3 + rng(x, y, i) * 26, by = py + 10 + rng(x, y, i + 5) * 18; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 3, by - 7); g.moveTo(bx, by); g.lineTo(bx + 2, by - 8); g.stroke(); } },
  10(g, px, py) {
    g.fillStyle = '#43566a'; g.fillRect(px, py, TS, TS);
    g.fillStyle = '#5d7690'; g.fillRect(px, py + 3, TS, 6);
    g.fillStyle = '#2d3a48'; g.fillRect(px, py + TS - 6, TS, 6);
    g.fillStyle = '#8fb8d8'; g.fillRect(px + 4, py + 5, 3, 2); g.fillRect(px + 20, py + 5, 3, 2);
  },
  11(g, px, py, x, y) { DRAW[5](g, px, py, x, y); g.fillStyle = '#ffd040'; for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(px + 8, py + 8 + i * 10); g.lineTo(px + 16, py + 14 + i * 10); g.lineTo(px + 24, py + 8 + i * 10); g.lineTo(px + 24, py + 11 + i * 10); g.lineTo(px + 16, py + 17 + i * 10); g.lineTo(px + 8, py + 11 + i * 10); g.fill(); } },
  12(g, px, py, x) {
    g.fillStyle = '#2f3236'; g.fillRect(px, py, TS, TS);
    g.fillStyle = '#4a4e54'; for (let i = 0; i < 4; i++) g.fillRect(px + ((i * 8 + x * 3) % TS), py + 3, 4, TS - 6);
    g.fillStyle = '#c8a020'; g.fillRect(px, py, TS, 2); g.fillRect(px, py + TS - 2, TS, 2);
  },
  13(g, px, py, x, y) { DRAW[0](g, px, py, x, y); g.fillStyle = '#5a5a5a'; g.fillRect(px + 5, py + 12, 14, 10); g.fillStyle = '#7a6a5a'; g.fillRect(px + 14, py + 6, 12, 12); g.fillStyle = '#3a3a3a'; g.fillRect(px + 8, py + 20, 18, 5); g.fillStyle = '#9a4a2a'; g.fillRect(px + 16, py + 8, 4, 4); },
  14(g, px, py, x, y) { g.fillStyle = '#8c877e'; g.fillRect(px, py, TS, TS); g.strokeStyle = '#77736b'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, TS / 2, TS / 2); g.strokeRect(px + TS / 2 + 0.5, py + TS / 2 + 0.5, TS / 2 - 1, TS / 2 - 1); speckle(g, px, py, x, y, ['#7f7a72', '#9a958c'], 4); },
  15(g, px, py, x, y) {
    g.fillStyle = '#4a4f56'; g.fillRect(px, py, TS, TS);
    g.fillStyle = '#6a7078'; g.fillRect(px + 3, py + 3, TS - 6, TS - 10);
    g.fillStyle = '#2a2e33'; g.fillRect(px + 3, py + TS - 7, TS - 6, 4);
    g.fillStyle = rng(x, y) < 0.5 ? '#ff5a3a' : '#5aff8a'; g.fillRect(px + 6, py + 6, 3, 3);
    g.fillStyle = '#8a9098'; g.fillRect(px + 12, py + 7, 12, 2); g.fillRect(px + 12, py + 11, 12, 2);
  },
  16(g, px, py) {
    g.fillStyle = '#3a3e44'; g.fillRect(px, py, TS, TS);
    g.fillStyle = '#8a7a5a'; g.fillRect(px, py + 6, TS, 8); g.fillStyle = '#b09a70'; g.fillRect(px, py + 7, TS, 2);
    g.fillStyle = '#6a6e74'; g.fillRect(px, py + 18, TS, 8); g.fillStyle = '#8a9098'; g.fillRect(px, py + 19, TS, 2);
    g.fillStyle = '#2a2a2a'; g.fillRect(px + 14, py + 4, 4, 24);
  },
  17(g, px, py, x, y) {
    g.fillStyle = '#2e2636'; g.fillRect(px, py, TS, TS);
    g.strokeStyle = '#3e3448'; g.strokeRect(px + 0.5, py + 0.5, TS - 1, TS - 1);
    g.strokeStyle = 'rgba(190,80,230,0.55)'; g.lineWidth = 2; g.beginPath();
    g.moveTo(px + rng(x, y) * TS, py); g.quadraticCurveTo(px + 16, py + 16, px + rng(x, y, 2) * TS, py + TS); g.stroke();
  },
  18(g, px, py, x, y) { DRAW[14](g, px, py, x, y); g.fillStyle = '#6a5a48'; g.fillRect(px + 4, py + 14, 24, 12); g.fillStyle = '#8a7a6a'; g.fillRect(px + 8, py + 8, 14, 10); g.fillStyle = '#4a6a8a'; g.fillRect(px + 18, py + 12, 8, 6); g.fillStyle = '#a04a2a'; g.fillRect(px + 6, py + 18, 6, 4); },
  21(g, px, py, x, y) { DRAW[3](g, px, py, x, y); g.strokeStyle = '#d8b888'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 10, py + 14); g.lineTo(px + 15, py + 20); g.lineTo(px + 12, py + 27); g.stroke(); },
};
DRAW[6] = (g, px, py) => { g.fillStyle = '#555'; g.fillRect(px, py, TS, TS); };
DRAW[19] = DRAW[0];
// 隠し通路は周りの壁と同じ見た目（よく見ると細いひびがある）
const crack = (base) => (g, px, py, x, y) => { base(g, px, py, x, y); g.strokeStyle = 'rgba(255,240,200,0.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 12, py + 6); g.lineTo(px + 17, py + 14); g.lineTo(px + 13, py + 24); g.stroke(); };
DRAW[20] = DRAW[0];
DRAW[22] = DRAW[0];
DRAW[34] = DRAW[0];
DRAW[23] = DRAW[1];
// 建物の中：木の床と壁
// 建物の中の床と壁。町ごと・施設ごとの雰囲気（map.theme）で素材と色を変える
let THEME = null;
const shade = (hex, k) => { const c = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(c >> 16)},${f((c >> 8) & 255)},${f(c & 255)})`; };
DRAW[28] = (g, px, py, x, y) => {
  const t = THEME || { floor: 'wood', floorColor: '#8a6440' };
  const base = t.floorColor;
  g.fillStyle = base; g.fillRect(px, py, TS, TS);
  if (t.floor === 'stone') {
    g.strokeStyle = shade(base, 0.75); g.lineWidth = 2; g.strokeRect(px + 1, py + 1, TS - 2, TS - 2);
    g.fillStyle = shade(base, 1.12); g.fillRect(px + 4 + rng(x, y) * 10, py + 6, 8, 5);
  } else if (t.floor === 'metal') {
    g.fillStyle = shade(base, 0.8); g.fillRect(px, py + TS - 2, TS, 2); g.fillRect(px + TS - 2, py, 2, TS);
    g.fillStyle = shade(base, 1.25); for (const [a, b] of [[4, 4], [TS - 6, 4], [4, TS - 6], [TS - 6, TS - 6]]) g.fillRect(px + a, py + b, 2, 2);
  } else {
    g.fillStyle = shade(base, 0.85); for (let i = 0; i < 4; i++) g.fillRect(px, py + i * 8 + 7, TS, 1);
    g.fillStyle = shade(base, 1.12); g.fillRect(px + ((x * 11 + y * 7) % 24), py + 2, 6, 3);
  }
  if (t.rug && x >= t.rug[0] && x < t.rug[2] && y >= t.rug[1] && y < t.rug[3]) { g.fillStyle = t.rugColor; g.globalAlpha = 0.75; g.fillRect(px, py, TS, TS); g.globalAlpha = 1; g.fillStyle = shade(t.rugColor, 1.3); g.fillRect(px, py + 14, TS, 3); }
};
DRAW[29] = (g, px, py) => {
  const base = THEME?.wallColor || '#5a4a3e';
  g.fillStyle = base; g.fillRect(px, py, TS, TS);
  g.fillStyle = shade(base, 1.2); g.fillRect(px + 1, py + 1, TS - 2, TS / 2 - 2);
  g.fillStyle = shade(base, 0.75); g.fillRect(px, py + TS - 5, TS, 5);
};
// 地下への階段
DRAW[33] = (g, px, py) => {
  g.fillStyle = '#1a1612'; g.fillRect(px, py, TS, TS);
  g.fillStyle = '#6a5a4a'; for (let i = 0; i < 5; i++) g.fillRect(px + 3, py + 3 + i * 6, TS - 6, 3 - i * 0.3);
};
// 坑道の壁
DRAW[24] = (g, px, py, x, y) => {
  g.fillStyle = '#2a221c'; g.fillRect(px, py, TS, TS);
  for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? '#3e3228' : '#4a3c30'; g.beginPath(); g.ellipse(px + 6 + rng(x, y, i) * 20, py + 6 + rng(x, y, i + 4) * 20, 6 + rng(x, y, i + 8) * 5, 4 + rng(x, y, i + 9) * 4, 0, 0, 7); g.fill(); }
  if (rng(x, y, 3) < 0.08) { g.fillStyle = '#7ad0ff'; g.fillRect(px + 14, py + 12, 3, 3); }
};
// 線路
DRAW[25] = (g, px, py, x, y) => {
  DRAW[1](g, px, py, x, y);
  g.fillStyle = '#5a4430'; for (let i = 0; i < 4; i++) g.fillRect(px + 2 + i * 8, py + 6, 4, TS - 12);
  g.fillStyle = '#9aa0a8'; g.fillRect(px, py + 9, TS, 2); g.fillRect(px, py + TS - 11, TS, 2);
};
// 船の床・船の壁
DRAW[26] = (g, px, py, x, y) => {
  g.fillStyle = '#3a4052'; g.fillRect(px, py, TS, TS);
  g.strokeStyle = '#2a2e3c'; g.lineWidth = 2; g.strokeRect(px + 1, py + 1, TS - 2, TS - 2);
  g.fillStyle = '#4a5066'; g.fillRect(px + 4, py + 4, TS - 8, 3);
  if (rng(x, y) < 0.12) { g.fillStyle = 'rgba(160,70,200,0.5)'; g.beginPath(); g.ellipse(px + 16, py + 18, 10, 6, 0.4, 0, 7); g.fill(); }
  if (rng(x, y, 2) < 0.06) { g.fillStyle = '#ff5a5a'; g.fillRect(px + 24, py + 24, 3, 3); }
};
DRAW[27] = (g, px, py, x, y) => {
  g.fillStyle = '#1c1e28'; g.fillRect(px, py, TS, TS);
  g.fillStyle = '#2c3040'; g.fillRect(px + 2, py + 2, TS - 4, TS / 2 - 3); g.fillRect(px + 2, py + TS / 2 + 1, TS - 4, TS / 2 - 3);
  if (rng(x, y) < 0.1) { g.fillStyle = '#5a6aff'; g.fillRect(px + 6, py + 6, 4, 2); }
};
DRAW[30] = crack(DRAW[24]);
DRAW[31] = crack(DRAW[27]);
DRAW[32] = crack(DRAW[4]);

// 3Dの建物の下に描く土台と入口の石段
function drawFoundation(g, b) {
  const x = b.x * TS, y = b.y * TS, w = b.w * TS, h = b.h * TS;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
  g.fillStyle = '#6a645c'; g.fillRect(x, y, w, h);
  g.fillStyle = '#7a746a'; for (let i = 0; i < b.w; i++) for (let j = 0; j < b.h; j++) g.fillRect(x + i * TS + 2, y + j * TS + 2, TS - 4, TS - 4);
  const dx = b.door[0] * TS, dy = b.door[1] * TS;
  g.fillStyle = '#b0a898'; g.fillRect(dx + 3, dy + 6, TS - 6, TS - 6);
  g.fillStyle = '#ffd98a'; g.fillRect(dx + 6, dy + TS - 5, TS - 12, 2);
}

function drawBuilding(g, b) {
  const x = b.x * TS, y = b.y * TS, w = b.w * TS, h = b.h * TS;
  const roofH = h - TS * 1.25;
  // 壁（正面）
  g.fillStyle = '#7a6f62'; g.fillRect(x, y + roofH, w, h - roofH);
  g.fillStyle = '#5f564c'; for (let i = 0; i < b.w; i++) g.fillRect(x + i * TS + TS - 3, y + roofH, 2, h - roofH);
  // 屋根
  const roofCol = { home: '#b0502c', inn: '#3c6a8c', bar: '#7a3c6a', office: '#8a6a2a', weapon: '#8a2c2c', parts: '#3c7a5a', item: '#5a7a2c', garage: '#5a5f66' }[b.facility] || '#6a6a6a';
  g.fillStyle = roofCol; g.fillRect(x - 2, y, w + 4, roofH);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x - 2, y, w + 4, 4);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 2, y + roofH - 4, w + 4, 4);
  for (let i = 1; i < b.w * 2; i++) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + i * TS / 2, y + 4, 1, roofH - 8); }
  // 窓
  g.fillStyle = '#ffd98a';
  for (let i = 0; i < b.w; i++) if (i !== Math.floor(b.w / 2)) g.fillRect(x + i * TS + 9, y + roofH + 8, 14, 10);
  // ドア
  const dx = b.door[0] * TS, dy = b.door[1] * TS;
  g.fillStyle = '#2a2018'; g.fillRect(dx + 5, dy + 4, TS - 10, TS - 4);
  g.fillStyle = '#ffcf6a'; g.fillRect(dx + 7, dy + 6, TS - 14, 3);
  if (b.facility === 'garage') { g.fillStyle = '#c8a020'; for (let i = 0; i < 6; i++) g.fillRect(x + 4 + i * (w - 8) / 6, y + roofH + 2, (w - 8) / 12, 4); }
  // 看板
  g.font = `bold ${b.label.length > 6 ? 15 : 18}px "DotGothic16", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`;
  const tw = g.measureText(b.label).width + 14;
  const sx = x + w / 2 - tw / 2, sy = y + roofH / 2 - 13;
  g.fillStyle = 'rgba(20,16,12,0.85)'; g.fillRect(sx, sy, tw, 26);
  g.strokeStyle = '#e8b04a'; g.lineWidth = 2; g.strokeRect(sx, sy, tw, 26);
  g.fillStyle = '#ffe9b0'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(b.label, x + w / 2, sy + 14);
}

function drawIcon(g, cx, cy, kind) {
  if (kind === 'town') {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx, cy + 14, 44, 12, 0, 0, 7); g.fill();
    g.fillStyle = '#5a6a78'; g.fillRect(cx - 40, cy, 80, 14);
    const grd = g.createRadialGradient(cx - 10, cy - 20, 4, cx, cy, 44);
    grd.addColorStop(0, 'rgba(220,240,255,0.95)'); grd.addColorStop(1, 'rgba(110,160,200,0.85)');
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, 38, Math.PI, 0); g.fill();
    g.strokeStyle = '#3a4a58'; g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(cx, cy, Math.abs(i) * 9 + 2, 38, 0, Math.PI, 0); g.stroke(); }
    g.fillStyle = '#2a2018'; g.fillRect(cx - 7, cy + 2, 14, 12);
  } else if (kind === 'mine') {
    g.fillStyle = '#5a4430'; g.beginPath(); g.moveTo(cx - 40, cy + 16); g.lineTo(cx - 22, cy - 24); g.lineTo(cx + 22, cy - 24); g.lineTo(cx + 40, cy + 16); g.fill();
    g.fillStyle = '#0e0b08'; g.beginPath(); g.arc(cx, cy + 6, 16, Math.PI, 0); g.fillRect(cx - 16, cy + 6, 32, 10); g.fill();
    g.fillStyle = '#8a6a40'; g.fillRect(cx - 20, cy - 12, 40, 5); g.fillRect(cx - 20, cy - 12, 5, 28); g.fillRect(cx + 15, cy - 12, 5, 28);
    g.fillStyle = '#9aa0a8'; g.fillRect(cx - 10, cy + 14, 2, 8); g.fillRect(cx + 8, cy + 14, 2, 8);
  } else if (kind === 'ship') {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx, cy + 14, 50, 12, 0, 0, 7); g.fill();
    g.save(); g.translate(cx, cy); g.rotate(-0.25);
    g.fillStyle = '#5a5e6e'; g.beginPath(); g.ellipse(0, 0, 50, 16, 0, 0, 7); g.fill();
    g.fillStyle = '#7a7e8e'; g.beginPath(); g.ellipse(-6, -4, 38, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#3a3e4e'; g.beginPath(); g.moveTo(10, -10); g.lineTo(30, -34); g.lineTo(38, -30); g.lineTo(26, -6); g.fill();
    g.fillStyle = '#8affff'; g.fillRect(28, -6, 10, 5);
    g.fillStyle = '#1a1612'; g.fillRect(-10, 2, 14, 10);
    g.restore();
    g.fillStyle = 'rgba(90,90,90,0.5)'; g.beginPath(); g.arc(cx + 30, cy - 30, 9, 0, 7); g.arc(cx + 38, cy - 42, 12, 0, 7); g.fill();
  } else {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(cx - 44, cy + 10, 92, 10);
    g.fillStyle = '#5a5048'; g.fillRect(cx - 42, cy - 18, 84, 32);
    g.fillStyle = '#7a6a58'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(cx - 42 + i * 21, cy - 18); g.lineTo(cx - 42 + i * 21 + 21, cy - 30); g.lineTo(cx - 42 + i * 21 + 21, cy - 18); g.fill(); }
    g.fillStyle = '#3a3430'; g.fillRect(cx + 22, cy - 50, 10, 34);
    g.fillStyle = '#8a3a9a'; g.beginPath(); g.arc(cx - 20, cy - 8, 8, 0, 7); g.fill();
    g.fillStyle = '#1a1612'; g.fillRect(cx - 8, cy - 2, 16, 16);
  }
}

export function drawMapCanvas(map) {
  THEME = map.theme || null;
  const cv = document.createElement('canvas');
  cv.width = map.width * TS; cv.height = map.height * TS;
  const g = cv.getContext('2d');
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const t = map.grid[y][x];
    (DRAW[t] || DRAW[0])(g, x * TS, y * TS, x, y);
  }
  for (const b of map.buildings || []) (map.buildings3d ? drawFoundation : drawBuilding)(g, b);
  // 3Dの建造物があるマップ（フィールド）では2Dのアイコンは描かない
  if (!map.structures) for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const t = map.grid[y][x];
    if (t === 19) drawIcon(g, x * TS + TS / 2, y * TS + TS / 2, 'town');
    if (t === 20) drawIcon(g, x * TS + TS / 2, y * TS + TS / 2, 'factory');
    if (t === 22) drawIcon(g, x * TS + TS / 2, y * TS + TS / 2, 'ship');
    if (t === 23) drawIcon(g, x * TS + TS / 2, y * TS + TS / 2, 'mine');
  }
  // 大きなマップはスマホのGPUにやさしいように縮める
  const MAX = 2560;
  if (cv.width > MAX || cv.height > MAX) {
    const k = MAX / Math.max(cv.width, cv.height);
    const small = document.createElement('canvas');
    small.width = Math.round(cv.width * k); small.height = Math.round(cv.height * k);
    const sg = small.getContext('2d');
    sg.imageSmoothingQuality = 'high';
    sg.drawImage(cv, 0, 0, small.width, small.height);
    return small;
  }
  return cv;
}

// ---------------------------------------------------------------- 地面の高さ（丘・崖・坂）
// フィールドだけ高低差をつける。山のタイルは高く盛り上がって崖になり、歩ける場所はなだらかな丘と坂になる
// 角（タイルの四隅）の高さを持っておき、heightAt() で好きな場所の高さを補間して返す
const BLOCK_TALL = new Set([3]);
export function heightField(map) {
  if (map._hf) return map._hf;
  const W = map.width, H = map.height;
  const hills = map.type === 'field';
  const th = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = map.grid[y][x];
    let h = 0;
    if (hills) {
      const base = (Math.sin(x * 0.11 + 1.3) + Math.sin(y * 0.13 + 2.1) + Math.sin((x + y) * 0.06) + Math.sin((x - y) * 0.08 + 0.7)) * 0.2 + 0.25;
      h = Math.max(0, base) * 1.1;
      if (t === 5 || t === 11 || t === 19 || t === 20 || t === 22 || t === 23 || t === 34) h *= 0.35; // 道と入口は平らに近く
      if (t === 8) h = -0.12;
      if (BLOCK_TALL.has(t)) h = 1.7 + rng(x, y, 7) * 1.1;
    }
    th[y * W + x] = h;
  }
  const c = new Float32Array((W + 1) * (H + 1));
  for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
    let sw = 0, nw = 0, sa = 0, na = 0;
    for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      const tx = x + dx, ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
      const v = th[ty * W + tx];
      sa += v; na++;
      if (!BLOCK_TALL.has(map.grid[ty][tx])) { sw += v; nw++; }
    }
    // 歩ける場所に接している角は低い方（歩ける場所の高さ）にそろえる → 山の境目が崖になる
    c[y * (W + 1) + x] = nw ? sw / nw : na ? sa / na : 0;
  }
  map._hf = { W, H, c };
  return map._hf;
}
export function heightAt(map, x, z) {
  const hf = heightField(map);
  const W = hf.W, H = hf.H;
  x = Math.max(0, Math.min(W - 0.001, x)); z = Math.max(0, Math.min(H - 0.001, z));
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const C = (i, j) => hf.c[j * (W + 1) + i];
  return (C(ix, iz) * (1 - fx) + C(ix + 1, iz) * fx) * (1 - fz) + (C(ix, iz + 1) * (1 - fx) + C(ix + 1, iz + 1) * fx) * fz;
}

function groundGeometry(map) {
  const hf = heightField(map);
  const W = hf.W, H = hf.H;
  const pos = new Float32Array((W + 1) * (H + 1) * 3), uv = new Float32Array((W + 1) * (H + 1) * 2);
  for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) {
    const k = j * (W + 1) + i;
    pos[k * 3] = i; pos[k * 3 + 1] = hf.c[k]; pos[k * 3 + 2] = j;
    uv[k * 2] = i / W; uv[k * 2 + 1] = 1 - j / H;
  }
  const idx = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const a = j * (W + 1) + i, b = a + 1, c = a + W + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createMapView(map, mode = '3d', renderer) {
  const group = new THREE.Group();
  const cv = drawMapCanvas(map);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  const ground = new THREE.Mesh(groundGeometry(map), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }));
  ground.receiveShadow = true;
  group.add(ground);
  // 周りの外側（マップの外が真っ黒にならないように）
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: map.ground || '#555', roughness: 1 }));
  outer.rotation.x = -Math.PI / 2;
  outer.position.set(map.width / 2, -0.05, map.height / 2);
  outer.receiveShadow = true;
  group.add(outer);
  const disposables = [tex, ground.geometry, ground.material, outer.geometry, outer.material];
  const view = { group, hidden: null, dispose() { for (const d of disposables) d.dispose(); } };
  if (mode !== '2d') add3D(map, group, disposables, view);
  return view;
}

// 立体の山・岩・枯れ木・瓦礫・ダンジョンの壁（固定カメラから奥行きが出るように）
function add3D(map, group, disposables, view) {
  const S = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.95, ...extra });
  const field = map.type === 'field';
  const kinds = {
    3: field
      ? { geo: new THREE.ConeGeometry(0.85, 1.6, 6), mat: S(0x8a6442), y: 0.6, h: [0.9, 1.9], w: [1.0, 1.5], onTerrain: true }
      : { geo: new THREE.ConeGeometry(0.7, 1.5, 6), mat: S(0x7a5a3a), y: 0.75, h: [0.9, 1.4], w: [1, 1.3] },
    21: { geo: new THREE.ConeGeometry(0.7, 1.0, 6), mat: S(0x9a7652), y: 0.5, h: [0.8, 1.0], w: [0.9, 1.0], onTerrain: true },
    4: { geo: new THREE.BoxGeometry(1, 1.6, 1), mat: S(0x4a4f57), y: 0.8, h: [1, 1], w: [1, 1] },
    10: { geo: new THREE.BoxGeometry(1, 1.4, 1), mat: S(0x4a6078, { metalness: 0.4 }), y: 0.7, h: [1, 1], w: [1, 1] },
    24: { geo: new THREE.DodecahedronGeometry(0.75, 0), mat: S(0x4a3a2c), y: 0.7, h: [1.1, 1.7], w: [1.1, 1.3] },
    27: { geo: new THREE.BoxGeometry(1, 1.7, 1), mat: S(0x2a2e3e, { metalness: 0.5 }), y: 0.85, h: [1, 1], w: [1, 1] },
    15: { geo: new THREE.BoxGeometry(0.9, 1.1, 0.9), mat: S(0x5a5f66, { metalness: 0.4 }), y: 0.55, h: [0.9, 1.3], w: [1, 1] },
    16: { geo: new THREE.CylinderGeometry(0.22, 0.22, 1, 8), mat: S(0x8a7a5a, { metalness: 0.5 }), y: 0.5, h: [1, 1], w: [1, 1], rotZ: true },
    13: { geo: new THREE.BoxGeometry(0.6, 0.5, 0.6), mat: S(0x5a5a5a, { metalness: 0.4 }), y: 0.25, h: [0.8, 1.5], w: [0.8, 1.4], onTerrain: true },
    18: { geo: new THREE.BoxGeometry(0.7, 0.45, 0.7), mat: S(0x6a5a48), y: 0.22, h: [0.8, 1.4], w: [0.8, 1.3] },
  };
  // 隠し通路は見た目は壁（近づくと透ける）
  const hiddenLook = { 30: 24, 31: 27, 32: 4 };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const place = (inst, i, x, y, k, kx, ky) => {
    const hs = k.h[0] + rng(x, y, 3) * (k.h[1] - k.h[0]);
    const ws = k.w[0] + rng(x, y, 4) * (k.w[1] - k.w[0]);
    const gy = k.onTerrain ? heightAt(map, x + 0.5, y + 0.5) : 0;
    e.set(0, k.rotZ ? 0 : rng(x, y, 1) * 6.28, k.rotZ ? Math.PI / 2 : 0);
    q.setFromEuler(e);
    v.set(x + 0.5 + (kx || 0), gy + k.y * hs, y + 0.5 + (ky || 0));
    sc.set(ws, hs, ws);
    m4.compose(v, q, sc);
    inst.setMatrixAt(i, m4);
  };
  const cellsOf = (ids) => {
    const out = [];
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (ids.includes(map.grid[y][x])) out.push([x, y]);
    return out;
  };
  for (const [id, k] of Object.entries(kinds)) {
    const cells = cellsOf([Number(id)]);
    if (!cells.length) continue;
    const inst = new THREE.InstancedMesh(k.geo, k.mat, cells.length);
    cells.forEach(([x, y], i) => place(inst, i, x, y, k));
    inst.castShadow = true; inst.receiveShadow = true;
    group.add(inst);
    disposables.push(k.geo, k.mat);
  }
  for (const [hid, look] of Object.entries(hiddenLook)) {
    const cells = cellsOf([Number(hid)]);
    if (!cells.length) continue;
    const k = kinds[look];
    const mat = k.mat.clone(); mat.transparent = true;
    const inst = new THREE.InstancedMesh(k.geo, mat, cells.length);
    cells.forEach(([x, y], i) => place(inst, i, x, y, k));
    inst.castShadow = true;
    group.add(inst);
    disposables.push(mat);
    (view.hidden ||= []).push({ mesh: inst, cells });
  }
  if (!field) return;
  // フィールドの飾り：岩場の岩・枯れ草の枯れ木・山のふもとの岩
  const deco = (ids, rate, geo, mat, yk, hRange, wRange, seed) => {
    const cells = cellsOf(ids).filter(([x, y]) => rng(x, y, seed) < rate);
    if (!cells.length) return;
    const inst = new THREE.InstancedMesh(geo, mat, cells.length);
    const k = { y: yk, h: hRange, w: wRange, onTerrain: true };
    cells.forEach(([x, y], i) => place(inst, i, x, y, k, (rng(x, y, seed + 1) - 0.5) * 0.5, (rng(x, y, seed + 2) - 0.5) * 0.5));
    inst.castShadow = true; inst.receiveShadow = true;
    group.add(inst);
    disposables.push(geo, mat);
  };
  deco([1], 0.16, new THREE.DodecahedronGeometry(0.32, 0), S(0x8a7c6a), 0.25, [0.6, 1.4], [0.7, 1.5], 31);
  deco([0], 0.025, new THREE.DodecahedronGeometry(0.25, 0), S(0xa08a6a), 0.18, [0.5, 1.2], [0.6, 1.4], 41);
  // 枯れ木（幹と枝）
  const trees = cellsOf([9]).filter(([x, y]) => rng(x, y, 51) < 0.09);
  if (trees.length) {
    const trunkG = new THREE.CylinderGeometry(0.05, 0.1, 1.2, 5), trunkM = S(0x5a4430);
    const branchG = new THREE.CylinderGeometry(0.03, 0.05, 0.6, 4);
    const trunk = new THREE.InstancedMesh(trunkG, trunkM, trees.length);
    const br = new THREE.InstancedMesh(branchG, trunkM, trees.length * 2);
    trees.forEach(([x, y], i) => {
      const gy = heightAt(map, x + 0.5, y + 0.5), hs = 0.8 + rng(x, y, 52) * 0.7;
      m4.compose(v.set(x + 0.5, gy + 0.6 * hs, y + 0.5), q.setFromEuler(e.set(0, 0, (rng(x, y, 53) - 0.5) * 0.3)), sc.set(1, hs, 1));
      trunk.setMatrixAt(i, m4);
      for (let b = 0; b < 2; b++) {
        const s2 = b ? 1 : -1;
        m4.compose(v.set(x + 0.5 + s2 * 0.18, gy + (0.75 + b * 0.25) * hs, y + 0.5), q.setFromEuler(e.set(0, rng(x, y, 54 + b) * 6, s2 * 0.9)), sc.set(1, 1, 1));
        br.setMatrixAt(i * 2 + b, m4);
      }
    });
    for (const im of [trunk, br]) { im.castShadow = true; group.add(im); }
    disposables.push(trunkG, branchG, trunkM);
  }
}
