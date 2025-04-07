import * as THREE from 'three';
import { Tank } from './Tank.js';

export class PlayerTank extends Tank {
    constructor(scene, initialPosition, inputState) {
        super(scene, initialPosition, 0x00ff00); // Green color for player
        this.inputState = inputState; // Reference to the input state object

        // Movement parameters
        this.moveSpeed = 5; // Units per second
        this.rotationSpeed = Math.PI / 2; // Radians per second (90 degrees)
        this.turretRotationSpeed = Math.PI / 1.5; // Radians per second (120 degrees)
    }

    // Override the update method to handle player input
    update(deltaTime, world) { // Pass world object for collision checks
        super.update(deltaTime); // Call base class update (e.g., for bounding box)

        const moveDistance = this.moveSpeed * deltaTime;
        const bodyRotationAngle = this.rotationSpeed * deltaTime;
        const turretRotationAngle = this.turretRotationSpeed * deltaTime;

        let intendedMove = new THREE.Vector3();
        let intendedRotation = 0;

        // Handle tank body rotation
        if (this.inputState.left) {
            intendedRotation = bodyRotationAngle;
        }
        if (this.inputState.right) {
            intendedRotation = -bodyRotationAngle;
        }
        // Apply body rotation
        if (intendedRotation !== 0) {
            this.mesh.rotateY(intendedRotation);
            // Important: Update bounding box *after* rotation for accurate check
            this.updateBoundingBox(); 
        }
        
        // Handle tank movement
        if (this.inputState.forward) {
            // Calculate forward vector based on current rotation
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(this.mesh.quaternion);
            intendedMove.add(forward.multiplyScalar(moveDistance));
        }
        if (this.inputState.backward) {
            const backward = new THREE.Vector3(0, 0, 1);
            backward.applyQuaternion(this.mesh.quaternion);
            intendedMove.add(backward.multiplyScalar(moveDistance));
        }

        // Check for collisions before applying movement
        if (intendedMove.lengthSq() > 0) {
             // Calculate the potential next position
            const nextPosition = this.mesh.position.clone().add(intendedMove);
            
             // Check collision at the potential next position using the world's method
            if (!world.checkCollision(this.boundingBox, nextPosition, this)) {
                this.mesh.position.add(intendedMove);
                // Update bounding box after successful move
                this.updateBoundingBox();
            } // else: collision detected, don't move
        }

        // Handle turret rotation
        if (this.inputState.turretLeft) {
            this.turret.rotateY(turretRotationAngle);
        }
        if (this.inputState.turretRight) {
            this.turret.rotateY(-turretRotationAngle);
        }

        // Note: Firing logic will be handled elsewhere, 
        // but triggered based on this.inputState.fire
    }
}
