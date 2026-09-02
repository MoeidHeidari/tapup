export const COLORS = {
  bgStart: [15, 52, 96] as const,
  bgEnd: [96, 25, 72] as const,
  bgPattern: 'rgba(255,255,255,0.2)',
  center: '#555555',
  centerBorder: '#444444',
  player: '#ffd93d',
  playerBorder: '#e6b800',
  playerHighlight: 'rgba(255,255,255,0.6)',
  playerGlow: 'rgba(255,217,61,0.2)',
  tether: 'rgba(255,255,255,0.15)',
  shadow: 'rgba(0,0,0,0.2)',
};

export const ORBIT = {
  baseAngularSpeed: 1.7,
  angularAcceleration: 0,
  maxAngularSpeed: 1.7,
  smoothFactor: 5.5,
};

export const RADIUS = {
  orbit: 140,
  startMaxRadius: 320,
  maxRadius: 540,
  growthTurnsToMax: 7,
  inwardGravity: 142,
  inwardGravityRamp: 0,
  radialDrag: 2.6,
  jumpImpulse: 640,
  centerCircleRadius: 14,
  innerGuideOffset: -26,
  outerGuideOffset: 380,
};

export const JUMP = {
  maxCharges: 4,
  rechargeTime: 0.32,
};

export const OBSTACLE = {
  minSize: 18,
  maxSize: 34,
  initialSpawnInterval: 1.05,
  minSpawnInterval: 0.32,
  spawnIntervalDecrease: 0.009,
  scoreSpawnInfluence: 0.018,
  variantUnlockScore1: 70,
  variantUnlockScore2: 170,
  variantUnlockScore3: 320,
  masterUnlockScore: 140,
  masterBaseChance: 0.015,
  masterMaxChance: 0.06,
  poolSize: 50,
  startSpeed: 30,
  speedIncrease: 3.2,
  maxSpeed: 105,
  maxDistance: 880,
  fadeDistance: 520,
  minAngularSeparation: 0.18,
  splitChance: 0.5,
  orangeOnlyChance: 0.2,
  powerupChance: 0.22,
};

export const POWER = {
  rangeBonus: 180,
  rangeDuration: 8,
  starJumpBoost: 1500,
  hitBounceImpulse: 120,
  magnetDuration: 1.1,
  magnetPull: 2600,
  sweepAngularSpeed: 4.8,
};

export const CAMERA = {
  rotationInfluence: 0.18,
  smoothFactor: 1.1,
  zoomIn: 1.36,
  zoomOut: 0.86,
  zoomSmoothFactor: 0.9,
  jumpFollowStartRatio: 0.58,
  jumpFollowMaxWeight: 0.52,
  jumpFollowSmoothFactor: 1.05,
};

export const PLAYER = {
  radius: 10,
};
