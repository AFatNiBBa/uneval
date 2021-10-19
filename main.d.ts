
declare module "uneval.js" {
    type Opts = {
        pretty?: boolean,
        space?: string,
        endl?: string,
        tab?: string,
        custom?: boolean,
        method?: boolean,
        proxy?: boolean,
        proto?: boolean,
        depth?: number,
        call?: boolean,
        safe?: boolean,
        func?: boolean,
        val?: string
    };

    declare class Delegate {
        static from(obj: any, opts?: Opts, cache?: Map<any, Struct>, prev?: (cir: Circular) => boolean, parent?: Circular): Delegate;
        constructor(
            public value: any,
            public struct: IStruct
        );
    }

    type IDelegate = Delegate | [ Delegate, Delegate ] | { name: string } | {
        value: string,
        method: boolean,
        native: boolean,
        global: boolean
    };

    declare class Circular {
        constructor(
            public key: string | symbol,
            public struct: IStruct,
            public inner: IStruct,
            public outer?: any,
            public delegate?: IDelegate
        );
    }

    declare class Struct {
        skip: boolean;
        id: string | number;
        cir: Circular[];
        sub: Map<string | symbol, [ Struct, Struct ]>;
        delegate: IDelegate;
        ref(opts: Opts): number;
    }

    type IStruct = Struct | number | null;

    type Uneval = ((obj: any, opts?: Opts, level?: string) => string) & {
        uneval: Uneval,
        write(name: string, obj: any, opts?: Opts, level?: string): void,
        source(obj: any, struct: IStruct, opts?: Opts, level?: string): string,
        scan(obj: any, opts?: Opts, cache?: Map<any, Struct>, prev?: (cir: Circular) => boolean, parent?: Circular): Struct,
        fromProxy?: (x: Proxy) => [ Object, Object ]
        utils: {
            customScan: symbol,
            customSource: symbol,
            method: RegExp,
            assign<A, B>(a: A, b: B): A & B,
            showFormatting: { space: string, tab: string, endl: string },
            managedProtos: Map<any, (x: string | number | symbol) => boolean>,

            Struct: typeof Struct,
            Circular: typeof Circular,
            Delegate: typeof Delegate,

            key(str: string | symbol, obj?: boolean, struct?: IStruct, opts?: Opts): string,
            def(struct: IStruct, opts: Opts): string,
            index(key: string | symbol | number): boolean,
            source(obj: any, struct: IStruct, opts?: Opts, level?: string): string,
            nested: {
                circular(obj: any, struct: IStruct, opts: Opts, level: string): string,
                proxy(obj: any, struct: IStruct, opts: Opts, level: string): string,
                proto(obj: any, struct: IStruct, opts: Opts, level: string): string,
                assign(obj: any, struct: IStruct, opts: Opts, level: string): string,
                array(obj: any, struct: IStruct, opts: Opts, level: string): string,
                function(obj: any, struct: IStruct, opts: Opts): string
            }
        }
    };

    declare const uneval: Uneval;
    export = uneval;
}