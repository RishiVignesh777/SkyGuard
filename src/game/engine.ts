import type {
  BurstParticle,
  CloudSpec,
  GameHudSnapshot,
  GameState,
  HeroGeometry,
  MovementInput,
  PlayerState,
  Projectile,
  RusherEnemy,
  SkylineBuilding,
  StageWaveState,
} from './types';

export const MAX_DELTA_TIME_SEC = 0.05;
export const DEFAULT_LIVES = 3;
export const TOTAL_STAGES = 5;

export const HERO_MOVE_SPEED = 360;
export const HERO_EDGE_MARGIN = 18;
export const DEFAULT_AIM_ANGLE = -Math.PI / 2;
export const SHOT_COOLDOWN_SEC = 0.14;
export const PROJECTILE_SPEED = 780;
export const PROJECTILE_RADIUS = 6;

export const STAGE_RUSHER_COUNTS = [4, 5, 5, 6, 7] as const;
export const RUSHER_RADIUS = 20;
export const RUSHER_BASE_SPEED = 148;
export const RUSHER_SPEED_PER_STAGE = 14;
export const PLAYER_INVULN_SEC = 1.4;
export const STAGE_CLEAR_BANNER_SEC = 1.8;

export type GameAction =
  | 'START'
  | 'PAUSE'
  | 'RESUME'
  | 'GAME_OVER'
  | 'RESTART'
  | 'RETURN_TITLE';

export function clampDeltaTime(rawDeltaMs: number): number {
  if (!Number.isFinite(rawDeltaMs) || rawDeltaMs <= 0) {
    return 0;
  }
  const seconds = rawDeltaMs / 1000;
  return Math.min(seconds, MAX_DELTA_TIME_SEC);
}

export function createInitialHudSnapshot(): GameHudSnapshot {
  return {
    lives: DEFAULT_LIVES,
    maxLives: DEFAULT_LIVES,
    stage: 1,
    maxStages: TOTAL_STAGES,
    shieldStatus: 'READY',
  };
}

export function transitionGameState(
  current: GameState,
  action: GameAction
): GameState {
  switch (action) {
    case 'START':
      return current === 'title' ? 'playing' : current;
    case 'PAUSE':
      return current === 'playing' ? 'paused' : current;
    case 'RESUME':
      return current === 'paused' ? 'playing' : current;
    case 'GAME_OVER':
      return current === 'playing' ? 'gameover' : current;
    case 'RESTART':
      return 'playing';
    case 'RETURN_TITLE':
      return 'title';
  }
}

export function getStationaryHeroGeometry(
  viewportWidth: number,
  viewportHeight: number
): HeroGeometry {
  const safeWidth = Math.max(320, viewportWidth);
  const safeHeight = Math.max(320, viewportHeight);
  const minDimension = Math.min(safeWidth, safeHeight);
  const radius = Math.max(22, Math.min(34, Math.round(minDimension * 0.038)));

  return {
    x: safeWidth * 0.5,
    y: safeHeight * 0.62,
    radius,
  };
}

export function createInitialPlayerState(
  viewportWidth: number,
  viewportHeight: number
): PlayerState {
  const hero = getStationaryHeroGeometry(viewportWidth, viewportHeight);
  return {
    x: hero.x,
    y: hero.y,
    radius: hero.radius,
    aimAngle: DEFAULT_AIM_ANGLE,
    shootCooldown: 0,
    lives: DEFAULT_LIVES,
    maxLives: DEFAULT_LIVES,
    invulnTimer: 0,
  };
}

export function createStageWaveState(stage: number): StageWaveState {
  const clampedStage = Math.max(1, Math.min(TOTAL_STAGES, stage));
  const count = STAGE_RUSHER_COUNTS[clampedStage - 1];
  const spawnInterval = Math.max(0.75, 1.15 - (clampedStage - 1) * 0.09);

  return {
    stage: clampedStage,
    spawnQueueRemaining: count,
    spawnTimer: 0.75,
    spawnInterval,
    stageClearTimer: 0,
    clearedBannerStage: null,
  };
}

export function getRusherSpeedForStage(stage: number): number {
  const clampedStage = Math.max(1, Math.min(TOTAL_STAGES, stage));
  return RUSHER_BASE_SPEED + (clampedStage - 1) * RUSHER_SPEED_PER_STAGE;
}

