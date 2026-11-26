import type { GameHudSnapshot } from '../game/types';

interface TopHudProps {
  hud: GameHudSnapshot;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 sm:h-7 sm:w-7"
      aria-hidden="true"
    >
      <path
        d="M12 20.5C12 20.5 4 15.1 4 9.2C4 6.4 6.2 4.3 8.8 4.3C10.3 4.3 11.4 5 12 6C12.6 5 13.7 4.3 15.2 4.3C17.8 4.3 20 6.4 20 9.2C20 15.1 12 20.5 12 20.5Z"
        fill={filled ? '#EF4444' : '#334155'}
        stroke="#0F172A"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {filled && (
        <path
          d="M7.2 8.2C7.2 7 8.1 6.2 9.2 6.2"
          stroke="#FECACA"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function ShieldIcon({ active, ready }: { active: boolean; ready: boolean }) {
  const outerFill = active ? '#FACC15' : ready ? '#38BDF8' : '#64748B';
  const innerFill = active ? '#FEF08A' : ready ? '#7DD3FC' : '#94A3B8';
  const highlightFill = active ? '#FFFFFF' : ready ? '#E0F2FE' : '#CBD5E1';

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 sm:h-7 sm:w-7"
      aria-hidden="true"
    >
      <path
        d="M12 3L19.5 6.2V11.8C19.5 16.4 16.3 20.1 12 21.5C7.7 20.1 4.5 16.4 4.5 11.8V6.2L12 3Z"
        fill={outerFill}
        stroke="#0F172A"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M12 5.4L17.2 7.6V11.6C17.2 14.9 15 17.7 12 19C9 17.7 6.8 14.9 6.8 11.6V7.6L12 5.4Z"
        fill={innerFill}
      />
      <path
        d="M12 5.4V19C9 17.7 6.8 14.9 6.8 11.6V7.6L12 5.4Z"
        fill={highlightFill}
        opacity="0.65"
      />
    </svg>
  );
}

export function TopHud({ hud }: TopHudProps) {
  const isActive = hud.shieldStatus === 'ACTIVE';
  const isReady = hud.shieldStatus === 'READY';

  const formattedTime =
    hud.shieldTimeRemaining >= 1
      ? `${Math.round(hud.shieldTimeRemaining)}s`
      : `${hud.shieldTimeRemaining.toFixed(1)}s`;
  const shieldKicker = isActive
    ? 'Shield On'
    : isReady
      ? 'Shield'
      : 'Cooldown';
  const shieldReadout = isReady ? 'READY' : formattedTime;
  const shieldAria = isReady
    ? 'Shield status: READY'
    : isActive
      ? `Shield active: ${formattedTime} remaining`
      : `Shield cooldown: ${formattedTime} remaining`;

  return (
    <header
      data-testid="top-hud"
      aria-label="Game HUD"
      className="pointer-events-none fixed inset-x-0 top-0 z-20 px-3 pt-3 sm:px-8 sm:pt-5"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:grid sm:grid-cols-3 sm:gap-3">
        {/* Left: Lives as heart icons */}
        <div
          className="flex shrink-0 items-center justify-self-start gap-2 rounded-xl border-2 border-[#0F172A] bg-[#0F172A] px-2.5 py-1.5 shadow-[0_4px_0_rgba(15,23,42,0.45)] sm:gap-2.5 sm:px-3.5 sm:py-2"
          aria-label={`Lives: ${hud.lives} of ${hud.maxLives}`}
        >
          <span className="hidden text-[11px] font-bold tracking-wider text-sky-200 uppercase sm:inline">
            Lives
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5">
            {Array.from({ length: hud.maxLives }).map((_, index) => (
              <HeartIcon key={index} filled={index < hud.lives} />
            ))}
          </div>
        </div>

        {/* Center: Stage label and Score */}
        <div className="flex shrink-0 items-center justify-self-center gap-2 rounded-xl border-2 border-[#0F172A] bg-[#0F172A] px-2.5 py-1.5 shadow-[0_4px_0_rgba(15,23,42,0.45)] sm:gap-4 sm:px-5 sm:py-2">
          <span
            data-testid="hud-stage"
            className="font-display text-xs font-black tracking-wide text-amber-300 tabular-nums sm:text-xl whitespace-nowrap"
          >
            STAGE {hud.stage} / {hud.maxStages}
          </span>
          <span className="h-4 w-px bg-slate-700 sm:h-6" aria-hidden="true" />
          <div
            data-testid="hud-score"
            aria-label={`Score: ${hud.score}`}
            className="flex items-baseline gap-1 sm:gap-1.5 whitespace-nowrap"
          >
            <span className="text-[9px] font-bold tracking-wider text-sky-200 uppercase sm:text-[11px]">
              Score
            </span>
            <span className="font-display text-xs font-black text-white tabular-nums sm:text-xl">
              {hud.score}
            </span>
          </div>
        </div>

        {/* Right: Shield status readout */}
        <div
          data-testid="hud-shield"
          className="flex min-w-[82px] shrink-0 items-center justify-self-end gap-2 rounded-xl border-2 border-[#0F172A] bg-[#0F172A] px-2.5 py-1.5 shadow-[0_4px_0_rgba(15,23,42,0.45)] sm:min-w-[116px] sm:gap-2.5 sm:px-3.5 sm:py-2"
          aria-label={shieldAria}
        >
          <ShieldIcon active={isActive} ready={isReady} />
          <div className="flex flex-col leading-none">
            <span className="text-[9px] font-bold tracking-wider text-sky-200 uppercase sm:text-[10px]">
              {shieldKicker}
            </span>
            <span
              className={`font-display text-xs font-extrabold tracking-wide uppercase tabular-nums sm:text-base ${
                isActive
                  ? 'text-amber-300'
                  : isReady
                    ? 'text-sky-300'
                    : 'text-slate-300'
              }`}
            >
              {shieldReadout}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
