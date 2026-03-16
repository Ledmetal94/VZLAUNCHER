# Virtual Zone — Product Requirements Document v3.0

> **Documento di specifica completa per lo sviluppo del sistema Virtual Zone.**
> Versione 3.0 — Marzo 2026 — Virtual Zone Italia S.r.l.
> Piattaforme VR integrate: Hero Zone · VEX Play · Spawnpoint

---

## 1. Executive Summary

Virtual Zone è una piattaforma SaaS multi-tenant che unifica la gestione di tre piattaforme VR free-roam (Hero Zone, VEX Play, Spawnpoint) sotto un unico launcher tablet. Il sistema serve due tipologie di utenti:

- **Account sede** (bowling, FEC, game room): opera la propria arena tramite il launcher tablet
- **Super Admin Virtual Zone**: gestisce tutte le sedi, royalty, pricing e catalogo giochi da un pannello centralizzato

Il launcher gira su tablet a risoluzione fissa 1920×1080, comunica in rete locale con un PC headless (senza monitor) che esegue le tre piattaforme VR, e sincronizza dati con un backend cloud per autenticazione, pagamenti, report e gestione multi-sede.

### 1.1 Problema

- I clienti Virtual Zone devono gestire tre pannelli di controllo VR separati, ciascuno con interfaccia e workflow diversi
- Virtual Zone non ha visibilità in tempo reale sulle arene dei franchisee
- Il sistema di royalty e conteggio gettoni è manuale
- Non esiste integrazione tra launcher, pagamenti e app fedeltà dei giocatori
- La formazione degli operatori è costosa

### 1.2 Soluzione

Un launcher tablet (PWA 1920×1080 fixed, zero scroll) che nasconde la complessità delle tre piattaforme dietro un'interfaccia unica. Un backend cloud gestisce autenticazione, multi-tenancy, pagamenti, royalty e sync dati. Un'API locale sul PC headless gestisce l'automazione in tempo reale. L'integrazione con l'app fedeltà avviene tramite scanner QR nativo nel launcher.

---

## 2. Architettura di Sistema

### 2.1 Schema architetturale

```
┌─────────────────────────────────────────────────────────────────────┐
│  TABLET (browser)                                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Launcher PWA — React/TypeScript — Fixed 1920×1080            │  │
│  │  Griglia giochi · Gettoni · QR Scanner · Sessione live       │  │
│  └──────────┬──────────────────────────────┬────────────────────┘  │
│             │ HTTP/WS (LAN)                │ HTTPS (Internet)       │
└─────────────┼──────────────────────────────┼───────────────────────┘
              ▼                              ▼
┌──────────────────────┐        ┌──────────────────────────────────┐
│  PC HEADLESS (on-site)│        │  BACKEND CLOUD (VPS)              │
│  ┌──────────────────┐│        │  ┌────────────────────────────┐  │
│  │ API Locale        ││        │  │ FastAPI + PostgreSQL        │  │
│  │ FastAPI :8000     ││        │  │ Auth JWT · Multi-tenant     │  │
│  ├──────────────────┤│        │  │ Pagamenti · Royalty          │  │
│  │ Automation Engine ││        │  │ Catalogo giochi · Config     │  │
│  │ PyAutoGUI         ││        │  ├────────────────────────────┤  │
│  ├──────────────────┤│        │  │ Pannello Admin VZ (React)   │  │
│  │ Hero Zone         ││        │  └────────────────────────────┘  │
│  │ VEX Play          ││        └──────────────┬───────────────────┘
│  │ Spawnpoint        ││                       │
│  ├──────────────────┤│                       ▼
│  │ TightVNC Server   ││        ┌──────────────────────────────────┐
│  │ Dummy HDMI 1080p  ││        │  APP FEDELTÀ (API esterna)       │
│  └──────────────────┘│        │  QR code · Profili giocatori     │
└──────────────────────┘        └──────────────────────────────────┘
```

### 2.2 Componenti

| Componente | Tecnologia | Dove gira | Ruolo |
|---|---|---|---|
| Launcher tablet | React 18 + TypeScript, PWA | Tablet (browser) | Interfaccia operatore, fixed 1920×1080 |
| Pannello admin VZ | React 18 + TypeScript, webapp responsive | Browser (qualsiasi) | Gestione sedi, royalty, catalogo |
| Backend cloud | FastAPI + PostgreSQL | VPS Linux | Auth, multi-tenancy, pagamenti, dati |
| API locale | FastAPI + Uvicorn | PC headless on-site | Automazione giochi in tempo reale |
| Automation engine | Python + PyAutoGUI + Pillow | PC headless on-site | Click e interazioni sulle piattaforme VR |
| App fedeltà API | Servizio esterno | Cloud | Profili giocatori, storico, punti |

### 2.3 Comunicazione

Il tablet comunica su due canali paralleli:

**Canale locale (LAN):** tablet ↔ PC headless sulla porta 8000. Usato per avvio/stop giochi, stato sessione in tempo reale via WebSocket, health check piattaforme. Funziona anche senza internet.

**Canale cloud (Internet):** tablet ↔ backend cloud. Usato per autenticazione, download configurazione sede, sync sessioni, acquisto gettoni, integrazione app fedeltà.

