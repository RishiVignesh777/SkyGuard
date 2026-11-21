import { useCallback, useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameOverOverlay } from './components/GameOverOverlay';
import { PauseModal } from './components/PauseModal';
import { StageBanner } from './components/StageBanner';
import { StartOverlay } from './components/StartOverlay';
import { TopHud } from './components/TopHud';
import { createInitialHudSnapshot, transitionGameState } from './game/engine';
import type { GameOutcome, GameState } from './game/types';

function getInitialGameState(): GameState {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return 'playing';
    }
  }
  return 'title';
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>(getInitialGameState);
  const [hud, setHud] = useState(createInitialHudSnapshot);
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
    setHud(createInitialHudSnapshot());
    setClearedStageBanner(null);
    setRunId((id) => id + 1);
    setGameState((prev) => transitionGameState(prev, 'RESTART'));
  }, []);

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
    setHud(createInitialHudSnapshot());
    setClearedStageBanner(null);
    setRunId((id) => id + 1);
    setGameState((prev) => transitionGameState(prev, 'RETURN_TITLE'));
  }, []);

  const handleLivesChange = useCallback((lives: number) => {
    setHud((prev) => (prev.lives === lives ? prev : { ...prev, lives }));
  }, []);

  const handleStageChange = useCallback((stage: number) => {
    setHud((prev) => (prev.stage === stage ? prev : { ...prev, stage }));
  }, []);

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
        runId={runId}
        onLivesChange={handleLivesChange}
        onStageChange={handleStageChange}
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
