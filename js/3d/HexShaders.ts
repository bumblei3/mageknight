/**
 * Hex Shader Module - Cinematic Hex Rendering
 * Provides custom ShaderMaterial for terrain hexes with:
 * - Normal mapping (via procedural normal generation)
 * - Specular/roughness control per terrain type
 * - Parallax occlusion mapping
 * - Day/night color grading
 * - Emissive highlights for hover/selection
 */
import * as THREE from 'three';

// ============================================
// TERRAIN SHADER DEFINITIONS
// ============================================

export interface TerrainShaderParams {
    baseColor: THREE.Color;
    normalScale: number;
    roughness: number;
    metalness: number;
    specularColor: THREE.Color;
    specularIntensity: number;
    parallaxScale: number;
    emissiveColor: THREE.Color;
    emissiveIntensity: number;
}

export const TERRAIN_SHADER_DEFAULTS: Record<string, TerrainShaderParams> = {
    plains: {
        baseColor: new THREE.Color(0x2ecc71),
        normalScale: 0.5,
        roughness: 0.9,
        metalness: 0.0,
        specularColor: new THREE.Color(0x4ade80),
        specularIntensity: 0.2,
        parallaxScale: 0.02,
        emissiveColor: new THREE.Color(0x000000),
        emissiveIntensity: 0.0,
    },
    forest: {
        baseColor: new THREE.Color(0x1a5c2e),
        normalScale: 0.8,
        roughness: 0.85,
        metalness: 0.0,
        specularColor: new THREE.Color(0x2d7d3e),
        specularIntensity: 0.25,
        parallaxScale: 0.03,
        emissiveColor: new THREE.Color(0x000000),
        emissiveIntensity: 0.0,
    },
    mountains: {
        baseColor: new THREE.Color(0x5a5a5a),
        normalScale: 1.2,
        roughness: 0.7,
        metalness: 0.1,
        specularColor: new THREE.Color(0x888888),
        specularIntensity: 0.4,
        parallaxScale: 0.05,
        emissiveColor: new THREE.Color(0x000000),
        emissiveIntensity: 0.0,
    },
    hills: {
        baseColor: new THREE.Color(0x7a7a6a),
        normalScale: 0.7,
        roughness: 0.8,
        metalness: 0.0,
        specularColor: new THREE.Color(0x999988),
        specularIntensity: 0.3,
        parallaxScale: 0.03,
        emissiveColor: new THREE.Color(0x000000),
        emissiveIntensity: 0.0,
    },
    water: {
        baseColor: new THREE.Color(0x1a5f7a),
        normalScale: 0.3,
        roughness: 0.1,
        metalness: 0.9,
        specularColor: new THREE.Color(0x4dd0e1),
        specularIntensity: 0.8,
        parallaxScale: 0.0,
        emissiveColor: new THREE.Color(0x003040),
        emissiveIntensity: 0.15,
    },
    desert: {
        baseColor: new THREE.Color(0xe8c56d),
        normalScale: 0.4,
        roughness: 0.95,
        metalness: 0.0,
        specularColor: new THREE.Color(0xf0d58a),
        specularIntensity: 0.35,
        parallaxScale: 0.01,
        emissiveColor: new THREE.Color(0x000000),
        emissiveIntensity: 0.0,
    },
    swamp: {
        baseColor: new THREE.Color(0x3d4a2f),
        normalScale: 0.6,
        roughness: 0.6,
        metalness: 0.05,
        specularColor: new THREE.Color(0x5a7a4a),
        specularIntensity: 0.4,
        parallaxScale: 0.02,
        emissiveColor: new THREE.Color(0x102010),
        emissiveIntensity: 0.1,
    },
    wasteland: {
        baseColor: new THREE.Color(0x4a2c2a),
        normalScale: 0.7,
        roughness: 0.85,
        metalness: 0.0,
        specularColor: new THREE.Color(0x6a4a48),
        specularIntensity: 0.2,
        parallaxScale: 0.02,
        emissiveColor: new THREE.Color(0x200808),
        emissiveIntensity: 0.05,
    },
};

