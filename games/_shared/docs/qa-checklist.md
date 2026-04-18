# Arcade QA — Test Pass for Rewards v1

Takes ~30 minutes. Tests 16 games plus the new rewards system.

## Setup

```bash
gh pr checkout 19 --repo Lido-App/super-lidude-bros
cd super-lidude-bros
python3 -m http.server 8000
```

Open `http://localhost:8000/` in Chrome. Each game lives at
`http://localhost:8000/games/<id>/`.

Use DevTools **Toggle Device Toolbar** (`⌘⇧M`) to spot-check mobile too.

## 1. Sanity-check the rewards system (2 min)

Open any game (start with LeFlappy). You should see a pill in the
**top-right corner**: `Paper Pusher · 0 pages · 10 to Data Wrangler`.

Open DevTools Console and paste:

```js
LidoRewards.__setPages(10);     // Data Wrangler — tier-up card should fire
LidoRewards.__setPages(100);    // Sheet Samurai
LidoRewards.__setPages(1000);   // Spreadsheet Warrior
LidoRewards.__setPages(10000);  // Data Overlord — animated rainbow icon
LidoRewards.__setPages(0);      // reset
```

At each tier-up, expect:

- Pill rank name and color update
- Full-screen confetti celebration (auto-dismisses in 6s)
- In **Breakout / Pong / LeFlappy**, the signature element
  (ball / paddle / bird) recolors to match the tier

If any of those don't happen, log it and tell me.

## 2. Per-game smoke test (~60s each)

| Game | URL |
|---|---|
| Bros | `/games/lidude-bros/` |
| LeFlappy | `/games/leflappy/` |
| Breakout | `/games/lidude-breakout/` |
| 2048 | `/games/lidude-2048/` |
| Tetris | `/games/lidude-tetris/` |
| Cash | `/games/lidude-cash/` |
| Leap | `/games/lidude-leap/` |
| Pinball | `/games/lidude-pinball/` |
| Stack | `/games/lidude-stack/` |
| Dash | `/games/lidude-dash/` |
| Drop | `/games/lidude-drop/` |
| Invaders | `/games/lidude-invaders/` |
| Pong | `/games/lidude-pong/` |
| Match | `/games/lidude-match/` |
| Whack | `/games/lidude-whack/` |
| Slice | `/games/lidude-slice/` |

For each, check:

1. Loads with **no console errors** (open DevTools Console first)
2. **Start** button begins the game
3. **Controls respond** — keyboard, mouse, and touch (via mobile mode)
4. **Score increments** and updates on-screen
5. **Game over → restart** works
6. **Rewards pill is visible** and doesn't block gameplay

## Bug report format

Shared sheet (or Linear) with these columns:

| Game | Works Y/N | Browser | Device | What broke |
|---|---|---|---|---|

If the rewards pill visibly overlaps a game's HUD, report it as
**"pill overlap"** — it's a CSS nudge fix per game.

## What's intentionally not done yet (not bugs)

- Only **3 games skin their signature element** (Breakout, Pong, LeFlappy).
  The other 13 show the pill but their sprites don't change with tier.
- Minor pill/HUD overlap expected in games with top-right score (Leap, Stack).

## If something looks really broken

DM me with: game id + screenshot + browser console output. Thanks!
