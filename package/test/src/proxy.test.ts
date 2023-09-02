
import { check } from "./util";
import "@seanalunni/uneval-v8";

check("normal", new Proxy({ a: 1 }, { get() {} }), "new Proxy({a:1},{get() {}})");

// test("circular", () => {
//     const a: any = { c: 1 };
//     a.b = new Proxy(a, <any>{ b: 2 });
//     console.log(">>>", serialize(a, true));
// });