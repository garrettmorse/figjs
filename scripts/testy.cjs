const { FIGlet } = require("../dist/cjs/index.cjs");
const fs = require("node:fs");

const esmFonts = fs.readdirSync(process.cwd() + "/dist/cjs/fonts");

const testStr = "Hello, World"

esmFonts.filter(file => file.slice(-4) === '.cjs').forEach(font => {
    const config = require(process.cwd() + `/dist/cjs/fonts/${font}`);
    const fonty = new FIGlet(config[font.slice(0, -4)]);
    console.log(fonty.write(testStr));
});