"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GlobeMap, type GlobeHandle } from "./GlobeMap";
import { api, ApiError, getToken, peekChallenge, setToken, siteUrl, type Group, type Me, type Reveal, type RoundData } from "@/lib/client";
import { MULTIPLIERS, formatDistance, roundTotal, tier } from "@/lib/scoring";
import { STATES } from "@/lib/states";

type Screen =
  | { name: "loading" }
  | { name: "menu" }
  | { name: "profile"; then?: () => void }
  | { name: "challenge"; code: string; points: number[] }
  | { name: "join"; group: Group }
  | { name: "results" }
  | { name: "boards"; tab?: string }
  | { name: "groups" }
  | { name: "none" };

interface Finished { total: number; challenge: string | null }

const PRACTICE = [
  { id: "mixed", label: "Mixed" },
  { id: "cricket", label: "Cricket" },
  { id: "football-hockey", label: "Football & hockey" },
  { id: "other", label: "Kabaddi, chess & more" },
];

export default function Game() {
  const globe = useRef<GlobeHandle>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "loading" });
  const [round, setRound] = useState<RoundData | null>(null);
  const [answers, setAnswers] = useState<Reveal[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"guess" | "busy" | "reveal">("guess");
  const [finished, setFinished] = useState<Finished | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);

  const loadMe = useCallback(async () => {
    if (!getToken()) { setMe(null); return null; }
    try {
      const m = await api<Me>("/api/me");
      setMe(m);
      return m;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setToken(null);
      setMe(null);
      return null;
    }
  }, []);

  // First load: who is this, and did they arrive from a challenge or group invite link?
  useEffect(() => {
    (async () => {
      await loadMe();
      const params = new URLSearchParams(window.location.search);
      const vs = params.get("vs"), g = params.get("g");
      if (vs) {
        const pts = peekChallenge(vs);
        if (pts) return setScreen({ name: "challenge", code: vs, points: pts });
      }
      if (g) {
        try {
          const { group } = await api<{ group: Group }>(`/api/groups?code=${encodeURIComponent(g)}`);
          return setScreen({ name: "join", group });
        } catch (e) {
          say(e instanceof Error ? e.message : "That invite link didn't work.");
        }
      }
      setScreen({ name: "menu" });
    })();
  }, [loadMe, say]);

  const clearUrl = () => {
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  };

  const needProfile = (then: () => void) => {
    if (me) then();
    else setScreen({ name: "profile", then });
  };

  async function start(query: string) {
    try {
      const r = await api<RoundData>(`/api/round?${query}`);
      setRound(r);
      setAnswers(r.answered);
      setFinished(r.finished);
      globe.current?.clear();
      globe.current?.reset();
      clearUrl();
      if (r.answered.length >= MULTIPLIERS.length) {
        setIdx(MULTIPLIERS.length - 1);
        setPhase("reveal");
        setScreen({ name: "results" });
        return;
      }
      setIdx(r.answered.length);
      setPhase("guess");
      setScreen({ name: "none" });
    } catch (e) {
      say(e instanceof Error ? e.message : "Couldn't start the round.");
    }
  }

  const playDaily = () => needProfile(() => start("mode=daily"));
  const playPractice = (group: string) => start(`mode=practice&group=${group}`);
  const playChallenge = (code: string) => needProfile(() => start(`mode=challenge&code=${encodeURIComponent(code)}`));

  async function onTap(lat: number, lon: number) {
    if (!round || phase !== "guess" || screen.name !== "none") return;
    setPhase("busy");
    globe.current?.placeGuess(lat, lon);
    try {
      const res = await api<Reveal & { total?: number; challenge?: string }>("/api/guess", {
        body: { token: round.token, idx, lat, lon, prior: answers.map((a) => a.points) },
      });
      const next = [...answers.filter((a) => a.idx !== res.idx), res].sort((a, b) => a.idx - b.idx);
      setAnswers(next);
      globe.current?.reveal(res.guess, res.answer);
      if (res.total !== undefined) setFinished({ total: res.total, challenge: res.challenge ?? null });
      setPhase("reveal");
    } catch (e) {
      globe.current?.clear();
      setPhase("guess");
      say(e instanceof Error ? e.message : "That guess didn't go through. Tap again.");
    }
  }

  function nextQuestion() {
    if (idx >= MULTIPLIERS.length - 1) {
      if (!finished) setFinished({ total: roundTotal(answers.map((a) => a.points)), challenge: null });
      setScreen({ name: "results" });
      if (round?.mode === "daily") loadMe();
      return;
    }
    setIdx(idx + 1);
    setPhase("guess");
    globe.current?.clear();
    globe.current?.reset();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && phase === "reveal" && screen.name === "none") nextQuestion();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const total = roundTotal(answers.map((a) => a.points));
  const q = round?.questions[idx];
  const current = answers.find((a) => a.idx === idx);

  return (
    <div className="app">
      <header>
        <div className="brand">Geo<span>Khel</span><small>खेल</small></div>
        <div className="spacer" />
        <div className="dots" aria-label="Round progress">
          {MULTIPLIERS.map((_, i) => {
            const a = round ? answers.find((x) => x.idx === i) : undefined;
            return <span key={i} className={`dot${!a && round && i === idx ? " now" : ""}`} style={a ? { background: `var(--t-${tier(a.points).key})`, borderColor: "transparent" } : undefined} />;
          })}
        </div>
        <div className="score"><small>Score</small><span>{round ? total : 0}</span></div>
        <button className="iconbtn" aria-label="Menu" onClick={() => setScreen({ name: "menu" })}>☰</button>
      </header>

      <div className="mapwrap">
        <GlobeMap ref={globe} onTap={onTap} />
        <div className="zoom">
          <button aria-label="Reset view" style={{ fontSize: 14 }} onClick={() => globe.current?.reset()}>⤢</button>
        </div>
        <div className="hint">Drag to spin · one tap = your guess</div>
      </div>

      <div className="sheet">
        {round && q ? (
          <>
            <div className="meta">
              <span>{round.label} · Q{idx + 1} of 5</span>
              <span className="chip">{q.sport}</span>
              {q.multiplier > 1 && <span className="mult">×{q.multiplier} points</span>}
            </div>
            {phase !== "reveal" || !current ? (
              <>
                <p className="clue">{q.clue}</p>
                <p className="status">{phase === "busy" ? "Checking your guess…" : "One tap is your guess. To look around first, drag the map: a drag never counts as a guess."}</p>
              </>
            ) : (
              <>
                <div className="reveal">
                  <div className="pts" style={{ color: `var(--t-${tier(current.points).key})` }}>
                    {current.points * q.multiplier}
                    <small>{tier(current.points).label}</small>
                  </div>
                  <div className="ans">
                    <b>{current.answer.name}</b>
                    <p>{formatDistance(current.km)} away{q.multiplier > 1 ? ` · ${current.points} × ${q.multiplier}` : ""}. {current.answer.fact}</p>
                    {round.rival && <p className="rival">Your friend scored {round.rival.points[idx] * q.multiplier} on this one.</p>}
                  </div>
                </div>
                <div className="row">
                  <span className="status" />
                  <button className="btn" autoFocus onClick={nextQuestion}>{idx === 4 ? "See results" : "Next"}</button>
                </div>
              </>
            )}
          </>
        ) : (
          <p className="clue">Pick a round from the menu to start.</p>
        )}
      </div>

      {screen.name !== "none" && (
        <div className="overlay">
          <div className="card">
            {screen.name === "loading" && <p className="lede">Loading…</p>}
            {screen.name === "menu" && (
              <Menu me={me} onDaily={playDaily} onPractice={playPractice} onBoards={() => setScreen({ name: "boards" })}
                onGroups={() => needProfile(() => setScreen({ name: "groups" }))} onProfile={() => setScreen({ name: "profile" })}
                onResume={round && answers.length < 5 ? () => setScreen({ name: "none" }) : undefined} />
            )}
            {screen.name === "profile" && (
              <Profile me={me} onDone={async (token) => {
                if (token) setToken(token);
                const m = await loadMe();
                if (!m) return say("Couldn't save your profile. Try again.");
                if (screen.then) screen.then(); else setScreen({ name: "menu" });
              }} onCancel={() => setScreen({ name: "menu" })} />
            )}
            {screen.name === "challenge" && (
              <ChallengeIntro points={screen.points} onPlay={() => playChallenge(screen.code)} onSkip={() => { clearUrl(); setScreen({ name: "menu" }); }} />
            )}
            {screen.name === "join" && (
              <JoinGroup group={screen.group} onJoin={() => needProfile(async () => {
                try {
                  await api("/api/groups/join", { body: { code: screen.group.code } });
                  clearUrl();
                  await loadMe();
                  setScreen({ name: "boards", tab: `g:${screen.group.code}` });
                } catch (e) { say(e instanceof Error ? e.message : "Couldn't join the group."); }
              })} onSkip={() => { clearUrl(); setScreen({ name: "menu" }); }} />
            )}
            {screen.name === "results" && round && (
              <Results round={round} answers={answers} finished={finished} me={me}
                onBoards={() => setScreen({ name: "boards" })} onPractice={() => playPractice("mixed")} onMenu={() => setScreen({ name: "menu" })} say={say} />
            )}
            {screen.name === "boards" && <Boards me={me} initialTab={screen.tab} onClose={() => setScreen({ name: "menu" })} />}
            {screen.name === "groups" && me && (
              <Groups me={me} reload={loadMe} say={say} onBoard={(code) => setScreen({ name: "boards", tab: `g:${code}` })} onClose={() => setScreen({ name: "menu" })} />
            )}
          </div>
        </div>
      )}
      <div className={`toast${toast ? " on" : ""}`} role="status">{toast}</div>
    </div>
  );
}

