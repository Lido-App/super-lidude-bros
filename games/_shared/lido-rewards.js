/**
 * Lido Arcade Rewards v1
 *
 * Single shared module included by every game. Exposes `window.LidoRewards`:
 *
 *   LidoRewards.tier            // { id, name, minPages, nextAt, ... }
 *   LidoRewards.pagesLifetime   // number
 *   LidoRewards.progress        // 0..1 to next tier
 *   LidoRewards.skin            // { primary, accent, glow, ring, animated }
 *   LidoRewards.on(event, fn)   // 'tier-up', 'state-change'
 *   LidoRewards.track(event, payload)   // analytics stub
 *   LidoRewards.__setPages(n)   // dev/test helper
 *
 * Tier names live in the TIERS array. Swap them in one place.
 *
 * Data source: tries to read `window.__LIDO_REWARDS__` (set by host app /
 * server-rendered page), then localStorage, then defaults to 0 pages.
 * Replace the fetcher when the real /api/me/rewards endpoint ships.
 */
(() => {
  'use strict';
  if (window.LidoRewards) return; // idempotent

  // ---------- Tier schema ----------
  // minPages is the floor to enter this tier. Last tier's nextAt is null.
  // Swap tier `name` values to rename. Thresholds should be calibrated against
  // real usage distribution before launch.
  const TIERS = [
    { id: 'paper-pusher',       name: 'Paper Pusher',       minPages: 0,     nextAt: 10,
      color: '#94A3B8', accent: '#CBD5E1', ring: '#475569', glow: 'rgba(148,163,184,0.35)' },
    { id: 'data-wrangler',      name: 'Data Wrangler',      minPages: 10,    nextAt: 100,
      color: '#CD7F32', accent: '#F59E0B', ring: '#7C4A12', glow: 'rgba(245,158,11,0.45)' },
    { id: 'sheet-samurai',      name: 'Sheet Samurai',      minPages: 100,   nextAt: 1000,
      color: '#C0C0C0', accent: '#E5E7EB', ring: '#6B7280', glow: 'rgba(229,231,235,0.55)' },
    { id: 'spreadsheet-warrior',name: 'Spreadsheet Warrior',minPages: 1000,  nextAt: 10000,
      color: '#FFC233', accent: '#FDE68A', ring: '#B45309', glow: 'rgba(255,194,51,0.55)' },
    { id: 'data-overlord',      name: 'Data Overlord',      minPages: 10000, nextAt: null,
      color: '#8B5CF6', accent: '#FBBF24', ring: '#5B21B6', glow: 'rgba(139,92,246,0.7)',
      animated: true },
  ];

  const STORAGE_KEY = 'lido:rewards:v1';
  const TIER_SEEN_KEY = 'lido:rewards:lastSeenTier';

  // ---------- State ----------
  function loadState() {
    if (window.__LIDO_REWARDS__ && typeof window.__LIDO_REWARDS__ === 'object') {
      return { ...defaultState(), ...window.__LIDO_REWARDS__ };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultState(), ...JSON.parse(raw) };
    } catch (_) {}
    return defaultState();
  }
  function defaultState() { return { pagesLifetime: 0 }; }
  function saveState(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (_) {} }

  function tierFor(n) {
    let cur = TIERS[0];
    for (const t of TIERS) if (n >= t.minPages) cur = t;
    return cur;
  }
  function progressIn(n, t) {
    if (t.nextAt == null) return 1;
    return Math.min(1, Math.max(0, (n - t.minPages) / (t.nextAt - t.minPages)));
  }
  function pagesToNext(n, t) { return t.nextAt == null ? 0 : Math.max(0, t.nextAt - n); }

  const listeners = { 'tier-up': [], 'state-change': [] };
  function emit(ev, payload) { (listeners[ev] || []).forEach(fn => { try { fn(payload); } catch (_) {} }); }

  let state = loadState();
  let tier  = tierFor(state.pagesLifetime);

  // ---------- Public API ----------
  const api = {
    tier,
    pagesLifetime: state.pagesLifetime,
    progress: progressIn(state.pagesLifetime, tier),
    pagesToNext: pagesToNext(state.pagesLifetime, tier),
    skin: makeSkin(tier),
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return () => {
      const i = listeners[ev].indexOf(fn); if (i >= 0) listeners[ev].splice(i, 1);
    }; },
    track(ev, payload) {
      // Analytics stub. Replace with real endpoint when ready.
      // For now, buffer in localStorage + console so the host app or a dev can inspect.
      if (window.__lido_analytics__) { try { window.__lido_analytics__(ev, payload); } catch (_) {} return; }
      try {
        const key = 'lido:rewards:events';
        const buf = JSON.parse(localStorage.getItem(key) || '[]');
        buf.push({ ev, payload, t: Date.now() });
        if (buf.length > 500) buf.splice(0, buf.length - 500);
        localStorage.setItem(key, JSON.stringify(buf));
      } catch (_) {}
      if (window.console && console.debug) console.debug('[lido-rewards]', ev, payload);
    },
    // Dev helper: simulate a pages count so QA can see all tiers.
    __setPages(n) { setPages(n, 'dev'); },
    _tiers: TIERS.slice(),
  };

  function makeSkin(t) {
    return {
      primary:  t.color,
      accent:   t.accent,
      ring:     t.ring,
      glow:     t.glow,
      animated: !!t.animated,
      tier:     t.id,
      tierName: t.name,
    };
  }

  function refreshFromState() {
    api.pagesLifetime = state.pagesLifetime;
    api.tier = tier = tierFor(state.pagesLifetime);
    api.progress = progressIn(state.pagesLifetime, tier);
    api.pagesToNext = pagesToNext(state.pagesLifetime, tier);
    api.skin = makeSkin(tier);
  }

  function setPages(n, source) {
    const prev = state.pagesLifetime;
    const prevTierIdx = TIERS.indexOf(tierFor(prev));
    state.pagesLifetime = Math.max(0, Math.floor(n));
    saveState(state);
    refreshFromState();
    const newTierIdx = TIERS.indexOf(api.tier);
    renderBar();
    emit('state-change', { pagesLifetime: state.pagesLifetime, tier: api.tier, source });
    if (newTierIdx > prevTierIdx) {
      // Tier-up! Trigger celebration once per tier per session.
      try { localStorage.setItem(TIER_SEEN_KEY, api.tier.id); } catch (_) {}
      celebrateTierUp(api.tier);
      emit('tier-up', { tier: api.tier, previous: TIERS[prevTierIdx] });
    }
  }

  // ---------- UI: the pill ----------
  let barEl;
  function renderBar() {
    if (!barEl) return;
    const t = api.tier;
    barEl.style.setProperty('--lr-glow', t.glow);
    barEl.style.setProperty('--lr-accent', t.accent);
    barEl.style.setProperty('--lr-primary', t.color);
    barEl.style.setProperty('--lr-ring', t.ring);
    barEl.dataset.tier = t.id;
    barEl.querySelector('.lr-tier').textContent = t.name;
    barEl.querySelector('.lr-pages').textContent = api.pagesLifetime.toLocaleString();
    const bar = barEl.querySelector('.lr-fill');
    if (bar) bar.style.width = (api.progress * 100).toFixed(2) + '%';
    const next = barEl.querySelector('.lr-next');
    if (t.nextAt != null) {
      const nextTier = TIERS[TIERS.indexOf(t) + 1];
      next.textContent = `${api.pagesToNext.toLocaleString()} to ${nextTier.name}`;
    } else {
      next.textContent = 'Top tier — nice.';
    }
  }

  function injectStyles() {
    if (document.getElementById('lido-rewards-style')) return;
    const s = document.createElement('style');
    s.id = 'lido-rewards-style';
    s.textContent = `
      #lido-rewards-pill {
        position: fixed; top: 10px; right: 10px; z-index: 2147483600;
        display: flex; align-items: center; gap: 8px;
        padding: 6px 10px 6px 8px;
        background: rgba(14,14,34,0.72);
        color: #fff;
        font: 600 11px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 6px 22px rgba(0,0,0,0.35), 0 0 12px var(--lr-glow, rgba(255,194,51,0.3));
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        cursor: pointer;
        user-select: none;
        transition: transform 120ms ease, box-shadow 120ms ease, max-width 220ms cubic-bezier(.4,1.2,.5,1);
        max-width: 44px; overflow: hidden;
      }
      #lido-rewards-pill:hover,
      #lido-rewards-pill[data-open="1"] { max-width: 280px; transform: translateY(-1px); }
      #lido-rewards-pill .lr-icon {
        width: 20px; height: 20px; border-radius: 50%;
        flex: 0 0 auto;
        background:
          radial-gradient(circle at 30% 28%, var(--lr-accent, #FFC233) 0 30%, var(--lr-primary, #FFC233) 60%, var(--lr-ring, #B45309) 100%);
        box-shadow: inset 0 -2px 0 rgba(0,0,0,0.25), 0 0 8px var(--lr-glow, rgba(255,194,51,0.5));
      }
      #lido-rewards-pill[data-tier="tome"] .lr-icon {
        animation: lrSpin 4s linear infinite;
        background: conic-gradient(from 0deg, #ff006e, #ffbe0b, #3a86ff, #8338ec, #ff006e);
      }
      @keyframes lrSpin { to { transform: rotate(360deg); } }
      #lido-rewards-pill .lr-meta { display: flex; flex-direction: column; gap: 2px; white-space: nowrap; }
      #lido-rewards-pill .lr-tier {
        font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase;
        font-size: 10px;
        color: var(--lr-accent, #FFC233);
      }
      #lido-rewards-pill .lr-sub {
        display: flex; align-items: center; gap: 6px;
        font-size: 10px; opacity: 0.85;
      }
      #lido-rewards-pill .lr-bar {
        width: 72px; height: 4px; background: rgba(255,255,255,0.14); border-radius: 2px; overflow: hidden; flex: 0 0 auto;
      }
      #lido-rewards-pill .lr-fill {
        height: 100%; background: var(--lr-accent, #FFC233); border-radius: 2px; transition: width 0.4s ease;
      }
      #lido-rewards-pill .lr-pages { font-variant-numeric: tabular-nums; opacity: 0.9; }
      #lido-rewards-pill .lr-next { font-variant-numeric: tabular-nums; opacity: 0.5; }

      /* Tier-up celebration */
      #lido-rewards-celebrate {
        position: fixed; inset: 0; z-index: 2147483647;
        display: flex; align-items: center; justify-content: center;
        background: radial-gradient(ellipse at center, rgba(14,14,34,0.88), rgba(14,14,34,0.98));
        backdrop-filter: blur(10px);
        color: #fff; text-align: center;
        opacity: 0; pointer-events: none;
        transition: opacity 240ms ease;
      }
      #lido-rewards-celebrate.show { opacity: 1; pointer-events: auto; }
      #lido-rewards-celebrate .lrc-card {
        padding: 28px 36px;
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
        border: 2px solid var(--lr-accent, #FFC233);
        box-shadow: 0 0 60px var(--lr-glow, rgba(255,194,51,0.4));
        max-width: 380px;
        animation: lrcPop 0.5s cubic-bezier(.34,1.56,.64,1);
      }
      @keyframes lrcPop {
        from { transform: scale(0.7); opacity: 0; }
        to   { transform: scale(1); opacity: 1; }
      }
      #lido-rewards-celebrate .lrc-label {
        font: 800 11px/1 -apple-system, BlinkMacSystemFont, sans-serif;
        letter-spacing: 3px; text-transform: uppercase; opacity: 0.7;
      }
      #lido-rewards-celebrate .lrc-tier {
        font: 900 44px/1 Georgia, serif; letter-spacing: -1px;
        margin: 10px 0 6px;
        color: var(--lr-accent, #FFC233);
        text-shadow: 0 2px 24px var(--lr-glow, rgba(255,194,51,0.6));
      }
      #lido-rewards-celebrate .lrc-sub {
        font: 500 14px/1.4 -apple-system, BlinkMacSystemFont, sans-serif; opacity: 0.85;
        margin-bottom: 18px;
      }
      #lido-rewards-celebrate .lrc-dismiss {
        background: var(--lr-accent, #FFC233); color: #14143A;
        border: 0; border-radius: 10px;
        padding: 10px 22px;
        font: 900 13px/1 -apple-system, BlinkMacSystemFont, sans-serif;
        text-transform: uppercase; letter-spacing: 1px;
        cursor: pointer;
      }
      #lido-rewards-celebrate .lrc-dismiss:active { transform: translateY(1px); }
      #lido-rewards-celebrate .lrc-confetti {
        position: absolute; inset: 0; pointer-events: none; overflow: hidden;
      }
      #lido-rewards-celebrate .lrc-confetti i {
        position: absolute; width: 8px; height: 12px; top: -20px;
        background: var(--lr-accent, #FFC233);
        animation: lrcFall 2.4s linear forwards;
      }
      @keyframes lrcFall {
        to { transform: translateY(110vh) rotate(720deg); opacity: 0.4; }
      }
    `;
    document.head.appendChild(s);
  }

  function injectBar() {
    if (document.getElementById('lido-rewards-pill')) { barEl = document.getElementById('lido-rewards-pill'); return; }
    barEl = document.createElement('div');
    barEl.id = 'lido-rewards-pill';
    barEl.title = 'Your Lido arcade tier — rises with page usage';
    barEl.innerHTML = `
      <div class="lr-icon"></div>
      <div class="lr-meta">
        <span class="lr-tier">Paper Pusher</span>
        <span class="lr-sub">
          <span class="lr-bar"><span class="lr-fill"></span></span>
          <span class="lr-pages">0</span> pages &middot;
          <span class="lr-next">10 to Data Wrangler</span>
        </span>
      </div>
    `;
    // Click toggles open state (useful on touch)
    barEl.addEventListener('click', () => {
      barEl.dataset.open = barEl.dataset.open === '1' ? '' : '1';
    });
    document.body.appendChild(barEl);
    renderBar();
  }

  function celebrateTierUp(t) {
    injectStyles();
    const host = document.createElement('div');
    host.id = 'lido-rewards-celebrate';
    host.innerHTML = `
      <div class="lrc-confetti"></div>
      <div class="lrc-card">
        <div class="lrc-label">Tier up</div>
        <div class="lrc-tier">${t.name}</div>
        <div class="lrc-sub">You've processed your way into <b>${t.name}</b> tier.
          ${t.nextAt != null ? 'Keep going — more unlocks ahead.' : 'You are at the peak. Respect.'}</div>
        <button class="lrc-dismiss">Let's go</button>
      </div>
    `;
    host.style.setProperty('--lr-accent', t.accent);
    host.style.setProperty('--lr-glow', t.glow);
    // confetti
    const confetti = host.querySelector('.lrc-confetti');
    const palette = [t.accent, t.color, '#FFF', t.ring];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = palette[i % palette.length];
      p.style.animationDelay = (Math.random() * 0.8) + 's';
      p.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
      confetti.appendChild(p);
    }
    const dismiss = () => {
      host.classList.remove('show');
      setTimeout(() => host.remove(), 300);
    };
    host.querySelector('.lrc-dismiss').addEventListener('click', dismiss);
    host.addEventListener('click', (e) => { if (e.target === host) dismiss(); });
    document.body.appendChild(host);
    // show next frame so CSS transition triggers
    requestAnimationFrame(() => host.classList.add('show'));
    api.track('tier_up', { tier: t.id, name: t.name });
    // auto-dismiss after 6s
    setTimeout(dismiss, 6000);
  }

  // ---------- Mount ----------
  function mount() {
    injectStyles();
    injectBar();
    api.track('arcade_open', { path: location.pathname });
    emit('state-change', { pagesLifetime: state.pagesLifetime, tier: api.tier, source: 'init' });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.LidoRewards = api;
})();
