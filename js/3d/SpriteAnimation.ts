/**
 * Sprite Animation System v2 - Atlas-based with Frame Blending
 * High-performance 2D sprite animations for heroes, enemies, spells, effects
 * Features:
 * - Texture atlas support (auto-generated or manual)
 * - Frame blending for smooth interpolation
 * - Animation state machine (idle, move, attack, death, cast, hurt)
 * - Event callbacks (onComplete, onFrame, onLoop)
 * - Instanced rendering for multiple sprites
 * - LOD system (reduce frame rate at distance)
 */
import * as THREE from 'three';
import { eventBus } from '../eventBus';
import { GAME_EVENTS } from '../constants';

// ============================================
// TYPES
// ============================================

export interface SpriteFrame {
    x: number;
    y: number;
    width?: number;
    height?: number;
    offsetX?: number;
    offsetY?: number;
    duration?: number; // Override default frame duration
}

export interface SpriteAnimation {
    name: string;
    frames: SpriteFrame[];
    frameDuration: number; // Default ms per frame
    loop: boolean;
    pingPong?: boolean; // Play forward then backward
    blendFrames: boolean; // Enable frame blending
    events?: {
        onComplete?: () => void;
        onFrame?: (frameIndex: number) => void;
        onLoop?: (loopCount: number) => void;
    };
}

export interface SpriteSheetConfig {
    imageUrl: string;
    frameWidth: number;
    frameHeight: number;
    columns: number;
    rows: number;
    spacing?: number;
    margin?: number;
    animations: Record<string, SpriteAnimation>;
}

export interface SpriteInstance {
    id: string;
    atlasName: string;
    position: THREE.Vector3;
    scale: THREE.Vector3;
    rotation: THREE.Euler;
    currentAnimation: string;
    animationTime: number;
    frameIndex: number;
    previousFrameIndex: number;
    blendFactor: number;
    loopCount: number;
    isPlaying: boolean;
    speed: number;
    color: THREE.Color;
    opacity: number;
    userData: Record<string, any>;
}

// ============================================
// SPRITE SHEET LOADER / ATLAS GENERATOR
// ============================================

export class SpriteAtlas {
    private texture: THREE.Texture | null = null;
    private config: SpriteSheetConfig;
    private frameUVs: Map<string, THREE.Vector4[]> = new Map(); // animation name -> [uvRect]
    private frameDurations: Map<string, number[]> = new Map();
    private loaded: boolean = false;
    private loadPromise: Promise<void> | null = null;

    constructor(config: SpriteSheetConfig) {
        this.config = {
            spacing: 0,
            margin: 0,
            ...config
        };
    }

    async load(): Promise<void> {
        if (this.loaded) return;
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                this.config.imageUrl,
                (texture) => {
                    this.texture = texture;
                    this.texture.magFilter = THREE.NearestFilter;
                    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
                    this.texture.generateMipmaps = true;
                    this.texture.wrapS = THREE.ClampToEdgeWrapping;
                    this.texture.wrapT = THREE.ClampToEdgeWrapping;
                    this.texture.flipY = false;

                    this.buildAtlas();
                    this.loaded = true;
                    resolve();
                },
                undefined,
                (error) => reject(error)
            );
        });

        return this.loadPromise;
    }

    private buildAtlas(): void {
        if (!this.texture) return;

        const { frameWidth, frameHeight, columns, rows, spacing = 0, margin = 0 } = this.config;
        // Use any to bypass TextureSource typing issues
        const texWidth = (this.texture.image as any)?.width || (this.texture.source?.data as any)?.width || 1;
        const texHeight = (this.texture.image as any)?.height || (this.texture.source?.data as any)?.height || 1;

        // UV coordinates for each grid cell
        const cellWidth = frameWidth + spacing;
        const cellHeight = frameHeight + spacing;

        // Pre-compute UVs for all animations
        for (const [animName, animation] of Object.entries(this.config.animations)) {
            const uvs: THREE.Vector4[] = [];
            const durations: number[] = [];

            for (const frame of animation.frames) {
                // Support both grid-based (x,y indices) and pixel-based frames
                let ux, uy, uw, uh;

                if (frame.width && frame.height) {
                    // Pixel-based frame
                    ux = (margin + frame.x) / texWidth;
                    uy = 1.0 - (margin + frame.y + frame.height) / texHeight; // Flip Y
                    uw = frame.width / texWidth;
                    uh = frame.height / texHeight;
                } else {
                    // Grid-based frame (x, y are grid indices)
                    const gx = frame.x;
                    const gy = frame.y;
                    ux = (margin + gx * cellWidth) / texWidth;
                    uy = 1.0 - (margin + (gy + 1) * cellHeight) / texHeight;
                    uw = frameWidth / texWidth;
                    uh = frameHeight / texHeight;
                }

                uvs.push(new THREE.Vector4(ux, uy, uw, uh));
                durations.push(frame.duration || animation.frameDuration);
            }

            this.frameUVs.set(animName, uvs);
            this.frameDurations.set(animName, durations);
        }
    }

    getTexture(): THREE.Texture | null {
        return this.texture;
    }

    getFrameUVs(animationName: string): THREE.Vector4[] {
        return this.frameUVs.get(animationName) || [];
    }

    getFrameDurations(animationName: string): number[] {
        return this.frameDurations.get(animationName) || [];
    }

    getAnimationConfig(name: string): SpriteAnimation | undefined {
        return this.config.animations[name];
    }

    isLoaded(): boolean {
        return this.loaded;
    }

    dispose(): void {
        if (this.texture) {
            this.texture.dispose();
            this.texture = null;
        }
        this.frameUVs.clear();
        this.frameDurations.clear();
        this.loaded = false;
    }
}

