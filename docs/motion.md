# Motion design language

Motion is a first-class brand layer at Skill Me, alongside color and shape. This is the
language: the principles, the tokens, and the per-component spec. The single source of
truth lives in [`styles/tokens.css`](../styles/tokens.css) under `--- Motion ---`; the
living, interactive reference is the [`/motion`](../app/motion/page.tsx) page.

## Principles

1. **Motion has a job.** Every animation must direct attention, show cause and effect,
   express hierarchy, or soften a change. If a motion does none of these, cut it.
2. **Curve matches behavior.** Entrances decelerate (`--ease-entrance`), exits accelerate
   (`--ease-exit`), on-screen A→B moves ease both ends (`--ease-move`), lively pops
   overshoot (`--ease-overshoot`). Linear is for perpetual loops only.
3. **Duration scales with size and travel, not taste.** Small/near is fast; large/far is
   slower. Nothing interactive exceeds ~560ms.
4. **Exits are faster than entrances** (~0.75×) — the user is done with the element.
5. **Stage, then stagger.** Lead with the most important element; let supporting ones
   follow. Cascade lists/grids by one stagger step rather than flashing them in at once.
6. **Animate `transform` and `opacity`.** They are GPU-friendly. Avoid animating `width`,
   `height`, `top`, `left` in production paths — they trigger layout and stutter.
7. **Reduced motion is non-negotiable.** A global net collapses all motion under
   `prefers-reduced-motion: reduce`; content is never withheld or trapped hidden.

## Tokens

### Duration (`--dur-*`)

| Token | Value | Use |
| --- | --- | --- |
| `--dur-instant` | `0ms` | discrete state change, no tween |
| `--dur-fast` | `120ms` | hovers, color shifts, toggles, chips, nav |
| `--dur-base` | `200ms` | card lift, most transitions (default) |
| `--dur-slow` | `320ms` | modals, sheets, route transition |
| `--dur-deliberate` | `560ms` | scroll reveals, first-run hero |

### Easing (`--ease-*`)

| Token | Curve | Job |
| --- | --- | --- |
| `--ease-entrance` | `cubic-bezier(0.16, 1, 0.3, 1)` | **Signature.** Appearing, lifting, revealing. |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Leaving — accelerate away. |
| `--ease-move` | `cubic-bezier(0.4, 0, 0.2, 1)` | On-screen A→B; both ends anchored. |
| `--ease-overshoot` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Pops, confirmations — a touch past target. |
| `--ease-standard` | `ease` | Neutral micro color fades. |
| `--ease-linear` | `linear` | Perpetual loops ONLY (marquee, glow sweep). |

### Choreography

| Token | Value | Use |
| --- | --- | --- |
| `--stagger-step` | `32ms` | per-index cascade step for lists/grids (callers cap the multiplier) |

These are also exposed as Tailwind utilities (`ease-entrance`, `duration-base`, …) in
[`tailwind.config.ts`](../tailwind.config.ts) so surfaces styled with utility classes share
the same vocabulary as the CSS component layer.

## Component motion spec

Every entry: **element · trigger · duration · easing · intent · reduced-motion fallback.**

| Element | Trigger | Duration | Easing | Intent | Reduced motion |
| --- | --- | --- | --- | --- | --- |
| Button color/shadow | hover | `--dur-fast` | `--ease-standard` | responsive feedback | instant cut |
| Button transform (press) | `:active` → release | `--dur-fast` | `--ease-overshoot` | tactile, sprung release | instant cut |
| Primary button lift | hover | `--dur-fast` | `--ease-overshoot` | reads as raised/reachable | no transform |
| Card lift | hover | `--dur-base` | `--ease-entrance` | signals interactivity | no transform |
| Card accent top-edge | hover | `--dur-base` | `--ease-entrance` | secondary action reinforcing the lift | no transform |
| Input focus ring | focus | `--dur-fast` | `--ease-standard` | locates the active field | instant ring |
| Chip | hover / select | `--dur-fast` | `--ease-standard` | filter state feedback | instant cut |
| Scroll reveal | enters viewport (IO) | `--dur-deliberate` | `--ease-entrance` | storytelling on scroll | content shown, no transition |
| Grid stagger | enters viewport (IO) | `--dur-deliberate` + `index×32ms` (cap 8) | `--ease-entrance` | catalog arrives in sequence | content shown |
| Hero load-in | mount | `--dur-deliberate`, staged 0/80/160/240ms | `--ease-entrance` | hero assembles top-down | no animation |
| Route transition | pathname change | `--dur-slow` | `--ease-entrance` | app-like continuity between pages | instant cut |
| Nav underline | hover / active route | `--dur-fast` | `--ease-move` | wayfinding | instant |
| Magnetic CTA return | pointer leave | `--dur-slow` | `--ease-entrance` | sprung settle to rest | no transform |
| Spotlight field | pointer over cluster | `--dur-slow` | `--ease-standard` | lights the tile being read | hidden |
| Marquee / glow sweep | always | bespoke loop | `--ease-linear` | ambient liveness | paused |

## Implementation map

- **Tokens:** `styles/tokens.css` (`--- Motion ---`).
- **Component CSS + reduced-motion net:** `app/globals.css`.
- **Scroll reveal + stagger:** `components/Reveal.tsx` (`index` prop, capped at 8).
- **Route transition:** `components/RouteTransition.tsx`, mounted in `app/layout.tsx`.
- **Nav underline:** `components/NavLink.tsx` + `.nav-link` in `app/globals.css`.
- **Living reference:** `app/motion/page.tsx` + `components/MotionShowcase.tsx`.

## Adding new motion

1. Reach for an existing token — do not hand-type a cubic-bezier or a raw `ms` value.
2. Pick the curve by the job (entrance / exit / move / overshoot / loop), then the duration
   by size and travel.
3. Animate `transform`/`opacity` only.
4. The global reduced-motion net tames it automatically. Add a *targeted* override in the
   `@media (prefers-reduced-motion: reduce)` block only when the element needs a specific
   fallback (e.g. it must stay visible, or convey information without motion).
5. Add a row to the spec table above and, if it is a reusable pattern, a panel on `/motion`.
