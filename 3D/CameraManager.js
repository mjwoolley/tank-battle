import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraManager {
    constructor(camera, rendererDomElement) {
        this.camera = camera;
        this.isFirstPerson = false;
        this.scopeOverlay = document.getElementById('scope-overlay');

        // Third-person controls (OrbitControls)
        this.orbitControls = new OrbitControls(camera, rendererDomElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.screenSpacePanning = false; // Keep panning relative to ground
        this.orbitControls.minDistance = 5;
        this.orbitControls.maxDistance = 50;
        this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going below ground
        this.orbitControls.enabled = true; // Start in third-person
        
        // First-person target/offset (relative to tank cannon)
        this.fpTargetOffset = new THREE.Vector3(0, 0.1, 0); // Slightly above cannon center
        this.fpCameraOffset = new THREE.Vector3(0, 0, -0.5); // Position camera slightly behind cannon origin
    }

    toggleView(playerTank) {
        this.isFirstPerson = !this.isFirstPerson;
        
        if (this.isFirstPerson) {
            this.orbitControls.enabled = false;
            this.scopeOverlay.classList.add('active');
            if (playerTank) {
                // Immediately snap to first-person view
                this.updateFirstPersonView(playerTank);
            }
        } else {
            this.orbitControls.enabled = true;
            this.scopeOverlay.classList.remove('active');
            // Orbit controls will handle the camera position
            // Optional: Reset orbit controls target if needed
            if (playerTank) {
                this.orbitControls.target.copy(playerTank.mesh.position);
            }
        }
        console.log("Camera view toggled. First person:", this.isFirstPerson);
    }

    update(playerTank) {
        if (!playerTank || playerTank.isDestroyed) {
             // If no player tank or it's destroyed, ensure orbit controls are enabled
             if (!this.orbitControls.enabled) {
                 this.orbitControls.enabled = true;
                 this.scopeOverlay.classList.remove('active');
                 this.isFirstPerson = false;
             }
             this.orbitControls.update(); // Still update orbit controls (allows panning around)
            return; 
        }

        if (this.isFirstPerson) {
            this.updateFirstPersonView(playerTank);
        } else {
            // Update orbit controls target to follow the tank
            this.orbitControls.target.lerp(playerTank.mesh.position, 0.1); // Smoothly follow
            this.orbitControls.update();
        }
    }

    updateFirstPersonView(playerTank) {
         if (!playerTank) return;

         // Get cannon world position and direction
         const cannonWorldPos = new THREE.Vector3();
         playerTank.cannon.getWorldPosition(cannonWorldPos);
         const cannonWorldDir = new THREE.Vector3();
         playerTank.cannon.getWorldDirection(cannonWorldDir);
 
         // Calculate camera position: start slightly behind cannon origin, along its axis
         const cameraPosition = playerTank.cannon.localToWorld(this.fpCameraOffset.clone());
 
         // Calculate target position: slightly offset from cannon origin, further along its direction
         const lookAtTarget = cannonWorldPos.clone().add(cannonWorldDir.multiplyScalar(10)); // Look 10 units ahead
         lookAtTarget.add(this.fpTargetOffset); // Apply slight vertical offset if needed
         
         this.camera.position.copy(cameraPosition);
         this.camera.lookAt(lookAtTarget);
     }

    // Call this when the window is resized
    onWindowResize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
}
