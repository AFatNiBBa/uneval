
import { IResult, Serializer, FAIL } from "../../helper/serializer";
import { getFormat } from "../../helper/util";
import { Stats } from "../../helper/stats";
import { Circ } from "./circ";

export const ARRAY: Serializer = (x, stats) => x instanceof Array ? new Arr(stats, x) : FAIL;

export class Arr implements IResult {
    list: IResult[] = [];

    constructor(public stats: Stats, list: any[]) {
        if (++stats.depth <= stats.opts.depth)
            for (var i = 0, struct: IResult; i < list.length; i++)
                if (i in list && (struct = Circ.tryOrAssign(stats, list, i.toString(), list[i])))
                    this.list[i] = struct;
        stats.depth--;
    }

    toString(level: string): string {
        return Arr.toString(this.list, this.stats, level);
    }

    static toString(list: IResult[], stats: Stats, level: string) {
        if (list.length === 0) return "[]";
        const { LAST, FULL, NEXT } = getFormat(stats.opts, level);

        var out = "";
        for (var i = 0; i < list.length; i++)
            out += i in list
                ? `${ FULL }${ list[i].toString(NEXT, true) }${ i + 1 < list.length ? "," : "" }`
                : `${ i ? "" : FULL },`;
                
        return `[${ out }${ LAST }]`;
    }
}