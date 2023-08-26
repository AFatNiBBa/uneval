
import { IResult, Serializer, FAIL } from "../../helper/serializer";
import { createStoreKey } from "../../helper/util";
import { Stats } from "../../helper/stats";

const [ getRef, setRef ] = createStoreKey<Ref>("ref");
export { getRef };

export const REF: Serializer = (x, stats, next) => {
    if (typeof x === "string" && x.length <= stats.opts.maxStringLength) return FAIL;

    const temp = getRef(stats, x);
    if (temp) return temp.makePtr();

    const out = setRef(stats, x, new Ref(stats));
    out.value = next();
    return out;
}

export class Ref implements IResult {
    ptr: Ptr;
    value: IResult;

    get used() { return this.ptr != null; }
    
    constructor(public stats: Stats) { }
    
    makePtr() { return this.ptr ??= new Ptr(this, ++this.stats.lastIndex); }

    toString(level: string, safe: boolean) {
        const temp = this.value.toString(level, this.used || safe);
        if (!this.used) return temp;
        const out = `${ this.ptr }${ this.stats.opts.space }=${ this.stats.opts.space }${ temp }`;
        return safe ? out : `(${ out })`;
    }
}

export class Ptr implements IResult {
    constructor(public ref: Ref, public id: number) { }
    
    toString() { return `${ this.ref.stats.opts.val }[${ this.id }]`; }
}