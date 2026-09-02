import { Renderer } from '../rendering/Renderer';
import { Arena } from './Arena';
import { Player } from './Player';
import { ObstacleManager, ObstacleTuning } from './Obstacle';
import { InputManager } from '../input/InputManager';
import { DifficultyLevel, HUD } from '../ui/HUD';
import { SoundManager } from '../audio/SoundManager';
import { getHighScore, setHighScore } from '../storage/Storage';
import { POWER, RADIUS } from '../config/constants';

type GameState = 'menu' | 'playing' | 'gameover';

interface Achievement {
  id: string;
  title: string;
  unlocked: (g: Game) => boolean;
}

interface DifficultyTuning {
  gravityScale: number;
  jumpImpulseScale: number;
  startRangeScale: number;
  rangeGrowthTurnsScale: number;
  obstacle: ObstacleTuning;
}

const DIFFICULTY_TUNING: Record<DifficultyLevel, DifficultyTuning> = {
  easy: {
    gravityScale: 0.9,
    jumpImpulseScale: 1.08,
    startRangeScale: 1.06,
    rangeGrowthTurnsScale: 0.8,
    obstacle: {
      spawnRateMultiplier: 0.88,
      speedMultiplier: 0.92,
      orangeChanceOffset: -0.05,
      powerupChanceMultiplier: 1.25,
    },
  },
  medium: {
    gravityScale: 1,
    jumpImpulseScale: 1,
    startRangeScale: 1,
    rangeGrowthTurnsScale: 1,
    obstacle: {
      spawnRateMultiplier: 1,
      speedMultiplier: 1,
      orangeChanceOffset: 0,
      powerupChanceMultiplier: 1,
    },
  },
  hard: {
    gravityScale: 1.24,
    jumpImpulseScale: 0.9,
    startRangeScale: 0.88,
    rangeGrowthTurnsScale: 1.32,
    obstacle: {
      spawnRateMultiplier: 1.32,
      speedMultiplier: 1.3,
      orangeChanceOffset: 0.13,
      powerupChanceMultiplier: 0.72,
    },
  },
};

export class Game {
  private state: GameState = 'menu';
  private score = 0;
  private scoreUnit = 1;
  private completedTurns = 0;
  private elapsed = 0;
  private dodges = 0;
  private nearMisses = 0;
  private starsPicked = 0;
  private sweepPicked = 0;
  private magnetsPicked = 0;
  private novasPicked = 0;
  private rangeBoostTimer = 0;
  private magnetTimer = 0;
  private sweepActive = false;
  private sweepAngle = 0;
  private lastTime = 0;
  private animationId = 0;

  private readonly renderer: Renderer;
  private readonly arena: Arena;
  private readonly player: Player;
  private readonly obstacles: ObstacleManager;
  private readonly input: InputManager;
  private readonly hud: HUD;
  private readonly sounds: SoundManager;

  private menuAngle = 0;
  private selectedDifficulty: DifficultyLevel = 'medium';
  private activeTuning: DifficultyTuning = DIFFICULTY_TUNING.medium;
  private menuDifficultyConfirmed = false;
  private unlocked = new Set<string>();
  private readonly achievements: Achievement[] = [
    { id: 'first-dodge', title: 'First Dodge', unlocked: (g) => g.dodges >= 1 },
    { id: 'combo-10', title: 'Rhythm x10', unlocked: (g) => g.dodges >= 10 },
    { id: 'close-call', title: 'Close Call', unlocked: (g) => g.nearMisses >= 3 },
    { id: 'survivor-30', title: 'Orbit Survivor', unlocked: (g) => g.elapsed >= 30 },
    { id: 'survivor-60', title: 'Clockwork', unlocked: (g) => g.elapsed >= 60 },
    { id: 'first-star', title: 'Star Collector', unlocked: (g) => g.starsPicked >= 1 },
    { id: 'first-magnet', title: 'Magnetic Sense', unlocked: (g) => g.magnetsPicked >= 1 },
    { id: 'first-sweep', title: 'White Reaper', unlocked: (g) => g.sweepPicked >= 1 },
    { id: 'first-nova', title: 'Sky Cleaner', unlocked: (g) => g.novasPicked >= 1 },
    { id: 'double-unit', title: '2x Orbit', unlocked: (g) => g.scoreUnit >= 2 },
    { id: 'mega-unit', title: '16x Orbit', unlocked: (g) => g.scoreUnit >= 16 },
  ];

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.arena = new Arena(this.renderer.centerX, this.renderer.centerY);
    this.player = new Player(this.renderer.centerX, this.renderer.centerY);
    this.obstacles = new ObstacleManager(this.renderer.centerX, this.renderer.centerY);
    this.input = new InputManager(container);
    this.hud = new HUD(container);
    this.sounds = new SoundManager();

