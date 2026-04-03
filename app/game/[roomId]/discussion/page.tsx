/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

type Player = {
  id: string;
  name: string;
  ready: boolean;
};

export default function Page() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [time, setTime] = useState(30);
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

  useEffect(() => {
    if (time === 0 && !hasRedirected.current) {
      setEnding(true);
      setTimeout(() => {
        hasRedirected.current = true;
        router.push(`/game/${roomId}/gameplay`);
      }, 800);
    }
  }, [time, router, roomId]);

  return (
    <div className="font-pixel flex flex-col h-screen bg-orange-100">
      <div className="w-screen h-15 grid grid-cols-3 items-center px-3">
        <div className="flex items-center gap-3">
          <div className="border-2 p-1 w-fit bg-orange-400">Round {round}/4</div>
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

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Discuss and Vote!</h1>
          <p className="text-xl">Find the sabotager before time runs out.</p>
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
