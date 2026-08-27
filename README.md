# FahrFit – Führerschein-Lernplattform Klasse B

FahrFit ist eine mobilefreundliche Lernplattform zur Vorbereitung auf die theoretische Führerscheinprüfung der Klasse B. Der MVP konzentriert sich auf den Lernkreislauf **Frage lösen → Antwort prüfen → Erklärung verstehen → Fehler wiederholen**.

## Enthaltene Funktionen

Die aktuelle Oberfläche enthält ein elegantes Dashboard, Themenfortschritt, Fehlertraining, Prüfungssimulation, Prüfungsergebnis, Lernstatistik und einen Adminbereich für die Inhaltsübersicht. Der Lernmodus unterstützt einzelne und echte Mehrfachauswahl-Fragen, direkte Rückmeldung mit Erklärung und die lokale Speicherung von Fehlerfragen für eine unterbrechungsfreie Demo.

Serverseitig ist die Anwendung mit tRPC und Drizzle vorbereitet. Themen, Fragen, Antwortoptionen, Lernsessions, Antworten, individuelle Fragenstatus und Favoriten besitzen eigene Datenbanktabellen. Für angemeldete Nutzer stehen Procedures zum Laden von Inhalten, Starten von Sessions, Absenden von Antworten, Laden des Fortschritts und Verwalten von Fehler-IDs bereit.

## Tech-Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Komponenten | shadcn/ui, Radix UI, lucide-react |
| Backend | Node.js, Express, tRPC 11 |
| Datenbank | MySQL/TiDB mit Drizzle ORM |
| Authentifizierung | Manus OAuth mit geschützten Procedures |
| Medien | S3-kompatibler Speicher über die vorhandenen Storage-Helfer |
| Qualität | TypeScript, Vitest, Produktionsbuild |

## Lokale Entwicklung

```bash
pnpm install
pnpm dev
```

Die wichtigsten Prüfungen sind:

```bash
pnpm check
pnpm test
pnpm build
```

## Projektstruktur

```text
client/src/pages/Home.tsx   # Dashboard, Lernmodus, Prüfung, Fortschritt, Adminansicht
client/src/index.css        # FahrFit Designsystem und responsive Layouts
server/routers.ts            # tRPC Procedures
server/db.ts                 # Datenbank-Helfer

driz​zle/schema.ts            # Tabellen und Typen
driz​zle/migrations/          # Generierte Migrationen
shared/                      # Geteilte Typen und Konstanten
todo.md                      # Verbindlicher Projektstatus
```

## Datenmodell

Die Datenbank unterscheidet zwischen Fragenstammdaten und individuellem Lernstand. `questions` enthält Fragetext, Erklärung, Thema, Schwierigkeitsgrad und Medienreferenz. `answer_options` speichert Antwortoptionen. `learning_sessions` und `session_questions` bilden einzelne Lerneinheiten und ihre Reihenfolge ab. `user_answers` speichert abgegebene Antworten; `user_question_status` hält Fehler, richtige Antworten und den Lernstatus pro Nutzer fest.

## Inhaltliche Hinweise

Die im Frontend enthaltenen Fragen sind eigenständige Demo- und Prototypinhalte. Für einen öffentlichen Launch muss ein lizenzierter Fragenkatalog verwendet werden. Offizielle Prüfungsfragen, Bilder und Videos dürfen nur mit entsprechender Berechtigung veröffentlicht werden. Die Fragenpflege im Adminbereich sollte vor dem Launch mit echten redaktionellen Daten verbunden werden.

## GitHub-Export

Das Projekt ist als eigenständiges Git-Repository vorbereitet. Vor dem Export müssen Secrets und `.env`-Dateien aus dem Repository ausgeschlossen bleiben. Empfohlene Schritte für einen lokalen GitHub-Export:

```bash
git init
git add .
git commit -m "Initial FahrFit Klasse-B-Lernplattform"
gh repo create fahrfit-app --private --source=. --remote=origin --push
```

Alternativ kann der vollständige Quellcode über den Projekt-Export im Management-Bereich in ein neues privates GitHub-Repository übertragen werden.

## Nächste Ausbaustufen

Als nächste technische Schritte sollten die Admin-CRUD-Formulare mit den tRPC-Procedures verbunden, der Fragenimport für lizenzierte Inhalte ergänzt, die Prüfungsergebnisse dauerhaft gespeichert und zusätzliche Vitest-Tests für Antwortauswertung, Fehlerstatus und Rollenprüfung hinzugefügt werden.

## Dokumentation

- Zero-Budget-Architektur: `docs/zero-budget-architektur.md`
- R2-Schutzmaßnahmen: `docs/r2-schutzmassnahmen.md`
- Medienfragen-Spezifikation: `docs/medienfragen-spezifikation.md`
- Lizenzkosten-Recherche: `docs/lizenzkosten-recherche.md`
- Präsentationsprojekt: `docs/presentations/fahrfit-zero-budget/`

## Medienkompression und Katalogimport

Der Admineditor optimiert Bilder vor dem Upload als WebP und versucht Videos im Browser über `MediaRecorder` als WebM mit reduzierter Bitrate zu speichern. Unterstützt werden harte Grenzen von 2 MB für Bilder und 20 MB für Videos.

Ein lizenzierter Klasse-B-Export kann mit `pnpm import:class-b -- ./licensed-class-b.json` importiert werden. Die Datei muss `metadata.licenseStatus: "licensed"`, eine `licenseSource`, Themen mit `sourceId` und Fragen mit eindeutiger `sourceId` enthalten. Der Import ist wiederholbar, ersetzt bestehende Antwortoptionen und legt Fragen zunächst als Entwurf an. Es werden keine offiziellen Inhalte automatisch aus dem Internet geladen.
