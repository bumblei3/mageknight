/**
 * Particle System v2 - GPU Compute Shader Based
 * High-performance particle system using GPU compute shaders
 * Supports: Spell effects, Combat impacts, Ambient atmosphere
 */
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';

// ============================================
// COMPUTE SHADERS
// ============================================

// Position Update Shader
const POSITION_SHADER = `
    uniform float uTime;
    uniform float uDeltaTime;
    uniform vec3 uEmitterPosition;
    uniform vec3 uEmitterDirection;
    uniform float uEmitterRadius;
    uniform float uLifeTime;
    uniform vec3 uGravity;
    uniform float uSpread;
    uniform float uSpeed;
    uniform int uParticleType; // 0=spell, 1=combat, 2=ambient

    varying float vAge;
    varying float vLife;
    varying vec3 vVelocity;
    varying vec3 vColor;

    void main() {
        vec4 posData = texture2D(uPositionTexture, vUv);
        vec4 velData = texture2D(uVelocityTexture, vUv);
        vec4 lifeData = texture2D(uLifeTexture, vUv);

        vec3 position = posData.xyz;
        vec3 velocity = velData.xyz;
        float age = lifeData.x;
        float life = lifeData.y;
        int type = int(lifeData.z);

        // Update age
        age += uDeltaTime;

        // Respawn if dead
        if (age >= life) {
            age = 0.0;

            // Random spawn within emitter radius
            vec2 rand = fract(sin(vUv * 1234.56 + uTime) * 4321.0);
            float angle = rand.x * 6.28318;
            float radius = rand.y * uEmitterRadius;

            position = uEmitterPosition;
            position.x += cos(angle) * radius;
            position.z += sin(angle) * radius;

            // Initial velocity based on type
            if (type == 0) { // Spell - outward burst
                velocity = normalize(position - uEmitterPosition) * uSpeed;
                velocity.y += uSpeed * 0.5;
            } else if (type == 1) { // Combat - directional
                velocity = uEmitterDirection * uSpeed * (0.5 + rand.y * 0.5);
                velocity += vec3(rand.x - 0.5, rand.y, rand.x - 0.5) * uSpread;
            } else { // Ambient - slow drift
                velocity = vec3(rand.x - 0.5, 0.1, rand.y - 0.5) * uSpread;
            }

            life = uLifeTime * (0.5 + rand.x * 0.5);
        } else {
            // Physics update
            velocity += uGravity * uDeltaTime;
            velocity *= 0.995; // Drag
            position += velocity * uDeltaTime;
        }

        // Color based on age/life ratio and type
        float lifeRatio = age / life;
        if (type == 0) {
            // Spell: bright -> fade
            vColor = mix(vec3(1.0, 0.5, 0.0), vec3(0.5, 0.0, 1.0), lifeRatio);
        } else if (type == 1) {
            // Combat: red/orange
            vColor = mix(vec3(1.0, 0.3, 0.0), vec3(0.5, 0.1, 0.0), lifeRatio);
        } else {
            // Ambient: subtle white/blue
            vColor = mix(vec3(0.8, 0.9, 1.0), vec3(0.2, 0.3, 0.5), lifeRatio);
        }

        vAge = age;
        vLife = life;
        vVelocity = velocity;

        gl_FragColor = vec4(position, 1.0);
    }
`;

// Velocity Update Shader (for more complex physics)
const VELOCITY_SHADER = `
    uniform float uTime;
    uniform float uDeltaTime;
    uniform vec3 uWind;
    uniform vec3 uTurbulenceCenter;
    uniform float uTurbulenceStrength;

    void main() {
        vec4 velData = texture2D(uVelocityTexture, vUv);
        vec4 lifeData = texture2D(uLifeTexture, vUv);

        vec3 velocity = velData.xyz;
        float age = lifeData.x;
        float life = lifeData.y;

        // Wind influence
        velocity += uWind * uDeltaTime * 0.1;

        // Turbulence
        vec3 toCenter = uTurbulenceCenter - texture2D(uPositionTexture, vUv).xyz;
        float dist = length(toCenter);
        if (dist < 5.0 && dist > 0.0) {
            velocity += normalize(cross(toCenter, vec3(0.0, 1.0, 0.0))) * uTurbulenceStrength * (5.0 - dist) * uDeltaTime;
        }

        gl_FragColor = vec4(velocity, velData.w);
    }
`;

