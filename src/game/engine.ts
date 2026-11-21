import type {
  CloudSpec,
  GameHudSnapshot,
  GameState,
  HeroGeometry,
  MovementInput,
  PlayerState,
  Projectile,
  SkylineBuilding,
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

export type GameAction = 'START' | 'PAUSE' | 'RESUME' | 'RETURN_TITLE';

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
  };
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
