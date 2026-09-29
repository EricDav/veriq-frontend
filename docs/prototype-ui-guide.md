# Prototype UI guide

What to reach for when rebuilding a screen against the prototype. Every value here comes from
[`prototype-design-system.md`](./prototype-design-system.md), which was read out of the prototype's own
stylesheet — so if something looks off, check the primitive against that file rather than nudging a
number in a screen.

```ts
import { Button, Panel, PageHead /* … */ } from '@/components/ui';
```

## Tokens

The prototype's custom properties live on `:root` in `app/globals.css` and are mapped into Tailwind, so
`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`,
`text-primary-foreground`, `border-border`, `border-input`, `ring-ring` and the `*-sidebar-*` set all
work as utilities. The app is dark only — there is no light theme and nothing should add one.

The `navy` / `gold` / `veriq` scales still exist and still work; screens that have not been migrated
yet use them. Use the semantic tokens in anything new.

**Gotcha.** The tokens are hex values with their own alpha (`--border` is `#ffffff16`), and Tailwind v3
cannot apply an opacity modifier to a hex-valued custom property. `bg-card/50` will silently do
nothing. Where the prototype uses a tint that is not itself a token, write the exact 8-digit hex:
`bg-[#10b98112]`, `border-[#ffffff18]`.

Radii are deliberately not uniform: `rounded-btn` (9px), `rounded-unit` (10px), `rounded-review`
(12px), `rounded-searchbar` (14px), `rounded-panel` (16px).

The UI type ramp lands between Tailwind's steps, so it has its own names: `text-ui-xs` (0.78rem,
badges), `text-ui-sm` (0.85rem, small buttons and dense rows), `text-ui-md` (0.9rem, buttons and body
UI).

The prototype changes layout at **760px**, not at a Tailwind breakpoint. That is the `wide:` screen,
written mobile-first: the base classes are the narrow ones and `wide:` restores the desktop value.
`p-[21px] wide:p-7` is the panel's padding, exactly as the prototype has it.

## Primitives

| Use | For | Example |
|---|---|---|
| `Button` | Any action. Variants `primary`, `secondary`, `ghost`; sizes `default`, `small`. | `<Button onClick={unlock}>Unlock report</Button>` |
| `Button asChild` | An action that is really navigation — keeps link semantics. | `<Button asChild><Link href="/dashboard/browse">Browse</Link></Button>` |
| `Panel` | The raised surface every block sits on. | `<Panel as="section">…</Panel>` |
| `panelClass` | The same skin on something interactive, without nesting a button in a div. | `<button className={panelClass}>…</button>` |
| `PageHead` | The one `<h1>` a screen gets, with its eyebrow, lead and page-level actions. | `<PageHead eyebrow="Renter workspace" title="Wallet" lead="Credit and unlock history." />` |
| `Eyebrow` | The emerald kicker above a *section* title (`PageHead` already has one). | `<Eyebrow>Verification</Eyebrow>` |
| `BackLink` | The step back out of a detail screen. | `<BackLink href="/dashboard/refunds">All refunds</BackLink>` |
| `BackToDashboard` | The route back to the role's dashboard home. Already in the shell header. | `<BackToDashboard />` |
| `StatCard` | A dashboard figure. `href` makes the whole card one link. | `<StatCard label="Wallet credit" value={formatCurrency(0)} hint="View details →" href="/dashboard/wallet" />` |
| `Badge` | Status on a row or card. Tones `success`, `neutral`, `amber`, `red`. | `<Badge tone="amber">Awaiting review</Badge>` |
| `Notice` | A standing explanation attached to a decision. Tones `neutral`, `amber`. | `<Notice tone="amber" title="Refund window closes in 3 days">…</Notice>` |
| `LockedBlock` | The unlock boundary — dashed border on a gradient. | `<LockedBlock title="Full report is locked" action={<Button>Unlock ₦2,000</Button>}>…</LockedBlock>` |
| `UnitRow` | One unit inside a property; `onSelect` makes it selectable. | `<UnitRow selected={id === picked} onSelect={() => pick(id)}>…</UnitRow>` |
| `Timeline` / `TimelineItem` | What happened to a case, in order. | `<Timeline><TimelineItem meta="12 Jan" title="Submitted" /></Timeline>` |
| `ReviewCard` | One item in a grid of comparable things. | `<ReviewCard number="01" title="Verify the address">…</ReviewCard>` |
| `ChipIcon` | The 45px emerald tile beside a row's title, or initials. | `<ChipIcon><Wallet className="h-5 w-5" /></ChipIcon>` |
| `StepBar` | Where the user is in a multi-step flow. | `<StepBar label="Unlock checkout" steps={STEPS} currentId={step} onSelect={goBack} />` |
| `AuditRow` | One line of a ledger or activity list. | `<AuditRow meta="2 Feb, 14:02">Refund approved by Ada</AuditRow>` |
| `CheckLine` | A checkbox and the sentence it agrees to. | `<CheckLine id="clause-1" checked={ok} onCheckedChange={setOk}>I confirm…</CheckLine>` |
| `Select` / `FieldShell` | Form controls. Selects always start blank on a placeholder. | `<Select id="state" label="State" options={states} value={v} onValueChange={setV} />` |
| `DateRangeFields` | Check-in / check-out for a Short Let. | `<DateRangeFields idPrefix="stay" value={stay} onChange={setStay} />` |
| `Modal` / `ConfirmDialog` | Anything the user must answer before continuing. | `<ConfirmDialog isOpen={o} onClose={c} onConfirm={f} message="…" />` |
| `useToast` | Transient confirmation of something that just happened. | `toast.success('Refund requested')` |
| `LoadingSpinner` / `PageLoader` | While a screen or a control is waiting. | `<PageLoader />` |

