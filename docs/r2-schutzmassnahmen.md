# FahrFit – Automatisierte R2-Schutzmaßnahmen

## Zielsetzung

Sicherstellung, dass FahrFit dauerhaft innerhalb des Cloudflare R2 Free Tiers (10 GB Speicher, 1 Mio. Class-A-Operationen, 10 Mio. Class-B-Operationen) bleibt, ohne manuelle Eingriffe.

## 1. Präventive Maßnahmen (Upload-Kontrolle)

| Maßnahme | Umsetzung | Effekt |
|---|---|---|
| **Client-seitige Kompression** | Nutzung von `browser-image-compression` für Bilder (WebP) und `ffmpeg.wasm` oder strikte Limits für Videos. | Reduziert den Speicherbedarf pro Medium um bis zu 80%. |
| **Strikte Dateigrößen-Limits** | Ablehnung von Uploads > 2MB (Bilder) und > 20MB (Videos) direkt im Admin-Frontend. | Verhindert versehentliches Hochladen von Rohmaterial. |
| **Duplikaterkennung** | Erzeugung eines SHA-256 Hashes vor dem Upload; Prüfung gegen vorhandene Hashes in der Datenbank. | Verhindert mehrfaches Speichern identischer Medien. |
| **Format-Erzwingung** | Nur WebP (Bilder) und MP4/H.264 (Videos) zulassen. | Optimale Kompatibilität bei minimaler Dateigröße. |

## 2. Automatisierte Speicherverwaltung (Lifecycle)

### 2.1 R2 Lifecycle-Regeln

Wir konfigurieren im R2-Bucket automatisierte Regeln für unreferenzierte oder temporäre Dateien:

- **Entwürfe löschen:** Dateien im Pfad `temp/` oder `drafts/`, die älter als 7 Tage sind und nicht mit einer veröffentlichten Frage verknüpft wurden, werden automatisch gelöscht.
- **Multipart-Cleanup:** Unvollständige Multipart-Uploads werden nach 24 Stunden automatisch entfernt.

### 2.2 Datenbank-gesteuerter Cleanup

Ein wöchentlicher **Heartbeat-Job** (Cron) führt folgende Schritte aus:

1. **Orphan-Check:** Abgleich aller Storage-Keys im R2-Bucket mit den `mediaUrl`-Einträgen in der `questions`-Tabelle.
2. **Mark-and-Sweep:** Keys, die in der Datenbank nicht (mehr) existieren, werden zum Löschen vorgemerkt und nach einer Sicherheitsfrist entfernt.
3. **Version-Pruning:** Wenn eine Frage aktualisiert wird, wird das alte Medium sofort zum Löschen vorgemerkt, sofern es nicht von anderen Fragen referenziert wird.

## 3. Quoten-Monitoring & Alarme

| Komponente | Logik | Aktion |
|---|---|---|
| **Speicher-Tracker** | Der Heartbeat-Job summiert wöchentlich die `byteSize` aller aktiven Medien. | Warnung im Admin-Dashboard bei Erreichen von 8 GB (80%). |
| **Operations-Zähler** | Überwachung der tRPC-Aufrufe für `uploadMedia` und `playbackUrl`. | Drosselung von Uploads bei ungewöhnlich hoher Frequenz (Schutz vor Missbrauch). |
| **Notfall-Stopp** | Bei Erreichen von 9,5 GB wird die Upload-Funktion für Admins automatisch gesperrt. | Verhindert das Überschreiten der kostenlosen 10-GB-Grenze. |

## 4. Technische Umsetzung (Beispiel Heartbeat)

```ts
// server/jobs/cleanup.ts
export async function cleanupOrphanedMedia() {
  const db = await getDb();
  const activeKeys = await db.select({ key: questions.mediaUrl }).from(questions);
  const bucketObjects = await listR2Objects(); // Helfer für R2 API
  
  for (const obj of bucketObjects) {
    if (!activeKeys.includes(obj.key)) {
      await deleteR2Object(obj.key);
      console.log(`Deleted orphaned media: ${obj.key}`);
    }
  }
}
```

## 5. Zusammenfassung für Admins

Im Adminbereich von FahrFit wird eine **"Storage Health"**-Anzeige integriert. Sie zeigt den aktuellen Füllstand (in MB/GB) und die Anzahl der Medien an. So behalten die Betreiber jederzeit die Kontrolle über das Zero-Budget-Limit.
