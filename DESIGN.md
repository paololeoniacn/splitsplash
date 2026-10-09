---
name: SplitSplash
description: Shared-expense rooms printed like a banknote series; every member is the animal portrait on their own note.
colors:
  paper: "#f2f4f0"
  raised: "#fafbf8"
  ink: "#10201b"
  ink-2: "#4a5a54"
  rule: "#d3dad1"
  owe: "#b2361f"
  owe-wash: "#f8ddd5"
  owed: "#1b6a4d"
  owed-wash: "#d3eadf"
  on-wash: "#10201b"
  saffron-deep: "#855600"
  saffron-wash: "#f6e6b4"
  saffron-line: "#d39a12"
  carmine-deep: "#9b2257"
  carmine-wash: "#f5d3e1"
  carmine-line: "#c8457f"
  teal-deep: "#0e6672"
  teal-wash: "#cde8ec"
  teal-line: "#2a93a3"
  cobalt-deep: "#2a4c9c"
  cobalt-wash: "#d4ddf4"
  cobalt-line: "#4a72cf"
  umber-deep: "#774628"
  umber-wash: "#ecdacb"
  umber-line: "#a86f48"
  violet-deep: "#66389a"
  violet-wash: "#e4d7f2"
  violet-line: "#8e5fc6"
typography:
  display:
    fontFamily: "Schibsted Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 7vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.035em"
    fontFeature: "'ss01', 'cv11'"
  headline:
    fontFamily: "Schibsted Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 6vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
    fontFeature: "'ss01', 'cv11'"
  amount-hero:
    fontFamily: "Schibsted Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "'lnum', 'ss01', 'cv11'"
  amount-total:
    fontFamily: "Schibsted Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 5vw, 2rem)"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
    fontFeature: "'lnum', 'ss01', 'cv11'"
  title:
    fontFamily: "Schibsted Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Schibsted Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'ss01', 'cv11'"
  label:
    fontFamily: "Schibsted Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
  microprint:
    fontFamily: "Spline Sans Mono, ui-monospace, monospace"
    fontSize: "10.5px"
    fontWeight: 400
    letterSpacing: "0.08em"
  serial:
    fontFamily: "Spline Sans Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
  body-lg:
    fontFamily: "Schibsted Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: "Schibsted Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "Schibsted Grotesk Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.35
  emoji-tile:
    fontFamily: "system-ui, sans-serif"
    fontSize: "22px"
  overprint:
    fontFamily: "Spline Sans Mono, ui-monospace, monospace"
    fontSize: "3.4rem"
    fontWeight: 600
    letterSpacing: "0.3em"
rounded:
  focus: "6px"
  cell: "8px"
  field: "12px"
  note: "14px"
  sheet: "20px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  gutter: "20px"
  xl: "24px"
  section: "36px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-primary-large:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-danger:
    textColor: "{colors.owe}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-danger-hover:
    backgroundColor: "{colors.owe-wash}"
    textColor: "{colors.owe}"
  text-input:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 14px"
    height: "48px"
  chip-category:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  chip-category-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  transfer-card:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.note}"
    padding: "14px 16px"
  transfer-card-lead-owe:
    backgroundColor: "{colors.owe-wash}"
    textColor: "{colors.owe}"
    rounded: "{rounded.note}"
    padding: "20px"
  transfer-card-lead-owed:
    backgroundColor: "{colors.owed-wash}"
    textColor: "{colors.owed}"
    rounded: "{rounded.note}"
    padding: "20px"
  sheet:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    width: "34rem"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "10px 10px 10px 20px"
---

# Design System: SplitSplash

## Overview

**Creative North Star: "The Banknote Series"**

Every room is a series of notes printed on cool security paper, and every member is the animal portrait on one denomination. The system borrows the working vocabulary of modern security printing (procedural guilloche linework, rosette frames, mono serial numbers, tiny uppercase microprint, inked cancellation stamps) and uses it as structure, not ornament: rosettes frame people, guilloche bands rule off the room header, serials carry the passphrase, the stamp confirms a settled debt.

The surface itself stays quiet. A pale green-grey paper ground, one near-black green ink, hairline sage rules, and generous white space carry the screens; colour arrives only as denomination inks around portraits and as the two money-direction inks, vermilion and treasury green. Density is phone-first and calm: one column, 20px gutters, a single thumb-reach pill for the primary action, everything else secondary.

