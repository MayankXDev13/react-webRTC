import { useCallback, useEffect, useState } from "react";
import { useSocket } from "../context/SocketProvider";
import StreamVideo from "../components/StremaVideo";
import peer from "../service/peer";

function Room() {
  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const socket = useSocket();

  // When another user joins the room
  const handleUserJoin = useCallback(
    ({ email, id }: { email: string; id: string }) => {
      console.log(`Email ${email} joined room`);
      setRemoteSocketId(id);
    },
    [],
  );

  const sendMyStream = useCallback(() => {
    if (myStream && peer.peer) {
      const senders = peer.peer.getSenders();
      for (const track of myStream.getTracks()) {
        // Find an existing sender for this track kind (audio/video)
        const existingSender = senders.find(
          (s) => s.track?.kind === track.kind,
        );
        if (existingSender) {
          // Replace the track on the existing sender (safe, no renegotiation needed)
          existingSender.replaceTrack(track);
        } else {
          // No sender for this kind yet, add a new one
          peer.peer.addTrack(track, myStream);
        }
      }
    }
  }, [myStream]);

  // Caller creates the offer
  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setMyStream(stream);

    // Add local tracks before creating the offer
    for (const track of stream.getTracks()) {
      peer.peer?.addTrack(track, stream);
    }

    const offer = await peer.getOffer();

    socket.emit("user:call", {
      to: remoteSocketId,
      offer,
    });
  }, [socket, remoteSocketId]);

  // Receiver receives the offer and creates an answer
  const handleIncomingCall = useCallback(
    async ({
      from,
      offer,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      console.log(`Incoming call from ${from}`, offer);

      setRemoteSocketId(from);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setMyStream(stream);

      // Add local tracks before creating the answer
      for (const track of stream.getTracks()) {
        peer.peer?.addTrack(track, stream);
      }

      const answer = await peer.getAnswer(offer);

      socket.emit("call:accepted", {
        to: from,
        ans: answer,
      });
    },
    [socket],
  );

  // Caller receives the answer
  const handleCallAccepted = useCallback(
    async ({ to, ans }: { to: string; ans: RTCSessionDescriptionInit }) => {
      console.log("Call Accepted");
      console.log("Answer:", ans);
      sendMyStream()

      // Answer is from the remote peer,
      // so it must be set as the remote description.
      await peer.setRemoteDescription(ans);
    },
    [],
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:need", {
      to: remoteSocketId,
      offer,
    });
  }, [socket, remoteSocketId]);

  const handleNegoNeedIncomming = useCallback(
    async ({
      from,
      offer,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      const ans = await peer.getAnswer(offer);

      socket.emit("peer:nego:done", {
        to: from,
        ans,
      });
    },
    [socket, remoteSocketId],
  );

  const handleNegoNeedFinal = useCallback(
    async ({ ans }: { ans: RTCSessionDescriptionInit }) => {
      await peer.setRemoteDescription(ans);
    },
    [],
  );

  // Handle negotiation needed
  useEffect(() => {
    peer.peer?.addEventListener("negotiationneeded", handleNegoNeeded);

    return () => {
      peer.peer?.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  // Handle remote media tracks
  useEffect(() => {
    const handleTrack = (event: RTCTrackEvent) => {
      console.log("Remote track received");

      const [stream] = event.streams;

      if (stream) {
        setRemoteStream(stream);
      }
    };

    peer.peer?.addEventListener("track", handleTrack);

    return () => {
      peer.peer?.removeEventListener("track", handleTrack);
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    socket.on("user:joined", handleUserJoin);
    socket.on("incomming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:need", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoin);
      socket.off("incomming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:need", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoin,
    handleIncomingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  return (
    <div>
      <h1>Room</h1>

      <h4>{remoteSocketId ? "User Connected" : "No user connected"}</h4>

      {remoteSocketId && <button onClick={handleCallUser}>Call</button>}
      {myStream && <button onClick={sendMyStream}>Send Stream</button>}

      <h1>My Stream</h1>
      {myStream && <StreamVideo stream={myStream} muted />}

      <h1>Remote Stream</h1>
      {remoteStream && <StreamVideo stream={remoteStream} />}
    </div>
  );
}

export default Room;
