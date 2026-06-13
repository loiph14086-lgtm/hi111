/**
 * Sakura Fall Effect — wind-driven, physics-based DOM animation.
 * Auto wind gusts + pointer push + layered sine turbulence.
 */

(function () {
  "use strict";

  var data = window.__fallEffectManagerData;
  if (!data || !data.container) {
    console.error("[SakuraEffect] Missing manager data");
    return;
  }

  var container = data.container;

  // ===== CSS =====
  var styleId = "fall-sakura-style";
  if (!document.getElementById(styleId)) {
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent =
      "#fall-effect-overlay .sk-front," +
      "#fall-effect-overlay .sk-back{" +
        "position:absolute;inset:0;overflow:hidden;pointer-events:none;" +
      "}" +
      "#fall-effect-overlay .sk-front{z-index:1;}" +
      "#fall-effect-overlay .sk-back{z-index:0;}" +
      ".sk-p{" +
        "position:absolute;top:0;left:0;" +
        "background:radial-gradient(circle at 35% 40%,#ffd8e8 0,#f7b1cc 70%,#f1a1c1 100%);" +
        "border-radius:70% 30% 70% 30%;" +
        "will-change:transform;" +
      "}" +
      ".sk-pb{" +
        "position:absolute;top:0;left:0;" +
        "background:radial-gradient(circle at 40% 45%,#ffe4ef 0,#f6b9d4 72%,#ee9ac2 100%);" +
        "border-radius:75% 30% 70% 35%;" +
        "will-change:transform;" +
      "}";
    document.head.appendChild(style);
    data.registerCleanup(function () { if (style.parentNode) style.remove(); });
  }

  // ===== LAYERS =====
  var frontLayer = document.createElement("div");
  frontLayer.className = "sk-front";
  container.appendChild(frontLayer);

  var backLayer = document.createElement("div");
  backLayer.className = "sk-back";
  container.appendChild(backLayer);

  // ===== AUTO WIND SYSTEM =====
  // globalWind.x shifts smoothly between gusts — makes all petals drift together
  var globalWind = { x: 0.3, targetX: 0.5 };

  function scheduleGust() {
    var delay = 2200 + Math.random() * 3600;
    gustTimer = setTimeout(function () {
      // Random wind between -1.4 (left) and +1.4 (right)
      globalWind.targetX = -1.4 + Math.random() * 2.8;
      scheduleGust();
    }, delay);
  }

  var gustTimer = null;
  scheduleGust();

  // ===== POINTER WIND =====
  var ptr = { x: -9999, y: -9999, active: false, timeout: null };

  var onMove = function (e) {
    ptr.x = e.clientX;
    ptr.y = e.clientY;
    ptr.active = true;
    if (ptr.timeout) clearTimeout(ptr.timeout);
    ptr.timeout = setTimeout(function () { ptr.active = false; }, 160);
  };
  var onLeave = function () { ptr.active = false; };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerleave", onLeave);

  // ===== PARTICLES =====
  var particles = [];
  var animId = null;

  function spawn(p, W, H, fromTop) {
    p.x = Math.random() * W;
    p.y = fromTop ? -16 - Math.random() * H * 0.3 : Math.random() * H;
    // Larger initial horizontal velocity — petals start drifting sideways
    p.vx = -0.5 + Math.random() * 1.0;
    p.vy = 0.10 + Math.random() * 0.18;
    p.angle = Math.random() * 360;
    p.spin = (-0.5 + Math.random() * 1.0);
    // Two independent oscillators per petal for irregular turbulence
    p.phase1 = Math.random() * Math.PI * 2;
    p.phase2 = Math.random() * Math.PI * 2;
    p.freq1 = 0.25 + Math.random() * 0.35;
    p.freq2 = 0.15 + Math.random() * 0.25;
    p.sway = 8 + Math.random() * 14;
    p.opacity = p.baseOpacity * (0.78 + Math.random() * 0.38);
    p.el.style.opacity = String(p.opacity);
  }

  function buildField() {
    frontLayer.innerHTML = "";
    backLayer.innerHTML = "";
    particles.length = 0;
    var W = window.innerWidth;
    var H = window.innerHeight;
    var fc = Math.min(30, Math.max(14, Math.round(W / 64)));
    var bc = Math.min(16, Math.max(7, Math.round(W / 120)));

    for (var i = 0; i < fc; i++) {
      var el = document.createElement("span");
      el.className = "sk-p";
      var s = 8 + Math.random() * 10;
      el.style.width = s + "px";
      el.style.height = (s * 0.68) + "px";
      frontLayer.appendChild(el);
      var p = { el: el, depth: 1, size: s, baseOpacity: 0.58 };
      spawn(p, W, H, false);
      particles.push(p);
    }

    for (var j = 0; j < bc; j++) {
      var el2 = document.createElement("span");
      el2.className = "sk-pb";
      var s2 = 7 + Math.random() * 8;
      el2.style.width = s2 + "px";
      el2.style.height = (s2 * 0.66) + "px";
      backLayer.appendChild(el2);
      var p2 = { el: el2, depth: 0.65, size: s2, baseOpacity: 0.32 };
      spawn(p2, W, H, false);
      particles.push(p2);
    }
  }

  function animate(now) {
    var W = window.innerWidth;
    var H = window.innerHeight;
    var ptrRadius = 150;

    // Smoothly track wind target (lerp — about 1.2% per frame ≈ 5s to fully shift)
    globalWind.x += (globalWind.targetX - globalWind.x) * 0.012;

    particles.forEach(function (p) {
      // Layered turbulence: two sine waves at different frequencies
      var t = now * 0.001;
      var d1 = Math.sin(t * p.freq1 + p.phase1) * p.sway * 0.30;
      var d2 = Math.sin(t * p.freq2 + p.phase2) * p.sway * 0.14;

      // Pointer push
      if (ptr.active) {
        var dx = p.x - ptr.x;
        var dy = p.y - ptr.y;
        var dist = Math.hypot(dx, dy);
        if (dist < ptrRadius) {
          var f = (ptrRadius - dist) / ptrRadius;
          p.vx += (dx / (dist || 1)) * (1.6 + p.depth) * f;
          p.vy += (dy / (dist || 1)) * (1.3 + p.depth) * f * 0.5;
        }
      }

      // Global wind pushes all petals horizontally
      p.vx += globalWind.x * p.depth * 0.055;

      // Friction — gentle so wind keeps petals moving; clamp to prevent runaway
      p.vx = Math.max(-4, Math.min(4, p.vx)) * 0.975;

      // Gravity — slow, capped to keep fall gentle
      p.vy = Math.min(0.62, p.vy + 0.00065 * p.depth);

      p.x += p.vx + (d1 + d2) * p.depth;
      p.y += p.vy * p.depth;
      p.angle += p.spin * p.depth;

      if (p.y > H + 40 || p.x < -80 || p.x > W + 80) {
        spawn(p, W, H, true);
      }

      p.el.style.transform =
        "translate3d(" + p.x + "px," + p.y + "px,0) rotate(" + p.angle + "deg)";
    });

    animId = requestAnimationFrame(animate);
  }

  var onResize = function () { buildField(); };
  window.addEventListener("resize", onResize);

  buildField();
  animId = requestAnimationFrame(animate);

  data.registerCleanup(function () {
    if (animId) cancelAnimationFrame(animId);
    if (gustTimer) clearTimeout(gustTimer);
    if (ptr.timeout) clearTimeout(ptr.timeout);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerleave", onLeave);
    particles = [];
    if (frontLayer.parentNode) frontLayer.remove();
    if (backLayer.parentNode) backLayer.remove();
  });

})();
