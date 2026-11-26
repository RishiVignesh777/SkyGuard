import type {
  BossEnemy,
  BurstParticle,
  CloudSpec,
  Enemy,
  EnemyKind,
  EnemyProjectile,
  GameHudSnapshot,
  GameState,
  HeroGeometry,
  MovementInput,
  PlayerState,
  Projectile,
  ShieldStatus,
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

export const SHIELD_DURATION_SEC = 3.0;
export const SHIELD_COOLDOWN_SEC = 6.0;

export const RUSHER_RADIUS = 20;
export const RUSHER_BASE_SPEED = 148;
export const RUSHER_SPEED_PER_STAGE = 14;

export const BLASTER_RADIUS = 22;
export const BLASTER_SPEED = 128;
export const BLASTER_PREFERRED_MIN_DIST = 250;
export const BLASTER_PREFERRED_MAX_DIST = 340;
export const BLASTER_FIRE_INTERVAL = 2.2;
export const BLASTER_PROJECTILE_SPEED = 240;

export const DRONE_RADIUS = 20;
export const DRONE_BASE_SPEED = 165;
export const DRONE_SPEED_PER_STAGE = 12;
export const DRONE_WAVE_AMPLITUDE = 135;
export const DRONE_FIRE_INTERVAL = 2.5;
export const DRONE_PROJECTILE_SPEED = 370;

export const BOSS_MAX_HP = 40;
export const BOSS_RADIUS = 56;
export const BOSS_DRIFT_SPEED = 85;
export const BOSS_SPREAD_DURATION_SEC = 4.6;
export const BOSS_SPREAD_FIRE_INTERVAL = 1.35;
export const BOSS_SPREAD_ANGLES = [-0.54, -0.27, 0, 0.27, 0.54] as const;
export const BOSS_PROJECTILE_SPEED = 275;
export const BOSS_PROJECTILE_RADIUS = 8;
export const BOSS_CHARGE_WINDUP_SEC = 0.55;
export const BOSS_CHARGE_SPEED = 560;
export const BOSS_CHARGE_MAX_SEC = 1.35;
export const BOSS_INCOMING_BANNER_SEC = 2.1;

export const ENEMY_PROJECTILE_RADIUS = 6;
export const PLAYER_INVULN_SEC = 1.4;
export const STAGE_CLEAR_BANNER_SEC = 1.8;

export const SCORE_RUSHER = 10;
export const SCORE_BLASTER = 15;
export const SCORE_DRONE = 20;
export const SCORE_BOSS = 500;

export interface StageComposition {
  rushers: number;
  blasters: number;
  drones: number;
  spawnInterval: number;
}

export const STAGE_COMPOSITIONS: readonly StageComposition[] = [
  { rushers: 4, blasters: 0, drones: 0, spawnInterval: 1.15 },
  { rushers: 4, blasters: 2, drones: 0, spawnInterval: 1.05 },
  { rushers: 4, blasters: 2, drones: 2, spawnInterval: 0.95 },
  { rushers: 5, blasters: 3, drones: 3, spawnInterval: 0.85 },
  { rushers: 6, blasters: 4, drones: 4, spawnInterval: 0.75 },
];

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

export function createInitialHudSnapshot(initialStage = 1): GameHudSnapshot {
  const safeStage = Math.max(1, Math.min(TOTAL_STAGES, initialStage));
  return {
    lives: DEFAULT_LIVES,
    maxLives: DEFAULT_LIVES,
    stage: safeStage,
    maxStages: TOTAL_STAGES,
    score: 0,
    shieldStatus: 'READY',
    shieldTimeRemaining: 0,
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
    shieldTimer: 0,
    shieldCooldown: 0,
  };
}

export function activateShield(player: PlayerState): boolean {
  if (player.shieldTimer > 0 || player.shieldCooldown > 0) {
    return false;
  }
  player.shieldTimer = SHIELD_DURATION_SEC;
  return true;
}

export function stepShieldState(player: PlayerState, dt: number): void {
  if (player.shieldTimer > 0) {
    player.shieldTimer = Math.max(0, player.shieldTimer - dt);
    if (player.shieldTimer === 0) {
      player.shieldCooldown = SHIELD_COOLDOWN_SEC;
    }
  } else if (player.shieldCooldown > 0) {
    player.shieldCooldown = Math.max(0, player.shieldCooldown - dt);
  }
}

export function getShieldSnapshot(player: PlayerState): {
  status: ShieldStatus;
  timeRemaining: number;
} {
  if (player.shieldTimer > 0) {
    const t =
      player.shieldTimer >= 1
        ? Math.ceil(player.shieldTimer)
        : Math.ceil(player.shieldTimer * 10) / 10;
    return {
      status: 'ACTIVE',
      timeRemaining: t,
    };
  }
  if (player.shieldCooldown > 0) {
    const t =
      player.shieldCooldown >= 1
        ? Math.ceil(player.shieldCooldown)
        : Math.ceil(player.shieldCooldown * 10) / 10;
    return {
      status: 'COOLDOWN',
      timeRemaining: t,
    };
  }
  return {
    status: 'READY',
    timeRemaining: 0,
  };
}

export function buildStageSpawnQueue(
  stage: number,
  rng: () => number = Math.random
): EnemyKind[] {
  const clampedStage = Math.max(1, Math.min(TOTAL_STAGES, stage));
  const comp = STAGE_COMPOSITIONS[clampedStage - 1];
  const queue: EnemyKind[] = [];

  for (let i = 0; i < comp.rushers; i += 1) queue.push('rusher');
  for (let i = 0; i < comp.blasters; i += 1) queue.push('blaster');
  for (let i = 0; i < comp.drones; i += 1) queue.push('drone');

  for (let i = queue.length - 1; i > 1; i -= 1) {
    const j = 1 + Math.floor(rng() * i);
    const tmp = queue[i];
    queue[i] = queue[j];
    queue[j] = tmp;
  }

  return queue;
}

export function createStageWaveState(
  stage: number,
  rng: () => number = Math.random
): StageWaveState {
  const clampedStage = Math.max(1, Math.min(TOTAL_STAGES, stage));
  const comp = STAGE_COMPOSITIONS[clampedStage - 1];

  return {
    stage: clampedStage,
    spawnQueue: buildStageSpawnQueue(clampedStage, rng),
    spawnTimer: 0.75,
    spawnInterval: comp.spawnInterval,
    stageClearTimer: 0,
    clearedBannerStage: null,
    bossIncomingTimer: 0,
    bossActive: false,
  };
}

export function createFinalBoss(
  viewportWidth: number,
  viewportHeight: number
): BossEnemy {
  const safeW = Math.max(320, viewportWidth);
  const safeH = Math.max(320, viewportHeight);
  return {
    x: safeW * 0.5,
    y: Math.max(BOSS_RADIUS + 95, safeH * 0.24),
    radius: BOSS_RADIUS,
    hp: BOSS_MAX_HP,
    maxHp: BOSS_MAX_HP,
    phase: 'spread',
    phaseTimer: BOSS_SPREAD_DURATION_SEC,
    fireTimer: 0.85,
    driftDir: 1,
    chargeTargetX: safeW * 0.5,
    chargeTargetY: safeH * 0.5,
    chargeVx: 0,
    chargeVy: 0,
    hitFlashTimer: 0,
    eyePulse: 0,
  };
}

export function fireBossSpreadFan(
  boss: BossEnemy,
  playerX: number,
  playerY: number,
  enemyProjectiles: EnemyProjectile[]
): void {
  const baseAngle = Math.atan2(playerY - boss.y, playerX - boss.x);
  const spawnDist = boss.radius + BOSS_PROJECTILE_RADIUS + 2;

  for (let i = 0; i < BOSS_SPREAD_ANGLES.length; i += 1) {
    const angle = baseAngle + BOSS_SPREAD_ANGLES[i];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    enemyProjectiles.push({
      x: boss.x + cos * spawnDist,
      y: boss.y + sin * spawnDist,
      vx: cos * BOSS_PROJECTILE_SPEED,
      vy: sin * BOSS_PROJECTILE_SPEED,
      radius: BOSS_PROJECTILE_RADIUS,
      kind: 'boss',
    });
  }
}

export function stepBoss(
  boss: BossEnemy,
  enemyProjectiles: EnemyProjectile[],
  playerX: number,
  playerY: number,
  dt: number,
  viewportWidth: number,
  viewportHeight: number
): void {
  boss.eyePulse += dt * 6;
  if (boss.hitFlashTimer > 0) {
    boss.hitFlashTimer = Math.max(0, boss.hitFlashTimer - dt);
  }

  const pad = boss.radius + 26;
  const minX = pad;
  const maxX = Math.max(minX, viewportWidth - pad);
  const minY = Math.max(pad, 108);
  const maxY = Math.max(minY, viewportHeight - pad);

  if (boss.phase === 'spread') {
    // Drift slowly horizontally and hover smoothly in upper/mid arena
    boss.x += boss.driftDir * BOSS_DRIFT_SPEED * dt;
    if (boss.x <= minX) {
      boss.x = minX;
      boss.driftDir = 1;
    } else if (boss.x >= maxX) {
      boss.x = maxX;
      boss.driftDir = -1;
    }

    const desiredY = Math.min(maxY, Math.max(minY, viewportHeight * 0.25));
    boss.y += (desiredY - boss.y) * Math.min(1, dt * 2.2);

    boss.fireTimer -= dt;
    if (boss.fireTimer <= 0) {
      fireBossSpreadFan(boss, playerX, playerY, enemyProjectiles);
      boss.fireTimer = BOSS_SPREAD_FIRE_INTERVAL;
    }

    boss.phaseTimer -= dt;
    if (boss.phaseTimer <= 0) {
      boss.phase = 'charge_windup';
      boss.phaseTimer = BOSS_CHARGE_WINDUP_SEC;
      boss.chargeTargetX = Math.max(minX, Math.min(maxX, playerX));
      boss.chargeTargetY = Math.max(minY, Math.min(maxY, playerY));
    }
    return;
  }

  if (boss.phase === 'charge_windup') {
    // Lock onto player's current position right before charging
    boss.chargeTargetX = Math.max(minX, Math.min(maxX, playerX));
    boss.chargeTargetY = Math.max(minY, Math.min(maxY, playerY));
    boss.phaseTimer -= dt;

    if (boss.phaseTimer <= 0) {
      const dx = boss.chargeTargetX - boss.x;
      const dy = boss.chargeTargetY - boss.y;
      const dist = Math.hypot(dx, dy);
      const nx = dist > 0.001 ? dx / dist : 0;
      const ny = dist > 0.001 ? dy / dist : 1;

      boss.chargeVx = nx * BOSS_CHARGE_SPEED;
      boss.chargeVy = ny * BOSS_CHARGE_SPEED;
      boss.phase = 'charge';
      boss.phaseTimer = BOSS_CHARGE_MAX_SEC;
    }
    return;
  }

  // 'charge' phase: rush toward locked position at high speed, then return to spread
  const stepX = boss.chargeVx * dt;
  const stepY = boss.chargeVy * dt;
  const remDx = boss.chargeTargetX - boss.x;
  const remDy = boss.chargeTargetY - boss.y;
  const remDist = Math.hypot(remDx, remDy);
  const stepDist = Math.hypot(stepX, stepY);

  boss.phaseTimer -= dt;

  if (remDist <= stepDist + 8 || boss.phaseTimer <= 0) {
    boss.x = Math.max(minX, Math.min(maxX, boss.chargeTargetX));
    boss.y = Math.max(minY, Math.min(maxY, boss.chargeTargetY));
    boss.phase = 'spread';
    boss.phaseTimer = BOSS_SPREAD_DURATION_SEC;
    boss.fireTimer = 0.7;
  } else {
    boss.x = Math.max(minX, Math.min(maxX, boss.x + stepX));
    boss.y = Math.max(minY, Math.min(maxY, boss.y + stepY));
  }
}

export function getRusherSpeedForStage(stage: number): number {
  const clampedStage = Math.max(1, Math.min(TOTAL_STAGES, stage));
  return RUSHER_BASE_SPEED + (clampedStage - 1) * RUSHER_SPEED_PER_STAGE;
}

export function getDroneSpeedForStage(stage: number): number {
  const clampedStage = Math.max(1, Math.min(TOTAL_STAGES, stage));
  return DRONE_BASE_SPEED + (clampedStage - 1) * DRONE_SPEED_PER_STAGE;
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
    case 0:
      return { x: t * width, y: -offset };
    case 1:
      return { x: width + offset, y: t * height };
    case 2:
      return { x: t * width, y: height + offset };
    default:
      return { x: -offset, y: t * height };
  }
}

