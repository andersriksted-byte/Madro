# Madro – regler for ændringer

## Versionsnummer og "Nyt i Madro"
Når du udgiver en ændring af appen (index.html, shim.js, config.js, importer.js):

1. Lav et nyt versionsnummer (`date +%s`), og sæt det ind både i `version.json` og alle steder i `index.html`, hvor det gamle står (`window.__appVersion` og `?v=` på scripts).
2. Tilføj øverst i `changelog.json` en post med samme nummer:
   `{"v":"<nummer>","date":"YYYY-MM-DD","new":["…"],"fixed":["…"]}`
   - `new`: nye funktioner, skrevet kort og på dansk til brugeren (hvad er nyt, og hvor finder man det).
   - `fixed`: fejl eller uhensigtsmæssigheder, der er rettet.
   - Udelad tekniske detaljer. Én linje pr. punkt. Rene interne ændringer behøver ikke en post.

Appen viser selv punkterne i "Nyt i Madro", første gang den åbnes på den nye version. Har man sprunget flere versioner over, vises punkterne fra dem alle samlet.

`offers.json` og `inbox/` skrives af planlagte opgaver og kræver hverken nyt versionsnummer eller changelog.
