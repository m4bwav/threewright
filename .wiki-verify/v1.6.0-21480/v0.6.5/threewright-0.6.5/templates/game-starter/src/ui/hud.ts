// HUD and menus in the DOM, over the canvas (index.html has the markup and CSS).
// Text is only written when a value changes: touching the DOM every frame costs
// layout work for nothing.

import { MAX_HP, STEP, type Game } from '../sim/game.ts';

type Screen = 'loading' | 'play' | 'paused' | 'won' | 'over' | 'error';

const byId = (id: string) => document.getElementById(id)!;

export class Hud {
  private readonly score = byId('score');
  private readonly lives = byId('lives');
  private readonly hint = byId('hint');
  private readonly panel = byId('panel');
  private readonly title = byId('panel-title');
  private readonly text = byId('panel-text');
  private readonly button = byId('panel-button') as HTMLButtonElement;
  private last = '';
  private screen: Screen = 'loading';

  // onAction runs when the panel button is pressed: resume or restart.
  constructor(onAction: (screen: Screen) => void) {
    this.button.addEventListener('click', () => onAction(this.screen));
  }

  update(game: Game | null, paused: boolean): void {
    const screen: Screen = !game ? (this.screen === 'error' ? 'error' : 'loading') : paused ? 'paused' : game.mode;
    const total = game ? game.collected.length : 0;
    const key = `${screen}|${game?.score}|${total}|${game?.hp}`;
    if (key === this.last) return;
    this.last = key;
    this.screen = screen;
    if (game) {
      this.score.textContent = `Gems ${game.score} / ${total}`;
      this.lives.textContent = '♥'.repeat(game.hp) + '♡'.repeat(MAX_HP - game.hp);
    }
    this.hint.textContent = screen === 'loading' ? 'Loading physics…' : 'WASD or arrows to move, Space to jump, Esc to pause, R to restart';
    const panels: Partial<Record<Screen, [string, string, string]>> = {
      paused: ['Paused', 'Press Esc or the button to carry on.', 'Resume'],
      won: ['All gems collected', `Finished in ${game ? (game.tick * STEP).toFixed(1) : 0} s. Press R to play again.`, 'Play again'],
      over: ['Out of lives', 'Press R to try again.', 'Restart'],
    };
    const p = panels[screen];
    this.panel.hidden = !p;
    if (p) [this.title.textContent, this.text.textContent, this.button.textContent] = p;
  }

  error(message: string): void {
    this.screen = 'error';
    this.last = 'error';
    this.hint.textContent = '';
    this.panel.hidden = false;
    this.title.textContent = 'Could not start';
    this.text.textContent = message;
    this.button.hidden = true;
  }
}
