# Slice-brug

Dit programmaatje draait op je werkplaats-PC en verbindt de webshop met Bambu Studio.

Zodra een klant een model uploadt, haalt de brug dat bestand op, laat Bambu Studio
het slicen met de instellingen die de klant gekozen heeft, en stuurt de **werkelijke
printtijd en het werkelijke gewicht** terug naar de shop. De shop rekent daarop af,
in plaats van op een schatting.

Bambu Studio wordt niet geïnstalleerd of aangepast — de brug gebruikt het programma
dat al op deze PC staat, met dezelfde profielen die jij in het venster ziet.

## Eenmalig klaarzetten

1. Installeer **Node.js 18 of nieuwer** van <https://nodejs.org> (de gewone LTS-versie).
2. Open een venster in deze map (`slice-brug`).
   - Windows: shift + rechtermuisknop in de map → *PowerShell-venster hier openen*
   - Mac: rechtermuisknop op de map → *Diensten* → *Nieuwe terminal in map*
3. Voer uit:
   ```
   npm install
   ```
4. Kopieer `instellingen.voorbeeld.json` naar `instellingen.json` en vul je
   e-mailadres en wachtwoord van de shop in. Dat moet het beheerdersaccount zijn.

## Eerst testen

Voor je hem laat meedraaien, kijk je of Bambu Studio bereikbaar is:

```
node brug.mjs --test pad/naar/een-model.stl
```

Je krijgt dan de printtijd en het gewicht te zien, plus het volledige commando dat
gebruikt is. Vergelijk die cijfers gerust met wat Bambu Studio zelf toont — ze horen
gelijk te zijn.

Klopt er iets niet, dan zegt de melding meestal precies wat:

| Melding | Wat te doen |
| --- | --- |
| Bambu Studio niet gevonden | Vul `bambuPad` in `instellingen.json` in |
| De profielenmap is niet gevonden | Vul `profielMap` in |
| Geen profiel gevonden voor "…" | De melding toont welke profielen er wél zijn; neem die naam over |
| De vullingsoptie werd niet aanvaard | Zet `vullingDoorgeven` op `false`; er wordt dan met de vulling uit het profiel gewerkt |

## Laten draaien

```
npm start
```

Laat dat venster open staan. Elke opdracht die binnenkomt wordt automatisch
afgehandeld; in het venster zie je per onderdeel wat eruit komt.

Staat de PC uit, dan blijft de opdracht gewoon wachten en pikt de brug hem op zodra
je hem weer start. De klant ziet ondertussen "je prijs wordt berekend". Duurt dat
langer dan de tijdslimiet in Shopbeheer (standaard 15 minuten), dan kan de klant
bestellen op onze eigen berekening en zie jij dat terug bij de bestelling.

### Automatisch mee opstarten

- **Windows** — maak een snelkoppeling naar `start.cmd` en zet die in de map die je
  krijgt via Windows-toets + R → `shell:startup`.
- **Mac** — Systeeminstellingen → Algemeen → Inloggen → `start.command` toevoegen.

## Wat de brug precies doet

1. Luistert op opdrachten met status `teslicen`.
2. Haalt het bestand op uit Firestore, in stukken, en controleert de SHA-256-vingerafdruk.
   Wijkt er één byte af, dan wordt er niet gesliced maar een fout gemeld.
3. Kiest het profiel dat bij de keuze van de klant hoort:
   - laaghoogte 0.12 / 0.16 / 0.20 / 0.28 mm → het bijbehorende Bambu-procesprofiel
   - PLA Basic / PLA Matte / PLA Silk+ / PETG HF / ABS → het bijbehorende filamentprofiel
   - schaal en eenheid van de klant → `--scale`
   - vulling van de klant → `--sparse-infill-density`
4. Draait Bambu Studio zonder venster en leest `Metadata/slice_info.config` uit het
   resultaat. Daar staan de tijd (`prediction`, in seconden) en het gewicht (`weight`,
   in gram). Staat dat er niet, dan worden de cijfers uit de G-code zelf gelezen.
5. Schrijft die twee getallen terug bij het onderdeel.

Het bestand van de klant blijft daarbij onaangeroerd: er wordt een kopie in een
tijdelijke map gesliced, en die map wordt daarna opgeruimd.

## Aan- en uitzetten

In de shop: **Shopbeheer → Prijzen → Slicen met Bambu Studio**. Daar zet je ook de
tijdslimiet. Staat het uit, dan werkt de shop weer volledig op de eigen berekening en
hoeft de brug niet te draaien.
