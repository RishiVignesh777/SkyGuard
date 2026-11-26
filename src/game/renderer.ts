import { DEFAULT_AIM_ANGLE, getHeroCapeColors } from './engine';
import type {
  BossEnemy,
  BurstParticle,
  CloudSpec,
  Enemy,
  EnemyProjectile,
  PlayerState,
  Projectile,
  SkylineBuilding,
} from './types';

export interface StaticBackdropParams {
  width: number;
  height: number;
  skyline: SkylineBuilding[];
}

export interface DynamicSceneParams {
  width: number;
  height: number;
  elapsedTime: number;
  clouds: CloudSpec[];
  backdropCanvas: HTMLCanvasElement;
  player: PlayerState;
  projectiles: Projectile[];
  enemies: Enemy[];
  enemyProjectiles: EnemyProjectile[];
  particles: BurstParticle[];
  boss?: BossEnemy | null;
  lowLifeWarning?: boolean;
}

export function renderStaticBackdrop(
  ctx: CanvasRenderingContext2D,
  params: StaticBackdropParams
): void {
  const { width, height, skyline } = params;
  drawSkyBackground(ctx, width, height);
  drawCitySkyline(ctx, width, height, skyline);
}

export function renderSkyguardScene(
  ctx: CanvasRenderingContext2D,
  params: DynamicSceneParams
): void {
  const {
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
    lowLifeWarning = false,
  } = params;

  ctx.drawImage(backdropCanvas, 0, 0, width, height);
  drawClouds(ctx, clouds);
  drawParticles(ctx, particles);
  drawProjectiles(ctx, projectiles);
  drawEnemyProjectiles(ctx, enemyProjectiles);
  drawEnemies(ctx, enemies, elapsedTime);
  if (boss && boss.hp > 0) {
    drawBoss(ctx, boss, player.x, player.y, elapsedTime);
  }
  drawHero(ctx, player, elapsedTime, lowLifeWarning);
}

function drawSkyBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0EA5E9');
  gradient.addColorStop(0.52, '#38BDF8');
  gradient.addColorStop(0.84, '#7DD3FC');
  gradient.addColorStop(1, '#BAE6FD');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const sunX = width * 0.84;
  const sunY = height * 0.17;
  const sunRadius = Math.max(46, Math.min(width, height) * 0.075);

  const halo = ctx.createRadialGradient(
    sunX,
    sunY,
    sunRadius * 0.4,
    sunX,
    sunY,
    sunRadius * 3.1
  );
  halo.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
  halo.addColorStop(0.5, 'rgba(254, 240, 138, 0.16)');
  halo.addColorStop(1, 'rgba(254, 240, 138, 0)');

  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius * 3.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius * 0.72, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(ctx: CanvasRenderingContext2D, clouds: CloudSpec[]): void {
  for (let i = 0; i < clouds.length; i += 1) {
    const cloud = clouds[i];
    ctx.save();
    ctx.translate(cloud.x, cloud.y);
    ctx.scale(cloud.scale, cloud.scale);
    ctx.globalAlpha = cloud.opacity;

    ctx.fillStyle = '#BAE6FD';
    ctx.beginPath();
    ctx.arc(0, 6, 25, 0, Math.PI * 2);
    ctx.arc(24, -2, 21, 0, Math.PI * 2);
    ctx.arc(46, 8, 17, 0, Math.PI * 2);
    ctx.arc(-22, 10, 17, 0, Math.PI * 2);
    ctx.roundRect(-36, 10, 96, 17, 8);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.arc(24, -8, 22, 0, Math.PI * 2);
    ctx.arc(46, 2, 18, 0, Math.PI * 2);
    ctx.arc(-22, 4, 18, 0, Math.PI * 2);
    ctx.roundRect(-38, 4, 100, 18, 9);
    ctx.fill();

    ctx.restore();
  }
}

