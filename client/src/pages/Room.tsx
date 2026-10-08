import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useSocket } from "../context/SocketProvider";
import StreamVideo from "../components/StreamVideo";
import peer from "../service/peer";
import {
  ArrowLeft,
  Check,
  Copy,
  Link2,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  PhoneIncoming,
  TriangleAlert,
  Video as VideoIcon,
  VideoOff,
} from "lucide-react";
import { cn } from "../lib/cn";

interface IncomingCall {
  from: string;
  offer: RTCSessionDescriptionInit;
}

type CallPhase = "idle" | "calling" | "incoming" | "connected";

function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();

  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [busy, setBusy] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleUserJoin = useCallback(
    ({ email, id }: { email: string; id: string }) => {
      console.log(`Email ${email} joined room`);
      setRemoteSocketId(id);
    },
    [],
  );

  const getLocalStream = useCallback(async (): Promise<MediaStream | null> => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setMyStream((prev) => {
        prev?.getTracks().forEach((track) => track.stop());
        return stream;
      });
      setMicOn(true);
      setCamOn(true);
      peer.addTracks(stream);
      return stream;
    } catch {
      setError(
        "Could not access your camera or microphone. Check browser permissions and try again.",
      );
      return null;
    }
  }, []);

  const handleCallUser = useCallback(async () => {
    if (!remoteSocketId || busy) return;
    setBusy(true);
    const stream = await getLocalStream();
    if (!stream) {
      setBusy(false);
      return;
    }
    const offer = await peer.getOffer();
    if (!offer) {
      setBusy(false);
      return;
    }
    socket.emit("user:call", { to: remoteSocketId, offer });
    setPhase("calling");
    setBusy(false);
  }, [socket, remoteSocketId, busy, getLocalStream]);

  const handleIncomingCall = useCallback(
    ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      setRemoteSocketId(from);
      setIncomingCall({ from, offer });
      setPhase("incoming");
    },
    [],
  );

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall || busy) return;
    setBusy(true);
    const stream = await getLocalStream();
    if (!stream) {
      setBusy(false);
      return;
    }
    const answer = await peer.getAnswer(incomingCall.offer);
    if (!answer) {
      setBusy(false);
      return;
    }
    socket.emit("call:accepted", { to: incomingCall.from, ans: answer });
    setIncomingCall(null);
    setPhase("connected");
    setBusy(false);
  }, [incomingCall, busy, getLocalStream, socket]);

  const declineIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    socket.emit("call:declined", { to: incomingCall.from });
    setIncomingCall(null);
    setPhase("idle");
  }, [incomingCall, socket]);

  const handleCallAccepted = useCallback(
    async ({ from, ans }: { from: string; ans: RTCSessionDescriptionInit }) => {
      console.log(`Call accepted by ${from}`);
      await peer.setRemoteDescription(ans);
      setPhase("connected");
    },
    [],
  );

  const handleCallDeclined = useCallback(() => {
    setPhase("idle");
    setError("The other peer declined the call.");
  }, []);

  const handleNegoNeeded = useCallback(async () => {
    if (!remoteSocketId) return;
    const offer = await peer.getOffer();
    if (!offer) return;
    socket.emit("peer:nego:need", { to: remoteSocketId, offer });
  }, [socket, remoteSocketId]);

  const handleNegoNeedIncoming = useCallback(
    async ({
      from,
      offer,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      const ans = await peer.getAnswer(offer);
      if (!ans) return;
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket],
  );

  const handleNegoNeedFinal = useCallback(
    async ({ ans }: { ans: RTCSessionDescriptionInit }) => {
      await peer.setRemoteDescription(ans);
    },
    [],
  );

  const handleIceCandidate = useCallback(
    async ({
      candidate,
    }: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      await peer.addIceCandidate(candidate);
    },
    [],
  );

  const toggleMic = useCallback(() => {
    if (!myStream) return;
    const next = !micOn;
    myStream.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicOn(next);
  }, [myStream, micOn]);

  const toggleCamera = useCallback(() => {
    if (!myStream) return;
    const next = !camOn;
    myStream.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCamOn(next);
  }, [myStream, camOn]);

  const leaveRoom = useCallback(() => {
    setMyStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setRemoteStream(null);
    setIncomingCall(null);
    setRemoteSocketId(null);
    setPhase("idle");
    navigate("/");
  }, [navigate]);

  const copyInvite = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the invite link.");
    }
  }, []);

  useEffect(() => {
    const handleIceCandidateEvent = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate && remoteSocketId) {
        socket.emit("ice:candidate", {
          to: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };
    const connection = peer.peer;
    connection.addEventListener("icecandidate", handleIceCandidateEvent);
    return () => {
      connection.removeEventListener("icecandidate", handleIceCandidateEvent);
    };
  }, [socket, remoteSocketId]);

  useEffect(() => {
    const connection = peer.peer;
    connection.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      connection.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  useEffect(() => {
    const handleTrack = (event: RTCTrackEvent) => {
      const [stream] = event.streams;
      if (stream) {
        setRemoteStream(stream);
        setPhase("connected");
      }
    };
    const connection = peer.peer;
    connection.addEventListener("track", handleTrack);
    return () => {
      connection.removeEventListener("track", handleTrack);
    };
  }, []);

  useEffect(() => {
    return () => {
      setMyStream((prev) => {
        prev?.getTracks().forEach((track) => track.stop());
        return null;
      });
    };
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoin);
    socket.on("incoming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:declined", handleCallDeclined);
    socket.on("peer:nego:need", handleNegoNeedIncoming);
    socket.on("peer:nego:final", handleNegoNeedFinal);
    socket.on("ice:candidate", handleIceCandidate);
    return () => {
      socket.off("user:joined", handleUserJoin);
      socket.off("incoming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:declined", handleCallDeclined);
      socket.off("peer:nego:need", handleNegoNeedIncoming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
      socket.off("ice:candidate", handleIceCandidate);
    };
  }, [
    socket,
    handleUserJoin,
    handleIncomingCall,
    handleCallAccepted,
    handleCallDeclined,
    handleNegoNeedIncoming,
    handleNegoNeedFinal,
    handleIceCandidate,
  ]);

  const status = remoteStream
    ? { label: "In call", tone: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20" }
    : phase === "incoming"
      ? { label: "Incoming call", tone: "bg-indigo-500/15 text-indigo-300 border-indigo-400/20" }
      : phase === "calling"
        ? { label: "Calling…", tone: "bg-sky-500/15 text-sky-300 border-sky-400/20" }
        : remoteSocketId
          ? { label: "Peer in room", tone: "bg-sky-500/15 text-sky-300 border-sky-400/20" }
          : { label: "Waiting for peer", tone: "bg-amber-500/15 text-amber-300 border-amber-400/20" };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={leaveRoom}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Leave
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2">
          <Link2 className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-300">
            Room: <span className="text-white">{roomId ?? "—"}</span>
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
            status.tone,
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {status.label}
        </span>
        <button
          onClick={copyInvite}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 ring-1 ring-white/10 transition hover:text-white hover:ring-white/20"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy invite link
            </>
          )}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-200"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {incomingCall && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20">
            <PhoneIncoming className="h-5 w-5 text-indigo-200" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Incoming call</p>
            <p className="truncate text-xs text-indigo-200/70">
              {incomingCall.from} is calling you
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={acceptIncomingCall}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
              Accept
            </button>
            <button
              onClick={declineIncomingCall}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              Decline
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <StreamVideo
          stream={myStream}
          label="You"
          muted
          mirrored
          audioMuted={!!myStream && !micOn}
          cameraOff={!!myStream && !camOn}
        />
        <StreamVideo stream={remoteStream} label={remoteSocketId ? "Peer" : "No peer yet"} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-zinc-900/70 p-4 backdrop-blur">
        {!remoteStream && (
          <button
            onClick={handleCallUser}
            disabled={!remoteSocketId || busy}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            {busy ? "Calling…" : myStream ? "Call peer" : "Start camera & call"}
          </button>
        )}

        {myStream ? (
          <>
            <button
              onClick={toggleMic}
              title={micOn ? "Mute microphone" : "Unmute microphone"}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition",
                micOn
                  ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  : "bg-red-500/15 text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/25",
              )}
            >
              {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {micOn ? "Mute" : "Unmute"}
            </button>
            <button
              onClick={toggleCamera}
              title={camOn ? "Turn camera off" : "Turn camera on"}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition",
                camOn
                  ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  : "bg-red-500/15 text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/25",
              )}
            >
              {camOn ? <VideoIcon className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              {camOn ? "Camera" : "Camera off"}
            </button>
          </>
        ) : (
          <button
            onClick={() => void getLocalStream()}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
          >
            <VideoIcon className="h-4 w-4" />
            Preview my camera
          </button>
        )}

        <button
          onClick={leaveRoom}
          className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-400"
        >
          <PhoneOff className="h-4 w-4" />
          End & leave
        </button>
      </div>

      {!remoteSocketId && !remoteStream && (
        <div className="mt-4 rounded-2xl border border-white/5 bg-zinc-900/40 px-4 py-3 text-center text-xs leading-5 text-zinc-500">
          Share the invite link with one other person. Once they join this room
          with the same room name, you can start the call.
        </div>
      )}
    </div>
  );
}

export default Room;
