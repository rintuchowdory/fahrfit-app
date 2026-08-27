import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BarChart3, BookOpen, Check, ChevronLeft, CircleAlert, Clock3, GraduationCap, LayoutDashboard, LockKeyhole, Menu, Play, RotateCcw, Settings2, ShieldCheck, Star, Target, Trophy, X } from "lucide-react";

type Mode = "dashboard" | "learn" | "errors" | "exam" | "exam-result" | "progress" | "admin";
type Question = { id: number; topic: string; prompt: string; context: string; options: string[]; correct: number[]; explanation: string; difficulty: string; mediaUrl?: string | null; mediaType?: "image" | "video" | null; thumbnailUrl?: string | null; mediaAlt?: string | null };

async function compressMedia(file: File): Promise<File> {
  if (file.type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.78));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }) : file;
  }
  if (file.type.startsWith("video/") && "MediaRecorder" in window) {
    try {
      const video = document.createElement("video"); video.src = URL.createObjectURL(file); video.muted = true; video.playsInline = true; await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error("Video konnte nicht gelesen werden")); });
      const stream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
      if (!stream) return file;
      const chunks: Blob[] = []; const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 900_000 });
      const done = new Promise<Blob>((resolve, reject) => { recorder.ondataavailable = event => event.data.size && chunks.push(event.data); recorder.onerror = () => reject(new Error("Video-Kompression fehlgeschlagen")); recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" })); });
      void video.play(); recorder.start(); window.setTimeout(() => recorder.stop(), Math.min(video.duration * 1000, 30_000)); const blob = await done; video.pause(); URL.revokeObjectURL(video.src);
      return blob.size < file.size ? new File([blob], file.name.replace(/\.[^.]+$/, ".webm"), { type: "video/webm" }) : file;
    } catch { return file; }
  }
  return file;
}

const questions: Question[] = [
  { id: 1, topic: "Vorfahrt", prompt: "Sie nähern sich einer Kreuzung ohne Verkehrszeichen. Was gilt grundsätzlich?", context: "Kreuzung · Sicht frei · keine Ampel", options: ["Die Regel „rechts vor links“", "Das größere Fahrzeug hat Vorfahrt", "Wer zuerst hupt, fährt zuerst"], correct: [0], explanation: "An Kreuzungen und Einmündungen ohne besondere Regelung gilt grundsätzlich rechts vor links.", difficulty: "Grundlagen" },
  { id: 2, topic: "Abstand", prompt: "Warum ist ein ausreichender Sicherheitsabstand besonders wichtig?", context: "Trockene Fahrbahn · dichter Verkehr", options: ["Damit die Reaktions- und Bremszeit berücksichtigt wird", "Damit andere nicht überholen können", "Damit der Motor weniger Kraftstoff verbraucht"], correct: [0], explanation: "Der Abstand schafft Reaktionsraum und reduziert das Risiko eines Auffahrunfalls.", difficulty: "Grundlagen" },
  { id: 3, topic: "Gefahrenlehre", prompt: "Was sollten Sie bei plötzlich auftretendem Nebel zuerst tun?", context: "Sichtweite nimmt schnell ab · Landstraße", options: ["Geschwindigkeit vorsichtig anpassen", "Sofort auf die Gegenfahrbahn wechseln", "Dicht auf das vorausfahrende Fahrzeug auffahren"], correct: [0], explanation: "Bei eingeschränkter Sicht muss die Geschwindigkeit so angepasst werden, dass die Strecke übersehbar bleibt.", difficulty: "Aufmerksamkeit" },
  { id: 4, topic: "Verkehrszeichen", prompt: "Was kündigt ein dreieckiges Warnzeichen in der Regel an?", context: "Verkehrszeichen · roter Rand · weiße Fläche", options: ["Eine Gefahrstelle", "Ein verbindliches Parkverbot", "Das Ende aller Beschränkungen"], correct: [0], explanation: "Dreieckige Zeichen mit rotem Rand warnen in der Regel vor Gefahrenstellen.", difficulty: "Grundlagen" },
  { id: 5, topic: "Geschwindigkeit", prompt: "Welche Aussage unterstützt vorausschauendes Fahren?", context: "Unübersichtliche Straße · Kinder am Fahrbahnrand", options: ["Frühzeitig langsamer werden und bremsbereit sein", "Nur auf die eigene Spur schauen", "Erst reagieren, wenn jemand die Fahrbahn betritt"], correct: [0], explanation: "Vorausschauendes Fahren bedeutet, mögliche Gefahren früh zu erkennen und die Geschwindigkeit rechtzeitig anzupassen.", difficulty: "Praxis" },
  { id: 6, topic: "Gefahrenlehre", prompt: "Welche Verhaltensweisen helfen bei eingeschränkter Sicht?", context: "Dämmerung · wechselnde Sichtverhältnisse", options: ["Geschwindigkeit anpassen", "Abstand verkürzen", "Beleuchtung kontrollieren"], correct: [0, 2], explanation: "Bei eingeschränkter Sicht sind eine angepasste Geschwindigkeit und eine passende Beleuchtung wichtig. Mehr Abstand schafft zusätzlich Sicherheitsreserven.", difficulty: "Mehrfachauswahl" },
];

