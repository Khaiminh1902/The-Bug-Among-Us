"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams, useRouter } from "next/navigation";
import { LuSend } from "react-icons/lu";

type Player = {
  id: string;
  name: string;
  ready: boolean;
  color: string;
};

type ChatMessage = {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  color: string;
};

export default function Page() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [time, setTime] = useState(60);
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState(1);
  const hasRedirected = useRef(false);
  const [ending, setEnding] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [votes, setVotes] = useState<{ [key: string]: string }>({});
  const [voteResult, setVoteResult] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [eliminatedIsSabotager, setEliminatedIsSabotager] = useState<
    boolean | null
  >(null);
  const authChecked = useRef(false);

  const vote = (targetId: string) => {
    const currentPlayerId = localStorage.getItem("playerId");
    if (targetId === currentPlayerId) return;

    socketRef.current?.emit("vote-player", {
      roomId,
      targetId,
      playerId: currentPlayerId,
    });
  };

  useEffect(() => {
    if (authChecked.current) return;
    authChecked.current = true;

    if (typeof window === "undefined") return;

    const allowedPhase = sessionStorage.getItem("allowed-phase");
    if (allowedPhase !== "discussion") {
      if (allowedPhase === "lobby") {
        window.location.replace(`/game/${roomId}`);
        return;
      }
      if (allowedPhase === "vote" || allowedPhase === "gameplay") {
        window.location.replace(`/game/${roomId}/${allowedPhase}`);
        return;
      }
      window.location.replace(`/game/${roomId}`);
      return;
    }

    setIsReady(true); // eslint-disable-line react-hooks/set-state-in-effect

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      reconnection: false,
    });
    socketRef.current = socket;

    let playerId = localStorage.getItem("playerId");

    if (!playerId) {
      playerId = crypto.randomUUID();
      localStorage.setItem("playerId", playerId);
    }

    socket.emit("join-room", {
      roomId,
      name: localStorage.getItem("playerName"),
      playerId: localStorage.getItem("playerId"),
    });

    socket.on("room-data", (data: Player[]) => {
      setPlayers(data);
    });

    socket.on("round-update", (newRound: number) => {
      setRound(newRound);
    });

    socket.on("discussion-timer", (t: number) => {
      setTime(t);
    });

    socket.on("player-vote-update", (data) => {
      setVotes(data);
    });

    socket.on("vote-result", ({ eliminated, isSabotager }) => {
      setVoteResult(eliminated);
      setEliminatedIsSabotager(isSabotager ?? null);
      setShowResult(true);
    });

    socket.on(
      "phase-transition",
      async ({ phase }: { round: number; phase: string }) => {
        setShowResult(false);
        setVoteResult(null);
        setEliminatedIsSabotager(null);

        if (phase === "gameplay") {
          setEnding(true);

try {
        await fetch("/api/game/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            phase: "gameplay",
          }),
        });
        sessionStorage.setItem("allowed-phase", "gameplay");
      } catch (e) {
        console.error("Failed to authorize:", e);
      }

      setTimeout(() => {
        hasRedirected.current = true;
        router.push(`/game/${roomId}/gameplay`);
      }, 800);
        }
      },
    );

    socket.on("discussion-ended", () => {
      setEnding(true);
      setTimeout(() => {
        hasRedirected.current = true;
        router.push(`/game/${roomId}/gameplay`);
      }, 800);
    });