export function pickEdgeSpawnPoint(
  viewportWidth: number,
  viewportHeight: number,
  radius: number,
  rng: () => number = Math.random
): { x: number; y: number } {
  const width = Math.max(320, viewportWidth);
  const height = Math.max(320, viewportHeight);
  const offset = radius + 6;
  const edge = Math.floor(rng() * 4);
  const t = rng();

  switch (edge) {
    case 0: // Top edge
      return { x: t * width, y: -offset };
    case 1: // Right edge
      return { x: width + offset, y: t * height };
    case 2: // Bottom edge
      return { x: t * width, y: height + offset };
    default: // Left edge
      return { x: -offset, y: t * height };
  }
}

export function stepEnemySpawning(
  wave: StageWaveState,
  enemies: RusherEnemy[],
  dt: number,
  viewportWidth: number,
  viewportHeight: number,
  nextIdRef: { current: number },
  playerX: number,
  playerY: number,
  rng: () => number = Math.random
): boolean {
  if (wave.clearedBannerStage !== null || wave.spawnQueueRemaining <= 0) {
    return false;
  }

  wave.spawnTimer -= dt;
  if (wave.spawnTimer > 0) {
    return false;
  }

  const spawnPos = pickEdgeSpawnPoint(
    viewportWidth,
    viewportHeight,
    RUSHER_RADIUS,
    rng
  );
  const angle = Math.atan2(playerY - spawnPos.y, playerX - spawnPos.x);

  enemies.push({
    id: nextIdRef.current,
    x: spawnPos.x,
    y: spawnPos.y,
    radius: RUSHER_RADIUS,
    speed: getRusherSpeedForStage(wave.stage),
    angle,
    wobblePhase: rng() * Math.PI * 2,
  });
  nextIdRef.current += 1;

  wave.spawnQueueRemaining -= 1;
  wave.spawnTimer = wave.spawnInterval;
  return true;
}

export function stepEnemies(
  enemies: RusherEnemy[],
  playerX: number,
  playerY: number,
  dt: number
): void {
  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.001) {
      enemy.angle = Math.atan2(dy, dx);
      const step = Math.min(dist, enemy.speed * dt);
      enemy.x += (dx / dist) * step;
      enemy.y += (dy / dist) * step;
    }

    enemy.wobblePhase += dt * 7.5;
  }
}

export interface CollisionOutcome {
  enemiesDestroyed: number;
  playerHit: boolean;
  gameOver: boolean;
}

export function resolveCombatCollisions(
  player: PlayerState,
  projectiles: Projectile[],
  enemies: RusherEnemy[],
  onPopEffect?: (x: number, y: number, color: string) => void
): CollisionOutcome {
  let enemiesDestroyed = 0;
  let playerHit = false;

  // 1. Projectile vs Enemy collisions
  for (let ei = enemies.length - 1; ei >= 0; ei -= 1) {
    const enemy = enemies[ei];
    let destroyed = false;

    for (let pi = projectiles.length - 1; pi >= 0; pi -= 1) {
      const proj = projectiles[pi];
      const dx = proj.x - enemy.x;
      const dy = proj.y - enemy.y;
      const hitDist = proj.radius + enemy.radius;

      if (dx * dx + dy * dy <= hitDist * hitDist) {
        projectiles.splice(pi, 1);
        enemies.splice(ei, 1);
        enemiesDestroyed += 1;
        destroyed = true;
        onPopEffect?.(enemy.x, enemy.y, '#A855F7');
        break;
      }
    }

    if (destroyed) {
      continue;
    }

    // 2. Enemy vs Player collision
    const pdx = player.x - enemy.x;
    const pdy = player.y - enemy.y;
    const playerHitDist = player.radius + enemy.radius - 3;

    if (pdx * pdx + pdy * pdy <= playerHitDist * playerHitDist) {
      if (player.invulnTimer <= 0) {
        player.lives = Math.max(0, player.lives - 1);
        player.invulnTimer = PLAYER_INVULN_SEC;
        playerHit = true;
        enemies.splice(ei, 1);
        onPopEffect?.(enemy.x, enemy.y, '#EF4444');
      }
    }
  }

  return {
    enemiesDestroyed,
    playerHit,
    gameOver: player.lives <= 0,
  };
}

export type StageStepEvent =
  | { type: 'none' }
  | { type: 'stage_cleared'; clearedStage: number }
  | { type: 'stage_started'; nextStage: number }
  | { type: 'all_stages_cleared' };

