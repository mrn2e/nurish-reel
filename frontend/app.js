/* nurish frontend. No build step. */
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'nurish.v2';
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
  checked: {}, liked: ['katsudon'], following: ['mika.cooks'],
  collections: SEED_COLLECTIONS.map(c => ({ ...c, ids: [...c.ids] })),
  comments: JSON.parse(JSON.stringify(SEED_COMMENTS)),
  goal: 2000, log: {}, history: {}, bio: '', follows: 128, followers: 342, reposts: ['bulgogi'],
  prefs: { diets: [], allergies: [], budget: '$60 / week', nutrition: '2,000 kcal goal', equipment: 'Stovetop, oven, blender' }
});
let S = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) S = { ...fresh(), ...JSON.parse(raw) }; } catch (e) {}
S.prefs = { ...fresh().prefs, ...(S.prefs || {}) };
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
const ui = { nutTab: 'daily', profTab: 'posts', filter: '', chip: 'all', reelServ: {}, captionMinimized: {}, captionExpanded: {}, up: null };

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
const ALLERGEN_TERMS = {
  Milk: ['milk', 'butter', 'ghee', 'cheese', 'cream', 'yogurt', 'yoghurt', 'whey', 'casein', 'lactose', 'buttermilk'],
  Eggs: ['egg', 'eggs', 'albumin', 'mayonnaise'],
  Fish: ['fish', 'salmon', 'tuna', 'cod', 'anchovy', 'anchovies', 'sardine', 'sardines', 'trout', 'tilapia', 'haddock', 'halibut', 'mackerel', 'fish sauce'],
  'Crustacean shellfish': ['shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'crawfish', 'krill'],
  'Tree nuts': ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'pine nut', 'chestnut'],
  Peanuts: ['peanut', 'groundnut', 'arachis'],
  Wheat: ['wheat', 'flour', 'bread', 'panko', 'breadcrumb', 'breadcrumbs', 'semolina', 'durum', 'spelt', 'farro', 'bulgur', 'couscous', 'seitan', 'triticale', 'einkorn'],
  Soy: ['soy', 'soya', 'tofu', 'edamame', 'tempeh', 'miso'],
  Sesame: ['sesame', 'tahini', 'benne', 'gingelly']
};
function matchingAllergies(ingredient) {
  const name = ingredient.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return preferenceSelections('allergies').filter(allergy => {
    if (allergy === 'Milk' && /\b(coconut|oat|almond|soy|rice|cashew)\s+milk\b/.test(name)) return false;
    return (ALLERGEN_TERMS[allergy] || []).some(term => {
      const phrase = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      return new RegExp(`\\b${phrase}\\b`).test(name);
    });
  });
}
const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const rng = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

/* derived, deterministic per recipe so the UI feels consistent */
const matchPct = r => 70 + (hash(r.id) % 26);                 // 70-95% pantry match
const cookMin = r => 15 + (hash(r.id + 'm') % 26);            // 15-40 min
const priceOf = r => (2 + (hash(r.id + 'p') % 45) / 10).toFixed(2); // $2.00-6.40

/* ---------- posters (generated dish art, replaced by real video when present) ---------- */
let pid = 0;
function poster(r, crop) {
  const p = r.palette || ['#9DB98C', '#1E4635', '#E0A43B', '#7CC06A', '#F4EFE6'];
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

/* ---------- icons ---------- */
const I = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11.2A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 2.8C20 15.8 12 21 12 21z"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  mark: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>',
  cam: '<svg viewBox="0 0 24 24"><path d="M4 8h4l1.5-2h5L16 8h4v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg>',
  slider: '<svg viewBox="0 0 24 24"><path d="M4 7h11M19 7h1M4 17h4M12 17h8"/><circle cx="17" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 4v16M4 12h16"/></svg>',
  repost: '<svg viewBox="0 0 24 24"><path d="M4 11V9a3 3 0 0 1 3-3h11l-3-3M20 13v2a3 3 0 0 1-3 3H6l3 3"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M13 3c1 3-1 4-2 6-1-1-1-2-1-3-2 2-4 4-4 8a6 6 0 0 0 12 0c0-4-3-6-5-11z"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M4 11V5a1 1 0 0 1 1-1h6l9 9-7 7z"/><circle cx="8" cy="8" r="1.4"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
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
  S.cart.push({ id, s: r.servings || 2 }); save(); toast('Added to Pantry list');
}

/* ---------- app bar actions per tab ---------- */
function renderAppbar(tab) {
  const host = $('#appbar-actions');
  const map = {
    pantry: `<button class="round" data-a="scan" aria-label="Scan">${I.cam}</button>`,
    nutrition: `<button class="round" data-a="nutSearch" aria-label="Search">${I.search}</button>`,
    discover: `<button class="round" data-a="nutSearch" aria-label="Search">${I.search}</button><button class="round" data-a="filters" aria-label="Filters">${I.slider}</button>`,
    cookbooks: `<button class="round" data-a="nutSearch" aria-label="Search">${I.search}</button>`,
    profile: `<button class="round" data-a="editProfile" aria-label="Settings">${I.slider}</button>`
  };
  host.innerHTML = map[tab] || '';
}

