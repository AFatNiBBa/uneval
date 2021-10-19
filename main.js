
/*
    [WIP]: comment (eng)
    [WIP]: {function,object,array}.{get,set}
    [/!\]: le proprietà gestite di oggetti gestiti non vengono salvate anche se sovrascritte dall'utente
    [/!\]: "__proto__" proprietà asestante e non getter/setter di "Object.prototype" setta comunque il prototipo
*/

var uneval = (typeof module === "undefined" ? {} : module).exports = (function () {
    
    var fromProxy;
    if (typeof require !== "undefined")
        try { fromProxy = require?.("internal-prop")?.fromProxy; } catch { }
    if (!fromProxy && typeof process !== "undefined")
        fromProxy = process?.binding?.("util")?.getProxyDetails;

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
        opts.tab = pretty && (typeof opts.tab === "number" ? opts.space.repeat(opts.tab) : ((opts.tab ?? "\t") || ""));
        opts.custom ??= true;
        opts.method ??= true;
        opts.proxy ??= true;
        opts.proto ??= true;
        opts.depth ??= Infinity;
        opts.call ??= true;
        opts.safe ??= true;
        opts.func ??= true;
        opts.val ??= "x";

        //[ Wrapping con funzione se "opts.call" è disattivato e/o se serve la cache e/o la funzione di assegnazione ]
        opts.stats = { assign: "", references: 0, depth: 0 };
        var out = uneval.source(obj, uneval.scan(obj, opts), opts, level);
        const wrap = !opts.call || (opts.func && (opts.stats.references || opts.stats.assign));
        if (
            obj instanceof Function && obj.name && opts.safe || // Forces named functions to be expressions and not statements
            out[0] == "{" && (opts.safe || wrap)
        ) out = `(${ out })`;
        return !wrap
        ? out
        : `((${
            (opts.stats.references || opts.stats.assign)
            ? `${ opts.val }${ opts.space }=${ opts.space }{${ opts.stats.assign && `${ opts.space }assign:${ opts.space }${ uneval.utils.assign }${ opts.space }` }}`
            : ""
        })${ opts.space }=>${ opts.space }${ out })${ opts.call ? "()" : "" }`;
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
     * @param {Map<Object, Struct>} cache A map containing the structures of the traversed objects
     * @param {Function|Boolean} prev A way for the function to communicate to the parent call (About circular references); If it's 'false' then it does not check the internal properties
     * @param {Circular} parent The informations about the parent object
     * @returns The structure of "obj"
     */
    function scan(obj, opts = {}, cache = new Map(), prev, parent)
    {
        const type = typeof obj, { utils } = uneval;
        if (obj === null || (type !== "object" && type !== "function" && type !== "symbol"))
            return null;
        else if (cache.has(obj))
            return cache.get(obj).ref(opts); // Riferimento multiplo
        else
        {
            const out = new utils.Struct();
            cache.set(obj, out);

            //[ Riferimento Circolare ]
            function next(cir)
            {
                if (cir.outer === obj)
                {
                    cir.inner = cir.inner.ref(opts);
                    out.cir[cir.delegate ? "unshift" : "push"](cir); // Metto sempre le espressioni prima dei riferimenti
                    return delete cir.outer;
                }
                else return prev?.(cir);
            }
            
            //[ Eccezioni ]
            if (opts.namespace?.has?.(obj))
                return Object.assign(out, { delegate: { name: opts.namespace.get(obj) } });
            if (opts.proxy && fromProxy)
            {
                const temp = fromProxy(obj);
                if (temp)
                {
                    out.delegate = temp.map(x => {
                        if (parent)
                        {
                            parent.outer = x;
                            parent.delegate = new utils.Delegate(obj, out);
                            out.skip ||= next(parent);
                        }
                        return utils.Delegate.from(x, opts, cache, next);
                    });
                    return out; // É una proxy e non credo possa contenere proprietà proprie
                }
            }
            if (opts.custom && obj?.[utils.customScan] instanceof Function)
                return obj[utils.customScan](out, opts, cache, prev, parent, uneval);
            else if (obj instanceof Symbol) // Scan parte primitiva symbol
                out.delegate = utils.Delegate.from(obj.valueOf(), opts, cache); // Non serve "prev", tanto un simbolo non ha sotto-proprietà da salvare
            else if (obj instanceof Set)
                out.delegate = utils.Delegate.from([ ...obj ], opts, cache, next);
            else if (obj instanceof Map)
            {
                opts.stats.depth--;
                out.delegate = utils.Delegate.from([ ...obj ], opts, cache, next);
                opts.stats.depth++;
            }
            else if (obj?.constructor instanceof Function && obj.constructor?.prototype === obj)
            {
                out.delegate = utils.Delegate.from(obj.constructor, opts, cache, false); // "prev" è impostato su 'false' per far saltare le proprietà statiche a "uneval.scan()"
                return out; // É il prototipo di una classe, lascio che sia il codice della classe a definire le sue proprietà
            }
            else if (type == "function")
            {
                const { value: temp } = out.delegate = { value: obj.toString() };
                out.delegate.method = utils.method.test(temp);
                if ((out.delegate.native = temp.endsWith(") { [native code] }") || temp.endsWith(") { [Command Line API] }")))
                {
                    out.delegate.global = globalThis[obj.name] === obj;
                    return out; // Le funzioni native non si scannerizzano
                }
            }

            // [ Scanning sotto proprietà ]
            if (prev !== false && obj !== globalThis && (type === "object" || type === "function"))
            {
                opts.stats.depth++;
                const managed = utils.managedProtos.get(obj.__proto__);
                for (const k of Reflect.ownKeys(obj).concat("__proto__"))
                {
                    const v = obj[k];
                    if (
                        (v instanceof Object && opts.stats.depth >= opts.depth) ||               // Salta se è oltre "opts.depth"
                        ((k === "__proto__" && (!opts.proto || managed)) || managed?.(k))        // Salta la proprietà
                    ) continue;

                    //[ Struttura chiave e valore ]
                    const kS = uneval.scan(k, opts, cache, next);
                    const vS = uneval.scan(v, opts, cache, next, new utils.Circular(k, kS, out));
                    
                    //[ Autoriferimento ]
                    if (v === obj) out.cir.push(new utils.Circular(k, kS, out.ref(opts)));
                    else if (prev?.(new utils.Circular(k, kS, out, v)));
                    else if (!vS?.skip) out.sub.set(k, [ kS, vS ]); // La chiave viene salvata solo se non si tratta di un riferimento circolare
                }
                opts.stats.depth--; 
            }
            return out;
        }
    }

    //[ Export ]
    const customScan = Symbol.for("uneval.utils.customScan"), customSource = Symbol.for("uneval.utils.customSource");
    return Object.assign(uneval, {
        uneval, write, source, scan, fromProxy,
        
        [customScan]: x => x,
        [customSource]: () => `(${ arguments.callee })()`,

        /**
         * Core functions and values that make "uneval()" work.
         */
        utils: {
            customScan,
            customSource,
            method: /^(async\s+)?([\["*]|(?!\w+\s*=>|\(|function\W|class(?!\s*\()\W))/,
            assign: (a,b)=>Object.defineProperties(a,Object.getOwnPropertyDescriptors(b)), // Se serve le funzioni impostano "opts.stats.assign" su 'true'
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
             */
            Struct: class {
                skip = false;       // Salta la proprietà che contiene questo struct poichè verra salvata direttamente sul riferimento circolare
                id = "";            // Eventuale indice dell'oggetto al interno della cache
                cir = [];           // Lista dei riferimenti circolari che fanno riferimento all'oggetto
                sub = new Map();    // Oggetto che mappa le proprietà dell'oggetto con una coppia di oggetti che rappresentano la struttura rispettivamente della chiave e del valore della proprietà
                delegate;           // Eventuale coppia valore-struct che rappresenterà l'oggetto corrente
                ref(opts) { return this.id ||= ++opts.stats.references; }
            },

            /**
             * An object containing the informations about a circular reference.
             */
            Circular: class {
                key;                // La chiave della proprietà di "inner" che contiene "outer"
                struct;             // Oggetto che rappresenta la struttura di "key"
                inner;              // Struct del oggetto interno che contiene un riferimento ad un oggetto esterno
                outer;              // Oggetto esterno
                delegate;           // Eventuale coppia valore-struct che conterrà il valore da assegnare se non è stato possibile metterlo in cache
                constructor(key, struct, inner, outer, delegate) { this.key = key; this.struct = struct; this.inner = inner; this.outer = outer; this.delegate = delegate; }
            },

            /**
             * An object containing a value and a structure that will manage a special object.
             */
            Delegate: class {
                value;              // Valore che rappresenta l'oggetto
                struct;             // Struttura di "value"
                constructor(value, struct) { this.value = value; this.struct = struct; }
                static from(...args) { return new this(args[0], uneval.scan(...args)); }
            },

            /**
             * Returns the best code to define a key in an object.
             * @param {String|Symbol} str The key to define
             * @param {Boolean} obj True if is to define inside of an object, False if is outside
             * @param {String} val Eventual code to put inside the square brackets of a symbol key definition
             * @returns The code of the key
             */
            key(str, obj = false, struct, opts) {
                return typeof str === "symbol"
                ? `[${ uneval.source(str, struct, opts) }]`
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
             * Get if "key" would be put in in the array part or the object part of an array.
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
                if (struct?.delegate?.name)
                    return struct.delegate.name;
                else switch(typeof obj)
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
             * Nested object types (Function, Objects and Arrays) with special notation.
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
                    const out = this.proxy(obj, struct, opts, level + (cond && opts.tab));
                    if (!cond) return out;

                    var expr = false; // Valuta se l'ultimo riferimento circolare conteneva una expressione piuttosto che un riferimento
                    const tLast = opts.space + opts.endl + level;
                    const tFull = tLast + opts.tab;
                    return `(${ tFull }${ utils.def(struct, opts) }${ out },${ tFull }${
                        struct
                        .cir
                        .map(x =>
                            `${ opts.val }[${ x.inner }]${ 
                                typeof x.struct === "number"
                                ? `[${ opts.val }[${ x.struct }]]`
                                : utils.key(x.key, false, x.struct, opts)
                            }${ opts.space }=${ opts.space }${ 
                                (expr = x.delegate)
                                ? uneval.source(x.delegate.value, x.delegate.struct, opts, level + opts.tab)
                                : `${ opts.val }[${ struct.id }]`
                            }`
                        )
                        .join("," + tFull)
                    }${ expr ? `,${ tFull }${ opts.val }[${ struct.id }]` : "" }${ tLast })`;
                },

                /**
                 * Stringifies [[Target]] and [[Handler]] of a proxy.
                 * The proxy prototype is not inside "uneval.utils.managedProtos" because it does not exists.
                 * @param {Proxy|any} obj The proxy to stringify
                 * @param {Struct} struct The object representing the structure of "obj"
                 * @param {Object} opts An object containing the preferences of the conversion
                 * @param {String} level The tabs to put before each line
                 * @returns The stringified object
                 */
                proxy(obj, struct, opts, level) {
                    if (opts.proxy && fromProxy && fromProxy(obj))
                    {
                        const tLast = opts.space + opts.endl + level;
                        const tFull = tLast + opts.tab;
                        return `new Proxy(${ tFull }${
                            uneval.source(struct.delegate[0].value, struct.delegate[0].struct, opts, level + opts.tab)
                        },${ tFull }${
                            uneval.source(struct.delegate[1].value, struct.delegate[1].struct, opts, level + opts.tab)
                        }${ tLast })`;
                    }
                    return this.proto(obj, struct, opts, level);
                },

                /**
                 * Assigns the prototype of an object.
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
                 * Generates the source of a managed object and, if it has special properties, puts it inside of an "uneval.utils.assign()" call with its default object source.
                 * @param {any} obj The object to stringify
                 * @param {Struct} struct The object representing the structure of "obj"
                 * @param {Object} opts An object containing the preferences of the conversion
                 * @param {String} level The tabs to put before each line
                 * @returns The stringified object
                 */
                assign(obj, struct, opts, level) {
                    //[ Conversione personalizzata ]
                    const { utils } = uneval;
                    if (opts.custom && obj[utils.customSource] instanceof Function)
                        return obj[utils.customSource](struct, opts, level, uneval);

                    //[ Valori gestiti ]
                    const array = obj instanceof Array;
                    var delta = struct.sub.size ? opts.tab : ""; // Solo caso 'Map' e 'Set'
                    var managed = (
                        (obj instanceof String || obj instanceof Number || obj instanceof Boolean || obj instanceof BigInt)
                            ? `Object(${ utils.source(obj.valueOf(), struct, opts) })`
                        : obj instanceof Symbol
                            ? `Object(${ uneval.source(struct.delegate.value, struct.delegate.struct, opts) })`
                        : obj instanceof Date
                            ? `new Date(${ obj.getTime() })`
                        : (obj instanceof Set || obj instanceof Map)
                            ? `new ${ obj.constructor.name }(${ utils.source(struct.delegate.value, struct.delegate.struct, opts, level + delta) })`
                        : obj instanceof RegExp
                            ? obj.toString()
                        : (typeof Buffer !== "undefined" && obj instanceof Buffer)
                            ? `Buffer.from(${ JSON.stringify(obj.toString("base64")) },${ opts.space }"base64")`
                        : obj instanceof Function
                            ? this.function(obj, struct, opts)
                            : undefined
                    );
                    
                    //[ Valori definiti ]
                    delta = (array || managed) ? opts.tab : ""; // Solo caso oggetto base
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
                                : utils.key(k, true, kS, opts)
                            }:${ opts.space }${ uneval.source(v, vS, opts, level + opts.tab + delta) }`
                        );
                    }

                    //[ Unione ]
                    delta = ((array || managed) && temp.length) ? opts.tab : "";
                    if (array) managed ??= this.array(obj, struct, opts, level + delta);    // Viene posto dopo il settaggio definitivo di "delta" perchè l'array ha bisogno di più contesto per capire se ci sono proprietà personalizzate
                    const tl = opts.space + opts.endl + level;                              // Tonda (Ultima)
                    const t = tl + opts.tab;                                                // Tonda
                    const gl = tl + delta;                                                  // Graffa (Ultima)
                    const g = gl + opts.tab;                                                // Graffa
                    if (managed && !temp.length)
                        return managed;
                    else
                    {
                        const out = temp.length ? `{${ g }${ temp.join("," + g) }${ gl }}` : "{}";
                        return managed
                        ? opts.stats.assign = `${ opts.val }.assign(${ t }${ managed },${ t }${ out }${ tl })`
                        : out;
                    }
                },

                /**
                 * Stringifies an array's managed part.
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
                 * Stringifies a function managed part.
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