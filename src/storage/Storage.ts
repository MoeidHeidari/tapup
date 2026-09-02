const HIGH_SCORE_KEY = 'tapup_highscore';

export function getHighScore(): number {
  const value = localStorage.getItem(HIGH_SCORE_KEY);
  return value ? parseInt(value, 10) || 0 : 0;
}

export function setHighScore(score: number): void {
  localStorage.setItem(HIGH_SCORE_KEY, String(score));
}
