class Game {

    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;

        this.initializeBoard(this.canvas.width, this.canvas.height);

        this.setupControls();
        this.lastTime = 0;
        this.start();
    }

    initializeBoard(width, height) {
        // Create maze-like wall system
        this.barriers = this.generateBarriers();

        // Position tanks in valid positions
        const gridSize = 100;

        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        function isValidSpawnPoint(x, y, barriers, gridSize) {
            for (let wall of barriers) {
                let margin = 25; // Adjust margin as needed
                // If (x >= (wall.x - gridSize) && x < (wall.x + wall.width + gridSize) && y >= (wall.y - gridSize) && y < (wall.y + wall.height + gridSize)) {
                if (x >= (wall.x - margin) && x < (wall.x + wall.width + margin) && y >= (wall.y - margin) && y < (wall.y + wall.height + margin)) {
                    console.log(`Invalid spawn point: (${x}, ${y}) collides with wall at (${wall.x}, ${wall.y})`);
                    return false;
                }
            }
            return true;
        }

        function findValidSpawnPoint(canvasWidth, canvasHeight, barriers, gridSize, isBottomRow) {
            let x, y;
            do {
                x = gridSize / 2 + (getRandomInt(0, canvasWidth / gridSize - 1) * gridSize);
                y = isBottomRow ? canvasHeight - gridSize / 2 : gridSize / 2 + (getRandomInt(0, 1) * gridSize);
            } while (!isValidSpawnPoint(x, y, barriers, gridSize));
            console.log(`Valid spawn point: (${x}, ${y})`);
            return { x, y };
        }

        // Position player in bottom row, ensuring some space from barriers
        const playerSpawn = findValidSpawnPoint(width, height, this.barriers, gridSize, true);
        console.log(playerSpawn);
        this.player = new Tank(playerSpawn.x, playerSpawn.y, 'blue', true);

        // Position enemies in top row, ensuring some space from barriers
        this.enemies = [];
        for (let i = 0; i < 2; i++) {
            const enemySpawn = findValidSpawnPoint(this.canvas.width, this.canvas.height, this.barriers, gridSize, false);
            console.log(enemySpawn);
            this.enemies.push(new Tank(enemySpawn.x, enemySpawn.y, 'red', false));
        }

        this.projectiles = [];
        this.explosions = [];
        this.destroyedTanks = []; // Initialize destroyedTanks array
        this.gameOver = false;
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
                switch (e.key) {
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
            switch (e.key) {
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

        if (!this.gameOver) {
            this.update(deltaTime);
        }
        this.draw();

        // Continue the game loop even if game is over, to allow explosions to animate
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
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

            // Check tank collisions first (prioritize hits on tanks)
            if (this.checkProjectileCollision(projectile)) {
                projectile.tank.activeProjectile = null;
                this.projectiles.splice(i, 1);
                continue;
            }

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
        }

        // Check game over conditions
        if (this.player.destroyed) {
            this.destroyedTanks.push(this.player); // Add player to destroyedTanks array
            this.endGame('Game Over - You Lost!');
        } else if (this.enemies.every(enemy => enemy.destroyed)) {
            this.enemies.forEach(enemy => {
                this.destroyedTanks.push(enemy); // Add enemies to destroyedTanks array
            });
            this.endGame('You Win!!!'); // Changed win message
        }
    }

    checkProjectileCollision(projectile) {

        // Check collision with player
        if (!projectile.fromPlayer && !this.player.destroyed && this.player.checkCollision(projectile)) {
            console.log("Hit player!");
            this.player.destroyed = true;
            this.createExplosion(this.player.x, this.player.y);
            // Add player to destroyedTanks array immediately when hit
            this.destroyedTanks.push({ ...this.player, isPlayer: true });
            return true;
        }

        // Check collision with enemies
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (!enemy.destroyed && projectile.fromPlayer && enemy.checkCollision(projectile)) {
                console.log("Hit enemy!");
                enemy.destroyed = true;
                this.createExplosion(enemy.x, enemy.y);
                // Add enemy to destroyedTanks array immediately when hit
                this.destroyedTanks.push({ ...enemy, isPlayer: false });
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
                vertical: { x: this.canvas.width / 2, y: 200, width: wallThickness, height: 150 },
                horizontal: { x: this.canvas.width / 2 - 100, y: 200, width: 100, height: wallThickness }
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
        if (newX - obj.width / 2 <= 0 ||
            newX + obj.width / 2 >= this.canvas.width ||
            newY - obj.height / 2 <= 0 ||
            newY + obj.height / 2 >= this.canvas.height) {
            return true;
        }

        // Then check walls
        for (const wall of this.barriers) {
            // Check if object would intersect with wall
            if (newX + obj.width / 2 > wall.x &&
                newX - obj.width / 2 < wall.x + wall.width &&
                newY + obj.height / 2 > wall.y &&
                newY - obj.height / 2 < wall.y + wall.height) {

                // Check if we're in a gap
                for (const gap of this.gaps) {
                    if (newX + obj.width / 2 > gap.x &&
                        newX - obj.width / 2 < gap.x + gap.width &&
                        newY + obj.height / 2 > gap.y &&
                        newY - obj.height / 2 < gap.y + gap.height) {
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

        // Draw destroyed tank wrecks first (so they appear under everything else)
        if (this.destroyedTanks && this.destroyedTanks.length > 0) {
            this.destroyedTanks.forEach(wreck => {
                this.drawTankWreck(wreck);
            });
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

        // Draw explosions LAST (so they appear on top of everything)
        if (this.explosions && this.explosions.length > 0) {
            console.log(`Drawing ${this.explosions.length} explosions`);

            this.explosions.forEach((explosion, index) => {
                if (explosion.active) {
                    console.log(`Drawing explosion ID: ${explosion.id}, frame: ${explosion.frame}/${explosion.totalFrames}, radius: ${explosion.maxRadius}`);

                    // Make explosions 50% smaller than before
                    const originalMaxRadius = explosion.maxRadius;
                    explosion.maxRadius *= 1.5; // Was 3, now 1.5 (50% of original)

                    this.drawExplosion(explosion);

                    // Restore original radius
                    explosion.maxRadius = originalMaxRadius;

                    // Advance the frame
                    explosion.frame++;
                    if (explosion.frame >= explosion.totalFrames) {
                        console.log(`Explosion ID: ${explosion.id} completed animation`);
                        explosion.active = false;
                    }
                }
            });

            // Only remove inactive explosions AFTER drawing all explosions for this frame
            const beforeCount = this.explosions.length;
            this.explosions = this.explosions.filter(explosion => explosion.active);
            const afterCount = this.explosions.length;

            if (beforeCount !== afterCount) {
                console.log(`Removed ${beforeCount - afterCount} inactive explosions, ${afterCount} remaining`);
            }
        }

        // Draw "BOOM!" text during explosions
        if (this.explosions && this.explosions.length > 0) {
            this.explosions.forEach(explosion => {
                // Only show BOOM text for the first part of the explosion
                if (explosion.frame < explosion.totalFrames * 0.3) {
                    this.ctx.font = 'bold 48px Arial';
                    this.ctx.fillStyle = 'white';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('BOOM!', explosion.x, explosion.y - 50);
                }
            });
        }
    }

    drawTankWreck(tank) {
        const ctx = this.ctx;

        // Draw a damaged tank wreck
        ctx.save();
        ctx.translate(tank.x, tank.y);

        // Draw tank body (darker and damaged)
        ctx.fillStyle = tank.isPlayer ? '#444444' : '#553333';
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 2;

        // Draw damaged tank body
        ctx.beginPath();
        ctx.rect(-tank.width / 2, -tank.height / 2, tank.width, tank.height);
        ctx.fill();
        ctx.stroke();

        // Draw damage details
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;

        // Draw cracks and damage
        ctx.beginPath();
        ctx.moveTo(-tank.width / 2, -tank.height / 4);
        ctx.lineTo(tank.width / 3, tank.height / 3);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(tank.width / 3, -tank.height / 3);
        ctx.lineTo(-tank.width / 4, tank.height / 4);
        ctx.stroke();

        // Draw broken turret
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.arc(0, 0, tank.width / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw broken gun barrel (shorter and bent)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(tank.width / 2, tank.height / 6);
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw smoke effect
        if (Math.random() < 0.05) { // Occasionally add smoke puffs
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            ctx.beginPath();
            ctx.arc(Math.random() * tank.width / 2 - tank.width / 4,
                -tank.height / 2 - Math.random() * 10,
                5 + Math.random() * 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    endGame(message) {
        this.gameOver = true;
        const gameStatus = document.getElementById('gameStatus');
        
        // Reset any inline styles that might have been set elsewhere
        gameStatus.removeAttribute('style');
        
        // Set display to block to make it visible
        gameStatus.style.display = 'block';
        
        // Add restart instructions
        gameStatus.innerHTML = message + '<br><span style="font-size: 18px">Press R to restart, Q to quit</span>';

        console.log("Game over, but animation loop will continue for explosions");
    }

    restart() {
        // Generate new cover points
        this.barriers = this.generateBarriers();
        this.initializeBoard(this.canvas.width, this.canvas.height);

        document.getElementById('gameStatus').style.display = 'none';
        this.lastTime = performance.now();
        this.start();
    }

    // Create explosion at the given coordinates
    createExplosion(x, y) {
        // Make sure explosions array is initialized
        if (!this.explosions) {
            this.explosions = [];
        }

        const explosion = {
            x: x,
            y: y,
            frame: 0,
            totalFrames: 60,  // Reduced for testing
            maxRadius: 150,
            active: true,
            id: Date.now() // Add a unique ID for tracking
        };

        this.explosions.push(explosion);
        console.log(`Created explosion at (${x}, ${y}), total explosions: ${this.explosions.length}, ID: ${explosion.id}`);

        // Play explosion sound (if available)
        const explosionSound = new Audio('../sounds/explosion-42132.mp3'); // Use the actual sound file
        explosionSound.volume = 0.3;
        try {
            explosionSound.play().catch(e => console.log('Audio play failed:', e));
        } catch (e) {
            console.log('Audio play error:', e);
        }
    }

    // Draw explosion animation - simplified for reliability
    drawExplosion(explosion) {
        const ctx = this.ctx;
        const progress = explosion.frame / explosion.totalFrames;
        const radius = explosion.maxRadius * Math.sin(progress * Math.PI);

        // Simple, reliable explosion drawing
        ctx.save();

        // Draw outer explosion circle
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 165, 0, 0.7)';  // Orange with transparency
        ctx.fill();

        // Draw inner explosion circle
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';  // Yellow with transparency
        ctx.fill();

        // Draw core
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();

        // Draw additional visual effects based on the explosion frame
        if (explosion.frame < explosion.totalFrames * 0.3) {
            // Draw radiating lines in the early part of the explosion
            const lineCount = 12;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3;

            for (let i = 0; i < lineCount; i++) {
                const angle = (i / lineCount) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(explosion.x, explosion.y);
                ctx.lineTo(
                    explosion.x + Math.cos(angle) * radius * 1.2,
                    explosion.y + Math.sin(angle) * radius * 1.2
                );
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}

// Start the game when the page loads
window.onload = function () {
    const canvas = document.getElementById('gameCanvas');
    new Game(canvas);
};
