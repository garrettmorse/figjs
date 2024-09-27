# figjs

A FIGlet driver for JS.

### Usage

```js
import { FIGlet } from "@garrettmorse/figjs";
import { slant } from "@garrettmorse/figjs/fonts";

const figjs = new FIGlet(slant);

const coolText = figjs.write("Hello, World!");

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
import { FIGlet } from "@garrettmorse/figjs";
import { slant } from "@garrettmorse/figjs/fonts";

const figjs = new FIGlet(slant);

const brokenText = slant.write("!.Hello, World!");

console.log(brokenText);
```
