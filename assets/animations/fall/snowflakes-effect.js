/**
 * Snowflakes Fall Effect Script
 * Implements dynamic snow generation with visibility pause/resume.
 */

(function () {
  "use strict";

  var data = window.__fallEffectManagerData;
  if (!data || !data.container) {
    console.error("[SnowflakesEffect] Missing manager data");
    return;
  }

  var container = data.container;
  var config = data.config || {};
  var effectConfig = config.config || {};

  var styleId = "fall-snowflakes-style";
  if (!document.getElementById(styleId)) {
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent =
      "#fall-effect-overlay.snow-container{" +
      "position:fixed;top:0;left:0;overflow:hidden;" +
      "width:100vw;height:100vh;z-index:99999;pointer-events:none;" +
      "}" +
      "#fall-effect-overlay .snowflake{" +
      "position:absolute;background-color:#fff;border-radius:50%;" +
      "opacity:0.8;pointer-events:none;will-change:transform,opacity;" +
      "}" +
      "@keyframes fall{" +
      "0%{opacity:0;transform:translateY(0);}" +
      "10%{opacity:1;}" +
      "100%{opacity:0.5;transform:translateY(100vh);}" +
      "}" +
      "@keyframes diagonal-fall{" +
      "0%{opacity:0;transform:translate(0,0);}" +
      "10%{opacity:1;}" +
      "100%{opacity:0.25;transform:translate(10vw,100vh);}" +
      "}";

    document.head.appendChild(style);

    data.registerCleanup(function () {
      if (style.parentNode) {
        style.remove();
      }
    });
  }

  container.classList.add("snow-container");

  var particlesPerThousandPixels =
    Number(effectConfig.particlesPerThousandPixels) || 0.1;
  var fallSpeed = Number(effectConfig.fallSpeed) || 1.25;
  var pauseWhenNotActive = effectConfig.pauseWhenNotActive !== false;
  var maxSnowflakes = Number(effectConfig.maxCount) || 200;

  var snowflakes = [];
  var pendingTimeouts = [];
  var snowflakeInterval = null;
  var resizeTimeout = null;
  var isTabActive = true;
  var destroyed = false;

  function removeTrackedTimeout(id) {
    pendingTimeouts = pendingTimeouts.filter(function (item) {
      return item !== id;
    });
  }

  function removeSnowflake(snowflake) {
    var index = snowflakes.indexOf(snowflake);
    if (index !== -1) {
      snowflakes.splice(index, 1);
    }

    if (snowflake.parentNode === container) {
      snowflake.remove();
    }
  }

  function resetSnowflake(snowflake) {
    var size = Math.random() * 5 + 1;
    var viewportWidth = Math.max(window.innerWidth - size, 0);
    var animationDuration = (Math.random() * 3 + 2) / fallSpeed;

    snowflake.style.width = size + "px";
    snowflake.style.height = size + "px";
    snowflake.style.left = Math.random() * viewportWidth + "px";
    snowflake.style.top = -size + "px";
    snowflake.style.animationDuration = animationDuration + "s";
    snowflake.style.animationTimingFunction = "linear";
    snowflake.style.animationName =
      Math.random() < 0.5 ? "fall" : "diagonal-fall";

    var timeoutId = setTimeout(function () {
      removeTrackedTimeout(timeoutId);
      removeSnowflake(snowflake);
    }, animationDuration * 1000);

    pendingTimeouts.push(timeoutId);
  }

  function createSnowflake() {
    if (destroyed || !isTabActive || !container || !container.parentNode) {
      return;
    }

    if (snowflakes.length >= maxSnowflakes) {
      return;
    }

    var snowflake = document.createElement("div");
    snowflake.className = "snowflake";

    snowflakes.push(snowflake);
    container.appendChild(snowflake);
    resetSnowflake(snowflake);
  }

  function getResponsiveParticleCount() {
    var numberOfParticles =
      Math.ceil((window.innerWidth * window.innerHeight) / 1000) *
      particlesPerThousandPixels;

    if (!numberOfParticles || numberOfParticles < 1) {
      numberOfParticles = 1;
    }

    return numberOfParticles;
  }

  function generateSnowflakes() {
    if (destroyed) return;

    clearInterval(snowflakeInterval);
    snowflakeInterval = null;

    var numberOfParticles = getResponsiveParticleCount();
    var interval = Math.max(50, 5000 / numberOfParticles);

    snowflakeInterval = setInterval(function () {
      if (isTabActive && snowflakes.length < maxSnowflakes) {
        requestAnimationFrame(createSnowflake);
      }
    }, interval);

    data.registerInterval(snowflakeInterval);
  }

  function handleVisibilityChange() {
    if (!pauseWhenNotActive || destroyed) {
      return;
    }

    isTabActive = !document.hidden;
    if (isTabActive) {
      generateSnowflakes();
    } else {
      clearInterval(snowflakeInterval);
      snowflakeInterval = null;
    }
  }

  function handleResize() {
    if (destroyed) return;

    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      generateSnowflakes();
    }, 300);
  }

  function init() {
    var initialCount = Math.min(
      maxSnowflakes,
      Math.max(
        6,
        Number(effectConfig.count) || Math.ceil(getResponsiveParticleCount()),
      ),
    );

    for (var i = 0; i < initialCount; i++) {
      createSnowflake();
    }

    generateSnowflakes();

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  function cleanup() {
    destroyed = true;

    clearInterval(snowflakeInterval);
    snowflakeInterval = null;

    clearTimeout(resizeTimeout);
    resizeTimeout = null;

    pendingTimeouts.forEach(function (id) {
      clearTimeout(id);
    });
    pendingTimeouts = [];

    snowflakes.slice().forEach(function (snowflake) {
      removeSnowflake(snowflake);
    });
    snowflakes = [];

    window.removeEventListener("resize", handleResize);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    container.classList.remove("snow-container");
  }

  data.registerCleanup(cleanup);
  init();
})();
