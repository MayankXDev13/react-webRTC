import { useEffect, useCallback, useState, useRef } from "react";
import { useSocket } from "../context/SocketProvider";
import StreamVideo from "../components/StremaVideo";
import peer from "../service/peer";

function Room() {
  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const socket = useSocket();

  const handleUserJoin = useCallback(
    ({ email, id }: { email: string; id: string }) => {
      console.log(`Email ${email} joined room`);
      setRemoteSocketId(id);
    },
    [],
  );

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [socket, remoteSocketId]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }: { from: string; offer: any }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setMyStream(stream);
      console.log(`Incomming call from ${from}`, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket],
  );

  const handleCallAccepted = useCallback((to: string, ans: any) => {
    peer.setLocalDescription(ans);
    console.log(`Call Accepted`);
    
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoin);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);

    return () => {
      socket.off("user:joined", handleUserJoin);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
    };
  }, [socket, handleUserJoin, handleIncommingCall, handleCallAccepted]);

  return (
    <div>
      <h1>Room</h1>
      <h4>{remoteSocketId ? "User Connected" : "No user connected"}</h4>
      {remoteSocketId && <button onClick={handleCallUser}>Call</button>}
      {myStream && <StreamVideo stream={myStream} muted />}
    </div>
  );
}

export default Room;
