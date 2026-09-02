import { COLORS, RADIUS } from '../config/constants';

export class Arena {
  private centerX: number;
  private centerY: number;
  private dashOffset = 0;

  constructor(cx: number, cy: number) {
    this.centerX = cx;
    this.centerY = cy;
  }

  update(dt: number): void {
    this.dashOffset += dt * 15;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cx = this.centerX;
    const cy = this.centerY;
    const innerRadius = RADIUS.orbit + RADIUS.innerGuideOffset;
    const outerRadius = RADIUS.orbit + RADIUS.outerGuideOffset;

    // Layered guide lines to make circular lanes clearer.
    const rings = 7;
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      const r = innerRadius + (outerRadius - innerRadius) * t;
      const alpha = 0.045 + (1 - t) * 0.03;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = i === 2 ? 1.5 : 1;
      if (i % 2 === 0) {
        ctx.setLineDash([3, 7]);
        ctx.lineDashOffset = -this.dashOffset * (0.35 + t * 0.7);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(cx, cy, RADIUS.orbit, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 9]);
    ctx.lineDashOffset = -this.dashOffset;
    ctx.stroke();
    ctx.setLineDash([]);

    // Center hole: bright ring + deep core for clearer target/ danger zone.
    ctx.beginPath();
    ctx.arc(cx, cy, RADIUS.centerCircleRadius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.26)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, RADIUS.centerCircleRadius, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, RADIUS.centerCircleRadius);
    g.addColorStop(0, 'rgba(9,10,16,1)');
    g.addColorStop(1, 'rgba(28,31,44,1)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,136,165,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.95)';
    ctx.fill();
  }

  setCenter(cx: number, cy: number): void {
    this.centerX = cx;
    this.centerY = cy;
  }
}
