import { FIGlet } from "../dist/index.js";
import fs from "node:fs";

const esmFonts = fs.readdirSync(process.cwd() + "/dist/fonts");

const testStr = "Hello, World"

console.log('***\nESM\n***')
esmFonts.filter(file => file.slice(-3) === '.js').forEach(async font => {
    const config = await import(process.cwd() + `/dist/fonts/${font}`);
    const fonty = new FIGlet(config[font.slice(0, -3)]);
    const fontNameLen = font.slice(0,-3).length;
    console.log(`---${font.slice(0,-3)}---`);
    process.stdout.write(fonty.write(testStr));
    console.log(`---${"=".repeat(fontNameLen)}---`);
});