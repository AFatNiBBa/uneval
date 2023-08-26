
import { Serializer } from "./serializer";
import { stdlib } from "../lib/stdlib";

export type InputOpts = {
    [k in keyof Opts]?: k extends "pretty"
        ? boolean
        : Opts[k] | (k extends "space" | "endl" ? boolean : k extends "tab" ? boolean | number : never)
};

export type Opts = {
    pretty: string | true
    space: string,
    endl: string,
    tab: string,
    method: boolean,
    proto: boolean,
    depth: number,
    call: boolean,
    safe: boolean,
    val: string,
    
    maxStringLength: number,
    lib: Iterable<Serializer>
};

export function parse(opts: InputOpts = {}): Opts {
    const f = (value: string | boolean, def: string) => value == null ? def : value === true ? def : value || "";
    const out: Opts = <any>opts;

    out.pretty = (opts.pretty ?? true) || "";
    out.space = out.pretty && f(opts.space, " ");
    out.endl = out.pretty && f(opts.endl, "\n");
    out.tab = out.pretty && (typeof opts.tab === "number" ? out.space.repeat(opts.tab) : f(opts.tab, "\t"));
    out.method ??= true;
    out.proto ??= true;
    out.depth ??= Infinity;
    out.call ??= true;
    out.safe ??= true;
    out.val ??= "x";

    out.maxStringLength ??= 50;
    out.lib ??= stdlib;

    return out;
}