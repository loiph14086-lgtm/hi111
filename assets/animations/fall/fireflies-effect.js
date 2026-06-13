(function () {
  "use strict";

  var data = window.__fallEffectManagerData;
  if (!data || !data.container) return;

  var container = data.container;
  var config = data.config || {};
  var effectConfig = config.config || {};

  var styleId = "fall-fireflies-style";
  if (!document.getElementById(styleId)) {
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      #fall-effect-overlay .firefly-particle {
        position: absolute;
        top: -40px;
        width: var(--firefly-size);
        height: var(--firefly-size);
        border-radius: 999px;
        pointer-events: none;
        user-select: none;
        will-change: transform, opacity, filter;
        background:
          radial-gradient(circle, rgba(255,255,245,1) 0 16%, rgba(255,245,156,0.96) 17% 38%, rgba(142,255,176,0.3) 48%, rgba(142,255,176,0) 74%);
        box-shadow:
          0 0 9px rgba(255,246,147,0.88),
          0 0 22px rgba(154,255,178,0.5),
          0 0 36px rgba(255,220,87,0.22);
      }

      #fall-effect-overlay .firefly-particle::after {
        content: "";
        position: absolute;
        inset: -8px;
        border-radius: inherit;
        background: radial-gradient(circle, rgba(255,246,132,0.32), rgba(255,246,132,0));
        opacity: var(--firefly-halo);
      }

      @keyframes firefly-fall {
        0% { transform: translate3d(0,-40px,0) scale(0.7); opacity: 0; }
        12% { opacity: var(--firefly-opacity); }
        36% { transform: translate3d(var(--firefly-drift-a),34vh,0) scale(1.05); }
        68% { transform: translate3d(var(--firefly-drift-b),72vh,0) scale(0.9); opacity: var(--firefly-opacity); }
        100% { transform: translate3d(var(--firefly-drift-c),108vh,0) scale(0.72); opacity: 0; }
      }

      @keyframes firefly-glow {
        0%, 100% { filter: brightness(0.72) blur(0); opacity: 0.42; }
        18% { filter: brightness(1.9) blur(0.1px); opacity: 1; }
        42% { filter: brightness(0.85) blur(0); opacity: 0.5; }
        64% { filter: brightness(1.55) blur(0.15px); opacity: 0.92; }
        82% { filter: brightness(0.7) blur(0); opacity: 0.38; }
      }

      @keyframes firefly-sway {
        0%, 100% { margin-left: 0; }
        50% { margin-left: var(--firefly-sway); }
      }
    `;
    document.head.appendChild(style);
    data.registerCleanup(function () {
      style.remove();
    });
  }

  var particles = [];
  var pendingTimeouts = [];

  function randomPx(min, max) {
    return (min + Math.random() * (max - min)).toFixed(1) + "px";
  }

  function createParticle() {
    var maxCount = Number(effectConfig.maxCount) || 48;
    if (particles.length >= maxCount) return;

    var particle = document.createElement("span");
    particle.className = "firefly-particle";

    var size = 4 + Math.random() * 6;
    var duration = (Number(effectConfig.speed) || 18) + Math.random() * 10;
    var delay = Math.random() * 4;
    var swayBase = Number(effectConfig.sway) || 8;
    var sway = (Math.random() * 30 + swayBase * 4).toFixed(1) + "px";
    var opacity = (0.48 + Math.random() * 0.42).toFixed(2);
    var halo = (0.35 + Math.random() * 0.38).toFixed(2);

    particle.style.left = Math.random() * 100 + "%";
    particle.style.setProperty("--firefly-size", size.toFixed(1) + "px");
    particle.style.setProperty("--firefly-drift-a", randomPx(-70, 70));
    particle.style.setProperty("--firefly-drift-b", randomPx(-90, 90));
    particle.style.setProperty("--firefly-drift-c", randomPx(-55, 55));
    particle.style.setProperty("--firefly-sway", sway);
    particle.style.setProperty("--firefly-opacity", opacity);
    particle.style.setProperty("--firefly-halo", halo);
    particle.style.animation =
      "firefly-fall " + duration + "s linear " + delay + "s infinite, " +
      "firefly-sway " + (4.8 + Math.random() * 4.8) + "s ease-in-out " + delay + "s infinite, " +
      "firefly-glow " + (1.8 + Math.random() * 2.2) + "s ease-in-out " + delay + "s infinite";

    container.appendChild(particle);
    particles.push(particle);

    var timeoutId = setTimeout(function () {
      if (particle.parentNode === container) {
        particle.remove();
      }
      particles = particles.filter(function (item) {
        return item !== particle;
      });
    }, (duration + delay) * 1000);
    pendingTimeouts.push(timeoutId);
  }

  function init() {
    var initialCount = Number(effectConfig.count) || 26;
    for (var i = 0; i < initialCount; i += 1) {
      createParticle();
    }

    var interval = setInterval(function () {
      if (document.visibilityState === "visible") {
        createParticle();
      }
    }, Number(effectConfig.spawnInterval) || 850);

    data.registerInterval(interval);
  }

  function cleanup() {
    pendingTimeouts.forEach(clearTimeout);
    particles.forEach(function (particle) {
      if (particle.parentNode) particle.remove();
    });
    particles = [];
  }

  data.registerCleanup(cleanup);
  init();
})();
