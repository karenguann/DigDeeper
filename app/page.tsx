"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DigScreen } from "@/components/DigScreen";
import { ExpeditionSummary } from "@/components/ExpeditionSummary";
import { GeologistScreen } from "@/components/GeologistScreen";
import { LobbyScreen } from "@/components/LobbyScreen";
import { PlayFrame } from "@/components/PlayFrame";
import { RoundReveal } from "@/components/RoundReveal";
import { TitleScreen } from "@/components/TitleScreen";
import type { RoomView, SessionPayload } from "@/lib/types";

const TOKEN_PREFIX = "digdeeper.token.";

function storageKey(roomCode: string, role: string) {
  return `${TOKEN_PREFIX}${roomCode}.${role}`;
}

function isSession(data: unknown): data is SessionPayload {
  return Boolean(data && typeof data === "object" && "token" in data && "code" in data);
}

export default function Page() {
  const [booted, setBooted] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const epoch = useRef(0);

  const takeView = useCallback((next: RoomView, nextToken?: string) => {
    setView(next);
    setClockOffset(next.serverNow - Date.now());
    if (nextToken && next.role) {
      localStorage.setItem(storageKey(next.code, next.role), nextToken);
      setToken(nextToken);
      setCode(next.code);
      window.history.replaceState(null, "", `/?room=${next.code}&role=${next.role}`);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room")?.trim().toUpperCase() || null;
    const role = params.get("role");
    if (!room) {
      setBooted(true);
      return;
    }
    if (role === "digger" || role === "geologist") {
      const saved = localStorage.getItem(storageKey(room, role));
      if (saved) {
        setCode(room);
        setToken(saved);
        setBooted(true);
        return;
      }
    }
    if (role === "geologist") {
      void (async () => {
        try {
          const response = await fetch(`/api/rooms/${room}/join`, { method: "POST" });
          const data: unknown = await response.json();
          if (!response.ok || !isSession(data)) {
            const message = data && typeof data === "object" && "error" in data ? String(data.error) : "Could not join.";
            throw new Error(message);
          }
          takeView(data, data.token);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not join.");
        } finally {
          setBooted(true);
        }
      })();
      return;
    }
    setError("This browser does not hold the digger token for that room.");
    setBooted(true);
  }, [takeView]);

  useEffect(() => {
    if (!code || !token) return;
    let cancel = false;
    const pull = async () => {
      const stamp = epoch.current;
      try {
        const response = await fetch(`/api/rooms/${code}?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const data: unknown = await response.json();
        if (cancel || stamp !== epoch.current) return;
        if (!response.ok || !data || typeof data !== "object") {
          const message = data && typeof data === "object" && "error" in data ? String(data.error) : "Lost the shaft.";
          setError(message);
          return;
        }
        const next = data as RoomView;
        if (!next.role) {
          localStorage.removeItem(storageKey(code, "digger"));
          localStorage.removeItem(storageKey(code, "geologist"));
          setToken(null);
          setCode(null);
          setView(null);
          setError("This browser is not on the expedition.");
          return;
        }
        setView(next);
        setClockOffset(next.serverNow - Date.now());
      } catch {
        if (!cancel && stamp === epoch.current) setError("Lost the line to the surface.");
      }
    };
    void pull();
    const id = window.setInterval(pull, 800);
    return () => {
      cancel = true;
      window.clearInterval(id);
    };
  }, [code, token]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);

  const deadline = view?.status === "digging" ? view.digEndsAt : view?.status === "bank" ? view.bankEndsAt : null;
  const fuseTotal = view?.status === "bank" ? 60 : 25;
  const secondsLeft = deadline ? Math.max(0, Math.ceil((deadline - (now + clockOffset)) / 1000)) : null;

  const saveDraft = useCallback(async (words: string[], reasoning: string) => {
    if (!code || !token) return;
    try {
      await fetch(`/api/rooms/${code}/bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, words, reasoning, commit: false }),
      });
    } catch {
      /* the lock or the server clock still seals the bank */
    }
  }, [code, token]);

  async function post(path: string, body: Record<string, unknown>) {
    if (!code || !token) return;
    const stamp = ++epoch.current;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...body }),
      });
      const data: unknown = await response.json();
      if (!response.ok || !data || typeof data !== "object" || !("status" in data)) {
        const message = data && typeof data === "object" && "error" in data ? String(data.error) : "The shaft collapsed.";
        throw new Error(message);
      }
      if (stamp !== epoch.current) return;
      takeView(data as RoomView);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The shaft collapsed.");
    } finally {
      setBusy(false);
    }
  }

  async function createExpedition() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/rooms", { method: "POST" });
      const data: unknown = await response.json();
      if (!response.ok || !isSession(data)) {
        const message = data && typeof data === "object" && "error" in data ? String(data.error) : "Could not open a shaft.";
        throw new Error(message);
      }
      takeView(data, data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open a shaft.");
    } finally {
      setBusy(false);
    }
  }

  async function joinExpedition(raw: string) {
    const room = raw.trim().toUpperCase();
    if (!room) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${room}/join`, { method: "POST" });
      const data: unknown = await response.json();
      if (!response.ok || !isSession(data)) {
        const message = data && typeof data === "object" && "error" in data ? String(data.error) : "Could not join.";
        throw new Error(message);
      }
      takeView(data, data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join.");
    } finally {
      setBusy(false);
    }
  }

  let body = null;
  if (!booted || (token && !view && !error)) {
    body = <p className="boot">Descending…</p>;
  } else if (!view?.role) {
    body = <TitleScreen busy={busy} error={error} onCreate={() => void createExpedition()} onJoin={(value) => void joinExpedition(value)} />;
  } else if (view.status === "lobby") {
    body = (
      <PlayFrame view={view}>
        <LobbyScreen code={view.code} />
      </PlayFrame>
    );
  } else {
    body = (
      <PlayFrame view={view}>
        {error ? <p className="banner">{error}</p> : null}
        {view.status === "summary" ? (
          <ExpeditionSummary view={view} />
        ) : view.status === "reveal" ? (
          <RoundReveal view={view} busy={busy} onAdvance={() => void post(`/api/rooms/${view.code}/advance`, {})} />
        ) : view.role === "geologist" ? (
          <GeologistScreen
            view={view}
            secondsLeft={secondsLeft}
            fuseTotal={fuseTotal}
            busy={busy}
            onDraft={saveDraft}
            onLock={(words, reasoning) => void post(`/api/rooms/${view.code}/bank`, { words, reasoning })}
          />
        ) : (
          <DigScreen
            view={view}
            secondsLeft={secondsLeft}
            fuseTotal={fuseTotal}
            busy={busy}
            onGuess={(guess) => void post(`/api/rooms/${view.code}/guess`, { guess })}
          />
        )}
      </PlayFrame>
    );
  }

  return <main className="shell">{body}</main>;
}