// ============================================
// ANIMATION STATE MACHINE
// ============================================

export type AnimationState =
    | 'idle'
    | 'move'
    | 'attack'
    | 'attack2'
    | 'cast'
    | 'hurt'
    | 'death'
    | 'spawn'
    | 'interact'
    | 'custom';

export const ANIMATION_PRIORITY: Record<AnimationState, number> = {
    death: 100,
    hurt: 90,
    attack: 80,
    attack2: 79,
    cast: 70,
    spawn: 60,
    interact: 50,
    move: 30,
    idle: 10,
    custom: 0,
};

export interface AnimationTransition {
    from: AnimationState | '*';
    to: AnimationState;
    condition?: (instance: SpriteInstance) => boolean;
    crossfadeDuration?: number;
}

// ============================================
// SPRITE ANIMATION SYSTEM
// ============================================

export class SpriteAnimationSystem {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.Camera;

    private atlases: Map<string, SpriteAtlas> = new Map();
    private instances: Map<string, SpriteInstance> = new Map();
    private meshes: Map<string, THREE.Mesh> = new Map();

    // Shared geometry (quad)
    private quadGeometry: THREE.PlaneGeometry;
    private animatingInstances: Set<string> = new Set();

    // LOD
    private lodDistances = [15, 30, 60];
    private lodFrameRates = [60, 30, 15];

