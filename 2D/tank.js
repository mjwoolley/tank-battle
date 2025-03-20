class Tank {
    constructor(x, y, color, isPlayer) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;
        this.color = color;
        this.angle = 0;
        this.speed = 40;
        this.rotationSpeed = 0.75;
        this.lastShot = 0;
        this.shotCooldown = 5000;
        this.destroyed = false;
        this.isPlayer = isPlayer;
        this.activeProjectile = null;
        
        // Movement flags
        this.moving = false;
        this.reversing = false;
        this.rotateLeft = false;
        this.rotateRight = false;
        
        // Initialize AI properties
        if (!isPlayer) {
            this.lastKnownPlayerX = undefined;
            this.lastKnownPlayerY = undefined;
            this.reachedLastKnownPosition = false;
            this.patrolPoint = null;
        }
    }

    getNewPosition(deltaTime) {
        let newX = this.x;
        let newY = this.y;
        
        // Handle rotation
        let newAngle = this.angle;
        if (this.rotateLeft) {
            newAngle -= this.rotationSpeed * deltaTime;
        }
        if (this.rotateRight) {
            newAngle += this.rotationSpeed * deltaTime;
        }
        
        // Handle movement
        if (this.moving || this.reversing) {
            const direction = this.moving ? 1 : -1;
            newX += Math.sin(newAngle) * this.speed * deltaTime * direction;
            newY -= Math.cos(newAngle) * this.speed * deltaTime * direction;
        }
        
        return { x: newX, y: newY, angle: newAngle };
    }

    update(deltaTime, game) {
        const newPos = this.getNewPosition(deltaTime);
        
        // Check if new position would be within game bounds
        const inBounds = newPos.x >= this.width/2 && 
                        newPos.x <= game.canvas.width - this.width/2 &&
                        newPos.y >= this.height/2 && 
                        newPos.y <= game.canvas.height - this.height/2;
        
        // Check if new position would collide with walls
        const wouldCollide = game.checkWallCollision(this, newPos.x, newPos.y);
        
        // Update position only if it's valid
        if (inBounds && !wouldCollide) {
            this.x = newPos.x;
            this.y = newPos.y;
        }
        
        // Always update angle (rotation is always allowed)
        this.angle = newPos.angle;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw tank body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);

        // Draw cannon
        ctx.fillStyle = this.color;
        ctx.fillRect(-2, -this.height/2 - 10, 4, 20);

        ctx.restore();
    }

    fire(projectiles) {
        const now = Date.now();
        if (now - this.lastShot >= this.shotCooldown && !this.activeProjectile) {
            const projectile = new Projectile(
                this.x + Math.sin(this.angle) * (this.height/2 + 10),
                this.y - Math.cos(this.angle) * (this.height/2 + 10),
                this.angle,
                this.isPlayer
            );
            projectile.tank = this;
            this.activeProjectile = projectile;
            projectiles.push(projectile);
            this.lastShot = now;
        }
    }

    checkCollision(projectile) {
        // Use a more accurate hitbox-based collision detection
        // Calculate the rotated hitbox of the tank
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        // Check if the projectile is within the tank's radius first (quick check)
        const dx = projectile.x - this.x;
        const dy = projectile.y - this.y;
        const distanceSquared = dx * dx + dy * dy;
        const maxRadius = Math.max(halfWidth, halfHeight) + 5; // Add a small buffer
        
        if (distanceSquared > maxRadius * maxRadius) {
            return false; // Quick reject if too far
        }
        
        // For a more accurate check, we'll use a simplified rectangular hitbox
        // This is a bit more forgiving than a precise rotated rectangle check
        const distance = Math.sqrt(distanceSquared);
        return distance < (this.width / 2 + 5); // Add a small buffer for better gameplay
    }

    // AI behavior for enemy tanks
    aiUpdate(player, projectiles, game) {
        if (this.isPlayer || this.destroyed) return;
        
        // Simple AI: if player is in line of sight, try to shoot
        if (game.checkLineOfSight(this.x, this.y, player.x, player.y)) {
            // Calculate angle to player
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const targetAngle = Math.atan2(dx, -dy);
            
            // Rotate towards player
            const angleDiff = targetAngle - this.angle;
            const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
            
            if (normalizedDiff > 0.05) {
                this.rotateRight = true;
                this.rotateLeft = false;
            } else if (normalizedDiff < -0.05) {
                this.rotateLeft = true;
                this.rotateRight = false;
            } else {
                this.rotateLeft = false;
                this.rotateRight = false;
                
                // If facing player, shoot
                if (Math.abs(normalizedDiff) < 0.1) {
                    this.fire(projectiles);
                }
            }
        } else {
            // Random movement when player not in sight
            if (Math.random() < 0.01) {
                this.rotateLeft = Math.random() > 0.5;
                this.rotateRight = !this.rotateLeft;
            }
            
            if (Math.random() < 0.005) {
                this.moving = Math.random() > 0.3;
                this.reversing = Math.random() < 0.2 && !this.moving;
            }
        }
    }
}
