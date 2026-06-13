(function () {
  "use strict";

  var data = window.__fallEffectManagerData;
  if (!data || !data.container) return;

  var container = data.container;
  var config = data.config || {};
  var effectConfig = config.config || {};

  // --- 1. CSS NÂNG CẤP (Hiệu ứng rơi cực nhẹ) ---
  var styleId = "fall-snow-svg-style";
  if (!document.getElementById(styleId)) {
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      #fall-effect-overlay .snow-svg {
        position: absolute;
        top: -20px;
        pointer-events: none;
        user-select: none;
        will-change: transform, opacity;
        fill: white;
        filter: drop-shadow(0 0 2px rgba(255,255,255,0.5));
      }

      @keyframes snow-gentle-fall {
        0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
        20% { opacity: 0.8; }
        80% { opacity: 0.8; }
        100% { transform: translateY(105vh) translateX(30px) rotate(180deg); opacity: 0; }
      }

      @keyframes snow-drift {
        0%, 100% { margin-left: 0; }
        50% { margin-left: 50px; }
      }
    `;
    document.head.appendChild(style);
    data.registerCleanup(() => style.remove());
  }

  // --- 2. SVG DATA (Mẫu bông tuyết tinh xảo) ---
  const snowSVGPath = `<svg class="snow-svg" viewBox="0 0 24 24"><path d="M13,2V5.08L15.41,2.67L16.83,4.08L13,7.91V11H16.09L19.92,7.17L21.33,8.59L18.92,11H22V13H18.92L21.33,15.41L19.92,16.83L16.09,13H13V16.09L16.83,19.92L15.41,21.33L13,18.92V22H11V18.92L8.59,21.33L7.17,19.92L11,16.09V13H7.91L4.08,16.83L2.67,15.41L5.08,13H2V11H5.08L2.67,8.59L4.08,7.17L7.91,11H11V7.91L7.17,4.08L8.59,2.67L11,5.08V2H13Z"/></svg>`;

  var snowflakes = [];
  var pendingTimeouts = [];

  function createSnowflake() {
    if (snowflakes.length >= (effectConfig.maxCount || 40)) return; // Giới hạn số lượng ít để nhẹ nhàng

    var snowflake = document.createElement("div");
    snowflake.innerHTML = snowSVGPath;
    var svgElement = snowflake.firstChild;
    
    // Thuộc tính ngẫu nhiên
    var size = 10 + Math.random() * 12; // Kích thước nhỏ xinh
    var left = Math.random() * 100;
    var duration = 8 + Math.random() * 7; // Tốc độ rơi rất chậm
    var delay = Math.random() * 5;
    var opacity = 0.4 + Math.random() * 0.4;

    svgElement.style.width = size + "px";
    svgElement.style.left = left + "%";
    svgElement.style.opacity = opacity;
    
    // Animation kết hợp rơi và dạt sang ngang (drift)
    svgElement.style.animation = `
      snow-gentle-fall ${duration}s linear ${delay}s infinite,
      snow-drift ${3 + Math.random() * 3}s ease-in-out ${delay}s infinite
    `;

    container.appendChild(svgElement);
    snowflakes.push(svgElement);

    // Tự dọn dẹp sau một chu kỳ
    var timeoutId = setTimeout(() => {
      if (svgElement.parentNode === container) {
        container.removeChild(svgElement);
      }
      snowflakes = snowflakes.filter(s => s !== svgElement);
    }, (duration + delay) * 1000);
    
    pendingTimeouts.push(timeoutId);
  }

  function init() {
    // Tạo một số lượng ít ban đầu
    var initialCount = 15;
    for (var i = 0; i < initialCount; i++) {
      createSnowflake();
    }

    // Khoảng thời gian tạo mới dài ra để tuyết rơi thưa hơn
    var interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        createSnowflake();
      }
    }, 1500);

    data.registerInterval(interval);
  }

  function cleanup() {
    pendingTimeouts.forEach(clearTimeout);
    snowflakes.forEach(s => s.parentNode && s.remove());
    snowflakes = [];
  }

  data.registerCleanup(cleanup);
  init();
})();