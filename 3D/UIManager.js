export class UIManager {
    constructor() {
        this.infoElement = document.getElementById('info');
        this.gameOverElement = null; // Created dynamically
        this.viewModeElement = null; // View mode indicator removed
        this.scopeOverlay = document.getElementById('scope-overlay'); // Needed by CameraManager too

         if (!this.infoElement) console.error("UI Error: #info element not found!");
         if (!this.scopeOverlay) console.error("UI Error: #scope-overlay element not found!");
    }

    showGameOver(onRestartCallback) {
        if (this.gameOverElement) return; // Already showing

        this.gameOverElement = document.createElement('div');
        this.gameOverElement.id = 'game-over';
        this.gameOverElement.style.position = 'absolute';
        this.gameOverElement.style.top = '50%';
        this.gameOverElement.style.left = '50%';
        this.gameOverElement.style.transform = 'translate(-50%, -50%)';
        this.gameOverElement.style.color = 'red';
        this.gameOverElement.style.fontSize = '48px';
        this.gameOverElement.style.fontFamily = 'Arial';
        this.gameOverElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.gameOverElement.style.padding = '20px';
        this.gameOverElement.style.borderRadius = '10px';
        this.gameOverElement.style.textAlign = 'center';
        this.gameOverElement.innerHTML = 'GAME OVER<br><span style="font-size: 24px;">Press R to Restart</span>';
        document.body.appendChild(this.gameOverElement);
        
        // Store the restart callback to be used by the input handler or game manager
        this.onRestartCallback = onRestartCallback; 
    }

    hideGameOver() {
        if (this.gameOverElement) {
            document.body.removeChild(this.gameOverElement);
            this.gameOverElement = null;
            this.onRestartCallback = null; // Clear callback
        }
    }

    // Method to update general info (could be expanded)
    updateInfo(text) {
        if (this.infoElement) {
            this.infoElement.innerHTML = text;
        }
    }

     // Check if the game over screen is currently active
    isGameOverVisible() {
        return !!this.gameOverElement;
    }
}
