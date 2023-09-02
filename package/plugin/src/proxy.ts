
import { ok, fromProxy } from "internal-prop";
import { Internal } from "uneval.js";

const {
    FAIL,
    addBefore,
    util: { getFormat },
    Route: {
        circ: { Circ },
        deferred: { Deferred },
        simple: { OBJECT_NULL_PROTOTYPE }
    }
} = Internal;

export const PROXY: Internal.Serializer = (x, stats) => {
    if (!ok) return FAIL;
    const temp = fromProxy(x);
    if (!temp) return FAIL;
    const out = new Prx(stats, stats.scan(temp[0]), stats.scan(temp[1]));
    const circ = Circ.min(stats, temp);
    if (circ) Deferred.basedOn(stats, circ, x);
    return out;
};

export class Prx implements Internal.IResult {
    constructor(public stats: Internal.Stats, public target: Internal.IResult, public handler: Internal.IResult) { }

    toString(level: string) {
        const { LAST, FULL, NEXT } = getFormat(this.stats.opts, level);
        return `new Proxy(${ FULL }${ this.target.toString(NEXT, true) },${ FULL }${ this.handler.toString(NEXT, true) }${ LAST })`;
    }
}

addBefore(OBJECT_NULL_PROTOTYPE, PROXY);