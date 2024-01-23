import { AfterViewInit, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, PLATFORM_ID, QueryList, ViewChildren, computed, inject, input, signal } from '@angular/core';
import { ParticleComponent } from './particle.component';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-particles',
  standalone: true,
  imports: [ParticleComponent],
  templateUrl: './particles.component.html',
  styleUrl: './particles.component.css',
  host: { ngSkipHydration: 'true' },
})
export class ParticlesComponent implements OnInit, OnDestroy, AfterViewInit {
  #elementRef = inject(ElementRef) as ElementRef<HTMLElement>;
  #zone = inject(NgZone);
  @ViewChildren(ParticleComponent) particleComponents!: QueryList<ParticleComponent>;

  particlesCount = input(300, { alias: "particles" });
  particles = computed(() => Array(this.particlesCount()).fill(0).map((x, i) => i + 1));
  width = signal(0);
  height = signal(0);
  destroyed = false;

  private platformId = inject(PLATFORM_ID);

  get isBrowser() {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.width.set(this.#elementRef.nativeElement.clientWidth);
    this.height.set(this.#elementRef.nativeElement.clientHeight);
  }
  ngOnDestroy(): void {
    this.destroyed = true;
  }
  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }
    this.#zone.runOutsideAngular(() => {
      requestAnimationFrame(this.animate.bind(this));
    });
  }

  @HostListener("window:resize")
  onResize() {
    this.width.set(this.#elementRef.nativeElement.clientWidth);
    this.height.set(this.#elementRef.nativeElement.clientHeight);
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

    this.particleComponents.forEach(p => p.update(elapsed / 1000));
    requestAnimationFrame(this.animate.bind(this));
    this.#lastTime = timestamp;
  }
}
