// browser-mock.js - Browser API Mock for Node.js CLI Testing
// Mocks DOM, localStorage, requestAnimationFrame, etc.

// In-memory storage mock
const storageData = new Map();

const localStorageMock = {
    getItem(key) {
        return storageData.has(key) ? storageData.get(key) : null;
    },
    setItem(key, value) {
        storageData.set(key, String(value));
    },
    removeItem(key) {
        storageData.delete(key);
    },
    clear() {
        storageData.clear();
    },
    get length() {
        return storageData.size;
    },
    key(index) {
        const keys = Array.from(storageData.keys());
        return keys[index] || null;
    }
};

// Simple DOM element mock
class MockElement {
    constructor(tagName) {
        this.tagName = tagName.toUpperCase();
        this.className = '';
        this.id = '';
        this.textContent = '';
        this.innerHTML = '';
        this.style = new MockStyle();
        this.children = [];
        this.parentNode = null;
        this.attributes = new Map();
        this.eventListeners = new Map();
        this.src = '';
        this.value = '';
        this.checked = false;
        this.disabled = false;
    }

    appendChild(child) {
        if (child.parentNode) {
            child.parentNode.removeChild(child);
        }
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parentNode = null;
        }
        return child;
    }

    remove() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    }

    setAttribute(name, value) {
        this.attributes.set(name, value);
        if (name === 'class') this.className = value;
        if (name === 'id') this.id = value;
    }

    getAttribute(name) {
        if (name === 'class') return this.className;
        if (name === 'id') return this.id;
        return this.attributes.get(name) || null;
    }

    addEventListener(event, handler) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(handler);
    }

    removeEventListener(event, handler) {
        if (this.eventListeners.has(event)) {
            const handlers = this.eventListeners.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    dispatchEvent(event) {
        if (this.eventListeners.has(event.type)) {
            this.eventListeners.get(event.type).forEach(handler => handler(event));
        }
        return true;
    }

    querySelector(selector) {
        return this._findElement(selector);
    }

    querySelectorAll(selector) {
        return this._findAllElements(selector);
    }

    _findElement(selector) {
        // Simple selector matching
        for (const child of this.children) {
            if (this._matchesSelector(child, selector)) {
                return child;
            }
            const found = child._findElement(selector);
            if (found) return found;
        }
        return null;
    }

    _findAllElements(selector) {
        const results = [];
        for (const child of this.children) {
            if (this._matchesSelector(child, selector)) {
                results.push(child);
            }
            results.push(...child._findAllElements(selector));
        }
        return results;
    }

    _matchesSelector(element, selector) {
        if (selector.startsWith('#')) {
            return element.id === selector.slice(1);
        }
        if (selector.startsWith('.')) {
            return element.className.split(' ').includes(selector.slice(1));
        }
        return element.tagName === selector.toUpperCase();
    }

    get firstChild() {
        return this.children[0] || null;
    }

    get lastChild() {
        return this.children[this.children.length - 1] || null;
    }

    get childNodes() {
        return this.children;
    }

    cloneNode(deep = false) {
        const clone = new MockElement(this.tagName);
        clone.className = this.className;
        clone.id = this.id;
        clone.textContent = this.textContent;
        clone.innerHTML = this.innerHTML;
        clone.style = { ...this.style };
        clone.attributes = new Map(this.attributes);
        if (deep) {
            for (const child of this.children) {
                clone.appendChild(child.cloneNode(true));
            }
        }
        return clone;
    }

    getBoundingClientRect() {
        return {
            top: 0,
            left: 0,
            right: 100,
            bottom: 100,
            width: 100,
            height: 100,
            x: 0,
            y: 0
        };
    }

    focus() {}
    blur() {}
    click() {
        this.dispatchEvent({ type: 'click' });
    }
}

class MockStyle {
    constructor() {
        this.display = '';
        this.visibility = '';
        this.opacity = '';
        this.position = '';
        this.top = '';
        this.left = '';
        this.right = '';
        this.bottom = '';
        this.width = '';
        this.height = '';
        this.margin = '';
        this.padding = '';
        this.backgroundColor = '';
        this.color = '';
        this.border = '';
        this.transform = '';
        this.transition = '';
        this.zIndex = '';
    }
}

// Document mock
const bodyElement = new MockElement('body');
const documentElement = new MockElement('html');
documentElement.appendChild(bodyElement);

const documentMock = {
    body: bodyElement,
    documentElement: documentElement,

    createElement(tagName) {
        return new MockElement(tagName);
    },

    createTextNode(text) {
        const node = new MockElement('#text');
        node.textContent = text;
        return node;
    },

    getElementById(id) {
        return bodyElement._findElement('#' + id);
    },

    querySelector(selector) {
        return bodyElement._findElement(selector);
    },

    querySelectorAll(selector) {
        return bodyElement._findAllElements(selector);
    },

    getElementsByClassName(className) {
        return bodyElement._findAllElements('.' + className);
    },

    getElementsByTagName(tagName) {
        return bodyElement._findAllElements(tagName);
    },

    addEventListener(event, handler) {
        bodyElement.addEventListener(event, handler);
    },

    removeEventListener(event, handler) {
        bodyElement.removeEventListener(event, handler);
    }
};

// Window mock
let animationFrameId = 0;
const animationFrameCallbacks = new Map();
let isAnimationRunning = false;

const windowMock = {
    innerWidth: 1024,
    innerHeight: 768,
    devicePixelRatio: 1,
    localStorage: localStorageMock,
    document: documentMock,

    requestAnimationFrame(callback) {
        const id = ++animationFrameId;
        animationFrameCallbacks.set(id, callback);

        // Execute immediately for testing (synchronous)
        if (!isAnimationRunning) {
            setImmediate(() => {
                const cb = animationFrameCallbacks.get(id);
                if (cb) {
                    animationFrameCallbacks.delete(id);
                    cb(performance.now());
                }
            });
        }

        return id;
    },

    cancelAnimationFrame(id) {
        animationFrameCallbacks.delete(id);
    },

    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,

    addEventListener(event, handler) {
        // Mock window event listeners
    },

    removeEventListener(event, handler) {
        // Mock window event listeners
    },

    getComputedStyle(element) {
        return element.style;
    },

    matchMedia(query) {
        return {
            matches: false,
            media: query,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {}
        };
    },

    location: {
        href: 'http://localhost/',
        pathname: '/',
        search: '',
        hash: ''
    },

    navigator: {
        userAgent: 'MockBrowser/1.0 Node.js',
        platform: 'Node.js',
        language: 'ja-JP'
    },

    console: global.console,
    Math: global.Math,
    Date: global.Date,
    JSON: global.JSON,
    performance: global.performance || {
        now() {
            return Date.now();
        }
    }
};

// Performance mock (if not available)
const performanceMock = global.performance || {
    now() {
        const [seconds, nanoseconds] = process.hrtime();
        return seconds * 1000 + nanoseconds / 1000000;
    },
    mark() {},
    measure() {},
    clearMarks() {},
    clearMeasures() {}
};

// Image mock for asset loading
class MockImage {
    constructor(width, height) {
        this.width = width || 0;
        this.height = height || 0;
        this.src = '';
        this.onload = null;
        this.onerror = null;
        this.complete = false;
    }

    set src(value) {
        this._src = value;
        // Simulate async image loading
        setImmediate(() => {
            this.complete = true;
            if (this.onload) {
                this.onload();
            }
        });
    }

    get src() {
        return this._src || '';
    }
}

// Audio mock
class MockAudio {
    constructor(src) {
        this.src = src || '';
        this.volume = 1;
        this.muted = false;
        this.paused = true;
        this.currentTime = 0;
        this.duration = 0;
    }

    play() {
        this.paused = false;
        return Promise.resolve();
    }

    pause() {
        this.paused = true;
    }

    load() {}
}

// Canvas mock
class MockCanvasRenderingContext2D {
    constructor() {
        this.fillStyle = '#000';
        this.strokeStyle = '#000';
        this.lineWidth = 1;
        this.font = '10px sans-serif';
        this.textAlign = 'start';
        this.textBaseline = 'alphabetic';
        this.globalAlpha = 1;
        this.globalCompositeOperation = 'source-over';
    }

    fillRect() {}
    strokeRect() {}
    clearRect() {}
    beginPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    arc() {}
    arcTo() {}
    quadraticCurveTo() {}
    bezierCurveTo() {}
    rect() {}
    fill() {}
    stroke() {}
    clip() {}
    save() {}
    restore() {}
    scale() {}
    rotate() {}
    translate() {}
    transform() {}
    setTransform() {}
    drawImage() {}
    fillText() {}
    strokeText() {}
    measureText(text) {
        return { width: text.length * 10 };
    }
    createLinearGradient() {
        return { addColorStop() {} };
    }
    createRadialGradient() {
        return { addColorStop() {} };
    }
    createPattern() {
        return {};
    }
    getImageData() {
        return { data: new Uint8ClampedArray(0), width: 0, height: 0 };
    }
    putImageData() {}
    createImageData() {
        return { data: new Uint8ClampedArray(0), width: 0, height: 0 };
    }
    isPointInPath() { return false; }
    isPointInStroke() { return false; }
}

class MockCanvas extends MockElement {
    constructor() {
        super('canvas');
        this.width = 300;
        this.height = 150;
        this._context2d = new MockCanvasRenderingContext2D();
    }

    getContext(type) {
        if (type === '2d') {
            return this._context2d;
        }
        return null;
    }

    toDataURL() {
        return 'data:image/png;base64,';
    }

    toBlob(callback) {
        callback(new Blob());
    }
}

// Event mock
class MockEvent {
    constructor(type, options = {}) {
        this.type = type;
        this.bubbles = options.bubbles || false;
        this.cancelable = options.cancelable || false;
        this.defaultPrevented = false;
        this.target = options.target || null;
        this.currentTarget = null;
        this.timeStamp = Date.now();
    }

    preventDefault() {
        this.defaultPrevented = true;
    }

    stopPropagation() {}
    stopImmediatePropagation() {}
}

// Install mocks into global scope
function installMocks() {
    global.window = windowMock;
    global.document = documentMock;
    global.localStorage = localStorageMock;
    global.requestAnimationFrame = windowMock.requestAnimationFrame;
    global.cancelAnimationFrame = windowMock.cancelAnimationFrame;
    global.performance = performanceMock;
    global.Image = MockImage;
    global.Audio = MockAudio;
    global.HTMLCanvasElement = MockCanvas;
    global.Event = MockEvent;
    global.MouseEvent = MockEvent;
    global.KeyboardEvent = MockEvent;
    global.TouchEvent = MockEvent;

    // Override createElement to handle canvas
    const originalCreateElement = documentMock.createElement;
    documentMock.createElement = function(tagName) {
        if (tagName.toLowerCase() === 'canvas') {
            return new MockCanvas();
        }
        return originalCreateElement.call(this, tagName);
    };
}

// Reset mocks to initial state
function resetMocks() {
    storageData.clear();
    bodyElement.children = [];
    animationFrameCallbacks.clear();
    animationFrameId = 0;
    isAnimationRunning = false;
}

// Utility to run animation frames synchronously for testing
function flushAnimationFrames(maxFrames = 100) {
    let frameCount = 0;
    while (animationFrameCallbacks.size > 0 && frameCount < maxFrames) {
        const callbacks = Array.from(animationFrameCallbacks.entries());
        animationFrameCallbacks.clear();
        callbacks.forEach(([id, cb]) => {
            cb(performanceMock.now());
        });
        frameCount++;
    }
    return frameCount;
}

// Synchronous animation frame execution for testing
function runAnimationFrame() {
    const callbacks = Array.from(animationFrameCallbacks.entries());
    animationFrameCallbacks.clear();
    callbacks.forEach(([id, cb]) => {
        cb(performanceMock.now());
    });
    return callbacks.length;
}

// Export mocks and utilities
export {
    localStorageMock,
    documentMock,
    windowMock,
    performanceMock,
    MockElement,
    MockImage,
    MockAudio,
    MockCanvas,
    MockEvent,
    installMocks,
    resetMocks,
    flushAnimationFrames,
    runAnimationFrame,
    storageData
};

// Auto-install if running as main module
installMocks();
