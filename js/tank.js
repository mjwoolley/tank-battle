import * as THREE from 'three';
import { Projectile } from './projectile.js';

export class Tank {
    constructor(scene, color) {
        this.scene = scene;
        this.speed = 0.5;
        this.rotationSpeed = 0.03;
        this.projectiles = [];
        this.lastShotTime = 0;
        this.shootingCooldown = 1000;

        // Create tank body with beveled edges
        const bodyGeometry = new THREE.BoxGeometry(3, 1.5, 4);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: color,
            metalness: 0.7,
            roughness: 0.3
        });
        this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Create tank turret with more detail
        const turretGeometry = new THREE.CylinderGeometry(1.2, 1.4, 1.2, 8);
        const turretMaterial = new THREE.MeshStandardMaterial({ 
            color: color,
            metalness: 0.8,
            roughness: 0.2
        });
        this.turret = new THREE.Mesh(turretGeometry, turretMaterial);
        this.turret.position.y = 1.2;
        this.turret.castShadow = true;
        this.mesh.add(this.turret);

        // Create detailed barrel
        const barrelGroup = new THREE.Group();
        
        // Main barrel
        const mainBarrelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 3, 8);
        const barrelMaterial = new THREE.MeshStandardMaterial({ 
            color: color,
            metalness: 0.9,
            roughness: 0.1
        });
        this.barrel = new THREE.Mesh(mainBarrelGeometry, barrelMaterial);
        this.barrel.rotation.x = Math.PI / 2;
        this.barrel.position.z = -1.5;
        barrelGroup.add(this.barrel);

        // Add barrel to turret
        barrelGroup.position.z = -1;
        this.turret.add(barrelGroup);

        // Add to scene
        scene.add(this.mesh);
    }

    moveForward() {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.mesh.quaternion);
        forward.multiplyScalar(this.speed);
        this.mesh.position.add(forward);
    }

    moveBackward() {
        const backward = new THREE.Vector3(0, 0, 1);
        backward.applyQuaternion(this.mesh.quaternion);
        backward.multiplyScalar(this.speed);
        this.mesh.position.add(backward);
    }

    rotateLeft() {
        this.mesh.rotation.y += this.rotationSpeed;
    }

    rotateRight() {
        this.mesh.rotation.y -= this.rotationSpeed;
    }

    fire() {
        const now = Date.now();
        if (now - this.lastShotTime < this.shootingCooldown) {
            return;
        }
        this.lastShotTime = now;

        // Create projectile from barrel position
        const projectilePosition = new THREE.Vector3();
        this.barrel.getWorldPosition(projectilePosition);

        // Use turret's world quaternion for direction
        const projectileRotation = new THREE.Quaternion();
        this.turret.getWorldQuaternion(projectileRotation);

        const projectile = new Projectile(this.scene, projectilePosition, projectileRotation);
        this.projectiles.push(projectile);
    }

    update() {
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update();

            // Remove projectiles that have exceeded their lifetime
            if (projectile.lifetime <= 0) {
                projectile.destroy();
                this.projectiles.splice(i, 1);
            }
        }
    }

    destroy() {
        // Clean up projectiles
        for (const projectile of this.projectiles) {
            projectile.destroy();
        }
        this.projectiles = [];

        // Remove from scene
        this.scene.remove(this.mesh);
    }
}

export class HumanTank extends Tank {
    constructor(scene, color) {
        super(scene, color);
        this.camera = null;
        this.setupCamera();
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 0);
        this.camera.rotation.y = Math.PI;
        this.turret.add(this.camera);
    }

    getCamera() {
        return this.camera;
    }
}

export class AITank extends Tank {
    constructor(scene, color, walls) {
        super(scene, color);
        this.walls = walls;
        this.state = 'PATROLLING';
        this.lastKnownPosition = null;
        this.reachedLastKnownPosition = false;
        this.patrolPoint = null;
        
        // AI configuration
        this.minEngageDistance = 30;
        this.maxEngageDistance = 60;
        this.targetAngleThreshold = 0.05;
        this.wallAvoidanceDistance = 10;
        this.patrolRadius = 40;

        // Fix turret orientation
        this.turret.rotation.y = Math.PI;
    }

    update(player) {
        // Check line of sight to player
        const hasLineOfSight = this.checkLineOfSight(player);

        // Update state based on conditions
        if (hasLineOfSight) {
            this.lastKnownPosition = player.mesh.position.clone();
            this.reachedLastKnownPosition = false;
            this.state = 'ENGAGING';
        } else if (this.lastKnownPosition && !this.reachedLastKnownPosition) {
            this.state = 'PURSUING';
        } else {
            this.state = 'PATROLLING';
        }

        // Handle behavior based on current state
        switch (this.state) {
            case 'PATROLLING':
                if (!this.patrolPoint || this.hasReachedPoint(this.patrolPoint)) {
                    this.generateNewPatrolPoint();
                }
                this.moveToPoint(this.patrolPoint);
                break;

            case 'PURSUING':
                if (this.hasReachedPoint(this.lastKnownPosition)) {
                    this.reachedLastKnownPosition = true;
                    this.state = 'PATROLLING';
                    this.generateNewPatrolPoint();
                } else {
                    this.moveToPoint(this.lastKnownPosition);
                }
                break;

            case 'ENGAGING':
                this.engageTarget(player);
                break;
        }

        // Update base tank functionality
        super.update();
    }

