import * as THREE from 'three';

export class Projectile {
    constructor(scene, startPosition, direction, initialVelocity, gravity, world, owner) {
        this.scene = scene;
        this.world = world; // For collision checks
        this.owner = owner; // The tank that fired this projectile

        const geometry = new THREE.SphereGeometry(0.2, 8, 8); // Small sphere for projectile
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(startPosition);
        this.scene.add(this.mesh);

        // Physics properties
        this.velocity = direction.clone().multiplyScalar(initialVelocity);
        this.gravity = gravity;
        this.lifeTime = 5; // Max seconds projectile exists
        this.timeElapsed = 0;

        // Collision properties
        this.previousPosition = startPosition.clone();
        this.hasHit = false; // Flag to prevent multiple hits
    }

    update(deltaTime) {
        if (this.hasHit) return; // Don't update if already hit something

        this.timeElapsed += deltaTime;
        if (this.timeElapsed > this.lifeTime) {
            this.destroy();
            return;
        }

        // Store previous position for collision raycasting
        this.previousPosition.copy(this.mesh.position);

        // Apply gravity
        this.velocity.y -= this.gravity * deltaTime;

        // Update position based on velocity
        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Collision detection (simple raycast from previous to current position)
        const direction = new THREE.Vector3().subVectors(this.mesh.position, this.previousPosition);
        const distance = direction.length();
        direction.normalize();

        if (distance > 0.01) { // Only cast if moved significantly
            const raycaster = new THREE.Raycaster(this.previousPosition, direction, 0, distance);
            const collidables = this.world.getCollidableObjects(this.owner); // Get objects excluding the owner
            
            const intersects = raycaster.intersectObjects(collidables, true); // Check recursively

            if (intersects.length > 0) {
                const hitPoint = intersects[0].point;
                const hitObject = intersects[0].object;
                this.handleHit(hitPoint, hitObject);
                return; // Stop processing after hit
            }
        }
         // Check if projectile hit the ground (terrain is at y=0)
        if (this.mesh.position.y <= 0.2) { // Check slightly above 0 for the sphere radius
            this.handleHit(this.mesh.position.clone(), this.world.getTerrain()); // Pass terrain as hit object
            return;
        }
    }

    handleHit(hitPoint, hitObject) {
        if (this.hasHit) return;
        this.hasHit = true;
        
        console.log("Projectile hit object:", hitObject.name, " at ", hitPoint);
        
        // Trigger explosion effect via the world or an effects manager
        this.world.createExplosion(hitPoint);

        // Check if the hit object is part of a tank
        let hitTank = this.world.findTankByMesh(hitObject);
        if (hitTank) {
            hitTank.takeDamage(25); // Apply damage
        }

        this.destroy(); // Remove projectile after hit
    }

    destroy() {
        this.scene.remove(this.mesh);
        // Notify the world or game manager that this projectile is gone
        this.world.removeProjectile(this);
    }
}
