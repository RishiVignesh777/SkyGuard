import { useCallback, useEffect, useState } from 'react';
import { BossHealthBar } from './components/BossHealthBar';
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

function getInitialBossMode(): boolean {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('boss') === '1';
  }
  return false;
}

function getInitialStage(): number {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('boss') === '1') {
      return TOTAL_STAGES;
    }
    const parsed = Number.parseInt(params.get('stage') ?? '', 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= TOTAL_STAGES) {
      return parsed;
    }
  }
  return 1;
}

export default function App() {
  const [startStage, setStartStage] = useState<number>(getInitialStage);
  const [startBossMode, setStartBossMode] = useState<boolean>(getInitialBossMode);
  const [gameState, setGameState] = useState<GameState>(getInitialGameState);
  const [hud, setHud] = useState(() => createInitialHudSnapshot(startStage));
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [bossHud, setBossHud] = useState<{ hp: number; maxHp: number } | null>(
    null
  );
  const [runId, setRunId] = useState(1);
  const [endSummary, setEndSummary] = useState<{
    outcome: GameOutcome;
    stageReached: number;
    enemiesDefeated: number;
    score: number;
  }>({
    outcome: 'defeat',
    stageReached: 1,
    enemiesDefeated: 0,
    score: 0,
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
    setStartStage(1);
    setStartBossMode(false);
    setHud(createInitialHudSnapshot(1));
    setBannerMessage(null);
    setBossHud(null);
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
    setStartStage(1);
    setStartBossMode(false);
    setHud(createInitialHudSnapshot(1));
    setBannerMessage(null);
    setBossHud(null);
    setRunId((id) => id + 1);
    setGameState((prev) => transitionGameState(prev, 'RETURN_TITLE'));
  }, []);

  const handleLivesChange = useCallback((lives: number) => {
    setHud((prev) => (prev.lives === lives ? prev : { ...prev, lives }));
  }, []);

  const handleStageChange = useCallback((stage: number) => {
    setHud((prev) => (prev.stage === stage ? prev : { ...prev, stage }));
  }, []);

  const handleScoreChange = useCallback((score: number) => {
    setHud((prev) => (prev.score === score ? prev : { ...prev, score }));
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
    (
      outcome: GameOutcome,
      stageReached: number,
      enemiesDefeated: number,
      score: number
    ) => {
      setEndSummary({ outcome, stageReached, enemiesDefeated, score });
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
        startStage={startStage}
        startBossMode={startBossMode}
        runId={runId}
        onLivesChange={handleLivesChange}
        onStageChange={handleStageChange}
        onScoreChange={handleScoreChange}
        onShieldChange={handleShieldChange}
        onBannerMessageChange={setBannerMessage}
        onBossChange={setBossHud}
        onRunEnd={handleRunEnd}
      />

      {gameState !== 'title' && <TopHud hud={hud} />}

      {gameState !== 'title' && bossHud !== null && (
        <BossHealthBar hp={bossHud.hp} maxHp={bossHud.maxHp} />
      )}

      {gameState === 'playing' && bannerMessage !== null && (
        <StageBanner message={bannerMessage} />
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
          score={endSummary.score}
          onRetry={handleRetry}
        />
      )}
    </main>
  );
}
