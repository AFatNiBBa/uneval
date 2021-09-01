
# uneval.js
Convert an object to its source code (With circular references too!) <br>
Now even in the browser! Just add this to your HTML code...
```html
<script src="https://cdn.jsdelivr.net/gh/AFatNiBBa/uneval@latest/main.js"></script>
```
...or this to your JavaScript
```js
document.head.append(Object.assign(document.createElement("script"), { src: "https://cdn.jsdelivr.net/gh/AFatNiBBa/uneval@latest/main.js" }));
```
> Always update to the latest version to have more features and bug fixes! <br>
> ```bash
> npm r uneval.js & npm i uneval.js
> ```

## Usage
You can both import the package like this...
```js
const uneval = require("uneval.js");
```
...and like this
```js
const { uneval } = require("uneval.js");
```
Simply pass the function as an argument to obtain the source code and eval it to obtain the object again.
> You additionally can give some options to personalize the output
```js
const a = {};
a.b = a.c = { a, url: /^(\+0?1\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$/ig };
a.e = a;
console.log(uneval(a, { tab: "  " }));
```
And the output will be
```js
(x => (
  x[1] = {
    c: x[2] = {
      url: /^(\+0?1\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$/gi
    },
    b: x[2]
  },
  x[2].a = x[1],
  x[1].e = x[1]
))({})
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
The available options are:
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
    - Setting it to `false` is like setting it to `""`
    - It defaults to `"\t"`
- **`method`**
    - If is set to `false` allows only the safe, but way uglier, syntax for objects methods
    - It defaults to `true`
- **`proto`**
    - Saves the class of objects (Including the `__proto__` property)
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

Note that in every option which accepts a boolean you can put `0` to represent `false` and everything not "falsy" to represent `true`.

## Supported
- All the things supported by json
- Multiple references (Even in Symbol keys)
    > In boxed symbols both the object and the primitive version can be referenced
- Circular references (Are much worse to implement, trust me)
- Sparse arrays
- Buffer
    > Only in node.js, not in Web
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
- The module itself 😳

## Unsupported (Or at least not completely)
- Proxies (If you know how to extract the `[[Target]]` and the `[[Handler]]` of a proxy tell me)
- Clojures (Functions that access external local variables)
    > If you create a function with the new object method syntax and a computed key...
    > ```js
    > uneval({
    >     [`val${ index }`]() {
    >         return 1;
    >     }
    > });
    > ```
    > ...you have to be carefull with what is inside the computed field too, unless you set the `method` option to `false` or the function is reference elsewhere
- Native functions (If not global)
- Command Line API functions (Web) (If not global)

## Future Support (Hopefully) in order of probability
1. Arrays and Functions custom fields
2. Non enumerable properties
3. Getters and Setters

## Known Problems
- If an object of special type (Such as `Array`, `String`, `Date`, ...) contains the first reference to an other object, that object will become undefined everywhere
    ```js
    const a = new Date();
    a.b = {};
    console.log(eval(uneval({
        a,
        b: a.b
    }))); // { a: 2021-08-16T02:57:10.125Z, b: undefined }
    ```
- If a sparse array is completely empty the generated object will have the length decreased by 1
    ```js
    const a = [];
    a.length = 3;
    console.log(
        a.length,
        eval(uneval(a)).length
    ); // 3 2
    ```