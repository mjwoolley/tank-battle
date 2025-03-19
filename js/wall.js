import * as THREE from 'three';

export class Wall {
    constructor(scene, position, size) {
        // Create wall geometry and material
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const material = new THREE.MeshStandardMaterial({
            color: 0x95a5a6, // Gray color
            metalness: 0.2,
            roughness: 0.8
        });

        // Create mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Add to scene
        scene.add(this.mesh);
    }

    // Get wall bounds for collision detection
    getBounds() {
        return new THREE.Box3().setFromObject(this.mesh);
    }

    // Check if a point intersects with this wall
    containsPoint(point) {
        return this.getBounds().containsPoint(point);
    }
}
