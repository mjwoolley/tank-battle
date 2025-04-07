export class InputHandler {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            turretLeft: false,
            turretRight: false,
            fire: false,
            toggleView: false,
            restart: false
        };

        // Bind event listeners
        window.addEventListener('keydown', (e) => this.onKeyChange(e, true));
        window.addEventListener('keyup', (e) => this.onKeyChange(e, false));
    }

    onKeyChange(event, isPressed) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = isPressed;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = isPressed;
                break;
            case 'KeyA':
                this.keys.left = isPressed;
                break;
            case 'KeyD':
                this.keys.right = isPressed;
                break;
            case 'ArrowLeft':
                this.keys.turretLeft = isPressed;
                break;
            case 'ArrowRight':
                this.keys.turretRight = isPressed;
                break;
            case 'Space':
                // Only register fire on keydown to prevent holding space
                if (isPressed) {
                    this.keys.fire = true; 
                } else {
                    this.keys.fire = false; // Reset on keyup
                }
                break;
            case 'KeyV':
                 // Only register toggle on keydown
                if (isPressed) {
                    this.keys.toggleView = true;
                } else {
                    this.keys.toggleView = false; // Reset on keyup
                }
                break;
            case 'KeyR':
                 // Only register restart on keydown
                 if (isPressed) {
                    this.keys.restart = true;
                } else {
                    this.keys.restart = false; // Reset on keyup
                }
                break;
        }
         // Prevent default browser actions for game keys
        if (Object.values(this.keys).includes(isPressed) && Object.keys(this.keys).includes(this.getKeyFromCode(event.code)) ) {
             event.preventDefault();
         }
    }
    
    // Helper to map code back to key name for preventDefault check
    getKeyFromCode(code) {
        switch (code) {
            case 'KeyW': case 'ArrowUp': return 'forward';
            case 'KeyS': case 'ArrowDown': return 'backward';
            case 'KeyA': return 'left';
            case 'KeyD': return 'right';
            case 'ArrowLeft': return 'turretLeft';
            case 'ArrowRight': return 'turretRight';
            case 'Space': return 'fire';
            case 'KeyV': return 'toggleView';
            case 'KeyR': return 'restart';
            default: return null;
        }
    }

    // Method to consume single-press actions like fire or toggle view
    consumeAction(actionName) {
        if (this.keys[actionName]) {
            this.keys[actionName] = false; // Reset after consumption
            return true;
        }
        return false;
    }
    
    // Getter for the current state (used by PlayerTank)
    getState() {
        return this.keys;
    }
}
