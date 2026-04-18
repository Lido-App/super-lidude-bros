# Arcade Rewards — Architecture & Integration

One shared JS module loaded by every game. Exposes `window.LidoRewards`.
That's the entire contract.

## Layout

```
games/
  _shared/
    lido-rewards.js     # the module (single source of truth)
    lidude.svg          # shared sprite (currently also duplicated per-game)
    README.md           # dev docs
    docs/               # qa-checklist, overview, this file
  <game>/
    index.html          # <script src="../_shared/lido-rewards.js">
```

## Tier schema

One array at the top of `lido-rewards.js` defines everything:

```js
const TIERS = [
  { id: 'paper-pusher',        name: 'Paper Pusher',        minPages: 0, ... },
  { id: 'data-wrangler',       name: 'Data Wrangler',       minPages: 10, ... },
  { id: 'sheet-samurai',       name: 'Sheet Samurai',       minPages: 100, ... },
  { id: 'spreadsheet-warrior', name: 'Spreadsheet Warrior', minPages: 1000, ... },
  { id: 'data-overlord',       name: 'Data Overlord',       minPages: 10000, ... },
];
```

To rename ranks, adjust thresholds, or change colors: edit this array and
redeploy. No game code needs to change.

## Data source

`loadState()` tries, in order:

1. **`window.__LIDO_REWARDS__`** — set by the host app / server-rendered
   bootstrap. **Use this when the user is logged into Lido.** The app shell
   should inject something like:
   ```html
   <script>window.__LIDO_REWARDS__ = { pagesLifetime: 4713 };</script>
   ```
   *before* the rewards module loads.

2. **`localStorage['lido:rewards:v1']`** — anonymous / shared-link play.

3. Default: `0` pages (Paper Pusher).

When the real `/api/me/rewards` endpoint lands, replace `loadState()` with a
fetch. Everything else stays the same.

## Runtime API

```js
window.LidoRewards.tier            // { id, name, minPages, nextAt, color, accent, ring, glow }
window.LidoRewards.pagesLifetime   // number
window.LidoRewards.progress        // 0..1 toward next tier
window.LidoRewards.pagesToNext     // number
window.LidoRewards.skin            // { primary, accent, ring, glow, animated, tier, tierName }
window.LidoRewards.on('tier-up', fn)
window.LidoRewards.on('state-change', fn)
window.LidoRewards.track(event, payload)
window.LidoRewards.__setPages(n)   // dev helper
```

## Adding a new game

1. `<head>`: add `<script src="../_shared/lido-rewards.js"></script>`
2. (Optional) Skin the signature element:
   ```js
   const skin = (window.LidoRewards && window.LidoRewards.skin) || null;
   const bodyColor = skin ? skin.accent : '#FFC233';
   ```
3. Register in `games/registry.json`.

That's it. Pill + tier-up celebration are free.

## UI footprint

- **Floating pill**: top-right corner, collapsed ~44×28px, expands on
  hover/click to show progress + page count. `z-index: 2147483600`.
- **Tier-up card**: full-screen backdrop with confetti, auto-dismisses in 6s.
- Both inject their own styles scoped under `#lido-rewards-*` IDs. Won't
  clash with game CSS.

## Analytics

`LidoRewards.track(event, payload)` is currently a stub that buffers events
in `localStorage['lido:rewards:events']` and calls `console.debug`. Replace
with a real POST:

```js
if (window.__lido_analytics__) {
  window.__lido_analytics__(ev, payload);  // your host-app analytics
  return;
}
```

Events emitted by default:
- `arcade_open` — on module load
- `tier_up` — on threshold cross

Games can emit more (`game_start`, `game_end`, `score_submit`, etc.).

## Security / trust

Tier is computed client-side from `pagesLifetime`, which becomes
server-authoritative once `/api/me/rewards` ships. **Never trust the client
for tier-gated unlocks** — re-check server-side when you add any such unlock.

## Follow-up work

- Host app: inject `window.__LIDO_REWARDS__` in the logged-in shell
- Backend: ship `/api/me/rewards`
- Engineering: replace `track()` stub with real analytics pipe
- Grunt work: skin remaining 13 games (2–5 lines each at their draw call)
- CSS nudge: fix pill overlap in games with top-right HUDs (Leap, Stack)
- Product: shareable profile card (`/arcade/u/<id>` → OG image)
- Growth: annual Lido Rewind email pipeline
- Product: decide on a Legend-tier-gated game slot

## Known tech debt

- Pill uses global DOM, not shadow-DOM. Games with aggressive global CSS
  could override styles. Haven't seen it yet; wrap in shadow root if needed.
- `lidude.svg` is currently duplicated in 4 game directories. Move to
  `_shared/` after the fix-bugs PR merges and update all references.
- Tier names are in JS. For localization, extract to a JSON manifest.
- Analytics buffer is localStorage-only; no delivery. Replace before launch.