**Offline-first:** se internet cade, il launcher continua a funzionare per avviare e gestire giochi (tutto locale). I dati delle sessioni vengono accumulati localmente e sincronizzati quando la connessione torna. Dopo 48 ore senza connessione, il launcher si blocca per rinnovo licenza.

---

## 3. Ruoli e Autenticazione

### 3.1 Due soli ruoli

| Ruolo | Autenticazione | Accesso | Funzionalità |
|---|---|---|---|
| **Account sede** | Email + password | Solo la propria sede | Launcher giochi, sessioni, QR scanner, report sede, acquisto gettoni, manutenzione, VNC viewer |
| **Super Admin VZ** | Email + password | Tutte le sedi + sistema | Pannello admin, gestione sedi, royalty, pricing, catalogo giochi, push update, analytics globali, gestione account sede |

### 3.2 Autenticazione

- JWT con scadenza 15 minuti + refresh token 7 giorni
- Ruolo embedded nel JWT: `sede` o `admin`
- Ogni richiesta API verifica che il `tenant_id` nel token corrisponda ai dati richiesti
- HTTPS obbligatorio per comunicazioni col backend cloud
- La comunicazione con l'API locale (LAN) può usare HTTP semplice

---

## 4. PC Headless e Automazione

### 4.1 Setup hardware

Ogni sede ha un PC dedicato senza monitor (headless) che esegue le tre piattaforme VR. Per garantire il funzionamento di PyAutoGUI (che richiede un desktop grafico attivo):

- **Dummy HDMI plug:** adattatore ghost che simula un monitor 1920×1080. Windows crea un desktop a risoluzione fissa. Costo: ~5-10€.
- **TightVNC Server:** mantiene il desktop attivo e permette accesso remoto per troubleshooting. Il VNC viewer è integrato nel launcher (vedi sezione 5.7).

### 4.2 Requisiti PC

- OS: Windows 10/11 Pro
- RAM: minimo 8 GB (consigliati 16 GB)
- Storage: SSD, almeno 100 GB
- Risoluzione: fissa 1920×1080 (critico per le coordinate di automazione)
- Rete: collegato alla stessa LAN del tablet

### 4.3 Auto-start

All'avvio del PC partono automaticamente (registrati come servizi Windows tramite NSSM o cartella Startup):

1. TightVNC Server
2. Hero Zone
3. VEX Play
4. Spawnpoint
5. API locale FastAPI

In caso di crash dell'API, il servizio Windows la riavvia automaticamente.

### 4.4 Automation Engine

L'engine Python utilizza PyAutoGUI con strategia a due livelli:

**Livello 1 — Image matching (primario):** cerca sullo schermo un'immagine di riferimento del pulsante/elemento da cliccare. Resiliente ai cambiamenti di posizione dell'interfaccia. Ogni profilo include screenshot di riferimento.

**Livello 2 — Coordinate fisse (fallback):** se l'image matching fallisce dopo un timeout configurabile (default: 3s), usa le coordinate XY preimpostate. Garantisce velocità quando le interfacce sono stabili.

### 4.5 Profili di automazione

Ogni gioco ha un profilo JSON che descrive la sequenza completa di azioni per avviarlo sulla piattaforma corrispondente. Struttura:

```json
{
  "game_id": "hz-dead-ahead",
  "platform": "herozone",
  "window_title": "Hero Zone",
  "pre_checks": [
    {"type": "verify", "image": "herozone/main_menu.png", "timeout": 5}
  ],
  "launch_sequence": [
    {"type": "focus_window", "title": "Hero Zone"},
    {"type": "wait", "seconds": 0.5},
    {"type": "click", "image": "herozone/dead_ahead_tile.png", "fallback_x": 150, "fallback_y": 400, "confidence": 0.8},
    {"type": "wait", "seconds": 1.0},
    {"type": "click", "image": "herozone/start_button.png", "fallback_x": 960, "fallback_y": 800, "confidence": 0.85},
    {"type": "wait_for_image", "image": "herozone/loading_screen.png", "timeout": 10},
    {"type": "verify", "image": "herozone/game_running.png", "timeout": 15}
  ],
  "stop_sequence": [
    {"type": "hotkey", "keys": ["alt", "F4"]},
    {"type": "wait", "seconds": 2},
    {"type": "click", "image": "herozone/confirm_exit.png", "fallback_x": 960, "fallback_y": 540}
  ],
  "screenshots_dir": "herozone/"
}
```

**Tipi di azione supportati:**

| Azione | Parametri | Descrizione |
|---|---|---|
| `click` | `image`, `fallback_x`, `fallback_y`, `confidence` | Click su immagine trovata o coordinate fallback |
| `double_click` | stessi di click | Doppio click |
| `right_click` | stessi di click | Click destro |
| `type` | `text`, `interval` | Digitazione testo |
| `hotkey` | `keys[]` | Combinazione tasti (es. `["alt", "F4"]`) |
| `wait` | `seconds` | Pausa |
| `wait_for_image` | `image`, `timeout` | Attendi che un'immagine appaia |
| `verify` | `image`, `timeout` | Verifica stato atteso |
| `focus_window` | `title` | Porta finestra in primo piano |
| `scroll` | `clicks`, `x`, `y` | Scroll mouse |

