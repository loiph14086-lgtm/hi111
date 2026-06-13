(function () {
  // Check if we're in editor mode or no shadow root
  if (!window.__openingEffectData || !window.__openingEffectData.shadowRoot) {
    console.warn("Wedding Gate Effect: No shadow root available");
    return;
  }

  const shadowRoot = window.__openingEffectData.shadowRoot;
  const templateData = window.__openingEffectData.templateData;
  const dateParts = templateData.eventDate
    ? templateData.eventDate.split(" · ")
    : ["Date", "Month"];
  const shortDate = `${dateParts[0]} · ${dateParts[1]}`;

  // --- 1. CSS INJECTION ---
  const css = `
  .intro-stage {
        display: grid;
        place-items: center; /* Ám sát mọi sự lệch pha: Căn giữa hoàn hảo mọi thứ bên trong */
        position: relative;
      }
      .click-hint {
        position: absolute;
        top: 39%;
        left: 60%;
        transform: translateX(-50%) !important;
        width: 79px;
        animation: blink 1.5s infinite;
      }
      .click-hint img {
        width: 100%;
      }

      /* hiệu ứng mờ hiện */
      @keyframes blink {
        0% {
          opacity: 0.2;
          transform: translateX(-50%) scale(0.9);
        }

        50% {
          opacity: 1;
          transform: translateX(-50%) scale(1);
        }

        100% {
          opacity: 0.2;
          transform: translateX(-50%) scale(0.9);
        }
      }
      .seed {
        grid-area: 1 / 1; /* Tống nó vào ô grid đầu tiên */
        text-align: center;
        cursor: pointer;
        z-index: 20; /* Giữ nguyên để nó nổi lên trên bông hoa, chờ bị click */
      }
      /* ❤️ HEART SHAPE */
      .seed-heart {
        width: 60px;
        height: 60px;
        background: #e8a0a6;
        transform: rotate(45deg);
        position: relative;
        margin: auto;
        animation: heartbeat 1.2s infinite;
      }

      .seed-heart::before,
      .seed-heart::after {
        content: "";
        position: absolute;
        width: 60px;
        height: 60px;
        background: #e8a0a6;
        border-radius: 50%;
      }

      .seed-heart::before {
        top: -30px;
        left: 0;
      }
      .seed-heart::after {
        left: -30px;
        top: 0;
      }

      /* 💓 HEARTBEAT */
      @keyframes heartbeat {
        0% {
          transform: rotate(45deg) scale(1);
        }
        25% {
          transform: rotate(45deg) scale(1.1);
        }
        50% {
          transform: rotate(45deg) scale(1);
        }
        75% {
          transform: rotate(45deg) scale(1.15);
        }
        100% {
          transform: rotate(45deg) scale(1);
        }
      }

      .seed-text {
        display: block;
        margin-top: 14px;
        font-size: 11px;
        letter-spacing: 3px;
        color: #ccc;
      }

      /* =========================
  FLOWER
========================= */
      .flower-wrap {
        grid-area: 1 / 1; /* Tống chung vào đúng cái ô của thằng seed */
        position: relative;
        width: 260px;
        height: 260px;
        opacity: 0;
        transform: scale(0.6);
        transition:
          opacity 0.6s,
          transform 0.6s;
      }

      .flower-wrap.show {
        opacity: 1;
        transform: scale(1);
      }

      /* PETALS */
      .petal {
        position: absolute;
        inset: 0;
        border-radius: 60% 40% 60% 40%;
        background: linear-gradient(135deg, #e8a0a6, #c96a72);
        transform: scale(0);
        opacity: 0;
        transition:
          transform 0.8s ease,
          opacity 0.6s;
      }

      .p1 {
        transform: rotate(0deg) scale(0);
      }
      .p2 {
        transform: rotate(60deg) scale(0);
      }
      .p3 {
        transform: rotate(120deg) scale(0);
      }
      .p4 {
        transform: rotate(180deg) scale(0);
      }
      .p5 {
        transform: rotate(240deg) scale(0);
      }

      /* BLOOM */
      .flower-wrap.bloom .petal {
        opacity: 1;
      }

      .flower-wrap.bloom .p1 {
        transform: rotate(0deg) scale(1);
        transition-delay: 0.1s;
      }
      .flower-wrap.bloom .p2 {
        transform: rotate(60deg) scale(1);
        transition-delay: 0.2s;
      }
      .flower-wrap.bloom .p3 {
        transform: rotate(120deg) scale(1);
        transition-delay: 0.3s;
      }
      .flower-wrap.bloom .p4 {
        transform: rotate(180deg) scale(1);
        transition-delay: 0.4s;
      }
      .flower-wrap.bloom .p5 {
        transform: rotate(240deg) scale(1);
        transition-delay: 0.5s;
      }

      /* CORE */
      .flower-core {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        background: #fdfaf5;
        padding: 20px;
        border-radius: 50%;
        text-align: center;
        z-index: 10;
        transition: transform 0.6s ease 0.7s;
      }

      .flower-wrap.bloom .flower-core {
        transform: translate(-50%, -50%) scale(1);
      }

      .core-names {
        font-family: "Great Vibes", cursive;
        font-size: 28px;
      }

      .core-date {
        font-size: 10px;
        letter-spacing: 3px;
        margin-top: 6px;
      }

      /* =========================
          ZOOM EFFECT
        ========================= */
      .intro-stage.zoom {
        transform: scale(8);
        transition: transform 1.4s ease-in;
      }
  `;

  const styleSheet = document.createElement("style");
  styleSheet.innerText = css;
  shadowRoot.appendChild(styleSheet);

  // --- 2. HTML INJECTION ---
  const template = `
  <div class="intro-stage" id="introStage">
        <!-- 🌱 SEED (trạng thái ban đầu) -->
        <div class="seed" id="seed" onclick="startBloom()">
          <div class="seed-heart"></div>
          <!-- ✏️ EDIT text -->
          <div class="click-hint">
            <img src="https://i.postimg.cc/rsjPLmMF/click.png" />
          </div>
        </div>

        <!-- 🌸 FLOWER -->
        <div class="flower-wrap" id="flower">
          <!-- CORE -->
          <div class="flower-core" id="flowerCore">
            <!-- ✏️ EDIT -->
            <div class="core-names">Lễ<br>Thành<br>Hôn</div>
            <div class="core-date">${shortDate}</div>
          </div>

          <!-- PETALS -->
          <div class="petal p1"></div>
          <div class="petal p2"></div>
          <div class="petal p3"></div>
          <div class="petal p4"></div>
          <div class="petal p5"></div>
        </div>
      </div>
  `;

  const container = document.createElement("div");
  container.innerHTML = template;

  shadowRoot.appendChild(container);

  // Inject functions into global scope for onclick handlers
  window.startBloom = startBloom;

  // --- 3. LOGIC ---
  // let bellRung = false;
  function startBloom() {
    const seed = shadowRoot.getElementById("seed");
    const flower = shadowRoot.getElementById("flower");
    const stage = shadowRoot.getElementById("introStage");

    // 1. Ẩn seed
    seed.style.opacity = "0";
    seed.style.pointerEvents = "none";

    // 2. Hiện flower
    setTimeout(() => {
      flower.classList.add("show");
    }, 200);

    // 3. Bloom
    setTimeout(() => {
      flower.classList.add("bloom");
    }, 500);

    // 4. Zoom vào tâm (CINEMATIC)
    setTimeout(() => {
      stage.classList.add("zoom");
    }, 1400);

    // 5. Mở main
    setTimeout(() => {
      document.getElementById("intro").classList.add("away");

      const main = shadowRoot.getElementById("main");
      if (main) {
        main.style.display = "block";
        main.classList.add("show");
      }
    }, 2600);
  }
  // Event listeners
  const gateHalves = shadowRoot.querySelectorAll(".gate-half");
  gateHalves.forEach((p) =>
    p.addEventListener("click", () => {
      // if (!bellRung) ringBell();
      // else openGate();
    }),
  );
})();
