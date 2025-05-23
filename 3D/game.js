import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Basic 3D Tank Battle game setup
let scene, camera, renderer, controls;
let tank, turret, enemyTanks = [];
let terrain, obstacles = [];
let isFirstPerson = false;
let scopeOverlay;
// No longer using pointer lock
let isPointerLocked = false;

// Arrays to track explosions and wrecks
let explosions = [];
let wrecks = [];

// Game state
let isGameOver = false;
let gameOverText;

// Initialize or restart the game
function init() {
    // Reset game state
    isGameOver = false;
    
    // Clear existing scene if restarting
    if (scene) {
        // Remove all objects from the scene
        while(scene.children.length > 0) { 
            scene.remove(scene.children[0]); 
        }
        
        // Clear arrays
        enemyTanks = [];
        obstacles = [];
        explosions = [];
        wrecks = [];
        
        // Remove game over text if it exists
        if (gameOverText) {
            document.body.removeChild(gameOverText);
            gameOverText = null;
        }
        
        // Reset any other state that might be causing issues
        tank = null;
        turret = null;
    } else {
        // Create scene for first initialization
        scene = new THREE.Scene();
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);
        
        // Add event listeners
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('keydown', onKeyDown);
    }
    
    // Set scene background
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 20);
    
    // Add controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Create lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);
    
    // Create terrain
    createTerrain();
    
    // Create player tank
    createPlayerTank();
    
    // Create enemy tanks
    createEnemyTanks();
    
    // Get scope overlay
    scopeOverlay = document.getElementById('scope-overlay');
    
    // Start animation loop if not already running
    if (!renderer.info.render.frame) {
        animate();
    }
}

function createTerrain() {
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x556B2F,
        roughness: 0.8,
        metalness: 0.2
    });
    terrain = new THREE.Mesh(groundGeometry, groundMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);
    
    // Clear obstacles array
    obstacles = [];
    
    // Create border walls
    const wallHeight = 3;
    const wallThickness = 2;
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, 
        roughness: 0.7 
    });
    
    // Border walls (top, bottom, left, right)
    const borders = [
        // Top wall
        { width: 100, depth: wallThickness, x: 0, z: -50 + wallThickness/2 },
        // Bottom wall
        { width: 100, depth: wallThickness, x: 0, z: 50 - wallThickness/2 },
        // Left wall
        { width: wallThickness, depth: 100, x: -50 + wallThickness/2, z: 0 },
        // Right wall
        { width: wallThickness, depth: 100, x: 50 - wallThickness/2, z: 0 }
    ];
    
    // Add border walls
    borders.forEach(border => {
        const wallGeometry = new THREE.BoxGeometry(border.width, wallHeight, border.depth);
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(border.x, wallHeight/2, border.z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        
        obstacles.push({
            mesh: wall,
            width: border.width,
            depth: border.depth,
            x: border.x,
            z: border.z,
            size: Math.max(border.width, border.depth) // Keep for backward compatibility
        });
    });
    
    // Create three L-shaped cover points similar to the 2D game
    const coverPoints = [
        // Left side cover
        {
            vertical: { width: wallThickness, depth: 30, x: -30, z: -10 },
            horizontal: { width: 20, depth: wallThickness, x: -20, z: 5 }
        },
        // Middle cover
        {
            vertical: { width: wallThickness, depth: 30, x: 0, z: 0 },
            horizontal: { width: 20, depth: wallThickness, x: -10, z: -15 }
        },
        // Right side cover
        {
            vertical: { width: wallThickness, depth: 30, x: 30, z: 10 },
            horizontal: { width: 20, depth: wallThickness, x: 20, z: -5 }
        }
    ];
    
    // Add all cover points
    coverPoints.forEach(cover => {
        // Vertical part of L
        const verticalGeometry = new THREE.BoxGeometry(
            cover.vertical.width, 
            wallHeight, 
            cover.vertical.depth
        );
        const verticalWall = new THREE.Mesh(verticalGeometry, wallMaterial);
        verticalWall.position.set(
            cover.vertical.x, 
            wallHeight/2, 
            cover.vertical.z
        );
        verticalWall.castShadow = true;
        verticalWall.receiveShadow = true;
        scene.add(verticalWall);
        
        obstacles.push({
            mesh: verticalWall,
            width: cover.vertical.width,
            depth: cover.vertical.depth,
            x: cover.vertical.x,
            z: cover.vertical.z,
            size: Math.max(cover.vertical.width, cover.vertical.depth) // Keep for backward compatibility
        });
        
        // Horizontal part of L
        const horizontalGeometry = new THREE.BoxGeometry(
            cover.horizontal.width, 
            wallHeight, 
            cover.horizontal.depth
        );
        const horizontalWall = new THREE.Mesh(horizontalGeometry, wallMaterial);
        horizontalWall.position.set(
            cover.horizontal.x, 
            wallHeight/2, 
            cover.horizontal.z
        );
        horizontalWall.castShadow = true;
        horizontalWall.receiveShadow = true;
        scene.add(horizontalWall);
        
        obstacles.push({
            mesh: horizontalWall,
            width: cover.horizontal.width,
            depth: cover.horizontal.depth,
            x: cover.horizontal.x,
            z: cover.horizontal.z,
            size: Math.max(cover.horizontal.width, cover.horizontal.depth) // Keep for backward compatibility
        });
    });
}