socket.on("game-ended", async () => {
      setEnding(true);

      try {
        await fetch("/api/game/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            phase: "lobby",
            clear: true,
          }),
        });
      } catch (e) {
        console.error("Failed to clear auth:", e);
      }

      setTimeout(() => {
        hasRedirected.current = true;
        window.location.href = "/";
      }, 800);
    });

    socket.on("chat-history", (messages: ChatMessage[]) => {
      setChatMessages(messages);
    });

    socket.on("chat-message", (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    socket.on("kicked", async () => {
      console.log("Received kicked event");
      setEnding(true);

      try {
        await fetch("/api/game/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            phase: "lobby",
            clear: true,
          }),
        });
      } catch (e) {
        console.error("Failed to clear auth:", e);
      }

      setTimeout(() => {
        hasRedirected.current = true;
        window.location.href = "/";
      }, 800);
    });

    socket.emit("player-ready-discussion", { roomId });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = () => {
    if (!messageInput.trim() || !socketRef.current) return;

    socketRef.current.emit("send-chat-message", {
      roomId,
      message: messageInput.trim(),
      playerId: localStorage.getItem("playerId"),
    });

    setMessageInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isReady) {
    return <div className="h-screen bg-black" />;
  }

  return (
    <div className="font-pixel flex flex-col h-screen bg-orange-100">
      <div className="w-screen h-15 grid grid-cols-3 items-center px-3">
        <div className="flex items-center gap-3">
          <div className="border-2 p-1 w-fit bg-orange-400">
            Round {round}/4
          </div>
          <div className="text-sm">Discussion</div>
        </div>

        <div className="text-center">
          <div
            className={`border-2 p-1.5 w-fit mx-auto text-xl font-bold transition-all duration-300
            ${time <= 10 ? "bg-red-500 text-white border-2 border-white scale-110 animate-pulse" : ""}
            ${time <= 5 ? "animate-bounce" : ""}
            `}
          >
            {time}s
          </div>
        </div>

        <div className="text-right">
          <div className="p-1 w-fit ml-auto flex items-center gap-1">
            {players.length} Alive
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-10">
        <div className="text-center">
          <div>
            <h1 className="text-3xl font-bold mb-1 tracking-wider">
              WHO IS THE SABOTAGER?
            </h1>
            <p className="text-sm mb-5">
              Find the sabotager before time runs out
            </p>
          </div>
          <div className="">
            {players.map((player) => {
              const voteCount = Object.values(votes).filter(
                (v) => v === player.id,
              ).length;

              const isCurrentPlayer =
                player.id === localStorage.getItem("playerId");

              return (
                <div
                  key={player.id}
                  onClick={() => {
                    if (isCurrentPlayer) return;
                    console.log("CLICKED", player.id);
                    vote(player.id);
                  }}
                  className={`flex items-center justify-between border-2 mb-4 h-10 p-2 tracking-wide ${
                    isCurrentPlayer
                      ? "bg-white cursor-not-allowed opacity-60"
                      : "bg-white cursor-pointer hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 border-2 mr-2"
                      style={{ backgroundColor: player.color }}
                    ></div>
                    <span className="font-semibold">{player.name}</span>
                  </div>

                  <span className="text-xs">{voteCount} votes</span>
                </div>
              );
            })}
          </div>
          <div
            onClick={() => vote("skip")}
            className="bg-green-200 w-full h-10 flex items-center justify-center border-2 hover:bg-green-100 cursor-pointer"
          >
            Skip Vote ({Object.values(votes).filter((v) => v === "skip").length}
            )
          </div>
        </div>
        <div className="bg-blue-100 h-96 w-[20%] border-2 flex flex-col overflow-hidden">
          <div className="border-b-2 p-2 font-semibold tracking-wide text-lg">
            Chat
          </div>

          <div
            className="flex-1 overflow-y-auto p-2 space-y-2"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#93c5fd #bfdbfe",
            }}
          >
            {chatMessages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <div className="flex items-center gap-1 mb-1">
                  <div
                    className="w-3 h-3 border border-gray-400 rounded-full"
                    style={{ backgroundColor: msg.color }}
                  ></div>
                  <span className="font-semibold text-xs">
                    {msg.playerName}
                  </span>
                </div>
                <div className="bg-white border rounded p-2 ml-4 wrap-break-words">
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t-2 p-2 flex items-center gap-2">
            <input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="border-2 p-2 flex-1 min-h-10 max-h-16 focus:outline-none bg-blue-200"
              placeholder="Type a message..."
              maxLength={200}
            />
            <div
              onClick={sendMessage}
              className="border-2 cursor-pointer flex items-center justify-center bg-blue-200 hover:bg-blue-300 transition-colors"
            >
              <LuSend size={40} className="p-2" />
            </div>
          </div>
        </div>
      </div>
      {ending && (
        <div
          className="fixed inset-0 bg-black z-50"
          style={{ opacity: 1, transition: "opacity 0.8s" }}
        />
      )}
      {ending && (
        <div
          className="fixed inset-0 bg-black z-50"
          style={{ opacity: 1, transition: "opacity 0.8s" }}
        />
      )}

      {showResult && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-60 flex items-center justify-center text-white">
          <div className="text-center">
            {voteResult ? (
              <>
                <h1 className="text-3xl font-bold mb-4 tracking-wide flex flex-col">
                  <div>
                    <span className="text-red-500">
                      {players.find((p) => p.id === voteResult)?.name}
                    </span>{" "}
                    {eliminatedIsSabotager === true
                      ? "was the Sabotager!"
                      : eliminatedIsSabotager === false
                        ? "was not the Sabotager"
                        : "was eliminated"}
                  </div>
                </h1>
              </>
            ) : (
              <h1 className="text-3xl font-bold tracking-wider flex flex-col">
                No one was eliminated
                <span className="text-xs mt-2 text-gray-400">
                  Next round starting...
                </span>
              </h1>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
