import * as THREE from 'three';
import { Tank } from './Tank.js';

export class EnemyTank extends Tank {
    constructor(scene, initialPosition, world, fireCallback) {
        super(scene, initialPosition, 0xff0000); // Red color for enemy
        this.world = world; // Reference to the world object
        this.fireCallback = fireCallback; // Function to call when firing

        // AI parameters
        this.moveSpeed = 3; // Slower than player
        this.rotationSpeed = Math.PI / 3; // Radians per second
        this.turretRotationSpeed = Math.PI / 2;
        this.detectionRange = 50;
        this.firingRange = 40;
        this.preferredDistance = 20; // Try to stay this far from the player
        this.fireCooldown = 3.0; // Seconds between shots
        this.timeSinceLastShot = Math.random() * this.fireCooldown; // Randomize initial cooldown

        // AI State
        this.state = 'PATROL'; // Initial state: PATROL, ENGAGE
        this.patrolTarget = null; // Target position for patrolling
        this.obstacleAvoidanceVector = new THREE.Vector3();
    }

    // Override the update method for AI logic
    update(deltaTime) {
        super.update(deltaTime); // Call base class update

        if (this.isDestroyed) return; // Do nothing if destroyed

        const playerTank = this.world.getPlayerTank();
        if (!playerTank || playerTank.isDestroyed) {
             // If player doesn't exist or is destroyed, go back to patrolling
            this.state = 'PATROL';
        } else {
            const distanceToPlayer = this.mesh.position.distanceTo(playerTank.mesh.position);

            // State transition
            if (distanceToPlayer <= this.detectionRange) {
                this.state = 'ENGAGE';
            } else {
                this.state = 'PATROL';
            }
        }

        // Execute behavior based on state
        if (this.state === 'ENGAGE' && playerTank && !playerTank.isDestroyed) {
            this.engagePlayer(deltaTime, playerTank);
        } else {
            this.patrol(deltaTime);
        }

        // Update fire cooldown
        this.timeSinceLastShot += deltaTime;
    }

    patrol(deltaTime) {
        // Simple patrol: if no target or reached target, pick a new random point
        if (!this.patrolTarget || this.mesh.position.distanceTo(this.patrolTarget) < 2) {
            this.patrolTarget = this.world.findRandomNavigablePoint(this.mesh.position, 15); // Find point within 15 units
             if (!this.patrolTarget) {
                // Fallback if no point found easily
                console.warn("Enemy tank couldn't find patrol point");
                this.patrolTarget = this.mesh.position.clone().add(new THREE.Vector3(Math.random() * 10 - 5, 0, Math.random() * 10 - 5));
             } 
        }

        if (this.patrolTarget) {
            this.moveTowards(this.patrolTarget, deltaTime, false); // Don't need precise stopping
        }
        // No turret rotation during patrol
    }

    engagePlayer(deltaTime, playerTank) {
        const directionToPlayer = new THREE.Vector3().subVectors(playerTank.mesh.position, this.mesh.position);
        const distanceToPlayer = directionToPlayer.length();
        directionToPlayer.normalize();

        // 1. Rotate Turret towards Player
        this.rotateTurretTowards(directionToPlayer, deltaTime);

        // 2. Move Tank Body
        let targetPosition;
        if (distanceToPlayer > this.preferredDistance + 5) {
            // Move closer
            targetPosition = playerTank.mesh.position;
        } else if (distanceToPlayer < this.preferredDistance - 5) {
            // Move away (target is opposite direction)
            targetPosition = this.mesh.position.clone().add(directionToPlayer.clone().negate().multiplyScalar(10));
        } else {
             // Maintain distance - maybe strafe or just hold position? For now, hold.
             targetPosition = null; 
        }

        if (targetPosition) {
            this.moveTowards(targetPosition, deltaTime, true);
        }

        // 3. Firing Logic
        if (this.canFire(directionToPlayer, distanceToPlayer)) {
            this.fireCallback(this); // Call the fire function passed in constructor
            this.timeSinceLastShot = 0; // Reset cooldown
        }
    }