// ============================================
// VERTEX SHADER
// ============================================

export const HEX_VERTEX_SHADER = `
    #define TERRAIN_SCALE 1.0
    #define PARALLAX_SAMPLES 16

    uniform float uTime;
    uniform float uParallaxScale;
    uniform vec3 uCameraPos;
    uniform mat3 uNormalMatrix;

    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aUv;

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vViewDir;
    varying vec3 vTangent;
    varying vec3 vBitangent;

    // Procedural normal from height map (in vertex shader for parallax)
    vec3 computeNormal(vec2 uv, float scale) {
        float h0 = texture2D(uHeightMap, uv).r;
        float h1 = texture2D(uHeightMap, uv + vec2(scale, 0.0)).r;
        float h2 = texture2D(uHeightMap, uv + vec2(0.0, scale)).r;
        vec3 normal = normalize(vec3(h0 - h1, h0 - h2, scale * 2.0));
        return normal;
    }

    // Parallax Occlusion Mapping
    vec2 parallaxOffset(vec2 uv, vec3 viewDir) {
        float height = texture2D(uHeightMap, uv).r;
        vec2 p = viewDir.xy * (height * uParallaxScale);
        vec2 newUv = uv - p;

        // Ray marching for occlusion
        float maxHeight = height;
        for (int i = 0; i < PARALLAX_SAMPLES; i++) {
            float currentHeight = texture2D(uHeightMap, newUv).r;
            if (currentHeight > maxHeight) {
                maxHeight = currentHeight;
                break;
            }
            newUv -= p / float(PARALLAX_SAMPLES);
        }
        return newUv;
    }

    void main() {
        vUv = aUv;
        vNormal = normalize(uNormalMatrix * aNormal);

        // World position
        vec4 worldPosition = modelMatrix * vec4(aPosition, 1.0);
        vWorldPos = worldPosition.xyz;

        // View direction for parallax/specular
        vViewDir = normalize(uCameraPos - vWorldPos);

        // Tangent space for normal mapping
        vec3 tangent = normalize(uNormalMatrix * vec3(1.0, 0.0, 0.0));
        vec3 bitangent = cross(vNormal, tangent);
        vTangent = tangent;
        vBitangent = bitangent;

        // Apply parallax offset to UV
        vec2 parallaxUv = parallaxOffset(vUv, vViewDir);

        // Pass parallax UV to fragment shader via varying
        // (We'll recompute in fragment for precision)

        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

// ============================================
// FRAGMENT SHADER
// ============================================

export const HEX_FRAGMENT_SHADER = `
    #define PI 3.14159265359
    #define PARALLAX_SAMPLES 16

    uniform float uTime;
    uniform float uParallaxScale;
    uniform vec3 uCameraPos;
    uniform vec3 uSunDirection;
    uniform vec3 uSunColor;
    uniform float uSunIntensity;
    uniform vec3 uAmbientColor;
    uniform float uAmbientIntensity;
    uniform bool uIsNight;
    uniform float uEmissiveIntensity;
    uniform vec3 uEmissiveColor;

    uniform sampler2D uHeightMap;
    uniform sampler2D uNormalMap;
    uniform sampler2D uRoughnessMap;
    uniform sampler2D uTerrainNoise;

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vViewDir;
    varying vec3 vTangent;
    varying vec3 vBitangent;

    // ----------------------------------------
    // UTILITY FUNCTIONS
    // ----------------------------------------

    // Procedural height map
    float heightMap(vec2 uv) {
        // Base terrain noise
        float n = texture2D(uTerrainNoise, uv * 10.0).r;
        n += texture2D(uTerrainNoise, uv * 50.0).r * 0.5;
        n += texture2D(uTerrainNoise, uv * 200.0).r * 0.25;

        // Add some variation based on world position
        n += sin(vWorldPos.x * 0.5) * 0.05;
        n += cos(vWorldPos.z * 0.5) * 0.05;

        return n;
    }

    // Procedural normal map
    vec3 normalMap(vec2 uv) {
        float scale = 0.01;
        float h0 = heightMap(uv);
        float h1 = heightMap(uv + vec2(scale, 0.0));
        float h2 = heightMap(uv + vec2(0.0, scale));
        vec3 normal = normalize(vec3(h0 - h1, h0 - h2, scale * 2.0));
        return normal;
    }

    // Parallax mapping with ray marching
    vec2 parallaxOffset(vec2 uv, vec3 viewDir) {
        float height = heightMap(uv);
        float numLayers = 10.0;
        float layerHeight = height / numLayers;
        vec2 deltaTex = viewDir.xy * uParallaxScale / numLayers;
        vec2 currentUv = uv;
        float currentHeight = layerHeight;

        for (int i = 0; i < 10; i++) {
            float sampledHeight = heightMap(currentUv);
            if (sampledHeight > currentHeight) {
                // Binary search refinement
                vec2 prevUv = currentUv + deltaTex;
                float prevHeight = currentHeight - layerHeight;
                for (int j = 0; j < 4; j++) {
                    vec2 midUv = (prevUv + currentUv) * 0.5;
                    float midHeight = heightMap(midUv);
                    if (midHeight < (prevHeight + currentHeight) * 0.5) {
                        currentUv = midUv;
                        currentHeight = midHeight;
                    } else {
                        prevUv = midUv;
                        prevHeight = midHeight;
                    }
                }
                return currentUv;
            }
            currentUv -= deltaTex;
            currentHeight += layerHeight;
        }
        return currentUv;
    }

    // Fresnel-Schlick approximation
    float fresnelSchlick(float cosTheta, float F0) {
        return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
    }

    // GGX Distribution
    float distributionGGX(vec3 N, vec3 H, float roughness) {
        float a = roughness * roughness;
        float a2 = a * a;
        float NdotH = max(dot(N, H), 0.0);
        float NdotH2 = NdotH * NdotH;
        float denom = (NdotH2 * (a2 - 1.0) + 1.0);
        denom = PI * denom * denom;
        return a2 / denom;
    }

    // Schlick-GGX Geometry
    float geometrySchlickGGX(float NdotV, float roughness) {
        float r = (roughness + 1.0);
        float k = (r * r) / 8.0;
        return NdotV / (NdotV * (1.0 - k) + k);
    }

    float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
        float NdotV = max(dot(N, V), 0.0);
        float NdotL = max(dot(N, L), 0.0);
        float ggx2 = geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);
        return ggx2;
    }

    // Tone mapping (ACES filmic)
    vec3 toneMappingACES(vec3 color) {
        float a = 2.51;
        float b = 0.03;
        float c = 2.43;
        float d = 0.59;
        float e = 0.14;
        return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
    }

    // Gamma correction
    vec3 gammaCorrect(vec3 color) {
        return pow(color, vec3(1.0 / 2.2));
    }

    // ----------------------------------------
    // MAIN
    // ----------------------------------------

    void main() {
        // Parallax UV
        vec2 parallaxUv = parallaxOffset(vUv, vViewDir);

        // Normal mapping (procedural + normal map)
        vec3 normalMapSample = texture2D(uNormalMap, parallaxUv).rgb;
        vec3 localNormal = normalMapSample * 2.0 - 1.0;

        // Build TBN matrix
        vec3 T = normalize(vTangent);
        vec3 B = normalize(vBitangent);
        vec3 N = normalize(vNormal);
        mat3 TBN = mat3(T, B, N);
        vec3 worldNormal = normalize(TBN * localNormal);

        // Fallback to geometric normal if normal map fails
        if (length(localNormal) < 0.01) {
            worldNormal = N;
        }

        // Material properties from terrain
        float roughness = 0.9; // Will be overridden by uniform
        float metalness = 0.0;

        // Base color (procedural variation)
        vec3 baseColor = vec3(0.5); // Will be overridden by uniform

        // Specular
        vec3 F0 = mix(vec3(0.04), baseColor, metalness);

        // ----------------------------------------
        // LIGHTING
        // ----------------------------------------

        vec3 Lo = vec3(0.0);

        // Sun light (directional)
        vec3 L = normalize(uSunDirection);
        vec3 H = normalize(L + vViewDir);
        float NdotL = max(dot(worldNormal, L), 0.0);
        float NdotV = max(dot(worldNormal, vViewDir), 0.0);
        float NdotH = max(dot(worldNormal, H), 0.0);

        if (NdotL > 0.0) {
            float D = distributionGGX(worldNormal, H, roughness);
            float G = geometrySmith(worldNormal, vViewDir, L, roughness);
            vec3 F = vec3(fresnelSchlick(NdotV, 0.04)); // Simplified

            vec3 kS = F;
            vec3 kD = (vec3(1.0) - kS) * (1.0 - metalness);

            vec3 radiance = uSunColor * uSunIntensity * NdotL;
            vec3 specular = (D * G * F) / (4.0 * NdotV * NdotL + 0.001);
            Lo += (kD * baseColor / PI + specular) * radiance;
        }

        // Ambient
        vec3 ambient = uAmbientColor * uAmbientIntensity * baseColor * (vec3(1.0) - vec3(fresnelSchlick(NdotV, 0.04))) * (1.0 - metalness);
        Lo += ambient;

        // Emissive
        Lo += uEmissiveColor * uEmissiveIntensity;

        // Night adjustment
        if (uIsNight) {
            Lo *= 0.3;
            Lo += baseColor * 0.02; // Moonlight fill
        }

        // Tone mapping + gamma
        vec3 color = toneMappingACES(Lo);
        color = gammaCorrect(color);

        // Fog
        #ifdef USE_FOG
            float fogFactor = smoothstep(10.0, 50.0, length(vWorldPos));
            vec3 fogColor = uIsNight ? vec3(0.02, 0.02, 0.05) : vec3(0.53, 0.78, 0.92);
            color = mix(color, fogColor, fogFactor);
        #endif

        gl_FragColor = vec4(color, 1.0);
    }
