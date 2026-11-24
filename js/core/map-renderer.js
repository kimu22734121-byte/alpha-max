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
DRAW[23] = DRAW[1];
// 建物の中：木の床と壁
DRAW[28] = (g, px, py, x, y) => {
  g.fillStyle = '#8a6440'; g.fillRect(px, py, TS, TS);
  g.fillStyle = '#7a5636'; for (let i = 0; i < 4; i++) g.fillRect(px, py + i * 8 + 7, TS, 1);
  g.fillStyle = '#9a7450'; g.fillRect(px + ((x * 11 + y * 7) % 24), py + 2, 6, 3);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(px + (y % 2 ? 0 : 16), py, 1, TS);
};
DRAW[29] = (g, px, py) => {
  g.fillStyle = '#5a4a3e'; g.fillRect(px, py, TS, TS);
  g.fillStyle = '#6e5c4c'; g.fillRect(px + 1, py + 1, TS - 2, TS / 2 - 2);
  g.fillStyle = '#463a30'; g.fillRect(px, py + TS - 5, TS, 5);
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
  const cv = document.createElement('canvas');
  cv.width = map.width * TS; cv.height = map.height * TS;
  const g = cv.getContext('2d');
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const t = map.grid[y][x];
    (DRAW[t] || DRAW[0])(g, x * TS, y * TS, x, y);
  }
  for (const b of map.buildings || []) (map.buildings3d ? drawFoundation : drawBuilding)(g, b);
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
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

export function createMapView(map, mode = '2d', renderer) {
  const group = new THREE.Group();
  const cv = drawMapCanvas(map);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(map.width, map.height),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(map.width / 2, 0, map.height / 2);
  ground.receiveShadow = true;
  group.add(ground);
  // 周りの外側（マップの外が真っ黒にならないように）
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: map.ground || '#555', roughness: 1 }));
  outer.rotation.x = -Math.PI / 2;
  outer.position.set(map.width / 2, -0.02, map.height / 2);
  outer.receiveShadow = true;
  group.add(outer);

  const disposables = [tex, ground.geometry, ground.material, outer.geometry, outer.material];
  if (mode === '3d') add3D(map, group, disposables);
  return { group, dispose() { for (const d of disposables) d.dispose(); } };
}

// 試験版の3Dマップ：歩けないタイルを立体にする
function add3D(map, group, disposables) {
  const kinds = {
    3: { geo: new THREE.ConeGeometry(0.62, 1.3, 5), mat: new THREE.MeshStandardMaterial({ color: 0x7a5a3a, flatShading: true }), y: 0.65 },
    21: { geo: new THREE.ConeGeometry(0.6, 1.1, 5), mat: new THREE.MeshStandardMaterial({ color: 0x9a7a52, flatShading: true }), y: 0.55, walkThrough: true },
    4: { geo: new THREE.BoxGeometry(1, 1.4, 1), mat: new THREE.MeshStandardMaterial({ color: 0x3c4148 }), y: 0.7 },
    10: { geo: new THREE.BoxGeometry(1, 1.8, 1), mat: new THREE.MeshStandardMaterial({ color: 0x43566a }), y: 0.9 },
    24: { geo: new THREE.BoxGeometry(1, 1.5, 1), mat: new THREE.MeshStandardMaterial({ color: 0x3a3028, flatShading: true }), y: 0.75 },
    27: { geo: new THREE.BoxGeometry(1, 1.6, 1), mat: new THREE.MeshStandardMaterial({ color: 0x2a2e3c }), y: 0.8 },
    15: { geo: new THREE.BoxGeometry(0.9, 0.9, 0.9), mat: new THREE.MeshStandardMaterial({ color: 0x5a5f66, flatShading: true }), y: 0.45 },
    6: { geo: new THREE.BoxGeometry(1, 1.6, 1), mat: new THREE.MeshStandardMaterial({ color: 0x7a6f62 }), y: 0.8 },
  };
  for (const [id, k] of Object.entries(kinds)) {
    const cells = [];
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (map.grid[y][x] === Number(id)) cells.push([x, y]);
    if (!cells.length) continue;
    const inst = new THREE.InstancedMesh(k.geo, k.mat, cells.length);
    const m4 = new THREE.Matrix4();
    cells.forEach(([x, y], i) => {
      const s = 0.85 + rng(x, y) * 0.3;
      m4.compose(new THREE.Vector3(x + 0.5, k.y * s, y + 0.5), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rng(x, y, 1) * 6, 0)), new THREE.Vector3(1, s, 1));
      inst.setMatrixAt(i, m4);
    });
    inst.castShadow = true; inst.receiveShadow = true;
    group.add(inst);
    disposables.push(k.geo, k.mat);
  }
  void TILES;
}
