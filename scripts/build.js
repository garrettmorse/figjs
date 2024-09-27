import fs  from "node:fs";

const fonts = fs.readdirSync("./fonts");

/**
 * @type {[1,2,4,8,16,32]}
 * Old_Layout: (Legal values -1 to 63)
 *
 *   -1  Full-width layout by default
 *    0  Horizontal fitting (kerning) layout by default
 *    1  Apply horizontal smushing rule 1 by default
 *    2  Apply horizontal smushing rule 2 by default
 *    4  Apply horizontal smushing rule 3 by default
 *    8  Apply horizontal smushing rule 4 by default
 *   16  Apply horizontal smushing rule 5 by default
 *   32  Apply horizontal smushing rule 6 by default
 */
const LAYOUT_CODES = [1, 2, 4, 8, 16, 32];

/**
 * @typedef FontConfig
 * @type {object}
 * @property {string} blankChar
 * @property {Record<number, string>} charConfig
 * @property {number} charHeight
 * @property {number} baseline
 * @property {number} maxLength
 * @property {Record<keyof typeof LAYOUT_CODES, boolean>} smushRules
 * @property {string} fontLines
 */

/**
 * @param {string} font
 * @returns {FontConfig}
 */
function parseFont(font) {
  const lines = font.split("\n");

  const header = lines[0].split(" ");
  const blankChar = header[0].at(-1);
  const charHeight = Number(header[1]);
  const baseline = Number(header[2]);
  const maxLength = Number(header[3]);
  const layoutCode = Number(header[4]);
  const lastCommentLine = Number(header[5]);

  const smushRules = {};
  if (layoutCode > 63) {
    throw new Error("Old_Layout value must be between -1 and 63");
  }
  // convert layout code to smush rules
  // there's a better way to do this. i'm just a lazy moron.
  LAYOUT_CODES.filter((code) => !!(layoutCode & code))
    .reverse()
    .reduce((acc, code, index) => {
      const rule = LAYOUT_CODES.indexOf(code) + 1;
      if (acc - code < 0) {
        smushRules[rule] = false;
        return acc;
      }
      smushRules[rule] = true;
      return acc - code;
    }, layoutCode);

  return {
    blankChar,
    charConfig: {},
    charHeight,
    baseline,
    maxLength,
    smushRules,
    fontLines: lines.slice(lastCommentLine + 1),
  };
}

const fontNames = [];
const filePromises = [];
console.time('✅ wrote fonts');
fonts.filter(filename => filename.slice(-4) === '.flf').forEach((font) => {
  const fontStr = fs.readFileSync(`./fonts/${font}`, { encoding: "utf8" });
  const fontName = font.slice(0, -4);
  fontNames.push(fontName);

  let buf = 'import type { Font } from "../index.js";\n\n'
  buf += `const ${fontName}: Font = ${JSON.stringify(parseFont(fontStr), null, 2)};\n\n`;
  buf += `export {\n  ${fontName}\n};`;

  filePromises.push(fs.promises.writeFile(process.cwd() + `/fonts/${fontName}.ts`, buf));
});

await Promise.all(filePromises).then(() =>
  console.timeEnd('✅ wrote fonts')
);

