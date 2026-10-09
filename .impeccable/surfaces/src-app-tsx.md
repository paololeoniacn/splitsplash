---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface: SplitSplash web app (all screens)

Mode: Operate. Mobile-first app UI used mid-activity (table, checkout, road); landing/join is the only lightly persuasive moment.
Audience/job: small groups record who paid what and settle with the fewest transfers.
Constraints: emoji animals are the identity device (paired with names); IT/EN; WCAG AA; light + dark (follows system).
Build path: code-led (no image generation available). Direction chosen unattended — user unavailable; assigned roll, assumptions stated.

## Direction contract
THESIS: Every room is a banknote series and every member is the animal portrait printed on it. Refuses the category default of a mint-green fintech list with circle avatars and a hero balance card.
OWN-WORLD: Cool security paper (#F2F4F0 ground, #10201B ink) with procedural guilloche linework; each member owns a banknote denomination hue (saffron, vermilion, viridian, cobalt, umber, violet) used for their portrait plate and their ink. Amounts in tabular grotesk numerals at banknote scale; passphrase and IDs set like serial numbers in mono. Corners 14px, hairline 1px rules, microprint labels. Dark: night-vault ink #0C1512 ground, paper-tone type.
STORY: I open the room, I see whose portrait is on which note and what each holds, I tap the big "+" and log a spend in seconds, I see one next action: who pays whom.
FIRST VIEWPORT: Room screen — top: room note strip (name, serial-style passphrase, guilloche band). Body: the members as a row of portrait plates (animal in denomination-colored guilloche rosette, name, net balance in tabular numerals, + green / − vermilion). Below: ledger of expenses. Thumb-reach primary "Aggiungi spesa" pill bottom-center. Landing: a single specimen note displaying a passphrase being minted, two actions: Create room / Enter passphrase.
FORM: Banknote / security printing (Swiss 9th-series modern note), position 5 on own list; seed key 5b1b5567. Raises — from boarding pass: one reserved alert hue (vermilion) only for "you owe", tabular segmented figures; from terminal wayfinding: Balances tab leads with the single next decision ("Paga 🦊 Volpe 12,00 €" → Settle).
SIGNATURE INTERACTION: Settle up stamps a rotated "SALDATO/SETTLED" cancellation mark onto the note while the guilloche rosette redraws; new passphrase "mints" by serial digits rolling into place. Motion: exponential ease-out, reduced-motion respected.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
