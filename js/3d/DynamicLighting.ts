/**
 * Dynamic Lighting System - Day/Night Cycle, Shadows, Mana Glow
 * Features:
 * - Smooth day/night transitions with color grading
 * - Cascaded Shadow Maps (CSM) for large scenes
 * - Point/Spot lights for mana, spells, combat
 * - Volumetric light shafts (god rays)
 * - Light probes for dynamic GI approximation
 * - Automatic shadow quality scaling
 */
import * as THREE from 'three';

export interface TimeOfDay {
    hour: number; // 0-24
    minute: number;
    isDay: boolean;
    sunPosition: THREE.Vector3;
    moonPosition: THREE.Vector3;
    ambientColor: THREE.Color;
    ambientIntensity: number;
    sunColor: THREE.Color;
    sunIntensity: number;
    moonColor: THREE.Color;
    moonIntensity: number;
    fogColor: THREE.Color;
    fogDensity: number;
    skyColor: THREE.Color;
}

export interface LightProbe {
    position: THREE.Vector3;
    sphericalHarmonics: THREE.SphericalHarmonics3;
    intensity: number;
}

export interface ManaLightSource {
    id: string;
    type: 'point' | 'spot' | 'area';
    position: THREE.Vector3;
    color: THREE.Color;
    intensity: number;
    range: number;
    decay: number;
    animation?: {
        type: 'pulse' | 'flicker' | 'rotate' | 'orbit';
        speed: number;
        amplitude: number;
    };
    lifeTime: number;
    maxLifeTime: number;
    castShadow: boolean;
}

export interface DynamicLightingOptions {
    // Time system
    timeScale: number; // 1 = real-time, 60 = 1 min = 1 hour
    startHour: number;
    latitude: number; // Affects sun angle
    longitude: number;
    
    // Shadows
    enableCSM: boolean;
    csmCascades: number;
    csmFarDistance: number;
    shadowMapSize: number;
    shadowBias: number;
    shadowNormalBias: number;
    
    // Volumetric
    enableVolumetric: boolean;
    lightShaftSamples: number;
    lightShaftDensity: number;
    
    // Performance
    maxPointLights: number;
    maxSpotLights: number;
    lightProbeCount: number;
    updateProbesInterval: number;
}

export const DEFAULT_LIGHTING_OPTIONS: DynamicLightingOptions = {
    timeScale: 60, // 1 hour per minute
    startHour: 10,
    latitude: 45,
    longitude: 0,
    
    enableCSM: true,
    csmCascades: 4,
    csmFarDistance: 100,
    shadowMapSize: 2048,
    shadowBias: -0.0001,
    shadowNormalBias: 0.02,
    
    enableVolumetric: true,
    lightShaftSamples: 64,
    lightShaftDensity: 1.2,
    
    maxPointLights: 50,
    maxSpotLights: 20,
    lightProbeCount: 64,
    updateProbesInterval: 5.0,
};

// ============================================
// TIME OF DAY CALCULATOR
// ============================================

export class TimeOfDayCalculator {
    private options: DynamicLightingOptions;
    private currentHour: number;
    private currentMinute: number;
    private lastUpdate: number = 0;
    
    constructor(options: Partial<DynamicLightingOptions> = {}) {
        this.options = { ...DEFAULT_LIGHTING_OPTIONS, ...options };
        this.currentHour = this.options.startHour;
        this.currentMinute = 0;
    }

    update(deltaTime: number): TimeOfDay {
        // Advance time
        const timeAdvance = deltaTime * this.options.timeScale / 3600; // hours
        this.currentMinute += timeAdvance * 60;
        
        while (this.currentMinute >= 60) {
            this.currentMinute -= 60;
            this.currentHour = (this.currentHour + 1) % 24;
        }

        return this.calculateTimeOfDay();
    }

