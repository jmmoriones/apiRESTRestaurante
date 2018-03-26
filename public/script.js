(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],2:[function(require,module,exports){
(function (process){
  /* globals require, module */

  'use strict';

  /**
   * Module dependencies.
   */

  var pathtoRegexp = require('path-to-regexp');

  /**
   * Module exports.
   */

  module.exports = page;
  page.default = page;
  page.Context = Context;
  page.Route = Route;
  page.sameOrigin = sameOrigin;

  /**
   * Short-cuts for global-object checks
   */

  var hasDocument = ('undefined' !== typeof document);
  var hasWindow = ('undefined' !== typeof window);
  var hasHistory = ('undefined' !== typeof history);
  var hasProcess = typeof process !== 'undefined';

  /**
   * Detect click event
   */
  var clickEvent = hasDocument && document.ontouchstart ? 'touchstart' : 'click';

  /**
   * To work properly with the URL
   * history.location generated polyfill in https://github.com/devote/HTML5-History-API
   */

  var isLocation = hasWindow && !!(window.history.location || window.location);

  /**
   * Perform initial dispatch.
   */

  var dispatch = true;


  /**
   * Decode URL components (query string, pathname, hash).
   * Accommodates both regular percent encoding and x-www-form-urlencoded format.
   */
  var decodeURLComponents = true;

  /**
   * Base path.
   */

  var base = '';

  /**
   * Strict path matching.
   */

  var strict = false;

  /**
   * Running flag.
   */

  var running;

  /**
   * HashBang option
   */

  var hashbang = false;

  /**
   * Previous context, for capturing
   * page exit events.
   */

  var prevContext;

  /**
   * The window for which this `page` is running
   */
  var pageWindow;

  /**
   * Register `path` with callback `fn()`,
   * or route `path`, or redirection,
   * or `page.start()`.
   *
   *   page(fn);
   *   page('*', fn);
   *   page('/user/:id', load, user);
   *   page('/user/' + user.id, { some: 'thing' });
   *   page('/user/' + user.id);
   *   page('/from', '/to')
   *   page();
   *
   * @param {string|!Function|!Object} path
   * @param {Function=} fn
   * @api public
   */

  function page(path, fn) {
    // <callback>
    if ('function' === typeof path) {
      return page('*', path);
    }

    // route <path> to <callback ...>
    if ('function' === typeof fn) {
      var route = new Route(/** @type {string} */ (path));
      for (var i = 1; i < arguments.length; ++i) {
        page.callbacks.push(route.middleware(arguments[i]));
      }
      // show <path> with [state]
    } else if ('string' === typeof path) {
      page['string' === typeof fn ? 'redirect' : 'show'](path, fn);
      // start [options]
    } else {
      page.start(path);
    }
  }

  /**
   * Callback functions.
   */

  page.callbacks = [];
  page.exits = [];

  /**
   * Current path being processed
   * @type {string}
   */
  page.current = '';

  /**
   * Number of pages navigated to.
   * @type {number}
   *
   *     page.len == 0;
   *     page('/login');
   *     page.len == 1;
   */

  page.len = 0;

  /**
   * Get or set basepath to `path`.
   *
   * @param {string} path
   * @api public
   */

  page.base = function(path) {
    if (0 === arguments.length) return base;
    base = path;
  };

  /**
   * Get or set strict path matching to `enable`
   *
   * @param {boolean} enable
   * @api public
   */

  page.strict = function(enable) {
    if (0 === arguments.length) return strict;
    strict = enable;
  };

  /**
   * Bind with the given `options`.
   *
   * Options:
   *
   *    - `click` bind to click events [true]
   *    - `popstate` bind to popstate [true]
   *    - `dispatch` perform initial dispatch [true]
   *
   * @param {Object} options
   * @api public
   */

  page.start = function(options) {
    options = options || {};
    if (running) return;
    running = true;
    pageWindow = options.window || (hasWindow && window);
    if (false === options.dispatch) dispatch = false;
    if (false === options.decodeURLComponents) decodeURLComponents = false;
    if (false !== options.popstate && hasWindow) pageWindow.addEventListener('popstate', onpopstate, false);
    if (false !== options.click && hasDocument) {
      pageWindow.document.addEventListener(clickEvent, onclick, false);
    }
    hashbang = !!options.hashbang;
    if(hashbang && hasWindow && !hasHistory) {
      pageWindow.addEventListener('hashchange', onpopstate, false);
    }
    if (!dispatch) return;

    var url;
    if(isLocation) {
      var loc = pageWindow.location;

      if(hashbang && ~loc.hash.indexOf('#!')) {
        url = loc.hash.substr(2) + loc.search;
      } else if (hashbang) {
        url = loc.search + loc.hash;
      } else {
        url = loc.pathname + loc.search + loc.hash;
      }
    }

    page.replace(url, null, true, dispatch);
  };

  /**
   * Unbind click and popstate event handlers.
   *
   * @api public
   */

  page.stop = function() {
    if (!running) return;
    page.current = '';
    page.len = 0;
    running = false;
    hasDocument && pageWindow.document.removeEventListener(clickEvent, onclick, false);
    hasWindow && pageWindow.removeEventListener('popstate', onpopstate, false);
    hasWindow && pageWindow.removeEventListener('hashchange', onpopstate, false);
  };

  /**
   * Show `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} dispatch
   * @param {boolean=} push
   * @return {!Context}
   * @api public
   */

  page.show = function(path, state, dispatch, push) {
    var ctx = new Context(path, state),
      prev = prevContext;
    prevContext = ctx;
    page.current = ctx.path;
    if (false !== dispatch) page.dispatch(ctx, prev);
    if (false !== ctx.handled && false !== push) ctx.pushState();
    return ctx;
  };

  /**
   * Goes back in the history
   * Back should always let the current route push state and then go back.
   *
   * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
   * @param {Object=} state
   * @api public
   */

  page.back = function(path, state) {
    if (page.len > 0) {
      // this may need more testing to see if all browsers
      // wait for the next tick to go back in history
      hasHistory && pageWindow.history.back();
      page.len--;
    } else if (path) {
      setTimeout(function() {
        page.show(path, state);
      });
    }else{
      setTimeout(function() {
        page.show(getBase(), state);
      });
    }
  };


  /**
   * Register route to redirect from one path to other
   * or just redirect to another route
   *
   * @param {string} from - if param 'to' is undefined redirects to 'from'
   * @param {string=} to
   * @api public
   */
  page.redirect = function(from, to) {
    // Define route from a path to another
    if ('string' === typeof from && 'string' === typeof to) {
      page(from, function(e) {
        setTimeout(function() {
          page.replace(/** @type {!string} */ (to));
        }, 0);
      });
    }

    // Wait for the push state and replace it with another
    if ('string' === typeof from && 'undefined' === typeof to) {
      setTimeout(function() {
        page.replace(from);
      }, 0);
    }
  };

  /**
   * Replace `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} init
   * @param {boolean=} dispatch
   * @return {!Context}
   * @api public
   */


  page.replace = function(path, state, init, dispatch) {
    var ctx = new Context(path, state),
      prev = prevContext;
    prevContext = ctx;
    page.current = ctx.path;
    ctx.init = init;
    ctx.save(); // save before dispatching, which may redirect
    if (false !== dispatch) page.dispatch(ctx, prev);
    return ctx;
  };

  /**
   * Dispatch the given `ctx`.
   *
   * @param {Context} ctx
   * @api private
   */

  page.dispatch = function(ctx, prev) {
    var i = 0,
      j = 0;

    function nextExit() {
      var fn = page.exits[j++];
      if (!fn) return nextEnter();
      fn(prev, nextExit);
    }

    function nextEnter() {
      var fn = page.callbacks[i++];

      if (ctx.path !== page.current) {
        ctx.handled = false;
        return;
      }
      if (!fn) return unhandled(ctx);
      fn(ctx, nextEnter);
    }

    if (prev) {
      nextExit();
    } else {
      nextEnter();
    }
  };

  /**
   * Unhandled `ctx`. When it's not the initial
   * popstate then redirect. If you wish to handle
   * 404s on your own use `page('*', callback)`.
   *
   * @param {Context} ctx
   * @api private
   */
  function unhandled(ctx) {
    if (ctx.handled) return;
    var current;

    if (hashbang) {
      current = isLocation && getBase() + pageWindow.location.hash.replace('#!', '');
    } else {
      current = isLocation && pageWindow.location.pathname + pageWindow.location.search;
    }

    if (current === ctx.canonicalPath) return;
    page.stop();
    ctx.handled = false;
    isLocation && (pageWindow.location.href = ctx.canonicalPath);
  }

  /**
   * Register an exit route on `path` with
   * callback `fn()`, which will be called
   * on the previous context when a new
   * page is visited.
   */
  page.exit = function(path, fn) {
    if (typeof path === 'function') {
      return page.exit('*', path);
    }

    var route = new Route(path);
    for (var i = 1; i < arguments.length; ++i) {
      page.exits.push(route.middleware(arguments[i]));
    }
  };

  /**
   * Remove URL encoding from the given `str`.
   * Accommodates whitespace in both x-www-form-urlencoded
   * and regular percent-encoded form.
   *
   * @param {string} val - URL component to decode
   */
  function decodeURLEncodedURIComponent(val) {
    if (typeof val !== 'string') { return val; }
    return decodeURLComponents ? decodeURIComponent(val.replace(/\+/g, ' ')) : val;
  }

  /**
   * Initialize a new "request" `Context`
   * with the given `path` and optional initial `state`.
   *
   * @constructor
   * @param {string} path
   * @param {Object=} state
   * @api public
   */

  function Context(path, state) {
    var pageBase = getBase();
    if ('/' === path[0] && 0 !== path.indexOf(pageBase)) path = pageBase + (hashbang ? '#!' : '') + path;
    var i = path.indexOf('?');

    this.canonicalPath = path;
    this.path = path.replace(pageBase, '') || '/';
    if (hashbang) this.path = this.path.replace('#!', '') || '/';

    this.title = (hasDocument && pageWindow.document.title);
    this.state = state || {};
    this.state.path = path;
    this.querystring = ~i ? decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
    this.pathname = decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);
    this.params = {};

    // fragment
    this.hash = '';
    if (!hashbang) {
      if (!~this.path.indexOf('#')) return;
      var parts = this.path.split('#');
      this.path = this.pathname = parts[0];
      this.hash = decodeURLEncodedURIComponent(parts[1]) || '';
      this.querystring = this.querystring.split('#')[0];
    }
  }

  /**
   * Expose `Context`.
   */

  page.Context = Context;

  /**
   * Push state.
   *
   * @api private
   */

  Context.prototype.pushState = function() {
    page.len++;
    if (hasHistory) {
        pageWindow.history.pushState(this.state, this.title,
          hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
    }
  };

  /**
   * Save the context state.
   *
   * @api public
   */

  Context.prototype.save = function() {
    if (hasHistory && pageWindow.location.protocol !== 'file:') {
        pageWindow.history.replaceState(this.state, this.title,
          hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
    }
  };

  /**
   * Initialize `Route` with the given HTTP `path`,
   * and an array of `callbacks` and `options`.
   *
   * Options:
   *
   *   - `sensitive`    enable case-sensitive routes
   *   - `strict`       enable strict matching for trailing slashes
   *
   * @constructor
   * @param {string} path
   * @param {Object=} options
   * @api private
   */

  function Route(path, options) {
    options = options || {};
    options.strict = options.strict || strict;
    this.path = (path === '*') ? '(.*)' : path;
    this.method = 'GET';
    this.regexp = pathtoRegexp(this.path,
      this.keys = [],
      options);
  }

  /**
   * Expose `Route`.
   */

  page.Route = Route;

  /**
   * Return route middleware with
   * the given callback `fn()`.
   *
   * @param {Function} fn
   * @return {Function}
   * @api public
   */

  Route.prototype.middleware = function(fn) {
    var self = this;
    return function(ctx, next) {
      if (self.match(ctx.path, ctx.params)) return fn(ctx, next);
      next();
    };
  };

  /**
   * Check if this route matches `path`, if so
   * populate `params`.
   *
   * @param {string} path
   * @param {Object} params
   * @return {boolean}
   * @api private
   */

  Route.prototype.match = function(path, params) {
    var keys = this.keys,
      qsIndex = path.indexOf('?'),
      pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
      m = this.regexp.exec(decodeURIComponent(pathname));

    if (!m) return false;

    for (var i = 1, len = m.length; i < len; ++i) {
      var key = keys[i - 1];
      var val = decodeURLEncodedURIComponent(m[i]);
      if (val !== undefined || !(hasOwnProperty.call(params, key.name))) {
        params[key.name] = val;
      }
    }

    return true;
  };


  /**
   * Handle "populate" events.
   */

  var onpopstate = (function () {
    var loaded = false;
    if ( ! hasWindow ) {
      return;
    }
    if (hasDocument && document.readyState === 'complete') {
      loaded = true;
    } else {
      window.addEventListener('load', function() {
        setTimeout(function() {
          loaded = true;
        }, 0);
      });
    }
    return function onpopstate(e) {
      if (!loaded) return;
      if (e.state) {
        var path = e.state.path;
        page.replace(path, e.state);
      } else if (isLocation) {
        var loc = pageWindow.location;
        page.show(loc.pathname + loc.hash, undefined, undefined, false);
      }
    };
  })();
  /**
   * Handle "click" events.
   */

  /* jshint +W054 */
  function onclick(e) {
    if (1 !== which(e)) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;

    // ensure link
    // use shadow dom when available
    var el = e.path ? e.path[0] : e.target;

    // continue ensure link
    // el.nodeName for svg links are 'a' instead of 'A'
    while (el && 'A' !== el.nodeName.toUpperCase()) el = el.parentNode;
    if (!el || 'A' !== el.nodeName.toUpperCase()) return;

    // check if link is inside an svg
    // in this case, both href and target are always inside an object
    var svg = (typeof el.href === 'object') && el.href.constructor.name === 'SVGAnimatedString';

    // Ignore if tag has
    // 1. "download" attribute
    // 2. rel="external" attribute
    if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

    // ensure non-hash for the same path
    var link = el.getAttribute('href');
    if(!hashbang && samePath(el) && (el.hash || '#' === link)) return;

    // Check for mailto: in the href
    if (link && link.indexOf('mailto:') > -1) return;

    // check target
    // svg target is an object and its desired value is in .baseVal property
    if (svg ? el.target.baseVal : el.target) return;

    // x-origin
    // note: svg links that are not relative don't call click events (and skip page.js)
    // consequently, all svg links tested inside page.js are relative and in the same origin
    if (!svg && !sameOrigin(el.href)) return;

    // rebuild path
    // There aren't .pathname and .search properties in svg links, so we use href
    // Also, svg href is an object and its desired value is in .baseVal property
    var path = svg ? el.href.baseVal : (el.pathname + el.search + (el.hash || ''));

    path = path[0] !== '/' ? '/' + path : path;

    // strip leading "/[drive letter]:" on NW.js on Windows
    if (hasProcess && path.match(/^\/[a-zA-Z]:\//)) {
      path = path.replace(/^\/[a-zA-Z]:\//, '/');
    }

    // same page
    var orig = path;
    var pageBase = getBase();

    if (path.indexOf(pageBase) === 0) {
      path = path.substr(base.length);
    }

    if (hashbang) path = path.replace('#!', '');

    if (pageBase && orig === path) return;

    e.preventDefault();
    page.show(orig);
  }

  /**
   * Event button.
   */

  function which(e) {
    e = e || (hasWindow && window.event);
    return null == e.which ? e.button : e.which;
  }

  /**
   * Convert to a URL object
   */
  function toURL(href) {
    if(typeof URL === 'function' && isLocation) {
      return new URL(href, location.toString());
    } else if (hasDocument) {
      var anc = document.createElement('a');
      anc.href = href;
      return anc;
    }
  }

  /**
   * Check if `href` is the same origin.
   */

  function sameOrigin(href) {
    if(!href || !isLocation) return false;
    var url = toURL(href);

    var loc = pageWindow.location;
    return loc.protocol === url.protocol &&
      loc.hostname === url.hostname &&
      loc.port === url.port;
  }

  function samePath(url) {
    if(!isLocation) return false;
    var loc = pageWindow.location;
    return url.pathname === loc.pathname &&
      url.search === loc.search;
  }

  /**
   * Gets the `base`, which depends on whether we are using History or
   * hashbang routing.
   */
  function getBase() {
    if(!!base) return base;
    var loc = hasWindow && pageWindow.location;
    return (hasWindow && hashbang && loc.protocol === 'file:') ? loc.pathname : base;
  }

  page.sameOrigin = sameOrigin;

}).call(this,require('_process'))

},{"_process":4,"path-to-regexp":3}],3:[function(require,module,exports){
var isarray = require('isarray')

/**
 * Expose `pathToRegexp`.
 */
module.exports = pathToRegexp
module.exports.parse = parse
module.exports.compile = compile
module.exports.tokensToFunction = tokensToFunction
module.exports.tokensToRegExp = tokensToRegExp

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
  // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
  '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
].join('|'), 'g')

/**
 * Parse a string for the raw tokens.
 *
 * @param  {String} str
 * @return {Array}
 */
function parse (str) {
  var tokens = []
  var key = 0
  var index = 0
  var path = ''
  var res

  while ((res = PATH_REGEXP.exec(str)) != null) {
    var m = res[0]
    var escaped = res[1]
    var offset = res.index
    path += str.slice(index, offset)
    index = offset + m.length

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1]
      continue
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path)
      path = ''
    }

    var prefix = res[2]
    var name = res[3]
    var capture = res[4]
    var group = res[5]
    var suffix = res[6]
    var asterisk = res[7]

    var repeat = suffix === '+' || suffix === '*'
    var optional = suffix === '?' || suffix === '*'
    var delimiter = prefix || '/'
    var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?')

    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      pattern: escapeGroup(pattern)
    })
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index)
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path)
  }

  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {String}   str
 * @return {Function}
 */
function compile (str) {
  return tokensToFunction(parse(str))
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction (tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length)

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^' + tokens[i].pattern + '$')
    }
  }

  return function (obj) {
    var path = ''
    var data = obj || {}

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i]

      if (typeof token === 'string') {
        path += token

        continue
      }

      var value = data[token.name]
      var segment

      if (value == null) {
        if (token.optional) {
          continue
        } else {
          throw new TypeError('Expected "' + token.name + '" to be defined')
        }
      }

      if (isarray(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but received "' + value + '"')
        }

        if (value.length === 0) {
          if (token.optional) {
            continue
          } else {
            throw new TypeError('Expected "' + token.name + '" to not be empty')
          }
        }

        for (var j = 0; j < value.length; j++) {
          segment = encodeURIComponent(value[j])

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment
        }

        continue
      }

      segment = encodeURIComponent(value)

      if (!matches[i].test(segment)) {
        throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
      }

      path += token.prefix + segment
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {String} str
 * @return {String}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {String} group
 * @return {String}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$\/()])/g, '\\$1')
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {RegExp} re
 * @param  {Array}  keys
 * @return {RegExp}
 */
function attachKeys (re, keys) {
  re.keys = keys
  return re
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {String}
 */
function flags (options) {
  return options.sensitive ? '' : 'i'
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {RegExp} path
 * @param  {Array}  keys
 * @return {RegExp}
 */
function regexpToRegexp (path, keys) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g)

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        pattern: null
      })
    }
  }

  return attachKeys(path, keys)
}

/**
 * Transform an array into a regexp.
 *
 * @param  {Array}  path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = []

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source)
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options))

  return attachKeys(regexp, keys)
}

/**
 * Create a path regexp from string input.
 *
 * @param  {String} path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function stringToRegexp (path, keys, options) {
  var tokens = parse(path)
  var re = tokensToRegExp(tokens, options)

  // Attach keys back to the regexp.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] !== 'string') {
      keys.push(tokens[i])
    }
  }

  return attachKeys(re, keys)
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {Array}  tokens
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function tokensToRegExp (tokens, options) {
  options = options || {}

  var strict = options.strict
  var end = options.end !== false
  var route = ''
  var lastToken = tokens[tokens.length - 1]
  var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken)

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]

    if (typeof token === 'string') {
      route += escapeString(token)
    } else {
      var prefix = escapeString(token.prefix)
      var capture = token.pattern

      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*'
      }

      if (token.optional) {
        if (prefix) {
          capture = '(?:' + prefix + '(' + capture + '))?'
        } else {
          capture = '(' + capture + ')?'
        }
      } else {
        capture = prefix + '(' + capture + ')'
      }

      route += capture
    }
  }

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?'
  }

  if (end) {
    route += '$'
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)'
  }

  return new RegExp('^' + route, flags(options))
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(String|RegExp|Array)} path
 * @param  {Array}                 [keys]
 * @param  {Object}                [options]
 * @return {RegExp}
 */
function pathToRegexp (path, keys, options) {
  keys = keys || []

  if (!isarray(keys)) {
    options = keys
    keys = []
  } else if (!options) {
    options = {}
  }

  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys, options)
  }

  if (isarray(path)) {
    return arrayToRegexp(path, keys, options)
  }

  return stringToRegexp(path, keys, options)
}

},{"isarray":1}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _helpers = require("../helpers");

var _template = require("./template");

var _template2 = _interopRequireDefault(_template);

var _page = require("page");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var mainContent = document.querySelector('#content-main');