    moveTowards(targetPosition, deltaTime, rotateBody) {
        const moveDirection = new THREE.Vector3().subVectors(targetPosition, this.mesh.position);
        const distance = moveDirection.length();
        moveDirection.normalize();

        // Obstacle Avoidance (Simple Raycasting)
        this.updateObstacleAvoidance(deltaTime);
        const finalMoveDirection = moveDirection.clone().add(this.obstacleAvoidanceVector).normalize();

        // Calculate intended move
        const moveDistance = Math.min(this.moveSpeed * deltaTime, distance); // Don't overshoot target
        const intendedMove = finalMoveDirection.multiplyScalar(moveDistance);

        // Rotate body towards move direction if needed
        if (rotateBody && finalMoveDirection.lengthSq() > 0.01) { // Avoid tiny rotations
             // Calculate target angle
            const targetAngle = Math.atan2(finalMoveDirection.x, finalMoveDirection.z);
            let angleDifference = targetAngle - this.mesh.rotation.y;

            // Normalize angle difference to [-PI, PI]
            while (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;
            while (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;

            // Clamp rotation speed
            const rotationAmount = Math.sign(angleDifference) * Math.min(Math.abs(angleDifference), this.rotationSpeed * deltaTime);
            this.mesh.rotateY(rotationAmount);
            this.updateBoundingBox(); // Update bounds after rotation
        }

        // Check collision before moving
        const nextPosition = this.mesh.position.clone().add(intendedMove);
        if (!this.world.checkCollision(this.boundingBox, nextPosition, this)) {
            this.mesh.position.add(intendedMove);
            this.updateBoundingBox(); // Update bounds after move
        }
    }
    
    // Simple obstacle avoidance using raycasting
    updateObstacleAvoidance(deltaTime) {
        const avoidanceStrength = 5.0;
        const rayLength = 3.0; // How far ahead to check
        this.obstacleAvoidanceVector.set(0, 0, 0);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        const raycaster = new THREE.Raycaster(this.mesh.position, forward, 0.5, rayLength);
        const intersects = raycaster.intersectObjects(this.world.getObstacles(), false); // Check against world obstacles

        if (intersects.length > 0) {
            const obstacleNormal = intersects[0].face.normal.clone(); // Get normal of the hit face
             // Project normal onto XZ plane (since we only rotate around Y)
            obstacleNormal.y = 0;
            obstacleNormal.normalize();
            
            // Add a force perpendicular to the obstacle normal to steer away
            // Determine if obstacle is left or right to choose steering direction
            const cross = new THREE.Vector3().crossVectors(forward, obstacleNormal);
            const steerDirection = cross.y > 0 ? new THREE.Vector3(forward.z, 0, -forward.x) : new THREE.Vector3(-forward.z, 0, forward.x);
            
            this.obstacleAvoidanceVector.add(steerDirection.multiplyScalar(avoidanceStrength * deltaTime));
        }
    }

    rotateTurretTowards(targetDirection, deltaTime) {
        // Project target direction onto the tank's XZ plane (relative to tank body rotation)
        const localTargetDirection = this.mesh.worldToLocal(this.mesh.position.clone().add(targetDirection)).normalize();
        
        // Calculate the angle needed for the turret (on the Y axis)
        const targetTurretAngle = Math.atan2(localTargetDirection.x, localTargetDirection.z);
        let angleDifference = targetTurretAngle - this.turret.rotation.y;

        // Normalize angle difference to [-PI, PI]
        while (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;
        while (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;

        // Clamp rotation speed
        const rotationAmount = Math.sign(angleDifference) * Math.min(Math.abs(angleDifference), this.turretRotationSpeed * deltaTime);
        this.turret.rotateY(rotationAmount);
    }

    canFire(directionToPlayer, distanceToPlayer) {
        if (this.isDestroyed || this.timeSinceLastShot < this.fireCooldown || distanceToPlayer > this.firingRange) {
            return false;
        }

        // Check if turret is aiming reasonably close to the player
        const turretForward = new THREE.Vector3(0, 0, 1);
        this.turret.getWorldDirection(turretForward);
        
        // Calculate angle between turret direction and direction to player
        const angleToPlayer = turretForward.angleTo(directionToPlayer);

        // Allow firing if aiming within a small threshold (e.g., 5 degrees)
        const aimingThreshold = THREE.MathUtils.degToRad(5);
        return angleToPlayer < aimingThreshold;
    }

     // Override destroy to potentially add wreck creation later
    destroy() {
        super.destroy(); // Call base destroy logic (sets flag, hides mesh)
        // Optionally: Trigger wreck creation via world object or event
         this.world.createTankWreck(this.mesh);
    }
}
