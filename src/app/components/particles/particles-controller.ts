const PARTICLE_DIRECTION = {
  LEFT: -1,
  RIGHT: +1
} as const;

type ParticleDirection = typeof PARTICLE_DIRECTION[keyof typeof PARTICLE_DIRECTION];

export const PARTICLE_SIZE = {
  SMALL: 2,
  MEDIUM: 4,
  LARGE: 6
}

export type ParticleSize = typeof PARTICLE_SIZE[keyof typeof PARTICLE_SIZE];

export interface IParticle {
  // Coords are percentage of available space. 0 -> 0%, 1 -> 100%
  readonly x: number;
  readonly y: number;
  readonly size: ParticleSize;

  // Fade from 0 to 1, renderer should multiply opacity and size by fade value.
  readonly fade: number;
}

interface IAnimation {
  update(dt: number): void;
}

class FadeInAnimation implements IAnimation {
  constructor(private particle: Particle, private onEnd: () => void) {}
  private readonly speed = .5;

  update(dt: number): void {
    this.particle.fade += dt * this.speed;

    if (this.particle.fade >= 1) {
      this.particle.fade = 1;
      this.onEnd();
    }
  }
}

class FadeOutAnimation implements IAnimation {
  constructor(private particle: Particle, private onEnd: () => void) {}
  private readonly speed = .5;

  update(dt: number): void {
    this.particle.fade -= dt * this.speed;

    if (this.particle.fade <= 0) {
      this.particle.fade = 0;
      this.onEnd();
    }
  }
}

class Particle implements IParticle {
  constructor(
    public velocityRange: [number, number] = [0.03, 0.07],
    public chanceToDespawn = 0.03
  ) {}

  public x = 0;
  public y = 0;
  public size: ParticleSize = PARTICLE_SIZE.SMALL;
  public direction: ParticleDirection = PARTICLE_DIRECTION.RIGHT;
  public directionDeviation: number = 0;
  public fade = 1;
  private readonly directionDevMin = -Math.PI / 10;
  private readonly directionDevMax = Math.PI / 10;
  private currentAnimation?: IAnimation;
  private readonly fadeInAnimation = new FadeInAnimation(this, () => this.currentAnimation = undefined);
  private readonly fadeOutAnimation = new FadeOutAnimation(this, () => {
    this.currentAnimation = undefined;
    this.respawn();
  });

  public velocity = 0;
  get vMin() {
    return this.velocityRange[0];
  }
  get vMax() {
    return this.velocityRange[1];
  }

  #initialSpawn = true;

  despawn() {
    this.currentAnimation = this.fadeOutAnimation;
  }

  respawn() {
    if (this.#initialSpawn) {
      this.y = Math.random();
      this.x = Math.random();
    }
    else {
      this.y = Math.random();
      this.x = Math.random() / 2 - 0.2;
    }

    this.velocity = Math.random() * (this.vMax - this.vMin) + this.vMin;
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

    this.directionDeviation = this.#randomDirectionDev();

    if (this.x >= 0 && !this.#initialSpawn) {
      this.fade = 0;
    }

    this.currentAnimation = this.fadeInAnimation;
    this.#initialSpawn = false;
    return this;
  }


  /**
   *
   * @param dt delta time in seconds
   */
  update(dt: number) {
    // Each second I want some change for the particle to respawn
    // It won't be too accurate, by I will scale it with DT
    const chance = this.chanceToDespawn * dt;
    const roll = Math.random();
    if (roll <= chance) {
      this.despawn();
      return;
    }

    const traveled = this.velocity * this.direction * dt;
    this.x += traveled * Math.cos(this.directionDeviation);
    this.y += traveled * Math.sin(this.directionDeviation);

    if (this.x > 1) {
      this.respawn();
    }

    this.currentAnimation?.update(dt);
  }

  #randomDirectionDev() {
    const range = this.directionDevMax - this.directionDevMin;
    const roll = Math.random();
    return (roll * range) + this.directionDevMin;
  }
}

export class ParticlesController {
  constructor(
    particlesCount: number
  ) {
    this.setParticlesCount(particlesCount);
  }

  public get particlesCount() {
    return this.#particlesCount;
  }

  public setParticlesCount(count: number) {
    this.#particlesCount = count;

    if (!this.#inited) {
      return;
    }

    if (this.#particlesCount == this.#particles.length) {
      return;
    }

    if (this.#particlesCount < this.#particles.length) {
      this.#particles.splice(this.#particlesCount);
    }

    const toAdd = this.#particlesCount - this.#particles.length;
    for (let i = 0; i < toAdd; i++) {
      this.#particles.push(new Particle().respawn());
    }
  }

  #inited = false;
  #particlesCount!: number;
  #particles: Particle[] = [];

  get particles(): IParticle[] {
    return this.#particles;
  }

  public init() {
    if (this.#inited) {
      throw new Error("Particle controller already initialized.");
    }

    for (let i = 0; i < this.#particlesCount; i++) {
      this.#particles.push(new Particle().respawn());
    }

    this.#inited = true;
  }

  public update(dt: number) {
    /**
     *
     * @param dt delta time in seconds
     */

    this.#particles.forEach(p => p.update(dt));
  }
}
