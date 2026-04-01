/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

type Votes = Record<string, string[]>;

const categories = [
  "Front-End",
  "Back-End",
  "Security",
  "Data Structures and Algorithms",
  "Object-Oriented Programming",
];

export default function VotePage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const socketRef = useRef<Socket | null>(null);

  const [time, setTime] = useState(10);
  const [votes, setVotes] = useState<Votes>({});
  const [selected, setSelected] = useState<string | null>(null);

  const [winner, setWinner] = useState<string | null>(null);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (socketRef.current) return;

    const socket = io();
    socketRef.current = socket;

    socket.emit("join-room", {
      roomId,
      name: localStorage.getItem("playerName"),
    });

    socket.emit("start-vote-timer", roomId);

    socket.on("vote-timer", (t: number) => setTime(t));

    socket.on("vote-update", (data: Votes) => setVotes(data));

    socket.on("vote-winner", (win: string) => {
      setWinner(win);
      setShowWinnerAnimation(true);

      setTimeout(() => {
        setLoading(true);

        setTimeout(() => {
          setLoading(true);

          setTimeout(() => {
            window.location.href = `/game/${roomId}/gameplay`;
          }, 2500);
        }, 1000);
      }, 1000);
    });

    socket.on("your-role", (r: string) => {
      setRole(r);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  const vote = (category: string) => {
    setSelected(category);

    socketRef.current?.emit("vote-category", {
      roomId,
      category,
    });
  };

  if (loading) {
    return (
      <div
        className="h-screen flex items-center justify-center text-4xl font-bold text-white"
        style={{
          backgroundImage: "url('/images/bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="h-full w-full bg-black/50 flex items-center justify-center">
          {!role && <span>Loading round...</span>}

          {role && (
            <div className="text-center max-w-xl font-pixel">
              <div className="text-4xl mb-6 font-bold">
                {role === "sabotager" ? (
                  <span>
                    YOU ARE THE <span className="text-red-500">SABOTAGER</span>
                  </span>
                ) : (
                  <span>
                    YOU ARE A <span className="text-green-400">CIVILIAN</span>
                  </span>
                )}
              </div>

              {role === "sabotager" ? (
                <div className="text-xl text-gray-200 leading-relaxed">
                  Your job is to{" "}
                  <span className="text-red-400 font-bold">
                    sabotage the code
                  </span>
                  . Do not get caught
                  <br />
                </div>
              ) : (
                <div className="text-xl text-gray-200 leading-relaxed">
                  Your job is to{" "}
                  <span className="text-green-400 font-bold">
                    fixes the code{" "}
                  </span>
                  and{" "}
                  <span className="text-green-400 font-bold">
                    find the sabotager
                  </span>
                  <br />
                </div>
              )}

              <div className="text-sm text-gray-400 mt-6">Game starting...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="font-pixel h-screen flex items-center justify-center text-3xl"
      style={{
        backgroundImage: "url('/images/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="h-full w-full bg-black/30 flex flex-col items-center justify-center">
        <span className="text-orange-300 font-semibold text-4xl">
          VOTE CATEGORY
        </span>

        {!winner && countdown === null && (
          <div className="text-2xl border bg-white/90 p-1 mb-5 mt-3 font-semibold">
            {time}s
          </div>
        )}

        <div
          className={`text-lg grid grid-cols-2 gap-4 transition-all duration-500 ${
            showWinnerAnimation ? "scale-110" : ""
          }`}
        >
          {winner && showWinnerAnimation && (
            <div className="mt-5 mb-5 border bg-white/80 text-center col-span-2 text-lg p-1.5 w-100 font-bold">
              {winner}
            </div>
          )}

          {!winner &&
            categories.map((cat) => (
              <div
                key={cat}
                onClick={() => vote(cat)}
                className={`border bg-white/80 p-2 cursor-pointer hover:bg-white/70 ${
                  selected === cat ? "bg-green-300" : ""
                }`}
              >
                {cat} ({votes[cat]?.length || 0})
              </div>
            ))}
        </div>

        {!winner && countdown === null && (
          <div className="mt-3 text-sm text-gray-700">
            Click to select a category
          </div>
        )}
      </div>
    </div>
  );
}