Dark mode is the night vault: the paper turns to a deep green-black and type to paper tone, but the portrait wash disks stay light so animal emoji keep their contrast. Motion is exponential ease-out and always skippable under reduced motion.

**Key Characteristics:**
- Security-paper neutrals with one green-black ink; colour is earned, not ambient.
- Six member denomination inks (saffron, carmine, teal, cobalt, umber, violet), each a deep/wash/line triad.
- Money direction owns two inks: vermilion for "you owe", green for "you are owed".
- Procedural SVG guilloche and rosettes as the signature linework.
- Heavy grotesk display with proportional lining figures; mono reserved for serials and microprint.
- Pills for actions, 14px notes for cards, 20px sheets rising from the bottom.

## Colors

A cool paper-and-ink palette with six denomination inks for people and two reserved inks for the direction of money.

### Primary
- **Vault Ink** (`ink`): text, primary pill buttons, focus outlines, selection background, the active tab underline, selected category chips. The one voice of the interface.

### Secondary (money direction)
- **Seal Vermilion** (`owe`): negative balances, "you owe" headlines, errors, invalid field rings, the text caret, the amount field's focus underline. Also the seal ink of the print world: the passphrase serial, the wordmark's centre dot and the faint SPECIMEN overprint.
- **Vermilion Wash** (`owe-wash`): ground of the lead transfer card when you owe, of inline error alerts, and of the danger button's hover.
- **Treasury Green** (`owed`): positive balances, "owes you" headlines, balance-reconciles hints, the inked SALDATO/SETTLED cancellation mark.
- **Green Wash** (`owed-wash`): ground of the lead card when you are owed or all settled.

### Tertiary (denomination inks)
Each member is assigned `ink-0`…`ink-5` by join order. Every ink is a triad: **deep** (ink on text), **wash** (the portrait disk and selected-member chip ground), **line** (the rosette and guilloche strokes).
- **Saffron** (`saffron-*`, ink-0)
- **Carmine Rose** (`carmine-*`, ink-1)
- **Teal** (`teal-*`, ink-2)
- **Cobalt** (`cobalt-*`, ink-3)
- **Umber** (`umber-*`, ink-4)
- **Violet** (`violet-*`, ink-5)

In dark mode the triads shift lighter (deep becomes a pastel, line stays mid-tone) while the wash stays paper-light; night values live in the sidecar.

### Neutral
- **Security Paper** (`paper`): the page ground; also the translucent backing of sticky headers (92% with backdrop blur).
- **Note Stock** (`raised`): cards, inputs, sheets, secondary buttons, the specimen and invite notes.
- **Faded Intaglio** (`ink-2`): secondary text, hints, inactive tabs, microprint, icon strokes.
- **Hairline Sage** (`rule`): 1px rules, list dividers, input and card rings, the empty-state rosette.
- **Wash Ink** (`on-wash`): text placed on any wash. Fixed dark in both schemes because washes never darken.

### Named Rules
**The Reserved Ink Rule.** Vermilion and green mean money direction. No member denomination ink may sit near either hue; that is why ink-1 is carmine rose and ink-2 is teal.

**The Light Wash Rule.** Portrait and chip washes stay paper-light in both schemes, and any text on a wash uses Wash Ink, never the scheme's `ink`.

**The Seal Exception.** Vermilion may appear outside a money context only as print-world seal ink: the mono serial, the wordmark dot, the specimen overprint. Never on a sans-serif figure that is not a debt.

## Typography

**Display Font:** Schibsted Grotesk Variable (with ui-sans-serif, system-ui)
**Body Font:** Schibsted Grotesk Variable, stylistic sets `ss01` and `cv11` on globally
**Label/Mono Font:** Spline Sans Mono 400/600 (with ui-monospace)

**Character:** A dense, newspaper-born grotesk set extra-bold and tightly tracked for names and amounts, the way a note prints its value large; a technical mono carries only what a press would number.

