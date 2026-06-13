(function () {
  "use strict";

  var data = window.__fallEffectManagerData;
  if (!data || !data.container) return;

  var container = data.container;
  var config = data.config || {};
  var effectConfig = config.config || {};

  var styleId = "fall-stardust-style";
  if (!document.getElementById(styleId)) {
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      #fall-effect-overlay .stardust-particle {
        position: absolute;
        top: -70px;
        width: var(--star-size);
        height: var(--star-size);
        border-radius: 999px;
        pointer-events: none;
        user-select: none;
        will-change: transform, opacity;
        background:
          radial-gradient(circle, rgba(255,255,255,1) 0 22%, rgba(255,235,168,0.92) 23% 42%, rgba(255,214,112,0) 72%);
        box-shadow:
          0 0 8px rgba(255,236,174,0.85),
          0 0 18px rgba(135,206,255,0.34);
      }

      #fall-effect-overlay .stardust-particle::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 60%;
        width: 1px;
        height: var(--tail-length);
        border-radius: 999px;
        background: linear-gradient(to bottom, rgba(255,255,255,0.42), rgba(255,255,255,0));
        transform: translateX(-50%) rotate(var(--tail-rotate));
        transform-origin: top center;
      }

      @keyframes stardust-fall {
        0% { transform: translate3d(0,-70px,0) scale(0.72); opacity: 0; }
        14% { opacity: var(--star-opacity); }
        46% { transform: translate3d(var(--star-drift),48vh,0) scale(1); }
        82% { opacity: var(--star-opacity); }
        100% { transform: translate3d(calc(var(--star-drift) * -0.35),110vh,0) scale(0.82); opacity: 0; }
      }

      @keyframes stardust-twinkle {
        0%, 100% { filter: brightness(0.9); }
        45% { filter: brightness(1.8); }
        70% { filter: brightness(1.15); }
      }

      @keyframes stardust-sway {
        0%, 100% { margin-left: 0; }
        50% { margin-left: var(--star-sway); }
      }
    `;
    document.head.appendChild(style);
    data.registerCleanup(function () {
      style.remove();
    });
  }

  var particles = [];
  var pendingTimeouts = [];

  function createParticle() {
    var maxCount = Number(effectConfig.maxCount) || 44;
    if (particles.length >= maxCount) return;

    var particle = document.createElement("span");
    particle.className = "stardust-particle";

    var size = 3 + Math.random() * 7;
    var duration = (Number(effectConfig.speed) || 16) + Math.random() * 10;
    var delay = Math.random() * 5;
    var swayBase = Number(effectConfig.sway) || 6;
    var drift = (Math.random() * 110 - 55).toFixed(1) + "px";
    var sway = (Math.random() * 22 + swayBase * 3).toFixed(1) + "px";
    var opacity = (0.38 + Math.random() * 0.38).toFixed(2);
    var tailLength = (14 + Math.random() * 32).toFixed(1) + "px";
    var tailRotate = (Math.random() * 28 - 14).toFixed(1) + "deg";

    particle.style.left = Math.random() * 100 + "%";
    particle.style.setProperty("--star-size", size.toFixed(1) + "px");
    particle.style.setProperty("--star-drift", drift);
    particle.style.setProperty("--star-sway", sway);
    particle.style.setProperty("--star-opacity", opacity);
    particle.style.setProperty("--tail-length", tailLength);
    particle.style.setProperty("--tail-rotate", tailRotate);
    particle.style.animation =
      "stardust-fall " + duration + "s linear " + delay + "s infinite, " +
      "stardust-sway " + (5 + Math.random() * 4) + "s ease-in-out " + delay + "s infinite, " +
      "stardust-twinkle " + (2.8 + Math.random() * 2.4) + "s ease-in-out " + delay + "s infinite";

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
    var initialCount = Number(effectConfig.count) || 24;
    for (var i = 0; i < initialCount; i += 1) {
      createParticle();
    }

    var interval = setInterval(function () {
      if (document.visibilityState === "visible") {
        createParticle();
      }
    }, Number(effectConfig.spawnInterval) || 900);

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