export function stepStageProgression(
  wave: StageWaveState,
  enemies: RusherEnemy[],
  dt: number
): StageStepEvent {
  if (wave.clearedBannerStage !== null) {
    wave.stageClearTimer -= dt;
    if (wave.stageClearTimer <= 0) {
      if (wave.clearedBannerStage >= TOTAL_STAGES) {
        wave.clearedBannerStage = null;
        return { type: 'all_stages_cleared' };
      }
      const nextStage = wave.clearedBannerStage + 1;
      const nextWave = createStageWaveState(nextStage);
      wave.stage = nextWave.stage;
      wave.spawnQueueRemaining = nextWave.spawnQueueRemaining;
      wave.spawnTimer = nextWave.spawnTimer;
      wave.spawnInterval = nextWave.spawnInterval;
      wave.stageClearTimer = 0;
      wave.clearedBannerStage = null;
      return { type: 'stage_started', nextStage };
    }
    return { type: 'none' };
  }

  if (wave.spawnQueueRemaining === 0 && enemies.length === 0) {
    wave.clearedBannerStage = wave.stage;
    wave.stageClearTimer = STAGE_CLEAR_BANNER_SEC;
    return { type: 'stage_cleared', clearedStage: wave.stage };
  }

  return { type: 'none' };
}

export function createParticlePool(capacity = 96): BurstParticle[] {
  const pool: BurstParticle[] = [];
  for (let i = 0; i < capacity; i += 1) {
    pool.push({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 4,
      life: 0,
      maxLife: 0.35,
      color: '#A855F7',
    });
  }
  return pool;
}

export function spawnBurstParticles(
  pool: BurstParticle[],
  cursorRef: { current: number },
  x: number,
  y: number,
  color: string,
  count = 10
): void {
  for (let i = 0; i < count; i += 1) {
    const idx = cursorRef.current % pool.length;
    cursorRef.current = (cursorRef.current + 1) % pool.length;
    const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.2;
    const speed = 90 + (i % 3) * 55;
    const p = pool[idx];
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.radius = 4 + (i % 3) * 1.5;
    p.life = 0.32;
    p.maxLife = 0.32;
    p.color = color;
  }
}

export function stepParticles(pool: BurstParticle[], dt: number): void {
  for (let i = 0; i < pool.length; i += 1) {
    const p = pool[i];
    if (!p.active) {
      continue;
    }
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.15, dt);
    p.vy *= Math.pow(0.15, dt);
  }
}

export function clampPlayerPosition(
  player: PlayerState,
  viewportWidth: number,
  viewportHeight: number
): void {
  const minX = player.radius + HERO_EDGE_MARGIN;
  const maxX = Math.max(minX, viewportWidth - player.radius - HERO_EDGE_MARGIN);
  const minY = player.radius + HERO_EDGE_MARGIN;
  const maxY = Math.max(minY, viewportHeight - player.radius - HERO_EDGE_MARGIN);

  if (player.x < minX) {
    player.x = minX;
  } else if (player.x > maxX) {
    player.x = maxX;
  }

  if (player.y < minY) {
    player.y = minY;
  } else if (player.y > maxY) {
    player.y = maxY;
  }
}

export function stepPlayerMovement(
  player: PlayerState,
  input: MovementInput,
  dt: number,
  viewportWidth: number,
  viewportHeight: number
): void {
  if (player.invulnTimer > 0) {
    player.invulnTimer = Math.max(0, player.invulnTimer - dt);
  }

  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;

    player.x += dx * HERO_MOVE_SPEED * dt;
    player.y += dy * HERO_MOVE_SPEED * dt;
  }

  clampPlayerPosition(player, viewportWidth, viewportHeight);
}

export function computeAimAngle(
  heroX: number,
  heroY: number,
  targetX: number,
  targetY: number,
  fallbackAngle = DEFAULT_AIM_ANGLE
): number {
  const dx = targetX - heroX;
  const dy = targetY - heroY;
  if (dx === 0 && dy === 0) {
    return fallbackAngle;
  }
  return Math.atan2(dy, dx);
}

export function stepShooting(
  player: PlayerState,
  isFiring: boolean,
  dt: number,
  projectiles: Projectile[]
): boolean {
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);

  if (!isFiring || player.shootCooldown > 0) {
    return false;
  }

  const spawnDistance = player.radius + PROJECTILE_RADIUS + 4;
  const angle = player.aimAngle;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  projectiles.push({
    x: player.x + cos * spawnDistance,
    y: player.y + sin * spawnDistance,
    vx: cos * PROJECTILE_SPEED,
    vy: sin * PROJECTILE_SPEED,
    radius: PROJECTILE_RADIUS,
    angle,
  });

  player.shootCooldown = SHOT_COOLDOWN_SEC;
  return true;
}

