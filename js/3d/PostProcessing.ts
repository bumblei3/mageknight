/**
 * Post-Processing Pipeline for Cinematic Rendering
 * Provides:
 * - Bloom (Unreal Engine style)
 * - Color Grading (ACES filmic tone mapping + LUT support)
 * - Depth of Field (Bokeh)
 * - Vignette, Film Grain, Chromatic Aberration
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';

// ============================================
// CUSTOM SHADER PASSES
// ============================================

// Color Grading / Tone Mapping + LUT
const ColorGradingShader = {
    uniforms: {
        tDiffuse: { value: null },
        uExposure: { value: 1.0 },
        uContrast: { value: 1.0 },
        uSaturation: { value: 1.0 },
        uTemperature: { value: 0.0 }, // -1 to 1 (cold to warm)
        uTint: { value: 0.0 }, // -1 to 1 (green to magenta)
        uLift: { value: new THREE.Vector3(0, 0, 0) }, // Shadows
        uGamma: { value: new THREE.Vector3(1, 1, 1) }, // Midtones
        uGain: { value: new THREE.Vector3(1, 1, 1) }, // Highlights
        uUseLUT: { value: false },
        uLUTTexture: { value: null },
        uLUTIntensity: { value: 1.0 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform float uExposure;
        uniform float uContrast;
        uniform float uSaturation;
        uniform float uTemperature;
        uniform float uTint;
        uniform vec3 uLift;
        uniform vec3 uGamma;
        uniform vec3 uGain;
        uniform bool uUseLUT;
        uniform sampler2D uLUTTexture;
        uniform float uLUTIntensity;

        // ACES Filmic Tone Mapping
        vec3 toneMappingACES(vec3 color) {
            float a = 2.51;
            float b = 0.03;
            float c = 2.43;
            float d = 0.59;
            float e = 0.14;
            return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
        }

        // Lift/Gamma/Gain (Color Grade)
        vec3 liftGammaGain(vec3 color) {
            color = color * uGain + uLift;
            color = pow(max(color, vec3(0.0)), vec3(1.0) / uGamma);
            return color;
        }

        // Temperature & Tint
        vec3 temperatureTint(vec3 color) {
            // Temperature: blue <-> orange
            float temp = uTemperature * 0.1;
            color.r += temp;
            color.b -= temp;
            // Tint: green <-> magenta
            float tint = uTint * 0.05;
            color.r += tint;
            color.g -= tint * 0.5;
            color.b += tint * 0.5;
            return color;
        }

        // Saturation
        vec3 saturate(vec3 color, float saturation) {
            float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
            return mix(vec3(luminance), color, saturation);
        }

        // 3D LUT lookup
        vec3 sampleLUT(vec3 color, sampler2D lut, float intensity) {
            // Assuming LUT is a 3D texture stored as 2D (e.g., 64x64x64 = 512x512)
            const float LUT_SIZE = 64.0;
            const float LUT_SLICE_SIZE = 1.0 / LUT_SIZE;
            const float LUT_SLICE_SIZE_SQRT = 1.0 / 8.0; // for 512x512 layout

            float blue = color.b * (LUT_SIZE - 1.0);
            int slice1 = int(blue);
            int slice2 = min(slice1 + 1, int(LUT_SIZE - 1));
            float sliceFrac = fract(blue);

            vec2 slice1UV = vec2(
                (color.r * (LUT_SIZE - 1.0) + 0.5) / LUT_SIZE,
                (slice1 + color.g * (LUT_SIZE - 1.0) + 0.5) / LUT_SIZE
            );
            vec2 slice2UV = vec2(
                (color.r * (LUT_SIZE - 1.0) + 0.5) / LUT_SIZE,
                (slice2 + color.g * (LUT_SIZE - 1.0) + 0.5) / LUT_SIZE
            );

            // Alternative layout for 2D LUT (strip of squares)
            vec2 lutUV1 = vec2(
                (slice1 % 8.0 + color.r * (LUT_SIZE - 1.0) + 0.5) / 8.0 / LUT_SIZE * 8.0,
                (floor(slice1 / 8.0) + color.g * (LUT_SIZE - 1.0) + 0.5) / 8.0 / LUT_SIZE * 8.0
            );
            vec2 lutUV2 = vec2(
                (slice2 % 8.0 + color.r * (LUT_SIZE - 1.0) + 0.5) / 8.0 / LUT_SIZE * 8.0,
                (floor(slice2 / 8.0) + color.g * (LUT_SIZE - 1.0) + 0.5) / 8.0 / LUT_SIZE * 8.0
            );

            vec3 c1 = texture2D(lut, lutUV1).rgb;
            vec3 c2 = texture2D(lut, lutUV2).rgb;

            return mix(c1, c2, sliceFrac);
        }

        void main() {
            vec3 color = texture2D(tDiffuse, vUv).rgb;

            // Exposure
            color *= uExposure;

            // Color Grading (Lift/Gamma/Gain)
            color = liftGammaGain(color);

            // Temperature & Tint
            color = temperatureTint(color);

            // Saturation
            color = saturate(color, uSaturation);

            // Contrast
            color = (color - 0.5) * uContrast + 0.5;

            // Tone Mapping (ACES Filmic)
            color = toneMappingACES(color);

            // LUT (Look-Up Table) - optional
            if (uUseLUT && uLUTIntensity > 0.0) {
                vec3 lutColor = sampleLUT(color, uLUTTexture, uLUTIntensity);
                color = mix(color, lutColor, uLUTIntensity);
            }

            // Gamma correction (sRGB)
            color = pow(color, vec3(1.0 / 2.2));

            gl_FragColor = vec4(color, 1.0);
        }
    `
};

// Vignette + Film Grain + Chromatic Aberration
const FilmEffectsShader = {
    uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uVignetteIntensity: { value: 0.3 },
        uVignetteSmoothness: { value: 0.5 },
        uVignetteRoundness: { value: 1.0 },
        uGrainIntensity: { value: 0.02 },
        uGrainScale: { value: 1.0 },
        uChromaticAberration: { value: 0.0 },
        uScanlineIntensity: { value: 0.0 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uVignetteIntensity;
        uniform float uVignetteSmoothness;
        uniform float uVignetteRoundness;
        uniform float uGrainIntensity;
        uniform float uGrainScale;
        uniform float uChromaticAberration;
        uniform float uScanlineIntensity;

        // Pseudo-random noise
        float rand(vec2 co) {
            return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }

        // Vignette
        float vignette(vec2 uv) {
            vec2 center = vec2(0.5, 0.5);
            float dist = distance(uv, center);
            dist = smoothstep(0.5 - uVignetteSmoothness, 0.5, dist);
            float vignette = 1.0 - dist * uVignetteIntensity;
            return pow(vignette, uVignetteRoundness);
        }

        void main() {
            vec2 uv = vUv;

            // Chromatic Aberration
            vec3 color;
            float aberration = uChromaticAberration * 0.005;
            color.r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
            color.g = texture2D(tDiffuse, uv).g;
            color.b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;

            // Vignette
            float vig = vignette(uv);
            color *= vig;

            // Film Grain
            float grain = (rand(uv * uGrainScale + uTime) - 0.5) * 2.0 * uGrainIntensity;
            color += grain;

            // Scanlines
            float scanline = sin(uv.y * 800.0 + uTime * 10.0) * uScanlineIntensity;
            color += scanline;

            gl_FragColor = vec4(color, 1.0);
        }
    `
};

// Depth of Field (Bokeh) - simplified post-process DOF
const DepthOfFieldShader = {
    uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uFocusDistance: { value: 10.0 },
        uFocusRange: { value: 5.0 },
        uBokehScale: { value: 1.0 },
        uAperture: { value: 0.1 },
        uMaxBlur: { value: 0.02 },
        uNearBlur: { value: false },
        uFarBlur: { value: true },
        uResolution: { value: new THREE.Vector2(1920, 1080) },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform float uFocusDistance;
        uniform float uFocusRange;
        uniform float uBokehScale;
        uniform float uAperture;
        uniform float uMaxBlur;
        uniform bool uNearBlur;
        uniform bool uFarBlur;
        uniform vec2 uResolution;

        // CoC (Circle of Confusion) calculation
        float getCoC(float depth) {
            float diff = abs(depth - uFocusDistance);
            float coc = diff / uFocusDistance * uAperture;

            // Near/Far separate handling
            float nearCoc = (depth < uFocusDistance) ? coc : 0.0;
            float farCoc = (depth > uFocusDistance) ? coc : 0.0;

            float result = 0.0;
            if (uNearBlur) result += nearCoc;
            if (uFarBlur) result += farCoc;

            return clamp(result, 0.0, uMaxBlur);
        }

        // Hexagonal bokeh shape
        vec3 hexagonBokeh(sampler2D tex, vec2 uv, float radius) {
            const int SAMPLES = 12;
            const float ANGLE_STEP = 3.14159 * 2.0 / float(SAMPLES);
            vec3 color = vec3(0.0);
            float weight = 0.0;

            for (int i = 0; i < SAMPLES; i++) {
                float angle = float(i) * ANGLE_STEP;
                vec2 offset = vec2(cos(angle), sin(angle)) * radius * uBokehScale;
                vec3 sample = texture2D(tex, uv + offset).rgb;
                color += sample;
                weight += 1.0;
            }

            // Center sample
            color += texture2D(tex, uv).rgb;
            weight += 1.0;

            return color / weight;
        }

        void main() {
            float depth = texture2D(tDepth, vUv).r;
            float coc = getCoC(depth);

            if (coc < 0.001) {
                // In focus - sharp
                gl_FragColor = texture2D(tDiffuse, vUv);
            } else {
                // Out of focus - bokeh blur
                vec3 color = hexagonBokeh(tDiffuse, vUv, coc);
                gl_FragColor = vec4(color, 1.0);
            }
        }
    `
};

// ============================================
// POST PROCESSING MANAGER
// ============================================

export interface PostProcessingOptions {
    enabled: boolean;
    bloom: {
        enabled: boolean;
        strength: number;
        radius: number;
        threshold: number;
    };
    colorGrading: {
        enabled: boolean;
        exposure: number;
        contrast: number;
        saturation: number;
        temperature: number;
        tint: number;
        lift: THREE.Vector3;
        gamma: THREE.Vector3;
        gain: THREE.Vector3;
    };
    filmEffects: {
        enabled: boolean;
        vignette: number;
        grain: number;
        chromaticAberration: number;
        scanlines: number;
    };
    depthOfField: {
        enabled: boolean;
        focusDistance: number;
        focusRange: number;
        aperture: number;
        nearBlur: boolean;
        farBlur: boolean;
    };
}

export const DEFAULT_POST_PROCESSING_OPTIONS: PostProcessingOptions = {
    enabled: true,
    bloom: {
        enabled: true,
        strength: 0.6,
        radius: 0.4,
        threshold: 0.85,
    },
    colorGrading: {
        enabled: true,
        exposure: 1.0,
        contrast: 1.05,
        saturation: 1.1,
        temperature: 0.05, // Slightly warm
        tint: 0.0,
        lift: new THREE.Vector3(0.01, 0.01, 0.01),
        gamma: new THREE.Vector3(1.0, 1.0, 1.0),
        gain: new THREE.Vector3(1.0, 1.0, 1.0),
    },
    filmEffects: {
        enabled: true,
        vignette: 0.35,
        grain: 0.015,
        chromaticAberration: 0.0,
        scanlines: 0.0,
    },
    depthOfField: {
        enabled: false, // Requires depth texture - enable when needed
        focusDistance: 10.0,
        focusRange: 5.0,
        aperture: 0.1,
        nearBlur: false,
        farBlur: true,
    },
};

export class PostProcessingManager {
    private composer: EffectComposer | null = null;
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private options: PostProcessingOptions;
    private clock: THREE.Clock = new THREE.Clock();

    // Pass references
    private renderPass: RenderPass | null = null;
    private bloomPass: UnrealBloomPass | null = null;
    private colorGradingPass: ShaderPass | null = null;
    private filmEffectsPass: ShaderPass | null = null;
    private dofPass: ShaderPass | null = null;
    private gammaPass: ShaderPass | null = null;
    private depthRenderTarget: THREE.WebGLRenderTarget | null = null;

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, options?: Partial<PostProcessingOptions>) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.options = { ...DEFAULT_POST_PROCESSING_OPTIONS, ...options };

        this.init();
    }

    private init(): void {
        // Create EffectComposer
        this.composer = new EffectComposer(this.renderer);
        this.composer.setSize(window.innerWidth, window.innerHeight);

        // 1. Render Pass
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        // 2. Bloom Pass (Unreal Engine style)
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.options.bloom.strength,
            this.options.bloom.radius,
            this.options.bloom.threshold
        );
        this.bloomPass.enabled = this.options.bloom.enabled;
        this.composer.addPass(this.bloomPass);

        // 3. Color Grading Pass
        this.colorGradingPass = new ShaderPass(ColorGradingShader);
        this.colorGradingPass.enabled = this.options.colorGrading.enabled;
        this.updateColorGradingUniforms();
        this.composer.addPass(this.colorGradingPass);

        // 4. Film Effects Pass (Vignette, Grain, Chromatic Aberration)
        this.filmEffectsPass = new ShaderPass(FilmEffectsShader);
        this.filmEffectsPass.enabled = this.options.filmEffects.enabled;
        this.updateFilmEffectsUniforms();
        this.composer.addPass(this.filmEffectsPass);

        // 5. Depth of Field Pass (needs depth texture)
        // Create a separate render target for depth
        this.depthRenderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            type: THREE.UnsignedIntType,
            format: THREE.DepthFormat,
        }) as THREE.WebGLRenderTarget & { depthTexture: THREE.DepthTexture };

        this.dofPass = new ShaderPass(DepthOfFieldShader);
        this.dofPass.enabled = this.options.depthOfField.enabled;
        // Set depth texture
        this.dofPass.uniforms.tDepth.value = this.depthRenderTarget.depthTexture as THREE.DepthTexture;
        this.updateDOFUniforms();
        this.composer.addPass(this.dofPass);

        // 6. Gamma Correction Pass (final)
        this.gammaPass = new ShaderPass(GammaCorrectionShader);
        this.composer.addPass(this.gammaPass);
    }

    private updateColorGradingUniforms(): void {
        if (!this.colorGradingPass) return;
        const c = this.options.colorGrading;
        this.colorGradingPass.uniforms.uExposure.value = c.exposure;
        this.colorGradingPass.uniforms.uContrast.value = c.contrast;
        this.colorGradingPass.uniforms.uSaturation.value = c.saturation;
        this.colorGradingPass.uniforms.uTemperature.value = c.temperature;
        this.colorGradingPass.uniforms.uTint.value = c.tint;
        this.colorGradingPass.uniforms.uLift.value.copy(c.lift);
        this.colorGradingPass.uniforms.uGamma.value.copy(c.gamma);
        this.colorGradingPass.uniforms.uGain.value.copy(c.gain);
    }

    private updateFilmEffectsUniforms(): void {
        if (!this.filmEffectsPass) return;
        const f = this.options.filmEffects;
        this.filmEffectsPass.uniforms.uVignetteIntensity.value = f.vignette;
        this.filmEffectsPass.uniforms.uGrainIntensity.value = f.grain;
        this.filmEffectsPass.uniforms.uChromaticAberration.value = f.chromaticAberration;
        this.filmEffectsPass.uniforms.uScanlineIntensity.value = f.scanlines;
    }

    private updateDOFUniforms(): void {
        if (!this.dofPass) return;
        const d = this.options.depthOfField;
        this.dofPass.uniforms.uFocusDistance.value = d.focusDistance;
        this.dofPass.uniforms.uFocusRange.value = d.focusRange;
        this.dofPass.uniforms.uAperture.value = d.aperture;
        this.dofPass.uniforms.uNearBlur.value = d.nearBlur;
        this.dofPass.uniforms.uFarBlur.value = d.farBlur;
    }

    // Public API
    render(): void {
        if (!this.composer || !this.options.enabled) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        // Update time-based uniforms
        const elapsed = this.clock.getElapsedTime();
        if (this.filmEffectsPass) {
            this.filmEffectsPass.uniforms.uTime.value = elapsed;
        }

        // Render depth for DOF (if enabled)
        if (this.options.depthOfField.enabled && this.depthRenderTarget && this.dofPass) {
            this.renderer.setRenderTarget(this.depthRenderTarget);
            this.renderer.render(this.scene, this.camera);
            this.renderer.setRenderTarget(null);
        }

        this.composer.render();
    }

    resize(width: number, height: number): void {
        if (this.composer) {
            this.composer.setSize(width, height);
        }
        if (this.bloomPass) {
            this.bloomPass.resolution.set(width, height);
        }
        if (this.depthRenderTarget) {
            this.depthRenderTarget.setSize(width, height);
        }
        if (this.dofPass) {
            this.dofPass.uniforms.uResolution.value.set(width, height);
        }
    }

    // Option setters
    setBloom(enabled: boolean, strength?: number, radius?: number, threshold?: number): void {
        this.options.bloom.enabled = enabled;
        if (this.bloomPass) {
            this.bloomPass.enabled = enabled;
            if (strength !== undefined) {
                this.options.bloom.strength = strength;
                this.bloomPass.strength = strength;
            }
            if (radius !== undefined) {
                this.options.bloom.radius = radius;
                this.bloomPass.radius = radius;
            }
            if (threshold !== undefined) {
                this.options.bloom.threshold = threshold;
                this.bloomPass.threshold = threshold;
            }
        }
    }

    setColorGrading(params: Partial<PostProcessingOptions['colorGrading']>): void {
        this.options.colorGrading = { ...this.options.colorGrading, ...params };
        this.updateColorGradingUniforms();
    }

    setFilmEffects(params: Partial<PostProcessingOptions['filmEffects']>): void {
        this.options.filmEffects = { ...this.options.filmEffects, ...params };
        this.updateFilmEffectsUniforms();
    }

    setDepthOfField(params: Partial<PostProcessingOptions['depthOfField']>): void {
        this.options.depthOfField = { ...this.options.depthOfField, ...params };
        if (this.dofPass) {
            this.dofPass.enabled = this.options.depthOfField.enabled;
            this.updateDOFUniforms();
        }
    }

    setEnabled(enabled: boolean): void {
        this.options.enabled = enabled;
    }

    getComposer(): EffectComposer | null {
        return this.composer;
    }

    dispose(): void {
        this.composer?.dispose();
        this.renderPass?.dispose();
        this.bloomPass?.dispose();
        this.colorGradingPass?.dispose();
        this.filmEffectsPass?.dispose();
        this.dofPass?.dispose();
        this.gammaPass?.dispose();
    }
}

// Singleton instance
export const postProcessingManager = new PostProcessingManager(
    null as any, // Will be initialized properly in Game3D
    null as any,
    null as any
);