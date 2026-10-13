import { useEffect, useRef, useState } from 'react';
import { SONIDOS, renderSound, type SoundSection } from '../../engine/audio/catalogo';
import { blip, BLIPS, TIMBRES, type Timbre } from '../../engine/audio/deporte';
import { encodeWav, RATE } from '../../engine/audio/sfx';
import type { T } from '../components/ui';
import { Seg } from '../components/ui';

const wavUrl = (s: Float32Array, loop = false) => URL.createObjectURL(new Blob([encodeWav(s, RATE, loop) as BlobPart], { type: 'audio/wav' }));

/** Audio del juego: toda la música, los efectos y los ambientes del motor, y un probador de voces en blips. */
export function AudioStep({ t }: { t: T }) {
  const [section, setSection] = useState<SoundSection>('musica');
  const [playing, setPlaying] = useState('');
  const [tono, setTono] = useState(1);
  const [timbre, setTimbre] = useState<Timbre>('cuadrada');
  const [text, setText] = useState('¡Dale que vamos a ganar!');
  const cur = useRef<HTMLAudioElement | null>(null);
  const cache = useRef(new Map<string, string>());
  const timer = useRef(0);
  const stop = () => { cur.current?.pause(); cur.current = null; clearTimeout(timer.current); setPlaying(''); };
  useEffect(() => () => { stop(); for (const u of cache.current.values()) URL.revokeObjectURL(u); }, []);
  const play = (sec: SoundSection, name: string) => {
    stop();
    const key = `${sec}/${name}`;
    let u = cache.current.get(key);
    if (!u) { const r = renderSound(sec, name); u = wavUrl(r.samples, r.loop); cache.current.set(key, u); }
    const a = new Audio(u);
    a.loop = sec !== 'sfx';
    // si otro sonido o la voz lo cortó antes de arrancar, su play() falla: solo limpia si sigue siendo el que suena
    a.onended = () => { if (cur.current === a) setPlaying(''); };
    cur.current = a;
    setPlaying(key);
    void a.play().catch(() => { if (cur.current === a) setPlaying(''); });
  };
  const say = () => {
    stop();
    const urls = Array.from({ length: BLIPS }, (_, k) => wavUrl(blip({ tono, timbre }, k)));
    let i = 0;
    setPlaying('voz');
    const tick = () => {
      if (i >= text.length) { setPlaying(''); return; }
      const ch = text[i++];
      if (/[\p{L}\p{N}]/u.test(ch)) void new Audio(urls[ch.charCodeAt(0) % urls.length]).play().catch(() => {});
      timer.current = window.setTimeout(tick, /[.,!?¡¿]/.test(ch) ? 220 : 55);
    };
    tick();
  };
  const LABEL: Record<SoundSection, string> = { musica: t('au_music'), sfx: t('au_sfx'), ambientes: t('au_amb') };
  return (
    <>
      <section className="panel stage-wrap">
        <div className="audio-grid" data-testid="audio-grid">
          {SONIDOS[section].map((n) => (
            <button key={n} className={`audio-btn${playing === `${section}/${n}` ? ' on' : ''}`} onClick={() => (playing === `${section}/${n}` ? stop() : play(section, n))} data-testid={`sound-${n}`}>
              <span aria-hidden>{playing === `${section}/${n}` ? '■' : '▶'}</span> {n}
            </button>
          ))}
        </div>
      </section>
      <aside className="panel side">
        <Seg label={t('au_section')} value={section} set={(v) => { stop(); setSection(v as SoundSection); }} testid="audio-sections" opts={(Object.keys(SONIDOS) as SoundSection[]).map((s) => [s, `${LABEL[s]} (${SONIDOS[s].length})`])} />
        <div className="field">
          <span>{t('au_voice')}</span>
          <input value={text} onChange={(e) => setText(e.target.value)} data-testid="voice-text" />
        </div>
        <label className="field"><span>{t('au_pitch')} <output>{tono.toFixed(2)}</output></span><input type="range" min={0.5} max={2} step={0.05} value={tono} onChange={(e) => setTono(+e.target.value)} data-testid="voice-pitch" /></label>
        <Seg label={t('au_timbre')} value={timbre} set={(v) => setTimbre(v as Timbre)} opts={TIMBRES.map((x) => [x, x])} />
        <button className="btn primary" onClick={say} data-testid="voice-say">{t('au_say')}</button>
        <p className="muted small">{t('au_help')}</p>
        {playing && <button className="btn" onClick={stop} data-testid="audio-stop">■ {t('au_stop')}</button>}
      </aside>
    </>
  );
}
