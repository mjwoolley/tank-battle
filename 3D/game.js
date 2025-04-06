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

// Initialize the game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 20);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    
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
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    
    // Start animation loop
    animate();
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
    
    // Add some random obstacles
    for (let i = 0; i < 20; i++) {
        const size = Math.random() * 3 + 1;
        const obstacleGeometry = new THREE.BoxGeometry(size, size, size);
        const obstacleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.7 
        });
        const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
        
        // Position randomly on the terrain
        obstacle.position.x = Math.random() * 80 - 40;
        obstacle.position.z = Math.random() * 80 - 40;
        obstacle.position.y = size / 2;
        
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        scene.add(obstacle);
        
        // Store obstacle for collision detection
        obstacles.push({
            mesh: obstacle,
            size: size
        });
    }
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
    tank.position.y = 1.5;
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
    for (let i = 0; i < 5; i++) {
        // Enemy tank body
        const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 6);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xF44336,
            roughness: 0.7,
            metalness: 0.3
        });
        const enemyTank = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        // Position randomly on the terrain
        enemyTank.position.x = Math.random() * 80 - 40;
        enemyTank.position.z = Math.random() * 80 - 40;
        enemyTank.position.y = 1.5;
        
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
        
        enemyTanks.push({
            tank: enemyTank,
            turret: enemyTurret,
            speed: Math.random() * 0.05 + 0.02,
            rotationSpeed: Math.random() * 0.01 + 0.005,
            direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
        });
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    const speed = 0.5;
    const tankRotationSpeed = 0.05;
    const turretRotationSpeed = 0.05;
    
    switch(event.key) {
        case 'w':
            // Move forward in the direction the tank is facing
            tank.position.x += Math.sin(tank.rotation.y) * speed;
            tank.position.z += Math.cos(tank.rotation.y) * speed;
            break;
        case 's':
            // Move backward in the direction the tank is facing
            tank.position.x -= Math.sin(tank.rotation.y) * speed;
            tank.position.z -= Math.cos(tank.rotation.y) * speed;
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
        case 'q':
            // Strafe left in first person mode
            if (isFirstPerson) {
                tank.position.x += Math.sin(tank.rotation.y + Math.PI/2) * speed;
                tank.position.z += Math.cos(tank.rotation.y + Math.PI/2) * speed;
            }
            break;
        case 'e':
            // Strafe right in first person mode
            if (isFirstPerson) {
                tank.position.x += Math.sin(tank.rotation.y - Math.PI/2) * speed;
                tank.position.z += Math.cos(tank.rotation.y - Math.PI/2) * speed;
            }
            break;
        case 'v':
            toggleView();
            break;
        case ' ': // Space bar for firing
            fireProjectile();
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
            const distance = projectile.position.distanceTo(obstacle.mesh.position);
            if (distance < obstacle.size / 2 + 0.8) { // obstacle size/2 + projectile radius
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
            const distance = projectile.position.distanceTo(enemyData.tank.position);
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
        
        // Request pointer lock for first-person view
        renderer.domElement.requestPointerLock = 
            renderer.domElement.requestPointerLock ||
            renderer.domElement.mozRequestPointerLock ||
            renderer.domElement.webkitRequestPointerLock;
        
        renderer.domElement.requestPointerLock();
    } else {
        // Switch to third person view
        controls.enabled = true;
        scopeOverlay.classList.remove('active');
        camera.position.set(0, 10, 20);
        controls.target.copy(tank.position);
        
        // Exit pointer lock for third-person view
        document.exitPointerLock = 
            document.exitPointerLock ||
            document.mozExitPointerLock ||
            document.webkitExitPointerLock;
        
        document.exitPointerLock();
    }
    
    document.getElementById('view-mode').textContent = 
        isFirstPerson ? "First Person View (Press V to toggle)" : "Third Person View (Press V to toggle)";
    
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
    enemyTanks.forEach(enemyData => {
        // Move enemy tank
        enemyData.tank.position.x += enemyData.direction.x * enemyData.speed;
        enemyData.tank.position.z += enemyData.direction.z * enemyData.speed;
        
        // Rotate enemy tank to face direction of movement
        enemyData.tank.rotation.y = Math.atan2(-enemyData.direction.x, -enemyData.direction.z);
        
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
        
        // Occasionally fire at player
        if (Math.random() < 0.001) {
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
            
            // After a delay, respawn the player
            setTimeout(() => {
                // Remove the wreck
                scene.remove(playerWreck);
                wrecks.splice(wrecks.indexOf(playerWreck), 1);
                
                // Reset player position
                tank.position.set(0, 1.5, 0);
                tank.rotation.set(0, 0, 0);
                
                // Make tank visible again
                tank.visible = true;
                turret.visible = true;
                
                // Re-enable controls
                controls.enabled = true;
                
                console.log('Player respawned');
            }, 3000); // Respawn after 3 seconds
            
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
