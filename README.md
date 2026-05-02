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
- Sätt `NEXT_PUBLIC_LOCAL_HOURLY_COMPARE=1` i `.env.local` för att visa timjämförelsen (00–23) lokalt. Default är av, så den följer inte med i pushad version.
- Sätt `CS_MAX_SAMPLES` i `.env`/`.env.local` (t.ex. `50000`) för att behålla fler mätpunkter per spel lokalt.
