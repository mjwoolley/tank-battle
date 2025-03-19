import * as THREE from 'three';

export class Projectile {
    constructor(scene, position, rotation, fromPlayer) {
        this.scene = scene;
        this.speed = 1;
        this.fromPlayer = fromPlayer;
        this.lifetime = 3000; // 3 seconds
        this.spawnTime = Date.now();

        // Create projectile mesh
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: fromPlayer ? 0xff0000 : 0xff8800,
            emissive: fromPlayer ? 0x600000 : 0x803300,
            metalness: 0.7,
            roughness: 0.3
        });
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Set initial position and direction
        this.mesh.position.copy(position);
        this.direction = new THREE.Vector3(0, 0, -1);
        this.direction.applyQuaternion(rotation);
        this.direction.y = 0; // Keep projectile flying horizontally
        this.direction.normalize();

        scene.add(this.mesh);
    }

    update() {
        // Move projectile
        this.mesh.position.add(this.direction.multiplyScalar(this.speed));
        
        // Check lifetime
        if (Date.now() - this.spawnTime > this.lifetime) {
            this.destroy();
            return true;
        }
        return false;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}