/* ---------- pantry ---------- */
function renderPantry() {
  const el = $('#screen-pantry');
  // pantry stats are illustrative, derived once
  const items = 24, soon = Math.min(3, S.cart.length + 1), low = 5;
  const picks = allRecipes().slice().sort((a, b) => matchPct(b) - matchPct(a)).slice(0, 4);
  el.innerHTML = `
  <div class="page-head"><span class="eyebrow">Your kitchen</span><h1 class="page-title">My Pantry</h1><p class="page-sub">Everything you have, all in one place.</p></div>
  <div class="stat-row">
    <div class="stat"><div class="k">Items</div><div class="v">${items}</div></div>
    <div class="stat soon"><div class="k">Use soon</div><div class="v">${soon}</div></div>
    <div class="stat"><div class="k">Low</div><div class="v">${low}</div></div>
  </div>
  <button class="cta-card" data-a="scan"><span class="cta-ic">${I.cam}</span><span class="cta-t"><b>Scan your fridge</b><small>Identify ingredients in seconds</small></span><span class="chev">${I.arrow}</span></button>
  <div class="section-row"><h2 class="section-title">Meals you can make</h2><button class="link" data-a="tab" data-v="discover">See all</button></div>
  <div class="match-grid">${picks.map(matchCard).join('')}</div>`;
}
function matchCard(r) {
  return `<button class="match-card" data-a="openRecipe" data-id="${r.id}">
    <div class="match-media"><div class="match-badge">${matchPct(r)}% match</div>${poster(r, true)}</div>
    <div class="m-title">${esc(r.title)}</div>
    <div class="m-meta">${cookMin(r)} min · $${priceOf(r)}</div></button>`;
}

/* ---------- nutrition ---------- */
function ring(size, stroke, ratio, color, track, big, small) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, ratio)));
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke="${track}"/><circle class="val" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>
  <div class="txt"><b style="font-size:${size / 5.2}px">${big}</b><small style="font-size:${Math.max(11, size / 12)}px;color:${track === '#2c5241' ? 'rgba(255,255,255,.7)' : 'var(--mute)'}">${small}</small></div></div>`;
}
function renderNutrition() {
  const el = $('#screen-nutrition'), daily = ui.nutTab === 'daily';
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en', { month: 'long', day: 'numeric' }).toUpperCase();
  let h = `<div class="page-head"><span class="eyebrow">Today · ${dateLabel}</span><h1 class="page-title">Nutrition</h1><p class="page-sub">Small choices add up beautifully.</p></div>${tabToggle()}`;
  if (daily) {
    const c = Math.round(consumed()), rem = Math.max(0, S.goal - c);
    const mac = { p: 0, c: 0, f: 0 };
    MEALS.forEach(m => todayLog()[m].forEach(e => { const r = byId(e.id); if (!r) return; const p = per(r); mac.p += p.protein_g * e.s; mac.c += p.carbs_g * e.s; mac.f += p.fat_g * e.s; }));
    const onPace = rem > 0;
    h += `<div class="nutri-hero"><div class="inner">
      <button data-a="goal" aria-label="Edit daily goal">${ring(118, 13, c / S.goal, 'var(--coral)', '#2c5241', c.toLocaleString(), 'of ' + S.goal.toLocaleString())}</button>
      <div><div class="eyebrow">Daily energy</div><div class="big">${rem.toLocaleString()} kcal left</div><div class="note">${onPace ? "You're right on pace today." : "Over goal — go easy tonight."}</div></div>
    </div></div>`;
    const goals = { p: 130, c: 240, f: 70 };
    const mk = (lab, val, goal) => `<div class="macro"><div class="pct">${Math.round(val / goal * 100)}%</div><div class="lab">${lab}</div><div class="g">${Math.round(val)} / ${goal}g</div></div>`;
    h += `<div class="macro-row">${mk('Protein', mac.p, goals.p)}${mk('Carbs', mac.c, goals.c)}${mk('Fat', mac.f, goals.f)}</div>`;
    h += `<div class="section-row"><h2 class="section-title">Today's meals</h2><button class="add-link" data-a="pickLog" data-meal="${guessMeal()}">+ Add meal</button></div>`;
    MEALS.forEach(m => {
      (todayLog()[m] || []).forEach((e, i) => {
        const r = byId(e.id); if (!r) return; const p = per(r);
        h += `<button class="meal-card" data-a="openRecipe" data-id="${e.id}"><div class="thumb">${poster(r, true)}</div>
        <div class="mc-t"><div class="tag">${m}</div><b>${esc(r.title)}</b><small>${Math.round(p.calories * e.s)} kcal · ${Math.round(p.protein_g * e.s)}g protein</small></div>
        <span class="x" data-a="rmLog" data-meal="${m}" data-i="${i}" aria-label="Remove">&times;</span></button>`;
      });
    });
  } else {
    const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(Date.now() - i * DAY), k = dayKey(d); days.push({ l: d.toLocaleDateString('en', { weekday: 'narrow' }), v: i === 0 ? Math.round(consumed()) : (S.history[k] || 0), today: i === 0 }); }
    const max = Math.max(S.goal * 1.2, ...days.map(d => d.v)), W = 340, H = 190, bw = 28, gap = (W - bw * 7) / 6;
    const gy = H - 26 - (S.goal / max) * (H - 40);
    const avg = Math.round(days.reduce((a, d) => a + d.v, 0) / 7), under = days.filter(d => d.v && d.v <= S.goal).length;
    h += `<div class="week"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Calories for the last seven days">
      ${days.map((d, i) => { const bh = (d.v / max) * (H - 40), x = i * (bw + gap); return `<rect x="${x}" y="${H - 26 - bh}" width="${bw}" height="${bh}" rx="8" fill="${d.today ? '#E05B49' : '#1E4635'}"/><text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="13" fill="#8A8275" font-family="Figtree">${d.l}</text>`; }).join('')}
      <line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="#E0A43B" stroke-width="2" stroke-dasharray="5 5"/><text x="${W}" y="${gy - 6}" text-anchor="end" font-size="12" fill="#C44A39" font-family="Figtree" font-weight="600">goal ${S.goal}</text></svg></div>
    <div class="week-stats"><div><b>${avg.toLocaleString()}</b><span>average kcal per day</span></div><div><b>${under}/7</b><span>days at or under goal</span></div></div>`;
  }
  el.innerHTML = h;
}
function tabToggle() {
  const daily = ui.nutTab === 'daily';
  return `<div class="seg" style="margin:14px 22px 0">
    <button data-a="nutTab" data-v="daily" aria-pressed="${daily}">Daily</button>
    <button data-a="nutTab" data-v="weekly" aria-pressed="${!daily}">Weekly</button></div>`;
}

