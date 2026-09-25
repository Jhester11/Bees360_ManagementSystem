import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function mount() {
    const listeners = new Map();
    const frames = new Map();
    const timers = new Map();
    const state = [];
    let boot = true;
    let effect;
    let serial = 0;
    const document = { documentElement: { dataset: {} }, getElementById: () => boot ? { remove: () => { boot = false; } } : null };
    const window = {
        location: new URL('http://localhost/operations/quality-assurance'),
        requestAnimationFrame: fn => { frames.set(++serial, fn); return serial; },
        cancelAnimationFrame: id => frames.delete(id),
        setTimeout: fn => { timers.set(++serial, fn); return serial; },
        clearTimeout: id => timers.delete(id),
        dispatchEvent: () => {},
    };
    const router = { on: (name, fn) => { listeners.set(name, fn); return () => listeners.delete(name); } };
    const hooks = {
        useState: initial => { const index = state.length; state.push(initial); return [initial, value => { state[index] = value; }]; },
        useRef: value => ({ current: value }),
        useEffect: fn => { effect = fn; },
    };
    const source = fs.readFileSync('resources/js/components/page-loading-overlay.tsx', 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, { exports, require: name => name === '@inertiajs/react' ? { router } : name === 'react' ? hooks : {}, window, document, URL, CustomEvent: class {} });
    exports.PageLoadingOverlay();
    const cleanup = effect();
    const flush = () => { while (frames.size) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); } };
    return { state, document, timers, cleanup, flush, boot: () => boot,
        visit: (name, path, extra = {}) => listeners.get(name)?.({ detail: { visit: { url: `http://localhost${path}`, method: 'get', ...extra } } }),
        event: name => listeners.get(name)?.({ detail: { page: { url: '/login' } } }),
    };
}

test('boot skeleton clears after React commit without waiting for window load', () => {
    const app = mount();
    assert.equal(app.boot(), false);
    app.flush();
    assert.equal(app.document.documentElement.dataset.pageLoading, undefined);
    app.cleanup();
});

test('cancelled before events and background refreshes never show the overlay', () => {
    const app = mount();
    app.visit('before', '/dashboard');
    app.visit('start', '/dashboard', { prefetch: true });
    app.visit('start', '/operations/quality-assurance');
    assert.equal(app.state[0], false);
    app.cleanup();
});

for (const event of ['navigate', 'exception', 'invalid']) {
    test(`${event} clears an active loader, including redirect to another URL`, () => {
        const app = mount();
        app.visit('start', '/dashboard');
        assert.equal(app.state[0], true);
        app.event(event);
        app.flush();
        assert.equal(app.state[0], false);
        assert.equal(app.timers.size, 0);
        assert.equal(app.document.documentElement.dataset.pageLoading, undefined);
        app.cleanup();
    });
}

test('finishing an older visit does not clear a newer navigation', () => {
    const app = mount();
    app.visit('start', '/dashboard');
    app.visit('start', '/operations/processors');
    app.visit('finish', '/dashboard');
    app.flush();
    assert.equal(app.state[0], true);
    app.visit('finish', '/operations/processors');
    app.flush();
    assert.equal(app.state[0], false);
    app.cleanup();
});

test('slow requests offer recovery and finishing clears the slow state', () => {
    const app = mount();
    app.visit('start', '/dashboard');
    [...app.timers.values()].forEach(fn => fn());
    assert.equal(app.state[1], true);
    app.visit('finish', '/dashboard');
    app.flush();
    assert.equal(app.state[1], false);
    app.cleanup();
});
