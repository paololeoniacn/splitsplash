# SplitSplash: stima dei costi

Stima del costo per costruire e pubblicare SplitSplash con GitHub Copilot CLI, confrontato con il valore del lavoro prodotto.
Dati aggiornati al 2026-10-10.

## 1. Token usati (misurati)

I numeri vengono dal registro locale di utilizzo della sessione Copilot CLI (`assistant_usage_events`).
Coprono tutta la sessione, dal piano al deploy su `splitsplash.pages.dev`.
I sub-agent sono il revisore del design e il documentatore.

| Origine | Chiamate | Input totale | di cui cache read | di cui cache write | Output | (di cui reasoning) |
|---|---:|---:|---:|---:|---:|---:|
| Agente principale | 143 | 13.713.252 | 13.340.234 | 372.726 | 153.732 | 20.694 |
| Prompt utente | 4 | 412.540 | 131.900 | 280.624 | 1.801 | 955 |
| Sub-agent (review + docs) | 23 | 1.147.441 | 998.950 | 148.441 | 34.449 | 8.206 |
| Compattazione contesto | 1 | 162.834 | 155.039 | 7.791 | 6.228 | n/d |
| **Totale** | **171** | **15.436.067** | **14.626.123** | **809.582** | **196.210** | **29.855** |

- **Modello:** `claude-opus-5.5`, con moltiplicatore premium registrato **15×** su ogni chiamata.
- **Input senza cache:** circa 0 token. Il 94,8% dell'input è stato letto dalla cache, e il resto è scrittura in cache.
- **Tempo di calcolo del modello:** circa 32 minuti in totale.
- **AI units registrate:** circa 1.090 AIU (`total_nano_aiu` = 1,09·10¹²).
- **Lavoro non conteggiato:** questo file e le ultime query. Valgono qualche migliaio di token e non cambiano la stima.

## 2. Costo dell'abbonamento (come lo paghi davvero)

Copilot fattura **per prompt utente**, moltiplicato per il moltiplicatore del modello.
Le chiamate interne dell'agente (tool, sub-agent, autopilot) non si pagano a parte.

- **Prompt utente:** 5 (richiesta iniziale, «riprendi», pages.dev, questa stima, più un'autocontinuazione dell'autopilot).
- **Richieste premium consumate:** 5 × 15 = **75**.

| Piano (ipotesi prezzi listino) | Canone | Richieste premium incluse | Quota usata | Costo attribuibile |
|---|---:|---:|---:|---:|
| Copilot Pro | $10/mese | 300 | 25% | **≈ $2,50** |
| Copilot Pro+ | $39/mese | 1.500 | 5% | **≈ $1,95** |
| Solo eccedenza ($0,04/richiesta) | n/d | n/d | n/d | **≈ $3,00** |

> I prezzi dei piani sono quelli di listino noti al momento della stesura. Controllali sulla pagina di billing GitHub: i moltiplicatori dei modelli cambiano nel tempo.

## 3. Costo dei token a prezzo API (scenario "senza abbonamento")

Il prezzo ufficiale di `claude-opus-5.5` per token non è noto, quindi uso due listini Anthropic Opus come riferimento.
Il calcolo è sui token misurati: input senza cache circa 0, quindi pesano solo cache read, cache write e output.

| Voce | Token | Scenario A: Opus 4.5 ($0,50 / $6,25 / $25 per M) | Scenario B: Opus 4.1 ($1,50 / $18,75 / $75 per M) |
|---|---:|---:|---:|
| Cache read | 14,63 M | $7,31 | $21,94 |
| Cache write | 0,81 M | $5,06 | $15,18 |
| Output | 0,20 M | $4,91 | $14,72 |
| **Totale** | | **≈ $17** | **≈ $52** |

Senza cache (tutto l'input a prezzo pieno, $5 o $15 per M) il costo salirebbe a circa **$82** nello scenario A e **$246** nello scenario B. La cache ha ridotto la spesa di circa 5 volte.

## 4. Costo dell'infrastruttura

| Servizio | Uso | Costo |
|---|---|---:|
| Cloudflare Workers (free) | 100k richieste/giorno; pages.dev conta 2 invocazioni per richiesta | $0 |
| Cloudflare D1 (free) | 5 GB, 5 M letture/giorno | $0 |
| Cloudflare Pages (free) | sottodominio `splitsplash.pages.dev` | $0 |
| Rate limiting binding | incluso | $0 |
| **Totale mensile** | per uso tra amici o gruppi | **$0** |

Si inizia a pagare (Workers Paid, $5/mese) solo oltre circa 50k visite al giorno.

## 5. Valore del lavoro prodotto

Cosa è stato consegnato:
- 61 file versionati e circa 5.200 righe (UI 2.750, API 360, logica condivisa 430 più 21 test, schema DB).
- Design system documentato (DESIGN.md).
- PWA, internazionalizzazione IT/EN, CI/CD, deploy funzionante.

Stima di quanto costerebbe farlo fare a professionisti (tariffe freelance Italia, €400/giorno):

| Attività | Giorni-persona | Valore |
|---|---:|---:|
| Product + UX (flussi, passphrase, identità senza account) | 1–2 | €400–800 |
| UI design (direzione visiva, design system, dark mode) | 3–4 | €1.200–1.600 |
| Frontend React (6 schermate, sheet spese, 4 modi di split, i18n, PWA) | 5–7 | €2.000–2.800 |
| Backend (API Hono, auth a token, rate limit, D1, cifratura passphrase) | 2–3 | €800–1.200 |
| Logica e test (arrotondamenti, saldi, semplificazione debiti) | 1 | €400 |
| DevOps (Cloudflare, migrazioni, CI, pages.dev) e QA | 1–2 | €400–800 |
| **Totale** | **13–19** | **€5.200–7.600** |

## 6. Riepilogo

| | Importo |
|---|---:|
| Costo reale con abbonamento Copilot | **≈ $2–3** (75 richieste premium) |
| Costo equivalente a token API | **≈ $17–52** |
| Infrastruttura | **$0/mese** |
| Valore di mercato stimato del lavoro | **≈ €5.200–7.600** |
| Rapporto valore/costo | circa 2.000× con l'abbonamento, circa 100–400× a prezzo API |

Il valore stimato non comprende la tua supervisione: rilettura, test manuali e decisioni di prodotto.
Le scelte di design fatte in autonomia durante l'autopilot sono state solo dichiarate, non ancora validate da te.
