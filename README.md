# Holzbildhauerei Knowledge Base

Eine intelligente Wissensdatenbank für Holzbildhauerei, die automatisch relevante Quellen sammelt, kategorisiert und durchsuchbar macht.

## Features

- 🔍 **Intelligente Quellensuche** mit Google Serper API
- 🤖 **KI-gestützte Analyse** mit Google Gemini
- 📊 **Automatische Kategorisierung** und Tagging
- 🎯 **Ähnlichkeitssuche** basierend auf Tag-Kookkurrenz
- 🔐 **Admin-Panel** für Verwaltung
- ⭐ **Bewertungssystem** für Quellen

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Datenbank:** PostgreSQL (Supabase)
- **KI:** Google Gemini API
- **Search:** Serper API

## Deployment auf Vercel + Supabase

### 1. Supabase Datenbank einrichten

1. Gehe zu [Supabase](https://supabase.com/) und erstelle ein kostenloses Konto
2. Erstelle ein neues Projekt
3. Warte bis die Datenbank bereit ist
4. Kopiere die **Connection String** (Settings → Database → Connection String → URI)

### 2. GitHub Repository erstellen

```bash
# Im Projekt-Verzeichnis
git add .
git commit -m "Initial commit - Holzbildhauerei Knowledge Base"

# GitHub Repository erstellen (via GitHub CLI)
gh repo create holzbildhauerei-app --public --source=. --remote=origin

# Code pushen
git push -u origin main
```

### 3. Vercel Deployment

1. Gehe zu [Vercel](https://vercel.com/) und melde dich an (GitHub-Account verbinden)
2. Klicke auf **"Add New Project"**
3. Wähle dein `holzbildhauerei-app` Repository
4. Konfiguriere das Projekt:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

5. **Umgebungsvariablen** hinzufügen:
   ```
   DATABASE_URL=postgresql://[YOUR_SUPABASE_CONNECTION_STRING]
   GEMINI_API_KEY=[YOUR_GEMINI_KEY]
   SERPER_API_KEY=[YOUR_SERPER_KEY]
   NEXTAUTH_SECRET=[RANDOM_SECRET]
   NEXTAUTH_URL=https://[YOUR-APP].vercel.app
   ADMIN_PASSWORD=[YOUR_ADMIN_PASSWORD]
   ```

6. Klicke auf **"Deploy"**

### 4. Datenbank Migrationen ausführen

Nach dem ersten Deployment:

```bash
# Lokal mit Supabase Connection String
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Oder via Vercel CLI:

```bash
vercel env pull .env.local
npx prisma migrate deploy
```

### 5. Admin-Zugang

Navigiere zu `https://[YOUR-APP].vercel.app/admin` und logge dich mit dem konfigurierten `ADMIN_PASSWORD` ein.

## Lokale Entwicklung

### Prerequisites

- Node.js 18+
- npm oder yarn

### Setup

1. Klone das Repository:
   ```bash
   git clone https://github.com/[USERNAME]/holzbildhauerei-app.git
   cd holzbildhauerei-app
   ```

2. Installiere Dependencies:
   ```bash
   npm install
   ```

3. Erstelle `.env` Datei (siehe `.env.example`):
   ```bash
   cp .env.example .env
   # Füge deine API-Keys ein
   ```

4. Datenbank initialisieren:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. Entwicklungsserver starten:
   ```bash
   npm run dev
   ```

6. Öffne [http://localhost:3000](http://localhost:3000)

## API-Keys besorgen

### Google Gemini API
1. Gehe zu [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Erstelle einen API-Key
3. Kostenlos für moderate Nutzung

### Serper API
1. Gehe zu [Serper.dev](https://serper.dev/)
2. Registriere dich
3. 2500 kostenlose Suchanfragen/Monat

## Projekt-Struktur

```
holzbildhauerei-app/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── admin/             # Admin-Panel
│   └── page.tsx           # Hauptseite
├── components/            # React-Komponenten
├── lib/                   # Utilities & Business Logic
│   ├── gemini.ts         # Gemini API Integration
│   ├── serper.ts         # Serper API Integration
│   ├── db.ts             # Datenbank Logik
│   └── types.ts          # TypeScript Types
├── prisma/               # Prisma Schema & Migrations
└── public/               # Statische Assets
```

## Continuous Deployment

Jeder Push zum `main` Branch triggert automatisch ein neues Deployment auf Vercel.

Für Preview-Deployments:
```bash
git checkout -b feature/neue-funktion
git push origin feature/neue-funktion
# Vercel erstellt automatisch eine Preview-URL
```

## Troubleshooting

### Prisma Client Fehler
```bash
npx prisma generate
```

### Database Connection Error
- Überprüfe ob die `DATABASE_URL` korrekt ist
- Stelle sicher, dass die Supabase-Datenbank läuft
- Bei Vercel: Prüfe die Environment Variables

### Build Fehler
```bash
# Cache löschen
rm -rf .next
npm run build
```

## License

MIT

## Support

Bei Fragen oder Problemen, erstelle ein Issue auf GitHub.
