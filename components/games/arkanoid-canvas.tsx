"use client";
import { useEffect, useRef } from "react";
import { createArkanoidEngine } from "@/lib/games/arkanoid/engine";
import type { GameCanvasProps } from "@/lib/games/registry";
export default function ArkanoidCanvas({
  onReady,
  onChange,
  onGameOver,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Los callbacks viven en refs para no recrear el motor si cambian.
  const onReadyRef = useRef(onReady);
  const onChangeRef = useRef(onChange);
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onReadyRef.current = onReady;
    onChangeRef.current = onChange;
    onGameOverRef.current = onGameOver;
  }, [onReady, onChange, onGameOver]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createArkanoidEngine(canvas, {
      onChange: (snapshot) => onChangeRef.current(snapshot),
      onGameOver: (finalScore) => onGameOverRef.current(finalScore),
    });
    onReadyRef.current(engine);
    engine.start();
    return () => engine.destroy();
  }, []);
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      aria-label="Arkanoid: área de juego"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