/* ---------- discover (reels) ---------- */
const MACROS = [['Protein', 'protein_g', '#E0A43B'], ['Fiber', 'fiber_g', '#9DB98C'], ['Carbs', 'carbs_g', '#7FB2D9'], ['Fat', 'fat_g', '#E05B49']];
function pie(r) {
  const p = per(r), v = { protein_g: p.protein_g, fiber_g: p.fiber_g, carbs_g: Math.max(0, p.carbs_g - p.fiber_g), fat_g: p.fat_g };
  const tot = Object.values(v).reduce((a, b) => a + b, 0) || 1; let a0 = -Math.PI / 2, s = '';
  MACROS.forEach(([, k, col]) => {
    const a1 = a0 + (v[k] / tot) * 2 * Math.PI, big = a1 - a0 > Math.PI ? 1 : 0, R = 100, cx = 110, cy = 110;
    if (v[k] / tot > .999) s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${col}"/>`;
    else if (v[k] > 0) s += `<path d="M${cx} ${cy}L${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)}A${R} ${R} 0 ${big} 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)}Z" fill="${col}" stroke="#12201A" stroke-width="3"/>`;
    a0 = a1;
  });
  return `<svg width="220" height="220" viewBox="0 0 220 220" role="img" aria-label="Macro split">${s}<circle cx="110" cy="110" r="46" fill="#12201A"/><text x="110" y="108" text-anchor="middle" fill="#fff" font-family="Fraunces" font-weight="700" font-size="28">${Math.round(p.calories)}</text><text x="110" y="128" text-anchor="middle" fill="#9DB98C" font-size="13" font-family="Figtree">kcal</text></svg>`;
}
function recipePane(r, s) {
  const f = s / (r.servings || 1);
  return `<h2>${esc(r.title)}</h2><div class="head-row"><span class="sub">Serves</span>${stepper('reel', r.id, s)}</div>
  <h3>Ingredients</h3><ul class="ing">${r.ingredients.map(i => { const t = ingText(i, f), warnings = matchingAllergies(t.name); return `<li><span class="qty">${esc(t.qty) || '&nbsp;'}</span><span class="ing-name">${esc(t.name)}</span>${warnings.length ? `<span class="allergy-warning" role="note" aria-label="Potential allergen: ${esc(warnings.join(', '))}">Allergy: ${esc(warnings.join(', '))}</span>` : ''}</li>`; }).join('')}</ul>
  <h3>Directions</h3><ol class="steps">${r.steps.map(x => `<li>${esc(x.instruction)}</li>`).join('')}</ol>
  <button class="big-btn alt" data-a="cart" data-id="${r.id}">Add ingredients to Pantry list</button>`;
}
function reelHTML(r) {
  const liked = S.liked.includes(r.id), saved = S.collections.some(c => c.ids.includes(r.id)), s = ui.reelServ[r.id] || r.servings || 2, p = per(r);
  const captionMinimized = !!ui.captionMinimized[r.id];
  const captionText = String(r.caption || r.summary || '');
  const captionChars = Array.from(captionText);
  const captionExpanded = !!ui.captionExpanded[r.id];
  const captionHTML = captionChars.length > 25
    ? `<span class="caption-preview"${captionExpanded ? ' hidden' : ''}>${esc(captionChars.slice(0, 25).join(''))}…</span><span class="caption-full"${captionExpanded ? '' : ' hidden'}>${esc(captionText)}</span> <button class="caption-more" data-a="toggleCaptionOverflow" data-id="${r.id}" aria-expanded="${captionExpanded}">${captionExpanded ? 'Less' : 'More'}</button>`
    : esc(captionText);
  const cmts = (S.comments[r.id] || []).length;
  const following = S.following.includes(r.creator);
  const initial = (r.creator || 'you')[0].toUpperCase();
  return `<article class="reel" data-id="${r.id}"><div class="pager" tabindex="-1">
  <div class="pane info" aria-label="Nutrition"><h2>${esc(r.title)}</h2><p class="sub">Nutrition per serving</p><div class="pie-wrap">${pie(r)}</div>
    <ul class="legend">${MACROS.map(([n, k, c]) => `<li><i style="background:${c}"></i><div><b>${Math.round(p[k])} g</b><span>${n}</span></div></li>`).join('')}</ul>
    <p class="sub" style="margin-top:16px">Sodium ${Math.round(p.sodium_mg)} mg · sugar ${Math.round(p.sugar_g)} g</p>
    <button class="big-btn" data-a="logFromReel" data-id="${r.id}">Log a serving</button><button class="edge r" data-a="pane" data-p="1">Video</button></div>
  <div class="pane video">${r.videoUrl ? `<video src="${r.videoUrl}" loop muted playsinline data-a="vid"></video>` : poster(r)}<div class="shade"></div>
    <button class="edge l" data-a="pane" data-p="0">Nutrition</button><button class="edge r" data-a="pane" data-p="2">Recipe</button>
    <div class="r-avatar">${initial}${following ? '' : `<button class="plus" data-a="follow" data-id="${r.id}" aria-label="Follow">+</button>`}</div>
    <div class="caption${captionMinimized ? ' minimized' : ''}">
      <div class="caption-tools"><button class="caption-toggle" data-a="toggleCaption" data-id="${r.id}" aria-label="${captionMinimized ? 'Show' : 'Minimize'} caption" aria-pressed="${captionMinimized}">${captionMinimized ? 'Show caption' : 'Minimize'}</button></div>
      <span class="match-pill"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>${matchPct(r)}% pantry match</span>
      <div class="who">@${esc(r.creator || 'you')}${following ? '' : `<button class="follow" data-a="follow" data-id="${r.id}">Follow</button>`}</div>
      <h2>${esc(r.title)}</h2>
      <p>${captionHTML}</p>
      <div class="meta-chips">
        <span class="mc">${I.clock}${cookMin(r)} min</span>
        <span class="mc">${I.flame}${Math.round(p.protein_g)}g protein</span>
        <span class="mc">${I.tag}$${priceOf(r)} / serving</span>
      </div>
    </div>
    <div class="rail">
      <button data-a="like" data-id="${r.id}" aria-pressed="${liked}" aria-label="Like"><span class="ic heart">${I.heart}</span><span class="n">${fmtK((r.likes || 0) + (liked ? 1 : 0))}</span></button>
      <button data-a="comments" data-id="${r.id}" aria-label="Comments"><span class="ic">${I.chat}</span><span class="cn">${cmts}</span></button>
      <button class="save" data-a="saveSheet" data-id="${r.id}" aria-pressed="${saved}" aria-label="Save"><span class="ic">${I.mark}</span><span>${fmtK(1200)}</span></button>
      <button data-a="shareSheet" data-id="${r.id}" aria-label="Share"><span class="ic">${I.share}</span><span>Share</span></button></div>
    <button class="make-btn" data-a="pane" data-p="2">Make this recipe ${I.arrow}</button></div>
  <div class="pane info" aria-label="Recipe" data-recipe="${r.id}">${recipePane(r, s)}<button class="edge l" data-a="pane" data-p="1">Video</button></div>
  </div></article>`;
}
const fmtK = n => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
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
function renderDiscover(force) {
  const el = $('#screen-discover');
  if (!reelsBuilt) { el.innerHTML = `<div id="feedhost"></div>`; reelsBuilt = true; force = true; }
  if (force) renderFeed();
}
function renderFeed() {
  const host = $('#feedhost'), list = filtered();
  host.style.height = '100%';
  host.innerHTML = list.length ? feedHTML(list) : `<div class="empty" style="color:#9DB98C;padding-top:220px"><b style="color:#fff">No matches</b>Try another word or clear the filter.</div>`;
  if (list.length) mountFeed(host);
}
function openRecipe(id) { openViewer('', [id], id); }

