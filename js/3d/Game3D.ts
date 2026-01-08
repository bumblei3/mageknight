import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { eventBus } from '../eventBus';
import { GAME_EVENTS } from '../constants';

export class Game3D {
    private game: any;
    private listeners: Function[] = []; // Store cleanup functions
    public enabled: boolean = false;
    private container: HTMLElement | null = null;

    // Three.js Components
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private controls: OrbitControls | null = null;
    private animationId: number | null = null;

    private hexMeshes: Map<string, THREE.Mesh> = new Map();

    // Interaction
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private hoveredHex: THREE.Object3D | null = null;
    private originalMaterial: THREE.Material | null = null;

    constructor(game: any) {
        this.game = game;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    init(containerId: string): void {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('3D container not found');
            return;
        }

        // 1. Setup Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

        // 2. Setup Camera
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(0, 10, 10);
        this.camera.lookAt(0, 0, 0);

        // 3. Setup Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Interaction Listeners
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

        // 4. Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // 5. Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // 6. Initial Render
        this.renderMap();

        // 7. Handle Resize
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // 8. Event Listeners
        const onHeroMove = (data: any) => {
            if (this.enabled) {
                // Wait for move animation to potentially finish or just render immediately
                this.renderMap();
                this.centerCameraOnHero();
            }
        };

        const onMapUpdate = (data: any) => {
            if (this.enabled && data.message && (data.message.includes('Neues Gebiet') || data.message.includes('Szenario'))) {
                this.renderMap();
            }
        };

        const onTimeChange = (data: any) => {
            if (this.enabled) {
                this.updateLighting();
            }
        };

        const onVolkareUpdate = (data: any) => {
            if (this.enabled) {
                this.renderVolkare();
            }
        };

        eventBus.on(GAME_EVENTS.HERO_MOVED, onHeroMove);
        eventBus.on(GAME_EVENTS.LOG_ADDED, onMapUpdate);
        eventBus.on(GAME_EVENTS.TIME_CHANGED, onTimeChange);
        eventBus.on(GAME_EVENTS.PHASE_CHANGED, onTimeChange);
        eventBus.on('VOLKARE_UPDATED', onVolkareUpdate);

        this.listeners.push(() => {
            eventBus.off(GAME_EVENTS.HERO_MOVED, onHeroMove);
            eventBus.off(GAME_EVENTS.LOG_ADDED, onMapUpdate);
            eventBus.off(GAME_EVENTS.TIME_CHANGED, onTimeChange);
            eventBus.off(GAME_EVENTS.PHASE_CHANGED, onTimeChange);
            eventBus.off('VOLKARE_UPDATED', onVolkareUpdate);

            if (this.renderer) {
                this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
                this.renderer.domElement.removeEventListener('click', this.onClick.bind(this));
            }
        });

        console.log('Game3D initialized (Active)');
    }

