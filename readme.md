
# uneval.js
Convert an object to its source code (With circular references and **PROXIES** too!) <br>
Now even in the browser! Just add this to your HTML code...
```html
<script src="https://cdn.jsdelivr.net/gh/AFatNiBBa/uneval@latest/main.js"></script>
```
...or this to your JavaScript
```js
document.head.append(Object.assign(document.createElement("script"), { src: "https://cdn.jsdelivr.net/gh/AFatNiBBa/uneval@latest/main.js" }));
```
> Always update to the latest version to have more features and bug fixes (A looot of bug fixes!) <br>
> ```bash
> npm r uneval.js & npm i uneval.js
> ```

## Warning
If you get any error while installing or the Proxies are not stringified properly refer to the "warning" section of [this](https://github.com/AFatNiBBa/internal-prop#warning)

## Usage
You can both import the package like this...
```js
const uneval = require("uneval.js");
```
...and like this
```js
const { uneval } = require("uneval.js");
```
Simply pass an object to the function as an argument to obtain the source code and eval it to obtain the object again.
> You additionally can give some options to personalize the output
```js
const a = {};
a.b = a.c = { a, url: /^(\+0?1\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$/ig };
a.e = a;
console.log(uneval(a, { tab: "  " }));
```
And the output will be
```js
((x = {}) => (
  x[1] = {
    c: x[2] = {
      url: /^(\+0?1\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$/gi
    },
    b: x[2]
  },
  x[2].a = x[1],
  x[1].e = x[1]
))()
```
Note that the complexity of the output depends on the complexity of the input
```js
console.log(uneval([1, { a: "hi" }], { tab: 0, endl: 0 })) // [ 1, { a: "hi" } ]
```
You can save an object to file using the write function (Only in node)
```js
uneval.write("./filename.js", [1, { a: "hi" }], { tab: "  " });
```
Then `"filename.js"` will contain
```js
module.exports = [ 
  1, 
  { 
    a: "hi" 
  } 
];
```

## Options
Additionally to the object to stringify you can pass an option object to personalize your output.
The option object will change during the process, it is advised that you don't use it elsewhere.
The available options are:
- **`namespace`**
    - A `Map` that translates specific instances into their source
    - It defautls to `undefined`
- **`pretty`**
    - Setting it to `false` deactivates `space`, `endl` and `tab`
    - It defaults to `true`
- **`space`**
    - Set the string that will replace the spaces in the output
    - Setting it to `false` is like setting it to `""`
    - It defaults to `" "`
- **`endl`**
    - Set the string that will replace the new lines in the output
    - Setting it to `false` is like setting it to `""`
    - It defaults to `"\n"`
- **`tab`**
    - Set the string that will replace the tabs in the output
    - Setting it to a number "n" is like setting it to the `space` option repeated "n" times
    - Setting it to `false` is like setting it to `""`
    - It defaults to `"\t"`
- **`custom`**
    - If is set to `false` the custom conversions will be ignored
    - It defaults to `true`
- **`method`**
    - If is set to `false` allows only the safe, but way uglier, syntax for objects methods
    - It defaults to `true`
- **`proxy`**
    - If it is set to `true` stringifies proxies as they really are
    - It defaults to `true` (In the browser it is always counted as `false` because it uses things that are only in node)
- **`proto`**
    - Saves the class of objects (Including the `__proto__` property)
    - It defaults to `true`
- **`depth`**
    - If not `Infinity` specifies the maximum depth in which the object should be serialized
    - It defaults to `Infinity`
- **`call`**
    - If `false` wraps forcibly the result in a function but doesn't evaluate it
    - It defaults to `true`
- **`safe`**
    - Wraps object literals in brackets to not confuse them with blocks
    - It's always `true` if the object is in the wrapper function
    - It defaults to `true`
- **`func`**
    - Put the top object in a function that defines the cache variable
    - It defaults to `true`
- **`val`**
    - The name of the variable which will cache the repeated references
    - It defaults to `"x"`
- **`conv`**
    - Only in the "write" function
    - If `false` the function will assume that the object is already serialized
    - It defaults to `true`
- **`export`**
    - Only in the "write" function
    - The code that will be put in front of the object source
    - If it is an object then the value of the property `pre` will be concatenated before the object while the value of `post` will be concatenated after
    - It defaults to `"module.exports = "`, the spaces will be the ones defined in the options
- **`stats`**
    - Not an option
    - Its an object containing stats on the last execution (If you keep the settings object) and its necessary for the `uneval()` function

Note that in every option which accepts a boolean you can put `0` to represent `false` and everything not "falsy" to represent `true`.

## Supported
- All the things supported by json
- Multiple references (Even in Symbol keys)
    > In boxed symbols both the object and the primitive version can be referenced
- Circular references (Are much worse to implement, trust me)
- Sparse arrays
- Buffer
    > Only in node.js, not in Web.
- Proxies
    > Only in node.js, not in Web. <br>
    
    > To inspect proxies i used a node internal function, but i noticed it is no longer available in newer versions of node, so i created my own native module to handle that, node will build the module from source when you download it, but that is a process that uses externals tools in your machine that may be not available. The function will try to use the old method if the new one is not available.
- The Global object
- `undefined`
- `-0`, `NaN`, `Infinity`, `-Infinity`
- Symbols
- Symbol keys
- Functions
- Global native (and command line API) functions
- Regular Expressions
- Maps
- Sets
- Dates
- Boxed Primitives, like `new String("hello")`
- New syntax for object's methods, like `{ func() {} }` (It'll look very bad with multiple references)
    > Note that generating like that a method called "function" would work by default
