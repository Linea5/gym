# Gym Tracker — návod na nasadenie

Architektúra je rovnaká ako edoapartment: GitHub Pages + single-file HTML + Apps Script + Google Sheet.

---

## 1. Vytvor Google Sheet

1. Otvor https://sheets.google.com → nový prázdny Sheet.
2. Pomenuj ho napríklad **"Ronald Gym Log"**.
3. Otvor **Extensions → Apps Script**. Otvorí sa nový tab s Apps Script editorom.
4. Vymaž defaultný kód v `Code.gs` a vlož tam celý obsah súboru `Code.gs` (ten, čo som ti pripravil).
5. Klikni **💾 Save** (alebo Ctrl+S).
6. V editore vľavo hore vyber funkciu **`setupSheets`** v dropdowne a klikni **Run** (▶).
   - Prvýkrát ťa Google poprosí o povolenia — schváľ ich (Advanced → Go to project → Allow).
   - Po dobehnutí ti Sheet vytvorí dva hárky `Sessions` a `Sets` s hlavičkami.

---

## 2. Nasaď Apps Script ako Web App

1. V Apps Script editore klikni vpravo hore **Deploy → New deployment**.
2. Pri "Select type" klikni ⚙ ikonku → **Web app**.
3. Vyplň:
   - **Description:** Gym tracker v1
   - **Execute as:** Me (`tvoj@email.com`)
   - **Who has access:** Anyone
4. Klikni **Deploy**.
5. Skopíruj **Web app URL** (končí na `/exec`). Túto URL budeme potrebovať v appke.

> Pri budúcich úpravách kódu: **Deploy → Manage deployments → ✏ edit → New version → Deploy**. URL ostáva rovnaká.

---

## 3. Nahraj `index.html` na GitHub

1. Choď na https://github.com/Linea5 → **New repository**.
2. Pomenuj ho napríklad **`gym`**.
3. Public alebo Private — obe fungujú s GitHub Pages.
4. Nahraj súbor `index.html` (Add file → Upload files).
5. **Settings → Pages**:
   - Source: Deploy from a branch
   - Branch: `main` / `(root)`
   - Save
6. Po 1–2 minútach budeš mať URL `https://linea5.github.io/gym/`.

---

## 4. Pripoj appku k Sheetu

1. Otvor `https://linea5.github.io/gym/` v Safari na iPhone.
2. Appka ťa hneď privíta obrazovkou **"Pripoj sa na Google Sheet"**.
3. Vlož tam URL z kroku 2.5 (tú končiacu na `/exec`).
4. Klikni **Uložiť & otestovať**.
5. Ak test prejde, appka sa otvorí. Ak zlyhá, skontroluj URL.

---

## 5. Pridaj na Home Screen iPhonu

1. V Safari klikni **Share** (štvorček so šípkou hore).
2. **Add to Home Screen**.
3. Hotovo — appka funguje ako natívna, full-screen, s vlastnou ikonkou.

---

## Poznámky

- **Endpoint URL je uložená v localStorage** každého zariadenia. Ak otvoríš appku na druhom zariadení, prejdeš znova krokom 4. Ale dáta uvidíš tie isté (lebo Sheet je spoločný).
- **Ak v Sheete zmažeš riadok ručne**, appka to pri ďalšom načítaní zohľadní.
- **Bezpečnosť**: rovnako ako edoapartment — dlhá Apps Script URL je tvoja jediná ochrana. Sheet je súkromný (len ty ho vidíš), ale ktokoľvek s URL môže do neho zapisovať. Pre tvoj use case OK.
- **Latencia**: zápis ~1–2s, čítanie ~1–3s (záleží od množstva dát).

---

## Architektúra v skratke

```
iPhone (Safari/PWA)
   │
   ├─ GET history (JSONP cez <script>) → Apps Script doGet → Sheet
   └─ POST session (no-cors fetch)     → Apps Script doPost → Sheet

Sheet "Ronald Gym Log"
   ├─ hárok Sessions: ID, Date, Training, Duration, Notes
   └─ hárok Sets: SessionID, ExerciseID, ExerciseName, SetNum, Weight, Reps, Notes
```