// Helper function to check if a position is a valid spawn point (not touching any obstacles)
function isValidSpawnPoint(x, z) {
    // Create a temporary position vector to check with our collision system
    const tempPosition = new THREE.Vector3(x, 0, z);
    
    // Use the same collision detection as for movement, but add extra margin
    // If checkCollision returns true, the position is not valid
    if (checkCollision(tempPosition)) {
        return false;
    }
    
    // Add extra safety margin check for spawning
    const spawnMargin = 2; // Extra margin for spawning
    const tankRadius = 2.5; // Same as in checkCollision
    
    // Check with extra margin against obstacles
    for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        
        // Rectangular collision detection with margin
        const halfWidth = obstacle.width / 2 + spawnMargin;
        const halfDepth = obstacle.depth / 2 + spawnMargin;
        
        // Check if the tank's circle intersects with the expanded obstacle rectangle
        const circleDistanceX = Math.abs(x - obstacle.x);
        const circleDistanceZ = Math.abs(z - obstacle.z);
        
        // Too far away to collide
        if (circleDistanceX > (halfWidth + tankRadius)) continue;
        if (circleDistanceZ > (halfDepth + tankRadius)) continue;
        
        // Definitely colliding if within rectangle bounds
        if (circleDistanceX <= halfWidth) return false;
        if (circleDistanceZ <= halfDepth) return false;
        
        // Check corner collision
        const cornerDistanceSq = Math.pow(circleDistanceX - halfWidth, 2) +
                               Math.pow(circleDistanceZ - halfDepth, 2);
        
        if (cornerDistanceSq <= Math.pow(tankRadius, 2)) {
            return false; // Too close to obstacle
        }
    }
    
    return true;
}

// Helper function to find a valid spawn point
function findValidSpawnPoint(isPlayerSpawn) {
    let x, z;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loops
    
    do {
        if (isPlayerSpawn) {
            // Player spawns in bottom half of the map
            x = Math.random() * 80 - 40;
            z = Math.random() * 30 + 10; // Bottom half, away from the edge
        } else {
            // Enemies spawn in top half of the map
            x = Math.random() * 80 - 40;
            z = Math.random() * 30 - 40; // Top half, away from the edge
        }
        attempts++;
    } while (!isValidSpawnPoint(x, z) && attempts < maxAttempts);
    
    // If we couldn't find a valid point after max attempts, use a fallback position
    if (attempts >= maxAttempts) {
        console.warn("Could not find valid spawn point after", maxAttempts, "attempts");
        if (isPlayerSpawn) {
            x = 0;
            z = 40; // Safe player position
        } else {
            x = 0;
            z = -40; // Safe enemy position
        }
    }
    
    return { x, z };
}

