const fs = require("node:fs");

const slant = fs.readFileSync(__dirname + "/fonts/slant.flf", {
  encoding: "utf8",
});

/**
 * @typedef FontConfig
 * @type {object}
 * @property {string} blankChar
 * @property {Record<number, string>} charConfig
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
  const lastCommentLine = Number(header[5]);

  return {
    blankChar,
    charConfig: {},
    charHeight,
    fontLines: lines.slice(lastCommentLine + 1),
  };
}

/**
 * @param {number} char
 * @param {FontConfig} fontConfig
 */
function parseChar(char, fontConfig) {
  if (char in fontConfig.charConfig) {
    return fontConfig.charConfig[char];
  }

  const charStart = (char - 32) * fontConfig.charHeight;
  const charDefinition = [];

  for (let i = 0; i < fontConfig.charHeight; i++) {
    charDefinition[i] = fontConfig.fontLines[charStart + i].replaceAll("@", "");
  }

  return (fontConfig.charConfig[char] = charDefinition);
}

/**
 *
 * Returns number of blank spaces between two strings when concatenated
 * @param {string} str1
 * @param {string} str2
 */
function getSpaces(str1, str2) {
  let str1Spaces = 0;
  let str2Spaces = 0;

  for (const char of Array.from(str1).reverse().join("")) {
    if (char === " ") {
      str1Spaces++;
    } else {
      break;
    }
  }

  for (const char of str2) {
    if (char === " ") {
      str2Spaces++;
    } else {
      break;
    }
  }

  return str1Spaces + str2Spaces;
}

const FIG_HIERACHY = ["|", "/", "\\", "[", "]", "{", "}", "(", ")", "<", ">"];

/**
 * Compares 2 FIG characters and determines hierarchy based on FIG spec
 * @param {string} a
 * @param {string} b
 */
function cmpFIG(a, b) {
  // Rule 1: equal character
  if (a === b) {
    return 1;
  }

  // Rule 2: Underscore
  if (
    (a === "_" && FIG_HIERACHY.includes(b)) ||
    (b === "_" && FIG_HIERACHY.includes(a))
  ) {
    return 2;
  }

  // Rule 3: Hierarchy
  if (FIG_HIERACHY.includes(a) && FIG_HIERACHY.includes(b)) {
    return 3;
  }

  // Rule 4: Opposite Pairs
  if (
    (a === "[" && b === "]") ||
    (a === "]" && b === "[") ||
    (a === "{" && b === "}") ||
    (a === "}" && b === "{") ||
    (a === "(" && b === ")") ||
    (a === ")" && b === "(")
  ) {
    return 4;
  }

  // Rule 5: Big X
  if (
    (a === "/" && b === "\\") ||
    (a === "\\" && b === "/") ||
    (a === ">" && b === "<")
  ) {
    return 5;
  }

  // Rule 6: Hardblank
  if (a === "$" && b === "$") {
    return 6;
  }

  // Rule 7: One Hardblank
  if (a === "$" || b === "$") {
    return 7;
  }

  // Rule 8: At least one space
  if (a === " " || b === " ") {
    return 8;
  }

  return null;
}

