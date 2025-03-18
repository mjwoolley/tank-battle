Tank.prototype.aiUpdate = function(player, projectiles, game) {
    if (this.isPlayer) return;

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
            const dxLast = this.lastKnownPlayerX - this.x;
            const dyLast = this.lastKnownPlayerY - this.y;
            const distanceToLastKnown = Math.sqrt(dxLast * dxLast + dyLast * dyLast);
            
            // Move to the last known position
            this.moveToPoint(this.lastKnownPlayerX, this.lastKnownPlayerY, game);
            
            // If we've reached the last known position
            if (distanceToLastKnown < 20) {
                this.reachedLastKnownPosition = true;
                // Start patrolling from here
                this.setNewPatrolPoint(game);
            }
            break;

        case ENGAGING:
            // Only happens when we have line of sight
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
            const angleToPlayer = Math.atan2(dx, -dy);

            // Normalize angle difference to [-PI, PI]
            let angleDiff = angleToPlayer - this.angle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            // Try to maintain medium range
            if (distanceToPlayer < 150) {
                // Too close, back away
                this.reversing = true;
            } else if (distanceToPlayer > 250) {
                // Too far, move closer
                this.moving = true;
            }

            // Rotate to face player
            if (Math.abs(angleDiff) > 0.1) {
                this.rotateRight = angleDiff > 0;
                this.rotateLeft = angleDiff < 0;
            } else if (Math.abs(angleDiff) < 0.2) {
                // Fire if aligned
                this.fire(projectiles);
            }
            break;
    }
};

Tank.prototype.checkWallAhead = function(game, distance = 30) {
    // Check points ahead of the tank for walls
    const lookAheadPoints = [
        { dx: 0, dy: -1, weight: 1 },     // Straight ahead
        { dx: 0.5, dy: -1, weight: 0.7 },  // Slightly right
        { dx: -0.5, dy: -1, weight: 0.7 }, // Slightly left
        { dx: 1, dy: -1, weight: 0.4 },    // More right
        { dx: -1, dy: -1, weight: 0.4 }    // More left
    ];

    let wallDanger = 0;
    const angleRad = this.angle;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    for (const point of lookAheadPoints) {
        // Rotate the look-ahead point based on tank's angle
        const rotatedX = point.dx * cos - point.dy * sin;
        const rotatedY = point.dx * sin + point.dy * cos;
        
        const checkX = this.x + rotatedX * distance;
        const checkY = this.y + rotatedY * distance;

        // Check if this point intersects with any wall
        for (const wall of game.barriers) {
            if (checkX >= wall.x - 5 && checkX <= wall.x + wall.width + 5 &&
                checkY >= wall.y - 5 && checkY <= wall.y + wall.height + 5) {
                wallDanger += point.weight;
                break;
            }
        }
    }

    return wallDanger;
};

Tank.prototype.findClearDirection = function(game) {
    const rotationIncrements = 16; // Check 16 different directions
    const fullCircle = Math.PI * 2;
    let bestAngle = this.angle;
    let lowestDanger = Infinity;

    for (let i = 0; i < rotationIncrements; i++) {
        const testAngle = (i / rotationIncrements) * fullCircle;
        const originalAngle = this.angle;
        
        // Temporarily set tank angle to test this direction
        this.angle = testAngle;
        const danger = this.checkWallAhead(game);
        
        // Consider both wall danger and how far we'd need to turn
        let angleDiff = Math.abs(testAngle - originalAngle);
        while (angleDiff > Math.PI) angleDiff = fullCircle - angleDiff;
        const totalCost = danger + (angleDiff / Math.PI) * 0.5; // Add turning cost

        if (totalCost < lowestDanger) {
            lowestDanger = totalCost;
            bestAngle = testAngle;
        }

        // Restore original angle
        this.angle = originalAngle;
    }

    return bestAngle;
};

Tank.prototype.moveToPoint = function(targetX, targetY, game) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const angleToTarget = Math.atan2(dx, -dy);
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
    
    // Check for walls ahead
    const wallDanger = this.checkWallAhead(game);
    
    if (wallDanger > 0.5) {
        // Wall detected, find clear direction
        const clearAngle = this.findClearDirection(game);
        
        // Normalize angle difference for rotation
        let angleDiff = clearAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Rotate away from wall
        this.rotateRight = angleDiff > 0;
        this.rotateLeft = angleDiff < 0;
        
        // If very close to wall, reverse
        if (wallDanger > 1.5) {
            this.moving = false;
            this.reversing = true;
        } else {
            this.moving = false;
            this.reversing = false;
        }
    } else {
        // No wall ahead, proceed to target
        let angleDiff = angleToTarget - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) > 0.1) {
            // Rotate towards target
            this.rotateRight = angleDiff > 0;
            this.rotateLeft = angleDiff < 0;
            this.moving = false;
        } else {
            // Clear path to move forward
            this.rotateRight = false;
            this.rotateLeft = false;
            this.moving = true;
            this.reversing = false;
        }
    }
};

Tank.prototype.setNewPatrolPoint = function(game) {
    // Pick a random point on the map that's not too close to walls
    const margin = 50;
    this.patrolPoint = {
        x: margin + Math.random() * (game.canvas.width - 2 * margin),
        y: margin + Math.random() * (game.canvas.height - 2 * margin)
    };
};

Tank.prototype.reachedPatrolPoint = function() {
    if (!this.patrolPoint) return true;
    const dx = this.patrolPoint.x - this.x;
    const dy = this.patrolPoint.y - this.y;
    return Math.sqrt(dx * dx + dy * dy) < 20;
};
