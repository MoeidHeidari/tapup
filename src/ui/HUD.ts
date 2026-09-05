import { getHighScore, DifficultyLevel } from '../storage/Storage';

export type { DifficultyLevel };

export class HUD {
  private container: HTMLDivElement;
  private menuScreen: HTMLDivElement;
  private scoreDisplay: HTMLDivElement;
  private scoreValueEl!: HTMLDivElement;
  private scoreGainEl!: HTMLDivElement;
  private gameOverScreen: HTMLDivElement;
  private multiplierDisplay: HTMLDivElement;
  private powerDisplay: HTMLDivElement;
  private chargeDisplay: HTMLDivElement;
  private speedDisplay: HTMLDivElement;
  private achievementToast: HTMLDivElement;
  private startButton!: HTMLButtonElement;
  private retryButton!: HTMLButtonElement;
  private difficultyButtons = new Map<DifficultyLevel, HTMLButtonElement>();
  private selectedDifficulty: DifficultyLevel | null = null;
  private onRetry: (() => void) | null = null;
  private onStart: (() => void) | null = null;
  private onDifficultyChange: ((difficulty: DifficultyLevel) => void) | null = null;
  private achievementTimer = 0;
  private scorePulseTimer = 0;
  private compactHud = false;

  private score = 0;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;font-family:"Avenir Next Condensed","Trebuchet MS","Segoe UI",sans-serif;';

    this.menuScreen = this.createMenuScreen();
    this.scoreDisplay = this.createScoreDisplay();
    this.gameOverScreen = this.createGameOverScreen();
    this.multiplierDisplay = this.createMultiplierDisplay();
    this.powerDisplay = this.createPowerDisplay();
    this.chargeDisplay = this.createChargeDisplay();
    this.speedDisplay = this.createSpeedDisplay();
    this.achievementToast = this.createAchievementToast();

    this.container.appendChild(this.menuScreen);
    this.container.appendChild(this.scoreDisplay);
    this.container.appendChild(this.gameOverScreen);
    this.container.appendChild(this.multiplierDisplay);
    this.container.appendChild(this.powerDisplay);
    this.container.appendChild(this.chargeDisplay);
    this.container.appendChild(this.speedDisplay);
    this.container.appendChild(this.achievementToast);