- Big Integers
- Objects with a `null` prototype
- Custom types
- Custom conversions
    > To define your own conversion you just need to define a function in your object (Or in its prototype) under the symbol `uneval.utils.customSource` (Or `Symbol.for("uneval.utils.customSource")` when uneval is not in the current context)
    > ```js
    > class NumArray extends Array { value = "test" }
    > 
    > NumArray.prototype[Symbol.for("uneval.utils.customScan")] = function(
    >     out,    // Object that will represent 'this'
    >     opts,   // The options that were passed to uneval with defaults applied
    >     cache,  // A map from object to structure (like "out")
    >     prev,   // A function to comunicate with the previous call to "uneval.scan()"
    >     parent, // An object that define where 'this' is define on its parent
    >     uneval  // The library, to not have clojures
    > ) { return out; } // It doesn't scan anything because it only uneval numbers
    > 
    > NumArray.prototype[Symbol.for("uneval.utils.customSource")] = function(
    >     struct, // Object that represents 'this'
    >     opts,   // The options that were passed to uneval with defaults applied
    >     level,  // A lot of "opts.tab" to put infront of every line of your code
    >     uneval  // The library, to not have clojures
    > ) { return `new NumArray(${ this.join("," + opts.space) })` }
    > 
    > const a = new NumArray(1, 2, 3);
    > a.b = { c: 4 };
    > console.log(uneval([ a, a.b ], { pretty: 0 }));
    > ```
    > It's a bit advanced but you SHOULD define the scan too, it is what has to get the structure of the object, if you leave the default it will scan things that may be not included in the generated source, but they will still be referenced <br>
    > Custom code:
    > ```js
    > [new NumArray(1,2,3),{c:4}]
    > ```
    > Custom without scan:
    > ```js
    > ((x={})=>[Object.setPrototypeOf(new NumArray(1,2,3),(class NumArray extends Array { value = "test" }).prototype),x[1]])()
    > ```
    > If you execute them you will notice that on the custom one that has not the scan defined there is a reference (`x[1]`) that is not defined anywhere, and it scanned the prototype of `NumArray` including it in the generated source, which is redundant.
- Custom definitions
    > Similiar to custom conversions, but it works on specific instances and with non objects too (View the `namespace` option for more details)
- The module itself 😳

## Unsupported (Or at least not completely supported)
- Clojures (Functions that access external local variables)
    > If you create a function with the new object method syntax and a computed key...
    > ```js
    > uneval({
    >     [`val${ index }`]() {
    >         return 1;
    >     }
    > });
    > ```
    > ...you have to be carefull with what is inside the computed field too.
    > To avoid this problem simply set the `method` option to `false`, this will use the (ugly) safe syntax, if the function is referenced elsewhere is used by default.
    > If a value is defined inside a non-safe method it will not be saved, additionally if it is the first time you include it all other references will be `undefined`
- Native functions and Command Line API functions (Web) (If not global), and their eventual user defined custom properties
- Class static properties or prototype properties that are not defined in the class block

## Future Support (Hopefully) in order of probability
1. Getters and Setters (For now are counted as normal properties)

## Known Problems
- On an object of a special class, if you add a custom property with a key which is one of those that the special class uses by default, then that property may be skipped (Look at <br> `[ ...uneval.utils.managedProtos.keys() ].map(x => x.constructor.name)` <br> for a full list)
    ```js
    const a = function b() {};
    a.name = { a: 1 };
    console.log(eval(uneval(a)).name); // b
    ```
- If you set the property `"__proto__"` on an object, the function will think that you are trying to assign the prototype
    ```js
    const a = Object.defineProperty({}, "__proto__", { value: 12, enumerable: true });
    console.log(a);                 // { ['__proto__']: 12 }
    console.log(eval(uneval(a)))    // Uncaught TypeError: Object prototype may only be an Object or null: 12
    ```