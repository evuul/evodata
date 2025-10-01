# 📊 Aktieåterköpsanalys

> ✨ *Ett personligt hobbyprojekt som växte till något större.*

Jag började bygga detta som ett litet sidoprojekt för att skapa en enkel live-funktion för att följa Evolution, ett bolag jag själv är intresserad av. Tanken var bara att visualisera deras återköp i realtid – men det ena ledde till det andra. Idag har det utvecklats till ett fullt verktyg med grafer, analyser och interaktiv funktionalitet.  
Det här projektet är både ett sätt för mig att lära mig mer om finansdata, och att utvecklas som utvecklare – och jag fortsätter bygga vidare på det löpande eftersom det är både roligt och utmanande.

---

## 🚀 Funktioner

- 🔁 **Återköpsstatus**  
  Visar aktuell status för pågående aktieåterköpsprogram, inklusive:  
  • Återstående kassa  
  • Antal aktier som kan köpas

- 📈 **Evolutions ägande**  
  Visualiserar hur många aktier Evolution själva äger över tid, samt ägarandel i procent.

- 📊 **Totala aktier**  
  Graf över hur antalet totala aktier förändras över tid, inklusive:  
  • Återköp  
  • Indragningar

- 📆 **Återköpshistorik**  
  Ger detaljerad historik för återköp, både:  
  • Dagligen  
  • Årligen  
  Inkluderar genomsnittligt pris och handelsvolym.

- 💸 **Återinvestering till investerare**  
  Kombinerar utdelningar och återköp för att visa:  
  • Total återinvestering till aktieägare  
  • Direktavkastning i %

- 📊 **Interaktiva grafer**  
  Byggda med [Recharts](https://recharts.org) för responsiv och interaktiv datavisualisering.

- 📱 **Mobilanpassning**  
  Fullt responsiv design med [Material UI (MUI)](https://mui.com) – fungerar smidigt på både desktop och mobil.

---

## 🛠️ Teknikstack

| Teknik        | Användning                             |
|---------------|-----------------------------------------|
| **React**     | UI-komponenter och routing              |
| **MUI**       | Responsiv design och komponentbibliotek |
| **Recharts**  | Grafer och datavisualisering            |
| **JavaScript**| Logik och databehandling (ES6+)         |
| **JSON**      | Hantering av statisk data               |

---

## ⚙️ Installation

```bash
# 1. Klona projektet
git clone https://github.com/din-användare/aktieaterkopsanalys.git
cd aktieaterkopsanalys

# 2. Installera beroenden
npm install

# 3. Starta projektet
npm start

---

## ⏱️ Schemalagd uppdatering av casinoscores

För att sidan ska fortsätta samla in spelardata även när ingen besökare har fliken öppen kan du lägga till ett Vercel Cron-jobb som pingar den nya webhooken var femtonde minut.

1. Skapa en hemlig token, t.ex. `openssl rand -hex 32`, och lägg den som miljövariabel `CASINOSCORES_CRON_SECRET` i Vercel (Production och Preview vid behov).  
2. Deploya om så att funktionen får tillgång till variabeln.  
3. I Vercel-projektet: **Settings → Cron Jobs → Add Cron Job**. Välj `*/15 * * * *` som schema, `POST` som metod, ställ in mål-URL till `/api/casinoscores/cron` och lägg till headern `Authorization: Bearer <din-token>`.  
4. Testa lokalt eller efter deploy med:  
   ```bash
   curl -X POST "https://<din-deploy>.vercel.app/api/casinoscores/cron" \
     -H "Authorization: Bearer <din-token>"
   ```  
   Responsen listar status per spel och bekräftar att mätpunkter sparats.

Webhooken hoppar över körningen om token saknas eller är felaktig, så exponera aldrig hemligheten publikt.
