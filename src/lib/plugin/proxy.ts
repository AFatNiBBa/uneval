
import { IResult, Serializer, FAIL } from "../../helper/serializer";
import { Circ, Deferred, setCirc } from "../route/circ";
import { OBJECT_NULL_PROTOTYPE } from "../route/simple";
import { getFormat } from "../../helper/util";
import { ok, fromProxy } from "internal-prop";
import { Stats } from "../../helper/stats";
import { addBefore } from "../stdlib";

export const PROXY: Serializer = (x, stats) => {
    if (!ok) return FAIL;
    const temp = fromProxy(x);
    if (!temp) return FAIL;
    const out = new Prx(stats, stats.scan(temp[0]), stats.scan(temp[1]));
    const circ = Circ.min(stats, temp);
    if (circ) setCirc(stats, x, new Deferred(x, circ));
    return out;
};

export class Prx implements IResult {
    constructor(public stats: Stats, public target: IResult, public handler: IResult) { }

    toString(level: string) {
        const { LAST, FULL, NEXT } = getFormat(this.stats.opts, level);
        return `new Proxy(${ FULL }${ this.target.toString(NEXT, true) },${ FULL }${ this.handler.toString(NEXT, true) }${ LAST })`;
    }
}

addBefore(OBJECT_NULL_PROTOTYPE, PROXY);