/* Nurish Reel frontend. No build step. */
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'nurish.v1';
const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DAY = 864e5;

/* ---------- state ---------- */
const now = Date.now();
const fresh = () => ({
  uploaded: [],
  cart: [{ id: 'katsudon', s: 2 }, { id: 'veggiesoup', s: 4 }],
  made: [
    { id: 'katsudon', s: 2, left: 1, at: now - DAY, rating: null },
    { id: 'meatballs', s: 4, left: 3, at: now - 2 * DAY, rating: 3 }
  ],
  checked: {}, liked: ['katsudon'], collections: SEED_COLLECTIONS.map(c => ({ ...c, ids: [...c.ids] })),
  comments: JSON.parse(JSON.stringify(SEED_COMMENTS)),
  goal: 2000, log: {}, history: {}, bio: '', following: 128, followers: 342, reposts: ['bulgogi']
});
let S = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) S = { ...fresh(), ...JSON.parse(raw) }; } catch (e) {}
if (!S.log[dayKey()]) {
  S.log[dayKey()] = { breakfast: [{ id: 'veggiesoup', s: 1 }], lunch: [{ id: 'katsudon', s: 1 }], dinner: [{ id: 'meatballs', s: 1 }], snacks: [] };
}
if (!Object.keys(S.history).length) {
  [1840, 2210, 1950, 1620, 2060, 1790].forEach((v, i) => { S.history[dayKey(new Date(now - (6 - i) * DAY))] = v; });
}
const save = () => {
  try {
    const copy = { ...S, uploaded: S.uploaded.map(r => ({ ...r, videoUrl: undefined })) };
    localStorage.setItem(KEY, JSON.stringify(copy));
  } catch (e) {}
};
const ui = { shopTab: 'shopping', shopDetail: null, nutTab: 'daily', profTab: 'posts', filter: '', chip: 'all', reelServ: {}, up: null };

