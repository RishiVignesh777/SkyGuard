import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activateShield,
  BLASTER_PROJECTILE_SPEED,
  BOSS_CHARGE_MAX_SEC,
  BOSS_CHARGE_WINDUP_SEC,
  BOSS_INCOMING_BANNER_SEC,
  BOSS_MAX_HP,
  BOSS_RADIUS,
  clampDeltaTime,
  computeAimAngle,
  createFinalBoss,
  createInitialHudSnapshot,
  createInitialPlayerState,
  createStageWaveState,
  DRONE_PROJECTILE_SPEED,
  generateCitySkyline,
  generateClouds,
  getHeroCapeColors,
  getLowLifePulseStrength,
  getScoreForEnemyKind,
  getShieldSnapshot,
  getStationaryHeroGeometry,
  HERO_EDGE_MARGIN,
  HERO_MOVE_SPEED,
  isLowLifeWarningActive,
  MAX_DELTA_TIME_SEC,
  pickEdgeSpawnPoint,
  PLAYER_INVULN_SEC,
  PROJECTILE_SPEED,
  resolveCombatCollisions,
  RUSHER_RADIUS,
  SCORE_BLASTER,
  SCORE_BOSS,
  SCORE_DRONE,
  SCORE_RUSHER,
  SHIELD_COOLDOWN_SEC,
  SHIELD_DURATION_SEC,
  SHOT_COOLDOWN_SEC,
  STAGE_CLEAR_BANNER_SEC,
  STAGE_COMPOSITIONS,
  stepAmbientWorld,
  stepBoss,
  stepEnemies,
  stepEnemyProjectiles,
  stepEnemySpawning,
  stepPlayerMovement,
  stepProjectiles,
  stepShieldState,
  stepShooting,
  stepStageProgression,
  transitionGameState,
} from './engine';
import type { Enemy, EnemyProjectile, Projectile } from './types';

test('clampDeltaTime clamps negative, NaN, and oversized spikes', () => {
  assert.equal(clampDeltaTime(-10), 0);
  assert.equal(clampDeltaTime(Number.NaN), 0);
  assert.equal(clampDeltaTime(16), 0.016);
  assert.equal(clampDeltaTime(250), MAX_DELTA_TIME_SEC);
});

