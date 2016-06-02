// Taken from node's path module
var path = {
  _normalizeArray: function(parts, allowAboveRoot) {
    var res = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];

      // ignore empty parts
      if (!p || p === '.')
        continue;

      if (p === '..') {
        if (res.length && res[res.length - 1] !== '..') {
          res.pop();
        } else if (allowAboveRoot) {
          res.push('..');
        }
      } else {
        res.push(p);
      }
    }
    return res;
  },
  join: function() {
    var p = '';
    for (var i = 0; i < arguments.length; i++) {
      var segment = arguments[i];
      if (typeof segment !== 'string') {
        var err = 'Arguments to path.join must be strings';
        if (typeof TypeError === 'function') throw new TypeError(err);
        else throw err;
      }
      if (segment) {
        if (!p) {
          p += segment;
        } else {
          p += '/' + segment;
        }
      }
    }
    return path.normalize(p);
  },
  normalize: function(p) {
    var isAbsolute = p.charAt(0) === '/',
        trailingSlash = p && p[p.length - 1] === '/';

    p = path._normalizeArray(p.split('/'), !isAbsolute).join('/');

    if (!p && !isAbsolute) p = '.';
    if (p && trailingSlash) p += '/';

    return (isAbsolute ? '/' : '') + p;
  },
  dirname: function(p) {
    var result = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(p).slice(1),
        root = result[0],
        dir = result[1];

    if (!root && !dir) return '.';

    if (dir) {
      // It has a dirname, strip trailing slash
      dir = dir.substr(0, dir.length - 1);
    }

    return root + dir;
  },
  basename: function(s) {
    var a = s.split('/');
    a = a[a.length - 1];
    a = a.split('\\');
    return a[a.length - 1];
  }
};