export function stepEnemySpawning(
  wave: StageWaveState,
  enemies: Enemy[],
  dt: number,
  viewportWidth: number,
  viewportHeight: number,
  nextIdRef: { current: number },
  playerX: number,
  playerY: number,
  rng: () => number = Math.random
): boolean {
  if (
    wave.bossActive ||
    wave.bossIncomingTimer > 0 ||
    wave.clearedBannerStage !== null ||
    wave.spawnQueue.length === 0
  ) {
    return false;
  }

  wave.spawnTimer -= dt;
  if (wave.spawnTimer > 0) {
    return false;
  }

  const kind = wave.spawnQueue.shift()!;
  const radius =
    kind === 'blaster'
      ? BLASTER_RADIUS
      : kind === 'drone'
        ? DRONE_RADIUS
        : RUSHER_RADIUS;
  const spawnPos = pickEdgeSpawnPoint(viewportWidth, viewportHeight, radius, rng);
  const angle = Math.atan2(playerY - spawnPos.y, playerX - spawnPos.x);

  const speed =
    kind === 'blaster'
      ? BLASTER_SPEED
      : kind === 'drone'
        ? getDroneSpeedForStage(wave.stage)
        : getRusherSpeedForStage(wave.stage);

  const fireTimer =
    kind === 'blaster'
      ? 1.2 + rng() * 0.8
      : kind === 'drone'
        ? 1.5 + rng() * 0.9
        : 999;

  enemies.push({
    id: nextIdRef.current,
    kind,
    x: spawnPos.x,
    y: spawnPos.y,
    radius,
    speed,
    angle,
    wobblePhase: rng() * Math.PI * 2,
    fireTimer,
    strafeDir: rng() < 0.5 ? 1 : -1,
  });
  nextIdRef.current += 1;

  wave.spawnTimer = wave.spawnInterval;
  return true;
}

