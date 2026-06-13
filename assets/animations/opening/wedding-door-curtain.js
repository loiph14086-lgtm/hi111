(function () {
  if (!window.__openingEffectData || !window.__openingEffectData.shadowRoot) {
    console.warn("Wedding Door Curtain Effect: No shadow root available");
    return;
  }

  const shadowRoot = window.__openingEffectData.shadowRoot;
  const introEl = document.getElementById("intro");

  const css = `
    :host {
      background: transparent !important;
    }

    .wedding-door-curtain {
      position: relative;
      width: 100%;
      max-width: 568px;
      height: 100dvh;
      overflow: hidden;
      background: transparent;
    }

    .wedding-door-curtain::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 1;
      background: radial-gradient(circle at 50% 40%, rgba(255, 248, 232, 0.5), transparent 34%);
      opacity: 0;
      animation: weddingDoorLight 3600ms ease 400ms both;
    }

    .wedding-door {
      position: absolute;
      top: 0;
      width: 50%;
      height: 100dvh;
      object-fit: cover;
      z-index: 10;
      animation-duration: 4000ms;
      animation-timing-function: ease-in-out;
      animation-fill-mode: forwards;
      will-change: transform, opacity;
    }

    .wedding-door-left {
      left: 0;
      transform: translateX(-8px);
      animation-name: weddingDoorOpenLeft;
    }

    .wedding-door-right {
      right: 0;
      transform: translateX(8px);
      animation-name: weddingDoorOpenRight;
    }

    @keyframes weddingDoorOpenLeft {
      0% {
        transform: translateX(-8px);
        opacity: 1;
      }
      100% {
        transform: translateX(-100%);
        opacity: 0;
      }
    }

    @keyframes weddingDoorOpenRight {
      0% {
        transform: translateX(8px);
        opacity: 1;
      }
      100% {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    @keyframes weddingDoorLight {
      0% {
        opacity: 0;
        transform: scale(0.96);
      }
      45% {
        opacity: 1;
      }
      100% {
        opacity: 0.2;
        transform: scale(1.04);
      }
    }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  shadowRoot.appendChild(style);

  const container = document.createElement("div");
  container.className = "wedding-door-curtain";
  container.innerHTML = `
    <img class="wedding-door wedding-door-left" src="https://i.postimg.cc/T1XZNq8t/openningleft.png" alt="" />
    <img class="wedding-door wedding-door-right" src="https://i.postimg.cc/QCrRYkL6/openningright.png" alt="" />
  `;
  shadowRoot.appendChild(container);

  setTimeout(() => {
    introEl?.classList.add("away");
  }, 4200);
})();
