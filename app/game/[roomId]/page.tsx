"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

type Player = {
  id: string;
  name: string;
};

export default function Page() {
  const params = useParams();
  const roomId = params.roomId as string;

  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const name = localStorage.getItem("playerName");
    if (!name) return;

    const socket = io();

    socket.emit("join-room", { roomId, name });

    socket.on("room-data", (roomPlayers: Player[]) => {
      setPlayers(roomPlayers);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Room: {roomId}</h1>

      <h2 className="text-xl font-semibold">Players in lobby:</h2>

      <div className="flex flex-col gap-2">
        {players.map((player) => (
          <div
            key={player.id}
            className="border p-2 rounded-lg w-48 text-center"
          >
            {player.name}
          </div>
        ))}
      </div>
    </div>
  );
}
