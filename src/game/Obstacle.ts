import { OBSTACLE, POWER, RADIUS } from '../config/constants';

type Shape = 'circle' | 'roundedRect' | 'cone';
type ColorMode = 'split' | 'white' | 'orange';
type ObstacleKind = 'normal' | 'master' | 'star' | 'sweep' | 'magnet' | 'nova';
type EnemyVariant = 'basic' | 'drift' | 'orbit' | 'slicer';

export type CollisionResult = 'none' | 'white' | 'orange' | 'power-star' | 'power-sweep' | 'power-magnet' | 'power-nova';

interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  age: number;
  life: number;
  color: string;
}

interface ObstacleTickStats {
  passed: number;
  nearMisses: number;
}

interface MagnetBurstResult {
  whiteCollected: number;
}

export interface ObstacleTuning {
  spawnRateMultiplier: number;
  speedMultiplier: number;
  orangeChanceOffset: number;
  powerupChanceMultiplier: number;
}

interface ObstacleData {
  x: number;
  y: number;
  size: number;
  rotation: number;
  active: boolean;
  kind: ObstacleKind;
  shape: Shape;
  angle: number;
  speed: number;
  radialDistance: number;
  age: number;
  orangeTop: boolean;
  colorMode: ColorMode;
  nearMissAwarded: boolean;
  variant: EnemyVariant;
  driftSeed: number;
  orbitDir: number;
}

export class ObstacleManager {
  private pool: ObstacleData[] = [];
  private particles: ParticleData[] = [];
  private spawnTimer = 0;
  private powerupSpawnTimer = 0;
  private spawnInterval = OBSTACLE.initialSpawnInterval;
  private centerX: number;
  private centerY: number;
  private openingPatternActive = true;
  private magnetBurstTimer = 0;
  private magnetX = 0;
  private magnetY = 0;

  constructor(cx: number, cy: number) {
    this.centerX = cx;
    this.centerY = cy;
    for (let i = 0; i < OBSTACLE.poolSize; i++) {
      this.pool.push({
        x: cx,
        y: cy,
        size: 0,
        rotation: 0,
        active: false,
        kind: 'normal',
        shape: 'circle',
        angle: 0,
        speed: 0,
        radialDistance: 0,
        age: 0,
        orangeTop: true,
        colorMode: 'split',
        nearMissAwarded: false,
        variant: 'basic',
        driftSeed: Math.random() * Math.PI * 2,
        orbitDir: Math.random() < 0.5 ? -1 : 1,
      });
    }
  }

  update(
    dt: number,
    elapsed: number,
    score: number,
    tuning: ObstacleTuning,
    playerAngle: number,
    playerX: number,
    playerY: number,
    playerRadius: number
  ): ObstacleTickStats {
    const stats: ObstacleTickStats = { passed: 0, nearMisses: 0 };

    this.updateParticles(dt);
    this.updateMagnetParticles(dt);
    this.magnetBurstTimer = Math.max(0, this.magnetBurstTimer - dt);
    this.powerupSpawnTimer += dt;

    this.spawnTimer += dt;
    const scorePressure = Math.log2(score + 1) * OBSTACLE.scoreSpawnInfluence;
    const spawnSlope = elapsed * OBSTACLE.spawnIntervalDecrease * tuning.spawnRateMultiplier;
    const scoreSlope = scorePressure * tuning.spawnRateMultiplier;
    this.spawnInterval = Math.max(
      OBSTACLE.minSpawnInterval,
      OBSTACLE.initialSpawnInterval - spawnSlope - scoreSlope
    );

    while (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;
      this.spawn(playerAngle, elapsed, score, tuning);
    }

    for (const o of this.pool) {
      if (!o.active) continue;

      o.age += dt;
      this.applyVariantMotion(o, dt);
      const speedCap = (OBSTACLE.maxSpeed + elapsed * 0.4) * tuning.speedMultiplier;
      o.speed = Math.min(o.speed + OBSTACLE.speedIncrease * dt * tuning.speedMultiplier, speedCap);
      o.radialDistance += o.speed * dt;
      o.x = this.centerX + Math.cos(o.angle) * o.radialDistance;
      o.y = this.centerY + Math.sin(o.angle) * o.radialDistance;
      if ((o.kind === 'normal' || o.kind === 'master') && o.shape === 'cone') {
        o.rotation = o.angle + Math.PI * 0.5;
      } else {
        o.rotation = 0;
      }

      const dx = playerX - o.x;
      const dy = playerY - o.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = this.getCollisionRadius(o);
      if (!o.nearMissAwarded && dist < hitRadius + playerRadius + 20 && dist > hitRadius + playerRadius + 5) {
        o.nearMissAwarded = true;
        stats.nearMisses += 1;
      }

      if (o.radialDistance > OBSTACLE.maxDistance) {
        o.active = false;
        stats.passed += 1;
      }
    }

    if (this.openingPatternActive) {
      this.openingPatternActive = this.pool.some((o) => o.active && o.age < 2.2);
      if (!this.openingPatternActive && this.spawnTimer < 0.8) {
        this.spawnTimer = 0.8;
      }
    }

    return stats;
  }

