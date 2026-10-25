/* Nourish frontend. No build step. */
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
  cart: [{ id: 'beef-pasta', s: 4 }, { id: 'coconut-chicken', s: 3 }],
  made: [
    { id: 'coconut-chicken', s: 3, left: 1, at: now - DAY, rating: null },
    { id: 'garlic-soy-chicken', s: 3, left: 2, at: now - 2 * DAY, rating: 3 }
  ],
  checked: {}, liked: ['soy-garlic-ramen'], following: ['nurish.kitchen'],
  collections: SEED_COLLECTIONS.map(c => ({ ...c, ids: [...c.ids] })),
  comments: JSON.parse(JSON.stringify(SEED_COMMENTS)),
  goal: 2000, log: {}, history: {}, bio: '', follows: 128, followers: 342, reposts: ['garlic-soy-chicken'],
  purchases: [
    { id: 'p1', name: 'Spinach and tomatoes', cat: 'Produce', price: 8.40, at: weekStart() + 3.6e6 },
    { id: 'p2', name: 'Chicken thighs', cat: 'Protein', price: 9.60, at: weekStart() + 7.2e6 },
    { id: 'p3', name: 'Milk and butter', cat: 'Dairy', price: 3.99, at: weekStart() + 1.08e7 },
    { id: 'p4', name: 'Pasta', cat: 'Grains', price: 2.01, at: weekStart() + 1.44e7 }
  ],
  extras: [],
  theme: null, prefs: { diets: [], allergies: [], budget: '$60 / week' }
});
let S = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) S = { ...fresh(), ...JSON.parse(raw) }; } catch (e) {}
S.prefs = { ...fresh().prefs, ...(S.prefs || {}) };
const darkQuery = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
const currentTheme = () => S.theme || (darkQuery && darkQuery.matches ? 'dark' : 'light');
const applyTheme = () => { document.documentElement.dataset.theme = currentTheme(); };
applyTheme();
if (darkQuery) darkQuery.addEventListener('change', () => { if (!S.theme) applyTheme(); });
if (!S.log[dayKey()]) {
  S.log[dayKey()] = { breakfast: [{ id: 'coconut-chicken', s: 1 }], lunch: [{ id: 'beef-pasta', s: 1 }], dinner: [{ id: 'garlic-soy-chicken', s: 1 }], snacks: [] };
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
const ui = { fl: { proteins: [], diets: [], maxPrice: 0, maxTime: 0, ignoreDiet: false }, pantryTab: 'pantry', nutTab: 'daily', profTab: 'posts', filter: '', reelServ: {}, captionExpanded: {}, sound: false, up: null };

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
const cookMin = r => r.minutes || 15 + (hash(r.id + 'm') % 26);   // real prep+cook time when the API gave one, else 15-40 min
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
/* Uploaded videos live in IndexedDB so they still play after a reload. */
const VideoStore = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
    const q = indexedDB.open('nourish-videos', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('videos');
    q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
  }));
  const run = (mode, fn) => open().then(db => new Promise((res, rej) => {
    const tx = db.transaction('videos', mode), req = fn(tx.objectStore('videos'));
    tx.oncomplete = () => res(req && req.result); tx.onerror = tx.onabort = () => rej(tx.error);
  }));
  return { put: (id, blob) => run('readwrite', s => s.put(blob, id)), get: id => run('readonly', s => s.get(id)), del: id => run('readwrite', s => s.delete(id)) };
})();
const sndHTML = () => ui.sound ? `${I.sound}<span>Sound on</span>` : `${I.mute}<span>Tap for sound</span>`;
const keepVideo = (id, file) => { if (file) VideoStore.put(id, file).catch(() => toast('Could not save the video for later, so it will only play until you close this tab.')); };
async function restoreVideos() {
  await Promise.all(S.uploaded.map(async r => {
    if (r.videoUrl) return;
    try { const blob = await VideoStore.get(r.id); if (blob) r.videoUrl = URL.createObjectURL(blob); } catch (e) {}
  }));
}
const I = {
  pencil: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.800 2.800 0 0 0-4-4L4 16z"/><path d="M13.500 6.500l4 4"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.500a5 5 0 0 1 0 7M19 6a8.500 8.500 0 0 1 0 12"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
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
function openSheet(html, mount) { const tt = $('#toast'); if (tt) { tt.classList.remove('on'); clearTimeout(toastT); } $('#sheet-body').innerHTML = html; $('#sheet').hidden = false; mount && mount($('#sheet-body')); }
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
function removeFromLog(id, n) {
  const day = todayLog(), first = guessMeal();
  for (const meal of [first, ...MEALS.filter(x => x !== first)]) {
    const list = day[meal] || [];
    for (let i = list.length - 1; i >= 0 && n > 0; i--) {
      if (list[i].id !== id) continue;
      const take = Math.min(list[i].s, n); list[i].s -= take; n -= take;
      if (list[i].s <= 0) list.splice(i, 1);
    }
  }
  save();
}
const servedToday = id => MEALS.reduce((a, m) => a + (todayLog()[m] || []).filter(e => e.id === id).reduce((b, e) => b + e.s, 0), 0);
const logNote = id => { const n = servedToday(id); return n ? `Logged today: ${n} ${n === 1 ? 'serving' : 'servings'}` : ''; };
function addToCart(id) {
  const r = byId(id);
  if (S.cart.find(c => c.id === id)) { toast('Already on your Shopping List'); return; }
  S.cart.push({ id, s: r.servings || 2 }); save(); toast('Added to your Shopping List');
}

/* ---------- app bar actions per tab ---------- */
function renderAppbar(tab) {
  const host = $('#appbar-actions');
  const map = {
    pantry: '',
    nutrition: `<button class="round" data-a="search" data-scope="nutrition" aria-label="Search recipes to log">${I.search}</button>`,
    discover: `<button class="round" data-a="search" data-scope="discover" aria-label="Search videos${ui.filter.trim() ? ', search active' : ''}">${I.search}${ui.filter.trim() ? '<span class="sdot"></span>' : ''}</button><button class="round" data-a="filters" aria-label="Filter videos${activeFilterCount() ? ', ' + activeFilterCount() + ' active' : ''}">${I.slider}${activeFilterCount() ? `<span class="fbadge">${activeFilterCount()}</span>` : ''}</button>`,
    cookbooks: `<button class="round" data-a="search" data-scope="cookbooks" aria-label="Search cookbooks">${I.search}</button>`,
    profile: ''
  };
  host.innerHTML = map[tab] || '';
}

/* ---------- pantry ---------- */
function weekStart() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
const PANTRY_CATS = ['Produce', 'Protein', 'Dairy', 'Grains', 'Pantry'];
const CAT_RULES = [
  ['Pantry', /vinegar|sauce|oil|stock|broth|sake|mirin|dashi|passata|seeds?|salt|spice|sugar|honey|crisp|paste|syrup/],
  ['Dairy', /milk|cheese|parmesan|butter|cream|yogurt|yoghurt|mozzarella/],
  ['Protein', /chicken|beef|pork|steak|ribeye|turkey|bacon|sausage|ham\b|lamb|fish|salmon|shrimp|tuna|tofu|tempeh|egg|beans?\b|lentil|chickpea/],
  ['Grains', /rice|pasta|noodle|bread|panko|flour|tortilla|wrapper|oats?\b|couscous|quinoa|cracker/],
  ['Produce', /onion|garlic|carrot|celery|tomato|kale|spinach|lettuce|cucumber|pepper|potato|mushroom|scallion|chive|cabbage|pear|apple|lemon|lime|ginger|herb|basil|parsley|cilantro|broccoli|zucchini|avocado/]
];
const catOf = name => { const n = String(name).toLowerCase(); const hit = CAT_RULES.find(([, re]) => re.test(n)); return hit ? hit[0] : 'Pantry'; };
const CAT_PRICE = { Produce: [.6, 2.2], Protein: [2.5, 6], Dairy: [1.5, 3.5], Grains: [1, 2.5], Pantry: [.8, 2.5] };
const ingPrice = (name, cat, f) => { const [lo, hi] = CAT_PRICE[cat], base = lo + (hash(name) % 100) / 100 * (hi - lo); return Math.round(base * 0.8 * (0.75 + 0.25 * Math.max(.5, Math.min(f, 4))) * 100) / 100; };
const money = n => '$' + (Math.round(n * 100) / 100).toFixed(2);
const money0 = n => '$' + Math.round(n);
function weeklyBudget() {
  const t = String(S.prefs.budget || ''), m = t.match(/(\d+(?:\.\d+)?)/);
  if (!m) return 60;
  const n = parseFloat(m[1]); return /month/i.test(t) ? n / 4.33 : n;
}
function shopItems() {
  const out = [];
  S.cart.forEach(c => {
    const r = byId(c.id); if (!r) return;
    const f = c.s / (r.servings || 1), chk = S.checked[c.id] || {};
    r.ingredients.forEach((i, k) => {
      const t = ingText(i, f), cat = catOf(i.name);
      out.push({ src: 'r', id: c.id, k, name: t.name, qty: t.qty, cat, price: ingPrice(i.name, cat, f), checked: !!chk[k], recipe: r.title });
    });
  });
  S.extras.forEach(x => out.push({ src: 'x', id: x.id, k: 0, name: x.name, qty: '', cat: x.cat, price: x.price, checked: !!x.checked, recipe: '' }));
  return out;
}
function budgetNumbers() {
  const items = shopItems(), since = weekStart(), bought = S.purchases.filter(p => p.at >= since);
  const byCat = Object.fromEntries(PANTRY_CATS.map(c => [c, { spent: 0, planned: 0 }]));
  bought.forEach(p => { (byCat[p.cat] || byCat.Pantry).spent += p.price; });
  items.forEach(i => { (byCat[i.cat] || byCat.Pantry)[i.checked ? 'spent' : 'planned'] += i.price; });
  const spent = PANTRY_CATS.reduce((a, c) => a + byCat[c].spent, 0), planned = PANTRY_CATS.reduce((a, c) => a + byCat[c].planned, 0), budget = weeklyBudget();
  return { items, byCat, spent, planned, budget, left: budget - spent - planned };
}
function budgetRing(b) {
  const size = 168, stroke = 18, r = (size - stroke) / 2, c = 2 * Math.PI * r, total = Math.max(b.budget, b.spent + b.planned) || 1;
  const sp = b.spent / total * c, pl = b.planned / total * c, over = b.left < 0, mid = size / 2;
  const arc = (len, off, color) => len > .5 ? `<circle cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke-width="${stroke}" style="stroke:${color}" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}"/>` : '';
  return `<div class="ring" style="width:${size}px;height:${size}px" role="img" aria-label="${money(b.spent)} spent, ${money(b.planned)} planned, ${over ? money(-b.left) + ' over budget' : money(b.left) + ' left'}">
    <svg width="${size}" height="${size}"><circle cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke-width="${stroke}" style="stroke:var(--line)"/>${arc(sp, 0, 'var(--chart-bar)')}${arc(pl, sp, 'var(--gold)')}</svg>
    <div class="txt"><b style="font-size:32px;${over ? 'color:var(--coral-ink)' : ''}">${over ? '-' : ''}${money0(Math.abs(b.left))}</b><small style="font-size:12.5px;color:var(--mute)">${over ? 'over budget' : 'left this week'}</small></div></div>`;
}
function budgetBars(b) {
  const W = 340, H = 214, top = 24, bottom = 30, n = PANTRY_CATS.length, bw = 40, gap = (W - bw * n) / (n - 1);
  const max = Math.max(1, ...PANTRY_CATS.map(c => b.byCat[c].spent + b.byCat[c].planned)), sc = (H - top - bottom) / max, base = H - bottom;
  const bars = PANTRY_CATS.map((c, i) => {
    const x = i * (bw + gap), s = b.byCat[c].spent, p = b.byCat[c].planned, sh = s * sc, ph = p * sc, tot = s + p;
    return `${sh > .5 ? `<rect x="${x}" y="${base - sh}" width="${bw}" height="${sh}" rx="7" style="fill:var(--chart-bar)"/>` : ''}
      ${ph > .5 ? `<rect x="${x}" y="${base - sh - ph - (sh > .5 ? 2 : 0)}" width="${bw}" height="${ph}" rx="7" style="fill:var(--gold)"/>` : ''}
      <text x="${x + bw / 2}" y="${base - (sh + ph) * 1 - (sh > .5 && ph > .5 ? 8 : 6)}" text-anchor="middle" font-size="12.5" font-weight="700" style="fill:var(--ink)">${money0(tot)}</text>
      <text x="${x + bw / 2}" y="${H - 9}" text-anchor="middle" font-size="12.5" style="fill:var(--mute)">${c}</text>`;
  }).join('');
  return `<svg viewBox="-10 0 ${W + 20} ${H}" role="img" aria-label="Spending by category: ${PANTRY_CATS.map(c => `${c} ${money0(b.byCat[c].spent + b.byCat[c].planned)}`).join(', ')}"><line x1="-10" x2="${W + 10}" y1="${base}" y2="${base}" style="stroke:var(--line)" stroke-width="1.5"/>${bars}</svg>`;
}
const ago = ts => { const d = Math.floor((Date.now() - ts) / DAY); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; };
const shelfLeft = (m, r) => Math.ceil((r.shelfDays || 3) - (Date.now() - m.at) / DAY);
function madeRow(m) {
  const r = byId(m.id); if (!r) return '';
  const left = shelfLeft(m, r), eaten = m.s - m.left;
  return `<button class="meal-card" data-a="openMade" data-id="${m.id}"><div class="thumb">${poster(r, true)}</div>
    <div class="mc-t"><div class="tag">Made ${ago(m.at)}</div><b>${esc(r.title)}</b><small>${eaten} of ${m.s} ${m.s === 1 ? 'serving' : 'servings'} eaten</small></div>
    <span class="chip ${left <= 1 ? 'warn' : ''}">${left <= 0 ? 'Past shelf life' : left + (left === 1 ? ' day' : ' days') + ' left'}</span></button>`;
}
function pantryToggle() {
  const p = ui.pantryTab === 'pantry';
  return `<div class="seg" role="tablist" style="margin:14px 22px 0">
    <button role="tab" data-a="pantryTab" data-v="pantry" aria-pressed="${p}">Pantry</button>
    <button role="tab" data-a="pantryTab" data-v="list" aria-pressed="${!p}">Shopping List</button></div>`;
}
function renderPantry() {
  const el = $('#screen-pantry'), sc = el.scrollTop;
  el.innerHTML = ui.pantryTab === 'list' ? shoppingListHTML() : pantryHTML();
  el.scrollTop = sc;
}
function pantryHTML() {
  // pantry stats are illustrative, derived once
  const items = 24, soon = Math.min(3, S.cart.length + 1), low = 5;
  const picks = allRecipes().filter(dietOk).sort((a, b) => matchPct(b) - matchPct(a)).slice(0, 4);
  const recent = S.made.slice().sort((a, b) => b.at - a.at).slice(0, 4);
  return `
  <div class="page-head"><span class="eyebrow">Your kitchen</span><h1 class="page-title">My Pantry</h1><p class="page-sub">Everything you have, all in one place.</p></div>
  ${pantryToggle()}
  <div class="stat-row">
    <div class="stat"><div class="k">Items</div><div class="v">${items}</div></div>
    <div class="stat soon"><div class="k">Use soon</div><div class="v">${soon}</div></div>
    <div class="stat"><div class="k">Low</div><div class="v">${low}</div></div>
  </div>
  <button class="cta-card" data-a="scan"><span class="cta-ic">${I.cam}</span><span class="cta-t"><b>Scan your fridge</b><small>Identify ingredients in seconds</small></span><span class="chev">${I.arrow}</span></button>
  <div class="section-row"><h2 class="section-title">Created recently</h2><button class="add-link" data-a="logMade">+ Log a meal</button></div>
  ${recent.length ? recent.map(madeRow).join('') : `<div class="soft-empty">Nothing cooked yet. Tap "Made it" on a recipe in your Shopping List, or log a meal yourself.</div>`}
  <div class="section-row"><h2 class="section-title">Top Matches</h2><button class="link" data-a="tab" data-v="discover">See all</button></div>
  <div class="match-grid">${picks.map(matchCard).join('')}</div>`;
}
function shoppingListHTML() {
  const b = budgetNumbers(), overSpent = b.spent > b.budget, over = b.left < 0;
  const warn = over ? `<div class="warn-banner" role="alert"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg><div><b>Over budget</b><span>${overSpent ? `You've already spent ${money(b.spent)}, which is ${money(b.spent - b.budget)} over your ${money0(b.budget)} weekly budget.` : `Your list puts you ${money(-b.left)} over your ${money0(b.budget)} weekly budget. Remove or swap a few items to stay on track.`}</span></div></div>` : '';
  const groups = PANTRY_CATS.map(cat => {
    const rows = b.items.filter(i => i.cat === cat); if (!rows.length) return '';
    return `<h3 class="cat-head">${cat}<span>${money(rows.reduce((a, i) => a + i.price, 0))}</span></h3><ul class="shop-list">${rows.map(i => `<li class="shop-item${i.checked ? ' done' : ''}"><label><input type="checkbox" data-a="checkItem" data-src="${i.src}" data-id="${i.id}" data-k="${i.k}" ${i.checked ? 'checked' : ''}><span class="si-main"><span class="si-name">${esc(i.name)}</span><span class="si-sub">${[i.qty, i.recipe].filter(Boolean).map(esc).join(' · ') || 'Added by you'}</span></span><span class="si-price">${money(i.price)}</span></label>${i.src === 'x' ? `<button class="si-x" data-a="rmExtra" data-id="${i.id}" aria-label="Remove ${esc(i.name)}">&times;</button>` : ''}</li>`).join('')}</ul>`;
  }).join('');
  const recipes = S.cart.map(c => { const r = byId(c.id); if (!r) return ''; return `<div class="cart-row"><div class="thumb">${poster(r, true)}</div><div class="cr-main"><b>${esc(r.title)}</b><div class="cr-actions">${stepper('cart', c.id, c.s)}<button class="made-btn" data-a="markMade" data-id="${c.id}">Made it</button></div></div><button class="si-x" data-a="rmCart" data-id="${c.id}" aria-label="Remove ${esc(r.title)} from list">&times;</button></div>`; }).join('');
  return `
  <div class="page-head"><span class="eyebrow">This week</span><h1 class="page-title">Shopping List</h1><p class="page-sub">Plan it, check it off, stay on budget.</p></div>
  ${pantryToggle()}
  <button class="receipt-btn" data-a="scanReceipt">${I.cam}<span>Scan receipt</span></button>
  ${warn}
  <section class="budget-card" aria-label="Weekly budget">
    <div class="bc-head"><h2 class="section-title">Weekly budget</h2><button class="link" data-a="editBudget">${money0(b.budget)} · Edit</button></div>
    <div class="bc-body">${budgetRing(b)}
      <ul class="bc-legend">
        <li><i style="background:var(--chart-bar)"></i><div><b>${money(b.spent)}</b><span>Spent</span></div></li>
        <li><i style="background:var(--gold)"></i><div><b>${money(b.planned)}</b><span>Planned</span></div></li>
        <li><i style="background:var(--line)"></i><div><b style="${over ? 'color:var(--coral-ink)' : ''}">${over ? '-' : ''}${money(Math.abs(b.left))}</b><span>${over ? 'Over' : 'Left'}</span></div></li>
      </ul></div>
  </section>
  <section class="budget-card" aria-label="Budget by category">
    <div class="bc-head"><h2 class="section-title">By category</h2><span class="bc-key"><i style="background:var(--chart-bar)"></i>Spent<i style="background:var(--gold)"></i>Planned</span></div>
    ${budgetBars(b)}
  </section>
  ${recipes ? `<div class="section-row"><h2 class="section-title">Recipes on your list</h2></div><div class="cart-rows">${recipes}</div>` : ''}
  <div class="section-row"><h2 class="section-title">Checklist</h2><button class="add-link" data-a="addItem">+ Add item</button></div>
  ${groups || `<div class="soft-empty">Your list is empty. Tap the basket on any recipe in Discover, or add an item yourself.</div>`}`;
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
      ${days.map((d, i) => { const bh = (d.v / max) * (H - 40), x = i * (bw + gap); return `<rect x="${x}" y="${H - 26 - bh}" width="${bw}" height="${bh}" rx="8" style="fill:${d.today ? 'var(--coral)' : 'var(--chart-bar)'}"/><text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="13" style="fill:var(--mute)" font-family="Figtree">${d.l}</text>`; }).join('')}
      <line x1="0" x2="${W}" y1="${gy}" y2="${gy}" style="stroke:var(--gold)" stroke-width="2" stroke-dasharray="5 5"/><text x="${W}" y="${gy - 6}" text-anchor="end" font-size="12" style="fill:var(--coral-ink)" font-family="Figtree" font-weight="600">goal ${S.goal}</text></svg></div>
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
  <button class="big-btn alt" data-a="cart" data-id="${r.id}">Add ingredients to Shopping List</button>`;
}
function reelHTML(r) {
  const liked = S.liked.includes(r.id), saved = S.collections.some(c => c.ids.includes(r.id)), s = ui.reelServ[r.id] || r.servings || 2, p = per(r);
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
  <div class="pane info" aria-label="Nutrition"><div class="pane-scroll"><h2>${esc(r.title)}</h2><p class="sub">Nutrition per serving</p><div class="pie-wrap">${pie(r)}</div>
    <ul class="legend">${MACROS.map(([n, k, c]) => `<li><i style="background:${c}"></i><div><b>${Math.round(p[k])} g</b><span>${n}</span></div></li>`).join('')}</ul>
    <p class="sub" style="margin-top:16px">Sodium ${Math.round(p.sodium_mg)} mg · sugar ${Math.round(p.sugar_g)} g</p>
    <button class="big-btn" data-a="logFromReel" data-id="${r.id}">Log a serving</button><p class="log-note" data-log-note="${r.id}" role="status">${logNote(r.id)}</p></div><button class="edge r" data-a="pane" data-p="1">Video</button></div>
  <div class="pane video">${poster(r)}${r.videoUrl ? `<video src="${r.videoUrl}" loop muted playsinline preload="auto" data-a="vid"></video>` : ''}<div class="shade"></div>
    ${!r.videoUrl && S.uploaded.some(x => x.id === r.id) ? `<div class="vid-note" role="status">The video file isn't saved for this post. Upload it again to play it.</div>` : ''}
    ${r.videoUrl ? `<button class="snd" data-a="sound" aria-label="${ui.sound ? 'Mute' : 'Unmute'} video" aria-pressed="${!!ui.sound}">${sndHTML()}</button>` : ''}
    <button class="edge l" data-a="pane" data-p="0">Nutrition</button><button class="edge r" data-a="pane" data-p="2">Recipe</button>
    <div class="caption">
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
      <div class="r-avatar">${initial}${following ? '' : `<button class="plus" data-a="follow" data-id="${r.id}" aria-label="Follow">+</button>`}</div>
      <button data-a="like" data-id="${r.id}" aria-pressed="${liked}" aria-label="Like"><span class="ic heart">${I.heart}</span><span class="n">${fmtK((r.likes || 0) + (liked ? 1 : 0))}</span></button>
      <button data-a="comments" data-id="${r.id}" aria-label="Comments"><span class="ic">${I.chat}</span><span class="cn">${cmts}</span></button>
      <button class="save" data-a="saveSheet" data-id="${r.id}" aria-pressed="${saved}" aria-label="Save"><span class="ic">${I.mark}</span><span>${fmtK(1200)}</span></button>
      <button data-a="shareSheet" data-id="${r.id}" aria-label="Share"><span class="ic">${I.share}</span><span>Share</span></button></div>
    </div>
  <div class="pane info" aria-label="Recipe" data-recipe="${r.id}"><div class="pane-scroll">${recipePane(r, s)}</div><button class="edge l" data-a="pane" data-p="1">Video</button></div>
  </div></article>`;
}
const fmtK = n => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
const dotsHTML = '<div class="dots"><i></i><i class="on"></i><i></i></div>';
function feedHTML(list) { return `<div class="feed">${list.map(reelHTML).join('')}</div>${dotsHTML}`; }
/* Only one video may play at a time, and only while its reel is on screen and showing the video pane. */
let syncQueued = false;
function scheduleSync() { if (syncQueued) return; syncQueued = true; requestAnimationFrame(() => { syncQueued = false; syncVideos(); }); }
function stopVideos(root) { $$('video', root).forEach(v => { try { v.pause(); v.muted = true; v.removeAttribute('src'); v.load(); } catch (e) {} }); }
function refreshSndButtons() {
  $$('.snd').forEach(b => { b.innerHTML = sndHTML(); b.setAttribute('aria-label', (ui.sound ? 'Mute' : 'Unmute') + ' video'); b.setAttribute('aria-pressed', ui.sound); });
}
function syncVideos() {
  const viewer = $('#viewer'), root = !viewer.hidden ? viewer : ($('#phone').dataset.tab === 'discover' ? $('#screen-discover') : null);
  let target = null;
  const feed = root && $('.feed', root);
  if (feed && !document.hidden) {
    const fr = feed.getBoundingClientRect(); let best = null, bestOv = 0;
    $$('.reel', root).forEach(reel => {
      const b = reel.getBoundingClientRect(), ov = Math.max(0, Math.min(b.bottom, fr.bottom) - Math.max(b.top, fr.top));
      if (ov > bestOv) { bestOv = ov; best = reel; }
      // a reel that has fully left the screen goes back to its video pane, so scrolling on always lands on the main video
      const p = $('.pager', reel); if (ov <= 1 && p && p.clientWidth && Math.abs(p.scrollLeft - p.clientWidth) > 1) p.scrollLeft = p.clientWidth;
    });
    if (best && bestOv >= fr.height * .55) {
      const p = $('.pager', best);
      if (p && Math.round(p.scrollLeft / (p.clientWidth || 1)) === 1) target = $('video', best);
    }
  }
  $$('video').forEach(v => {
    const on = v === target;
    if (!on) delete v.dataset.userPaused;
    v.muted = !(on && ui.sound);
    if (on) {
      if (v.paused && !v.dataset.userPaused) {
        const p = v.play();
        if (p && p.catch) p.catch(() => { if (ui.sound) { ui.sound = false; v.muted = true; refreshSndButtons(); v.play().catch(() => {}); } });
      }
    } else if (!v.paused) v.pause();
  });
}
document.addEventListener('visibilitychange', syncVideos);
function mountFeed(root) {
  const pagers = $$('.pager', root), feed = $('.feed', root);
  $$('video', root).forEach(v => { v.muted = true; });
  pagers.forEach(p => { p.scrollLeft = p.clientWidth; p.addEventListener('scroll', () => {
    const i = Math.round(p.scrollLeft / (p.clientWidth || 1)); $$('.dots i', root).forEach((d, k) => d.classList.toggle('on', k === i));
    scheduleSync();
  }, { passive: true }); });
  if (feed) {
    feed.addEventListener('scroll', () => { $$('.dots i', root).forEach((d, k) => d.classList.toggle('on', k === 1)); scheduleSync(); }, { passive: true });
    const io = new IntersectionObserver(scheduleSync, { root: feed, threshold: [0, .25, .5, .6, .75, 1] });
    $$('.reel', root).forEach(r => io.observe(r));
  }
  scheduleSync(); setTimeout(syncVideos, 150); setTimeout(syncVideos, 600);
}
const PROTEIN_RULES = [['chicken', /\b(chicken|turkey)/], ['beef', /\b(beef|ribeye|steak|brisket)/], ['pork', /\b(pork|bacon|sausage)|\bham\b/], ['seafood', /\b(fish|salmon|shrimp|tuna|cod|crab|prawn)/]];
const proteinTags = r => {
  const hay = [r.title, ...r.ingredients.map(i => i.name)].join(' ').toLowerCase();
  return PROTEIN_RULES.filter(([, re]) => re.test(hay)).map(([k]) => k);
};
/* Diet rules read the ingredient list. Plant milks, nut butters and similar are removed first so they don't count as dairy. */
const MEAT_RE = /\b(chicken|turkey|beef|ribeye|steak|brisket|pork|bacon|sausage|lamb|veal|duck|meatball|gelatin)|\b(ham|lard)\b/;
const FISH_RE = /\b(fish|salmon|shrimp|tuna|cod|crab|prawn|anchov|sardine|mackerel|squid|clam|mussel|oyster|bonito|dashi)|\bscallops?\b/;
const ANIMAL_RE = /\b(egg|milk|cheese|parmesan|mozzarella|butter|cream|yogurt|yoghurt|honey|ghee|whey|mayo|mayonnaise)/;
const plantOnly = n => n.toLowerCase().replace(/\b(coconut|oat|almond|soy|rice|cashew|nut|peanut|cocoa|shea|plant)[ -]?(milk|cream|butter|yogurt|cheese)/g, '');
function dietsOf(r) {
  const text = [r.title, ...r.ingredients.map(i => i.name)].map(plantOnly).join(' | ');
  const meat = MEAT_RE.test(text), fish = FISH_RE.test(text), animal = ANIMAL_RE.test(text), out = [];
  if (!meat) out.push('Pescatarian');
  if (!meat && !fish) out.push('Vegetarian');
  if (!meat && !fish && !animal) out.push('Vegan');
  return out;
}
const followsDiets = (r, diets) => diets.every(d => dietsOf(r).includes(d));
const profileDiets = () => preferenceSelections('diets');
const myDietOn = () => profileDiets().length > 0 && !ui.fl.ignoreDiet;
/* The profile diet is a universal default filter. Your own uploads are exempt so a new post never vanishes. */
const dietOk = r => !myDietOn() || S.uploaded.some(x => x.id === r.id) || followsDiets(r, profileDiets());
const FILTER_PROTEINS = [['chicken', 'Chicken'], ['beef', 'Beef'], ['pork', 'Pork'], ['seafood', 'Seafood']];
const FILTER_PRICES = [[0, 'Any'], [3, 'Under $3'], [4, 'Under $4'], [5, 'Under $5']];
const FILTER_TIMES = [[0, 'Any'], [20, 'Up to 20 min'], [25, 'Up to 25 min'], [30, 'Up to 30 min']];
const activeFilterCount = () => ui.fl.proteins.length + ui.fl.diets.length + (ui.fl.maxPrice ? 1 : 0) + (ui.fl.maxTime ? 1 : 0);
const searchHay = r => [r.title, r.creator, ...(r.tags || []), ...r.ingredients.map(i => i.name)].join(' ').toLowerCase();
const matchesQuery = (r, q) => q.trim().toLowerCase().split(/\s+/).filter(Boolean).every(t => searchHay(r).includes(t));
function filtered() {
  const f = ui.fl;
  return allRecipes().filter(r => matchesQuery(r, ui.filter) && dietOk(r)
    && (!f.proteins.length || f.proteins.some(p => proteinTags(r).includes(p)))
    && (!f.diets.length || followsDiets(r, f.diets))
    && (!f.maxPrice || parseFloat(priceOf(r)) <= f.maxPrice)
    && (!f.maxTime || cookMin(r) <= f.maxTime));
}
function filterSheetHTML() {
  const f = ui.fl, n = filtered().length, mine = profileDiets();
  const chips = (list, isOn, act) => list.map(([v, lab]) => `<button class="fchip" data-a="${act}" data-v="${v}" aria-pressed="${isOn(v)}">${lab}</button>`).join('');
  const myDiet = mine.length
    ? `<button class="pref-switch" role="switch" aria-checked="${!f.ignoreDiet}" data-a="toggleMyDiet"><span>Apply my profile diet<small class="ps-sublabel">${esc(mine.join(', '))}</small></span><span class="switch" aria-hidden="true"></span></button>`
    : `<p class="sheet-note">Pick a diet in Profile, then Preferences, and it will filter your feed automatically.</p>`;
  return `<h3>Filter videos</h3>${myDiet}
    <div class="f-group"><h4>Diet</h4><div class="fchips">${chips(DIET_OPTIONS.map(d => [d, d]), v => f.diets.includes(v), 'fDiet')}</div></div>
    <div class="f-group"><h4>Protein</h4><div class="fchips">${chips(FILTER_PROTEINS, v => f.proteins.includes(v), 'fProtein')}</div></div>
    <div class="f-group"><h4>Cost per serving</h4><div class="fchips">${chips(FILTER_PRICES, v => f.maxPrice === +v, 'fPrice')}</div></div>
    <div class="f-group"><h4>Time to cook</h4><div class="fchips">${chips(FILTER_TIMES, v => f.maxTime === +v, 'fTime')}</div></div>
    <div class="row2" style="margin-top:20px"><button class="ghost-btn" data-a="resetFilters" style="margin:0;flex:1" ${activeFilterCount() ? '' : 'disabled style="margin:0;flex:1;opacity:.45"'}>Reset</button>
    <button class="big-btn" data-a="closeSheet" style="flex:2;margin:0">${n ? `Show ${n} ${n === 1 ? 'video' : 'videos'}` : 'No matches'}</button></div>`;
}
const SEARCH_COPY = {
  discover: ['Search videos', 'Search recipes, ingredients or creators'],
  nutrition: ['Find a meal to log', 'Search recipes'],
  cookbooks: ['Search your cookbooks', 'Search cookbooks or saved recipes']
};
function openSearch(scope) {
  const [title, ph] = SEARCH_COPY[scope], start = scope === 'discover' ? ui.filter : '';
  openSheet(`<h3>${title}</h3><div class="sbar">${I.search}<input type="search" id="sq" placeholder="${ph}" value="${esc(start)}" autocomplete="off" aria-label="${ph}"><button class="sclear" data-a="clearSearch" aria-label="Clear search">&times;</button></div><div id="sres" aria-live="polite"></div>`,
    b => { const q = $('#sq', b); q.addEventListener('input', () => runSearch(scope, q.value)); runSearch(scope, q.value); q.focus(); });
}
function recipeRow(r, act, extra = '') {
  return `<button class="opt" data-a="${act}" data-id="${r.id}" ${extra}><div class="thumb">${poster(r, true)}</div><div class="o-t">${esc(r.title)}<small>${cookMin(r)} min · $${priceOf(r)} / serving${r.creator ? ' · @' + esc(r.creator) : ''}</small></div></button>`;
}
function runSearch(scope, raw) {
  const q = raw.trim(), host = $('#sres'); if (!host) return;
  const clear = $('.sclear'); if (clear) clear.style.visibility = raw ? 'visible' : 'hidden';
  if (scope === 'discover') {
    ui.filter = raw; renderAppbar('discover'); renderFeed();
    const list = filtered();
    host.innerHTML = !q ? `<p class="sheet-note">Type to filter the feed. Your diet and filters still apply.</p>`
      : list.length ? `${list.slice(0, 6).map(r => recipeRow(r, 'searchOpen')).join('')}<button class="big-btn" data-a="closeSheet" style="width:100%;margin:14px 0 0">Show ${list.length} ${list.length === 1 ? 'video' : 'videos'} in feed</button>`
      : `<p class="sheet-note">Nothing matches "${esc(q)}".${myDietOn() ? ' Your profile diet may be hiding some results.' : ''}</p>`;
  } else if (scope === 'nutrition') {
    const meal = guessMeal(), made = new Set(S.made.map(m => m.id));
    const list = allRecipes().filter(r => matchesQuery(r, q)).sort((a, b) => (made.has(b.id) - made.has(a.id))).slice(0, 8);
    host.innerHTML = list.length ? `<p class="sheet-note">Tap a meal to log one serving to ${meal}.</p>${list.map(r => recipeRow(r, 'logPick', `data-meal="${meal}"`).replace('</small>', ` · ${Math.round(per(r).calories)} kcal</small>`)).join('')}` : `<p class="sheet-note">Nothing matches "${esc(q)}".</p>`;
  } else {
    const ql = q.toLowerCase(), colls = S.collections.filter(c => !q || c.name.toLowerCase().includes(ql));
    const hits = q ? allRecipes().filter(r => matchesQuery(r, q)).map(r => [r, S.collections.find(c => c.ids.includes(r.id))]).filter(([, c]) => c) : [];
    host.innerHTML = (colls.length ? `<h4 class="s-head">Cookbooks</h4>${colls.map(c => `<button class="opt" data-a="searchColl" data-id="${c.id}"><div class="o-t">${esc(c.name)}<small>${c.ids.length} ${c.ids.length === 1 ? 'recipe' : 'recipes'}</small></div></button>`).join('')}` : '')
      + (hits.length ? `<h4 class="s-head">Saved recipes</h4>${hits.slice(0, 8).map(([r, c]) => `<button class="opt" data-a="searchColl" data-id="${c.id}" data-rid="${r.id}"><div class="thumb">${poster(r, true)}</div><div class="o-t">${esc(r.title)}<small>In ${esc(c.name)}</small></div></button>`).join('')}` : '')
      || `<p class="sheet-note">Nothing matches "${esc(q)}".</p>`;
  }
}
function openEditColl(id, draft) {
  const c = S.collections.find(x => x.id === id); if (!c) return;
  const rows = c.ids.map(byId).filter(Boolean).map(r => `<div class="ec-row"><div class="thumb">${poster(r, true)}</div><span>${esc(r.title)}</span><button class="si-x" data-a="collRemove" data-id="${c.id}" data-rid="${r.id}" aria-label="Remove ${esc(r.title)} from ${esc(c.name)}">&times;</button></div>`).join('');
  openSheet(`<h3>Edit cookbook</h3><label class="name-field" style="margin-top:0">Name<input type="text" id="ec-name" maxlength="24" value="${esc(draft ?? c.name)}" aria-label="Cookbook name"></label>
    <div class="f-group"><h4>Recipes (${c.ids.length})</h4>${rows || '<p class="sheet-note">No recipes yet. Save recipes from Discover to fill this cookbook.</p>'}</div>
    <button class="big-btn" data-a="saveColl" data-id="${c.id}" style="width:100%;margin:14px 0 0">Save changes</button>
    <button class="ghost-btn" data-a="askDeleteColl" data-id="${c.id}" style="color:var(--coral-ink);border-color:var(--coral)">Delete cookbook</button>`);
}
function syncSaveIcons() {
  $$('.rail .save').forEach(b => b.setAttribute('aria-pressed', S.collections.some(c => c.ids.includes(b.dataset.id))));
}
function applyFilters() {
  if ($('#sheet') && !$('#sheet').hidden && $('.f-group', $('#sheet-body'))) $('#sheet-body').innerHTML = filterSheetHTML();
  renderAppbar('discover'); renderFeed();
}
let reelsBuilt = false;
function renderDiscover(force) {
  const el = $('#screen-discover');
  if (!reelsBuilt) { el.innerHTML = `<div id="feedhost"></div>`; reelsBuilt = true; force = true; }
  if (force) renderFeed();
}
function renderFeed() {
  const host = $('#feedhost'), list = filtered();
  stopVideos(host);
  host.style.height = '100%';
  host.innerHTML = list.length ? feedHTML(list) : `<div class="empty" style="color:#9DB98C;padding-top:200px"><b style="color:#fff">No videos match</b>${myDietOn() ? `Your profile diet (${esc(profileDiets().join(', '))}) is hiding some recipes.<br>` : ''}Try loosening a filter.${activeFilterCount() || ui.filter.trim() ? `<button class="big-btn alt" data-a="resetFilters" style="display:block;width:auto;margin:18px auto 0;padding:13px 22px">Clear filters</button>` : ''}${myDietOn() ? `<button class="ghost-btn" data-a="toggleMyDiet" style="display:block;width:auto;margin:10px auto 0;padding:12px 20px;color:#fff;border-color:rgba(255,255,255,.4)">Turn off my diet filter</button>` : ''}</div>`;
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
  ${feat ? `<div class="feat-wrap"><button class="featured" data-a="openColl" data-id="${feat.id}">${featR ? poster(featR, true) : ''}<div class="f-body"><span class="eyebrow">Featured collection</span><h3>${esc(feat.name)}</h3><small>${feat.ids.length} ${feat.ids.length === 1 ? 'recipe' : 'recipes'}</small></div></button><button class="tile-menu" data-a="editColl" data-id="${feat.id}" aria-label="Edit ${esc(feat.name)}">${I.pencil}</button></div>` : ''}
  <div class="section-row"><h2 class="section-title">Your collections</h2><button class="link" data-a="newColl">+ Create</button></div>
  ${S.collections.length ? '' : `<div class="soft-empty">No cookbooks yet. Tap + Create to start one, or save a recipe from Discover.</div>`}
  <div class="grid2">${S.collections.map(c => { const r = byId(c.ids[0]); return `<div class="tile-wrap"><button class="tile ${r ? '' : 'empty-t'}" data-a="openColl" data-id="${c.id}"><div class="t-media">${r ? poster(r, true) : ''}</div><b>${esc(c.name)}</b><small>${c.ids.length} ${c.ids.length === 1 ? 'recipe' : 'recipes'}</small></button><button class="tile-menu" data-a="editColl" data-id="${c.id}" aria-label="Edit ${esc(c.name)}">${I.pencil}</button></div>`; }).join('')}</div>`;
}
function openViewer(title, ids, startId) {
  const list = ids.map(byId).filter(Boolean), v = $('#viewer');
  stopVideos(v);
  v.hidden = false; $('#phone').classList.add('viewing');
  v.innerHTML = list.length ? `<button class="back-fab" data-a="closeViewer" aria-label="Back">${I.back}</button>${title ? `<div class="viewer-title">${esc(title)}</div>` : ''}${feedHTML(list)}`
    : `<button class="back-fab" data-a="closeViewer" aria-label="Back">${I.back}</button><div class="viewer-title">${esc(title)}</div><div class="empty" style="color:#9DB98C;padding-top:240px"><b style="color:#fff">Empty for now</b>Save recipes from Discover and they land here.</div>`;
  if (list.length) { mountFeed(v); if (startId) { const t = $(`.reel[data-id="${startId}"]`, v); t && t.scrollIntoView(); } }
}

/* ---------- profile ---------- */
const PREFS = [['budget', 'Grocery budget']];
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
function themeRow() {
  const dark = currentTheme() === 'dark';
  return `<button class="pref-switch" role="switch" aria-checked="${dark}" data-a="toggleTheme"><span>Dark mode</span><span class="ps-sub">${dark ? 'On' : 'Off'}</span><span class="switch" aria-hidden="true"></span></button>`;
}
function renderProfile() {
  const el = $('#screen-profile'), t = ui.profTab, mine = S.uploaded;
  const saved = new Set(S.collections.flatMap(c => c.ids)).size + S.liked.length;
  const tabs = [['posts', I.grid], ['upload', I.plus], ['reposts', I.repost], ['prefs', I.note]];
  let body = '';
  if (t === 'posts') body = mine.length ? `<div class="grid3">${mine.map(r => `<div class="post-tile"><button class="open" data-a="openPost" data-id="${r.id}">${poster(r, true)}<small>${esc(r.title)}</small></button><button class="del" data-a="askDelete" data-id="${r.id}" aria-label="Delete ${esc(r.title)}">${I.trash}</button></div>`).join('')}</div>` : `<div class="empty"><b>No posts yet</b>Upload a cooking video with the plus tab and it becomes a recipe.</div>`;
  if (t === 'reposts') { const ids = [...new Set([...S.liked, ...S.reposts])]; body = `<div class="grid3">${ids.map(byId).filter(Boolean).map(r => `<button data-a="openPost" data-id="${r.id}" data-from="liked">${poster(r, true)}<small>${esc(r.title)}</small></button>`).join('')}</div>`; }
  if (t === 'prefs') body = `<div class="pref-list">${themeRow()}${preferenceDropdown('diets', 'Diets', DIET_OPTIONS)}${preferenceDropdown('allergies', 'Allergies', ALLERGY_OPTIONS)}${PREFS.map(([k, lab]) => `<button class="pref" data-a="editPref" data-k="${k}">${esc(lab)}<span class="chev">${I.arrow}</span></button>`).join('')}</div>`;
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
  return `<div class="up"><label class="drop" id="drop"><b>Drop a cooking video</b><span>${u.video ? esc(u.video.name) : 'or tap to choose a file'}</span><input type="file" id="vid" accept=".mp4,.webm,video/mp4,video/webm"></label>
  <p class="fmt-hint">MP4 or WebM only, so your video plays on every device.</p>
  ${u.fileError ? `<div class="note err" role="alert">${esc(u.fileError)}</div>` : ''}
  ${u.playWarn ? `<div class="note err">This browser can't play that video, so your post would only show artwork. Convert it to MP4 (H.264) or WebM and choose it again. You can still turn it into a recipe.</div>` : ''}
  <div class="file-line"><span>Captions (optional): <b>${u.captions ? esc(u.captions.name) : 'none'}</b></span><label class="small-link" style="cursor:pointer">Add .srt or .vtt<input type="file" id="cap" accept=".srt,.vtt" hidden></label></div>
  <label class="name-field">Video name<input type="text" id="post-title" maxlength="80" value="${esc(u.title || '')}" placeholder="Name your video" ${running ? 'disabled' : ''}><span>Becomes the recipe title on Discover and in your profile. Leave blank to use the generated title.</span></label>
  <label class="post-caption">Post caption (optional)<textarea id="post-caption" placeholder="Add a note about this recipe..." aria-label="Post caption" ${running ? 'disabled' : ''}>${esc(u.caption || '')}</textarea><span>Shown with your video on Discover. Leave blank to use the recipe summary.</span></label>
  <button class="big-btn alt" data-a="process" ${u.video && !running ? '' : 'disabled style="opacity:.4"'}>${running ? 'Working' : 'Turn it into a recipe'}</button>
  ${u.state ? `<ul class="stages">${STAGES.map(([k, l], i) => `<li class="${u.state === 'done' || i < idx ? 'done' : i === idx ? 'run' : ''}"><i></i>${l}</li>`).join('')}</ul>` : ''}
  ${u.error ? `<div class="note err" role="alert">${esc(u.error)}</div>` : ''}${u.demo ? `<div class="note err" role="alert"><b>These ingredients are a sample, not from your video.</b> Nourish could not reach the server at ${esc(Api.base())}${u.demoReason ? ' (' + esc(u.demoReason) + ')' : ''}. Start the API with uvicorn, or <a class="small-link" href="#" data-a="apiUrl">change the URL</a>. If the site is on https, the server must be https too and must allow this site in CORS_ORIGINS.</div>` : ''}
  ${u.result ? resultHTML(u.result) : ''}</div>`;
}
function resultHTML(r) {
  const p = per(r), u = ui.up || {}, f = r.servings ? 1 : 1;
  const hasNutri = (r.nutrition_total.calories || 0) > 0;
  const ings = r.ingredients.map(i => { const t = ingText(i, f); return `<li><span class="qty">${esc(t.qty) || '&nbsp;'}</span><span>${esc(t.name)}</span></li>`; }).join('');
  const warn = (u.warnings || []).map(w => `<li>${esc(w)}</li>`).join('');
  const stub = (r.tags || []).includes('stub');
  return `<div class="result"><label class="name-field"><span style="display:inline">Video name</span><input type="text" id="result-title" maxlength="80" value="${esc(r.title)}" aria-label="Video name"></label>
  ${stub || warn ? `<div class="note${stub ? ' err' : ''}" role="alert" style="margin:0 0 12px">${stub ? '<b>This is a placeholder recipe.</b> ' : ''}${warn ? `The server reported:<ul class="warn-list">${warn}</ul>` : 'The server could not read this video.'}</div>` : ''}
  <p>${r.ingredients.length} ${r.ingredients.length === 1 ? 'ingredient' : 'ingredients'}, ${r.steps.length} ${r.steps.length === 1 ? 'step' : 'steps'}, serves ${r.servings}. ${hasNutri ? `About ${Math.round(p.calories)} kcal and ${Math.round(p.protein_g)} g protein per serving (estimated).` : 'Nutrition could not be estimated.'}</p>
  ${ings ? `<ul class="res-ings">${ings}</ul>` : ''}
  <div class="row"><button class="big-btn" data-a="postIt">Post to Discover</button></div></div>`;
}
const prettyName = n => { const s = String(n || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim(); return s ? s[0].toUpperCase() + s.slice(1) : ''; };
const VIDEO_EXTS = ['mp4', 'webm'], VIDEO_MIMES = ['video/mp4', 'video/webm'];
function videoFileProblem(f) {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if (!VIDEO_EXTS.includes(ext) || (f.type && !VIDEO_MIMES.includes(f.type))) {
    const what = ext && ext !== f.name.toLowerCase() ? `.${ext} files aren't` : "That file type isn't";
    return `${what} supported. Please choose an MP4 or WebM video, which play on almost every phone, tablet and computer.`;
  }
  return '';
}
function chooseVideo(f) {
  if (!f) return;
  const u = ui.up || {};
  const problem = videoFileProblem(f);
  if (problem) { ui.up = { ...u, fileError: problem }; renderProfile(); return; }
  ui.up = { ...u, video: f, fileError: '', playWarn: false, title: u.titleEdited ? u.title : prettyName(f.name) };
  renderProfile();
  const probe = document.createElement('video'), url = URL.createObjectURL(f);
  probe.preload = 'metadata'; probe.muted = true;
  probe.onloadedmetadata = () => URL.revokeObjectURL(url);
  probe.onerror = () => { URL.revokeObjectURL(url); if (ui.up && ui.up.video === f) { ui.up.playWarn = true; renderProfile(); } };
  probe.src = url;
}
function bindUpload(el) {
  const v = $('#vid', el), c = $('#cap', el), d = $('#drop', el), caption = $('#post-caption', el);
  v && v.addEventListener('change', () => chooseVideo(v.files[0]));
  c && c.addEventListener('change', () => { ui.up = { ...(ui.up || {}), captions: c.files[0] }; renderProfile(); });
  caption && caption.addEventListener('input', () => { ui.up = { ...(ui.up || {}), caption: caption.value }; });
  const title = $('#post-title', el), rtitle = $('#result-title', el);
  title && title.addEventListener('input', () => { ui.up = { ...(ui.up || {}), title: title.value, titleEdited: true }; });
  rtitle && rtitle.addEventListener('input', () => { if (ui.up && ui.up.result) ui.up.result.title = rtitle.value; });
  if (d) { ['dragover', 'dragenter'].forEach(e => d.addEventListener(e, ev => { ev.preventDefault(); d.classList.add('over'); })); ['dragleave', 'drop'].forEach(e => d.addEventListener(e, () => d.classList.remove('over')));
    d.addEventListener('drop', ev => { ev.preventDefault(); const f = ev.dataTransfer.files[0]; if (f) chooseVideo(f); }); }
}
function toRecipe(res, file, caption, title) {
  const r = res.recipe, id = 'up-' + Date.now().toString(36), pals = SEED_RECIPES.map(x => x.palette);
  return {
    id, title: (title || '').trim() || r.title, creator: 'mayamakes', summary: r.summary, caption: (caption || '').trim() || r.summary || '', servings: r.servings || 2, shelfDays: 3, likes: 0,
    tags: r.tags || [], minutes: ((r.prep_time_min || 0) + (r.cook_time_min || 0)) || undefined, palette: pals[hash(id) % pals.length], videoUrl: file ? URL.createObjectURL(file) : undefined,
    ingredients: (r.ingredients || []).map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit || '', note: i.note })),
    steps: r.steps || [], nutrition_total: Object.fromEntries(['calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g', 'sugar_g', 'sodium_mg'].map(k => [k, Number((r.nutrition_total || {})[k]) || 0]))
  };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function process() {
  const u = ui.up; u.state = 'running'; u.stage = STAGES[0][0]; u.error = null; u.demo = false; u.warnings = []; u.result = null; renderProfile();
  try {
    const { job_id } = await Api.upload(u.video, u.captions);
    for (;;) {
      await wait(1000); const s = await Api.status(job_id);
      if (s.current_stage) u.stage = s.current_stage;
      if (s.status === 'failed') throw Object.assign(new Error(s.error || 'Processing failed'), { server: true });
      if (s.status === 'completed') break;
      renderProfile();
    }
    const raw = await Api.result(job_id);
    u.warnings = raw.warnings || [];
    u.result = toRecipe(raw, u.video, u.caption, u.title); u.state = 'done';
  } catch (e) {
    if (e.server) { u.state = null; u.error = e.message; }
    else {
      u.demo = true; u.demoReason = (e && e.message) || '';
      for (const [k] of STAGES) { u.stage = k; renderProfile(); await wait(550); }
      const name = u.video.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      u.result = toRecipe({ recipe: { title: name ? name[0].toUpperCase() + name.slice(1) : 'Untitled recipe', summary: 'Processed from your upload.', servings: 2, tags: ['new'],
        ingredients: [{ name: 'olive oil', quantity: 2, unit: 'tbsp' }, { name: 'garlic cloves', quantity: 3, unit: '' }, { name: 'tomatoes', quantity: 4, unit: '' }, { name: 'pasta', quantity: 200, unit: 'g' }],
        steps: [{ number: 1, instruction: 'Sample step from the stub pipeline.' }, { number: 2, instruction: 'Serve warm.' }],
        nutrition_total: { calories: 820, protein_g: 24, fat_g: 28, carbs_g: 110, fiber_g: 8, sugar_g: 12, sodium_mg: 900 } } }, u.video, u.caption, u.title);
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
    if (ctx === 'cart') { const c = S.cart.find(x => x.id === id); if (c) { c.s = Math.max(1, Math.min(24, c.s + d)); save(); renderPantry(); } return; }
    if (ctx === 'reel') {
      const r = byId(id), s = Math.max(1, Math.min(24, (ui.reelServ[id] || r.servings || 2) + d)); ui.reelServ[id] = s;
      $$(`[data-recipe="${id}"] .pane-scroll`).forEach(p => { const sc = p.scrollTop; p.innerHTML = recipePane(r, s); p.scrollTop = sc; });
    }
  },
  pane(el) { const p = el.closest('.pager'); p.scrollTo({ left: +el.dataset.p * p.clientWidth, behavior: 'smooth' }); },
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
  vid: el => { if (el.paused) { delete el.dataset.userPaused; el.play().catch(() => {}); } else { el.dataset.userPaused = '1'; el.pause(); } },
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
      <div class="row2"><input type="text" id="sh" value="nourish.app/r/${esc(r.id)}" readonly aria-label="Share link"><button class="big-btn" data-a="copyShare" style="flex:none;padding:0 20px">Copy</button></div>`);
  },
  copyShare() { const v = $('#sh'); v.select(); try { document.execCommand('copy'); } catch (e) {} closeSheet(); toast('Link copied'); },
  saveSheet(el) {
    const id = el.dataset.id;
    openSheet(`<h3>Save to</h3>${S.collections.map(c => `<button class="opt" data-a="toggleColl" data-id="${id}" data-c="${c.id}"><div class="o-t">${esc(c.name)}<small>${c.ids.length} recipes</small></div><span class="tick ${c.ids.includes(id) ? 'on' : ''}"></span></button>`).join('')}<button class="opt" data-a="newColl" data-rid="${id}"><div class="o-t" style="color:var(--coral-ink)">+ New cookbook</div></button><button class="big-btn" data-a="closeSheet" style="margin:16px 0 0">Done</button>`);
  },
  toggleColl(el) {
    const c = S.collections.find(x => x.id === el.dataset.c), id = el.dataset.id, i = c.ids.indexOf(id); i < 0 ? c.ids.push(id) : c.ids.splice(i, 1); save();
    $('.tick', el).classList.toggle('on', i < 0); $('small', el).textContent = c.ids.length + ' recipes';
    const saved = S.collections.some(x => x.ids.includes(id)); $$(`.rail .save[data-id="${id}"]`).forEach(b => b.setAttribute('aria-pressed', saved));
  },
  newColl(el) {
    const rid = (el && el.dataset && el.dataset.rid) || '';
    openSheet(`<h3>New cookbook</h3><input type="text" id="nc" placeholder="Name, like Weeknight" maxlength="24" aria-label="Cookbook name"><button class="big-btn" data-a="makeColl" data-rid="${esc(rid)}" style="margin:12px 0 0">Create</button>`, b => $('#nc', b).focus());
  },
  makeColl(el) {
    const n = $('#nc').value.trim(); if (!n) return;
    const rid = el.dataset.rid, c = { id: 'c' + Date.now(), name: n, ids: rid ? [rid] : [] };
    S.collections.push(c); save(); closeSheet(); renderCookbooks(); syncSaveIcons(); if (rid) toast(`Saved to ${n}`);
  },
  editColl(el) { openEditColl(el.dataset.id); },
  collRemove(el) {
    const c = S.collections.find(x => x.id === el.dataset.id), draft = ($('#ec-name') || {}).value;
    if (!c) return; c.ids = c.ids.filter(i => i !== el.dataset.rid); save(); syncSaveIcons(); renderCookbooks(); openEditColl(c.id, draft);
  },
  saveColl(el) {
    const c = S.collections.find(x => x.id === el.dataset.id), name = $('#ec-name').value.trim();
    if (!c) return; if (!name) { $('#ec-name').focus(); return; }
    c.name = name; save(); closeSheet(); renderCookbooks(); toast('Cookbook saved');
  },
  askDeleteColl(el) {
    const c = S.collections.find(x => x.id === el.dataset.id); if (!c) return;
    openSheet(`<h3>Delete this cookbook?</h3><p class="sheet-note">&ldquo;${esc(c.name)}&rdquo; will be removed. ${c.ids.length === 0 ? 'It has no recipes in it.' : c.ids.length === 1 ? 'The recipe in it stays in Nourish, it just won\'t be in this cookbook.' : `The ${c.ids.length} recipes in it stay in Nourish, they just won't be in this cookbook.`}</p><button class="danger-btn" data-a="confirmDeleteColl" data-id="${c.id}">Delete cookbook</button><button class="ghost-btn" data-a="closeSheet">Cancel</button>`);
  },
  confirmDeleteColl(el) {
    S.collections = S.collections.filter(c => c.id !== el.dataset.id); save(); syncSaveIcons(); closeSheet(); renderCookbooks(); toast('Cookbook deleted');
  },
  openColl(el) { const c = S.collections.find(x => x.id === el.dataset.id); openViewer(c.name, c.ids); },
  openPost(el) { const ids = el.dataset.from ? [...new Set([...S.liked, ...S.reposts])] : S.uploaded.map(r => r.id); openViewer(el.dataset.from ? 'Liked' : 'My videos', ids, el.dataset.id); },
  closeViewer() { stopVideos($('#viewer')); $('#viewer').hidden = true; $('#viewer').innerHTML = ''; $('#phone').classList.remove('viewing'); scheduleSync(); },
  closeSheet,
  sound() {
    ui.sound = !ui.sound; refreshSndButtons(); syncVideos();
  },
  toggleTheme(el) {
    S.theme = currentTheme() === 'dark' ? 'light' : 'dark'; save(); applyTheme();
    const dark = S.theme === 'dark'; el.setAttribute('aria-checked', dark); $('.ps-sub', el).textContent = dark ? 'On' : 'Off';
  },
  askDelete(el) {
    const r = S.uploaded.find(x => x.id === el.dataset.id); if (!r) return;
    openSheet(`<h3>Delete this video?</h3><p class="sheet-note">&ldquo;${esc(r.title)}&rdquo; will be removed from Discover, your collections, Shopping List and nutrition log. This can't be undone.</p><button class="danger-btn" data-a="confirmDelete" data-id="${r.id}">Delete video</button><button class="ghost-btn" data-a="closeSheet">Cancel</button>`);
  },
  confirmDelete(el) {
    const id = el.dataset.id, r = S.uploaded.find(x => x.id === id); if (!r) return closeSheet();
    if (r.videoUrl) { try { URL.revokeObjectURL(r.videoUrl); } catch (e) {} }
    S.uploaded = S.uploaded.filter(x => x.id !== id); VideoStore.del(id).catch(() => {});
    S.collections.forEach(c => { c.ids = c.ids.filter(i => i !== id); });
    S.liked = S.liked.filter(i => i !== id); S.reposts = S.reposts.filter(i => i !== id);
    S.cart = S.cart.filter(c => c.id !== id); S.made = S.made.filter(m => m.id !== id);
    delete S.checked[id]; delete S.comments[id]; delete ui.reelServ[id]; delete ui.captionExpanded[id];
    Object.values(S.log).forEach(day => MEALS.forEach(m => { day[m] = (day[m] || []).filter(e => e.id !== id); }));
    save(); closeSheet(); reelsBuilt && renderFeed(); renderProfile(); toast('Video deleted');
  },
  profTab: el => { ui.profTab = el.dataset.v; renderProfile(); },
  editProfile() { openSheet(`<h3>Edit profile</h3><p class="cmt" style="border:0;color:var(--mute)">Your bio</p><input type="text" id="bi" value="${esc(S.bio)}" placeholder="What do you cook?" maxlength="120" aria-label="Bio"><button class="big-btn" data-a="saveBio" style="margin:12px 0 0">Save</button>`, b => $('#bi', b).focus()); },
  saveBio() { S.bio = $('#bi').value.trim(); save(); closeSheet(); renderProfile(); },
  editPref(el) {
    const k = el.dataset.k, lab = PREFS.find(p => p[0] === k)[1];
    openSheet(`<h3>${esc(lab)}</h3><input type="text" id="pr" value="${esc(S.prefs[k] || '')}" placeholder="Your preference" maxlength="60" aria-label="${esc(lab)}"><button class="big-btn" data-a="savePref" data-k="${k}" style="margin:12px 0 0">Save</button>`, b => $('#pr', b).focus());
  },
  savePref(el) { S.prefs[el.dataset.k] = $('#pr').value.trim(); save(); closeSheet(); toast('Saved'); },
  logFromReel(el) {
    const id = el.dataset.id, r = byId(id), meal = guessMeal();
    addToLog(id, meal, 1);
    const m = S.made.find(x => x.id === id); if (m && m.left > 0) { m.left -= 1; save(); }  // keeps Created recently in step
    $$(`[data-log-note="${id}"]`).forEach(n => { n.textContent = logNote(id); });
    toast(`Logged 1 serving of ${r.title} to ${meal}`);
  },
  scan() { toast('Fridge scanning is coming soon'); },
  scanReceipt() { toast('Receipt scanning is coming soon'); },
  pantryTab: el => { ui.pantryTab = el.dataset.v; renderPantry(); $('#screen-pantry').scrollTop = 0; },
  checkItem(el) {
    if (el.dataset.src === 'x') { const x = S.extras.find(y => y.id === el.dataset.id); if (x) x.checked = el.checked; }
    else { const c = S.checked[el.dataset.id] || (S.checked[el.dataset.id] = {}); c[el.dataset.k] = el.checked; }
    save(); renderPantry();
  },
  rmCart(el) { S.cart = S.cart.filter(c => c.id !== el.dataset.id); delete S.checked[el.dataset.id]; save(); renderPantry(); },
  rmExtra(el) { S.extras = S.extras.filter(x => x.id !== el.dataset.id); save(); renderPantry(); },
  markMade(el) {
    const id = el.dataset.id, c = S.cart.find(x => x.id === id); if (!c) return;
    S.cart = S.cart.filter(x => x.id !== id); delete S.checked[id];
    S.made = S.made.filter(m => m.id !== id); S.made.unshift({ id, s: c.s, left: c.s, at: Date.now(), rating: null });
    save(); renderPantry(); toast('Added to Created recently');
  },
  logMade() {
    openSheet(`<h3>Which meal did you make?</h3>${allRecipes().map(r => `<button class="opt" data-a="addMade" data-id="${r.id}"><div class="thumb">${poster(r, true)}</div><div class="o-t">${esc(r.title)}<small>Serves ${r.servings || 2}</small></div></button>`).join('')}`);
  },
  addMade(el) {
    const id = el.dataset.id, r = byId(id), n = r.servings || 2;
    S.made = S.made.filter(m => m.id !== id); S.made.unshift({ id, s: n, left: n, at: Date.now(), rating: null });
    save(); closeSheet(); renderPantry(); toast('Added to Created recently');
  },
  openMade(el) { madeSheet(el.dataset.id); },
  eatenStep(el) { const m = S.made.find(x => x.id === el.dataset.id); if (m) setEaten(m.id, (m.s - m.left) + (+el.dataset.d)); },
  rmMade(el) { S.made = S.made.filter(m => m.id !== el.dataset.id); save(); closeSheet(); renderPantry(); toast('Removed'); },
  editBudget() {
    const n = Math.round(weeklyBudget());
    openSheet(`<h3>Weekly budget</h3><div class="goal-row"><button data-a="budgetStep" data-d="-5" aria-label="Lower">&minus;</button><b id="bud-v">$${n}</b><button data-a="budgetStep" data-d="5" aria-label="Raise">+</button></div><button class="big-btn" data-a="closeSheet" style="width:100%;margin:10px 0 0">Done</button>`);
  },
  budgetStep(el) { const n = Math.max(5, Math.min(1000, Math.round(weeklyBudget()) + +el.dataset.d)); S.prefs.budget = `$${n} / week`; save(); $('#bud-v').textContent = '$' + n; renderPantry(); },
  addItem() {
    openSheet(`<h3>Add an item</h3><input type="text" id="ai-name" placeholder="What do you need?" maxlength="40" aria-label="Item name">
      <input type="text" id="ai-price" inputmode="decimal" placeholder="Estimated price, like 3.50" maxlength="8" aria-label="Estimated price" style="margin-top:10px">
      <div class="seg" id="ai-cat" style="margin-top:12px;flex-wrap:wrap">${PANTRY_CATS.map((c, i) => `<button data-a="itemCat" data-c="${c}" aria-pressed="${i === 0}" style="flex:1 1 30%">${c}</button>`).join('')}</div>
      <button class="big-btn" data-a="saveItem" style="width:100%;margin:6px 0 0">Add to list</button>`, b => $('#ai-name', b).focus());
  },
  itemCat(el) { $$('#ai-cat button').forEach(b => b.setAttribute('aria-pressed', b === el)); },
  saveItem() {
    const name = $('#ai-name').value.trim(); if (!name) { $('#ai-name').focus(); return; }
    const price = Math.max(0, Math.round((parseFloat($('#ai-price').value.replace(/[^0-9.]/g, '')) || 0) * 100) / 100);
    const cat = $('#ai-cat [aria-pressed="true"]').dataset.c;
    S.extras.push({ id: 'x' + Date.now(), name, cat, price, checked: false }); save(); closeSheet(); renderPantry(); toast('Added to your list');
  },
  filters() { openSheet(filterSheetHTML()); },
  search(el) { openSearch(el.dataset.scope); },
  clearSearch() { const q = $('#sq'); if (q) { q.value = ''; q.focus(); q.dispatchEvent(new Event('input')); } },
  searchOpen(el) { closeSheet(); openRecipe(el.dataset.id); },
  searchColl(el) {
    const c = S.collections.find(x => x.id === el.dataset.id); if (!c) return;
    closeSheet(); openViewer(c.name, c.ids, el.dataset.rid || undefined);
  },
  fProtein(el) { const p = ui.fl.proteins, i = p.indexOf(el.dataset.v); i < 0 ? p.push(el.dataset.v) : p.splice(i, 1); applyFilters(); },
  fPrice(el) { const v = +el.dataset.v; ui.fl.maxPrice = ui.fl.maxPrice === v ? 0 : v; applyFilters(); },
  fTime(el) { const v = +el.dataset.v; ui.fl.maxTime = ui.fl.maxTime === v ? 0 : v; applyFilters(); },
  fDiet(el) { const d = ui.fl.diets, i = d.indexOf(el.dataset.v); i < 0 ? d.push(el.dataset.v) : d.splice(i, 1); applyFilters(); },
  toggleMyDiet() { ui.fl.ignoreDiet = !ui.fl.ignoreDiet; applyFilters(); },
  resetFilters() { ui.fl = { ...ui.fl, proteins: [], diets: [], maxPrice: 0, maxTime: 0 }; ui.filter = ''; applyFilters(); },
  process,
  apiUrl(el, e) { e.preventDefault(); openSheet(`<h3>Backend URL</h3><input type="text" id="au" value="${esc(Api.base())}" aria-label="API base URL"><button class="big-btn" data-a="saveApi" style="margin:12px 0 0">Save</button>`); },
  saveApi() { localStorage.setItem('nurish.api', $('#au').value.trim()); closeSheet(); renderProfile(); },
  postIt() { const r = ui.up.result; r.title = (r.title || '').trim() || 'Untitled recipe'; r.caption = (ui.up.caption || '').trim() || r.summary || ''; S.uploaded.unshift(r); save(); keepVideo(r.id, ui.up.video); reelsBuilt && renderFeed(); ui.up = null; ui.profTab = 'posts'; renderProfile(); toast('Posted to Discover'); },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.tagName === 'INPUT') return;
  const fn = A[el.dataset.a]; if (fn) fn(el, e);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el instanceof HTMLInputElement && el.dataset.a === 'checkItem') { A.checkItem(el); return; }
  if (!(el instanceof HTMLInputElement) || !el.matches('input[data-pref-group]')) return;
  const key = el.dataset.prefGroup, selections = preferenceSelections(key), index = selections.indexOf(el.value);
  if (el.checked && index === -1) selections.push(el.value);
  else if (!el.checked && index !== -1) selections.splice(index, 1);
  S.prefs[key] = selections;
  save();
  if (key === 'diets' && reelsBuilt) renderFeed();
  const summary = $(`[data-pref-summary="${key}"]`);
  if (summary) summary.textContent = preferenceSummary(key, selections);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('#sheet').hidden) closeSheet(); else if (!$('#viewer').hidden) A.closeViewer(); }
});