### 4.6 Gestione errori automazione

- Retry automatico: ogni azione viene riprovata fino a 3 volte (1s, 2s, 4s)
- Timeout globale: sequenza di avvio non completata entro 60s → errore
- Screenshot su errore: salvato automaticamente per debug
- Notifica operatore: errore inviato al tablet via WebSocket
- Recovery: tentativo di riportare la piattaforma allo stato iniziale

### 4.7 Tool di calibrazione

CLI per creare/testare profili:

- **Modalità registrazione:** l'operatore tecnico esegue manualmente il workflow, il tool registra coordinate, tempi e cattura screenshot
- **Modalità dry-run:** esegue il profilo mostrando cosa farebbe senza cliccare
- **Modalità debug:** esecuzione passo-passo con conferma manuale per ogni azione

---

## 5. Launcher Tablet (Vista Account Sede)

### 5.1 Specifiche tecniche

- **Framework:** React 18 + TypeScript
- **Tipo:** Progressive Web App (PWA)
- **Risoluzione:** fissa 1920×1080, nessuno scroll
- **Font:** Outfit (Google Fonts) — tutti i pesi da 300 a 900
- **Tema:** scuro (brand Virtual Zone)
- **Palette colori brand:**
  - Magenta: `#E6007E` (accento primario)
  - Viola: `#523189` (accento secondario)
  - Lilla: `#7B64A9` (accento terziario)
  - Blu scuro: `#191832` (sfondo)
  - Più scuro: `#0f0e1f` / `#0a0918` (sfondo profondo)

### 5.2 Layout principale (schermata unica, no scroll)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HEADER (56px)                                                           │
│ [Logo VZ]  [Widget Gettoni: icona G + "1.247" + pulsante "+"]          │
│                              [LIVE pill] [QR btn] [Orologio] [⚙ btn]  │
├─────────────────────────────────────────────────────────────────────────┤
│ FILTRI CATEGORIE (44px)                                                 │
│ [Tutti] [Arcade Light] [Arcade Full] [Avventura] [Laser Game]          │
│ [Escape Room]                                            "18 giochi"   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ GRIGLIA GIOCHI (area centrale, 2 righe)                                │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ...  │
│ │ card │ │ card │ │ card │ │ card │ │ card │ │ card │ │ card │       │
│ │      │ │      │ │      │ │      │ │      │ │      │ │      │       │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ...  │
│ │ card │ │ card │ │ card │ │ card │ │ card │ │ card │ │ card │       │
│ │      │ │      │ │      │ │      │ │      │ │      │ │      │       │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ BARRA SESSIONE (56px, visibile solo durante sessione attiva)           │
│ [●] Sessione attiva: Dead Ahead · Arcade Full  |  Gioc: 4  |          │
│ Tempo: 12:34  [████████░░] |  [■ Termina]                              │
└─────────────────────────────────────────────────────────────────────────┘
```

**NON c'è barra di ricerca.** L'operatore naviga solo con i filtri categoria.

**NON ci sono filtri per piattaforma.** Le piattaforme (Hero Zone, VEX, Spawnpoint) sono trasparenti per l'operatore.

### 5.3 Categorie giochi

Le uniche categorie disponibili sono:

| Categoria | ID | Descrizione |
|---|---|---|
| Tutti | `all` | Mostra tutti i giochi |
| Arcade Light | `arcade_light` | Giochi brevi e casual (5-15 min) |
| Arcade Full | `arcade_full` | Shooter e azione intensa (15 min) |
| Avventura | `avventura` | Esplorazione e quest (20-30 min) |
| Laser Game | `lasergame` | PvP competitivo (15-20 min) |
| Escape Room | `escape` | Puzzle e collaborazione (30-60 min) |

### 5.4 Card gioco

Ogni card nella griglia mostra:

- **Background:** gradiente colorato (placeholder, sostituito da copertina reale in produzione)
- **Badge** (opzionale, angolo in alto a sinistra): NEW, HOT, TOP — colori diversi
- **Costo in gettoni** (angolo in alto a destra): badge con dot magenta + "X gett."
- **Info in basso** (gradient overlay scuro):
  - Label categoria in lilla (es. "ARCADE FULL")
  - Nome gioco in bianco bold
  - Meta: icona giocatori + range (es. "1–4") + icona orologio + durata (es. "15m")
- **Hover:** overlay magenta dal basso + pulsante play circolare magenta al centro
- **Click:** apre modale avvio gioco

### 5.5 Widget gettoni

Posizionato nell'header a sinistra, accanto al logo. Stile ispirato a Hero Zone:

- Icona circolare con gradiente magenta→viola, lettera "G"
- Label "GETTONI" in piccolo
- Saldo numerico grande (es. "1.247")
- Pulsante "+" circolare magenta

Cliccando si apre la modale acquisto gettoni. Il saldo si aggiorna in tempo reale dopo ogni sessione (decremento) e dopo ogni acquisto (incremento).

### 5.6 Scanner QR per app fedeltà

Pulsante nell'header con icona QR + label "QR". Apre una modale con:

1. **Viewport fotocamera:** accesso alla fotocamera posteriore del tablet tramite `navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}})`. Decodifica QR nel browser con libreria `html5-qrcode` (MIT, ~50KB).
2. **Lista giocatori scansionati:** nome, avatar, livello, punti
3. **Multi-scan:** dopo ogni scan, chiede "Altro giocatore?" (Sì/No)
4. **Conferma:** pulsante per confermare i giocatori e associarli alla sessione

**Flusso:**
1. Operatore seleziona gioco → apre modale avvio
2. Preme QR scanner (nell'header o nella modale)
3. Scansiona QR di ogni giocatore
4. I profili appaiono nella modale di avvio
5. Conferma e avvia sessione
6. A fine sessione, il launcher invia automaticamente i dati all'API app fedeltà

**Formato QR atteso:** stringa JSON `{"player_id": "string", "app_version": "string"}`

**Endpoint app fedeltà (da concordare):**

| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/api/players/{qr_code}` | Lookup giocatore da QR |
| POST | `/api/sessions` | Salva sessione con giocatori |
| POST | `/api/players/{id}/points` | Aggiunge punti fedeltà |

