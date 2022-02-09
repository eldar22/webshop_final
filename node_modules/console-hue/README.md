# console-hue

This tiny module is basically an improved version of the native `console.log`, adding colour support for different type of messages and a "Stringify" functionality by default for `Objects` and `Arrays`.

## Install

You can install with [npm]:

```sh
$ npm install --save console-hue
```
## Usage

When you import the module, the following methods will be exposed:

```js

const consoleh = require('console-hue')
{ error: [Function],
  success: [Function],
  warn: [Function],
  debug: [Function],
  log: [Function],
  blue: [Function],
  pink: [Function],
  red: [Function],
  green: [Function],
  yellow: [Function],
  cyan: [Function] }
  ```

 And then you can use `consoleh` with any of the previous methods to get a colourful reply in the console:

 ```js

 > const consoleh = require('console-hue')
// Green output
consoleh.success('This message should be green')
// Red output
consoleh.error('This message should be red')
// Yellow output
consoleh.warning('This message should be yellow')

 ```

As described before the module will attempt to "Stringify" the Arrays and Objects passed in the message sent to the module. You can override this behaviour by passing `true` as the second parameter:

```js

> const consoleh = require('console-hue')
// With default Stringigy behaviour
consoleh.log({fn: function(msg) {console.log(msg)}})
{}
// Getting the original msg without Stringigy
consoleh.log({fn: function(msg) {console.log(msg)}}, true)
[object Object]

```


### License

 Copyright © 2019, [Juan Convers](https://juanconvers.com).
 Released under the [MIT License](LICENSE).
