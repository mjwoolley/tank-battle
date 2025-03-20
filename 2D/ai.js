// Add AI behavior to Tank class
Tank.prototype.aiUpdate = function(player, projectiles, game) {
    if (this.isPlayer || this.destroyed) return;

    // Reset movement flags at start of each update
    this.moving = false;
    this.reversing = false;
    this.rotateLeft = false;
    this.rotateRight = false;

    // Check line of sight
    const hasLineOfSight = game.checkLineOfSight(this.x, this.y, player.x, player.y);

    // AI behavior states
    const PATROLLING = 'patrolling';  // No known player position
    const PURSUING = 'pursuing';       // Moving to last known position
    const ENGAGING = 'engaging';       // Can see player, engaging

    // Determine current state and update tracking
    let state = PATROLLING;

    if (hasLineOfSight) {
        // Update last known position when we see the player
        this.lastKnownPlayerX = player.x;
        this.lastKnownPlayerY = player.y;
        this.reachedLastKnownPosition = false;
        state = ENGAGING;
    } else if (this.lastKnownPlayerX !== undefined && !this.reachedLastKnownPosition) {
        // Lost sight but have a last known position to check
        state = PURSUING;
    }

    // State-based behavior
    switch (state) {
        case PATROLLING:
            // Move in a searching pattern
            if (!this.patrolPoint || this.reachedPatrolPoint()) {
                this.setNewPatrolPoint(game);
            }
            this.moveToPoint(this.patrolPoint.x, this.patrolPoint.y, game);
            break;

        case PURSUING:
            // Move towards last known position
            this.moveToPoint(this.lastKnownPlayerX, this.lastKnownPlayerY, game);
            
            // If we've reached the last known position
            const dxLast = this.lastKnownPlayerX - this.x;
            const dyLast = this.lastKnownPlayerY - this.y;
            const distanceToLastKnown = Math.sqrt(dxLast * dxLast + dyLast * dyLast);
            
            if (distanceToLastKnown < 50) {
                this.reachedLastKnownPosition = true;
            }
            break;

        case ENGAGING:
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
            break;
    }
};

// Helper methods for AI
Tank.prototype.setNewPatrolPoint = function(game) {
    // Set a random point in the game area
    const margin = 100;
    let x, y;
    let validPoint = false;
    
    // Try to find a valid point that doesn't collide with walls
    let attempts = 0;
    while (!validPoint && attempts < 10) {
        x = margin + Math.random() * (game.canvas.width - 2 * margin);
        y = margin + Math.random() * (game.canvas.height - 2 * margin);
        
        // Check if point is valid (not inside a wall)
        validPoint = !game.checkWallCollision(this, x, y);
        attempts++;
    }
    
    this.patrolPoint = { x, y };
};

Tank.prototype.reachedPatrolPoint = function() {
    if (!this.patrolPoint) return true;
    
    const dx = this.patrolPoint.x - this.x;
    const dy = this.patrolPoint.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < 50; // Consider "reached" if within 50 pixels
};

Tank.prototype.moveToPoint = function(targetX, targetY, game) {
    // Calculate angle to target
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const targetAngle = Math.atan2(dx, -dy);
    
    // Rotate towards target
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
        
        // If facing target, move forward
        if (Math.abs(normalizedDiff) < 0.3) {
            this.moving = true;
        }
    }
};
