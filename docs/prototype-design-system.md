# Prototype design system

Extracted from the interactive prototype at
`https://veriq-design-prototype.pearlymedia.chatgpt.site` by reading its stylesheet in the browser, not
by eye. This is the reference `veriq-next` is being matched to, screen by screen.

The prototype is Next.js + Tailwind v4 with shadcn-style semantic tokens, plus a hand-written component
layer. `veriq-next` is Tailwind v3, so the tokens come across as CSS custom properties mapped into the
Tailwind config, and the component layer as real components.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--background` | `#070b14` | page background |
| `--foreground` | `#f8fafc` | body text |
| `--card`, `--popover`, `--muted` | `#111827` | raised surfaces |
| `--card-foreground`, `--popover-foreground` | `#f8fafc` | text on those |
| `--muted-foreground` | `#94a3b8` | secondary text |
| `--primary` | `#10b981` | action and success |
| `--primary-foreground` | `#070b14` | text on primary |
| `--secondary` | `#182235` | secondary surface |
| `--accent` | `#18342e` | accent surface |
| `--destructive` | `#fb7185` | errors |
| `--border` | `#ffffff16` | hairlines (white 8.6%) |
| `--input` | `#ffffff24` | input borders (white 14%) |
| `--ring` | `#10b981` | focus ring |
| `--radius` | `.75rem` | base radius (xs .125, sm .25, md .375, lg .5, xl .75) |
| `--spacing` | `.25rem` | spacing unit |

Sidebar has its own set: `--sidebar #0b111d`, `--sidebar-foreground #94a3b8`,
`--sidebar-accent #10b98115`, `--sidebar-accent-foreground #f8fafc`, `--sidebar-primary #10b981`,
`--sidebar-primary-foreground #070b14`, `--sidebar-border #ffffff16`, `--sidebar-ring #10b981`.

## Typography

- Body and UI: **Inter**, 16px, line-height 1.6.
- Display: **Sora** — `h1` is SemiBold (600) at 27.2px/34px with `-0.035em` tracking.
- Weights available: 400 normal, 500 medium, 600 semibold.

**Buttons are Inter 600**, not Inter Medium. This contradicts Master Blueprint §7, which says Inter
Medium for buttons. The prototype wins: it is the design reference.

## Component layer

```css
.btn            { background:#10b981; color:#070b14; border:1px solid #0000; border-radius:9px;
                  padding:12px 20px; font-size:.9rem; font-weight:600; line-height:1.4;
                  display:inline-flex; align-items:center; justify-content:center; gap:9px;
                  white-space:nowrap }
.btn.secondary  { background:#ffffff06; color:#f8fafc; border-color:#ffffff24 }
.btn.ghost      { background:none; color:#94a3b8; padding:8px }
.btn.small      { padding:8px 12px; font-size:.85rem }

.panel          { background:#111827; border:1px solid #ffffff12; border-radius:16px; padding:28px }
                /* narrow viewports: padding:21px */

.eyebrow        { color:#10b981; text-transform:uppercase; font-size:.75rem; font-weight:600;
                  letter-spacing:.18em }

.badge.amber    { color:#fcd34d; background:#fbbf2410; border-color:#fbbf2430 }
.badge.red      { color:#fda4af; background:#fb718510; border-color:#fb718530 }
.notice.amber   { background:#fbbf2409; border-color:#fbbf2425 }
.green          { color:#34d399 }
```

Layout and page furniture:

```css
.container         { max-width:1280px; margin:auto; padding:50px 40px }
.section           { padding:40px 0 }
.page-head         { margin-bottom:28px }
.back              { color:#94a3b8; font-size:.875rem; gap:8px; margin-bottom:25px; display:inline-flex }
.brand             { font-size:1.6rem; letter-spacing:-.07em; gap:10px; display:flex }  /* span span → #10b981 */
.navlinks          { color:#94a3b8; font-size:.9rem; gap:30px; display:flex }
.workspace-header  { height:80px; padding:0 35px; border-bottom:1px solid #ffffff14; gap:16px }
                   /* narrow: height:65px; padding:0 20px */
.sidebar-brand     { padding:26px 20px }
.dash-stat         { font-family:Sora; font-size:2rem; margin:12px 0 3px }
.footer            { border-top:1px solid #ffffff15; padding:45px 5% 25px }
```

Property and listing pieces:

```css
.searchbar      { background:#111827; border:1px solid #ffffff1a; border-radius:14px; padding:20px;
                  display:grid; grid-template-columns:1.2fr 1fr auto; gap:15px; margin-top:26px }
.property-card:hover { border-color:#10b98170; transform:translateY(-4px) }
.card-image     { height:230px }               /* img: object-fit:cover, transition:transform .6s */
.card-image .badge { background:#070b14d9; border-color:#ffffff20; top:14px; left:14px; position:absolute }
.card-body      { padding:21px }
.detail-image   { height:400px; border-radius:16px; object-fit:cover }  /* narrow: 280px */
.gallery        { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin:20px 0 }
.unit           { background:#070b1444; border:1px solid #ffffff18; border-radius:10px; padding:17px;
                  margin:12px 0 }
.locked         { background:linear-gradient(140deg,#111827,#0b141d); border:1px dashed #ffffff25;
                  border-radius:14px; padding:48px 25px; text-align:center; display:flex;
                  flex-direction:column; align-items:center }
```

Flow and review pieces:

```css
.stepbar button        { flex:1; padding:13px 0; font-size:.85rem; color:#94a3b8; text-align:left;
                         background:none; border:0; border-top:3px solid #ffffff20 }
.stepbar button.done   { border-color:#10b98166 }
.checkout              { display:grid; grid-template-columns:1.15fr 1fr; gap:28px; max-width:900px;
                         margin:auto }
.price-line.total      { font-size:1.3rem; font-weight:600; padding:20px 0; border-bottom:0 }
.timeline              { border-left:1px solid #10b98150; margin-left:8px; padding-left:25px }
.timeline > div:before { content:""; background:#10b981; border-radius:50%; width:9px; height:9px;
                         position:absolute; top:6px; left:-30px }
.review-card           { background:#111827; border:1px solid #ffffff18; border-radius:12px; padding:22px;
                         display:flex; flex-direction:column; gap:12px }
.audit                 { color:#94a3b8; font-size:.85rem; padding:14px 0;
                         border-bottom:1px solid #ffffff10 }
.chip-icon             { width:45px; height:45px; border-radius:12px; color:#10b981;
                         background:#10b98114; border:1px solid #10b98125; display:grid;
                         place-items:center }
.checkline             { display:flex; align-items:start; gap:12px; font-size:.9rem; cursor:pointer }
.tabs-list             { background:#111827; border:1px solid #ffffff18; padding:6px; height:auto;
                         flex-wrap:wrap }
.tabs-list button[data-state=active] { color:#6ee7b7; background:#10b9811a }
.categorybar button.active { color:#6ee7b7; background:#10b98112; border-color:#10b981 }
.auth                  { max-width:480px; margin:30px auto 80px }
```

## Notes

- Borders are always white at low alpha rather than a solid grey — `#ffffff12` on panels, `#ffffff18`
  on inner surfaces, `#ffffff24` on inputs. This is what gives the depth; solid greys will look wrong.
- Radii are not uniform: buttons 9px, panels 16px, review cards 12px, units 10px, search bar 14px.
- The locked state is a dashed border on a gradient, which is the visual signal for the unlock boundary.
- Amber and red appear as badge and notice variants only; the palette itself has no warning colour
  beyond `--destructive`.
