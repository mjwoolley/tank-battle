class Projectile {
    constructor(x, y, angle, fromPlayer) {
        this.x = x;
        this.y = y;
        this.radius = 3;
        this.width = 6;  
        this.height = 6; 
        this.speed = 150;
        this.angle = angle;
        this.fromPlayer = fromPlayer;
        this.tank = null; 
    }

    update(deltaTime, canvas) {
        // Move projectile
        this.x += Math.sin(this.angle) * this.speed * deltaTime;
        this.y -= Math.cos(this.angle) * this.speed * deltaTime;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.fromPlayer ? '#00ff00' : '#ff0000';
        ctx.fill();
        ctx.closePath();
    }

    isOffScreen(canvas) {
        // Check if projectile has hit any wall
        return this.x <= 0 || 
               this.x >= canvas.width || 
               this.y <= 0 || 
               this.y >= canvas.height;
    }
}
