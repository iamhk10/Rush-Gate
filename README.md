# Logic Gate Rush v3

A logic-gate puzzle game. Wire up gates, match the truth table and use as few gates as you can.

- **Campaign:** 48 levels in 6 worlds (Boot Camp, Universal Gates, Arithmetic, Grandmaster, Circuit Lab, Chip Designer)
- **Daily Puzzle:** a new puzzle every day, with a streak counter
- **Endless:** unlimited random build puzzles (Easy, Medium, Hard)
- **Quick Fire:** 60-second arcade game, predict a circuit's output
- **Bit Flip:** 60-second arcade game, binary and decimal
- **Gate Match:** memory game with 3 difficulties
- **Bug Hunt:** find the one wrong gate in a circuit
- **Table Fill:** complete the truth table of a circuit
- **Circuit ID:** pick the Boolean expression that matches a circuit
- **Free Lab:** sandbox with every gate
- **Board tools:** zoom (buttons, pinch, wheel, double-tap), pan, undo/redo, tidy, signal values, auto-test, wire highlight, keyboard shortcuts
- **Stats and backup:** records page, export/import your progress as a file or text
- 5 themes, calm mode, sound, haptics, animations, achievements, ranks
- Save any result as a **PNG card** (download or share)
- Works offline (PWA)

No build step: plain HTML, CSS and JavaScript.

## Files

| File | Purpose |
|---|---|
| `index.html`, `style.css` | Page, layout, themes |
| `core.js` | Game logic: gates, 48 levels, daily and endless puzzles, arcade rounds (no DOM) |
| `fx.js` | Sound, vibration, confetti |
| `app.js` | Storage, navigation, menu, modal, themes, achievements |
| `draw.js` | Gate shapes and board geometry |
| `card.js` | PNG result cards |
| `campaign.js` | Level map, circuit board, daily puzzle, free lab |
| `arcade.js` | Quick Fire, Bit Flip, Gate Match |
| `games2.js` | Bug Hunt, Table Fill, Circuit ID |
| `pages.js` | Home, rules, gate guide, achievements, stats and backup, settings, boot |
| `manifest.webmanifest`, `sw.js` | PWA install and offline |
| `icon-*.png` | App icons |
| `vercel.json` | Vercel headers |

The developer name shown in the app and on PNG cards is the constant `DEV` at the top of `app.js`.

## Test locally

```bash
python3 -m http.server 8000
# or
npx serve .
```

Open `http://localhost:8000`.

## Deploy with GitHub and Vercel

1. Push all files in this folder to the **root** of a GitHub repo. If you used v1 before, delete the old `game.js`. Add the new `games2.js`.
2. On [vercel.com](https://vercel.com) choose **Add New, then Project** and import the repo.
3. Framework Preset: **Other**. Leave Build Command and Output Directory empty. Click **Deploy**.
4. Open the `https://your-project.vercel.app` link on your phone. Chrome's menu will offer **Install app**.

Every `git push` redeploys automatically.

## Make the APK

1. Go to [pwabuilder.com](https://www.pwabuilder.com) and enter your Vercel link.
2. Choose **Package for stores, then Android**, and set a package ID such as `com.yourname.logicgaterush`.
3. Let it generate a signing key. **Keep the key file and its password safe.** You need the same key for every future update.
4. The download contains an `.apk` (for testing and sideloading) and an `.aab` (for the Play Store).
5. PWABuilder also gives you an `assetlinks.json`. Put it at `.well-known/assetlinks.json` in your repo and push. Without it the APK shows Chrome's address bar.

## Saving PNG cards in the APK

The PNG button downloads the card through the browser. If your Android build blocks downloads, use the **Share** button in the PNG preview instead. It opens the Android share sheet with the image.

## Data

Progress (stars, streaks, scores, achievements, unfinished boards) is stored in the device's `localStorage` under the key `lgr-v2`. v2 progress carries over to v3. Uninstalling the app or clearing site data removes it, so use **Stats and Backup** in the menu to export a backup first.