### Hierarchy
- **Display** (800, clamp(2.5rem, 7vw, 4.5rem), 0.98): landing headline only, `text-wrap: balance`.
- **Headline** (800, clamp(1.75rem, 6vw, 2.5rem), 1.05, -0.03em): room name. Single-task form pages use a fixed 2rem at the same weight and tracking.
- **Amount** (700–800, 2.75rem in the expense entry field, clamp(1.5rem, 5vw, 2rem) for the room total, 15px bold under portraits): every money figure carries the lining-figure numeral class.
- **Title** (700, 1.125rem): section headings ("Saldi per persona"), sheet titles, empty-state titles at 1.25rem.
- **Body** (400–600, 1rem, 1.5): list rows, ledgers; landing lede at 1.125rem relaxed in Faded Intaglio, capped at 46ch.
- **Label** (600, 0.875rem): field labels, legends, chips, small buttons; metadata lines at 13px in Faded Intaglio.
- **Microprint** (mono 400, 10.5px, 0.08em, uppercase, Faded Intaglio): labels attached to a value (TOTALE SPESO, SERIE) and date group headers in the ledger.
- **Serial** (mono 600, 13–28px): the animal-word passphrase, split at hyphens and never broken mid-word.

### Named Rules
**The Proportional Figures Rule.** Amounts use lining, proportional figures. Never switch on `tnum`: this face's tabular set widens the decimal comma and breaks `12,00 €`. Align columns by right-aligning, not by tabular width.

**The Press Numbers Rule.** Mono is for things a printing press would number (serials, microprint, the cancellation mark). Names, amounts and headings are always the grotesk.

## Layout

One column, phone-first, 20px side gutters (12px for the horizontally scrolling portrait strip so the rosettes bleed toward the edge). Containers by job: single-task form pages 32rem, the room 48rem, the landing 72rem with a two-column grid (copy 1.05fr, specimen 1fr) from 1024px up. Sheets are 34rem wide.

