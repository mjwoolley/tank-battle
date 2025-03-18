class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Create maze-like wall system
        this.barriers = this.generateBarriers();
        
        // Position tanks in valid positions
        const gridSize = 100;
        
        // Position player in bottom row, ensuring some space from walls
        this.player = new Tank(
            gridSize/2 + (Math.floor(Math.random() * (this.canvas.width/gridSize - 1)) * gridSize),
            this.canvas.height - gridSize/2,
            'blue',
            true
        );
        
        // Position enemy in top row, ensuring some space from walls
        this.enemies = [
            new Tank(
                gridSize/2 + (Math.floor(Math.random() * (this.canvas.width/gridSize - 1)) * gridSize),
                gridSize/2,
                'red',
                false
            )
        ];
        this.projectiles = [];
        this.gameOver = false;
        
        this.setupControls();
        this.lastTime = 0;
        this.start();
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            if (this.gameOver && e.key === 'r') {
                this.restart();
                return;
            }
            if (e.key === 'q') {
                this.endGame('Game Ended');
                return;
            }
            
            if (!this.gameOver) {
                switch(e.key) {
                    case 'ArrowLeft':
                        this.player.rotateLeft = true;
                        break;
                    case 'ArrowRight':
                        this.player.rotateRight = true;
                        break;
                    case 'ArrowUp':
                        this.player.moving = true;
                        break;
                    case 'ArrowDown':
                        this.player.reversing = true;
                        break;
                    case ' ':
                        this.player.fire(this.projectiles);
                        break;
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.player.rotateLeft = false;
                    break;
                case 'ArrowRight':
                    this.player.rotateRight = false;
                    break;
                case 'ArrowUp':
                    this.player.moving = false;
                    break;
                case 'ArrowDown':
                    this.player.reversing = false;
                    break;
            }
        });
    }

    start() {
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    gameLoop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.draw();

        if (!this.gameOver) {
            requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        }
    }

    update(deltaTime) {
        // Update tanks with wall collision
        this.player.update(deltaTime, this);
        this.enemies.forEach(enemy => {
            enemy.update(deltaTime, this);
            enemy.aiUpdate(this.player, this.projectiles, this);
        });

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            const newX = projectile.x + Math.sin(projectile.angle) * projectile.speed * deltaTime;
            const newY = projectile.y - Math.cos(projectile.angle) * projectile.speed * deltaTime;
            
            // Check wall collision
            if (this.checkWallCollision(projectile, newX, newY)) {
                projectile.tank.activeProjectile = null;
                this.projectiles.splice(i, 1);
                continue;
            }

            // Check if projectile hit game bounds
            if (newX <= 0 || newX >= this.canvas.width ||
                newY <= 0 || newY >= this.canvas.height) {
                projectile.tank.activeProjectile = null;
                this.projectiles.splice(i, 1);
                continue;
            }

            projectile.x = newX;
            projectile.y = newY;

            // Check collisions with tanks
            if (this.checkProjectileCollision(projectile)) {
                projectile.tank.activeProjectile = null;
                this.projectiles.splice(i, 1);
                continue;
            }
        }

        // Check game over conditions
        if (this.player.destroyed) {
            this.endGame('Game Over - You Lost!');
        } else if (this.enemies.every(enemy => enemy.destroyed)) {
            this.endGame('Congratulations - You Won!');
        }
    }

    checkProjectileCollision(projectile) {
        // Check collision with player
        if (!projectile.fromPlayer && this.player.checkCollision(projectile)) {
            this.player.destroyed = true;
            return true;
        }

        // Check collision with enemies
        for (let enemy of this.enemies) {
            if (!enemy.destroyed && projectile.fromPlayer && enemy.checkCollision(projectile)) {
                enemy.destroyed = true;
                return true;
            }
        }

        return false;
    }

    generateBarriers() {
        const walls = [];
        const wallThickness = 6;  // Reduced thickness

        // Create border walls
        const borders = [
            // Top wall
            { x: 0, y: 0, width: this.canvas.width, height: wallThickness },
            // Bottom wall
            { x: 0, y: this.canvas.height - wallThickness, width: this.canvas.width, height: wallThickness },
            // Left wall
            { x: 0, y: 0, width: wallThickness, height: this.canvas.height },
            // Right wall
            { x: this.canvas.width - wallThickness, y: 0, width: wallThickness, height: this.canvas.height }
        ];

        // Add borders to walls
        walls.push(...borders);

        // Create three L-shaped cover points
        const coverPoints = [
            // Left side cover
            {
                vertical: { x: 150, y: 100, width: wallThickness, height: 150 },
                horizontal: { x: 150, y: 250 - wallThickness, width: 100, height: wallThickness }
            },
            // Middle cover
            {
                vertical: { x: this.canvas.width/2, y: 200, width: wallThickness, height: 150 },
                horizontal: { x: this.canvas.width/2 - 100, y: 200, width: 100, height: wallThickness }
            },
            // Right side cover
            {
                vertical: { x: this.canvas.width - 150, y: 350, width: wallThickness, height: 150 },
                horizontal: { x: this.canvas.width - 250, y: 350, width: 100, height: wallThickness }
            }
        ];

        // Add all cover points to walls
        coverPoints.forEach(cover => {
            walls.push(cover.vertical, cover.horizontal);
        });

        this.gaps = [];
        return walls;
    }

    checkWallCollision(obj, newX, newY) {
        // First check game bounds
        if (newX - obj.width/2 <= 0 || 
            newX + obj.width/2 >= this.canvas.width ||
            newY - obj.height/2 <= 0 || 
            newY + obj.height/2 >= this.canvas.height) {
            return true;
        }

        // Then check walls
        for (const wall of this.barriers) {
            // Check if object would intersect with wall
            if (newX + obj.width/2 > wall.x && 
                newX - obj.width/2 < wall.x + wall.width &&
                newY + obj.height/2 > wall.y && 
                newY - obj.height/2 < wall.y + wall.height) {
                
                // Check if we're in a gap
                for (const gap of this.gaps) {
                    if (newX + obj.width/2 > gap.x && 
                        newX - obj.width/2 < gap.x + gap.width &&
                        newY + obj.height/2 > gap.y && 
                        newY - obj.height/2 < gap.y + gap.height) {
                        return false; // We're in a gap, so no collision
                    }
                }
                return true; // Hit a wall (not in a gap)
            }
        }
        return false;
    }

    checkBarrierOverlap(existingBarriers, newBarrier) {
        for (const barrier of existingBarriers) {
            if (!(newBarrier.x + newBarrier.width < barrier.x ||
                  newBarrier.x > barrier.x + barrier.width ||
                  newBarrier.y + newBarrier.height < barrier.y ||
                  newBarrier.y > barrier.y + barrier.height)) {
                return true;
            }
        }
        return false;
    }

    checkBarrierCollision(projectile) {
        for (const barrier of this.barriers) {
            if (projectile.x >= barrier.x &&
                projectile.x <= barrier.x + barrier.width &&
                projectile.y >= barrier.y &&
                projectile.y <= barrier.y + barrier.height) {
                return true;
            }
        }
        return false;
    }

    checkLineOfSight(fromX, fromY, toX, toY) {
        // Check if there's a direct line of sight between two points
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check multiple points along the line
        const steps = Math.ceil(distance / 5); // Check every 5 pixels for more accuracy
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = fromX + dx * t;
            const y = fromY + dy * t;
            
            // Check if this point intersects with any wall
            for (const wall of this.barriers) {
                if (x >= wall.x && x <= wall.x + wall.width &&
                    y >= wall.y && y <= wall.y + wall.height) {
                    // Found a wall blocking line of sight
                    return false;
                }
            }
        }
        
        return true; // No walls blocking line of sight
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw game border
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw walls
        this.ctx.fillStyle = '#ffffff';
        for (const wall of this.barriers) {
            this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        }

        // Draw game objects
        if (!this.player.destroyed) {
            this.player.draw(this.ctx);
        }
        
        this.enemies.forEach(enemy => {
            if (!enemy.destroyed) {
                enemy.draw(this.ctx);
            }
        });
        
        this.projectiles.forEach(projectile => {
            projectile.draw(this.ctx);
        });
    }

    endGame(message) {
        this.gameOver = true;
        const gameOverElement = document.getElementById('game-over');
        const gameOverText = document.getElementById('game-over-text');
        gameOverText.textContent = message;
        gameOverElement.classList.remove('hidden');
    }

    restart() {
        // Generate new cover points
        this.barriers = this.generateBarriers();
        
        // Position player in bottom portion
        this.player = new Tank(
            100 + Math.random() * (this.canvas.width - 200),
            this.canvas.height - 100,
            'blue',
            true
        );
        
        // Position enemy in top portion
        this.enemies = [
            new Tank(
                100 + Math.random() * (this.canvas.width - 200),
                100,
                'red',
                false
            )
        ];
        
        this.projectiles = [];
        this.gameOver = false;
        document.getElementById('game-over').classList.add('hidden');
        this.lastTime = performance.now();
        this.start();
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});
