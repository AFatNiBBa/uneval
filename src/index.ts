
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

////////////////////////////////////////////////////////////////////////////////////////////////

const out = new Set<any>([ 1, 2, 3 ]);
out.add(out).add([out]);

show(out);

function show(x: any) {
    console.dir(x);
    console.log();
    const out = uneval(x, { tab: 2 });
    console.log(out);
    console.log();
    console.dir(eval(out));
}