
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
    id: number;
    value: IResult;
    defined: boolean;

    get ptr() { return `${ this.stats.opts.val }[${ this.id }]`; }
    
    constructor(public stats: Stats) { }
    
    makePtr() { return this.id ||= ++this.stats.lastIndex, this; }

    toString(level: string, safe: boolean) {
        if (this.defined) return this.ptr;

        const temp = this.value.toString(level, !!this.id || safe);
        if (!this.id) return temp;
        
        this.defined = true;
        const out = `${ this.ptr }${ this.stats.opts.space }=${ this.stats.opts.space }${ temp }`;
        return safe ? out : `(${ out })`;
    }
}