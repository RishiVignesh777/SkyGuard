export type GameState = 'title' | 'playing' | 'paused';

export type ShieldStatus = 'READY' | 'ACTIVE' | 'COOLDOWN';

export interface GameHudSnapshot {
  lives: number;
  maxLives: number;
  stage: number;
  maxStages: number;
  shieldStatus: ShieldStatus;
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
