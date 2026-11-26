import { useEffect, useRef } from 'react';
import {
  activateShield,
  clampDeltaTime,
  clampPlayerPosition,
  computeAimAngle,
  createFinalBoss,
  createInitialPlayerState,
  createParticlePool,
  createStageWaveState,
  DEFAULT_AIM_ANGLE,
  generateCitySkyline,
  generateClouds,
  getShieldSnapshot,
  getStationaryHeroGeometry,
  isLowLifeWarningActive,
  resolveCombatCollisions,
  screenToCanvasCoords,
  spawnBurstParticles,
  stepAmbientWorld,
  stepBoss,
  stepEnemies,
  stepEnemyProjectiles,
  stepEnemySpawning,
  stepParticles,
  stepPlayerMovement,
  stepProjectiles,
  stepShieldState,
  stepShooting,
  stepStageProgression,
  TOTAL_STAGES,
} from '../game/engine';
import { renderSkyguardScene, renderStaticBackdrop } from '../game/renderer';
import type {
  BossEnemy,
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
  startStage: number;
  startBossMode: boolean;
  runId: number;
  onLivesChange: (lives: number) => void;
  onStageChange: (stage: number) => void;
  onScoreChange: (score: number) => void;
  onShieldChange: (status: ShieldStatus, timeRemaining: number) => void;
  onBannerMessageChange: (message: string | null) => void;
  onBossChange: (boss: { hp: number; maxHp: number } | null) => void;
  onRunEnd: (
    outcome: GameOutcome,
    stageReached: number,
    defeated: number,
    score: number
  ) => void;
}

