import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

export default function MediaQuestionPlayer({ src, poster, alt }: { src: string; poster?: string | null; alt: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  useEffect(() => { const video = videoRef.current; if (!video) return; const update = () => setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0); const ready = () => setLoading(false); const error = () => { setLoading(false); setFailed(true); }; video.addEventListener("timeupdate", update); video.addEventListener("loadeddata", ready); video.addEventListener("canplay", ready); video.addEventListener("error", error); return () => { video.removeEventListener("timeupdate", update); video.removeEventListener("loadeddata", ready); video.removeEventListener("canplay", ready); video.removeEventListener("error", error); }; }, [src]);
  const toggle = async () => { const video = videoRef.current; if (!video) return; if (video.paused) { try { await video.play(); setPlaying(true); } catch { setFailed(true); } } else { video.pause(); setPlaying(false); } };
  const seek = (value: number) => { const video = videoRef.current; if (video && video.duration) video.currentTime = (value / 100) * video.duration; setProgress(value); };
  const changeVolume = (value: number) => { const video = videoRef.current; if (video) video.volume = value; setVolume(value); };
  if (failed) return <div className="video-fallback" role="alert"><AlertTriangle size={22} /><div><strong>Video konnte nicht geladen werden</strong><p>Dieses komprimierte WebM-Video wird von deinem Browser oder Speicher gerade nicht unterstützt.</p><button onClick={() => { setFailed(false); setLoading(true); videoRef.current?.load(); }}><RotateCcw size={14} /> Erneut versuchen</button></div></div>;
  return <div className="custom-video-player"><div className="video-stage">{loading && <div className="video-loading"><span className="loading-spinner" /> Video wird geladen …</div>}<video ref={videoRef} src={src} poster={poster ?? undefined} preload="metadata" aria-label={alt} onEnded={() => setPlaying(false)} onClick={toggle} /></div><div className="video-controls"><button className="video-control-button" aria-label={playing ? "Pausieren" : "Abspielen"} onClick={toggle}>{playing ? <Pause size={17} /> : <Play size={17} />}</button><input className="video-seek" aria-label="Videoposition" type="range" min="0" max="100" value={progress} onChange={event => seek(Number(event.target.value))} /><button className="video-control-button" aria-label={volume ? "Stumm schalten" : "Ton einschalten"} onClick={() => changeVolume(volume ? 0 : 1)}>{volume ? <Volume2 size={17} /> : <VolumeX size={17} />}</button><input className="video-volume" aria-label="Lautstärke" type="range" min="0" max="1" step="0.05" value={volume} onChange={event => changeVolume(Number(event.target.value))} /></div></div>;
}
