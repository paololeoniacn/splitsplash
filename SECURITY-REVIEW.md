# Security review: SplitSplash

Data: 2026-10-13. Ambito: intero repository e deploy live (`splitsplash.pages.dev`, `*.workers.dev`).
Metodo: revisione statica del codice, controllo degli header di risposta live e della storia git per segreti committati.

## Stato: risolto (2026-10-13)

Tutti i finding sono stati corretti e pubblicati in produzione. I dati esistenti non sono stati toccati.

| # | Correzione |
|---|------------|
| 1 | Le nuove passphrase hanno 5 parole tra animali e habitat + 4 cifre (~53 bit invece di ~36). In più, dopo 12 tentativi sbagliati all'ora per indirizzo (40 per rete) il join si blocca fino all'ora successiva. Il rate limit ora agisce su tre livelli: per rete (IPv6 /64, IPv4 singolo indirizzo) 10/min, per blocco (/48 o /24) 30/min, globale 600/min. Le vecchie passphrase a 3 parole funzionano ancora, ma la UI le segnala come "formato vecchio" e invita a rigenerarle. |
| 2 | I token scadono dopo 90 giorni di inattività e vengono cancellati. Quando si rigenera la passphrase si può scegliere "Disconnetti anche tutti gli altri dispositivi", che revoca tutti i token della room tranne il proprio. |
| 3 | Su tutte le risposte API: `nosniff`, `no-store`, `Referrer-Policy`, `X-Frame-Options`. Sugli asset statici (`public/_headers`): CSP stretta, HSTS, `Permissions-Policy`, COOP. |
| Nota | Limite di 50 membri e 5000 spese per room (`room_full`, `too_many_expenses`). |

Il resto del documento descrive i finding come trovati in origine.

## Riepilogo

| # | Severità | File | Righe | Vulnerabilità | Confidenza |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | `worker/index.ts`, `shared/passphrase.ts`, `wrangler.jsonc` | 27-31, 50-54, 93-98; 2-37; 20-26 | Passphrase indovinabile con brute-force distribuito (~36 bit, lookup su tutte le room insieme, rate limit per singolo IP) | 7/10 |
| 2 | 🟡 MEDIUM | `worker/index.ts` | 105-110, 126-139, 154-163 | Token che non scadono e non si possono revocare: chi è entrato una volta resta dentro anche dopo il cambio di passphrase | 7/10 |
| 3 | ⚪ LOW | `worker/index.ts`, `wrangler.jsonc` | n/d | Mancano gli header di sicurezza (CSP, frame-ancestors, nosniff, Referrer-Policy, HSTS) | 9/10 |

Nota (sotto soglia): un membro può creare membri e spese senza limiti, e `GET /api/room/expenses` non è paginato. Un membro malevolo può rendere la room pesante da caricare (DoS).

---

## 1. 🟠 HIGH: brute-force della passphrase

**Problema**
- **Entropia più bassa del previsto.** La wordlist ha 180 parole uniche, quindi le combinazioni sono 180³ × 10⁴ ≈ 5,8·10¹⁰ (circa 35,8 bit).
- **Una prova vale per tutte le room.** `POST /api/join/lookup` calcola l'hash con un PEPPER globale e lo cerca in tutte le room. Con R room attive servono in media 5,8·10¹⁰ / R tentativi; con 10.000 room sono circa 5,8 milioni di richieste.
- **Il rate limit si aggira.** È per singolo `cf-connecting-ip`: con un blocco IPv6 /64 un attaccante ha 2⁶⁴ chiavi diverse. Inoltre il limite del binding Cloudflare vale per singolo data center.
- **Le risposte rivelano l'esito.** 200 contro 404 dice subito se la passphrase esiste.

**Impatto se indovinata**
- Lettura di room, membri, spese e attività.
- Impersonificazione di un membro via `POST /api/join` con il suo `memberId`.
- Modifica ed eliminazione di spese.
- Cambio della passphrase.

**Fix consigliato**
- Entropia di almeno 64 bit: 5-6 parole più cifre, oppure una wordlist da 2048 parole.
- Rate limit per prefisso IPv6 /64 (o /56).
- Limite globale sui lookup falliti, con alert.
- In più, a scelta: Turnstile o proof-of-work su `/join/lookup` e `/join`, scadenza dei link di invito.

## 2. 🟡 MEDIUM: nessuna revoca dei token

**Problema**
- I token membro non scadono: `last_seen_at` viene aggiornato ma mai controllato.
- Rivendicare un membro aggiunge un token in più senza invalidare quelli precedenti.
- Cambiare la passphrase non tocca `member_tokens`.
- Non esiste un modo per rimuovere un membro o un dispositivo.

**Scenario**: un intruso rivendica "Marco". Il gruppo se ne accorge e cambia la passphrase, ma il token dell'intruso continua a funzionare.

**Fix consigliato**
- Al cambio di passphrase, opzione "disconnetti tutti gli altri dispositivi": elimina i `member_tokens` della room tranne quello del chiamante.
- Quando un membro viene rivendicato, revoca i suoi token precedenti, oppure mostra la lista dei dispositivi con la possibilità di revocarli.
- Scadenza per inattività basata su `last_seen_at`.

## 3. ⚪ LOW: header di sicurezza assenti

**Problema**: né l'HTML né le risposte `/api/*` hanno CSP, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS.
- I token stanno in `localStorage`: un'eventuale XSS futura, anche da una dipendenza, li ruberebbe senza una CSP a frenarla.
- L'app può essere caricata in un iframe di terzi (clickjacking).

**Fix consigliato**
- Middleware Hono su `/api/*` con `nosniff`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
- Per l'HTML, una CSP stretta: `default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'`, più HSTS. Si può applicare in due modi:
  - con `run_worker_first` sulle navigazioni;
  - nel proxy `pages/dist/_worker.js`.

---

## Controlli già corretti

- **Isolamento tra room:** ogni query autenticata filtra per il `room_id` ricavato dal token. Gli ID di pagatori, split e membri rivendicati sono verificati sulla room.
- **SQL:** tutte le query D1 sono parametrizzate.
- **Validazione input:** zod su tutti gli input (enum, lunghezze massime, interi sicuri, niente duplicati). I campi controllati dal server non si possono sovrascrivere dal client.
- **Token:** 256 bit da `crypto.getRandomValues`, salvati solo come hash SHA-256. Gli ID sono casuali a 96 bit e la generazione della passphrase non introduce sbilanciamenti (bias).
- **Crittografia:** AES-GCM con IV casuale a ogni cifratura. Le chiavi di hash e di cifratura sono derivate separatamente. Senza PEPPER il server rifiuta le richieste.
- **Segreti:** `.dev.vars` è ignorato da git e assente dalla storia. `PEPPER` è un secret Cloudflare.
- **CORS/CSRF:** nessun header CORS. L'autenticazione usa header Bearer e non cookie, quindi il CSRF non è possibile.
- **Errori:** l'API restituisce solo codici generici, senza stack trace.
- **Frontend:**
  - React fa l'escape di tutto il testo.
  - L'unico `innerHTML` è l'SVG del QR generato dalla libreria.
  - La passphrase viaggia nel fragment dell'URL e viene rimossa subito dalla barra.
- **PWA:** il service worker mette in cache solo gli asset statici. `/api/` è escluso, quindi nessuna risposta API né token finisce in cache.
- **CI:** il job delle PR gira senza secret, il deploy parte solo da `main`, `npm ci` usa il lockfile, le action sono quelle ufficiali di GitHub.
