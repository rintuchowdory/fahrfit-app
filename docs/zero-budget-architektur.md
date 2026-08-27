# FahrFit – Zero-Budget-Architektur für Medien & CDN

## 1. Strategie: Vorhandene Ressourcen nutzen

Um FahrFit ohne zusätzliche Kosten zu bauen, nutzen wir die bereits im Projekt integrierten Cloud-Ressourcen und kombinieren sie mit kostenlosen Drittanbieter-Tiers für die Skalierung.

| Komponente | Zero-Budget-Lösung | Vorteil |
|---|---|---|
| **Medien-Speicher** | Integrierter Manus S3-Storage | Bereits im Projekt enthalten, keine Einrichtungskosten, sichere Verwaltung über `storagePut`. |
| **CDN / Ausspielung** | Cloudflare Free Tier (vorhanden) | Die App läuft bereits hinter dem Cloudflare-Proxy. Wir nutzen Browser-Caching und Cloudflare-Edge-Caching für statische Medien. |
| **Video-Hosting** | YouTube (Nicht gelistet) oder Cloudinary Free | YouTube bietet unbegrenztes kostenloses Video-Hosting für nicht gelistete Videos. Cloudinary bietet 25 GB kostenlosen Speicher/Bandbreite für direkte Einbettung. |
| **Datenbank** | Integrierte TiDB/MySQL | Bereits im Projekt enthalten, keine separaten Kosten für das Fragen- und Medienmodell. |

## 2. Technischer Datenfluss für den Admin-Frageneditor

### 2.1 Upload-Prozess (Zero-Budget)

1. **Admin-Frontend:** Der Admin wählt im Editor eine Bild- oder Videodatei aus.
2. **Client-seitige Prüfung:** Die App prüft Dateigröße (z.B. max. 5MB für Bilder, 20MB für Videos) und Format, um Storage-Limits einzuhalten.
3. **Server-Upload:** Der Client sendet die Datei an eine tRPC-Mutation `admin.uploadMedia`.
4. **Backend-Verarbeitung:**
   - Das Backend nutzt den vorhandenen `storagePut`-Helfer.
   - Die Datei wird im integrierten S3-Storage gespeichert.
   - Der Server erhält einen `storageKey` und eine interne URL (z.B. `/manus-storage/abc_123.mp4`).
5. **Verknüpfung:** Die `mediaUrl` wird direkt im `questions`-Datensatz gespeichert.

### 2.2 Performante CDN-Ausspielung

Obwohl der integrierte `/manus-storage/`-Pfad sicher ist, ist er standardmäßig auf `no-store` gesetzt. Für eine performante Ausspielung nutzen wir folgende Optimierungen:

- **Browser-Caching:** Wir erweitern den `storageProxy`, um für Bilder und Videos `Cache-Control: public, max-age=31536000` zu setzen, sofern die Datei öffentlich zugänglich sein darf.
- **Cloudflare Edge:** Da die App über Cloudflare läuft, werden einmal angeforderte Medien an den Edge-Nodes zwischengespeichert.
- **Lazy Loading:** Im Lernmodus werden Bilder und Videos erst geladen, wenn die Frage aktiv ist (`loading="lazy"` für Bilder, `preload="metadata"` für Videos).

## 3. Implementierung des Admin-Frageneditors

### 3.1 UI-Komponenten (React)

- **MediaDropzone:** Eine Drag-and-Drop-Fläche für den schnellen Upload.
- **MediaPreview:** Zeigt das hochgeladene Bild oder den Video-Player sofort an.
- **QuestionForm:** Felder für Thema, Fragetext, Erklärung und dynamische Antwortoptionen.
- **RightsGate:** Ein Pflichtfeld für den Lizenznachweis (z.B. "Eigene Aufnahme" oder "Lizenz arge tp 21").

### 3.2 API-Erweiterung (tRPC)

```ts
admin: router({
  // Erzeugt einen Upload-Intent und speichert die Datei
  uploadMedia: adminProcedure
    .input(z.object({ 
      fileName: z.string(), 
      fileType: z.string(), 
      content: z.string() // Base64 oder Multipart
    }))
    .mutation(async ({ input }) => {
      const { key, url } = await storagePut(input.fileName, input.content, input.fileType);
      return { key, url };
    }),
    
  // Speichert die vollständige Frage mit Medienverknüpfung
  saveQuestion: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      topicId: z.number(),
      prompt: z.string(),
      explanation: z.string(),
      mediaUrl: z.string().optional(),
      mediaAlt: z.string().optional(),
      options: z.array(z.object({ text: z.string(), isCorrect: z.boolean() }))
    }))
    .mutation(async ({ input }) => {
      // DB-Logik zum Erstellen oder Aktualisieren
    })
})
```

## 4. Kostenlose Betriebsgrenzen & Fallbacks

| Risiko | Zero-Budget-Lösung |
|---|---|
| **Storage voll** | Kompression von Bildern (WebP) und Videos (H.264) vor dem Upload erzwingen. |
| **Bandbreite am Limit** | YouTube für Videos nutzen (unbegrenzt kostenlos, wenn nicht gelistet). |
| **Hohe Latenz** | Cloudflare-Caching optimieren und kleine Vorschaubilder (Thumbnails) nutzen. |
| **Rechtliche Kosten** | Nur eigene Medien oder CC0-Inhalte verwenden, bis die offizielle Lizenz finanziert ist. |

## 5. Nächste Schritte

1. **Storage-Proxy anpassen:** Cache-Header für Medienpfade aktivieren.
2. **Admin-UI bauen:** Ein echtes Formular in `Home.tsx` für den Medien-Upload integrieren.
3. **Video-Integration:** YouTube-Einbettung als kostenlose Alternative zum S3-Streaming vorbereiten.
4. **Kompression:** Eine Client-seitige Bildkompression (z.B. mit `browser-image-compression`) einbauen, um Speicherplatz zu sparen.
