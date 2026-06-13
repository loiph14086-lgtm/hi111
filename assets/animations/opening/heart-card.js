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
      /* Intro */
       :host {
        position: fixed !important;
        inset: 0 !important;
        z-index: 9999 !important;
        display: flex;
        transition: opacity 1.2s ease, visibility 1.2s !important;
        background-color: #ffe1e1;
        font-family:
          "Poiret One",
          Segoe UI Light,
          cursive;
        }

        :host.away {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
    }
      /* intro */
      #intro-stage {
        position: fixed;
        inset: 0;
        z-index: 5000;
        background: var(--sage);
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
          opacity 1.2s ease,
          visibility 1.2s;
        overflow: hidden;
      }
      #intro-stage.away {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }

      /* Card */
      #card {
        position: absolute;
        width: 460px;
        height: 260px;
        left: 50%;
        margin-left: -230px;
      }

      #card {
        #message {
          transform: translateZ(0);
        }
        #btn {
          transform: translateZ(0);
        }
        #btn {
          z-index: 1;
        }
        #heart1 {
          position: relative;
          z-index: 10;
        }
        #heart2 {
          position: relative;
          z-index: 20;
        }
        #heart1,
        #heart2 {
          pointer-events: none;
        }
        .heart {
          width: 260px;
          height: 260px;
          float: left;
          #circle {
            height: 130px;
            width: 130px;
            border-radius: 50%;
            background-color: #d32f2f;
          }
          #rec,
          #rec2 {
            margin-top: -60px;
            width: 130px;
            height: 130px;
            background-color: #d32f2f;
            border-radius: 35% 0 0 0;
          }

          #half2 {
            -ms-transform: rotate(-90deg); /* IE 9 */
            -webkit-transform: rotate(-90deg); /* Chrome, Safari, Opera */
            transform: rotate(-90deg);
            margin-top: -330px;
            margin-left: -200px;
          }
        }

        #heart2 {
          margin-top: -60px;
          margin-left: -130px;
          #circle,
          #rec {
            background-color: #fff;
          }

          #half2 #rec {
            border-bottom: 1px solid #eee;
            margin-top: -61px;
          }
        }

        #message {
          float: left;
          width: 200px;
          height: 200px;
          margin-left: -130px;
          background-color: #333;
          border-radius: 35% 0 35% 0;
          text-align: center;

          h2 {
            font-size: 20px;
            color: #fff;
            width: 160px;
            margin-top: 60px;
            margin-left: 16px;
          }
        }
        #heart1 {
          -webkit-transform: rotate(180deg);
          -moz-transform: rotate(180deg);
          -ms-transform: rotate(180deg);
          transform: rotate(180deg);
          -webkit-animation: closeLeft 2s ease-in-out forwards;
          -moz-animation: closeLeft 2s ease-in-out forwards;
          -ms-animation: closeLeft 2s ease-in-out forwards;
          animation: closeLeft 2s ease-in-out forwards;
        }
        #heart2 {
          -webkit-animation: closeRight 2s ease-in-out forwards;
          -moz-animation: closeRight 2s ease-in-out forwards;
          -ms-animation: closeRight 2s ease-in-out forwards;
          animation: closeRight 2s ease-in-out forwards;
        }
      }

      #card:hover {
        #heart1 {
          -webkit-animation: openLeft 2s ease-in-out forwards;
          -moz-animation: openLeft 2s ease-in-out forwards;
          -ms-animation: openLeft 2 ease-in-out forwards;
          animation: openLeft 2s ease-in-out forwards;
        }
        #heart2 {
          -webkit-animation: openRight 2s ease-in-out forwards;
          -moz-animation: openRight 2s ease-in-out forwards;
          -ms-animation: openRight 2 ease-in-out forwards;
        }
      }

      @-webkit-keyframes closeLeft {
        from {
          -webkit-transform: rotateY(0deg);
        }
        to {
          -webkit-transform: rotateY(180deg);
        }
      }
      @-moz-keyframes closeLeft {
        from {
          -moz-transform: rotateY(0deg);
        }
        to {
          -moz-transform: rotateY(180deg);
        }
      }
      @-ms-keyframes closeLeft {
        from {
          -ms-transform: rotateY(0deg);
        }
        to {
          -ms-transform: rotateY(180deg);
        }
      }
      @keyframes closeLeft {
        from {
          transform: rotateY(0deg);
        }
        to {
          transform: rotateY(180deg);
        }
      }

      @-moz-keyframes openLeft {
        from {
          -moz-transform: rotateY(180deg);
        }
        to {
          -moz-transform: rotateY(0deg);
        }
      }
      @-webkit-keyframes openLeft {
        from {
          -webkit-transform: rotateY(180deg);
        }
        to {
          -webkit-transform: rotateY(0deg);
        }
      }

      @-ms-keyframes openLeft {
        from {
          -ms-transform: rotateY(180deg);
        }
        to {
          -ms-transform: rotateY(0deg);
        }
      }

      @keyframes openLeft {
        from {
          transform: rotateY(180deg);
        }
        to {
          transform: rotateY(0deg);
        }
      }

      @-moz-keyframes openRight {
        0% {
          -moz-transform: rotateX(180deg);
        }
        100% {
          -moz-transform: rotateX(0deg) rotateZ(180deg);
        }
      }
      @-webkit-keyframes openRight {
        0% {
          -webkit-transform: rotateX(180deg);
        }
        100% {
          -webkit-transform: rotateX(0deg) rotateZ(180deg);
        }
      }
      @-ms-keyframes openRight {
        0% {
          -ms-transform: rotateX(180deg);
        }
        100% {
          -ms-transform: rotateX(0deg) rotateZ(180deg);
        }
      }
      @keyframes openRight {
        0% {
          transform: rotateX(180deg);
        }
        100% {
          transform: rotateX(0deg) rotateZ(180deg);
        }
      }

      @-webkit-keyframes closeRight {
        from {
          -webkit-transform: rotateX(0deg) rotate(180deg);
        }
        to {
          -webkit-transform: rotateX(180deg);
        }
      }
      @-moz-keyframes closeRight {
        from {
          -moz-transform: rotateX(0deg) rotate(180deg);
        }
        to {
          -moz-transform: rotateX(180deg);
        }
      }
      @-ms-keyframes closeRight {
        from {
          -ms-transform: rotateX(0deg) rotate(180deg);
        }
        to {
          -ms-transform: rotateX(180deg);
        }
      }
      @keyframes closeRight {
        from {
          transform: rotateX(0deg) rotate(180deg);
        }
        to {
          transform: rotateX(180deg);
        }
      }

      /* button */
      #btn {
        width: 105px;
        height: 40px;
        background-color: #ffa7b4;
        border-radius: 35px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 1rem;
        transition: all 0.3s ease;
        text-align: center;
        padding: 5px;
        position: relative;
        left: 23%;
        overflow: hidden;
        /* animation */
        /*  cursor: wait; */
        background: linear-gradient(145deg, #ffffff, #de677a);
        border: 3px solid #ffacc8;
        margin-top: 20px;
        color: #000000;
        font-weight: 900;
      }
      #btn:hover {
        animation: pulse 1.5s infinite;
      }
      #btn::before {
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          45deg,
          transparent,
          rgba(255, 255, 255, 0.1),
          transparent
        );
        top: -100%;
        left: -100%;
        transition: all 0.5s ease;
      }

      #btn:hover::before {
        top: 100%;
        left: 100%;
      }
      /* Main */
      #main {
        opacity: 0;
        display: none;
        transition: opacity 1s ease;
      }
      #main.show {
        opacity: 1;
        display: block;
      }
    
  `;

  const styleSheet = document.createElement("style");
  styleSheet.innerText = css;
  shadowRoot.appendChild(styleSheet);

  // --- 2. HTML INJECTION ---
  const template = `
  <div id="intro-stage">
  <div id="card">
        <div class="heart" id="heart1">
          <div id="half1">
            <div id="circle"></div>
            <div id="rec"></div>
          </div>
          <div id="half2">
            <div id="circle"></div>
            <div id="rec"></div>
          </div>
        </div>
        <div id="message">
          <h2>To Our Wedding</h2>
          <div id="btn">See more</div>
        </div>
        <div class="heart" id="heart2">
          <div id="half1">
            <div id="circle"></div>
            <div id="rec"></div>
          </div>
          <div id="half2">
            <div id="circle"></div>
            <div id="rec"></div>
          </div>
        </div>
      </div>
  </div>
  `;

  const container = document.createElement("div");
  container.innerHTML = template;

  shadowRoot.appendChild(container);

  // Inject functions into global scope for onclick handlers
  //   window.ringBell = ringBell;
  window.seeMore = seeMore;
  // --- 3. LOGIC ---
  const btn = shadowRoot.getElementById("btn");

  btn.addEventListener("click", () => {
    seeMore();
  });
  function seeMore() {
    setTimeout(() => {
      const intro = shadowRoot.getElementById("intro-stage");
      shadowRoot.host.classList.add("away");
      intro.classList.add("away");

      setTimeout(() => {
        // ← THÊM timeout để animation mượt
        intro.style.display = "none"; // ← THÊM DÒNG NÀY
        const main = document.getElementById("main");
        if (main) {
          main.style.display = "block";
          main.classList.add("show");
        }
      }, 1000);
    }, 100);
  }
})();
