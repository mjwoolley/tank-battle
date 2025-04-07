import * as THREE from 'three';
import { Tank } from './Tank.js'; // May not be needed directly, but good for type hinting/checking
import { PlayerTank } from './PlayerTank.js';
import { EnemyTank } from './EnemyTank.js';
import { Projectile } from './Projectile.js';

// Constants
const TERRAIN_SIZE = 100;
const WALL_HEIGHT = 3;
const WALL_THICKNESS = 2;
const NUM_OBSTACLES = 15;
const OBSTACLE_MIN_SIZE = 2;
const OBSTACLE_MAX_SIZE = 6;
const NUM_ENEMY_TANKS = 5;
const PLAYER_SPAWN_BUFFER = 10; // Min distance from edge/obstacles
const ENEMY_SPAWN_BUFFER = 5;

export class World {
    constructor(scene, fireProjectileCallback) {
        this.scene = scene;
        this.fireProjectileCallback = fireProjectileCallback; // Function to handle firing logic

        this.terrain = null;
        this.obstacles = [];
        this.playerTank = null;
        this.enemyTanks = [];
        this.projectiles = [];
        this.explosions = [];
        this.wrecks = [];
        this.clock = new THREE.Clock(); // For delta time in updates
    }

    init() {
        this.clearWorld(); // Clear previous objects if re-initializing
        this.createTerrain();
        this.createObstacles();
        this.createPlayerTank();
        this.createEnemyTanks();
    }

    clearWorld() {
        // Remove all meshes managed by the world
        if (this.terrain) this.scene.remove(this.terrain);
        this.obstacles.forEach(obstacle => this.scene.remove(obstacle));
        if (this.playerTank) this.scene.remove(this.playerTank.mesh);
        this.enemyTanks.forEach(tank => this.scene.remove(tank.mesh));
        this.projectiles.forEach(proj => this.scene.remove(proj.mesh));
        this.explosions.forEach(exp => this.scene.remove(exp.particles)); // Assuming explosion object has particles mesh
        this.wrecks.forEach(wreck => this.scene.remove(wreck));

        // Clear arrays
        this.terrain = null;
        this.obstacles = [];
        this.playerTank = null;
        this.enemyTanks = [];
        this.projectiles = [];
        this.explosions = [];
        this.wrecks = [];
    }

