"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

type WinnerData = {
  winner: "civilian" | "sabotager" | "draw";
};

export default function WinningScreen() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [winner, setWinner] = useState<string | null>(null);
  const authChecked = useRef(false);

  useEffect(() => {
    if (authChecked.current) return;
    authChecked.current = true;

    const allowedPhase = sessionStorage.getItem("allowed-phase");
    if (allowedPhase !== "winning") {
      if (allowedPhase === "lobby") {
        window.location.replace(`/game/${roomId}`);
        return;
      }
      if (
        allowedPhase === "vote" ||
        allowedPhase === "gameplay" ||
        allowedPhase === "discussion"
      ) {
        window.location.replace(`/game/${roomId}/${allowedPhase}`);
        return;
      }
      window.location.replace(`/game/${roomId}`);
      return;
    }

    const winnerData = sessionStorage.getItem("winner");
    if (winnerData) {
      const data: WinnerData = JSON.parse(winnerData);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWinner(data.winner);
    } else {
      router.push("/");
    }
  }, [router, roomId]);

  if (!winner) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  const isCivilianWin = winner === "civilian";
  const isSabotagerWin = winner === "sabotager";

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center font-pixel">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="text-center"
      >
        <motion.h1
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`text-6xl font-bold mb-5 tracking-widest ${
            isCivilianWin
              ? "text-green-400"
              : isSabotagerWin
                ? "text-red-400"
                : "text-yellow-500"
          }`}
        >
          {isCivilianWin
            ? "CIVILIANS WIN"
            : isSabotagerWin
              ? "SABOTAGER WIN"
              : "DRAW!"}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-white text-lg mb-10"
        >
          {isCivilianWin
            ? "The sabotager have been eliminated"
            : isSabotagerWin
              ? "The sabotager has taken over"
              : "No clear winner this time..."}
        </motion.div>

        <motion.button
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          onClick={() => {
            sessionStorage.removeItem("winner");
            sessionStorage.removeItem("allowed-phase");
            router.push("/");
          }}
          className="px-6 py-2 cursor-pointer hover:bg-gray-800 text-white text-lg font-bold border-2 transition-colors"
        >
          Return
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isCivilianWin
            ? "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)"
            : isSabotagerWin
              ? "radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(234,179,8,0.15) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
