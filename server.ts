import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = true;
const app = next({ dev });
const handle = app.getRequestHandler();

type Player = {
  id: string;
  name: string;
};

type Rooms = {
  [roomId: string]: Player[];
};

const rooms: Rooms = {};

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (data: { roomId: string; name: string }) => {
      const { roomId, name } = data;

      socket.join(roomId);

      if (!rooms[roomId]) rooms[roomId] = [];

      const alreadyInRoom = rooms[roomId].find(
        (player) => player.id === socket.id,
      );

      if (!alreadyInRoom) {
        rooms[roomId].push({
          id: socket.id,
          name,
        });
      }

      io.to(roomId).emit("room-data", rooms[roomId]);
    });

    socket.on("disconnect", () => {
      for (const roomId in rooms) {
        rooms[roomId] = rooms[roomId].filter(
          (player) => player.id !== socket.id,
        );

        io.to(roomId).emit("room-data", rooms[roomId]);
      }
    });
  });

  httpServer.listen(3000, () => {
    console.log("Server running");
  });
});
