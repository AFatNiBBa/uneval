
# uneval.js
Convert an object to its source code (With circular references too!) <br>
Now even in the browser!
```html
<script src="https://cdn.jsdelivr.net/gh/AFatNiBBa/uneval@latest/main.js"></script>
```
> Always update to the latest version to have more features! <br>
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
console.log(uneval([1, { a: "hi" }], { pretty: false })) // [1,{a:"hi"}]
```

## Options
Additionally to the object to stringify you can pass an option object to personalize your output.
The available options are
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
- **`proto`**
    - Saves the class of objects (Including the `__proto__` property)
    - It defaults to `true`
- **`safe`**
    - Wraps object literals in brackets to not confuse them with blocks
    - It defaults to `true`
- **`func`**
    - Put the top object in a function that defines the cache variable
    - It defaults to `true`
- **`val`**
    - The name of the variable which will cache the repeated references
    - It defaults to `"x"`

## Supported
- All the things supported by json
- Multiple references (Even in Symbol keys)
- Circular references (Are much worse to implement, trust me)
- Sparse arrays
- Buffer (Only in node.js, not in Web)
- The Global object
- `undefined`
- `-0`, `NaN`, `Infinity`, `-Infinity`
- Symbols
- Symbol keys
- Functions
- Regular Expressions
- Maps
- Sets
- Dates
- Boxed Primitives, like `new String("hello")`
- New syntax for object's methods, like `{ func() {} }` (Will look very bad)
- Big Integers
- Objects without a prototype
- Custom types

## Unsupported (Or at least not completely)
- Proxies (If you know how to extract the `[[Target]]` and the `[[Handler]]` of a proxy tell me)
- Clojures (Functions that access external local variables)
- Native functions
- Command Line API functions (Web)

## Coming Soon (Hopefully) in order of probability
1. Arrays and Functions custom fields
2. Non enumerable properties
3. Getters and Setters

## Known Problems
- The references to a primitive version of a symbol are not detected
    ```js
    const a = Symbol("hi");
    const b = eval(uneval({
        c: Object(a),
        d: a
    }));
    console.log(b.c === b.d); // false
    ```
- If an object of special type (Such as `Array`, `String`, `Date`, ...) contains the first reference to an other object, that object will become undefined everywhere
    ```js
    const a = new Date();
    a.b = {};
    console.log(eval(uneval({
        a,
        b: a.b
    }))); // { a: 2021-08-16T02:57:10.125Z, b: undefined }
    ```