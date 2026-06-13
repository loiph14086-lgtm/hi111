/**
 * Editor State Manager
 * Manages CSS-based state storage and undo/redo functionality
 * Does NOT store full HTML for security (prevents source code theft)
 */

(function () {
    'use strict';

    // ── State Storage Structure ───────────────────────────────────────────────
    // {
    //   css: {
    //     "element-id": { transform: "...", width: "...", fontSize: "...", ... }
    //   },
    //   content: {
    //     "element-id": "text content or image URL"
    //   },
    //   metadata: {
    //     background: { ... },
    //     music: { ... }
    //   }
    // }

    class EditorStateManager {
        constructor() {
            this.undoStack = [];
            this.redoStack = [];
            this.maxStackSize = 50;
            this.debounceTimer = null;
            this.debounceDelay = 300; // ms
        }

        // ── Get current state from DOM ────────────────────────────────────────
        captureCurrentState() {
            const state = {
                css: {},
                content: {},
                structure: {}, // Lưu cấu trúc các phần tử được tạo động (như clone/copy)
                metadata: {
                    background: this.captureBackgroundState(),
                    timestamp: Date.now()
                }
            };

            // Capture all editable elements
            const editableSelector = '[data-editable], [data-editor-id], [data-image-editable], [data-edit-map], [data-edit-map-href], img[data-image-editable], [data-editor-detached]';
            document.querySelectorAll(editableSelector).forEach(el => {
                const id = this.getElementId(el);
                if (!id) return;

                // Lưu thông tin thẻ và thuộc tính cho các phần tử do Editor tạo ra (bắt đầu bằng editor-)
                if (id.startsWith('editor-')) {
                    const parent = el.parentElement || document.body;
                    state.structure[id] = {
                        tagName: el.tagName,
                        attributes: this.captureElementAttributes(el),
                        parentId: this.getElementId(parent),
                        parentPath: this.getNodePathFromBody(parent),
                        childIndex: parent ? Array.from(parent.children || []).indexOf(el) : -1,
                    };
                }

                // Capture CSS
                state.css[id] = this.captureElementCSS(el);

                // Capture content
                const content = this.captureElementContent(el);
                if (content !== null) {
                    state.content[id] = content;
                }
            });

            return state;
        }

        // ── Capture element attributes (excluding style) ─────────────────────
        captureElementAttributes(el) {
            const attrs = {};
            const ignore = ['style']; // Style được lưu riêng ở state.css

            Array.from(el.attributes).forEach(attr => {
                if (!ignore.includes(attr.name)) {
                    if (attr.name === 'class') {
                        // Loại bỏ các class editor tạm thời để tránh xung đột khi restore
                        const classes = attr.value.split(/\s+/).filter(c =>
                            !c.startsWith('editor-') &&
                            c !== 'selected' &&
                            c !== 'editing' &&
                            c !== 'editor-effect-target'
                        );
                        if (classes.length > 0) attrs[attr.name] = classes.join(' ');
                    } else {
                        attrs[attr.name] = attr.value;
                    }
                }
            });
            return attrs;
        }

        // ── Get element ID ────────────────────────────────────────────────────
        getElementId(el) {
            if (!el || typeof el.getAttribute !== 'function') return '';
            const baseId = el.getAttribute('data-editable') ||
                el.getAttribute('data-editor-id') ||
                el.getAttribute('data-image-editable') ||
                el.getAttribute('data-edit-map') ||
                el.getAttribute('data-edit-map-href') ||
                '';

            // Don't add scope prefix here - we'll use scope in storage key instead
            return baseId;
        }

        getRelativeNodePath(root, node) {
            if (!root || !node || root === node) return '';
            const path = [];
            let current = node;

            while (current && current !== root) {
                const parent = current.parentElement;
                if (!parent) break;
                const index = Array.from(parent.children).indexOf(current);
                path.unshift(index);
                current = parent;
            }

            return path.join('.');
        }

        resolveRelativeNodePath(root, path) {
            if (!root || !path) return root;
            const indexes = String(path)
                .split('.')
                .map((part) => parseInt(part, 10))
                .filter((value) => Number.isInteger(value) && value >= 0);

            let current = root;
            for (const index of indexes) {
                if (!current?.children?.[index]) return null;
                current = current.children[index];
            }

            return current;
        }

        getNodePathFromBody(node) {
            const body = document.body;
            if (!node || !body || node === body) return '';

            const path = [];
            let current = node;

            while (current && current !== body) {
                const parent = current.parentElement;
                if (!parent) break;
                const index = Array.from(parent.children).indexOf(current);
                path.unshift(index);
                current = parent;
            }

            return path.join('.');
        }

        resolveNodePathFromBody(path) {
            if (!document.body) return null;
            if (!path) return document.body;

            const indexes = String(path)
                .split('.')
                .map((part) => parseInt(part, 10))
                .filter((value) => Number.isInteger(value) && value >= 0);

            let current = document.body;
            for (const index of indexes) {
                if (!current?.children?.[index]) return null;
                current = current.children[index];
            }

            return current;
        }

        captureNestedStyles(el) {
            if (!el?.querySelectorAll) return [];
            const nested = [];

            el.querySelectorAll('*').forEach((node) => {
                const cssText = node.style?.cssText || '';
                const src =
                    node.tagName === 'IMG'
                        ? node.getAttribute('src') || node.src || ''
                        : '';

                if (!cssText && !src) return;

                nested.push({
                    path: this.getRelativeNodePath(el, node),
                    cssText,
                    ...(src ? { src } : {}),
                });
            });

            return nested;
        }

        // ── Capture element CSS ───────────────────────────────────────────────
        captureElementCSS(el) {
            if (!el) return {};
            const css = {};
            const style = el.style;

            // Transform properties (most important for undo/redo)
            if (style.transform) css.transform = style.transform;
            if (el.dataset.editorTx) css.tx = el.dataset.editorTx;
            if (el.dataset.editorTy) css.ty = el.dataset.editorTy;
            if (el.dataset.editorRotation) css.rotation = el.dataset.editorRotation;
            if (style.cssText) css.cssText = style.cssText;

            // Size properties
            if (style.width) css.width = style.width;
            if (style.height) css.height = style.height;

            // Position properties
            if (style.position) css.position = style.position;
            if (style.left) css.left = style.left;
            if (style.top) css.top = style.top;
            if (style.zIndex) css.zIndex = style.zIndex;
            if (el.dataset.zIndex) css.datasetZIndex = el.dataset.zIndex;

            // Text properties
            if (style.fontSize) css.fontSize = style.fontSize;
            if (style.fontFamily) css.fontFamily = style.fontFamily;
            if (style.fontWeight) css.fontWeight = style.fontWeight;
            if (style.fontStyle) css.fontStyle = style.fontStyle;
            if (style.color) css.color = style.color;
            if (style.textAlign) css.textAlign = style.textAlign;
            if (style.lineHeight) css.lineHeight = style.lineHeight;
            if (style.letterSpacing) css.letterSpacing = style.letterSpacing;
            if (style.textDecoration) css.textDecoration = style.textDecoration;
            if (style.textTransform) css.textTransform = style.textTransform;

            // Visual properties
            if (style.opacity) css.opacity = style.opacity;
            if (style.filter) css.filter = style.filter;
            if (style.borderRadius) css.borderRadius = style.borderRadius;
            if (style.boxShadow) css.boxShadow = style.boxShadow;
            if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
            if (style.backgroundImage) css.backgroundImage = style.backgroundImage;
            if (style.backgroundSize) css.backgroundSize = style.backgroundSize;
            if (style.backgroundPosition) css.backgroundPosition = style.backgroundPosition;
            if (style.backgroundRepeat) css.backgroundRepeat = style.backgroundRepeat;
            if (style.clipPath) css.clipPath = style.clipPath;
            if (style.objectFit) css.objectFit = style.objectFit;
            if (style.objectPosition) css.objectPosition = style.objectPosition;
            if (style.transformOrigin) css.transformOrigin = style.transformOrigin;
            if (style.display) css.display = style.display;
            if (style.overflow) css.overflow = style.overflow;
            if (style.whiteSpace) css.whiteSpace = style.whiteSpace;

            // Animation
            if (style.animation) css.animation = style.animation;

            const nested = this.captureNestedStyles(el);
            if (nested.length > 0) css.nested = nested;

            return css;
        }

        // ── Capture element content ───────────────────────────────────────────
        captureElementContent(el) {
            // For images
            if (el.tagName === 'IMG' || el.hasAttribute('data-image-editable')) {
                if (el.tagName === 'IMG') {
                    return el.src || '';
                } else {
                    const bgImage = el.style.backgroundImage || '';
                    const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                    if (match) return match[1];
                    const childImg = el.querySelector('img');
                    return childImg?.src || '';
                }
            }

            // For text elements - use innerHTML to preserve formatting
            if (el.hasAttribute('data-editable') || el.hasAttribute('data-editor-id')) {
                return el.innerHTML || '';
            }

            return null;
        }

        // ── Capture background state ──────────────────────────────────────────
        captureBackgroundState() {
            const body = document.body;
            if (!body) return null;
            const computedStyle = getComputedStyle(body);
            return {
                backgroundColor: computedStyle.backgroundColor,
                backgroundImage: computedStyle.backgroundImage,
                backgroundSize: computedStyle.backgroundSize,
                backgroundPosition: computedStyle.backgroundPosition,
                backgroundRepeat: computedStyle.backgroundRepeat,
                backgroundAttachment: computedStyle.backgroundAttachment
            };
        }

        // ── Capture specific element state ───────────────────────────────────
        captureElementState(el) {
            if (!el) return null;
            const id = this.getElementId(el);
            const state = {
                id,
                css: this.captureElementCSS(el),
                content: this.captureElementContent(el),
                metadata: {}
            };

            // Only capture background for canvas or if explicitly requested
            if (id === 'canvas' || el === document.body) {
                state.metadata.background = this.captureBackgroundState();
            }
            
            return state;
        }

        // ── Apply specific element state ────────────────────────────────────
        applyElementState(el, state) {
            if (!el || !state) return;
            if (state.css) this.applyElementCSS(el, state.css);
            if (state.content !== undefined) this.applyElementContent(el, state.content);
            if (state.metadata?.background) this.applyBackgroundState(state.metadata.background);
        }

        // ── Apply state to DOM ────────────────────────────────────────────────
        applyState(state) {
            if (!state) return;

            // Bước 1: Tái tạo cấu trúc cho các phần tử được tạo động (như clone/copy/add text)
            if (state.structure) {
                Object.entries(state.structure).forEach(([id, info]) => {
                    let el = document.querySelector(
                        `[data-editable="${id}"], [data-editor-id="${id}"], [data-image-editable="${id}"], [data-edit-map="${id}"], [data-edit-map-href="${id}"]`
                    );

                    if (!el) {
                        console.log('[State Manager] Recreating missing element:', id);
                        el = document.createElement(info.tagName);

                        // Áp dụng lại các thuộc tính (attrs, data-, class...)
                        Object.entries(info.attributes || {}).forEach(([name, value]) => {
                            el.setAttribute(name, value);
                        });

                        // Tìm phần tử cha để gắn vào
                        let parent = null;
                        if (info.parentId) {
                            parent = document.querySelector(
                                `[data-editable="${info.parentId}"], [data-editor-id="${info.parentId}"], [data-image-editable="${info.parentId}"]`
                            );
                        }
                        if (!parent && info.parentPath !== undefined) {
                            parent = this.resolveNodePathFromBody(info.parentPath);
                        }

                        const targetParent = parent || document.body;
                        const siblings = Array.from(targetParent.children || []);
                        const insertBeforeNode =
                            Number.isInteger(info.childIndex) && info.childIndex >= 0
                                ? siblings[info.childIndex] || null
                                : null;

                        if (insertBeforeNode) {
                            targetParent.insertBefore(el, insertBeforeNode);
                        } else {
                            targetParent.appendChild(el);
                        }
                    }
                });
            }

            // Apply CSS to elements
            Object.entries(state.css || {}).forEach(([id, css]) => {
                const elements = document.querySelectorAll(
                    `[data-editable="${id}"], [data-editor-id="${id}"], [data-image-editable="${id}"], [data-edit-map="${id}"], [data-edit-map-href="${id}"]`
                );
                elements.forEach(el => this.applyElementCSS(el, css));
            });

            // Apply content to elements
            Object.entries(state.content || {}).forEach(([id, content]) => {
                const elements = document.querySelectorAll(
                    `[data-editable="${id}"], [data-editor-id="${id}"], [data-image-editable="${id}"]`
                );
                elements.forEach(el => this.applyElementContent(el, content));
            });

            // Apply background
            if (state.metadata?.background) {
                this.applyBackgroundState(state.metadata.background);
            }
        }

        // ── Apply CSS to element ──────────────────────────────────────────────
        applyElementCSS(el, css) {
            if (!el || !css) return;

            if (css.cssText) {
                el.style.cssText = css.cssText;
            }
            
            Object.entries(css).forEach(([prop, value]) => {
                if (prop === 'cssText' || prop === 'nested' || prop === 'datasetZIndex') return;
                if (prop === 'tx' || prop === 'ty' || prop === 'rotation') {
                    // Dataset properties
                    if (prop === 'tx') el.dataset.editorTx = value;
                    if (prop === 'ty') el.dataset.editorTy = value;
                    if (prop === 'rotation') el.dataset.editorRotation = value;
                } else {
                    // Style properties
                    try {
                        el.style[prop] = value;
                    } catch (e) { }
                }
            });

            if (css.datasetZIndex !== undefined) {
                el.dataset.zIndex = css.datasetZIndex;
            }

            // Update CSS variables for animations/transforms
            if (css.tx !== undefined || css.ty !== undefined) {
                el.style.setProperty('--el-tx', (parseFloat(css.tx) || 0) + 'px');
                el.style.setProperty('--el-ty', (parseFloat(css.ty) || 0) + 'px');
            }

            if (Array.isArray(css.nested)) {
                css.nested.forEach((entry) => {
                    const targetNode = this.resolveRelativeNodePath(el, entry.path);
                    if (!targetNode || !targetNode.style) return;
                    if (entry.cssText) {
                        targetNode.style.cssText = entry.cssText;
                    }
                    if (entry.src && targetNode.tagName === 'IMG') {
                        targetNode.setAttribute('src', entry.src);
                    }
                });
            }
        }

        // ── Apply content to element ──────────────────────────────────────────
        applyElementContent(el, content) {
            if (!el || content === undefined) return;

            // For images
            if (el.tagName === 'IMG') {
                el.src = content;
            } else if (el.hasAttribute('data-image-editable')) {
                const childImg = el.querySelector('img');
                if (childImg) {
                    childImg.src = content;
                } else {
                    el.style.backgroundImage = `url('${content}')`;
                }
            }
            // For text - use innerHTML to preserve formatting
            else if (el.hasAttribute('data-editable') || el.hasAttribute('data-editor-id') || el.isContentEditable) {
                el.innerHTML = content;
            }
        }

        // ── Apply background state ────────────────────────────────────────────
        applyBackgroundState(bgData) {
            if (!bgData) return;

            try {
                sessionStorage.setItem('html-editor-background', JSON.stringify(bgData));

                // Apply to DOM via style override
                let override = document.getElementById('__bg_override__');
                if (!override) {
                    override = document.createElement('style');
                    override.id = '__bg_override__';
                    document.head.appendChild(override);
                }

                let css = '';
                if (bgData.backgroundImage && bgData.backgroundImage !== 'none') {
                    css = `html,body{background-image:${bgData.backgroundImage}!important;background-size:${bgData.backgroundSize || 'cover'}!important;background-position:${bgData.backgroundPosition || 'center'}!important;background-color:${bgData.backgroundColor || 'transparent'}!important;background-repeat:${bgData.backgroundRepeat || 'no-repeat'}!important;background-attachment:${bgData.backgroundAttachment || 'scroll'}!important;}`;
                } else if (bgData.background && bgData.background !== 'none') {
                    css = `html,body{background:${bgData.background}!important;background-image:none!important;}`;
                } else if (bgData.backgroundColor) {
                    css = `html,body{background-color:${bgData.backgroundColor}!important;background-image:none!important;}`;
                }

                if (css) {
                    override.textContent = css;
                }

                // Also apply directly to body as fallback
                const body = document.body;
                if (body) {
                    if (bgData.backgroundColor !== undefined) body.style.backgroundColor = bgData.backgroundColor;
                    if (bgData.backgroundImage !== undefined) body.style.backgroundImage = bgData.backgroundImage;
                    if (bgData.backgroundSize !== undefined) body.style.backgroundSize = bgData.backgroundSize;
                    if (bgData.backgroundPosition !== undefined) body.style.backgroundPosition = bgData.backgroundPosition;
                    if (bgData.backgroundRepeat !== undefined) body.style.backgroundRepeat = bgData.backgroundRepeat;
                    if (bgData.backgroundAttachment !== undefined) body.style.backgroundAttachment = bgData.backgroundAttachment;
                }
            } catch (e) {
                console.error('[State Manager] Failed to apply background:', e);
            }
        }

        // ── Save state with debounce ──────────────────────────────────────────
        saveStateDebounced() {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.saveState();
            }, this.debounceDelay);
        }

        // ── Save current state to undo stack ──────────────────────────────────
        saveState() {
            const state = this.captureCurrentState();

            // Don't save if identical to last state
            if (this.undoStack.length > 0) {
                const lastState = this.undoStack[this.undoStack.length - 1];
                if (JSON.stringify(lastState) === JSON.stringify(state)) {
                    return;
                }
            }

            this.undoStack.push(state);

            // Limit stack size
            if (this.undoStack.length > this.maxStackSize) {
                this.undoStack.shift();
            }

            // Clear redo stack on new action
            this.redoStack = [];

            console.log('[State Manager] State saved. Undo stack:', this.undoStack.length);
        }

        // ── Undo ──────────────────────────────────────────────────────────────
        undo() {
            if (this.undoStack.length === 0) {
                console.log('[State Manager] Nothing to undo');
                return false;
            }

            // Save current state to redo stack
            const currentState = this.captureCurrentState();
            this.redoStack.push(currentState);

            // Pop and apply previous state
            const previousState = this.undoStack.pop();
            this.applyState(previousState);

            console.log('[State Manager] Undo applied. Undo stack:', this.undoStack.length, 'Redo stack:', this.redoStack.length);
            return true;
        }

        // ── Redo ──────────────────────────────────────────────────────────────
        redo() {
            if (this.redoStack.length === 0) {
                console.log('[State Manager] Nothing to redo');
                return false;
            }

            // Save current state to undo stack
            const currentState = this.captureCurrentState();
            this.undoStack.push(currentState);

            // Pop and apply next state
            const nextState = this.redoStack.pop();
            this.applyState(nextState);

            console.log('[State Manager] Redo applied. Undo stack:', this.undoStack.length, 'Redo stack:', this.redoStack.length);
            return true;
        }

        // ── Save to localStorage ──────────────────────────────────────────────
        saveToLocalStorage(scope) {
            const state = this.captureCurrentState();
            const key = this.getStorageKey(scope);

            try {
                localStorage.setItem(key, JSON.stringify(state));
                console.log('[State Manager] Saved to localStorage:', key);
                return true;
            } catch (e) {
                console.error('[State Manager] Failed to save to localStorage:', e);
                return false;
            }
        }

        // ── Load from localStorage ────────────────────────────────────────────
        loadFromLocalStorage(scope) {
            const key = this.getStorageKey(scope);

            try {
                const data = localStorage.getItem(key);
                if (!data) return null;

                const state = JSON.parse(data);
                console.log('[State Manager] Loaded from localStorage:', key);
                return state;
            } catch (e) {
                console.error('[State Manager] Failed to load from localStorage:', e);
                return null;
            }
        }

        // ── Get storage key ───────────────────────────────────────────────────
        getStorageKey(scope) {
            if (!scope || !scope.key) {
                return 'editor-state:default';
            }
            return `editor-state:${scope.key}`;
        }

        // ── Clear storage ─────────────────────────────────────────────────────
        clearStorage(scope) {
            const key = this.getStorageKey(scope);
            localStorage.removeItem(key);
            console.log('[State Manager] Cleared storage:', key);
        }

        // ── Get stack info ────────────────────────────────────────────────────
        getStackInfo() {
            return {
                canUndo: this.undoStack.length > 0,
                canRedo: this.redoStack.length > 0,
                undoCount: this.undoStack.length,
                redoCount: this.redoStack.length
            };
        }
    }

    // ── Export to global scope ────────────────────────────────────────────────
    window.EditorStateManager = EditorStateManager;

    // Create global instance
    if (!window.editorStateManager) {
        window.editorStateManager = new EditorStateManager();
        console.log('[State Manager] Initialized');
    }
})();