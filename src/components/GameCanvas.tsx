import { useEffect, useRef } from 'react';
import {
  activateShield,
  clampDeltaTime,
  clampPlayerPosition,
  computeAimAngle,
  createInitialPlayerState,
  createParticlePool,
  createStageWaveState,
  DEFAULT_AIM_ANGLE,
  generateCitySkyline,
  generateClouds,
  getShieldSnapshot,
  getStationaryHeroGeometry,
  resolveCombatCollisions,
  screenToCanvasCoords,
  spawnBurstParticles,
  stepAmbientWorld,
  stepEnemies,
  stepEnemyProjectiles,
  stepEnemySpawning,
  stepParticles,
  stepPlayerMovement,
  stepProjectiles,
  stepShieldState,
  stepShooting,
  stepStageProgression,
} from '../game/engine';
import { renderSkyguardScene, renderStaticBackdrop } from '../game/renderer';
import type {
  CloudSpec,
  Enemy,
  EnemyProjectile,
  GameOutcome,
  GameState,
  MovementInput,
  PlayerState,
  Projectile,
  ShieldStatus,
  StageWaveState,
} from '../game/types';

interface GameCanvasProps {
  gameState: GameState;
  initialStage: number;
  runId: number;
  onLivesChange: (lives: number) => void;
  onStageChange: (stage: number) => void;
  onShieldChange: (status: ShieldStatus, timeRemaining: number) => void;
  onStageClearedBannerChange: (clearedStage: number | null) => void;
  onRunEnd: (outcome: GameOutcome, stageReached: number, defeated: number) => void;
}