function Menu(p: { me: Me | null; onDaily(): void; onPractice(g: string): void; onBoards(): void; onGroups(): void; onProfile(): void; onResume?: () => void }) {
  const today = p.me?.today;
  return (
    <>
      <h1>Geo<span>Khel</span></h1>
      <p className="lede">Five Indian sports moments a day. Tap where each one happened on the map of India. The closer your pin, the more you score.</p>
      <div className="mults">{MULTIPLIERS.map((m, i) => <div key={i}>Q{i + 1}<b>{100 * m}</b></div>)}</div>
      {p.me && (
        <div className="stats">
          <div><b>{p.me.streak}</b><span>Day streak</span></div>
          <div><b>{p.me.played}</b><span>Played</span></div>
          <div><b>{p.me.best}</b><span>Best</span></div>
        </div>
      )}
      <div className="stack">
        {p.onResume && <button className="btn" onClick={p.onResume}>Back to my round</button>}
        {today?.total != null ? (
          <p><b>Today's round is done: {today.total}/1000.</b> A new one unlocks at midnight IST.</p>
        ) : (
          <button className={p.onResume ? "btn ghost" : "btn"} onClick={p.onDaily}>Play today's round{today ? ` · #${today.number}` : ""}</button>
        )}
        <button className="btn ghost" onClick={p.onBoards}>Leaderboards</button>
        <button className="btn ghost" onClick={p.onGroups}>My groups</button>
      </div>
      <div>
        <p className="meta" style={{ margin: "0 0 6px" }}>Practice (doesn't count)</p>
        <div className="sports">{PRACTICE.map((g) => <button key={g.id} onClick={() => p.onPractice(g.id)}>{g.label}</button>)}</div>
      </div>
      <p className="foot">
        {p.me ? <>Playing as <b>{p.me.player.nickname}</b> from {p.me.player.state}. <button className="linkbtn" onClick={p.onProfile}>Change</button></> : "Only distance counts, on the same curve as GeoSports."}
      </p>
    </>
  );
}

function Profile(p: { me: Me | null; onDone(token?: string): void; onCancel(): void }) {
  const [name, setName] = useState(p.me?.player.nickname ?? "");
  const [state, setState] = useState(p.me?.player.state ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (p.me) {
        await api("/api/player", { method: "PATCH", body: { nickname: name, state } });
        p.onDone();
      } else {
        const r = await api<{ token: string }>("/api/player", { body: { nickname: name, state } });
        p.onDone(r.token);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      <h2>{p.me ? "Your profile" : "Who's playing?"}</h2>
      <p className="lede">{p.me ? "Your name and state show on the leaderboards." : "Your name shows on the leaderboards, and your state's average goes into the state-vs-state table. No sign-up needed."}</p>
      <label className="field" htmlFor="nick">Name
        <input id="nick" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="nickname" placeholder="e.g. Hanish" required />
      </label>
      <label className="field" htmlFor="state">State
        <select id="state" value={state} onChange={(e) => setState(e.target.value)} required>
          <option value="" disabled>Choose your state</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      {err && <p className="err">{err}</p>}
      <button className="btn" disabled={busy || name.trim().length < 2 || !state}>{p.me ? "Save" : "Let's play"}</button>
      <button type="button" className="btn ghost" onClick={p.onCancel}>Back</button>
    </form>
  );
}

function ChallengeIntro(p: { points: number[]; onPlay(): void; onSkip(): void }) {
  return (
    <>
      <h1>Geo<span>Khel</span></h1>
      <p className="verdict">Your friend scored {roundTotal(p.points)}/1000.</p>
      <p className="lede">You get the same 5 Indian sports questions. Tap where each moment happened on the map. The closer your pin, the more you score.</p>
      <div className="tiles">{p.points.map((pt, i) => <div key={i} className="tile" style={{ background: `var(--t-${tier(pt).key})` }}>{tier(pt).emoji}</div>)}</div>
      <div className="stack">
        <button className="btn" autoFocus onClick={p.onPlay}>Take the challenge</button>
        <button className="btn ghost" onClick={p.onSkip}>Not now</button>
      </div>
    </>
  );
}

function JoinGroup(p: { group: Group; onJoin(): void; onSkip(): void }) {
  return (
    <>
      <h2>Join “{p.group.name}”</h2>
      <p className="lede">{p.group.members ?? 0} {p.group.members === 1 ? "player" : "players"} so far. Everyone plays the same daily round, and the group gets its own leaderboard.</p>
      <div className="stack">
        <button className="btn" autoFocus onClick={p.onJoin}>Join group</button>
        <button className="btn ghost" onClick={p.onSkip}>Not now</button>
      </div>
    </>
  );
}

function waLink(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function WhatsAppButton({ text }: { text: string }) {
  return (
    <a className="btn wa" href={waLink(text)} target="_blank" rel="noopener noreferrer">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.3Z" /></svg>
      Share to WhatsApp
    </a>
  );
}

function Results(p: { round: RoundData; answers: Reveal[]; finished: Finished | null; me: Me | null; onBoards(): void; onPractice(): void; onMenu(): void; say(m: string): void }) {
  const total = p.finished?.total ?? roundTotal(p.answers.map((a) => a.points));
  const head = p.round.mode === "daily" ? `#${p.round.day}` : p.round.mode === "challenge" ? "Challenge" : "Practice";
  const dots = p.answers.map((a) => tier(a.points).emoji).join("");
  const link = p.finished?.challenge ? `${siteUrl()}/?vs=${p.finished.challenge}` : siteUrl();
  const text = `GeoKhel ${head} 🇮🇳 ${total}/1000\n${dots}\n${p.finished?.challenge ? "Same 5 questions. Beat my score:" : "Play:"} ${link}`;
  const rival = p.round.rival ? roundTotal(p.round.rival.points) : null;
  const diff = rival === null ? 0 : total - rival;
  return (
    <>
      <p className="meta" style={{ margin: 0 }}>{p.round.label}</p>
      <div className="total">{total}<small> / 1000</small></div>
      <div className="tiles">{p.answers.map((a, i) => <div key={i} className="tile" style={{ background: `var(--t-${tier(a.points).key})` }}>{a.points * MULTIPLIERS[i]}</div>)}</div>
      <div className="list">{p.answers.map((a) => <div key={a.idx}><i>{Math.round(a.km).toLocaleString("en-IN")}</i><span>km from <b>{a.answer.name}</b></span></div>)}</div>
      {rival !== null && (
        <>
          <div className="vs"><div><b>{total}</b><span>You</span></div><i>vs</i><div><b>{rival}</b><span>Your friend</span></div></div>
          <p className="verdict">{diff > 0 ? `You won by ${diff}.` : diff < 0 ? `Your friend won by ${-diff}.` : "It's a tie."} {diff < 0 ? "Send them a rematch." : "Send it back to them."}</p>
        </>
      )}
      <div className="sharebox">{text}</div>
      <div className="stack">
        <WhatsAppButton text={text} />
        <button className="btn ghost" onClick={() => navigator.clipboard.writeText(text).then(() => p.say("Copied. Paste it in your group chat."), () => p.say("Select the text above and copy it."))}>Copy result</button>
        {p.round.mode === "daily" && p.me && (
          <div className="stats"><div><b>{p.me.streak}</b><span>Day streak</span></div><div><b>{p.me.played}</b><span>Played</span></div><div><b>{p.me.best}</b><span>Best</span></div></div>
        )}
        <button className="btn ghost" onClick={p.onBoards}>See leaderboards</button>
        <button className="btn ghost" onClick={p.onPractice}>Play a practice round</button>
        <button className="btn ghost" onClick={p.onMenu}>Menu</button>
      </div>
    </>
  );
}

interface BoardData {
  day: string; number: number; title?: string;
  rows?: { rank: number; nickname: string; state: string; total: number; me: boolean }[];
  mine?: { rank: number; nickname: string; state: string; total: number } | null;
  states?: { state: string; players: number; average: number }[];
  myState?: string | null;
}

function Boards(p: { me: Me | null; initialTab?: string; onClose(): void }) {
  const tabs = [
    { id: "all", label: "Everyone" },
    ...(p.me ? [{ id: "state", label: p.me.player.state }] : []),
    { id: "states", label: "State vs state" },
    ...(p.me?.groups ?? []).map((g) => ({ id: `g:${g.code}`, label: g.name })),
  ];
  const [tab, setTab] = useState(p.initialTab ?? "all");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<BoardData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const d = new Date(Date.now() + 5.5 * 3600e3 + offset * 864e5).toISOString().slice(0, 10);
    const q = tab === "all" ? "scope=all" : tab === "state" ? "scope=state" : tab === "states" ? "scope=states" : `scope=group&code=${tab.slice(2)}`;
    setErr(null);
    api<BoardData>(`/api/leaderboard?${q}&day=${d}`)
      .then((r) => { if (live) setData(r); })
      .catch((e) => { if (live) { setData(null); setErr(e instanceof Error ? e.message : "Couldn't load the leaderboard."); } });
    return () => { live = false; };
  }, [tab, offset]);

  return (
    <>
      <h2>Leaderboards</h2>
      <div className="tabs">{tabs.map((t) => <button key={t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
      <div className="dayNav">
        <button aria-label="Previous day" disabled={offset <= -13} onClick={() => setOffset(offset - 1)}>‹</button>
        <span>{data ? `Daily #${data.number}${offset === 0 ? " · today" : ""}` : "…"}</span>
        <button aria-label="Next day" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>›</button>
      </div>
      {err && <p className="err">{err}</p>}
      {data?.states && (
        data.states.length ? (
          <div className="board">
            {data.states.map((s, i) => (
              <div key={s.state} className={`r${s.state === data.myState ? " me" : ""}`}>
                <span className="rank">{i + 1}</span>
                <span className="who">{s.state}<small>{s.players} {s.players === 1 ? "player" : "players"}</small>
                  <div className="bar" style={{ width: `${s.average / 10}%` }} /></span>
                <b>{s.average}</b>
              </div>
            ))}
          </div>
        ) : <p className="empty">No scores yet for this day. Play today's round to put your state on the board.</p>
      )}
      {data?.rows && (
        data.rows.length ? (
          <div className="board">
            {data.mine && !data.rows.some((r) => r.me) && (
              <div className="r me"><span className="rank">You</span><span className="who">{data.mine.nickname}<small>{data.mine.state}</small></span><b>{data.mine.total}</b></div>
            )}
            {data.rows.map((r, i) => (
              <div key={i} className={`r${r.me ? " me" : ""}`}>
                <span className="rank">{r.rank}</span>
                <span className="who">{r.nickname}<small>{r.state}</small></span>
                <b>{r.total}</b>
              </div>
            ))}
          </div>
        ) : <p className="empty">No scores yet for this day.</p>
      )}
      <button className="btn ghost" onClick={p.onClose}>Back</button>
    </>
  );
}

function Groups(p: { me: Me; reload(): Promise<unknown>; say(m: string): void; onBoard(code: string): void; onClose(): void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const invite = (g: Group) =>
    `Join our GeoKhel group “${g.name}”. Five Indian sports questions a day, and we get our own leaderboard: ${siteUrl()}/?g=${g.code}`;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api("/api/groups", { body: { name } });
      setName("");
      await p.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't create the group.");
    } finally {
      setBusy(false);
    }
  }
  async function leave(g: Group) {
    try {
      await api("/api/groups/leave", { body: { code: g.code } });
      await p.reload();
      p.say(`You left ${g.name}.`);
    } catch (e) {
      p.say(e instanceof Error ? e.message : "Couldn't leave the group.");
    }
  }

  return (
    <>
      <h2>My groups</h2>
      <p className="lede">Make a group for your family, office or college WhatsApp group. Everyone who joins gets a shared daily leaderboard.</p>
      {p.me.groups.length === 0 && <p className="empty">You're not in any groups yet.</p>}
      {p.me.groups.map((g) => (
        <div key={g.id} className="grouprow">
          <div><b>{g.name}</b><span>{g.members ?? 0} {g.members === 1 ? "player" : "players"}</span></div>
          <div className="row" style={{ gap: 12 }}>
            <button className="linkbtn" onClick={() => p.onBoard(g.code)}>Scores</button>
            <a className="linkbtn" href={waLink(invite(g))} target="_blank" rel="noopener noreferrer">Invite</a>
            <button className="linkbtn" onClick={() => leave(g)}>Leave</button>
          </div>
        </div>
      ))}
      <form className="inline" onSubmit={create}>
        <label className="field" htmlFor="gname">New group name
          <input id="gname" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Sharma family" />
        </label>
        <button className="btn" disabled={busy || name.trim().length < 2}>Create</button>
      </form>
      {err && <p className="err">{err}</p>}
      <button className="btn ghost" onClick={p.onClose}>Back</button>
    </>
  );
}
