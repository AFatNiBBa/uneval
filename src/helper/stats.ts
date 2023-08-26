
import { IResult, Serializer, FAIL } from "./serializer";
import { InputOpts, Opts, parse } from "./opts";
import { wrap } from "./util";

export class Stats {
    store = new Map<any, object>();
    opts: Opts;
    lastIndex = 0;
    depth = 0;

    constructor(opts: InputOpts = {}) { this.opts = parse(opts); }

    scan(obj: any): IResult {
        const self = this;
        const iter = this.opts.lib[Symbol.iterator]();
        return function next() {
            for (var value: Serializer, temp: ReturnType<Serializer>; !({ value } = iter.next()).done; )
                if ((temp = value(obj, self, next)) !== FAIL)
                    return temp;
        }();
    }

    wrap(str: ReadonlyArray<string>, x: any) {
        return wrap(str, this.scan(x));
    }
}