function createPlayerTank() {
    // Tank body
    const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 6);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4CAF50,
        roughness: 0.7,
        metalness: 0.3
    });
    tank = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Find a valid spawn point for the player
    const spawnPoint = findValidSpawnPoint(true);
    tank.position.set(spawnPoint.x, 1.5, spawnPoint.z);
    
    tank.castShadow = true;
    tank.receiveShadow = true;
    scene.add(tank);
    
    // Tank turret
    const turretGeometry = new THREE.CylinderGeometry(1.5, 1.5, 1, 8);
    const turretMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x388E3C,
        roughness: 0.6,
        metalness: 0.4
    });
    turret = new THREE.Mesh(turretGeometry, turretMaterial);
    turret.position.y = 1;
    turret.castShadow = true;
    tank.add(turret);
    
    // Tank cannon
    const cannonGeometry = new THREE.CylinderGeometry(0.3, 0.3, 4, 8);
    const cannonMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1B5E20,
        roughness: 0.5,
        metalness: 0.5
    });
    const cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    cannon.position.z = 2;
    // Make the cannon point straight forward (horizontally)
    cannon.rotation.x = Math.PI / 2;
    // Reset any vertical rotation to ensure it starts level
    cannon.rotation.y = 0;
    cannon.rotation.z = 0;
    turret.add(cannon);
    
    // Add tank treads
    const treadGeometry = new THREE.BoxGeometry(1, 0.5, 6);
    const treadMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x212121,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const leftTread = new THREE.Mesh(treadGeometry, treadMaterial);
    leftTread.position.set(-2, -0.5, 0);
    leftTread.castShadow = true;
    leftTread.receiveShadow = true;
    tank.add(leftTread);
    
    const rightTread = new THREE.Mesh(treadGeometry, treadMaterial);
    rightTread.position.set(2, -0.5, 0);
    rightTread.castShadow = true;
    rightTread.receiveShadow = true;
    tank.add(rightTread);
}

function createEnemyTanks() {
    // Create exactly 3 enemy tanks
    for (let i = 0; i < 3; i++) {
        // Enemy tank body
        const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 6);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xF44336,
            roughness: 0.7,
            metalness: 0.3
        });
        const enemyTank = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        // Find a valid spawn point for this enemy tank
        const spawnPoint = findValidSpawnPoint(false);
        enemyTank.position.set(spawnPoint.x, 1.5, spawnPoint.z);
        
        // Random rotation
        enemyTank.rotation.y = Math.random() * Math.PI * 2;
        
        enemyTank.castShadow = true;
        enemyTank.receiveShadow = true;
        scene.add(enemyTank);
        
        // Enemy tank turret
        const turretGeometry = new THREE.CylinderGeometry(1.5, 1.5, 1, 8);
        const turretMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xD32F2F,
            roughness: 0.6,
            metalness: 0.4
        });
        const enemyTurret = new THREE.Mesh(turretGeometry, turretMaterial);
        enemyTurret.position.y = 1;
        enemyTurret.castShadow = true;
        enemyTank.add(enemyTurret);
        
        // Enemy tank cannon
        const cannonGeometry = new THREE.CylinderGeometry(0.3, 0.3, 4, 8);
        const cannonMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xB71C1C,
            roughness: 0.5,
            metalness: 0.5
        });
        const cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
        cannon.position.z = 2;
        cannon.rotation.x = Math.PI / 2;
        enemyTurret.add(cannon);
        
        // Add tank treads
        const treadGeometry = new THREE.BoxGeometry(1, 0.5, 6);
        const treadMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x212121,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const leftTread = new THREE.Mesh(treadGeometry, treadMaterial);
        leftTread.position.set(-2, -0.5, 0);
        leftTread.castShadow = true;
        leftTread.receiveShadow = true;
        enemyTank.add(leftTread);
        
        const rightTread = new THREE.Mesh(treadGeometry, treadMaterial);
        rightTread.position.set(2, -0.5, 0);
        rightTread.castShadow = true;
        rightTread.receiveShadow = true;
        enemyTank.add(rightTread);
        
        // Create a more consistent initial direction - point toward player's side of map
        const directionTowardPlayer = new THREE.Vector3(0, 0, 1).normalize(); // Point south
        // Add some randomness but keep general direction toward player
        const randomFactor = 0.3; // Lower value = more consistent direction
        directionTowardPlayer.x += (Math.random() - 0.5) * randomFactor;
        directionTowardPlayer.normalize();
        
        // Set initial rotation to match direction
        enemyTank.rotation.y = Math.atan2(-directionTowardPlayer.x, -directionTowardPlayer.z);
        
        enemyTanks.push({
            tank: enemyTank,
            turret: enemyTurret,
            speed: Math.random() * 0.05 + 0.02,
            rotationSpeed: Math.random() * 0.01 + 0.005,
            direction: directionTowardPlayer,
            lastDirectionChange: Date.now(), // Initialize timing properties
            lastMoveTime: Date.now()
        });
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Create game over screen
function showGameOver() {
    // Create game over text overlay
    gameOverText = document.createElement('div');
    gameOverText.style.position = 'absolute';
    gameOverText.style.width = '100%';
    gameOverText.style.height = '100%';
    gameOverText.style.backgroundColor = 'rgba(0,0,0,0.7)';
    gameOverText.style.color = 'white';
    gameOverText.style.display = 'flex';
    gameOverText.style.flexDirection = 'column';
    gameOverText.style.justifyContent = 'center';
    gameOverText.style.alignItems = 'center';
    gameOverText.style.zIndex = '1000';
    gameOverText.style.fontFamily = 'Arial, sans-serif';
    
    const title = document.createElement('h1');
    title.textContent = 'GAME OVER';
    title.style.fontSize = '5em';
    title.style.margin = '0 0 20px 0';
    
    const instruction = document.createElement('p');
    instruction.textContent = 'Press R to restart';
    instruction.style.fontSize = '2em';
    
    gameOverText.appendChild(title);
    gameOverText.appendChild(instruction);
    document.body.appendChild(gameOverText);
}