function drawCitySkyline(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  skyline: SkylineBuilding[]
): void {
  const horizonBaseY = height;

  for (const layer of ['back', 'front'] as const) {
    const isFront = layer === 'front';
    const fill = isFront ? '#1E293B' : '#334155';
    const trim = isFront ? '#283548' : '#3F4F66';
    const outline = '#0F172A';

    for (let i = 0; i < skyline.length; i += 1) {
      const b = skyline[i];
      if (b.layer !== layer) {
        continue;
      }

      const topY = horizonBaseY - b.height;

      ctx.fillStyle = fill;
      ctx.strokeStyle = outline;
      ctx.lineWidth = isFront ? 2.5 : 1.5;

      ctx.beginPath();
      if (b.roofStyle === 'slanted') {
        ctx.moveTo(b.x, horizonBaseY);
        ctx.lineTo(b.x, topY + 14);
        ctx.lineTo(b.x + b.width, topY);
        ctx.lineTo(b.x + b.width, horizonBaseY);
      } else {
        ctx.rect(b.x, topY, b.width, b.height);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (b.roofStyle === 'stepped') {
        const capW = Math.round(b.width * 0.56);
        const capX = b.x + Math.round((b.width - capW) * 0.5);
        const capH = 14;
        ctx.fillStyle = trim;
        ctx.fillRect(capX, topY - capH, capW, capH);
        ctx.strokeRect(capX, topY - capH, capW, capH);
      } else if (b.roofStyle === 'antenna') {
        const spireX = b.x + Math.round(b.width * 0.5);
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(spireX, topY);
        ctx.lineTo(spireX, topY - 22);
        ctx.stroke();

        ctx.fillStyle = '#F87171';
        ctx.beginPath();
        ctx.arc(spireX, topY - 23, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (isFront) {
        const padX = 9;
        const padY = 14;
        const cellW = (b.width - padX * 2) / b.windowCols;
        const winW = Math.max(4, Math.min(8, cellW * 0.52));
        const winH = 8;

        for (let row = 0; row < b.windowRows - 1; row += 1) {
          for (let col = 0; col < b.windowCols; col += 1) {
            const hash = (b.litSeed + row * 17 + col * 31) % 11;
            if (hash > 3) {
              continue;
            }
            const wx = b.x + padX + col * cellW + (cellW - winW) * 0.5;
            const wy = topY + padY + row * 22;
            if (wy + winH > horizonBaseY - 8) {
              continue;
            }
            ctx.fillStyle = hash === 0 ? '#FDE047' : '#38BDF8';
            ctx.globalAlpha = hash === 0 ? 0.55 : 0.28;
            ctx.fillRect(wx, wy, winW, winH);
          }
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, height - 6, width, 6);
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: BurstParticle[]
): void {
  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    if (!p.active) {
      continue;
    }

    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (0.45 + alpha * 0.65), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemies(
  ctx: CanvasRenderingContext2D,
  enemies: Enemy[],
  elapsedTime: number
): void {
  for (let i = 0; i < enemies.length; i += 1) {
    const e = enemies[i];
    if (e.kind === 'blaster') {
      drawBlaster(ctx, e);
    } else if (e.kind === 'drone') {
      drawDrone(ctx, e, elapsedTime);
    } else {
      drawRusher(ctx, e);
    }
  }
}

function drawRusher(ctx: CanvasRenderingContext2D, e: Enemy): void {
  const squishX = 1 + Math.sin(e.wobblePhase) * 0.12;
  const squishY = 1 - Math.sin(e.wobblePhase) * 0.1;

  ctx.save();
  ctx.translate(e.x, e.y);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, e.radius * 1.15, e.radius * 0.85, e.radius * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(e.angle - DEFAULT_AIM_ANGLE);
  ctx.scale(squishX, squishY);

  const r = e.radius;
  ctx.fillStyle = '#9333EA';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.95, -r * 0.95, r * 1.15, -r * 0.1, r * 0.95, r * 0.65);
  ctx.bezierCurveTo(r * 0.72, r * 1.1, r * 0.22, r * 0.92, 0, r * 1.04);
  ctx.bezierCurveTo(-r * 0.22, r * 0.92, -r * 0.72, r * 1.1, -r * 0.95, r * 0.65);
  ctx.bezierCurveTo(-r * 1.15, -r * 0.1, -r * 0.95, -r * 0.95, 0, -r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#C084FC';
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.35, r * 0.42, r * 0.24, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FEF08A';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.38, r * 0.2, 0, Math.PI * 2);
  ctx.arc(r * 0.3, -r * 0.38, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.44, r * 0.08, 0, Math.PI * 2);
  ctx.arc(r * 0.28, -r * 0.44, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBlaster(ctx: CanvasRenderingContext2D, e: Enemy): void {
  const r = e.radius;
  const isCharging = e.fireTimer <= 0.4;

  ctx.save();
  ctx.translate(e.x, e.y);

  // Drop shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, r * 1.25, r * 0.85, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(e.angle - DEFAULT_AIM_ANGLE);

  // Orange diamond-shaped chassis
  ctx.fillStyle = '#F97316';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.15);
  ctx.lineTo(r * 1.05, 0);
  ctx.lineTo(0, r * 1.15);
  ctx.lineTo(-r * 1.05, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner orange bevel highlight
  ctx.fillStyle = '#FDBA74';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.72);
  ctx.lineTo(r * 0.56, 0);
  ctx.lineTo(0, -r * 0.12);
  ctx.lineTo(-r * 0.56, 0);
  ctx.closePath();
  ctx.fill();

  // Aiming blaster core / telegraph glow
  ctx.fillStyle = isCharging ? '#FEF08A' : '#FFFFFF';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, -r * 0.18, r * (isCharging ? 0.34 : 0.26), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawDrone(
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  elapsedTime: number
): void {
  const r = e.radius;
  const tilt = Math.sin(e.wobblePhase) * 0.18;
  const isCharging = e.fireTimer <= 0.35;

  ctx.save();
  ctx.translate(e.x, e.y);

  // Drop shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, r * 1.12, r * 1.05, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(tilt);

  // Yellow flying saucer outer disc
  ctx.fillStyle = '#FACC15';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.12, r * 1.25, r * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Rim highlight
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, r * 0.02, r * 0.85, r * 0.22, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // Glass cockpit dome
  ctx.fillStyle = isCharging ? '#FB7185' : '#38BDF8';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, -r * 0.06, r * 0.56, Math.PI, 0);
  ctx.quadraticCurveTo(0, r * 0.22, -r * 0.56, -r * 0.06);
  ctx.fill();
  ctx.stroke();

  // Dome sheen
  ctx.fillStyle = '#E0F2FE';
  ctx.beginPath();
  ctx.ellipse(-r * 0.18, -r * 0.26, r * 0.18, r * 0.09, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Blinking saucer lights
  const pulse = Math.floor(elapsedTime * 8) % 3;
  for (let li = -1; li <= 1; li += 1) {
    const active = li + 1 === pulse;
    ctx.fillStyle = active ? '#FFFFFF' : '#EA580C';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(li * r * 0.55, r * 0.26, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: Projectile[]
): void {
  for (let i = 0; i < projectiles.length; i += 1) {
    const p = projectiles[i];

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    ctx.fillStyle = 'rgba(250, 204, 21, 0.36)';
    ctx.beginPath();
    ctx.ellipse(-2, 0, p.radius * 2.1, p.radius * 1.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius * 1.5, p.radius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FEF9C3';
    ctx.beginPath();
    ctx.ellipse(1.5, 0, p.radius * 0.78, p.radius * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawEnemyProjectiles(
  ctx: CanvasRenderingContext2D,
  enemyProjectiles: EnemyProjectile[]
): void {
  for (let i = 0; i < enemyProjectiles.length; i += 1) {
    const p = enemyProjectiles[i];
    const isBoss = p.kind === 'boss';
    const isDrone = p.kind === 'drone';

    ctx.save();
    ctx.translate(p.x, p.y);

    // Outer hazard halo
    ctx.fillStyle = isBoss
      ? 'rgba(192, 132, 252, 0.42)'
      : isDrone
        ? 'rgba(244, 63, 94, 0.35)'
        : 'rgba(249, 115, 22, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 1.9, 0, Math.PI * 2);
    ctx.fill();

    // Solid projectile sphere with dark outline
    ctx.fillStyle = isBoss ? '#C026D3' : isDrone ? '#FB7185' : '#F97316';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = isBoss ? 2.6 : 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isBoss ? '#FEF08A' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-1.5, -1.5, p.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawBoss(
  ctx: CanvasRenderingContext2D,
  boss: BossEnemy,
  playerX: number,
  playerY: number,
  elapsedTime: number
): void {
  const r = boss.radius;
  const isFlashing = boss.hitFlashTimer > 0;
  const isWindup = boss.phase === 'charge_windup';
  const isCharging = boss.phase === 'charge';

  // Charge windup sightline telegraph so player can read the rush target
  if (isWindup) {
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 113, 133, 0.65)';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(boss.x, boss.y);
    ctx.lineTo(boss.chargeTargetX, boss.chargeTargetY);
    ctx.stroke();

    const pulseR = 16 + Math.sin(elapsedTime * 18) * 4;
    ctx.setLineDash([]);
    ctx.strokeStyle = '#FB7185';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(boss.chargeTargetX, boss.chargeTargetY, pulseR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(boss.x, boss.y);

  // Ground shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, r * 1.12, r * 0.96, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pulsing aura during windup / charge
  if (isWindup || isCharging) {
    const auraScale = 1.18 + Math.sin(elapsedTime * 20) * 0.06;
    ctx.fillStyle = isCharging
      ? 'rgba(244, 63, 94, 0.26)'
      : 'rgba(250, 204, 21, 0.24)';
    ctx.beginPath();
    ctx.arc(0, 0, r * auraScale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Menacing horned crown / shoulder spikes
  ctx.fillStyle = isFlashing ? '#F3E8FF' : '#3B0764';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  for (const side of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.45, -r * 0.72);
    ctx.lineTo(side * r * 1.02, -r * 1.08);
    ctx.lineTo(side * r * 0.88, -r * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(side * r * 0.84, -r * 0.15);
    ctx.lineTo(side * r * 1.16, r * 0.12);
    ctx.lineTo(side * r * 0.84, r * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Main dark purple armored body
  ctx.fillStyle = isFlashing ? '#F5F3FF' : '#4C1D95';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner armor crest highlight
  ctx.fillStyle = isFlashing ? '#FFFFFF' : '#6D28D9';
  ctx.beginPath();
  ctx.ellipse(-r * 0.16, -r * 0.24, r * 0.64, r * 0.44, -0.25, 0, Math.PI * 2);
  ctx.fill();

  // Lower jaw / armor plate
  ctx.fillStyle = isFlashing ? '#E9D5FF' : '#2E1065';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-r * 0.54, r * 0.22, r * 1.08, r * 0.36, 10);
  ctx.fill();
  ctx.stroke();

  // Armor vents on jaw plate
  ctx.fillStyle = isWindup || isCharging ? '#FB7185' : '#A855F7';
  for (let vi = -1; vi <= 1; vi += 1) {
    ctx.fillRect(vi * r * 0.24 - 4, r * 0.3, 8, r * 0.2);
  }

  // Glowing eyes subtly tracking target direction
  const lookAngle = isWindup || isCharging
    ? Math.atan2(boss.chargeTargetY - boss.y, boss.chargeTargetX - boss.x)
    : Math.atan2(playerY - boss.y, playerX - boss.x);
  const lookX = Math.cos(lookAngle) * 3.5;
  const lookY = Math.sin(lookAngle) * 2.5;
  const eyeGlow = isWindup || isCharging ? '#FB7185' : '#FDE047';
  const eyeAura = isWindup || isCharging
    ? 'rgba(251, 113, 133, 0.5)'
    : 'rgba(253, 224, 71, 0.45)';

  for (const side of [-1, 1] as const) {
    const ex = side * r * 0.34;
    const ey = -r * 0.14;

    // Eye outer glow
    ctx.fillStyle = eyeAura;
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.24, 0, Math.PI * 2);
    ctx.fill();

    // Fierce angry angled eye socket (outer corner raised, inner corner lowered)
    ctx.fillStyle = eyeGlow;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(ex - side * r * 0.16, ey - r * 0.02);
    ctx.lineTo(ex + side * r * 0.2, ey - r * 0.16);
    ctx.lineTo(ex + side * r * 0.14, ey + r * 0.08);
    ctx.lineTo(ex - side * r * 0.12, ey + r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tracking pupil
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(ex + lookX, ey + lookY, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawHero(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  elapsedTime: number,
  lowLifeWarning = false
): void {
  const { x, y, radius, aimAngle, invulnTimer, shieldTimer } = player;

  const isFlashingWhite =
    shieldTimer <= 0 &&
    invulnTimer > 0 &&
    Math.floor(invulnTimer * 16) % 2 === 0;
  const capeColors = getHeroCapeColors({
    isFlashingWhite,
    lowLifeActive: lowLifeWarning,
    elapsedTime,
  });
  const flutter = Math.sin(elapsedTime * 5.2) * (radius * 0.14);
  const secondaryFlutter = Math.cos(elapsedTime * 3.8) * (radius * 0.08);

  ctx.save();
  ctx.translate(x, y);
  if (shieldTimer <= 0 && invulnTimer > 0) {
    ctx.globalAlpha = isFlashingWhite ? 0.48 : 0.92;
  }

  ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, radius * 1.58, radius * 0.92, radius * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(aimAngle - DEFAULT_AIM_ANGLE);

  // Red cartoon cape (slow bright-red pulse when down to last life)
  const buildCapePath = () => {
    ctx.beginPath();
    ctx.moveTo(-radius * 0.82, radius * 0.12);
    ctx.quadraticCurveTo(
      -radius * 1.24 + secondaryFlutter,
      radius * 1.12,
      -radius * 0.9 + flutter,
      radius * 1.85
    );
    ctx.quadraticCurveTo(flutter * 0.6, radius * 1.56, 0, radius * 1.76);
    ctx.quadraticCurveTo(
      radius * 0.45 + flutter * 0.4,
      radius * 1.56,
      radius * 0.9 + flutter,
      radius * 1.85
    );
    ctx.quadraticCurveTo(
      radius * 1.24 - secondaryFlutter,
      radius * 1.12,
      radius * 0.82,
      radius * 0.12
    );
    ctx.closePath();
  };

  if (capeColors.pulseStrength > 0.05) {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 75, 75, ${(capeColors.pulseStrength * 0.55).toFixed(3)})`;
    ctx.lineWidth = 9;
    ctx.lineJoin = 'round';
    buildCapePath();
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = capeColors.mainFill;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';

  buildCapePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = capeColors.shadowFill;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.4, radius * 0.45);
  ctx.quadraticCurveTo(
    flutter * 0.4,
    radius * 1.24,
    -radius * 0.16 + flutter * 0.6,
    radius * 1.56
  );
  ctx.lineTo(radius * 0.16 + flutter * 0.6, radius * 1.56);
  ctx.quadraticCurveTo(
    flutter * 0.2,
    radius * 1.14,
    radius * 0.4,
    radius * 0.45
  );
  ctx.closePath();
  ctx.fill();

  // Hero body: blue circle
  ctx.fillStyle = isFlashingWhite ? '#E0F2FE' : '#2563EB';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!isFlashingWhite) {
    ctx.fillStyle = '#60A5FA';
    ctx.beginPath();
    ctx.arc(
      -radius * 0.22,
      -radius * 0.22,
      radius * 0.62,
      Math.PI * 0.9,
      Math.PI * 1.85
    );
    ctx.fill();
  }

  // Small white visor
  const visorW = radius * 0.96;
  const visorH = radius * 0.38;
  const visorX = -visorW * 0.5;
  const visorY = -radius * 0.64;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(visorX, visorY, visorW, visorH, visorH * 0.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#BAE6FD';
  ctx.beginPath();
  ctx.roundRect(
    visorX + visorW * 0.16,
    visorY + visorH * 0.2,
    visorW * 0.44,
    visorH * 0.26,
    2
  );
  ctx.fill();

  ctx.restore();

  // Glowing shield ring around the player when shield is active
  if (shieldTimer > 0) {
    const pulse = 1 + Math.sin(elapsedTime * 10) * 0.05;
    const isEnding = shieldTimer < 0.7 && Math.floor(elapsedTime * 16) % 2 === 0;
    const shieldRadius = (radius + 14) * pulse;

    ctx.globalAlpha = isEnding ? 0.55 : 0.92;

    // Soft glowing outer aura
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Translucent interior forcefield tint
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    ctx.fill();

    // Crisp bright glowing energy ring
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
