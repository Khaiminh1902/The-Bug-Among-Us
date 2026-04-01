import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = true;
const app = next({ dev });
const handle = app.getRequestHandler();

type Roles = {
  [roomId: string]: {
    [socketId: string]: "civilian" | "sabotager";
  };
};

type Player = {
  id: string;
  name: string;
  ready: boolean;
};

type Rooms = {
  [roomId: string]: Player[];
};

type Votes = {
  [roomId: string]: {
    [category: string]: string[];
  };
};

const votes: Votes = {};
const rooms: Rooms = {};
const roles: Roles = {};

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("start-vote-timer", (roomId: string) => {
      let time = 10;

      const interval = setInterval(() => {
        io.to(roomId).emit("vote-timer", time);

        const room = rooms[roomId];
        if (!room) return;

        const playerIds = room.map((p) => p.id);

        const sabotagerCount = Math.max(1, Math.floor(playerIds.length / 4));

        const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

        roles[roomId] = {};

        shuffled.forEach((id, index) => {
          roles[roomId][id] = index < sabotagerCount ? "sabotager" : "civilian";
        });

        playerIds.forEach((id) => {
          io.to(id).emit("your-role", roles[roomId][id]);
        });

        time--;

        if (time < 0) {
          clearInterval(interval);

          const roomVotes = votes[roomId] || {};

          let winner = "";
          let max = 0;

          for (const category in roomVotes) {
            if (roomVotes[category].length > max) {
              max = roomVotes[category].length;
              winner = category;
            }
          }

          io.to(roomId).emit("vote-winner", winner);
        }
      }, 1000);
    });

    socket.on("vote-category", (data: { roomId: string; category: string }) => {
      const { roomId, category } = data;

      if (!votes[roomId]) votes[roomId] = {};

      for (const cat in votes[roomId]) {
        votes[roomId][cat] = votes[roomId][cat].filter(
          (id) => id !== socket.id,
        );
      }

      if (!votes[roomId][category]) votes[roomId][category] = [];

      votes[roomId][category].push(socket.id);

      io.to(roomId).emit("vote-update", votes[roomId]);
    });

    socket.on("join-room", (data: { roomId: string; name: string }) => {
      const { roomId, name } = data;

      socket.join(roomId);

      if (!rooms[roomId]) rooms[roomId] = [];

      rooms[roomId] = rooms[roomId].filter((player) => player.name !== name);

      rooms[roomId].push({
        id: socket.id,
        name,
        ready: false,
      });

      console.log("ROOM:", rooms[roomId]);

      io.to(roomId).emit("room-data", rooms[roomId]);
    });

    socket.on("player-ready", (data: { roomId: string }) => {
      const { roomId } = data;

      console.log("READY CLICKED:", socket.id);
      console.log("ROOM:", rooms[roomId]);

      const room = rooms[roomId];
      if (!room) return;

      const player = room.find((p) => p.id === socket.id);
      if (!player) return;

      player.ready = true;

      io.to(roomId).emit("room-data", room);

      const allReady = room.length >= 2 && room.every((p) => p.ready === true);

      if (allReady) {
        console.log("All players ready in room:", roomId);

        let countdown = 5;

        const interval = setInterval(() => {
          io.to(roomId).emit("countdown", countdown);

          countdown--;

          if (countdown < 0) {
            clearInterval(interval);
            io.to(roomId).emit("start-game");
          }
        }, 1000);
      }
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
