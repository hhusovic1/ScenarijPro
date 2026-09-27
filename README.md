# ScenarijPro

ScenarijPro je dinamička full-stack web aplikacija za kreiranje, uređivanje i prikaz scenarija. Projekat je napravljen kao funkcionalni prototip za rad sa Node.js, Express, MySQL2 i Sequelize tehnologijama.

## Funkcionalnosti

- kreiranje i pregled scenarija;
- uređivanje linija scenarija kroz AJAX pozive;
- zaključavanje linija i imena likova tokom uređivanja;
- praćenje promjena kroz delta zapise;
- checkpoint i vraćanje prethodnog stanja scenarija;
- uređivač teksta sa analizom riječi, uloga i formatiranja;
- jednostavan korisnički i projektni interfejs.

## Struktura projekta

```text
ScenarijPro/
├── css/                  # Stilovi korisničkog interfejsa
├── data/                 # Primjeri podataka i JSON fajlovi
├── html/                 # HTML stranice aplikacije
├── js/
│   ├── server.js         # Express server i REST API rute
│   ├── models.js         # Sequelize modeli i relacije
│   ├── PoziviAjax.js     # Klijentski AJAX/API pozivi
│   ├── EditorTeksta.js   # Logika tekstualnog uređivača
│   ├── editor.js         # Ponašanje stranice za uređivanje
│   └── test*.js          # Testovi
├── package.json          # Centralna Node.js konfiguracija
├── package-lock.json
└── README.md
```

Postojeća podjela foldera je zadržana jer HTML stranice koriste relativne putanje prema `css/` i `js/` folderima. Node konfiguracija je objedinjena u korijenu projekta kako bi se zavisnosti i komande pokretale sa jednog mjesta.

## Preduvjeti

- Node.js 18 ili noviji;
- npm;
- MySQL server;
- baza podataka `wt26`;
- MySQL korisnik i lozinka definisani u `.env` fajlu.

## Instalacija i pokretanje

```bash
npm install
npm start
```

Konfiguracija baze se nalazi u `.env` fajlu. Za novu instalaciju kopiraj `.env.example` u `.env` i prilagodi vrijednosti po potrebi. `.env` se ne commituje u Git.

Aplikacija je dostupna na [http://localhost:3000](http://localhost:3000).

> Napomena: server trenutno koristi `sequelize.sync({ force: true })`, što pri svakom pokretanju ponovo kreira tabele i briše postojeće podatke. Ovo je prihvatljivo za prototip, ali nije preporučljivo za produkciju.

## Testiranje

API testovi očekuju da server već radi na portu 3000:

```bash
npm start
npm run test:api
```

Klijentski testovi za `EditorTeksta` nalaze se u `js/test.html` i mogu se otvoriti u browseru.

## API pregled

Najvažnije rute su:

- `GET /api/scenarios/all` — lista scenarija;
- `POST /api/scenarios` — kreiranje scenarija;
- `GET /api/scenarios/:scenarioId` — dohvat scenarija;
- `POST /api/scenarios/:scenarioId/lines/:lineId/lock` — zaključavanje linije;
- `PUT /api/scenarios/:scenarioId/lines/:lineId` — izmjena linije;
- `GET /api/scenarios/:scenarioId/deltas` — dohvat promjena;
- `POST /api/scenarios/:scenarioId/checkpoint` — kreiranje checkpointa;
- `GET /api/scenarios/:scenarioId/restore/:checkpointId` — vraćanje checkpointa.

## Napomena za dalji razvoj

Za produkcijsku verziju preporučuje se premještanje MySQL pristupnih podataka u `.env` fajl, uklanjanje `force: true`, dodavanje autentifikacije i uvođenje zasebnih foldera za rute, kontrolere i middleware.
