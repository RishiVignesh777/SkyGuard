interface PauseModalProps {
  onResume: () => void;
  onReturnTitle: () => void;
}

export function PauseModal({ onResume, onReturnTitle }: PauseModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#0F172A]/55 px-4"
    >
      <div className="w-full max-w-sm rounded-2xl border-3 border-[#0F172A] bg-white p-7 text-center shadow-[0_8px_0_#0F172A]">
        <h2
          id="pause-title"
          className="font-display text-3xl font-black tracking-wide text-[#0F172A]"
        >
          PAUSED
        </h2>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Press Escape or P to resume patrol.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="w-full cursor-pointer rounded-xl border-2 border-[#0F172A] bg-blue-600 px-5 py-3 font-display text-base font-extrabold tracking-wide text-white shadow-[0_4px_0_#0F172A] transition-transform duration-150 hover:bg-blue-500 active:translate-y-0.5 active:shadow-[0_2px_0_#0F172A]"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full cursor-pointer rounded-xl border-2 border-[#0F172A] bg-slate-100 px-5 py-3 font-display text-base font-extrabold tracking-wide text-[#0F172A] shadow-[0_4px_0_#0F172A] transition-transform duration-150 hover:bg-slate-200 active:translate-y-0.5 active:shadow-[0_2px_0_#0F172A]"
          >
            Title Screen
          </button>
        </div>
      </div>
    </div>
  );
}
