import * as THREE from 'three';

export class Tank {
    constructor(scene, initialPosition, color = 0x00ff00) {
        this.scene = scene;
        this.mesh = new THREE.Group(); // Group for body and turret

        // Tank Body
        const bodyGeometry = new THREE.BoxGeometry(2, 1, 3); // width, height, depth
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: color, metalness: 0.5, roughness: 0.6 });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 0.5; // Lift body so bottom is at y=0
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        this.mesh.add(this.body);

        // Tank Turret
        const turretGeometry = new THREE.BoxGeometry(1, 0.5, 1.5); // width, height, depth
        const turretMaterial = new THREE.MeshStandardMaterial({ color: color, metalness: 0.6, roughness: 0.5 });
        this.turret = new THREE.Mesh(turretGeometry, turretMaterial);
        this.turret.position.y = 1.25; // Position turret on top of body
        this.turret.castShadow = true;
        this.turret.receiveShadow = true;
        this.mesh.add(this.turret);

        // Tank Cannon (relative to turret)
        const cannonGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2, 16); // radiusTop, radiusBottom, height, radialSegments
        const cannonMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.4 });
        this.cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
        this.cannon.rotation.x = Math.PI / 2; // Rotate to point forward
        this.cannon.position.z = 1.5; // Position cannon at the front of the turret
        // Add cannon directly to turret so it rotates with it
        this.turret.add(this.cannon); 
        
        // Store the initial spawn point
        this.spawnPoint = initialPosition.clone();

        // Position the tank mesh group
        this.mesh.position.copy(initialPosition);
        this.scene.add(this.mesh);

        // Tank properties
        this.health = 100;
        this.isDestroyed = false;

        // Bounding box for collision detection
        this.boundingBox = new THREE.Box3().setFromObject(this.body); // Use body for collision
    }

    // Method to get the position of the cannon's tip in world coordinates
    getCannonTipPosition() {
        const tipLocalPosition = new THREE.Vector3(0, 0, 1); // Tip is at the end of the cannon barrel (length 2 / 2 = 1)
        return this.cannon.localToWorld(tipLocalPosition.clone());
    }
    
    // Method to get the direction the cannon is pointing in world coordinates
    getCannonDirection() {
        const direction = new THREE.Vector3(0, 0, 1); // Forward direction in local space
        this.cannon.getWorldDirection(direction);
        return direction;
    }

    // Method to update the bounding box based on the mesh's current position and rotation
    updateBoundingBox() {
        // It's often sufficient to update based on the body, assuming it's the largest part
        // For more accuracy, could encompass the whole mesh group
        this.boundingBox.setFromObject(this.body); 
    }

    // Basic take damage method
    takeDamage(amount) {
        if (this.isDestroyed) return;
        this.health -= amount;
        console.log(`Tank took ${amount} damage, health: ${this.health}`);
        if (this.health <= 0) {
            this.health = 0;
            this.destroy();
        }
    }

    // Basic destroy method (can be overridden)
    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        console.log("Tank destroyed!");
        // Basic removal, subclasses might add wreck creation etc.
        // this.scene.remove(this.mesh); 
        this.mesh.visible = false; // Hide instead of removing immediately for effects
    }

    // Placeholder for update method to be implemented by subclasses
    update(deltaTime, obstacles, playerTank) {
        // Update bounding box for collision checks
        this.updateBoundingBox(); 
    }
    
    // Respawn method
    respawn() {
        if (!this.isDestroyed) return; // Only respawn if destroyed
        
        this.mesh.position.copy(this.spawnPoint);
        this.mesh.rotation.set(0, 0, 0); // Reset rotation
        this.turret.rotation.set(0, 0, 0); // Reset turret rotation
        this.health = 100;
        this.isDestroyed = false;
        this.mesh.visible = true; // Make visible again
        console.log("Tank respawned at", this.spawnPoint);
    }
}
