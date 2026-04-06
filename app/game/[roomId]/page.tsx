"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { FaCopy } from "react-icons/fa";
import { Socket } from "socket.io-client";
import { IoPeopleOutline } from "react-icons/io5";
import { useRef } from "react";

type Player = {
  id: string;
  name: string;
  ready: boolean;
  color: string;
};

export default function Page() {
  const params = useParams();
  const roomId = params.roomId as string;

  const [players, setPlayers] = useState<Player[]>([]);
  const [showCopied, setShowCopied] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem("playerName");
    if (!name) return;

    let playerId = localStorage.getItem("playerId");
    if (!playerId) {
      playerId = crypto.randomUUID();
      localStorage.setItem("playerId", playerId);
    }

    socketRef.current = io();

    socketRef.current.emit("join-room", { roomId, name, playerId });

    socketRef.current.on("room-data", (roomPlayers: Player[]) => {
      setPlayers(roomPlayers);
    });

    socketRef.current.on("countdown", (time: number) => {
      if (time === 0) {
        setCountdown(null);
        setIsStarting(true);
      } else {
        setCountdown(time);
      }
    });

    socketRef.current.on("start-game", () => {
      console.log("GAME STARTED");
      window.location.href = `/game/${roomId}/vote`;
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId]);

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(roomId);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  return (
    <div
      className="font-pixel h-screen flex flex-col items-center justify-center gap-4"
      style={{
        backgroundImage: "url('/images/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="h-full w-full bg-black/30 flex flex-col items-center justify-center">
        {showCopied && (
          <div className="border fixed top-5 left-1/2 -translate-x-1/2 bg-green-400 text-white px-5 py-2 shadow-lg z-50">
            Copied!
          </div>
        )}

        <h1 className="tracking-widest text-4xl font-bold mb-5 text-orange-300">
          LOBBY
        </h1>

        <div className="flex gap-4 bg-white/80 pr-5 pl-5 p-1 border mb-5">
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-gray-600">
              Lobby Code:
            </span>
            <span className="text-2xl text-orange-300">{roomId}</span>
          </div>

          <button
            onClick={copyRoomCode}
            className="mt-3 flex items-center justify-center bg-orange-300 text-gray-700 w-7 h-7 border hover:bg-orange-200 cursor-pointer"
          >
            <FaCopy />
          </button>
        </div>

        <div className="bg-white/80 border p-3">
          <h2 className="text-lg font-semibold flex items-center gap-1 mb-3">
            <IoPeopleOutline className="text-orange-300 text-xl" />
            <span className="text-gray-700">Players:</span>
          </h2>

          <div className="flex flex-col gap-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="w-70 h-10 border p-2 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 border"
                    style={{ backgroundColor: player.color }}
                  ></div>
                  <span>{player.name}</span>
                </div>

                {player.ready && (
                  <span className="text-green-500 font-bold">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
        {countdown !== null && !isStarting && (
          <div className="text-2xl font-bold text-white">
            Game starts in {countdown}...
          </div>
        )}
        {isStarting && (
          <div className="text-2xl font-bold text-green-400 animate-pulse mt-1">
            Starting...
          </div>
        )}
        <button
          onClick={() => {
            console.log("clicked ready");
            socketRef.current?.emit("player-ready", {
              roomId,
              playerId: localStorage.getItem("playerId"),
            });
          }}
          className="bg-green-400 p-1 pl-4 pr-4 mt-5 border hover:bg-green-300 cursor-pointer"
        >
          Ready
        </button>
      </div>
    </div>
  );
}
