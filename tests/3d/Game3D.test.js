
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HexMeshFactory } from '../../js/3d/HexMeshFactory.js';
import { HeroMeshFactory } from '../../js/3d/HeroMeshFactory.js';
import * as THREE from 'three';

// Mock Three.js dependencies if needed, but often we can test logic with real Three objects in Node logic if canvas is mocked
// Vitest with JSDOM usually handles Three.js basic math/objects fine. Canvas interactions might fail.

describe('HexMeshFactory', () => {
    let factory;

    beforeEach(() => {
        factory = new HexMeshFactory();
    });

    it('should create water material with shader', () => {
        const mat = factory.getMaterial('water');
        expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
        expect(mat.uniforms.uTime).toBeDefined();
    });

    it('should create standard material for plains', () => {
        const mat = factory.getMaterial('plains');
        expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it('should update time uniform', () => {
        const mat = factory.getMaterial('water');
        mat.uniforms.uTime.value = 0;

        factory.updateMaterials(1.5);
        expect(mat.uniforms.uTime.value).toBe(1.5);
    });
});

describe('HeroMeshFactory', () => {
    const heroFactory = new HeroMeshFactory();

    it('should create default hero mesh group', () => {
        const mesh = heroFactory.createHeroMesh('unknown');
        expect(mesh).toBeDefined();
        expect(mesh.isGroup).toBe(true);
        expect(mesh.children.length).toBeGreaterThan(0);
    });

    it('should create Goldyx specifics', () => {
        const mesh = heroFactory.createHeroMesh({ id: 'goldyx' });
        expect(mesh).toBeDefined();
        // Check for wings/horns logic via children count or material color
        expect(mesh.children.length).toBeGreaterThan(3);
    });
});