var Category = function () {
  function Category() {
    _classCallCheck(this, Category);

    this.editCategory = this.editCategory.bind(this);
    this.save = this.save.bind(this);
    this.addCategory = this.addCategory.bind(this);
  }

  _createClass(Category, [{
    key: "selectAllCategory",
    value: function selectAllCategory() {
      return fetch('http://localhost:4000/categoryAll').then(function (response) {
        return response.json();
      }).then(response);
    }
  }, {
    key: "selectOnCategory",
    value: function selectOnCategory(id) {
      return fetch("http://localhost:4000/selectOneCategory/" + id).then(function (response) {
        return response.json();
      });
    }
  }, {
    key: "save",
    value: function save(e) {
      e.preventDefault();
      var message = _helpers.d.querySelector('#message');
      console.log({
        descripcion: e.target[1].value,
        nom_encargado: e.target[2].value,
        id: e.target[3].value
      });
      console.log(e.target[2].value);
      fetch("http://localhost:4000/editCategory/" + e.target[3].value, {
        method: 'PUT',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          descripcion: document.querySelector('#descripcion').value,
          nom_encargado: e.target[2].value,
          id: e.target[3].value
        })
      }).then(function (response) {
        if (response.statusText === 'OK') {
          message.innerHTML = 'Se ha agregado la categoria';
          message.classList.remove('block-or-not');
          setTimeout(function () {
            message.classList.add('block-or-not');
          }, 5000);
        }
      }).catch(function (msg) {
        return console.log(msg);
      });
    }
  }, {
    key: "addCategory",
    value: function addCategory(e) {
      var windowModal = _helpers.d.querySelector('#windowModal'),
          contentModal = _helpers.d.querySelector('#contentFirst');
      var formulario = "<h2 class=\"text-center\">Agregando categoria</h2>\n      <form id=\"formCategory\" enctype=\"multipart/form-data\">\n        <div class=\"form-group\">\n          <label for=\"nombre\">Nombre</label>\n          <input type=\"text\" class=\"form-control\" id=\"nombre\"  name=\"nombrec\">\n        </div>\n        <div class=\"form-group\">\n          <label for=\"descripcion\">Descripcion</label>\n          <textarea class=\"form-control\" name=\"descripcion\" id=\"descripcion\" rows=\"3\"></textarea>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"nombre\">Nombre</label>\n          <input type=\"text\" class=\"form-control\" id=\"nombre\" name=\"nom_encargado\">\n        </div>\n        <input type=\"submit\" value=\"Enviar\" />\n      </form>\n    ";
      if (e.target.id === 'add-category') {
        windowModal.classList.remove('block-or-not');
        contentModal.insertAdjacentHTML('beforeend', formulario);
        var form = _helpers.d.forms[0];
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          fetch('http://localhost:4000/addCategory', {
            method: 'POST',
            headers: new Headers({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              nombrec: e.target[0].value,
              descripcion: document.querySelector('#descripcion').value,
              nom_encargado: e.target[2].value
            })
          }).then(function (response) {
            if (response.statusText === 'OK') {
              message.innerHTML = 'Se ha agregado la categoria';
              message.classList.remove('block-or-not');
              setTimeout(function () {
                message.classList.add('block-or-not');
              }, 5000);
            }
          }).catch(function (msg) {
            return console.log(msg);
          });
        });
      }
    }
  }, {
    key: "editCategory",
    value: function editCategory(e) {
      var _this = this;

      var closeModal = _helpers.d.querySelector('#closeModal'),
          contentModal = _helpers.d.querySelector('#contentFirst'),
          windowModal = _helpers.d.querySelector('#windowModal');

      var formulario = function formulario(c) {
        return "<h2 class=\"text-center\">Editando categoria</h2>\n      <form id=\"formCategory\" enctype=\"multipart/form-data\">\n        <div class=\"form-group\">\n          <label for=\"nombre\">Nombre</label>\n          <input type=\"text\" class=\"form-control\" id=\"nombre\" placeholder=\"name@example.com\" value=\"" + c.nombrec + "\" disabled>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"descripcion\">Descripcion</label>\n          <textarea class=\"form-control\" name=\"descripcion\" id=\"descripcion\" rows=\"3\">" + c.descripcion + "</textarea>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"encargado\">Nombre encargado</label>\n          <input type=\"text\" name=\"nom_encargado\" class=\"form-control\" id=\"encargado\" placeholder=\"name@example.com\" value=\"" + c.nom_encargado + "\">\n        </div>\n        <input type=\"hidden\" value=\"" + c.id + "\" id=\"id\">\n        <input type=\"submit\" value=\"Enviar\" />\n      </form>";
      };

      //Detecto si es es el boton, para poder abrir el modal
      if (e.target.id === 'edit-category') {
        windowModal.classList.remove('block-or-not');
        var id = e.target.dataset.id;
        //contentModal.insertAdjacentHTML('beforeend', formulario(c))
        this.selectOnCategory(id).then(function (response) {
          console.log(response);
          contentModal.insertAdjacentHTML('beforeend', formulario(response));
          formCategory.addEventListener('submit', _this.save);
        });
      }
      //Cierro el modal
      closeModal.addEventListener('click', function (e) {
        e.preventDefault();
        windowModal.classList.add('block-or-not');
        contentModal.innerHTML = "";
      });
    }
  }, {
    key: "render",
    value: function render() {
      fetch('http://localhost:4000/categoryAll').then(function (response) {
        return response.json();
      }).then(function (category) {
        mainContent.insertAdjacentHTML('beforeend', (0, _template2.default)(category));
      });

      mainContent.addEventListener('click', this.editCategory);
      mainContent.addEventListener('click', this.addCategory);
    }
  }]);

  return Category;
}();

exports.default = Category;

},{"../helpers":11,"./template":6,"page":2}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _layout = require("../layout/");

