import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Basic 3D Tank Battle game setup
let scene, camera, renderer, controls;
let tank, turret, enemyTanks = [];
let terrain;
let isFirstPerson = false;
let scopeOverlay;
let isPointerLocked = false;

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
    window.addEventListener('mousedown', onMouseDown);
    
    // Setup pointer lock event listeners
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mozpointerlockchange', onPointerLockChange);
    document.addEventListener('webkitpointerlockchange', onPointerLockChange);
    
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
    const rotationSpeed = 0.05;
    
    switch(event.key) {
        case 'ArrowUp':
        case 'w':
            // Move forward in the direction the tank is facing
            tank.position.x += Math.sin(tank.rotation.y) * speed;
            tank.position.z += Math.cos(tank.rotation.y) * speed;
            break;
        case 'ArrowDown':
        case 's':
            // Move backward in the direction the tank is facing
            tank.position.x -= Math.sin(tank.rotation.y) * speed;
            tank.position.z -= Math.cos(tank.rotation.y) * speed;
            break;
        case 'ArrowLeft':
        case 'a':
            // Always rotate the tank left in both modes
            tank.rotation.y += rotationSpeed;
            break;
        case 'ArrowRight':
        case 'd':
            // Always rotate the tank right in both modes
            tank.rotation.y -= rotationSpeed;
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
    }
    
    // Keep tank within bounds
    tank.position.x = Math.max(-50, Math.min(50, tank.position.x));
    tank.position.z = Math.max(-50, Math.min(50, tank.position.z));
    
    // Update camera if in first person
    if (isFirstPerson) {
        updateFirstPersonCamera();
    }
}

function onMouseDown() {
    // Shoot projectile
    const projectileGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const projectileMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFD700,
        emissive: 0xFFD700,
        emissiveIntensity: 0.5
    });
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Position at the end of the cannon
    const cannonTip = new THREE.Vector3(0, 0, 2);
    turret.children[0].localToWorld(cannonTip);
    projectile.position.copy(cannonTip);
    
    // Direction from turret
    const direction = new THREE.Vector3(0, 0, 1);
    turret.children[0].getWorldDirection(direction);
    
    // Add to scene
    scene.add(projectile);
    
    // Animate projectile
    const animateProjectile = function() {
        projectile.position.add(direction.multiplyScalar(1));
        
        // Check if projectile is out of bounds
        if (
            projectile.position.x > 50 || 
            projectile.position.x < -50 || 
            projectile.position.z > 50 || 
            projectile.position.z < -50
        ) {
            scene.remove(projectile);
            return;
        }
        
        // Check for collision with enemy tanks
        enemyTanks.forEach((enemyData, index) => {
            const distance = projectile.position.distanceTo(enemyData.tank.position);
            if (distance < 4) {
                scene.remove(enemyData.tank);
                enemyTanks.splice(index, 1);
                scene.remove(projectile);
                return;
            }
        });
        
        requestAnimationFrame(animateProjectile);
    };
    
    animateProjectile();
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

function onPointerLockChange() {
    isPointerLocked = document.pointerLockElement === renderer.domElement ||
                     document.mozPointerLockElement === renderer.domElement ||
                     document.webkitPointerLockElement === renderer.domElement;
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
    const projectileGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const projectileMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFF4500,
        emissive: 0xFF4500,
        emissiveIntensity: 0.5
    });
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Position at the end of the cannon
    const cannonTip = new THREE.Vector3(0, 0, 2);
    enemyData.turret.children[0].localToWorld(cannonTip);
    projectile.position.copy(cannonTip);
    
    // Direction from turret to player
    const direction = new THREE.Vector3()
        .subVectors(tank.position, projectile.position)
        .normalize();
    
    // Add to scene
    scene.add(projectile);
    
    // Animate projectile
    const animateProjectile = function() {
        projectile.position.add(direction.multiplyScalar(0.8));
        
        // Check if projectile is out of bounds
        if (
            projectile.position.x > 50 || 
            projectile.position.x < -50 || 
            projectile.position.z > 50 || 
            projectile.position.z < -50
        ) {
            scene.remove(projectile);
            return;
        }
        
        // Check for collision with player tank
        const distance = projectile.position.distanceTo(tank.position);
        if (distance < 4) {
            // Player hit!
            scene.remove(projectile);
            // Flash the tank red to indicate damage
            const originalColor = tank.material.color.clone();
            tank.material.color.set(0xFF0000);
            setTimeout(() => {
                tank.material.color.copy(originalColor);
            }, 200);
            return;
        }
        
        requestAnimationFrame(animateProjectile);
    };
    
    animateProjectile();
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Update enemy tanks
    updateEnemyTanks();
    
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

// Track mouse movement for aiming
document.addEventListener('mousemove', function(event) {
    if (isFirstPerson && isPointerLocked) {
        // In first person with pointer lock, use movement for more precise control
        const sensitivity = 0.002;
        
        // Rotate the turret horizontally based on mouse movement
        turret.rotation.y -= event.movementX * sensitivity;
        
        // We're not adjusting the cannon pitch for now to keep it horizontal
        // This ensures the view stays level with the horizon
        
        // Force immediate camera update
        updateFirstPersonCamera();
        
        // Prevent default behavior
        event.preventDefault();
    } else if (!isFirstPerson) {
        // In third person, rotate turret based on mouse position
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        turret.rotation.y = mouseX * 2;
    }
});
