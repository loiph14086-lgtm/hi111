if (window.openingEffectManager) {
  console.debug("Opening Effect: Script already loaded, skipping");
} else {
  class OpeningEffectManager {
    constructor() {
      this.effectMap = {
        door: "/assets/animations/opening/wedding-gate.js",
        flower: "/assets/animations/opening/flower.js",
        camera: "/assets/animations/opening/camera.js",
        video: "/assets/animations/opening/video.js",
        heartcard: "/assets/animations/opening/heart-card.js",
        envelope: "/assets/animations/opening/envelope.js",
        saveDateBloom: "/assets/animations/opening/save-date-bloom.js",
        savedatebloom: "/assets/animations/opening/save-date-bloom.js",
        weddingDoorCurtain: "/assets/animations/opening/wedding-door-curtain.js",
        weddingdoorcurtain: "/assets/animations/opening/wedding-door-curtain.js",
      };
      this.__version = "save-date-visible-1";
      this.currentEffect = null;
      this.shadowRoot = null;
    }

    isInEditorMode() {
      const forcePreview =
        window.__allowOpeningEffectPreview === true ||
        document.body?.getAttribute("data-opening-preview") === "true" ||
        document.documentElement?.getAttribute("data-opening-preview") ===
          "true";

      if (forcePreview) {
        return false;
      }

      const hasEditorHook =
        window.__htmlEditorHooked === true ||
        !!document.getElementById("__html_editor_hook__");

      if (hasEditorHook) {
        return true;
      }

      let topUrl = "";
      let topSearch = "";

      try {
        topUrl = window.top.location.href.toLowerCase();
        topSearch = window.top.location.search || "";
      } catch (e) {
        topUrl = window.location.href.toLowerCase();
        topSearch = window.location.search || "";
      }

      const urlParams = new URLSearchParams(window.location.search);
      const topParams = new URLSearchParams(topSearch);

      const isPreview =
        urlParams.get("preview") === "true" ||
        topParams.get("preview") === "true";

      const checkDetails = {
        isUltimatePath: topUrl.includes("ultimate-html-editor"),
        hasEditorKeyword: isPreview ? false : topUrl.includes("editor"),
      };

      const isEditor = Object.values(checkDetails).some((val) => val === true);

      if (isPreview) {
        return false;
      }

      return isEditor;
    }

    /**
     * Khởi chạy hiệu ứng
     * @param {string} overrideEffectId - ID ép chạy từ Editor (nếu có)
     */
    init(overrideEffectId) {
      // 1. Tìm thẻ intro làm "bãi đáp"
      const introEl = document.getElementById("intro");
      if (!introEl) {
        console.warn("Opening Effect: Không tìm thấy thẻ <div id='intro'>.");
        return;
      }

      // 2. Kiểm tra chặn render trong Workspace
      if (this.isInEditorMode()) {
        this.cleanup();
        return;
      }

      // 3. Lấy ID hiệu ứng: Ưu tiên override -> data trên #intro -> URL param
      const urlParams = new URLSearchParams(window.location.search);
      const effectId =
        overrideEffectId ||
        introEl.getAttribute("data-opening-effect") ||
        urlParams.get("opening_effect");

      if (!effectId || effectId === "none") {
        this.cleanup();
        return;
      }

      this.currentEffect = effectId;
      this.setupShadowDOM(introEl);
      this.loadEffectScript();
    }

    /**
     * Thiết lập Shadow DOM bên trong #intro
     */
    setupShadowDOM(introEl) {
      if (introEl.shadowRoot) {
        this.shadowRoot = introEl.shadowRoot;
      } else if (!this.shadowRoot || this.shadowRoot.host !== introEl) {
        this.shadowRoot = introEl.attachShadow({ mode: "open" });
      }

      this.shadowRoot.innerHTML = "";

      const baseStyle = document.createElement("style");
      baseStyle.textContent = `
      :host {
        position: fixed !important;
        inset: 0 !important;
        z-index: 99999 !important;
        background: #000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: opacity 1s ease;
        overflow: hidden !important;
      }
      :host(.away) {
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
      this.shadowRoot.appendChild(baseStyle);
    }

    loadEffectScript() {
      const scriptUrl = this.effectMap[this.currentEffect];
      if (!scriptUrl) {
        console.warn(
          `Opening Effect: Unknown effect "${this.currentEffect}", cleaning up overlay.`,
        );
        this.cleanup();
        return;
      }

      const oldScript = document.querySelector(`script[data-opening-script]`);
      if (oldScript) oldScript.remove();

      const script = document.createElement("script");
      script.src = scriptUrl;
      script.setAttribute("data-opening-script", this.currentEffect);
      script.defer = true;

      window.__openingEffectData = {
        shadowRoot: this.shadowRoot,
        templateData: this.getTemplateData(),
      };

      document.head.appendChild(script);
    }

    getTemplateData() {
      const getVal = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : "";
      };

      const groom =
        getVal('[data-editable="groom-name"]') ||
        getVal('[data-editable="groom_name"]');
      const bride =
        getVal('[data-editable="bride-name"]') ||
        getVal('[data-editable="bride_name"]');

      let dateRaw =
        getVal('[data-editable="date-date"]') ||
        getVal('[data-editable="event_date"]') ||
        document
          .querySelector("[data-editdate]")
          ?.getAttribute("data-editdate-value");

      let formattedDate = dateRaw || "";
      if (dateRaw && !isNaN(Date.parse(dateRaw))) {
        const d = new Date(dateRaw);
        formattedDate = `${String(d.getDate()).padStart(2, "0")} · ${String(d.getMonth() + 1).padStart(2, "0")} · ${d.getFullYear()}`;
      }

      return {
        groomName: groom || "Chú rể",
        brideName: bride || "Cô dâu",
        eventDate: formattedDate,
        coupleNames: groom && bride ? `${groom} & ${bride}` : "Lễ Thành Hôn",
      };
    }

    cleanup() {
      // Clear shadow DOM completely
      if (this.shadowRoot) {
        this.shadowRoot.innerHTML = "";
        try {
          this.shadowRoot.host?.classList?.remove("away");
        } catch (e) {
          // ignore
        }
      }

      // Remove old scripts
      const script = document.querySelector(`script[data-opening-script]`);
      if (script) script.remove();

      // Cancel any pending animations
      if (this.currentEffect) {
        const children = this.shadowRoot?.querySelectorAll("*") || [];
        children.forEach((el) => {
          el.style.animation = "none";
        });
      }

      // Clear effect data
      delete window.__openingEffectData;
      this.currentEffect = null;
    }
  }

  window.openingEffectManager = new OpeningEffectManager();

  const runInit = () => {
    const hasOpeningEffect =
      !!document.getElementById("intro")?.getAttribute("data-opening-effect") ||
      !!document.body?.getAttribute("data-opening-effect") ||
      !!document.documentElement?.getAttribute("data-opening-effect") ||
      new URLSearchParams(window.location.search).get("opening_effect");

    // Auto-run when an opening effect is configured (public/published pages).
    // Editor pages remain protected by isInEditorMode() inside init().
    if (hasOpeningEffect) {
      window.openingEffectManager.init();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runInit);
  } else {
    runInit();
  }
}

// isInEditorMode() {
//       // Lấy URL của trang ngoài cùng (thanh địa chỉ trình duyệt)
//       // Nếu bị chặn cross-origin, nó sẽ fallback về URL của iframe hiện tại
//       let topUrl = "";
//       try {
//         topUrl = window.top.location.href.toLowerCase();
//       } catch (e) {
//         topUrl = window.location.href.toLowerCase();
//       }

//       const urlParams = new URLSearchParams(window.location.search);
//       const topParams = new URLSearchParams(window.top.location.search);

//       // Kiểm tra Preview Mode ở cả Iframe và Trang cha
//       const isPreview = urlParams.get("preview") === "true" || topParams.get("preview") === "true";

//       // 1. Kiểm tra từng điều kiện cụ thể
//       const checkDetails = {
//         isUltimatePath: topUrl.includes("ultimate-html-editor"),
//         hasEditorKeyword: isPreview ? false : topUrl.includes("editor")
//       };

//       // 2. Ưu tiên Preview Mode
//       if (isPreview) {
//         console.group("Opening Effect: Mode Check - PREVIEW MODE (Allowed)");
//         console.table(checkDetails);
//         console.log("Top URL checked:", topUrl);
//         console.groupEnd();
//         return false;
//       }

//       const isEditor = Object.values(checkDetails).some(val => val === true);

//       console.group(isEditor ? "Opening Effect: IS EDITOR (Blocked)" : "Opening Effect: NOT EDITOR (Allowed)");
//       console.table(checkDetails);
//       console.log("Top URL checked:", topUrl);
//       console.groupEnd();

//       return isEditor;
//     }
