
//[WIP]: {array,func}.prop(anche __proto__), {obj,array,func}.{get,set}, { "obj.func"(){} }(è dura)
//[WIP]: Refactor in modo tale che si veda la documentazione (Tirare fuori dal proxy, o meglio, usa typescript)
//[MAY]: (Trap)
//[/!\]: Chiave in un oggetto gestito può definire un valore che non verrà cacheato
//[/!\]: Non viene cacheata la versione primitiva di un oggetto simbol (x[a]=Object(x[b]=Symbol("c")))

//[WIP]: Spazio fine riga, Buffer, Global, Sparse array

/**
 * This implementation only works if the object keys are retrieved in the same order in which they are scanned, the "Map" object allows that
 * If a cache entry is empty is because is inside of a managed object's "__proto__"
 */
module.exports = class Struct {
    sub = new Map();
    cir = [];
    id = "";
    ref(gen) { return this.id ||= ++gen.i; }

    /**
     * Internals functions
     */
    static utils = {
        parent: this,
        managedProtos: new Set([ Object, Array, Function, RegExp, Date, String, Number, Boolean, Symbol, BigInt ].map(x => x.prototype)),

        /**
         * Wraps a generator with an other generator that allows you to receive not only the "value", but the "done" and the return value too
         * @param {Generator} iter The generator
         */
        *wrap(iter) {
            var out, temp;
            while(!(out = iter.next(temp)).done)
            {
                temp = undefined;
                out.next = x => temp = x;
                yield out;
            }
            yield out;
        },
    
        /**
         * Return the structure object of "obj"
         * @param {any} obj The object to scan
         * @param {Object} opts An object containing the preferences of the scanning 
         * @param {Object} gen An object that keep tracks of the ids of the repeating objects
         * @param {Map<Object, Struct>} cache A map containing the structures of the traversed objects
         * @yields Objects containing the current object, a key and its struct and a value, those objects have to be checked against parent call's "obj" for circular references
         * @returns The structure of "obj"
         */
        *scan(obj, opts = {}, gen = { i: 0 }, cache = new Map()) {
            const type = typeof obj;
            if (obj === null || (type !== "object" && type !== "function" && type !== "symbol"))
                return null;
            if(cache.has(obj))
                //[ Riferimento multiplo ]
                return cache.get(obj).ref(gen);
            else
            {
                const out = new (this.parent)();
                cache.set(obj, out);
                if (type === "object")
                {
                    // [ Scanning 'Map' & 'Set' ]
                    if (obj instanceof Map || obj instanceof Set)
                        out.value = obj = [ ...obj ];
                    
                    // [ Scanning sotto proprietà ]
                    for (let k of Reflect.ownKeys(obj).concat("__proto__"))
                    {
                        let v = obj[k], temp = [];
                        if (k === "__proto__")
                            if (!opts.proto || this.managedProtos.has(v))
                                continue;
                            else if (v && v?.constructor?.prototype === v) // Il prototipo è quello di una classe 
                                v = v.constructor;

                        //[ Riferimento Circolare ]
                        for (const x of [ k, v ])
                            for (const { value, done, next } of this.wrap(this.scan(x, opts, gen, cache)))
                                if (done)
                                    temp.push(value);
                                else if (value.v === obj)
                                {
                                    next(true);
                                    delete value.v;
                                    value.obj = value.obj.ref(gen);
                                    out.cir.push(value);
                                }
                                else next(yield value);
                        
                        //[ Autoriferimento ]
                        if (v === obj) out.cir.push({ obj: out.ref(gen), k, kS: temp[0] });
                        else if (yield { obj: out, k, v, kS: temp[0] });
                        else out.sub.set(k, temp); // La chiave viene salvata solo se non si tratta di un riferimento circolare
                    }
                }
                return out;
            }
        },

        /**
         * Returns the best code to define a key in an obejct
         * @param {String|Symbol} str The key to define
         * @param {Boolean} obj True if is to define inside of an object, False if is outside
         * @param {String} val Eventual code to put inside the square brackets of a symbol key definition
         * @returns The code of the key
         */
        key(str, obj = false, val = "") {
            return typeof str === "symbol"
            ? `[${ val }${ this.parent.stringify(str, null) }]`
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
         * Eventually caches a reference
         * @param {Struct} struct The structure of the object
         * @param {Object} opts An object containing the preferences of the conversion
         * @returns The code to save the object to the cache
         */
        save(struct, opts) {
            return (struct?.id || "") && (`${ opts.val }[${ struct.id }]${ opts.space }=${ opts.space }`);
        },

        /**
         * Stringifies an object or a primitive
         * @param {any} obj The object to stringify
         * @param {Struct} struct The object representing the structure of "obj"
         * @param {Object} opts An object containing the preferences of the conversion
         * @param {String} level The tabs to put before each line
         * @returns The stringified object
         */
        stringify(obj, struct, opts = {}, level = "") {
            switch(typeof obj)
            {
                case "function": {
                    const out = obj.toString();
                    return out.endsWith(" { [native code] }")
                    ? `null${ opts.pretty && " /* Native Code */" }`
                    : out;
                }
                case "symbol": {
                    const temp = obj.description;
                    return Symbol.for(temp) === obj
                    ? `Symbol.for(${ JSON.stringify(temp) })`
                    : Symbol[temp.match(/^Symbol\.([A-Za-z$_][0-9A-Za-z$_]*)$/)?.[1]]
                        ? temp
                        : `Symbol(${ JSON.stringify(temp) })`;
                }
                case "object": return (
                    obj === null
                        ? "null"
                    : (obj instanceof String || obj instanceof Number || obj instanceof Boolean || obj instanceof Symbol || obj instanceof BigInt)
                        ? `Object(${ this.stringify(obj.valueOf(), struct, opts, level) })` //[/!\]: Non supporta (x[a]=Object(x[b]=Symbol("c")))
                    : obj instanceof Date
                        ? `new Date(${ obj.getTime() })`
                    : (obj instanceof Set || obj instanceof Map)
                        ? `new ${ obj.constructor.name }(${ this.stringify(struct.value, struct, opts, level) })`
                    : obj instanceof RegExp
                        ? obj.toString()
                        : this.nested(obj, struct, opts, level)
                )
                case "undefined":   return "undefined";
                case "number":      return Object.is(obj, -0) ? "-0" : (obj + "");
                case "bigint":      return obj + "n";
                default:            return JSON.stringify(obj);
            }
        },

        /**
         * Stringifies unmanaged objects and arrays
         * @param {any} obj The object to stringify
         * @param {Struct} struct The object representing the structure of "obj"
         * @param {Object} opts An object containing the preferences of the conversion
         * @param {String} level The tabs to put before each line
         * @returns The stringified object
         */
        nested(obj, struct, opts, level) {
            const isArray = obj instanceof Array;
            const next = struct.cir.length ? opts.tab : "";
            const tl = opts.endl + level;   // Tonda (Ultima)
            const t = tl + opts.tab;        // Tonda
            const gl = tl + next;           // Graffa (Ultima)
            const g = gl + opts.tab;        // Graffa
            
            //[ Sotto valori ]
            const temp = [];
            if (isArray) 
            for (let i = 0; i < obj.length; i++)
                temp.push(struct.sub.has(i + "") ? this.parent.stringify(obj[i], struct.sub.get(i + "")[1], opts, level + opts.tab + next) : "null"); // Prima di essere cercati all'interno di "struct.sub", gli indici devono essere convertiti in stringa
            else
            {
                for (const [ k, [ kS, vS ] ] of struct.sub)
                {
                    const v = obj[k];
                    const proto = (k === "__proto__" && v && v?.constructor?.prototype === v) || ""; // Il prototipo è quello di una classe 
                    temp.push(`${
                        typeof kS === "number"
                        ? `[${ opts.val }[${ kS }]]`
                        : this.key(k, true, this.save(kS, opts))
                    }:${ opts.space }${ proto && "(" }${ this.parent.stringify(proto ? v.constructor : v, vS, opts, level + opts.tab + next) }${ proto && ").prototype" }`);
                }
            }
    
            //[ Oggetto ]                           ↓ Se l'oggetto è vuoto non va a capo
            const out = `${ isArray ? "[" : "{" }${ temp.length ? g : "" }${ temp.join("," + g) }${ temp.length ? gl : "" }${ isArray ? "]" : "}" }`
    
            //[ Riferimenti circolari ]
            return !struct.cir.length
            ? out
            : `(${ t }${ this.save(struct, opts) }${ out },${ t }${
                struct
                .cir
                .map(x => `${ opts.val }[${ x.obj }]${ typeof x.kS === "number" ? `[${ opts.val }[${ x.kS }]]` : this.key(x.k, false, this.save(x.kS, opts)) }${ opts.space }=${ opts.space }${ opts.val }[${ struct.id }]`)
                .join("," + t)
            }${ tl })`;
        }
    };

    /**
     * Return the structure object of "obj"
     * @param {any} obj The object to scan
     * @param {Object} opts An object containing the preferences of the scanning 
     * @param {Object} gen An object that keep tracks of the ids of the repeating objects
     * @param {Map<Object, Struct>} cache A map containing the structures of the traversed objects
     * @returns The structure of "obj"
     */
    static from(obj, opts, gen, cache) {
        for (const { value, done } of this.utils.wrap(this.utils.scan(obj, opts, gen, cache))) // Dovrebbe mandare 'false' a "next()", ma va bene uguale visto che anche undefined è falsy
            if (done)
                return value;
    }

    /**
     * Stringifies an object given its structure
     * This function do the reference checking for the "this.utils.stringify()" function
     * @param {any} obj The object to stringify
     * @param {Struct} struct The object representing the structure of "obj"
     * @param {Object} opts An object containing the preferences of the conversion
     * @param {String} level The tabs to put before each line
     * @returns The stringified object
     */
    static stringify(obj, struct, opts, level) {
        return typeof struct === "number"
        ? `${ opts.val }[${ struct }]`
        : `${ struct?.cir?.length ? "" : this.utils.save(struct, opts) }${ this.utils.stringify(obj, struct, opts, level) }`;
        //    ↑ Senza questo i riferimenti li definiva FUORI dalle parenntesi tonde sugli oggetti
    }

    /**
     * Like the "Struct" class but can be called as a function
     */
    static uneval = new Proxy(this, {
        /**
         * Convert an object to its source code and wraps it to make it valid everywhere
         * @param {Function} t The Target
         * @param {null} self The 
         * @param {Array} args The object to save and the options
         * @returns The stringified object
         */
        apply(t, self, [ obj, opts = {} ]) {
            //[ Default ]
            const pretty = opts.pretty = (opts.pretty ?? true) || "";
            opts.space = pretty && ((opts.space ?? " ") || "");
            opts.endl = pretty && ((opts.endl ?? "\n") || "");
            opts.tab = pretty && ((opts.tab ?? "\t") || "");
            opts.proto ??= true;
            opts.safe ??= true;
            opts.func ??= true;
            opts.val ??= "x";

            //[ Wrapping con funzione se serve la cache ]
            const temp = { i: 0 };
            var out = t.stringify(obj, t.from(obj, opts, temp), opts);
            if (opts.safe && out[0] == "{") out = `(${ out })`;
            return opts.func && temp.i
            ? `(${ opts.val } => ${ out })({})`
            : out;
        }
    });
}.uneval;