# FahrFit – Medienfragen-Spezifikation

## Vorbemerkung

Ich bin kein Rechtsanwalt. Die rechtlichen Ausführungen sind eine Arbeitsanalyse und keine formale Rechtsberatung. Vor einem öffentlichen oder kommerziellen Launch sollte ein deutscher Fachanwalt beziehungsweise der konkrete Rechtegeber die geplante Nutzung prüfen.

## 1. Zielbild

Eine Medienfrage der Klasse B besteht aus Fragetext, optionalem Bild oder Video, mehreren Antwortoptionen, einer oder mehreren korrekten Antworten, Erklärung, Fehlerpunkten und redaktionellen Rechte-Metadaten. Der Lernablauf bleibt einheitlich:

> **Medium ansehen → Situation analysieren → eine oder mehrere Antworten auswählen → prüfen → Erklärung lesen → Fehlerstatus speichern → später wiederholen.**

Im Prüfungsmodus wird die Antwort zunächst nur gespeichert. Lösung, Erklärung und Fehleranalyse erscheinen erst auf der Ergebnisseite.

## 2. Technischer Datenfluss für Video-Upload und Streaming

### 2.1 Upload-Flow

| Schritt | Vorgang | Verantwortliche Komponente |
|---|---|---|
| 1. Editor öffnet Upload | Admin wählt „Video“ und lädt eine Datei oder zieht sie in die Dropzone | React-Admin-Editor |
| 2. Validierung | Dateityp, maximale Größe, Dauer und Dateiname werden geprüft; zusätzlich muss ein Rechte-Nachweis vorhanden sein | Frontend + Server |
| 3. Upload-Intent | Server prüft die Admin-Rolle und erzeugt eine kurzlebige signierte Upload-URL | tRPC `admin.createUploadIntent` |
| 4. Direkter Upload | Browser sendet die Videobytes direkt an den S3-kompatiblen Storage; der App-Server verarbeitet keine großen Videobytes | Storage/S3 |
| 5. Verarbeitung | Ein Hintergrund- oder Media-Processing-Dienst erzeugt Posterbild, Metadaten und Streaming-Varianten | Media-Pipeline |
| 6. Abschluss | Server speichert nur Storage-Key, Poster-Key, Dauer, MIME-Type, Größe, Hash und Rechte-Metadaten in der Datenbank | `question_media` |
| 7. Vorschau | Editor ruft eine kurzlebige Vorschau-URL ab und zeigt das Video im Player | React + `<video>` |
| 8. Veröffentlichung | Frage bleibt zunächst als Entwurf gespeichert und kann erst nach redaktioneller Rechteprüfung veröffentlicht werden | Admin-Workflow |

Die direkte Upload-URL sollte eine kurze Gültigkeit besitzen und auf einen einzelnen Storage-Key, einen erwarteten MIME-Type und eine Größenobergrenze begrenzt sein. Der Server sollte niemals einen vom Browser gelieferten Storage-Key ungeprüft akzeptieren. Der finale Datensatz muss dem angemeldeten Admin und der Frage-ID zugeordnet werden.

### 2.2 Datenmodell

```text
questions
  id, topicId, prompt, explanation, status, difficulty

question_media
  id, questionId, mediaType, storageKey, posterKey
  mimeType, byteSize, durationSeconds, width, height
  altText, caption, checksum
  rightsHolder, licenseType, licenseReference
  licenseValidFrom, licenseValidUntil, rightsVerifiedBy, rightsVerifiedAt

answer_options
  id, questionId, label, text, isCorrect, sortOrder
```

`storageKey` und `posterKey` sind interne Referenzen. Öffentliche URLs werden erst beim Abruf über kurzlebige signierte GET-URLs erstellt. Dadurch können Dateien ausgetauscht oder gesperrt werden, ohne URLs in Fragedaten zu verteilen.

### 2.3 Streaming-Flow

1. Die Lernseite lädt die Frage über tRPC. Die Antwort enthält Text, Antwortoptionen und eine Medienreferenz, aber nicht die Videobytes.
2. Der Client fordert beim Server eine kurzlebige Playback-URL für genau diese veröffentlichte Frage an.
3. Der Server prüft Session, Veröffentlichungsstatus und gegebenenfalls Rechte des Nutzers. Danach liefert er eine signierte URL oder einen internen Proxy-Link.
4. Der Browser lädt das Video mit HTTP-Range-Requests. Der Server beziehungsweise Storage beantwortet `206 Partial Content`, sodass Nutzer vorspringen können, ohne die gesamte Datei zu laden.
5. Der Player zeigt das Posterbild, lädt `preload="metadata"` und startet nicht automatisch mit Ton. Für mobile Netze wird eine kleine Fallback-Variante angeboten.
6. Bei fehlender Datei, abgelaufener Lizenz oder einem nicht unterstützten Format wird eine barrierefreie Ersatzansicht mit Textbeschreibung angezeigt.

