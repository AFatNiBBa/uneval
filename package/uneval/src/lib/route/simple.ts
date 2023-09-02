
import { isObjectWrapper, notSupported } from "../../helper/util";
import { FAIL, Serializer } from "../../helper/serializer";

export const GLOBAL: Serializer = x => x === globalThis ? "globalThis" : FAIL;

export const NEG_0: Serializer = x => Object.is(x, -0) ? "-0" : FAIL;

export const SIMPLE: Serializer = x => x == null || typeof x === "boolean" || typeof x === "number" ? `${x}` : FAIL;

export const BIG_INT: Serializer = x => typeof x === "bigint" ? `${x}n` : FAIL;

export const STRING: Serializer = x => typeof x === "string" ? JSON.stringify(x) : FAIL;

export const WRAPPER: Serializer = (x: object, stats) => isObjectWrapper(x) ? stats.wrap`Object(${ x.valueOf() })` : FAIL;

export const REGEX: Serializer = x => x instanceof RegExp ? x.toString() : FAIL;

export const DATE: Serializer = (x, stats) => x instanceof Date ? stats.wrap`new Date(${ x.toISOString() })` : FAIL;

export const OBJECT_NULL_PROTOTYPE: Serializer = x => typeof x === "object" && Object.getPrototypeOf(x) === null && Reflect.ownKeys(x).length === 0 ? "Object.create(null)" : FAIL;

export const NOT_SUPPORTED: Serializer = (_, stats) => notSupported("Not serializable", stats.opts.space);