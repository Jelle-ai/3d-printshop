# De site blijvend laten werken

Er zit één ding in je opzet dat na dertig dagen stopt, en een paar dingen die
je beter nu regelt dan straks. Hieronder staat alles op een rij, met wat je
precies moet klikken.

## 1. De regels van de databank — dit stopt echt na 30 dagen

Je Firestore staat in **testmodus**. Dat betekent: iedereen mag alles lezen én
schrijven, en na dertig dagen gaat de deur helemaal dicht. Daarna kan niemand
nog bestellen en zie jij geen bestellingen meer.

In dit project staat `firestore.rules` klaar. Die regels doen twee dingen: ze
laten alles werken zoals het nu werkt, en ze verlopen nooit.

1. Ga naar de [Firebase-console](https://console.firebase.google.com/) → jouw
   project → **Firestore Database** → tabblad **Regels**.
2. Selecteer alles wat er staat en plak de volledige inhoud van
   `firestore.rules` erin.
3. Klik **Publiceren**.

Het werkt meteen. Wat er verandert:

| | Voor | Na |
| --- | --- | --- |
| Collectie bekijken | iedereen | iedereen |
| Bestelling plaatsen | iedereen | wie ingelogd is, en alleen op eigen naam |
| Bestellingen bekijken | **iedereen** | jij, en elke klant enkel zijn eigen |
| Producten wijzigen | **iedereen** | alleen jij |
| Bestelling wissen | iedereen | niemand — alles blijft in het archief |
| Vervalt | na 30 dagen | nooit |

Dat derde punt is geen detail: nu kan iedereen die je adres kent de
adresgegevens van al je klanten lezen.

### Jezelf als beheerder

De regels kijken naar `isAdmin` in je eigen profiel onder `users`. Dat vlaggetje
zet de site automatisch voor `jelle@mattan.be`. Wil je later een ander adres
gebruiken, pas dan twee plekken aan: `ADMIN_EMAILS` in `index.html` en het
e-mailadres in `firestore.rules`.

## 2. Authenticatie

Niets te doen. E-mail/wachtwoord en de bevestigingsmail van Firebase zijn
gratis en verlopen niet.

## 3. Opslag van de modellen

De bestanden van klanten gaan in Firestore zelf, in stukken. Dat kost niets en
werkt onbeperkt door. Firebase Storage heb je niet nodig.

Waar je wél op moet letten: het gratis pakket geeft **1 GB** databank. Een model
van 5 MB gaat er dus zo'n tweehonderd keer in. Ruim af en toe oude uploads op in
de Firebase-console (`uploads`), of zet een grotere limiet aan als het knelt.

## 4. De site zelf

GitHub Pages is gratis en heeft geen vervaldatum. Zolang de repository bestaat,
staat de site online.

Twee dingen komen van buiten: de Firebase-onderdelen en het lettertypepakket
Font Awesome, allebei van een openbare CDN. Die gaan niet zomaar weg, maar als
je er niet van afhankelijk wil zijn, kun je ze later meeleveren in de repository.

## 5. Betalen

Dit is nog **testgeld**. Er gaat geen euro echt over. Wil je écht betaald
worden, dan heb je een betaalprovider nodig (Mollie ligt in België het meest
voor de hand) en een klein stukje server, want een betaling mag je nooit in de
browser afronden — anders kan iemand zichzelf op "betaald" zetten.

## 6. E-mail

De bevestiging van een e-mailadres loopt via Firebase en is gratis.
De overige berichten lopen via EmailJS: gratis tot 200 berichten per maand.
Zet in het EmailJS-dashboard de **domeinbeperking** aan, anders kan iemand
anders met jouw sleutel berichten versturen.

## Samengevat

| Onderdeel | Kost | Vervalt |
| --- | --- | --- |
| GitHub Pages | niets | nee |
| Firestore (gratis pakket) | niets | nee, **na stap 1** |
| Firebase Auth | niets | nee |
| EmailJS | niets tot 200/maand | nee |
| Betalen | nog niet geregeld | — |

Alleen stap 1 is dringend. De rest kan wachten tot je het nodig hebt.
