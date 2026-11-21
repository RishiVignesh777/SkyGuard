import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDeltaTime,
  createInitialHudSnapshot,
  generateCitySkyline,
  generateClouds,
  getStationaryHeroGeometry,
  MAX_DELTA_TIME_SEC,
  stepAmbientWorld,
  transitionGameState,
} from './engine';

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