    public calculateTimeOfDay(): TimeOfDay {
        const hourFloat = this.currentHour + this.currentMinute / 60;
        const isDay = hourFloat >= 6 && hourFloat < 20;
        
        // Sun position (simplified solar calculation)
        const sunAzimuth = ((hourFloat - 6) / 14) * Math.PI * 2 - Math.PI / 2; // -PI/2 to 3PI/2
        const sunAltitude = Math.sin((hourFloat - 6) / 14 * Math.PI) * Math.PI / 2; // 0 to PI/2
        
        const sunPosition = new THREE.Vector3(
            Math.cos(sunAltitude) * Math.cos(sunAzimuth),
            Math.sin(sunAltitude),
            Math.cos(sunAltitude) * Math.sin(sunAzimuth)
        ).multiplyScalar(100);

        // Moon opposite to sun
        const moonPosition = sunPosition.clone().negate();

        // Colors and intensities
        const dayProgress = Math.max(0, Math.min(1, (hourFloat - 5) / 2)); // Dawn 5-7
        const duskProgress = Math.max(0, Math.min(1, (hourFloat - 19) / 2)); // Dusk 19-21
        const nightProgress = 1 - Math.max(dayProgress, 1 - duskProgress);

        // Dawn/Dusk colors
        const dawnColor = new THREE.Color(1.0, 0.5, 0.2);
        const dayColor = new THREE.Color(1.0, 0.95, 0.8);
        const duskColor = new THREE.Color(1.0, 0.4, 0.1);
        const nightColor = new THREE.Color(0.2, 0.25, 0.4);

        const sunColor = isDay ? dayColor.clone() : nightColor.clone();
        const moonColor = isDay ? nightColor.clone() : dayColor.clone();
        
        // Blend for transitions
        if (dayProgress < 1) {
            sunColor.lerp(dawnColor, 1 - dayProgress);
        }
        if (duskProgress < 1 && duskProgress > 0) {
            sunColor.lerp(duskColor, duskProgress);
        }

        const sunIntensity = isDay ? THREE.MathUtils.lerp(0.3, 1.5, Math.sin((hourFloat - 6) / 14 * Math.PI)) : 0;
        const moonIntensity = isDay ? 0 : THREE.MathUtils.lerp(0.1, 0.5, Math.sin((hourFloat - 18) / 12 * Math.PI));

        const ambientIntensity = THREE.MathUtils.lerp(0.1, 0.5, isDay ? 1 : 0.3);
        const ambientColor = new THREE.Color().lerpColors(
            new THREE.Color(0.1, 0.1, 0.2),
            new THREE.Color(0.4, 0.35, 0.3),
            isDay ? 0.8 : 0.2
        );

        const fogColor = isDay 
            ? new THREE.Color(0.53, 0.78, 0.92)
            : new THREE.Color(0.02, 0.02, 0.05);
        
        return {
            hour: this.currentHour,
            minute: Math.floor(this.currentMinute),
            isDay,
            sunPosition,
            moonPosition,
            ambientColor,
            ambientIntensity,
            sunColor,
            sunIntensity,
            moonColor,
            moonIntensity,
            fogColor,
            fogDensity: isDay ? 0.002 : 0.008,
            skyColor: isDay ? new THREE.Color(0.5, 0.7, 1.0) : new THREE.Color(0.02, 0.02, 0.1),
        };
    }

    setTime(hour: number, minute: number = 0): void {
        this.currentHour = hour % 24;
        this.currentMinute = minute % 60;
    }

    getCurrentHour(): number {
        return this.currentHour + this.currentMinute / 60;
    }
}

// ============================================
// CASCADIED SHADOW MAPS
// ============================================

export class CSMShadowManager {
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private options: DynamicLightingOptions;
    
    private csm: any = null;
    private cascadeCount: number;
    private farPlane: number;
    private light: THREE.DirectionalLight | null = null;
    private shadowCameras: THREE.OrthographicCamera[] = [];
    private splitDistances: number[] = [];
    
    constructor(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, scene: THREE.Scene, options: DynamicLightingOptions) {
        this.renderer = renderer;
        this.camera = camera;
        this.scene = scene;
        this.options = options;
        this.cascadeCount = options.csmCascades;
        this.farPlane = options.csmFarDistance;
    }

