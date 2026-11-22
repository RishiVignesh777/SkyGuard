import type { GameOutcome } from '../game/types';

interface GameOverOverlayProps {
  outcome: GameOutcome;
  stageReached: number;
  maxStages: number;
  enemiesDefeated: number;
  onRetry: () => void;
}

export function GameOverOverlay({
  outcome,
  stageReached,
  maxStages,
  enemiesDefeated,
  onRetry,
}: GameOverOverlayProps) {
  const isVictory = outcome === 'victory';

  return (
    <div
      data-testid="gameover-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#0F172A]/60 px-4"
    >
      <div className="w-full max-w-md rounded-2xl border-3 border-[#0F172A] bg-[#0F172A] p-7 text-center shadow-[0_8px_0_rgba(15,23,42,0.6)]">
        <h2
          id="gameover-title"
          className={`font-display text-4xl font-black tracking-wider sm:text-5xl ${
            isVictory ? 'text-amber-300' : 'text-red-400'
          }`}
        >
          {isVictory ? 'CITY SAVED' : 'GAME OVER'}
        </h2>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border-2 border-slate-700 bg-slate-900 px-3 py-2.5">
            <span className="block text-[11px] font-bold tracking-wider text-sky-200 uppercase">
              Stage
            </span>
            <span className="font-display text-xl font-black text-amber-300 tabular-nums">
              {stageReached} / {maxStages}
            </span>
          </div>
          <div className="rounded-xl border-2 border-slate-700 bg-slate-900 px-3 py-2.5">
            <span className="block text-[11px] font-bold tracking-wider text-sky-200 uppercase">
              Foes Defeated
            </span>
            <span className="font-display text-xl font-black text-white tabular-nums">
              {enemiesDefeated}
            </span>
          </div>
        </div>

        <button
          type="button"
          data-start="true"
          onClick={onRetry}
          className="mt-6 w-full cursor-pointer rounded-xl border-2 border-[#0F172A] bg-amber-300 px-6 py-3.5 font-display text-lg font-black tracking-wide text-[#0F172A] shadow-[0_5px_0_#000000] transition-transform duration-150 hover:bg-amber-200 active:translate-y-1 active:shadow-[0_2px_0_#000000] focus-visible:outline-4 focus-visible:outline-white whitespace-nowrap"
        >
          {isVictory ? 'Press SPACE to run it again.' : 'Press SPACE to try again.'}
        </button>
      </div>
    </div>
  );
}
