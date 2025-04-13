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