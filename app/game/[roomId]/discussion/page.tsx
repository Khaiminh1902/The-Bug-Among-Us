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
  const [time, setTime] = useState(60);
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState(1);
  const hasRedirected = useRef(false);
  const [ending, setEnding] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const socket = io();
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

    socket.on(
      "phase-transition",
      ({ phase }: { round: number; phase: string }) => {
        if (phase === "gameplay") {
          setEnding(true);
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

    socket.on("game-ended", () => {
      setEnding(true);
      setTimeout(() => {
        hasRedirected.current = true;
        router.push(`/`);
      }, 800);
    });

    socket.on("chat-history", (messages: ChatMessage[]) => {
      setChatMessages(messages);
    });

    socket.on("chat-message", (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
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
    });

    setMessageInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
            {players.length} Players
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-10">
        <div className="text-center">
          <div>
            <h1 className="text-3xl font-bold mb-1 tracking-widest">
              WHO IS THE SABOTAGER?
            </h1>
            <p className="text-sm mb-5">
              Find the sabotager before time runs out
            </p>
          </div>
          <div className="">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center bg-white border-2 mb-4 h-10 p-2 tracking-wide cursor-pointer hover:bg-gray-100"
              >
                <div
                  className="w-4 h-4 border-2 mr-2"
                  style={{ backgroundColor: player.color }}
                ></div>
                <span className="font-semibold">{player.name}</span>
              </div>
            ))}
          </div>
          <div className="bg-green-200 w-full h-10 flex items-center justify-center border-2 hover:bg-green-100 cursor-pointer">
            Skip Vote
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
    </div>
  );
}