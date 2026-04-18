# Lido Arcade — Shared Rewards System

A single JS module every game includes. Renders a floating tier pill in the
corner, owns the user's lifetime-page count, fires tier-up celebrations, and
exposes a skin API so each game can recolor its signature element to match the
player's rank.

## Ranks

| Tier | Pages lifetime | Id |
|---|---|---|
| Paper Pusher | 0 | `paper-pusher` |
| Data Wrangler | 10 | `data-wrangler` |
| Sheet Samurai | 100 | `sheet-samurai` |
| Spreadsheet Warrior | 1,000 | `spreadsheet-warrior` |
| Data Overlord | 10,000 | `data-overlord` |

Thresholds are placeholders — **calibrate against real usage distribution**
before launch. Rule of thumb: median active user reaches Sheet Samurai in ~6
months; Data Overlord should be 1–2 years of heavy usage.

Swap tier names or thresholds in one place: the `TIERS` array at the top of
`lido-rewards.js`.

## Integrate a new game

```html
<head>
  <!-- ... your existing head ... -->
  <script src="../_shared/lido-rewards.js"></script>
</head>
```

That's the minimum integration. You get the pill, tier-up celebration, and
analytics events for free.

To actually skin your game's signature element:

```js
// after the shared script has loaded (which is guaranteed for inline scripts in body)
const skin = window.LidoRewards.skin;
// skin.primary, skin.accent, skin.ring, skin.glow  — CSS color strings
// skin.animated  — true only on top tier (rainbow icon)
// skin.tierName  — human name, e.g. "Spreadsheet Warrior"

// Example: color your ball/paddle/sprite
ctx.fillStyle = skin.accent;
```

## API

```js
window.LidoRewards.tier            // { id, name, minPages, nextAt, color, accent, ring, glow }
window.LidoRewards.pagesLifetime   // number
window.LidoRewards.progress        // 0..1 to next tier
window.LidoRewards.pagesToNext     // number
window.LidoRewards.skin            // { primary, accent, ring, glow, animated, tier, tierName }
window.LidoRewards.on('tier-up', fn)
window.LidoRewards.on('state-change', fn)
window.LidoRewards.track(event, payload)
window.LidoRewards.__setPages(n)   // dev/test: simulate a pages count
```

## Data source

The module tries these, in order:

1. `window.__LIDO_REWARDS__` — set by the host page / server-rendered bootstrap.
   Preferred when Lido is logged in.
2. `localStorage['lido:rewards:v1']` — fallback for anonymous play.
3. Default: 0 pages lifetime (Paper Pusher).

When the real API lands, replace the `loadState()` function to fetch from
`/api/me/rewards`. Everything else stays the same.

## QA / testing tiers

Open any game, open the devtools console, and run:

```js
LidoRewards.__setPages(0);       // Paper Pusher
LidoRewards.__setPages(10);      // Data Wrangler
LidoRewards.__setPages(100);     // Sheet Samurai
LidoRewards.__setPages(1000);    // Spreadsheet Warrior
LidoRewards.__setPages(10000);   // Data Overlord
```

Each jump up fires the tier-up celebration once. Confetti ✓.

## Analytics

Every game emits `arcade_open` on load and `tier_up` on level-up by default.
Games can emit more: `LidoRewards.track('game_start', {id})`, `game_end`, etc.

Events buffer in `localStorage['lido:rewards:events']` for now. Swap the
`track()` stub to POST to your analytics endpoint when ready.

## What's next (not built yet)

- Shareable profile card (`/arcade/u/<id>` → OG image of your tier + stats)
- Annual Lido Rewind email
- Legend-tier-gated game slot
- Per-game skin hooks beyond just the pill (rolling out 1 game at a time)
