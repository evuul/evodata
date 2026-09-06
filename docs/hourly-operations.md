# Hourly: historik, spelurval och drift

Beskriver Hourly-vyns datakällor, kvalitetsregler och drift. Applikationskod och schemaläggare behöver driftsättas separat.

## Samma spel i historik och live

`src/config/hourlyLobbyCohort.js` definierar startgruppen med 24 primära spel. Att ett spel läggs till i spellistan räcker inte för att ändra jämförelsen. Övriga spel tas med automatiskt först när de klarar den gemensamma täckningskontrollen nedan.

De åtta är Immersive Roulette, Monopoly Roulette, Fan Tan, Auto Roulette, Bac Bo, Super Andar Bahar, Speed Baccarat A och Gold Vault Roulette. Granskningen den 6 september 2026 hittade långa frysta värden och blandade återhämtningsmätningar för dessa spel. De utesluts från både historik och livejämförelse, för alla timmar. Inga spel väljs bort dynamiskt beroende på spelarantal eller dagens täckning.

Vid bortfall bland de inkluderade spelen pausas livedeltan. Urvalet krymper inte och saknade spel räknas inte som noll. Varje utökning får en ny signatur över hela spelurvalet; olika urval skarvas aldrig ihop.

## Automatisk utökning till hela lobbyn

Huvudinsamlingen fortsätter spara kompletta observationer för startgruppen. Därutöver sparas separata, tillgängliga mätningar för väntande lobbyspel. Huvudkällan måste klara befintlig kvalitetskontroll. Unibet-mätningar tas direkt från den ursprungliga insamlingen innan någon fallback läggs till, så att äldre källtider inte flyttas fram. Inga nya anrop till spelleverantörerna eller nya besökaranrop behövs.

Kandidatmätningar sparas i `cs:hourly:candidates:v1:day:<Stockholmsdatum>` som kompakta poster per spel, källa och tiominutersintervall, med 90 dagars retention. Ett Lua-anrop sparar alla giltiga kandidater från körningen. Dubbletter ökar inte täckningen; konflikter vid samma tidsstämpel ogiltigförklaras. De två källorna hålls isär vid kontroll av frysta värden. Återhämtningsvärden kan därför inte dölja en fryst huvudkälla genom att växla med dess värden.

Den dagliga materialiseringen prövar varje väntande spel tillsammans med **hela det redan inkluderade urvalet**. Alla spel måste matcha inom samma tiominutersintervall, med högst tio minuter mellan äldsta och nyaste källtid. Det utökade urvalet måste klara samtliga 24 timmar: minst sju giltiga dagar per timme, varav minst tre under senaste veckan. En dag/timme kräver minst två distinkta intervall över minst 20 minuter. Äldre rekonstruerad historik ger inte automatisk kvalificering som verifierad ny täckning.

Spel prövas i katalogordning. Efter varje godkänd utökning prövas nästa spel mot det nya, större urvalet. Individuellt god täckning på olika dagar räcker därför inte. Ett inkluderat spel tas aldrig automatiskt bort vid tillfälligt bortfall eller glesare täckning; saknade snitt blir luckor och live pausar när färska värden saknas.

Vid godkänd utökning räknas hela timkurvan om på de gemensamma observationerna. Den publiceras atomärt tillsammans med urval, signatur och ändringsdatum i samma lilla baslinje. Klienten räknar live enbart för spel-ID:n i denna publicerade baslinje. Läsrouten godtar endast kända lobbyspel och kräver att hela startgruppen ingår. En samtidig äldre beräkning kan inte skriva tillbaka ett mindre urval.

Vyn visar inkluderat antal, väntande spel, klara timmar per kandidat och senaste användbara mätdatum. Den förklarar att nivåändringen när ett urval utökas inte är spelartillväxt. Status räknas om dagligen; inget fast datum för inkludering utlovas. De extra databasläsningarna sker vid materialisering, aldrig för varje sidbesök.

**Aktivering:** både huvudcron, Unibet-cron och materialiseringskoden måste driftsättas. Befintliga äldre råserier för väntande spel uppgraderas inte automatiskt till verifierad kandidathistorik. Den nya insamlingen behöver bygga gemensam täckning; enbart en UI-uppdatering startar inte serverns schemalagda insamling.

Siffrorna gäller det fasta urvalet av bevakade spel, inte verifierat unika personer i hela Evolution.

## Återanvänd äldre mätningar

Den första materialiseringen läser högst 5 000 poster för vart och ett av de 24 valda spelen, i batcher om sex. Den läser aldrig den äldre totaltidsserien eller andra spel. Trasiga eller ofullständiga databasläsningar avbryter importen och bevarar tidigare resultat.

Importen validerar spelarantal och tidsstämplar, tar bort dubbletter och konflikter, utesluter kända stale/stuck-värden samt misstänkt frysta serier med minst fyra identiska observationer över minst 30 minuter. Alla 24 spel måste ha en användbar observation vid samma exakta tidsstämpel. Saknade värden fylls inte ut. Högst en matchning per tiominutersintervall sparas.

Det kompakta arkivet lagras separat från de löpande, kvalitetskontrollerade observationerna. Det innehåller tidsstämpel och summa samt signatur, importdatum och täckningsinformation. Ursprunglig kvalitetsmetadata saknas i äldre poster: dessa blir uttryckligen **historiska referenser**, inte verifierade färska observationer. En samtidig eller senare import skriver inte över det befintliga arkivet. Ett helt tomt källunderlag låser inte importen permanent.

Arkivet läses vid daglig materialisering. Råserierna behöver inte läsas igen för varje dag eller besök. De gamla dagarna lämnar automatiskt referensfönstret; arkivet kan inte hålla dem aktuella för alltid.