export function GameCanvas({
  gameState,
  initialStage,
  runId,
  onLivesChange,
  onStageChange,
  onShieldChange,
  onStageClearedBannerChange,
  onRunEnd,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const prevGameStateRef = useRef<GameState>(gameState);
  const initialStageRef = useRef<number>(initialStage);
  const runIdRef = useRef<number>(runId);
  const prevRunIdRef = useRef<number>(runId);

  const callbacksRef = useRef({
    onLivesChange,
    onStageChange,
    onShieldChange,
    onStageClearedBannerChange,
    onRunEnd,
  });

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    initialStageRef.current = initialStage;
  }, [initialStage]);

  useEffect(() => {
    runIdRef.current = runId;
  }, [runId]);

  useEffect(() => {
    callbacksRef.current = {
      onLivesChange,
      onStageChange,
      onShieldChange,
      onStageClearedBannerChange,
      onRunEnd,
    };
  }, [
    onLivesChange,
    onStageChange,
    onShieldChange,
    onStageClearedBannerChange,
    onRunEnd,
  ]);

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
    const enemies: Enemy[] = [];
    const enemyProjectiles: EnemyProjectile[] = [];
    const particles = createParticlePool(96);
    const particleCursorRef = { current: 0 };
    const nextEnemyIdRef = { current: 1 };
    let wave: StageWaveState = createStageWaveState(initialStageRef.current);
    let enemiesDefeated = 0;
    let lastReportedLives = player.lives;
    let lastReportedStage = wave.stage;
    let lastReportedBanner: number | null = null;
    let lastReportedShieldStatus: ShieldStatus = 'READY';
    let lastReportedShieldTime = 0;

    const keysHeld = new Set<string>();
    let mouseDown = false;
    let hasCursor = false;
    let cursorX = width * 0.5;
    let cursorY = height * 0.25;

    const clearHeldInputs = () => {
      keysHeld.clear();
      mouseDown = false;
    };

    const resetRunSimulation = () => {
      player = createInitialPlayerState(width, height);
      projectiles.length = 0;
      enemies.length = 0;
      enemyProjectiles.length = 0;
      for (let i = 0; i < particles.length; i += 1) {
        particles[i].active = false;
      }
      wave = createStageWaveState(initialStageRef.current);
      enemiesDefeated = 0;
      clearHeldInputs();

      if (lastReportedLives !== player.lives) {
        lastReportedLives = player.lives;
        callbacksRef.current.onLivesChange(player.lives);
      }
      if (lastReportedStage !== wave.stage) {
        lastReportedStage = wave.stage;
        callbacksRef.current.onStageChange(wave.stage);
      }
      if (lastReportedBanner !== null) {
        lastReportedBanner = null;
        callbacksRef.current.onStageClearedBannerChange(null);
      }
      if (lastReportedShieldStatus !== 'READY' || lastReportedShieldTime !== 0) {
        lastReportedShieldStatus = 'READY';
        lastReportedShieldTime = 0;
        callbacksRef.current.onShieldChange('READY', 0);
      }
    };

    const readMovementInput = (): MovementInput => ({
      up: keysHeld.has('KeyW') || keysHeld.has('ArrowUp'),
      down: keysHeld.has('KeyS') || keysHeld.has('ArrowDown'),
      left: keysHeld.has('KeyA') || keysHeld.has('ArrowLeft'),
      right: keysHeld.has('KeyD') || keysHeld.has('ArrowRight'),
    });

    let needsRender = true;

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
      needsRender = true;
    };

    resizeCanvas();

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(container);

    const onKeyDown = (event: KeyboardEvent) => {
      if (gameStateRef.current === 'playing') {
        if (
          event.code === 'ArrowUp' ||
          event.code === 'ArrowDown' ||
          event.code === 'ArrowLeft' ||
          event.code === 'ArrowRight' ||
          event.code === 'Space'
        ) {
          event.preventDefault();
        }
        if (event.code === 'Space' && !event.repeat) {
          activateShield(player);
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
      const currentRunId = runIdRef.current;

      if (currentRunId !== prevRunIdRef.current) {
        prevRunIdRef.current = currentRunId;
        resetRunSimulation();
        needsRender = true;
      }

      if (currentState !== prevState) {
        if (currentState === 'title') {
          resetRunSimulation();
        } else if (currentState === 'paused' || currentState === 'gameover') {
          clearHeldInputs();
        } else if (currentState === 'playing' && prevState === 'title') {
          resetRunSimulation();
        }
        prevGameStateRef.current = currentState;
        needsRender = true;
      }

      let hasActiveParticles = false;
      for (let i = 0; i < particles.length; i += 1) {
        if (particles[i].active) {
          hasActiveParticles = true;
          break;
        }
      }

      if (currentState === 'title' || currentState === 'playing') {
        elapsedTime = stepAmbientWorld(elapsedTime, dt, clouds, width);
        stepParticles(particles, dt);
        needsRender = true;
      } else if (currentState === 'gameover' && hasActiveParticles) {
        stepParticles(particles, dt);
        needsRender = true;
      }

      if (currentState === 'playing') {
        stepPlayerMovement(player, readMovementInput(), dt, width, height);
        stepShieldState(player, dt);

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

        stepEnemySpawning(
          wave,
          enemies,
          dt,
          width,
          height,
          nextEnemyIdRef,
          player.x,
          player.y
        );
        stepEnemies(
          enemies,
          enemyProjectiles,
          player.x,
          player.y,
          dt,
          width,
          height
        );
        stepEnemyProjectiles(enemyProjectiles, dt, width, height);

        const combat = resolveCombatCollisions(
          player,
          projectiles,
          enemies,
          enemyProjectiles,
          (px, py, color) =>
            spawnBurstParticles(particles, particleCursorRef, px, py, color, 10)
        );
        enemiesDefeated += combat.enemiesDestroyed;

        const shieldSnap = getShieldSnapshot(player);
        if (
          shieldSnap.status !== lastReportedShieldStatus ||
          shieldSnap.timeRemaining !== lastReportedShieldTime
        ) {
          lastReportedShieldStatus = shieldSnap.status;
          lastReportedShieldTime = shieldSnap.timeRemaining;
          callbacksRef.current.onShieldChange(
            shieldSnap.status,
            shieldSnap.timeRemaining
          );
        }

        if (player.lives !== lastReportedLives) {
          lastReportedLives = player.lives;
          callbacksRef.current.onLivesChange(player.lives);
        }

        if (combat.gameOver) {
          clearHeldInputs();
          if (lastReportedBanner !== null) {
            lastReportedBanner = null;
            callbacksRef.current.onStageClearedBannerChange(null);
          }
          callbacksRef.current.onRunEnd('defeat', wave.stage, enemiesDefeated);
        } else {
          const stageEvent = stepStageProgression(wave, enemies, dt);
          if (stageEvent.type === 'stage_cleared') {
            lastReportedBanner = stageEvent.clearedStage;
            callbacksRef.current.onStageClearedBannerChange(
              stageEvent.clearedStage
            );
          } else if (stageEvent.type === 'stage_started') {
            lastReportedBanner = null;
            callbacksRef.current.onStageClearedBannerChange(null);
            if (lastReportedStage !== stageEvent.nextStage) {
              lastReportedStage = stageEvent.nextStage;
              callbacksRef.current.onStageChange(stageEvent.nextStage);
            }
          } else if (stageEvent.type === 'all_stages_cleared') {
            clearHeldInputs();
            lastReportedBanner = null;
            callbacksRef.current.onStageClearedBannerChange(null);
            callbacksRef.current.onRunEnd('victory', wave.stage, enemiesDefeated);
          }
        }
      }

      const heroXStr = String(Math.round(player.x));
      const heroYStr = String(Math.round(player.y));
      const aimStr = player.aimAngle.toFixed(2);
      const projStr = String(projectiles.length);
      const enemyProjStr = String(enemyProjectiles.length);
      const enemyStr = String(enemies.length);
      const queueStr = String(wave.spawnQueue.length);
      const livesStr = String(player.lives);
      const stageStr = String(wave.stage);
      const shieldSnapNow = getShieldSnapshot(player);
      const shieldStatusStr = shieldSnapNow.status;

      if (canvas.dataset.heroX !== heroXStr) canvas.dataset.heroX = heroXStr;
      if (canvas.dataset.heroY !== heroYStr) canvas.dataset.heroY = heroYStr;
      if (canvas.dataset.aimAngle !== aimStr) canvas.dataset.aimAngle = aimStr;
      if (canvas.dataset.projectiles !== projStr) canvas.dataset.projectiles = projStr;
      if (canvas.dataset.enemyProjectiles !== enemyProjStr)
        canvas.dataset.enemyProjectiles = enemyProjStr;
      if (canvas.dataset.enemies !== enemyStr) canvas.dataset.enemies = enemyStr;
      if (canvas.dataset.spawnQueue !== queueStr) canvas.dataset.spawnQueue = queueStr;
      if (canvas.dataset.lives !== livesStr) canvas.dataset.lives = livesStr;
      if (canvas.dataset.stage !== stageStr) canvas.dataset.stage = stageStr;
      if (canvas.dataset.shieldStatus !== shieldStatusStr)
        canvas.dataset.shieldStatus = shieldStatusStr;

      if (needsRender) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderSkyguardScene(ctx, {
          width,
          height,
          elapsedTime,
          clouds,
          backdropCanvas,
          player,
          projectiles,
          enemies,
          enemyProjectiles,
          particles,
        });
        needsRender = false;
      }

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
