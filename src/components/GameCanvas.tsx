import { useEffect, useRef } from 'react';
import {
  clampDeltaTime,
  generateCitySkyline,
  generateClouds,
  stepAmbientWorld,
} from '../game/engine';
import { renderSkyguardScene, renderStaticBackdrop } from '../game/renderer';
import type { CloudSpec, GameState } from '../game/types';

interface GameCanvasProps {
  gameState: GameState;
}

export function GameCanvas({ gameState }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      return;
    }

    const backdropCanvas = document.createElement('canvas');
    const backdropCtx = backdropCanvas.getContext('2d', { alpha: false });
    if (!backdropCtx) {
      return;
    }

    let width = Math.max(320, container.clientWidth);
    let height = Math.max(320, container.clientHeight);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    let clouds: CloudSpec[] = generateClouds(width, height);
    let elapsedTime = 0;

    const resizeCanvas = () => {
      width = Math.max(320, container.clientWidth);
      height = Math.max(320, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      const pixelW = Math.round(width * dpr);
      const pixelH = Math.round(height * dpr);

      canvas.width = pixelW;
      canvas.height = pixelH;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      backdropCanvas.width = pixelW;
      backdropCanvas.height = pixelH;
      backdropCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const skyline = generateCitySkyline(width);
      renderStaticBackdrop(backdropCtx, { width, height, skyline });

      clouds = generateClouds(width, height);
    };

    resizeCanvas();

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(container);

    let animationFrameId = 0;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const rawDeltaMs = now - lastTimestamp;
      lastTimestamp = now;
      const dt = clampDeltaTime(rawDeltaMs);

      if (gameStateRef.current !== 'paused') {
        elapsedTime = stepAmbientWorld(elapsedTime, dt, clouds, width);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderSkyguardScene(ctx, {
        width,
        height,
        elapsedTime,
        clouds,
        backdropCanvas,
      });

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 h-full w-full overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        data-testid="skyguard-canvas"
        aria-label="SKYGUARD game canvas"
        className="block h-full w-full"
      />
    </div>
  );
}