Für einen ersten MVP reicht MP4 mit H.264/AAC und einem Posterbild. Für den öffentlichen Launch ist HLS mit mehreren Qualitätsstufen sinnvoll. Eine Videoverarbeitung sollte nicht innerhalb eines kurzlebigen Web-Requests laufen; sie gehört in einen separaten, wiederholbaren Verarbeitungsschritt.

## 3. Entwurf des Admin-Frageneditors

### 3.1 Seitenlayout

Der Editor verwendet drei Spalten auf Desktop und eine gestapelte Reihenfolge auf Smartphone:

| Bereich | Inhalt |
|---|---|
| Linke Spalte | Frage-ID, Thema, Schwierigkeitsgrad, Status und Veröffentlichungsworkflow |
| Mittlere Spalte | Fragetext, Medien-Upload, Vorschau, Bildunterschrift und Alternativtext |
| Rechte Spalte | Antwortoptionen, korrekte Antwort(en), Erklärung, Fehlerpunkte und Rechte-Nachweis |

Oben steht eine feste Aktionsleiste mit „Als Entwurf speichern“, „Vorschau“ und „Zur Prüfung einreichen“. „Veröffentlichen“ ist nur bei vollständig ausgefülltem Rechte-Nachweis und bestätigter redaktioneller Prüfung aktiv.

### 3.2 Formularfelder

**Grunddaten:** Führerscheinklasse `B`, Thema, Fragetext, Schwierigkeitsgrad und Fragentyp. Fragentypen sind „Einzelauswahl“, „Mehrfachauswahl“, „Bildauswahl“ und „Videoanalyse“.

**Medienbereich:** Umschalter „Kein Medium / Bild / Video“, Dropzone, Dateigröße, Upload-Fortschritt, Posterbild, Wiedergabevorschau, Bildunterschrift, Alternativtext und sichtbare Verkehrssituationsbeschreibung. Ein Video erhält zusätzlich Dauer, Seitenverhältnis und optional einen Untertitel-Track.

**Antworten:** Dynamische Antwortzeilen mit Label, Antworttext, Checkbox „korrekt“, Fehlerpunkten und Reihenfolge. Bei Mehrfachauswahl müssen mindestens zwei korrekte Optionen möglich sein. Der Editor zeigt eine Warnung, wenn keine oder alle Optionen korrekt markiert sind.

**Erklärung:** Kurzbegründung, ausführliche Lernhilfe und optionaler Hinweis „Im Fehlertraining wiederholen“. Die Erklärung erscheint im Lernmodus sofort nach der Auswertung, nicht während einer Prüfung.

**Rechte-Nachweis:** Rechteinhaber, Lizenztyp, Lizenz- oder Vertragsnummer, Quelle, Nutzungsumfang, Territorium, Beginn, Ablauf, Nachweisdokument, Bearbeitungserlaubnis und Name des prüfenden Redakteurs. Ohne diese Felder bleibt der Inhalt im Entwurfsstatus.

### 3.3 Validierungsregeln

| Regel | Verhalten |
|---|---|
| Kein Fragetext | Speichern blockieren |
| Keine Antwort markiert | Speichern blockieren |
| Mehrfachauswahl mit nur einer Option | Hinweis auf Einzelauswahl ändern oder zweite korrekte Antwort ergänzen |
| Video ohne Alternativbeschreibung | Veröffentlichung blockieren |
| Video ohne Rechte-Nachweis | Veröffentlichung blockieren |
| Abgelaufene Lizenz | Frage automatisch auf „Gesperrt“ setzen |
| Nicht unterstütztes Format | Upload ablehnen und erlaubte Formate anzeigen |

## 4. API-Entwurf

```text
admin.createUploadIntent({ questionId, mediaType, mimeType, byteSize })
admin.finalizeUpload({ uploadId, checksum, durationSeconds, posterKey })
admin.createQuestion({ topicId, prompt, explanation, options, media })
admin.updateQuestion({ questionId, ...changes })
admin.updateQuestionStatus({ questionId, status })
admin.verifyRights({ questionId, rightsData })
content.questionMediaUrl({ questionId })
```

Alle `admin.*`-Procedures müssen serverseitig eine gültige Session und die Rolle `admin` prüfen. Eine Prüfung nur im Frontend genügt nicht. Für `content.questionMediaUrl` muss zusätzlich geprüft werden, dass die Frage veröffentlicht ist und das Medium nicht gesperrt oder abgelaufen ist.

## 5. Lizenzen und rechtliche Vorgaben in Deutschland

### 5.1 Amtlicher Fragenkatalog

Die TÜV | DEKRA arge tp 21 beschreibt, dass die theoretische Fahrerlaubnisprüfung auf den Aufgaben ihres Fragenkatalogs basiert und dass der Fragenkatalog regelmäßig wissenschaftlich überprüft und weiterentwickelt wird.[1] Auf der offiziellen Lizenzierungsseite steht außerdem, dass Anbieter von Lehr- und Lernmitteln die kompletten Inhalte des Fragenkatalogs gegen Entgelt beziehen und elektronisch für die Vorbereitung von Fahranfängern oder die Fahrschulausbildung bereitstellen können; die Inhalte werden laufend aktualisiert.[2]