/* ---------- cookbooks ---------- */
function renderCookbooks() {
  const el = $('#screen-cookbooks');
  const feat = S.collections.find(c => c.ids.length) || S.collections[0];
  const featR = feat && byId(feat.ids[0]);
  el.innerHTML = `
  <div class="page-head"><span class="eyebrow">Your collections</span><h1 class="page-title">My Cookbooks</h1><p class="page-sub">Recipes worth coming back to.</p></div>
  ${feat ? `<button class="featured" data-a="openColl" data-id="${feat.id}">${featR ? poster(featR, true) : ''}<div class="f-body"><span class="eyebrow">Featured collection</span><h3>${esc(feat.name)}</h3><small>${feat.ids.length} ${feat.ids.length === 1 ? 'recipe' : 'recipes'}</small></div></button>` : ''}
  <div class="section-row"><h2 class="section-title">Your collections</h2><button class="link" data-a="newColl">+ Create</button></div>
  <div class="grid2">${S.collections.map(c => { const r = byId(c.ids[0]); return `<button class="tile ${r ? '' : 'empty-t'}" data-a="openColl" data-id="${c.id}"><div class="t-media">${r ? poster(r, true) : ''}</div><b>${esc(c.name)}</b><small>${c.ids.length} ${c.ids.length === 1 ? 'recipe' : 'recipes'}</small></button>`; }).join('')}</div>`;
}
function openViewer(title, ids, startId) {
  const list = ids.map(byId).filter(Boolean), v = $('#viewer');
  v.hidden = false; $('#phone').classList.add('viewing');
  v.innerHTML = list.length ? `<button class="back-fab" data-a="closeViewer" aria-label="Back">${I.back}</button>${title ? `<div class="viewer-title">${esc(title)}</div>` : ''}${feedHTML(list)}`
    : `<button class="back-fab" data-a="closeViewer" aria-label="Back">${I.back}</button><div class="viewer-title">${esc(title)}</div><div class="empty" style="color:#9DB98C;padding-top:240px"><b style="color:#fff">Empty for now</b>Save recipes from Discover and they land here.</div>`;
  if (list.length) { mountFeed(v); if (startId) { const t = $(`.reel[data-id="${startId}"]`, v); t && t.scrollIntoView(); } }
}

