# De site blijvend laten werken

Er zit één ding in je opzet dat na dertig dagen stopt, en een paar dingen die
je beter nu regelt dan straks. Hieronder staat alles op een rij, met wat je
precies moet klikken.

## 1. De regels van de databank — dit stopt echt na 30 dagen

Je Firestore staat in **testmodus**: iedereen mag alles lezen én schrijven, en
na dertig dagen gaat de deur helemaal dicht. Daarna kan niemand nog bestellen
en zie jij geen bestellingen meer.

**➜ De stap-voor-stap uitleg staat in [FIRESTORE.md](FIRESTORE.md).**
Vijf minuten werk, niets te installeren, geen gegevens kwijt.

Kort samengevat: de kant-en-klare regels staan in `firestore.rules`; die plak
je in de Firebase-console onder Firestore Database → Rules en publiceer je.
Ze laten alles werken zoals het nu werkt, verlopen nooit, en sluiten meteen een
gat: op dit moment kan iedereen die je webadres kent de adresgegevens van al je
klanten lezen.

## 2. Authenticatie

Niets te doen. Inloggen met e-mail en wachtwoord is gratis en verloopt niet.

Er wordt niet gecontroleerd of een e-mailadres echt bestaat. Iemand kan zich
dus aanmelden met het adres van een ander; die krijgt dan de bestelmails. Kom
je dat tegen, dan zie je het aan de bestelling in Shopbeheer.

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

De bestelbevestiging en de berichten bij *verzonden* en *geleverd* lopen via
EmailJS: gratis tot 200 berichten per maand.

**➜ De stap-voor-stap uitleg staat in [EMAIL.md](EMAIL.md).**
Een kwartier werk, met een kant-en-klaar sjabloon om te plakken.

Vul je niets in, dan verstuurt de shop niets en werkt de rest gewoon door.

## Samengevat

| Onderdeel | Kost | Vervalt |
| --- | --- | --- |
| GitHub Pages | niets | nee |
| Firestore (gratis pakket) | niets | nee, **na stap 1** |
| Firebase Auth | niets | nee |
| EmailJS | niets tot 200/maand | nee |
| Betalen | nog niet geregeld | — |

Alleen stap 1 is dringend. De rest kan wachten tot je het nodig hebt.
