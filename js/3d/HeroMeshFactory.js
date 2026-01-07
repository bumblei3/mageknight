import * as THREE from 'three';

export class HeroMeshFactory {
    constructor() {
        this.materials = new Map();
    }

    createHeroMesh(heroId) {
        const group = new THREE.Group();
        group.name = `hero-${heroId}`;

        // Base "Minifigure" dimensions
        // Scale: roughly 1.5 units tall

        let bodyColor = 0xcccccc;
        let headColor = 0xffdbac; // Skin tone default
        let isGoldyx = false;

        if (heroId === 'goldyx' || heroId?.id === 'goldyx') {
            bodyColor = 0xd4af37; // Gold
            headColor = 0x22c55e; // Green scales
            isGoldyx = true;
        } else if (heroId === 'tovak') {
            bodyColor = 0x1e3a8a; // Blue armor
            headColor = 0xffdbac;
        }

        // --- BODY ---
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.3,
            metalness: 0.6
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.4;
        body.castShadow = true;
        group.add(body);

        // --- HEAD ---
        const headGeo = new THREE.SphereGeometry(0.25, 12, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: headColor });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.95;
        head.castShadow = true;
        group.add(head);

        // --- GOLDYX SPECIFICS ---
        if (isGoldyx) {
            // Wings
            const wingGeo = new THREE.BoxGeometry(0.8, 0.4, 0.1);
            const wingMat = new THREE.MeshStandardMaterial({ color: 0x166534 }); // Dark Green

            const leftWing = new THREE.Mesh(wingGeo, wingMat);
            leftWing.position.set(0.4, 0.6, -0.2);
            leftWing.rotation.y = -Math.PI / 6;
            group.add(leftWing);

            const rightWing = new THREE.Mesh(wingGeo, wingMat);
            rightWing.position.set(-0.4, 0.6, -0.2);
            rightWing.rotation.y = Math.PI / 6;
            group.add(rightWing);

            // Horns (Small cones)
            const hornGeo = new THREE.ConeGeometry(0.05, 0.2, 4);
            const hornMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

            const lHorn = new THREE.Mesh(hornGeo, hornMat);
            lHorn.position.set(0.1, 1.15, 0);
            lHorn.rotation.z = -Math.PI / 4;
            group.add(lHorn);

            const rHorn = new THREE.Mesh(hornGeo, hornMat);
            rHorn.position.set(-0.1, 1.15, 0);
            rHorn.rotation.z = Math.PI / 4;
            group.add(rHorn);
        } else {
            // Generic Cape for others
            const capeGeo = new THREE.BoxGeometry(0.6, 0.8, 0.1);
            const capeMat = new THREE.MeshStandardMaterial({ color: 0x991b1b }); // Red cape
            const cape = new THREE.Mesh(capeGeo, capeMat);
            cape.position.set(0, 0.5, -0.25);
            cape.rotation.x = 0.1;
            group.add(cape);
        }

        // --- AURA LIGHT ---
        const aura = new THREE.PointLight(bodyColor, 0.8, 4);
        aura.position.set(0, 1, 0);
        group.add(aura);

        return group;
    }
}