var _layout2 = _interopRequireDefault(_layout);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (category) {
  var element = "\n  <section class=\"header\">\n    <button class=\"header-add\" id=\"add-category\">Agregar</button>\n  </section>\n  <table class=\"table table-striped table-hover\">\n    <thead>\n      <tr>\n        <th scope=\"col\">Nombre</th>\n        <th scope=\"col\">Descripcion</th>\n        <th scope=\"col\">Encargado</th>\n        <th scope=\"col\"> </th>\n      </tr>\n    </thead>\n    <tbody>\n      " + category.map(function (c) {
    return "<tr>\n      <td>" + c.nombrec + "</td>\n      <td>" + c.descripcion + "</td>\n      <td>" + c.nom_encargado + "</td>\n      <td>\n        <button data-id=\"" + c.id + "\" id=\"edit-category\">Editar</button>\n      </td>\n      </tr>";
  }).join('') + "\n    </tbody>\n  </table>\n  <section id=\"windowModal\" class=\"window-modal block-or-not\">\n    <div class=\"message block-or-not\" id=\"message\"></div>\n    <article id=\"contentModal\" class=\"content-modal\">\n      <a href=\"#\" id=\"closeModal\" class=\"close-modal\"> X </a>\n      <div id=\"contentFirst\"></div>\n    </article>\n  </section>";
  return (0, _layout2.default)(element);
};

},{"../layout/":13}],7:[function(require,module,exports){
"use strict";

},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _helpers = require("../helpers");

var _template = require("./template");

var _template2 = _interopRequireDefault(_template);

var _index = require("../category/index");

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var mainContent = _helpers.d.querySelector('#content-main'),
    category = new _index2.default();

var Dishes = function () {
  function Dishes() {
    _classCallCheck(this, Dishes);

    this.deleteDishes = this.deleteDishes.bind(this);
    this.addDishes = this.addDishes.bind(this);
    this.editDishes = this.editDishes.bind(this);
  }

  _createClass(Dishes, [{
    key: "addDishes",
    value: function addDishes(e) {
      var contentFirst = _helpers.d.querySelector('#contentFirst'),
          windowModal = _helpers.d.querySelector('#windowModal'),
          closeModal = _helpers.d.querySelector("#closeModal");
      var formulario = function formulario(category) {
        return "<h2 class=\"text-center\">Agregando plato</h2>\n      <form id=\"formDishes\" enctype=\"multipart/form-data\">\n        <div class=\"form-group\">\n          <label for=\"nombre-plato\">Nombre</label>\n          <input id=\"nombre-plato\" class=\"form-control\" name=\"nombrep\" type=\"text\" placeholder=\"Platos americanos\">\n        </div>\n        <div class=\"form-group\">\n          <label for=\"nombre-plato\">Nombre</label>\n          <textarea id=\"descripcion-plato\" class=\"form-control\" name=\"descripcion\", rows=\"3\", placeholder=\"Esta receta ....\"></textarea>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"inlineFormCustomSelect\" class=\"mr-sm-2\">Dificultad</label>\n          <select class=\"custom-select mb-2 mr-sm-2 mb-sm-0\" id=\"inlineFormCustomSelect\" name=\"dificultad\">\n            <option selected> - - -</option>\n            <option value=\"1\" name=\"dificultad-1\">1</option>\n            <option value=\"2\" name=\"dificultad-2\">2</option>\n            <option value=\"3\" name=\"dificultad-3\">3</option>\n            <option value=\"4\" name=\"dificultad-4\">4</option>\n            <option value=\"5\" name=\"dificultad-5\">5</option>\n          </select>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"foto-dishes\">Foto</label>\n          <input type=\"file\" id=\"foto-dishes\" class=\"form-control\" name=\"photo\" accept=\"image/*\">\n        </div>\n        <div class=\"form-group\">\n          <label id=\"precio-plato\">Plato</label>\n          <input id=\"precio-plato\" class=\"form-control\" name=\"precio\" type=\"text\", placeholder=\"10.00\">\n        </div>\n        <div class=\"form-group\" name=\"categoria\">\n          <select class=\"form-control\">\n            <option selected>- - -</option>\n            " + category.map(function (c) {
          return "\n              <option value=\"" + c.nombrec + "\">" + c.nombrec + "</option>";
        }) + "\n          </select>\n        </div>\n        <button class=\"btn btn-primary\" type=\"submit\">Guardar</button>\n        <!--<input type=\"submit\" value=\"send\" />-->\n      </form>";
      };
      if (e.target.id === 'add-dishes') {
        windowModal.classList.remove('block-or-not');
        fetch('http://localhost:4000/categoryAll').then(function (response) {
          return response.json();
        }).then(function (category) {
          console.log(category);
          contentFirst.insertAdjacentHTML('beforeend', formulario(category));
          var form = document.getElementById("formDishes");
          form.addEventListener('submit', function (e) {

            var formData = new FormData();
            formData.append('nombrep', e.target[0].value);
            formData.append('descripcion', document.querySelector('#descripcion-plato').value);
            formData.append('dificultad', e.target[2].value);
            formData.append('photo', e.target[3].files[0], 'logo.png');
            formData.append('precio', e.target[4].value);
            formData.append('categoria', e.target[5].value);

            fetch('http://localhost:4000/addDishes', {
              method: 'POST',
              body: formData
            }).then(function (response) {
              (0, _helpers.c)(response);
            });
          });
        });
      }
      closeModal.addEventListener('click', function () {
        contentFirst.innerHTML = "";
        windowModal.classList.add('block-or-not');
      });
    }
  }, {
    key: "selectOneDishe",
    value: function selectOneDishe(id) {
      return fetch("http://localhost:4000/getOneDishe/" + id).then(function (response) {
        return response.json();
      });
    }
  }, {
    key: "editDishes",
    value: function editDishes(e) {
      var contentFirst = _helpers.d.querySelector('#contentFirst'),
          windowModal = _helpers.d.querySelector('#windowModal'),
          closeModal = _helpers.d.querySelector("#closeModal"),
          id = e.target.dataset.id;
      if (e.target.id === 'edit-dishes') {
        windowModal.classList.remove('block-or-not');

        var formulario = function formulario(dishe) {
          return "<h2 class=\"text-center\">Agregando plato</h2>\n      <form id=\"formDishes\" enctype=\"multipart/form-data\">\n        <div class=\"form-group\">\n          <label for=\"nombre-plato\">Nombre</label>\n          <input id=\"nombre-plato\" class=\"form-control\" name=\"nombrep\" type=\"text\" placeholder=\"Platos americanos\" value=\"" + dishe.nombrep + "\">\n        </div>\n        <div class=\"form-group\">\n          <label for=\"nombre-plato\">Nombre</label>\n          <textarea id=\"descripcion-plato\" class=\"form-control\" name=\"descripcion\", rows=\"3\", placeholder=\"Esta receta ....\">" + dishe.descripcion + "</textarea>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"inlineFormCustomSelect\" class=\"mr-sm-2\">Dificultad</label>\n          <select class=\"custom-select mb-2 mr-sm-2 mb-sm-0\" id=\"inlineFormCustomSelect\" name=\"dificultad\">\n            <option value=\"" + dishe.dificultad + "\" selected>" + dishe.dificultad + "</option>\n            <option value=\"1\" name=\"dificultad-1\">1</option>\n            <option value=\"2\" name=\"dificultad-2\">2</option>\n            <option value=\"3\" name=\"dificultad-3\">3</option>\n            <option value=\"4\" name=\"dificultad-4\">4</option>\n            <option value=\"5\" name=\"dificultad-5\">5</option>\n          </select>\n        </div>\n        <div class=\"form-group\">\n          <label for=\"foto-dishes\">Foto</label>\n          <input type=\"file\" id=\"foto-dishes\" class=\"form-control\" name=\"photo\" accept=\"image/*\">\n          <!--<img src=\"images/platos/" + dishe.foto + "\" />-->\n        </div>\n        <div class=\"form-group\">\n          <label id=\"precio-plato\">Plato</label>\n          <input id=\"precio-plato\" class=\"form-control\" name=\"precio\" type=\"text\", placeholder=\"10.00\" value=\"" + dishe.precio + "\">\n        </div>\n        <div class=\"form-group\" name=\"categoria\">\n          <select class=\"form-control\">\n            <option selected>" + dishe.nombrec + "</option>\n          </select>\n        </div>\n        <button class=\"btn btn-primary\" type=\"submit\">Guardar</button>\n        <!--<input type=\"submit\" value=\"send\" />-->\n      </form>";
        };
        this.selectOneDishe(id).then(function (response) {
          contentFirst.insertAdjacentHTML('beforeend', formulario(response[0]));
        });
        /*category.selectAllCategory()
          .then(response => {
            c(response)
          })*/
      }
      closeModal.addEventListener('click', function () {
        contentFirst.innerHTML = "";
        windowModal.classList.add('block-or-not');
      });
    }
  }, {
    key: "deleteDishes",
    value: function deleteDishes(e) {
      if (e.target.id === 'delete-dishes') {
        var id = e.target.attributes[1].nodeValue;
        fetch("http://localhost:4000/deleteDishes/" + id, {
          method: 'DELETE',
          headers: new Headers({ 'Content-Type': 'application/json' })
        }).then(function (response) {
          console.log(response);
          if (response.statusText === 'OK') {
            message.innerHTML = 'Se ha eliminado con exito la categoria';
            message.classList.add('delete');
            message.classList.remove('block-or-not');
            setTimeout(function () {
              message.classList.add('block-or-not');
            }, 5000);
          }
        }).catch(function (mgs) {
          return console.log(mgs);
        });
      }
    }
  }, {
    key: "render",
    value: function render() {
      fetch('http://localhost:4000/dishesAll').then(function (response) {
        return response.json();
      }).then(function (dishes) {
        console.log(dishes);
        mainContent.insertAdjacentHTML('beforeend', (0, _template2.default)(dishes));
      }).catch(function (msg) {
        return console.log(msg);
      });

      mainContent.addEventListener('click', this.deleteDishes);
      mainContent.addEventListener('click', this.addDishes);
      mainContent.addEventListener('click', this.editDishes);
    }
  }]);

  return Dishes;
}();

exports.default = Dishes;

},{"../category/index":5,"../helpers":11,"./template":9}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require("../layout/index");

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (dishes) {
  var el = "\n    <section class=\"header\">\n      <button class=\"header-add btn btn-primary\" id=\"add-dishes\">Agregar</button>\n    </section>\n    <table class=\"table table-striped table-hover\">\n      <thead>\n        <tr>\n          <th scope=\"col\">Nombre</th>\n          <th scope=\"col\">Descripcion</th>\n          <th scope=\"col\">Precio</th>\n          <th scope=\"col\">Dificultad</th>\n          <th scope=\"col\">Foto</th>\n          <th scope=\"col\"> </th>\n          <th scope=\"col\"> </th>\n        </tr>\n      </thead>\n      <tbody>\n        " + dishes.map(function (d) {
    return "<tr>\n        <td>" + d.nombrep + "</td>\n        <td>" + d.descripcion + "</td>\n        <td>" + d.precio + "</td>\n        <td>" + d.dificultad + "</td>\n        <td><img src=\"images/platos/" + d.foto + "\" /></td>\n        <td>\n          <button class=\"btn btn-success\" data-id=\"" + d.id + "\" id=\"edit-dishes\">Editar</button>\n        </td>\n        <td>\n          <button class=\"btn btn-danger\" data-id=\"" + d.id + "\" id=\"delete-dishes\">Eliminar</button>\n        </td>\n        </tr>";
  }).join('') + "\n      </tbody>\n    </table>\n    <section id=\"windowModal\" class=\"window-modal block-or-not\">\n      <div class=\"message block-or-not\" id=\"message\"></div>\n      <article id=\"contentModal\" class=\"content-modal\">\n        <a href=\"#\" id=\"closeModal\" class=\"close-modal\"> X </a>\n        <div id=\"contentFirst\"></div>\n      </article>\n    </section>";
  return (0, _index2.default)(el);
};

},{"../layout/index":13}],10:[function(require,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"dup":7}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var c = console.log,
    d = document;

exports.c = c;
exports.d = d;

},{}],12:[function(require,module,exports){
"use strict";

var _index = require("./category/index");

var _index2 = _interopRequireDefault(_index);

var _index3 = require("./dishes/index");

var _index4 = _interopRequireDefault(_index3);

var _index5 = require("./events/index");

var _index6 = _interopRequireDefault(_index5);

var _index7 = require("./comments/index");

var _index8 = _interopRequireDefault(_index7);

var _page = require("page");

var _page2 = _interopRequireDefault(_page);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var mainContent = document.querySelector('#content-main');

var category = new _index2.default(),
    dishes = new _index4.default();
(0, _page2.default)('/categories', function (ctx, next) {
  mainContent.innerHTML = '';
  category.render();
});
(0, _page2.default)('/dishes', function (ctx, next) {
  mainContent.innerHTML = '';
  dishes.render();
});
(0, _page2.default)();

},{"./category/index":5,"./comments/index":7,"./dishes/index":8,"./events/index":10,"page":2}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (template) {
  return "<div class=\"content\"> " + template + " </div>";
};

},{}]},{},[12])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaXNhcnJheS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wYWdlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3BhZ2Uvbm9kZV9tb2R1bGVzL3BhdGgtdG8tcmVnZXhwL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNyYy9qcy9jYXRlZ29yeS9pbmRleC5qcyIsInNyYy9qcy9jYXRlZ29yeS90ZW1wbGF0ZS5qcyIsInNyYy9qcy9jb21tZW50cy9pbmRleC5qcyIsInNyYy9qcy9kaXNoZXMvaW5kZXguanMiLCJzcmMvanMvZGlzaGVzL3RlbXBsYXRlLmpzIiwic3JjL2pzL2hlbHBlcnMuanMiLCJzcmMvanMvaW5kZXguanMiLCJzcmMvanMvbGF5b3V0L2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7OztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3h0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7QUN4TEE7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUEsSUFBTSxjQUFjLFNBQVMsYUFBVCxDQUF1QixlQUF2QixDQUFwQjs7SUFDcUIsUTtBQUNuQixzQkFBZTtBQUFBOztBQUNiLFNBQUssWUFBTCxHQUFvQixLQUFLLFlBQUwsQ0FBa0IsSUFBbEIsQ0FBdUIsSUFBdkIsQ0FBcEI7QUFDQSxTQUFLLElBQUwsR0FBWSxLQUFLLElBQUwsQ0FBVSxJQUFWLENBQWUsSUFBZixDQUFaO0FBQ0EsU0FBSyxXQUFMLEdBQW1CLEtBQUssV0FBTCxDQUFpQixJQUFqQixDQUFzQixJQUF0QixDQUFuQjtBQUNEOzs7O3dDQUNvQjtBQUNuQixhQUFPLE1BQU0sbUNBQU4sRUFDSixJQURJLENBQ0M7QUFBQSxlQUFZLFNBQVMsSUFBVCxFQUFaO0FBQUEsT0FERCxFQUVKLElBRkksQ0FFQyxRQUZELENBQVA7QUFHRDs7O3FDQUVpQixFLEVBQUk7QUFDcEIsYUFBTyxtREFBaUQsRUFBakQsRUFDSixJQURJLENBQ0M7QUFBQSxlQUFZLFNBQVMsSUFBVCxFQUFaO0FBQUEsT0FERCxDQUFQO0FBRUQ7Ozt5QkFFSyxDLEVBQUc7QUFDUCxRQUFFLGNBQUY7QUFDQSxVQUFNLFVBQVUsV0FBRSxhQUFGLENBQWdCLFVBQWhCLENBQWhCO0FBQ0EsY0FBUSxHQUFSLENBQVk7QUFDVixxQkFBYyxFQUFFLE1BQUYsQ0FBUyxDQUFULEVBQVksS0FEaEI7QUFFVix1QkFBZ0IsRUFBRSxNQUFGLENBQVMsQ0FBVCxFQUFZLEtBRmxCO0FBR1YsWUFBSyxFQUFFLE1BQUYsQ0FBUyxDQUFULEVBQVk7QUFIUCxPQUFaO0FBS0EsY0FBUSxHQUFSLENBQVksRUFBRSxNQUFGLENBQVMsQ0FBVCxFQUFZLEtBQXhCO0FBQ0Esb0RBQTRDLEVBQUUsTUFBRixDQUFTLENBQVQsRUFBWSxLQUF4RCxFQUFnRTtBQUM5RCxnQkFBUSxLQURzRDtBQUU5RCxpQkFBVSxJQUFJLE9BQUosQ0FBWSxFQUFDLGdCQUFnQixrQkFBakIsRUFBWixDQUZvRDtBQUc5RCxjQUFPLEtBQUssU0FBTCxDQUFlO0FBQ3BCLHVCQUFjLFNBQVMsYUFBVCxDQUF1QixjQUF2QixFQUF1QyxLQURqQztBQUVwQix5QkFBZ0IsRUFBRSxNQUFGLENBQVMsQ0FBVCxFQUFZLEtBRlI7QUFHcEIsY0FBSyxFQUFFLE1BQUYsQ0FBUyxDQUFULEVBQVk7QUFIRyxTQUFmO0FBSHVELE9BQWhFLEVBU0csSUFUSCxDQVNRLG9CQUFZO0FBQ2hCLFlBQUksU0FBUyxVQUFULEtBQXdCLElBQTVCLEVBQWtDO0FBQ2hDLGtCQUFRLFNBQVIsR0FBb0IsNkJBQXBCO0FBQ0Esa0JBQVEsU0FBUixDQUFrQixNQUFsQixDQUF5QixjQUF6QjtBQUNBLHFCQUFXLFlBQU07QUFDZixvQkFBUSxTQUFSLENBQWtCLEdBQWxCLENBQXNCLGNBQXRCO0FBQ0QsV0FGRCxFQUVHLElBRkg7QUFHRDtBQUNGLE9BakJILEVBa0JHLEtBbEJILENBa0JTO0FBQUEsZUFBTyxRQUFRLEdBQVIsQ0FBWSxHQUFaLENBQVA7QUFBQSxPQWxCVDtBQW1CRDs7O2dDQUVZLEMsRUFBRztBQUNkLFVBQU0sY0FBYyxXQUFFLGFBQUYsQ0FBZ0IsY0FBaEIsQ0FBcEI7QUFBQSxVQUNFLGVBQWUsV0FBRSxhQUFGLENBQWdCLGVBQWhCLENBRGpCO0FBRUEsVUFBSSxreUJBQUo7QUFpQkEsVUFBSSxFQUFFLE1BQUYsQ0FBUyxFQUFULEtBQWdCLGNBQXBCLEVBQW9DO0FBQ2xDLG9CQUFZLFNBQVosQ0FBc0IsTUFBdEIsQ0FBNkIsY0FBN0I7QUFDQSxxQkFBYSxrQkFBYixDQUFnQyxXQUFoQyxFQUE2QyxVQUE3QztBQUNBLFlBQU0sT0FBTyxXQUFFLEtBQUYsQ0FBUSxDQUFSLENBQWI7QUFDQSxhQUFLLGdCQUFMLENBQXNCLFFBQXRCLEVBQWdDLGFBQUs7QUFDbkMsWUFBRSxjQUFGO0FBQ0EsZ0JBQU0sbUNBQU4sRUFBMEM7QUFDeEMsb0JBQVEsTUFEZ0M7QUFFeEMscUJBQVUsSUFBSSxPQUFKLENBQVksRUFBQyxnQkFBZ0Isa0JBQWpCLEVBQVosQ0FGOEI7QUFHeEMsa0JBQU8sS0FBSyxTQUFMLENBQWU7QUFDcEIsdUJBQVUsRUFBRSxNQUFGLENBQVMsQ0FBVCxFQUFZLEtBREY7QUFFcEIsMkJBQWMsU0FBUyxhQUFULENBQXVCLGNBQXZCLEVBQXVDLEtBRmpDO0FBR3BCLDZCQUFnQixFQUFFLE1BQUYsQ0FBUyxDQUFULEVBQVk7QUFIUixhQUFmO0FBSGlDLFdBQTFDLEVBU0csSUFUSCxDQVNRLG9CQUFZO0FBQ2hCLGdCQUFJLFNBQVMsVUFBVCxLQUF3QixJQUE1QixFQUFrQztBQUNoQyxzQkFBUSxTQUFSLEdBQW9CLDZCQUFwQjtBQUNBLHNCQUFRLFNBQVIsQ0FBa0IsTUFBbEIsQ0FBeUIsY0FBekI7QUFDQSx5QkFBVyxZQUFNO0FBQ2Ysd0JBQVEsU0FBUixDQUFrQixHQUFsQixDQUFzQixjQUF0QjtBQUNELGVBRkQsRUFFRyxJQUZIO0FBR0Q7QUFDRixXQWpCSCxFQWtCRyxLQWxCSCxDQWtCUztBQUFBLG1CQUFPLFFBQVEsR0FBUixDQUFZLEdBQVosQ0FBUDtBQUFBLFdBbEJUO0FBbUJELFNBckJEO0FBc0JEO0FBQ0Y7OztpQ0FFYSxDLEVBQUc7QUFBQTs7QUFDZixVQUFNLGFBQWEsV0FBRSxhQUFGLENBQWdCLGFBQWhCLENBQW5CO0FBQUEsVUFDRSxlQUFlLFdBQUUsYUFBRixDQUFnQixlQUFoQixDQURqQjtBQUFBLFVBRUUsY0FBYyxXQUFFLGFBQUYsQ0FBZ0IsY0FBaEIsQ0FGaEI7O0FBSUEsVUFBSSxhQUFhLFNBQWIsVUFBYSxDQUFDLENBQUQ7QUFBQSwwVUFJaUYsRUFBRSxPQUpuRixrT0FRbUUsRUFBRSxXQVJyRSw2UUFZeUcsRUFBRSxhQVozRyxvRUFjaUIsRUFBRSxFQWRuQjtBQUFBLE9BQWpCOztBQWtCQTtBQUNBLFVBQUcsRUFBRSxNQUFGLENBQVMsRUFBVCxLQUFnQixlQUFuQixFQUFtQztBQUNqQyxvQkFBWSxTQUFaLENBQXNCLE1BQXRCLENBQTZCLGNBQTdCO0FBQ0EsWUFBTSxLQUFLLEVBQUUsTUFBRixDQUFTLE9BQVQsQ0FBaUIsRUFBNUI7QUFDQTtBQUNBLGFBQUssZ0JBQUwsQ0FBc0IsRUFBdEIsRUFDQyxJQURELENBQ00sb0JBQVk7QUFDaEIsa0JBQVEsR0FBUixDQUFZLFFBQVo7QUFDQSx1QkFBYSxrQkFBYixDQUFnQyxXQUFoQyxFQUE2QyxXQUFXLFFBQVgsQ0FBN0M7QUFDQSx1QkFBYSxnQkFBYixDQUE4QixRQUE5QixFQUF3QyxNQUFLLElBQTdDO0FBQ0QsU0FMRDtBQU1EO0FBQ0Q7QUFDQSxpQkFBVyxnQkFBWCxDQUE0QixPQUE1QixFQUFxQyxVQUFDLENBQUQsRUFBTztBQUMxQyxVQUFFLGNBQUY7QUFDQSxvQkFBWSxTQUFaLENBQXNCLEdBQXRCLENBQTBCLGNBQTFCO0FBQ0EscUJBQWEsU0FBYixHQUF5QixFQUF6QjtBQUNELE9BSkQ7QUFLRDs7OzZCQUNTO0FBQ1IsWUFBTSxtQ0FBTixFQUNHLElBREgsQ0FDUTtBQUFBLGVBQVksU0FBUyxJQUFULEVBQVo7QUFBQSxPQURSLEVBRUcsSUFGSCxDQUVRLG9CQUFZO0FBQ2hCLG9CQUFZLGtCQUFaLENBQStCLFdBQS9CLEVBQTRDLHdCQUFTLFFBQVQsQ0FBNUM7QUFDRCxPQUpIOztBQU1BLGtCQUFZLGdCQUFaLENBQTZCLE9BQTdCLEVBQXNDLEtBQUssWUFBM0M7QUFDQSxrQkFBWSxnQkFBWixDQUE2QixPQUE3QixFQUFzQyxLQUFLLFdBQTNDO0FBQ0Q7Ozs7OztrQkFuSmtCLFE7Ozs7Ozs7OztBQ0xyQjs7Ozs7O2tCQUNlLFVBQUMsUUFBRCxFQUFjO0FBQzNCLE1BQUksK1pBY0UsU0FBUyxHQUFULENBQWE7QUFBQSxnQ0FDVCxFQUFFLE9BRE8seUJBRVQsRUFBRSxXQUZPLHlCQUdULEVBQUUsYUFITyxxREFLTSxFQUFFLEVBTFI7QUFBQSxHQUFiLEVBT00sSUFQTixDQU9XLEVBUFgsQ0FkRix1V0FBSjtBQStCQSxTQUFPLHNCQUFPLE9BQVAsQ0FBUDtBQUNELEM7OztBQ2xDRDtBQUNBOzs7Ozs7Ozs7O0FDREE7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7QUFFQSxJQUFNLGNBQWMsV0FBRSxhQUFGLENBQWdCLGVBQWhCLENBQXBCO0FBQUEsSUFDRSxXQUFXLHFCQURiOztJQUdxQixNO0FBQ25CLG9CQUFlO0FBQUE7O0FBQ2IsU0FBSyxZQUFMLEdBQW9CLEtBQUssWUFBTCxDQUFrQixJQUFsQixDQUF1QixJQUF2QixDQUFwQjtBQUNBLFNBQUssU0FBTCxHQUFpQixLQUFLLFNBQUwsQ0FBZSxJQUFmLENBQW9CLElBQXBCLENBQWpCO0FBQ0EsU0FBSyxVQUFMLEdBQWtCLEtBQUssVUFBTCxDQUFnQixJQUFoQixDQUFxQixJQUFyQixDQUFsQjtBQUNEOzs7OzhCQUVVLEMsRUFBRztBQUNaLFVBQU0sZUFBZSxXQUFFLGFBQUYsQ0FBZ0IsZUFBaEIsQ0FBckI7QUFBQSxVQUNFLGNBQWMsV0FBRSxhQUFGLENBQWdCLGNBQWhCLENBRGhCO0FBQUEsVUFFRSxhQUFhLFdBQUUsYUFBRixDQUFnQixhQUFoQixDQUZmO0FBR0EsVUFBSSxhQUFhLFNBQWIsVUFBYSxDQUFDLFFBQUQ7QUFBQSwrekRBZ0NQLFNBQVMsR0FBVCxDQUFhO0FBQUEsc0RBQ0ksRUFBRSxPQUROLFdBQ2tCLEVBQUUsT0FEcEI7QUFBQSxTQUFiLENBaENPO0FBQUEsT0FBakI7QUF3Q0EsVUFBSSxFQUFFLE1BQUYsQ0FBUyxFQUFULEtBQWdCLFlBQXBCLEVBQWtDO0FBQ2hDLG9CQUFZLFNBQVosQ0FBc0IsTUFBdEIsQ0FBNkIsY0FBN0I7QUFDQSxjQUFNLG1DQUFOLEVBQ0csSUFESCxDQUNRO0FBQUEsaUJBQVksU0FBUyxJQUFULEVBQVo7QUFBQSxTQURSLEVBRUcsSUFGSCxDQUVRLG9CQUFZO0FBQ2hCLGtCQUFRLEdBQVIsQ0FBWSxRQUFaO0FBQ0EsdUJBQWEsa0JBQWIsQ0FBZ0MsV0FBaEMsRUFBNkMsV0FBVyxRQUFYLENBQTdDO0FBQ0EsY0FBTSxPQUFPLFNBQVMsY0FBVCxDQUF3QixZQUF4QixDQUFiO0FBQ0EsZUFBSyxnQkFBTCxDQUFzQixRQUF0QixFQUFnQyxhQUFLOztBQUVuQyxnQkFBTSxXQUFXLElBQUksUUFBSixFQUFqQjtBQUNBLHFCQUFTLE1BQVQsQ0FBZ0IsU0FBaEIsRUFBMkIsRUFBRSxNQUFGLENBQVMsQ0FBVCxFQUFZLEtBQXZDO0FBQ0EscUJBQVMsTUFBVCxDQUFnQixhQUFoQixFQUErQixTQUFTLGFBQVQsQ0FBdUIsb0JBQXZCLEVBQTZDLEtBQTVFO0FBQ0EscUJBQVMsTUFBVCxDQUFnQixZQUFoQixFQUE4QixFQUFFLE1BQUYsQ0FBUyxDQUFULEVBQVksS0FBMUM7QUFDQSxxQkFBUyxNQUFULENBQWlCLE9BQWpCLEVBQTBCLEVBQUUsTUFBRixDQUFTLENBQVQsRUFBWSxLQUFaLENBQWtCLENBQWxCLENBQTFCLEVBQWdELFVBQWhEO0FBQ0EscUJBQVMsTUFBVCxDQUFnQixRQUFoQixFQUEwQixFQUFFLE1BQUYsQ0FBUyxDQUFULEVBQVksS0FBdEM7QUFDQSxxQkFBUyxNQUFULENBQWdCLFdBQWhCLEVBQTZCLEVBQUUsTUFBRixDQUFTLENBQVQsRUFBWSxLQUF6Qzs7QUFFQSxrQkFBTSxpQ0FBTixFQUF5QztBQUN2QyxzQkFBUSxNQUQrQjtBQUV2QyxvQkFBTztBQUZnQyxhQUF6QyxFQUlHLElBSkgsQ0FJUSxvQkFBWTtBQUNoQiw4QkFBRSxRQUFGO0FBQ0QsYUFOSDtBQU9ELFdBakJEO0FBa0JELFNBeEJIO0FBeUJEO0FBQ0QsaUJBQVcsZ0JBQVgsQ0FBNEIsT0FBNUIsRUFBcUMsWUFBTTtBQUN6QyxxQkFBYSxTQUFiLEdBQXlCLEVBQXpCO0FBQ0Esb0JBQVksU0FBWixDQUFzQixHQUF0QixDQUEwQixjQUExQjtBQUNELE9BSEQ7QUFJRDs7O21DQUVlLEUsRUFBSTtBQUNsQixhQUFPLDZDQUEyQyxFQUEzQyxFQUNKLElBREksQ0FDQztBQUFBLGVBQVksU0FBUyxJQUFULEVBQVo7QUFBQSxPQURELENBQVA7QUFFRDs7OytCQUVXLEMsRUFBRztBQUNiLFVBQU0sZUFBZSxXQUFFLGFBQUYsQ0FBZ0IsZUFBaEIsQ0FBckI7QUFBQSxVQUNFLGNBQWMsV0FBRSxhQUFGLENBQWdCLGNBQWhCLENBRGhCO0FBQUEsVUFFRSxhQUFhLFdBQUUsYUFBRixDQUFnQixhQUFoQixDQUZmO0FBQUEsVUFHRSxLQUFLLEVBQUUsTUFBRixDQUFTLE9BQVQsQ0FBaUIsRUFIeEI7QUFJQSxVQUFJLEVBQUUsTUFBRixDQUFTLEVBQVQsS0FBZ0IsYUFBcEIsRUFBbUM7QUFDakMsb0JBQVksU0FBWixDQUFzQixNQUF0QixDQUE2QixjQUE3Qjs7QUFFQSxZQUFJLGFBQWEsU0FBYixVQUFhLENBQUMsS0FBRDtBQUFBLHFXQUlxRyxNQUFNLE9BSjNHLDhQQVF3RyxNQUFNLFdBUjlHLDhTQWFNLE1BQU0sVUFiWixvQkFhb0MsTUFBTSxVQWIxQyw2bUJBd0JpQixNQUFNLElBeEJ2QixtUEE0QnlGLE1BQU0sTUE1Qi9GLDRKQWdDUSxNQUFNLE9BaENkO0FBQUEsU0FBakI7QUFzQ0EsYUFBSyxjQUFMLENBQW9CLEVBQXBCLEVBQ0csSUFESCxDQUNRLG9CQUFZO0FBQ2hCLHVCQUFhLGtCQUFiLENBQWdDLFdBQWhDLEVBQTZDLFdBQVcsU0FBUyxDQUFULENBQVgsQ0FBN0M7QUFDRCxTQUhIO0FBSUE7Ozs7QUFJRDtBQUNELGlCQUFXLGdCQUFYLENBQTRCLE9BQTVCLEVBQXFDLFlBQU07QUFDekMscUJBQWEsU0FBYixHQUF5QixFQUF6QjtBQUNBLG9CQUFZLFNBQVosQ0FBc0IsR0FBdEIsQ0FBMEIsY0FBMUI7QUFDRCxPQUhEO0FBSUQ7OztpQ0FFYSxDLEVBQUc7QUFDZixVQUFJLEVBQUUsTUFBRixDQUFTLEVBQVQsS0FBZ0IsZUFBcEIsRUFBcUM7QUFDbkMsWUFBTSxLQUFLLEVBQUUsTUFBRixDQUFTLFVBQVQsQ0FBb0IsQ0FBcEIsRUFBdUIsU0FBbEM7QUFDQSxzREFBNEMsRUFBNUMsRUFBaUQ7QUFDL0Msa0JBQVEsUUFEdUM7QUFFL0MsbUJBQVUsSUFBSSxPQUFKLENBQVksRUFBQyxnQkFBZ0Isa0JBQWpCLEVBQVo7QUFGcUMsU0FBakQsRUFJRyxJQUpILENBSVEsb0JBQVk7QUFDaEIsa0JBQVEsR0FBUixDQUFhLFFBQWI7QUFDQSxjQUFJLFNBQVMsVUFBVCxLQUF3QixJQUE1QixFQUFrQztBQUNoQyxvQkFBUSxTQUFSLEdBQW9CLHdDQUFwQjtBQUNBLG9CQUFRLFNBQVIsQ0FBa0IsR0FBbEIsQ0FBc0IsUUFBdEI7QUFDQSxvQkFBUSxTQUFSLENBQWtCLE1BQWxCLENBQXlCLGNBQXpCO0FBQ0EsdUJBQVcsWUFBTTtBQUNmLHNCQUFRLFNBQVIsQ0FBa0IsR0FBbEIsQ0FBc0IsY0FBdEI7QUFDRCxhQUZELEVBRUcsSUFGSDtBQUdEO0FBQ0YsU0FkSCxFQWVHLEtBZkgsQ0FlUztBQUFBLGlCQUFPLFFBQVEsR0FBUixDQUFZLEdBQVosQ0FBUDtBQUFBLFNBZlQ7QUFnQkQ7QUFDRjs7OzZCQUVTO0FBQ1IsWUFBTSxpQ0FBTixFQUNHLElBREgsQ0FDUztBQUFBLGVBQVksU0FBUyxJQUFULEVBQVo7QUFBQSxPQURULEVBRUcsSUFGSCxDQUVRLGtCQUFVO0FBQ2QsZ0JBQVEsR0FBUixDQUFhLE1BQWI7QUFDQSxvQkFBWSxrQkFBWixDQUErQixXQUEvQixFQUE0Qyx3QkFBUyxNQUFULENBQTVDO0FBQ0QsT0FMSCxFQU1HLEtBTkgsQ0FNUztBQUFBLGVBQU8sUUFBUSxHQUFSLENBQVksR0FBWixDQUFQO0FBQUEsT0FOVDs7QUFRQSxrQkFBWSxnQkFBWixDQUE2QixPQUE3QixFQUFzQyxLQUFLLFlBQTNDO0FBQ0Esa0JBQVksZ0JBQVosQ0FBNkIsT0FBN0IsRUFBc0MsS0FBSyxTQUEzQztBQUNBLGtCQUFZLGdCQUFaLENBQTZCLE9BQTdCLEVBQXNDLEtBQUssVUFBM0M7QUFDRDs7Ozs7O2tCQXpMa0IsTTs7Ozs7Ozs7O0FDUHJCOzs7Ozs7a0JBQ2UsVUFBQyxNQUFELEVBQVk7QUFDekIsTUFBSSx5akJBaUJJLE9BQU8sR0FBUCxDQUFXO0FBQUEsa0NBQ1AsRUFBRSxPQURLLDJCQUVQLEVBQUUsV0FGSywyQkFHUCxFQUFFLE1BSEssMkJBSVAsRUFBRSxVQUpLLG9EQUtpQixFQUFFLElBTG5CLHdGQU9nQyxFQUFFLEVBUGxDLGlJQVUrQixFQUFFLEVBVmpDO0FBQUEsR0FBWCxFQVlNLElBWk4sQ0FZVyxFQVpYLENBakJKLHlYQUFKO0FBdUNFLFNBQU8scUJBQU8sRUFBUCxDQUFQO0FBQ0gsQzs7Ozs7Ozs7OztBQzFDRCxJQUFNLElBQUksUUFBUSxHQUFsQjtBQUFBLElBQ0UsSUFBSSxRQUROOztRQUlFLEMsR0FBQSxDO1FBQ0EsQyxHQUFBLEM7Ozs7O0FDTEY7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUEsSUFBTSxjQUFjLFNBQVMsYUFBVCxDQUF1QixlQUF2QixDQUFwQjs7QUFFQSxJQUFNLFdBQVcscUJBQWpCO0FBQUEsSUFDRSxTQUFTLHFCQURYO0FBRUEsb0JBQUssYUFBTCxFQUFvQixVQUFDLEdBQUQsRUFBTSxJQUFOLEVBQWU7QUFDakMsY0FBWSxTQUFaLEdBQXdCLEVBQXhCO0FBQ0EsV0FBUyxNQUFUO0FBQ0QsQ0FIRDtBQUlBLG9CQUFLLFNBQUwsRUFBZ0IsVUFBQyxHQUFELEVBQU0sSUFBTixFQUFlO0FBQzdCLGNBQVksU0FBWixHQUF3QixFQUF4QjtBQUNBLFNBQU8sTUFBUDtBQUNELENBSEQ7QUFJQTs7Ozs7Ozs7O2tCQ2xCZSxVQUFDLFFBQUQsRUFBYztBQUMzQixzQ0FBZ0MsUUFBaEM7QUFDRCxDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoYXJyKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIiAgLyogZ2xvYmFscyByZXF1aXJlLCBtb2R1bGUgKi9cblxuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqXG4gICAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gICAqL1xuXG4gIHZhciBwYXRodG9SZWdleHAgPSByZXF1aXJlKCdwYXRoLXRvLXJlZ2V4cCcpO1xuXG4gIC8qKlxuICAgKiBNb2R1bGUgZXhwb3J0cy5cbiAgICovXG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBwYWdlO1xuICBwYWdlLmRlZmF1bHQgPSBwYWdlO1xuICBwYWdlLkNvbnRleHQgPSBDb250ZXh0O1xuICBwYWdlLlJvdXRlID0gUm91dGU7XG4gIHBhZ2Uuc2FtZU9yaWdpbiA9IHNhbWVPcmlnaW47XG5cbiAgLyoqXG4gICAqIFNob3J0LWN1dHMgZm9yIGdsb2JhbC1vYmplY3QgY2hlY2tzXG4gICAqL1xuXG4gIHZhciBoYXNEb2N1bWVudCA9ICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRvY3VtZW50KTtcbiAgdmFyIGhhc1dpbmRvdyA9ICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHdpbmRvdyk7XG4gIHZhciBoYXNIaXN0b3J5ID0gKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgaGlzdG9yeSk7XG4gIHZhciBoYXNQcm9jZXNzID0gdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnO1xuXG4gIC8qKlxuICAgKiBEZXRlY3QgY2xpY2sgZXZlbnRcbiAgICovXG4gIHZhciBjbGlja0V2ZW50ID0gaGFzRG9jdW1lbnQgJiYgZG9jdW1lbnQub250b3VjaHN0YXJ0ID8gJ3RvdWNoc3RhcnQnIDogJ2NsaWNrJztcblxuICAvKipcbiAgICogVG8gd29yayBwcm9wZXJseSB3aXRoIHRoZSBVUkxcbiAgICogaGlzdG9yeS5sb2NhdGlvbiBnZW5lcmF0ZWQgcG9seWZpbGwgaW4gaHR0cHM6Ly9naXRodWIuY29tL2Rldm90ZS9IVE1MNS1IaXN0b3J5LUFQSVxuICAgKi9cblxuICB2YXIgaXNMb2NhdGlvbiA9IGhhc1dpbmRvdyAmJiAhISh3aW5kb3cuaGlzdG9yeS5sb2NhdGlvbiB8fCB3aW5kb3cubG9jYXRpb24pO1xuXG4gIC8qKlxuICAgKiBQZXJmb3JtIGluaXRpYWwgZGlzcGF0Y2guXG4gICAqL1xuXG4gIHZhciBkaXNwYXRjaCA9IHRydWU7XG5cblxuICAvKipcbiAgICogRGVjb2RlIFVSTCBjb21wb25lbnRzIChxdWVyeSBzdHJpbmcsIHBhdGhuYW1lLCBoYXNoKS5cbiAgICogQWNjb21tb2RhdGVzIGJvdGggcmVndWxhciBwZXJjZW50IGVuY29kaW5nIGFuZCB4LXd3dy1mb3JtLXVybGVuY29kZWQgZm9ybWF0LlxuICAgKi9cbiAgdmFyIGRlY29kZVVSTENvbXBvbmVudHMgPSB0cnVlO1xuXG4gIC8qKlxuICAgKiBCYXNlIHBhdGguXG4gICAqL1xuXG4gIHZhciBiYXNlID0gJyc7XG5cbiAgLyoqXG4gICAqIFN0cmljdCBwYXRoIG1hdGNoaW5nLlxuICAgKi9cblxuICB2YXIgc3RyaWN0ID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIFJ1bm5pbmcgZmxhZy5cbiAgICovXG5cbiAgdmFyIHJ1bm5pbmc7XG5cbiAgLyoqXG4gICAqIEhhc2hCYW5nIG9wdGlvblxuICAgKi9cblxuICB2YXIgaGFzaGJhbmcgPSBmYWxzZTtcblxuICAvKipcbiAgICogUHJldmlvdXMgY29udGV4dCwgZm9yIGNhcHR1cmluZ1xuICAgKiBwYWdlIGV4aXQgZXZlbnRzLlxuICAgKi9cblxuICB2YXIgcHJldkNvbnRleHQ7XG5cbiAgLyoqXG4gICAqIFRoZSB3aW5kb3cgZm9yIHdoaWNoIHRoaXMgYHBhZ2VgIGlzIHJ1bm5pbmdcbiAgICovXG4gIHZhciBwYWdlV2luZG93O1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBgcGF0aGAgd2l0aCBjYWxsYmFjayBgZm4oKWAsXG4gICAqIG9yIHJvdXRlIGBwYXRoYCwgb3IgcmVkaXJlY3Rpb24sXG4gICAqIG9yIGBwYWdlLnN0YXJ0KClgLlxuICAgKlxuICAgKiAgIHBhZ2UoZm4pO1xuICAgKiAgIHBhZ2UoJyonLCBmbik7XG4gICAqICAgcGFnZSgnL3VzZXIvOmlkJywgbG9hZCwgdXNlcik7XG4gICAqICAgcGFnZSgnL3VzZXIvJyArIHVzZXIuaWQsIHsgc29tZTogJ3RoaW5nJyB9KTtcbiAgICogICBwYWdlKCcvdXNlci8nICsgdXNlci5pZCk7XG4gICAqICAgcGFnZSgnL2Zyb20nLCAnL3RvJylcbiAgICogICBwYWdlKCk7XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfCFGdW5jdGlvbnwhT2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7RnVuY3Rpb249fSBmblxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBwYWdlKHBhdGgsIGZuKSB7XG4gICAgLy8gPGNhbGxiYWNrPlxuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgcGF0aCkge1xuICAgICAgcmV0dXJuIHBhZ2UoJyonLCBwYXRoKTtcbiAgICB9XG5cbiAgICAvLyByb3V0ZSA8cGF0aD4gdG8gPGNhbGxiYWNrIC4uLj5cbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGZuKSB7XG4gICAgICB2YXIgcm91dGUgPSBuZXcgUm91dGUoLyoqIEB0eXBlIHtzdHJpbmd9ICovIChwYXRoKSk7XG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICBwYWdlLmNhbGxiYWNrcy5wdXNoKHJvdXRlLm1pZGRsZXdhcmUoYXJndW1lbnRzW2ldKSk7XG4gICAgICB9XG4gICAgICAvLyBzaG93IDxwYXRoPiB3aXRoIFtzdGF0ZV1cbiAgICB9IGVsc2UgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgcGF0aCkge1xuICAgICAgcGFnZVsnc3RyaW5nJyA9PT0gdHlwZW9mIGZuID8gJ3JlZGlyZWN0JyA6ICdzaG93J10ocGF0aCwgZm4pO1xuICAgICAgLy8gc3RhcnQgW29wdGlvbnNdXG4gICAgfSBlbHNlIHtcbiAgICAgIHBhZ2Uuc3RhcnQocGF0aCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGZ1bmN0aW9ucy5cbiAgICovXG5cbiAgcGFnZS5jYWxsYmFja3MgPSBbXTtcbiAgcGFnZS5leGl0cyA9IFtdO1xuXG4gIC8qKlxuICAgKiBDdXJyZW50IHBhdGggYmVpbmcgcHJvY2Vzc2VkXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqL1xuICBwYWdlLmN1cnJlbnQgPSAnJztcblxuICAvKipcbiAgICogTnVtYmVyIG9mIHBhZ2VzIG5hdmlnYXRlZCB0by5cbiAgICogQHR5cGUge251bWJlcn1cbiAgICpcbiAgICogICAgIHBhZ2UubGVuID09IDA7XG4gICAqICAgICBwYWdlKCcvbG9naW4nKTtcbiAgICogICAgIHBhZ2UubGVuID09IDE7XG4gICAqL1xuXG4gIHBhZ2UubGVuID0gMDtcblxuICAvKipcbiAgICogR2V0IG9yIHNldCBiYXNlcGF0aCB0byBgcGF0aGAuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHBhZ2UuYmFzZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBpZiAoMCA9PT0gYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGJhc2U7XG4gICAgYmFzZSA9IHBhdGg7XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldCBvciBzZXQgc3RyaWN0IHBhdGggbWF0Y2hpbmcgdG8gYGVuYWJsZWBcbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSBlbmFibGVcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgcGFnZS5zdHJpY3QgPSBmdW5jdGlvbihlbmFibGUpIHtcbiAgICBpZiAoMCA9PT0gYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHN0cmljdDtcbiAgICBzdHJpY3QgPSBlbmFibGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEJpbmQgd2l0aCB0aGUgZ2l2ZW4gYG9wdGlvbnNgLlxuICAgKlxuICAgKiBPcHRpb25zOlxuICAgKlxuICAgKiAgICAtIGBjbGlja2AgYmluZCB0byBjbGljayBldmVudHMgW3RydWVdXG4gICAqICAgIC0gYHBvcHN0YXRlYCBiaW5kIHRvIHBvcHN0YXRlIFt0cnVlXVxuICAgKiAgICAtIGBkaXNwYXRjaGAgcGVyZm9ybSBpbml0aWFsIGRpc3BhdGNoIFt0cnVlXVxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBwYWdlLnN0YXJ0ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIGlmIChydW5uaW5nKSByZXR1cm47XG4gICAgcnVubmluZyA9IHRydWU7XG4gICAgcGFnZVdpbmRvdyA9IG9wdGlvbnMud2luZG93IHx8IChoYXNXaW5kb3cgJiYgd2luZG93KTtcbiAgICBpZiAoZmFsc2UgPT09IG9wdGlvbnMuZGlzcGF0Y2gpIGRpc3BhdGNoID0gZmFsc2U7XG4gICAgaWYgKGZhbHNlID09PSBvcHRpb25zLmRlY29kZVVSTENvbXBvbmVudHMpIGRlY29kZVVSTENvbXBvbmVudHMgPSBmYWxzZTtcbiAgICBpZiAoZmFsc2UgIT09IG9wdGlvbnMucG9wc3RhdGUgJiYgaGFzV2luZG93KSBwYWdlV2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgb25wb3BzdGF0ZSwgZmFsc2UpO1xuICAgIGlmIChmYWxzZSAhPT0gb3B0aW9ucy5jbGljayAmJiBoYXNEb2N1bWVudCkge1xuICAgICAgcGFnZVdpbmRvdy5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGNsaWNrRXZlbnQsIG9uY2xpY2ssIGZhbHNlKTtcbiAgICB9XG4gICAgaGFzaGJhbmcgPSAhIW9wdGlvbnMuaGFzaGJhbmc7XG4gICAgaWYoaGFzaGJhbmcgJiYgaGFzV2luZG93ICYmICFoYXNIaXN0b3J5KSB7XG4gICAgICBwYWdlV2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCBvbnBvcHN0YXRlLCBmYWxzZSk7XG4gICAgfVxuICAgIGlmICghZGlzcGF0Y2gpIHJldHVybjtcblxuICAgIHZhciB1cmw7XG4gICAgaWYoaXNMb2NhdGlvbikge1xuICAgICAgdmFyIGxvYyA9IHBhZ2VXaW5kb3cubG9jYXRpb247XG5cbiAgICAgIGlmKGhhc2hiYW5nICYmIH5sb2MuaGFzaC5pbmRleE9mKCcjIScpKSB7XG4gICAgICAgIHVybCA9IGxvYy5oYXNoLnN1YnN0cigyKSArIGxvYy5zZWFyY2g7XG4gICAgICB9IGVsc2UgaWYgKGhhc2hiYW5nKSB7XG4gICAgICAgIHVybCA9IGxvYy5zZWFyY2ggKyBsb2MuaGFzaDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVybCA9IGxvYy5wYXRobmFtZSArIGxvYy5zZWFyY2ggKyBsb2MuaGFzaDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBwYWdlLnJlcGxhY2UodXJsLCBudWxsLCB0cnVlLCBkaXNwYXRjaCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFVuYmluZCBjbGljayBhbmQgcG9wc3RhdGUgZXZlbnQgaGFuZGxlcnMuXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHBhZ2Uuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghcnVubmluZykgcmV0dXJuO1xuICAgIHBhZ2UuY3VycmVudCA9ICcnO1xuICAgIHBhZ2UubGVuID0gMDtcbiAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgaGFzRG9jdW1lbnQgJiYgcGFnZVdpbmRvdy5kb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGNsaWNrRXZlbnQsIG9uY2xpY2ssIGZhbHNlKTtcbiAgICBoYXNXaW5kb3cgJiYgcGFnZVdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIG9ucG9wc3RhdGUsIGZhbHNlKTtcbiAgICBoYXNXaW5kb3cgJiYgcGFnZVdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgb25wb3BzdGF0ZSwgZmFsc2UpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTaG93IGBwYXRoYCB3aXRoIG9wdGlvbmFsIGBzdGF0ZWAgb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdD19IHN0YXRlXG4gICAqIEBwYXJhbSB7Ym9vbGVhbj19IGRpc3BhdGNoXG4gICAqIEBwYXJhbSB7Ym9vbGVhbj19IHB1c2hcbiAgICogQHJldHVybiB7IUNvbnRleHR9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHBhZ2Uuc2hvdyA9IGZ1bmN0aW9uKHBhdGgsIHN0YXRlLCBkaXNwYXRjaCwgcHVzaCkge1xuICAgIHZhciBjdHggPSBuZXcgQ29udGV4dChwYXRoLCBzdGF0ZSksXG4gICAgICBwcmV2ID0gcHJldkNvbnRleHQ7XG4gICAgcHJldkNvbnRleHQgPSBjdHg7XG4gICAgcGFnZS5jdXJyZW50ID0gY3R4LnBhdGg7XG4gICAgaWYgKGZhbHNlICE9PSBkaXNwYXRjaCkgcGFnZS5kaXNwYXRjaChjdHgsIHByZXYpO1xuICAgIGlmIChmYWxzZSAhPT0gY3R4LmhhbmRsZWQgJiYgZmFsc2UgIT09IHB1c2gpIGN0eC5wdXNoU3RhdGUoKTtcbiAgICByZXR1cm4gY3R4O1xuICB9O1xuXG4gIC8qKlxuICAgKiBHb2VzIGJhY2sgaW4gdGhlIGhpc3RvcnlcbiAgICogQmFjayBzaG91bGQgYWx3YXlzIGxldCB0aGUgY3VycmVudCByb3V0ZSBwdXNoIHN0YXRlIGFuZCB0aGVuIGdvIGJhY2suXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIC0gZmFsbGJhY2sgcGF0aCB0byBnbyBiYWNrIGlmIG5vIG1vcmUgaGlzdG9yeSBleGlzdHMsIGlmIHVuZGVmaW5lZCBkZWZhdWx0cyB0byBwYWdlLmJhc2VcbiAgICogQHBhcmFtIHtPYmplY3Q9fSBzdGF0ZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBwYWdlLmJhY2sgPSBmdW5jdGlvbihwYXRoLCBzdGF0ZSkge1xuICAgIGlmIChwYWdlLmxlbiA+IDApIHtcbiAgICAgIC8vIHRoaXMgbWF5IG5lZWQgbW9yZSB0ZXN0aW5nIHRvIHNlZSBpZiBhbGwgYnJvd3NlcnNcbiAgICAgIC8vIHdhaXQgZm9yIHRoZSBuZXh0IHRpY2sgdG8gZ28gYmFjayBpbiBoaXN0b3J5XG4gICAgICBoYXNIaXN0b3J5ICYmIHBhZ2VXaW5kb3cuaGlzdG9yeS5iYWNrKCk7XG4gICAgICBwYWdlLmxlbi0tO1xuICAgIH0gZWxzZSBpZiAocGF0aCkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgcGFnZS5zaG93KHBhdGgsIHN0YXRlKTtcbiAgICAgIH0pO1xuICAgIH1lbHNle1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgcGFnZS5zaG93KGdldEJhc2UoKSwgc3RhdGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHJvdXRlIHRvIHJlZGlyZWN0IGZyb20gb25lIHBhdGggdG8gb3RoZXJcbiAgICogb3IganVzdCByZWRpcmVjdCB0byBhbm90aGVyIHJvdXRlXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmcm9tIC0gaWYgcGFyYW0gJ3RvJyBpcyB1bmRlZmluZWQgcmVkaXJlY3RzIHRvICdmcm9tJ1xuICAgKiBAcGFyYW0ge3N0cmluZz19IHRvXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBwYWdlLnJlZGlyZWN0ID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgICAvLyBEZWZpbmUgcm91dGUgZnJvbSBhIHBhdGggdG8gYW5vdGhlclxuICAgIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIGZyb20gJiYgJ3N0cmluZycgPT09IHR5cGVvZiB0bykge1xuICAgICAgcGFnZShmcm9tLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcGFnZS5yZXBsYWNlKC8qKiBAdHlwZSB7IXN0cmluZ30gKi8gKHRvKSk7XG4gICAgICAgIH0sIDApO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gV2FpdCBmb3IgdGhlIHB1c2ggc3RhdGUgYW5kIHJlcGxhY2UgaXQgd2l0aCBhbm90aGVyXG4gICAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgZnJvbSAmJiAndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHRvKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBwYWdlLnJlcGxhY2UoZnJvbSk7XG4gICAgICB9LCAwKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlcGxhY2UgYHBhdGhgIHdpdGggb3B0aW9uYWwgYHN0YXRlYCBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gICAqIEBwYXJhbSB7T2JqZWN0PX0gc3RhdGVcbiAgICogQHBhcmFtIHtib29sZWFuPX0gaW5pdFxuICAgKiBAcGFyYW0ge2Jvb2xlYW49fSBkaXNwYXRjaFxuICAgKiBAcmV0dXJuIHshQ29udGV4dH1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cblxuICBwYWdlLnJlcGxhY2UgPSBmdW5jdGlvbihwYXRoLCBzdGF0ZSwgaW5pdCwgZGlzcGF0Y2gpIHtcbiAgICB2YXIgY3R4ID0gbmV3IENvbnRleHQocGF0aCwgc3RhdGUpLFxuICAgICAgcHJldiA9IHByZXZDb250ZXh0O1xuICAgIHByZXZDb250ZXh0ID0gY3R4O1xuICAgIHBhZ2UuY3VycmVudCA9IGN0eC5wYXRoO1xuICAgIGN0eC5pbml0ID0gaW5pdDtcbiAgICBjdHguc2F2ZSgpOyAvLyBzYXZlIGJlZm9yZSBkaXNwYXRjaGluZywgd2hpY2ggbWF5IHJlZGlyZWN0XG4gICAgaWYgKGZhbHNlICE9PSBkaXNwYXRjaCkgcGFnZS5kaXNwYXRjaChjdHgsIHByZXYpO1xuICAgIHJldHVybiBjdHg7XG4gIH07XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoIHRoZSBnaXZlbiBgY3R4YC5cbiAgICpcbiAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIHBhZ2UuZGlzcGF0Y2ggPSBmdW5jdGlvbihjdHgsIHByZXYpIHtcbiAgICB2YXIgaSA9IDAsXG4gICAgICBqID0gMDtcblxuICAgIGZ1bmN0aW9uIG5leHRFeGl0KCkge1xuICAgICAgdmFyIGZuID0gcGFnZS5leGl0c1tqKytdO1xuICAgICAgaWYgKCFmbikgcmV0dXJuIG5leHRFbnRlcigpO1xuICAgICAgZm4ocHJldiwgbmV4dEV4aXQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5leHRFbnRlcigpIHtcbiAgICAgIHZhciBmbiA9IHBhZ2UuY2FsbGJhY2tzW2krK107XG5cbiAgICAgIGlmIChjdHgucGF0aCAhPT0gcGFnZS5jdXJyZW50KSB7XG4gICAgICAgIGN0eC5oYW5kbGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghZm4pIHJldHVybiB1bmhhbmRsZWQoY3R4KTtcbiAgICAgIGZuKGN0eCwgbmV4dEVudGVyKTtcbiAgICB9XG5cbiAgICBpZiAocHJldikge1xuICAgICAgbmV4dEV4aXQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV4dEVudGVyKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBVbmhhbmRsZWQgYGN0eGAuIFdoZW4gaXQncyBub3QgdGhlIGluaXRpYWxcbiAgICogcG9wc3RhdGUgdGhlbiByZWRpcmVjdC4gSWYgeW91IHdpc2ggdG8gaGFuZGxlXG4gICAqIDQwNHMgb24geW91ciBvd24gdXNlIGBwYWdlKCcqJywgY2FsbGJhY2spYC5cbiAgICpcbiAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiB1bmhhbmRsZWQoY3R4KSB7XG4gICAgaWYgKGN0eC5oYW5kbGVkKSByZXR1cm47XG4gICAgdmFyIGN1cnJlbnQ7XG5cbiAgICBpZiAoaGFzaGJhbmcpIHtcbiAgICAgIGN1cnJlbnQgPSBpc0xvY2F0aW9uICYmIGdldEJhc2UoKSArIHBhZ2VXaW5kb3cubG9jYXRpb24uaGFzaC5yZXBsYWNlKCcjIScsICcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudCA9IGlzTG9jYXRpb24gJiYgcGFnZVdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHBhZ2VXaW5kb3cubG9jYXRpb24uc2VhcmNoO1xuICAgIH1cblxuICAgIGlmIChjdXJyZW50ID09PSBjdHguY2Fub25pY2FsUGF0aCkgcmV0dXJuO1xuICAgIHBhZ2Uuc3RvcCgpO1xuICAgIGN0eC5oYW5kbGVkID0gZmFsc2U7XG4gICAgaXNMb2NhdGlvbiAmJiAocGFnZVdpbmRvdy5sb2NhdGlvbi5ocmVmID0gY3R4LmNhbm9uaWNhbFBhdGgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGFuIGV4aXQgcm91dGUgb24gYHBhdGhgIHdpdGhcbiAgICogY2FsbGJhY2sgYGZuKClgLCB3aGljaCB3aWxsIGJlIGNhbGxlZFxuICAgKiBvbiB0aGUgcHJldmlvdXMgY29udGV4dCB3aGVuIGEgbmV3XG4gICAqIHBhZ2UgaXMgdmlzaXRlZC5cbiAgICovXG4gIHBhZ2UuZXhpdCA9IGZ1bmN0aW9uKHBhdGgsIGZuKSB7XG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gcGFnZS5leGl0KCcqJywgcGF0aCk7XG4gICAgfVxuXG4gICAgdmFyIHJvdXRlID0gbmV3IFJvdXRlKHBhdGgpO1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICBwYWdlLmV4aXRzLnB1c2gocm91dGUubWlkZGxld2FyZShhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBVUkwgZW5jb2RpbmcgZnJvbSB0aGUgZ2l2ZW4gYHN0cmAuXG4gICAqIEFjY29tbW9kYXRlcyB3aGl0ZXNwYWNlIGluIGJvdGggeC13d3ctZm9ybS11cmxlbmNvZGVkXG4gICAqIGFuZCByZWd1bGFyIHBlcmNlbnQtZW5jb2RlZCBmb3JtLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsIC0gVVJMIGNvbXBvbmVudCB0byBkZWNvZGVcbiAgICovXG4gIGZ1bmN0aW9uIGRlY29kZVVSTEVuY29kZWRVUklDb21wb25lbnQodmFsKSB7XG4gICAgaWYgKHR5cGVvZiB2YWwgIT09ICdzdHJpbmcnKSB7IHJldHVybiB2YWw7IH1cbiAgICByZXR1cm4gZGVjb2RlVVJMQ29tcG9uZW50cyA/IGRlY29kZVVSSUNvbXBvbmVudCh2YWwucmVwbGFjZSgvXFwrL2csICcgJykpIDogdmFsO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYSBuZXcgXCJyZXF1ZXN0XCIgYENvbnRleHRgXG4gICAqIHdpdGggdGhlIGdpdmVuIGBwYXRoYCBhbmQgb3B0aW9uYWwgaW5pdGlhbCBgc3RhdGVgLlxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtPYmplY3Q9fSBzdGF0ZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBDb250ZXh0KHBhdGgsIHN0YXRlKSB7XG4gICAgdmFyIHBhZ2VCYXNlID0gZ2V0QmFzZSgpO1xuICAgIGlmICgnLycgPT09IHBhdGhbMF0gJiYgMCAhPT0gcGF0aC5pbmRleE9mKHBhZ2VCYXNlKSkgcGF0aCA9IHBhZ2VCYXNlICsgKGhhc2hiYW5nID8gJyMhJyA6ICcnKSArIHBhdGg7XG4gICAgdmFyIGkgPSBwYXRoLmluZGV4T2YoJz8nKTtcblxuICAgIHRoaXMuY2Fub25pY2FsUGF0aCA9IHBhdGg7XG4gICAgdGhpcy5wYXRoID0gcGF0aC5yZXBsYWNlKHBhZ2VCYXNlLCAnJykgfHwgJy8nO1xuICAgIGlmIChoYXNoYmFuZykgdGhpcy5wYXRoID0gdGhpcy5wYXRoLnJlcGxhY2UoJyMhJywgJycpIHx8ICcvJztcblxuICAgIHRoaXMudGl0bGUgPSAoaGFzRG9jdW1lbnQgJiYgcGFnZVdpbmRvdy5kb2N1bWVudC50aXRsZSk7XG4gICAgdGhpcy5zdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgIHRoaXMuc3RhdGUucGF0aCA9IHBhdGg7XG4gICAgdGhpcy5xdWVyeXN0cmluZyA9IH5pID8gZGVjb2RlVVJMRW5jb2RlZFVSSUNvbXBvbmVudChwYXRoLnNsaWNlKGkgKyAxKSkgOiAnJztcbiAgICB0aGlzLnBhdGhuYW1lID0gZGVjb2RlVVJMRW5jb2RlZFVSSUNvbXBvbmVudCh+aSA/IHBhdGguc2xpY2UoMCwgaSkgOiBwYXRoKTtcbiAgICB0aGlzLnBhcmFtcyA9IHt9O1xuXG4gICAgLy8gZnJhZ21lbnRcbiAgICB0aGlzLmhhc2ggPSAnJztcbiAgICBpZiAoIWhhc2hiYW5nKSB7XG4gICAgICBpZiAoIX50aGlzLnBhdGguaW5kZXhPZignIycpKSByZXR1cm47XG4gICAgICB2YXIgcGFydHMgPSB0aGlzLnBhdGguc3BsaXQoJyMnKTtcbiAgICAgIHRoaXMucGF0aCA9IHRoaXMucGF0aG5hbWUgPSBwYXJ0c1swXTtcbiAgICAgIHRoaXMuaGFzaCA9IGRlY29kZVVSTEVuY29kZWRVUklDb21wb25lbnQocGFydHNbMV0pIHx8ICcnO1xuICAgICAgdGhpcy5xdWVyeXN0cmluZyA9IHRoaXMucXVlcnlzdHJpbmcuc3BsaXQoJyMnKVswXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRXhwb3NlIGBDb250ZXh0YC5cbiAgICovXG5cbiAgcGFnZS5Db250ZXh0ID0gQ29udGV4dDtcblxuICAvKipcbiAgICogUHVzaCBzdGF0ZS5cbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIENvbnRleHQucHJvdG90eXBlLnB1c2hTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHBhZ2UubGVuKys7XG4gICAgaWYgKGhhc0hpc3RvcnkpIHtcbiAgICAgICAgcGFnZVdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh0aGlzLnN0YXRlLCB0aGlzLnRpdGxlLFxuICAgICAgICAgIGhhc2hiYW5nICYmIHRoaXMucGF0aCAhPT0gJy8nID8gJyMhJyArIHRoaXMucGF0aCA6IHRoaXMuY2Fub25pY2FsUGF0aCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBTYXZlIHRoZSBjb250ZXh0IHN0YXRlLlxuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBDb250ZXh0LnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKGhhc0hpc3RvcnkgJiYgcGFnZVdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCAhPT0gJ2ZpbGU6Jykge1xuICAgICAgICBwYWdlV2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHRoaXMuc3RhdGUsIHRoaXMudGl0bGUsXG4gICAgICAgICAgaGFzaGJhbmcgJiYgdGhpcy5wYXRoICE9PSAnLycgPyAnIyEnICsgdGhpcy5wYXRoIDogdGhpcy5jYW5vbmljYWxQYXRoKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYFJvdXRlYCB3aXRoIHRoZSBnaXZlbiBIVFRQIGBwYXRoYCxcbiAgICogYW5kIGFuIGFycmF5IG9mIGBjYWxsYmFja3NgIGFuZCBgb3B0aW9uc2AuXG4gICAqXG4gICAqIE9wdGlvbnM6XG4gICAqXG4gICAqICAgLSBgc2Vuc2l0aXZlYCAgICBlbmFibGUgY2FzZS1zZW5zaXRpdmUgcm91dGVzXG4gICAqICAgLSBgc3RyaWN0YCAgICAgICBlbmFibGUgc3RyaWN0IG1hdGNoaW5nIGZvciB0cmFpbGluZyBzbGFzaGVzXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdD19IG9wdGlvbnNcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIGZ1bmN0aW9uIFJvdXRlKHBhdGgsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zLnN0cmljdCA9IG9wdGlvbnMuc3RyaWN0IHx8IHN0cmljdDtcbiAgICB0aGlzLnBhdGggPSAocGF0aCA9PT0gJyonKSA/ICcoLiopJyA6IHBhdGg7XG4gICAgdGhpcy5tZXRob2QgPSAnR0VUJztcbiAgICB0aGlzLnJlZ2V4cCA9IHBhdGh0b1JlZ2V4cCh0aGlzLnBhdGgsXG4gICAgICB0aGlzLmtleXMgPSBbXSxcbiAgICAgIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4cG9zZSBgUm91dGVgLlxuICAgKi9cblxuICBwYWdlLlJvdXRlID0gUm91dGU7XG5cbiAgLyoqXG4gICAqIFJldHVybiByb3V0ZSBtaWRkbGV3YXJlIHdpdGhcbiAgICogdGhlIGdpdmVuIGNhbGxiYWNrIGBmbigpYC5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIFJvdXRlLnByb3RvdHlwZS5taWRkbGV3YXJlID0gZnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGN0eCwgbmV4dCkge1xuICAgICAgaWYgKHNlbGYubWF0Y2goY3R4LnBhdGgsIGN0eC5wYXJhbXMpKSByZXR1cm4gZm4oY3R4LCBuZXh0KTtcbiAgICAgIG5leHQoKTtcbiAgICB9O1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVjayBpZiB0aGlzIHJvdXRlIG1hdGNoZXMgYHBhdGhgLCBpZiBzb1xuICAgKiBwb3B1bGF0ZSBgcGFyYW1zYC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtc1xuICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgUm91dGUucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24ocGF0aCwgcGFyYW1zKSB7XG4gICAgdmFyIGtleXMgPSB0aGlzLmtleXMsXG4gICAgICBxc0luZGV4ID0gcGF0aC5pbmRleE9mKCc/JyksXG4gICAgICBwYXRobmFtZSA9IH5xc0luZGV4ID8gcGF0aC5zbGljZSgwLCBxc0luZGV4KSA6IHBhdGgsXG4gICAgICBtID0gdGhpcy5yZWdleHAuZXhlYyhkZWNvZGVVUklDb21wb25lbnQocGF0aG5hbWUpKTtcblxuICAgIGlmICghbSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgZm9yICh2YXIgaSA9IDEsIGxlbiA9IG0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2kgLSAxXTtcbiAgICAgIHZhciB2YWwgPSBkZWNvZGVVUkxFbmNvZGVkVVJJQ29tcG9uZW50KG1baV0pO1xuICAgICAgaWYgKHZhbCAhPT0gdW5kZWZpbmVkIHx8ICEoaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbXMsIGtleS5uYW1lKSkpIHtcbiAgICAgICAgcGFyYW1zW2tleS5uYW1lXSA9IHZhbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuXG4gIC8qKlxuICAgKiBIYW5kbGUgXCJwb3B1bGF0ZVwiIGV2ZW50cy5cbiAgICovXG5cbiAgdmFyIG9ucG9wc3RhdGUgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBsb2FkZWQgPSBmYWxzZTtcbiAgICBpZiAoICEgaGFzV2luZG93ICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoaGFzRG9jdW1lbnQgJiYgZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJykge1xuICAgICAgbG9hZGVkID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBsb2FkZWQgPSB0cnVlO1xuICAgICAgICB9LCAwKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24gb25wb3BzdGF0ZShlKSB7XG4gICAgICBpZiAoIWxvYWRlZCkgcmV0dXJuO1xuICAgICAgaWYgKGUuc3RhdGUpIHtcbiAgICAgICAgdmFyIHBhdGggPSBlLnN0YXRlLnBhdGg7XG4gICAgICAgIHBhZ2UucmVwbGFjZShwYXRoLCBlLnN0YXRlKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNMb2NhdGlvbikge1xuICAgICAgICB2YXIgbG9jID0gcGFnZVdpbmRvdy5sb2NhdGlvbjtcbiAgICAgICAgcGFnZS5zaG93KGxvYy5wYXRobmFtZSArIGxvYy5oYXNoLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgZmFsc2UpO1xuICAgICAgfVxuICAgIH07XG4gIH0pKCk7XG4gIC8qKlxuICAgKiBIYW5kbGUgXCJjbGlja1wiIGV2ZW50cy5cbiAgICovXG5cbiAgLyoganNoaW50ICtXMDU0ICovXG4gIGZ1bmN0aW9uIG9uY2xpY2soZSkge1xuICAgIGlmICgxICE9PSB3aGljaChlKSkgcmV0dXJuO1xuXG4gICAgaWYgKGUubWV0YUtleSB8fCBlLmN0cmxLZXkgfHwgZS5zaGlmdEtleSkgcmV0dXJuO1xuICAgIGlmIChlLmRlZmF1bHRQcmV2ZW50ZWQpIHJldHVybjtcblxuICAgIC8vIGVuc3VyZSBsaW5rXG4gICAgLy8gdXNlIHNoYWRvdyBkb20gd2hlbiBhdmFpbGFibGVcbiAgICB2YXIgZWwgPSBlLnBhdGggPyBlLnBhdGhbMF0gOiBlLnRhcmdldDtcblxuICAgIC8vIGNvbnRpbnVlIGVuc3VyZSBsaW5rXG4gICAgLy8gZWwubm9kZU5hbWUgZm9yIHN2ZyBsaW5rcyBhcmUgJ2EnIGluc3RlYWQgb2YgJ0EnXG4gICAgd2hpbGUgKGVsICYmICdBJyAhPT0gZWwubm9kZU5hbWUudG9VcHBlckNhc2UoKSkgZWwgPSBlbC5wYXJlbnROb2RlO1xuICAgIGlmICghZWwgfHwgJ0EnICE9PSBlbC5ub2RlTmFtZS50b1VwcGVyQ2FzZSgpKSByZXR1cm47XG5cbiAgICAvLyBjaGVjayBpZiBsaW5rIGlzIGluc2lkZSBhbiBzdmdcbiAgICAvLyBpbiB0aGlzIGNhc2UsIGJvdGggaHJlZiBhbmQgdGFyZ2V0IGFyZSBhbHdheXMgaW5zaWRlIGFuIG9iamVjdFxuICAgIHZhciBzdmcgPSAodHlwZW9mIGVsLmhyZWYgPT09ICdvYmplY3QnKSAmJiBlbC5ocmVmLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdTVkdBbmltYXRlZFN0cmluZyc7XG5cbiAgICAvLyBJZ25vcmUgaWYgdGFnIGhhc1xuICAgIC8vIDEuIFwiZG93bmxvYWRcIiBhdHRyaWJ1dGVcbiAgICAvLyAyLiByZWw9XCJleHRlcm5hbFwiIGF0dHJpYnV0ZVxuICAgIGlmIChlbC5oYXNBdHRyaWJ1dGUoJ2Rvd25sb2FkJykgfHwgZWwuZ2V0QXR0cmlidXRlKCdyZWwnKSA9PT0gJ2V4dGVybmFsJykgcmV0dXJuO1xuXG4gICAgLy8gZW5zdXJlIG5vbi1oYXNoIGZvciB0aGUgc2FtZSBwYXRoXG4gICAgdmFyIGxpbmsgPSBlbC5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICBpZighaGFzaGJhbmcgJiYgc2FtZVBhdGgoZWwpICYmIChlbC5oYXNoIHx8ICcjJyA9PT0gbGluaykpIHJldHVybjtcblxuICAgIC8vIENoZWNrIGZvciBtYWlsdG86IGluIHRoZSBocmVmXG4gICAgaWYgKGxpbmsgJiYgbGluay5pbmRleE9mKCdtYWlsdG86JykgPiAtMSkgcmV0dXJuO1xuXG4gICAgLy8gY2hlY2sgdGFyZ2V0XG4gICAgLy8gc3ZnIHRhcmdldCBpcyBhbiBvYmplY3QgYW5kIGl0cyBkZXNpcmVkIHZhbHVlIGlzIGluIC5iYXNlVmFsIHByb3BlcnR5XG4gICAgaWYgKHN2ZyA/IGVsLnRhcmdldC5iYXNlVmFsIDogZWwudGFyZ2V0KSByZXR1cm47XG5cbiAgICAvLyB4LW9yaWdpblxuICAgIC8vIG5vdGU6IHN2ZyBsaW5rcyB0aGF0IGFyZSBub3QgcmVsYXRpdmUgZG9uJ3QgY2FsbCBjbGljayBldmVudHMgKGFuZCBza2lwIHBhZ2UuanMpXG4gICAgLy8gY29uc2VxdWVudGx5LCBhbGwgc3ZnIGxpbmtzIHRlc3RlZCBpbnNpZGUgcGFnZS5qcyBhcmUgcmVsYXRpdmUgYW5kIGluIHRoZSBzYW1lIG9yaWdpblxuICAgIGlmICghc3ZnICYmICFzYW1lT3JpZ2luKGVsLmhyZWYpKSByZXR1cm47XG5cbiAgICAvLyByZWJ1aWxkIHBhdGhcbiAgICAvLyBUaGVyZSBhcmVuJ3QgLnBhdGhuYW1lIGFuZCAuc2VhcmNoIHByb3BlcnRpZXMgaW4gc3ZnIGxpbmtzLCBzbyB3ZSB1c2UgaHJlZlxuICAgIC8vIEFsc28sIHN2ZyBocmVmIGlzIGFuIG9iamVjdCBhbmQgaXRzIGRlc2lyZWQgdmFsdWUgaXMgaW4gLmJhc2VWYWwgcHJvcGVydHlcbiAgICB2YXIgcGF0aCA9IHN2ZyA/IGVsLmhyZWYuYmFzZVZhbCA6IChlbC5wYXRobmFtZSArIGVsLnNlYXJjaCArIChlbC5oYXNoIHx8ICcnKSk7XG5cbiAgICBwYXRoID0gcGF0aFswXSAhPT0gJy8nID8gJy8nICsgcGF0aCA6IHBhdGg7XG5cbiAgICAvLyBzdHJpcCBsZWFkaW5nIFwiL1tkcml2ZSBsZXR0ZXJdOlwiIG9uIE5XLmpzIG9uIFdpbmRvd3NcbiAgICBpZiAoaGFzUHJvY2VzcyAmJiBwYXRoLm1hdGNoKC9eXFwvW2EtekEtWl06XFwvLykpIHtcbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL15cXC9bYS16QS1aXTpcXC8vLCAnLycpO1xuICAgIH1cblxuICAgIC8vIHNhbWUgcGFnZVxuICAgIHZhciBvcmlnID0gcGF0aDtcbiAgICB2YXIgcGFnZUJhc2UgPSBnZXRCYXNlKCk7XG5cbiAgICBpZiAocGF0aC5pbmRleE9mKHBhZ2VCYXNlKSA9PT0gMCkge1xuICAgICAgcGF0aCA9IHBhdGguc3Vic3RyKGJhc2UubGVuZ3RoKTtcbiAgICB9XG5cbiAgICBpZiAoaGFzaGJhbmcpIHBhdGggPSBwYXRoLnJlcGxhY2UoJyMhJywgJycpO1xuXG4gICAgaWYgKHBhZ2VCYXNlICYmIG9yaWcgPT09IHBhdGgpIHJldHVybjtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBwYWdlLnNob3cob3JpZyk7XG4gIH1cblxuICAvKipcbiAgICogRXZlbnQgYnV0dG9uLlxuICAgKi9cblxuICBmdW5jdGlvbiB3aGljaChlKSB7XG4gICAgZSA9IGUgfHwgKGhhc1dpbmRvdyAmJiB3aW5kb3cuZXZlbnQpO1xuICAgIHJldHVybiBudWxsID09IGUud2hpY2ggPyBlLmJ1dHRvbiA6IGUud2hpY2g7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCB0byBhIFVSTCBvYmplY3RcbiAgICovXG4gIGZ1bmN0aW9uIHRvVVJMKGhyZWYpIHtcbiAgICBpZih0eXBlb2YgVVJMID09PSAnZnVuY3Rpb24nICYmIGlzTG9jYXRpb24pIHtcbiAgICAgIHJldHVybiBuZXcgVVJMKGhyZWYsIGxvY2F0aW9uLnRvU3RyaW5nKCkpO1xuICAgIH0gZWxzZSBpZiAoaGFzRG9jdW1lbnQpIHtcbiAgICAgIHZhciBhbmMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICBhbmMuaHJlZiA9IGhyZWY7XG4gICAgICByZXR1cm4gYW5jO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBgaHJlZmAgaXMgdGhlIHNhbWUgb3JpZ2luLlxuICAgKi9cblxuICBmdW5jdGlvbiBzYW1lT3JpZ2luKGhyZWYpIHtcbiAgICBpZighaHJlZiB8fCAhaXNMb2NhdGlvbikgcmV0dXJuIGZhbHNlO1xuICAgIHZhciB1cmwgPSB0b1VSTChocmVmKTtcblxuICAgIHZhciBsb2MgPSBwYWdlV2luZG93LmxvY2F0aW9uO1xuICAgIHJldHVybiBsb2MucHJvdG9jb2wgPT09IHVybC5wcm90b2NvbCAmJlxuICAgICAgbG9jLmhvc3RuYW1lID09PSB1cmwuaG9zdG5hbWUgJiZcbiAgICAgIGxvYy5wb3J0ID09PSB1cmwucG9ydDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNhbWVQYXRoKHVybCkge1xuICAgIGlmKCFpc0xvY2F0aW9uKSByZXR1cm4gZmFsc2U7XG4gICAgdmFyIGxvYyA9IHBhZ2VXaW5kb3cubG9jYXRpb247XG4gICAgcmV0dXJuIHVybC5wYXRobmFtZSA9PT0gbG9jLnBhdGhuYW1lICYmXG4gICAgICB1cmwuc2VhcmNoID09PSBsb2Muc2VhcmNoO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGBiYXNlYCwgd2hpY2ggZGVwZW5kcyBvbiB3aGV0aGVyIHdlIGFyZSB1c2luZyBIaXN0b3J5IG9yXG4gICAqIGhhc2hiYW5nIHJvdXRpbmcuXG4gICAqL1xuICBmdW5jdGlvbiBnZXRCYXNlKCkge1xuICAgIGlmKCEhYmFzZSkgcmV0dXJuIGJhc2U7XG4gICAgdmFyIGxvYyA9IGhhc1dpbmRvdyAmJiBwYWdlV2luZG93LmxvY2F0aW9uO1xuICAgIHJldHVybiAoaGFzV2luZG93ICYmIGhhc2hiYW5nICYmIGxvYy5wcm90b2NvbCA9PT0gJ2ZpbGU6JykgPyBsb2MucGF0aG5hbWUgOiBiYXNlO1xuICB9XG5cbiAgcGFnZS5zYW1lT3JpZ2luID0gc2FtZU9yaWdpbjtcbiIsInZhciBpc2FycmF5ID0gcmVxdWlyZSgnaXNhcnJheScpXG5cbi8qKlxuICogRXhwb3NlIGBwYXRoVG9SZWdleHBgLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGhUb1JlZ2V4cFxubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZVxubW9kdWxlLmV4cG9ydHMuY29tcGlsZSA9IGNvbXBpbGVcbm1vZHVsZS5leHBvcnRzLnRva2Vuc1RvRnVuY3Rpb24gPSB0b2tlbnNUb0Z1bmN0aW9uXG5tb2R1bGUuZXhwb3J0cy50b2tlbnNUb1JlZ0V4cCA9IHRva2Vuc1RvUmVnRXhwXG5cbi8qKlxuICogVGhlIG1haW4gcGF0aCBtYXRjaGluZyByZWdleHAgdXRpbGl0eS5cbiAqXG4gKiBAdHlwZSB7UmVnRXhwfVxuICovXG52YXIgUEFUSF9SRUdFWFAgPSBuZXcgUmVnRXhwKFtcbiAgLy8gTWF0Y2ggZXNjYXBlZCBjaGFyYWN0ZXJzIHRoYXQgd291bGQgb3RoZXJ3aXNlIGFwcGVhciBpbiBmdXR1cmUgbWF0Y2hlcy5cbiAgLy8gVGhpcyBhbGxvd3MgdGhlIHVzZXIgdG8gZXNjYXBlIHNwZWNpYWwgY2hhcmFjdGVycyB0aGF0IHdvbid0IHRyYW5zZm9ybS5cbiAgJyhcXFxcXFxcXC4pJyxcbiAgLy8gTWF0Y2ggRXhwcmVzcy1zdHlsZSBwYXJhbWV0ZXJzIGFuZCB1bi1uYW1lZCBwYXJhbWV0ZXJzIHdpdGggYSBwcmVmaXhcbiAgLy8gYW5kIG9wdGlvbmFsIHN1ZmZpeGVzLiBNYXRjaGVzIGFwcGVhciBhczpcbiAgLy9cbiAgLy8gXCIvOnRlc3QoXFxcXGQrKT9cIiA9PiBbXCIvXCIsIFwidGVzdFwiLCBcIlxcZCtcIiwgdW5kZWZpbmVkLCBcIj9cIiwgdW5kZWZpbmVkXVxuICAvLyBcIi9yb3V0ZShcXFxcZCspXCIgID0+IFt1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBcIlxcZCtcIiwgdW5kZWZpbmVkLCB1bmRlZmluZWRdXG4gIC8vIFwiLypcIiAgICAgICAgICAgID0+IFtcIi9cIiwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBcIipcIl1cbiAgJyhbXFxcXC8uXSk/KD86KD86XFxcXDooXFxcXHcrKSg/OlxcXFwoKCg/OlxcXFxcXFxcLnxbXigpXSkrKVxcXFwpKT98XFxcXCgoKD86XFxcXFxcXFwufFteKCldKSspXFxcXCkpKFsrKj9dKT98KFxcXFwqKSknXG5dLmpvaW4oJ3wnKSwgJ2cnKVxuXG4vKipcbiAqIFBhcnNlIGEgc3RyaW5nIGZvciB0aGUgcmF3IHRva2Vucy5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHBhcnNlIChzdHIpIHtcbiAgdmFyIHRva2VucyA9IFtdXG4gIHZhciBrZXkgPSAwXG4gIHZhciBpbmRleCA9IDBcbiAgdmFyIHBhdGggPSAnJ1xuICB2YXIgcmVzXG5cbiAgd2hpbGUgKChyZXMgPSBQQVRIX1JFR0VYUC5leGVjKHN0cikpICE9IG51bGwpIHtcbiAgICB2YXIgbSA9IHJlc1swXVxuICAgIHZhciBlc2NhcGVkID0gcmVzWzFdXG4gICAgdmFyIG9mZnNldCA9IHJlcy5pbmRleFxuICAgIHBhdGggKz0gc3RyLnNsaWNlKGluZGV4LCBvZmZzZXQpXG4gICAgaW5kZXggPSBvZmZzZXQgKyBtLmxlbmd0aFxuXG4gICAgLy8gSWdub3JlIGFscmVhZHkgZXNjYXBlZCBzZXF1ZW5jZXMuXG4gICAgaWYgKGVzY2FwZWQpIHtcbiAgICAgIHBhdGggKz0gZXNjYXBlZFsxXVxuICAgICAgY29udGludWVcbiAgICB9XG5cbiAgICAvLyBQdXNoIHRoZSBjdXJyZW50IHBhdGggb250byB0aGUgdG9rZW5zLlxuICAgIGlmIChwYXRoKSB7XG4gICAgICB0b2tlbnMucHVzaChwYXRoKVxuICAgICAgcGF0aCA9ICcnXG4gICAgfVxuXG4gICAgdmFyIHByZWZpeCA9IHJlc1syXVxuICAgIHZhciBuYW1lID0gcmVzWzNdXG4gICAgdmFyIGNhcHR1cmUgPSByZXNbNF1cbiAgICB2YXIgZ3JvdXAgPSByZXNbNV1cbiAgICB2YXIgc3VmZml4ID0gcmVzWzZdXG4gICAgdmFyIGFzdGVyaXNrID0gcmVzWzddXG5cbiAgICB2YXIgcmVwZWF0ID0gc3VmZml4ID09PSAnKycgfHwgc3VmZml4ID09PSAnKidcbiAgICB2YXIgb3B0aW9uYWwgPSBzdWZmaXggPT09ICc/JyB8fCBzdWZmaXggPT09ICcqJ1xuICAgIHZhciBkZWxpbWl0ZXIgPSBwcmVmaXggfHwgJy8nXG4gICAgdmFyIHBhdHRlcm4gPSBjYXB0dXJlIHx8IGdyb3VwIHx8IChhc3RlcmlzayA/ICcuKicgOiAnW14nICsgZGVsaW1pdGVyICsgJ10rPycpXG5cbiAgICB0b2tlbnMucHVzaCh7XG4gICAgICBuYW1lOiBuYW1lIHx8IGtleSsrLFxuICAgICAgcHJlZml4OiBwcmVmaXggfHwgJycsXG4gICAgICBkZWxpbWl0ZXI6IGRlbGltaXRlcixcbiAgICAgIG9wdGlvbmFsOiBvcHRpb25hbCxcbiAgICAgIHJlcGVhdDogcmVwZWF0LFxuICAgICAgcGF0dGVybjogZXNjYXBlR3JvdXAocGF0dGVybilcbiAgICB9KVxuICB9XG5cbiAgLy8gTWF0Y2ggYW55IGNoYXJhY3RlcnMgc3RpbGwgcmVtYWluaW5nLlxuICBpZiAoaW5kZXggPCBzdHIubGVuZ3RoKSB7XG4gICAgcGF0aCArPSBzdHIuc3Vic3RyKGluZGV4KVxuICB9XG5cbiAgLy8gSWYgdGhlIHBhdGggZXhpc3RzLCBwdXNoIGl0IG9udG8gdGhlIGVuZC5cbiAgaWYgKHBhdGgpIHtcbiAgICB0b2tlbnMucHVzaChwYXRoKVxuICB9XG5cbiAgcmV0dXJuIHRva2Vuc1xufVxuXG4vKipcbiAqIENvbXBpbGUgYSBzdHJpbmcgdG8gYSB0ZW1wbGF0ZSBmdW5jdGlvbiBmb3IgdGhlIHBhdGguXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSAgIHN0clxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGUgKHN0cikge1xuICByZXR1cm4gdG9rZW5zVG9GdW5jdGlvbihwYXJzZShzdHIpKVxufVxuXG4vKipcbiAqIEV4cG9zZSBhIG1ldGhvZCBmb3IgdHJhbnNmb3JtaW5nIHRva2VucyBpbnRvIHRoZSBwYXRoIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiB0b2tlbnNUb0Z1bmN0aW9uICh0b2tlbnMpIHtcbiAgLy8gQ29tcGlsZSBhbGwgdGhlIHRva2VucyBpbnRvIHJlZ2V4cHMuXG4gIHZhciBtYXRjaGVzID0gbmV3IEFycmF5KHRva2Vucy5sZW5ndGgpXG5cbiAgLy8gQ29tcGlsZSBhbGwgdGhlIHBhdHRlcm5zIGJlZm9yZSBjb21waWxhdGlvbi5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodHlwZW9mIHRva2Vuc1tpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIG1hdGNoZXNbaV0gPSBuZXcgUmVnRXhwKCdeJyArIHRva2Vuc1tpXS5wYXR0ZXJuICsgJyQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIHBhdGggPSAnJ1xuICAgIHZhciBkYXRhID0gb2JqIHx8IHt9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHRva2VuID0gdG9rZW5zW2ldXG5cbiAgICAgIGlmICh0eXBlb2YgdG9rZW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggKz0gdG9rZW5cblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICB2YXIgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdXG4gICAgICB2YXIgc2VnbWVudFxuXG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICBpZiAodG9rZW4ub3B0aW9uYWwpIHtcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIFwiJyArIHRva2VuLm5hbWUgKyAnXCIgdG8gYmUgZGVmaW5lZCcpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGlzYXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGlmICghdG9rZW4ucmVwZWF0KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgXCInICsgdG9rZW4ubmFtZSArICdcIiB0byBub3QgcmVwZWF0LCBidXQgcmVjZWl2ZWQgXCInICsgdmFsdWUgKyAnXCInKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGlmICh0b2tlbi5vcHRpb25hbCkge1xuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgXCInICsgdG9rZW4ubmFtZSArICdcIiB0byBub3QgYmUgZW1wdHknKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsdWUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBzZWdtZW50ID0gZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlW2pdKVxuXG4gICAgICAgICAgaWYgKCFtYXRjaGVzW2ldLnRlc3Qoc2VnbWVudCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGFsbCBcIicgKyB0b2tlbi5uYW1lICsgJ1wiIHRvIG1hdGNoIFwiJyArIHRva2VuLnBhdHRlcm4gKyAnXCIsIGJ1dCByZWNlaXZlZCBcIicgKyBzZWdtZW50ICsgJ1wiJylcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwYXRoICs9IChqID09PSAwID8gdG9rZW4ucHJlZml4IDogdG9rZW4uZGVsaW1pdGVyKSArIHNlZ21lbnRcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIHNlZ21lbnQgPSBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpXG5cbiAgICAgIGlmICghbWF0Y2hlc1tpXS50ZXN0KHNlZ21lbnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIFwiJyArIHRva2VuLm5hbWUgKyAnXCIgdG8gbWF0Y2ggXCInICsgdG9rZW4ucGF0dGVybiArICdcIiwgYnV0IHJlY2VpdmVkIFwiJyArIHNlZ21lbnQgKyAnXCInKVxuICAgICAgfVxuXG4gICAgICBwYXRoICs9IHRva2VuLnByZWZpeCArIHNlZ21lbnRcbiAgICB9XG5cbiAgICByZXR1cm4gcGF0aFxuICB9XG59XG5cbi8qKlxuICogRXNjYXBlIGEgcmVndWxhciBleHByZXNzaW9uIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5mdW5jdGlvbiBlc2NhcGVTdHJpbmcgKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbLisqPz1eIToke30oKVtcXF18XFwvXSkvZywgJ1xcXFwkMScpXG59XG5cbi8qKlxuICogRXNjYXBlIHRoZSBjYXB0dXJpbmcgZ3JvdXAgYnkgZXNjYXBpbmcgc3BlY2lhbCBjaGFyYWN0ZXJzIGFuZCBtZWFuaW5nLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gZ3JvdXBcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZXNjYXBlR3JvdXAgKGdyb3VwKSB7XG4gIHJldHVybiBncm91cC5yZXBsYWNlKC8oWz0hOiRcXC8oKV0pL2csICdcXFxcJDEnKVxufVxuXG4vKipcbiAqIEF0dGFjaCB0aGUga2V5cyBhcyBhIHByb3BlcnR5IG9mIHRoZSByZWdleHAuXG4gKlxuICogQHBhcmFtICB7UmVnRXhwfSByZVxuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcmV0dXJuIHtSZWdFeHB9XG4gKi9cbmZ1bmN0aW9uIGF0dGFjaEtleXMgKHJlLCBrZXlzKSB7XG4gIHJlLmtleXMgPSBrZXlzXG4gIHJldHVybiByZVxufVxuXG4vKipcbiAqIEdldCB0aGUgZmxhZ3MgZm9yIGEgcmVnZXhwIGZyb20gdGhlIG9wdGlvbnMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGZsYWdzIChvcHRpb25zKSB7XG4gIHJldHVybiBvcHRpb25zLnNlbnNpdGl2ZSA/ICcnIDogJ2knXG59XG5cbi8qKlxuICogUHVsbCBvdXQga2V5cyBmcm9tIGEgcmVnZXhwLlxuICpcbiAqIEBwYXJhbSAge1JlZ0V4cH0gcGF0aFxuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcmV0dXJuIHtSZWdFeHB9XG4gKi9cbmZ1bmN0aW9uIHJlZ2V4cFRvUmVnZXhwIChwYXRoLCBrZXlzKSB7XG4gIC8vIFVzZSBhIG5lZ2F0aXZlIGxvb2thaGVhZCB0byBtYXRjaCBvbmx5IGNhcHR1cmluZyBncm91cHMuXG4gIHZhciBncm91cHMgPSBwYXRoLnNvdXJjZS5tYXRjaCgvXFwoKD8hXFw/KS9nKVxuXG4gIGlmIChncm91cHMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAga2V5cy5wdXNoKHtcbiAgICAgICAgbmFtZTogaSxcbiAgICAgICAgcHJlZml4OiBudWxsLFxuICAgICAgICBkZWxpbWl0ZXI6IG51bGwsXG4gICAgICAgIG9wdGlvbmFsOiBmYWxzZSxcbiAgICAgICAgcmVwZWF0OiBmYWxzZSxcbiAgICAgICAgcGF0dGVybjogbnVsbFxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYXR0YWNoS2V5cyhwYXRoLCBrZXlzKVxufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiBhcnJheSBpbnRvIGEgcmVnZXhwLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSAgcGF0aFxuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gYXJyYXlUb1JlZ2V4cCAocGF0aCwga2V5cywgb3B0aW9ucykge1xuICB2YXIgcGFydHMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgIHBhcnRzLnB1c2gocGF0aFRvUmVnZXhwKHBhdGhbaV0sIGtleXMsIG9wdGlvbnMpLnNvdXJjZSlcbiAgfVxuXG4gIHZhciByZWdleHAgPSBuZXcgUmVnRXhwKCcoPzonICsgcGFydHMuam9pbignfCcpICsgJyknLCBmbGFncyhvcHRpb25zKSlcblxuICByZXR1cm4gYXR0YWNoS2V5cyhyZWdleHAsIGtleXMpXG59XG5cbi8qKlxuICogQ3JlYXRlIGEgcGF0aCByZWdleHAgZnJvbSBzdHJpbmcgaW5wdXQuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0gIHtBcnJheX0gIGtleXNcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7UmVnRXhwfVxuICovXG5mdW5jdGlvbiBzdHJpbmdUb1JlZ2V4cCAocGF0aCwga2V5cywgb3B0aW9ucykge1xuICB2YXIgdG9rZW5zID0gcGFyc2UocGF0aClcbiAgdmFyIHJlID0gdG9rZW5zVG9SZWdFeHAodG9rZW5zLCBvcHRpb25zKVxuXG4gIC8vIEF0dGFjaCBrZXlzIGJhY2sgdG8gdGhlIHJlZ2V4cC5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodHlwZW9mIHRva2Vuc1tpXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIGtleXMucHVzaCh0b2tlbnNbaV0pXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGF0dGFjaEtleXMocmUsIGtleXMpXG59XG5cbi8qKlxuICogRXhwb3NlIGEgZnVuY3Rpb24gZm9yIHRha2luZyB0b2tlbnMgYW5kIHJldHVybmluZyBhIFJlZ0V4cC5cbiAqXG4gKiBAcGFyYW0gIHtBcnJheX0gIHRva2Vuc1xuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gdG9rZW5zVG9SZWdFeHAgKHRva2Vucywgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuXG4gIHZhciBzdHJpY3QgPSBvcHRpb25zLnN0cmljdFxuICB2YXIgZW5kID0gb3B0aW9ucy5lbmQgIT09IGZhbHNlXG4gIHZhciByb3V0ZSA9ICcnXG4gIHZhciBsYXN0VG9rZW4gPSB0b2tlbnNbdG9rZW5zLmxlbmd0aCAtIDFdXG4gIHZhciBlbmRzV2l0aFNsYXNoID0gdHlwZW9mIGxhc3RUb2tlbiA9PT0gJ3N0cmluZycgJiYgL1xcLyQvLnRlc3QobGFzdFRva2VuKVxuXG4gIC8vIEl0ZXJhdGUgb3ZlciB0aGUgdG9rZW5zIGFuZCBjcmVhdGUgb3VyIHJlZ2V4cCBzdHJpbmcuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHRva2VuID0gdG9rZW5zW2ldXG5cbiAgICBpZiAodHlwZW9mIHRva2VuID09PSAnc3RyaW5nJykge1xuICAgICAgcm91dGUgKz0gZXNjYXBlU3RyaW5nKHRva2VuKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcHJlZml4ID0gZXNjYXBlU3RyaW5nKHRva2VuLnByZWZpeClcbiAgICAgIHZhciBjYXB0dXJlID0gdG9rZW4ucGF0dGVyblxuXG4gICAgICBpZiAodG9rZW4ucmVwZWF0KSB7XG4gICAgICAgIGNhcHR1cmUgKz0gJyg/OicgKyBwcmVmaXggKyBjYXB0dXJlICsgJykqJ1xuICAgICAgfVxuXG4gICAgICBpZiAodG9rZW4ub3B0aW9uYWwpIHtcbiAgICAgICAgaWYgKHByZWZpeCkge1xuICAgICAgICAgIGNhcHR1cmUgPSAnKD86JyArIHByZWZpeCArICcoJyArIGNhcHR1cmUgKyAnKSk/J1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhcHR1cmUgPSAnKCcgKyBjYXB0dXJlICsgJyk/J1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYXB0dXJlID0gcHJlZml4ICsgJygnICsgY2FwdHVyZSArICcpJ1xuICAgICAgfVxuXG4gICAgICByb3V0ZSArPSBjYXB0dXJlXG4gICAgfVxuICB9XG5cbiAgLy8gSW4gbm9uLXN0cmljdCBtb2RlIHdlIGFsbG93IGEgc2xhc2ggYXQgdGhlIGVuZCBvZiBtYXRjaC4gSWYgdGhlIHBhdGggdG9cbiAgLy8gbWF0Y2ggYWxyZWFkeSBlbmRzIHdpdGggYSBzbGFzaCwgd2UgcmVtb3ZlIGl0IGZvciBjb25zaXN0ZW5jeS4gVGhlIHNsYXNoXG4gIC8vIGlzIHZhbGlkIGF0IHRoZSBlbmQgb2YgYSBwYXRoIG1hdGNoLCBub3QgaW4gdGhlIG1pZGRsZS4gVGhpcyBpcyBpbXBvcnRhbnRcbiAgLy8gaW4gbm9uLWVuZGluZyBtb2RlLCB3aGVyZSBcIi90ZXN0L1wiIHNob3VsZG4ndCBtYXRjaCBcIi90ZXN0Ly9yb3V0ZVwiLlxuICBpZiAoIXN0cmljdCkge1xuICAgIHJvdXRlID0gKGVuZHNXaXRoU2xhc2ggPyByb3V0ZS5zbGljZSgwLCAtMikgOiByb3V0ZSkgKyAnKD86XFxcXC8oPz0kKSk/J1xuICB9XG5cbiAgaWYgKGVuZCkge1xuICAgIHJvdXRlICs9ICckJ1xuICB9IGVsc2Uge1xuICAgIC8vIEluIG5vbi1lbmRpbmcgbW9kZSwgd2UgbmVlZCB0aGUgY2FwdHVyaW5nIGdyb3VwcyB0byBtYXRjaCBhcyBtdWNoIGFzXG4gICAgLy8gcG9zc2libGUgYnkgdXNpbmcgYSBwb3NpdGl2ZSBsb29rYWhlYWQgdG8gdGhlIGVuZCBvciBuZXh0IHBhdGggc2VnbWVudC5cbiAgICByb3V0ZSArPSBzdHJpY3QgJiYgZW5kc1dpdGhTbGFzaCA/ICcnIDogJyg/PVxcXFwvfCQpJ1xuICB9XG5cbiAgcmV0dXJuIG5ldyBSZWdFeHAoJ14nICsgcm91dGUsIGZsYWdzKG9wdGlvbnMpKVxufVxuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgZ2l2ZW4gcGF0aCBzdHJpbmcsIHJldHVybmluZyBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqXG4gKiBBbiBlbXB0eSBhcnJheSBjYW4gYmUgcGFzc2VkIGluIGZvciB0aGUga2V5cywgd2hpY2ggd2lsbCBob2xkIHRoZVxuICogcGxhY2Vob2xkZXIga2V5IGRlc2NyaXB0aW9ucy4gRm9yIGV4YW1wbGUsIHVzaW5nIGAvdXNlci86aWRgLCBga2V5c2Agd2lsbFxuICogY29udGFpbiBgW3sgbmFtZTogJ2lkJywgZGVsaW1pdGVyOiAnLycsIG9wdGlvbmFsOiBmYWxzZSwgcmVwZWF0OiBmYWxzZSB9XWAuXG4gKlxuICogQHBhcmFtICB7KFN0cmluZ3xSZWdFeHB8QXJyYXkpfSBwYXRoXG4gKiBAcGFyYW0gIHtBcnJheX0gICAgICAgICAgICAgICAgIFtrZXlzXVxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgICAgICAgICAgICBbb3B0aW9uc11cbiAqIEByZXR1cm4ge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gcGF0aFRvUmVnZXhwIChwYXRoLCBrZXlzLCBvcHRpb25zKSB7XG4gIGtleXMgPSBrZXlzIHx8IFtdXG5cbiAgaWYgKCFpc2FycmF5KGtleXMpKSB7XG4gICAgb3B0aW9ucyA9IGtleXNcbiAgICBrZXlzID0gW11cbiAgfSBlbHNlIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7fVxuICB9XG5cbiAgaWYgKHBhdGggaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICByZXR1cm4gcmVnZXhwVG9SZWdleHAocGF0aCwga2V5cywgb3B0aW9ucylcbiAgfVxuXG4gIGlmIChpc2FycmF5KHBhdGgpKSB7XG4gICAgcmV0dXJuIGFycmF5VG9SZWdleHAocGF0aCwga2V5cywgb3B0aW9ucylcbiAgfVxuXG4gIHJldHVybiBzdHJpbmdUb1JlZ2V4cChwYXRoLCBrZXlzLCBvcHRpb25zKVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsImltcG9ydCB7IGQgfSBmcm9tICcuLi9oZWxwZXJzJ1xyXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSBcIi4vdGVtcGxhdGVcIjtcclxuaW1wb3J0IHsgcGFnZSB9IGZyb20gXCJwYWdlXCI7XHJcblxyXG5jb25zdCBtYWluQ29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjb250ZW50LW1haW4nKVxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDYXRlZ29yeSB7XHJcbiAgY29uc3RydWN0b3IgKCkge1xyXG4gICAgdGhpcy5lZGl0Q2F0ZWdvcnkgPSB0aGlzLmVkaXRDYXRlZ29yeS5iaW5kKHRoaXMpXHJcbiAgICB0aGlzLnNhdmUgPSB0aGlzLnNhdmUuYmluZCh0aGlzKVxyXG4gICAgdGhpcy5hZGRDYXRlZ29yeSA9IHRoaXMuYWRkQ2F0ZWdvcnkuYmluZCh0aGlzKVxyXG4gIH1cclxuICBzZWxlY3RBbGxDYXRlZ29yeSAoKSB7XHJcbiAgICByZXR1cm4gZmV0Y2goJ2h0dHA6Ly9sb2NhbGhvc3Q6NDAwMC9jYXRlZ29yeUFsbCcpXHJcbiAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgLnRoZW4ocmVzcG9uc2UpXHJcbiAgfVxyXG5cclxuICBzZWxlY3RPbkNhdGVnb3J5IChpZCkge1xyXG4gICAgcmV0dXJuIGZldGNoKGBodHRwOi8vbG9jYWxob3N0OjQwMDAvc2VsZWN0T25lQ2F0ZWdvcnkvJHtpZH1gKVxyXG4gICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgfVxyXG5cclxuICBzYXZlIChlKSB7XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGNvbnN0IG1lc3NhZ2UgPSBkLnF1ZXJ5U2VsZWN0b3IoJyNtZXNzYWdlJylcclxuICAgIGNvbnNvbGUubG9nKHtcclxuICAgICAgZGVzY3JpcGNpb24gOiBlLnRhcmdldFsxXS52YWx1ZSxcclxuICAgICAgbm9tX2VuY2FyZ2FkbyA6IGUudGFyZ2V0WzJdLnZhbHVlLFxyXG4gICAgICBpZCA6IGUudGFyZ2V0WzNdLnZhbHVlXHJcbiAgICB9KVxyXG4gICAgY29uc29sZS5sb2coZS50YXJnZXRbMl0udmFsdWUpXHJcbiAgICBmZXRjaChgaHR0cDovL2xvY2FsaG9zdDo0MDAwL2VkaXRDYXRlZ29yeS8ke2UudGFyZ2V0WzNdLnZhbHVlfWAse1xyXG4gICAgICBtZXRob2Q6ICdQVVQnLFxyXG4gICAgICBoZWFkZXJzIDogbmV3IEhlYWRlcnMoeydDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbid9KSxcclxuICAgICAgYm9keSA6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBkZXNjcmlwY2lvbiA6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNkZXNjcmlwY2lvbicpLnZhbHVlLFxyXG4gICAgICAgIG5vbV9lbmNhcmdhZG8gOiBlLnRhcmdldFsyXS52YWx1ZSxcclxuICAgICAgICBpZCA6IGUudGFyZ2V0WzNdLnZhbHVlXHJcbiAgICAgIH0pXHJcbiAgICB9KVxyXG4gICAgICAudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c1RleHQgPT09ICdPSycpIHtcclxuICAgICAgICAgIG1lc3NhZ2UuaW5uZXJIVE1MID0gJ1NlIGhhIGFncmVnYWRvIGxhIGNhdGVnb3JpYSdcclxuICAgICAgICAgIG1lc3NhZ2UuY2xhc3NMaXN0LnJlbW92ZSgnYmxvY2stb3Itbm90JylcclxuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICBtZXNzYWdlLmNsYXNzTGlzdC5hZGQoJ2Jsb2NrLW9yLW5vdCcpICAgXHJcbiAgICAgICAgICB9LCA1MDAwKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICAgLmNhdGNoKG1zZyA9PiBjb25zb2xlLmxvZyhtc2cpKVxyXG4gIH1cclxuXHJcbiAgYWRkQ2F0ZWdvcnkgKGUpIHtcclxuICAgIGNvbnN0IHdpbmRvd01vZGFsID0gZC5xdWVyeVNlbGVjdG9yKCcjd2luZG93TW9kYWwnKSxcclxuICAgICAgY29udGVudE1vZGFsID0gZC5xdWVyeVNlbGVjdG9yKCcjY29udGVudEZpcnN0JylcclxuICAgIGxldCBmb3JtdWxhcmlvID0gYDxoMiBjbGFzcz1cInRleHQtY2VudGVyXCI+QWdyZWdhbmRvIGNhdGVnb3JpYTwvaDI+XHJcbiAgICAgIDxmb3JtIGlkPVwiZm9ybUNhdGVnb3J5XCIgZW5jdHlwZT1cIm11bHRpcGFydC9mb3JtLWRhdGFcIj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiZm9ybS1ncm91cFwiPlxyXG4gICAgICAgICAgPGxhYmVsIGZvcj1cIm5vbWJyZVwiPk5vbWJyZTwvbGFiZWw+XHJcbiAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImZvcm0tY29udHJvbFwiIGlkPVwibm9tYnJlXCIgIG5hbWU9XCJub21icmVjXCI+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXBcIj5cclxuICAgICAgICAgIDxsYWJlbCBmb3I9XCJkZXNjcmlwY2lvblwiPkRlc2NyaXBjaW9uPC9sYWJlbD5cclxuICAgICAgICAgIDx0ZXh0YXJlYSBjbGFzcz1cImZvcm0tY29udHJvbFwiIG5hbWU9XCJkZXNjcmlwY2lvblwiIGlkPVwiZGVzY3JpcGNpb25cIiByb3dzPVwiM1wiPjwvdGV4dGFyZWE+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXBcIj5cclxuICAgICAgICAgIDxsYWJlbCBmb3I9XCJub21icmVcIj5Ob21icmU8L2xhYmVsPlxyXG4gICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJmb3JtLWNvbnRyb2xcIiBpZD1cIm5vbWJyZVwiIG5hbWU9XCJub21fZW5jYXJnYWRvXCI+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGlucHV0IHR5cGU9XCJzdWJtaXRcIiB2YWx1ZT1cIkVudmlhclwiIC8+XHJcbiAgICAgIDwvZm9ybT5cclxuICAgIGBcclxuICAgIGlmIChlLnRhcmdldC5pZCA9PT0gJ2FkZC1jYXRlZ29yeScpIHtcclxuICAgICAgd2luZG93TW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnYmxvY2stb3Itbm90JylcclxuICAgICAgY29udGVudE1vZGFsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgZm9ybXVsYXJpbylcclxuICAgICAgY29uc3QgZm9ybSA9IGQuZm9ybXNbMF1cclxuICAgICAgZm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBlID0+IHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgICBmZXRjaCgnaHR0cDovL2xvY2FsaG9zdDo0MDAwL2FkZENhdGVnb3J5Jyx7XHJcbiAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgIGhlYWRlcnMgOiBuZXcgSGVhZGVycyh7J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ30pLFxyXG4gICAgICAgICAgYm9keSA6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgbm9tYnJlYyA6IGUudGFyZ2V0WzBdLnZhbHVlLFxyXG4gICAgICAgICAgICBkZXNjcmlwY2lvbiA6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNkZXNjcmlwY2lvbicpLnZhbHVlLFxyXG4gICAgICAgICAgICBub21fZW5jYXJnYWRvIDogZS50YXJnZXRbMl0udmFsdWVcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c1RleHQgPT09ICdPSycpIHtcclxuICAgICAgICAgICAgICBtZXNzYWdlLmlubmVySFRNTCA9ICdTZSBoYSBhZ3JlZ2FkbyBsYSBjYXRlZ29yaWEnXHJcbiAgICAgICAgICAgICAgbWVzc2FnZS5jbGFzc0xpc3QucmVtb3ZlKCdibG9jay1vci1ub3QnKVxyXG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbWVzc2FnZS5jbGFzc0xpc3QuYWRkKCdibG9jay1vci1ub3QnKSAgIFxyXG4gICAgICAgICAgICAgIH0sIDUwMDApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICAuY2F0Y2gobXNnID0+IGNvbnNvbGUubG9nKG1zZykpXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBlZGl0Q2F0ZWdvcnkgKGUpIHtcclxuICAgIGNvbnN0IGNsb3NlTW9kYWwgPSBkLnF1ZXJ5U2VsZWN0b3IoJyNjbG9zZU1vZGFsJyksXHJcbiAgICAgIGNvbnRlbnRNb2RhbCA9IGQucXVlcnlTZWxlY3RvcignI2NvbnRlbnRGaXJzdCcpLFxyXG4gICAgICB3aW5kb3dNb2RhbCA9IGQucXVlcnlTZWxlY3RvcignI3dpbmRvd01vZGFsJylcclxuICAgIFxyXG4gICAgbGV0IGZvcm11bGFyaW8gPSAoYykgPT4gYDxoMiBjbGFzcz1cInRleHQtY2VudGVyXCI+RWRpdGFuZG8gY2F0ZWdvcmlhPC9oMj5cclxuICAgICAgPGZvcm0gaWQ9XCJmb3JtQ2F0ZWdvcnlcIiBlbmN0eXBlPVwibXVsdGlwYXJ0L2Zvcm0tZGF0YVwiPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtLWdyb3VwXCI+XHJcbiAgICAgICAgICA8bGFiZWwgZm9yPVwibm9tYnJlXCI+Tm9tYnJlPC9sYWJlbD5cclxuICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiZm9ybS1jb250cm9sXCIgaWQ9XCJub21icmVcIiBwbGFjZWhvbGRlcj1cIm5hbWVAZXhhbXBsZS5jb21cIiB2YWx1ZT1cIiR7Yy5ub21icmVjfVwiIGRpc2FibGVkPlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtLWdyb3VwXCI+XHJcbiAgICAgICAgICA8bGFiZWwgZm9yPVwiZGVzY3JpcGNpb25cIj5EZXNjcmlwY2lvbjwvbGFiZWw+XHJcbiAgICAgICAgICA8dGV4dGFyZWEgY2xhc3M9XCJmb3JtLWNvbnRyb2xcIiBuYW1lPVwiZGVzY3JpcGNpb25cIiBpZD1cImRlc2NyaXBjaW9uXCIgcm93cz1cIjNcIj4ke2MuZGVzY3JpcGNpb259PC90ZXh0YXJlYT5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiZm9ybS1ncm91cFwiPlxyXG4gICAgICAgICAgPGxhYmVsIGZvcj1cImVuY2FyZ2Fkb1wiPk5vbWJyZSBlbmNhcmdhZG88L2xhYmVsPlxyXG4gICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5vbV9lbmNhcmdhZG9cIiBjbGFzcz1cImZvcm0tY29udHJvbFwiIGlkPVwiZW5jYXJnYWRvXCIgcGxhY2Vob2xkZXI9XCJuYW1lQGV4YW1wbGUuY29tXCIgdmFsdWU9XCIke2Mubm9tX2VuY2FyZ2Fkb31cIj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIHZhbHVlPVwiJHtjLmlkfVwiIGlkPVwiaWRcIj5cclxuICAgICAgICA8aW5wdXQgdHlwZT1cInN1Ym1pdFwiIHZhbHVlPVwiRW52aWFyXCIgLz5cclxuICAgICAgPC9mb3JtPmBcclxuXHJcbiAgICAvL0RldGVjdG8gc2kgZXMgZXMgZWwgYm90b24sIHBhcmEgcG9kZXIgYWJyaXIgZWwgbW9kYWxcclxuICAgIGlmKGUudGFyZ2V0LmlkID09PSAnZWRpdC1jYXRlZ29yeScpe1xyXG4gICAgICB3aW5kb3dNb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCdibG9jay1vci1ub3QnKVxyXG4gICAgICBjb25zdCBpZCA9IGUudGFyZ2V0LmRhdGFzZXQuaWQ7XHJcbiAgICAgIC8vY29udGVudE1vZGFsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgZm9ybXVsYXJpbyhjKSlcclxuICAgICAgdGhpcy5zZWxlY3RPbkNhdGVnb3J5KGlkKVxyXG4gICAgICAudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpXHJcbiAgICAgICAgY29udGVudE1vZGFsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgZm9ybXVsYXJpbyhyZXNwb25zZSkpXHJcbiAgICAgICAgZm9ybUNhdGVnb3J5LmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIHRoaXMuc2F2ZSlcclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIC8vQ2llcnJvIGVsIG1vZGFsXHJcbiAgICBjbG9zZU1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcclxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICAgIHdpbmRvd01vZGFsLmNsYXNzTGlzdC5hZGQoJ2Jsb2NrLW9yLW5vdCcpXHJcbiAgICAgIGNvbnRlbnRNb2RhbC5pbm5lckhUTUwgPSBcIlwiXHJcbiAgICB9KVxyXG4gIH1cclxuICByZW5kZXIgKCkge1xyXG4gICAgZmV0Y2goJ2h0dHA6Ly9sb2NhbGhvc3Q6NDAwMC9jYXRlZ29yeUFsbCcpXHJcbiAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgLnRoZW4oY2F0ZWdvcnkgPT4ge1xyXG4gICAgICAgIG1haW5Db250ZW50Lmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgdGVtcGxhdGUoY2F0ZWdvcnkpKVxyXG4gICAgICB9KVxyXG5cclxuICAgIG1haW5Db250ZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5lZGl0Q2F0ZWdvcnkpXHJcbiAgICBtYWluQ29udGVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYWRkQ2F0ZWdvcnkpXHJcbiAgfVxyXG59IiwiaW1wb3J0IGxheW91dCBmcm9tIFwiLi4vbGF5b3V0L1wiO1xyXG5leHBvcnQgZGVmYXVsdCAoY2F0ZWdvcnkpID0+IHtcclxuICBsZXQgZWxlbWVudCA9IGBcclxuICA8c2VjdGlvbiBjbGFzcz1cImhlYWRlclwiPlxyXG4gICAgPGJ1dHRvbiBjbGFzcz1cImhlYWRlci1hZGRcIiBpZD1cImFkZC1jYXRlZ29yeVwiPkFncmVnYXI8L2J1dHRvbj5cclxuICA8L3NlY3Rpb24+XHJcbiAgPHRhYmxlIGNsYXNzPVwidGFibGUgdGFibGUtc3RyaXBlZCB0YWJsZS1ob3ZlclwiPlxyXG4gICAgPHRoZWFkPlxyXG4gICAgICA8dHI+XHJcbiAgICAgICAgPHRoIHNjb3BlPVwiY29sXCI+Tm9tYnJlPC90aD5cclxuICAgICAgICA8dGggc2NvcGU9XCJjb2xcIj5EZXNjcmlwY2lvbjwvdGg+XHJcbiAgICAgICAgPHRoIHNjb3BlPVwiY29sXCI+RW5jYXJnYWRvPC90aD5cclxuICAgICAgICA8dGggc2NvcGU9XCJjb2xcIj4gPC90aD5cclxuICAgICAgPC90cj5cclxuICAgIDwvdGhlYWQ+XHJcbiAgICA8dGJvZHk+XHJcbiAgICAgICR7Y2F0ZWdvcnkubWFwKGMgPT4gYDx0cj5cclxuICAgICAgPHRkPiR7Yy5ub21icmVjfTwvdGQ+XHJcbiAgICAgIDx0ZD4ke2MuZGVzY3JpcGNpb259PC90ZD5cclxuICAgICAgPHRkPiR7Yy5ub21fZW5jYXJnYWRvfTwvdGQ+XHJcbiAgICAgIDx0ZD5cclxuICAgICAgICA8YnV0dG9uIGRhdGEtaWQ9XCIke2MuaWR9XCIgaWQ9XCJlZGl0LWNhdGVnb3J5XCI+RWRpdGFyPC9idXR0b24+XHJcbiAgICAgIDwvdGQ+XHJcbiAgICAgIDwvdHI+YCkuam9pbignJyl9XHJcbiAgICA8L3Rib2R5PlxyXG4gIDwvdGFibGU+XHJcbiAgPHNlY3Rpb24gaWQ9XCJ3aW5kb3dNb2RhbFwiIGNsYXNzPVwid2luZG93LW1vZGFsIGJsb2NrLW9yLW5vdFwiPlxyXG4gICAgPGRpdiBjbGFzcz1cIm1lc3NhZ2UgYmxvY2stb3Itbm90XCIgaWQ9XCJtZXNzYWdlXCI+PC9kaXY+XHJcbiAgICA8YXJ0aWNsZSBpZD1cImNvbnRlbnRNb2RhbFwiIGNsYXNzPVwiY29udGVudC1tb2RhbFwiPlxyXG4gICAgICA8YSBocmVmPVwiI1wiIGlkPVwiY2xvc2VNb2RhbFwiIGNsYXNzPVwiY2xvc2UtbW9kYWxcIj4gWCA8L2E+XHJcbiAgICAgIDxkaXYgaWQ9XCJjb250ZW50Rmlyc3RcIj48L2Rpdj5cclxuICAgIDwvYXJ0aWNsZT5cclxuICA8L3NlY3Rpb24+YFxyXG4gIHJldHVybiBsYXlvdXQoZWxlbWVudClcclxufSIsIlwidXNlIHN0cmljdFwiO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJaUlzSW1acGJHVWlPaUpwYm1SbGVDNXFjeUlzSW5OdmRYSmpaWE5EYjI1MFpXNTBJanBiWFgwPSIsImltcG9ydCB7IGQsIGMgfSBmcm9tIFwiLi4vaGVscGVyc1wiO1xyXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSBcIi4vdGVtcGxhdGVcIjtcclxuaW1wb3J0IENhdGVnb3J5IGZyb20gXCIuLi9jYXRlZ29yeS9pbmRleFwiO1xyXG5cclxuY29uc3QgbWFpbkNvbnRlbnQgPSBkLnF1ZXJ5U2VsZWN0b3IoJyNjb250ZW50LW1haW4nKSxcclxuICBjYXRlZ29yeSA9IG5ldyBDYXRlZ29yeSgpXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEaXNoZXMge1xyXG4gIGNvbnN0cnVjdG9yICgpIHtcclxuICAgIHRoaXMuZGVsZXRlRGlzaGVzID0gdGhpcy5kZWxldGVEaXNoZXMuYmluZCh0aGlzKVxyXG4gICAgdGhpcy5hZGREaXNoZXMgPSB0aGlzLmFkZERpc2hlcy5iaW5kKHRoaXMpXHJcbiAgICB0aGlzLmVkaXREaXNoZXMgPSB0aGlzLmVkaXREaXNoZXMuYmluZCh0aGlzKVxyXG4gIH1cclxuXHJcbiAgYWRkRGlzaGVzIChlKSB7XHJcbiAgICBjb25zdCBjb250ZW50Rmlyc3QgPSBkLnF1ZXJ5U2VsZWN0b3IoJyNjb250ZW50Rmlyc3QnKSxcclxuICAgICAgd2luZG93TW9kYWwgPSBkLnF1ZXJ5U2VsZWN0b3IoJyN3aW5kb3dNb2RhbCcpLFxyXG4gICAgICBjbG9zZU1vZGFsID0gZC5xdWVyeVNlbGVjdG9yKFwiI2Nsb3NlTW9kYWxcIilcclxuICAgIGxldCBmb3JtdWxhcmlvID0gKGNhdGVnb3J5KSA9PiBgPGgyIGNsYXNzPVwidGV4dC1jZW50ZXJcIj5BZ3JlZ2FuZG8gcGxhdG88L2gyPlxyXG4gICAgICA8Zm9ybSBpZD1cImZvcm1EaXNoZXNcIiBlbmN0eXBlPVwibXVsdGlwYXJ0L2Zvcm0tZGF0YVwiPlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtLWdyb3VwXCI+XHJcbiAgICAgICAgICA8bGFiZWwgZm9yPVwibm9tYnJlLXBsYXRvXCI+Tm9tYnJlPC9sYWJlbD5cclxuICAgICAgICAgIDxpbnB1dCBpZD1cIm5vbWJyZS1wbGF0b1wiIGNsYXNzPVwiZm9ybS1jb250cm9sXCIgbmFtZT1cIm5vbWJyZXBcIiB0eXBlPVwidGV4dFwiIHBsYWNlaG9sZGVyPVwiUGxhdG9zIGFtZXJpY2Fub3NcIj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiZm9ybS1ncm91cFwiPlxyXG4gICAgICAgICAgPGxhYmVsIGZvcj1cIm5vbWJyZS1wbGF0b1wiPk5vbWJyZTwvbGFiZWw+XHJcbiAgICAgICAgICA8dGV4dGFyZWEgaWQ9XCJkZXNjcmlwY2lvbi1wbGF0b1wiIGNsYXNzPVwiZm9ybS1jb250cm9sXCIgbmFtZT1cImRlc2NyaXBjaW9uXCIsIHJvd3M9XCIzXCIsIHBsYWNlaG9sZGVyPVwiRXN0YSByZWNldGEgLi4uLlwiPjwvdGV4dGFyZWE+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXBcIj5cclxuICAgICAgICAgIDxsYWJlbCBmb3I9XCJpbmxpbmVGb3JtQ3VzdG9tU2VsZWN0XCIgY2xhc3M9XCJtci1zbS0yXCI+RGlmaWN1bHRhZDwvbGFiZWw+XHJcbiAgICAgICAgICA8c2VsZWN0IGNsYXNzPVwiY3VzdG9tLXNlbGVjdCBtYi0yIG1yLXNtLTIgbWItc20tMFwiIGlkPVwiaW5saW5lRm9ybUN1c3RvbVNlbGVjdFwiIG5hbWU9XCJkaWZpY3VsdGFkXCI+XHJcbiAgICAgICAgICAgIDxvcHRpb24gc2VsZWN0ZWQ+IC0gLSAtPC9vcHRpb24+XHJcbiAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCIxXCIgbmFtZT1cImRpZmljdWx0YWQtMVwiPjE8L29wdGlvbj5cclxuICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIjJcIiBuYW1lPVwiZGlmaWN1bHRhZC0yXCI+Mjwvb3B0aW9uPlxyXG4gICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwiM1wiIG5hbWU9XCJkaWZpY3VsdGFkLTNcIj4zPC9vcHRpb24+XHJcbiAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCI0XCIgbmFtZT1cImRpZmljdWx0YWQtNFwiPjQ8L29wdGlvbj5cclxuICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIjVcIiBuYW1lPVwiZGlmaWN1bHRhZC01XCI+NTwvb3B0aW9uPlxyXG4gICAgICAgICAgPC9zZWxlY3Q+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXBcIj5cclxuICAgICAgICAgIDxsYWJlbCBmb3I9XCJmb3RvLWRpc2hlc1wiPkZvdG88L2xhYmVsPlxyXG4gICAgICAgICAgPGlucHV0IHR5cGU9XCJmaWxlXCIgaWQ9XCJmb3RvLWRpc2hlc1wiIGNsYXNzPVwiZm9ybS1jb250cm9sXCIgbmFtZT1cInBob3RvXCIgYWNjZXB0PVwiaW1hZ2UvKlwiPlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtLWdyb3VwXCI+XHJcbiAgICAgICAgICA8bGFiZWwgaWQ9XCJwcmVjaW8tcGxhdG9cIj5QbGF0bzwvbGFiZWw+XHJcbiAgICAgICAgICA8aW5wdXQgaWQ9XCJwcmVjaW8tcGxhdG9cIiBjbGFzcz1cImZvcm0tY29udHJvbFwiIG5hbWU9XCJwcmVjaW9cIiB0eXBlPVwidGV4dFwiLCBwbGFjZWhvbGRlcj1cIjEwLjAwXCI+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXBcIiBuYW1lPVwiY2F0ZWdvcmlhXCI+XHJcbiAgICAgICAgICA8c2VsZWN0IGNsYXNzPVwiZm9ybS1jb250cm9sXCI+XHJcbiAgICAgICAgICAgIDxvcHRpb24gc2VsZWN0ZWQ+LSAtIC08L29wdGlvbj5cclxuICAgICAgICAgICAgJHtjYXRlZ29yeS5tYXAoYyA9PiBgXHJcbiAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIiR7Yy5ub21icmVjfVwiPiR7Yy5ub21icmVjfTwvb3B0aW9uPmBcclxuICAgICAgICAgICAgKX1cclxuICAgICAgICAgIDwvc2VsZWN0PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4gYnRuLXByaW1hcnlcIiB0eXBlPVwic3VibWl0XCI+R3VhcmRhcjwvYnV0dG9uPlxyXG4gICAgICAgIDwhLS08aW5wdXQgdHlwZT1cInN1Ym1pdFwiIHZhbHVlPVwic2VuZFwiIC8+LS0+XHJcbiAgICAgIDwvZm9ybT5gXHJcbiAgICBpZiAoZS50YXJnZXQuaWQgPT09ICdhZGQtZGlzaGVzJykge1xyXG4gICAgICB3aW5kb3dNb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCdibG9jay1vci1ub3QnKVxyXG4gICAgICBmZXRjaCgnaHR0cDovL2xvY2FsaG9zdDo0MDAwL2NhdGVnb3J5QWxsJylcclxuICAgICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgICAgICAgLnRoZW4oY2F0ZWdvcnkgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coY2F0ZWdvcnkpXHJcbiAgICAgICAgICBjb250ZW50Rmlyc3QuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBmb3JtdWxhcmlvKGNhdGVnb3J5KSlcclxuICAgICAgICAgIGNvbnN0IGZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImZvcm1EaXNoZXNcIilcclxuICAgICAgICAgIGZvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgZSA9PiB7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IG5ldyBGb3JtRGF0YSgpXHJcbiAgICAgICAgICAgIGZvcm1EYXRhLmFwcGVuZCgnbm9tYnJlcCcsIGUudGFyZ2V0WzBdLnZhbHVlKVxyXG4gICAgICAgICAgICBmb3JtRGF0YS5hcHBlbmQoJ2Rlc2NyaXBjaW9uJywgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2Rlc2NyaXBjaW9uLXBsYXRvJykudmFsdWUpXHJcbiAgICAgICAgICAgIGZvcm1EYXRhLmFwcGVuZCgnZGlmaWN1bHRhZCcsIGUudGFyZ2V0WzJdLnZhbHVlKVxyXG4gICAgICAgICAgICBmb3JtRGF0YS5hcHBlbmQoICdwaG90bycsIGUudGFyZ2V0WzNdLmZpbGVzWzBdLCAnbG9nby5wbmcnIClcclxuICAgICAgICAgICAgZm9ybURhdGEuYXBwZW5kKCdwcmVjaW8nLCBlLnRhcmdldFs0XS52YWx1ZSlcclxuICAgICAgICAgICAgZm9ybURhdGEuYXBwZW5kKCdjYXRlZ29yaWEnLCBlLnRhcmdldFs1XS52YWx1ZSlcclxuXHJcbiAgICAgICAgICAgIGZldGNoKCdodHRwOi8vbG9jYWxob3N0OjQwMDAvYWRkRGlzaGVzJywge1xyXG4gICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgIGJvZHkgOiBmb3JtRGF0YVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgICAgICAgICAgIGMocmVzcG9uc2UpXHJcbiAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBjbG9zZU1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICBjb250ZW50Rmlyc3QuaW5uZXJIVE1MID0gXCJcIlxyXG4gICAgICB3aW5kb3dNb2RhbC5jbGFzc0xpc3QuYWRkKCdibG9jay1vci1ub3QnKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIHNlbGVjdE9uZURpc2hlIChpZCkge1xyXG4gICAgcmV0dXJuIGZldGNoKGBodHRwOi8vbG9jYWxob3N0OjQwMDAvZ2V0T25lRGlzaGUvJHtpZH1gKVxyXG4gICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgfVxyXG5cclxuICBlZGl0RGlzaGVzIChlKSB7XHJcbiAgICBjb25zdCBjb250ZW50Rmlyc3QgPSBkLnF1ZXJ5U2VsZWN0b3IoJyNjb250ZW50Rmlyc3QnKSxcclxuICAgICAgd2luZG93TW9kYWwgPSBkLnF1ZXJ5U2VsZWN0b3IoJyN3aW5kb3dNb2RhbCcpLFxyXG4gICAgICBjbG9zZU1vZGFsID0gZC5xdWVyeVNlbGVjdG9yKFwiI2Nsb3NlTW9kYWxcIiksXHJcbiAgICAgIGlkID0gZS50YXJnZXQuZGF0YXNldC5pZFxyXG4gICAgaWYgKGUudGFyZ2V0LmlkID09PSAnZWRpdC1kaXNoZXMnKSB7XHJcbiAgICAgIHdpbmRvd01vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ2Jsb2NrLW9yLW5vdCcpXHJcblxyXG4gICAgICBsZXQgZm9ybXVsYXJpbyA9IChkaXNoZSkgPT4gYDxoMiBjbGFzcz1cInRleHQtY2VudGVyXCI+QWdyZWdhbmRvIHBsYXRvPC9oMj5cclxuICAgICAgPGZvcm0gaWQ9XCJmb3JtRGlzaGVzXCIgZW5jdHlwZT1cIm11bHRpcGFydC9mb3JtLWRhdGFcIj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiZm9ybS1ncm91cFwiPlxyXG4gICAgICAgICAgPGxhYmVsIGZvcj1cIm5vbWJyZS1wbGF0b1wiPk5vbWJyZTwvbGFiZWw+XHJcbiAgICAgICAgICA8aW5wdXQgaWQ9XCJub21icmUtcGxhdG9cIiBjbGFzcz1cImZvcm0tY29udHJvbFwiIG5hbWU9XCJub21icmVwXCIgdHlwZT1cInRleHRcIiBwbGFjZWhvbGRlcj1cIlBsYXRvcyBhbWVyaWNhbm9zXCIgdmFsdWU9XCIke2Rpc2hlLm5vbWJyZXB9XCI+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXBcIj5cclxuICAgICAgICAgIDxsYWJlbCBmb3I9XCJub21icmUtcGxhdG9cIj5Ob21icmU8L2xhYmVsPlxyXG4gICAgICAgICAgPHRleHRhcmVhIGlkPVwiZGVzY3JpcGNpb24tcGxhdG9cIiBjbGFzcz1cImZvcm0tY29udHJvbFwiIG5hbWU9XCJkZXNjcmlwY2lvblwiLCByb3dzPVwiM1wiLCBwbGFjZWhvbGRlcj1cIkVzdGEgcmVjZXRhIC4uLi5cIj4ke2Rpc2hlLmRlc2NyaXBjaW9ufTwvdGV4dGFyZWE+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXBcIj5cclxuICAgICAgICAgIDxsYWJlbCBmb3I9XCJpbmxpbmVGb3JtQ3VzdG9tU2VsZWN0XCIgY2xhc3M9XCJtci1zbS0yXCI+RGlmaWN1bHRhZDwvbGFiZWw+XHJcbiAgICAgICAgICA8c2VsZWN0IGNsYXNzPVwiY3VzdG9tLXNlbGVjdCBtYi0yIG1yLXNtLTIgbWItc20tMFwiIGlkPVwiaW5saW5lRm9ybUN1c3RvbVNlbGVjdFwiIG5hbWU9XCJkaWZpY3VsdGFkXCI+XHJcbiAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCIke2Rpc2hlLmRpZmljdWx0YWR9XCIgc2VsZWN0ZWQ+JHtkaXNoZS5kaWZpY3VsdGFkfTwvb3B0aW9uPlxyXG4gICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwiMVwiIG5hbWU9XCJkaWZpY3VsdGFkLTFcIj4xPC9vcHRpb24+XHJcbiAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCIyXCIgbmFtZT1cImRpZmljdWx0YWQtMlwiPjI8L29wdGlvbj5cclxuICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIjNcIiBuYW1lPVwiZGlmaWN1bHRhZC0zXCI+Mzwvb3B0aW9uPlxyXG4gICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwiNFwiIG5hbWU9XCJkaWZpY3VsdGFkLTRcIj40PC9vcHRpb24+XHJcbiAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCI1XCIgbmFtZT1cImRpZmljdWx0YWQtNVwiPjU8L29wdGlvbj5cclxuICAgICAgICAgIDwvc2VsZWN0PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtLWdyb3VwXCI+XHJcbiAgICAgICAgICA8bGFiZWwgZm9yPVwiZm90by1kaXNoZXNcIj5Gb3RvPC9sYWJlbD5cclxuICAgICAgICAgIDxpbnB1dCB0eXBlPVwiZmlsZVwiIGlkPVwiZm90by1kaXNoZXNcIiBjbGFzcz1cImZvcm0tY29udHJvbFwiIG5hbWU9XCJwaG90b1wiIGFjY2VwdD1cImltYWdlLypcIj5cclxuICAgICAgICAgIDwhLS08aW1nIHNyYz1cImltYWdlcy9wbGF0b3MvJHtkaXNoZS5mb3RvfVwiIC8+LS0+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXBcIj5cclxuICAgICAgICAgIDxsYWJlbCBpZD1cInByZWNpby1wbGF0b1wiPlBsYXRvPC9sYWJlbD5cclxuICAgICAgICAgIDxpbnB1dCBpZD1cInByZWNpby1wbGF0b1wiIGNsYXNzPVwiZm9ybS1jb250cm9sXCIgbmFtZT1cInByZWNpb1wiIHR5cGU9XCJ0ZXh0XCIsIHBsYWNlaG9sZGVyPVwiMTAuMDBcIiB2YWx1ZT1cIiR7ZGlzaGUucHJlY2lvfVwiPlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtLWdyb3VwXCIgbmFtZT1cImNhdGVnb3JpYVwiPlxyXG4gICAgICAgICAgPHNlbGVjdCBjbGFzcz1cImZvcm0tY29udHJvbFwiPlxyXG4gICAgICAgICAgICA8b3B0aW9uIHNlbGVjdGVkPiR7ZGlzaGUubm9tYnJlY308L29wdGlvbj5cclxuICAgICAgICAgIDwvc2VsZWN0PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4gYnRuLXByaW1hcnlcIiB0eXBlPVwic3VibWl0XCI+R3VhcmRhcjwvYnV0dG9uPlxyXG4gICAgICAgIDwhLS08aW5wdXQgdHlwZT1cInN1Ym1pdFwiIHZhbHVlPVwic2VuZFwiIC8+LS0+XHJcbiAgICAgIDwvZm9ybT5gXHJcbiAgICAgIHRoaXMuc2VsZWN0T25lRGlzaGUoaWQpXHJcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICAgICAgY29udGVudEZpcnN0Lmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgZm9ybXVsYXJpbyhyZXNwb25zZVswXSkpXHJcbiAgICAgICAgfSlcclxuICAgICAgLypjYXRlZ29yeS5zZWxlY3RBbGxDYXRlZ29yeSgpXHJcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICAgICAgYyhyZXNwb25zZSlcclxuICAgICAgICB9KSovXHJcbiAgICB9XHJcbiAgICBjbG9zZU1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICBjb250ZW50Rmlyc3QuaW5uZXJIVE1MID0gXCJcIlxyXG4gICAgICB3aW5kb3dNb2RhbC5jbGFzc0xpc3QuYWRkKCdibG9jay1vci1ub3QnKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIGRlbGV0ZURpc2hlcyAoZSkge1xyXG4gICAgaWYgKGUudGFyZ2V0LmlkID09PSAnZGVsZXRlLWRpc2hlcycpIHtcclxuICAgICAgY29uc3QgaWQgPSBlLnRhcmdldC5hdHRyaWJ1dGVzWzFdLm5vZGVWYWx1ZTtcclxuICAgICAgZmV0Y2goYGh0dHA6Ly9sb2NhbGhvc3Q6NDAwMC9kZWxldGVEaXNoZXMvJHtpZH1gLHtcclxuICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxyXG4gICAgICAgIGhlYWRlcnMgOiBuZXcgSGVhZGVycyh7J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ30pXHJcbiAgICAgIH0pXHJcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coIHJlc3BvbnNlIClcclxuICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNUZXh0ID09PSAnT0snKSB7XHJcbiAgICAgICAgICAgIG1lc3NhZ2UuaW5uZXJIVE1MID0gJ1NlIGhhIGVsaW1pbmFkbyBjb24gZXhpdG8gbGEgY2F0ZWdvcmlhJ1xyXG4gICAgICAgICAgICBtZXNzYWdlLmNsYXNzTGlzdC5hZGQoJ2RlbGV0ZScpXHJcbiAgICAgICAgICAgIG1lc3NhZ2UuY2xhc3NMaXN0LnJlbW92ZSgnYmxvY2stb3Itbm90JylcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgbWVzc2FnZS5jbGFzc0xpc3QuYWRkKCdibG9jay1vci1ub3QnKSAgIFxyXG4gICAgICAgICAgICB9LCA1MDAwKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKG1ncyA9PiBjb25zb2xlLmxvZyhtZ3MpKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmVuZGVyICgpIHtcclxuICAgIGZldGNoKCdodHRwOi8vbG9jYWxob3N0OjQwMDAvZGlzaGVzQWxsJylcclxuICAgICAgLnRoZW4oIHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSApXHJcbiAgICAgIC50aGVuKGRpc2hlcyA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coIGRpc2hlcyApXHJcbiAgICAgICAgbWFpbkNvbnRlbnQuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCB0ZW1wbGF0ZShkaXNoZXMpKVxyXG4gICAgICB9KVxyXG4gICAgICAuY2F0Y2gobXNnID0+IGNvbnNvbGUubG9nKG1zZykpXHJcbiAgICBcclxuICAgIG1haW5Db250ZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5kZWxldGVEaXNoZXMpXHJcbiAgICBtYWluQ29udGVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYWRkRGlzaGVzKVxyXG4gICAgbWFpbkNvbnRlbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmVkaXREaXNoZXMpXHJcbiAgfVxyXG59IiwiaW1wb3J0IGxheW91dCBmcm9tIFwiLi4vbGF5b3V0L2luZGV4XCI7XHJcbmV4cG9ydCBkZWZhdWx0IChkaXNoZXMpID0+IHtcclxuICBsZXQgZWwgPSBgXHJcbiAgICA8c2VjdGlvbiBjbGFzcz1cImhlYWRlclwiPlxyXG4gICAgICA8YnV0dG9uIGNsYXNzPVwiaGVhZGVyLWFkZCBidG4gYnRuLXByaW1hcnlcIiBpZD1cImFkZC1kaXNoZXNcIj5BZ3JlZ2FyPC9idXR0b24+XHJcbiAgICA8L3NlY3Rpb24+XHJcbiAgICA8dGFibGUgY2xhc3M9XCJ0YWJsZSB0YWJsZS1zdHJpcGVkIHRhYmxlLWhvdmVyXCI+XHJcbiAgICAgIDx0aGVhZD5cclxuICAgICAgICA8dHI+XHJcbiAgICAgICAgICA8dGggc2NvcGU9XCJjb2xcIj5Ob21icmU8L3RoPlxyXG4gICAgICAgICAgPHRoIHNjb3BlPVwiY29sXCI+RGVzY3JpcGNpb248L3RoPlxyXG4gICAgICAgICAgPHRoIHNjb3BlPVwiY29sXCI+UHJlY2lvPC90aD5cclxuICAgICAgICAgIDx0aCBzY29wZT1cImNvbFwiPkRpZmljdWx0YWQ8L3RoPlxyXG4gICAgICAgICAgPHRoIHNjb3BlPVwiY29sXCI+Rm90bzwvdGg+XHJcbiAgICAgICAgICA8dGggc2NvcGU9XCJjb2xcIj4gPC90aD5cclxuICAgICAgICAgIDx0aCBzY29wZT1cImNvbFwiPiA8L3RoPlxyXG4gICAgICAgIDwvdHI+XHJcbiAgICAgIDwvdGhlYWQ+XHJcbiAgICAgIDx0Ym9keT5cclxuICAgICAgICAke2Rpc2hlcy5tYXAoZCA9PiBgPHRyPlxyXG4gICAgICAgIDx0ZD4ke2Qubm9tYnJlcH08L3RkPlxyXG4gICAgICAgIDx0ZD4ke2QuZGVzY3JpcGNpb259PC90ZD5cclxuICAgICAgICA8dGQ+JHtkLnByZWNpb308L3RkPlxyXG4gICAgICAgIDx0ZD4ke2QuZGlmaWN1bHRhZH08L3RkPlxyXG4gICAgICAgIDx0ZD48aW1nIHNyYz1cImltYWdlcy9wbGF0b3MvJHtkLmZvdG99XCIgLz48L3RkPlxyXG4gICAgICAgIDx0ZD5cclxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4gYnRuLXN1Y2Nlc3NcIiBkYXRhLWlkPVwiJHtkLmlkfVwiIGlkPVwiZWRpdC1kaXNoZXNcIj5FZGl0YXI8L2J1dHRvbj5cclxuICAgICAgICA8L3RkPlxyXG4gICAgICAgIDx0ZD5cclxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4gYnRuLWRhbmdlclwiIGRhdGEtaWQ9XCIke2QuaWR9XCIgaWQ9XCJkZWxldGUtZGlzaGVzXCI+RWxpbWluYXI8L2J1dHRvbj5cclxuICAgICAgICA8L3RkPlxyXG4gICAgICAgIDwvdHI+YCkuam9pbignJyl9XHJcbiAgICAgIDwvdGJvZHk+XHJcbiAgICA8L3RhYmxlPlxyXG4gICAgPHNlY3Rpb24gaWQ9XCJ3aW5kb3dNb2RhbFwiIGNsYXNzPVwid2luZG93LW1vZGFsIGJsb2NrLW9yLW5vdFwiPlxyXG4gICAgICA8ZGl2IGNsYXNzPVwibWVzc2FnZSBibG9jay1vci1ub3RcIiBpZD1cIm1lc3NhZ2VcIj48L2Rpdj5cclxuICAgICAgPGFydGljbGUgaWQ9XCJjb250ZW50TW9kYWxcIiBjbGFzcz1cImNvbnRlbnQtbW9kYWxcIj5cclxuICAgICAgICA8YSBocmVmPVwiI1wiIGlkPVwiY2xvc2VNb2RhbFwiIGNsYXNzPVwiY2xvc2UtbW9kYWxcIj4gWCA8L2E+XHJcbiAgICAgICAgPGRpdiBpZD1cImNvbnRlbnRGaXJzdFwiPjwvZGl2PlxyXG4gICAgICA8L2FydGljbGU+XHJcbiAgICA8L3NlY3Rpb24+YFxyXG4gICAgcmV0dXJuIGxheW91dChlbClcclxufSIsImNvbnN0IGMgPSBjb25zb2xlLmxvZyxcclxuICBkID0gZG9jdW1lbnRcclxuXHJcbmV4cG9ydCB7XHJcbiAgYyxcclxuICBkXHJcbn0iLCJpbXBvcnQgQ2F0ZWdvcnkgZnJvbSAnLi9jYXRlZ29yeS9pbmRleCdcclxuaW1wb3J0IERpc2hlcyBmcm9tIFwiLi9kaXNoZXMvaW5kZXhcIlxyXG5pbXBvcnQgRXZlbnRzIGZyb20gXCIuL2V2ZW50cy9pbmRleFwiXHJcbmltcG9ydCBDb21tZW50cyBmcm9tIFwiLi9jb21tZW50cy9pbmRleFwiO1xyXG5pbXBvcnQgcGFnZSBmcm9tICdwYWdlJ1xyXG5cclxuY29uc3QgbWFpbkNvbnRlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY29udGVudC1tYWluJylcclxuXHJcbmNvbnN0IGNhdGVnb3J5ID0gbmV3IENhdGVnb3J5KCksXHJcbiAgZGlzaGVzID0gbmV3IERpc2hlcygpXHJcbnBhZ2UoJy9jYXRlZ29yaWVzJywgKGN0eCwgbmV4dCkgPT4ge1xyXG4gIG1haW5Db250ZW50LmlubmVySFRNTCA9ICcnXHJcbiAgY2F0ZWdvcnkucmVuZGVyKClcclxufSlcclxucGFnZSgnL2Rpc2hlcycsIChjdHgsIG5leHQpID0+IHtcclxuICBtYWluQ29udGVudC5pbm5lckhUTUwgPSAnJ1xyXG4gIGRpc2hlcy5yZW5kZXIoKVxyXG59KVxyXG5wYWdlKCk7XHJcbiIsImV4cG9ydCBkZWZhdWx0ICh0ZW1wbGF0ZSkgPT4ge1xyXG4gIHJldHVybiBgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4gJHt0ZW1wbGF0ZX0gPC9kaXY+YFxyXG59Il19