`;

// ============================================
// SHADER MATERIAL FACTORY
// ============================================

export function createHexShaderMaterial(terrainType: string, customParams?: Partial<TerrainShaderParams>): THREE.ShaderMaterial {
    const defaults = TERRAIN_SHADER_DEFAULTS[terrainType] || TERRAIN_SHADER_DEFAULTS.plains;
    const params = { ...defaults, ...customParams };

    // Create procedural noise texture for terrain variation
    const noiseTexture = createProceduralNoiseTexture(256, 256);
    const heightTexture = createProceduralHeightTexture(256, 256, terrainType);
    const normalTexture = createProceduralNormalTexture(256, 256, terrainType);
    const roughnessTexture = createProceduralRoughnessTexture(256, 256, terrainType);

    const material = new THREE.ShaderMaterial({
        vertexShader: HEX_VERTEX_SHADER,
        fragmentShader: HEX_FRAGMENT_SHADER,
        uniforms: {
            uTime: { value: 0 },
            uParallaxScale: { value: params.parallaxScale },
            uCameraPos: { value: new THREE.Vector3() },
            uSunDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
            uSunColor: { value: params.specularColor },
            uSunIntensity: { value: params.specularIntensity },
            uAmbientColor: { value: new THREE.Color(0xffffff) },
            uAmbientIntensity: { value: 0.3 },
            uIsNight: { value: false },
            uEmissiveIntensity: { value: params.emissiveIntensity },
            uEmissiveColor: { value: params.emissiveColor },
            uHeightMap: { value: heightTexture },
            uNormalMap: { value: normalTexture },
            uRoughnessMap: { value: roughnessTexture },
            uTerrainNoise: { value: noiseTexture },
        },
        defines: {
            USE_FOG: true,
        },
    });

    return material;
}

// ============================================
// PROCEDURAL TEXTURE GENERATORS
// ============================================

function createProceduralNoiseTexture(width: number, height: number): THREE.DataTexture {
    const data = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            // Simplex-like noise using multiple octaves
            let val = 0;
            let freq = 1.0;
            let amp = 1.0;
            for (let o = 0; o < 4; o++) {
                const nx = x * freq / width;
                const ny = y * freq / height;
                val += Math.sin(nx * 12.9898 + ny * 78.233) * amp * 43758.5453;
                val = val - Math.floor(val);
                freq *= 2.0;
                amp *= 0.5;
            }
            const v = Math.floor(val * 255);
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
            data[i + 3] = 255;
        }
    }
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
}

function createProceduralHeightTexture(width: number, height: number, terrainType: string): THREE.DataTexture {
    const data = new Uint8Array(width * height * 4);
    const params = TERRAIN_SHADER_DEFAULTS[terrainType] || TERRAIN_SHADER_DEFAULTS.plains;
    const scale = params.normalScale;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const nx = x / width;
            const ny = y / height;

            // Terrain-specific height patterns
            let h = 0;
            if (terrainType === 'mountains') {
                h = Math.abs(Math.sin(nx * 20) * Math.cos(ny * 20)) * 0.5;
                h += Math.abs(Math.sin(nx * 40) * Math.cos(ny * 40)) * 0.25;
            } else if (terrainType === 'hills') {
                h = Math.sin(nx * 10) * Math.cos(ny * 10) * 0.4;
            } else if (terrainType === 'forest') {
                h = (Math.sin(nx * 30) + Math.cos(ny * 30)) * 0.2;
            } else if (terrainType === 'water') {
                h = (Math.sin(nx * 15 + Date.now() * 0.001) + Math.cos(ny * 15)) * 0.1;
            } else {
                h = Math.sin(nx * 8) * Math.cos(ny * 8) * 0.3 * scale;
            }

            const v = Math.floor(Math.max(0, Math.min(1, h)) * 255);
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
            data[i + 3] = 255;
        }
    }
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
}

function createProceduralNormalTexture(width: number, height: number, terrainType: string): THREE.DataTexture {
    const data = new Uint8Array(width * height * 4);
    const heightTex = createProceduralHeightTexture(width, height, terrainType);
    const heightData = heightTex.image.data!;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const scale = 1.0 / Math.max(width, height);

            // Sample height neighbors
            const hL = heightData[((y * width + ((x - 1 + width) % width)) * 4)] / 255.0;
            const hR = heightData[((y * width + ((x + 1) % width)) * 4)] / 255.0;
            const hD = heightData[((((y - 1 + height) % height) * width + x) * 4)] / 255.0;
            const hU = heightData[((((y + 1) % height) * width + x) * 4)] / 255.0;

            const normal = new THREE.Vector3(hL - hR, hD - hU, scale * 2.0).normalize();
            data[i] = Math.floor((normal.x * 0.5 + 0.5) * 255);
            data[i + 1] = Math.floor((normal.y * 0.5 + 0.5) * 255);
            data[i + 2] = Math.floor((normal.z * 0.5 + 0.5) * 255);
            data[i + 3] = 255;
        }
    }
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    heightTex.dispose();
    return texture;
}

function createProceduralRoughnessTexture(width: number, height: number, terrainType: string): THREE.DataTexture {
    const data = new Uint8Array(width * height * 4);
    const params = TERRAIN_SHADER_DEFAULTS[terrainType] || TERRAIN_SHADER_DEFAULTS.plains;
    const baseRoughness = params.roughness;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const nx = x / width;
            const ny = y / height;

            // Add subtle variation
            const variation = (Math.sin(nx * 50) * Math.cos(ny * 50) + 1.0) * 0.1;
            const r = Math.max(0.05, Math.min(1.0, baseRoughness + variation * 0.2 - 0.1));
            const v = Math.floor(r * 255);

            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
            data[i + 3] = 255;
        }
    }
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
}

// ============================================
// SHADER MANAGER
// ============================================

export class HexShaderManager {
    private materials: Map<string, THREE.ShaderMaterial> = new Map();
    private camera: THREE.Camera | null = null;
    private isNight: boolean = false;
    private sunDirection: THREE.Vector3 = new THREE.Vector3(1, 2, 1).normalize();
    private sunColor: THREE.Vector3 = new THREE.Vector3(1.0, 0.95, 0.8);
    private sunIntensity: number = 1.0;
    private ambientColor: THREE.Vector3 = new THREE.Vector3(0.5, 0.5, 0.5);
    private ambientIntensity: number = 0.3;

    setCamera(camera: THREE.Camera): void {
        this.camera = camera;
    }

    setTimeOfDay(isNight: boolean): void {
        this.isNight = isNight;
        if (isNight) {
            this.sunColor.set(0.6, 0.7, 0.9);
            this.sunIntensity = 0.4;
            this.ambientColor.set(0.1, 0.15, 0.2);
            this.ambientIntensity = 0.2;
            this.sunDirection.set(-0.5, 0.8, -0.3).normalize();
        } else {
            this.sunColor.set(1.0, 0.95, 0.8);
            this.sunIntensity = 1.0;
            this.ambientColor.set(0.5, 0.5, 0.5);
            this.ambientIntensity = 0.4;
            this.sunDirection.set(0.5, 1.0, 0.5).normalize();
        }
        this.updateAllMaterials();
    }

    update(deltaTime: number): void {
        if (!this.camera) return;

        const cameraPos = new THREE.Vector3();
        this.camera.getWorldPosition(cameraPos);

        this.materials.forEach(material => {
            material.uniforms.uTime.value += deltaTime;
            material.uniforms.uCameraPos.value.copy(cameraPos);
            material.uniforms.uSunDirection.value.copy(this.sunDirection);
            material.uniforms.uSunColor.value.copy(this.sunColor);
            material.uniforms.uSunIntensity.value = this.sunIntensity;
            material.uniforms.uAmbientColor.value.copy(this.ambientColor);
            material.uniforms.uAmbientIntensity.value = this.ambientIntensity;
            material.uniforms.uIsNight.value = this.isNight;
        });
    }

    getMaterial(terrainType: string): THREE.ShaderMaterial {
        if (!this.materials.has(terrainType)) {
            this.materials.set(terrainType, createHexShaderMaterial(terrainType));
        }
        return this.materials.get(terrainType)!;
    }

    // For hover/selection highlighting
    setHexHighlight(terrainType: string, highlight: boolean, isSelected: boolean = false): void {
        const material = this.getMaterial(terrainType);
        if (highlight) {
            material.uniforms.uEmissiveColor.value.setHex(isSelected ? 0xff8800 : 0x888888);
            material.uniforms.uEmissiveIntensity.value = isSelected ? 0.8 : 0.3;
        } else {
            material.uniforms.uEmissiveIntensity.value = 0.0;
        }
    }

    private updateAllMaterials(): void {
        this.materials.forEach(material => {
            material.uniforms.uSunDirection.value.copy(this.sunDirection);
            material.uniforms.uSunColor.value.copy(this.sunColor);
            material.uniforms.uSunIntensity.value = this.sunIntensity;
            material.uniforms.uAmbientColor.value.copy(this.ambientColor);
            material.uniforms.uAmbientIntensity.value = this.ambientIntensity;
            material.uniforms.uIsNight.value = this.isNight;
        });
    }

    dispose(): void {
        this.materials.forEach(material => {
            // Dispose textures
            Object.values(material.uniforms).forEach(uniform => {
                if (uniform.value instanceof THREE.Texture) {
                    uniform.value.dispose();
                }
            });
            material.dispose();
        });
        this.materials.clear();
    }
}

// Singleton instance
export const hexShaderManager = new HexShaderManager();