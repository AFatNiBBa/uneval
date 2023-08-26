
import { IResult, Serializer, FAIL } from "../../helper/serializer";
import { Stats } from "../../helper/stats";
import { ICirc, getCirc } from "./circ";
import { Call } from "../util/call";
import { Arr } from "./array";

const ADD_ALL: <T>(a: Set<any>, b: T, ...c: any[]) => T = (s,...l)=>(l.forEach(e=>s.add(e)),l[0]);

export const HASH_SET: Serializer = (x, stats) => x instanceof Set ? new HashSet(stats, x) : FAIL;

export class HashSet implements IResult {
    list: IResult[] = [];

    constructor(public stats: Stats, set: Set<any>) {
        if (++stats.depth <= stats.opts.depth)
        {
            const iter = set[Symbol.iterator]();

            for (var value: any; !({ value } = iter.next()).done; )
            {
                const struct = stats.scan(value);
                const circ = getCirc(stats, value);

                if (circ)
                {
                    this.sub(circ, set, struct, iter);
                    break;
                }

                this.list.push(struct);
            }
        }
        stats.depth--;
    }

    sub(circ: ICirc, set: Set<any>, struct: IResult, iter: Iterator<any>) {
        const list = [ this.stats.scan(set), struct ];
        const call = new Call(this.stats, this.stats.scan(ADD_ALL), list);
        
        for (var value: any; !({ value } = iter.next()).done; )
        {
            const temp = this.stats.scan(value);
            const sub = getCirc(this.stats, value);

            if (sub)
            {
                circ.add(call); // It has to be added before the ones in the inner most calls
                this.sub(sub, set, temp, iter);
                return;
            }

            list.push(temp);
        }

        circ.add(call);
    }

    toString(level: string) {
        const temp = Arr.toString(this.list, this.stats, level);
        return `new Set(${ temp === "[]" ? "" : temp })`;
    }
}