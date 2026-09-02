import { CAMERA, COLORS } from '../config/constants';

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private cameraAngle = 0;
  private cameraZoom = 1;
  private cameraFocusX = 0;
  private cameraFocusY = 0;
  private starPatternLayer: HTMLCanvasElement | null = null;
  private starPatternVariant = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.touchAction = 'none';
    this.ctx = this.canvas.getContext('2d')!;
    container.appendChild(this.canvas);
    this.resize();
    this.resetCamera();
    window.addEventListener('resize', this.resize);
  }

  private resize = (): void => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.buildStarPatternLayer();
  };

  randomizeStarPattern(): void {
    this.starPatternVariant = Math.floor(Math.random() * 4);
    this.buildStarPatternLayer();
  }

  clear(score: number, starRangeActive = false): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    const t = Math.min(score / 60, 1);
    const r = Math.round(COLORS.bgStart[0] + (COLORS.bgEnd[0] - COLORS.bgStart[0]) * t);
    const g = Math.round(COLORS.bgStart[1] + (COLORS.bgEnd[1] - COLORS.bgStart[1]) * t);
    const b = Math.round(COLORS.bgStart[2] + (COLORS.bgEnd[2] - COLORS.bgStart[2]) * t);
    if (starRangeActive && this.starPatternLayer) {
      this.ctx.drawImage(this.starPatternLayer, 0, 0);
      this.ctx.fillStyle = `rgba(${r},${g},${b},0.68)`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    this.ctx.fillStyle = `rgb(${r},${g},${b})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private buildStarPatternLayer(): void {
    this.starPatternLayer = document.createElement('canvas');
    this.starPatternLayer.width = this.canvas.width;
    this.starPatternLayer.height = this.canvas.height;

    const ctx = this.starPatternLayer.getContext('2d');
    if (!ctx) {
      this.starPatternLayer = null;
      return;
    }

    const w = this.starPatternLayer.width;
    const h = this.starPatternLayer.height;
    const spacing = 30;

    ctx.fillStyle = 'rgb(12, 30, 58)';
    ctx.fillRect(0, 0, this.starPatternLayer.width, this.starPatternLayer.height);

    const variant = this.starPatternVariant;
    if (variant === 0) {
      ctx.strokeStyle = COLORS.bgPattern;
      ctx.lineWidth = 1.3;
      for (let x = -h; x < w + h; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - h, h);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      for (let x = 0; x < w + h; x += spacing * 1.25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + h, h);
        ctx.stroke();
      }
    } else if (variant === 1) {
      ctx.strokeStyle = 'rgba(169,221,255,0.22)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 12; i++) {
        const r = 30 + i * 42;
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (variant === 2) {
      ctx.strokeStyle = 'rgba(200,236,255,0.22)';
      ctx.lineWidth = 1.4;
      for (let y = 0; y < h + 40; y += 38) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 20) {
          const wave = Math.sin((x + y) * 0.03) * 8;
          if (x === 0) ctx.moveTo(x, y + wave);
          else ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = 'rgba(255,238,173,0.18)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 130; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const len = 10 + Math.random() * 22;
        const a = Math.random() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
    }

    for (let y = spacing * 0.5; y < h; y += spacing * 1.1) {
      ctx.beginPath();
      ctx.arc(w * 0.5, y, 3.1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fill();
    }
  }

  updateCamera(
    dt: number,
    playerAngle: number,
    playerRadius: number,
    maxRadius: number,
    playerX: number,
    playerY: number
  ): void {
    const desiredAngle = playerAngle * CAMERA.rotationInfluence;
    const angleT = 1 - Math.exp(-dt * CAMERA.smoothFactor);
    this.cameraAngle += this.getAngleDelta(this.cameraAngle, desiredAngle) * angleT;

    const radiusRatio = Math.max(0, Math.min(1, playerRadius / maxRadius));
    const shortSide = Math.min(this.canvas.width, this.canvas.height);
    const mobileZoomFactor = shortSide < 560 ? 0.82 : shortSide < 760 ? 0.9 : 1;
    const dynamicZoomIn = CAMERA.zoomIn * mobileZoomFactor;
    const dynamicZoomOut = CAMERA.zoomOut * mobileZoomFactor;
    const desiredZoom = dynamicZoomIn + (dynamicZoomOut - dynamicZoomIn) * radiusRatio;
    const zoomT = 1 - Math.exp(-dt * CAMERA.zoomSmoothFactor);
    this.cameraZoom += (desiredZoom - this.cameraZoom) * zoomT;

    const rawFollow =
      (radiusRatio - CAMERA.jumpFollowStartRatio) /
      Math.max(0.001, 1 - CAMERA.jumpFollowStartRatio);
    const clamped = Math.max(0, Math.min(1, rawFollow));
    const eased = clamped * clamped * (3 - 2 * clamped);
    const followWeight = eased * CAMERA.jumpFollowMaxWeight;
    const desiredFocusX = this.centerX + (playerX - this.centerX) * followWeight;
    const desiredFocusY = this.centerY + (playerY - this.centerY) * followWeight;
    const focusT = 1 - Math.exp(-dt * CAMERA.jumpFollowSmoothFactor);
    this.cameraFocusX += (desiredFocusX - this.cameraFocusX) * focusT;
    this.cameraFocusY += (desiredFocusY - this.cameraFocusY) * focusT;

    this.keepPlayerInFrame(playerX, playerY);
  }

  private keepPlayerInFrame(playerX: number, playerY: number): void {
    const margin = Math.max(28, Math.min(this.canvas.width, this.canvas.height) * 0.12);
    const minX = margin;
    const maxX = this.canvas.width - margin;
    const minY = margin;
    const maxY = this.canvas.height - margin;

    const cos = Math.cos(this.cameraAngle);
    const sin = Math.sin(this.cameraAngle);
    const dx = playerX - this.cameraFocusX;
    const dy = playerY - this.cameraFocusY;

    const screenX = this.centerX + (dx * cos + dy * sin) * this.cameraZoom;
    const screenY = this.centerY + (-dx * sin + dy * cos) * this.cameraZoom;

    const clampedX = Math.min(maxX, Math.max(minX, screenX));
    const clampedY = Math.min(maxY, Math.max(minY, screenY));
    const shiftX = clampedX - screenX;
    const shiftY = clampedY - screenY;
    if (Math.abs(shiftX) < 0.01 && Math.abs(shiftY) < 0.01) return;

    const invZoom = 1 / Math.max(0.001, this.cameraZoom);
    const worldShiftX = (shiftX * cos - shiftY * sin) * invZoom;
    const worldShiftY = (shiftX * sin + shiftY * cos) * invZoom;

    this.cameraFocusX -= worldShiftX;
    this.cameraFocusY -= worldShiftY;
  }

  resetCamera(): void {
    this.cameraAngle = 0;
    this.cameraZoom = 1;
    this.cameraFocusX = this.centerX;
    this.cameraFocusY = this.centerY;
  }

  beginWorld(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(-this.cameraAngle);
    this.ctx.scale(this.cameraZoom, this.cameraZoom);
    this.ctx.translate(-this.cameraFocusX, -this.cameraFocusY);
  }

  endWorld(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private getAngleDelta(from: number, to: number): number {
    const twoPi = Math.PI * 2;
    let delta = (to - from) % twoPi;
    if (delta > Math.PI) delta -= twoPi;
    if (delta < -Math.PI) delta += twoPi;
    return delta;
  }

  get centerX(): number {
    return this.canvas.width / 2;
  }

  get centerY(): number {
    return this.canvas.height / 2;
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.canvas.remove();
  }
}
