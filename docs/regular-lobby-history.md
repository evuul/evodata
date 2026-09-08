# Dygnshistorik för vanliga lobbyn

Beskriver hur spelartrenden väljer källa, kontrollerar täckning och publicerar avslutade dygn.

`GAMES` i `src/config/games.js` styr hela spelurvalet. Den 8 september 2026 omfattar det 37 spel. Unibets större Extended Lobby får inte bidra med andra spel. Alias som `crazy-time:a` och `fan-tan-live` mappas före jämförelsen.

Unibet-insamlingen sparar `regularLobbyReadings` tillsammans med sin befintliga historik. För varje vanligt lobbyspel väljs det högsta giltiga värdet från Unibet och huvudkällan, högst 20 minuter gammalt. Ursprunglig källa och mättid bevaras. Frysta, framtida, saknade och ogiltiga värden används inte. En förändrad huvudmätning hålls inte kvar som fryst enbart på grund av en äldre snapshot.

Dygnsberäkningen använder högst en komplett observation per tiominutersintervall. Vid flera insamlingar i samma intervall används den senaste kompletta observationen. Samtliga konfigurerade spel måste finnas i varje observation. Dygnssnittet är summan av spelsnitten från samma intervall; två källor ger inte två röster. Detta är ett snitt av observationer, inte ett kontinuerligt mätt antal unika personer.

Ett dygn kräver minst 90 procent av sina förväntade intervall samt minst hälften av intervallen i varje lokal timme. Normala dygn har 144 intervall; Stockholms sommartidsbyten ger 138 eller 150. Ofullständiga dygn utelämnas från trend och rapportunderlag, med täckningsinformation i `dailyQuality`. Ingen nolla eller uppskattad höjning ersätter saknad data.

Äldre dagar rekonstrueras från bevarad Unibet-historik och tillgängliga huvudmätningar. Kända återhämtningsskrivningar tas bort från huvudserien före källjämförelsen. Frysta huvudserier med minst fyra identiska observationer över minst 30 minuter används inte. Osparade huvudvärden går inte att återställa; historiken beskriver de faktiskt bevarade källvärdena.

Färdiga dygn sparas separat i `cs:lobby:regular-daily:v1`, med metod, spelurval, täckning och spelsnitt. Högst 730 dygn behålls. Ett atomärt Redis-script hindrar en äldre eller glesare beräkning från att ersätta ett bättre underlag. Originalserierna och deras dygnsaggregat skrivs inte över. Korrigeringarna läses med en minuts processcache och appliceras på trend, spelgrafer, prognosunderlag och dagsrapporter.

Varje lyckad Unibet-insamling försöker färdigställa föregående Stockholmsdygn. Redan färdiga dygn behöver ingen ny råhistorikläsning. Om översikten inte publicerats ännu försöker nästa insamling igen. Den ordinarie materialiseringsrouten finns kvar, och dagsutskicket kontrollerar täckningen innan det använder dygnssnittet. Månadsöversikten uppdateras tillsammans med dygnsöversikterna.

Läsningarna för en ny dag är begränsade till 288 Unibet-poster och tre dagars spelserier. Ingen sådan återberäkning sker för varje besökare. Att lagra källmetadata ökar Unibet-posternas storlek, men behåller befintlig historikgräns och använder redan gjorda källanrop.

Offlinegranskning av exporter:

```sh
node scripts/backfillRegularLobbyDaily.mjs --input /path/to/unibet-export.json --primary /path/to/primary-export.json --from 2026-08-26 --to 2026-09-07 --output /path/to/review.json
```

För publicering används samma kommando med `node --env-file=<vald miljöfil>` och `--write`. Det kräver uttrycklig KV REST-konfiguration och avvisar `LOCAL_REDIS_URL`. Scriptet sparar en återställningskopia före ändring, publicerar separata korrigeringar och uppdaterar sex översiktsintervall samt månadsöversikten. Använd bara datum som verkligen täcks av exporten; första dygnet i en begränsad historik kan vara avklippt av retention.

Verifiering: `npm test` och `npm run build`. Sätt `LOBBY_DAILY_TEST_REDIS_URL` till en separat Redis-instans på localhost för tester av atomär publicering och samtidiga skrivningar. Dessa tester får inte köras mot produktionsdatabasen.
