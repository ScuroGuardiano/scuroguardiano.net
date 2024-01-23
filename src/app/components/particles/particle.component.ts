import { ChangeDetectionStrategy, Component, ElementRef, Input, InputSignal, OnInit, computed, inject, input } from '@angular/core';

export const PARTICLE_DIRECTION = {
  LEFT: -1,
  RIGHT: +1
} as const;

export type ParticleDirection = typeof PARTICLE_DIRECTION[keyof typeof PARTICLE_DIRECTION];

const PARTICLE_SIZE = {
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 4
}

type ParticleSize = typeof PARTICLE_SIZE[keyof typeof PARTICLE_SIZE];

@Component({
  selector: 'app-particle',
  standalone: true,
  imports: [],
  template: `
    <div></div>
  `,
  styles: `
  :host {
    display: block;
    position: absolute;
  }
  div {
    width: var(--particle-size);
    height: var(--particle-size);
    background-color: white;
  }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParticleComponent implements OnInit {
  #elementRef = inject(ElementRef) as ElementRef<HTMLElement>;
  areaWidth = input.required<number>();
  areaHeight = input.required<number>();
  direction = input<ParticleDirection>(PARTICLE_DIRECTION.RIGHT);
  changeToDespawn = input(0.03);

  // Velocity from 0 to 1. It's percentage of width traveled per second.
  velocityRange = input<[number, number]>([0.05, 0.12]);
  vMin = computed(() => this.velocityRange()[0]);
  vMax = computed(() => this.velocityRange()[1]);

  ngOnInit(): void {
    this.respawn();
    this.update(0.016);
  }

  // some coords, coords are from 0 to 1
  x = 0;
  y = 0;
  velocity = 0;
  size: ParticleSize = PARTICLE_SIZE.SMALL;

  despawned = true;
  initialSpawn = true;

  respawn() {
    this.despawned = true;
    this.#elementRef.nativeElement.classList.remove("spawned");

    if (this.initialSpawn) {
      this.y = Math.random();
      this.x = Math.random();
      this.initialSpawn = false;
    }
    else {
      this.y = Math.random();
      this.x = Math.random() / 2 - 0.2;
    }

    this.velocity = Math.random() * (this.vMax() - this.vMin()) + this.vMin();
    // 50% small, 30% medium, 20% large.
    const sizeRoll = Math.random();
    if (sizeRoll < .5) {
      this.size = PARTICLE_SIZE.SMALL;
    }
    else if (sizeRoll < .8) {
      this.size = PARTICLE_SIZE.MEDIUM;
    }
    else {
      this.size = PARTICLE_SIZE.LARGE;
    }
    this.#elementRef.nativeElement.style.setProperty("--particle-size", `${this.size}px`);
  }

  /**
   *
   * @param dt delta time in seconds
   */
  update(dt: number) {
    if (this.despawned)
    {
      this.despawned = false;
      this.#elementRef.nativeElement.classList.add("spawned");
    }

    // Each second I want some change for the particle to respawn
    // It won't be too accurate, by I will scale it with DT
    const chance = this.changeToDespawn() * dt;
    const roll = Math.random();
    if (roll <= chance) {
      return this.respawn();
    }

    this.x += this.velocity * this.direction() * dt;
    this.#elementRef.nativeElement.style.left = `${this.x * this.areaWidth()}px`;
    this.#elementRef.nativeElement.style.top = `${this.y * this.areaHeight()}px`;

    if (this.x > 1) {
      this.respawn();
    }
  }
}