export function stepProjectiles(
  projectiles: Projectile[],
  dt: number,
  viewportWidth: number,
  viewportHeight: number
): void {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const cullMargin = p.radius + 8;
    if (
      p.x < -cullMargin ||
      p.x > viewportWidth + cullMargin ||
      p.y < -cullMargin ||
      p.y > viewportHeight + cullMargin
    ) {
      projectiles.splice(i, 1);
    }
  }
}

export function screenToCanvasCoords(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const safeRectW = rect.width > 0 ? rect.width : canvasWidth;
  const safeRectH = rect.height > 0 ? rect.height : canvasHeight;
  return {
    x: ((clientX - rect.left) / safeRectW) * canvasWidth,
    y: ((clientY - rect.top) / safeRectH) * canvasHeight,
  };
}

function deterministicHash(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function generateCitySkyline(viewportWidth: number): SkylineBuilding[] {
  const width = Math.max(320, Math.ceil(viewportWidth));
  const buildings: SkylineBuilding[] = [];
  const roofStyles: SkylineBuilding['roofStyle'][] = [
    'flat',
    'stepped',
    'antenna',
    'slanted',
  ];

  // Back silhouette layer (taller, softer contrast)
  let backX = -16;
  let backIndex = 0;
  while (backX < width + 40) {
    const r1 = deterministicHash(backIndex + 11);
    const r2 = deterministicHash(backIndex + 47);
    const r3 = deterministicHash(backIndex + 97);
    const bWidth = 56 + Math.round(r1 * 58);
    const bHeight = 95 + Math.round(r2 * 115);

    buildings.push({
      x: backX,
      width: bWidth,
      height: bHeight,
      layer: 'back',
      roofStyle: roofStyles[Math.floor(r3 * roofStyles.length)],
      windowRows: Math.max(2, Math.floor(bHeight / 28)),
      windowCols: Math.max(2, Math.floor(bWidth / 18)),
      litSeed: backIndex * 7 + 3,
    });

    backX += bWidth - 6;
    backIndex += 1;
  }

  // Front silhouette layer (richer dark blue-gray foreground skyline)
  let frontX = -10;
  let frontIndex = 0;
  while (frontX < width + 40) {
    const r1 = deterministicHash(frontIndex + 211);
    const r2 = deterministicHash(frontIndex + 307);
    const r3 = deterministicHash(frontIndex + 409);
    const bWidth = 48 + Math.round(r1 * 64);
    const bHeight = 68 + Math.round(r2 * 96);

    buildings.push({
      x: frontX,
      width: bWidth,
      height: bHeight,
      layer: 'front',
      roofStyle: roofStyles[Math.floor(r3 * roofStyles.length)],
      windowRows: Math.max(2, Math.floor(bHeight / 26)),
      windowCols: Math.max(2, Math.floor(bWidth / 18)),
      litSeed: frontIndex * 13 + 19,
    });

    frontX += bWidth - 4;
    frontIndex += 1;
  }

  return buildings;
}

export function generateClouds(
  viewportWidth: number,
  viewportHeight: number
): CloudSpec[] {
  const width = Math.max(320, viewportWidth);
  const height = Math.max(320, viewportHeight);
  const count = 6;
  const clouds: CloudSpec[] = [];
  const laneY = [0.22, 0.36, 0.52, 0.25, 0.44, 0.56];
  const laneX = [0.1, 0.23, 0.14, 0.72, 0.88, 0.78];

  for (let i = 0; i < count; i += 1) {
    const scale = 0.72 + deterministicHash(i + 131) * 0.58;
    const speed = 10 + deterministicHash(i + 191) * 14;
    const opacity = 0.85 + deterministicHash(i + 251) * 0.12;

    clouds.push({
      x: laneX[i] * width,
      y: laneY[i] * height,
      scale,
      speed,
      opacity,
    });
  }

  return clouds;
}

export function stepAmbientWorld(
  elapsedSec: number,
  dt: number,
  clouds: CloudSpec[],
  viewportWidth: number
): number {
  const wrapMargin = 160;
  const span = Math.max(320, viewportWidth) + wrapMargin * 2;

  for (let i = 0; i < clouds.length; i += 1) {
    const cloud = clouds[i];
    cloud.x += cloud.speed * dt;
    if (cloud.x > viewportWidth + wrapMargin) {
      cloud.x -= span;
    }
  }

  return elapsedSec + dt;
}
