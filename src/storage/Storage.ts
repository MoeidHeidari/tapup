export type DifficultyLevel = 'easy' | 'medium' | 'hard';

const HIGH_SCORE_PREFIX = 'tapup_highscore_';
const LEGACY_HIGH_SCORE_KEY = 'tapup_highscore';

migrateLegacyHighScore();

export function getHighScore(difficulty: DifficultyLevel): number {
  const value = localStorage.getItem(HIGH_SCORE_PREFIX + difficulty);
  return value ? parseInt(value, 10) || 0 : 0;
}

export function setHighScore(difficulty: DifficultyLevel, score: number): void {
  localStorage.setItem(HIGH_SCORE_PREFIX + difficulty, String(score));
}

function migrateLegacyHighScore(): void {
  const legacy = localStorage.getItem(LEGACY_HIGH_SCORE_KEY);
  if (legacy === null) return;
  const value = parseInt(legacy, 10) || 0;
  const current = getHighScore('medium');
  if (value > current) {
    setHighScore('medium', value);
  }
  localStorage.removeItem(LEGACY_HIGH_SCORE_KEY);
}