### 5.7 VNC Viewer (troubleshooting)

Accessibile da Impostazioni → "Schermo PC (VNC)". Apre una modale con:

- **Viewport live** del desktop del PC headless, implementato con **noVNC** (libreria JavaScript open-source che embedd un client VNC nel browser)
- **Connessione:** al TightVNC Server del PC headless sulla LAN (porta 5900)
- **Toolbar:** indicatore connessione, risoluzione/latenza, pulsanti Screenshot, Ctrl+Alt+Del, Refresh, Disconnetti
- L'operatore può vedere e interagire con lo schermo del PC direttamente dal tablet

### 5.8 Pannello impostazioni

Accessibile dall'icona ingranaggio nell'header. Modale con sezioni:

- **Sede:** nome, ID
- **Licenza:** stato (online/offline), ultimo rinnovo, ore offline rimanenti
- **Sistema:** stato API locale, Automation Engine, Backend cloud (ognuno con dot verde/rosso)
- **Azioni:**
  - Aggiorna giochi (trigger automazione update sulle piattaforme)
  - Report sessioni (export CSV)
  - Tutorial (guide in-app per operatori)
  - Riavvia (restart piattaforme)
  - Schermo PC / VNC (apre il VNC viewer)

---

## 6. Sistema Gettoni e Pagamenti

### 6.1 Modello gettoni

Ogni sede ha un saldo gettoni decrementato a ogni sessione. Il costo dipende dal gioco (configurato nel catalogo). Il saldo è sincronizzato tra launcher e backend cloud in tempo reale.

### 6.2 Acquisto dal tablet

L'operatore preme il "+" accanto al saldo. Si apre una modale con:

**Pacchetti tiered:**

| Pacchetto | Quantità | Prezzo | Prezzo unitario | Risparmio |
|---|---|---|---|---|
| Base | 1–500 | €575 | €1,15/gettone | — |
| Standard | 501–1.500 | €1.575 | €1,05/gettone | -9% |
| **Consigliato** | 1.501–3.000 | €2.850 | €0,95/gettone | -17% |
| Max | 3.001+ | €0,85/gettone | €0,85/gettone | -26% |

**Due metodi di pagamento (tab switcher):**

**Tab 1 — Bonifico bancario (zero commissioni):**
- Mostra: Intestatario (Virtual Zone Italia S.r.l.), IBAN, BIC/SWIFT, causale univoca (es. `VZ-GETT-BWL001-20260316`)
- Pulsante "Copia IBAN"
- Nota: "I gettoni verranno accreditati alla conferma del bonifico (1-2 giorni lavorativi)"
- I gettoni vengono accreditati manualmente dall'admin VZ alla ricezione, oppure automaticamente con integrazione riconciliazione bancaria

**Tab 2 — Carta / SEPA (Stripe):**
- Integrazione Stripe Checkout o Payment Links
- Supporta carte di credito/debito e addebito SEPA
- Gettoni accreditati istantaneamente dopo il pagamento
- Commissioni: 1,5% + 0,25€ (carte EU) / 0,35€ (SEPA)
- Nessun dato carta transita per i server Virtual Zone

### 6.3 Collegamento royalty

Ogni sessione genera un record per il calcolo royalty. Le regole sono configurabili per sede dall'admin (es. royalty 5% per Linea Arena VR, gettoni tiered da €0,90 a €1,15). Il sistema genera automaticamente il report royalty mensile.

---

## 7. Sistema di Licenza Offline

### 7.1 Funzionamento

Il launcher può funzionare offline (senza connessione internet) per un massimo di **48 ore**. Dopo, si blocca finché non si ristabilisce la connessione.

### 7.2 Stati della licenza

| Stato | Indicatore header | Comportamento |
|---|---|---|
| **Online** | Pill verde "Online" | Licenza rinnovata continuamente, tutto funziona |
| **Offline (>12h rimanenti)** | Pill gialla "Offline — Xh rimaste" | Launcher funziona, warning visivo |
| **Offline (<12h rimanenti)** | Pill rossa "Offline — Xh rimaste!" | Launcher funziona, warning urgente |
| **Scaduta (>48h offline)** | **Schermata blocco totale** | Nessuna funzione accessibile |

### 7.3 Schermata di blocco

