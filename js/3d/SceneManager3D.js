import * as THREE from 'three';

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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional Light (Sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(20, 50, 20);
        dirLight.castShadow = true;

        // Shadow properties
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;

        this.scene.add(dirLight);

        // Point light for atmosphere
        const pointLight = new THREE.PointLight(0xa855f7, 0.5, 50);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);
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

        // Rotate atmosphere light slightly
        // const time = Date.now() * 0.001;
        // Optional animations here

        this.renderer.render(this.scene, this.camera);
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
