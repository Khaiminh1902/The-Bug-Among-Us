/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createClient, type JsonObject, type Room } from "@liveblocks/client";
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

type LiveblocksPresence = {
  playerId: string;
  name: string;
  color: string;
  selection: {
    anchor: JsonObject;
    head: JsonObject;
  } | null;
  isEditing: boolean;
  updatedAt: number;
};

type LiveblocksRoom = Room<LiveblocksPresence>;

type EditorPresence = {
  connectionId: number;
  playerId: string;
  name: string;
  color: string;
  isEditing: boolean;
};

type AwarenessState = {
  user?: {
    playerId: string;
    name: string;
    color: string;
  };
  selection?: {
    anchor: JsonObject;
    head: JsonObject;
  } | null;
};

type AwarenessMeta = {
  clock: number;
  lastUpdated: number;
};

type MutableAwareness = Awareness & {
  clientID: number;
  states: Map<number, AwarenessState>;
  meta: Map<number, AwarenessMeta>;
  emit: (
    event: "change" | "update",
    args: [
      {
        added: number[];
        updated: number[];
        removed: number[];
      },
      string,
    ],
  ) => void;
};

const LIVEBLOCKS_ROOM_PREFIX = "bug-among-us:editor:";

const getLiveblocksRoomId = (roomId: string) =>
  `${LIVEBLOCKS_ROOM_PREFIX}${roomId}`;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return `rgba(245, 158, 11, ${alpha})`;
  }

  const int = Number.parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const buildRemoteSelectionStyles = (presences: EditorPresence[]) =>
  presences
    .map(
      ({ connectionId, color, name }) => `
        .yRemoteSelection-${connectionId} {
          background-color: ${hexToRgba(color, 0.22)};
          border-left: 2px solid ${color};
        }

        .yRemoteSelectionHead-${connectionId} {
          border-left: 2px solid ${color};
          position: relative;
        }

        .yRemoteSelectionHead-${connectionId}::after {
          content: ${JSON.stringify(name)};
          position: absolute;
          top: -1.5rem;
          left: -2px;
          padding: 0.15rem 0.4rem;
          border-radius: 0.25rem;
          background: ${color};
          color: #111827;
          font-size: 0.625rem;
          font-weight: 700;
          white-space: nowrap;
        }
      `,
    )
    .join("\n");

const syncRemoteAwarenessStates = (
  awareness: MutableAwareness,
  others: readonly {
    connectionId: number;
    presence: LiveblocksPresence;
  }[],
) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const added: number[] = [];
  const updated: number[] = [];
  const removed: number[] = [];
  const trackedRemoteIds = new Set<number>();

  for (const other of others) {
    const clientId = other.connectionId;

    if (clientId === awareness.clientID) {
      continue;
    }

    trackedRemoteIds.add(clientId);

    const nextState: AwarenessState = {
      user: {
        playerId: other.presence.playerId,
        name: other.presence.name,
        color: other.presence.color,
      },
      selection: other.presence.selection,
    };

    const previousState = awareness.states.get(clientId);
    const previousSerialized = previousState
      ? JSON.stringify(previousState)
      : null;
    const nextSerialized = JSON.stringify(nextState);

    awareness.states.set(clientId, nextState);
    awareness.meta.set(clientId, {
      clock: (awareness.meta.get(clientId)?.clock ?? 0) + 1,
      lastUpdated: timestamp,
    });

    if (!previousState) {
      added.push(clientId);
      continue;
    }

    if (previousSerialized !== nextSerialized) {
      updated.push(clientId);
    }
  }

  for (const clientId of awareness.states.keys()) {
    if (clientId === awareness.clientID || trackedRemoteIds.has(clientId)) {
      continue;
    }

    awareness.states.delete(clientId);
    awareness.meta.delete(clientId);
    removed.push(clientId);
  }

  if (added.length || updated.length || removed.length) {
    const payload = { added, updated, removed };
    awareness.emit("change", [payload, "liveblocks"]);
    awareness.emit("update", [payload, "liveblocks"]);
  }
};

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

