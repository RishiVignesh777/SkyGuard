interface StageBannerProps {
  clearedStage: number;
}

export function StageBanner({ clearedStage }: StageBannerProps) {
  return (
    <div
      data-testid="stage-cleared-banner"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-24 z-20 flex justify-center px-4 sm:top-28"
    >
      <div className="rounded-2xl border-2 border-[#0F172A] bg-amber-300 px-7 py-3 shadow-[0_6px_0_#0F172A]">
        <p className="font-display text-2xl font-black tracking-wide text-[#0F172A] tabular-nums sm:text-3xl whitespace-nowrap">
          STAGE {clearedStage} CLEARED!
        </p>
      </div>
    </div>
  );
}