test('createInitialHudSnapshot provides Stage 1/5, 3 lives, 0 score, and READY shield', () => {
  const hud = createInitialHudSnapshot();
  assert.equal(hud.lives, 3);
  assert.equal(hud.maxLives, 3);
  assert.equal(hud.stage, 1);
  assert.equal(hud.maxStages, 5);
  assert.equal(hud.score, 0);
  assert.equal(hud.shieldStatus, 'READY');
  assert.equal(hud.shieldTimeRemaining, 0);
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

test('5 stage compositions mix rushers, blasters, and drones with escalating totals', () => {
  assert.equal(STAGE_COMPOSITIONS.length, 5);
  const totals = STAGE_COMPOSITIONS.map((c) => c.rushers + c.blasters + c.drones);
  for (let i = 1; i < totals.length; i += 1) {
    assert.ok(totals[i] > totals[i - 1], 'each stage must increase enemy count');
  }
  assert.ok(STAGE_COMPOSITIONS[1].blasters > 0);
  assert.ok(STAGE_COMPOSITIONS[2].drones > 0);
  assert.ok(STAGE_COMPOSITIONS[4].rushers > STAGE_COMPOSITIONS[0].rushers);

  const wave = createStageWaveState(3, () => 0.4);
  assert.equal(wave.spawnQueue.length, totals[2]);
  assert.ok(wave.spawnQueue.includes('rusher'));
  assert.ok(wave.spawnQueue.includes('blaster'));
  assert.ok(wave.spawnQueue.includes('drone'));
});

test('stepEnemySpawning trickles enemies from stage queue', () => {
  const wave = createStageWaveState(1, () => 0.1);
  const enemies: Enemy[] = [];
  const nextId = { current: 1 };

  assert.equal(
    stepEnemySpawning(wave, enemies, 0.2, 1000, 800, nextId, 500, 400, () => 0.1),
    false
  );
  assert.equal(
    stepEnemySpawning(wave, enemies, 0.6, 1000, 800, nextId, 500, 400, () => 0.1),
    true
  );
  assert.equal(enemies.length, 1);
  assert.equal(wave.spawnQueue.length, 3);
});

test('pickEdgeSpawnPoint spawns along screen edges', () => {
  const top = pickEdgeSpawnPoint(1000, 800, RUSHER_RADIUS, () => 0.1);
  assert.ok(top.y < 0);
  const right = pickEdgeSpawnPoint(1000, 800, RUSHER_RADIUS, () => 0.3);
  assert.ok(right.x > 1000);
});

test('Blaster keeps distance and fires slow aimed shots while Drone weaves and fires faster shots', () => {
  const playerX = 500;
  const playerY = 400;
  const enemyProjectiles: EnemyProjectile[] = [];
  const enemies: Enemy[] = [
    {
      id: 1,
      kind: 'blaster',
      x: 420,
      y: 400,
      radius: 22,
      speed: 120,
      angle: 0,
      wobblePhase: 0,
      fireTimer: 0.05,
      strafeDir: 1,
    },
    {
      id: 2,
      kind: 'drone',
      x: 800,
      y: 400,
      radius: 20,
      speed: 170,
      angle: Math.PI,
      wobblePhase: 0.5,
      fireTimer: 0.05,
      strafeDir: 1,
    },
  ];

  stepEnemies(enemies, enemyProjectiles, playerX, playerY, 0.1, 1000, 800);

  assert.ok(enemies[0].x < 420);
  assert.ok(enemies[1].x < 800);
  assert.notEqual(enemies[1].y, 400);

  assert.equal(enemyProjectiles.length, 2);
  const blasterSpeed = Math.hypot(enemyProjectiles[0].vx, enemyProjectiles[0].vy);
  const droneSpeed = Math.hypot(enemyProjectiles[1].vx, enemyProjectiles[1].vy);
  assert.ok(Math.abs(blasterSpeed - BLASTER_PROJECTILE_SPEED) < 1e-3);
  assert.ok(Math.abs(droneSpeed - DRONE_PROJECTILE_SPEED) < 1e-3);
  assert.ok(droneSpeed > blasterSpeed);

  enemyProjectiles.push({
    x: 1050,
    y: 400,
    vx: 100,
    vy: 0,
    radius: 6,
    kind: 'blaster',
  });
  stepEnemyProjectiles(enemyProjectiles, 0.1, 1000, 800);
  assert.equal(enemyProjectiles.length, 2);
});

test('shield activates for duration, grants full invulnerability, and enters cooldown', () => {
  const player = createInitialPlayerState(1000, 800);
  player.x = 500;
  player.y = 400;

  assert.equal(getShieldSnapshot(player).status, 'READY');
  assert.equal(activateShield(player), true);
  assert.equal(activateShield(player), false);
  assert.equal(getShieldSnapshot(player).status, 'ACTIVE');

  const enemies: Enemy[] = [
    {
      id: 1,
      kind: 'rusher',
      x: 505,
      y: 400,
      radius: 20,
      speed: 150,
      angle: 0,
      wobblePhase: 0,
      fireTimer: 99,
      strafeDir: 1,
    },
  ];
  const enemyProjectiles: EnemyProjectile[] = [
    { x: 500, y: 400, vx: 100, vy: 0, radius: 6, kind: 'drone' },
  ];
  const outcome = resolveCombatCollisions(player, [], enemies, enemyProjectiles);
  assert.equal(outcome.playerHit, false);
  assert.equal(player.lives, 3);
  assert.equal(enemies.length, 0);
  assert.equal(enemyProjectiles.length, 0);

  stepShieldState(player, SHIELD_DURATION_SEC + 0.1);
  assert.equal(getShieldSnapshot(player).status, 'COOLDOWN');
  assert.equal(activateShield(player), false);

  stepShieldState(player, SHIELD_COOLDOWN_SEC + 0.1);
  assert.equal(getShieldSnapshot(player).status, 'READY');
  assert.equal(activateShield(player), true);
});

test('resolveCombatCollisions destroys enemy on projectile hit and handles player damage + invulnerability', () => {
  const player = createInitialPlayerState(1000, 800);
  player.x = 500;
  player.y = 400;

  const projectiles: Projectile[] = [
    { x: 200, y: 200, vx: 0, vy: 0, radius: 6, angle: 0 },
  ];
  const enemies: Enemy[] = [
    {
      id: 1,
      kind: 'rusher',
      x: 205,
      y: 200,
      radius: 20,
      speed: 150,
      angle: 0,
      wobblePhase: 0,
      fireTimer: 99,
      strafeDir: 1,
    },
    {
      id: 2,
      kind: 'rusher',
      x: 505,
      y: 400,
      radius: 20,
      speed: 150,
      angle: 0,
      wobblePhase: 0,
      fireTimer: 99,
      strafeDir: 1,
    },
    {
      id: 3,
      kind: 'rusher',
      x: 510,
      y: 400,
      radius: 20,
      speed: 150,
      angle: 0,
      wobblePhase: 0,
      fireTimer: 99,
      strafeDir: 1,
    },
  ];

  const res1 = resolveCombatCollisions(player, projectiles, enemies, []);
  assert.equal(res1.enemiesDestroyed, 1);
  assert.equal(res1.playerHit, true);
  assert.equal(player.lives, 2);
  assert.equal(player.invulnTimer, PLAYER_INVULN_SEC);
  assert.equal(res1.gameOver, false);
  assert.equal(projectiles.length, 0);

  const res2 = resolveCombatCollisions(player, projectiles, enemies, []);
  assert.equal(res2.playerHit, false);
  assert.equal(player.lives, 2);

  player.invulnTimer = 0;
  enemies.push({
    id: 4,
    kind: 'rusher',
    x: 505,
    y: 400,
    radius: 20,
    speed: 150,
    angle: 0,
    wobblePhase: 0,
    fireTimer: 99,
    strafeDir: 1,
  });
  resolveCombatCollisions(player, projectiles, enemies, []);
  player.invulnTimer = 0;
  const res3 = resolveCombatCollisions(player, projectiles, enemies, []);
  assert.equal(player.lives, 0);
  assert.equal(res3.gameOver, true);
});

test('stepStageProgression transitions stages 1..4 via cleared banner and stage 5 into boss_incoming -> boss_spawned', () => {
  const wave = createStageWaveState(1);
  const enemies: Enemy[] = [];

  wave.spawnQueue = [];
  const clearedEvent = stepStageProgression(wave, enemies, 0.016);
  assert.deepEqual(clearedEvent, { type: 'stage_cleared', clearedStage: 1 });

  const startedEvent = stepStageProgression(
    wave,
    enemies,
    STAGE_CLEAR_BANNER_SEC + 0.05
  );
  assert.deepEqual(startedEvent, { type: 'stage_started', nextStage: 2 });

  // Stage 5 clear triggers Final Boss incoming transition
  const wave5 = createStageWaveState(5);
  wave5.spawnQueue = [];
  const bossIncoming = stepStageProgression(wave5, enemies, 0.016);
  assert.deepEqual(bossIncoming, { type: 'boss_incoming' });
  assert.ok(wave5.bossIncomingTimer > 0);

  const bossSpawned = stepStageProgression(
    wave5,
    enemies,
    BOSS_INCOMING_BANNER_SEC + 0.05
  );
  assert.deepEqual(bossSpawned, { type: 'boss_spawned' });
  assert.equal(wave5.bossActive, true);
});

test('Final Boss alternates between spread (5-bullet fan) and charge phases, takes 40 HP, and defeats cleanly', () => {
  const boss = createFinalBoss(1440, 900);
  assert.equal(boss.hp, BOSS_MAX_HP);
  assert.equal(boss.maxHp, 40);
  assert.equal(boss.radius, BOSS_RADIUS);
  assert.equal(boss.phase, 'spread');

  const enemyProjectiles: EnemyProjectile[] = [];
  boss.fireTimer = 0.05;
  stepBoss(boss, enemyProjectiles, 720, 600, 0.1, 1440, 900);
  assert.equal(enemyProjectiles.length, 5, 'spread phase fires a 5-bullet fan');

  // Transition spread -> charge_windup (0.4s stationary telegraph) -> charge -> spread
  assert.equal(BOSS_CHARGE_WINDUP_SEC, 0.4);
  boss.phaseTimer = 0.01;
  stepBoss(boss, enemyProjectiles, 900, 620, 0.05, 1440, 900);
  assert.equal(boss.phase, 'charge_windup');

  const windupStartX = boss.x;
  const windupStartY = boss.y;
  stepBoss(boss, enemyProjectiles, 900, 620, 0.2, 1440, 900);
  assert.equal(boss.phase, 'charge_windup');
  assert.equal(boss.x, windupStartX, 'boss movement pauses during windup');
  assert.equal(boss.y, windupStartY, 'boss movement pauses during windup');

  stepBoss(boss, enemyProjectiles, 900, 620, 0.25, 1440, 900);
  assert.equal(boss.phase, 'charge');

  const preChargeY = boss.y;
  stepBoss(boss, enemyProjectiles, 400, 300, 0.1, 1440, 900);
  assert.ok(boss.y > preChargeY, 'boss rushes at high speed toward locked target');

  // Complete charge -> returns to spread phase
  stepBoss(
    boss,
    enemyProjectiles,
    400,
    300,
    BOSS_CHARGE_MAX_SEC + 0.1,
    1440,
    900
  );
  assert.equal(boss.phase, 'spread');

  // Boss takes damage from player projectiles and defeats at 0 HP
  const player = createInitialPlayerState(1440, 900);
  player.x = 200;
  player.y = 700;
  const hitProjectiles: Projectile[] = [
    { x: boss.x, y: boss.y, vx: 0, vy: 0, radius: 6, angle: 0 },
  ];
  const hitOutcome = resolveCombatCollisions(
    player,
    hitProjectiles,
    [],
    [],
    undefined,
    boss
  );
  assert.equal(boss.hp, 39);
  assert.equal(hitOutcome.bossDefeated, false);
  assert.equal(hitProjectiles.length, 0);

  boss.hp = 1;
  const killOutcome = resolveCombatCollisions(
    player,
    [{ x: boss.x, y: boss.y, vx: 0, vy: 0, radius: 6, angle: 0 }],
    [],
    [],
    undefined,
    boss
  );
  assert.equal(boss.hp, 0);
  assert.equal(killOutcome.bossDefeated, true);
  assert.equal(killOutcome.scoreEarned, SCORE_BOSS);
});

test('resolveCombatCollisions awards 10 for rushers, 15 for blasters, 20 for drones, and 500 for boss', () => {
  assert.equal(SCORE_RUSHER, 10);
  assert.equal(SCORE_BLASTER, 15);
  assert.equal(SCORE_DRONE, 20);
  assert.equal(SCORE_BOSS, 500);
  assert.equal(getScoreForEnemyKind('rusher'), 10);
  assert.equal(getScoreForEnemyKind('blaster'), 15);
  assert.equal(getScoreForEnemyKind('drone'), 20);

  const player = createInitialPlayerState(1000, 800);
  player.x = 500;
  player.y = 650;

  const enemies: Enemy[] = [
    {
      id: 1,
      kind: 'rusher',
      x: 200,
      y: 200,
      radius: 20,
      speed: 150,
      angle: 0,
      wobblePhase: 0,
      fireTimer: 99,
      strafeDir: 1,
    },
    {
      id: 2,
      kind: 'blaster',
      x: 350,
      y: 200,
      radius: 22,
      speed: 120,
      angle: 0,
      wobblePhase: 0,
      fireTimer: 2,
      strafeDir: 1,
    },
    {
      id: 3,
      kind: 'drone',
      x: 500,
      y: 200,
      radius: 20,
      speed: 170,
      angle: 0,
      wobblePhase: 0,
      fireTimer: 2,
      strafeDir: 1,
    },
  ];
  const projectiles: Projectile[] = [
    { x: 200, y: 200, vx: 0, vy: 0, radius: 6, angle: 0 },
    { x: 350, y: 200, vx: 0, vy: 0, radius: 6, angle: 0 },
    { x: 500, y: 200, vx: 0, vy: 0, radius: 6, angle: 0 },
  ];

  const shotOutcome = resolveCombatCollisions(player, projectiles, enemies, []);
  assert.equal(shotOutcome.enemiesDestroyed, 3);
  assert.equal(shotOutcome.scoreEarned, 45);

  // Shield kill also awards points; unshielded contact damage awards 0 points
  activateShield(player);
  const shieldOutcome = resolveCombatCollisions(
    player,
    [],
    [
      {
        id: 4,
        kind: 'drone',
        x: player.x,
        y: player.y,
        radius: 20,
        speed: 170,
        angle: 0,
        wobblePhase: 0,
        fireTimer: 2,
        strafeDir: 1,
      },
    ],
    []
  );
  assert.equal(shieldOutcome.scoreEarned, 20);

  player.shieldTimer = 0;
  player.invulnTimer = 0;
  const hitOutcome = resolveCombatCollisions(
    player,
    [],
    [
      {
        id: 5,
        kind: 'rusher',
        x: player.x,
        y: player.y,
        radius: 20,
        speed: 150,
        angle: 0,
        wobblePhase: 0,
        fireTimer: 99,
        strafeDir: 1,
      },
    ],
    []
  );
  assert.equal(hitOutcome.playerHit, true);
  assert.equal(hitOutcome.scoreEarned, 0);
});

test('low-life warning flashes brighter red cape only on last life while playing and stops on heal or run end', () => {
  assert.equal(isLowLifeWarningActive(3, 'playing'), false);
  assert.equal(isLowLifeWarningActive(2, 'playing'), false);
  assert.equal(isLowLifeWarningActive(1, 'playing'), true);
  assert.equal(isLowLifeWarningActive(0, 'playing'), false);
  // Stops immediately when run ends (defeat or victory while on 1 life)
  assert.equal(isLowLifeWarningActive(1, 'gameover'), false);
  assert.equal(isLowLifeWarningActive(1, 'title'), false);
  assert.equal(isLowLifeWarningActive(1, 'paused'), false);
  // Stops immediately if lives increase
  assert.equal(isLowLifeWarningActive(2, 'playing'), false);

  const trough = getLowLifePulseStrength(0);
  const peak = getLowLifePulseStrength(1 / 1.8);
  assert.ok(Math.abs(trough) < 1e-6);
  assert.ok(Math.abs(peak - 1) < 1e-6);

  const inactiveCape = getHeroCapeColors({
    isFlashingWhite: false,
    lowLifeActive: false,
    elapsedTime: 1 / 1.8,
  });
  assert.equal(inactiveCape.mainFill, '#EF4444');
  assert.equal(inactiveCape.pulseStrength, 0);

  const warningPeakCape = getHeroCapeColors({
    isFlashingWhite: false,
    lowLifeActive: true,
    elapsedTime: 1 / 1.8,
  });
  assert.equal(warningPeakCape.mainFill, 'rgb(255, 118, 118)');
  assert.equal(warningPeakCape.shadowFill, 'rgb(255, 62, 62)');
  assert.ok(warningPeakCape.pulseStrength > 0.99);
});
