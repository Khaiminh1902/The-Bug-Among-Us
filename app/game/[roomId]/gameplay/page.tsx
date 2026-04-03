/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams } from "next/navigation";
import { IoPeopleOutline } from "react-icons/io5";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type Player = {
  id: string;
  name: string;
  ready: boolean;
};

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

export default function Page() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [ready, setReady] = useState(false);
  const [category, setCategory] = useState("Waiting...");
  const [time, setTime] = useState(60);
  const [players, setPlayers] = useState<Player[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const hasRedirected = useRef(false);
  const bindingRef = useRef<any>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const init = async () => {
      const Y = await import("yjs");
      const { MonacoBinding } = await import("y-monaco");
      const { Awareness } = await import("y-protocols/awareness");

      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      const awareness = new Awareness(ydoc);
      awarenessRef.current = awareness;

      const yText = ydoc.getText("monaco");

      const waitForSocket = () =>
        new Promise<Socket>((resolve) => {
          const check = () => {
            if (socketRef.current) return resolve(socketRef.current);
            setTimeout(check, 50);
          };
          check();
        });

      const socket = await waitForSocket();

      socket.on("yjs-update", (update: number[]) => {
        const uint8 = new Uint8Array(update);
        Y.applyUpdate(ydoc, uint8);
      });

      ydoc.on("update", (update: Uint8Array) => {
        socket.emit("yjs-update", {
          roomId,
          update: Array.from(update),
        });
      });

      bindingRef.current = (editor: any) => {
        new MonacoBinding(
          yText,
          editor.getModel(),
          new Set([editor]),
          awareness,
        );
      };

      setReady(true);
    };

    init();

    return () => {
      ydocRef.current?.destroy();
    };
  }, [roomId]);

  useEffect(() => {
    if (socketRef.current) return;

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

  useEffect(() => {
    if (!role || !socketRef.current) return;

    socketRef.current.emit("player-ready-gameplay", { roomId });
  }, [role, roomId]);

  useEffect(() => {
    if (time === 0 && !hasRedirected.current) {
      setEnding(true);
      setTimeout(() => {
        hasRedirected.current = true;
        router.push(`./discussion`);
      }, 800);
    }
  }, [time, router, roomId]);

  return (
    <div className="font-pixel flex flex-col h-screen bg-orange-100">
      <div className="w-screen h-15 grid grid-cols-3 items-center px-3">
        <div className="flex items-center gap-3">
          <div className="border-2 p-1 w-fit bg-orange-400">Round 1/4</div>
          <div className="text-sm">{category}</div>
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
            <IoPeopleOutline />
            {players.length} Alive
          </div>
        </div>
      </div>

      <div className="flex w-screen h-full">
        <div className="border-t border-r w-100 p-2">
          <div className="text-xl font-bold mb-3">Players</div>

          {players.map((p) => (
            <div key={p.id} className="border p-2 mb-2 text-sm">
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

          <div className="text-xl font-bold mt-6">Tasks</div>
        </div>

        <div className="border-t w-full">
          <div className="border-b h-[92%] bg-black text-white">
            {ready && (
              <Editor
                height="100%"
                defaultLanguage="javascript"
                defaultValue="// Start coding..."
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "monospace",
                  cursorSmoothCaretAnimation: "on",
                  smoothScrolling: true,
                  padding: { top: 10 },
                }}
                onMount={(editor) => {
                  editorRef.current = editor;
                  bindingRef.current?.(editor);
                }}
              />
            )}
          </div>

          <div className="w-full flex items-center justify-center mt-2.5">
            <span className="border-black border p-2 bg-red-500 hover:bg-red-600 text-white cursor-pointer font-semibold">
              <Link href="./discussion">Emergency</Link>
            </span>
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
