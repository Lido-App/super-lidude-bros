# Arcade Rewards — What Shipped & Why

## The short version

Every Lido game now shows the user's **rank** in the corner — tied to how
many pages they've processed on Lido. Light users see progress toward the
next rank; heavy users get a permanent status they've *earned* by actually
using the product.

## Ranks

> **Paper Pusher** → **Data Wrangler** → **Sheet Samurai** →
> **Spreadsheet Warrior** → **Data Overlord**

Ranks are lifetime. Once you hit Spreadsheet Warrior you stay one. No monthly
reset, no grind, no in-game currency.

## Why this design

- **Status is earned through normal product usage.** Zero new workflow for
  the user to learn.
- **Light and heavy users both see themselves making progress** — thresholds
  are log-scaled (0, 10, 100, 1K, 10K pages). A 10-page user is 1% of the way
  somewhere visible; a 50K-page user is a "Data Overlord" with an animated
  rainbow badge.
- **Zero friction to the core product.** Sits on top of page processing,
  doesn't compete with it for attention.
- A tier-up celebration fires **once** when a user crosses a threshold —
  highest-dopamine moment, but never nagging.

## What heavy users get (the "pride" payoff)

- **Data Overlord** is genuinely rare. Animated rainbow icon, unmistakable
  in-product signal that someone is a serious power user.
- Status is **permanent** — rewards longevity, not monthly churn.
- Follow-up (not in this release but planned):
  - Shareable profile card ("I'm a Spreadsheet Warrior on Lido arcade")
  - Legend-gated game slot (one game only Data Overlords can play)
  - Annual Lido Rewind email

## Status today

- 16 games live, rank pill in every one
- 3 games (LeFlappy, Breakout, Pong) skin their signature element to match tier
- Remaining 13: rolling out when QA signs off
- Thresholds today are placeholders — will calibrate against real usage
  distribution before public launch

## What it is **not** (intentionally)

- Not a currency or points economy
- Not a quest/daily-goal system
- Not a leaderboard
- Not a gacha

Those all add UI surface and compete with the core product. We can layer them
on later if engagement data justifies it.

## One-line pitch

> Your work on Lido is your progression. Process more pages, become the
> Data Overlord — a permanent badge that shows up across every arcade game.
