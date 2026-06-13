(function () {
    if (window.__htmlEditorHooked) return;
    window.__htmlEditorHooked = true;

    console.log('[HTML Editor Runtime] Script loaded and initialized');

    // ── Scope Syncing ───────────────────────────────────────────────────────
    const syncScopeToLocalStorage = (scope) => {
        if (!scope || !scope.key) return;
        try {
            const lastScopeRaw = localStorage.getItem('html-editor-last-scope');
            let lastScopeObj = {};

            if (lastScopeRaw) {
                try {
                    lastScopeObj = JSON.parse(lastScopeRaw);
                    if (typeof lastScopeObj !== 'object' || lastScopeObj === null) {
                        lastScopeObj = { title: String(lastScopeRaw) };
                    }
                } catch (e) {
                    lastScopeObj = { title: String(lastScopeRaw) };
                }
            }

            const lastScopeKey = lastScopeObj.title || '';

            // If we are switching to a completely different template/invitation
            if (lastScopeKey && lastScopeKey !== scope.key) {
                sessionStorage.removeItem('html-editor-transforms');
                sessionStorage.removeItem('html-editor-rotations');
                sessionStorage.removeItem('html-editor-background');
                sessionStorage.removeItem('html-editor-text-content');
                // Clear old name if it's a completely different item
                if (scope.name) lastScopeObj.name = scope.name;
                else delete lastScopeObj.name;
            } else {
                // Same item, only update name if we have a new valid one
                if (scope.name && scope.name.trim()) {
                    lastScopeObj.name = scope.name;
                }
            }

            lastScopeObj.title = scope.key;
            lastScopeObj.id = scope.id;
            lastScopeObj.type = scope.type;
            localStorage.setItem('html-editor-last-scope', JSON.stringify(lastScopeObj));
            sessionStorage.removeItem('html-editor-last-scope');
        } catch (e) {
            console.warn('[HTML Editor] Could not sync scope:', e);
        }
    };

    // Initial sync
    syncScopeToLocalStorage(window.__htmlEditorScope);

    const getScopedKey = (key) => {
        if (!window.__htmlEditorScope || !window.__htmlEditorScope.key) return key;
        return `scoped:${window.__htmlEditorScope.key}:${key}`;
    };


    // ── Restore background on page load ───────────────────────────────────────
    const restoreBackgroundOnLoad = () => {
        try {
            let bgData = null;
            const scope = window.__htmlEditorScope;

            // 1. Try to read from persistent template state in localStorage (Source of Truth)
            // This ensures consistent loading when template changes or page reloads.
            if (scope && scope.key) {
                const editorStateKey = 'editor-state:' + scope.key;
                const savedState = localStorage.getItem(editorStateKey);
                if (savedState) {
                    const state = JSON.parse(savedState);
                    if (state && state.metadata && state.metadata.background) {
                        bgData = state.metadata.background;
                    }
                }
            }

            // 2. Fallback to active session storage
            if (!bgData) {
                const savedBg = sessionStorage.getItem('html-editor-background');
                if (savedBg) bgData = JSON.parse(savedBg);
            }

            if (bgData) {
                const s = document.createElement('style');
                s.id = '__bg_override__';
                const bs = bgData;
                let css = '';
                if (bs.backgroundImage && bs.backgroundImage !== 'none') {
                    css = 'html,body,.hero{background-image:' + bs.backgroundImage + '!important;background-size:' + (bs.backgroundSize || 'cover') + '!important;background-position:' + (bs.backgroundPosition || 'center') + '!important;background-color:' + (bs.backgroundColor || 'transparent') + '!important;background-attachment:' + (bs.backgroundAttachment || 'fixed') + '!important;background-repeat:' + (bs.backgroundRepeat || 'no-repeat') + '!important;}';
                } else if (bs.background && bs.background !== 'none' && !bs.background.includes('url')) {
                    css = 'html,body,.hero{background:' + bs.background + '!important;background-color:transparent!important;background-attachment:scroll!important;}';
                } else if (bs.backgroundColor && bs.backgroundColor !== 'transparent') {
                    css = 'html,body,.hero{background-color:' + bs.backgroundColor + '!important;background-image:none!important;background:' + bs.backgroundColor + '!important;}';
                }
                if (css) {
                    s.textContent = css;
                    document.head.appendChild(s);
                }

                // Mark .hero as having background so it can be edited
                const heroEl = document.querySelector('.hero');
                if (heroEl && !heroEl.hasAttribute('data-image-editable')) {
                    heroEl.setAttribute('data-image-editable', 'body-background');
                }
            }
        } catch (e) {
            console.warn('[HTML Editor] Could not restore background:', e);
        }
    };

    // Apply background immediately on load
    restoreBackgroundOnLoad();

    // ── FIX: Restore text content on load will be called later after function is defined ──
    // (Function is defined later in the file, will be called via setTimeout)

    // ── Styles ────────────────────────────────────────────────────────────────
    const addStyle = (id, css) => {
        const s = document.createElement('style');
        s.id = id;
        s.textContent = css;
        document.head.appendChild(s);
    };

    if (!window.__isPreviewMode) {
        addStyle('editor-styles',
            '[data-editable],[data-editor-id],[data-image-editable],[data-edit-map],[data-edit-map-href],img{pointer-events:auto!important;touch-action:none!important;}' +
            '.word-rotate-coords{pointer-events:none!important;}' +
            '[data-editable],[data-editor-id],[data-image-editable],[data-edit-map],[data-edit-map-href],img{outline:2px dashed transparent;outline-offset:2px;transition:outline-color 0.15s,outline-offset 0.15s,box-shadow 0.15s;cursor:move;}' +
            '[data-editable]:hover,[data-editor-id]:hover,[data-image-editable]:hover,[data-edit-map]:hover,[data-edit-map-href]:hover,img:hover{outline-color:#a855f7!important;cursor:move;}' +
            '[data-editable].editor-layers-panel-hover,[data-editor-id].editor-layers-panel-hover,[data-image-editable].editor-layers-panel-hover,[data-edit-map].editor-layers-panel-hover,[data-edit-map-href].editor-layers-panel-hover,img.editor-layers-panel-hover{outline-color:#a855f7!important;cursor:move;}' +
            '[data-editable].editing,[data-editor-id].editing,[data-image-editable].editing,[data-edit-map].editing,[data-edit-map-href].editing,img.editing,' +
            '[data-editable].selected,[data-editor-id].selected,[data-image-editable].selected,[data-edit-map].selected,[data-edit-map-href].selected,img.selected{outline-color:#8b5cf6!important;box-shadow:0 0 0 2px rgba(139,92,246,0.12)!important;cursor:move;}' +
            /* Chọn từ panel Lớp: vẫn dùng viền tím #a855f7 như :hover (class .editor-layers-panel-hover + .selected/.editing) */
            '[data-editable].editor-layers-panel-hover.selected,[data-editor-id].editor-layers-panel-hover.selected,[data-image-editable].editor-layers-panel-hover.selected,[data-edit-map].editor-layers-panel-hover.selected,[data-edit-map-href].editor-layers-panel-hover.selected,img.editor-layers-panel-hover.selected,' +
            '[data-editable].editor-layers-panel-hover.editing,[data-editor-id].editor-layers-panel-hover.editing,[data-image-editable].editor-layers-panel-hover.editing,[data-edit-map].editor-layers-panel-hover.editing,[data-edit-map-href].editor-layers-panel-hover.editing,img.editor-layers-panel-hover.editing{outline-color:#a855f7!important;box-shadow:none!important;cursor:move;}' +
            '[data-editable][data-aos],[data-editor-id][data-aos],[data-image-editable][data-aos],[data-edit-map][data-aos],[data-edit-map-href][data-aos],img[data-aos],' +
            '[data-editable].aos-animate,[data-editor-id].aos-animate,[data-image-editable].aos-animate,[data-edit-map].aos-animate,[data-edit-map-href].aos-animate,img.aos-animate{opacity:1!important;}' +
            '.word-selection-handles{position:fixed;pointer-events:none;z-index:1000001;}' +
            '.word-handle{position:absolute;width:8px;height:8px;background:#a855f7;border:2px solid white;border-radius:1px;pointer-events:auto;cursor:pointer;user-select:none;}' +
            '.word-handle.nw{top:-4px;left:-4px;cursor:nw-resize;}.word-handle.n{top:-4px;left:50%;transform:translateX(-50%);cursor:n-resize;}' +
            '.word-handle.ne{top:-4px;right:-4px;cursor:ne-resize;}.word-handle.e{top:50%;right:-4px;transform:translateY(-50%);cursor:e-resize;}' +
            '.word-handle.se{bottom:-4px;right:-4px;cursor:se-resize;}.word-handle.s{bottom:-4px;left:50%;transform:translateX(-50%);cursor:s-resize;}' +
            '.word-handle.sw{bottom:-4px;left:-4px;cursor:sw-resize;}.word-handle.w{top:50%;left:-4px;transform:translateY(-50%);cursor:w-resize;}' +
            '.word-rotate-handle{position:absolute;top:-30px;left:50%;transform:translateX(-50%);width:20px;height:20px;background:#e91e63;border:2px solid white;border-radius:50%;cursor:grab;pointer-events:auto;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;user-select:none;}' +
            '.word-rotate-handle:active{cursor:grabbing;}' +
            '.word-rotate-line{position:absolute;top:-20px;left:50%;transform:translateX(-50%);width:2px;height:16px;background:#a855f7;}' +
            '.word-rotate-coords{position:absolute;top:-58px;left:50%;transform:translateX(-50%);padding:2px 8px;border-radius:999px;background:rgba(17,24,39,0.88);color:#fff;font:600 11px/1.2 monospace;pointer-events:none;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.18);}' +
            '.word-rotation-menu{position:absolute;top:-80px;left:50%;transform:translateX(-50%);background:white;border:1px solid #ccc;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);padding:8px;display:none;white-space:nowrap;z-index:10000;}' +
            '.word-rotation-menu.show{display:block;}' +
            '.word-rotation-option{display:block;padding:4px 8px;margin:2px 0;background:none;border:none;cursor:pointer;border-radius:2px;font-size:12px;color:#333;}' +
            '.word-rotation-option:hover{background:#f0f0f0;}' +
            '.word-copy-handle{position:absolute;top:-30px;left:calc(50% - 30px);transform:translateX(-50%);width:20px;height:20px;background:#6366f1;border:2px solid white;border-radius:50%;cursor:pointer;pointer-events:auto;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;user-select:none;box-shadow:0 2px 4px rgba(0,0,0,0.2);}' +
            '.word-delete-handle{position:absolute;top:-30px;left:calc(50% + 30px);transform:translateX(-50%);width:20px;height:20px;background:#ef4444;border:2px solid white;border-radius:50%;cursor:pointer;pointer-events:auto;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;user-select:none;box-shadow:0 2px 4px rgba(0,0,0,0.2);}' +
            '.word-cancel-parent-drag-handle{position:absolute;top:-30px;left:calc(50% + 50px);transform:translateX(-50%);width:20px;height:20px;background:#f97316;border:2px solid white;border-radius:50%;cursor:pointer;pointer-events:auto;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;user-select:none;box-shadow:0 2px 4px rgba(0,0,0,0.2);}' +
            /* Lock badge shown on selection handles when element is locked */
            '.word-lock-badge{position:absolute;top:-30px;left:50%;transform:translateX(-50%);width:20px;height:20px;background:#f59e0b;border:2px solid white;border-radius:50%;pointer-events:none;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;user-select:none;box-shadow:0 2px 4px rgba(0,0,0,0.2);}' +
            '[data-image-editable],img{image-rendering:crisp-edges;image-rendering:-webkit-optimize-contrast;}' +
            /* Locked state: applies to ALL editable types (text, image, stock) */
            '.editor-element-locked{outline:2px solid #ef4444!important;outline-offset:2px;cursor:not-allowed!important;}' +
            '.editor-element-locked:hover{outline-color:#dc2626!important;cursor:not-allowed!important;}' +
            /* Parent drag enabled state */
            '.editor-parent-drag-enabled{outline:3px solid #eab308!important;outline-offset:2px;box-shadow:0 0 0 4px rgba(234,179,8,0.2)!important;}'
        );
    }

    addStyle('editor-effect-styles',
        '@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}' +
        '@keyframes slideUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}' +
        '@keyframes scaleIn{from{opacity:0;transform:scale(0.8);}to{opacity:1;transform:scale(1);}}' +
        '@keyframes flipIn{from{opacity:0;transform:perspective(400px) rotateY(90deg);}to{opacity:1;transform:perspective(400px) rotateY(0deg);}}' +
        '@keyframes slideUpMix{0%{opacity:0;transform:translateY(30px) scale(0.9);}100%{opacity:1;transform:translateY(0) scale(1);}}' +
        '@keyframes fadeInMix{0%{opacity:0;filter:blur(10px);transform:scale(0.95);}100%{opacity:1;filter:blur(0);transform:scale(1);}}' +
        '@keyframes fadeOut{from{opacity:1;}to{opacity:0;}}' +
        '@keyframes slideDown{from{opacity:1;transform:translateY(0);}to{opacity:0;transform:translateY(20px);}}' +
        '@keyframes scaleOut{from{opacity:1;transform:scale(1);}to{opacity:0;transform:scale(0.8);}}' +
        '@keyframes float{0%,100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px));}50%{transform:translate(var(--el-tx,0px),calc(var(--el-ty,0px) - 10px));}}' +
        '@keyframes bounce{0%,100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px));}50%{transform:translate(var(--el-tx,0px),calc(var(--el-ty,0px) - 15px));}}' +
        '@keyframes pulse{0%,100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) scale(1);opacity:1;}50%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) scale(1.05);opacity:.8;}}' +
        '@keyframes rotate{0%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) rotate(0deg);}100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) rotate(360deg);}}' +
        '@keyframes shake{0%,100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px));}25%{transform:translate(calc(var(--el-tx,0px) - 5px),var(--el-ty,0px));}75%{transform:translate(calc(var(--el-tx,0px) + 5px),var(--el-ty,0px));}}' +
        '@keyframes wobble{0%,100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) scale(1) rotate(0deg);}10%,20%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) scale(.9) rotate(-3deg);}30%,50%,70%,90%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) scale(1.1) rotate(3deg);}40%,60%,80%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) scale(1.1) rotate(-3deg);}}' +
        '@keyframes wiggle{0%,100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) rotate(0deg);}25%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) rotate(3deg);}75%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) rotate(-3deg);}}' +
        '@keyframes blink{0%,50%,100%{opacity:1;}25%,75%{opacity:0.3;}}' +
        '@keyframes sway{0%,100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) rotate(0deg);}50%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) rotate(2deg);}}' +
        '@keyframes shakeBounce{0%,100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px));}10%,30%,50%,70%,90%{transform:translate(calc(var(--el-tx,0px) - 5px),calc(var(--el-ty,0px) - 5px));}20%,40%,60%,80%{transform:translate(calc(var(--el-tx,0px) + 5px),calc(var(--el-ty,0px) + 5px));}}' +
        '@keyframes fadeInOut{0%,100%{opacity:1;}50%{opacity:0.3;}}' +
        '@keyframes slideInLeft{0%{transform:translate(calc(var(--el-tx,0px) - 100%),var(--el-ty,0px));opacity:0;}100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px));opacity:1;}}' +
        '@keyframes slideInRight{0%{transform:translate(calc(var(--el-tx,0px) + 100%),var(--el-ty,0px));opacity:0;}100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px));opacity:1;}}' +
        '@keyframes slideInUp{0%{transform:translate(var(--el-tx,0px),calc(var(--el-ty,0px) + 100%));opacity:0;}100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px));opacity:1;}}' +
        '@keyframes slideInDown{0%{transform:translate(var(--el-tx,0px),calc(var(--el-ty,0px) - 100%));opacity:0;}100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px));opacity:1;}}' +
        '@keyframes heartbeat{0%,100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) scale(1);}25%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) scale(1.1);}50%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) scale(1);}}' +
        '@keyframes swing{0%,100%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) rotate(0deg);}20%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) rotate(15deg);}40%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) rotate(-10deg);}60%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) rotate(5deg);}80%{transform:translate(var(--el-tx,0px),var(--el-ty,0px)) rotate(-5deg);}}' +
        '.editor-effect-target{animation:none;}'
    );

    // Tránh tràn ngang. Dùng 100% thay vì 100vw: 100vw cộng cả scrollbar (đặc biệt Chrome DevTools responsive)
    // làm body rộng hơn khung → scrollbar ngang nhấp nhó / layout giật khi kéo phần tử.
    document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
    document.documentElement.style.setProperty('width', '100%', 'important');
    document.documentElement.style.setProperty('max-width', '100%', 'important');
    Object.assign(document.body.style, { overflowX: 'hidden', width: '100%', maxWidth: '100%', margin: '0', padding: '0', position: 'relative' });
    document.body.style.setProperty('overflow-x', 'hidden', 'important');
    document.body.style.setProperty('max-width', '100%', 'important');

    // Editor policy: never autoplay media inside iframe canvas.
    const disableMediaAutoplayOnLoad = () => {
        try {
            document.querySelectorAll('audio,video').forEach((mediaEl) => {
                mediaEl.removeAttribute('autoplay');
                mediaEl.autoplay = false;
                mediaEl.pause?.();
            });
            const musicBtn = document.getElementById('musicToggle') || document.getElementById('music-toggle') || document.querySelector('.music-btn');
            const musicIcon = document.querySelector('.music-icon');
            musicBtn?.classList.remove('playing');
            musicIcon?.classList.remove('is-playing');
        } catch (error) {
            console.warn('[Music Policy] Failed to disable autoplay on load:', error);
        }
    };
    disableMediaAutoplayOnLoad();

    const CLICK_MUSIC_ICON_ID = '1005';
    const CLICK_MUSIC_STYLE = `
      @keyframes hiweb-click-music-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      #musicToggle.hiweb-click-music-button,
      #music-toggle.hiweb-click-music-button,
      .music-btn.hiweb-click-music-button {
        position: fixed !important;
        right: 24px !important;
        bottom: 24px !important;
        left: auto !important;
        top: auto !important;
        z-index: 99999 !important;
        width: auto !important;
        min-width: 148px !important;
        height: 40px !important;
        min-height: 40px !important;
        padding: 0 0 0 14px !important;
        border-radius: 999px !important;
        background: #101854 !important;
        border: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 6px !important;
        overflow: visible !important;
        cursor: pointer !important;
        box-shadow: 0 10px 26px rgba(16, 24, 84, 0.22) !important;
        transform: none !important;
      }

      .hiweb-click-music-button .hiweb-click-music-label {
        color: #ffffff !important;
        font-family: Georgia, "Times New Roman", serif !important;
        font-size: 16px !important;
        font-weight: 600 !important;
        line-height: 1 !important;
        letter-spacing: 0 !important;
        white-space: nowrap !important;
        pointer-events: none !important;
      }

      .hiweb-click-music-button .music-icon {
        width: 44px !important;
        height: 44px !important;
        min-width: 44px !important;
        min-height: 44px !important;
        border-radius: 50% !important;
        object-fit: contain !important;
        flex: 0 0 44px !important;
        margin: 0 -5px 0 0 !important;
        display: block !important;
        transform-origin: 50% 50% !important;
      }

      .hiweb-click-music-button .music-icon img {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
        border-radius: 50% !important;
        display: block !important;
      }

      .hiweb-click-music-button.playing .music-icon,
      .hiweb-click-music-button.is-playing .music-icon,
      .hiweb-click-music-button .music-icon.is-playing {
        animation: hiweb-click-music-spin 3s linear infinite !important;
      }

      @media (max-width: 520px) {
        #musicToggle.hiweb-click-music-button,
        #music-toggle.hiweb-click-music-button,
        .music-btn.hiweb-click-music-button {
          right: 14px !important;
          bottom: 14px !important;
          min-width: 132px !important;
          height: 36px !important;
          min-height: 36px !important;
          padding-left: 12px !important;
          gap: 5px !important;
        }

        .hiweb-click-music-button .hiweb-click-music-label {
          font-size: 14px !important;
        }

        .hiweb-click-music-button .music-icon {
          width: 40px !important;
          height: 40px !important;
          min-width: 40px !important;
          min-height: 40px !important;
          flex-basis: 40px !important;
        }
      }
    `;

    function applyCustomMusicIcon(iconUrl, iconId) {
        if (!iconUrl) return;

        let musicIcon = document.querySelector('.music-icon');
        let button = musicIcon?.closest('button') || document.getElementById('musicToggle') || document.getElementById('music-toggle') || musicIcon?.closest('.music-btn');

        if (!musicIcon && iconId === CLICK_MUSIC_ICON_ID) {
            button = button || document.createElement('button');
            button.id = button.id || 'music-toggle';
            button.type = 'button';
            button.setAttribute('aria-label', 'Bật nhạc nền');
            musicIcon = document.createElement('img');
            musicIcon.className = 'music-icon';
            button.appendChild(musicIcon);
            if (!button.parentElement) document.body.appendChild(button);
        }

        if (!musicIcon) return;

        const isImgEl = musicIcon.tagName.toLowerCase() === 'img';
        if (!musicIcon.hasAttribute('data-default-icon')) {
            const original = isImgEl ? (musicIcon.getAttribute('src') || '') : (musicIcon.textContent || '♪');
            musicIcon.setAttribute('data-default-icon', original);
        }

        if (button) {
            button.classList.remove('hiweb-click-music-button');
            button.querySelector('.hiweb-click-music-label')?.remove();
        }
        if (iconId !== CLICK_MUSIC_ICON_ID) {
            document.getElementById('hiweb-click-music-style')?.remove();
            if (button && !button.classList.contains('music-toggle') && (button.id === 'music-toggle' || button.id === 'musicToggle')) {
                button.classList.add('music-toggle');
            }
        }

        if (isImgEl) musicIcon.setAttribute('src', iconUrl);
        else musicIcon.innerHTML = '<img src="' + iconUrl + '" style="width:100%;height:100%;object-fit:contain;" alt="" />';

        if (iconId) musicIcon.setAttribute('data-icon-id', iconId);
        if (iconId !== CLICK_MUSIC_ICON_ID || !button) return;

        document.getElementById('hiweb-click-music-style')?.remove();
        const style = document.createElement('style');
        style.id = 'hiweb-click-music-style';
        style.textContent = CLICK_MUSIC_STYLE;
        document.head.appendChild(style);

        button.classList.add('hiweb-click-music-button');
        if (!button.querySelector('.hiweb-click-music-label')) {
            const label = document.createElement('span');
            label.className = 'hiweb-click-music-label';
            label.textContent = 'CLICK MUSIC';
            button.insertBefore(label, musicIcon);
        }
    }

    // ── State ─────────────────────────────────────────────────────────────────
    let dragState = null;
    let interactionMode = 'pointer';
    let overflowStack = [];
    const allowParentDragging = {};
    let currentSelectedImage = null;
    const pendingConfirms = {};
    let selectionHandles = null;
    let rotationMenu = null;
    let selectionAnimationFrame = null;
    let edgeScrollRafId = null;

    // ── Lock helpers ──────────────────────────────────────────────────────────
    /**
     * Check if an element is locked.
     * Covers ALL editable types: text ([data-editable], [data-editor-id]),
     * image ([data-image-editable]), stock items (img tags), and map elements.
     * @param {HTMLElement} el
     * @returns {boolean}
     */
    const isElementLocked = (el) => {
        if (!el) return false;
        return el.getAttribute('data-locked') === 'true' ||
            el.classList.contains('editor-element-locked');
    };

    /**
     * Apply locked visual state to element.
     * Works for all element types: text, image, stock.
     * @param {HTMLElement} el
     * @param {boolean} locked
     */
    const applyLockState = (el, locked) => {
        if (!el) return;
        el.setAttribute('data-locked', String(locked));
        if (locked) {
            el.classList.add('editor-element-locked');
            el.style.cursor = 'not-allowed';
        } else {
            el.classList.remove('editor-element-locked');
            el.style.cursor = '';
        }
    };

    // ── ElementStackManager ───────────────────────────────────────────────────
    class ElementStackManager {
        constructor() {
            this.cache = { x: null, y: null, stack: [], currentIndex: 0 };
            this.POSITION_TOLERANCE = 5;
        }

        getStackAtPosition(x, y) {
            try {
                const elements = document.elementsFromPoint?.(x, y) || document.msElementsFromPoint?.(x, y) || [];
                if (!elements || elements.length === 0) {
                    const single = document.elementFromPoint(x, y);
                    return single ? [single].filter(el => this.isInteractiveElement(el)) : [];
                }
                return Array.from(elements).filter(el => this.isInteractiveElement(el));
            } catch (error) {
                const single = document.elementFromPoint(x, y);
                return single && this.isInteractiveElement(single) ? [single] : [];
            }
        }

        isSamePosition(x, y) {
            if (this.cache.x === null || this.cache.y === null) return false;
            return Math.abs(x - this.cache.x) <= this.POSITION_TOLERANCE &&
                Math.abs(y - this.cache.y) <= this.POSITION_TOLERANCE;
        }

        cycleNext(x, y) {
            if (!this.isSamePosition(x, y)) {
                this.cache.x = x; this.cache.y = y;
                this.cache.stack = this.getStackAtPosition(x, y);
                this.cache.currentIndex = 0;
            } else if (this.cache.stack.length > 0) {
                this.cache.currentIndex = (this.cache.currentIndex + 1) % this.cache.stack.length;
            }
            return this.cache.stack[this.cache.currentIndex] || null;
        }

        reset() {
            this.cache = { x: null, y: null, stack: [], currentIndex: 0 };
        }

        isInteractiveElement(el) {
            if (!el || !el.hasAttribute) return false;
            // Elements explicitly marked as non-editable (e.g. chrome system tabs)
            if (el.hasAttribute('data-editor-ignore')) return false;
            return !!(
                el.hasAttribute('data-editable') || el.hasAttribute('data-editor-id') ||
                el.hasAttribute('data-image-editable') || el.hasAttribute('data-edit-map') ||
                el.hasAttribute('data-edit-map-href') || el.tagName === 'IMG'
            );
        }
    }

    const elementStackManager = new ElementStackManager();

    // ── SelectionManager ──────────────────────────────────────────────────────
    class SelectionManager {
        constructor() {
            this.currentElement = null;
            this.originalZIndex = null;
            /** Khi true: không đổi z-index lúc chọn và không khôi phục z cũ lúc bỏ chọn (panel Lớp / sau renormalize stack). */
            this.skipZRestoreOnDeselect = false;
            this.TEMP_Z_INDEX = 999999;
            this.savedAnimations = new Map(); // Store animation states
        }

        select(element, opts) {
            opts = opts || {};
            const skipZBoost = !!opts.skipZBoost;
            if (!element || !document.body.contains(element)) { this.deselect(); return; }
            if (this.currentElement === element) return;
            this.deselect();
            this.currentElement = element;
            this.skipZRestoreOnDeselect = skipZBoost;
            this.originalZIndex = element.style.zIndex || '';
            // REMOVED: z-index boosting during selection to prevent ever-increasing z-index values
            // Selection is now indicated purely by visual styles (outline, box-shadow)


            // ── FIX: Preserve animation before adding selected class ──
            try {
                const computedStyle = window.getComputedStyle(element);
                const animation = computedStyle.animation || computedStyle.webkitAnimation || '';
                if (animation && animation !== 'none' && animation !== '') {
                    this.savedAnimations.set(element, animation);
                    // Store inline animation if exists
                    if (element.style.animation) {
                        element.dataset.editorSavedAnimation = element.style.animation;
                    }
                }
            } catch (e) {
                console.warn('[Animation Preservation] Failed to capture animation:', e);
            }

            element.classList.add('selected');

            // ── FIX: Reapply animation after adding selected class ──
            // Only reapply if we have inline animation saved
            if (element.dataset.editorSavedAnimation) {
                try {
                    element.style.animation = element.dataset.editorSavedAnimation;
                } catch (e) {
                    console.warn('[Animation Preservation] Failed to reapply animation:', e);
                }
            }

            this.notifySelectionChange(element);
        }

        /** Gọi sau khi gán z-index mới (vd. renormalize stack) để deselect không khôi phục số cũ. */
        syncStoredZIndexFromDom() {
            if (!this.currentElement || !document.body.contains(this.currentElement)) return;
            this.originalZIndex = this.currentElement.style.zIndex || '';
        }

        deselect() {
            if (!this.currentElement) return;
            try {
                if (document.body.contains(this.currentElement)) {
                    // ✅ MODIFIED: Don't revert z-index on deselect if we want it to stay on top
                    // We only revert if it was a temporary boost that shouldn't persist.
                    // But user wants it to stay "lun lớn hơn", so we keep the new z-index.
                    if (!this.skipZRestoreOnDeselect) {
                        this.currentElement.style.zIndex = this.originalZIndex;
                    }

                    this.currentElement.classList.remove('selected');
                    // Clean up saved animation data
                    this.savedAnimations.delete(this.currentElement);
                    if (this.currentElement.dataset.editorSavedAnimation) {
                        delete this.currentElement.dataset.editorSavedAnimation;
                    }
                }
            } catch (error) {
                console.error('Error restoring element state during deselect:', error);
            } finally {
                this.currentElement = null;
                this.originalZIndex = null;
                this.skipZRestoreOnDeselect = false;
            }
        }

        getSelected() { return this.currentElement; }

        notifySelectionChange(element) {
            if (!element) return;
            const id = this.getElementId(element);
            const isImage = element.tagName === 'IMG' || element.hasAttribute('data-image-editable');
            let currentZIndex = 0;
            if (this.skipZRestoreOnDeselect) {
                const iz = element.style.zIndex;
                if (iz && iz !== '' && iz !== 'auto') currentZIndex = parseInt(iz, 10) || 0;
                else currentZIndex = parseInt(window.getComputedStyle(element).zIndex, 10) || 0;
            } else {
                currentZIndex = parseInt(this.originalZIndex || '0', 10);
            }
            // Also report lock state so parent UI can reflect it
            const locked = isElementLocked(element);
            try {
                window.parent.postMessage({
                    __html_editor: true,
                    type: 'ELEMENT_SELECTED',
                    targetId: id, isImage, currentZIndex, locked
                }, '*');
            } catch (error) {
                console.error('Error sending selection notification:', error);
            }
        }

        getElementId(element) {
            if (!element || !element.getAttribute) return '';
            return (
                element.getAttribute('data-image-editable') ||
                element.getAttribute('data-editable') ||
                element.getAttribute('data-editor-id') ||
                element.getAttribute('data-edit-map') ||
                element.getAttribute('data-edit-map-href') || ''
            );
        }
    }

    const selectionManager = new SelectionManager();

    // ── ParentDragController ──────────────────────────────────────────────────
    class ParentDragController {
        constructor() {
            this.allowedParents = new Set();
            this.timeouts = new Map();
        }

        isParentElement(element) {
            if (!element || !element.querySelector) return false;
            const editableSelector = [
                '[data-editable]', '[data-editor-id]', '[data-image-editable]',
                '[data-edit-map]', '[data-edit-map-href]', 'img'
            ].join(',');
            return !!element.querySelector(editableSelector);
        }

        canDrag(element) {
            if (!element) return false;
            // ── LOCK CHECK: applies to ALL types (text, image, stock) ──
            if (isElementLocked(element)) return false;
            const elementId = this.getElementId(element);
            if (elementId && this.allowedParents.has(elementId)) return true;
            if (this.isParentElement(element)) return false;
            return true;
        }

        allowParentDrag(elementId) {
            if (!elementId) return;
            this.allowedParents.add(elementId);
            if (this.timeouts.has(elementId)) clearTimeout(this.timeouts.get(elementId));
            const timeoutId = setTimeout(() => this.disallowParentDrag(elementId), 30000);
            this.timeouts.set(elementId, timeoutId);
        }

        disallowParentDrag(elementId) {
            if (!elementId) return;
            this.allowedParents.delete(elementId);
            if (this.timeouts.has(elementId)) {
                clearTimeout(this.timeouts.get(elementId));
                this.timeouts.delete(elementId);
            }
        }

        clearAllPermissions() {
            this.timeouts.forEach(id => clearTimeout(id));
            this.timeouts.clear();
            this.allowedParents.clear();
        }

        getElementId(element) {
            if (!element || !element.getAttribute) return '';
            return (
                element.getAttribute('data-image-editable') ||
                element.getAttribute('data-editable') ||
                element.getAttribute('data-editor-id') ||
                element.getAttribute('data-edit-map') ||
                element.getAttribute('data-edit-map-href') || ''
            );
        }
    }

    const parentDragController = new ParentDragController();

    // ── Storage helpers ───────────────────────────────────────────────────────
    // const getScopedKey = (key) => {
    //     const scope = window.__htmlEditorScope;
    //     if (scope && scope.key) return `scoped:${scope.key}:${key}`;
    //     return key;
    // };

    const STORAGE_KEY = getScopedKey('html-editor-transforms');
    const ORIGINAL_STYLE_KEY = getScopedKey('html-editor-original-styles');

    const STYLE_ONLY_PROPS = [
        'color', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat', 'backgroundClip',
        'fontSize', 'fontWeight', 'fontStyle', 'fontFamily', 'textAlign', 'textDecoration', 'letterSpacing', 'wordSpacing', 'lineHeight',
        'textTransform', 'fontVariant', 'textShadow', 'borderWidth', 'borderColor', 'borderRadius', 'borderStyle', 'boxShadow',
        'opacity', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
        'whiteSpace', 'wordBreak', 'overflowWrap',
    ];

    const readTransformsFromSession = (key) => {
        try { return JSON.parse(sessionStorage.getItem(key) || '{}'); } catch { return {}; }
    };

    const readTransformsFromStorage = (key) => {
        try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
    };

    const readOriginalStylesFromSession = (key) => {
        try { return JSON.parse(sessionStorage.getItem(key) || '{}'); } catch { return {}; }
    };

    const saveOriginalStylesToSession = (id, styles) => {
        if (!id || !styles) return;
        try {
            const saved = readOriginalStylesFromSession(ORIGINAL_STYLE_KEY);
            if (!saved[id]) {
                saved[id] = styles;
                sessionStorage.setItem(ORIGINAL_STYLE_KEY, JSON.stringify(saved));
                if (window.__htmlEditorScope && window.__htmlEditorScope.key) {
                    sessionStorage.setItem('html-editor-original-styles-scope', window.__htmlEditorScope.key);
                }
            }
        } catch (e) {
            console.error('Failed to save original styles:', e);
        }
    };

    const getOriginalStyles = (id) => id ? (readOriginalStylesFromSession(ORIGINAL_STYLE_KEY)[id] || null) : null;

    const captureOriginalStyles = (el) => {
        if (!el) return null;
        const styles = {};
        const computedStyle = window.getComputedStyle(el);
        STYLE_ONLY_PROPS.forEach((prop) => {
            const value = computedStyle.getPropertyValue(prop);
            if (value && value !== 'none' && value !== '') {
                styles[prop] = value;
            }
        });
        return Object.keys(styles).length ? styles : null;
    };

    const ensureOriginalStyles = (id, el) => {
        if (!id || !el) return;
        if (!getOriginalStyles(id)) {
            const original = captureOriginalStyles(el);
            if (original) saveOriginalStylesToSession(id, original);
        }
    };

    const restoreOriginalStyles = (id, el) => {
        if (!id || !el) return false;
        const original = getOriginalStyles(id);
        const keys = STYLE_ONLY_PROPS;
        if (original) {
            keys.forEach((prop) => {
                if (original[prop] !== undefined) {
                    el.style[prop] = original[prop];
                } else {
                    el.style[prop] = '';
                }
            });
            return true;
        }
        keys.forEach((prop) => { el.style[prop] = ''; });
        return false;
    };

    const saveElementTransform = (id, transform) => {
        try {
            const saved = readTransformsFromSession(STORAGE_KEY);
            saved[id] = transform;
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

            // Also save current scope to validate transforms later
            if (window.__htmlEditorScope && window.__htmlEditorScope.key) {
                sessionStorage.setItem('html-editor-transforms-scope', window.__htmlEditorScope.key);
            }
        } catch (e) { console.error('Failed to save transform:', e); }
    };

    const loadElementTransforms = () => {
        try {
            const session = readTransformsFromSession(STORAGE_KEY);
            const local = readTransformsFromStorage(STORAGE_KEY);
            return Object.assign({}, local, session);
        } catch { return {}; }
    };

    const getSavedTransform = (id) => id ? (loadElementTransforms()[id] || '') : '';

    const saveRotationToSession = (id, rotation) => {
        if (!id) return;
        try {
            const r = JSON.parse(sessionStorage.getItem('html-editor-rotations') || '{}');
            r[id] = rotation;
            sessionStorage.setItem('html-editor-rotations', JSON.stringify(r));
        } catch { }
    };

    const getRotationFromSession = (id) => {
        if (!id) return null;
        try {
            const r = JSON.parse(sessionStorage.getItem('html-editor-rotations') || '{}');
            return r[id] !== undefined ? parseFloat(r[id]) : null;
        } catch { return null; }
    };

    // ── FIX: Text content persistence helpers ────────────────────────────────
    const saveTextContentToStorage = (isLocal = true) => {
        try {
            const textContent = {};
            const editableElements = document.querySelectorAll('[data-editable], [data-editor-id]');
            editableElements.forEach(el => {
                const id = el.getAttribute('data-editable') || el.getAttribute('data-editor-id');
                if (id && el.tagName !== 'IMG') {
                    textContent[id] = el.innerHTML || '';
                }
            });
            const data = JSON.stringify(textContent);
            if (isLocal) localStorage.setItem(getScopedKey('html-editor-text-content'), data);
            sessionStorage.setItem('html-editor-text-content', data);
            return true;
        } catch (e) {
            console.error('[Text Persistence] Failed to save text content:', e);
            return false;
        }
    };

    const restoreTextContentFromLocalStorage = () => {
        try {
            const saved = localStorage.getItem(getScopedKey('html-editor-text-content'));
            if (!saved) return;
            const textContent = JSON.parse(saved);
            Object.keys(textContent).forEach(id => {
                const elements = document.querySelectorAll(
                    `[data-editable="${id}"], [data-editor-id="${id}"]`
                );
                elements.forEach(el => {
                    if (el.tagName !== 'IMG') {
                        el.innerHTML = textContent[id];
                    }
                });
            });
        } catch (e) {
            console.warn('[Text Persistence] Failed to restore text content:', e);
        }
    };

    // ── Call restore text content after function is defined ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(restoreTextContentFromLocalStorage, 100);
        });
    } else {
        setTimeout(restoreTextContentFromLocalStorage, 100);
    }

    // ── FIX: Background persistence helpers ──────────────────────────────────
    const saveBackgroundToLocalStorage = () => {
        try {
            const bgData = sessionStorage.getItem('html-editor-background');
            if (bgData) {
                localStorage.setItem(getScopedKey('html-editor-background'), bgData);
            }
            return true;
        } catch (e) {
            console.error('[Background Persistence] Failed to save background:', e);
            return false;
        }
    };

    // ── FIX: Z-index persistence helpers ──────────────────────────────────────
    const saveZIndexToLocalStorage = () => {
        try {
            const zIndexData = {};
            // Get all editable elements (text, images, maps, etc.)
            const editableElements = document.querySelectorAll(
                '[data-editable], [data-editor-id], [data-image-editable], [data-edit-map], [data-edit-map-href], img'
            );
            editableElements.forEach(el => {
                const id = el.getAttribute('data-editable') ||
                    el.getAttribute('data-editor-id') ||
                    el.getAttribute('data-image-editable') ||
                    el.getAttribute('data-edit-map') ||
                    el.getAttribute('data-edit-map-href');
                if (id && el.style.zIndex) {
                    zIndexData[id] = el.style.zIndex;
                }
            });
            localStorage.setItem(getScopedKey('html-editor-z-index'), JSON.stringify(zIndexData));
            console.log('[Z-Index Persistence] Saved z-index data:', zIndexData);
            return true;
        } catch (e) {
            console.error('[Z-Index Persistence] Failed to save z-index:', e);
            return false;
        }
    };

    const restoreZIndexFromLocalStorage = () => {
        try {
            const saved = localStorage.getItem(getScopedKey('html-editor-z-index'));
            if (!saved) return;
            const zIndexData = JSON.parse(saved);
            Object.keys(zIndexData).forEach(id => {
                const elements = document.querySelectorAll(
                    `[data-editable="${id}"], [data-editor-id="${id}"], [data-image-editable="${id}"], [data-edit-map="${id}"], [data-edit-map-href="${id}"]`
                );
                elements.forEach(el => {
                    // Nếu template đã có data-z-index thì có thể đang là giá trị "mặc định" (chưa phản ánh reorder đã lưu).
                    // Chỉ skip khi giá trị đang có khớp với giá trị từ localStorage.
                    const existing = el.getAttribute && el.getAttribute('data-z-index');
                    const next = zIndexData[id];
                    if (existing != null && String(existing) === String(next)) return;
                    el.style.zIndex = next;
                    el.setAttribute('data-z-index', String(next));
                    // Ensure element has position set for z-index to work
                    ensurePositionForStacking(el);
                });
            });
            console.log('[Z-Index Persistence] Restored z-index data:', zIndexData);
        } catch (e) {
            console.warn('[Z-Index Persistence] Failed to restore z-index:', e);
        }
    };

    // ── Call restore z-index after function is defined ──
    // Luôn áp dụng từ HTML trước (nguồn đã persist), rồi mới localStorage cho phần tử chưa có trong template.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                restoreZIndexFromHTML();
                restoreZIndexFromLocalStorage();
            }, 150);
        });
    } else {
        setTimeout(() => {
            restoreZIndexFromHTML();
            restoreZIndexFromLocalStorage();
        }, 150);
    }

    // Restore z-index from HTML inline styles and data attributes
    const restoreZIndexFromHTML = () => {
        try {
            const editableElements = document.querySelectorAll(
                '[data-editable], [data-editor-id], [data-image-editable], [data-edit-map], [data-edit-map-href], img'
            );
            editableElements.forEach(el => {
                // First try to get from data-z-index attribute
                const dataZIndex = el.getAttribute('data-z-index');
                if (dataZIndex) {
                    el.style.zIndex = dataZIndex;
                    ensurePositionForStacking(el);
                }
                // If element already has inline z-index style, ensure position is set
                else if (el.style.zIndex) {
                    ensurePositionForStacking(el);
                    // Also set data attribute for consistency
                    el.setAttribute('data-z-index', el.style.zIndex);
                }
            });
            console.log('[Z-Index HTML] Restored z-index from HTML attributes and inline styles');
        } catch (e) {
            console.warn('[Z-Index HTML] Failed to restore z-index from HTML:', e);
        }
    };

    // const getElementStorageId = (el) => {
    //     if (!el) return null;
    //     const baseId = el.getAttribute('data-image-editable') ||
    //         el.getAttribute('data-editable') ||
    //         el.getAttribute('data-editor-id') ||
    //         el.getAttribute('data-edit-map') ||
    //         el.getAttribute('data-edit-map-href');

    //     if (!baseId) return null;

    //     // Add scope prefix to ensure uniqueness across templates
    //     if (window.__htmlEditorScope && window.__htmlEditorScope.key) {
    //         return `${window.__htmlEditorScope.key}:${baseId}`;
    //     }
    //     return baseId;
    // };

    const getElementStorageId = (el) => el && (
        el.getAttribute('data-image-editable') || el.getAttribute('data-editable') ||
        el.getAttribute('data-editor-id') || el.getAttribute('data-edit-map') ||
        el.getAttribute('data-edit-map-href')
    ) || null;

    // ── Helper utilities ──────────────────────────────────────────────────────
    const toNum = (v, fallback = 0) => { const n = parseFloat(v); return isNaN(n) ? fallback : n; };

    const applyDimensionValue = (styleRef, key, value) => {
        if (!styleRef || value == null || value === '') return;
        if (typeof value === 'number' && !isNaN(value)) { styleRef[key] = value + 'px'; return; }
        if (typeof value === 'string') {
            const t = value.trim();
            if (t) styleRef[key] = /^-?\d+(\.\d+)?$/.test(t) ? t + 'px' : t;
        }
    };

    const getHighestZIndex = (min = 0) => {
        let max = min;
        document.querySelectorAll('[data-editable],[data-editor-id],[data-image-editable],[data-edit-map],[data-edit-map-href],img').forEach(n => {
            try {
                const z = parseInt(window.getComputedStyle(n).zIndex, 10);
                if (!isNaN(z) && z > max) max = z;
            } catch { }
        });
        return max;
    };

    /**
     * ✅ NEW: Get global scale factor (accounting for iframe zoom/scale)
     */
    const getGlobalScale = () => {
        try {
            // Measure a 100px segment in the iframe's viewport and see how many pixels it takes in the parent viewport
            const docRect = document.documentElement.getBoundingClientRect();
            const scale = Math.round((docRect.width / window.innerWidth) * 100) / 100;
            return scale > 0 ? scale : 1;
        } catch (e) {
            return 1;
        }
    };

    const getElementsAtPosition = (x, y, excludeElement = null) => {
        try {
            const elements = document.elementsFromPoint?.(x, y) || document.msElementsFromPoint?.(x, y) || [];
            if (!elements || elements.length === 0) {
                const single = document.elementFromPoint(x, y);
                return (single && single !== excludeElement) ? [single] : [];
            }
            return Array.from(elements).filter(el => el !== excludeElement);
        } catch {
            const single = document.elementFromPoint(x, y);
            return (single && single !== excludeElement) ? [single] : [];
        }
    };

    const normalizeRotation = (v) => ((toNum(v, 0) % 360) + 360) % 360;

    const extractRotationFromMatrix = (t) => {
        if (!t || t === 'none') return null;
        const m2d = t.match(/matrix\(([^)]+)\)/);
        if (m2d) {
            const v = m2d[1].split(',').map(x => parseFloat(x.trim()));
            if (v.length >= 2 && !isNaN(v[0]) && !isNaN(v[1])) return normalizeRotation(Math.atan2(v[1], v[0]) * (180 / Math.PI));
        }
        const m3d = t.match(/matrix3d\(([^)]+)\)/);
        if (m3d) {
            const v = m3d[1].split(',').map(x => parseFloat(x.trim()));
            if (v.length >= 2 && !isNaN(v[0]) && !isNaN(v[1])) return normalizeRotation(Math.atan2(v[1], v[0]) * (180 / Math.PI));
        }
        return null;
    };

    const getCurrentRotation = (el) => {
        if (!el) return 0;
        const t = (el.style && el.style.transform) || '';
        const m = t.match(/rotate(?:z)?\(\s*([^)]+)\s*\)/i);
        if (m && m[1]) {
            const raw = m[1].trim();
            const deg = raw.match(/^(-?\d+(?:\.\d+)?)\s*deg$/i);
            if (deg) return normalizeRotation(deg[1]);
            const rad = raw.match(/^(-?\d+(?:\.\d+)?)\s*rad$/i);
            if (rad) return normalizeRotation(parseFloat(rad[1]) * (180 / Math.PI));
            const turn = raw.match(/^(-?\d+(?:\.\d+)?)\s*turn$/i);
            if (turn) return normalizeRotation(parseFloat(turn[1]) * 360);
        }
        let computed = '';
        try { computed = window.getComputedStyle(el).transform || ''; } catch { }
        let rotation = extractRotationFromMatrix(computed);
        if (rotation === null) rotation = 0;
        if (rotation === 0 && el) {
            let ds = el.dataset?.editorRotation ? parseFloat(el.dataset.editorRotation) : null;
            if (isNaN(ds)) ds = getRotationFromSession(getElementStorageId(el));
            if (!isNaN(ds) && ds !== null) rotation = normalizeRotation(ds);
        }
        return rotation;
    };

    const getVisualRotation = (el) => {
        if (!el) return 0;
        let hasOwn = false;
        try { hasOwn = !!(el.style?.transform && el.style.transform !== 'none') || !!(window.getComputedStyle(el).transform !== 'none'); } catch { }
        if (hasOwn) return getCurrentRotation(el);
        const desc = el.querySelectorAll ? el.querySelectorAll('*') : [];
        for (const d of desc) { const r = getCurrentRotation(d); if (r) return r; }
        return 0;
    };

    // Get total rotation including all parent elements
    function getTotalRotationWithParents(el) {
        let total = 0;
        let current = el;

        while (current && current.nodeType === 1) {
            const style = window.getComputedStyle(current);
            const transform = style.transform;

            let rot = extractRotationFromMatrix(transform);
            if (rot === null) rot = 0;

            total += rot;

            current = current.parentElement;
        }

        return normalizeRotation(total);
    }

    const getContentSelectionRect = (el) => {
        if (!el?.getBoundingClientRect) return null;
        const base = el.getBoundingClientRect();
        if (!(el.getAttribute('data-editable') || el.getAttribute('data-editor-id')) || !document.createRange) return base;
        try {
            const range = document.createRange();
            range.selectNodeContents(el);
            const rects = Array.from(range.getClientRects() || []).filter(r => r.width > 2 && r.height > 2);
            if (!rects.length) return base;
            const left = Math.min(...rects.map(r => r.left)), top = Math.min(...rects.map(r => r.top));
            const right = Math.max(...rects.map(r => r.right)), bottom = Math.max(...rects.map(r => r.bottom));
            const rr = { left, top, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
            return (rr.width * rr.height < base.width * base.height * 0.8) ? rr : base;
        } catch { return base; }
    };

    const parseTransformFunctions = (t) => {
        const fns = [], re = /(\w+)\(([^)]+)\)/g;
        let m;
        while ((m = re.exec(t || '')) !== null) fns.push({ name: m[1], value: m[2] });
        return fns;
    };

    const getElementTransformState = (el) => {
        const fns = parseTransformFunctions(el?.style?.transform || '');
        let tx = toNum(el?.dataset?.editorTx, 0), ty = toNum(el?.dataset?.editorTy, 0);
        const others = [];
        let translateFound = false;
        fns.forEach(fn => {
            if (fn.name === 'translate') {
                // ✅ FIX: Giữ lại các translate dạng % (thường dùng để căn giữa trong template)
                // Chỉ trích xuất các translate dạng pixel do Editor quản lý.
                if (fn.value.includes('%')) {
                    others.push(fn.name + '(' + fn.value + ')');
                } else {
                    const [a, b] = fn.value.split(',');
                    tx = parseFloat(a) || 0; ty = parseFloat(b) || 0;
                    translateFound = true;
                }
            } else { others.push(fn.name + '(' + fn.value + ')'); }
        });
        const hasRotate = others.some(o => o.startsWith('rotate('));
        if (!hasRotate && el) {
            let r = el.dataset?.editorRotation ? parseFloat(el.dataset.editorRotation) : null;
            if (isNaN(r)) r = getRotationFromSession(getElementStorageId(el));
            if (!isNaN(r) && r !== null && r !== 0) others.push('rotate(' + r + 'deg)');
        }
        if (el?.dataset) { el.dataset.editorTx = String(tx); el.dataset.editorTy = String(ty); }
        return { tx, ty, hasTranslate: translateFound || !!(tx || ty), others };
    };

    const buildTransformString = (tx, ty, otherTransforms) => {
        const parts = ['translate(' + Math.round(tx || 0) + 'px, ' + Math.round(ty || 0) + 'px)'];
        if (Array.isArray(otherTransforms)) parts.push(...otherTransforms.filter(Boolean));
        return parts.join(' ').trim();
    };

    const updateRotationBadge = (el) => {
        if (!selectionHandles || !el) return;
        const badge = selectionHandles.querySelector('.word-rotate-coords');
        if (!badge) return;
        const state = getElementTransformState(el);
        let rotation = normalizeRotation(getVisualRotation(el));
        if (rotation === 0) {
            let ds = el.dataset?.editorRotation ? parseFloat(el.dataset.editorRotation) : null;
            if (isNaN(ds)) ds = getRotationFromSession(getElementStorageId(el));
            if (!isNaN(ds) && ds !== null) rotation = normalizeRotation(ds);
        }
        badge.textContent = Math.round(rotation) + ' °  x:' + Math.round(state.tx) + '  y:' + Math.round(state.ty);
        const id = getElementStorageId(el);
        if (id) saveRotationToSession(id, rotation);
    };

    const saveInlineSnapshot = (el, keys) => {
        if (!el?.dataset || !Array.isArray(keys)) return;
        keys.forEach(k => {
            const dk = 'editorOriginal' + k[0].toUpperCase() + k.slice(1);
            if (!(dk in el.dataset)) el.dataset[dk] = el.style[k] || '';
        });
    };

    const restoreInlineSnapshot = (el, keys) => {
        if (!el?.dataset || !Array.isArray(keys)) return;
        keys.forEach(k => {
            const dk = 'editorOriginal' + k[0].toUpperCase() + k.slice(1);
            if (dk in el.dataset) { el.style[k] = el.dataset[dk] || ''; delete el.dataset[dk]; }
        });
    };

    const applyTempHighlight = (el, styles, duration = 1000) => {
        if (!el || !styles) return;
        const keys = Object.keys(styles);
        saveInlineSnapshot(el, keys);
        keys.forEach(k => { el.style[k] = styles[k]; });
        setTimeout(() => restoreInlineSnapshot(el, keys), duration);
    };

    const snapshotElementIdentity = (el) => {
        if (!el?.attributes) return null;
        const attrs = {};
        Array.from(el.attributes).forEach(a => {
            if (a.name === 'id' || a.name === 'class' || a.name.startsWith('data-')) attrs[a.name] = a.value;
        });
        if (el.style?.cssText) attrs['__inline_style'] = el.style.cssText;
        return attrs;
    };

    const restoreElementIdentity = (el, snapshot) => {
        if (!el || !snapshot) return;
        Object.entries(snapshot).forEach(([name, val]) => {
            if (name.startsWith('data-editor-')) return;
            if (name === '__inline_style') {
                if (el.style && val) {
                    const { transform: t, zIndex: z, position: p } = el.style;
                    el.style.cssText = val;
                    if (t) el.style.transform = t;
                    if (z) el.style.zIndex = z;
                    if (p) el.style.position = p;
                }
                return;
            }
            if (name === 'class') {
                const merged = [...new Set([...val.split(/\s+/), ...el.getAttribute('class', '').split(/\s+/)].filter(Boolean))];
                if (merged.length) el.setAttribute('class', merged.join(' '));
                return;
            }
            if (el.getAttribute(name) !== val) el.setAttribute(name, val);
        });
    };

    const calcAngle = (cx, cy, mx, my) => Math.atan2(my - cy, mx - cx) * (180 / Math.PI);

    const preserveRotatableTextPosition = (el) => {
        if (!el || window.getComputedStyle(el).display !== 'inline') return;
        const before = el.getBoundingClientRect();
        el.style.display = 'inline-block';
        const after = el.getBoundingClientRect();
        const dx = before.left - after.left, dy = before.top - after.top;
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;
        const fns = parseTransformFunctions(el.style.transform || '');
        let found = false;
        const updated = fns.map(fn => {
            if (fn.name !== 'translate') return fn.name + '(' + fn.value + ')';
            found = true;
            const [a, b] = fn.value.split(',');
            return 'translate(' + Math.round((parseFloat(a) || 0) + dx) + 'px, ' + Math.round((parseFloat(b) || 0) + dy) + 'px)';
        });
        if (!found) updated.unshift('translate(' + Math.round(dx) + 'px, ' + Math.round(dy) + 'px)');
        el.style.transform = updated.join(' ').trim();
        el.dataset.editorTx = Math.round(toNum(el.dataset.editorTx) + dx);
        el.dataset.editorTy = Math.round(toNum(el.dataset.editorTy) + dy);
    };

    // ── Editable node checks ──────────────────────────────────────────────────
    const EDITABLE_ATTRS = ['data-editable', 'data-editor-id', 'data-image-editable', 'data-edit-map', 'data-edit-map-href', 'data-history'];
    const EDITABLE_SEL = EDITABLE_ATTRS.map(a => '[' + a + ']').join(',');

    const isEditableNode = (el) => !!(el?.hasAttribute && EDITABLE_ATTRS.some(a => el.hasAttribute(a)));

    const getEditableId = (el) => {
        if (!el?.getAttribute) return '';
        return EDITABLE_ATTRS.reduce((acc, a) => acc || el.getAttribute(a), '') || '';
    };

    const queryEditableAll = (id) => {
        if (!id) return [];
        try {
            return Array.from(document.querySelectorAll(EDITABLE_ATTRS.map(a => '[' + a + '="' + id + '"]').join(',')) || []);
        } catch { return []; }
    };

    const hasEditableChildren = (el) => !!(el?.querySelector?.(EDITABLE_SEL));

    const isContainerOnlyEditable = (el) => {
        if (!isEditableNode(el)) return false;
        if (allowParentDragging[getEditableId(el)]) return false;
        if (el.hasAttribute('data-action') || el.hasAttribute('data-action-id')) return false;
        return hasEditableChildren(el);
    };

    const getActionWrapper = (target) => {
        let cur = target;
        for (let d = 0; d < 8 && cur && cur !== document.body && cur !== document.documentElement; d++) {
            if (cur.hasAttribute('data-action') || cur.hasAttribute('data-action-id') || cur.tagName === 'A' || cur.getAttribute('onclick')) {
                return cur;
            }
            cur = cur.parentElement;
        }
        return null;
    };

    const resolveInteractiveEditable = (target) => {
        const actionWrapper = getActionWrapper(target);
        if (actionWrapper) {
            return actionWrapper;
        }

        let cur = target;
        let firstSafeAutoAssign = null;
        while (cur && cur !== document.body && cur !== document.documentElement) {
            if (isEditableNode(cur)) {
                if (isContainerOnlyEditable(cur)) { cur = cur.parentElement; continue; }
                const rect = cur.getBoundingClientRect();
                if (rect.width > window.innerWidth * 0.95 && rect.height > window.innerHeight * 0.95) { cur = cur.parentElement; continue; }
                return cur;
            }
            if (!firstSafeAutoAssign && isSafeToAutoAssign(cur)) {
                firstSafeAutoAssign = cur;
            }
            cur = cur.parentElement;
        }
        if (currentSelectedImage?.contains?.(target) && (isEditableNode(currentSelectedImage) || isSafeToAutoAssign(currentSelectedImage))) {
            return currentSelectedImage;
        }
        return firstSafeAutoAssign;
    };

    const resolveDragTarget = (target, x, y) => {
        if (!target) return null;
        const find = (el) => {
            const norm = el.nodeType === 3 ? el.parentElement : el;
            const found = resolveInteractiveEditable(norm) || (isEditableNode(norm) && !isContainerOnlyEditable(norm) ? norm : null);
            return found;
        };
        if (typeof x === 'number' && typeof y === 'number') {
            const els = document.elementsFromPoint?.(x, y) || document.msElementsFromPoint?.(x, y) || [];
            // Nếu có parent drag enabled, ưu tiên tìm container được phép drag trước
            for (const el of els) {
                const norm = el.nodeType === 3 ? el.parentElement : el;
                if (isEditableNode(norm)) {
                    const id = getEditableId(norm);
                    if (id && allowParentDragging[id] && hasEditableChildren(norm)) return norm;
                }
            }
            for (const el of els) { const f = find(el); if (f) return f; }
        }
        return find(target);
    };

    // ── postMessage helper ────────────────────────────────────────────────────
    const postMsg = (data) => window.parent.postMessage({ __html_editor: true, ...data }, '*');

    // Edge auto-scroll: một khung hình / lần + nội suy mượt (tránh bước px lớn + postMessage dồn dập).
    const smoothstep01 = (t) => {
        t = Math.max(0, Math.min(1, t));
        return t * t * (3 - 2 * t);
    };
    const cancelEdgeScrollRaf = () => {
        if (edgeScrollRafId != null) {
            cancelAnimationFrame(edgeScrollRafId);
            edgeScrollRafId = null;
        }
    };
    const applyEdgeScrollFrame = () => {
        edgeScrollRafId = null;
        if (!dragState) return;
        const tx = dragState.edgeScrollTargetVx || 0;
        const ty = dragState.edgeScrollTargetVy || 0;
        const ax = (dragState.edgeScrollSmoothedVx || 0) * 0.7 + tx * 0.3;
        const ay = (dragState.edgeScrollSmoothedVy || 0) * 0.7 + ty * 0.3;
        dragState.edgeScrollSmoothedVx = ax;
        dragState.edgeScrollSmoothedVy = ay;
        if (Math.abs(ax) < 0.1 && Math.abs(ay) < 0.1 && Math.abs(tx) < 0.04 && Math.abs(ty) < 0.04) {
            dragState.edgeScrollSmoothedVx = 0;
            dragState.edgeScrollSmoothedVy = 0;
            return;
        }
        const beforeY = window.scrollY;
        const beforeX = window.scrollX;
        try {
            window.scrollBy({ top: ay, left: ax, behavior: 'auto' });
        } catch (err) {
            window.scrollBy(ax, ay);
        }
        const appliedY = window.scrollY - beforeY;
        if (dragState.edgeScrollDelegateYToParent) {
            const remY = ay - appliedY;
            if (Math.abs(remY) > 0.02) postMsg({ type: 'IFRAME_EDGE_SCROLL', dy: remY });
        }
        syncDragPositionFromPointerClient();
        const still = Math.abs(ax) > 0.08 || Math.abs(ay) > 0.08 || Math.abs(tx) > 0.04 || Math.abs(ty) > 0.04;
        if (dragState && still) edgeScrollRafId = requestAnimationFrame(applyEdgeScrollFrame);
    };
    const scheduleEdgeScrollApply = () => {
        if (edgeScrollRafId == null) edgeScrollRafId = requestAnimationFrame(applyEdgeScrollFrame);
    };

    /** Đồng bộ transform kéo theo toạ độ tay lưu trong dragState (dùng lại sau auto-scroll khi không có pointermove mới). */
    function syncDragPositionFromPointerClient() {
        if (!dragState || typeof dragState.lastPointerClientX !== 'number') return;

        // Update cached rect for accurate edge scroll
        dragState._cachedRect = dragState.el.getBoundingClientRect();

        const clientX = dragState.lastPointerClientX;
        const clientY = dragState.lastPointerClientY;

        // ✅ FIX: Simplify displacement calculation to avoid double-counting parent scroll.
        // We use document-relative displacement (clientX + scrollX) which covers both mouse movement and internal scroll.
        // Parent scroll is already reflected in clientX/clientY changes relative to the iframe.

        const currentDocX = clientX + window.scrollX;
        const currentDocY = clientY + window.scrollY;
        const initialDocX = dragState.startX + dragState.scrollStartX;
        const initialDocY = dragState.startY + dragState.scrollStartY;

        let dx = currentDocX - initialDocX;
        let dy = currentDocY - initialDocY;

        // ✅ FIX: Account for global scale (zoom). 
        const globalScale = getGlobalScale();
        if (globalScale !== 1 && globalScale > 0) {
            dx = dx / globalScale;
            dy = dy / globalScale;
        }

        // Cache parent rotation — không thay đổi trong suốt drag, tính 1 lần
        if (dragState._parentRotation === undefined) {
            try {
                dragState._parentRotation = dragState.el.parentElement && dragState.el.parentElement.nodeType === 1
                    ? getTotalRotationWithParents(dragState.el.parentElement)
                    : 0;
            } catch { dragState._parentRotation = 0; }
        }
        const elementRotation = dragState._parentRotation;

        if (elementRotation !== 0) {
            const rotation = (elementRotation * Math.PI) / 180;
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);
            dx = dx * cos + dy * sin;
            dy = -dx * sin + dy * cos;
        }

        const tx = Math.max(dragState.minTx, Math.min(dragState.maxTx, dragState.tx + dx));
        const ty = Math.max(dragState.minTy, Math.min(dragState.maxTy, dragState.ty + dy));

        const TRANSFORM_BASED_ANIMATIONS = ['float', 'bounce', 'pulse', 'shake', 'wiggle', 'wobble', 'rotate', 'sway', 'shakeBounce'];
        const animationValue = dragState.el.style.animation || '';
        const hasTransformAnimation = TRANSFORM_BASED_ANIMATIONS.some(anim => animationValue.includes(anim));

        if (!hasTransformAnimation) {
            dragState.el.style.transform = buildTransformString(tx, ty, dragState.initialTransforms);
        }
        const preciseTx = Number(tx.toFixed(2));
        const preciseTy = Number(ty.toFixed(2));
        dragState.el.dataset.editorTx = String(preciseTx);
        dragState.el.dataset.editorTy = String(preciseTy);
        dragState.el.style.setProperty('--el-tx', preciseTx + 'px');
        dragState.el.style.setProperty('--el-ty', preciseTy + 'px');

        // restoreElementIdentity bị skip trong drag — chỉ cần restore khi drop
        // (tránh đọc/ghi attributes + cssText mỗi frame)

        // updateHandlesRect: throttle bằng RAF riêng, không chạy mỗi frame
        if (currentSelectedImage === dragState.el && selectionHandles) {
            if (!dragState._handlesRafId) {
                dragState._handlesRafId = requestAnimationFrame(() => {
                    dragState._handlesRafId = null;
                    if (dragState && currentSelectedImage === dragState.el && selectionHandles) {
                        updateHandlesRect(dragState.el);
                    }
                });
            }
        }

        // Z-index scan: mỗi 500ms để mượt mà hơn khi drag
        // ✅ ENHANCED Z-INDEX LAYER MANAGEMENT
        // "luôn cho phần tử mà tôi kéo vào sẽ lun lớn hơn phần mà tôi di chuyển vào"
        const nowZ = Date.now();
        if (!dragState._lastZIndexScanAt || nowZ - dragState._lastZIndexScanAt > 100) {
            dragState._lastZIndexScanAt = nowZ;
            const rect = dragState.el.getBoundingClientRect();
            dragState._cachedRect = rect;

            // Check center and corners for better coverage
            const checkPoints = [
                { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
                { x: rect.left + 5, y: rect.top + 5 },
                { x: rect.right - 5, y: rect.bottom - 5 }
            ];

            let maxZAtPosition = 0;
            for (const pt of checkPoints) {
                const elementsAtPos = getElementsAtPosition(pt.x, pt.y, dragState.el);
                for (let i = 0; i < Math.min(elementsAtPos.length, 5); i++) {
                    const el = elementsAtPos[i];
                    try {
                        const z = parseInt(window.getComputedStyle(el).zIndex, 10);
                        if (!isNaN(z) && z > maxZAtPosition) maxZAtPosition = z;
                    } catch { }
                }
            }

            const currentZ = parseInt(dragState.el.style.zIndex, 10) || 0;
            if (maxZAtPosition >= currentZ) {
                const newZ = String(maxZAtPosition + 1);
                dragState.el.style.zIndex = newZ;
                dragState.el.setAttribute('data-z-index', newZ);
                dragState.adjustedZIndex = newZ;

                if (selectionManager.getSelected() === dragState.el) {
                    selectionManager.syncStoredZIndexFromDom();
                }
            }
        }

        dragState.el.style.opacity = '1'; dragState.el.style.visibility = 'visible'; dragState.el.style.pointerEvents = 'auto';

        const HOVER_THRESHOLD = 5;
        if (Math.abs(clientX - dragState.lastX) > HOVER_THRESHOLD || Math.abs(clientY - dragState.lastY) > HOVER_THRESHOLD) {
            dragState.hoverStartTime = Date.now(); dragState.lastX = clientX; dragState.lastY = clientY;
        }

        const THRESH = 60;
        const MAX_V = 25;
        const r = dragState._cachedRect || dragState.el.getBoundingClientRect();
        const ih = window.innerHeight;
        const iw = window.innerWidth;
        const edgePt = dragState.lastPointerTypeForEdge || 'mouse';
        let targetVx = 0, targetVy = 0;
        if (edgePt === 'mouse') {
            if (r.top < THRESH && window.scrollY > 0) targetVy = -((THRESH - r.top) / THRESH) * MAX_V;
            else if (r.bottom > ih - THRESH) targetVy = ((r.bottom - (ih - THRESH)) / THRESH) * MAX_V;
            if (r.left < THRESH && window.scrollX > 0) targetVx = -((THRESH - r.left) / THRESH) * MAX_V;
            else if (r.right > iw - THRESH) targetVx = ((r.right - (iw - THRESH)) / THRESH) * MAX_V;
        } else {
            if (r.top < THRESH && window.scrollY > 0) targetVy = -((THRESH - r.top) / THRESH) * MAX_V;
            else if (r.bottom > ih - THRESH) targetVy = ((r.bottom - (ih - THRESH)) / THRESH) * MAX_V;
        }
        dragState.edgeScrollTargetVx = targetVx;
        dragState.edgeScrollTargetVy = targetVy;
    }

    // ── Confirm modal ─────────────────────────────────────────────────────────
    const showConfirmModal = ({ title, message, confirmText, cancelText, onConfirm, onCancel } = {}) => {
        const id = 'confirm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        pendingConfirms[id] = { onConfirm: onConfirm || (() => { }), onCancel: onCancel || (() => { }) };
        postMsg({ type: 'CONFIRM_REQUEST', requestId: id, title: title || 'Xác nhận', message: message || 'Bạn có chắc?', confirmText: confirmText || 'Xác nhận', cancelText: cancelText || 'Hủy' });
    };

    // ── Effect helpers ────────────────────────────────────────────────────────
    const LOOP_EFFECTS = new Set(['float', 'bounce', 'pulse', 'shake', 'wiggle', 'wobble']);

    const buildAnimationValue = (effectId) => {
        if (!effectId || effectId === 'none') return 'none';
        if (effectId === 'rotate') return 'rotate 2s linear infinite';
        return LOOP_EFFECTS.has(effectId) ? effectId + ' 2s ease-in-out infinite' : effectId + ' 0.8s ease both';
    };

    const applySavedEffects = () => {
        document.querySelectorAll('[data-editor-effect]').forEach(node => {
            const id = node.getAttribute('data-editor-effect');
            node.classList.add('editor-effect-target');
            node.style.animation = 'none';
            void node.offsetHeight;
            node.style.animation = buildAnimationValue(id);
        });
    };

    const applyGlobalEffect = (effectId) => {
        document.querySelectorAll('img,[data-image-editable],[data-editable],[data-editor-id],h1,h2,h3,h4,h5,h6,p,span,li,a,small,em,strong,b,i').forEach(node => {
            node.classList.add('editor-effect-target');
            node.style.animation = 'none';
            void node.offsetHeight;
            if (effectId && effectId !== 'none') node.style.animation = buildAnimationValue(effectId);
        });
    };

    const applyEffectToElement = (effectId, id) => {
        if (!id) return;
        queryEditableAll(id).forEach(node => {
            node.classList.add('editor-effect-target');
            node.style.animation = 'none';
            void node.offsetHeight;
            if (effectId && effectId !== 'none') {
                node.setAttribute('data-editor-effect', effectId);
                node.style.animation = buildAnimationValue(effectId);
            } else {
                node.removeAttribute('data-editor-effect');
                node.style.animation = 'none';
            }
            if (currentSelectedImage === node) trackSelectionDuringAnimation();
        });
    };

    // ── Selection handles ─────────────────────────────────────────────────────
    const stopSelectionTracking = () => {
        if (selectionAnimationFrame) { cancelAnimationFrame(selectionAnimationFrame); selectionAnimationFrame = null; }
    };

    const trackSelectionDuringAnimation = () => {
        stopSelectionTracking();
        const start = Date.now();
        const tick = () => {
            if (!currentSelectedImage || !selectionHandles) { stopSelectionTracking(); return; }
            showSelectionHandles(currentSelectedImage);
            if (Date.now() - start < 3000) selectionAnimationFrame = requestAnimationFrame(tick);
            else stopSelectionTracking();
        };
        selectionAnimationFrame = requestAnimationFrame(tick);
    };

    const clearEditing = () => {
        document.querySelectorAll('.editing').forEach(n => n.classList.remove('editing'));
        selectionManager.deselect();
        hideSelectionHandles();
    };

    const hideSelectionHandles = () => {
        stopSelectionTracking();
        // Clear the style restore interval if it exists
        if (currentSelectedImage && currentSelectedImage.__styleRestoreInterval) {
            clearInterval(currentSelectedImage.__styleRestoreInterval);
            delete currentSelectedImage.__styleRestoreInterval;
        }
        selectionManager.deselect();
        selectionHandles?.remove();
        rotationMenu?.remove();
        selectionHandles = rotationMenu = currentSelectedImage = null;
    };

    // ── Monitor for element removal/hiding ──
    const monitorElementVisibility = () => {
        setInterval(() => {
            if (!currentSelectedImage || !selectionHandles) return;

            // Check if element is still in the DOM
            if (!document.body.contains(currentSelectedImage)) {
                console.log('[monitorElementVisibility] Element removed from DOM, hiding selection handles');
                hideSelectionHandles();
                return;
            }

            // Check if element is still visible
            const computedStyle = window.getComputedStyle(currentSelectedImage);
            const rect = currentSelectedImage.getBoundingClientRect();
            const isVisible = computedStyle.display !== 'none' &&
                computedStyle.visibility !== 'hidden' &&
                rect.width > 0 &&
                rect.height > 0;

            if (!isVisible) {
                console.log('[monitorElementVisibility] Element is no longer visible, hiding selection handles');
                hideSelectionHandles();
            }
        }, 100);
    };

    // Start monitoring when script loads
    monitorElementVisibility();

    const updateHandlesRect = (el) => {
        if (!el || !selectionHandles) return;

        // ── FIX: Use element's visual center and natural size instead of bounding box ──
        const rect = el.getBoundingClientRect();

        // Use offsetWidth/Height as the natural, unrotated size. Fallback to bounding rect width/height if 0
        const uw = el.offsetWidth || rect.width;
        const uh = el.offsetHeight || rect.height;

        // Calculate the exact visual center in viewport coordinates
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // ── FIX: Get the total cumulative rotation from element and all its parents ──
        let totalRotation = 0;
        try {
            totalRotation = getTotalRotationWithParents(el);
        } catch (e) {
            totalRotation = 0;
        }

        Object.assign(selectionHandles.style, {
            left: Math.round(centerX - uw / 2) + 'px',
            top: Math.round(centerY - uh / 2) + 'px',
            width: Math.round(uw) + 'px',
            height: Math.round(uh) + 'px',
            transformOrigin: 'center center',
            transform: totalRotation !== 0 ? 'rotate(' + totalRotation + 'deg)' : 'none'
        });

        // ✅ FIX: Update counter-rotation on handles when element rotates
        // All handles now use translateX(-50%) in CSS, so they all need the same transform pattern
        const rotHandle = selectionHandles.querySelector('.word-rotate-handle');
        const copyHandle = selectionHandles.querySelector('.word-copy-handle');
        const deleteHandle = selectionHandles.querySelector('.word-delete-handle');
        const badge = selectionHandles.querySelector('.word-rotate-coords');

        if (totalRotation !== 0) {
            // All handles use translateX(-50%) so need same transform pattern
            const counterTransform = `translateX(-50%) rotate(-${totalRotation}deg)`;
            if (rotHandle) rotHandle.style.transform = counterTransform;
            if (badge) badge.style.transform = counterTransform;
            if (copyHandle) copyHandle.style.transform = counterTransform;
            if (deleteHandle) deleteHandle.style.transform = counterTransform;
        } else {
            // No rotation - restore default transforms
            if (rotHandle) rotHandle.style.transform = 'translateX(-50%)';
            if (badge) badge.style.transform = 'translateX(-50%)';
            if (copyHandle) copyHandle.style.transform = 'translateX(-50%)';
            if (deleteHandle) deleteHandle.style.transform = 'translateX(-50%)';
        }
    };

    const showSelectionHandles = (element, handleOpts) => {
        handleOpts = handleOpts || {};
        hideSelectionHandles();
        const isImage = element.getAttribute('data-image-editable') || element.tagName === 'IMG';
        const isText = element.getAttribute('data-editable') || element.getAttribute('data-editor-id');
        const isMap = element.getAttribute('data-edit-map') || element.getAttribute('data-edit-map-href');
        if (!isImage && !isText && !isMap) return;

        // ── Check if element is actually visible before showing handles ──
        const computedStyle = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const isVisible = computedStyle.display !== 'none' &&
            computedStyle.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0;

        // If element is not visible, don't show selection handles
        if (!isVisible) {
            console.log('[showSelectionHandles] Element is not visible, skipping selection handles');
            return;
        }

        selectionManager.select(element, handleOpts);
        currentSelectedImage = element;
        currentSelectedImage.__editorIdentitySnapshot = snapshotElementIdentity(element);

        // ── Detect if this element is locked (covers text, image, stock) ──
        const locked = isElementLocked(element);

        // ── FIX: Use element's visual center and natural size instead of bounding box ──
        // const rect = element.getBoundingClientRect();
        const uw = element.offsetWidth || rect.width;
        const uh = element.offsetHeight || rect.height;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        selectionHandles = document.createElement('div');
        selectionHandles.className = 'word-selection-handles';

        // ── FIX: Apply cumulative rotation to selection handles container ──
        let totalRotation = 0;
        try {
            totalRotation = getTotalRotationWithParents(element);
        } catch (e) {
            totalRotation = 0;
        }

        Object.assign(selectionHandles.style, {
            left: Math.round(centerX - uw / 2) + 'px',
            top: Math.round(centerY - uh / 2) + 'px',
            width: Math.round(uw) + 'px',
            height: Math.round(uh) + 'px',
            transformOrigin: 'center center',
            transform: totalRotation !== 0 ? 'rotate(' + totalRotation + 'deg)' : 'none'
        });

        // ── Preserve element's original CSS while selection handles are shown ──
        // Save the current computed styles to prevent any changes
        const originalDisplay = element.style.display;
        const originalVisibility = element.style.visibility;
        const originalOpacity = element.style.opacity;
        const originalTransform = element.style.transform;
        let originalWidth = element.style.width;
        let originalHeight = element.style.height;
        const originalBorderRadius = element.style.borderRadius;

        // Restore styles periodically to ensure they're not lost
        // BUT: Do NOT restore transform during rotation/resize operations
        let isResizing = false;
        const styleRestoreInterval = setInterval(() => {
            if (!currentSelectedImage || currentSelectedImage !== element) {
                clearInterval(styleRestoreInterval);
                return;
            }
            // Only restore if styles have changed (but NOT transform - that's handled by drag operations)
            if (element.style.display !== originalDisplay) element.style.display = originalDisplay;
            if (element.style.visibility !== originalVisibility) element.style.visibility = originalVisibility;
            if (element.style.opacity !== originalOpacity) element.style.opacity = originalOpacity;
            // DO NOT restore transform - it's being actively modified during rotation/resize
            // if (element.style.transform !== originalTransform) element.style.transform = originalTransform;
            // DO NOT restore width/height during resize
            if (!isResizing) {
                if (element.style.width !== originalWidth) element.style.width = originalWidth;
                if (element.style.height !== originalHeight) element.style.height = originalHeight;
            }
            if (element.style.borderRadius !== originalBorderRadius) element.style.borderRadius = originalBorderRadius;
        }, 50);

        // Store the interval ID so we can clear it later
        element.__styleRestoreInterval = styleRestoreInterval;
        element.__setIsResizing = (v) => { isResizing = v; };
        element.__updateOriginalSize = (w, h) => {
            originalWidth = w;
            originalHeight = h;
        };

        // ── Resize handles — hidden when locked ──────────────────────────
        if (!locked) {
            ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(pos => {
                const handle = document.createElement('div');
                handle.className = 'word-handle ' + pos;

                const startResize = (e) => {
                    e.stopPropagation(); e.preventDefault();
                    if (!currentSelectedImage || e.button) return;
                    if (currentSelectedImage.__setIsResizing) currentSelectedImage.__setIsResizing(true);

                    const startX = e.clientX, startY = e.clientY;
                    const startRect = currentSelectedImage.getBoundingClientRect();

                    // ✅ FIX: Use offsetWidth/offsetHeight instead of bounding rect for rotated elements
                    // getBoundingClientRect() returns the rotated bounding box, not the actual element size
                    const startW = currentSelectedImage.offsetWidth || startRect.width;
                    const startH = currentSelectedImage.offsetHeight || startRect.height;

                    const aspect = startW / startH;
                    const isTextEl = !!(currentSelectedImage.getAttribute('data-editable') || currentSelectedImage.getAttribute('data-editor-id'));
                    const cs = window.getComputedStyle(currentSelectedImage);
                    const startFs = parseFloat(cs.fontSize) || 16;
                    const lhRaw = parseFloat(cs.lineHeight);
                    const normLh = !isNaN(lhRaw) && startFs > 0 ? lhRaw / startFs : 1.2;
                    const curT = currentSelectedImage.style.transform || '';
                    const translateM = curT.match(/translate\(([^)]+)\)/);
                    const translatePart = translateM ? 'translate(' + translateM[1] + ')' : '';
                    const rotM = curT.match(/rotate\(([^)]+)deg\)/);
                    const rotPart = rotM ? 'rotate(' + rotM[1] + 'deg)' : '';
                    const rotationDeg = rotM ? parseFloat(rotM[1]) : 0;
                    const rotationRad = (rotationDeg * Math.PI) / 180;
                    const otherT = curT
                        .replace(/translate\([^)]*\)/g, '')
                        .replace(/scale\([^)]*\)/g, '')
                        .replace(/rotate\([^)]*\)/g, '')
                        .trim();
                    currentSelectedImage.style.transformOrigin = 'center center';
                    currentSelectedImage.style.transformBox = 'fill-box';
                    currentSelectedImage.style.willChange = 'transform';
                    const origPos = currentSelectedImage.style.position;
                    if (window.getComputedStyle(currentSelectedImage).position === 'static') currentSelectedImage.style.position = 'relative';
                    document.body.style.cursor = pos + '-resize';
                    if (e.pointerId != null && e.currentTarget?.setPointerCapture) try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }

                    const onMove = (me) => {
                        if (!isResizing) {
                            isResizing = true;
                            // Capture initial state for command history if not already captured
                            if (currentSelectedImage && !currentSelectedImage.__beforeState) {
                                currentSelectedImage.__beforeState = window.editorStateManager?.captureElementState(currentSelectedImage);
                            }
                        }
                        let dx = me.clientX - startX;
                        let dy = me.clientY - startY;

                        // ✅ FIX: Rotate the delta by the inverse of the element's CUMULATIVE rotation
                        // This ensures resize works correctly on rotated elements (including nested ones)
                        let totalRotationDeg = 0;
                        try {
                            totalRotationDeg = getTotalRotationWithParents(currentSelectedImage);
                        } catch (e) {
                            totalRotationDeg = rotationDeg;
                        }

                        if (totalRotationDeg !== 0) {
                            const totalRotationRad = (totalRotationDeg * Math.PI) / 180;
                            const cos = Math.cos(totalRotationRad);
                            const sin = Math.sin(totalRotationRad);
                            const adjustedDeltaX = dx * cos + dy * sin;
                            const adjustedDeltaY = -dx * sin + dy * cos;
                            dx = adjustedDeltaX;
                            dy = adjustedDeltaY;
                        }

                        let nw = startW, nh = startH;
                        if (pos.includes('w')) nw = startW - dx;
                        else if (pos.includes('e')) nw = startW + dx;
                        if (pos.includes('n')) nh = startH - dy;
                        else if (pos.includes('s')) nh = startH + dy;
                        if (['nw', 'ne', 'se', 'sw'].includes(pos) && !me.shiftKey) {
                            if (Math.abs(dx) > Math.abs(dy)) nh = nw / aspect; else nw = nh * aspect;
                        }
                        nw = Math.max(20, nw); nh = Math.max(20, nh);

                        // ✅ FIX: Preserve animation during resize
                        const savedAnimation = currentSelectedImage.style.animation || '';
                        const savedAnimationPlayState = currentSelectedImage.style.animationPlayState || '';

                        const baseT = [translatePart, rotPart, otherT].filter(Boolean).join(' ').trim();
                        if (isTextEl) {
                            const wRatio = startW > 0 ? nw / startW : 1, hRatio = startH > 0 ? nh / startH : 1;
                            const isH = pos === 'e' || pos === 'w', isV = pos === 'n' || pos === 's';
                            const nextFs = isV ? Math.max(8, startFs * hRatio) : !isH ? Math.max(8, startFs * Math.max(wRatio, hRatio)) : startFs;
                            Object.assign(currentSelectedImage.style, { width: Math.round(nw) + 'px', height: 'auto', fontSize: Math.round(nextFs) + 'px', lineHeight: normLh.toFixed(2), whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', transform: baseT });
                        } else {
                            Object.assign(currentSelectedImage.style, { width: Math.round(nw) + 'px', height: Math.round(nh) + 'px', transform: baseT });
                        }

                        // ✅ FIX: Restore animation after resize
                        if (savedAnimation) {
                            currentSelectedImage.style.animation = savedAnimation;
                            currentSelectedImage.style.animationPlayState = savedAnimationPlayState || 'running';
                        }

                        updateHandlesRect(currentSelectedImage);
                    };

                    const onUp = (ue) => {
                        document.body.style.cursor = 'default';
                        window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
                        window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
                        if (currentSelectedImage) {
                            if (origPos !== undefined) currentSelectedImage.style.position = origPos;
                            const finalT = currentSelectedImage.style.transform || '';
                            const imgId = currentSelectedImage.getAttribute('data-image-editable');
                            const textId = currentSelectedImage.getAttribute('data-editable') || currentSelectedImage.getAttribute('data-editor-id');
                            if (imgId) {
                                const fw = parseFloat(currentSelectedImage.style.width) || 0, fh = parseFloat(currentSelectedImage.style.height) || 0;
                                postMsg({ type: 'HTML_IMAGE_RESIZED', id: imgId, width: fw, height: fh, transform: finalT });
                                postMsg({ type: 'SET_HTML_IMAGE_STYLE', id: imgId, style: { width: fw, height: fh, transform: finalT } });
                            } else if (textId) {
                                postMsg({ type: 'HTML_TEXT_RESIZED', id: textId, scaleX: 1, scaleY: 1, transform: finalT });
                                postMsg({ type: 'SET_HTML_STYLE', id: textId, style: { width: currentSelectedImage.style.width || '', height: currentSelectedImage.style.height || '', fontSize: currentSelectedImage.style.fontSize || '', lineHeight: currentSelectedImage.style.lineHeight || '', transform: finalT } });
                            }
                            const eid = imgId || textId;
                            if (eid) saveElementTransform(eid, finalT);

                            // ── COMMAND COMMIT ──
                            if (isResizing && currentSelectedImage.__beforeState) {
                                const afterState = window.editorStateManager?.captureElementState(currentSelectedImage);
                                postMsg({
                                    type: 'COMMIT_COMMAND',
                                    command: {
                                        type: 'RESIZE',
                                        elementId: eid,
                                        before: currentSelectedImage.__beforeState,
                                        after: afterState
                                    }
                                });
                                delete currentSelectedImage.__beforeState;
                            }

                            // ── UPDATE ORIGINAL SIZE BEFORE UNSETTING FLAG ──────────────────────────
                            // Update the original size so style restore doesn't revert to old size
                            // This must be done BEFORE unsetting the isResizing flag
                            if (currentSelectedImage && currentSelectedImage.__updateOriginalSize) {
                                currentSelectedImage.__updateOriginalSize(
                                    currentSelectedImage.style.width,
                                    currentSelectedImage.style.height
                                );
                            }

                            // ── UNSET RESIZE FLAG ──────────────────────────────────────────────────
                            // Unset the flag so style restore can resume
                            if (currentSelectedImage && currentSelectedImage.__setIsResizing) {
                                currentSelectedImage.__setIsResizing(false);
                            }
                        }
                        postMsg({ type: 'IFRAME_MOUSE_UP', clientX: ue?.clientX || 0, clientY: ue?.clientY || 0 });
                    };

                    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
                    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
                };

                handle.onpointerdown = startResize;
                handle.onmousedown = (e) => { if (!window.PointerEvent) startResize(e); };
                handle.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); }, true);
                handle.onclick = (e) => { e.stopPropagation(); e.preventDefault(); };
                selectionHandles.appendChild(handle);
            });
        }

        // Rotation line & badge (always shown for position info)
        const rotLine = document.createElement('div');
        rotLine.className = 'word-rotate-line';
        selectionHandles.appendChild(rotLine);
        const badge = document.createElement('div');
        badge.className = 'word-rotate-coords';
        // ✅ FIX: Counter-rotate badge to keep it upright
        if (totalRotation !== 0) {
            badge.style.transform = `translateX(-50%) rotate(-${totalRotation}deg)`;
        } else {
            badge.style.transform = 'translateX(-50%)';
        }
        selectionHandles.appendChild(badge);
        updateRotationBadge(element);

        if (!locked) {
            // ── Rotation handle ──────────────────────────────────────────
            const rotHandle = document.createElement('div');
            rotHandle.className = 'word-rotate-handle';
            rotHandle.innerHTML = '↻';
            // ✅ FIX: Counter-rotate handle to keep it upright
            if (totalRotation !== 0) {
                rotHandle.style.transform = `translateX(-50%) rotate(-${totalRotation}deg)`;
            } else {
                rotHandle.style.transform = 'translateX(-50%)';
            }
            let dragStarted = false, isDragging = false;

            const startRotate = (e) => {
                e.stopPropagation(); e.preventDefault();
                if (!currentSelectedImage || e.button) return;
                isDragging = true; dragStarted = false;
                const state = getElementTransformState(currentSelectedImage);
                const startTx = state.tx, startTy = state.ty;
                const startOthers = state.others.filter(f => !f.startsWith('rotate('));
                const startRotation = normalizeRotation(getCurrentRotation(currentSelectedImage));
                currentSelectedImage.style.transformOrigin = 'center center';
                currentSelectedImage.style.transformBox = 'fill-box';
                currentSelectedImage.style.willChange = 'transform';
                const r = currentSelectedImage.getBoundingClientRect();
                const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                const startAngle = calcAngle(cx, cy, e.clientX, e.clientY);
                document.body.style.cursor = 'grabbing';
                if (e.pointerId != null && e.currentTarget?.setPointerCapture) try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }
                const origPos = currentSelectedImage.style.position;
                if (window.getComputedStyle(currentSelectedImage).position === 'static') currentSelectedImage.style.position = 'relative';

                const onMove = (me) => {
                    if (!isDragging || !currentSelectedImage) return;
                    if (!dragStarted) {
                        dragStarted = true;
                        // Capture initial state for command history
                        currentSelectedImage.__beforeState = window.editorStateManager?.captureElementState(currentSelectedImage);
                    }
                    const angle = calcAngle(cx, cy, me.clientX, me.clientY);
                    const newRot = normalizeRotation(startRotation + (angle - startAngle));
                    const isTextEl = currentSelectedImage.getAttribute('data-editable') || currentSelectedImage.getAttribute('data-editor-id');
                    if (isTextEl) preserveRotatableTextPosition(currentSelectedImage);

                    // ✅ FIX: Save animation before setting transform during rotation
                    const savedAnimation = currentSelectedImage.style.animation || '';
                    const savedAnimationPlayState = currentSelectedImage.style.animationPlayState || '';

                    const t = buildTransformString(startTx, startTy, [...startOthers, 'rotate(' + newRot + 'deg)']);
                    currentSelectedImage.style.transform = t;

                    // ✅ FIX: Restore animation after setting transform
                    if (savedAnimation) {
                        currentSelectedImage.style.animation = savedAnimation;
                        currentSelectedImage.style.animationPlayState = savedAnimationPlayState || 'running';
                    }

                    currentSelectedImage.dataset.editorTx = String(startTx);
                    currentSelectedImage.dataset.editorTy = String(startTy);
                    currentSelectedImage.dataset.editorRotation = String(newRot);
                    const eid = getElementStorageId(currentSelectedImage);
                    if (eid) { saveRotationToSession(eid, newRot); saveElementTransform(eid, t); }
                    restoreElementIdentity(currentSelectedImage, currentSelectedImage.__editorIdentitySnapshot);
                    updateHandlesRect(currentSelectedImage);
                    const b = selectionHandles?.querySelector('.word-rotate-coords');
                    if (b) b.textContent = Math.round(newRot) + ' °  x:' + Math.round(startTx) + '  y:' + Math.round(startTy);
                };

                const onUp = (ue) => {
                    if (!isDragging) return;
                    isDragging = false;
                    document.body.style.cursor = 'default';
                    window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
                    window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
                    if (currentSelectedImage && origPos !== undefined) currentSelectedImage.style.position = origPos;
                    if (dragStarted && currentSelectedImage) {
                        const finalRot = getCurrentRotation(currentSelectedImage);
                        const finalT = currentSelectedImage.style.transform || '';
                        const imgId = currentSelectedImage.getAttribute('data-image-editable');
                        const textId = currentSelectedImage.getAttribute('data-editable') || currentSelectedImage.getAttribute('data-editor-id');
                        const eid = imgId || textId;
                        currentSelectedImage.dataset.editorRotation = String(finalRot);
                        if (eid) { saveRotationToSession(eid, finalRot); saveElementTransform(eid, finalT); }

                        // ✅ FIX: Save animation before setting final transform
                        const savedAnimation = currentSelectedImage.style.animation || '';
                        const savedAnimationPlayState = currentSelectedImage.style.animationPlayState || '';

                        if (imgId) {
                            postMsg({ type: 'HTML_IMAGE_ROTATED', id: imgId, rotation: finalRot, transform: finalT });
                            postMsg({ type: 'SET_HTML_IMAGE_STYLE', id: imgId, style: { transform: finalT } });
                        } else if (textId) {
                            postMsg({ type: 'HTML_TEXT_ROTATED', id: textId, rotation: finalRot, transform: finalT });
                            postMsg({ type: 'SET_HTML_STYLE', id: textId, style: { transform: finalT } });
                        }
                        postMsg({ type: 'HTML_DRAG_CHANGE', id: eid, tx: toNum(currentSelectedImage.dataset.editorTx), ty: toNum(currentSelectedImage.dataset.editorTy), rotation: finalRot, transform: finalT });
                        currentSelectedImage.style.transform = finalT;

                        // ── COMMAND COMMIT ──
                        if (currentSelectedImage.__beforeState) {
                            const afterState = window.editorStateManager?.captureElementState(currentSelectedImage);
                            postMsg({
                                type: 'COMMIT_COMMAND',
                                command: {
                                    type: 'ROTATE',
                                    elementId: eid,
                                    before: currentSelectedImage.__beforeState,
                                    after: afterState
                                }
                            });
                            delete currentSelectedImage.__beforeState;
                        }

                        // ✅ FIX: Restore animation after setting final transform
                        if (savedAnimation) {
                            currentSelectedImage.style.animation = savedAnimation;
                            currentSelectedImage.style.animationPlayState = savedAnimationPlayState || 'running';
                            console.log('[Rotation] Animation preserved after rotation complete:', savedAnimation);
                        }

                        if (selectionHandles) showSelectionHandles(currentSelectedImage);
                    }
                    postMsg({ type: 'IFRAME_MOUSE_UP', clientX: ue.clientX, clientY: ue.clientY });
                };

                window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
                window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
            };

            rotHandle.onpointerdown = startRotate;
            rotHandle.onmousedown = (e) => { if (!window.PointerEvent) startRotate(e); };
            rotHandle.onclick = (e) => { e.stopPropagation(); e.preventDefault(); if (!dragStarted) showRotationMenu(); };
            rotHandle.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); }, true);

            // ── Copy handle ──────────────────────────────────────────────
            const copyHandle = document.createElement('div');
            copyHandle.className = 'word-copy-handle';
            copyHandle.innerHTML = '⧉';
            copyHandle.title = 'Tạo bản sao';
            // ✅ FIX: Counter-rotate handle to keep it upright
            if (totalRotation !== 0) {
                copyHandle.style.transform = `translateX(-50%) rotate(-${totalRotation}deg)`;
            } else {
                copyHandle.style.transform = 'translateX(-50%)';
            }
            copyHandle.onclick = (e) => {
                e.stopPropagation(); e.preventDefault();
                if (!element?.parentNode) return;

                // Prevent copying parent containers that have editable children
                // Only allow copying leaf elements (images, text without children, etc.)
                const hasEditableChildren = element.querySelector('[data-editable], [data-editor-id], [data-image-editable], [data-edit-map], [data-edit-map-href]');
                if (hasEditableChildren) {
                    console.warn('Cannot copy parent containers with editable children');
                    return;
                }

                const oldId = getEditableId(element);
                const clone = element.cloneNode(true);
                const newId = 'editor-copy-' + Date.now();
                const tabMap = { 'data-image-editable': 'images', 'data-edit-map': 'maps', 'data-edit-map-href': 'maps', 'data-editable': 'info', 'data-editor-id': 'info' };
                let tab = 'info';
                for (const [attr, t] of Object.entries(tabMap)) {
                    if (element.hasAttribute(attr)) { clone.setAttribute(attr, newId); tab = t; break; }
                }

                // Copy all computed styles from original to clone to preserve CSS
                const computedStyle = window.getComputedStyle(element);
                const stylesToCopy = ['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'padding', 'margin', 'border', 'borderRadius', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat', 'opacity', 'filter', 'boxShadow', 'textShadow', 'transform', 'transformOrigin', 'objectFit', 'objectPosition', 'display', 'fontSize', 'fontWeight', 'fontStyle', 'fontFamily', 'color', 'textAlign', 'lineHeight', 'letterSpacing', 'wordSpacing', 'textDecoration', 'textTransform', 'whiteSpace', 'wordBreak', 'overflowWrap', 'overflow', 'overflowX', 'overflowY'];
                stylesToCopy.forEach(prop => {
                    const value = computedStyle.getPropertyValue(prop);
                    if (value) clone.style[prop] = value;
                });

                // Modify alt attribute for image elements
                if (clone.tagName === 'IMG' && clone.hasAttribute('alt')) {
                    const originalAlt = clone.getAttribute('alt');
                    // Count existing copies with same base alt text
                    const parent = element.parentNode;
                    if (parent && parent.querySelectorAll) {
                        let copyCount = 1;
                        const allImages = parent.querySelectorAll('img[alt]');
                        allImages.forEach(img => {
                            if (img !== element && img.getAttribute('alt').startsWith(originalAlt)) {
                                const match = img.getAttribute('alt').match(/\s(\d+)$/);
                                if (match) {
                                    const num = parseInt(match[1], 10);
                                    if (num >= copyCount) copyCount = num + 1;
                                }
                            }
                        });
                        clone.setAttribute('alt', originalAlt + ' ' + copyCount);
                    }
                }

                const st = getElementTransformState(element);
                const nextTx = toNum(st.tx) + 8, nextTy = toNum(st.ty) + 8;
                clone.style.transform = buildTransformString(nextTx, nextTy, st.others || []);
                clone.dataset.editorTx = String(nextTx); clone.dataset.editorTy = String(nextTy);
                // Ensure clone has absolute positioning to overlay on original
                clone.style.position = 'absolute';
                // Set z-index higher than original to show on top
                const originalZ = parseInt(element.style.zIndex || window.getComputedStyle(element).zIndex || '0', 10);
                clone.style.zIndex = String(originalZ + 1);
                // Cloned element starts unlocked regardless of parent lock state
                clone.removeAttribute('data-locked');
                clone.classList.remove('editor-element-locked');
                const beforeState = window.editorStateManager?.captureCurrentState();
                // Insert clone BEFORE original so it appears at the same visual position
                element.parentNode.insertBefore(clone, element);
                saveElementTransform(newId, clone.style.transform || '');
                saveTextContentToStorage(false); // Lưu trạng thái văn bản mới vào session
                clearEditing(); showSelectionHandles(clone); clone.classList.add('editing');

                const afterState = window.editorStateManager?.captureCurrentState();
                postMsg({
                    type: 'COMMIT_COMMAND',
                    command: {
                        type: 'DUPLICATE',
                        elementId: newId,
                        before: beforeState,
                        after: afterState
                    }
                });

                postMsg({ type: 'ELEMENT_DUPLICATED', oldId, id: newId, tab });
                postMsg({ type: 'FOCUS_FIELD', id: newId, tab });

                if (window.editorStateManager) {
                    window.editorStateManager.saveStateDebounced();
                }
            };

            // ── Delete handle ────────────────────────────────────────────
            const deleteHandle = document.createElement('div');
            deleteHandle.className = 'word-delete-handle';
            deleteHandle.innerHTML = '✕';
            deleteHandle.title = 'Xoá phần tử';
            // ✅ FIX: Counter-rotate handle to keep it upright
            if (totalRotation !== 0) {
                deleteHandle.style.transform = `translateX(-50%) rotate(-${totalRotation}deg)`;
            } else {
                deleteHandle.style.transform = 'translateX(-50%)';
            }
            deleteHandle.onclick = (e) => {
                e.stopPropagation();
                showConfirmModal({
                    title: 'Xóa phần tử?', message: 'Bạn có chắc muốn xoá phần tử này?', confirmText: 'Xóa', cancelText: 'Hủy',
                    onConfirm: () => {
                        const beforeState = window.editorStateManager?.captureCurrentState();
                        const id = getEditableId(element);
                        element?.parentNode?.removeChild(element);
                        const afterState = window.editorStateManager?.captureCurrentState();
                        hideSelectionHandles();

                        postMsg({
                            type: 'COMMIT_COMMAND',
                            command: {
                                type: 'DELETE',
                                elementId: id,
                                before: beforeState,
                                after: afterState
                            }
                        });
                        postMsg({ type: 'DELETE_ELEMENT', id });

                        if (window.editorStateManager) {
                            window.editorStateManager.saveStateDebounced();
                        }
                    }
                });
            };

            // ── Cancel parent drag handle ────────────────────────────────
            const cancelParentDragHandle = document.createElement('div');
            cancelParentDragHandle.className = 'word-cancel-parent-drag-handle';
            cancelParentDragHandle.innerHTML = '✖';
            cancelParentDragHandle.title = 'Hủy kéo phần cha';
            cancelParentDragHandle.style.display = (element.classList.contains('editor-parent-drag-enabled') || allowParentDragging[getEditableId(element)]) ? 'flex' : 'none';
            cancelParentDragHandle.onclick = (e) => {
                e.stopPropagation(); e.preventDefault();
                const id = getEditableId(element);
                if (id) {
                    allowParentDragging[id] = false;
                    parentDragController.disallowParentDrag(id);
                    resolveParentDragElement(id).forEach(el => {
                        el.classList.remove('editor-parent-drag-enabled');
                        el.style.cursor = '';
                    });
                    cancelParentDragHandle.style.display = 'none';
                    postMsg({ type: 'PARENT_DRAG_CANCELLED', id });
                }
            };

            selectionHandles.append(rotHandle, copyHandle, deleteHandle, cancelParentDragHandle);
        } else {
            // ── Lock badge (shown instead of action handles when locked) ──
            const lockBadge = document.createElement('div');
            lockBadge.className = 'word-lock-badge';
            lockBadge.innerHTML = '🔒';
            lockBadge.title = 'Phần tử đang bị khóa';
            selectionHandles.appendChild(lockBadge);
        }

        document.body.appendChild(selectionHandles);
    };

    // ── Rotation menu ─────────────────────────────────────────────────────────
    const showRotationMenu = () => {
        rotationMenu?.remove();
        if (!currentSelectedImage || !selectionHandles) return;
        rotationMenu = document.createElement('div');
        rotationMenu.className = 'word-rotation-menu show';
        [
            { text: 'Huong tren', angle: 0 }, { text: 'Huong phai', angle: 90 },
            { text: 'Huong duoi', angle: 180 }, { text: 'Huong trai', angle: 270 }, { text: 'Reset rotation', angle: 0 }
        ].forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'word-rotation-option';
            btn.textContent = opt.text;
            btn.onclick = (e) => { e.stopPropagation(); e.preventDefault(); rotateElement(currentSelectedImage, opt.angle, false); hideRotationMenu(); };
            rotationMenu.appendChild(btn);
        });
        selectionHandles.appendChild(rotationMenu);
        setTimeout(() => {
            const hide = (e) => { if (!rotationMenu?.contains(e.target)) { hideRotationMenu(); document.removeEventListener('click', hide); } };
            document.addEventListener('click', hide);
        }, 100);
    };

    const hideRotationMenu = () => {
        if (!rotationMenu) return;
        rotationMenu.classList.remove('show');
        setTimeout(() => { rotationMenu?.remove(); rotationMenu = null; }, 200);
    };

    const rotateElement = (element, angle, isRelative) => {
        if (!element) return;
        // Guard: don't rotate locked elements
        if (isElementLocked(element)) return;
        const isText = element.getAttribute('data-editable') || element.getAttribute('data-editor-id');
        if (isText) preserveRotatableTextPosition(element);

        // ✅ FIX: Save animation before rotation
        const savedAnimation = element.style.animation || '';
        const savedAnimationPlayState = element.style.animationPlayState || '';

        const state = getElementTransformState(element);
        const cur = getCurrentRotation(element);
        const newRot = normalizeRotation(isRelative === false || angle === 0 ? angle : cur + angle);
        const others = state.others.filter(f => !f.startsWith('rotate('));
        others.push('rotate(' + newRot + 'deg)');
        const t = buildTransformString(state.tx, state.ty, others);
        element.style.transform = t;

        // ✅ FIX: Restore animation after rotation
        if (savedAnimation) {
            element.style.animation = savedAnimation;
            element.style.animationPlayState = savedAnimationPlayState || 'running';
            console.log('[Rotation] Animation preserved in rotateElement:', savedAnimation);
        }

        element.dataset.editorTx = String(state.tx); element.dataset.editorTy = String(state.ty);
        restoreElementIdentity(element, element.__editorIdentitySnapshot || snapshotElementIdentity(element));
        const eid = getElementStorageId(element);
        if (eid) saveElementTransform(eid, t);
        setTimeout(() => { if (currentSelectedImage === element) showSelectionHandles(element); }, 100);
        const imgId = element.getAttribute('data-image-editable');
        const textId = element.getAttribute('data-editable') || element.getAttribute('data-editor-id');
        if (imgId) {
            postMsg({ type: 'HTML_IMAGE_ROTATED', id: imgId, rotation: newRot, transform: t });
            postMsg({ type: 'SET_HTML_IMAGE_STYLE', id: imgId, style: { transform: t } });
        } else if (textId) {
            postMsg({ type: 'HTML_TEXT_ROTATED', id: textId, rotation: newRot, transform: t });
            postMsg({ type: 'SET_HTML_STYLE', id: textId, style: { transform: t } });
        }
        const elId = imgId || textId;
        if (elId) {
            saveElementTransform(elId, t);
            postMsg({ type: 'HTML_DRAG_CHANGE', id: elId, tx: toNum(element.dataset.editorTx), ty: toNum(element.dataset.editorTy), rotation: newRot, transform: t });
        }
    };

    // ── AOS / stored transforms ───────────────────────────────────────────────
    const disableAos = () => {
        document.querySelectorAll(EDITABLE_SEL).forEach(el => {
            if (el.hasAttribute('data-aos')) { el.setAttribute('data-editor-aos-disabled', 'true'); el.removeAttribute('data-aos'); }
            el.removeAttribute('data-aos-delay'); el.removeAttribute('data-aos-duration');
            el.classList.remove('aos-animate'); el.style.opacity = '1';
        });
    };

    const applyStoredTransforms = () => {
        // ── Check if current template matches saved scope ──
        const currentScope = window.__htmlEditorScope;
        if (!currentScope || !currentScope.key) {
            console.log('[Apply Transforms] No scope defined, skipping state load');
            return;
        }

        // ── Try to load from EditorStateManager first (new method) ──
        if (window.editorStateManager) {
            try {
                console.log('[Apply Transforms] Attempting to load state for scope:', currentScope.key);
                const state = window.editorStateManager.loadFromLocalStorage(currentScope);
                if (state) {
                    console.log('[Apply Transforms] Loading from EditorStateManager');
                    window.editorStateManager.applyState(state);
                    return; // Exit early if EditorStateManager succeeded
                } else {
                    console.log('[Apply Transforms] No saved state found for this scope, using clean template');
                    return; // Don't apply old transforms if no state for this scope
                }
            } catch (e) {
                console.warn('[Apply Transforms] EditorStateManager failed:', e);
            }
        }

        // ── Fallback to legacy method (only if scope matches) ──
        console.log('[Apply Transforms] Using legacy transform loading');
        const transforms = loadElementTransforms();

        // Check if transforms belong to current scope
        const transformsKey = sessionStorage.getItem('html-editor-transforms-scope');
        if (transformsKey && transformsKey !== currentScope.key) {
            console.log('[Apply Transforms] Transforms belong to different scope, skipping');
            return;
        }

        Object.entries(transforms).forEach(([id, t]) => {
            queryEditableAll(id).forEach(el => {
                if (el.style.transform && el.style.transform !== 'none') {
                    const m = el.style.transform.match(/translate\(([^)]+)\)/);
                    if (m) { const [a, b] = m[1].split(','); el.dataset.editorTx = parseFloat(a) || 0; el.dataset.editorTy = parseFloat(b) || 0; }
                    return;
                }
                el.style.transform = t;
                if (!el.style.transformOrigin) el.style.transformOrigin = 'center center';
                if (window.getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
                const tm = t.match(/translate\(([^)]+)\)/);
                if (tm) {
                    const [a, b] = tm[1].split(',');
                    const tx = parseFloat(a) || 0, ty = parseFloat(b) || 0;
                    el.dataset.editorTx = tx; el.dataset.editorTy = ty;
                    el.style.setProperty('--el-tx', tx + 'px'); el.style.setProperty('--el-ty', ty + 'px');
                }
                const rm = t.match(/rotate\(([^)]+)deg\)/);
                if (rm) { const rv = parseFloat(rm[1]) || 0; el.dataset.editorRotation = String(rv); saveRotationToSession(id, rv); }
            });
        });
    };

    // ── Overflow helpers ──────────────────────────────────────────────────────
    const setAncestorsOverflow = (el) => {
        overflowStack = [];
        const push = (n) => {
            if (!n?.style) return;
            overflowStack.push({ node: n, overflow: n.style.overflow, overflowX: n.style.overflowX, overflowY: n.style.overflowY });
            n.style.overflow = n.style.overflowX = n.style.overflowY = 'visible';
        };
        // Skip setting overflow: visible on the element itself.
        // It's only needed for ancestors to prevent clipping the element as it moves.
        // Setting it on the element itself can break visual shapes (like circles) that rely on overflow: hidden.
        let node = el?.parentElement;
        while (node && node !== document.body) { push(node); node = node.parentElement; }
        // Không sửa overflow của body / documentElement: template thường dùng overflow-x:hidden
        // để căn giữa canvas; ép visible ở đây làm reflow cả khung nhìn (mobile: canvas trượt
        // ngang rồi khi thả restoreAncestorsOverflow lại “bật” về như cũ).
    };

    const restoreAncestorsOverflow = () => {
        overflowStack.slice().reverse().forEach(({ node, overflow, overflowX, overflowY }) => {
            if (!node?.style) return;
            node.style.overflow = overflow; node.style.overflowX = overflowX; node.style.overflowY = overflowY;
        });
        overflowStack = [];
    };

    // ── isSafeToAutoAssign ────────────────────────────────────────────────────
    const isSafeToAutoAssign = (el) => {
        if (!el || el === document.body || el === document.documentElement) return false;
        if (isEditableNode(el)) return true;
        const tag = el.tagName;
        if (['IMG', 'BUTTON', 'A', 'P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'LABEL', 'I', 'B', 'STRONG'].includes(tag)) return true;
        const rect = el.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) return false;
        if (rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.9) return false;
        return true;
    };

    // ── Actions scanning ──────────────────────────────────────────────────────
    const TRACKED_EVENTS = [
        { event: 'click', attr: 'onclick' }, { event: 'change', attr: 'onchange' }, { event: 'input', attr: 'oninput' },
        { event: 'submit', attr: 'onsubmit' }, { event: 'focus', attr: 'onfocus' }, { event: 'blur', attr: 'onblur' },
        { event: 'keydown', attr: 'onkeydown' }, { event: 'keyup', attr: 'onkeyup' }, { event: 'keypress', attr: 'onkeypress' },
        { event: 'mouseover', attr: 'onmouseover' }, { event: 'mouseout', attr: 'onmouseout' },
        { event: 'mouseenter', attr: 'onmouseenter' }, { event: 'mouseleave', attr: 'onmouseleave' }
    ];

    let lastActionsFingerprint = '';

    const isIgnoredActionEl = (el) => {
        if (!el?.classList) return false;
        if (el.closest?.('.word-selection-handles, .word-rotation-menu')) return true;
        return ['word-rotate-handle', 'word-rotation-option', 'word-handle', 'word-copy-handle', 'word-delete-handle', 'word-rotate-line', 'word-lock-badge']
            .some(c => el.classList.contains(c));
    };

    const isEditorOverlayTarget = (t) => {
        if (!t || typeof t.closest !== 'function') return false;
        return !!(t.closest('.word-selection-handles') || isIgnoredActionEl(t));
    };

    const normCode = (c) => (c || '').replace(/\s+/g, ' ').trim();

    const buildAction = (el, actionType, code, eventType, extra = {}) => {
        if (!el) return null;
        const nc = normCode(code);
        const fm = nc.match(/([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/);
        const selector = getElementSelector(el);
        const tag = (el.tagName || 'unknown').toLowerCase();
        const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '';

        // Ensure element has a unique action id for reliable identification
        let actionId = el.getAttribute('data-action-id');
        if (!actionId) {
            actionId = 'action-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
            el.setAttribute('data-action-id', actionId);
        }

        const action = {
            type: actionType || eventType || 'custom', event: eventType || actionType || 'custom',
            eventAttribute: extra.eventAttribute || '', element: tag + cls,
            elementId: actionId, function: fm ? fm[1] : '', parameters: fm ? fm[2] : '',
            code: nc, selector, description: extra.description || '', targetElement: tag,
            clickedElement: extra.clickedElement || tag
        };
        if (extra.url) action.url = extra.url;
        if (!action.description) {
            action.description = action.url ? 'Navigate to: ' + action.url
                : action.function ? 'Event ' + action.event + ': ' + action.function + '(' + (action.parameters || '') + ')'
                    : action.code ? 'Event ' + action.event + ': ' + action.code
                        : 'Event ' + action.event;
        }
        return action;
    };

    const pushUniqueAction = (actions, action) => {
        if (!action) return;
        const key = [action.type, action.event, action.selector, action.function, action.url, action.code].join('||');
        if (!actions.some(a => [a.type, a.event, a.selector, a.function, a.url, a.code].join('||') === key)) actions.push(action);
    };

    const isLinkAction = (action) => {
        if (!action) return false;
        return action.type === 'navigation' || Boolean(action.url);
    };

    const getElementActions = (el, eventType) => {
        if (!el || isIgnoredActionEl(el)) return [];
        const actions = [], req = (eventType || '').toLowerCase();
        TRACKED_EVENTS.forEach(({ event, attr }) => {
            if (req && event !== req) return;
            const inline = el.getAttribute?.(attr)?.trim() || '';
            if (inline) { pushUniqueAction(actions, buildAction(el, event, inline, event, { eventAttribute: attr })); return; }
            const prop = el['on' + event];
            if (typeof prop === 'function') pushUniqueAction(actions, buildAction(el, event, String(prop), event, { eventAttribute: 'on' + event }));
        });
        const tag = (el.tagName || '').toLowerCase();
        if ((!req || req === 'click') && tag === 'a') {
            const href = el.getAttribute('href') || el.href || '';
            if (href) pushUniqueAction(actions, buildAction(el, 'navigation', '', 'click', { url: href, description: 'Navigate to: ' + href }));
        }
        if ((!req || req === 'submit') && tag === 'form') {
            const action = el.getAttribute('action') || el.action || '';
            if (action) pushUniqueAction(actions, buildAction(el, 'submit', '', 'submit', { url: action, description: 'Submit form to: ' + action }));
        }
        return actions;
    };

    const findActionMatch = (target, eventType) => {
        let cur = target?.nodeType === 3 ? target.parentElement : target;
        cur = cur?.closest?.('*') || null;
        for (let d = 0; d < 8 && cur; d++, cur = cur.parentElement) {
            const found = getElementActions(cur, eventType);
            if (found.length > 0) {
                const action = found[0];
                action.clickedElement = (target?.nodeType !== 3 ? target?.tagName?.toLowerCase() : '') || '';
                return { action, element: cur, clickedElement: target };
            }
        }
        return null;
    };

    const collectAllActions = () => {
        const result = [];
        Array.from(document.querySelectorAll('*')).forEach(n =>
            getElementActions(n).forEach(a => {
                if (isLinkAction(a)) pushUniqueAction(result, a);
            }),
        );
        return result;
    };

    const emitActionsSnapshot = (force) => {
        const actions = collectAllActions();
        const fp = actions.map(a => [a.type, a.event, a.selector, a.function, a.url, a.code].join('||')).join('###');
        if (!force && fp === lastActionsFingerprint) return;
        lastActionsFingerprint = fp;
        postMsg({ type: 'ACTIONS_SYNC', actions });
    };

    // ── Element selector ──────────────────────────────────────────────────────
    const getElementSelector = (el) => {
        if (!el) return '';
        let sel = el.tagName.toLowerCase();
        if (el.id) { sel += '#' + el.id; }
        else if (el.className) {
            const cls = el.className.split(' ').filter(c => c.trim());
            if (cls.length) sel += '.' + cls.join('.');
        } else if (el.parentElement) {
            const siblings = Array.from(el.parentElement.children).filter(c => c.tagName === el.tagName);
            const idx = siblings.indexOf(el);
            if (idx >= 0) sel += ':nth-of-type(' + (idx + 1) + ')';
        }
        return sel;
    };

    // ── Resolve inherited styles ──────────────────────────────────────────────
    const resolveInheritedTextStyles = (target) => {
        let cur = target;
        while (cur && cur !== document.body) {
            const cs = window.getComputedStyle(cur);
            if (cs?.fontFamily && cs.fontFamily !== 'inherit' && cs.fontFamily !== 'initial') {
                return { fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, lineHeight: cs.lineHeight, color: cs.color, textAlign: cs.textAlign, textDecoration: cs.textDecoration, letterSpacing: cs.letterSpacing, wordSpacing: cs.wordSpacing, textTransform: cs.textTransform, fontVariant: cs.fontVariant, textShadow: cs.textShadow, whiteSpace: cs.whiteSpace, wordBreak: cs.wordBreak, overflowWrap: cs.overflowWrap };
            }
            cur = cur.parentElement;
        }
        const bs = window.getComputedStyle(document.body);
        return { fontFamily: bs.fontFamily, fontSize: bs.fontSize, fontWeight: bs.fontWeight, fontStyle: bs.fontStyle, lineHeight: bs.lineHeight, color: bs.color, textAlign: bs.textAlign, textDecoration: bs.textDecoration, letterSpacing: bs.letterSpacing, wordSpacing: bs.wordSpacing, textTransform: bs.textTransform, fontVariant: bs.fontVariant, textShadow: bs.textShadow, whiteSpace: bs.whiteSpace, wordBreak: bs.wordBreak, overflowWrap: bs.overflowWrap };
    };

    const resolveInheritedZIndex = (target) => {
        let cur = target;
        while (cur && cur !== document.body) {
            try {
                const z = window.getComputedStyle(cur).zIndex;
                if (z && z !== 'auto' && !isNaN(parseInt(z, 10))) return String(parseInt(z, 10));
            } catch { }
            cur = cur.parentElement;
        }
        return '0';
    };

    const findBestInsertionContext = (size = {}) => {
        const vw = window.innerWidth || 0, vh = window.innerHeight || 0;
        const px = Math.round(vw / 2), py = Math.round(vh / 2);
        let target = document.elementFromPoint(px, py), orig = target, chosen = document.body;
        while (target && target !== document.body) {
            const cs = window.getComputedStyle(target), rect = target.getBoundingClientRect();
            if (rect.width > 120 && rect.height > 120 && cs.display !== 'inline' && cs.visibility !== 'hidden' && cs.position !== 'static') { chosen = target; break; }
            target = target.parentElement;
        }
        if (window.getComputedStyle(chosen).position === 'static') chosen.style.position = 'relative';
        if (chosen === document.body) return { parent: chosen, target: orig || chosen, left: Math.max(0, Math.round((window.scrollX || 0) + px - (size.width || 0) / 2)), top: Math.max(0, Math.round((window.scrollY || 0) + py - (size.height || 0) / 2)) };
        const pr = chosen.getBoundingClientRect();
        return { parent: chosen, target: orig || chosen, left: Math.max(0, Math.round(px - pr.left - (size.width || 0) / 2)), top: Math.max(0, Math.round(py - pr.top - (size.height || 0) / 2)) };
    };

    const resolveDateId = (target) => {
        if (!target?.closest) return null;
        const el = target.closest('[data-editdate],[data-editdate-trigger]');
        return el ? (el.getAttribute('data-editdate') || el.getAttribute('data-editdate-trigger') || null) : null;
    };

    // ── Context menu ──────────────────────────────────────────────────────────
    const findEditableById = (id) => {
        if (!id) return null;
        // 1. Check if the current selected element matches this ID
        const selected = selectionManager.getSelected();
        if (selected && selectionManager.getElementId(selected) === id) {
            return selected;
        }
        // 2. Fallback to querySelector
        return document.querySelector('[data-editable="' + id + '"],[data-editor-id="' + id + '"],[data-image-editable="' + id + '"],[data-edit-map="' + id + '"],[data-edit-map-href="' + id + '"]');
    };

    let layerPanelHoverEl = null;
    const LAYER_PANEL_HOVER_CLS = 'editor-layers-panel-hover';
    const clearLayerPanelHover = () => {
        if (layerPanelHoverEl) {
            try { layerPanelHoverEl.classList.remove(LAYER_PANEL_HOVER_CLS); } catch { }
            layerPanelHoverEl = null;
        }
    };
    const setLayerPanelHoverFromHost = (rawId) => {
        clearLayerPanelHover();
        const id = rawId == null || rawId === '' ? '' : String(rawId);
        if (!id) return;
        const dom = findEditableById(id);
        if (!dom) return;
        layerPanelHoverEl = dom;
        try { dom.classList.add(LAYER_PANEL_HOVER_CLS); } catch { }
    };

    /**
     * Cuộn mọi ancestor có overflow + viewport iframe — template thường cuộn trên div/body, không chỉ window.
     */
    const scrollEditableIntoViewRobust = (node) => {
        if (!node || !node.ownerDocument) return;
        const win = node.ownerDocument.defaultView || window;
        const doc = node.ownerDocument;

        const scrollAncestors = () => {
            let p = node.parentElement;
            while (p && p !== doc.documentElement) {
                try {
                    const cs = win.getComputedStyle(p);
                    const oy = cs.overflowY;
                    const ov = cs.overflow;
                    const canScrollY = (oy === 'auto' || oy === 'scroll' || ov === 'auto' || ov === 'scroll') &&
                        p.scrollHeight > p.clientHeight + 1;
                    if (canScrollY) {
                        const nr = node.getBoundingClientRect();
                        const pr = p.getBoundingClientRect();
                        const relTop = nr.top - pr.top + p.scrollTop;
                        const nextTop = relTop - p.clientHeight / 2 + Math.min(nr.height, p.clientHeight) / 2;
                        p.scrollTop = Math.max(0, Math.min(nextTop, p.scrollHeight - p.clientHeight));
                    }
                } catch { }
                p = p.parentElement;
            }
        };

        const scrollWindowToCenter = () => {
            try {
                const r = node.getBoundingClientRect();
                const sy = win.pageYOffset || doc.documentElement.scrollTop || doc.body.scrollTop || 0;
                const docTop = r.top + sy;
                const vh = win.innerHeight || doc.documentElement.clientHeight || 600;
                const target = docTop - vh / 2 + r.height / 2;
                win.scrollTo({ top: Math.max(0, target), left: win.scrollX || win.pageXOffset || 0, behavior: 'smooth' });
            } catch { }
        };

        const runOnce = () => {
            scrollAncestors();
            scrollWindowToCenter();
            try {
                node.scrollIntoView({ block: 'center', behavior: 'smooth', inline: 'nearest' });
            } catch { }
        };

        runOnce();
        try {
            setTimeout(runOnce, 120);
        } catch { }
        try {
            setTimeout(runOnce, 320);
        } catch { }
    };

    /**
     * Chọn từ panel Lớp: đồng bộ y cho host (canvas) + cuộn sâu trong iframe.
     */
    const scrollLayerPanelSelectionIntoView = (node, storageId) => {
        if (!node) return;
        const notifyHost = () => {
            try {
                const sy = window.pageYOffset ||
                    document.documentElement.scrollTop ||
                    document.body.scrollTop ||
                    0;
                const r = node.getBoundingClientRect();
                const yDoc = r.top + sy;
                postMsg({
                    type: 'HTML_ELEMENT_Y_VALUE',
                    id: storageId || '',
                    y: yDoc,
                });
            } catch { }
        };
        const run = () => {
            notifyHost();
            scrollEditableIntoViewRobust(node);
        };
        try {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setTimeout(run, 40));
            });
        } catch {
            setTimeout(run, 60);
        }
    };

    /** Click một dòng trong panel Lớp (host) → chọn phần tử như khi bấm trên thiệp (handles + FOCUS_FIELD). */
    const selectElementFromLayerPanel = (rawId) => {
        clearLayerPanelHover();
        const id = rawId == null || rawId === '' ? '' : String(rawId);
        if (!id) return;
        const el = findEditableById(id);
        if (!el || !document.body.contains(el)) return;
        clearEditing();
        let fieldId = el.getAttribute('data-editable') || el.getAttribute('data-editor-id');
        let imageId = el.getAttribute('data-image-editable');
        const mapId = el.getAttribute('data-edit-map') || el.getAttribute('data-edit-map-href');
        if (!imageId && ['IMG', 'PICTURE', 'IMAGE'].includes(el.tagName) && fieldId) {
            imageId = fieldId;
            fieldId = null;
        }
        el.classList.add('editing');
        // Không boost z-index 999999 — tránh đè thứ tự stack; deselect sẽ không khôi phục z cũ sai sau renormalize.
        showSelectionHandles(el, { skipZBoost: true });
        /* Viền kiểu hover (#a855f7) — showSelectionHandles thêm .selected đè outline; kết hợp class panel hover + CSS phía trên */
        setLayerPanelHoverFromHost(id);
        if (fieldId && !imageId && !mapId) {
            postMsg({ type: 'FOCUS_FIELD', id: fieldId, tab: 'info', suppressActiveTab: true });
        } else if (imageId) {
            postMsg({ type: 'FOCUS_FIELD', id: imageId, tab: 'images', suppressActiveTab: true });
            /* Không gửi IMAGE_CLICKED_IN_IFRAME — tránh cuộn/kích hoạt thư viện ảnh khi đang ở panel Vị trí */
        } else if (mapId) {
            postMsg({ type: 'FOCUS_FIELD', id: mapId, tab: 'maps', suppressActiveTab: true });
        }
        scrollLayerPanelSelectionIntoView(el, id);
    };

    const sanitizeActionStorageId = (action) => {
        const raw = [
            action?.elementId || '',
            action?.selector || '',
            action?.type || '',
            action?.event || ''
        ]
            .join('-')
            .replace(/[^a-zA-Z0-9_-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80);
        return raw ? 'action-' + raw : 'action-' + Date.now();
    };

    const IMAGE_LIKE_TAGS = new Set(['IMG', 'PICTURE', 'IMAGE', 'VIDEO', 'IFRAME', 'SVG', 'PATH', 'RECT', 'CIRCLE', 'ELLIPSE', 'POLYGON', 'LINE', 'POLYLINE', 'CANVAS']);
    const TEXT_LIKE_TAGS = new Set(['A', 'BUTTON', 'P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'LABEL', 'SMALL', 'EM', 'STRONG', 'B', 'I']);

    const findPreferredEditableDescendant = (root, preferredKind) => {
        if (!root?.querySelector) return null;
        const selectorsByKind = {
            image: '[data-image-editable],img',
            text: '[data-editable],[data-editor-id]',
            map: '[data-edit-map],[data-edit-map-href]',
        };
        const preferredSelector = selectorsByKind[preferredKind];
        if (preferredSelector) {
            const preferredMatch = root.querySelector(preferredSelector);
            if (preferredMatch) return preferredMatch;
        }
        return (
            root.querySelector('[data-editable],[data-editor-id]') ||
            root.querySelector('[data-image-editable],img') ||
            root.querySelector('[data-edit-map],[data-edit-map-href]') ||
            null
        );
    };

    const inferActionTargetKind = (action, el) => {
        const clickedTag = String(action?.clickedElement || '').toUpperCase();
        const targetTag = String(action?.targetElement || '').toUpperCase();
        const elementTag = String(el?.tagName || '').toUpperCase();
        const dominantTag = clickedTag || targetTag || elementTag;

        if (IMAGE_LIKE_TAGS.has(dominantTag)) return 'image';
        if (dominantTag === 'MAP' || dominantTag === 'AREA') return 'map';
        if (TEXT_LIKE_TAGS.has(dominantTag)) return 'text';

        if (el?.matches?.('[data-image-editable],img')) return 'image';
        if (el?.matches?.('[data-editable],[data-editor-id]')) return 'text';
        if (el?.matches?.('[data-edit-map],[data-edit-map-href]')) return 'map';

        try {
            const style = window.getComputedStyle(el);
            if (style?.backgroundImage && style.backgroundImage !== 'none') return 'image';
        } catch { }

        if (el?.querySelector?.('[data-editable],[data-editor-id]')) return 'text';
        if (el?.querySelector?.('[data-image-editable],img')) return 'image';
        if (el?.querySelector?.('[data-edit-map],[data-edit-map-href]')) return 'map';

        const textContent = String(el?.textContent || '').trim();
        if (textContent) return 'text';
        return 'image';
    };

    const normalizeActionPanelTarget = (el, action) => {
        if (!el) return null;
        if (isEditableNode(el) && !isContainerOnlyEditable(el)) return el;

        const preferredKind = inferActionTargetKind(action, el);
        const descendant = findPreferredEditableDescendant(el, preferredKind);
        if (descendant) {
            const resolvedDescendant = resolveInteractiveEditable(descendant) || descendant;
            if (resolvedDescendant) return resolvedDescendant;
        }

        return resolveInteractiveEditable(el) || el;
    };

    const findActionPanelTarget = (action) => {
        if (!action) return null;
        const selector = String(action.selector || '').trim();
        if (selector) {
            try {
                const bySelector = document.querySelector(selector);
                if (bySelector) return normalizeActionPanelTarget(bySelector, action);
            } catch { }
        }
        const elementId = String(action.elementId || '').trim();
        if (elementId) {
            const editable = findEditableById(elementId);
            if (editable) return normalizeActionPanelTarget(editable, action);
            const byId = document.getElementById(elementId);
            if (byId) return normalizeActionPanelTarget(byId, action);
        }
        return null;
    };

    const ensureActionTargetEditable = (el, action) => {
        if (!el) return { id: '', tab: 'actions' };

        let fieldId = el.getAttribute('data-editable') || el.getAttribute('data-editor-id');
        let imageId = el.getAttribute('data-image-editable');
        const mapId = el.getAttribute('data-edit-map') || el.getAttribute('data-edit-map-href');

        if (!imageId && ['IMG', 'PICTURE', 'IMAGE'].includes(el.tagName) && fieldId) {
            imageId = fieldId;
            fieldId = null;
        }

        if (!fieldId && !imageId && !mapId) {
            if (!isSafeToAutoAssign(el)) return { id: '', tab: 'actions' };
            const actionStorageId = sanitizeActionStorageId(action);
            const inferredKind = inferActionTargetKind(action, el);
            if (inferredKind === 'image') {
                imageId = actionStorageId;
                el.setAttribute('data-image-editable', imageId);
            } else if (inferredKind === 'map') {
                el.setAttribute('data-edit-map', actionStorageId);
                return { id: actionStorageId, tab: 'maps' };
            } else {
                fieldId = actionStorageId;
                el.setAttribute('data-editor-id', fieldId);
            }
        }

        if (fieldId && !imageId && !mapId) return { id: fieldId, tab: 'info' };
        if (imageId) return { id: imageId, tab: 'images' };
        if (mapId) return { id: mapId, tab: 'maps' };
        return { id: '', tab: 'actions' };
    };

    const selectElementFromActionPanel = (action) => {
        const el = findActionPanelTarget(action);
        if (!el || !document.body.contains(el)) return;
        clearEditing();
        const targetInfo = ensureActionTargetEditable(el, action);
        if (!targetInfo.id) return;
        el.classList.add('editing');
        showSelectionHandles(el);
        // ✅ Solid rounded highlight for layers reordering
        applyTempHighlight(el, {
            outline: 'none',
            boxShadow: '0 0 0 4px #f59e0b, 0 0 20px rgba(245,158,11,0.4)',
            borderRadius: '12px',
            zIndex: '1000002'
        }, 1200);
        postMsg({ type: 'FOCUS_FIELD', id: targetInfo.id, tab: targetInfo.tab, suppressActiveTab: true });
        scrollLayerPanelSelectionIntoView(el, targetInfo.id);
    };

    const LAYER_STACK_SELECTOR = '[data-editable],[data-editor-id],[data-image-editable],[data-edit-map],[data-edit-map-href]';

    const resolveStackZForLayer = (el) => {
        if (!el) return 0;
        try {
            const dz = el.getAttribute && el.getAttribute('data-z-index');
            if (dz != null && String(dz).trim() !== '') {
                const n = parseInt(dz, 10);
                if (!isNaN(n)) return n;
            }
            const inline = el.style && el.style.zIndex;
            if (inline && inline !== '' && inline !== 'auto') {
                const n = parseInt(inline, 10);
                if (!isNaN(n)) return n;
            }
            const cz = window.getComputedStyle(el).zIndex;
            if (cz && cz !== 'auto') {
                const n = parseInt(cz, 10);
                if (!isNaN(n)) return n;
            }
        } catch { }
        return 0;
    };

    const ensurePositionForStacking = (el) => {
        if (!el) return;
        try {
            const p = window.getComputedStyle(el).position;
            if (p === 'static') el.style.position = 'relative';
        } catch { }
    };

    const buildLayerStackRows = () => {
        const orderMap = new Map();
        document.querySelectorAll('*').forEach((node, idx) => { orderMap.set(node, idx); });
        const seen = new Set();
        const rows = [];
        document.querySelectorAll(LAYER_STACK_SELECTOR).forEach((el) => {
            const id = getElementStorageId(el);
            if (!id || seen.has(id)) return;
            seen.add(id);
            rows.push({ el, id, z: resolveStackZForLayer(el), order: orderMap.get(el) || 0 });
        });
        rows.sort((a, b) => (b.z - a.z) || (b.order - a.order));
        return rows;
    };

    const postContextMoveLayerBatch = (updates) => {
        if (!updates || !updates.length) return;
        if (updates.length === 1) {
            postMsg({ type: 'CONTEXT_MOVE_LAYER', id: updates[0].id, zIndex: updates[0].zIndex });
            return;
        }
        postMsg({ type: 'CONTEXT_MOVE_LAYER_BATCH', updates: updates });
    };

    const renormalizeStackZFromTopFirst = (rowsTopFirst) => {
        const n = rowsTopFirst.length;
        if (!n) return;
        const updates = [];
        for (let i = 0; i < n; i++) {
            const row = rowsTopFirst[i];
            const newZ = 10 + (n - i) * 10;
            ensurePositionForStacking(row.el);
            // Set z-index in inline style so it persists in HTML
            row.el.style.setProperty('z-index', String(newZ), 'important');
            // Also set as data attribute for backup
            row.el.setAttribute('data-z-index', String(newZ));
            updates.push({ id: row.id, zIndex: newZ });
        }
        postContextMoveLayerBatch(updates);
        try {
            selectionManager.syncStoredZIndexFromDom();
        } catch (e) { /* ignore */ }
        // Save to localStorage after z-index changes
        saveZIndexToLocalStorage();
    };

    const applyMoveLayerDirection = (dom, dir) => {
        if (!dom) return;
        ensurePositionForStacking(dom);
        const rows = buildLayerStackRows();
        const idx = rows.findIndex((r) => r.el === dom);
        if (idx < 0) return;
        const next = rows.slice();
        if (dir === 'top') {
            const [item] = next.splice(idx, 1);
            next.unshift(item);
            renormalizeStackZFromTopFirst(next);
            return;
        }
        if (dir === 'bottom') {
            const [item] = next.splice(idx, 1);
            next.push(item);
            renormalizeStackZFromTopFirst(next);
            return;
        }
        if (dir === 'up') {
            if (idx <= 0) return;
            const t = next[idx - 1];
            next[idx - 1] = next[idx];
            next[idx] = t;
            renormalizeStackZFromTopFirst(next);
            return;
        }
        if (dir === 'down') {
            if (idx >= next.length - 1) return;
            const t = next[idx + 1];
            next[idx + 1] = next[idx];
            next[idx] = t;
            renormalizeStackZFromTopFirst(next);
            return;
        }
    };

    /** Thứ tự id từ panel (trên cùng = trước nhất trên thiệp). Các lớp không có trong list được giữ phía dưới. */
    const applyTextLayerOrder = (orderedIdsTopFirst) => {
        if (!Array.isArray(orderedIdsTopFirst) || !orderedIdsTopFirst.length) return;
        const full = buildLayerStackRows();
        const rowById = new Map(full.map((r) => [r.id, r]));
        const used = new Set();
        const merged = [];
        orderedIdsTopFirst.forEach((id) => {
            const r = rowById.get(id);
            if (r) { merged.push(r); used.add(id); }
        });
        full.forEach((r) => {
            if (!used.has(r.id)) merged.push(r);
        });
        renormalizeStackZFromTopFirst(merged);
    };

    const handleSelectLayerBelow = (_, clientX, clientY) => {
        const stack = elementStackManager.getStackAtPosition(clientX, clientY);
        if (stack.length <= 1) return;
        const currentEl = selectionManager.getSelected();
        let targetEl = null;
        if (currentEl) {
            const idx = stack.findIndex(el => el === currentEl);
            if (idx >= 0 && idx < stack.length - 1) targetEl = stack[idx + 1];
        }
        if (!targetEl) targetEl = stack[1];
        if (targetEl) selectionManager.select(targetEl);
    };

    // Helper: tìm element để apply visual feedback cho parent drag
    // Ưu tiên: queryEditableAll (có attribute) → findEditableById → selected element
    const resolveParentDragElement = (elementId) => {
        const byAttr = queryEditableAll(elementId);
        if (byAttr.length > 0) return byAttr;
        const byId = findEditableById(elementId);
        if (byId) return [byId];
        const selected = selectionManager.getSelected();
        if (selected && (getEditableId(selected) === elementId || selected.id === elementId)) return [selected];
        return [];
    };

    const handleEnableParentDrag = (elementId) => {
        parentDragController.allowParentDrag(elementId);
        allowParentDragging[elementId] = true;
        const targets = resolveParentDragElement(elementId);
        targets.forEach(el => {
            el.style.cursor = 'move';
            el.classList.add('editor-parent-drag-enabled');
        });
        // Nếu không tìm được qua id, thử apply lên selected element trực tiếp
        if (targets.length === 0) {
            const selected = selectionManager.getSelected();
            if (selected) {
                selected.style.cursor = 'move';
                selected.classList.add('editor-parent-drag-enabled');
            }
        }
        try {
            window.parent.postMessage({ __html_editor: true, type: 'PARENT_DRAG_PERMISSION_GRANTED', targetId: elementId, expiresIn: 30000 }, '*');
            window.parent.postMessage({ __html_editor: true, type: 'UPDATE_CONTEXT_MENU_PARENT_DRAG', targetId: elementId, isParentDragEnabled: true }, '*');
        } catch (error) { console.error('Error sending parent drag permission notification:', error); }
        setTimeout(() => {
            allowParentDragging[elementId] = false;
            parentDragController.disallowParentDrag(elementId);
            resolveParentDragElement(elementId).forEach(el => el.classList.remove('editor-parent-drag-enabled'));
            try {
                window.parent.postMessage({ __html_editor: true, type: 'UPDATE_CONTEXT_MENU_PARENT_DRAG', targetId: elementId, isParentDragEnabled: false }, '*');
            } catch (error) { console.error('Error sending parent drag expiration notification:', error); }
        }, 30000);
    };

    const handleDisableParentDrag = (elementId) => {
        allowParentDragging[elementId] = false;
        parentDragController.disallowParentDrag(elementId);
        resolveParentDragElement(elementId).forEach(el => {
            el.classList.remove('editor-parent-drag-enabled');
            el.style.cursor = '';
        });
        try {
            window.parent.postMessage({ __html_editor: true, type: 'UPDATE_CONTEXT_MENU_PARENT_DRAG', targetId: elementId, isParentDragEnabled: false }, '*');
        } catch (error) { console.error('Error sending parent drag disable notification:', error); }
    };

    const handleGetImageSrc = (elementId) => {
        const element = queryEditableAll(elementId)[0];
        if (!element) {
            postMsg({ type: 'IMAGE_SRC_ERROR', targetId: elementId, error: 'Element not found' });
            return;
        }
        let src = '';
        if (element.tagName === 'IMG') {
            src = element.src || '';
        } else {
            const bgImage = element.style.backgroundImage || window.getComputedStyle(element).backgroundImage;
            const match = bgImage?.match(/url\(['"]?([^'"]+)['"]?\)/);
            src = match ? match[1] : '';
        }
        if (!src) { postMsg({ type: 'IMAGE_SRC_ERROR', targetId: elementId, error: 'No image source found' }); return; }
        const img = new Image();
        img.onload = () => postMsg({ type: 'IMAGE_SRC_RESPONSE', targetId: elementId, src });
        img.onerror = () => postMsg({ type: 'IMAGE_SRC_ERROR', targetId: elementId, error: 'Image not accessible (CORS or 404)' });
        img.src = src;
    };

    const handleApplyImageCrop = (targetId, cropData) => {
        queryEditableAll(targetId).forEach(element => {
            if (element.tagName === 'IMG') {
                element.setAttribute('data-crop', JSON.stringify(cropData));
                const { x = 0, y = 0, width = 1, height = 1, shape = '' } = cropData;
                if (shape && shape !== '0') element.style.borderRadius = shape;
                element.style.objectFit = 'cover';
                element.style.objectPosition = (-x * 100) + '% ' + (-y * 100) + '%';
                const naturalWidth = element.naturalWidth || element.width || 100;
                const naturalHeight = element.naturalHeight || element.height || 100;
                const cropWidth = width * naturalWidth, cropHeight = height * naturalHeight;
                if (cropWidth > 0 && cropHeight > 0) {
                    const aspectRatio = cropWidth / cropHeight;
                    const currentWidth = element.offsetWidth || element.width || 100;
                    if (currentWidth > 0) element.style.height = (currentWidth / aspectRatio) + 'px';
                }
            }
        });
        postMsg({ type: 'IMAGE_CROP_APPLIED', targetId, cropData });
    };

    const handleContextMenu = (e) => {
        e.preventDefault(); e.stopPropagation();
        const raw = e.target?.nodeType === 3 ? e.target.parentElement : e.target;

        // Context menu dùng hàm resolve riêng — KHÔNG skip container (khác với drag resolve)
        // Để user có thể right-click vào container và thấy option "Kéo phần cha"
        const resolveContextTarget = (target) => {
            let cur = target;
            // Ưu tiên: tìm editable node gần nhất (kể cả container)
            while (cur && cur !== document.body && cur !== document.documentElement) {
                if (isEditableNode(cur)) return cur;
                cur = cur.parentElement;
            }
            // Fallback: tìm closest editable selector
            return raw?.closest?.(EDITABLE_SEL) || null;
        };

        const el = resolveContextTarget(raw);
        let targetId = null, targetTab = null, isImage = false, isLocked = false, currentZIndex = 0, isParent = false, hasUnderlyingElements = false, isParentDragEnabled = false;
        if (el) {
            const fid = el.getAttribute('data-editable') || el.getAttribute('data-editor-id');
            const imgId = el.getAttribute('data-image-editable');
            const mapId = el.getAttribute('data-edit-map') || el.getAttribute('data-edit-map-href');
            const isIntrinsic = ['IMG', 'PICTURE', 'IMAGE'].includes(el.tagName);
            if (imgId || (isIntrinsic && fid)) { targetId = imgId || fid; targetTab = 'images'; isImage = true; }
            else if (mapId) { targetId = mapId; targetTab = 'maps'; }
            else if (fid) { targetId = fid; targetTab = 'info'; }
            // ── isLocked now works for ALL element types via isElementLocked ──
            isLocked = isElementLocked(el);

            // ✅ FIX: Get z-index from computed style (includes CSS classes and inline styles)
            const computedStyle = window.getComputedStyle(el);
            const zIndexValue = el.style.zIndex || computedStyle.zIndex;
            currentZIndex = parseInt(zIndexValue, 10) || 0;
            // Handle 'auto' value
            if (zIndexValue === 'auto' || isNaN(currentZIndex)) {
                currentZIndex = 0;
            }
            console.log('[Context Menu] Z-index for', targetId, ':', currentZIndex, '(inline:', el.style.zIndex, ', computed:', computedStyle.zIndex, ')');

            isParent = parentDragController.isParentElement(el);
            if (targetId) isParentDragEnabled = parentDragController.allowedParents.has(targetId);
            const stack = elementStackManager.getStackAtPosition(e.clientX, e.clientY);
            hasUnderlyingElements = stack.length > 1;
        }
        postMsg({ type: 'SHOW_HTML_CONTEXT_MENU', targetId, isImage, isLocked, currentZIndex, clientX: e.clientX, clientY: e.clientY, tab: targetTab, isParent, hasUnderlyingElements, isParentDragEnabled });
    };

    function getRotationFromMatrix(transform) {
        if (!transform || transform === 'none') return 0;

        const match2d = transform.match(/^matrix\(([^)]+)\)$/);
        if (match2d) {
            const values = match2d[1].split(',').map(Number);
            const [a, b] = values;

            // atan2(b, a) → góc rotation
            return Math.atan2(b, a) * (180 / Math.PI);
        }

        const match3d = transform.match(/^matrix3d\(([^)]+)\)$/);
        if (match3d) {
            const values = match3d[1].split(',').map(Number);
            const a = values[0];
            const b = values[1];

            return Math.atan2(b, a) * (180 / Math.PI);
        }

        return 0;
    }

    // ── Interaction handler ───────────────────────────────────────────────────
    const isHandleTarget = (t) => !!(t.closest?.('.word-selection-handles') || isIgnoredActionEl(t));
    const isNativeGalleryControlArrowTarget = (target) => {
        if (!target || typeof target.closest !== 'function') return false;
        return !!target.closest(
            '.ladi-gallery-control-arrow-left, .ladi-gallery-control-arrow-right'
        );
    };
    const isGalleryLightboxControlTarget = (target) => {
        if (!target || typeof target.closest !== 'function') return false;
        const lightbox = target.closest('#galleryLightbox.active, .lightbox.active');
        if (!lightbox) return false;
        return (
            target === lightbox ||
            !!target.closest(
                '.lightbox-header, .lightbox-toolbar, .toolbar-btn, .lightbox-close, .lightbox-prev, .lightbox-next, .lightbox-content, #lightboxContent, #lightboxImg'
            )
        );
    };

    const handleInteraction = (e) => {
        if (interactionMode === 'hand') return;
        const raw = e.target?.nodeType === 3 ? e.target.parentElement : e.target;
        if (isNativeGalleryControlArrowTarget(raw)) return;
        if (isGalleryLightboxControlTarget(raw)) return;
        // Skip elements explicitly marked as non-editable (e.g. chrome system tabs, RSVP tabs)
        if (raw?.closest?.('[data-editor-ignore]')) return;
        const el = resolveDragTarget(raw, e.clientX, e.clientY) || raw?.closest?.('*');
        if (!el) { postMsg({ type: 'FOCUS_FIELD', id: null }); return; }
        // Also skip if the resolved drag target is inside an editor-ignore container
        if (el?.closest?.('[data-editor-ignore]')) return;

        const dateId = resolveDateId(e.target);
        if ((e.type === 'click' || e.type === 'dblclick') && dateId) {
            e.preventDefault(); e.stopPropagation();
            postMsg({ type: 'FOCUS_DATE_FIELD', id: dateId }); return;
        }

        const actionMatch = findActionMatch(raw, e.type);
        let blockPanel = false;
        if (actionMatch?.action) {
            e.preventDefault(); e.stopPropagation();
            if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

            const isImg = raw.tagName === 'IMG' || raw.closest('img, [data-image-editable]') || actionMatch.element?.querySelector('img, [data-image-editable]');
            const isLink = actionMatch.action.type === 'navigation' || actionMatch.action.url || actionMatch.element?.tagName === 'A';

            if (!isImg && isLink) {
                applyTempHighlight(actionMatch.element || el, {
                    outline: 'none',
                    boxShadow: '0 0 0 3px #10b981, 0 0 15px rgba(16,185,129,0.3)',
                    borderRadius: '8px',
                    zIndex: '1000002'
                }, 1000);
                postMsg({ type: 'ACTION_DETECTED', action: actionMatch.action });
                emitActionsSnapshot(false);
            } else {
                blockPanel = true;
            }
        }

        if (isHandleTarget(e.target)) { e.preventDefault(); e.stopPropagation(); return; }

        let fieldId = el.getAttribute('data-editable') || el.getAttribute('data-editor-id');
        let imageId = el.getAttribute('data-image-editable');
        const mapId = el.getAttribute('data-edit-map') || el.getAttribute('data-edit-map-href');
        if (!imageId && ['IMG', 'PICTURE', 'IMAGE'].includes(el.tagName) && fieldId) { imageId = fieldId; fieldId = null; }

        if (!imageId && (el.hasAttribute('data-action') || el.hasAttribute('data-action-id'))) {
            const imgChild = el.querySelector('img[data-image-editable]');
            if (imgChild) {
                imageId = imgChild.getAttribute('data-image-editable');
                fieldId = null;
            }
        }

        if (currentSelectedImage === el && (fieldId || imageId || mapId)) {
            // ✅ FIX: Allow double-click to enable contentEditable even when element is already selected
            if (e.type === 'dblclick' && fieldId && !imageId && !mapId && !isElementLocked(el)) {
                console.log('[Text Editing] Double-click on already selected text element - enabling contentEditable');
                // Don't return early - let it fall through to contentEditable logic below
            } else {
                e.preventDefault(); e.stopPropagation(); return;
            }
        }
        if (currentSelectedImage && currentSelectedImage !== el && (fieldId || imageId || mapId)) clearEditing();

        if (e.type === 'click' || e.type === 'dblclick') {
            e.stopPropagation();
            if (!fieldId && !imageId && !mapId) {
                if (!isSafeToAutoAssign(el)) { clearEditing(); postMsg({ type: 'FOCUS_FIELD', id: null }); return; }
                if (['IMG', 'VIDEO', 'IFRAME', 'SVG', 'PATH', 'RECT', 'CIRCLE', 'ELLIPSE', 'POLYGON', 'LINE', 'POLYLINE', 'DIV', 'SECTION'].includes(el.tagName)) {
                    imageId = 'editor-img-' + Date.now();
                    el.setAttribute('data-image-editable', imageId);
                    el.classList.add('editing'); showSelectionHandles(el);
                    postMsg({ type: 'FOCUS_FIELD', id: imageId, tab: 'images' }); return;
                }
                fieldId = 'editor-' + Date.now();
                el.setAttribute('data-editor-id', fieldId);
            }
            if (fieldId && !imageId && !mapId) {
                e.preventDefault(); el.classList.add('editing'); showSelectionHandles(el);
                // ── FIX: Enable contentEditable on double-click for easier text editing ──
                if (e.type === 'dblclick' && !isElementLocked(el)) {
                    console.log('[Text Editing] Double-click detected on text element:', fieldId);
                    console.log('[Text Editing] Element:', el);
                    console.log('[Text Editing] Current contentEditable:', el.contentEditable);

                    // ✅ FIX: Save animation before enabling contentEditable
                    const savedAnimation = el.style.animation || '';
                    const savedAnimationPlayState = el.style.animationPlayState || '';

                    // ✅ FIX: Force enable contentEditable (remove condition check)
                    el.contentEditable = 'true';

                    // ✅ FIX: Restore animation after enabling contentEditable
                    if (savedAnimation) {
                        el.style.animation = savedAnimation;
                        el.style.animationPlayState = savedAnimationPlayState || 'running';
                        console.log('[Text Editing] Animation preserved:', savedAnimation);
                    }

                    el.focus();
                    // Select all text for easy replacement
                    try {
                        const range = document.createRange();
                        range.selectNodeContents(el);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                        console.log('[Text Editing] Text selected successfully');
                    } catch (err) {
                        console.warn('[Text Editing] Failed to select text:', err);
                    }
                } else if (e.type === 'dblclick') {
                    console.log('[Text Editing] Double-click detected but element is locked or not dblclick event');
                } else if (e.type === 'click') {
                    console.log('[Text Editing] Single click on text element:', fieldId);
                    // Enable contentEditable and place cursor at click position
                    // ✅ FIX: Save animation before enabling contentEditable
                    const savedAnimation = el.style.animation || '';
                    const savedAnimationPlayState = el.style.animationPlayState || '';
                    el.contentEditable = 'true';
                    // ✅ FIX: Restore animation after enabling contentEditable
                    if (savedAnimation) {
                        el.style.animation = savedAnimation;
                        el.style.animationPlayState = savedAnimationPlayState || 'running';
                        console.log('[Text Editing] Animation preserved:', savedAnimation);
                    }
                    el.focus();
                    // Place cursor at click position
                    if (window.getSelection) {
                        const selection = window.getSelection();
                        if (document.caretPositionFromPoint) {
                            const caretPos = document.caretPositionFromPoint(e.clientX, e.clientY);
                            if (caretPos) {
                                const range = document.createRange();
                                range.setStart(caretPos.offsetNode, caretPos.offset);
                                range.collapse(true);
                                selection.removeAllRanges();
                                selection.addRange(range);
                            } else {
                                // fallback: place at the end
                                const range = document.createRange();
                                range.selectNodeContents(el);
                                range.collapse(false);
                                selection.removeAllRanges();
                                selection.addRange(range);
                            }
                        } else if (document.caretRangeFromPoint) {
                            const range = document.caretRangeFromPoint(e.clientX, e.clientY);
                            if (range) {
                                selection.removeAllRanges();
                                selection.addRange(range);
                            } else {
                                // fallback
                                const range = document.createRange();
                                range.selectNodeContents(el);
                                range.collapse(false);
                                selection.removeAllRanges();
                                selection.addRange(range);
                            }
                        } else {
                            // fallback: place at the end
                            const range = document.createRange();
                            range.selectNodeContents(el);
                            range.collapse(false);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                    }
                }
                if (!blockPanel) postMsg({ type: 'FOCUS_FIELD', id: fieldId, tab: 'info' });
            } else if (imageId) {
                e.preventDefault(); el.classList.add('editing'); showSelectionHandles(el);
                if (e.type === 'dblclick' && !isElementLocked(el)) postMsg({ type: 'ENTER_ROTATE_MODE', id: imageId });
                else { postMsg({ type: 'FOCUS_FIELD', id: imageId, tab: 'images' }); postMsg({ type: 'IMAGE_CLICKED_IN_IFRAME', id: imageId }); }
            } else if (mapId) {
                e.preventDefault(); el.classList.add('editing'); showSelectionHandles(el);
                postMsg({ type: 'FOCUS_FIELD', id: mapId, tab: 'maps' });
            }
        }

        if ((e.type === 'focusout' || e.type === 'blur') && el.isContentEditable) {
            console.log('[Text Editing] Disabling contentEditable for:', fieldId);

            // ✅ FIX: Save animation before disabling contentEditable
            const savedAnimation = el.style.animation || '';
            const savedAnimationPlayState = el.style.animationPlayState || '';

            el.contentEditable = 'false';
            el.classList.remove('editing');

            // ✅ FIX: Restore animation after disabling contentEditable
            if (savedAnimation) {
                el.style.animation = savedAnimation;
                el.style.animationPlayState = savedAnimationPlayState || 'running';
                console.log('[Text Editing] Animation restored after blur:', savedAnimation);
            }

            postMsg({ type: 'HTML_TEXT_CHANGE', id: fieldId, value: el.innerText || '', formattedValue: el.innerHTML || '' });
            postMsg({ type: 'TEXT_CONTENT_CHANGED', id: fieldId, value: el.innerText || '', html: el.innerHTML || '' });

            // ── COMMAND COMMIT ──
            if (el.__beforeState) {
                const afterState = window.editorStateManager?.captureElementState(el);
                if (afterState && afterState.content !== el.__beforeState.content) {
                    postMsg({
                        type: 'COMMIT_COMMAND',
                        command: {
                            type: 'TEXT_CHANGE',
                            elementId: fieldId,
                            before: el.__beforeState,
                            after: afterState
                        }
                    });
                }
                delete el.__beforeState;
            }
        }
    };

    // ── Drag (Pointer Events: mouse + touch + pen — mousedown alone misses touch) ──
    const handleDragPointerDown = (e) => {
        if (e.isPrimary === false) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (isGalleryLightboxControlTarget(e.target)) return;

        // console.log('[Drag] handleDragPointerDown triggered', e.target);

        if (isHandleTarget(e.target)) {
            console.log('[Drag] Blocked: is handle target');
            return;
        }
        if (rotationMenu && !rotationMenu.contains(e.target)) hideRotationMenu();
        if (document.body.getAttribute('data-text-only') === 'true') {
            if (!e.target.closest('[data-editable]')) {
                console.log('[Drag] Blocked: text-only mode');
                e.preventDefault(); e.stopPropagation(); return;
            }
        }

        const stackElement = elementStackManager.cycleNext(e.clientX, e.clientY);
        let el = stackElement || resolveDragTarget(e.target, e.clientX, e.clientY);

        if (!el) {
            console.log('[Drag] No element found');
            if (!isHandleTarget(e.target) && currentSelectedImage !== e.target) {
                clearEditing(); selectionManager.deselect();
            }
            return;
        }

        console.log('[Drag] Element found:', el);

        // If parent drag is enabled on a parent, redirect to parent
        const parentDragEnabled = el.closest('.editor-parent-drag-enabled');
        if (parentDragEnabled && parentDragEnabled !== el) {
            console.log('[Drag] Redirecting to parent with drag enabled:', parentDragEnabled);
            el = parentDragEnabled;
        }

        // ✅ FIX: "Drag phải move container crop"
        // Nếu mục tiêu là IMG nằm trong một DIV wrapper, di chuyển DIV đó để giữ nguyên mask/frame
        // if (el.tagName === 'IMG' && el.parentElement && el.parentElement.tagName === 'DIV') {
        //     const parent = el.parentElement;
        //     const pc = window.getComputedStyle(parent);
        //     // Nếu parent có overflow hidden hoặc border radius, nó chính là Frame/Mask
        //     const isFrame = pc.overflow === 'hidden' || pc.borderRadius !== '0px' || pc.clipPath !== 'none';

        //     if (isFrame) {
        //         console.log('[Drag] Unified block drag: moving parent DIV instead of inner IMG');
        //         el = parent;
        //         el.style.overflow = 'hidden'; // Cưỡng bức clipping
        //         if (pc.position === 'static') el.style.position = 'relative';
        //     }
        // }

        if (e.detail === 2) {
            console.log('[Drag] Blocked: double-click detected');
            return;
        }

        // ── LOCK CHECK: block drag for ALL types (text, image, stock) ──────
        if (isElementLocked(el)) {
            console.log('[Drag] Blocked: element is locked');
            e.preventDefault();
            selectionManager.select(el);
            // Show selection handles so user sees the lock badge
            showSelectionHandles(el);
            return;
        }

        // ── BACKGROUND IMAGE CHECK: prevent dragging background images ──────
        // Cho phép di chuyển background nếu người dùng chủ động tương tác
        const isBackground = el.dataset.imageEditable === 'body-background';
        if (isBackground) {
            console.log('[Drag] Starting background movement');
        }

        // ── SIZE CHECK: prevent dragging elements that are too large ──────
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth || document.documentElement.clientWidth;
        const vh = window.innerHeight || document.documentElement.clientHeight;

        // Calculate element size as percentage of viewport
        const widthPercent = (rect.width / vw) * 100;
        const heightPercent = (rect.height / vh) * 100;

        // For images, use stricter threshold (background-like images)
        const isImage = el.dataset.imageEditable || el.tagName === 'IMG';
        const threshold = (isImage && !isBackground) ? 50 : 95;

        const isTooLarge = widthPercent > threshold && heightPercent > threshold && !el.hasAttribute('data-history');

        if (isTooLarge) {
            console.log('[Drag Block] Element too large to drag:', {
                width: rect.width,
                height: rect.height,
                widthPercent: widthPercent.toFixed(1) + '%',
                heightPercent: heightPercent.toFixed(1) + '%',
                threshold: `both dimensions > ${threshold}%`,
                isImage
            });
            e.preventDefault();
            selectionManager.select(el);
            showSelectionHandles(el);
            return;
        }

        if (!parentDragController.canDrag(el)) {
            console.log('[Drag] Blocked: parentDragController.canDrag returned false');
            e.preventDefault();
            selectionManager.select(el);
            return;
        }

        console.log('[Drag] All checks passed - starting drag');
        selectionManager.select(el);

        // Handle section elevation on drag start
        const section = el.closest('.section');
        if (section) {
            section.dataset.originalZIndex = section.style.zIndex || '';
            section.dataset.originalOverflow = section.style.overflow || '';
            section.style.setProperty('z-index', '2147483647', 'important');
            section.style.setProperty('overflow', 'visible', 'important');
        }

        const inlineTags = ['SPAN', 'EM', 'STRONG', 'B', 'I', 'SMALL', 'A'];
        if (inlineTags.includes(el.tagName) && window.getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
        // ✅ Đảm bảo lấy ID từ chính nó hoặc con trực tiếp (trường hợp ta vừa chuyển el lên parent)
        let eid = el.dataset.editable || el.dataset.editorId || el.dataset.imageEditable || el.dataset.editMap || el.dataset.editMapHref;
        if (!eid) {
            const childWithId = el.querySelector('[data-editable],[data-image-editable],[data-editor-id],[data-edit-map],[data-edit-map-href]');
            if (childWithId) {
                eid = getEditableId(childWithId);
            }
        }

        const savedT = getSavedTransform(eid);
        if (savedT && (!el.dataset?.editorTx || !el.dataset?.editorTy)) {
            const fn = parseTransformFunctions(savedT).find(f => f.name === 'translate');
            if (fn) { const [a, b] = fn.value.split(','); el.dataset.editorTx = String(parseFloat(a) || 0); el.dataset.editorTy = String(parseFloat(b) || 0); }
        }

        const state = getElementTransformState(el);
        // Reuse rect from size check above
        const dh = Math.max(
            document.documentElement?.scrollHeight || 0,
            document.body?.scrollHeight || 0,
            window.innerHeight || 0
        );
        const absTop = rect.top + window.scrollY, absLeft = rect.left + window.scrollX;
        const boostedZ = String(getHighestZIndex(0) + 1);

        // Check if element has actions (allow dragging outside viewport)
        const hasActions = el.getAttribute('data-action-id') || el.onclick || el.getAttribute('onclick') || el.getAttribute('action') || el.tagName === 'A' || !!findActionMatch(el, 'click');

        cancelEdgeScrollRaf();
        dragState = {
            el, id: eid, pointerId: e.pointerId, identitySnapshot: snapshotElementIdentity(el),
            startX: e.clientX, startY: e.clientY,
            clickOffsetX: e.clientX - rect.left, clickOffsetY: e.clientY - rect.top,
            tx: toNum(state.tx), ty: toNum(state.ty),
            minTx: hasActions ? -Infinity : -absLeft + state.tx,
            maxTx: hasActions ? Infinity : vw - (rect.right + window.scrollX) + state.tx,
            minTy: hasActions ? -Infinity : -absTop + state.ty,
            maxTy: hasActions ? Infinity : dh - (rect.bottom + window.scrollY) + state.ty,
            initialTransforms: state.others.slice(),
            scrollStartX: window.scrollX, scrollStartY: window.scrollY,
            originalZIndex: el.style.zIndex, originalPosition: el.style.position, boostedZIndex: boostedZ,
            hoverStartTime: Date.now(), lastX: e.clientX, lastY: e.clientY,
            adjustedZIndex: null,
            edgeScrollTargetVx: 0, edgeScrollTargetVy: 0,
            edgeScrollSmoothedVx: 0, edgeScrollSmoothedVy: 0,
            edgeScrollDelegateYToParent: e.pointerType === 'touch' || e.pointerType === 'pen',
            parentScrollAccumX: 0,
            parentScrollAccumY: 0,
            lastPointerClientX: e.clientX,
            lastPointerClientY: e.clientY,
            lastPointerTypeForEdge: e.pointerType,
        };

        if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
        el.style.zIndex = boostedZ;
        el.style.opacity = '1'; el.style.visibility = 'visible'; el.style.pointerEvents = 'auto';

        setAncestorsOverflow(el);
        if (e.pointerId != null && el.setPointerCapture) try { el.setPointerCapture(e.pointerId); } catch (err) { }
        e.preventDefault();
        postMsg({ type: 'IFRAME_MOUSE_DOWN', clientX: e.clientX, clientY: e.clientY });
    };

    let dragRafId = null; // RAF id cho drag throttle

    const handleDragPointerMove = (e) => {
        if (!dragState || (e.pointerId != null && e.pointerId !== dragState.pointerId)) return;
        if (e.pointerType !== 'mouse') e.preventDefault();
        if (!dragState.hasStartedMoving) {
            const dx = Math.abs(e.clientX - dragState.startX);
            const dy = Math.abs(e.clientY - dragState.startY);
            if (dx > 3 || dy > 3) {
                dragState.hasStartedMoving = true;
                // Capture initial state for command history
                dragState.beforeState = window.editorStateManager?.captureElementState(dragState.el);
            }
        }
        // Luôn cập nhật toạ độ mới nhất (không bỏ qua)
        dragState.lastPointerClientX = e.clientX;
        dragState.lastPointerClientY = e.clientY;
        dragState.lastPointerTypeForEdge = e.pointerType;
        // Throttle DOM update bằng RAF — chỉ apply 1 lần mỗi frame
        if (dragRafId == null) {
            dragRafId = requestAnimationFrame(() => {
                dragRafId = null;
                syncDragPositionFromPointerClient();
                scheduleEdgeScrollApply();
            });
        }
    };

    const handleDragPointerUp = (e) => {
        if (!dragState) return;
        if (e && e.pointerId != null && e.pointerId !== dragState.pointerId) return;
        // Cancel pending RAF để tránh update sau khi đã thả
        if (dragRafId != null) { cancelAnimationFrame(dragRafId); dragRafId = null; }
        cancelEdgeScrollRaf();
        if (dragState.el && dragState.pointerId != null) try { dragState.el.releasePointerCapture(dragState.pointerId); } catch (err) { }
        const finalT = dragState.el.style.transform || '';
        const rotM = finalT.match(/rotate\(([^)]+)deg\)/);
        const rotation = rotM ? parseFloat(rotM[1]) : 0;
        const finalZIndex = dragState.adjustedZIndex !== null
            ? parseInt(dragState.adjustedZIndex, 10)
            : parseInt(dragState.boostedZIndex, 10);
        postMsg({ type: 'HTML_DRAG_CHANGE', id: dragState.id, tx: toNum(dragState.el.dataset.editorTx), ty: toNum(dragState.el.dataset.editorTy), rotation, transform: dragState.el.style.transform || finalT, zIndex: finalZIndex });
        if (dragState.id) saveElementTransform(dragState.id, dragState.el.style.transform || finalT);

        // ── COMMAND COMMIT ──
        if (dragState.hasStartedMoving && dragState.beforeState) {
            const afterState = window.editorStateManager?.captureElementState(dragState.el);
            postMsg({
                type: 'COMMIT_COMMAND',
                command: {
                    type: 'MOVE',
                    elementId: dragState.id,
                    before: dragState.beforeState,
                    after: afterState
                }
            });
        }

        if (dragState.el) {
            dragState.el.style.zIndex = String(finalZIndex);
            if (dragState.originalPosition !== undefined) dragState.el.style.position = dragState.originalPosition;
        }
        const endedEl = dragState.el;

        // Restore section state on drag end
        if (endedEl) {
            const section = endedEl.closest('.section');
            if (section && typeof section.dataset.originalZIndex !== 'undefined') {
                section.style.zIndex = section.dataset.originalZIndex;
                section.style.overflow = section.dataset.originalOverflow;
                delete section.dataset.originalZIndex;
                delete section.dataset.originalOverflow;
            }
        }

        // Don't disable parent drag here - let it continue until timeout or user cancels
        dragState = null;
        if (endedEl && currentSelectedImage === endedEl && selectionHandles) updateHandlesRect(endedEl);
        restoreAncestorsOverflow();
        const cx = e && typeof e.clientX === 'number' ? e.clientX : 0;
        const cy = e && typeof e.clientY === 'number' ? e.clientY : 0;
        postMsg({ type: 'IFRAME_MOUSE_UP', clientX: cx, clientY: cy });
    };

    const handleActionCapture = (e) => {
        if (!e?.target || isEditorOverlayTarget(e.target)) return;
        // Skip elements explicitly marked as non-editable (e.g. chrome system tabs)
        if (e.target?.closest?.('[data-editor-ignore]')) return;
        if (isGalleryLightboxControlTarget(e.target)) return;
        const m = findActionMatch(e.target, e.type);
        if (!m?.action) return;

        // Block all action executions and modal triggers
        e.preventDefault(); e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

        // Check if target element is/contains an image, or is wrapped in an image interaction
        const isImg = e.target.tagName === 'IMG' || e.target.closest('img, [data-image-editable]') || m.element?.querySelector('img, [data-image-editable]');

        if (isImg) {
            // For images: only allow changing image and moving.
            // Do NOT open HtmlActionsPanel, do NOT show modal.
            // Manually call handleInteraction so the editor can select/interact with the image.
            handleInteraction(e);
            return;
        }

        // For links: open HtmlActionsPanel
        const isLink = m.action.type === 'navigation' || m.action.url || m.element?.tagName === 'A';
        if (isLink) {
            // ✅ Solid rounded highlight for action detection
            applyTempHighlight(m.element || e.target, {
                outline: 'none',
                boxShadow: '0 0 0 3px #10b981, 0 0 15px rgba(16,185,129,0.3)',
                borderRadius: '8px',
                zIndex: '1000002'
            }, 1000);
            postMsg({ type: 'ACTION_DETECTED', action: m.action });
            postMsg({ type: 'FOCUS_FIELD', id: null, tab: 'actions' });
            emitActionsSnapshot(false);
        } else {
            // Non-link actions: block but do not open HtmlActionsPanel.
            // Allow selection/dragging by passing to handleInteraction.
            handleInteraction(e);
        }
    };

    // ── Event listeners ───────────────────────────────────────────────────────
    // PREVIEW GUARD: Skip ALL editor interaction listeners when in preview mode.
    // This prevents selection, dragging, text editing, context menu, and drop
    // while keeping the page fully rendered and scrollable.
    if (!window.__isPreviewMode) {
        console.log('[HTML Editor Runtime] Attaching event listeners...');
        document.body.addEventListener('click', handleInteraction);
        document.body.addEventListener('dblclick', handleInteraction);
        document.body.addEventListener('focusout', handleInteraction);
        document.addEventListener('focusin', (e) => {
            const el = e.target;
            if (el && el.isContentEditable) {
                el.__beforeState = window.editorStateManager?.captureElementState(el);
            }
        });
        document.body.addEventListener('pointerdown', handleDragPointerDown);
        document.addEventListener('click', handleActionCapture, true);
        document.addEventListener('change', handleActionCapture, true);
        document.addEventListener('input', handleActionCapture, true);
        document.addEventListener('submit', handleActionCapture, true);
        document.body.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('click', (e) => {
            const musicToggle = e.target?.closest?.('#musicToggle, #music-toggle, .music-btn');
            if (!musicToggle) return;
            // Music playback in editor must be controlled by MusicTimeline only.
            e.preventDefault();
            e.stopPropagation();
            const bgMusic = document.getElementById('bgMusic') || document.getElementById('background-music');
            if (bgMusic) bgMusic.pause();
            musicToggle.classList.remove('playing');
            document.querySelector('.music-icon')?.classList.remove('is-playing');
        }, true);
        document.addEventListener('pointermove', handleDragPointerMove, { passive: false });
        document.addEventListener('pointerup', handleDragPointerUp);
        document.addEventListener('pointercancel', handleDragPointerUp);

        // ── FIX: Ctrl+A Selection Scoping ────────────────────────────────────────
        document.addEventListener('keydown', (e) => {
            // Check if Ctrl+A or Cmd+A is pressed
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                const activeEl = document.activeElement;
                // Only scope if we're in a contentEditable element
                if (activeEl && activeEl.contentEditable === 'true') {
                    console.log('[Ctrl+A Scoping] Scoping selection to element:', activeEl);
                    e.preventDefault();
                    try {
                        // Select all content within the current element only
                        const range = document.createRange();
                        range.selectNodeContents(activeEl);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } catch (err) {
                        console.warn('[Ctrl+A Scoping] Failed to scope selection:', err);
                    }
                }
            }
        });

        console.log('[HTML Editor Runtime] Event listeners attached successfully');

        window.addEventListener('scroll', () => { if (currentSelectedImage && selectionHandles) showSelectionHandles(currentSelectedImage); });
        window.addEventListener('resize', () => { if (currentSelectedImage && selectionHandles) showSelectionHandles(currentSelectedImage); });

        document.addEventListener('dragover', (e) => {
            if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('application/x-hiweb-image')) e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            const raw = e.dataTransfer ? (e.dataTransfer.getData('application/x-hiweb-image') || e.dataTransfer.getData('text/plain') || '') : '';
            if (!raw) return;
            let url = raw, rotation = 0, scale = 1;
            try { const p = JSON.parse(raw); if (p?.url) { url = p.url; rotation = p.rotation || 0; scale = p.scale || 1; } } catch { }
            if (!url) return;
            const t = e.target.closest('[data-image-editable],img[data-editable],img[data-image-editable]');
            if (!t) return;
            e.preventDefault();
            const id = t.getAttribute('data-image-editable') || t.getAttribute('data-editable') || '';
            if (!id) return;
            // Guard: don't allow drop onto locked elements
            if (isElementLocked(t)) return;
            if (t.tagName === 'IMG') {
                t.setAttribute('src', url);
                if (rotation > 0 || scale !== 1) {
                    const nt = (t.style.transform || '').replace(/rotate\([^)]*\)/g, '').replace(/scale\([^)]*\)/g, '').trim();
                    const parts = [];
                    if (rotation > 0) parts.push('rotate(' + rotation + 'deg)');
                    if (scale !== 1) parts.push('scale(' + scale + ')');
                    t.style.transform = (nt + ' ' + parts.join(' ')).trim();
                }
            } else {
                t.style.backgroundImage = "url('" + url + "')"; t.style.backgroundSize = 'cover'; t.style.backgroundPosition = 'center';
                if (rotation > 0) { const nt = (t.style.transform || '').replace(/rotate\([^)]*\)/g, '').trim(); t.style.transform = (nt + ' rotate(' + rotation + 'deg)').trim(); }
            }
            postMsg({ type: 'HTML_IMAGE_DROPPED', id, value: url, rotation });
        });

    } // end if (!window.__isPreviewMode) — PREVIEW GUARD

    // ── Fall effect manager ───────────────────────────────────────────────────
    let fallManagerLoading = false;
    let fallManagerQueue = [];

    const flushFallQueue = (ready) => { const q = fallManagerQueue.splice(0); q.forEach(cb => { try { cb(!!ready); } catch { } }); };

    const ensureFallManager = (onReady) => {
        const ready = window.fallEffectManager?.init && window.fallEffectManager.__supportsCustomIcons && window.fallEffectManager.__supportsSnowIcon;
        if (ready) { onReady(true); return; }
        if (window.fallEffectManager) { try { window.fallEffectManager.cleanup?.(); } catch { } window.fallEffectManager = undefined; }
        fallManagerQueue.push(onReady);
        if (fallManagerLoading) return;
        fallManagerLoading = true;
        const candidates = ['/assets/js/fall-effect-manager.js', '/public/assets/js/fall-effect-manager.js'];
        let idx = 0;
        const tryLoad = () => {
            if (idx >= candidates.length) { fallManagerLoading = false; flushFallQueue(false); return; }
            const s = document.createElement('script');
            s.src = candidates[idx++] + '?v=' + Date.now();
            s.async = true;
            s.setAttribute('data-fall-manager-loader', 'true');
            s.onload = () => { fallManagerLoading = false; flushFallQueue(!!(window.fallEffectManager?.init && window.fallEffectManager.__supportsCustomIcons)); };
            s.onerror = () => { s.remove(); tryLoad(); };
            document.head.appendChild(s);
        };
        tryLoad();
    };

    // ── Apply transform from style helper ────────────────────────────────────
    const applyTransformFromStyle = (el, styleData, id) => {
        if (styleData.transform === undefined && styleData.rotation === undefined) return;
        const cur = el.style.transform || '';
        if (styleData.transform?.includes('translate')) { el.style.transform = styleData.transform; }
        else {
            const fns = parseTransformFunctions(cur).filter(f => f.name !== 'rotate').map(f => f.name + '(' + f.value + ')');
            let newRot = '';
            if (styleData.rotation !== undefined) newRot = styleData.rotation;
            else { const m = styleData.transform?.match(/rotate\(([^)]+)deg\)/); if (m) newRot = m[1]; }
            if (newRot !== '') fns.push('rotate(' + newRot + 'deg)');
            el.style.transform = fns.join(' ');
        }
        const ft = el.style.transform;
        if (ft) saveElementTransform(id, ft);
    };

    // ── Helper: Strip autoplay from audio/video elements ─────────────────────
    const stripAudioAutoplay = (htmlString) => {
        if (!htmlString || typeof htmlString !== 'string') return htmlString;
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');

            // Find all audio and video elements
            const mediaElements = doc.querySelectorAll('audio, video');
            mediaElements.forEach(el => {
                el.removeAttribute('autoplay');
                el.autoplay = false;
            });

            return doc.body.innerHTML;
        } catch (err) {
            console.warn('[Autoplay Stripping] Failed to parse HTML:', err);
            // Fallback: simple regex replacement
            return htmlString
                .replace(/<audio([^>]*)\s+autoplay([^>]*)>/gi, '<audio$1$2>')
                .replace(/<video([^>]*)\s+autoplay([^>]*)>/gi, '<video$1$2>');
        }
    };

    // ── postMessage listener ──────────────────────────────────────────────────
    window.addEventListener('message', (e) => {
        const data = e.data || {};
        if (!data.__html_editor) return;
        if (window.__isPreviewMode) return;

        if (data.type === 'PARENT_SCROLL_DELTA') {
            const d = Number(data.dy);
            if (dragState && Number.isFinite(d) && d !== 0) {
                dragState.parentScrollAccumY = (dragState.parentScrollAccumY || 0) + d;
                syncDragPositionFromPointerClient();
                scheduleEdgeScrollApply();
            }
            return;
        }

        if (data.type === 'UPDATE_SCOPE') {
            if (data.scope && data.scope.key) {
                window.__htmlEditorScope = data.scope;
                console.log('[Scope] updated to', data.scope.key);
                if (window.editorStateManager) {
                    try {
                        const state = window.editorStateManager.loadFromLocalStorage(data.scope);
                        if (state) {
                            window.editorStateManager.applyState(state);
                            console.log('[Scope] loaded saved state for scope:', data.scope.key);
                        }
                    } catch (e) {
                        console.warn('[Scope] failed to load state for new scope:', e);
                    }
                }
            }
            return;
        }

        if (data.type === 'HTML_CTX_ACTION') {
            const { action: ctxAction, id: ctxId } = data;
            if (ctxAction === 'commit_layer_stack') {
                console.log('[HTML_CTX_ACTION] commit_layer_stack');
                if (window.editorStateManager) {
                    try {
                        window.editorStateManager.saveState();
                    } catch (err) {
                        console.warn('[commit_layer_stack] saveState failed:', err);
                    }
                }
                postMsg({ type: 'LAYER_STACK_COMMITTED' });
                return;
            }
            if (ctxAction === 'delete' && ctxId) {
                showConfirmModal({
                    title: 'Xóa phần tử', message: 'Bạn có chắc muốn xóa phần tử này?', confirmText: 'Xóa', cancelText: 'Hủy',
                    onConfirm: () => { const dom = findEditableById(ctxId); if (dom?.parentNode) dom.parentNode.removeChild(dom); postMsg({ type: 'DELETE_ELEMENT', id: ctxId }); }
                });
            } else if (ctxAction === 'link' && ctxId) {
                const dom = findEditableById(ctxId);
                postMsg({ type: 'CONTEXT_LINK_PROMPT', id: ctxId, currentLink: dom ? (dom.getAttribute('data-link') || '') : '' });
            } else if (ctxAction === 'move_layer' && ctxId && data.dir) {
                const dom = findEditableById(ctxId);
                if (!dom) return;
                applyMoveLayerDirection(dom, data.dir);
            } else if (ctxAction === 'apply_text_layer_order' && Array.isArray(data.orderedIds)) {
                applyTextLayerOrder(data.orderedIds);
            } else if (ctxAction === 'layer_panel_hover') {
                setLayerPanelHoverFromHost(data.id);
            } else if (ctxAction === 'layer_panel_select') {
                selectElementFromLayerPanel(data.id);
            } else if (ctxAction === 'action_panel_select' && data.action) {
                selectElementFromActionPanel(data.action);
            } else if (ctxAction === 'set_layer' && ctxId && data.zIndex !== undefined) {
                const dom = findEditableById(ctxId);
                if (!dom) {
                    console.warn('[Set Layer] Element not found for id:', ctxId);
                    return;
                }
                ensurePositionForStacking(dom);
                const newZIndex = parseInt(data.zIndex, 10) || 0;
                // Set z-index in inline style so it persists in HTML
                dom.style.setProperty('z-index', String(newZIndex), 'important');
                // Also set as data attribute for backup
                dom.setAttribute('data-z-index', String(newZIndex));
                console.log('[Set Layer] Applied z-index', newZIndex, 'to element:', ctxId, '(element:', dom, ')');
                postMsg({ type: 'CONTEXT_MOVE_LAYER', id: ctxId, zIndex: newZIndex });
                // Save to localStorage after z-index change
                saveZIndexToLocalStorage();
            } else if (ctxAction === 'toggle_lock' && ctxId) {
                // ── toggle_lock: works for ALL element types (text, image, stock) ──
                // Find the element using all editable selectors including img
                const dom = findEditableById(ctxId) ||
                    document.querySelector('img[data-image-editable="' + ctxId + '"]') ||
                    document.querySelector('[data-edit-map="' + ctxId + '"],[data-edit-map-href="' + ctxId + '"]');
                if (!dom) return;
                const isNowLocked = !data.isLocked;
                applyLockState(dom, isNowLocked);
                // Refresh selection handles so lock badge appears/disappears
                if (currentSelectedImage === dom) showSelectionHandles(dom);
                postMsg({ type: 'CONTEXT_TOGGLE_LOCK', id: ctxId, locked: isNowLocked });
            } else if (ctxAction === 'select_layer_below' && ctxId) {
                handleSelectLayerBelow(ctxId, data.clientX, data.clientY);
            } else if (ctxAction === 'enable_parent_drag' && ctxId) {
                handleEnableParentDrag(ctxId);
            } else if (ctxAction === 'disable_parent_drag' && ctxId) {
                handleDisableParentDrag(ctxId);
            } else if (ctxAction === 'get_image_src' && ctxId) {
                handleGetImageSrc(ctxId);
            } else if (ctxAction === 'copy_style' && ctxId) {
                const dom = findEditableById(ctxId);
                if (dom) {
                    ensureOriginalStyles(ctxId, dom);
                    const styles = {};
                    const computedStyle = window.getComputedStyle(dom);
                    STYLE_ONLY_PROPS.forEach((prop) => {
                        const value = computedStyle.getPropertyValue(prop);
                        if (value && value !== 'none' && value !== '') {
                            styles[prop] = value;
                        }
                    });
                    if (dom.style.fontFamily) {
                        styles.fontFamily = dom.style.fontFamily;
                    }
                    parent.postMessage({ __html_editor: true, type: 'STYLE_COPIED', styles }, '*');
                }
            } else if (ctxAction === 'paste_style' && ctxId && data.styles) {
                const dom = findEditableById(ctxId);
                if (dom) {
                    ensureOriginalStyles(ctxId, dom);
                    const beforeState = window.editorStateManager?.captureElementState(dom);
                    const styles = {};
                    Object.keys(data.styles).forEach((prop) => {
                        if (STYLE_ONLY_PROPS.includes(prop)) {
                            styles[prop] = data.styles[prop];
                        }
                    });
                    Object.keys(styles).forEach((prop) => {
                        try {
                            dom.style[prop] = styles[prop];
                        } catch (err) {
                            console.warn(`[HtmlEditor] Failed to apply style ${prop}:`, err);
                        }
                    });
                    postMsg({ type: 'HTML_STYLE_UPDATED', id: ctxId, style: styles });

                    const afterState = window.editorStateManager?.captureElementState(dom);
                    postMsg({
                        type: 'COMMIT_COMMAND',
                        command: {
                            type: 'PASTE_STYLE',
                            elementId: ctxId,
                            before: beforeState,
                            after: afterState
                        }
                    });
                }
            } else if (ctxAction === 'reset_style' && ctxId) {
                const dom = findEditableById(ctxId);
                if (dom) {
                    const beforeState = window.editorStateManager?.captureElementState(dom);
                    restoreOriginalStyles(ctxId, dom);
                    const afterState = window.editorStateManager?.captureElementState(dom);
                    postMsg({
                        type: 'COMMIT_COMMAND',
                        command: {
                            type: 'RESET_STYLE',
                            elementId: ctxId,
                            before: beforeState,
                            after: afterState
                        }
                    });
                    if (currentSelectedImage === dom) updateHandlesRect(dom);
                }
            } else if (ctxAction === 'reset_position' && ctxId) {
                const dom = findEditableById(ctxId);
                if (dom) {
                    const beforeState = window.editorStateManager?.captureElementState(dom);
                    dom.style.transform = '';
                    dom.style.left = '';
                    dom.style.top = '';
                    dom.style.right = '';
                    dom.style.bottom = '';
                    dom.style.position = '';
                    dom.dataset.editorTx = '0';
                    dom.dataset.editorTy = '0';
                    saveElementTransform(ctxId, '');
                    const afterState = window.editorStateManager?.captureElementState(dom);
                    postMsg({
                        type: 'COMMIT_COMMAND',
                        command: {
                            type: 'RESET_POSITION',
                            elementId: ctxId,
                            before: beforeState,
                            after: afterState
                        }
                    });
                    if (currentSelectedImage === dom) updateHandlesRect(dom);
                }
            }
            return;
        }

        if (data.type === 'ACTION_PANEL_SELECT' && data.action) {
            selectElementFromActionPanel(data.action);
            return;
        }

        if (data.type === 'CONFIRM_RESPONSE' && data.requestId) {
            const p = pendingConfirms[data.requestId];
            if (p) { delete pendingConfirms[data.requestId]; data.confirmed ? p.onConfirm() : p.onCancel(); }
            return;
        }

        if (data.type === 'SET_INTERACTION_MODE') {
            interactionMode = data.mode === 'hand' ? 'hand' : 'pointer';
            document.body.style.cursor = interactionMode === 'hand' ? 'grab' : 'default';
            if (interactionMode !== 'hand') {
                if (dragState && dragState.id) parentDragController.disallowParentDrag(dragState.id);
                dragState = null;
            }
            clearEditing(); return;
        }

        if (data.type === 'ENABLE_PARENT_DRAGGING' && data.id) { allowParentDragging[data.id] = true; return; }
        if (data.type === 'DISABLE_PARENT_DRAGGING' && data.id) { allowParentDragging[data.id] = false; return; }

        if (data.type === 'SET_HTML_TEXT' && data.id) {
            // ── FIX: Strip autoplay before setting HTML ──
            const cleanedValue = stripAudioAutoplay(String(data.value || ''));
            queryEditableAll(data.id).forEach(el => { el.innerHTML = cleanedValue; });
        }

        // ── FIX: Handle save request using EditorStateManager ──────────
        if (data.type === 'SAVE_REQUEST') {
            let success = false;
            try {
                const scope = data.scope || { key: 'default' };
                if (scope.key) {
                    window.__htmlEditorScope = scope;
                }

                // First, transfer sessionStorage transforms to localStorage
                const sessionTransforms = readTransformsFromSession(STORAGE_KEY);
                if (Object.keys(sessionTransforms).length > 0) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionTransforms));
                    console.log('[Save] Transferred transforms from session to localStorage:', Object.keys(sessionTransforms).length, 'elements');
                }

                // Save text content, background, z-index (legacy support)
                const legacySuccess = saveTextContentToStorage(true) && saveBackgroundToLocalStorage() && saveZIndexToLocalStorage();

                // Use EditorStateManager if available (new method)
                if (window.editorStateManager) {
                    success = window.editorStateManager.saveToLocalStorage(scope);
                    console.log('[Save] EditorStateManager saved state to localStorage');
                } else {
                    success = legacySuccess;
                    console.log('[Save] Used legacy save method');
                }
            } catch (e) {
                console.error('[Save] Failed to save:', e);
                success = false;
            }
            postMsg({ type: 'SAVE_COMPLETE', success });
            return;
        }

        // ── Handle load state request ──────────────────────────────────────
        if (data.type === 'LOAD_STATE_REQUEST') {
            let success = false;
            let reason = '';
            try {
                if (window.editorStateManager) {
                    const scope = data.scope || { key: 'default' };
                    const state = window.editorStateManager.loadFromLocalStorage(scope);
                    if (state) {
                        window.editorStateManager.applyState(state);
                        success = true;
                        console.log('[Load] EditorStateManager loaded and applied state');
                    } else {
                        reason = 'No saved state found';
                        console.log('[Load] No saved state found in localStorage');
                    }
                } else {
                    reason = 'EditorStateManager not available';
                    console.warn('[Load] EditorStateManager not available');
                }
            } catch (e) {
                console.error('[Load] Failed to load state:', e);
                reason = e.message;
                success = false;
            }
            postMsg({ type: 'LOAD_STATE_COMPLETE', success, reason });
            return;
        }

        // ── Handle undo request ────────────────────────────────────────────
        if (data.type === 'UNDO_REQUEST') {
            let success = false;
            let stackInfo = null;
            try {
                if (window.editorStateManager) {
                    success = window.editorStateManager.undo();
                    stackInfo = window.editorStateManager.getStackInfo();
                    console.log('[Undo] Success:', success, 'Stack:', stackInfo);
                } else {
                    console.warn('[Undo] EditorStateManager not available');
                }
            } catch (e) {
                console.error('[Undo] Failed:', e);
            }
            postMsg({ type: 'UNDO_COMPLETE', success, stackInfo });
            return;
        }

        // ── Handle redo request ────────────────────────────────────────────
        if (data.type === 'REDO_REQUEST') {
            let success = false;
            let stackInfo = null;
            try {
                if (window.editorStateManager) {
                    success = window.editorStateManager.redo();
                    stackInfo = window.editorStateManager.getStackInfo();
                    console.log('[Redo] Success:', success, 'Stack:', stackInfo);
                } else {
                    console.warn('[Redo] EditorStateManager not available');
                }
            } catch (e) {
                console.error('[Redo] Failed:', e);
            }
            postMsg({ type: 'REDO_COMPLETE', success, stackInfo });
            return;
        }

        if (data.type === 'APPLY_IMAGE_CROP' && data.targetId && data.cropData) {
            handleApplyImageCrop(data.targetId, data.cropData); return;
        }

        if (data.type === 'ADD_EDITABLE_FIELD' && data.id) {
            const beforeState = window.editorStateManager?.captureCurrentState();
            const span = document.createElement('span');
            span.setAttribute('data-editable', data.id);
            span.setAttribute('data-editor-id', data.id); // Also set editor-id for better tracking
            span.textContent = data.value || '';
            span.style.cssText = 'cursor:text;outline:1px dashed transparent;transition:outline 0.2s,background 0.2s;display:inline-block;padding:4px 8px;border-radius:4px;';
            const ctx = findBestInsertionContext({ width: 180, height: 42 });
            const anchor = (ctx && (ctx.target || ctx.parent)) || document.body;
            const ts = resolveInheritedTextStyles(anchor);
            const iz = resolveInheritedZIndex(anchor);
            const highZ = String(Math.max(getHighestZIndex(0) + 1, parseInt(iz || '0', 10) || 0, 999999));
            span.setAttribute('data-z-index', highZ); // Crucial for preview extraction
            const fs = data.style?.fontSize || '18px', lh = data.style?.lineHeight || '1.2';
            const tsKeys = ['fontFamily', 'fontWeight', 'fontStyle', 'color', 'textAlign', 'textDecoration', 'letterSpacing', 'wordSpacing', 'textTransform', 'fontVariant', 'whiteSpace', 'wordBreak', 'overflowWrap'];
            tsKeys.forEach(k => { if (ts[k]) span.style[k] = ts[k]; });
            if (ts.textShadow && ts.textShadow !== 'none') span.style.textShadow = ts.textShadow;
            span.style.fontSize = fs; span.style.lineHeight = lh;
            // Apply explicit styles from data.style to override inherited
            if (data.style?.color) span.style.color = data.style.color;
            if (data.style?.fontFamily) span.style.fontFamily = data.style.fontFamily;
            if (data.style?.fontWeight) span.style.fontWeight = data.style.fontWeight;
            if (data.style?.fontStyle) span.style.fontStyle = data.style.fontStyle;
            if (data.style?.textDecoration) span.style.textDecoration = data.style.textDecoration;
            if (data.style?.letterSpacing) span.style.letterSpacing = data.style.letterSpacing;
            const hasCp = data.centerPosition && typeof data.centerPosition.left === 'number';
            let parent = ctx?.parent || document.body, before = null;
            if (hasCp) {
                parent = document.body; // Force body for viewport-absolute placement
                before = null;
                span.style.position = 'absolute';
                span.style.left = Math.max(0, data.centerPosition.left) + 'px';
                span.style.top = Math.max(0, data.centerPosition.top) + 'px';
                span.style.zIndex = highZ;
            } else if (ctx?.target) {
                const target = ctx.target;
                const isText = ['P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'A'].includes(target.tagName);
                if (isText) {
                    // Use absolute positioning to overlap text instead of flowing
                    span.style.position = 'absolute'; span.style.left = Math.max(0, ctx.left) + 'px'; span.style.top = Math.max(0, ctx.top) + 'px'; span.style.zIndex = highZ;
                    parent = target.parentNode || parent; before = target.nextSibling;
                } else {
                    span.style.position = 'absolute'; span.style.left = Math.max(0, ctx.left) + 'px'; span.style.top = Math.max(0, ctx.top) + 'px'; span.style.zIndex = highZ;
                }
            } else if (ctx?.parent) {
                span.style.position = 'absolute'; span.style.left = Math.max(0, ctx.left) + 'px'; span.style.top = Math.max(0, ctx.top) + 'px'; span.style.zIndex = highZ;
            }
            if (!hasCp && !ctx?.parent && data.afterElementId) {
                const ae = document.querySelector('[data-editable="' + data.afterElementId + '"],[data-editor-id="' + data.afterElementId + '"],[data-image-editable="' + data.afterElementId + '"]');
                if (ae?.parentNode) { parent = ae.parentNode; before = ae.nextSibling; }
            }
            before ? parent.insertBefore(span, before) : parent.appendChild(span);
            saveTextContentToStorage(false); // Lưu văn bản mới thêm vào session

            const afterState = window.editorStateManager?.captureCurrentState();
            postMsg({
                type: 'COMMIT_COMMAND',
                command: {
                    type: 'ADD',
                    elementId: data.id,
                    before: beforeState,
                    after: afterState
                }
            });
            setTimeout(() => {
                postMsg({ type: 'HTML_STYLE_UPDATED', id: data.id, style: { fontFamily: span.style.fontFamily, fontSize: span.style.fontSize, fontWeight: span.style.fontWeight, fontStyle: span.style.fontStyle, lineHeight: span.style.lineHeight, color: span.style.color, textAlign: span.style.textAlign, textDecoration: span.style.textDecoration, letterSpacing: span.style.letterSpacing, wordSpacing: span.style.wordSpacing, textTransform: span.style.textTransform, fontVariant: span.style.fontVariant, textShadow: span.style.textShadow, whiteSpace: span.style.whiteSpace, wordBreak: span.style.wordBreak, overflowWrap: span.style.overflowWrap, zIndex: span.style.zIndex } });
                span.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            }, 50);
        }

        if (data.type === 'ADD_EDITABLE_IMAGE' && data.id) {
            const beforeState = window.editorStateManager?.captureCurrentState();
            const img = document.createElement('img');
            img.setAttribute('data-image-editable', data.id);
            img.setAttribute('src', data.value || ''); img.setAttribute('alt', data.id);
            const sc = typeof data.scale === 'number' && data.scale > 0 ? data.scale : 1;
            const rot = typeof data.rotation === 'number' ? data.rotation : 0;
            const ctx = findBestInsertionContext({ width: 100, height: 100 });
            const hz = String(Math.max(getHighestZIndex(0) + 1, 999999));
            img.style.cssText = 'cursor:move;outline:1px dashed transparent;transition:outline 0.2s,background 0.2s;width:' + (data.width || '100px') + ';height:' + (data.height || '100px') + ';object-fit:contain;border-radius:4px;transform:rotate(' + rot + 'deg) scale(' + sc + ');z-index:' + hz + ';pointer-events:auto;';
            let parent = ctx?.parent || document.body, before = null, isAutoLayout = false;
            if (data.isStock) {
                Object.assign(img.style, { position: 'absolute', pointerEvents: 'auto', left: '50px', top: '50px', display: 'block' });
                parent = document.body; before = null;
            }
            if (!isAutoLayout && !data.isStock) {
                if (ctx?.parent) {
                    const off = (document.querySelectorAll('[data-image-editable]').length % 5) * 20;
                    Object.assign(img.style, { position: 'absolute', left: Math.max(0, ctx.left + off) + 'px', top: Math.max(0, ctx.top + off) + 'px', display: 'block' });
                    img.dataset.editorTx = img.dataset.editorTy = '0';
                } else { img.style.display = 'inline-block'; img.style.margin = '4px'; }
            }
            if (!ctx?.parent && data.afterElementId) {
                const ae = document.querySelector('[data-editable="' + data.afterElementId + '"],[data-editor-id="' + data.afterElementId + '"],[data-image-editable="' + data.afterElementId + '"]');
                if (ae) { parent = ae.parentNode || document.body; before = ae.nextSibling; }
            }
            if (!ctx?.parent && !before && !data.isStock) {
                const fe = document.querySelector('[data-editable],[data-editor-id],[data-image-editable]');
                if (fe?.parentNode) { parent = fe.parentNode; before = fe.nextSibling; }
            }
            before ? parent.insertBefore(img, before) : parent.appendChild(img);

            const afterState = window.editorStateManager?.captureCurrentState();
            postMsg({
                type: 'COMMIT_COMMAND',
                command: {
                    type: 'ADD_IMAGE',
                    elementId: data.id,
                    before: beforeState,
                    after: afterState
                }
            });

            // ✅ FIX: Ensure newly added image is draggable
            // Force pointer-events and cursor after insertion
            setTimeout(() => {
                if (img && document.body.contains(img)) {
                    img.style.pointerEvents = 'auto';
                    img.style.cursor = 'move';
                    console.log('[ADD_EDITABLE_IMAGE] Ensured drag handlers for new image:', data.id);
                }
            }, 50);
        }

        if (data.type === 'SET_HTML_IMAGE' && data.id) {
            queryEditableAll(data.id).forEach(el => {
                if (isElementLocked(el)) return; // Guard: skip locked images
                if (el.tagName === 'IMG') el.setAttribute('src', data.value || '');
                else { el.style.backgroundImage = "url('" + (data.value || '') + "')"; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; }
            });
        }

        if (data.type === 'SET_HTML_IMAGE_STYLE' && data.id) {
            queryEditableAll(data.id).forEach(el => {
                // FIX: Đảm bảo Container luôn có các thuộc tính bắt buộc để clip nội dung
                // if (el.tagName !== 'IMG') {
                //     el.style.overflow = 'hidden';
                //     if (window.getComputedStyle(el).position === 'static') {
                //         el.style.position = 'relative';
                //     }
                // }

                const s = data.style;
                if (s.borderRadius !== undefined) el.style.borderRadius = s.borderRadius;
                if (s.filter !== undefined) el.style.filter = s.filter;
                if (s.opacity !== undefined) el.style.opacity = s.opacity;
                if (s.clipPath !== undefined) el.style.clipPath = s.clipPath;
                if (s.boxShadow !== undefined) el.style.boxShadow = s.boxShadow;
                applyDimensionValue(el.style, 'width', s.width);
                applyDimensionValue(el.style, 'height', s.height);
                if (s.crop !== undefined) {
                    if (s.crop) {
                        const { x = 0, y = 0, width: w = 1, height: h = 1, shape } = s.crop;
                        const t2 = y * 100, r2 = (1 - x - w) * 100, b2 = (1 - y - h) * 100, l2 = x * 100;
                        const cx = (x + w / 2) * 100, cy = (y + h / 2) * 100;
                        const sc2 = Math.max(1 / w, 1 / h);
                        const shapeStr = shape && String(shape) !== '0' ? String(shape) : null;
                        const isMask = shapeStr && shapeStr.startsWith('/');
                        const clip = 'inset(' + t2.toFixed(2) + '% ' + r2.toFixed(2) + '% ' + b2.toFixed(2) + '% ' + l2.toFixed(2) + '%' + (shapeStr && !isMask ? ' round ' + shapeStr : '') + ')';
                        const target2 = el.tagName !== 'IMG' ? el.querySelector('img') : null;
                        const img2 = el.tagName === 'IMG' ? el : target2;
                        if (img2) {
                            const imgStyles = { objectFit: 'cover', objectPosition: cx.toFixed(2) + '% ' + cy.toFixed(2) + '%', transformOrigin: 'center center', scale: String(+sc2.toFixed(4)) };
                            if (isMask) {
                                Object.assign(imgStyles, {
                                    maskImage: `url("${shapeStr}")`,
                                    maskSize: '100% 100%',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskImage: `url("${shapeStr}")`,
                                    WebkitMaskSize: '100% 100%',
                                    WebkitMaskRepeat: 'no-repeat',
                                    clipPath: clip
                                });
                            } else {
                                imgStyles.clipPath = clip;
                            }
                            Object.assign(img2.style, imgStyles);
                        } else {
                            const elStyles = { backgroundPosition: cx.toFixed(2) + '% ' + cy.toFixed(2) + '%', backgroundSize: (sc2 * 100).toFixed(2) + '%' };
                            if (isMask) {
                                Object.assign(elStyles, {
                                    maskImage: `url("${shapeStr}")`,
                                    maskSize: '100% 100%',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskImage: `url("${shapeStr}")`,
                                    WebkitMaskSize: '100% 100%',
                                    WebkitMaskRepeat: 'no-repeat',
                                    clipPath: clip
                                });
                            } else {
                                elStyles.clipPath = clip;
                            }
                            Object.assign(el.style, elStyles);
                        }
                    } else {
                        el.style.clipPath = '';
                        el.style.maskImage = '';
                        el.style.WebkitMaskImage = '';
                        el.style.maskSize = '';
                        el.style.WebkitMaskSize = '';
                        el.style.maskRepeat = '';
                        el.style.WebkitMaskRepeat = '';
                        const t2 = el.tagName !== 'IMG' ? (el.querySelector('img') || el) : el;
                        Object.assign(t2.style, { clipPath: '', objectFit: '', objectPosition: '', scale: '', maskImage: '', WebkitMaskImage: '', maskSize: '', WebkitMaskSize: '', maskRepeat: '', WebkitMaskRepeat: '' });
                        el.style.backgroundPosition = el.style.backgroundSize = '';
                    }
                }
                applyTransformFromStyle(el, s, data.id);
                // ✅ Update snapshot if the modified element is currently selected
                if (currentSelectedImage === el) {
                    el.__editorIdentitySnapshot = snapshotElementIdentity(el);
                }

                // ✅ FIX: Ensure element remains draggable after style changes
                // Force pointer-events and cursor to ensure drag still works
                if (!isElementLocked(el)) {
                    el.style.pointerEvents = 'auto';
                    el.style.cursor = 'move';
                }
            });
        }

        if (data.type === 'SET_HTML_STYLE' && data.id) {
            queryEditableAll(data.id).forEach(el => {
                const s = data.style;
                // ✅ Added backgroundColor and background to the list of supported properties
                ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'color', 'backgroundColor', 'background', 'letterSpacing', 'wordSpacing', 'textAlign', 'textDecoration', 'textShadow', 'lineHeight', 'borderWidth', 'borderColor', 'borderRadius', 'borderStyle'].forEach(p => { if (s[p]) el.style[p] = s[p]; });
                if (s.href && el.tagName === 'A') el.href = s.href;
                const hasAnimationField = Object.prototype.hasOwnProperty.call(s, 'animation');
                const shouldClearAnimation =
                    s.animationType === 'none' ||
                    (hasAnimationField && (s.animation === '' || s.animation === 'none' || s.animation == null));

                if (shouldClearAnimation) {
                    ['animation', 'animationName', 'animationDuration', 'animationDelay', 'animationIterationCount'].forEach(p => { el.style[p] = ''; });
                    const tx = toNum(el.dataset.editorTx), ty = toNum(el.dataset.editorTy);
                    el.style.setProperty('--el-tx', tx + 'px'); el.style.setProperty('--el-ty', ty + 'px');
                    const stored = getSavedTransform(data.id) || el.style.transform || '';
                    if (stored && stored !== 'none') el.style.transform = stored;
                    else if (tx || ty) el.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
                } else {
                    const tx = toNum(el.dataset.editorTx), ty = toNum(el.dataset.editorTy);
                    el.style.setProperty('--el-tx', tx + 'px'); el.style.setProperty('--el-ty', ty + 'px');
                    if (hasAnimationField && s.animation) { el.style.animation = 'none'; void el.offsetHeight; el.style.animation = s.animation; }
                }
                applyTransformFromStyle(el, s, data.id);
                // ✅ Update snapshot if the modified element is currently selected
                if (currentSelectedImage === el) {
                    el.__editorIdentitySnapshot = snapshotElementIdentity(el);
                }
            });
            postMsg({ type: 'HTML_STYLE_UPDATED', id: data.id, style: data.style });
        }

        if (data.type === 'APPLY_GLOBAL_EFFECT') applyGlobalEffect(data.effectId);
        if (data.type === 'APPLY_EFFECT_TO_HTML_ELEMENT') applyEffectToElement(data.effectId, data.id);

        if (data.type === 'APPLY_FALL_EFFECT') {
            const { effectId = 'none' } = data;
            const icons = (Array.isArray(data.customIcons) ? data.customIcons : []).map(s => String(s || '').trim()).filter(Boolean).slice(0, 3);
            const icon = typeof data.customIcon === 'string' ? data.customIcon.trim() : (icons[0] || '');
            const allIcons = icons.length ? icons : (icon ? [icon] : []);
            if (effectId === 'none') {
                window.fallEffectManager?.init?.('none');
                ['data-fall-effect', 'data-fall-custom-icon', 'data-fall-custom-icons'].forEach(a => document.body?.removeAttribute(a));
                return;
            }
            document.body?.setAttribute('data-fall-effect', effectId);
            if (icon) document.body?.setAttribute('data-fall-custom-icon', icon); else document.body?.removeAttribute('data-fall-custom-icon');
            if (allIcons.length) document.body?.setAttribute('data-fall-custom-icons', allIcons.join('|')); else document.body?.removeAttribute('data-fall-custom-icons');
            ensureFallManager(ready => {
                if (!ready) return;
                effectId === 'custom' ? window.fallEffectManager.init(effectId, { customIcon: icon, customIcons: allIcons }) : window.fallEffectManager.init(effectId);
            });
        }

        if (data.type === 'SET_OPENING_EFFECT') {
            const { effectId = 'none' } = data;
            if (effectId && effectId !== 'none') document.body?.setAttribute('data-opening-effect', effectId);
            else document.body?.removeAttribute('data-opening-effect');
        }

        if (data.type === 'SET_BODY_BACKGROUND' && data.style) {
            document.getElementById('__bg_override__')?.remove();
            const s2 = document.createElement('style'); s2.id = '__bg_override__';
            const bs = data.style;
            let css = '';
            if (bs.backgroundImage && bs.backgroundImage !== 'none') {
                css = 'html,body{background-image:' + bs.backgroundImage + '!important;background-size:' + (bs.backgroundSize || 'cover') + '!important;background-position:' + (bs.backgroundPosition || 'center') + '!important;background-color:' + (bs.backgroundColor || 'transparent') + '!important;background-attachment:' + (bs.backgroundAttachment || 'fixed') + '!important;background-repeat:' + (bs.backgroundRepeat || 'no-repeat') + '!important;}';
                if (document.querySelector('.scroll-container')) {
                    css += '.scroll-container{background-image:' + bs.backgroundImage + '!important;background-size:' + (bs.backgroundSize || 'cover') + '!important;background-position:' + (bs.backgroundPosition || 'center') + '!important;background-color:' + (bs.backgroundColor || 'transparent') + '!important;background-attachment:' + (bs.backgroundAttachment || 'fixed') + '!important;background-repeat:' + (bs.backgroundRepeat || 'no-repeat') + '!important;}';
                }
            } else if (bs.background && bs.background !== 'none' && !bs.background.includes('url')) {
                css = 'html,body{background:' + bs.background + '!important;background-color:transparent!important;background-attachment:scroll!important;}';
                if (document.querySelector('.scroll-container')) {
                    css += '.scroll-container{background:' + bs.background + '!important;background-attachment:scroll!important;}';
                }
            } else if (bs.backgroundColor) {
                css = 'html,body{background-color:' + bs.backgroundColor + '!important;background-image:none!important;background:' + bs.backgroundColor + '!important;}';
                if (document.querySelector('.scroll-container')) {
                    css += '.scroll-container{background-color:' + bs.backgroundColor + '!important;background-image:none!important;background:' + bs.backgroundColor + '!important;}';
                }
            } else {
                css = 'html,body{background:transparent!important;background-image:none!important;background-color:transparent!important;}';
                if (document.querySelector('.scroll-container')) {
                    css += '.scroll-container{background:transparent!important;background-image:none!important;background-color:transparent!important;}';
                }
            }
            s2.textContent = css; document.head.appendChild(s2);
        }

        if (data.type === 'REQUEST_HTML_TEXT' && data.id) {
            const el = queryEditableAll(data.id)[0] || null;
            postMsg({ type: 'HTML_TEXT_VALUE', id: data.id, value: el ? el.innerText || '' : '', formattedValue: el ? el.innerHTML || '' : '' });
        }

        if (data.type === 'REQUEST_HTML_STYLE' && data.id) {
            const el = queryEditableAll(data.id)[0];
            if (!el) return;
            const cs = window.getComputedStyle(el);
            postMsg({ type: 'HTML_STYLE_VALUE', id: data.id, style: { fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, color: cs.color, letterSpacing: cs.letterSpacing, textAlign: cs.textAlign } });
        }

        if (data.type === 'REQUEST_HTML_IMAGE_STYLE' && data.id) {
            const el = queryEditableAll(data.id)[0];
            if (!el) return;
            const cs = window.getComputedStyle(el);
            postMsg({ type: 'HTML_IMAGE_STYLE_VALUE', id: data.id, style: { borderRadius: cs.borderRadius, transform: cs.transform, filter: cs.filter } });
        }

        if (data.type === 'REQUEST_HTML_ELEMENT_Y' && data.id) {
            const el = queryEditableAll(data.id)[0];
            if (el) {
                postMsg({ type: 'HTML_ELEMENT_Y_VALUE', id: data.id, y: el.getBoundingClientRect().top + window.pageYOffset });
                scrollEditableIntoViewRobust(el);
            }
        }

        if (data.type === 'CREATE_HTML_TEXT') {
            const { id = 'editor-' + Date.now(), text = '', x = 0, y = 0 } = data;
            const maxZ = Math.max(...Array.from(document.querySelectorAll('*')).map(el => parseInt(window.getComputedStyle(el).zIndex, 10) || 0).filter(n => !isNaN(n)));
            const el = document.createElement('div');
            el.setAttribute('data-editor-id', id);
            el.textContent = text;
            el.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;min-width:80px;min-height:24px;outline:2px dashed rgba(168,85,247,0.6);outline-offset:2px;cursor:text;z-index:' + Math.max(maxZ + 1, 9999) + ';background-color:transparent;padding:0;border-radius:0;box-shadow:none;font-family:Arial,sans-serif;font-size:24px;color:#000;border:none;';
            document.body.appendChild(el);
            postMsg({ type: 'HTML_TEXT_CREATED', id, text, x, y, zIndex: parseInt(el.style.zIndex) });
            postMsg({ type: 'FOCUS_FIELD', id, tab: 'info' });
        }

        if (data.type === 'HIDE_HTML_ELEMENT' && data.id) {
            const el = document.querySelector(EDITABLE_ATTRS.map(a => '[' + a + '="' + data.id + '"]').join(','));
            if (el) { el.dataset.editorDetached = 'true'; el.style.visibility = 'hidden'; el.style.pointerEvents = 'none'; }
        }

        if (data.type === 'SET_ELEMENT_LINK' && data.id) {
            const el = findEditableById(data.id);
            if (el) {
                if (data.url) {
                    el.setAttribute('data-link', data.url);
                    const a = el.tagName === 'A' ? el : el.closest('a');
                    if (a) { a.setAttribute('href', data.url); if (!a.getAttribute('target')) a.setAttribute('target', '_blank'); }
                } else { el.removeAttribute('data-link'); }
            }
        }

        if (data.type === 'REATTACH_HTML_ELEMENT' && data.id && data.targetRect) {
            const el = document.querySelector(EDITABLE_ATTRS.map(a => '[' + a + '="' + data.id + '"]').join(','));
            if (!el) return;
            el.style.visibility = ''; el.style.pointerEvents = ''; el.dataset.editorDetached = 'false';
            const rect = el.getBoundingClientRect(), state = getElementTransformState(el);
            const dx = (data.targetRect.x || 0) - rect.left, dy = (data.targetRect.y || 0) - rect.top;
            const ntx = toNum(el.dataset.editorTx) + dx, nty = toNum(el.dataset.editorTy) + dy;
            el.style.transform = buildTransformString(ntx, nty, state.others);
            el.dataset.editorTx = ntx; el.dataset.editorTy = nty;
            saveElementTransform(data.id, el.style.transform || '');
        }

        if (data.type === 'SCROLL_TO_IMAGE' && data.id) {
            let el = document.querySelector('[data-image-editable="' + data.id + '"]') ||
                document.querySelector('[data-editable="' + data.id + '"]') ||
                document.querySelector('[data-hiweb-library-id="' + data.id + '"]') ||
                document.querySelector('img[alt="' + data.id + '"]');
            if (!el && data.id.startsWith('auto-img-')) {
                const idx = parseInt(data.id.replace('auto-img-', ''));
                el = document.querySelectorAll('img')[idx] || null;
            }
            if (el) {
                if (!el.hasAttribute('data-image-editable') && !el.hasAttribute('data-editable')) el.setAttribute('data-image-editable', data.id);
                applyTempHighlight(el, { outline: '3px solid #a855f7', outlineOffset: '4px', boxShadow: '0 0 0 4px rgba(168,85,247,0.2)' }, 2000);
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        if (data.type === 'HIGHLIGHT_ELEMENT' && data.id) {
            const el = findEditableById(data.id);
            if (el) {
                // ✅ Strictly temporary highlight (3s), no permanent selection handles
                applyTempHighlight(el, data.style, data.duration || 3000);
            }
        }

        if (data.type === 'GET_SCROLL_POSITION' && data.messageId) {
            postMsg({ type: 'SCROLL_POSITION_RESPONSE', messageId: data.messageId, scrollPosition: window.pageYOffset || 0 });
        }

        if (data.type === 'REQUEST_ACTIONS_SCAN') emitActionsSnapshot(true);

        if (data.type === 'EXECUTE_ACTION' && data.action) {
            const { action: act } = data;
            let target2 = null;
            try { if (act.selector) target2 = document.querySelector(act.selector); } catch { }
            if (!target2 && act.elementId) target2 = document.getElementById(act.elementId);
            if (target2) {
                if (act.type === 'click' && act.code) {
                    try {
                        if (act.function && window[act.function]) {
                            const params = act.parameters ? act.parameters.split(',').map(p => { const t2 = p.trim(); return isNaN(t2) ? t2.replace(/['"]/g, '') : parseInt(t2, 10); }) : [];
                            window[act.function](...params);
                        } else { new Function('element', 'event', act.code).call(target2, target2, { target: target2, preventDefault: () => { }, stopPropagation: () => { } }); }
                    } catch { target2.onclick?.(); }
                } else if (act.type === 'navigation' && act.url) window.open(act.url, '_blank');
                postMsg({ type: 'ACTION_EXECUTED', action: act, success: true });
                // ✅ Solid rounded highlight for action execution
                applyTempHighlight(target2, {
                    outline: 'none',
                    boxShadow: '0 0 0 4px #10b981, 0 0 20px rgba(16,185,129,0.4)',
                    borderRadius: '12px',
                    zIndex: '1000002'
                }, 2000);
            } else postMsg({ type: 'ACTION_EXECUTED', action: act, success: false, error: 'Element not found' });
        }

        if (data.type === 'EXECUTE_ACTION_IN_IFRAME' && data.action) {
            const act = data.action;
            try {
                let target2 = null;
                if (act.elementId && act.elementId.startsWith('action-')) {
                    target2 = document.querySelector(`[data-action-id="${act.elementId}"]`);
                } else {
                    target2 = act.selector ? document.querySelector(act.selector) : (act.elementId ? document.getElementById(act.elementId) : null);
                }
                if (target2) {
                    if (act.type === 'click' && act.function && typeof window[act.function] === 'function') {
                        const params = act.parameters ? act.parameters.split(',').map(p => { const t2 = p.trim(); return !isNaN(t2) && t2 !== '' ? parseFloat(t2) : t2.replace(/^['"]|['"]$/g, ''); }) : [];
                        window[act.function](...params);
                        postMsg({ type: 'ACTION_EXECUTED', action: act, success: true });
                    } else if (act.code) {
                        eval(act.code);
                        postMsg({ type: 'ACTION_EXECUTED', action: act, success: true });
                    } else if (act.type === 'navigation' && act.url) {
                        if (act.url.startsWith('#')) { const ae = document.querySelector(act.url); if (ae) ae.scrollIntoView({ behavior: 'smooth' }); }
                        else window.open(act.url, '_blank');
                        postMsg({ type: 'ACTION_EXECUTED', action: act, success: true });
                    }
                } else postMsg({ type: 'ACTION_EXECUTED', action: act, success: false, error: 'Element not found' });
            } catch (err) { postMsg({ type: 'ACTION_EXECUTED', action: act, success: false, error: err.message }); }
        }

        if (data.type === 'GET_LIVE_ROTATION' && data.id) {
            const el = queryEditableAll(data.id)[0];
            if (el) postMsg({ type: 'LIVE_ROTATION_VALUE', id: data.id, rotation: getVisualRotation(el), transform: el.style.transform || '', tx: toNum(el.dataset.editorTx), ty: toNum(el.dataset.editorTy) });
        }

        if (data.type === 'EDITOR_MUSIC_SYNC') {
            const { isPlaying = false, src = null, hasMusic = false } = data;
            // Update toggle button visibility
            const musicToggle = document.getElementById('musicToggle') || document.querySelector('.music-fab') || document.querySelector('.music-btn');
            if (musicToggle) {
                if (!hasMusic || !src) {
                    musicToggle.style.display = 'none';
                    musicToggle.classList.remove('is-playing');
                    musicToggle.setAttribute('aria-label', 'Bật nhạc nền');
                    musicToggle.title = 'Bật nhạc nền';
                } else {
                    musicToggle.style.display = '';
                    if (isPlaying) {
                        musicToggle.classList.add('is-playing');
                        musicToggle.setAttribute('aria-label', 'Tắt nhạc nền');
                        musicToggle.title = 'Tắt nhạc nền';
                    } else {
                        musicToggle.classList.remove('is-playing');
                        musicToggle.setAttribute('aria-label', 'Bật nhạc nền');
                        musicToggle.title = 'Bật nhạc nền';
                    }
                }
            }
            let audioElement = document.getElementById('bgMusic') || document.getElementById('background-music');
            if (!audioElement) { audioElement = document.createElement('audio'); audioElement.id = 'bgMusic'; audioElement.style.display = 'none'; document.body.appendChild(audioElement); }
            try {
                if (src) {
                    Array.from(audioElement.querySelectorAll('source')).forEach(s => s.remove());
                    const sourceEl = document.createElement('source'); sourceEl.src = src; sourceEl.type = 'audio/mpeg';
                    audioElement.appendChild(sourceEl); audioElement.load();
                }
                if (isPlaying) {
                    const playPromise = audioElement.play();
                    if (playPromise !== undefined) playPromise.catch(error => {
                        console.warn('Audio autoplay failed:', error.message);
                        postMsg({ type: 'MUSIC_AUTOPLAY_FAILED', reason: error.message });
                    });
                } else { audioElement.pause(); audioElement.currentTime = 0; }
            } catch (error) { console.error('Error handling music sync:', error); postMsg({ type: 'MUSIC_SYNC_ERROR', error: error.message }); }
        }

        // ✅ Handle UPDATE_MUSIC_IN_HTML - Update music in HTML with full metadata
        if (data.type === 'UPDATE_MUSIC_IN_HTML' && data.music) {
            try {
                const { url, title, artist, iconUrl, iconId, iconColor, autoplay } = data.music;

                // Update audio element
                let audioElement = document.getElementById('bgMusic') || document.getElementById('background-music');
                if (!audioElement) {
                    audioElement = document.createElement('audio');
                    audioElement.id = 'bgMusic';
                    audioElement.style.display = 'none';
                    document.body.appendChild(audioElement);
                }

                // Update audio source
                if (url) {
                    Array.from(audioElement.querySelectorAll('source')).forEach(s => s.remove());
                    const sourceEl = document.createElement('source');
                    sourceEl.src = url;
                    sourceEl.type = 'audio/mpeg';
                    audioElement.appendChild(sourceEl);
                    audioElement.load();

                    // Set metadata attributes
                    if (title) audioElement.setAttribute('data-title', title);
                    if (artist) audioElement.setAttribute('data-artist', artist);
                    if (autoplay) audioElement.setAttribute('autoplay', 'autoplay');
                    else audioElement.removeAttribute('autoplay');
                }

                // Update music icon if exists
                if (iconUrl) {
                    applyCustomMusicIcon(iconUrl, iconId);
                    const musicIcon = document.querySelector('.music-icon');
                    if (musicIcon) {
                        if (iconId) musicIcon.setAttribute('data-icon-id', iconId);
                        if (iconColor) musicIcon.setAttribute('data-icon-color', iconColor);
                    }
                }

                // Update music control metadata if exists
                const musicControl = document.querySelector('.music-control');
                if (musicControl) {
                    if (title) musicControl.setAttribute('data-music-title', title);
                    if (artist) musicControl.setAttribute('data-music-artist', artist);
                }

                console.log('[UPDATE_MUSIC_IN_HTML] Music updated in HTML:', { url, title, artist, iconUrl });
                postMsg({ type: 'MUSIC_HTML_UPDATED', success: true });
            } catch (error) {
                console.error('[UPDATE_MUSIC_IN_HTML] Error updating music:', error);
                postMsg({ type: 'MUSIC_HTML_UPDATE_ERROR', error: error.message });
            }
        }

        // ✅ Handle UPDATE_MAP_ADDRESS - Update address text and Google Maps links
        if (data.type === 'UPDATE_MAP_ADDRESS') {
            const { id, address } = data;
            if (!address) return;

            console.log('[UPDATE_MAP_ADDRESS] Syncing address:', address, 'for map ID:', id);

            // 1. Update text in all elements with class .location-addr
            const addrEls = document.querySelectorAll('.location-addr');
            addrEls.forEach(el => {
                el.innerText = address;
                // Also update any data-editable if it matches
                if (el.getAttribute('data-editable') === 'location-addr') {
                    // Selection handles will need update if this element is selected
                    if (currentSelectedImage === el) setTimeout(() => showSelectionHandles(el), 10);
                }
            });

            // 2. Update Google Maps href in elements with data-edit-map-href matching id
            if (id) {
                const mapLinks = document.querySelectorAll(`[data-edit-map-href="${id}"]`);
                // Standard Google Maps search URL
                const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                mapLinks.forEach(el => {
                    el.href = searchUrl;
                    console.log('[UPDATE_MAP_ADDRESS] Updated link href to:', searchUrl);
                });
            }
        }
    });

    // ── ResizeObserver for height ─────────────────────────────────────────────
    let lastHeight = 0;
    new ResizeObserver(() => {
        const h = document.documentElement.scrollHeight;
        if (h !== lastHeight && h > 0) { lastHeight = h; postMsg({ type: 'HTML_HEIGHT_CHANGE', height: h }); }
    }).observe(document.body);

    // ── MutationObserver for actions ──────────────────────────────────────────
    new MutationObserver(() => emitActionsSnapshot(false)).observe(document.documentElement || document.body, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ['onclick', 'onchange', 'oninput', 'onsubmit', 'href', 'action']
    });

    // ── Init ──────────────────────────────────────────────────────────────────
    applySavedEffects();
    disableAos();

    // ── Auto-load state from EditorStateManager if scope is available ──
    if (window.editorStateManager && window.__htmlEditorScope && window.__htmlEditorScope.key) {
        try {
            console.log('[Init] Attempting to load state from EditorStateManager with scope:', window.__htmlEditorScope.key);
            const state = window.editorStateManager.loadFromLocalStorage(window.__htmlEditorScope);
            if (state) {
                console.log('[Init] Found saved state, applying...');
                window.editorStateManager.applyState(state, true);
                console.log('[Init] State applied successfully');
            } else {
                console.log('[Init] No saved state found for this scope, using clean template');
            }
        } catch (e) {
            console.warn('[Init] Failed to load state from EditorStateManager:', e);
        }
    } else {
        console.log('[Init] No scope defined or EditorStateManager not available, using clean template');
    }

    let applyAttempts = 0;
    const tryApply = () => {
        applyAttempts++;
        disableAos(); applyStoredTransforms();
        if (applyAttempts < 5) setTimeout(tryApply, 200);
    };
    setTimeout(tryApply, 100);
    setTimeout(() => emitActionsSnapshot(true), 200);
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || data.__html_editor !== true) return;

        if (data.type === 'UPDATE_SCOPE') {
            window.__htmlEditorScope = data.scope;
            syncScopeToLocalStorage(data.scope);
            return;
        }

        if (data.type === 'APPLY_COMMAND') {
            const cmd = data.command;
            if (!cmd) return;

            const stateToApply = data.direction === 'undo' ? cmd.before : cmd.after;
            if (stateToApply && window.editorStateManager) {
                // Structural changes MUST use applyState even if elementId is present
                const isStructural = ['CANVAS_SNAPSHOT', 'DELETE', 'DUPLICATE', 'ADD', 'ADD_IMAGE'].includes(cmd.type);

                if (isStructural) {
                    // Full structural restore from snapshot
                    window.editorStateManager.applyState(stateToApply);

                    // Clear selection handles after full restore
                    hideSelectionHandles();
                } else if (cmd.elementId) {
                    const el = findEditableById(cmd.elementId);
                    if (el) {
                        window.editorStateManager.applyElementState(el, stateToApply);

                        // Update handles if the applied element is selected
                        if (currentSelectedImage === el) {
                            updateHandlesRect(el);
                            showSelectionHandles(el);
                        }
                    }
                }

                // Signal back to parent that application is complete
                postMsg({
                    type: 'APPLY_COMPLETE',
                    commandId: cmd.id || cmd.elementId || 'structural',
                    direction: data.direction
                });
            }
        }
    });
})();
