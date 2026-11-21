import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDeltaTime,
  computeAimAngle,
  createInitialHudSnapshot,
  createInitialPlayerState,
  generateCitySkyline,
  generateClouds,
  getStationaryHeroGeometry,
  HERO_EDGE_MARGIN,
  HERO_MOVE_SPEED,
  MAX_DELTA_TIME_SEC,
  PROJECTILE_SPEED,
  SHOT_COOLDOWN_SEC,
  stepAmbientWorld,
  stepPlayerMovement,
  stepProjectiles,
  stepShooting,
  transitionGameState,
} from './engine';
import type { Projectile } from './types';

test('clampDeltaTime clamps negative, NaN, and oversized spikes', () => {
  assert.equal(clampDeltaTime(-10), 0);
  assert.equal(clampDeltaTime(Number.NaN), 0);
  assert.equal(clampDeltaTime(16), 0.016);
  assert.equal(clampDeltaTime(250), MAX_DELTA_TIME_SEC);
});

test('createInitialHudSnapshot provides Stage 1/5, 3 lives, and READY shield', () => {
  const hud = createInitialHudSnapshot();
  assert.equal(hud.lives, 3);
  assert.equal(hud.maxLives, 3);
  assert.equal(hud.stage, 1);
  assert.equal(hud.maxStages, 5);
  assert.equal(hud.shieldStatus, 'READY');
});

test('transitionGameState enforces valid state transitions', () => {
  assert.equal(transitionGameState('title', 'START'), 'playing');
  assert.equal(transitionGameState('title', 'PAUSE'), 'title');
  assert.equal(transitionGameState('playing', 'PAUSE'), 'paused');
  assert.equal(transitionGameState('paused', 'RESUME'), 'playing');
  assert.equal(transitionGameState('paused', 'RETURN_TITLE'), 'title');
});

test('getStationaryHeroGeometry keeps hero centered horizontally and clear of skyline/HUD', () => {
  const hero = getStationaryHeroGeometry(1440, 900);
  assert.equal(hero.x, 720);
  assert.ok(hero.y > 450 && hero.y < 650);
  assert.ok(hero.radius >= 22 && hero.radius <= 34);
});

test('generateCitySkyline spans full width with back and front layers', () => {
  const buildings = generateCitySkyline(1440);
  const back = buildings.filter((b) => b.layer === 'back');
  const front = buildings.filter((b) => b.layer === 'front');

  assert.ok(back.length >= 10);
  assert.ok(front.length >= 10);
  const maxRight = Math.max(...front.map((b) => b.x + b.width));
  assert.ok(maxRight >= 1440);
});

test('stepAmbientWorld advances elapsed time and wraps drifting clouds', () => {
  const clouds = generateClouds(1000, 800);
  clouds[0].x = 1155;
  clouds[0].speed = 50;

  const nextElapsed = stepAmbientWorld(1.0, 0.2, clouds, 1000);
  assert.equal(nextElapsed, 1.2);
  assert.ok(clouds[0].x < 0, 'cloud should wrap around left edge');
});

test('stepPlayerMovement moves hero with normalized diagonal speed and clamps within margins', () => {
  const player = createInitialPlayerState(1000, 800);
  const startX = player.x;
  const startY = player.y;

  // Move diagonally up-right for 0.1s
  stepPlayerMovement(
    player,
    { up: true, down: false, left: false, right: true },
    0.1,
    1000,
    800
  );

  const movedDist = Math.hypot(player.x - startX, player.y - startY);
  assert.ok(
    Math.abs(movedDist - HERO_MOVE_SPEED * 0.1) < 1e-6,
    'diagonal movement should be normalized to HERO_MOVE_SPEED'
  );

  // Push past top-left edge to verify clamping
  for (let i = 0; i < 60; i += 1) {
    stepPlayerMovement(
      player,
      { up: true, down: false, left: true, right: false },
      0.05,
      1000,
      800
    );
  }
  assert.equal(player.x, player.radius + HERO_EDGE_MARGIN);
  assert.equal(player.y, player.radius + HERO_EDGE_MARGIN);

  // Push past bottom-right edge to verify clamping
  for (let i = 0; i < 100; i += 1) {
    stepPlayerMovement(
      player,
      { up: false, down: true, left: false, right: true },
      0.05,
      1000,
      800
    );
  }
  assert.equal(player.x, 1000 - player.radius - HERO_EDGE_MARGIN);
  assert.equal(player.y, 800 - player.radius - HERO_EDGE_MARGIN);
});

test('computeAimAngle points toward target cursor and falls back when coinciding', () => {
  assert.equal(computeAimAngle(100, 100, 200, 100), 0);
  assert.ok(Math.abs(computeAimAngle(100, 100, 100, 200) - Math.PI / 2) < 1e-6);
  assert.equal(computeAimAngle(100, 100, 100, 100, -1.2), -1.2);
});

test('stepShooting enforces steady cooldown when holding fire', () => {
  const player = createInitialPlayerState(1000, 800);
  player.aimAngle = 0;
  const projectiles: Projectile[] = [];

  // First shot fires immediately
  const fired1 = stepShooting(player, true, 0.016, projectiles);
  assert.equal(fired1, true);
  assert.equal(projectiles.length, 1);
  assert.ok(Math.abs(projectiles[0].vx - PROJECTILE_SPEED) < 1e-6);
  assert.ok(Math.abs(projectiles[0].vy) < 1e-6);

  // Subsequent frame before cooldown expires does not fire
  const fired2 = stepShooting(player, true, 0.05, projectiles);
  assert.equal(fired2, false);
  assert.equal(projectiles.length, 1);

  // After remaining cooldown elapses, next shot fires
  const fired3 = stepShooting(player, true, SHOT_COOLDOWN_SEC, projectiles);
  assert.equal(fired3, true);
  assert.equal(projectiles.length, 2);
});

test('stepProjectiles moves in a straight line and removes projectiles off-screen', () => {
  const projectiles: Projectile[] = [
    { x: 500, y: 400, vx: 500, vy: 0, radius: 6, angle: 0 },
    { x: 995, y: 400, vx: 500, vy: 0, radius: 6, angle: 0 },
  ];

  stepProjectiles(projectiles, 0.1, 1000, 800);

  assert.equal(projectiles.length, 1);
  assert.equal(projectiles[0].x, 550);
  assert.equal(projectiles[0].y, 400);
});
