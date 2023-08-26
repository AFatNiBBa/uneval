
import { Serializer } from "../helper/serializer";

import { BIG_INT, DATE, GLOBAL, NEG_0, NOT_SUPPORTED, OBJECT_NULL_PROTOTYPE, REGEX, SIMPLE, STRING, WRAPPER } from "./route/simple";
import { GLOBAL_SYMBOL, SYMBOL } from "./route/symbol";
import { HASH_SET } from "./route/hashSet";
import { HASH_MAP } from "./route/hashMap";
import { PROTO_OF } from "./route/protoOf";
import { FUNCTION } from "./route/func";
import { OBJECT } from "./route/object";
import { ARRAY } from "./route/array";
import { PROTO } from "./route/proto";
import { CIRC } from "./route/circ";
import { REF } from "./route/ref";

export function addBefore(ref: Serializer, value: Serializer) {
    stdlib.splice(stdlib.indexOf(ref) - 1, 0, value);
}

export function addAfter(ref: Serializer, value: Serializer) {
    stdlib.splice(stdlib.indexOf(ref) + 1, 0, value);
}

export {
    GLOBAL,
    GLOBAL_SYMBOL,
    NEG_0,
    SIMPLE,
    BIG_INT,
    CIRC,
    REF,
    STRING,
    SYMBOL,
    OBJECT_NULL_PROTOTYPE,
    PROTO,
    PROTO_OF,
    REGEX,
    DATE,
    HASH_SET,
    HASH_MAP,
    WRAPPER,
    FUNCTION,
    ARRAY,
    OBJECT,
    NOT_SUPPORTED
};

export const stdlib = [
    GLOBAL,
    GLOBAL_SYMBOL,
    NEG_0,
    SIMPLE,
    BIG_INT,
    CIRC,
    REF,
    STRING,
    SYMBOL,
    OBJECT_NULL_PROTOTYPE,
    PROTO,
    PROTO_OF,
    REGEX,
    DATE,
    HASH_SET,
    HASH_MAP,
    WRAPPER,
    FUNCTION,
    ARRAY,
    OBJECT,
    NOT_SUPPORTED
];