"use client";
import { useEffect, useRef } from "react";
import { createArkanoidEngine } from "@/lib/games/arkanoid/engine";
import type { ArkanoidEngine } from "@/lib/games/arkanoid/types";
import type { GameCanvasProps } from "@/lib/games/registry";
export default function ArkanoidCanvas({
  onReady,
  onChange,
  onGameOver,
  skin,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArkanoidEngine | null>(null);
  // Skin inicial para crear el motor; los cambios posteriores van por setSkin.
  const skinRef = useRef(skin);
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
    skinRef.current = skin;
    engineRef.current?.setSkin(skin);
  }, [skin]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createArkanoidEngine(
      canvas,
      {
        onChange: (snapshot) => onChangeRef.current(snapshot),
        onGameOver: (finalScore) => onGameOverRef.current(finalScore),
      },
      skinRef.current,
    );
    engineRef.current = engine;
    onReadyRef.current(engine);
    engine.start();
    return () => {
      engineRef.current = null;
      engine.destroy();
    };
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