    createTerrain() {
        // Ground
        const groundGeometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x556B2F, 
            roughness: 0.8, 
            metalness: 0.2 
        });
        this.terrain = new THREE.Mesh(groundGeometry, groundMaterial);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.receiveShadow = true;
        this.terrain.name = "Terrain"; // Name for identification
        this.scene.add(this.terrain);

        // Border walls
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 });
        const halfSize = TERRAIN_SIZE / 2;
        const borders = [
            { width: TERRAIN_SIZE, depth: WALL_THICKNESS, x: 0, z: -halfSize + WALL_THICKNESS / 2 }, // Top
            { width: TERRAIN_SIZE, depth: WALL_THICKNESS, x: 0, z: halfSize - WALL_THICKNESS / 2 }, // Bottom
            { width: WALL_THICKNESS, depth: TERRAIN_SIZE, x: -halfSize + WALL_THICKNESS / 2, z: 0 }, // Left
            { width: WALL_THICKNESS, depth: TERRAIN_SIZE, x: halfSize - WALL_THICKNESS / 2, z: 0 }  // Right
        ];

        borders.forEach(border => {
            const wallGeometry = new THREE.BoxGeometry(border.width, WALL_HEIGHT, border.depth);
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(border.x, WALL_HEIGHT / 2, border.z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            wall.name = "BorderWall";
            this.scene.add(wall);
            this.obstacles.push(wall); // Add walls to obstacles list
        });
    }

    createObstacles() {
        const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xA9A9A9, roughness: 0.6 });
        const halfSize = TERRAIN_SIZE / 2 - WALL_THICKNESS - OBSTACLE_MAX_SIZE; // Area for obstacles

        for (let i = 0; i < NUM_OBSTACLES; i++) {
            const sizeX = THREE.MathUtils.randFloat(OBSTACLE_MIN_SIZE, OBSTACLE_MAX_SIZE);
            const sizeY = THREE.MathUtils.randFloat(OBSTACLE_MIN_SIZE, OBSTACLE_MAX_SIZE); // Height
            const sizeZ = THREE.MathUtils.randFloat(OBSTACLE_MIN_SIZE, OBSTACLE_MAX_SIZE);
            const obstacleGeometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
            const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);

            let position;
            let attempts = 0;
            const maxAttempts = 50;
            do {
                const x = THREE.MathUtils.randFloat(-halfSize, halfSize);
                const z = THREE.MathUtils.randFloat(-halfSize, halfSize);
                position = new THREE.Vector3(x, sizeY / 2, z);
                attempts++;
            } while (this.isPositionOccupied(position, Math.max(sizeX, sizeZ) / 2 + 1) && attempts < maxAttempts);
            
            if (attempts < maxAttempts) { // Found a valid spot
                obstacle.position.copy(position);
                obstacle.castShadow = true;
                obstacle.receiveShadow = true;
                obstacle.name = `Obstacle_${i}`;
                this.scene.add(obstacle);
                this.obstacles.push(obstacle);
            } else {
                console.warn("Could not place obstacle after", maxAttempts, "attempts.");
            }
        }
    }

    createPlayerTank(inputState) {
        const spawnPoint = this.findValidSpawnPoint(true); // Find spawn for player
        if (spawnPoint) {
            this.playerTank = new PlayerTank(this.scene, spawnPoint, inputState);
        } else {
            console.error("Could not find valid spawn point for player tank!");
            // Fallback spawn, might collide
            this.playerTank = new PlayerTank(this.scene, new THREE.Vector3(0, 0.5, TERRAIN_SIZE / 2 - 5), inputState);
        }
    }

    createEnemyTanks() {
        for (let i = 0; i < NUM_ENEMY_TANKS; i++) {
            const spawnPoint = this.findValidSpawnPoint(false); // Find spawn for enemy
            if (spawnPoint) {
                 // Pass `this` (the world) and the fire callback
                const enemy = new EnemyTank(this.scene, spawnPoint, this, this.fireProjectileCallback);
                enemy.mesh.name = `EnemyTank_${i}`; // Assign name for easier identification
                this.enemyTanks.push(enemy);
            } else {
                console.warn("Could not find valid spawn point for enemy tank!");
            }
        }
    }
    
    // --- Helper Functions for Spawning & Placement ---

    findValidSpawnPoint(isPlayerSpawn) {
        const buffer = isPlayerSpawn ? PLAYER_SPAWN_BUFFER : ENEMY_SPAWN_BUFFER;
        const halfSize = TERRAIN_SIZE / 2 - buffer;
        let position = null;
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const x = THREE.MathUtils.randFloat(-halfSize, halfSize);
            const z = THREE.MathUtils.randFloat(-halfSize, halfSize);
            position = new THREE.Vector3(x, 0.5, z); // Assume tank height requires y=0.5

            // Check distance from player spawn if placing an enemy
            if (!isPlayerSpawn && this.playerTank) {
                 const distToPlayer = position.distanceTo(this.playerTank.mesh.position);
                 if (distToPlayer < PLAYER_SPAWN_BUFFER * 2) { // Don't spawn too close to player
                     attempts++;
                     continue;
                 }
            }
            
            // Check distance from existing obstacles and other tanks
            if (!this.isPositionOccupied(position, buffer)) {
                return position; // Found a valid spot
            }
            attempts++;
        }
        return null; // Failed to find a spot
    }

    isPositionOccupied(position, radius) {
        // Check against obstacles
        for (const obstacle of this.obstacles) {
            // Approximate obstacles as spheres for simpler check
            const obsPos = obstacle.position;
            const obsRadius = Math.max(obstacle.geometry.parameters.width, obstacle.geometry.parameters.depth) / 2;
            if (position.distanceTo(obsPos) < radius + obsRadius) {
                return true;
            }
        }
        // Check against player tank
        if (this.playerTank && !this.playerTank.isDestroyed && position.distanceTo(this.playerTank.mesh.position) < radius * 2) {
            return true; // Check a larger radius for tanks
        }
        // Check against other enemy tanks
        for (const enemy of this.enemyTanks) {
            if (!enemy.isDestroyed && position.distanceTo(enemy.mesh.position) < radius * 2) {
                return true;
            }
        }
        return false;
    }
    
     // Helper to find a random point on the map that isn't inside an obstacle
    findRandomNavigablePoint(origin, maxSearchRadius) {
        const halfSize = TERRAIN_SIZE / 2 - WALL_THICKNESS;
        let attempts = 0;
        const maxAttempts = 30;
        while (attempts < maxAttempts) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * maxSearchRadius;
            const x = Math.min(halfSize, Math.max(-halfSize, origin.x + Math.cos(angle) * radius));
            const z = Math.min(halfSize, Math.max(-halfSize, origin.z + Math.sin(angle) * radius));
            const point = new THREE.Vector3(x, 0.5, z);
            
            if (!this.isPositionOccupied(point, 2)) { // Check with a small radius
                return point;
            }
            attempts++;
        }
        return null; // Failed to find a point
    }

    // --- Collision Detection --- 

    checkCollision(sourceBoundingBox, targetPosition, movingObject = null) {
        // Create a temporary bounding box at the target position
        const targetBox = sourceBoundingBox.clone();
        targetBox.translate(targetPosition.clone().sub(movingObject.mesh.position)); // Move box to target position

        // 1. Check against obstacles (including walls)
        for (const obstacle of this.obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            if (targetBox.intersectsBox(obstacleBox)) {
                return true; // Collision with obstacle
            }
        }
        
        // 2. Check against player tank (if movingObject is not the player)
        if (this.playerTank && movingObject !== this.playerTank && !this.playerTank.isDestroyed) {
            if (targetBox.intersectsBox(this.playerTank.boundingBox)) {
                 return true; // Collision with player tank
            }
        }

        // 3. Check against other enemy tanks
        for (const enemy of this.enemyTanks) {
             // Skip self-collision and collision with destroyed tanks
            if (enemy === movingObject || enemy.isDestroyed) continue; 
            if (targetBox.intersectsBox(enemy.boundingBox)) {
                 return true; // Collision with another enemy tank
            }
        }

        // 4. Check against wrecks
        for (const wreck of this.wrecks) {
            const wreckBox = new THREE.Box3().setFromObject(wreck);
             if (targetBox.intersectsBox(wreckBox)) {
                 return true; // Collision with wreck
             }
        }

        return false; // No collision detected
    }

    // --- Getters for Game Objects ---

    getPlayerTank() {
        return this.playerTank;
    }

    getEnemyTanks() {
        return this.enemyTanks;
    }

    getObstacles() {
        return this.obstacles; // Includes border walls
    }

    getTerrain() {
        return this.terrain;
    }

    // Returns all objects a projectile can hit (excluding the owner)
    getCollidableObjects(projectileOwner) {
        let collidables = [...this.obstacles, this.terrain, ...this.wrecks]; // Start with static objects
        
        // Add player tank if it wasn't the owner
        if (this.playerTank && this.playerTank !== projectileOwner && !this.playerTank.isDestroyed) {
             // Add the tank's mesh components (body, turret) for finer collision
            collidables.push(this.playerTank.body, this.playerTank.turret);
        }
        
        // Add enemy tanks (that weren't the owner)
        this.enemyTanks.forEach(enemy => {
            if (enemy !== projectileOwner && !enemy.isDestroyed) {
                collidables.push(enemy.body, enemy.turret);
            }
        });
        
        return collidables;
    }

    // Find which tank instance a specific mesh belongs to
    findTankByMesh(mesh) {
         // Check player tank
        if (this.playerTank && !this.playerTank.isDestroyed) {
            if (mesh === this.playerTank.body || mesh === this.playerTank.turret || mesh === this.playerTank.cannon) {
                return this.playerTank;
            }
        }
        // Check enemy tanks
        for (const enemy of this.enemyTanks) {
            if (!enemy.isDestroyed) {
                if (mesh === enemy.body || mesh === enemy.turret || mesh === enemy.cannon) {
                    return enemy;
                }
            }
        }
        return null; // Mesh doesn't belong to any active tank
    }

    // --- Projectile Management ---

    addProjectile(projectile) {
        this.projectiles.push(projectile);
    }

    removeProjectile(projectile) {
        this.projectiles = this.projectiles.filter(p => p !== projectile);
    }

    // --- Effects Management ---
    
    createExplosion(position, size = 2) {
        // Basic placeholder - replace with actual explosion logic from old game.js or a new EffectsManager
        console.log(`Creating explosion at ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
        
        // --- Start: Explosion logic adapted from original game.js ---
        const particleCount = 100;
        const particles = [];
        const velocities = [];
        const explosionGeometry = new THREE.BufferGeometry();
        const explosionMaterial = new THREE.PointsMaterial({
            color: 0xffa500, // Orange
            size: 0.3,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending, // Brighter where particles overlap
            depthWrite: false // Prevent particles from obscuring things behind them incorrectly
        });
    
        // Create particles spreading outwards
        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI; // Angle from Y+ axis
            const r = Math.random() * size; // Random distance from center
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            particles.push(x, y, z);
            
            // Random velocity outward from center
            velocities.push({
                x: x * 0.1 + (Math.random() - 0.5) * 0.05, // Add some randomness
                y: y * 0.1 + 0.05 + (Math.random() * 0.05), // Add upward bias and randomness
                z: z * 0.1 + (Math.random() - 0.5) * 0.05
            });
        }
        
        explosionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particles, 3));
        const explosionParticles = new THREE.Points(explosionGeometry, explosionMaterial);
        explosionParticles.position.copy(position);
        this.scene.add(explosionParticles);
        
        // Add to explosions array for tracking and animation
        this.explosions.push({
            particles: explosionParticles,
            velocities: velocities,
            life: 0.7, // Shorter lifespan for effect
            created: this.clock.getElapsedTime() // Use clock time
        });
        // --- End: Explosion logic adapted --- 
    }
    
    updateExplosions(deltaTime) {
        const currentTime = this.clock.getElapsedTime();
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            const positions = explosion.particles.geometry.attributes.position.array;
            const age = currentTime - explosion.created;

            if (age > explosion.life) {
                this.scene.remove(explosion.particles);
                this.explosions.splice(i, 1);
                continue;
            }

            const lifeRatio = age / explosion.life;
            explosion.particles.material.opacity = 1.0 - lifeRatio; // Fade out
            // Optional: Shrink particles size
            // explosion.particles.material.size = 0.3 * (1.0 - lifeRatio);

            for (let j = 0; j < positions.length / 3; j++) {
                 // Add some damping/gravity to particle movement
                explosion.velocities[j].y -= 0.1 * deltaTime; 
                positions[j * 3] += explosion.velocities[j].x * deltaTime * 60; // Scale by frame rate assumed 60fps
                positions[j * 3 + 1] += explosion.velocities[j].y * deltaTime * 60;
                positions[j * 3 + 2] += explosion.velocities[j].z * deltaTime * 60;
            }
            explosion.particles.geometry.attributes.position.needsUpdate = true;
        }
    }

    createTankWreck(tankMesh) {
        // Basic placeholder - replace with actual wreck logic from old game.js
        console.log(`Creating wreck for tank at ${tankMesh.position.x.toFixed(2)}`);
        
         // --- Start: Wreck logic adapted from original game.js ---
        const wreckGeometry = new THREE.BoxGeometry(2, 0.8, 3); // Use tank body size, slightly flatter
        const wreckMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444, // Darker gray
            roughness: 0.9,
            metalness: 0.1
        });
        const wreck = new THREE.Mesh(wreckGeometry, wreckMaterial);
        wreck.position.copy(tankMesh.position);
        wreck.position.y = 0.4; // Sink slightly into ground
        wreck.rotation.copy(tankMesh.rotation);
        // Add random tilt
        wreck.rotation.x += (Math.random() - 0.5) * 0.4;
        wreck.rotation.z += (Math.random() - 0.5) * 0.4;
        wreck.castShadow = true;
        wreck.receiveShadow = true;
        wreck.name = "TankWreck";
        this.scene.add(wreck);
        this.wrecks.push(wreck);
         // --- End: Wreck logic adapted ---
    }

    // --- Main Update Loop --- 

    update() {
        const deltaTime = this.clock.getDelta();

        // Update player tank (if exists and not destroyed)
        if (this.playerTank && !this.playerTank.isDestroyed) {
            this.playerTank.update(deltaTime, this); // Pass world reference for collisions
        }

        // Update enemy tanks
        this.enemyTanks.forEach(enemy => {
            if (!enemy.isDestroyed) {
                enemy.update(deltaTime);
            }
        });

        // Update projectiles
        // Iterate backwards allows safe removal during iteration
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(deltaTime);
        }

        // Update ongoing effects (like explosions)
        this.updateExplosions(deltaTime);
    }
}
