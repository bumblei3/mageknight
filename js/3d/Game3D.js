import { SceneManager3D } from './SceneManager3D.js';
import { HexMeshFactory } from './HexMeshFactory.js';
import * as THREE from 'three';

export class Game3D {
    constructor(game) {
        this.game = game;
        this.enabled = false;

        // Components
        this.sceneManager = null;
        this.meshFactory = new HexMeshFactory();

        // Track Hero Mesh
        this.heroMesh = null;
    }

    init(containerId) {
        this.sceneManager = new SceneManager3D(containerId);
    }

    toggle() {
        this.enabled = !this.enabled;
        const container = document.getElementById('game-container-3d');
        const canvas2d = document.querySelector('.canvas-layer'); // 2D Layer

        if (this.enabled) {
            container.style.display = 'block';
            canvas2d.style.display = 'none'; // Hide 2D
            this.sceneManager.start();
            this.render(); // Initial render
        } else {
            container.style.display = 'none';
            canvas2d.style.display = 'block'; // Show 2D
            this.sceneManager.stop();
        }
        return this.enabled;
    }

    render() {
        if (!this.enabled || !this.sceneManager) return;

        this.sceneManager.clear();

        // 1. Render Map
        if (this.game.hexGrid) {
            for (const hex of this.game.hexGrid.hexes.values()) {
                const mesh = this.meshFactory.createHexMesh(hex);
                this.sceneManager.add(mesh);
            }
        }

        // 2. Render Hero
        this.renderHero();
    }

    renderHero() {
        if (!this.game.hero) return;

        // Simple Hero Mesh (Gold Cylinder for Goldyx)
        const geo = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
        this.heroMesh = new THREE.Mesh(geo, mat);

        // Position on current hex
        const hex = this.game.hexGrid.getHex(this.game.hero.q, this.game.hero.r);
        if (hex) {
            const size = this.meshFactory.radius * 1.05;
            const x = size * 1.5 * hex.q;
            const z = size * Math.sqrt(3) * (hex.r + hex.q / 2);
            this.heroMesh.position.set(x, 1, z);
        }

        this.sceneManager.add(this.heroMesh);

        // Camera follow hero
        if (this.heroMesh) {
            // Smooth follow? For MVP just snap or offset
            const offset = new THREE.Vector3(0, 30, 20);
            this.sceneManager.camera.position.copy(this.heroMesh.position).add(offset);
            this.sceneManager.camera.lookAt(this.heroMesh.position);
        }
    }

    update() {
        if (!this.enabled) return;
        // Optimization: only full re-render if map changed?
        // For now, simple full sync on update call
        this.render();
    }
}