const allRecipes = () => [...S.uploaded, ...SEED_RECIPES];
const byId = id => allRecipes().find(r => r.id === id);
const per = r => {
  const t = r.nutrition_total || {}; const n = r.servings || 1; const o = {};
  ['calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g', 'sugar_g', 'sodium_mg'].forEach(k => { o[k] = (t[k] || 0) / n; });
  return o;
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FR = [[0, ''], [.25, '¼'], [1 / 3, '⅓'], [.5, '½'], [2 / 3, '⅔'], [.75, '¾'], [1, '']];
function fmtQty(q) {
  if (q == null || q === '') return '';
  if (q >= 20) return String(Math.round(q / 5) * 5);
  const w = Math.floor(q), f = q - w;
  let best = FR[0], bd = 9;
  FR.forEach(x => { const d = Math.abs(x[0] - f); if (d < bd) { bd = d; best = x; } });
  let whole = w + (best[0] === 1 ? 1 : 0), frac = best[0] === 1 ? '' : best[1];
  if (!whole && !frac) return q.toFixed(1);
  return (whole ? whole : '') + frac;
}
const ingText = (i, f) => {
  const q = i.quantity != null ? fmtQty(i.quantity * f) : '';
  return { qty: [q, i.unit].filter(Boolean).join(' '), name: i.name + (i.note ? ', ' + i.note : '') };
};
const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const rng = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

/* ---------- posters (generated dish art, replaced by real video when present) ---------- */
let pid = 0;
function poster(r, crop) {
  const p = r.palette || ['#8DB580', '#3F7A5B', '#E8A33D', '#7CC06A', '#F3EEE4'];
  const g = 'g' + (pid++), rand = rng(hash(r.id));
  let dots = '';
  for (let i = 0; i < 22; i++) {
    const a = rand() * 6.283, d = Math.sqrt(rand());
    dots += `<circle cx="${(200 + Math.cos(a) * 100 * d).toFixed(1)}" cy="${(336 + Math.sin(a) * 26 * d).toFixed(1)}" r="${(7 + rand() * 9).toFixed(1)}" fill="${i % 2 ? p[2] : p[3]}" stroke="#0002" stroke-width="1.5"/>`;
  }
  const vb = crop ? '40 230 320 320' : '0 0 400 700';
  return `<svg class="poster" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs>
  <rect width="400" height="700" fill="url(#${g})"/>
  <circle cx="330" cy="120" r="110" fill="#fff" opacity=".1"/><circle cx="40" cy="560" r="150" fill="#000" opacity=".08"/>
  <ellipse cx="200" cy="500" rx="150" ry="22" fill="#000" opacity=".18"/>
  <path d="M68 340 Q70 475 200 488 Q330 475 332 340Z" fill="${p[4]}"/>
  <path d="M68 340 Q70 475 200 488 Q330 475 332 340 Q300 420 200 428 Q100 420 68 340Z" fill="#000" opacity=".12"/>
  <ellipse cx="200" cy="340" rx="132" ry="40" fill="${p[4]}"/>
  <ellipse cx="200" cy="338" rx="116" ry="31" fill="${p[2]}"/>${dots}
  ${crop ? '' : '<g class="steam"><path d="M165 280 q-14-26 0-52"/><path d="M200 272 q-14-26 0-52"/><path d="M235 280 q-14-26 0-52"/></g>'}
  </svg>`;
}

/* ---------- small helpers ---------- */
const I = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.200-8-11.200A4.600 4.600 0 0 1 12 7a4.600 4.600 0 0 1 8 2.800C20 15.800 12 21 12 21z"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  mark: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.500L6 21z"/></svg>',
  cart: '<svg viewBox="0 0 24 24"><path d="M3 4h3l2.500 11h10l2-8H7"/><circle cx="10" cy="19.500" r="1.200"/><circle cx="17" cy="19.500" r="1.200"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.500"/><path d="M16 16l5 5"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1.500"/><rect x="14" y="4" width="6" height="6" rx="1.500"/><rect x="4" y="14" width="6" height="6" rx="1.500"/><rect x="14" y="14" width="6" height="6" rx="1.500"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 4v16M4 12h16"/></svg>',
  repost: '<svg viewBox="0 0 24 24"><path d="M4 11V9a3 3 0 0 1 3-3h11l-3-3M20 13v2a3 3 0 0 1-3 3H6l3 3"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/></svg>',
  sad: '<svg viewBox="0 0 48 48"><path d="M15 18v2M33 18v2M16 34c3-5 13-5 16 0"/></svg>',
  meh: '<svg viewBox="0 0 48 48"><path d="M15 18v2M33 18v2M16 32h16"/></svg>',
  happy: '<svg viewBox="0 0 48 48"><path d="M15 18v2M33 18v2M15 29c4 7 14 7 18 0"/></svg>'
};
const stepper = (ctx, id, val) => `<div class="stepper" role="group" aria-label="Servings"><button data-a="step" data-ctx="${ctx}" data-id="${id}" data-d="-1" aria-label="Fewer">&minus;</button><span>${val}</span><button data-a="step" data-ctx="${ctx}" data-id="${id}" data-d="1" aria-label="More">+</button></div>`;
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2000); }
function openSheet(html, mount) { $('#sheet-body').innerHTML = html; $('#sheet').hidden = false; mount && mount($('#sheet-body')); }
function closeSheet() { $('#sheet').hidden = true; }
const guessMeal = () => { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snacks'; };
const kcalOf = e => { const r = byId(e.id); return r ? per(r).calories * e.s : 0; };
const todayLog = () => S.log[dayKey()] || (S.log[dayKey()] = { breakfast: [], lunch: [], dinner: [], snacks: [] });
const consumed = () => MEALS.reduce((a, m) => a + (todayLog()[m] || []).reduce((b, e) => b + kcalOf(e), 0), 0);
function addToLog(id, meal, s = 1) {
  const l = todayLog()[meal]; const ex = l.find(e => e.id === id);
  if (ex) ex.s += s; else l.push({ id, s });
  save();
}
function addToCart(id) {
  const r = byId(id);
  if (S.cart.find(c => c.id === id)) { toast('Already on your shopping list'); return; }
  S.cart.push({ id, s: r.servings || 2 }); save(); toast('Added to Shopping');
}

/* ---------- swipe cards ---------- */
const ACT = 156; let moved = false;
function bindSwipe(root) {
  $$('.swipe', root).forEach(w => {
    const c = $('.swipe-card', w); let sx = 0, x0 = 0, x = 0, drag = false;
    c.addEventListener('pointerdown', e => { sx = e.clientX; x0 = w.classList.contains('open') ? -ACT : 0; x = x0; drag = true; moved = false; c.style.transition = 'none'; });
    c.addEventListener('pointermove', e => {
      if (!drag) return; const dx = e.clientX - sx;
      if (Math.abs(dx) > 6 && !moved) { moved = true; try { c.setPointerCapture(e.pointerId); } catch (_) {} }
      if (moved) { x = Math.max(-ACT - 16, Math.min(0, x0 + dx)); c.style.transform = `translateX(${x}px)`; }
    });
    const end = () => {
      if (!drag) return; drag = false; c.style.transition = '';
      const open = moved ? x < -ACT / 2 : w.classList.contains('open');
      $$('.swipe.open', root).forEach(o => { if (o !== w) { o.classList.remove('open'); $('.swipe-card', o).style.transform = ''; } });
      w.classList.toggle('open', open); c.style.transform = open ? `translateX(${-ACT}px)` : '';
      setTimeout(() => { moved = false; }, 50);
    };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  });
}

/* ---------- shopping tab ---------- */
function renderShop() {
  const el = $('#screen-shop');
  if (ui.shopDetail) return renderShopDetail(el);
  const isShop = ui.shopTab === 'shopping';
  const tabs = `<header class="titlebar"><h1 class="h-tabs" role="tablist">
    <button role="tab" aria-selected="${isShop}" data-a="shopTab" data-v="shopping">Shopping</button>
    <button role="tab" aria-selected="${!isShop}" data-a="shopTab" data-v="made">Made</button></h1></header>`;
  let body = '';
  if (isShop) {
    body = S.cart.map(c => {
      const r = byId(c.id); if (!r) return '';
      const total = r.ingredients.length, done = Object.values(S.checked[c.id] || {}).filter(Boolean).length;
      return `<div class="swipe"><div class="swipe-actions"><button class="go" data-a="markMade" data-id="${c.id}">Made it</button><button class="del" data-a="rmCart" data-id="${c.id}">Remove</button></div>
      <div class="swipe-card" data-a="openCart" data-id="${c.id}" tabindex="0"><div class="thumb">${poster(r, true)}</div>
      <div class="card-main"><div><div class="card-title">${esc(r.title)}</div><div class="card-meta">${done} of ${total} picked up</div></div>
      <div class="card-foot"><span class="chip">${r.ingredients.length} items</span>${stepper('cart', c.id, c.s)}</div></div></div></div>`;
    }).join('') || `<div class="empty"><b>Nothing to buy</b>Tap the basket on any reel to add its ingredients here.</div>`;
  } else {
    body = S.made.map(m => {
      const r = byId(m.id); if (!r) return '';
      const left = shelfLeft(m, r);
      return `<div class="swipe"><div class="swipe-actions"><button class="go" data-a="shopAgain" data-id="${m.id}">Shop again</button><button class="del" data-a="rmMade" data-id="${m.id}">Remove</button></div>
      <div class="swipe-card" data-a="openMade" data-id="${m.id}" tabindex="0"><div class="thumb">${poster(r, true)}</div>
      <div class="card-main"><div><div class="card-title">${esc(r.title)}</div><div class="card-meta">${m.left} of ${m.s} servings left</div></div>
      <div class="card-foot"><span class="chip ${left <= 1 ? 'warn' : ''}">${left <= 0 ? 'Past shelf life' : left + (left === 1 ? ' day' : ' days') + ' left'}</span>
      ${m.rating ? `<span aria-label="Rated ${m.rating} of 3">${['', '\u2639', '\u{1F610}', '\u263A'][m.rating]}</span>` : ''}</div></div></div></div>`;
    }).join('') || `<div class="empty"><b>Nothing cooked yet</b>Swipe a shopping card left and tap Made it.</div>`;
  }
  el.innerHTML = tabs + `<div class="list">${body}</div>`;
  bindSwipe(el);
}
const shelfLeft = (m, r) => Math.ceil((r.shelfDays || 3) - (Date.now() - m.at) / DAY);
function renderShopDetail(el) {
  const { kind, id } = ui.shopDetail, r = byId(id);
  if (kind === 'cart') {
    const c = S.cart.find(x => x.id === id); if (!c) { ui.shopDetail = null; return renderShop(); }
    const f = c.s / (r.servings || 1), chk = S.checked[id] || {}, n = r.ingredients.length, d = Object.values(chk).filter(Boolean).length;
    el.innerHTML = `<div class="detail-head"><button class="icon-btn" data-a="closeDetail" aria-label="Back">${I.back}</button><h2>${esc(r.title)}</h2>${stepper('cart', id, c.s)}</div><hr class="rule">
    <ul class="checklist">${r.ingredients.map((i, k) => { const t = ingText(i, f); return `<li><label><input type="checkbox" data-a="check" data-id="${id}" data-k="${k}" ${chk[k] ? 'checked' : ''}><span><span class="qty">${esc(t.qty)}</span>${esc(t.name)}</span></label></li>`; }).join('')}</ul>
    <div class="progress"><i style="width:${n ? d / n * 100 : 0}%"></i></div><p class="progress-note">${d} of ${n} in the basket</p>
    <button class="big-btn alt" data-a="markMade" data-id="${id}">I made it</button>`;
  } else {
    const m = S.made.find(x => x.id === id); if (!m) { ui.shopDetail = null; return renderShop(); }
    const left = shelfLeft(m, r), total = r.shelfDays || 3, pct = Math.max(0, Math.min(1, left / total)) * 100;
    el.innerHTML = `<div class="detail-head"><button class="icon-btn" data-a="closeDetail" aria-label="Back">${I.back}</button><h2>${esc(r.title)}</h2>${stepper('made', id, m.s)}</div><hr class="rule">
    <div class="meter"><div class="meter-top"><b>${left <= 0 ? 'Expired' : left + (left === 1 ? ' day' : ' days')}</b><small>shelf life</small></div>
    <div class="bar ${left <= 1 ? 'urgent' : left <= 2 ? 'soon' : ''}" role="img" aria-label="${left} days of shelf life left"><i style="width:${pct}%"></i></div></div>
    <div class="meter"><div class="meter-top"><b id="left-n">${m.left}/${m.s}</b><small>servings left</small></div>
    <input class="range" type="range" min="0" max="${m.s}" step="1" value="${m.left}" data-a="leftSlider" data-id="${id}" aria-label="Servings left"
      style="background:linear-gradient(90deg,var(--nori) ${m.s ? m.left / m.s * 100 : 0}%,#DDE3DB 0)"></div>
    <button class="big-btn" data-a="eatOne" data-id="${id}" ${m.left < 1 ? 'disabled style="opacity:.4"' : ''}>Log a serving to Nutrition</button>
    <div class="rate"><h3>Rate it</h3><div class="faces">${[1, 2, 3].map(n => `<button class="face" data-a="rate" data-id="${id}" data-v="${n}" aria-pressed="${m.rating === n}" aria-label="${['Not great', 'Okay', 'Loved it'][n - 1]}">${[I.sad, I.meh, I.happy][n - 1]}</button>`).join('')}</div></div>`;
  }
}

/* ---------- nutrition tab ---------- */
function ring(size, stroke, ratio, color, big, small) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, ratio)));
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/><circle class="val" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>
  <div class="txt"><b style="font-size:${size / 5.200}px">${big}</b><small style="font-size:${Math.max(12, size / 11)}px">${small}</small></div></div>`;
}
function renderNutrition() {
  const el = $('#screen-nutrition'), daily = ui.nutTab === 'daily';
  let h = `<header class="titlebar"><h1 class="h-tabs" role="tablist"><button role="tab" aria-selected="${daily}" data-a="nutTab" data-v="daily">Daily</button><button role="tab" aria-selected="${!daily}" data-a="nutTab" data-v="weekly">Weekly</button></h1></header>`;
  if (daily) {
    const c = Math.round(consumed()), rem = Math.max(0, S.goal - c);
    const mac = { p: 0, c: 0, f: 0 };
    MEALS.forEach(m => todayLog()[m].forEach(e => { const r = byId(e.id); if (!r) return; const p = per(r); mac.p += p.protein_g * e.s; mac.c += p.carbs_g * e.s; mac.f += p.fat_g * e.s; }));
    h += `<div class="rings"><button data-a="goal" aria-label="Edit daily goal">${ring(184, 16, c / S.goal, '#16342A', S.goal.toLocaleString(), 'cal goal')}</button>
    <div class="ring-row"><div>${ring(120, 12, c / S.goal, '#F2C230', c.toLocaleString(), 'cal')}<div class="ring-cap">Consumed</div></div>
    <div>${ring(120, 12, rem / S.goal, '#7FA66F', rem.toLocaleString(), 'cal')}<div class="ring-cap">Remaining</div></div></div></div>
    <div class="macro-line"><span>Protein <b>${Math.round(mac.p)}g</b></span><span>Carbs <b>${Math.round(mac.c)}g</b></span><span>Fat <b>${Math.round(mac.f)}g</b></span></div>`;
    MEALS.forEach(m => {
      const l = todayLog()[m], k = Math.round(l.reduce((a, e) => a + kcalOf(e), 0));
      h += `<section class="meal"><div class="meal-head"><h3>${m[0].toUpperCase() + m.slice(1)}${k ? `<small>${k} cal</small>` : ''}</h3><button class="add-btn" data-a="pickLog" data-meal="${m}" aria-label="Add to ${m}">+</button></div>
      ${l.map((e, i) => { const r = byId(e.id); if (!r) return ''; return `<div class="entry"><div class="thumb">${poster(r, true)}</div><div class="e-t">${esc(r.title)}<small>${e.s} ${e.s === 1 ? 'serving' : 'servings'}, ${Math.round(kcalOf(e))} cal</small></div><button class="x-btn" data-a="rmLog" data-meal="${m}" data-i="${i}" aria-label="Remove">&times;</button></div>`; }).join('')}</section>`;
    });
  } else {
    const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(Date.now() - i * DAY), k = dayKey(d); days.push({ l: d.toLocaleDateString('en', { weekday: 'narrow' }), v: i === 0 ? Math.round(consumed()) : (S.history[k] || 0), today: i === 0 }); }
    const max = Math.max(S.goal * 1.2, ...days.map(d => d.v)), W = 340, H = 190, bw = 28, gap = (W - bw * 7) / 6;
    const gy = H - 26 - (S.goal / max) * (H - 40);
    const avg = Math.round(days.reduce((a, d) => a + d.v, 0) / 7), under = days.filter(d => d.v && d.v <= S.goal).length;
    h += `<div class="week"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Calories for the last seven days">
      ${days.map((d, i) => { const bh = (d.v / max) * (H - 40), x = i * (bw + gap); return `<rect x="${x}" y="${H - 26 - bh}" width="${bw}" height="${bh}" rx="8" fill="${d.today ? '#F2C230' : '#16342A'}"/><text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="13" fill="#66736C" font-family="Figtree">${d.l}</text>`; }).join('')}
      <line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="#D9452F" stroke-width="2" stroke-dasharray="5 5"/><text x="${W}" y="${gy - 6}" text-anchor="end" font-size="12" fill="#D9452F" font-family="Figtree" font-weight="600">goal ${S.goal}</text></svg></div>
    <div class="week-stats"><div><b>${avg.toLocaleString()}</b><span>average cal per day</span></div><div><b>${under}/7</b><span>days at or under goal</span></div></div>`;
  }
  el.innerHTML = h;
}

/* ---------- reels ---------- */
const MACROS = [['Protein', 'protein_g', '#F2C230'], ['Fiber', 'fiber_g', '#8CC27B'], ['Carbs', 'carbs_g', '#7FB2D9'], ['Fat', 'fat_g', '#E2674D']];
function pie(r) {
  const p = per(r), v = { protein_g: p.protein_g, fiber_g: p.fiber_g, carbs_g: Math.max(0, p.carbs_g - p.fiber_g), fat_g: p.fat_g };
  const tot = Object.values(v).reduce((a, b) => a + b, 0) || 1; let a0 = -Math.PI / 2, s = '';
  MACROS.forEach(([, k, col]) => {
    const a1 = a0 + (v[k] / tot) * 2 * Math.PI, big = a1 - a0 > Math.PI ? 1 : 0, R = 100, cx = 110, cy = 110;
    if (v[k] / tot > .999) s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${col}"/>`;
    else if (v[k] > 0) s += `<path d="M${cx} ${cy}L${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)}A${R} ${R} 0 ${big} 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)}Z" fill="${col}" stroke="#0E1612" stroke-width="3"/>`;
    a0 = a1;
  });
  return `<svg width="220" height="220" viewBox="0 0 220 220" role="img" aria-label="Macro split">${s}<circle cx="110" cy="110" r="46" fill="#0E1612"/><text x="110" y="108" text-anchor="middle" fill="#fff" font-family="Bricolage Grotesque" font-weight="800" font-size="28">${Math.round(p.calories)}</text><text x="110" y="128" text-anchor="middle" fill="#9FB0A6" font-size="13" font-family="Figtree">cal</text></svg>`;
}
function recipePane(r, s) {
  const f = s / (r.servings || 1);
  return `<h2>${esc(r.title)}</h2><div class="head-row"><span class="sub">Serves</span>${stepper('reel', r.id, s)}</div>
  <h3>Ingredients</h3><ul class="ing">${r.ingredients.map(i => { const t = ingText(i, f); return `<li><span class="qty">${esc(t.qty) || '&nbsp;'}</span><span>${esc(t.name)}</span></li>`; }).join('')}</ul>
  <h3>Directions</h3><ol class="steps">${r.steps.map(x => `<li>${esc(x.instruction)}</li>`).join('')}</ol>
  <button class="big-btn alt" data-a="cart" data-id="${r.id}">Add ingredients to Shopping</button>`;
}
function reelHTML(r) {
  const liked = S.liked.includes(r.id), saved = S.collections.some(c => c.ids.includes(r.id)), s = ui.reelServ[r.id] || r.servings || 2, p = per(r);
  const cmts = (S.comments[r.id] || []).length;
  return `<article class="reel" data-id="${r.id}"><div class="pager" tabindex="-1">
  <div class="pane info" aria-label="Nutrition"><h2>${esc(r.title)}</h2><p class="sub">Nutrition per serving</p><div class="pie-wrap">${pie(r)}</div>
    <ul class="legend">${MACROS.map(([n, k, c]) => `<li><i style="background:${c}"></i><div><b>${Math.round(p[k])} g</b><span>${n}</span></div></li>`).join('')}</ul>
    <p class="sub" style="margin-top:16px">Sodium ${Math.round(p.sodium_mg)} mg, sugar ${Math.round(p.sugar_g)} g</p>
    <button class="big-btn" data-a="logFromReel" data-id="${r.id}">Log a serving</button><button class="edge r" data-a="pane" data-p="1">Video</button></div>
  <div class="pane video">${r.videoUrl ? `<video src="${r.videoUrl}" loop muted playsinline data-a="vid"></video>` : poster(r)}<div class="shade"></div>
    <button class="edge l" data-a="pane" data-p="0">Nutrition</button><button class="edge r" data-a="pane" data-p="2">Recipe</button>
    <div class="caption"><div class="who">@${esc(r.creator || 'you')}</div><p>${esc(r.caption || r.summary || '')}</p></div>
    <div class="rail">
      <button data-a="like" data-id="${r.id}" aria-pressed="${liked}" aria-label="Like"><span class="ic">${I.heart}</span><span class="n">${(r.likes || 0) + (liked ? 1 : 0)}</span></button>
      <button data-a="comments" data-id="${r.id}" aria-label="Comments"><span class="ic">${I.chat}</span><span class="cn">${cmts}</span></button>
      <button class="save" data-a="saveSheet" data-id="${r.id}" aria-pressed="${saved}" aria-label="Save to collection"><span class="ic">${I.mark}</span>Save</button>
      <button class="cart" data-a="cart" data-id="${r.id}" aria-label="Add to shopping list"><span class="ic">${I.cart}</span>Cart</button></div></div>
  <div class="pane info" aria-label="Recipe" data-recipe="${r.id}">${recipePane(r, s)}<button class="edge l" data-a="pane" data-p="1">Video</button></div>
  </div></article>`;
}
const dotsHTML = '<div class="dots"><i></i><i class="on"></i><i></i></div>';
function feedHTML(list) { return `<div class="feed">${list.map(reelHTML).join('')}</div>${dotsHTML}`; }
function mountFeed(root) {
  const pagers = $$('.pager', root);
  pagers.forEach(p => { p.scrollLeft = p.clientWidth; p.addEventListener('scroll', () => {
    const i = Math.round(p.scrollLeft / p.clientWidth); $$('.dots i', root).forEach((d, k) => d.classList.toggle('on', k === i));
  }, { passive: true }); });
  const feed = $('.feed', root);
  if (feed) {
    feed.addEventListener('scroll', () => { $$('.dots i', root).forEach((d, k) => d.classList.toggle('on', k === 1)); }, { passive: true });
    const io = new IntersectionObserver(es => es.forEach(e => { const v = $('video', e.target); if (!v) return; if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { root: feed, threshold: .6 });
    $$('.reel', root).forEach(r => io.observe(r));
  }
}
function filtered() {
  const q = ui.filter.trim().toLowerCase(), chip = ui.chip;
  return allRecipes().filter(r => {
    const hay = [r.title, ...(r.tags || []), ...r.ingredients.map(i => i.name)].join(' ').toLowerCase();
    return (chip === 'all' || hay.includes(chip)) && (!q || hay.includes(q));
  });
}
let reelsBuilt = false;
function renderReels(force) {
  const el = $('#screen-reels');
  if (!reelsBuilt) {
    el.innerHTML = `<div class="reels-top"><label class="search">${I.search}<input type="search" id="q" placeholder="Search recipes" aria-label="Search recipes" autocomplete="off"></label>
    <div class="chips" id="chips">${['all', 'chicken', 'veggie', 'beef', 'pork', 'soup'].map(c => `<button data-a="chip" data-v="${c}" aria-pressed="${c === 'all'}">${c[0].toUpperCase() + c.slice(1)}</button>`).join('')}</div></div><div id="feedhost"></div>`;
    $('#q').addEventListener('input', e => { ui.filter = e.target.value; renderFeed(); });
    reelsBuilt = true; force = true;
  }
  if (force) renderFeed();
}
function renderFeed() {
  const host = $('#feedhost'), list = filtered();
  host.style.height = '100%';
  host.innerHTML = list.length ? feedHTML(list) : `<div class="empty" style="color:#9FB0A6;padding-top:220px"><b style="color:#fff">No matches</b>Try another word or clear the filter.</div>`;
  if (list.length) mountFeed(host);
}

/* ---------- saved ---------- */
function renderSaved() {
  const el = $('#screen-saved');
  el.innerHTML = `<header class="titlebar"><h1 class="h-plain">Saved recipes</h1><button class="icon-btn" data-a="newColl" aria-label="New collection">${I.plus}</button></header>
  <div class="grid2">${S.collections.map(c => { const r = byId(c.ids[0]); return `<button class="tile ${r ? '' : 'empty-t'}" data-a="openColl" data-id="${c.id}">${r ? poster(r, true) : ''}<span>${esc(c.name)}</span><small>${c.ids.length} ${c.ids.length === 1 ? 'recipe' : 'recipes'}</small></button>`; }).join('')}</div>`;
}
function openViewer(title, ids, startId) {
  const list = ids.map(byId).filter(Boolean), v = $('#viewer');
  v.hidden = false;
  v.innerHTML = list.length ? `<button class="back-fab" data-a="closeViewer" aria-label="Back">${I.back}</button><div class="viewer-title">${esc(title)}</div>${feedHTML(list)}`
    : `<button class="back-fab" data-a="closeViewer" aria-label="Back">${I.back}</button><div class="viewer-title">${esc(title)}</div><div class="empty" style="color:#9FB0A6;padding-top:240px"><b style="color:#fff">Empty for now</b>Save recipes from the reels and they land here.</div>`;
  if (list.length) { mountFeed(v); if (startId) { const t = $(`.reel[data-id="${startId}"]`, v); t && t.scrollIntoView(); } }
}

/* ---------- profile ---------- */
function renderProfile() {
  const el = $('#screen-profile'), t = ui.profTab, mine = S.uploaded;
  const tabs = [['posts', I.grid], ['upload', I.plus], ['reposts', I.repost], ['notes', I.note]];
  let body = '';
  if (t === 'posts') body = mine.length ? `<div class="grid3">${mine.map(r => `<button data-a="openPost" data-id="${r.id}">${poster(r, true)}<small>${esc(r.title)}</small></button>`).join('')}</div>` : `<div class="empty"><b>No posts yet</b>Upload a cooking video with the plus tab and it becomes a recipe.</div>`;
  if (t === 'reposts') { const ids = [...new Set([...S.liked, ...S.reposts])]; body = `<div class="grid3">${ids.map(byId).filter(Boolean).map(r => `<button data-a="openPost" data-id="${r.id}" data-from="liked">${poster(r, true)}<small>${esc(r.title)}</small></button>`).join('')}</div>`; }
  if (t === 'notes') body = S.made.length ? S.made.map(m => { const r = byId(m.id); return `<div class="note-row"><div class="thumb">${poster(r, true)}</div><div><b>${esc(r.title)}</b><small>Cooked ${new Date(m.at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</small></div>${m.rating ? [I.sad, I.meh, I.happy][m.rating - 1].replace('<svg', '<svg class="f" width="34" height="34"') : '<small style="margin-left:auto;color:var(--mute)">Not rated</small>'}</div>`; }).join('') : `<div class="empty"><b>No notes</b>Cook something and rate it.</div>`;
  if (t === 'upload') body = uploadHTML();
  el.innerHTML = `<div class="p-head"><div class="p-top"><div class="avatar">Y</div><div><div class="p-name">Profile</div><div style="color:var(--mute)">@you</div></div></div>
  <div class="p-stats"><div><b>${mine.length}</b><span>Posts</span></div><div><b>${S.following}</b><span>Following</span></div><div><b>${S.followers}</b><span>Followers</span></div></div>
  ${S.bio ? `<p class="bio">${esc(S.bio)}</p>` : ''}<button class="bio-btn" data-a="bio">${S.bio ? 'Edit bio' : '+ bio'}</button></div>
  <div class="ptabs" role="tablist">${tabs.map(([k, ic]) => `<button role="tab" aria-selected="${t === k}" data-a="profTab" data-v="${k}" aria-label="${k}">${ic}</button>`).join('')}</div>${body}`;
  if (t === 'upload') bindUpload(el);
}
const STAGES = [['media_extraction', 'Extracting audio and frames'], ['transcription', 'Transcribing speech'], ['ocr', 'Reading on-screen text'], ['captions', 'Parsing captions'], ['structuring', 'Structuring the recipe'], ['nutrition', 'Looking up nutrition'], ['shopping_list', 'Building the shopping list']];
function uploadHTML() {
  const u = ui.up || {}, running = u.state === 'running';
  const idx = STAGES.findIndex(s => s[0] === u.stage);
  return `<div class="up"><label class="drop" id="drop"><b>Drop a cooking video</b><span>${u.video ? esc(u.video.name) : 'or tap to choose a file'}</span><input type="file" id="vid" accept="video/*"></label>
  <div class="file-line"><span>Captions (optional): <b>${u.captions ? esc(u.captions.name) : 'none'}</b></span><label class="small-link" style="cursor:pointer">Add .srt or .vtt<input type="file" id="cap" accept=".srt,.vtt" hidden></label></div>
  <button class="big-btn alt" data-a="process" ${u.video && !running ? '' : 'disabled style="opacity:.4"'}>${running ? 'Working' : 'Turn it into a recipe'}</button>
  ${u.state ? `<ul class="stages">${STAGES.map(([k, l], i) => `<li class="${u.state === 'done' || i < idx ? 'done' : i === idx ? 'run' : ''}"><i></i>${l}</li>`).join('')}</ul>` : ''}
  ${u.error ? `<div class="note err">${esc(u.error)}</div>` : ''}${u.demo ? `<div class="note">Backend not reachable at ${esc(Api.base())}, so this ran in demo mode with a sample recipe. Start the API with uvicorn, or <a class="small-link" href="#" data-a="apiUrl">change the URL</a>.</div>` : ''}
  ${u.result ? resultHTML(u.result) : ''}</div>`;
}
function resultHTML(r) {
  const p = per(r);
  return `<div class="result"><h3>${esc(r.title)}</h3><p>${r.ingredients.length} ingredients, ${r.steps.length} steps, serves ${r.servings}. About ${Math.round(p.calories)} cal per serving.</p>
  <div class="row"><button class="big-btn" data-a="postIt">Post to my reels</button><button class="big-btn alt" data-a="cartResult">Shop it</button></div></div>`;
}
function bindUpload(el) {
  const v = $('#vid', el), c = $('#cap', el), d = $('#drop', el);
  v && v.addEventListener('change', () => { ui.up = { video: v.files[0], captions: (ui.up || {}).captions }; renderProfile(); });
  c && c.addEventListener('change', () => { ui.up = { ...(ui.up || {}), captions: c.files[0] }; renderProfile(); });
  if (d) { ['dragover', 'dragenter'].forEach(e => d.addEventListener(e, ev => { ev.preventDefault(); d.classList.add('over'); })); ['dragleave', 'drop'].forEach(e => d.addEventListener(e, () => d.classList.remove('over')));
    d.addEventListener('drop', ev => { ev.preventDefault(); const f = ev.dataTransfer.files[0]; if (f) { ui.up = { video: f, captions: (ui.up || {}).captions }; renderProfile(); } }); }
}
function toRecipe(res, file) {
  const r = res.recipe, id = 'up-' + Date.now().toString(36), pals = SEED_RECIPES.map(x => x.palette);
  return {
    id, title: r.title, creator: 'you', summary: r.summary, caption: r.summary || '', servings: r.servings || 2, shelfDays: 3, likes: 0,
    tags: r.tags || [], palette: pals[hash(id) % pals.length], videoUrl: file ? URL.createObjectURL(file) : undefined,
    ingredients: (r.ingredients || []).map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit || '', note: i.note })),
    steps: r.steps || [], nutrition_total: r.nutrition_total || { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 }
  };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function process() {
  const u = ui.up; u.state = 'running'; u.stage = STAGES[0][0]; u.error = null; u.demo = false; u.result = null; renderProfile();
  try {
    const { job_id } = await Api.upload(u.video, u.captions);
    for (;;) {
      await wait(1000); const s = await Api.status(job_id);
      if (s.current_stage) u.stage = s.current_stage;
      if (s.status === 'failed') throw Object.assign(new Error(s.error || 'Processing failed'), { server: true });
      if (s.status === 'completed') break;
      renderProfile();
    }
    u.result = toRecipe(await Api.result(job_id), u.video); u.state = 'done';
  } catch (e) {
    if (e.server) { u.state = null; u.error = e.message; }
    else {
      u.demo = true;
      for (const [k] of STAGES) { u.stage = k; renderProfile(); await wait(550); }
      const name = u.video.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      u.result = toRecipe({ recipe: { title: name ? name[0].toUpperCase() + name.slice(1) : 'Untitled recipe', summary: 'Processed from your upload.', servings: 2, tags: ['new'],
        ingredients: [{ name: 'olive oil', quantity: 2, unit: 'tbsp' }, { name: 'garlic cloves', quantity: 3, unit: '' }, { name: 'tomatoes', quantity: 4, unit: '' }, { name: 'pasta', quantity: 200, unit: 'g' }],
        steps: [{ number: 1, instruction: 'Sample step from the stub pipeline.' }, { number: 2, instruction: 'Serve warm.' }],
        nutrition_total: { calories: 820, protein_g: 24, fat_g: 28, carbs_g: 110, fiber_g: 8, sugar_g: 12, sodium_mg: 900 } } }, u.video);
      u.state = 'done';
    }
  }
  renderProfile();
}

