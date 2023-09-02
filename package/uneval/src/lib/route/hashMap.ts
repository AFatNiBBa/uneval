
import { IResult, Serializer, FAIL } from "../../helper/serializer";
import { Stats } from "../../helper/stats";
import { Circ, ICirc } from "./circ";
import { Call } from "../util/call";
import { Arr } from "./array";

const ADD_ALL: (a: Map<any, any>, ...b: [ any, any ][]) => void = (m,...l)=>l.forEach(e=>m.set(e[0],e[1]));

export const HASH_MAP: Serializer = (x, stats) => x instanceof Map ? new HashMap(stats, x) : FAIL;

export class HashMap implements IResult {
    list: IResult[] = [];

    constructor(public stats: Stats, map: Map<any, any>) {
        if (++stats.depth <= stats.opts.depth)
        {
            const iter = map[Symbol.iterator]();

            for (var value: [ any, any ]; !({ value } = iter.next()).done; )
            {
                const pair = new KeyValuePair(stats, value[0], value[1]);
                const circ = Circ.min(stats, value);

                if (circ)
                {
                    this.sub(circ, map, pair, iter);
                    break;
                }

                this.list.push(pair);
            }
        }
        stats.depth--;
    }

    sub(circ: ICirc, map: Map<any, any>, kw: KeyValuePair, iter: Iterator<any>) {
        const list = [ this.stats.scan(map), kw ];
        const call = new Call(this.stats, this.stats.scan(ADD_ALL), list);
        
        for(var value: [ any, any ]; !({ value } = iter.next()).done; )
        {
            const pair = new KeyValuePair(this.stats, value[0], value[1]);
            const sub = Circ.min(this.stats, value);

            if (sub && sub !== circ) // Groups the same circular references
            {
                circ.add(call, false); // It has to be added before the ones in the inner most calls
                this.sub(sub, map, pair, iter);
                return;
            }

            list.push(pair);
        }

        circ.add(call, false);
    }

    toString(level: string) {
        const temp = Arr.toString(this.list, this.stats, level);
        return `new Map(${ temp === "[]" ? "" : temp })`;
    }
}

export class KeyValuePair implements IResult {
    k: IResult;
    v: IResult;

    constructor(public stats: Stats, k: any, v: any) {
        this.k = stats.scan(k);
        this.v = stats.scan(v);
    }

    toString(level: string) {
        return Arr.toString([ this.k, this.v ], this.stats, level);
    }
}