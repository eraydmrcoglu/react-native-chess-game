import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, LayoutChangeEvent } from "react-native";
import { Chess, Square, Move } from "chess.js";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { FontAwesome5, Feather } from "@expo/vector-icons";
import { useSettings } from "../context/SettingsContext";

const MOVE_BEEP =
  "UklGRgAUAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAIAAAAP8m2+v/7/7r+//7m9+3+8vfp8fvw8v3z9f0AAv8MExweKjE7R0hKUEFaXGJtb3R2eXyBhoiMjpCUl5yfo6mrrK+ztre6wMPFyc3S1NXZ3d/g4uTm5+jq7O7w8fP1+Pn6+/8=";

const ICONS: Record<"p" | "r" | "n" | "b" | "q" | "k", any> = {
  p: "chess-pawn",
  r: "chess-rook",
  n: "chess-knight",
  b: "chess-bishop",
  q: "chess-queen",
  k: "chess-king",
};

export type BotColor = "w" | "b" | null;

type Props = {
  dark: boolean;
  sound: boolean;
  flip: boolean;
  viewAs?: "w" | "b";
  botColor?: BotColor;
  hintKey?: number;
  onNewGame?: () => void;
};

function pieceColors(isWhite: boolean, darkTheme: boolean) {
  return isWhite
    ? { fill: "#FFFFFF" }
    : { fill: darkTheme ? "#000000" : "#1F2937" };
}

const VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function evaluate(game: Chess): number {
  const board = game.board();
  let s = 0;

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const c = board[i][j];
      if (!c) continue;
      const sign = c.color === "w" ? 1 : -1;
      s += sign * (VAL[c.type] || 0);
      const dx = Math.abs(3.5 - j);
      const dy = Math.abs(3.5 - i);
      const center = 1.0 - Math.max(dx, dy) / 3.5;
      let weight = 0;
      if (c.type === "n" || c.type === "b") weight = 10;
      else if (c.type === "q") weight = 6;
      else if (c.type === "r") weight = 4;
      else if (c.type === "p") weight = 2;
      s += sign * Math.round(center * weight);
    }
  }

  if (game.inCheck()) s += (game.turn() === "w" ? -15 : 15);

  return s;
}

function orderMoves(moves: Move[]): Move[] {
  const score = (m: Move) => {
    const cap = (m as any).captured ? VAL[(m as any).captured] || 0 : 0;
    const promo = (m as any).promotion ? 800 : 0;
    const mover = VAL[(m as any).piece] || 0;
    return promo + cap * 10 - mover;
  };
  return moves.slice().sort((a, b) => score(b) - score(a));
}

const MATE_SCORE = 1_000_000;

