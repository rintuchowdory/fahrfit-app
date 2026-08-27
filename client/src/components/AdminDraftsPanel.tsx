import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Check, Eye, Pencil, Send, Video } from "lucide-react";
import { toast } from "sonner";

type Draft = {
  id: number; topicId: number; prompt: string; explanation: string; mediaUrl: string | null; storageKey: string | null; mediaType: "image" | "video" | null; thumbnailUrl: string | null; duration: number | null; mediaAlt: string | null; rightsStatus: "owned" | "licensed" | "pending"; licenseSource: string | null; options: Array<{ label: string; text: string; isCorrect: number }>;
};

export default function AdminDraftsPanel({ topics }: { topics: Array<{ id: number; name: string }> }) {
  const draftsQuery = trpc.admin.drafts.useQuery(undefined, { staleTime: 10_000 });
  const utils = trpc.useUtils();
  const updateDraft = trpc.admin.updateQuestionContent.useMutation();
  const publishDraft = trpc.admin.updateQuestionStatus.useMutation();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const drafts = (draftsQuery.data ?? []) as Draft[];

  const beginEdit = (draft: Draft) => { setSelectedId(draft.id); setEditing({ ...draft, options: draft.options.map(option => ({ ...option })) }); };
  const save = async () => {
    if (!editing || editing.prompt.trim().length < 5 || editing.explanation.trim().length < 5 || editing.options.length < 2 || editing.options.some(option => !option.text.trim())) { toast.error("Bitte Pflichtfelder prüfen"); return; }
    try {
      await updateDraft.mutateAsync({ questionId: editing.id, topicId: editing.topicId, prompt: editing.prompt.trim(), explanation: editing.explanation.trim(), mediaUrl: editing.mediaUrl ?? undefined, storageKey: editing.storageKey ?? undefined, mediaType: editing.mediaType ?? undefined, thumbnailUrl: editing.thumbnailUrl ?? undefined, duration: editing.duration ?? undefined, mediaAlt: editing.mediaAlt ?? undefined, rightsStatus: editing.rightsStatus, licenseSource: editing.licenseSource ?? undefined, options: editing.options.map(option => ({ label: option.label, text: option.text.trim(), isCorrect: Boolean(option.isCorrect) })) });
      toast.success("Entwurf gespeichert"); await utils.admin.drafts.invalidate();
    } catch (error) { toast.error("Entwurf konnte nicht gespeichert werden", { description: error instanceof Error ? error.message : "Bitte erneut versuchen." }); }
  };
  const publish = async (id: number) => { try { await publishDraft.mutateAsync({ questionId: id, status: "published" }); toast.success("Frage veröffentlicht"); await utils.admin.drafts.invalidate(); setSelectedId(null); setEditing(null); } catch (error) { toast.error("Veröffentlichung fehlgeschlagen", { description: error instanceof Error ? error.message : "Bitte Rechte und Pflichtfelder prüfen." }); } };

  return <section className="drafts-panel"><div className="section-heading compact"><div><span className="eyebrow">REDAKTION</span><h2>Entwürfe prüfen</h2></div><span className="draft-count">{drafts.length} offen</span></div>{draftsQuery.isLoading ? <p className="muted">Entwürfe werden geladen …</p> : drafts.length === 0 ? <div className="draft-empty"><Check size={22} /><strong>Keine offenen Entwürfe</strong><p>Importierte Klasse-B-Fragen erscheinen hier, bevor sie veröffentlicht werden.</p></div> : <div className="draft-list">{drafts.map(draft => <article className={`draft-item ${selectedId === draft.id ? "active" : ""}`} key={draft.id}><div className="draft-thumb">{draft.mediaUrl ? draft.mediaType === "video" ? <Video size={22} /> : <img src={draft.mediaUrl} alt={draft.mediaAlt ?? "Fragenmedium"} /> : <Eye size={22} />}</div><div className="draft-summary"><span>#{String(draft.id).padStart(3, "0")} · {topics.find(topic => topic.id === draft.topicId)?.name ?? "Klasse B"}</span><strong>{draft.prompt}</strong><small>Rechte: {draft.rightsStatus}{draft.licenseSource ? ` · ${draft.licenseSource}` : ""}</small></div><div className="draft-actions"><button className="table-action" onClick={() => beginEdit(draft)}><Pencil size={14} /> Bearbeiten</button><button className="publish-action" onClick={() => publish(draft.id)} disabled={publishDraft.isPending}><Send size={14} /> Veröffentlichen</button></div>{editing?.id === draft.id && <div className="draft-edit-form"><label>Frage<textarea value={editing.prompt} onChange={event => setEditing({ ...editing, prompt: event.target.value })} /></label><label>Erklärung<textarea value={editing.explanation} onChange={event => setEditing({ ...editing, explanation: event.target.value })} /></label><div className="draft-options">{editing.options.map((option, index) => <label key={option.label}>{option.label}<input value={option.text} onChange={event => setEditing({ ...editing, options: editing.options.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item) })} /><input type="checkbox" checked={Boolean(option.isCorrect)} onChange={event => setEditing({ ...editing, options: editing.options.map((item, itemIndex) => itemIndex === index ? { ...item, isCorrect: event.target.checked ? 1 : 0 } : { ...item, isCorrect: event.target.checked ? 0 : item.isCorrect }) })} /> korrekt</label>)}</div><label>Rechte-Status<select value={editing.rightsStatus} onChange={event => setEditing({ ...editing, rightsStatus: event.target.value as Draft["rightsStatus"] })}><option value="owned">Eigene Aufnahme</option><option value="licensed">Lizenziert</option><option value="pending">Noch nicht geprüft</option></select></label><label>Lizenzquelle<input value={editing.licenseSource ?? ""} onChange={event => setEditing({ ...editing, licenseSource: event.target.value })} /></label><div className="draft-edit-actions"><Button className="secondary-action" onClick={() => { setEditing(null); setSelectedId(null); }}>Abbrechen</Button><Button className="primary-action" onClick={save} disabled={updateDraft.isPending}>Änderungen speichern</Button></div></div>}</article>)}</div>}</section>;
}
