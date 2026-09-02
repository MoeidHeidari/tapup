import { COLORS, JUMP, ORBIT, RADIUS, PLAYER } from '../config/constants';

export class Player {
  x = 0;
  y = 0;
  private angle = 0;
  private readonly angularSpeed = ORBIT.baseAngularSpeed;
  private radius = RADIUS.orbit;
  private maxRadius = RADIUS.maxRadius;
  private radialVelocity = 0;
  private jumpKick = 0;
  private collectPulse = 0;
  private jumpCharges = JUMP.maxCharges;
  private jumpRechargeTimer = 0;
  private totalAngle = 0;
  private reportedTurns = 0;
  private centerX = 0;
  private centerY = 0;
  private trail: { x: number; y: number; age: number }[] = [];

  constructor(cx: number, cy: number) {
    this.centerX = cx;
    this.centerY = cy;
    this.updatePosition();
  }

  update(dt: number, elapsed: number, gravityScale = 1): void {
    const radiusForRotation = Math.max(this.radius, 1);
    const outwardScale = Math.min(1, RADIUS.orbit / radiusForRotation);
    const effectiveAngularSpeed = this.angularSpeed * outwardScale;
    this.angle += effectiveAngularSpeed * dt;
    this.totalAngle += effectiveAngularSpeed * dt;

    const gravity = (RADIUS.inwardGravity + elapsed * RADIUS.inwardGravityRamp) * gravityScale;

    this.radialVelocity *= Math.exp(-RADIUS.radialDrag * dt);
    this.radius += this.radialVelocity * dt;
    // The closer to outer orbit, the stronger the center's pull feels.
    const pullScale = 0.7 + 0.8 * (this.radius / this.maxRadius);
    this.radius -= gravity * pullScale * dt;

    if (this.radius > this.maxRadius) {
      this.radius = this.maxRadius;
      if (this.radialVelocity > 0) this.radialVelocity *= 0.35;
    }

    if (this.radius < 0) {
      this.radius = 0;
      this.radialVelocity = 0;
    }

    this.jumpRechargeTimer += dt;
    while (this.jumpRechargeTimer >= JUMP.rechargeTime && this.jumpCharges < JUMP.maxCharges) {
      this.jumpCharges += 1;
      this.jumpRechargeTimer -= JUMP.rechargeTime;
    }

    this.jumpKick = Math.max(0, this.jumpKick - dt * 8.5);
    this.collectPulse = Math.max(0, this.collectPulse - dt * 6.2);

    this.updatePosition();
    this.updateTrail(dt);
  }

  jump(jumpImpulseScale = 1): boolean {
    if (this.jumpCharges <= 0) return false;

    this.jumpCharges -= 1;
    this.jumpRechargeTimer = 0;
    this.radialVelocity += RADIUS.jumpImpulse * jumpImpulseScale;
    this.jumpKick = 1;

    return true;
  }

  applyExternalBoost(boost: number): void {
    this.radialVelocity += boost;
    this.jumpKick = 1;
  }

  onWhiteCollected(): void {
    // White pickups are score-only feedback and do not affect radial motion.
    this.collectPulse = 1;
  }

  private updatePosition(): void {
    this.x = this.centerX + this.radius * Math.cos(this.angle);
    this.y = this.centerY + this.radius * Math.sin(this.angle);
  }

  private updateTrail(dt: number): void {
    this.trail.push({ x: this.x, y: this.y, age: 0 });
    this.trail = this.trail.filter((p) => {
      p.age += dt;
      return p.age < 0.3;
    });
    if (this.trail.length > 10) {
      this.trail = this.trail.slice(-10);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const alpha = (1 - p.age / 0.3) * 0.25;
      const size = PLAYER.radius * (1 - p.age / 0.3) * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,217,61,${alpha})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY);
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = COLORS.tether;
    ctx.lineWidth = 1.3 + this.jumpKick * 0.9;
    ctx.stroke();

    const distRatio = Math.min(this.radius / RADIUS.maxRadius, 1);
    const glowAlpha = 0.08 + distRatio * 0.15 + this.collectPulse * 0.25;

    // Visual body strain: stretch while escaping gravity, compress when pulled back.
    const outwardMomentum = Math.max(0, this.radialVelocity) / Math.max(1, RADIUS.jumpImpulse);
    const inwardMomentum = Math.max(0, -this.radialVelocity) / Math.max(1, RADIUS.jumpImpulse * 0.8);
    const leapStrain = Math.min(1, outwardMomentum * 1.3 + this.jumpKick * 0.75);
    const compressStrain = Math.min(1, inwardMomentum * 0.95);

    const stretch = 1 + leapStrain * 0.34 - compressStrain * 0.08;
    const squash = 1 - leapStrain * 0.2 + compressStrain * 0.14;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.scale(stretch, squash);

    ctx.beginPath();
    ctx.arc(0, 0, PLAYER.radius + 4 + this.collectPulse * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,217,61,${glowAlpha})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, PLAYER.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.player;
    ctx.fill();
    ctx.strokeStyle = COLORS.playerBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    const eyeYOffset = -1.4 + this.jumpKick * 0.9;
    const eyeOffsetX = 3.4;
    const eyeRadius = 2.05;
    const pupilRadius = 0.85;
    const lookX = Math.min(0.9, this.jumpKick * 0.9);

    ctx.beginPath();
    ctx.arc(-eyeOffsetX, eyeYOffset, eyeRadius, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX, eyeYOffset, eyeRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-eyeOffsetX + lookX, eyeYOffset + 0.2, pupilRadius, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + lookX, eyeYOffset + 0.2, pupilRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(24,24,32,0.95)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-eyeOffsetX + lookX + 0.25, eyeYOffset - 0.1, 0.24, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + lookX + 0.25, eyeYOffset - 0.1, 0.24, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.playerHighlight;
    ctx.fill();

    ctx.restore();
  }

  getBoundingRadius(): number {
    return PLAYER.radius;
  }

  getAngle(): number {
    return this.angle;
  }

  getRadius(): number {
    return this.radius;
  }

  getMaxRadius(): number {
    return this.maxRadius;
  }

  getIsJumping(): boolean {
    return this.radialVelocity > 0;
  }

  consumeCompletedTurns(): number {
    const turns = Math.floor(this.totalAngle / (Math.PI * 2));
    const delta = turns - this.reportedTurns;
    this.reportedTurns = turns;
    return Math.max(0, delta);
  }

  getReachedCenter(): boolean {
    return this.radius <= RADIUS.centerCircleRadius + PLAYER.radius * 0.5;
  }

  getJumpCharges(): number {
    return this.jumpCharges;
  }

  getMaxJumpCharges(): number {
    return JUMP.maxCharges;
  }

  setMaxRadius(maxRadius: number): void {
    this.maxRadius = Math.max(RADIUS.orbit, maxRadius);
    if (this.radius > this.maxRadius) {
      this.radius = this.maxRadius;
      if (this.radialVelocity > 0) this.radialVelocity *= 0.4;
    }
  }

  reset(cx: number, cy: number): void {
    this.centerX = cx;
    this.centerY = cy;
    this.angle = 0;
    this.radius = RADIUS.orbit;
    this.maxRadius = RADIUS.maxRadius;
    this.radialVelocity = 0;
    this.jumpKick = 0;
    this.collectPulse = 0;
    this.jumpCharges = JUMP.maxCharges;
    this.jumpRechargeTimer = 0;
    this.totalAngle = 0;
    this.reportedTurns = 0;
    this.trail = [];
    this.updatePosition();
  }

  setCenter(cx: number, cy: number): void {
    this.centerX = cx;
    this.centerY = cy;
  }
}
