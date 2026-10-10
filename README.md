# SplitSplash 🦊

Dividete le spese di gruppo senza account. Una persona crea una **room** e riceve una
**passphrase fatta di animali** (es. `volpe-koala-gufo-1234`); la passa al gruppo, chi la
inserisce sceglie nome e animale, e da lì basta aggiungere le spese. SplitSplash calcola saldi
e il numero minimo di rimborsi.

- Split: parti uguali (tutti o alcuni), importi esatti, quote, percentuali, rimborso diretto
- Una valuta per room, importi sempre in centesimi interi (somma garantita al centesimo)
- Semplificazione debiti, categorie, modifica/eliminazione con annulla, storico attività
- Invito via link (passphrase nel `#fragment`, non finisce nei log) e QR
- Nessun login: un token per dispositivo; da un nuovo device si "reclama" il proprio membro
- IT / EN, dark mode, installabile come PWA

## Stack

Un solo **Cloudflare Worker** serve sia l'API (Hono, `/api/*`) sia la SPA React (static assets),
con **D1** (SQLite, free tier) come database.

```
src/         React + Vite + Tailwind 4 + TanStack Query + react-router + i18next
worker/      API Hono (auth via token, rate limiting su join/creazione)
shared/      logica pura condivisa: money, split, balances, passphrase, schemi zod (+ test)
migrations/  schema D1
```

## Sviluppo locale

```bash
npm install
cp .dev.vars.example .dev.vars     # imposta PEPPER con una stringa casuale
npm run db:migrate:local
npm run dev                         # http://localhost:5173
npm test                            # test della logica (split, saldi, passphrase)
```

## Deploy su Cloudflare

```bash
npx wrangler login
npx wrangler d1 create splitsplash  # solo per un nuovo account: copia il database_id in wrangler.jsonc
npx wrangler secret put PEPPER      # stringa casuale lunga; NON cambiarla dopo (invalida passphrase)
npm run db:migrate:remote
npm run deploy
```

Il rate limiting usa il binding `ratelimits` (`JOIN_LIMITER`, 10 richieste/minuto per IP).

### GitHub Actions

`.github/workflows/deploy.yml` esegue test e build su ogni PR e, su `main`, applica le
migrazioni e fa il deploy. Servono i secret `CLOUDFLARE_API_TOKEN` (permessi Workers + D1)
e `CLOUDFLARE_ACCOUNT_ID`.

## Sicurezza, in breve

- Chi ha la passphrase entra nella room e può reclamare qualsiasi membro: va condivisa solo col gruppo.
  Da menu si può generare una nuova passphrase (la vecchia smette di funzionare).
- Nel DB la passphrase è salvata come hash con pepper (per il lookup) e cifrata AES-GCM (per
  poterla mostrare ai membri); i token dei membri solo come hash.
- Le icone PWA in `public/` sono generate da `scripts/icons.mjs`.

Istanza attuale: **https://splitsplash.pages.dev** (anche https://splitsplash.paololeoni884428.workers.dev).

`splitsplash.pages.dev` è un progetto Cloudflare Pages minimale (`pages/`) che inoltra ogni richiesta
al Worker tramite service binding: il codice e il database restano uno solo. Va ripubblicato solo se
cambia `pages/` (`npm run deploy:pages`); i normali deploy del Worker valgono anche per pages.dev.
