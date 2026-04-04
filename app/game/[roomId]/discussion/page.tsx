"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LuSend } from "react-icons/lu";

type Player = {
  id: string;
  name: string;
  ready: boolean;
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

    socket.emit("player-ready-discussion", { roomId });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, router]);

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
        <div className="bg-blue-100 h-[80%] w-[20%] border-2 flex flex-col overflow-hidden">
          <div className="border-b-2 p-2 font-semibold tracking-wide text-lg">
            Chat
          </div>

          <div className="flex-1 overflow-auto">
            {/* Chat messages will go here */}
          </div>

          <div className="border-t-2 p-2 flex items-center gap-2">
            <input
              className="border-2 p-2 flex-1 min-h-10 max-h-16 focus:outline-none bg-blue-200"
              placeholder="Type a message..."
            />
            <div className="border-2 cursor-pointer flex items-center justify-center bg-blue-200 hover:bg-blue-300">
              <LuSend size={40} className="p-2" />
            </div>
          </div>
        </div>
      </div>
      {ending && (
        <motion.div
          className="fixed inset-0 bg-black z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
      )}
    </div>
  );
}
