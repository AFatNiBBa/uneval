
import { IResult } from "../../helper/serializer";
import { getFormat } from "../../helper/util";
import { Stats } from "../../helper/stats";

export class Call implements IResult {
    constructor(public stats: Stats, public f: IResult, public list: IResult[]) { }

    getArgs(level: string) {
        if (this.list.length === 0) return "()";
        const { LAST, FULL, NEXT } = getFormat(this.stats.opts, level);

        var out = "";
        for (const elm of this.list)
            out += `${ out && "," }${ FULL }${ elm.toString(NEXT, true) }`;
            
        return `(${ out }${ LAST })`;
    }

    toString(level: string) {
        return this.f.toString(level, false) + this.getArgs(level);
    }
}