function strToFont(str, _fontConfig) {
  // todo: fix bug with characters that don't use full height and smushing
  if (!Array.from(str).every((char) => /[\d A-Z]/.test(char))) {
    throw new Error(
      "Only uppercase letters, numbers, and spaces are supported",
    );
  }

  const fontConfig = structuredClone(_fontConfig);
  const chars = [];
  let result = "";

  for (let i = 0; i < str.length; i++) {
    chars[i] = structuredClone(parseChar(str.codePointAt(i), fontConfig));
  }

  const smushConfig = [0];
  for (let i = 0, height = chars[0].length; i < height; i++) {
    for (let j = 1; j < str.length; j++) {
      if (!Number.isFinite(smushConfig[j])) {
        smushConfig[j] = Number.MAX_SAFE_INTEGER;
      }

      const prev = chars[j - 1][i];
      const cur = chars[j][i];
      if (process.env.DEBUG) {
        console.log({ prev, cur, amt: getSpaces(prev, cur) });
      }

      const numSpacesForThisLine = getSpaces(chars[j - 1][i], chars[j][i]);
      if (numSpacesForThisLine === prev.length + cur.length) {
        // it's all spaces, skip analysis
        continue;
      }

      if (process.env.DEBUG) {
        console.log(numSpacesForThisLine);
      }

      if (process.env.DEBUG) {
        console.log(smushConfig[j]);
      }

      if (numSpacesForThisLine < smushConfig[j]) {
        smushConfig[j] = numSpacesForThisLine;
      }
    }
  }

  if (process.env.DEBUG) {
    console.log(smushConfig);
  }

  for (let i = 0, height = chars[0].length; i < height; i++) {
    for (let j = 0; j < str.length; j++) {
      if (j > 0) {
        let smushAmount = smushConfig[j];

        let prevSmushAmount;
        while (smushAmount > 0) {
          if (prevSmushAmount === smushAmount) {
            console.log({ prev: chars[j - 1][i], next: chars[j][i] });
            console.error("error");
            process.exit(0);
          }

          prevSmushAmount = smushAmount;
          // prev last idx has space
          if (result.at(-1) === " ") {
            result = result.slice(0, -1);
            smushAmount--;
          }
          // cur first idx has space
          else if (chars[j][i].at(0) === " ") {
            chars[j][i] = chars[j][i].slice(1);
            smushAmount--;
          }
        }

        // then replace according to FIG ruleset
        const prev = result.at(-1);
        const cur = chars[j][i].at(0);
        if (!prev || !cur) {
          continue;
        }

        switch (cmpFIG(prev, cur)) {
          // equal character
          case 1: {
            if (!chars[j-1][i].includes('$') && !chars[j][i].includes('$'))  {
              chars[j][i] = chars[j][i].slice(1);
            }
            break;
          }

          // underscore
          case 2: {
            if (prev === "_") {
              result = result.slice(0, -1);
            } else {
              chars[j][i] = chars[j][i].slice(1);
            }

            break;
          }

          // hierarchy
          case 3: {
            if (FIG_HIERACHY.indexOf(prev) < FIG_HIERACHY.indexOf(cur)) {
              result = result.slice(0, -1);
            } else {
              chars[j][i] = chars[j][i].slice(1);
            }

            break;
          }

          // opposite pairs
          case 4: {
            result = result.slice(0, -1);
            chars[j][i] = chars[j][i].slice(1);
            result += "|";
            break;
          }

          // Big X
          case 5: {
            if (prev === "/" && cur === "\\") {
              result = result.slice(0, -1);
              chars[j][i] = chars[j][i].slice(1);
              result += "|";
            } else if (prev === "\\" && cur === "/") {
              result = result.slice(0, -1);
              chars[j][i] = chars[j][i].slice(1);
              result += "Y";
            } else if (prev === ">" && cur === "<") {
              result = result.slice(0, -1);
              chars[j][i] = chars[j][i].slice(1);
              result += "X";
            }

            break;
          }

          // double hardblank
          case 6: {
            if (prev === "$" && cur === "$") {
              result = result.slice(0, -1);
              chars[j][i] = chars[j][i].slice(1);
              result += "$";
            }

            break;
          }

          // one hardblank
          case 7: {
            // do nothing
            break;
          }

          // one character and one space
          case 8: {
            // take the character
            if (prev === " ") {
              if (!chars[j - 1][i].includes("$")) {
                result = result.slice(0, -1);
              }
            } else {
              if (!chars[j][i].includes("$")) {
                chars[j][i] = chars[j][i].slice(1);
              }
            }

            break;
          }

          default: {
            throw new Error(
              "No FIG Smush Rule found for charset: " + prev + " :: " + cur,
            );
          }
        }
      }

      result += chars[j][i];
    }

    result += "\n";
  }
  return result;
  // return result.replaceAll(fontConfig.blankChar, " ");
}

// todo: support more fonts
const slantConfig = parseFont(slant);

/**
 * Given an input string, returns the string in Slant FIGlet font.
 * @param {string} str
 */
function write(str) {
  return strToFont(str, slantConfig);
}

module.exports = {
  write,
};