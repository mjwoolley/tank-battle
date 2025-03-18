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
        const dx = projectile.x - this.x;
        const dy = projectile.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.width / 2);
    }
}
