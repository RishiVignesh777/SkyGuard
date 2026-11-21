interface StartOverlayProps {
  onStart: () => void;
}

export function StartOverlay({ onStart }: StartOverlayProps) {
  return (
    <div
      data-testid="start-overlay"
      className="fixed inset-0 z-30 flex flex-col items-center justify-start px-6 pt-16 sm:pt-20"
    >
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        {/* Bold Glowing Superhero Emblem + Title */}
        <div className="mb-3 flex items-center justify-center">
          <svg viewBox="0 0 64 36" className="h-11 w-20" aria-hidden="true">
            <path
              d="M4 18L22 6L32 14L42 6L60 18L44 26L32 20L20 26L4 18Z"
              fill="#FACC15"
              stroke="#0F172A"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <circle
              cx="32"
              cy="17"
              r="7"
              fill="#2563EB"
              stroke="#0F172A"
              strokeWidth="2.5"
            />
            <rect
              x="27.5"
              y="14.5"
              width="9"
              height="4"
              rx="2"
              fill="#FFFFFF"
              stroke="#0F172A"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        <h1 className="font-display text-6xl font-black tracking-wider text-amber-300 skyguard-title-glow sm:text-7xl md:text-8xl">
          SKYGUARD
        </h1>

        {/* Instructions panel */}
        <div className="mt-6 max-w-xl rounded-2xl border-2 border-[#0F172A] bg-[#0F172A] px-6 py-4 shadow-[0_6px_0_rgba(15,23,42,0.4)]">
          <p className="text-base font-semibold leading-relaxed text-sky-50 sm:text-lg">
            WASD to move, hold Mouse to blast, SPACE for a temporary shield,
            clear all 5 stages then beat the boss
          </p>
        </div>

        {/* Start Action Prompt */}
        <button
          type="button"
          data-start="true"
          onClick={onStart}
          className="animate-prompt-pulse mt-7 cursor-pointer rounded-xl border-2 border-[#0F172A] bg-amber-300 px-8 py-3.5 font-display text-xl font-black tracking-wide text-[#0F172A] shadow-[0_5px_0_#0F172A] transition-transform duration-150 hover:bg-amber-200 active:translate-y-1 active:shadow-[0_2px_0_#0F172A] focus-visible:outline-4 focus-visible:outline-white whitespace-nowrap"
        >
          Press SPACE to start.
        </button>
      </div>
    </div>
  );
}
