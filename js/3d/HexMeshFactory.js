import * as THREE from 'three';

export class HexMeshFactory {
    constructor() {
        // Hexagon dimensions
        this.radius = 2.0;
        this.height = 0.5;
        this.geometry = this.createHexGeometry(this.radius, this.height);

        // Materials cache
        this.materials = new Map();
    }

    createHexGeometry(radius, height) {
        const shape = new THREE.Shape();
        const sides = 6;

        for (let i = 0; i < sides; i++) {
            const angle = (i * Math.PI * 2) / sides;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }

        const extrudeSettings = {
            steps: 1,
            depth: height,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.1,
            bevelSegments: 2
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        // Rotate to lay flat on XZ plane
        geometry.rotateX(-Math.PI / 2);
        return geometry;
    }

    getMaterial(terrainType) {
        if (!this.materials.has(terrainType)) {
            // Define colors/textures based on terrain
            let color = 0x888888;
            switch (terrainType) {
            case 'plains': color = 0x4ade80; break;     // Green
            case 'forest': color = 0x166534; break;     // Dark Green
            case 'hills': color = 0xd97706; break;      // Orange-ish Brown
            case 'mountains': color = 0x57534e; break;  // Grey
            case 'water': color = 0x3b82f6; break;      // Blue
            case 'wasteland': color = 0x7f1d1d; break;  // Dark Red
            case 'desert': color = 0xfde047; break;     // Yellow
            }

            const material = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.8,
                metalness: 0.1,
                flatShading: true
            });
            this.materials.set(terrainType, material);
        }
        return this.materials.get(terrainType);
    }

    createHexMesh(hex) {
        const material = this.getMaterial(hex.terrain);
        const mesh = new THREE.Mesh(this.geometry, material);

        // Receive shadows
        mesh.receiveShadow = true;
        mesh.castShadow = true;

        // Position based on axial coordinates
        // For flat-topped hexes (standard in Mage Knight typically? Or pointy? Checking 2D...)
        // Assuming typical hex to pixel conversion:
        // x = size * 3/2 * q
        // z = size * sqrt(3) * (r + q/2)

        // 2D logic usually:
        // x = this.hexSize * (3/2 * hex.q);
        // y = this.hexSize * Math.sqrt(3) * (hex.r + hex.q / 2);

        const size = this.radius * 1.05; // Spacing
        const x = size * 1.5 * hex.q;
        const z = size * Math.sqrt(3) * (hex.r + hex.q / 2);

        mesh.position.set(x, 0, z);

        // Add terrain props (trees, mountains) - Future Polish
        this.addProps(mesh, hex.terrain);

        // Add Site/Enemy placeholder
        if (hex.site) {
            this.addSiteMarker(mesh, hex.site);
        }

        return mesh;
    }

    addProps(parentMesh, terrain) {
        // Simple visual differentiation using primitives for now
        if (terrain === 'mountains') {
            const coneGeo = new THREE.ConeGeometry(0.8, 2, 4);
            const coneMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.set(0, 1, 0);
            parentMesh.add(cone);
        } else if (terrain === 'forest') {
            const boxGeo = new THREE.BoxGeometry(0.5, 1.5, 0.5);
            const boxMat = new THREE.MeshStandardMaterial({ color: 0x0f3f20 });
            const tree = new THREE.Mesh(boxGeo, boxMat);
            tree.position.set(0, 0.75, 0);
            parentMesh.add(tree);
        }
    }

    addSiteMarker(parentMesh, _site) {
        // Red sphere for enemies/sites
        const geo = new THREE.SphereGeometry(0.5);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x440000 });
        const marker = new THREE.Mesh(geo, mat);
        marker.position.set(0, 1.5, 0);
        parentMesh.add(marker);
    }
}
