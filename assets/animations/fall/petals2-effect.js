/**
 * Petals 2 Fall Effect Script (Canvas-based)
 * Tự quản lý: Canvas Setup, Animation Logic, Cleanup
 */

(function () {
  "use strict";

  var data = window.__fallEffectManagerData;
  if (!data || !data.container) {
    console.error("[Petals2Effect] Missing manager data");
    return;
  }

  var container = data.container;
  var config = data.config || {};
  var effectConfig = config.config || {};

  // ===== PHẦN 1: CANVAS SETUP & CSS =====
  var styleId = "fall-petals2-style";
  if (!document.getElementById(styleId)) {
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent =
      "#fall-effect-overlay #petal-canvas{" +
      "position:absolute;top:0;left:0;width:100%;height:100%;" +
      "pointer-events:none;display:block;" +
      "}";

    document.head.appendChild(style);

    data.registerCleanup(function () {
      if (style.parentNode) {
        style.remove();
      }
    });
  }

  // ===== PHẦN 2: CREATE CANVAS =====
  var canvas = document.createElement("canvas");
  canvas.id = "petal-canvas";
  canvas.width = container.clientWidth || window.innerWidth;
  canvas.height = container.clientHeight || window.innerHeight;
  container.appendChild(canvas);

  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;
  var petals = [];
  var animationId = null;
  var resizeListener = null;

  var COLORS = [
    "rgba(232,160,166,.85)",
    "rgba(201,104,114,.75)",
    "rgba(201,168,76,.6)",
    "rgba(184,217,198,.7)",
    "rgba(248,244,236,.65)",
    "rgba(255,182,193,.8)",
  ];

  // ===== PHẦN 3: ANIMATION LOGIC =====
  function Petal() {
    this.reset = function (fromTop) {
      this.x = Math.random() * W;
      this.y = fromTop ? -Math.random() * H * 0.3 : Math.random() * H;
      this.r = 3 + Math.random() * 7;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.vx = (Math.random() - 0.5) * 1.2;
      this.vy = 0.5 + Math.random() * 1.5;
      this.va = (Math.random() - 0.5) * 0.03;
      this.angle = Math.random() * Math.PI * 2;
      this.wobble = Math.random() * Math.PI * 2;
      this.wobbleSpeed = 0.02 + Math.random() * 0.04;
      this.type = Math.floor(Math.random() * 3);
      this.opacity = 0.4 + Math.random() * 0.6;
    };
    this.reset(false);
  }

  function drawOval(c, x, y, r, a, col, op) {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.globalAlpha = op;
    c.beginPath();
    c.ellipse(0, 0, r, r * 0.5, 0, 0, Math.PI * 2);
    c.fillStyle = col;
    c.fill();
    c.restore();
  }

  function drawHeart(c, x, y, r, a, col, op) {
    var s = r * 0.7;
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.globalAlpha = op;
    c.beginPath();
    c.moveTo(0, s * 0.3);
    c.bezierCurveTo(s * 0.8, -s * 0.3, s * 1.4, s * 0.6, 0, s * 1.2);
    c.bezierCurveTo(-s * 1.4, s * 0.6, -s * 0.8, -s * 0.3, 0, s * 0.3);
    c.fillStyle = col;
    c.fill();
    c.restore();
  }

  function drawLeaf(c, x, y, r, a, col, op) {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.globalAlpha = op;
    c.beginPath();
    c.moveTo(0, -r);
    c.bezierCurveTo(r * 0.8, -r * 0.3, r * 0.8, r * 0.3, 0, r);
    c.bezierCurveTo(-r * 0.8, r * 0.3, -r * 0.8, -r * 0.3, 0, -r);
    c.fillStyle = col;
    c.fill();
    c.restore();
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function init() {
    console.log(
      "[Petals2Effect] Init with " + (effectConfig.count || 80) + " petals",
    );

    var particleCount = effectConfig.count || 80;
    for (var i = 0; i < particleCount; i++) {
      var petal = new Petal();
      petals.push(petal);
    }

    resizeListener = function () {
      resize();
    };
    window.addEventListener("resize", resizeListener);

    function animate() {
      if (!ctx) return;

      ctx.clearRect(0, 0, W, H);
      petals.forEach(function (p) {
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * 0.5;
        p.y += p.vy;
        p.angle += p.va;

        if (p.y > H + 20) {
          p.reset(true);
        }

        if (p.type === 0) {
          drawOval(ctx, p.x, p.y, p.r, p.angle, p.color, p.opacity);
        } else if (p.type === 1) {
          drawHeart(ctx, p.x, p.y, p.r * 0.6, p.angle, p.color, p.opacity);
        } else {
          drawLeaf(ctx, p.x, p.y, p.r, p.angle, p.color, p.opacity);
        }
      });

      animationId = requestAnimationFrame(animate);
    }

    animate();

    // Slow down after 8 seconds
    setTimeout(function () {
      petals.forEach(function (p) {
        p.vy *= 0.5;
        p.opacity *= 0.65;
      });
    }, 8000);
  }

  function cleanup() {
    console.log("[Petals2Effect] Cleanup");

    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    if (resizeListener) {
      window.removeEventListener("resize", resizeListener);
    }

    petals = [];

    if (canvas && canvas.parentNode === container) {
      container.removeChild(canvas);
    }
  }

  data.registerCleanup(cleanup);
  init();
})();
