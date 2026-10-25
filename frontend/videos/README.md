# Demo reel videos

Drop the demo cooking clips here. The frontend seed recipes in
`frontend/data.js` reference these files via each recipe's `videoUrl`, and the
reel view plays them automatically (see `<video>` in `app.js`).

## Expected files (4 slots)

Add exactly these four files — the filenames are what `data.js` points at:

| Slot | Filename      | `videoUrl` in data.js |
|------|---------------|-----------------------|
| 1    | `reel-1.mp4`  | `videos/reel-1.mp4`   |
| 2    | `reel-2.mp4`  | `videos/reel-2.mp4`   |
| 3    | `reel-3.mp4`  | `videos/reel-3.mp4`   |
| 4    | `reel-4.mp4`  | `videos/reel-4.mp4`   |

## Guidelines

- **Format:** `.mp4` (H.264) plays everywhere. Keep each clip short (a few
  seconds to ~30s) and small (ideally < 5–10 MB) so the Vercel static deploy
  stays lightweight and loads fast.
- **Orientation:** vertical / portrait (9:16) looks best in the reel UI.
- **Licensing:** use your own recordings or clips licensed for reuse
  (e.g. Pexels / Mixkit / Pixabay free stock). Do not commit copyrighted
  Instagram/TikTok videos you do not own.

## How to add them

You can commit the files directly on this branch via the GitHub web UI:
open the repo → this `frontend/videos/` folder → **Add file → Upload files** →
drag in the four clips (named as above) → commit.

Once the files are committed, the seed recipes will play them with no code
changes needed.
