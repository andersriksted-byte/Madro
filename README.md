# Madro

Familiens fælles kogebog, madplan og indkøbsliste. Login og data ligger i Firebase, og selve appen ligger på GitHub Pages.

## Sådan hænger det sammen

- **index.html** er appen. **shim.js** står for login, familie og invitationer og kobler appen til Firestore.
- **config.js** har dit Firebase-projekts oplysninger.
- **firestore.rules** sørger for, at kun familiens medlemmer kan se og ændre familiens data.
- **offers.json** er ugens tilbud. Claudes planlagte opgave skriver den her i repoet.
- **inbox/** er opskrifter, som Claude har hentet fra links. Appen lægger dem selv ind i Kogebogen og fjerner linket fra listen.

## 1. Firebase (ca. 10 minutter)

1. Gå til https://console.firebase.google.com, og opret et projekt, fx `madro`. Google Analytics behøves ikke. Gratis-planen (Spark) er nok.
2. **Web-app:** Tryk på `</>` (Tilføj app → Web), og giv den et navn. Kopiér værdierne fra `firebaseConfig` ind i **config.js**.
3. **Authentication → Kom i gang → Sign-in method:**
   - Slå **E-mail/adgangskode** til, og slå også **E-mail-link (login uden adgangskode)** til.
4. **Authentication → Indstillinger → Godkendte domæner:** Tilføj `DIT-GITHUB-NAVN.github.io`.
5. **Authentication → Skabeloner:** Vælg dansk som sprog. Så kommer invitations- og login-mails på dansk.
6. **Firestore Database → Opret database:** Vælg placering `eur3 (europe-west)` og **produktionstilstand**.
7. **Firestore → Regler:** Erstat alt med indholdet af **firestore.rules**, og tryk **Udgiv**.

## 2. GitHub Pages (ca. 5 minutter)

1. Opret en GitHub-konto, hvis du ikke har en, og lav et nyt **offentligt** repo, fx `madro`.
2. Upload alle filer fra denne mappe (Add file → Upload files), også mapperne `lib`, `img` og `inbox`.
3. **Settings → Pages:** Under "Build and deployment" vælger du *Deploy from a branch*, `main` og `/ (root)`. Tryk Save.
4. Efter et minut ligger appen på `https://DIT-GITHUB-NAVN.github.io/madplan/`.

## 3. Første gang

1. Åbn adressen på telefonen, skriv din mail, og tryk **Send mig et login-link på mail**.
2. Åbn linket i mailen, og vælg en adgangskode.
3. Opret familien.
4. Under **Opsætning → Familie og login → Læs data ind fra Claude-appen** vælger du filen fra Claude-appens **Eksportér alle data**.
5. Vælg, hvem du er under **Dig i tommel-vurderingen**.
6. Invitér resten af familien. Vælg den person, de skal være, fx Bettina, så overtager de personens 👍 og 👎.
7. Vil du have appen på hjemmeskærmen på iPhone, så åbn den i Safari, tryk Del og vælg **Føj til hjemmeskærm**. Log ind dér med mail og adgangskode.

## Hvem kan hvad

- **Administrator:** Kan invitere og trække invitationer tilbage, og kan læse data ind.
- **Alle medlemmer:** Kan se og ændre kogebog, madplan, indkøbsliste og vurderinger.
- **Personer uden login**, fx børnene, findes stadig under Opsætning → Familien. De kan få 👍 og 👎 fra en forælders telefon i Opskrift Tinder.

## Når appen opdateres

Claude bygger en ny `dist/` med `python3 build.py`. Upload de ændrede filer. **config.js** bliver ikke overskrevet.
