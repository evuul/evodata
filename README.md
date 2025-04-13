**Aktieåterköpsanalys** 📈
Detta projekt är en React-baserad applikation för att visualisera och analysera aktieåterköp, utdelningar och andra finansiella nyckeltal för ett företag (i detta fall Evolution). Projektet inkluderar interaktiva grafer och tabeller för att ge en tydlig överblick av historiska och planerade data.

**Funktioner**
Återköpsstatus: Visar status för pågående aktieåterköpsprogram, inklusive återstående kassa och antal aktier som kan köpas.
**Evolutions ägande:** Visualiserar hur Evolution äger aktier över tid och deras ägarandel i procent.
Totala aktier: Visar utvecklingen av totala aktier över tid, inklusive effekter av återköp och indragningar.
**Återköpshistorik:** Ger en detaljerad historik över aktieåterköp, både dagligen och årligen, med genomsnittlig handel och pris.
Återinvestering till investerare: Visar totala återinvesteringar till aktieägare genom utdelningar och aktieåterköp, inklusive direktavkastning.
**Interaktiva grafer:** Använder Recharts för att skapa linje- och stapeldiagram med responsiv design.
**Mobilanpassning:** Optimerad för både desktop och mobila enheter med hjälp av MUI (Material-UI).
**Teknikstack**
React: För att bygga användargränssnittet.
Material-UI (MUI): För responsiv design och UI-komponenter.
Recharts: För att skapa interaktiva och responsiva grafer.
JavaScript (ES6+): För logik och databehandling.
JSON: För att hantera statisk data (t.ex. oldBuybackData.json).

**Installation och körning**
Följ dessa steg för att köra projektet lokalt:

**Klona projektet:** git clone https://github.com/din-användare/aktieaterkopsanalys.git
cd aktieaterkopsanalys
**Installera beroenden:** Se till att du har Node.js installerat, och kör sedan: npm install
Starta projektet: npm start

**Användning**
Navigera mellan olika flikar (t.ex. "Återköpsstatus", "Evolutions ägande", "Återinvestering") för att se olika analyser.
Använd graferna för att zooma in på specifika datapunkter via tooltips.
På mobila enheter kan du använda dropdown-menyn för att växla mellan flikar.

**Förbättringsmöjligheter**
API-integration: Hämta realtidsdata för aktiepriser och återköp istället för statisk JSON-data.
Fler visualiseringar: Lägg till fler typer av diagram, t.ex. cirkeldiagram för ägarandelar.
Filter och sortering: Lägg till fler filtreringsalternativ för historiska transaktioner.
Exportfunktion: Möjlighet att exportera grafer och tabeller som PDF eller CSV.