(function () {
  // Check if we're in editor mode or no shadow root
  if (!window.__openingEffectData || !window.__openingEffectData.shadowRoot) {
    console.warn("Camera Effect: No shadow root available");
    return;
  }

  const shadowRoot = window.__openingEffectData.shadowRoot;
  const templateData = window.__openingEffectData.templateData;

  // --- 1. CSS INJECTION ---
  const css = `
        :host {
        position: fixed !important;
        inset: 0 !important;
        z-index: 9999 !important;
        background: #000; /* nền đen cho mượt */
        display: flex;
        transition: opacity 1.2s ease, visibility 1.2s !important;
        }

        :host.away {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
}
      /* --- INTRO LAYOUT --- */
      #intro-stage {
        position: fixed;
        inset: 0;
        z-index: 5000;
        background: #f4f1ea;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
          opacity 1s ease,
          visibility 1s,
          background-color 0.5s ease !important;
      }
      #intro-stage.away {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }

      /* Ẩn */
      .hidden {
        display: none !important;
      }
      /* Animation*/
      /* 1. Nhấp nháy nhẹ nhàng (Fade In + Pulse) */
      @keyframes fadeIn {
        0% {
          opacity: 0;
          transform: translateY(-10px);
        }
        50% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* 2. Chỉ hướng (Bouncing)*/
      @keyframes arrowBounce {
        0%,
        100% {
          transform: translateX(0);
        }
        50% {
          transform: translateX(10px);
        }
      }

      @keyframes floatHint {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-10px);
        }
      }

      /* Class để áp dụng */
      .animate-hint {
        animation:
          fadeIn 0.7s ease-out forwards,
          arrowBounce 1s infinite 0.5s; /* Pop xong thì bắt đầu bounce */
      }
      /* */
      .camera-wrapper {
        position: relative;
        width: min(600px, 95vw); /* Tăng nhẹ để nhìn rõ hoa */
        aspect-ratio: 4/3;
      }

      .camera-img {
        width: 100%;
        height: auto;
        display: block;
        filter: drop-shadow(0 15px 35px rgba(0, 0, 0, 0.15));
      }

      /* 3. Vị trí cụ thể cho từng cái */
      /*nút đỏ*/
      #hint-shutter {
        position: relative;
        top: 22%; /* Chỉ vào nút bấm đỏ */
        left: 32%;
        width: 80px;
      }
      #arrow-hint {
        /* hình mũi tên hint*/
        position: absolute;
        top: 29%;
        left: 12%;
      }

      #arrow-hint img {
        width: 30%;
        animation: floatHint 2s ease-in-out infinite;
      }

      /* Nút chụp đỏ đè lên vị trí nút trên ảnh 2.jpg */
      #shutter-btn {
        position: absolute;
        top: 34.5%;
        left: 40.4%; /* Tọa độ khớp với ảnh camera của bạn */
        width: 5%;
        height: 7%;
        background: rgba(255, 0, 0, 0.2);
        border-radius: 50%;
        z-index: 20;
        cursor: pointer;
        animation: pulse-red 1.5s infinite;
      }
      @keyframes pulse-red {
        0% {
          box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7);
        }
        70% {
          box-shadow: 0 0 0 15px rgba(255, 68, 68, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(255, 68, 68, 0);
        }
      }

      /* Vùng cảm biến click vào tấm ảnh cuối cùng */
      #photo-sensor {
        position: absolute;
        bottom: 41%;
        left: 52%;
        transform: translateX(-50%);
        width: 29%;
        height: 37%;
        z-index: 30;
        cursor: pointer;
        display: none; /* Chỉ hiện sau khi lật ảnh xong */
      }

      /* Hiệu ứng GIF hoa nở bùng lên */
      .flower-bloom-effect {
        position: fixed;
        width: 250px;
        z-index: 10001;
        pointer-events: none;
        transform: translate(-50%, -50%);
      }

      /* Flash sáng */
      #camera-flash {
        position: fixed;
        inset: 0;
        background: white;
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.1s;
      }

      @keyframes bounce {
        from {
          transform: translateX(-50%) translateY(0);
        }
        to {
          transform: translateX(-50%) translateY(-5px);
        }
      }

      /* --- MAIN CONTENT --- */
      #main {
        display: none;
        opacity: 0;
        transition: opacity 1.5s ease;
      }
      #main.show {
        display: block;
        opacity: 1;
      }
      .hero {
        min-height: 100vh;
        background: var(--sage);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
  `;

  const styleSheet = document.createElement("style");
  styleSheet.innerText = css;
  shadowRoot.appendChild(styleSheet);

  // --- 2. HTML INJECTION ---
  const template = `
  <div id="camera-flash"></div>

    <div id="intro-stage">
      <div class="camera-wrapper">
        <div class="hint" id="hint-shutter"></div>
        <img
          src="/assets/images/opening-animations/camera/2.png"
          id="camera-display"
          class="camera-img"
          alt="Camera"
        />
        <div class="arrow-hint" id="arrow-hint">
          <img src="/assets/images/opening-animations/camera/hint.png" alt="Click to capture" />
        </div>
        <div id="shutter-btn" onclick="startCameraSequence()"></div>

        <div id="photo-sensor" onclick="handleFinalBloom(event)"></div>
      </div>
    </div>
  `;

  const container = document.createElement("div");
  container.innerHTML = template;

  shadowRoot.appendChild(container);

  window.startCameraSequence = startCameraSequence;
  window.handleFinalBloom = handleFinalBloom;

  // --- 3. LOGIC ---

  // 1. Danh sách từ 3.jpg đến 26.jpg
  const frames = [];
  for (let i = 3; i <= 26; i++) {
    frames.push(`/assets/images/opening-animations/camera/${i}.png`);
  }

  const FLOWER_GIF = "/assets/images/opening-animations/camera/bloom.gif";
  let currentFrame = 0;

  // Preload ảnh
  frames.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
  //hint
  let shutterTimer; // Bộ đếm cho nút chụp
  let photoTimer; // Bộ đếm cho tấm ảnh

  // 1. KHI VỪA VÀO TRANG: Bắt đầu đếm ngược 5s để hiện Hint nút chụp

  shutterTimer = setTimeout(() => {
    const hintShutter = shadowRoot.getElementById("hint-shutter");
    if (hintShutter) {
      hintShutter.style.display = "block";
    }
    //shadowRoot.getElementById("hint").style.display = "block";
  }, 5000);

  // Chụp
  function playShutterSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) { }
  }

  function startCameraSequence() {
    // Dừng bộ đếm và ẩn Hint ngay khi khách click chụp
    clearTimeout(shutterTimer);
    shadowRoot.getElementById("hint-shutter").style.display = "none";
    shadowRoot.getElementById("arrow-hint").classList.add("hidden");
    //
    playShutterSound();
    const flash = shadowRoot.getElementById("camera-flash");
    const intro = shadowRoot.getElementById("intro-stage");
    flash.style.opacity = "1";
    shadowRoot.getElementById("shutter-btn").style.display = "none";

    setTimeout(() => {
      flash.style.opacity = "0";

      // đổi màu nền
      intro.style.backgroundColor = "#000000";

      runStopMotion();
    }, 100);
  }

  function runStopMotion() {
    const display = shadowRoot.getElementById("camera-display");
    if (currentFrame < frames.length) {
      const frameNumber = currentFrame + 3;
      display.src = frames[currentFrame];
      currentFrame++;

      let delay; // Khai báo biến bằng let để có thể gán giá trị bên trong các khối lệnh

      if (currentFrame <= 10) {
        delay = 80;
        if (currentFrame == 10) {
          delay = 120;
        }
      } else if (currentFrame <= 20) {
        delay = 40;
        if (currentFrame == 20) {
          delay = 100;
        }
      } else {
        delay = 45;
      }
      setTimeout(runStopMotion, delay);
    } else {
      shadowRoot.getElementById("photo-sensor").style.display = "block";
      // hiện arrow-hint
      setTimeout(() => {
        shadowRoot.getElementById("arrow-hint").classList.remove("hidden");
        shadowRoot.getElementById("arrow-hint").classList.add("animate-hint");
      }, 500);
    }
  }

  function handleFinalBloom(event) {
    clearTimeout(photoTimer);

    const x = event.clientX;
    const y = event.clientY;

    const bloom = document.createElement("img");
    bloom.src = FLOWER_GIF + "?p=" + Math.random();
    bloom.className = "flower-bloom-effect";
    bloom.style.left = x + "px";
    bloom.style.top = y + "px";
    shadowRoot.appendChild(bloom);

    setTimeout(() => {
      const intro = shadowRoot.getElementById("intro-stage");
      const main = document.getElementById("main");

      if (!intro) {
        console.warn("[CameraEffect] intro-stage not found");
        if (main) {
          main.style.display = "block";
          setTimeout(() => {
            main.classList.add("show");
            bloom.remove();
          }, 100);
        }
        return;
      }

      shadowRoot.host.classList.add("away");
      intro.classList.add("away");
      setTimeout(() => {
        intro.style.display = "none";
        if (main) {
          main.style.display = "block";
          setTimeout(() => {
            main.classList.add("show");
            bloom.remove();
          }, 100);
        }
      }, 1000);
    }, 1200);
  }
})();
