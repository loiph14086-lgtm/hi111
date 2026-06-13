/**
 * Editor State Manager
 * Manages CSS-based state storage and undo/redo functionality
 * Does NOT store full HTML for security (prevents source code theft)
 */

(function () {
    'use strict';

    // ── Constants ─────────────────────────────────────────────────────────────

    const EDITABLE_SELECTOR =
        '[data-editable], [data-editor-id], [data-image-editable], ' +
        '[data-edit-map], [data-edit-map-href], img[data-image-editable], [data-editor-detached]';

    const EDITABLE_ID_ATTRS = [
        'data-editable', 'data-editor-id', 'data-image-editable',
        'data-edit-map', 'data-edit-map-href', 'data-history',
    ];

    /** CSS style properties to capture — ordered by importance */
    const CAPTURED_STYLE_PROPS = [
        'cssText',
        'transform', 'transformOrigin',
        'width', 'height',
        'position', 'left', 'top', 'zIndex',
        'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
        'color', 'textAlign', 'lineHeight', 'letterSpacing',
        'textDecoration', 'textTransform',
        'opacity', 'filter', 'borderRadius', 'boxShadow',
        'backgroundColor', 'backgroundImage', 'backgroundSize',
        'backgroundPosition', 'backgroundRepeat',
        'clipPath', 'objectFit', 'objectPosition',
        'maskImage', 'maskSize', 'maskPosition', 'maskRepeat',
        'WebkitMaskImage', 'WebkitMaskSize', 'WebkitMaskPosition', 'WebkitMaskRepeat',
        'display', 'overflow', 'whiteSpace', 'animation',
    ];

    /** Temporary class names added by the editor — excluded from snapshots */
    const TEMP_CLASSES = new Set(['selected', 'editing', 'editor-effect-target']);

    const MAX_STACK_SIZE = 50;
    const DEBOUNCE_DELAY = 300;

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Build a CSS selector that targets an element by its editable ID.
     * Returns null when id is empty so callers can guard cheaply.
     */
    function buildSelector(id) {
        if (!id) return null;
        return EDITABLE_ID_ATTRS.slice(0, 5)   // skip data-history for querying
            .map(attr => `[${attr}="${CSS.escape(id)}"]`)
            .join(', ');
    }

    /** Return all DOM elements matching the given editable id. */
    function queryById(id) {
        const sel = buildSelector(id);
        return sel ? Array.from(document.querySelectorAll(sel)) : [];
    }

    /** Fast, non-cryptographic hash for change detection — avoids full JSON.stringify compare. */
    function quickHash(obj) {
        const str = JSON.stringify(obj);
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = (h * 0x01000193) >>> 0;
        }
        return h;
    }

    /** Simple debounce — returns { call, cancel }. */
    function debounce(fn, delay) {
        let timer = null;
        return {
            call(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => { timer = null; fn(...args); }, delay);
            },
            cancel() { clearTimeout(timer); timer = null; },
        };
    }

    // ── EditorStateManager ────────────────────────────────────────────────────

    class EditorStateManager {
        constructor() {
            this.undoStack = [];
            this.redoStack = [];
            // this.maxStackSize = 50;
            // this.debounceTimer = null;
            // this.debounceDelay = 300; // ms

            this._lastHash = null;

            const deb = debounce(() => this.saveState(), DEBOUNCE_DELAY);
            this._debouncedSave = deb.call.bind(deb);
            this._cancelDebounce = deb.cancel.bind(deb);
        }

        // ── State Capture ─────────────────────────────────────────────────────

        captureCurrentState() {
            const state = {
                css: {},
                content: {},
                structure: {},
                metadata: {
                    background: this._captureBackground(),
                    timestamp: Date.now(),
                },
            };

            document.querySelectorAll(EDITABLE_SELECTOR).forEach(el => {
                const id = this._getElementId(el);
                if (!id) return;

                const parent = el.parentElement || document.body;
                state.structure[id] = {
                    tagName: el.tagName,
                    attributes: this._captureAttributes(el),
                    parentId: this._getElementId(parent),
                    parentPath: this._pathFromBody(parent),
                    childIndex: Array.from(parent.children).indexOf(el),
                };

                state.css[id] = this._captureCSS(el);

                const content = this._captureContent(el);
                if (content !== null) state.content[id] = content;
            });

            return state;
        }

        captureElementState(el) {
            if (!el) return null;
            const id = this._getElementId(el);
            const state = { id, css: this._captureCSS(el), content: this._captureContent(el), metadata: {} };
            if (id === 'canvas' || el === document.body) {
                state.metadata.background = this._captureBackground();
            }
            return state;
        }

        // ── State Application ─────────────────────────────────────────────────

        applyState(state) {
            if (!state) return;

            // Apply background FIRST so it is not lost/overwritten by later DOM mutations
            // if (state.metadata?.background) this._applyBackground(state.metadata.background);

            if (state.structure) this._reconcileStructure(state.structure);

            Object.entries(state.css || {}).forEach(([id, css]) =>
                queryById(id).forEach(el => this._applyCSS(el, css))
            );

            Object.entries(state.content || {}).forEach(([id, content]) =>
                queryById(id).forEach(el => this._applyContent(el, content))
            );
            if (state.metadata?.background) this._applyBackground(state.metadata.background);
        }

        applyElementState(el, state) {
            if (!el || !state) return;

            const id = this._getElementId(el);
            const isGlobal = state.id === undefined;

            const css = isGlobal ? (state.css?.[id] ?? null) : state.css;
            const content = isGlobal ? (state.content?.[id] ?? undefined) : state.content;
            const bg = state.metadata?.background;

            if (css) this._applyCSS(el, css);
            if (content !== undefined) this._applyContent(el, content);
            if (bg) this._applyBackground(bg);
        }

        // ── Undo / Redo ───────────────────────────────────────────────────────

        saveStateDebounced() { this._debouncedSave(); }

        // ── Element-level save (recommended for normal editing) ────────────────
        saveElementState(el) {
            if (!el) return;
            const elementState = this.captureElementState(el);
            if (!elementState) return;

            const hash = quickHash(elementState);
            if (hash === this._lastHash) return;

            this._lastHash = hash;
            this.undoStack.push({ __element: true, el, state: elementState });
            if (this.undoStack.length > MAX_STACK_SIZE) this.undoStack.shift();
            this.redoStack = [];
            console.log(`[StateManager] element saved — undo: ${this.undoStack.length}`);
        }

        saveState() {
            const state = this.captureCurrentState();
            const hash = quickHash(state);

            if (hash === this._lastHash) return;
            this._lastHash = hash;

            this.undoStack.push(state);
            if (this.undoStack.length > MAX_STACK_SIZE) this.undoStack.shift();
            this.redoStack = [];

            console.log(`[StateManager] saved — undo: ${this.undoStack.length}`);
        }

        undo() {
            if (!this.undoStack.length) { console.log('[StateManager] nothing to undo'); return false; }

            const last = this.undoStack.pop();
            this.redoStack.push(this.captureCurrentState());

            if (last && last.__element) {
                // Element-level undo (much safer, no layout breakage)
                const targetEl = last.el || document.querySelector(`[data-editor-id="${last.state.id}"]`);
                this.applyElementState(targetEl, last.state);
            } else {
                this.applyState(last);
            }

            console.log(`[StateManager] undo — undo: ${this.undoStack.length}, redo: ${this.redoStack.length}`);
            return true;
        }

        redo() {
            if (!this.redoStack.length) { console.log('[StateManager] nothing to redo'); return false; }

            const last = this.redoStack.pop();
            this.undoStack.push(this.captureCurrentState());

            if (last && last.__element) {
                const targetEl = last.el || document.querySelector(`[data-editor-id="${last.state.id}"]`);
                this.applyElementState(targetEl, last.state);
            } else {
                this.applyState(last);
            }

            console.log(`[StateManager] redo — undo: ${this.undoStack.length}, redo: ${this.redoStack.length}`);
            return true;
        }

        getStackInfo() {
            return {
                canUndo: this.undoStack.length > 0,
                canRedo: this.redoStack.length > 0,
                undoCount: this.undoStack.length,
                redoCount: this.redoStack.length,
            };
        }

        // ── LocalStorage ──────────────────────────────────────────────────────

        saveToLocalStorage(scope) {
            try {
                localStorage.setItem(this._storageKey(scope), JSON.stringify(this.captureCurrentState()));
                return true;
            } catch (e) {
                console.error('[StateManager] save failed:', e);
                return false;
            }
        }

        loadFromLocalStorage(scope) {
            try {
                const raw = localStorage.getItem(this._storageKey(scope));
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                console.error('[StateManager] load failed:', e);
                return null;
            }
        }

        clearStorage(scope) {
            localStorage.removeItem(this._storageKey(scope));
        }

        // ── Private: capture helpers ──────────────────────────────────────────

        _getElementId(el) {
            if (!el?.getAttribute) return '';
            for (const attr of EDITABLE_ID_ATTRS) {
                const v = el.getAttribute(attr);
                if (v) return v;
            }
            return '';
        }

        _captureAttributes(el) {
            const attrs = {};
            for (const { name, value } of el.attributes) {
                if (name === 'style') continue;
                if (name === 'class') {
                    const clean = value.split(/\s+/)
                        .filter(c => !c.startsWith('editor-') && !TEMP_CLASSES.has(c))
                        .join(' ');
                    if (clean) attrs.class = clean;
                } else {
                    attrs[name] = value;
                }
            }
            return attrs;
        }

        _captureCSS(el) {
            if (!el) return {};
            const { style, dataset } = el;
            const css = {};

            for (const prop of CAPTURED_STYLE_PROPS) {
                if (style[prop]) css[prop] = style[prop];
            }

            // Dataset-driven transform helpers
            if (dataset.editorTx) css.tx = dataset.editorTx;
            if (dataset.editorTy) css.ty = dataset.editorTy;
            if (dataset.editorRotation) css.rotation = dataset.editorRotation;
            if (dataset.zIndex) css.datasetZIndex = dataset.zIndex;

            const nested = this._captureNestedStyles(el);
            if (nested.length) css.nested = nested;

            return css;
        }

        _captureNestedStyles(el) {
            if (!el?.querySelectorAll) return [];
            const nested = [];
            el.querySelectorAll('*').forEach(node => {
                const cssText = node.style?.cssText || '';
                const src = node.tagName === 'IMG' ? (node.getAttribute('src') || '') : '';
                if (!cssText && !src) return;
                nested.push({ path: this._relativePath(el, node), cssText, ...(src ? { src } : {}) });
            });
            return nested;
        }

        _captureContent(el) {
            if (el.tagName === 'IMG') return String(el.src || '');

            if (el.hasAttribute('data-image-editable')) {
                const childImg = el.querySelector('img');
                if (childImg) return childImg.src || '';
                const m = (el.style.backgroundImage || '').match(/url\(['"]?([^'"]+)['"]?\)/);
                return m ? m[1] : '';
            }

            if (el.hasAttribute('data-editable') || el.hasAttribute('data-editor-id')) {
                return String(el.innerHTML || '');
            }

            return null;
        }

        _captureBackground() {
            // Capture background from the most relevant element: data-editor-background, .hero, or body
            // const targetEl = document.querySelector('[data-editor-background]') || document.querySelector('.hero') || document.body;
            // if (!targetEl) return null;
            // const s = getComputedStyle(targetEl);
            const body = document.body;
            if (!body) return null;
            const s = getComputedStyle(body)
            return {
                background: s.background,
                backgroundColor: s.backgroundColor,
                backgroundImage: s.backgroundImage,
                backgroundSize: s.backgroundSize,
                backgroundPosition: s.backgroundPosition,
                backgroundRepeat: s.backgroundRepeat,
                backgroundAttachment: s.backgroundAttachment,
            };
        }

        // ── Private: apply helpers ────────────────────────────────────────────

        /**
         * Reconcile the live DOM against state.structure:
         *  1. Create elements that are missing.
         *  2. Remove elements that are no longer in the snapshot.
         */
        _reconcileStructure(structure) {
            // Pass 1 — ensure every element in state exists in the DOM
            for (const [id, info] of Object.entries(structure)) {
                if (queryById(id).length) continue;   // already present

                console.log('[StateManager] recreating element:', id);
                const el = document.createElement(info.tagName);
                for (const [name, value] of Object.entries(info.attributes || {})) {
                    el.setAttribute(name, value);
                }

                let parent = (info.parentId && queryById(info.parentId)[0]) ||
                    this._resolveBodyPath(info.parentPath) ||
                    document.body;

                const ref = parent.children[info.childIndex] ?? null;
                ref ? parent.insertBefore(el, ref) : parent.appendChild(el);
            }

            // Pass 2 — remove ghost elements not present in snapshot
            document.querySelectorAll(
                EDITABLE_SELECTOR + ', [data-history]'
            ).forEach(el => {
                const id = this._getElementId(el);
                if (id && id !== 'body-background' && !structure[id]) {
                    console.log('[StateManager] removing ghost element:', id);
                    el.remove();
                }
            });
        }

        _applyCSS(el, css) {
            if (!el || !css) return;

            // Apply full cssText first (fastest path — sets everything in one shot)
            if (css.cssText) el.style.cssText = css.cssText;

            // Patch individual properties on top
            for (const prop of CAPTURED_STYLE_PROPS) {
                if (prop === 'cssText') continue;
                if (css[prop] !== undefined) {
                    // Avoid overwriting if already set by cssText (preserves !important)
                    if (css.cssText && el.style[prop] === css[prop]) continue;
                    try { el.style[prop] = css[prop]; } catch (_) { /* skip unsupported */ }
                }
            }

            // Dataset properties
            if (css.tx !== undefined) el.dataset.editorTx = css.tx;
            if (css.ty !== undefined) el.dataset.editorTy = css.ty;
            if (css.rotation !== undefined) el.dataset.editorRotation = css.rotation;
            if (css.datasetZIndex !== undefined) el.dataset.zIndex = css.datasetZIndex;

            // CSS custom properties used by transform logic
            if (css.tx !== undefined || css.ty !== undefined) {
                el.style.setProperty('--el-tx', `${parseFloat(css.tx) || 0}px`);
                el.style.setProperty('--el-ty', `${parseFloat(css.ty) || 0}px`);
            }

            // Nested child styles
            if (Array.isArray(css.nested)) {
                css.nested.forEach(({ path, cssText, src }) => {
                    const node = this._resolveRelativePath(el, path);
                    if (!node?.style) return;
                    if (cssText) node.style.cssText = cssText;
                    if (src && node.tagName === 'IMG') node.setAttribute('src', src);
                });
            }
        }

        _applyContent(el, content) {
            if (!el || content === undefined) return;

            if (el.tagName === 'IMG') {
                el.src = String(content || '');
                return;
            }

            if (el.hasAttribute('data-image-editable')) {
                const childImg = el.querySelector('img');
                if (childImg) {
                    childImg.src = String(content || '');
                } else {
                    const safe = String(content || '');
                    el.style.backgroundImage = safe && !safe.startsWith('url')
                        ? `url('${safe}')` : safe;
                }
                return;
            }

            if (el.hasAttribute('data-editable') || el.hasAttribute('data-editor-id') || el.isContentEditable) {
                el.innerHTML = String(content || '');
            }
        }

        _applyBackground(bg) {
            if (!bg) return;
            try {
                // Store for runtime reloads
                sessionStorage.setItem('html-editor-background', JSON.stringify(bg));

                // Find the element we injected into previously (same logic as injector)
                const bgTarget = document.querySelector('[data-editor-background]') || document.querySelector('.hero') || document.body;
                if (!bgTarget) return;

                // Build CSS for html,body fallback (keeps existing behavior)
                let css = '';
                if (bg.backgroundImage && bg.backgroundImage !== 'none') {
                    css = `html,body{background-image:${bg.backgroundImage}!important;` +
                        `background-size:${bg.backgroundSize || 'cover'}!important;` +
                        `background-position:${bg.backgroundPosition || 'center'}!important;` +
                        `background-color:${bg.backgroundColor || 'transparent'}!important;` +
                        `background-repeat:${bg.backgroundRepeat || 'no-repeat'}!important;` +
                        `background-attachment:${bg.backgroundAttachment || 'scroll'}!important;}`;
                } else if (bg.background && bg.background !== 'none') {
                    css = `html,body{background:${bg.background}!important;background-image:none!important;}`;
                } else if (bg.backgroundColor) {
                    css = `html,body{background-color:${bg.backgroundColor}!important;background-image:none!important;}`;
                }

                let override = document.getElementById('editor-bg-override');
                if (!override) {
                    override = document.createElement('style');
                    override.id = 'editor-bg-override';
                    document.head.appendChild(override);
                }
                override.textContent = css;

                // Fallback: also write directly to body.style
                const props = ['backgroundColor', 'backgroundImage', 'backgroundSize',
                    'backgroundPosition', 'backgroundRepeat', 'backgroundAttachment'];
                const body = document.body;
                if (body) props.forEach(p => { if (bg[p] !== undefined) body.style[p] = bg[p]; });

            } catch (e) {
                console.error('[StateManager] background apply failed:', e);
            }
        }

        // ── Private: DOM path helpers ─────────────────────────────────────────

        _relativePath(root, node) {
            if (!root || !node || root === node) return '';
            const path = [];
            let cur = node;
            while (cur && cur !== root) {
                const parent = cur.parentElement;
                if (!parent) break;
                path.unshift(Array.from(parent.children).indexOf(cur));
                cur = parent;
            }
            return path.join('.');
        }

        _resolveRelativePath(root, path) {
            if (!root || !path) return root;
            return this._walkPath(root, path);
        }

        _pathFromBody(node) {
            const body = document.body;
            if (!node || !body || node === body) return '';
            const path = [];
            let cur = node;
            while (cur && cur !== body) {
                const parent = cur.parentElement;
                if (!parent) break;
                path.unshift(Array.from(parent.children).indexOf(cur));
                cur = parent;
            }
            return path.join('.');
        }

        _resolveBodyPath(path) {
            if (!document.body) return null;
            if (!path) return document.body;
            return this._walkPath(document.body, path);
        }

        /** Shared tree-walking logic used by both relative and body-rooted paths. */
        _walkPath(root, path) {
            const indexes = String(path).split('.')
                .map(Number)
                .filter(n => Number.isInteger(n) && n >= 0);
            let cur = root;
            for (const idx of indexes) {
                if (!cur?.children?.[idx]) return null;
                cur = cur.children[idx];
            }
            return cur;
        }

        // ── Private: storage key ──────────────────────────────────────────────

        _storageKey(scope) {
            return scope?.key ? `editor-state:${scope.key}` : 'editor-state:default';
        }
    }

    // ── Export ────────────────────────────────────────────────────────────────

    window.EditorStateManager = EditorStateManager;

    if (!window.editorStateManager) {
        window.editorStateManager = new EditorStateManager();
    }
})();