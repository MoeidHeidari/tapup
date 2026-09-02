type PowerType = 'star' | 'magnet' | 'sweep' | 'nova';

const SFX_FILES = {
  start: '/vfx/universfield-video-game-bonus-323603.mp3',
  whiteHit: '/vfx/universfield-game-bonus-03-487857.mp3',
  multiplier: '/vfx/universfield-video-game-bonus-323603.mp3',
  powerStar: '/vfx/universfield-video-game-bonus-323603.mp3',
  powerMagnet: '/vfx/universfield-game-bonus-02-294436.mp3',
  powerSweep: '/vfx/universfield-game-bonus-03-487857.mp3',
  powerNova: '/vfx/universfield-video-game-bonus-323603.mp3',
  gameOver: '/vfx/freesound_community-game-over-arcade-6435.mp3',
  achievement: '/vfx/universfield-game-bonus-03-487857.mp3',
  achievementRare: '/vfx/universfield-video-game-bonus-323603.mp3',
  achievementEpic: '/vfx/universfield-game-bonus-02-294436.mp3',
} as const;

type SfxKey = keyof typeof SFX_FILES;

const SFX_COOLDOWN_MS: Record<SfxKey, number> = {
  start: 260,
  whiteHit: 80,
  multiplier: 220,
  powerStar: 220,
  powerMagnet: 200,
  powerSweep: 200,
  powerNova: 220,
  gameOver: 400,
  achievement: 320,
  achievementRare: 360,
  achievementEpic: 420,
};

export class SoundManager {
  private ctx: AudioContext | null = null;
  private lastScoreAt = 0;
  private readonly sfx = new Map<SfxKey, HTMLAudioElement>();
  private readonly lastSfxAt = new Map<SfxKey, number>();

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    try {
      this.ctx = new Ctor();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      this.ctx = null;
    }
  }

  playStart(): void {
    this.unlock();
    this.playSfx('start', 0.42);
  }

  playJump(): void {
    this.unlock();
    this.playTapTone();
  }

  playScore(step: number): void {
    void step;
    const now = performance.now();
    if (now - this.lastScoreAt < 40) return;
    this.lastScoreAt = now;

    this.playSfx('whiteHit', 0.26);
  }

  playMultiplier(multiplier: number): void {
    void multiplier;
    this.playSfx('multiplier', 0.28);
  }

  playPower(type: PowerType): void {
    if (type === 'star') {
      this.playSfx('powerStar', 0.34);
      return;
    }
    if (type === 'magnet') {
      this.playSfx('powerMagnet', 0.31);
      return;
    }
    if (type === 'sweep') {
      this.playSfx('powerSweep', 0.29);
      return;
    }
    this.playSfx('powerNova', 0.33);
  }

  playAchievement(tier: 'common' | 'rare' | 'epic'): void {
    if (tier === 'epic') {
      this.playSfx('achievementEpic', 0.32);
      return;
    }
    if (tier === 'rare') {
      this.playSfx('achievementRare', 0.3);
      return;
    }
    this.playSfx('achievement', 0.27);
  }

  playMagnetField(timerRatio: number): void {
    void timerRatio;
    // Disabled on purpose: this used synthetic tones that sounded random.
  }

  playGameOver(): void {
    this.playSfx('gameOver', 0.45);
  }

  private getSfxElement(key: SfxKey): HTMLAudioElement {
    const existing = this.sfx.get(key);
    if (existing) {
      return existing;
    }

    const audio = new Audio(SFX_FILES[key]);
    audio.preload = 'auto';
    audio.muted = false;
    audio.loop = false;
    this.sfx.set(key, audio);
    return audio;
  }

  private playSfx(key: SfxKey, volume: number): void {
    const now = performance.now();
    const cooldown = SFX_COOLDOWN_MS[key];
    const lastAt = this.lastSfxAt.get(key) ?? -Infinity;
    if (now - lastAt < cooldown) return;
    this.lastSfxAt.set(key, now);

    const base = this.getSfxElement(key);
    base.pause();
    base.currentTime = 0;
    base.volume = Math.max(0, Math.min(1, volume));
    base.muted = false;
    base.play().catch(() => {
      // Keep gameplay silent-safe when browser blocks playback.
    });
  }

  private playTapTone(): void {
    if (!this.ctx) return;

    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t0);
    osc.frequency.exponentialRampToValueAtTime(520, t0 + 0.085);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.11);
  }
}
