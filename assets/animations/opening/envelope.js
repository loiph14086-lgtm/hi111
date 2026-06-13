(function () {
  if (!window.__openingEffectData || !window.__openingEffectData.shadowRoot) {
    console.warn("Envelope Effect: No shadow root available");
    return;
  }

  const shadowRoot = window.__openingEffectData.shadowRoot;
  const templateData = window.__openingEffectData.templateData;

  // Detect language from templateData or localStorage
  const savedLang = templateData?.lang || localStorage.getItem("i18nextLng") || "vi";
  const langKey = savedLang.startsWith("en") ? "en" : "vi";
  
  const translations = {
    vi: {
      inviteTitle: "TRÂN TRỌNG KÍNH MỜI",
      sealText: "Wedding"
    },
    en: {
      inviteTitle: "YOU ARE INVITED",
      sealText: "Wedding"
    }
  };
  
  const i18n = translations[langKey] || translations.vi;

  const css = [
    "* { margin: 0; padding: 0; box-sizing: border-box; }",
    ":host {",
    "  font-family: 'Cormorant Garamond', serif;",
    "  position: fixed !important; inset: 0 !important;",
    "  z-index: 99999 !important;",
    "  display: flex !important; align-items: center !important; justify-content: center !important;",
    "  background: url('https://i.postimg.cc/9QQr2NtC/background5.png') center/cover no-repeat !important;",
    "  background-color: #FDFBF7 !important;",
    "  cursor: pointer;",
    "  transition: opacity 0.6s ease, visibility 0.6s !important;",
    "}",
    ":host(.away) { opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }",
    ".invite-wrapper { position: relative; width: 340px; text-align: center; transition: all 0.6s ease; }",
    ".invite-title { color: #8d6e63; font-size: 20px; letter-spacing: 3px; margin-bottom: 20px; }",
    ".invite-guest { font-size: 22px; color: #6d4c41; margin-bottom: 8px; font-weight: 500; }",
    ".couple-name { margin-top: 20px; font-family: 'Great Vibes', cursive; font-size: 34px; color: #b08968; }",
    ".invite-line { width: 160px; height: 1px; background: #c9a961; margin: 15px auto 40px; }",
    ".envelope { position: relative; width: 260px; margin: auto; }",
    ".envelope img { width: 100%; display: block; }",
    ".waxseal { position: absolute; top: 62%; left: 50%; transform: translate(-50%, -50%); width: 90px; height: 90px; border-radius: 50%; overflow: hidden; animation: bumpbamp 1.5s infinite alternate; }",
    ".seal-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-family: 'Great Vibes', cursive; font-size: 12px; color: white; letter-spacing: 1px; }",
    ".waxseal img { width: 100%; height: 100%; object-fit: cover; }",
    ".click-hint { position: absolute; top: 65%; left: 53%; transform: translateX(-50%) !important; width: 40px; animation: blink 1.5s infinite; }",
    ".click-hint img { width: 100%; }",
    ".decor-left { position: absolute; top: 0; width: 80px; left: -40px; }",
    ".decor-right { position: absolute; top: 120px; width: 80px; right: -40px; }",
    ".decor-left img, .decor-right img { width: 100%; }",
    ".date { margin-top: 40px; font-size: 26px; letter-spacing: 3px; color: #a1887f; }",
    ".fade-out { opacity: 0; pointer-events: none; transform: scale(0.9); }",
    "@keyframes blink { 0%, 100% { opacity: 0.2; transform: translateX(-50%) scale(0.9); } 50% { opacity: 1; transform: translateX(-50%) scale(1); }",
    "@keyframes bumpbamp { 0% { transform: translate(-50%, -50%) scale(1); } 100% { transform: translate(-50%, -50%) scale(1.2); }"
  ].join(" ");

  // Inject fonts
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Great+Vibes&display=swap";
  document.head.appendChild(fontLink);

  const styleSheet = document.createElement("style");
  styleSheet.textContent = css;
  shadowRoot.appendChild(styleSheet);

  // Create HTML
  const container = document.createElement("div");
  container.innerHTML = [
    '<div class="invite-wrapper" id="envelope-wrapper">',
    '  <div class="invite-title">' + i18n.inviteTitle + '</div>',
    '  <div class="invite-line"></div>',
    '  <div class="envelope">',
    '    <img src="https://i.postimg.cc/Dz74SwKY/envelope2.png">',
    '    <div class="waxseal">',
    '      <img src="https://i.postimg.cc/gJTxty6d/red-3d.png">',
    '      <span class="seal-text">' + i18n.sealText + '</span>',
    '    </div>',
    '    <div class="click-hint">',
    '      <img src="https://i.postimg.cc/rsjPLmMF/click.png">',
    '    </div>',
    '    <div class="decor-left">',
    '      <img src="https://i.postimg.cc/1RrTFW6H/heart-2.png">',
    '    </div>',
    '    <div class="decor-right">',
    '      <img src="https://i.postimg.cc/KYQkBhGc/flower.png">',
    '    </div>',
    '  </div>',
    '</div>'
  ].join("");

  shadowRoot.appendChild(container);

  // Logic - Hide envelope and show main content
  const wrapper = shadowRoot.getElementById("envelope-wrapper");
  const host = shadowRoot.host;
  let isOpened = false;
  
  // Ensure wrapper is visible initially
  if (wrapper) {
    wrapper.style.display = "block";
  }
  
  function openEnvelope() {
    if (isOpened) return;
    isOpened = true;
    
    // Fade out wrapper
    if (wrapper) {
      wrapper.style.transition = "opacity 0.5s ease";
      wrapper.style.opacity = "0";
    }
    
    // Hide host after animation
    setTimeout(function() {
      if (wrapper) {
        wrapper.style.display = "none";
      }
      // Add away class to hide entire shadow host
      host.classList.add("away");
    }, 500);
  }
  
  // Listen on host or wrapper
  host.addEventListener("click", openEnvelope);
  if (wrapper) {
    wrapper.addEventListener("click", openEnvelope);
  }
})();