function onKeyDown(event) {
    // If game is over, only respond to R key for restart
    if (isGameOver) {
        if (event.key.toLowerCase() === 'r') {
            init(); // Restart the game
        }
        return;
    }
    
    const speed = 0.5;
    const tankRotationSpeed = 0.05;
    const turretRotationSpeed = 0.05;
    let newPosition = new THREE.Vector3();
    
    switch(event.key) {
        case 'w':
            // Calculate new position before moving
            newPosition.copy(tank.position);
            newPosition.x += Math.sin(tank.rotation.y) * speed;
            newPosition.z += Math.cos(tank.rotation.y) * speed;
            
            // Only move if no collision
            if (!checkCollision(newPosition)) {
                tank.position.copy(newPosition);
            }
            break;
        case 's':
            // Calculate new position before moving
            newPosition.copy(tank.position);
            newPosition.x -= Math.sin(tank.rotation.y) * speed;
            newPosition.z -= Math.cos(tank.rotation.y) * speed;
            
            // Only move if no collision
            if (!checkCollision(newPosition)) {
                tank.position.copy(newPosition);
            }
            break;
        case 'a':
            // Rotate the tank left
            tank.rotation.y += tankRotationSpeed;
            break;
        case 'd':
            // Rotate the tank right
            tank.rotation.y -= tankRotationSpeed;
            break;
        case 'ArrowLeft':
            // Rotate the turret left
            turret.rotation.y += turretRotationSpeed;
            break;
        case 'ArrowRight':
            // Rotate the turret right
            turret.rotation.y -= turretRotationSpeed;
            break;
        // Q key removed - does nothing now
        case 'v':
            toggleView();
            break;
        case ' ': // Space bar for firing
            fireProjectile();
            break;
        case 'r':
            init(); // Restart the game
            break;
    }
    
    // Keep tank within bounds
    tank.position.x = Math.max(-50, Math.min(50, tank.position.x));
    tank.position.z = Math.max(-50, Math.min(50, tank.position.z));
    
    // Update camera if in first person
    if (isFirstPerson) {
        updateFirstPersonCamera();
    }
}

// Check for collisions with obstacles, enemy tanks, and wrecks
function checkCollision(position) {
    const tankRadius = 2.5; // Reduced radius of the tank for better movement
    
    // Check collision with obstacles using rectangular collision detection
    for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        
        // Rectangular collision detection with the obstacle
        const halfWidth = obstacle.width / 2;
        const halfDepth = obstacle.depth / 2;
        
        // Check if the tank's circle intersects with the obstacle's rectangle
        const circleDistanceX = Math.abs(position.x - obstacle.x);
        const circleDistanceZ = Math.abs(position.z - obstacle.z);
        
        // Too far away to collide
        if (circleDistanceX > (halfWidth + tankRadius)) continue;
        if (circleDistanceZ > (halfDepth + tankRadius)) continue;
        
        // Definitely colliding if within rectangle bounds
        if (circleDistanceX <= halfWidth) return true;
        if (circleDistanceZ <= halfDepth) return true;
        
        // Check corner collision
        const cornerDistanceSq = Math.pow(circleDistanceX - halfWidth, 2) +
                               Math.pow(circleDistanceZ - halfDepth, 2);
        
        if (cornerDistanceSq <= Math.pow(tankRadius, 2)) {
            return true; // Collision detected
        }
    }
    
    // Check collision with enemy tanks
    for (let i = 0; i < enemyTanks.length; i++) {
        const enemyTank = enemyTanks[i].tank;
        // Calculate horizontal distance only
        const distance = Math.sqrt(
            Math.pow(position.x - enemyTank.position.x, 2) + 
            Math.pow(position.z - enemyTank.position.z, 2)
        );
        
        if (distance < tankRadius * 2) { // Two tank radii
            return true; // Collision detected
        }
    }
    
    // Check collision with wrecks
    for (let i = 0; i < wrecks.length; i++) {
        const wreck = wrecks[i];
        // Calculate horizontal distance only
        const distance = Math.sqrt(
            Math.pow(position.x - wreck.position.x, 2) + 
            Math.pow(position.z - wreck.position.z, 2)
        );
        
        if (distance < tankRadius + 2) { // Tank radius + wreck radius
            return true; // Collision detected
        }
    }
    
    return false; // No collision
}

