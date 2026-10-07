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
    ({ from, offer }: { from: string; offer: any }) => {
      console.log(`Incomming call from ${from}`, offer);
    },
    [],
  );

  useEffect(() => {
    socket.on("user:joined", handleUserJoin);
    socket.on("incomming:call", handleIncommingCall);

    return () => {
      socket.off("user:joined", handleUserJoin);
      socket.off("incomming:call", handleIncommingCall);
    };
  }, [socket, handleUserJoin, handleIncommingCall]);

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