    this.hud.setOnStart(() => {
      if (this.state !== 'menu') return;
      if (!this.menuDifficultyConfirmed) {
        this.hud.showAchievement('SELECT DIFFICULTY FIRST');
        return;
      }
      this.sounds.unlock();
      this.startPlaying();
    });

    this.hud.setOnRetry(() => {
      this.sounds.unlock();
      this.startPlaying();
    });
    this.hud.setOnDifficultyChange((difficulty) => {
      this.selectedDifficulty = difficulty;
      this.activeTuning = DIFFICULTY_TUNING[difficulty];
      this.menuDifficultyConfirmed = true;
    });
    const selected = this.hud.getSelectedDifficulty();
    if (selected) {
      this.selectedDifficulty = selected;
      this.activeTuning = DIFFICULTY_TUNING[selected];
      this.menuDifficultyConfirmed = true;
    }

    window.addEventListener('keydown', this.onStartKeyDown);
  }

  start(): void {
    this.state = 'menu';
    this.selectedDifficulty = 'medium';
    this.activeTuning = DIFFICULTY_TUNING.medium;
    this.menuDifficultyConfirmed = false;
    this.hud.showMenu();
    this.renderer.resetCamera();
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    this.animationId = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    const cx = this.renderer.centerX;
    const cy = this.renderer.centerY;

    if (this.state === 'menu') {
      this.renderer.clear(0);
      this.renderer.endWorld();
      this.drawMenu(dt, cx, cy);
    } else if (this.state === 'playing') {
      this.renderer.clear(this.score, this.rangeBoostTimer > 0);
      this.updatePlaying(dt, cx, cy);
    } else {
      this.renderer.clear(Math.max(this.score, 20));
      this.drawGameOver(cx, cy);
    }
  };

  private drawMenu(dt: number, cx: number, cy: number): void {
    this.menuAngle += dt * 1.5;
    const dotX = cx + 140 * Math.cos(this.menuAngle);
    const dotY = cy + 140 * Math.sin(this.menuAngle);
    const ctx = this.renderer.ctx;

    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.lineDashOffset = -this.menuAngle * 15;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(dotX, dotY);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd93d';
    ctx.fill();
    ctx.strokeStyle = '#e6b800';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#555';
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private updatePlaying(dt: number, cx: number, cy: number): void {
    this.elapsed += dt;
    this.rangeBoostTimer = Math.max(0, this.rangeBoostTimer - dt);
    this.magnetTimer = Math.max(0, this.magnetTimer - dt);

    const growthTurnsTarget = Math.max(1, RADIUS.growthTurnsToMax * this.activeTuning.rangeGrowthTurnsScale);
    const growthProgress = Math.min(1, this.completedTurns / growthTurnsTarget);
    const baseMaxRadius =
      RADIUS.startMaxRadius * this.activeTuning.startRangeScale +
      (RADIUS.maxRadius - RADIUS.startMaxRadius * this.activeTuning.startRangeScale) * growthProgress;

    this.player.setMaxRadius(
      baseMaxRadius + (this.rangeBoostTimer > 0 ? POWER.rangeBonus : 0)
    );

    if (this.sweepActive) {
      const prev = this.sweepAngle;
      this.sweepAngle += POWER.sweepAngularSpeed * dt;
      const whiteSwept = this.obstacles.consumeWhitesBySweep(prev, this.sweepAngle);
      if (whiteSwept > 0) {
        this.addScore(whiteSwept);
      }
      if (this.sweepAngle >= Math.PI * 2) {
        this.sweepActive = false;
        this.sweepAngle = 0;
      }
    }

    this.hud.updateScore(this.score);
    this.hud.updateMultiplier(this.scoreUnit);
    this.hud.updatePowerState(this.getPowerLabels());
    this.hud.updateJumpCharges(this.player.getJumpCharges(), this.player.getMaxJumpCharges());

    this.player.setCenter(cx, cy);
    this.obstacles.setCenter(cx, cy);
    this.arena.setCenter(cx, cy);

    if (this.input.consumeTap()) {
      if (this.player.jump(this.activeTuning.jumpImpulseScale)) {
        this.sounds.playJump();
      }
    }

    this.player.update(dt, this.elapsed, this.activeTuning.gravityScale);
    const turns = this.player.consumeCompletedTurns();
    if (turns > 0) {
      const previousUnit = this.scoreUnit;
      this.completedTurns += turns;
      this.scoreUnit = this.computeScoreUnit(this.completedTurns);
      if (this.scoreUnit !== previousUnit) {
        this.hud.updateMultiplier(this.scoreUnit);
        this.sounds.playMultiplier(this.scoreUnit);
      }
    }

    if (this.magnetTimer > 0) {
      const magnetResult = this.obstacles.applyMagnetBurst(
        this.player.x,
        this.player.y,
        dt,
        POWER.magnetPull
      );
      this.sounds.playMagnetField(this.magnetTimer / POWER.magnetDuration);
      if (magnetResult.whiteCollected > 0) {
        this.addScore(magnetResult.whiteCollected);
      }
    }

    this.arena.update(dt);
    const obstacleStats = this.obstacles.update(
      dt,
      this.elapsed,
      this.score,
      this.activeTuning.obstacle,
      this.player.getAngle(),
      this.player.x,
      this.player.y,
      this.player.getBoundingRadius()
    );
    this.dodges += obstacleStats.passed;
    this.nearMisses += obstacleStats.nearMisses;

    this.renderer.updateCamera(
      dt,
      this.player.getAngle(),
      this.player.getRadius(),
      this.player.getMaxRadius(),
      this.player.x,
      this.player.y
    );
    this.renderer.beginWorld();

    this.arena.draw(this.renderer.ctx);
    if (this.sweepActive) {
      const ctx = this.renderer.ctx;
      const start = this.sweepAngle - 0.3;
      const end = this.sweepAngle;
      ctx.beginPath();
      ctx.arc(cx, cy, this.player.getRadius() + 18, start, end);
      ctx.strokeStyle = 'rgba(164,255,120,0.7)';
      ctx.lineWidth = 6;
      ctx.stroke();
    }
    this.obstacles.draw(this.renderer.ctx);
    this.player.draw(this.renderer.ctx);
    this.renderer.endWorld();

    if (this.player.getReachedCenter()) {
      this.onGameOver();
      return;
    }

    const collision = this.obstacles.resolveCollision(
      this.player.x, this.player.y, this.player.getBoundingRadius()
    );
    if (collision === 'white') {
      this.addScore(1);
      this.player.onWhiteCollected();
      this.player.applyExternalBoost(POWER.hitBounceImpulse);
      this.sounds.playScore(this.scoreUnit);
    }

    if (collision === 'power-star') {
      this.rangeBoostTimer = POWER.rangeDuration;
      this.renderer.randomizeStarPattern();
      this.player.applyExternalBoost(POWER.starJumpBoost);
      this.player.applyExternalBoost(POWER.hitBounceImpulse * 0.7);
      this.starsPicked += 1;
      this.hud.showAchievement('STAR BOOST +JUMP');
      this.sounds.playPower('star');
    }

    if (collision === 'power-magnet') {
      this.magnetTimer = POWER.magnetDuration;
      this.obstacles.activateMagnetBurst(this.player.x, this.player.y);
      this.player.applyExternalBoost(POWER.hitBounceImpulse * 0.7);
      this.magnetsPicked += 1;
      this.hud.showAchievement('MAGNET BURST');
      this.sounds.playPower('magnet');
    }

    if (collision === 'power-sweep') {
      this.sweepActive = true;
      this.sweepAngle = 0;
      this.player.applyExternalBoost(POWER.hitBounceImpulse * 0.7);
      this.sweepPicked += 1;
      this.hud.showAchievement('SWEEP SPIN');
      this.sounds.playPower('sweep');
    }

    if (collision === 'power-nova') {
      const cleared = this.obstacles.clearEnemiesAbovePlayer(this.player.x, this.player.y);
      if (cleared > 0) {
        this.addScore(cleared);
      }
      this.player.applyExternalBoost(POWER.hitBounceImpulse * 0.7);
      this.novasPicked += 1;
      this.hud.showAchievement(cleared > 0 ? `SKY CLEAR x${cleared}` : 'SKY CLEAR');
      this.sounds.playPower('nova');
    }

    if (collision === 'orange' && !this.obstacles.isMagnetBurstActive()) {
      this.onGameOver();
    }

    this.checkAchievements();
  }

  private drawGameOver(cx: number, cy: number): void {
    this.renderer.beginWorld();
    this.arena.draw(this.renderer.ctx);
    this.obstacles.draw(this.renderer.ctx);
    this.renderer.ctx.globalAlpha = 0.35;
    this.player.draw(this.renderer.ctx);
    this.renderer.ctx.globalAlpha = 1;
    this.renderer.endWorld();
  }

  private onStartKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'Space' && event.code !== 'ArrowUp' && event.code !== 'Enter') {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target && target.closest('button, input, select, textarea, [role="button"]')) {
      return;
    }

    if (this.state !== 'menu' && this.state !== 'gameover') {
      return;
    }

    if (this.state === 'menu' && !this.menuDifficultyConfirmed) {
      event.preventDefault();
      this.hud.showAchievement('SELECT DIFFICULTY FIRST');
      return;
    }

    event.preventDefault();
    this.sounds.unlock();
    this.startPlaying();
  };

  private startPlaying(): void {
    this.state = 'playing';
    this.score = 0;
    this.scoreUnit = 1;
    this.completedTurns = 0;
    this.elapsed = 0;
    this.dodges = 0;
    this.nearMisses = 0;
    this.starsPicked = 0;
    this.sweepPicked = 0;
    this.magnetsPicked = 0;
    this.novasPicked = 0;
    this.rangeBoostTimer = 0;
    this.magnetTimer = 0;
    this.sweepActive = false;
    this.sweepAngle = 0;
    this.unlocked.clear();
    this.player.reset(this.renderer.centerX, this.renderer.centerY);
    this.player.setMaxRadius(RADIUS.startMaxRadius * this.activeTuning.startRangeScale);
    this.obstacles.reset();
    this.renderer.resetCamera();
    this.input.resetTap();
    this.hud.showPlaying();
    this.hud.updateMultiplier(this.scoreUnit);
    this.hud.updatePowerState([]);
    this.hud.updateJumpCharges(this.player.getJumpCharges(), this.player.getMaxJumpCharges());
    this.sounds.playStart();
  }

  private onGameOver(): void {
    this.state = 'gameover';
    this.sounds.playGameOver();
    const high = getHighScore();
    if (this.score > high) setHighScore(Math.floor(this.score));
    this.hud.showGameOver(Math.floor(this.score));
  }

  private checkAchievements(): void {
    for (const achievement of this.achievements) {
      if (this.unlocked.has(achievement.id)) continue;
      if (!achievement.unlocked(this)) continue;
      this.unlocked.add(achievement.id);
      this.hud.showAchievement(achievement.title);
      this.sounds.playAchievement(this.getAchievementTier(achievement.id));
    }
  }

  private getAchievementTier(id: string): 'common' | 'rare' | 'epic' {
    if (id === 'survivor-60' || id === 'mega-unit') {
      return 'epic';
    }
    if (id === 'combo-10' || id === 'survivor-30' || id === 'double-unit') {
      return 'rare';
    }
    return 'common';
  }

  private addScore(basePoints: number): void {
    this.score += basePoints * this.scoreUnit;
    this.hud.updateScore(this.score);
  }

  private computeScoreUnit(completedTurns: number): number {
    // Linear growth keeps score progression meaningful without exploding to millions.
    return Math.min(20, 1 + Math.floor(completedTurns / 2));
  }

  private getPowerLabels(): string[] {
    const labels: string[] = [];
    if (this.rangeBoostTimer > 0) labels.push(`STAR ${(this.rangeBoostTimer).toFixed(1)}s`);
    if (this.magnetTimer > 0) labels.push(`MAGNET ${(this.magnetTimer).toFixed(1)}s`);
    if (this.sweepActive) {
      const progress = Math.min(100, Math.floor((this.sweepAngle / (Math.PI * 2)) * 100));
      labels.push(`SWEEP ${progress}%`);
    }
    return labels;
  }
}
