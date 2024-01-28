import { AfterViewInit, Component, ElementRef, HostListener, NgZone, OnDestroy, PLATFORM_ID, ViewChild, effect, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ParticlesController } from './particles-controller';
import IRenderer from './renderer';
import Canvas2DRenderer from './canvas2d.renderer';

@Component({
  selector: 'app-particles',
  standalone: true,
  imports: [],
  templateUrl: './particles.component.html',
  styleUrl: './particles.component.css',
  host: { ngSkipHydration: 'true' },
})
export class ParticlesComponent implements OnDestroy, AfterViewInit {
  constructor() {
    effect(() => {
      this.particlesController.setParticlesCount(this.particlesCount());
    });
  }

  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  #zone = inject(NgZone);
  particlesCount = input(100, { alias: "particles" });
  destroyed = false;

  particlesController = new ParticlesController(this.particlesCount());
  renderer?: IRenderer;

  ngOnDestroy(): void {
    this.destroyed = true;
  }
  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.#zone.runOutsideAngular(() => {
      this.renderer = new Canvas2DRenderer(this.canvas.nativeElement);
      this.particlesController.init();
      requestAnimationFrame(this.animate.bind(this));
    });

    this.onResize();
  }

  private platformId = inject(PLATFORM_ID);

  get isBrowser() {
    return isPlatformBrowser(this.platformId);
  }

  @HostListener("window:resize")
  onResize() {
    this.renderer?.onResize();
  }

  #lastTime = 0;

  animate(timestamp: number) {
    if (this.destroyed) {
      return;
    }
    if (this.#lastTime === 0) {
      this.#lastTime = timestamp;
    }
    const elapsed = timestamp - this.#lastTime;

    this.particlesController.update(elapsed / 1000);
    this.renderer!.render(this.particlesController.particles);

    requestAnimationFrame(this.animate.bind(this));
    this.#lastTime = timestamp;
  }
}