/* ---------- actions ---------- */
const A = {
  tab: el => showTab(el.dataset.v),
  shopTab: el => { ui.shopTab = el.dataset.v; renderShop(); },
  openCart: el => { if (moved) return; if (el.closest('.swipe.open')) { el.closest('.swipe').classList.remove('open'); el.style.transform = ''; return; } ui.shopDetail = { kind: 'cart', id: el.dataset.id }; renderShop(); },
  openMade: el => { if (moved) return; if (el.closest('.swipe.open')) { el.closest('.swipe').classList.remove('open'); el.style.transform = ''; return; } ui.shopDetail = { kind: 'made', id: el.dataset.id }; renderShop(); },
  closeDetail: () => { ui.shopDetail = null; renderShop(); },
  check: el => { const c = S.checked[el.dataset.id] || (S.checked[el.dataset.id] = {}); c[el.dataset.k] = el.checked; save(); renderShop(); },
  step(el) {
    const { ctx, id } = el.dataset, d = +el.dataset.d;
    if (ctx === 'cart') { const c = S.cart.find(x => x.id === id); c.s = Math.max(1, Math.min(24, c.s + d)); save(); renderShop(); }
    else if (ctx === 'made') { const m = S.made.find(x => x.id === id); const n = Math.max(1, Math.min(24, m.s + d)); m.left = Math.min(m.left + (d > 0 ? d : 0), n); m.s = n; m.left = Math.min(m.left, n); save(); renderShop(); }
    else if (ctx === 'reel') {
      const r = byId(id), s = Math.max(1, Math.min(24, (ui.reelServ[id] || r.servings || 2) + d)); ui.reelServ[id] = s;
      $$(`[data-recipe="${id}"]`).forEach(p => { const sc = p.scrollTop; p.innerHTML = recipePane(r, s) + '<button class="edge l" data-a="pane" data-p="1">Video</button>'; p.scrollTop = sc; });
    }
  },
  markMade(el) {
    const id = el.dataset.id, c = S.cart.find(x => x.id === id); if (!c) return;
    S.cart = S.cart.filter(x => x.id !== id); delete S.checked[id];
    S.made.unshift({ id, s: c.s, left: c.s, at: Date.now(), rating: null });
    save(); ui.shopDetail = null; ui.shopTab = 'made'; renderShop(); toast('Moved to Made');
  },
  rmCart: el => { S.cart = S.cart.filter(x => x.id !== el.dataset.id); save(); renderShop(); },
  rmMade: el => { S.made = S.made.filter(x => x.id !== el.dataset.id); save(); renderShop(); },
  shopAgain: el => { const m = S.made.find(x => x.id === el.dataset.id); if (!S.cart.find(c => c.id === m.id)) S.cart.push({ id: m.id, s: m.s }); save(); ui.shopTab = 'shopping'; renderShop(); toast('Back on your list'); },
  leftSlider(el) { const m = S.made.find(x => x.id === el.dataset.id); m.left = +el.value; save(); $('#left-n').textContent = `${m.left}/${m.s}`; el.style.background = `linear-gradient(90deg,var(--nori) ${m.left / m.s * 100}%,#DDE3DB 0)`; },
  eatOne(el) { const m = S.made.find(x => x.id === el.dataset.id); if (m.left < 1) return; m.left--; addToLog(m.id, guessMeal()); renderShop(); toast('Logged to ' + guessMeal()); },
  rate(el) { const m = S.made.find(x => x.id === el.dataset.id), v = +el.dataset.v; m.rating = m.rating === v ? null : v; save(); renderShop(); },
  nutTab: el => { ui.nutTab = el.dataset.v; renderNutrition(); },
  goal() {
    openSheet(`<h3>Daily goal</h3><div class="goal-row"><button data-a="goalStep" data-d="-100" aria-label="Lower">&minus;</button><b id="goal-v">${S.goal}</b><button data-a="goalStep" data-d="100" aria-label="Raise">+</button></div><button class="big-btn" data-a="closeSheet" style="width:100%;margin:10px 0 0">Done</button>`);
  },
  goalStep(el) { S.goal = Math.max(1000, Math.min(5000, S.goal + +el.dataset.d)); save(); $('#goal-v').textContent = S.goal; renderNutrition(); },
  pickLog(el) {
    const meal = el.dataset.meal, ids = [...S.made.map(m => m.id), ...allRecipes().map(r => r.id)].filter((v, i, a) => a.indexOf(v) === i);
    openSheet(`<h3>Add to ${meal}</h3>${ids.map(id => { const r = byId(id); return `<button class="opt" data-a="logPick" data-id="${id}" data-meal="${meal}"><div class="thumb">${poster(r, true)}</div><div class="o-t">${esc(r.title)}<small>${Math.round(per(r).calories)} cal per serving</small></div><span class="add-btn" style="display:grid;place-items:center">+</span></button>`; }).join('')}`);
  },
  logPick(el) { addToLog(el.dataset.id, el.dataset.meal); closeSheet(); renderNutrition(); toast('Added'); },
  rmLog(el) { todayLog()[el.dataset.meal].splice(+el.dataset.i, 1); save(); renderNutrition(); },
  logFromReel(el) {
    openSheet(`<h3>Log a serving</h3><div class="seg" id="meal-seg">${MEALS.map(m => `<button data-a="mealPick" data-m="${m}" aria-pressed="${m === guessMeal()}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div><button class="big-btn" data-a="logGo" data-id="${el.dataset.id}" style="width:100%;margin:10px 0 0">Log it</button>`);
  },
  mealPick(el) { $$('#meal-seg button').forEach(b => b.setAttribute('aria-pressed', b === el)); },
  logGo(el) { const m = $('#meal-seg [aria-pressed="true"]').dataset.m; addToLog(el.dataset.id, m); closeSheet(); toast('Logged to ' + m); },
  chip(el) { ui.chip = el.dataset.v; $$('#chips button').forEach(b => b.setAttribute('aria-pressed', b === el)); renderFeed(); },
  pane(el) { const p = el.closest('.pager'); p.scrollTo({ left: +el.dataset.p * p.clientWidth, behavior: 'smooth' }); },
  like(el) {
    const id = el.dataset.id, i = S.liked.indexOf(id); i < 0 ? S.liked.push(id) : S.liked.splice(i, 1); save();
    const r = byId(id), on = i < 0;
    $$(`.rail [data-a="like"][data-id="${id}"]`).forEach(b => { b.setAttribute('aria-pressed', on); $('.n', b).textContent = (r.likes || 0) + (on ? 1 : 0); });
  },
  cart: el => { addToCart(el.dataset.id); },
  vid: el => { el.paused ? el.play() : el.pause(); },
  comments(el) {
    const id = el.dataset.id, list = S.comments[id] || [];
    openSheet(`<h3>Comments</h3><div id="cm">${list.map(([n, t]) => `<div class="cmt"><b>${esc(n)}</b>${esc(t)}</div>`).join('') || '<p class="cmt" style="color:var(--mute)">Be the first to comment.</p>'}</div>
      <div class="row2"><input type="text" id="cin" placeholder="Add a comment" aria-label="Add a comment" maxlength="200"><button class="big-btn" data-a="postComment" data-id="${id}" style="flex:none;padding:0 20px">Post</button></div>`);
  },
  postComment(el) {
    const inp = $('#cin'), t = inp.value.trim(); if (!t) return; (S.comments[el.dataset.id] ||= []).push(['you', t]); save();
    A.comments(el); $$(`.rail [data-a="comments"][data-id="${el.dataset.id}"] .cn`).forEach(n => { n.textContent = S.comments[el.dataset.id].length; });
  },
  saveSheet(el) {
    const id = el.dataset.id;
    openSheet(`<h3>Save to</h3>${S.collections.map(c => `<button class="opt" data-a="toggleColl" data-id="${id}" data-c="${c.id}"><div class="o-t">${esc(c.name)}<small>${c.ids.length} recipes</small></div><span class="tick ${c.ids.includes(id) ? 'on' : ''}"></span></button>`).join('')}<button class="big-btn" data-a="closeSheet" style="width:100%;margin:16px 0 0">Done</button>`);
  },
  toggleColl(el) {
    const c = S.collections.find(x => x.id === el.dataset.c), id = el.dataset.id, i = c.ids.indexOf(id); i < 0 ? c.ids.push(id) : c.ids.splice(i, 1); save();
    $('.tick', el).classList.toggle('on', i < 0); $('small', el).textContent = c.ids.length + ' recipes';
    const saved = S.collections.some(x => x.ids.includes(id)); $$(`.rail .save[data-id="${id}"]`).forEach(b => b.setAttribute('aria-pressed', saved));
  },
  newColl() {
    openSheet(`<h3>New collection</h3><input type="text" id="nc" placeholder="Name, like Weeknight" maxlength="24" aria-label="Collection name"><button class="big-btn" data-a="makeColl" style="width:100%;margin:12px 0 0">Create</button>`, b => $('#nc', b).focus());
  },
  makeColl() { const n = $('#nc').value.trim(); if (!n) return; S.collections.push({ id: 'c' + Date.now(), name: n, ids: [] }); save(); closeSheet(); renderSaved(); },
  openColl(el) { const c = S.collections.find(x => x.id === el.dataset.id); openViewer(c.name, c.ids); },
  openPost(el) { const ids = el.dataset.from ? [...new Set([...S.liked, ...S.reposts])] : S.uploaded.map(r => r.id); openViewer(el.dataset.from ? 'Liked' : 'My posts', ids, el.dataset.id); },
  closeViewer() { $('#viewer').hidden = true; $('#viewer').innerHTML = ''; },
  closeSheet,
  profTab: el => { ui.profTab = el.dataset.v; renderProfile(); },
  bio() { openSheet(`<h3>Your bio</h3><input type="text" id="bi" value="${esc(S.bio)}" placeholder="What do you cook?" maxlength="120" aria-label="Bio"><button class="big-btn" data-a="saveBio" style="width:100%;margin:12px 0 0">Save</button>`, b => $('#bi', b).focus()); },
  saveBio() { S.bio = $('#bi').value.trim(); save(); closeSheet(); renderProfile(); },
  process,
  apiUrl(el, e) { e.preventDefault(); openSheet(`<h3>Backend URL</h3><input type="text" id="au" value="${esc(Api.base())}" aria-label="API base URL"><button class="big-btn" data-a="saveApi" style="width:100%;margin:12px 0 0">Save</button>`); },
  saveApi() { localStorage.setItem('nurish.api', $('#au').value.trim()); closeSheet(); renderProfile(); },
  postIt() { const r = ui.up.result; S.uploaded.unshift(r); save(); reelsBuilt && renderFeed(); ui.up = null; ui.profTab = 'posts'; renderProfile(); toast('Posted'); },
  cartResult() { const r = ui.up.result; S.uploaded.unshift(r); S.cart.push({ id: r.id, s: r.servings }); save(); reelsBuilt && renderFeed(); ui.up = null; ui.profTab = 'posts'; renderProfile(); toast('Posted and added to Shopping'); }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.tagName === 'INPUT') return;
  const fn = A[el.dataset.a]; if (fn) fn(el, e);
});
document.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.a === 'leftSlider') A.leftSlider(el); });
document.addEventListener('change', e => { const el = e.target; if (el.dataset && el.dataset.a === 'check') A.check(el); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('#sheet').hidden) closeSheet(); else if (!$('#viewer').hidden) A.closeViewer(); }
  if (e.key === 'Enter' && e.target.classList.contains('swipe-card')) e.target.click();
});

/* ---------- tabs ---------- */
const R = { shop: renderShop, nutrition: renderNutrition, reels: () => renderReels(), saved: renderSaved, profile: renderProfile };
function showTab(t) {
  $('#phone').dataset.tab = t;
  ['shop', 'nutrition', 'reels', 'saved', 'profile'].forEach(k => { $('#screen-' + k).hidden = k !== t; });
  A.closeViewer(); closeSheet();
  if (t === 'shop') ui.shopDetail = null;
  R[t]();
  if (t === 'reels') $$('#screen-reels .pager').forEach(p => { p.scrollLeft = p.clientWidth; });
  $$('#screen-reels video').forEach(v => { if (t !== 'reels') v.pause(); });
}
showTab('reels');
})();
