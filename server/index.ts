import { Server } from "socket.io";
import express from "express";
import { createServer } from "http";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

interface RoomJoinData {
  email: string;
  room: string;
}

interface CallData {
  to: string;
  offer: RTCSessionDescriptionInit;
}

interface AnswerData {
  to: string;
  ans: RTCSessionDescriptionInit;
}

interface NegoNeedData {
  to: string;
  offer: RTCSessionDescriptionInit;
}

interface NegoDoneData {
  to: string;
  ans: RTCSessionDescriptionInit;
}

interface IceCandidateData {
  to: string;
  candidate: RTCIceCandidateInit;
}

const emailToSocketIdMap = new Map<string, string>();
const socketIdToEmailMap = new Map<string, string>();

io.on("connection", (socket) => {
  console.log(`Socket Connected ${socket.id}`);

  socket.on("room:join", (data: RoomJoinData) => {
    const { email, room } = data;

    if (!email || !room) return;

    emailToSocketIdMap.set(email, socket.id);
    socketIdToEmailMap.set(socket.id, email);

    socket.join(room);

    // Notify existing room members (excluding the joiner) about the new user
    socket.to(room).emit("user:joined", { email, id: socket.id });
    // Confirm the join to the requester
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", (data: CallData) => {
    const { to, offer } = data;
    if (!to || !offer) return;

    io.to(to).emit("incoming:call", {
      from: socket.id,
      offer,
    });
  });

  socket.on("call:accepted", (data: AnswerData) => {
    const { to, ans } = data;
    if (!to || !ans) return;
    io.to(to).emit("call:accepted", {
      from: socket.id,
      ans,
    });
  });

  socket.on("call:declined", (data: { to: string }) => {
    if (!data?.to) return;
    io.to(data.to).emit("call:declined", {
      from: socket.id,
    });
  });

  socket.on("peer:nego:need", (data: NegoNeedData) => {
    const { to, offer } = data;
    if (!to || !offer) return;
    io.to(to).emit("peer:nego:need", {
      from: socket.id,
      offer,
    });
  });

  socket.on("peer:nego:done", (data: NegoDoneData) => {
    const { to, ans } = data;
    if (!to || !ans) return;
    io.to(to).emit("peer:nego:final", {
      from: socket.id,
      ans,
    });
  });

  socket.on("ice:candidate", (data: IceCandidateData) => {
    const { to, candidate } = data;
    if (!to || !candidate) return;
    io.to(to).emit("ice:candidate", {
      from: socket.id,
      candidate,
    });
  });

  socket.on("disconnect", () => {
    const email = socketIdToEmailMap.get(socket.id);
    if (email) {
      emailToSocketIdMap.delete(email);
    }
    socketIdToEmailMap.delete(socket.id);
    console.log(`Socket Disconnected ${socket.id}`);
  });
});

httpServer.listen(8000, () => {
  console.log(`Server is running on http://localhost:8000`);
});