Overlay a tutto schermo (z-index massimo) che copre l'intero launcher:
- Icona lucchetto
- Titolo "Licenza scaduta"
- Messaggio: "Il launcher ha funzionato offline per più di 48 ore. Connetti il dispositivo a internet per rinnovare automaticamente la licenza."
- Pulsante "Riprova connessione"
- Info: ultimo rinnovo avvenuto con timestamp

### 7.4 Implementazione

- Il backend cloud restituisce un token di licenza con scadenza a 48h
- Il launcher salva il timestamp dell'ultimo rinnovo in localStorage
- Ogni 10 minuti il launcher controlla: `Date.now() - lastRenew > 48h?`
- Quando è online, il rinnovo avviene automaticamente in background
- Il check della licenza avviene PRIMA di qualsiasi operazione del launcher

---

## 8. Pannello Admin (Vista Super Admin VZ)

### 8.1 Overview

Webapp separata (React, responsive, non 1920×1080 fixed) accessibile solo dal team Virtual Zone con credenziali admin.

### 8.2 Dashboard globale

- Mappa/lista delle sedi attive con indicatore stato (online/offline/errore)
- Numero totale sessioni oggi/settimana/mese
- Revenue aggregato e per sede
- Arene attive in questo momento
- Alert attivi (sedi offline, errori automazione, gettoni bassi)

### 8.3 Gestione sedi

- Creazione, modifica, disattivazione sedi
- Configurazione giochi abilitati per sede
- Impostazione pricing gettoni per sede
- Configurazione regole royalty per sede (percentuale, token tiered, clausola anti-bundling Art. 6.5)
- Creazione/reset credenziali account sede
- Accreditamento manuale gettoni (dopo bonifico)

### 8.4 Catalogo giochi centralizzato

Il catalogo master è gestito centralmente. Flusso per nuovo gioco:

1. Admin aggiunge gioco con metadati, copertina e profilo di automazione
2. Seleziona sedi a cui renderlo disponibile
3. Il sistema pusha il gioco ai launcher delle sedi selezionate
4. Profilo di automazione e screenshot scaricati automaticamente sul PC headless

### 8.5 Royalty e fatturazione

- Dashboard royalty per sede, per gioco, per periodo
- Report mensile automatico (1° del mese)
- Export CSV e PDF
- Invio automatico via email al manager sede
- Storico completo pagamenti gettoni e royalty maturate

### 8.6 Push update e manutenzione remota

- Aggiornamento profili automazione a tutte/specifiche sedi
- Aggiornamento catalogo giochi
- Restart remoto PC headless o singole piattaforme
- Visualizzazione log errori per sede
- Alerting automatico (sede offline >10min, tasso errore >10%, gettoni sotto soglia, nessuna sessione >3 giorni)

---

## 9. Backend Cloud

### 9.1 Stack

- **Framework:** FastAPI (Python 3.11+) + Uvicorn
- **Database:** PostgreSQL 16+ con schema multi-tenant
- **Auth:** JWT + bcrypt
- **Hosting:** VPS Linux (Hetzner / DigitalOcean / AWS Lightsail)
- **Pagamenti:** Stripe API (Checkout + SEPA)
- **Email:** Resend o Postmark (report e notifiche)
- **File storage:** S3-compatible (copertine, screenshot, profili)

### 9.2 Multi-tenancy

Ogni sede è un tenant isolato. Schema con `tenant_id` come foreign key su tutte le tabelle dati. Middleware che forza il filtro `tenant_id` su ogni query. L'admin bypassa il filtro per le funzionalità di gestione.

### 9.3 API principali

| Area | Endpoint | Metodo | Descrizione |
|---|---|---|---|
| **Auth** | `/api/auth/login` | POST | Login email+password |
| **Auth** | `/api/auth/refresh` | POST | Rinnovo JWT |
| **Auth** | `/api/auth/license` | GET | Rinnovo licenza offline (restituisce token con scadenza 48h) |
| **Sede** | `/api/tenants/{id}` | GET | Dati sede (solo propria o admin) |
| **Giochi** | `/api/games` | GET | Catalogo giochi abilitati per la sede |
| **Giochi** | `/api/games/{id}` | GET | Dettaglio singolo gioco |
| **Sessioni** | `/api/sessions` | POST | Registra sessione completata |
| **Sessioni** | `/api/sessions` | GET | Storico sessioni sede |
| **Gettoni** | `/api/tokens/balance` | GET | Saldo gettoni sede |
| **Gettoni** | `/api/tokens/purchase` | POST | Avvia acquisto gettoni (crea transazione) |
| **Gettoni** | `/api/tokens/consume` | POST | Decrementa gettoni per sessione |
| **Royalty** | `/api/royalties` | GET | Report royalty (query param: month, year) |
| **Fedeltà** | `/api/loyalty/scan` | POST | Proxy verso API app fedeltà |
| **Admin** | `/api/admin/tenants` | GET | Lista tutte le sedi |
| **Admin** | `/api/admin/tenants` | POST | Crea nuova sede |
| **Admin** | `/api/admin/tenants/{id}` | PATCH | Modifica sede (pricing, royalty, giochi) |
| **Admin** | `/api/admin/tenants/{id}/tokens` | POST | Accredita gettoni manualmente |
| **Admin** | `/api/admin/games` | POST | Aggiungi gioco al catalogo master |
| **Admin** | `/api/admin/games/{id}` | PATCH | Modifica gioco |
| **Admin** | `/api/admin/push-update` | POST | Pusha aggiornamento alle sedi |