// Extract the firing functionality into a separate function that can be called from onKeyDown
function fireProjectile() {
    console.log('Firing projectile!');
    
    // Create a larger, brighter projectile for better visibility
    const projectileGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const projectileMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF0000 // Bright red color
    });
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectile.castShadow = true;
    
    // Get the cannon (first child of turret)
    const cannon = turret.children[0];
    
    // Position projectile at the end of the cannon
    // Get the cannon's world position and add an offset in its direction
    const cannonWorldPos = new THREE.Vector3();
    cannon.getWorldPosition(cannonWorldPos);
    
    // Get the turret's forward direction - this is what we're aiming with
    const direction = new THREE.Vector3();
    
    // Use the turret's world matrix to determine the forward direction
    // Extract the forward vector (negative Z) from the turret's matrix
    const matrix = new THREE.Matrix4();
    matrix.extractRotation(turret.matrixWorld);
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyMatrix4(matrix);
    
    // Set our direction to this forward vector
    direction.copy(forward);
    
    // Set the projectile position at the end of the cannon
    projectile.position.copy(cannonWorldPos);
    // Use a fresh direction vector to avoid modifying the original
    const offsetDirection = direction.clone();
    projectile.position.add(offsetDirection.multiplyScalar(3)); // Place it 3 units in front of the cannon
    
    // Store the direction for animation
    const projectileDirection = direction.clone().normalize();
    // Force the projectile to travel horizontally (optional - remove if you want projectiles to follow exact turret angle)
    // projectileDirection.y = 0;
    // projectileDirection.normalize();
    
    console.log('Projectile direction:', projectileDirection);
    
    // Add to scene
    scene.add(projectile);
    
    // Create a fixed speed for the projectile
    const projectileSpeed = 1.0;
    
    // Animate projectile with a separate function
    let animationId;
    
    function animateProjectile() {
        // Move projectile forward along its direction
        projectile.position.x += projectileDirection.x * projectileSpeed;
        projectile.position.y += projectileDirection.y * projectileSpeed;
        projectile.position.z += projectileDirection.z * projectileSpeed;
        
        // Check if projectile is out of bounds
        if (
            projectile.position.x > 50 || 
            projectile.position.x < -50 || 
            projectile.position.z > 50 || 
            projectile.position.z < -50 ||
            projectile.position.y < 0 || 
            projectile.position.y > 50
        ) {
            scene.remove(projectile);
            cancelAnimationFrame(animationId);
            console.log('Projectile out of bounds');
            return;
        }
        
        // Check for collision with obstacles
        for (let i = 0; i < obstacles.length; i++) {
            const obstacle = obstacles[i];
            const projectileRadius = 0.8;
            
            // Rectangular collision detection for projectile
            const halfWidth = obstacle.width / 2;
            const halfDepth = obstacle.depth / 2;
            
            // Check if the projectile intersects with the obstacle's rectangle
            const circleDistanceX = Math.abs(projectile.position.x - obstacle.x);
            const circleDistanceZ = Math.abs(projectile.position.z - obstacle.z);
            
            // Too far away to collide
            if (circleDistanceX > (halfWidth + projectileRadius)) continue;
            if (circleDistanceZ > (halfDepth + projectileRadius)) continue;
            
            // Definitely colliding if within rectangle bounds
            if (circleDistanceX <= halfWidth || circleDistanceZ <= halfDepth) {
                // Create explosion at impact point
                createExplosion(projectile.position.clone(), 1.5);
                
                // Remove projectile
                scene.remove(projectile);
                cancelAnimationFrame(animationId);
                console.log('Projectile hit obstacle');
                return;
            }
            
            // Check corner collision
            const cornerDistanceSq = Math.pow(circleDistanceX - halfWidth, 2) +
                                   Math.pow(circleDistanceZ - halfDepth, 2);
            
            if (cornerDistanceSq <= Math.pow(projectileRadius, 2)) {
                // Create explosion at impact point
                createExplosion(projectile.position.clone(), 1.5);
                
                // Remove projectile
                scene.remove(projectile);
                cancelAnimationFrame(animationId);
                console.log('Projectile hit obstacle');
                return;
            }
        }
        
        // Check for collision with enemy tanks
        for (let i = enemyTanks.length - 1; i >= 0; i--) {
            const enemyData = enemyTanks[i];
            // Calculate horizontal distance only (ignore y-axis differences)
            const distance = Math.sqrt(
                Math.pow(projectile.position.x - enemyData.tank.position.x, 2) + 
                Math.pow(projectile.position.z - enemyData.tank.position.z, 2)
            );
            
            if (distance < 4) {
                // Create explosion at impact point
                createExplosion(projectile.position.clone(), 3);
                
                // Create a tank wreck
                createTankWreck(enemyData.tank);
                
                // Remove the original tank
                scene.remove(enemyData.tank);
                enemyTanks.splice(i, 1);
                
                // Remove projectile
                scene.remove(projectile);
                cancelAnimationFrame(animationId);
                console.log('Enemy tank hit!');
                return;
            }
        }
        
        // Continue animation
        animationId = requestAnimationFrame(animateProjectile);
    }
    
    // Start animation
    animationId = requestAnimationFrame(animateProjectile);
}