export function stepEnemies(
  enemies: Enemy[],
  enemyProjectiles: EnemyProjectile[],
  playerX: number,
  playerY: number,
  dt: number,
  viewportWidth: number,
  viewportHeight: number
): void {
  const arenaPad = 36;
  const minX = arenaPad;
  const maxX = Math.max(minX, viewportWidth - arenaPad);
  const minY = arenaPad;
  const maxY = Math.max(minY, viewportHeight - arenaPad);

  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dist = Math.hypot(dx, dy);
    const nx = dist > 0.001 ? dx / dist : 0;
    const ny = dist > 0.001 ? dy / dist : 0;

    if (dist > 0.001) {
      enemy.angle = Math.atan2(dy, dx);
    }

    if (enemy.kind === 'rusher') {
      if (dist > 0.001) {
        const step = Math.min(dist, enemy.speed * dt);
        enemy.x += nx * step;
        enemy.y += ny * step;
      }
      enemy.wobblePhase += dt * 7.5;
    } else if (enemy.kind === 'blaster') {
      let vx = 0;
      let vy = 0;
      if (dist > BLASTER_PREFERRED_MAX_DIST) {
        vx = nx * enemy.speed;
        vy = ny * enemy.speed;
      } else if (dist < BLASTER_PREFERRED_MIN_DIST) {
        vx = -nx * enemy.speed;
        vy = -ny * enemy.speed;
      } else {
        vx = -ny * enemy.strafeDir * enemy.speed * 0.68;
        vy = nx * enemy.strafeDir * enemy.speed * 0.68;
      }

      enemy.x = Math.max(minX, Math.min(maxX, enemy.x + vx * dt));
      enemy.y = Math.max(minY, Math.min(maxY, enemy.y + vy * dt));
      enemy.wobblePhase += dt * 4.5;

      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0) {
        const fireAngle = Math.atan2(playerY - enemy.y, playerX - enemy.x);
        enemyProjectiles.push({
          x: enemy.x + Math.cos(fireAngle) * (enemy.radius + 6),
          y: enemy.y + Math.sin(fireAngle) * (enemy.radius + 6),
          vx: Math.cos(fireAngle) * BLASTER_PROJECTILE_SPEED,
          vy: Math.sin(fireAngle) * BLASTER_PROJECTILE_SPEED,
          radius: ENEMY_PROJECTILE_RADIUS,
          kind: 'blaster',
        });
        enemy.fireTimer = BLASTER_FIRE_INTERVAL;
      }
    } else {
      enemy.wobblePhase += dt * 5.2;
      const waveOffset =
        Math.sin(enemy.wobblePhase) + 0.45 * Math.cos(enemy.wobblePhase * 1.9);
      const perpX = -ny;
      const perpY = nx;

      const forwardStep = enemy.speed * dt;
      const lateralStep = waveOffset * DRONE_WAVE_AMPLITUDE * dt;

      enemy.x += nx * forwardStep + perpX * lateralStep;
      enemy.y += ny * forwardStep + perpY * lateralStep;

      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0) {
        const fireAngle = Math.atan2(playerY - enemy.y, playerX - enemy.x);
        enemyProjectiles.push({
          x: enemy.x + Math.cos(fireAngle) * (enemy.radius + 6),
          y: enemy.y + Math.sin(fireAngle) * (enemy.radius + 6),
          vx: Math.cos(fireAngle) * DRONE_PROJECTILE_SPEED,
          vy: Math.sin(fireAngle) * DRONE_PROJECTILE_SPEED,
          radius: ENEMY_PROJECTILE_RADIUS,
          kind: 'drone',
        });
        enemy.fireTimer = DRONE_FIRE_INTERVAL;
      }
    }
  }
}