### 9.4 Modelli dati

**Tenant (sede)**

| Campo | Tipo | Descrizione |
|---|---|---|
| id | UUID | PK |
| name | string | Nome sede (es. "Bowling Space Latina") |
| address | string | Indirizzo fisico |
| contact_email | string | Email referente |
| password_hash | string | Password hashata (bcrypt) |
| token_balance | integer | Saldo gettoni corrente |
| pricing_tier | JSONB | Regole pricing gettoni |
| royalty_config | JSONB | Regole royalty (%, tier, anti-bundling) |
| enabled_game_ids | UUID[] | Lista ID giochi abilitati |
| pc_local_ip | string | IP PC headless sulla LAN |
| vnc_port | integer | Porta VNC (default 5900) |
| status | enum | active / suspended / onboarding |
| license_last_renew | datetime | Ultimo rinnovo licenza |
| created_at | datetime | Data creazione |

**Game**

| Campo | Tipo | Descrizione |
|---|---|---|
| id | UUID | PK |
| name | string | Nome gioco |
| platform | enum | herozone / vex / spawnpoint |
| category | enum | arcade_light / arcade_full / avventura / lasergame / escape |
| min_players | integer | Minimo giocatori |
| max_players | integer | Massimo giocatori |
| duration_minutes | integer | Durata standard |
| token_cost | integer | Costo in gettoni |
| description | string | Descrizione breve |
| thumbnail_url | string | URL copertina |
| automation_profile | JSONB | Profilo automazione completo |
| badge | string / null | NEW, HOT, TOP o null |
| enabled | boolean | Attivo nel catalogo |

**Session**

| Campo | Tipo | Descrizione |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK → Tenant |
| game_id | UUID | FK → Game |
| platform | enum | herozone / vex / spawnpoint |
| category | enum | Categoria del gioco |
| players_count | integer | Numero giocatori |
| player_ids | string[] | ID giocatori da app fedeltà (se scansionati) |
| duration_planned | integer | Durata prevista (secondi) |
| duration_actual | integer | Durata effettiva (secondi) |
| tokens_consumed | integer | Gettoni consumati |
| status | enum | completed / error / cancelled |
| error_log | text / null | Log errore |
| started_at | datetime | Timestamp avvio |
| ended_at | datetime | Timestamp fine |

**TokenTransaction**

| Campo | Tipo | Descrizione |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK → Tenant |
| type | enum | purchase / consume / adjustment / refund |
| amount | integer | Quantità gettoni (+ o −) |
| payment_method | enum | stripe / bank_transfer / manual |
| payment_reference | string | ID Stripe o causale bonifico |
| unit_price | decimal | Prezzo unitario applicato |
| total_price | decimal | Importo totale |
| status | enum | pending / confirmed / failed |
| created_at | datetime | Timestamp |

---

## 10. API Locale (PC Headless)

### 10.1 Endpoint

| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/api/health` | Health check: stato server, piattaforme, risoluzione display |
| GET | `/api/platforms` | Stato delle tre piattaforme (finestra aperta sì/no, responsive sì/no) |
| POST | `/api/launch` | Avvia un gioco. Body: `{game_id, players, profile}` |
| POST | `/api/stop` | Termina sessione corrente |
| GET | `/api/session` | Stato sessione corrente (running/idle, tempo rimanente) |
| POST | `/api/screenshot` | Cattura screenshot corrente del desktop |
| POST | `/api/restart-platform` | Riavvia una piattaforma specifica. Body: `{platform}` |
| WS | `/ws/status` | WebSocket: aggiornamenti ogni secondo durante sessione (stato, tempo, log engine) |

### 10.2 WebSocket `/ws/status`

Payload inviato ogni secondo durante sessione attiva:

```json
{
  "type": "session_update",
  "session_id": "uuid",
  "game_id": "hz-dead-ahead",
  "status": "running",
  "elapsed_seconds": 123,
  "remaining_seconds": 777,
  "players": 4,
  "platform": "herozone",
  "engine_log": ["[10:15:32] Click: start_button OK", "[10:15:33] Verify: game_running OK"]
}
```

Quando non c'è sessione attiva, invia un heartbeat ogni 5 secondi:

```json
{
  "type": "heartbeat",
  "status": "idle",
  "platforms": {"herozone": "online", "vex": "online", "spawnpoint": "online"},
  "uptime_seconds": 86400
}
```

---

## 11. Stack Tecnologico Completo

| Componente | Tecnologia | Versione |
|---|---|---|
| Backend cloud | FastAPI + Uvicorn | Python 3.11+ |
| Database | PostgreSQL | 16+ |
| API locale | FastAPI + Uvicorn | Python 3.11+ |
| Automazione desktop | PyAutoGUI + Pillow | 0.9.54+ |
| Image matching avanzato | OpenCV (headless) | 4.11+ |
| Window management | pygetwindow | 0.0.9+ |
| Automazione browser | Playwright Python | 1.45+ (futuro, per Spawnpoint) |
| Frontend launcher | React + TypeScript | 18+ |
| Frontend admin | React + TypeScript | 18+ |
| Build tool | Vite | 5+ |
| PWA toolkit | Workbox | 7+ |
| QR scanner | html5-qrcode | 2.3+ |
| VNC viewer (nel browser) | noVNC | 1.5+ |
| Pagamenti | Stripe API | Ultima stabile |
| Email transazionale | Resend o Postmark | — |
| File storage | S3-compatible (MinIO o AWS) | — |
| Auth | JWT (PyJWT) + bcrypt | — |
| Config | PyYAML + Pydantic Settings | — |
| Logging | Loguru | 0.7+ |
| VNC Server (PC) | TightVNC o RealVNC | Ultima stabile |
| Servizio Windows | NSSM | 2.24+ |
| Display virtuale | Dummy HDMI adapter | Hardware, ~5€ |

---

## 12. Struttura Progetto

```
virtualzone/
├── backend/
│   ├── api/                    # FastAPI server (gira sia locale che cloud)
│   │   ├── main.py             # Entry point, CORS, startup
│   │   ├── routes/
│   │   │   ├── auth.py         # Login, refresh, license
│   │   │   ├── games.py        # Catalogo giochi
│   │   │   ├── sessions.py     # Sessioni
│   │   │   ├── tokens.py       # Gettoni e pagamenti
│   │   │   ├── platforms.py    # Stato piattaforme (solo locale)
│   │   │   ├── automation.py   # Launch/stop (solo locale)
│   │   │   ├── loyalty.py      # Proxy app fedeltà
│   │   │   └── admin.py        # Endpoint admin VZ
│   │   ├── models/
│   │   │   ├── schemas.py      # Pydantic models (request/response)
│   │   │   └── database.py     # SQLAlchemy models + DB connection
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── game_service.py
│   │   │   ├── session_service.py
│   │   │   ├── token_service.py
│   │   │   ├── royalty_service.py
│   │   │   └── license_service.py
│   │   └── ws/
│   │       └── manager.py      # WebSocket connection manager
│   ├── engine/                  # Automation engine (solo PC locale)
│   │   ├── runner.py           # Esecutore sequenze di automazione
│   │   ├── actions.py          # Wrapper PyAutoGUI per ogni tipo di azione
│   │   ├── platforms/
│   │   │   ├── herozone.py     # Logic specifica Hero Zone
│   │   │   ├── vex.py          # Logic specifica VEX Play
│   │   │   └── spawnpoint.py   # Logic specifica Spawnpoint
│   │   └── calibrator.py       # Tool CLI per registrare/testare profili
│   ├── profiles/                # Profili automazione JSON
│   │   ├── herozone/
│   │   │   ├── dead_ahead.json
│   │   │   ├── terminator_uprising.json
│   │   │   └── ...
│   │   ├── vex/
│   │   └── spawnpoint/
│   ├── screenshots/             # Immagini riferimento per image matching
│   │   ├── herozone/
│   │   ├── vex/
│   │   └── spawnpoint/
│   ├── logs/
│   │   ├── virtualzone.log
│   │   └── error_screenshots/
│   └── config.py               # Loader per settings.yaml e games.json
├── frontend/
│   ├── launcher/               # PWA 1920×1080 (React + TS + Vite)
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── GameGrid.tsx
│   │   │   │   ├── GameCard.tsx
│   │   │   │   ├── CategoryFilters.tsx
│   │   │   │   ├── TokenWidget.tsx
│   │   │   │   ├── SessionBar.tsx
│   │   │   │   ├── LaunchModal.tsx
│   │   │   │   ├── TokenModal.tsx
│   │   │   │   ├── QRScannerModal.tsx
│   │   │   │   ├── SettingsModal.tsx
│   │   │   │   ├── VNCViewerModal.tsx
│   │   │   │   ├── LicenseLockout.tsx
│   │   │   │   └── Toast.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useWebSocket.ts
│   │   │   │   ├── useSession.ts
│   │   │   │   ├── useTokens.ts
│   │   │   │   └── useLicense.ts
│   │   │   ├── services/
│   │   │   │   ├── api.ts        # Client API locale
│   │   │   │   ├── cloudApi.ts   # Client API cloud
│   │   │   │   └── storage.ts    # localStorage wrapper
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── styles/
│   │   │       └── theme.ts      # Brand colors, tokens
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   └── sw.js
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── admin/                   # Pannello admin VZ (React + TS + Vite)
│       └── (struttura simile)
├── scripts/
│   ├── setup_windows.bat       # Setup automatico PC Windows
│   ├── install_service.bat     # Registra API come servizio Windows (NSSM)
│   └── seed_db.py              # Popola DB con dati iniziali
├── config/
│   ├── settings.yaml           # Configurazione principale
│   └── games.json              # Catalogo giochi
├── docs/
│   ├── PRD.md                  # Questo documento
│   ├── API_LOCAL.md            # Documentazione API locale
│   ├── API_CLOUD.md            # Documentazione API cloud
│   └── SETUP_HEADLESS.md       # Guida setup PC headless
├── docker-compose.yml          # Per backend cloud (PostgreSQL + API)
├── requirements.txt            # Dipendenze Python
├── setup_windows.bat           # Quick start Windows
└── README.md
```

---

## 13. Piano di Sviluppo

### Fase 1 — MVP locale (settimane 1–4)

**Obiettivo:** sistema funzionante end-to-end su una sede singola con Hero Zone.

- Setup PC con Python, VNC, dummy HDMI (se headless)
- API locale FastAPI con endpoint: health, platforms, launch, stop, session, WebSocket
- Automation engine con PyAutoGUI: primo profilo di test per Hero Zone (Dead Ahead)
- Tool di calibrazione per registrare profili
- Launcher PWA 1920×1080: header con gettoni, filtri categoria, griglia giochi, modale avvio, sessione live con countdown, impostazioni base
- Test end-to-end: tablet avvia un gioco Hero Zone

### Fase 2 — Multi-piattaforma (settimane 5–8)

**Obiettivo:** tutte e tre le piattaforme automatizzate.

- Profili automazione per tutti i giochi Hero Zone
- Profili automazione per VEX Play
- Profili automazione per Spawnpoint (+ valutazione Playwright per browser-based)
- Paginazione griglia se giochi > spazio visibile
- Gestione errori completa (retry, screenshot, notifiche)
- Log errori con viewer nel pannello impostazioni

### Fase 3 — Backend cloud + multi-tenant (settimane 9–14)

**Obiettivo:** sistema cloud con autenticazione, pagamenti, multi-sede.

- Backend FastAPI cloud + PostgreSQL + Docker
- Autenticazione JWT (account sede + super admin)
- Multi-tenancy con isolamento dati
- Sistema gettoni: saldo, acquisto (IBAN + Stripe), consumo per sessione
- Pannello admin VZ: gestione sedi, catalogo, royalty, pricing
- Sync offline-first tra launcher e cloud
- Sistema licenza offline (48h max)
- Report sessioni e royalty

### Fase 4 — Integrazioni (settimane 15–20)

**Obiettivo:** QR, fedeltà, manutenzione remota.

- Scanner QR e integrazione API app fedeltà
- VNC viewer integrato nel launcher (noVNC)
- Push update catalogo e profili automazione dal pannello admin
- Alerting proattivo (sede offline, errori, gettoni bassi)
- Tutorial operatore in-app
- Export contabile automatico

### Fase 5 — Scala (settimane 21+)

- Spectator view con overlay brandizzato
- Prenotazioni e calendario
- CRM giocatori collegato ad app fedeltà
- Pricing dinamico (fasce orarie, stagionali)
- Dashboard KPI manager sede
- Onboarding automatizzato nuove sedi
- Documentazione completa

---

## 14. Rischi e Mitigazioni

| Rischio | Impatto | Probabilità | Mitigazione |
|---|---|---|---|
| Aggiornamento piattaforma cambia UI | Alto | Media | Image matching primario; push update rapido dei profili da admin |
| PC headless perde display virtuale | Critico | Bassa | Dummy HDMI + VNC obbligatori; health check periodico |
| Internet cade on-site | Medio | Media | Offline-first: automazione locale funziona, sync al ripristino. Blocco dopo 48h |
| Stripe down o rifiuto pagamento | Medio | Bassa | Fallback su bonifico IBAN; retry automatico |
| API app fedeltà non disponibile | Basso | Media | QR scan salva ID localmente; sync asincrono |
| Sede offline prolungata | Alto | Bassa | Alerting automatico; VNC remoto per diagnosi |
| Conflitto multi-tenant | Critico | Bassa | Middleware tenant_id obbligatorio; test di isolamento |

---

## 15. Metriche di Successo

- Avvio gioco: meno di **3 tap e 15 secondi** dalla schermata iniziale
- Tasso successo automazione: **>95%**
- Formazione nuovo operatore: **<30 minuti**
- Zero interazione diretta con piattaforme VR durante operazioni normali
- Acquisto gettoni: **<60 secondi** (Stripe) o **<2 minuti** (bonifico)
- Scan QR giocatore: **<5 secondi**
- Report royalty mensile generato automaticamente con **zero intervento**
- Onboarding nuova sede: **<2 ore** (hardware + software + config)
- Uptime cloud: **99.5%+**
- Latenza automazione locale: **<500ms** tra comando tablet e primo click

---

## 16. Riferimenti Design

### Brand Virtual Zone

- **Font:** Outfit (Google Fonts) — tutti i pesi
- **Palette:** Magenta `#E6007E`, Viola `#523189`, Lilla `#7B64A9`, Blu scuro `#191832`
- **Tema launcher:** scuro, sfondo `#0a0918` con blob viola/magenta sfumati, grain overlay
- **Stile card:** bordi `rgba(123,100,169,0.18)`, hover magenta, angoli arrotondati 14px
- **Accent:** magenta per pulsanti primari, gradiente magenta→viola per CTA
- **Modale:** sfondo blur `rgba(10,8,30,0.92)`, box con bordi lilla sottili, angoli 20px

### Referenze visive

- **Hero Zone launcher** (screenshot): griglia giochi con copertine, info giocatori/durata sotto ogni card, badge NEW/HOT, logo piattaforma in basso
- **Mockup launcher Virtual Zone** (file HTML v3): implementazione completa del design con tutti gli elementi interattivi

---

*Fine documento — Virtual Zone Italia S.r.l. — Documento riservato*
