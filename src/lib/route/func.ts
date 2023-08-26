
import { getFormat, isFunctionSpecial, notSupported } from "../../helper/util";
import { FAIL, IResult, Serializer } from "../../helper/serializer";
import { createStoreKey } from "../../helper/util";
import { Stats } from "../../helper/stats";
import { Key } from "../util/key";

const FIRST: (x: object) => any = x=>x[Reflect.ownKeys(x)[0]];

const [ getFunc, setFunc ] = createStoreKey<Func>("func");
export { getFunc };

export const FUNCTION: Serializer = (x, stats) => 
    typeof x === "function"
        ? setFunc(stats, x, new Func(stats, x))
        : FAIL;

export class Func implements IResult {
    source: string;
    name: IResult;
    first: IResult;
    native = false;
    global = false;

    constructor(public stats: Stats, f: Function) {
        this.source = f.toString();
        if (this.native = this.source.endsWith("() { [native code] }"))
            if (this.global = globalThis[f.name] === f)
                this.name = new Key(stats, f.name, false);
            else;
        else if (isFunctionSpecial(this.source))
            this.first = stats.scan(FIRST);
    }

    getSource(level: string, safe: boolean): string {
        if (!this.first) return safe ? this.source : `(${ this.source })`;
        const { LAST, FULL } = getFormat(this.stats.opts, level);
        return `${ this.first.toString(level, false) }({${ FULL }${ this.source }${ LAST }})`;
    }

    toString(level: string, safe: boolean): string {
        return this.native
            ? this.global
                ? `globalThis${ this.name.toString(level, true) }`
                : notSupported("Native function", this.stats.opts.space)
            : this.getSource(level, safe);
    }
}