// Life Update Shader
const LIFE_SHADER = `
    void main() {
        vec4 lifeData = texture2D(uLifeTexture, vUv);
        // Life data is updated in position shader (age/life/type)
        gl_FragColor = lifeData;
    }
`;

// ============================================
// PARTICLE SYSTEM CLASS
// ============================================

export interface ParticleEmitterConfig {
    position: THREE.Vector3;
    direction?: THREE.Vector3;
    radius?: number;
    lifeTime?: number;
    gravity?: THREE.Vector3;
    spread?: number;
    speed?: number;
    particleType?: number; // 0=spell, 1=combat, 2=ambient
    maxParticles?: number;
    particleSize?: number;
    blending?: THREE.Blending;
    transparent?: boolean;
    depthWrite?: boolean;
}

export class GPUParticleSystem {
    private renderer: THREE.WebGLRenderer;
    private gpuCompute: GPUComputationRenderer | null = null;
    private particleMesh: THREE.Points | null = null;
    private positionVariable: any = null;
    private velocityVariable: any = null;
    private lifeVariable: any = null;
    private config: Required<ParticleEmitterConfig>;
    private textureSize: number;
    private maxParticles: number;
    private material: THREE.ShaderMaterial | null = null;
    private uniforms: any = {};

    constructor(renderer: THREE.WebGLRenderer, config: ParticleEmitterConfig) {
        this.renderer = renderer;
        this.config = {
            position: config.position || new THREE.Vector3(),
            direction: config.direction || new THREE.Vector3(0, 1, 0),
            radius: config.radius || 1.0,
            lifeTime: config.lifeTime || 3.0,
            gravity: config.gravity || new THREE.Vector3(0, -9.8, 0),
            spread: config.spread || 2.0,
            speed: config.speed || 5.0,
            particleType: config.particleType || 0,
            maxParticles: config.maxParticles || 10000,
            particleSize: config.particleSize || 0.1,
            blending: config.blending || THREE.AdditiveBlending,
            transparent: config.transparent !== false,
            depthWrite: config.depthWrite || false,
        };
        this.maxParticles = this.config.maxParticles;
        this.textureSize = Math.ceil(Math.sqrt(this.maxParticles));
    }

    init(): void {
        // Check if GPUComputationRenderer is supported
        if (!this.renderer.capabilities.isWebGL2) {
            console.warn('GPU Particle System requires WebGL2');
            return;
        }

        this.gpuCompute = new GPUComputationRenderer(this.textureSize, this.textureSize, this.renderer);

        // Create initial textures
        const posTexture = this.gpuCompute.createTexture();
        const velTexture = this.gpuCompute.createTexture();
        const lifeTexture = this.gpuCompute.createTexture();

        this.initTextures(posTexture, velTexture, lifeTexture);

        // Add variables
        this.positionVariable = this.gpuCompute.addVariable('uPositionTexture', POSITION_SHADER, posTexture);
        this.velocityVariable = this.gpuCompute.addVariable('uVelocityTexture', VELOCITY_SHADER, velTexture);
        this.lifeVariable = this.gpuCompute.addVariable('uLifeTexture', LIFE_SHADER, lifeTexture);

        // Set dependencies
        this.gpuCompute.setVariableDependencies(this.positionVariable, [this.positionVariable, this.velocityVariable, this.lifeVariable]);
        this.gpuCompute.setVariableDependencies(this.velocityVariable, [this.velocityVariable, this.positionVariable, this.lifeVariable]);
        this.gpuCompute.setVariableDependencies(this.lifeVariable, [this.lifeVariable]);

        // Uniforms for shaders
        const uniforms = {
            uTime: { value: 0 },
            uDeltaTime: { value: 0.016 },
            uEmitterPosition: { value: this.config.position },
            uEmitterDirection: { value: this.config.direction },
            uEmitterRadius: { value: this.config.radius },
            uLifeTime: { value: this.config.lifeTime },
            uGravity: { value: this.config.gravity },
            uSpread: { value: this.config.spread },
            uSpeed: { value: this.config.speed },
            uParticleType: { value: this.config.particleType },
            uWind: { value: new THREE.Vector3() },
            uTurbulenceCenter: { value: new THREE.Vector3() },
            uTurbulenceStrength: { value: 0.0 },
        };

        this.positionVariable.material.uniforms = uniforms;
        this.velocityVariable.material.uniforms = uniforms;
        this.uniforms = uniforms;

        // Init compute renderer
        const error = this.gpuCompute.init();
        if (error) {
            console.error('GPU Particle System init error:', error);
        }

        // Create render material
        this.createRenderMaterial();
    }

