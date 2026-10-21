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

## Local Backup (Upstash -> Local)

Projektet använder Upstash/Redis för dynamisk data. För lokal backup och restore:

1. Starta lokal Redis:
```bash
npm run redis:local:up
```

2. Ta backup från Upstash till lokal fil:
```bash
npm run backup:upstash
```
Filen sparas i `backups/upstash/`.

3. Återställ backup till lokal Redis-container:
```bash
npm run restore:local-redis -- backups/upstash/<din-backupfil>.json
```

4. Stäng lokal Redis när du är klar:
```bash
npm run redis:local:down
```

Tips för lokal analys:
- Sätt `LOCAL_REDIS_URL=redis://127.0.0.1:6379` i `.env.local` för att köra lobbydata helt lokalt (utan Upstash-läsning för csStore).
- Timjämförelsen (00–23) laddas från den privata hourly-endpointen för inloggade Premium-, Founder- och adminkonton.
- Sätt `CS_MAX_SAMPLES` i `.env`/`.env.local` (t.ex. `50000`) för att behålla fler mätpunkter per spel lokalt.

## Säker underhållskonfiguration

Skrivande synk- och diagnostik-endpoints kräver en bearer-token. Sätt `CRON_SECRET` som gemensam hemlighet, eller använd de mer avgränsade variablerna `BUYBACKS_SYNC_SECRET`, `SHORT_SYNC_SECRET` och `DEBUG_KV_SECRET`. Demokontot är avstängt om `DEMO_ACCOUNT_PASSWORD` saknas. Lägg aldrig dessa värden i repot.

## Fair value-modell v3

Fair value-modell v3 använder åtta sammanhängande kvartal för tillväxtjämförelsen och de senaste fyra för bolagets vinst- och kassaflödesbas. `valuationFundamentals.js` validerar rapportunderlaget, `valuationProjection.js` prognostiserar och diskonterar, och `fairValueUtils.js` sammanställer scenarierna. Marginalen påverkar både DCF och P/E. Bolagsvärdena delas med dagens utestående aktieantal; historisk EPS multipliceras inte med en återköpsfaktor.

Underlaget i `financialReports.json` har separata `valuationInputs` i MEUR med länkar till [bokslutet 2025](https://mb.cision.com/Main/12069/4304629/3923659.pdf) och [halvårsrapporten 2026](https://storage.mfn.se/bbf67910-dce3-4b0c-8228-de12e62c78f6/evo-q2-2026-07-17-eng.pdf). Q1 2026 härleds från H1 minus Q2, Q3 2025 från rullande tolv månader juni 2026 minus Q4 2025 och H1 2026. Fritt kassaflöde för dessa kvartal är operativt kassaflöde minus materiell och immateriell capex; obligationsinlösen ingår inte.

Modellens FCFE-bas är operativt kassaflöde + betald skatt − skattekostnad − ränteintäkt efter skatt − capex − leasingamortering. Identifierad skattefri engångsvinst tas bort från vinst och rörelseresultat. Rapporterad skattekostnad används som normaliserad kontant skatt. Prognosen håller kassakonvertering, capex/omsättning och leasing/omsättning konstanta; tillväxten tonas mot terminaltillväxten under fem år. Inga framtida återköp eller ny upplåning antas. Räntebärande skuld utöver leasing kräver separat skuldmodellering och stoppar beräkningen.

FCFE diskonteras med avkastningskrav på eget kapital i EUR och omräknas med oförändrad EUR/SEK. Överskottskassa är senaste rapportkassa minus kända återköp efter rapportdagen, spärrad kassa, aktuella skatteåtaganden netto och en rörelsereserv på 15% av TTM-omsättningen, lägst noll. Kassaflöden efter rapportdagen uppskattas inte. Båda metoderna inkluderar samma kassatillägg, vilket gör att sammanvägningen tar med det en gång. Viktningen 55% DCF / 45% P/E är inte historiskt kalibrerad. Terminalvärdets andel av rörelsevärdet visas separat; scenariointervallet är inget konfidensintervall.

Nya rapporter behöver komplett verifierat kassaflödes- och balansunderlag. Lokala beräkningsfält får bara komplettera API-data med samma period, omsättning, vinst och kassa; en ändrad rapportversion måste granskas. Saknas underlag visas datakontroll i stället för ett schablonvärde. Egna scenarier sparas under en versionsspecifik webbläsarnyckel så att äldre modellantaganden inte förs över automatiskt.

Webbläsartesterna körs med `npm run test:e2e` efter `npx playwright install chromium`. De startar en egen lokal server på port 3100 och använder simulerade API-svar. Kör inte ett Next-bygge samtidigt i samma arbetskatalog.
