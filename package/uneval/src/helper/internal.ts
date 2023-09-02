
import * as array from "../lib/route/array";
import * as circ from "../lib/route/circ";
import * as func from "../lib/route/func";
import * as hashMap from "../lib/route/hashMap";
import * as hashSet from "../lib/route/hashSet";
import * as object from "../lib/route/object";
import * as proto from "../lib/route/proto";
import * as protoOf from "../lib/route/protoOf";
import * as ref from "../lib/route/ref";
import * as simple from "../lib/route/simple";
import * as symbol from "../lib/route/symbol";
import * as call from "../lib/util/call";
import * as deferred from "../lib/util/deferred";
import * as key from "../lib/util/key";

export * from "./serializer";
export * from "../lib/stdlib";
export * as util from "./util";
export { Stats } from "./stats";
export { Opts } from "./opts";

export const Route = {
    array,
    circ,
    func,
    hashMap,
    hashSet,
    object,
    proto,
    protoOf,
    ref,
    simple,
    symbol,
    call,
    deferred,
    key
};