export function stepEnemyProjectiles(
  enemyProjectiles: EnemyProjectile[],
  dt: number,
  viewportWidth: number,
  viewportHeight: number
): void {
  for (let i = enemyProjectiles.length - 1; i >= 0; i -= 1) {
    const p = enemyProjectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const cullMargin = p.radius + 10;
    if (
      p.x < -cullMargin ||
      p.x > viewportWidth + cullMargin ||
      p.y < -cullMargin ||
      p.y > viewportHeight + cullMargin
    ) {
      enemyProjectiles.splice(i, 1);
    }
  }
}

export function getScoreForEnemyKind(kind: EnemyKind): number {
  switch (kind) {
    case 'blaster':
      return SCORE_BLASTER;
    case 'drone':
      return SCORE_DRONE;
    case 'rusher':
    default:
      return SCORE_RUSHER;
  }
}

export interface CollisionOutcome {
  enemiesDestroyed: number;
  scoreEarned: number;
  playerHit: boolean;
  bossDefeated: boolean;
  gameOver: boolean;
}

export function resolveCombatCollisions(
  player: PlayerState,
  projectiles: Projectile[],
  enemies: Enemy[],
  enemyProjectiles: EnemyProjectile[],
  onPopEffect?: (x: number, y: number, color: string) => void,
  boss: BossEnemy | null = null
): CollisionOutcome {
  let enemiesDestroyed = 0;
  let scoreEarned = 0;
  let playerHit = false;
  let bossDefeated = false;

  // 1. Player Projectile vs Regular Enemy collisions
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
        scoreEarned += getScoreForEnemyKind(enemy.kind);
        destroyed = true;
        const popColor =
          enemy.kind === 'blaster'
            ? '#F97316'
            : enemy.kind === 'drone'
              ? '#FACC15'
              : '#A855F7';
        onPopEffect?.(enemy.x, enemy.y, popColor);
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
      if (player.shieldTimer > 0) {
        enemies.splice(ei, 1);
        enemiesDestroyed += 1;
        scoreEarned += getScoreForEnemyKind(enemy.kind);
        onPopEffect?.(enemy.x, enemy.y, '#38BDF8');
      } else if (player.invulnTimer <= 0) {
        player.lives = Math.max(0, player.lives - 1);
        player.invulnTimer = PLAYER_INVULN_SEC;
        playerHit = true;
        enemies.splice(ei, 1);
        onPopEffect?.(enemy.x, enemy.y, '#EF4444');
      }
    }
  }

  // 2b. Player Projectile vs Boss & Boss vs Player contact
  if (boss && boss.hp > 0) {
    for (let pi = projectiles.length - 1; pi >= 0; pi -= 1) {
      const proj = projectiles[pi];
      const dx = proj.x - boss.x;
      const dy = proj.y - boss.y;
      const hitDist = proj.radius + boss.radius;

      if (dx * dx + dy * dy <= hitDist * hitDist) {
        projectiles.splice(pi, 1);
        boss.hp = Math.max(0, boss.hp - 1);
        boss.hitFlashTimer = 0.08;
        onPopEffect?.(proj.x, proj.y, '#C084FC');

        if (boss.hp <= 0) {
          bossDefeated = true;
          enemiesDestroyed += 1;
          scoreEarned += SCORE_BOSS;
          onPopEffect?.(boss.x, boss.y, '#FACC15');
          break;
        }
      }
    }

    if (boss.hp > 0) {
      const bdx = player.x - boss.x;
      const bdy = player.y - boss.y;
      const bossHitDist = player.radius + boss.radius - 5;

      if (bdx * bdx + bdy * bdy <= bossHitDist * bossHitDist) {
        if (player.shieldTimer <= 0 && player.invulnTimer <= 0) {
          player.lives = Math.max(0, player.lives - 1);
          player.invulnTimer = PLAYER_INVULN_SEC;
          playerHit = true;
          onPopEffect?.(player.x, player.y, '#EF4444');
        }
      }
    }
  }

  // 3. Enemy Projectile vs Player collision
  for (let bi = enemyProjectiles.length - 1; bi >= 0; bi -= 1) {
    const bullet = enemyProjectiles[bi];
    const dx = player.x - bullet.x;
    const dy = player.y - bullet.y;
    const shieldRadius = player.shieldTimer > 0 ? player.radius + 12 : player.radius;
    const hitDist = shieldRadius + bullet.radius - 2;

    if (dx * dx + dy * dy <= hitDist * hitDist) {
      enemyProjectiles.splice(bi, 1);
      if (player.shieldTimer > 0) {
        onPopEffect?.(bullet.x, bullet.y, '#38BDF8');
      } else if (player.invulnTimer <= 0) {
        player.lives = Math.max(0, player.lives - 1);
        player.invulnTimer = PLAYER_INVULN_SEC;
        playerHit = true;
        onPopEffect?.(bullet.x, bullet.y, '#EF4444');
      }
    }
  }

  return {
    enemiesDestroyed,
    scoreEarned,
    playerHit,
    bossDefeated,
    gameOver: player.lives <= 0,
  };
}

