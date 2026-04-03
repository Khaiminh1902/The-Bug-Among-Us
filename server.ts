import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import * as Y from "yjs";

const dev = true;
const app = next({ dev });
const handle = app.getRequestHandler();
const docs: { [roomId: string]: Y.Doc } = {};

const gameplayTimers: {
  [roomId: string]: {
    time: number;
    interval?: NodeJS.Timeout;
  };
} = {};

const discussionTimers: {
  [roomId: string]: {
    time: number;
    interval?: NodeJS.Timeout;
  };
} = {};

const gameState: {
  [roomId: string]: {
    category: string;
    time: number;
    round: number;
    phase: "gameplay" | "discussion";
  };
} = {};

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

const gameplayReady: {
  [roomId: string]: Set<string>;
} = {};

const discussionReady: {
  [roomId: string]: Set<string>;
} = {};

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("yjs-update", ({ roomId, update }) => {
      if (!docs[roomId]) docs[roomId] = new Y.Doc();

      Y.applyUpdate(docs[roomId], update);

      socket.to(roomId).emit("yjs-update", update);
    });

    socket.on("get-yjs-state", ({ roomId }) => {
      if (docs[roomId]) {
        const state = Y.encodeStateAsUpdate(docs[roomId]);
        socket.emit("yjs-state", { roomId, state: Array.from(state) });
      } else {
        socket.emit("yjs-state", { roomId, state: [] });
      }
    });

    socket.on("player-ready-gameplay", ({ roomId }: { roomId: string }) => {
      if (!gameplayReady[roomId]) gameplayReady[roomId] = new Set();

      gameplayReady[roomId].add(socket.id);

      const totalPlayers = rooms[roomId]?.length || 0;

      if (
        gameplayReady[roomId].size === totalPlayers &&
        !gameplayTimers[roomId]
      ) {
        console.log("All players reached gameplay page:", roomId);

        gameplayTimers[roomId] = { time: 10 };

        gameplayTimers[roomId].interval = setInterval(() => {
          gameplayTimers[roomId].time--;

          io.to(roomId).emit("gameplay-timer", gameplayTimers[roomId].time);

          if (gameplayTimers[roomId].time <= 0) {
            clearInterval(gameplayTimers[roomId].interval!);
            delete gameplayTimers[roomId];
            gameplayReady[roomId] = new Set<string>();

            if (gameState[roomId]) {
              gameState[roomId].phase = "discussion";
              console.log(
                "Gameplay ended, moving to discussion. Round:",
                gameState[roomId].round,
              );
              io.to(roomId).emit("phase-transition", {
                round: gameState[roomId].round,
                phase: "discussion",
              });
            }
          }
        }, 1000);
      }
    });

    socket.on("player-ready-discussion", ({ roomId }: { roomId: string }) => {
      if (!discussionReady[roomId]) discussionReady[roomId] = new Set();

      discussionReady[roomId].add(socket.id);

      const totalPlayers = rooms[roomId]?.length || 0;

      if (
        discussionReady[roomId].size === totalPlayers &&
        !discussionTimers[roomId]
      ) {
        console.log("All players reached discussion page:", roomId);

        discussionTimers[roomId] = { time: 10 };

        discussionTimers[roomId].interval = setInterval(() => {
          discussionTimers[roomId].time--;

          io.to(roomId).emit("discussion-timer", discussionTimers[roomId].time);

          if (discussionTimers[roomId].time <= 0) {
            clearInterval(discussionTimers[roomId].interval!);
            delete discussionTimers[roomId];
            discussionReady[roomId] = new Set<string>();

            if (gameState[roomId]) {
              if (gameState[roomId].round < 4) {
                // Move to next round's gameplay
                gameState[roomId].round++;
                gameState[roomId].phase = "gameplay";
                console.log(
                  "Discussion ended, moving to next round. Round:",
                  gameState[roomId].round,
                );
                io.to(roomId).emit("phase-transition", {
                  round: gameState[roomId].round,
                  phase: "gameplay",
                });
              } else {
                // Game is complete after round 4 discussion
                console.log("Game completed after round 4");
                io.to(roomId).emit("game-ended");
              }
            }
          }
        }, 1000);
      }
    });

    socket.on("start-vote-timer", (roomId: string) => {
      const room = rooms[roomId];
      if (!room || room.length === 0) return;

      let time = 10;

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

      console.log("Roles assigned:", roles[roomId]);

      const interval = setInterval(() => {
        io.to(roomId).emit("vote-timer", time);

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

          gameState[roomId] = {
            category: winner,
            time: 60,
            round: 1,
            phase: "gameplay",
          };

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

      const existingPlayer = rooms[roomId].find((p) => p.name === name);

      if (existingPlayer) {
        const oldId = existingPlayer.id;

        existingPlayer.id = socket.id;

        if (roles[roomId] && roles[roomId][oldId]) {
          roles[roomId][socket.id] = roles[roomId][oldId];
          delete roles[roomId][oldId];
        }
      } else {
        rooms[roomId].push({
          id: socket.id,
          name,
          ready: false,
        });
      }

      console.log("ROOM:", rooms[roomId]);

      io.to(roomId).emit("room-data", rooms[roomId]);

      if (roles[roomId] && roles[roomId][socket.id]) {
        socket.emit("your-role", roles[roomId][socket.id]);
      }
      if (gameplayReady[roomId]) {
        gameplayReady[roomId].delete(socket.id);
      }
      if (gameState[roomId]) {
        socket.emit("vote-winner", gameState[roomId].category);
        socket.emit("vote-timer", gameState[roomId].time);
        socket.emit("round-update", gameState[roomId].round);
        socket.emit("phase-update", gameState[roomId].phase);
        if (docs[roomId]) {
          socket.emit("yjs-state", {
            state: Array.from(Y.encodeStateAsUpdate(docs[roomId])),
          });
        }
      }
      if (gameplayTimers[roomId]) {
        socket.emit("gameplay-timer", gameplayTimers[roomId].time);
      }
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
      setTimeout(() => {
        for (const roomId in rooms) {
          const stillExists = rooms[roomId].some((p) => p.id === socket.id);
          if (!stillExists) continue;

          rooms[roomId] = rooms[roomId].filter((p) => p.id !== socket.id);
          io.to(roomId).emit("room-data", rooms[roomId]);
        }
      }, 2000);
    });
  });

  httpServer.listen(3000, () => {
    console.log("Server running on port 3000");
  });
});
