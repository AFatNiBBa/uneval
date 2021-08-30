
global.print = (...args) => void console.log(">>>", args) ?? args[0];

const uneval = require("./main.js");

const temp = {
    1: "caio", 
    2: new String("caio"),
    3: {},
    31: undefined,
    31.5: new Set([
        Symbol.hasInstance
    ]),
    32: Symbol.toStringTag,
    [Symbol.toStringTag]: 32,
    a: 1,
    ew: new class ew {y=9;ew=this.constructor},
    io: new class{[1]=9},
    opppo: null,
    $: /acia/ig,
    33: Buffer.from("ciao"),
    "": () => { },
    b: {
        [Symbol.for("ciccio")]: 9,
        [Symbol.hasInstance]: Symbol.hasInstance,
        [Symbol.asyncIterator]: new Map([
            [ Symbol.asyncIterator, Symbol.for("ciccio") ],
            [1,2]
        ]),
        2: 112,
        asas: [
            1,
            2,
            3,
            {
                o: 98
            }
        ],
        test: [{},[]],
        ui: Array.prototype.fill,
        c: Symbol.for("ciccio"),
        d: Symbol("cacac"),
        e: Symbol.iterator,
        f: [Symbol.iterator, Symbol.for("ciccio")]
    },
    *[Symbol.iterator]() {
        yield 1;
        yield 2;
    },
    gh: Object.create(null),
    klol: new Date()
};
temp.c = temp.b;
temp.d = temp.c.asas[3];
temp.e=temp;
temp.b.asas.push(temp);
temp.b.asas.push(temp.b.asas);
temp.l=temp[""];
temp[4]=temp[2];
temp[5]=temp.$;
temp[31.5].add(temp.b[Symbol.asyncIterator]);
temp[34] = function() {
    return this;
};

const out = uneval(temp, {
    tab: "  ",
    pretty: true
});

console.log(out);
module.exports = eval(out);