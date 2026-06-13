(function () {
  "use strict";

  var data = window.__fallEffectManagerData;
  if (!data || !data.container) return;

  var container = data.container;
  var config = data.config || {};
  var effectConfig = config.config || {};

  var styleId = "fall-bubbles-style";
  if (!document.getElementById(styleId)) {
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      #fall-effect-overlay .bubble-particle {
        position: absolute;
        top: -80px;
        border-radius: 50%;
        pointer-events: none;
        user-select: none;
        will-change: transform, opacity;
        background:
          radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95) 0 9%, transparent 10%),
          radial-gradient(circle at 70% 74%, rgba(56,182,255,0.16), transparent 36%),
          radial-gradient(circle at 44% 40%, rgba(255,255,255,0.24), rgba(255,255,255,0.05) 58%, transparent 72%);
        border: 1px solid rgba(255,255,255,0.58);
        box-shadow:
          inset -5px -7px 13px rgba(56,182,255,0.1),
          inset 5px 6px 10px rgba(255,255,255,0.45),
          0 8px 22px rgba(56,182,255,0.08);
      }

      @keyframes bubble-soft-fall {
        0% { transform: translate3d(0,-80px,0) scale(0.88); opacity: 0; }
        12% { opacity: var(--bubble-opacity); }
        50% { transform: translate3d(var(--bubble-drift),52vh,0) scale(1); }
        88% { opacity: var(--bubble-opacity); }
        100% { transform: translate3d(calc(var(--bubble-drift) * -0.45),110vh,0) scale(1.08); opacity: 0; }
      }

      @keyframes bubble-soft-sway {
        0%, 100% { margin-left: 0; }
        50% { margin-left: var(--bubble-sway); }
      }
    `;
    document.head.appendChild(style);
    data.registerCleanup(function () {
      style.remove();
    });
  }

  var bubbles = [];
  var pendingTimeouts = [];

  function createBubble() {
    var maxCount = Number(effectConfig.maxCount) || 34;
    if (bubbles.length >= maxCount) return;

    var bubble = document.createElement("span");
    bubble.className = "bubble-particle";

    var size = 14 + Math.random() * 36;
    var duration = (Number(effectConfig.speed) || 14) + Math.random() * 9;
    var delay = Math.random() * 4;
    var drift = (Math.random() * 90 - 45).toFixed(1) + "px";
    var swayBase = Number(effectConfig.sway) || 5;
    var sway = (Math.random() * 28 + swayBase * 4).toFixed(1) + "px";
    var opacity = (0.26 + Math.random() * 0.26).toFixed(2);

    bubble.style.left = Math.random() * 100 + "%";
    bubble.style.width = size + "px";
    bubble.style.height = size + "px";
    bubble.style.setProperty("--bubble-drift", drift);
    bubble.style.setProperty("--bubble-sway", sway);
    bubble.style.setProperty("--bubble-opacity", opacity);
    bubble.style.animation =
      "bubble-soft-fall " + duration + "s linear " + delay + "s infinite, " +
      "bubble-soft-sway " + (4 + Math.random() * 4) + "s ease-in-out " + delay + "s infinite";

    container.appendChild(bubble);
    bubbles.push(bubble);

    var timeoutId = setTimeout(function () {
      if (bubble.parentNode === container) {
        bubble.remove();
      }
      bubbles = bubbles.filter(function (item) {
        return item !== bubble;
      });
    }, (duration + delay) * 1000);
    pendingTimeouts.push(timeoutId);
  }

  function init() {
    var initialCount = Number(effectConfig.count) || 18;
    for (var i = 0; i < initialCount; i += 1) {
      createBubble();
    }

    var interval = setInterval(function () {
      if (document.visibilityState === "visible") {
        createBubble();
      }
    }, Number(effectConfig.spawnInterval) || 1200);

    data.registerInterval(interval);
  }

  function cleanup() {
    pendingTimeouts.forEach(clearTimeout);
    bubbles.forEach(function (bubble) {
      if (bubble.parentNode) bubble.remove();
    });
    bubbles = [];
  }

  data.registerCleanup(cleanup);
  init();
})();
