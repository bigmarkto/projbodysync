import test, { afterEach, before, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = process.cwd();
const req = createRequire(path.join(rootDir, 'package.json'));

// Shared mutable state for native boundary doubles (must stay plain JS inside stubs)
const rnState = {
  platformOs: 'android',
  openedUrls: [] as string[],
};

const asyncStorageStore = new Map<string, string>();
(globalThis as any).__bodysyncTestBridge = {
  rnState,
  asyncStorageStore,
  React: req('react'),
};

const stubSources: Record<string, string> = {
  'stub:react-native': `
    const bridge = globalThis.__bodysyncTestBridge;
    const React = bridge.React;
    const makeHost = (name) => function RnDouble(props) {
      const safeProps = { 'data-rn': name };
      if (props?.accessibilityLabel) safeProps['aria-label'] = props.accessibilityLabel;
      if (typeof props?.onPress === 'function') safeProps.onClick = props.onPress;
      return React.createElement('div', safeProps, props?.children);
    };
    export const Platform = {
      get OS() { return bridge.rnState.platformOs; },
      set OS(val) { bridge.rnState.platformOs = val; },
      select(obj) { return obj?.[bridge.rnState.platformOs] ?? obj?.default; },
    };
    export const StyleSheet = { create: (styles) => styles };
    export const Linking = {
      async openURL(url) {
        bridge.rnState.openedUrls.push(url);
        return true;
      },
    };
    export const Share = {
      dismissedAction: 'dismissedAction',
      async share() { return { action: 'sharedAction' }; },
    };
    export const Alert = { alert() {} };
    export const View = makeHost('View');
    export const Text = makeHost('Text');
    export const TextInput = makeHost('TextInput');
    export const TouchableOpacity = makeHost('TouchableOpacity');
    export const Pressable = makeHost('Pressable');
    export const Modal = makeHost('Modal');
    export const ScrollView = makeHost('ScrollView');
    export const ActivityIndicator = makeHost('ActivityIndicator');
    export const KeyboardAvoidingView = makeHost('KeyboardAvoidingView');
    export const Switch = makeHost('Switch');
    export const Animated = {
      Value: class AnimatedValue {
        constructor(v) { this.value = v; }
        setValue(v) { this.value = v; }
      },
      View: makeHost('Animated.View'),
      timing: () => ({ start: (cb) => cb?.({ finished: true }) }),
      spring: () => ({ start: (cb) => cb?.({ finished: true }) }),
      parallel: () => ({ start: (cb) => cb?.({ finished: true }) }),
      sequence: () => ({ start: (cb) => cb?.({ finished: true }) }),
    };
    export default {
      Platform,
      StyleSheet,
      Linking,
      Share,
      Alert,
      View,
      Text,
      TextInput,
      TouchableOpacity,
      Pressable,
      Modal,
      ScrollView,
      ActivityIndicator,
      KeyboardAvoidingView,
      Switch,
      Animated,
    };
  `,
  'stub:async-storage': `
    const store = globalThis.__bodysyncTestBridge.asyncStorageStore;
    const AsyncStorage = {
      async getItem(k) { return store.has(k) ? store.get(k) : null; },
      async setItem(k, v) { store.set(k, String(v)); },
      async removeItem(k) { store.delete(k); },
      async multiGet(keys) { return keys.map((k) => [k, store.has(k) ? store.get(k) : null]); },
      async multiSet(pairs) { for (const [k, v] of pairs) store.set(k, String(v)); },
      async multiRemove(keys) { for (const k of keys) store.delete(k); },
      async clear() { store.clear(); },
    };
    export default AsyncStorage;
  `,
  'stub:vector-icons': `
    const React = globalThis.__bodysyncTestBridge.React;
    export const Ionicons = function Ionicons(props) {
      return React.createElement('span', { 'data-icon': props?.name ?? '' });
    };
  `,
  'stub:datetimepicker': `
    export default function DateTimePicker() { return null; }
  `,
  'stub:safe-area': `
    export const SafeAreaView = ({ children }) => children ?? null;
  `,
  'stub:navigation': `
    export const useNavigation = () => ({ navigate() {}, replace() {}, goBack() {} });
  `,
};

const bareBoundaryMap: Record<string, string> = {
  'react-native': 'stub:react-native',
  '@react-native-async-storage/async-storage': 'stub:async-storage',
  '@expo/vector-icons': 'stub:vector-icons',
  '@react-native-community/datetimepicker': 'stub:datetimepicker',
  'react-native-safe-area-context': 'stub:safe-area',
  '@react-navigation/native': 'stub:navigation',
};

if (typeof Module.registerHooks === 'function') {
  Module.registerHooks({
    resolve(specifier, context, nextResolve) {
      if (bareBoundaryMap[specifier]) {
        return { url: bareBoundaryMap[specifier], shortCircuit: true };
      }
      if (specifier.startsWith('@/')) {
        const base = path.resolve(rootDir, 'src', specifier.slice(2));
        for (const ext of ['', '.ts', '.tsx', '.js', '.jsx']) {
          const candidate = base + ext;
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return { url: pathToFileURL(candidate).href, shortCircuit: true };
          }
        }
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (stubSources[url]) {
        return {
          format: 'module',
          source: stubSources[url],
          shortCircuit: true,
        };
      }
      return nextLoad(url, context);
    },
  });
}

async function importSrc(relPath: string): Promise<any> {
  const fullPath = path.resolve(rootDir, relPath);
  return import(pathToFileURL(fullPath).href);
}

// Minimal DOM harness for mounting real React providers/components with react-dom/client
function createMinimalDom() {
  const makeNode = (nodeType: number, tagName = ''): any => {
    const children: any[] = [];
    const node: any = {
      nodeType,
      tagName: tagName.toUpperCase(),
      nodeName: tagName.toUpperCase(),
      namespaceURI: 'http://www.w3.org/1999/xhtml',
      childNodes: children,
      parentNode: null,
      ownerDocument: null,
      style: {},
      props: {} as Record<string, any>,
      setAttribute(k: string, v: string) {
        node.props[k] = v;
      },
      removeAttribute(k: string) {
        delete node.props[k];
      },
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true;
      },
      appendChild(child: any) {
        child.parentNode = node;
        children.push(child);
        return child;
      },
      removeChild(child: any) {
        const idx = children.indexOf(child);
        if (idx >= 0) children.splice(idx, 1);
        child.parentNode = null;
        return child;
      },
      insertBefore(child: any, ref: any) {
        child.parentNode = node;
        const idx = ref ? children.indexOf(ref) : -1;
        if (idx >= 0) children.splice(idx, 0, child);
        else children.push(child);
        return child;
      },
      get firstChild() {
        return children[0] ?? null;
      },
      get lastChild() {
        return children[children.length - 1] ?? null;
      },
      get nextSibling() {
        if (!node.parentNode) return null;
        const sibs = node.parentNode.childNodes;
        return sibs[sibs.indexOf(node) + 1] ?? null;
      },
      set textContent(_v: string) {
        children.length = 0;
      },
      get textContent() {
        return '';
      },
    };
    return node;
  };

  const doc: any = {
    nodeType: 9,
    defaultView: {
      HTMLIFrameElement: function HTMLIFrameElement() {},
    },
    documentElement: makeNode(1, 'html'),
    body: makeNode(1, 'body'),
    activeElement: null,
    addEventListener() {},
    removeEventListener() {},
    createElement(tag: string) {
      const n = makeNode(1, tag);
      n.ownerDocument = doc;
      return n;
    },
    createElementNS(_ns: string, tag: string) {
      const n = makeNode(1, tag);
      n.ownerDocument = doc;
      return n;
    },
    createTextNode(text: string) {
      const n = makeNode(3);
      n.nodeValue = text;
      n.data = text;
      n.ownerDocument = doc;
      return n;
    },
    createComment(text: string) {
      const n = makeNode(8);
      n.nodeValue = text;
      n.ownerDocument = doc;
      return n;
    },
  };
  doc.defaultView.window = doc.defaultView;
  doc.HTMLIFrameElement = doc.defaultView.HTMLIFrameElement;
  doc.documentElement.ownerDocument = doc;
  doc.body.ownerDocument = doc;
  return doc;
}

