"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const Page = () => {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const [action, setAction] = useState<"create" | "join" | null>(null);

  const router = useRouter();

  const handleSubmit = () => {
    if (!name) {
      alert("Enter your name first");
      return;
    }

    localStorage.setItem("playerName", name);

    if (action === "create") {
      const roomId = Math.random().toString(36).substring(2, 8);
      router.push(`/game/${roomId}`);
    }

    if (action === "join" && roomCode) {
      router.push(`/game/${roomCode}`);
    }
  };

  return (
    <div
      className="font-pixel h-screen w-full flex flex-col items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: "url('/images/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="h-full w-full bg-black/30 flex flex-col items-center justify-center">
        <h1 className="flex flex-col items-center text-5xl font-extrabold text-blue-400 mb-5">
          <span className="drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]">
            The Bug
          </span>
          <span className="text-blue-300 drop-shadow-[0_0_10px_rgba(147,197,253,0.8)]">
            Among Us
          </span>
        </h1>

        <button
          onClick={() => setAction("create")}
          className="cursor-pointer w-82 border p-2 pr-5 pl-5 bg-green-300 hover:bg-green-200 mb-4"
        >
          Create Room
        </button>

        <div className="flex flex-col gap-2 border p-4">
          <p className="text-sm text-gray-700">Or join a room...</p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="border p-2"
            />
            <button
              onClick={() => {
                if (!roomCode) return;
                setAction("join");
              }}
              className="border p-2 pr-5 pl-5 bg-blue-300 hover:bg-blue-200 cursor-pointer"
            >
              Join
            </button>
          </div>
        </div>

        {action && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-6 flex flex-col gap-4">
              <h2 className="text-xl font-bold text-center">Enter your name</h2>

              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border p-2 "
              />

              <button
                onClick={handleSubmit}
                className="bg-blue-400 text-white p-2 hover:bg-blue-300 cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
