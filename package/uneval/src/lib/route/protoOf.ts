
import { IResult, Serializer, FAIL } from "../../helper/serializer";
import { getFormat, isClass, wrap } from "../../helper/util";
import { getDeferredOrCirc } from "../util/deferred";
import { Stats } from "../../helper/stats";

const known = new Set([ RegExp, Date, String, Number, BigInt, Boolean, Symbol, Function, Array, Object, Set, Map ].map(x => x.prototype));

export const PROTO_OF: Serializer = (x: object, stats, next) => {
    if (!stats.opts.proto) return FAIL;
    if (isClass(x)) return FAIL; // Excludes classes (Which have their base class as their prototype)
    if (known.has(x)) return FAIL; // Excludes known prototypes

    const proto = Object.getPrototypeOf(x);
    if (known.has(proto)) return FAIL; // This serializer handles derived prototypes of the handled ones so it must be before the things it will probably skip

    const struct = stats.scan(proto);
    const circ = getDeferredOrCirc(stats, proto);
    if (!circ) return new ProtoOf(stats, next(), struct);

    circ.add(wrap`Object.setPrototypeOf(${ stats.scan(x) },${ stats.opts.space }${ struct })`, false);
    return FAIL;
};

export class ProtoOf implements IResult {
    constructor(public stats: Stats, public value: IResult, public proto: IResult) { }
    
    toString(level: string) {
        const { LAST, FULL, NEXT } = getFormat(this.stats.opts, level);
        return `Object.setPrototypeOf(${ FULL }${ this.value.toString(NEXT, true) },${ FULL }${ this.proto.toString(NEXT, true) }${ LAST })`;
    }
}