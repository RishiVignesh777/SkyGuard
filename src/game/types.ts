export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type GameOutcome = 'defeat' | 'victory';

export type ShieldStatus = 'READY' | 'ACTIVE' | 'COOLDOWN';

export interface GameHudSnapshot {
  lives: number;
  maxLives: number;
  stage: number;
  maxStages: number;
  shieldStatus: ShieldStatus;
  shieldTimeRemaining: number;
}

export interface SkylineBuilding {
  x: number;
  width: number;
  height: number;
  layer: 'back' | 'front';
  roofStyle: 'flat' | 'stepped' | 'antenna' | 'slanted';
  windowRows: number;
  windowCols: number;
  litSeed: number;
}

export interface CloudSpec {
  x: number;
  y: number;
  scale: number;
  speed: number;
  opacity: number;
}

export interface HeroGeometry {
  x: number;
  y: number;
  radius: number;
}

export interface PlayerState {
  x: number;
  y: number;
  radius: number;
  aimAngle: number;
  shootCooldown: number;
  lives: number;
  maxLives: number;
  invulnTimer: number;
  shieldTimer: number;
  shieldCooldown: number;
}

export interface MovementInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
}

export type EnemyKind = 'rusher' | 'blaster' | 'drone';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  radius: number;
  speed: number;
  angle: number;
  wobblePhase: number;
  fireTimer: number;
  strafeDir: 1 | -1;
}

export interface EnemyProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  kind: 'blaster' | 'drone';
}

export interface BurstParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface StageWaveState {
  stage: number;
  spawnQueue: EnemyKind[];
  spawnTimer: number;
  spawnInterval: number;
  stageClearTimer: number;
  clearedBannerStage: number | null;
}
