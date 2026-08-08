# E-mail instellen

Je site stuurt vier soorten berichten:

| Wanneer | Wat de klant krijgt |
| --- | --- |
| Account aanmaken | Een link om zijn e-mailadres te bevestigen |
| Bestelling geplaatst | Bevestiging met alles wat hij besteld heeft |
| Jij zet op *Verzonden* | Bericht dat het onderweg is, met de verwachte dagen |
| Jij zet op *Geleverd* | Vraag om op de site op **Ontvangen** te klikken |

**Het eerste komt van Firebase zelf**, niet van EmailJS. Je hoeft daar dus geen
sjabloon voor te maken — Firebase heeft er al een. Komt hij niet aan, kijk dan
onderaan bij *[Er komt geen bevestigingsmail](#er-komt-geen-bevestigingsmail)*.

Voor de andere drie heb je EmailJS nodig. Waarom: een website kan zelf geen
post versturen — daar hoort een server bij, en die heb je niet. EmailJS is
gemaakt om vanuit de browser te versturen. Gratis tot 200 berichten per maand.

Reken op een kwartier. Je hoeft niets te installeren.

---

## Stap 1 — Account maken en je mailbox koppelen

1. Ga naar **<https://www.emailjs.com/>** en maak een gratis account
   (*Sign Up*). Bevestig je e-mailadres.
2. Klik links op **Email Services** → **Add New Service**.
3. Kies je mailprovider — **Gmail** als je een Gmail-adres gebruikt, anders
   Outlook, of *Other* met de gegevens van je eigen provider.
4. Klik **Connect Account** en geef toestemming. Je logt in bij je eigen
   mailbox; EmailJS mag daarna namens jou versturen.
5. Klik **Create Service**.

Je ziet nu een regel met een **Service ID**, iets als `service_a1b2c3d`.
**Schrijf die over** — die heb je zo nodig.

> Vanaf welk adres vertrekken de berichten? Vanaf het adres dat je hier
> gekoppeld hebt. Klanten die op *Beantwoorden* klikken, komen dus bij jou uit.

---

## Stap 2 — Eén sjabloon maken

Het gratis pakket geeft maar een paar sjablonen. Dat hoeft niet te knellen: de
shop stuurt bij elk bericht zijn eigen kop, inleiding en knoptekst mee. **Eén
sjabloon volstaat dus voor alle drie de berichten.**

1. Klik links op **Email Templates** → **Create New Template**.
2. Geef hem bovenaan een naam, bijvoorbeeld `Extrudo bericht`.
3. Vul het tabblad **Settings** in — dit is het stukje dat het vaakst misgaat:

   | Veld | Wat je invult |
   | --- | --- |
   | **To Email** | `{{to_email}}` |
   | **From Name** | `{{from_name}}` |
   | **Reply To** | `{{reply_to}}` |
   | **Subject** | `{{mail_title}} — bestelling {{order_number}}` |

   > Laat je **To Email** op je eigen adres staan, dan krijg jíj alle post en de
   > klant niets. Het moet echt `{{to_email}}` zijn, met de dubbele accolades.

4. Ga naar het tabblad **Content**, zet de opmaak op **Code / HTML** (het
   knopje `</>` boven het tekstvak) en plak dit erin:

```html
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#15171b;">
  <p style="font-family:monospace;font-size:11px;letter-spacing:.18em;color:#8a8f98;margin:0 0 18px;">EXTRUDO</p>

  <h1 style="font-size:22px;margin:0 0 10px;">{{mail_title}}</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">Hallo {{to_name}}, {{mail_intro}}</p>

  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px;">
    <tr><td style="padding:6px 0;color:#8a8f98;">Bestelling</td><td style="text-align:right;font-family:monospace;">{{order_number}}</td></tr>
    <tr><td style="padding:6px 0;color:#8a8f98;">Besteld op</td><td style="text-align:right;">{{order_date}}</td></tr>
    <tr><td style="padding:6px 0;color:#8a8f98;">Status</td><td style="text-align:right;">{{order_status}}</td></tr>
  </table>

  <pre style="background:#f4f3ef;border-radius:10px;padding:14px;font-family:monospace;font-size:13px;white-space:pre-wrap;margin:0 0 18px;">{{order_lines}}</pre>

  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:22px;">
    <tr><td style="padding:4px 0;color:#8a8f98;">Subtotaal</td><td style="text-align:right;">{{order_subtotal}}</td></tr>
    <tr><td style="padding:4px 0;color:#8a8f98;">Verzending</td><td style="text-align:right;">{{order_shipping}}</td></tr>
    <tr><td style="padding:10px 0;border-top:1px solid #e3e1db;font-weight:600;">Totaal</td>
        <td style="text-align:right;padding:10px 0;border-top:1px solid #e3e1db;font-weight:600;">{{order_total}}</td></tr>
  </table>

  <p style="margin:0 0 22px;">
    <a href="{{action_url}}" style="background:#FF4F18;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;display:inline-block;font-weight:600;">{{action_label}}</a>
  </p>

  <p style="font-size:13px;color:#8a8f98;line-height:1.6;margin:0 0 4px;">Bezorgadres</p>
  <p style="font-size:14px;white-space:pre-line;margin:0 0 22px;">{{address}}</p>

  <p style="font-size:12px;color:#8a8f98;border-top:1px solid #e3e1db;padding-top:14px;margin:0;">
    Extrudo &middot; Lebbeke, België &middot; <a href="{{site_url}}" style="color:#8a8f98;">{{site_url}}</a>
  </p>
</div>
```

5. Klik rechtsboven op **Save**.
6. Boven de sjabloon staat nu een **Template ID**, iets als `template_x9y8z7`.
   **Schrijf die ook over.**

---

## Stap 3 — Je sleutel ophalen

1. Klik links op **Account**.
2. Op het tabblad **General** staat **Public Key**, iets als `AbCdEf12345`.
   Dat is de derde code die je nodig hebt.

Die sleutel is bedoeld om openbaar te zijn — hij staat straks in je website.
In stap 6 zet je de beveiliging aan die daarbij hoort.

---

## Stap 4 — De codes in je shop zetten

1. Open je site en log in als beheerder.
2. Ga naar **Shopbeheer** → tabblad **Prijzen** → blok **E-mail**.
3. Vul in:

   | Veld | Waarde |
   | --- | --- |
   | EmailJS service ID | uit stap 1, `service_…` |
   | EmailJS public key | uit stap 3 |
   | Sjabloon: bestelbevestiging | uit stap 2, `template_…` |
   | Sjabloon: verzonden | **dezelfde** `template_…` |
   | Sjabloon: geleverd, graag bevestigen | **dezelfde** `template_…` |
   | Afzendernaam | Extrudo |
   | Antwoordadres | jelle@mattan.be |

   Ja, drie keer dezelfde sjabloon-ID. De shop zorgt zelf voor de juiste kop en
   knop per bericht. Wil je later drie verschillende ontwerpen, maak dan extra
   sjablonen en vul hier de andere ID's in.

4. Klik onderaan op **Prijzen opslaan**.

Het lampje bovenin het blok springt op **E-mail staat aan**.

---

## Stap 5 — Testen

Klik in datzelfde blok op **Testmail sturen**. Je krijgt binnen een halve
minuut een bericht op je eigen adres, met de kop *Testbericht*.

Komt hij niet aan:

| Melding | Wat het betekent |
| --- | --- |
| `The recipients address is empty` | **To Email** in je sjabloon staat niet op `{{to_email}}` |
| `The Public Key is invalid` | Verkeerde sleutel, of een spatie meegeplakt |
| `Template ID not found` | Sjabloon-ID klopt niet, of je hebt hem niet opgeslagen |
| `The service is not found` | Service ID klopt niet |
| `API calls are disabled for non-browser applications` | Zet in EmailJS → Account → Security de optie *Allow EmailJS API for non-browser applications* uit — de shop verstuurt vanuit de browser |
| Niets, geen fout | Kijk in je map ongewenste post |

Werkt de testmail, dan doe je één echte proef: bestel iets op je eigen site en
kijk of de bevestiging binnenkomt. Zet die bestelling daarna op *Verzonden* en
op *Geleverd* — dan zie je alle drie de berichten.

---

## Stap 6 — Beveiligen (niet overslaan)

Je sleutel staat in de website en is dus voor iedereen te zien. Zonder
beveiliging kan iemand anders daarmee post versturen die van jou lijkt te komen.

1. Ga in EmailJS naar **Account** → tabblad **Security**.
2. Zet **Use Allowlist** aan.
3. Vul het adres van je site in, bijvoorbeeld `jelle-ai.github.io`.
4. Opslaan.

Vanaf nu werkt je sleutel alleen nog vanaf jouw eigen site.

---

## Goed om te weten

**200 berichten per maand.** Elke bestelling kost er drie (bevestiging,
verzonden, geleverd), dus dat is ruim zestig bestellingen per maand. Zit je
eraan, dan kost het volgende pakket ongeveer 9 dollar per maand.

**Een mislukt bericht houdt nooit een bestelling tegen.** Gaat er iets mis bij
EmailJS, dan wordt de bestelling gewoon geplaatst en krijg jij een melding in
beeld. De klant merkt er niets van behalve dat de mail uitblijft.

**Vul je niets in, dan verstuurt de shop niets.** Alles blijft werken; er komt
alleen geen post. Je kunt dit dus rustig later doen.

**De velden die je in een sjabloon kunt gebruiken:**

| Veld | Wat erin staat |
| --- | --- |
| `{{to_email}}` `{{to_name}}` | Adres en naam van de klant |
| `{{mail_title}}` `{{mail_intro}}` | Kop en inleiding, verschilt per bericht |
| `{{action_url}}` `{{action_label}}` | De knop, verschilt per bericht |
| `{{order_number}}` `{{order_date}}` `{{order_status}}` | Over welke bestelling het gaat |
| `{{order_lines}}` | Wat er besteld is, regel per regel, met de kleuren erbij |
| `{{order_subtotal}}` `{{order_shipping}}` `{{order_total}}` | De bedragen |
| `{{address}}` | Het bezorgadres, over drie regels |
| `{{site_url}}` | Het adres van je site |
| `{{delivery_from}}` `{{delivery_to}}` | Alleen bij *verzonden*: de verwachte dagen |
| `{{confirm_url}}` | Alleen bij *geleverd*: de link om ontvangst te bevestigen |
| `{{from_name}}` `{{reply_to}}` | Wat je bij Shopbeheer invulde |

---

## Er komt geen bevestigingsmail

Dit bericht komt van **Firebase**, niet van EmailJS. Maak er dus geen sjabloon
voor aan bij EmailJS — dat helpt niet en kost je een van je twee gratis
sjablonen. Loop in plaats daarvan deze vier dingen na.

**De shop zegt het nu zelf.** Vertrekt er niets, dan staat de reden op het
wachtscherm, en als jij bent ingelogd staat erbij wat je moet klikken. Zie je
daar niets staan, dan is het bericht wél verstuurd en zit het probleem bij de
mailbox — kijk bij je ongewenste post.

### 1. Staat inloggen met e-mail aan?

Firebase-console → **Authentication** → **Sign-in method** → **Email/Password**
moet op *Enabled* staan. Staat hij uit, dan vertrekt er nooit iets.

### 2. Staat het adres van je site in de lijst?

Firebase-console → **Authentication** → **Settings** → **Authorized domains** →
**Add domain** → `jelle-ai.github.io` → opslaan.

Firebase zet daar vanzelf alleen `localhost` en zijn eigen adressen in. Staat
jouw adres er niet bij, dan weigert Firebase de terugkeerlink in het bericht.
De shop stuurt het dan alsnog, maar zonder die link: je komt na het bevestigen
op een pagina van Firebase in plaats van terug op je eigen site. Zet dit dus
even goed.

### 3. Kijk in je ongewenste post

Het bericht vertrekt van `noreply@d-printing-shop-fbc7b.firebaseapp.com`. Dat
adres kent je mailbox niet, dus het belandt makkelijk bij de spam. Markeer het
één keer als *geen spam*, dan gaat het daarna vanzelf goed.

### 4. Te vaak achter elkaar geprobeerd?

Firebase houdt het na een stuk of vijf berichten naar hetzelfde adres even voor
gezien. Wacht een kwartier en probeer opnieuw.

### Het bericht mooier maken

Firebase-console → **Authentication** → **Templates** → **Email address
verification**. Daar pas je de afzendernaam, het onderwerp en de tekst aan.
Handig: zet **From name** op `Extrudo`, anders staat er de naam van je project.
