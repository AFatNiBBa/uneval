
import { IResult, Serializer, FAIL } from "../../helper/serializer";
import { createStoreKey, getFormat, wrap } from "../../helper/util";
import { Stats } from "../../helper/stats";
import { Ref, getRef } from "./ref";
import { Key } from "../util/key";

export const [ getCirc, setCirc ] = createStoreKey<ICirc>("circ");

export const CIRC: Serializer = (x, stats, next) => {
    if (typeof x === "string" || typeof x === "symbol") return FAIL;

    if (getRef(stats, x)) return FAIL; // If the reference is already present it means that there is no need to create a new "Circ" since the object is only being referenced

    const out = setCirc(stats, x, new Circ(stats));
    const struct = out.value = next();
    out.ref = getRef(stats, x);
    const temp = getCirc(stats, x);
    if (temp !== out) return struct;
    setCirc(stats, x);
    out.complete();
    return out;
}

export interface ICirc {
    depth: number;
    children: Deferred[];
    add(value: IResult, returnsSelf?: boolean): void;
}

export class Circ implements ICirc, IResult {
    returnsSelf = true;
    children: Deferred[] = [];
    list: IResult[] = [];
    value: IResult;
    depth: number;
    ref: Ref;

    constructor(public stats: Stats) { this.depth = stats.depth; }

    add(value: IResult, returnsSelf = true) {
        this.list.push(value);
        this.returnsSelf = returnsSelf;
    }

    complete() {
        this.children.forEach(x => setCirc(this.stats, x.obj));
        this.children.length = 0;
    }

    toString(level: string, safe: boolean) {
        if (this.list.length === 0) return this.value.toString(level, safe);
        const { LAST, FULL, NEXT } = getFormat(this.stats.opts, level);

        var out = `${ FULL }${ this.value.toString(NEXT, true) }`;
        for (const elm of this.list)
            out += `,${ FULL }${ elm.toString(NEXT, true) }`;
        if (!this.returnsSelf)
            out += `,${ FULL }${ this.ref.ptr }`;

        return `(${ out }${ LAST })`;
    }

    static min(stats: Stats, list: any[]) {
        var out: ICirc, circ: ICirc;
        for (const elm of list)
            if (circ = getCirc(stats, elm))
                if (!out || circ.depth < out.depth)
                    out = circ;
        return out;
    }

    static tryOrAssign(stats: Stats, obj: object, k: string | symbol, v: object) {
        const out = stats.scan(v);
        const circ = getCirc(stats, v);
        if (!circ) return out;
        const { space } = stats.opts;
        circ.add(wrap`${ stats.scan(obj) }${ new Key(stats, k, false) }${ space }=${ space }${ out }`);
        return null;
    }
}

export class Deferred implements ICirc {
    get depth() { return this.circ.depth; }

    get children() { return this.circ.children; }

    constructor(public obj: any, public circ: ICirc) { circ.children.push(this); }

    add(value: IResult) { this.circ.add(value, false); }
}