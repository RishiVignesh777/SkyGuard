import { useEffect, useRef } from 'react';
import {
  clampDeltaTime,
  clampPlayerPosition,
  computeAimAngle,
  createInitialPlayerState,
  DEFAULT_AIM_ANGLE,
  generateCitySkyline,
  generateClouds,
  getStationaryHeroGeometry,
  screenToCanvasCoords,
  stepAmbientWorld,
  stepPlayerMovement,
  stepProjectiles,
  stepShooting,
} from '../game/engine';
import { renderSkyguardScene, renderStaticBackdrop } from '../game/renderer';
import type {
  CloudSpec,
  GameState,
  MovementInput,
  PlayerState,
  Projectile,
} from '../game/types';

interface GameCanvasProps {
  gameState: GameState;
}

export function GameCanvas({ gameState }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const prevGameStateRef = useRef<GameState>(gameState);

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

    let player: PlayerState = createInitialPlayerState(width, height);
    const projectiles: Projectile[] = [];

    const keysHeld = new Set<string>();
    let mouseDown = false;
    let hasCursor = false;
    let cursorX = width * 0.5;
    let cursorY = height * 0.25;

    const clearHeldInputs = () => {
      keysHeld.clear();
      mouseDown = false;
    };

    const readMovementInput = (): MovementInput => ({
      up: keysHeld.has('KeyW') || keysHeld.has('ArrowUp'),
      down: keysHeld.has('KeyS') || keysHeld.has('ArrowDown'),
      left: keysHeld.has('KeyA') || keysHeld.has('ArrowLeft'),
      right: keysHeld.has('KeyD') || keysHeld.has('ArrowRight'),
    });

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

      const resizedHero = getStationaryHeroGeometry(width, height);
      player.radius = resizedHero.radius;
      if (gameStateRef.current === 'title') {
        player.x = resizedHero.x;
        player.y = resizedHero.y;
      } else {
        clampPlayerPosition(player, width, height);
      }
    };

    resizeCanvas();

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(container);

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.code === 'ArrowUp' ||
        event.code === 'ArrowDown' ||
        event.code === 'ArrowLeft' ||
        event.code === 'ArrowRight'
      ) {
        if (gameStateRef.current === 'playing') {
          event.preventDefault();
        }
      }
      keysHeld.add(event.code);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysHeld.delete(event.code);
    };

    const updateCursorFromMouse = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const coords = screenToCanvasCoords(
        event.clientX,
        event.clientY,
        rect,
        width,
        height
      );
      cursorX = coords.x;
      cursorY = coords.y;
      hasCursor = true;
    };

    const onMouseMove = (event: MouseEvent) => {
      updateCursorFromMouse(event);
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) {
        return;
      }
      if (gameStateRef.current !== 'playing') {
        return;
      }
      updateCursorFromMouse(event);
      mouseDown = true;
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 0) {
        mouseDown = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearHeldInputs();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', clearHeldInputs);
    document.addEventListener('visibilitychange', onVisibilityChange);

    let animationFrameId = 0;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const rawDeltaMs = now - lastTimestamp;
      lastTimestamp = now;
      const dt = clampDeltaTime(rawDeltaMs);

      const currentState = gameStateRef.current;
      const prevState = prevGameStateRef.current;

      if (currentState !== prevState) {
        if (currentState === 'title') {
          player = createInitialPlayerState(width, height);
          projectiles.length = 0;
          clearHeldInputs();
        } else if (currentState === 'paused') {
          clearHeldInputs();
        } else if (currentState === 'playing' && prevState === 'title') {
          player = createInitialPlayerState(width, height);
          projectiles.length = 0;
          clearHeldInputs();
        }
        prevGameStateRef.current = currentState;
      }

      if (currentState !== 'paused') {
        elapsedTime = stepAmbientWorld(elapsedTime, dt, clouds, width);
      }

      if (currentState === 'playing') {
        stepPlayerMovement(player, readMovementInput(), dt, width, height);

        if (hasCursor) {
          player.aimAngle = computeAimAngle(
            player.x,
            player.y,
            cursorX,
            cursorY,
            player.aimAngle
          );
        } else {
          player.aimAngle = DEFAULT_AIM_ANGLE;
        }

        stepShooting(player, mouseDown, dt, projectiles);
        stepProjectiles(projectiles, dt, width, height);
      }

      const heroXStr = String(Math.round(player.x));
      const heroYStr = String(Math.round(player.y));
      const aimStr = player.aimAngle.toFixed(2);
      const projStr = String(projectiles.length);

      if (canvas.dataset.heroX !== heroXStr) canvas.dataset.heroX = heroXStr;
      if (canvas.dataset.heroY !== heroYStr) canvas.dataset.heroY = heroYStr;
      if (canvas.dataset.aimAngle !== aimStr) canvas.dataset.aimAngle = aimStr;
      if (canvas.dataset.projectiles !== projStr) canvas.dataset.projectiles = projStr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderSkyguardScene(ctx, {
        width,
        height,
        elapsedTime,
        clouds,
        backdropCanvas,
        player,
        projectiles,
      });

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', clearHeldInputs);
      document.removeEventListener('visibilitychange', onVisibilityChange);
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
        className="block h-full w-full cursor-crosshair"
      />
    </div>
  );
}
