# Project Drishti — Design System & Decisions

## 1. Design thesis

Drishti's core product truth, stated in every uploaded doc, is: **no AI output reaches the UI without a resolvable explainability trace.** Everything in this design system is built to make that fact *visible*, not just true in the backend. The signature element (see §7) is built directly from that sentence — not a generic dashboard flourish.

The audience is a working police officer at a desk or a tablet in the field, often under time pressure, often cross-checking an AI-surfaced lead before acting on it. So the direction is: **quiet, fast, legible, and trustworthy** — closer to Stripe Dashboard / Linear / Palantir Gotham than to a marketing site. Glass and 3D are used as *depth and orientation cues* (what's foreground vs. ambient), never as decoration that competes with dense operational data.

## 2. Color system (as specified, extended for semantic completeness)

| Token | Hex / value | Use |
|---|---|---|
| `--bg` | `#FAFBFC` | App background |
| `--surface` | `#FFFFFF` | Solid card surfaces (tables, forms — anywhere dense text needs full contrast, per doc 07 §9 "no glass on dense data") |
| `--glass` | `rgba(255,255,255,0.55)` | Floating panels: NL query bar, notification tray, side panels |
| `--glass-border` | `rgba(255,255,255,0.25)` | Glass panel edges |
| `--primary` | `#2563EB` | Primary actions, active nav, focus rings |
| `--accent` | `#06B6D4` | **Reserved exclusively for explainability affordances** — trace icon, reasoning-path highlight, confidence-meter fill. Never used for a generic UI accent, so the moment a user sees this cyan, they know "this is AI, and it's traceable." Directly ports doc 07's `--explainability-trace` rule into the light theme. |
| `--success` | `#10B981` | Verified / confirmed states, hash match |
| `--warning` | `#F59E0B` | SLA aging, medium confidence |
| `--danger` | `#EF4444` | Critical alerts, integrity failure |
| `--ksp-gold` | `#C9A227` | Rank/authority cues only (badge chips, header insignia strip) — sparing, ports doc 07's KSP-insignia accent |
| `--ksp-maroon` | `#7A1F2B` | Alert-critical accent distinct from generic red, used only on the highest-severity alert border |
| `--text` | `#111827` | Primary text |
| `--muted` | `#6B7280` | Secondary/meta text |
| `--border` | `#E5E9F0` | Solid card borders on white surfaces |

Two accents that look similar (`--primary` blue vs `--accent` cyan) is a deliberate, load-bearing choice, not a mistake: blue = "an action you take," cyan = "an AI claim you can verify." This mirrors the RBAC/explainability philosophy running through the whole doc set.

## 3. Typography

Unchanged from the existing UI/UX Design System doc (07) — not redesigning what's already specified:

- **Inter** — UI/Latin text (dense dashboard legibility at small sizes)
- **Noto Sans Kannada** — Kannada text, first-class not translated-afterthought
- **JetBrains Mono** — case IDs, hashes, evidence identifiers, coordinates

Scale: 12 / 14 / 16 / 20 / 24 / 32 / 40, 1.5 line-height body / 1.2 headings.

## 4. Spacing & grid

4px base unit — 4/8/12/16/24/32/48/64. 12-column responsive grid. 16px card padding, 24px section gutters (as specified). Sidebar 264px expanded / 72px collapsed. Content max-width unconstrained (command-center density, not a marketing page) but with a 1440px comfortable-reading ceiling on text-heavy panels (reports, explainability copy).

## 5. Glassmorphism rules (where it is / isn't used)

Glass is reserved for **floating, temporary, or overlay surfaces** — because backdrop-blur over dense tabular police data actively hurts legibility and accessibility contrast (doc 07 §9 already says this for the existing dark theme; the same rule carries forward):

- ✅ Global NL/Voice query bar (floats over the map/content)
- ✅ Notification tray, command palette (⌘K)
- ✅ Explainability panel (side-sheet)
- ✅ Modals / confirmation dialogs
- ✅ Ambient hero panel on Login
- ❌ Case table, audit log table, evidence list — solid `--surface` with a 1px `--border`, full contrast, because these are read for minutes at a time under real operational stakes

## 6. Motion

- Page transitions: 200ms cross-fade + 8px slide, `ease: [0.22, 1, 0.36, 1]` (a soft "expo-out" — Linear/Vercel's signature easing).
- Card hover: 120ms elevation + 1.01 scale, never more (dense grids of hovering cards must not feel jumpy).
- Reasoning Path Overlay: edges illuminate in *traversal order*, ~80ms stagger per edge — this is functional, not decorative: it's literally showing you the order the graph was walked (doc 13 §7/§9, FR-38).
- Confidence meter fill: animates on mount only, respects `prefers-reduced-motion` (skips to final state).
- No parallax/scroll-jacking anywhere — this is a working tool opened dozens of times a day, not a landing page.

## 7. The signature element: the Trace Seam

One consistent, unmistakable visual device carries the explainability philosophy through every screen: a **1px cyan seam** (`--accent`) that runs along the top edge of any card containing an AI-derived value, dormant (10% opacity) until the item is hovered/focused, at which point it brightens and a small branching "trace" glyph animates in at the seam's origin point. Clicking anywhere on the seam opens the Explainability panel.

This does three jobs at once: (1) it's the "?" trace icon requirement from doc 06 §4, made ambient instead of one more icon to hunt for; (2) it visually threads every AI surface — map hotspot, alert card, similarity score, graph edge, forecast band — into one recognizable family, which is the actual product differentiator per doc 19; (3) it never appears on officer-entered data, so its *absence* is itself information (a card with no seam is unambiguously human-authored).

## 8. Components built (see /src/components)

`GlassPanel`, `Card`, `Button` (primary/secondary/destructive w/ double-confirm), `Badge` + `ProvenanceTag` (SEED/SYNTHETIC/NLP_EXTRACTED — fixed placement, non-dismissible per doc 07/14), `ConfidenceMeter` (numeric + bar, never color-only), `ExplainabilityPanel`, `KPICard`, `AlertBanner` (info/warning/critical, icon+color+text), `SkeletonBlock`, `EmptyState`, `Sidebar`, `TopBar` (NL query + role/jurisdiction chip + language toggle + notifications), `GraphCanvas` (D3 force-directed, 2D — matches the spec's explicit "Force-directed graph (D3)" choice; 3D is reserved for ambient scenes, not the operational graph, so investigators keep a fast, legible, exportable, accessible tabular-fallback-able tool), `HoloAmbient` (R3F ambient scene for Login/empty ambient ceilings).

## 9. What's included in this pass vs. next

Fully built, production-quality, no placeholders: **Login/MFA, Command Dashboard, Case List, Case Detail shell + Timeline / Evidence / Network Graph / Explainability / Copilot / Similar Cases tabs, standalone Network Graph Explorer, Alerts Feed.** The remaining screens (Reports, Officer Performance, Admin Console, Audit Log, System Health, Operation Mirror Digest, Trend Forecast, Intelligence Profile, Tasks, Intake Assist) follow the exact same component library and patterns established here — say the word and I'll build the next batch on this same foundation.
