
import { InputOpts } from "./helper/opts";
import { Stats } from "./helper/stats";

export function uneval(obj: any, opts?: InputOpts | Stats) {
    const stats = opts instanceof Stats ? opts : new Stats(opts);    
    const { val, space, call, safe } = stats.opts;
    const struct = stats.scan(obj);
    const cache = stats.lastIndex ? `${ val }${ space }=${ space }{}` : "";
    const out = struct.toString("", call && !safe && !cache);
    
    if (call && !cache) return out;
    return `((${ cache })${ space }=>${ space }${ out })${ call ? "()" : "" }`;    
}

export * from "./lib/stdlib";
export default uneval;