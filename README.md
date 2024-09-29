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

### Supported Fonts
* banner
* big
* block
* bubble
* digital
* lean
* mini
* mnemonic
* slant
* small
* standard
* term


### Warning: Bugs

There are several FIGlet fonts that I've excluded from this package because I can't get them to work with my implementation (yet?).

I'm pretty confident about the ones that are included. That being said, "thar be dragons..."
