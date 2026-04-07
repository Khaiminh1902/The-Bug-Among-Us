/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams } from "next/navigation";
import { IoPeopleOutline, IoCheckmark, IoClose } from "react-icons/io5";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  getTasksForCategory,
  getSabotageTasksForCategory,
  type Task,
} from "@/data/tasks";

type Player = {
  id: string;
  name: string;
  ready: boolean;
  color: string;
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
  const [time, setTime] = useState(120);
  const [players, setPlayers] = useState<Player[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const roleRef = useRef<string | null>(null);
  const [round, setRound] = useState(1);
  const editorRef = useRef<any>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const hasRedirected = useRef(false);
  const bindingRef = useRef<any>(null);
  const [ending, setEnding] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);

  const initYjs = async (socket: Socket) => {
    const Y = await import("yjs");
    const { MonacoBinding } = await import("y-monaco");
    const { Awareness } = await import("y-protocols/awareness");

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const awareness = new Awareness(ydoc);
    awarenessRef.current = awareness;

    const yText = ydoc.getText("monaco");

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
      new MonacoBinding(yText, editor.getModel(), new Set([editor]), awareness);
    };

    setReady(true);

    socket.emit("get-yjs-state", { roomId });
  };

  useEffect(() => {
    if (socketRef.current) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL);
    socketRef.current = socket;

    let playerId = localStorage.getItem("playerId");

    if (!playerId) {
      playerId = crypto.randomUUID();
      localStorage.setItem("playerId", playerId);
    }

    socket.on("vote-winner", (winner: string) => {
      setCategory(winner);
      setCompletedTasks([]);
      setTimeout(() => {
        if (roleRef.current === "sabotager") {
          setCurrentTasks(getSabotageTasksForCategory(winner));
        } else {
          setCurrentTasks(getTasksForCategory(winner));
        }
      }, 100);
    });

    socket.on("gameplay-timer", (t: number) => {
      setTime(t);
    });

    socket.on("yjs-state", async (data: { state: number[] }) => {
      let attempts = 0;
      const applyState = async () => {
        attempts++;
        if (data.state && data.state.length > 0 && ydocRef.current) {
          const Y = await import("yjs");
          const uint8 = new Uint8Array(data.state);
          Y.applyUpdate(ydocRef.current, uint8);
        } else if (data.state && data.state.length > 0 && attempts < 10) {
          setTimeout(applyState, 100);
        }
      };
      applyState();
    });

    socket.on("room-data", (data: Player[]) => {
      setPlayers(data);
    });

    socket.on("your-role", (r: string) => {
      setRole(r);
      roleRef.current = r;
    });

    socket.on("player-tasks", (completed: number[]) => {
      setCompletedTasks(completed);
    });

    socket.on("round-ended", (newRound: number) => {
      setRound(newRound);
    });

    socket.on("round-update", (newRound: number) => {
      setRound(newRound);
    });

    socket.on(
      "phase-transition",
      ({ phase }: { round: number; phase: string }) => {
        if (phase === "discussion") {
          setEnding(true);
          setTimeout(() => {
            hasRedirected.current = true;
            router.push(`/game/${roomId}/discussion`);
          }, 800);
        }
      },
    );

    socket.on("game-ended", () => {
      setEnding(true);
      setTimeout(() => {
        hasRedirected.current = true;
        router.push(`/`);
      }, 800);
    });

    socket.emit("join-room", {
      roomId,
      name: localStorage.getItem("playerName"),
      playerId: localStorage.getItem("playerId"),
    });

    initYjs(socket);

    socket.emit("player-ready-gameplay", {
      roomId,
      playerId: localStorage.getItem("playerId"),
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, router]);

  const toggleTask = (bugId: number) => {
    let newCompleted: number[];
    if (completedTasks.includes(bugId)) {
      newCompleted = completedTasks.filter((id) => id !== bugId);
    } else {
      newCompleted = [...completedTasks, bugId];
    }
    setCompletedTasks(newCompleted);

    socketRef.current?.emit("update-tasks", {
      roomId,
      playerId: localStorage.getItem("playerId") || "",
      completedTasks: newCompleted,
    });
  };

  return (
    <div className="font-pixel flex flex-col h-screen bg-orange-100">
      <div className="w-screen h-15 grid grid-cols-3 items-center px-3">
        <div className="flex items-center gap-3">
          <div className="border-2 p-1 w-fit bg-orange-400">
            Round {round}/4
          </div>
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
            <div
              key={p.id}
              className="border p-2 mb-2 text-sm flex items-center"
            >
              <div
                className="w-3 h-3 border mr-2"
                style={{ backgroundColor: p.color }}
              ></div>
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

          {role === "sabotager" ? (
            <div className="mt-4">
              {currentTasks.map((task) => (
                <div
                  key={task.bugId}
                  className={`border p-2 mb-2 cursor-pointer transition-all ${
                    completedTasks.includes(task.bugId)
                      ? "bg-green-200 border-green-500"
                      : "bg-red-100 border-red-400 hover:bg-red-200"
                  }`}
                  onClick={() => toggleTask(task.bugId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold">
                      Task {task.bugId} (line {task.line})
                    </div>
                    <div>
                      {completedTasks.includes(task.bugId) ? (
                        <IoCheckmark className="text-green-600" />
                      ) : (
                        <IoClose className="text-red-600" />
                      )}
                    </div>
                  </div>
                  <div className="text-xs mt-1">{task.description}</div>
                </div>
              ))}
              {currentTasks.length > 0 && (
                <div className="text-xs mt-2 text-center">
                  {completedTasks.length}/{currentTasks.length} completed
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4">
              {currentTasks.map((task) => (
                <div
                  key={task.bugId}
                  className={`border p-2 mb-2 cursor-pointer transition-all ${
                    completedTasks.includes(task.bugId)
                      ? "bg-green-200 border-green-500"
                      : "bg-yellow-100 border-yellow-400 hover:bg-yellow-200"
                  }`}
                  onClick={() => toggleTask(task.bugId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold">
                      Bug {task.bugId} (line {task.line})
                    </div>
                    <div>
                      {completedTasks.includes(task.bugId) ? (
                        <IoCheckmark className="text-green-600" />
                      ) : (
                        <IoClose className="text-yellow-600" />
                      )}
                    </div>
                  </div>
                  <div className="text-xs mt-1">{task.description}</div>
                </div>
              ))}
              {currentTasks.length > 0 && (
                <div className="text-xs mt-2 text-center">
                  {completedTasks.length}/{currentTasks.length} fixed
                </div>
              )}
            </div>
          )}
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

                  editor.onDidChangeModelContent(() => {
                    const code = editor.getValue();
                  });
                }}
              />
            )}
          </div>

          <div className="w-full flex items-center justify-center mt-2.5">
            <span className="border-black border p-2 bg-red-500 hover:bg-red-600 text-white cursor-pointer font-semibold">
              Emergency
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