  resolveCollision(px: number, py: number, radius: number): CollisionResult {
    let whiteHit = false;

    for (const o of this.pool) {
      if (!o.active) continue;

      const dx = px - o.x;
      const dy = py - o.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = this.getCollisionRadius(o);
      if (dist > hitRadius + radius) continue;

      if (o.kind === 'star') {
        this.spawnExplosion(o.x, o.y, '#ffd93d');
        o.active = false;
        return 'power-star';
      }
      if (o.kind === 'sweep') {
        this.spawnExplosion(o.x, o.y, '#8cff66');
        o.active = false;
        return 'power-sweep';
      }
      if (o.kind === 'magnet') {
        this.spawnExplosion(o.x, o.y, '#7ad7ff');
        o.active = false;
        return 'power-magnet';
      }
      if (o.kind === 'nova') {
        this.spawnExplosion(o.x, o.y, '#ff7df0');
        o.active = false;
        return 'power-nova';
      }

      if (o.kind === 'master') {
        this.spawnExplosion(o.x, o.y, '#ff6a45');
        o.active = false;
        return 'orange';
      }

      if (o.colorMode === 'white') {
        this.spawnExplosion(o.x, o.y, '#ffffff');
        o.active = false;
        whiteHit = true;
        continue;
      }

      if (o.colorMode === 'orange') {
        this.spawnExplosion(o.x, o.y, '#ff8c42');
        o.active = false;
        return 'orange';
      }

      const hitOrange = this.isSplitHitOrange(o, dx, dy);
      this.spawnExplosion(o.x, o.y, hitOrange ? '#ff8c42' : '#ffffff');
      o.active = false;
      if (hitOrange) return 'orange';
      whiteHit = true;
    }

    return whiteHit ? 'white' : 'none';
  }

