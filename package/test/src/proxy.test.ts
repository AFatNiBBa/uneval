
import { check } from "./util";
import "@seanalunni/uneval-v8";

check("normal", new Proxy({ a: 1 }, { get() {} }), "new Proxy({a:1},{get() {}})");