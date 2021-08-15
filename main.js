
//[WIP]: Map, Set, {obj,array,func}.{get,set}, {array,func}.prop(anche __proto__), { "obj.func"(){} }(è dura)
//[WIP]: Tira fuori il codice per mettere in cache facendo in modo che tutti i tipi siano supportati
//[WIP]: Usa la cache delle chiavi prima che vengano definite (temp.b.f[0])
//[MAY]: (Trap)

/**
 * This implementation only works if the object keys are retrieved in the same order in which they are scanned, otherwise you may reference a not defined cache value
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
    
        *scan(obj, opts = {}, gen = { i: 0 }, cache = new Map()) {
            const type = typeof obj;
            if (obj === null || (type !== "object" && type !== "function" && type !== "symbol")) return null;
            if(cache.has(obj))
                //[ Riferimento multiplo ]
                return cache.get(obj).ref(gen);
            else
            {
                const out = new (this.parent)();
                cache.set(obj, out);
                if (type === "object")
                {
                    for (let k of Reflect.ownKeys(obj).concat("__proto__"))
                    {
                        const v = obj[k];
                        if (k === "__proto__" && (!opts.proto || v === Object.prototype || v === Array.prototype))
                            continue;
    
                        //[ Riferimento multiplo a chiave symbol ]
                        if (typeof k === "symbol")
                        {
                            let temp;
                            if (!cache.has(k)) cache.set(k, temp = new (this.parent)());
                            else (temp = cache.get(k)).ref(gen);
                            [ k, temp.sym, temp.done ] = [ temp, k, false ];
                        }
        
                        //[ Autoriferimento ]
                        if (v === obj) out.cir.push({ obj: out.ref(gen), k });
                        else var temp = yield { obj: out, k, v };
        
                        //[ Riferimento Circolare ]
                        for (const { value, done, next } of this.wrap(this.scan(v, opts, gen, cache)))
                            if (done)
                                if (v !== obj && !temp) // Evita di mettere le chiavi che hanno valori circolari
                                    out.sub.set(k, value);
                                else;
                            else if (value.v === obj)
                            {
                                next(true);
                                delete value.v;
                                value.obj = value.obj.ref(gen);
                                out.cir.push(value);
                            }
                            else next(yield value);
                    }
                }
                return out;
            }
        },

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

        save(struct, opts) {
            return (struct?.id || "") && (`${ opts.val }[${ struct.id }]${ opts.space }=${ opts.space }`);
        },

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
                temp.push(struct.sub.has(i + "") ? this.parent.stringify(obj[i], struct.sub.get(i + ""), opts, level + opts.tab + next) : "null"); // Prima di essere cercati all'interno di "struct.sub", gli indici devono essere convertiti in stringa
            else
            {
                for (const [ k, v ] of struct.sub)
                {
                    temp.push(`${
                        (k instanceof this.parent && k.id)
                        ? k.done
                            ? `[${ opts.val }[${ k.id }]]`                  // Simbolo già salvato
                            : (
                                k.done = true,
                                this.key(k.sym, true, this.save(k, opts))  // Simbolo da salvare
                            )
                        : this.key(k.sym ?? k, true)                        // Stringa o Simbolo non duplicato
                    }:${ opts.space }${ this.parent.stringify(obj[k instanceof this.parent ? k.sym : k], v, opts, level + opts.tab + next) }`);
                }
            }
    
            //[ Oggetto ]                                                        ↓ Se l'oggetto è vuoto non va a capo
            const out = `${ this.save(struct, opts) }${ isArray ? "[" : "{" }${ temp.length ? g : "" }${ temp.join("," + g) }${ temp.length ? gl : "" }${ isArray ? "]" : "}" }`
    
            //[ Riferimenti circolari ]
            return !struct.cir.length
            ? out
            : `(${ t }${ out },${ t }${
                struct
                .cir
                .map(x => `${ opts.val }[${ x.obj }]${ this.key(x.k) }${ opts.space }=${ opts.space }${ opts.val }[${ struct.id }]`)
                .join("," + t)
            }${ tl })`;
        }
    }

    /**
     * Return the structure object of "obj"
     * @param {any} obj The object to scan
     * @param {Opts} opts An object containing the preferences of the scanning 
     * @param {Object} gen An object that keep tracks of the ids of the repeating objects
     * @returns 
     */
    static from(obj, opts, gen) {
        for (const { value, done } of this.utils.wrap(this.utils.scan(obj, opts, gen))) // Dovrebbe mandare 'false' a "next()", ma va bene uguale visto che anche undefined è falsy
            if (done)
                return value;
    }

    /**
     * Stringifies an object given its structure
     * @param {any} obj The object to stringify
     * @param {Struct} struct The object representing the structure of "obj"
     * @param {Object} opts An object containing the preferences of the conversion
     * @param {String} level The tabs to put before each line
     * @returns The stringified object
     */
    static stringify(obj, struct, opts = {}, level = "") {
        if (struct?.sym) struct.done = true; // Se il simbolo compare dalla parte dei valori, la parte delle chiavi lo considera già salvato
        if (typeof struct === "number")
            return `${ opts.val }[${ struct }]`; // Ottiene riferimento
        else switch(typeof obj)
        {
            case "function": {
                const out = obj.toString();
                return `${ this.utils.save(struct, opts) }${
                    out.endsWith(" { [native code] }")
                    ? `null${ opts.pretty && " /* Native Code */" }`
                    : out
                }`;
            }
            case "symbol": {
                const temp = obj.description;
                return `${ this.utils.save(struct, opts) }${
                    Symbol.for(temp) === obj
                    ? `Symbol.for(${ JSON.stringify(temp) })`
                    : Symbol[temp.match(/^Symbol\.([A-Za-z$_][0-9A-Za-z$_]*)$/)?.[1]]
                        ? temp
                        : `Symbol(${ JSON.stringify(temp) })`
                }`;
            }
            case "object": return (
                obj === null
                    ? "null"
                : (obj instanceof String || obj instanceof Number || obj instanceof Boolean || obj instanceof Symbol || obj instanceof BigInt)
                    ? `${ this.utils.save(struct, opts) }Object(${ this.stringify(obj.valueOf(), struct, opts, level) })`
                : obj instanceof RegExp
                    ? this.utils.save(struct, opts) + obj.toString()
                    : this.utils.nested(obj, struct, opts, level)
            )
            case "undefined":   return "undefined";
            case "bigint":      return obj + "n";
            default:            return JSON.stringify(obj);
        }
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