    init(light: THREE.DirectionalLight): void {
        this.light = light;
        light.castShadow = true;
        light.shadow.mapSize.width = this.options.shadowMapSize;
        light.shadow.mapSize.height = this.options.shadowMapSize;
        light.shadow.bias = this.options.shadowBias;
        light.shadow.normalBias = this.options.shadowNormalBias;
        
        // Create cascade shadow cameras
        this.createCascadeCameras();
    }

    private createCascadeCameras(): void {
        this.shadowCameras = [];
        this.splitDistances = [];
        
        // Logarithmic split scheme
        for (let i = 0; i < this.cascadeCount; i++) {
            const near = i === 0 ? this.camera.near : this.splitDistances[i - 1];
            const far = this.farPlane * Math.pow(near / this.farPlane, (i + 1) / this.cascadeCount);
            this.splitDistances.push(far);
            
            const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, near, far);
            cam.layers.enable(1); // Shadow layer
            this.shadowCameras.push(cam);
        }
    }

    update(): void {
        if (!this.light || !this.options.enableCSM) return;
        
        // Update each cascade camera to cover view frustum slices
        this.shadowCameras.forEach((cam, i) => {
            const frustum = new THREE.Frustum();
            const projScreenMatrix = new THREE.Matrix4();
            
            // Calculate cascade frustum
            const near = i === 0 ? this.camera.near : this.splitDistances[i - 1];
            const far = this.splitDistances[i];
            
            // Position camera at light looking at cascade center
            const cascadeCenter = this.getCascadeCenter(near, far);
            
            if (!this.light) return;
            const lightDirection = new THREE.Vector3();
            this.light.getWorldDirection(lightDirection);
            cam.position.copy(cascadeCenter).add(lightDirection.clone().multiplyScalar(50));
            cam.lookAt(cascadeCenter);
            
            // Fit orthographic bounds to cascade
            const bounds = this.getFrustumBounds(near, far);
            cam.left = bounds.min.x;
            cam.right = bounds.max.x;
            cam.top = bounds.max.y;
            cam.bottom = bounds.min.y;
            cam.near = bounds.min.z;
            cam.far = bounds.max.z;
            cam.updateProjectionMatrix();
        });
    }

    private getCascadeCenter(near: number, far: number): THREE.Vector3 {
        // Get center of view frustum slice
        const corners = this.getFrustumCorners(near, far);
        const center = new THREE.Vector3();
        corners.forEach(c => center.add(c));
        center.divideScalar(corners.length);
        return center;
    }

    private getFrustumCorners(near: number, far: number): THREE.Vector3[] {
        const corners: THREE.Vector3[] = [];
        const proj = this.camera.projectionMatrix;
        const view = this.camera.matrixWorldInverse;
        const projView = new THREE.Matrix4().multiplyMatrices(proj, view);
        const invProjView = projView.clone().invert();
        
        for (let x = -1; x <= 1; x += 2) {
            for (let y = -1; y <= 1; y += 2) {
                for (let z = -1; z <= 1; z += 2) {
                    const corner = new THREE.Vector3(x, y, z);
                    corner.applyMatrix4(invProjView);
                    corners.push(corner);
                }
            }
        }
        return corners;
    }

    private getFrustumBounds(near: number, far: number): { min: THREE.Vector3, max: THREE.Vector3 } {
        const corners = this.getFrustumCorners(near, far);
        const min = new THREE.Vector3(Infinity, Infinity, Infinity);
        const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
        
        corners.forEach(c => {
            min.min(c);
            max.max(c);
        });
        return { min, max };
    }

    getSplitDistances(): number[] {
        return this.splitDistances;
    }

    getShadowCameras(): THREE.OrthographicCamera[] {
        return this.shadowCameras;
    }

    dispose(): void {
        this.shadowCameras = [];
        this.splitDistances = [];
        this.light = null;
    }
}

// ============================================
// MANA LIGHT SOURCE MANAGER
// ============================================

export class ManaLightManager {
    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private options: DynamicLightingOptions;
    private lights: Map<string, { light: THREE.Light, source: ManaLightSource }> = new Map();
    private nextId: number = 0;
    private clock: THREE.Clock = new THREE.Clock();
    
    constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, options: DynamicLightingOptions) {
        this.scene = scene;
        this.renderer = renderer;
        this.options = options;
    }

    createManaLight(source: Omit<ManaLightSource, 'id'>): string {
        const id = `mana-light-${this.nextId++}`;
        const fullSource: ManaLightSource = {
            ...source,
            id,
            lifeTime: 0,
            maxLifeTime: source.lifeTime || 10,
        };

        let light: THREE.Light;
        
        switch (source.type) {
            case 'point':
                light = new THREE.PointLight(source.color, source.intensity, source.range, source.decay);
                if (source.castShadow) {
                    const pl = light as THREE.PointLight;
                    pl.shadow.mapSize.width = 256;
                    pl.shadow.mapSize.height = 256;
                    pl.shadow.camera.near = 0.1;
                    pl.shadow.camera.far = source.range;
                    pl.castShadow = true;
                }
                break;
            case 'spot':
                light = new THREE.SpotLight(source.color, source.intensity, source.range, Math.PI / 6, 0.5, source.decay);
                if (source.castShadow) {
                    const sl = light as THREE.SpotLight;
                    sl.shadow.mapSize.width = 512;
                    sl.shadow.mapSize.height = 512;
                    sl.shadow.camera.near = 0.1;
                    sl.shadow.camera.far = source.range;
                    sl.castShadow = true;
                }
                break;
            case 'area':
                light = new THREE.RectAreaLight(source.color, source.intensity, source.range, source.range);
                // RectAreaLight doesn't support shadows in Three.js
                break;
            default:
                light = new THREE.PointLight(source.color, source.intensity, source.range);
        }

        light.position.copy(source.position);
        this.scene.add(light);
        this.lights.set(id, { light, source: fullSource });
        
        return id;
    }

    removeLight(id: string): void {
        const entry = this.lights.get(id);
        if (entry) {
            this.scene.remove(entry.light);
            if (entry.light instanceof THREE.Light && (entry.light as any).shadow?.map) {
                (entry.light as any).shadow.map.dispose();
            }
            this.lights.delete(id);
        }
    }

    getLight(id: string): THREE.Light | undefined {
        return this.lights.get(id)?.light;
    }

    update(deltaTime: number): void {
        const elapsed = this.clock.getElapsedTime();
        
        for (const [id, entry] of this.lights) {
            const { light, source } = entry;
            source.lifeTime += deltaTime;
            
            // Check lifetime
            if (source.lifeTime >= source.maxLifeTime) {
                this.removeLight(id);
                continue;
            }

            // Animations
            if (source.animation) {
                const anim = source.animation;
                const t = elapsed * anim.speed;
                
                switch (anim.type) {
                    case 'pulse':
                        const pulseVal = 1 + Math.sin(t) * anim.amplitude;
                        light.intensity = source.intensity * pulseVal;
                        if (light instanceof THREE.PointLight || light instanceof THREE.SpotLight) {
                            light.distance = source.range * pulseVal;
                        }
                        break;
                    case 'flicker':
                        const flickerVal = 0.5 + 0.5 * Math.random() + Math.sin(t * 10) * 0.1;
                        light.intensity = source.intensity * flickerVal * anim.amplitude;
                        break;
                    case 'rotate':
                        if (light instanceof THREE.SpotLight) {
                            const radius = anim.amplitude;
                            light.target.position.set(
                                source.position.x + Math.cos(t) * radius,
                                source.position.y,
                                source.position.z + Math.sin(t) * radius
                            );
                        }
                        break;
                    case 'orbit':
                        const orbitRadius = anim.amplitude;
                        light.position.x = source.position.x + Math.cos(t) * orbitRadius;
                        light.position.z = source.position.z + Math.sin(t) * orbitRadius;
                        light.position.y = source.position.y + Math.sin(t * 0.5) * orbitRadius * 0.3;
                        break;
                }
            }

            // Fade out near end of life
            if (source.lifeTime > source.maxLifeTime * 0.8) {
                const fadeProgress = (source.lifeTime - source.maxLifeTime * 0.8) / (source.maxLifeTime * 0.2);
                light.intensity = source.intensity * (1 - fadeProgress);
            }
        }
    }

    // Preset creators
    createSpellLight(position: THREE.Vector3, color: THREE.Color): string {
        return this.createManaLight({
            type: 'point',
            position,
            color,
            intensity: 5,
            range: 10,
            decay: 2,
            animation: { type: 'pulse', speed: 3, amplitude: 0.3 },
            lifeTime: 2,
            maxLifeTime: 2,
            castShadow: false,
        });
    }

    createManaGatherLight(position: THREE.Vector3, color: THREE.Color): string {
        return this.createManaLight({
            type: 'point',
            position,
            color,
            intensity: 3,
            range: 8,
            decay: 1.5,
            animation: { type: 'pulse', speed: 2, amplitude: 0.4 },
            lifeTime: 3,
            maxLifeTime: 3,
            castShadow: false,
        });
    }

    createCombatImpactLight(position: THREE.Vector3): string {
        return this.createManaLight({
            type: 'point',
            position,
            color: new THREE.Color(1.0, 0.3, 0.0),
            intensity: 10,
            range: 15,
            decay: 2.5,
            animation: { type: 'flicker', speed: 20, amplitude: 0.8 },
            lifeTime: 0.5,
            maxLifeTime: 0.5,
            castShadow: true,
        });
    }

    createEnchantmentSpotlight(position: THREE.Vector3, target: THREE.Vector3, color: THREE.Color): string {
        const id = this.createManaLight({
            type: 'spot',
            position,
            color,
            intensity: 8,
            range: 20,
            decay: 2,
            animation: { type: 'rotate', speed: 0.5, amplitude: 2 },
            lifeTime: 5,
            maxLifeTime: 5,
            castShadow: true,
        });
        const light = this.getLight(id) as THREE.SpotLight;
        if (light) light.target.position.copy(target);
        return id;
    }

    dispose(): void {
        for (const id of this.lights.keys()) {
            this.removeLight(id);
        }
    }
}