const topics = [
  { name: "Verkehrszeichen", percent: 82, color: "#8B7CFF", icon: "✦" },
  { name: "Vorfahrt", percent: 64, color: "#E7A84B", icon: "↗" },
  { name: "Geschwindigkeit", percent: 91, color: "#5CC9A5", icon: "⌁" },
  { name: "Abstand", percent: 58, color: "#E86E6E", icon: "↔" },
  { name: "Gefahrenlehre", percent: 72, color: "#F3B562", icon: "!" },
  { name: "Autobahn", percent: 88, color: "#6BA7F5", icon: "▰" },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<Mode>("dashboard");
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>(questions.slice(0, 4));
  const [sessionScore, setSessionScore] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const sessionIdRef = useRef<number | null>(null);
  const current = sessionQuestions[activeQuestion];
  const progress = Math.min(100, Math.round(((activeQuestion + (answered ? 1 : 0)) / sessionQuestions.length) * 100));
  const displayName = user?.name?.split(" ")[0] || "Alex";
  const questionQuery = trpc.content.questions.useQuery(undefined, { staleTime: 60_000 });
  const topicQuery = trpc.content.topics.useQuery(undefined, { staleTime: 60_000 });
  const progressQuery = trpc.learning.progress.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000 });
  const errorIdsQuery = trpc.learning.errorQuestionIds.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000 });
  const startSessionMutation = trpc.learning.startSession.useMutation();
  const submitAnswerMutation = trpc.learning.submitAnswer.useMutation();
  const uploadMediaMutation = trpc.admin.uploadMedia.useMutation();
  const createQuestionMutation = trpc.admin.createQuestion.useMutation();
  const createTopicMutation = trpc.admin.createTopic.useMutation();
  const [adminTopicName, setAdminTopicName] = useState("");
  const [adminPrompt, setAdminPrompt] = useState("");
  const [adminExplanation, setAdminExplanation] = useState("");
  const [adminTopicId, setAdminTopicId] = useState<number | undefined>(undefined);
  const [adminMedia, setAdminMedia] = useState<{ key: string; url: string; type: "image" | "video"; alt: string } | null>(null);
  const [adminRightsStatus, setAdminRightsStatus] = useState<"owned" | "licensed" | "pending">("owned");
  const [adminLicenseSource, setAdminLicenseSource] = useState("");
  const [adminOptions, setAdminOptions] = useState(["", ""]);
  const [adminCorrectIndex, setAdminCorrectIndex] = useState(0);
  const catalog = (questionQuery.data?.length ? questionQuery.data.map((item) => ({ id: item.id, topic: String(item.topicId), prompt: item.prompt, context: item.mediaAlt || "Klasse B · Verkehrssituation", options: item.options.map(option => option.text), correct: item.options.filter(option => option.isCorrect === 1).map(option => item.options.indexOf(option)), explanation: item.explanation, difficulty: item.difficulty, mediaUrl: item.mediaUrl, mediaType: item.mediaType, thumbnailUrl: item.thumbnailUrl, mediaAlt: item.mediaAlt })) : questions);
  const liveErrorIds = errorIdsQuery.data ?? JSON.parse(localStorage.getItem("fahrfit-error-ids") || "[]") as number[];

  const startSession = async (nextMode: "learn" | "errors" | "exam") => {
    const source = catalog.length ? catalog : questions;
    const pool = nextMode === "errors" ? source.filter(q => liveErrorIds.includes(q.id)) : source;
    const selectedQuestions = nextMode === "errors" ? (pool.length ? pool : source.slice(0, 4)) : nextMode === "exam" ? source : pool.slice(0, 4);
    setSessionQuestions(selectedQuestions); setActiveQuestion(0); setSelected([]); setAnswered(false); setSessionScore(0); setMode(nextMode);
    if (isAuthenticated && selectedQuestions.length) {
      sessionIdRef.current = await startSessionMutation.mutateAsync({ mode: nextMode === "learn" ? "topic" : nextMode, questionIds: selectedQuestions.map(q => q.id) });
    } else sessionIdRef.current = null;
  };

  const chooseAnswer = (index: number) => {
    if (answered) return;
    setSelected(prev => prev.includes(index) ? prev.filter(item => item !== index) : current.correct.length > 1 ? [...prev, index] : [index]);
  };

  const submitAnswer = () => {
    if (!selected.length || answered) return;
    const correct = selected.length === current.correct.length && selected.every(item => current.correct.includes(item));
    setIsCorrect(correct); setAnswered(true); if (correct) setSessionScore(score => score + 1); else { const nextErrors = Array.from(new Set([...liveErrorIds, current.id])); localStorage.setItem("fahrfit-error-ids", JSON.stringify(nextErrors)); }
    if (isAuthenticated && sessionIdRef.current) submitAnswerMutation.mutate({ sessionId: sessionIdRef.current, questionId: current.id, selectedOptionIds: selected.map(index => index + 1), isCorrect: correct, mistakePoints: correct ? 0 : 1 });
  };

  const nextQuestion = () => {
    if (activeQuestion >= sessionQuestions.length - 1) { if (mode === "exam") { setMode("exam-result"); } else { setMode("dashboard"); toast.success("Lerneinheit abgeschlossen", { description: `${sessionScore + (isCorrect ? 1 : 0)} von ${sessionQuestions.length} Fragen richtig beantwortet.` }); } return; }
    setActiveQuestion(value => value + 1); setSelected([]); setAnswered(false); setIsCorrect(false);
  };

  const topicAverage = useMemo(() => Math.round(topics.reduce((sum, topic) => sum + topic.percent, 0) / topics.length), []);

  const handleAdminFile = async (file?: File) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];
    if (!allowed.includes(file.type)) { toast.error("Format nicht unterstützt", { description: "Nutze JPG, PNG, WebP, MP4 oder WebM." }); return; }
    const max = file.type.startsWith("video/") ? 20 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > max) { toast.error("Datei zu groß", { description: `Maximum vor Kompression: ${file.type.startsWith("video/") ? "20 MB" : "2 MB"}.` }); return; }
    try {
      const compressed = await compressMedia(file);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const uploaded = await uploadMediaMutation.mutateAsync({ fileName: compressed.name, contentType: compressed.type as "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/webm", base64: String(reader.result) });
          setAdminMedia({ key: uploaded.key, url: uploaded.url, type: uploaded.mediaType, alt: compressed.name.replace(/\.[^.]+$/, "") });
          const savedPercent = file.size ? Math.round((1 - compressed.size / file.size) * 100) : 0;
          toast.success("Medium optimiert und hochgeladen", { description: savedPercent > 0 ? `${savedPercent}% Speicher gespart.` : "Die Datei war bereits kompakt." });
        } catch (error) { toast.error("Upload fehlgeschlagen", { description: error instanceof Error ? error.message : "Bitte erneut versuchen." }); }
      };
      reader.readAsDataURL(compressed);
    } catch (error) { toast.error("Kompression fehlgeschlagen", { description: error instanceof Error ? error.message : "Bitte Datei prüfen." }); }
  };

  const saveAdminQuestion = async () => {
    if (!adminTopicId || adminPrompt.trim().length < 5 || adminExplanation.trim().length < 5 || adminOptions.length < 2 || adminOptions.some(option => !option.trim()) || (adminRightsStatus === "licensed" && !adminLicenseSource.trim())) { toast.error("Pflichtfelder prüfen", { description: "Thema, Frage, Erklärung und mindestens zwei Antworten sind erforderlich." }); return; }
    try {
      await createQuestionMutation.mutateAsync({ topicId: adminTopicId, prompt: adminPrompt.trim(), explanation: adminExplanation.trim(), mediaUrl: adminMedia?.url, storageKey: adminMedia?.key, mediaType: adminMedia?.type, mediaAlt: adminMedia?.alt, rightsStatus: adminRightsStatus, licenseSource: adminLicenseSource.trim() || undefined, options: adminOptions.map((text, index) => ({ label: String.fromCharCode(65 + index), text: text.trim(), isCorrect: index === adminCorrectIndex })) });
      toast.success("Frage als Entwurf gespeichert"); setAdminPrompt(""); setAdminExplanation(""); setAdminMedia(null); setAdminRightsStatus("owned"); setAdminLicenseSource(""); setAdminOptions(["", ""]); setAdminCorrectIndex(0);
    } catch (error) { toast.error("Frage konnte nicht gespeichert werden", { description: error instanceof Error ? error.message : "Bitte erneut versuchen." }); }
  };

  const nav = [
    ["dashboard", "Übersicht", LayoutDashboard], ["learn", "Lernen", BookOpen], ["errors", "Fehlertraining", RotateCcw], ["exam", "Prüfung", Trophy], ["progress", "Fortschritt", BarChart3],
  ] as const;

  if (["learn", "errors", "exam"].includes(mode)) {
    const isExam = mode === "exam";
    return <div className="app-shell"><Sidebar mode={mode} setMode={setMode} nav={nav} mobileNav={mobileNav} setMobileNav={setMobileNav} />
      <main className="main-content learning-main">
        <div className="mobile-topbar"><button className="icon-button" onClick={() => setMobileNav(true)} aria-label="Menü öffnen"><Menu size={21} /></button><span className="brand-mini">fahr<span>fit</span></span><span className="topbar-progress">{activeQuestion + 1} / {sessionQuestions.length}</span></div>
        <div className="learning-toolbar"><button className="back-link" onClick={() => setMode("dashboard")}><ChevronLeft size={18} /> Zur Übersicht</button><div className="session-meta"><span>{isExam ? "Prüfungssimulation" : mode === "errors" ? "Deine Fehler" : "Thema üben"}</span><span className="dot-separator">•</span><span>{current.topic}</span></div><span className="session-count">Frage {activeQuestion + 1} von {sessionQuestions.length}</span></div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        <section className="question-layout">
          <div className="question-copy"><div className="eyebrow"><span className="status-dot" /> {current.difficulty}</div><h1>{current.prompt}</h1><p className="question-context"><CircleAlert size={17} /> {current.context}</p>{current.mediaUrl && <div className="question-media">{current.mediaType === "video" ? <video src={current.mediaUrl} controls preload="metadata" poster={current.thumbnailUrl || undefined} onError={event => { event.currentTarget.style.display = "none"; }} /> : <img src={current.mediaUrl} alt={current.mediaAlt || "Verkehrssituation"} onError={event => { event.currentTarget.alt = "Medium konnte nicht geladen werden"; }} />}</div>}<div className="answer-list">{current.options.map((option, index) => <button key={option} className={`answer-option ${selected.includes(index) ? "selected" : ""} ${answered && !isExam && current.correct.includes(index) ? "correct" : ""} ${answered && !isExam && selected.includes(index) && !current.correct.includes(index) ? "wrong" : ""}`} onClick={() => chooseAnswer(index)}><span className="answer-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{answered && !isExam && current.correct.includes(index) && <Check className="answer-icon" size={19} />}{answered && !isExam && selected.includes(index) && !current.correct.includes(index) && <X className="answer-icon" size={19} />}</button>)}</div><div className="question-actions">{!answered ? <Button className="primary-action" disabled={!selected.length} onClick={submitAnswer}>Antwort prüfen <ArrowRight size={18} /></Button> : <Button className="primary-action" onClick={nextQuestion}>{activeQuestion === sessionQuestions.length - 1 ? "Einheit beenden" : "Nächste Frage"} <ArrowRight size={18} /></Button>}</div></div>
          <aside className={`feedback-panel ${answered && !isExam ? "visible" : ""}`}>{isExam ? <div className="focus-note"><div className="focus-mark">◎</div><h3>Prüfung läuft</h3><p>Beantworte alle Fragen ohne Sofortlösung. Deine Auswertung erscheint erst am Ende.</p><div className="exam-mini-progress"><span style={{ width: `${progress}%` }} /></div></div> : answered ? <><div className={`feedback-icon ${isCorrect ? "success" : "error"}`}>{isCorrect ? <Check size={24} /> : <X size={24} />}</div><p className={`feedback-kicker ${isCorrect ? "success-text" : "error-text"}`}>{isCorrect ? "Richtig beantwortet" : "Noch nicht richtig"}</p><h2>{isCorrect ? "Sehr gut." : "Lies die Erklärung und versuche es später erneut."}</h2><div className="explanation"><span>Warum?</span><p>{current.explanation}</p></div>{!isCorrect && <div className="saved-note"><RotateCcw size={16} /> Im Fehlertraining gespeichert</div>}</> : <div className="focus-note"><div className="focus-mark">✦</div><h3>Konzentriert lernen</h3><p>Wähle die Antwort, die du für richtig hältst. Die Erklärung erscheint direkt nach dem Prüfen.</p><div className="focus-line" /></div>}</aside>
        </section>
      </main>
    </div>;
  }

  if (mode === "exam-result") {
    const finalScore = sessionScore + (isCorrect ? 1 : 0);
    const passed = finalScore >= Math.ceil(sessionQuestions.length * 0.7);
    return <div className="app-shell"><Sidebar mode={mode} setMode={setMode} nav={nav} mobileNav={mobileNav} setMobileNav={setMobileNav} /><main className="main-content"><header className="topbar"><div><p className="breadcrumb">FahrFit <span>/</span> Prüfung</p><h1>Deine Prüfung ist beendet.</h1><p className="muted">Hier ist deine Auswertung für Klasse B.</p></div><div className="topbar-actions"><div className="avatar">A</div></div></header><section className="result-hero"><div className={`result-icon ${passed ? "success" : "error"}`}>{passed ? <Check size={27} /> : <X size={27} />}</div><span className={`feedback-kicker ${passed ? "success-text" : "error-text"}`}>{passed ? "Bestanden" : "Weiter üben"}</span><h2>{finalScore} / {sessionQuestions.length} Fragen richtig</h2><p>{passed ? "Stark gelöst. Festige jetzt noch deine letzten Unsicherheiten." : "Kein Problem. Deine Fehler zeigen dir genau, wo du weiterlernen kannst."}</p></section><section className="result-grid"><div className="result-stat"><span className="eyebrow">ERGEBNIS</span><strong>{Math.round((finalScore / sessionQuestions.length) * 100)}<small>%</small></strong><p>Trefferquote in dieser Simulation</p></div><div className="result-stat"><span className="eyebrow">FEHLERANALYSE</span><strong>{sessionQuestions.length - finalScore}</strong><p>Fragen für dein Fehlertraining</p></div><div className="result-stat"><span className="eyebrow">EMPFEHLUNG</span><strong className="recommendation">{passed ? "Festigen" : "Nachlernen"}</strong><p>{passed ? "Wiederhole die unsicheren Themen." : "Starte mit deinen Fehlerfragen."}</p></div></section><div className="result-actions"><Button className="primary-action" onClick={() => startSession("errors")}>Fehler lernen <ArrowRight size={18} /></Button><button className="text-action" onClick={() => startSession("exam")}>Neue Prüfung <RotateCcw size={16} /></button></div></main></div>;
  }

  if (mode === "progress") {
    return <div className="app-shell"><Sidebar mode={mode} setMode={setMode} nav={nav} mobileNav={mobileNav} setMobileNav={setMobileNav} /><main className="main-content"><header className="topbar"><div><p className="breadcrumb">FahrFit <span>/</span> Klasse B</p><h1>Dein Fortschritt.</h1><p className="muted">Jeder Lernschritt bringt dich näher an den Prüfungstag.</p></div><div className="topbar-actions"><div className="avatar">A</div></div></header><section className="progress-overview"><div><span className="eyebrow">GESAMTFORTSCHRITT</span><strong>{progressQuery.data?.byTopic?.length ? Math.round(progressQuery.data.byTopic.reduce((sum, item) => sum + item.percent, 0) / progressQuery.data.byTopic.length) : topicAverage}%</strong><p>über alle Klasse-B-Themen</p></div><div className="big-progress"><div style={{ width: `${topicAverage}%` }} /></div></section><div className="section-heading"><div><span className="eyebrow">THEMENSTATUS</span><h2>Wissen wird sicher.</h2></div></div><div className="topic-grid">{topics.map(topic => <div className="topic-card progress-topic" key={topic.name}><div className="topic-icon" style={{ backgroundColor: `${topic.color}18`, color: topic.color }}>{topic.icon}</div><div className="topic-main"><div className="topic-name"><span>{topic.name}</span><span>{topic.percent}%</span></div><div className="topic-track"><div style={{ width: `${topic.percent}%`, backgroundColor: topic.color }} /></div></div></div>)}</div></main></div>;
  }

  if (mode === "admin") {
    return <div className="app-shell"><Sidebar mode={mode} setMode={setMode} nav={nav} mobileNav={mobileNav} setMobileNav={setMobileNav} />
      <main className="main-content"><header className="topbar"><div><p className="breadcrumb">FahrFit <span>/</span> Adminbereich</p><h1>Inhalte verwalten.</h1><p className="muted">Klasse-B-Fragen, Medien und Rechte strukturiert pflegen.</p></div><div className="topbar-actions"><span className="admin-badge"><LockKeyhole size={14} /> Geschützter Bereich</span><div className="avatar">A</div></div></header>
        <section className="admin-grid"><div className="admin-stat"><span className="eyebrow">VERÖFFENTLICHTE FRAGEN</span><strong>{questionQuery.data?.length ?? questions.length}</strong><p>Klasse B · aktuell</p></div><div className="admin-stat"><span className="eyebrow">THEMEN</span><strong>{topicQuery.data?.length ?? topics.length}</strong><p>Alle Lernbereiche gepflegt</p></div><div className="admin-stat"><span className="eyebrow">MEDIEN-UPLOAD</span><strong>{adminMedia ? "Bereit" : "Offen"}</strong><p>Bild bis 2 MB · Video bis 20 MB</p></div></section>
        <section className="admin-editor"><div className="topic-quick-add"><input value={adminTopicName} onChange={event => setAdminTopicName(event.target.value)} placeholder="Neues Thema, z. B. Umweltbewusstes Fahren" /><Button className="secondary-action" disabled={createTopicMutation.isPending || adminTopicName.trim().length < 2} onClick={async () => { await createTopicMutation.mutateAsync({ name: adminTopicName.trim() }); setAdminTopicName(""); toast.success("Thema angelegt"); }}>Thema anlegen</Button></div><div className="section-heading compact"><div><span className="eyebrow">NEUE FRAGE</span><h2>Frageneditor Klasse B</h2></div><span className="admin-badge"><ShieldCheck size={14} /> Entwurf bis zur Freigabe</span></div><div className="editor-grid"><div className="editor-fields"><label>Thema<select value={adminTopicId ?? ""} onChange={event => setAdminTopicId(Number(event.target.value) || undefined)}><option value="">Thema auswählen</option>{(topicQuery.data ?? []).map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label><label>Frage<textarea value={adminPrompt} onChange={event => setAdminPrompt(event.target.value)} placeholder="Beschreibe die Verkehrssituation …" /></label><label>Erklärung<textarea value={adminExplanation} onChange={event => setAdminExplanation(event.target.value)} placeholder="Warum ist diese Antwort richtig?" /></label><div className="options-editor"><div className="editor-label">Antwortoptionen <span>Erste markierte Option ist korrekt</span></div>{adminOptions.map((option, index) => <div className="option-row" key={index}><input aria-label={`Antwort ${index + 1}`} value={option} onChange={event => setAdminOptions(values => values.map((value, item) => item === index ? event.target.value : value))} placeholder={`Antwort ${String.fromCharCode(65 + index)}`} /><label className="correct-toggle"><input type="radio" name="correct-option" checked={adminCorrectIndex === index} onChange={() => setAdminCorrectIndex(index)} /> richtig</label>{adminOptions.length > 2 && <button type="button" className="table-action" onClick={() => setAdminOptions(values => values.filter((_, item) => item !== index))}>Entfernen</button>}</div>)}<button type="button" className="text-action" onClick={() => setAdminOptions(values => [...values, ""])}>+ Antwort hinzufügen</button></div></div><div className="editor-media"><label className="upload-zone"><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={event => handleAdminFile(event.target.files?.[0])} /><span className="upload-icon">{uploadMediaMutation.isPending ? "…" : "↑"}</span><strong>{adminMedia ? "Medium ersetzt" : "Bild oder Video hochladen"}</strong><small>JPG, PNG, WebP bis 2 MB · MP4/WebM bis 20 MB</small></label>{adminMedia && <div className="media-preview">{adminMedia.type === "video" ? <video src={adminMedia.url} controls preload="metadata" /> : <img src={adminMedia.url} alt={adminMedia.alt} />}<button type="button" className="table-action" onClick={() => setAdminMedia(null)}>Medium entfernen</button></div>}<label>Alternativtext<input value={adminMedia?.alt ?? ""} onChange={event => setAdminMedia(media => media ? { ...media, alt: event.target.value } : media)} placeholder="Beschreibung für Barrierefreiheit" /></label><label>Rechte-Status<select value={adminRightsStatus} onChange={event => setAdminRightsStatus(event.target.value as "owned" | "licensed" | "pending")}><option value="owned">Eigene Aufnahme</option><option value="licensed">Lizenziert</option><option value="pending">Noch nicht geprüft</option></select></label><label>Lizenzquelle / Nachweis<input value={adminLicenseSource} onChange={event => setAdminLicenseSource(event.target.value)} placeholder="z. B. Vertrag, Quelle oder Asset-ID" /></label><div className="rights-note"><LockKeyhole size={16} /><span>Nur eigene oder nachweislich lizenzierte Medien hochladen. Bei „Noch nicht geprüft“ bleibt die Frage ein Entwurf.</span></div><Button className="primary-action" disabled={createQuestionMutation.isPending || uploadMediaMutation.isPending} onClick={saveAdminQuestion}>{createQuestionMutation.isPending ? "Speichert …" : "Frage als Entwurf speichern"} <ArrowRight size={17} /></Button></div></div></section>
      </main></div>;
  }

  return <div className="app-shell"><Sidebar mode={mode} setMode={setMode} nav={nav} mobileNav={mobileNav} setMobileNav={setMobileNav} />
    <main className="main-content"><header className="topbar"><div><p className="breadcrumb">FahrFit <span>/</span> Klasse B</p><h1>Guten Morgen, {displayName}.</h1><p className="muted">Dein nächster Schritt zum sicheren Prüfungstag.</p></div><div className="topbar-actions"><button className="streak-pill"><span>✦</span> 7 Tage Lernserie</button><div className="avatar">{displayName.slice(0, 1).toUpperCase()}</div></div></header>
      <div className="hero-grid"><section className="hero-card"><div><span className="eyebrow light">DEIN TAGESZIEL</span><h2>Heute 20 Fragen lösen.</h2><p>Eine kurze Einheit bringt dich näher an die Prüfung.</p><Button className="hero-button" onClick={() => startSession("learn")}>Jetzt lernen <ArrowRight size={18} /></Button></div><div className="hero-orbit"><div className="orbit-ring"><span>68%</span><small>Fortschritt</small></div><div className="orbit-star">✦</div></div></section><section className="mini-card"><div className="mini-card-top"><span className="eyebrow">DEINE FEHLER</span><span className="mini-icon red"><RotateCcw size={17} /></span></div><strong>17</strong><p>Fragen warten auf Wiederholung.</p><button className="text-action" onClick={() => startSession("errors")}>Fehler üben <ArrowRight size={16} /></button></section><section className="mini-card"><div className="mini-card-top"><span className="eyebrow">LETZTE PRÜFUNG</span><span className="mini-icon gold"><Trophy size={17} /></span></div><strong>92<span className="percent">%</span></strong><p>Bestes Ergebnis: bestanden.</p><button className="text-action" onClick={() => startSession("exam")}>Neue Prüfung <ArrowRight size={16} /></button></section></div>
      <div className="section-heading"><div><span className="eyebrow">DEIN LERNWEG</span><h2>Themen im Überblick</h2></div><button className="view-all" onClick={() => setMode("progress")}>Alle anzeigen <ArrowRight size={16} /></button></div><div className="topic-grid">{topics.map(topic => <button className="topic-card" key={topic.name} onClick={() => { setSessionQuestions(questions.filter(question => question.topic === topic.name).length ? questions.filter(question => question.topic === topic.name) : questions.slice(0, 4)); setActiveQuestion(0); setAnswered(false); setSelected([]); setMode("learn"); }}><div className="topic-icon" style={{ backgroundColor: `${topic.color}18`, color: topic.color }}>{topic.icon}</div><div className="topic-main"><div className="topic-name"><span>{topic.name}</span><span>{topic.percent}%</span></div><div className="topic-track"><div style={{ width: `${topic.percent}%`, backgroundColor: topic.color }} /></div></div><ArrowRight size={17} className="topic-arrow" /></button>)}</div>
      <section className="bottom-grid"><div className="activity-panel"><div className="section-heading compact"><div><span className="eyebrow">AKTIVITÄT</span><h2>Deine Lernwoche</h2></div><span className="activity-total">4h 20m <span>diese Woche</span></span></div><div className="week-bars">{[["Mo",72],["Di",48],["Mi",88],["Do",64],["Fr",100],["Sa",36],["So",18]].map(([day, height]) => <div className="day-bar" key={String(day)}><div className="bar-wrap"><div className={`bar ${day === "Fr" ? "active" : ""}`} style={{ height: `${height}%` }} /></div><span>{day}</span></div>)}</div></div><div className="tip-panel"><div className="tip-icon"><Star size={18} /></div><span className="eyebrow">FAHRFIT-TIPP</span><h3>Regelmäßig schlägt intensiv.</h3><p>10–20 Minuten pro Tag helfen dir, Fehler nachhaltig zu reduzieren.</p></div></section>
    </main>
  </div>;
}

function Sidebar({ mode, setMode, nav, mobileNav, setMobileNav }: { mode: Mode; setMode: (mode: Mode) => void; nav: readonly (readonly [string, string, typeof LayoutDashboard])[]; mobileNav: boolean; setMobileNav: (value: boolean) => void }) {
  const { user } = useAuth();
  return <aside className={`sidebar ${mobileNav ? "open" : ""}`}><div className="sidebar-brand"><div className="brand-mark">✦</div><span>fahr<span>fit</span></span><button className="close-nav" onClick={() => setMobileNav(false)}><X size={19} /></button></div><div className="class-switch"><div className="car-badge">B</div><div><span>Führerschein</span><strong>Klasse B</strong></div><ChevronLeft className="switch-chevron" size={16} /></div><nav>{nav.map(([key, label, Icon]) => <button key={key} className={`nav-item ${mode === key ? "active" : ""}`} onClick={() => { if (["learn", "errors", "exam"].includes(key)) { setMode(key as Mode); } else { setMode(key as Mode); } setMobileNav(false); }}><Icon size={19} /><span>{label}</span>{key === "errors" && <em>17</em>}</button>)}</nav><div className="sidebar-bottom">{user?.role === "admin" && <button className="nav-item" onClick={() => setMode("admin")}><Settings2 size={19} /><span>Adminbereich</span></button>}<div className="support-card"><ShieldCheck size={19} /><div><strong>Dein Lernstand ist sicher</strong><span>Automatisch gespeichert</span></div></div><div className="sidebar-user"><div className="avatar small">A</div><div><strong>Alex Müller</strong><span>Klasse B</span></div><button aria-label="Profil öffnen"><ChevronLeft size={16} /></button></div></div></aside>;
}