    private initTextures(posTexture: THREE.DataTexture, velTexture: THREE.DataTexture, lifeTexture: THREE.DataTexture): void {
        const posArray = posTexture.image.data!;
        const velArray = velTexture.image.data!;
        const lifeArray = lifeTexture.image.data!;

        for (let i = 0; i < posArray.length; i += 4) {
            // Position - start at emitter
            posArray[i] = this.config.position.x;
            posArray[i + 1] = this.config.position.y;
            posArray[i + 2] = this.config.position.z;
            posArray[i + 3] = 1.0;

            // Velocity - zero initially
            velArray[i] = 0;
            velArray[i + 1] = 0;
            velArray[i + 2] = 0;
            velArray[i + 3] = 0;

            // Life - age=0, life=random, type
            lifeArray[i] = 0; // age
            lifeArray[i + 1] = this.config.lifeTime * (0.5 + Math.random() * 0.5); // life
            lifeArray[i + 2] = this.config.particleType; // type
            lifeArray[i + 3] = 0;
        }
    }

    private createRenderMaterial(): void {
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uPositionTexture: { value: null },
                uLifeTexture: { value: null },
                uTime: { value: 0 },
                uParticleSize: { value: this.config.particleSize },
                uCameraPosition: { value: new THREE.Vector3() },
                uParticleType: { value: this.config.particleType },
            },
            vertexShader: `
                uniform sampler2D uPositionTexture;
                uniform sampler2D uLifeTexture;
                uniform float uTime;
                uniform float uParticleSize;
                uniform vec3 uCameraPosition;
                uniform int uParticleType;

                varying float vAge;
                varying float vLife;
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vec4 posData = texture2D(uPositionTexture, uv);
                    vec4 lifeData = texture2D(uLifeTexture, uv);

                    vec3 position = posData.xyz;
                    float age = lifeData.x;
                    float life = lifeData.y;
                    int type = int(lifeData.z);

                    float lifeRatio = age / life;

                    // Size over lifetime
                    float size = uParticleSize * (1.0 - lifeRatio * 0.5);

                    // Color per type
                    if (type == 0) { // Spell
                        vColor = mix(vec3(1.0, 0.8, 0.2), vec3(0.8, 0.2, 1.0), lifeRatio);
                        vAlpha = 1.0 - lifeRatio * 0.8;
                    } else if (type == 1) { // Combat
                        vColor = mix(vec3(1.0, 0.4, 0.1), vec3(0.6, 0.1, 0.0), lifeRatio);
                        vAlpha = 1.0 - lifeRatio * 0.9;
                    } else { // Ambient
                        vColor = mix(vec3(0.6, 0.7, 1.0), vec3(0.2, 0.3, 0.6), lifeRatio);
                        vAlpha = 0.3 * (1.0 - lifeRatio);
                    }

                    // Billboard
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying float vAge;
                varying float vLife;
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    // Circular point
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;

                    float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: this.config.transparent,
            depthWrite: this.config.depthWrite,
            blending: this.config.blending,
            vertexColors: false,
        });

        // Create geometry
        const geometry = new THREE.BufferGeometry();
        const count = this.textureSize * this.textureSize;
        const uvArray = new Float32Array(count * 2);
        for (let i = 0; i < count; i++) {
            uvArray[i * 2] = (i % this.textureSize) / this.textureSize;
            uvArray[i * 2 + 1] = Math.floor(i / this.textureSize) / this.textureSize;
        }
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));

        this.particleMesh = new THREE.Points(geometry, this.material);
        this.particleMesh.frustumCulled = false; // Prevent culling issues
    }

    update(deltaTime: number, cameraPosition?: THREE.Vector3): void {
        if (!this.gpuCompute || !this.particleMesh) return;

        // Update uniforms
        this.uniforms.uTime.value += deltaTime;
        this.uniforms.uDeltaTime.value = deltaTime;
        this.uniforms.uEmitterPosition.value.copy(this.config.position);

        // Compute step
        this.gpuCompute.compute();

        // Update render material uniforms
        if (this.material) {
            this.material.uniforms.uPositionTexture.value = this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
            this.material.uniforms.uLifeTexture.value = this.gpuCompute.getCurrentRenderTarget(this.lifeVariable).texture;
            this.material.uniforms.uTime.value = this.uniforms.uTime.value;
            if (cameraPosition) {
                this.material.uniforms.uCameraPosition.value.copy(cameraPosition);
            }
        }
    }

    setEmitterPosition(pos: THREE.Vector3): void {
        this.config.position.copy(pos);
    }

    setEmitterDirection(dir: THREE.Vector3): void {
        this.config.direction.copy(dir);
    }

    setParticleType(type: number): void {
        this.config.particleType = type;
        this.uniforms.uParticleType.value = type;
        if (this.material) {
            this.material.uniforms.uParticleType.value = type;
        }
    }

    getMesh(): THREE.Points | null {
        return this.particleMesh;
    }

    dispose(): void {
        if (this.gpuCompute) {
            this.gpuCompute.dispose();
        }
        if (this.particleMesh) {
            this.particleMesh.geometry.dispose();
            if (this.material) this.material.dispose();
        }
    }
}

// ============================================
// PARTICLE SYSTEM MANAGER
// ============================================

export class ParticleSystemManager {
    private renderer: THREE.WebGLRenderer;
    private systems: Map<string, GPUParticleSystem> = new Map();
    private scene: THREE.Scene;

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
        this.renderer = renderer;
        this.scene = scene;
    }

    createSystem(name: string, config: ParticleEmitterConfig): GPUParticleSystem | null {
        const system = new GPUParticleSystem(this.renderer, config);
        system.init();

        if (system.getMesh()) {
            this.scene.add(system.getMesh()!);
            this.systems.set(name, system);
            return system;
        }
        return null;
    }

    getSystem(name: string): GPUParticleSystem | undefined {
        return this.systems.get(name);
    }

    removeSystem(name: string): void {
        const system = this.systems.get(name);
        if (system) {
            const mesh = system.getMesh();
            if (mesh && mesh.parent) {
                mesh.parent.remove(mesh);
            }
            system.dispose();
            this.systems.delete(name);
        }
    }

    update(deltaTime: number, cameraPosition?: THREE.Vector3): void {
        this.systems.forEach(system => {
            system.update(deltaTime, cameraPosition);
        });
    }

    // Predefined effect creators
    createSpellEffect(position: THREE.Vector3): GPUParticleSystem | null {
        return this.createSystem('spell-' + Date.now(), {
            position: position.clone(),
            particleType: 0,
            lifeTime: 2.0,
            speed: 8.0,
            spread: 3.0,
            radius: 0.5,
            maxParticles: 2000,
            particleSize: 0.15,
            gravity: new THREE.Vector3(0, -2, 0),
        });
    }

    createCombatImpact(position: THREE.Vector3, direction: THREE.Vector3): GPUParticleSystem | null {
        return this.createSystem('combat-' + Date.now(), {
            position: position.clone(),
            direction: direction.clone(),
            particleType: 1,
            lifeTime: 1.5,
            speed: 12.0,
            spread: 4.0,
            radius: 0.3,
            maxParticles: 1500,
            particleSize: 0.1,
            gravity: new THREE.Vector3(0, -15, 0),
        });
    }

    createAmbientParticles(position: THREE.Vector3, count: number = 5000): GPUParticleSystem | null {
        return this.createSystem('ambient-' + Date.now(), {
            position: position.clone(),
            particleType: 2,
            lifeTime: 10.0,
            speed: 0.5,
            spread: 10.0,
            radius: 20.0,
            maxParticles: count,
            particleSize: 0.05,
            gravity: new THREE.Vector3(0, -0.1, 0),
        });
    }

    createManaGatherEffect(position: THREE.Vector3, color: THREE.Color): GPUParticleSystem | null {
        return this.createSystem('mana-' + Date.now(), {
            position: position.clone(),
            particleType: 0, // Reuse spell type but with custom color via config
            lifeTime: 3.0,
            speed: 5.0,
            spread: 2.0,
            radius: 1.0,
            maxParticles: 1000,
            particleSize: 0.08,
            gravity: new THREE.Vector3(0, 2, 0), // Upward
        });
    }

    dispose(): void {
        this.systems.forEach((system, name) => {
            this.removeSystem(name);
        });
    }
}