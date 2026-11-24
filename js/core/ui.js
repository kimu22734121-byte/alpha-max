// ポップアップ式のUI（会話・コマンドメニュー・確認・お知らせ・HUD）
// どれも Promise を返すので await で順番に書ける
import { audio } from './audio.js';

const stack = [];
let root, fadeEl, toastBox;

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const GEAR = '<span class="gear-icon">⚙</span>';
export const fmt = (n) => Number(n).toLocaleString('ja-JP');

function pushModal(m) {
  stack.push(m);
  root.appendChild(m.el);
  ui.onChange?.();
}
function popModal(m) {
  const i = stack.indexOf(m);
  if (i >= 0) stack.splice(i, 1);
  m.el.remove();
  ui.onChange?.();
}

export const ui = {
  onChange: null,
  get busy() { return stack.length > 0; },
  // いちばん上に開いているメニュー（無ければ null）
  topMenu() { const t = stack[stack.length - 1]; return t?.isMenu ? t : null; },

  init(rootEl) {
    root = rootEl;
    fadeEl = el('div', 'fade'); document.body.appendChild(fadeEl);
    toastBox = el('div', 'toasts'); document.body.appendChild(toastBox);
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement && e.key !== 'Enter' && e.key !== 'Escape') return;
      const top = stack[stack.length - 1];
      if (top?.onKey) { top.onKey(e); e.stopImmediatePropagation(); }
    }, true);
  },

  // ---- 会話 ----
  say(lines, opt = {}) {
    if (!Array.isArray(lines)) lines = [lines];
    return new Promise((resolve) => {
      const wrap = el('div', 'modal modal-say');
      const box = el('div', 'say-box');
      const name = el('div', 'say-name');
      const text = el('div', 'say-text');
      const more = el('div', 'say-more', '▼');
      box.append(name, text, more);
      wrap.appendChild(box);
      let i = 0, typing = null, full = '';
      const show = () => {
        const line = lines[i];
        const who = typeof line === 'object' ? line.name : opt.name;
        full = typeof line === 'object' ? line.text : line;
        name.textContent = who || '';
        name.style.display = who ? '' : 'none';
        text.textContent = '';
        more.style.visibility = 'hidden';
        let n = 0;
        clearInterval(typing);
        typing = setInterval(() => {
          n += 2;
          text.textContent = full.slice(0, n);
          if (n % 6 === 0) audio.sfx('text');
          if (n >= full.length) { clearInterval(typing); typing = null; more.style.visibility = ''; }
        }, 28);
      };
      const next = () => {
        if (typing) { clearInterval(typing); typing = null; text.textContent = full; more.style.visibility = ''; return; }
        i++;
        if (i >= lines.length) { popModal(m); resolve(); return; }
        show();
      };
      const m = { el: wrap, onKey: (e) => { if (['Enter', ' ', 'z', 'Z', 'Escape', 'x', 'X'].includes(e.key)) { e.preventDefault(); next(); } } };
      wrap.addEventListener('pointerdown', (e) => { e.preventDefault(); next(); });
      pushModal(m);
      show();
    });
  },

  // ---- コマンドメニュー ----
  // items: [{ label, value, disabled, right, desc }]
  menu({ title, items, cancel = true, desc = false, className = '', onFocus, header, wide = false, pos, passThrough = false }) {
    return new Promise((resolve) => {
      const depth = stack.filter((s) => s.isMenu).length;
      const wrap = el('div', `modal modal-menu${passThrough ? ' pass-through' : ''}`);
      const panel = el('div', `menu-panel ${className} ${wide ? 'wide' : ''}`);
      if (pos === 'right') panel.classList.add('pos-right');
      if (pos === 'left') panel.classList.add('pos-left');
      panel.style.setProperty('--depth', depth);
      if (title) panel.appendChild(el('div', 'menu-title', title));
      if (header) panel.appendChild(el('div', 'menu-header', header));
      const list = el('div', 'menu-list');
      panel.appendChild(list);
      const descEl = desc ? el('div', 'menu-desc') : null;
      if (descEl) panel.appendChild(descEl);
      if (cancel) {
        const c = el('button', 'menu-close', '✕');
        c.addEventListener('click', (e) => { e.stopPropagation(); done(null); });
        panel.appendChild(c);
      }
      wrap.appendChild(panel);
      let idx = items.findIndex((it) => !it.disabled && !it.separator);
      if (idx < 0) idx = 0;
      const rows = items.map((it, i) => {
        if (it.separator) { const s = el('div', 'menu-sep', it.label || ''); list.appendChild(s); return s; }
        const r = el('button', `menu-item${it.disabled ? ' disabled' : ''}${it.className ? ' ' + it.className : ''}`);
        r.innerHTML = `<span class="mi-label">${it.label}</span>${it.right != null ? `<span class="mi-right">${it.right}</span>` : ''}`;
        r.addEventListener('pointerenter', () => setIdx(i, false));
        r.addEventListener('click', (e) => {
          e.stopPropagation();
          setIdx(i, false);
          choose();
        });
        list.appendChild(r);
        return r;
      });
      const setIdx = (i, scroll = true) => {
        if (items[i]?.separator) return;
        rows[idx]?.classList.remove('focus');
        idx = i;
        rows[idx]?.classList.add('focus');
        if (scroll) rows[idx]?.scrollIntoView({ block: 'nearest' });
        if (descEl) descEl.innerHTML = items[idx]?.desc || '';
        onFocus?.(items[idx], idx);
      };
      const choose = () => {
        const it = items[idx];
        if (!it || it.disabled) { audio.sfx('error'); return; }
        audio.sfx('ok');
        done(it.value !== undefined ? it.value : idx);
      };
      const done = (v) => {
        if (v === null) audio.sfx('cancel');
        popModal(m);
        resolve(v);
      };
      const move = (d) => {
        let j = idx;
        for (let k = 0; k < items.length; k++) {
          j = (j + d + items.length) % items.length;
          if (!items[j].separator) break;
        }
        audio.sfx('cursor');
        setIdx(j);
      };
      const findBy = (pred) => items.findIndex((it) => !it.disabled && !it.separator && pred(it.value, it));
      const m = {
        el: wrap,
        isMenu: true,
        // 画面のタップなどから、メニューの中の項目を選ぶ（戦闘で敵や味方を直接タップした時）
        pickBy: (pred) => { const i = findBy(pred); if (i < 0) return false; setIdx(i, false); choose(); return true; },
        focusBy: (pred) => { const i = findBy(pred); if (i < 0) return false; if (i !== idx) { audio.sfx('cursor'); setIdx(i); } return true; },
        focused: () => items[idx],
        onKey: (e) => {
          if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); move(1); }
          else if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); move(-1); }
          else if (['Enter', ' ', 'z', 'Z'].includes(e.key)) { e.preventDefault(); if (!e.repeat) choose(); }
          else if (['Escape', 'x', 'X'].includes(e.key) && cancel) { e.preventDefault(); done(null); }
        },
      };
      wrap.addEventListener('pointerdown', (e) => {
        if (e.target === wrap && cancel) { e.preventDefault(); done(null); }
      });
      pushModal(m);
      setIdx(idx, true);
    });
  },

  async confirm(text, yes = 'はい', no = 'いいえ') {
    const v = await this.menu({ title: text, items: [{ label: yes, value: true }, { label: no, value: false }], className: 'confirm' });
    return v === true;
  },

  // ---- 情報パネル（タップで閉じる） ----
  panel(html, { title, className = '', closeText = '閉じる' } = {}) {
    return new Promise((resolve) => {
      const wrap = el('div', 'modal modal-menu');
      const panel = el('div', `menu-panel info-panel ${className}`);
      if (title) panel.appendChild(el('div', 'menu-title', title));
      const body = el('div', 'panel-body', html);
      panel.appendChild(body);
      const btn = el('button', 'menu-item focus panel-ok', closeText);
      panel.appendChild(btn);
      wrap.appendChild(panel);
      const done = () => { popModal(m); resolve(); };
      btn.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('ok'); done(); });
      wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) { e.preventDefault(); done(); } });
      const m = { el: wrap, isMenu: true, onKey: (e) => { if (['Enter', ' ', 'Escape', 'z', 'x'].includes(e.key)) { e.preventDefault(); done(); } } };
      pushModal(m);
    });
  },

  // ---- 名前入力（ゲーム開始時） ----
  nameEntry(fields) {
    return new Promise((resolve) => {
      const wrap = el('div', 'modal modal-menu');
      const panel = el('div', 'menu-panel name-panel');
      panel.appendChild(el('div', 'menu-title', 'なまえを決めてください'));
      const inputs = fields.map((f) => {
        const row = el('label', 'name-row');
        row.appendChild(el('span', 'name-role', esc(f.role)));
        const inp = el('input', 'name-input');
        inp.value = f.value; inp.maxLength = 6; inp.placeholder = f.value;
        row.appendChild(inp);
        panel.appendChild(row);
        return inp;
      });
      panel.appendChild(el('div', 'name-note', '伝説の機体の名前は「アルファ」で固定です'));
      const ok = el('button', 'menu-item focus panel-ok', 'これで決定');
      panel.appendChild(ok);
      wrap.appendChild(panel);
      const done = () => {
        audio.sfx('ok');
        popModal(m);
        resolve(inputs.map((inp, i) => inp.value.trim() || fields[i].value));
      };
      ok.addEventListener('click', done);
      const m = { el: wrap, isMenu: true, onKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); done(); } } };
      pushModal(m);
    });
  },

  toast(text, dur = 2.2) {
    const t = el('div', 'toast', text);
    toastBox.appendChild(t);
    setTimeout(() => t.classList.add('out'), dur * 1000);
    setTimeout(() => t.remove(), dur * 1000 + 500);
  },

  banner(text, sub = '', dur = 2.4) {
    const b = el('div', 'banner', `<div class="banner-main">${text}</div>${sub ? `<div class="banner-sub">${sub}</div>` : ''}`);
    document.body.appendChild(b);
    requestAnimationFrame(() => b.classList.add('in'));
    setTimeout(() => b.classList.remove('in'), dur * 1000);
    setTimeout(() => b.remove(), dur * 1000 + 700);
  },

  fade(toBlack, dur = 0.4, color = '#000') {
    fadeEl.style.background = color;
    fadeEl.style.transitionDuration = `${dur}s`;
    fadeEl.style.opacity = toBlack ? '1' : '0';
    fadeEl.style.pointerEvents = toBlack ? 'auto' : 'none';
    return new Promise((r) => setTimeout(r, dur * 1000 + 30));
  },

  closeAll() {
    while (stack.length) popModal(stack[stack.length - 1]);
  },
};
