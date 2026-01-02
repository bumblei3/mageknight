/**
 * Particle - Core particle class for effects
 */
export class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || (Math.random() - 0.5) * 2;
        this.vy = options.vy || (Math.random() - 0.5) * 2;
        this.life = options.life || 1.0;
        this.decay = options.decay || 0.01;
        this.size = options.size || 3;
        this.color = options.color || '#ffffff';
        this.gravity = options.gravity || 0;
        this.opacity = 1;
        this.type = options.type || 'circle';
    }

    update(deltaTime = 1) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.vy += this.gravity * deltaTime;
        this.life -= this.decay * deltaTime;
        this.opacity = Math.max(0, this.life);
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;

        switch (this.type) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'star':
                this.drawStar(ctx);
                break;
            case 'spark':
                this.drawSpark(ctx);
                break;
            case 'heart':
                this.drawHeart(ctx);
                break;
            case 'skull':
                this.drawSkull(ctx);
                break;
            case 'cross':
                this.drawCross(ctx);
                break;
        }
        ctx.restore();
    }

    drawStar(ctx) {
        const spikes = 5;
        const outerRadius = this.size;
        const innerRadius = this.size / 2;

        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes;
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    drawSpark(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 2, this.y - this.vy * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.size;
        ctx.stroke();
    }

    drawHeart(ctx) {
        const x = this.x, y = this.y, size = this.size;
        ctx.beginPath();
        ctx.moveTo(x, y + size / 4);
        ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
        ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.8, x, y + size);
        ctx.bezierCurveTo(x, y + size * 0.8, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
        ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
        ctx.fill();
    }

    drawSkull(ctx) {
        const x = this.x, y = this.y, size = this.size;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - size * 0.6, y + size * 0.5, size * 1.2, size * 0.8);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x - size * 0.3, y, size * 0.25, 0, Math.PI * 2);
        ctx.arc(x + size * 0.3, y, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    drawCross(ctx) {
        const x = this.x, y = this.y, size = this.size;
        const thickness = size * 0.4;
        ctx.fillRect(x - thickness / 2, y - size, thickness, size * 2);
        ctx.fillRect(x - size, y - thickness / 2, size * 2, thickness);
    }
}