    parent.appendChild(this.container);
    this.injectPowerAnimations();
    this.refreshDifficultyStyles();
    this.updateResponsiveGameplayLayout();
    window.addEventListener('resize', this.updateResponsiveGameplayLayout);
  }

  private injectPowerAnimations(): void {
    const style = document.createElement('style');
    style.textContent = [
      '@keyframes tapup-power-pulse { 0%,100% { transform:scale(1);} 50% { transform:scale(1.12);} }',
      '@keyframes tapup-power-glow-magnet { 0%,100% { box-shadow:0 0 8px rgba(122,215,255,0.35), inset 0 0 6px rgba(122,215,255,0.18);} 50% { box-shadow:0 0 18px rgba(122,215,255,0.85), inset 0 0 10px rgba(122,215,255,0.4);} }',
      '@keyframes tapup-power-glow-shield { 0%,100% { box-shadow:0 0 8px rgba(111,240,255,0.35), inset 0 0 6px rgba(111,240,255,0.18);} 50% { box-shadow:0 0 18px rgba(111,240,255,0.85), inset 0 0 10px rgba(111,240,255,0.4);} }',
      '@keyframes tapup-power-glow-slow { 0%,100% { box-shadow:0 0 8px rgba(199,146,255,0.35), inset 0 0 6px rgba(199,146,255,0.18);} 50% { box-shadow:0 0 18px rgba(199,146,255,0.85), inset 0 0 10px rgba(199,146,255,0.4);} }',
    ].join('\n');
    document.head.appendChild(style);
  }

  private updateResponsiveGameplayLayout = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.compactHud = w <= 820 || h <= 540;

    if (this.compactHud) {
      this.scoreDisplay.style.top = 'calc(env(safe-area-inset-top) + 8px)';
      this.scoreDisplay.style.minWidth = 'min(66vw,232px)';
      this.scoreDisplay.style.padding = '6px 12px 7px';
      this.scoreDisplay.style.borderRadius = '14px';

      this.scoreValueEl.style.fontSize = 'clamp(1.45rem,8.6vw,2rem)';
      this.scoreGainEl.style.fontSize = '0.74rem';

      this.multiplierDisplay.style.top = 'calc(env(safe-area-inset-top) + 8px)';
      this.multiplierDisplay.style.left = '50%';
      this.multiplierDisplay.style.transform = 'translateX(-50%)';
      this.multiplierDisplay.style.padding = '6px 8px';
      this.multiplierDisplay.style.fontSize = '0.72rem';

      this.powerDisplay.style.left = '50%';
      this.powerDisplay.style.transform = 'translateX(-50%)';
      this.powerDisplay.style.bottom = 'calc(env(safe-area-inset-bottom) + 8px)';
      this.powerDisplay.style.maxWidth = '92vw';
      this.powerDisplay.style.justifyContent = 'center';
      this.powerDisplay.style.gap = '5px';

      this.chargeDisplay.style.right = 'calc(env(safe-area-inset-right) + 8px)';
      this.chargeDisplay.style.bottom = 'auto';
      this.chargeDisplay.style.top = 'calc(env(safe-area-inset-top) + 8px)';
      this.chargeDisplay.style.padding = '6px 7px';
      this.chargeDisplay.style.gap = '4px';

      this.speedDisplay.style.top = 'calc(env(safe-area-inset-top) + 52px)';
      this.speedDisplay.style.right = 'calc(env(safe-area-inset-right) + 8px)';
      this.speedDisplay.style.padding = '5px 9px';
      this.speedDisplay.style.fontSize = '0.68rem';

      this.achievementToast.style.bottom = 'calc(env(safe-area-inset-bottom) + 48px)';
      this.achievementToast.style.fontSize = '0.72rem';
      this.achievementToast.style.padding = '9px 12px';
      this.achievementToast.style.letterSpacing = '0.05em';
      this.achievementToast.style.maxWidth = '94vw';
      this.achievementToast.style.whiteSpace = 'normal';
      this.achievementToast.style.textAlign = 'center';
    } else {
      this.scoreDisplay.style.top = 'calc(env(safe-area-inset-top) + 10px)';
      this.scoreDisplay.style.minWidth = 'min(74vw,272px)';
      this.scoreDisplay.style.padding = '8px 16px 9px';
      this.scoreDisplay.style.borderRadius = '18px';

      this.scoreValueEl.style.fontSize = 'clamp(2rem,10vw,2.65rem)';
      this.scoreGainEl.style.fontSize = '0.86rem';

      this.multiplierDisplay.style.top = 'calc(env(safe-area-inset-top) + 16px)';
      this.multiplierDisplay.style.left = 'calc(env(safe-area-inset-left) + 14px)';
      this.multiplierDisplay.style.transform = '';
      this.multiplierDisplay.style.padding = '9px 12px';
      this.multiplierDisplay.style.fontSize = '0.88rem';

      this.powerDisplay.style.left = 'calc(env(safe-area-inset-left) + 10px)';
      this.powerDisplay.style.transform = '';
      this.powerDisplay.style.bottom = 'calc(env(safe-area-inset-bottom) + 10px)';
      this.powerDisplay.style.maxWidth = 'min(56vw,680px)';
      this.powerDisplay.style.justifyContent = 'flex-start';
      this.powerDisplay.style.gap = '6px';

      this.chargeDisplay.style.right = 'calc(env(safe-area-inset-right) + 10px)';
      this.chargeDisplay.style.top = 'auto';
      this.chargeDisplay.style.bottom = 'calc(env(safe-area-inset-bottom) + 10px)';
      this.chargeDisplay.style.padding = '8px 9px';
      this.chargeDisplay.style.gap = '5px';

      this.speedDisplay.style.top = 'calc(env(safe-area-inset-top) + 62px)';
      this.speedDisplay.style.right = 'calc(env(safe-area-inset-right) + 10px)';
      this.speedDisplay.style.padding = '7px 11px';
      this.speedDisplay.style.fontSize = '0.8rem';

      this.achievementToast.style.bottom = 'calc(env(safe-area-inset-bottom) + 84px)';
      this.achievementToast.style.fontSize = '0.93rem';
      this.achievementToast.style.padding = '13px 20px';
      this.achievementToast.style.letterSpacing = '0.09em';
      this.achievementToast.style.maxWidth = '';
      this.achievementToast.style.whiteSpace = '';
      this.achievementToast.style.textAlign = '';
    }
  };

  private createMenuScreen(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;pointer-events:none;';

    const panel = document.createElement('div');
    panel.dataset.menuPanel = '1';
    panel.style.cssText = 'pointer-events:auto;display:flex;flex-direction:column;align-items:center;width:min(92vw,520px);padding:clamp(16px,4vw,26px) clamp(16px,5vw,30px);border-radius:24px;background:linear-gradient(180deg, rgba(6,12,22,0.78), rgba(10,18,32,0.52));border:1px solid rgba(255,255,255,0.16);box-shadow:0 24px 50px rgba(0,0,0,0.34);backdrop-filter:blur(3px);';

    const title = document.createElement('div');
    title.textContent = 'TAP UP';
    title.style.cssText = 'font-size:clamp(2.2rem,12vw,4.6rem);font-weight:900;color:#ffd93d;letter-spacing:0.13em;text-shadow:0 0 38px rgba(255,217,61,0.44);line-height:1;';

    const sub = document.createElement('div');
    sub.textContent = 'TAP OR SPACE TO START';
    sub.style.cssText = 'font-size:clamp(0.82rem,3.1vw,1.02rem);color:rgba(255,255,255,0.72);margin-top:0.9rem;letter-spacing:0.18em;text-align:center;';

    const hint = document.createElement('div');
    hint.textContent = 'ROTATION IS AUTOMATIC • TIME THE JUMPS';
    hint.style.cssText = 'font-size:clamp(0.7rem,2.7vw,0.82rem);color:rgba(255,255,255,0.5);margin-top:0.62rem;letter-spacing:0.09em;text-align:center;';

    const difficultyTitle = document.createElement('div');
    difficultyTitle.textContent = 'SELECT DIFFICULTY';
    difficultyTitle.style.cssText = 'margin-top:1.1rem;color:rgba(255,255,255,0.72);font-size:clamp(0.72rem,2.8vw,0.82rem);letter-spacing:0.15em;font-weight:700;';

    const difficultyRow = document.createElement('div');
    difficultyRow.style.cssText = 'display:flex;gap:8px;margin-top:0.65rem;pointer-events:auto;flex-wrap:wrap;justify-content:center;';

    const makeDiffBtn = (difficulty: DifficultyLevel, label: string): HTMLButtonElement => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.dataset.difficulty = difficulty;
      btn.style.cssText = 'pointer-events:auto;min-width:clamp(92px,26vw,116px);padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,0.22);background:rgba(255,255,255,0.04);color:#f3f8ff;font-size:clamp(0.74rem,2.8vw,0.86rem);font-weight:800;letter-spacing:0.09em;cursor:pointer;transition:transform 0.18s, background 0.18s, border-color 0.18s;';
      btn.addEventListener('pointerdown', (e) => e.stopPropagation());
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedDifficulty = difficulty;
        this.refreshDifficultyStyles();
        this.onDifficultyChange?.(difficulty);
      });
      difficultyRow.appendChild(btn);
      this.difficultyButtons.set(difficulty, btn);
      return btn;
    };

    makeDiffBtn('easy', 'EASY');
    makeDiffBtn('medium', 'MEDIUM');
    makeDiffBtn('hard', 'HARD');

    this.startButton = document.createElement('button');
    this.startButton.type = 'button';
    this.startButton.textContent = 'START';
    this.startButton.disabled = true;
    this.startButton.style.cssText = 'pointer-events:auto;min-width:min(84vw,240px);margin-top:0.9rem;padding:13px 16px;border-radius:15px;border:1px solid rgba(255,255,255,0.22);background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.55);font-size:clamp(0.9rem,3.2vw,1.02rem);font-weight:900;letter-spacing:0.14em;cursor:not-allowed;transition:transform 0.16s, background 0.16s, border-color 0.16s, color 0.16s, box-shadow 0.16s;';
    this.startButton.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.startButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.startButton.disabled) return;
      this.onStart?.();
    });

    const hsWrap = document.createElement('div');
    hsWrap.style.cssText = 'font-size:clamp(0.76rem,2.8vw,0.88rem);color:rgba(255,255,255,0.56);margin-top:1rem;letter-spacing:0.08em;';
    const hsLabel = document.createElement('span');
    hsLabel.classList.add('hs-label');
    hsLabel.textContent = 'HIGH SCORE: ';
    const hsVal = document.createElement('span');
    hsVal.classList.add('hs-menu');
    hsVal.textContent = '0';
    hsWrap.appendChild(hsLabel);
    hsWrap.appendChild(hsVal);

    const manual = this.createManualButton();

    panel.appendChild(title);
    panel.appendChild(sub);
    panel.appendChild(hint);
    panel.appendChild(difficultyTitle);
    panel.appendChild(difficultyRow);
    panel.appendChild(this.startButton);
    panel.appendChild(hsWrap);
    panel.appendChild(manual);
    el.appendChild(panel);
    return el;
  }

  private createManualButton(): HTMLDivElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:100%;margin-top:1rem;pointer-events:auto;';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent = 'HOW TO PLAY  ▾';
    toggle.style.cssText = 'pointer-events:auto;width:100%;padding:10px 12px;border-radius:13px;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:rgba(245,250,255,0.85);font-size:clamp(0.72rem,2.7vw,0.82rem);font-weight:800;letter-spacing:0.12em;cursor:pointer;transition:background 0.18s, border-color 0.18s;';
    toggle.addEventListener('pointerdown', (e) => e.stopPropagation());
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = panel.style.display !== 'none';
      panel.style.display = open ? 'none' : 'block';
      toggle.textContent = open ? 'HOW TO PLAY  ▾' : 'HOW TO PLAY  ▴';
    });

    const panel = document.createElement('div');
    panel.style.cssText = 'display:none;margin-top:0.6rem;max-height:min(46vh,340px);overflow-y:auto;padding:0 4px;color:rgba(235,242,255,0.88);font-size:clamp(0.7rem,2.6vw,0.8rem);line-height:1.45;text-align:left;letter-spacing:0.02em;';

    const section = (title: string): string => `<div style="margin-top:0.65rem;font-weight:900;letter-spacing:0.14em;color:#ffd93d;font-size:clamp(0.74rem,2.7vw,0.84rem);">${title}</div>`;
    const row = (label: string, desc: string): string => `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-top:3px;"><span style="color:#cfe3ff;font-weight:700;white-space:nowrap;">${label}</span><span style="text-align:right;color:rgba(225,236,252,0.82);">${desc}</span></div>`;

    panel.innerHTML = [
      section('CONTROLS'),
      row('TAP / SPACE / ↑', 'Jump outward from the orbit'),
      row('AUTO ROTATION', 'You orbit automatically'),
      '',
      section('RULES'),
      'Grab <b>white</b> objects to score. <b>Gold diamonds</b> are worth <b>10 points</b>. <b>Dodge orange ones</b> - they end the run. Don\u2019t fall back to the <b>center hole</b>. Split objects have an orange half and a white half - pick your side!',
      'The arena <b>grows</b> with every lap. Danger escalates as your score climbs.',
      '',
      section('POWERUPS'),
      row('STAR', 'Huge jump boost + bigger range for 8s'),
      row('MAGNET', 'Pulls nearby whites and gold straight to you'),
      row('SWEEP', 'Full 360 spin that cleans the field of everything (1pt each), camera locks on'),
      row('NOVA', 'Wipes every enemy in your outward line'),
      row('SHIELD', 'Survive one orange hit safely'),
      row('SLOW', 'Slows all enemies for a few seconds'),
      '',
      section('ENEMIES'),
      row('BASIC / DRIFT', 'Straight flyers, some sway side to side'),
      row('ORBIT / SLICER', 'Circle the center unpredictably'),
      row('HOMING', 'Chases your angle - outrun it'),
      row('PHANTOM', 'Invisible until it gets close'),
      row('SHRINKER', 'Shrinks as it flies, tricky to read'),
      row('MASTER', 'Big arena-scouring hunter'),
      '',
      section('SPEED LEVELS'),
      'Your <b>rotation speed</b> rises at every <b>100 points</b> (SPEED 1-6). Higher levels spin the arena faster - good luck keeping up!',
      '',
      section('ACHIEVEMENTS'),
      [
        'First Dodge - dodge 1 enemy',
        'Rhythm x10 - dodge 10 enemies',
        'Close Call - 3 near misses',
        'Orbit Survivor - survive 30s',
        'Clockwork - survive 60s',
        'Star Collector - pick a star',
        'Magnetic Sense - pick a magnet',
        'White Reaper - pick a sweep',
        'Sky Cleaner - pick a nova',
        'Iron Shield - pick a shield',
        'Time Freeze - pick a slow power',
        'Saved by Shield - survive a hit',
        'Centurion - reach 100 pts',
        'Triple Threat - reach 300 pts',
        'Speed Up - reach SPEED 2',
        'Hyper Mode - reach SPEED 4',
        '2x Orbit - earn the 2x multiplier',
        '16x Orbit - earn the 16x multiplier',
        'Fast 360 Spin - complete a full 360 field clear',
        'Gold Rush - collect a gold diamond',
      ].map((a) => `<div style="margin-top:2px;">\u2022 ${a}</div>`).join(''),
    ].join('');

    wrap.appendChild(toggle);
    wrap.appendChild(panel);
    return wrap;
  }

  private refreshDifficultyStyles(): void {
    const active: Record<DifficultyLevel, { bg: string; border: string }> = {
      easy: { bg: 'rgba(82,202,117,0.25)', border: 'rgba(82,202,117,0.84)' },
      medium: { bg: 'rgba(255,217,61,0.26)', border: 'rgba(255,217,61,0.86)' },
      hard: { bg: 'rgba(233,69,96,0.26)', border: 'rgba(233,69,96,0.9)' },
    };

    for (const [difficulty, btn] of this.difficultyButtons.entries()) {
      if (difficulty === this.selectedDifficulty) {
        btn.style.background = active[difficulty].bg;
        btn.style.borderColor = active[difficulty].border;
        btn.style.transform = 'translateY(-1px)';
      } else {
        btn.style.background = 'rgba(255,255,255,0.04)';
        btn.style.borderColor = 'rgba(255,255,255,0.22)';
        btn.style.transform = 'translateY(0)';
      }
    }

    const canStart = this.selectedDifficulty !== null;
    this.startButton.disabled = !canStart;
    if (canStart) {
      this.startButton.style.cursor = 'pointer';
      this.startButton.style.color = '#1e1604';
      this.startButton.style.background = 'linear-gradient(180deg, rgba(255,217,61,0.95), rgba(232,186,16,0.98))';
      this.startButton.style.borderColor = 'rgba(255,255,255,0.34)';
      this.startButton.style.boxShadow = '0 10px 24px rgba(255,217,61,0.28), inset 0 1px 1px rgba(255,255,255,0.48)';
    } else {
      this.startButton.style.cursor = 'not-allowed';
      this.startButton.style.color = 'rgba(255,255,255,0.55)';
      this.startButton.style.background = 'rgba(255,255,255,0.1)';
      this.startButton.style.borderColor = 'rgba(255,255,255,0.22)';
      this.startButton.style.boxShadow = 'none';
    }

    this.refreshHighScoreLabel();
  }

  private refreshHighScoreLabel(): void {
    const difficulty = this.selectedDifficulty ?? 'medium';
    const hsEl = this.menuScreen.querySelector('.hs-menu');
    if (hsEl) {
      hsEl.textContent = String(getHighScore(difficulty));
    }
  }

  private createScoreDisplay(): HTMLDivElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;top:calc(env(safe-area-inset-top) + 10px);left:50%;transform:translateX(-50%);min-width:min(74vw,272px);max-width:min(92vw,360px);padding:8px 16px 9px;border-radius:18px;border:1px solid rgba(255,255,255,0.22);background:linear-gradient(180deg, rgba(10,18,32,0.8), rgba(10,17,29,0.6));box-shadow:0 14px 34px rgba(0,0,0,0.28), inset 0 1px 1px rgba(255,255,255,0.25);text-align:center;opacity:0;transition:opacity 0.28s, transform 0.24s;';

    const label = document.createElement('div');
    label.textContent = 'SCORE';
    label.style.cssText = 'font-size:0.72rem;font-weight:800;letter-spacing:0.22em;color:rgba(225,236,252,0.75);text-transform:uppercase;';

    this.scoreValueEl = document.createElement('div');
    this.scoreValueEl.style.cssText = 'margin-top:4px;color:#ffffff;font-size:clamp(2rem,10vw,2.65rem);font-weight:900;line-height:1;text-shadow:0 2px 14px rgba(0,0,0,0.62);letter-spacing:0.03em;';
    this.scoreValueEl.textContent = '0';

    this.scoreGainEl = document.createElement('div');
    this.scoreGainEl.style.cssText = 'height:20px;margin-top:3px;color:#8ff8b5;font-size:0.86rem;font-weight:800;letter-spacing:0.11em;opacity:0;transform:translateY(7px);transition:opacity 0.24s, transform 0.24s;';
    this.scoreGainEl.textContent = '+0';

    wrap.appendChild(label);
    wrap.appendChild(this.scoreValueEl);
    wrap.appendChild(this.scoreGainEl);
    return wrap;
  }

  private createGameOverScreen(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:none;flex-direction:column;align-items:center;justify-content:center;color:#fff;opacity:0;pointer-events:none;transition:opacity 0.3s;';

    const panel = document.createElement('div');
    panel.dataset.gameOverPanel = '1';
    panel.style.cssText = 'pointer-events:auto;display:flex;flex-direction:column;align-items:center;width:min(92vw,520px);padding:clamp(16px,4vw,24px) clamp(16px,5vw,28px);border-radius:24px;background:linear-gradient(180deg, rgba(10,16,28,0.8), rgba(10,16,28,0.55));border:1px solid rgba(255,255,255,0.16);box-shadow:0 26px 54px rgba(0,0,0,0.35);';

    const title = document.createElement('div');
    title.textContent = 'GAME OVER';
    title.style.cssText = 'font-size:clamp(2rem,10vw,3.2rem);font-weight:900;color:#e94560;text-shadow:0 0 24px rgba(233,69,96,0.52);letter-spacing:0.1em;';

    const score = document.createElement('div');
    score.style.cssText = 'font-size:1.5rem;margin-top:1rem;color:#d8dce6;letter-spacing:0.09em;';
    score.innerHTML = 'SCORE: <span class="final-score">0</span>';

    const hs = document.createElement('div');
    hs.style.cssText = 'font-size:0.95rem;color:rgba(255,255,255,0.58);margin-top:0.6rem;letter-spacing:0.09em;';
    hs.innerHTML = 'HIGH SCORE: <span class="hs-over">0</span>';

    this.retryButton = document.createElement('button');
    this.retryButton.type = 'button';
    this.retryButton.textContent = 'RETRY';
    this.retryButton.style.cssText = 'pointer-events:auto;cursor:pointer;margin-top:1.55rem;padding:16px 58px;border-radius:16px;border:1px solid rgba(255,255,255,0.24);background:linear-gradient(180deg, rgba(255,217,61,0.95), rgba(232,186,16,0.98));color:#1c1602;font-size:1.22rem;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;box-shadow:0 14px 30px rgba(255,217,61,0.32), inset 0 1px 1px rgba(255,255,255,0.55);';
    this.retryButton.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.retryButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onRetry?.();
    });

    const retryHint = document.createElement('div');
    retryHint.textContent = 'OR PRESS SPACE';
    retryHint.style.cssText = 'font-size:0.78rem;color:rgba(255,255,255,0.45);margin-top:0.9rem;letter-spacing:0.25em;';

    panel.appendChild(title);
    panel.appendChild(score);
    panel.appendChild(hs);
    panel.appendChild(this.retryButton);
    panel.appendChild(retryHint);
    el.appendChild(panel);
    return el;
  }

  private createMultiplierDisplay(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:calc(env(safe-area-inset-top) + 16px);left:calc(env(safe-area-inset-left) + 14px);padding:9px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);background:linear-gradient(180deg, rgba(9,16,28,0.78), rgba(9,16,28,0.52));color:rgba(255,255,255,0.98);font-size:0.88rem;font-weight:800;letter-spacing:0.1em;opacity:0;transition:opacity 0.3s, transform 0.22s;text-shadow:0 2px 8px rgba(0,0,0,0.4);';
    el.textContent = 'POINT UNIT x1';
    return el;
  }

  private createSpeedDisplay(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:calc(env(safe-area-inset-top) + 62px);right:calc(env(safe-area-inset-right) + 10px);padding:7px 11px;border-radius:12px;border:1px solid rgba(255,120,84,0.32);background:linear-gradient(180deg, rgba(48,16,10,0.72), rgba(30,12,8,0.55));color:#ffb48a;font-size:0.8rem;font-weight:800;letter-spacing:0.1em;opacity:0;transition:opacity 0.3s;';
    el.textContent = 'SPEED 1';
    return el;
  }

  private createPowerDisplay(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:calc(env(safe-area-inset-left) + 10px);bottom:calc(env(safe-area-inset-bottom) + 10px);max-width:min(56vw,680px);display:flex;flex-wrap:wrap;justify-content:flex-start;gap:6px;opacity:0;transition:opacity 0.3s;';
    el.textContent = '';
    return el;
  }

  private createChargeDisplay(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;right:calc(env(safe-area-inset-right) + 10px);bottom:calc(env(safe-area-inset-bottom) + 10px);padding:8px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);background:linear-gradient(180deg, rgba(9,16,28,0.78), rgba(9,16,28,0.5));display:flex;align-items:center;gap:5px;opacity:0;transition:opacity 0.3s;';
    return el;
  }

  private createAchievementToast(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 84px);transform:translateX(-50%) translateY(12px);padding:13px 20px;border-radius:999px;background:rgba(10,10,18,0.86);border:1px solid rgba(255,255,255,0.16);color:#f4f6ff;font-size:0.93rem;font-weight:800;letter-spacing:0.09em;opacity:0;transition:opacity 0.28s, transform 0.28s;box-shadow:0 10px 26px rgba(0,0,0,0.28);';
    return el;
  }

  setOnRetry(handler: () => void): void {
    this.onRetry = handler;
  }

  setOnStart(handler: () => void): void {
    this.onStart = handler;
  }

  setOnDifficultyChange(handler: (difficulty: DifficultyLevel) => void): void {
    this.onDifficultyChange = handler;
  }

  getSelectedDifficulty(): DifficultyLevel | null {
    return this.selectedDifficulty;
  }

  isMenuControlTarget(target: EventTarget | null): boolean {
    const el = target instanceof HTMLElement
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;
    if (!el) return false;
    return Boolean(el.closest('[data-difficulty]'));
  }

  showMenu(): void {
    this.selectedDifficulty = null;
    this.refreshDifficultyStyles();
    this.menuScreen.style.display = 'flex';
    this.gameOverScreen.style.display = 'none';
    this.menuScreen.style.opacity = '1';
    this.menuScreen.style.pointerEvents = 'auto';
    this.scoreDisplay.style.opacity = '0';
    this.multiplierDisplay.style.opacity = '0';
    this.powerDisplay.style.opacity = '0';
    this.chargeDisplay.style.opacity = '0';
    this.speedDisplay.style.opacity = '0';
    this.gameOverScreen.style.opacity = '0';
    this.gameOverScreen.style.pointerEvents = 'none';
    this.refreshHighScoreLabel();
    this.refreshDifficultyStyles();
  }

  showPlaying(): void {
    this.menuScreen.style.display = 'none';
    this.gameOverScreen.style.display = 'none';
    this.menuScreen.style.opacity = '0';
    this.menuScreen.style.pointerEvents = 'none';
    this.scoreDisplay.style.opacity = '1';
    this.multiplierDisplay.style.opacity = '1';
    this.powerDisplay.style.opacity = '1';
    this.chargeDisplay.style.opacity = '1';
    this.speedDisplay.style.opacity = '1';
    this.gameOverScreen.style.opacity = '0';
    this.gameOverScreen.style.pointerEvents = 'none';
    this.score = 0;
    this.scoreValueEl.textContent = '0';
    this.scoreGainEl.style.opacity = '0';
    this.scoreGainEl.style.transform = 'translateY(7px)';
    this.multiplierDisplay.textContent = 'POINT UNIT x1';
    this.powerDisplay.innerHTML = '';
  }

  showGameOver(score: number, difficulty: DifficultyLevel): void {
    this.menuScreen.style.display = 'none';
    this.gameOverScreen.style.display = 'flex';
    this.menuScreen.style.opacity = '0';
    this.menuScreen.style.pointerEvents = 'none';
    this.scoreDisplay.style.opacity = '0';
    this.multiplierDisplay.style.opacity = '0';
    this.powerDisplay.style.opacity = '0';
    this.chargeDisplay.style.opacity = '0';
    this.speedDisplay.style.opacity = '0';
    this.gameOverScreen.style.opacity = '1';
    this.gameOverScreen.style.pointerEvents = 'auto';
    const finalScore = this.gameOverScreen.querySelector('.final-score');
    if (finalScore) finalScore.textContent = String(score);
    const hs = this.gameOverScreen.querySelector('.hs-over');
    const diffName = difficulty === 'easy' ? 'EASY' : difficulty === 'hard' ? 'HARD' : 'MEDIUM';
    if (hs) hs.textContent = `${diffName} ${String(getHighScore(difficulty))}`;
  }

  updateScore(score: number): void {
    const previous = this.score;
    this.score = score;
    const prevFloor = Math.floor(previous);
    const nextFloor = Math.floor(score);
    this.scoreValueEl.textContent = this.formatScore(nextFloor);
    const gain = nextFloor - prevFloor;
    if (gain > 0) {
      this.scorePulseTimer += 1;
      const pulseId = this.scorePulseTimer;
      this.scoreDisplay.style.transform = 'translateX(-50%) scale(1.055)';

      this.scoreGainEl.textContent = `+${this.formatScore(gain)}`;
      this.scoreGainEl.style.opacity = '1';
      this.scoreGainEl.style.transform = 'translateY(0)';

      window.setTimeout(() => {
        if (pulseId !== this.scorePulseTimer) return;
        this.scoreDisplay.style.transform = 'translateX(-50%) scale(1)';
        this.scoreGainEl.style.opacity = '0';
        this.scoreGainEl.style.transform = 'translateY(7px)';
      }, 340);
    }
  }

  private formatScore(value: number): string {
    return value.toLocaleString('en-US');
  }

  updateJumpCharges(current: number, max: number): void {
    this.chargeDisplay.innerHTML = '';
    const width = this.compactHud ? 12 : 15;
    const height = this.compactHud ? 19 : 24;
    const radius = this.compactHud ? 6 : 8;
    for (let i = 0; i < max; i++) {
      const dot = document.createElement('div');
      const active = i < current;
      dot.style.cssText = `width:${width}px;height:${height}px;border-radius:${radius}px;transition:all 0.22s;background:${active ? 'linear-gradient(180deg,#ffe16a,#ffc835)' : 'rgba(255,255,255,0.2)'};box-shadow:${active ? '0 0 14px rgba(255,217,61,0.48), inset 0 1px 1px rgba(255,255,255,0.42)' : 'none'};opacity:${active ? '1' : '0.42'};`;
      this.chargeDisplay.appendChild(dot);
    }
  }

  updateMultiplier(multiplier: number): void {
    this.multiplierDisplay.textContent = `POINT UNIT x${multiplier}`;
    const baseTransform = this.compactHud ? 'translateX(-50%)' : '';
    this.multiplierDisplay.style.transform = `${baseTransform} translateY(-1px) scale(1.03)`;
    window.setTimeout(() => {
      this.multiplierDisplay.style.transform = this.compactHud ? 'translateX(-50%)' : '';
    }, 180);
  }

  updateSpeedLevel(level: number): void {
    this.speedDisplay.textContent = `SPEED ${level}`;
    this.speedDisplay.style.opacity = '1';
  }

  updatePowerState(labels: string[]): void {
    if (labels.length === 0) {
      this.powerDisplay.innerHTML = '';
      return;
    }

    const renderedLabels = this.compactHud
      ? labels.map((label) => label.replace('MAGNET', 'MAG').replace('SWEEP', 'SWP').replace('SHIELD', 'SHLD').replace('SLOW', 'SLW'))
      : labels;

    this.powerDisplay.innerHTML = labels
      .map((_, i) => `<span style="${this.getPowerChipStyle(renderedLabels[i])}">${renderedLabels[i]}</span>`)
      .join('');
  }

  private getPowerChipStyle(label: string): string {
    const base = this.compactHud
      ? 'padding:5px 8px;border-radius:999px;font-size:0.66rem;font-weight:800;letter-spacing:0.05em;box-shadow:0 3px 10px rgba(0,0,0,0.22);'
      : 'padding:7px 13px;border-radius:999px;font-size:0.8rem;font-weight:800;letter-spacing:0.09em;box-shadow:0 5px 14px rgba(0,0,0,0.24);';

    if (label.startsWith('STAR')) {
      return `${base}border:1px solid rgba(255,226,117,0.75);background:rgba(66,54,18,0.56);color:#ffe892;`;
    }
    if (label.startsWith('MAGNET')) {
      return `${base}border:1px solid rgba(122,215,255,0.72);background:rgba(15,43,60,0.56);color:#abddff;animation:tapup-power-glow-magnet 0.9s ease-in-out infinite;`;
    }
    if (label.startsWith('SWEEP')) {
      return `${base}border:1px solid rgba(170,255,146,0.72);background:rgba(24,56,28,0.56);color:#c5ffb3;`;
    }
    if (label.startsWith('SHIELD')) {
      return `${base}border:1px solid rgba(111,240,255,0.72);background:rgba(12,44,52,0.56);color:#aef3ff;animation:tapup-power-glow-shield 1.1s ease-in-out infinite;`;
    }
    if (label.startsWith('SLOW')) {
      return `${base}border:1px solid rgba(199,146,255,0.72);background:rgba(40,26,60,0.56);color:#e1c9ff;animation:tapup-power-glow-slow 1.3s ease-in-out infinite;`;
    }
    return `${base}border:1px solid rgba(255,255,255,0.22);background:rgba(9,16,28,0.56);color:rgba(245,250,255,0.98);`;
  }

  showAchievement(title: string): void {
    this.achievementToast.textContent = `ACHIEVEMENT UNLOCKED: ${title.toUpperCase()}`;
    this.achievementToast.style.opacity = '1';
    this.achievementToast.style.transform = 'translateX(-50%) translateY(0)';

    if (this.achievementTimer) {
      window.clearTimeout(this.achievementTimer);
    }

    this.achievementTimer = window.setTimeout(() => {
      this.achievementToast.style.opacity = '0';
      this.achievementToast.style.transform = 'translateX(-50%) translateY(12px)';
    }, 1700);
  }
}