export type StageStepEvent =
  | { type: 'none' }
  | { type: 'stage_cleared'; clearedStage: number }
  | { type: 'stage_started'; nextStage: number }
  | { type: 'boss_incoming' }
  | { type: 'boss_spawned' };

export function stepStageProgression(
  wave: StageWaveState,
  enemies: Enemy[],
  dt: number
): StageStepEvent {
  if (wave.bossActive) {
    return { type: 'none' };
  }

  if (wave.bossIncomingTimer > 0) {
    wave.bossIncomingTimer -= dt;
    if (wave.bossIncomingTimer <= 0) {
      wave.bossIncomingTimer = 0;
      wave.bossActive = true;
      return { type: 'boss_spawned' };
    }
    return { type: 'none' };
  }

  if (wave.clearedBannerStage !== null) {
    wave.stageClearTimer -= dt;
    if (wave.stageClearTimer <= 0) {
      const nextStage = wave.clearedBannerStage + 1;
      const nextWave = createStageWaveState(nextStage);
      wave.stage = nextWave.stage;
      wave.spawnQueue = nextWave.spawnQueue;
      wave.spawnTimer = nextWave.spawnTimer;
      wave.spawnInterval = nextWave.spawnInterval;
      wave.stageClearTimer = 0;
      wave.clearedBannerStage = null;
      return { type: 'stage_started', nextStage };
    }
    return { type: 'none' };
  }

  if (wave.spawnQueue.length === 0 && enemies.length === 0) {
    if (wave.stage >= TOTAL_STAGES) {
      wave.bossIncomingTimer = BOSS_INCOMING_BANNER_SEC;
      return { type: 'boss_incoming' };
    }
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
