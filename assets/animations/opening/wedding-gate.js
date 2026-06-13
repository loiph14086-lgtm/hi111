(function () {
  // Check if we're in editor mode or no shadow root
  if (!window.__openingEffectData || !window.__openingEffectData.shadowRoot) {
    console.warn("Wedding Gate Effect: No shadow root available");
    return;
  }

  const shadowRoot = window.__openingEffectData.shadowRoot;
  const templateData = window.__openingEffectData.templateData;

  // --- 1. CSS INJECTION ---
  const css = `
    :host {
      --ink: #1a2318;
      --sage: #2d4a38;
      --sage-mid: #3d6b50;
      --sage-light: #6a9e7f;
      --sage-pale: #b8d9c6;
      --cream: #f8f4ec;
      --cream-warm: #f2ead8;
      --petal: #e8a0a6;
      --petal-deep: #c96a72;
      --gold: #c9a84c;
      --gold-light: #e8cc82;
      --white: #fdfaf5;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :host {
      position: fixed !important;
      inset: 0 !important;
      z-index: 9999 !important;
      background: var(--sage) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: opacity 1.2s ease, visibility 1.2s !important;
      overflow: hidden !important;
    }

    :host(.away) {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }

    #petal-canvas {
      position: fixed;
      inset: 0;
      z-index: 5000;
      pointer-events: none;
    }

    .gate-container {
      position: relative;
      width: min(480px, 94vw);
      height: min(680px, 94vh);
      display: flex;
    }

    .gate-half {
      flex: 1;
      position: relative;
      overflow: hidden;
      transition: transform 1.6s cubic-bezier(0.77, 0, 0.18, 1);
      background: var(--sage);
    }

    .gate-half.L {
      transform-origin: left center;
      border-right: 1px solid rgba(200, 168, 82, 0.2);
    }

    .gate-half.R {
      transform-origin: right center;
      border-left: 1px solid rgba(200, 168, 82, 0.2);
    }

    .gate-container.open .gate-half.L {
      transform: perspective(1000px) rotateY(-115deg);
    }

    .gate-container.open .gate-half.R {
      transform: perspective(1000px) rotateY(115deg);
    }

    .gate-half svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .gate-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 20;
      text-align: center;
      background: var(--white);
      padding: 28px 32px;
      width: 230px;
      pointer-events: none;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    }

    .gate-center::before {
      content: '';
      position: absolute;
      inset: 7px;
      border: 1px solid rgba(201, 168, 76, 0.35);
      pointer-events: none;
    }

    .gc-tag {
      font-family: 'Cinzel', serif;
      font-size: 9px;
      letter-spacing: 5px;
      text-transform: uppercase;
      color: var(--sage-light);
      margin-bottom: 10px;
    }

    .gc-names {
      font-family: 'Great Vibes', cursive;
      font-size: 38px;
      color: var(--sage);
      line-height: 1.2;
    }

    .gc-date {
      font-family: 'Cinzel', serif;
      font-size: 9px;
      letter-spacing: 4px;
      color: var(--sage-light);
      margin-top: 8px;
    }

    .open-btn {
      position: absolute;
      bottom: 14%;
      left: 50%;
      transform: translateX(-50%);
      z-index: 30;
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--gold-light), var(--gold));
      border: none;
      cursor: pointer;
      font-family: 'Cinzel', serif;
      font-size: 10px;
      letter-spacing: 1px;
      color: var(--sage);
      font-weight: 600;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(201, 168, 76, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.4);
      transition: transform 0.25s, box-shadow 0.25s;
      animation: btnPulse 2.5s ease-in-out infinite;
    }

    .open-btn:hover {
      transform: translateX(-50%) scale(1.08);
    }

    .open-btn.gone {
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.4s;
    }

    @keyframes btnPulse {
      0%, 100% {
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5), 0 0 0 0 rgba(201, 168, 76, 0.5);
      }
      50% {
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5), 0 0 0 12px rgba(201, 168, 76, 0);
      }
    }

    .bell-wrap {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: 40;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }

    .bell-chain {
      width: 2px;
      height: 28px;
      background: linear-gradient(to bottom, rgba(201, 168, 76, 0.5), rgba(201, 168, 76, 0.8));
    }

    .bell-svg {
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
      transform-origin: 50% 0%;
      transition: filter 0.3s;
    }

    .bell-wrap:hover .bell-svg {
      filter: drop-shadow(0 4px 18px rgba(201, 168, 76, 0.7));
    }

    .bell-hint {
      font-family: 'Cinzel', serif;
      font-size: 8px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: rgba(201, 168, 76, 0.6);
      margin-top: 10px;
      animation: bellHintPulse 2s ease-in-out infinite;
    }

    @keyframes bellHintPulse {
      0%, 100% {
        opacity: 0.4;
      }
      50% {
        opacity: 1;
      }
    }

    @keyframes bellRing {
      0% { transform: rotate(0deg); }
      10% { transform: rotate(18deg); }
      20% { transform: rotate(-16deg); }
      30% { transform: rotate(13deg); }
      40% { transform: rotate(-10deg); }
      50% { transform: rotate(7deg); }
      60% { transform: rotate(-5deg); }
      70% { transform: rotate(3deg); }
      80% { transform: rotate(-2deg); }
      90% { transform: rotate(1deg); }
      100% { transform: rotate(0deg); }
    }

    @keyframes gateShake {
      0%, 100% { transform: translateX(0); }
      15% { transform: translateX(-7px); }
      30% { transform: translateX(7px); }
      45% { transform: translateX(-5px); }
      60% { transform: translateX(5px); }
      75% { transform: translateX(-3px); }
      88% { transform: translateX(3px); }
    }

    .bell-svg.ringing {
      animation: bellRing 0.8s ease forwards;
    }

    .gate-container.shaking {
      animation: gateShake 0.5s ease;
    }

    /* Progress Bar Styles */
    .progress-container {
      position: absolute;
      bottom: 8%;
      left: 50%;
      transform: translateX(-50%);
      width: 180px;
      height: 3px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 50;
    }

    .progress-container.show {
      opacity: 1;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #c9a84c 0%, #e8cc82 100%);
      width: 0%;
      transition: width 0.1s linear;
      border-radius: 2px;
      box-shadow: 0 0 8px rgba(201, 168, 76, 0.6);
    }

    .progress-text {
      position: absolute;
      bottom: 5%;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(255, 255, 255, 0.7);
      font-family: 'Cinzel', serif;
      font-size: 0.75rem;
      letter-spacing: 2px;
      opacity: 0;
      transition: opacity 0.3s ease;
      white-space: nowrap;
      z-index: 50;
    }

    .progress-text.show {
      opacity: 1;
    }
  `;

  const styleSheet = document.createElement("style");
  styleSheet.innerText = css;
  shadowRoot.appendChild(styleSheet);

  // --- 2. HTML INJECTION ---
  const template = `
    <canvas id="petal-canvas"></canvas>
    <div class="gate-container" id="gateWrap">
      <div class="gate-half L">
        <svg viewBox="0 0 240 680" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect width="240" height="680" fill="#1e3028"/>
          <rect x="16" y="0" width="8" height="680" fill="#2d4a38" rx="4"/>
          <rect x="46" y="0" width="6" height="680" fill="#2d4a38" rx="3"/>
          <rect x="74" y="0" width="8" height="680" fill="#2d4a38" rx="4"/>
          <rect x="104" y="0" width="6" height="680" fill="#2d4a38" rx="3"/>
          <rect x="132" y="0" width="8" height="680" fill="#2d4a38" rx="4"/>
          <rect x="162" y="0" width="6" height="680" fill="#2d4a38" rx="3"/>
          <rect x="190" y="0" width="8" height="680" fill="#2d4a38" rx="4"/>
          <rect x="224" y="0" width="8" height="680" fill="#2d4a38" rx="4"/>
          <polygon points="20,0 16,28 24,28" fill="#c9a84c"/>
          <polygon points="50,0 46,24 54,24" fill="#c9a84c" opacity=".75"/>
          <polygon points="78,0 74,28 82,28" fill="#c9a84c"/>
          <polygon points="108,0 104,24 112,24" fill="#c9a84c" opacity=".75"/>
          <polygon points="136,0 132,28 140,28" fill="#c9a84c"/>
          <polygon points="166,0 162,24 170,24" fill="#c9a84c" opacity=".75"/>
          <polygon points="194,0 190,28 198,28" fill="#c9a84c"/>
          <polygon points="228,0 224,28 232,28" fill="#c9a84c"/>
          <path d="M232,55 Q195,10 155,35 Q115,60 75,20 Q50,5 16,40" stroke="#c9a84c" stroke-width="2" fill="none" opacity=".6"/>
          <rect x="0" y="65" width="240" height="5" fill="#2d4a38" rx="2.5"/>
          <rect x="0" y="130" width="240" height="4" fill="#2d4a38" rx="2"/>
          <rect x="0" y="320" width="240" height="4" fill="#2d4a38" rx="2"/>
          <rect x="0" y="480" width="240" height="4" fill="#2d4a38" rx="2"/>
          <g transform="translate(120,220)" fill="none" stroke="#b8d9c6" stroke-width="1.3" opacity=".75">
            <circle cx="0" cy="0" r="52"/>
            <circle cx="0" cy="0" r="38"/>
            <circle cx="0" cy="0" r="10"/>
            <path d="M-52,0 Q-35,-38 0,-38 Q35,-38 52,0"/>
            <path d="M0,-52 Q38,-35 38,0 Q38,35 0,52"/>
            <path d="M52,0 Q35,38 0,38 Q-35,38 -52,0"/>
            <path d="M0,52 Q-38,35 -38,0 Q-38,-35 0,-52"/>
            <path d="M-52,0 Q-65,-12 -60,-24 Q-50,-18 -52,0Z"/>
            <path d="M52,0 Q65,-12 60,-24 Q50,-18 52,0Z"/>
            <path d="M0,52 Q12,65 24,60 Q18,50 0,52Z"/>
            <path d="M0,-52 Q-12,-65 -24,-60 Q-18,-50 0,-52Z"/>
          </g>
          <g fill="none" stroke="#b8d9c6" stroke-width="1" opacity=".55">
            <path d="M24,78 Q24,90 28,100 Q32,90 24,78Z" fill="#b8d9c6" opacity=".3"/>
            <path d="M84,78 Q84,90 88,100 Q92,90 84,78Z" fill="#b8d9c6" opacity=".3"/>
            <path d="M144,78 Q144,90 148,100 Q152,90 144,78Z" fill="#b8d9c6" opacity=".3"/>
            <ellipse cx="35" cy="106" rx="8" ry="9"/>
            <ellipse cx="95" cy="106" rx="8" ry="9"/>
            <ellipse cx="155" cy="106" rx="8" ry="9"/>
          </g>
          <rect x="232" y="0" width="8" height="680" fill="#2d4a38" rx="4"/>
          <rect x="0" y="676" width="240" height="4" fill="#c9a84c" opacity=".3"/>
        </svg>
      </div>

      <div class="gate-half R">
        <svg viewBox="0 0 240 680" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect width="240" height="680" fill="#1e3028"/>
          <rect x="8" y="0" width="8" height="680" fill="#2d4a38" rx="4"/>
          <rect x="40" y="0" width="6" height="680" fill="#2d4a38" rx="3"/>
          <rect x="68" y="0" width="8" height="680" fill="#2d4a38" rx="4"/>
          <rect x="98" y="0" width="6" height="680" fill="#2d4a38" rx="3"/>
          <rect x="126" y="0" width="8" height="680" fill="#2d4a38" rx="4"/>
          <rect x="156" y="0" width="6" height="680" fill="#2d4a38" rx="3"/>
          <rect x="184" y="0" width="8" height="680" fill="#2d4a38" rx="4"/>
          <rect x="216" y="0" width="8" height="680" fill="#2d4a38" rx="4"/>
          <polygon points="12,0 8,28 16,28" fill="#c9a84c"/>
          <polygon points="44,0 40,24 48,24" fill="#c9a84c" opacity=".75"/>
          <polygon points="72,0 68,28 76,28" fill="#c9a84c"/>
          <polygon points="102,0 98,24 106,24" fill="#c9a84c" opacity=".75"/>
          <polygon points="130,0 126,28 134,28" fill="#c9a84c"/>
          <polygon points="160,0 156,24 164,24" fill="#c9a84c" opacity=".75"/>
          <polygon points="188,0 184,28 192,28" fill="#c9a84c"/>
          <polygon points="220,0 216,28 224,28" fill="#c9a84c"/>
          <path d="M8,55 Q45,10 85,35 Q125,60 165,20 Q190,5 224,40" stroke="#c9a84c" stroke-width="2" fill="none" opacity=".6"/>
          <rect x="0" y="65" width="240" height="5" fill="#2d4a38" rx="2.5"/>
          <rect x="0" y="130" width="240" height="4" fill="#2d4a38" rx="2"/>
          <rect x="0" y="320" width="240" height="4" fill="#2d4a38" rx="2"/>
          <rect x="0" y="480" width="240" height="4" fill="#2d4a38" rx="2"/>
          <g transform="translate(120,220)" fill="none" stroke="#b8d9c6" stroke-width="1.3" opacity=".75">
            <circle cx="0" cy="0" r="52"/>
            <circle cx="0" cy="0" r="38"/>
            <circle cx="0" cy="0" r="10"/>
            <path d="M-52,0 Q-35,-38 0,-38 Q35,-38 52,0"/>
            <path d="M0,-52 Q38,-35 38,0 Q38,35 0,52"/>
            <path d="M52,0 Q35,38 0,38 Q-35,38 -52,0"/>
            <path d="M0,52 Q-38,35 -38,0 Q-38,-35 0,-52"/>
            <path d="M-52,0 Q-65,-12 -60,-24 Q-50,-18 -52,0Z"/>
            <path d="M52,0 Q65,-12 60,-24 Q50,-18 52,0Z"/>
            <path d="M0,52 Q12,65 24,60 Q18,50 0,52Z"/>
            <path d="M0,-52 Q-12,-65 -24,-60 Q-18,-50 0,-52Z"/>
          </g>
          <g fill="none" stroke="#b8d9c6" stroke-width="1" opacity=".55">
            <path d="M16,78 Q16,90 20,100 Q24,90 16,78Z" fill="#b8d9c6" opacity=".3"/>
            <path d="M76,78 Q76,90 80,100 Q84,90 76,78Z" fill="#b8d9c6" opacity=".3"/>
            <path d="M136,78 Q136,90 140,100 Q144,90 136,78Z" fill="#b8d9c6" opacity=".3"/>
            <ellipse cx="27" cy="106" rx="8" ry="9"/>
            <ellipse cx="87" cy="106" rx="8" ry="9"/>
            <ellipse cx="147" cy="106" rx="8" ry="9"/>
          </g>
          <rect x="0" y="0" width="8" height="680" fill="#2d4a38" rx="4"/>
          <rect x="0" y="676" width="240" height="4" fill="#c9a84c" opacity=".3"/>
        </svg>
      </div>

      <div class="gate-center">
        <div class="gc-tag">Save The Date</div>
        <div class="gc-names">${templateData.coupleNames || "Couple Names"}</div>
        <div class="gc-date">${templateData.eventDate || "Date"}</div>
      </div>

      <div class="progress-container" id="progressContainer">
        <div class="progress-bar" id="progressBar"></div>
      </div>
      <div class="progress-text" id="progressText">0%</div>

      <div class="bell-wrap" id="bellWrap" onclick="ringBell()">
        <div class="bell-chain"></div>
        <svg class="bell-svg" id="bellSvg" width="64" height="72" viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg">
          <rect x="28" y="0" width="8" height="6" rx="3" fill="#c9a84c"/>
          <path d="M32,6 C20,6 12,16 11,28 L9,50 Q9,54 13,54 L51,54 Q55,54 55,50 L53,28 C52,16 44,6 32,6Z"
                fill="url(#bellGrad)" stroke="rgba(201,168,76,.4)" stroke-width="1"/>
          <path d="M9,50 Q9,58 32,58 Q55,58 55,50" fill="url(#bellGrad2)" stroke="rgba(201,168,76,.35)" stroke-width="1"/>
          <ellipse cx="24" cy="24" rx="5" ry="9" fill="rgba(255,255,255,.18)" transform="rotate(-15,24,24)"/>
          <line x1="32" y1="48" x2="32" y2="58" stroke="#a07830" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="32" cy="61" r="4" fill="#c9a84c" stroke="#a07830" stroke-width="1"/>
          <circle cx="32" cy="6" r="5" fill="none" stroke="#c9a84c" stroke-width="1.5" opacity=".8"/>
          <defs>
            <linearGradient id="bellGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#e8cc82"/>
              <stop offset="50%" stop-color="#c9a84c"/>
              <stop offset="100%" stop-color="#9a7830"/>
            </linearGradient>
            <linearGradient id="bellGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#c9a84c"/>
              <stop offset="100%" stop-color="#9a7830"/>
            </linearGradient>
          </defs>
        </svg>
        <p class="bell-hint">Bấm chuông</p>
      </div>

      <button class="open-btn" id="openBtn" onclick="ringBell()" aria-label="Mở thiệp cưới">Mở</button>
    </div>
  `;

  const container = document.createElement("div");
  container.innerHTML = template;

  shadowRoot.appendChild(container);

  // Inject functions into global scope for onclick handlers
  window.ringBell = ringBell;

  // --- 3. LOGIC ---
  let bellRung = false;

  function playBellSound() {
    try {
      const c = new (window.AudioContext || window.webkitAudioContext)();
      const tone = (f, g, d, t) => {
        const o = c.createOscillator();
        const e = c.createGain();
        o.type = t || "sine";
        o.frequency.setValueAtTime(f, c.currentTime);
        e.gain.setValueAtTime(g, c.currentTime);
        e.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
        o.connect(e);
        e.connect(c.destination);
        o.start();
        o.stop(c.currentTime + d);
      };
      tone(880, 0.35, 2.2);
      tone(1320, 0.18, 1.6);
      tone(2200, 0.08, 0.9);
      tone(440, 0.12, 2.8);
    } catch (e) { }
  }

  function ringBell() {
    if (bellRung) return;
    bellRung = true;
    playBellSound();
    const svg = shadowRoot.getElementById("bellSvg");
    svg.classList.add("ringing");
    setTimeout(() => {
      const wrap = shadowRoot.getElementById("gateWrap");
      wrap.classList.add("shaking");
      wrap.addEventListener(
        "animationend",
        () => {
          wrap.classList.remove("shaking");
          const hint = shadowRoot.querySelector(".bell-hint");
          if (hint) hint.style.opacity = "0";
          setTimeout(openGate, 200);
        },
        { once: true },
      );
    }, 400);
    svg.addEventListener(
      "animationend",
      () => svg.classList.remove("ringing"),
      { once: true },
    );
  }

  function openGate() {
    const openBtn = shadowRoot.getElementById("openBtn");
    const bellWrap = shadowRoot.getElementById("bellWrap");
    const gateWrap = shadowRoot.getElementById("gateWrap");
    const hostElement = shadowRoot.host;
    const progressContainer = shadowRoot.getElementById("progressContainer");
    const progressBar = shadowRoot.getElementById("progressBar");
    const progressText = shadowRoot.getElementById("progressText");

    openBtn.classList.add("gone");
    bellWrap.style.pointerEvents = "none";
    gateWrap.classList.add("open");

    // ✅ Bắt đầu animation progress
    progressContainer.classList.add("show");
    progressText.classList.add("show");

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15; // Random increment từ 0-15%
      if (progress > 100) progress = 100;

      progressBar.style.width = progress + "%";
      progressText.textContent = Math.floor(progress) + "%";

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          progressContainer.classList.remove("show");
          progressText.classList.remove("show");
        }, 300);
      }
    }, 150); // Cập nhật mỗi 150ms

    setTimeout(() => {
      hostElement.classList.add("away");
      const main = document.getElementById("main");
      if (main) {
        main.style.display = "block";
        main.classList.add("show");
      }
    }, 1800);
  }

  // Event listeners
  const gateHalves = shadowRoot.querySelectorAll(".gate-half");
  gateHalves.forEach((p) =>
    p.addEventListener("click", () => {
      if (!bellRung) ringBell();
      else openGate();
    }),
  );

  // --- Petal Animation ---
  (function () {
    const canvas = shadowRoot.getElementById("petal-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let W,
      H,
      petals = [];
    const COLORS = ["#e8a0a6", "#c96872", "#c9a84c", "#b8d9c6"];

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    class Petal {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * -H;
        this.r = 5 + Math.random() * 5;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.vy = 1 + Math.random() * 2;
        this.vx = (Math.random() - 0.5) * 1;
        this.opacity = Math.random() * 0.5 + 0.5;
      }
    }

    for (let i = 0; i < 50; i++) petals.push(new Petal());

    function animate() {
      ctx.clearRect(0, 0, W, H);
      petals.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx;
        p.opacity *= 0.995;
        if (p.y > H || p.opacity < 0.05) p.reset();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    }
    animate();

    setTimeout(() => {
      petals.forEach((p) => {
        p.vy *= 0.5;
        p.opacity *= 0.65;
      });
    }, 8000);
  })();
})();
