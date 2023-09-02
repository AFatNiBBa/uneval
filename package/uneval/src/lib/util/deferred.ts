
import { createStoreKey } from "../../helper/util";
import { IResult } from "../../helper/serializer";
import { ICirc, getCirc } from "../route/circ";
import { Stats } from "../../helper/stats";

const [ getDeferred, setDeferred ] = createStoreKey<Deferred>("deferred");
export { getDeferred };

export const getDeferredOrCirc = (stats: Stats, x: any): ICirc => getDeferred(stats, x) ?? getCirc(stats, x);

export class Deferred implements ICirc {
    get depth() { return this.circ.depth; }

    constructor(public circ: ICirc) { }

    add(value: IResult) { this.circ.add(value, false); }

    onCleanup(f: () => void) { this.circ.onCleanup(f); }

    static basedOn(stats: Stats, circ: ICirc, obj: any) {
        circ.onCleanup(() => setDeferred(stats, obj));
        return setDeferred(stats, obj, new Deferred(circ));
    }
}