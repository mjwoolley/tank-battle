import * as THREE from 'three';
import { HumanTank, AITank } from './tank.js';
import { Wall } from './wall.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Create reticle
        this.createReticle();

        // Setup camera
        this.firstPersonMode = true;
        this.scopeOverlay = document.getElementById('scope-overlay');
        this.scopeOverlay.classList.add('active');
        this.thirdPersonOffset = new THREE.Vector3(0, 25, 35);
        this.firstPersonOffset = new THREE.Vector3(0, 0.5, 0);
        this.cameraLerpFactor = 0.1;
        this.camera.position.copy(this.firstPersonOffset);

        // Setup scene
        this.setupScene();

        // Setup controls
        this.setupControls();

        // Start game loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    createReticle() {
        // Create reticle HTML
        const reticleContainer = document.createElement('div');
        reticleContainer.id = 'reticle';
        reticleContainer.style.position = 'absolute';
        reticleContainer.style.top = '50%';
        reticleContainer.style.left = '50%';
        reticleContainer.style.transform = 'translate(-50%, -50%)';
        reticleContainer.style.pointerEvents = 'none';
        
        // Create reticle SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '64');
        svg.setAttribute('height', '64');
        svg.style.opacity = '0.8';
        
        // Create crosshair
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '32');
        circle.setAttribute('cy', '32');
        circle.setAttribute('r', '30');
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        
        const crosshairLines = [
            'M32,12 L32,22', // Top
            'M32,42 L32,52', // Bottom
            'M12,32 L22,32', // Left
            'M42,32 L52,32'  // Right
        ];
        
        crosshairLines.forEach(path => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            line.setAttribute('d', path);
            line.setAttribute('stroke', '#ffffff');
            line.setAttribute('stroke-width', '2');
            svg.appendChild(line);
        });
        
        svg.appendChild(circle);
        reticleContainer.appendChild(svg);
        document.body.appendChild(reticleContainer);
    }

    setupScene() {
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 0);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2ecc71, // Bright green color
            metalness: 0.1,
            roughness: 0.8
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Create border walls
        const wallHeight = 5;
        const wallThickness = 2;
        const fieldSize = 100;
        
        // Create border walls
        this.walls = [];
        
        // North wall
        this.walls.push(new Wall(
            this.scene,
            new THREE.Vector3(0, wallHeight/2, -fieldSize/2),
            new THREE.Vector3(fieldSize, wallHeight, wallThickness)
        ));

        // South wall
        this.walls.push(new Wall(
            this.scene,
            new THREE.Vector3(0, wallHeight/2, fieldSize/2),
            new THREE.Vector3(fieldSize, wallHeight, wallThickness)
        ));

        // East wall
        this.walls.push(new Wall(
            this.scene,
            new THREE.Vector3(fieldSize/2, wallHeight/2, 0),
            new THREE.Vector3(wallThickness, wallHeight, fieldSize)
        ));

        // West wall
        this.walls.push(new Wall(
            this.scene,
            new THREE.Vector3(-fieldSize/2, wallHeight/2, 0),
            new THREE.Vector3(wallThickness, wallHeight, fieldSize)
        ));

        // Add some interior walls for cover
        const interiorWalls = [
            // Horizontal walls
            { pos: [-25, wallHeight/2, -15], size: [20, wallHeight, wallThickness] },
            { pos: [25, wallHeight/2, 15], size: [20, wallHeight, wallThickness] },
            { pos: [0, wallHeight/2, 0], size: [30, wallHeight, wallThickness] },
            
            // Vertical walls
            { pos: [-15, wallHeight/2, -25], size: [wallThickness, wallHeight, 20] },
            { pos: [15, wallHeight/2, 25], size: [wallThickness, wallHeight, 20] }
        ];

        interiorWalls.forEach(wall => {
            this.walls.push(new Wall(
                this.scene,
                new THREE.Vector3(wall.pos[0], wall.pos[1], wall.pos[2]),
                new THREE.Vector3(wall.size[0], wall.size[1], wall.size[2])
            ));
        });

        // Create player tank
        this.player = new HumanTank(this.scene, 0x3498db);
        this.player.mesh.position.set(0, 1, 40); // South side
        this.player.mesh.rotation.y = Math.PI; // Face north

        // Create AI tank
        this.ai = new AITank(this.scene, 0xe74c3c, this.walls);
        this.ai.mesh.position.set(0, 1, -40); // North side
        this.ai.mesh.rotation.y = 0; // Face south (toward center)
    }

    setupControls() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('keypress', (e) => {
            if (e.code === 'Space') {
                this.player.fire(this.firstPersonMode ? this.camera.position : null);
            }
        });

        // Add view toggle
        window.addEventListener('keydown', (e) => {
            if (e.key === 'v') {
                this.firstPersonMode = !this.firstPersonMode;
                this.scopeOverlay.classList.toggle('active');
                this.player.setFirstPersonMode(this.firstPersonMode);
                
                if (this.firstPersonMode) {
                    this.camera.fov = 45;
                } else {
                    this.camera.fov = 60;
                }
                this.camera.updateProjectionMatrix();
            }
        });
    }

    onKeyDown(event) {
        switch(event.key) {
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'ArrowDown':
                this.keys.backward = true;
                break;
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'ArrowRight':
                this.keys.right = true;
                break;
        }
    }

    onKeyUp(event) {
        switch(event.key) {
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'ArrowDown':
                this.keys.backward = false;
                break;
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'ArrowRight':
                this.keys.right = false;
                break;
        }
    }

    onMouseMove(event) {
        if (this.firstPersonMode) {
            if (document.pointerLockElement) {
                // Use movement X/Y for turret rotation in first person
                this.player.rotateTurret(event.movementX * 0.003);
            }
        } else {
            // Original third person aiming
            const mouse = new THREE.Vector2(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1
            );

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);
            const intersects = raycaster.intersectObject(this.ground);

            if (intersects.length > 0) {
                const targetPoint = intersects[0].point;
                this.player.lookAt(targetPoint);
            }
        }
    }

    onMouseClick() {
        this.player.fire();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updatePlayer() {
        // Store current position
        const prevPosition = this.player.mesh.position.clone();
        
        // Update movement based on keys
        if (this.keys.forward) this.player.moveForward();
        if (this.keys.backward) this.player.moveBackward();
        if (this.keys.left) this.player.rotateLeft();
        if (this.keys.right) this.player.rotateRight();

        // Update turret rotation in first person mode
        if (this.firstPersonMode) {
            // Reset turret rotation to match tank body
            this.player.turret.rotation.y = 0;
        }

        // Update projectiles
        this.player.update();

        // Check for collisions after movement
        const tankBox = new THREE.Box3().setFromObject(this.player.mesh);
        let collision = false;

        for (const wall of this.walls) {
            const wallBox = new THREE.Box3().setFromObject(wall.mesh);
            if (tankBox.intersectsBox(wallBox)) {
                collision = true;
                break;
            }
        }

        // If collision occurred, revert to previous position
        if (collision) {
            this.player.mesh.position.copy(prevPosition);
        }
    }

    checkCollisions() {
        // Check AI tank wall collisions
        const prevAIPosition = this.ai.mesh.position.clone();
        const aiTankBox = new THREE.Box3().setFromObject(this.ai.mesh);
        
        let aiCollision = false;
        for (const wall of this.walls) {
            const wallBox = new THREE.Box3().setFromObject(wall.mesh);
            if (aiTankBox.intersectsBox(wallBox)) {
                aiCollision = true;
                break;
            }
        }

        if (aiCollision) {
            this.ai.mesh.position.copy(prevAIPosition);
        }

        // Check projectile collisions
        const tanks = [this.player, this.ai];
        for (const tank of tanks) {
            for (let i = tank.projectiles.length - 1; i >= 0; i--) {
                const projectile = tank.projectiles[i];
                const projectileBox = new THREE.Box3().setFromObject(projectile.mesh);

                // Check wall collisions
                let collision = false;
                for (const wall of this.walls) {
                    const wallBox = new THREE.Box3().setFromObject(wall.mesh);
                    if (projectileBox.intersectsBox(wallBox)) {
                        collision = true;
                        break;
                    }
                }

                // Check tank collisions
                for (const otherTank of tanks) {
                    if (tank !== otherTank) {
                        const tankBox = new THREE.Box3().setFromObject(otherTank.mesh);
                        if (projectileBox.intersectsBox(tankBox)) {
                            collision = true;
                            break;
                        }
                    }
                }

                if (collision) {
                    projectile.destroy();
                    tank.projectiles.splice(i, 1);
                }
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update game objects
        this.updatePlayer();
        this.ai.update(this.player);

        // Check collisions
        this.checkCollisions();

        // Update camera based on view mode
        if (this.firstPersonMode) {
            // First person turret view
            const scopePos = this.player.getTurretPosition();
            this.camera.position.copy(scopePos);
            this.camera.quaternion.copy(this.player.mesh.quaternion);
            this.player.turret.visible = false;
        } else {
            // Third person view
            const targetPosition = this.player.mesh.position.clone().add(this.thirdPersonOffset);
            this.camera.position.lerp(targetPosition, this.cameraLerpFactor);
            this.camera.lookAt(this.player.mesh.position);
            this.player.turret.visible = true;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
new Game();