## Timsnitt och täckning

- Fönstret är 56 avslutade kalenderdagar i Europe/Stockholm. Dagens värden ingår först efter dygnsskiftet.
- En giltig dag/timme behöver minst två skilda tiominutersintervall vars faktiska tidsstämplar spänner över minst 20 minuter.
- Ett timsnitt visas efter minst sju giltiga dagar. Varje dag väger lika oavsett antalet mätningar. Medelvärdet beskriver de sparade stickproven, inte ett kontinuerligt mätt timmedelvärde.
- Datumintervall, antal giltiga dagar och täckning senaste veckan visas per timme. Gles senaste vecka döljer inte ett äldre referenssnitt.
- Rekonstruerade värden eller färre än tre giltiga dagar senaste veckan ger märkningen historisk referens. Äldre poster uppgraderas aldrig till verifierade bara för att sammanställningen körs igen.
- Vid övergången till vintertid får den upprepade timmen fortfarande bara en dags vikt. Saknade timmar fylls inte ut.
- Nya verifierade observationer har företräde om de överlappar arkivets tiominutersintervall; de två källorna dubbelräknas inte.

Genomgången av exporten den 6 september gav 116 442 råposter för det fasta urvalet, 2 609 användbara gemensamma tidsstämplar och 1 939 distinkta tiominutersintervall. Med ovanstående täckningskrav går 23 av 24 timmar att visa. Klockan 03 har fyra giltiga dagar och lämnas tom. Detta är historiskt underlag med ojämn insamling; det bevisar inte att den aktuella lobbyn samlas stabilt.

## Löpande insamling och läsning

En ny observation kräver alla 24 giltiga spel utan stale/stuck-markering, högst tio minuters ålder och högst tio minuter mellan källtiderna. Mätningen dateras efter den äldsta källtiden. Huvudinsamlingen behöver också tillräcklig senaste historik för att kontrollera frysta värden.

Observationerna sparas atomärt i dagsvisa Redis-hashar med högst en post per UTC-tiominutersintervall och 90 dagars retention. Äldre retries får inte ersätta nyare värden. Misslyckade skrivningar rapporteras separat.

Daglig materialisering slår ihop arkiv och nya observationer och sparar en liten baslinje. Den privata Hourly-routen hämtar bara denna efter serverkontroll av Premium/Founder/admin-behörighet. Besökaranrop läser inga råserier och hämtar ingen extra livesnapshot. Klienten använder det befintliga liveflödet och räknar deltan lokalt.

Livejämförelsen kräver färska värden för hela det publicerade urvalet, högst 20 minuters ålder och högst tio minuters tidsskillnad. Baslinjen måste ha beräknats under de senaste 48 timmarna. Live jämförs uttryckligen med det valda historiska timsnittet. Ett historiskt nollsnitt ger ingen procentdivision.

Saknad baslinje visas som **ännu inte sammanställd**, inte som att spelhistorik saknas. Vid ett beräknat men otillräckligt underlag visas täckning och vad som saknas. Timmar med för lite data förblir luckor i kurvan.

## Granska och initiera arkivet

Den ordinarie, autentiserade materialiseringsrouten `/api/casinoscores/lobby/materialize` initierar arkivet automatiskt när det saknas. Den vanliga besöksrouten gör det aldrig.

En redan exporterad JSON-fil med ett `series`-objekt kan granskas utan nätverk eller databasskrivningar:

```sh
node scripts/backfillHourlyHistory.mjs --input /path/to/export.json --output /tmp/hourly-review.json
```

För att initiera endast det nya Hourly-arkivet och dess baslinje, välj destinationens miljöfil uttryckligen och lägg till `--write`:

```sh
node --env-file=.env scripts/backfillHourlyHistory.mjs --input /path/to/export.json --write
```

Detta ändrar inga ursprungliga spelserier. Befintligt arkiv behålls och nya löpande observationer ingår i den omräknade baslinjen. `--now` är endast tillåtet för offlinegranskning. `npm run analyze:hourly:local` granskar lokal Docker-Redis med samma urval och regler.

## Jämnare schemaläggning

Kontrollen den 6 september hittade flera timmars mellanrum mellan GitHub Actions-körningar. `workers/hourlyLobbyScheduler.js` är förberedd som separat schemaläggare; den kan inte garantera att uppströmskällan levererar färska data.

1. Driftsätt applikationsändringarna till rätt Vercel-miljö.
2. Kontrollera `CRON_BASE_URL` i `workers/wrangler.hourly-lobby.jsonc`. Konfigurera Worker-hemligheten `CRON_SECRET` med rätt befintligt värde, utan att lägga det i repositoryt.
3. Driftsätt Worker: huvudinsamling minuterna 7, 17, 27, 37, 47 och 57; materialisering 03:35 UTC. Inga publika HTTP-triggers eller redirects tillåts.
4. Verifiera färska källtider, lyckade skrivningar och faktiskt ökande täckning. En lyckad HTTP-status bevisar inte en stabil mätserie.
5. Sätt `LOBBY_SCHEDULER=cloudflare` i GitHub först efter verifierad drift. Manuell GitHub-körning finns kvar som reserv.

Huvudinsamlingens separata `primaryMaterializedAt` och åtta minuters cooldown hindrar återhämtningsflödet från att skjuta upp en huvuduppdatering. Kontroll av frysta spel läser högst 32 senaste poster per spel.

## Verifiering

Kör `npm test` och `npm run build`. För verkliga Redis-tester: sätt `HOURLY_TEST_REDIS_URL` till en separat instans på localhost. Testerna kontrollerar atomära skrivningar, arkivets skydd mot överskrivning och isolerade nycklar. De får inte köras mot extern Redis.
