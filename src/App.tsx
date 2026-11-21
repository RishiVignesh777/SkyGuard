import { useCallback, useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { PauseModal } from './components/PauseModal';
import { StartOverlay } from './components/StartOverlay';
import { TopHud } from './components/TopHud';
import { createInitialHudSnapshot, transitionGameState } from './game/engine';
import type { GameState } from './game/types';

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
  const [hud] = useState(createInitialHudSnapshot);

  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  const handleStart = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setGameState((prev) => transitionGameState(prev, 'START'));
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
    setGameState((prev) => transitionGameState(prev, 'RETURN_TITLE'));
  }, []);

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
  }, [gameState, handleResume, handleStart]);

  return (
    <main className="relative h-full w-full overflow-hidden">
      <GameCanvas gameState={gameState} />

      {gameState !== 'title' && <TopHud hud={hud} />}

      {gameState === 'title' && <StartOverlay onStart={handleStart} />}

      {gameState === 'paused' && (
        <PauseModal onResume={handleResume} onReturnTitle={handleReturnTitle} />
      )}
    </main>
  );
}
