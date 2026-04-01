"use client";

import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams } from "next/navigation";

type Player = {
  id: string;
  name: string;
  ready: boolean;
};

export default function Page() {
  const params = useParams();
  const roomId = params.roomId as string;

  const socketRef = useRef<Socket | null>(null);

  const [category, setCategory] = useState("Waiting...");
  const [time, setTime] = useState(60);
  const [players, setPlayers] = useState<Player[]>([]);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (socketRef.current) return;

    const socket = io();
    socketRef.current = socket;

    socket.emit("join-room", {
      roomId,
      name: localStorage.getItem("playerName"),
    });

    socket.on("vote-winner", (winner: string) => {
      setCategory(winner);
    });

    socket.on("gameplay-timer", (t: number) => {
      setTime(t);
    });

    socket.on("room-data", (data: Player[]) => {
      setPlayers(data);
    });

    socket.on("your-role", (r: string) => {
      setRole(r);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  return (
    <div className="font-pixel flex flex-col h-screen">
      <div className="w-screen h-15 grid grid-cols-3 items-center px-3">
        <div className="flex items-center gap-3">
          <div className="border p-1 w-fit">Round 1/4</div>
          <div className="text-sm">{category}</div>
        </div>

        <div className="text-center">
          <div className="border p-1.5 w-fit mx-auto text-xl font-bold">
            {time}s
          </div>
        </div>

        <div className="text-right">
          <div className="p-1 w-fit ml-auto">{players.length} Alive</div>
        </div>
      </div>

      <div className="flex w-screen h-full">
        <div className="border-t border-r w-100 p-2">
          <div className="text-xl font-bold mb-3">Players</div>

          {players.map((p) => (
            <div key={p.id} className="border p-1 mb-2 text-sm">
              {p.name}
            </div>
          ))}

          <div className="text-xl font-bold mt-6">Your Role</div>

          {role && (
            <div
              className={`border p-2 mt-2 text-center ${
                role === "sabotager" ? "bg-red-300" : "bg-green-300"
              }`}
            >
              {role.toUpperCase()}
            </div>
          )}
        </div>

        <div className="border-t w-full">
          <div className="border-b h-[92%] p-2">The code goes here</div>

          <div className="w-max p-4">
            <span className="border p-2">Emergency</span>
          </div>
        </div>
      </div>
    </div>
  );
}
