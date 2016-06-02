#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

var input = {
  js: [],
  js_exclude: [],
  coffee: [],
  coffee_exclude: []
};

var aliases = {};
var mainModule = './main';
var basePath = null;
var outputFile = './build.js';
var enableCache = true;
var enableBrowserCompat = false;
var pwd = process.cwd();

var matchInputFile = function(m) { return /\.(coffee|js)$/.exec(m); };
var add = function(p, exclude) {
  var c, j, len, ref;
  if (path.basename(p)[0] === '.') {
    return;
  }
  
  if (fs.statSync(p).isDirectory()) {
    ref = fs.readdirSync(p);
    for (j = 0, len = ref.length; j < len; j++) {
      c = ref[j];
      add(path.join(p, c), exclude);
    }
    return;
  }

  var m = matchInputFile(p);
  if (!m) return;
  
  var key = m[1];
  if (exclude) key += '_exclude';
  if (input[key].indexOf(p) >= 0) return;
  input[key].push(p);
};

var die = function(s, code) {
  var j, l, len;
  if (code == null) {
    code = 1;
  }
  if (typeof s === 'object' && s.push && s.pop) {
    for (j = 0, len = s.length; j < len; j++) {
      l = s[j];
      console.error(l);
    }
  } else {
    console.error(s);
  }
  process.exit(code);
  return true;
};

var removeExtension = function(f) {
  var i = f.lastIndexOf('.');
  if (i < 0) return f;
  return f.slice(0, i);
};

// Parse arguments
(function() {
  var args = process.argv.slice(2);
  var i = 0;
  var isAddingFiles = true;
  while (i < args.length) {
    var arg = args[i++];
    if (arg == '-h' || arg == '--help') {
      die("\n \
Usage: merge.js [options] [input files]\n \
       -b                  compile for browser instead of node\n \
       -d                  disable require caching (ie. multiple require()'s of\n \
                           the same module give the same object)\n \
       -m <module>         main module\n \
       -o <file>           output file\n \
       -p <path>           set the root path of all input files (default: ./) *\n \
       -e                  exclude any files that follow this flag *\n \
       -i                  include any files that follow this flag *\n \
       -a <alias> <file>   add alias to file *\n \
\n\
* - flag can be provided multiple times\n \
");
      die("Usage: merge.js -p <source path> -m <main module> -o <output directory> -f <output filename> [-d] <file> [file] ..");
    } else if (arg == '-b' || arg == '--browser-compatible') {
      enableBrowserCompat = true;
    } else if (arg == '-d' || arg == '--disable-cache') {
      enableCache = false;
    } else if (arg == '-m' || arg == '--main') {
      mainModule = args[i++] || null;
    } else if (arg == '-o' || arg == '--outfile') {
      outputFile = args[i++] || null;
    } else if (arg == '-p' || arg == '--path') {
      if (basePath) {
        die("Base path already provided");
      }
      basePath = args[i++];
      if (!basePath) {
        die("No base path provided");
      }
      if (!fs.existsSync(basePath) || !fs.statSync(basePath).isDirectory()) {
        die("Base path does not exist: " + basePath);
      }
      basePath = path.resolve(basePath);
    } else if (arg == '-e' || arg == '--exclude') {
      isAddingFiles = false;
    } else if (arg == '-i' || arg == '--include') {
      isAddingFiles = true;
    } else if (arg == '-a' || arg == '--alias') {
      var alias = args[i++];
      var file = args[i++];
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        die("Alias failed, no such file: " + file);
      }
      aliases[alias] = file;
      add(file);
    } else {
      if (!fs.existsSync(arg)) die("Invalid argument: " + fname);
      add(arg, !isAddingFiles);
    }
  }
})();

if (!mainModule) {
  die("No main module provided");
}

if (!input.js.length && !input.coffee.length) {
  if (!basePath) {
    die("No input files");
  }
  add(basePath);
  if (!input.js.length && !input.coffee.length) {
    die("No input files");
  }
}

if (input.js_exclude.length) {
  input.js = input.js.filter(function(f) {
    return input.js_exclude.indexOf(f) < 0;
  });
}

if (input.coffee_exclude.length) {
  input.coffee = input.coffee.filter(function(f) {
    return input.coffee_exclude.indexOf(f) < 0;
  });
}

basePath = basePath || './';
var outputDir = path.dirname(outputFile);

if (matchInputFile(mainModule)) {
  var fileDir = path.dirname(path.resolve(pwd, mainModule));
  mainModule = './' + path.join(path.relative(basePath, fileDir),
                                removeExtension(path.basename(mainModule)));
}

if (mainModule[0] != '/' && mainModule[0] != '.') {
  mainModule = "./" + mainModule;
}

