import { FIGlet } from "../dist/index.js";
import fs from "node:fs";

const esmFonts = fs.readdirSync(process.cwd() + "/dist/fonts");

const testStr = "Hello, World"

esmFonts.filter(file => file.slice(-3) === '.js').forEach(async font => {
    const config = await import(process.cwd() + `/dist/fonts/${font}`);
    const fonty = new FIGlet(config[font.slice(0, -3)]);
    console.log(fonty.write(testStr));
});