/**
 * Custom Icon Fall Effect Script
 * Tự quản lý: CSS Injection, HTML Creation, Animation Logic
 * Cho phép người dùng nhập icon tùy chỉnh
 */

(function () {
  "use strict";

  var data = window.__fallEffectManagerData;
  if (!data || !data.container) {
    console.error("[CustomIconEffect] Missing manager data");
    return;
  }

  var container = data.container;
  var config = data.config || {};
  var effectConfig = config.config || {};
  var customIcon = data.customIcon || "";
  var customIcons = data.customIcons || [];

  // ===== PHẦN 1: CSS INJECTION =====
  var styleId = "fall-custom-icon-style";
  if (!document.getElementById(styleId)) {
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent =
      "#fall-effect-overlay .fall-particle{" +
      "position:absolute;top:-12%;left:0;font-size:18px;line-height:1;" +
      "pointer-events:none;user-select:none;" +
      "will-change:transform,opacity,margin-left;" +
      "}" +
      "#fall-effect-overlay .fall-particle.custom-icon{" +
      "animation-name:fall-drop,fall-flutter;" +
      "animation-timing-function:linear,ease-in-out;" +
      "animation-iteration-count:1,infinite;" +
      "}" +
      "@keyframes fall-drop{" +
      "0%{transform:translateY(-20vh);opacity:0;}" +
      "10%{opacity:1;}" +
      "100%{transform:translateY(120vh);opacity:0;}" +
      "}" +
      "@keyframes fall-flutter{" +
      "0%,100%{opacity:1;margin-left:0;}" +
      "50%{opacity:0.75;margin-left:10px;}" +
      "}";

    document.head.appendChild(style);

    data.registerCleanup(function () {
      if (style.parentNode) {
        style.remove();
      }
    });
  }

  // ===== PHẦN 2: HTML INJECTION & PHẦN 3: LOGIC =====
  var normalizedIcons = (Array.isArray(customIcons) ? customIcons : [])
    .map(function (icon) {
      return String(icon || "").trim();
    })
    .filter(Boolean)
    .slice(0, 3);

  if (!normalizedIcons.length && customIcon) {
    normalizedIcons.push(customIcon);
  }

  var iconPool = normalizedIcons.length
    ? normalizedIcons
    : [config.defaultIcon || "✨"];

  var particles = [];
  var generationInterval = null;
  var pendingTimeouts = [];

  function createCustomParticle(iconOverride) {
    var particle = document.createElement("div");
    particle.className = "fall-particle custom-icon";

    var left = Math.random() * 100;
    var delay = Math.random() * 2;
    var duration = effectConfig.speed || 9 + Math.random() * 4;
    var flutterDuration = 3 + Math.random() * 2;

    particle.style.cssText =
      "left:" +
      left +
      "%;" +
      "opacity:" +
      (0.6 + Math.random() * 0.4) +
      ";" +
      "animation-duration:" +
      duration +
      "s," +
      flutterDuration +
      "s;" +
      "animation-delay:" +
      delay +
      "s," +
      delay +
      "s;";

    particle.textContent = iconOverride || iconPool[0];
    container.appendChild(particle);
    particles.push(particle);

    var timeoutId = setTimeout(
      function () {
        if (particle.parentNode === container) {
          container.removeChild(particle);
        }
        particles = particles.filter(function (p) {
          return p !== particle;
        });
      },
      (duration + delay) * 1000,
    );

    pendingTimeouts.push(timeoutId);
  }

  function init() {
    console.log(
      "[CustomIconEffect] Init with icons " +
        iconPool.join(" ") +
        " - " +
        effectConfig.count +
        " particles",
    );

    var particleCount = effectConfig.count || 10;
    var roundCount = Math.max(1, Math.floor(particleCount / iconPool.length));
    for (var round = 0; round < roundCount; round++) {
      for (var i = 0; i < iconPool.length; i++) {
        createCustomParticle(iconPool[i]);
      }
    }

    var generationRate = effectConfig.spawnInterval || 1200;
    generationInterval = setInterval(function () {
      if (container && container.parentNode) {
        for (var i = 0; i < iconPool.length; i++) {
          createCustomParticle(iconPool[i]);
        }
      }
    }, generationRate);

    data.registerInterval(generationInterval);
  }

  function cleanup() {
    console.log("[CustomIconEffect] Cleanup");
    if (generationInterval) {
      clearInterval(generationInterval);
    }
    pendingTimeouts.forEach(function (id) {
      clearTimeout(id);
    });
    pendingTimeouts = [];
    particles.forEach(function (p) {
      if (p.parentNode === container) {
        container.removeChild(p);
      }
    });
    particles = [];
  }

  data.registerCleanup(cleanup);
  init();
})();