Rhythm runs on the 4px grid: 8–12px inside rows, 24px between ledger day groups and form fields, 36px between balance sections. Room screens stack a sticky header, the room note strip (name with right-aligned total, serial, a 16px guilloche band in the viewer's own ink), the portrait strip (92px columns, 68px portraits), sticky tabs, then content with 128px bottom padding so the fixed bottom-centre "Add expense" pill never covers the last row. Respect `env(safe-area-inset-*)` on every fixed edge.

## Elevation & Depth

Mostly flat paper. Structure comes from hairline rings and tonal steps (paper → note stock → wash); shadows are reserved for things that physically float above the page: the primary pill, the fixed add button, the toast, sheets, and the two printed notes (specimen, invite). All shadows are soft, negative-spread, and tinted with Vault Ink rather than pure black. The sidecar holds the exact values.

### Named Rules
**The Floating Paper Rule.** A shadow means "this is a separate sheet of paper or a pressable seal". Cards in a list are flat with a 1px Hairline Sage ring; never shadow a list card.

## Shapes

Two silhouettes dominate: the **pill** for every action, toggle, chip and toast, and the **note** (14px corners) for cards, lists-in-a-frame and printed notes. Inputs and menu rows sit between at 12px; small inline numeric inputs at 8px. Sheets are 20px on top only on phones, all four corners from 640px. Portraits are circles framed by a procedural rosette (nine 12-lobe sine rings plus an inner 24-lobe band) around a wash disk 56% of the frame's diameter. Borders are 1px hairlines; dashed hairlines mark transfers and the invite note's tear line. The landing specimen note is tilted -1.5° and straightens on hover.

## Components

### Buttons
Confident ink pills that press in.
- **Shape:** full pill; heights 36 / 44 / 56px (sm / md / lg).
- **Primary:** Vault Ink fill, paper text, semibold 15px, soft ink shadow; hover drops to 90% ink.
- **Secondary:** Note Stock with a Hairline Sage ring; hover darkens the ring to 40% ink.
- **Ghost / Danger:** text only; hover lays a 5% ink tint (ghost) or Vermilion Wash (danger).
- **States:** `active` scales to 0.98; disabled 45% opacity; loading swaps in a spinning ring icon and sets `aria-busy`.
- **Icon button:** 40px circle, 6% ink tint on hover; always labelled.

### Chips
- **Category chips:** pill, 14px label with a 16px line icon, Hairline Sage ring; selected turns solid Vault Ink with paper text.
- **Member chips:** pill with a MiniPortrait on the left, carrying the member's ink class; selected lays the member's wash with Wash Ink text and a 2px ring in their line colour.

### Cards / Containers
- **Corner Style:** 14px note.
- **Background:** Note Stock with a 1px Hairline Sage ring for ordinary transfer cards and member pick lists; Vermilion or Green Wash, ringless, for the lead decision card.
- **Shadow Strategy:** flat (see The Floating Paper Rule).
- **Internal Padding:** 14×16px ordinary, 20px for the lead card.

### Inputs / Fields
- **Style:** 48px tall, Note Stock fill, 12px corners, 1px Hairline Sage ring, 16px text, placeholder at 70% Faded Intaglio. Label above in 14px semibold; hint or error below.
- **Focus:** ring thickens to 2px Vault Ink. The caret is vermilion everywhere.
- **Error:** ring and message turn vermilion; message has `role="alert"`.
- **Amount entry:** no box. A 2px Vault Ink underline beneath a 2.75rem bold figure with the currency symbol in Faded Intaglio; the underline turns vermilion on focus.

### Navigation
- **Room tabs:** text tabs (15px semibold) on a sticky translucent paper bar with a bottom hairline; active is Vault Ink with a 2px ink underline, inactive Faded Intaglio.
- **Segmented control:** pill track at 6% ink, the selected segment is a Note Stock pill with a faint shadow.
- **Language toggle:** microprint code in a hairline pill.

### Portrait (signature)
The member's identity plate: animal emoji inside a wash disk inside a rosette drawn in their line ink. Full portraits (44–96px) appear in the room strip, the lead transfer card, the specimen and empty states; MiniPortraits (22–40px, wash disk with a 60% line ring, no rosette) appear in ledger rows and chips. The animal is always paired with a written name.

### Guilloche band and Serial (signature)
A full-width band of 5–7 interleaved sine strokes, drawn in a denomination line ink at 55–70% opacity, heads and foots printed notes and underlines the room header. The passphrase is set as a serial in mono semibold; when freshly minted, characters roll through random letters and digits into place over about one second.

### Sheet
Native `<dialog>` that rises from the bottom (380ms) over a 45% green-black backdrop that fades in (240ms). Header with title and close button over a hairline; scrolling body; optional footer pinned with safe-area padding. Centred on wider screens.

### Settle stamp (signature)
Marking a transfer paid fades the card to 40%, redraws both lead portraits' rosettes stroke by stroke (900ms, 35ms stagger), and stamps an inked double-ruled cancellation mark in Treasury Green across the card: rotated -9°, mono SALDATO/SETTLED with the date and SPLITSPLASH in small caps, edges roughened by a turbulence displacement filter, multiply-blended on light and screen-blended on dark. It lands from 1.8× scale and blur in 620ms.

### Toast
Ink pill floating above the add button, paper text, optional inline undo action as a translucent paper pill; rises in and auto-dismisses.

## Do's and Don'ts

### Do:
- **Do** give every member a denomination ink class and use its triad together: line for the rosette, wash for the disk, deep for any tinted text.
- **Do** keep vermilion and green for the direction of money, and colour signed balances by sign (green positive, vermilion negative, Faded Intaglio at zero).
- **Do** put text on washes in Wash Ink (#10201b), in both schemes.
- **Do** set every amount with lining proportional figures and right-align amount columns.
- **Do** use exponential ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`) for entrances and honour reduced motion by collapsing all animation to 1ms.
- **Do** lead the Balances view with the single next decision on a wash card, then list the rest flat.

### Don't:
- **Don't** turn on tabular figures for amounts; the tabular comma is too wide in this face.
- **Don't** add a seventh member ink in the red or green family; it would read as debt or credit.
- **Don't** darken portrait washes in dark mode; dark animals (🦓 🐺) vanish on dark disks.
- **Don't** set names, headings or amounts in the mono; it belongs to serials and microprint.
- **Don't** put a microprint label above a headline as a kicker; microprint labels a value or groups a list.
- **Don't** shadow list cards or use hard offset shadows; elevation is only for floating paper and pressable pills.