function pickBestBySearch(root: Chess, who: "w" | "b", maxDepth = 3, nodeCap = 3000): Move | null {
  let nodes = 0;
  const game = new Chess(root.fen());

  function negamax(depth: number, alpha: number, beta: number): number {
    nodes++;
    if (nodes > nodeCap) return evaluate(game);
    if (depth === 0) return evaluate(game);

    const legal = game.moves({ verbose: true }) as Move[];
    if (legal.length === 0) {
      if (game.inCheck()) return -MATE_SCORE + depth;
      return 0;
    }

    let value = -Infinity;
    const ordered = orderMoves(legal);

    for (const m of ordered) {
      game.move({ from: (m as any).from, to: (m as any).to, promotion: "q" });
      const score = -negamax(depth - 1, -beta, -alpha);
      game.undo();

      if (score > value) value = score;
      if (value > alpha) alpha = value;
      if (alpha >= beta) break;
    }
    return value;
  }

  const moves = orderMoves(root.moves({ verbose: true }) as Move[]);
  if (!moves.length) return null;

  let best: Move | null = null;
  let bestScore = -Infinity;
  const sideFactor = who === "w" ? 1 : -1;

  for (const m of moves) {
    game.move({ from: (m as any).from, to: (m as any).to, promotion: "q" });
    const score = -negamax(maxDepth - 1, -Infinity, Infinity) * sideFactor;
    game.undo();

    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

function isMoveSafeQuick(base: Chess, m: Move, playedBy: "w" | "b"): boolean {
  const g = new Chess(base.fen());
  const from = (m as any).from;
  const to = (m as any).to;
  const movedType = (m as any).piece as keyof typeof VAL;
  const capturedType = (m as any).captured as keyof typeof VAL | undefined;

  g.move({ from, to, promotion: "q" });

  const oppMoves = g.moves({ verbose: true }) as Move[];
  const attackers = oppMoves.filter((mm) => (mm as any).to === to);

  if (attackers.length === 0) return true;

  const minAttackerCost = Math.min(
    ...attackers.map((mm) => VAL[(mm as any).piece as keyof typeof VAL] || 0)
  );

  const ourPieceValue = VAL[movedType] || 0;
  const gainWeAlreadyMade = capturedType ? (VAL[capturedType] || 0) : 0;

  const net = gainWeAlreadyMade - (ourPieceValue - minAttackerCost);
  return net >= 0;
}

function developmentBonus(m: Move): number {
  const piece = (m as any).piece as string;
  const from = (m as any).from as string;
  const to = (m as any).to as string;

  const semiCenter = new Set([
    "c3","d3","e3","f3","c4","d4","e4","f4",
    "c5","d5","e5","f5","c6","d6","e6","f6",
  ]);
  let bonus = 0;
  if (piece === "n" || piece === "b") {
    if (/^[bg][18]$/.test(from)) bonus += 8;
    if (semiCenter.has(to)) bonus += 6;
  }
  if (piece === "p") {
    if (["d4","e4","d5","e5"].includes(to)) bonus += 5;
    if (["c4","f4","c5","f5"].includes(to)) bonus += 3;
  }
  if (piece === "k" && (to === "g1" || to === "g8")) bonus += 10;
  return bonus;
}

function pickSmartHintMove(base: Chess, color: "w" | "b"): Move | null {
  const moves = base.moves({ verbose: true }) as Move[];
  if (!moves.length) return null;

  for (const m of moves) {
    const g = new Chess(base.fen());
    g.move({ from: (m as any).from, to: (m as any).to, promotion: "q" });
    if (g.isCheckmate()) return m;
  }

  const safeChecks: Array<{ m: Move; score: number }> = [];
  for (const m of moves) {
    const g = new Chess(base.fen());
    g.move({ from: (m as any).from, to: (m as any).to, promotion: "q" });
    if (g.inCheck() && isMoveSafeQuick(base, m, color)) {
      safeChecks.push({ m, score: 20 + developmentBonus(m) });
    }
  }
  if (safeChecks.length) {
    safeChecks.sort((a, b) => b.score - a.score);
    return safeChecks[0].m;
  }

  const goodCaps: Array<{ m: Move; score: number }> = [];
  for (const m of moves) {
    const cap = (m as any).captured as keyof typeof VAL | undefined;
    if (!cap) continue;
    const gain = (VAL[cap] || 0) - (VAL[(m as any).piece as keyof typeof VAL] || 0);
    if (gain >= 0 && isMoveSafeQuick(base, m, color)) {
      goodCaps.push({ m, score: 50 + gain + developmentBonus(m) });
    }
  }
  if (goodCaps.length) {
    goodCaps.sort((a, b) => b.score - a.score);
    const top = goodCaps.slice(0, Math.min(3, goodCaps.length));
    return top[(Math.random() * top.length) | 0].m;
  }

  const quiet: Array<{ m: Move; score: number }> = [];
  for (const m of moves) {
    if (!isMoveSafeQuick(base, m, color)) continue;
    let s = developmentBonus(m);
    const to = (m as any).to as string;
    if (["d4", "e4", "d5", "e5"].includes(to)) s += 4;
    quiet.push({ m, score: s });
  }
  if (quiet.length) {
    const jitterSeed = (base.history().length % 7) + 1;
    quiet.sort(
      (a, b) => b.score + Math.random() * jitterSeed - (a.score + Math.random() * jitterSeed)
    );
    const top = quiet.slice(0, Math.min(4, quiet.length));
    return top[(Math.random() * top.length) | 0].m;
  }

  const fallbacks = moves.filter((m) => isMoveSafeQuick(base, m, color));
  if (fallbacks.length) return fallbacks[(Math.random() * fallbacks.length) | 0];

  return moves[(Math.random() * moves.length) | 0];
}

export default function ChessBoard({
  dark,
  sound,
  flip,
  viewAs,
  botColor,
  hintKey,
  onNewGame,
}: Props) {
  const { showCoords, largePieces, strongBot, haptics } = useSettings();

  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [hint, setHint] = useState<{ from: Square; to: Square } | null>(null);

  const [boardPx, setBoardPx] = useState(320);
  const soundRef = useRef<Audio.Sound | null>(null);

  const squareSize = Math.floor(boardPx / 8);
  const PIECE_SCALE = largePieces ? 0.8 : 0.58;
  const pieceSize = Math.max(18, Math.floor(squareSize * PIECE_SCALE));

  function onContainerLayout(e: LayoutChangeEvent) {
    const aw = Math.round(e.nativeEvent.layout.width);
    let b = Math.min(640, Math.round(aw * 0.95));
    const label = showCoords ? Math.max(18, Math.round(b * 0.08)) : 0;
    if (b + label > aw) b = Math.max(120, aw - label);
    setBoardPx(b);
  }

  useEffect(() => {
    (async () => {
      try {
        const s = new Audio.Sound();
        await s.loadAsync({ uri: `data:audio/wav;base64,${MOVE_BEEP}` });
        soundRef.current = s;
      } catch {}
    })();
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  async function feedback() {
    if (sound) {
      try {
        await soundRef.current?.replayAsync();
      } catch {}
    }
    if (haptics) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  }

  const orientation: "w" | "b" = flip ? (game.turn() as "w" | "b") : (viewAs ?? "w");

  const board = useMemo(() => {
    const raw = game.board();
    return orientation === "w" ? raw : raw.slice().reverse().map((r) => r.slice().reverse());
  }, [game, orientation]);

  const files = orientation === "w"
    ? ["a", "b", "c", "d", "e", "f", "g", "h"]
    : ["h", "g", "f", "e", "d", "c", "b", "a"];
  const ranks = orientation === "w" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];

  const sqAt = (i: number, j: number) => `${files[j]}${ranks[i]}` as Square;

  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    try {
      return new Set(game.moves({ square: selected, verbose: true }).map((m: any) => m.to));
    } catch {
      return new Set<string>();
    }
  }, [game, selected]);

  const onSquarePress = async (sq: Square) => {
    if (botColor && game.turn() === botColor) return;

    const piece = game.get(sq);
    if (!selected) {
      if (piece && piece.color === game.turn()) setSelected(sq);
      return;
    }
    if (piece && piece.color === game.turn()) {
      setSelected(sq);
      return;
    }

    const mv = game.move({ from: selected, to: sq, promotion: "q" });
    if (mv) {
      setSelected(null);
      setGame(new Chess(game.fen()));
      setHint(null);
      await feedback();
    } else {
      setSelected(null);
    }
  };

  useEffect(() => {
    if (!botColor || game.turn() !== botColor) return;
    if (game.isGameOver()) return;

    const t = setTimeout(() => {
      try {
        let chosen: Move | null = null;
        if (strongBot) {
          chosen = pickBestBySearch(game, botColor, 3, 3000);
        } else {
          const moves = game.moves({ verbose: true }) as any[];
          const promos = moves.filter((m: any) => !!m.promotion);
          const caps = moves.filter((m: any) => !!m.captured);
          chosen =
            promos[0] ??
            caps[0] ??
            (moves.length ? moves[(Math.random() * moves.length) | 0] : null);
        }
        if (!chosen) return;
        game.move({ from: (chosen as any).from, to: (chosen as any).to, promotion: "q" });
        setGame(new Chess(game.fen()));
        setHint(null);
        feedback();
      } catch {}
    }, 100);

    return () => clearTimeout(t);
  }, [game, botColor, strongBot]);

  const skipFirstHintRef = useRef(true);

  useEffect(() => {
    if (hintKey == null) return;
    if (skipFirstHintRef.current) {
      skipFirstHintRef.current = false;
      return;
    }
    if (botColor && game.turn() === botColor) {
      setHint(null);
      return;
    }
    if (game.isGameOver()) {
      setHint(null);
      return;
    }

    try {
      const turn = game.turn() as "w" | "b";
      const best = pickSmartHintMove(game, turn);
      if (best) setHint({ from: (best as any).from, to: (best as any).to });
      else setHint(null);
    } catch {
      setHint(null);
    }
  }, [hintKey]);

  function newGame() {
    setGame(new Chess());
    setSelected(null);
    setHint(null);
    skipFirstHintRef.current = true;
    onNewGame?.();
  }
  function undo() {
    if (botColor) {
      game.undo();
      game.undo();
    } else {
      game.undo();
    }
    setGame(new Chess(game.fen()));
    setSelected(null);
    setHint(null);
  }

  const light = dark ? "#C7DBB6" : "#EAEFD2";
  const darkSq = dark ? "#5E8F59" : "#7AA664";
  const hi = dark ? "#25A36F" : "#83D0A6";
  const dot = dark ? "#E6EDF3" : "#0F172A";
  const textColor = dark ? "#E6EDF3" : "#0F172A";
  const hintFrameColor = dark ? "#FBBF24" : "#D97706";
  const hintDotColor = dark ? "#FCD34D" : "#F59E0B";

  const labelW = showCoords ? Math.max(18, Math.round(boardPx * 0.08)) : 0;

  return (
    <View className="w-full items-center">
      <View
        className={`w-full rounded-xl2 p-4 ${dark ? "bg-surfaceDark" : "bg-surfaceLight"} shadow-card mb-6`}
      >
        <View className="flex-row items-center justify-between">
          <Text style={{ color: textColor, fontWeight: "700" }}>
            {game.turn() === "w" ? "White to move" : "Black to move"}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={undo}
              className="px-3 py-2 rounded-xl items-center flex-row"
              style={{ backgroundColor: "#2A2F39" }}
            >
              <Feather name="corner-up-left" size={18} color="#fff" />
              <Text className="text-white font-semibold ml-1">Undo</Text>
            </Pressable>
            <Pressable
              onPress={newGame}
              className="px-3 py-2 rounded-xl items-center flex-row"
              style={{ backgroundColor: "#C6906D" }}
            >
              <Feather name="refresh-ccw" size={18} color="#fff" />
              <Text className="text-white font-semibold ml-1">New</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View onLayout={onContainerLayout} style={{ width: "100%" }}>
        <View style={{ flexDirection: "row", alignItems: "stretch", justifyContent: "center" }}>
          {showCoords && (
            <View
              style={{
                width: labelW,
                paddingVertical: Math.max(8, Math.round(boardPx * 0.04)),
                justifyContent: "space-between",
              }}
              pointerEvents="none"
            >
              {ranks.map((r, idx) => (
                <Text
                  key={idx}
                  style={{
                    color: textColor,
                    opacity: 0.8,
                    fontWeight: "600",
                    fontSize: Math.max(10, Math.round(boardPx * 0.12) / 4),
                    textAlign: "center",
                  }}
                >
                  {r}
                </Text>
              ))}
            </View>
          )}

          <View
            className="rounded-xl2 overflow-hidden shadow-card"
            style={{
              width: boardPx,
              height: boardPx,
              backgroundColor: dark ? "#151B23" : "#FFFFFF",
            }}
          >
            {board.map((row, i) => (
              <View key={i} style={{ flex: 1, flexDirection: "row" }}>
                {row.map((cell, j) => {
                  const sq = sqAt(i, j);
                  const isLight = (i + j) % 2 === 0;
                  const isSel = selected === sq;
                  const isTarget = legalTargets.has(sq);
                  const iconName = cell ? ICONS[cell.type as keyof typeof ICONS] : null;

                  return (
                    <Pressable
                      key={j}
                      onPress={() => onSquarePress(sq)}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isLight ? light : darkSq,
                      }}
                    >
                      {iconName && (
                        <FontAwesome5
                          name={iconName}
                          size={pieceSize}
                          color={pieceColors(cell!.color === "w", dark).fill}
                          solid
                        />
                      )}

                      {isTarget && (
                        <View
                          style={{
                            width: Math.max(12, squareSize * 0.35),
                            height: Math.max(12, squareSize * 0.35),
                            borderRadius: 999,
                            backgroundColor: dot,
                            opacity: 0.7,
                            borderWidth: 2,
                            borderColor: dark ? "#FFFFFF" : "#000000",
                          }}
                        />
                      )}

                      {isSel && (
                        <View
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            right: 0,
                            bottom: 0,
                            borderWidth: Math.max(2, squareSize * 0.06),
                            borderColor: hi,
                          }}
                        />
                      )}

                      {hint?.from === sq && (
                        <View
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            right: 0,
                            bottom: 0,
                            borderWidth: Math.max(3, squareSize * 0.08),
                            borderColor: hintFrameColor,
                          }}
                        />
                      )}
                      {hint?.to === sq && (
                        <View
                          style={{
                            width: Math.max(14, squareSize * 0.4),
                            height: Math.max(14, squareSize * 0.4),
                            borderRadius: 999,
                            backgroundColor: hintDotColor,
                            opacity: 0.85,
                          }}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          {showCoords && <View style={{ width: labelW }} />}
        </View>

        {showCoords && (
          <View
            style={{
              marginLeft: labelW,
              width: boardPx,
              flexDirection: "row",
              paddingTop: Math.max(6, Math.round(boardPx * 0.03)),
            }}
            pointerEvents="none"
          >
            {files.map((f, idx) => (
              <View key={idx} style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    color: textColor,
                    opacity: 0.8,
                    fontWeight: "600",
                    fontSize: Math.max(10, Math.round(boardPx * 0.12) / 3.5),
                    textAlign: "center",
                  }}
                >
                  {f}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
