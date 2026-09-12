import { useEffect, useState } from 'react';
import './App.css';

const HUES = ['--p1', '--p2', '--p3', '--p4'];
const POLL_MS = 2000;

function useClock() {
  const [text, setText] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      let h = now.getHours() % 12; if (h === 0) h = 12;
      setText(`${h}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);
  return text;
}

function useWorld() {
  const [world, setWorld] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch('/world');
        const data = await res.json();
        if (!cancelled) setWorld(data);
      } catch {
        // stay on last known state until the next poll succeeds
      }
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  return world;
}

function AskBanner({ ask }) {
  const tone = ask?.tone ?? 'calm';
  const line = ask?.line ?? "Everyone's covered today.";
  return (
    <div className="ask" data-tone={tone}>
      <div className="ask-kicker">{ask?.kicker ?? 'Needs a person'}</div>
      <div className="ask-line">{line}</div>
      <div className="ask-why">{ask?.why ?? ''}</div>
    </div>
  );
}

function PeopleGrid({ people }) {
  return (
    <div className="people">
      {people.map((p, i) => (
        <div className="who" key={p.id} data-flag={p.flag ?? undefined}>
          <div className="disc" style={{ background: `var(${HUES[i % HUES.length]})` }}>
            {p.name.charAt(0)}
          </div>
          <div>
            <div className="who-name">{p.name}</div>
            <div className="who-state">{p.state}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const clock = useClock();
  const world = useWorld();

  return (
    <div className="board">
      <div className="crown">
        <div className="date">{world?.today ?? 'Mantel'}</div>
        <div className="clock">{clock}</div>
      </div>

      <AskBanner ask={world?.ask} />

      <PeopleGrid people={world?.people ?? []} />

      <div className="trace" data-live={String(world?.live ?? false)}>
        <span className="pip" />
        <span>{world?.trace ?? 'Connecting…'}</span>
      </div>
    </div>
  );
}