export default function Page() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
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
  const liveblocksRoomRef = useRef<LiveblocksRoom | null>(null);
  const hasRedirected = useRef(false);
  const bindingRef = useRef<((editor: any) => void) | null>(null);
  const monacoBindingRef = useRef<{ destroy: () => void } | null>(null);
  const pendingYjsStateRef = useRef<Uint8Array | null>(null);
  const hasInitialYjsStateRef = useRef(false);
  const [ending, setEnding] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const [editorPresence, setEditorPresence] = useState<EditorPresence[]>([]);
  const authChecked = useRef(false);

  const initYjs = async (socket: Socket) => {
    const Y = await import("yjs");
    const { MonacoBinding } = await import("y-monaco");
    const { Awareness: YAwareness } = await import("y-protocols/awareness");

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const awareness = new YAwareness(ydoc);
    awarenessRef.current = awareness;

    const yText = ydoc.getText("monaco");
    const playerId = localStorage.getItem("playerId") || crypto.randomUUID();
    const playerName = localStorage.getItem("playerName") || "Anonymous";
    const liveblocksClient = createClient({
      authEndpoint: async (room) => {
        const response = await fetch("/api/liveblocks-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room,
            roomId,
            playerId,
            name: playerName,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to authenticate with Liveblocks");
        }

        return await response.json();
      },
    });
    const { room, leave } = liveblocksClient.enterRoom<LiveblocksPresence>(
      getLiveblocksRoomId(roomId),
      {
        initialPresence: {
          playerId,
          name: playerName,
          color: "#F59E0B",
          selection: null,
          isEditing: false,
          updatedAt: Date.now(),
        },
      },
    );
    liveblocksRoomRef.current = room;

    const handleIncomingUpdate = (update: number[]) => {
      const uint8 = new Uint8Array(update);
      Y.applyUpdate(ydoc, uint8);
    };

    socket.on("yjs-update", handleIncomingUpdate);

    const handleDocUpdate = (update: Uint8Array) => {
      socket.emit("yjs-update", {
        roomId,
        update: Array.from(update),
      });
    };

    ydoc.on("update", handleDocUpdate);

    awareness.setLocalStateField("user", {
      playerId,
      name: playerName,
      color: "#F59E0B",
    });

    const syncMyPresence = () => {
      const state = awareness.getLocalState() as AwarenessState | null;
      const selection = state?.selection ?? null;

      room.updatePresence({
        playerId,
        name: playerName,
        color: state?.user?.color || "#F59E0B",
        selection,
        isEditing: Boolean(selection),
        updatedAt: Date.now(),
      });
    };

    const handleAwarenessUpdate = ({
      added,
      updated,
    }: {
      added: number[];
      updated: number[];
      removed: number[];
    }) => {
      const localTouched = [...added, ...updated].includes(
        (awareness as MutableAwareness).clientID,
      );

      if (localTouched) {
        syncMyPresence();
      }
    };

    const refreshRemotePresence = () => {
      const others = room
        .getOthers()
        .map((other) => ({
          connectionId: other.connectionId,
          presence: other.presence,
        }))
        .filter((other) => other.presence.playerId);

      syncRemoteAwarenessStates(
        awareness as MutableAwareness,
        others,
      );
      setEditorPresence(
        others.map((other) => ({
          connectionId: other.connectionId,
          playerId: other.presence.playerId,
          name: other.presence.name,
          color: other.presence.color,
          isEditing: other.presence.isEditing,
        })),
      );
    };

    awareness.on("update", handleAwarenessUpdate);
    const unsubscribeOthers = room.subscribe("others", refreshRemotePresence);
    const presenceHeartbeat = window.setInterval(refreshRemotePresence, 10000);
    syncMyPresence();
    refreshRemotePresence();

    const bindEditor = (editor: any) => {
      const model = editor.getModel();
      if (!model) return;

      monacoBindingRef.current?.destroy();
      monacoBindingRef.current = new MonacoBinding(
        yText,
        model,
        new Set([editor]),
        awareness,
      );
    };

    bindingRef.current = bindEditor;

    if (pendingYjsStateRef.current) {
      Y.applyUpdate(ydoc, pendingYjsStateRef.current);
      pendingYjsStateRef.current = null;
      hasInitialYjsStateRef.current = true;
      setReady(true);
    }

    socket.emit("get-yjs-state", { roomId });

    return () => {
      socket.off("yjs-update", handleIncomingUpdate);
      awareness.off("update", handleAwarenessUpdate);
      unsubscribeOthers();
      window.clearInterval(presenceHeartbeat);
      monacoBindingRef.current?.destroy();
      monacoBindingRef.current = null;
      bindingRef.current = null;
      awareness.destroy();
      ydoc.destroy();
      awarenessRef.current = null;
      ydocRef.current = null;
      leave();
      liveblocksRoomRef.current = null;
      pendingYjsStateRef.current = null;
      hasInitialYjsStateRef.current = false;
      setEditorPresence([]);
      setReady(false);
    };
  };

  useEffect(() => {
    if (authChecked.current) return;
    authChecked.current = true;

    const allowedPhase = sessionStorage.getItem("allowed-phase");
    if (allowedPhase !== "gameplay") {
      if (allowedPhase === "lobby") {
        window.location.replace(`/game/${roomId}`);
        return;
      }
      if (allowedPhase === "vote" || allowedPhase === "discussion") {
        window.location.replace(`/game/${roomId}/${allowedPhase}`);
        return;
      }
      window.location.replace(`/game/${roomId}`);
      return;
    }

    setIsReady(true);
  }, [roomId]);

  useEffect(() => {
    if (!isReady) return;
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
      if (!data.state?.length) {
        if (!hasInitialYjsStateRef.current) {
          hasInitialYjsStateRef.current = true;
          setReady(true);
        }
        return;
      }

      const uint8 = new Uint8Array(data.state);

      if (ydocRef.current) {
        const Y = await import("yjs");
        Y.applyUpdate(ydocRef.current, uint8);
      } else {
        pendingYjsStateRef.current = uint8;
      }

      if (!hasInitialYjsStateRef.current) {
        hasInitialYjsStateRef.current = true;
        setReady(true);
      }
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
      async ({ phase }: { round: number; phase: string }) => {
        if (phase === "discussion") {
          setEnding(true);

          try {
            await fetch("/api/game/authorize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                roomId,
                phase: "discussion",
              }),
            });
            sessionStorage.setItem("allowed-phase", "discussion");
          } catch (e) {
            console.error("Failed to authorize:", e);
          }

          setTimeout(() => {
            hasRedirected.current = true;
            router.push(`/game/${roomId}/discussion`);
          }, 800);
        }
      },
    );

    socket.on("game-ended", async () => {
      setEnding(true);

      try {
        await fetch("/api/game/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            phase: "lobby",
            clear: true,
          }),
        });
      } catch (e) {
        console.error("Failed to clear auth:", e);
      }

      setTimeout(async () => {
        hasRedirected.current = true;
        router.push(`/`);
      }, 800);
    });

    socket.emit("join-room", {
      roomId,
      name: localStorage.getItem("playerName"),
      playerId: localStorage.getItem("playerId"),
    });

    let isDisposed = false;
    let disposeYjs: (() => void) | undefined;
    void initYjs(socket).then((cleanup) => {
      if (isDisposed) {
        cleanup();
        return;
      }
      disposeYjs = cleanup;
    });

    socket.emit("player-ready-gameplay", {
      roomId,
      playerId: localStorage.getItem("playerId"),
    });

    return () => {
      isDisposed = true;
      disposeYjs?.();
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, router, isReady]);

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

  useEffect(() => {
    const liveblocksRoom = liveblocksRoomRef.current;

    if (!liveblocksRoom) {
      return;
    }

    const currentPlayerId = localStorage.getItem("playerId");
    const currentPlayer = players.find((player) => player.id === currentPlayerId);

    if (!currentPlayer) {
      return;
    }

    awarenessRef.current?.setLocalStateField("user", {
      playerId: currentPlayer.id,
      name: currentPlayer.name,
      color: currentPlayer.color,
    });

    liveblocksRoom.updatePresence({
      playerId: currentPlayer.id,
      name: currentPlayer.name,
      color: currentPlayer.color,
      updatedAt: Date.now(),
    });
  }, [players]);

  if (!isReady) {
    return <div className="h-screen bg-black" />;
  }

  const presenceByPlayerId = new Map(
    editorPresence.map((presence) => [presence.playerId, presence]),
  );

  return (
    <div className="font-pixel flex flex-col h-screen bg-orange-100">
      <style>{buildRemoteSelectionStyles(editorPresence)}</style>
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
            <div key={p.id} className="border p-2 mb-2 text-sm flex items-center">
              <div
                className="w-3 h-3 border mr-2"
                style={{ backgroundColor: p.color }}
              ></div>
              <span>{p.name}</span>
              {presenceByPlayerId.get(p.id)?.isEditing && (
                <span className="ml-auto border border-black bg-white/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  editing
                </span>
              )}
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
                }}
              />
            )}
          </div>

          <div className="w-full flex items-center justify-center mt-2.5">
            <span
              className="border-black border p-2 bg-red-500 hover:bg-red-600 text-white cursor-pointer font-semibold"
              onClick={() => {
                socketRef.current?.emit("emergency-button", roomId);
              }}
            >
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
