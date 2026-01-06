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
        mesh.userData = { type: 'hex', q: hex.q, r: hex.r };

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
        switch (terrain) {
            case 'mountains':
                this.addMountainProp(parentMesh);
                break;
            case 'forest':
                this.addForestProp(parentMesh);
                break;
            case 'hills':
                this.addHillProp(parentMesh);
                break;
        }
    }

    addMountainProp(parentMesh) {
        const group = new THREE.Group();
        const material = new THREE.MeshStandardMaterial({
            color: 0x6b7280, // Gray-500
            roughness: 0.9,
            flatShading: true
        });

        // Main peak
        const mainPeak = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.2, 4), material);
        mainPeak.position.set(0, 1.1, 0);
        group.add(mainPeak);

        // Side peaks
        const sidePeak1 = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.5, 4), material);
        sidePeak1.position.set(0.6, 0.75, 0.4);
        sidePeak1.rotation.y = Math.PI / 4;
        group.add(sidePeak1);

        const sidePeak2 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 4), material);
        sidePeak2.position.set(-0.5, 0.6, -0.5);
        sidePeak2.rotation.y = -Math.PI / 6;
        group.add(sidePeak2);

        parentMesh.add(group);
    }

    addForestProp(parentMesh) {
        const group = new THREE.Group();

        // Define tree parts
        const trunkGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4527a0 }); // Dark purple-ish brown
        const foliageGeo = new THREE.ConeGeometry(0.4, 1.0, 6);
        const foliageMat = new THREE.MeshStandardMaterial({
            color: 0x166534, // Green-800
            flatShading: true
        });

        const createTree = (x, z, scale = 1) => {
            const tree = new THREE.Group();

            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 0.2;
            tree.add(trunk);

            const foliage = new THREE.Mesh(foliageGeo, foliageMat);
            foliage.position.y = 0.8;
            tree.add(foliage);

            tree.position.set(x, 0, z);
            tree.scale.set(scale, scale, scale);
            group.add(tree);
        };

        // Cluster of trees
        createTree(0, 0, 1.2);
        createTree(0.6, 0.5, 0.9);
        createTree(-0.5, 0.4, 0.85);
        createTree(0.3, -0.6, 1.1);
        createTree(-0.4, -0.5, 0.7);

        parentMesh.add(group);
    }

    addHillProp(parentMesh) {
        const geo = new THREE.SphereGeometry(0.8, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xd97706, // Amber-600
            flatShading: true
        });

        const createHill = (x, z, scale) => {
            const hill = new THREE.Mesh(geo, mat);
            hill.position.set(x, 0.1, z);
            hill.scale.set(scale, scale * 0.5, scale);
            parentMesh.add(hill);
        };

        createHill(0.4, 0.3, 1.0);
        createHill(-0.3, -0.4, 0.8);
    }

    updateSiteMarkers(parentMesh, site) {
        // Clear old marker if any (though currently called during creation)
        const markerGroup = new THREE.Group();
        markerGroup.name = 'site-marker';

        // Floating Diamond for Sites
        const geo = new THREE.OctahedronGeometry(0.6);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xef4444, // Red-500
            emissive: 0x991b1b,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        });

        const marker = new THREE.Mesh(geo, mat);
        marker.position.set(0, 2.5, 0);

        // Add subtle animation loop logic via Game3D later, but for now just static
        markerGroup.add(marker);

        // If it's a specific type, could add more detail
        parentMesh.add(markerGroup);
    }

    addSiteMarker(parentMesh, site) {
        this.updateSiteMarkers(parentMesh, site);
    }
}
