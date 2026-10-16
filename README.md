# Tip-Terus · Evidencija radnog vremena

Web aplikacija za evidenciju dolazaka i odlazaka djelatnika.
Živi na subdomeni `tip-terus.hr`, a na glavnom webu se nalazi gumb koji vodi na nju.

## Funkcionalnosti

### Djelatnik
- Prijava mailom i lozinkom; lozinku može promijeniti sam.
- Gumbi **Došao sam** / **Odlazim**; vrijeme se može upisati ili ispraviti **samo za današnji dan** (provjera na serveru, zona Europe/Zagreb).
- Aplikacija sama računa odrađene sate.
- Pregled vlastitih sati, godišnjeg, bolovanja i Jurinih napomena.

### Admin (Jura)
- Popis djelatnika, dodavanje (ime, prezime, mail, privremena lozinka) i uklanjanje (deaktivacija, povijest ostaje).
- Postavljanje nove lozinke djelatniku.
- Označavanje **godišnjeg** i **bolovanja** – svaka kategorija se računa kao 8 sati, ali se vodi zasebno.
- Uređivanje dolaska/odlaska za bilo koji dan uz obavezan opis (opis je vidljiv i djelatniku).
- Upozorenje za dane koje djelatnik nije zatvorio (nema odlaska) – Jura ih zatvara.
- Statistika: filter po djelatniku i razdoblju.
- Export šihterice (Excel) po djelatniku ili zbirno, s vikendima i blagdanima.
- QR kod za ispis koji vodi na aplikaciju.

### Otvorena pitanja
- Pauze: jedan dolazak/odlazak dnevno ili više? Odbija li se pauza?

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
