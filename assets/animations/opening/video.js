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
      @import url(https://fonts.googleapis.com/css?family=Source+Sans+Pro:400,700);

      body {
        background-color: #d7ecd0;
        overflow: hidden;
      }
     

      #projectionScreen.zoom-svg {
        transform: scale(8);
        transition: transform 1.4s ease-in;
      }
      #projectionScreen.zoom-light {
        transition: transform 1.2s ease-in;
      }
      #intro-stage.away {
        opacity: 0;
        pointer-events: none;
        transition: opacity 1s ease;
      }

      #projectionScreen {
        overflow: hidden;
        font-family: "Source Sans Pro", sans-serif;
        font-weight: 700;
        visibility: hidden;
        opacity: 0;
        position: absolute;
        top: 50%;
        left: 50%;
        backface-visibility: hidden;
        -webkit-font-smoothing: antialiased;
      }

      #follow {
        position: absolute;
        bottom: 16px;
        right: 16px;
        z-index: 1000;
        font-size: 48px;
        color: #444;
      }

      .big {
        stroke-dasharray: 1570; /* chu vi gần đúng */
        stroke-dashoffset: 1570;
      }

      #final-image-overlay {
        pointer-events: none; /* Không block tương tác */
      }
  `;

  const styleSheet = document.createElement("style");
  styleSheet.innerText = css;
  shadowRoot.appendChild(styleSheet);

  // --- 2. HTML INJECTION ---
  const template = `
  <div id="intro-stage">
      <a id="follow" href="https://twitter.com/Craig_PointC" target="_blank"
        ><span class="fa fa-twitter"></span
      ></a>
      <svg
        id="projectionScreen"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 1200"
      >
        <defs>
          <radialgradient
            id="filmGradient"
            cx="600"
            cy="450"
            r="340"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stop-color="#e6e6e6" />
            <stop offset="0.1" stop-color="#d1d1d1" />
            <stop offset="1" stop-color="#1a1a1a" />
          </radialgradient>

          <mask id="filmMask">
            <circle
              class="big"
              cx="600"
              cy="450"
              transform="rotate(-90 600 450)"
              r="250"
              stroke="#fff"
              stroke-width="500"
              fill="none"
            />
          </mask>

          <mask id="sockMask">
            <rect x="490" y="285.13" width="260" height="260" fill="#fff" />
          </mask>

          <mask id="textMask">
            <rect x="213" y="585" width="774" height="130" fill="#fff" />
          </mask>
        </defs>

        <title>Film Countdown</title>
        <ellipse
          id="shadow"
          cx="600"
          cy="1080.97"
          rx="375"
          ry="13"
          fill="#111"
          opacity="0.15"
        />

        <g id="screenMaster">
          <g id="supports" transform="translate(5,0)">
            <rect
              id="centerStand"
              x="583.78"
              y="117.91"
              width="18.76"
              height="718.65"
              fill="#878787"
            />
            <g id="leftLeg">
              <polygon
                id="ltLeg"
                points="442.91 1081.74 420.74 1082.24 586.17 796.3 602.41 805.69 442.91 1081.74"
                fill="#878787"
              />
              <path
                id="ltFoot"
                d="M447.28,1078.95a4.14,4.14,0,0,1-4.14,4.14h-21.9a4.14,4.14,0,0,1-4.14-4.14h0a4.14,4.14,0,0,1,4.14-4.14h21.9a4.14,4.14,0,0,1,4.14,4.14h0Z"
                fill="#f9b233"
              />
            </g>
            <g id="rightLeg">
              <polygon
                id="rtLeg"
                points="744.04 1081.44 766.21 1081.94 600.78 796.01 584.54 805.39 744.04 1081.44"
                fill="#878787"
              />
              <path
                id="rtFoot"
                d="M769.12,1078.95a4.14,4.14,0,0,1-4.14,4.14h-21.9a4.14,4.14,0,0,1-4.14-4.14h0a4.14,4.14,0,0,1,4.14-4.14H765a4.14,4.14,0,0,1,4.14,4.14h0Z"
                fill="#f9b233"
              />
            </g>
          </g>

          <rect
            id="screen"
            x="213.04"
            y="168.42"
            width="774.93"
            height="552.7"
            fill="#fff"
          />
          <rect
            id="centerShadowBottom"
            x="589.08"
            y="744.16"
            width="18.16"
            height="18.61"
            fill="#575756"
          />

          <g id="screenBars">
            <g id="screenTop">
              <rect
                id="topCore"
                x="168.78"
                y="154.36"
                width="863.43"
                height="17.97"
                rx="4"
                ry="4"
                fill="#c6c6c6"
              />
              <rect
                id="topBar"
                x="180.57"
                y="148.21"
                width="839.87"
                height="30.3"
                rx="8"
                ry="8"
                fill="#4c4c4c"
              />
              <rect
                id="topHighlight"
                x="188.62"
                y="166.93"
                width="825.31"
                height="6.14"
                fill="#fff"
                opacity="0.2"
              />
            </g>

            <g id="screenBottom">
              <rect
                id="bottomCore"
                x="168.78"
                y="722.05"
                width="863.43"
                height="17.97"
                rx="4"
                ry="4"
                fill="#c6c6c6"
              />
              <rect
                id="bottomBar"
                x="180.57"
                y="715.34"
                width="839.87"
                height="34.63"
                rx="8"
                ry="8"
                fill="#4c4c4c"
              />
              <rect
                id="bottomHighlight"
                x="187.28"
                y="722.54"
                width="825.31"
                height="6.14"
                fill="#fff"
                opacity="0.2"
              />
            </g>
          </g>
        </g>

        <g id="film" opacity="0">
          <rect
            width="700"
            height="500"
            x="250"
            y="200"
            rx="30"
            ry="30"
            opacity="0.65"
            fill="url(#filmGradient)"
          />

          <g mask="url(#filmMask)">
            <rect
              width="700"
              height="500"
              x="250"
              y="200"
              rx="30"
              ry="30"
              fill="url(#filmGradient)"
            />
          </g>

          <g stroke-width="2">
            <circle cx="600" cy="450" r="175" stroke="#111" fill="none" />
            <circle cx="600" cy="450" r="150" stroke="#fff" fill="none" />
            <circle cx="600" cy="450" r="110" stroke="#fff" fill="none" />
            <line x1="350" y1="450" x2="850" y2="450" stroke="#111" />
            <line x1="600" y1="220" x2="600" y2="680" stroke="#111" />
          </g>

          <line
            id="rotator"
            x1="600"
            y1="275"
            x2="600"
            y2="450"
            stroke="#333"
            stroke-width="3"
          />

          <text
            id="counter"
            text-anchor="middle"
            x="600"
            y="535"
            font-size="250"
          ></text>
        </g>

        <g id="movieClip">
          <!-- Mask để SVG luôn gọn trong screen -->
          <defs>
            <clipPath id="screen-clip">
              <rect x="213" y="168" width="774" height="553" />
            </clipPath>
          </defs>

          <!-- SVG mới: Luôn clip gọn screen -->
          <g id="final-svg-overlay" clip-path="url(#screen-clip)" opacity="1">
            <image
              id="wedding-photo"
              href="/assets/images/opening-animations/video/wedding-watercolor.png"
              x="223"
              y="178"
              width="754"
              height="533"
              opacity="0"
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        </g>
      </svg>
    </div>
  `;

  const container = document.createElement("div");
  container.innerHTML = template;

  shadowRoot.appendChild(container);

  // Inject functions into global scope for onclick handlers
  // window.ringBell = ringBell;

  // --- 3. LOGIC ---
  const JQUERY_CDN =
    "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js";
  const GSAP_CDN =
    "https://cdnjs.cloudflare.com/ajax/libs/gsap/2.1.3/TweenMax.min.js";

  function loadScriptOnce(src, isReady) {
    return new Promise((resolve, reject) => {
      if (typeof isReady === "function" && isReady()) {
        resolve();
        return;
      }

      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        existingScript.addEventListener("load", resolve, { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error(`Failed to load script: ${src}`)),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  function target(selector) {
    const nodes = Array.from(shadowRoot.querySelectorAll(selector));
    if (nodes.length === 0) return null;
    return nodes.length === 1 ? nodes[0] : nodes;
  }

  function initAnimation() {
    var demo = shadowRoot.getElementById("projectionScreen"),
      countDown = shadowRoot.getElementById("counter"),
      introStage = shadowRoot.getElementById("intro-stage"),
      main = shadowRoot.getElementById("main"),
      masterTimeline = new TimelineMax({ delay: 0.1 }),
      count = 3; // starting number for the countdown

    TweenMax.set(demo, {
      transformOrigin: "center",
      autoAlpha: 1,
      xPercent: -50,
      yPercent: -50,
    });
    TweenMax.set(target("#rightLeg"), {
      transformOrigin: "0% 0%",
      rotation: 30,
      x: 5,
    });
    TweenMax.set(target("#leftLeg"), {
      transformOrigin: "100% 0%",
      rotation: -30,
      x: -5,
    });
    TweenMax.set(target("#screenBars, #shadow"), {
      transformOrigin: "50% 50%",
    });
    TweenMax.set(target("#rotator, #supports"), {
      transformOrigin: "50% 100%",
    });
    TweenMax.set(target("#shadow"), { scaleX: 0, autoAlpha: 0 });
    TweenMax.set(target("#screen"), { transformOrigin: "50% 0%", scaleY: 0 });
    TweenMax.set(target("#centerShadowBottom, #movieClip"), {
      autoAlpha: 0,
      transformOrigin: "center",
    });
    TweenMax.set(target("#wedding-photo"), { autoAlpha: 0 });

    // start the countdown with the count variable value
    countDown.textContent = count;

    // create the projection screen animation
    function projector() {
      var tl = new TimelineMax();
      tl.from(target("#supports"), 0.6, { scaleY: 0, ease: Expo.easeInOut })
        .add("legExtension")
        .to(
          target("#rightLeg"),
          0.4,
          { rotation: 0, x: 0, ease: Power2.easeOut },
          "legExtension",
        )
        .to(
          target("#leftLeg"),
          0.4,
          { rotation: 0, x: 0, ease: Power2.easeOut },
          "legExtension",
        )
        .from(
          target("#screenBars"),
          0.6,
          { scaleX: 0, ease: Expo.easeOut },
          "legExtension",
        )
        .to(
          target("#centerShadowBottom"),
          0.3,
          { autoAlpha: 1 },
          "legExtension",
        )
        .add("screenDown", "-=0.25")
        .to(
          target("#screen"),
          0.6,
          { scaleY: 1, ease: Power4.easeOut },
          "screenDown",
        )
        .from(
          target("#screenBottom, #centerShadowBottom"),
          0.6,
          { y: -569, ease: Power4.easeOut },
          "screenDown",
        )
        .to(
          target("#shadow"),
          0.6,
          { scaleX: 1, autoAlpha: 0.2, ease: Power4.easeOut },
          "screenDown",
        )
        .to(target("#film"), 1.5, { autoAlpha: 1 });
      return tl;
    }

    // create the countdown animation
    function theCount() {
      var tl = new TimelineMax({
        repeat: count - 1,
        onRepeat: () => {
          TweenMax.set(target(".big"), { strokeDashoffset: 1570 }); // reset vòng tròn
          changeIt(); // giảm số
        },
        onComplete: () => {
          countDown.textContent = 0;
        },
      });
      tl.to(target("#rotator"), 1, {
        rotation: 360,
        ease: Linear.easeNone,
      }).fromTo(
        target(".big"),
        1,
        { strokeDashoffset: 1570 },
        { strokeDashoffset: 0, ease: Linear.easeNone },
        0,
      );
      return tl;
    }

    // fade out the countdown and show GreenSock info
    function movie() {
      var tl = new TimelineMax({ onComplete: finalTransition });

      tl.to(target("#film"), 0.4, { autoAlpha: 0 }) // 1. Ẩn countdown

        .set(target("#movieClip"), { autoAlpha: 1 }) // 2. Bật container

        .to(
          target("#wedding-photo"),
          0.8,
          {
            // 3. Ảnh PNG fade in
            autoAlpha: 1,
            ease: Power1.easeInOut,
          },
          "+=0.2",
        )

        .to(
          target("#projectionScreen"),
          1.8,
          {
            // 4. Zoom vào trung tâm
            scale: 12, // Tăng scale để tràn màn hình
            transformOrigin: "50% 40%", // Căn tọa độ center của ảnh trong SVG
            ease: Power2.easeIn,
          },
          "+=0.2",
        );

      return tl;
    }
    function finalTransition() {
      // 1. Ẩn intro trước
      const intro = shadowRoot.getElementById("intro-stage");

      if (!intro) {
        console.warn("[VideoEffect] intro-stage not found, skipping transition");
        const main = document.getElementById("main");
        if (main) {
          main.style.opacity = "0";
          TweenMax.to(main, 1, {
            autoAlpha: 1,
            ease: Power2.easeOut,
          });
        }
        return;
      }

      shadowRoot.host.classList.add("away");
      intro.classList.add("away");

      TweenMax.to(intro, 0.8, {
        autoAlpha: 0,
        onComplete: function () {
          intro.style.display = "none";

          // 2. GSAP cho main - hiệu ứng đẹp như ý!
          const main = document.getElementById("main");
          if (main) {
            main.style.display = "block";
            TweenMax.fromTo(
              main,
              1.2,
              { autoAlpha: 0, scale: 0.9 }, // ✅ Bắt đầu
              {
                autoAlpha: 1,
                scale: 1,
                ease: Back.easeOut,
                delay: 0.2,
              }, // ✅ Kết thúc đẹp!
            );
          }
        },
      });
    }

    // change the countdown on each repeat of the film leader animation
    function changeIt() {
      count--;
      if (count < 0) return; // chặn âm
      countDown.textContent = count;
    }

    function sizeAll() {
      var h = window.innerHeight,
        w = window.innerWidth;

      if (w > h) {
        TweenMax.set(demo, { height: h, width: h });
      } else {
        TweenMax.set(demo, { height: w, width: w });
      }
    }

    window.addEventListener("resize", sizeAll);
    sizeAll();
    masterTimeline.add(projector()).add(theCount(), "-=1.5").add(movie());
  }

  loadScriptOnce(JQUERY_CDN, () => typeof window.jQuery !== "undefined")
    .then(() =>
      loadScriptOnce(
        GSAP_CDN,
        () =>
          typeof window.TweenMax !== "undefined" &&
          typeof window.TimelineMax !== "undefined",
      ),
    )
    .then(() => {
      if (document.readyState === "complete") {
        initAnimation();
        return;
      }

      window.addEventListener("load", initAnimation, { once: true });
    })
    .catch((error) => {
      console.error("Video opening effect failed to initialize:", error);
    });
})();
