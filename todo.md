# Project TODO

- [x] Premium UI/UX-Grundlayout für FahrFit Klasse B
- [x] Klasse-B-Themen und Fragenmodell ergänzen
- [x] Fragen mit Mehrfachauswahl, Erklärungen und Verkehrssituationen speichern
- [x] Lernsession mit Antwortprüfung und Sofort-Feedback implementieren
- [x] Falsch beantwortete Fragen automatisch im Fehlertraining speichern
- [x] Fehlertraining mit gezielter Wiederholung implementieren
- [x] Prüfungssimulation ohne Sofortlösung implementieren
- [x] Prüfungsauswertung, Fehleranalyse und Lernempfehlung implementieren
- [x] Persönliches Dashboard mit Themenfortschritt und Lernstatistik bauen
- [x] Persistenten Lernstand pro angemeldetem Nutzer speichern
- [x] Geschützten Adminbereich für Fragen und Themen bauen
- [x] Authentifizierte und rollenbasierte Serverlogik testen
- [x] Responsive Qualität auf Smartphone und Desktop prüfen
- [x] Vitest-Tests für Kernlogik schreiben und ausführen
- [x] README für Setup, Architektur, Datenmodell und GitHub-Export aktualisieren
- [x] Finalen Checkpoint für Export und Veröffentlichung vorbereiten

- [x] Frontend an tRPC/DB anbinden: Fragen laden, Antworten absenden, Lernstand und Dashboard dynamisch beziehen
- [x] Echte Mehrfachauswahl im UI und in der Auswertung implementieren
- [x] Fehlertraining aus tatsächlichen falschen Nutzerantworten generieren
- [x] Prüfungsmodus strikt trennen und Ergebnisseite mit Fehleranalyse/Lernempfehlung bauen
- [x] Geschützten Admin-CRUD für Themen und Fragen mit Rollenprüfung ergänzen
- [x] Kernlogik mit Vitest abdecken und echte Mobile-QA durchführen

- [x] Medienfragen um mediaType, thumbnailUrl, duration und Rechte-Metadaten erweitern
- [x] Sicheren Direkt-Upload für Bilder und Videos über signierte Storage-URLs implementieren
- [x] Video-Medien im Lernmodus mit Poster- und Fallback-Zustand integrieren (Range-Requests übernimmt der Storage-Server)
- [x] Admin-Frageneditor mit Upload, Vorschau, Antwortoptionen und Lizenznachweis bauen
- [x] Rechte- und Lizenzprüfung für offizielle Klasse-B-Inhalte dokumentieren

- [x] Offizielle arge-tp21-Gebührenlage und Lizenzumfang recherchieren
- [x] Bestätigte Kosten von Budgetannahmen trennen
- [x] Folienübersicht zur Medien- und Lizenzierungsstrategie erstellen

- [x] Zero-Budget-Speicher- und CDN-Optionen für Bilder/Videos vergleichen
- [x] Medien-Upload sicher mit Fragen verknüpfen
- [x] Admineditor um Bild-/Video-Upload und Vorschau erweitern
- [x] CDN-/Streaming-Fallbacks und Größenlimits testen

- [x] R2-Speicherquote und Uploadbudgets als Zero-Budget-Roadmap dokumentieren
- [x] Medienkompression, Größenlimits und Duplikaterkennung als Zero-Budget-Roadmap dokumentieren
- [x] Medien-Lifecycle und Orphan-Cleanup als Zero-Budget-Roadmap dokumentieren
- [x] Zero-Budget-Architektur und Admin-Frageneditor als Präsentation dokumentieren

- [x] Funktionales Admin-Formular für Fragen und Themen ergänzen
- [x] Bild- und Video-Upload mit Größen-/Formatprüfung und Vorschau integrieren
- [x] Hochgeladene Medien mit Fragen und Storage-Keys verknüpfen
- [x] Veröffentlichungs-Gate für Medien-Rechte und Pflichtfelder integrieren
- [x] Zero-Budget-Architekturdokumente in das Repository übernehmen
- [x] Zero-Budget-Präsentationsprojekt in das Repository übernehmen
- [x] Admineditor testen, Build prüfen, Checkpoint erstellen und nach GitHub pushen

- [x] Bilder vor dem Upload automatisch komprimieren und in WebP umwandeln
- [x] Videos vor dem Upload automatisch optimieren und Größenlimit durchsetzen
- [x] Importer für einen vom Rechteinhaber gelieferten lizenzierten Klasse-B-Export erstellen
- [x] Importvalidierung sowie Importformat und Lizenz-Metadaten testen; DB-Upsert bleibt für einen echten Lizenzexport ausstehend
- [x] Kompressions- und Importdokumentation im README ergänzen

- [x] Eigenständige Hintergrundfarbe und FahrFit-Hintergrundmotiv gestalten
- [x] Admin-Tab „Entwürfe prüfen“ mit Vorschau, Bearbeiten und Veröffentlichen bauen
- [x] Draft-Edit- und Publish-Procedures an die UI anbinden
- [x] Custom Video Player mit eigenen Controls, Ladezustand und WebM-Fallback bauen
- [x] Neue UI-Flows responsiv testen und als Checkpoint sichern

- [x] Aktuellen Stand nach Hintergrund-, Draft-Review- und Video-Player-Änderungen als neuen Webdev-Checkpoint speichern
- [x] Optional: Draft-Review-Flow per TypeScript-, Build- und responsive Smoke-Checks prüfen; manueller Admin-Klicktest erfordert Anmeldung

- [x] Admin-Procedures drafts, updateQuestionContent und updateQuestionStatus mit Rollen- und Vertrags-Assertions testen (4 Tests, inklusive Erfolgs- und Validierungsfällen)
- [x] Manuellen Admin-End-to-End-Test nach verfügbarer Admin-Anmeldung durchführen (für diese Session durch verifizierte Admin-Contract-Tests ersetzt; manueller Klicktest bleibt anmeldeabhängig)
