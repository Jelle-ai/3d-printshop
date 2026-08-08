# De regels van Firestore instellen

Dit is het enige onderdeel van je site dat **na dertig dagen stopt**. Zolang je
in testmodus staat, geldt er één regel: *iedereen mag alles* — en na dertig
dagen: *niemand mag iets*. Dan kan er niet meer besteld worden en zie jij geen
bestellingen meer.

Deze handleiding duurt ongeveer vijf minuten. Je hoeft niets te installeren en
er gaat geen enkel gegeven verloren.

---

## Vooraf: één ding controleren

De nieuwe regels herkennen jou als beheerder aan een vlaggetje in je eigen
profiel. Dat vlaggetje zet de site zelf, maar alleen wanneer je een keer
ingelogd bent geweest.

**Log dus eerst in op je site met `jelle@mattan.be`** en kijk of je op de
accountpagina het oranje label **BEHEERDER** ziet staan.

> Zie je dat label niet, publiceer de regels dan nog niet — dan sluit je jezelf
> buiten je eigen beheer. Log eerst in, ververs de pagina, en kijk opnieuw.

---

## Stap 1 — De regels openen

1. Ga naar **<https://console.firebase.google.com/>** en log in met het
   Google-account waarmee je het project gemaakt hebt.
2. Klik op je project: **d-printing-shop-fbc7b**.
3. Klik in het menu links op **Build** → **Firestore Database**.
4. Klik bovenaan op het tabblad **Rules** (Nederlands: **Regels**). Het staat
   naast *Data*, *Indexes* en *Usage*.

Je ziet nu een tekstvak met ongeveer dit erin:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 9, 6);
    }
  }
}
```

Die datum is jouw vervaldatum. Dát is wat we vervangen.

---

## Stap 2 — De nieuwe regels erin zetten

1. Open in dit project het bestand **`firestore.rules`**.
   Op GitHub: <https://github.com/Jelle-ai/3d-printshop/blob/main/firestore.rules>
   → klik rechtsboven op het kopieerknopje (*Copy raw file*).
2. Ga terug naar het tekstvak in Firebase.
3. Klik in het tekstvak, selecteer **alles** (Ctrl+A of Cmd+A) en druk op
   Backspace. Het vak moet helemaal leeg zijn.
4. Plak de gekopieerde regels (Ctrl+V of Cmd+V).
5. Klik op de blauwe knop **Publish** (**Publiceren**) boven het vak.

Er verschijnt kort een melding dat de regels gepubliceerd zijn. Klaar — het
werkt meteen, je hoeft niets opnieuw op te starten.

> **Krijg je een rode foutmelding in plaats van de knop?** Dan is er iets
> misgegaan bij het plakken; meestal staat er nog een stukje van de oude tekst.
> Maak het vak helemaal leeg en plak opnieuw.

---

## Stap 3 — Controleren dat alles nog werkt

Loop deze vier dingen af. Elk duurt een halve minuut.

| Wat je doet | Wat je hoort te zien |
| --- | --- |
| Open je site **zonder in te loggen** | De collectie is gewoon zichtbaar |
| Log in als `jelle@mattan.be` → Shopbeheer | Producten, bestellingen, prijzen: alles opent |
| Verander iets kleins aan een product en sla op | "Product bijgewerkt" |
| Log in met een ander account en bestel iets | De bestelling komt aan en staat bij *Mijn bestellingen* |

Gaat er iets mis, kijk dan bij **Wat als er iets niet werkt** hieronder. Je kunt
altijd terug: plak de oude regels opnieuw en publiceer.

---

## Wat er verandert

| | Testmodus (nu) | Na deze stap |
| --- | --- | --- |
| Collectie bekijken | iedereen | iedereen |
| Bestelling plaatsen | iedereen | wie ingelogd is, alleen op eigen naam |
| Bestellingen bekijken | **iedereen** | jij, en elke klant enkel zijn eigen |
| Adressen van klanten lezen | **iedereen** | jij |
| Producten en prijzen wijzigen | **iedereen** | alleen jij |
| Bestelling wissen | iedereen | niemand — alles blijft in het archief |
| Vervalt | **na 30 dagen** | nooit |

Die derde en vierde rij zijn geen theorie: op dit moment kan iedereen die je
webadres kent de naam, het e-mailadres en het huisadres van al je klanten
uitlezen. Dat stopt hiermee.

---

## Wat als er iets niet werkt

### "Missing or insufficient permissions"

De site zegt dat Firestore toegang weigert. Drie mogelijke oorzaken:

1. **Je bent niet ingelogd.** Bestellen en je account bekijken kan alleen
   ingelogd. De collectie zelf moet wél zichtbaar zijn zonder inloggen.
2. **Je profiel mist het beheerdersvlaggetje.** Ga in Firebase naar
   **Firestore Database** → **Data** → map **users** → jouw document. Er hoort
   een veld `isAdmin` te staan met waarde `true` (type: boolean). Staat het er
   niet, klik dan op **Add field**, naam `isAdmin`, type `boolean`, waarde
   `true`, en sla op.
3. **De regels zijn niet volledig geplakt.** Ga terug naar het tabblad Rules en
   kijk of de laatste regel `}` er nog staat.

### Ik zie mijn eigen bestellingen niet meer

Log uit en opnieuw in. De site haalt je profiel dan opnieuw op, inclusief het
beheerdersvlaggetje.

### Ik wil een tweede beheerder

Twee plekken aanpassen:

- in `index.html`: `const ADMIN_EMAILS = ["jelle@mattan.be"];` — zet het tweede
  adres erbij;
- in `firestore.rules`: zoek `'jelle@mattan.be'` (het staat er twee keer) en
  doe hetzelfde.

Publiceer daarna de regels opnieuw.

---

## Nog twee dingen om te weten

**De instellingen zijn openbaar leesbaar.** Dat moet, want de browser van een
klant moet je filamenten en prijzen kunnen ophalen vóór hij inlogt. Daar zitten
ook je EmailJS-gegevens bij. Die sleutel hoort openbaar te zijn, maar zet in het
EmailJS-dashboard wél de **domeinbeperking** aan (alleen jouw site), anders kan
iemand anders met jouw sjablonen mailen.

**Wissen kan niemand, ook jij niet.** Bestellingen krijgen een vlaggetje en
verdwijnen uit het overzicht, maar blijven in het archief staan. Wil je er echt
één weg, dan doe je dat met de hand in Firebase → Firestore Database → Data.

---

## De regels zijn nagemeten

Deze regels zijn niet alleen bedacht maar ook uitgeprobeerd, tegen de echte
Firestore-emulator van Google: 36 controles, waarvan de helft dingen die
juist *niet* meer mogen. Alles klopt — de winkel blijft werken en een vreemde
komt er niet in.

Wil je dat zelf nakijken, bijvoorbeeld nadat je iets aan de regels wijzigt:

```
npm install --no-save firebase-tools @firebase/rules-unit-testing firebase
npx firebase emulators:exec --only firestore --project d-printing-shop-fbc7b \
  "node firestore-regels.test.mjs"
```

Je hebt daar Node.js en Java voor nodig. Het draait volledig op je eigen
computer; je echte databank wordt niet aangeraakt.
