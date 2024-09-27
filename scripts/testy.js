import { FIGlet } from "../index.js";
import * as fonts from "../fonts.js";

const testStr = "Hello, World"

Object.keys(fonts).forEach(font => {
    console.log(font);
    const fonty = new FIGlet(fonts[font]);
    console.log(fonty.write(testStr));
});