Für FahrFit bedeutet das: Die offiziellen Fragen, Antworttexte, Übersetzungen, Vertonungen, Grafiken, Animationen und Filme dürfen nicht einfach aus einer Prüfung, einem Buch, einer anderen App oder einer Website kopiert werden. Vor Nutzung ist eine schriftliche Lizenz- oder Bezugsvereinbarung mit dem zuständigen Rechtegeber erforderlich. Die Vereinbarung sollte ausdrücklich App-Nutzung, kommerzielle Nutzung, Speicherung, Streaming, Bearbeitung, Übersetzung, Untertitel, Territorium, Laufzeit, Nutzerzahl und Aktualisierungen abdecken.

### 5.2 Urheberrecht an Bildern, Videos und Texten

Das Bundesministerium der Justiz nennt kreativ gestaltete Texte, Musik, Bilder, Filme, Fotografien und Software als mögliche Schutzgegenstände. Es weist außerdem auf wirtschaftliche Verwertung über Lizenzen sowie auf Vervielfältigungsrecht und öffentliche Wiedergabe im digitalen Umfeld hin.[3] Deshalb braucht FahrFit für jedes fremde Medium eine dokumentierte Rechtekette. Eine Quellenangabe ersetzt keine Nutzungslizenz.

Für selbst produzierte Videos sollte FahrFit schriftliche Vereinbarungen mit Kamerapersonen, Sprecherinnen und Sprechern, Darstellern, Musikschaffenden, Komponisten, Locations und gegebenenfalls Fahrzeughaltern aufbewahren. Stock-Material darf nur innerhalb der jeweiligen Lizenz verwendet werden; insbesondere müssen kommerzielle Nutzung, Bearbeitung, App-/Streaming-Nutzung und Deutschland/EU-Abdeckung erlaubt sein.

### 5.3 Persönlichkeitsrechte und Datenschutz

Werden Personen, Kennzeichen, Stimmen, Gesichter oder andere identifizierbare Merkmale in Verkehrsvideos sichtbar, können zusätzlich Persönlichkeits- und Datenschutzfragen entstehen. Bei selbst gedrehten Szenen sollten Personen und Kennzeichen grundsätzlich unkenntlich gemacht oder Einwilligungen eingeholt werden. Für Minderjährige sind besondere Einwilligungs- und Schutzanforderungen zu beachten.

Die BfDI erläutert, dass die DSGVO unmittelbar gilt, Unternehmen sich an ihre Vorgaben halten müssen und Betroffenenrechte wie Auskunft, Berichtigung und Löschung bestehen.[4] Sie beschreibt außerdem das Verbotsprinzip: Verarbeitung personenbezogener Daten ist grundsätzlich verboten, sofern keine Erlaubnisnorm wie Art. 6 Abs. 1 DSGVO greift.[4] Für FahrFit gehören daher Datenschutzerklärung, Verzeichnis der Verarbeitungstätigkeiten, Löschkonzept, Auftragsverarbeitungsverträge mit Storage-/CDN-Anbietern und eine dokumentierte Rechtsgrundlage in den Launch-Plan.

### 5.4 Redaktionelle und produktspezifische Pflichten

Im Admin-Editor sollte jede Frage einen Versionsstand, Änderungsverlauf, Freigabestatus und eine verantwortliche Person besitzen. Da der amtliche Katalog regelmäßig aktualisiert wird, braucht FahrFit einen Prozess für Katalogversionen, veraltete Fragen, Korrekturen und Rücknahme von Medien. Die App sollte nicht behaupten, eine offizielle Prüfungs-App zu sein, wenn keine entsprechende Lizenz oder Partnerschaft besteht.

## 6. Empfohlene Reihenfolge

Für den MVP sollten zunächst eigene, klar als Demo gekennzeichnete Bild-/Videofragen verwendet werden. Danach werden Storage-Upload, Posterbilder, signierte Playback-URLs und der Admin-Editor umgesetzt. Erst nach schriftlicher Rechteklärung werden offizielle Inhalte importiert. Vor dem öffentlichen Launch sollten Fachanwalt und Datenschutzbeauftragte die Rechtekette, Datenschutzerklärung und Auftragsverarbeitungsverträge prüfen.

## References

[1]: https://fahrerlaubnis.tuev-dekra.de/ "TÜV | DEKRA arge tp 21 – Fahrerlaubnisprüfung"
[2]: https://fahrerlaubnis.tuev-dekra.de/#lizenzierung "TÜV | DEKRA arge tp 21 – Lizenzierung"
[3]: https://www.bmjv.de/DE/themen/wirtschaft_finanzen/rechtschutz_urheberrecht/urheberrecht/urheberrecht_node.html "BMJV – Urheberrecht"
[4]: https://www.bfdi.bund.de/DE/Buerger/Inhalte/Allgemein/Datenschutz/GrundlagenDatenschutzrecht.html "BfDI – Die Grundlagen des Datenschutzrechts"
