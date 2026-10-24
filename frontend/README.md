# Nurish Reel frontend

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

## Screens (from the sketches)

| Tab | What it does |
|-----|--------------|
| Shopping | "Shopping / Made" header tabs. Servings stepper per card, swipe left for Made it or Remove. Tap a card for the ingredient checklist (scales with servings). Made cards open a shelf life bar, servings left slider, and 3 face rating. |
| Nutrition | Daily and Weekly. Goal, consumed and remaining rings, per meal logging with +. Tap the goal ring to change it. |
| Reels | Vertical feed. Swipe left or right inside a reel: Nutrition pie, Video, Recipe. Rail has like, comments, save to collection, add to cart. Search and chips filter the feed. |
| Saved | Collection grid with +. Opening one plays that collection as a feed. |
| Profile | Followers, bio, posts grid, upload tab (calls `POST /api/videos`, polls job status, fetches the result), reposts, notes. |

## Files

- `data.js` seed recipes (same shape as `app/models/recipe.py`)
- `api.js` upload, status and result calls
- `app.js` state, rendering, gestures
