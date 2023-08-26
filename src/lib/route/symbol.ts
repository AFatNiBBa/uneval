
import { FAIL, Serializer } from "../../helper/serializer";

const isGlobal = /(?<=^Symbol\.)[A-Za-z$_][0-9A-Za-z$_]*$/;

export const GLOBAL_SYMBOL: Serializer = x => 
    typeof x === "symbol" && Symbol[x.description.match(isGlobal)?.[0]] === x
        ? x.description
        : FAIL;
        
export const SYMBOL: Serializer = (x, stats) =>
    typeof x === "symbol"
        ? x === Symbol.for(x.description)
            ? stats.wrap`Symbol.for(${ x.description })`
            : stats.wrap`Symbol(${ x.description })`
        : FAIL;