interface BossHealthBarProps {
  hp: number;
  maxHp: number;
}

export function BossHealthBar({ hp, maxHp }: BossHealthBarProps) {
  const safeMax = Math.max(1, maxHp);
  const clampedHp = Math.max(0, Math.min(safeMax, hp));
  const pct = (clampedHp / safeMax) * 100;

  return (
    <div
      data-testid="boss-health-bar"
      role="region"
      aria-label={`Final Boss health: ${clampedHp} of ${safeMax}`}
      className="pointer-events-none fixed inset-x-0 top-[58px] z-20 flex justify-center px-3 sm:top-[82px] sm:px-8"
    >
      <div className="w-full max-w-md rounded-xl border-2 border-[#0F172A] bg-[#0F172A] px-3.5 py-2 shadow-[0_4px_0_rgba(15,23,42,0.45)]">
        <div className="flex items-center justify-between gap-3 leading-none">
          <span className="font-display text-xs font-black tracking-wider text-purple-300 uppercase sm:text-sm">
            Final Boss
          </span>
          <span
            data-testid="boss-hp-readout"
            className="font-display text-xs font-black text-white tabular-nums sm:text-sm"
          >
            {clampedHp} / {safeMax}
          </span>
        </div>

        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full border-2 border-slate-950 bg-slate-800 sm:h-3.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-rose-500 transition-[width] duration-100"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
