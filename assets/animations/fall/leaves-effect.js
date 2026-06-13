(function () {
    "use strict";
  
    var data = window.__fallEffectManagerData;
    if (!data || !data.container) return;
  
    var container = data.container;
    var config = data.config || {};
    var effectConfig = config.config || {};
  
    // Create canvas element
    var canvas = document.createElement('canvas');
    canvas.id = 'canvas-leaves-effect';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0'; 
    container.appendChild(canvas);
  
    const ctx = canvas.getContext('2d');
    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W; 
    canvas.height = H;
  
    const particles = [];
    const COLORS = effectConfig.colors || [
        'rgba(88, 129, 87, 0.75)',   /* Xanh tươi */
        'rgba(163, 177, 138, 0.8)',  /* Xanh rêu sáng */
        'rgba(52, 78, 65, 0.65)',    /* Xanh sậm */
        'rgba(201, 168, 76, 0.55)'   /* Vàng úa điểm xuyết */
    ];
    const count = effectConfig.count || 60;
  
    function Particle(fromTop) {
        this.x = Math.random() * W;
        this.y = fromTop ? -Math.random() * H * 0.3 : Math.random() * H;
        this.r = 4 + Math.random() * 8; // Kích thước lá
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.vx = (Math.random() - 0.5) * 1.5; // Tốc độ ngang
        this.vy = 0.8 + Math.random() * 1.2; // Tốc độ rơi dọc
        this.va = (Math.random() - 0.5) * 0.05; // Tốc độ xoay
        this.angle = Math.random() * Math.PI * 2;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.02 + Math.random() * 0.03;
        this.opacity = 0.4 + Math.random() * 0.6;

        this.reset = function (fromTopReset) {
            this.x = Math.random() * W;
            this.y = fromTopReset ? -Math.random() * H * 0.1 : Math.random() * H;
            this.r = 4 + Math.random() * 8;
            this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
            this.vx = (Math.random() - 0.5) * 1.5;
            this.vy = 0.8 + Math.random() * 1.2;
            this.va = (Math.random() - 0.5) * 0.05;
            this.angle = Math.random() * Math.PI * 2;
            this.wobble = Math.random() * Math.PI * 2;
            this.wobbleSpeed = 0.02 + Math.random() * 0.03;
            this.opacity = 0.4 + Math.random() * 0.6;
        };
    }
  
    function drawLeaf(c, x, y, r, angle, col, op) {
        c.save();
        c.translate(x, y);
        c.rotate(angle);
        c.globalAlpha = op;
        c.beginPath();
        c.moveTo(0, -r);
        c.quadraticCurveTo(r, -r * 0.5, r, r * 0.5);
        c.quadraticCurveTo(0, r, 0, r * 0.8);
        c.quadraticCurveTo(-r, r, -r, -r * 0.5);
        c.quadraticCurveTo(0, -r, 0, -r);
        c.fillStyle = col;
        c.fill();
        c.restore();
    }
  
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(false));
    }

    let animationFrameId;
  
    function animate() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
            p.wobble += p.wobbleSpeed;
            p.x += p.vx + Math.sin(p.wobble) * 0.8; 
            p.y += p.vy;
            p.angle += p.va;
  
            if (p.y > H + 20) p.reset(true);
  
            drawLeaf(ctx, p.x, p.y, p.r, p.angle, p.color, p.opacity);
        });
        animationFrameId = requestAnimationFrame(animate);
    }
  
    function handleResize() {
        W = window.innerWidth; 
        H = window.innerHeight; 
        canvas.width = W; 
        canvas.height = H;
    }
  
    window.addEventListener('resize', handleResize);
  
    data.registerCleanup(() => {
        window.removeEventListener('resize', handleResize);
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        if (canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
    });
  
    animate();
})();