function toggleView() {
    isFirstPerson = !isFirstPerson;
    
    if (isFirstPerson) {
        // Switch to first person view
        controls.enabled = false;
        scopeOverlay.classList.add('active');
        
        // Force the camera to update immediately
        updateFirstPersonCamera();
    } else {
        // Switch to third person view
        controls.enabled = true;
        scopeOverlay.classList.remove('active');
        camera.position.set(0, 10, 20);
        controls.target.copy(tank.position);
    }
    
    // Force a render to update the view immediately
    renderer.render(scene, camera);
}

// No longer using pointer lock functionality
function onPointerLockChange() {
    // Function kept for compatibility but no longer used
    isPointerLocked = false;
}

function updateFirstPersonCamera() {
    // Position camera on top of the turret
    const cameraPosition = new THREE.Vector3(0, 1.5, 0);
    turret.localToWorld(cameraPosition);
    camera.position.copy(cameraPosition);
    
    // Get the world position of the turret
    const turretWorldPos = new THREE.Vector3();
    turret.getWorldPosition(turretWorldPos);
    
    // Get the turret's forward direction in world space
    const forward = new THREE.Vector3(0, 0, 1);
    turret.getWorldDirection(forward);
    
    // Create a target point directly in front of the turret
    const target = new THREE.Vector3();
    target.copy(turretWorldPos);
    target.add(forward.multiplyScalar(10));
    
    // Point the camera at this target
    camera.lookAt(target);
}

