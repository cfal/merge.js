# merge.js

A javascript merger similar to webpack/browserify, with coffeescript support, require() caching and browser compatibility

### Usage

```
> npm install merge.js
> merge.js --help

 Usage: merge.js [options] [input files]
        -b                  compile for browser instead of node
        -d                  disable require caching (ie. multiple require()'s of
                            the same module give the same object)
        -m <module>         main module
        -o <file>           output file
        -p <path>           set the root path of all input files (default: ./) *
        -e                  exclude any files that follow this flag *
        -i                  include any files that follow this flag *
        -a <alias> <file>   add alias to file *

* - flag can be provided multiple times

```

