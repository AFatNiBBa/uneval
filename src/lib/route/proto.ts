
import { FAIL, IResult, Serializer } from "../../helper/serializer";
import { Stats } from "../../helper/stats";

export const PROTO: Serializer = (x, stats) => {
    const ctor = x.constructor;
    return typeof ctor === "function" && ctor.prototype === x 
        ? new Proto(stats, ctor)
        : FAIL;
};

export class Proto implements IResult {
    class: IResult;

    constructor(stats: Stats, value: Function) { this.class = stats.scan(value); }

    toString(level: string) {
        return `${ this.class.toString(level, false) }.prototype`;
    }
}