# Starttutorialens film

Filmene i `img/tour/` er optaget i selve appen med demodata (Familien Holm), så de viser de rigtige skærme.
Optag dem igen, når de pågældende skærme ændrer sig:

```
cd madro                      # roden af repoet
python3 -m http.server 8766 & # appen skal køre på localhost:8766
cd tools/tour
node record.js                # alle klip, eller fx: node record.js offers tinder
python3 enc.py                # laver out/*.mp4 (H.264, 480 px bred)
```

Kopiér derefter `out/<navn>.mp4` til `img/tour/`, og lav plakatbilledet (første billede):
`ffmpeg -i <navn>.mp4 -frames:v 1 -q:v 5 <navn>.jpg`.

Kræver Node med Playwright, Chromium og ffmpeg. `fakeshim.js` erstatter `shim.js` under optagelsen, så der ikke bruges login eller rigtige data.