// ============================================
// VOLUMETRIC LIGHT SHAFTS
// ============================================

export class VolumetricLighting {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private options: DynamicLightingOptions;
    
    private lightShaftMaterial: THREE.ShaderMaterial | null = null;
    private lightShaftMesh: THREE.Mesh | null = null;
    private renderTarget: THREE.WebGLRenderTarget | null = null;
    private sceneDepth: THREE.WebGLRenderTarget | null = null;
    
    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, options: DynamicLightingOptions) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.options = options;
    }

    init(): void {
        if (!this.options.enableVolumetric) return;
        
        // Create render targets for depth and light shafts
        this.renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth, window.innerHeight,
            { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }
        );
        
        this.sceneDepth = new THREE.WebGLRenderTarget(
            window.innerWidth, window.innerHeight,
            { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.DepthFormat, type: THREE.UnsignedIntType }
        );
        
        this.createLightShaftMaterial();
    }

    private createLightShaftMaterial(): void {
        this.lightShaftMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDepth: { value: this.sceneDepth?.texture },
                tDiffuse: { value: this.renderTarget?.texture },
                uCameraNear: { value: this.camera.near },
                uCameraFar: { value: this.camera.far },
                uLightPosition: { value: new THREE.Vector3() },
                uLightColor: { value: new THREE.Color(1, 0.9, 0.7) },
                uLightIntensity: { value: 1.0 },
                uSampleCount: { value: this.options.lightShaftSamples },
                uDensity: { value: this.options.lightShaftDensity },
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDepth;
                uniform sampler2D tDiffuse;
                uniform float uCameraNear;
                uniform float uCameraFar;
                uniform vec3 uLightPosition;
                uniform vec3 uLightColor;
                uniform float uLightIntensity;
                uniform int uSampleCount;
                uniform float uDensity;
                uniform float uTime;
                uniform vec2 uResolution;
                
                varying vec2 vUv;
                
                float linearizeDepth(float depth) {
                    return (2.0 * uCameraNear) / (uCameraFar + uCameraNear - depth * (uCameraFar - uCameraNear));
                }
                
                float getDepth(vec2 uv) {
                    return linearizeDepth(texture2D(tDepth, uv).r);
                }
                
                void main() {
                    vec4 screenPos = vec4(vUv * 2.0 - 1.0, 0.0, 1.0);
                    
                    // Convert light position to screen space
                    vec4 lightScreen = projectionMatrix * viewMatrix * vec4(uLightPosition, 1.0);
                    lightScreen.xyz /= lightScreen.w;
                    lightScreen.xy = lightScreen.xy * 0.5 + 0.5;
                    
                    vec2 lightUV = lightScreen.xy;
                    vec2 delta = (vUv - lightUV) / float(uSampleCount);
                    
                    float depth = getDepth(vUv);
                    float occlusion = 0.0;
                    
                    // Ray-march from light to pixel
                    for (int i = 0; i < 64; i++) {
                        if (i >= uSampleCount) break;
                        
                        vec2 sampleUV = lightUV + delta * float(i);
                        if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) break;
                        
                        float sampleDepth = getDepth(sampleUV);
                        if (sampleDepth < depth - 0.01) {
                            occlusion += 1.0;
                        }
                    }
                    
                    occlusion = 1.0 - clamp(occlusion / float(uSampleCount), 0.0, 1.0);
                    
                    // Distance falloff
                    float dist = length(vUv - lightUV) * uResolution.x;
                    float falloff = 1.0 / (1.0 + dist * 0.001);
                    
                    // Time variation
                    float shimmer = sin(uTime * 2.0 + dist * 0.1) * 0.05 + 0.95;
                    
                    vec3 color = uLightColor * uLightIntensity * occlusion * falloff * shimmer;
                    color *= uDensity;
                    
                    // Add to base scene
                    vec3 base = texture2D(tDiffuse, vUv).rgb;
                    gl_FragColor = vec4(base + color, 1.0);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        
        // Fullscreen quad
        const geometry = new THREE.PlaneGeometry(2, 2);
        this.lightShaftMesh = new THREE.Mesh(geometry, this.lightShaftMaterial);
        this.lightShaftMesh.frustumCulled = false;
    }

    render(lightPosition: THREE.Vector3, lightColor: THREE.Color, lightIntensity: number): void {
        if (!this.options.enableVolumetric || !this.lightShaftMaterial) return;
        
        // Update uniforms
        this.lightShaftMaterial.uniforms.uLightPosition.value.copy(lightPosition);
        this.lightShaftMaterial.uniforms.uLightColor.value.copy(lightColor);
        this.lightShaftMaterial.uniforms.uLightIntensity.value = lightIntensity;
        this.lightShaftMaterial.uniforms.uTime.value = performance.now() * 0.001;
        
        // Render depth to texture
        if (this.sceneDepth) {
            this.renderer.setRenderTarget(this.sceneDepth);
            this.renderer.render(this.scene, this.camera);
        }
        
        // Render base scene to texture
        if (this.renderTarget) {
            this.renderer.setRenderTarget(this.renderTarget);
            this.renderer.render(this.scene, this.camera);
        }
        
        // Render light shafts
        this.renderer.setRenderTarget(null);
        this.renderer.autoClear = false;
        this.renderer.render(this.lightShaftMesh as unknown as THREE.Scene, this.camera);
        this.renderer.autoClear = true;
    }

    resize(width: number, height: number): void {
        this.renderTarget?.setSize(width, height);
        this.sceneDepth?.setSize(width, height);
        if (this.lightShaftMaterial) {
            this.lightShaftMaterial.uniforms.uResolution.value.set(width, height);
        }
    }

    dispose(): void {
        this.renderTarget?.dispose();
        this.sceneDepth?.dispose();
        this.lightShaftMaterial?.dispose();
        this.lightShaftMesh?.geometry.dispose();
    }
}

