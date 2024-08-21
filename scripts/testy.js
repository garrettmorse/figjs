const { FIGlet } = require("..");

const fonts = require('../fonts.json')

const testStr = "Hello, World"

Object.keys(fonts).forEach(font => {
    const fonty = new FIGlet(font);
    console.log(fonty.write(testStr));
});