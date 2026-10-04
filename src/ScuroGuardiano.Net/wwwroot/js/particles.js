var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Particle_instances, _Particle_initialSpawn, _Particle_randomDirectionDev, _ParticlesController_inited, _ParticlesController_particlesCount, _ParticlesController_particles, _Canvas2DRenderer_canvas, _Canvas2DRenderer_context, _ParticleComponent_renderer, _ParticleComponent_particlesController, _ParticleComponent_destroyed, _ParticleComponent_lastTime, _ParticleComponent_listenerFn;
const PARTICLE_DIRECTION = {
    LEFT: -1,
    RIGHT: +1
};
const PARTICLE_SIZE = {
    SMALL: 2,
    MEDIUM: 4,
    LARGE: 6
};
class FadeInAnimation {
    constructor(particle, onEnd) {
        this.particle = particle;
        this.onEnd = onEnd;
        this.speed = .5;
    }
    update(dt) {
        this.particle.fade += dt * this.speed;
        if (this.particle.fade >= 1) {
            this.particle.fade = 1;
            this.onEnd();
        }
    }
}
class FadeOutAnimation {
    constructor(particle, onEnd) {
        this.particle = particle;
        this.onEnd = onEnd;
        this.speed = .5;
    }
    update(dt) {
        this.particle.fade -= dt * this.speed;
        if (this.particle.fade <= 0) {
            this.particle.fade = 0;
            this.onEnd();
        }
    }
}
class Particle {
    constructor(velocityRange = [0.03, 0.07], chanceToDespawn = 0.03) {
        _Particle_instances.add(this);
        this.velocityRange = velocityRange;
        this.chanceToDespawn = chanceToDespawn;
        this.x = 0;
        this.y = 0;
        this.size = PARTICLE_SIZE.SMALL;
        this.direction = PARTICLE_DIRECTION.RIGHT;
        this.directionDeviation = 0;
        this.fade = 1;
        this.directionDevMin = -Math.PI / 10;
        this.directionDevMax = Math.PI / 10;
        this.fadeInAnimation = new FadeInAnimation(this, () => this.currentAnimation = undefined);
        this.fadeOutAnimation = new FadeOutAnimation(this, () => {
            this.currentAnimation = undefined;
            this.respawn();
        });
        this.velocity = 0;
        _Particle_initialSpawn.set(this, true);
    }
    get vMin() {
        return this.velocityRange[0];
    }
    get vMax() {
        return this.velocityRange[1];
    }
    despawn() {
        this.currentAnimation = this.fadeOutAnimation;
    }
    respawn() {
        if (__classPrivateFieldGet(this, _Particle_initialSpawn, "f")) {
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
        this.directionDeviation = __classPrivateFieldGet(this, _Particle_instances, "m", _Particle_randomDirectionDev).call(this);
        if (this.x >= 0 && !__classPrivateFieldGet(this, _Particle_initialSpawn, "f")) {
            this.fade = 0;
        }
        this.currentAnimation = this.fadeInAnimation;
        __classPrivateFieldSet(this, _Particle_initialSpawn, false, "f");
        return this;
    }
    /**
     *
     * @param dt delta time in seconds
     */
    update(dt) {
        var _a;
        // Each second I want some change for the particle to respawn
        // It won't be too accurate, by I will scale it with DT
        let chance = this.chanceToDespawn * dt;
        // To avoid despawning it all when on ALT-TAB, I will add limit to 1 second here ^^
        if (chance > this.chanceToDespawn) {
            chance = this.chanceToDespawn;
        }
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
        (_a = this.currentAnimation) === null || _a === void 0 ? void 0 : _a.update(dt);
    }
}
_Particle_initialSpawn = new WeakMap(), _Particle_instances = new WeakSet(), _Particle_randomDirectionDev = function _Particle_randomDirectionDev() {
    const range = this.directionDevMax - this.directionDevMin;
    const roll = Math.random();
    return (roll * range) + this.directionDevMin;
};
class ParticlesController {
    constructor(particlesCount) {
        _ParticlesController_inited.set(this, false);
        _ParticlesController_particlesCount.set(this, void 0);
        _ParticlesController_particles.set(this, []);
        this.setParticlesCount(particlesCount);
    }
    get particlesCount() {
        return __classPrivateFieldGet(this, _ParticlesController_particlesCount, "f");
    }
    setParticlesCount(count) {
        __classPrivateFieldSet(this, _ParticlesController_particlesCount, count, "f");
        if (!__classPrivateFieldGet(this, _ParticlesController_inited, "f")) {
            return;
        }
        if (__classPrivateFieldGet(this, _ParticlesController_particlesCount, "f") == __classPrivateFieldGet(this, _ParticlesController_particles, "f").length) {
            return;
        }
        if (__classPrivateFieldGet(this, _ParticlesController_particlesCount, "f") < __classPrivateFieldGet(this, _ParticlesController_particles, "f").length) {
            __classPrivateFieldGet(this, _ParticlesController_particles, "f").splice(__classPrivateFieldGet(this, _ParticlesController_particlesCount, "f"));
        }
        const toAdd = __classPrivateFieldGet(this, _ParticlesController_particlesCount, "f") - __classPrivateFieldGet(this, _ParticlesController_particles, "f").length;
        for (let i = 0; i < toAdd; i++) {
            __classPrivateFieldGet(this, _ParticlesController_particles, "f").push(new Particle().respawn());
        }
    }
    get particles() {
        return __classPrivateFieldGet(this, _ParticlesController_particles, "f");
    }
    init() {
        if (__classPrivateFieldGet(this, _ParticlesController_inited, "f")) {
            throw new Error("Particle controller already initialized.");
        }
        for (let i = 0; i < __classPrivateFieldGet(this, _ParticlesController_particlesCount, "f"); i++) {
            __classPrivateFieldGet(this, _ParticlesController_particles, "f").push(new Particle().respawn());
        }
        __classPrivateFieldSet(this, _ParticlesController_inited, true, "f");
    }
    update(dt) {
        /**
         *
         * @param dt delta time in seconds
         */
        if (dt > 1) {
            // Browser pause the animation on alt tab, so to avoid ugly all particles despawn
            // I will set time to 1/60 of a second so animation would look smooth uwu
            dt = 1 / 60;
        }
        __classPrivateFieldGet(this, _ParticlesController_particles, "f").forEach(p => p.update(dt));
    }
}
_ParticlesController_inited = new WeakMap(), _ParticlesController_particlesCount = new WeakMap(), _ParticlesController_particles = new WeakMap();
class Canvas2DRenderer {
    constructor(canvasElement) {
        _Canvas2DRenderer_canvas.set(this, void 0);
        _Canvas2DRenderer_context.set(this, void 0);
        __classPrivateFieldSet(this, _Canvas2DRenderer_canvas, canvasElement, "f");
        this.resizeCanvasToDisplaySize();
        const context = canvasElement.getContext('2d');
        if (!context) {
            throw new Error("Can't get 2D context.");
        }
        __classPrivateFieldSet(this, _Canvas2DRenderer_context, context, "f");
    }
    render(particles) {
        const ctx = __classPrivateFieldGet(this, _Canvas2DRenderer_context, "f");
        const { width, height } = ctx.canvas;
        ctx.clearRect(0, 0, width, height);
        ctx.shadowBlur = 4;
        ctx.shadowColor = "rgb(255, 255, 255)";
        particles.forEach(p => {
            const opacity = 0.3 * p.fade;
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.arc(p.x * width, p.y * height, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
        });
    }
    onResize() {
        this.resizeCanvasToDisplaySize();
    }
    resizeCanvasToDisplaySize() {
        // Lookup the size the browser is displaying the canvas in CSS pixels.
        const displayWidth = __classPrivateFieldGet(this, _Canvas2DRenderer_canvas, "f").clientWidth;
        const displayHeight = __classPrivateFieldGet(this, _Canvas2DRenderer_canvas, "f").clientHeight;
        // Check if the canvas is not the same size.
        const needResize = __classPrivateFieldGet(this, _Canvas2DRenderer_canvas, "f").width !== displayWidth ||
            __classPrivateFieldGet(this, _Canvas2DRenderer_canvas, "f").height !== displayHeight;
        if (needResize) {
            // Make the canvas the same size
            __classPrivateFieldGet(this, _Canvas2DRenderer_canvas, "f").width = displayWidth;
            __classPrivateFieldGet(this, _Canvas2DRenderer_canvas, "f").height = displayHeight;
        }
        return needResize;
    }
}
_Canvas2DRenderer_canvas = new WeakMap(), _Canvas2DRenderer_context = new WeakMap();
class ParticleComponent {
    constructor(canvas, particlesCount) {
        this.canvas = canvas;
        _ParticleComponent_renderer.set(this, void 0);
        _ParticleComponent_particlesController.set(this, void 0);
        _ParticleComponent_destroyed.set(this, false);
        _ParticleComponent_lastTime.set(this, 0);
        _ParticleComponent_listenerFn.set(this, void 0);
        __classPrivateFieldSet(this, _ParticleComponent_renderer, new Canvas2DRenderer(this.canvas), "f");
        __classPrivateFieldSet(this, _ParticleComponent_particlesController, new ParticlesController(particlesCount), "f");
        __classPrivateFieldSet(this, _ParticleComponent_listenerFn, () => __classPrivateFieldGet(this, _ParticleComponent_renderer, "f").onResize(), "f");
        window.addEventListener('resize', __classPrivateFieldGet(this, _ParticleComponent_listenerFn, "f"));
    }
    destroy() {
        __classPrivateFieldSet(this, _ParticleComponent_destroyed, true, "f");
        __classPrivateFieldGet(this, _ParticleComponent_listenerFn, "f") && window.removeEventListener('resize', __classPrivateFieldGet(this, _ParticleComponent_listenerFn, "f"));
    }
    run() {
        __classPrivateFieldGet(this, _ParticleComponent_particlesController, "f").init();
        requestAnimationFrame(this.animate.bind(this));
    }
    animate(timestamp) {
        if (__classPrivateFieldGet(this, _ParticleComponent_destroyed, "f")) {
            return;
        }
        if (__classPrivateFieldGet(this, _ParticleComponent_lastTime, "f") === 0) {
            __classPrivateFieldSet(this, _ParticleComponent_lastTime, timestamp, "f");
        }
        const elapsed = timestamp - __classPrivateFieldGet(this, _ParticleComponent_lastTime, "f");
        __classPrivateFieldGet(this, _ParticleComponent_particlesController, "f").update(elapsed / 1000);
        __classPrivateFieldGet(this, _ParticleComponent_renderer, "f").render(__classPrivateFieldGet(this, _ParticleComponent_particlesController, "f").particles);
        requestAnimationFrame(this.animate.bind(this));
        __classPrivateFieldSet(this, _ParticleComponent_lastTime, timestamp, "f");
    }
}
_ParticleComponent_renderer = new WeakMap(), _ParticleComponent_particlesController = new WeakMap(), _ParticleComponent_destroyed = new WeakMap(), _ParticleComponent_lastTime = new WeakMap(), _ParticleComponent_listenerFn = new WeakMap();