async function withMountedReact(
  renderElement: (React: any) => any,
  fn: (ctx: { act: any; container: any }) => Promise<void> | void
) {
  const React = req('react');
  const { createRoot } = req('react-dom/client');
  const doc = createMinimalDom();
  const prevGlobals = {
    window: (globalThis as any).window,
    document: (globalThis as any).document,
    Node: (globalThis as any).Node,
    Element: (globalThis as any).Element,
    HTMLElement: (globalThis as any).HTMLElement,
    HTMLIFrameElement: (globalThis as any).HTMLIFrameElement,
    IS_REACT_ACT_ENVIRONMENT: (globalThis as any).IS_REACT_ACT_ENVIRONMENT,
  };

  (globalThis as any).window = doc.defaultView;
  (globalThis as any).document = doc;
  (globalThis as any).Node = function Node() {};
  (globalThis as any).Element = function Element() {};
  (globalThis as any).HTMLElement = function HTMLElement() {};
  (globalThis as any).HTMLIFrameElement = doc.HTMLIFrameElement;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

  const container = doc.createElement('div');
  const root = createRoot(container);

  try {
    await React.act(async () => {
      root.render(renderElement(React));
    });
    await fn({ act: React.act, container });
  } finally {
    await React.act(async () => {
      root.unmount();
    });
    for (const [k, v] of Object.entries(prevGlobals)) {
      if (v === undefined) delete (globalThis as any)[k];
      else (globalThis as any)[k] = v;
    }
  }
}

function makeJwt(expOffsetSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ userId: 'u-1', exp: Math.floor(Date.now() / 1000) + expOffsetSeconds })
  ).toString('base64url');
  return `${header}.${payload}.sig`;
}

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let apiMod: any;
let dateMod: any;
let hiitMod: any;
let registerCtxMod: any;
let registerHookMod: any;
let apiHookMod: any;
let authCtxMod: any;
let themeMod: any;
let evalCardMod: any;
let trainerMod: any;
let loginMod: any;

const originalFetch = globalThis.fetch;
const originalEnvApiUrl = process.env.EXPO_PUBLIC_API_URL;

before(async () => {
  apiMod = await importSrc('src/config/api.ts');
  dateMod = await importSrc('src/components/DateTimePickerField.tsx');
  hiitMod = await importSrc('src/screens/Workouts/hiit.ts');
  registerCtxMod = await importSrc('src/screens/Registration/RegisterContext.tsx');
  registerHookMod = await importSrc('src/hooks/useRegister.ts');
  authCtxMod = await importSrc('src/context/AuthContext.tsx');
  apiHookMod = await importSrc('src/hooks/useApi.ts');
  themeMod = await importSrc('src/context/ThemeProvider.tsx');
  evalCardMod = await importSrc('src/components/EvaluationCard.tsx');
  trainerMod = await importSrc('src/screens/Trainer/trainerService.ts');
  loginMod = await importSrc('src/screens/LoginScreen.tsx');
});

beforeEach(async () => {
  rnState.platformOs = 'android';
  rnState.openedUrls = [];
  asyncStorageStore.clear();
  delete process.env.EXPO_PUBLIC_API_URL;
  globalThis.fetch = originalFetch;
  await apiMod.setCustomApiUrl(null);
});

