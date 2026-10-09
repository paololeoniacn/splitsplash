# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Cloudflare Workers (Hono API + static assets) + Cloudflare D1. Frontend React + Vite + TypeScript + Tailwind, PWA. Confirmed by the user.

## Users
Small groups sharing costs: friends on a trip, flatmates, dinners/parties/group gifts (inferred — user was unavailable to confirm). Mostly on phones, often mid-activity (at the table, at the checkout, on the road).

## Product Purpose
A shared place where a group records what each person spent; the app turns it into a budget split (equal parts, custom amounts, shares) and tells everyone who owes whom, with the fewest possible reimbursements.

## Positioning
No accounts, no installs required: one person creates a room and gets a passphrase made of animal words; whoever has the passphrase joins, picks a name and an animal, and only has to add expenses with notes.

## Operating Context
- Room = group. Access by passphrase or invite link/QR carrying it.
- Each member is identified by a name + animal emoji; identity is stored on the device, can be re-claimed from another device.
- One currency per room.

## Capabilities and Constraints
- Split modes: equal among all, equal among a subset, exact amounts, shares/percent, direct reimbursement.
- Balances, simplified debts, one-tap "settle up", categories with emoji, edit/delete expenses, activity log.
- IT + EN.
- Out of scope for now: multi-currency, realtime, CSV export, login, receipts.
- Free tier hosting constraints.

## Brand Commitments
- Name: SplitSplash (repo name; inferred as product name).
- Animal emoji are the core identity device: fun, characterful, but always professional and modern (explicit user request).
- Voice (inferred): friendly and lightly witty, sober and precise about money.

## Evidence on Hand
None. No testimonials, users or metrics exist; never fabricate them.

## Product Principles
1. Adding an expense must take seconds on a phone.
2. Numbers are never ambiguous: totals always reconcile to the cent.
3. Zero friction to join: a passphrase and a name, nothing else.
4. Personality lives in animals and microcopy, never at the expense of clarity.

## Accessibility & Inclusion
WCAG 2.2 AA baseline; emoji always paired with text names.
