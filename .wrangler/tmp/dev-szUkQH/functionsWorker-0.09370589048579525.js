var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/pages-iRWi06/functionsWorker-0.09370589048579525.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();
var parseBody = /* @__PURE__ */ __name2(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
__name2(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
__name2(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name2((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name2((form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");
var splitPath = /* @__PURE__ */ __name2((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name2((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name2((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match4, index) => {
    const mark = `@${index}`;
    groups.push([mark, match4]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name2((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name2((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match4 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match4) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match4[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match4[1], new RegExp(`^${match4[2]}(?=/${next})`)] : [label, match4[1], new RegExp(`^${match4[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match4[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name2((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match4) => {
      try {
        return decoder(match4);
      } catch {
        return match4;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name2((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name2((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name2((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name2((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name2((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath32 = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath32 += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath32 === "") {
          results.push("/");
        } else {
          results.push(basePath32);
        }
        const optionalSegment = segment.replace("?", "");
        basePath32 += "/" + optionalSegment;
        results.push(basePath32);
      } else {
        basePath32 += "/" + segment;
      }
    }
  });
  return results.filter((v2, i, a2) => a2.indexOf(v2) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name2((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name2((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name2((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;
var tryDecodeURIComponent = /* @__PURE__ */ __name2((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  static {
    __name2(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name2((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text2) => JSON.parse(text2));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name2((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name2(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name2((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name2((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  static {
    __name2(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v2] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v2);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name2((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name2((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name2(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name2((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name2((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name2((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name2((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name2((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v2] of Object.entries(headers)) {
        if (typeof v2 === "string") {
          responseHeaders.set(k, v2);
        } else {
          responseHeaders.delete(k);
          for (const v22 of v2) {
            responseHeaders.append(k, v22);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name2((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name2((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name2((text2, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text2) : this.#newResponse(
      text2,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name2((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name2((html, arg, headers) => {
    const res = /* @__PURE__ */ __name2((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name2((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name2(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};
var handle = /* @__PURE__ */ __name2((app2) => (eventContext) => {
  return app2.fetch(
    eventContext.request,
    { ...eventContext.env, eventContext },
    {
      waitUntil: eventContext.waitUntil,
      passThroughOnException: eventContext.passThroughOnException,
      props: {}
    }
  );
}, "handle");
var compose = /* @__PURE__ */ __name2((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
    __name2(dispatch, "dispatch");
  };
}, "compose");
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
  static {
    __name2(this, "UnsupportedPathError");
  }
};
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";
var notFoundHandler = /* @__PURE__ */ __name2((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name2((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  static {
    __name2(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p2 of [path].flat()) {
        this.#path = p2;
        for (const m2 of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m2.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name2(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name2((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name2((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name2((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name2(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    }
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name2((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name2((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name2(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match22 = /* @__PURE__ */ __name2(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match32 = path2.match(matcher[0]);
    if (!match32) {
      return [[], emptyParam];
    }
    const index = match32.indexOf("", 1);
    return [matcher[1][index], match32];
  }), "match2");
  this.match = match22;
  return match22(method, path);
}
__name(match, "match");
__name2(match, "match");
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a2, b2) {
  if (a2.length === 1) {
    return b2.length === 1 ? a2 < b2 ? -1 : 1 : -1;
  }
  if (b2.length === 1) {
    return 1;
  }
  if (a2 === ONLY_WILDCARD_REG_EXP_STR || a2 === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b2 === ONLY_WILDCARD_REG_EXP_STR || b2 === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a2 === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b2 === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a2.length === b2.length ? a2 < b2 ? -1 : 1 : b2.length - a2.length;
}
__name(compareKey, "compareKey");
__name2(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  static {
    __name2(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};
var Trie = class {
  static {
    __name(this, "Trie");
  }
  static {
    __name2(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m2) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m2];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_2, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_2, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
__name2(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
__name2(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes2) {
  const trie = new Trie();
  const handlerData = [];
  if (routes2.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes2.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
__name2(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a2, b2) => b2.length - a2.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
__name2(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  static {
    __name2(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes2 = this.#routes;
    if (!middleware || !routes2) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes2].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p2) => {
          handlerMap[method][p2] = [...handlerMap[METHOD_NAME_ALL][p2]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m2) => {
          middleware[m2][path] ||= findMiddleware(middleware[m2], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m2) => {
        if (method === METHOD_NAME_ALL || method === m2) {
          Object.keys(middleware[m2]).forEach((p2) => {
            re.test(p2) && middleware[m2][p2].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes2).forEach((m2) => {
        if (method === METHOD_NAME_ALL || method === m2) {
          Object.keys(routes2[m2]).forEach(
            (p2) => re.test(p2) && routes2[m2][p2].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes2).forEach((m2) => {
        if (method === METHOD_NAME_ALL || method === m2) {
          routes2[m2][path2] ||= [
            ...findMiddleware(middleware[m2], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes2[m2][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes2 = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes2.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes2.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes2);
    }
  }
};
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  static {
    __name2(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes2 = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes2.length; i2 < len2; i2++) {
          router.add(...routes2[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name2((children) => {
  for (const _2 in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node2");
  }
  static {
    __name2(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m2 = /* @__PURE__ */ Object.create(null);
      m2[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m2];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p2 = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p2, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p2;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v2, i, a2) => a2.indexOf(v2) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m2 = node.#methods[i];
      const handlerSet = m2[method] || m2[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p2 = 0; p2 < len; p2++) {
                partOffsets[p2] = offset;
                offset += parts[p2].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m2 = matcher.exec(restPathString);
            if (m2) {
              params[name] = m2[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m2[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a2, b2) => {
        return a2.score - b2.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  static {
    __name2(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono2");
  }
  static {
    __name2(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};
var cors = /* @__PURE__ */ __name2((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name2(/* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    __name2(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2"), "cors2");
}, "cors");
var isTestEnvironment = /* @__PURE__ */ __name2(() => {
  try {
    return false;
  } catch {
  }
  return false;
}, "isTestEnvironment");
var isProductionEnvironment = /* @__PURE__ */ __name2(() => {
  try {
    return false;
  } catch {
  }
  return false;
}, "isProductionEnvironment");
var displayedWarnings = /* @__PURE__ */ new Set();
var deprecated = /* @__PURE__ */ __name2((fnName, warning, key) => {
  const hideWarning = isTestEnvironment() || isProductionEnvironment();
  const messageId = key ?? fnName;
  if (displayedWarnings.has(messageId) || hideWarning) return;
  displayedWarnings.add(messageId);
  console.warn(`Clerk - DEPRECATION WARNING: "${fnName}" is deprecated and will be removed in the next major release.
${warning}`);
}, "deprecated");
var LEGACY_DEV_INSTANCE_SUFFIXES = [
  ".lcl.dev",
  ".lclstage.dev",
  ".lclclerk.com"
];
var CURRENT_DEV_INSTANCE_SUFFIXES = [
  ".accounts.dev",
  ".accountsstage.dev",
  ".accounts.lclclerk.com"
];
var DEV_OR_STAGING_SUFFIXES = [
  ".lcl.dev",
  ".stg.dev",
  ".lclstage.dev",
  ".stgstage.dev",
  ".dev.lclclerk.com",
  ".stg.lclclerk.com",
  ".accounts.lclclerk.com",
  "accountsstage.dev",
  "accounts.dev"
];
var isomorphicAtob = /* @__PURE__ */ __name2((data) => {
  if (typeof atob !== "undefined" && typeof atob === "function") return atob(data);
  else if (typeof global !== "undefined" && global.Buffer) return new global.Buffer(data, "base64").toString();
  return data;
}, "isomorphicAtob");
var isomorphicBtoa = /* @__PURE__ */ __name2((data) => {
  if (typeof btoa !== "undefined" && typeof btoa === "function") return btoa(data);
  else if (typeof global !== "undefined" && global.Buffer) return new global.Buffer(data).toString("base64");
  return data;
}, "isomorphicBtoa");
var PUBLISHABLE_KEY_LIVE_PREFIX = "pk_live_";
var PUBLISHABLE_KEY_TEST_PREFIX = "pk_test_";
function isValidDecodedPublishableKey(decoded) {
  if (!decoded.endsWith("$")) return false;
  const withoutTrailing = decoded.slice(0, -1);
  if (withoutTrailing.includes("$")) return false;
  return withoutTrailing.includes(".");
}
__name(isValidDecodedPublishableKey, "isValidDecodedPublishableKey");
__name2(isValidDecodedPublishableKey, "isValidDecodedPublishableKey");
function parsePublishableKey(key, options = {}) {
  key = key || "";
  if (!key || !isPublishableKey(key)) {
    if (options.fatal && !key) throw new Error("Publishable key is missing. Ensure that your publishable key is correctly configured. Double-check your environment configuration for your keys, or access them here: https://dashboard.clerk.com/last-active?path=api-keys");
    if (options.fatal && !isPublishableKey(key)) throw new Error("Publishable key not valid.");
    return null;
  }
  const instanceType = key.startsWith(PUBLISHABLE_KEY_LIVE_PREFIX) ? "production" : "development";
  let decodedFrontendApi;
  try {
    decodedFrontendApi = isomorphicAtob(key.split("_")[2]);
  } catch {
    if (options.fatal) throw new Error("Publishable key not valid: Failed to decode key.");
    return null;
  }
  if (!isValidDecodedPublishableKey(decodedFrontendApi)) {
    if (options.fatal) throw new Error("Publishable key not valid: Decoded key has invalid format.");
    return null;
  }
  let frontendApi = decodedFrontendApi.slice(0, -1);
  if (options.proxyUrl) frontendApi = options.proxyUrl;
  else if (instanceType !== "development" && options.domain && options.isSatellite) frontendApi = `clerk.${options.domain}`;
  return {
    instanceType,
    frontendApi
  };
}
__name(parsePublishableKey, "parsePublishableKey");
__name2(parsePublishableKey, "parsePublishableKey");
function isPublishableKey(key = "") {
  try {
    if (!(key.startsWith(PUBLISHABLE_KEY_LIVE_PREFIX) || key.startsWith(PUBLISHABLE_KEY_TEST_PREFIX))) return false;
    const parts = key.split("_");
    if (parts.length !== 3) return false;
    const encodedPart = parts[2];
    if (!encodedPart) return false;
    return isValidDecodedPublishableKey(isomorphicAtob(encodedPart));
  } catch {
    return false;
  }
}
__name(isPublishableKey, "isPublishableKey");
__name2(isPublishableKey, "isPublishableKey");
function createDevOrStagingUrlCache() {
  const devOrStagingUrlCache = /* @__PURE__ */ new Map();
  return { isDevOrStagingUrl: /* @__PURE__ */ __name2((url) => {
    if (!url) return false;
    const hostname = typeof url === "string" ? url : url.hostname;
    let res = devOrStagingUrlCache.get(hostname);
    if (res === void 0) {
      res = DEV_OR_STAGING_SUFFIXES.some((s2) => hostname.endsWith(s2));
      devOrStagingUrlCache.set(hostname, res);
    }
    return res;
  }, "isDevOrStagingUrl") };
}
__name(createDevOrStagingUrlCache, "createDevOrStagingUrlCache");
__name2(createDevOrStagingUrlCache, "createDevOrStagingUrlCache");
function isDevelopmentFromSecretKey(apiKey) {
  return apiKey.startsWith("test_") || apiKey.startsWith("sk_test_");
}
__name(isDevelopmentFromSecretKey, "isDevelopmentFromSecretKey");
__name2(isDevelopmentFromSecretKey, "isDevelopmentFromSecretKey");
async function getCookieSuffix(publishableKey, subtle = globalThis.crypto.subtle) {
  const data = new TextEncoder().encode(publishableKey);
  const digest = await subtle.digest("sha-1", data);
  return isomorphicBtoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/gi, "-").replace(/\//gi, "_").substring(0, 8);
}
__name(getCookieSuffix, "getCookieSuffix");
__name2(getCookieSuffix, "getCookieSuffix");
var getSuffixedCookieName = /* @__PURE__ */ __name2((cookieName, cookieSuffix) => {
  return `${cookieName}_${cookieSuffix}`;
}, "getSuffixedCookieName");
var defaultOptions = {
  initialDelay: 125,
  maxDelayBetweenRetries: 0,
  factor: 2,
  shouldRetry: /* @__PURE__ */ __name2((_2, iteration) => iteration < 5, "shouldRetry"),
  retryImmediately: false,
  jitter: true
};
var RETRY_IMMEDIATELY_DELAY = 100;
var sleep = /* @__PURE__ */ __name2(async (ms2) => new Promise((s2) => setTimeout(s2, ms2)), "sleep");
var applyJitter = /* @__PURE__ */ __name2((delay, jitter) => {
  return jitter ? delay * (1 + Math.random()) : delay;
}, "applyJitter");
var createExponentialDelayAsyncFn = /* @__PURE__ */ __name2((opts) => {
  let timesCalled = 0;
  const calculateDelayInMs = /* @__PURE__ */ __name2(() => {
    const constant = opts.initialDelay;
    const base = opts.factor;
    let delay = constant * Math.pow(base, timesCalled);
    delay = applyJitter(delay, opts.jitter);
    return Math.min(opts.maxDelayBetweenRetries || delay, delay);
  }, "calculateDelayInMs");
  return async () => {
    await sleep(calculateDelayInMs());
    timesCalled++;
  };
}, "createExponentialDelayAsyncFn");
var retry = /* @__PURE__ */ __name2(async (callback, options = {}) => {
  let iterations = 0;
  const { shouldRetry, initialDelay, maxDelayBetweenRetries, factor, retryImmediately, jitter, onBeforeRetry } = {
    ...defaultOptions,
    ...options
  };
  const delay = createExponentialDelayAsyncFn({
    initialDelay,
    maxDelayBetweenRetries,
    factor,
    jitter
  });
  while (true) try {
    return await callback();
  } catch (e) {
    iterations++;
    if (!shouldRetry(e, iterations)) throw e;
    if (onBeforeRetry) await onBeforeRetry(iterations);
    if (retryImmediately && iterations === 1) await sleep(applyJitter(RETRY_IMMEDIATELY_DELAY, jitter));
    else await delay();
  }
}, "retry");
function isLegacyDevAccountPortalOrigin(host) {
  return LEGACY_DEV_INSTANCE_SUFFIXES.some((legacyDevSuffix) => {
    return host.startsWith("accounts.") && host.endsWith(legacyDevSuffix);
  });
}
__name(isLegacyDevAccountPortalOrigin, "isLegacyDevAccountPortalOrigin");
__name2(isLegacyDevAccountPortalOrigin, "isLegacyDevAccountPortalOrigin");
function isCurrentDevAccountPortalOrigin(host) {
  return CURRENT_DEV_INSTANCE_SUFFIXES.some((currentDevSuffix) => {
    return host.endsWith(currentDevSuffix) && !host.endsWith(".clerk" + currentDevSuffix);
  });
}
__name(isCurrentDevAccountPortalOrigin, "isCurrentDevAccountPortalOrigin");
__name2(isCurrentDevAccountPortalOrigin, "isCurrentDevAccountPortalOrigin");
function createErrorTypeGuard(ErrorClass) {
  function typeGuard(error) {
    const target = error ?? this;
    if (!target) throw new TypeError(`${ErrorClass.kind || ErrorClass.name} type guard requires an error object`);
    if (ErrorClass.kind && typeof target === "object" && target !== null && "constructor" in target) {
      if (target.constructor?.kind === ErrorClass.kind) return true;
    }
    return target instanceof ErrorClass;
  }
  __name(typeGuard, "typeGuard");
  __name2(typeGuard, "typeGuard");
  return typeGuard;
}
__name(createErrorTypeGuard, "createErrorTypeGuard");
__name2(createErrorTypeGuard, "createErrorTypeGuard");
var ClerkAPIError = class {
  static {
    __name(this, "ClerkAPIError");
  }
  static {
    __name2(this, "ClerkAPIError");
  }
  static kind = "ClerkApiError";
  code;
  message;
  longMessage;
  meta;
  constructor(json2) {
    const parsedError = {
      code: json2.code,
      message: json2.message,
      longMessage: json2.long_message,
      meta: {
        paramName: json2.meta?.param_name,
        sessionId: json2.meta?.session_id,
        emailAddresses: json2.meta?.email_addresses,
        identifiers: json2.meta?.identifiers,
        zxcvbn: json2.meta?.zxcvbn,
        plan: json2.meta?.plan,
        isPlanUpgradePossible: json2.meta?.is_plan_upgrade_possible
      }
    };
    this.code = parsedError.code;
    this.message = parsedError.message;
    this.longMessage = parsedError.longMessage;
    this.meta = parsedError.meta;
  }
};
var isClerkAPIError = createErrorTypeGuard(ClerkAPIError);
function parseError(error) {
  return new ClerkAPIError(error);
}
__name(parseError, "parseError");
__name2(parseError, "parseError");
var ClerkError = class ClerkError2 extends Error {
  static {
    __name(this, "ClerkError2");
  }
  static {
    __name2(this, "ClerkError");
  }
  static kind = "ClerkError";
  clerkError = true;
  code;
  longMessage;
  docsUrl;
  cause;
  get name() {
    return this.constructor.name;
  }
  constructor(opts) {
    super(new.target.formatMessage(new.target.kind, opts.message, opts.code, opts.docsUrl), { cause: opts.cause });
    Object.setPrototypeOf(this, ClerkError2.prototype);
    this.code = opts.code;
    this.docsUrl = opts.docsUrl;
    this.longMessage = opts.longMessage;
    this.cause = opts.cause;
  }
  toString() {
    return `[${this.name}]
Message:${this.message}`;
  }
  static formatMessage(name, msg, code, docsUrl) {
    const prefix = "Clerk:";
    const regex = new RegExp(prefix.replace(" ", "\\s*"), "i");
    msg = msg.replace(regex, "");
    msg = `${prefix} ${msg.trim()}

(code="${code}")

`;
    if (docsUrl) msg += `

Docs: ${docsUrl}`;
    return msg;
  }
};
var ClerkAPIResponseError = class ClerkAPIResponseError2 extends ClerkError {
  static {
    __name(this, "ClerkAPIResponseError2");
  }
  static {
    __name2(this, "ClerkAPIResponseError");
  }
  static kind = "ClerkAPIResponseError";
  status;
  clerkTraceId;
  retryAfter;
  errors;
  constructor(message, options) {
    const { data: errorsJson, status, clerkTraceId, retryAfter } = options;
    super({
      ...options,
      message,
      code: "api_response_error"
    });
    Object.setPrototypeOf(this, ClerkAPIResponseError2.prototype);
    this.status = status;
    this.clerkTraceId = clerkTraceId;
    this.retryAfter = retryAfter;
    this.errors = (errorsJson || []).map((e) => new ClerkAPIError(e));
  }
  toString() {
    let message = `[${this.name}]
Message:${this.message}
Status:${this.status}
Serialized errors: ${this.errors.map((e) => JSON.stringify(e))}`;
    if (this.clerkTraceId) message += `
Clerk Trace ID: ${this.clerkTraceId}`;
    return message;
  }
  static formatMessage(name, msg, _2, __) {
    return msg;
  }
};
var isClerkAPIResponseError = createErrorTypeGuard(ClerkAPIResponseError);
var DefaultMessages = Object.freeze({
  InvalidProxyUrlErrorMessage: `The proxyUrl passed to Clerk is invalid. The expected value for proxyUrl is an absolute URL or a relative path with a leading '/'. (key={{url}})`,
  InvalidPublishableKeyErrorMessage: `The publishableKey passed to Clerk is invalid. You can get your Publishable key at https://dashboard.clerk.com/last-active?path=api-keys. (key={{key}})`,
  MissingPublishableKeyErrorMessage: `Missing publishableKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
  MissingSecretKeyErrorMessage: `Missing secretKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
  MissingClerkProvider: `{{source}} can only be used within the <ClerkProvider /> component. Learn more: https://clerk.com/docs/components/clerk-provider`
});
function buildErrorThrower({ packageName, customMessages }) {
  let pkg = packageName;
  function buildMessage(rawMessage, replacements) {
    if (!replacements) return `${pkg}: ${rawMessage}`;
    let msg = rawMessage;
    const matches2 = rawMessage.matchAll(/{{([a-zA-Z0-9-_]+)}}/g);
    for (const match4 of matches2) {
      const replacement = (replacements[match4[1]] || "").toString();
      msg = msg.replace(`{{${match4[1]}}}`, replacement);
    }
    return `${pkg}: ${msg}`;
  }
  __name(buildMessage, "buildMessage");
  __name2(buildMessage, "buildMessage");
  const messages = {
    ...DefaultMessages,
    ...customMessages
  };
  return {
    setPackageName({ packageName: packageName$1 }) {
      if (typeof packageName$1 === "string") pkg = packageName$1;
      return this;
    },
    setMessages({ customMessages: customMessages$1 }) {
      Object.assign(messages, customMessages$1 || {});
      return this;
    },
    throwInvalidPublishableKeyError(params) {
      throw new Error(buildMessage(messages.InvalidPublishableKeyErrorMessage, params));
    },
    throwInvalidProxyUrl(params) {
      throw new Error(buildMessage(messages.InvalidProxyUrlErrorMessage, params));
    },
    throwMissingPublishableKeyError() {
      throw new Error(buildMessage(messages.MissingPublishableKeyErrorMessage));
    },
    throwMissingSecretKeyError() {
      throw new Error(buildMessage(messages.MissingSecretKeyErrorMessage));
    },
    throwMissingClerkProviderError(params) {
      throw new Error(buildMessage(messages.MissingClerkProvider, params));
    },
    throw(message) {
      throw new Error(buildMessage(message));
    }
  };
}
__name(buildErrorThrower, "buildErrorThrower");
__name2(buildErrorThrower, "buildErrorThrower");
var ClerkRuntimeError = class ClerkRuntimeError2 extends ClerkError {
  static {
    __name(this, "ClerkRuntimeError2");
  }
  static {
    __name2(this, "ClerkRuntimeError");
  }
  static kind = "ClerkRuntimeError";
  /**
  * @deprecated Use `clerkError` property instead. This property is maintained for backward compatibility.
  */
  clerkRuntimeError = true;
  constructor(message, options) {
    super({
      ...options,
      message
    });
    Object.setPrototypeOf(this, ClerkRuntimeError2.prototype);
  }
};
var isClerkRuntimeError = createErrorTypeGuard(ClerkRuntimeError);
var errorThrower = buildErrorThrower({ packageName: "@clerk/backend" });
var { isDevOrStagingUrl } = createDevOrStagingUrlCache();
var TokenVerificationErrorCode = {
  InvalidSecretKey: "clerk_key_invalid"
};
var TokenVerificationErrorReason = {
  TokenExpired: "token-expired",
  TokenInvalid: "token-invalid",
  TokenInvalidAlgorithm: "token-invalid-algorithm",
  TokenInvalidAuthorizedParties: "token-invalid-authorized-parties",
  TokenInvalidSignature: "token-invalid-signature",
  TokenNotActiveYet: "token-not-active-yet",
  TokenIatInTheFuture: "token-iat-in-the-future",
  TokenVerificationFailed: "token-verification-failed",
  InvalidSecretKey: "secret-key-invalid",
  LocalJWKMissing: "jwk-local-missing",
  RemoteJWKFailedToLoad: "jwk-remote-failed-to-load",
  RemoteJWKInvalid: "jwk-remote-invalid",
  RemoteJWKMissing: "jwk-remote-missing",
  JWKFailedToResolve: "jwk-failed-to-resolve",
  JWKKidMismatch: "jwk-kid-mismatch"
};
var TokenVerificationErrorAction = {
  ContactSupport: "Contact support@clerk.com",
  EnsureClerkJWT: "Make sure that this is a valid Clerk-generated JWT.",
  SetClerkJWTKey: "Set the CLERK_JWT_KEY environment variable.",
  SetClerkSecretKey: "Set the CLERK_SECRET_KEY environment variable.",
  EnsureClockSync: "Make sure your system clock is in sync (e.g. turn off and on automatic time synchronization)."
};
var TokenVerificationError = class _TokenVerificationError extends Error {
  static {
    __name(this, "_TokenVerificationError");
  }
  static {
    __name2(this, "_TokenVerificationError");
  }
  constructor({
    action,
    message,
    reason
  }) {
    super(message);
    Object.setPrototypeOf(this, _TokenVerificationError.prototype);
    this.reason = reason;
    this.message = message;
    this.action = action;
  }
  getFullMessage() {
    return `${[this.message, this.action].filter((m2) => m2).join(" ")} (reason=${this.reason}, token-carrier=${this.tokenCarrier})`;
  }
};
var MachineTokenVerificationErrorCode = {
  TokenInvalid: "token-invalid",
  InvalidSecretKey: "secret-key-invalid",
  UnexpectedError: "unexpected-error",
  TokenVerificationFailed: "token-verification-failed"
};
var _MachineTokenVerificationError = class _MachineTokenVerificationError2 extends ClerkError {
  static {
    __name(this, "_MachineTokenVerificationError2");
  }
  static {
    __name2(this, "_MachineTokenVerificationError");
  }
  constructor({
    message,
    code,
    status,
    action
  }) {
    super({ message, code });
    Object.setPrototypeOf(this, _MachineTokenVerificationError2.prototype);
    this.status = status;
    this.action = action;
  }
  // Keep message unformatted, matching ClerkAPIResponseError's approach
  static formatMessage(_name, msg, _code, _docsUrl) {
    return msg;
  }
  getFullMessage() {
    return `${this.message} (code=${this.code}, status=${this.status || "n/a"})`;
  }
};
_MachineTokenVerificationError.kind = "MachineTokenVerificationError";
var MachineTokenVerificationError = _MachineTokenVerificationError;
var webcrypto = crypto;
var globalFetch = fetch.bind(globalThis);
var runtime = {
  crypto: webcrypto,
  get fetch() {
    return false ? fetch : globalFetch;
  },
  AbortController: globalThis.AbortController,
  Blob: globalThis.Blob,
  FormData: globalThis.FormData,
  Headers: globalThis.Headers,
  Request: globalThis.Request,
  Response: globalThis.Response
};
var base64url = {
  parse(string, opts) {
    return parse(string, base64UrlEncoding, opts);
  },
  stringify(data, opts) {
    return stringify(data, base64UrlEncoding, opts);
  }
};
var base64UrlEncoding = {
  chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
  bits: 6
};
function parse(string, encoding, opts = {}) {
  if (!encoding.codes) {
    encoding.codes = {};
    for (let i = 0; i < encoding.chars.length; ++i) {
      encoding.codes[encoding.chars[i]] = i;
    }
  }
  if (!opts.loose && string.length * encoding.bits & 7) {
    throw new SyntaxError("Invalid padding");
  }
  let end = string.length;
  while (string[end - 1] === "=") {
    --end;
    if (!opts.loose && !((string.length - end) * encoding.bits & 7)) {
      throw new SyntaxError("Invalid padding");
    }
  }
  const out = new (opts.out ?? Uint8Array)(end * encoding.bits / 8 | 0);
  let bits = 0;
  let buffer = 0;
  let written = 0;
  for (let i = 0; i < end; ++i) {
    const value = encoding.codes[string[i]];
    if (value === void 0) {
      throw new SyntaxError("Invalid character " + string[i]);
    }
    buffer = buffer << encoding.bits | value;
    bits += encoding.bits;
    if (bits >= 8) {
      bits -= 8;
      out[written++] = 255 & buffer >> bits;
    }
  }
  if (bits >= encoding.bits || 255 & buffer << 8 - bits) {
    throw new SyntaxError("Unexpected end of data");
  }
  return out;
}
__name(parse, "parse");
__name2(parse, "parse");
function stringify(data, encoding, opts = {}) {
  const { pad = true } = opts;
  const mask = (1 << encoding.bits) - 1;
  let out = "";
  let bits = 0;
  let buffer = 0;
  for (let i = 0; i < data.length; ++i) {
    buffer = buffer << 8 | 255 & data[i];
    bits += 8;
    while (bits > encoding.bits) {
      bits -= encoding.bits;
      out += encoding.chars[mask & buffer >> bits];
    }
  }
  if (bits) {
    out += encoding.chars[mask & buffer << encoding.bits - bits];
  }
  if (pad) {
    while (out.length * encoding.bits & 7) {
      out += "=";
    }
  }
  return out;
}
__name(stringify, "stringify");
__name2(stringify, "stringify");
var algToHash = {
  RS256: "SHA-256",
  RS384: "SHA-384",
  RS512: "SHA-512"
};
var RSA_ALGORITHM_NAME = "RSASSA-PKCS1-v1_5";
var jwksAlgToCryptoAlg = {
  RS256: RSA_ALGORITHM_NAME,
  RS384: RSA_ALGORITHM_NAME,
  RS512: RSA_ALGORITHM_NAME
};
var algs = Object.keys(algToHash);
function getCryptoAlgorithm(algorithmName) {
  const hash = algToHash[algorithmName];
  const name = jwksAlgToCryptoAlg[algorithmName];
  if (!hash || !name) {
    throw new Error(`Unsupported algorithm ${algorithmName}, expected one of ${algs.join(",")}.`);
  }
  return {
    hash: { name: algToHash[algorithmName] },
    name: jwksAlgToCryptoAlg[algorithmName]
  };
}
__name(getCryptoAlgorithm, "getCryptoAlgorithm");
__name2(getCryptoAlgorithm, "getCryptoAlgorithm");
var isArrayString = /* @__PURE__ */ __name2((s2) => {
  return Array.isArray(s2) && s2.length > 0 && s2.every((a2) => typeof a2 === "string");
}, "isArrayString");
var assertAudienceClaim = /* @__PURE__ */ __name2((aud, audience) => {
  const audienceList = [audience].flat().filter((a2) => !!a2);
  const audList = [aud].flat().filter((a2) => !!a2);
  const shouldVerifyAudience = audienceList.length > 0 && audList.length > 0;
  if (!shouldVerifyAudience) {
    return;
  }
  if (typeof aud === "string") {
    if (!audienceList.includes(aud)) {
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.EnsureClerkJWT,
        reason: TokenVerificationErrorReason.TokenVerificationFailed,
        message: `Invalid JWT audience claim (aud) ${JSON.stringify(aud)}. Is not included in "${JSON.stringify(
          audienceList
        )}".`
      });
    }
  } else if (isArrayString(aud)) {
    if (!aud.some((a2) => audienceList.includes(a2))) {
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.EnsureClerkJWT,
        reason: TokenVerificationErrorReason.TokenVerificationFailed,
        message: `Invalid JWT audience claim array (aud) ${JSON.stringify(aud)}. Is not included in "${JSON.stringify(
          audienceList
        )}".`
      });
    }
  }
}, "assertAudienceClaim");
var assertHeaderType = /* @__PURE__ */ __name2((typ, allowedTypes = "JWT") => {
  if (typeof typ === "undefined") {
    return;
  }
  const allowed = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
  if (!allowed.includes(typ)) {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.EnsureClerkJWT,
      reason: TokenVerificationErrorReason.TokenInvalid,
      message: `Invalid JWT type ${JSON.stringify(typ)}. Expected "${allowed.join(", ")}".`
    });
  }
}, "assertHeaderType");
var assertHeaderAlgorithm = /* @__PURE__ */ __name2((alg) => {
  if (!algs.includes(alg)) {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.EnsureClerkJWT,
      reason: TokenVerificationErrorReason.TokenInvalidAlgorithm,
      message: `Invalid JWT algorithm ${JSON.stringify(alg)}. Supported: ${algs}.`
    });
  }
}, "assertHeaderAlgorithm");
var assertSubClaim = /* @__PURE__ */ __name2((sub) => {
  if (typeof sub !== "string") {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.EnsureClerkJWT,
      reason: TokenVerificationErrorReason.TokenVerificationFailed,
      message: `Subject claim (sub) is required and must be a string. Received ${JSON.stringify(sub)}.`
    });
  }
}, "assertSubClaim");
var assertAuthorizedPartiesClaim = /* @__PURE__ */ __name2((azp, authorizedParties) => {
  if (!azp || !authorizedParties || authorizedParties.length === 0) {
    return;
  }
  if (!authorizedParties.includes(azp)) {
    throw new TokenVerificationError({
      reason: TokenVerificationErrorReason.TokenInvalidAuthorizedParties,
      message: `Invalid JWT Authorized party claim (azp) ${JSON.stringify(azp)}. Expected "${authorizedParties}".`
    });
  }
}, "assertAuthorizedPartiesClaim");
var assertExpirationClaim = /* @__PURE__ */ __name2((exp, clockSkewInMs) => {
  if (typeof exp !== "number") {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.EnsureClerkJWT,
      reason: TokenVerificationErrorReason.TokenVerificationFailed,
      message: `Invalid JWT expiry date claim (exp) ${JSON.stringify(exp)}. Expected number.`
    });
  }
  const currentDate = new Date(Date.now());
  const expiryDate = /* @__PURE__ */ new Date(0);
  expiryDate.setUTCSeconds(exp);
  const expired = expiryDate.getTime() <= currentDate.getTime() - clockSkewInMs;
  if (expired) {
    throw new TokenVerificationError({
      reason: TokenVerificationErrorReason.TokenExpired,
      message: `JWT is expired. Expiry date: ${expiryDate.toUTCString()}, Current date: ${currentDate.toUTCString()}.`
    });
  }
}, "assertExpirationClaim");
var assertActivationClaim = /* @__PURE__ */ __name2((nbf, clockSkewInMs) => {
  if (typeof nbf === "undefined") {
    return;
  }
  if (typeof nbf !== "number") {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.EnsureClerkJWT,
      reason: TokenVerificationErrorReason.TokenVerificationFailed,
      message: `Invalid JWT not before date claim (nbf) ${JSON.stringify(nbf)}. Expected number.`
    });
  }
  const currentDate = new Date(Date.now());
  const notBeforeDate = /* @__PURE__ */ new Date(0);
  notBeforeDate.setUTCSeconds(nbf);
  const early = notBeforeDate.getTime() > currentDate.getTime() + clockSkewInMs;
  if (early) {
    throw new TokenVerificationError({
      reason: TokenVerificationErrorReason.TokenNotActiveYet,
      message: `JWT cannot be used prior to not before date claim (nbf). Not before date: ${notBeforeDate.toUTCString()}; Current date: ${currentDate.toUTCString()};`
    });
  }
}, "assertActivationClaim");
var assertIssuedAtClaim = /* @__PURE__ */ __name2((iat, clockSkewInMs) => {
  if (typeof iat === "undefined") {
    return;
  }
  if (typeof iat !== "number") {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.EnsureClerkJWT,
      reason: TokenVerificationErrorReason.TokenVerificationFailed,
      message: `Invalid JWT issued at date claim (iat) ${JSON.stringify(iat)}. Expected number.`
    });
  }
  const currentDate = new Date(Date.now());
  const issuedAtDate = /* @__PURE__ */ new Date(0);
  issuedAtDate.setUTCSeconds(iat);
  const postIssued = issuedAtDate.getTime() > currentDate.getTime() + clockSkewInMs;
  if (postIssued) {
    throw new TokenVerificationError({
      reason: TokenVerificationErrorReason.TokenIatInTheFuture,
      message: `JWT issued at date claim (iat) is in the future. Issued at date: ${issuedAtDate.toUTCString()}; Current date: ${currentDate.toUTCString()};`
    });
  }
}, "assertIssuedAtClaim");
function pemToBuffer(secret) {
  const trimmed = secret.replace(/-----BEGIN.*?-----/g, "").replace(/-----END.*?-----/g, "").replace(/\s/g, "");
  const decoded = isomorphicAtob(trimmed);
  const buffer = new ArrayBuffer(decoded.length);
  const bufView = new Uint8Array(buffer);
  for (let i = 0, strLen = decoded.length; i < strLen; i++) {
    bufView[i] = decoded.charCodeAt(i);
  }
  return bufView;
}
__name(pemToBuffer, "pemToBuffer");
__name2(pemToBuffer, "pemToBuffer");
function importKey(key, algorithm, keyUsage) {
  if (typeof key === "object") {
    return runtime.crypto.subtle.importKey("jwk", key, algorithm, false, [keyUsage]);
  }
  const keyData = pemToBuffer(key);
  const format = keyUsage === "sign" ? "pkcs8" : "spki";
  return runtime.crypto.subtle.importKey(format, keyData, algorithm, false, [keyUsage]);
}
__name(importKey, "importKey");
__name2(importKey, "importKey");
var DEFAULT_CLOCK_SKEW_IN_MS = 5 * 1e3;
async function hasValidSignature(jwt, key) {
  const { header, signature, raw: raw2 } = jwt;
  const encoder = new TextEncoder();
  const data = encoder.encode([raw2.header, raw2.payload].join("."));
  const algorithm = getCryptoAlgorithm(header.alg);
  try {
    const cryptoKey = await importKey(key, algorithm, "verify");
    const verified = await runtime.crypto.subtle.verify(algorithm.name, cryptoKey, signature, data);
    return { data: verified };
  } catch (error) {
    return {
      errors: [
        new TokenVerificationError({
          reason: TokenVerificationErrorReason.TokenInvalidSignature,
          message: error?.message
        })
      ]
    };
  }
}
__name(hasValidSignature, "hasValidSignature");
__name2(hasValidSignature, "hasValidSignature");
function decodeJwt(token) {
  const tokenParts = (token || "").toString().split(".");
  if (tokenParts.length !== 3) {
    return {
      errors: [
        new TokenVerificationError({
          reason: TokenVerificationErrorReason.TokenInvalid,
          message: `Invalid JWT form. A JWT consists of three parts separated by dots.`
        })
      ]
    };
  }
  const [rawHeader, rawPayload, rawSignature] = tokenParts;
  const decoder = new TextDecoder();
  const header = JSON.parse(decoder.decode(base64url.parse(rawHeader, { loose: true })));
  const payload = JSON.parse(decoder.decode(base64url.parse(rawPayload, { loose: true })));
  const signature = base64url.parse(rawSignature, { loose: true });
  const data = {
    header,
    payload,
    signature,
    raw: {
      header: rawHeader,
      payload: rawPayload,
      signature: rawSignature,
      text: token
    }
  };
  return { data };
}
__name(decodeJwt, "decodeJwt");
__name2(decodeJwt, "decodeJwt");
async function verifyJwt(token, options) {
  const { audience, authorizedParties, clockSkewInMs, key, headerType } = options;
  const clockSkew = clockSkewInMs || DEFAULT_CLOCK_SKEW_IN_MS;
  const { data: decoded, errors } = decodeJwt(token);
  if (errors) {
    return { errors };
  }
  const { header, payload } = decoded;
  try {
    const { typ, alg } = header;
    assertHeaderType(typ, headerType);
    assertHeaderAlgorithm(alg);
    const { azp, sub, aud, iat, exp, nbf } = payload;
    assertSubClaim(sub);
    assertAudienceClaim([aud], [audience]);
    assertAuthorizedPartiesClaim(azp, authorizedParties);
    assertExpirationClaim(exp, clockSkew);
    assertActivationClaim(nbf, clockSkew);
    assertIssuedAtClaim(iat, clockSkew);
  } catch (err) {
    return { errors: [err] };
  }
  const { data: signatureValid, errors: signatureErrors } = await hasValidSignature(decoded, key);
  if (signatureErrors) {
    return {
      errors: [
        new TokenVerificationError({
          action: TokenVerificationErrorAction.EnsureClerkJWT,
          reason: TokenVerificationErrorReason.TokenVerificationFailed,
          message: `Error verifying JWT signature. ${signatureErrors[0]}`
        })
      ]
    };
  }
  if (!signatureValid) {
    return {
      errors: [
        new TokenVerificationError({
          reason: TokenVerificationErrorReason.TokenInvalidSignature,
          message: "JWT signature is invalid."
        })
      ]
    };
  }
  return { data: payload };
}
__name(verifyJwt, "verifyJwt");
__name2(verifyJwt, "verifyJwt");
var __create = Object.create;
var __defProp22 = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __typeError = /* @__PURE__ */ __name2((msg) => {
  throw TypeError(msg);
}, "__typeError");
var __commonJS = /* @__PURE__ */ __name2((cb, mod) => /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
}, "__require"), "__require"), "__commonJS");
var __copyProps = /* @__PURE__ */ __name2((to, from, except2, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except2)
        __defProp22(to, key, { get: /* @__PURE__ */ __name2(() => from[key], "get"), enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
}, "__copyProps");
var __toESM = /* @__PURE__ */ __name2((mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp22(target, "default", { value: mod, enumerable: true }) : target,
  mod
)), "__toESM");
var __accessCheck = /* @__PURE__ */ __name2((obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg), "__accessCheck");
var __privateGet = /* @__PURE__ */ __name2((obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj)), "__privateGet");
var __privateAdd = /* @__PURE__ */ __name2((obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value), "__privateAdd");
var __privateSet = /* @__PURE__ */ __name2((obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value), "__privateSet");
var __privateMethod = /* @__PURE__ */ __name2((obj, member, method) => (__accessCheck(obj, member, "access private method"), method), "__privateMethod");
function buildAccountsBaseUrl(frontendApi) {
  if (!frontendApi) return "";
  return `https://${frontendApi.replace(/clerk\.accountsstage\./, "accountsstage.").replace(/clerk\.accounts\.|clerk\./, "accounts.")}`;
}
__name(buildAccountsBaseUrl, "buildAccountsBaseUrl");
__name2(buildAccountsBaseUrl, "buildAccountsBaseUrl");
var TYPES_TO_OBJECTS = {
  strict_mfa: {
    afterMinutes: 10,
    level: "multi_factor"
  },
  strict: {
    afterMinutes: 10,
    level: "second_factor"
  },
  moderate: {
    afterMinutes: 60,
    level: "second_factor"
  },
  lax: {
    afterMinutes: 1440,
    level: "second_factor"
  }
};
var ALLOWED_LEVELS = /* @__PURE__ */ new Set([
  "first_factor",
  "second_factor",
  "multi_factor"
]);
var ALLOWED_TYPES = /* @__PURE__ */ new Set([
  "strict_mfa",
  "strict",
  "moderate",
  "lax"
]);
var isValidMaxAge = /* @__PURE__ */ __name2((maxAge) => typeof maxAge === "number" && maxAge > 0, "isValidMaxAge");
var isValidLevel = /* @__PURE__ */ __name2((level) => ALLOWED_LEVELS.has(level), "isValidLevel");
var isValidVerificationType = /* @__PURE__ */ __name2((type) => ALLOWED_TYPES.has(type), "isValidVerificationType");
var prefixWithOrg = /* @__PURE__ */ __name2((value) => value.replace(/^(org:)*/, "org:"), "prefixWithOrg");
var checkOrgAuthorization = /* @__PURE__ */ __name2((params, options) => {
  const { orgId, orgRole, orgPermissions } = options;
  if (!params.role && !params.permission) return null;
  if (!orgId || !orgRole || !orgPermissions) return null;
  if (params.permission) return orgPermissions.includes(prefixWithOrg(params.permission));
  if (params.role) return prefixWithOrg(orgRole) === prefixWithOrg(params.role);
  return null;
}, "checkOrgAuthorization");
var checkForFeatureOrPlan = /* @__PURE__ */ __name2((claim, featureOrPlan) => {
  const { org: orgFeatures, user: userFeatures } = splitByScope(claim);
  const [scope, _id] = featureOrPlan.split(":");
  const id = _id || scope;
  if (scope === "org") return orgFeatures.includes(id);
  else if (scope === "user") return userFeatures.includes(id);
  else return [...orgFeatures, ...userFeatures].includes(id);
}, "checkForFeatureOrPlan");
var checkBillingAuthorization = /* @__PURE__ */ __name2((params, options) => {
  const { features, plans } = options;
  if (params.feature && features) return checkForFeatureOrPlan(features, params.feature);
  if (params.plan && plans) return checkForFeatureOrPlan(plans, params.plan);
  return null;
}, "checkBillingAuthorization");
var splitByScope = /* @__PURE__ */ __name2((fea) => {
  const features = fea ? fea.split(",").map((f) => f.trim()) : [];
  return {
    org: features.filter((f) => f.split(":")[0].includes("o")).map((f) => f.split(":")[1]),
    user: features.filter((f) => f.split(":")[0].includes("u")).map((f) => f.split(":")[1])
  };
}, "splitByScope");
var validateReverificationConfig = /* @__PURE__ */ __name2((config) => {
  if (!config) return false;
  const convertConfigToObject = /* @__PURE__ */ __name2((config$1) => {
    if (typeof config$1 === "string") return TYPES_TO_OBJECTS[config$1];
    return config$1;
  }, "convertConfigToObject");
  const isValidStringValue = typeof config === "string" && isValidVerificationType(config);
  const isValidObjectValue = typeof config === "object" && isValidLevel(config.level) && isValidMaxAge(config.afterMinutes);
  if (isValidStringValue || isValidObjectValue) return convertConfigToObject.bind(null, config);
  return false;
}, "validateReverificationConfig");
var checkReverificationAuthorization = /* @__PURE__ */ __name2((params, { factorVerificationAge }) => {
  if (!params.reverification || !factorVerificationAge) return null;
  const isValidReverification = validateReverificationConfig(params.reverification);
  if (!isValidReverification) return null;
  const { level, afterMinutes } = isValidReverification();
  const [factor1Age, factor2Age] = factorVerificationAge;
  const isValidFactor1 = factor1Age !== -1 ? afterMinutes > factor1Age : null;
  const isValidFactor2 = factor2Age !== -1 ? afterMinutes > factor2Age : null;
  switch (level) {
    case "first_factor":
      return isValidFactor1;
    case "second_factor":
      return factor2Age !== -1 ? isValidFactor2 : isValidFactor1;
    case "multi_factor":
      return factor2Age === -1 ? isValidFactor1 : isValidFactor1 && isValidFactor2;
  }
}, "checkReverificationAuthorization");
var createCheckAuthorization = /* @__PURE__ */ __name2((options) => {
  return (params) => {
    if (!options.userId) return false;
    const billingAuthorization = checkBillingAuthorization(params, options);
    const orgAuthorization = checkOrgAuthorization(params, options);
    const reverificationAuthorization = checkReverificationAuthorization(params, options);
    if ([billingAuthorization || orgAuthorization, reverificationAuthorization].some((a2) => a2 === null)) return [billingAuthorization || orgAuthorization, reverificationAuthorization].some((a2) => a2 === true);
    return [billingAuthorization || orgAuthorization, reverificationAuthorization].every((a2) => a2 === true);
  };
}, "createCheckAuthorization");
var parsePermissions = /* @__PURE__ */ __name2(({ per, fpm }) => {
  if (!per || !fpm) return {
    permissions: [],
    featurePermissionMap: []
  };
  const permissions = per.split(",").map((p2) => p2.trim());
  return {
    permissions,
    featurePermissionMap: fpm.split(",").map((permission) => Number.parseInt(permission.trim(), 10)).map((permission) => permission.toString(2).padStart(permissions.length, "0").split("").map((bit2) => Number.parseInt(bit2, 10)).reverse()).filter(Boolean)
  };
}, "parsePermissions");
function buildOrgPermissions({ features, permissions, featurePermissionMap }) {
  if (!features || !permissions || !featurePermissionMap) return [];
  const orgPermissions = [];
  for (let featureIndex = 0; featureIndex < features.length; featureIndex++) {
    const feature = features[featureIndex];
    if (featureIndex >= featurePermissionMap.length) continue;
    const permissionBits = featurePermissionMap[featureIndex];
    if (!permissionBits) continue;
    for (let permIndex = 0; permIndex < permissionBits.length; permIndex++) if (permissionBits[permIndex] === 1) orgPermissions.push(`org:${feature}:${permissions[permIndex]}`);
  }
  return orgPermissions;
}
__name(buildOrgPermissions, "buildOrgPermissions");
__name2(buildOrgPermissions, "buildOrgPermissions");
var __experimental_JWTPayloadToAuthObjectProperties = /* @__PURE__ */ __name2((claims) => {
  let orgId;
  let orgRole;
  let orgSlug;
  let orgPermissions;
  const factorVerificationAge = claims.fva ?? null;
  const sessionStatus = claims.sts ?? null;
  switch (claims.v) {
    case 2:
      if (claims.o) {
        orgId = claims.o?.id;
        orgSlug = claims.o?.slg;
        if (claims.o?.rol) orgRole = `org:${claims.o?.rol}`;
        const { org } = splitByScope(claims.fea);
        const { permissions, featurePermissionMap } = parsePermissions({
          per: claims.o?.per,
          fpm: claims.o?.fpm
        });
        orgPermissions = buildOrgPermissions({
          features: org,
          featurePermissionMap,
          permissions
        });
      }
      break;
    default:
      orgId = claims.org_id;
      orgRole = claims.org_role;
      orgSlug = claims.org_slug;
      orgPermissions = claims.org_permissions;
      break;
  }
  return {
    sessionClaims: claims,
    sessionId: claims.sid,
    sessionStatus,
    actor: claims.act,
    userId: claims.sub,
    orgId,
    orgRole,
    orgSlug,
    orgPermissions,
    factorVerificationAge
  };
}, "__experimental_JWTPayloadToAuthObjectProperties");
function _(r) {
  for (var n = [], e = 0; e < r.length; ) {
    var a2 = r[e];
    if (a2 === "*" || a2 === "+" || a2 === "?") {
      n.push({
        type: "MODIFIER",
        index: e,
        value: r[e++]
      });
      continue;
    }
    if (a2 === "\\") {
      n.push({
        type: "ESCAPED_CHAR",
        index: e++,
        value: r[e++]
      });
      continue;
    }
    if (a2 === "{") {
      n.push({
        type: "OPEN",
        index: e,
        value: r[e++]
      });
      continue;
    }
    if (a2 === "}") {
      n.push({
        type: "CLOSE",
        index: e,
        value: r[e++]
      });
      continue;
    }
    if (a2 === ":") {
      for (var u = "", t = e + 1; t < r.length; ) {
        var c = r.charCodeAt(t);
        if (c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 95) {
          u += r[t++];
          continue;
        }
        break;
      }
      if (!u) throw new TypeError("Missing parameter name at ".concat(e));
      n.push({
        type: "NAME",
        index: e,
        value: u
      }), e = t;
      continue;
    }
    if (a2 === "(") {
      var o = 1, m2 = "", t = e + 1;
      if (r[t] === "?") throw new TypeError('Pattern cannot start with "?" at '.concat(t));
      for (; t < r.length; ) {
        if (r[t] === "\\") {
          m2 += r[t++] + r[t++];
          continue;
        }
        if (r[t] === ")") {
          if (o--, o === 0) {
            t++;
            break;
          }
        } else if (r[t] === "(" && (o++, r[t + 1] !== "?")) throw new TypeError("Capturing groups are not allowed at ".concat(t));
        m2 += r[t++];
      }
      if (o) throw new TypeError("Unbalanced pattern at ".concat(e));
      if (!m2) throw new TypeError("Missing pattern at ".concat(e));
      n.push({
        type: "PATTERN",
        index: e,
        value: m2
      }), e = t;
      continue;
    }
    n.push({
      type: "CHAR",
      index: e,
      value: r[e++]
    });
  }
  return n.push({
    type: "END",
    index: e,
    value: ""
  }), n;
}
__name(_, "_");
__name2(_, "_");
function F(r, n) {
  n === void 0 && (n = {});
  for (var e = _(r), a2 = n.prefixes, u = a2 === void 0 ? "./" : a2, t = n.delimiter, c = t === void 0 ? "/#?" : t, o = [], m2 = 0, h = 0, p2 = "", f = function(l) {
    if (h < e.length && e[h].type === l) return e[h++].value;
  }, w = function(l) {
    var v2 = f(l);
    if (v2 !== void 0) return v2;
    var E2 = e[h], N = E2.type, S2 = E2.index;
    throw new TypeError("Unexpected ".concat(N, " at ").concat(S2, ", expected ").concat(l));
  }, d2 = function() {
    for (var l = "", v2; v2 = f("CHAR") || f("ESCAPED_CHAR"); ) l += v2;
    return l;
  }, M = function(l) {
    for (var v2 = 0, E2 = c; v2 < E2.length; v2++) {
      var N = E2[v2];
      if (l.indexOf(N) > -1) return true;
    }
    return false;
  }, A = function(l) {
    var v2 = o[o.length - 1], E2 = l || (v2 && typeof v2 == "string" ? v2 : "");
    if (v2 && !E2) throw new TypeError('Must have text between two parameters, missing text after "'.concat(v2.name, '"'));
    return !E2 || M(E2) ? "[^".concat(s(c), "]+?") : "(?:(?!".concat(s(E2), ")[^").concat(s(c), "])+?");
  }; h < e.length; ) {
    var T2 = f("CHAR"), x2 = f("NAME"), C = f("PATTERN");
    if (x2 || C) {
      var g = T2 || "";
      u.indexOf(g) === -1 && (p2 += g, g = ""), p2 && (o.push(p2), p2 = ""), o.push({
        name: x2 || m2++,
        prefix: g,
        suffix: "",
        pattern: C || A(g),
        modifier: f("MODIFIER") || ""
      });
      continue;
    }
    var i = T2 || f("ESCAPED_CHAR");
    if (i) {
      p2 += i;
      continue;
    }
    p2 && (o.push(p2), p2 = "");
    if (f("OPEN")) {
      var g = d2(), y = f("NAME") || "", O2 = f("PATTERN") || "", b2 = d2();
      w("CLOSE"), o.push({
        name: y || (O2 ? m2++ : ""),
        pattern: y && !O2 ? A(g) : O2,
        prefix: g,
        suffix: b2,
        modifier: f("MODIFIER") || ""
      });
      continue;
    }
    w("END");
  }
  return o;
}
__name(F, "F");
__name2(F, "F");
function H(r, n) {
  var e = [];
  return I(P(r, e, n), e, n);
}
__name(H, "H");
__name2(H, "H");
function I(r, n, e) {
  e === void 0 && (e = {});
  var a2 = e.decode, u = a2 === void 0 ? function(t) {
    return t;
  } : a2;
  return function(t) {
    var c = r.exec(t);
    if (!c) return false;
    for (var o = c[0], m2 = c.index, h = /* @__PURE__ */ Object.create(null), p2 = function(w) {
      if (c[w] === void 0) return "continue";
      var d2 = n[w - 1];
      d2.modifier === "*" || d2.modifier === "+" ? h[d2.name] = c[w].split(d2.prefix + d2.suffix).map(function(M) {
        return u(M, d2);
      }) : h[d2.name] = u(c[w], d2);
    }, f = 1; f < c.length; f++) p2(f);
    return {
      path: o,
      index: m2,
      params: h
    };
  };
}
__name(I, "I");
__name2(I, "I");
function s(r) {
  return r.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(s, "s");
__name2(s, "s");
function D(r) {
  return r && r.sensitive ? "" : "i";
}
__name(D, "D");
__name2(D, "D");
function $(r, n) {
  if (!n) return r;
  for (var e = /\((?:\?<(.*?)>)?(?!\?)/g, a2 = 0, u = e.exec(r.source); u; ) n.push({
    name: u[1] || a2++,
    prefix: "",
    suffix: "",
    modifier: "",
    pattern: ""
  }), u = e.exec(r.source);
  return r;
}
__name($, "$");
__name2($, "$");
function W(r, n, e) {
  var a2 = r.map(function(u) {
    return P(u, n, e).source;
  });
  return new RegExp("(?:".concat(a2.join("|"), ")"), D(e));
}
__name(W, "W");
__name2(W, "W");
function L(r, n, e) {
  return U(F(r, e), n, e);
}
__name(L, "L");
__name2(L, "L");
function U(r, n, e) {
  e === void 0 && (e = {});
  for (var a2 = e.strict, u = a2 === void 0 ? false : a2, t = e.start, c = t === void 0 ? true : t, o = e.end, m2 = o === void 0 ? true : o, h = e.encode, p2 = h === void 0 ? function(v2) {
    return v2;
  } : h, f = e.delimiter, w = f === void 0 ? "/#?" : f, d2 = e.endsWith, M = d2 === void 0 ? "" : d2, A = "[".concat(s(M), "]|$"), T2 = "[".concat(s(w), "]"), x2 = c ? "^" : "", C = 0, g = r; C < g.length; C++) {
    var i = g[C];
    if (typeof i == "string") x2 += s(p2(i));
    else {
      var R = s(p2(i.prefix)), y = s(p2(i.suffix));
      if (i.pattern) if (n && n.push(i), R || y) if (i.modifier === "+" || i.modifier === "*") {
        var O2 = i.modifier === "*" ? "?" : "";
        x2 += "(?:".concat(R, "((?:").concat(i.pattern, ")(?:").concat(y).concat(R, "(?:").concat(i.pattern, "))*)").concat(y, ")").concat(O2);
      } else x2 += "(?:".concat(R, "(").concat(i.pattern, ")").concat(y, ")").concat(i.modifier);
      else {
        if (i.modifier === "+" || i.modifier === "*") throw new TypeError('Can not repeat "'.concat(i.name, '" without a prefix and suffix'));
        x2 += "(".concat(i.pattern, ")").concat(i.modifier);
      }
      else x2 += "(?:".concat(R).concat(y, ")").concat(i.modifier);
    }
  }
  if (m2) u || (x2 += "".concat(T2, "?")), x2 += e.endsWith ? "(?=".concat(A, ")") : "$";
  else {
    var b2 = r[r.length - 1], l = typeof b2 == "string" ? T2.indexOf(b2[b2.length - 1]) > -1 : b2 === void 0;
    u || (x2 += "(?:".concat(T2, "(?=").concat(A, "))?")), l || (x2 += "(?=".concat(T2, "|").concat(A, ")"));
  }
  return new RegExp(x2, D(e));
}
__name(U, "U");
__name2(U, "U");
function P(r, n, e) {
  return r instanceof RegExp ? $(r, n) : Array.isArray(r) ? W(r, n, e) : L(r, n, e);
}
__name(P, "P");
__name2(P, "P");
function match2(str, options) {
  try {
    return H(str, options);
  } catch (e) {
    throw new Error(`Invalid path and options: Consult the documentation of path-to-regexp here: https://github.com/pillarjs/path-to-regexp/tree/6.x
${e.message}`);
  }
}
__name(match2, "match2");
__name2(match2, "match");
var require_dist = __commonJS({
  "../../node_modules/.pnpm/cookie@1.0.2/node_modules/cookie/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parse = parse22;
    exports.serialize = serialize;
    var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
    var cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    var __toString = Object.prototype.toString;
    var NullObject = /* @__PURE__ */ (() => {
      const C = /* @__PURE__ */ __name2(function() {
      }, "C");
      C.prototype = /* @__PURE__ */ Object.create(null);
      return C;
    })();
    function parse22(str, options) {
      const obj = new NullObject();
      const len = str.length;
      if (len < 2)
        return obj;
      const dec = options?.decode || decode;
      let index = 0;
      do {
        const eqIdx = str.indexOf("=", index);
        if (eqIdx === -1)
          break;
        const colonIdx = str.indexOf(";", index);
        const endIdx = colonIdx === -1 ? len : colonIdx;
        if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        const keyStartIdx = startIndex(str, index, eqIdx);
        const keyEndIdx = endIndex(str, eqIdx, keyStartIdx);
        const key = str.slice(keyStartIdx, keyEndIdx);
        if (obj[key] === void 0) {
          let valStartIdx = startIndex(str, eqIdx + 1, endIdx);
          let valEndIdx = endIndex(str, endIdx, valStartIdx);
          const value = dec(str.slice(valStartIdx, valEndIdx));
          obj[key] = value;
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    __name(parse22, "parse22");
    __name2(parse22, "parse2");
    function startIndex(str, index, max) {
      do {
        const code = str.charCodeAt(index);
        if (code !== 32 && code !== 9)
          return index;
      } while (++index < max);
      return max;
    }
    __name(startIndex, "startIndex");
    __name2(startIndex, "startIndex");
    function endIndex(str, index, min) {
      while (index > min) {
        const code = str.charCodeAt(--index);
        if (code !== 32 && code !== 9)
          return index + 1;
      }
      return min;
    }
    __name(endIndex, "endIndex");
    __name2(endIndex, "endIndex");
    function serialize(name, val, options) {
      const enc = options?.encode || encodeURIComponent;
      if (!cookieNameRegExp.test(name)) {
        throw new TypeError(`argument name is invalid: ${name}`);
      }
      const value = enc(val);
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${val}`);
      }
      let str = name + "=" + value;
      if (!options)
        return str;
      if (options.maxAge !== void 0) {
        if (!Number.isInteger(options.maxAge)) {
          throw new TypeError(`option maxAge is invalid: ${options.maxAge}`);
        }
        str += "; Max-Age=" + options.maxAge;
      }
      if (options.domain) {
        if (!domainValueRegExp.test(options.domain)) {
          throw new TypeError(`option domain is invalid: ${options.domain}`);
        }
        str += "; Domain=" + options.domain;
      }
      if (options.path) {
        if (!pathValueRegExp.test(options.path)) {
          throw new TypeError(`option path is invalid: ${options.path}`);
        }
        str += "; Path=" + options.path;
      }
      if (options.expires) {
        if (!isDate(options.expires) || !Number.isFinite(options.expires.valueOf())) {
          throw new TypeError(`option expires is invalid: ${options.expires}`);
        }
        str += "; Expires=" + options.expires.toUTCString();
      }
      if (options.httpOnly) {
        str += "; HttpOnly";
      }
      if (options.secure) {
        str += "; Secure";
      }
      if (options.partitioned) {
        str += "; Partitioned";
      }
      if (options.priority) {
        const priority = typeof options.priority === "string" ? options.priority.toLowerCase() : void 0;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError(`option priority is invalid: ${options.priority}`);
        }
      }
      if (options.sameSite) {
        const sameSite = typeof options.sameSite === "string" ? options.sameSite.toLowerCase() : options.sameSite;
        switch (sameSite) {
          case true:
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError(`option sameSite is invalid: ${options.sameSite}`);
        }
      }
      return str;
    }
    __name(serialize, "serialize");
    __name2(serialize, "serialize");
    function decode(str) {
      if (str.indexOf("%") === -1)
        return str;
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    }
    __name(decode, "decode");
    __name2(decode, "decode");
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
    __name(isDate, "isDate");
    __name2(isDate, "isDate");
  }
});
var API_URL = "https://api.clerk.com";
var API_VERSION = "v1";
var USER_AGENT = `${"@clerk/backend"}@${"2.33.0"}`;
var MAX_CACHE_LAST_UPDATED_AT_SECONDS = 5 * 60;
var SUPPORTED_BAPI_VERSION = "2025-11-10";
var Attributes = {
  AuthToken: "__clerkAuthToken",
  AuthSignature: "__clerkAuthSignature",
  AuthStatus: "__clerkAuthStatus",
  AuthReason: "__clerkAuthReason",
  AuthMessage: "__clerkAuthMessage",
  ClerkUrl: "__clerkUrl"
};
var Cookies = {
  Session: "__session",
  Refresh: "__refresh",
  ClientUat: "__client_uat",
  Handshake: "__clerk_handshake",
  DevBrowser: "__clerk_db_jwt",
  RedirectCount: "__clerk_redirect_count",
  HandshakeNonce: "__clerk_handshake_nonce"
};
var QueryParameters = {
  ClerkSynced: "__clerk_synced",
  SuffixedCookies: "suffixed_cookies",
  ClerkRedirectUrl: "__clerk_redirect_url",
  // use the reference to Cookies to indicate that it's the same value
  DevBrowser: Cookies.DevBrowser,
  Handshake: Cookies.Handshake,
  HandshakeHelp: "__clerk_help",
  LegacyDevBrowser: "__dev_session",
  HandshakeReason: "__clerk_hs_reason",
  HandshakeNonce: Cookies.HandshakeNonce,
  HandshakeFormat: "format",
  Session: "__session"
};
var Headers2 = {
  Accept: "accept",
  AuthMessage: "x-clerk-auth-message",
  Authorization: "authorization",
  AuthReason: "x-clerk-auth-reason",
  AuthSignature: "x-clerk-auth-signature",
  AuthStatus: "x-clerk-auth-status",
  AuthToken: "x-clerk-auth-token",
  CacheControl: "cache-control",
  ClerkRedirectTo: "x-clerk-redirect-to",
  ClerkRequestData: "x-clerk-request-data",
  ClerkUrl: "x-clerk-clerk-url",
  CloudFrontForwardedProto: "cloudfront-forwarded-proto",
  ContentType: "content-type",
  ContentSecurityPolicy: "content-security-policy",
  ContentSecurityPolicyReportOnly: "content-security-policy-report-only",
  EnableDebug: "x-clerk-debug",
  ForwardedHost: "x-forwarded-host",
  ForwardedPort: "x-forwarded-port",
  ForwardedProto: "x-forwarded-proto",
  Host: "host",
  Location: "location",
  Nonce: "x-nonce",
  Origin: "origin",
  Referrer: "referer",
  SecFetchDest: "sec-fetch-dest",
  SecFetchSite: "sec-fetch-site",
  UserAgent: "user-agent",
  ReportingEndpoints: "reporting-endpoints"
};
var ContentTypes = {
  Json: "application/json"
};
var constants = {
  Attributes,
  Cookies,
  Headers: Headers2,
  ContentTypes,
  QueryParameters
};
function mergePreDefinedOptions(preDefinedOptions, options) {
  return Object.keys(preDefinedOptions).reduce(
    (obj, key) => {
      return { ...obj, [key]: options[key] || obj[key] };
    },
    { ...preDefinedOptions }
  );
}
__name(mergePreDefinedOptions, "mergePreDefinedOptions");
__name2(mergePreDefinedOptions, "mergePreDefinedOptions");
function assertValidSecretKey(val) {
  if (!val || typeof val !== "string") {
    throw Error("Missing Clerk Secret Key. Go to https://dashboard.clerk.com and get your key for your instance.");
  }
}
__name(assertValidSecretKey, "assertValidSecretKey");
__name2(assertValidSecretKey, "assertValidSecretKey");
function assertValidPublishableKey(val) {
  parsePublishableKey(val, { fatal: true });
}
__name(assertValidPublishableKey, "assertValidPublishableKey");
__name2(assertValidPublishableKey, "assertValidPublishableKey");
var TokenType = {
  SessionToken: "session_token",
  ApiKey: "api_key",
  M2MToken: "m2m_token",
  OAuthToken: "oauth_token"
};
var AuthenticateContext = class {
  static {
    __name(this, "AuthenticateContext");
  }
  static {
    __name2(this, "AuthenticateContext");
  }
  constructor(cookieSuffix, clerkRequest, options) {
    this.cookieSuffix = cookieSuffix;
    this.clerkRequest = clerkRequest;
    this.originalFrontendApi = "";
    if (options.acceptsToken === TokenType.M2MToken || options.acceptsToken === TokenType.ApiKey) {
      this.initHeaderValues();
    } else {
      this.initPublishableKeyValues(options);
      this.initHeaderValues();
      this.initCookieValues();
      this.initHandshakeValues();
    }
    Object.assign(this, options);
    this.clerkUrl = this.clerkRequest.clerkUrl;
  }
  /**
   * Retrieves the session token from either the cookie or the header.
   *
   * @returns {string | undefined} The session token if available, otherwise undefined.
   */
  get sessionToken() {
    return this.sessionTokenInCookie || this.tokenInHeader;
  }
  usesSuffixedCookies() {
    const suffixedClientUat = this.getSuffixedCookie(constants.Cookies.ClientUat);
    const clientUat = this.getCookie(constants.Cookies.ClientUat);
    const suffixedSession = this.getSuffixedCookie(constants.Cookies.Session) || "";
    const session = this.getCookie(constants.Cookies.Session) || "";
    if (session && !this.tokenHasIssuer(session)) {
      return false;
    }
    if (session && !this.tokenBelongsToInstance(session)) {
      return true;
    }
    if (!suffixedClientUat && !suffixedSession) {
      return false;
    }
    const { data: sessionData } = decodeJwt(session);
    const sessionIat = sessionData?.payload.iat || 0;
    const { data: suffixedSessionData } = decodeJwt(suffixedSession);
    const suffixedSessionIat = suffixedSessionData?.payload.iat || 0;
    if (suffixedClientUat !== "0" && clientUat !== "0" && sessionIat > suffixedSessionIat) {
      return false;
    }
    if (suffixedClientUat === "0" && clientUat !== "0") {
      return false;
    }
    if (this.instanceType !== "production") {
      const isSuffixedSessionExpired = this.sessionExpired(suffixedSessionData);
      if (suffixedClientUat !== "0" && clientUat === "0" && isSuffixedSessionExpired) {
        return false;
      }
    }
    if (!suffixedClientUat && suffixedSession) {
      return false;
    }
    return true;
  }
  /**
   * Determines if the request came from a different origin based on the referrer header.
   * Used for cross-origin detection in multi-domain authentication flows.
   *
   * @returns {boolean} True if referrer exists and is from a different origin, false otherwise.
   */
  isCrossOriginReferrer() {
    if (!this.referrer || !this.clerkUrl.origin) {
      return false;
    }
    try {
      const referrerOrigin = new URL(this.referrer).origin;
      return referrerOrigin !== this.clerkUrl.origin;
    } catch {
      return false;
    }
  }
  /**
   * Determines if the referrer URL is from a Clerk domain (accounts portal or FAPI).
   * This includes both development and production account portal domains, as well as FAPI domains
   * used for redirect-based authentication flows.
   *
   * @returns {boolean} True if the referrer is from a Clerk accounts portal or FAPI domain, false otherwise
   */
  isKnownClerkReferrer() {
    if (!this.referrer) {
      return false;
    }
    try {
      const referrerOrigin = new URL(this.referrer);
      const referrerHost = referrerOrigin.hostname;
      if (this.frontendApi) {
        const fapiHost = this.frontendApi.startsWith("http") ? new URL(this.frontendApi).hostname : this.frontendApi;
        if (referrerHost === fapiHost) {
          return true;
        }
      }
      if (isLegacyDevAccountPortalOrigin(referrerHost) || isCurrentDevAccountPortalOrigin(referrerHost)) {
        return true;
      }
      const expectedAccountsUrl = buildAccountsBaseUrl(this.frontendApi);
      if (expectedAccountsUrl) {
        const expectedAccountsOrigin = new URL(expectedAccountsUrl).origin;
        if (referrerOrigin.origin === expectedAccountsOrigin) {
          return true;
        }
      }
      if (referrerHost.startsWith("accounts.")) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  initPublishableKeyValues(options) {
    assertValidPublishableKey(options.publishableKey);
    this.publishableKey = options.publishableKey;
    const originalPk = parsePublishableKey(this.publishableKey, {
      fatal: true,
      domain: options.domain,
      isSatellite: options.isSatellite
    });
    this.originalFrontendApi = originalPk.frontendApi;
    const pk = parsePublishableKey(this.publishableKey, {
      fatal: true,
      proxyUrl: options.proxyUrl,
      domain: options.domain,
      isSatellite: options.isSatellite
    });
    this.instanceType = pk.instanceType;
    this.frontendApi = pk.frontendApi;
  }
  initHeaderValues() {
    this.tokenInHeader = this.parseAuthorizationHeader(this.getHeader(constants.Headers.Authorization));
    this.origin = this.getHeader(constants.Headers.Origin);
    this.host = this.getHeader(constants.Headers.Host);
    this.forwardedHost = this.getHeader(constants.Headers.ForwardedHost);
    this.forwardedProto = this.getHeader(constants.Headers.CloudFrontForwardedProto) || this.getHeader(constants.Headers.ForwardedProto);
    this.referrer = this.getHeader(constants.Headers.Referrer);
    this.userAgent = this.getHeader(constants.Headers.UserAgent);
    this.secFetchDest = this.getHeader(constants.Headers.SecFetchDest);
    this.accept = this.getHeader(constants.Headers.Accept);
  }
  initCookieValues() {
    this.sessionTokenInCookie = this.getSuffixedOrUnSuffixedCookie(constants.Cookies.Session);
    this.refreshTokenInCookie = this.getSuffixedCookie(constants.Cookies.Refresh);
    this.clientUat = Number.parseInt(this.getSuffixedOrUnSuffixedCookie(constants.Cookies.ClientUat) || "") || 0;
  }
  initHandshakeValues() {
    this.devBrowserToken = this.getQueryParam(constants.QueryParameters.DevBrowser) || this.getSuffixedOrUnSuffixedCookie(constants.Cookies.DevBrowser);
    this.handshakeToken = this.getQueryParam(constants.QueryParameters.Handshake) || this.getCookie(constants.Cookies.Handshake);
    this.handshakeRedirectLoopCounter = Number(this.getCookie(constants.Cookies.RedirectCount)) || 0;
    this.handshakeNonce = this.getQueryParam(constants.QueryParameters.HandshakeNonce) || this.getCookie(constants.Cookies.HandshakeNonce);
  }
  getQueryParam(name) {
    return this.clerkRequest.clerkUrl.searchParams.get(name);
  }
  getHeader(name) {
    return this.clerkRequest.headers.get(name) || void 0;
  }
  getCookie(name) {
    return this.clerkRequest.cookies.get(name) || void 0;
  }
  getSuffixedCookie(name) {
    return this.getCookie(getSuffixedCookieName(name, this.cookieSuffix)) || void 0;
  }
  getSuffixedOrUnSuffixedCookie(cookieName) {
    if (this.usesSuffixedCookies()) {
      return this.getSuffixedCookie(cookieName);
    }
    return this.getCookie(cookieName);
  }
  parseAuthorizationHeader(authorizationHeader) {
    if (!authorizationHeader) {
      return void 0;
    }
    const [scheme, token] = authorizationHeader.split(" ", 2);
    if (!token) {
      return scheme;
    }
    if (scheme === "Bearer") {
      return token;
    }
    return void 0;
  }
  tokenHasIssuer(token) {
    const { data, errors } = decodeJwt(token);
    if (errors) {
      return false;
    }
    return !!data.payload.iss;
  }
  tokenBelongsToInstance(token) {
    if (!token) {
      return false;
    }
    const { data, errors } = decodeJwt(token);
    if (errors) {
      return false;
    }
    const tokenIssuer = data.payload.iss.replace(/https?:\/\//gi, "");
    return this.originalFrontendApi === tokenIssuer;
  }
  sessionExpired(jwt) {
    return !!jwt && jwt?.payload.exp <= Date.now() / 1e3 >> 0;
  }
};
var createAuthenticateContext = /* @__PURE__ */ __name2(async (clerkRequest, options) => {
  const cookieSuffix = options.publishableKey ? await getCookieSuffix(options.publishableKey, runtime.crypto.subtle) : "";
  return new AuthenticateContext(cookieSuffix, clerkRequest, options);
}, "createAuthenticateContext");
var SEPARATOR = "/";
var MULTIPLE_SEPARATOR_REGEX = new RegExp("(?<!:)" + SEPARATOR + "{1,}", "g");
function joinPaths(...args) {
  return args.filter((p2) => p2).join(SEPARATOR).replace(MULTIPLE_SEPARATOR_REGEX, SEPARATOR);
}
__name(joinPaths, "joinPaths");
__name2(joinPaths, "joinPaths");
var AbstractAPI = class {
  static {
    __name(this, "AbstractAPI");
  }
  static {
    __name2(this, "AbstractAPI");
  }
  constructor(request) {
    this.request = request;
  }
  requireId(id) {
    if (!id) {
      throw new Error("A valid resource ID is required.");
    }
  }
};
var basePath = "/actor_tokens";
var ActorTokenAPI = class extends AbstractAPI {
  static {
    __name(this, "ActorTokenAPI");
  }
  static {
    __name2(this, "ActorTokenAPI");
  }
  async create(params) {
    return this.request({
      method: "POST",
      path: basePath,
      bodyParams: params
    });
  }
  async revoke(actorTokenId) {
    this.requireId(actorTokenId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath, actorTokenId, "revoke")
    });
  }
};
var basePath2 = "/agents/tasks";
var AgentTaskAPI = class extends AbstractAPI {
  static {
    __name(this, "AgentTaskAPI");
  }
  static {
    __name2(this, "AgentTaskAPI");
  }
  /**
   * @experimental This is an experimental API for the Agent Tokens feature that is available under a private beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
   */
  async create(params) {
    return this.request({
      method: "POST",
      path: basePath2,
      bodyParams: params,
      options: {
        deepSnakecaseBodyParamKeys: true
      }
    });
  }
  async revoke(agentTaskId) {
    this.requireId(agentTaskId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath2, agentTaskId, "revoke")
    });
  }
};
var basePath3 = "/accountless_applications";
var AccountlessApplicationAPI = class extends AbstractAPI {
  static {
    __name(this, "AccountlessApplicationAPI");
  }
  static {
    __name2(this, "AccountlessApplicationAPI");
  }
  async createAccountlessApplication(params) {
    const headerParams = params?.requestHeaders ? Object.fromEntries(params.requestHeaders.entries()) : void 0;
    return this.request({
      method: "POST",
      path: basePath3,
      headerParams
    });
  }
  async completeAccountlessApplicationOnboarding(params) {
    const headerParams = params?.requestHeaders ? Object.fromEntries(params.requestHeaders.entries()) : void 0;
    return this.request({
      method: "POST",
      path: joinPaths(basePath3, "complete"),
      headerParams
    });
  }
};
var basePath4 = "/allowlist_identifiers";
var AllowlistIdentifierAPI = class extends AbstractAPI {
  static {
    __name(this, "AllowlistIdentifierAPI");
  }
  static {
    __name2(this, "AllowlistIdentifierAPI");
  }
  async getAllowlistIdentifierList(params = {}) {
    return this.request({
      method: "GET",
      path: basePath4,
      queryParams: { ...params, paginated: true }
    });
  }
  async createAllowlistIdentifier(params) {
    return this.request({
      method: "POST",
      path: basePath4,
      bodyParams: params
    });
  }
  async deleteAllowlistIdentifier(allowlistIdentifierId) {
    this.requireId(allowlistIdentifierId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath4, allowlistIdentifierId)
    });
  }
};
var basePath5 = "/api_keys";
var APIKeysAPI = class extends AbstractAPI {
  static {
    __name(this, "APIKeysAPI");
  }
  static {
    __name2(this, "APIKeysAPI");
  }
  async list(queryParams) {
    return this.request({
      method: "GET",
      path: basePath5,
      queryParams
    });
  }
  async create(params) {
    return this.request({
      method: "POST",
      path: basePath5,
      bodyParams: params
    });
  }
  async get(apiKeyId) {
    this.requireId(apiKeyId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath5, apiKeyId)
    });
  }
  async update(params) {
    const { apiKeyId, ...bodyParams } = params;
    this.requireId(apiKeyId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath5, apiKeyId),
      bodyParams
    });
  }
  async delete(apiKeyId) {
    this.requireId(apiKeyId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath5, apiKeyId)
    });
  }
  async revoke(params) {
    const { apiKeyId, revocationReason = null } = params;
    this.requireId(apiKeyId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath5, apiKeyId, "revoke"),
      bodyParams: { revocationReason }
    });
  }
  async getSecret(apiKeyId) {
    this.requireId(apiKeyId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath5, apiKeyId, "secret")
    });
  }
  async verify(secret) {
    return this.request({
      method: "POST",
      path: joinPaths(basePath5, "verify"),
      bodyParams: { secret }
    });
  }
  /**
   * @deprecated Use `verify()` instead. This method will be removed in the next major release.
   */
  async verifySecret(secret) {
    deprecated("apiKeys.verifySecret()", "Use `apiKeys.verify()` instead.");
    return this.verify(secret);
  }
};
var basePath6 = "/beta_features";
var BetaFeaturesAPI = class extends AbstractAPI {
  static {
    __name(this, "BetaFeaturesAPI");
  }
  static {
    __name2(this, "BetaFeaturesAPI");
  }
  /**
   * Change the domain of a production instance.
   *
   * Changing the domain requires updating the DNS records accordingly, deploying new SSL certificates,
   * updating your Social Connection's redirect URLs and setting the new keys in your code.
   *
   * @remarks
   * WARNING: Changing your domain will invalidate all current user sessions (i.e. users will be logged out).
   *          Also, while your application is being deployed, a small downtime is expected to occur.
   */
  async changeDomain(params) {
    return this.request({
      method: "POST",
      path: joinPaths(basePath6, "change_domain"),
      bodyParams: params
    });
  }
};
var basePath7 = "/blocklist_identifiers";
var BlocklistIdentifierAPI = class extends AbstractAPI {
  static {
    __name(this, "BlocklistIdentifierAPI");
  }
  static {
    __name2(this, "BlocklistIdentifierAPI");
  }
  async getBlocklistIdentifierList(params = {}) {
    return this.request({
      method: "GET",
      path: basePath7,
      queryParams: params
    });
  }
  async createBlocklistIdentifier(params) {
    return this.request({
      method: "POST",
      path: basePath7,
      bodyParams: params
    });
  }
  async deleteBlocklistIdentifier(blocklistIdentifierId) {
    this.requireId(blocklistIdentifierId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath7, blocklistIdentifierId)
    });
  }
};
var basePath8 = "/clients";
var ClientAPI = class extends AbstractAPI {
  static {
    __name(this, "ClientAPI");
  }
  static {
    __name2(this, "ClientAPI");
  }
  async getClientList(params = {}) {
    return this.request({
      method: "GET",
      path: basePath8,
      queryParams: { ...params, paginated: true }
    });
  }
  async getClient(clientId) {
    this.requireId(clientId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath8, clientId)
    });
  }
  verifyClient(token) {
    return this.request({
      method: "POST",
      path: joinPaths(basePath8, "verify"),
      bodyParams: { token }
    });
  }
  async getHandshakePayload(queryParams) {
    return this.request({
      method: "GET",
      path: joinPaths(basePath8, "handshake_payload"),
      queryParams
    });
  }
};
var basePath9 = "/domains";
var DomainAPI = class extends AbstractAPI {
  static {
    __name(this, "DomainAPI");
  }
  static {
    __name2(this, "DomainAPI");
  }
  async list() {
    return this.request({
      method: "GET",
      path: basePath9
    });
  }
  async add(params) {
    return this.request({
      method: "POST",
      path: basePath9,
      bodyParams: params
    });
  }
  async update(params) {
    const { domainId, ...bodyParams } = params;
    this.requireId(domainId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath9, domainId),
      bodyParams
    });
  }
  /**
   * Deletes a satellite domain for the instance.
   * It is currently not possible to delete the instance's primary domain.
   */
  async delete(satelliteDomainId) {
    return this.deleteDomain(satelliteDomainId);
  }
  /**
   * @deprecated Use `delete` instead
   */
  async deleteDomain(satelliteDomainId) {
    this.requireId(satelliteDomainId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath9, satelliteDomainId)
    });
  }
};
var basePath10 = "/email_addresses";
var EmailAddressAPI = class extends AbstractAPI {
  static {
    __name(this, "EmailAddressAPI");
  }
  static {
    __name2(this, "EmailAddressAPI");
  }
  async getEmailAddress(emailAddressId) {
    this.requireId(emailAddressId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath10, emailAddressId)
    });
  }
  async createEmailAddress(params) {
    return this.request({
      method: "POST",
      path: basePath10,
      bodyParams: params
    });
  }
  async updateEmailAddress(emailAddressId, params = {}) {
    this.requireId(emailAddressId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath10, emailAddressId),
      bodyParams: params
    });
  }
  async deleteEmailAddress(emailAddressId) {
    this.requireId(emailAddressId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath10, emailAddressId)
    });
  }
};
var basePath11 = "/oauth_applications/access_tokens";
var IdPOAuthAccessTokenApi = class extends AbstractAPI {
  static {
    __name(this, "IdPOAuthAccessTokenApi");
  }
  static {
    __name2(this, "IdPOAuthAccessTokenApi");
  }
  async verify(accessToken) {
    return this.request({
      method: "POST",
      path: joinPaths(basePath11, "verify"),
      bodyParams: { access_token: accessToken }
    });
  }
  /**
   * @deprecated Use `verify()` instead. This method will be removed in the next major release.
   */
  async verifyAccessToken(accessToken) {
    deprecated("idPOAuthAccessToken.verifyAccessToken()", "Use `idPOAuthAccessToken.verify()` instead.");
    return this.verify(accessToken);
  }
};
var basePath12 = "/instance";
var InstanceAPI = class extends AbstractAPI {
  static {
    __name(this, "InstanceAPI");
  }
  static {
    __name2(this, "InstanceAPI");
  }
  async get() {
    return this.request({
      method: "GET",
      path: basePath12
    });
  }
  async update(params) {
    return this.request({
      method: "PATCH",
      path: basePath12,
      bodyParams: params
    });
  }
  async updateRestrictions(params) {
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath12, "restrictions"),
      bodyParams: params
    });
  }
  async updateOrganizationSettings(params) {
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath12, "organization_settings"),
      bodyParams: params
    });
  }
};
var basePath13 = "/invitations";
var InvitationAPI = class extends AbstractAPI {
  static {
    __name(this, "InvitationAPI");
  }
  static {
    __name2(this, "InvitationAPI");
  }
  async getInvitationList(params = {}) {
    return this.request({
      method: "GET",
      path: basePath13,
      queryParams: { ...params, paginated: true }
    });
  }
  async createInvitation(params) {
    return this.request({
      method: "POST",
      path: basePath13,
      bodyParams: params
    });
  }
  async createInvitationBulk(params) {
    return this.request({
      method: "POST",
      path: joinPaths(basePath13, "bulk"),
      bodyParams: params
    });
  }
  async revokeInvitation(invitationId) {
    this.requireId(invitationId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath13, invitationId, "revoke")
    });
  }
};
var basePath14 = "/machines";
var MachineApi = class extends AbstractAPI {
  static {
    __name(this, "MachineApi");
  }
  static {
    __name2(this, "MachineApi");
  }
  async get(machineId) {
    this.requireId(machineId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath14, machineId)
    });
  }
  async list(queryParams = {}) {
    return this.request({
      method: "GET",
      path: basePath14,
      queryParams
    });
  }
  async create(bodyParams) {
    return this.request({
      method: "POST",
      path: basePath14,
      bodyParams
    });
  }
  async update(params) {
    const { machineId, ...bodyParams } = params;
    this.requireId(machineId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath14, machineId),
      bodyParams
    });
  }
  async delete(machineId) {
    this.requireId(machineId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath14, machineId)
    });
  }
  async getSecretKey(machineId) {
    this.requireId(machineId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath14, machineId, "secret_key")
    });
  }
  async rotateSecretKey(params) {
    const { machineId, previousTokenTtl } = params;
    this.requireId(machineId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath14, machineId, "secret_key", "rotate"),
      bodyParams: {
        previousTokenTtl
      }
    });
  }
  /**
   * Creates a new machine scope, allowing the specified machine to access another machine.
   *
   * @param machineId - The ID of the machine that will have access to another machine.
   * @param toMachineId - The ID of the machine that will be scoped to the current machine.
   */
  async createScope(machineId, toMachineId) {
    this.requireId(machineId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath14, machineId, "scopes"),
      bodyParams: {
        toMachineId
      }
    });
  }
  /**
   * Deletes a machine scope, removing access from one machine to another.
   *
   * @param machineId - The ID of the machine that has access to another machine.
   * @param otherMachineId - The ID of the machine that is being accessed.
   */
  async deleteScope(machineId, otherMachineId) {
    this.requireId(machineId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath14, machineId, "scopes", otherMachineId)
    });
  }
};
var IdPOAuthAccessToken = class _IdPOAuthAccessToken {
  static {
    __name(this, "_IdPOAuthAccessToken");
  }
  static {
    __name2(this, "_IdPOAuthAccessToken");
  }
  constructor(id, clientId, type, subject, scopes, revoked, revocationReason, expired, expiration, createdAt, updatedAt) {
    this.id = id;
    this.clientId = clientId;
    this.type = type;
    this.subject = subject;
    this.scopes = scopes;
    this.revoked = revoked;
    this.revocationReason = revocationReason;
    this.expired = expired;
    this.expiration = expiration;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
  static fromJSON(data) {
    return new _IdPOAuthAccessToken(
      data.id,
      data.client_id,
      data.type,
      data.subject,
      data.scopes,
      data.revoked,
      data.revocation_reason,
      data.expired,
      data.expiration,
      data.created_at,
      data.updated_at
    );
  }
  /**
   * Creates an IdPOAuthAccessToken from a JWT payload.
   * Maps standard JWT claims and OAuth-specific fields to token properties.
   */
  static fromJwtPayload(payload, clockSkewInMs = 5e3) {
    const oauthPayload = payload;
    return new _IdPOAuthAccessToken(
      oauthPayload.jti ?? "",
      oauthPayload.client_id ?? "",
      "oauth_token",
      payload.sub,
      oauthPayload.scp ?? oauthPayload.scope?.split(" ") ?? [],
      false,
      null,
      payload.exp * 1e3 <= Date.now() - clockSkewInMs,
      payload.exp,
      payload.iat,
      payload.iat
    );
  }
};
var M2MToken = class _M2MToken {
  static {
    __name(this, "_M2MToken");
  }
  static {
    __name2(this, "_M2MToken");
  }
  constructor(id, subject, scopes, claims, revoked, revocationReason, expired, expiration, createdAt, updatedAt, token) {
    this.id = id;
    this.subject = subject;
    this.scopes = scopes;
    this.claims = claims;
    this.revoked = revoked;
    this.revocationReason = revocationReason;
    this.expired = expired;
    this.expiration = expiration;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.token = token;
  }
  static fromJSON(data) {
    return new _M2MToken(
      data.id,
      data.subject,
      data.scopes,
      data.claims,
      data.revoked,
      data.revocation_reason,
      data.expired,
      data.expiration,
      data.created_at,
      data.updated_at,
      data.token
    );
  }
  static fromJwtPayload(payload, clockSkewInMs = 5e3) {
    return new _M2MToken(
      payload.jti ?? "",
      // jti should always be present in Clerk-issued M2M JWTs
      payload.sub,
      payload.scopes?.split(" ") ?? payload.aud ?? [],
      null,
      false,
      null,
      payload.exp * 1e3 <= Date.now() - clockSkewInMs,
      payload.exp * 1e3,
      // milliseconds — expiration, converted from JWT exp claim
      payload.iat * 1e3,
      // milliseconds — createdAt, converted from JWT iat claim
      payload.iat * 1e3
      // milliseconds — updatedAt, no JWT equivalent; defaults to iat
    );
  }
};
var cache = {};
var lastUpdatedAt = 0;
function getFromCache(kid) {
  return cache[kid];
}
__name(getFromCache, "getFromCache");
__name2(getFromCache, "getFromCache");
function getCacheValues() {
  return Object.values(cache);
}
__name(getCacheValues, "getCacheValues");
__name2(getCacheValues, "getCacheValues");
function setInCache(cacheKey, jwk, shouldExpire = true) {
  cache[cacheKey] = jwk;
  lastUpdatedAt = shouldExpire ? Date.now() : -1;
}
__name(setInCache, "setInCache");
__name2(setInCache, "setInCache");
var PEM_HEADER = "-----BEGIN PUBLIC KEY-----";
var PEM_TRAILER = "-----END PUBLIC KEY-----";
var RSA_PREFIX = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA";
var RSA_SUFFIX = "IDAQAB";
function loadClerkJwkFromPem(params) {
  const { kid, pem } = params;
  const prefixedKid = `local-${kid}`;
  const cachedJwk = getFromCache(prefixedKid);
  if (cachedJwk) {
    return cachedJwk;
  }
  if (!pem) {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.SetClerkJWTKey,
      message: "Missing local JWK.",
      reason: TokenVerificationErrorReason.LocalJWKMissing
    });
  }
  const modulus = pem.replace(/\r\n|\n|\r/g, "").replace(PEM_HEADER, "").replace(PEM_TRAILER, "").replace(RSA_PREFIX, "").replace(RSA_SUFFIX, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwk = { kid: prefixedKid, kty: "RSA", alg: "RS256", n: modulus, e: "AQAB" };
  setInCache(prefixedKid, jwk, false);
  return jwk;
}
__name(loadClerkJwkFromPem, "loadClerkJwkFromPem");
__name2(loadClerkJwkFromPem, "loadClerkJwkFromPem");
async function loadClerkJWKFromRemote(params) {
  const { secretKey, apiUrl = API_URL, apiVersion = API_VERSION, kid, skipJwksCache } = params;
  if (skipJwksCache || cacheHasExpired() || !getFromCache(kid)) {
    if (!secretKey) {
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.ContactSupport,
        message: "Failed to load JWKS from Clerk Backend or Frontend API.",
        reason: TokenVerificationErrorReason.RemoteJWKFailedToLoad
      });
    }
    const fetcher = /* @__PURE__ */ __name2(() => fetchJWKSFromBAPI(apiUrl, secretKey, apiVersion), "fetcher");
    const { keys } = await retry(fetcher);
    if (!keys || !keys.length) {
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.ContactSupport,
        message: "The JWKS endpoint did not contain any signing keys. Contact support@clerk.com.",
        reason: TokenVerificationErrorReason.RemoteJWKFailedToLoad
      });
    }
    keys.forEach((key) => setInCache(key.kid, key));
  }
  const jwk = getFromCache(kid);
  if (!jwk) {
    const cacheValues = getCacheValues();
    const jwkKeys = cacheValues.map((jwk2) => jwk2.kid).sort().join(", ");
    throw new TokenVerificationError({
      action: `Go to your Dashboard and validate your secret and public keys are correct. ${TokenVerificationErrorAction.ContactSupport} if the issue persists.`,
      message: `Unable to find a signing key in JWKS that matches the kid='${kid}' of the provided session token. Please make sure that the __session cookie or the HTTP authorization header contain a Clerk-generated session JWT. The following kid is available: ${jwkKeys}`,
      reason: TokenVerificationErrorReason.JWKKidMismatch
    });
  }
  return jwk;
}
__name(loadClerkJWKFromRemote, "loadClerkJWKFromRemote");
__name2(loadClerkJWKFromRemote, "loadClerkJWKFromRemote");
async function fetchJWKSFromBAPI(apiUrl, key, apiVersion) {
  if (!key) {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.SetClerkSecretKey,
      message: "Missing Clerk Secret Key or API Key. Go to https://dashboard.clerk.com and get your key for your instance.",
      reason: TokenVerificationErrorReason.RemoteJWKFailedToLoad
    });
  }
  const url = new URL(apiUrl);
  url.pathname = joinPaths(url.pathname, apiVersion, "/jwks");
  const response = await runtime.fetch(url.href, {
    headers: {
      Authorization: `Bearer ${key}`,
      "Clerk-API-Version": SUPPORTED_BAPI_VERSION,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT
    }
  });
  if (!response.ok) {
    const json2 = await response.json();
    const invalidSecretKeyError = getErrorObjectByCode(json2?.errors, TokenVerificationErrorCode.InvalidSecretKey);
    if (invalidSecretKeyError) {
      const reason = TokenVerificationErrorReason.InvalidSecretKey;
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.ContactSupport,
        message: invalidSecretKeyError.message,
        reason
      });
    }
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.ContactSupport,
      message: `Error loading Clerk JWKS from ${url.href} with code=${response.status}`,
      reason: TokenVerificationErrorReason.RemoteJWKFailedToLoad
    });
  }
  return response.json();
}
__name(fetchJWKSFromBAPI, "fetchJWKSFromBAPI");
__name2(fetchJWKSFromBAPI, "fetchJWKSFromBAPI");
function cacheHasExpired() {
  if (lastUpdatedAt === -1) {
    return false;
  }
  const isExpired = Date.now() - lastUpdatedAt >= MAX_CACHE_LAST_UPDATED_AT_SECONDS * 1e3;
  if (isExpired) {
    cache = {};
  }
  return isExpired;
}
__name(cacheHasExpired, "cacheHasExpired");
__name2(cacheHasExpired, "cacheHasExpired");
var getErrorObjectByCode = /* @__PURE__ */ __name2((errors, code) => {
  if (!errors) {
    return null;
  }
  return errors.find((err) => err.code === code);
}, "getErrorObjectByCode");
var M2M_TOKEN_PREFIX = "mt_";
var M2M_SUBJECT_PREFIX = "mch_";
var OAUTH_TOKEN_PREFIX = "oat_";
var API_KEY_PREFIX = "ak_";
var MACHINE_TOKEN_PREFIXES = [M2M_TOKEN_PREFIX, OAUTH_TOKEN_PREFIX, API_KEY_PREFIX];
var JwtFormatRegExp = /^[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+$/;
function isJwtFormat(token) {
  return JwtFormatRegExp.test(token);
}
__name(isJwtFormat, "isJwtFormat");
__name2(isJwtFormat, "isJwtFormat");
var OAUTH_ACCESS_TOKEN_TYPES = ["at+jwt", "application/at+jwt"];
function isOAuthJwt(token) {
  if (!isJwtFormat(token)) {
    return false;
  }
  try {
    const { data, errors } = decodeJwt(token);
    return !errors && !!data && OAUTH_ACCESS_TOKEN_TYPES.includes(data.header.typ);
  } catch {
    return false;
  }
}
__name(isOAuthJwt, "isOAuthJwt");
__name2(isOAuthJwt, "isOAuthJwt");
function isM2MJwt(token) {
  if (!isJwtFormat(token)) {
    return false;
  }
  try {
    const { data, errors } = decodeJwt(token);
    return !errors && !!data && typeof data.payload.sub === "string" && data.payload.sub.startsWith(M2M_SUBJECT_PREFIX);
  } catch {
    return false;
  }
}
__name(isM2MJwt, "isM2MJwt");
__name2(isM2MJwt, "isM2MJwt");
function isMachineJwt(token) {
  return isOAuthJwt(token) || isM2MJwt(token);
}
__name(isMachineJwt, "isMachineJwt");
__name2(isMachineJwt, "isMachineJwt");
function isMachineTokenByPrefix(token) {
  return MACHINE_TOKEN_PREFIXES.some((prefix) => token.startsWith(prefix));
}
__name(isMachineTokenByPrefix, "isMachineTokenByPrefix");
__name2(isMachineTokenByPrefix, "isMachineTokenByPrefix");
function isMachineToken(token) {
  return isMachineTokenByPrefix(token) || isOAuthJwt(token) || isM2MJwt(token);
}
__name(isMachineToken, "isMachineToken");
__name2(isMachineToken, "isMachineToken");
function getMachineTokenType(token) {
  if (token.startsWith(M2M_TOKEN_PREFIX) || isM2MJwt(token)) {
    return TokenType.M2MToken;
  }
  if (token.startsWith(OAUTH_TOKEN_PREFIX) || isOAuthJwt(token)) {
    return TokenType.OAuthToken;
  }
  if (token.startsWith(API_KEY_PREFIX)) {
    return TokenType.ApiKey;
  }
  throw new Error("Unknown machine token type");
}
__name(getMachineTokenType, "getMachineTokenType");
__name2(getMachineTokenType, "getMachineTokenType");
var isTokenTypeAccepted = /* @__PURE__ */ __name2((tokenType, acceptsToken) => {
  if (!tokenType) {
    return false;
  }
  if (acceptsToken === "any") {
    return true;
  }
  const tokenTypes = Array.isArray(acceptsToken) ? acceptsToken : [acceptsToken];
  return tokenTypes.includes(tokenType);
}, "isTokenTypeAccepted");
var MACHINE_TOKEN_TYPES = /* @__PURE__ */ new Set([TokenType.ApiKey, TokenType.M2MToken, TokenType.OAuthToken]);
function isMachineTokenType(type) {
  return MACHINE_TOKEN_TYPES.has(type);
}
__name(isMachineTokenType, "isMachineTokenType");
__name2(isMachineTokenType, "isMachineTokenType");
async function resolveKeyAndVerifyJwt(token, kid, options, headerType) {
  try {
    let key;
    if (options.jwtKey) {
      key = loadClerkJwkFromPem({ kid, pem: options.jwtKey });
    } else if (options.secretKey) {
      key = await loadClerkJWKFromRemote({ ...options, kid });
    } else {
      return {
        error: new MachineTokenVerificationError({
          action: TokenVerificationErrorAction.SetClerkJWTKey,
          message: "Failed to resolve JWK during verification.",
          code: MachineTokenVerificationErrorCode.TokenVerificationFailed
        })
      };
    }
    const { data: payload, errors: verifyErrors } = await verifyJwt(token, {
      ...options,
      key,
      ...headerType ? { headerType } : {}
    });
    if (verifyErrors) {
      return {
        error: new MachineTokenVerificationError({
          code: MachineTokenVerificationErrorCode.TokenVerificationFailed,
          message: verifyErrors[0].message
        })
      };
    }
    return { payload };
  } catch (error) {
    return {
      error: new MachineTokenVerificationError({
        code: MachineTokenVerificationErrorCode.TokenVerificationFailed,
        message: error.message
      })
    };
  }
}
__name(resolveKeyAndVerifyJwt, "resolveKeyAndVerifyJwt");
__name2(resolveKeyAndVerifyJwt, "resolveKeyAndVerifyJwt");
async function verifyM2MJwt(token, decoded, options) {
  const result = await resolveKeyAndVerifyJwt(token, decoded.header.kid, options);
  if ("error" in result) {
    return { data: void 0, tokenType: TokenType.M2MToken, errors: [result.error] };
  }
  return {
    data: M2MToken.fromJwtPayload(result.payload, options.clockSkewInMs),
    tokenType: TokenType.M2MToken,
    errors: void 0
  };
}
__name(verifyM2MJwt, "verifyM2MJwt");
__name2(verifyM2MJwt, "verifyM2MJwt");
async function verifyOAuthJwt(token, decoded, options) {
  const result = await resolveKeyAndVerifyJwt(token, decoded.header.kid, options, OAUTH_ACCESS_TOKEN_TYPES);
  if ("error" in result) {
    return { data: void 0, tokenType: TokenType.OAuthToken, errors: [result.error] };
  }
  return {
    data: IdPOAuthAccessToken.fromJwtPayload(result.payload, options.clockSkewInMs),
    tokenType: TokenType.OAuthToken,
    errors: void 0
  };
}
__name(verifyOAuthJwt, "verifyOAuthJwt");
__name2(verifyOAuthJwt, "verifyOAuthJwt");
var basePath15 = "/m2m_tokens";
var _verifyOptions;
var _M2MTokenApi_instances;
var createRequestOptions_fn;
var verifyJwtFormat_fn;
var M2MTokenApi = class extends AbstractAPI {
  static {
    __name(this, "M2MTokenApi");
  }
  static {
    __name2(this, "M2MTokenApi");
  }
  /**
   * @param verifyOptions - JWT verification options (secretKey, apiUrl, etc.).
   * Passed explicitly because BuildRequestOptions are captured inside the buildRequest closure
   * and are not accessible from the RequestFunction itself.
   */
  constructor(request, verifyOptions = {}) {
    super(request);
    __privateAdd(this, _M2MTokenApi_instances);
    __privateAdd(this, _verifyOptions);
    __privateSet(this, _verifyOptions, verifyOptions);
  }
  async list(queryParams) {
    return this.request({
      method: "GET",
      path: basePath15,
      queryParams
    });
  }
  async createToken(params) {
    const { claims = null, machineSecretKey, secondsUntilExpiration = null, tokenFormat = "opaque" } = params || {};
    const requestOptions = __privateMethod(this, _M2MTokenApi_instances, createRequestOptions_fn).call(this, {
      method: "POST",
      path: basePath15,
      bodyParams: {
        secondsUntilExpiration,
        claims,
        tokenFormat
      }
    }, machineSecretKey);
    return this.request(requestOptions);
  }
  async revokeToken(params) {
    const { m2mTokenId, revocationReason = null, machineSecretKey } = params;
    this.requireId(m2mTokenId);
    const requestOptions = __privateMethod(this, _M2MTokenApi_instances, createRequestOptions_fn).call(this, {
      method: "POST",
      path: joinPaths(basePath15, m2mTokenId, "revoke"),
      bodyParams: {
        revocationReason
      }
    }, machineSecretKey);
    return this.request(requestOptions);
  }
  async verify(params) {
    const { token, machineSecretKey } = params;
    if (isM2MJwt(token)) {
      return __privateMethod(this, _M2MTokenApi_instances, verifyJwtFormat_fn).call(this, token);
    }
    const requestOptions = __privateMethod(this, _M2MTokenApi_instances, createRequestOptions_fn).call(this, {
      method: "POST",
      path: joinPaths(basePath15, "verify"),
      bodyParams: { token }
    }, machineSecretKey);
    return this.request(requestOptions);
  }
  /**
   * @deprecated Use `verify()` instead. This method will be removed in the next major release.
   */
  async verifyToken(params) {
    deprecated("m2m.verifyToken()", "Use `m2m.verify()` instead.");
    return this.verify(params);
  }
};
_verifyOptions = /* @__PURE__ */ new WeakMap();
_M2MTokenApi_instances = /* @__PURE__ */ new WeakSet();
createRequestOptions_fn = /* @__PURE__ */ __name2(function(options, machineSecretKey) {
  if (machineSecretKey) {
    return {
      ...options,
      headerParams: {
        ...options.headerParams,
        Authorization: `Bearer ${machineSecretKey}`
      }
    };
  }
  return options;
}, "createRequestOptions_fn");
verifyJwtFormat_fn = /* @__PURE__ */ __name2(async function(token) {
  let decoded;
  try {
    const { data, errors } = decodeJwt(token);
    if (errors) {
      throw errors[0];
    }
    decoded = data;
  } catch (e) {
    throw new MachineTokenVerificationError({
      code: MachineTokenVerificationErrorCode.TokenInvalid,
      message: e.message
    });
  }
  const result = await verifyM2MJwt(token, decoded, __privateGet(this, _verifyOptions));
  if (result.errors) {
    throw result.errors[0];
  }
  return result.data;
}, "verifyJwtFormat_fn");
var basePath16 = "/jwks";
var JwksAPI = class extends AbstractAPI {
  static {
    __name(this, "JwksAPI");
  }
  static {
    __name2(this, "JwksAPI");
  }
  async getJwks() {
    return this.request({
      method: "GET",
      path: basePath16
    });
  }
};
var basePath17 = "/jwt_templates";
var JwtTemplatesApi = class extends AbstractAPI {
  static {
    __name(this, "JwtTemplatesApi");
  }
  static {
    __name2(this, "JwtTemplatesApi");
  }
  async list(params = {}) {
    return this.request({
      method: "GET",
      path: basePath17,
      queryParams: { ...params, paginated: true }
    });
  }
  async get(templateId) {
    this.requireId(templateId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath17, templateId)
    });
  }
  async create(params) {
    return this.request({
      method: "POST",
      path: basePath17,
      bodyParams: params
    });
  }
  async update(params) {
    const { templateId, ...bodyParams } = params;
    this.requireId(templateId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath17, templateId),
      bodyParams
    });
  }
  async delete(templateId) {
    this.requireId(templateId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath17, templateId)
    });
  }
};
var basePath18 = "/organizations";
var OrganizationAPI = class extends AbstractAPI {
  static {
    __name(this, "OrganizationAPI");
  }
  static {
    __name2(this, "OrganizationAPI");
  }
  async getOrganizationList(params) {
    return this.request({
      method: "GET",
      path: basePath18,
      queryParams: params
    });
  }
  async createOrganization(params) {
    return this.request({
      method: "POST",
      path: basePath18,
      bodyParams: params
    });
  }
  async getOrganization(params) {
    const { includeMembersCount } = params;
    const organizationIdOrSlug = "organizationId" in params ? params.organizationId : params.slug;
    this.requireId(organizationIdOrSlug);
    return this.request({
      method: "GET",
      path: joinPaths(basePath18, organizationIdOrSlug),
      queryParams: {
        includeMembersCount
      }
    });
  }
  async updateOrganization(organizationId, params) {
    this.requireId(organizationId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath18, organizationId),
      bodyParams: params
    });
  }
  async updateOrganizationLogo(organizationId, params) {
    this.requireId(organizationId);
    const formData = new runtime.FormData();
    formData.append("file", params?.file);
    if (params?.uploaderUserId) {
      formData.append("uploader_user_id", params?.uploaderUserId);
    }
    return this.request({
      method: "PUT",
      path: joinPaths(basePath18, organizationId, "logo"),
      formData
    });
  }
  async deleteOrganizationLogo(organizationId) {
    this.requireId(organizationId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath18, organizationId, "logo")
    });
  }
  async updateOrganizationMetadata(organizationId, params) {
    this.requireId(organizationId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath18, organizationId, "metadata"),
      bodyParams: params
    });
  }
  async deleteOrganization(organizationId) {
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath18, organizationId)
    });
  }
  async getOrganizationMembershipList(params) {
    const { organizationId, ...queryParams } = params;
    this.requireId(organizationId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath18, organizationId, "memberships"),
      queryParams
    });
  }
  async getInstanceOrganizationMembershipList(params) {
    return this.request({
      method: "GET",
      path: "/organization_memberships",
      queryParams: params
    });
  }
  async createOrganizationMembership(params) {
    const { organizationId, ...bodyParams } = params;
    this.requireId(organizationId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath18, organizationId, "memberships"),
      bodyParams
    });
  }
  async updateOrganizationMembership(params) {
    const { organizationId, userId, ...bodyParams } = params;
    this.requireId(organizationId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath18, organizationId, "memberships", userId),
      bodyParams
    });
  }
  async updateOrganizationMembershipMetadata(params) {
    const { organizationId, userId, ...bodyParams } = params;
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath18, organizationId, "memberships", userId, "metadata"),
      bodyParams
    });
  }
  async deleteOrganizationMembership(params) {
    const { organizationId, userId } = params;
    this.requireId(organizationId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath18, organizationId, "memberships", userId)
    });
  }
  async getOrganizationInvitationList(params) {
    const { organizationId, ...queryParams } = params;
    this.requireId(organizationId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath18, organizationId, "invitations"),
      queryParams
    });
  }
  async createOrganizationInvitation(params) {
    const { organizationId, ...bodyParams } = params;
    this.requireId(organizationId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath18, organizationId, "invitations"),
      bodyParams
    });
  }
  async createOrganizationInvitationBulk(organizationId, params) {
    this.requireId(organizationId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath18, organizationId, "invitations", "bulk"),
      bodyParams: params
    });
  }
  async getOrganizationInvitation(params) {
    const { organizationId, invitationId } = params;
    this.requireId(organizationId);
    this.requireId(invitationId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath18, organizationId, "invitations", invitationId)
    });
  }
  async revokeOrganizationInvitation(params) {
    const { organizationId, invitationId, ...bodyParams } = params;
    this.requireId(organizationId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath18, organizationId, "invitations", invitationId, "revoke"),
      bodyParams
    });
  }
  async getOrganizationDomainList(params) {
    const { organizationId, ...queryParams } = params;
    this.requireId(organizationId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath18, organizationId, "domains"),
      queryParams
    });
  }
  async createOrganizationDomain(params) {
    const { organizationId, ...bodyParams } = params;
    this.requireId(organizationId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath18, organizationId, "domains"),
      bodyParams: {
        ...bodyParams,
        verified: bodyParams.verified ?? true
      }
    });
  }
  async updateOrganizationDomain(params) {
    const { organizationId, domainId, ...bodyParams } = params;
    this.requireId(organizationId);
    this.requireId(domainId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath18, organizationId, "domains", domainId),
      bodyParams
    });
  }
  async deleteOrganizationDomain(params) {
    const { organizationId, domainId } = params;
    this.requireId(organizationId);
    this.requireId(domainId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath18, organizationId, "domains", domainId)
    });
  }
};
var basePath19 = "/oauth_applications";
var OAuthApplicationsApi = class extends AbstractAPI {
  static {
    __name(this, "OAuthApplicationsApi");
  }
  static {
    __name2(this, "OAuthApplicationsApi");
  }
  async list(params = {}) {
    return this.request({
      method: "GET",
      path: basePath19,
      queryParams: params
    });
  }
  async get(oauthApplicationId) {
    this.requireId(oauthApplicationId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath19, oauthApplicationId)
    });
  }
  async create(params) {
    return this.request({
      method: "POST",
      path: basePath19,
      bodyParams: params
    });
  }
  async update(params) {
    const { oauthApplicationId, ...bodyParams } = params;
    this.requireId(oauthApplicationId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath19, oauthApplicationId),
      bodyParams
    });
  }
  async delete(oauthApplicationId) {
    this.requireId(oauthApplicationId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath19, oauthApplicationId)
    });
  }
  async rotateSecret(oauthApplicationId) {
    this.requireId(oauthApplicationId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath19, oauthApplicationId, "rotate_secret")
    });
  }
};
var basePath20 = "/phone_numbers";
var PhoneNumberAPI = class extends AbstractAPI {
  static {
    __name(this, "PhoneNumberAPI");
  }
  static {
    __name2(this, "PhoneNumberAPI");
  }
  async getPhoneNumber(phoneNumberId) {
    this.requireId(phoneNumberId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath20, phoneNumberId)
    });
  }
  async createPhoneNumber(params) {
    return this.request({
      method: "POST",
      path: basePath20,
      bodyParams: params
    });
  }
  async updatePhoneNumber(phoneNumberId, params = {}) {
    this.requireId(phoneNumberId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath20, phoneNumberId),
      bodyParams: params
    });
  }
  async deletePhoneNumber(phoneNumberId) {
    this.requireId(phoneNumberId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath20, phoneNumberId)
    });
  }
};
var basePath21 = "/proxy_checks";
var ProxyCheckAPI = class extends AbstractAPI {
  static {
    __name(this, "ProxyCheckAPI");
  }
  static {
    __name2(this, "ProxyCheckAPI");
  }
  async verify(params) {
    return this.request({
      method: "POST",
      path: basePath21,
      bodyParams: params
    });
  }
};
var basePath22 = "/redirect_urls";
var RedirectUrlAPI = class extends AbstractAPI {
  static {
    __name(this, "RedirectUrlAPI");
  }
  static {
    __name2(this, "RedirectUrlAPI");
  }
  async getRedirectUrlList() {
    return this.request({
      method: "GET",
      path: basePath22,
      queryParams: { paginated: true }
    });
  }
  async getRedirectUrl(redirectUrlId) {
    this.requireId(redirectUrlId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath22, redirectUrlId)
    });
  }
  async createRedirectUrl(params) {
    return this.request({
      method: "POST",
      path: basePath22,
      bodyParams: params
    });
  }
  async deleteRedirectUrl(redirectUrlId) {
    this.requireId(redirectUrlId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath22, redirectUrlId)
    });
  }
};
var basePath23 = "/saml_connections";
var SamlConnectionAPI = class extends AbstractAPI {
  static {
    __name(this, "SamlConnectionAPI");
  }
  static {
    __name2(this, "SamlConnectionAPI");
  }
  async getSamlConnectionList(params = {}) {
    return this.request({
      method: "GET",
      path: basePath23,
      queryParams: params
    });
  }
  async createSamlConnection(params) {
    return this.request({
      method: "POST",
      path: basePath23,
      bodyParams: params,
      options: {
        deepSnakecaseBodyParamKeys: true
      }
    });
  }
  async getSamlConnection(samlConnectionId) {
    this.requireId(samlConnectionId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath23, samlConnectionId)
    });
  }
  async updateSamlConnection(samlConnectionId, params = {}) {
    this.requireId(samlConnectionId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath23, samlConnectionId),
      bodyParams: params,
      options: {
        deepSnakecaseBodyParamKeys: true
      }
    });
  }
  async deleteSamlConnection(samlConnectionId) {
    this.requireId(samlConnectionId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath23, samlConnectionId)
    });
  }
};
var basePath24 = "/sessions";
var SessionAPI = class extends AbstractAPI {
  static {
    __name(this, "SessionAPI");
  }
  static {
    __name2(this, "SessionAPI");
  }
  async getSessionList(params = {}) {
    return this.request({
      method: "GET",
      path: basePath24,
      queryParams: { ...params, paginated: true }
    });
  }
  async getSession(sessionId) {
    this.requireId(sessionId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath24, sessionId)
    });
  }
  async createSession(params) {
    return this.request({
      method: "POST",
      path: basePath24,
      bodyParams: params
    });
  }
  async revokeSession(sessionId) {
    this.requireId(sessionId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath24, sessionId, "revoke")
    });
  }
  async verifySession(sessionId, token) {
    this.requireId(sessionId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath24, sessionId, "verify"),
      bodyParams: { token }
    });
  }
  /**
   * Retrieves a session token or generates a JWT using a specified template.
   *
   * @param sessionId - The ID of the session for which to generate the token
   * @param template - Optional name of the JWT template configured in the Clerk Dashboard.
   * @param expiresInSeconds - Optional expiration time for the token in seconds.
   *   If not provided, uses the default expiration.
   *
   * @returns A promise that resolves to the generated token
   *
   * @throws {Error} When sessionId is invalid or empty
   */
  async getToken(sessionId, template, expiresInSeconds) {
    this.requireId(sessionId);
    const path = template ? joinPaths(basePath24, sessionId, "tokens", template) : joinPaths(basePath24, sessionId, "tokens");
    const requestOptions = {
      method: "POST",
      path
    };
    if (expiresInSeconds !== void 0) {
      requestOptions.bodyParams = { expires_in_seconds: expiresInSeconds };
    }
    return this.request(requestOptions);
  }
  async refreshSession(sessionId, params) {
    this.requireId(sessionId);
    const { suffixed_cookies, ...restParams } = params;
    return this.request({
      method: "POST",
      path: joinPaths(basePath24, sessionId, "refresh"),
      bodyParams: restParams,
      queryParams: { suffixed_cookies }
    });
  }
};
var basePath25 = "/sign_in_tokens";
var SignInTokenAPI = class extends AbstractAPI {
  static {
    __name(this, "SignInTokenAPI");
  }
  static {
    __name2(this, "SignInTokenAPI");
  }
  async createSignInToken(params) {
    return this.request({
      method: "POST",
      path: basePath25,
      bodyParams: params
    });
  }
  async revokeSignInToken(signInTokenId) {
    this.requireId(signInTokenId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath25, signInTokenId, "revoke")
    });
  }
};
var basePath26 = "/sign_ups";
var SignUpAPI = class extends AbstractAPI {
  static {
    __name(this, "SignUpAPI");
  }
  static {
    __name2(this, "SignUpAPI");
  }
  async get(signUpAttemptId) {
    this.requireId(signUpAttemptId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath26, signUpAttemptId)
    });
  }
  async update(params) {
    const { signUpAttemptId, ...bodyParams } = params;
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath26, signUpAttemptId),
      bodyParams
    });
  }
};
var basePath27 = "/testing_tokens";
var TestingTokenAPI = class extends AbstractAPI {
  static {
    __name(this, "TestingTokenAPI");
  }
  static {
    __name2(this, "TestingTokenAPI");
  }
  async createTestingToken() {
    return this.request({
      method: "POST",
      path: basePath27
    });
  }
};
var basePath28 = "/users";
var UserAPI = class extends AbstractAPI {
  static {
    __name(this, "UserAPI");
  }
  static {
    __name2(this, "UserAPI");
  }
  async getUserList(params = {}) {
    const { limit, offset, orderBy, ...userCountParams } = params;
    const [data, totalCount] = await Promise.all([
      this.request({
        method: "GET",
        path: basePath28,
        queryParams: params
      }),
      this.getCount(userCountParams)
    ]);
    return { data, totalCount };
  }
  async getUser(userId) {
    this.requireId(userId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath28, userId)
    });
  }
  async createUser(params) {
    return this.request({
      method: "POST",
      path: basePath28,
      bodyParams: params
    });
  }
  async updateUser(userId, params = {}) {
    this.requireId(userId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath28, userId),
      bodyParams: params
    });
  }
  async updateUserProfileImage(userId, params) {
    this.requireId(userId);
    const formData = new runtime.FormData();
    formData.append("file", params?.file);
    return this.request({
      method: "POST",
      path: joinPaths(basePath28, userId, "profile_image"),
      formData
    });
  }
  async updateUserMetadata(userId, params) {
    this.requireId(userId);
    return this.request({
      method: "PATCH",
      path: joinPaths(basePath28, userId, "metadata"),
      bodyParams: params
    });
  }
  async deleteUser(userId) {
    this.requireId(userId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath28, userId)
    });
  }
  async getCount(params = {}) {
    return this.request({
      method: "GET",
      path: joinPaths(basePath28, "count"),
      queryParams: params
    });
  }
  async getUserOauthAccessToken(userId, provider) {
    this.requireId(userId);
    const hasPrefix = provider.startsWith("oauth_");
    const _provider = hasPrefix ? provider : `oauth_${provider}`;
    if (hasPrefix) {
      deprecated(
        "getUserOauthAccessToken(userId, provider)",
        "Remove the `oauth_` prefix from the `provider` argument."
      );
    }
    return this.request({
      method: "GET",
      path: joinPaths(basePath28, userId, "oauth_access_tokens", _provider),
      queryParams: { paginated: true }
    });
  }
  async disableUserMFA(userId) {
    this.requireId(userId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath28, userId, "mfa")
    });
  }
  async getOrganizationMembershipList(params) {
    const { userId, limit, offset } = params;
    this.requireId(userId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath28, userId, "organization_memberships"),
      queryParams: { limit, offset }
    });
  }
  async getOrganizationInvitationList(params) {
    const { userId, ...queryParams } = params;
    this.requireId(userId);
    return this.request({
      method: "GET",
      path: joinPaths(basePath28, userId, "organization_invitations"),
      queryParams
    });
  }
  async verifyPassword(params) {
    const { userId, password } = params;
    this.requireId(userId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath28, userId, "verify_password"),
      bodyParams: { password }
    });
  }
  async verifyTOTP(params) {
    const { userId, code } = params;
    this.requireId(userId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath28, userId, "verify_totp"),
      bodyParams: { code }
    });
  }
  async banUser(userId) {
    this.requireId(userId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath28, userId, "ban")
    });
  }
  async unbanUser(userId) {
    this.requireId(userId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath28, userId, "unban")
    });
  }
  async lockUser(userId) {
    this.requireId(userId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath28, userId, "lock")
    });
  }
  async unlockUser(userId) {
    this.requireId(userId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath28, userId, "unlock")
    });
  }
  async deleteUserProfileImage(userId) {
    this.requireId(userId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath28, userId, "profile_image")
    });
  }
  async deleteUserPasskey(params) {
    this.requireId(params.userId);
    this.requireId(params.passkeyIdentificationId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath28, params.userId, "passkeys", params.passkeyIdentificationId)
    });
  }
  async deleteUserWeb3Wallet(params) {
    this.requireId(params.userId);
    this.requireId(params.web3WalletIdentificationId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath28, params.userId, "web3_wallets", params.web3WalletIdentificationId)
    });
  }
  async deleteUserExternalAccount(params) {
    this.requireId(params.userId);
    this.requireId(params.externalAccountId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath28, params.userId, "external_accounts", params.externalAccountId)
    });
  }
  async deleteUserBackupCodes(userId) {
    this.requireId(userId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath28, userId, "backup_code")
    });
  }
  async deleteUserTOTP(userId) {
    this.requireId(userId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath28, userId, "totp")
    });
  }
  async setPasswordCompromised(userId, params = {
    revokeAllSessions: false
  }) {
    this.requireId(userId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath28, userId, "password", "set_compromised"),
      bodyParams: params
    });
  }
  async unsetPasswordCompromised(userId) {
    this.requireId(userId);
    return this.request({
      method: "POST",
      path: joinPaths(basePath28, userId, "password", "unset_compromised")
    });
  }
};
var basePath29 = "/waitlist_entries";
var WaitlistEntryAPI = class extends AbstractAPI {
  static {
    __name(this, "WaitlistEntryAPI");
  }
  static {
    __name2(this, "WaitlistEntryAPI");
  }
  /**
   * List waitlist entries.
   * @param params Optional parameters (e.g., `query`, `status`, `orderBy`).
   */
  async list(params = {}) {
    return this.request({
      method: "GET",
      path: basePath29,
      queryParams: params
    });
  }
  /**
   * Create a waitlist entry.
   * @param params The parameters for creating a waitlist entry.
   */
  async create(params) {
    return this.request({
      method: "POST",
      path: basePath29,
      bodyParams: params
    });
  }
  /**
   * Bulk create waitlist entries.
   * @param params An array of parameters for creating waitlist entries.
   */
  async createBulk(params) {
    return this.request({
      method: "POST",
      path: joinPaths(basePath29, "bulk"),
      bodyParams: params
    });
  }
  /**
   * Invite a waitlist entry.
   * @param id The waitlist entry ID.
   * @param params Optional parameters (e.g., `ignoreExisting`).
   */
  async invite(id, params = {}) {
    this.requireId(id);
    return this.request({
      method: "POST",
      path: joinPaths(basePath29, id, "invite"),
      bodyParams: params
    });
  }
  /**
   * Reject a waitlist entry.
   * @param id The waitlist entry ID.
   */
  async reject(id) {
    this.requireId(id);
    return this.request({
      method: "POST",
      path: joinPaths(basePath29, id, "reject")
    });
  }
  /**
   * Delete a waitlist entry.
   * @param id The waitlist entry ID.
   */
  async delete(id) {
    this.requireId(id);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath29, id)
    });
  }
};
var basePath30 = "/webhooks";
var WebhookAPI = class extends AbstractAPI {
  static {
    __name(this, "WebhookAPI");
  }
  static {
    __name2(this, "WebhookAPI");
  }
  async createSvixApp() {
    return this.request({
      method: "POST",
      path: joinPaths(basePath30, "svix")
    });
  }
  async generateSvixAuthURL() {
    return this.request({
      method: "POST",
      path: joinPaths(basePath30, "svix_url")
    });
  }
  async deleteSvixApp() {
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath30, "svix")
    });
  }
};
var basePath31 = "/billing";
var organizationBasePath = "/organizations";
var userBasePath = "/users";
var BillingAPI = class extends AbstractAPI {
  static {
    __name(this, "BillingAPI");
  }
  static {
    __name2(this, "BillingAPI");
  }
  /**
   * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
   */
  async getPlanList(params) {
    return this.request({
      method: "GET",
      path: joinPaths(basePath31, "plans"),
      queryParams: params
    });
  }
  /**
   * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
   */
  async cancelSubscriptionItem(subscriptionItemId, params) {
    this.requireId(subscriptionItemId);
    return this.request({
      method: "DELETE",
      path: joinPaths(basePath31, "subscription_items", subscriptionItemId),
      queryParams: params
    });
  }
  /**
   * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
   */
  async extendSubscriptionItemFreeTrial(subscriptionItemId, params) {
    this.requireId(subscriptionItemId);
    return this.request({
      method: "POST",
      path: joinPaths("/billing", "subscription_items", subscriptionItemId, "extend_free_trial"),
      bodyParams: params
    });
  }
  /**
   * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
   */
  async getOrganizationBillingSubscription(organizationId) {
    this.requireId(organizationId);
    return this.request({
      method: "GET",
      path: joinPaths(organizationBasePath, organizationId, "billing", "subscription")
    });
  }
  /**
   * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
   */
  async getUserBillingSubscription(userId) {
    this.requireId(userId);
    return this.request({
      method: "GET",
      path: joinPaths(userBasePath, userId, "billing", "subscription")
    });
  }
};
var isObject = /* @__PURE__ */ __name2((value) => typeof value === "object" && value !== null, "isObject");
var isObjectCustom = /* @__PURE__ */ __name2((value) => isObject(value) && !(value instanceof RegExp) && !(value instanceof Error) && !(value instanceof Date) && !(globalThis.Blob && value instanceof globalThis.Blob), "isObjectCustom");
var mapObjectSkip = /* @__PURE__ */ Symbol("mapObjectSkip");
var _mapObject = /* @__PURE__ */ __name2((object, mapper, options, isSeen = /* @__PURE__ */ new WeakMap()) => {
  options = {
    deep: false,
    target: {},
    ...options
  };
  if (isSeen.has(object)) {
    return isSeen.get(object);
  }
  isSeen.set(object, options.target);
  const { target } = options;
  delete options.target;
  const mapArray = /* @__PURE__ */ __name2((array) => array.map((element) => isObjectCustom(element) ? _mapObject(element, mapper, options, isSeen) : element), "mapArray");
  if (Array.isArray(object)) {
    return mapArray(object);
  }
  for (const [key, value] of Object.entries(object)) {
    const mapResult = mapper(key, value, object);
    if (mapResult === mapObjectSkip) {
      continue;
    }
    let [newKey, newValue, { shouldRecurse = true } = {}] = mapResult;
    if (newKey === "__proto__") {
      continue;
    }
    if (options.deep && shouldRecurse && isObjectCustom(newValue)) {
      newValue = Array.isArray(newValue) ? mapArray(newValue) : _mapObject(newValue, mapper, options, isSeen);
    }
    target[newKey] = newValue;
  }
  return target;
}, "_mapObject");
function mapObject(object, mapper, options) {
  if (!isObject(object)) {
    throw new TypeError(`Expected an object, got \`${object}\` (${typeof object})`);
  }
  if (Array.isArray(object)) {
    throw new TypeError("Expected an object, got an array");
  }
  return _mapObject(object, mapper, options);
}
__name(mapObject, "mapObject");
__name2(mapObject, "mapObject");
var SPLIT_LOWER_UPPER_RE = /([\p{Ll}\d])(\p{Lu})/gu;
var SPLIT_UPPER_UPPER_RE = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu;
var SPLIT_SEPARATE_NUMBER_RE = /(\d)\p{Ll}|(\p{L})\d/u;
var DEFAULT_STRIP_REGEXP = /[^\p{L}\d]+/giu;
var SPLIT_REPLACE_VALUE = "$1\0$2";
var DEFAULT_PREFIX_SUFFIX_CHARACTERS = "";
function split(value) {
  let result = value.trim();
  result = result.replace(SPLIT_LOWER_UPPER_RE, SPLIT_REPLACE_VALUE).replace(SPLIT_UPPER_UPPER_RE, SPLIT_REPLACE_VALUE);
  result = result.replace(DEFAULT_STRIP_REGEXP, "\0");
  let start = 0;
  let end = result.length;
  while (result.charAt(start) === "\0")
    start++;
  if (start === end)
    return [];
  while (result.charAt(end - 1) === "\0")
    end--;
  return result.slice(start, end).split(/\0/g);
}
__name(split, "split");
__name2(split, "split");
function splitSeparateNumbers(value) {
  const words = split(value);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const match22 = SPLIT_SEPARATE_NUMBER_RE.exec(word);
    if (match22) {
      const offset = match22.index + (match22[1] ?? match22[2]).length;
      words.splice(i, 1, word.slice(0, offset), word.slice(offset));
    }
  }
  return words;
}
__name(splitSeparateNumbers, "splitSeparateNumbers");
__name2(splitSeparateNumbers, "splitSeparateNumbers");
function noCase(input, options) {
  const [prefix, words, suffix] = splitPrefixSuffix(input, options);
  return prefix + words.map(lowerFactory(options?.locale)).join(options?.delimiter ?? " ") + suffix;
}
__name(noCase, "noCase");
__name2(noCase, "noCase");
function snakeCase(input, options) {
  return noCase(input, { delimiter: "_", ...options });
}
__name(snakeCase, "snakeCase");
__name2(snakeCase, "snakeCase");
function lowerFactory(locale) {
  return locale === false ? (input) => input.toLowerCase() : (input) => input.toLocaleLowerCase(locale);
}
__name(lowerFactory, "lowerFactory");
__name2(lowerFactory, "lowerFactory");
function splitPrefixSuffix(input, options = {}) {
  const splitFn = options.split ?? (options.separateNumbers ? splitSeparateNumbers : split);
  const prefixCharacters = options.prefixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
  const suffixCharacters = options.suffixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
  let prefixIndex = 0;
  let suffixIndex = input.length;
  while (prefixIndex < input.length) {
    const char2 = input.charAt(prefixIndex);
    if (!prefixCharacters.includes(char2))
      break;
    prefixIndex++;
  }
  while (suffixIndex > prefixIndex) {
    const index = suffixIndex - 1;
    const char2 = input.charAt(index);
    if (!suffixCharacters.includes(char2))
      break;
    suffixIndex = index;
  }
  return [
    input.slice(0, prefixIndex),
    splitFn(input.slice(prefixIndex, suffixIndex)),
    input.slice(suffixIndex)
  ];
}
__name(splitPrefixSuffix, "splitPrefixSuffix");
__name2(splitPrefixSuffix, "splitPrefixSuffix");
var PlainObjectConstructor = {}.constructor;
function snakecaseKeys(obj, options) {
  if (Array.isArray(obj)) {
    if (obj.some((item) => item.constructor !== PlainObjectConstructor)) {
      throw new Error("obj must be array of plain objects");
    }
    options = { deep: true, exclude: [], parsingOptions: {}, ...options };
    const convertCase2 = options.snakeCase || ((key) => snakeCase(key, options.parsingOptions));
    return obj.map((item) => {
      return mapObject(item, (key, val) => {
        return [
          matches(options.exclude, key) ? key : convertCase2(key),
          val,
          mapperOptions(key, val, options)
        ];
      }, options);
    });
  } else {
    if (obj.constructor !== PlainObjectConstructor) {
      throw new Error("obj must be an plain object");
    }
  }
  options = { deep: true, exclude: [], parsingOptions: {}, ...options };
  const convertCase = options.snakeCase || ((key) => snakeCase(key, options.parsingOptions));
  return mapObject(obj, (key, val) => {
    return [
      matches(options.exclude, key) ? key : convertCase(key),
      val,
      mapperOptions(key, val, options)
    ];
  }, options);
}
__name(snakecaseKeys, "snakecaseKeys");
__name2(snakecaseKeys, "snakecaseKeys");
function matches(patterns, value) {
  return patterns.some((pattern) => {
    return typeof pattern === "string" ? pattern === value : pattern.test(value);
  });
}
__name(matches, "matches");
__name2(matches, "matches");
function mapperOptions(key, val, options) {
  return options.shouldRecurse ? { shouldRecurse: options.shouldRecurse(key, val) } : void 0;
}
__name(mapperOptions, "mapperOptions");
__name2(mapperOptions, "mapperOptions");
var snakecase_keys_default = snakecaseKeys;
var AccountlessApplication = class _AccountlessApplication {
  static {
    __name(this, "_AccountlessApplication");
  }
  static {
    __name2(this, "_AccountlessApplication");
  }
  constructor(publishableKey, secretKey, claimUrl, apiKeysUrl) {
    this.publishableKey = publishableKey;
    this.secretKey = secretKey;
    this.claimUrl = claimUrl;
    this.apiKeysUrl = apiKeysUrl;
  }
  static fromJSON(data) {
    return new _AccountlessApplication(data.publishable_key, data.secret_key, data.claim_url, data.api_keys_url);
  }
};
var AgentTask = class _AgentTask {
  static {
    __name(this, "_AgentTask");
  }
  static {
    __name2(this, "_AgentTask");
  }
  constructor(agentId, taskId, url) {
    this.agentId = agentId;
    this.taskId = taskId;
    this.url = url;
  }
  /**
   * Creates a AgentTask instance from a JSON object.
   *
   * @param data - The JSON object containing agent task data
   * @returns A new AgentTask instance
   */
  static fromJSON(data) {
    return new _AgentTask(data.agent_id, data.task_id, data.url);
  }
};
var ActorToken = class _ActorToken {
  static {
    __name(this, "_ActorToken");
  }
  static {
    __name2(this, "_ActorToken");
  }
  constructor(id, status, userId, actor, token, url, createdAt, updatedAt) {
    this.id = id;
    this.status = status;
    this.userId = userId;
    this.actor = actor;
    this.token = token;
    this.url = url;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
  static fromJSON(data) {
    return new _ActorToken(
      data.id,
      data.status,
      data.user_id,
      data.actor,
      data.token,
      data.url,
      data.created_at,
      data.updated_at
    );
  }
};
var AllowlistIdentifier = class _AllowlistIdentifier {
  static {
    __name(this, "_AllowlistIdentifier");
  }
  static {
    __name2(this, "_AllowlistIdentifier");
  }
  constructor(id, identifier, identifierType, createdAt, updatedAt, instanceId, invitationId) {
    this.id = id;
    this.identifier = identifier;
    this.identifierType = identifierType;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.instanceId = instanceId;
    this.invitationId = invitationId;
  }
  static fromJSON(data) {
    return new _AllowlistIdentifier(
      data.id,
      data.identifier,
      data.identifier_type,
      data.created_at,
      data.updated_at,
      data.instance_id,
      data.invitation_id
    );
  }
};
var APIKey = class _APIKey {
  static {
    __name(this, "_APIKey");
  }
  static {
    __name2(this, "_APIKey");
  }
  constructor(id, type, name, subject, scopes, claims, revoked, revocationReason, expired, expiration, createdBy, description, lastUsedAt, createdAt, updatedAt, secret) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.subject = subject;
    this.scopes = scopes;
    this.claims = claims;
    this.revoked = revoked;
    this.revocationReason = revocationReason;
    this.expired = expired;
    this.expiration = expiration;
    this.createdBy = createdBy;
    this.description = description;
    this.lastUsedAt = lastUsedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.secret = secret;
  }
  static fromJSON(data) {
    return new _APIKey(
      data.id,
      data.type,
      data.name,
      data.subject,
      data.scopes,
      data.claims,
      data.revoked,
      data.revocation_reason,
      data.expired,
      data.expiration,
      data.created_by,
      data.description,
      data.last_used_at,
      data.created_at,
      data.updated_at,
      data.secret
    );
  }
};
var BlocklistIdentifier = class _BlocklistIdentifier {
  static {
    __name(this, "_BlocklistIdentifier");
  }
  static {
    __name2(this, "_BlocklistIdentifier");
  }
  constructor(id, identifier, identifierType, createdAt, updatedAt, instanceId) {
    this.id = id;
    this.identifier = identifier;
    this.identifierType = identifierType;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.instanceId = instanceId;
  }
  static fromJSON(data) {
    return new _BlocklistIdentifier(
      data.id,
      data.identifier,
      data.identifier_type,
      data.created_at,
      data.updated_at,
      data.instance_id
    );
  }
};
var SessionActivity = class _SessionActivity {
  static {
    __name(this, "_SessionActivity");
  }
  static {
    __name2(this, "_SessionActivity");
  }
  constructor(id, isMobile, ipAddress, city, country, browserVersion, browserName, deviceType) {
    this.id = id;
    this.isMobile = isMobile;
    this.ipAddress = ipAddress;
    this.city = city;
    this.country = country;
    this.browserVersion = browserVersion;
    this.browserName = browserName;
    this.deviceType = deviceType;
  }
  static fromJSON(data) {
    return new _SessionActivity(
      data.id,
      data.is_mobile,
      data.ip_address,
      data.city,
      data.country,
      data.browser_version,
      data.browser_name,
      data.device_type
    );
  }
};
var Session = class _Session {
  static {
    __name(this, "_Session");
  }
  static {
    __name2(this, "_Session");
  }
  constructor(id, clientId, userId, status, lastActiveAt, expireAt, abandonAt, createdAt, updatedAt, lastActiveOrganizationId, latestActivity, actor = null) {
    this.id = id;
    this.clientId = clientId;
    this.userId = userId;
    this.status = status;
    this.lastActiveAt = lastActiveAt;
    this.expireAt = expireAt;
    this.abandonAt = abandonAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.lastActiveOrganizationId = lastActiveOrganizationId;
    this.latestActivity = latestActivity;
    this.actor = actor;
  }
  static fromJSON(data) {
    return new _Session(
      data.id,
      data.client_id,
      data.user_id,
      data.status,
      data.last_active_at,
      data.expire_at,
      data.abandon_at,
      data.created_at,
      data.updated_at,
      data.last_active_organization_id,
      data.latest_activity && SessionActivity.fromJSON(data.latest_activity),
      data.actor
    );
  }
};
var Client = class _Client {
  static {
    __name(this, "_Client");
  }
  static {
    __name2(this, "_Client");
  }
  constructor(id, sessionIds, sessions, signInId, signUpId, lastActiveSessionId, lastAuthenticationStrategy, createdAt, updatedAt) {
    this.id = id;
    this.sessionIds = sessionIds;
    this.sessions = sessions;
    this.signInId = signInId;
    this.signUpId = signUpId;
    this.lastActiveSessionId = lastActiveSessionId;
    this.lastAuthenticationStrategy = lastAuthenticationStrategy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
  static fromJSON(data) {
    return new _Client(
      data.id,
      data.session_ids,
      data.sessions.map((x2) => Session.fromJSON(x2)),
      data.sign_in_id,
      data.sign_up_id,
      data.last_active_session_id,
      data.last_authentication_strategy,
      data.created_at,
      data.updated_at
    );
  }
};
var CnameTarget = class _CnameTarget {
  static {
    __name(this, "_CnameTarget");
  }
  static {
    __name2(this, "_CnameTarget");
  }
  constructor(host, value, required) {
    this.host = host;
    this.value = value;
    this.required = required;
  }
  static fromJSON(data) {
    return new _CnameTarget(data.host, data.value, data.required);
  }
};
var Cookies2 = class _Cookies {
  static {
    __name(this, "_Cookies");
  }
  static {
    __name2(this, "_Cookies");
  }
  constructor(cookies) {
    this.cookies = cookies;
  }
  static fromJSON(data) {
    return new _Cookies(data.cookies);
  }
};
var DeletedObject = class _DeletedObject {
  static {
    __name(this, "_DeletedObject");
  }
  static {
    __name2(this, "_DeletedObject");
  }
  constructor(object, id, slug, deleted) {
    this.object = object;
    this.id = id;
    this.slug = slug;
    this.deleted = deleted;
  }
  static fromJSON(data) {
    return new _DeletedObject(data.object, data.id || null, data.slug || null, data.deleted);
  }
};
var Domain = class _Domain {
  static {
    __name(this, "_Domain");
  }
  static {
    __name2(this, "_Domain");
  }
  constructor(id, name, isSatellite, frontendApiUrl, developmentOrigin, cnameTargets, accountsPortalUrl, proxyUrl) {
    this.id = id;
    this.name = name;
    this.isSatellite = isSatellite;
    this.frontendApiUrl = frontendApiUrl;
    this.developmentOrigin = developmentOrigin;
    this.cnameTargets = cnameTargets;
    this.accountsPortalUrl = accountsPortalUrl;
    this.proxyUrl = proxyUrl;
  }
  static fromJSON(data) {
    return new _Domain(
      data.id,
      data.name,
      data.is_satellite,
      data.frontend_api_url,
      data.development_origin,
      data.cname_targets && data.cname_targets.map((x2) => CnameTarget.fromJSON(x2)),
      data.accounts_portal_url,
      data.proxy_url
    );
  }
};
var Email = class _Email {
  static {
    __name(this, "_Email");
  }
  static {
    __name2(this, "_Email");
  }
  constructor(id, fromEmailName, emailAddressId, toEmailAddress, subject, body, bodyPlain, status, slug, data, deliveredByClerk) {
    this.id = id;
    this.fromEmailName = fromEmailName;
    this.emailAddressId = emailAddressId;
    this.toEmailAddress = toEmailAddress;
    this.subject = subject;
    this.body = body;
    this.bodyPlain = bodyPlain;
    this.status = status;
    this.slug = slug;
    this.data = data;
    this.deliveredByClerk = deliveredByClerk;
  }
  static fromJSON(data) {
    return new _Email(
      data.id,
      data.from_email_name,
      data.email_address_id,
      data.to_email_address,
      data.subject,
      data.body,
      data.body_plain,
      data.status,
      data.slug,
      data.data,
      data.delivered_by_clerk
    );
  }
};
var IdentificationLink = class _IdentificationLink {
  static {
    __name(this, "_IdentificationLink");
  }
  static {
    __name2(this, "_IdentificationLink");
  }
  constructor(id, type) {
    this.id = id;
    this.type = type;
  }
  static fromJSON(data) {
    return new _IdentificationLink(data.id, data.type);
  }
};
var Verification = class _Verification {
  static {
    __name(this, "_Verification");
  }
  static {
    __name2(this, "_Verification");
  }
  constructor(status, strategy, externalVerificationRedirectURL = null, attempts = null, expireAt = null, nonce = null, message = null) {
    this.status = status;
    this.strategy = strategy;
    this.externalVerificationRedirectURL = externalVerificationRedirectURL;
    this.attempts = attempts;
    this.expireAt = expireAt;
    this.nonce = nonce;
    this.message = message;
  }
  static fromJSON(data) {
    return new _Verification(
      data.status,
      data.strategy,
      data.external_verification_redirect_url ? new URL(data.external_verification_redirect_url) : null,
      data.attempts,
      data.expire_at,
      data.nonce
    );
  }
};
var EmailAddress = class _EmailAddress {
  static {
    __name(this, "_EmailAddress");
  }
  static {
    __name2(this, "_EmailAddress");
  }
  constructor(id, emailAddress, verification, linkedTo) {
    this.id = id;
    this.emailAddress = emailAddress;
    this.verification = verification;
    this.linkedTo = linkedTo;
  }
  static fromJSON(data) {
    return new _EmailAddress(
      data.id,
      data.email_address,
      data.verification && Verification.fromJSON(data.verification),
      data.linked_to.map((link) => IdentificationLink.fromJSON(link))
    );
  }
};
var ExternalAccount = class _ExternalAccount {
  static {
    __name(this, "_ExternalAccount");
  }
  static {
    __name2(this, "_ExternalAccount");
  }
  constructor(id, provider, providerUserId, identificationId, externalId, approvedScopes, emailAddress, firstName, lastName, imageUrl, username, phoneNumber, publicMetadata = {}, label, verification) {
    this.id = id;
    this.provider = provider;
    this.providerUserId = providerUserId;
    this.identificationId = identificationId;
    this.externalId = externalId;
    this.approvedScopes = approvedScopes;
    this.emailAddress = emailAddress;
    this.firstName = firstName;
    this.lastName = lastName;
    this.imageUrl = imageUrl;
    this.username = username;
    this.phoneNumber = phoneNumber;
    this.publicMetadata = publicMetadata;
    this.label = label;
    this.verification = verification;
  }
  static fromJSON(data) {
    return new _ExternalAccount(
      data.id,
      data.provider,
      data.provider_user_id,
      data.identification_id,
      data.provider_user_id,
      data.approved_scopes,
      data.email_address,
      data.first_name,
      data.last_name,
      data.image_url || "",
      data.username,
      data.phone_number,
      data.public_metadata,
      data.label,
      data.verification && Verification.fromJSON(data.verification)
    );
  }
};
var Instance = class _Instance {
  static {
    __name(this, "_Instance");
  }
  static {
    __name2(this, "_Instance");
  }
  constructor(id, environmentType, allowedOrigins) {
    this.id = id;
    this.environmentType = environmentType;
    this.allowedOrigins = allowedOrigins;
  }
  static fromJSON(data) {
    return new _Instance(data.id, data.environment_type, data.allowed_origins);
  }
};
var InstanceRestrictions = class _InstanceRestrictions {
  static {
    __name(this, "_InstanceRestrictions");
  }
  static {
    __name2(this, "_InstanceRestrictions");
  }
  constructor(allowlist, blocklist, blockEmailSubaddresses, blockDisposableEmailDomains, ignoreDotsForGmailAddresses) {
    this.allowlist = allowlist;
    this.blocklist = blocklist;
    this.blockEmailSubaddresses = blockEmailSubaddresses;
    this.blockDisposableEmailDomains = blockDisposableEmailDomains;
    this.ignoreDotsForGmailAddresses = ignoreDotsForGmailAddresses;
  }
  static fromJSON(data) {
    return new _InstanceRestrictions(
      data.allowlist,
      data.blocklist,
      data.block_email_subaddresses,
      data.block_disposable_email_domains,
      data.ignore_dots_for_gmail_addresses
    );
  }
};
var InstanceSettings = class _InstanceSettings {
  static {
    __name(this, "_InstanceSettings");
  }
  static {
    __name2(this, "_InstanceSettings");
  }
  constructor(id, restrictedToAllowlist, fromEmailAddress, progressiveSignUp, enhancedEmailDeliverability) {
    this.id = id;
    this.restrictedToAllowlist = restrictedToAllowlist;
    this.fromEmailAddress = fromEmailAddress;
    this.progressiveSignUp = progressiveSignUp;
    this.enhancedEmailDeliverability = enhancedEmailDeliverability;
  }
  static fromJSON(data) {
    return new _InstanceSettings(
      data.id,
      data.restricted_to_allowlist,
      data.from_email_address,
      data.progressive_sign_up,
      data.enhanced_email_deliverability
    );
  }
};
var Invitation = class _Invitation {
  static {
    __name(this, "_Invitation");
  }
  static {
    __name2(this, "_Invitation");
  }
  constructor(id, emailAddress, publicMetadata, createdAt, updatedAt, status, url, revoked) {
    this.id = id;
    this.emailAddress = emailAddress;
    this.publicMetadata = publicMetadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.status = status;
    this.url = url;
    this.revoked = revoked;
    this._raw = null;
  }
  get raw() {
    return this._raw;
  }
  static fromJSON(data) {
    const res = new _Invitation(
      data.id,
      data.email_address,
      data.public_metadata,
      data.created_at,
      data.updated_at,
      data.status,
      data.url,
      data.revoked
    );
    res._raw = data;
    return res;
  }
};
var ObjectType = {
  AccountlessApplication: "accountless_application",
  ActorToken: "actor_token",
  AgentTask: "agent_task",
  AllowlistIdentifier: "allowlist_identifier",
  ApiKey: "api_key",
  BlocklistIdentifier: "blocklist_identifier",
  Client: "client",
  Cookies: "cookies",
  Domain: "domain",
  Email: "email",
  EmailAddress: "email_address",
  ExternalAccount: "external_account",
  FacebookAccount: "facebook_account",
  GoogleAccount: "google_account",
  Instance: "instance",
  InstanceRestrictions: "instance_restrictions",
  InstanceSettings: "instance_settings",
  Invitation: "invitation",
  Machine: "machine",
  MachineScope: "machine_scope",
  MachineSecretKey: "machine_secret_key",
  M2MToken: "machine_to_machine_token",
  JwtTemplate: "jwt_template",
  OauthAccessToken: "oauth_access_token",
  IdpOAuthAccessToken: "clerk_idp_oauth_access_token",
  OAuthApplication: "oauth_application",
  Organization: "organization",
  OrganizationDomain: "organization_domain",
  OrganizationInvitation: "organization_invitation",
  OrganizationMembership: "organization_membership",
  OrganizationSettings: "organization_settings",
  PhoneNumber: "phone_number",
  ProxyCheck: "proxy_check",
  RedirectUrl: "redirect_url",
  SamlAccount: "saml_account",
  SamlConnection: "saml_connection",
  Session: "session",
  SignInAttempt: "sign_in_attempt",
  SignInToken: "sign_in_token",
  SignUpAttempt: "sign_up_attempt",
  SmsMessage: "sms_message",
  User: "user",
  WaitlistEntry: "waitlist_entry",
  Web3Wallet: "web3_wallet",
  Token: "token",
  TotalCount: "total_count",
  TestingToken: "testing_token",
  Role: "role",
  Permission: "permission",
  BillingPayer: "commerce_payer",
  BillingPaymentAttempt: "commerce_payment_attempt",
  BillingSubscription: "commerce_subscription",
  BillingSubscriptionItem: "commerce_subscription_item",
  BillingPlan: "commerce_plan",
  Feature: "feature"
};
var Machine = class _Machine {
  static {
    __name(this, "_Machine");
  }
  static {
    __name2(this, "_Machine");
  }
  constructor(id, name, instanceId, createdAt, updatedAt, scopedMachines, defaultTokenTtl, secretKey) {
    this.id = id;
    this.name = name;
    this.instanceId = instanceId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.scopedMachines = scopedMachines;
    this.defaultTokenTtl = defaultTokenTtl;
    this.secretKey = secretKey;
  }
  static fromJSON(data) {
    return new _Machine(
      data.id,
      data.name,
      data.instance_id,
      data.created_at,
      data.updated_at,
      data.scoped_machines.map(
        (m2) => new _Machine(
          m2.id,
          m2.name,
          m2.instance_id,
          m2.created_at,
          m2.updated_at,
          [],
          // Nested machines don't have scoped_machines
          m2.default_token_ttl
        )
      ),
      data.default_token_ttl,
      data.secret_key
    );
  }
};
var MachineScope = class _MachineScope {
  static {
    __name(this, "_MachineScope");
  }
  static {
    __name2(this, "_MachineScope");
  }
  constructor(fromMachineId, toMachineId, createdAt, deleted) {
    this.fromMachineId = fromMachineId;
    this.toMachineId = toMachineId;
    this.createdAt = createdAt;
    this.deleted = deleted;
  }
  static fromJSON(data) {
    return new _MachineScope(data.from_machine_id, data.to_machine_id, data.created_at, data.deleted);
  }
};
var MachineSecretKey = class _MachineSecretKey {
  static {
    __name(this, "_MachineSecretKey");
  }
  static {
    __name2(this, "_MachineSecretKey");
  }
  constructor(secret) {
    this.secret = secret;
  }
  static fromJSON(data) {
    return new _MachineSecretKey(data.secret);
  }
};
var JwtTemplate = class _JwtTemplate {
  static {
    __name(this, "_JwtTemplate");
  }
  static {
    __name2(this, "_JwtTemplate");
  }
  constructor(id, name, claims, lifetime, allowedClockSkew, customSigningKey, signingAlgorithm, createdAt, updatedAt) {
    this.id = id;
    this.name = name;
    this.claims = claims;
    this.lifetime = lifetime;
    this.allowedClockSkew = allowedClockSkew;
    this.customSigningKey = customSigningKey;
    this.signingAlgorithm = signingAlgorithm;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
  static fromJSON(data) {
    return new _JwtTemplate(
      data.id,
      data.name,
      data.claims,
      data.lifetime,
      data.allowed_clock_skew,
      data.custom_signing_key,
      data.signing_algorithm,
      data.created_at,
      data.updated_at
    );
  }
};
var OauthAccessToken = class _OauthAccessToken {
  static {
    __name(this, "_OauthAccessToken");
  }
  static {
    __name2(this, "_OauthAccessToken");
  }
  constructor(externalAccountId, provider, token, publicMetadata = {}, label, scopes, tokenSecret, expiresAt, idToken) {
    this.externalAccountId = externalAccountId;
    this.provider = provider;
    this.token = token;
    this.publicMetadata = publicMetadata;
    this.label = label;
    this.scopes = scopes;
    this.tokenSecret = tokenSecret;
    this.expiresAt = expiresAt;
    this.idToken = idToken;
  }
  static fromJSON(data) {
    return new _OauthAccessToken(
      data.external_account_id,
      data.provider,
      data.token,
      data.public_metadata,
      data.label || "",
      data.scopes,
      data.token_secret,
      data.expires_at,
      data.id_token
    );
  }
};
var OAuthApplication = class _OAuthApplication {
  static {
    __name(this, "_OAuthApplication");
  }
  static {
    __name2(this, "_OAuthApplication");
  }
  constructor(id, instanceId, name, clientId, clientUri, clientImageUrl, dynamicallyRegistered, consentScreenEnabled, pkceRequired, isPublic, scopes, redirectUris, authorizeUrl, tokenFetchUrl, userInfoUrl, discoveryUrl, tokenIntrospectionUrl, createdAt, updatedAt, clientSecret) {
    this.id = id;
    this.instanceId = instanceId;
    this.name = name;
    this.clientId = clientId;
    this.clientUri = clientUri;
    this.clientImageUrl = clientImageUrl;
    this.dynamicallyRegistered = dynamicallyRegistered;
    this.consentScreenEnabled = consentScreenEnabled;
    this.pkceRequired = pkceRequired;
    this.isPublic = isPublic;
    this.scopes = scopes;
    this.redirectUris = redirectUris;
    this.authorizeUrl = authorizeUrl;
    this.tokenFetchUrl = tokenFetchUrl;
    this.userInfoUrl = userInfoUrl;
    this.discoveryUrl = discoveryUrl;
    this.tokenIntrospectionUrl = tokenIntrospectionUrl;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.clientSecret = clientSecret;
  }
  static fromJSON(data) {
    return new _OAuthApplication(
      data.id,
      data.instance_id,
      data.name,
      data.client_id,
      data.client_uri,
      data.client_image_url,
      data.dynamically_registered,
      data.consent_screen_enabled,
      data.pkce_required,
      data.public,
      data.scopes,
      data.redirect_uris,
      data.authorize_url,
      data.token_fetch_url,
      data.user_info_url,
      data.discovery_url,
      data.token_introspection_url,
      data.created_at,
      data.updated_at,
      data.client_secret
    );
  }
};
var Organization = class _Organization {
  static {
    __name(this, "_Organization");
  }
  static {
    __name2(this, "_Organization");
  }
  constructor(id, name, slug, imageUrl, hasImage, createdAt, updatedAt, publicMetadata = {}, privateMetadata = {}, maxAllowedMemberships, adminDeleteEnabled, membersCount, createdBy) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.imageUrl = imageUrl;
    this.hasImage = hasImage;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.publicMetadata = publicMetadata;
    this.privateMetadata = privateMetadata;
    this.maxAllowedMemberships = maxAllowedMemberships;
    this.adminDeleteEnabled = adminDeleteEnabled;
    this.membersCount = membersCount;
    this.createdBy = createdBy;
    this._raw = null;
  }
  get raw() {
    return this._raw;
  }
  static fromJSON(data) {
    const res = new _Organization(
      data.id,
      data.name,
      data.slug,
      data.image_url || "",
      data.has_image,
      data.created_at,
      data.updated_at,
      data.public_metadata,
      data.private_metadata,
      data.max_allowed_memberships,
      data.admin_delete_enabled,
      data.members_count,
      data.created_by
    );
    res._raw = data;
    return res;
  }
};
var OrganizationInvitation = class _OrganizationInvitation {
  static {
    __name(this, "_OrganizationInvitation");
  }
  static {
    __name2(this, "_OrganizationInvitation");
  }
  constructor(id, emailAddress, role, roleName, organizationId, createdAt, updatedAt, expiresAt, url, status, publicMetadata = {}, privateMetadata = {}, publicOrganizationData) {
    this.id = id;
    this.emailAddress = emailAddress;
    this.role = role;
    this.roleName = roleName;
    this.organizationId = organizationId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.expiresAt = expiresAt;
    this.url = url;
    this.status = status;
    this.publicMetadata = publicMetadata;
    this.privateMetadata = privateMetadata;
    this.publicOrganizationData = publicOrganizationData;
    this._raw = null;
  }
  get raw() {
    return this._raw;
  }
  static fromJSON(data) {
    const res = new _OrganizationInvitation(
      data.id,
      data.email_address,
      data.role,
      data.role_name,
      data.organization_id,
      data.created_at,
      data.updated_at,
      data.expires_at,
      data.url,
      data.status,
      data.public_metadata,
      data.private_metadata,
      data.public_organization_data
    );
    res._raw = data;
    return res;
  }
};
var OrganizationMembership = class _OrganizationMembership {
  static {
    __name(this, "_OrganizationMembership");
  }
  static {
    __name2(this, "_OrganizationMembership");
  }
  constructor(id, role, permissions, publicMetadata = {}, privateMetadata = {}, createdAt, updatedAt, organization, publicUserData) {
    this.id = id;
    this.role = role;
    this.permissions = permissions;
    this.publicMetadata = publicMetadata;
    this.privateMetadata = privateMetadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.organization = organization;
    this.publicUserData = publicUserData;
    this._raw = null;
  }
  get raw() {
    return this._raw;
  }
  static fromJSON(data) {
    const res = new _OrganizationMembership(
      data.id,
      data.role,
      data.permissions,
      data.public_metadata,
      data.private_metadata,
      data.created_at,
      data.updated_at,
      Organization.fromJSON(data.organization),
      OrganizationMembershipPublicUserData.fromJSON(data.public_user_data)
    );
    res._raw = data;
    return res;
  }
};
var OrganizationMembershipPublicUserData = class _OrganizationMembershipPublicUserData {
  static {
    __name(this, "_OrganizationMembershipPublicUserData");
  }
  static {
    __name2(this, "_OrganizationMembershipPublicUserData");
  }
  constructor(identifier, firstName, lastName, imageUrl, hasImage, userId) {
    this.identifier = identifier;
    this.firstName = firstName;
    this.lastName = lastName;
    this.imageUrl = imageUrl;
    this.hasImage = hasImage;
    this.userId = userId;
  }
  static fromJSON(data) {
    return new _OrganizationMembershipPublicUserData(
      data.identifier,
      data.first_name,
      data.last_name,
      data.image_url,
      data.has_image,
      data.user_id
    );
  }
};
var OrganizationSettings = class _OrganizationSettings {
  static {
    __name(this, "_OrganizationSettings");
  }
  static {
    __name2(this, "_OrganizationSettings");
  }
  constructor(enabled, maxAllowedMemberships, maxAllowedRoles, maxAllowedPermissions, creatorRole, adminDeleteEnabled, domainsEnabled, slugDisabled, domainsEnrollmentModes, domainsDefaultRole) {
    this.enabled = enabled;
    this.maxAllowedMemberships = maxAllowedMemberships;
    this.maxAllowedRoles = maxAllowedRoles;
    this.maxAllowedPermissions = maxAllowedPermissions;
    this.creatorRole = creatorRole;
    this.adminDeleteEnabled = adminDeleteEnabled;
    this.domainsEnabled = domainsEnabled;
    this.slugDisabled = slugDisabled;
    this.domainsEnrollmentModes = domainsEnrollmentModes;
    this.domainsDefaultRole = domainsDefaultRole;
  }
  static fromJSON(data) {
    return new _OrganizationSettings(
      data.enabled,
      data.max_allowed_memberships,
      data.max_allowed_roles,
      data.max_allowed_permissions,
      data.creator_role,
      data.admin_delete_enabled,
      data.domains_enabled,
      data.slug_disabled,
      data.domains_enrollment_modes,
      data.domains_default_role
    );
  }
};
var PhoneNumber = class _PhoneNumber {
  static {
    __name(this, "_PhoneNumber");
  }
  static {
    __name2(this, "_PhoneNumber");
  }
  constructor(id, phoneNumber, reservedForSecondFactor, defaultSecondFactor, verification, linkedTo) {
    this.id = id;
    this.phoneNumber = phoneNumber;
    this.reservedForSecondFactor = reservedForSecondFactor;
    this.defaultSecondFactor = defaultSecondFactor;
    this.verification = verification;
    this.linkedTo = linkedTo;
  }
  static fromJSON(data) {
    return new _PhoneNumber(
      data.id,
      data.phone_number,
      data.reserved_for_second_factor,
      data.default_second_factor,
      data.verification && Verification.fromJSON(data.verification),
      data.linked_to.map((link) => IdentificationLink.fromJSON(link))
    );
  }
};
var ProxyCheck = class _ProxyCheck {
  static {
    __name(this, "_ProxyCheck");
  }
  static {
    __name2(this, "_ProxyCheck");
  }
  constructor(id, domainId, lastRunAt, proxyUrl, successful, createdAt, updatedAt) {
    this.id = id;
    this.domainId = domainId;
    this.lastRunAt = lastRunAt;
    this.proxyUrl = proxyUrl;
    this.successful = successful;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
  static fromJSON(data) {
    return new _ProxyCheck(
      data.id,
      data.domain_id,
      data.last_run_at,
      data.proxy_url,
      data.successful,
      data.created_at,
      data.updated_at
    );
  }
};
var RedirectUrl = class _RedirectUrl {
  static {
    __name(this, "_RedirectUrl");
  }
  static {
    __name2(this, "_RedirectUrl");
  }
  constructor(id, url, createdAt, updatedAt) {
    this.id = id;
    this.url = url;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
  static fromJSON(data) {
    return new _RedirectUrl(data.id, data.url, data.created_at, data.updated_at);
  }
};
var SamlConnection = class _SamlConnection {
  static {
    __name(this, "_SamlConnection");
  }
  static {
    __name2(this, "_SamlConnection");
  }
  constructor(id, name, domain, organizationId, idpEntityId, idpSsoUrl, idpCertificate, idpMetadataUrl, idpMetadata, acsUrl, spEntityId, spMetadataUrl, active, provider, userCount, syncUserAttributes, allowSubdomains, allowIdpInitiated, createdAt, updatedAt, attributeMapping) {
    this.id = id;
    this.name = name;
    this.domain = domain;
    this.organizationId = organizationId;
    this.idpEntityId = idpEntityId;
    this.idpSsoUrl = idpSsoUrl;
    this.idpCertificate = idpCertificate;
    this.idpMetadataUrl = idpMetadataUrl;
    this.idpMetadata = idpMetadata;
    this.acsUrl = acsUrl;
    this.spEntityId = spEntityId;
    this.spMetadataUrl = spMetadataUrl;
    this.active = active;
    this.provider = provider;
    this.userCount = userCount;
    this.syncUserAttributes = syncUserAttributes;
    this.allowSubdomains = allowSubdomains;
    this.allowIdpInitiated = allowIdpInitiated;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.attributeMapping = attributeMapping;
  }
  static fromJSON(data) {
    return new _SamlConnection(
      data.id,
      data.name,
      data.domain,
      data.organization_id,
      data.idp_entity_id,
      data.idp_sso_url,
      data.idp_certificate,
      data.idp_metadata_url,
      data.idp_metadata,
      data.acs_url,
      data.sp_entity_id,
      data.sp_metadata_url,
      data.active,
      data.provider,
      data.user_count,
      data.sync_user_attributes,
      data.allow_subdomains,
      data.allow_idp_initiated,
      data.created_at,
      data.updated_at,
      data.attribute_mapping && AttributeMapping.fromJSON(data.attribute_mapping)
    );
  }
};
var SamlAccountConnection = class _SamlAccountConnection {
  static {
    __name(this, "_SamlAccountConnection");
  }
  static {
    __name2(this, "_SamlAccountConnection");
  }
  constructor(id, name, domain, active, provider, syncUserAttributes, allowSubdomains, allowIdpInitiated, createdAt, updatedAt) {
    this.id = id;
    this.name = name;
    this.domain = domain;
    this.active = active;
    this.provider = provider;
    this.syncUserAttributes = syncUserAttributes;
    this.allowSubdomains = allowSubdomains;
    this.allowIdpInitiated = allowIdpInitiated;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
  static fromJSON(data) {
    return new _SamlAccountConnection(
      data.id,
      data.name,
      data.domain,
      data.active,
      data.provider,
      data.sync_user_attributes,
      data.allow_subdomains,
      data.allow_idp_initiated,
      data.created_at,
      data.updated_at
    );
  }
};
var AttributeMapping = class _AttributeMapping {
  static {
    __name(this, "_AttributeMapping");
  }
  static {
    __name2(this, "_AttributeMapping");
  }
  constructor(userId, emailAddress, firstName, lastName) {
    this.userId = userId;
    this.emailAddress = emailAddress;
    this.firstName = firstName;
    this.lastName = lastName;
  }
  static fromJSON(data) {
    return new _AttributeMapping(data.user_id, data.email_address, data.first_name, data.last_name);
  }
};
var SamlAccount = class _SamlAccount {
  static {
    __name(this, "_SamlAccount");
  }
  static {
    __name2(this, "_SamlAccount");
  }
  constructor(id, provider, providerUserId, active, emailAddress, firstName, lastName, verification, samlConnection, lastAuthenticatedAt, enterpriseConnectionId) {
    this.id = id;
    this.provider = provider;
    this.providerUserId = providerUserId;
    this.active = active;
    this.emailAddress = emailAddress;
    this.firstName = firstName;
    this.lastName = lastName;
    this.verification = verification;
    this.samlConnection = samlConnection;
    this.lastAuthenticatedAt = lastAuthenticatedAt;
    this.enterpriseConnectionId = enterpriseConnectionId;
  }
  static fromJSON(data) {
    return new _SamlAccount(
      data.id,
      data.provider,
      data.provider_user_id,
      data.active,
      data.email_address,
      data.first_name,
      data.last_name,
      data.verification && Verification.fromJSON(data.verification),
      data.saml_connection && SamlAccountConnection.fromJSON(data.saml_connection),
      data.last_authenticated_at ?? null,
      data.enterprise_connection_id
    );
  }
};
var SignInToken = class _SignInToken {
  static {
    __name(this, "_SignInToken");
  }
  static {
    __name2(this, "_SignInToken");
  }
  constructor(id, userId, token, status, url, createdAt, updatedAt) {
    this.id = id;
    this.userId = userId;
    this.token = token;
    this.status = status;
    this.url = url;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
  static fromJSON(data) {
    return new _SignInToken(data.id, data.user_id, data.token, data.status, data.url, data.created_at, data.updated_at);
  }
};
var SignUpAttemptVerification = class _SignUpAttemptVerification {
  static {
    __name(this, "_SignUpAttemptVerification");
  }
  static {
    __name2(this, "_SignUpAttemptVerification");
  }
  constructor(nextAction, supportedStrategies) {
    this.nextAction = nextAction;
    this.supportedStrategies = supportedStrategies;
  }
  static fromJSON(data) {
    return new _SignUpAttemptVerification(data.next_action, data.supported_strategies);
  }
};
var SignUpAttemptVerifications = class _SignUpAttemptVerifications {
  static {
    __name(this, "_SignUpAttemptVerifications");
  }
  static {
    __name2(this, "_SignUpAttemptVerifications");
  }
  constructor(emailAddress, phoneNumber, web3Wallet, externalAccount) {
    this.emailAddress = emailAddress;
    this.phoneNumber = phoneNumber;
    this.web3Wallet = web3Wallet;
    this.externalAccount = externalAccount;
  }
  static fromJSON(data) {
    return new _SignUpAttemptVerifications(
      data.email_address && SignUpAttemptVerification.fromJSON(data.email_address),
      data.phone_number && SignUpAttemptVerification.fromJSON(data.phone_number),
      data.web3_wallet && SignUpAttemptVerification.fromJSON(data.web3_wallet),
      data.external_account
    );
  }
};
var SignUpAttempt = class _SignUpAttempt {
  static {
    __name(this, "_SignUpAttempt");
  }
  static {
    __name2(this, "_SignUpAttempt");
  }
  constructor(id, status, requiredFields, optionalFields, missingFields, unverifiedFields, verifications, username, emailAddress, phoneNumber, web3Wallet, passwordEnabled, firstName, lastName, customAction, externalId, createdSessionId, createdUserId, abandonAt, legalAcceptedAt, publicMetadata, unsafeMetadata) {
    this.id = id;
    this.status = status;
    this.requiredFields = requiredFields;
    this.optionalFields = optionalFields;
    this.missingFields = missingFields;
    this.unverifiedFields = unverifiedFields;
    this.verifications = verifications;
    this.username = username;
    this.emailAddress = emailAddress;
    this.phoneNumber = phoneNumber;
    this.web3Wallet = web3Wallet;
    this.passwordEnabled = passwordEnabled;
    this.firstName = firstName;
    this.lastName = lastName;
    this.customAction = customAction;
    this.externalId = externalId;
    this.createdSessionId = createdSessionId;
    this.createdUserId = createdUserId;
    this.abandonAt = abandonAt;
    this.legalAcceptedAt = legalAcceptedAt;
    this.publicMetadata = publicMetadata;
    this.unsafeMetadata = unsafeMetadata;
  }
  static fromJSON(data) {
    return new _SignUpAttempt(
      data.id,
      data.status,
      data.required_fields,
      data.optional_fields,
      data.missing_fields,
      data.unverified_fields,
      data.verifications ? SignUpAttemptVerifications.fromJSON(data.verifications) : null,
      data.username,
      data.email_address,
      data.phone_number,
      data.web3_wallet,
      data.password_enabled,
      data.first_name,
      data.last_name,
      data.custom_action,
      data.external_id,
      data.created_session_id,
      data.created_user_id,
      data.abandon_at,
      data.legal_accepted_at,
      data.public_metadata,
      data.unsafe_metadata
    );
  }
};
var SMSMessage = class _SMSMessage {
  static {
    __name(this, "_SMSMessage");
  }
  static {
    __name2(this, "_SMSMessage");
  }
  constructor(id, fromPhoneNumber, toPhoneNumber, message, status, phoneNumberId, data) {
    this.id = id;
    this.fromPhoneNumber = fromPhoneNumber;
    this.toPhoneNumber = toPhoneNumber;
    this.message = message;
    this.status = status;
    this.phoneNumberId = phoneNumberId;
    this.data = data;
  }
  static fromJSON(data) {
    return new _SMSMessage(
      data.id,
      data.from_phone_number,
      data.to_phone_number,
      data.message,
      data.status,
      data.phone_number_id,
      data.data
    );
  }
};
var Token = class _Token {
  static {
    __name(this, "_Token");
  }
  static {
    __name2(this, "_Token");
  }
  constructor(jwt) {
    this.jwt = jwt;
  }
  static fromJSON(data) {
    return new _Token(data.jwt);
  }
};
var Web3Wallet = class _Web3Wallet {
  static {
    __name(this, "_Web3Wallet");
  }
  static {
    __name2(this, "_Web3Wallet");
  }
  constructor(id, web3Wallet, verification) {
    this.id = id;
    this.web3Wallet = web3Wallet;
    this.verification = verification;
  }
  static fromJSON(data) {
    return new _Web3Wallet(data.id, data.web3_wallet, data.verification && Verification.fromJSON(data.verification));
  }
};
var User = class _User {
  static {
    __name(this, "_User");
  }
  static {
    __name2(this, "_User");
  }
  constructor(id, passwordEnabled, totpEnabled, backupCodeEnabled, twoFactorEnabled, banned, locked, createdAt, updatedAt, imageUrl, hasImage, primaryEmailAddressId, primaryPhoneNumberId, primaryWeb3WalletId, lastSignInAt, externalId, username, firstName, lastName, publicMetadata = {}, privateMetadata = {}, unsafeMetadata = {}, emailAddresses = [], phoneNumbers = [], web3Wallets = [], externalAccounts = [], samlAccounts = [], lastActiveAt, createOrganizationEnabled, createOrganizationsLimit = null, deleteSelfEnabled, legalAcceptedAt, locale) {
    this.id = id;
    this.passwordEnabled = passwordEnabled;
    this.totpEnabled = totpEnabled;
    this.backupCodeEnabled = backupCodeEnabled;
    this.twoFactorEnabled = twoFactorEnabled;
    this.banned = banned;
    this.locked = locked;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.imageUrl = imageUrl;
    this.hasImage = hasImage;
    this.primaryEmailAddressId = primaryEmailAddressId;
    this.primaryPhoneNumberId = primaryPhoneNumberId;
    this.primaryWeb3WalletId = primaryWeb3WalletId;
    this.lastSignInAt = lastSignInAt;
    this.externalId = externalId;
    this.username = username;
    this.firstName = firstName;
    this.lastName = lastName;
    this.publicMetadata = publicMetadata;
    this.privateMetadata = privateMetadata;
    this.unsafeMetadata = unsafeMetadata;
    this.emailAddresses = emailAddresses;
    this.phoneNumbers = phoneNumbers;
    this.web3Wallets = web3Wallets;
    this.externalAccounts = externalAccounts;
    this.samlAccounts = samlAccounts;
    this.lastActiveAt = lastActiveAt;
    this.createOrganizationEnabled = createOrganizationEnabled;
    this.createOrganizationsLimit = createOrganizationsLimit;
    this.deleteSelfEnabled = deleteSelfEnabled;
    this.legalAcceptedAt = legalAcceptedAt;
    this.locale = locale;
    this._raw = null;
  }
  get raw() {
    return this._raw;
  }
  static fromJSON(data) {
    const res = new _User(
      data.id,
      data.password_enabled,
      data.totp_enabled,
      data.backup_code_enabled,
      data.two_factor_enabled,
      data.banned,
      data.locked,
      data.created_at,
      data.updated_at,
      data.image_url,
      data.has_image,
      data.primary_email_address_id,
      data.primary_phone_number_id,
      data.primary_web3_wallet_id,
      data.last_sign_in_at,
      data.external_id,
      data.username,
      data.first_name,
      data.last_name,
      data.public_metadata,
      data.private_metadata,
      data.unsafe_metadata,
      (data.email_addresses || []).map((x2) => EmailAddress.fromJSON(x2)),
      (data.phone_numbers || []).map((x2) => PhoneNumber.fromJSON(x2)),
      (data.web3_wallets || []).map((x2) => Web3Wallet.fromJSON(x2)),
      (data.external_accounts || []).map((x2) => ExternalAccount.fromJSON(x2)),
      (data.saml_accounts || []).map((x2) => SamlAccount.fromJSON(x2)),
      data.last_active_at,
      data.create_organization_enabled,
      data.create_organizations_limit,
      data.delete_self_enabled,
      data.legal_accepted_at,
      data.locale
    );
    res._raw = data;
    return res;
  }
  /**
   * The primary email address of the user.
   */
  get primaryEmailAddress() {
    return this.emailAddresses.find(({ id }) => id === this.primaryEmailAddressId) ?? null;
  }
  /**
   * The primary phone number of the user.
   */
  get primaryPhoneNumber() {
    return this.phoneNumbers.find(({ id }) => id === this.primaryPhoneNumberId) ?? null;
  }
  /**
   * The primary web3 wallet of the user.
   */
  get primaryWeb3Wallet() {
    return this.web3Wallets.find(({ id }) => id === this.primaryWeb3WalletId) ?? null;
  }
  /**
   * The full name of the user.
   */
  get fullName() {
    return [this.firstName, this.lastName].join(" ").trim() || null;
  }
};
var WaitlistEntry = class _WaitlistEntry {
  static {
    __name(this, "_WaitlistEntry");
  }
  static {
    __name2(this, "_WaitlistEntry");
  }
  constructor(id, emailAddress, status, invitation, createdAt, updatedAt, isLocked) {
    this.id = id;
    this.emailAddress = emailAddress;
    this.status = status;
    this.invitation = invitation;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.isLocked = isLocked;
  }
  static fromJSON(data) {
    return new _WaitlistEntry(
      data.id,
      data.email_address,
      data.status,
      data.invitation && Invitation.fromJSON(data.invitation),
      data.created_at,
      data.updated_at,
      data.is_locked
    );
  }
};
var Feature = class _Feature {
  static {
    __name(this, "_Feature");
  }
  static {
    __name2(this, "_Feature");
  }
  constructor(id, name, description, slug, avatarUrl) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.slug = slug;
    this.avatarUrl = avatarUrl;
  }
  static fromJSON(data) {
    return new _Feature(data.id, data.name, data.description ?? null, data.slug, data.avatar_url ?? null);
  }
};
var BillingPlan = class _BillingPlan {
  static {
    __name(this, "_BillingPlan");
  }
  static {
    __name2(this, "_BillingPlan");
  }
  constructor(id, name, slug, description, isDefault, isRecurring, hasBaseFee, publiclyVisible, fee, annualFee, annualMonthlyFee, forPayerType, features) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.description = description;
    this.isDefault = isDefault;
    this.isRecurring = isRecurring;
    this.hasBaseFee = hasBaseFee;
    this.publiclyVisible = publiclyVisible;
    this.fee = fee;
    this.annualFee = annualFee;
    this.annualMonthlyFee = annualMonthlyFee;
    this.forPayerType = forPayerType;
    this.features = features;
  }
  static fromJSON(data) {
    const formatAmountJSON = /* @__PURE__ */ __name2((fee) => {
      return fee ? {
        amount: fee.amount,
        amountFormatted: fee.amount_formatted,
        currency: fee.currency,
        currencySymbol: fee.currency_symbol
      } : null;
    }, "formatAmountJSON");
    return new _BillingPlan(
      data.id,
      data.name,
      data.slug,
      data.description ?? null,
      data.is_default,
      data.is_recurring,
      data.has_base_fee,
      data.publicly_visible,
      formatAmountJSON(data.fee),
      formatAmountJSON(data.annual_fee),
      formatAmountJSON(data.annual_monthly_fee),
      data.for_payer_type,
      (data.features ?? []).map((feature) => Feature.fromJSON(feature))
    );
  }
};
var BillingSubscriptionItem = class _BillingSubscriptionItem {
  static {
    __name(this, "_BillingSubscriptionItem");
  }
  static {
    __name2(this, "_BillingSubscriptionItem");
  }
  constructor(id, status, planPeriod, periodStart, nextPayment, amount, plan, planId, createdAt, updatedAt, periodEnd, canceledAt, pastDueAt, endedAt, payerId, isFreeTrial, lifetimePaid) {
    this.id = id;
    this.status = status;
    this.planPeriod = planPeriod;
    this.periodStart = periodStart;
    this.nextPayment = nextPayment;
    this.amount = amount;
    this.plan = plan;
    this.planId = planId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.periodEnd = periodEnd;
    this.canceledAt = canceledAt;
    this.pastDueAt = pastDueAt;
    this.endedAt = endedAt;
    this.payerId = payerId;
    this.isFreeTrial = isFreeTrial;
    this.lifetimePaid = lifetimePaid;
  }
  static fromJSON(data) {
    function formatAmountJSON(amount) {
      if (!amount) {
        return amount;
      }
      return {
        amount: amount.amount,
        amountFormatted: amount.amount_formatted,
        currency: amount.currency,
        currencySymbol: amount.currency_symbol
      };
    }
    __name(formatAmountJSON, "formatAmountJSON");
    __name2(formatAmountJSON, "formatAmountJSON");
    return new _BillingSubscriptionItem(
      data.id,
      data.status,
      data.plan_period,
      data.period_start,
      data.next_payment,
      formatAmountJSON(data.amount) ?? void 0,
      data.plan ? BillingPlan.fromJSON(data.plan) : null,
      data.plan_id ?? null,
      data.created_at,
      data.updated_at,
      data.period_end,
      data.canceled_at,
      data.past_due_at,
      data.ended_at,
      data.payer_id,
      data.is_free_trial,
      formatAmountJSON(data.lifetime_paid) ?? void 0
    );
  }
};
var BillingSubscription = class _BillingSubscription {
  static {
    __name(this, "_BillingSubscription");
  }
  static {
    __name2(this, "_BillingSubscription");
  }
  constructor(id, status, payerId, createdAt, updatedAt, activeAt, pastDueAt, subscriptionItems, nextPayment, eligibleForFreeTrial) {
    this.id = id;
    this.status = status;
    this.payerId = payerId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.activeAt = activeAt;
    this.pastDueAt = pastDueAt;
    this.subscriptionItems = subscriptionItems;
    this.nextPayment = nextPayment;
    this.eligibleForFreeTrial = eligibleForFreeTrial;
  }
  static fromJSON(data) {
    const nextPayment = data.next_payment ? {
      date: data.next_payment.date,
      amount: {
        amount: data.next_payment.amount.amount,
        amountFormatted: data.next_payment.amount.amount_formatted,
        currency: data.next_payment.amount.currency,
        currencySymbol: data.next_payment.amount.currency_symbol
      }
    } : null;
    return new _BillingSubscription(
      data.id,
      data.status,
      data.payer_id,
      data.created_at,
      data.updated_at,
      data.active_at ?? null,
      data.past_due_at ?? null,
      (data.subscription_items ?? []).map((item) => BillingSubscriptionItem.fromJSON(item)),
      nextPayment,
      data.eligible_for_free_trial ?? false
    );
  }
};
function deserialize(payload) {
  let data, totalCount;
  if (Array.isArray(payload)) {
    const data2 = payload.map((item) => jsonToObject(item));
    return { data: data2 };
  } else if (isM2MTokenResponse(payload)) {
    data = payload.m2m_tokens.map((item) => jsonToObject(item));
    totalCount = payload.total_count;
    return { data, totalCount };
  } else if (isPaginated(payload)) {
    data = payload.data.map((item) => jsonToObject(item));
    totalCount = payload.total_count;
    return { data, totalCount };
  } else {
    return { data: jsonToObject(payload) };
  }
}
__name(deserialize, "deserialize");
__name2(deserialize, "deserialize");
function isPaginated(payload) {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return false;
  }
  return Array.isArray(payload.data) && payload.data !== void 0;
}
__name(isPaginated, "isPaginated");
__name2(isPaginated, "isPaginated");
function isM2MTokenResponse(payload) {
  if (!payload || typeof payload !== "object" || !("m2m_tokens" in payload)) {
    return false;
  }
  return Array.isArray(payload.m2m_tokens);
}
__name(isM2MTokenResponse, "isM2MTokenResponse");
__name2(isM2MTokenResponse, "isM2MTokenResponse");
function getCount(item) {
  return item.total_count;
}
__name(getCount, "getCount");
__name2(getCount, "getCount");
function jsonToObject(item) {
  if (typeof item !== "string" && "object" in item && "deleted" in item) {
    return DeletedObject.fromJSON(item);
  }
  switch (item.object) {
    case ObjectType.AccountlessApplication:
      return AccountlessApplication.fromJSON(item);
    case ObjectType.ActorToken:
      return ActorToken.fromJSON(item);
    case ObjectType.AllowlistIdentifier:
      return AllowlistIdentifier.fromJSON(item);
    case ObjectType.ApiKey:
      return APIKey.fromJSON(item);
    case ObjectType.BlocklistIdentifier:
      return BlocklistIdentifier.fromJSON(item);
    case ObjectType.Client:
      return Client.fromJSON(item);
    case ObjectType.Cookies:
      return Cookies2.fromJSON(item);
    case ObjectType.Domain:
      return Domain.fromJSON(item);
    case ObjectType.EmailAddress:
      return EmailAddress.fromJSON(item);
    case ObjectType.Email:
      return Email.fromJSON(item);
    case ObjectType.IdpOAuthAccessToken:
      return IdPOAuthAccessToken.fromJSON(item);
    case ObjectType.Instance:
      return Instance.fromJSON(item);
    case ObjectType.InstanceRestrictions:
      return InstanceRestrictions.fromJSON(item);
    case ObjectType.InstanceSettings:
      return InstanceSettings.fromJSON(item);
    case ObjectType.Invitation:
      return Invitation.fromJSON(item);
    case ObjectType.JwtTemplate:
      return JwtTemplate.fromJSON(item);
    case ObjectType.Machine:
      return Machine.fromJSON(item);
    case ObjectType.MachineScope:
      return MachineScope.fromJSON(item);
    case ObjectType.MachineSecretKey:
      return MachineSecretKey.fromJSON(item);
    case ObjectType.M2MToken:
      return M2MToken.fromJSON(item);
    case ObjectType.OauthAccessToken:
      return OauthAccessToken.fromJSON(item);
    case ObjectType.OAuthApplication:
      return OAuthApplication.fromJSON(item);
    case ObjectType.Organization:
      return Organization.fromJSON(item);
    case ObjectType.OrganizationInvitation:
      return OrganizationInvitation.fromJSON(item);
    case ObjectType.OrganizationMembership:
      return OrganizationMembership.fromJSON(item);
    case ObjectType.OrganizationSettings:
      return OrganizationSettings.fromJSON(item);
    case ObjectType.PhoneNumber:
      return PhoneNumber.fromJSON(item);
    case ObjectType.ProxyCheck:
      return ProxyCheck.fromJSON(item);
    case ObjectType.RedirectUrl:
      return RedirectUrl.fromJSON(item);
    case ObjectType.SamlConnection:
      return SamlConnection.fromJSON(item);
    case ObjectType.SignInToken:
      return SignInToken.fromJSON(item);
    case ObjectType.AgentTask:
      return AgentTask.fromJSON(item);
    case ObjectType.SignUpAttempt:
      return SignUpAttempt.fromJSON(item);
    case ObjectType.Session:
      return Session.fromJSON(item);
    case ObjectType.SmsMessage:
      return SMSMessage.fromJSON(item);
    case ObjectType.Token:
      return Token.fromJSON(item);
    case ObjectType.TotalCount:
      return getCount(item);
    case ObjectType.User:
      return User.fromJSON(item);
    case ObjectType.WaitlistEntry:
      return WaitlistEntry.fromJSON(item);
    case ObjectType.BillingPlan:
      return BillingPlan.fromJSON(item);
    case ObjectType.BillingSubscription:
      return BillingSubscription.fromJSON(item);
    case ObjectType.BillingSubscriptionItem:
      return BillingSubscriptionItem.fromJSON(item);
    case ObjectType.Feature:
      return Feature.fromJSON(item);
    default:
      return item;
  }
}
__name(jsonToObject, "jsonToObject");
__name2(jsonToObject, "jsonToObject");
function buildRequest(options) {
  const requestFn = /* @__PURE__ */ __name2(async (requestOptions) => {
    const {
      secretKey,
      machineSecretKey,
      useMachineSecretKey = false,
      requireSecretKey = true,
      apiUrl = API_URL,
      apiVersion = API_VERSION,
      userAgent = USER_AGENT,
      skipApiVersionInUrl = false
    } = options;
    const { path, method, queryParams, headerParams, bodyParams, formData, options: opts } = requestOptions;
    const { deepSnakecaseBodyParamKeys = false } = opts || {};
    if (requireSecretKey) {
      assertValidSecretKey(secretKey);
    }
    const url = skipApiVersionInUrl ? joinPaths(apiUrl, path) : joinPaths(apiUrl, apiVersion, path);
    const finalUrl = new URL(url);
    if (queryParams) {
      const snakecasedQueryParams = snakecase_keys_default({ ...queryParams });
      for (const [key, val] of Object.entries(snakecasedQueryParams)) {
        if (val) {
          [val].flat().forEach((v2) => finalUrl.searchParams.append(key, v2));
        }
      }
    }
    const headers = new Headers({
      "Clerk-API-Version": SUPPORTED_BAPI_VERSION,
      [constants.Headers.UserAgent]: userAgent,
      ...headerParams
    });
    const authorizationHeader = constants.Headers.Authorization;
    if (!headers.has(authorizationHeader)) {
      if (useMachineSecretKey && machineSecretKey) {
        headers.set(authorizationHeader, `Bearer ${machineSecretKey}`);
      } else if (secretKey) {
        headers.set(authorizationHeader, `Bearer ${secretKey}`);
      }
    }
    let res;
    try {
      if (formData) {
        res = await runtime.fetch(finalUrl.href, {
          method,
          headers,
          body: formData
        });
      } else {
        headers.set("Content-Type", "application/json");
        const buildBody = /* @__PURE__ */ __name2(() => {
          const hasBody = method !== "GET" && bodyParams && Object.keys(bodyParams).length > 0;
          if (!hasBody) {
            return null;
          }
          const formatKeys = /* @__PURE__ */ __name2((object) => snakecase_keys_default(object, { deep: deepSnakecaseBodyParamKeys }), "formatKeys");
          return {
            body: JSON.stringify(Array.isArray(bodyParams) ? bodyParams.map(formatKeys) : formatKeys(bodyParams))
          };
        }, "buildBody");
        res = await runtime.fetch(finalUrl.href, {
          method,
          headers,
          ...buildBody()
        });
      }
      const isJSONResponse = res?.headers && res.headers?.get(constants.Headers.ContentType) === constants.ContentTypes.Json;
      const responseBody = await (isJSONResponse ? res.json() : res.text());
      if (!res.ok) {
        return {
          data: null,
          errors: parseErrors2(responseBody),
          status: res?.status,
          statusText: res?.statusText,
          clerkTraceId: getTraceId(responseBody, res?.headers),
          retryAfter: getRetryAfter(res?.headers)
        };
      }
      return {
        ...deserialize(responseBody),
        errors: null
      };
    } catch (err) {
      if (err instanceof Error) {
        return {
          data: null,
          errors: [
            {
              code: "unexpected_error",
              message: err.message || "Unexpected error"
            }
          ],
          clerkTraceId: getTraceId(err, res?.headers)
        };
      }
      return {
        data: null,
        errors: parseErrors2(err),
        status: res?.status,
        statusText: res?.statusText,
        clerkTraceId: getTraceId(err, res?.headers),
        retryAfter: getRetryAfter(res?.headers)
      };
    }
  }, "requestFn");
  return withLegacyRequestReturn(requestFn);
}
__name(buildRequest, "buildRequest");
__name2(buildRequest, "buildRequest");
function getTraceId(data, headers) {
  if (data && typeof data === "object" && "clerk_trace_id" in data && typeof data.clerk_trace_id === "string") {
    return data.clerk_trace_id;
  }
  const cfRay = headers?.get("cf-ray");
  return cfRay || "";
}
__name(getTraceId, "getTraceId");
__name2(getTraceId, "getTraceId");
function getRetryAfter(headers) {
  const retryAfter = headers?.get("Retry-After");
  if (!retryAfter) {
    return;
  }
  const value = parseInt(retryAfter, 10);
  if (isNaN(value)) {
    return;
  }
  return value;
}
__name(getRetryAfter, "getRetryAfter");
__name2(getRetryAfter, "getRetryAfter");
function parseErrors2(data) {
  if (!!data && typeof data === "object" && "errors" in data) {
    const errors = data.errors;
    return errors.length > 0 ? errors.map(parseError) : [];
  }
  return [];
}
__name(parseErrors2, "parseErrors2");
__name2(parseErrors2, "parseErrors");
function withLegacyRequestReturn(cb) {
  return async (...args) => {
    const { data, errors, totalCount, status, statusText, clerkTraceId, retryAfter } = await cb(...args);
    if (errors) {
      const error = new ClerkAPIResponseError(statusText || "", {
        data: [],
        status,
        clerkTraceId,
        retryAfter
      });
      error.errors = errors;
      throw error;
    }
    if (typeof totalCount !== "undefined") {
      return { data, totalCount };
    }
    return data;
  };
}
__name(withLegacyRequestReturn, "withLegacyRequestReturn");
__name2(withLegacyRequestReturn, "withLegacyRequestReturn");
function createBackendApiClient(options) {
  const request = buildRequest(options);
  return {
    __experimental_accountlessApplications: new AccountlessApplicationAPI(
      buildRequest({ ...options, requireSecretKey: false })
    ),
    actorTokens: new ActorTokenAPI(request),
    /**
     * @experimental This is an experimental API for the Agent Tasks feature that is available under a private beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
     */
    agentTasks: new AgentTaskAPI(request),
    allowlistIdentifiers: new AllowlistIdentifierAPI(request),
    apiKeys: new APIKeysAPI(
      buildRequest({
        ...options,
        skipApiVersionInUrl: true
      })
    ),
    betaFeatures: new BetaFeaturesAPI(request),
    blocklistIdentifiers: new BlocklistIdentifierAPI(request),
    /**
     * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
     */
    billing: new BillingAPI(request),
    clients: new ClientAPI(request),
    domains: new DomainAPI(request),
    emailAddresses: new EmailAddressAPI(request),
    idPOAuthAccessToken: new IdPOAuthAccessTokenApi(
      buildRequest({
        ...options,
        skipApiVersionInUrl: true
      })
    ),
    instance: new InstanceAPI(request),
    invitations: new InvitationAPI(request),
    jwks: new JwksAPI(request),
    jwtTemplates: new JwtTemplatesApi(request),
    machines: new MachineApi(request),
    m2m: new M2MTokenApi(
      buildRequest({
        ...options,
        skipApiVersionInUrl: true,
        requireSecretKey: false,
        useMachineSecretKey: true
      }),
      {
        secretKey: options.secretKey,
        apiUrl: options.apiUrl,
        jwtKey: options.jwtKey
      }
    ),
    oauthApplications: new OAuthApplicationsApi(request),
    organizations: new OrganizationAPI(request),
    phoneNumbers: new PhoneNumberAPI(request),
    proxyChecks: new ProxyCheckAPI(request),
    redirectUrls: new RedirectUrlAPI(request),
    samlConnections: new SamlConnectionAPI(request),
    sessions: new SessionAPI(request),
    signInTokens: new SignInTokenAPI(request),
    signUps: new SignUpAPI(request),
    testingTokens: new TestingTokenAPI(request),
    users: new UserAPI(request),
    waitlistEntries: new WaitlistEntryAPI(request),
    webhooks: new WebhookAPI(request)
  };
}
__name(createBackendApiClient, "createBackendApiClient");
__name2(createBackendApiClient, "createBackendApiClient");
var createDebug = /* @__PURE__ */ __name2((data) => {
  return () => {
    const res = { ...data };
    res.secretKey = (res.secretKey || "").substring(0, 7);
    res.jwtKey = (res.jwtKey || "").substring(0, 7);
    return { ...res };
  };
}, "createDebug");
function signedInAuthObject(authenticateContext, sessionToken, sessionClaims) {
  const { actor, sessionId, sessionStatus, userId, orgId, orgRole, orgSlug, orgPermissions, factorVerificationAge } = __experimental_JWTPayloadToAuthObjectProperties(sessionClaims);
  const apiClient = createBackendApiClient(authenticateContext);
  const getToken = createGetToken({
    sessionId,
    sessionToken,
    fetcher: /* @__PURE__ */ __name2(async (sessionId2, template, expiresInSeconds) => (await apiClient.sessions.getToken(sessionId2, template || "", expiresInSeconds)).jwt, "fetcher")
  });
  return {
    tokenType: TokenType.SessionToken,
    actor,
    sessionClaims,
    sessionId,
    sessionStatus,
    userId,
    orgId,
    orgRole,
    orgSlug,
    orgPermissions,
    factorVerificationAge,
    getToken,
    has: createCheckAuthorization({
      orgId,
      orgRole,
      orgPermissions,
      userId,
      factorVerificationAge,
      features: sessionClaims.fea || "",
      plans: sessionClaims.pla || ""
    }),
    debug: createDebug({ ...authenticateContext, sessionToken }),
    isAuthenticated: true
  };
}
__name(signedInAuthObject, "signedInAuthObject");
__name2(signedInAuthObject, "signedInAuthObject");
function signedOutAuthObject(debugData, initialSessionStatus) {
  return {
    tokenType: TokenType.SessionToken,
    sessionClaims: null,
    sessionId: null,
    sessionStatus: initialSessionStatus ?? null,
    userId: null,
    actor: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    orgPermissions: null,
    factorVerificationAge: null,
    getToken: /* @__PURE__ */ __name2(() => Promise.resolve(null), "getToken"),
    has: /* @__PURE__ */ __name2(() => false, "has"),
    debug: createDebug(debugData),
    isAuthenticated: false
  };
}
__name(signedOutAuthObject, "signedOutAuthObject");
__name2(signedOutAuthObject, "signedOutAuthObject");
function authenticatedMachineObject(tokenType, token, verificationResult, debugData) {
  const baseObject = {
    id: verificationResult.id,
    subject: verificationResult.subject,
    getToken: /* @__PURE__ */ __name2(() => Promise.resolve(token), "getToken"),
    has: /* @__PURE__ */ __name2(() => false, "has"),
    debug: createDebug(debugData),
    isAuthenticated: true
  };
  switch (tokenType) {
    case TokenType.ApiKey: {
      const result = verificationResult;
      return {
        ...baseObject,
        tokenType,
        name: result.name,
        claims: result.claims,
        scopes: result.scopes,
        userId: result.subject.startsWith("user_") ? result.subject : null,
        orgId: result.subject.startsWith("org_") ? result.subject : null
      };
    }
    case TokenType.M2MToken: {
      const result = verificationResult;
      return {
        ...baseObject,
        tokenType,
        claims: result.claims,
        scopes: result.scopes,
        machineId: result.subject
      };
    }
    case TokenType.OAuthToken: {
      const result = verificationResult;
      return {
        ...baseObject,
        tokenType,
        scopes: result.scopes,
        userId: result.subject,
        clientId: result.clientId
      };
    }
    default:
      throw new Error(`Invalid token type: ${tokenType}`);
  }
}
__name(authenticatedMachineObject, "authenticatedMachineObject");
__name2(authenticatedMachineObject, "authenticatedMachineObject");
function unauthenticatedMachineObject(tokenType, debugData) {
  const baseObject = {
    id: null,
    subject: null,
    scopes: null,
    has: /* @__PURE__ */ __name2(() => false, "has"),
    getToken: /* @__PURE__ */ __name2(() => Promise.resolve(null), "getToken"),
    debug: createDebug(debugData),
    isAuthenticated: false
  };
  switch (tokenType) {
    case TokenType.ApiKey: {
      return {
        ...baseObject,
        tokenType,
        name: null,
        claims: null,
        scopes: null,
        userId: null,
        orgId: null
      };
    }
    case TokenType.M2MToken: {
      return {
        ...baseObject,
        tokenType,
        claims: null,
        scopes: null,
        machineId: null
      };
    }
    case TokenType.OAuthToken: {
      return {
        ...baseObject,
        tokenType,
        scopes: null,
        userId: null,
        clientId: null
      };
    }
    default:
      throw new Error(`Invalid token type: ${tokenType}`);
  }
}
__name(unauthenticatedMachineObject, "unauthenticatedMachineObject");
__name2(unauthenticatedMachineObject, "unauthenticatedMachineObject");
function invalidTokenAuthObject() {
  return {
    isAuthenticated: false,
    tokenType: null,
    getToken: /* @__PURE__ */ __name2(() => Promise.resolve(null), "getToken"),
    has: /* @__PURE__ */ __name2(() => false, "has"),
    debug: /* @__PURE__ */ __name2(() => ({}), "debug")
  };
}
__name(invalidTokenAuthObject, "invalidTokenAuthObject");
__name2(invalidTokenAuthObject, "invalidTokenAuthObject");
var createGetToken = /* @__PURE__ */ __name2((params) => {
  const { fetcher, sessionToken, sessionId } = params || {};
  return async (options = {}) => {
    if (!sessionId) {
      return null;
    }
    if (options.template || options.expiresInSeconds !== void 0) {
      return fetcher(sessionId, options.template, options.expiresInSeconds);
    }
    return sessionToken;
  };
}, "createGetToken");
var getAuthObjectForAcceptedToken = /* @__PURE__ */ __name2(({
  authObject,
  acceptsToken = TokenType.SessionToken
}) => {
  if (acceptsToken === "any") {
    return authObject;
  }
  if (Array.isArray(acceptsToken)) {
    if (!isTokenTypeAccepted(authObject.tokenType, acceptsToken)) {
      return invalidTokenAuthObject();
    }
    return authObject;
  }
  if (!isTokenTypeAccepted(authObject.tokenType, acceptsToken)) {
    if (isMachineTokenType(acceptsToken)) {
      return unauthenticatedMachineObject(acceptsToken, authObject.debug);
    }
    return signedOutAuthObject(authObject.debug);
  }
  return authObject;
}, "getAuthObjectForAcceptedToken");
var AuthStatus = {
  SignedIn: "signed-in",
  SignedOut: "signed-out",
  Handshake: "handshake"
};
var AuthErrorReason = {
  ClientUATWithoutSessionToken: "client-uat-but-no-session-token",
  DevBrowserMissing: "dev-browser-missing",
  DevBrowserSync: "dev-browser-sync",
  PrimaryRespondsToSyncing: "primary-responds-to-syncing",
  PrimaryDomainCrossOriginSync: "primary-domain-cross-origin-sync",
  SatelliteCookieNeedsSyncing: "satellite-needs-syncing",
  SessionTokenAndUATMissing: "session-token-and-uat-missing",
  SessionTokenMissing: "session-token-missing",
  SessionTokenExpired: "session-token-expired",
  SessionTokenIATBeforeClientUAT: "session-token-iat-before-client-uat",
  SessionTokenNBF: "session-token-nbf",
  SessionTokenIatInTheFuture: "session-token-iat-in-the-future",
  SessionTokenWithoutClientUAT: "session-token-but-no-client-uat",
  ActiveOrganizationMismatch: "active-organization-mismatch",
  TokenTypeMismatch: "token-type-mismatch",
  UnexpectedError: "unexpected-error"
};
function signedIn(params) {
  const { authenticateContext, headers = new Headers(), token } = params;
  const toAuth = /* @__PURE__ */ __name2((({ treatPendingAsSignedOut = true } = {}) => {
    if (params.tokenType === TokenType.SessionToken) {
      const { sessionClaims } = params;
      const authObject = signedInAuthObject(authenticateContext, token, sessionClaims);
      if (treatPendingAsSignedOut && authObject.sessionStatus === "pending") {
        return signedOutAuthObject(void 0, authObject.sessionStatus);
      }
      return authObject;
    }
    const { machineData } = params;
    return authenticatedMachineObject(params.tokenType, token, machineData, authenticateContext);
  }), "toAuth");
  return {
    status: AuthStatus.SignedIn,
    reason: null,
    message: null,
    proxyUrl: authenticateContext.proxyUrl || "",
    publishableKey: authenticateContext.publishableKey || "",
    isSatellite: authenticateContext.isSatellite || false,
    domain: authenticateContext.domain || "",
    signInUrl: authenticateContext.signInUrl || "",
    signUpUrl: authenticateContext.signUpUrl || "",
    afterSignInUrl: authenticateContext.afterSignInUrl || "",
    afterSignUpUrl: authenticateContext.afterSignUpUrl || "",
    isSignedIn: true,
    isAuthenticated: true,
    tokenType: params.tokenType,
    toAuth,
    headers,
    token
  };
}
__name(signedIn, "signedIn");
__name2(signedIn, "signedIn");
function signedOut(params) {
  const { authenticateContext, headers = new Headers(), reason, message = "", tokenType } = params;
  const toAuth = /* @__PURE__ */ __name2((() => {
    if (tokenType === TokenType.SessionToken) {
      return signedOutAuthObject({ ...authenticateContext, status: AuthStatus.SignedOut, reason, message });
    }
    return unauthenticatedMachineObject(tokenType, { reason, message, headers });
  }), "toAuth");
  return withDebugHeaders({
    status: AuthStatus.SignedOut,
    reason,
    message,
    proxyUrl: authenticateContext.proxyUrl || "",
    publishableKey: authenticateContext.publishableKey || "",
    isSatellite: authenticateContext.isSatellite || false,
    domain: authenticateContext.domain || "",
    signInUrl: authenticateContext.signInUrl || "",
    signUpUrl: authenticateContext.signUpUrl || "",
    afterSignInUrl: authenticateContext.afterSignInUrl || "",
    afterSignUpUrl: authenticateContext.afterSignUpUrl || "",
    isSignedIn: false,
    isAuthenticated: false,
    tokenType,
    toAuth,
    headers,
    token: null
  });
}
__name(signedOut, "signedOut");
__name2(signedOut, "signedOut");
function handshake(authenticateContext, reason, message = "", headers) {
  return withDebugHeaders({
    status: AuthStatus.Handshake,
    reason,
    message,
    publishableKey: authenticateContext.publishableKey || "",
    isSatellite: authenticateContext.isSatellite || false,
    domain: authenticateContext.domain || "",
    proxyUrl: authenticateContext.proxyUrl || "",
    signInUrl: authenticateContext.signInUrl || "",
    signUpUrl: authenticateContext.signUpUrl || "",
    afterSignInUrl: authenticateContext.afterSignInUrl || "",
    afterSignUpUrl: authenticateContext.afterSignUpUrl || "",
    isSignedIn: false,
    isAuthenticated: false,
    tokenType: TokenType.SessionToken,
    toAuth: /* @__PURE__ */ __name2(() => null, "toAuth"),
    headers,
    token: null
  });
}
__name(handshake, "handshake");
__name2(handshake, "handshake");
function signedOutInvalidToken() {
  const authObject = invalidTokenAuthObject();
  return withDebugHeaders({
    status: AuthStatus.SignedOut,
    reason: AuthErrorReason.TokenTypeMismatch,
    message: "",
    proxyUrl: "",
    publishableKey: "",
    isSatellite: false,
    domain: "",
    signInUrl: "",
    signUpUrl: "",
    afterSignInUrl: "",
    afterSignUpUrl: "",
    isSignedIn: false,
    isAuthenticated: false,
    tokenType: null,
    toAuth: /* @__PURE__ */ __name2(() => authObject, "toAuth"),
    headers: new Headers(),
    token: null
  });
}
__name(signedOutInvalidToken, "signedOutInvalidToken");
__name2(signedOutInvalidToken, "signedOutInvalidToken");
var withDebugHeaders = /* @__PURE__ */ __name2((requestState) => {
  const headers = new Headers(requestState.headers || {});
  if (requestState.message) {
    try {
      headers.set(constants.Headers.AuthMessage, requestState.message);
    } catch {
    }
  }
  if (requestState.reason) {
    try {
      headers.set(constants.Headers.AuthReason, requestState.reason);
    } catch {
    }
  }
  if (requestState.status) {
    try {
      headers.set(constants.Headers.AuthStatus, requestState.status);
    } catch {
    }
  }
  requestState.headers = headers;
  return requestState;
}, "withDebugHeaders");
var import_cookie = __toESM(require_dist());
var ClerkUrl = class extends URL {
  static {
    __name(this, "ClerkUrl");
  }
  static {
    __name2(this, "ClerkUrl");
  }
  isCrossOrigin(other) {
    return this.origin !== new URL(other.toString()).origin;
  }
};
var createClerkUrl = /* @__PURE__ */ __name2((...args) => {
  return new ClerkUrl(...args);
}, "createClerkUrl");
var ClerkRequest = class extends Request {
  static {
    __name(this, "ClerkRequest");
  }
  static {
    __name2(this, "ClerkRequest");
  }
  constructor(input, init) {
    const url = typeof input !== "string" && "url" in input ? input.url : String(input);
    super(url, init || typeof input === "string" ? void 0 : input);
    this.clerkUrl = this.deriveUrlFromHeaders(this);
    this.cookies = this.parseCookies(this);
  }
  toJSON() {
    return {
      url: this.clerkUrl.href,
      method: this.method,
      headers: JSON.stringify(Object.fromEntries(this.headers)),
      clerkUrl: this.clerkUrl.toString(),
      cookies: JSON.stringify(Object.fromEntries(this.cookies))
    };
  }
  /**
   * Used to fix request.url using the x-forwarded-* headers
   * TODO add detailed description of the issues this solves
   */
  deriveUrlFromHeaders(req) {
    const initialUrl = new URL(req.url);
    const forwardedProto = req.headers.get(constants.Headers.ForwardedProto);
    const forwardedHost = req.headers.get(constants.Headers.ForwardedHost);
    const host = req.headers.get(constants.Headers.Host);
    const protocol = initialUrl.protocol;
    const resolvedHost = this.getFirstValueFromHeader(forwardedHost) ?? host;
    const resolvedProtocol = this.getFirstValueFromHeader(forwardedProto) ?? protocol?.replace(/[:/]/, "");
    const origin = resolvedHost && resolvedProtocol ? `${resolvedProtocol}://${resolvedHost}` : initialUrl.origin;
    if (origin === initialUrl.origin) {
      return createClerkUrl(initialUrl);
    }
    return createClerkUrl(initialUrl.pathname + initialUrl.search, origin);
  }
  getFirstValueFromHeader(value) {
    return value?.split(",")[0];
  }
  parseCookies(req) {
    const cookiesRecord = (0, import_cookie.parse)(this.decodeCookieValue(req.headers.get("cookie") || ""));
    return new Map(Object.entries(cookiesRecord));
  }
  decodeCookieValue(str) {
    return str ? str.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent) : str;
  }
};
var createClerkRequest = /* @__PURE__ */ __name2((...args) => {
  const isClerkRequest = args[0] && typeof args[0] === "object" && "clerkUrl" in args[0] && "cookies" in args[0];
  return isClerkRequest ? args[0] : new ClerkRequest(...args);
}, "createClerkRequest");
var getCookieName = /* @__PURE__ */ __name2((cookieDirective) => {
  return cookieDirective.split(";")[0]?.split("=")[0];
}, "getCookieName");
var getCookieValue = /* @__PURE__ */ __name2((cookieDirective) => {
  return cookieDirective.split(";")[0]?.split("=")[1];
}, "getCookieValue");
async function verifyToken(token, options) {
  const { data: decodedResult, errors } = decodeJwt(token);
  if (errors) {
    return { errors };
  }
  const { header } = decodedResult;
  const { kid } = header;
  try {
    let key;
    if (options.jwtKey) {
      key = loadClerkJwkFromPem({ kid, pem: options.jwtKey });
    } else if (options.secretKey) {
      key = await loadClerkJWKFromRemote({ ...options, kid });
    } else {
      return {
        errors: [
          new TokenVerificationError({
            action: TokenVerificationErrorAction.SetClerkJWTKey,
            message: "Failed to resolve JWK during verification.",
            reason: TokenVerificationErrorReason.JWKFailedToResolve
          })
        ]
      };
    }
    return await verifyJwt(token, { ...options, key });
  } catch (error) {
    return { errors: [error] };
  }
}
__name(verifyToken, "verifyToken");
__name2(verifyToken, "verifyToken");
function handleClerkAPIError(tokenType, err, notFoundMessage) {
  if (isClerkAPIResponseError(err)) {
    let code;
    let message;
    switch (err.status) {
      case 401:
        code = MachineTokenVerificationErrorCode.InvalidSecretKey;
        message = err.errors[0]?.message || "Invalid secret key";
        break;
      case 404:
        code = MachineTokenVerificationErrorCode.TokenInvalid;
        message = notFoundMessage;
        break;
      default:
        code = MachineTokenVerificationErrorCode.UnexpectedError;
        message = "Unexpected error";
    }
    return {
      data: void 0,
      tokenType,
      errors: [
        new MachineTokenVerificationError({
          message,
          code,
          status: err.status
        })
      ]
    };
  }
  return {
    data: void 0,
    tokenType,
    errors: [
      new MachineTokenVerificationError({
        message: "Unexpected error",
        code: MachineTokenVerificationErrorCode.UnexpectedError,
        status: err.status
      })
    ]
  };
}
__name(handleClerkAPIError, "handleClerkAPIError");
__name2(handleClerkAPIError, "handleClerkAPIError");
async function verifyM2MToken(token, options) {
  try {
    const client = createBackendApiClient(options);
    const verifiedToken = await client.m2m.verify({ token });
    return { data: verifiedToken, tokenType: TokenType.M2MToken, errors: void 0 };
  } catch (err) {
    return handleClerkAPIError(TokenType.M2MToken, err, "Machine token not found");
  }
}
__name(verifyM2MToken, "verifyM2MToken");
__name2(verifyM2MToken, "verifyM2MToken");
async function verifyOAuthToken(accessToken, options) {
  try {
    const client = createBackendApiClient(options);
    const verifiedToken = await client.idPOAuthAccessToken.verify(accessToken);
    return { data: verifiedToken, tokenType: TokenType.OAuthToken, errors: void 0 };
  } catch (err) {
    return handleClerkAPIError(TokenType.OAuthToken, err, "OAuth token not found");
  }
}
__name(verifyOAuthToken, "verifyOAuthToken");
__name2(verifyOAuthToken, "verifyOAuthToken");
async function verifyAPIKey(secret, options) {
  try {
    const client = createBackendApiClient(options);
    const verifiedToken = await client.apiKeys.verify(secret);
    return { data: verifiedToken, tokenType: TokenType.ApiKey, errors: void 0 };
  } catch (err) {
    return handleClerkAPIError(TokenType.ApiKey, err, "API key not found");
  }
}
__name(verifyAPIKey, "verifyAPIKey");
__name2(verifyAPIKey, "verifyAPIKey");
async function verifyMachineAuthToken(token, options) {
  if (isJwtFormat(token)) {
    let decodedResult;
    try {
      const { data, errors: decodeErrors } = decodeJwt(token);
      if (decodeErrors) {
        throw decodeErrors[0];
      }
      decodedResult = data;
    } catch (e) {
      return {
        data: void 0,
        tokenType: TokenType.M2MToken,
        errors: [
          new MachineTokenVerificationError({
            code: MachineTokenVerificationErrorCode.TokenInvalid,
            message: e.message
          })
        ]
      };
    }
    if (decodedResult.payload.sub.startsWith(M2M_SUBJECT_PREFIX)) {
      return verifyM2MJwt(token, decodedResult, options);
    }
    if (OAUTH_ACCESS_TOKEN_TYPES.includes(decodedResult.header.typ)) {
      return verifyOAuthJwt(token, decodedResult, options);
    }
    return {
      data: void 0,
      tokenType: TokenType.OAuthToken,
      errors: [
        new MachineTokenVerificationError({
          code: MachineTokenVerificationErrorCode.TokenVerificationFailed,
          message: `Invalid JWT type: ${decodedResult.header.typ ?? "missing"}. Expected one of: ${OAUTH_ACCESS_TOKEN_TYPES.join(", ")} for OAuth, or sub starting with 'mch_' for M2M`
        })
      ]
    };
  }
  if (token.startsWith(M2M_TOKEN_PREFIX)) {
    return verifyM2MToken(token, options);
  }
  if (token.startsWith(OAUTH_TOKEN_PREFIX)) {
    return verifyOAuthToken(token, options);
  }
  if (token.startsWith(API_KEY_PREFIX)) {
    return verifyAPIKey(token, options);
  }
  throw new Error("Unknown machine token type");
}
__name(verifyMachineAuthToken, "verifyMachineAuthToken");
__name2(verifyMachineAuthToken, "verifyMachineAuthToken");
async function verifyHandshakeJwt(token, { key }) {
  const { data: decoded, errors } = decodeJwt(token);
  if (errors) {
    throw errors[0];
  }
  const { header, payload } = decoded;
  const { typ, alg } = header;
  assertHeaderType(typ);
  assertHeaderAlgorithm(alg);
  const { data: signatureValid, errors: signatureErrors } = await hasValidSignature(decoded, key);
  if (signatureErrors) {
    throw new TokenVerificationError({
      reason: TokenVerificationErrorReason.TokenVerificationFailed,
      message: `Error verifying handshake token. ${signatureErrors[0]}`
    });
  }
  if (!signatureValid) {
    throw new TokenVerificationError({
      reason: TokenVerificationErrorReason.TokenInvalidSignature,
      message: "Handshake signature is invalid."
    });
  }
  return payload;
}
__name(verifyHandshakeJwt, "verifyHandshakeJwt");
__name2(verifyHandshakeJwt, "verifyHandshakeJwt");
async function verifyHandshakeToken(token, options) {
  const { secretKey, apiUrl, apiVersion, jwksCacheTtlInMs, jwtKey, skipJwksCache } = options;
  const { data, errors } = decodeJwt(token);
  if (errors) {
    throw errors[0];
  }
  const { kid } = data.header;
  let key;
  if (jwtKey) {
    key = loadClerkJwkFromPem({ kid, pem: jwtKey });
  } else if (secretKey) {
    key = await loadClerkJWKFromRemote({ secretKey, apiUrl, apiVersion, kid, jwksCacheTtlInMs, skipJwksCache });
  } else {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.SetClerkJWTKey,
      message: "Failed to resolve JWK during handshake verification.",
      reason: TokenVerificationErrorReason.JWKFailedToResolve
    });
  }
  return verifyHandshakeJwt(token, { key });
}
__name(verifyHandshakeToken, "verifyHandshakeToken");
__name2(verifyHandshakeToken, "verifyHandshakeToken");
var HandshakeService = class {
  static {
    __name(this, "HandshakeService");
  }
  static {
    __name2(this, "HandshakeService");
  }
  constructor(authenticateContext, options, organizationMatcher) {
    this.authenticateContext = authenticateContext;
    this.options = options;
    this.organizationMatcher = organizationMatcher;
  }
  /**
   * Determines if a request is eligible for handshake based on its headers
   *
   * Currently, a request is only eligible for a handshake if we can say it's *probably* a request for a document, not a fetch or some other exotic request.
   * This heuristic should give us a reliable enough signal for browsers that support `Sec-Fetch-Dest` and for those that don't.
   *
   * @returns boolean indicating if the request is eligible for handshake
   */
  isRequestEligibleForHandshake() {
    const { accept, secFetchDest } = this.authenticateContext;
    if (secFetchDest === "document" || secFetchDest === "iframe") {
      return true;
    }
    if (!secFetchDest && accept?.startsWith("text/html")) {
      return true;
    }
    return false;
  }
  /**
   * Builds the redirect headers for a handshake request
   * @param reason - The reason for the handshake (e.g. 'session-token-expired')
   * @returns Headers object containing the Location header for redirect
   * @throws Error if clerkUrl is missing in authenticateContext
   */
  buildRedirectToHandshake(reason) {
    if (!this.authenticateContext?.clerkUrl) {
      throw new Error("Missing clerkUrl in authenticateContext");
    }
    const redirectUrl = this.removeDevBrowserFromURL(this.authenticateContext.clerkUrl);
    let baseUrl = this.authenticateContext.frontendApi.startsWith("http") ? this.authenticateContext.frontendApi : `https://${this.authenticateContext.frontendApi}`;
    baseUrl = baseUrl.replace(/\/+$/, "") + "/";
    const url = new URL("v1/client/handshake", baseUrl);
    url.searchParams.append("redirect_url", redirectUrl?.href || "");
    url.searchParams.append("__clerk_api_version", SUPPORTED_BAPI_VERSION);
    url.searchParams.append(
      constants.QueryParameters.SuffixedCookies,
      this.authenticateContext.usesSuffixedCookies().toString()
    );
    url.searchParams.append(constants.QueryParameters.HandshakeReason, reason);
    url.searchParams.append(constants.QueryParameters.HandshakeFormat, "nonce");
    if (this.authenticateContext.sessionToken) {
      url.searchParams.append(constants.QueryParameters.Session, this.authenticateContext.sessionToken);
    }
    if (this.authenticateContext.instanceType === "development" && this.authenticateContext.devBrowserToken) {
      url.searchParams.append(constants.QueryParameters.DevBrowser, this.authenticateContext.devBrowserToken);
    }
    const toActivate = this.getOrganizationSyncTarget(this.authenticateContext.clerkUrl, this.organizationMatcher);
    if (toActivate) {
      const params = this.getOrganizationSyncQueryParams(toActivate);
      params.forEach((value, key) => {
        url.searchParams.append(key, value);
      });
    }
    return new Headers({ [constants.Headers.Location]: url.href });
  }
  /**
   * Gets cookies from either a handshake nonce or a handshake token
   * @returns Promise resolving to string array of cookie directives
   */
  async getCookiesFromHandshake() {
    const cookiesToSet = [];
    if (this.authenticateContext.handshakeNonce) {
      try {
        const handshakePayload = await this.authenticateContext.apiClient?.clients.getHandshakePayload({
          nonce: this.authenticateContext.handshakeNonce
        });
        if (handshakePayload) {
          cookiesToSet.push(...handshakePayload.directives);
        }
      } catch (error) {
        console.error("Clerk: HandshakeService: error getting handshake payload:", error);
      }
    } else if (this.authenticateContext.handshakeToken) {
      const handshakePayload = await verifyHandshakeToken(
        this.authenticateContext.handshakeToken,
        this.authenticateContext
      );
      if (handshakePayload && Array.isArray(handshakePayload.handshake)) {
        cookiesToSet.push(...handshakePayload.handshake);
      }
    }
    return cookiesToSet;
  }
  /**
   * Resolves a handshake request by verifying the handshake token and setting appropriate cookies
   * @returns Promise resolving to either a SignedInState or SignedOutState
   * @throws Error if handshake verification fails or if there are issues with the session token
   */
  async resolveHandshake() {
    const headers = new Headers({
      "Access-Control-Allow-Origin": "null",
      "Access-Control-Allow-Credentials": "true"
    });
    const cookiesToSet = await this.getCookiesFromHandshake();
    let sessionToken = "";
    cookiesToSet.forEach((x2) => {
      headers.append("Set-Cookie", x2);
      if (getCookieName(x2).startsWith(constants.Cookies.Session)) {
        sessionToken = getCookieValue(x2);
      }
    });
    if (this.authenticateContext.instanceType === "development") {
      const newUrl = new URL(this.authenticateContext.clerkUrl);
      newUrl.searchParams.delete(constants.QueryParameters.Handshake);
      newUrl.searchParams.delete(constants.QueryParameters.HandshakeHelp);
      newUrl.searchParams.delete(constants.QueryParameters.DevBrowser);
      newUrl.searchParams.delete(constants.QueryParameters.HandshakeNonce);
      headers.append(constants.Headers.Location, newUrl.toString());
      headers.set(constants.Headers.CacheControl, "no-store");
    }
    if (sessionToken === "") {
      return signedOut({
        tokenType: TokenType.SessionToken,
        authenticateContext: this.authenticateContext,
        reason: AuthErrorReason.SessionTokenMissing,
        message: "",
        headers
      });
    }
    const { data, errors: [error] = [] } = await verifyToken(sessionToken, this.authenticateContext);
    if (data) {
      return signedIn({
        tokenType: TokenType.SessionToken,
        authenticateContext: this.authenticateContext,
        sessionClaims: data,
        headers,
        token: sessionToken
      });
    }
    if (this.authenticateContext.instanceType === "development" && (error?.reason === TokenVerificationErrorReason.TokenExpired || error?.reason === TokenVerificationErrorReason.TokenNotActiveYet || error?.reason === TokenVerificationErrorReason.TokenIatInTheFuture)) {
      const developmentError = new TokenVerificationError({
        action: error.action,
        message: error.message,
        reason: error.reason
      });
      developmentError.tokenCarrier = "cookie";
      console.error(
        `Clerk: Clock skew detected. This usually means that your system clock is inaccurate. Clerk will attempt to account for the clock skew in development.

To resolve this issue, make sure your system's clock is set to the correct time (e.g. turn off and on automatic time synchronization).

---

${developmentError.getFullMessage()}`
      );
      const { data: retryResult, errors: [retryError] = [] } = await verifyToken(sessionToken, {
        ...this.authenticateContext,
        clockSkewInMs: 864e5
      });
      if (retryResult) {
        return signedIn({
          tokenType: TokenType.SessionToken,
          authenticateContext: this.authenticateContext,
          sessionClaims: retryResult,
          headers,
          token: sessionToken
        });
      }
      throw new Error(retryError?.message || "Clerk: Handshake retry failed.");
    }
    throw new Error(error?.message || "Clerk: Handshake failed.");
  }
  /**
   * Handles handshake token verification errors in development mode
   * @param error - The TokenVerificationError that occurred
   * @throws Error with a descriptive message about the verification failure
   */
  handleTokenVerificationErrorInDevelopment(error) {
    if (error.reason === TokenVerificationErrorReason.TokenInvalidSignature) {
      const msg = `Clerk: Handshake token verification failed due to an invalid signature. If you have switched Clerk keys locally, clear your cookies and try again.`;
      throw new Error(msg);
    }
    throw new Error(`Clerk: Handshake token verification failed: ${error.getFullMessage()}.`);
  }
  /**
   * Checks if a redirect loop is detected and sets headers to track redirect count
   * @param headers - The Headers object to modify
   * @returns boolean indicating if a redirect loop was detected (true) or if the request can proceed (false)
   */
  checkAndTrackRedirectLoop(headers) {
    if (this.authenticateContext.handshakeRedirectLoopCounter === 3) {
      return true;
    }
    const newCounterValue = this.authenticateContext.handshakeRedirectLoopCounter + 1;
    const cookieName = constants.Cookies.RedirectCount;
    headers.append("Set-Cookie", `${cookieName}=${newCounterValue}; SameSite=Lax; HttpOnly; Max-Age=2`);
    return false;
  }
  removeDevBrowserFromURL(url) {
    const updatedURL = new URL(url);
    updatedURL.searchParams.delete(constants.QueryParameters.DevBrowser);
    updatedURL.searchParams.delete(constants.QueryParameters.LegacyDevBrowser);
    return updatedURL;
  }
  getOrganizationSyncTarget(url, matchers) {
    return matchers.findTarget(url);
  }
  getOrganizationSyncQueryParams(toActivate) {
    const ret = /* @__PURE__ */ new Map();
    if (toActivate.type === "personalAccount") {
      ret.set("organization_id", "");
    }
    if (toActivate.type === "organization") {
      if (toActivate.organizationId) {
        ret.set("organization_id", toActivate.organizationId);
      }
      if (toActivate.organizationSlug) {
        ret.set("organization_id", toActivate.organizationSlug);
      }
    }
    return ret;
  }
};
var OrganizationMatcher = class {
  static {
    __name(this, "OrganizationMatcher");
  }
  static {
    __name2(this, "OrganizationMatcher");
  }
  constructor(options) {
    this.organizationPattern = this.createMatcher(options?.organizationPatterns);
    this.personalAccountPattern = this.createMatcher(options?.personalAccountPatterns);
  }
  createMatcher(pattern) {
    if (!pattern) {
      return null;
    }
    try {
      return match2(pattern);
    } catch (e) {
      throw new Error(`Invalid pattern "${pattern}": ${e}`);
    }
  }
  findTarget(url) {
    const orgTarget = this.findOrganizationTarget(url);
    if (orgTarget) {
      return orgTarget;
    }
    return this.findPersonalAccountTarget(url);
  }
  findOrganizationTarget(url) {
    if (!this.organizationPattern) {
      return null;
    }
    try {
      const result = this.organizationPattern(url.pathname);
      if (!result || !("params" in result)) {
        return null;
      }
      const params = result.params;
      if (params.id) {
        return { type: "organization", organizationId: params.id };
      }
      if (params.slug) {
        return { type: "organization", organizationSlug: params.slug };
      }
      return null;
    } catch (e) {
      console.error("Failed to match organization pattern:", e);
      return null;
    }
  }
  findPersonalAccountTarget(url) {
    if (!this.personalAccountPattern) {
      return null;
    }
    try {
      const result = this.personalAccountPattern(url.pathname);
      return result ? { type: "personalAccount" } : null;
    } catch (e) {
      console.error("Failed to match personal account pattern:", e);
      return null;
    }
  }
};
var RefreshTokenErrorReason = {
  NonEligibleNoCookie: "non-eligible-no-refresh-cookie",
  NonEligibleNonGet: "non-eligible-non-get",
  InvalidSessionToken: "invalid-session-token",
  MissingApiClient: "missing-api-client",
  MissingSessionToken: "missing-session-token",
  MissingRefreshToken: "missing-refresh-token",
  ExpiredSessionTokenDecodeFailed: "expired-session-token-decode-failed",
  ExpiredSessionTokenMissingSidClaim: "expired-session-token-missing-sid-claim",
  FetchError: "fetch-error",
  UnexpectedSDKError: "unexpected-sdk-error",
  UnexpectedBAPIError: "unexpected-bapi-error"
};
function assertSignInUrlExists(signInUrl, key) {
  if (!signInUrl && isDevelopmentFromSecretKey(key)) {
    throw new Error(`Missing signInUrl. Pass a signInUrl for dev instances if an app is satellite`);
  }
}
__name(assertSignInUrlExists, "assertSignInUrlExists");
__name2(assertSignInUrlExists, "assertSignInUrlExists");
function assertProxyUrlOrDomain(proxyUrlOrDomain) {
  if (!proxyUrlOrDomain) {
    throw new Error(`Missing domain and proxyUrl. A satellite application needs to specify a domain or a proxyUrl`);
  }
}
__name(assertProxyUrlOrDomain, "assertProxyUrlOrDomain");
__name2(assertProxyUrlOrDomain, "assertProxyUrlOrDomain");
function assertSignInUrlFormatAndOrigin(_signInUrl, origin) {
  let signInUrl;
  try {
    signInUrl = new URL(_signInUrl);
  } catch {
    throw new Error(`The signInUrl needs to have a absolute url format.`);
  }
  if (signInUrl.origin === origin) {
    throw new Error(`The signInUrl needs to be on a different origin than your satellite application.`);
  }
}
__name(assertSignInUrlFormatAndOrigin, "assertSignInUrlFormatAndOrigin");
__name2(assertSignInUrlFormatAndOrigin, "assertSignInUrlFormatAndOrigin");
function assertMachineSecretOrSecretKey(authenticateContext) {
  if (!authenticateContext.machineSecretKey && !authenticateContext.secretKey) {
    throw new Error(
      "Machine token authentication requires either a Machine secret key or a Clerk secret key. Ensure a Clerk secret key or Machine secret key is set."
    );
  }
}
__name(assertMachineSecretOrSecretKey, "assertMachineSecretOrSecretKey");
__name2(assertMachineSecretOrSecretKey, "assertMachineSecretOrSecretKey");
function isRequestEligibleForRefresh(err, authenticateContext, request) {
  return err.reason === TokenVerificationErrorReason.TokenExpired && !!authenticateContext.refreshTokenInCookie && request.method === "GET";
}
__name(isRequestEligibleForRefresh, "isRequestEligibleForRefresh");
__name2(isRequestEligibleForRefresh, "isRequestEligibleForRefresh");
function checkTokenTypeMismatch(parsedTokenType, acceptsToken, authenticateContext) {
  const mismatch = !isTokenTypeAccepted(parsedTokenType, acceptsToken);
  if (mismatch) {
    const tokenTypeToReturn = typeof acceptsToken === "string" ? acceptsToken : parsedTokenType;
    return signedOut({
      tokenType: tokenTypeToReturn,
      authenticateContext,
      reason: AuthErrorReason.TokenTypeMismatch
    });
  }
  return null;
}
__name(checkTokenTypeMismatch, "checkTokenTypeMismatch");
__name2(checkTokenTypeMismatch, "checkTokenTypeMismatch");
function isTokenTypeInAcceptedArray(acceptsToken, authenticateContext) {
  let parsedTokenType = null;
  const { tokenInHeader } = authenticateContext;
  if (tokenInHeader) {
    if (isMachineToken(tokenInHeader)) {
      parsedTokenType = getMachineTokenType(tokenInHeader);
    } else {
      parsedTokenType = TokenType.SessionToken;
    }
  }
  const typeToCheck = parsedTokenType ?? TokenType.SessionToken;
  return isTokenTypeAccepted(typeToCheck, acceptsToken);
}
__name(isTokenTypeInAcceptedArray, "isTokenTypeInAcceptedArray");
__name2(isTokenTypeInAcceptedArray, "isTokenTypeInAcceptedArray");
var authenticateRequest = /* @__PURE__ */ __name2((async (request, options) => {
  const authenticateContext = await createAuthenticateContext(createClerkRequest(request), options);
  const acceptsToken = options.acceptsToken ?? TokenType.SessionToken;
  if (acceptsToken !== TokenType.M2MToken) {
    assertValidSecretKey(authenticateContext.secretKey);
    if (authenticateContext.isSatellite) {
      assertSignInUrlExists(authenticateContext.signInUrl, authenticateContext.secretKey);
      if (authenticateContext.signInUrl && authenticateContext.origin) {
        assertSignInUrlFormatAndOrigin(authenticateContext.signInUrl, authenticateContext.origin);
      }
      assertProxyUrlOrDomain(authenticateContext.proxyUrl || authenticateContext.domain);
    }
  }
  if (acceptsToken === TokenType.M2MToken) {
    assertMachineSecretOrSecretKey(authenticateContext);
  }
  const organizationMatcher = new OrganizationMatcher(options.organizationSyncOptions);
  const handshakeService = new HandshakeService(
    authenticateContext,
    { organizationSyncOptions: options.organizationSyncOptions },
    organizationMatcher
  );
  async function refreshToken(authenticateContext2) {
    if (!options.apiClient) {
      return {
        data: null,
        error: {
          message: "An apiClient is needed to perform token refresh.",
          cause: { reason: RefreshTokenErrorReason.MissingApiClient }
        }
      };
    }
    const { sessionToken: expiredSessionToken, refreshTokenInCookie: refreshToken2 } = authenticateContext2;
    if (!expiredSessionToken) {
      return {
        data: null,
        error: {
          message: "Session token must be provided.",
          cause: { reason: RefreshTokenErrorReason.MissingSessionToken }
        }
      };
    }
    if (!refreshToken2) {
      return {
        data: null,
        error: {
          message: "Refresh token must be provided.",
          cause: { reason: RefreshTokenErrorReason.MissingRefreshToken }
        }
      };
    }
    const { data: decodeResult, errors: decodedErrors } = decodeJwt(expiredSessionToken);
    if (!decodeResult || decodedErrors) {
      return {
        data: null,
        error: {
          message: "Unable to decode the expired session token.",
          cause: { reason: RefreshTokenErrorReason.ExpiredSessionTokenDecodeFailed, errors: decodedErrors }
        }
      };
    }
    if (!decodeResult?.payload?.sid) {
      return {
        data: null,
        error: {
          message: "Expired session token is missing the `sid` claim.",
          cause: { reason: RefreshTokenErrorReason.ExpiredSessionTokenMissingSidClaim }
        }
      };
    }
    try {
      const response = await options.apiClient.sessions.refreshSession(decodeResult.payload.sid, {
        format: "cookie",
        suffixed_cookies: authenticateContext2.usesSuffixedCookies(),
        expired_token: expiredSessionToken || "",
        refresh_token: refreshToken2 || "",
        request_origin: authenticateContext2.clerkUrl.origin,
        // The refresh endpoint expects headers as Record<string, string[]>, so we need to transform it.
        request_headers: Object.fromEntries(Array.from(request.headers.entries()).map(([k, v2]) => [k, [v2]]))
      });
      return { data: response.cookies, error: null };
    } catch (err) {
      if (err?.errors?.length) {
        if (err.errors[0].code === "unexpected_error") {
          return {
            data: null,
            error: {
              message: `Fetch unexpected error`,
              cause: { reason: RefreshTokenErrorReason.FetchError, errors: err.errors }
            }
          };
        }
        return {
          data: null,
          error: {
            message: err.errors[0].code,
            cause: { reason: err.errors[0].code, errors: err.errors }
          }
        };
      } else {
        return {
          data: null,
          error: {
            message: `Unexpected Server/BAPI error`,
            cause: { reason: RefreshTokenErrorReason.UnexpectedBAPIError, errors: [err] }
          }
        };
      }
    }
  }
  __name(refreshToken, "refreshToken");
  __name2(refreshToken, "refreshToken");
  async function attemptRefresh(authenticateContext2) {
    const { data: cookiesToSet, error } = await refreshToken(authenticateContext2);
    if (!cookiesToSet || cookiesToSet.length === 0) {
      return { data: null, error };
    }
    const headers = new Headers();
    let sessionToken = "";
    cookiesToSet.forEach((x2) => {
      headers.append("Set-Cookie", x2);
      if (getCookieName(x2).startsWith(constants.Cookies.Session)) {
        sessionToken = getCookieValue(x2);
      }
    });
    const { data: jwtPayload, errors } = await verifyToken(sessionToken, authenticateContext2);
    if (errors) {
      return {
        data: null,
        error: {
          message: `Clerk: unable to verify refreshed session token.`,
          cause: { reason: RefreshTokenErrorReason.InvalidSessionToken, errors }
        }
      };
    }
    return { data: { jwtPayload, sessionToken, headers }, error: null };
  }
  __name(attemptRefresh, "attemptRefresh");
  __name2(attemptRefresh, "attemptRefresh");
  function handleMaybeHandshakeStatus(authenticateContext2, reason, message, headers) {
    if (!handshakeService.isRequestEligibleForHandshake()) {
      return signedOut({
        tokenType: TokenType.SessionToken,
        authenticateContext: authenticateContext2,
        reason,
        message
      });
    }
    const handshakeHeaders = headers ?? handshakeService.buildRedirectToHandshake(reason);
    if (handshakeHeaders.get(constants.Headers.Location)) {
      handshakeHeaders.set(constants.Headers.CacheControl, "no-store");
    }
    const isRedirectLoop = handshakeService.checkAndTrackRedirectLoop(handshakeHeaders);
    if (isRedirectLoop) {
      const msg = `Clerk: Refreshing the session token resulted in an infinite redirect loop. This usually means that your Clerk instance keys do not match - make sure to copy the correct publishable and secret keys from the Clerk dashboard.`;
      console.log(msg);
      return signedOut({
        tokenType: TokenType.SessionToken,
        authenticateContext: authenticateContext2,
        reason,
        message
      });
    }
    return handshake(authenticateContext2, reason, message, handshakeHeaders);
  }
  __name(handleMaybeHandshakeStatus, "handleMaybeHandshakeStatus");
  __name2(handleMaybeHandshakeStatus, "handleMaybeHandshakeStatus");
  function handleMaybeOrganizationSyncHandshake(authenticateContext2, auth) {
    const organizationSyncTarget = organizationMatcher.findTarget(authenticateContext2.clerkUrl);
    if (!organizationSyncTarget) {
      return null;
    }
    let mustActivate = false;
    if (organizationSyncTarget.type === "organization") {
      if (organizationSyncTarget.organizationSlug && organizationSyncTarget.organizationSlug !== auth.orgSlug) {
        mustActivate = true;
      }
      if (organizationSyncTarget.organizationId && organizationSyncTarget.organizationId !== auth.orgId) {
        mustActivate = true;
      }
    }
    if (organizationSyncTarget.type === "personalAccount" && auth.orgId) {
      mustActivate = true;
    }
    if (!mustActivate) {
      return null;
    }
    if (authenticateContext2.handshakeRedirectLoopCounter >= 3) {
      console.warn(
        "Clerk: Organization activation handshake loop detected. This is likely due to an invalid organization ID or slug. Skipping organization activation."
      );
      return null;
    }
    const handshakeState = handleMaybeHandshakeStatus(
      authenticateContext2,
      AuthErrorReason.ActiveOrganizationMismatch,
      ""
    );
    if (handshakeState.status !== "handshake") {
      return null;
    }
    return handshakeState;
  }
  __name(handleMaybeOrganizationSyncHandshake, "handleMaybeOrganizationSyncHandshake");
  __name2(handleMaybeOrganizationSyncHandshake, "handleMaybeOrganizationSyncHandshake");
  async function authenticateRequestWithTokenInHeader() {
    const { tokenInHeader } = authenticateContext;
    if (isMachineJwt(tokenInHeader)) {
      return signedOut({
        tokenType: TokenType.SessionToken,
        authenticateContext,
        reason: AuthErrorReason.TokenTypeMismatch,
        message: ""
      });
    }
    try {
      const { data, errors } = await verifyToken(tokenInHeader, authenticateContext);
      if (errors) {
        throw errors[0];
      }
      return signedIn({
        tokenType: TokenType.SessionToken,
        authenticateContext,
        sessionClaims: data,
        headers: new Headers(),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        token: tokenInHeader
      });
    } catch (err) {
      return handleSessionTokenError(err, "header");
    }
  }
  __name(authenticateRequestWithTokenInHeader, "authenticateRequestWithTokenInHeader");
  __name2(authenticateRequestWithTokenInHeader, "authenticateRequestWithTokenInHeader");
  async function authenticateRequestWithTokenInCookie() {
    const hasActiveClient = authenticateContext.clientUat;
    const hasSessionToken = !!authenticateContext.sessionTokenInCookie;
    const hasDevBrowserToken = !!authenticateContext.devBrowserToken;
    if (authenticateContext.handshakeNonce || authenticateContext.handshakeToken) {
      try {
        return await handshakeService.resolveHandshake();
      } catch (error) {
        if (error instanceof TokenVerificationError && authenticateContext.instanceType === "development") {
          handshakeService.handleTokenVerificationErrorInDevelopment(error);
        } else {
          console.error("Clerk: unable to resolve handshake:", error);
        }
      }
    }
    const isRequestEligibleForMultiDomainSync = authenticateContext.isSatellite && authenticateContext.secFetchDest === "document";
    if (authenticateContext.instanceType === "production" && isRequestEligibleForMultiDomainSync) {
      return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.SatelliteCookieNeedsSyncing, "");
    }
    if (authenticateContext.instanceType === "development" && isRequestEligibleForMultiDomainSync && !authenticateContext.clerkUrl.searchParams.has(constants.QueryParameters.ClerkSynced)) {
      const redirectURL = new URL(authenticateContext.signInUrl);
      redirectURL.searchParams.append(
        constants.QueryParameters.ClerkRedirectUrl,
        authenticateContext.clerkUrl.toString()
      );
      const headers = new Headers({ [constants.Headers.Location]: redirectURL.toString() });
      return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.SatelliteCookieNeedsSyncing, "", headers);
    }
    const redirectUrl = new URL(authenticateContext.clerkUrl).searchParams.get(
      constants.QueryParameters.ClerkRedirectUrl
    );
    if (authenticateContext.instanceType === "development" && !authenticateContext.isSatellite && redirectUrl) {
      const redirectBackToSatelliteUrl = new URL(redirectUrl);
      if (authenticateContext.devBrowserToken) {
        redirectBackToSatelliteUrl.searchParams.append(
          constants.QueryParameters.DevBrowser,
          authenticateContext.devBrowserToken
        );
      }
      redirectBackToSatelliteUrl.searchParams.append(constants.QueryParameters.ClerkSynced, "true");
      const headers = new Headers({ [constants.Headers.Location]: redirectBackToSatelliteUrl.toString() });
      return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.PrimaryRespondsToSyncing, "", headers);
    }
    if (authenticateContext.instanceType === "development" && authenticateContext.clerkUrl.searchParams.has(constants.QueryParameters.DevBrowser)) {
      return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.DevBrowserSync, "");
    }
    if (authenticateContext.instanceType === "development" && !hasDevBrowserToken) {
      return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.DevBrowserMissing, "");
    }
    if (!hasActiveClient && !hasSessionToken) {
      return signedOut({
        tokenType: TokenType.SessionToken,
        authenticateContext,
        reason: AuthErrorReason.SessionTokenAndUATMissing
      });
    }
    if (!hasActiveClient && hasSessionToken) {
      return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.SessionTokenWithoutClientUAT, "");
    }
    if (hasActiveClient && !hasSessionToken) {
      return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.ClientUATWithoutSessionToken, "");
    }
    const { data: decodeResult, errors: decodedErrors } = decodeJwt(authenticateContext.sessionTokenInCookie);
    if (decodedErrors) {
      return handleSessionTokenError(decodedErrors[0], "cookie");
    }
    if (decodeResult.payload.iat < authenticateContext.clientUat) {
      return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.SessionTokenIATBeforeClientUAT, "");
    }
    try {
      const { data, errors } = await verifyToken(authenticateContext.sessionTokenInCookie, authenticateContext);
      if (errors) {
        throw errors[0];
      }
      const signedInRequestState = signedIn({
        tokenType: TokenType.SessionToken,
        authenticateContext,
        sessionClaims: data,
        headers: new Headers(),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        token: authenticateContext.sessionTokenInCookie
      });
      const shouldForceHandshakeForCrossDomain = !authenticateContext.isSatellite && // We're on primary
      authenticateContext.secFetchDest === "document" && // Document navigation
      authenticateContext.isCrossOriginReferrer() && // Came from different domain
      !authenticateContext.isKnownClerkReferrer() && // Not from Clerk accounts portal or FAPI
      authenticateContext.handshakeRedirectLoopCounter === 0;
      if (shouldForceHandshakeForCrossDomain) {
        return handleMaybeHandshakeStatus(
          authenticateContext,
          AuthErrorReason.PrimaryDomainCrossOriginSync,
          "Cross-origin request from satellite domain requires handshake"
        );
      }
      const authObject = signedInRequestState.toAuth();
      if (authObject.userId) {
        const handshakeRequestState = handleMaybeOrganizationSyncHandshake(authenticateContext, authObject);
        if (handshakeRequestState) {
          return handshakeRequestState;
        }
      }
      return signedInRequestState;
    } catch (err) {
      return handleSessionTokenError(err, "cookie");
    }
    return signedOut({
      tokenType: TokenType.SessionToken,
      authenticateContext,
      reason: AuthErrorReason.UnexpectedError
    });
  }
  __name(authenticateRequestWithTokenInCookie, "authenticateRequestWithTokenInCookie");
  __name2(authenticateRequestWithTokenInCookie, "authenticateRequestWithTokenInCookie");
  async function handleSessionTokenError(err, tokenCarrier) {
    if (!(err instanceof TokenVerificationError)) {
      return signedOut({
        tokenType: TokenType.SessionToken,
        authenticateContext,
        reason: AuthErrorReason.UnexpectedError
      });
    }
    let refreshError;
    if (isRequestEligibleForRefresh(err, authenticateContext, request)) {
      const { data, error } = await attemptRefresh(authenticateContext);
      if (data) {
        return signedIn({
          tokenType: TokenType.SessionToken,
          authenticateContext,
          sessionClaims: data.jwtPayload,
          headers: data.headers,
          token: data.sessionToken
        });
      }
      if (error?.cause?.reason) {
        refreshError = error.cause.reason;
      } else {
        refreshError = RefreshTokenErrorReason.UnexpectedSDKError;
      }
    } else {
      if (request.method !== "GET") {
        refreshError = RefreshTokenErrorReason.NonEligibleNonGet;
      } else if (!authenticateContext.refreshTokenInCookie) {
        refreshError = RefreshTokenErrorReason.NonEligibleNoCookie;
      } else {
        refreshError = null;
      }
    }
    err.tokenCarrier = tokenCarrier;
    const reasonToHandshake = [
      TokenVerificationErrorReason.TokenExpired,
      TokenVerificationErrorReason.TokenNotActiveYet,
      TokenVerificationErrorReason.TokenIatInTheFuture
    ].includes(err.reason);
    if (reasonToHandshake) {
      return handleMaybeHandshakeStatus(
        authenticateContext,
        convertTokenVerificationErrorReasonToAuthErrorReason({ tokenError: err.reason, refreshError }),
        err.getFullMessage()
      );
    }
    return signedOut({
      tokenType: TokenType.SessionToken,
      authenticateContext,
      reason: err.reason,
      message: err.getFullMessage()
    });
  }
  __name(handleSessionTokenError, "handleSessionTokenError");
  __name2(handleSessionTokenError, "handleSessionTokenError");
  function handleMachineError(tokenType, err) {
    if (!(err instanceof MachineTokenVerificationError)) {
      return signedOut({
        tokenType,
        authenticateContext,
        reason: AuthErrorReason.UnexpectedError
      });
    }
    return signedOut({
      tokenType,
      authenticateContext,
      reason: err.code,
      message: err.getFullMessage()
    });
  }
  __name(handleMachineError, "handleMachineError");
  __name2(handleMachineError, "handleMachineError");
  async function authenticateMachineRequestWithTokenInHeader() {
    const { tokenInHeader } = authenticateContext;
    if (!tokenInHeader) {
      return handleSessionTokenError(new Error("Missing token in header"), "header");
    }
    if (!isMachineToken(tokenInHeader)) {
      return signedOut({
        tokenType: acceptsToken,
        authenticateContext,
        reason: AuthErrorReason.TokenTypeMismatch,
        message: ""
      });
    }
    const parsedTokenType = getMachineTokenType(tokenInHeader);
    const mismatchState = checkTokenTypeMismatch(parsedTokenType, acceptsToken, authenticateContext);
    if (mismatchState) {
      return mismatchState;
    }
    const { data, tokenType, errors } = await verifyMachineAuthToken(tokenInHeader, authenticateContext);
    if (errors) {
      return handleMachineError(tokenType, errors[0]);
    }
    return signedIn({
      tokenType,
      authenticateContext,
      machineData: data,
      token: tokenInHeader
    });
  }
  __name(authenticateMachineRequestWithTokenInHeader, "authenticateMachineRequestWithTokenInHeader");
  __name2(authenticateMachineRequestWithTokenInHeader, "authenticateMachineRequestWithTokenInHeader");
  async function authenticateAnyRequestWithTokenInHeader() {
    const { tokenInHeader } = authenticateContext;
    if (!tokenInHeader) {
      return handleSessionTokenError(new Error("Missing token in header"), "header");
    }
    if (isMachineToken(tokenInHeader)) {
      const parsedTokenType = getMachineTokenType(tokenInHeader);
      const mismatchState = checkTokenTypeMismatch(parsedTokenType, acceptsToken, authenticateContext);
      if (mismatchState) {
        return mismatchState;
      }
      const { data: data2, tokenType, errors: errors2 } = await verifyMachineAuthToken(tokenInHeader, authenticateContext);
      if (errors2) {
        return handleMachineError(tokenType, errors2[0]);
      }
      return signedIn({
        tokenType,
        authenticateContext,
        machineData: data2,
        token: tokenInHeader
      });
    }
    const { data, errors } = await verifyToken(tokenInHeader, authenticateContext);
    if (errors) {
      return handleSessionTokenError(errors[0], "header");
    }
    return signedIn({
      tokenType: TokenType.SessionToken,
      authenticateContext,
      sessionClaims: data,
      token: tokenInHeader
    });
  }
  __name(authenticateAnyRequestWithTokenInHeader, "authenticateAnyRequestWithTokenInHeader");
  __name2(authenticateAnyRequestWithTokenInHeader, "authenticateAnyRequestWithTokenInHeader");
  if (Array.isArray(acceptsToken)) {
    if (!isTokenTypeInAcceptedArray(acceptsToken, authenticateContext)) {
      return signedOutInvalidToken();
    }
  }
  if (authenticateContext.tokenInHeader) {
    if (acceptsToken === "any" || Array.isArray(acceptsToken)) {
      return authenticateAnyRequestWithTokenInHeader();
    }
    if (acceptsToken === TokenType.SessionToken) {
      return authenticateRequestWithTokenInHeader();
    }
    return authenticateMachineRequestWithTokenInHeader();
  }
  if (acceptsToken === TokenType.OAuthToken || acceptsToken === TokenType.ApiKey || acceptsToken === TokenType.M2MToken) {
    return signedOut({
      tokenType: acceptsToken,
      authenticateContext,
      reason: "No token in header"
    });
  }
  return authenticateRequestWithTokenInCookie();
}), "authenticateRequest");
var debugRequestState = /* @__PURE__ */ __name2((params) => {
  const { isSignedIn, isAuthenticated, proxyUrl, reason, message, publishableKey, isSatellite, domain } = params;
  return { isSignedIn, isAuthenticated, proxyUrl, reason, message, publishableKey, isSatellite, domain };
}, "debugRequestState");
var convertTokenVerificationErrorReasonToAuthErrorReason = /* @__PURE__ */ __name2(({
  tokenError,
  refreshError
}) => {
  switch (tokenError) {
    case TokenVerificationErrorReason.TokenExpired:
      return `${AuthErrorReason.SessionTokenExpired}-refresh-${refreshError}`;
    case TokenVerificationErrorReason.TokenNotActiveYet:
      return AuthErrorReason.SessionTokenNBF;
    case TokenVerificationErrorReason.TokenIatInTheFuture:
      return AuthErrorReason.SessionTokenIatInTheFuture;
    default:
      return AuthErrorReason.UnexpectedError;
  }
}, "convertTokenVerificationErrorReasonToAuthErrorReason");
var defaultOptions2 = {
  secretKey: "",
  machineSecretKey: "",
  jwtKey: "",
  apiUrl: void 0,
  apiVersion: void 0,
  proxyUrl: "",
  publishableKey: "",
  isSatellite: false,
  domain: "",
  audience: ""
};
function createAuthenticateRequest(params) {
  const buildTimeOptions = mergePreDefinedOptions(defaultOptions2, params.options);
  const apiClient = params.apiClient;
  const authenticateRequest2 = /* @__PURE__ */ __name2((request, options = {}) => {
    const { apiUrl, apiVersion } = buildTimeOptions;
    const runTimeOptions = mergePreDefinedOptions(buildTimeOptions, options);
    return authenticateRequest(request, {
      ...options,
      ...runTimeOptions,
      // We should add all the omitted props from options here (eg apiUrl / apiVersion)
      // to avoid runtime options override them.
      apiUrl,
      apiVersion,
      apiClient
    });
  }, "authenticateRequest2");
  return {
    authenticateRequest: authenticateRequest2,
    debugRequestState
  };
}
__name(createAuthenticateRequest, "createAuthenticateRequest");
__name2(createAuthenticateRequest, "createAuthenticateRequest");
function withLegacyReturn(cb) {
  return async (...args) => {
    const { data, errors } = await cb(...args);
    if (errors) {
      throw errors[0];
    }
    return data;
  };
}
__name(withLegacyReturn, "withLegacyReturn");
__name2(withLegacyReturn, "withLegacyReturn");
function snakeToCamel(str) {
  return str ? str.replace(/([-_][a-z])/g, (match4) => match4.toUpperCase().replace(/-|_/, "")) : "";
}
__name(snakeToCamel, "snakeToCamel");
__name2(snakeToCamel, "snakeToCamel");
function camelToSnake(str) {
  return str ? str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`) : "";
}
__name(camelToSnake, "camelToSnake");
__name2(camelToSnake, "camelToSnake");
var createDeepObjectTransformer = /* @__PURE__ */ __name2((transform) => {
  const deepTransform = /* @__PURE__ */ __name2((obj) => {
    if (!obj) return obj;
    if (Array.isArray(obj)) return obj.map((el) => {
      if (typeof el === "object" || Array.isArray(el)) return deepTransform(el);
      return el;
    });
    const copy = { ...obj };
    const keys = Object.keys(copy);
    for (const oldName of keys) {
      const newName = transform(oldName.toString());
      if (newName !== oldName) {
        copy[newName] = copy[oldName];
        delete copy[oldName];
      }
      if (typeof copy[newName] === "object") copy[newName] = deepTransform(copy[newName]);
    }
    return copy;
  }, "deepTransform");
  return deepTransform;
}, "createDeepObjectTransformer");
var deepCamelToSnake = createDeepObjectTransformer(camelToSnake);
var deepSnakeToCamel = createDeepObjectTransformer(snakeToCamel);
function isTruthy(value) {
  if (typeof value === `boolean`) return value;
  if (value === void 0 || value === null) return false;
  if (typeof value === `string`) {
    if (value.toLowerCase() === `true`) return true;
    if (value.toLowerCase() === `false`) return false;
  }
  const number = parseInt(value, 10);
  if (isNaN(number)) return false;
  if (number > 0) return true;
  return false;
}
__name(isTruthy, "isTruthy");
__name2(isTruthy, "isTruthy");
var DEFAULT_CACHE_TTL_MS = 864e5;
var TelemetryEventThrottler = class {
  static {
    __name(this, "TelemetryEventThrottler");
  }
  static {
    __name2(this, "TelemetryEventThrottler");
  }
  #cache;
  #cacheTtl = DEFAULT_CACHE_TTL_MS;
  constructor(cache2) {
    this.#cache = cache2;
  }
  isEventThrottled(payload) {
    const now = Date.now();
    const key = this.#generateKey(payload);
    const entry = this.#cache.getItem(key);
    if (!entry) {
      this.#cache.setItem(key, now);
      return false;
    }
    if (now - entry > this.#cacheTtl) {
      this.#cache.setItem(key, now);
      return false;
    }
    return true;
  }
  /**
  * Generates a consistent unique key for telemetry events by sorting payload properties.
  * This ensures that payloads with identical content in different orders produce the same key.
  */
  #generateKey(event) {
    const { sk: _sk, pk: _pk, payload, ...rest } = event;
    const sanitizedEvent = {
      ...payload,
      ...rest
    };
    return JSON.stringify(Object.keys({
      ...payload,
      ...rest
    }).sort().map((key) => sanitizedEvent[key]));
  }
};
var LocalStorageThrottlerCache = class {
  static {
    __name(this, "LocalStorageThrottlerCache");
  }
  static {
    __name2(this, "LocalStorageThrottlerCache");
  }
  #storageKey = "clerk_telemetry_throttler";
  getItem(key) {
    return this.#getCache()[key];
  }
  setItem(key, value) {
    try {
      const cache2 = this.#getCache();
      cache2[key] = value;
      localStorage.setItem(this.#storageKey, JSON.stringify(cache2));
    } catch (err) {
      if (err instanceof DOMException && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED") && localStorage.length > 0) localStorage.removeItem(this.#storageKey);
    }
  }
  removeItem(key) {
    try {
      const cache2 = this.#getCache();
      delete cache2[key];
      localStorage.setItem(this.#storageKey, JSON.stringify(cache2));
    } catch {
    }
  }
  #getCache() {
    try {
      const cacheString = localStorage.getItem(this.#storageKey);
      if (!cacheString) return {};
      return JSON.parse(cacheString);
    } catch {
      return {};
    }
  }
  static isSupported() {
    return typeof window !== "undefined" && !!window.localStorage;
  }
};
var InMemoryThrottlerCache = class {
  static {
    __name(this, "InMemoryThrottlerCache");
  }
  static {
    __name2(this, "InMemoryThrottlerCache");
  }
  #cache = /* @__PURE__ */ new Map();
  #maxSize = 1e4;
  getItem(key) {
    if (this.#cache.size > this.#maxSize) {
      this.#cache.clear();
      return;
    }
    return this.#cache.get(key);
  }
  setItem(key, value) {
    this.#cache.set(key, value);
  }
  removeItem(key) {
    this.#cache.delete(key);
  }
};
function isWindowClerkWithMetadata(clerk) {
  return typeof clerk === "object" && clerk !== null && "constructor" in clerk && typeof clerk.constructor === "function";
}
__name(isWindowClerkWithMetadata, "isWindowClerkWithMetadata");
__name2(isWindowClerkWithMetadata, "isWindowClerkWithMetadata");
var VALID_LOG_LEVELS = /* @__PURE__ */ new Set([
  "error",
  "warn",
  "info",
  "debug",
  "trace"
]);
var DEFAULT_CONFIG = {
  samplingRate: 1,
  maxBufferSize: 5,
  endpoint: "https://clerk-telemetry.com"
};
var TelemetryCollector = class {
  static {
    __name(this, "TelemetryCollector");
  }
  static {
    __name2(this, "TelemetryCollector");
  }
  #config;
  #eventThrottler;
  #metadata = {};
  #buffer = [];
  #pendingFlush = null;
  constructor(options) {
    this.#config = {
      maxBufferSize: options.maxBufferSize ?? DEFAULT_CONFIG.maxBufferSize,
      samplingRate: options.samplingRate ?? DEFAULT_CONFIG.samplingRate,
      perEventSampling: options.perEventSampling ?? true,
      disabled: options.disabled ?? false,
      debug: options.debug ?? false,
      endpoint: DEFAULT_CONFIG.endpoint
    };
    if (!options.clerkVersion && typeof window === "undefined") this.#metadata.clerkVersion = "";
    else this.#metadata.clerkVersion = options.clerkVersion ?? "";
    this.#metadata.sdk = options.sdk;
    this.#metadata.sdkVersion = options.sdkVersion;
    this.#metadata.publishableKey = options.publishableKey ?? "";
    const parsedKey = parsePublishableKey(options.publishableKey);
    if (parsedKey) this.#metadata.instanceType = parsedKey.instanceType;
    if (options.secretKey) this.#metadata.secretKey = options.secretKey.substring(0, 16);
    this.#eventThrottler = new TelemetryEventThrottler(LocalStorageThrottlerCache.isSupported() ? new LocalStorageThrottlerCache() : new InMemoryThrottlerCache());
  }
  get isEnabled() {
    if (this.#metadata.instanceType !== "development") return false;
    if (this.#config.disabled || typeof process !== "undefined" && process.env && isTruthy(process.env.CLERK_TELEMETRY_DISABLED)) return false;
    if (typeof window !== "undefined" && !!window?.navigator?.webdriver) return false;
    return true;
  }
  get isDebug() {
    return this.#config.debug || typeof process !== "undefined" && process.env && isTruthy(process.env.CLERK_TELEMETRY_DEBUG);
  }
  record(event) {
    try {
      const preparedPayload = this.#preparePayload(event.event, event.payload);
      this.#logEvent(preparedPayload.event, preparedPayload);
      if (!this.#shouldRecord(preparedPayload, event.eventSamplingRate)) return;
      this.#buffer.push({
        kind: "event",
        value: preparedPayload
      });
      this.#scheduleFlush();
    } catch (error) {
      console.error("[clerk/telemetry] Error recording telemetry event", error);
    }
  }
  /**
  * Records a telemetry log entry if logging is enabled and not in debug mode.
  *
  * @param entry - The telemetry log entry to record.
  */
  recordLog(entry) {
    try {
      if (!this.#shouldRecordLog(entry)) return;
      const levelIsValid = typeof entry?.level === "string" && VALID_LOG_LEVELS.has(entry.level);
      const messageIsValid = typeof entry?.message === "string" && entry.message.trim().length > 0;
      let normalizedTimestamp = null;
      const timestampInput = entry?.timestamp;
      if (typeof timestampInput === "number" || typeof timestampInput === "string") {
        const candidate = new Date(timestampInput);
        if (!Number.isNaN(candidate.getTime())) normalizedTimestamp = candidate;
      }
      if (!levelIsValid || !messageIsValid || normalizedTimestamp === null) {
        if (this.isDebug && typeof console !== "undefined") console.warn("[clerk/telemetry] Dropping invalid telemetry log entry", {
          levelIsValid,
          messageIsValid,
          timestampIsValid: normalizedTimestamp !== null
        });
        return;
      }
      const sdkMetadata = this.#getSDKMetadata();
      const logData = {
        sdk: sdkMetadata.name,
        sdkv: sdkMetadata.version,
        cv: this.#metadata.clerkVersion ?? "",
        lvl: entry.level,
        msg: entry.message,
        ts: normalizedTimestamp.toISOString(),
        pk: this.#metadata.publishableKey || null,
        payload: this.#sanitizeContext(entry.context)
      };
      this.#buffer.push({
        kind: "log",
        value: logData
      });
      this.#scheduleFlush();
    } catch (error) {
      console.error("[clerk/telemetry] Error recording telemetry log entry", error);
    }
  }
  #shouldRecord(preparedPayload, eventSamplingRate) {
    return this.isEnabled && !this.isDebug && this.#shouldBeSampled(preparedPayload, eventSamplingRate);
  }
  #shouldRecordLog(_entry) {
    return true;
  }
  #shouldBeSampled(preparedPayload, eventSamplingRate) {
    const randomSeed = Math.random();
    if (!(randomSeed <= this.#config.samplingRate && (this.#config.perEventSampling === false || typeof eventSamplingRate === "undefined" || randomSeed <= eventSamplingRate))) return false;
    return !this.#eventThrottler.isEventThrottled(preparedPayload);
  }
  #scheduleFlush() {
    if (typeof window === "undefined") {
      this.#flush();
      return;
    }
    if (this.#buffer.length >= this.#config.maxBufferSize) {
      if (this.#pendingFlush) if (typeof cancelIdleCallback !== "undefined") cancelIdleCallback(Number(this.#pendingFlush));
      else clearTimeout(Number(this.#pendingFlush));
      this.#flush();
      return;
    }
    if (this.#pendingFlush) return;
    if ("requestIdleCallback" in window) this.#pendingFlush = requestIdleCallback(() => {
      this.#flush();
      this.#pendingFlush = null;
    });
    else this.#pendingFlush = setTimeout(() => {
      this.#flush();
      this.#pendingFlush = null;
    }, 0);
  }
  #flush() {
    const itemsToSend = [...this.#buffer];
    this.#buffer = [];
    this.#pendingFlush = null;
    if (itemsToSend.length === 0) return;
    const eventsToSend = itemsToSend.filter((item) => item.kind === "event").map((item) => item.value);
    const logsToSend = itemsToSend.filter((item) => item.kind === "log").map((item) => item.value);
    if (eventsToSend.length > 0) {
      const eventsUrl = new URL("/v1/event", this.#config.endpoint);
      fetch(eventsUrl, {
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST",
        body: JSON.stringify({ events: eventsToSend })
      }).catch(() => void 0);
    }
    if (logsToSend.length > 0) {
      const logsUrl = new URL("/v1/logs", this.#config.endpoint);
      fetch(logsUrl, {
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST",
        body: JSON.stringify({ logs: logsToSend })
      }).catch(() => void 0);
    }
  }
  /**
  * If running in debug mode, log the event and its payload to the console.
  */
  #logEvent(event, payload) {
    if (!this.isDebug) return;
    if (typeof console.groupCollapsed !== "undefined") {
      console.groupCollapsed("[clerk/telemetry]", event);
      console.log(payload);
      console.groupEnd();
    } else console.log("[clerk/telemetry]", event, payload);
  }
  /**
  * If in browser, attempt to lazily grab the SDK metadata from the Clerk singleton, otherwise fallback to the initially passed in values.
  *
  * This is necessary because the sdkMetadata can be set by the host SDK after the TelemetryCollector is instantiated.
  */
  #getSDKMetadata() {
    const sdkMetadata = {
      name: this.#metadata.sdk,
      version: this.#metadata.sdkVersion
    };
    if (typeof window !== "undefined") {
      const windowWithClerk = window;
      if (windowWithClerk.Clerk) {
        const windowClerk = windowWithClerk.Clerk;
        if (isWindowClerkWithMetadata(windowClerk) && windowClerk.constructor.sdkMetadata) {
          const { name, version: version2 } = windowClerk.constructor.sdkMetadata;
          if (name !== void 0) sdkMetadata.name = name;
          if (version2 !== void 0) sdkMetadata.version = version2;
        }
      }
    }
    return sdkMetadata;
  }
  /**
  * Append relevant metadata from the Clerk singleton to the event payload.
  */
  #preparePayload(event, payload) {
    const sdkMetadata = this.#getSDKMetadata();
    return {
      event,
      cv: this.#metadata.clerkVersion ?? "",
      it: this.#metadata.instanceType ?? "",
      sdk: sdkMetadata.name,
      sdkv: sdkMetadata.version,
      ...this.#metadata.publishableKey ? { pk: this.#metadata.publishableKey } : {},
      ...this.#metadata.secretKey ? { sk: this.#metadata.secretKey } : {},
      payload
    };
  }
  /**
  * Best-effort sanitization of the context payload. Returns a plain object with JSON-serializable
  * values or null when the input is missing or not serializable. Arrays are not accepted.
  */
  #sanitizeContext(context) {
    if (context === null || typeof context === "undefined") return null;
    if (typeof context !== "object") return null;
    try {
      const cleaned = JSON.parse(JSON.stringify(context));
      if (cleaned && typeof cleaned === "object" && !Array.isArray(cleaned)) return cleaned;
      return null;
    } catch {
      return null;
    }
  }
};
var verifyToken2 = withLegacyReturn(verifyToken);
function createClerkClient(options) {
  const opts = { ...options };
  const apiClient = createBackendApiClient(opts);
  const requestState = createAuthenticateRequest({ options: opts, apiClient });
  const telemetry = new TelemetryCollector({
    publishableKey: opts.publishableKey,
    secretKey: opts.secretKey,
    samplingRate: 0.1,
    ...opts.sdkMetadata ? { sdk: opts.sdkMetadata.name, sdkVersion: opts.sdkMetadata.version } : {},
    ...opts.telemetry || {}
  });
  return {
    ...apiClient,
    ...requestState,
    telemetry
  };
}
__name(createClerkClient, "createClerkClient");
__name2(createClerkClient, "createClerkClient");
var env = /* @__PURE__ */ __name2((c, runtime2) => {
  const global2 = globalThis;
  const globalEnv = global2?.process?.env;
  runtime2 ??= getRuntimeKey();
  const runtimeEnvHandlers = {
    bun: /* @__PURE__ */ __name2(() => globalEnv, "bun"),
    node: /* @__PURE__ */ __name2(() => globalEnv, "node"),
    "edge-light": /* @__PURE__ */ __name2(() => globalEnv, "edge-light"),
    deno: /* @__PURE__ */ __name2(() => {
      return Deno.env.toObject();
    }, "deno"),
    workerd: /* @__PURE__ */ __name2(() => c.env, "workerd"),
    // On Fastly Compute, you can use the ConfigStore to manage user-defined data.
    fastly: /* @__PURE__ */ __name2(() => ({}), "fastly"),
    other: /* @__PURE__ */ __name2(() => ({}), "other")
  };
  return runtimeEnvHandlers[runtime2]();
}, "env");
var knownUserAgents = {
  deno: "Deno",
  bun: "Bun",
  workerd: "Cloudflare-Workers",
  node: "Node.js"
};
var getRuntimeKey = /* @__PURE__ */ __name2(() => {
  const global2 = globalThis;
  const userAgentSupported = typeof navigator !== "undefined" && true;
  if (userAgentSupported) {
    for (const [runtimeKey, userAgent] of Object.entries(knownUserAgents)) {
      if (checkUserAgentEquals(userAgent)) {
        return runtimeKey;
      }
    }
  }
  if (typeof global2?.EdgeRuntime === "string") {
    return "edge-light";
  }
  if (global2?.fastly !== void 0) {
    return "fastly";
  }
  if (global2?.process?.release?.name === "node") {
    return "node";
  }
  return "other";
}, "getRuntimeKey");
var checkUserAgentEquals = /* @__PURE__ */ __name2((platform) => {
  const userAgent = "Cloudflare-Workers";
  return userAgent.startsWith(platform);
}, "checkUserAgentEquals");
var getAuth = /* @__PURE__ */ __name2(((c, options) => {
  return c.get("clerkAuth")(options);
}), "getAuth");
var clerkMiddleware = /* @__PURE__ */ __name2((options) => {
  return async (c, next) => {
    const clerkEnv = env(c);
    const { secretKey, publishableKey, apiUrl, apiVersion, ...rest } = options || {
      secretKey: clerkEnv.CLERK_SECRET_KEY || "",
      publishableKey: clerkEnv.CLERK_PUBLISHABLE_KEY || "",
      apiUrl: clerkEnv.CLERK_API_URL,
      apiVersion: clerkEnv.CLERK_API_VERSION
    };
    if (!secretKey) throw new Error("Missing Clerk Secret key");
    if (!publishableKey) throw new Error("Missing Clerk Publishable key");
    const clerkClient = createClerkClient({
      ...rest,
      apiUrl,
      apiVersion,
      secretKey,
      publishableKey
    });
    const requestState = await clerkClient.authenticateRequest(c.req.raw, {
      ...rest,
      secretKey,
      publishableKey,
      acceptsToken: "any"
    });
    if (requestState.headers) {
      requestState.headers.forEach((value, key) => {
        c.res.headers.append(key, value);
      });
      const locationHeader = requestState.headers.get("location");
      if (locationHeader) return c.redirect(locationHeader, 307);
      else if (requestState.status === "handshake") throw new Error("Clerk: unexpected handshake without redirect");
    }
    const authObjectFn = /* @__PURE__ */ __name2(((options$1) => getAuthObjectForAcceptedToken({
      authObject: requestState.toAuth(options$1),
      acceptsToken: "any"
    })), "authObjectFn");
    c.set("clerkAuth", authObjectFn);
    c.set("clerk", clerkClient);
    await next();
  };
}, "clerkMiddleware");
var So = Object.create;
var Ie = Object.defineProperty;
var Eo = Object.getOwnPropertyDescriptor;
var Ao = Object.getOwnPropertyNames;
var Co = Object.getPrototypeOf;
var _o = Object.prototype.hasOwnProperty;
var Io = /* @__PURE__ */ __name2((r, e, t) => e in r ? Ie(r, e, { enumerable: true, configurable: true, writable: true, value: t }) : r[e] = t, "Io");
var a = /* @__PURE__ */ __name2((r, e) => Ie(r, "name", { value: e, configurable: true }), "a");
var G = /* @__PURE__ */ __name2((r, e) => () => (r && (e = r(r = 0)), e), "G");
var T = /* @__PURE__ */ __name2((r, e) => () => (e || r((e = { exports: {} }).exports, e), e.exports), "T");
var ie = /* @__PURE__ */ __name2((r, e) => {
  for (var t in e) Ie(r, t, {
    get: e[t],
    enumerable: true
  });
}, "ie");
var Dn = /* @__PURE__ */ __name2((r, e, t, n) => {
  if (e && typeof e == "object" || typeof e == "function") for (let i of Ao(e)) !_o.call(r, i) && i !== t && Ie(r, i, { get: /* @__PURE__ */ __name2(() => e[i], "get"), enumerable: !(n = Eo(e, i)) || n.enumerable });
  return r;
}, "Dn");
var Se = /* @__PURE__ */ __name2((r, e, t) => (t = r != null ? So(Co(r)) : {}, Dn(e || !r || !r.__esModule ? Ie(t, "default", { value: r, enumerable: true }) : t, r)), "Se");
var O = /* @__PURE__ */ __name2((r) => Dn(Ie({}, "__esModule", { value: true }), r), "O");
var E = /* @__PURE__ */ __name2((r, e, t) => Io(r, typeof e != "symbol" ? e + "" : e, t), "E");
var Qn = T((lt2) => {
  "use strict";
  p();
  lt2.byteLength = Po;
  lt2.toByteArray = Ro;
  lt2.fromByteArray = ko;
  var ae = [], te = [], To = typeof Uint8Array < "u" ? Uint8Array : Array, qt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (Ee = 0, On = qt.length; Ee < On; ++Ee) ae[Ee] = qt[Ee], te[qt.charCodeAt(Ee)] = Ee;
  var Ee, On;
  te[45] = 62;
  te[95] = 63;
  function qn(r) {
    var e = r.length;
    if (e % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
    var t = r.indexOf("=");
    t === -1 && (t = e);
    var n = t === e ? 0 : 4 - t % 4;
    return [t, n];
  }
  __name(qn, "qn");
  __name2(qn, "qn");
  a(qn, "getLens");
  function Po(r) {
    var e = qn(r), t = e[0], n = e[1];
    return (t + n) * 3 / 4 - n;
  }
  __name(Po, "Po");
  __name2(Po, "Po");
  a(Po, "byteLength");
  function Bo(r, e, t) {
    return (e + t) * 3 / 4 - t;
  }
  __name(Bo, "Bo");
  __name2(Bo, "Bo");
  a(Bo, "_byteLength");
  function Ro(r) {
    var e, t = qn(r), n = t[0], i = t[1], s2 = new To(Bo(r, n, i)), o = 0, u = i > 0 ? n - 4 : n, c;
    for (c = 0; c < u; c += 4) e = te[r.charCodeAt(c)] << 18 | te[r.charCodeAt(c + 1)] << 12 | te[r.charCodeAt(c + 2)] << 6 | te[r.charCodeAt(c + 3)], s2[o++] = e >> 16 & 255, s2[o++] = e >> 8 & 255, s2[o++] = e & 255;
    return i === 2 && (e = te[r.charCodeAt(
      c
    )] << 2 | te[r.charCodeAt(c + 1)] >> 4, s2[o++] = e & 255), i === 1 && (e = te[r.charCodeAt(c)] << 10 | te[r.charCodeAt(c + 1)] << 4 | te[r.charCodeAt(c + 2)] >> 2, s2[o++] = e >> 8 & 255, s2[o++] = e & 255), s2;
  }
  __name(Ro, "Ro");
  __name2(Ro, "Ro");
  a(Ro, "toByteArray");
  function Lo(r) {
    return ae[r >> 18 & 63] + ae[r >> 12 & 63] + ae[r >> 6 & 63] + ae[r & 63];
  }
  __name(Lo, "Lo");
  __name2(Lo, "Lo");
  a(Lo, "tripletToBase64");
  function Fo(r, e, t) {
    for (var n, i = [], s2 = e; s2 < t; s2 += 3) n = (r[s2] << 16 & 16711680) + (r[s2 + 1] << 8 & 65280) + (r[s2 + 2] & 255), i.push(Lo(n));
    return i.join("");
  }
  __name(Fo, "Fo");
  __name2(Fo, "Fo");
  a(Fo, "encodeChunk");
  function ko(r) {
    for (var e, t = r.length, n = t % 3, i = [], s2 = 16383, o = 0, u = t - n; o < u; o += s2) i.push(Fo(
      r,
      o,
      o + s2 > u ? u : o + s2
    ));
    return n === 1 ? (e = r[t - 1], i.push(ae[e >> 2] + ae[e << 4 & 63] + "==")) : n === 2 && (e = (r[t - 2] << 8) + r[t - 1], i.push(ae[e >> 10] + ae[e >> 4 & 63] + ae[e << 2 & 63] + "=")), i.join("");
  }
  __name(ko, "ko");
  __name2(ko, "ko");
  a(ko, "fromByteArray");
});
var Nn = T((Qt) => {
  p();
  Qt.read = function(r, e, t, n, i) {
    var s2, o, u = i * 8 - n - 1, c = (1 << u) - 1, l = c >> 1, f = -7, y = t ? i - 1 : 0, g = t ? -1 : 1, A = r[e + y];
    for (y += g, s2 = A & (1 << -f) - 1, A >>= -f, f += u; f > 0; s2 = s2 * 256 + r[e + y], y += g, f -= 8) ;
    for (o = s2 & (1 << -f) - 1, s2 >>= -f, f += n; f > 0; o = o * 256 + r[e + y], y += g, f -= 8) ;
    if (s2 === 0) s2 = 1 - l;
    else {
      if (s2 === c) return o ? NaN : (A ? -1 : 1) * (1 / 0);
      o = o + Math.pow(2, n), s2 = s2 - l;
    }
    return (A ? -1 : 1) * o * Math.pow(2, s2 - n);
  };
  Qt.write = function(r, e, t, n, i, s2) {
    var o, u, c, l = s2 * 8 - i - 1, f = (1 << l) - 1, y = f >> 1, g = i === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, A = n ? 0 : s2 - 1, C = n ? 1 : -1, D2 = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0;
    for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (u = isNaN(e) ? 1 : 0, o = f) : (o = Math.floor(Math.log(e) / Math.LN2), e * (c = Math.pow(2, -o)) < 1 && (o--, c *= 2), o + y >= 1 ? e += g / c : e += g * Math.pow(2, 1 - y), e * c >= 2 && (o++, c /= 2), o + y >= f ? (u = 0, o = f) : o + y >= 1 ? (u = (e * c - 1) * Math.pow(2, i), o = o + y) : (u = e * Math.pow(2, y - 1) * Math.pow(2, i), o = 0)); i >= 8; r[t + A] = u & 255, A += C, u /= 256, i -= 8) ;
    for (o = o << i | u, l += i; l > 0; r[t + A] = o & 255, A += C, o /= 256, l -= 8) ;
    r[t + A - C] |= D2 * 128;
  };
});
var ii = T((Re) => {
  "use strict";
  p();
  var Nt = Qn(), Pe = Nn(), Wn = typeof Symbol == "function" && typeof Symbol.for == "function" ? /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom") : null;
  Re.Buffer = h;
  Re.SlowBuffer = Qo;
  Re.INSPECT_MAX_BYTES = 50;
  var ft = 2147483647;
  Re.kMaxLength = ft;
  h.TYPED_ARRAY_SUPPORT = Mo();
  !h.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
  function Mo() {
    try {
      let r = new Uint8Array(1), e = { foo: a(function() {
        return 42;
      }, "foo") };
      return Object.setPrototypeOf(e, Uint8Array.prototype), Object.setPrototypeOf(r, e), r.foo() === 42;
    } catch {
      return false;
    }
  }
  __name(Mo, "Mo");
  __name2(Mo, "Mo");
  a(Mo, "typedArraySupport");
  Object.defineProperty(h.prototype, "parent", { enumerable: true, get: a(function() {
    if (h.isBuffer(this)) return this.buffer;
  }, "get") });
  Object.defineProperty(h.prototype, "offset", { enumerable: true, get: a(function() {
    if (h.isBuffer(
      this
    )) return this.byteOffset;
  }, "get") });
  function he(r) {
    if (r > ft) throw new RangeError('The value "' + r + '" is invalid for option "size"');
    let e = new Uint8Array(r);
    return Object.setPrototypeOf(e, h.prototype), e;
  }
  __name(he, "he");
  __name2(he, "he");
  a(he, "createBuffer");
  function h(r, e, t) {
    if (typeof r == "number") {
      if (typeof e == "string") throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      );
      return $t(r);
    }
    return Gn(r, e, t);
  }
  __name(h, "h");
  __name2(h, "h");
  a(h, "Buffer");
  h.poolSize = 8192;
  function Gn(r, e, t) {
    if (typeof r == "string") return Do(r, e);
    if (ArrayBuffer.isView(r)) return Oo(r);
    if (r == null) throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof r);
    if (ue(r, ArrayBuffer) || r && ue(r.buffer, ArrayBuffer) || typeof SharedArrayBuffer < "u" && (ue(r, SharedArrayBuffer) || r && ue(
      r.buffer,
      SharedArrayBuffer
    ))) return jt(r, e, t);
    if (typeof r == "number") throw new TypeError('The "value" argument must not be of type number. Received type number');
    let n = r.valueOf && r.valueOf();
    if (n != null && n !== r) return h.from(n, e, t);
    let i = qo(r);
    if (i) return i;
    if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof r[Symbol.toPrimitive] == "function") return h.from(r[Symbol.toPrimitive]("string"), e, t);
    throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof r);
  }
  __name(Gn, "Gn");
  __name2(Gn, "Gn");
  a(Gn, "from");
  h.from = function(r, e, t) {
    return Gn(r, e, t);
  };
  Object.setPrototypeOf(
    h.prototype,
    Uint8Array.prototype
  );
  Object.setPrototypeOf(h, Uint8Array);
  function Vn(r) {
    if (typeof r != "number") throw new TypeError(
      '"size" argument must be of type number'
    );
    if (r < 0) throw new RangeError('The value "' + r + '" is invalid for option "size"');
  }
  __name(Vn, "Vn");
  __name2(Vn, "Vn");
  a(Vn, "assertSize");
  function Uo(r, e, t) {
    return Vn(r), r <= 0 ? he(r) : e !== void 0 ? typeof t == "string" ? he(r).fill(e, t) : he(r).fill(e) : he(r);
  }
  __name(Uo, "Uo");
  __name2(Uo, "Uo");
  a(Uo, "alloc");
  h.alloc = function(r, e, t) {
    return Uo(r, e, t);
  };
  function $t(r) {
    return Vn(r), he(r < 0 ? 0 : Gt(r) | 0);
  }
  __name($t, "$t");
  __name2($t, "$t");
  a($t, "allocUnsafe");
  h.allocUnsafe = function(r) {
    return $t(
      r
    );
  };
  h.allocUnsafeSlow = function(r) {
    return $t(r);
  };
  function Do(r, e) {
    if ((typeof e != "string" || e === "") && (e = "utf8"), !h.isEncoding(e)) throw new TypeError("Unknown encoding: " + e);
    let t = zn(r, e) | 0, n = he(t), i = n.write(
      r,
      e
    );
    return i !== t && (n = n.slice(0, i)), n;
  }
  __name(Do, "Do");
  __name2(Do, "Do");
  a(Do, "fromString");
  function Wt(r) {
    let e = r.length < 0 ? 0 : Gt(r.length) | 0, t = he(e);
    for (let n = 0; n < e; n += 1) t[n] = r[n] & 255;
    return t;
  }
  __name(Wt, "Wt");
  __name2(Wt, "Wt");
  a(Wt, "fromArrayLike");
  function Oo(r) {
    if (ue(r, Uint8Array)) {
      let e = new Uint8Array(r);
      return jt(e.buffer, e.byteOffset, e.byteLength);
    }
    return Wt(r);
  }
  __name(Oo, "Oo");
  __name2(Oo, "Oo");
  a(Oo, "fromArrayView");
  function jt(r, e, t) {
    if (e < 0 || r.byteLength < e) throw new RangeError('"offset" is outside of buffer bounds');
    if (r.byteLength < e + (t || 0)) throw new RangeError('"length" is outside of buffer bounds');
    let n;
    return e === void 0 && t === void 0 ? n = new Uint8Array(r) : t === void 0 ? n = new Uint8Array(r, e) : n = new Uint8Array(
      r,
      e,
      t
    ), Object.setPrototypeOf(n, h.prototype), n;
  }
  __name(jt, "jt");
  __name2(jt, "jt");
  a(jt, "fromArrayBuffer");
  function qo(r) {
    if (h.isBuffer(r)) {
      let e = Gt(r.length) | 0, t = he(e);
      return t.length === 0 || r.copy(t, 0, 0, e), t;
    }
    if (r.length !== void 0) return typeof r.length != "number" || zt(r.length) ? he(0) : Wt(r);
    if (r.type === "Buffer" && Array.isArray(r.data)) return Wt(r.data);
  }
  __name(qo, "qo");
  __name2(qo, "qo");
  a(qo, "fromObject");
  function Gt(r) {
    if (r >= ft) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + ft.toString(16) + " bytes");
    return r | 0;
  }
  __name(Gt, "Gt");
  __name2(Gt, "Gt");
  a(Gt, "checked");
  function Qo(r) {
    return +r != r && (r = 0), h.alloc(+r);
  }
  __name(Qo, "Qo");
  __name2(Qo, "Qo");
  a(Qo, "SlowBuffer");
  h.isBuffer = a(function(e) {
    return e != null && e._isBuffer === true && e !== h.prototype;
  }, "isBuffer");
  h.compare = a(function(e, t) {
    if (ue(e, Uint8Array) && (e = h.from(e, e.offset, e.byteLength)), ue(t, Uint8Array) && (t = h.from(t, t.offset, t.byteLength)), !h.isBuffer(e) || !h.isBuffer(t)) throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    );
    if (e === t) return 0;
    let n = e.length, i = t.length;
    for (let s2 = 0, o = Math.min(n, i); s2 < o; ++s2) if (e[s2] !== t[s2]) {
      n = e[s2], i = t[s2];
      break;
    }
    return n < i ? -1 : i < n ? 1 : 0;
  }, "compare");
  h.isEncoding = a(function(e) {
    switch (String(e).toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "latin1":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return true;
      default:
        return false;
    }
  }, "isEncoding");
  h.concat = a(function(e, t) {
    if (!Array.isArray(e)) throw new TypeError(
      '"list" argument must be an Array of Buffers'
    );
    if (e.length === 0) return h.alloc(0);
    let n;
    if (t === void 0)
      for (t = 0, n = 0; n < e.length; ++n) t += e[n].length;
    let i = h.allocUnsafe(t), s2 = 0;
    for (n = 0; n < e.length; ++n) {
      let o = e[n];
      if (ue(o, Uint8Array)) s2 + o.length > i.length ? (h.isBuffer(o) || (o = h.from(o)), o.copy(i, s2)) : Uint8Array.prototype.set.call(i, o, s2);
      else if (h.isBuffer(o)) o.copy(i, s2);
      else throw new TypeError('"list" argument must be an Array of Buffers');
      s2 += o.length;
    }
    return i;
  }, "concat");
  function zn(r, e) {
    if (h.isBuffer(r)) return r.length;
    if (ArrayBuffer.isView(r) || ue(r, ArrayBuffer)) return r.byteLength;
    if (typeof r != "string") throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof r
    );
    let t = r.length, n = arguments.length > 2 && arguments[2] === true;
    if (!n && t === 0) return 0;
    let i = false;
    for (; ; ) switch (e) {
      case "ascii":
      case "latin1":
      case "binary":
        return t;
      case "utf8":
      case "utf-8":
        return Ht(r).length;
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return t * 2;
      case "hex":
        return t >>> 1;
      case "base64":
        return ni(r).length;
      default:
        if (i) return n ? -1 : Ht(r).length;
        e = ("" + e).toLowerCase(), i = true;
    }
  }
  __name(zn, "zn");
  __name2(zn, "zn");
  a(zn, "byteLength");
  h.byteLength = zn;
  function No(r, e, t) {
    let n = false;
    if ((e === void 0 || e < 0) && (e = 0), e > this.length || ((t === void 0 || t > this.length) && (t = this.length), t <= 0) || (t >>>= 0, e >>>= 0, t <= e)) return "";
    for (r || (r = "utf8"); ; ) switch (r) {
      case "hex":
        return Zo(this, e, t);
      case "utf8":
      case "utf-8":
        return Yn(this, e, t);
      case "ascii":
        return Ko(this, e, t);
      case "latin1":
      case "binary":
        return Yo(
          this,
          e,
          t
        );
      case "base64":
        return Vo(this, e, t);
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return Jo(
          this,
          e,
          t
        );
      default:
        if (n) throw new TypeError("Unknown encoding: " + r);
        r = (r + "").toLowerCase(), n = true;
    }
  }
  __name(No, "No");
  __name2(No, "No");
  a(
    No,
    "slowToString"
  );
  h.prototype._isBuffer = true;
  function Ae(r, e, t) {
    let n = r[e];
    r[e] = r[t], r[t] = n;
  }
  __name(Ae, "Ae");
  __name2(Ae, "Ae");
  a(Ae, "swap");
  h.prototype.swap16 = a(function() {
    let e = this.length;
    if (e % 2 !== 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
    for (let t = 0; t < e; t += 2) Ae(this, t, t + 1);
    return this;
  }, "swap16");
  h.prototype.swap32 = a(function() {
    let e = this.length;
    if (e % 4 !== 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
    for (let t = 0; t < e; t += 4) Ae(this, t, t + 3), Ae(this, t + 1, t + 2);
    return this;
  }, "swap32");
  h.prototype.swap64 = a(
    function() {
      let e = this.length;
      if (e % 8 !== 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
      for (let t = 0; t < e; t += 8) Ae(this, t, t + 7), Ae(this, t + 1, t + 6), Ae(this, t + 2, t + 5), Ae(this, t + 3, t + 4);
      return this;
    },
    "swap64"
  );
  h.prototype.toString = a(function() {
    let e = this.length;
    return e === 0 ? "" : arguments.length === 0 ? Yn(
      this,
      0,
      e
    ) : No.apply(this, arguments);
  }, "toString");
  h.prototype.toLocaleString = h.prototype.toString;
  h.prototype.equals = a(function(e) {
    if (!h.isBuffer(e)) throw new TypeError("Argument must be a Buffer");
    return this === e ? true : h.compare(this, e) === 0;
  }, "equals");
  h.prototype.inspect = a(function() {
    let e = "", t = Re.INSPECT_MAX_BYTES;
    return e = this.toString("hex", 0, t).replace(/(.{2})/g, "$1 ").trim(), this.length > t && (e += " ... "), "<Buffer " + e + ">";
  }, "inspect");
  Wn && (h.prototype[Wn] = h.prototype.inspect);
  h.prototype.compare = a(function(e, t, n, i, s2) {
    if (ue(e, Uint8Array) && (e = h.from(e, e.offset, e.byteLength)), !h.isBuffer(e)) throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof e);
    if (t === void 0 && (t = 0), n === void 0 && (n = e ? e.length : 0), i === void 0 && (i = 0), s2 === void 0 && (s2 = this.length), t < 0 || n > e.length || i < 0 || s2 > this.length) throw new RangeError("out of range index");
    if (i >= s2 && t >= n) return 0;
    if (i >= s2) return -1;
    if (t >= n) return 1;
    if (t >>>= 0, n >>>= 0, i >>>= 0, s2 >>>= 0, this === e) return 0;
    let o = s2 - i, u = n - t, c = Math.min(o, u), l = this.slice(
      i,
      s2
    ), f = e.slice(t, n);
    for (let y = 0; y < c; ++y) if (l[y] !== f[y]) {
      o = l[y], u = f[y];
      break;
    }
    return o < u ? -1 : u < o ? 1 : 0;
  }, "compare");
  function Kn(r, e, t, n, i) {
    if (r.length === 0) return -1;
    if (typeof t == "string" ? (n = t, t = 0) : t > 2147483647 ? t = 2147483647 : t < -2147483648 && (t = -2147483648), t = +t, zt(t) && (t = i ? 0 : r.length - 1), t < 0 && (t = r.length + t), t >= r.length) {
      if (i) return -1;
      t = r.length - 1;
    } else if (t < 0) if (i) t = 0;
    else return -1;
    if (typeof e == "string" && (e = h.from(
      e,
      n
    )), h.isBuffer(e)) return e.length === 0 ? -1 : jn(r, e, t, n, i);
    if (typeof e == "number") return e = e & 255, typeof Uint8Array.prototype.indexOf == "function" ? i ? Uint8Array.prototype.indexOf.call(r, e, t) : Uint8Array.prototype.lastIndexOf.call(r, e, t) : jn(r, [e], t, n, i);
    throw new TypeError("val must be string, number or Buffer");
  }
  __name(Kn, "Kn");
  __name2(Kn, "Kn");
  a(Kn, "bidirectionalIndexOf");
  function jn(r, e, t, n, i) {
    let s2 = 1, o = r.length, u = e.length;
    if (n !== void 0 && (n = String(n).toLowerCase(), n === "ucs2" || n === "ucs-2" || n === "utf16le" || n === "utf-16le")) {
      if (r.length < 2 || e.length < 2) return -1;
      s2 = 2, o /= 2, u /= 2, t /= 2;
    }
    function c(f, y) {
      return s2 === 1 ? f[y] : f.readUInt16BE(y * s2);
    }
    __name(c, "c");
    __name2(c, "c");
    a(c, "read");
    let l;
    if (i) {
      let f = -1;
      for (l = t; l < o; l++) if (c(r, l) === c(e, f === -1 ? 0 : l - f)) {
        if (f === -1 && (f = l), l - f + 1 === u) return f * s2;
      } else f !== -1 && (l -= l - f), f = -1;
    } else for (t + u > o && (t = o - u), l = t; l >= 0; l--) {
      let f = true;
      for (let y = 0; y < u; y++) if (c(r, l + y) !== c(e, y)) {
        f = false;
        break;
      }
      if (f) return l;
    }
    return -1;
  }
  __name(jn, "jn");
  __name2(jn, "jn");
  a(jn, "arrayIndexOf");
  h.prototype.includes = a(function(e, t, n) {
    return this.indexOf(
      e,
      t,
      n
    ) !== -1;
  }, "includes");
  h.prototype.indexOf = a(function(e, t, n) {
    return Kn(this, e, t, n, true);
  }, "indexOf");
  h.prototype.lastIndexOf = a(function(e, t, n) {
    return Kn(this, e, t, n, false);
  }, "lastIndexOf");
  function Wo(r, e, t, n) {
    t = Number(t) || 0;
    let i = r.length - t;
    n ? (n = Number(n), n > i && (n = i)) : n = i;
    let s2 = e.length;
    n > s2 / 2 && (n = s2 / 2);
    let o;
    for (o = 0; o < n; ++o) {
      let u = parseInt(e.substr(o * 2, 2), 16);
      if (zt(u)) return o;
      r[t + o] = u;
    }
    return o;
  }
  __name(Wo, "Wo");
  __name2(Wo, "Wo");
  a(Wo, "hexWrite");
  function jo(r, e, t, n) {
    return ht(Ht(e, r.length - t), r, t, n);
  }
  __name(jo, "jo");
  __name2(jo, "jo");
  a(jo, "utf8Write");
  function Ho(r, e, t, n) {
    return ht(ra(e), r, t, n);
  }
  __name(Ho, "Ho");
  __name2(Ho, "Ho");
  a(
    Ho,
    "asciiWrite"
  );
  function $o(r, e, t, n) {
    return ht(ni(e), r, t, n);
  }
  __name($o, "$o");
  __name2($o, "$o");
  a($o, "base64Write");
  function Go(r, e, t, n) {
    return ht(
      na(e, r.length - t),
      r,
      t,
      n
    );
  }
  __name(Go, "Go");
  __name2(Go, "Go");
  a(Go, "ucs2Write");
  h.prototype.write = a(function(e, t, n, i) {
    if (t === void 0) i = "utf8", n = this.length, t = 0;
    else if (n === void 0 && typeof t == "string") i = t, n = this.length, t = 0;
    else if (isFinite(t))
      t = t >>> 0, isFinite(n) ? (n = n >>> 0, i === void 0 && (i = "utf8")) : (i = n, n = void 0);
    else throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
    let s2 = this.length - t;
    if ((n === void 0 || n > s2) && (n = s2), e.length > 0 && (n < 0 || t < 0) || t > this.length) throw new RangeError("Attempt to write outside buffer bounds");
    i || (i = "utf8");
    let o = false;
    for (; ; ) switch (i) {
      case "hex":
        return Wo(this, e, t, n);
      case "utf8":
      case "utf-8":
        return jo(this, e, t, n);
      case "ascii":
      case "latin1":
      case "binary":
        return Ho(this, e, t, n);
      case "base64":
        return $o(this, e, t, n);
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return Go(this, e, t, n);
      default:
        if (o) throw new TypeError("Unknown encoding: " + i);
        i = ("" + i).toLowerCase(), o = true;
    }
  }, "write");
  h.prototype.toJSON = a(function() {
    return { type: "Buffer", data: Array.prototype.slice.call(this._arr || this, 0) };
  }, "toJSON");
  function Vo(r, e, t) {
    return e === 0 && t === r.length ? Nt.fromByteArray(r) : Nt.fromByteArray(r.slice(e, t));
  }
  __name(Vo, "Vo");
  __name2(Vo, "Vo");
  a(Vo, "base64Slice");
  function Yn(r, e, t) {
    t = Math.min(r.length, t);
    let n = [], i = e;
    for (; i < t; ) {
      let s2 = r[i], o = null, u = s2 > 239 ? 4 : s2 > 223 ? 3 : s2 > 191 ? 2 : 1;
      if (i + u <= t) {
        let c, l, f, y;
        switch (u) {
          case 1:
            s2 < 128 && (o = s2);
            break;
          case 2:
            c = r[i + 1], (c & 192) === 128 && (y = (s2 & 31) << 6 | c & 63, y > 127 && (o = y));
            break;
          case 3:
            c = r[i + 1], l = r[i + 2], (c & 192) === 128 && (l & 192) === 128 && (y = (s2 & 15) << 12 | (c & 63) << 6 | l & 63, y > 2047 && (y < 55296 || y > 57343) && (o = y));
            break;
          case 4:
            c = r[i + 1], l = r[i + 2], f = r[i + 3], (c & 192) === 128 && (l & 192) === 128 && (f & 192) === 128 && (y = (s2 & 15) << 18 | (c & 63) << 12 | (l & 63) << 6 | f & 63, y > 65535 && y < 1114112 && (o = y));
        }
      }
      o === null ? (o = 65533, u = 1) : o > 65535 && (o -= 65536, n.push(o >>> 10 & 1023 | 55296), o = 56320 | o & 1023), n.push(o), i += u;
    }
    return zo(n);
  }
  __name(Yn, "Yn");
  __name2(Yn, "Yn");
  a(Yn, "utf8Slice");
  var Hn = 4096;
  function zo(r) {
    let e = r.length;
    if (e <= Hn) return String.fromCharCode.apply(String, r);
    let t = "", n = 0;
    for (; n < e; ) t += String.fromCharCode.apply(String, r.slice(n, n += Hn));
    return t;
  }
  __name(zo, "zo");
  __name2(zo, "zo");
  a(zo, "decodeCodePointsArray");
  function Ko(r, e, t) {
    let n = "";
    t = Math.min(r.length, t);
    for (let i = e; i < t; ++i) n += String.fromCharCode(r[i] & 127);
    return n;
  }
  __name(Ko, "Ko");
  __name2(Ko, "Ko");
  a(Ko, "asciiSlice");
  function Yo(r, e, t) {
    let n = "";
    t = Math.min(r.length, t);
    for (let i = e; i < t; ++i) n += String.fromCharCode(r[i]);
    return n;
  }
  __name(Yo, "Yo");
  __name2(Yo, "Yo");
  a(Yo, "latin1Slice");
  function Zo(r, e, t) {
    let n = r.length;
    (!e || e < 0) && (e = 0), (!t || t < 0 || t > n) && (t = n);
    let i = "";
    for (let s2 = e; s2 < t; ++s2) i += ia[r[s2]];
    return i;
  }
  __name(Zo, "Zo");
  __name2(Zo, "Zo");
  a(Zo, "hexSlice");
  function Jo(r, e, t) {
    let n = r.slice(e, t), i = "";
    for (let s2 = 0; s2 < n.length - 1; s2 += 2) i += String.fromCharCode(n[s2] + n[s2 + 1] * 256);
    return i;
  }
  __name(Jo, "Jo");
  __name2(Jo, "Jo");
  a(Jo, "utf16leSlice");
  h.prototype.slice = a(function(e, t) {
    let n = this.length;
    e = ~~e, t = t === void 0 ? n : ~~t, e < 0 ? (e += n, e < 0 && (e = 0)) : e > n && (e = n), t < 0 ? (t += n, t < 0 && (t = 0)) : t > n && (t = n), t < e && (t = e);
    let i = this.subarray(e, t);
    return Object.setPrototypeOf(i, h.prototype), i;
  }, "slice");
  function q(r, e, t) {
    if (r % 1 !== 0 || r < 0) throw new RangeError("offset is not uint");
    if (r + e > t) throw new RangeError("Trying to access beyond buffer length");
  }
  __name(q, "q");
  __name2(q, "q");
  a(q, "checkOffset");
  h.prototype.readUintLE = h.prototype.readUIntLE = a(
    function(e, t, n) {
      e = e >>> 0, t = t >>> 0, n || q(e, t, this.length);
      let i = this[e], s2 = 1, o = 0;
      for (; ++o < t && (s2 *= 256); ) i += this[e + o] * s2;
      return i;
    },
    "readUIntLE"
  );
  h.prototype.readUintBE = h.prototype.readUIntBE = a(function(e, t, n) {
    e = e >>> 0, t = t >>> 0, n || q(
      e,
      t,
      this.length
    );
    let i = this[e + --t], s2 = 1;
    for (; t > 0 && (s2 *= 256); ) i += this[e + --t] * s2;
    return i;
  }, "readUIntBE");
  h.prototype.readUint8 = h.prototype.readUInt8 = a(
    function(e, t) {
      return e = e >>> 0, t || q(e, 1, this.length), this[e];
    },
    "readUInt8"
  );
  h.prototype.readUint16LE = h.prototype.readUInt16LE = a(function(e, t) {
    return e = e >>> 0, t || q(
      e,
      2,
      this.length
    ), this[e] | this[e + 1] << 8;
  }, "readUInt16LE");
  h.prototype.readUint16BE = h.prototype.readUInt16BE = a(function(e, t) {
    return e = e >>> 0, t || q(e, 2, this.length), this[e] << 8 | this[e + 1];
  }, "readUInt16BE");
  h.prototype.readUint32LE = h.prototype.readUInt32LE = a(function(e, t) {
    return e = e >>> 0, t || q(e, 4, this.length), (this[e] | this[e + 1] << 8 | this[e + 2] << 16) + this[e + 3] * 16777216;
  }, "readUInt32LE");
  h.prototype.readUint32BE = h.prototype.readUInt32BE = a(function(e, t) {
    return e = e >>> 0, t || q(e, 4, this.length), this[e] * 16777216 + (this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3]);
  }, "readUInt32BE");
  h.prototype.readBigUInt64LE = we(a(function(e) {
    e = e >>> 0, Be(e, "offset");
    let t = this[e], n = this[e + 7];
    (t === void 0 || n === void 0) && je(e, this.length - 8);
    let i = t + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24, s2 = this[++e] + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + n * 2 ** 24;
    return BigInt(i) + (BigInt(s2) << BigInt(32));
  }, "readBigUInt64LE"));
  h.prototype.readBigUInt64BE = we(a(function(e) {
    e = e >>> 0, Be(e, "offset");
    let t = this[e], n = this[e + 7];
    (t === void 0 || n === void 0) && je(e, this.length - 8);
    let i = t * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e], s2 = this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + n;
    return (BigInt(i) << BigInt(
      32
    )) + BigInt(s2);
  }, "readBigUInt64BE"));
  h.prototype.readIntLE = a(function(e, t, n) {
    e = e >>> 0, t = t >>> 0, n || q(
      e,
      t,
      this.length
    );
    let i = this[e], s2 = 1, o = 0;
    for (; ++o < t && (s2 *= 256); ) i += this[e + o] * s2;
    return s2 *= 128, i >= s2 && (i -= Math.pow(2, 8 * t)), i;
  }, "readIntLE");
  h.prototype.readIntBE = a(function(e, t, n) {
    e = e >>> 0, t = t >>> 0, n || q(e, t, this.length);
    let i = t, s2 = 1, o = this[e + --i];
    for (; i > 0 && (s2 *= 256); ) o += this[e + --i] * s2;
    return s2 *= 128, o >= s2 && (o -= Math.pow(2, 8 * t)), o;
  }, "readIntBE");
  h.prototype.readInt8 = a(function(e, t) {
    return e = e >>> 0, t || q(e, 1, this.length), this[e] & 128 ? (255 - this[e] + 1) * -1 : this[e];
  }, "readInt8");
  h.prototype.readInt16LE = a(function(e, t) {
    e = e >>> 0, t || q(
      e,
      2,
      this.length
    );
    let n = this[e] | this[e + 1] << 8;
    return n & 32768 ? n | 4294901760 : n;
  }, "readInt16LE");
  h.prototype.readInt16BE = a(function(e, t) {
    e = e >>> 0, t || q(e, 2, this.length);
    let n = this[e + 1] | this[e] << 8;
    return n & 32768 ? n | 4294901760 : n;
  }, "readInt16BE");
  h.prototype.readInt32LE = a(function(e, t) {
    return e = e >>> 0, t || q(e, 4, this.length), this[e] | this[e + 1] << 8 | this[e + 2] << 16 | this[e + 3] << 24;
  }, "readInt32LE");
  h.prototype.readInt32BE = a(function(e, t) {
    return e = e >>> 0, t || q(e, 4, this.length), this[e] << 24 | this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3];
  }, "readInt32BE");
  h.prototype.readBigInt64LE = we(a(function(e) {
    e = e >>> 0, Be(e, "offset");
    let t = this[e], n = this[e + 7];
    (t === void 0 || n === void 0) && je(e, this.length - 8);
    let i = this[e + 4] + this[e + 5] * 2 ** 8 + this[e + 6] * 2 ** 16 + (n << 24);
    return (BigInt(i) << BigInt(
      32
    )) + BigInt(t + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24);
  }, "readBigInt64LE"));
  h.prototype.readBigInt64BE = we(a(function(e) {
    e = e >>> 0, Be(e, "offset");
    let t = this[e], n = this[e + 7];
    (t === void 0 || n === void 0) && je(e, this.length - 8);
    let i = (t << 24) + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e];
    return (BigInt(i) << BigInt(32)) + BigInt(
      this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + n
    );
  }, "readBigInt64BE"));
  h.prototype.readFloatLE = a(function(e, t) {
    return e = e >>> 0, t || q(e, 4, this.length), Pe.read(this, e, true, 23, 4);
  }, "readFloatLE");
  h.prototype.readFloatBE = a(function(e, t) {
    return e = e >>> 0, t || q(e, 4, this.length), Pe.read(this, e, false, 23, 4);
  }, "readFloatBE");
  h.prototype.readDoubleLE = a(function(e, t) {
    return e = e >>> 0, t || q(e, 8, this.length), Pe.read(this, e, true, 52, 8);
  }, "readDoubleLE");
  h.prototype.readDoubleBE = a(function(e, t) {
    return e = e >>> 0, t || q(e, 8, this.length), Pe.read(
      this,
      e,
      false,
      52,
      8
    );
  }, "readDoubleBE");
  function V(r, e, t, n, i, s2) {
    if (!h.isBuffer(r)) throw new TypeError('"buffer" argument must be a Buffer instance');
    if (e > i || e < s2) throw new RangeError('"value" argument is out of bounds');
    if (t + n > r.length) throw new RangeError("Index out of range");
  }
  __name(V, "V");
  __name2(V, "V");
  a(V, "checkInt");
  h.prototype.writeUintLE = h.prototype.writeUIntLE = a(function(e, t, n, i) {
    if (e = +e, t = t >>> 0, n = n >>> 0, !i) {
      let u = Math.pow(2, 8 * n) - 1;
      V(
        this,
        e,
        t,
        n,
        u,
        0
      );
    }
    let s2 = 1, o = 0;
    for (this[t] = e & 255; ++o < n && (s2 *= 256); ) this[t + o] = e / s2 & 255;
    return t + n;
  }, "writeUIntLE");
  h.prototype.writeUintBE = h.prototype.writeUIntBE = a(function(e, t, n, i) {
    if (e = +e, t = t >>> 0, n = n >>> 0, !i) {
      let u = Math.pow(2, 8 * n) - 1;
      V(this, e, t, n, u, 0);
    }
    let s2 = n - 1, o = 1;
    for (this[t + s2] = e & 255; --s2 >= 0 && (o *= 256); ) this[t + s2] = e / o & 255;
    return t + n;
  }, "writeUIntBE");
  h.prototype.writeUint8 = h.prototype.writeUInt8 = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || V(this, e, t, 1, 255, 0), this[t] = e & 255, t + 1;
  }, "writeUInt8");
  h.prototype.writeUint16LE = h.prototype.writeUInt16LE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || V(this, e, t, 2, 65535, 0), this[t] = e & 255, this[t + 1] = e >>> 8, t + 2;
  }, "writeUInt16LE");
  h.prototype.writeUint16BE = h.prototype.writeUInt16BE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || V(this, e, t, 2, 65535, 0), this[t] = e >>> 8, this[t + 1] = e & 255, t + 2;
  }, "writeUInt16BE");
  h.prototype.writeUint32LE = h.prototype.writeUInt32LE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || V(
      this,
      e,
      t,
      4,
      4294967295,
      0
    ), this[t + 3] = e >>> 24, this[t + 2] = e >>> 16, this[t + 1] = e >>> 8, this[t] = e & 255, t + 4;
  }, "writeUInt32LE");
  h.prototype.writeUint32BE = h.prototype.writeUInt32BE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || V(
      this,
      e,
      t,
      4,
      4294967295,
      0
    ), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = e & 255, t + 4;
  }, "writeUInt32BE");
  function Zn(r, e, t, n, i) {
    ri(e, n, i, r, t, 7);
    let s2 = Number(e & BigInt(4294967295));
    r[t++] = s2, s2 = s2 >> 8, r[t++] = s2, s2 = s2 >> 8, r[t++] = s2, s2 = s2 >> 8, r[t++] = s2;
    let o = Number(e >> BigInt(32) & BigInt(4294967295));
    return r[t++] = o, o = o >> 8, r[t++] = o, o = o >> 8, r[t++] = o, o = o >> 8, r[t++] = o, t;
  }
  __name(Zn, "Zn");
  __name2(Zn, "Zn");
  a(Zn, "wrtBigUInt64LE");
  function Jn(r, e, t, n, i) {
    ri(e, n, i, r, t, 7);
    let s2 = Number(e & BigInt(4294967295));
    r[t + 7] = s2, s2 = s2 >> 8, r[t + 6] = s2, s2 = s2 >> 8, r[t + 5] = s2, s2 = s2 >> 8, r[t + 4] = s2;
    let o = Number(e >> BigInt(32) & BigInt(4294967295));
    return r[t + 3] = o, o = o >> 8, r[t + 2] = o, o = o >> 8, r[t + 1] = o, o = o >> 8, r[t] = o, t + 8;
  }
  __name(Jn, "Jn");
  __name2(Jn, "Jn");
  a(Jn, "wrtBigUInt64BE");
  h.prototype.writeBigUInt64LE = we(a(function(e, t = 0) {
    return Zn(this, e, t, BigInt(0), BigInt("0xffffffffffffffff"));
  }, "writeBigUInt64LE"));
  h.prototype.writeBigUInt64BE = we(a(function(e, t = 0) {
    return Jn(this, e, t, BigInt(0), BigInt(
      "0xffffffffffffffff"
    ));
  }, "writeBigUInt64BE"));
  h.prototype.writeIntLE = a(function(e, t, n, i) {
    if (e = +e, t = t >>> 0, !i) {
      let c = Math.pow(2, 8 * n - 1);
      V(this, e, t, n, c - 1, -c);
    }
    let s2 = 0, o = 1, u = 0;
    for (this[t] = e & 255; ++s2 < n && (o *= 256); )
      e < 0 && u === 0 && this[t + s2 - 1] !== 0 && (u = 1), this[t + s2] = (e / o >> 0) - u & 255;
    return t + n;
  }, "writeIntLE");
  h.prototype.writeIntBE = a(function(e, t, n, i) {
    if (e = +e, t = t >>> 0, !i) {
      let c = Math.pow(2, 8 * n - 1);
      V(this, e, t, n, c - 1, -c);
    }
    let s2 = n - 1, o = 1, u = 0;
    for (this[t + s2] = e & 255; --s2 >= 0 && (o *= 256); ) e < 0 && u === 0 && this[t + s2 + 1] !== 0 && (u = 1), this[t + s2] = (e / o >> 0) - u & 255;
    return t + n;
  }, "writeIntBE");
  h.prototype.writeInt8 = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || V(this, e, t, 1, 127, -128), e < 0 && (e = 255 + e + 1), this[t] = e & 255, t + 1;
  }, "writeInt8");
  h.prototype.writeInt16LE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || V(this, e, t, 2, 32767, -32768), this[t] = e & 255, this[t + 1] = e >>> 8, t + 2;
  }, "writeInt16LE");
  h.prototype.writeInt16BE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || V(this, e, t, 2, 32767, -32768), this[t] = e >>> 8, this[t + 1] = e & 255, t + 2;
  }, "writeInt16BE");
  h.prototype.writeInt32LE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || V(
      this,
      e,
      t,
      4,
      2147483647,
      -2147483648
    ), this[t] = e & 255, this[t + 1] = e >>> 8, this[t + 2] = e >>> 16, this[t + 3] = e >>> 24, t + 4;
  }, "writeInt32LE");
  h.prototype.writeInt32BE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || V(
      this,
      e,
      t,
      4,
      2147483647,
      -2147483648
    ), e < 0 && (e = 4294967295 + e + 1), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = e & 255, t + 4;
  }, "writeInt32BE");
  h.prototype.writeBigInt64LE = we(a(function(e, t = 0) {
    return Zn(this, e, t, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  }, "writeBigInt64LE"));
  h.prototype.writeBigInt64BE = we(
    a(function(e, t = 0) {
      return Jn(this, e, t, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    }, "writeBigInt64BE")
  );
  function Xn(r, e, t, n, i, s2) {
    if (t + n > r.length) throw new RangeError("Index out of range");
    if (t < 0) throw new RangeError("Index out of range");
  }
  __name(Xn, "Xn");
  __name2(Xn, "Xn");
  a(Xn, "checkIEEE754");
  function ei(r, e, t, n, i) {
    return e = +e, t = t >>> 0, i || Xn(r, e, t, 4, 34028234663852886e22, -34028234663852886e22), Pe.write(r, e, t, n, 23, 4), t + 4;
  }
  __name(ei, "ei");
  __name2(ei, "ei");
  a(
    ei,
    "writeFloat"
  );
  h.prototype.writeFloatLE = a(function(e, t, n) {
    return ei(this, e, t, true, n);
  }, "writeFloatLE");
  h.prototype.writeFloatBE = a(function(e, t, n) {
    return ei(this, e, t, false, n);
  }, "writeFloatBE");
  function ti(r, e, t, n, i) {
    return e = +e, t = t >>> 0, i || Xn(r, e, t, 8, 17976931348623157e292, -17976931348623157e292), Pe.write(
      r,
      e,
      t,
      n,
      52,
      8
    ), t + 8;
  }
  __name(ti, "ti");
  __name2(ti, "ti");
  a(ti, "writeDouble");
  h.prototype.writeDoubleLE = a(function(e, t, n) {
    return ti(this, e, t, true, n);
  }, "writeDoubleLE");
  h.prototype.writeDoubleBE = a(function(e, t, n) {
    return ti(this, e, t, false, n);
  }, "writeDoubleBE");
  h.prototype.copy = a(function(e, t, n, i) {
    if (!h.isBuffer(e)) throw new TypeError("argument should be a Buffer");
    if (n || (n = 0), !i && i !== 0 && (i = this.length), t >= e.length && (t = e.length), t || (t = 0), i > 0 && i < n && (i = n), i === n || e.length === 0 || this.length === 0) return 0;
    if (t < 0) throw new RangeError("targetStart out of bounds");
    if (n < 0 || n >= this.length) throw new RangeError("Index out of range");
    if (i < 0) throw new RangeError("sourceEnd out of bounds");
    i > this.length && (i = this.length), e.length - t < i - n && (i = e.length - t + n);
    let s2 = i - n;
    return this === e && typeof Uint8Array.prototype.copyWithin == "function" ? this.copyWithin(t, n, i) : Uint8Array.prototype.set.call(e, this.subarray(n, i), t), s2;
  }, "copy");
  h.prototype.fill = a(function(e, t, n, i) {
    if (typeof e == "string") {
      if (typeof t == "string" ? (i = t, t = 0, n = this.length) : typeof n == "string" && (i = n, n = this.length), i !== void 0 && typeof i != "string") throw new TypeError("encoding must be a string");
      if (typeof i == "string" && !h.isEncoding(i)) throw new TypeError(
        "Unknown encoding: " + i
      );
      if (e.length === 1) {
        let o = e.charCodeAt(0);
        (i === "utf8" && o < 128 || i === "latin1") && (e = o);
      }
    } else typeof e == "number" ? e = e & 255 : typeof e == "boolean" && (e = Number(e));
    if (t < 0 || this.length < t || this.length < n) throw new RangeError("Out of range index");
    if (n <= t) return this;
    t = t >>> 0, n = n === void 0 ? this.length : n >>> 0, e || (e = 0);
    let s2;
    if (typeof e == "number") for (s2 = t; s2 < n; ++s2) this[s2] = e;
    else {
      let o = h.isBuffer(e) ? e : h.from(
        e,
        i
      ), u = o.length;
      if (u === 0) throw new TypeError('The value "' + e + '" is invalid for argument "value"');
      for (s2 = 0; s2 < n - t; ++s2) this[s2 + t] = o[s2 % u];
    }
    return this;
  }, "fill");
  var Te = {};
  function Vt(r, e, t) {
    var n;
    Te[r] = (n = class extends t {
      static {
        __name(this, "n");
      }
      static {
        __name2(this, "n");
      }
      constructor() {
        super(), Object.defineProperty(this, "message", { value: e.apply(this, arguments), writable: true, configurable: true }), this.name = `${this.name} [${r}]`, this.stack, delete this.name;
      }
      get code() {
        return r;
      }
      set code(s2) {
        Object.defineProperty(
          this,
          "code",
          { configurable: true, enumerable: true, value: s2, writable: true }
        );
      }
      toString() {
        return `${this.name} [${r}]: ${this.message}`;
      }
    }, a(n, "NodeError"), n);
  }
  __name(Vt, "Vt");
  __name2(Vt, "Vt");
  a(Vt, "E");
  Vt("ERR_BUFFER_OUT_OF_BOUNDS", function(r) {
    return r ? `${r} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds";
  }, RangeError);
  Vt(
    "ERR_INVALID_ARG_TYPE",
    function(r, e) {
      return `The "${r}" argument must be of type number. Received type ${typeof e}`;
    },
    TypeError
  );
  Vt("ERR_OUT_OF_RANGE", function(r, e, t) {
    let n = `The value of "${r}" is out of range.`, i = t;
    return Number.isInteger(t) && Math.abs(t) > 2 ** 32 ? i = $n(String(t)) : typeof t == "bigint" && (i = String(
      t
    ), (t > BigInt(2) ** BigInt(32) || t < -(BigInt(2) ** BigInt(32))) && (i = $n(i)), i += "n"), n += ` It must be ${e}. Received ${i}`, n;
  }, RangeError);
  function $n(r) {
    let e = "", t = r.length, n = r[0] === "-" ? 1 : 0;
    for (; t >= n + 4; t -= 3) e = `_${r.slice(t - 3, t)}${e}`;
    return `${r.slice(0, t)}${e}`;
  }
  __name($n, "$n");
  __name2($n, "$n");
  a($n, "addNumericalSeparator");
  function Xo(r, e, t) {
    Be(e, "offset"), (r[e] === void 0 || r[e + t] === void 0) && je(e, r.length - (t + 1));
  }
  __name(Xo, "Xo");
  __name2(Xo, "Xo");
  a(Xo, "checkBounds");
  function ri(r, e, t, n, i, s2) {
    if (r > t || r < e) {
      let o = typeof e == "bigint" ? "n" : "", u;
      throw s2 > 3 ? e === 0 || e === BigInt(0) ? u = `>= 0${o} and < 2${o} ** ${(s2 + 1) * 8}${o}` : u = `>= -(2${o} ** ${(s2 + 1) * 8 - 1}${o}) and < 2 ** ${(s2 + 1) * 8 - 1}${o}` : u = `>= ${e}${o} and <= ${t}${o}`, new Te.ERR_OUT_OF_RANGE("value", u, r);
    }
    Xo(n, i, s2);
  }
  __name(ri, "ri");
  __name2(ri, "ri");
  a(ri, "checkIntBI");
  function Be(r, e) {
    if (typeof r != "number") throw new Te.ERR_INVALID_ARG_TYPE(e, "number", r);
  }
  __name(Be, "Be");
  __name2(Be, "Be");
  a(Be, "validateNumber");
  function je(r, e, t) {
    throw Math.floor(r) !== r ? (Be(r, t), new Te.ERR_OUT_OF_RANGE(t || "offset", "an integer", r)) : e < 0 ? new Te.ERR_BUFFER_OUT_OF_BOUNDS() : new Te.ERR_OUT_OF_RANGE(t || "offset", `>= ${t ? 1 : 0} and <= ${e}`, r);
  }
  __name(je, "je");
  __name2(je, "je");
  a(je, "boundsError");
  var ea = /[^+/0-9A-Za-z-_]/g;
  function ta(r) {
    if (r = r.split("=")[0], r = r.trim().replace(ea, ""), r.length < 2) return "";
    for (; r.length % 4 !== 0; ) r = r + "=";
    return r;
  }
  __name(ta, "ta");
  __name2(ta, "ta");
  a(ta, "base64clean");
  function Ht(r, e) {
    e = e || 1 / 0;
    let t, n = r.length, i = null, s2 = [];
    for (let o = 0; o < n; ++o) {
      if (t = r.charCodeAt(o), t > 55295 && t < 57344) {
        if (!i) {
          if (t > 56319) {
            (e -= 3) > -1 && s2.push(239, 191, 189);
            continue;
          } else if (o + 1 === n) {
            (e -= 3) > -1 && s2.push(239, 191, 189);
            continue;
          }
          i = t;
          continue;
        }
        if (t < 56320) {
          (e -= 3) > -1 && s2.push(239, 191, 189), i = t;
          continue;
        }
        t = (i - 55296 << 10 | t - 56320) + 65536;
      } else i && (e -= 3) > -1 && s2.push(239, 191, 189);
      if (i = null, t < 128) {
        if ((e -= 1) < 0) break;
        s2.push(t);
      } else if (t < 2048) {
        if ((e -= 2) < 0) break;
        s2.push(t >> 6 | 192, t & 63 | 128);
      } else if (t < 65536) {
        if ((e -= 3) < 0) break;
        s2.push(t >> 12 | 224, t >> 6 & 63 | 128, t & 63 | 128);
      } else if (t < 1114112) {
        if ((e -= 4) < 0) break;
        s2.push(t >> 18 | 240, t >> 12 & 63 | 128, t >> 6 & 63 | 128, t & 63 | 128);
      } else throw new Error("Invalid code point");
    }
    return s2;
  }
  __name(Ht, "Ht");
  __name2(Ht, "Ht");
  a(Ht, "utf8ToBytes");
  function ra(r) {
    let e = [];
    for (let t = 0; t < r.length; ++t) e.push(r.charCodeAt(t) & 255);
    return e;
  }
  __name(ra, "ra");
  __name2(ra, "ra");
  a(
    ra,
    "asciiToBytes"
  );
  function na(r, e) {
    let t, n, i, s2 = [];
    for (let o = 0; o < r.length && !((e -= 2) < 0); ++o) t = r.charCodeAt(
      o
    ), n = t >> 8, i = t % 256, s2.push(i), s2.push(n);
    return s2;
  }
  __name(na, "na");
  __name2(na, "na");
  a(na, "utf16leToBytes");
  function ni(r) {
    return Nt.toByteArray(
      ta(r)
    );
  }
  __name(ni, "ni");
  __name2(ni, "ni");
  a(ni, "base64ToBytes");
  function ht(r, e, t, n) {
    let i;
    for (i = 0; i < n && !(i + t >= e.length || i >= r.length); ++i)
      e[i + t] = r[i];
    return i;
  }
  __name(ht, "ht");
  __name2(ht, "ht");
  a(ht, "blitBuffer");
  function ue(r, e) {
    return r instanceof e || r != null && r.constructor != null && r.constructor.name != null && r.constructor.name === e.name;
  }
  __name(ue, "ue");
  __name2(ue, "ue");
  a(ue, "isInstance");
  function zt(r) {
    return r !== r;
  }
  __name(zt, "zt");
  __name2(zt, "zt");
  a(zt, "numberIsNaN");
  var ia = (function() {
    let r = "0123456789abcdef", e = new Array(256);
    for (let t = 0; t < 16; ++t) {
      let n = t * 16;
      for (let i = 0; i < 16; ++i) e[n + i] = r[t] + r[i];
    }
    return e;
  })();
  function we(r) {
    return typeof BigInt > "u" ? sa : r;
  }
  __name(we, "we");
  __name2(we, "we");
  a(we, "defineBigIntMethod");
  function sa() {
    throw new Error("BigInt not supported");
  }
  __name(sa, "sa");
  __name2(sa, "sa");
  a(sa, "BufferBigIntNotDefined");
});
var b;
var v;
var x;
var d;
var m;
var p = G(() => {
  "use strict";
  b = globalThis, v = globalThis.setImmediate ?? ((r) => setTimeout(r, 0)), x = globalThis.clearImmediate ?? ((r) => clearTimeout(r)), d = typeof globalThis.Buffer == "function" && typeof globalThis.Buffer.allocUnsafe == "function" ? globalThis.Buffer : ii().Buffer, m = globalThis.process ?? {};
  m.env ?? (m.env = {});
  try {
    m.nextTick(() => {
    });
  } catch {
    let e = Promise.resolve();
    m.nextTick = e.then.bind(e);
  }
});
var ge = T((Rl, Kt) => {
  "use strict";
  p();
  var Le = typeof Reflect == "object" ? Reflect : null, si = Le && typeof Le.apply == "function" ? Le.apply : a(function(e, t, n) {
    return Function.prototype.apply.call(e, t, n);
  }, "ReflectApply"), pt;
  Le && typeof Le.ownKeys == "function" ? pt = Le.ownKeys : Object.getOwnPropertySymbols ? pt = a(function(e) {
    return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e));
  }, "ReflectOwnKeys") : pt = a(function(e) {
    return Object.getOwnPropertyNames(e);
  }, "ReflectOwnKeys");
  function oa(r) {
    console && console.warn && console.warn(r);
  }
  __name(oa, "oa");
  __name2(oa, "oa");
  a(
    oa,
    "ProcessEmitWarning"
  );
  var ai = Number.isNaN || a(function(e) {
    return e !== e;
  }, "NumberIsNaN");
  function B() {
    B.init.call(this);
  }
  __name(B, "B");
  __name2(B, "B");
  a(B, "EventEmitter");
  Kt.exports = B;
  Kt.exports.once = la;
  B.EventEmitter = B;
  B.prototype._events = void 0;
  B.prototype._eventsCount = 0;
  B.prototype._maxListeners = void 0;
  var oi = 10;
  function dt(r) {
    if (typeof r != "function") throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof r);
  }
  __name(dt, "dt");
  __name2(dt, "dt");
  a(dt, "checkListener");
  Object.defineProperty(B, "defaultMaxListeners", { enumerable: true, get: a(function() {
    return oi;
  }, "get"), set: a(
    function(r) {
      if (typeof r != "number" || r < 0 || ai(r)) throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + r + ".");
      oi = r;
    },
    "set"
  ) });
  B.init = function() {
    (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) && (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || void 0;
  };
  B.prototype.setMaxListeners = a(function(e) {
    if (typeof e != "number" || e < 0 || ai(e)) throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + e + ".");
    return this._maxListeners = e, this;
  }, "setMaxListeners");
  function ui(r) {
    return r._maxListeners === void 0 ? B.defaultMaxListeners : r._maxListeners;
  }
  __name(ui, "ui");
  __name2(ui, "ui");
  a(ui, "_getMaxListeners");
  B.prototype.getMaxListeners = a(function() {
    return ui(this);
  }, "getMaxListeners");
  B.prototype.emit = a(function(e) {
    for (var t = [], n = 1; n < arguments.length; n++) t.push(arguments[n]);
    var i = e === "error", s2 = this._events;
    if (s2 !== void 0) i = i && s2.error === void 0;
    else if (!i) return false;
    if (i) {
      var o;
      if (t.length > 0 && (o = t[0]), o instanceof Error) throw o;
      var u = new Error("Unhandled error." + (o ? " (" + o.message + ")" : ""));
      throw u.context = o, u;
    }
    var c = s2[e];
    if (c === void 0) return false;
    if (typeof c == "function") si(c, this, t);
    else for (var l = c.length, f = pi(c, l), n = 0; n < l; ++n) si(f[n], this, t);
    return true;
  }, "emit");
  function ci(r, e, t, n) {
    var i, s2, o;
    if (dt(
      t
    ), s2 = r._events, s2 === void 0 ? (s2 = r._events = /* @__PURE__ */ Object.create(null), r._eventsCount = 0) : (s2.newListener !== void 0 && (r.emit("newListener", e, t.listener ? t.listener : t), s2 = r._events), o = s2[e]), o === void 0) o = s2[e] = t, ++r._eventsCount;
    else if (typeof o == "function" ? o = s2[e] = n ? [t, o] : [o, t] : n ? o.unshift(t) : o.push(t), i = ui(r), i > 0 && o.length > i && !o.warned) {
      o.warned = true;
      var u = new Error("Possible EventEmitter memory leak detected. " + o.length + " " + String(e) + " listeners added. Use emitter.setMaxListeners() to increase limit");
      u.name = "MaxListenersExceededWarning", u.emitter = r, u.type = e, u.count = o.length, oa(u);
    }
    return r;
  }
  __name(ci, "ci");
  __name2(ci, "ci");
  a(ci, "_addListener");
  B.prototype.addListener = a(function(e, t) {
    return ci(this, e, t, false);
  }, "addListener");
  B.prototype.on = B.prototype.addListener;
  B.prototype.prependListener = a(function(e, t) {
    return ci(this, e, t, true);
  }, "prependListener");
  function aa() {
    if (!this.fired) return this.target.removeListener(this.type, this.wrapFn), this.fired = true, arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments);
  }
  __name(aa, "aa");
  __name2(aa, "aa");
  a(aa, "onceWrapper");
  function li(r, e, t) {
    var n = {
      fired: false,
      wrapFn: void 0,
      target: r,
      type: e,
      listener: t
    }, i = aa.bind(n);
    return i.listener = t, n.wrapFn = i, i;
  }
  __name(li, "li");
  __name2(li, "li");
  a(li, "_onceWrap");
  B.prototype.once = a(function(e, t) {
    return dt(t), this.on(e, li(this, e, t)), this;
  }, "once");
  B.prototype.prependOnceListener = a(function(e, t) {
    return dt(t), this.prependListener(e, li(this, e, t)), this;
  }, "prependOnceListener");
  B.prototype.removeListener = a(function(e, t) {
    var n, i, s2, o, u;
    if (dt(t), i = this._events, i === void 0) return this;
    if (n = i[e], n === void 0) return this;
    if (n === t || n.listener === t) --this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : (delete i[e], i.removeListener && this.emit("removeListener", e, n.listener || t));
    else if (typeof n != "function") {
      for (s2 = -1, o = n.length - 1; o >= 0; o--) if (n[o] === t || n[o].listener === t) {
        u = n[o].listener, s2 = o;
        break;
      }
      if (s2 < 0) return this;
      s2 === 0 ? n.shift() : ua(n, s2), n.length === 1 && (i[e] = n[0]), i.removeListener !== void 0 && this.emit("removeListener", e, u || t);
    }
    return this;
  }, "removeListener");
  B.prototype.off = B.prototype.removeListener;
  B.prototype.removeAllListeners = a(function(e) {
    var t, n, i;
    if (n = this._events, n === void 0) return this;
    if (n.removeListener === void 0) return arguments.length === 0 ? (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0) : n[e] !== void 0 && (--this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : delete n[e]), this;
    if (arguments.length === 0) {
      var s2 = Object.keys(n), o;
      for (i = 0; i < s2.length; ++i) o = s2[i], o !== "removeListener" && this.removeAllListeners(
        o
      );
      return this.removeAllListeners("removeListener"), this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0, this;
    }
    if (t = n[e], typeof t == "function") this.removeListener(e, t);
    else if (t !== void 0) for (i = t.length - 1; i >= 0; i--) this.removeListener(e, t[i]);
    return this;
  }, "removeAllListeners");
  function fi(r, e, t) {
    var n = r._events;
    if (n === void 0) return [];
    var i = n[e];
    return i === void 0 ? [] : typeof i == "function" ? t ? [i.listener || i] : [i] : t ? ca(i) : pi(i, i.length);
  }
  __name(fi, "fi");
  __name2(fi, "fi");
  a(fi, "_listeners");
  B.prototype.listeners = a(function(e) {
    return fi(this, e, true);
  }, "listeners");
  B.prototype.rawListeners = a(function(e) {
    return fi(this, e, false);
  }, "rawListeners");
  B.listenerCount = function(r, e) {
    return typeof r.listenerCount == "function" ? r.listenerCount(e) : hi.call(r, e);
  };
  B.prototype.listenerCount = hi;
  function hi(r) {
    var e = this._events;
    if (e !== void 0) {
      var t = e[r];
      if (typeof t == "function")
        return 1;
      if (t !== void 0) return t.length;
    }
    return 0;
  }
  __name(hi, "hi");
  __name2(hi, "hi");
  a(hi, "listenerCount");
  B.prototype.eventNames = a(function() {
    return this._eventsCount > 0 ? pt(this._events) : [];
  }, "eventNames");
  function pi(r, e) {
    for (var t = new Array(e), n = 0; n < e; ++n) t[n] = r[n];
    return t;
  }
  __name(pi, "pi");
  __name2(pi, "pi");
  a(pi, "arrayClone");
  function ua(r, e) {
    for (; e + 1 < r.length; e++) r[e] = r[e + 1];
    r.pop();
  }
  __name(ua, "ua");
  __name2(ua, "ua");
  a(ua, "spliceOne");
  function ca(r) {
    for (var e = new Array(r.length), t = 0; t < e.length; ++t) e[t] = r[t].listener || r[t];
    return e;
  }
  __name(ca, "ca");
  __name2(ca, "ca");
  a(ca, "unwrapListeners");
  function la(r, e) {
    return new Promise(function(t, n) {
      function i(o) {
        r.removeListener(e, s2), n(o);
      }
      __name(i, "i");
      __name2(i, "i");
      a(i, "errorListener");
      function s2() {
        typeof r.removeListener == "function" && r.removeListener("error", i), t([].slice.call(arguments));
      }
      __name(s2, "s2");
      __name2(s2, "s");
      a(s2, "resolver"), di(r, e, s2, { once: true }), e !== "error" && fa(r, i, { once: true });
    });
  }
  __name(la, "la");
  __name2(la, "la");
  a(la, "once");
  function fa(r, e, t) {
    typeof r.on == "function" && di(r, "error", e, t);
  }
  __name(fa, "fa");
  __name2(fa, "fa");
  a(
    fa,
    "addErrorHandlerIfEventEmitter"
  );
  function di(r, e, t, n) {
    if (typeof r.on == "function") n.once ? r.once(e, t) : r.on(e, t);
    else if (typeof r.addEventListener == "function") r.addEventListener(e, a(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function i(s2) {
      n.once && r.removeEventListener(e, i), t(s2);
    }, "i"), "i"), "wrapListener"));
    else throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof r);
  }
  __name(di, "di");
  __name2(di, "di");
  a(di, "eventTargetAgnosticAddListener");
});
var wi = {};
ie(wi, { Socket: /* @__PURE__ */ __name2(() => ce, "Socket"), isIP: /* @__PURE__ */ __name2(() => ha, "isIP") });
function ha(r) {
  return 0;
}
__name(ha, "ha");
__name2(ha, "ha");
var mi;
var yi;
var S;
var ce;
var Fe = G(() => {
  "use strict";
  p();
  mi = Se(ge(), 1);
  a(ha, "isIP");
  yi = /^[^.]+\./, S = class S2 extends mi.EventEmitter {
    static {
      __name(this, "S2");
    }
    static {
      __name2(this, "S");
    }
    constructor() {
      super(...arguments);
      E(this, "opts", {});
      E(this, "connecting", false);
      E(this, "pending", true);
      E(
        this,
        "writable",
        true
      );
      E(this, "encrypted", false);
      E(this, "authorized", false);
      E(this, "destroyed", false);
      E(this, "ws", null);
      E(this, "writeBuffer");
      E(this, "tlsState", 0);
      E(this, "tlsRead");
      E(this, "tlsWrite");
    }
    static get poolQueryViaFetch() {
      return S2.opts.poolQueryViaFetch ?? S2.defaults.poolQueryViaFetch;
    }
    static set poolQueryViaFetch(t) {
      S2.opts.poolQueryViaFetch = t;
    }
    static get fetchEndpoint() {
      return S2.opts.fetchEndpoint ?? S2.defaults.fetchEndpoint;
    }
    static set fetchEndpoint(t) {
      S2.opts.fetchEndpoint = t;
    }
    static get fetchConnectionCache() {
      return true;
    }
    static set fetchConnectionCache(t) {
      console.warn("The `fetchConnectionCache` option is deprecated (now always `true`)");
    }
    static get fetchFunction() {
      return S2.opts.fetchFunction ?? S2.defaults.fetchFunction;
    }
    static set fetchFunction(t) {
      S2.opts.fetchFunction = t;
    }
    static get webSocketConstructor() {
      return S2.opts.webSocketConstructor ?? S2.defaults.webSocketConstructor;
    }
    static set webSocketConstructor(t) {
      S2.opts.webSocketConstructor = t;
    }
    get webSocketConstructor() {
      return this.opts.webSocketConstructor ?? S2.webSocketConstructor;
    }
    set webSocketConstructor(t) {
      this.opts.webSocketConstructor = t;
    }
    static get wsProxy() {
      return S2.opts.wsProxy ?? S2.defaults.wsProxy;
    }
    static set wsProxy(t) {
      S2.opts.wsProxy = t;
    }
    get wsProxy() {
      return this.opts.wsProxy ?? S2.wsProxy;
    }
    set wsProxy(t) {
      this.opts.wsProxy = t;
    }
    static get coalesceWrites() {
      return S2.opts.coalesceWrites ?? S2.defaults.coalesceWrites;
    }
    static set coalesceWrites(t) {
      S2.opts.coalesceWrites = t;
    }
    get coalesceWrites() {
      return this.opts.coalesceWrites ?? S2.coalesceWrites;
    }
    set coalesceWrites(t) {
      this.opts.coalesceWrites = t;
    }
    static get useSecureWebSocket() {
      return S2.opts.useSecureWebSocket ?? S2.defaults.useSecureWebSocket;
    }
    static set useSecureWebSocket(t) {
      S2.opts.useSecureWebSocket = t;
    }
    get useSecureWebSocket() {
      return this.opts.useSecureWebSocket ?? S2.useSecureWebSocket;
    }
    set useSecureWebSocket(t) {
      this.opts.useSecureWebSocket = t;
    }
    static get forceDisablePgSSL() {
      return S2.opts.forceDisablePgSSL ?? S2.defaults.forceDisablePgSSL;
    }
    static set forceDisablePgSSL(t) {
      S2.opts.forceDisablePgSSL = t;
    }
    get forceDisablePgSSL() {
      return this.opts.forceDisablePgSSL ?? S2.forceDisablePgSSL;
    }
    set forceDisablePgSSL(t) {
      this.opts.forceDisablePgSSL = t;
    }
    static get disableSNI() {
      return S2.opts.disableSNI ?? S2.defaults.disableSNI;
    }
    static set disableSNI(t) {
      S2.opts.disableSNI = t;
    }
    get disableSNI() {
      return this.opts.disableSNI ?? S2.disableSNI;
    }
    set disableSNI(t) {
      this.opts.disableSNI = t;
    }
    static get disableWarningInBrowsers() {
      return S2.opts.disableWarningInBrowsers ?? S2.defaults.disableWarningInBrowsers;
    }
    static set disableWarningInBrowsers(t) {
      S2.opts.disableWarningInBrowsers = t;
    }
    get disableWarningInBrowsers() {
      return this.opts.disableWarningInBrowsers ?? S2.disableWarningInBrowsers;
    }
    set disableWarningInBrowsers(t) {
      this.opts.disableWarningInBrowsers = t;
    }
    static get pipelineConnect() {
      return S2.opts.pipelineConnect ?? S2.defaults.pipelineConnect;
    }
    static set pipelineConnect(t) {
      S2.opts.pipelineConnect = t;
    }
    get pipelineConnect() {
      return this.opts.pipelineConnect ?? S2.pipelineConnect;
    }
    set pipelineConnect(t) {
      this.opts.pipelineConnect = t;
    }
    static get subtls() {
      return S2.opts.subtls ?? S2.defaults.subtls;
    }
    static set subtls(t) {
      S2.opts.subtls = t;
    }
    get subtls() {
      return this.opts.subtls ?? S2.subtls;
    }
    set subtls(t) {
      this.opts.subtls = t;
    }
    static get pipelineTLS() {
      return S2.opts.pipelineTLS ?? S2.defaults.pipelineTLS;
    }
    static set pipelineTLS(t) {
      S2.opts.pipelineTLS = t;
    }
    get pipelineTLS() {
      return this.opts.pipelineTLS ?? S2.pipelineTLS;
    }
    set pipelineTLS(t) {
      this.opts.pipelineTLS = t;
    }
    static get rootCerts() {
      return S2.opts.rootCerts ?? S2.defaults.rootCerts;
    }
    static set rootCerts(t) {
      S2.opts.rootCerts = t;
    }
    get rootCerts() {
      return this.opts.rootCerts ?? S2.rootCerts;
    }
    set rootCerts(t) {
      this.opts.rootCerts = t;
    }
    wsProxyAddrForHost(t, n) {
      let i = this.wsProxy;
      if (i === void 0) throw new Error("No WebSocket proxy is configured. Please see https://github.com/neondatabase/serverless/blob/main/CONFIG.md#wsproxy-string--host-string-port-number--string--string");
      return typeof i == "function" ? i(t, n) : `${i}?address=${t}:${n}`;
    }
    setNoDelay() {
      return this;
    }
    setKeepAlive() {
      return this;
    }
    ref() {
      return this;
    }
    unref() {
      return this;
    }
    connect(t, n, i) {
      this.connecting = true, i && this.once("connect", i);
      let s2 = a(() => {
        this.connecting = false, this.pending = false, this.emit("connect"), this.emit("ready");
      }, "handleWebSocketOpen"), o = a((c, l = false) => {
        c.binaryType = "arraybuffer", c.addEventListener("error", (f) => {
          this.emit("error", f), this.emit("close");
        }), c.addEventListener("message", (f) => {
          if (this.tlsState === 0) {
            let y = d.from(f.data);
            this.emit("data", y);
          }
        }), c.addEventListener("close", () => {
          this.emit("close");
        }), l ? s2() : c.addEventListener(
          "open",
          s2
        );
      }, "configureWebSocket"), u;
      try {
        u = this.wsProxyAddrForHost(n, typeof t == "string" ? parseInt(t, 10) : t);
      } catch (c) {
        this.emit("error", c), this.emit("close");
        return;
      }
      try {
        let l = (this.useSecureWebSocket ? "wss:" : "ws:") + "//" + u;
        if (this.webSocketConstructor !== void 0) this.ws = new this.webSocketConstructor(l), o(this.ws);
        else try {
          this.ws = new WebSocket(l), o(this.ws);
        } catch {
          this.ws = new __unstable_WebSocket(l), o(this.ws);
        }
      } catch (c) {
        let f = (this.useSecureWebSocket ? "https:" : "http:") + "//" + u;
        fetch(f, { headers: { Upgrade: "websocket" } }).then(
          (y) => {
            if (this.ws = y.webSocket, this.ws == null) throw c;
            this.ws.accept(), o(this.ws, true);
          }
        ).catch((y) => {
          this.emit(
            "error",
            new Error(`All attempts to open a WebSocket to connect to the database failed. Please refer to https://github.com/neondatabase/serverless/blob/main/CONFIG.md#websocketconstructor-typeof-websocket--undefined. Details: ${y}`)
          ), this.emit("close");
        });
      }
    }
    async startTls(t) {
      if (this.subtls === void 0) throw new Error(
        "For Postgres SSL connections, you must set `neonConfig.subtls` to the subtls library. See https://github.com/neondatabase/serverless/blob/main/CONFIG.md for more information."
      );
      this.tlsState = 1;
      let n = await this.subtls.TrustedCert.databaseFromPEM(this.rootCerts), i = new this.subtls.WebSocketReadQueue(this.ws), s2 = i.read.bind(i), o = this.rawWrite.bind(this), { read: u, write: c } = await this.subtls.startTls(t, n, s2, o, { useSNI: !this.disableSNI, expectPreData: this.pipelineTLS ? new Uint8Array([83]) : void 0 });
      this.tlsRead = u, this.tlsWrite = c, this.tlsState = 2, this.encrypted = true, this.authorized = true, this.emit("secureConnection", this), this.tlsReadLoop();
    }
    async tlsReadLoop() {
      for (; ; ) {
        let t = await this.tlsRead();
        if (t === void 0) break;
        {
          let n = d.from(t);
          this.emit("data", n);
        }
      }
    }
    rawWrite(t) {
      if (!this.coalesceWrites) {
        this.ws && this.ws.send(t);
        return;
      }
      if (this.writeBuffer === void 0) this.writeBuffer = t, setTimeout(() => {
        this.ws && this.ws.send(this.writeBuffer), this.writeBuffer = void 0;
      }, 0);
      else {
        let n = new Uint8Array(
          this.writeBuffer.length + t.length
        );
        n.set(this.writeBuffer), n.set(t, this.writeBuffer.length), this.writeBuffer = n;
      }
    }
    write(t, n = "utf8", i = (s2) => {
    }) {
      return t.length === 0 ? (i(), true) : (typeof t == "string" && (t = d.from(t, n)), this.tlsState === 0 ? (this.rawWrite(t), i()) : this.tlsState === 1 ? this.once("secureConnection", () => {
        this.write(
          t,
          n,
          i
        );
      }) : (this.tlsWrite(t), i()), true);
    }
    end(t = d.alloc(0), n = "utf8", i = () => {
    }) {
      return this.write(t, n, () => {
        this.ws.close(), i();
      }), this;
    }
    destroy() {
      return this.destroyed = true, this.end();
    }
  };
  a(S, "Socket"), E(S, "defaults", {
    poolQueryViaFetch: false,
    fetchEndpoint: a((t, n, i) => {
      let s2;
      return i?.jwtAuth ? s2 = t.replace(yi, "apiauth.") : s2 = t.replace(yi, "api."), "https://" + s2 + "/sql";
    }, "fetchEndpoint"),
    fetchConnectionCache: true,
    fetchFunction: void 0,
    webSocketConstructor: void 0,
    wsProxy: a((t) => t + "/v2", "wsProxy"),
    useSecureWebSocket: true,
    forceDisablePgSSL: true,
    coalesceWrites: true,
    pipelineConnect: "password",
    subtls: void 0,
    rootCerts: "",
    pipelineTLS: false,
    disableSNI: false,
    disableWarningInBrowsers: false
  }), E(S, "opts", {});
  ce = S;
});
var gi = {};
ie(gi, { parse: /* @__PURE__ */ __name2(() => Yt, "parse") });
function Yt(r, e = false) {
  let { protocol: t } = new URL(r), n = "http:" + r.substring(
    t.length
  ), { username: i, password: s2, host: o, hostname: u, port: c, pathname: l, search: f, searchParams: y, hash: g } = new URL(
    n
  );
  s2 = decodeURIComponent(s2), i = decodeURIComponent(i), l = decodeURIComponent(l);
  let A = i + ":" + s2, C = e ? Object.fromEntries(y.entries()) : f;
  return {
    href: r,
    protocol: t,
    auth: A,
    username: i,
    password: s2,
    host: o,
    hostname: u,
    port: c,
    pathname: l,
    search: f,
    query: C,
    hash: g
  };
}
__name(Yt, "Yt");
__name2(Yt, "Yt");
var Zt = G(() => {
  "use strict";
  p();
  a(Yt, "parse");
});
var tr = T((Ai) => {
  "use strict";
  p();
  Ai.parse = function(r, e) {
    return new er(r, e).parse();
  };
  var vt = class vt2 {
    static {
      __name(this, "vt2");
    }
    static {
      __name2(this, "vt");
    }
    constructor(e, t) {
      this.source = e, this.transform = t || Ca, this.position = 0, this.entries = [], this.recorded = [], this.dimension = 0;
    }
    isEof() {
      return this.position >= this.source.length;
    }
    nextCharacter() {
      var e = this.source[this.position++];
      return e === "\\" ? { value: this.source[this.position++], escaped: true } : { value: e, escaped: false };
    }
    record(e) {
      this.recorded.push(
        e
      );
    }
    newEntry(e) {
      var t;
      (this.recorded.length > 0 || e) && (t = this.recorded.join(""), t === "NULL" && !e && (t = null), t !== null && (t = this.transform(t)), this.entries.push(t), this.recorded = []);
    }
    consumeDimensions() {
      if (this.source[0] === "[") for (; !this.isEof(); ) {
        var e = this.nextCharacter();
        if (e.value === "=") break;
      }
    }
    parse(e) {
      var t, n, i;
      for (this.consumeDimensions(); !this.isEof(); ) if (t = this.nextCharacter(), t.value === "{" && !i) this.dimension++, this.dimension > 1 && (n = new vt2(this.source.substr(this.position - 1), this.transform), this.entries.push(n.parse(
        true
      )), this.position += n.position - 2);
      else if (t.value === "}" && !i) {
        if (this.dimension--, !this.dimension && (this.newEntry(), e)) return this.entries;
      } else t.value === '"' && !t.escaped ? (i && this.newEntry(true), i = !i) : t.value === "," && !i ? this.newEntry() : this.record(t.value);
      if (this.dimension !== 0) throw new Error("array dimension not balanced");
      return this.entries;
    }
  };
  a(vt, "ArrayParser");
  var er = vt;
  function Ca(r) {
    return r;
  }
  __name(Ca, "Ca");
  __name2(Ca, "Ca");
  a(Ca, "identity");
});
var rr = T((Zl, Ci) => {
  p();
  var _a = tr();
  Ci.exports = { create: a(function(r, e) {
    return { parse: a(function() {
      return _a.parse(r, e);
    }, "parse") };
  }, "create") };
});
var Ti = T((ef, Ii) => {
  "use strict";
  p();
  var Ia = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/, Ta = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/, Pa = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/, Ba = /^-?infinity$/;
  Ii.exports = a(function(e) {
    if (Ba.test(e)) return Number(e.replace("i", "I"));
    var t = Ia.exec(e);
    if (!t) return Ra(
      e
    ) || null;
    var n = !!t[8], i = parseInt(t[1], 10);
    n && (i = _i(i));
    var s2 = parseInt(t[2], 10) - 1, o = t[3], u = parseInt(
      t[4],
      10
    ), c = parseInt(t[5], 10), l = parseInt(t[6], 10), f = t[7];
    f = f ? 1e3 * parseFloat(f) : 0;
    var y, g = La(e);
    return g != null ? (y = new Date(Date.UTC(i, s2, o, u, c, l, f)), nr(i) && y.setUTCFullYear(i), g !== 0 && y.setTime(y.getTime() - g)) : (y = new Date(i, s2, o, u, c, l, f), nr(i) && y.setFullYear(i)), y;
  }, "parseDate");
  function Ra(r) {
    var e = Ta.exec(r);
    if (e) {
      var t = parseInt(e[1], 10), n = !!e[4];
      n && (t = _i(t));
      var i = parseInt(e[2], 10) - 1, s2 = e[3], o = new Date(t, i, s2);
      return nr(
        t
      ) && o.setFullYear(t), o;
    }
  }
  __name(Ra, "Ra");
  __name2(Ra, "Ra");
  a(Ra, "getDate");
  function La(r) {
    if (r.endsWith("+00")) return 0;
    var e = Pa.exec(r.split(" ")[1]);
    if (e) {
      var t = e[1];
      if (t === "Z") return 0;
      var n = t === "-" ? -1 : 1, i = parseInt(e[2], 10) * 3600 + parseInt(
        e[3] || 0,
        10
      ) * 60 + parseInt(e[4] || 0, 10);
      return i * n * 1e3;
    }
  }
  __name(La, "La");
  __name2(La, "La");
  a(La, "timeZoneOffset");
  function _i(r) {
    return -(r - 1);
  }
  __name(_i, "_i");
  __name2(_i, "_i");
  a(_i, "bcYearToNegativeYear");
  function nr(r) {
    return r >= 0 && r < 100;
  }
  __name(nr, "nr");
  __name2(nr, "nr");
  a(nr, "is0To99");
});
var Bi = T((nf, Pi) => {
  p();
  Pi.exports = ka;
  var Fa = Object.prototype.hasOwnProperty;
  function ka(r) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var n in t) Fa.call(t, n) && (r[n] = t[n]);
    }
    return r;
  }
  __name(ka, "ka");
  __name2(ka, "ka");
  a(ka, "extend");
});
var Fi = T((af, Li) => {
  "use strict";
  p();
  var Ma = Bi();
  Li.exports = ke;
  function ke(r) {
    if (!(this instanceof ke))
      return new ke(r);
    Ma(this, Va(r));
  }
  __name(ke, "ke");
  __name2(ke, "ke");
  a(ke, "PostgresInterval");
  var Ua = [
    "seconds",
    "minutes",
    "hours",
    "days",
    "months",
    "years"
  ];
  ke.prototype.toPostgres = function() {
    var r = Ua.filter(this.hasOwnProperty, this);
    return this.milliseconds && r.indexOf("seconds") < 0 && r.push("seconds"), r.length === 0 ? "0" : r.map(function(e) {
      var t = this[e] || 0;
      return e === "seconds" && this.milliseconds && (t = (t + this.milliseconds / 1e3).toFixed(6).replace(
        /\.?0+$/,
        ""
      )), t + " " + e;
    }, this).join(" ");
  };
  var Da = { years: "Y", months: "M", days: "D", hours: "H", minutes: "M", seconds: "S" }, Oa = ["years", "months", "days"], qa = ["hours", "minutes", "seconds"];
  ke.prototype.toISOString = ke.prototype.toISO = function() {
    var r = Oa.map(t, this).join(""), e = qa.map(t, this).join("");
    return "P" + r + "T" + e;
    function t(n) {
      var i = this[n] || 0;
      return n === "seconds" && this.milliseconds && (i = (i + this.milliseconds / 1e3).toFixed(6).replace(
        /0+$/,
        ""
      )), i + Da[n];
    }
    __name(t, "t");
    __name2(t, "t");
  };
  var ir = "([+-]?\\d+)", Qa = ir + "\\s+years?", Na = ir + "\\s+mons?", Wa = ir + "\\s+days?", ja = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?", Ha = new RegExp([Qa, Na, Wa, ja].map(function(r) {
    return "(" + r + ")?";
  }).join("\\s*")), Ri = { years: 2, months: 4, days: 6, hours: 9, minutes: 10, seconds: 11, milliseconds: 12 }, $a = ["hours", "minutes", "seconds", "milliseconds"];
  function Ga(r) {
    var e = r + "000000".slice(r.length);
    return parseInt(
      e,
      10
    ) / 1e3;
  }
  __name(Ga, "Ga");
  __name2(Ga, "Ga");
  a(Ga, "parseMilliseconds");
  function Va(r) {
    if (!r) return {};
    var e = Ha.exec(r), t = e[8] === "-";
    return Object.keys(Ri).reduce(function(n, i) {
      var s2 = Ri[i], o = e[s2];
      return !o || (o = i === "milliseconds" ? Ga(o) : parseInt(o, 10), !o) || (t && ~$a.indexOf(i) && (o *= -1), n[i] = o), n;
    }, {});
  }
  __name(Va, "Va");
  __name2(Va, "Va");
  a(Va, "parse");
});
var Mi = T((lf, ki) => {
  "use strict";
  p();
  ki.exports = a(function(e) {
    if (/^\\x/.test(e)) return new d(e.substr(
      2
    ), "hex");
    for (var t = "", n = 0; n < e.length; ) if (e[n] !== "\\") t += e[n], ++n;
    else if (/[0-7]{3}/.test(e.substr(n + 1, 3))) t += String.fromCharCode(parseInt(e.substr(n + 1, 3), 8)), n += 4;
    else {
      for (var i = 1; n + i < e.length && e[n + i] === "\\"; ) i++;
      for (var s2 = 0; s2 < Math.floor(i / 2); ++s2) t += "\\";
      n += Math.floor(i / 2) * 2;
    }
    return new d(t, "binary");
  }, "parseBytea");
});
var Wi = T((pf, Ni) => {
  p();
  var Ve = tr(), ze = rr(), xt = Ti(), Di = Fi(), Oi = Mi();
  function St(r) {
    return a(function(t) {
      return t === null ? t : r(t);
    }, "nullAllowed");
  }
  __name(St, "St");
  __name2(St, "St");
  a(St, "allowNull");
  function qi(r) {
    return r === null ? r : r === "TRUE" || r === "t" || r === "true" || r === "y" || r === "yes" || r === "on" || r === "1";
  }
  __name(qi, "qi");
  __name2(qi, "qi");
  a(qi, "parseBool");
  function za(r) {
    return r ? Ve.parse(r, qi) : null;
  }
  __name(za, "za");
  __name2(za, "za");
  a(za, "parseBoolArray");
  function Ka(r) {
    return parseInt(r, 10);
  }
  __name(Ka, "Ka");
  __name2(Ka, "Ka");
  a(Ka, "parseBaseTenInt");
  function sr(r) {
    return r ? Ve.parse(r, St(Ka)) : null;
  }
  __name(sr, "sr");
  __name2(sr, "sr");
  a(sr, "parseIntegerArray");
  function Ya(r) {
    return r ? Ve.parse(r, St(function(e) {
      return Qi(e).trim();
    })) : null;
  }
  __name(Ya, "Ya");
  __name2(Ya, "Ya");
  a(Ya, "parseBigIntegerArray");
  var Za = a(function(r) {
    if (!r) return null;
    var e = ze.create(r, function(t) {
      return t !== null && (t = cr(t)), t;
    });
    return e.parse();
  }, "parsePointArray"), or2 = a(function(r) {
    if (!r) return null;
    var e = ze.create(r, function(t) {
      return t !== null && (t = parseFloat(t)), t;
    });
    return e.parse();
  }, "parseFloatArray"), re = a(function(r) {
    if (!r) return null;
    var e = ze.create(r);
    return e.parse();
  }, "parseStringArray"), ar = a(function(r) {
    if (!r) return null;
    var e = ze.create(
      r,
      function(t) {
        return t !== null && (t = xt(t)), t;
      }
    );
    return e.parse();
  }, "parseDateArray"), Ja = a(function(r) {
    if (!r)
      return null;
    var e = ze.create(r, function(t) {
      return t !== null && (t = Di(t)), t;
    });
    return e.parse();
  }, "parseIntervalArray"), Xa = a(function(r) {
    return r ? Ve.parse(r, St(Oi)) : null;
  }, "parseByteAArray"), ur = a(function(r) {
    return parseInt(r, 10);
  }, "parseInteger"), Qi = a(function(r) {
    var e = String(r);
    return /^\d+$/.test(e) ? e : r;
  }, "parseBigInteger"), Ui = a(function(r) {
    return r ? Ve.parse(r, St(JSON.parse)) : null;
  }, "parseJsonArray"), cr = a(
    function(r) {
      return r[0] !== "(" ? null : (r = r.substring(1, r.length - 1).split(","), { x: parseFloat(r[0]), y: parseFloat(
        r[1]
      ) });
    },
    "parsePoint"
  ), eu = a(function(r) {
    if (r[0] !== "<" && r[1] !== "(") return null;
    for (var e = "(", t = "", n = false, i = 2; i < r.length - 1; i++) {
      if (n || (e += r[i]), r[i] === ")") {
        n = true;
        continue;
      } else if (!n) continue;
      r[i] !== "," && (t += r[i]);
    }
    var s2 = cr(e);
    return s2.radius = parseFloat(t), s2;
  }, "parseCircle"), tu = a(function(r) {
    r(20, Qi), r(21, ur), r(23, ur), r(26, ur), r(700, parseFloat), r(701, parseFloat), r(16, qi), r(1082, xt), r(1114, xt), r(1184, xt), r(
      600,
      cr
    ), r(651, re), r(718, eu), r(1e3, za), r(1001, Xa), r(1005, sr), r(1007, sr), r(1028, sr), r(1016, Ya), r(1017, Za), r(1021, or2), r(1022, or2), r(1231, or2), r(1014, re), r(1015, re), r(1008, re), r(1009, re), r(1040, re), r(1041, re), r(
      1115,
      ar
    ), r(1182, ar), r(1185, ar), r(1186, Di), r(1187, Ja), r(17, Oi), r(114, JSON.parse.bind(JSON)), r(3802, JSON.parse.bind(JSON)), r(199, Ui), r(3807, Ui), r(3907, re), r(2951, re), r(791, re), r(1183, re), r(1270, re);
  }, "init");
  Ni.exports = { init: tu };
});
var Hi = T((mf, ji) => {
  "use strict";
  p();
  var z = 1e6;
  function ru(r) {
    var e = r.readInt32BE(0), t = r.readUInt32BE(
      4
    ), n = "";
    e < 0 && (e = ~e + (t === 0), t = ~t + 1 >>> 0, n = "-");
    var i = "", s2, o, u, c, l, f;
    {
      if (s2 = e % z, e = e / z >>> 0, o = 4294967296 * s2 + t, t = o / z >>> 0, u = "" + (o - z * t), t === 0 && e === 0) return n + u + i;
      for (c = "", l = 6 - u.length, f = 0; f < l; f++) c += "0";
      i = c + u + i;
    }
    {
      if (s2 = e % z, e = e / z >>> 0, o = 4294967296 * s2 + t, t = o / z >>> 0, u = "" + (o - z * t), t === 0 && e === 0) return n + u + i;
      for (c = "", l = 6 - u.length, f = 0; f < l; f++) c += "0";
      i = c + u + i;
    }
    {
      if (s2 = e % z, e = e / z >>> 0, o = 4294967296 * s2 + t, t = o / z >>> 0, u = "" + (o - z * t), t === 0 && e === 0) return n + u + i;
      for (c = "", l = 6 - u.length, f = 0; f < l; f++) c += "0";
      i = c + u + i;
    }
    return s2 = e % z, o = 4294967296 * s2 + t, u = "" + o % z, n + u + i;
  }
  __name(ru, "ru");
  __name2(ru, "ru");
  a(ru, "readInt8");
  ji.exports = ru;
});
var Ki = T((bf, zi) => {
  p();
  var nu = Hi(), L2 = a(function(r, e, t, n, i) {
    t = t || 0, n = n || false, i = i || function(A, C, D2) {
      return A * Math.pow(2, D2) + C;
    };
    var s2 = t >> 3, o = a(function(A) {
      return n ? ~A & 255 : A;
    }, "inv"), u = 255, c = 8 - t % 8;
    e < c && (u = 255 << 8 - e & 255, c = e), t && (u = u >> t % 8);
    var l = 0;
    t % 8 + e >= 8 && (l = i(0, o(r[s2]) & u, c));
    for (var f = e + t >> 3, y = s2 + 1; y < f; y++) l = i(l, o(
      r[y]
    ), 8);
    var g = (e + t) % 8;
    return g > 0 && (l = i(l, o(r[f]) >> 8 - g, g)), l;
  }, "parseBits"), Vi = a(function(r, e, t) {
    var n = Math.pow(2, t - 1) - 1, i = L2(r, 1), s2 = L2(r, t, 1);
    if (s2 === 0) return 0;
    var o = 1, u = a(function(l, f, y) {
      l === 0 && (l = 1);
      for (var g = 1; g <= y; g++) o /= 2, (f & 1 << y - g) > 0 && (l += o);
      return l;
    }, "parsePrecisionBits"), c = L2(r, e, t + 1, false, u);
    return s2 == Math.pow(
      2,
      t + 1
    ) - 1 ? c === 0 ? i === 0 ? 1 / 0 : -1 / 0 : NaN : (i === 0 ? 1 : -1) * Math.pow(2, s2 - n) * c;
  }, "parseFloatFromBits"), iu = a(function(r) {
    return L2(r, 1) == 1 ? -1 * (L2(r, 15, 1, true) + 1) : L2(r, 15, 1);
  }, "parseInt16"), $i = a(function(r) {
    return L2(r, 1) == 1 ? -1 * (L2(
      r,
      31,
      1,
      true
    ) + 1) : L2(r, 31, 1);
  }, "parseInt32"), su = a(function(r) {
    return Vi(r, 23, 8);
  }, "parseFloat32"), ou = a(function(r) {
    return Vi(r, 52, 11);
  }, "parseFloat64"), au = a(function(r) {
    var e = L2(r, 16, 32);
    if (e == 49152) return NaN;
    for (var t = Math.pow(1e4, L2(r, 16, 16)), n = 0, i = [], s2 = L2(r, 16), o = 0; o < s2; o++) n += L2(r, 16, 64 + 16 * o) * t, t /= 1e4;
    var u = Math.pow(10, L2(
      r,
      16,
      48
    ));
    return (e === 0 ? 1 : -1) * Math.round(n * u) / u;
  }, "parseNumeric"), Gi = a(function(r, e) {
    var t = L2(e, 1), n = L2(
      e,
      63,
      1
    ), i = new Date((t === 0 ? 1 : -1) * n / 1e3 + 9466848e5);
    return r || i.setTime(i.getTime() + i.getTimezoneOffset() * 6e4), i.usec = n % 1e3, i.getMicroSeconds = function() {
      return this.usec;
    }, i.setMicroSeconds = function(s2) {
      this.usec = s2;
    }, i.getUTCMicroSeconds = function() {
      return this.usec;
    }, i;
  }, "parseDate"), Ke = a(
    function(r) {
      for (var e = L2(
        r,
        32
      ), t = L2(r, 32, 32), n = L2(r, 32, 64), i = 96, s2 = [], o = 0; o < e; o++) s2[o] = L2(r, 32, i), i += 32, i += 32;
      var u = a(function(l) {
        var f = L2(r, 32, i);
        if (i += 32, f == 4294967295) return null;
        var y;
        if (l == 23 || l == 20) return y = L2(r, f * 8, i), i += f * 8, y;
        if (l == 25) return y = r.toString(this.encoding, i >> 3, (i += f << 3) >> 3), y;
        console.log("ERROR: ElementType not implemented: " + l);
      }, "parseElement"), c = a(function(l, f) {
        var y = [], g;
        if (l.length > 1) {
          var A = l.shift();
          for (g = 0; g < A; g++) y[g] = c(l, f);
          l.unshift(A);
        } else for (g = 0; g < l[0]; g++) y[g] = u(f);
        return y;
      }, "parse");
      return c(s2, n);
    },
    "parseArray"
  ), uu = a(function(r) {
    return r.toString("utf8");
  }, "parseText"), cu = a(function(r) {
    return r === null ? null : L2(r, 8) > 0;
  }, "parseBool"), lu = a(function(r) {
    r(20, nu), r(21, iu), r(23, $i), r(26, $i), r(1700, au), r(700, su), r(701, ou), r(16, cu), r(1114, Gi.bind(null, false)), r(1184, Gi.bind(null, true)), r(1e3, Ke), r(1007, Ke), r(1016, Ke), r(1008, Ke), r(1009, Ke), r(25, uu);
  }, "init");
  zi.exports = { init: lu };
});
var Zi = T((Sf, Yi) => {
  p();
  Yi.exports = {
    BOOL: 16,
    BYTEA: 17,
    CHAR: 18,
    INT8: 20,
    INT2: 21,
    INT4: 23,
    REGPROC: 24,
    TEXT: 25,
    OID: 26,
    TID: 27,
    XID: 28,
    CID: 29,
    JSON: 114,
    XML: 142,
    PG_NODE_TREE: 194,
    SMGR: 210,
    PATH: 602,
    POLYGON: 604,
    CIDR: 650,
    FLOAT4: 700,
    FLOAT8: 701,
    ABSTIME: 702,
    RELTIME: 703,
    TINTERVAL: 704,
    CIRCLE: 718,
    MACADDR8: 774,
    MONEY: 790,
    MACADDR: 829,
    INET: 869,
    ACLITEM: 1033,
    BPCHAR: 1042,
    VARCHAR: 1043,
    DATE: 1082,
    TIME: 1083,
    TIMESTAMP: 1114,
    TIMESTAMPTZ: 1184,
    INTERVAL: 1186,
    TIMETZ: 1266,
    BIT: 1560,
    VARBIT: 1562,
    NUMERIC: 1700,
    REFCURSOR: 1790,
    REGPROCEDURE: 2202,
    REGOPER: 2203,
    REGOPERATOR: 2204,
    REGCLASS: 2205,
    REGTYPE: 2206,
    UUID: 2950,
    TXID_SNAPSHOT: 2970,
    PG_LSN: 3220,
    PG_NDISTINCT: 3361,
    PG_DEPENDENCIES: 3402,
    TSVECTOR: 3614,
    TSQUERY: 3615,
    GTSVECTOR: 3642,
    REGCONFIG: 3734,
    REGDICTIONARY: 3769,
    JSONB: 3802,
    REGNAMESPACE: 4089,
    REGROLE: 4096
  };
});
var Je = T((Ze) => {
  p();
  var fu = Wi(), hu = Ki(), pu = rr(), du = Zi();
  Ze.getTypeParser = yu;
  Ze.setTypeParser = mu;
  Ze.arrayParser = pu;
  Ze.builtins = du;
  var Ye = { text: {}, binary: {} };
  function Ji(r) {
    return String(r);
  }
  __name(Ji, "Ji");
  __name2(Ji, "Ji");
  a(Ji, "noParse");
  function yu(r, e) {
    return e = e || "text", Ye[e] && Ye[e][r] || Ji;
  }
  __name(yu, "yu");
  __name2(yu, "yu");
  a(yu, "getTypeParser");
  function mu(r, e, t) {
    typeof e == "function" && (t = e, e = "text"), Ye[e][r] = t;
  }
  __name(mu, "mu");
  __name2(mu, "mu");
  a(mu, "setTypeParser");
  fu.init(function(r, e) {
    Ye.text[r] = e;
  });
  hu.init(function(r, e) {
    Ye.binary[r] = e;
  });
});
var At = T((If, Xi) => {
  "use strict";
  p();
  var wu = Je();
  function Et(r) {
    this._types = r || wu, this.text = {}, this.binary = {};
  }
  __name(Et, "Et");
  __name2(Et, "Et");
  a(Et, "TypeOverrides");
  Et.prototype.getOverrides = function(r) {
    switch (r) {
      case "text":
        return this.text;
      case "binary":
        return this.binary;
      default:
        return {};
    }
  };
  Et.prototype.setTypeParser = function(r, e, t) {
    typeof e == "function" && (t = e, e = "text"), this.getOverrides(e)[r] = t;
  };
  Et.prototype.getTypeParser = function(r, e) {
    return e = e || "text", this.getOverrides(e)[r] || this._types.getTypeParser(r, e);
  };
  Xi.exports = Et;
});
function Xe(r) {
  let e = 1779033703, t = 3144134277, n = 1013904242, i = 2773480762, s2 = 1359893119, o = 2600822924, u = 528734635, c = 1541459225, l = 0, f = 0, y = [
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ], g = a((I2, w) => I2 >>> w | I2 << 32 - w, "rrot"), A = new Uint32Array(64), C = new Uint8Array(64), D2 = a(() => {
    for (let R = 0, j = 0; R < 16; R++, j += 4) A[R] = C[j] << 24 | C[j + 1] << 16 | C[j + 2] << 8 | C[j + 3];
    for (let R = 16; R < 64; R++) {
      let j = g(A[R - 15], 7) ^ g(A[R - 15], 18) ^ A[R - 15] >>> 3, le = g(
        A[R - 2],
        17
      ) ^ g(A[R - 2], 19) ^ A[R - 2] >>> 10;
      A[R] = A[R - 16] + j + A[R - 7] + le | 0;
    }
    let I2 = e, w = t, Z = n, W2 = i, J = s2, X = o, se = u, oe = c;
    for (let R = 0; R < 64; R++) {
      let j = g(J, 6) ^ g(J, 11) ^ g(J, 25), le = J & X ^ ~J & se, de = oe + j + le + y[R] + A[R] | 0, We = g(I2, 2) ^ g(
        I2,
        13
      ) ^ g(I2, 22), fe = I2 & w ^ I2 & Z ^ w & Z, _e = We + fe | 0;
      oe = se, se = X, X = J, J = W2 + de | 0, W2 = Z, Z = w, w = I2, I2 = de + _e | 0;
    }
    e = e + I2 | 0, t = t + w | 0, n = n + Z | 0, i = i + W2 | 0, s2 = s2 + J | 0, o = o + X | 0, u = u + se | 0, c = c + oe | 0, f = 0;
  }, "process"), Y = a((I2) => {
    typeof I2 == "string" && (I2 = new TextEncoder().encode(I2));
    for (let w = 0; w < I2.length; w++) C[f++] = I2[w], f === 64 && D2();
    l += I2.length;
  }, "add"), P2 = a(() => {
    if (C[f++] = 128, f == 64 && D2(), f + 8 > 64) {
      for (; f < 64; ) C[f++] = 0;
      D2();
    }
    for (; f < 58; ) C[f++] = 0;
    let I2 = l * 8;
    C[f++] = I2 / 1099511627776 & 255, C[f++] = I2 / 4294967296 & 255, C[f++] = I2 >>> 24, C[f++] = I2 >>> 16 & 255, C[f++] = I2 >>> 8 & 255, C[f++] = I2 & 255, D2();
    let w = new Uint8Array(
      32
    );
    return w[0] = e >>> 24, w[1] = e >>> 16 & 255, w[2] = e >>> 8 & 255, w[3] = e & 255, w[4] = t >>> 24, w[5] = t >>> 16 & 255, w[6] = t >>> 8 & 255, w[7] = t & 255, w[8] = n >>> 24, w[9] = n >>> 16 & 255, w[10] = n >>> 8 & 255, w[11] = n & 255, w[12] = i >>> 24, w[13] = i >>> 16 & 255, w[14] = i >>> 8 & 255, w[15] = i & 255, w[16] = s2 >>> 24, w[17] = s2 >>> 16 & 255, w[18] = s2 >>> 8 & 255, w[19] = s2 & 255, w[20] = o >>> 24, w[21] = o >>> 16 & 255, w[22] = o >>> 8 & 255, w[23] = o & 255, w[24] = u >>> 24, w[25] = u >>> 16 & 255, w[26] = u >>> 8 & 255, w[27] = u & 255, w[28] = c >>> 24, w[29] = c >>> 16 & 255, w[30] = c >>> 8 & 255, w[31] = c & 255, w;
  }, "digest");
  return r === void 0 ? { add: Y, digest: P2 } : (Y(r), P2());
}
__name(Xe, "Xe");
__name2(Xe, "Xe");
var es = G(() => {
  "use strict";
  p();
  a(Xe, "sha256");
});
var U2;
var et;
var ts = G(() => {
  "use strict";
  p();
  U2 = class U3 {
    static {
      __name(this, "U3");
    }
    static {
      __name2(this, "U");
    }
    constructor() {
      E(this, "_dataLength", 0);
      E(this, "_bufferLength", 0);
      E(this, "_state", new Int32Array(4));
      E(this, "_buffer", new ArrayBuffer(68));
      E(this, "_buffer8");
      E(this, "_buffer32");
      this._buffer8 = new Uint8Array(this._buffer, 0, 68), this._buffer32 = new Uint32Array(this._buffer, 0, 17), this.start();
    }
    static hashByteArray(e, t = false) {
      return this.onePassHasher.start().appendByteArray(
        e
      ).end(t);
    }
    static hashStr(e, t = false) {
      return this.onePassHasher.start().appendStr(e).end(t);
    }
    static hashAsciiStr(e, t = false) {
      return this.onePassHasher.start().appendAsciiStr(e).end(t);
    }
    static _hex(e) {
      let t = U3.hexChars, n = U3.hexOut, i, s2, o, u;
      for (u = 0; u < 4; u += 1) for (s2 = u * 8, i = e[u], o = 0; o < 8; o += 2) n[s2 + 1 + o] = t.charAt(i & 15), i >>>= 4, n[s2 + 0 + o] = t.charAt(
        i & 15
      ), i >>>= 4;
      return n.join("");
    }
    static _md5cycle(e, t) {
      let n = e[0], i = e[1], s2 = e[2], o = e[3];
      n += (i & s2 | ~i & o) + t[0] - 680876936 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s2) + t[1] - 389564586 | 0, o = (o << 12 | o >>> 20) + n | 0, s2 += (o & n | ~o & i) + t[2] + 606105819 | 0, s2 = (s2 << 17 | s2 >>> 15) + o | 0, i += (s2 & o | ~s2 & n) + t[3] - 1044525330 | 0, i = (i << 22 | i >>> 10) + s2 | 0, n += (i & s2 | ~i & o) + t[4] - 176418897 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s2) + t[5] + 1200080426 | 0, o = (o << 12 | o >>> 20) + n | 0, s2 += (o & n | ~o & i) + t[6] - 1473231341 | 0, s2 = (s2 << 17 | s2 >>> 15) + o | 0, i += (s2 & o | ~s2 & n) + t[7] - 45705983 | 0, i = (i << 22 | i >>> 10) + s2 | 0, n += (i & s2 | ~i & o) + t[8] + 1770035416 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s2) + t[9] - 1958414417 | 0, o = (o << 12 | o >>> 20) + n | 0, s2 += (o & n | ~o & i) + t[10] - 42063 | 0, s2 = (s2 << 17 | s2 >>> 15) + o | 0, i += (s2 & o | ~s2 & n) + t[11] - 1990404162 | 0, i = (i << 22 | i >>> 10) + s2 | 0, n += (i & s2 | ~i & o) + t[12] + 1804603682 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s2) + t[13] - 40341101 | 0, o = (o << 12 | o >>> 20) + n | 0, s2 += (o & n | ~o & i) + t[14] - 1502002290 | 0, s2 = (s2 << 17 | s2 >>> 15) + o | 0, i += (s2 & o | ~s2 & n) + t[15] + 1236535329 | 0, i = (i << 22 | i >>> 10) + s2 | 0, n += (i & o | s2 & ~o) + t[1] - 165796510 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s2 | i & ~s2) + t[6] - 1069501632 | 0, o = (o << 9 | o >>> 23) + n | 0, s2 += (o & i | n & ~i) + t[11] + 643717713 | 0, s2 = (s2 << 14 | s2 >>> 18) + o | 0, i += (s2 & n | o & ~n) + t[0] - 373897302 | 0, i = (i << 20 | i >>> 12) + s2 | 0, n += (i & o | s2 & ~o) + t[5] - 701558691 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s2 | i & ~s2) + t[10] + 38016083 | 0, o = (o << 9 | o >>> 23) + n | 0, s2 += (o & i | n & ~i) + t[15] - 660478335 | 0, s2 = (s2 << 14 | s2 >>> 18) + o | 0, i += (s2 & n | o & ~n) + t[4] - 405537848 | 0, i = (i << 20 | i >>> 12) + s2 | 0, n += (i & o | s2 & ~o) + t[9] + 568446438 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s2 | i & ~s2) + t[14] - 1019803690 | 0, o = (o << 9 | o >>> 23) + n | 0, s2 += (o & i | n & ~i) + t[3] - 187363961 | 0, s2 = (s2 << 14 | s2 >>> 18) + o | 0, i += (s2 & n | o & ~n) + t[8] + 1163531501 | 0, i = (i << 20 | i >>> 12) + s2 | 0, n += (i & o | s2 & ~o) + t[13] - 1444681467 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s2 | i & ~s2) + t[2] - 51403784 | 0, o = (o << 9 | o >>> 23) + n | 0, s2 += (o & i | n & ~i) + t[7] + 1735328473 | 0, s2 = (s2 << 14 | s2 >>> 18) + o | 0, i += (s2 & n | o & ~n) + t[12] - 1926607734 | 0, i = (i << 20 | i >>> 12) + s2 | 0, n += (i ^ s2 ^ o) + t[5] - 378558 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s2) + t[8] - 2022574463 | 0, o = (o << 11 | o >>> 21) + n | 0, s2 += (o ^ n ^ i) + t[11] + 1839030562 | 0, s2 = (s2 << 16 | s2 >>> 16) + o | 0, i += (s2 ^ o ^ n) + t[14] - 35309556 | 0, i = (i << 23 | i >>> 9) + s2 | 0, n += (i ^ s2 ^ o) + t[1] - 1530992060 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s2) + t[4] + 1272893353 | 0, o = (o << 11 | o >>> 21) + n | 0, s2 += (o ^ n ^ i) + t[7] - 155497632 | 0, s2 = (s2 << 16 | s2 >>> 16) + o | 0, i += (s2 ^ o ^ n) + t[10] - 1094730640 | 0, i = (i << 23 | i >>> 9) + s2 | 0, n += (i ^ s2 ^ o) + t[13] + 681279174 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s2) + t[0] - 358537222 | 0, o = (o << 11 | o >>> 21) + n | 0, s2 += (o ^ n ^ i) + t[3] - 722521979 | 0, s2 = (s2 << 16 | s2 >>> 16) + o | 0, i += (s2 ^ o ^ n) + t[6] + 76029189 | 0, i = (i << 23 | i >>> 9) + s2 | 0, n += (i ^ s2 ^ o) + t[9] - 640364487 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s2) + t[12] - 421815835 | 0, o = (o << 11 | o >>> 21) + n | 0, s2 += (o ^ n ^ i) + t[15] + 530742520 | 0, s2 = (s2 << 16 | s2 >>> 16) + o | 0, i += (s2 ^ o ^ n) + t[2] - 995338651 | 0, i = (i << 23 | i >>> 9) + s2 | 0, n += (s2 ^ (i | ~o)) + t[0] - 198630844 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s2)) + t[7] + 1126891415 | 0, o = (o << 10 | o >>> 22) + n | 0, s2 += (n ^ (o | ~i)) + t[14] - 1416354905 | 0, s2 = (s2 << 15 | s2 >>> 17) + o | 0, i += (o ^ (s2 | ~n)) + t[5] - 57434055 | 0, i = (i << 21 | i >>> 11) + s2 | 0, n += (s2 ^ (i | ~o)) + t[12] + 1700485571 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s2)) + t[3] - 1894986606 | 0, o = (o << 10 | o >>> 22) + n | 0, s2 += (n ^ (o | ~i)) + t[10] - 1051523 | 0, s2 = (s2 << 15 | s2 >>> 17) + o | 0, i += (o ^ (s2 | ~n)) + t[1] - 2054922799 | 0, i = (i << 21 | i >>> 11) + s2 | 0, n += (s2 ^ (i | ~o)) + t[8] + 1873313359 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s2)) + t[15] - 30611744 | 0, o = (o << 10 | o >>> 22) + n | 0, s2 += (n ^ (o | ~i)) + t[6] - 1560198380 | 0, s2 = (s2 << 15 | s2 >>> 17) + o | 0, i += (o ^ (s2 | ~n)) + t[13] + 1309151649 | 0, i = (i << 21 | i >>> 11) + s2 | 0, n += (s2 ^ (i | ~o)) + t[4] - 145523070 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s2)) + t[11] - 1120210379 | 0, o = (o << 10 | o >>> 22) + n | 0, s2 += (n ^ (o | ~i)) + t[2] + 718787259 | 0, s2 = (s2 << 15 | s2 >>> 17) + o | 0, i += (o ^ (s2 | ~n)) + t[9] - 343485551 | 0, i = (i << 21 | i >>> 11) + s2 | 0, e[0] = n + e[0] | 0, e[1] = i + e[1] | 0, e[2] = s2 + e[2] | 0, e[3] = o + e[3] | 0;
    }
    start() {
      return this._dataLength = 0, this._bufferLength = 0, this._state.set(U3.stateIdentity), this;
    }
    appendStr(e) {
      let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s2, o;
      for (o = 0; o < e.length; o += 1) {
        if (s2 = e.charCodeAt(o), s2 < 128) t[i++] = s2;
        else if (s2 < 2048) t[i++] = (s2 >>> 6) + 192, t[i++] = s2 & 63 | 128;
        else if (s2 < 55296 || s2 > 56319) t[i++] = (s2 >>> 12) + 224, t[i++] = s2 >>> 6 & 63 | 128, t[i++] = s2 & 63 | 128;
        else {
          if (s2 = (s2 - 55296) * 1024 + (e.charCodeAt(++o) - 56320) + 65536, s2 > 1114111) throw new Error(
            "Unicode standard supports code points up to U+10FFFF"
          );
          t[i++] = (s2 >>> 18) + 240, t[i++] = s2 >>> 12 & 63 | 128, t[i++] = s2 >>> 6 & 63 | 128, t[i++] = s2 & 63 | 128;
        }
        i >= 64 && (this._dataLength += 64, U3._md5cycle(this._state, n), i -= 64, n[0] = n[16]);
      }
      return this._bufferLength = i, this;
    }
    appendAsciiStr(e) {
      let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s2, o = 0;
      for (; ; ) {
        for (s2 = Math.min(e.length - o, 64 - i); s2--; ) t[i++] = e.charCodeAt(o++);
        if (i < 64) break;
        this._dataLength += 64, U3._md5cycle(this._state, n), i = 0;
      }
      return this._bufferLength = i, this;
    }
    appendByteArray(e) {
      let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s2, o = 0;
      for (; ; ) {
        for (s2 = Math.min(e.length - o, 64 - i); s2--; ) t[i++] = e[o++];
        if (i < 64) break;
        this._dataLength += 64, U3._md5cycle(this._state, n), i = 0;
      }
      return this._bufferLength = i, this;
    }
    getState() {
      let e = this._state;
      return { buffer: String.fromCharCode.apply(null, Array.from(this._buffer8)), buflen: this._bufferLength, length: this._dataLength, state: [e[0], e[1], e[2], e[3]] };
    }
    setState(e) {
      let t = e.buffer, n = e.state, i = this._state, s2;
      for (this._dataLength = e.length, this._bufferLength = e.buflen, i[0] = n[0], i[1] = n[1], i[2] = n[2], i[3] = n[3], s2 = 0; s2 < t.length; s2 += 1) this._buffer8[s2] = t.charCodeAt(s2);
    }
    end(e = false) {
      let t = this._bufferLength, n = this._buffer8, i = this._buffer32, s2 = (t >> 2) + 1;
      this._dataLength += t;
      let o = this._dataLength * 8;
      if (n[t] = 128, n[t + 1] = n[t + 2] = n[t + 3] = 0, i.set(U3.buffer32Identity.subarray(s2), s2), t > 55 && (U3._md5cycle(this._state, i), i.set(U3.buffer32Identity)), o <= 4294967295) i[14] = o;
      else {
        let u = o.toString(16).match(/(.*?)(.{0,8})$/);
        if (u === null) return;
        let c = parseInt(
          u[2],
          16
        ), l = parseInt(u[1], 16) || 0;
        i[14] = c, i[15] = l;
      }
      return U3._md5cycle(this._state, i), e ? this._state : U3._hex(
        this._state
      );
    }
  };
  a(U2, "Md5"), E(U2, "stateIdentity", new Int32Array([1732584193, -271733879, -1732584194, 271733878])), E(U2, "buffer32Identity", new Int32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), E(U2, "hexChars", "0123456789abcdef"), E(U2, "hexOut", []), E(U2, "onePassHasher", new U2());
  et = U2;
});
var lr = {};
ie(lr, { createHash: /* @__PURE__ */ __name2(() => bu, "createHash"), createHmac: /* @__PURE__ */ __name2(() => vu, "createHmac"), randomBytes: /* @__PURE__ */ __name2(() => gu, "randomBytes") });
function gu(r) {
  return crypto.getRandomValues(d.alloc(r));
}
__name(gu, "gu");
__name2(gu, "gu");
function bu(r) {
  if (r === "sha256") return { update: a(function(e) {
    return { digest: a(
      function() {
        return d.from(Xe(e));
      },
      "digest"
    ) };
  }, "update") };
  if (r === "md5") return { update: a(function(e) {
    return {
      digest: a(function() {
        return typeof e == "string" ? et.hashStr(e) : et.hashByteArray(e);
      }, "digest")
    };
  }, "update") };
  throw new Error(`Hash type '${r}' not supported`);
}
__name(bu, "bu");
__name2(bu, "bu");
function vu(r, e) {
  if (r !== "sha256") throw new Error(`Only sha256 is supported (requested: '${r}')`);
  return { update: a(function(t) {
    return { digest: a(
      function() {
        typeof e == "string" && (e = new TextEncoder().encode(e)), typeof t == "string" && (t = new TextEncoder().encode(
          t
        ));
        let n = e.length;
        if (n > 64) e = Xe(e);
        else if (n < 64) {
          let c = new Uint8Array(64);
          c.set(e), e = c;
        }
        let i = new Uint8Array(
          64
        ), s2 = new Uint8Array(64);
        for (let c = 0; c < 64; c++) i[c] = 54 ^ e[c], s2[c] = 92 ^ e[c];
        let o = new Uint8Array(t.length + 64);
        o.set(i, 0), o.set(t, 64);
        let u = new Uint8Array(96);
        return u.set(s2, 0), u.set(Xe(o), 64), d.from(Xe(u));
      },
      "digest"
    ) };
  }, "update") };
}
__name(vu, "vu");
__name2(vu, "vu");
var fr = G(() => {
  "use strict";
  p();
  es();
  ts();
  a(gu, "randomBytes");
  a(bu, "createHash");
  a(vu, "createHmac");
});
var tt = T((Qf, hr) => {
  "use strict";
  p();
  hr.exports = {
    host: "localhost",
    user: m.platform === "win32" ? m.env.USERNAME : m.env.USER,
    database: void 0,
    password: null,
    connectionString: void 0,
    port: 5432,
    rows: 0,
    binary: false,
    max: 10,
    idleTimeoutMillis: 3e4,
    client_encoding: "",
    ssl: false,
    application_name: void 0,
    fallback_application_name: void 0,
    options: void 0,
    parseInputDatesAsUTC: false,
    statement_timeout: false,
    lock_timeout: false,
    idle_in_transaction_session_timeout: false,
    query_timeout: false,
    connect_timeout: 0,
    keepalives: 1,
    keepalives_idle: 0
  };
  var Me = Je(), xu = Me.getTypeParser(20, "text"), Su = Me.getTypeParser(
    1016,
    "text"
  );
  hr.exports.__defineSetter__("parseInt8", function(r) {
    Me.setTypeParser(20, "text", r ? Me.getTypeParser(
      23,
      "text"
    ) : xu), Me.setTypeParser(1016, "text", r ? Me.getTypeParser(1007, "text") : Su);
  });
});
var rt = T((Wf, ns) => {
  "use strict";
  p();
  var Eu = (fr(), O(lr)), Au = tt();
  function Cu(r) {
    var e = r.replace(
      /\\/g,
      "\\\\"
    ).replace(/"/g, '\\"');
    return '"' + e + '"';
  }
  __name(Cu, "Cu");
  __name2(Cu, "Cu");
  a(Cu, "escapeElement");
  function rs(r) {
    for (var e = "{", t = 0; t < r.length; t++) t > 0 && (e = e + ","), r[t] === null || typeof r[t] > "u" ? e = e + "NULL" : Array.isArray(r[t]) ? e = e + rs(r[t]) : r[t] instanceof d ? e += "\\\\x" + r[t].toString("hex") : e += Cu(Ct(r[t]));
    return e = e + "}", e;
  }
  __name(rs, "rs");
  __name2(rs, "rs");
  a(rs, "arrayString");
  var Ct = a(function(r, e) {
    if (r == null) return null;
    if (r instanceof d) return r;
    if (ArrayBuffer.isView(r)) {
      var t = d.from(r.buffer, r.byteOffset, r.byteLength);
      return t.length === r.byteLength ? t : t.slice(r.byteOffset, r.byteOffset + r.byteLength);
    }
    return r instanceof Date ? Au.parseInputDatesAsUTC ? Tu(r) : Iu(r) : Array.isArray(r) ? rs(r) : typeof r == "object" ? _u(r, e) : r.toString();
  }, "prepareValue");
  function _u(r, e) {
    if (r && typeof r.toPostgres == "function") {
      if (e = e || [], e.indexOf(r) !== -1) throw new Error('circular reference detected while preparing "' + r + '" for query');
      return e.push(r), Ct(r.toPostgres(Ct), e);
    }
    return JSON.stringify(r);
  }
  __name(_u, "_u");
  __name2(_u, "_u");
  a(_u, "prepareObject");
  function N(r, e) {
    for (r = "" + r; r.length < e; ) r = "0" + r;
    return r;
  }
  __name(N, "N");
  __name2(N, "N");
  a(N, "pad");
  function Iu(r) {
    var e = -r.getTimezoneOffset(), t = r.getFullYear(), n = t < 1;
    n && (t = Math.abs(t) + 1);
    var i = N(t, 4) + "-" + N(r.getMonth() + 1, 2) + "-" + N(r.getDate(), 2) + "T" + N(
      r.getHours(),
      2
    ) + ":" + N(r.getMinutes(), 2) + ":" + N(r.getSeconds(), 2) + "." + N(r.getMilliseconds(), 3);
    return e < 0 ? (i += "-", e *= -1) : i += "+", i += N(Math.floor(e / 60), 2) + ":" + N(e % 60, 2), n && (i += " BC"), i;
  }
  __name(Iu, "Iu");
  __name2(Iu, "Iu");
  a(Iu, "dateToString");
  function Tu(r) {
    var e = r.getUTCFullYear(), t = e < 1;
    t && (e = Math.abs(e) + 1);
    var n = N(e, 4) + "-" + N(r.getUTCMonth() + 1, 2) + "-" + N(r.getUTCDate(), 2) + "T" + N(r.getUTCHours(), 2) + ":" + N(r.getUTCMinutes(), 2) + ":" + N(r.getUTCSeconds(), 2) + "." + N(
      r.getUTCMilliseconds(),
      3
    );
    return n += "+00:00", t && (n += " BC"), n;
  }
  __name(Tu, "Tu");
  __name2(Tu, "Tu");
  a(Tu, "dateToStringUTC");
  function Pu(r, e, t) {
    return r = typeof r == "string" ? { text: r } : r, e && (typeof e == "function" ? r.callback = e : r.values = e), t && (r.callback = t), r;
  }
  __name(Pu, "Pu");
  __name2(Pu, "Pu");
  a(Pu, "normalizeQueryConfig");
  var pr = a(function(r) {
    return Eu.createHash("md5").update(r, "utf-8").digest("hex");
  }, "md5"), Bu = a(
    function(r, e, t) {
      var n = pr(e + r), i = pr(d.concat([d.from(n), t]));
      return "md5" + i;
    },
    "postgresMd5PasswordHash"
  );
  ns.exports = {
    prepareValue: a(function(e) {
      return Ct(e);
    }, "prepareValueWrapper"),
    normalizeQueryConfig: Pu,
    postgresMd5PasswordHash: Bu,
    md5: pr
  };
});
var nt = {};
ie(nt, { default: /* @__PURE__ */ __name2(() => ku, "default") });
var ku;
var it = G(() => {
  "use strict";
  p();
  ku = {};
});
var ds = T((th, ps) => {
  "use strict";
  p();
  var yr = (fr(), O(lr));
  function Mu(r) {
    if (r.indexOf("SCRAM-SHA-256") === -1) throw new Error("SASL: Only mechanism SCRAM-SHA-256 is currently supported");
    let e = yr.randomBytes(
      18
    ).toString("base64");
    return { mechanism: "SCRAM-SHA-256", clientNonce: e, response: "n,,n=*,r=" + e, message: "SASLInitialResponse" };
  }
  __name(Mu, "Mu");
  __name2(Mu, "Mu");
  a(Mu, "startSession");
  function Uu(r, e, t) {
    if (r.message !== "SASLInitialResponse") throw new Error(
      "SASL: Last message was not SASLInitialResponse"
    );
    if (typeof e != "string") throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
    if (typeof t != "string") throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
    let n = qu(t);
    if (n.nonce.startsWith(r.clientNonce)) {
      if (n.nonce.length === r.clientNonce.length) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
    } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
    var i = d.from(n.salt, "base64"), s2 = Wu(e, i, n.iteration), o = Ue(s2, "Client Key"), u = Nu(
      o
    ), c = "n=*,r=" + r.clientNonce, l = "r=" + n.nonce + ",s=" + n.salt + ",i=" + n.iteration, f = "c=biws,r=" + n.nonce, y = c + "," + l + "," + f, g = Ue(u, y), A = hs(o, g), C = A.toString("base64"), D2 = Ue(s2, "Server Key"), Y = Ue(D2, y);
    r.message = "SASLResponse", r.serverSignature = Y.toString("base64"), r.response = f + ",p=" + C;
  }
  __name(Uu, "Uu");
  __name2(Uu, "Uu");
  a(Uu, "continueSession");
  function Du(r, e) {
    if (r.message !== "SASLResponse") throw new Error("SASL: Last message was not SASLResponse");
    if (typeof e != "string") throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
    let { serverSignature: t } = Qu(
      e
    );
    if (t !== r.serverSignature) throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
  }
  __name(Du, "Du");
  __name2(Du, "Du");
  a(Du, "finalizeSession");
  function Ou(r) {
    if (typeof r != "string") throw new TypeError("SASL: text must be a string");
    return r.split("").map((e, t) => r.charCodeAt(t)).every((e) => e >= 33 && e <= 43 || e >= 45 && e <= 126);
  }
  __name(Ou, "Ou");
  __name2(Ou, "Ou");
  a(Ou, "isPrintableChars");
  function ls(r) {
    return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(r);
  }
  __name(ls, "ls");
  __name2(ls, "ls");
  a(ls, "isBase64");
  function fs(r) {
    if (typeof r != "string") throw new TypeError("SASL: attribute pairs text must be a string");
    return new Map(r.split(",").map((e) => {
      if (!/^.=/.test(e)) throw new Error("SASL: Invalid attribute pair entry");
      let t = e[0], n = e.substring(2);
      return [t, n];
    }));
  }
  __name(fs, "fs");
  __name2(fs, "fs");
  a(fs, "parseAttributePairs");
  function qu(r) {
    let e = fs(r), t = e.get("r");
    if (t) {
      if (!Ou(t)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
    } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
    let n = e.get("s");
    if (n) {
      if (!ls(n)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
    } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
    let i = e.get("i");
    if (i) {
      if (!/^[1-9][0-9]*$/.test(i)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
    } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
    let s2 = parseInt(i, 10);
    return { nonce: t, salt: n, iteration: s2 };
  }
  __name(qu, "qu");
  __name2(qu, "qu");
  a(qu, "parseServerFirstMessage");
  function Qu(r) {
    let t = fs(r).get("v");
    if (t) {
      if (!ls(t)) throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
    } else throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
    return { serverSignature: t };
  }
  __name(Qu, "Qu");
  __name2(Qu, "Qu");
  a(Qu, "parseServerFinalMessage");
  function hs(r, e) {
    if (!d.isBuffer(r)) throw new TypeError("first argument must be a Buffer");
    if (!d.isBuffer(e)) throw new TypeError(
      "second argument must be a Buffer"
    );
    if (r.length !== e.length) throw new Error("Buffer lengths must match");
    if (r.length === 0) throw new Error("Buffers cannot be empty");
    return d.from(r.map((t, n) => r[n] ^ e[n]));
  }
  __name(hs, "hs");
  __name2(hs, "hs");
  a(hs, "xorBuffers");
  function Nu(r) {
    return yr.createHash("sha256").update(r).digest();
  }
  __name(Nu, "Nu");
  __name2(Nu, "Nu");
  a(Nu, "sha256");
  function Ue(r, e) {
    return yr.createHmac("sha256", r).update(e).digest();
  }
  __name(Ue, "Ue");
  __name2(Ue, "Ue");
  a(Ue, "hmacSha256");
  function Wu(r, e, t) {
    for (var n = Ue(
      r,
      d.concat([e, d.from([0, 0, 0, 1])])
    ), i = n, s2 = 0; s2 < t - 1; s2++) n = Ue(r, n), i = hs(i, n);
    return i;
  }
  __name(Wu, "Wu");
  __name2(Wu, "Wu");
  a(Wu, "Hi");
  ps.exports = { startSession: Mu, continueSession: Uu, finalizeSession: Du };
});
var mr = {};
ie(mr, { join: /* @__PURE__ */ __name2(() => ju, "join") });
function ju(...r) {
  return r.join("/");
}
__name(ju, "ju");
__name2(ju, "ju");
var wr = G(() => {
  "use strict";
  p();
  a(
    ju,
    "join"
  );
});
var gr = {};
ie(gr, { stat: /* @__PURE__ */ __name2(() => Hu, "stat") });
function Hu(r, e) {
  e(new Error("No filesystem"));
}
__name(Hu, "Hu");
__name2(Hu, "Hu");
var br = G(() => {
  "use strict";
  p();
  a(Hu, "stat");
});
var vr = {};
ie(vr, { default: /* @__PURE__ */ __name2(() => $u, "default") });
var $u;
var xr = G(() => {
  "use strict";
  p();
  $u = {};
});
var ys = {};
ie(ys, { StringDecoder: /* @__PURE__ */ __name2(() => Sr, "StringDecoder") });
var Er;
var Sr;
var ms = G(() => {
  "use strict";
  p();
  Er = class Er {
    static {
      __name(this, "Er");
    }
    static {
      __name2(this, "Er");
    }
    constructor(e) {
      E(this, "td");
      this.td = new TextDecoder(e);
    }
    write(e) {
      return this.td.decode(e, { stream: true });
    }
    end(e) {
      return this.td.decode(e);
    }
  };
  a(Er, "StringDecoder");
  Sr = Er;
});
var vs = T((fh, bs) => {
  "use strict";
  p();
  var { Transform: Gu } = (xr(), O(vr)), { StringDecoder: Vu } = (ms(), O(ys)), ve = /* @__PURE__ */ Symbol(
    "last"
  ), It = /* @__PURE__ */ Symbol("decoder");
  function zu(r, e, t) {
    let n;
    if (this.overflow) {
      if (n = this[It].write(r).split(
        this.matcher
      ), n.length === 1) return t();
      n.shift(), this.overflow = false;
    } else this[ve] += this[It].write(r), n = this[ve].split(this.matcher);
    this[ve] = n.pop();
    for (let i = 0; i < n.length; i++) try {
      gs(this, this.mapper(n[i]));
    } catch (s2) {
      return t(s2);
    }
    if (this.overflow = this[ve].length > this.maxLength, this.overflow && !this.skipOverflow) {
      t(new Error(
        "maximum buffer reached"
      ));
      return;
    }
    t();
  }
  __name(zu, "zu");
  __name2(zu, "zu");
  a(zu, "transform");
  function Ku(r) {
    if (this[ve] += this[It].end(), this[ve])
      try {
        gs(this, this.mapper(this[ve]));
      } catch (e) {
        return r(e);
      }
    r();
  }
  __name(Ku, "Ku");
  __name2(Ku, "Ku");
  a(Ku, "flush");
  function gs(r, e) {
    e !== void 0 && r.push(e);
  }
  __name(gs, "gs");
  __name2(gs, "gs");
  a(gs, "push");
  function ws(r) {
    return r;
  }
  __name(ws, "ws");
  __name2(ws, "ws");
  a(ws, "noop");
  function Yu(r, e, t) {
    switch (r = r || /\r?\n/, e = e || ws, t = t || {}, arguments.length) {
      case 1:
        typeof r == "function" ? (e = r, r = /\r?\n/) : typeof r == "object" && !(r instanceof RegExp) && !r[Symbol.split] && (t = r, r = /\r?\n/);
        break;
      case 2:
        typeof r == "function" ? (t = e, e = r, r = /\r?\n/) : typeof e == "object" && (t = e, e = ws);
    }
    t = Object.assign({}, t), t.autoDestroy = true, t.transform = zu, t.flush = Ku, t.readableObjectMode = true;
    let n = new Gu(t);
    return n[ve] = "", n[It] = new Vu("utf8"), n.matcher = r, n.mapper = e, n.maxLength = t.maxLength, n.skipOverflow = t.skipOverflow || false, n.overflow = false, n._destroy = function(i, s2) {
      this._writableState.errorEmitted = false, s2(i);
    }, n;
  }
  __name(Yu, "Yu");
  __name2(Yu, "Yu");
  a(Yu, "split");
  bs.exports = Yu;
});
var Es = T((dh, pe) => {
  "use strict";
  p();
  var xs = (wr(), O(mr)), Zu = (xr(), O(vr)).Stream, Ju = vs(), Ss = (it(), O(nt)), Xu = 5432, Tt = m.platform === "win32", st = m.stderr, ec = 56, tc = 7, rc = 61440, nc = 32768;
  function ic(r) {
    return (r & rc) == nc;
  }
  __name(ic, "ic");
  __name2(ic, "ic");
  a(ic, "isRegFile");
  var De = ["host", "port", "database", "user", "password"], Ar = De.length, sc = De[Ar - 1];
  function Cr() {
    var r = st instanceof Zu && st.writable === true;
    if (r) {
      var e = Array.prototype.slice.call(arguments).concat(`
`);
      st.write(Ss.format.apply(Ss, e));
    }
  }
  __name(Cr, "Cr");
  __name2(Cr, "Cr");
  a(Cr, "warn");
  Object.defineProperty(pe.exports, "isWin", { get: a(function() {
    return Tt;
  }, "get"), set: a(function(r) {
    Tt = r;
  }, "set") });
  pe.exports.warnTo = function(r) {
    var e = st;
    return st = r, e;
  };
  pe.exports.getFileName = function(r) {
    var e = r || m.env, t = e.PGPASSFILE || (Tt ? xs.join(e.APPDATA || "./", "postgresql", "pgpass.conf") : xs.join(e.HOME || "./", ".pgpass"));
    return t;
  };
  pe.exports.usePgPass = function(r, e) {
    return Object.prototype.hasOwnProperty.call(m.env, "PGPASSWORD") ? false : Tt ? true : (e = e || "<unkn>", ic(r.mode) ? r.mode & (ec | tc) ? (Cr('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', e), false) : true : (Cr('WARNING: password file "%s" is not a plain file', e), false));
  };
  var oc = pe.exports.match = function(r, e) {
    return De.slice(0, -1).reduce(function(t, n, i) {
      return i == 1 && Number(r[n] || Xu) === Number(
        e[n]
      ) ? t && true : t && (e[n] === "*" || e[n] === r[n]);
    }, true);
  };
  pe.exports.getPassword = function(r, e, t) {
    var n, i = e.pipe(
      Ju()
    );
    function s2(c) {
      var l = ac(c);
      l && uc(l) && oc(r, l) && (n = l[sc], i.end());
    }
    __name(s2, "s2");
    __name2(s2, "s");
    a(s2, "onLine");
    var o = a(function() {
      e.destroy(), t(n);
    }, "onEnd"), u = a(function(c) {
      e.destroy(), Cr("WARNING: error on reading file: %s", c), t(
        void 0
      );
    }, "onErr");
    e.on("error", u), i.on("data", s2).on("end", o).on("error", u);
  };
  var ac = pe.exports.parseLine = function(r) {
    if (r.length < 11 || r.match(/^\s+#/)) return null;
    for (var e = "", t = "", n = 0, i = 0, s2 = 0, o = {}, u = false, c = a(
      function(f, y, g) {
        var A = r.substring(y, g);
        Object.hasOwnProperty.call(m.env, "PGPASS_NO_DEESCAPE") || (A = A.replace(/\\([:\\])/g, "$1")), o[De[f]] = A;
      },
      "addToObj"
    ), l = 0; l < r.length - 1; l += 1) {
      if (e = r.charAt(l + 1), t = r.charAt(
        l
      ), u = n == Ar - 1, u) {
        c(n, i);
        break;
      }
      l >= 0 && e == ":" && t !== "\\" && (c(n, i, l + 1), i = l + 2, n += 1);
    }
    return o = Object.keys(o).length === Ar ? o : null, o;
  }, uc = pe.exports.isValidEntry = function(r) {
    for (var e = { 0: function(o) {
      return o.length > 0;
    }, 1: function(o) {
      return o === "*" ? true : (o = Number(o), isFinite(o) && o > 0 && o < 9007199254740992 && Math.floor(o) === o);
    }, 2: function(o) {
      return o.length > 0;
    }, 3: function(o) {
      return o.length > 0;
    }, 4: function(o) {
      return o.length > 0;
    } }, t = 0; t < De.length; t += 1) {
      var n = e[t], i = r[De[t]] || "", s2 = n(i);
      if (!s2) return false;
    }
    return true;
  };
});
var Cs = T((gh, _r) => {
  "use strict";
  p();
  var wh = (wr(), O(mr)), As = (br(), O(gr)), Pt = Es();
  _r.exports = function(r, e) {
    var t = Pt.getFileName();
    As.stat(t, function(n, i) {
      if (n || !Pt.usePgPass(i, t)) return e(void 0);
      var s2 = As.createReadStream(
        t
      );
      Pt.getPassword(r, s2, e);
    });
  };
  _r.exports.warnTo = Pt.warnTo;
});
var _s = {};
ie(_s, { default: /* @__PURE__ */ __name2(() => cc, "default") });
var cc;
var Is = G(() => {
  "use strict";
  p();
  cc = {};
});
var Ps = T((xh, Ts) => {
  "use strict";
  p();
  var lc = (Zt(), O(gi)), Ir = (br(), O(gr));
  function Tr(r) {
    if (r.charAt(0) === "/") {
      var t = r.split(" ");
      return { host: t[0], database: t[1] };
    }
    var e = lc.parse(/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(r) ? encodeURI(r).replace(/\%25(\d\d)/g, "%$1") : r, true), t = e.query;
    for (var n in t) Array.isArray(t[n]) && (t[n] = t[n][t[n].length - 1]);
    var i = (e.auth || ":").split(":");
    if (t.user = i[0], t.password = i.splice(1).join(
      ":"
    ), t.port = e.port, e.protocol == "socket:") return t.host = decodeURI(e.pathname), t.database = e.query.db, t.client_encoding = e.query.encoding, t;
    t.host || (t.host = e.hostname);
    var s2 = e.pathname;
    if (!t.host && s2 && /^%2f/i.test(s2)) {
      var o = s2.split("/");
      t.host = decodeURIComponent(o[0]), s2 = o.splice(1).join("/");
    }
    switch (s2 && s2.charAt(
      0
    ) === "/" && (s2 = s2.slice(1) || null), t.database = s2 && decodeURI(s2), (t.ssl === "true" || t.ssl === "1") && (t.ssl = true), t.ssl === "0" && (t.ssl = false), (t.sslcert || t.sslkey || t.sslrootcert || t.sslmode) && (t.ssl = {}), t.sslcert && (t.ssl.cert = Ir.readFileSync(t.sslcert).toString()), t.sslkey && (t.ssl.key = Ir.readFileSync(t.sslkey).toString()), t.sslrootcert && (t.ssl.ca = Ir.readFileSync(t.sslrootcert).toString()), t.sslmode) {
      case "disable": {
        t.ssl = false;
        break;
      }
      case "prefer":
      case "require":
      case "verify-ca":
      case "verify-full":
        break;
      case "no-verify": {
        t.ssl.rejectUnauthorized = false;
        break;
      }
    }
    return t;
  }
  __name(Tr, "Tr");
  __name2(Tr, "Tr");
  a(Tr, "parse");
  Ts.exports = Tr;
  Tr.parse = Tr;
});
var Bt = T((Ah, Ls) => {
  "use strict";
  p();
  var fc = (Is(), O(_s)), Rs = tt(), Bs = Ps().parse, H2 = a(function(r, e, t) {
    return t === void 0 ? t = m.env["PG" + r.toUpperCase()] : t === false || (t = m.env[t]), e[r] || t || Rs[r];
  }, "val"), hc = a(function() {
    switch (m.env.PGSSLMODE) {
      case "disable":
        return false;
      case "prefer":
      case "require":
      case "verify-ca":
      case "verify-full":
        return true;
      case "no-verify":
        return { rejectUnauthorized: false };
    }
    return Rs.ssl;
  }, "readSSLConfigFromEnvironment"), Oe = a(function(r) {
    return "'" + ("" + r).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  }, "quoteParamValue"), ne2 = a(function(r, e, t) {
    var n = e[t];
    n != null && r.push(t + "=" + Oe(n));
  }, "add"), Br = class Br {
    static {
      __name(this, "Br");
    }
    static {
      __name2(this, "Br");
    }
    constructor(e) {
      e = typeof e == "string" ? Bs(e) : e || {}, e.connectionString && (e = Object.assign({}, e, Bs(e.connectionString))), this.user = H2("user", e), this.database = H2("database", e), this.database === void 0 && (this.database = this.user), this.port = parseInt(H2("port", e), 10), this.host = H2("host", e), Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: H2("password", e)
      }), this.binary = H2("binary", e), this.options = H2("options", e), this.ssl = typeof e.ssl > "u" ? hc() : e.ssl, typeof this.ssl == "string" && this.ssl === "true" && (this.ssl = true), this.ssl === "no-verify" && (this.ssl = { rejectUnauthorized: false }), this.ssl && this.ssl.key && Object.defineProperty(this.ssl, "key", { enumerable: false }), this.client_encoding = H2("client_encoding", e), this.replication = H2("replication", e), this.isDomainSocket = !(this.host || "").indexOf("/"), this.application_name = H2("application_name", e, "PGAPPNAME"), this.fallback_application_name = H2("fallback_application_name", e, false), this.statement_timeout = H2("statement_timeout", e, false), this.lock_timeout = H2("lock_timeout", e, false), this.idle_in_transaction_session_timeout = H2("idle_in_transaction_session_timeout", e, false), this.query_timeout = H2("query_timeout", e, false), e.connectionTimeoutMillis === void 0 ? this.connect_timeout = m.env.PGCONNECT_TIMEOUT || 0 : this.connect_timeout = Math.floor(e.connectionTimeoutMillis / 1e3), e.keepAlive === false ? this.keepalives = 0 : e.keepAlive === true && (this.keepalives = 1), typeof e.keepAliveInitialDelayMillis == "number" && (this.keepalives_idle = Math.floor(e.keepAliveInitialDelayMillis / 1e3));
    }
    getLibpqConnectionString(e) {
      var t = [];
      ne2(t, this, "user"), ne2(t, this, "password"), ne2(t, this, "port"), ne2(t, this, "application_name"), ne2(
        t,
        this,
        "fallback_application_name"
      ), ne2(t, this, "connect_timeout"), ne2(t, this, "options");
      var n = typeof this.ssl == "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
      if (ne2(t, n, "sslmode"), ne2(t, n, "sslca"), ne2(t, n, "sslkey"), ne2(t, n, "sslcert"), ne2(t, n, "sslrootcert"), this.database && t.push("dbname=" + Oe(this.database)), this.replication && t.push("replication=" + Oe(this.replication)), this.host && t.push("host=" + Oe(this.host)), this.isDomainSocket) return e(null, t.join(" "));
      this.client_encoding && t.push("client_encoding=" + Oe(this.client_encoding)), fc.lookup(this.host, function(i, s2) {
        return i ? e(i, null) : (t.push("hostaddr=" + Oe(s2)), e(null, t.join(" ")));
      });
    }
  };
  a(Br, "ConnectionParameters");
  var Pr = Br;
  Ls.exports = Pr;
});
var Ms = T((Ih, ks) => {
  "use strict";
  p();
  var pc = Je(), Fs = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/, Lr = class Lr {
    static {
      __name(this, "Lr");
    }
    static {
      __name2(this, "Lr");
    }
    constructor(e, t) {
      this.command = null, this.rowCount = null, this.oid = null, this.rows = [], this.fields = [], this._parsers = void 0, this._types = t, this.RowCtor = null, this.rowAsArray = e === "array", this.rowAsArray && (this.parseRow = this._parseRowAsArray);
    }
    addCommandComplete(e) {
      var t;
      e.text ? t = Fs.exec(e.text) : t = Fs.exec(e.command), t && (this.command = t[1], t[3] ? (this.oid = parseInt(
        t[2],
        10
      ), this.rowCount = parseInt(t[3], 10)) : t[2] && (this.rowCount = parseInt(t[2], 10)));
    }
    _parseRowAsArray(e) {
      for (var t = new Array(
        e.length
      ), n = 0, i = e.length; n < i; n++) {
        var s2 = e[n];
        s2 !== null ? t[n] = this._parsers[n](s2) : t[n] = null;
      }
      return t;
    }
    parseRow(e) {
      for (var t = {}, n = 0, i = e.length; n < i; n++) {
        var s2 = e[n], o = this.fields[n].name;
        s2 !== null ? t[o] = this._parsers[n](
          s2
        ) : t[o] = null;
      }
      return t;
    }
    addRow(e) {
      this.rows.push(e);
    }
    addFields(e) {
      this.fields = e, this.fields.length && (this._parsers = new Array(e.length));
      for (var t = 0; t < e.length; t++) {
        var n = e[t];
        this._types ? this._parsers[t] = this._types.getTypeParser(n.dataTypeID, n.format || "text") : this._parsers[t] = pc.getTypeParser(n.dataTypeID, n.format || "text");
      }
    }
  };
  a(Lr, "Result");
  var Rr = Lr;
  ks.exports = Rr;
});
var qs = T((Bh, Os) => {
  "use strict";
  p();
  var { EventEmitter: dc } = ge(), Us = Ms(), Ds = rt(), kr = class kr extends dc {
    static {
      __name(this, "kr");
    }
    static {
      __name2(this, "kr");
    }
    constructor(e, t, n) {
      super(), e = Ds.normalizeQueryConfig(e, t, n), this.text = e.text, this.values = e.values, this.rows = e.rows, this.types = e.types, this.name = e.name, this.binary = e.binary, this.portal = e.portal || "", this.callback = e.callback, this._rowMode = e.rowMode, m.domain && e.callback && (this.callback = m.domain.bind(e.callback)), this._result = new Us(this._rowMode, this.types), this._results = this._result, this.isPreparedStatement = false, this._canceledDueToError = false, this._promise = null;
    }
    requiresPreparation() {
      return this.name || this.rows ? true : !this.text || !this.values ? false : this.values.length > 0;
    }
    _checkForMultirow() {
      this._result.command && (Array.isArray(this._results) || (this._results = [this._result]), this._result = new Us(this._rowMode, this.types), this._results.push(this._result));
    }
    handleRowDescription(e) {
      this._checkForMultirow(), this._result.addFields(e.fields), this._accumulateRows = this.callback || !this.listeners("row").length;
    }
    handleDataRow(e) {
      let t;
      if (!this._canceledDueToError) {
        try {
          t = this._result.parseRow(
            e.fields
          );
        } catch (n) {
          this._canceledDueToError = n;
          return;
        }
        this.emit("row", t, this._result), this._accumulateRows && this._result.addRow(t);
      }
    }
    handleCommandComplete(e, t) {
      this._checkForMultirow(), this._result.addCommandComplete(
        e
      ), this.rows && t.sync();
    }
    handleEmptyQuery(e) {
      this.rows && e.sync();
    }
    handleError(e, t) {
      if (this._canceledDueToError && (e = this._canceledDueToError, this._canceledDueToError = false), this.callback) return this.callback(e);
      this.emit("error", e);
    }
    handleReadyForQuery(e) {
      if (this._canceledDueToError) return this.handleError(
        this._canceledDueToError,
        e
      );
      if (this.callback) try {
        this.callback(null, this._results);
      } catch (t) {
        m.nextTick(() => {
          throw t;
        });
      }
      this.emit(
        "end",
        this._results
      );
    }
    submit(e) {
      if (typeof this.text != "string" && typeof this.name != "string") return new Error(
        "A query must have either text or a name. Supplying neither is unsupported."
      );
      let t = e.parsedStatements[this.name];
      return this.text && t && this.text !== t ? new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`) : this.values && !Array.isArray(this.values) ? new Error("Query values must be an array") : (this.requiresPreparation() ? this.prepare(e) : e.query(this.text), null);
    }
    hasBeenParsed(e) {
      return this.name && e.parsedStatements[this.name];
    }
    handlePortalSuspended(e) {
      this._getRows(e, this.rows);
    }
    _getRows(e, t) {
      e.execute({ portal: this.portal, rows: t }), t ? e.flush() : e.sync();
    }
    prepare(e) {
      this.isPreparedStatement = true, this.hasBeenParsed(e) || e.parse({ text: this.text, name: this.name, types: this.types });
      try {
        e.bind({ portal: this.portal, statement: this.name, values: this.values, binary: this.binary, valueMapper: Ds.prepareValue });
      } catch (t) {
        this.handleError(t, e);
        return;
      }
      e.describe({ type: "P", name: this.portal || "" }), this._getRows(e, this.rows);
    }
    handleCopyInResponse(e) {
      e.sendCopyFail("No source stream defined");
    }
    handleCopyData(e, t) {
    }
  };
  a(kr, "Query");
  var Fr = kr;
  Os.exports = Fr;
});
var ln = T((_2) => {
  "use strict";
  p();
  Object.defineProperty(_2, "__esModule", { value: true });
  _2.NoticeMessage = _2.DataRowMessage = _2.CommandCompleteMessage = _2.ReadyForQueryMessage = _2.NotificationResponseMessage = _2.BackendKeyDataMessage = _2.AuthenticationMD5Password = _2.ParameterStatusMessage = _2.ParameterDescriptionMessage = _2.RowDescriptionMessage = _2.Field = _2.CopyResponse = _2.CopyDataMessage = _2.DatabaseError = _2.copyDone = _2.emptyQuery = _2.replicationStart = _2.portalSuspended = _2.noData = _2.closeComplete = _2.bindComplete = _2.parseComplete = void 0;
  _2.parseComplete = { name: "parseComplete", length: 5 };
  _2.bindComplete = { name: "bindComplete", length: 5 };
  _2.closeComplete = { name: "closeComplete", length: 5 };
  _2.noData = { name: "noData", length: 5 };
  _2.portalSuspended = { name: "portalSuspended", length: 5 };
  _2.replicationStart = { name: "replicationStart", length: 4 };
  _2.emptyQuery = { name: "emptyQuery", length: 4 };
  _2.copyDone = { name: "copyDone", length: 4 };
  var Kr = class Kr extends Error {
    static {
      __name(this, "Kr");
    }
    static {
      __name2(this, "Kr");
    }
    constructor(e, t, n) {
      super(e), this.length = t, this.name = n;
    }
  };
  a(Kr, "DatabaseError");
  var Mr = Kr;
  _2.DatabaseError = Mr;
  var Yr = class Yr {
    static {
      __name(this, "Yr");
    }
    static {
      __name2(this, "Yr");
    }
    constructor(e, t) {
      this.length = e, this.chunk = t, this.name = "copyData";
    }
  };
  a(Yr, "CopyDataMessage");
  var Ur = Yr;
  _2.CopyDataMessage = Ur;
  var Zr = class Zr {
    static {
      __name(this, "Zr");
    }
    static {
      __name2(this, "Zr");
    }
    constructor(e, t, n, i) {
      this.length = e, this.name = t, this.binary = n, this.columnTypes = new Array(i);
    }
  };
  a(Zr, "CopyResponse");
  var Dr = Zr;
  _2.CopyResponse = Dr;
  var Jr = class Jr {
    static {
      __name(this, "Jr");
    }
    static {
      __name2(this, "Jr");
    }
    constructor(e, t, n, i, s2, o, u) {
      this.name = e, this.tableID = t, this.columnID = n, this.dataTypeID = i, this.dataTypeSize = s2, this.dataTypeModifier = o, this.format = u;
    }
  };
  a(Jr, "Field");
  var Or = Jr;
  _2.Field = Or;
  var Xr = class Xr {
    static {
      __name(this, "Xr");
    }
    static {
      __name2(this, "Xr");
    }
    constructor(e, t) {
      this.length = e, this.fieldCount = t, this.name = "rowDescription", this.fields = new Array(this.fieldCount);
    }
  };
  a(Xr, "RowDescriptionMessage");
  var qr = Xr;
  _2.RowDescriptionMessage = qr;
  var en = class en {
    static {
      __name(this, "en");
    }
    static {
      __name2(this, "en");
    }
    constructor(e, t) {
      this.length = e, this.parameterCount = t, this.name = "parameterDescription", this.dataTypeIDs = new Array(this.parameterCount);
    }
  };
  a(en, "ParameterDescriptionMessage");
  var Qr = en;
  _2.ParameterDescriptionMessage = Qr;
  var tn = class tn {
    static {
      __name(this, "tn");
    }
    static {
      __name2(this, "tn");
    }
    constructor(e, t, n) {
      this.length = e, this.parameterName = t, this.parameterValue = n, this.name = "parameterStatus";
    }
  };
  a(tn, "ParameterStatusMessage");
  var Nr = tn;
  _2.ParameterStatusMessage = Nr;
  var rn = class rn {
    static {
      __name(this, "rn");
    }
    static {
      __name2(this, "rn");
    }
    constructor(e, t) {
      this.length = e, this.salt = t, this.name = "authenticationMD5Password";
    }
  };
  a(rn, "AuthenticationMD5Password");
  var Wr = rn;
  _2.AuthenticationMD5Password = Wr;
  var nn = class nn {
    static {
      __name(this, "nn");
    }
    static {
      __name2(this, "nn");
    }
    constructor(e, t, n) {
      this.length = e, this.processID = t, this.secretKey = n, this.name = "backendKeyData";
    }
  };
  a(nn, "BackendKeyDataMessage");
  var jr = nn;
  _2.BackendKeyDataMessage = jr;
  var sn = class sn {
    static {
      __name(this, "sn");
    }
    static {
      __name2(this, "sn");
    }
    constructor(e, t, n, i) {
      this.length = e, this.processId = t, this.channel = n, this.payload = i, this.name = "notification";
    }
  };
  a(sn, "NotificationResponseMessage");
  var Hr = sn;
  _2.NotificationResponseMessage = Hr;
  var on = class on {
    static {
      __name(this, "on");
    }
    static {
      __name2(this, "on");
    }
    constructor(e, t) {
      this.length = e, this.status = t, this.name = "readyForQuery";
    }
  };
  a(on, "ReadyForQueryMessage");
  var $r = on;
  _2.ReadyForQueryMessage = $r;
  var an = class an {
    static {
      __name(this, "an");
    }
    static {
      __name2(this, "an");
    }
    constructor(e, t) {
      this.length = e, this.text = t, this.name = "commandComplete";
    }
  };
  a(an, "CommandCompleteMessage");
  var Gr = an;
  _2.CommandCompleteMessage = Gr;
  var un = class un {
    static {
      __name(this, "un");
    }
    static {
      __name2(this, "un");
    }
    constructor(e, t) {
      this.length = e, this.fields = t, this.name = "dataRow", this.fieldCount = t.length;
    }
  };
  a(un, "DataRowMessage");
  var Vr = un;
  _2.DataRowMessage = Vr;
  var cn = class cn {
    static {
      __name(this, "cn");
    }
    static {
      __name2(this, "cn");
    }
    constructor(e, t) {
      this.length = e, this.message = t, this.name = "notice";
    }
  };
  a(cn, "NoticeMessage");
  var zr = cn;
  _2.NoticeMessage = zr;
});
var Qs = T((Rt) => {
  "use strict";
  p();
  Object.defineProperty(Rt, "__esModule", { value: true });
  Rt.Writer = void 0;
  var hn = class hn {
    static {
      __name(this, "hn");
    }
    static {
      __name2(this, "hn");
    }
    constructor(e = 256) {
      this.size = e, this.offset = 5, this.headerPosition = 0, this.buffer = d.allocUnsafe(e);
    }
    ensure(e) {
      if (this.buffer.length - this.offset < e) {
        let n = this.buffer, i = n.length + (n.length >> 1) + e;
        this.buffer = d.allocUnsafe(i), n.copy(
          this.buffer
        );
      }
    }
    addInt32(e) {
      return this.ensure(4), this.buffer[this.offset++] = e >>> 24 & 255, this.buffer[this.offset++] = e >>> 16 & 255, this.buffer[this.offset++] = e >>> 8 & 255, this.buffer[this.offset++] = e >>> 0 & 255, this;
    }
    addInt16(e) {
      return this.ensure(2), this.buffer[this.offset++] = e >>> 8 & 255, this.buffer[this.offset++] = e >>> 0 & 255, this;
    }
    addCString(e) {
      if (!e) this.ensure(1);
      else {
        let t = d.byteLength(e);
        this.ensure(t + 1), this.buffer.write(e, this.offset, "utf-8"), this.offset += t;
      }
      return this.buffer[this.offset++] = 0, this;
    }
    addString(e = "") {
      let t = d.byteLength(e);
      return this.ensure(t), this.buffer.write(e, this.offset), this.offset += t, this;
    }
    add(e) {
      return this.ensure(
        e.length
      ), e.copy(this.buffer, this.offset), this.offset += e.length, this;
    }
    join(e) {
      if (e) {
        this.buffer[this.headerPosition] = e;
        let t = this.offset - (this.headerPosition + 1);
        this.buffer.writeInt32BE(t, this.headerPosition + 1);
      }
      return this.buffer.slice(e ? 0 : 5, this.offset);
    }
    flush(e) {
      let t = this.join(e);
      return this.offset = 5, this.headerPosition = 0, this.buffer = d.allocUnsafe(this.size), t;
    }
  };
  a(hn, "Writer");
  var fn = hn;
  Rt.Writer = fn;
});
var Ws = T((Ft) => {
  "use strict";
  p();
  Object.defineProperty(Ft, "__esModule", { value: true });
  Ft.serialize = void 0;
  var pn = Qs(), F2 = new pn.Writer(), yc = a((r) => {
    F2.addInt16(3).addInt16(0);
    for (let n of Object.keys(r)) F2.addCString(
      n
    ).addCString(r[n]);
    F2.addCString("client_encoding").addCString("UTF8");
    let e = F2.addCString("").flush(), t = e.length + 4;
    return new pn.Writer().addInt32(t).add(e).flush();
  }, "startup"), mc = a(() => {
    let r = d.allocUnsafe(
      8
    );
    return r.writeInt32BE(8, 0), r.writeInt32BE(80877103, 4), r;
  }, "requestSsl"), wc = a((r) => F2.addCString(r).flush(
    112
  ), "password"), gc = a(function(r, e) {
    return F2.addCString(r).addInt32(d.byteLength(e)).addString(e), F2.flush(112);
  }, "sendSASLInitialResponseMessage"), bc = a(function(r) {
    return F2.addString(r).flush(112);
  }, "sendSCRAMClientFinalMessage"), vc = a((r) => F2.addCString(r).flush(81), "query"), Ns = [], xc = a((r) => {
    let e = r.name || "";
    e.length > 63 && (console.error("Warning! Postgres only supports 63 characters for query names."), console.error("You supplied %s (%s)", e, e.length), console.error("This can cause conflicts and silent errors executing queries"));
    let t = r.types || Ns, n = t.length, i = F2.addCString(e).addCString(r.text).addInt16(n);
    for (let s2 = 0; s2 < n; s2++) i.addInt32(t[s2]);
    return F2.flush(80);
  }, "parse"), qe = new pn.Writer(), Sc = a(function(r, e) {
    for (let t = 0; t < r.length; t++) {
      let n = e ? e(r[t], t) : r[t];
      n == null ? (F2.addInt16(0), qe.addInt32(-1)) : n instanceof d ? (F2.addInt16(
        1
      ), qe.addInt32(n.length), qe.add(n)) : (F2.addInt16(0), qe.addInt32(d.byteLength(n)), qe.addString(n));
    }
  }, "writeValues"), Ec = a((r = {}) => {
    let e = r.portal || "", t = r.statement || "", n = r.binary || false, i = r.values || Ns, s2 = i.length;
    return F2.addCString(e).addCString(t), F2.addInt16(s2), Sc(i, r.valueMapper), F2.addInt16(s2), F2.add(qe.flush()), F2.addInt16(n ? 1 : 0), F2.flush(66);
  }, "bind"), Ac = d.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]), Cc = a((r) => {
    if (!r || !r.portal && !r.rows) return Ac;
    let e = r.portal || "", t = r.rows || 0, n = d.byteLength(e), i = 4 + n + 1 + 4, s2 = d.allocUnsafe(1 + i);
    return s2[0] = 69, s2.writeInt32BE(i, 1), s2.write(e, 5, "utf-8"), s2[n + 5] = 0, s2.writeUInt32BE(t, s2.length - 4), s2;
  }, "execute"), _c = a(
    (r, e) => {
      let t = d.allocUnsafe(16);
      return t.writeInt32BE(16, 0), t.writeInt16BE(1234, 4), t.writeInt16BE(
        5678,
        6
      ), t.writeInt32BE(r, 8), t.writeInt32BE(e, 12), t;
    },
    "cancel"
  ), dn = a((r, e) => {
    let n = 4 + d.byteLength(e) + 1, i = d.allocUnsafe(1 + n);
    return i[0] = r, i.writeInt32BE(n, 1), i.write(e, 5, "utf-8"), i[n] = 0, i;
  }, "cstringMessage"), Ic = F2.addCString("P").flush(68), Tc = F2.addCString("S").flush(68), Pc = a((r) => r.name ? dn(68, `${r.type}${r.name || ""}`) : r.type === "P" ? Ic : Tc, "describe"), Bc = a((r) => {
    let e = `${r.type}${r.name || ""}`;
    return dn(67, e);
  }, "close"), Rc = a((r) => F2.add(r).flush(100), "copyData"), Lc = a((r) => dn(102, r), "copyFail"), Lt = a((r) => d.from([r, 0, 0, 0, 4]), "codeOnlyBuffer"), Fc = Lt(72), kc = Lt(83), Mc = Lt(88), Uc = Lt(99), Dc = {
    startup: yc,
    password: wc,
    requestSsl: mc,
    sendSASLInitialResponseMessage: gc,
    sendSCRAMClientFinalMessage: bc,
    query: vc,
    parse: xc,
    bind: Ec,
    execute: Cc,
    describe: Pc,
    close: Bc,
    flush: a(
      () => Fc,
      "flush"
    ),
    sync: a(() => kc, "sync"),
    end: a(() => Mc, "end"),
    copyData: Rc,
    copyDone: a(() => Uc, "copyDone"),
    copyFail: Lc,
    cancel: _c
  };
  Ft.serialize = Dc;
});
var js = T((kt) => {
  "use strict";
  p();
  Object.defineProperty(kt, "__esModule", { value: true });
  kt.BufferReader = void 0;
  var Oc = d.allocUnsafe(0), mn = class mn {
    static {
      __name(this, "mn");
    }
    static {
      __name2(this, "mn");
    }
    constructor(e = 0) {
      this.offset = e, this.buffer = Oc, this.encoding = "utf-8";
    }
    setBuffer(e, t) {
      this.offset = e, this.buffer = t;
    }
    int16() {
      let e = this.buffer.readInt16BE(this.offset);
      return this.offset += 2, e;
    }
    byte() {
      let e = this.buffer[this.offset];
      return this.offset++, e;
    }
    int32() {
      let e = this.buffer.readInt32BE(
        this.offset
      );
      return this.offset += 4, e;
    }
    uint32() {
      let e = this.buffer.readUInt32BE(this.offset);
      return this.offset += 4, e;
    }
    string(e) {
      let t = this.buffer.toString(this.encoding, this.offset, this.offset + e);
      return this.offset += e, t;
    }
    cstring() {
      let e = this.offset, t = e;
      for (; this.buffer[t++] !== 0; ) ;
      return this.offset = t, this.buffer.toString(this.encoding, e, t - 1);
    }
    bytes(e) {
      let t = this.buffer.slice(this.offset, this.offset + e);
      return this.offset += e, t;
    }
  };
  a(mn, "BufferReader");
  var yn = mn;
  kt.BufferReader = yn;
});
var Gs = T((Mt) => {
  "use strict";
  p();
  Object.defineProperty(Mt, "__esModule", { value: true });
  Mt.Parser = void 0;
  var k = ln(), qc = js(), wn = 1, Qc = 4, Hs = wn + Qc, $s = d.allocUnsafe(0), bn = class bn {
    static {
      __name(this, "bn");
    }
    static {
      __name2(this, "bn");
    }
    constructor(e) {
      if (this.buffer = $s, this.bufferLength = 0, this.bufferOffset = 0, this.reader = new qc.BufferReader(), e?.mode === "binary") throw new Error("Binary mode not supported yet");
      this.mode = e?.mode || "text";
    }
    parse(e, t) {
      this.mergeBuffer(e);
      let n = this.bufferOffset + this.bufferLength, i = this.bufferOffset;
      for (; i + Hs <= n; ) {
        let s2 = this.buffer[i], o = this.buffer.readUInt32BE(
          i + wn
        ), u = wn + o;
        if (u + i <= n) {
          let c = this.handlePacket(i + Hs, s2, o, this.buffer);
          t(c), i += u;
        } else break;
      }
      i === n ? (this.buffer = $s, this.bufferLength = 0, this.bufferOffset = 0) : (this.bufferLength = n - i, this.bufferOffset = i);
    }
    mergeBuffer(e) {
      if (this.bufferLength > 0) {
        let t = this.bufferLength + e.byteLength;
        if (t + this.bufferOffset > this.buffer.byteLength) {
          let i;
          if (t <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) i = this.buffer;
          else {
            let s2 = this.buffer.byteLength * 2;
            for (; t >= s2; ) s2 *= 2;
            i = d.allocUnsafe(s2);
          }
          this.buffer.copy(i, 0, this.bufferOffset, this.bufferOffset + this.bufferLength), this.buffer = i, this.bufferOffset = 0;
        }
        e.copy(this.buffer, this.bufferOffset + this.bufferLength), this.bufferLength = t;
      } else this.buffer = e, this.bufferOffset = 0, this.bufferLength = e.byteLength;
    }
    handlePacket(e, t, n, i) {
      switch (t) {
        case 50:
          return k.bindComplete;
        case 49:
          return k.parseComplete;
        case 51:
          return k.closeComplete;
        case 110:
          return k.noData;
        case 115:
          return k.portalSuspended;
        case 99:
          return k.copyDone;
        case 87:
          return k.replicationStart;
        case 73:
          return k.emptyQuery;
        case 68:
          return this.parseDataRowMessage(e, n, i);
        case 67:
          return this.parseCommandCompleteMessage(
            e,
            n,
            i
          );
        case 90:
          return this.parseReadyForQueryMessage(e, n, i);
        case 65:
          return this.parseNotificationMessage(
            e,
            n,
            i
          );
        case 82:
          return this.parseAuthenticationResponse(e, n, i);
        case 83:
          return this.parseParameterStatusMessage(
            e,
            n,
            i
          );
        case 75:
          return this.parseBackendKeyData(e, n, i);
        case 69:
          return this.parseErrorMessage(e, n, i, "error");
        case 78:
          return this.parseErrorMessage(e, n, i, "notice");
        case 84:
          return this.parseRowDescriptionMessage(
            e,
            n,
            i
          );
        case 116:
          return this.parseParameterDescriptionMessage(e, n, i);
        case 71:
          return this.parseCopyInMessage(
            e,
            n,
            i
          );
        case 72:
          return this.parseCopyOutMessage(e, n, i);
        case 100:
          return this.parseCopyData(e, n, i);
        default:
          return new k.DatabaseError("received invalid response: " + t.toString(16), n, "error");
      }
    }
    parseReadyForQueryMessage(e, t, n) {
      this.reader.setBuffer(e, n);
      let i = this.reader.string(1);
      return new k.ReadyForQueryMessage(t, i);
    }
    parseCommandCompleteMessage(e, t, n) {
      this.reader.setBuffer(e, n);
      let i = this.reader.cstring();
      return new k.CommandCompleteMessage(t, i);
    }
    parseCopyData(e, t, n) {
      let i = n.slice(e, e + (t - 4));
      return new k.CopyDataMessage(t, i);
    }
    parseCopyInMessage(e, t, n) {
      return this.parseCopyMessage(
        e,
        t,
        n,
        "copyInResponse"
      );
    }
    parseCopyOutMessage(e, t, n) {
      return this.parseCopyMessage(e, t, n, "copyOutResponse");
    }
    parseCopyMessage(e, t, n, i) {
      this.reader.setBuffer(e, n);
      let s2 = this.reader.byte() !== 0, o = this.reader.int16(), u = new k.CopyResponse(t, i, s2, o);
      for (let c = 0; c < o; c++) u.columnTypes[c] = this.reader.int16();
      return u;
    }
    parseNotificationMessage(e, t, n) {
      this.reader.setBuffer(e, n);
      let i = this.reader.int32(), s2 = this.reader.cstring(), o = this.reader.cstring();
      return new k.NotificationResponseMessage(t, i, s2, o);
    }
    parseRowDescriptionMessage(e, t, n) {
      this.reader.setBuffer(
        e,
        n
      );
      let i = this.reader.int16(), s2 = new k.RowDescriptionMessage(t, i);
      for (let o = 0; o < i; o++) s2.fields[o] = this.parseField();
      return s2;
    }
    parseField() {
      let e = this.reader.cstring(), t = this.reader.uint32(), n = this.reader.int16(), i = this.reader.uint32(), s2 = this.reader.int16(), o = this.reader.int32(), u = this.reader.int16() === 0 ? "text" : "binary";
      return new k.Field(e, t, n, i, s2, o, u);
    }
    parseParameterDescriptionMessage(e, t, n) {
      this.reader.setBuffer(e, n);
      let i = this.reader.int16(), s2 = new k.ParameterDescriptionMessage(t, i);
      for (let o = 0; o < i; o++)
        s2.dataTypeIDs[o] = this.reader.int32();
      return s2;
    }
    parseDataRowMessage(e, t, n) {
      this.reader.setBuffer(e, n);
      let i = this.reader.int16(), s2 = new Array(i);
      for (let o = 0; o < i; o++) {
        let u = this.reader.int32();
        s2[o] = u === -1 ? null : this.reader.string(u);
      }
      return new k.DataRowMessage(t, s2);
    }
    parseParameterStatusMessage(e, t, n) {
      this.reader.setBuffer(e, n);
      let i = this.reader.cstring(), s2 = this.reader.cstring();
      return new k.ParameterStatusMessage(
        t,
        i,
        s2
      );
    }
    parseBackendKeyData(e, t, n) {
      this.reader.setBuffer(e, n);
      let i = this.reader.int32(), s2 = this.reader.int32();
      return new k.BackendKeyDataMessage(t, i, s2);
    }
    parseAuthenticationResponse(e, t, n) {
      this.reader.setBuffer(
        e,
        n
      );
      let i = this.reader.int32(), s2 = { name: "authenticationOk", length: t };
      switch (i) {
        case 0:
          break;
        case 3:
          s2.length === 8 && (s2.name = "authenticationCleartextPassword");
          break;
        case 5:
          if (s2.length === 12) {
            s2.name = "authenticationMD5Password";
            let o = this.reader.bytes(4);
            return new k.AuthenticationMD5Password(t, o);
          }
          break;
        case 10:
          {
            s2.name = "authenticationSASL", s2.mechanisms = [];
            let o;
            do
              o = this.reader.cstring(), o && s2.mechanisms.push(o);
            while (o);
          }
          break;
        case 11:
          s2.name = "authenticationSASLContinue", s2.data = this.reader.string(t - 8);
          break;
        case 12:
          s2.name = "authenticationSASLFinal", s2.data = this.reader.string(t - 8);
          break;
        default:
          throw new Error("Unknown authenticationOk message type " + i);
      }
      return s2;
    }
    parseErrorMessage(e, t, n, i) {
      this.reader.setBuffer(e, n);
      let s2 = {}, o = this.reader.string(1);
      for (; o !== "\0"; ) s2[o] = this.reader.cstring(), o = this.reader.string(1);
      let u = s2.M, c = i === "notice" ? new k.NoticeMessage(t, u) : new k.DatabaseError(u, t, i);
      return c.severity = s2.S, c.code = s2.C, c.detail = s2.D, c.hint = s2.H, c.position = s2.P, c.internalPosition = s2.p, c.internalQuery = s2.q, c.where = s2.W, c.schema = s2.s, c.table = s2.t, c.column = s2.c, c.dataType = s2.d, c.constraint = s2.n, c.file = s2.F, c.line = s2.L, c.routine = s2.R, c;
    }
  };
  a(bn, "Parser");
  var gn = bn;
  Mt.Parser = gn;
});
var vn = T((xe) => {
  "use strict";
  p();
  Object.defineProperty(xe, "__esModule", { value: true });
  xe.DatabaseError = xe.serialize = xe.parse = void 0;
  var Nc = ln();
  Object.defineProperty(xe, "DatabaseError", { enumerable: true, get: a(
    function() {
      return Nc.DatabaseError;
    },
    "get"
  ) });
  var Wc = Ws();
  Object.defineProperty(xe, "serialize", {
    enumerable: true,
    get: a(function() {
      return Wc.serialize;
    }, "get")
  });
  var jc = Gs();
  function Hc(r, e) {
    let t = new jc.Parser();
    return r.on("data", (n) => t.parse(n, e)), new Promise((n) => r.on("end", () => n()));
  }
  __name(Hc, "Hc");
  __name2(Hc, "Hc");
  a(Hc, "parse");
  xe.parse = Hc;
});
var Vs = {};
ie(Vs, { connect: /* @__PURE__ */ __name2(() => $c, "connect") });
function $c({ socket: r, servername: e }) {
  return r.startTls(e), r;
}
__name($c, "$c");
__name2($c, "$c");
var zs = G(
  () => {
    "use strict";
    p();
    a($c, "connect");
  }
);
var En = T((Xh, Zs) => {
  "use strict";
  p();
  var Ks = (Fe(), O(wi)), Gc = ge().EventEmitter, { parse: Vc, serialize: Q } = vn(), Ys = Q.flush(), zc = Q.sync(), Kc = Q.end(), Sn = class Sn extends Gc {
    static {
      __name(this, "Sn");
    }
    static {
      __name2(this, "Sn");
    }
    constructor(e) {
      super(), e = e || {}, this.stream = e.stream || new Ks.Socket(), this._keepAlive = e.keepAlive, this._keepAliveInitialDelayMillis = e.keepAliveInitialDelayMillis, this.lastBuffer = false, this.parsedStatements = {}, this.ssl = e.ssl || false, this._ending = false, this._emitMessage = false;
      var t = this;
      this.on("newListener", function(n) {
        n === "message" && (t._emitMessage = true);
      });
    }
    connect(e, t) {
      var n = this;
      this._connecting = true, this.stream.setNoDelay(true), this.stream.connect(e, t), this.stream.once("connect", function() {
        n._keepAlive && n.stream.setKeepAlive(true, n._keepAliveInitialDelayMillis), n.emit("connect");
      });
      let i = a(function(s2) {
        n._ending && (s2.code === "ECONNRESET" || s2.code === "EPIPE") || n.emit("error", s2);
      }, "reportStreamError");
      if (this.stream.on("error", i), this.stream.on("close", function() {
        n.emit("end");
      }), !this.ssl) return this.attachListeners(
        this.stream
      );
      this.stream.once("data", function(s2) {
        var o = s2.toString("utf8");
        switch (o) {
          case "S":
            break;
          case "N":
            return n.stream.end(), n.emit("error", new Error("The server does not support SSL connections"));
          default:
            return n.stream.end(), n.emit("error", new Error("There was an error establishing an SSL connection"));
        }
        var u = (zs(), O(Vs));
        let c = { socket: n.stream };
        n.ssl !== true && (Object.assign(c, n.ssl), "key" in n.ssl && (c.key = n.ssl.key)), Ks.isIP(t) === 0 && (c.servername = t);
        try {
          n.stream = u.connect(c);
        } catch (l) {
          return n.emit(
            "error",
            l
          );
        }
        n.attachListeners(n.stream), n.stream.on("error", i), n.emit("sslconnect");
      });
    }
    attachListeners(e) {
      e.on(
        "end",
        () => {
          this.emit("end");
        }
      ), Vc(e, (t) => {
        var n = t.name === "error" ? "errorMessage" : t.name;
        this._emitMessage && this.emit("message", t), this.emit(n, t);
      });
    }
    requestSsl() {
      this.stream.write(Q.requestSsl());
    }
    startup(e) {
      this.stream.write(Q.startup(e));
    }
    cancel(e, t) {
      this._send(Q.cancel(e, t));
    }
    password(e) {
      this._send(Q.password(e));
    }
    sendSASLInitialResponseMessage(e, t) {
      this._send(Q.sendSASLInitialResponseMessage(e, t));
    }
    sendSCRAMClientFinalMessage(e) {
      this._send(Q.sendSCRAMClientFinalMessage(
        e
      ));
    }
    _send(e) {
      return this.stream.writable ? this.stream.write(e) : false;
    }
    query(e) {
      this._send(Q.query(e));
    }
    parse(e) {
      this._send(Q.parse(e));
    }
    bind(e) {
      this._send(Q.bind(e));
    }
    execute(e) {
      this._send(Q.execute(e));
    }
    flush() {
      this.stream.writable && this.stream.write(Ys);
    }
    sync() {
      this._ending = true, this._send(Ys), this._send(zc);
    }
    ref() {
      this.stream.ref();
    }
    unref() {
      this.stream.unref();
    }
    end() {
      if (this._ending = true, !this._connecting || !this.stream.writable) {
        this.stream.end();
        return;
      }
      return this.stream.write(Kc, () => {
        this.stream.end();
      });
    }
    close(e) {
      this._send(Q.close(e));
    }
    describe(e) {
      this._send(Q.describe(e));
    }
    sendCopyFromChunk(e) {
      this._send(Q.copyData(e));
    }
    endCopyFrom() {
      this._send(Q.copyDone());
    }
    sendCopyFail(e) {
      this._send(Q.copyFail(e));
    }
  };
  a(Sn, "Connection");
  var xn = Sn;
  Zs.exports = xn;
});
var eo = T((np, Xs) => {
  "use strict";
  p();
  var Yc = ge().EventEmitter, rp = (it(), O(nt)), Zc = rt(), An = ds(), Jc = Cs(), Xc = At(), el = Bt(), Js = qs(), tl = tt(), rl = En(), Cn = class Cn extends Yc {
    static {
      __name(this, "Cn");
    }
    static {
      __name2(this, "Cn");
    }
    constructor(e) {
      super(), this.connectionParameters = new el(e), this.user = this.connectionParameters.user, this.database = this.connectionParameters.database, this.port = this.connectionParameters.port, this.host = this.connectionParameters.host, Object.defineProperty(
        this,
        "password",
        { configurable: true, enumerable: false, writable: true, value: this.connectionParameters.password }
      ), this.replication = this.connectionParameters.replication;
      var t = e || {};
      this._Promise = t.Promise || b.Promise, this._types = new Xc(t.types), this._ending = false, this._connecting = false, this._connected = false, this._connectionError = false, this._queryable = true, this.connection = t.connection || new rl({ stream: t.stream, ssl: this.connectionParameters.ssl, keepAlive: t.keepAlive || false, keepAliveInitialDelayMillis: t.keepAliveInitialDelayMillis || 0, encoding: this.connectionParameters.client_encoding || "utf8" }), this.queryQueue = [], this.binary = t.binary || tl.binary, this.processID = null, this.secretKey = null, this.ssl = this.connectionParameters.ssl || false, this.ssl && this.ssl.key && Object.defineProperty(this.ssl, "key", { enumerable: false }), this._connectionTimeoutMillis = t.connectionTimeoutMillis || 0;
    }
    _errorAllQueries(e) {
      let t = a((n) => {
        m.nextTick(() => {
          n.handleError(e, this.connection);
        });
      }, "enqueueError");
      this.activeQuery && (t(this.activeQuery), this.activeQuery = null), this.queryQueue.forEach(t), this.queryQueue.length = 0;
    }
    _connect(e) {
      var t = this, n = this.connection;
      if (this._connectionCallback = e, this._connecting || this._connected) {
        let i = new Error("Client has already been connected. You cannot reuse a client.");
        m.nextTick(
          () => {
            e(i);
          }
        );
        return;
      }
      this._connecting = true, this.connectionTimeoutHandle, this._connectionTimeoutMillis > 0 && (this.connectionTimeoutHandle = setTimeout(() => {
        n._ending = true, n.stream.destroy(new Error("timeout expired"));
      }, this._connectionTimeoutMillis)), this.host && this.host.indexOf("/") === 0 ? n.connect(this.host + "/.s.PGSQL." + this.port) : n.connect(this.port, this.host), n.on("connect", function() {
        t.ssl ? n.requestSsl() : n.startup(t.getStartupConf());
      }), n.on("sslconnect", function() {
        n.startup(t.getStartupConf());
      }), this._attachListeners(
        n
      ), n.once("end", () => {
        let i = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
        clearTimeout(this.connectionTimeoutHandle), this._errorAllQueries(i), this._ending || (this._connecting && !this._connectionError ? this._connectionCallback ? this._connectionCallback(i) : this._handleErrorEvent(i) : this._connectionError || this._handleErrorEvent(i)), m.nextTick(() => {
          this.emit("end");
        });
      });
    }
    connect(e) {
      if (e) {
        this._connect(e);
        return;
      }
      return new this._Promise((t, n) => {
        this._connect((i) => {
          i ? n(i) : t();
        });
      });
    }
    _attachListeners(e) {
      e.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this)), e.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this)), e.on("authenticationSASL", this._handleAuthSASL.bind(this)), e.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this)), e.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this)), e.on("backendKeyData", this._handleBackendKeyData.bind(this)), e.on("error", this._handleErrorEvent.bind(this)), e.on("errorMessage", this._handleErrorMessage.bind(this)), e.on("readyForQuery", this._handleReadyForQuery.bind(this)), e.on("notice", this._handleNotice.bind(this)), e.on("rowDescription", this._handleRowDescription.bind(this)), e.on("dataRow", this._handleDataRow.bind(this)), e.on("portalSuspended", this._handlePortalSuspended.bind(
        this
      )), e.on("emptyQuery", this._handleEmptyQuery.bind(this)), e.on("commandComplete", this._handleCommandComplete.bind(this)), e.on("parseComplete", this._handleParseComplete.bind(this)), e.on("copyInResponse", this._handleCopyInResponse.bind(this)), e.on("copyData", this._handleCopyData.bind(this)), e.on("notification", this._handleNotification.bind(this));
    }
    _checkPgPass(e) {
      let t = this.connection;
      typeof this.password == "function" ? this._Promise.resolve().then(() => this.password()).then((n) => {
        if (n !== void 0) {
          if (typeof n != "string") {
            t.emit("error", new TypeError(
              "Password must be a string"
            ));
            return;
          }
          this.connectionParameters.password = this.password = n;
        } else this.connectionParameters.password = this.password = null;
        e();
      }).catch((n) => {
        t.emit("error", n);
      }) : this.password !== null ? e() : Jc(
        this.connectionParameters,
        (n) => {
          n !== void 0 && (this.connectionParameters.password = this.password = n), e();
        }
      );
    }
    _handleAuthCleartextPassword(e) {
      this._checkPgPass(() => {
        this.connection.password(this.password);
      });
    }
    _handleAuthMD5Password(e) {
      this._checkPgPass(
        () => {
          let t = Zc.postgresMd5PasswordHash(this.user, this.password, e.salt);
          this.connection.password(t);
        }
      );
    }
    _handleAuthSASL(e) {
      this._checkPgPass(() => {
        this.saslSession = An.startSession(e.mechanisms), this.connection.sendSASLInitialResponseMessage(
          this.saslSession.mechanism,
          this.saslSession.response
        );
      });
    }
    _handleAuthSASLContinue(e) {
      An.continueSession(
        this.saslSession,
        this.password,
        e.data
      ), this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
    }
    _handleAuthSASLFinal(e) {
      An.finalizeSession(this.saslSession, e.data), this.saslSession = null;
    }
    _handleBackendKeyData(e) {
      this.processID = e.processID, this.secretKey = e.secretKey;
    }
    _handleReadyForQuery(e) {
      this._connecting && (this._connecting = false, this._connected = true, clearTimeout(this.connectionTimeoutHandle), this._connectionCallback && (this._connectionCallback(null, this), this._connectionCallback = null), this.emit("connect"));
      let { activeQuery: t } = this;
      this.activeQuery = null, this.readyForQuery = true, t && t.handleReadyForQuery(this.connection), this._pulseQueryQueue();
    }
    _handleErrorWhileConnecting(e) {
      if (!this._connectionError) {
        if (this._connectionError = true, clearTimeout(this.connectionTimeoutHandle), this._connectionCallback) return this._connectionCallback(e);
        this.emit("error", e);
      }
    }
    _handleErrorEvent(e) {
      if (this._connecting) return this._handleErrorWhileConnecting(e);
      this._queryable = false, this._errorAllQueries(e), this.emit("error", e);
    }
    _handleErrorMessage(e) {
      if (this._connecting) return this._handleErrorWhileConnecting(e);
      let t = this.activeQuery;
      if (!t) {
        this._handleErrorEvent(e);
        return;
      }
      this.activeQuery = null, t.handleError(
        e,
        this.connection
      );
    }
    _handleRowDescription(e) {
      this.activeQuery.handleRowDescription(e);
    }
    _handleDataRow(e) {
      this.activeQuery.handleDataRow(e);
    }
    _handlePortalSuspended(e) {
      this.activeQuery.handlePortalSuspended(this.connection);
    }
    _handleEmptyQuery(e) {
      this.activeQuery.handleEmptyQuery(this.connection);
    }
    _handleCommandComplete(e) {
      this.activeQuery.handleCommandComplete(e, this.connection);
    }
    _handleParseComplete(e) {
      this.activeQuery.name && (this.connection.parsedStatements[this.activeQuery.name] = this.activeQuery.text);
    }
    _handleCopyInResponse(e) {
      this.activeQuery.handleCopyInResponse(this.connection);
    }
    _handleCopyData(e) {
      this.activeQuery.handleCopyData(
        e,
        this.connection
      );
    }
    _handleNotification(e) {
      this.emit("notification", e);
    }
    _handleNotice(e) {
      this.emit("notice", e);
    }
    getStartupConf() {
      var e = this.connectionParameters, t = { user: e.user, database: e.database }, n = e.application_name || e.fallback_application_name;
      return n && (t.application_name = n), e.replication && (t.replication = "" + e.replication), e.statement_timeout && (t.statement_timeout = String(parseInt(e.statement_timeout, 10))), e.lock_timeout && (t.lock_timeout = String(parseInt(e.lock_timeout, 10))), e.idle_in_transaction_session_timeout && (t.idle_in_transaction_session_timeout = String(parseInt(e.idle_in_transaction_session_timeout, 10))), e.options && (t.options = e.options), t;
    }
    cancel(e, t) {
      if (e.activeQuery === t) {
        var n = this.connection;
        this.host && this.host.indexOf("/") === 0 ? n.connect(this.host + "/.s.PGSQL." + this.port) : n.connect(this.port, this.host), n.on("connect", function() {
          n.cancel(
            e.processID,
            e.secretKey
          );
        });
      } else e.queryQueue.indexOf(t) !== -1 && e.queryQueue.splice(e.queryQueue.indexOf(t), 1);
    }
    setTypeParser(e, t, n) {
      return this._types.setTypeParser(e, t, n);
    }
    getTypeParser(e, t) {
      return this._types.getTypeParser(e, t);
    }
    escapeIdentifier(e) {
      return '"' + e.replace(/"/g, '""') + '"';
    }
    escapeLiteral(e) {
      for (var t = false, n = "'", i = 0; i < e.length; i++) {
        var s2 = e[i];
        s2 === "'" ? n += s2 + s2 : s2 === "\\" ? (n += s2 + s2, t = true) : n += s2;
      }
      return n += "'", t === true && (n = " E" + n), n;
    }
    _pulseQueryQueue() {
      if (this.readyForQuery === true) if (this.activeQuery = this.queryQueue.shift(), this.activeQuery) {
        this.readyForQuery = false, this.hasExecuted = true;
        let e = this.activeQuery.submit(this.connection);
        e && m.nextTick(() => {
          this.activeQuery.handleError(e, this.connection), this.readyForQuery = true, this._pulseQueryQueue();
        });
      } else this.hasExecuted && (this.activeQuery = null, this.emit("drain"));
    }
    query(e, t, n) {
      var i, s2, o, u, c;
      if (e == null) throw new TypeError(
        "Client was passed a null or undefined query"
      );
      return typeof e.submit == "function" ? (o = e.query_timeout || this.connectionParameters.query_timeout, s2 = i = e, typeof t == "function" && (i.callback = i.callback || t)) : (o = this.connectionParameters.query_timeout, i = new Js(e, t, n), i.callback || (s2 = new this._Promise((l, f) => {
        i.callback = (y, g) => y ? f(y) : l(g);
      }))), o && (c = i.callback, u = setTimeout(() => {
        var l = new Error("Query read timeout");
        m.nextTick(
          () => {
            i.handleError(l, this.connection);
          }
        ), c(l), i.callback = () => {
        };
        var f = this.queryQueue.indexOf(i);
        f > -1 && this.queryQueue.splice(f, 1), this._pulseQueryQueue();
      }, o), i.callback = (l, f) => {
        clearTimeout(u), c(l, f);
      }), this.binary && !i.binary && (i.binary = true), i._result && !i._result._types && (i._result._types = this._types), this._queryable ? this._ending ? (m.nextTick(() => {
        i.handleError(new Error("Client was closed and is not queryable"), this.connection);
      }), s2) : (this.queryQueue.push(i), this._pulseQueryQueue(), s2) : (m.nextTick(() => {
        i.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
      }), s2);
    }
    ref() {
      this.connection.ref();
    }
    unref() {
      this.connection.unref();
    }
    end(e) {
      if (this._ending = true, !this.connection._connecting) if (e) e();
      else return this._Promise.resolve();
      if (this.activeQuery || !this._queryable ? this.connection.stream.destroy() : this.connection.end(), e) this.connection.once("end", e);
      else return new this._Promise((t) => {
        this.connection.once("end", t);
      });
    }
  };
  a(Cn, "Client");
  var Ut = Cn;
  Ut.Query = Js;
  Xs.exports = Ut;
});
var io = T((op, no) => {
  "use strict";
  p();
  var nl = ge().EventEmitter, to = a(function() {
  }, "NOOP"), ro = a((r, e) => {
    let t = r.findIndex(e);
    return t === -1 ? void 0 : r.splice(t, 1)[0];
  }, "removeWhere"), Tn = class Tn {
    static {
      __name(this, "Tn");
    }
    static {
      __name2(this, "Tn");
    }
    constructor(e, t, n) {
      this.client = e, this.idleListener = t, this.timeoutId = n;
    }
  };
  a(Tn, "IdleItem");
  var _n = Tn, Pn = class Pn {
    static {
      __name(this, "Pn");
    }
    static {
      __name2(this, "Pn");
    }
    constructor(e) {
      this.callback = e;
    }
  };
  a(Pn, "PendingItem");
  var Qe = Pn;
  function il() {
    throw new Error("Release called on client which has already been released to the pool.");
  }
  __name(il, "il");
  __name2(il, "il");
  a(il, "throwOnDoubleRelease");
  function Dt(r, e) {
    if (e)
      return { callback: e, result: void 0 };
    let t, n, i = a(function(o, u) {
      o ? t(o) : n(u);
    }, "cb"), s2 = new r(function(o, u) {
      n = o, t = u;
    }).catch((o) => {
      throw Error.captureStackTrace(o), o;
    });
    return { callback: i, result: s2 };
  }
  __name(Dt, "Dt");
  __name2(Dt, "Dt");
  a(Dt, "promisify");
  function sl(r, e) {
    return a(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function t(n) {
      n.client = e, e.removeListener("error", t), e.on("error", () => {
        r.log(
          "additional client error after disconnection due to error",
          n
        );
      }), r._remove(e), r.emit("error", n, e);
    }, "t"), "t"), "idleListener");
  }
  __name(sl, "sl");
  __name2(sl, "sl");
  a(sl, "makeIdleListener");
  var Bn = class Bn extends nl {
    static {
      __name(this, "Bn");
    }
    static {
      __name2(this, "Bn");
    }
    constructor(e, t) {
      super(), this.options = Object.assign({}, e), e != null && "password" in e && Object.defineProperty(this.options, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: e.password
      }), e != null && e.ssl && e.ssl.key && Object.defineProperty(this.options.ssl, "key", { enumerable: false }), this.options.max = this.options.max || this.options.poolSize || 10, this.options.min = this.options.min || 0, this.options.maxUses = this.options.maxUses || 1 / 0, this.options.allowExitOnIdle = this.options.allowExitOnIdle || false, this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0, this.log = this.options.log || function() {
      }, this.Client = this.options.Client || t || ot().Client, this.Promise = this.options.Promise || b.Promise, typeof this.options.idleTimeoutMillis > "u" && (this.options.idleTimeoutMillis = 1e4), this._clients = [], this._idle = [], this._expired = /* @__PURE__ */ new WeakSet(), this._pendingQueue = [], this._endCallback = void 0, this.ending = false, this.ended = false;
    }
    _isFull() {
      return this._clients.length >= this.options.max;
    }
    _isAboveMin() {
      return this._clients.length > this.options.min;
    }
    _pulseQueue() {
      if (this.log("pulse queue"), this.ended) {
        this.log("pulse queue ended");
        return;
      }
      if (this.ending) {
        this.log("pulse queue on ending"), this._idle.length && this._idle.slice().map((t) => {
          this._remove(t.client);
        }), this._clients.length || (this.ended = true, this._endCallback());
        return;
      }
      if (!this._pendingQueue.length) {
        this.log("no queued requests");
        return;
      }
      if (!this._idle.length && this._isFull()) return;
      let e = this._pendingQueue.shift();
      if (this._idle.length) {
        let t = this._idle.pop();
        clearTimeout(
          t.timeoutId
        );
        let n = t.client;
        n.ref && n.ref();
        let i = t.idleListener;
        return this._acquireClient(n, e, i, false);
      }
      if (!this._isFull()) return this.newClient(e);
      throw new Error("unexpected condition");
    }
    _remove(e) {
      let t = ro(
        this._idle,
        (n) => n.client === e
      );
      t !== void 0 && clearTimeout(t.timeoutId), this._clients = this._clients.filter(
        (n) => n !== e
      ), e.end(), this.emit("remove", e);
    }
    connect(e) {
      if (this.ending) {
        let i = new Error("Cannot use a pool after calling end on the pool");
        return e ? e(i) : this.Promise.reject(i);
      }
      let t = Dt(this.Promise, e), n = t.result;
      if (this._isFull() || this._idle.length) {
        if (this._idle.length && m.nextTick(() => this._pulseQueue()), !this.options.connectionTimeoutMillis) return this._pendingQueue.push(new Qe(t.callback)), n;
        let i = a((u, c, l) => {
          clearTimeout(o), t.callback(u, c, l);
        }, "queueCallback"), s2 = new Qe(i), o = setTimeout(() => {
          ro(
            this._pendingQueue,
            (u) => u.callback === i
          ), s2.timedOut = true, t.callback(new Error("timeout exceeded when trying to connect"));
        }, this.options.connectionTimeoutMillis);
        return o.unref && o.unref(), this._pendingQueue.push(s2), n;
      }
      return this.newClient(new Qe(t.callback)), n;
    }
    newClient(e) {
      let t = new this.Client(this.options);
      this._clients.push(
        t
      );
      let n = sl(this, t);
      this.log("checking client timeout");
      let i, s2 = false;
      this.options.connectionTimeoutMillis && (i = setTimeout(() => {
        this.log("ending client due to timeout"), s2 = true, t.connection ? t.connection.stream.destroy() : t.end();
      }, this.options.connectionTimeoutMillis)), this.log("connecting new client"), t.connect((o) => {
        if (i && clearTimeout(i), t.on("error", n), o) this.log("client failed to connect", o), this._clients = this._clients.filter((u) => u !== t), s2 && (o = new Error("Connection terminated due to connection timeout", { cause: o })), this._pulseQueue(), e.timedOut || e.callback(o, void 0, to);
        else {
          if (this.log("new client connected"), this.options.maxLifetimeSeconds !== 0) {
            let u = setTimeout(() => {
              this.log("ending client due to expired lifetime"), this._expired.add(t), this._idle.findIndex((l) => l.client === t) !== -1 && this._acquireClient(
                t,
                new Qe((l, f, y) => y()),
                n,
                false
              );
            }, this.options.maxLifetimeSeconds * 1e3);
            u.unref(), t.once("end", () => clearTimeout(u));
          }
          return this._acquireClient(t, e, n, true);
        }
      });
    }
    _acquireClient(e, t, n, i) {
      i && this.emit("connect", e), this.emit("acquire", e), e.release = this._releaseOnce(e, n), e.removeListener("error", n), t.timedOut ? i && this.options.verify ? this.options.verify(e, e.release) : e.release() : i && this.options.verify ? this.options.verify(e, (s2) => {
        if (s2) return e.release(s2), t.callback(s2, void 0, to);
        t.callback(void 0, e, e.release);
      }) : t.callback(void 0, e, e.release);
    }
    _releaseOnce(e, t) {
      let n = false;
      return (i) => {
        n && il(), n = true, this._release(e, t, i);
      };
    }
    _release(e, t, n) {
      if (e.on("error", t), e._poolUseCount = (e._poolUseCount || 0) + 1, this.emit("release", n, e), n || this.ending || !e._queryable || e._ending || e._poolUseCount >= this.options.maxUses) {
        e._poolUseCount >= this.options.maxUses && this.log("remove expended client"), this._remove(e), this._pulseQueue();
        return;
      }
      if (this._expired.has(e)) {
        this.log("remove expired client"), this._expired.delete(e), this._remove(e), this._pulseQueue();
        return;
      }
      let s2;
      this.options.idleTimeoutMillis && this._isAboveMin() && (s2 = setTimeout(() => {
        this.log("remove idle client"), this._remove(e);
      }, this.options.idleTimeoutMillis), this.options.allowExitOnIdle && s2.unref()), this.options.allowExitOnIdle && e.unref(), this._idle.push(new _n(
        e,
        t,
        s2
      )), this._pulseQueue();
    }
    query(e, t, n) {
      if (typeof e == "function") {
        let s2 = Dt(this.Promise, e);
        return v(function() {
          return s2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
        }), s2.result;
      }
      typeof t == "function" && (n = t, t = void 0);
      let i = Dt(this.Promise, n);
      return n = i.callback, this.connect((s2, o) => {
        if (s2) return n(s2);
        let u = false, c = a((l) => {
          u || (u = true, o.release(l), n(l));
        }, "onError");
        o.once("error", c), this.log("dispatching query");
        try {
          o.query(e, t, (l, f) => {
            if (this.log("query dispatched"), o.removeListener(
              "error",
              c
            ), !u) return u = true, o.release(l), l ? n(l) : n(void 0, f);
          });
        } catch (l) {
          return o.release(l), n(l);
        }
      }), i.result;
    }
    end(e) {
      if (this.log("ending"), this.ending) {
        let n = new Error("Called end on pool more than once");
        return e ? e(n) : this.Promise.reject(n);
      }
      this.ending = true;
      let t = Dt(this.Promise, e);
      return this._endCallback = t.callback, this._pulseQueue(), t.result;
    }
    get waitingCount() {
      return this._pendingQueue.length;
    }
    get idleCount() {
      return this._idle.length;
    }
    get expiredCount() {
      return this._clients.reduce((e, t) => e + (this._expired.has(t) ? 1 : 0), 0);
    }
    get totalCount() {
      return this._clients.length;
    }
  };
  a(Bn, "Pool");
  var In = Bn;
  no.exports = In;
});
var so = {};
ie(so, { default: /* @__PURE__ */ __name2(() => ol, "default") });
var ol;
var oo = G(() => {
  "use strict";
  p();
  ol = {};
});
var ao = T((lp, al) => {
  al.exports = { name: "pg", version: "8.8.0", description: "PostgreSQL client - pure javascript & libpq with the same API", keywords: [
    "database",
    "libpq",
    "pg",
    "postgre",
    "postgres",
    "postgresql",
    "rdbms"
  ], homepage: "https://github.com/brianc/node-postgres", repository: { type: "git", url: "git://github.com/brianc/node-postgres.git", directory: "packages/pg" }, author: "Brian Carlson <brian.m.carlson@gmail.com>", main: "./lib", dependencies: { "buffer-writer": "2.0.0", "packet-reader": "1.0.0", "pg-connection-string": "^2.5.0", "pg-pool": "^3.5.2", "pg-protocol": "^1.5.0", "pg-types": "^2.1.0", pgpass: "1.x" }, devDependencies: {
    async: "2.6.4",
    bluebird: "3.5.2",
    co: "4.6.0",
    "pg-copy-streams": "0.3.0"
  }, peerDependencies: { "pg-native": ">=3.0.1" }, peerDependenciesMeta: { "pg-native": { optional: true } }, scripts: { test: "make test-all" }, files: ["lib", "SPONSORS.md"], license: "MIT", engines: { node: ">= 8.0.0" }, gitHead: "c99fb2c127ddf8d712500db2c7b9a5491a178655" };
});
var lo = T((fp, co) => {
  "use strict";
  p();
  var uo = ge().EventEmitter, ul = (it(), O(nt)), Rn = rt(), Ne = co.exports = function(r, e, t) {
    uo.call(this), r = Rn.normalizeQueryConfig(r, e, t), this.text = r.text, this.values = r.values, this.name = r.name, this.callback = r.callback, this.state = "new", this._arrayMode = r.rowMode === "array", this._emitRowEvents = false, this.on("newListener", function(n) {
      n === "row" && (this._emitRowEvents = true);
    }.bind(this));
  };
  ul.inherits(Ne, uo);
  var cl = { sqlState: "code", statementPosition: "position", messagePrimary: "message", context: "where", schemaName: "schema", tableName: "table", columnName: "column", dataTypeName: "dataType", constraintName: "constraint", sourceFile: "file", sourceLine: "line", sourceFunction: "routine" };
  Ne.prototype.handleError = function(r) {
    var e = this.native.pq.resultErrorFields();
    if (e) for (var t in e) {
      var n = cl[t] || t;
      r[n] = e[t];
    }
    this.callback ? this.callback(r) : this.emit("error", r), this.state = "error";
  };
  Ne.prototype.then = function(r, e) {
    return this._getPromise().then(
      r,
      e
    );
  };
  Ne.prototype.catch = function(r) {
    return this._getPromise().catch(r);
  };
  Ne.prototype._getPromise = function() {
    return this._promise ? this._promise : (this._promise = new Promise(function(r, e) {
      this._once("end", r), this._once("error", e);
    }.bind(this)), this._promise);
  };
  Ne.prototype.submit = function(r) {
    this.state = "running";
    var e = this;
    this.native = r.native, r.native.arrayMode = this._arrayMode;
    var t = a(function(s2, o, u) {
      if (r.native.arrayMode = false, v(function() {
        e.emit("_done");
      }), s2) return e.handleError(s2);
      e._emitRowEvents && (u.length > 1 ? o.forEach(
        (c, l) => {
          c.forEach((f) => {
            e.emit("row", f, u[l]);
          });
        }
      ) : o.forEach(function(c) {
        e.emit("row", c, u);
      })), e.state = "end", e.emit("end", u), e.callback && e.callback(null, u);
    }, "after");
    if (m.domain && (t = m.domain.bind(t)), this.name) {
      this.name.length > 63 && (console.error("Warning! Postgres only supports 63 characters for query names."), console.error("You supplied %s (%s)", this.name, this.name.length), console.error("This can cause conflicts and silent errors executing queries"));
      var n = (this.values || []).map(Rn.prepareValue);
      if (r.namedQueries[this.name]) {
        if (this.text && r.namedQueries[this.name] !== this.text) {
          let s2 = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
          return t(s2);
        }
        return r.native.execute(this.name, n, t);
      }
      return r.native.prepare(this.name, this.text, n.length, function(s2) {
        return s2 ? t(s2) : (r.namedQueries[e.name] = e.text, e.native.execute(e.name, n, t));
      });
    } else if (this.values) {
      if (!Array.isArray(
        this.values
      )) {
        let s2 = new Error("Query values must be an array");
        return t(s2);
      }
      var i = this.values.map(Rn.prepareValue);
      r.native.query(this.text, i, t);
    } else r.native.query(this.text, t);
  };
});
var yo = T((yp, po) => {
  "use strict";
  p();
  var ll = (oo(), O(so)), fl = At(), dp = ao(), fo = ge().EventEmitter, hl = (it(), O(nt)), pl = Bt(), ho = lo(), K = po.exports = function(r) {
    fo.call(this), r = r || {}, this._Promise = r.Promise || b.Promise, this._types = new fl(r.types), this.native = new ll({ types: this._types }), this._queryQueue = [], this._ending = false, this._connecting = false, this._connected = false, this._queryable = true;
    var e = this.connectionParameters = new pl(r);
    this.user = e.user, Object.defineProperty(this, "password", { configurable: true, enumerable: false, writable: true, value: e.password }), this.database = e.database, this.host = e.host, this.port = e.port, this.namedQueries = {};
  };
  K.Query = ho;
  hl.inherits(K, fo);
  K.prototype._errorAllQueries = function(r) {
    let e = a((t) => {
      m.nextTick(() => {
        t.native = this.native, t.handleError(r);
      });
    }, "enqueueError");
    this._hasActiveQuery() && (e(this._activeQuery), this._activeQuery = null), this._queryQueue.forEach(e), this._queryQueue.length = 0;
  };
  K.prototype._connect = function(r) {
    var e = this;
    if (this._connecting) {
      m.nextTick(() => r(new Error("Client has already been connected. You cannot reuse a client.")));
      return;
    }
    this._connecting = true, this.connectionParameters.getLibpqConnectionString(function(t, n) {
      if (t) return r(t);
      e.native.connect(n, function(i) {
        if (i) return e.native.end(), r(i);
        e._connected = true, e.native.on("error", function(s2) {
          e._queryable = false, e._errorAllQueries(s2), e.emit("error", s2);
        }), e.native.on("notification", function(s2) {
          e.emit("notification", { channel: s2.relname, payload: s2.extra });
        }), e.emit("connect"), e._pulseQueryQueue(true), r();
      });
    });
  };
  K.prototype.connect = function(r) {
    if (r) {
      this._connect(r);
      return;
    }
    return new this._Promise((e, t) => {
      this._connect((n) => {
        n ? t(n) : e();
      });
    });
  };
  K.prototype.query = function(r, e, t) {
    var n, i, s2, o, u;
    if (r == null) throw new TypeError("Client was passed a null or undefined query");
    if (typeof r.submit == "function") s2 = r.query_timeout || this.connectionParameters.query_timeout, i = n = r, typeof e == "function" && (r.callback = e);
    else if (s2 = this.connectionParameters.query_timeout, n = new ho(r, e, t), !n.callback) {
      let c, l;
      i = new this._Promise((f, y) => {
        c = f, l = y;
      }), n.callback = (f, y) => f ? l(f) : c(y);
    }
    return s2 && (u = n.callback, o = setTimeout(() => {
      var c = new Error(
        "Query read timeout"
      );
      m.nextTick(() => {
        n.handleError(c, this.connection);
      }), u(c), n.callback = () => {
      };
      var l = this._queryQueue.indexOf(n);
      l > -1 && this._queryQueue.splice(l, 1), this._pulseQueryQueue();
    }, s2), n.callback = (c, l) => {
      clearTimeout(o), u(c, l);
    }), this._queryable ? this._ending ? (n.native = this.native, m.nextTick(() => {
      n.handleError(
        new Error("Client was closed and is not queryable")
      );
    }), i) : (this._queryQueue.push(n), this._pulseQueryQueue(), i) : (n.native = this.native, m.nextTick(() => {
      n.handleError(new Error("Client has encountered a connection error and is not queryable"));
    }), i);
  };
  K.prototype.end = function(r) {
    var e = this;
    this._ending = true, this._connected || this.once("connect", this.end.bind(this, r));
    var t;
    return r || (t = new this._Promise(function(n, i) {
      r = a((s2) => s2 ? i(s2) : n(), "cb");
    })), this.native.end(function() {
      e._errorAllQueries(new Error("Connection terminated")), m.nextTick(() => {
        e.emit("end"), r && r();
      });
    }), t;
  };
  K.prototype._hasActiveQuery = function() {
    return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
  };
  K.prototype._pulseQueryQueue = function(r) {
    if (this._connected && !this._hasActiveQuery()) {
      var e = this._queryQueue.shift();
      if (!e) {
        r || this.emit("drain");
        return;
      }
      this._activeQuery = e, e.submit(this);
      var t = this;
      e.once("_done", function() {
        t._pulseQueryQueue();
      });
    }
  };
  K.prototype.cancel = function(r) {
    this._activeQuery === r ? this.native.cancel(function() {
    }) : this._queryQueue.indexOf(r) !== -1 && this._queryQueue.splice(this._queryQueue.indexOf(r), 1);
  };
  K.prototype.ref = function() {
  };
  K.prototype.unref = function() {
  };
  K.prototype.setTypeParser = function(r, e, t) {
    return this._types.setTypeParser(
      r,
      e,
      t
    );
  };
  K.prototype.getTypeParser = function(r, e) {
    return this._types.getTypeParser(r, e);
  };
});
var Ln = T((gp, mo) => {
  "use strict";
  p();
  mo.exports = yo();
});
var ot = T((vp, at) => {
  "use strict";
  p();
  var dl = eo(), yl = tt(), ml = En(), wl = io(), { DatabaseError: gl } = vn(), bl = a(
    (r) => {
      var e;
      return e = class extends wl {
        static {
          __name(this, "e");
        }
        static {
          __name2(this, "e");
        }
        constructor(n) {
          super(n, r);
        }
      }, a(e, "BoundPool"), e;
    },
    "poolFactory"
  ), Fn = a(
    function(r) {
      this.defaults = yl, this.Client = r, this.Query = this.Client.Query, this.Pool = bl(this.Client), this._pools = [], this.Connection = ml, this.types = Je(), this.DatabaseError = gl;
    },
    "PG"
  );
  typeof m.env.NODE_PG_FORCE_NATIVE < "u" ? at.exports = new Fn(Ln()) : (at.exports = new Fn(dl), Object.defineProperty(at.exports, "native", {
    configurable: true,
    enumerable: false,
    get() {
      var r = null;
      try {
        r = new Fn(Ln());
      } catch (e) {
        if (e.code !== "MODULE_NOT_FOUND") throw e;
      }
      return Object.defineProperty(at.exports, "native", { value: r }), r;
    }
  }));
});
p();
p();
Fe();
Zt();
p();
var pa = Object.defineProperty;
var da = Object.defineProperties;
var ya = Object.getOwnPropertyDescriptors;
var bi = Object.getOwnPropertySymbols;
var ma = Object.prototype.hasOwnProperty;
var wa = Object.prototype.propertyIsEnumerable;
var vi = a(
  (r, e, t) => e in r ? pa(r, e, { enumerable: true, configurable: true, writable: true, value: t }) : r[e] = t,
  "__defNormalProp"
);
var ga = a((r, e) => {
  for (var t in e || (e = {})) ma.call(e, t) && vi(r, t, e[t]);
  if (bi) for (var t of bi(e)) wa.call(e, t) && vi(r, t, e[t]);
  return r;
}, "__spreadValues");
var ba = a((r, e) => da(r, ya(e)), "__spreadProps");
var va = 1008e3;
var xi = new Uint8Array(
  new Uint16Array([258]).buffer
)[0] === 2;
var xa = new TextDecoder();
var Jt = new TextEncoder();
var yt = Jt.encode("0123456789abcdef");
var mt = Jt.encode("0123456789ABCDEF");
var Sa = Jt.encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
var Si = Sa.slice();
Si[62] = 45;
Si[63] = 95;
var He;
var wt;
function Ea(r, { alphabet: e, scratchArr: t } = {}) {
  if (!He) if (He = new Uint16Array(256), wt = new Uint16Array(256), xi) for (let C = 0; C < 256; C++) He[C] = yt[C & 15] << 8 | yt[C >>> 4], wt[C] = mt[C & 15] << 8 | mt[C >>> 4];
  else for (let C = 0; C < 256; C++) He[C] = yt[C & 15] | yt[C >>> 4] << 8, wt[C] = mt[C & 15] | mt[C >>> 4] << 8;
  r.byteOffset % 4 !== 0 && (r = new Uint8Array(r));
  let n = r.length, i = n >>> 1, s2 = n >>> 2, o = t || new Uint16Array(n), u = new Uint32Array(
    r.buffer,
    r.byteOffset,
    s2
  ), c = new Uint32Array(o.buffer, o.byteOffset, i), l = e === "upper" ? wt : He, f = 0, y = 0, g;
  if (xi)
    for (; f < s2; ) g = u[f++], c[y++] = l[g >>> 8 & 255] << 16 | l[g & 255], c[y++] = l[g >>> 24] << 16 | l[g >>> 16 & 255];
  else for (; f < s2; )
    g = u[f++], c[y++] = l[g >>> 24] << 16 | l[g >>> 16 & 255], c[y++] = l[g >>> 8 & 255] << 16 | l[g & 255];
  for (f <<= 2; f < n; ) o[f] = l[r[f++]];
  return xa.decode(o.subarray(0, n));
}
__name(Ea, "Ea");
__name2(Ea, "Ea");
a(Ea, "_toHex");
function Aa(r, e = {}) {
  let t = "", n = r.length, i = va >>> 1, s2 = Math.ceil(n / i), o = new Uint16Array(s2 > 1 ? i : n);
  for (let u = 0; u < s2; u++) {
    let c = u * i, l = c + i;
    t += Ea(r.subarray(c, l), ba(ga(
      {},
      e
    ), { scratchArr: o }));
  }
  return t;
}
__name(Aa, "Aa");
__name2(Aa, "Aa");
a(Aa, "_toHexChunked");
function Ei(r, e = {}) {
  return e.alphabet !== "upper" && typeof r.toHex == "function" ? r.toHex() : Aa(r, e);
}
__name(Ei, "Ei");
__name2(Ei, "Ei");
a(Ei, "toHex");
p();
var gt = class gt2 {
  static {
    __name(this, "gt2");
  }
  static {
    __name2(this, "gt");
  }
  constructor(e, t) {
    this.strings = e;
    this.values = t;
  }
  toParameterizedQuery(e = { query: "", params: [] }) {
    let { strings: t, values: n } = this;
    for (let i = 0, s2 = t.length; i < s2; i++) if (e.query += t[i], i < n.length) {
      let o = n[i];
      if (o instanceof Ge) e.query += o.sql;
      else if (o instanceof Ce) if (o.queryData instanceof gt2) o.queryData.toParameterizedQuery(
        e
      );
      else {
        if (o.queryData.params?.length) throw new Error("This query is not composable");
        e.query += o.queryData.query;
      }
      else {
        let { params: u } = e;
        u.push(o), e.query += "$" + u.length, (o instanceof d || ArrayBuffer.isView(o)) && (e.query += "::bytea");
      }
    }
    return e;
  }
};
a(gt, "SqlTemplate");
var $e = gt;
var Xt = class Xt2 {
  static {
    __name(this, "Xt2");
  }
  static {
    __name2(this, "Xt");
  }
  constructor(e) {
    this.sql = e;
  }
};
a(Xt, "UnsafeRawSql");
var Ge = Xt;
p();
function bt() {
  typeof window < "u" && typeof document < "u" && typeof console < "u" && typeof console.warn == "function" && console.warn(`          
        ************************************************************
        *                                                          *
        *  WARNING: Running SQL directly from the browser can have *
        *  security implications. Even if your database is         *
        *  protected by Row-Level Security (RLS), use it at your   *
        *  own risk. This approach is great for fast prototyping,  *
        *  but ensure proper safeguards are in place to prevent    *
        *  misuse or execution of expensive SQL queries by your    *
        *  end users.                                              *
        *                                                          *
        *  If you've assessed the risks, suppress this message     *
        *  using the disableWarningInBrowsers configuration        *
        *  parameter.                                              *
        *                                                          *
        ************************************************************`);
}
__name(bt, "bt");
__name2(bt, "bt");
a(bt, "warnIfBrowser");
Fe();
var as = Se(At());
var us = Se(rt());
var _t = class _t2 extends Error {
  static {
    __name(this, "_t2");
  }
  static {
    __name2(this, "_t");
  }
  constructor(t) {
    super(t);
    E(this, "name", "NeonDbError");
    E(this, "severity");
    E(this, "code");
    E(this, "detail");
    E(this, "hint");
    E(this, "position");
    E(this, "internalPosition");
    E(
      this,
      "internalQuery"
    );
    E(this, "where");
    E(this, "schema");
    E(this, "table");
    E(this, "column");
    E(this, "dataType");
    E(this, "constraint");
    E(this, "file");
    E(this, "line");
    E(this, "routine");
    E(this, "sourceError");
    "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(this, _t2);
  }
};
a(
  _t,
  "NeonDbError"
);
var be = _t;
var is = "transaction() expects an array of queries, or a function returning an array of queries";
var Ru = ["severity", "code", "detail", "hint", "position", "internalPosition", "internalQuery", "where", "schema", "table", "column", "dataType", "constraint", "file", "line", "routine"];
function Lu(r) {
  return r instanceof d ? "\\x" + Ei(r) : r;
}
__name(Lu, "Lu");
__name2(Lu, "Lu");
a(Lu, "encodeBuffersAsBytea");
function ss(r) {
  let { query: e, params: t } = r instanceof $e ? r.toParameterizedQuery() : r;
  return { query: e, params: t.map((n) => Lu((0, us.prepareValue)(n))) };
}
__name(ss, "ss");
__name2(ss, "ss");
a(ss, "prepareQuery");
function cs(r, {
  arrayMode: e,
  fullResults: t,
  fetchOptions: n,
  isolationLevel: i,
  readOnly: s2,
  deferrable: o,
  authToken: u,
  disableWarningInBrowsers: c
} = {}) {
  if (!r) throw new Error("No database connection string was provided to `neon()`. Perhaps an environment variable has not been set?");
  let l;
  try {
    l = Yt(r);
  } catch {
    throw new Error(
      "Database connection string provided to `neon()` is not a valid URL. Connection string: " + String(r)
    );
  }
  let { protocol: f, username: y, hostname: g, port: A, pathname: C } = l;
  if (f !== "postgres:" && f !== "postgresql:" || !y || !g || !C) throw new Error("Database connection string format for `neon()` should be: postgresql://user:password@host.tld/dbname?option=value");
  function D2(P2, ...I2) {
    if (!(Array.isArray(P2) && Array.isArray(P2.raw) && Array.isArray(I2))) throw new Error('This function can now be called only as a tagged-template function: sql`SELECT ${value}`, not sql("SELECT $1", [value], options). For a conventional function call with value placeholders ($1, $2, etc.), use sql.query("SELECT $1", [value], options).');
    return new Ce(
      Y,
      new $e(P2, I2)
    );
  }
  __name(D2, "D2");
  __name2(D2, "D");
  a(D2, "templateFn"), D2.query = (P2, I2, w) => new Ce(Y, { query: P2, params: I2 ?? [] }, w), D2.unsafe = (P2) => new Ge(
    P2
  ), D2.transaction = async (P2, I2) => {
    if (typeof P2 == "function" && (P2 = P2(D2)), !Array.isArray(P2)) throw new Error(is);
    P2.forEach((W2) => {
      if (!(W2 instanceof Ce)) throw new Error(is);
    });
    let w = P2.map((W2) => W2.queryData), Z = P2.map((W2) => W2.opts ?? {});
    return Y(w, Z, I2);
  };
  async function Y(P2, I2, w) {
    let { fetchEndpoint: Z, fetchFunction: W2 } = ce, J = Array.isArray(
      P2
    ) ? { queries: P2.map((ee) => ss(ee)) } : ss(P2), X = n ?? {}, se = e ?? false, oe = t ?? false, R = i, j = s2, le = o;
    w !== void 0 && (w.fetchOptions !== void 0 && (X = { ...X, ...w.fetchOptions }), w.arrayMode !== void 0 && (se = w.arrayMode), w.fullResults !== void 0 && (oe = w.fullResults), w.isolationLevel !== void 0 && (R = w.isolationLevel), w.readOnly !== void 0 && (j = w.readOnly), w.deferrable !== void 0 && (le = w.deferrable)), I2 !== void 0 && !Array.isArray(I2) && I2.fetchOptions !== void 0 && (X = { ...X, ...I2.fetchOptions });
    let de = u;
    !Array.isArray(I2) && I2?.authToken !== void 0 && (de = I2.authToken);
    let We = typeof Z == "function" ? Z(g, A, { jwtAuth: de !== void 0 }) : Z, fe = { "Neon-Connection-String": r, "Neon-Raw-Text-Output": "true", "Neon-Array-Mode": "true" }, _e = await Fu(de);
    _e && (fe.Authorization = `Bearer ${_e}`), Array.isArray(P2) && (R !== void 0 && (fe["Neon-Batch-Isolation-Level"] = R), j !== void 0 && (fe["Neon-Batch-Read-Only"] = String(j)), le !== void 0 && (fe["Neon-Batch-Deferrable"] = String(le))), c || ce.disableWarningInBrowsers || bt();
    let ye;
    try {
      ye = await (W2 ?? fetch)(We, { method: "POST", body: JSON.stringify(J), headers: fe, ...X });
    } catch (ee) {
      let M = new be(
        `Error connecting to database: ${ee}`
      );
      throw M.sourceError = ee, M;
    }
    if (ye.ok) {
      let ee = await ye.json();
      if (Array.isArray(P2)) {
        let M = ee.results;
        if (!Array.isArray(M)) throw new be("Neon internal error: unexpected result format");
        return M.map(($2, me) => {
          let Ot = I2[me] ?? {}, vo = Ot.arrayMode ?? se, xo = Ot.fullResults ?? oe;
          return os(
            $2,
            { arrayMode: vo, fullResults: xo, types: Ot.types }
          );
        });
      } else {
        let M = I2 ?? {}, $2 = M.arrayMode ?? se, me = M.fullResults ?? oe;
        return os(ee, { arrayMode: $2, fullResults: me, types: M.types });
      }
    } else {
      let { status: ee } = ye;
      if (ee === 400) {
        let M = await ye.json(), $2 = new be(M.message);
        for (let me of Ru) $2[me] = M[me] ?? void 0;
        throw $2;
      } else {
        let M = await ye.text();
        throw new be(
          `Server error (HTTP status ${ee}): ${M}`
        );
      }
    }
  }
  __name(Y, "Y");
  __name2(Y, "Y");
  return a(Y, "execute"), D2;
}
__name(cs, "cs");
__name2(cs, "cs");
a(cs, "neon");
var dr = class dr2 {
  static {
    __name(this, "dr2");
  }
  static {
    __name2(this, "dr");
  }
  constructor(e, t, n) {
    this.execute = e;
    this.queryData = t;
    this.opts = n;
  }
  then(e, t) {
    return this.execute(this.queryData, this.opts).then(e, t);
  }
  catch(e) {
    return this.execute(this.queryData, this.opts).catch(e);
  }
  finally(e) {
    return this.execute(
      this.queryData,
      this.opts
    ).finally(e);
  }
};
a(dr, "NeonQueryPromise");
var Ce = dr;
function os(r, {
  arrayMode: e,
  fullResults: t,
  types: n
}) {
  let i = new as.default(n), s2 = r.fields.map((c) => c.name), o = r.fields.map((c) => i.getTypeParser(
    c.dataTypeID
  )), u = e === true ? r.rows.map((c) => c.map((l, f) => l === null ? null : o[f](l))) : r.rows.map((c) => Object.fromEntries(
    c.map((l, f) => [s2[f], l === null ? null : o[f](l)])
  ));
  return t ? (r.viaNeonFetch = true, r.rowAsArray = e, r.rows = u, r._parsers = o, r._types = i, r) : u;
}
__name(os, "os");
__name2(os, "os");
a(os, "processQueryResult");
async function Fu(r) {
  if (typeof r == "string") return r;
  if (typeof r == "function") try {
    return await Promise.resolve(r());
  } catch (e) {
    let t = new be("Error getting auth token.");
    throw e instanceof Error && (t = new be(`Error getting auth token: ${e.message}`)), t;
  }
}
__name(Fu, "Fu");
__name2(Fu, "Fu");
a(Fu, "getAuthToken");
p();
var go = Se(ot());
p();
var wo = Se(ot());
var kn = class kn2 extends wo.Client {
  static {
    __name(this, "kn2");
  }
  static {
    __name2(this, "kn");
  }
  constructor(t) {
    super(t);
    this.config = t;
  }
  get neonConfig() {
    return this.connection.stream;
  }
  connect(t) {
    let { neonConfig: n } = this;
    n.forceDisablePgSSL && (this.ssl = this.connection.ssl = false), this.ssl && n.useSecureWebSocket && console.warn("SSL is enabled for both Postgres (e.g. ?sslmode=require in the connection string + forceDisablePgSSL = false) and the WebSocket tunnel (useSecureWebSocket = true). Double encryption will increase latency and CPU usage. It may be appropriate to disable SSL in the Postgres connection parameters or set forceDisablePgSSL = true.");
    let i = typeof this.config != "string" && this.config?.host !== void 0 || typeof this.config != "string" && this.config?.connectionString !== void 0 || m.env.PGHOST !== void 0, s2 = m.env.USER ?? m.env.USERNAME;
    if (!i && this.host === "localhost" && this.user === s2 && this.database === s2 && this.password === null) throw new Error(`No database host or connection string was set, and key parameters have default values (host: localhost, user: ${s2}, db: ${s2}, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.`);
    let o = super.connect(t), u = n.pipelineTLS && this.ssl, c = n.pipelineConnect === "password";
    if (!u && !n.pipelineConnect) return o;
    let l = this.connection;
    if (u && l.on(
      "connect",
      () => l.stream.emit("data", "S")
    ), c) {
      l.removeAllListeners("authenticationCleartextPassword"), l.removeAllListeners("readyForQuery"), l.once("readyForQuery", () => l.on("readyForQuery", this._handleReadyForQuery.bind(this)));
      let f = this.ssl ? "sslconnect" : "connect";
      l.on(f, () => {
        this.neonConfig.disableWarningInBrowsers || bt(), this._handleAuthCleartextPassword(), this._handleReadyForQuery();
      });
    }
    return o;
  }
  async _handleAuthSASLContinue(t) {
    if (typeof crypto > "u" || crypto.subtle === void 0 || crypto.subtle.importKey === void 0) throw new Error("Cannot use SASL auth when `crypto.subtle` is not defined");
    let n = crypto.subtle, i = this.saslSession, s2 = this.password, o = t.data;
    if (i.message !== "SASLInitialResponse" || typeof s2 != "string" || typeof o != "string") throw new Error(
      "SASL: protocol error"
    );
    let u = Object.fromEntries(o.split(",").map((M) => {
      if (!/^.=/.test(M)) throw new Error(
        "SASL: Invalid attribute pair entry"
      );
      let $2 = M[0], me = M.substring(2);
      return [$2, me];
    })), c = u.r, l = u.s, f = u.i;
    if (!c || !/^[!-+--~]+$/.test(c)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing/unprintable");
    if (!l || !/^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(l)) throw new Error(
      "SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing/not base64"
    );
    if (!f || !/^[1-9][0-9]*$/.test(f)) throw new Error(
      "SASL: SCRAM-SERVER-FIRST-MESSAGE: missing/invalid iteration count"
    );
    if (!c.startsWith(i.clientNonce))
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
    if (c.length === i.clientNonce.length) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
    let y = parseInt(f, 10), g = d.from(l, "base64"), A = new TextEncoder(), C = A.encode(s2), D2 = await n.importKey(
      "raw",
      C,
      { name: "HMAC", hash: { name: "SHA-256" } },
      false,
      ["sign"]
    ), Y = new Uint8Array(await n.sign("HMAC", D2, d.concat(
      [g, d.from([0, 0, 0, 1])]
    ))), P2 = Y;
    for (var I2 = 0; I2 < y - 1; I2++) Y = new Uint8Array(await n.sign("HMAC", D2, Y)), P2 = d.from(
      P2.map((M, $2) => P2[$2] ^ Y[$2])
    );
    let w = P2, Z = await n.importKey(
      "raw",
      w,
      { name: "HMAC", hash: { name: "SHA-256" } },
      false,
      ["sign"]
    ), W2 = new Uint8Array(await n.sign("HMAC", Z, A.encode("Client Key"))), J = await n.digest(
      "SHA-256",
      W2
    ), X = "n=*,r=" + i.clientNonce, se = "r=" + c + ",s=" + l + ",i=" + y, oe = "c=biws,r=" + c, R = X + "," + se + "," + oe, j = await n.importKey(
      "raw",
      J,
      { name: "HMAC", hash: { name: "SHA-256" } },
      false,
      ["sign"]
    );
    var le = new Uint8Array(await n.sign(
      "HMAC",
      j,
      A.encode(R)
    )), de = d.from(W2.map((M, $2) => W2[$2] ^ le[$2])), We = de.toString("base64");
    let fe = await n.importKey(
      "raw",
      w,
      { name: "HMAC", hash: { name: "SHA-256" } },
      false,
      ["sign"]
    ), _e = await n.sign("HMAC", fe, A.encode("Server Key")), ye = await n.importKey("raw", _e, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]);
    var ee = d.from(
      await n.sign("HMAC", ye, A.encode(R))
    );
    i.message = "SASLResponse", i.serverSignature = ee.toString("base64"), i.response = oe + ",p=" + We, this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
  }
};
a(
  kn,
  "NeonClient"
);
var ut = kn;
Fe();
var bo = Se(Bt());
function vl(r, e) {
  if (e) return { callback: e, result: void 0 };
  let t, n, i = a(function(o, u) {
    o ? t(o) : n(u);
  }, "cb"), s2 = new r(function(o, u) {
    n = o, t = u;
  });
  return { callback: i, result: s2 };
}
__name(vl, "vl");
__name2(vl, "vl");
a(vl, "promisify");
var Un = class Un2 extends go.Pool {
  static {
    __name(this, "Un2");
  }
  static {
    __name2(this, "Un");
  }
  constructor() {
    super(...arguments);
    E(this, "Client", ut);
    E(this, "hasFetchUnsupportedListeners", false);
    E(this, "addListener", this.on);
  }
  on(t, n) {
    return t !== "error" && (this.hasFetchUnsupportedListeners = true), super.on(t, n);
  }
  query(t, n, i) {
    if (!ce.poolQueryViaFetch || this.hasFetchUnsupportedListeners || typeof t == "function") return super.query(
      t,
      n,
      i
    );
    typeof n == "function" && (i = n, n = void 0);
    let s2 = vl(this.Promise, i);
    i = s2.callback;
    try {
      let o = new bo.default(
        this.options
      ), u = encodeURIComponent, c = encodeURI, l = `postgresql://${u(o.user)}:${u(o.password)}@${u(o.host)}/${c(o.database)}`, f = typeof t == "string" ? t : t.text, y = n ?? t.values ?? [];
      cs(l, { fullResults: true, arrayMode: t.rowMode === "array" }).query(f, y, { types: t.types ?? this.options?.types }).then((A) => i(void 0, A)).catch((A) => i(
        A
      ));
    } catch (o) {
      i(o);
    }
    return s2.result;
  }
};
a(Un, "NeonPool");
Fe();
var ct = Se(ot());
var export_DatabaseError = ct.DatabaseError;
var export_defaults = ct.defaults;
var export_escapeIdentifier = ct.escapeIdentifier;
var export_escapeLiteral = ct.escapeLiteral;
var export_types = ct.types;
var entityKind = /* @__PURE__ */ Symbol.for("drizzle:entityKind");
function is2(value, type) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (value instanceof type) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(type, entityKind)) {
    throw new Error(
      `Class "${type.name ?? "<unknown>"}" doesn't look like a Drizzle entity. If this is incorrect and the class is provided by Drizzle, please report this as a bug.`
    );
  }
  let cls = Object.getPrototypeOf(value).constructor;
  if (cls) {
    while (cls) {
      if (entityKind in cls && cls[entityKind] === type[entityKind]) {
        return true;
      }
      cls = Object.getPrototypeOf(cls);
    }
  }
  return false;
}
__name(is2, "is2");
__name2(is2, "is");
var ConsoleLogWriter = class {
  static {
    __name(this, "ConsoleLogWriter");
  }
  static {
    __name2(this, "ConsoleLogWriter");
  }
  static [entityKind] = "ConsoleLogWriter";
  write(message) {
    console.log(message);
  }
};
var DefaultLogger = class {
  static {
    __name(this, "DefaultLogger");
  }
  static {
    __name2(this, "DefaultLogger");
  }
  static [entityKind] = "DefaultLogger";
  writer;
  constructor(config) {
    this.writer = config?.writer ?? new ConsoleLogWriter();
  }
  logQuery(query, params) {
    const stringifiedParams = params.map((p2) => {
      try {
        return JSON.stringify(p2);
      } catch {
        return String(p2);
      }
    });
    const paramsStr = stringifiedParams.length ? ` -- params: [${stringifiedParams.join(", ")}]` : "";
    this.writer.write(`Query: ${query}${paramsStr}`);
  }
};
var NoopLogger = class {
  static {
    __name(this, "NoopLogger");
  }
  static {
    __name2(this, "NoopLogger");
  }
  static [entityKind] = "NoopLogger";
  logQuery() {
  }
};
var QueryPromise = class {
  static {
    __name(this, "QueryPromise");
  }
  static {
    __name2(this, "QueryPromise");
  }
  static [entityKind] = "QueryPromise";
  [Symbol.toStringTag] = "QueryPromise";
  catch(onRejected) {
    return this.then(void 0, onRejected);
  }
  finally(onFinally) {
    return this.then(
      (value) => {
        onFinally?.();
        return value;
      },
      (reason) => {
        onFinally?.();
        throw reason;
      }
    );
  }
  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }
};
var Column = class {
  static {
    __name(this, "Column");
  }
  static {
    __name2(this, "Column");
  }
  constructor(table, config) {
    this.table = table;
    this.config = config;
    this.name = config.name;
    this.keyAsName = config.keyAsName;
    this.notNull = config.notNull;
    this.default = config.default;
    this.defaultFn = config.defaultFn;
    this.onUpdateFn = config.onUpdateFn;
    this.hasDefault = config.hasDefault;
    this.primary = config.primaryKey;
    this.isUnique = config.isUnique;
    this.uniqueName = config.uniqueName;
    this.uniqueType = config.uniqueType;
    this.dataType = config.dataType;
    this.columnType = config.columnType;
    this.generated = config.generated;
    this.generatedIdentity = config.generatedIdentity;
  }
  static [entityKind] = "Column";
  name;
  keyAsName;
  primary;
  notNull;
  default;
  defaultFn;
  onUpdateFn;
  hasDefault;
  isUnique;
  uniqueName;
  uniqueType;
  dataType;
  columnType;
  enumValues = void 0;
  generated = void 0;
  generatedIdentity = void 0;
  config;
  mapFromDriverValue(value) {
    return value;
  }
  mapToDriverValue(value) {
    return value;
  }
  // ** @internal */
  shouldDisableInsert() {
    return this.config.generated !== void 0 && this.config.generated.type !== "byDefault";
  }
};
var ColumnBuilder = class {
  static {
    __name(this, "ColumnBuilder");
  }
  static {
    __name2(this, "ColumnBuilder");
  }
  static [entityKind] = "ColumnBuilder";
  config;
  constructor(name, dataType, columnType) {
    this.config = {
      name,
      keyAsName: name === "",
      notNull: false,
      default: void 0,
      hasDefault: false,
      primaryKey: false,
      isUnique: false,
      uniqueName: void 0,
      uniqueType: void 0,
      dataType,
      columnType,
      generated: void 0
    };
  }
  /**
   * Changes the data type of the column. Commonly used with `json` columns. Also, useful for branded types.
   *
   * @example
   * ```ts
   * const users = pgTable('users', {
   * 	id: integer('id').$type<UserId>().primaryKey(),
   * 	details: json('details').$type<UserDetails>().notNull(),
   * });
   * ```
   */
  $type() {
    return this;
  }
  /**
   * Adds a `not null` clause to the column definition.
   *
   * Affects the `select` model of the table - columns *without* `not null` will be nullable on select.
   */
  notNull() {
    this.config.notNull = true;
    return this;
  }
  /**
   * Adds a `default <value>` clause to the column definition.
   *
   * Affects the `insert` model of the table - columns *with* `default` are optional on insert.
   *
   * If you need to set a dynamic default value, use {@link $defaultFn} instead.
   */
  default(value) {
    this.config.default = value;
    this.config.hasDefault = true;
    return this;
  }
  /**
   * Adds a dynamic default value to the column.
   * The function will be called when the row is inserted, and the returned value will be used as the column value.
   *
   * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
   */
  $defaultFn(fn) {
    this.config.defaultFn = fn;
    this.config.hasDefault = true;
    return this;
  }
  /**
   * Alias for {@link $defaultFn}.
   */
  $default = this.$defaultFn;
  /**
   * Adds a dynamic update value to the column.
   * The function will be called when the row is updated, and the returned value will be used as the column value if none is provided.
   * If no `default` (or `$defaultFn`) value is provided, the function will be called when the row is inserted as well, and the returned value will be used as the column value.
   *
   * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
   */
  $onUpdateFn(fn) {
    this.config.onUpdateFn = fn;
    this.config.hasDefault = true;
    return this;
  }
  /**
   * Alias for {@link $onUpdateFn}.
   */
  $onUpdate = this.$onUpdateFn;
  /**
   * Adds a `primary key` clause to the column definition. This implicitly makes the column `not null`.
   *
   * In SQLite, `integer primary key` implicitly makes the column auto-incrementing.
   */
  primaryKey() {
    this.config.primaryKey = true;
    this.config.notNull = true;
    return this;
  }
  /** @internal Sets the name of the column to the key within the table definition if a name was not given. */
  setName(name) {
    if (this.config.name !== "") return;
    this.config.name = name;
  }
};
var TableName = /* @__PURE__ */ Symbol.for("drizzle:Name");
var ForeignKeyBuilder = class {
  static {
    __name(this, "ForeignKeyBuilder");
  }
  static {
    __name2(this, "ForeignKeyBuilder");
  }
  static [entityKind] = "PgForeignKeyBuilder";
  /** @internal */
  reference;
  /** @internal */
  _onUpdate = "no action";
  /** @internal */
  _onDelete = "no action";
  constructor(config, actions) {
    this.reference = () => {
      const { name, columns, foreignColumns } = config();
      return { name, columns, foreignTable: foreignColumns[0].table, foreignColumns };
    };
    if (actions) {
      this._onUpdate = actions.onUpdate;
      this._onDelete = actions.onDelete;
    }
  }
  onUpdate(action) {
    this._onUpdate = action === void 0 ? "no action" : action;
    return this;
  }
  onDelete(action) {
    this._onDelete = action === void 0 ? "no action" : action;
    return this;
  }
  /** @internal */
  build(table) {
    return new ForeignKey(table, this);
  }
};
var ForeignKey = class {
  static {
    __name(this, "ForeignKey");
  }
  static {
    __name2(this, "ForeignKey");
  }
  constructor(table, builder) {
    this.table = table;
    this.reference = builder.reference;
    this.onUpdate = builder._onUpdate;
    this.onDelete = builder._onDelete;
  }
  static [entityKind] = "PgForeignKey";
  reference;
  onUpdate;
  onDelete;
  getName() {
    const { name, columns, foreignColumns } = this.reference();
    const columnNames = columns.map((column) => column.name);
    const foreignColumnNames = foreignColumns.map((column) => column.name);
    const chunks = [
      this.table[TableName],
      ...columnNames,
      foreignColumns[0].table[TableName],
      ...foreignColumnNames
    ];
    return name ?? `${chunks.join("_")}_fk`;
  }
};
function iife(fn, ...args) {
  return fn(...args);
}
__name(iife, "iife");
__name2(iife, "iife");
function uniqueKeyName(table, columns) {
  return `${table[TableName]}_${columns.join("_")}_unique`;
}
__name(uniqueKeyName, "uniqueKeyName");
__name2(uniqueKeyName, "uniqueKeyName");
var UniqueConstraintBuilder = class {
  static {
    __name(this, "UniqueConstraintBuilder");
  }
  static {
    __name2(this, "UniqueConstraintBuilder");
  }
  constructor(columns, name) {
    this.name = name;
    this.columns = columns;
  }
  static [entityKind] = "PgUniqueConstraintBuilder";
  /** @internal */
  columns;
  /** @internal */
  nullsNotDistinctConfig = false;
  nullsNotDistinct() {
    this.nullsNotDistinctConfig = true;
    return this;
  }
  /** @internal */
  build(table) {
    return new UniqueConstraint(table, this.columns, this.nullsNotDistinctConfig, this.name);
  }
};
var UniqueOnConstraintBuilder = class {
  static {
    __name(this, "UniqueOnConstraintBuilder");
  }
  static {
    __name2(this, "UniqueOnConstraintBuilder");
  }
  static [entityKind] = "PgUniqueOnConstraintBuilder";
  /** @internal */
  name;
  constructor(name) {
    this.name = name;
  }
  on(...columns) {
    return new UniqueConstraintBuilder(columns, this.name);
  }
};
var UniqueConstraint = class {
  static {
    __name(this, "UniqueConstraint");
  }
  static {
    __name2(this, "UniqueConstraint");
  }
  constructor(table, columns, nullsNotDistinct, name) {
    this.table = table;
    this.columns = columns;
    this.name = name ?? uniqueKeyName(this.table, this.columns.map((column) => column.name));
    this.nullsNotDistinct = nullsNotDistinct;
  }
  static [entityKind] = "PgUniqueConstraint";
  columns;
  name;
  nullsNotDistinct = false;
  getName() {
    return this.name;
  }
};
function parsePgArrayValue(arrayString, startFrom, inQuotes) {
  for (let i = startFrom; i < arrayString.length; i++) {
    const char2 = arrayString[i];
    if (char2 === "\\") {
      i++;
      continue;
    }
    if (char2 === '"') {
      return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i + 1];
    }
    if (inQuotes) {
      continue;
    }
    if (char2 === "," || char2 === "}") {
      return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i];
    }
  }
  return [arrayString.slice(startFrom).replace(/\\/g, ""), arrayString.length];
}
__name(parsePgArrayValue, "parsePgArrayValue");
__name2(parsePgArrayValue, "parsePgArrayValue");
function parsePgNestedArray(arrayString, startFrom = 0) {
  const result = [];
  let i = startFrom;
  let lastCharIsComma = false;
  while (i < arrayString.length) {
    const char2 = arrayString[i];
    if (char2 === ",") {
      if (lastCharIsComma || i === startFrom) {
        result.push("");
      }
      lastCharIsComma = true;
      i++;
      continue;
    }
    lastCharIsComma = false;
    if (char2 === "\\") {
      i += 2;
      continue;
    }
    if (char2 === '"') {
      const [value2, startFrom2] = parsePgArrayValue(arrayString, i + 1, true);
      result.push(value2);
      i = startFrom2;
      continue;
    }
    if (char2 === "}") {
      return [result, i + 1];
    }
    if (char2 === "{") {
      const [value2, startFrom2] = parsePgNestedArray(arrayString, i + 1);
      result.push(value2);
      i = startFrom2;
      continue;
    }
    const [value, newStartFrom] = parsePgArrayValue(arrayString, i, false);
    result.push(value);
    i = newStartFrom;
  }
  return [result, i];
}
__name(parsePgNestedArray, "parsePgNestedArray");
__name2(parsePgNestedArray, "parsePgNestedArray");
function parsePgArray(arrayString) {
  const [result] = parsePgNestedArray(arrayString, 1);
  return result;
}
__name(parsePgArray, "parsePgArray");
__name2(parsePgArray, "parsePgArray");
function makePgArray(array) {
  return `{${array.map((item) => {
    if (Array.isArray(item)) {
      return makePgArray(item);
    }
    if (typeof item === "string") {
      return `"${item.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return `${item}`;
  }).join(",")}}`;
}
__name(makePgArray, "makePgArray");
__name2(makePgArray, "makePgArray");
var PgColumnBuilder = class extends ColumnBuilder {
  static {
    __name(this, "PgColumnBuilder");
  }
  static {
    __name2(this, "PgColumnBuilder");
  }
  foreignKeyConfigs = [];
  static [entityKind] = "PgColumnBuilder";
  array(size) {
    return new PgArrayBuilder(this.config.name, this, size);
  }
  references(ref, actions = {}) {
    this.foreignKeyConfigs.push({ ref, actions });
    return this;
  }
  unique(name, config) {
    this.config.isUnique = true;
    this.config.uniqueName = name;
    this.config.uniqueType = config?.nulls;
    return this;
  }
  generatedAlwaysAs(as2) {
    this.config.generated = {
      as: as2,
      type: "always",
      mode: "stored"
    };
    return this;
  }
  /** @internal */
  buildForeignKeys(column, table) {
    return this.foreignKeyConfigs.map(({ ref, actions }) => {
      return iife(
        (ref2, actions2) => {
          const builder = new ForeignKeyBuilder(() => {
            const foreignColumn = ref2();
            return { columns: [column], foreignColumns: [foreignColumn] };
          });
          if (actions2.onUpdate) {
            builder.onUpdate(actions2.onUpdate);
          }
          if (actions2.onDelete) {
            builder.onDelete(actions2.onDelete);
          }
          return builder.build(table);
        },
        ref,
        actions
      );
    });
  }
  /** @internal */
  buildExtraConfigColumn(table) {
    return new ExtraConfigColumn(table, this.config);
  }
};
var PgColumn = class extends Column {
  static {
    __name(this, "PgColumn");
  }
  static {
    __name2(this, "PgColumn");
  }
  constructor(table, config) {
    if (!config.uniqueName) {
      config.uniqueName = uniqueKeyName(table, [config.name]);
    }
    super(table, config);
    this.table = table;
  }
  static [entityKind] = "PgColumn";
};
var ExtraConfigColumn = class extends PgColumn {
  static {
    __name(this, "ExtraConfigColumn");
  }
  static {
    __name2(this, "ExtraConfigColumn");
  }
  static [entityKind] = "ExtraConfigColumn";
  getSQLType() {
    return this.getSQLType();
  }
  indexConfig = {
    order: this.config.order ?? "asc",
    nulls: this.config.nulls ?? "last",
    opClass: this.config.opClass
  };
  defaultConfig = {
    order: "asc",
    nulls: "last",
    opClass: void 0
  };
  asc() {
    this.indexConfig.order = "asc";
    return this;
  }
  desc() {
    this.indexConfig.order = "desc";
    return this;
  }
  nullsFirst() {
    this.indexConfig.nulls = "first";
    return this;
  }
  nullsLast() {
    this.indexConfig.nulls = "last";
    return this;
  }
  /**
   * ### PostgreSQL documentation quote
   *
   * > An operator class with optional parameters can be specified for each column of an index.
   * The operator class identifies the operators to be used by the index for that column.
   * For example, a B-tree index on four-byte integers would use the int4_ops class;
   * this operator class includes comparison functions for four-byte integers.
   * In practice the default operator class for the column's data type is usually sufficient.
   * The main point of having operator classes is that for some data types, there could be more than one meaningful ordering.
   * For example, we might want to sort a complex-number data type either by absolute value or by real part.
   * We could do this by defining two operator classes for the data type and then selecting the proper class when creating an index.
   * More information about operator classes check:
   *
   * ### Useful links
   * https://www.postgresql.org/docs/current/sql-createindex.html
   *
   * https://www.postgresql.org/docs/current/indexes-opclass.html
   *
   * https://www.postgresql.org/docs/current/xindex.html
   *
   * ### Additional types
   * If you have the `pg_vector` extension installed in your database, you can use the
   * `vector_l2_ops`, `vector_ip_ops`, `vector_cosine_ops`, `vector_l1_ops`, `bit_hamming_ops`, `bit_jaccard_ops`, `halfvec_l2_ops`, `sparsevec_l2_ops` options, which are predefined types.
   *
   * **You can always specify any string you want in the operator class, in case Drizzle doesn't have it natively in its types**
   *
   * @param opClass
   * @returns
   */
  op(opClass) {
    this.indexConfig.opClass = opClass;
    return this;
  }
};
var IndexedColumn = class {
  static {
    __name(this, "IndexedColumn");
  }
  static {
    __name2(this, "IndexedColumn");
  }
  static [entityKind] = "IndexedColumn";
  constructor(name, keyAsName, type, indexConfig) {
    this.name = name;
    this.keyAsName = keyAsName;
    this.type = type;
    this.indexConfig = indexConfig;
  }
  name;
  keyAsName;
  type;
  indexConfig;
};
var PgArrayBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgArrayBuilder");
  }
  static {
    __name2(this, "PgArrayBuilder");
  }
  static [entityKind] = "PgArrayBuilder";
  constructor(name, baseBuilder, size) {
    super(name, "array", "PgArray");
    this.config.baseBuilder = baseBuilder;
    this.config.size = size;
  }
  /** @internal */
  build(table) {
    const baseColumn = this.config.baseBuilder.build(table);
    return new PgArray(
      table,
      this.config,
      baseColumn
    );
  }
};
var PgArray = class _PgArray extends PgColumn {
  static {
    __name(this, "_PgArray");
  }
  static {
    __name2(this, "PgArray");
  }
  constructor(table, config, baseColumn, range) {
    super(table, config);
    this.baseColumn = baseColumn;
    this.range = range;
    this.size = config.size;
  }
  size;
  static [entityKind] = "PgArray";
  getSQLType() {
    return `${this.baseColumn.getSQLType()}[${typeof this.size === "number" ? this.size : ""}]`;
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      value = parsePgArray(value);
    }
    return value.map((v2) => this.baseColumn.mapFromDriverValue(v2));
  }
  mapToDriverValue(value, isNestedArray = false) {
    const a2 = value.map(
      (v2) => v2 === null ? null : is2(this.baseColumn, _PgArray) ? this.baseColumn.mapToDriverValue(v2, true) : this.baseColumn.mapToDriverValue(v2)
    );
    if (isNestedArray) return a2;
    return makePgArray(a2);
  }
};
var PgEnumObjectColumnBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgEnumObjectColumnBuilder");
  }
  static {
    __name2(this, "PgEnumObjectColumnBuilder");
  }
  static [entityKind] = "PgEnumObjectColumnBuilder";
  constructor(name, enumInstance) {
    super(name, "string", "PgEnumObjectColumn");
    this.config.enum = enumInstance;
  }
  /** @internal */
  build(table) {
    return new PgEnumObjectColumn(
      table,
      this.config
    );
  }
};
var PgEnumObjectColumn = class extends PgColumn {
  static {
    __name(this, "PgEnumObjectColumn");
  }
  static {
    __name2(this, "PgEnumObjectColumn");
  }
  static [entityKind] = "PgEnumObjectColumn";
  enum;
  enumValues = this.config.enum.enumValues;
  constructor(table, config) {
    super(table, config);
    this.enum = config.enum;
  }
  getSQLType() {
    return this.enum.enumName;
  }
};
var isPgEnumSym = /* @__PURE__ */ Symbol.for("drizzle:isPgEnum");
function isPgEnum(obj) {
  return !!obj && typeof obj === "function" && isPgEnumSym in obj && obj[isPgEnumSym] === true;
}
__name(isPgEnum, "isPgEnum");
__name2(isPgEnum, "isPgEnum");
var PgEnumColumnBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgEnumColumnBuilder");
  }
  static {
    __name2(this, "PgEnumColumnBuilder");
  }
  static [entityKind] = "PgEnumColumnBuilder";
  constructor(name, enumInstance) {
    super(name, "string", "PgEnumColumn");
    this.config.enum = enumInstance;
  }
  /** @internal */
  build(table) {
    return new PgEnumColumn(
      table,
      this.config
    );
  }
};
var PgEnumColumn = class extends PgColumn {
  static {
    __name(this, "PgEnumColumn");
  }
  static {
    __name2(this, "PgEnumColumn");
  }
  static [entityKind] = "PgEnumColumn";
  enum = this.config.enum;
  enumValues = this.config.enum.enumValues;
  constructor(table, config) {
    super(table, config);
    this.enum = config.enum;
  }
  getSQLType() {
    return this.enum.enumName;
  }
};
var Subquery = class {
  static {
    __name(this, "Subquery");
  }
  static {
    __name2(this, "Subquery");
  }
  static [entityKind] = "Subquery";
  constructor(sql2, fields, alias, isWith = false, usedTables = []) {
    this._ = {
      brand: "Subquery",
      sql: sql2,
      selectedFields: fields,
      alias,
      isWith,
      usedTables
    };
  }
  // getSQL(): SQL<unknown> {
  // 	return new SQL([this]);
  // }
};
var WithSubquery = class extends Subquery {
  static {
    __name(this, "WithSubquery");
  }
  static {
    __name2(this, "WithSubquery");
  }
  static [entityKind] = "WithSubquery";
};
var version = "0.45.1";
var otel;
var rawTracer;
var tracer = {
  startActiveSpan(name, fn) {
    if (!otel) {
      return fn();
    }
    if (!rawTracer) {
      rawTracer = otel.trace.getTracer("drizzle-orm", version);
    }
    return iife(
      (otel2, rawTracer2) => rawTracer2.startActiveSpan(
        name,
        (span) => {
          try {
            return fn(span);
          } catch (e) {
            span.setStatus({
              code: otel2.SpanStatusCode.ERROR,
              message: e instanceof Error ? e.message : "Unknown error"
              // eslint-disable-line no-instanceof/no-instanceof
            });
            throw e;
          } finally {
            span.end();
          }
        }
      ),
      otel,
      rawTracer
    );
  }
};
var ViewBaseConfig = /* @__PURE__ */ Symbol.for("drizzle:ViewBaseConfig");
var Schema = /* @__PURE__ */ Symbol.for("drizzle:Schema");
var Columns = /* @__PURE__ */ Symbol.for("drizzle:Columns");
var ExtraConfigColumns = /* @__PURE__ */ Symbol.for("drizzle:ExtraConfigColumns");
var OriginalName = /* @__PURE__ */ Symbol.for("drizzle:OriginalName");
var BaseName = /* @__PURE__ */ Symbol.for("drizzle:BaseName");
var IsAlias = /* @__PURE__ */ Symbol.for("drizzle:IsAlias");
var ExtraConfigBuilder = /* @__PURE__ */ Symbol.for("drizzle:ExtraConfigBuilder");
var IsDrizzleTable = /* @__PURE__ */ Symbol.for("drizzle:IsDrizzleTable");
var Table = class {
  static {
    __name(this, "Table");
  }
  static {
    __name2(this, "Table");
  }
  static [entityKind] = "Table";
  /** @internal */
  static Symbol = {
    Name: TableName,
    Schema,
    OriginalName,
    Columns,
    ExtraConfigColumns,
    BaseName,
    IsAlias,
    ExtraConfigBuilder
  };
  /**
   * @internal
   * Can be changed if the table is aliased.
   */
  [TableName];
  /**
   * @internal
   * Used to store the original name of the table, before any aliasing.
   */
  [OriginalName];
  /** @internal */
  [Schema];
  /** @internal */
  [Columns];
  /** @internal */
  [ExtraConfigColumns];
  /**
   *  @internal
   * Used to store the table name before the transformation via the `tableCreator` functions.
   */
  [BaseName];
  /** @internal */
  [IsAlias] = false;
  /** @internal */
  [IsDrizzleTable] = true;
  /** @internal */
  [ExtraConfigBuilder] = void 0;
  constructor(name, schema, baseName) {
    this[TableName] = this[OriginalName] = name;
    this[Schema] = schema;
    this[BaseName] = baseName;
  }
};
function getTableName(table) {
  return table[TableName];
}
__name(getTableName, "getTableName");
__name2(getTableName, "getTableName");
function getTableUniqueName(table) {
  return `${table[Schema] ?? "public"}.${table[TableName]}`;
}
__name(getTableUniqueName, "getTableUniqueName");
__name2(getTableUniqueName, "getTableUniqueName");
var FakePrimitiveParam = class {
  static {
    __name(this, "FakePrimitiveParam");
  }
  static {
    __name2(this, "FakePrimitiveParam");
  }
  static [entityKind] = "FakePrimitiveParam";
};
function isSQLWrapper(value) {
  return value !== null && value !== void 0 && typeof value.getSQL === "function";
}
__name(isSQLWrapper, "isSQLWrapper");
__name2(isSQLWrapper, "isSQLWrapper");
function mergeQueries(queries) {
  const result = { sql: "", params: [] };
  for (const query of queries) {
    result.sql += query.sql;
    result.params.push(...query.params);
    if (query.typings?.length) {
      if (!result.typings) {
        result.typings = [];
      }
      result.typings.push(...query.typings);
    }
  }
  return result;
}
__name(mergeQueries, "mergeQueries");
__name2(mergeQueries, "mergeQueries");
var StringChunk = class {
  static {
    __name(this, "StringChunk");
  }
  static {
    __name2(this, "StringChunk");
  }
  static [entityKind] = "StringChunk";
  value;
  constructor(value) {
    this.value = Array.isArray(value) ? value : [value];
  }
  getSQL() {
    return new SQL([this]);
  }
};
var SQL = class _SQL {
  static {
    __name(this, "_SQL");
  }
  static {
    __name2(this, "SQL");
  }
  constructor(queryChunks) {
    this.queryChunks = queryChunks;
    for (const chunk of queryChunks) {
      if (is2(chunk, Table)) {
        const schemaName = chunk[Table.Symbol.Schema];
        this.usedTables.push(
          schemaName === void 0 ? chunk[Table.Symbol.Name] : schemaName + "." + chunk[Table.Symbol.Name]
        );
      }
    }
  }
  static [entityKind] = "SQL";
  /** @internal */
  decoder = noopDecoder;
  shouldInlineParams = false;
  /** @internal */
  usedTables = [];
  append(query) {
    this.queryChunks.push(...query.queryChunks);
    return this;
  }
  toQuery(config) {
    return tracer.startActiveSpan("drizzle.buildSQL", (span) => {
      const query = this.buildQueryFromSourceParams(this.queryChunks, config);
      span?.setAttributes({
        "drizzle.query.text": query.sql,
        "drizzle.query.params": JSON.stringify(query.params)
      });
      return query;
    });
  }
  buildQueryFromSourceParams(chunks, _config) {
    const config = Object.assign({}, _config, {
      inlineParams: _config.inlineParams || this.shouldInlineParams,
      paramStartIndex: _config.paramStartIndex || { value: 0 }
    });
    const {
      casing,
      escapeName,
      escapeParam,
      prepareTyping,
      inlineParams,
      paramStartIndex
    } = config;
    return mergeQueries(chunks.map((chunk) => {
      if (is2(chunk, StringChunk)) {
        return { sql: chunk.value.join(""), params: [] };
      }
      if (is2(chunk, Name)) {
        return { sql: escapeName(chunk.value), params: [] };
      }
      if (chunk === void 0) {
        return { sql: "", params: [] };
      }
      if (Array.isArray(chunk)) {
        const result = [new StringChunk("(")];
        for (const [i, p2] of chunk.entries()) {
          result.push(p2);
          if (i < chunk.length - 1) {
            result.push(new StringChunk(", "));
          }
        }
        result.push(new StringChunk(")"));
        return this.buildQueryFromSourceParams(result, config);
      }
      if (is2(chunk, _SQL)) {
        return this.buildQueryFromSourceParams(chunk.queryChunks, {
          ...config,
          inlineParams: inlineParams || chunk.shouldInlineParams
        });
      }
      if (is2(chunk, Table)) {
        const schemaName = chunk[Table.Symbol.Schema];
        const tableName = chunk[Table.Symbol.Name];
        return {
          sql: schemaName === void 0 || chunk[IsAlias] ? escapeName(tableName) : escapeName(schemaName) + "." + escapeName(tableName),
          params: []
        };
      }
      if (is2(chunk, Column)) {
        const columnName = casing.getColumnCasing(chunk);
        if (_config.invokeSource === "indexes") {
          return { sql: escapeName(columnName), params: [] };
        }
        const schemaName = chunk.table[Table.Symbol.Schema];
        return {
          sql: chunk.table[IsAlias] || schemaName === void 0 ? escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName) : escapeName(schemaName) + "." + escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName),
          params: []
        };
      }
      if (is2(chunk, View)) {
        const schemaName = chunk[ViewBaseConfig].schema;
        const viewName = chunk[ViewBaseConfig].name;
        return {
          sql: schemaName === void 0 || chunk[ViewBaseConfig].isAlias ? escapeName(viewName) : escapeName(schemaName) + "." + escapeName(viewName),
          params: []
        };
      }
      if (is2(chunk, Param)) {
        if (is2(chunk.value, Placeholder)) {
          return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
        }
        const mappedValue = chunk.value === null ? null : chunk.encoder.mapToDriverValue(chunk.value);
        if (is2(mappedValue, _SQL)) {
          return this.buildQueryFromSourceParams([mappedValue], config);
        }
        if (inlineParams) {
          return { sql: this.mapInlineParam(mappedValue, config), params: [] };
        }
        let typings = ["none"];
        if (prepareTyping) {
          typings = [prepareTyping(chunk.encoder)];
        }
        return { sql: escapeParam(paramStartIndex.value++, mappedValue), params: [mappedValue], typings };
      }
      if (is2(chunk, Placeholder)) {
        return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
      }
      if (is2(chunk, _SQL.Aliased) && chunk.fieldAlias !== void 0) {
        return { sql: escapeName(chunk.fieldAlias), params: [] };
      }
      if (is2(chunk, Subquery)) {
        if (chunk._.isWith) {
          return { sql: escapeName(chunk._.alias), params: [] };
        }
        return this.buildQueryFromSourceParams([
          new StringChunk("("),
          chunk._.sql,
          new StringChunk(") "),
          new Name(chunk._.alias)
        ], config);
      }
      if (isPgEnum(chunk)) {
        if (chunk.schema) {
          return { sql: escapeName(chunk.schema) + "." + escapeName(chunk.enumName), params: [] };
        }
        return { sql: escapeName(chunk.enumName), params: [] };
      }
      if (isSQLWrapper(chunk)) {
        if (chunk.shouldOmitSQLParens?.()) {
          return this.buildQueryFromSourceParams([chunk.getSQL()], config);
        }
        return this.buildQueryFromSourceParams([
          new StringChunk("("),
          chunk.getSQL(),
          new StringChunk(")")
        ], config);
      }
      if (inlineParams) {
        return { sql: this.mapInlineParam(chunk, config), params: [] };
      }
      return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
    }));
  }
  mapInlineParam(chunk, { escapeString: escapeString2 }) {
    if (chunk === null) {
      return "null";
    }
    if (typeof chunk === "number" || typeof chunk === "boolean") {
      return chunk.toString();
    }
    if (typeof chunk === "string") {
      return escapeString2(chunk);
    }
    if (typeof chunk === "object") {
      const mappedValueAsString = chunk.toString();
      if (mappedValueAsString === "[object Object]") {
        return escapeString2(JSON.stringify(chunk));
      }
      return escapeString2(mappedValueAsString);
    }
    throw new Error("Unexpected param value: " + chunk);
  }
  getSQL() {
    return this;
  }
  as(alias) {
    if (alias === void 0) {
      return this;
    }
    return new _SQL.Aliased(this, alias);
  }
  mapWith(decoder) {
    this.decoder = typeof decoder === "function" ? { mapFromDriverValue: decoder } : decoder;
    return this;
  }
  inlineParams() {
    this.shouldInlineParams = true;
    return this;
  }
  /**
   * This method is used to conditionally include a part of the query.
   *
   * @param condition - Condition to check
   * @returns itself if the condition is `true`, otherwise `undefined`
   */
  if(condition) {
    return condition ? this : void 0;
  }
};
var Name = class {
  static {
    __name(this, "Name");
  }
  static {
    __name2(this, "Name");
  }
  constructor(value) {
    this.value = value;
  }
  static [entityKind] = "Name";
  brand;
  getSQL() {
    return new SQL([this]);
  }
};
function isDriverValueEncoder(value) {
  return typeof value === "object" && value !== null && "mapToDriverValue" in value && typeof value.mapToDriverValue === "function";
}
__name(isDriverValueEncoder, "isDriverValueEncoder");
__name2(isDriverValueEncoder, "isDriverValueEncoder");
var noopDecoder = {
  mapFromDriverValue: /* @__PURE__ */ __name2((value) => value, "mapFromDriverValue")
};
var noopEncoder = {
  mapToDriverValue: /* @__PURE__ */ __name2((value) => value, "mapToDriverValue")
};
var noopMapper = {
  ...noopDecoder,
  ...noopEncoder
};
var Param = class {
  static {
    __name(this, "Param");
  }
  static {
    __name2(this, "Param");
  }
  /**
   * @param value - Parameter value
   * @param encoder - Encoder to convert the value to a driver parameter
   */
  constructor(value, encoder = noopEncoder) {
    this.value = value;
    this.encoder = encoder;
  }
  static [entityKind] = "Param";
  brand;
  getSQL() {
    return new SQL([this]);
  }
};
function sql(strings, ...params) {
  const queryChunks = [];
  if (params.length > 0 || strings.length > 0 && strings[0] !== "") {
    queryChunks.push(new StringChunk(strings[0]));
  }
  for (const [paramIndex, param2] of params.entries()) {
    queryChunks.push(param2, new StringChunk(strings[paramIndex + 1]));
  }
  return new SQL(queryChunks);
}
__name(sql, "sql");
__name2(sql, "sql");
((sql2) => {
  function empty() {
    return new SQL([]);
  }
  __name(empty, "empty");
  __name2(empty, "empty");
  sql2.empty = empty;
  function fromList(list) {
    return new SQL(list);
  }
  __name(fromList, "fromList");
  __name2(fromList, "fromList");
  sql2.fromList = fromList;
  function raw2(str) {
    return new SQL([new StringChunk(str)]);
  }
  __name(raw2, "raw2");
  __name2(raw2, "raw");
  sql2.raw = raw2;
  function join(chunks, separator) {
    const result = [];
    for (const [i, chunk] of chunks.entries()) {
      if (i > 0 && separator !== void 0) {
        result.push(separator);
      }
      result.push(chunk);
    }
    return new SQL(result);
  }
  __name(join, "join");
  __name2(join, "join");
  sql2.join = join;
  function identifier(value) {
    return new Name(value);
  }
  __name(identifier, "identifier");
  __name2(identifier, "identifier");
  sql2.identifier = identifier;
  function placeholder2(name2) {
    return new Placeholder(name2);
  }
  __name(placeholder2, "placeholder2");
  __name2(placeholder2, "placeholder2");
  sql2.placeholder = placeholder2;
  function param2(value, encoder) {
    return new Param(value, encoder);
  }
  __name(param2, "param2");
  __name2(param2, "param2");
  sql2.param = param2;
})(sql || (sql = {}));
((SQL2) => {
  class Aliased {
    static {
      __name(this, "Aliased");
    }
    static {
      __name2(this, "Aliased");
    }
    constructor(sql2, fieldAlias) {
      this.sql = sql2;
      this.fieldAlias = fieldAlias;
    }
    static [entityKind] = "SQL.Aliased";
    /** @internal */
    isSelectionField = false;
    getSQL() {
      return this.sql;
    }
    /** @internal */
    clone() {
      return new Aliased(this.sql, this.fieldAlias);
    }
  }
  SQL2.Aliased = Aliased;
})(SQL || (SQL = {}));
var Placeholder = class {
  static {
    __name(this, "Placeholder");
  }
  static {
    __name2(this, "Placeholder");
  }
  constructor(name2) {
    this.name = name2;
  }
  static [entityKind] = "Placeholder";
  getSQL() {
    return new SQL([this]);
  }
};
function fillPlaceholders(params, values) {
  return params.map((p2) => {
    if (is2(p2, Placeholder)) {
      if (!(p2.name in values)) {
        throw new Error(`No value for placeholder "${p2.name}" was provided`);
      }
      return values[p2.name];
    }
    if (is2(p2, Param) && is2(p2.value, Placeholder)) {
      if (!(p2.value.name in values)) {
        throw new Error(`No value for placeholder "${p2.value.name}" was provided`);
      }
      return p2.encoder.mapToDriverValue(values[p2.value.name]);
    }
    return p2;
  });
}
__name(fillPlaceholders, "fillPlaceholders");
__name2(fillPlaceholders, "fillPlaceholders");
var IsDrizzleView = /* @__PURE__ */ Symbol.for("drizzle:IsDrizzleView");
var View = class {
  static {
    __name(this, "View");
  }
  static {
    __name2(this, "View");
  }
  static [entityKind] = "View";
  /** @internal */
  [ViewBaseConfig];
  /** @internal */
  [IsDrizzleView] = true;
  constructor({ name: name2, schema, selectedFields, query }) {
    this[ViewBaseConfig] = {
      name: name2,
      originalName: name2,
      schema,
      selectedFields,
      query,
      isExisting: !query,
      isAlias: false
    };
  }
  getSQL() {
    return new SQL([this]);
  }
};
Column.prototype.getSQL = function() {
  return new SQL([this]);
};
Table.prototype.getSQL = function() {
  return new SQL([this]);
};
Subquery.prototype.getSQL = function() {
  return new SQL([this]);
};
var ColumnAliasProxyHandler = class {
  static {
    __name(this, "ColumnAliasProxyHandler");
  }
  static {
    __name2(this, "ColumnAliasProxyHandler");
  }
  constructor(table) {
    this.table = table;
  }
  static [entityKind] = "ColumnAliasProxyHandler";
  get(columnObj, prop) {
    if (prop === "table") {
      return this.table;
    }
    return columnObj[prop];
  }
};
var TableAliasProxyHandler = class {
  static {
    __name(this, "TableAliasProxyHandler");
  }
  static {
    __name2(this, "TableAliasProxyHandler");
  }
  constructor(alias, replaceOriginalName) {
    this.alias = alias;
    this.replaceOriginalName = replaceOriginalName;
  }
  static [entityKind] = "TableAliasProxyHandler";
  get(target, prop) {
    if (prop === Table.Symbol.IsAlias) {
      return true;
    }
    if (prop === Table.Symbol.Name) {
      return this.alias;
    }
    if (this.replaceOriginalName && prop === Table.Symbol.OriginalName) {
      return this.alias;
    }
    if (prop === ViewBaseConfig) {
      return {
        ...target[ViewBaseConfig],
        name: this.alias,
        isAlias: true
      };
    }
    if (prop === Table.Symbol.Columns) {
      const columns = target[Table.Symbol.Columns];
      if (!columns) {
        return columns;
      }
      const proxiedColumns = {};
      Object.keys(columns).map((key) => {
        proxiedColumns[key] = new Proxy(
          columns[key],
          new ColumnAliasProxyHandler(new Proxy(target, this))
        );
      });
      return proxiedColumns;
    }
    const value = target[prop];
    if (is2(value, Column)) {
      return new Proxy(value, new ColumnAliasProxyHandler(new Proxy(target, this)));
    }
    return value;
  }
};
var RelationTableAliasProxyHandler = class {
  static {
    __name(this, "RelationTableAliasProxyHandler");
  }
  static {
    __name2(this, "RelationTableAliasProxyHandler");
  }
  constructor(alias) {
    this.alias = alias;
  }
  static [entityKind] = "RelationTableAliasProxyHandler";
  get(target, prop) {
    if (prop === "sourceTable") {
      return aliasedTable(target.sourceTable, this.alias);
    }
    return target[prop];
  }
};
function aliasedTable(table, tableAlias) {
  return new Proxy(table, new TableAliasProxyHandler(tableAlias, false));
}
__name(aliasedTable, "aliasedTable");
__name2(aliasedTable, "aliasedTable");
function aliasedTableColumn(column, tableAlias) {
  return new Proxy(
    column,
    new ColumnAliasProxyHandler(new Proxy(column.table, new TableAliasProxyHandler(tableAlias, false)))
  );
}
__name(aliasedTableColumn, "aliasedTableColumn");
__name2(aliasedTableColumn, "aliasedTableColumn");
function mapColumnsInAliasedSQLToAlias(query, alias) {
  return new SQL.Aliased(mapColumnsInSQLToAlias(query.sql, alias), query.fieldAlias);
}
__name(mapColumnsInAliasedSQLToAlias, "mapColumnsInAliasedSQLToAlias");
__name2(mapColumnsInAliasedSQLToAlias, "mapColumnsInAliasedSQLToAlias");
function mapColumnsInSQLToAlias(query, alias) {
  return sql.join(query.queryChunks.map((c) => {
    if (is2(c, Column)) {
      return aliasedTableColumn(c, alias);
    }
    if (is2(c, SQL)) {
      return mapColumnsInSQLToAlias(c, alias);
    }
    if (is2(c, SQL.Aliased)) {
      return mapColumnsInAliasedSQLToAlias(c, alias);
    }
    return c;
  }));
}
__name(mapColumnsInSQLToAlias, "mapColumnsInSQLToAlias");
__name2(mapColumnsInSQLToAlias, "mapColumnsInSQLToAlias");
var SelectionProxyHandler = class _SelectionProxyHandler {
  static {
    __name(this, "_SelectionProxyHandler");
  }
  static {
    __name2(this, "SelectionProxyHandler");
  }
  static [entityKind] = "SelectionProxyHandler";
  config;
  constructor(config) {
    this.config = { ...config };
  }
  get(subquery, prop) {
    if (prop === "_") {
      return {
        ...subquery["_"],
        selectedFields: new Proxy(
          subquery._.selectedFields,
          this
        )
      };
    }
    if (prop === ViewBaseConfig) {
      return {
        ...subquery[ViewBaseConfig],
        selectedFields: new Proxy(
          subquery[ViewBaseConfig].selectedFields,
          this
        )
      };
    }
    if (typeof prop === "symbol") {
      return subquery[prop];
    }
    const columns = is2(subquery, Subquery) ? subquery._.selectedFields : is2(subquery, View) ? subquery[ViewBaseConfig].selectedFields : subquery;
    const value = columns[prop];
    if (is2(value, SQL.Aliased)) {
      if (this.config.sqlAliasedBehavior === "sql" && !value.isSelectionField) {
        return value.sql;
      }
      const newValue = value.clone();
      newValue.isSelectionField = true;
      return newValue;
    }
    if (is2(value, SQL)) {
      if (this.config.sqlBehavior === "sql") {
        return value;
      }
      throw new Error(
        `You tried to reference "${prop}" field from a subquery, which is a raw SQL field, but it doesn't have an alias declared. Please add an alias to the field using ".as('alias')" method.`
      );
    }
    if (is2(value, Column)) {
      if (this.config.alias) {
        return new Proxy(
          value,
          new ColumnAliasProxyHandler(
            new Proxy(
              value.table,
              new TableAliasProxyHandler(this.config.alias, this.config.replaceOriginalName ?? false)
            )
          )
        );
      }
      return value;
    }
    if (typeof value !== "object" || value === null) {
      return value;
    }
    return new Proxy(value, new _SelectionProxyHandler(this.config));
  }
};
function mapResultRow(columns, row, joinsNotNullableMap) {
  const nullifyMap = {};
  const result = columns.reduce(
    (result2, { path, field }, columnIndex) => {
      let decoder;
      if (is2(field, Column)) {
        decoder = field;
      } else if (is2(field, SQL)) {
        decoder = field.decoder;
      } else if (is2(field, Subquery)) {
        decoder = field._.sql.decoder;
      } else {
        decoder = field.sql.decoder;
      }
      let node = result2;
      for (const [pathChunkIndex, pathChunk] of path.entries()) {
        if (pathChunkIndex < path.length - 1) {
          if (!(pathChunk in node)) {
            node[pathChunk] = {};
          }
          node = node[pathChunk];
        } else {
          const rawValue = row[columnIndex];
          const value = node[pathChunk] = rawValue === null ? null : decoder.mapFromDriverValue(rawValue);
          if (joinsNotNullableMap && is2(field, Column) && path.length === 2) {
            const objectName = path[0];
            if (!(objectName in nullifyMap)) {
              nullifyMap[objectName] = value === null ? getTableName(field.table) : false;
            } else if (typeof nullifyMap[objectName] === "string" && nullifyMap[objectName] !== getTableName(field.table)) {
              nullifyMap[objectName] = false;
            }
          }
        }
      }
      return result2;
    },
    {}
  );
  if (joinsNotNullableMap && Object.keys(nullifyMap).length > 0) {
    for (const [objectName, tableName] of Object.entries(nullifyMap)) {
      if (typeof tableName === "string" && !joinsNotNullableMap[tableName]) {
        result[objectName] = null;
      }
    }
  }
  return result;
}
__name(mapResultRow, "mapResultRow");
__name2(mapResultRow, "mapResultRow");
function orderSelectedFields(fields, pathPrefix) {
  return Object.entries(fields).reduce((result, [name, field]) => {
    if (typeof name !== "string") {
      return result;
    }
    const newPath = pathPrefix ? [...pathPrefix, name] : [name];
    if (is2(field, Column) || is2(field, SQL) || is2(field, SQL.Aliased) || is2(field, Subquery)) {
      result.push({ path: newPath, field });
    } else if (is2(field, Table)) {
      result.push(...orderSelectedFields(field[Table.Symbol.Columns], newPath));
    } else {
      result.push(...orderSelectedFields(field, newPath));
    }
    return result;
  }, []);
}
__name(orderSelectedFields, "orderSelectedFields");
__name2(orderSelectedFields, "orderSelectedFields");
function haveSameKeys(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (const [index, key] of leftKeys.entries()) {
    if (key !== rightKeys[index]) {
      return false;
    }
  }
  return true;
}
__name(haveSameKeys, "haveSameKeys");
__name2(haveSameKeys, "haveSameKeys");
function mapUpdateSet(table, values) {
  const entries = Object.entries(values).filter(([, value]) => value !== void 0).map(([key, value]) => {
    if (is2(value, SQL) || is2(value, Column)) {
      return [key, value];
    } else {
      return [key, new Param(value, table[Table.Symbol.Columns][key])];
    }
  });
  if (entries.length === 0) {
    throw new Error("No values to set");
  }
  return Object.fromEntries(entries);
}
__name(mapUpdateSet, "mapUpdateSet");
__name2(mapUpdateSet, "mapUpdateSet");
function applyMixins(baseClass, extendedClasses) {
  for (const extendedClass of extendedClasses) {
    for (const name of Object.getOwnPropertyNames(extendedClass.prototype)) {
      if (name === "constructor") continue;
      Object.defineProperty(
        baseClass.prototype,
        name,
        Object.getOwnPropertyDescriptor(extendedClass.prototype, name) || /* @__PURE__ */ Object.create(null)
      );
    }
  }
}
__name(applyMixins, "applyMixins");
__name2(applyMixins, "applyMixins");
function getTableColumns(table) {
  return table[Table.Symbol.Columns];
}
__name(getTableColumns, "getTableColumns");
__name2(getTableColumns, "getTableColumns");
function getTableLikeName(table) {
  return is2(table, Subquery) ? table._.alias : is2(table, View) ? table[ViewBaseConfig].name : is2(table, SQL) ? void 0 : table[Table.Symbol.IsAlias] ? table[Table.Symbol.Name] : table[Table.Symbol.BaseName];
}
__name(getTableLikeName, "getTableLikeName");
__name2(getTableLikeName, "getTableLikeName");
function getColumnNameAndConfig(a2, b2) {
  return {
    name: typeof a2 === "string" && a2.length > 0 ? a2 : "",
    config: typeof a2 === "object" ? a2 : b2
  };
}
__name(getColumnNameAndConfig, "getColumnNameAndConfig");
__name2(getColumnNameAndConfig, "getColumnNameAndConfig");
function isConfig(data) {
  if (typeof data !== "object" || data === null) return false;
  if (data.constructor.name !== "Object") return false;
  if ("logger" in data) {
    const type = typeof data["logger"];
    if (type !== "boolean" && (type !== "object" || typeof data["logger"]["logQuery"] !== "function") && type !== "undefined") return false;
    return true;
  }
  if ("schema" in data) {
    const type = typeof data["schema"];
    if (type !== "object" && type !== "undefined") return false;
    return true;
  }
  if ("casing" in data) {
    const type = typeof data["casing"];
    if (type !== "string" && type !== "undefined") return false;
    return true;
  }
  if ("mode" in data) {
    if (data["mode"] !== "default" || data["mode"] !== "planetscale" || data["mode"] !== void 0) return false;
    return true;
  }
  if ("connection" in data) {
    const type = typeof data["connection"];
    if (type !== "string" && type !== "object" && type !== "undefined") return false;
    return true;
  }
  if ("client" in data) {
    const type = typeof data["client"];
    if (type !== "object" && type !== "function" && type !== "undefined") return false;
    return true;
  }
  if (Object.keys(data).length === 0) return true;
  return false;
}
__name(isConfig, "isConfig");
__name2(isConfig, "isConfig");
var textDecoder = typeof TextDecoder === "undefined" ? null : new TextDecoder();
var PgIntColumnBaseBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgIntColumnBaseBuilder");
  }
  static {
    __name2(this, "PgIntColumnBaseBuilder");
  }
  static [entityKind] = "PgIntColumnBaseBuilder";
  generatedAlwaysAsIdentity(sequence) {
    if (sequence) {
      const { name, ...options } = sequence;
      this.config.generatedIdentity = {
        type: "always",
        sequenceName: name,
        sequenceOptions: options
      };
    } else {
      this.config.generatedIdentity = {
        type: "always"
      };
    }
    this.config.hasDefault = true;
    this.config.notNull = true;
    return this;
  }
  generatedByDefaultAsIdentity(sequence) {
    if (sequence) {
      const { name, ...options } = sequence;
      this.config.generatedIdentity = {
        type: "byDefault",
        sequenceName: name,
        sequenceOptions: options
      };
    } else {
      this.config.generatedIdentity = {
        type: "byDefault"
      };
    }
    this.config.hasDefault = true;
    this.config.notNull = true;
    return this;
  }
};
var PgBigInt53Builder = class extends PgIntColumnBaseBuilder {
  static {
    __name(this, "PgBigInt53Builder");
  }
  static {
    __name2(this, "PgBigInt53Builder");
  }
  static [entityKind] = "PgBigInt53Builder";
  constructor(name) {
    super(name, "number", "PgBigInt53");
  }
  /** @internal */
  build(table) {
    return new PgBigInt53(table, this.config);
  }
};
var PgBigInt53 = class extends PgColumn {
  static {
    __name(this, "PgBigInt53");
  }
  static {
    __name2(this, "PgBigInt53");
  }
  static [entityKind] = "PgBigInt53";
  getSQLType() {
    return "bigint";
  }
  mapFromDriverValue(value) {
    if (typeof value === "number") {
      return value;
    }
    return Number(value);
  }
};
var PgBigInt64Builder = class extends PgIntColumnBaseBuilder {
  static {
    __name(this, "PgBigInt64Builder");
  }
  static {
    __name2(this, "PgBigInt64Builder");
  }
  static [entityKind] = "PgBigInt64Builder";
  constructor(name) {
    super(name, "bigint", "PgBigInt64");
  }
  /** @internal */
  build(table) {
    return new PgBigInt64(
      table,
      this.config
    );
  }
};
var PgBigInt64 = class extends PgColumn {
  static {
    __name(this, "PgBigInt64");
  }
  static {
    __name2(this, "PgBigInt64");
  }
  static [entityKind] = "PgBigInt64";
  getSQLType() {
    return "bigint";
  }
  // eslint-disable-next-line unicorn/prefer-native-coercion-functions
  mapFromDriverValue(value) {
    return BigInt(value);
  }
};
function bigint(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (config.mode === "number") {
    return new PgBigInt53Builder(name);
  }
  return new PgBigInt64Builder(name);
}
__name(bigint, "bigint");
__name2(bigint, "bigint");
var PgBigSerial53Builder = class extends PgColumnBuilder {
  static {
    __name(this, "PgBigSerial53Builder");
  }
  static {
    __name2(this, "PgBigSerial53Builder");
  }
  static [entityKind] = "PgBigSerial53Builder";
  constructor(name) {
    super(name, "number", "PgBigSerial53");
    this.config.hasDefault = true;
    this.config.notNull = true;
  }
  /** @internal */
  build(table) {
    return new PgBigSerial53(
      table,
      this.config
    );
  }
};
var PgBigSerial53 = class extends PgColumn {
  static {
    __name(this, "PgBigSerial53");
  }
  static {
    __name2(this, "PgBigSerial53");
  }
  static [entityKind] = "PgBigSerial53";
  getSQLType() {
    return "bigserial";
  }
  mapFromDriverValue(value) {
    if (typeof value === "number") {
      return value;
    }
    return Number(value);
  }
};
var PgBigSerial64Builder = class extends PgColumnBuilder {
  static {
    __name(this, "PgBigSerial64Builder");
  }
  static {
    __name2(this, "PgBigSerial64Builder");
  }
  static [entityKind] = "PgBigSerial64Builder";
  constructor(name) {
    super(name, "bigint", "PgBigSerial64");
    this.config.hasDefault = true;
  }
  /** @internal */
  build(table) {
    return new PgBigSerial64(
      table,
      this.config
    );
  }
};
var PgBigSerial64 = class extends PgColumn {
  static {
    __name(this, "PgBigSerial64");
  }
  static {
    __name2(this, "PgBigSerial64");
  }
  static [entityKind] = "PgBigSerial64";
  getSQLType() {
    return "bigserial";
  }
  // eslint-disable-next-line unicorn/prefer-native-coercion-functions
  mapFromDriverValue(value) {
    return BigInt(value);
  }
};
function bigserial(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (config.mode === "number") {
    return new PgBigSerial53Builder(name);
  }
  return new PgBigSerial64Builder(name);
}
__name(bigserial, "bigserial");
__name2(bigserial, "bigserial");
var PgBooleanBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgBooleanBuilder");
  }
  static {
    __name2(this, "PgBooleanBuilder");
  }
  static [entityKind] = "PgBooleanBuilder";
  constructor(name) {
    super(name, "boolean", "PgBoolean");
  }
  /** @internal */
  build(table) {
    return new PgBoolean(table, this.config);
  }
};
var PgBoolean = class extends PgColumn {
  static {
    __name(this, "PgBoolean");
  }
  static {
    __name2(this, "PgBoolean");
  }
  static [entityKind] = "PgBoolean";
  getSQLType() {
    return "boolean";
  }
};
function boolean(name) {
  return new PgBooleanBuilder(name ?? "");
}
__name(boolean, "boolean");
__name2(boolean, "boolean");
var PgCharBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgCharBuilder");
  }
  static {
    __name2(this, "PgCharBuilder");
  }
  static [entityKind] = "PgCharBuilder";
  constructor(name, config) {
    super(name, "string", "PgChar");
    this.config.length = config.length;
    this.config.enumValues = config.enum;
  }
  /** @internal */
  build(table) {
    return new PgChar(
      table,
      this.config
    );
  }
};
var PgChar = class extends PgColumn {
  static {
    __name(this, "PgChar");
  }
  static {
    __name2(this, "PgChar");
  }
  static [entityKind] = "PgChar";
  length = this.config.length;
  enumValues = this.config.enumValues;
  getSQLType() {
    return this.length === void 0 ? `char` : `char(${this.length})`;
  }
};
function char(a2, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgCharBuilder(name, config);
}
__name(char, "char");
__name2(char, "char");
var PgCidrBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgCidrBuilder");
  }
  static {
    __name2(this, "PgCidrBuilder");
  }
  static [entityKind] = "PgCidrBuilder";
  constructor(name) {
    super(name, "string", "PgCidr");
  }
  /** @internal */
  build(table) {
    return new PgCidr(table, this.config);
  }
};
var PgCidr = class extends PgColumn {
  static {
    __name(this, "PgCidr");
  }
  static {
    __name2(this, "PgCidr");
  }
  static [entityKind] = "PgCidr";
  getSQLType() {
    return "cidr";
  }
};
function cidr(name) {
  return new PgCidrBuilder(name ?? "");
}
__name(cidr, "cidr");
__name2(cidr, "cidr");
var PgCustomColumnBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgCustomColumnBuilder");
  }
  static {
    __name2(this, "PgCustomColumnBuilder");
  }
  static [entityKind] = "PgCustomColumnBuilder";
  constructor(name, fieldConfig, customTypeParams) {
    super(name, "custom", "PgCustomColumn");
    this.config.fieldConfig = fieldConfig;
    this.config.customTypeParams = customTypeParams;
  }
  /** @internal */
  build(table) {
    return new PgCustomColumn(
      table,
      this.config
    );
  }
};
var PgCustomColumn = class extends PgColumn {
  static {
    __name(this, "PgCustomColumn");
  }
  static {
    __name2(this, "PgCustomColumn");
  }
  static [entityKind] = "PgCustomColumn";
  sqlName;
  mapTo;
  mapFrom;
  constructor(table, config) {
    super(table, config);
    this.sqlName = config.customTypeParams.dataType(config.fieldConfig);
    this.mapTo = config.customTypeParams.toDriver;
    this.mapFrom = config.customTypeParams.fromDriver;
  }
  getSQLType() {
    return this.sqlName;
  }
  mapFromDriverValue(value) {
    return typeof this.mapFrom === "function" ? this.mapFrom(value) : value;
  }
  mapToDriverValue(value) {
    return typeof this.mapTo === "function" ? this.mapTo(value) : value;
  }
};
function customType(customTypeParams) {
  return (a2, b2) => {
    const { name, config } = getColumnNameAndConfig(a2, b2);
    return new PgCustomColumnBuilder(name, config, customTypeParams);
  };
}
__name(customType, "customType");
__name2(customType, "customType");
var PgDateColumnBaseBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgDateColumnBaseBuilder");
  }
  static {
    __name2(this, "PgDateColumnBaseBuilder");
  }
  static [entityKind] = "PgDateColumnBaseBuilder";
  defaultNow() {
    return this.default(sql`now()`);
  }
};
var PgDateBuilder = class extends PgDateColumnBaseBuilder {
  static {
    __name(this, "PgDateBuilder");
  }
  static {
    __name2(this, "PgDateBuilder");
  }
  static [entityKind] = "PgDateBuilder";
  constructor(name) {
    super(name, "date", "PgDate");
  }
  /** @internal */
  build(table) {
    return new PgDate(table, this.config);
  }
};
var PgDate = class extends PgColumn {
  static {
    __name(this, "PgDate");
  }
  static {
    __name2(this, "PgDate");
  }
  static [entityKind] = "PgDate";
  getSQLType() {
    return "date";
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") return new Date(value);
    return value;
  }
  mapToDriverValue(value) {
    return value.toISOString();
  }
};
var PgDateStringBuilder = class extends PgDateColumnBaseBuilder {
  static {
    __name(this, "PgDateStringBuilder");
  }
  static {
    __name2(this, "PgDateStringBuilder");
  }
  static [entityKind] = "PgDateStringBuilder";
  constructor(name) {
    super(name, "string", "PgDateString");
  }
  /** @internal */
  build(table) {
    return new PgDateString(
      table,
      this.config
    );
  }
};
var PgDateString = class extends PgColumn {
  static {
    __name(this, "PgDateString");
  }
  static {
    __name2(this, "PgDateString");
  }
  static [entityKind] = "PgDateString";
  getSQLType() {
    return "date";
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") return value;
    return value.toISOString().slice(0, -14);
  }
};
function date(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (config?.mode === "date") {
    return new PgDateBuilder(name);
  }
  return new PgDateStringBuilder(name);
}
__name(date, "date");
__name2(date, "date");
var PgDoublePrecisionBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgDoublePrecisionBuilder");
  }
  static {
    __name2(this, "PgDoublePrecisionBuilder");
  }
  static [entityKind] = "PgDoublePrecisionBuilder";
  constructor(name) {
    super(name, "number", "PgDoublePrecision");
  }
  /** @internal */
  build(table) {
    return new PgDoublePrecision(
      table,
      this.config
    );
  }
};
var PgDoublePrecision = class extends PgColumn {
  static {
    __name(this, "PgDoublePrecision");
  }
  static {
    __name2(this, "PgDoublePrecision");
  }
  static [entityKind] = "PgDoublePrecision";
  getSQLType() {
    return "double precision";
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      return Number.parseFloat(value);
    }
    return value;
  }
};
function doublePrecision(name) {
  return new PgDoublePrecisionBuilder(name ?? "");
}
__name(doublePrecision, "doublePrecision");
__name2(doublePrecision, "doublePrecision");
var PgInetBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgInetBuilder");
  }
  static {
    __name2(this, "PgInetBuilder");
  }
  static [entityKind] = "PgInetBuilder";
  constructor(name) {
    super(name, "string", "PgInet");
  }
  /** @internal */
  build(table) {
    return new PgInet(table, this.config);
  }
};
var PgInet = class extends PgColumn {
  static {
    __name(this, "PgInet");
  }
  static {
    __name2(this, "PgInet");
  }
  static [entityKind] = "PgInet";
  getSQLType() {
    return "inet";
  }
};
function inet(name) {
  return new PgInetBuilder(name ?? "");
}
__name(inet, "inet");
__name2(inet, "inet");
var PgIntegerBuilder = class extends PgIntColumnBaseBuilder {
  static {
    __name(this, "PgIntegerBuilder");
  }
  static {
    __name2(this, "PgIntegerBuilder");
  }
  static [entityKind] = "PgIntegerBuilder";
  constructor(name) {
    super(name, "number", "PgInteger");
  }
  /** @internal */
  build(table) {
    return new PgInteger(table, this.config);
  }
};
var PgInteger = class extends PgColumn {
  static {
    __name(this, "PgInteger");
  }
  static {
    __name2(this, "PgInteger");
  }
  static [entityKind] = "PgInteger";
  getSQLType() {
    return "integer";
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      return Number.parseInt(value);
    }
    return value;
  }
};
function integer(name) {
  return new PgIntegerBuilder(name ?? "");
}
__name(integer, "integer");
__name2(integer, "integer");
var PgIntervalBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgIntervalBuilder");
  }
  static {
    __name2(this, "PgIntervalBuilder");
  }
  static [entityKind] = "PgIntervalBuilder";
  constructor(name, intervalConfig) {
    super(name, "string", "PgInterval");
    this.config.intervalConfig = intervalConfig;
  }
  /** @internal */
  build(table) {
    return new PgInterval(table, this.config);
  }
};
var PgInterval = class extends PgColumn {
  static {
    __name(this, "PgInterval");
  }
  static {
    __name2(this, "PgInterval");
  }
  static [entityKind] = "PgInterval";
  fields = this.config.intervalConfig.fields;
  precision = this.config.intervalConfig.precision;
  getSQLType() {
    const fields = this.fields ? ` ${this.fields}` : "";
    const precision = this.precision ? `(${this.precision})` : "";
    return `interval${fields}${precision}`;
  }
};
function interval(a2, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgIntervalBuilder(name, config);
}
__name(interval, "interval");
__name2(interval, "interval");
var PgJsonBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgJsonBuilder");
  }
  static {
    __name2(this, "PgJsonBuilder");
  }
  static [entityKind] = "PgJsonBuilder";
  constructor(name) {
    super(name, "json", "PgJson");
  }
  /** @internal */
  build(table) {
    return new PgJson(table, this.config);
  }
};
var PgJson = class extends PgColumn {
  static {
    __name(this, "PgJson");
  }
  static {
    __name2(this, "PgJson");
  }
  static [entityKind] = "PgJson";
  constructor(table, config) {
    super(table, config);
  }
  getSQLType() {
    return "json";
  }
  mapToDriverValue(value) {
    return JSON.stringify(value);
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
};
function json(name) {
  return new PgJsonBuilder(name ?? "");
}
__name(json, "json");
__name2(json, "json");
var PgJsonbBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgJsonbBuilder");
  }
  static {
    __name2(this, "PgJsonbBuilder");
  }
  static [entityKind] = "PgJsonbBuilder";
  constructor(name) {
    super(name, "json", "PgJsonb");
  }
  /** @internal */
  build(table) {
    return new PgJsonb(table, this.config);
  }
};
var PgJsonb = class extends PgColumn {
  static {
    __name(this, "PgJsonb");
  }
  static {
    __name2(this, "PgJsonb");
  }
  static [entityKind] = "PgJsonb";
  constructor(table, config) {
    super(table, config);
  }
  getSQLType() {
    return "jsonb";
  }
  mapToDriverValue(value) {
    return JSON.stringify(value);
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
};
function jsonb(name) {
  return new PgJsonbBuilder(name ?? "");
}
__name(jsonb, "jsonb");
__name2(jsonb, "jsonb");
var PgLineBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgLineBuilder");
  }
  static {
    __name2(this, "PgLineBuilder");
  }
  static [entityKind] = "PgLineBuilder";
  constructor(name) {
    super(name, "array", "PgLine");
  }
  /** @internal */
  build(table) {
    return new PgLineTuple(
      table,
      this.config
    );
  }
};
var PgLineTuple = class extends PgColumn {
  static {
    __name(this, "PgLineTuple");
  }
  static {
    __name2(this, "PgLineTuple");
  }
  static [entityKind] = "PgLine";
  getSQLType() {
    return "line";
  }
  mapFromDriverValue(value) {
    const [a2, b2, c] = value.slice(1, -1).split(",");
    return [Number.parseFloat(a2), Number.parseFloat(b2), Number.parseFloat(c)];
  }
  mapToDriverValue(value) {
    return `{${value[0]},${value[1]},${value[2]}}`;
  }
};
var PgLineABCBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgLineABCBuilder");
  }
  static {
    __name2(this, "PgLineABCBuilder");
  }
  static [entityKind] = "PgLineABCBuilder";
  constructor(name) {
    super(name, "json", "PgLineABC");
  }
  /** @internal */
  build(table) {
    return new PgLineABC(
      table,
      this.config
    );
  }
};
var PgLineABC = class extends PgColumn {
  static {
    __name(this, "PgLineABC");
  }
  static {
    __name2(this, "PgLineABC");
  }
  static [entityKind] = "PgLineABC";
  getSQLType() {
    return "line";
  }
  mapFromDriverValue(value) {
    const [a2, b2, c] = value.slice(1, -1).split(",");
    return { a: Number.parseFloat(a2), b: Number.parseFloat(b2), c: Number.parseFloat(c) };
  }
  mapToDriverValue(value) {
    return `{${value.a},${value.b},${value.c}}`;
  }
};
function line(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (!config?.mode || config.mode === "tuple") {
    return new PgLineBuilder(name);
  }
  return new PgLineABCBuilder(name);
}
__name(line, "line");
__name2(line, "line");
var PgMacaddrBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgMacaddrBuilder");
  }
  static {
    __name2(this, "PgMacaddrBuilder");
  }
  static [entityKind] = "PgMacaddrBuilder";
  constructor(name) {
    super(name, "string", "PgMacaddr");
  }
  /** @internal */
  build(table) {
    return new PgMacaddr(table, this.config);
  }
};
var PgMacaddr = class extends PgColumn {
  static {
    __name(this, "PgMacaddr");
  }
  static {
    __name2(this, "PgMacaddr");
  }
  static [entityKind] = "PgMacaddr";
  getSQLType() {
    return "macaddr";
  }
};
function macaddr(name) {
  return new PgMacaddrBuilder(name ?? "");
}
__name(macaddr, "macaddr");
__name2(macaddr, "macaddr");
var PgMacaddr8Builder = class extends PgColumnBuilder {
  static {
    __name(this, "PgMacaddr8Builder");
  }
  static {
    __name2(this, "PgMacaddr8Builder");
  }
  static [entityKind] = "PgMacaddr8Builder";
  constructor(name) {
    super(name, "string", "PgMacaddr8");
  }
  /** @internal */
  build(table) {
    return new PgMacaddr8(table, this.config);
  }
};
var PgMacaddr8 = class extends PgColumn {
  static {
    __name(this, "PgMacaddr8");
  }
  static {
    __name2(this, "PgMacaddr8");
  }
  static [entityKind] = "PgMacaddr8";
  getSQLType() {
    return "macaddr8";
  }
};
function macaddr8(name) {
  return new PgMacaddr8Builder(name ?? "");
}
__name(macaddr8, "macaddr8");
__name2(macaddr8, "macaddr8");
var PgNumericBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgNumericBuilder");
  }
  static {
    __name2(this, "PgNumericBuilder");
  }
  static [entityKind] = "PgNumericBuilder";
  constructor(name, precision, scale) {
    super(name, "string", "PgNumeric");
    this.config.precision = precision;
    this.config.scale = scale;
  }
  /** @internal */
  build(table) {
    return new PgNumeric(table, this.config);
  }
};
var PgNumeric = class extends PgColumn {
  static {
    __name(this, "PgNumeric");
  }
  static {
    __name2(this, "PgNumeric");
  }
  static [entityKind] = "PgNumeric";
  precision;
  scale;
  constructor(table, config) {
    super(table, config);
    this.precision = config.precision;
    this.scale = config.scale;
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") return value;
    return String(value);
  }
  getSQLType() {
    if (this.precision !== void 0 && this.scale !== void 0) {
      return `numeric(${this.precision}, ${this.scale})`;
    } else if (this.precision === void 0) {
      return "numeric";
    } else {
      return `numeric(${this.precision})`;
    }
  }
};
var PgNumericNumberBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgNumericNumberBuilder");
  }
  static {
    __name2(this, "PgNumericNumberBuilder");
  }
  static [entityKind] = "PgNumericNumberBuilder";
  constructor(name, precision, scale) {
    super(name, "number", "PgNumericNumber");
    this.config.precision = precision;
    this.config.scale = scale;
  }
  /** @internal */
  build(table) {
    return new PgNumericNumber(
      table,
      this.config
    );
  }
};
var PgNumericNumber = class extends PgColumn {
  static {
    __name(this, "PgNumericNumber");
  }
  static {
    __name2(this, "PgNumericNumber");
  }
  static [entityKind] = "PgNumericNumber";
  precision;
  scale;
  constructor(table, config) {
    super(table, config);
    this.precision = config.precision;
    this.scale = config.scale;
  }
  mapFromDriverValue(value) {
    if (typeof value === "number") return value;
    return Number(value);
  }
  mapToDriverValue = String;
  getSQLType() {
    if (this.precision !== void 0 && this.scale !== void 0) {
      return `numeric(${this.precision}, ${this.scale})`;
    } else if (this.precision === void 0) {
      return "numeric";
    } else {
      return `numeric(${this.precision})`;
    }
  }
};
var PgNumericBigIntBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgNumericBigIntBuilder");
  }
  static {
    __name2(this, "PgNumericBigIntBuilder");
  }
  static [entityKind] = "PgNumericBigIntBuilder";
  constructor(name, precision, scale) {
    super(name, "bigint", "PgNumericBigInt");
    this.config.precision = precision;
    this.config.scale = scale;
  }
  /** @internal */
  build(table) {
    return new PgNumericBigInt(
      table,
      this.config
    );
  }
};
var PgNumericBigInt = class extends PgColumn {
  static {
    __name(this, "PgNumericBigInt");
  }
  static {
    __name2(this, "PgNumericBigInt");
  }
  static [entityKind] = "PgNumericBigInt";
  precision;
  scale;
  constructor(table, config) {
    super(table, config);
    this.precision = config.precision;
    this.scale = config.scale;
  }
  mapFromDriverValue = BigInt;
  mapToDriverValue = String;
  getSQLType() {
    if (this.precision !== void 0 && this.scale !== void 0) {
      return `numeric(${this.precision}, ${this.scale})`;
    } else if (this.precision === void 0) {
      return "numeric";
    } else {
      return `numeric(${this.precision})`;
    }
  }
};
function numeric(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  const mode = config?.mode;
  return mode === "number" ? new PgNumericNumberBuilder(name, config?.precision, config?.scale) : mode === "bigint" ? new PgNumericBigIntBuilder(name, config?.precision, config?.scale) : new PgNumericBuilder(name, config?.precision, config?.scale);
}
__name(numeric, "numeric");
__name2(numeric, "numeric");
var PgPointTupleBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgPointTupleBuilder");
  }
  static {
    __name2(this, "PgPointTupleBuilder");
  }
  static [entityKind] = "PgPointTupleBuilder";
  constructor(name) {
    super(name, "array", "PgPointTuple");
  }
  /** @internal */
  build(table) {
    return new PgPointTuple(
      table,
      this.config
    );
  }
};
var PgPointTuple = class extends PgColumn {
  static {
    __name(this, "PgPointTuple");
  }
  static {
    __name2(this, "PgPointTuple");
  }
  static [entityKind] = "PgPointTuple";
  getSQLType() {
    return "point";
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      const [x2, y] = value.slice(1, -1).split(",");
      return [Number.parseFloat(x2), Number.parseFloat(y)];
    }
    return [value.x, value.y];
  }
  mapToDriverValue(value) {
    return `(${value[0]},${value[1]})`;
  }
};
var PgPointObjectBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgPointObjectBuilder");
  }
  static {
    __name2(this, "PgPointObjectBuilder");
  }
  static [entityKind] = "PgPointObjectBuilder";
  constructor(name) {
    super(name, "json", "PgPointObject");
  }
  /** @internal */
  build(table) {
    return new PgPointObject(
      table,
      this.config
    );
  }
};
var PgPointObject = class extends PgColumn {
  static {
    __name(this, "PgPointObject");
  }
  static {
    __name2(this, "PgPointObject");
  }
  static [entityKind] = "PgPointObject";
  getSQLType() {
    return "point";
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      const [x2, y] = value.slice(1, -1).split(",");
      return { x: Number.parseFloat(x2), y: Number.parseFloat(y) };
    }
    return value;
  }
  mapToDriverValue(value) {
    return `(${value.x},${value.y})`;
  }
};
function point(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (!config?.mode || config.mode === "tuple") {
    return new PgPointTupleBuilder(name);
  }
  return new PgPointObjectBuilder(name);
}
__name(point, "point");
__name2(point, "point");
function hexToBytes(hex) {
  const bytes = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(Number.parseInt(hex.slice(c, c + 2), 16));
  }
  return new Uint8Array(bytes);
}
__name(hexToBytes, "hexToBytes");
__name2(hexToBytes, "hexToBytes");
function bytesToFloat64(bytes, offset) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  for (let i = 0; i < 8; i++) {
    view.setUint8(i, bytes[offset + i]);
  }
  return view.getFloat64(0, true);
}
__name(bytesToFloat64, "bytesToFloat64");
__name2(bytesToFloat64, "bytesToFloat64");
function parseEWKB(hex) {
  const bytes = hexToBytes(hex);
  let offset = 0;
  const byteOrder = bytes[offset];
  offset += 1;
  const view = new DataView(bytes.buffer);
  const geomType = view.getUint32(offset, byteOrder === 1);
  offset += 4;
  let _srid;
  if (geomType & 536870912) {
    _srid = view.getUint32(offset, byteOrder === 1);
    offset += 4;
  }
  if ((geomType & 65535) === 1) {
    const x2 = bytesToFloat64(bytes, offset);
    offset += 8;
    const y = bytesToFloat64(bytes, offset);
    offset += 8;
    return [x2, y];
  }
  throw new Error("Unsupported geometry type");
}
__name(parseEWKB, "parseEWKB");
__name2(parseEWKB, "parseEWKB");
var PgGeometryBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgGeometryBuilder");
  }
  static {
    __name2(this, "PgGeometryBuilder");
  }
  static [entityKind] = "PgGeometryBuilder";
  constructor(name) {
    super(name, "array", "PgGeometry");
  }
  /** @internal */
  build(table) {
    return new PgGeometry(
      table,
      this.config
    );
  }
};
var PgGeometry = class extends PgColumn {
  static {
    __name(this, "PgGeometry");
  }
  static {
    __name2(this, "PgGeometry");
  }
  static [entityKind] = "PgGeometry";
  getSQLType() {
    return "geometry(point)";
  }
  mapFromDriverValue(value) {
    return parseEWKB(value);
  }
  mapToDriverValue(value) {
    return `point(${value[0]} ${value[1]})`;
  }
};
var PgGeometryObjectBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgGeometryObjectBuilder");
  }
  static {
    __name2(this, "PgGeometryObjectBuilder");
  }
  static [entityKind] = "PgGeometryObjectBuilder";
  constructor(name) {
    super(name, "json", "PgGeometryObject");
  }
  /** @internal */
  build(table) {
    return new PgGeometryObject(
      table,
      this.config
    );
  }
};
var PgGeometryObject = class extends PgColumn {
  static {
    __name(this, "PgGeometryObject");
  }
  static {
    __name2(this, "PgGeometryObject");
  }
  static [entityKind] = "PgGeometryObject";
  getSQLType() {
    return "geometry(point)";
  }
  mapFromDriverValue(value) {
    const parsed = parseEWKB(value);
    return { x: parsed[0], y: parsed[1] };
  }
  mapToDriverValue(value) {
    return `point(${value.x} ${value.y})`;
  }
};
function geometry(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (!config?.mode || config.mode === "tuple") {
    return new PgGeometryBuilder(name);
  }
  return new PgGeometryObjectBuilder(name);
}
__name(geometry, "geometry");
__name2(geometry, "geometry");
var PgRealBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgRealBuilder");
  }
  static {
    __name2(this, "PgRealBuilder");
  }
  static [entityKind] = "PgRealBuilder";
  constructor(name, length) {
    super(name, "number", "PgReal");
    this.config.length = length;
  }
  /** @internal */
  build(table) {
    return new PgReal(table, this.config);
  }
};
var PgReal = class extends PgColumn {
  static {
    __name(this, "PgReal");
  }
  static {
    __name2(this, "PgReal");
  }
  static [entityKind] = "PgReal";
  constructor(table, config) {
    super(table, config);
  }
  getSQLType() {
    return "real";
  }
  mapFromDriverValue = /* @__PURE__ */ __name2((value) => {
    if (typeof value === "string") {
      return Number.parseFloat(value);
    }
    return value;
  }, "mapFromDriverValue");
};
function real(name) {
  return new PgRealBuilder(name ?? "");
}
__name(real, "real");
__name2(real, "real");
var PgSerialBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgSerialBuilder");
  }
  static {
    __name2(this, "PgSerialBuilder");
  }
  static [entityKind] = "PgSerialBuilder";
  constructor(name) {
    super(name, "number", "PgSerial");
    this.config.hasDefault = true;
    this.config.notNull = true;
  }
  /** @internal */
  build(table) {
    return new PgSerial(table, this.config);
  }
};
var PgSerial = class extends PgColumn {
  static {
    __name(this, "PgSerial");
  }
  static {
    __name2(this, "PgSerial");
  }
  static [entityKind] = "PgSerial";
  getSQLType() {
    return "serial";
  }
};
function serial(name) {
  return new PgSerialBuilder(name ?? "");
}
__name(serial, "serial");
__name2(serial, "serial");
var PgSmallIntBuilder = class extends PgIntColumnBaseBuilder {
  static {
    __name(this, "PgSmallIntBuilder");
  }
  static {
    __name2(this, "PgSmallIntBuilder");
  }
  static [entityKind] = "PgSmallIntBuilder";
  constructor(name) {
    super(name, "number", "PgSmallInt");
  }
  /** @internal */
  build(table) {
    return new PgSmallInt(table, this.config);
  }
};
var PgSmallInt = class extends PgColumn {
  static {
    __name(this, "PgSmallInt");
  }
  static {
    __name2(this, "PgSmallInt");
  }
  static [entityKind] = "PgSmallInt";
  getSQLType() {
    return "smallint";
  }
  mapFromDriverValue = /* @__PURE__ */ __name2((value) => {
    if (typeof value === "string") {
      return Number(value);
    }
    return value;
  }, "mapFromDriverValue");
};
function smallint(name) {
  return new PgSmallIntBuilder(name ?? "");
}
__name(smallint, "smallint");
__name2(smallint, "smallint");
var PgSmallSerialBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgSmallSerialBuilder");
  }
  static {
    __name2(this, "PgSmallSerialBuilder");
  }
  static [entityKind] = "PgSmallSerialBuilder";
  constructor(name) {
    super(name, "number", "PgSmallSerial");
    this.config.hasDefault = true;
    this.config.notNull = true;
  }
  /** @internal */
  build(table) {
    return new PgSmallSerial(
      table,
      this.config
    );
  }
};
var PgSmallSerial = class extends PgColumn {
  static {
    __name(this, "PgSmallSerial");
  }
  static {
    __name2(this, "PgSmallSerial");
  }
  static [entityKind] = "PgSmallSerial";
  getSQLType() {
    return "smallserial";
  }
};
function smallserial(name) {
  return new PgSmallSerialBuilder(name ?? "");
}
__name(smallserial, "smallserial");
__name2(smallserial, "smallserial");
var PgTextBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgTextBuilder");
  }
  static {
    __name2(this, "PgTextBuilder");
  }
  static [entityKind] = "PgTextBuilder";
  constructor(name, config) {
    super(name, "string", "PgText");
    this.config.enumValues = config.enum;
  }
  /** @internal */
  build(table) {
    return new PgText(table, this.config);
  }
};
var PgText = class extends PgColumn {
  static {
    __name(this, "PgText");
  }
  static {
    __name2(this, "PgText");
  }
  static [entityKind] = "PgText";
  enumValues = this.config.enumValues;
  getSQLType() {
    return "text";
  }
};
function text(a2, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgTextBuilder(name, config);
}
__name(text, "text");
__name2(text, "text");
var PgTimeBuilder = class extends PgDateColumnBaseBuilder {
  static {
    __name(this, "PgTimeBuilder");
  }
  static {
    __name2(this, "PgTimeBuilder");
  }
  constructor(name, withTimezone, precision) {
    super(name, "string", "PgTime");
    this.withTimezone = withTimezone;
    this.precision = precision;
    this.config.withTimezone = withTimezone;
    this.config.precision = precision;
  }
  static [entityKind] = "PgTimeBuilder";
  /** @internal */
  build(table) {
    return new PgTime(table, this.config);
  }
};
var PgTime = class extends PgColumn {
  static {
    __name(this, "PgTime");
  }
  static {
    __name2(this, "PgTime");
  }
  static [entityKind] = "PgTime";
  withTimezone;
  precision;
  constructor(table, config) {
    super(table, config);
    this.withTimezone = config.withTimezone;
    this.precision = config.precision;
  }
  getSQLType() {
    const precision = this.precision === void 0 ? "" : `(${this.precision})`;
    return `time${precision}${this.withTimezone ? " with time zone" : ""}`;
  }
};
function time(a2, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgTimeBuilder(name, config.withTimezone ?? false, config.precision);
}
__name(time, "time");
__name2(time, "time");
var PgTimestampBuilder = class extends PgDateColumnBaseBuilder {
  static {
    __name(this, "PgTimestampBuilder");
  }
  static {
    __name2(this, "PgTimestampBuilder");
  }
  static [entityKind] = "PgTimestampBuilder";
  constructor(name, withTimezone, precision) {
    super(name, "date", "PgTimestamp");
    this.config.withTimezone = withTimezone;
    this.config.precision = precision;
  }
  /** @internal */
  build(table) {
    return new PgTimestamp(table, this.config);
  }
};
var PgTimestamp = class extends PgColumn {
  static {
    __name(this, "PgTimestamp");
  }
  static {
    __name2(this, "PgTimestamp");
  }
  static [entityKind] = "PgTimestamp";
  withTimezone;
  precision;
  constructor(table, config) {
    super(table, config);
    this.withTimezone = config.withTimezone;
    this.precision = config.precision;
  }
  getSQLType() {
    const precision = this.precision === void 0 ? "" : ` (${this.precision})`;
    return `timestamp${precision}${this.withTimezone ? " with time zone" : ""}`;
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") return new Date(this.withTimezone ? value : value + "+0000");
    return value;
  }
  mapToDriverValue = /* @__PURE__ */ __name2((value) => {
    return value.toISOString();
  }, "mapToDriverValue");
};
var PgTimestampStringBuilder = class extends PgDateColumnBaseBuilder {
  static {
    __name(this, "PgTimestampStringBuilder");
  }
  static {
    __name2(this, "PgTimestampStringBuilder");
  }
  static [entityKind] = "PgTimestampStringBuilder";
  constructor(name, withTimezone, precision) {
    super(name, "string", "PgTimestampString");
    this.config.withTimezone = withTimezone;
    this.config.precision = precision;
  }
  /** @internal */
  build(table) {
    return new PgTimestampString(
      table,
      this.config
    );
  }
};
var PgTimestampString = class extends PgColumn {
  static {
    __name(this, "PgTimestampString");
  }
  static {
    __name2(this, "PgTimestampString");
  }
  static [entityKind] = "PgTimestampString";
  withTimezone;
  precision;
  constructor(table, config) {
    super(table, config);
    this.withTimezone = config.withTimezone;
    this.precision = config.precision;
  }
  getSQLType() {
    const precision = this.precision === void 0 ? "" : `(${this.precision})`;
    return `timestamp${precision}${this.withTimezone ? " with time zone" : ""}`;
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") return value;
    const shortened = value.toISOString().slice(0, -1).replace("T", " ");
    if (this.withTimezone) {
      const offset = value.getTimezoneOffset();
      const sign = offset <= 0 ? "+" : "-";
      return `${shortened}${sign}${Math.floor(Math.abs(offset) / 60).toString().padStart(2, "0")}`;
    }
    return shortened;
  }
};
function timestamp(a2, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (config?.mode === "string") {
    return new PgTimestampStringBuilder(name, config.withTimezone ?? false, config.precision);
  }
  return new PgTimestampBuilder(name, config?.withTimezone ?? false, config?.precision);
}
__name(timestamp, "timestamp");
__name2(timestamp, "timestamp");
var PgUUIDBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgUUIDBuilder");
  }
  static {
    __name2(this, "PgUUIDBuilder");
  }
  static [entityKind] = "PgUUIDBuilder";
  constructor(name) {
    super(name, "string", "PgUUID");
  }
  /**
   * Adds `default gen_random_uuid()` to the column definition.
   */
  defaultRandom() {
    return this.default(sql`gen_random_uuid()`);
  }
  /** @internal */
  build(table) {
    return new PgUUID(table, this.config);
  }
};
var PgUUID = class extends PgColumn {
  static {
    __name(this, "PgUUID");
  }
  static {
    __name2(this, "PgUUID");
  }
  static [entityKind] = "PgUUID";
  getSQLType() {
    return "uuid";
  }
};
function uuid(name) {
  return new PgUUIDBuilder(name ?? "");
}
__name(uuid, "uuid");
__name2(uuid, "uuid");
var PgVarcharBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgVarcharBuilder");
  }
  static {
    __name2(this, "PgVarcharBuilder");
  }
  static [entityKind] = "PgVarcharBuilder";
  constructor(name, config) {
    super(name, "string", "PgVarchar");
    this.config.length = config.length;
    this.config.enumValues = config.enum;
  }
  /** @internal */
  build(table) {
    return new PgVarchar(
      table,
      this.config
    );
  }
};
var PgVarchar = class extends PgColumn {
  static {
    __name(this, "PgVarchar");
  }
  static {
    __name2(this, "PgVarchar");
  }
  static [entityKind] = "PgVarchar";
  length = this.config.length;
  enumValues = this.config.enumValues;
  getSQLType() {
    return this.length === void 0 ? `varchar` : `varchar(${this.length})`;
  }
};
function varchar(a2, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgVarcharBuilder(name, config);
}
__name(varchar, "varchar");
__name2(varchar, "varchar");
var PgBinaryVectorBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgBinaryVectorBuilder");
  }
  static {
    __name2(this, "PgBinaryVectorBuilder");
  }
  static [entityKind] = "PgBinaryVectorBuilder";
  constructor(name, config) {
    super(name, "string", "PgBinaryVector");
    this.config.dimensions = config.dimensions;
  }
  /** @internal */
  build(table) {
    return new PgBinaryVector(
      table,
      this.config
    );
  }
};
var PgBinaryVector = class extends PgColumn {
  static {
    __name(this, "PgBinaryVector");
  }
  static {
    __name2(this, "PgBinaryVector");
  }
  static [entityKind] = "PgBinaryVector";
  dimensions = this.config.dimensions;
  getSQLType() {
    return `bit(${this.dimensions})`;
  }
};
function bit(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgBinaryVectorBuilder(name, config);
}
__name(bit, "bit");
__name2(bit, "bit");
var PgHalfVectorBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgHalfVectorBuilder");
  }
  static {
    __name2(this, "PgHalfVectorBuilder");
  }
  static [entityKind] = "PgHalfVectorBuilder";
  constructor(name, config) {
    super(name, "array", "PgHalfVector");
    this.config.dimensions = config.dimensions;
  }
  /** @internal */
  build(table) {
    return new PgHalfVector(
      table,
      this.config
    );
  }
};
var PgHalfVector = class extends PgColumn {
  static {
    __name(this, "PgHalfVector");
  }
  static {
    __name2(this, "PgHalfVector");
  }
  static [entityKind] = "PgHalfVector";
  dimensions = this.config.dimensions;
  getSQLType() {
    return `halfvec(${this.dimensions})`;
  }
  mapToDriverValue(value) {
    return JSON.stringify(value);
  }
  mapFromDriverValue(value) {
    return value.slice(1, -1).split(",").map((v2) => Number.parseFloat(v2));
  }
};
function halfvec(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgHalfVectorBuilder(name, config);
}
__name(halfvec, "halfvec");
__name2(halfvec, "halfvec");
var PgSparseVectorBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgSparseVectorBuilder");
  }
  static {
    __name2(this, "PgSparseVectorBuilder");
  }
  static [entityKind] = "PgSparseVectorBuilder";
  constructor(name, config) {
    super(name, "string", "PgSparseVector");
    this.config.dimensions = config.dimensions;
  }
  /** @internal */
  build(table) {
    return new PgSparseVector(
      table,
      this.config
    );
  }
};
var PgSparseVector = class extends PgColumn {
  static {
    __name(this, "PgSparseVector");
  }
  static {
    __name2(this, "PgSparseVector");
  }
  static [entityKind] = "PgSparseVector";
  dimensions = this.config.dimensions;
  getSQLType() {
    return `sparsevec(${this.dimensions})`;
  }
};
function sparsevec(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgSparseVectorBuilder(name, config);
}
__name(sparsevec, "sparsevec");
__name2(sparsevec, "sparsevec");
var PgVectorBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgVectorBuilder");
  }
  static {
    __name2(this, "PgVectorBuilder");
  }
  static [entityKind] = "PgVectorBuilder";
  constructor(name, config) {
    super(name, "array", "PgVector");
    this.config.dimensions = config.dimensions;
  }
  /** @internal */
  build(table) {
    return new PgVector(
      table,
      this.config
    );
  }
};
var PgVector = class extends PgColumn {
  static {
    __name(this, "PgVector");
  }
  static {
    __name2(this, "PgVector");
  }
  static [entityKind] = "PgVector";
  dimensions = this.config.dimensions;
  getSQLType() {
    return `vector(${this.dimensions})`;
  }
  mapToDriverValue(value) {
    return JSON.stringify(value);
  }
  mapFromDriverValue(value) {
    return value.slice(1, -1).split(",").map((v2) => Number.parseFloat(v2));
  }
};
function vector(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgVectorBuilder(name, config);
}
__name(vector, "vector");
__name2(vector, "vector");
function getPgColumnBuilders() {
  return {
    bigint,
    bigserial,
    boolean,
    char,
    cidr,
    customType,
    date,
    doublePrecision,
    inet,
    integer,
    interval,
    json,
    jsonb,
    line,
    macaddr,
    macaddr8,
    numeric,
    point,
    geometry,
    real,
    serial,
    smallint,
    smallserial,
    text,
    time,
    timestamp,
    uuid,
    varchar,
    bit,
    halfvec,
    sparsevec,
    vector
  };
}
__name(getPgColumnBuilders, "getPgColumnBuilders");
__name2(getPgColumnBuilders, "getPgColumnBuilders");
var InlineForeignKeys = /* @__PURE__ */ Symbol.for("drizzle:PgInlineForeignKeys");
var EnableRLS = /* @__PURE__ */ Symbol.for("drizzle:EnableRLS");
var PgTable = class extends Table {
  static {
    __name(this, "PgTable");
  }
  static {
    __name2(this, "PgTable");
  }
  static [entityKind] = "PgTable";
  /** @internal */
  static Symbol = Object.assign({}, Table.Symbol, {
    InlineForeignKeys,
    EnableRLS
  });
  /**@internal */
  [InlineForeignKeys] = [];
  /** @internal */
  [EnableRLS] = false;
  /** @internal */
  [Table.Symbol.ExtraConfigBuilder] = void 0;
  /** @internal */
  [Table.Symbol.ExtraConfigColumns] = {};
};
function pgTableWithSchema(name, columns, extraConfig, schema, baseName = name) {
  const rawTable = new PgTable(name, schema, baseName);
  const parsedColumns = typeof columns === "function" ? columns(getPgColumnBuilders()) : columns;
  const builtColumns = Object.fromEntries(
    Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
      const colBuilder = colBuilderBase;
      colBuilder.setName(name2);
      const column = colBuilder.build(rawTable);
      rawTable[InlineForeignKeys].push(...colBuilder.buildForeignKeys(column, rawTable));
      return [name2, column];
    })
  );
  const builtColumnsForExtraConfig = Object.fromEntries(
    Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
      const colBuilder = colBuilderBase;
      colBuilder.setName(name2);
      const column = colBuilder.buildExtraConfigColumn(rawTable);
      return [name2, column];
    })
  );
  const table = Object.assign(rawTable, builtColumns);
  table[Table.Symbol.Columns] = builtColumns;
  table[Table.Symbol.ExtraConfigColumns] = builtColumnsForExtraConfig;
  if (extraConfig) {
    table[PgTable.Symbol.ExtraConfigBuilder] = extraConfig;
  }
  return Object.assign(table, {
    enableRLS: /* @__PURE__ */ __name2(() => {
      table[PgTable.Symbol.EnableRLS] = true;
      return table;
    }, "enableRLS")
  });
}
__name(pgTableWithSchema, "pgTableWithSchema");
__name2(pgTableWithSchema, "pgTableWithSchema");
var pgTable = /* @__PURE__ */ __name2((name, columns, extraConfig) => {
  return pgTableWithSchema(name, columns, extraConfig, void 0);
}, "pgTable");
function primaryKey(...config) {
  if (config[0].columns) {
    return new PrimaryKeyBuilder(config[0].columns, config[0].name);
  }
  return new PrimaryKeyBuilder(config);
}
__name(primaryKey, "primaryKey");
__name2(primaryKey, "primaryKey");
var PrimaryKeyBuilder = class {
  static {
    __name(this, "PrimaryKeyBuilder");
  }
  static {
    __name2(this, "PrimaryKeyBuilder");
  }
  static [entityKind] = "PgPrimaryKeyBuilder";
  /** @internal */
  columns;
  /** @internal */
  name;
  constructor(columns, name) {
    this.columns = columns;
    this.name = name;
  }
  /** @internal */
  build(table) {
    return new PrimaryKey(table, this.columns, this.name);
  }
};
var PrimaryKey = class {
  static {
    __name(this, "PrimaryKey");
  }
  static {
    __name2(this, "PrimaryKey");
  }
  constructor(table, columns, name) {
    this.table = table;
    this.columns = columns;
    this.name = name;
  }
  static [entityKind] = "PgPrimaryKey";
  columns;
  name;
  getName() {
    return this.name ?? `${this.table[PgTable.Symbol.Name]}_${this.columns.map((column) => column.name).join("_")}_pk`;
  }
};
function toSnakeCase(input) {
  const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
  return words.map((word) => word.toLowerCase()).join("_");
}
__name(toSnakeCase, "toSnakeCase");
__name2(toSnakeCase, "toSnakeCase");
function toCamelCase(input) {
  const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
  return words.reduce((acc, word, i) => {
    const formattedWord = i === 0 ? word.toLowerCase() : `${word[0].toUpperCase()}${word.slice(1)}`;
    return acc + formattedWord;
  }, "");
}
__name(toCamelCase, "toCamelCase");
__name2(toCamelCase, "toCamelCase");
function noopCase(input) {
  return input;
}
__name(noopCase, "noopCase");
__name2(noopCase, "noopCase");
var CasingCache = class {
  static {
    __name(this, "CasingCache");
  }
  static {
    __name2(this, "CasingCache");
  }
  static [entityKind] = "CasingCache";
  /** @internal */
  cache = {};
  cachedTables = {};
  convert;
  constructor(casing) {
    this.convert = casing === "snake_case" ? toSnakeCase : casing === "camelCase" ? toCamelCase : noopCase;
  }
  getColumnCasing(column) {
    if (!column.keyAsName) return column.name;
    const schema = column.table[Table.Symbol.Schema] ?? "public";
    const tableName = column.table[Table.Symbol.OriginalName];
    const key = `${schema}.${tableName}.${column.name}`;
    if (!this.cache[key]) {
      this.cacheTable(column.table);
    }
    return this.cache[key];
  }
  cacheTable(table) {
    const schema = table[Table.Symbol.Schema] ?? "public";
    const tableName = table[Table.Symbol.OriginalName];
    const tableKey = `${schema}.${tableName}`;
    if (!this.cachedTables[tableKey]) {
      for (const column of Object.values(table[Table.Symbol.Columns])) {
        const columnKey = `${tableKey}.${column.name}`;
        this.cache[columnKey] = this.convert(column.name);
      }
      this.cachedTables[tableKey] = true;
    }
  }
  clearCache() {
    this.cache = {};
    this.cachedTables = {};
  }
};
var DrizzleError = class extends Error {
  static {
    __name(this, "DrizzleError");
  }
  static {
    __name2(this, "DrizzleError");
  }
  static [entityKind] = "DrizzleError";
  constructor({ message, cause }) {
    super(message);
    this.name = "DrizzleError";
    this.cause = cause;
  }
};
var DrizzleQueryError = class _DrizzleQueryError extends Error {
  static {
    __name(this, "_DrizzleQueryError");
  }
  static {
    __name2(this, "DrizzleQueryError");
  }
  constructor(query, params, cause) {
    super(`Failed query: ${query}
params: ${params}`);
    this.query = query;
    this.params = params;
    this.cause = cause;
    Error.captureStackTrace(this, _DrizzleQueryError);
    if (cause) this.cause = cause;
  }
};
var TransactionRollbackError = class extends DrizzleError {
  static {
    __name(this, "TransactionRollbackError");
  }
  static {
    __name2(this, "TransactionRollbackError");
  }
  static [entityKind] = "TransactionRollbackError";
  constructor() {
    super({ message: "Rollback" });
  }
};
function bindIfParam(value, column) {
  if (isDriverValueEncoder(column) && !isSQLWrapper(value) && !is2(value, Param) && !is2(value, Placeholder) && !is2(value, Column) && !is2(value, Table) && !is2(value, View)) {
    return new Param(value, column);
  }
  return value;
}
__name(bindIfParam, "bindIfParam");
__name2(bindIfParam, "bindIfParam");
var eq = /* @__PURE__ */ __name2((left, right) => {
  return sql`${left} = ${bindIfParam(right, left)}`;
}, "eq");
var ne = /* @__PURE__ */ __name2((left, right) => {
  return sql`${left} <> ${bindIfParam(right, left)}`;
}, "ne");
function and(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter(
    (c) => c !== void 0
  );
  if (conditions.length === 0) {
    return void 0;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" and ")),
    new StringChunk(")")
  ]);
}
__name(and, "and");
__name2(and, "and");
function or(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter(
    (c) => c !== void 0
  );
  if (conditions.length === 0) {
    return void 0;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" or ")),
    new StringChunk(")")
  ]);
}
__name(or, "or");
__name2(or, "or");
function not(condition) {
  return sql`not ${condition}`;
}
__name(not, "not");
__name2(not, "not");
var gt3 = /* @__PURE__ */ __name2((left, right) => {
  return sql`${left} > ${bindIfParam(right, left)}`;
}, "gt");
var gte = /* @__PURE__ */ __name2((left, right) => {
  return sql`${left} >= ${bindIfParam(right, left)}`;
}, "gte");
var lt = /* @__PURE__ */ __name2((left, right) => {
  return sql`${left} < ${bindIfParam(right, left)}`;
}, "lt");
var lte = /* @__PURE__ */ __name2((left, right) => {
  return sql`${left} <= ${bindIfParam(right, left)}`;
}, "lte");
function inArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`false`;
    }
    return sql`${column} in ${values.map((v2) => bindIfParam(v2, column))}`;
  }
  return sql`${column} in ${bindIfParam(values, column)}`;
}
__name(inArray, "inArray");
__name2(inArray, "inArray");
function notInArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`true`;
    }
    return sql`${column} not in ${values.map((v2) => bindIfParam(v2, column))}`;
  }
  return sql`${column} not in ${bindIfParam(values, column)}`;
}
__name(notInArray, "notInArray");
__name2(notInArray, "notInArray");
function isNull(value) {
  return sql`${value} is null`;
}
__name(isNull, "isNull");
__name2(isNull, "isNull");
function isNotNull(value) {
  return sql`${value} is not null`;
}
__name(isNotNull, "isNotNull");
__name2(isNotNull, "isNotNull");
function exists(subquery) {
  return sql`exists ${subquery}`;
}
__name(exists, "exists");
__name2(exists, "exists");
function notExists(subquery) {
  return sql`not exists ${subquery}`;
}
__name(notExists, "notExists");
__name2(notExists, "notExists");
function between(column, min, max) {
  return sql`${column} between ${bindIfParam(min, column)} and ${bindIfParam(
    max,
    column
  )}`;
}
__name(between, "between");
__name2(between, "between");
function notBetween(column, min, max) {
  return sql`${column} not between ${bindIfParam(
    min,
    column
  )} and ${bindIfParam(max, column)}`;
}
__name(notBetween, "notBetween");
__name2(notBetween, "notBetween");
function like(column, value) {
  return sql`${column} like ${value}`;
}
__name(like, "like");
__name2(like, "like");
function notLike(column, value) {
  return sql`${column} not like ${value}`;
}
__name(notLike, "notLike");
__name2(notLike, "notLike");
function ilike(column, value) {
  return sql`${column} ilike ${value}`;
}
__name(ilike, "ilike");
__name2(ilike, "ilike");
function notIlike(column, value) {
  return sql`${column} not ilike ${value}`;
}
__name(notIlike, "notIlike");
__name2(notIlike, "notIlike");
function asc(column) {
  return sql`${column} asc`;
}
__name(asc, "asc");
__name2(asc, "asc");
function desc(column) {
  return sql`${column} desc`;
}
__name(desc, "desc");
__name2(desc, "desc");
var Relation = class {
  static {
    __name(this, "Relation");
  }
  static {
    __name2(this, "Relation");
  }
  constructor(sourceTable, referencedTable, relationName) {
    this.sourceTable = sourceTable;
    this.referencedTable = referencedTable;
    this.relationName = relationName;
    this.referencedTableName = referencedTable[Table.Symbol.Name];
  }
  static [entityKind] = "Relation";
  referencedTableName;
  fieldName;
};
var Relations = class {
  static {
    __name(this, "Relations");
  }
  static {
    __name2(this, "Relations");
  }
  constructor(table, config) {
    this.table = table;
    this.config = config;
  }
  static [entityKind] = "Relations";
};
var One = class _One extends Relation {
  static {
    __name(this, "_One");
  }
  static {
    __name2(this, "One");
  }
  constructor(sourceTable, referencedTable, config, isNullable) {
    super(sourceTable, referencedTable, config?.relationName);
    this.config = config;
    this.isNullable = isNullable;
  }
  static [entityKind] = "One";
  withFieldName(fieldName) {
    const relation = new _One(
      this.sourceTable,
      this.referencedTable,
      this.config,
      this.isNullable
    );
    relation.fieldName = fieldName;
    return relation;
  }
};
var Many = class _Many extends Relation {
  static {
    __name(this, "_Many");
  }
  static {
    __name2(this, "Many");
  }
  constructor(sourceTable, referencedTable, config) {
    super(sourceTable, referencedTable, config?.relationName);
    this.config = config;
  }
  static [entityKind] = "Many";
  withFieldName(fieldName) {
    const relation = new _Many(
      this.sourceTable,
      this.referencedTable,
      this.config
    );
    relation.fieldName = fieldName;
    return relation;
  }
};
function getOperators() {
  return {
    and,
    between,
    eq,
    exists,
    gt: gt3,
    gte,
    ilike,
    inArray,
    isNull,
    isNotNull,
    like,
    lt,
    lte,
    ne,
    not,
    notBetween,
    notExists,
    notLike,
    notIlike,
    notInArray,
    or,
    sql
  };
}
__name(getOperators, "getOperators");
__name2(getOperators, "getOperators");
function getOrderByOperators() {
  return {
    sql,
    asc,
    desc
  };
}
__name(getOrderByOperators, "getOrderByOperators");
__name2(getOrderByOperators, "getOrderByOperators");
function extractTablesRelationalConfig(schema, configHelpers) {
  if (Object.keys(schema).length === 1 && "default" in schema && !is2(schema["default"], Table)) {
    schema = schema["default"];
  }
  const tableNamesMap = {};
  const relationsBuffer = {};
  const tablesConfig = {};
  for (const [key, value] of Object.entries(schema)) {
    if (is2(value, Table)) {
      const dbName = getTableUniqueName(value);
      const bufferedRelations = relationsBuffer[dbName];
      tableNamesMap[dbName] = key;
      tablesConfig[key] = {
        tsName: key,
        dbName: value[Table.Symbol.Name],
        schema: value[Table.Symbol.Schema],
        columns: value[Table.Symbol.Columns],
        relations: bufferedRelations?.relations ?? {},
        primaryKey: bufferedRelations?.primaryKey ?? []
      };
      for (const column of Object.values(
        value[Table.Symbol.Columns]
      )) {
        if (column.primary) {
          tablesConfig[key].primaryKey.push(column);
        }
      }
      const extraConfig = value[Table.Symbol.ExtraConfigBuilder]?.(value[Table.Symbol.ExtraConfigColumns]);
      if (extraConfig) {
        for (const configEntry of Object.values(extraConfig)) {
          if (is2(configEntry, PrimaryKeyBuilder)) {
            tablesConfig[key].primaryKey.push(...configEntry.columns);
          }
        }
      }
    } else if (is2(value, Relations)) {
      const dbName = getTableUniqueName(value.table);
      const tableName = tableNamesMap[dbName];
      const relations2 = value.config(
        configHelpers(value.table)
      );
      let primaryKey2;
      for (const [relationName, relation] of Object.entries(relations2)) {
        if (tableName) {
          const tableConfig = tablesConfig[tableName];
          tableConfig.relations[relationName] = relation;
          if (primaryKey2) {
            tableConfig.primaryKey.push(...primaryKey2);
          }
        } else {
          if (!(dbName in relationsBuffer)) {
            relationsBuffer[dbName] = {
              relations: {},
              primaryKey: primaryKey2
            };
          }
          relationsBuffer[dbName].relations[relationName] = relation;
        }
      }
    }
  }
  return { tables: tablesConfig, tableNamesMap };
}
__name(extractTablesRelationalConfig, "extractTablesRelationalConfig");
__name2(extractTablesRelationalConfig, "extractTablesRelationalConfig");
function createOne(sourceTable) {
  return /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function one(table, config) {
    return new One(
      sourceTable,
      table,
      config,
      config?.fields.reduce((res, f) => res && f.notNull, true) ?? false
    );
  }, "one"), "one");
}
__name(createOne, "createOne");
__name2(createOne, "createOne");
function createMany(sourceTable) {
  return /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function many(referencedTable, config) {
    return new Many(sourceTable, referencedTable, config);
  }, "many"), "many");
}
__name(createMany, "createMany");
__name2(createMany, "createMany");
function normalizeRelation(schema, tableNamesMap, relation) {
  if (is2(relation, One) && relation.config) {
    return {
      fields: relation.config.fields,
      references: relation.config.references
    };
  }
  const referencedTableTsName = tableNamesMap[getTableUniqueName(relation.referencedTable)];
  if (!referencedTableTsName) {
    throw new Error(
      `Table "${relation.referencedTable[Table.Symbol.Name]}" not found in schema`
    );
  }
  const referencedTableConfig = schema[referencedTableTsName];
  if (!referencedTableConfig) {
    throw new Error(`Table "${referencedTableTsName}" not found in schema`);
  }
  const sourceTable = relation.sourceTable;
  const sourceTableTsName = tableNamesMap[getTableUniqueName(sourceTable)];
  if (!sourceTableTsName) {
    throw new Error(
      `Table "${sourceTable[Table.Symbol.Name]}" not found in schema`
    );
  }
  const reverseRelations = [];
  for (const referencedTableRelation of Object.values(
    referencedTableConfig.relations
  )) {
    if (relation.relationName && relation !== referencedTableRelation && referencedTableRelation.relationName === relation.relationName || !relation.relationName && referencedTableRelation.referencedTable === relation.sourceTable) {
      reverseRelations.push(referencedTableRelation);
    }
  }
  if (reverseRelations.length > 1) {
    throw relation.relationName ? new Error(
      `There are multiple relations with name "${relation.relationName}" in table "${referencedTableTsName}"`
    ) : new Error(
      `There are multiple relations between "${referencedTableTsName}" and "${relation.sourceTable[Table.Symbol.Name]}". Please specify relation name`
    );
  }
  if (reverseRelations[0] && is2(reverseRelations[0], One) && reverseRelations[0].config) {
    return {
      fields: reverseRelations[0].config.references,
      references: reverseRelations[0].config.fields
    };
  }
  throw new Error(
    `There is not enough information to infer relation "${sourceTableTsName}.${relation.fieldName}"`
  );
}
__name(normalizeRelation, "normalizeRelation");
__name2(normalizeRelation, "normalizeRelation");
function createTableRelationsHelpers(sourceTable) {
  return {
    one: createOne(sourceTable),
    many: createMany(sourceTable)
  };
}
__name(createTableRelationsHelpers, "createTableRelationsHelpers");
__name2(createTableRelationsHelpers, "createTableRelationsHelpers");
function mapRelationalRow(tablesConfig, tableConfig, row, buildQueryResultSelection, mapColumnValue = (value) => value) {
  const result = {};
  for (const [
    selectionItemIndex,
    selectionItem
  ] of buildQueryResultSelection.entries()) {
    if (selectionItem.isJson) {
      const relation = tableConfig.relations[selectionItem.tsKey];
      const rawSubRows = row[selectionItemIndex];
      const subRows = typeof rawSubRows === "string" ? JSON.parse(rawSubRows) : rawSubRows;
      result[selectionItem.tsKey] = is2(relation, One) ? subRows && mapRelationalRow(
        tablesConfig,
        tablesConfig[selectionItem.relationTableTsKey],
        subRows,
        selectionItem.selection,
        mapColumnValue
      ) : subRows.map(
        (subRow) => mapRelationalRow(
          tablesConfig,
          tablesConfig[selectionItem.relationTableTsKey],
          subRow,
          selectionItem.selection,
          mapColumnValue
        )
      );
    } else {
      const value = mapColumnValue(row[selectionItemIndex]);
      const field = selectionItem.field;
      let decoder;
      if (is2(field, Column)) {
        decoder = field;
      } else if (is2(field, SQL)) {
        decoder = field.decoder;
      } else {
        decoder = field.sql.decoder;
      }
      result[selectionItem.tsKey] = value === null ? null : decoder.mapFromDriverValue(value);
    }
  }
  return result;
}
__name(mapRelationalRow, "mapRelationalRow");
__name2(mapRelationalRow, "mapRelationalRow");
var PgViewBase = class extends View {
  static {
    __name(this, "PgViewBase");
  }
  static {
    __name2(this, "PgViewBase");
  }
  static [entityKind] = "PgViewBase";
};
var PgDialect = class {
  static {
    __name(this, "PgDialect");
  }
  static {
    __name2(this, "PgDialect");
  }
  static [entityKind] = "PgDialect";
  /** @internal */
  casing;
  constructor(config) {
    this.casing = new CasingCache(config?.casing);
  }
  async migrate(migrations, session, config) {
    const migrationsTable = typeof config === "string" ? "__drizzle_migrations" : config.migrationsTable ?? "__drizzle_migrations";
    const migrationsSchema = typeof config === "string" ? "drizzle" : config.migrationsSchema ?? "drizzle";
    const migrationTableCreate = sql`
			CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at bigint
			)
		`;
    await session.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(migrationsSchema)}`);
    await session.execute(migrationTableCreate);
    const dbMigrations = await session.all(
      sql`select id, hash, created_at from ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} order by created_at desc limit 1`
    );
    const lastDbMigration = dbMigrations[0];
    await session.transaction(async (tx) => {
      for await (const migration of migrations) {
        if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) {
          for (const stmt of migration.sql) {
            await tx.execute(sql.raw(stmt));
          }
          await tx.execute(
            sql`insert into ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} ("hash", "created_at") values(${migration.hash}, ${migration.folderMillis})`
          );
        }
      }
    });
  }
  escapeName(name) {
    return `"${name}"`;
  }
  escapeParam(num) {
    return `$${num + 1}`;
  }
  escapeString(str) {
    return `'${str.replace(/'/g, "''")}'`;
  }
  buildWithCTE(queries) {
    if (!queries?.length) return void 0;
    const withSqlChunks = [sql`with `];
    for (const [i, w] of queries.entries()) {
      withSqlChunks.push(sql`${sql.identifier(w._.alias)} as (${w._.sql})`);
      if (i < queries.length - 1) {
        withSqlChunks.push(sql`, `);
      }
    }
    withSqlChunks.push(sql` `);
    return sql.join(withSqlChunks);
  }
  buildDeleteQuery({ table, where, returning, withList }) {
    const withSql = this.buildWithCTE(withList);
    const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
    const whereSql = where ? sql` where ${where}` : void 0;
    return sql`${withSql}delete from ${table}${whereSql}${returningSql}`;
  }
  buildUpdateSet(table, set) {
    const tableColumns = table[Table.Symbol.Columns];
    const columnNames = Object.keys(tableColumns).filter(
      (colName) => set[colName] !== void 0 || tableColumns[colName]?.onUpdateFn !== void 0
    );
    const setSize = columnNames.length;
    return sql.join(columnNames.flatMap((colName, i) => {
      const col = tableColumns[colName];
      const onUpdateFnResult = col.onUpdateFn?.();
      const value = set[colName] ?? (is2(onUpdateFnResult, SQL) ? onUpdateFnResult : sql.param(onUpdateFnResult, col));
      const res = sql`${sql.identifier(this.casing.getColumnCasing(col))} = ${value}`;
      if (i < setSize - 1) {
        return [res, sql.raw(", ")];
      }
      return [res];
    }));
  }
  buildUpdateQuery({ table, set, where, returning, withList, from, joins }) {
    const withSql = this.buildWithCTE(withList);
    const tableName = table[PgTable.Symbol.Name];
    const tableSchema = table[PgTable.Symbol.Schema];
    const origTableName = table[PgTable.Symbol.OriginalName];
    const alias = tableName === origTableName ? void 0 : tableName;
    const tableSql = sql`${tableSchema ? sql`${sql.identifier(tableSchema)}.` : void 0}${sql.identifier(origTableName)}${alias && sql` ${sql.identifier(alias)}`}`;
    const setSql = this.buildUpdateSet(table, set);
    const fromSql = from && sql.join([sql.raw(" from "), this.buildFromTable(from)]);
    const joinsSql = this.buildJoins(joins);
    const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: !from })}` : void 0;
    const whereSql = where ? sql` where ${where}` : void 0;
    return sql`${withSql}update ${tableSql} set ${setSql}${fromSql}${joinsSql}${whereSql}${returningSql}`;
  }
  /**
   * Builds selection SQL with provided fields/expressions
   *
   * Examples:
   *
   * `select <selection> from`
   *
   * `insert ... returning <selection>`
   *
   * If `isSingleTable` is true, then columns won't be prefixed with table name
   */
  buildSelection(fields, { isSingleTable = false } = {}) {
    const columnsLen = fields.length;
    const chunks = fields.flatMap(({ field }, i) => {
      const chunk = [];
      if (is2(field, SQL.Aliased) && field.isSelectionField) {
        chunk.push(sql.identifier(field.fieldAlias));
      } else if (is2(field, SQL.Aliased) || is2(field, SQL)) {
        const query = is2(field, SQL.Aliased) ? field.sql : field;
        if (isSingleTable) {
          chunk.push(
            new SQL(
              query.queryChunks.map((c) => {
                if (is2(c, PgColumn)) {
                  return sql.identifier(this.casing.getColumnCasing(c));
                }
                return c;
              })
            )
          );
        } else {
          chunk.push(query);
        }
        if (is2(field, SQL.Aliased)) {
          chunk.push(sql` as ${sql.identifier(field.fieldAlias)}`);
        }
      } else if (is2(field, Column)) {
        if (isSingleTable) {
          chunk.push(sql.identifier(this.casing.getColumnCasing(field)));
        } else {
          chunk.push(field);
        }
      } else if (is2(field, Subquery)) {
        const entries = Object.entries(field._.selectedFields);
        if (entries.length === 1) {
          const entry = entries[0][1];
          const fieldDecoder = is2(entry, SQL) ? entry.decoder : is2(entry, Column) ? { mapFromDriverValue: /* @__PURE__ */ __name2((v2) => entry.mapFromDriverValue(v2), "mapFromDriverValue") } : entry.sql.decoder;
          if (fieldDecoder) {
            field._.sql.decoder = fieldDecoder;
          }
        }
        chunk.push(field);
      }
      if (i < columnsLen - 1) {
        chunk.push(sql`, `);
      }
      return chunk;
    });
    return sql.join(chunks);
  }
  buildJoins(joins) {
    if (!joins || joins.length === 0) {
      return void 0;
    }
    const joinsArray = [];
    for (const [index, joinMeta] of joins.entries()) {
      if (index === 0) {
        joinsArray.push(sql` `);
      }
      const table = joinMeta.table;
      const lateralSql = joinMeta.lateral ? sql` lateral` : void 0;
      const onSql = joinMeta.on ? sql` on ${joinMeta.on}` : void 0;
      if (is2(table, PgTable)) {
        const tableName = table[PgTable.Symbol.Name];
        const tableSchema = table[PgTable.Symbol.Schema];
        const origTableName = table[PgTable.Symbol.OriginalName];
        const alias = tableName === origTableName ? void 0 : joinMeta.alias;
        joinsArray.push(
          sql`${sql.raw(joinMeta.joinType)} join${lateralSql} ${tableSchema ? sql`${sql.identifier(tableSchema)}.` : void 0}${sql.identifier(origTableName)}${alias && sql` ${sql.identifier(alias)}`}${onSql}`
        );
      } else if (is2(table, View)) {
        const viewName = table[ViewBaseConfig].name;
        const viewSchema = table[ViewBaseConfig].schema;
        const origViewName = table[ViewBaseConfig].originalName;
        const alias = viewName === origViewName ? void 0 : joinMeta.alias;
        joinsArray.push(
          sql`${sql.raw(joinMeta.joinType)} join${lateralSql} ${viewSchema ? sql`${sql.identifier(viewSchema)}.` : void 0}${sql.identifier(origViewName)}${alias && sql` ${sql.identifier(alias)}`}${onSql}`
        );
      } else {
        joinsArray.push(
          sql`${sql.raw(joinMeta.joinType)} join${lateralSql} ${table}${onSql}`
        );
      }
      if (index < joins.length - 1) {
        joinsArray.push(sql` `);
      }
    }
    return sql.join(joinsArray);
  }
  buildFromTable(table) {
    if (is2(table, Table) && table[Table.Symbol.IsAlias]) {
      let fullName = sql`${sql.identifier(table[Table.Symbol.OriginalName])}`;
      if (table[Table.Symbol.Schema]) {
        fullName = sql`${sql.identifier(table[Table.Symbol.Schema])}.${fullName}`;
      }
      return sql`${fullName} ${sql.identifier(table[Table.Symbol.Name])}`;
    }
    return table;
  }
  buildSelectQuery({
    withList,
    fields,
    fieldsFlat,
    where,
    having,
    table,
    joins,
    orderBy,
    groupBy,
    limit,
    offset,
    lockingClause,
    distinct,
    setOperators
  }) {
    const fieldsList = fieldsFlat ?? orderSelectedFields(fields);
    for (const f of fieldsList) {
      if (is2(f.field, Column) && getTableName(f.field.table) !== (is2(table, Subquery) ? table._.alias : is2(table, PgViewBase) ? table[ViewBaseConfig].name : is2(table, SQL) ? void 0 : getTableName(table)) && !((table2) => joins?.some(
        ({ alias }) => alias === (table2[Table.Symbol.IsAlias] ? getTableName(table2) : table2[Table.Symbol.BaseName])
      ))(f.field.table)) {
        const tableName = getTableName(f.field.table);
        throw new Error(
          `Your "${f.path.join("->")}" field references a column "${tableName}"."${f.field.name}", but the table "${tableName}" is not part of the query! Did you forget to join it?`
        );
      }
    }
    const isSingleTable = !joins || joins.length === 0;
    const withSql = this.buildWithCTE(withList);
    let distinctSql;
    if (distinct) {
      distinctSql = distinct === true ? sql` distinct` : sql` distinct on (${sql.join(distinct.on, sql`, `)})`;
    }
    const selection = this.buildSelection(fieldsList, { isSingleTable });
    const tableSql = this.buildFromTable(table);
    const joinsSql = this.buildJoins(joins);
    const whereSql = where ? sql` where ${where}` : void 0;
    const havingSql = having ? sql` having ${having}` : void 0;
    let orderBySql;
    if (orderBy && orderBy.length > 0) {
      orderBySql = sql` order by ${sql.join(orderBy, sql`, `)}`;
    }
    let groupBySql;
    if (groupBy && groupBy.length > 0) {
      groupBySql = sql` group by ${sql.join(groupBy, sql`, `)}`;
    }
    const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : void 0;
    const offsetSql = offset ? sql` offset ${offset}` : void 0;
    const lockingClauseSql = sql.empty();
    if (lockingClause) {
      const clauseSql = sql` for ${sql.raw(lockingClause.strength)}`;
      if (lockingClause.config.of) {
        clauseSql.append(
          sql` of ${sql.join(
            Array.isArray(lockingClause.config.of) ? lockingClause.config.of : [lockingClause.config.of],
            sql`, `
          )}`
        );
      }
      if (lockingClause.config.noWait) {
        clauseSql.append(sql` nowait`);
      } else if (lockingClause.config.skipLocked) {
        clauseSql.append(sql` skip locked`);
      }
      lockingClauseSql.append(clauseSql);
    }
    const finalQuery = sql`${withSql}select${distinctSql} ${selection} from ${tableSql}${joinsSql}${whereSql}${groupBySql}${havingSql}${orderBySql}${limitSql}${offsetSql}${lockingClauseSql}`;
    if (setOperators.length > 0) {
      return this.buildSetOperations(finalQuery, setOperators);
    }
    return finalQuery;
  }
  buildSetOperations(leftSelect, setOperators) {
    const [setOperator, ...rest] = setOperators;
    if (!setOperator) {
      throw new Error("Cannot pass undefined values to any set operator");
    }
    if (rest.length === 0) {
      return this.buildSetOperationQuery({ leftSelect, setOperator });
    }
    return this.buildSetOperations(
      this.buildSetOperationQuery({ leftSelect, setOperator }),
      rest
    );
  }
  buildSetOperationQuery({
    leftSelect,
    setOperator: { type, isAll, rightSelect, limit, orderBy, offset }
  }) {
    const leftChunk = sql`(${leftSelect.getSQL()}) `;
    const rightChunk = sql`(${rightSelect.getSQL()})`;
    let orderBySql;
    if (orderBy && orderBy.length > 0) {
      const orderByValues = [];
      for (const singleOrderBy of orderBy) {
        if (is2(singleOrderBy, PgColumn)) {
          orderByValues.push(sql.identifier(singleOrderBy.name));
        } else if (is2(singleOrderBy, SQL)) {
          for (let i = 0; i < singleOrderBy.queryChunks.length; i++) {
            const chunk = singleOrderBy.queryChunks[i];
            if (is2(chunk, PgColumn)) {
              singleOrderBy.queryChunks[i] = sql.identifier(chunk.name);
            }
          }
          orderByValues.push(sql`${singleOrderBy}`);
        } else {
          orderByValues.push(sql`${singleOrderBy}`);
        }
      }
      orderBySql = sql` order by ${sql.join(orderByValues, sql`, `)} `;
    }
    const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : void 0;
    const operatorChunk = sql.raw(`${type} ${isAll ? "all " : ""}`);
    const offsetSql = offset ? sql` offset ${offset}` : void 0;
    return sql`${leftChunk}${operatorChunk}${rightChunk}${orderBySql}${limitSql}${offsetSql}`;
  }
  buildInsertQuery({ table, values: valuesOrSelect, onConflict, returning, withList, select, overridingSystemValue_ }) {
    const valuesSqlList = [];
    const columns = table[Table.Symbol.Columns];
    const colEntries = Object.entries(columns).filter(([_2, col]) => !col.shouldDisableInsert());
    const insertOrder = colEntries.map(
      ([, column]) => sql.identifier(this.casing.getColumnCasing(column))
    );
    if (select) {
      const select2 = valuesOrSelect;
      if (is2(select2, SQL)) {
        valuesSqlList.push(select2);
      } else {
        valuesSqlList.push(select2.getSQL());
      }
    } else {
      const values = valuesOrSelect;
      valuesSqlList.push(sql.raw("values "));
      for (const [valueIndex, value] of values.entries()) {
        const valueList = [];
        for (const [fieldName, col] of colEntries) {
          const colValue = value[fieldName];
          if (colValue === void 0 || is2(colValue, Param) && colValue.value === void 0) {
            if (col.defaultFn !== void 0) {
              const defaultFnResult = col.defaultFn();
              const defaultValue = is2(defaultFnResult, SQL) ? defaultFnResult : sql.param(defaultFnResult, col);
              valueList.push(defaultValue);
            } else if (!col.default && col.onUpdateFn !== void 0) {
              const onUpdateFnResult = col.onUpdateFn();
              const newValue = is2(onUpdateFnResult, SQL) ? onUpdateFnResult : sql.param(onUpdateFnResult, col);
              valueList.push(newValue);
            } else {
              valueList.push(sql`default`);
            }
          } else {
            valueList.push(colValue);
          }
        }
        valuesSqlList.push(valueList);
        if (valueIndex < values.length - 1) {
          valuesSqlList.push(sql`, `);
        }
      }
    }
    const withSql = this.buildWithCTE(withList);
    const valuesSql = sql.join(valuesSqlList);
    const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
    const onConflictSql = onConflict ? sql` on conflict ${onConflict}` : void 0;
    const overridingSql = overridingSystemValue_ === true ? sql`overriding system value ` : void 0;
    return sql`${withSql}insert into ${table} ${insertOrder} ${overridingSql}${valuesSql}${onConflictSql}${returningSql}`;
  }
  buildRefreshMaterializedViewQuery({ view, concurrently, withNoData }) {
    const concurrentlySql = concurrently ? sql` concurrently` : void 0;
    const withNoDataSql = withNoData ? sql` with no data` : void 0;
    return sql`refresh materialized view${concurrentlySql} ${view}${withNoDataSql}`;
  }
  prepareTyping(encoder) {
    if (is2(encoder, PgJsonb) || is2(encoder, PgJson)) {
      return "json";
    } else if (is2(encoder, PgNumeric)) {
      return "decimal";
    } else if (is2(encoder, PgTime)) {
      return "time";
    } else if (is2(encoder, PgTimestamp) || is2(encoder, PgTimestampString)) {
      return "timestamp";
    } else if (is2(encoder, PgDate) || is2(encoder, PgDateString)) {
      return "date";
    } else if (is2(encoder, PgUUID)) {
      return "uuid";
    } else {
      return "none";
    }
  }
  sqlToQuery(sql2, invokeSource) {
    return sql2.toQuery({
      casing: this.casing,
      escapeName: this.escapeName,
      escapeParam: this.escapeParam,
      escapeString: this.escapeString,
      prepareTyping: this.prepareTyping,
      invokeSource
    });
  }
  // buildRelationalQueryWithPK({
  // 	fullSchema,
  // 	schema,
  // 	tableNamesMap,
  // 	table,
  // 	tableConfig,
  // 	queryConfig: config,
  // 	tableAlias,
  // 	isRoot = false,
  // 	joinOn,
  // }: {
  // 	fullSchema: Record<string, unknown>;
  // 	schema: TablesRelationalConfig;
  // 	tableNamesMap: Record<string, string>;
  // 	table: PgTable;
  // 	tableConfig: TableRelationalConfig;
  // 	queryConfig: true | DBQueryConfig<'many', true>;
  // 	tableAlias: string;
  // 	isRoot?: boolean;
  // 	joinOn?: SQL;
  // }): BuildRelationalQueryResult<PgTable, PgColumn> {
  // 	// For { "<relation>": true }, return a table with selection of all columns
  // 	if (config === true) {
  // 		const selectionEntries = Object.entries(tableConfig.columns);
  // 		const selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = selectionEntries.map((
  // 			[key, value],
  // 		) => ({
  // 			dbKey: value.name,
  // 			tsKey: key,
  // 			field: value as PgColumn,
  // 			relationTableTsKey: undefined,
  // 			isJson: false,
  // 			selection: [],
  // 		}));
  // 		return {
  // 			tableTsKey: tableConfig.tsName,
  // 			sql: table,
  // 			selection,
  // 		};
  // 	}
  // 	// let selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = [];
  // 	// let selectionForBuild = selection;
  // 	const aliasedColumns = Object.fromEntries(
  // 		Object.entries(tableConfig.columns).map(([key, value]) => [key, aliasedTableColumn(value, tableAlias)]),
  // 	);
  // 	const aliasedRelations = Object.fromEntries(
  // 		Object.entries(tableConfig.relations).map(([key, value]) => [key, aliasedRelation(value, tableAlias)]),
  // 	);
  // 	const aliasedFields = Object.assign({}, aliasedColumns, aliasedRelations);
  // 	let where, hasUserDefinedWhere;
  // 	if (config.where) {
  // 		const whereSql = typeof config.where === 'function' ? config.where(aliasedFields, operators) : config.where;
  // 		where = whereSql && mapColumnsInSQLToAlias(whereSql, tableAlias);
  // 		hasUserDefinedWhere = !!where;
  // 	}
  // 	where = and(joinOn, where);
  // 	// const fieldsSelection: { tsKey: string; value: PgColumn | SQL.Aliased; isExtra?: boolean }[] = [];
  // 	let joins: Join[] = [];
  // 	let selectedColumns: string[] = [];
  // 	// Figure out which columns to select
  // 	if (config.columns) {
  // 		let isIncludeMode = false;
  // 		for (const [field, value] of Object.entries(config.columns)) {
  // 			if (value === undefined) {
  // 				continue;
  // 			}
  // 			if (field in tableConfig.columns) {
  // 				if (!isIncludeMode && value === true) {
  // 					isIncludeMode = true;
  // 				}
  // 				selectedColumns.push(field);
  // 			}
  // 		}
  // 		if (selectedColumns.length > 0) {
  // 			selectedColumns = isIncludeMode
  // 				? selectedColumns.filter((c) => config.columns?.[c] === true)
  // 				: Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
  // 		}
  // 	} else {
  // 		// Select all columns if selection is not specified
  // 		selectedColumns = Object.keys(tableConfig.columns);
  // 	}
  // 	// for (const field of selectedColumns) {
  // 	// 	const column = tableConfig.columns[field]! as PgColumn;
  // 	// 	fieldsSelection.push({ tsKey: field, value: column });
  // 	// }
  // 	let initiallySelectedRelations: {
  // 		tsKey: string;
  // 		queryConfig: true | DBQueryConfig<'many', false>;
  // 		relation: Relation;
  // 	}[] = [];
  // 	// let selectedRelations: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = [];
  // 	// Figure out which relations to select
  // 	if (config.with) {
  // 		initiallySelectedRelations = Object.entries(config.with)
  // 			.filter((entry): entry is [typeof entry[0], NonNullable<typeof entry[1]>] => !!entry[1])
  // 			.map(([tsKey, queryConfig]) => ({ tsKey, queryConfig, relation: tableConfig.relations[tsKey]! }));
  // 	}
  // 	const manyRelations = initiallySelectedRelations.filter((r) =>
  // 		is(r.relation, Many)
  // 		&& (schema[tableNamesMap[r.relation.referencedTable[Table.Symbol.Name]]!]?.primaryKey.length ?? 0) > 0
  // 	);
  // 	// If this is the last Many relation (or there are no Many relations), we are on the innermost subquery level
  // 	const isInnermostQuery = manyRelations.length < 2;
  // 	const selectedExtras: {
  // 		tsKey: string;
  // 		value: SQL.Aliased;
  // 	}[] = [];
  // 	// Figure out which extras to select
  // 	if (isInnermostQuery && config.extras) {
  // 		const extras = typeof config.extras === 'function'
  // 			? config.extras(aliasedFields, { sql })
  // 			: config.extras;
  // 		for (const [tsKey, value] of Object.entries(extras)) {
  // 			selectedExtras.push({
  // 				tsKey,
  // 				value: mapColumnsInAliasedSQLToAlias(value, tableAlias),
  // 			});
  // 		}
  // 	}
  // 	// Transform `fieldsSelection` into `selection`
  // 	// `fieldsSelection` shouldn't be used after this point
  // 	// for (const { tsKey, value, isExtra } of fieldsSelection) {
  // 	// 	selection.push({
  // 	// 		dbKey: is(value, SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey]!.name,
  // 	// 		tsKey,
  // 	// 		field: is(value, Column) ? aliasedTableColumn(value, tableAlias) : value,
  // 	// 		relationTableTsKey: undefined,
  // 	// 		isJson: false,
  // 	// 		isExtra,
  // 	// 		selection: [],
  // 	// 	});
  // 	// }
  // 	let orderByOrig = typeof config.orderBy === 'function'
  // 		? config.orderBy(aliasedFields, orderByOperators)
  // 		: config.orderBy ?? [];
  // 	if (!Array.isArray(orderByOrig)) {
  // 		orderByOrig = [orderByOrig];
  // 	}
  // 	const orderBy = orderByOrig.map((orderByValue) => {
  // 		if (is(orderByValue, Column)) {
  // 			return aliasedTableColumn(orderByValue, tableAlias) as PgColumn;
  // 		}
  // 		return mapColumnsInSQLToAlias(orderByValue, tableAlias);
  // 	});
  // 	const limit = isInnermostQuery ? config.limit : undefined;
  // 	const offset = isInnermostQuery ? config.offset : undefined;
  // 	// For non-root queries without additional config except columns, return a table with selection
  // 	if (
  // 		!isRoot
  // 		&& initiallySelectedRelations.length === 0
  // 		&& selectedExtras.length === 0
  // 		&& !where
  // 		&& orderBy.length === 0
  // 		&& limit === undefined
  // 		&& offset === undefined
  // 	) {
  // 		return {
  // 			tableTsKey: tableConfig.tsName,
  // 			sql: table,
  // 			selection: selectedColumns.map((key) => ({
  // 				dbKey: tableConfig.columns[key]!.name,
  // 				tsKey: key,
  // 				field: tableConfig.columns[key] as PgColumn,
  // 				relationTableTsKey: undefined,
  // 				isJson: false,
  // 				selection: [],
  // 			})),
  // 		};
  // 	}
  // 	const selectedRelationsWithoutPK:
  // 	// Process all relations without primary keys, because they need to be joined differently and will all be on the same query level
  // 	for (
  // 		const {
  // 			tsKey: selectedRelationTsKey,
  // 			queryConfig: selectedRelationConfigValue,
  // 			relation,
  // 		} of initiallySelectedRelations
  // 	) {
  // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
  // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
  // 		const relationTableTsName = tableNamesMap[relationTableName]!;
  // 		const relationTable = schema[relationTableTsName]!;
  // 		if (relationTable.primaryKey.length > 0) {
  // 			continue;
  // 		}
  // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
  // 		const joinOn = and(
  // 			...normalizedRelation.fields.map((field, i) =>
  // 				eq(
  // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
  // 					aliasedTableColumn(field, tableAlias),
  // 				)
  // 			),
  // 		);
  // 		const builtRelation = this.buildRelationalQueryWithoutPK({
  // 			fullSchema,
  // 			schema,
  // 			tableNamesMap,
  // 			table: fullSchema[relationTableTsName] as PgTable,
  // 			tableConfig: schema[relationTableTsName]!,
  // 			queryConfig: selectedRelationConfigValue,
  // 			tableAlias: relationTableAlias,
  // 			joinOn,
  // 			nestedQueryRelation: relation,
  // 		});
  // 		const field = sql`${sql.identifier(relationTableAlias)}.${sql.identifier('data')}`.as(selectedRelationTsKey);
  // 		joins.push({
  // 			on: sql`true`,
  // 			table: new Subquery(builtRelation.sql as SQL, {}, relationTableAlias),
  // 			alias: relationTableAlias,
  // 			joinType: 'left',
  // 			lateral: true,
  // 		});
  // 		selectedRelations.push({
  // 			dbKey: selectedRelationTsKey,
  // 			tsKey: selectedRelationTsKey,
  // 			field,
  // 			relationTableTsKey: relationTableTsName,
  // 			isJson: true,
  // 			selection: builtRelation.selection,
  // 		});
  // 	}
  // 	const oneRelations = initiallySelectedRelations.filter((r): r is typeof r & { relation: One } =>
  // 		is(r.relation, One)
  // 	);
  // 	// Process all One relations with PKs, because they can all be joined on the same level
  // 	for (
  // 		const {
  // 			tsKey: selectedRelationTsKey,
  // 			queryConfig: selectedRelationConfigValue,
  // 			relation,
  // 		} of oneRelations
  // 	) {
  // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
  // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
  // 		const relationTableTsName = tableNamesMap[relationTableName]!;
  // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
  // 		const relationTable = schema[relationTableTsName]!;
  // 		if (relationTable.primaryKey.length === 0) {
  // 			continue;
  // 		}
  // 		const joinOn = and(
  // 			...normalizedRelation.fields.map((field, i) =>
  // 				eq(
  // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
  // 					aliasedTableColumn(field, tableAlias),
  // 				)
  // 			),
  // 		);
  // 		const builtRelation = this.buildRelationalQueryWithPK({
  // 			fullSchema,
  // 			schema,
  // 			tableNamesMap,
  // 			table: fullSchema[relationTableTsName] as PgTable,
  // 			tableConfig: schema[relationTableTsName]!,
  // 			queryConfig: selectedRelationConfigValue,
  // 			tableAlias: relationTableAlias,
  // 			joinOn,
  // 		});
  // 		const field = sql`case when ${sql.identifier(relationTableAlias)} is null then null else json_build_array(${
  // 			sql.join(
  // 				builtRelation.selection.map(({ field }) =>
  // 					is(field, SQL.Aliased)
  // 						? sql`${sql.identifier(relationTableAlias)}.${sql.identifier(field.fieldAlias)}`
  // 						: is(field, Column)
  // 						? aliasedTableColumn(field, relationTableAlias)
  // 						: field
  // 				),
  // 				sql`, `,
  // 			)
  // 		}) end`.as(selectedRelationTsKey);
  // 		const isLateralJoin = is(builtRelation.sql, SQL);
  // 		joins.push({
  // 			on: isLateralJoin ? sql`true` : joinOn,
  // 			table: is(builtRelation.sql, SQL)
  // 				? new Subquery(builtRelation.sql, {}, relationTableAlias)
  // 				: aliasedTable(builtRelation.sql, relationTableAlias),
  // 			alias: relationTableAlias,
  // 			joinType: 'left',
  // 			lateral: is(builtRelation.sql, SQL),
  // 		});
  // 		selectedRelations.push({
  // 			dbKey: selectedRelationTsKey,
  // 			tsKey: selectedRelationTsKey,
  // 			field,
  // 			relationTableTsKey: relationTableTsName,
  // 			isJson: true,
  // 			selection: builtRelation.selection,
  // 		});
  // 	}
  // 	let distinct: PgSelectConfig['distinct'];
  // 	let tableFrom: PgTable | Subquery = table;
  // 	// Process first Many relation - each one requires a nested subquery
  // 	const manyRelation = manyRelations[0];
  // 	if (manyRelation) {
  // 		const {
  // 			tsKey: selectedRelationTsKey,
  // 			queryConfig: selectedRelationQueryConfig,
  // 			relation,
  // 		} = manyRelation;
  // 		distinct = {
  // 			on: tableConfig.primaryKey.map((c) => aliasedTableColumn(c as PgColumn, tableAlias)),
  // 		};
  // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
  // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
  // 		const relationTableTsName = tableNamesMap[relationTableName]!;
  // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
  // 		const joinOn = and(
  // 			...normalizedRelation.fields.map((field, i) =>
  // 				eq(
  // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
  // 					aliasedTableColumn(field, tableAlias),
  // 				)
  // 			),
  // 		);
  // 		const builtRelationJoin = this.buildRelationalQueryWithPK({
  // 			fullSchema,
  // 			schema,
  // 			tableNamesMap,
  // 			table: fullSchema[relationTableTsName] as PgTable,
  // 			tableConfig: schema[relationTableTsName]!,
  // 			queryConfig: selectedRelationQueryConfig,
  // 			tableAlias: relationTableAlias,
  // 			joinOn,
  // 		});
  // 		const builtRelationSelectionField = sql`case when ${
  // 			sql.identifier(relationTableAlias)
  // 		} is null then '[]' else json_agg(json_build_array(${
  // 			sql.join(
  // 				builtRelationJoin.selection.map(({ field }) =>
  // 					is(field, SQL.Aliased)
  // 						? sql`${sql.identifier(relationTableAlias)}.${sql.identifier(field.fieldAlias)}`
  // 						: is(field, Column)
  // 						? aliasedTableColumn(field, relationTableAlias)
  // 						: field
  // 				),
  // 				sql`, `,
  // 			)
  // 		})) over (partition by ${sql.join(distinct.on, sql`, `)}) end`.as(selectedRelationTsKey);
  // 		const isLateralJoin = is(builtRelationJoin.sql, SQL);
  // 		joins.push({
  // 			on: isLateralJoin ? sql`true` : joinOn,
  // 			table: isLateralJoin
  // 				? new Subquery(builtRelationJoin.sql as SQL, {}, relationTableAlias)
  // 				: aliasedTable(builtRelationJoin.sql as PgTable, relationTableAlias),
  // 			alias: relationTableAlias,
  // 			joinType: 'left',
  // 			lateral: isLateralJoin,
  // 		});
  // 		// Build the "from" subquery with the remaining Many relations
  // 		const builtTableFrom = this.buildRelationalQueryWithPK({
  // 			fullSchema,
  // 			schema,
  // 			tableNamesMap,
  // 			table,
  // 			tableConfig,
  // 			queryConfig: {
  // 				...config,
  // 				where: undefined,
  // 				orderBy: undefined,
  // 				limit: undefined,
  // 				offset: undefined,
  // 				with: manyRelations.slice(1).reduce<NonNullable<typeof config['with']>>(
  // 					(result, { tsKey, queryConfig: configValue }) => {
  // 						result[tsKey] = configValue;
  // 						return result;
  // 					},
  // 					{},
  // 				),
  // 			},
  // 			tableAlias,
  // 		});
  // 		selectedRelations.push({
  // 			dbKey: selectedRelationTsKey,
  // 			tsKey: selectedRelationTsKey,
  // 			field: builtRelationSelectionField,
  // 			relationTableTsKey: relationTableTsName,
  // 			isJson: true,
  // 			selection: builtRelationJoin.selection,
  // 		});
  // 		// selection = builtTableFrom.selection.map((item) =>
  // 		// 	is(item.field, SQL.Aliased)
  // 		// 		? { ...item, field: sql`${sql.identifier(tableAlias)}.${sql.identifier(item.field.fieldAlias)}` }
  // 		// 		: item
  // 		// );
  // 		// selectionForBuild = [{
  // 		// 	dbKey: '*',
  // 		// 	tsKey: '*',
  // 		// 	field: sql`${sql.identifier(tableAlias)}.*`,
  // 		// 	selection: [],
  // 		// 	isJson: false,
  // 		// 	relationTableTsKey: undefined,
  // 		// }];
  // 		// const newSelectionItem: (typeof selection)[number] = {
  // 		// 	dbKey: selectedRelationTsKey,
  // 		// 	tsKey: selectedRelationTsKey,
  // 		// 	field,
  // 		// 	relationTableTsKey: relationTableTsName,
  // 		// 	isJson: true,
  // 		// 	selection: builtRelationJoin.selection,
  // 		// };
  // 		// selection.push(newSelectionItem);
  // 		// selectionForBuild.push(newSelectionItem);
  // 		tableFrom = is(builtTableFrom.sql, PgTable)
  // 			? builtTableFrom.sql
  // 			: new Subquery(builtTableFrom.sql, {}, tableAlias);
  // 	}
  // 	if (selectedColumns.length === 0 && selectedRelations.length === 0 && selectedExtras.length === 0) {
  // 		throw new DrizzleError(`No fields selected for table "${tableConfig.tsName}" ("${tableAlias}")`);
  // 	}
  // 	let selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'];
  // 	function prepareSelectedColumns() {
  // 		return selectedColumns.map((key) => ({
  // 			dbKey: tableConfig.columns[key]!.name,
  // 			tsKey: key,
  // 			field: tableConfig.columns[key] as PgColumn,
  // 			relationTableTsKey: undefined,
  // 			isJson: false,
  // 			selection: [],
  // 		}));
  // 	}
  // 	function prepareSelectedExtras() {
  // 		return selectedExtras.map((item) => ({
  // 			dbKey: item.value.fieldAlias,
  // 			tsKey: item.tsKey,
  // 			field: item.value,
  // 			relationTableTsKey: undefined,
  // 			isJson: false,
  // 			selection: [],
  // 		}));
  // 	}
  // 	if (isRoot) {
  // 		selection = [
  // 			...prepareSelectedColumns(),
  // 			...prepareSelectedExtras(),
  // 		];
  // 	}
  // 	if (hasUserDefinedWhere || orderBy.length > 0) {
  // 		tableFrom = new Subquery(
  // 			this.buildSelectQuery({
  // 				table: is(tableFrom, PgTable) ? aliasedTable(tableFrom, tableAlias) : tableFrom,
  // 				fields: {},
  // 				fieldsFlat: selectionForBuild.map(({ field }) => ({
  // 					path: [],
  // 					field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field,
  // 				})),
  // 				joins,
  // 				distinct,
  // 			}),
  // 			{},
  // 			tableAlias,
  // 		);
  // 		selectionForBuild = selection.map((item) =>
  // 			is(item.field, SQL.Aliased)
  // 				? { ...item, field: sql`${sql.identifier(tableAlias)}.${sql.identifier(item.field.fieldAlias)}` }
  // 				: item
  // 		);
  // 		joins = [];
  // 		distinct = undefined;
  // 	}
  // 	const result = this.buildSelectQuery({
  // 		table: is(tableFrom, PgTable) ? aliasedTable(tableFrom, tableAlias) : tableFrom,
  // 		fields: {},
  // 		fieldsFlat: selectionForBuild.map(({ field }) => ({
  // 			path: [],
  // 			field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field,
  // 		})),
  // 		where,
  // 		limit,
  // 		offset,
  // 		joins,
  // 		orderBy,
  // 		distinct,
  // 	});
  // 	return {
  // 		tableTsKey: tableConfig.tsName,
  // 		sql: result,
  // 		selection,
  // 	};
  // }
  buildRelationalQueryWithoutPK({
    fullSchema,
    schema,
    tableNamesMap,
    table,
    tableConfig,
    queryConfig: config,
    tableAlias,
    nestedQueryRelation,
    joinOn
  }) {
    let selection = [];
    let limit, offset, orderBy = [], where;
    const joins = [];
    if (config === true) {
      const selectionEntries = Object.entries(tableConfig.columns);
      selection = selectionEntries.map(([key, value]) => ({
        dbKey: value.name,
        tsKey: key,
        field: aliasedTableColumn(value, tableAlias),
        relationTableTsKey: void 0,
        isJson: false,
        selection: []
      }));
    } else {
      const aliasedColumns = Object.fromEntries(
        Object.entries(tableConfig.columns).map(([key, value]) => [key, aliasedTableColumn(value, tableAlias)])
      );
      if (config.where) {
        const whereSql = typeof config.where === "function" ? config.where(aliasedColumns, getOperators()) : config.where;
        where = whereSql && mapColumnsInSQLToAlias(whereSql, tableAlias);
      }
      const fieldsSelection = [];
      let selectedColumns = [];
      if (config.columns) {
        let isIncludeMode = false;
        for (const [field, value] of Object.entries(config.columns)) {
          if (value === void 0) {
            continue;
          }
          if (field in tableConfig.columns) {
            if (!isIncludeMode && value === true) {
              isIncludeMode = true;
            }
            selectedColumns.push(field);
          }
        }
        if (selectedColumns.length > 0) {
          selectedColumns = isIncludeMode ? selectedColumns.filter((c) => config.columns?.[c] === true) : Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
        }
      } else {
        selectedColumns = Object.keys(tableConfig.columns);
      }
      for (const field of selectedColumns) {
        const column = tableConfig.columns[field];
        fieldsSelection.push({ tsKey: field, value: column });
      }
      let selectedRelations = [];
      if (config.with) {
        selectedRelations = Object.entries(config.with).filter((entry) => !!entry[1]).map(([tsKey, queryConfig2]) => ({ tsKey, queryConfig: queryConfig2, relation: tableConfig.relations[tsKey] }));
      }
      let extras;
      if (config.extras) {
        extras = typeof config.extras === "function" ? config.extras(aliasedColumns, { sql }) : config.extras;
        for (const [tsKey, value] of Object.entries(extras)) {
          fieldsSelection.push({
            tsKey,
            value: mapColumnsInAliasedSQLToAlias(value, tableAlias)
          });
        }
      }
      for (const { tsKey, value } of fieldsSelection) {
        selection.push({
          dbKey: is2(value, SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey].name,
          tsKey,
          field: is2(value, Column) ? aliasedTableColumn(value, tableAlias) : value,
          relationTableTsKey: void 0,
          isJson: false,
          selection: []
        });
      }
      let orderByOrig = typeof config.orderBy === "function" ? config.orderBy(aliasedColumns, getOrderByOperators()) : config.orderBy ?? [];
      if (!Array.isArray(orderByOrig)) {
        orderByOrig = [orderByOrig];
      }
      orderBy = orderByOrig.map((orderByValue) => {
        if (is2(orderByValue, Column)) {
          return aliasedTableColumn(orderByValue, tableAlias);
        }
        return mapColumnsInSQLToAlias(orderByValue, tableAlias);
      });
      limit = config.limit;
      offset = config.offset;
      for (const {
        tsKey: selectedRelationTsKey,
        queryConfig: selectedRelationConfigValue,
        relation
      } of selectedRelations) {
        const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
        const relationTableName = getTableUniqueName(relation.referencedTable);
        const relationTableTsName = tableNamesMap[relationTableName];
        const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
        const joinOn2 = and(
          ...normalizedRelation.fields.map(
            (field2, i) => eq(
              aliasedTableColumn(normalizedRelation.references[i], relationTableAlias),
              aliasedTableColumn(field2, tableAlias)
            )
          )
        );
        const builtRelation = this.buildRelationalQueryWithoutPK({
          fullSchema,
          schema,
          tableNamesMap,
          table: fullSchema[relationTableTsName],
          tableConfig: schema[relationTableTsName],
          queryConfig: is2(relation, One) ? selectedRelationConfigValue === true ? { limit: 1 } : { ...selectedRelationConfigValue, limit: 1 } : selectedRelationConfigValue,
          tableAlias: relationTableAlias,
          joinOn: joinOn2,
          nestedQueryRelation: relation
        });
        const field = sql`${sql.identifier(relationTableAlias)}.${sql.identifier("data")}`.as(selectedRelationTsKey);
        joins.push({
          on: sql`true`,
          table: new Subquery(builtRelation.sql, {}, relationTableAlias),
          alias: relationTableAlias,
          joinType: "left",
          lateral: true
        });
        selection.push({
          dbKey: selectedRelationTsKey,
          tsKey: selectedRelationTsKey,
          field,
          relationTableTsKey: relationTableTsName,
          isJson: true,
          selection: builtRelation.selection
        });
      }
    }
    if (selection.length === 0) {
      throw new DrizzleError({ message: `No fields selected for table "${tableConfig.tsName}" ("${tableAlias}")` });
    }
    let result;
    where = and(joinOn, where);
    if (nestedQueryRelation) {
      let field = sql`json_build_array(${sql.join(
        selection.map(
          ({ field: field2, tsKey, isJson }) => isJson ? sql`${sql.identifier(`${tableAlias}_${tsKey}`)}.${sql.identifier("data")}` : is2(field2, SQL.Aliased) ? field2.sql : field2
        ),
        sql`, `
      )})`;
      if (is2(nestedQueryRelation, Many)) {
        field = sql`coalesce(json_agg(${field}${orderBy.length > 0 ? sql` order by ${sql.join(orderBy, sql`, `)}` : void 0}), '[]'::json)`;
      }
      const nestedSelection = [{
        dbKey: "data",
        tsKey: "data",
        field: field.as("data"),
        isJson: true,
        relationTableTsKey: tableConfig.tsName,
        selection
      }];
      const needsSubquery = limit !== void 0 || offset !== void 0 || orderBy.length > 0;
      if (needsSubquery) {
        result = this.buildSelectQuery({
          table: aliasedTable(table, tableAlias),
          fields: {},
          fieldsFlat: [{
            path: [],
            field: sql.raw("*")
          }],
          where,
          limit,
          offset,
          orderBy,
          setOperators: []
        });
        where = void 0;
        limit = void 0;
        offset = void 0;
        orderBy = [];
      } else {
        result = aliasedTable(table, tableAlias);
      }
      result = this.buildSelectQuery({
        table: is2(result, PgTable) ? result : new Subquery(result, {}, tableAlias),
        fields: {},
        fieldsFlat: nestedSelection.map(({ field: field2 }) => ({
          path: [],
          field: is2(field2, Column) ? aliasedTableColumn(field2, tableAlias) : field2
        })),
        joins,
        where,
        limit,
        offset,
        orderBy,
        setOperators: []
      });
    } else {
      result = this.buildSelectQuery({
        table: aliasedTable(table, tableAlias),
        fields: {},
        fieldsFlat: selection.map(({ field }) => ({
          path: [],
          field: is2(field, Column) ? aliasedTableColumn(field, tableAlias) : field
        })),
        joins,
        where,
        limit,
        offset,
        orderBy,
        setOperators: []
      });
    }
    return {
      tableTsKey: tableConfig.tsName,
      sql: result,
      selection
    };
  }
};
var TypedQueryBuilder = class {
  static {
    __name(this, "TypedQueryBuilder");
  }
  static {
    __name2(this, "TypedQueryBuilder");
  }
  static [entityKind] = "TypedQueryBuilder";
  /** @internal */
  getSelectedFields() {
    return this._.selectedFields;
  }
};
var PgSelectBuilder = class {
  static {
    __name(this, "PgSelectBuilder");
  }
  static {
    __name2(this, "PgSelectBuilder");
  }
  static [entityKind] = "PgSelectBuilder";
  fields;
  session;
  dialect;
  withList = [];
  distinct;
  constructor(config) {
    this.fields = config.fields;
    this.session = config.session;
    this.dialect = config.dialect;
    if (config.withList) {
      this.withList = config.withList;
    }
    this.distinct = config.distinct;
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  /**
   * Specify the table, subquery, or other target that you're
   * building a select query against.
   *
   * {@link https://www.postgresql.org/docs/current/sql-select.html#SQL-FROM | Postgres from documentation}
   */
  from(source) {
    const isPartialSelect = !!this.fields;
    const src = source;
    let fields;
    if (this.fields) {
      fields = this.fields;
    } else if (is2(src, Subquery)) {
      fields = Object.fromEntries(
        Object.keys(src._.selectedFields).map((key) => [key, src[key]])
      );
    } else if (is2(src, PgViewBase)) {
      fields = src[ViewBaseConfig].selectedFields;
    } else if (is2(src, SQL)) {
      fields = {};
    } else {
      fields = getTableColumns(src);
    }
    return new PgSelectBase({
      table: src,
      fields,
      isPartialSelect,
      session: this.session,
      dialect: this.dialect,
      withList: this.withList,
      distinct: this.distinct
    }).setToken(this.authToken);
  }
};
var PgSelectQueryBuilderBase = class extends TypedQueryBuilder {
  static {
    __name(this, "PgSelectQueryBuilderBase");
  }
  static {
    __name2(this, "PgSelectQueryBuilderBase");
  }
  static [entityKind] = "PgSelectQueryBuilder";
  _;
  config;
  joinsNotNullableMap;
  tableName;
  isPartialSelect;
  session;
  dialect;
  cacheConfig = void 0;
  usedTables = /* @__PURE__ */ new Set();
  constructor({ table, fields, isPartialSelect, session, dialect, withList, distinct }) {
    super();
    this.config = {
      withList,
      table,
      fields: { ...fields },
      distinct,
      setOperators: []
    };
    this.isPartialSelect = isPartialSelect;
    this.session = session;
    this.dialect = dialect;
    this._ = {
      selectedFields: fields,
      config: this.config
    };
    this.tableName = getTableLikeName(table);
    this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
    for (const item of extractUsedTable(table)) this.usedTables.add(item);
  }
  /** @internal */
  getUsedTables() {
    return [...this.usedTables];
  }
  createJoin(joinType, lateral) {
    return (table, on) => {
      const baseTableName = this.tableName;
      const tableName = getTableLikeName(table);
      for (const item of extractUsedTable(table)) this.usedTables.add(item);
      if (typeof tableName === "string" && this.config.joins?.some((join) => join.alias === tableName)) {
        throw new Error(`Alias "${tableName}" is already used in this query`);
      }
      if (!this.isPartialSelect) {
        if (Object.keys(this.joinsNotNullableMap).length === 1 && typeof baseTableName === "string") {
          this.config.fields = {
            [baseTableName]: this.config.fields
          };
        }
        if (typeof tableName === "string" && !is2(table, SQL)) {
          const selection = is2(table, Subquery) ? table._.selectedFields : is2(table, View) ? table[ViewBaseConfig].selectedFields : table[Table.Symbol.Columns];
          this.config.fields[tableName] = selection;
        }
      }
      if (typeof on === "function") {
        on = on(
          new Proxy(
            this.config.fields,
            new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
          )
        );
      }
      if (!this.config.joins) {
        this.config.joins = [];
      }
      this.config.joins.push({ on, table, joinType, alias: tableName, lateral });
      if (typeof tableName === "string") {
        switch (joinType) {
          case "left": {
            this.joinsNotNullableMap[tableName] = false;
            break;
          }
          case "right": {
            this.joinsNotNullableMap = Object.fromEntries(
              Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
            );
            this.joinsNotNullableMap[tableName] = true;
            break;
          }
          case "cross":
          case "inner": {
            this.joinsNotNullableMap[tableName] = true;
            break;
          }
          case "full": {
            this.joinsNotNullableMap = Object.fromEntries(
              Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
            );
            this.joinsNotNullableMap[tableName] = false;
            break;
          }
        }
      }
      return this;
    };
  }
  /**
   * Executes a `left join` operation by adding another table to the current query.
   *
   * Calling this method associates each row of the table with the corresponding row from the joined table, if a match is found. If no matching row exists, it sets all columns of the joined table to null.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#left-join}
   *
   * @param table the table to join.
   * @param on the `on` clause.
   *
   * @example
   *
   * ```ts
   * // Select all users and their pets
   * const usersWithPets: { user: User; pets: Pet | null; }[] = await db.select()
   *   .from(users)
   *   .leftJoin(pets, eq(users.id, pets.ownerId))
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number; petId: number | null; }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .leftJoin(pets, eq(users.id, pets.ownerId))
   * ```
   */
  leftJoin = this.createJoin("left", false);
  /**
   * Executes a `left join lateral` operation by adding subquery to the current query.
   *
   * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
   *
   * Calling this method associates each row of the table with the corresponding row from the joined table, if a match is found. If no matching row exists, it sets all columns of the joined table to null.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#left-join-lateral}
   *
   * @param table the subquery to join.
   * @param on the `on` clause.
   */
  leftJoinLateral = this.createJoin("left", true);
  /**
   * Executes a `right join` operation by adding another table to the current query.
   *
   * Calling this method associates each row of the joined table with the corresponding row from the main table, if a match is found. If no matching row exists, it sets all columns of the main table to null.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#right-join}
   *
   * @param table the table to join.
   * @param on the `on` clause.
   *
   * @example
   *
   * ```ts
   * // Select all users and their pets
   * const usersWithPets: { user: User | null; pets: Pet; }[] = await db.select()
   *   .from(users)
   *   .rightJoin(pets, eq(users.id, pets.ownerId))
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number | null; petId: number; }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .rightJoin(pets, eq(users.id, pets.ownerId))
   * ```
   */
  rightJoin = this.createJoin("right", false);
  /**
   * Executes an `inner join` operation, creating a new table by combining rows from two tables that have matching values.
   *
   * Calling this method retrieves rows that have corresponding entries in both joined tables. Rows without matching entries in either table are excluded, resulting in a table that includes only matching pairs.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#inner-join}
   *
   * @param table the table to join.
   * @param on the `on` clause.
   *
   * @example
   *
   * ```ts
   * // Select all users and their pets
   * const usersWithPets: { user: User; pets: Pet; }[] = await db.select()
   *   .from(users)
   *   .innerJoin(pets, eq(users.id, pets.ownerId))
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number; petId: number; }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .innerJoin(pets, eq(users.id, pets.ownerId))
   * ```
   */
  innerJoin = this.createJoin("inner", false);
  /**
   * Executes an `inner join lateral` operation, creating a new table by combining rows from two queries that have matching values.
   *
   * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
   *
   * Calling this method retrieves rows that have corresponding entries in both joined tables. Rows without matching entries in either table are excluded, resulting in a table that includes only matching pairs.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#inner-join-lateral}
   *
   * @param table the subquery to join.
   * @param on the `on` clause.
   */
  innerJoinLateral = this.createJoin("inner", true);
  /**
   * Executes a `full join` operation by combining rows from two tables into a new table.
   *
   * Calling this method retrieves all rows from both main and joined tables, merging rows with matching values and filling in `null` for non-matching columns.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#full-join}
   *
   * @param table the table to join.
   * @param on the `on` clause.
   *
   * @example
   *
   * ```ts
   * // Select all users and their pets
   * const usersWithPets: { user: User | null; pets: Pet | null; }[] = await db.select()
   *   .from(users)
   *   .fullJoin(pets, eq(users.id, pets.ownerId))
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number | null; petId: number | null; }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .fullJoin(pets, eq(users.id, pets.ownerId))
   * ```
   */
  fullJoin = this.createJoin("full", false);
  /**
   * Executes a `cross join` operation by combining rows from two tables into a new table.
   *
   * Calling this method retrieves all rows from both main and joined tables, merging all rows from each table.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#cross-join}
   *
   * @param table the table to join.
   *
   * @example
   *
   * ```ts
   * // Select all users, each user with every pet
   * const usersWithPets: { user: User; pets: Pet; }[] = await db.select()
   *   .from(users)
   *   .crossJoin(pets)
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number; petId: number; }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .crossJoin(pets)
   * ```
   */
  crossJoin = this.createJoin("cross", false);
  /**
   * Executes a `cross join lateral` operation by combining rows from two queries into a new table.
   *
   * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
   *
   * Calling this method retrieves all rows from both main and joined queries, merging all rows from each query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#cross-join-lateral}
   *
   * @param table the query to join.
   */
  crossJoinLateral = this.createJoin("cross", true);
  createSetOperator(type, isAll) {
    return (rightSelection) => {
      const rightSelect = typeof rightSelection === "function" ? rightSelection(getPgSetOperators()) : rightSelection;
      if (!haveSameKeys(this.getSelectedFields(), rightSelect.getSelectedFields())) {
        throw new Error(
          "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
        );
      }
      this.config.setOperators.push({ type, isAll, rightSelect });
      return this;
    };
  }
  /**
   * Adds `union` set operator to the query.
   *
   * Calling this method will combine the result sets of the `select` statements and remove any duplicate rows that appear across them.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#union}
   *
   * @example
   *
   * ```ts
   * // Select all unique names from customers and users tables
   * await db.select({ name: users.name })
   *   .from(users)
   *   .union(
   *     db.select({ name: customers.name }).from(customers)
   *   );
   * // or
   * import { union } from 'drizzle-orm/pg-core'
   *
   * await union(
   *   db.select({ name: users.name }).from(users),
   *   db.select({ name: customers.name }).from(customers)
   * );
   * ```
   */
  union = this.createSetOperator("union", false);
  /**
   * Adds `union all` set operator to the query.
   *
   * Calling this method will combine the result-set of the `select` statements and keep all duplicate rows that appear across them.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#union-all}
   *
   * @example
   *
   * ```ts
   * // Select all transaction ids from both online and in-store sales
   * await db.select({ transaction: onlineSales.transactionId })
   *   .from(onlineSales)
   *   .unionAll(
   *     db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
   *   );
   * // or
   * import { unionAll } from 'drizzle-orm/pg-core'
   *
   * await unionAll(
   *   db.select({ transaction: onlineSales.transactionId }).from(onlineSales),
   *   db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
   * );
   * ```
   */
  unionAll = this.createSetOperator("union", true);
  /**
   * Adds `intersect` set operator to the query.
   *
   * Calling this method will retain only the rows that are present in both result sets and eliminate duplicates.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#intersect}
   *
   * @example
   *
   * ```ts
   * // Select course names that are offered in both departments A and B
   * await db.select({ courseName: depA.courseName })
   *   .from(depA)
   *   .intersect(
   *     db.select({ courseName: depB.courseName }).from(depB)
   *   );
   * // or
   * import { intersect } from 'drizzle-orm/pg-core'
   *
   * await intersect(
   *   db.select({ courseName: depA.courseName }).from(depA),
   *   db.select({ courseName: depB.courseName }).from(depB)
   * );
   * ```
   */
  intersect = this.createSetOperator("intersect", false);
  /**
   * Adds `intersect all` set operator to the query.
   *
   * Calling this method will retain only the rows that are present in both result sets including all duplicates.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#intersect-all}
   *
   * @example
   *
   * ```ts
   * // Select all products and quantities that are ordered by both regular and VIP customers
   * await db.select({
   *   productId: regularCustomerOrders.productId,
   *   quantityOrdered: regularCustomerOrders.quantityOrdered
   * })
   * .from(regularCustomerOrders)
   * .intersectAll(
   *   db.select({
   *     productId: vipCustomerOrders.productId,
   *     quantityOrdered: vipCustomerOrders.quantityOrdered
   *   })
   *   .from(vipCustomerOrders)
   * );
   * // or
   * import { intersectAll } from 'drizzle-orm/pg-core'
   *
   * await intersectAll(
   *   db.select({
   *     productId: regularCustomerOrders.productId,
   *     quantityOrdered: regularCustomerOrders.quantityOrdered
   *   })
   *   .from(regularCustomerOrders),
   *   db.select({
   *     productId: vipCustomerOrders.productId,
   *     quantityOrdered: vipCustomerOrders.quantityOrdered
   *   })
   *   .from(vipCustomerOrders)
   * );
   * ```
   */
  intersectAll = this.createSetOperator("intersect", true);
  /**
   * Adds `except` set operator to the query.
   *
   * Calling this method will retrieve all unique rows from the left query, except for the rows that are present in the result set of the right query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#except}
   *
   * @example
   *
   * ```ts
   * // Select all courses offered in department A but not in department B
   * await db.select({ courseName: depA.courseName })
   *   .from(depA)
   *   .except(
   *     db.select({ courseName: depB.courseName }).from(depB)
   *   );
   * // or
   * import { except } from 'drizzle-orm/pg-core'
   *
   * await except(
   *   db.select({ courseName: depA.courseName }).from(depA),
   *   db.select({ courseName: depB.courseName }).from(depB)
   * );
   * ```
   */
  except = this.createSetOperator("except", false);
  /**
   * Adds `except all` set operator to the query.
   *
   * Calling this method will retrieve all rows from the left query, except for the rows that are present in the result set of the right query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#except-all}
   *
   * @example
   *
   * ```ts
   * // Select all products that are ordered by regular customers but not by VIP customers
   * await db.select({
   *   productId: regularCustomerOrders.productId,
   *   quantityOrdered: regularCustomerOrders.quantityOrdered,
   * })
   * .from(regularCustomerOrders)
   * .exceptAll(
   *   db.select({
   *     productId: vipCustomerOrders.productId,
   *     quantityOrdered: vipCustomerOrders.quantityOrdered,
   *   })
   *   .from(vipCustomerOrders)
   * );
   * // or
   * import { exceptAll } from 'drizzle-orm/pg-core'
   *
   * await exceptAll(
   *   db.select({
   *     productId: regularCustomerOrders.productId,
   *     quantityOrdered: regularCustomerOrders.quantityOrdered
   *   })
   *   .from(regularCustomerOrders),
   *   db.select({
   *     productId: vipCustomerOrders.productId,
   *     quantityOrdered: vipCustomerOrders.quantityOrdered
   *   })
   *   .from(vipCustomerOrders)
   * );
   * ```
   */
  exceptAll = this.createSetOperator("except", true);
  /** @internal */
  addSetOperators(setOperators) {
    this.config.setOperators.push(...setOperators);
    return this;
  }
  /**
   * Adds a `where` clause to the query.
   *
   * Calling this method will select only those rows that fulfill a specified condition.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#filtering}
   *
   * @param where the `where` clause.
   *
   * @example
   * You can use conditional operators and `sql function` to filter the rows to be selected.
   *
   * ```ts
   * // Select all cars with green color
   * await db.select().from(cars).where(eq(cars.color, 'green'));
   * // or
   * await db.select().from(cars).where(sql`${cars.color} = 'green'`)
   * ```
   *
   * You can logically combine conditional operators with `and()` and `or()` operators:
   *
   * ```ts
   * // Select all BMW cars with a green color
   * await db.select().from(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
   *
   * // Select all cars with the green or blue color
   * await db.select().from(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
   * ```
   */
  where(where) {
    if (typeof where === "function") {
      where = where(
        new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
        )
      );
    }
    this.config.where = where;
    return this;
  }
  /**
   * Adds a `having` clause to the query.
   *
   * Calling this method will select only those rows that fulfill a specified condition. It is typically used with aggregate functions to filter the aggregated data based on a specified condition.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#aggregations}
   *
   * @param having the `having` clause.
   *
   * @example
   *
   * ```ts
   * // Select all brands with more than one car
   * await db.select({
   * 	brand: cars.brand,
   * 	count: sql<number>`cast(count(${cars.id}) as int)`,
   * })
   *   .from(cars)
   *   .groupBy(cars.brand)
   *   .having(({ count }) => gt(count, 1));
   * ```
   */
  having(having) {
    if (typeof having === "function") {
      having = having(
        new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
        )
      );
    }
    this.config.having = having;
    return this;
  }
  groupBy(...columns) {
    if (typeof columns[0] === "function") {
      const groupBy = columns[0](
        new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
        )
      );
      this.config.groupBy = Array.isArray(groupBy) ? groupBy : [groupBy];
    } else {
      this.config.groupBy = columns;
    }
    return this;
  }
  orderBy(...columns) {
    if (typeof columns[0] === "function") {
      const orderBy = columns[0](
        new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
        )
      );
      const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
      if (this.config.setOperators.length > 0) {
        this.config.setOperators.at(-1).orderBy = orderByArray;
      } else {
        this.config.orderBy = orderByArray;
      }
    } else {
      const orderByArray = columns;
      if (this.config.setOperators.length > 0) {
        this.config.setOperators.at(-1).orderBy = orderByArray;
      } else {
        this.config.orderBy = orderByArray;
      }
    }
    return this;
  }
  /**
   * Adds a `limit` clause to the query.
   *
   * Calling this method will set the maximum number of rows that will be returned by this query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
   *
   * @param limit the `limit` clause.
   *
   * @example
   *
   * ```ts
   * // Get the first 10 people from this query.
   * await db.select().from(people).limit(10);
   * ```
   */
  limit(limit) {
    if (this.config.setOperators.length > 0) {
      this.config.setOperators.at(-1).limit = limit;
    } else {
      this.config.limit = limit;
    }
    return this;
  }
  /**
   * Adds an `offset` clause to the query.
   *
   * Calling this method will skip a number of rows when returning results from this query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
   *
   * @param offset the `offset` clause.
   *
   * @example
   *
   * ```ts
   * // Get the 10th-20th people from this query.
   * await db.select().from(people).offset(10).limit(10);
   * ```
   */
  offset(offset) {
    if (this.config.setOperators.length > 0) {
      this.config.setOperators.at(-1).offset = offset;
    } else {
      this.config.offset = offset;
    }
    return this;
  }
  /**
   * Adds a `for` clause to the query.
   *
   * Calling this method will specify a lock strength for this query that controls how strictly it acquires exclusive access to the rows being queried.
   *
   * See docs: {@link https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE}
   *
   * @param strength the lock strength.
   * @param config the lock configuration.
   */
  for(strength, config = {}) {
    this.config.lockingClause = { strength, config };
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildSelectQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  as(alias) {
    const usedTables = [];
    usedTables.push(...extractUsedTable(this.config.table));
    if (this.config.joins) {
      for (const it2 of this.config.joins) usedTables.push(...extractUsedTable(it2.table));
    }
    return new Proxy(
      new Subquery(this.getSQL(), this.config.fields, alias, false, [...new Set(usedTables)]),
      new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
    );
  }
  /** @internal */
  getSelectedFields() {
    return new Proxy(
      this.config.fields,
      new SelectionProxyHandler({ alias: this.tableName, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
    );
  }
  $dynamic() {
    return this;
  }
  $withCache(config) {
    this.cacheConfig = config === void 0 ? { config: {}, enable: true, autoInvalidate: true } : config === false ? { enable: false } : { enable: true, autoInvalidate: true, ...config };
    return this;
  }
};
var PgSelectBase = class extends PgSelectQueryBuilderBase {
  static {
    __name(this, "PgSelectBase");
  }
  static {
    __name2(this, "PgSelectBase");
  }
  static [entityKind] = "PgSelect";
  /** @internal */
  _prepare(name) {
    const { session, config, dialect, joinsNotNullableMap, authToken, cacheConfig, usedTables } = this;
    if (!session) {
      throw new Error("Cannot execute a query on a query builder. Please use a database instance instead.");
    }
    const { fields } = config;
    return tracer.startActiveSpan("drizzle.prepareQuery", () => {
      const fieldsList = orderSelectedFields(fields);
      const query = session.prepareQuery(dialect.sqlToQuery(this.getSQL()), fieldsList, name, true, void 0, {
        type: "select",
        tables: [...usedTables]
      }, cacheConfig);
      query.joinsNotNullableMap = joinsNotNullableMap;
      return query.setToken(authToken);
    });
  }
  /**
   * Create a prepared statement for this query. This allows
   * the database to remember this query for the given session
   * and call it by name, rather than specifying the full query.
   *
   * {@link https://www.postgresql.org/docs/current/sql-prepare.html | Postgres prepare documentation}
   */
  prepare(name) {
    return this._prepare(name);
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  execute = /* @__PURE__ */ __name2((placeholderValues) => {
    return tracer.startActiveSpan("drizzle.operation", () => {
      return this._prepare().execute(placeholderValues, this.authToken);
    });
  }, "execute");
};
applyMixins(PgSelectBase, [QueryPromise]);
function createSetOperator(type, isAll) {
  return (leftSelect, rightSelect, ...restSelects) => {
    const setOperators = [rightSelect, ...restSelects].map((select) => ({
      type,
      isAll,
      rightSelect: select
    }));
    for (const setOperator of setOperators) {
      if (!haveSameKeys(leftSelect.getSelectedFields(), setOperator.rightSelect.getSelectedFields())) {
        throw new Error(
          "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
        );
      }
    }
    return leftSelect.addSetOperators(setOperators);
  };
}
__name(createSetOperator, "createSetOperator");
__name2(createSetOperator, "createSetOperator");
var getPgSetOperators = /* @__PURE__ */ __name2(() => ({
  union,
  unionAll,
  intersect,
  intersectAll,
  except,
  exceptAll
}), "getPgSetOperators");
var union = createSetOperator("union", false);
var unionAll = createSetOperator("union", true);
var intersect = createSetOperator("intersect", false);
var intersectAll = createSetOperator("intersect", true);
var except = createSetOperator("except", false);
var exceptAll = createSetOperator("except", true);
var QueryBuilder = class {
  static {
    __name(this, "QueryBuilder");
  }
  static {
    __name2(this, "QueryBuilder");
  }
  static [entityKind] = "PgQueryBuilder";
  dialect;
  dialectConfig;
  constructor(dialect) {
    this.dialect = is2(dialect, PgDialect) ? dialect : void 0;
    this.dialectConfig = is2(dialect, PgDialect) ? void 0 : dialect;
  }
  $with = /* @__PURE__ */ __name2((alias, selection) => {
    const queryBuilder = this;
    const as2 = /* @__PURE__ */ __name2((qb) => {
      if (typeof qb === "function") {
        qb = qb(queryBuilder);
      }
      return new Proxy(
        new WithSubquery(
          qb.getSQL(),
          selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}),
          alias,
          true
        ),
        new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
      );
    }, "as");
    return { as: as2 };
  }, "$with");
  with(...queries) {
    const self = this;
    function select(fields) {
      return new PgSelectBuilder({
        fields: fields ?? void 0,
        session: void 0,
        dialect: self.getDialect(),
        withList: queries
      });
    }
    __name(select, "select");
    __name2(select, "select");
    function selectDistinct(fields) {
      return new PgSelectBuilder({
        fields: fields ?? void 0,
        session: void 0,
        dialect: self.getDialect(),
        distinct: true
      });
    }
    __name(selectDistinct, "selectDistinct");
    __name2(selectDistinct, "selectDistinct");
    function selectDistinctOn(on, fields) {
      return new PgSelectBuilder({
        fields: fields ?? void 0,
        session: void 0,
        dialect: self.getDialect(),
        distinct: { on }
      });
    }
    __name(selectDistinctOn, "selectDistinctOn");
    __name2(selectDistinctOn, "selectDistinctOn");
    return { select, selectDistinct, selectDistinctOn };
  }
  select(fields) {
    return new PgSelectBuilder({
      fields: fields ?? void 0,
      session: void 0,
      dialect: this.getDialect()
    });
  }
  selectDistinct(fields) {
    return new PgSelectBuilder({
      fields: fields ?? void 0,
      session: void 0,
      dialect: this.getDialect(),
      distinct: true
    });
  }
  selectDistinctOn(on, fields) {
    return new PgSelectBuilder({
      fields: fields ?? void 0,
      session: void 0,
      dialect: this.getDialect(),
      distinct: { on }
    });
  }
  // Lazy load dialect to avoid circular dependency
  getDialect() {
    if (!this.dialect) {
      this.dialect = new PgDialect(this.dialectConfig);
    }
    return this.dialect;
  }
};
function extractUsedTable(table) {
  if (is2(table, PgTable)) {
    return [table[Schema] ? `${table[Schema]}.${table[Table.Symbol.BaseName]}` : table[Table.Symbol.BaseName]];
  }
  if (is2(table, Subquery)) {
    return table._.usedTables ?? [];
  }
  if (is2(table, SQL)) {
    return table.usedTables ?? [];
  }
  return [];
}
__name(extractUsedTable, "extractUsedTable");
__name2(extractUsedTable, "extractUsedTable");
var PgDeleteBase = class extends QueryPromise {
  static {
    __name(this, "PgDeleteBase");
  }
  static {
    __name2(this, "PgDeleteBase");
  }
  constructor(table, session, dialect, withList) {
    super();
    this.session = session;
    this.dialect = dialect;
    this.config = { table, withList };
  }
  static [entityKind] = "PgDelete";
  config;
  cacheConfig;
  /**
   * Adds a `where` clause to the query.
   *
   * Calling this method will delete only those rows that fulfill a specified condition.
   *
   * See docs: {@link https://orm.drizzle.team/docs/delete}
   *
   * @param where the `where` clause.
   *
   * @example
   * You can use conditional operators and `sql function` to filter the rows to be deleted.
   *
   * ```ts
   * // Delete all cars with green color
   * await db.delete(cars).where(eq(cars.color, 'green'));
   * // or
   * await db.delete(cars).where(sql`${cars.color} = 'green'`)
   * ```
   *
   * You can logically combine conditional operators with `and()` and `or()` operators:
   *
   * ```ts
   * // Delete all BMW cars with a green color
   * await db.delete(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
   *
   * // Delete all cars with the green or blue color
   * await db.delete(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
   * ```
   */
  where(where) {
    this.config.where = where;
    return this;
  }
  returning(fields = this.config.table[Table.Symbol.Columns]) {
    this.config.returningFields = fields;
    this.config.returning = orderSelectedFields(fields);
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildDeleteQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  /** @internal */
  _prepare(name) {
    return tracer.startActiveSpan("drizzle.prepareQuery", () => {
      return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
        type: "delete",
        tables: extractUsedTable(this.config.table)
      }, this.cacheConfig);
    });
  }
  prepare(name) {
    return this._prepare(name);
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  execute = /* @__PURE__ */ __name2((placeholderValues) => {
    return tracer.startActiveSpan("drizzle.operation", () => {
      return this._prepare().execute(placeholderValues, this.authToken);
    });
  }, "execute");
  /** @internal */
  getSelectedFields() {
    return this.config.returningFields ? new Proxy(
      this.config.returningFields,
      new SelectionProxyHandler({
        alias: getTableName(this.config.table),
        sqlAliasedBehavior: "alias",
        sqlBehavior: "error"
      })
    ) : void 0;
  }
  $dynamic() {
    return this;
  }
};
var PgInsertBuilder = class {
  static {
    __name(this, "PgInsertBuilder");
  }
  static {
    __name2(this, "PgInsertBuilder");
  }
  constructor(table, session, dialect, withList, overridingSystemValue_) {
    this.table = table;
    this.session = session;
    this.dialect = dialect;
    this.withList = withList;
    this.overridingSystemValue_ = overridingSystemValue_;
  }
  static [entityKind] = "PgInsertBuilder";
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  overridingSystemValue() {
    this.overridingSystemValue_ = true;
    return this;
  }
  values(values) {
    values = Array.isArray(values) ? values : [values];
    if (values.length === 0) {
      throw new Error("values() must be called with at least one value");
    }
    const mappedValues = values.map((entry) => {
      const result = {};
      const cols = this.table[Table.Symbol.Columns];
      for (const colKey of Object.keys(entry)) {
        const colValue = entry[colKey];
        result[colKey] = is2(colValue, SQL) ? colValue : new Param(colValue, cols[colKey]);
      }
      return result;
    });
    return new PgInsertBase(
      this.table,
      mappedValues,
      this.session,
      this.dialect,
      this.withList,
      false,
      this.overridingSystemValue_
    ).setToken(this.authToken);
  }
  select(selectQuery) {
    const select = typeof selectQuery === "function" ? selectQuery(new QueryBuilder()) : selectQuery;
    if (!is2(select, SQL) && !haveSameKeys(this.table[Columns], select._.selectedFields)) {
      throw new Error(
        "Insert select error: selected fields are not the same or are in a different order compared to the table definition"
      );
    }
    return new PgInsertBase(this.table, select, this.session, this.dialect, this.withList, true);
  }
};
var PgInsertBase = class extends QueryPromise {
  static {
    __name(this, "PgInsertBase");
  }
  static {
    __name2(this, "PgInsertBase");
  }
  constructor(table, values, session, dialect, withList, select, overridingSystemValue_) {
    super();
    this.session = session;
    this.dialect = dialect;
    this.config = { table, values, withList, select, overridingSystemValue_ };
  }
  static [entityKind] = "PgInsert";
  config;
  cacheConfig;
  returning(fields = this.config.table[Table.Symbol.Columns]) {
    this.config.returningFields = fields;
    this.config.returning = orderSelectedFields(fields);
    return this;
  }
  /**
   * Adds an `on conflict do nothing` clause to the query.
   *
   * Calling this method simply avoids inserting a row as its alternative action.
   *
   * See docs: {@link https://orm.drizzle.team/docs/insert#on-conflict-do-nothing}
   *
   * @param config The `target` and `where` clauses.
   *
   * @example
   * ```ts
   * // Insert one row and cancel the insert if there's a conflict
   * await db.insert(cars)
   *   .values({ id: 1, brand: 'BMW' })
   *   .onConflictDoNothing();
   *
   * // Explicitly specify conflict target
   * await db.insert(cars)
   *   .values({ id: 1, brand: 'BMW' })
   *   .onConflictDoNothing({ target: cars.id });
   * ```
   */
  onConflictDoNothing(config = {}) {
    if (config.target === void 0) {
      this.config.onConflict = sql`do nothing`;
    } else {
      let targetColumn = "";
      targetColumn = Array.isArray(config.target) ? config.target.map((it2) => this.dialect.escapeName(this.dialect.casing.getColumnCasing(it2))).join(",") : this.dialect.escapeName(this.dialect.casing.getColumnCasing(config.target));
      const whereSql = config.where ? sql` where ${config.where}` : void 0;
      this.config.onConflict = sql`(${sql.raw(targetColumn)})${whereSql} do nothing`;
    }
    return this;
  }
  /**
   * Adds an `on conflict do update` clause to the query.
   *
   * Calling this method will update the existing row that conflicts with the row proposed for insertion as its alternative action.
   *
   * See docs: {@link https://orm.drizzle.team/docs/insert#upserts-and-conflicts}
   *
   * @param config The `target`, `set` and `where` clauses.
   *
   * @example
   * ```ts
   * // Update the row if there's a conflict
   * await db.insert(cars)
   *   .values({ id: 1, brand: 'BMW' })
   *   .onConflictDoUpdate({
   *     target: cars.id,
   *     set: { brand: 'Porsche' }
   *   });
   *
   * // Upsert with 'where' clause
   * await db.insert(cars)
   *   .values({ id: 1, brand: 'BMW' })
   *   .onConflictDoUpdate({
   *     target: cars.id,
   *     set: { brand: 'newBMW' },
   *     targetWhere: sql`${cars.createdAt} > '2023-01-01'::date`,
   *   });
   * ```
   */
  onConflictDoUpdate(config) {
    if (config.where && (config.targetWhere || config.setWhere)) {
      throw new Error(
        'You cannot use both "where" and "targetWhere"/"setWhere" at the same time - "where" is deprecated, use "targetWhere" or "setWhere" instead.'
      );
    }
    const whereSql = config.where ? sql` where ${config.where}` : void 0;
    const targetWhereSql = config.targetWhere ? sql` where ${config.targetWhere}` : void 0;
    const setWhereSql = config.setWhere ? sql` where ${config.setWhere}` : void 0;
    const setSql = this.dialect.buildUpdateSet(this.config.table, mapUpdateSet(this.config.table, config.set));
    let targetColumn = "";
    targetColumn = Array.isArray(config.target) ? config.target.map((it2) => this.dialect.escapeName(this.dialect.casing.getColumnCasing(it2))).join(",") : this.dialect.escapeName(this.dialect.casing.getColumnCasing(config.target));
    this.config.onConflict = sql`(${sql.raw(targetColumn)})${targetWhereSql} do update set ${setSql}${whereSql}${setWhereSql}`;
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildInsertQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  /** @internal */
  _prepare(name) {
    return tracer.startActiveSpan("drizzle.prepareQuery", () => {
      return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
        type: "insert",
        tables: extractUsedTable(this.config.table)
      }, this.cacheConfig);
    });
  }
  prepare(name) {
    return this._prepare(name);
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  execute = /* @__PURE__ */ __name2((placeholderValues) => {
    return tracer.startActiveSpan("drizzle.operation", () => {
      return this._prepare().execute(placeholderValues, this.authToken);
    });
  }, "execute");
  /** @internal */
  getSelectedFields() {
    return this.config.returningFields ? new Proxy(
      this.config.returningFields,
      new SelectionProxyHandler({
        alias: getTableName(this.config.table),
        sqlAliasedBehavior: "alias",
        sqlBehavior: "error"
      })
    ) : void 0;
  }
  $dynamic() {
    return this;
  }
};
var PgRefreshMaterializedView = class extends QueryPromise {
  static {
    __name(this, "PgRefreshMaterializedView");
  }
  static {
    __name2(this, "PgRefreshMaterializedView");
  }
  constructor(view, session, dialect) {
    super();
    this.session = session;
    this.dialect = dialect;
    this.config = { view };
  }
  static [entityKind] = "PgRefreshMaterializedView";
  config;
  concurrently() {
    if (this.config.withNoData !== void 0) {
      throw new Error("Cannot use concurrently and withNoData together");
    }
    this.config.concurrently = true;
    return this;
  }
  withNoData() {
    if (this.config.concurrently !== void 0) {
      throw new Error("Cannot use concurrently and withNoData together");
    }
    this.config.withNoData = true;
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildRefreshMaterializedViewQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  /** @internal */
  _prepare(name) {
    return tracer.startActiveSpan("drizzle.prepareQuery", () => {
      return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), void 0, name, true);
    });
  }
  prepare(name) {
    return this._prepare(name);
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  execute = /* @__PURE__ */ __name2((placeholderValues) => {
    return tracer.startActiveSpan("drizzle.operation", () => {
      return this._prepare().execute(placeholderValues, this.authToken);
    });
  }, "execute");
};
var PgUpdateBuilder = class {
  static {
    __name(this, "PgUpdateBuilder");
  }
  static {
    __name2(this, "PgUpdateBuilder");
  }
  constructor(table, session, dialect, withList) {
    this.table = table;
    this.session = session;
    this.dialect = dialect;
    this.withList = withList;
  }
  static [entityKind] = "PgUpdateBuilder";
  authToken;
  setToken(token) {
    this.authToken = token;
    return this;
  }
  set(values) {
    return new PgUpdateBase(
      this.table,
      mapUpdateSet(this.table, values),
      this.session,
      this.dialect,
      this.withList
    ).setToken(this.authToken);
  }
};
var PgUpdateBase = class extends QueryPromise {
  static {
    __name(this, "PgUpdateBase");
  }
  static {
    __name2(this, "PgUpdateBase");
  }
  constructor(table, set, session, dialect, withList) {
    super();
    this.session = session;
    this.dialect = dialect;
    this.config = { set, table, withList, joins: [] };
    this.tableName = getTableLikeName(table);
    this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
  }
  static [entityKind] = "PgUpdate";
  config;
  tableName;
  joinsNotNullableMap;
  cacheConfig;
  from(source) {
    const src = source;
    const tableName = getTableLikeName(src);
    if (typeof tableName === "string") {
      this.joinsNotNullableMap[tableName] = true;
    }
    this.config.from = src;
    return this;
  }
  getTableLikeFields(table) {
    if (is2(table, PgTable)) {
      return table[Table.Symbol.Columns];
    } else if (is2(table, Subquery)) {
      return table._.selectedFields;
    }
    return table[ViewBaseConfig].selectedFields;
  }
  createJoin(joinType) {
    return (table, on) => {
      const tableName = getTableLikeName(table);
      if (typeof tableName === "string" && this.config.joins.some((join) => join.alias === tableName)) {
        throw new Error(`Alias "${tableName}" is already used in this query`);
      }
      if (typeof on === "function") {
        const from = this.config.from && !is2(this.config.from, SQL) ? this.getTableLikeFields(this.config.from) : void 0;
        on = on(
          new Proxy(
            this.config.table[Table.Symbol.Columns],
            new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
          ),
          from && new Proxy(
            from,
            new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
          )
        );
      }
      this.config.joins.push({ on, table, joinType, alias: tableName });
      if (typeof tableName === "string") {
        switch (joinType) {
          case "left": {
            this.joinsNotNullableMap[tableName] = false;
            break;
          }
          case "right": {
            this.joinsNotNullableMap = Object.fromEntries(
              Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
            );
            this.joinsNotNullableMap[tableName] = true;
            break;
          }
          case "inner": {
            this.joinsNotNullableMap[tableName] = true;
            break;
          }
          case "full": {
            this.joinsNotNullableMap = Object.fromEntries(
              Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
            );
            this.joinsNotNullableMap[tableName] = false;
            break;
          }
        }
      }
      return this;
    };
  }
  leftJoin = this.createJoin("left");
  rightJoin = this.createJoin("right");
  innerJoin = this.createJoin("inner");
  fullJoin = this.createJoin("full");
  /**
   * Adds a 'where' clause to the query.
   *
   * Calling this method will update only those rows that fulfill a specified condition.
   *
   * See docs: {@link https://orm.drizzle.team/docs/update}
   *
   * @param where the 'where' clause.
   *
   * @example
   * You can use conditional operators and `sql function` to filter the rows to be updated.
   *
   * ```ts
   * // Update all cars with green color
   * await db.update(cars).set({ color: 'red' })
   *   .where(eq(cars.color, 'green'));
   * // or
   * await db.update(cars).set({ color: 'red' })
   *   .where(sql`${cars.color} = 'green'`)
   * ```
   *
   * You can logically combine conditional operators with `and()` and `or()` operators:
   *
   * ```ts
   * // Update all BMW cars with a green color
   * await db.update(cars).set({ color: 'red' })
   *   .where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
   *
   * // Update all cars with the green or blue color
   * await db.update(cars).set({ color: 'red' })
   *   .where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
   * ```
   */
  where(where) {
    this.config.where = where;
    return this;
  }
  returning(fields) {
    if (!fields) {
      fields = Object.assign({}, this.config.table[Table.Symbol.Columns]);
      if (this.config.from) {
        const tableName = getTableLikeName(this.config.from);
        if (typeof tableName === "string" && this.config.from && !is2(this.config.from, SQL)) {
          const fromFields = this.getTableLikeFields(this.config.from);
          fields[tableName] = fromFields;
        }
        for (const join of this.config.joins) {
          const tableName2 = getTableLikeName(join.table);
          if (typeof tableName2 === "string" && !is2(join.table, SQL)) {
            const fromFields = this.getTableLikeFields(join.table);
            fields[tableName2] = fromFields;
          }
        }
      }
    }
    this.config.returningFields = fields;
    this.config.returning = orderSelectedFields(fields);
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildUpdateQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  /** @internal */
  _prepare(name) {
    const query = this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
      type: "insert",
      tables: extractUsedTable(this.config.table)
    }, this.cacheConfig);
    query.joinsNotNullableMap = this.joinsNotNullableMap;
    return query;
  }
  prepare(name) {
    return this._prepare(name);
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  execute = /* @__PURE__ */ __name2((placeholderValues) => {
    return this._prepare().execute(placeholderValues, this.authToken);
  }, "execute");
  /** @internal */
  getSelectedFields() {
    return this.config.returningFields ? new Proxy(
      this.config.returningFields,
      new SelectionProxyHandler({
        alias: getTableName(this.config.table),
        sqlAliasedBehavior: "alias",
        sqlBehavior: "error"
      })
    ) : void 0;
  }
  $dynamic() {
    return this;
  }
};
var PgCountBuilder = class _PgCountBuilder extends SQL {
  static {
    __name(this, "_PgCountBuilder");
  }
  static {
    __name2(this, "PgCountBuilder");
  }
  constructor(params) {
    super(_PgCountBuilder.buildEmbeddedCount(params.source, params.filters).queryChunks);
    this.params = params;
    this.mapWith(Number);
    this.session = params.session;
    this.sql = _PgCountBuilder.buildCount(
      params.source,
      params.filters
    );
  }
  sql;
  token;
  static [entityKind] = "PgCountBuilder";
  [Symbol.toStringTag] = "PgCountBuilder";
  session;
  static buildEmbeddedCount(source, filters) {
    return sql`(select count(*) from ${source}${sql.raw(" where ").if(filters)}${filters})`;
  }
  static buildCount(source, filters) {
    return sql`select count(*) as count from ${source}${sql.raw(" where ").if(filters)}${filters};`;
  }
  /** @intrnal */
  setToken(token) {
    this.token = token;
    return this;
  }
  then(onfulfilled, onrejected) {
    return Promise.resolve(this.session.count(this.sql, this.token)).then(
      onfulfilled,
      onrejected
    );
  }
  catch(onRejected) {
    return this.then(void 0, onRejected);
  }
  finally(onFinally) {
    return this.then(
      (value) => {
        onFinally?.();
        return value;
      },
      (reason) => {
        onFinally?.();
        throw reason;
      }
    );
  }
};
var RelationalQueryBuilder = class {
  static {
    __name(this, "RelationalQueryBuilder");
  }
  static {
    __name2(this, "RelationalQueryBuilder");
  }
  constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session) {
    this.fullSchema = fullSchema;
    this.schema = schema;
    this.tableNamesMap = tableNamesMap;
    this.table = table;
    this.tableConfig = tableConfig;
    this.dialect = dialect;
    this.session = session;
  }
  static [entityKind] = "PgRelationalQueryBuilder";
  findMany(config) {
    return new PgRelationalQuery(
      this.fullSchema,
      this.schema,
      this.tableNamesMap,
      this.table,
      this.tableConfig,
      this.dialect,
      this.session,
      config ? config : {},
      "many"
    );
  }
  findFirst(config) {
    return new PgRelationalQuery(
      this.fullSchema,
      this.schema,
      this.tableNamesMap,
      this.table,
      this.tableConfig,
      this.dialect,
      this.session,
      config ? { ...config, limit: 1 } : { limit: 1 },
      "first"
    );
  }
};
var PgRelationalQuery = class extends QueryPromise {
  static {
    __name(this, "PgRelationalQuery");
  }
  static {
    __name2(this, "PgRelationalQuery");
  }
  constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session, config, mode) {
    super();
    this.fullSchema = fullSchema;
    this.schema = schema;
    this.tableNamesMap = tableNamesMap;
    this.table = table;
    this.tableConfig = tableConfig;
    this.dialect = dialect;
    this.session = session;
    this.config = config;
    this.mode = mode;
  }
  static [entityKind] = "PgRelationalQuery";
  /** @internal */
  _prepare(name) {
    return tracer.startActiveSpan("drizzle.prepareQuery", () => {
      const { query, builtQuery } = this._toSQL();
      return this.session.prepareQuery(
        builtQuery,
        void 0,
        name,
        true,
        (rawRows, mapColumnValue) => {
          const rows = rawRows.map(
            (row) => mapRelationalRow(this.schema, this.tableConfig, row, query.selection, mapColumnValue)
          );
          if (this.mode === "first") {
            return rows[0];
          }
          return rows;
        }
      );
    });
  }
  prepare(name) {
    return this._prepare(name);
  }
  _getQuery() {
    return this.dialect.buildRelationalQueryWithoutPK({
      fullSchema: this.fullSchema,
      schema: this.schema,
      tableNamesMap: this.tableNamesMap,
      table: this.table,
      tableConfig: this.tableConfig,
      queryConfig: this.config,
      tableAlias: this.tableConfig.tsName
    });
  }
  /** @internal */
  getSQL() {
    return this._getQuery().sql;
  }
  _toSQL() {
    const query = this._getQuery();
    const builtQuery = this.dialect.sqlToQuery(query.sql);
    return { query, builtQuery };
  }
  toSQL() {
    return this._toSQL().builtQuery;
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  execute() {
    return tracer.startActiveSpan("drizzle.operation", () => {
      return this._prepare().execute(void 0, this.authToken);
    });
  }
};
var PgRaw = class extends QueryPromise {
  static {
    __name(this, "PgRaw");
  }
  static {
    __name2(this, "PgRaw");
  }
  constructor(execute, sql2, query, mapBatchResult) {
    super();
    this.execute = execute;
    this.sql = sql2;
    this.query = query;
    this.mapBatchResult = mapBatchResult;
  }
  static [entityKind] = "PgRaw";
  /** @internal */
  getSQL() {
    return this.sql;
  }
  getQuery() {
    return this.query;
  }
  mapResult(result, isFromBatch) {
    return isFromBatch ? this.mapBatchResult(result) : result;
  }
  _prepare() {
    return this;
  }
  /** @internal */
  isResponseInArrayMode() {
    return false;
  }
};
var PgDatabase = class {
  static {
    __name(this, "PgDatabase");
  }
  static {
    __name2(this, "PgDatabase");
  }
  constructor(dialect, session, schema) {
    this.dialect = dialect;
    this.session = session;
    this._ = schema ? {
      schema: schema.schema,
      fullSchema: schema.fullSchema,
      tableNamesMap: schema.tableNamesMap,
      session
    } : {
      schema: void 0,
      fullSchema: {},
      tableNamesMap: {},
      session
    };
    this.query = {};
    if (this._.schema) {
      for (const [tableName, columns] of Object.entries(this._.schema)) {
        this.query[tableName] = new RelationalQueryBuilder(
          schema.fullSchema,
          this._.schema,
          this._.tableNamesMap,
          schema.fullSchema[tableName],
          columns,
          dialect,
          session
        );
      }
    }
    this.$cache = { invalidate: /* @__PURE__ */ __name2(async (_params) => {
    }, "invalidate") };
  }
  static [entityKind] = "PgDatabase";
  query;
  /**
   * Creates a subquery that defines a temporary named result set as a CTE.
   *
   * It is useful for breaking down complex queries into simpler parts and for reusing the result set in subsequent parts of the query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
   *
   * @param alias The alias for the subquery.
   *
   * Failure to provide an alias will result in a DrizzleTypeError, preventing the subquery from being referenced in other queries.
   *
   * @example
   *
   * ```ts
   * // Create a subquery with alias 'sq' and use it in the select query
   * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
   *
   * const result = await db.with(sq).select().from(sq);
   * ```
   *
   * To select arbitrary SQL values as fields in a CTE and reference them in other CTEs or in the main query, you need to add aliases to them:
   *
   * ```ts
   * // Select an arbitrary SQL value as a field in a CTE and reference it in the main query
   * const sq = db.$with('sq').as(db.select({
   *   name: sql<string>`upper(${users.name})`.as('name'),
   * })
   * .from(users));
   *
   * const result = await db.with(sq).select({ name: sq.name }).from(sq);
   * ```
   */
  $with = /* @__PURE__ */ __name2((alias, selection) => {
    const self = this;
    const as2 = /* @__PURE__ */ __name2((qb) => {
      if (typeof qb === "function") {
        qb = qb(new QueryBuilder(self.dialect));
      }
      return new Proxy(
        new WithSubquery(
          qb.getSQL(),
          selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}),
          alias,
          true
        ),
        new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
      );
    }, "as");
    return { as: as2 };
  }, "$with");
  $count(source, filters) {
    return new PgCountBuilder({ source, filters, session: this.session });
  }
  $cache;
  /**
   * Incorporates a previously defined CTE (using `$with`) into the main query.
   *
   * This method allows the main query to reference a temporary named result set.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
   *
   * @param queries The CTEs to incorporate into the main query.
   *
   * @example
   *
   * ```ts
   * // Define a subquery 'sq' as a CTE using $with
   * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
   *
   * // Incorporate the CTE 'sq' into the main query and select from it
   * const result = await db.with(sq).select().from(sq);
   * ```
   */
  with(...queries) {
    const self = this;
    function select(fields) {
      return new PgSelectBuilder({
        fields: fields ?? void 0,
        session: self.session,
        dialect: self.dialect,
        withList: queries
      });
    }
    __name(select, "select");
    __name2(select, "select");
    function selectDistinct(fields) {
      return new PgSelectBuilder({
        fields: fields ?? void 0,
        session: self.session,
        dialect: self.dialect,
        withList: queries,
        distinct: true
      });
    }
    __name(selectDistinct, "selectDistinct");
    __name2(selectDistinct, "selectDistinct");
    function selectDistinctOn(on, fields) {
      return new PgSelectBuilder({
        fields: fields ?? void 0,
        session: self.session,
        dialect: self.dialect,
        withList: queries,
        distinct: { on }
      });
    }
    __name(selectDistinctOn, "selectDistinctOn");
    __name2(selectDistinctOn, "selectDistinctOn");
    function update(table) {
      return new PgUpdateBuilder(table, self.session, self.dialect, queries);
    }
    __name(update, "update");
    __name2(update, "update");
    function insert(table) {
      return new PgInsertBuilder(table, self.session, self.dialect, queries);
    }
    __name(insert, "insert");
    __name2(insert, "insert");
    function delete_(table) {
      return new PgDeleteBase(table, self.session, self.dialect, queries);
    }
    __name(delete_, "delete_");
    __name2(delete_, "delete_");
    return { select, selectDistinct, selectDistinctOn, update, insert, delete: delete_ };
  }
  select(fields) {
    return new PgSelectBuilder({
      fields: fields ?? void 0,
      session: this.session,
      dialect: this.dialect
    });
  }
  selectDistinct(fields) {
    return new PgSelectBuilder({
      fields: fields ?? void 0,
      session: this.session,
      dialect: this.dialect,
      distinct: true
    });
  }
  selectDistinctOn(on, fields) {
    return new PgSelectBuilder({
      fields: fields ?? void 0,
      session: this.session,
      dialect: this.dialect,
      distinct: { on }
    });
  }
  /**
   * Creates an update query.
   *
   * Calling this method without `.where()` clause will update all rows in a table. The `.where()` clause specifies which rows should be updated.
   *
   * Use `.set()` method to specify which values to update.
   *
   * See docs: {@link https://orm.drizzle.team/docs/update}
   *
   * @param table The table to update.
   *
   * @example
   *
   * ```ts
   * // Update all rows in the 'cars' table
   * await db.update(cars).set({ color: 'red' });
   *
   * // Update rows with filters and conditions
   * await db.update(cars).set({ color: 'red' }).where(eq(cars.brand, 'BMW'));
   *
   * // Update with returning clause
   * const updatedCar: Car[] = await db.update(cars)
   *   .set({ color: 'red' })
   *   .where(eq(cars.id, 1))
   *   .returning();
   * ```
   */
  update(table) {
    return new PgUpdateBuilder(table, this.session, this.dialect);
  }
  /**
   * Creates an insert query.
   *
   * Calling this method will create new rows in a table. Use `.values()` method to specify which values to insert.
   *
   * See docs: {@link https://orm.drizzle.team/docs/insert}
   *
   * @param table The table to insert into.
   *
   * @example
   *
   * ```ts
   * // Insert one row
   * await db.insert(cars).values({ brand: 'BMW' });
   *
   * // Insert multiple rows
   * await db.insert(cars).values([{ brand: 'BMW' }, { brand: 'Porsche' }]);
   *
   * // Insert with returning clause
   * const insertedCar: Car[] = await db.insert(cars)
   *   .values({ brand: 'BMW' })
   *   .returning();
   * ```
   */
  insert(table) {
    return new PgInsertBuilder(table, this.session, this.dialect);
  }
  /**
   * Creates a delete query.
   *
   * Calling this method without `.where()` clause will delete all rows in a table. The `.where()` clause specifies which rows should be deleted.
   *
   * See docs: {@link https://orm.drizzle.team/docs/delete}
   *
   * @param table The table to delete from.
   *
   * @example
   *
   * ```ts
   * // Delete all rows in the 'cars' table
   * await db.delete(cars);
   *
   * // Delete rows with filters and conditions
   * await db.delete(cars).where(eq(cars.color, 'green'));
   *
   * // Delete with returning clause
   * const deletedCar: Car[] = await db.delete(cars)
   *   .where(eq(cars.id, 1))
   *   .returning();
   * ```
   */
  delete(table) {
    return new PgDeleteBase(table, this.session, this.dialect);
  }
  refreshMaterializedView(view) {
    return new PgRefreshMaterializedView(view, this.session, this.dialect);
  }
  authToken;
  execute(query) {
    const sequel = typeof query === "string" ? sql.raw(query) : query.getSQL();
    const builtQuery = this.dialect.sqlToQuery(sequel);
    const prepared = this.session.prepareQuery(
      builtQuery,
      void 0,
      void 0,
      false
    );
    return new PgRaw(
      () => prepared.execute(void 0, this.authToken),
      sequel,
      builtQuery,
      (result) => prepared.mapResult(result, true)
    );
  }
  transaction(transaction, config) {
    return this.session.transaction(transaction, config);
  }
};
var Cache = class {
  static {
    __name(this, "Cache");
  }
  static {
    __name2(this, "Cache");
  }
  static [entityKind] = "Cache";
};
var NoopCache = class extends Cache {
  static {
    __name(this, "NoopCache");
  }
  static {
    __name2(this, "NoopCache");
  }
  strategy() {
    return "all";
  }
  static [entityKind] = "NoopCache";
  async get(_key) {
    return void 0;
  }
  async put(_hashedQuery, _response, _tables, _config) {
  }
  async onMutate(_params) {
  }
};
async function hashQuery(sql2, params) {
  const dataToHash = `${sql2}-${JSON.stringify(params)}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = [...new Uint8Array(hashBuffer)];
  const hashHex = hashArray.map((b2) => b2.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
__name(hashQuery, "hashQuery");
__name2(hashQuery, "hashQuery");
var PgPreparedQuery = class {
  static {
    __name(this, "PgPreparedQuery");
  }
  static {
    __name2(this, "PgPreparedQuery");
  }
  constructor(query, cache2, queryMetadata, cacheConfig) {
    this.query = query;
    this.cache = cache2;
    this.queryMetadata = queryMetadata;
    this.cacheConfig = cacheConfig;
    if (cache2 && cache2.strategy() === "all" && cacheConfig === void 0) {
      this.cacheConfig = { enable: true, autoInvalidate: true };
    }
    if (!this.cacheConfig?.enable) {
      this.cacheConfig = void 0;
    }
  }
  authToken;
  getQuery() {
    return this.query;
  }
  mapResult(response, _isFromBatch) {
    return response;
  }
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  static [entityKind] = "PgPreparedQuery";
  /** @internal */
  joinsNotNullableMap;
  /** @internal */
  async queryWithCache(queryString, params, query) {
    if (this.cache === void 0 || is2(this.cache, NoopCache) || this.queryMetadata === void 0) {
      try {
        return await query();
      } catch (e) {
        throw new DrizzleQueryError(queryString, params, e);
      }
    }
    if (this.cacheConfig && !this.cacheConfig.enable) {
      try {
        return await query();
      } catch (e) {
        throw new DrizzleQueryError(queryString, params, e);
      }
    }
    if ((this.queryMetadata.type === "insert" || this.queryMetadata.type === "update" || this.queryMetadata.type === "delete") && this.queryMetadata.tables.length > 0) {
      try {
        const [res] = await Promise.all([
          query(),
          this.cache.onMutate({ tables: this.queryMetadata.tables })
        ]);
        return res;
      } catch (e) {
        throw new DrizzleQueryError(queryString, params, e);
      }
    }
    if (!this.cacheConfig) {
      try {
        return await query();
      } catch (e) {
        throw new DrizzleQueryError(queryString, params, e);
      }
    }
    if (this.queryMetadata.type === "select") {
      const fromCache = await this.cache.get(
        this.cacheConfig.tag ?? await hashQuery(queryString, params),
        this.queryMetadata.tables,
        this.cacheConfig.tag !== void 0,
        this.cacheConfig.autoInvalidate
      );
      if (fromCache === void 0) {
        let result;
        try {
          result = await query();
        } catch (e) {
          throw new DrizzleQueryError(queryString, params, e);
        }
        await this.cache.put(
          this.cacheConfig.tag ?? await hashQuery(queryString, params),
          result,
          // make sure we send tables that were used in a query only if user wants to invalidate it on each write
          this.cacheConfig.autoInvalidate ? this.queryMetadata.tables : [],
          this.cacheConfig.tag !== void 0,
          this.cacheConfig.config
        );
        return result;
      }
      return fromCache;
    }
    try {
      return await query();
    } catch (e) {
      throw new DrizzleQueryError(queryString, params, e);
    }
  }
};
var PgSession = class {
  static {
    __name(this, "PgSession");
  }
  static {
    __name2(this, "PgSession");
  }
  constructor(dialect) {
    this.dialect = dialect;
  }
  static [entityKind] = "PgSession";
  /** @internal */
  execute(query, token) {
    return tracer.startActiveSpan("drizzle.operation", () => {
      const prepared = tracer.startActiveSpan("drizzle.prepareQuery", () => {
        return this.prepareQuery(
          this.dialect.sqlToQuery(query),
          void 0,
          void 0,
          false
        );
      });
      return prepared.setToken(token).execute(void 0, token);
    });
  }
  all(query) {
    return this.prepareQuery(
      this.dialect.sqlToQuery(query),
      void 0,
      void 0,
      false
    ).all();
  }
  /** @internal */
  async count(sql2, token) {
    const res = await this.execute(sql2, token);
    return Number(
      res[0]["count"]
    );
  }
};
var PgTransaction = class extends PgDatabase {
  static {
    __name(this, "PgTransaction");
  }
  static {
    __name2(this, "PgTransaction");
  }
  constructor(dialect, session, schema, nestedIndex = 0) {
    super(dialect, session, schema);
    this.schema = schema;
    this.nestedIndex = nestedIndex;
  }
  static [entityKind] = "PgTransaction";
  rollback() {
    throw new TransactionRollbackError();
  }
  /** @internal */
  getTransactionConfigSQL(config) {
    const chunks = [];
    if (config.isolationLevel) {
      chunks.push(`isolation level ${config.isolationLevel}`);
    }
    if (config.accessMode) {
      chunks.push(config.accessMode);
    }
    if (typeof config.deferrable === "boolean") {
      chunks.push(config.deferrable ? "deferrable" : "not deferrable");
    }
    return sql.raw(chunks.join(" "));
  }
  setTransaction(config) {
    return this.session.execute(sql`set transaction ${this.getTransactionConfigSQL(config)}`);
  }
};
var rawQueryConfig = {
  arrayMode: false,
  fullResults: true
};
var queryConfig = {
  arrayMode: true,
  fullResults: true
};
var NeonHttpPreparedQuery = class extends PgPreparedQuery {
  static {
    __name(this, "NeonHttpPreparedQuery");
  }
  static {
    __name2(this, "NeonHttpPreparedQuery");
  }
  constructor(client, query, logger, cache2, queryMetadata, cacheConfig, fields, _isResponseInArrayMode, customResultMapper) {
    super(query, cache2, queryMetadata, cacheConfig);
    this.client = client;
    this.logger = logger;
    this.fields = fields;
    this._isResponseInArrayMode = _isResponseInArrayMode;
    this.customResultMapper = customResultMapper;
    this.clientQuery = client.query ?? client;
  }
  static [entityKind] = "NeonHttpPreparedQuery";
  clientQuery;
  /** @internal */
  async execute(placeholderValues = {}, token = this.authToken) {
    const params = fillPlaceholders(this.query.params, placeholderValues);
    this.logger.logQuery(this.query.sql, params);
    const { fields, clientQuery, query, customResultMapper } = this;
    if (!fields && !customResultMapper) {
      return this.queryWithCache(query.sql, params, async () => {
        return clientQuery(
          query.sql,
          params,
          token === void 0 ? rawQueryConfig : {
            ...rawQueryConfig,
            authToken: token
          }
        );
      });
    }
    const result = await this.queryWithCache(query.sql, params, async () => {
      return await clientQuery(
        query.sql,
        params,
        token === void 0 ? queryConfig : {
          ...queryConfig,
          authToken: token
        }
      );
    });
    return this.mapResult(result);
  }
  mapResult(result) {
    if (!this.fields && !this.customResultMapper) {
      return result;
    }
    const rows = result.rows;
    if (this.customResultMapper) {
      return this.customResultMapper(rows);
    }
    return rows.map((row) => mapResultRow(this.fields, row, this.joinsNotNullableMap));
  }
  all(placeholderValues = {}) {
    const params = fillPlaceholders(this.query.params, placeholderValues);
    this.logger.logQuery(this.query.sql, params);
    return this.clientQuery(
      this.query.sql,
      params,
      this.authToken === void 0 ? rawQueryConfig : {
        ...rawQueryConfig,
        authToken: this.authToken
      }
    ).then((result) => result.rows);
  }
  /** @internal */
  values(placeholderValues = {}, token) {
    const params = fillPlaceholders(this.query.params, placeholderValues);
    this.logger.logQuery(this.query.sql, params);
    return this.clientQuery(this.query.sql, params, { arrayMode: true, fullResults: true, authToken: token }).then((result) => result.rows);
  }
  /** @internal */
  isResponseInArrayMode() {
    return this._isResponseInArrayMode;
  }
};
var NeonHttpSession = class extends PgSession {
  static {
    __name(this, "NeonHttpSession");
  }
  static {
    __name2(this, "NeonHttpSession");
  }
  constructor(client, dialect, schema, options = {}) {
    super(dialect);
    this.client = client;
    this.schema = schema;
    this.options = options;
    this.clientQuery = client.query ?? client;
    this.logger = options.logger ?? new NoopLogger();
    this.cache = options.cache ?? new NoopCache();
  }
  static [entityKind] = "NeonHttpSession";
  clientQuery;
  logger;
  cache;
  prepareQuery(query, fields, name, isResponseInArrayMode, customResultMapper, queryMetadata, cacheConfig) {
    return new NeonHttpPreparedQuery(
      this.client,
      query,
      this.logger,
      this.cache,
      queryMetadata,
      cacheConfig,
      fields,
      isResponseInArrayMode,
      customResultMapper
    );
  }
  async batch(queries) {
    const preparedQueries = [];
    const builtQueries = [];
    for (const query of queries) {
      const preparedQuery = query._prepare();
      const builtQuery = preparedQuery.getQuery();
      preparedQueries.push(preparedQuery);
      builtQueries.push(
        this.clientQuery(builtQuery.sql, builtQuery.params, {
          fullResults: true,
          arrayMode: preparedQuery.isResponseInArrayMode()
        })
      );
    }
    const batchResults = await this.client.transaction(builtQueries, queryConfig);
    return batchResults.map((result, i) => preparedQueries[i].mapResult(result, true));
  }
  // change return type to QueryRows<true>
  async query(query, params) {
    this.logger.logQuery(query, params);
    const result = await this.clientQuery(query, params, { arrayMode: true, fullResults: true });
    return result;
  }
  // change return type to QueryRows<false>
  async queryObjects(query, params) {
    return this.clientQuery(query, params, { arrayMode: false, fullResults: true });
  }
  /** @internal */
  async count(sql2, token) {
    const res = await this.execute(sql2, token);
    return Number(
      res["rows"][0]["count"]
    );
  }
  async transaction(_transaction, _config = {}) {
    throw new Error("No transactions support in neon-http driver");
  }
};
var NeonTransaction = class extends PgTransaction {
  static {
    __name(this, "NeonTransaction");
  }
  static {
    __name2(this, "NeonTransaction");
  }
  static [entityKind] = "NeonHttpTransaction";
  async transaction(_transaction) {
    throw new Error("No transactions support in neon-http driver");
  }
};
var NeonHttpDriver = class {
  static {
    __name(this, "NeonHttpDriver");
  }
  static {
    __name2(this, "NeonHttpDriver");
  }
  constructor(client, dialect, options = {}) {
    this.client = client;
    this.dialect = dialect;
    this.options = options;
    this.initMappers();
  }
  static [entityKind] = "NeonHttpDriver";
  createSession(schema) {
    return new NeonHttpSession(this.client, this.dialect, schema, {
      logger: this.options.logger,
      cache: this.options.cache
    });
  }
  initMappers() {
    export_types.setTypeParser(export_types.builtins.TIMESTAMPTZ, (val) => val);
    export_types.setTypeParser(export_types.builtins.TIMESTAMP, (val) => val);
    export_types.setTypeParser(export_types.builtins.DATE, (val) => val);
    export_types.setTypeParser(export_types.builtins.INTERVAL, (val) => val);
    export_types.setTypeParser(1231, (val) => val);
    export_types.setTypeParser(1115, (val) => val);
    export_types.setTypeParser(1185, (val) => val);
    export_types.setTypeParser(1187, (val) => val);
    export_types.setTypeParser(1182, (val) => val);
  }
};
function wrap(target, token, cb, deep) {
  return new Proxy(target, {
    get(target2, p2) {
      const element = target2[p2];
      if (typeof element !== "function" && (typeof element !== "object" || element === null)) return element;
      if (deep) return wrap(element, token, cb);
      if (p2 === "query") return wrap(element, token, cb, true);
      return new Proxy(element, {
        apply(target3, thisArg, argArray) {
          const res = target3.call(thisArg, ...argArray);
          if (typeof res === "object" && res !== null && "setToken" in res && typeof res.setToken === "function") {
            res.setToken(token);
          }
          return cb(target3, p2, res);
        }
      });
    }
  });
}
__name(wrap, "wrap");
__name2(wrap, "wrap");
var NeonHttpDatabase = class extends PgDatabase {
  static {
    __name(this, "NeonHttpDatabase");
  }
  static {
    __name2(this, "NeonHttpDatabase");
  }
  static [entityKind] = "NeonHttpDatabase";
  $withAuth(token) {
    this.authToken = token;
    return wrap(this, token, (target, p2, res) => {
      if (p2 === "with") {
        return wrap(res, token, (_2, __, res2) => res2);
      }
      return res;
    });
  }
  async batch(batch) {
    return this.session.batch(batch);
  }
};
function construct(client, config = {}) {
  const dialect = new PgDialect({ casing: config.casing });
  let logger;
  if (config.logger === true) {
    logger = new DefaultLogger();
  } else if (config.logger !== false) {
    logger = config.logger;
  }
  let schema;
  if (config.schema) {
    const tablesConfig = extractTablesRelationalConfig(
      config.schema,
      createTableRelationsHelpers
    );
    schema = {
      fullSchema: config.schema,
      schema: tablesConfig.tables,
      tableNamesMap: tablesConfig.tableNamesMap
    };
  }
  const driver = new NeonHttpDriver(client, dialect, { logger, cache: config.cache });
  const session = driver.createSession(schema);
  const db = new NeonHttpDatabase(
    dialect,
    session,
    schema
  );
  db.$client = client;
  db.$cache = config.cache;
  if (db.$cache) {
    db.$cache["invalidate"] = config.cache?.onMutate;
  }
  return db;
}
__name(construct, "construct");
__name2(construct, "construct");
function drizzle(...params) {
  if (typeof params[0] === "string") {
    const instance = cs(params[0]);
    return construct(instance, params[1]);
  }
  if (isConfig(params[0])) {
    const { connection, client, ...drizzleConfig } = params[0];
    if (client) return construct(client, drizzleConfig);
    if (typeof connection === "object") {
      const { connectionString, ...options } = connection;
      const instance2 = cs(connectionString, options);
      return construct(instance2, drizzleConfig);
    }
    const instance = cs(connection);
    return construct(instance, drizzleConfig);
  }
  return construct(params[0], params[1]);
}
__name(drizzle, "drizzle");
__name2(drizzle, "drizzle");
((drizzle2) => {
  function mock(config) {
    return construct({}, config);
  }
  __name(mock, "mock");
  __name2(mock, "mock");
  drizzle2.mock = mock;
})(drizzle || (drizzle = {}));
var users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  username: varchar("username", { length: 255 }).unique(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  plan: varchar("plan", { length: 50 }).default("free").notNull(),
  language: varchar("language", { length: 20 }).default("ja").notNull(),
  timezone: varchar("timezone", { length: 100 }).default("Asia/Tokyo").notNull(),
  theme: varchar("theme", { length: 20 }).default("system").notNull(),
  weekStartsOn: integer("week_starts_on").default(0).notNull(),
  // 0: 日曜日, 1: 月曜日
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var projects = pgTable("projects", {
  id: varchar("id", { length: 255 }).primaryKey(),
  // ★ システム内部用の UUID
  shortId: varchar("short_id", { length: 50 }).unique(),
  // ★ 追加: URL表示用の短いID
  ownerId: varchar("owner_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  data: jsonb("data").notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  publicRole: varchar("public_role", { length: 50 }).default("viewer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var projectMembers = pgTable("project_members", {
  projectId: varchar("project_id", { length: 255 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull(),
  invitedAt: timestamp("invited_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.userId] })
}));
var sequences = pgTable("sequences", {
  name: varchar("name", { length: 50 }).primaryKey(),
  value: integer("value").notNull().default(0)
});
var app = new Hono2().basePath("/api");
app.use("*", cors());
app.use("*", clerkMiddleware());
var getDb = /* @__PURE__ */ __name2((databaseUrl) => {
  const sqlClient = cs(databaseUrl);
  return drizzle(sqlClient);
}, "getDb");
var toBase64Url = /* @__PURE__ */ __name2((num) => {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
  if (num === 0) return chars[0];
  let str = "";
  let n = num;
  while (n > 0) {
    str = chars[n % 64] + str;
    n = Math.floor(n / 64);
  }
  return str;
}, "toBase64Url");
app.post("/user/sync", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => ({}));
  const username = body.username || null;
  const db = getDb(c.env.DATABASE_URL);
  try {
    const existingUser = await db.select().from(users).where(eq(users.id, auth.userId));
    if (existingUser.length === 0) {
      await db.insert(users).values({ id: auth.userId, username, plan: "free" });
    } else if (existingUser[0].username !== username) {
      await db.update(users).set({ username }).where(eq(users.id, auth.userId));
    }
    return c.json({ success: true });
  } catch (error) {
    if (error.code === "23505") {
      return c.json({ error: "Username is already taken" }, 400);
    }
    console.error("User sync error:", error);
    return c.json({ error: "Database error" }, 500);
  }
});
app.get("/user/settings", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  const db = getDb(c.env.DATABASE_URL);
  try {
    const userRecord = await db.select().from(users).where(eq(users.id, auth.userId));
    if (userRecord.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }
    const settings = {
      language: userRecord[0].language,
      timezone: userRecord[0].timezone,
      theme: userRecord[0].theme,
      weekStartsOn: userRecord[0].weekStartsOn
    };
    return c.json(settings);
  } catch (error) {
    console.error("Fetch settings error:", error);
    return c.json({ error: "Database error" }, 500);
  }
});
app.put("/user/settings", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);
  try {
    await db.update(users).set({
      language: body.language,
      timezone: body.timezone,
      theme: body.theme,
      weekStartsOn: body.weekStartsOn
    }).where(eq(users.id, auth.userId));
    return c.json({ success: true });
  } catch (error) {
    console.error("Update settings error:", error);
    return c.json({ error: "Database error" }, 500);
  }
});
app.post("/projects", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);
  const { id, shortId, projectName, data, isPublic = false, publicRole = "viewer" } = body;
  const isLocal = String(id).startsWith("local_");
  if (isLocal) {
    const userRecord = await db.select().from(users).where(eq(users.id, auth.userId));
    const limit = userRecord[0]?.plan === "premium" ? 10 : 3;
    const userProjects = await db.select().from(projects).where(eq(projects.ownerId, auth.userId));
    if (userProjects.length >= limit) return c.json({ error: "Plan limit exceeded" }, 403);
    const updateResult = await db.execute(sql`
      INSERT INTO sequences (name, value) VALUES ('projectId', 1)
      ON CONFLICT (name) DO UPDATE SET value = sequences.value + 1
      RETURNING value;
    `);
    const seqValue = Number(updateResult.rows[0].value) - 1;
    const newShortId = toBase64Url(seqValue);
    const newId = crypto.randomUUID();
    await db.insert(projects).values({ id: newId, shortId: newShortId, ownerId: auth.userId, projectName, data, isPublic, publicRole, updatedAt: /* @__PURE__ */ new Date() });
    return c.json({ success: true, newId, shortId: newShortId });
  } else {
    let finalShortId = shortId;
    const existingList = await db.select().from(projects).where(eq(projects.id, id));
    if (existingList.length > 0) {
      const existing = existingList[0];
      finalShortId = existing.shortId;
      let role = "none";
      if (existing.ownerId === auth.userId) {
        role = "owner";
      } else {
        const memberRecord = await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, auth.userId)));
        if (memberRecord.length > 0) {
          role = memberRecord[0].role;
        } else if (existing.isPublic) {
          role = existing.publicRole || "viewer";
        }
      }
      if (role !== "owner" && role !== "admin" && role !== "editor") {
        return c.json({ error: "Forbidden", role }, 403);
      }
      const updateData = { data, updatedAt: /* @__PURE__ */ new Date() };
      if (role === "owner" || role === "admin") {
        if (projectName !== void 0) updateData.projectName = projectName;
        if (body.isPublic !== void 0) updateData.isPublic = body.isPublic;
        if (body.publicRole !== void 0) updateData.publicRole = body.publicRole;
      }
      await db.update(projects).set(updateData).where(eq(projects.id, id));
      return c.json({ success: true, id, shortId: finalShortId, role });
    } else {
      if (!finalShortId) {
        const updateResult = await db.execute(sql`
          INSERT INTO sequences (name, value) VALUES ('projectId', 1)
          ON CONFLICT (name) DO UPDATE SET value = sequences.value + 1
          RETURNING value;
        `);
        finalShortId = toBase64Url(Number(updateResult.rows[0].value) - 1);
      }
      await db.insert(projects).values({ id, shortId: finalShortId, ownerId: auth.userId, projectName, data, isPublic, publicRole, updatedAt: /* @__PURE__ */ new Date() });
      return c.json({ success: true, id, shortId: finalShortId, role: "owner" });
    }
  }
});
app.get("/projects", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  const db = getDb(c.env.DATABASE_URL);
  const userRecord = await db.select().from(users).where(eq(users.id, auth.userId));
  const limit = userRecord[0]?.plan === "premium" ? 10 : 3;
  const userProjects = await db.select().from(projects).where(eq(projects.ownerId, auth.userId));
  return c.json({ projects: userProjects, limit });
});
app.get("/projects/:id", async (c) => {
  const auth = getAuth(c);
  const id = c.req.param("id");
  const db = getDb(c.env.DATABASE_URL);
  const proj = await db.select().from(projects).where(eq(projects.id, id));
  if (proj.length === 0) {
    return c.json({ error: "Project not found" }, 404);
  }
  const project = proj[0];
  let role = "none";
  if (auth?.userId) {
    if (project.ownerId === auth.userId) {
      role = "owner";
    } else {
      const memberRecord = await db.select().from(projectMembers).where(and(
        eq(projectMembers.projectId, project.id),
        eq(projectMembers.userId, auth.userId)
      ));
      if (memberRecord.length > 0) {
        role = memberRecord[0].role;
      }
    }
  }
  if (role === "none") {
    if (project.isPublic) {
      role = project.publicRole || "viewer";
    } else {
      return c.json({ error: "Forbidden" }, 403);
    }
  }
  return c.json({ success: true, project, role });
});
app.delete("/projects/:id", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const db = getDb(c.env.DATABASE_URL);
  const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)));
  if (proj.length === 0) return c.json({ error: "Project not found or unauthorized" }, 404);
  await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
  return c.json({ success: true });
});
app.put("/projects/:id/name", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);
  const proj = await db.select().from(projects).where(eq(projects.id, id));
  if (proj.length === 0) return c.json({ error: "Project not found" }, 404);
  const project = proj[0];
  let role = "none";
  if (project.ownerId === auth.userId) {
    role = "owner";
  } else {
    const memberRecord = await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, auth.userId)));
    if (memberRecord.length > 0) {
      role = memberRecord[0].role;
    }
  }
  if (role !== "owner" && role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!body.projectName) {
    return c.json({ error: "Project name is required" }, 400);
  }
  await db.update(projects).set({ projectName: body.projectName }).where(eq(projects.id, id));
  return c.json({ success: true });
});
app.put("/projects/:id/public", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);
  await db.update(projects).set({ isPublic: body.isPublic }).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)));
  return c.json({ success: true });
});
app.get("/projects/:id/members", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const db = getDb(c.env.DATABASE_URL);
  const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)));
  if (proj.length === 0) return c.json({ error: "Project not found or unauthorized" }, 404);
  const members = await db.select({ id: users.id, username: users.username, role: projectMembers.role }).from(projectMembers).innerJoin(users, eq(projectMembers.userId, users.id)).where(eq(projectMembers.projectId, id));
  return c.json({ members, isPublic: proj[0].isPublic, publicRole: proj[0].publicRole });
});
app.post("/projects/:id/members", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);
  const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)));
  if (proj.length === 0) return c.json({ error: "Project not found or unauthorized" }, 404);
  const targetUser = await db.select().from(users).where(eq(users.username, body.username));
  if (targetUser.length === 0) return c.json({ error: "User not found" }, 404);
  if (targetUser[0].id === auth.userId) return c.json({ error: "Cannot invite yourself" }, 400);
  try {
    await db.insert(projectMembers).values({ projectId: id, userId: targetUser[0].id, role: body.role || "viewer" });
    return c.json({ success: true, member: { id: targetUser[0].id, username: targetUser[0].username, role: body.role || "viewer" } });
  } catch (e) {
    return c.json({ error: "User may already be a member" }, 400);
  }
});
app.put("/projects/:id/members/:memberId", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const memberId = c.req.param("memberId");
  const body = await c.req.json();
  const db = getDb(c.env.DATABASE_URL);
  const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)));
  if (proj.length === 0) return c.json({ error: "Project not found or unauthorized" }, 404);
  await db.update(projectMembers).set({ role: body.role }).where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, memberId)));
  return c.json({ success: true });
});
app.delete("/projects/:id/members/:memberId", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const memberId = c.req.param("memberId");
  const db = getDb(c.env.DATABASE_URL);
  const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)));
  if (proj.length === 0) return c.json({ error: "Project not found or unauthorized" }, 404);
  await db.delete(projectMembers).where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, memberId)));
  return c.json({ success: true });
});
app.get("/projects/shared/:shortId", async (c) => {
  const auth = getAuth(c);
  const shortId = c.req.param("shortId");
  const db = getDb(c.env.DATABASE_URL);
  console.log(`[SharedProject Check] shortId: ${shortId}, userId: ${auth?.userId || "anonymous"}`);
  const proj = await db.select().from(projects).where(eq(projects.shortId, shortId));
  if (proj.length === 0) {
    console.log(`[SharedProject Check] Error: Project not found.`);
    return c.json({ error: "Project not found" }, 404);
  }
  const project = proj[0];
  let role = "none";
  if (auth?.userId) {
    if (project.ownerId === auth.userId) {
      role = "owner";
      console.log(`[SharedProject Check] User is the owner.`);
    } else {
      const memberRecord = await db.select().from(projectMembers).where(and(
        eq(projectMembers.projectId, project.id),
        eq(projectMembers.userId, auth.userId)
      ));
      if (memberRecord.length > 0) {
        role = memberRecord[0].role;
        console.log(`[SharedProject Check] User is a member. Role: ${role}`);
      } else {
        console.log(`[SharedProject Check] User is logged in but not a member of this project.`);
      }
    }
  }
  if (role === "none") {
    if (project.isPublic) {
      role = project.publicRole || "viewer";
      console.log(`[SharedProject Check] Project is public. Granted role: ${role}`);
    } else {
      console.log(`[SharedProject Check] Project is private and user has no access. Forbidden.`);
      return c.json({ error: "Forbidden" }, 403);
    }
  }
  console.log(`[SharedProject Check] Success. Final Role: ${role}`);
  return c.json({ success: true, project, role });
});
var src_default = app;
var onRequest = handle(src_default);
var routes = [
  {
    routePath: "/api/:path*",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char2 = str[i];
    if (char2 === "*" || char2 === "+" || char2 === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char2 === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char2 === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char2 === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char2 === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char2 === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse2(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char3 = delimiter_1[_i];
      if (value2.indexOf(char3) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char2 = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char2 || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char2 || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse2, "parse2");
__name2(parse2, "parse");
function match3(str, options) {
  var keys = [];
  var re = pathToRegexp2(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match3, "match3");
__name2(match3, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x2) {
    return x2;
  } : _a;
  return function(pathname) {
    var m2 = re.exec(pathname);
    if (!m2)
      return false;
    var path = m2[0], index = m2.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m2[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m2[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m2[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m2.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp2(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse2(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x2) {
    return x2;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp2(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp2, "pathToRegexp2");
__name2(pathToRegexp2, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match3(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match3(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match3(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match3(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env2, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env: env2,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-ioGJ7O/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env2, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-ioGJ7O/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
/*! Bundled license information:

@neondatabase/serverless/index.mjs:
  (*! Bundled license information:
  
  ieee754/index.js:
    (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)
  
  buffer/index.js:
    (*!
     * The buffer module from node.js, for the browser.
     *
     * @author   Feross Aboukhadijeh <https://feross.org>
     * @license  MIT
     *)
  *)
*/
//# sourceMappingURL=functionsWorker-0.09370589048579525.js.map
