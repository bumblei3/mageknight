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

        // Link update loop
        this.sceneManager.onUpdate = (time) => {
            if (this.meshFactory) {
                this.meshFactory.updateMaterials(time);
            }
            // We could also animate the selector pulse here later
            this.updateSelectorAnimation(time);

            // Sync Day/Night cycle
            if (this.game && this.game.timeManager) {
                const isNight = this.game.timeManager.isNight();
                // Simple check if state changed.
                // We rely on SceneManager to handle repeated calls efficiently or we check here.
                // Checking here is better.
                if (this._lastIsNight !== isNight) {
                    this.sceneManager.updateEnvironment(isNight);
                    this._lastIsNight = isNight;
                }
            }
        };

        // Input Handling
        const container = document.getElementById(containerId);
        container.addEventListener('pointerdown', (e) => this.onClick(e));
        container.addEventListener('pointermove', (e) => this.onPointerMove(e));
    }

    updateSelectorAnimation(time) {
        if (this.sceneManager && this.sceneManager.selector && this.sceneManager.selector.visible) {
            const scale = 1.0 + Math.sin(time * 3.0) * 0.05;
            this.sceneManager.selector.scale.set(scale, 1, scale);
            // Pulse opacity if material supports it
            if (this.sceneManager.selector.material) {
                // this.sceneManager.selector.material.opacity = 0.3 + Math.sin(time * 3.0) * 0.1;
            }
        }
    }

    onPointerMove(event) {
        if (!this.enabled || !this.sceneManager) return;

        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const hitObject = this.sceneManager.getIntersection(x, y);

        // Update selector
        if (hitObject && hitObject.userData && hitObject.userData.type === 'hex') {
            this.sceneManager.setSelectorPosition(hitObject.position);
            this.sceneManager.renderer.domElement.style.cursor = 'pointer';
        } else {
            this.sceneManager.hideSelector();
            this.sceneManager.renderer.domElement.style.cursor = 'default';
        }
    }

    onClick(event) {
        if (!this.enabled || !this.game || !this.sceneManager) return;

        // Calculate Normalized Device Coordinates (NDC)
        // x and y between -1 and +1
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const hitObject = this.sceneManager.getIntersection(x, y);
        if (hitObject && hitObject.userData) {
            const data = hitObject.userData;
            if (data.type === 'hex') {
                // Delegate to Game Logic
                if (this.game.toggleHexSelection && typeof this.game.toggleHexSelection === 'function') {
                    // Try direct selection first if available (UI helper)
                    this.game.toggleHexSelection(data.q, data.r);
                } else {
                    // Fallback to core movement/interaction logic
                    if (this.game.movementMode) {
                        this.game.moveHero(data.q, data.r);
                    } else if (this.game.selectHex) {
                        this.game.selectHex(data.q, data.r);
                    } else {
                        console.warn('[3D] No suitable method found to handle hex click');
                    }
                }
            }
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        const container = document.getElementById('game-container-3d');
        const canvas2d = document.querySelector('.canvas-layer'); // 2D Layer

        if (this.enabled) {
            container.style.display = 'block';
            canvas2d.style.display = 'none'; // Hide 2D
            // Trigger resize now that container is visible
            this.sceneManager.onWindowResize();
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

        this.sceneManager.add(this.heroMesh);

        // Update controls target to hero if controls exist (optional, mostly let user control)
        // if (this.sceneManager.controls) {
        //     this.sceneManager.controls.target.copy(this.heroMesh.position);
        // }
    }

    update() {
        if (!this.enabled) return;
        // Optimization: only full re-render if map changed?
        // For now, simple full sync on update call
        this.render();
    }
}
