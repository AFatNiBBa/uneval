
import uneval, { Opts } from "uneval.js";

export const serialize = (x: any, opts?: Opts) => uneval(x, Object.assign({ pretty: false }, opts));
export const sanitize = (x: string) => x.replace(/\{\s+\}/g, "{}"); // Ensures that the compiler doesn't change the source of functions to much
export const check = (name: string, x: any, str: string) => test(name, () => expect(sanitize(serialize(x))).toBe(str));
export const back = <T>(x: T) => <T>(0,eval)(serialize(x));