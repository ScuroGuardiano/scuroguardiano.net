const PARTICLE_DIRECTION = {
  LEFT: -1,
  RIGHT: +1
} as const;

type ParticleDirection = typeof PARTICLE_DIRECTION[keyof typeof PARTICLE_DIRECTION];

export const PARTICLE_SIZE = {
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 4
}

export type ParticleSize = typeof PARTICLE_SIZE[keyof typeof PARTICLE_SIZE];

export interface IParticle {
  // Coords are percentage of available space. 0 -> 0%, 1 -> 100%
  readonly x: number;
  readonly y: number;
  readonly size: ParticleSize;
}

class Particle implements IParticle {
  constructor(
    public velocityRange: [number, number] = [0.10, 0.15],
    public chanceToDespawn = 0.03
  ) {}

  public x = 0;
  public y = 0;
  public size: ParticleSize = PARTICLE_SIZE.SMALL;
  public direction: ParticleDirection = PARTICLE_DIRECTION.RIGHT;

  public velocity = 0;
  get vMin() {
    return this.velocityRange[0];
  }
  get vMax() {
    return this.velocityRange[1];
  }

  #initialSpawn = true;

  respawn() {
    if (this.#initialSpawn) {
      this.y = Math.random();
      this.x = Math.random();
      this.#initialSpawn = false;
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
      this.respawn();
      return;
    }

    this.x += this.velocity * this.direction * dt;

    if (this.x > 1) {
      this.respawn();
    }
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