export function GameCanvas({
  gameState,
  startStage,
  startBossMode,
  runId,
  onLivesChange,
  onStageChange,
  onScoreChange,
  onShieldChange,
  onBannerMessageChange,
  onBossChange,
  onRunEnd,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const prevGameStateRef = useRef<GameState>(gameState);
  const startStageRef = useRef<number>(startStage);
  const startBossModeRef = useRef<boolean>(startBossMode);
  const runIdRef = useRef<number>(runId);
  const prevRunIdRef = useRef<number>(runId);

  // Sync scalar props directly so rAF immediately sees updated values on runId increment
  startStageRef.current = startStage;
  startBossModeRef.current = startBossMode;
  runIdRef.current = runId;

  const callbacksRef = useRef({
    onLivesChange,
    onStageChange,
    onScoreChange,
    onShieldChange,
    onBannerMessageChange,
    onBossChange,
    onRunEnd,
  });

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    callbacksRef.current = {
      onLivesChange,
      onStageChange,
      onScoreChange,
      onShieldChange,
      onBannerMessageChange,
      onBossChange,
      onRunEnd,
    };
  }, [
    onLivesChange,
    onStageChange,
    onScoreChange,
    onShieldChange,
    onBannerMessageChange,
    onBossChange,
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

    const createWaveFromRefs = (): StageWaveState => {
      const nextWave = createStageWaveState(startStageRef.current);
      if (startBossModeRef.current && nextWave.stage === TOTAL_STAGES) {
        nextWave.spawnQueue = [];
        nextWave.spawnTimer = 0;
      }
      return nextWave;
    };

    let wave: StageWaveState = createWaveFromRefs();
    let boss: BossEnemy | null = null;
    let enemiesDefeated = 0;
    let score = 0;
    let lastReportedLives = player.lives;
    let lastReportedStage = wave.stage;
    let lastReportedScore = 0;
    let lastReportedBanner: string | null = null;
    let lastReportedBossHp: number | null = null;
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
      boss = null;
      for (let i = 0; i < particles.length; i += 1) {
        particles[i].active = false;
      }
      wave = createWaveFromRefs();
      enemiesDefeated = 0;
      score = 0;
      clearHeldInputs();

      if (lastReportedLives !== player.lives) {
        lastReportedLives = player.lives;
        callbacksRef.current.onLivesChange(player.lives);
      }
      if (lastReportedStage !== wave.stage) {
        lastReportedStage = wave.stage;
        callbacksRef.current.onStageChange(wave.stage);
      }
      if (lastReportedScore !== 0) {
        lastReportedScore = 0;
        callbacksRef.current.onScoreChange(0);
      }
      if (lastReportedBanner !== null) {
        lastReportedBanner = null;
        callbacksRef.current.onBannerMessageChange(null);
      }
      if (lastReportedBossHp !== null) {
        lastReportedBossHp = null;
        callbacksRef.current.onBossChange(null);
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

      let runEndedThisFrame = false;

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
        if (boss && boss.hp > 0) {
          stepBoss(
            boss,
            enemyProjectiles,
            player.x,
            player.y,
            dt,
            width,
            height
          );
        }
        stepEnemyProjectiles(enemyProjectiles, dt, width, height);

        const combat = resolveCombatCollisions(
          player,
          projectiles,
          enemies,
          enemyProjectiles,
          (px, py, color) =>
            spawnBurstParticles(particles, particleCursorRef, px, py, color, 10),
          boss
        );
        enemiesDefeated += combat.enemiesDestroyed;
        score += combat.scoreEarned;

        if (score !== lastReportedScore) {
          lastReportedScore = score;
          callbacksRef.current.onScoreChange(score);
        }

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
          runEndedThisFrame = true;
          clearHeldInputs();
          if (lastReportedBanner !== null) {
            lastReportedBanner = null;
            callbacksRef.current.onBannerMessageChange(null);
          }
          callbacksRef.current.onRunEnd(
            'defeat',
            wave.stage,
            enemiesDefeated,
            score
          );
        } else if (combat.bossDefeated) {
          runEndedThisFrame = true;
          clearHeldInputs();
          boss = null;
          if (lastReportedBossHp !== null) {
            lastReportedBossHp = null;
            callbacksRef.current.onBossChange(null);
          }
          if (lastReportedBanner !== null) {
            lastReportedBanner = null;
            callbacksRef.current.onBannerMessageChange(null);
          }
          callbacksRef.current.onRunEnd(
            'victory',
            wave.stage,
            enemiesDefeated,
            score
          );
        } else {
          if (boss && boss.hp !== lastReportedBossHp) {
            lastReportedBossHp = boss.hp;
            callbacksRef.current.onBossChange({ hp: boss.hp, maxHp: boss.maxHp });
          }

          const stageEvent = stepStageProgression(wave, enemies, dt);
          if (stageEvent.type === 'stage_cleared') {
            const msg = `STAGE ${stageEvent.clearedStage} CLEARED!`;
            lastReportedBanner = msg;
            callbacksRef.current.onBannerMessageChange(msg);
          } else if (stageEvent.type === 'stage_started') {
            lastReportedBanner = null;
            callbacksRef.current.onBannerMessageChange(null);
            if (lastReportedStage !== stageEvent.nextStage) {
              lastReportedStage = stageEvent.nextStage;
              callbacksRef.current.onStageChange(stageEvent.nextStage);
            }
          } else if (stageEvent.type === 'boss_incoming') {
            const msg = 'FINAL BOSS INCOMING';
            lastReportedBanner = msg;
            callbacksRef.current.onBannerMessageChange(msg);
          } else if (stageEvent.type === 'boss_spawned') {
            lastReportedBanner = null;
            callbacksRef.current.onBannerMessageChange(null);
            boss = createFinalBoss(width, height);
            lastReportedBossHp = boss.hp;
            callbacksRef.current.onBossChange({ hp: boss.hp, maxHp: boss.maxHp });
          }
        }
      }

      const lowLifeWarning = isLowLifeWarningActive(
        player.lives,
        runEndedThisFrame ? 'gameover' : currentState
      );

      const heroXStr = String(Math.round(player.x));
      const heroYStr = String(Math.round(player.y));
      const aimStr = player.aimAngle.toFixed(2);
      const projStr = String(projectiles.length);
      const enemyProjStr = String(enemyProjectiles.length);
      const enemyStr = String(enemies.length);
      const queueStr = String(wave.spawnQueue.length);
      const livesStr = String(player.lives);
      const stageStr = String(wave.stage);
      const scoreStr = String(score);
      const shieldSnapNow = getShieldSnapshot(player);
      const shieldStatusStr = shieldSnapNow.status;
      const bossHpStr = boss ? String(boss.hp) : '';
      const bossPhaseStr = boss ? boss.phase : '';
      const bossXStr = boss ? String(Math.round(boss.x)) : '';
      const bossYStr = boss ? String(Math.round(boss.y)) : '';
      const lowLifeStr = lowLifeWarning ? '1' : '0';

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
      if (canvas.dataset.score !== scoreStr) canvas.dataset.score = scoreStr;
      if (canvas.dataset.shieldStatus !== shieldStatusStr)
        canvas.dataset.shieldStatus = shieldStatusStr;
      if (canvas.dataset.bossHp !== bossHpStr) canvas.dataset.bossHp = bossHpStr;
      if (canvas.dataset.bossPhase !== bossPhaseStr)
        canvas.dataset.bossPhase = bossPhaseStr;
      if (canvas.dataset.bossX !== bossXStr) canvas.dataset.bossX = bossXStr;
      if (canvas.dataset.bossY !== bossYStr) canvas.dataset.bossY = bossYStr;
      if (canvas.dataset.lowLifeWarning !== lowLifeStr)
        canvas.dataset.lowLifeWarning = lowLifeStr;

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
          boss,
          lowLifeWarning,
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
