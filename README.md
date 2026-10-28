# Tip-Terus · Evidencija radnog vremena

Web aplikacija za evidenciju dolazaka i odlazaka djelatnika.
Živi na subdomeni `tip-terus.hr`, a na glavnom webu se nalazi gumb koji vodi na nju.

## Funkcionalnosti

### Djelatnik
- Prijava mailom i lozinkom; lozinku može promijeniti sam.
- Gumbi **Došao sam** / **Odlazim**, više dolazaka u danu je dopušteno, pauza se ne odbija; vrijeme se može upisati ili ispraviti **samo za današnji dan** (provjera na serveru, zona Europe/Zagreb).
- Aplikacija sama računa odrađene sate.
- Pregled vlastitih sati, godišnjeg, bolovanja i Jurinih napomena.

### Admin (Jura)
- Popis djelatnika, dodavanje (ime, prezime, mail, privremena lozinka) i uklanjanje (deaktivacija, povijest ostaje).
- Postavljanje nove lozinke djelatniku.
- Označavanje **godišnjeg**, **bolovanja** i **plaćenog blagdana** – svaka kategorija se računa kao 8 sati, ali se vodi zasebno. Blagdan se može zavesti pojedinačno ili svim djelatnicima odjednom.
- Subota je radni dan; neradna je samo nedjelja (i blagdani).
- Uređivanje dolaska/odlaska za bilo koji dan uz obavezan opis (opis je vidljiv i djelatniku).
- Upozorenje za dane koje djelatnik nije zatvorio (nema odlaska) – Jura ih zatvara.
- Statistika: filter po djelatniku i razdoblju.
- Export šihterice (Excel) po djelatniku ili zbirno, s vikendima i blagdanima.
- (QR kod radi Dario sam.)

### Otvorena pitanja
- (nema)

## Pokretanje na novom računalu

Potrebno: [Node.js](https://nodejs.org) (LTS), git i GitHub pristup.

```bash
git clone https://github.com/Inphernus/tip-terus-evidencija.git
cd tip-terus-evidencija
npm install
cp .env.example .env.local   # pa upisati prave vrijednosti
npm run dev
```

Aplikacija se otvara na http://localhost:3000.

## Postavljanje baze (jednom)

1. Supabase → **SQL Editor** → zalijepiti sadržaj [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   Postojeća baza: redom pokrenuti datoteke iz [`supabase/migrations/`](supabase/migrations/) koje još nisu pokrenute.
2. Kreirati admin račun (Jura): `npm run create-admin` i upisati ime, prezime, mail i lozinku.
3. (Po želji) probni djelatnik: `npm run create-employee`.

Zaboravljena lozinka (i Jurina): `npm run set-password`.
