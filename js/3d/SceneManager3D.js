import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLighting();
        this.initAtmosphere();
        this.initControls();

        // Group to hold all hexes and units
        this.worldGroup = new THREE.Group();
        this.scene.add(this.worldGroup);

        this.animate = this.animate.bind(this);
        this.requestAnimationFrameId = null;

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x202025); // Dark background
        this.scene.fog = new THREE.Fog(0x202025, 20, 100);

        this.raycaster = new THREE.Raycaster();
    }

    initCamera() {
        // Isometric-ish perspective
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
        this.camera.position.set(0, 40, 30);
        this.camera.lookAt(0, 0, 0);
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Append canvas
        this.renderer.domElement.id = 'game-canvas-3d';
        this.container.appendChild(this.renderer.domElement);
    }

    initLighting() {
        // Ambient Light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        // Directional Light (Sun/Moon)
        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.dirLight.position.set(20, 50, 20);
        this.dirLight.castShadow = true;

        // Shadow properties
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 100;
        this.dirLight.shadow.camera.left = -50;
        this.dirLight.shadow.camera.right = 50;
        this.dirLight.shadow.camera.top = 50;
        this.dirLight.shadow.camera.bottom = -50;

        this.scene.add(this.dirLight);

        // Point light for atmosphere (optional, kept for magical feel)
        this.pointLight = new THREE.PointLight(0xa855f7, 0.5, 50);
        this.pointLight.position.set(0, 10, 0);
        this.scene.add(this.pointLight);
    }

    updateEnvironment(isNight) {
        if (isNight) {
            // Night Mode
            this.scene.background = new THREE.Color(0x0a0a10); // Very dark blue/black
            this.scene.fog.color.set(0x0a0a10);

            this.ambientLight.color.set(0x5555aa); // Cool blue ambient
            this.ambientLight.intensity = 0.4;

            this.dirLight.color.set(0xaaccff); // Moon-ish
            this.dirLight.intensity = 0.4;
            this.dirLight.position.set(-20, 50, -20); // Move "moon" to other side?

            if (this.pointLight) this.pointLight.intensity = 0.8; // Magical light pops more
        } else {
            // Day Mode
            this.scene.background = new THREE.Color(0x202025); // Original dark or lighter sky
            // Let's make day a bit brighter sky ?
            this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
            this.scene.fog.color.set(0x87ceeb);

            this.ambientLight.color.set(0xffffff);
            this.ambientLight.intensity = 0.6;

            this.dirLight.color.set(0xffffff);
            this.dirLight.intensity = 0.8;
            this.dirLight.position.set(20, 50, 20);

            if (this.pointLight) this.pointLight.intensity = 0.3;
        }
    }

    initAtmosphere() {
        // Simple clouds
        const cloudGroup = new THREE.Group();
        const cloudGeo = new THREE.DodecahedronGeometry(1.0, 0); // Low poly blobs
        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            flatShading: true
        });

        for (let i = 0; i < 15; i++) {
            const cloud = new THREE.Mesh(cloudGeo, cloudMat);
            // Random position above board
            const x = (Math.random() - 0.5) * 60;
            const z = (Math.random() - 0.5) * 60;
            const y = 8 + Math.random() * 5;

            cloud.position.set(x, y, z);

            const scale = 1 + Math.random() * 2;
            cloud.scale.set(scale, scale * 0.6, scale);

            cloud.castShadow = true; // Clouds cast shadows!

            cloudGroup.add(cloud);
        }

        // Slightly animate clouds in update loop if we want, but static is fine for now
        this.scene.add(cloudGroup);
        this.clouds = cloudGroup;
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; // Smooth motion
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;

        // Limits
        this.controls.minDistance = 10;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI / 2.2; // Limit so we don't look from below

        // Initial target (center of board roughly)
        // Assuming hex(0,0) is at 0,0,0
        this.controls.target.set(0, 0, 0);
    }

    onWindowResize() {
        if (!this.container) return;
        // Use window dimensions as fallback if container has no size yet
        this.width = this.container.clientWidth || window.innerWidth;
        this.height = this.container.clientHeight || window.innerHeight;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
    }

    start() {
        if (!this.requestAnimationFrameId) {
            this.animate();
        }
    }

    stop() {
        if (this.requestAnimationFrameId) {
            cancelAnimationFrame(this.requestAnimationFrameId);
            this.requestAnimationFrameId = null;
        }
    }

    animate() {
        this.requestAnimationFrameId = requestAnimationFrame(this.animate);

        const time = performance.now() * 0.001;
        if (this.onUpdate) {
            this.onUpdate(time);
        }

        if (this.controls) this.controls.update();

        this.renderer.render(this.scene, this.camera);
    }

    initSelector() {
        // Create a hexagonal selector cursor
        const geometry = new THREE.CylinderGeometry(1.6, 1.6, 0.5, 6, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.selector = new THREE.Mesh(geometry, material);
        this.selector.visible = false;
        this.selector.rotation.y = Math.PI / 6; // To align flat sides optionally, or point
        // Cylinder is upright. Hexes are flat.
        // If hexes are cylinders, this is fine.

        // Add a wireframe outline
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
        this.selector.add(line);

        this.scene.add(this.selector);
    }

    setSelectorPosition(position) {
        if (!this.selector) this.initSelector();
        this.selector.position.copy(position);
        this.selector.position.y += 0.5; // Slightly above terrain
        this.selector.visible = true;
    }

    hideSelector() {
        if (this.selector) this.selector.visible = false;
    }

    getIntersection(ndcX, ndcY) {
        if (!this.raycaster || !this.camera) return null;

        // Set raycaster from camera
        this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);

        // Intersect with world group (recursive for props)
        const intersects = this.raycaster.intersectObjects(this.worldGroup.children, true);

        if (intersects.length > 0) {
            // Find first object that has user data (might hit a prop on top of a hex)
            // Or just return the top-most hit and let calling code handle bubbling?
            // Better: find closest object with meaningful userData.
            for (const hit of intersects) {
                // Check if hit object or its parents have userData
                let obj = hit.object;
                while (obj) {
                    if (obj.userData && (obj.userData.type === 'hex' || obj.userData.type === 'unit')) {
                        return obj;
                    }
                    if (obj === this.worldGroup) break;
                    obj = obj.parent;
                }
            }
        }
        return null;
    }

    // Helper to add meshes
    add(mesh) {
        this.worldGroup.add(mesh);
    }

    // Clear world
    clear() {
        // Clear meshes from worldGroup properly to avoid memory leaks
        while (this.worldGroup.children.length > 0) {
            const object = this.worldGroup.children[0];
            this.worldGroup.remove(object);

            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }
    }
}