    checkLineOfSight(player) {
        const start = this.mesh.position.clone();
        const end = player.mesh.position.clone();
        const direction = end.clone().sub(start).normalize();

        const raycaster = new THREE.Raycaster(start, direction);
        const distance = start.distanceTo(end);

        for (const wall of this.walls) {
            const intersects = raycaster.intersectObject(wall.mesh);
            if (intersects.length > 0 && intersects[0].distance < distance) {
                return false;
            }
        }

        return true;
    }

    engageTarget(player) {
        const targetPos = player.mesh.position;
        const direction = targetPos.clone().sub(this.mesh.position);
        direction.y = 0;
        const distance = direction.length();

        // Calculate target angle
        const targetAngle = Math.atan2(direction.x, direction.z);
        const currentAngle = this.mesh.rotation.y;
        
        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // First rotate to face target
        if (Math.abs(angleDiff) > this.targetAngleThreshold) {
            if (angleDiff > 0) {
                this.rotateLeft();
            } else {
                this.rotateRight();
            }
            return;
        }

        // Maintain optimal engagement distance
        if (distance < this.minEngageDistance) {
            if (Math.abs(angleDiff) < Math.PI / 2) { // Only back up if facing target
                this.moveBackward();
            }
        } else if (distance > this.maxEngageDistance) {
            if (this.canMoveForward()) {
                this.moveForward();
            }
        }

        // Fire when aligned and in range
        if (Math.abs(angleDiff) < this.targetAngleThreshold && 
            distance < this.maxEngageDistance) {
            this.fire();
        }
    }

    generateNewPatrolPoint() {
        // Generate patrol points at the corners and midpoints of the field
        const patrolPoints = [
            new THREE.Vector3(-35, 1, -35),  // Northwest
            new THREE.Vector3(0, 1, -35),    // North
            new THREE.Vector3(35, 1, -35),   // Northeast
            new THREE.Vector3(35, 1, 0),     // East
            new THREE.Vector3(35, 1, 35),    // Southeast
            new THREE.Vector3(0, 1, 35),     // South
            new THREE.Vector3(-35, 1, 35),   // Southwest
            new THREE.Vector3(-35, 1, 0)     // West
        ];

        // Choose a random patrol point that's different from the current one
        let newPoint;
        do {
            newPoint = patrolPoints[Math.floor(Math.random() * patrolPoints.length)];
        } while (this.patrolPoint && newPoint.distanceTo(this.patrolPoint) < 1);

        this.patrolPoint = newPoint;
    }

    hasReachedPoint(point) {
        const distance = this.mesh.position.distanceTo(point);
        return distance < 2;
    }

    canMoveForward() {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.mesh.quaternion);
        forward.multiplyScalar(this.wallAvoidanceDistance);
        
        const nextPos = this.mesh.position.clone().add(forward);
        const tankBox = new THREE.Box3();
        const tankSize = new THREE.Vector3(3, 1.5, 4);
        tankBox.setFromCenterAndSize(nextPos, tankSize);

        for (const wall of this.walls) {
            const wallBox = new THREE.Box3().setFromObject(wall.mesh);
            if (tankBox.intersectsBox(wallBox)) {
                return false;
            }
        }

        return true;
    }

    moveToPoint(target) {
        const direction = target.clone().sub(this.mesh.position);
        direction.y = 0;
        const distance = direction.length();

        if (distance > 1) {
            // Calculate target angle
            const targetAngle = Math.atan2(direction.x, direction.z);
            const currentAngle = this.mesh.rotation.y;
            
            // Calculate angle difference
            let angleDiff = targetAngle - currentAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            // First rotate to face target
            if (Math.abs(angleDiff) > this.targetAngleThreshold) {
                if (angleDiff > 0) {
                    this.rotateLeft();
                } else {
                    this.rotateRight();
                }
            } else {
                // Only move forward when properly aligned
                if (this.canMoveForward()) {
                    this.moveForward();
                }
            }
            return false;
        }

        return true;
    }

    findClearPath() {
        const numDirections = 16;
        let bestDirection = null;
        let maxClearance = 0;

        for (let i = 0; i < numDirections; i++) {
            const angle = (i / numDirections) * Math.PI * 2;
            const direction = new THREE.Vector3(
                Math.sin(angle),
                0,
                Math.cos(angle)
            );

            const testPosition = this.mesh.position.clone();
            direction.multiplyScalar(this.wallAvoidanceDistance);
            testPosition.add(direction);

            const tankGeometry = new THREE.Box3();
            const tankSize = new THREE.Vector3(3, 1.5, 4);
            tankGeometry.setFromCenterAndSize(testPosition, tankSize);

            let clearPath = true;
            let minDistance = Infinity;

            for (const wall of this.walls) {
                const wallBox = new THREE.Box3().setFromObject(wall.mesh);
                if (tankGeometry.intersectsBox(wallBox)) {
                    clearPath = false;
                    break;
                }

                const distance = testPosition.distanceTo(wallBox.getCenter(new THREE.Vector3()));
                minDistance = Math.min(minDistance, distance);
            }

            if (clearPath && minDistance > maxClearance) {
                maxClearance = minDistance;
                bestDirection = angle;
            }
        }

        return bestDirection;
    }
}