    // Interaction Handlers
    onMouseMove(event: MouseEvent): void {
        if (!this.renderer) return;

        // Calculate mouse position in normalized device coordinates (-1 to +1) based on canvas size
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    onClick(event: MouseEvent): void {
        if (!this.enabled || !this.hoveredHex) return;

        // Perform interaction based on click
        const userData = this.hoveredHex.userData;
        if (userData && typeof userData.q === 'number' && typeof userData.r === 'number') {
            const { q, r } = userData;
            console.log(`3D Click on Hex: q=${q}, r=${r}`);

            // Delegate to InteractionController
            if (this.game.interactionController) {
                this.game.interactionController.handleHexClick(q, r);
            }
        }
    }

    handleHoverInteraction(): void {
        if (!this.camera || !this.scene) return;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Find intersections with Hex Groups
        // Note: Hexes are groups, so we intersect recursively but identify the parent group
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        let targetHex: THREE.Object3D | null = null;

        for (const intersect of intersects) {
            // Traverse up to find the Group representing the hex
            let obj = intersect.object;
            while (obj.parent && obj.parent !== this.scene) {
                if (obj.parent.userData && obj.parent.userData.isHex) {
                    targetHex = obj.parent;
                    break;
                }
                obj = obj.parent;
            }
            if (targetHex) break;
        }

        if (this.hoveredHex !== targetHex) {
            // Restore previous
            if (this.hoveredHex) {
                // Reset emissive or color
                const mesh = this.hoveredHex.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;
                if (mesh && (mesh.material as THREE.MeshStandardMaterial).emissive) {
                    (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
                }
            }

            this.hoveredHex = targetHex;

            // Highlight new
            if (this.hoveredHex) {
                const mesh = this.hoveredHex.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;
                if (mesh && (mesh.material as THREE.MeshStandardMaterial).emissive) {
                    (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x555555);
                }
            }
        }
    }

    renderMap(): void {
        if (!this.scene || !this.game.hexGrid) return;
        // ... (rest of renderMap)

        console.log(`Game3D: Rendering map with ${this.game.hexGrid.hexes.size} hexes`);

        // Clear existing meshes
        this.hexMeshes.forEach(mesh => this.scene!.remove(mesh));
        this.hexMeshes.clear();

        const grid = this.game.hexGrid;
        const scale = 0.02;

        for (const hex of grid.hexes.values()) {
            const pixel = grid.axialToPixelOffset(hex.q, hex.r);
            const group = this.createHexGroup(hex, grid.hexSize || 40, scale);

            group.position.set(pixel.x * scale, 0, pixel.y * scale);

            this.scene.add(group);
            this.hexMeshes.set(`${hex.q},${hex.r}`, group as any);
        }

        this.updateLighting();
        this.renderHero();
        this.renderVolkare();
        this.centerCameraOnHero();
    }

    createHexGroup(hex: any, hexSize: number, scale: number): THREE.Group {
        const group = new THREE.Group();
        group.userData = { isHex: true, q: hex.q, r: hex.r }; // Metadata for interaction
        const baseSize = hexSize * 0.95 * scale;

        let geometry: THREE.BufferGeometry;
        let material: THREE.Material;
        let yOffset = 0;

        // Base color mapping
        let color = 0xcccccc;
        switch (hex.terrain) {
            case 'plains': color = 0x2ecc71; break;
            case 'forest': color = 0x27ae60; break;
            case 'mountains': color = 0x7f8c8d; break;
            case 'hills': color = 0x95a5a6; break;
            case 'water': color = 0x3498db; break;
            case 'desert': color = 0xf1c40f; break;
            case 'swamp': color = 0x8e44ad; break;
            case 'wasteland': color = 0xc0392b; break;
        }

        // Custom Geometries based on Terrain
        if (hex.terrain === 'mountains') {
            // Pyntagonal Pyramid for mountains
            geometry = new THREE.ConeGeometry(baseSize, baseSize * 2, 5);
            yOffset = baseSize; // Sit on ground
        } else if (hex.terrain === 'hills') {
            // Smooth dome (Sphere segment)
            geometry = new THREE.SphereGeometry(baseSize, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
            yOffset = 0;
        } else if (hex.terrain === 'water') {
            // Flat and slightly lower
            geometry = new THREE.CylinderGeometry(baseSize, baseSize, 0.1, 6);
            yOffset = -0.05;
            material = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.1,
                metalness: 0.8,
                transparent: true,
                opacity: 0.8
            });
        } else {
            // Standard flat hex
            geometry = new THREE.CylinderGeometry(baseSize, baseSize, 0.2, 6);
            yOffset = 0;
        }

        if (!material!) {
            material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = yOffset;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        // Add extras (Trees for Forest)
        if (hex.terrain === 'forest') {
            this.addTreesToGroup(group, baseSize, scale);
        }

        return group;
    }

    addTreesToGroup(group: THREE.Group, baseSize: number, scale: number): void {
        const treeColor = 0x0f5132; // Dark green
        const trunkColor = 0x5d4037; // Brown

        // Add 3-5 random trees
        const treeCount = 3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < treeCount; i++) {
            // Random position within hex radius
            const r = (Math.random() * baseSize * 0.6); // slight padding from edge
            const theta = Math.random() * Math.PI * 2;
            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);

            // Trunk
            const trunkGeo = new THREE.CylinderGeometry(0.05 * scale * 20, 0.05 * scale * 20, 0.3 * scale * 20, 4);
            const trunkMat = new THREE.MeshStandardMaterial({ color: trunkColor });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(x, 0.15 * scale * 20, z); // scale * 20 is approx correction for raw values

            // Leaves (Cone)
            const leavesGeo = new THREE.ConeGeometry(0.15 * scale * 20, 0.4 * scale * 20, 4);
            const leavesMat = new THREE.MeshStandardMaterial({ color: treeColor });
            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.position.set(x, 0.5 * scale * 20, z);

            trunk.castShadow = true;
            leaves.castShadow = true;

            group.add(trunk);
            group.add(leaves);
        }
    }