afterEach(async () => {
  globalThis.fetch = originalFetch;
  if (originalEnvApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalEnvApiUrl;
  await apiMod.setCustomApiUrl(null);
});

describe('1. src/config/api.ts', () => {
  test('normalizeApiUrl trims whitespace, strips trailing slashes, and ensures /api suffix', () => {
    assert.equal(
      apiMod.SUPABASE_CLOUD_API_URL,
      'https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api'
    );
    assert.equal(
      apiMod.normalizeApiUrl('https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api///'),
      'https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api'
    );
    assert.equal(apiMod.normalizeApiUrl('  http://10.0.2.2:3000///  '), 'http://10.0.2.2:3000/api');
    assert.equal(apiMod.normalizeApiUrl('http://localhost:3000/api/'), 'http://localhost:3000/api');
    assert.equal(apiMod.normalizeApiUrl('   '), '');
  });

  test('resolveApiUrl defaults to SUPABASE_CLOUD_API_URL and supports web hostname / explicit overrides', () => {
    assert.equal(
      apiMod.resolveApiUrl(),
      'https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api'
    );
    assert.equal(
      apiMod.resolveApiUrl({ platformOs: 'android', customUrl: null, envUrl: '' }),
      'https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api'
    );
    assert.equal(
      apiMod.resolveApiUrl({ platformOs: 'web', hostname: 'meuapp.local', customUrl: null, envUrl: '' }),
      'http://meuapp.local:3000/api'
    );
    assert.equal(
      apiMod.resolveApiUrl({
        platformOs: 'web',
        hostname: 'localhost',
        customUrl: null,
        envUrl: apiMod.SUPABASE_CLOUD_API_URL,
      }),
      'https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api'
    );
    assert.equal(
      apiMod.resolveApiUrl({ platformOs: 'android', envUrl: 'https://staging.bodysync.test', customUrl: null }),
      'https://staging.bodysync.test/api'
    );
    assert.equal(
      apiMod.resolveApiUrl({
        platformOs: 'web',
        hostname: 'meuapp.local',
        envUrl: 'https://staging.bodysync.test',
        customUrl: 'https://custom.bodysync.test/',
      }),
      'https://custom.bodysync.test/api'
    );
  });

  test('getApiCandidates uses SUPABASE_CLOUD_API_URL only by default on mobile and deduplicates URLs', () => {
    assert.deepEqual(
      apiMod.getApiCandidates({ platformOs: 'android', customUrl: null, envUrl: '' }),
      ['https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api']
    );

    const ordered = apiMod.getApiCandidates({
      platformOs: 'android',
      customUrl: 'https://custom.bodysync.test/',
      envUrl: 'https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api',
    });

    assert.deepEqual(ordered, [
      'https://custom.bodysync.test/api',
      'https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api',
    ]);
  });

  test('setCustomApiUrl and loadCustomApiUrl persist cloud URLs and clear legacy local/private IPs', async () => {
    assert.equal(apiMod.API_STORAGE_KEY, '@bodysync:customApiUrl');

    // Non-local HTTPS custom URL is persisted
    const saved = await apiMod.setCustomApiUrl('https://custom.bodysync.example/');
    assert.equal(saved, 'https://custom.bodysync.example/api');
    assert.equal(apiMod.getApiUrl(), 'https://custom.bodysync.example/api');
    assert.equal(asyncStorageStore.get('@bodysync:customApiUrl'), 'https://custom.bodysync.example/api');

    // Clearing custom URL resolves to Supabase Cloud
    await apiMod.setCustomApiUrl(null);
    assert.equal(asyncStorageStore.has('@bodysync:customApiUrl'), false);
    assert.equal(apiMod.getApiUrl(), 'https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api');

    // Legacy local/private URLs in AsyncStorage are automatically purged on loadCustomApiUrl()
    const legacyLocalUrls = [
      'http://10.0.2.2:3000/api',
      'http://192.168.200.36:3000/api',
      'http://localhost:3000/api',
      'http://127.0.0.1:3000/api',
      'http://172.16.128.108:3000',
      'http://172.31.255.1:3000/api',
      'http://10.10.0.5:3000/api',
    ];

    for (const legacyUrl of legacyLocalUrls) {
      asyncStorageStore.set('@bodysync:customApiUrl', legacyUrl);
      const loaded = await apiMod.loadCustomApiUrl();
      assert.equal(
        loaded,
        'https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api',
        `loadCustomApiUrl must fall back to cloud for ${legacyUrl}`
      );
      assert.equal(
        apiMod.getApiUrl(),
        'https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api'
      );
      assert.equal(
        asyncStorageStore.has('@bodysync:customApiUrl'),
        false,
        `loadCustomApiUrl must remove legacy URL ${legacyUrl} from AsyncStorage`
      );
    }

    // setCustomApiUrl also rejects/clears legacy local URLs
    const afterSetLocal = await apiMod.setCustomApiUrl('http://192.168.200.36:3000/api');
    assert.equal(afterSetLocal, 'https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api');
    assert.equal(asyncStorageStore.has('@bodysync:customApiUrl'), false);

    // Public/cloud URLs are NOT misclassified as legacy local URLs
    assert.equal(apiMod.isLegacyLocalApiUrl(apiMod.SUPABASE_CLOUD_API_URL), false);
    assert.equal(apiMod.isLegacyLocalApiUrl('http://172.32.0.1:3000/api'), false);
    asyncStorageStore.set('@bodysync:customApiUrl', 'https://staging.bodysync.example/api');
    const loadedCloud = await apiMod.loadCustomApiUrl();
    assert.equal(loadedCloud, 'https://staging.bodysync.example/api');
    assert.equal(asyncStorageStore.get('@bodysync:customApiUrl'), 'https://staging.bodysync.example/api');
  });

  test('probeAndResolveApiUrl probes /health and caches first reachable candidate', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://primary.bodysync.test/api';
    await apiMod.setCustomApiUrl(null);

    const probedUrls: string[] = [];
    const fetchStub = (async (input: string) => {
      probedUrls.push(String(input));
      if (String(input) === 'https://primary.bodysync.test/api/health') {
        throw new TypeError('Network request failed');
      }
      if (String(input) === `${apiMod.SUPABASE_CLOUD_API_URL}/health`) {
        return makeJsonResponse({ status: 'ok' }, 200);
      }
      return makeJsonResponse({ status: 'down' }, 503);
    }) as typeof fetch;

    const resolved = await apiMod.probeAndResolveApiUrl(fetchStub, 500);
    assert.equal(resolved, apiMod.SUPABASE_CLOUD_API_URL);
    assert.equal(apiMod.getApiUrl(), apiMod.SUPABASE_CLOUD_API_URL);
    assert.deepEqual(probedUrls, [
      'https://primary.bodysync.test/api/health',
      `${apiMod.SUPABASE_CLOUD_API_URL}/health`,
    ]);
  });

  test('fetchWithApiFallback retries on live /health candidate after network failure or native AbortError', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://primary.bodysync.test/api';
    await apiMod.setCustomApiUrl(null);

    // Case A: Network failure on primary -> probe finds cloud -> retries target path once
    const callsA: string[] = [];
    const fetchNetworkFail = (async (input: string) => {
      const url = String(input);
      callsA.push(url);
      if (url === 'https://primary.bodysync.test/api/workouts') {
        throw new TypeError('Network request failed');
      }
      if (url === `${apiMod.SUPABASE_CLOUD_API_URL}/health`) {
        return makeJsonResponse({ status: 'ok' }, 200);
      }
      if (url === `${apiMod.SUPABASE_CLOUD_API_URL}/workouts`) {
        return makeJsonResponse({ plans: [{ id: 1 }] }, 200);
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as typeof fetch;

    const resA = await apiMod.fetchWithApiFallback('/workouts', { method: 'GET' }, 1000, fetchNetworkFail);
    assert.equal(resA.status, 200);
    assert.equal(apiMod.getApiUrl(), apiMod.SUPABASE_CLOUD_API_URL);
    assert.deepEqual(callsA, [
      'https://primary.bodysync.test/api/workouts',
      `${apiMod.SUPABASE_CLOUD_API_URL}/health`,
      `${apiMod.SUPABASE_CLOUD_API_URL}/workouts`,
    ]);

    // Reset active URL back to primary and test Case B: native AbortError triggers fallback
    await apiMod.setCustomApiUrl(null);
    const callsB: string[] = [];
    const fetchAbortNative = (async (input: string) => {
      const url = String(input);
      callsB.push(url);
      if (url === 'https://primary.bodysync.test/api/auth/login') {
        const abortErr = new Error('Aborted');
        abortErr.name = 'AbortError';
        throw abortErr;
      }
      if (url === `${apiMod.SUPABASE_CLOUD_API_URL}/health`) {
        return makeJsonResponse({ status: 'ok' }, 200);
      }
      if (url === `${apiMod.SUPABASE_CLOUD_API_URL}/auth/login`) {
        return makeJsonResponse({ accessToken: 'tok' }, 200);
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as typeof fetch;

    const resB = await apiMod.fetchWithApiFallback('/auth/login', { method: 'POST' }, 1000, fetchAbortNative);
    assert.equal(resB.status, 200);
    assert.equal(apiMod.getApiUrl(), apiMod.SUPABASE_CLOUD_API_URL);
    assert.equal(callsB[1], `${apiMod.SUPABASE_CLOUD_API_URL}/health`);

    // Case C: On web, AbortError must NOT probe fallback candidates
    rnState.platformOs = 'web';
    await apiMod.setCustomApiUrl(null);
    const callsC: string[] = [];
    const fetchAbortWeb = (async (input: string) => {
      callsC.push(String(input));
      const abortErr = new Error('Aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    }) as typeof fetch;

    await assert.rejects(
      () => apiMod.fetchWithApiFallback('/auth/login', { method: 'POST' }, 1000, fetchAbortWeb),
      (err: Error) => err.name === 'AbortError'
    );
    assert.equal(callsC.length, 1);
  });
});

describe('2. src/components/DateTimePickerField.tsx', () => {
  test('toLocalDateKey formats local calendar date with zero padding', () => {
    assert.equal(dateMod.toLocalDateKey(new Date(2025, 0, 5, 23, 59)), '2025-01-05');
    assert.equal(dateMod.toLocalDateKey(new Date(2026, 10, 17, 0, 1)), '2026-11-17');
  });

  test('parseDateOnlyLocal parses YYYY-MM-DD, DD/MM/YYYY, YYYY and rejects impossible calendar dates', () => {
    const iso = dateMod.parseDateOnlyLocal('2025-11-05');
    assert.ok(iso instanceof Date);
    assert.equal(iso.getFullYear(), 2025);
    assert.equal(iso.getMonth(), 10);
    assert.equal(iso.getDate(), 5);

    const isoTimestamp = dateMod.parseDateOnlyLocal('2025-11-05T23:55:00.000Z');
    assert.ok(isoTimestamp instanceof Date);
    assert.equal(dateMod.toLocalDateKey(isoTimestamp), '2025-11-05');

    const br = dateMod.parseDateOnlyLocal('09/03/2026');
    assert.ok(br instanceof Date);
    assert.equal(dateMod.toLocalDateKey(br), '2026-03-09');

    const yearOnly = dateMod.parseDateOnlyLocal('1998');
    assert.ok(yearOnly instanceof Date);
    assert.equal(dateMod.toLocalDateKey(yearOnly), '1998-01-01');

    const leap = dateMod.parseDateOnlyLocal('2024-02-29');
    assert.ok(leap instanceof Date);
    assert.equal(dateMod.toLocalDateKey(leap), '2024-02-29');

    assert.equal(dateMod.parseDateOnlyLocal('2025-02-31'), null);
    assert.equal(dateMod.parseDateOnlyLocal('2025-02-29'), null);
    assert.equal(dateMod.parseDateOnlyLocal('31/04/2025'), null);
    assert.equal(dateMod.parseDateOnlyLocal('not-a-date'), null);
    assert.equal(dateMod.parseDateOnlyLocal(null), null);
  });

  test('formatDateBR formats full and short dates and returns empty string for invalid inputs', () => {
    assert.equal(dateMod.formatDateBR('2025-11-05'), '05/11/2025');
    assert.equal(dateMod.formatDateBR('2025-11-05', true), '05/11');
    assert.equal(dateMod.formatDateBR('07/01/2026'), '07/01/2026');
    assert.equal(dateMod.formatDateBR('2025-02-31'), '');
    assert.equal(dateMod.formatDateBR(undefined), '');
  });

  test('parseTimeHHMM and formatTimeHHMM handle valid times and 07:00 fallback', () => {
    const valid = dateMod.parseTimeHHMM('18:05');
    assert.equal(valid.getHours(), 18);
    assert.equal(valid.getMinutes(), 5);
    assert.equal(dateMod.formatTimeHHMM(valid), '18:05');

    const midnight = dateMod.parseTimeHHMM('00:00');
    assert.equal(dateMod.formatTimeHHMM(midnight), '00:00');

    const invalid = dateMod.parseTimeHHMM('25:99');
    assert.equal(dateMod.formatTimeHHMM(invalid), '07:00');
    assert.equal(dateMod.formatTimeHHMM(dateMod.parseTimeHHMM(null)), '07:00');
  });
});

describe('3. src/screens/Workouts/hiit.ts', () => {
  test('buildHiitScript builds balanced segments for 10/15/20/30 min without consecutive identical groups', () => {
    const expectedWorkCount: Record<number, number> = {
      10: 9,
      15: 13,
      20: 17,
      30: 26,
    };

    for (const duration of [10, 15, 20, 30]) {
      const script = hiitMod.buildHiitScript(duration);
      assert.equal(script.length, duration);
      assert.equal(script[0].type, 'work');
      assert.equal(script[0].exercise.group, 'aquecimento');
      assert.equal(script[script.length - 1].type, 'work');
      assert.equal(script[script.length - 1].exercise.group, 'alongamento');

      let workStreak = 0;
      let prevWorkGroup: string | null = null;

      for (let i = 0; i < script.length; i++) {
        const seg = script[i];
        assert.equal(seg.durationSec, 60);
        if (seg.type === 'rest') {
          assert.equal(seg.exercise, undefined);
          assert.equal(workStreak, 5, `rest at index ${i} in ${duration}m script must follow 5 work segments`);
          assert.ok(i > 0 && i < script.length - 1, 'rest must never be first or last segment');
          workStreak = 0;
        } else {
          assert.ok(seg.exercise, 'work segment must have exercise');
          assert.notEqual(
            seg.exercise.group,
            prevWorkGroup,
            `consecutive work segments at ${i} in ${duration}m script must not repeat group ${prevWorkGroup}`
          );
          prevWorkGroup = seg.exercise.group;
          workStreak++;
        }
      }

      assert.equal(hiitMod.totalWorkMinutes(script), expectedWorkCount[duration]);
    }
  });
});

describe('4. src/screens/Registration/RegisterContext.tsx & src/hooks/useRegister.ts', () => {
  test('useRegister throws outside RegisterProvider and manages state across 7 steps inside provider', async () => {
    const React = req('react');
    assert.throws(
      () => {
        function Orphan() {
          registerCtxMod.useRegister();
          return null;
        }
        const { renderToStaticMarkup } = req('react-dom/server');
        renderToStaticMarkup(React.createElement(Orphan));
      },
      /useRegister must be used within RegisterProvider/
    );

    let ctxRef: any;
    function Probe() {
      ctxRef = registerCtxMod.useRegister();
      return null;
    }

    await withMountedReact(
      (R) => R.createElement(registerCtxMod.RegisterProvider, null, R.createElement(Probe)),
      async ({ act }) => {
        assert.deepEqual(ctxRef.data, {
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          birthYear: '',
          gender: '',
          role: 'comum',
          subscriptionType: '',
          weightKg: '',
          heightCm: '',
          desiredWeightKg: '',
          workoutDays: [],
          workoutTime: '',
          hydrationReminder: false,
          hydrationTime: '',
          modalities: [],
          experienceLevel: '',
        });

        await act(async () => {
          ctxRef.setField('name', 'Marina Silva');
          ctxRef.setField('role', 'personal');
          ctxRef.setField('workoutDays', [1, 3, 5]);
          ctxRef.setField('modalities', ['musculacao']);
          ctxRef.setField('experienceLevel', 'intermediario');
        });
        assert.equal(ctxRef.data.name, 'Marina Silva');
        assert.equal(ctxRef.data.role, 'personal');
        assert.deepEqual(ctxRef.data.workoutDays, [1, 3, 5]);

        await act(async () => {
          ctxRef.reset();
        });
        assert.equal(ctxRef.data.name, '');
        assert.equal(ctxRef.data.role, 'comum');
        assert.deepEqual(ctxRef.data.workoutDays, []);
      }
    );
  });

  test('useRegisterApi().register transforms payload accurately and preserves non-2xx error payload', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;
    let nextStatus = 201;
    let nextJson: any = { user: { id: 'u1' }, accessToken: 'a', refreshToken: 'r' };

    globalThis.fetch = (async (input: string, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedBody = JSON.parse(String(init?.body));
      return makeJsonResponse(nextJson, nextStatus);
    }) as typeof fetch;

    let apiRef: any;
    function HookConsumer() {
      apiRef = registerHookMod.useRegisterApi();
      return null;
    }

    await withMountedReact(
      (R) => R.createElement(HookConsumer),
      async () => {
        const resultOk = await apiRef.register({
          name: 'Carlos',
          email: 'carlos@test.com',
          password: 'secret',
          confirmPassword: 'secret',
          birthYear: '1995-04-12',
          gender: 'masculino',
          role: 'personal',
          subscriptionType: 'premium',
          weightKg: '82.5',
          heightCm: '180',
          desiredWeightKg: '78',
          workoutDays: [1, 3, 5],
          workoutTime: '07:30',
          hydrationReminder: true,
          hydrationTime: '09:00',
          modalities: ['musculacao'],
          experienceLevel: 'avancado',
        });

        assert.equal(resultOk.res.ok, true);
        assert.equal(capturedUrl, `${apiMod.SUPABASE_CLOUD_API_URL}/auth/register`);
        assert.equal(capturedBody.role, 'professor');
        assert.equal(capturedBody.subscriptionType, 'free');
        assert.equal(capturedBody.heightCm, 180);
        assert.equal(capturedBody.weightKg, 82.5);
        assert.equal(capturedBody.desiredWeightKg, 78);
        assert.deepEqual(capturedBody.workoutDays, [1, 3, 5]);
        assert.deepEqual(capturedBody.workoutSchedule, {
          days: [false, true, false, true, false, true, false],
          time: '07:30',
        });

        // Empty numeric fields fall back to defaults and null desiredWeightKg
        nextStatus = 409;
        nextJson = { error: 'E-mail já cadastrado' };
        const resultErr = await apiRef.register({
          name: 'Ana',
          email: 'ana@test.com',
          password: 'secret',
          confirmPassword: 'secret',
          birthYear: '',
          gender: '',
          role: 'comum',
          subscriptionType: 'basic',
          weightKg: '',
          heightCm: '',
          desiredWeightKg: '',
          workoutDays: [],
          workoutTime: '',
          hydrationReminder: false,
          hydrationTime: '',
          modalities: [],
          experienceLevel: '',
        });

        assert.equal(resultErr.res.ok, false);
        assert.equal(resultErr.res.status, 409);
        assert.equal(resultErr.json.error, 'E-mail já cadastrado');
        assert.equal(capturedBody.role, 'comum');
        assert.equal(capturedBody.heightCm, 170);
        assert.equal(capturedBody.weightKg, 70);
        assert.equal(capturedBody.desiredWeightKg, null);
        assert.equal(capturedBody.birthYear, '1990-01-01');
      }
    );
  });
});

describe('5. src/hooks/useApi.ts & src/context/AuthContext.tsx', () => {
  test('AuthProvider persists tokens, deduplicates concurrent refreshSession calls, and handles useApi 401 retry & logout', async () => {
    const validAccess = makeJwt(3600);
    const refreshedAccess = makeJwt(3600);
    const fetchCalls: Array<{ url: string; headers?: Record<string, string> }> = [];
    let refreshCount = 0;
    let protectedCallCount = 0;
    let shouldRefreshFail = false;

    globalThis.fetch = (async (input: string, init?: RequestInit) => {
      const url = String(input);
      fetchCalls.push({ url, headers: init?.headers as Record<string, string> });

      if (url.endsWith('/auth/login')) {
        return makeJsonResponse({
          user: { id: 'u1', email: 'a@b.com', name: 'Aluno', role: 'comum', subscriptionType: 'free' },
          accessToken: validAccess,
          refreshToken: 'ref-1',
        });
      }
      if (url.endsWith('/auth/refresh')) {
        refreshCount++;
        await new Promise((r) => setTimeout(r, 15));
        if (shouldRefreshFail) {
          return makeJsonResponse({ error: 'Invalid refresh token' }, 401);
        }
        return makeJsonResponse({
          accessToken: refreshedAccess,
          refreshToken: 'ref-2',
        });
      }
      if (url.endsWith('/auth/logout')) {
        return makeJsonResponse({ ok: true });
      }
      if (url.endsWith('/workouts')) {
        protectedCallCount++;
        const authHeader = (init?.headers as Record<string, string>)?.Authorization;
        if (authHeader === `Bearer ${validAccess}` && protectedCallCount === 1) {
          return makeJsonResponse({ error: 'Unauthorized' }, 401);
        }
        if (shouldRefreshFail) {
          return makeJsonResponse({ error: 'Unauthorized' }, 401);
        }
        return makeJsonResponse({ ok: true, usedToken: authHeader }, 200);
      }
      return makeJsonResponse({ status: 'ok' }, 200);
    }) as typeof fetch;

    let authRef: any;
    let apiRef: any;
    function Consumer() {
      authRef = authCtxMod.useAuth();
      apiRef = apiHookMod.useApi();
      return null;
    }

    await withMountedReact(
      (R) => R.createElement(authCtxMod.AuthProvider, null, R.createElement(Consumer)),
      async ({ act }) => {
        // Initial unauthenticated state
        await act(async () => {
          await new Promise((r) => setTimeout(r, 10));
        });
        assert.equal(authRef.isAuthenticated, false);
        assert.equal(authRef.isLoading, false);

        // Login persists tokens & user in AsyncStorage
        await act(async () => {
          await authRef.login('a@b.com', '123456');
        });
        assert.equal(authRef.isAuthenticated, true);
        assert.equal(authRef.accessToken, validAccess);
        assert.equal(asyncStorageStore.get('@bodysync:accessToken'), validAccess);
        assert.equal(asyncStorageStore.get('@bodysync:refreshToken'), 'ref-1');
        assert.ok(asyncStorageStore.get('@bodysync:user'));

        // Concurrent refreshSession calls deduplicate into a single /auth/refresh HTTP call
        let tokens: Array<string | null> = [];
        await act(async () => {
          tokens = await Promise.all([
            authRef.refreshSession(),
            authRef.refreshSession(),
            authRef.refreshSession(),
          ]);
        });
        assert.equal(refreshCount, 1);
        assert.deepEqual(tokens, [refreshedAccess, refreshedAccess, refreshedAccess]);
        assert.equal(asyncStorageStore.get('@bodysync:refreshToken'), 'ref-2');

        // Re-login with validAccess so first /workouts call gets 401 -> refreshSession -> single retry
        await act(async () => {
          await authRef.authenticateSession(
            { id: 'u1', email: 'a@b.com', name: 'Aluno', role: 'comum', subscriptionType: 'free' },
            validAccess,
            'ref-1'
          );
        });
        protectedCallCount = 0;
        refreshCount = 0;

        let retryJson: any;
        await act(async () => {
          const res = await apiRef.request('/workouts');
          retryJson = await res.json();
        });
        assert.equal(protectedCallCount, 2);
        assert.equal(refreshCount, 1);
        assert.equal(retryJson.usedToken, `Bearer ${refreshedAccess}`);

        // When refreshSession fails on 401, useApi logs out and throws session expired error
        shouldRefreshFail = true;
        await act(async () => {
          await assert.rejects(
            () => apiRef.request('/workouts'),
            /Sessão expirada\. Faça login novamente\./
          );
        });
        assert.equal(authRef.isAuthenticated, false);
        assert.equal(asyncStorageStore.has('@bodysync:accessToken'), false);
        assert.equal(asyncStorageStore.has('@bodysync:refreshToken'), false);

        // When fetch times out with AbortError across all candidates, useApi throws friendly timeout message
        globalThis.fetch = (async () => {
          const abortErr = new Error('Aborted');
          abortErr.name = 'AbortError';
          throw abortErr;
        }) as typeof fetch;
        await assert.rejects(
          () => apiRef.request('/workouts'),
          /O servidor demorou para responder\. Verifique sua conexão\./
        );
      }
    );
  });

  test('AuthProvider restores expired stored session on mount by calling refreshSession', async () => {
    const expiredAccess = makeJwt(-600);
    const newAccess = makeJwt(3600);
    asyncStorageStore.set('@bodysync:accessToken', expiredAccess);
    asyncStorageStore.set('@bodysync:refreshToken', 'stored-ref');
    asyncStorageStore.set(
      '@bodysync:user',
      JSON.stringify({ id: 'u9', email: 'rest@b.com', name: 'Restaurado', role: 'comum', subscriptionType: 'free' })
    );

    globalThis.fetch = (async (input: string) => {
      if (String(input).endsWith('/auth/refresh')) {
        return makeJsonResponse({ accessToken: newAccess, refreshToken: 'new-ref' });
      }
      return makeJsonResponse({});
    }) as typeof fetch;

    let authRef: any;
    function Consumer() {
      authRef = authCtxMod.useAuth();
      return null;
    }

    await withMountedReact(
      (R) => R.createElement(authCtxMod.AuthProvider, null, R.createElement(Consumer)),
      async ({ act }) => {
        await act(async () => {
          await new Promise((r) => setTimeout(r, 15));
        });
        assert.equal(authRef.isAuthenticated, true);
        assert.equal(authRef.accessToken, newAccess);
        assert.equal(asyncStorageStore.get('@bodysync:refreshToken'), 'new-ref');
      }
    );
  });
});

describe('6. EvaluationCard, trainerService, and LoginScreen.friendlyError', () => {
  test('EvaluationCard formats dates, filters non-null anthropometric metrics, toggles trainer name, and handles delete', async () => {
    const { renderToStaticMarkup } = req('react-dom/server');
    const React = req('react');

    const evaluation = {
      id: 'eval-1',
      trainerId: 't-1',
      trainerName: 'Coach Rafael',
      studentId: 's-1',
      evaluatedAt: '2026-11-10',
      rating: 4,
      notes: 'Ótima evolução postural.',
      weightKg: 78.5,
      bodyFatPct: null,
      chestCm: 102,
      waistCm: null,
      armCm: 38,
      thighCm: null,
      createdAt: '2026-11-10T12:00:00Z',
    };

    const html = renderToStaticMarkup(
      React.createElement(
        themeMod.ThemeProvider,
        null,
        React.createElement(evalCardMod.EvaluationCard, {
          evaluation,
          showTrainerName: true,
        })
      )
    );

    assert.match(html, /10\/11\/2026/);
    assert.match(html, /Por Coach Rafael/);
    assert.match(html, /4\/5/);
    assert.match(html, /Peso:.*78\.5 kg/);
    assert.match(html, /Tórax:.*102 cm/);
    assert.match(html, /Braço:.*38 cm/);
    assert.doesNotMatch(html, /Gordura:/);
    assert.doesNotMatch(html, /Cintura:/);
    assert.doesNotMatch(html, /Coxa:/);
    assert.match(html, /Ótima evolução postural\./);

    // Mounted click test for onDelete
    let deletedEval: any = null;
    await withMountedReact(
      (R) =>
        R.createElement(
          themeMod.ThemeProvider,
          null,
          R.createElement(evalCardMod.EvaluationCard, {
            evaluation,
            onDelete: (ev: any) => {
              deletedEval = ev;
            },
          })
        ),
      async ({ container, act }) => {
        const findDeleteNode = (node: any): any => {
          if (node?.props?.['aria-label']?.startsWith('Excluir avaliação')) return node;
          for (const child of node?.childNodes || []) {
            const found = findDeleteNode(child);
            if (found) return found;
          }
          return null;
        };
        const btn = findDeleteNode(container);
        assert.ok(btn, 'Delete button with aria-label must be rendered when onDelete is passed');
        const reactPropsKey = Object.keys(btn).find((k) => k.startsWith('__reactProps$'));
        assert.ok(reactPropsKey && typeof btn[reactPropsKey]?.onClick === 'function', 'Delete button must attach onClick handler');
        await act(async () => {
          btn[reactPropsKey].onClick();
        });
        assert.equal(deletedEval?.id, 'eval-1');
      }
    );
  });

  test('buildInviteShareMessage and all 15 methods of createTrainerApi work accurately', async () => {
    const inviteMsg = trainerMod.buildInviteShareMessage('PT-XYZ99');
    assert.match(inviteMsg, /PT-XYZ99/);
    assert.match(inviteMsg, /Ajustes > Meu Personal Trainer/);

    const calls: Array<{ path: string; options?: RequestInit }> = [];
    const responses = new Map<string, any>([
      ['GET /trainer/profile', { trainerId: 't1', name: 'Rafael', email: 'r@b.com', inviteCode: 'PT-1', activeStudentsCount: 1, totalPrescriptions: 2 }],
      ['GET /trainer/students', { students: [{ id: 's1', name: 'João', weightKg: 80, evaluations: [] }] }],
      ['GET /trainer/students/s1', { studentId: 's1', name: 'João', weightKg: 80, prescribedPlans: [], evaluations: [] }],
      ['POST /trainer/prescribe', { success: true, planId: 42 }],
      ['GET /trainer/analytics', { activeStudentsCount: 1, weeklyAttendanceRate: 80, trainedTodayCount: 1, totalPrescriptions: 2, weeklyWorkoutsCount: 4, avgWorkoutDurationMinutes: 45, waterComplianceRate: 90, attentionStudents: [], ranking: [] }],
      ['GET /trainer/lookup/AB%20C%2F1', { trainerId: 't1', name: 'Rafael', inviteCode: 'AB C/1' }],
      ['GET /trainer/my-trainer', { connected: true, trainer: { trainerId: 't1', name: 'Rafael', email: 'r@b.com', inviteCode: 'PT-1', connectedAt: '2026-11-01' } }],
      ['POST /trainer/connect', { success: true, trainerId: 't1', trainerName: 'Rafael', message: 'Conectado' }],
      ['DELETE /trainer/students/s1', { success: true, message: 'Desvinculado' }],
      ['DELETE /trainer/plans/42', { success: true, message: 'Excluída' }],
      ['POST /trainer/students/s1/evaluations', { evaluation: { id: 'e1', trainerId: 't1', trainerName: 'Rafael', studentId: 's1', evaluatedAt: '2026-11-10', rating: 5, notes: 'Top', weightKg: '79' } }],
      ['DELETE /trainer/evaluations/e1', { success: true, message: 'Removida' }],
      ['GET /trainer/my-evaluations', { evaluations: [{ id: 'e1', trainerId: 't1', trainerName: 'Rafael', studentId: 's1', evaluatedAt: '2026-11-10', rating: 5, notes: 'Top' }] }],
      ['GET /exercises/categories', { categories: ['Peito', 'Costas'] }],
      ['GET /exercises?search=supino+reto&category=Peito&limit=25&offset=50', { exercises: [{ id: 10, name: 'Supino reto' }], pagination: { total: 1 } }],
    ]);

    const requestStub = async (reqPath: string, options?: RequestInit): Promise<Response> => {
      calls.push({ path: reqPath, options });
      const method = (options?.method || 'GET').toUpperCase();
      const key = `${method} ${reqPath}`;
      const payload = responses.get(key);
      if (!payload) {
        return makeJsonResponse({ error: `Unexpected ${key}` }, 404);
      }
      return makeJsonResponse(payload, 200);
    };

    const api = trainerMod.createTrainerApi(requestStub);

    const profile = await api.getProfile();
    assert.equal(profile.inviteCode, 'PT-1');

    const students = await api.listStudents();
    assert.equal(students.length, 1);
    assert.equal(students[0].name, 'João');

    const detail = await api.getStudentDetail('s1');
    assert.equal(detail.id, 's1');

    const prescribed = await api.prescribeWorkout({
      studentId: 's1',
      name: 'Treino A',
      exercises: [{ exerciseId: 10, sets: 4, reps: 10 }],
    });
    assert.equal(prescribed.planId, 42);

    const analytics = await api.getAnalytics();
    assert.equal(analytics.weeklyAttendanceRate, 80);

    const lookup = await api.lookupTrainer('  AB C/1 ');
    assert.equal(lookup.trainerId, 't1');

    const myTrainer = await api.getMyTrainer();
    assert.equal(myTrainer.connected, true);

    const connected = await api.connectStudent('PT-1');
    assert.equal(connected.success, true);

    const disconnected = await api.disconnect('s1');
    assert.equal(disconnected.success, true);

    const deletedPlan = await api.deletePrescribedPlan(42);
    assert.equal(deletedPlan.success, true);

    const createdEval = await api.createEvaluation('s1', { rating: 5, notes: 'Top', weightKg: 79 });
    assert.equal(createdEval.weightKg, 79);

    const deletedEval = await api.deleteEvaluation('e1');
    assert.equal(deletedEval.success, true);

    const myEvals = await api.getMyEvaluations();
    assert.equal(myEvals.length, 1);

    const categories = await api.getExerciseCategories();
    assert.deepEqual(categories, ['Peito', 'Costas']);

    const exercises = await api.getExercises({ search: 'supino reto', category: 'Peito', limit: 25, offset: 50 });
    assert.equal(exercises.total, 1);
    assert.equal(exercises.exercises[0].name, 'Supino reto');

    assert.equal(calls.length, 15);
    assert.equal(calls[3].options?.method, 'POST');
    assert.equal(calls[5].path, '/trainer/lookup/AB%20C%2F1');
    assert.equal(calls[8].options?.method, 'DELETE');
    assert.equal(calls[9].options?.method, 'DELETE');
    assert.equal(calls[11].options?.method, 'DELETE');

    // Error propagation when backend returns non-2xx
    const failingApi = trainerMod.createTrainerApi(async () =>
      makeJsonResponse({ error: 'Código expirado' }, 400)
    );
    await assert.rejects(() => failingApi.lookupTrainer('BAD'), /Código expirado/);
  });

  test('LoginScreen.friendlyError maps auth, network, timeout, and unknown errors cleanly', () => {
    const expectedConnectionError =
      'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.';

    assert.equal(loginMod.friendlyError(''), 'Algo deu errado. Tente novamente.');
    assert.equal(loginMod.friendlyError('Credenciais inválidas'), 'E-mail ou senha incorretos.');
    assert.equal(loginMod.friendlyError('Invalid password'), 'E-mail ou senha incorretos.');
    assert.equal(loginMod.friendlyError('Email não encontrado'), 'E-mail ou senha incorretos.');
    assert.equal(loginMod.friendlyError('Network request failed'), expectedConnectionError);
    assert.equal(loginMod.friendlyError('Failed to fetch'), expectedConnectionError);
    assert.equal(loginMod.friendlyError('connect ECONNREFUSED 127.0.0.1:3000'), expectedConnectionError);
    assert.equal(loginMod.friendlyError('Request timeout'), expectedConnectionError);
    assert.equal(loginMod.friendlyError('O servidor demorou para responder.'), expectedConnectionError);
    assert.equal(loginMod.friendlyError('AbortError'), expectedConnectionError);
    assert.equal(loginMod.friendlyError('Erro interno inesperado 500'), 'Algo deu errado. Tente novamente.');

    assert.doesNotMatch(expectedConnectionError, /servidor da api|\bip\b|\d{1,3}(?:\.\d{1,3}){3}/i);
  });

  test('LoginScreen renders commercial login UI without dev API server toggle or modal', () => {
    const { renderToStaticMarkup } = req('react-dom/server');
    const React = req('react');

    const html = renderToStaticMarkup(
      React.createElement(
        themeMod.ThemeProvider,
        null,
        React.createElement(
          authCtxMod.AuthProvider,
          null,
          React.createElement(loginMod.default)
        )
      )
    );

    assert.match(html, /BodySync/);
    assert.match(html, /Entrar na conta/);
    assert.doesNotMatch(html, /Servidor da API/i);
    assert.doesNotMatch(html, /URL personalizada/i);
    assert.doesNotMatch(html, /172\.16\.128\.108/);
  });
});