// ============================================
// LIGHT PROBE SYSTEM (IRRADIANCE VOLUMES)
// ============================================

export class LightProbeManager {
    private scene: THREE.Scene;
    private options: DynamicLightingOptions;
    private probes: LightProbe[] = [];
    private probeGrid: THREE.GridHelper | null = null;
    private updateTimer: number = 0;
    private rnm: any = null; // THREE.RNM when available
    
    constructor(scene: THREE.Scene, options: DynamicLightingOptions) {
        this.scene = scene;
        this.options = options;
    }

    init(): void {
        // Create probe grid
        const gridSize = Math.ceil(Math.pow(this.options.lightProbeCount, 1/3));
        const spacing = 20;
        
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                for (let z = 0; z < gridSize; z++) {
                    if (this.probes.length >= this.options.lightProbeCount) break;
                    
                    const pos = new THREE.Vector3(
                        (x - gridSize / 2) * spacing,
                        y * spacing + 2,
                        (z - gridSize / 2) * spacing
                    );
                    
                    const sh = new THREE.SphericalHarmonics3();
                    this.probes.push({ position: pos, sphericalHarmonics: sh, intensity: 1.0 });
                }
            }
        }
        
        // Visualize probes in debug
        this.createDebugVisualization();
    }

    private createDebugVisualization(): void {
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true });
        
        this.probeGrid = new THREE.GridHelper(200, 20);
        // this.scene.add(this.probeGrid); // Enable for debug
    }

    update(deltaTime: number, timeOfDay: TimeOfDay): void {
        this.updateTimer += deltaTime;
        if (this.updateTimer < this.options.updateProbesInterval) return;
        this.updateTimer = 0;
        
        // Simple probe update - sample lighting at probe positions
        // In production, use RNM (Radiance Network Maps) or DDGI
        for (const probe of this.probes) {
            // Sample sky color at probe position
            const skyContribution = probe.position.y > 10 ? timeOfDay.skyColor : new THREE.Color(0);
            
            // Sample sun direction
            const sunDir = probe.position.clone().sub(timeOfDay.sunPosition).normalize();
            const sunDot = Math.max(0, sunDir.y);
            const sunContribution = timeOfDay.sunColor.clone().multiplyScalar(timeOfDay.sunIntensity * sunDot);
            
            // Sample ambient
            const ambient = timeOfDay.ambientColor.clone().multiplyScalar(timeOfDay.ambientIntensity);
            
            const total = new THREE.Color().add(skyContribution).add(sunContribution).add(ambient);
            
            // Bake into SH coefficients (simplified - just L0 band)
            probe.sphericalHarmonics.coefficients[0].set(total.r, total.g, total.b);
            probe.intensity = 0.2126 * total.r + 0.7152 * total.g + 0.0722 * total.b;
        }
    }

    getProbeAt(position: THREE.Vector3): LightProbe | null {
        let nearest: LightProbe | null = null;
        let minDist = Infinity;
        
        for (const probe of this.probes) {
            const dist = probe.position.distanceToSquared(position);
            if (dist < minDist) {
                minDist = dist;
                nearest = probe;
            }
        }
        return nearest;
    }

    getProbes(): LightProbe[] {
        return this.probes;
    }

    dispose(): void {
        this.probes = [];
        this.probeGrid?.dispose();
    }
}

