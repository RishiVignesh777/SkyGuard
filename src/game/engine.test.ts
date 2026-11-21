import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDeltaTime,
  computeAimAngle,
  createInitialHudSnapshot,
  createInitialPlayerState,
  createStageWaveState,
  generateCitySkyline,
  generateClouds,
  getStationaryHeroGeometry,
  HERO_EDGE_MARGIN,
  HERO_MOVE_SPEED,
  MAX_DELTA_TIME_SEC,
  pickEdgeSpawnPoint,
  PLAYER_INVULN_SEC,
  PROJECTILE_SPEED,
  resolveCombatCollisions,
  RUSHER_RADIUS,
  SHOT_COOLDOWN_SEC,
  STAGE_CLEAR_BANNER_SEC,
  STAGE_RUSHER_COUNTS,
  stepAmbientWorld,
  stepEnemies,
  stepEnemySpawning,
  stepPlayerMovement,
  stepProjectiles,
  stepShooting,
  stepStageProgression,
  transitionGameState,
} from './engine';
import type { Projectile, RusherEnemy } from './types';

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

test('transitionGameState enforces valid state transitions including gameover and restart', () => {
  assert.equal(transitionGameState('title', 'START'), 'playing');
  assert.equal(transitionGameState('title', 'PAUSE'), 'title');
  assert.equal(transitionGameState('playing', 'PAUSE'), 'paused');
  assert.equal(transitionGameState('paused', 'RESUME'), 'playing');
  assert.equal(transitionGameState('playing', 'GAME_OVER'), 'gameover');
  assert.equal(transitionGameState('gameover', 'RESTART'), 'playing');
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

  stepPlayerMovement(
    player,
    { up: true, down: false, left: false, right: true },
    0.1,
    1000,
    800
  );

  const movedDist = Math.hypot(player.x - startX, player.y - startY);
  assert.ok(Math.abs(movedDist - HERO_MOVE_SPEED * 0.1) < 1e-6);

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

  const fired1 = stepShooting(player, true, 0.016, projectiles);
  assert.equal(fired1, true);
  assert.equal(projectiles.length, 1);
  assert.ok(Math.abs(projectiles[0].vx - PROJECTILE_SPEED) < 1e-6);

  const fired2 = stepShooting(player, true, 0.05, projectiles);
  assert.equal(fired2, false);
  assert.equal(projectiles.length, 1);

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

test('5 stages configure increasing rusher counts and trickle spawning', () => {
  assert.deepEqual([...STAGE_RUSHER_COUNTS], [4, 5, 5, 6, 7]);
  const wave = createStageWaveState(1);
  assert.equal(wave.spawnQueueRemaining, 4);

  const enemies: RusherEnemy[] = [];
  const nextId = { current: 1 };

  // Before initial delay, nothing spawns
  assert.equal(
    stepEnemySpawning(wave, enemies, 0.2, 1000, 800, nextId, 500, 400, () => 0.1),
    false
  );
  // After initial delay, spawns 1 enemy at a time
  assert.equal(
    stepEnemySpawning(wave, enemies, 0.6, 1000, 800, nextId, 500, 400, () => 0.1),
    true
  );
  assert.equal(enemies.length, 1);
  assert.equal(wave.spawnQueueRemaining, 3);
});

test('pickEdgeSpawnPoint spawns along screen edges', () => {
  const top = pickEdgeSpawnPoint(1000, 800, RUSHER_RADIUS, () => 0.1);
  assert.ok(top.y < 0);
  const right = pickEdgeSpawnPoint(1000, 800, RUSHER_RADIUS, () => 0.3);
  assert.ok(right.x > 1000);
});

test('stepEnemies moves rushers directly toward player', () => {
  const enemies: RusherEnemy[] = [
    { id: 1, x: 100, y: 400, radius: 20, speed: 200, angle: 0, wobblePhase: 0 },
  ];
  stepEnemies(enemies, 500, 400, 0.5);
  assert.equal(enemies[0].x, 200);
  assert.equal(enemies[0].y, 400);
});

test('resolveCombatCollisions destroys enemy on projectile hit and handles player damage + invulnerability', () => {
  const player = createInitialPlayerState(1000, 800);
  player.x = 500;
  player.y = 400;

  const projectiles: Projectile[] = [
    { x: 200, y: 200, vx: 0, vy: 0, radius: 6, angle: 0 },
  ];
  const enemies: RusherEnemy[] = [
    { id: 1, x: 205, y: 200, radius: 20, speed: 150, angle: 0, wobblePhase: 0 },
    { id: 2, x: 505, y: 400, radius: 20, speed: 150, angle: 0, wobblePhase: 0 },
    { id: 3, x: 510, y: 400, radius: 20, speed: 150, angle: 0, wobblePhase: 0 },
  ];

  const res1 = resolveCombatCollisions(player, projectiles, enemies);
  assert.equal(res1.enemiesDestroyed, 1);
  assert.equal(res1.playerHit, true);
  assert.equal(player.lives, 2);
  assert.equal(player.invulnTimer, PLAYER_INVULN_SEC);
  assert.equal(res1.gameOver, false);
  assert.equal(projectiles.length, 0);

  // Enemy 3 overlaps while invulnerable -> no extra damage
  const res2 = resolveCombatCollisions(player, projectiles, enemies);
  assert.equal(res2.playerHit, false);
  assert.equal(player.lives, 2);

  // Deplete remaining lives -> game over
  player.invulnTimer = 0;
  enemies.push({ id: 4, x: 505, y: 400, radius: 20, speed: 150, angle: 0, wobblePhase: 0 });
  resolveCombatCollisions(player, projectiles, enemies);
  player.invulnTimer = 0;
  const res3 = resolveCombatCollisions(player, projectiles, enemies);
  assert.equal(player.lives, 0);
  assert.equal(res3.gameOver, true);
});

test('stepStageProgression clears stage when queue and enemies empty, then advances after banner', () => {
  const wave = createStageWaveState(1);
  const enemies: RusherEnemy[] = [];

  // Not cleared while queue remains
  assert.equal(stepStageProgression(wave, enemies, 0.016).type, 'none');

  // Empty queue + active enemy -> not cleared yet
  wave.spawnQueueRemaining = 0;
  enemies.push({ id: 1, x: 10, y: 10, radius: 20, speed: 100, angle: 0, wobblePhase: 0 });
  assert.equal(stepStageProgression(wave, enemies, 0.016).type, 'none');

  // Empty queue + 0 enemies -> stage cleared!
  enemies.length = 0;
  const clearedEvent = stepStageProgression(wave, enemies, 0.016);
  assert.deepEqual(clearedEvent, { type: 'stage_cleared', clearedStage: 1 });
  assert.equal(wave.clearedBannerStage, 1);

  // Advance through banner duration -> starts stage 2
  const startedEvent = stepStageProgression(
    wave,
    enemies,
    STAGE_CLEAR_BANNER_SEC + 0.05
  );
  assert.deepEqual(startedEvent, { type: 'stage_started', nextStage: 2 });
  assert.equal(wave.stage, 2);
  assert.equal(wave.spawnQueueRemaining, 5);
});
