# figjs

A FIGlet driver for NodeJS.

### Usage

```js
const { FIGlet } = require("@garrettmorse/figjs");

const slant = new FIGlet("slant");

const coolText = slant.write("Hello, World!");

console.log(coolText);
```

### Fonts
* banner
* big
* block
* digital
* lean
* mnemonic
* slant
* small
* standard
* term


### Warning: Bugs

There are many FIGlet fonts that I've excluded from this package because I can't get them to work with my implementation (yet?).

I'm pretty confident about the ones that are included. That being said, "thar be dragons..."

There's currently a bug with certain combinations of characters that I can't quite be bothered to go and investigate. I think it's something to do with having multiple lines of blanks for a single character. You can reproduce this behavior by prepending your input with "!.".

Example

```js
const { FIGlet } = require("@garrettmorse/figjs");

const slant = new FIGlet("slant");

const brokenText = slant.write("!.Hello, World!");

console.log(brokenText);
```
