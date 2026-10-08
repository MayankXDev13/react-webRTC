import { useState, useCallback, useEffect } from "react";
import { useSocket } from "../context/SocketProvider";
import { useNavigate } from "react-router";
import {
  AtSign,
  Hash,
  Loader2,
  LogIn,
  ShieldCheck,
  Shuffle,
  Video,
  Zap,
} from "lucide-react";

function randomRoom() {
  return `room-${Math.random().toString(36).slice(2, 7)}`;
}

function Lobby() {
  const [email, setEmail] = useState<string>("");
  const [room, setRoom] = useState<string>("");
  const [joining, setJoining] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!email.trim() || !room.trim()) {
        setFormError("Enter both an email and a room name to continue.");
        return;
      }
      setFormError(null);
      setJoining(true);
      socket.emit("room:join", { email: email.trim(), room: room.trim() });
    },
    [email, room, socket],
  );

  const handleJoinRoom = useCallback(
    (data: { email: string; room: string }) => {
      const { email: joinedEmail, room: joinedRoom } = data;
      sessionStorage.setItem("email", joinedEmail);
      navigate(`/room/${joinedRoom}`);
    },
    [navigate],
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  useEffect(() => {
    if (!joining) return;
    const timeout = setTimeout(() => setJoining(false), 8000);
    return () => clearTimeout(timeout);
  }, [joining]);

  return (
    <div className="mx-auto grid w-full max-w-4xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
          <Zap className="h-3.5 w-3.5" />
          WebRTC · Socket.IO signaling
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Start a video call in seconds.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-zinc-400">
          Pick a room name, share it with a friend, and connect directly —
          audio and video stream peer-to-peer with low latency.
        </p>
        <ul className="mt-6 space-y-3 text-sm text-zinc-400">
          {[
            "No account needed — just an email and a room",
            "Peer-to-peer media with STUN-assisted NAT traversal",
            "Automatic renegotiation when tracks change",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 shadow-2xl shadow-black/50 backdrop-blur sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
            <Video className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">Join a room</h2>
            <p className="text-xs text-zinc-500">
              You&apos;ll land in the call lobby for that room.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitForm} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-medium text-zinc-300"
            >
              Email
            </label>
            <div className="relative">
              <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                name="email"
                id="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                required
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="room"
              className="mb-1.5 block text-xs font-medium text-zinc-300"
            >
              Room name
            </label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                name="room"
                id="room"
                placeholder="e.g. design-sync"
                value={room}
                required
                minLength={2}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRoom(e.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              type="button"
              onClick={() => setRoom(randomRoom())}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 transition hover:text-indigo-200"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Generate a random room
            </button>
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300"
            >
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={joining}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {joining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Joining…
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Join room
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Lobby;