function updateEnemyTanks() {
    // Don't update if game is over
    if (isGameOver) return;
    
    enemyTanks.forEach((enemyData, index) => {
        // Calculate new position before moving
        const newPosition = new THREE.Vector3();
        newPosition.copy(enemyData.tank.position);
        newPosition.x += enemyData.direction.x * enemyData.speed;
        newPosition.z += enemyData.direction.z * enemyData.speed;
        
        // Check for collisions
        let hasCollision = false;
        
        // Check collision with player tank
        if (tank.visible) { // Only if player tank is active
            const distanceToPlayer = newPosition.distanceTo(tank.position);
            if (distanceToPlayer < 6) { // Two tank radii
                hasCollision = true;
            }
        }
        
        // Check collision with other enemy tanks
        if (!hasCollision) {
            for (let i = 0; i < enemyTanks.length; i++) {
                if (i !== index) { // Don't check against self
                    const otherTank = enemyTanks[i].tank;
                    const distance = newPosition.distanceTo(otherTank.position);
                    if (distance < 6) { // Two tank radii
                        hasCollision = true;
                        break;
                    }
                }
            }
        }
        
        // Check collision with obstacles
        if (!hasCollision) {
            for (let i = 0; i < obstacles.length; i++) {
                const obstacle = obstacles[i];
                const distance = newPosition.distanceTo(obstacle.mesh.position);
                if (distance < 3 + obstacle.size / 2) { // Tank radius + obstacle radius
                    hasCollision = true;
                    break;
                }
            }
        }
        
        // Check collision with wrecks
        if (!hasCollision) {
            for (let i = 0; i < wrecks.length; i++) {
                const wreck = wrecks[i];
                const distance = newPosition.distanceTo(wreck.position);
                if (distance < 5) { // Tank radius + wreck radius
                    hasCollision = true;
                    break;
                }
            }
        }
        
        // Move if no collision, otherwise change direction
        if (!hasCollision) {
            enemyData.tank.position.copy(newPosition);
            // Store last successful move time
            enemyData.lastMoveTime = Date.now();
        } else {
            // Only change direction if we haven't changed recently (prevents rapid spinning)
            const currentTime = Date.now();
            if (!enemyData.lastDirectionChange || currentTime - enemyData.lastDirectionChange > 1000) {
                // Change direction when collision detected
                enemyData.direction.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
                enemyData.lastDirectionChange = currentTime;
            }
        }
        
        // Only update rotation if the tank is actually moving (not colliding)
        if (!hasCollision) {
            // Rotate enemy tank to face direction of movement
            enemyData.tank.rotation.y = Math.atan2(-enemyData.direction.x, -enemyData.direction.z);
        }
        
        // Keep enemy tank within bounds
        if (
            enemyData.tank.position.x > 45 || 
            enemyData.tank.position.x < -45 || 
            enemyData.tank.position.z > 45 || 
            enemyData.tank.position.z < -45
        ) {
            // Change direction when hitting boundary
            enemyData.direction.x *= -1;
            enemyData.direction.z *= -1;
        }
        
        // Randomly change direction occasionally
        if (Math.random() < 0.01) {
            enemyData.direction.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
        }
        
        // Make enemy turret track player
        const targetDirection = new THREE.Vector3()
            .subVectors(tank.position, enemyData.tank.position)
            .normalize();
        
        const angle = Math.atan2(targetDirection.x, targetDirection.z);
        enemyData.turret.rotation.y = angle - enemyData.tank.rotation.y;
        
        // Occasionally fire at player if they're visible
        if (!isGameOver && tank.visible && Math.random() < 0.001) {
            fireEnemyProjectile(enemyData);
        }
    });
}

function fireEnemyProjectile(enemyData) {
    // Create a visible enemy projectile
    const projectileGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const projectileMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF4500 // Orange-red color for enemy projectiles
    });
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectile.castShadow = true;
    
    // Get the enemy cannon (first child of turret)
    const cannon = enemyData.turret.children[0];
    
    // Position projectile at the end of the cannon
    const cannonWorldPos = new THREE.Vector3();
    cannon.getWorldPosition(cannonWorldPos);
    
    // Direction from turret to player
    const direction = new THREE.Vector3()
        .subVectors(tank.position, cannonWorldPos)
        .normalize();
    
    // Set the projectile position at the end of the cannon
    projectile.position.copy(cannonWorldPos);
    // Use a fresh direction vector to avoid modifying the original
    const offsetDirection = direction.clone();
    projectile.position.add(offsetDirection.multiplyScalar(3)); // Place it 3 units in front of the cannon
    
    // Add to scene
    scene.add(projectile);
    
    // Create a fixed speed for the projectile
    const projectileSpeed = 0.8;
    
    // Animate projectile with a separate function
    let animationId;
    
    function animateProjectile() {
        // Move projectile forward along its direction
        projectile.position.x += direction.x * projectileSpeed;
        projectile.position.y += direction.y * projectileSpeed;
        projectile.position.z += direction.z * projectileSpeed;
        
        // Check if projectile is out of bounds
        if (
            projectile.position.x > 50 || 
            projectile.position.x < -50 || 
            projectile.position.z > 50 || 
            projectile.position.z < -50 ||
            projectile.position.y < 0 || 
            projectile.position.y > 50
        ) {
            scene.remove(projectile);
            cancelAnimationFrame(animationId);
            return;
        }
        
        // Check for collision with obstacles
        for (let i = 0; i < obstacles.length; i++) {
            const obstacle = obstacles[i];
            const distance = projectile.position.distanceTo(obstacle.mesh.position);
            if (distance < obstacle.size / 2 + 0.8) { // obstacle size/2 + projectile radius
                // Create explosion at impact point
                createExplosion(projectile.position.clone(), 1.5);
                
                // Remove projectile
                scene.remove(projectile);
                cancelAnimationFrame(animationId);
                return;
            }
        }
        
        // Check for collision with player tank
        const distance = projectile.position.distanceTo(tank.position);
        if (distance < 4) {
            // Create explosion at impact point
            createExplosion(projectile.position.clone(), 3);
            
            // Player hit!
            scene.remove(projectile);
            cancelAnimationFrame(animationId);
            
            // Create a tank wreck and hide the player tank
            // We don't remove the player tank completely since it's needed for game logic
            const playerWreck = createTankWreck(tank);
            
            // Hide the original tank but keep it in the scene for game logic
            tank.visible = false;
            turret.visible = false;
            
            // Disable controls
            controls.enabled = false;
            
            console.log('Player hit by enemy projectile!');
            
            // Set game over state
            isGameOver = true;
            
            // Show game over screen after a short delay
            setTimeout(() => {
                showGameOver();
            }, 1500);
            
            return;
        }
        
        // Continue animation
        animationId = requestAnimationFrame(animateProjectile);
    }
    
    // Start animation
    animationId = requestAnimationFrame(animateProjectile);
}

