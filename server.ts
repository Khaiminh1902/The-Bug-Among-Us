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

const eliminatedPlayers: {
  [roomId: string]: Set<string>;
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
  color: string;
};

type Rooms = {
  [roomId: string]: Player[];
};

const playerVotes: {
  [roomId: string]: {
    [playerId: string]: string;
  };
} = {};

type Votes = {
  [roomId: string]: {
    [category: string]: string[];
  };
};

type ChatMessage = {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  color: string;
};

const votes: Votes = {};
const rooms: Rooms = {};
const roles: Roles = {};
const chatMessages: {
  [roomId: string]: ChatMessage[];
} = {};

const socketToPlayer: {
  [socketId: string]: string;
} = {};

const connectedPlayerIds: Set<string> = new Set();

const playerColors = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#F8C471",
  "#82E0AA",
  "#F1948A",
  "#AED6F1",
];

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

    socket.on(
      "vote-player",
      (data: { roomId: string; targetId: string; playerId?: string }) => {
        console.log("SERVER RECEIVED VOTE:", data);
        const { roomId, targetId, playerId } = data;

        const voterId = playerId || socketToPlayer[socket.id];

        if (!playerVotes[roomId]) playerVotes[roomId] = {};

        playerVotes[roomId][voterId] = targetId;

        io.to(roomId).emit("player-vote-update", playerVotes[roomId]);
      },
    );

    socket.on("get-yjs-state", ({ roomId }) => {
      if (docs[roomId]) {
        const state = Y.encodeStateAsUpdate(docs[roomId]);
        socket.emit("yjs-state", { roomId, state: Array.from(state) });
      } else {
        socket.emit("yjs-state", { roomId, state: [] });
      }
    });

    socket.on(
      "player-ready-gameplay",
      ({ roomId, playerId }: { roomId: string; playerId?: string }) => {
        if (!gameplayReady[roomId]) gameplayReady[roomId] = new Set();

        const clientPlayerId = playerId || socket.id;
        gameplayReady[roomId].add(clientPlayerId);

        const totalPlayers = rooms[roomId]?.length || 0;

        if (
          gameplayReady[roomId].size === totalPlayers &&
          !gameplayTimers[roomId]
        ) {
          console.log("All players reached gameplay page:", roomId);

          gameplayTimers[roomId] = { time: 120 };

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
      },
    );

    socket.on(
      "player-ready-discussion",
      ({ roomId, playerId }: { roomId: string; playerId?: string }) => {
        if (!discussionReady[roomId]) discussionReady[roomId] = new Set();

        const clientPlayerId = playerId || socket.id;
        discussionReady[roomId].add(clientPlayerId);

        const totalPlayers = rooms[roomId]?.length || 0;

        if (
          discussionReady[roomId].size === totalPlayers &&
          !discussionTimers[roomId]
        ) {
          console.log("All players reached discussion page:", roomId);

          discussionTimers[roomId] = { time: 60 };

          discussionTimers[roomId].interval = setInterval(() => {
            discussionTimers[roomId].time--;

            io.to(roomId).emit(
              "discussion-timer",
              discussionTimers[roomId].time,
            );

            if (discussionTimers[roomId].time <= 0) {
              clearInterval(discussionTimers[roomId].interval!);
              delete discussionTimers[roomId];
              discussionReady[roomId] = new Set<string>();

              const roomVotes = playerVotes[roomId] || {};
              const count: { [key: string]: number } = {};

              Object.values(roomVotes).forEach((target) => {
                count[target] = (count[target] || 0) + 1;
              });

              let max = 0;
              let eliminated: string | null = null;
              let isTie = false;

              for (const target in count) {
                if (count[target] > max) {
                  max = count[target];
                  eliminated = target;
                  isTie = false;
                } else if (count[target] === max) {
                  isTie = true;
                }
              }

              if (isTie || eliminated === "skip") {
                eliminated = null;
              }

              const eliminatedRole = eliminated ? roles[roomId]?.[eliminated] : null;
              io.to(roomId).emit("vote-result", { eliminated, isSabotager: eliminatedRole === "sabotager" });

              setTimeout(() => {
                if (eliminated) {
                  const id = eliminated;

                  if (!eliminatedPlayers[roomId])
                    eliminatedPlayers[roomId] = new Set();
                  eliminatedPlayers[roomId].add(id);

                  rooms[roomId] = rooms[roomId].filter((p) => p.id !== id);

                  gameplayReady[roomId]?.delete(id);
                  discussionReady[roomId]?.delete(id);

                  if (votes[roomId]) {
                    for (const cat in votes[roomId]) {
                      votes[roomId][cat] = votes[roomId][cat].filter(
                        (pid) => pid !== id,
                      );
                    }
                  }

                  const socketId = Object.keys(socketToPlayer).find(
                    (key) => socketToPlayer[key] === id,
                  );

                  io.to(id).emit("kicked");

                  if (socketId) {
                    setTimeout(() => {
                      io.sockets.sockets.get(socketId)?.disconnect(true);
                      delete socketToPlayer[socketId];
                    }, 500);
                  }

                  io.to(roomId).emit("room-data", rooms[roomId]);
                }

                playerVotes[roomId] = {};

                if (gameState[roomId]) {
                  if (gameState[roomId].round < 4) {
                    gameState[roomId].round++;
                    gameState[roomId].phase = "gameplay";

                    io.to(roomId).emit("phase-transition", {
                      round: gameState[roomId].round,
                      phase: "gameplay",
                    });
                  } else {
                    io.to(roomId).emit("game-ended");
                    delete eliminatedPlayers[roomId];
                    delete gameplayTimers[roomId];
                    delete discussionTimers[roomId];
                    delete votes[roomId];
                    delete gameState[roomId];
                    delete rooms[roomId];
                  }
                }
              }, 3000);
            }
          }, 1000);
        }
      },
    );

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

    socket.on(
      "vote-category",
      (data: { roomId: string; category: string; playerId?: string }) => {
        const { roomId, category, playerId } = data;

        const clientPlayerId = playerId || socket.id;

        if (!votes[roomId]) votes[roomId] = {};

        for (const cat in votes[roomId]) {
          votes[roomId][cat] = votes[roomId][cat].filter(
            (id) => id !== clientPlayerId,
          );
        }

        if (!votes[roomId][category]) votes[roomId][category] = [];

        votes[roomId][category].push(clientPlayerId);

        io.to(roomId).emit("vote-update", votes[roomId]);
      },
    );

    socket.on(
      "join-room",
      (data: { roomId: string; name: string; playerId?: string }) => {
        const { roomId, name, playerId } = data;

        socket.join(roomId);

        if (!rooms[roomId]) rooms[roomId] = [];

        const clientPlayerId = playerId || socket.id;

        if (eliminatedPlayers[roomId]?.has(clientPlayerId)) {
          console.log(
            "Blocked eliminated player from rejoining:",
            clientPlayerId,
          );
          socket.emit("kicked");
          socket.disconnect(true);
          return;
        }

        socket.join(clientPlayerId);

        socketToPlayer[socket.id] = clientPlayerId;
        connectedPlayerIds.add(clientPlayerId);

        const existingPlayer = rooms[roomId].find(
          (p) => p.id === clientPlayerId,
        );

        if (existingPlayer) {
          existingPlayer.name = name;
          if (!gameState[roomId]) {
            existingPlayer.ready = false;
          }
        } else {
          const usedColors = rooms[roomId].map((p) => p.color);
          const availableColors = playerColors.filter(
            (color) => !usedColors.includes(color),
          );
          const assignedColor =
            availableColors.length > 0
              ? availableColors[0]
              : playerColors[rooms[roomId].length % playerColors.length];

          rooms[roomId].push({
            id: clientPlayerId,
            name,
            ready: false,
            color: assignedColor,
          });
        }

        console.log("ROOM:", rooms[roomId]);

        io.to(roomId).emit("room-data", rooms[roomId]);

        if (chatMessages[roomId]) {
          socket.emit("chat-history", chatMessages[roomId]);
        }

        if (roles[roomId] && roles[roomId][clientPlayerId]) {
          socket.emit("your-role", roles[roomId][clientPlayerId]);
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
      },
    );

    socket.on("player-ready", (data: { roomId: string; playerId?: string }) => {
      const { roomId, playerId } = data;

      const clientPlayerId = playerId || socket.id;

      console.log("READY CLICKED:", clientPlayerId);
      console.log("ROOM:", rooms[roomId]);

      const room = rooms[roomId];
      if (!room) return;

      const player = room.find((p) => p.id === clientPlayerId);
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

    socket.on(
      "send-chat-message",
      (data: { roomId: string; message: string; playerId?: string }) => {
        const { roomId, message, playerId } = data;

        const clientPlayerId = playerId || socket.id;

        const room = rooms[roomId];
        if (!room) return;

        const player = room.find((p) => p.id === clientPlayerId);
        if (!player) return;

        const trimmedMessage = message.trim();
        if (!trimmedMessage) return;

        const chatMessage: ChatMessage = {
          id: crypto.randomUUID(),
          playerId: clientPlayerId,
          playerName: player.name,
          message: trimmedMessage,
          timestamp: Date.now(),
          color: player.color,
        };

        if (!chatMessages[roomId]) {
          chatMessages[roomId] = [];
        }

        chatMessages[roomId].push(chatMessage);

        if (chatMessages[roomId].length > 100) {
          chatMessages[roomId] = chatMessages[roomId].slice(-100);
        }

        io.to(roomId).emit("chat-message", chatMessage);
      },
    );

    socket.on("disconnect", () => {
      const playerId = socketToPlayer[socket.id] || socket.id;

      delete socketToPlayer[socket.id];
      connectedPlayerIds.delete(playerId);

      setTimeout(() => {
        const playerRejoined = connectedPlayerIds.has(playerId);
        if (playerRejoined) return;

        for (const roomId in rooms) {
          const stillExists = rooms[roomId].some((p) => p.id === playerId);
          if (!stillExists) continue;

          if (gameState[roomId]) continue;

          rooms[roomId] = rooms[roomId].filter((p) => p.id !== playerId);
          io.to(roomId).emit("room-data", rooms[roomId]);
        }
      }, 500);
    });
  });

  httpServer.listen(3000, () => {
    console.log("Server running");
  });
});
