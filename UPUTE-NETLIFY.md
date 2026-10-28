# Postavljanje na Netlify

## 1. Račun
1. Otvori https://app.netlify.com/signup
2. Klikni **Sign up with GitHub** i prijavi se GitHub računom (Inphernus).
3. Ako pita za ime tima / namjenu: npr. `Tip-Terus`, **Work**.

## 2. Povezivanje s GitHubom
1. **Add new project** → **Import an existing project**.
2. Odaberi **GitHub** → **Authorize Netlify** → dopusti repozitorij **tip-terus-evidencija**.
3. S popisa odaberi **tip-terus-evidencija**.

## 3. Ključevi (prije deploya)
Na istoj stranici: **Add environment variables** → dodaj tri varijable:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nkuvjpqoktvgwnaprbxd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | iz `.env.local` (počinje sa `sb_publishable_`) |
| `SUPABASE_SECRET_KEY` | iz `.env.local` (počinje sa `sb_secret_`) |

Datoteku s ključevima otvoriš u Terminalu:

```bash
open -e ~/Documents/tip-terus-evidencija/.env.local
```

Kopiraj samo dio **iza** znaka `=`. Ključeve ne šalji nikome.

## 4. Deploy
1. Klikni **Deploy tip-terus-evidencija**.
2. Pričekaj 2–4 min dok ne piše **Published**.
3. Netlify da adresu tipa `nesto-123.netlify.app` – pošalji je Claudeu.

Nakon toga: DNS zapis za `satnica.tip-terus.hr` u cPanelu.