// Create an explosion effect at the specified position
function createExplosion(position, size = 2) {
    // Create a particle system for the explosion
    const particleCount = 20;
    const explosionGeometry = new THREE.BufferGeometry();
    const explosionMaterial = new THREE.PointsMaterial({
        color: 0xFF5500,
        size: 0.5,
        transparent: true,
        opacity: 1.0
    });
    
    // Create particles with random positions within a sphere
    const particles = [];
    const velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
        // Random position within a sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = Math.random() * size;
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        
        particles.push(x, y, z);
        
        // Random velocity outward from center
        velocities.push({
            x: x * 0.1,
            y: y * 0.1 + 0.05, // Add slight upward bias
            z: z * 0.1
        });
    }
    
    explosionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particles, 3));
    const explosionParticles = new THREE.Points(explosionGeometry, explosionMaterial);
    
    // Set the position of the explosion
    explosionParticles.position.copy(position);
    scene.add(explosionParticles);
    
    // Add to explosions array with timing information
    explosions.push({
        particles: explosionParticles,
        velocities: velocities,
        life: 1.0, // Life of the explosion (seconds)
        created: Date.now()
    });
}

// Create a tank wreck at the position of a destroyed tank
function createTankWreck(tankMesh) {
    // Create a wreck based on the tank's geometry but with a darker, damaged appearance
    const wreckGeometry = new THREE.BoxGeometry(4, 1, 6); // Slightly flatter than original tank
    const wreckMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333, // Dark gray/charred color
        roughness: 0.9,
        metalness: 0.2
    });
    
    const wreck = new THREE.Mesh(wreckGeometry, wreckMaterial);
    
    // Position the wreck at the tank's position
    wreck.position.copy(tankMesh.position);
    wreck.rotation.copy(tankMesh.rotation);
    
    // Add some random rotation to make it look damaged
    wreck.rotation.x = (Math.random() - 0.5) * 0.3;
    wreck.rotation.z = (Math.random() - 0.5) * 0.3;
    
    // Lower it slightly into the ground
    wreck.position.y = 0.6;
    
    wreck.castShadow = true;
    wreck.receiveShadow = true;
    
    // Add to scene and track in wrecks array
    scene.add(wreck);
    wrecks.push(wreck);
    
    return wreck;
}

// Update explosions (handle particle movement and fading)
function updateExplosions() {
    const currentTime = Date.now();
    
    // Update each explosion
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        const positions = explosion.particles.geometry.attributes.position.array;
        
        // Calculate age of explosion
        const age = (currentTime - explosion.created) / 1000; // in seconds
        
        // Remove if too old
        if (age > explosion.life) {
            scene.remove(explosion.particles);
            explosions.splice(i, 1);
            continue;
        }
        
        // Update particle positions based on velocities
        for (let j = 0; j < positions.length / 3; j++) {
            positions[j * 3] += explosion.velocities[j].x;
            positions[j * 3 + 1] += explosion.velocities[j].y;
            positions[j * 3 + 2] += explosion.velocities[j].z;
        }
        
        // Update the position attribute
        explosion.particles.geometry.attributes.position.needsUpdate = true;
        
        // Fade out based on age
        const normalizedAge = age / explosion.life;
        explosion.particles.material.opacity = 1 - normalizedAge;
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Update enemy tanks
    updateEnemyTanks();
    
    // Update explosions
    updateExplosions();
    
    // Update camera based on view mode
    if (isFirstPerson) {
        // Continuously update first-person camera to ensure it follows the cannon
        updateFirstPersonCamera();
    } else {
        // Update third-person camera to follow tank
        controls.target.copy(tank.position);
    }
    
    // Render scene
    renderer.render(scene, camera);
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', init);

// No longer using mouse for aiming