    renderHero(): void {
        if (!this.game.hero || !this.scene || !this.game.hexGrid) return;

        // Remove existing hero mesh if any (not tracking separate ref currently, but could)
        const heroName = 'hero-token';
        const existingHero = this.scene.getObjectByName(heroName);
        if (existingHero) this.scene.remove(existingHero);

        const pos = this.game.hero.position;
        const grid = this.game.hexGrid;
        const pixel = grid.axialToPixelOffset(pos.q, pos.r);
        const scale = 0.02;

        // Hero Geometry (Pawn style)
        const group = new THREE.Group();
        group.name = heroName;

        // Base
        const baseGeo = new THREE.CylinderGeometry(0.5 * scale * 20, 0.6 * scale * 20, 0.2 * scale * 20, 16);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.3, metalness: 0.8 }); // Gold
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.1 * scale * 20;
        base.castShadow = true;
        group.add(base);

        // Body
        const bodyGeo = new THREE.ConeGeometry(0.3 * scale * 20, 0.8 * scale * 20, 16);
        const body = new THREE.Mesh(bodyGeo, baseMat);
        body.position.y = 0.6 * scale * 20;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.25 * scale * 20, 16, 16);
        const head = new THREE.Mesh(headGeo, baseMat);
        head.position.y = 1.0 * scale * 20;
        head.castShadow = true;
        group.add(head);

        group.position.set(pixel.x * scale, 0, pixel.y * scale);

        this.scene.add(group);
    }

    renderVolkare(): void {
        if (!this.game.volkare || !this.game.volkare.isActive || !this.game.volkare.position || !this.scene || !this.game.hexGrid) return;

        const volkareName = 'volkare-token';
        const existing = this.scene.getObjectByName(volkareName);
        if (existing) this.scene.remove(existing);

        const pos = this.game.volkare.position;
        const grid = this.game.hexGrid;
        const pixel = grid.axialToPixelOffset(pos.q, pos.r);
        const scale = 0.02;

        const group = new THREE.Group();
        group.name = volkareName;

        // Dark/Red Theme
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x800000, roughness: 0.5 }); // Dark Red

        // Spiky Base
        const baseGeo = new THREE.CylinderGeometry(0.6 * scale * 20, 0.7 * scale * 20, 0.2 * scale * 20, 6);
        const base = new THREE.Mesh(baseGeo, darkMat);
        base.position.y = 0.1 * scale * 20;
        base.castShadow = true;
        group.add(base);

        // Tower Body
        const bodyGeo = new THREE.BoxGeometry(0.4 * scale * 20, 1.0 * scale * 20, 0.4 * scale * 20);
        const body = new THREE.Mesh(bodyGeo, darkMat);
        body.position.y = 0.7 * scale * 20;
        body.castShadow = true;
        group.add(body);

        // Spikes on top
        const spikeGeo = new THREE.ConeGeometry(0.15 * scale * 20, 0.5 * scale * 20, 4);
        const spike1 = new THREE.Mesh(spikeGeo, darkMat);
        spike1.position.set(0.15 * scale * 20, 1.3 * scale * 20, 0.15 * scale * 20);
        group.add(spike1);

        const spike2 = new THREE.Mesh(spikeGeo, darkMat);
        spike2.position.set(-0.15 * scale * 20, 1.3 * scale * 20, -0.15 * scale * 20);
        group.add(spike2);

        group.position.set(pixel.x * scale, 0, pixel.y * scale);

        // Add Floating Label if needed, or simply unique look
        this.scene.add(group);
    }

    updateLighting(): void {
        if (!this.scene) return;

        const isNight = this.game.timeManager ? this.game.timeManager.isNight() : false;

        // Find existing lights
        const ambientLight = this.scene.children.find(c => c instanceof THREE.AmbientLight) as THREE.AmbientLight;
        const dirLight = this.scene.children.find(c => c instanceof THREE.DirectionalLight) as THREE.DirectionalLight;

        if (isNight) {
            // Night Mode: Cool blue, dimmer
            if (ambientLight) ambientLight.color.setHex(0x1a2b3c);
            if (ambientLight) ambientLight.intensity = 0.4;

            if (dirLight) {
                dirLight.color.setHex(0xaaccff); // Moon blue
                dirLight.intensity = 0.5;
                dirLight.position.set(-10, 20, -5); // Moon position
            }
            this.scene.background = new THREE.Color(0x050510); // Dark night sky
            if (this.scene.fog) this.scene.fog.color.setHex(0x050510);

        } else {
            // Day Mode: Warm yellow/white, bright
            if (ambientLight) ambientLight.color.setHex(0xffffff);
            if (ambientLight) ambientLight.intensity = 0.6;

            if (dirLight) {
                dirLight.color.setHex(0xfffee0); // Sun warm
                dirLight.intensity = 0.9;
                dirLight.position.set(10, 20, 10); // Sun position
            }
            this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
            if (this.scene.fog) this.scene.fog.color.setHex(0x87CEEB);
        }
    }

    centerCameraOnHero(): void {
        if (!this.game.hero || !this.camera || !this.controls) return;

        const pos = this.game.hero.position;
        const grid = this.game.hexGrid;
        const pixel = grid.axialToPixelOffset(pos.q, pos.r);
        const scale = 0.02;

        const targetX = pixel.x * scale;
        const targetZ = pixel.y * scale;

        this.controls.target.set(targetX, 0, targetZ);
        // Don't jump camera position, just target
        this.controls.update();
    }

    toggle(): boolean {
        this.enabled = !this.enabled;
        if (this.container) {
            this.container.style.display = this.enabled ? 'block' : 'none';
        }

        if (this.enabled) {
            this.onWindowResize(); // Ensure correct size on show
            this.renderMap(); // Force re-render on enable
            this.animate();
        } else {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
        }
        return this.enabled;
    }

    update(): void {
        if (this.enabled) {
            this.renderMap();
        }
    }

    animate(): void {
        if (!this.enabled) return;

        this.animationId = requestAnimationFrame(this.animate.bind(this));

        if (this.controls) this.controls.update();

        this.handleHoverInteraction(); // Update hover effects

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onWindowResize(): void {
        if (!this.camera || !this.renderer || !this.container) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    destroy(): void {
        this.enabled = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.onWindowResize.bind(this));

        this.listeners.forEach(cleanup => cleanup());
        this.listeners = [];

        if (this.container) {
            this.container.innerHTML = '';
            this.container.style.display = 'none';
        }
    }
}