    // Instanced rendering (for many identical sprites)
    private instancedMeshes: Map<string, THREE.InstancedMesh> = new Map();
    private instanceCounts: Map<string, number> = new Map();

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        // Shared quad geometry
        this.quadGeometry = new THREE.PlaneGeometry(1, 1);
        this.quadGeometry.translate(0, 0.5, 0); // Pivot at bottom center
    }

    // ============================================
    // ATLAS MANAGEMENT
    // ============================================

    async registerAtlas(name: string, config: SpriteSheetConfig): Promise<SpriteAtlas> {
        const atlas = new SpriteAtlas(config);
        this.atlases.set(name, atlas);
        await atlas.load();
        return atlas;
    }

    getAtlas(name: string): SpriteAtlas | undefined {
        return this.atlases.get(name);
    }

    // ============================================
    // INSTANCE MANAGEMENT
    // ============================================

    createInstance(
        id: string,
        atlasName: string,
        initialAnimation: string,
        options: Partial<SpriteInstance> = {}
    ): SpriteInstance | null {
        const atlas = this.atlases.get(atlasName);
        if (!atlas || !atlas.isLoaded()) {
            console.warn(`Atlas ${atlasName} not loaded`);
            return null;
        }

        const animConfig = atlas.getAnimationConfig(initialAnimation);
        if (!animConfig) {
            console.warn(`Animation ${initialAnimation} not found in atlas ${atlasName}`);
            return null;
        }

        const instance: SpriteInstance = {
            id,
            atlasName,
            currentAnimation: initialAnimation,
            position: options.position || new THREE.Vector3(),
            scale: options.scale || new THREE.Vector3(1, 1, 1),
            rotation: options.rotation || new THREE.Euler(0, 0, 0),
            animationTime: 0,
            frameIndex: 0,
            previousFrameIndex: 0,
            blendFactor: 0,
            loopCount: 0,
            isPlaying: true,
            speed: options.speed || 1.0,
            color: options.color || new THREE.Color(0xffffff),
            opacity: options.opacity !== undefined ? options.opacity : 1.0,
            userData: options.userData || {},
        };

        this.instances.set(id, instance);
        this.createMesh(id, instance, atlas, animConfig);
        this.animatingInstances.add(id);

        return instance;
    }

    private createMesh(instanceId: string, instance: SpriteInstance, atlas: SpriteAtlas, animConfig: SpriteAnimation): void {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTexture: { value: atlas.getTexture() },
                uFrameUVs: { value: [] }, // Will be updated per frame
                uCurrentUV: { value: new THREE.Vector4() },
                uNextUV: { value: new THREE.Vector4() },
                uBlendFactor: { value: 0 },
                uColor: { value: instance.color },
                uOpacity: { value: instance.opacity },
                uTime: { value: 0 },
            },
            vertexShader: `
                uniform mat4 modelMatrix;
                uniform mat4 viewMatrix;
                uniform mat4 projectionMatrix;
                attribute vec3 position;
                attribute vec2 uv;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uTexture;
                uniform vec4 uCurrentUV;
                uniform vec4 uNextUV;
                uniform float uBlendFactor;
                uniform vec3 uColor;
                uniform float uOpacity;

                varying vec2 vUv;

                // Sample frame at specific UV rect
                vec4 sampleFrame(vec4 uvRect) {
                    vec2 uv = uvRect.xy + vUv * uvRect.zw;
                    return texture2D(uTexture, uv);
                }

                void main() {
                    vec4 current = sampleFrame(uCurrentUV);
                    vec4 next = sampleFrame(uNextUV);
                    vec4 color = mix(current, next, uBlendFactor);
                    color.rgb *= uColor;
                    color.a *= uOpacity;

                    // Premultiply alpha for correct blending
                    // color.rgb *= color.a;

                    if (color.a < 0.01) discard;
                    gl_FragColor = color;
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending,
        });

        const mesh = new THREE.Mesh(this.quadGeometry, material);
        mesh.frustumCulled = false;
        mesh.userData = { instanceId };
        this.scene.add(mesh);
        this.meshes.set(instanceId, mesh);
    }

    removeInstance(id: string): void {
        const mesh = this.meshes.get(id);
        if (mesh) {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            if (mesh.material instanceof THREE.Material) {
                mesh.material.dispose();
            }
            this.meshes.delete(id);
        }
        this.instances.delete(id);
        this.animatingInstances.delete(id);
    }

    // ============================================
    // ANIMATION CONTROL
    // ============================================

    playAnimation(id: string, animationName: string, crossfadeDuration: number = 150): boolean {
        const instance = this.instances.get(id);
        const atlas = instance ? this.atlases.get(instance.atlasName) : null;
        if (!instance || !atlas) return false;

        const animConfig = atlas.getAnimationConfig(animationName);
        if (!animConfig) {
            console.warn(`Animation ${animationName} not found`);
            return false;
        }

        // Crossfade from current animation
        if (instance.currentAnimation !== animationName) {
            instance.previousFrameIndex = instance.frameIndex;
            instance.currentAnimation = animationName;
            instance.animationTime = 0;
            instance.frameIndex = 0;
            instance.loopCount = 0;
            instance.blendFactor = 0;
        }

        instance.isPlaying = true;
        this.animatingInstances.add(id);
        return true;
    }

    stopAnimation(id: string): void {
        const instance = this.instances.get(id);
        if (instance) {
            instance.isPlaying = false;
            this.animatingInstances.delete(id);
        }
    }

    setAnimationSpeed(id: string, speed: number): void {
        const instance = this.instances.get(id);
        if (instance) instance.speed = speed;
    }

    setInstancePosition(id: string, position: THREE.Vector3): void {
        const instance = this.instances.get(id);
        if (instance) instance.position.copy(position);
    }

    setInstanceScale(id: string, scale: THREE.Vector3): void {
        const instance = this.instances.get(id);
        if (instance) instance.scale.copy(scale);
    }

    setInstanceRotation(id: string, rotation: THREE.Euler): void {
        const instance = this.instances.get(id);
        if (instance) instance.rotation.copy(rotation);
    }

    setInstanceColor(id: string, color: THREE.Color): void {
        const instance = this.instances.get(id);
        const mesh = this.meshes.get(id);
        if (instance && mesh && mesh.material instanceof THREE.ShaderMaterial) {
            instance.color.copy(color);
            mesh.material.uniforms.uColor.value.copy(color);
        }
    }

    setInstanceOpacity(id: string, opacity: number): void {
        const instance = this.instances.get(id);
        const mesh = this.meshes.get(id);
        if (instance && mesh && mesh.material instanceof THREE.ShaderMaterial) {
            instance.opacity = opacity;
            mesh.material.uniforms.uOpacity.value = opacity;
        }
    }

    // ============================================
    // UPDATE LOOP
    // ============================================

    update(deltaTime: number): void {
        const cameraPos = new THREE.Vector3();
        this.camera.getWorldPosition(cameraPos);

        for (const instanceId of this.animatingInstances) {
            const instance = this.instances.get(instanceId);
            const mesh = this.meshes.get(instanceId);
            if (!instance || !mesh || !instance.isPlaying) continue;

            const atlas = this.atlases.get(instance.atlasName);
            if (!atlas || !atlas.isLoaded()) continue;

            const animConfig = atlas.getAnimationConfig(instance.currentAnimation);
            if (!animConfig) continue;

            const frameUVs = atlas.getFrameUVs(instance.currentAnimation);
            const frameDurations = atlas.getFrameDurations(instance.currentAnimation);
            if (frameUVs.length === 0) continue;

            // Update animation time
            instance.animationTime += deltaTime * 1000 * instance.speed; // ms

            // Calculate frame index with frame blending
            let accumulatedTime = 0;
            let targetFrame = 0;

            for (let i = 0; i < frameDurations.length; i++) {
                accumulatedTime += frameDurations[i];
                if (instance.animationTime < accumulatedTime) {
                    targetFrame = i;
                    break;
                }
            }

            // Handle loop/ping-pong
            if (instance.animationTime >= accumulatedTime) {
                if (animConfig.loop || animConfig.pingPong) {
                    instance.loopCount++;
                    instance.animationTime = 0;

                    if (animConfig.pingPong && instance.loopCount % 2 === 1) {
                        // Reverse for ping-pong (simplified - would need frame reversal)
                    }

                    // Fire loop event
                    animConfig.events?.onLoop?.(instance.loopCount);
                } else {
                    // End of animation
                    instance.animationTime = accumulatedTime - frameDurations[frameDurations.length - 1];
                    targetFrame = frameDurations.length - 1;
                    instance.isPlaying = false;
                    this.animatingInstances.delete(instanceId);

                    // Fire complete event
                    animConfig.events?.onComplete?.();
                }
            }

            // Frame blending
            instance.blendFactor = 0;
            if (animConfig.blendFrames && frameUVs.length > 1) {
                const prevAccumulated = accumulatedTime - frameDurations[targetFrame];
                const frameProgress = (instance.animationTime - prevAccumulated) / frameDurations[targetFrame];
                instance.blendFactor = frameProgress;
                instance.previousFrameIndex = Math.max(0, targetFrame - 1);
            }

            instance.frameIndex = targetFrame;

            // Fire frame event
            if (instance.frameIndex !== instance.previousFrameIndex) {
                animConfig.events?.onFrame?.(instance.frameIndex);
            }

            // Update mesh
            this.updateMesh(instance, mesh, atlas, targetFrame);
        }
    }

    private updateMesh(instance: SpriteInstance, mesh: THREE.Mesh, atlas: SpriteAtlas, frameIndex: number): void {
        const material = mesh.material as THREE.ShaderMaterial;
        const frameUVs = atlas.getFrameUVs(instance.currentAnimation);
        const frameDurations = atlas.getFrameDurations(instance.currentAnimation);

        if (frameUVs.length === 0) return;

        // Current frame UV
        const currentUV = frameUVs[Math.min(frameIndex, frameUVs.length - 1)];
        material.uniforms.uCurrentUV.value.copy(currentUV);

        // Next frame UV (for blending)
        const nextIndex = Math.min(frameIndex + 1, frameUVs.length - 1);
        const nextUV = frameUVs[nextIndex];
        material.uniforms.uNextUV.value.copy(nextUV);

        // Blend factor
        material.uniforms.uBlendFactor.value = instance.blendFactor;

        // Transform
        mesh.position.copy(instance.position);
        mesh.scale.copy(instance.scale);
        mesh.rotation.copy(instance.rotation);

        // Billboard to camera (optional - only for non-rotated sprites)
        // mesh.lookAt(this.camera.position);
    }

    // ============================================
    // INSTANCED RENDERING (for many identical sprites)
    // ============================================

    createInstancedGroup(
        name: string,
        atlasName: string,
        animationName: string,
        count: number
    ): THREE.InstancedMesh | null {
        const atlas = this.atlases.get(atlasName);
        if (!atlas || !atlas.isLoaded()) return null;

        const animConfig = atlas.getAnimationConfig(animationName);
        if (!animConfig) return null;

        const geometry = this.quadGeometry.clone();
        const material = new THREE.MeshBasicMaterial({
            map: atlas.getTexture(),
            transparent: true,
            alphaTest: 0.1,
            depthWrite: false,
        });

        const mesh = new THREE.InstancedMesh(geometry, material, count);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false;

        this.scene.add(mesh);
        this.instancedMeshes.set(name, mesh);
        this.instanceCounts.set(name, count);

        return mesh;
    }

    updateInstancedGroup(name: string, transforms: THREE.Matrix4[]): void {
        const mesh = this.instancedMeshes.get(name);
        if (!mesh) return;

        transforms.forEach((matrix, i) => {
            mesh.setMatrixAt(i, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
    }

    // ============================================
    // LOD SYSTEM
    // ============================================

    setLODDistances(distances: number[], frameRates: number[]): void {
        this.lodDistances = distances;
        this.lodFrameRates = frameRates;
    }

    private getLODLevel(distance: number): number {
        for (let i = 0; i < this.lodDistances.length; i++) {
            if (distance < this.lodDistances[i]) return i;
        }
        return this.lodDistances.length;
    }

    // ============================================
    // UTILITY
    // ============================================

    getInstance(id: string): SpriteInstance | undefined {
        return this.instances.get(id);
    }

    getAllInstances(): SpriteInstance[] {
        return Array.from(this.instances.values());
    }

    dispose(): void {
        // Dispose instances
        for (const id of this.instances.keys()) {
            this.removeInstance(id);
        }

        // Dispose instanced meshes
        for (const mesh of this.instancedMeshes.values()) {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            if (mesh.material instanceof THREE.Material) {
                mesh.material.dispose();
            }
        }
        this.instancedMeshes.clear();

        // Dispose atlases
        for (const atlas of this.atlases.values()) {
            atlas.dispose();
        }
        this.atlases.clear();
    }
}

// ============================================
// PREDEFINED ATLAS CONFIGURATIONS
// ============================================

export function createHeroAtlasConfig(imageUrl: string): SpriteSheetConfig {
    return {
        imageUrl,
        frameWidth: 64,
        frameHeight: 64,
        columns: 8,
        rows: 8,
        spacing: 2,
        margin: 1,
        animations: {
            idle: {
                name: 'idle',
                frames: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
                frameDuration: 200,
                loop: true,
                pingPong: true,
                blendFrames: true,
            },
            move: {
                name: 'move',
                frames: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
                         { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 }, { x: 7, y: 1 }],
                frameDuration: 100,
                loop: true,
                pingPong: false,
                blendFrames: true,
            },
            attack: {
                name: 'attack',
                frames: [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
                         { x: 4, y: 2 }, { x: 5, y: 2 }],
                frameDuration: 80,
                loop: false,
                pingPong: false,
                blendFrames: true,
                events: {
                    onFrame: (frame) => {
                        if (frame === 3) eventBus.emit('hero_attack_hit', {});
                    },
                    onComplete: () => eventBus.emit('hero_attack_end', {}),
                },
            },
            cast: {
                name: 'cast',
                frames: [{ x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
                         { x: 4, y: 3 }, { x: 5, y: 3 }],
                frameDuration: 120,
                loop: false,
                pingPong: false,
                blendFrames: true,
            },
            hurt: {
                name: 'hurt',
                frames: [{ x: 0, y: 4 }, { x: 1, y: 4 }],
                frameDuration: 100,
                loop: false,
                pingPong: false,
                blendFrames: true,
            },
            death: {
                name: 'death',
                frames: [{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 },
                         { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }],
                frameDuration: 150,
                loop: false,
                pingPong: false,
                blendFrames: true,
                events: {
                    onComplete: () => eventBus.emit('hero_death', {}),
                },
            },
            spawn: {
                name: 'spawn',
                frames: [{ x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }],
                frameDuration: 100,
                loop: false,
                pingPong: false,
                blendFrames: true,
            },
        },
    };
}

export function createEnemyAtlasConfig(imageUrl: string, type: 'orc' | 'dragon' | 'phantom' | 'guardian'): SpriteSheetConfig {
    const baseConfig: SpriteSheetConfig = {
        imageUrl,
        frameWidth: 96,
        frameHeight: 96,
        columns: 6,
        rows: 6,
        spacing: 2,
        margin: 1,
        animations: {
            idle: {
                name: 'idle',
                frames: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
                frameDuration: 300,
                loop: true,
                pingPong: true,
                blendFrames: true,
            },
            move: {
                name: 'move',
                frames: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
                         { x: 4, y: 1 }, { x: 5, y: 1 }],
                frameDuration: 120,
                loop: true,
                blendFrames: true,
            },
            attack: {
                name: 'attack',
                frames: [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
                         { x: 4, y: 2 }, { x: 5, y: 2 }],
                frameDuration: 100,
                loop: false,
                blendFrames: true,
            },
            hurt: {
                name: 'hurt',
                frames: [{ x: 0, y: 3 }, { x: 1, y: 3 }],
                frameDuration: 150,
                loop: false,
                blendFrames: true,
            },
            death: {
                name: 'death',
                frames: [{ x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
                         { x: 4, y: 4 }, { x: 5, y: 4 }],
                frameDuration: 200,
                loop: false,
                blendFrames: true,
            },
            spawn: {
                name: 'spawn',
                frames: [{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }],
                frameDuration: 100,
                loop: false,
                blendFrames: true,
            },
        },
    };

    // Type-specific adjustments
    if (type === 'dragon') {
        baseConfig.frameWidth = 128;
        baseConfig.frameHeight = 128;
        baseConfig.columns = 4;
        baseConfig.rows = 4;
    } else if (type === 'phantom') {
        baseConfig.animations.idle.frames = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
        baseConfig.animations.idle.frameDuration = 400;
    }

    return baseConfig;
}

export function createSpellEffectAtlasConfig(imageUrl: string): SpriteSheetConfig {
    return {
        imageUrl,
        frameWidth: 64,
        frameHeight: 64,
        columns: 8,
        rows: 4,
        spacing: 1,
        margin: 0,
        animations: {
            fireball: {
                name: 'fireball',
                frames: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
                         { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 }],
                frameDuration: 50,
                loop: false,
                blendFrames: true,
            },
            lightning: {
                name: 'lightning',
                frames: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
                         { x: 4, y: 1 }, { x: 5, y: 1 }],
                frameDuration: 30,
                loop: false,
                blendFrames: true,
            },
            heal: {
                name: 'heal',
                frames: [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
                         { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 }],
                frameDuration: 80,
                loop: false,
                blendFrames: true,
                pingPong: true,
            },
            shield: {
                name: 'shield',
                frames: [{ x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }],
                frameDuration: 100,
                loop: true,
                blendFrames: true,
            },
        },
    };
}

// Singleton
export const spriteAnimationSystem = (() => {
    let instance: SpriteAnimationSystem | null = null;
    return {
        init(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): SpriteAnimationSystem {
            instance = new SpriteAnimationSystem(renderer, scene, camera);
            return instance;
        },
        get(): SpriteAnimationSystem | null {
            return instance;
        },
    };
})();