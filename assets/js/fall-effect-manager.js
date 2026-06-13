/**
 * Fall Effect Manager
 * Loads and manages falling effects inside invitation pages.
 */

(function () {
  "use strict";

  if (window.fallEffectManager) {
    return;
  }

  var CONTAINER_ID = "fall-effect-overlay";
  var STYLE_ID = "fall-effect-manager-style";
  var SCRIPT_SELECTOR = 'script[data-fall-effect-script="true"]';

  var EFFECT_FILE_MAP = {
    snowflakes: "snowflakes-effect.js",
    "snow-icon": "snow-icon-effect.js",
    petals2: "petals2-effect.js",
    sakura: "sakura-effect.js",
    hearts: "hearts-effect.js",
    bubbles: "bubbles-effect.js",
    stardust: "stardust-effect.js",
    fireflies: "fireflies-effect.js",
    "canvas-hearts": "canvas-hearts-effect.js",
    leaves: "leaves-effect.js",
    custom: "custom-icon-effect.js",
  };

  var EFFECT_DEFAULTS = {
    snowflakes: { count: 16, speed: 9, sway: 3, spawnInterval: 850 },
    "snow-icon": { count: 12, speed: 8, sway: 4, spawnInterval: 900 },
    petals2: { count: 80, speed: 9, sway: 3, spawnInterval: 850 },
    sakura: { count: 46, speed: 8, sway: 9, spawnInterval: 0 },
    hearts: { count: 10, speed: 8, bounce: 0.6, spawnInterval: 950 },
    bubbles: { count: 18, speed: 14, sway: 5, spawnInterval: 1200 },
    stardust: { count: 24, speed: 16, sway: 6, spawnInterval: 900 },
    fireflies: { count: 26, speed: 18, sway: 8, spawnInterval: 850 },
    "canvas-hearts": { count: 40, speed: 1, spawnInterval: 1000 },
    leaves: { count: 60, speed: 1, spawnInterval: 1000 },
    custom: { count: 10, speed: 9, defaultIcon: "*", spawnInterval: 1200 },
  };

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "#" +
      CONTAINER_ID +
      "{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:9998;}";

    document.head.appendChild(style);
  }

  function ensureContainer() {
    var container = document.getElementById(CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = CONTAINER_ID;
      document.body.appendChild(container);
    }
    return container;
  }

  function removeManagedScript() {
    var oldScripts = document.querySelectorAll(SCRIPT_SELECTOR);
    oldScripts.forEach(function (script) {
      script.remove();
    });
  }

  function loadScriptWithFallback(urls, onSuccess, onError) {
    var index = 0;

    function tryNext() {
      if (index >= urls.length) {
        onError(new Error("Cannot load fall effect script"));
        return;
      }

      var src = urls[index++];
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.setAttribute("data-fall-effect-script", "true");

      script.onload = function () {
        onSuccess(script);
      };

      script.onerror = function () {
        script.remove();
        tryNext();
      };

      document.head.appendChild(script);
    }

    tryNext();
  }

  function FallEffectManager() {
    this.container = null;
    this.currentEffect = null;
    this.cleanupCallbacks = [];
    this.intervalIds = [];
    this.requestVersion = 0;
    this.__supportsCustomIcons = true;
    this.__supportsSnowIcon = true;
    this.__version = "2.2.0";
  }

  /**
   * HƯỚNG DẪN VIẾT EFFECT SCRIPT CON
   * ====================================
   * Mỗi file effect (e.g., leaves-effect.js, petals-effect.js) phải tuân thủ cấu trúc sau:
   *
   * PHẦN 1: CSS INJECTION
   *   - Tự tạo <style> tag và append vào document.head
   *   - Chứa @keyframes, .fall-particle styling, và CSS riêng cho loại hạt
   *   - Sử dụng CSS class/id để tránh xung đột
   *
   * PHẦN 2: HTML INJECTION
   *   - Truy cập data.container từ window.__fallEffectManagerData
   *   - Tạo DOM elements (particles) và append vào data.container
   *
   * PHẦN 3: LOGIC
   *   - Gọi init() function để khởi tạo hiệu ứng
   *   - Sử dụng data.registerCleanup(fn) để đăng ký cleanup callbacks
   *   - Sử dụng data.registerInterval(id) để tracking intervals
   *   - Lấy cấu hình từ data.config.config (count, speed, sway, spawnInterval, v.v.)
   *
   * EXAMPLE:
   *   var data = window.__fallEffectManagerData;
   *   if (!data) return;
   *
   *   var config = data.config.config;
   *   var container = data.container;
   *
   *   // 1. Inject CSS
   *   var style = document.createElement('style');
   *   style.textContent = '...@keyframes...';
   *   document.head.appendChild(style);
   *
   *   // 2. Create particles
   *   for (var i = 0; i < config.count; i++) {
   *     var particle = document.createElement('div');
   *     particle.className = 'fall-particle leaves-particle';
   *     container.appendChild(particle);
   *   }
   *
   *   // 3. Setup animation loop
   *   var intervalId = setInterval(function() {
   *     // animate particles
   *   }, config.spawnInterval);
   *
   *   data.registerInterval(intervalId);
   *
   *   // 4. Cleanup when manager calls cleanup()
   *   data.registerCleanup(function() {
   *     style.remove();
   *     container.innerHTML = '';
   *   });
   */

  FallEffectManager.prototype.registerCleanup = function (cleanupFn) {
    if (typeof cleanupFn === "function") {
      this.cleanupCallbacks.push(cleanupFn);
    }
  };

  FallEffectManager.prototype.registerInterval = function (intervalId) {
    if (intervalId) {
      this.intervalIds.push(intervalId);
    }
  };

  FallEffectManager.prototype.clearRuntime = function () {
    this.cleanupCallbacks.forEach(function (cleanupFn) {
      try {
        cleanupFn();
      } catch (err) {
        // noop
      }
    });
    this.cleanupCallbacks = [];

    this.intervalIds.forEach(function (intervalId) {
      try {
        clearInterval(intervalId);
      } catch (err) {
        // noop
      }
    });
    this.intervalIds = [];

    if (this.container) {
      this.container.innerHTML = "";
    }

    delete window.__fallEffectManagerData;
  };

  FallEffectManager.prototype.cleanup = function () {
    this.clearRuntime();
    removeManagedScript();
    this.currentEffect = null;
  };

  FallEffectManager.prototype.sanitizeCustomIcons = function (icons) {
    return (Array.isArray(icons) ? icons : [])
      .map(function (icon) {
        return String(icon || "").trim();
      })
      .filter(Boolean)
      .slice(0, 3);
  };

  FallEffectManager.prototype.normalizeCustomPayload = function (
    customPayload,
  ) {
    var customIcons = [];
    var customIcon = "";

    if (typeof customPayload === "string") {
      customIcon = customPayload.trim();
      if (customIcon) {
        customIcons = [customIcon];
      }
      return { customIcon: customIcon, customIcons: customIcons };
    }

    if (Array.isArray(customPayload)) {
      customIcons = this.sanitizeCustomIcons(customPayload);
      customIcon = customIcons[0] || "";
      return { customIcon: customIcon, customIcons: customIcons };
    }

    if (customPayload && typeof customPayload === "object") {
      customIcons = this.sanitizeCustomIcons(customPayload.customIcons);
      if (!customIcons.length && typeof customPayload.customIcon === "string") {
        customIcon = customPayload.customIcon.trim();
        if (customIcon) {
          customIcons = [customIcon];
        }
      }
      if (!customIcon && customIcons.length) {
        customIcon = customIcons[0];
      }
      return { customIcon: customIcon, customIcons: customIcons };
    }

    return { customIcon: "", customIcons: [] };
  };

  FallEffectManager.prototype.applyBodyState = function (effectId, customData) {
    if (!document.body) return;

    if (!effectId || effectId === "none") {
      document.body.removeAttribute("data-fall-effect");
      document.body.removeAttribute("data-fall-custom-icon");
      document.body.removeAttribute("data-fall-custom-icons");
      return;
    }

    document.body.setAttribute("data-fall-effect", effectId);

    var customIcon =
      customData && customData.customIcon ? customData.customIcon : "";
    var customIcons =
      customData && customData.customIcons ? customData.customIcons : [];

    if (customIcon) {
      document.body.setAttribute("data-fall-custom-icon", customIcon);
    } else {
      document.body.removeAttribute("data-fall-custom-icon");
    }

    if (customIcons.length) {
      document.body.setAttribute(
        "data-fall-custom-icons",
        customIcons.join("|"),
      );
    } else {
      document.body.removeAttribute("data-fall-custom-icons");
    }
  };

  FallEffectManager.prototype.getScriptCandidates = function (effectId) {
    var fileName = EFFECT_FILE_MAP[effectId];
    if (!fileName) return [];

    var stamp = Date.now() + "-" + this.requestVersion;

    return [
      "/assets/animations/fall/" + fileName + "?v=" + stamp,
      "/public/assets/animations/fall/" + fileName + "?v=" + stamp,
    ];
  };

  FallEffectManager.prototype.loadEffect = function (
    effectId,
    customData,
    version,
  ) {
    var self = this;
    var defaultConfig = EFFECT_DEFAULTS[effectId] || {};

    window.__fallEffectManagerData = {
      container: self.container,
      config: {
        id: effectId,
        config: defaultConfig,
        defaultIcon: EFFECT_DEFAULTS.custom.defaultIcon,
      },
      customIcon: customData.customIcon || "",
      customIcons: customData.customIcons || [],
      registerCleanup: function (cleanupFn) {
        self.registerCleanup(cleanupFn);
      },
      registerInterval: function (intervalId) {
        self.registerInterval(intervalId);
      },
    };

    loadScriptWithFallback(
      self.getScriptCandidates(effectId),
      function () {
        if (version !== self.requestVersion) {
          self.clearRuntime();
        }
      },
      function (err) {
        console.error("[FallEffectManager]", err.message || err);
      },
    );
  };

  FallEffectManager.prototype.init = function (effectId, customPayload) {
    if (!effectId || effectId === "none") {
      this.applyBodyState("none", { customIcon: "", customIcons: [] });
      this.cleanup();
      return;
    }

    if (!EFFECT_FILE_MAP[effectId]) {
      console.warn("[FallEffectManager] Unsupported effect:", effectId);
      return;
    }

    this.requestVersion += 1;
    var version = this.requestVersion;
    var customData = this.normalizeCustomPayload(customPayload);

    ensureStyle();
    this.container = ensureContainer();
    this.applyBodyState(effectId, customData);
    this.clearRuntime();
    removeManagedScript();

    this.currentEffect = effectId;
    this.loadEffect(effectId, customData, version);
  };

  FallEffectManager.prototype.autoInitFromPage = function () {
    var params = new URLSearchParams(window.location.search || "");
    var effectId =
      (document.body && document.body.getAttribute("data-fall-effect")) ||
      params.get("fall_effect");
    var customIcon =
      (document.body && document.body.getAttribute("data-fall-custom-icon")) ||
      params.get("fall_icon") ||
      "";
    var customIconsAttr =
      (document.body && document.body.getAttribute("data-fall-custom-icons")) ||
      params.get("fall_icons") ||
      "";
    var customIcons = customIconsAttr
      ? customIconsAttr
        .split("|")
        .map(function (icon) {
          return String(icon || "").trim();
        })
        .filter(Boolean)
        .slice(0, 3)
      : [];

    if (!customIcons.length && customIcon) {
      customIcons = [customIcon];
    }

    if (effectId) {
      this.init(effectId, {
        customIcon: customIcon || customIcons[0] || "",
        customIcons: customIcons,
      });
    }
  };

  window.fallEffectManager = new FallEffectManager();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window.fallEffectManager.autoInitFromPage();
    });
  } else {
    window.fallEffectManager.autoInitFromPage();
  }
})();
