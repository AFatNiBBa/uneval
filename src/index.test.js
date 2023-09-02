
const { uneval } = require("../dist/index");

const serialize = (x, opts) => uneval(x, Object.assign({ pretty: false }, opts));
const check = (name, x, str) => test(name, () => expect(serialize(x)).toBe(str));
const back = x => (0,eval)(serialize(x));

describe("simple", () => {
    check("global", globalThis, "globalThis");
    check("neg0", -0, "-0");
    check("simple", [ null, true, false, 78 ], "[null,true,false,78]");
    check("bigint", -4441455164681464912648146184561986545n, "-4441455164681464912648146184561986545n");
    check("string", '"ciao\nbeppe"', '"\\"ciao\\nbeppe\\""');
    check("wrapper", new Number(12), "Object(12)");
    check("regex", new RegExp("a+b[cd]ef", "ig"), "/a+b[cd]ef/gi");
    check("date", new Date("2023-09-01T01:39:51.041Z"), 'new Date("2023-09-01T01:39:51.041Z")');
    check("null-proto", { __proto__: null }, "Object.create(null)");
});

describe("symbol", () => {
    check("normal", Symbol("a"), 'Symbol("a")');
    check("for", Symbol.for("a"), 'Symbol.for("a")');
    check("global", Symbol.iterator, "Symbol.iterator");
    check("wrapper", Object(Symbol.for("a")), 'Object(Symbol.for("a"))');
});

describe("set", () => {
    check("normal", new Set([ 1, 2, 3 ]), "new Set([1,2,3])");
    
    test("circular", () => {
        const a = new Set([ 1, 2, 3 ]);
        a.add(6).add(a).add(7);
        const b = back(a);
        const c = [...b];
        expect(c).toHaveProperty("length", 6);
        expect(c).toHaveProperty("0", 1);
        expect(c).toHaveProperty("1", 2);
        expect(c).toHaveProperty("2", 3);
        expect(c).toHaveProperty("3", 6);
        expect(c).toHaveProperty("4", b);
        expect(c).toHaveProperty("5", 7);
    });
});

describe("map", () => {
    check("normal", new Map([ [ 1, 2 ], [ 3, 4 ] ]), "new Map([[1,2],[3,4]])");
    
    test("circular", () => {
        const a =  new Map([ [ 1, 2 ], [ 3, 4 ] ]);
        const b = { a };
        a.set(5, 6).set(a, b).set(b, a).set({ a },a).set(8, 9);
        const c = back(b);
        expect(c).toHaveProperty("a");
        expect(c.a).toBeInstanceOf(Map);
        expect(c.a).toHaveProperty("size", 7);
        expect(c.a.get(1)).toBe(2);
        expect(c.a.get(3)).toBe(4);
        expect(c.a.get(5)).toBe(6);
        expect(c.a.get(c.a)).toBe(c);
        expect(c.a.get(c)).toBe(c.a);
        expect(c.a.get([...c.a.keys()][6])).toBe(c.a);
        expect(c.a.get(8)).toBe(9);
    });
});

describe("proto-of", () => {
    check("normal", Object.setPrototypeOf({a:1},{b:2}), "Object.setPrototypeOf({a:1},{b:2})");
    
    test("circular", () => {
        const a = {};
        const b = { c: Object.setPrototypeOf({ d: 4 }, a) };
        a.b = b;
        const c = back(a);
        expect(c).toHaveProperty("b");
        expect(c.b).toHaveProperty("c");
        expect(c.b.c).toHaveProperty("d", 4);
        expect(Object.getPrototypeOf(c.b.c)).toBe(c);
    });
});

describe("function", () => {
    // The source of the functions may be different from what has been written (Mostly with spacing) because "jest" preprocesses the file
    check("large-named", function a() {}, "(function a() {})");
    check("large", function () {}, "(function () {})");
    check("lambda", () => {}, "(() => {})");
    check("native", Array.prototype.fill, "undefined");
    check("native-global", Array, "globalThis.Array");
    check("special", { a() { } }, "({a() {}})");
    check("special-renamed", { b: { a() { } }.a }, "({b:(x => x[Reflect.ownKeys(x)[0]])({a() {}})})");

    test("special-ref", () => {
        const a = { a() { return 12; } };
        a.b = a.a;
        const b = back(a);
        expect(b).toHaveProperty("a");
        expect(b).toHaveProperty("b", b.a);
        expect(b.a).toBeInstanceOf(Function);
        expect(b.a()).toBe(12);
    });
});

describe("object", () => {
    check("normal/top", { a: { b: 1 } }, "({a:{b:1}})");
    check("complex-key", { "854b5 42 5 f98": 1 }, '({"854b5 42 5 f98":1})');
    check("symbol-key", { [Symbol.iterator]: 1 }, '({[Symbol.iterator]:1})');
    check("proto", { ["__proto__"]: { a: 12 } }, '({["__proto__"]:{a:12}})');
    check("no-proto", { __proto__: { a: 12 } }, "Object.setPrototypeOf({},{a:12})");
    
    test("key=value", () => {
        const a = { [Symbol.for("a")]: Symbol.for("a") };
        const b = back(a);
        expect(b[Symbol.for("a")]).toBe(Symbol.for("a"));
    });
});

describe("array", () => {
    check("normal", [ 1, 2, 3 ], "[1,2,3]");
    check("sparse", [ ,,, 1, 2,,,,,,, 3, ], "[,,,1,2,,,,,,,3]");
});

describe("proto", () => {
    check("normal", class {}.prototype, "(class {}).prototype");
    check("class-proto", ((x={})=>({a:x[1]=class {},b:x[1].prototype}))(), "((x={})=>({a:x[1]=class {},b:x[1].prototype}))()");
    check("proto-class", ((x={})=>({b:(x[1]=class {}).prototype,a:x[1]}))(), "((x={})=>({b:(x[1]=class {}).prototype,a:x[1]}))()");
});

test("circ", () => {
    const a = {};
    a.a = a;
    const b = back(a);
    expect(b).toHaveProperty("a", b);
});

test("ref", () => {
    const a = { b: {} };
    a.c = a.b;
    const b = back(a);
    expect(b).toHaveProperty("b");
    expect(b).toHaveProperty("c", b.b);
});