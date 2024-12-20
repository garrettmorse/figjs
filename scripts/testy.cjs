const { FIGlet } = require("../dist/cjs/index.cjs");
const fs = require("node:fs");

const cjsFonts = fs.readdirSync(process.cwd() + "/dist/cjs/fonts");

const testStr = "Hello, World"

const font = process.argv.slice(2)?.at(0);

console.log('***\nCJS\n***')
cjsFonts.filter(file => (font ? font === file.slice(0, -4) : true) && file.slice(-4) === '.cjs').forEach(font => {
    const config = require(process.cwd() + `/dist/cjs/fonts/${font}`);
    const fonty = new FIGlet(config[font.slice(0, -4)]);
    const fontNameLen = font.slice(0,-4).length;
    console.log(`---${font.slice(0,-4)}---`);
    process.stdout.write(fonty.write(testStr));
    console.log(`---${"=".repeat(fontNameLen)}---`);
});