export class InputManager {
  isHeld = false;
  private justTapped = false;
  private jumpKeyHeld = false;

  private element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
    this.bind();
  }

  private bind(): void {
    this.element.addEventListener('pointerdown', this.onDown);
    this.element.addEventListener('pointerup', this.onUp);
    this.element.addEventListener('pointerleave', this.onUp);
    this.element.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onDown = (): void => {
    this.isHeld = true;
    this.justTapped = true;
  };

  private onUp = (): void => {
    this.isHeld = false;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (e.repeat || this.jumpKeyHeld) return;
      this.jumpKeyHeld = true;
      this.justTapped = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      this.isHeld = false;
      this.jumpKeyHeld = false;
    }
  };

  consumeTap(): boolean {
    if (this.justTapped) {
      this.justTapped = false;
      return true;
    }
    return false;
  }

  resetTap(): void {
    this.justTapped = false;
  }

  dispose(): void {
    this.element.removeEventListener('pointerdown', this.onDown);
    this.element.removeEventListener('pointerup', this.onUp);
    this.element.removeEventListener('pointerleave', this.onUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