/* ---------- profile ---------- */
const PREFS = [['budget', 'Grocery budget'], ['nutrition', 'Nutrition goals'], ['equipment', 'Kitchen equipment']];
const DIET_OPTIONS = ['Vegan', 'Vegetarian', 'Pescatarian'];
const ALLERGY_OPTIONS = Object.keys(ALLERGEN_TERMS);
function preferenceSelections(key) {
  const selections = S.prefs[key];
  return Array.isArray(selections) ? selections : [];
}
function preferenceSummary(key, selections) {
  return selections.length ? selections.join(', ') : `No ${key} selected`;
}
function preferenceDropdown(key, label, options) {
  const selections = preferenceSelections(key);
  return `<details class="pref-group"><summary><span>${label}</span><span class="pref-summary" data-pref-summary="${key}">${esc(preferenceSummary(key, selections))}</span></summary>
    <div class="pref-options">${options.map(option => `<label><input type="checkbox" data-pref-group="${key}" value="${esc(option)}" ${selections.includes(option) ? 'checked' : ''}><span>${esc(option)}</span></label>`).join('')}</div>
  </details>`;
}
function renderProfile() {
  const el = $('#screen-profile'), t = ui.profTab, mine = S.uploaded;
  const saved = new Set(S.collections.flatMap(c => c.ids)).size + S.liked.length;
  const tabs = [['posts', I.grid], ['upload', I.plus], ['reposts', I.repost], ['prefs', I.note]];
  let body = '';
  if (t === 'posts') body = mine.length ? `<div class="grid3">${mine.map(r => `<button data-a="openPost" data-id="${r.id}">${poster(r, true)}<small>${esc(r.title)}</small></button>`).join('')}</div>` : `<div class="empty"><b>No posts yet</b>Upload a cooking video with the plus tab and it becomes a recipe.</div>`;
  if (t === 'reposts') { const ids = [...new Set([...S.liked, ...S.reposts])]; body = `<div class="grid3">${ids.map(byId).filter(Boolean).map(r => `<button data-a="openPost" data-id="${r.id}" data-from="liked">${poster(r, true)}<small>${esc(r.title)}</small></button>`).join('')}</div>`; }
  if (t === 'prefs') body = `<div class="pref-list">${preferenceDropdown('diets', 'Diets', DIET_OPTIONS)}${preferenceDropdown('allergies', 'Allergies', ALLERGY_OPTIONS)}${PREFS.map(([k, lab]) => `<button class="pref" data-a="editPref" data-k="${k}">${esc(lab)}<span class="chev">${I.arrow}</span></button>`).join('')}</div>`;
  if (t === 'upload') body = uploadHTML();
  el.innerHTML = `
  <div class="p-head"><span class="eyebrow">Your space</span><h1 class="page-title">Hey, Maya</h1><p class="page-sub">Your kitchen, your rules.</p>
    <div class="p-id"><div class="avatar">M</div><div><div class="p-name">Maya Chen</div><div class="p-handle">@mayamakes</div></div><button class="edit-btn" data-a="editProfile">Edit</button></div>
  </div>
  <div class="p-stats"><div><b>${saved}</b><span>Saved</span></div><div><b>${S.made.length}</b><span>Cooked</span></div><div><b>${mine.length}</b><span>Videos</span></div></div>
  ${S.bio ? `<p class="bio">${esc(S.bio)}</p>` : ''}
  <div class="section-row"><h2 class="section-title">Your preferences</h2><button class="link" data-a="profTab" data-v="prefs">Edit</button></div>
  <div class="ptabs" role="tablist">${tabs.map(([k, ic]) => `<button role="tab" aria-selected="${t === k}" data-a="profTab" data-v="${k}" aria-label="${k}">${ic}</button>`).join('')}</div>${body}`;
  if (t === 'upload') bindUpload(el);
}
const STAGES = [['media_extraction', 'Extracting audio and frames'], ['transcription', 'Transcribing speech'], ['ocr', 'Reading on-screen text'], ['captions', 'Parsing captions'], ['structuring', 'Structuring the recipe'], ['nutrition', 'Looking up nutrition'], ['shopping_list', 'Building the shopping list']];
function uploadHTML() {
  const u = ui.up || {}, running = u.state === 'running';
  const idx = STAGES.findIndex(s => s[0] === u.stage);
  return `<div class="up"><label class="drop" id="drop"><b>Drop a cooking video</b><span>${u.video ? esc(u.video.name) : 'or tap to choose a file'}</span><input type="file" id="vid" accept="video/*"></label>
  <div class="file-line"><span>Captions (optional): <b>${u.captions ? esc(u.captions.name) : 'none'}</b></span><label class="small-link" style="cursor:pointer">Add .srt or .vtt<input type="file" id="cap" accept=".srt,.vtt" hidden></label></div>
  <label class="post-caption">Post caption (optional)<textarea id="post-caption" placeholder="Add a note about this recipe..." aria-label="Post caption" ${running ? 'disabled' : ''}>${esc(u.caption || '')}</textarea><span>Shown with your video on Discover. Leave blank to use the recipe summary.</span></label>
  <button class="big-btn alt" data-a="process" ${u.video && !running ? '' : 'disabled style="opacity:.4"'}>${running ? 'Working' : 'Turn it into a recipe'}</button>
  ${u.state ? `<ul class="stages">${STAGES.map(([k, l], i) => `<li class="${u.state === 'done' || i < idx ? 'done' : i === idx ? 'run' : ''}"><i></i>${l}</li>`).join('')}</ul>` : ''}
  ${u.error ? `<div class="note err">${esc(u.error)}</div>` : ''}${u.demo ? `<div class="note">Backend not reachable at ${esc(Api.base())}, so this ran in demo mode with a sample recipe. Start the API with uvicorn, or <a class="small-link" href="#" data-a="apiUrl">change the URL</a>.</div>` : ''}
  ${u.result ? resultHTML(u.result) : ''}</div>`;
}
function resultHTML(r) {
  const p = per(r);
  return `<div class="result"><h3>${esc(r.title)}</h3><p>${r.ingredients.length} ingredients, ${r.steps.length} steps, serves ${r.servings}. About ${Math.round(p.calories)} kcal per serving.</p>
  <div class="row"><button class="big-btn" data-a="postIt">Post to Discover</button><button class="big-btn alt" data-a="cartResult">Shop it</button></div></div>`;
}
function bindUpload(el) {
  const v = $('#vid', el), c = $('#cap', el), d = $('#drop', el), caption = $('#post-caption', el);
  v && v.addEventListener('change', () => { ui.up = { ...(ui.up || {}), video: v.files[0] }; renderProfile(); });
  c && c.addEventListener('change', () => { ui.up = { ...(ui.up || {}), captions: c.files[0] }; renderProfile(); });
  caption && caption.addEventListener('input', () => { ui.up = { ...(ui.up || {}), caption: caption.value }; });
  if (d) { ['dragover', 'dragenter'].forEach(e => d.addEventListener(e, ev => { ev.preventDefault(); d.classList.add('over'); })); ['dragleave', 'drop'].forEach(e => d.addEventListener(e, () => d.classList.remove('over')));
    d.addEventListener('drop', ev => { ev.preventDefault(); const f = ev.dataTransfer.files[0]; if (f) { ui.up = { ...(ui.up || {}), video: f }; renderProfile(); } }); }
}
function toRecipe(res, file, caption) {
  const r = res.recipe, id = 'up-' + Date.now().toString(36), pals = SEED_RECIPES.map(x => x.palette);
  return {
    id, title: r.title, creator: 'mayamakes', summary: r.summary, caption: (caption || '').trim() || r.summary || '', servings: r.servings || 2, shelfDays: 3, likes: 0,
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
    u.result = toRecipe(await Api.result(job_id), u.video, u.caption); u.state = 'done';
  } catch (e) {
    if (e.server) { u.state = null; u.error = e.message; }
    else {
      u.demo = true;
      for (const [k] of STAGES) { u.stage = k; renderProfile(); await wait(550); }
      const name = u.video.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      u.result = toRecipe({ recipe: { title: name ? name[0].toUpperCase() + name.slice(1) : 'Untitled recipe', summary: 'Processed from your upload.', servings: 2, tags: ['new'],
        ingredients: [{ name: 'olive oil', quantity: 2, unit: 'tbsp' }, { name: 'garlic cloves', quantity: 3, unit: '' }, { name: 'tomatoes', quantity: 4, unit: '' }, { name: 'pasta', quantity: 200, unit: 'g' }],
        steps: [{ number: 1, instruction: 'Sample step from the stub pipeline.' }, { number: 2, instruction: 'Serve warm.' }],
        nutrition_total: { calories: 820, protein_g: 24, fat_g: 28, carbs_g: 110, fiber_g: 8, sugar_g: 12, sodium_mg: 900 } } }, u.video, u.caption);
      u.state = 'done';
    }
  }
  renderProfile();
}

