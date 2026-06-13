(function () {
    "use strict";
  
    var data = window.__fallEffectManagerData;
    if (!data || !data.container) return;
  
    var container = data.container;
    var config = data.config || {};
    var effectConfig = config.config || {};
  
    // Create canvas element
    var canvas = document.createElement('canvas');
    canvas.id = 'canvas-hearts-effect';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0'; // Behind most content
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W; 
    canvas.height = H;

    const hearts = [];
    const colors = effectConfig.colors || ['rgba(203,216,224,0.6)', 'rgba(76,116,147,0.4)', 'rgba(207,170,102,0.5)', 'rgba(255,255,255,0.7)'];
    const count = effectConfig.count || 40;

    for (let i = 0; i < count; i++) {
        hearts.push({
            x: Math.random() * W, y: Math.random() * H,
            s: Math.random() * 2 + 1, c: colors[Math.floor(Math.random() * colors.length)],
            v: Math.random() * 1 + 0.5, a: Math.random() * Math.PI * 2
        });
    }

    function drawHeart(x, y, s, c, a) {
        ctx.save(); 
        ctx.translate(x, y); 
        ctx.rotate(a); 
        ctx.scale(s, s); 
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-5, -5, -10, 5, 0, 15);
        ctx.bezierCurveTo(10, 5, 5, -5, 0, 0);
        ctx.fill(); 
        ctx.restore();
    }

    let animationFrameId;

    function render() {
        ctx.clearRect(0, 0, W, H);
        hearts.forEach(h => {
            h.y += h.v; h.x += Math.sin(h.y * 0.02) * 0.5; h.a += 0.01;
            if (h.y > H + 20) { h.y = -20; h.x = Math.random() * W; }
            drawHeart(h.x, h.y, h.s, h.c, h.a);
        });
        animationFrameId = requestAnimationFrame(render);
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

    render();
})();