/* ---------- tabs ---------- */
const R = { pantry: renderPantry, nutrition: renderNutrition, discover: () => renderDiscover(), cookbooks: renderCookbooks, profile: renderProfile };
function setEaten(id, val) {
  const m = S.made.find(x => x.id === id); if (!m) return;
  const eaten = Math.max(0, Math.min(m.s, Math.round(+val) || 0)), delta = eaten - (m.s - m.left);
  m.left = m.s - eaten; save();
  if (delta > 0) addToLog(id, guessMeal(), delta); else if (delta < 0) removeFromLog(id, -delta);
  const inp = $('#eaten'); if (inp) inp.value = eaten;
  const lab = $('#ml-left'); if (lab) lab.textContent = `${m.left} of ${m.s} left`;
  renderPantry();
}
function madeSheet(id) {
  const m = S.made.find(x => x.id === id), r = byId(id); if (!m || !r) return;
  const left = shelfLeft(m, r), total = r.shelfDays || 3, pct = Math.max(0, Math.min(1, left / total)) * 100, eaten = m.s - m.left;
  const when = new Date(m.at).toLocaleDateString('en', { month: 'short', day: 'numeric' });
  openSheet(`<h3>${esc(r.title)}</h3>
    <div class="meter" style="margin-top:4px"><div class="meter-top"><b>${left <= 0 ? 'Past shelf life' : left + (left === 1 ? ' day' : ' days') + ' left'}</b><small>shelf life</small></div>
      <div class="bar ${left <= 1 ? 'urgent' : left <= 2 ? 'soon' : ''}" role="img" aria-label="${Math.max(0, left)} of ${total} days of shelf life left"><i style="width:${pct}%"></i></div></div>
    <p class="sheet-note" style="margin-top:8px">Made ${when}. Keeps about ${total} days in the fridge.</p>
    <div class="meter"><div class="meter-top"><b>Servings eaten</b><small id="ml-left">${m.left} of ${m.s} left</small></div>
      <div class="eaten-row"><button data-a="eatenStep" data-id="${id}" data-d="-1" aria-label="Fewer servings eaten">&minus;</button>
        <input type="number" id="eaten" min="0" max="${m.s}" step="1" inputmode="numeric" value="${eaten}" aria-label="Servings eaten">
        <button data-a="eatenStep" data-id="${id}" data-d="1" aria-label="More servings eaten">+</button><span>of ${m.s} made</span></div>
      <p class="sheet-note" style="margin-top:8px">Servings you mark as eaten count toward today's nutrition.</p></div>
    <button class="big-btn" data-a="closeSheet" style="width:100%;margin:16px 0 0">Done</button>
    <button class="ghost-btn" data-a="rmMade" data-id="${id}">Remove from Created recently</button>`,
    b => { const inp = $('#eaten', b); inp.addEventListener('input', () => { if (inp.value !== '') setEaten(id, inp.value); }); inp.addEventListener('blur', () => setEaten(id, inp.value)); });
}
function showTab(t) {
  $('#phone').dataset.tab = t;
  ['pantry', 'nutrition', 'discover', 'cookbooks', 'profile'].forEach(k => { $('#screen-' + k).hidden = k !== t; });
  A.closeViewer(); closeSheet();
  renderAppbar(t);
  if (t === 'pantry') ui.pantryTab = 'pantry';
  R[t]();
  if (t === 'discover') $$('#screen-discover .pager').forEach(p => { p.scrollLeft = p.clientWidth; });
  syncVideos(); scheduleSync();
}
function showVideoNote(pane, text) {
  if (!pane || $('.vid-note', pane)) return;
  const n = document.createElement('div'); n.className = 'vid-note'; n.setAttribute('role', 'status'); n.textContent = text; pane.appendChild(n);
}
document.addEventListener('error', e => {
  const v = e.target; if (!v || v.tagName !== 'VIDEO') return;
  const pane = v.parentElement, snd = pane && $('.snd', pane); if (snd) snd.remove();
  v.remove();
  showVideoNote(pane, "This browser can't play this video file. Upload it again as an MP4 (H.264) or WebM.");
}, true);
restoreVideos().finally(() => showTab('discover'));
})();