Things that are **not** primitives, on purpose: the search bar, property cards, the gallery and the
checkout grid are screen-specific layouts. Build them from `Panel` and the tokens; if a second screen
needs the same thing, promote it then.

## The workspace shell

`app/dashboard/layout.tsx` guards the route and renders `WorkspaceShell`
(`components/workspace/`). Every authenticated screen therefore already has the sidebar, the header,
the breadcrumb, the notification bell and the route back to the dashboard — **do not render your own
page chrome**. A screen renders its `PageHead` and its content, nothing more.

- **Nav** is data, in `components/workspace/nav.ts`. A new screen gets into the sidebar by adding a
  `NavItem` to the right role's `roleItems` (what that role came here to do) or `commonItems` (below
  the divider, the same for everyone). The active item is matched by prefix and carries
  `aria-current="page"`.
- **Breadcrumb** is derived from the pathname in `components/workspace/breadcrumb.ts`. A crumb takes
  its label from the matching nav item, so a new route reads properly as soon as it is in `nav.ts`;
  an id segment becomes "Details". The prototype renders `Dashboard / dashboard` — it appends the raw
  slug to a fixed root crumb — which is a bug, and is not reproduced here.
- **The body** is `max-w-[1400px]`, `18px` padding below 760px and `35px` above, centred. A screen
  does not add its own outer container.

## Where we deliberately diverge from the prototype

The prototype is the design reference, not an oracle. Three places where copying it would be wrong —
please keep these when you rebuild a screen, or the defect comes back:

1. **The breadcrumb.** The prototype renders `Dashboard / dashboard`: it appends the raw route slug to
   a fixed root crumb, so the current page is named twice, in two cases. The shell builds a real trail
   instead (`Dashboard / Wallet`) in `components/workspace/breadcrumb.ts`. Nothing for a screen to do —
   just don't render your own.
2. **"Assigned properties", never "Your properties".** The prototype's Agent dashboard labels its
   property tile *Your properties*, which misstates the role: an Agent verifies and publishes on an
   Operator's behalf and never owns the property. Use **Assigned properties** on any Agent-facing
   count of properties. The prototype's own neighbouring tile says *Assigned Operators*, so this is
   also the more consistent wording. "My properties" stays correct for a Property Operator, who does
   own them.
3. **Availability alerts.** Master Blueprint §5 requires notify-me watches, and the prototype has
   nowhere to reach them. The renter nav therefore carries an **Availability alerts** item pointing at
   `/dashboard/availability-notifications`, which the prototype has no counterpart for. Keep it.

## Two rules worth keeping

**Buttons are Inter SemiBold (600).** Master Blueprint §7 says Inter Medium; the prototype uses 600
and the prototype is the design reference. `Button` encodes this — do not re-specify a weight on it.

**Borders are white at low alpha, never a solid grey.** `#ffffff12` on panels, `#ffffff18` on inner
surfaces, `#ffffff24` on inputs. That is what gives the dark surfaces their depth; a solid grey border
reads as a mistake immediately.
