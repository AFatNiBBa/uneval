
//[WIP]: {array,func(fa attenzione al test per method)}.prop(anche __proto__, problema simboli), {obj,array,func}.{get,set}
    //[WIP]: Nested => Definizione gestita dell'oggetto + quella non gestita se esiste
    //[WIP]: Estrai il riferimento circolare
//[MAY]: Remove "uneval.utils.def()" e refactor simili
//[MAY]: Refactor modulare per supporto serializzazioni personalizzate
    //[WIP]: Funzione che prende in parametro l'oggetto ed eventualmente restituisce una funzione per gestirlo (Sia in "scan()" che in "source()")
//[/!\]: Chiave in un oggetto gestito può definire un valore che non verrà cacheato
//[/!\]: (b=[],b.length=12,eval(uneval(b)).length)===11

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
        if (out[0] == "{" && (opts.safe || (temp.i && opts.func))) out = `(${ out })`;
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
     * @param {Function} next A way for the function to communicate to the parent call (About circular references)
     * @returns The structure of "obj"
     */
    function scan(obj, opts = {}, gen = { i: 0 }, cache = new Map(), next)
    {
        const type = typeof obj, { utils } = uneval;
        if (obj === null || (type !== "object" && type !== "function" && type !== "symbol"))
            return null;
        if(cache.has(obj))
            //[ Riferimento multiplo ]
            return cache.get(obj).ref(gen);
        else
        {
            const out = new utils.Struct();
            cache.set(obj, out);
            if (type === "object" && obj !== globalThis)
            {
                //[ Eccezioni ]
                if (obj instanceof Symbol) // Scan parte primitiva
                    out.value = uneval.scan(obj.valueOf(), opts, gen, cache); // Non serve "next", Tanto non ha sotto-proprietà da salvare un simbolo
                else if (obj instanceof Map || obj instanceof Set)
                    out.value = obj = [ ...obj ];
                
                // [ Scanning sotto proprietà ]
                for (let k of Reflect.ownKeys(obj).concat("__proto__"))
                {
                    //[ Prototipo ]
                    let v = obj[k];
                    if (k === "__proto__")
                        if (!opts.proto || utils.managedProtos.has(v))
                            continue;
                        else if (v && v?.constructor?.prototype === v) // Il prototipo è quello di una classe 
                            v = v.constructor;

                    //[ Riferimento Circolare ]
                    const temp = [ k, v ].map(x => 
                        uneval.scan(x, opts, gen, cache, cir =>
                            cir.outer === obj
                            ? (
                                cir.inner = cir.inner.ref(gen),
                                out.cir.push(cir),
                                delete cir.outer
                            )
                            : next?.(cir)
                        )
                    );
                    
                    //[ Autoriferimento ]
                    if (v === obj) out.cir.push(new utils.Circular(k, temp[0], out.ref(gen)));
                    else if (next?.(new utils.Circular(k, temp[0], out, v)));
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
            parent: uneval,
            method: /^(async\s+)?([\["*]|(?!\(|function\W|class(?!\s*\()\W))/,
            managedProtos: new Set([ Object, Array, Function, RegExp, Date, String, Number, Boolean, Symbol, BigInt, globalThis.Buffer ].map(x => (x ?? Object).prototype)),

            /**
             * An object representing the structure of another.
             * If a cache entry is empty is because is inside of a managed object's "__proto__".
             */
            Struct: class {
                value;              // Eventuale valore che rappresenterà il corrente
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
                    case "function": {
                        const out = obj.toString();
                        return (
                            (out.endsWith(") { [native code] }") || out.endsWith(") { [Command Line API] }"))
                                ? globalThis[obj.name] === obj
                                    ? `globalThis${ this.key(obj.name) }`
                                    : `null${ opts.pretty && " /* Native Code */" }`
                            : this.method.test(out)
                                ? `(x=>x[Reflect.ownKeys(x)[0]])({${ out }})`
                                : out
                        );
                    }
                    case "symbol": {
                        const temp = obj.description;
                        return Symbol.for(temp) === obj
                        ? `Symbol.for(${ JSON.stringify(temp) })`
                        : Symbol[temp.match(/^Symbol\.([A-Za-z$_][0-9A-Za-z$_]*)$/)?.[1]] === obj
                            ? temp
                            : `Symbol(${ JSON.stringify(temp) })`;
                    }
                    case "object": return (
                        obj === null
                            ? "null"
                        : obj === globalThis
                            ? `globalThis`
                        : (obj instanceof String || obj instanceof Number || obj instanceof Boolean || obj instanceof BigInt)
                            ? `Object(${ this.source(obj.valueOf(), struct, opts, level) })`
                        : obj instanceof Symbol
                            ? `Object(${ this.parent.source(obj.valueOf(), struct.value, opts, level) })`
                        : obj instanceof Date
                            ? `new Date(${ obj.getTime() })`
                        : (obj instanceof Set || obj instanceof Map)
                            ? `new ${ obj.constructor.name }(${ this.source(struct.value, struct, opts, level) })`
                        : obj instanceof RegExp
                            ? obj.toString()
                        : (typeof Buffer !== "undefined" && obj instanceof Buffer)
                            ? `Buffer.from(${ JSON.stringify(obj.toString("base64")) },${ opts.space }"base64")`
                            : this.nested(obj, struct, opts, level)
                    );
                    case "undefined":   return "undefined";
                    case "number":      return Object.is(obj, -0) ? "-0" : (obj + "");
                    case "bigint":      return obj + "n";
                    default:            return JSON.stringify(obj);
                }
            },
    
            /**
             * Stringifies unmanaged objects and arrays.
             * @param {any} obj The object to stringify
             * @param {Struct} struct The object representing the structure of "obj"
             * @param {Object} opts An object containing the preferences of the conversion
             * @param {String} level The tabs to put before each line
             * @returns The stringified object
             */
            nested(obj, struct, opts, level) {
                const isArray = obj instanceof Array;
                const next = struct.cir.length ? opts.tab : "";
                const tl = opts.endl + level;       // Tonda (Ultima)
                const t = tl + opts.tab;            // Tonda
                const gl = opts.space + tl + next;  // Graffa (Ultima)
                const g = gl + opts.tab;            // Graffa
                
                //[ Sotto valori ]
                const temp = [];
                if (isArray) 
                for (let i = 0; i < obj.length; i++)
                    if (struct.sub.has(i + "")) // Prima di essere cercati all'interno di "struct.sub", gli indici devono essere convertiti in stringa
                        temp.push(this.parent.source(obj[i], struct.sub.get(i + "")[1], opts, level + opts.tab + next));
                    else if (temp.length && (!temp[temp.length - 1] || temp[temp.length - 1][0] === ",")) // Se una serie consecutiva di elementi non ci sono lascia una riga di virgole
                        temp[temp.length - 1] += ",";
                    else temp.push("");
                else
                {
                    for (const [ k, [ kS, vS ] ] of struct.sub)
                    {
                        const v = obj[k];
                        if (opts.method && v instanceof Function && typeof vS !== "number" && !vS.id && this.method.test(v.toString()))
                            temp.push(v.toString());
                        else
                        {
                            const classProto = (k === "__proto__" && v && v?.constructor?.prototype === v) || ""; // Il prototipo è quello di una classe 
                            temp.push(`${
                                typeof kS === "number"
                                ? `[${ opts.val }[${ kS }]]`
                                : this.key(k, true, this.def(kS, opts))
                            }:${ opts.space }${ classProto && "(" }${ 
                                k === "__proto__" && v === undefined
                                ? "null" // Se il prototipo è 'null' la proprietà "__proto__" restituisce 'undefined'
                                : this.parent.source(classProto ? v.constructor : v, vS, opts, level + opts.tab + next)
                            }${ classProto && ").prototype" }`);
                        }
                    }
                }
    
                //[ Oggetto ]                           ↓ Se l'oggetto è vuoto non va a capo
                const out = `${ isArray ? "[" : "{" }${ temp.length ? g : "" }${ temp.join("," + g) }${ temp.length ? gl : "" }${ isArray ? "]" : "}" }`
        
                //[ Riferimenti circolari ]
                return !struct.cir.length
                ? out
                : `(${ t }${ this.def(struct, opts) }${ out },${ t }${
                    struct
                    .cir
                    .map(x => `${ opts.val }[${ x.inner }]${ typeof x.struct === "number" ? `[${ opts.val }[${ x.struct }]]` : this.key(x.key, false, this.def(x.struct, opts)) }${ opts.space }=${ opts.space }${ opts.val }[${ struct.id }]`)
                    .join("," + t)
                }${ tl })`;
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
                ? `[${ val }${ this.parent.source(str, null) }]`
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
            }
        }
    });
})();