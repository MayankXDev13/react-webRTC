import { Server } from "socket.io";
import express from "express";
import { createServer } from "http";

const app = express();

app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const emailToSocketIdMap = new Map<string, string>();
const socketIdToEmailMap = new Map<string, string>();

io.on("connection", (socket) => {
  console.log(`Socket Connected ${socket.id}`);

  socket.on("room:join", (data: { email: string; room: string }) => {
    const { email, room } = data;

    emailToSocketIdMap.set(email, socket.id);
    socketIdToEmailMap.set(socket.id, email);

    io.to(room).emit("user:joined", { email, id: socket.id });
    socket.join(room);
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", (data: { to: string; offer: any }) => {
    const { to, offer } = data;

    io.to(to).emit("incomming:call", {
      from: socket.id,
      offer,
    });
  });


  socket.on("call:accepted", (data: { to: string; ans: any }) => {
    const { to, ans } = data;
    io.to(to).emit("call:accepted", {
      from: socket.id,
      ans,
    });
  });

  socket.on("peer:nego:need", ({ to, offer }) => {
    io.to(to).emit("peer:nego:need", {
      from: socket.id,
      offer,
    });
  });


  socket.on("peer:nego:done", ({to, ans}) => {
    io.to(to).emit("peer:nego:final", {
      from: socket.id,
      ans,
    });
  })
});

httpServer.listen(8000, () => {
  console.log(`Server is running on http://localhost:8000`);
});