/* ---------- actions ---------- */
const A = {
  tab: el => showTab(el.dataset.v),
  nutTab: el => { ui.nutTab = el.dataset.v; renderNutrition(); },
  goal() {
    openSheet(`<h3>Daily goal</h3><div class="goal-row"><button data-a="goalStep" data-d="-100" aria-label="Lower">&minus;</button><b id="goal-v">${S.goal}</b><button data-a="goalStep" data-d="100" aria-label="Raise">+</button></div><button class="big-btn" data-a="closeSheet" style="margin:10px 0 0">Done</button>`);
  },
  goalStep(el) { S.goal = Math.max(1000, Math.min(5000, S.goal + +el.dataset.d)); save(); $('#goal-v').textContent = S.goal; renderNutrition(); },
  pickLog(el) {
    const meal = el.dataset.meal, ids = [...S.made.map(m => m.id), ...allRecipes().map(r => r.id)].filter((v, i, a) => a.indexOf(v) === i);
    openSheet(`<h3>Add to ${meal}</h3>${ids.map(id => { const r = byId(id); return `<button class="opt" data-a="logPick" data-id="${id}" data-meal="${meal}"><div class="thumb">${poster(r, true)}</div><div class="o-t">${esc(r.title)}<small>${Math.round(per(r).calories)} kcal per serving</small></div><span class="add-btn">+</span></button>`; }).join('')}`);
  },
  logPick(el) { addToLog(el.dataset.id, el.dataset.meal); closeSheet(); renderNutrition(); toast('Added'); },
  rmLog(el, e) { e.stopPropagation(); todayLog()[el.dataset.meal].splice(+el.dataset.i, 1); save(); renderNutrition(); },
  openRecipe: el => openRecipe(el.dataset.id),
  step(el) {
    const { ctx, id } = el.dataset, d = +el.dataset.d;
    if (ctx === 'reel') {
      const r = byId(id), s = Math.max(1, Math.min(24, (ui.reelServ[id] || r.servings || 2) + d)); ui.reelServ[id] = s;
      $$(`[data-recipe="${id}"]`).forEach(p => { const sc = p.scrollTop; p.innerHTML = recipePane(r, s) + '<button class="edge l" data-a="pane" data-p="1">Video</button>'; p.scrollTop = sc; });
    }
  },
  chip(el) { ui.chip = el.dataset.v; $$('#chips button').forEach(b => b.setAttribute('aria-pressed', b === el)); renderFeed(); },
  pane(el) { const p = el.closest('.pager'); p.scrollTo({ left: +el.dataset.p * p.clientWidth, behavior: 'smooth' }); },
  toggleCaption(el) {
    const id = el.dataset.id, minimized = !ui.captionMinimized[id];
    ui.captionMinimized[id] = minimized;
    const caption = el.closest('.video').querySelector('.caption');
    caption.classList.toggle('minimized', minimized);
    el.textContent = `${minimized ? 'Show' : 'Minimize'} caption`;
    el.setAttribute('aria-label', `${minimized ? 'Show' : 'Minimize'} caption`);
    el.setAttribute('aria-pressed', minimized);
  },
  toggleCaptionOverflow(el) {
    const id = el.dataset.id, expanded = !ui.captionExpanded[id];
    ui.captionExpanded[id] = expanded;
    const caption = el.closest('.caption');
    caption.querySelector('.caption-preview').hidden = expanded;
    caption.querySelector('.caption-full').hidden = !expanded;
    el.textContent = expanded ? 'Less' : 'More';
    el.setAttribute('aria-expanded', expanded);
  },
  like(el) {
    const id = el.dataset.id, i = S.liked.indexOf(id); i < 0 ? S.liked.push(id) : S.liked.splice(i, 1); save();
    const r = byId(id), on = i < 0;
    $$(`.rail [data-a="like"][data-id="${id}"]`).forEach(b => { b.setAttribute('aria-pressed', on); $('.n', b).textContent = fmtK((r.likes || 0) + (on ? 1 : 0)); });
  },
  follow(el) {
    const r = byId(el.dataset.id); if (!r) return;
    if (!S.following.includes(r.creator)) S.following.push(r.creator); save();
    $$(`.reel[data-id="${el.dataset.id}"] .follow, .reel[data-id="${el.dataset.id}"] .r-avatar .plus`).forEach(b => b.remove());
    toast('Following @' + r.creator);
  },
  cart: el => { addToCart(el.dataset.id); },
  vid: el => { el.paused ? el.play() : el.pause(); },
  comments(el) {
    const id = el.dataset.id, list = S.comments[id] || [];
    openSheet(`<h3>Comments</h3><div id="cm">${list.map(([n, t]) => `<div class="cmt"><b>${esc(n)}</b>${esc(t)}</div>`).join('') || '<p class="cmt" style="color:var(--mute)">Be the first to comment.</p>'}</div>
      <div class="row2"><input type="text" id="cin" placeholder="Add a comment" aria-label="Add a comment" maxlength="200"><button class="big-btn" data-a="postComment" data-id="${id}" style="flex:none;padding:0 20px">Post</button></div>`);
  },
  postComment(el) {
    const inp = $('#cin'), t = inp.value.trim(); if (!t) return; (S.comments[el.dataset.id] ||= []).push(['mayamakes', t]); save();
    A.comments(el); $$(`.rail [data-a="comments"][data-id="${el.dataset.id}"] .cn`).forEach(n => { n.textContent = S.comments[el.dataset.id].length; });
  },
  shareSheet(el) {
    const r = byId(el.dataset.id);
    openSheet(`<h3>Share</h3><p class="cmt" style="border:0;color:var(--mute)">Share “${esc(r.title)}” with a friend.</p>
      <div class="row2"><input type="text" id="sh" value="nurish.app/r/${esc(r.id)}" readonly aria-label="Share link"><button class="big-btn" data-a="copyShare" style="flex:none;padding:0 20px">Copy</button></div>`);
  },
  copyShare() { const v = $('#sh'); v.select(); try { document.execCommand('copy'); } catch (e) {} closeSheet(); toast('Link copied'); },
  saveSheet(el) {
    const id = el.dataset.id;
    openSheet(`<h3>Save to</h3>${S.collections.map(c => `<button class="opt" data-a="toggleColl" data-id="${id}" data-c="${c.id}"><div class="o-t">${esc(c.name)}<small>${c.ids.length} recipes</small></div><span class="tick ${c.ids.includes(id) ? 'on' : ''}"></span></button>`).join('')}<button class="big-btn" data-a="closeSheet" style="margin:16px 0 0">Done</button>`);
  },
  toggleColl(el) {
    const c = S.collections.find(x => x.id === el.dataset.c), id = el.dataset.id, i = c.ids.indexOf(id); i < 0 ? c.ids.push(id) : c.ids.splice(i, 1); save();
    $('.tick', el).classList.toggle('on', i < 0); $('small', el).textContent = c.ids.length + ' recipes';
    const saved = S.collections.some(x => x.ids.includes(id)); $$(`.rail .save[data-id="${id}"]`).forEach(b => b.setAttribute('aria-pressed', saved));
  },
  newColl() {
    openSheet(`<h3>New collection</h3><input type="text" id="nc" placeholder="Name, like Weeknight" maxlength="24" aria-label="Collection name"><button class="big-btn" data-a="makeColl" style="margin:12px 0 0">Create</button>`, b => $('#nc', b).focus());
  },
  makeColl() { const n = $('#nc').value.trim(); if (!n) return; S.collections.push({ id: 'c' + Date.now(), name: n, ids: [] }); save(); closeSheet(); renderCookbooks(); },
  openColl(el) { const c = S.collections.find(x => x.id === el.dataset.id); openViewer(c.name, c.ids); },
  openPost(el) { const ids = el.dataset.from ? [...new Set([...S.liked, ...S.reposts])] : S.uploaded.map(r => r.id); openViewer(el.dataset.from ? 'Liked' : 'My videos', ids, el.dataset.id); },
  closeViewer() { $('#viewer').hidden = true; $('#viewer').innerHTML = ''; $('#phone').classList.remove('viewing'); },
  closeSheet,
  profTab: el => { ui.profTab = el.dataset.v; renderProfile(); },
  editProfile() { openSheet(`<h3>Edit profile</h3><p class="cmt" style="border:0;color:var(--mute)">Your bio</p><input type="text" id="bi" value="${esc(S.bio)}" placeholder="What do you cook?" maxlength="120" aria-label="Bio"><button class="big-btn" data-a="saveBio" style="margin:12px 0 0">Save</button>`, b => $('#bi', b).focus()); },
  saveBio() { S.bio = $('#bi').value.trim(); save(); closeSheet(); renderProfile(); },
  editPref(el) {
    const k = el.dataset.k, lab = PREFS.find(p => p[0] === k)[1];
    openSheet(`<h3>${esc(lab)}</h3><input type="text" id="pr" value="${esc(S.prefs[k] || '')}" placeholder="Your preference" maxlength="60" aria-label="${esc(lab)}"><button class="big-btn" data-a="savePref" data-k="${k}" style="margin:12px 0 0">Save</button>`, b => $('#pr', b).focus());
  },
  savePref(el) { S.prefs[el.dataset.k] = $('#pr').value.trim(); save(); closeSheet(); toast('Saved'); },
  scan() { toast('Fridge scanning is coming soon'); },
  nutSearch() { toast('Search is coming soon'); },
  filters() { toast('Filters are coming soon'); },
  process,
  apiUrl(el, e) { e.preventDefault(); openSheet(`<h3>Backend URL</h3><input type="text" id="au" value="${esc(Api.base())}" aria-label="API base URL"><button class="big-btn" data-a="saveApi" style="margin:12px 0 0">Save</button>`); },
  saveApi() { localStorage.setItem('nurish.api', $('#au').value.trim()); closeSheet(); renderProfile(); },
  postIt() { const r = ui.up.result; r.caption = (ui.up.caption || '').trim() || r.summary || ''; S.uploaded.unshift(r); save(); reelsBuilt && renderFeed(); ui.up = null; ui.profTab = 'posts'; renderProfile(); toast('Posted to Discover'); },
  cartResult() { const r = ui.up.result; r.caption = (ui.up.caption || '').trim() || r.summary || ''; S.uploaded.unshift(r); S.cart.push({ id: r.id, s: r.servings }); save(); reelsBuilt && renderFeed(); ui.up = null; ui.profTab = 'posts'; renderProfile(); toast('Posted and added to Pantry list'); }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.tagName === 'INPUT') return;
  const fn = A[el.dataset.a]; if (fn) fn(el, e);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (!(el instanceof HTMLInputElement) || !el.matches('input[data-pref-group]')) return;
  const key = el.dataset.prefGroup, selections = preferenceSelections(key), index = selections.indexOf(el.value);
  if (el.checked && index === -1) selections.push(el.value);
  else if (!el.checked && index !== -1) selections.splice(index, 1);
  S.prefs[key] = selections;
  save();
  const summary = $(`[data-pref-summary="${key}"]`);
  if (summary) summary.textContent = preferenceSummary(key, selections);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('#sheet').hidden) closeSheet(); else if (!$('#viewer').hidden) A.closeViewer(); }
});

/* ---------- tabs ---------- */
const R = { pantry: renderPantry, nutrition: renderNutrition, discover: () => renderDiscover(), cookbooks: renderCookbooks, profile: renderProfile };
function showTab(t) {
  $('#phone').dataset.tab = t;
  ['pantry', 'nutrition', 'discover', 'cookbooks', 'profile'].forEach(k => { $('#screen-' + k).hidden = k !== t; });
  A.closeViewer(); closeSheet();
  renderAppbar(t);
  R[t]();
  if (t === 'discover') $$('#screen-discover .pager').forEach(p => { p.scrollLeft = p.clientWidth; });
  $$('#screen-discover video').forEach(v => { if (t !== 'discover') v.pause(); });
}
showTab('discover');
})();