input.coffee = input.coffee.map(function(s) { return path.resolve(pwd, s); });
input.js = input.js.map(function(s) { return path.resolve(pwd, s); });
Object.keys(aliases).forEach(function(alias) { 
  var fileDir = path.dirname(path.resolve(pwd, aliases[alias]));
  aliases[alias] = './' + path.join(path.relative(basePath, fileDir),
                                    removeExtension(path.basename(aliases[alias])));
});

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
} else if (!fs.statSync(outputDir).isDirectory()) {
  die("Invalid output directory: " + outputDir);
}

var pathPolyfillFile = null;
if (enableBrowserCompat) {
  ['builder.path', 'builder.path.js', 'path.js'].forEach(function(f) {
    f = path.join(__dirname, f);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) {
      pathPolyfillFile = f;
    }
  });
  if (!pathPolyfillFile) {
    die("Could not find path polyfill file");
  }
}

console.log(Array(81).join('-'));
console.log("Building..");
if (input.js.length) {
  console.log("  Javascript: ");
  input.js.forEach(function(s) {
    console.log("  > " + s);
  });
}

if (input.coffee.length) {
  console.log("  Coffeescript: ");
  input.coffee.forEach(function(s) {
    console.log("  > " + s);
  });
}

if (Object.keys(aliases).length) {
  console.log("  Aliases: ");
  for (var alias in aliases) {
    console.log("  > '" + alias + "' maps to '" + aliases[alias] + "'");
  }
}

console.log("\nMain module: " + mainModule + "\nModule caching: " + enableCache);
console.log("Output file: " + outputFile);
console.log(Array(81).join('-'));

var buf = '';

var write = function(s, newLine) {
  if (newLine == null) {
    newLine = true;
  }
  buf += s;
  if (newLine) {
    buf += '\n';
  }
  return true;
};

var writeModule = function(key, m) {
  var len3, o, ref12, ts;
  write("  \"" + key + "\": function(require, module) {");
  ref12 = m.split('\n');
  for (o = 0, len3 = ref12.length; o < len3; o++) {
    s = ref12[o];
    ts = s.trim();
    if (!ts || ts.slice(0, 2) === '//') {
      continue;
    }
    write("    " + (s.replace(/\s+$/g, '')));
  }
  write("  },");
  return true;
};

var finishWrite = function(cb) {
  var o, prefix;
  prefix = '';
  if (!enableBrowserCompat) {
    prefix += "#!/usr/bin/env node\n";
    prefix += "//------------------------------------------------------------------------------\n";
    for (i = o = 1; o <= 3; i = ++o) {
      prefix += "// WARNING: Compiled file, do not modify!\n";
    }
    prefix += "//------------------------------------------------------------------------------\n";
  }
  fs.writeFileSync(outputFile, prefix);
  fs.appendFileSync(outputFile, buf);
  buf = null;
  console.log(Array(81).join('-'));
  console.log("Build created: " + outputFile);
  console.log(Array(81).join('-'));
  cb(false);
  return true;
};

if (!enableBrowserCompat) {
  write("var path = require(\"path\");");
} else {
  console.log("Adding browser compatibility");
  fs.readFileSync(pathPolyfillFile, 'ascii').split('\n').forEach(write);
}

write("var _requireMap = {");
input.coffee.forEach(function(f) {
  fileDir = path.dirname(f);
  fileName = path.basename(f);
  output = child_process.execSync("coffee -b -p -c " + f, {
    encoding: 'utf8'
  });
  if (!output) {
    console.log("WARNING: " + f + " is an empty file, compiling anyway..");
  }
  fileKey = path.join(path.relative(basePath, fileDir), removeExtension(fileName));
  console.log("Writing module: " + fileKey);
  writeModule(fileKey, output);
});

input.js.forEach(function(f) {
  fileDir = path.dirname(f);
  fileName = path.basename(f);
  fileKey = path.join(path.relative(basePath, fileDir), removeExtension(fileName));
  console.log("Writing module: " + fileKey);
  writeModule(fileKey, fs.readFileSync(f, {
    encoding: 'utf8'
  }));
});

write("}, ", false);

if (enableCache) {
  write("_requireCache = {}, ", false);
}

write("_requireAliases = " + JSON.stringify(aliases) + ", ");
write("_requireFn = function(fromKey, origKey) {");
write("  var baseKey = path.basename(origKey),");
write("      alias = _requireAliases[baseKey];");
write("  if (alias) { fromKey = '.'; origKey = alias; }");
write("  if (origKey[0] !== '.' && origKey[0] !== '/') return require(origKey);");
write("  var key = path.join(path.dirname(fromKey), origKey);");
write("  if (key in _requireMap) {");

if (enableCache) {
  write("    if (key in _requireCache) return _requireCache[key];");
}

write("    var module = {exports: {}};");
write("    _requireMap[key](function(s) { return _requireFn(key, s); }, module);");

if (enableCache) {
  write("    _requireCache[key] = module.exports;");
}

write("    return module.exports;");
write("  }");
write("  else return require(origKey);");
write("};");

// Start the main module
write("_requireFn(\".\", \"" + mainModule + "\");");

finishWrite(function() {
  return fs.chmodSync(outputFile, 0x1ed);
});
