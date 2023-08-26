
import { IResult } from "../../helper/serializer";
import { Stats } from "../../helper/stats";
import { getRef } from "../route/ref";

const isPositiveNumber = /^[0-9]*(?:\.[0-9]*)?(?<!^\.)(?:e[+-]?[0-9]+)?$/;
const isVariable = /^[A-Za-z$_][0-9A-Za-z$_]*$/;

export class Key implements IResult {
    value: IResult;

    constructor(public stats: Stats, public k: string | symbol, public isObj: boolean) { this.value = stats.scan(k); }

    toString(level: string): string {
        return this.isObj && this.k === "__proto__" || typeof this.k === "symbol" || getRef(this.stats, this.k)?.used
            ? `[${ this.value.toString(level, true) }]`
            : this.k.match(isVariable)
                ? this.isObj ? this.k : `.${ this.k }`
                : this.k.match(isPositiveNumber) 
                    ? this.isObj ? this.k : `[${ this.k }]`
                    : this.isObj ? JSON.stringify(this.k) : `[${ this.value.toString(level, true) }]`;
    }
}