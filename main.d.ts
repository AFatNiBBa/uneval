
declare module "uneval.js" {
    /**
     * Optional conversion settings.
     */
    export type Opts = {
        /**
         * Maps specific object instances to the given string
         */
        namespace: Map<any, string>,

        /**
         * If `false` there will be no un-needed spacing character.
         * @default true
         */
        pretty?: boolean,

        /**
         * The string to use as a space.
         * If `false` is given the string will be `""`
         * @default " "
         */
        space?: string | boolean,

        /**
         * The string to use as a line feed character.
         * If `false` is given the string will be `""`
         * @default "\n"
         */
        endl?: string | boolean,

        /**
         * The string to use as a tab character.
         * If a number "n" is given the value will be the "space" setting's value repeated "n" times.
         * If `false` is given the string will be `""`
         * @default "\t"
         */
        tab?: string | number | boolean,

        /**
         * If `true` allows custom conversions.
         * @default true
         */
        custom?: boolean,

        /**
         * If `false` every method will use the safe definition.
         * @default true
         */
        method?: boolean,

        /**
         * If `false` or `uneval.utils.fromProxy()` is not defined, proxy values will be considered as normal objects.
         * @default true
         */
        proxy?: boolean,

        /**
         * If `true`, when needed, object protorypes will be included in the generated source.
         * @default true
         */
        proto?: boolean,

        /**
         * The maximum level in which object inner properties will be calculated.
         * @default Infinite
         */
        depth?: number,

        /**
         * If `false` the source will not generate a copy of the input object, but a function to generate multiple ones.
         * @default true
         */
        call?: boolean,

        /**
         * If `true` named function and object at top level will be wrapped in parenthesis.
         * @default true
         */
        safe?: boolean,

        /**
         * If `false` and the "call" setting is `true` it will not put the wrapper function, even if needed.
         * @default true
         */
        func?: boolean,

        /**
         * The name of the eventual cache object.
         * @default "x"
         */
        val?: string,

        /**
         * Only in the `uneval.write()` function.
         * If `false` the input will be considered as already object source.
         * @default true
         */
        conv?: boolean,

        /**
         * Only in the `uneval.write()` function.
         * If the value is a string it will be put before the generated object.
         * If the value is an object the "pre" property will be put before the generated object and "post" at the end.
         * @default { pre: "module.exports = ", post: ";" }
         */
        export?: string | { pre?: string, post?: string }
    };

    /**
     * An object containing a value and a structure that will manage a special object.
     */
    declare class Delegate {
        /**
         * Same as the `uneval.scan()` function but returns a `Delegate` created with "obj" and the generated `Struct`.
         * @param obj The object to scan
         * @param opts An object containing the preferences of the scanning 
         * @param cache A map containing the structures of the traversed objects
         * @param prev A way for the function to communicate to the parent call (About circular references); If it's `false` then it does not check the internal properties
         */
        static from(obj: any, opts?: Opts, cache?: Map<any, Struct>, prev?: (cir: Circular) => number | undefined): Delegate;

        /**
         * @param value An object that will represent another
         * @param struct The structure of "value"
         */
        constructor(
            public value: any,
            public struct: IStruct
        );
    }

    export type IDelegate = Delegate | [ Delegate, Delegate ] | { name: string } | {
        value: string,
        method: boolean,
        native: boolean,
        global: boolean
    };

    /**
     * An object containing the informations about a circular reference.
     */
    declare class Circular {
        /**
         * @param key The key of the property inside the object represented by "inner" that has "outer" as value
         * @param struct Object that represents the structure of "key"
         * @param inner Structure of the inner object that contains a reference to an outer one
         * @param outer Outer object
         * @param delegate Eventual pair value-struct that will contain the value to set, in the case that the inner object's property cannot be set but only initialized during the creation of the inner object
         */
        constructor(
            public key: string | symbol | null,
            public struct: IStruct,
            public inner: IStruct,
            public outer?: any,
            public delegate?: IDelegate
        );
    }

    /**
     * An object that represents the structure of another.
     */
    declare class Struct {
        /**
         * All parameters are optional.
         * @param delegate Eventual pair value-struct that will represents the current object
         * @param proto Structure of the eventual prototype of the object
         * @param id Eventual index of the object inside of the cache
         * @param sub Object that maps the object properties to a pair of structs that represent respectively the structure of the key and the value of the property
         * @param cir List of the circular references that have the current object as value
         */
        constructor(
            public delegate?: IDelegate,
            public proto?: IStruct,
            public id?: string | number,
            public sub?: Map<string | symbol, [ Struct, Struct ]>,
            public cir?: Circular[]
        );

        /**
         * Generates the "id" of the current `Struct` (if not already present) and returns it.
         * @param opts An object containing the preferences of the conversion
         */
        ref(opts: Opts): number;
    }

    export type IStruct = Struct | number | null;

    /**
     * Convert an object to its source code.
     * @param obj The object to stringify
     * @param opts An object containing the preferences of the conversion
     * @param level The tabs to put before each line
     */
    declare function uneval(obj: any, opts?: Opts, level?: string): string;

