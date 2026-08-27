# Import eines lizenzierten Klasse-B-Katalogs

Der Importer verarbeitet ausschließlich einen rechtmäßig bezogenen Export des Rechteinhabers. Er lädt keine offiziellen Inhalte aus dem Internet herunter und erzeugt keine Prüfungsfragen selbst.

## Ausführen

```bash
DATABASE_URL="..." node scripts/import-class-b.mjs ./licensed-class-b.json
```

Die Datei muss die Lizenz im Metadatenblock bestätigen:

```json
{
  "metadata": {
    "licenseStatus": "licensed",
    "licenseSource": "Vertrag-oder-Lizenz-ID",
    "catalogVersion": "vom-Rechtegeber-gelieferte-Version"
  },
  "topics": [
    { "sourceId": "topic-vorfahrt", "name": "Vorfahrt", "description": "" }
  ],
  "questions": [
    {
      "sourceId": "question-001",
      "topicSourceId": "topic-vorfahrt",
      "prompt": "Lizenzierter Fragetext",
      "explanation": "Lizenzierte Erklärung",
      "difficulty": "medium",
      "mediaType": "image",
      "mediaUrl": "https://licensed-media.example/image.webp",
      "thumbnailUrl": "https://licensed-media.example/poster.webp",
      "mediaAlt": "Beschreibung der Verkehrssituation",
      "options": [
        { "label": "A", "text": "Antwort A", "isCorrect": true },
        { "label": "B", "text": "Antwort B", "isCorrect": false }
      ]
    }
  ]
}
```

Der Import ist idempotent über `sourceId`: Wiederholte Importe aktualisieren die Frage und ersetzen ihre Antwortoptionen, statt Duplikate zu erzeugen. Alle importierten Fragen werden zunächst als `draft` angelegt. Eine Veröffentlichung erfolgt erst nach redaktioneller Rechte- und Inhaltsprüfung. Medienreferenzen müssen bereits auf lizenzierten Storage/CDN-Dateien liegen; das Skript lädt keine fremden Assets herunter.
