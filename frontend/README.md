# Nourish frontend

Plain HTML, CSS and JS. No build step, no dependencies.

## Run

```bash
# terminal 1: backend (from repo root)
uvicorn app.main:app --reload

# terminal 2: frontend
cd frontend && python3 -m http.server 5173
```

Open http://localhost:5173. The backend's CORS setup already allows local origins in dev;
tighten it before production. To point at another API, set `localStorage["nurish.api"]`
or use the "change the URL" link on the upload screen.

If the API is unreachable the upload flow runs in demo mode with a sample recipe, so the
whole UI works on its own.

## Design

Follows the "Nourish" Figma Make design: cream paper palette, dark green cards,
coral accents, Fraunces serif headings and Figtree body. A persistent top app bar
carries the leaf logo + wordmark and per-tab actions; a five-tab labelled bottom
nav (Pantry · Nutrition · Discover · Cookbooks · Profile) with a coral active state.

## Screens

| Tab | What it does |
|-----|--------------|
| Pantry | "My Pantry" with stat cards (items / use soon / low), a "Scan your fridge" CTA, and a "Top Matches" grid of recipe cards with a % pantry-match badge, cook time and price. Tapping a card opens it as a full-screen recipe reel. |
| Nutrition | Daily / Weekly segmented toggle. Daily shows a dark-green energy hero card (calorie ring + kcal left), Protein/Carbs/Fat macro cards, and a "Today's meals" list with + Add meal. Weekly shows the 7-day bar chart against your goal. Tap the ring to change the goal. |
| Discover | Vertical reel feed. Swipe left/right inside a reel: Nutrition pie, Video, Recipe. Each reel has a pantry-match pill, creator handle + Follow, meta chips (time / protein / price), a coral "Make this recipe" button, and a rail with like, comments, save to collection, and share. Long captions show a 25-character preview with a More / Less control; the caption toggle minimizes the overlay to its creator and title or restores it. |
| Cookbooks | "My Cookbooks" with a featured collection banner and a 2-col collection grid (+ Create). Opening one plays that collection as a feed. |
| Profile | "Hey, Maya" header, avatar + stats (Saved / Cooked / Videos), and sub-tabs for posts, upload (calls `POST /api/videos`, polls job status, fetches the result), reposts, and preferences. Uploads can include an optional post caption, shown on the Discover reel; this is separate from an optional `.srt`/`.vtt` subtitle track used during recipe processing. Preferences include expandable multi-select lists for diets and the FDA's nine major food allergens, saved in this browser's local profile. Selected allergens are flagged next to matching ingredients in recipe views; this name-based warning cannot detect undeclared ingredients or cross-contact. |

## Files

- `data.js` seed recipes (same shape as `app/models/recipe.py`)
- `api.js` upload, status and result calls
- `app.js` state, rendering, gestures