    declare const _: typeof uneval & {
        uneval: typeof _,

        /**
         * Save to file.
         * @param name The name of the file
         * @param obj The object to save
         * @param opts The preferences of the conversion
         * @returns Whatever `fs.writeFileSync()` returns
         */
        write(name: string, obj: any, opts?: Opts, level?: string): void,

        /**
         * Stringifies an object given its structure.
         * This function do the reference checking for the `uneval.utils.source()` function.
         * @param obj The object to stringify
         * @param struct The object representing the structure of "obj"
         * @param opts An object containing the preferences of the conversion
         * @param level The tabs to put before each line
         */
        source(obj: any, struct: IStruct, opts?: Opts, level?: string): string,

        /**
         * Returns the structure object of "obj".
         * @param obj The object to scan
         * @param opts An object containing the preferences of the scanning 
         * @param cache A map containing the structures of the traversed objects
         * @param prev A way for the function to communicate to the parent call (About circular references); If it's `false` then it does not check the internal properties
         */
        scan(obj: any, opts?: Opts, cache?: Map<any, Struct>, prev?: (cir: Circular) => boolean): IStruct,

        /**
         * Gets the details of a proxy.
         * If "x" is not a proxy it returns `null` or `undefined`.
         * @param x The proxy
         * @returns An array containing the [[Target]] and [[Handler]] of "x"
         */
        fromProxy?(x: Proxy): [ object, object ]

        /**
         * Core functions and values that make `uneval()` work.
         */
        utils: {
            /** If you want to define a custom scan function you just need to put it in the object (or in its prototype) using this symbol as the key. */
            customScan: symbol,

            /** If you want to define a custom source function you just need to put it in the object (or in its prototype) using this symbol as the key. */
            customSource: symbol,

            /**
             * Gets if the passed function source code defines an object method, like:
             * 
             *     func() {
             *         // ...
             *     }
             */
            method: RegExp,

            /**
             * Returns the value of the first property of "x".
             * Should be used with objects that have only one property.
             * @param x The outer object
             */
            first(x: object): any,

            /**
             * Same as `Object.assign()` but it sets special or non enumerable properties too.
             * @param a The object in which to set the descriptors of "b"
             * @param b The source object
             * @returns "a"
             */
            assign<A, B>(a: A, b: B): A & B,

            /** Unpack this in your settings object to visualize spacing characters with colors. */
            showFormatting: { space: string, tab: string, endl: string },

            /** Object that maps class prototypes to a predicate that tells if the passed property should be serialized in an object that has that prototype. */
            managedProtos: Map<any, (x: string | number | symbol) => boolean>,

            Struct: typeof Struct,
            Circular: typeof Circular,
            Delegate: typeof Delegate,

            /**
             * Returns the best code to define a key in an object.
             * @param str The key to define
             * @param obj True if is to define inside of an object, False if is outside
             * @param val Eventual code to put inside the square brackets of a symbol key definition
             */
            key(str: string | symbol, obj?: boolean, struct?: IStruct, opts?: Opts): string,

            /**
             * Eventually caches a reference.
             * @param struct The structure of the object
             * @param opts An object containing the preferences of the conversion
             * @returns The code to save the object to the cache
             */
            def(struct: IStruct, opts: Opts): string,

            /**
             * Get if "key" would be put in in the array part or the object part of an array.
             * @param {String|Symbol|Number} key The value to check
             */
            index(key: string | symbol | number): boolean,

            /**
             * Stringifies an object or a primitive.
             * @param obj The object to stringify
             * @param struct The object representing the structure of "obj"
             * @param opts An object containing the preferences of the conversion
             * @param level The tabs to put before each line
             */
            source(obj: any, struct: IStruct, opts?: Opts, level?: string): string,

            /**
             * Nested object types (Function, Objects and Arrays) with special notation.
             */
            nested: {
                /**
                 * Stringifies unmanaged objects and arrays.
                 * @param obj The object to stringify
                 * @param struct The object representing the structure of "obj"
                 * @param opts An object containing the preferences of the conversion
                 * @param level The tabs to put before each line
                 */
                circular(obj: any, struct: IStruct, opts: Opts, level: string): string,

                /**
                 * Stringifies [[Target]] and [[Handler]] of a proxy.
                 * The proxy prototype is not inside `uneval.utils.managedProtos` because it does not exists.
                 * @param obj The proxy to stringify
                 * @param struct The object representing the structure of "obj"
                 * @param opts An object containing the preferences of the conversion
                 * @param level The tabs to put before each line
                 */
                proxy(obj: any | Proxy, struct: IStruct, opts: Opts, level: string): string,

                /**
                 * Assigns the prototype of an object.
                 * @param obj The object to which the prototype will be assigned
                 * @param struct The object representing the structure of "obj"
                 * @param opts An object containing the preferences of the conversion
                 * @param level The tabs to put before each line
                 */
                proto(obj: any, struct: IStruct, opts: Opts, level: string): string,

                /**
                 * Generates the source of a managed object and, if it has special properties, puts it inside of an `uneval.utils.assign()` call with its default object source.
                 * @param obj The object to stringify
                 * @param struct The object representing the structure of "obj"
                 * @param opts An object containing the preferences of the conversion
                 * @param level The tabs to put before each line
                 */
                assign(obj: any, struct: IStruct, opts: Opts, level: string): string,

                /**
                 * Stringifies an array's managed part.
                 * @param obj The array
                 * @param struct The object representing the structure of "obj"
                 * @param opts An object containing the preferences of the conversion
                 */
                array(obj: any, struct: IStruct, opts: Opts, level: string): string,

                /**
                 * Stringifies a function managed part.
                 * @param obj The function
                 * @param struct The object representing the structure of "obj"
                 * @param opts An object containing the preferences of the conversion
                 */
                function(obj: any, struct: IStruct, opts: Opts): string
            }
        }
    };

    export = _;
}