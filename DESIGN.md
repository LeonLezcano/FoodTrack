# FoodTrack - Design System & Visual Direction

## 1. Product & Surface Mode
- **Surface Mode:** `Operate` (High-reliability industrial canteen control desk, kitchen production sheet, HACCP thermal log, and touchscreen self-service totem).
- **Primary Environment:** Factory dining halls, central industrial kitchens, and corporate HR reconciliation desks. Operators interact under fluorescent or dim plant lighting, often on touchscreen kiosks or tablets with gloved or hurried hands.
- **Dial:** `ENERGY 2 / RHYTHM 3 / MOTION 1`
  - Quiet, utilitarian authority with dense scannable telemetry and crisp status separation.
  - Zero continuous ambient animations; immediate tactile state changes (`150ms` ease-out, suppressed under `prefers-reduced-motion: reduce`).

## 2. Color System (Single Dark Industrial Theme + Print Light Override)
FoodTrack uses a single fixed dark warm-stone theme (`#141210`) engineered to minimize screen glare on factory floor totems and preserve strong contrast for thermal/dietary alerts. Cold Tailwind defaults (`slate-*`, `indigo-*`) are prohibited.

| Token / Role | Hex | Usage |
| :--- | :--- | :--- |
| `surface-canvas` | `#141210` | Page background |
| `surface-card` | `#1b1714` | Header, primary panels, modals, table containers |
| `surface-recessed` | `#12100e` | Form inputs, totem DNI display, footer (`#0e0c0a`) |
| `surface-interactive` | `#241e1a` | Secondary buttons, inactive tabs, numpad keys |
| `border-subtle` | `#2e2520` | Card borders, row dividers |
| `border-strong` | `#3d322b` | Input borders, interactive button borders |
| `accent-primary` | `#c2410c` | Primary CTA buttons with `#ffffff` text (5.67:1 contrast), hover `#9a3412` |
| `accent-highlight` | `#fb923c` | Identifiers, focus rings, brand emblem (`#ea580c` icon) |
| `text-primary` | `#fdf8f4` | Headings and primary values |
| `text-secondary` | `#e3d7cf` | Body copy, table cells, secondary controls |
| `text-muted` | `#c7b8ad` | Captions, table headers, placeholders (`>= 7.5:1` on dark surfaces) |
| `status-safe` | `#047857` / `#34d399` | Safe CTA (`#047857` + `#ffffff`, 5.48:1) and safe status text (`#34d399`) |
| `status-warning` | `#fbbf24` / `#fcd34d` | HACCP critical margin and dietary medical alerts (`Sin TACC`) |
| `status-danger` | `#fb7185` / `#fda4af` | Double-ration rejection and HACCP cold/hot chain breach |

### Print Override (`@media print`)
Dark cards automatically invert to `#ffffff` background with `#111827` text and `#d1d5db` borders so HACCP sheets and B2B reconciliation reports print cleanly. Interactive chrome uses `.no-print`.

## 3. Typography & Hierarchy
- **Font Stack:** System UI sans (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`) for instant zero-network PWA rendering.
- **Monospace Stack:** `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` with `font-variant-numeric: tabular-nums` strictly for DNIs, container IDs, temperatures, currency, and SHA-256 hashes.
- **Scale:**
  - `h1`: `1.75rem` (28px), weight `800`, tracking `-0.02em` (exactly one per active view)
  - `h2`: `1.25rem` (20px), weight `700` (section headings)
  - `h3`: `1rem` (16px), weight `700` (subsection/modal headings)
  - `body`: `0.875rem` (14px), weight `400/500`, line-height `1.5`

## 4. Layout, Components & Accessibility
- **Touch Targets:** All interactive buttons, links, tabs, inputs, and selects enforce `min-height: 44px` (`min-width: 44px` for icon controls).
- **Corner Radius:** Standardized to `rounded-lg` (buttons, inputs, tags) and `rounded-xl` (panels, modals).
- **Flat Hierarchy:** No nested bordered cards inside cards; inner sections use `divide-y divide-[#2e2520]` or `border-t border-[#2e2520]`.
- **Icons:** Inline monochrome `<svg aria-hidden="true">` icons with `stroke-width="2"`; zero decorative emojis in UI controls.
- **Keyboard & A11y:** Visible `2px` `#fb923c` `:focus-visible` rings, `role="tablist"`/`role="tab"`/`aria-selected` navigation, `role="dialog" aria-modal="true"` modals with `Escape` and backdrop dismissal, and explicit `<label for="...">` bindings on every field.
