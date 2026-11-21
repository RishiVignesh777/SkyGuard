import { DEFAULT_AIM_ANGLE } from './engine';
import type { CloudSpec, PlayerState, Projectile, SkylineBuilding } from './types';

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
  } = params;

  ctx.drawImage(backdropCanvas, 0, 0, width, height);
  drawClouds(ctx, clouds);
  drawProjectiles(ctx, projectiles);
  drawHero(ctx, player, elapsedTime);
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

  // Soft cartoon sun glow in the upper right sky
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

function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: Projectile[]
): void {
  for (let i = 0; i < projectiles.length; i += 1) {
    const p = projectiles[i];

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Outer cartoon energy halo
    ctx.fillStyle = 'rgba(250, 204, 21, 0.36)';
    ctx.beginPath();
    ctx.ellipse(-2, 0, p.radius * 2.1, p.radius * 1.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Elongated energy bolt with bold cartoon outline
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius * 1.5, p.radius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bright white-gold core
    ctx.fillStyle = '#FEF9C3';
    ctx.beginPath();
    ctx.ellipse(1.5, 0, p.radius * 0.78, p.radius * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawHero(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  elapsedTime: number
): void {
  const { x, y, radius, aimAngle } = player;

  const flutter = Math.sin(elapsedTime * 5.2) * (radius * 0.14);
  const secondaryFlutter = Math.cos(elapsedTime * 3.8) * (radius * 0.08);

  ctx.save();
  ctx.translate(x, y);

  // Ground/air drop shadow (unrotated, slightly below hero)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, radius * 1.58, radius * 0.92, radius * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rotate hero sprite so visor faces aimAngle and cape trails behind
  ctx.rotate(aimAngle - DEFAULT_AIM_ANGLE);

  // Red cartoon cape with heroic sweep
  ctx.fillStyle = '#EF4444';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';

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
  ctx.fill();
  ctx.stroke();

  // Inner cape fold shadow
  ctx.fillStyle = '#B91C1C';
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
  ctx.fillStyle = '#2563EB';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Top-left suit highlight
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

  // Small white visor facing forward toward cursor
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
}