  activateMagnetBurst(x: number, y: number): void {
    this.magnetBurstTimer = POWER.magnetDuration;
    this.magnetX = x;
    this.magnetY = y;

    const shockCount = 24;
    for (let i = 0; i < shockCount; i++) {
      const a = (i / shockCount) * Math.PI * 2;
      const speed = 160 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: 1.4 + Math.random() * 2.4,
        age: 0,
        life: 0.18 + Math.random() * 0.22,
        color: '#7ad7ff',
      });
    }
  }

  applyMagnetBurst(playerX: number, playerY: number, dt: number, pull: number): MagnetBurstResult {
    if (this.magnetBurstTimer <= 0) {
      return { whiteCollected: 0 };
    }

    this.magnetX = playerX;
    this.magnetY = playerY;

    let whiteCollected = 0;

    for (const o of this.pool) {
      if (!o.active || !this.isWhiteCollectible(o)) continue;

      const dx = this.magnetX - o.x;
      const dy = this.magnetY - o.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const move = Math.min(1, (pull * dt) / Math.max(16, dist));

      o.x += dx * move;
      o.y += dy * move;

      o.angle = Math.atan2(o.y - this.centerY, o.x - this.centerX);
      o.radialDistance = Math.sqrt(
        (o.x - this.centerX) * (o.x - this.centerX) +
        (o.y - this.centerY) * (o.y - this.centerY)
      );
      o.speed *= 0.2;

      if (dist < this.getCollisionRadius(o) + 17) {
        o.active = false;
        this.spawnExplosion(o.x, o.y, '#7ad7ff');
        whiteCollected += 1;
      }
    }

    return { whiteCollected };
  }

  isMagnetBurstActive(): boolean {
    return this.magnetBurstTimer > 0;
  }

  consumeWhitesBySweep(prevAngle: number, currentAngle: number): number {
    let collected = 0;

    for (const o of this.pool) {
      if (!o.active || !this.isWhiteCollectible(o)) continue;
      if (!this.anglePassed(prevAngle, currentAngle, o.angle)) continue;
      o.active = false;
      this.spawnExplosion(o.x, o.y, '#ffffff');
      collected += 1;
    }

    return collected;
  }

  clearEnemiesAbovePlayer(playerX: number, playerY: number): number {
    const dirX = playerX - this.centerX;
    const dirY = playerY - this.centerY;
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len < 1) return 0;

    const nx = dirX / len;
    const ny = dirY / len;
    let cleared = 0;

    for (const o of this.pool) {
      if (!o.active || (o.kind !== 'normal' && o.kind !== 'master')) continue;

      const vx = o.x - playerX;
      const vy = o.y - playerY;
      const dot = vx * nx + vy * ny;
      if (dot <= 0) continue;

      o.active = false;
      this.spawnExplosion(o.x, o.y, '#ff7df0');
      cleared += 1;
    }

    return cleared;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const o of this.pool) {
      if (!o.active) continue;

      const spawnT = Math.min(o.age / 0.25, 1);
      const spawnEase = 1 - Math.pow(1 - spawnT, 3);

      let alpha = 1;
      if (o.radialDistance > OBSTACLE.fadeDistance) {
        const t = (o.radialDistance - OBSTACLE.fadeDistance) / (OBSTACLE.maxDistance - OBSTACLE.fadeDistance);
        const smooth = Math.max(0, Math.min(1, t));
        alpha = 1 - (smooth * smooth * (3 - 2 * smooth));
      }

      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.rotation);
      ctx.scale(0.55 + spawnEase * 0.45, 0.55 + spawnEase * 0.45);
      const circleBoost = o.kind === 'normal' && o.shape === 'circle' ? 1.13 : 1;
      ctx.globalAlpha *= Math.min(1, alpha * (0.2 + spawnEase * 0.8) * circleBoost);

      if (o.kind === 'normal' || o.kind === 'master') {
        this.drawNormalObstacle(ctx, o);
        if (o.kind === 'master') {
          this.drawMasterAura(ctx, o.size);
        }
      } else {
        this.drawPowerup(ctx, o);
      }

      ctx.restore();
    }

    for (const p of this.particles) {
      const t = p.age / p.life;
      const alpha = Math.max(0, 1 - t);
      const size = p.size * (1 - t * 0.65);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.2, size), 0, Math.PI * 2);
      ctx.fillStyle = this.particleColorWithAlpha(p.color, alpha * 0.9);
      ctx.fill();
    }

    if (this.magnetBurstTimer > 0) {
      const t = this.magnetBurstTimer / POWER.magnetDuration;
      const pulse = 1 - t;

      ctx.save();
      ctx.translate(this.magnetX, this.magnetY);

      const ringR = 20 + pulse * 94;
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, ringR);
      g.addColorStop(0, 'rgba(173,235,255,0.78)');
      g.addColorStop(0.42, 'rgba(89,189,240,0.36)');
      g.addColorStop(1, 'rgba(122,215,255,0.01)');
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      for (let i = 0; i < 3; i++) {
        const off = i * 0.62;
        ctx.beginPath();
        ctx.arc(0, 0, 18 + pulse * (70 + i * 16), -pulse * 12 + off, -pulse * 12 + off + Math.PI * 0.95);
        ctx.strokeStyle = `rgba(160,236,255,${0.65 - i * 0.15})`;
        ctx.lineWidth = 3 - i * 0.55;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawNormalObstacle(ctx: CanvasRenderingContext2D, o: ObstacleData): void {
    if (o.colorMode === 'white') {
      this.fillShape(ctx, o.shape, o.size, '#ffffff');
      return;
    }

    if (o.colorMode === 'orange') {
      this.fillShape(ctx, o.shape, o.size, '#ff8c42');
      return;
    }

    this.clipShape(ctx, o.shape, o.size);

    const halfHeight = o.size * 1.1;
    if (o.orangeTop) {
      ctx.fillStyle = '#ff8c42';
      ctx.fillRect(-halfHeight, -halfHeight, halfHeight * 2, halfHeight);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-halfHeight, 0, halfHeight * 2, halfHeight);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-halfHeight, -halfHeight, halfHeight * 2, halfHeight);
      ctx.fillStyle = '#ff8c42';
      ctx.fillRect(-halfHeight, 0, halfHeight * 2, halfHeight);
    }

    ctx.restore();
    this.strokeShape(ctx, o.shape, o.size);
  }

  private drawMasterAura(ctx: CanvasRenderingContext2D, size: number): void {
    const r = size * 0.68;
    ctx.beginPath();
    ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,120,84,0.72)';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r + 14, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,160,120,0.32)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawPowerup(ctx: CanvasRenderingContext2D, o: ObstacleData): void {
    const baseRadius = o.size * 0.5;

    ctx.beginPath();
    ctx.arc(0, 0, baseRadius + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();

    if (o.kind === 'star') {
      ctx.beginPath();
      const spikes = 5;
      const outer = baseRadius;
      const inner = baseRadius * 0.45;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = -Math.PI / 2 + (i * Math.PI) / spikes;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = '#ffd93d';
      ctx.fill();
      ctx.strokeStyle = '#f6b800';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      return;
    }

    if (o.kind === 'magnet') {
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 0.9, Math.PI * 0.1, Math.PI * 0.9, true);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#7ad7ff';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-baseRadius * 0.7, -baseRadius * 0.15, baseRadius * 0.18, 0, Math.PI * 2);
      ctx.arc(baseRadius * 0.7, -baseRadius * 0.15, baseRadius * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = '#d8f4ff';
      ctx.fill();
      return;
    }

    if (o.kind === 'nova') {
      const ring = baseRadius * 0.86;
      ctx.beginPath();
      ctx.arc(0, 0, ring, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff7df0';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -ring * 0.95);
      ctx.lineTo(ring * 0.3, -ring * 0.2);
      ctx.lineTo(ring * 0.05, -ring * 0.2);
      ctx.lineTo(ring * 0.05, ring * 0.88);
      ctx.lineTo(-ring * 0.05, ring * 0.88);
      ctx.lineTo(-ring * 0.05, -ring * 0.2);
      ctx.lineTo(-ring * 0.3, -ring * 0.2);
      ctx.closePath();
      ctx.fillStyle = '#ffc1f8';
      ctx.fill();
      return;
    }

    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * 0.88, 0, Math.PI * 2);
    ctx.strokeStyle = '#8cff66';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-baseRadius * 0.45, 0);
    ctx.lineTo(0, -baseRadius * 0.45);
    ctx.lineTo(baseRadius * 0.45, 0);
    ctx.lineTo(0, baseRadius * 0.45);
    ctx.closePath();
    ctx.fillStyle = '#c9ff9f';
    ctx.fill();
  }

  private fillShape(ctx: CanvasRenderingContext2D, shape: Shape, size: number, color: string): void {
    this.beginShapePath(ctx, shape, size);
    ctx.fillStyle = color;
    ctx.fill();
    this.strokeShape(ctx, shape, size);
  }

  private strokeShape(ctx: CanvasRenderingContext2D, shape: Shape, size: number): void {
    this.beginShapePath(ctx, shape, size);
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  private clipShape(ctx: CanvasRenderingContext2D, shape: Shape, size: number): void {
    ctx.save();
    this.beginShapePath(ctx, shape, size);
    ctx.clip();
  }

  private beginShapePath(ctx: CanvasRenderingContext2D, shape: Shape, s: number): void {
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      return;
    }

    if (shape === 'roundedRect') {
      const w = s * 1.45;
      const h = s * 0.9;
      const r = h * 0.24;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + r, -h / 2);
      ctx.lineTo(w / 2 - r, -h / 2);
      ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      ctx.lineTo(w / 2, h / 2 - r);
      ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      ctx.lineTo(-w / 2 + r, h / 2);
      ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      ctx.lineTo(-w / 2, -h / 2 + r);
      ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      ctx.closePath();
      return;
    }

    const h = s * 0.95;
    const w = s * 0.66;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
  }

  private isSplitHitOrange(o: ObstacleData, dx: number, dy: number): boolean {
    const cos = Math.cos(o.rotation);
    const sin = Math.sin(o.rotation);
    const localY = -dx * sin + dy * cos;
    const hitTopHalf = localY < 0;
    return o.orangeTop ? hitTopHalf : !hitTopHalf;
  }

  private getCollisionRadius(o: ObstacleData): number {
    if (o.kind === 'master') return o.size * 0.72;
    if (o.kind !== 'normal') return o.size * 0.55;
    if (o.shape === 'circle') return o.size * 0.5;
    if (o.shape === 'roundedRect') return o.size * 0.68;
    return o.size * 0.46;
  }

  private isWhiteCollectible(o: ObstacleData): boolean {
    return o.kind === 'normal' && o.colorMode !== 'orange';
  }

  private spawn(playerAngle: number, elapsed: number, score: number, tuning: ObstacleTuning): void {
    const free = this.pool.find((o) => !o.active);
    if (!free) return;

    const spawnJitter = (Math.random() - 0.5) * 1.1;
    const angle = this.normalizeAngle(playerAngle + Math.PI + spawnJitter);

    for (const o of this.pool) {
      if (!o.active) continue;
      const da = Math.abs(this.getDeltaAngle(angle, o.angle));
      if (da < OBSTACLE.minAngularSeparation && o.radialDistance < 220) {
        return;
      }
    }

    const forcePowerup = this.powerupSpawnTimer >= 6;
    const powerupChance = Math.max(0.05, Math.min(0.45, OBSTACLE.powerupChance * tuning.powerupChanceMultiplier));
    const isPowerup = forcePowerup || Math.random() < powerupChance;

    free.active = true;
    free.age = 0;
    free.nearMissAwarded = false;
    free.angle = angle;
    free.radialDistance = 8 + Math.random() * 8;
    free.speed = (OBSTACLE.startSpeed + Math.random() * 16 + elapsed * 0.5) * tuning.speedMultiplier;
    free.rotation = 0;
    free.driftSeed = Math.random() * Math.PI * 2;
    free.orbitDir = Math.random() < 0.5 ? -1 : 1;
    free.variant = 'basic';

    if (isPowerup) {
      this.powerupSpawnTimer = 0;
      const roll = Math.random();
      free.kind = roll < 0.25 ? 'star' : roll < 0.5 ? 'magnet' : roll < 0.75 ? 'sweep' : 'nova';
      free.shape = 'circle';
      free.size = 24 + Math.random() * 8;
      free.colorMode = 'white';
      free.orangeTop = false;
      free.speed *= 0.92;
    } else {
      const masterChance = this.getMasterSpawnChance(score);
      const isMaster = score >= OBSTACLE.masterUnlockScore && Math.random() < masterChance;

      free.kind = isMaster ? 'master' : 'normal';
      const roll = Math.random();
      let colorMode: ColorMode = 'split';
      const orangeChance = Math.max(0.08, Math.min(0.56, OBSTACLE.orangeOnlyChance + tuning.orangeChanceOffset));
      if (!isMaster) {
        if (roll < orangeChance) colorMode = 'orange';
        else if (roll > orangeChance + OBSTACLE.splitChance) colorMode = 'white';
      } else {
        colorMode = 'orange';
      }

      const shapeRoll = Math.random();
      if (shapeRoll < (isMaster ? 0.76 : 0.56)) free.shape = 'circle';
      else if (shapeRoll < (isMaster ? 0.96 : 0.82)) free.shape = 'roundedRect';
      else free.shape = 'cone';
      free.size = OBSTACLE.minSize + Math.random() * (OBSTACLE.maxSize - OBSTACLE.minSize);
      if (isMaster) {
        free.size *= 2.05;
      }
      if (free.shape === 'circle') {
        free.size *= 1.12;
      }
      if (free.shape === 'cone') {
        free.size *= 0.74;
      }
      free.colorMode = colorMode;
      free.orangeTop = Math.random() < 0.5;
      free.variant = this.pickEnemyVariant(score, isMaster);
      if (isMaster) {
        free.speed *= 0.84;
      }
    }

    if ((free.kind === 'normal' || free.kind === 'master') && free.shape === 'cone') {
      free.rotation = free.angle + Math.PI * 0.5;
    }

    free.x = this.centerX + Math.cos(angle) * free.radialDistance;
    free.y = this.centerY + Math.sin(angle) * free.radialDistance;
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
  }

  private updateMagnetParticles(dt: number): void {
    if (this.magnetBurstTimer <= 0) return;

    const pullT = 1 - this.magnetBurstTimer / POWER.magnetDuration;
    const count = 5;
    const radius = 28 + pullT * 110;

    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = this.magnetX + Math.cos(a) * radius;
      const y = this.magnetY + Math.sin(a) * radius;
      const vx = (this.magnetX - x) * (2.4 + Math.random() * 1.5);
      const vy = (this.magnetY - y) * (2.4 + Math.random() * 1.5);

      this.particles.push({
        x,
        y,
        vx,
        vy,
        size: 1 + Math.random() * 2.2,
        age: 0,
        life: 0.14 + Math.random() * 0.18,
        color: '#7ad7ff',
      });
    }
  }

  private spawnExplosion(x: number, y: number, color: string): void {
    const count = 18 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 46 + Math.random() * 138;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: 1.5 + Math.random() * 3.8,
        age: 0,
        life: 0.22 + Math.random() * 0.36,
        color,
      });
    }
  }

  private particleColorWithAlpha(hex: string, alpha: number): string {
    if (hex === '#ffffff') {
      return `rgba(255,255,255,${alpha})`;
    }
    if (hex === '#ffd93d') {
      return `rgba(255,217,61,${alpha})`;
    }
    if (hex === '#7ad7ff') {
      return `rgba(122,215,255,${alpha})`;
    }
    if (hex === '#8cff66') {
      return `rgba(140,255,102,${alpha})`;
    }
    return `rgba(255,140,66,${alpha})`;
  }

  private normalizeAngle(a: number): number {
    let out = a % (Math.PI * 2);
    if (out < 0) out += Math.PI * 2;
    return out;
  }

  private getDeltaAngle(from: number, to: number): number {
    const twoPi = Math.PI * 2;
    let delta = (to - from) % twoPi;
    if (delta > Math.PI) delta -= twoPi;
    if (delta < -Math.PI) delta += twoPi;
    return delta;
  }

  private anglePassed(prevAngle: number, currentAngle: number, target: number): boolean {
    const a = this.normalizeAngle(prevAngle);
    const b = this.normalizeAngle(currentAngle);
    const t = this.normalizeAngle(target);

    if (a <= b) {
      return t >= a && t <= b;
    }

    return t >= a || t <= b;
  }

  reset(): void {
    this.spawnTimer = 0;
    this.powerupSpawnTimer = 0;
    this.spawnInterval = OBSTACLE.initialSpawnInterval;
    for (const o of this.pool) o.active = false;
    this.openingPatternActive = true;
    this.magnetBurstTimer = 0;
    this.magnetX = this.centerX;
    this.magnetY = this.centerY;
    this.seedOpeningCircles();
    this.spawnTimer = -0.6;
  }

  setCenter(cx: number, cy: number): void {
    this.centerX = cx;
    this.centerY = cy;
  }

  private seedOpeningCircles(): void {
    const ringCount = 14;
    const angleStep = (Math.PI * 2) / ringCount;
    const radius = RADIUS.orbit + 12;

    for (let i = 0; i < ringCount; i++) {
      const free = this.pool.find((o) => !o.active);
      if (!free) return;

      const angle = i * angleStep;
      free.active = true;
      free.kind = 'normal';
      free.shape = 'circle';
      free.size = OBSTACLE.minSize + (OBSTACLE.maxSize - OBSTACLE.minSize) * (0.35 + Math.random() * 0.35);
      free.angle = angle;
      free.radialDistance = radius;
      free.speed = OBSTACLE.startSpeed * (0.42 + Math.random() * 0.25);
      free.rotation = 0;
      free.orangeTop = false;
      free.colorMode = 'white';
      free.age = 0;
      free.nearMissAwarded = false;
      free.variant = 'basic';
      free.driftSeed = Math.random() * Math.PI * 2;
      free.orbitDir = Math.random() < 0.5 ? -1 : 1;
      free.x = this.centerX + Math.cos(angle) * free.radialDistance;
      free.y = this.centerY + Math.sin(angle) * free.radialDistance;
    }
  }

  private pickEnemyVariant(score: number, isMaster: boolean): EnemyVariant {
    if (isMaster) {
      return Math.random() < 0.5 ? 'orbit' : 'slicer';
    }

    if (score < OBSTACLE.variantUnlockScore1) {
      return 'basic';
    }
    if (score < OBSTACLE.variantUnlockScore2) {
      return Math.random() < 0.65 ? 'basic' : 'drift';
    }
    if (score < OBSTACLE.variantUnlockScore3) {
      const roll = Math.random();
      if (roll < 0.45) return 'basic';
      if (roll < 0.78) return 'drift';
      return 'orbit';
    }

    const roll = Math.random();
    if (roll < 0.35) return 'drift';
    if (roll < 0.68) return 'orbit';
    if (roll < 0.9) return 'slicer';
    return 'basic';
  }

  private getMasterSpawnChance(score: number): number {
    if (score < OBSTACLE.masterUnlockScore) {
      return 0;
    }

    const growth = Math.min(1, (score - OBSTACLE.masterUnlockScore) / 420);
    return OBSTACLE.masterBaseChance + (OBSTACLE.masterMaxChance - OBSTACLE.masterBaseChance) * growth;
  }

  private applyVariantMotion(o: ObstacleData, dt: number): void {
    if (o.kind !== 'normal' && o.kind !== 'master') {
      return;
    }

    if (o.variant === 'drift') {
      o.angle += Math.sin(o.age * 2.3 + o.driftSeed) * 0.45 * dt;
      return;
    }

    if (o.variant === 'orbit') {
      const drift = (0.26 + Math.min(0.35, o.radialDistance / 700)) * o.orbitDir;
      o.angle += drift * dt;
      return;
    }

    if (o.variant === 'slicer') {
      const wiggle = Math.sin(o.age * 8 + o.driftSeed) * 0.3;
      o.angle += (o.orbitDir * 0.12 + wiggle) * dt;
    }
  }
}