// ============================================
// MANAGER INTEGRATION
// ============================================

export class DynamicLightingManager {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private options: DynamicLightingOptions;
    
    public timeOfDay: TimeOfDayCalculator;
    public csm: CSMShadowManager;
    public manaLights: ManaLightManager;
    public volumetric: VolumetricLighting;
    public lightProbes: LightProbeManager;
    
    private sunLight: THREE.DirectionalLight | null = null;
    private moonLight: THREE.DirectionalLight | null = null;
    private ambientLight: THREE.AmbientLight | null = null;
    private fog: THREE.Fog | null = null;
    
    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, options?: Partial<DynamicLightingOptions>) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.options = { ...DEFAULT_LIGHTING_OPTIONS, ...options };
        
        this.timeOfDay = new TimeOfDayCalculator(this.options);
        this.csm = new CSMShadowManager(renderer, camera, scene, this.options);
        this.manaLights = new ManaLightManager(scene, renderer, this.options);
        this.volumetric = new VolumetricLighting(renderer, scene, camera, this.options);
        this.lightProbes = new LightProbeManager(scene, this.options);
        
        this.initLights();
    }

    private initLights(): void {
        // Sun light (main directional)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.1;
        this.sunLight.shadow.camera.far = 100;
        this.sunLight.shadow.bias = -0.0001;
        this.sunLight.shadow.normalBias = 0.02;
        this.scene.add(this.sunLight);
        
        // Initialize CSM with sun light
        this.csm.init(this.sunLight);
        
        // Moon light (secondary directional)
        this.moonLight = new THREE.DirectionalLight(0x6688aa, 0.2);
        this.moonLight.castShadow = false;
        this.scene.add(this.moonLight);
        
        // Ambient
        this.ambientLight = new THREE.AmbientLight(0x444466, 0.3);
        this.scene.add(this.ambientLight);
        
        // Fog
        this.fog = new THREE.Fog(0x87CEEB, 10, 50);
        this.scene.fog = this.fog;
        
        // Init subsystems
        this.volumetric.init();
        this.lightProbes.init();
    }

    update(deltaTime: number): void {
        // Update time of day
        const tod = this.timeOfDay.update(deltaTime);
        
        // Update sun
        if (this.sunLight) {
            this.sunLight.position.copy(tod.sunPosition);
            this.sunLight.color.copy(tod.sunColor);
            this.sunLight.intensity = tod.sunIntensity;
            this.sunLight.target.position.set(0, 0, 0);
        }
        
        // Update moon
        if (this.moonLight) {
            this.moonLight.position.copy(tod.moonPosition);
            this.moonLight.color.copy(tod.moonColor);
            this.moonLight.intensity = tod.moonIntensity;
        }
        
        // Update ambient
        if (this.ambientLight) {
            this.ambientLight.color.copy(tod.ambientColor);
            this.ambientLight.intensity = tod.ambientIntensity;
        }
        
        // Update fog
        if (this.fog) {
            this.fog.color.copy(tod.fogColor);
            // Fog density handled by scene.fog (uniform)
        }
        
        this.scene.background = tod.skyColor;
        
        // Update CSM
        this.csm.update();
        
        // Update mana lights
        this.manaLights.update(deltaTime);
        
        // Update volumetric (render sun shafts)
        if (tod.sunIntensity > 0.1) {
            this.volumetric.render(tod.sunPosition, tod.sunColor, tod.sunIntensity);
        }
        
        // Update light probes
        this.lightProbes.update(deltaTime, tod);
    }

    // Getters for external access
    getSunLight(): THREE.DirectionalLight | null { return this.sunLight; }
    getMoonLight(): THREE.DirectionalLight | null { return this.moonLight; }
    getTimeOfDay(): TimeOfDay { return this.timeOfDay.calculateTimeOfDay(); }
    
    // Spell/Combat light creators
    createSpellLight(pos: THREE.Vector3, color: THREE.Color): string {
        return this.manaLights.createSpellLight(pos, color);
    }
    
    createCombatImpact(pos: THREE.Vector3): string {
        return this.manaLights.createCombatImpactLight(pos);
    }
    
    createManaGather(pos: THREE.Vector3, color: THREE.Color): string {
        return this.manaLights.createManaGatherLight(pos, color);
    }
    
    setTime(hour: number, minute: number = 0): void {
        this.timeOfDay.setTime(hour, minute);
    }
    
    getTimeScale(): number { return this.options.timeScale; }
    setTimeScale(scale: number): void { this.options.timeScale = scale; }
    
    resize(width: number, height: number): void {
        this.volumetric.resize(width, height);
    }
    
    dispose(): void {
        this.sunLight?.dispose();
        this.moonLight?.dispose();
        this.ambientLight?.dispose();
        this.csm.dispose?.();
        this.manaLights.dispose();
        this.volumetric.dispose();
        this.lightProbes.dispose();
    }
}

// Singleton
export const dynamicLightingManager = (() => {
    let instance: DynamicLightingManager | null = null;
    return {
        init(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, options?: Partial<DynamicLightingOptions>): DynamicLightingManager {
            instance = new DynamicLightingManager(renderer, scene, camera, options);
            return instance;
        },
        get(): DynamicLightingManager | null {
            return instance;
        },
    };
})();