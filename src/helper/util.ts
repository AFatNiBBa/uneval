
import { IResult } from "./serializer";
import { Stats } from "./stats";
import { Opts } from "./opts";

export function wrap(str: ReadonlyArray<string>, ...args: IResult[]): IResult {
    return {
        toString(level) {
            return args.reduce<string>((r, x, i) => `${ r }${ x.toString(level, true) }${ str[i + 1] }`, str[0]);
        }
    }
}

export function isFunctionSpecial(source: string) {
    try { eval(`(${ source })`); }
    catch { return true; }
    return false;
}

export function getFormat(opts: Opts, level: string) {
    const LAST = opts.space + opts.endl + level;
    return { LAST, FULL: LAST + opts.tab, NEXT: level + opts.tab };
}

export function notSupported(cause: string, space: string) {
    return `undefined${ space && `${ space }/*${ space }${ cause.replace("*/", "* /") }${ space }*/` }`;
}

export function isObjectWrapper(obj: any) {
    return obj instanceof String || obj instanceof Number || obj instanceof BigInt || obj instanceof Boolean || obj instanceof Symbol;
}

export function isClass(ctor: any) {
    return typeof ctor === "function" && (ctor as Function).toString().startsWith("class");
}

export function createStoreKey<T>(desc?: string) {
    const key = Symbol(desc);
    const getOrCreateFor = (stats: Stats, obj: any, out?: object) => stats.store.get(obj) ?? (stats.store.set(obj, out = {}), out);
    return [
        (stats: Stats, obj: any) => <T>getOrCreateFor(stats, obj)[key],
        <Y extends T>(stats: Stats, obj: any, v?: Y) => getOrCreateFor(stats, obj)[key] = v,
    ] as const
}