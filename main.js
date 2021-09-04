
/*
    [WIP]: {function,object,array}.{get,set}
    [WIP]: refactor modulare per supporto serializzazioni personalizzate
        [WIP]: funzione che prende in parametro l'oggetto ed eventualmente restituisce una funzione per gestirlo (Sia in "scan()" che in "source()")
    [/!\]: le proprietà gestite di oggetti gestiti non vengono salvate anche se sovrascritte dall'utente
*/

var uneval = (typeof module === "undefined" ? {} : module).exports = (function () {

    /**
     * Convert an object to its source code.
     * @param {any} obj The object to stringify
     * @param {Object} opts An object containing the preferences of the conversion
     * @param {String} level The tabs to put before each line
     * @returns The stringified object
     */
    function uneval(obj, opts = {}, level = "")
    {
        //[ Default ]
        const pretty = opts.pretty = (opts.pretty ?? true) || "";
        opts.space = pretty && ((opts.space ?? " ") || "");
        opts.endl = pretty && ((opts.endl ?? "\n") || "");
        opts.tab = pretty && ((opts.tab ?? "\t") || "");
        opts.method ??= true;
        opts.proto ??= true;
        opts.safe ??= true;
        opts.func ??= true;
        opts.val ??= "x";

        //[ Wrapping con funzione se serve la cache ]
        const temp = { i: 0 };
        var out = uneval.source(obj, uneval.scan(obj, opts, temp), opts, level);
        if (
            obj instanceof Function && obj.name && opts.safe ||
            out[0] == "{" && (opts.safe || (temp.i && opts.func))
        ) out = `(${ out })`;
        return opts.func && temp.i
        ? `(${ opts.val }${ opts.space }=>${ opts.space }${ out })({})`
        : out;
    }

    /**
     * Save to file.
     * @param {String} name The name of the file
     * @param {any} obj The object to save
     * @param {Object} opts The preferences of the conversion
     * @returns Whatever "fs.writeFileSync()" returns
     */
    function write(name, obj, opts = {})
    {
        const fs = require("fs");
        if (opts.conv ?? true) obj = uneval(obj, opts);
        if (opts.export !== null) switch(typeof opts.export)
        {
            case "boolean":
            case "number": if (!opts.export) break;
            case "undefined":
            case "string": opts.export = { pre: opts.export };
            case "object": obj = `${ opts.export.pre ?? `module.exports${ opts.space ??= " " }=${ opts.space }` }${ obj }${ (opts.export.post ?? ";") || "" }`
        }
        return fs.writeFileSync(name, obj);
    }

    /**
     * Stringifies an object given its structure.
     * This function do the reference checking for the "uneval.utils.source()" function.
     * @param {any} obj The object to stringify
     * @param {Struct} struct The object representing the structure of "obj"
     * @param {Object} opts An object containing the preferences of the conversion
     * @param {String} level The tabs to put before each line
     * @returns The stringified object
     */
    function source(obj, struct, opts = {}, level = "")
    {
        return typeof struct === "number"
        ? `${ opts.val }[${ struct }]`
        : `${ struct?.cir?.length ? "" : uneval.utils.def(struct, opts) }${ uneval.utils.source(obj, struct, opts, level) }`;
        //    ↑ Senza questo i riferimenti li definiva FUORI dalle parentesi tonde sugli oggetti
    }

    /**
     * Return the structure object of "obj".
     * @param {any} obj The object to scan
     * @param {Object} opts An object containing the preferences of the scanning 
     * @param {Object} gen An object that keep tracks of the ids of the repeating objects
     * @param {Map<Object, Struct>} cache A map containing the structures of the traversed objects
     * @param {Function|Boolean} prev A way for the function to communicate to the parent call (About circular references); If it's 'false' then it does not check the internal properties
     * @returns The structure of "obj"
     */
    function scan(obj, opts = {}, gen = { i: 0 }, cache = new Map(), prev)
    {
        const type = typeof obj, { utils } = uneval;
        if (obj === null || (type !== "object" && type !== "function" && type !== "symbol"))
            return null;
        else if (cache.has(obj))
            return cache.get(obj).ref(gen); // Riferimento multiplo
        else
        {
            //[ Riferimento Circolare ]
            const next = cir => cir.outer === obj ? (cir.inner = cir.inner.ref(gen), out.cir.push(cir), delete cir.outer) : prev?.(cir);
            const out = new utils.Struct();
            cache.set(obj, out);
            
            //[ Eccezioni ]
            if (obj instanceof Symbol) // Scan parte primitiva
                out.delegate = new utils.Delegate(obj.valueOf(), opts, gen, cache); // Non serve "prev", tanto un simbolo non ha sotto-proprietà da salvare
            else if (obj instanceof Map || obj instanceof Set)
                out.delegate = new utils.Delegate([ ...obj ], opts, gen, cache, next);
            else if (obj?.constructor instanceof Function && obj.constructor?.prototype === obj)
            {
                out.delegate = new utils.Delegate(obj.constructor, opts, gen, cache, false); // "prev" è impostato su 'false' per far saltare le proprietà statiche a "uneval.scan()"
                return out; // É il prototipo di una classe, lascio che sia il codice della classe a definire le sue proprietà
            }
            else if (type == "function")
            {
                const { value: str } = out.delegate = { value: obj.toString() };
                out.delegate.method = utils.method.test(str);
                if ((out.delegate.native = str.endsWith(") { [native code] }") || str.endsWith(") { [Command Line API] }")))
                {
                    out.delegate.global = globalThis[obj.name] === obj;
                    return out; // Le funzioni native non si scannerizzano
                }
            }

            // [ Scanning sotto proprietà ]
            if (prev !== false && obj !== globalThis && (type === "object" || type === "function"))
            {
                const managed = utils.managedProtos.get(obj.__proto__);
                for (const k of Reflect.ownKeys(obj).concat("__proto__"))
                {
                    //[ Salta la proprietà ]
                    const v = obj[k];
                    if ((k === "__proto__" && (!opts.proto || managed)) || managed?.(k))
                        continue;

                    //[ Struttura chiave e valore ]
                    const temp = [ k, v ].map(x => uneval.scan(x, opts, gen, cache, next));
                    
                    //[ Autoriferimento ]
                    if (v === obj) out.cir.push(new utils.Circular(k, temp[0], out.ref(gen)));
                    else if (prev?.(new utils.Circular(k, temp[0], out, v)));
                    else out.sub.set(k, temp); // La chiave viene salvata solo se non si tratta di un riferimento circolare
                }
            }
            return out;
        }
    }

    //[ Export ]
    return Object.assign(uneval, {
        uneval, write, source, scan,
        toString: () => `(${ arguments.callee })()`,

        /**
         * Core functions and values that make "uneval()" work.
         */
        utils: {
            method: /^(async\s+)?([\["*]|(?!\w+\s*=>|\(|function\W|class(?!\s*\()\W))/,
            showFormatting: { space: "\x1b[101m \x1b[0m", tab: "\x1b[104m  \x1b[0m", endl: "\x1b[105m \n\x1b[0m" },
            managedProtos: new Map((cache => [
                [ globalThis.Buffer, x => uneval.utils.index(x) ],
                [ Object ],
                [ Array, x => x === "length" ],
                [ Function, cache[1] = x => x === "length" || x === "name" || x === "prototype" || x === "arguments" || x === "caller" ],
                [ function*(){}.constructor, cache[1] ],
                [ async function(){}.constructor, cache[1] ],
                [ async function*(){}.constructor, cache[1] ],
                [ RegExp, x => x === "lastIndex" ], // Salvarla avrebbe senso
                [ Date ],
                [ Set ],
                [ Map ],
                [ String, x => x === "length" || uneval.utils.index(x) ],
                [ Number ],
                [ Boolean ],
                [ BigInt ],
                [ Symbol ]
            ])({}).map(x => [ (x[0] ?? Object).prototype, x[1] ?? (() => false) ])),

            /**
             * An object representing the structure of another.
             * If a cache entry is empty is because is inside of a managed object's "__proto__".
             */
            Struct: class {
                delegate;           // Eventuale coppia valore-struct che rappresenterà l'oggetto corrente
                sub = new Map();    // Oggetto che mappa le proprietà dell'oggetto con una coppia di oggetti che rappresentano la struttura rispettivamente della chiave e del valore della proprietà
                cir = [];           // Lista dei riferimenti circolari che fanno riferimento all'oggetto
                id = "";            // Eventuale indice dell'oggetto al interno della cache
                ref(gen) { return this.id ||= ++gen.i; }
            },

            /**
             * An object containing the informations about a circular reference
             */
            Circular: class {
                key;                // La chiave della proprietà di "inner" che contiene "outer"
                struct;             // Oggetto che rappresenta la struttura di "key"
                inner;              // Struct del oggetto interno che contiene un riferimento ad un oggetto esterno
                outer;              // Oggetto esterno
                constructor(key, struct, inner, outer) { this.key = key; this.struct = struct; this.inner = inner; this.outer = outer }
            },

            /**
             * An object containing a value and a structure that will manage a special object
             */
            Delegate: class {
                value;              // Valore che rappresenta l'oggetto
                struct;             // Struttura di "value"
                constructor(obj, opts, gen, cache, prev) { this.value = obj; this.struct = uneval.scan(obj, opts, gen, cache, prev); }
            },

            /**
             * Returns the best code to define a key in an obejct.
             * @param {String|Symbol} str The key to define
             * @param {Boolean} obj True if is to define inside of an object, False if is outside
             * @param {String} val Eventual code to put inside the square brackets of a symbol key definition
             * @returns The code of the key
             */
            key(str, obj = false, val = "") {
                return typeof str === "symbol"
                ? `[${ val }${ uneval.source(str, null) }]`
                : (
                    str.match(/^[A-Za-z$_][0-9A-Za-z$_]*$/) 
                    ? (obj ? str : "." + str)
                    : (
                        str.match(/^[0-9]+$/)
                        ? (obj ? str : `[${ str }]`)
                        : (obj ? JSON.stringify(str) : `[${ JSON.stringify(str) }]`)
                    )
                );
            },
    
            /**
             * Eventually caches a reference.
             * @param {Struct} struct The structure of the object
             * @param {Object} opts An object containing the preferences of the conversion
             * @returns The code to save the object to the cache
             */
            def(struct, opts) {
                return (struct?.id || "") && (`${ opts.val }[${ struct.id }]${ opts.space }=${ opts.space }`);
            },

            /**
             * Get if "key" would be put in in the array part or the object part of an array
             * @param {String|Symbol|Number} key The value to check
             * @returns If "key" is an array key
             */
            index(key) {
                const temp = [];
                temp[key] = 1;
                return temp.length;
            },
    
            /**
             * Stringifies an object or a primitive.
             * @param {any} obj The object to stringify
             * @param {Struct} struct The object representing the structure of "obj"
             * @param {Object} opts An object containing the preferences of the conversion
             * @param {String} level The tabs to put before each line
             * @returns The stringified object
             */
            source(obj, struct, opts = {}, level = "") {
                switch(typeof obj)
                {
                    case "symbol": {
                        const temp = obj.description;
                        return Symbol.for(temp) === obj
                        ? `Symbol.for(${ JSON.stringify(temp) })`
                        : Symbol[temp.match(/^Symbol\.([A-Za-z$_][0-9A-Za-z$_]*)$/)?.[1]] === obj
                            ? temp
                            : `Symbol(${ JSON.stringify(temp) })`;
                    }
                    case "function":
                    case "object": return (
                        obj === null
                            ? "null"
                        : obj === globalThis
                            ? `globalThis`
                        : (obj?.constructor instanceof Function && obj.constructor?.prototype === obj)
                            ? struct.delegate.struct?.delegate?.native && !struct.delegate.struct?.delegate?.global
                                ? `null${ opts.pretty && " /* Native Prototype */" }`
                                : `(${ uneval.source(struct.delegate.value, struct.delegate.struct, opts, level) }).prototype`
                            : this.nested.circular(obj, struct, opts, level)
                    );
                    case "undefined":   return "undefined";
                    case "number":      return Object.is(obj, -0) ? "-0" : (obj + "");
                    case "bigint":      return obj + "n";
                    default:            return JSON.stringify(obj);
                }
            },

            /**
             * Nested object types (Function, Objects and Arrays) with special notation
             */
            nested: {
                /**
                 * Stringifies unmanaged objects and arrays.
                 * @param {any} obj The object to stringify
                 * @param {Struct} struct The object representing the structure of "obj"
                 * @param {Object} opts An object containing the preferences of the conversion
                 * @param {String} level The tabs to put before each line
                 * @returns The stringified object
                 */
                circular(obj, struct, opts, level) {
                    const cond = struct.cir.length || "", { utils } = uneval;
                    const out = this.proto(obj, struct, opts, level + (cond && opts.tab));
                    if (!cond) return out;

                    const tLast = opts.space + opts.endl + level;
                    const tFull = tLast + opts.tab;
                    return `(${ tFull }${ utils.def(struct, opts) }${ out },${ tFull }${
                        struct
                        .cir
                        .map(x => `${ opts.val }[${ x.inner }]${ 
                            typeof x.struct === "number"
                            ? `[${ opts.val }[${ x.struct }]]`
                            : utils.key(x.key, false, utils.def(x.struct, opts))
                        }${ opts.space }=${ opts.space }${ opts.val }[${ struct.id }]`)
                        .join("," + tFull)
                    }${ tLast })`;
                },

                /**
                 * Generates the source of a managed object and, if it has special properties, puts it inside of an "Object.assign()" call with its default object source
                 * @param {any} obj The object to stringify
                 * @param {Struct} struct The object representing the structure of "obj"
                 * @param {Object} opts An object containing the preferences of the conversion
                 * @param {String} level The tabs to put before each line
                 * @returns The stringified object
                 */
                assign(obj, struct, opts, level) {
                    //[ Valori gestiti ]
                    const array = obj instanceof Array, { utils } = uneval;
                    var custom = struct.sub.size ? opts.tab : ""; // Solo caso 'Map' e 'Set'
                    var managed = (
                        (obj instanceof String || obj instanceof Number || obj instanceof Boolean || obj instanceof BigInt)
                            ? `Object(${ utils.source(obj.valueOf(), struct, opts) })`
                        : obj instanceof Symbol
                            ? `Object(${ uneval.source(struct.delegate.value, struct.delegate.struct, opts) })`
                        : obj instanceof Date
                            ? `new Date(${ obj.getTime() })`
                        : (obj instanceof Set || obj instanceof Map)
                            ? `new ${ obj.constructor.name }(${ utils.source(struct.delegate.value, struct.delegate.struct, opts, level + custom) })`
                        : obj instanceof RegExp
                            ? obj.toString()
                        : (typeof Buffer !== "undefined" && obj instanceof Buffer)
                            ? `Buffer.from(${ JSON.stringify(obj.toString("base64")) },${ opts.space }"base64")`
                        : obj instanceof Function
                            ? this.function(obj, struct, opts)
                            : undefined
                    );
                    
                    //[ Valori definiti ]
                    custom = (array || managed) ? opts.tab : ""; // Solo caso oggetto base
                    const temp = [];
                    for (const [ k, [ kS, vS ] ] of struct.sub) if (k !== "__proto__" && !(array && uneval.utils.index(k)))
                    {
                        const v = obj[k];
                        temp.push(
                            (opts.method && typeof vS !== "number" && vS?.delegate?.method && !vS.id)
                            ? vS.delegate.value
                            : `${
                                typeof kS === "number"
                                ? `[${ opts.val }[${ kS }]]`
                                : utils.key(k, true, utils.def(kS, opts))
                            }:${ opts.space }${ uneval.source(v, vS, opts, level + opts.tab + custom) }`
                        );
                    }

                    //[ Unione ]
                    custom = ((array || managed) && temp.length) ? opts.tab : "";
                    if (array) managed ??= this.array(obj, struct, opts, level + custom);   // Viene posto dopo il settaggio definitivo di "custom" perchè l'array ha bisogno di più contesto per capire se ci sono proprietà personalizzate
                    const tl = opts.space + opts.endl + level;                              // Tonda (Ultima)
                    const t = tl + opts.tab;                                                // Tonda
                    const gl = tl + custom;                                                 // Graffa (Ultima)
                    const g = gl + opts.tab;                                                // Graffa
                    if (managed && !temp.length)
                        return managed;
                    else
                    {
                        const out = temp.length ? `{${ g }${ temp.join("," + g) }${ gl }}` : "{}";
                        return managed
                        ? `Object.assign(${ t }${ managed },${ t }${ out }${ tl })`
                        : out;
                    }
                },

                /**
                 * Assigns the prototype of an object
                 * @param {any} obj The object to which the prototype will be assigned
                 * @param {Struct} struct The object representing the structure of "obj"
                 * @param {Object} opts An object containing the preferences of the conversion
                 * @param {String} level The tabs to put before each line
                 * @returns The stringified object
                 */
                proto(obj, struct, opts, level) {
                    const cond = struct.sub.has("__proto__") || "", { utils } = uneval;
                    const out = this.assign(obj, struct, opts, level + (cond && opts.tab));
                    if (!cond) return out;

                    const tLast = opts.space + opts.endl + level;
                    const tFull = tLast + opts.tab;
                    return obj.__proto__ === undefined && out === "{}"
                    ? "Object.create(null)"
                    : `Object.setPrototypeOf(${ tFull }${ out },${ tFull }${
                        obj.__proto__ === undefined
                        ? "null"
                        : uneval.source(obj.__proto__, struct.sub.get("__proto__")[1], opts, level + opts.tab)
                    }${ tLast })`;
                },

                /**
                 * Stringifies an array's managed part
                 * @param {Array} obj The array
                 * @param {Struct} struct The object representing the structure of "obj"
                 * @param {Object} opts An object containing the preferences of the conversion
                 * @returns The stringified object
                 */
                array(obj, struct, opts, level) {
                    var out = "";
                    const tLast = opts.space + opts.endl + level;   // Tab (Ultimo)
                    const tFull = tLast + opts.tab;                 // Tab
                    for (let i = 0; i < obj.length; i++)
                    {
                        if (struct.sub.has(i + ""))
                        {
                            if (i) out += tFull;
                            out += uneval.source(obj[i], struct.sub.get(i + "")[1], opts, level + opts.tab);
                            if (i + 1 < obj.length) out += ",";     // Bisogna mettere una virgola per ogni elemento, se l'ultimo c'è si può saltare la sua virgola
                        }
                        else out += ",";
                    }
                    return out.length ? `[${ tFull }${ out }${ tLast }]` : "[]";
                },

                /**
                 * Stringifies a function managed part
                 * @param {Function} obj The function
                 * @param {Struct} struct The object representing the structure of "obj"
                 * @param {Object} opts An object containing the preferences of the conversion
                 * @returns The stringified object
                 */
                function(obj, struct, opts) {
                    const out = struct.delegate?.value ?? obj.toString();
                    return (
                        struct.delegate?.native
                            ? struct.delegate?.global
                                ? `globalThis${ uneval.utils.key(obj.name) }`
                                : `null${ opts.pretty && " /* Native Code */" }`
                        : struct.delegate?.method
                            ? `(x=>x[Reflect.ownKeys(x)[0]])({${ out }})`
                            : out
                    );
                }
            }
        }
    });
})();