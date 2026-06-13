(function () {
  if (!window.__openingEffectData || !window.__openingEffectData.shadowRoot) {
    console.warn("Save Date Bloom Effect: No shadow root available");
    return;
  }

  const shadowRoot = window.__openingEffectData.shadowRoot;
  const introEl = document.getElementById("intro");

  const css = `
    :host { background: #eee !important; }

    .save-date-open {
      width: 100%;
      max-width: 568px;
      min-height: 100dvh;
      position: relative;
      overflow: hidden;
      cursor: pointer;
      background-image: url("https://i.postimg.cc/QMPdYPds/bgopen.png");
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      isolation: isolate;
    }

    .save-date-title {
      position: absolute;
      top: 32px;
      left: 28px;
      color: #865c24;
      font-family: "Times New Roman", serif;
      font-size: 56px;
      font-weight: 500;
      line-height: 0.92;
      letter-spacing: 1px;
      text-transform: capitalize;
      z-index: 5;
      animation: saveDateTitleIn 900ms ease both;
    }

    .save-date-image-box {
      position: absolute;
      top: 50%;
      right: 0;
      width: 260px;
      height: 260px;
      z-index: 4;
      transform: translateY(-50%);
      animation: saveDateFloat 3200ms ease-in-out infinite;
    }

    .save-date-flower {
      position: absolute;
      width: 260px;
      height: auto;
      right: 20%;
      top: 50%;
      z-index: 1;
      transform: rotate(30deg) translate(-50%, -50%) scale(0.96);
      transform-origin: center;
      filter: drop-shadow(0 18px 28px rgba(117, 82, 38, 0.18));
      animation: saveDateFlowerIn 1200ms 180ms cubic-bezier(0.2, 0.85, 0.28, 1.18) both;
    }

    .save-date-click-icon {
      position: absolute;
      width: 115px;
      height: auto;
      right: 50%;
      top: 72px;
      z-index: 2;
      filter: sepia(1) saturate(1.4) hue-rotate(350deg);
      animation: saveDateTap 1300ms ease-in-out infinite;
    }

    .save-date-open.is-opening .save-date-title {
      animation: saveDateTitleOut 700ms ease both;
    }

    .save-date-open.is-opening .save-date-image-box {
      animation: saveDateFadeAway 900ms ease both;
    }

    .save-date-open.is-opening .save-date-click-icon {
      opacity: 0;
      transition: opacity 220ms ease;
    }

    @keyframes saveDateTitleIn {
      from { opacity: 0; transform: translateY(-18px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes saveDateTitleOut {
      to { opacity: 0; transform: translateY(-18px); }
    }

    @keyframes saveDateFlowerIn {
      from { opacity: 0; transform: rotate(18deg) translate(-50%, -50%) scale(0.72); }
      to { opacity: 1; transform: rotate(30deg) translate(-50%, -50%) scale(0.96); }
    }

    @keyframes saveDateFloat {
      0%, 100% { transform: translateY(-50%); }
      50% { transform: translateY(calc(-50% - 10px)); }
    }

    @keyframes saveDateTap {
      0%, 100% { opacity: 0.42; transform: scale(0.92); }
      50% { opacity: 1; transform: scale(1); }
    }

    @keyframes saveDateFadeAway {
      0% { opacity: 1; transform: translateY(-50%); }
      100% { opacity: 0; transform: translateY(-50%); }
    }

    @media (max-width: 480px) {
      .save-date-title {
        top: 26px;
        left: 22px;
        font-size: 34px;
      }

      .save-date-image-box {
        width: 230px;
        height: 230px;
      }

      .save-date-flower {
        width: 230px;
      }

      .save-date-click-icon {
        width: 100px;
        right: 65px;
        top: 65px;
      }
    }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  shadowRoot.appendChild(style);

  const container = document.createElement("div");
  container.className = "save-date-open";
  container.setAttribute("role", "button");
  container.setAttribute("tabindex", "0");
  container.setAttribute("aria-label", "Open invitation");
  container.innerHTML = `
    <div class="save-date-title">Save <br> the Date</div>
    <div class="save-date-image-box">
      <img class="save-date-flower" src="https://i.postimg.cc/1tZLzcW8/floweropen.png" alt="" />
      <img class="save-date-click-icon" src="https://i.postimg.cc/k5WpLR7H/iconclickopen.png" alt="" />
    </div>
  `;
  shadowRoot.appendChild(container);

  let opened = false;

  function openInvitation() {
    if (opened) return;
    opened = true;
    container.classList.add("is-opening");

    setTimeout(() => {
      introEl?.classList.add("away");
    }, 920);
  }

  container.addEventListener("click", openInvitation);
  container.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openInvitation();
    }
  });
})();
