import { FIGlet } from "../dist/index.js";
import fs from "node:fs";

const esmFonts = fs.readdirSync(process.cwd() + "/dist/fonts");

const testStr = "Hello, World"

const font = process.argv.slice(2)?.at(0);

console.log('***\nESM\n***')
esmFonts.filter(file => (font ? font === file.slice(0, -3) : true) && file.slice(-3) === '.js').forEach(async font => {
    const config = await import(process.cwd() + `/dist/fonts/${font}`);
    const fonty = new FIGlet(config[font.slice(0, -3)]);
    const fontNameLen = font.slice(0,-3).length;
    console.log(`---${font.slice(0,-3)}---`);
    process.stdout.write(fonty.write(testStr));
    console.log(`---${"=".repeat(fontNameLen)}---`);
});