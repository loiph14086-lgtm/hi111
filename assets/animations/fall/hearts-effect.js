(function () {
  "use strict";

  var data = window.__fallEffectManagerData;
  if (!data || !data.container) return;

  var container = data.container;
  var config = data.config || {};
  var effectConfig = config.config || {};

  var styleId = "fall-hearts-refined-style";
  if (!document.getElementById(styleId)) {
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      #fall-effect-overlay .fall-particle {
        position: absolute;
        top: -50px;
        pointer-events: none;
        user-select: none;
        will-change: transform, opacity;
      }

      @keyframes fall-animation {
        0% { transform: translateY(0) rotate(0deg) translateX(0); opacity: 0; }
        10% { opacity: 0.8; }
        90% { opacity: 0.8; }
        100% { transform: translateY(110vh) rotate(720deg) translateX(50px); opacity: 0; }
      }

      @keyframes sway {
        0%, 100% { margin-left: 0; }
        50% { margin-left: 30px; }
      }
    `;
    document.head.appendChild(style);
    data.registerCleanup(() => style.remove());
  }

  const heartSVG = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  `;

  var particles = [];
  var pendingTimeouts = [];
  const colors = ["#e62315", "#f19355", "#e2b07e", "#f08080"];

  function createHeart() {
    var particle = document.createElement("div");
    particle.className = "fall-particle";
    
    var left = Math.random() * 100;
    var duration = 6 + Math.random() * 6; 
    var size = 10 + Math.random() * 15; 
    var color = colors[Math.floor(Math.random() * colors.length)];
    var delay = Math.random() * 5;

    particle.innerHTML = heartSVG;
    particle.style.left = left + "%";
    particle.style.color = color;
    particle.style.width = size + "px";
    particle.style.opacity = "0";
    
    particle.style.animation = `
      fall-animation ${duration}s linear ${delay}s infinite,
      sway ${2 + Math.random() * 2}s ease-in-out ${delay}s infinite
    `;

    container.appendChild(particle);
    particles.push(particle);

    var timeoutId = setTimeout(() => {
      if (particle.parentNode === container) {
        container.removeChild(particle);
      }
      particles = particles.filter(p => p !== particle);
    }, (duration + delay) * 1000);
    pendingTimeouts.push(timeoutId);
  }

  function init() {
    var initialCount = effectConfig.count || 15;
    for (var i = 0; i < initialCount; i++) {
      createHeart();
    }

    var interval = setInterval(() => {
      if (container && container.parentNode) {
        createHeart();
      }
    }, effectConfig.spawnInterval || 800);

    data.registerInterval(interval);
  }

  function cleanup() {
    pendingTimeouts.forEach(clearTimeout);
    particles.forEach(p => p.parentNode === container && container.removeChild(p));
  }

  data.registerCleanup(cleanup);
  init();
})();