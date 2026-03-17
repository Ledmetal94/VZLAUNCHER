# Installare la CLI di Stripe

Installare la CLI di Stripe su macOS, Windows o Linux.

La CLI Stripe consente di creare, testare e gestire la tua integrazione dalla riga di comando. Ecco gli utilizzi della CLI Stripe:

- Crea, recupera, aggiorna o elimina qualsiasi risorsa Stripe in un ambiente sandbox.
- Trasmetti in streaming le richieste API e gli eventi in tempo reale che si verificano nel tuo account.
- Attivare gli eventi per testare l’integrazione dei webhook

Per ulteriori dettagli, consulta la [documentazione di riferimento della CLI di Stripe](https://docs.stripe.com/cli.md).
[Watch on YouTube](https://www.youtube.com/watch?v=iFwBGI-kqeE)
## Installare la CLI di Stripe

Dalla riga di comando, utilizza uno script di installazione oppure scarica ed estri un file di archivio con la versione per il tuo sistema operativo per installare la CLI.

#### homebrew

Per installare la CLI di Stripe con [homebrew](https://brew.sh/), esegui:

```bash
brew install stripe/stripe-cli/stripe
```

#### APT

La build Debian per la CLI è disponibile su [JFrog](https://packages.stripe.dev), che non è un dominio di proprietà di Stripe. Quando visiti questo URL, viene effettuato il reindirizzamento all’elenco di artifactory di Jfrog.

> Il 5 aprile 2024 abbiamo modificato la chiave GPG di Stripe CLI per installare Stripe CLI tramite apt. Se hai configurato la chiave pubblica prima di questa data, riscontrerai il seguente errore:
> 
> ```bash
W: An error occurred during the signature verification. The repository isn't updated and the previous index files will be used. GPG error: https://packages.stripe.dev/stripe-cli-debian-local stable InRelease: The following signatures were invalid: EXPKEYSIG DEEBD57F917C83E3 Stripe <security@stripe.com>
W: Failed to fetch https://packages.stripe.dev/stripe-cli-debian-local/dists/stable/InRelease  The following signatures were invalid: EXPKEYSIG DEEBD57F917C83E3 Stripe <security@stripe.com>
W: Some index files failed to download. They have been ignored, or old ones used instead
```
> 
> Per risolvere questo errore, aggiorna la chiave Stripe GPG completando[passaggio 1](https://docs.stripe.com/stripe-cli/install.md#step-one).

Per installare la CLI di Stripe su distribuzioni basate su Debian e Ubuntu:

1. Aggiungi la chiave GPG della CLI di Stripe al portachiavi delle fonti apt:

   ```bash
   curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
   ```

1. Aggiungi il repository apt della CLI all’elenco delle fonti apt:

   ```bash
   echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
   ```

1. Aggiornare l’elenco dei pacchetti:

   ```bash
   sudo apt update
   ```

1. Installare la CLI:

   ```bash
   sudo apt install stripe
   ```

#### yum

La build RPM per la CLI è disponibile su [JFrog](https://packages.stripe.dev), che non è un dominio di proprietà di Stripe. Quando visiti questo URL, viene effettuato il reindirizzamento all’elenco di artifactory di Jfrog.

Per installare la CLI di Stripe su distribuzioni basate su RPM:

1. Aggiungi il repository yum della CLI all’elenco delle fonti yum:

   ```bash
   echo -e "[Stripe]\nname=stripe\nbaseurl=https://packages.stripe.dev/stripe-cli-rpm-local/\nenabled=1\ngpgcheck=0" >> /etc/yum.repos.d/stripe.repo
   ```

1. Installare la CLI:

   ```bash
   sudo yum install stripe
   ```

#### Scoop

Per installare la CLI di Stripe con [Scoop](https://scoop.sh/), esegui:

```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
```

```bash
scoop install stripe
```

#### macOS

Per installare la CLI di Stripe su macOS senza homebrew:

1. Scarica il file tar.gz per `mac-os` più recente della tua architettura cpu da [GitHub](https://github.com/stripe/stripe-cli/releases/latest).

1. Decomprimi il file `tar -xvf stripe_[X.X.X]_mac-os_[ARCH_TYPE].tar.gz`.

Facoltativamente, puoi installare il file binario in un percorso da cui puoi eseguirlo a livello globale (ad esempio, `/usr/local/bin`).

#### Linux

Per installare la CLI di Stripe su Linux senza un gestore pacchetti:

1. Scarica il file tar.gz per `linux` più recente da [GitHub](https://github.com/stripe/stripe-cli/releases/latest).

1. Decomprimi il file `tar -xvf stripe_X.X.X_linux_x86_64.tar.gz`.

1. Sposta `./stripe` sul tuo percorso di esecuzione.

#### Windows

Per installare la CLI di Stripe su Windows senza Scoop:

1. Scarica il file zip per `windows` più recente da [GitHub](https://github.com/stripe/stripe-cli/releases/latest).

1. Decomprimi il file `stripe_X.X.X_windows_x86_64.zip`.

1. Aggiungi il percorso del file `stripe.exe` decompresso alla variabile di ambiente `Path`. Per informazioni su come aggiornare le variabili di ambiente, consulta la [documentazione di Microsoft PowerShell](https://learn.microsoft.com/it-it/powershell/module/microsoft.powershell.core/about/about_environment_variables?view=powershell-7.3#saving-changes-to-environment-variables).

Gli scanner antivirus di Windows segnalano occasionalmente la CLI Stripe come non sicura. Si tratta molto probabilmente di un falso positivo. Per ulteriori informazioni, consulta il [problema n. 692](https://github.com/stripe/stripe-cli/issues/692) nel repository GitHub.

#### Docker

La CLI di Stripe è disponibile anche come [immagine Docker](https://hub.docker.com/r/stripe/stripe-cli). Per installare l’ultima versione, esegui:

```bash
docker run --rm -it stripe/stripe-cli:latest
```

## Accedere alla CLI

1. Accedi e autentica il tuo[account](https://docs.stripe.com/get-started/account/activate.md) Stripe utente per generare una serie di chiavi con limitazioni. Per ulteriori informazioni, consulta [Autorizzazioni e chiavi della CLI di Stripe](https://docs.stripe.com/stripe-cli/keys.md).

   ```bash
     stripe login
   ```

1. Premi **Enter** sulla tastiera per completare la procedura di autenticazione nel browser.

   ```bash
   Your pairing code is: enjoy-enough-outwit-win
   This pairing code verifies your authentication with Stripe.
   Press Enter to open the browser or visit https://dashboard.stripe.com/stripecli/confirm_auth?t=THQdJfL3x12udFkNorJL8OF1iFlN8Az1 (^C to quit)
   ```

Eventualmente, se non vuoi utilizzare un browser, usa il flag `--interactive` per autenticarti con una chiave con limitazioni o una chiave privata API esistente. Questa opzione è utile quando ti autentichi alla CLI senza un browser, ad esempio in una pipeline CI/CD.

```bash
stripe login --interactive
```

Inoltre puoi usare il flag `--api-key` per specificare la tua chiave privata API inline ogni volta che invii un richiesta.

```bash
stripe login --api-key <<YOUR_SECRET_KEY>>
```