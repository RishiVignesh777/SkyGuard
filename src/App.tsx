import { useCallback, useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameOverOverlay } from './components/GameOverOverlay';
import { PauseModal } from './components/PauseModal';
import { StageBanner } from './components/StageBanner';
import { StartOverlay } from './components/StartOverlay';
import { TopHud } from './components/TopHud';
import {
  createInitialHudSnapshot,
  TOTAL_STAGES,
  transitionGameState,
} from './game/engine';
import type { GameOutcome, GameState, ShieldStatus } from './game/types';

function getInitialGameState(): GameState {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return 'playing';
    }
  }
  return 'title';
}

function getInitialStage(): number {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const parsed = Number.parseInt(params.get('stage') ?? '', 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= TOTAL_STAGES) {
      return parsed;
    }
  }
  return 1;
}

export default function App() {
  const [initialStage] = useState<number>(getInitialStage);
  const [gameState, setGameState] = useState<GameState>(getInitialGameState);
  const [hud, setHud] = useState(() => createInitialHudSnapshot(initialStage));
  const [clearedStageBanner, setClearedStageBanner] = useState<number | null>(
    null
  );
  const [runId, setRunId] = useState(1);
  const [endSummary, setEndSummary] = useState<{
    outcome: GameOutcome;
    stageReached: number;
    enemiesDefeated: number;
  }>({
    outcome: 'defeat',
    stageReached: 1,
    enemiesDefeated: 0,
  });

  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  const handleStart = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setGameState((prev) => transitionGameState(prev, 'START'));
  }, []);

  const handleRetry = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setHud(createInitialHudSnapshot(initialStage));
    setClearedStageBanner(null);
    setRunId((id) => id + 1);
    setGameState((prev) => transitionGameState(prev, 'RESTART'));
  }, [initialStage]);

  const handleResume = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setGameState((prev) => transitionGameState(prev, 'RESUME'));
  }, []);

  const handleReturnTitle = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setHud(createInitialHudSnapshot(initialStage));
    setClearedStageBanner(null);
    setRunId((id) => id + 1);
    setGameState((prev) => transitionGameState(prev, 'RETURN_TITLE'));
  }, [initialStage]);

  const handleLivesChange = useCallback((lives: number) => {
    setHud((prev) => (prev.lives === lives ? prev : { ...prev, lives }));
  }, []);

  const handleStageChange = useCallback((stage: number) => {
    setHud((prev) => (prev.stage === stage ? prev : { ...prev, stage }));
  }, []);

  const handleShieldChange = useCallback(
    (shieldStatus: ShieldStatus, shieldTimeRemaining: number) => {
      setHud((prev) =>
        prev.shieldStatus === shieldStatus &&
        prev.shieldTimeRemaining === shieldTimeRemaining
          ? prev
          : { ...prev, shieldStatus, shieldTimeRemaining }
      );
    },
    []
  );

  const handleRunEnd = useCallback(
    (outcome: GameOutcome, stageReached: number, enemiesDefeated: number) => {
      setEndSummary({ outcome, stageReached, enemiesDefeated });
      setGameState((prev) => transitionGameState(prev, 'GAME_OVER'));
    },
    []
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      if (gameState === 'title') {
        if (event.code === 'Space' || event.code === 'Enter') {
          event.preventDefault();
          handleStart();
        }
        return;
      }

      if (gameState === 'gameover') {
        if (event.code === 'Space' || event.code === 'Enter') {
          event.preventDefault();
          handleRetry();
        }
        return;
      }

      if (gameState === 'playing') {
        if (event.code === 'Escape' || event.code === 'KeyP') {
          event.preventDefault();
          setGameState((prev) => transitionGameState(prev, 'PAUSE'));
        }
        return;
      }

      if (gameState === 'paused') {
        if (event.code === 'Escape' || event.code === 'KeyP') {
          event.preventDefault();
          handleResume();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [gameState, handleResume, handleRetry, handleStart]);

  return (
    <main className="relative h-full w-full overflow-hidden">
      <GameCanvas
        gameState={gameState}
        initialStage={initialStage}
        runId={runId}
        onLivesChange={handleLivesChange}
        onStageChange={handleStageChange}
        onShieldChange={handleShieldChange}
        onStageClearedBannerChange={setClearedStageBanner}
        onRunEnd={handleRunEnd}
      />

      {gameState !== 'title' && <TopHud hud={hud} />}

      {gameState === 'playing' && clearedStageBanner !== null && (
        <StageBanner clearedStage={clearedStageBanner} />
      )}

      {gameState === 'title' && <StartOverlay onStart={handleStart} />}

      {gameState === 'paused' && (
        <PauseModal onResume={handleResume} onReturnTitle={handleReturnTitle} />
      )}

      {gameState === 'gameover' && (
        <GameOverOverlay
          outcome={endSummary.outcome}
          stageReached={endSummary.stageReached}
          maxStages={hud.maxStages}
          enemiesDefeated={endSummary.enemiesDefeated}
          onRetry={handleRetry}
        />
      )}
    </main>
  );
}
