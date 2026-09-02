import { Game } from './game/Game';

const container = document.getElementById('game');
if (!container) {
  throw new Error('Game container not found');
}

container.style.position = 'fixed';
container.style.inset = '0';
container.style.width = '100vw';
container.style.height = '100vh';
container.style.overflow = 'hidden';
container.style.touchAction = 'none';

const game = new Game(container);
game.start();
