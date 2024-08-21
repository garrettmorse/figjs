const fonts = require("./fonts.json");

class FIGlet {
  static #FIG_HIERACHY = [
    "|",
    "/",
    "\\",
    "[",
    "]",
    "{",
    "}",
    "(",
    ")",
    "<",
    ">",
  ];
  #font;
  /**
   *
   * @param {keyof fonts} font
   */
  constructor(font) {
    if (!(font in fonts)) {
      throw new Error(`Font ${font} not found`);
    }
    this.#font = fonts[font];
  }

  /**
   * Compares 2 FIG characters and determines hierarchy based on FIG spec
   * @private
   * @param {string} a
   * @param {string} b
   */
  cmpFIG(a, b) {
    // Rule 1: equal character
    if (this.#font.smushRules[1] && a === b) {
      return 1;
    }

    // Rule 2: Underscore
    if (
      this.#font.smushRules[2] &&
      ((a === "_" && FIGlet.#FIG_HIERACHY.includes(b)) ||
        (b === "_" && FIGlet.#FIG_HIERACHY.includes(a)))
    ) {
      return 2;
    }

    // Rule 3: Hierarchy
    if (
      this.#font.smushRules[3] &&
      FIGlet.#FIG_HIERACHY.includes(a) &&
      FIGlet.#FIG_HIERACHY.includes(b)
    ) {
      return 3;
    }

    // Rule 4: Opposite Pairs
    if (
      this.#font.smushRules[4] &&
      ((a === "[" && b === "]") ||
        (a === "]" && b === "[") ||
        (a === "{" && b === "}") ||
        (a === "}" && b === "{") ||
        (a === "(" && b === ")") ||
        (a === ")" && b === "("))
    ) {
      return 4;
    }

    // Rule 5: Big X
    if (
      this.#font.smushRules[5] &&
      ((a === "/" && b === "\\") ||
        (a === "\\" && b === "/") ||
        (a === ">" && b === "<"))
    ) {
      return 5;
    }

    // Rule 6: Hardblank
    if (this.#font.smushRules[6] && a === "$" && b === "$") {
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

    // 7 maps to "do nothing". since no other rules apply, do nothing...
    return 7;
  }

  /**
   * Returns number of blank spaces between two strings when concatenated
   * @private
   * @param {string} str1
   * @param {string} str2
   */
  static getSpaces(str1, str2) {
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

  /**
   * @private
   * @param {number} char
   */
  parseChar(char) {
    if (char in this.#font.charConfig) {
      return this.#font.charConfig[char];
    }

    const charStart = (char - 32) * this.#font.charHeight;
    const charDefinition = [];

    for (let i = 0; i < this.#font.charHeight; i++) {
      charDefinition[i] = this.#font.fontLines[charStart + i].replaceAll(
        "@",
        "",
      )
    }

    if (charDefinition.every(line => line.at(0) === ' ')) {
      charDefinition.forEach((line, i) => {
        charDefinition[i] = line.slice(1);
      });
    }

    return (this.#font.charConfig[char] = charDefinition);
  }

  /**
   * @param {string} str
   * @returns {string}
   */
  write(str) {
    const chars = [];
    let result = "";

    // retrieve the individual characters for the provided input string
    for (let i = 0; i < str.length; i++) {
      chars[i] = structuredClone(this.parseChar(str.codePointAt(i)));
    }

    // smush the characters!
    // how much to smush each letter
    // - the first letter is never smushed...
    const smushConfig = [0];
    for (let line = 0, height = chars[0].length; line < height; line++) {
      for (let letter = 1; letter < str.length; letter++) {
        if (!Number.isFinite(smushConfig[letter])) {
          smushConfig[letter] = Number.MAX_SAFE_INTEGER;
        }

        const prev = chars[letter - 1][line];
        const cur = chars[letter][line];

        const numSpacesForThisLine = FIGlet.getSpaces(
          chars[letter - 1][line],
          chars[letter][line],
        );
        if (numSpacesForThisLine === prev.length + cur.length) {
          // it's all spaces, skip analysis
          continue;
        }

        if (numSpacesForThisLine < smushConfig[letter]) {
          smushConfig[letter] = numSpacesForThisLine;
        }
      }
    }

    for (let line = 0, height = chars[0].length; line < height; line++) {
      for (let letter = 0; letter < str.length; letter++) {
        let smushAmount = smushConfig[letter];
        if (letter > 0) {
          let prevSmushAmount;
          while (smushAmount > 0) {
            if (prevSmushAmount === smushAmount) {
              console.log({
                prev: chars[letter - 1][line],
                next: chars[letter][line],
              });
              throw new Error("I can't smush these two lines!");
            }

            prevSmushAmount = smushAmount;
            // prev last idx has space
            if (result.at(-1) === " ") {
              result = result.slice(0, -1);
              smushAmount--;
            }
            // cur first idx has space
            else if (chars[letter][line].at(0) === " ") {
              chars[letter][line] = chars[letter][line].slice(1);
              smushAmount--;
            }
          }

          // then replace according to FIG ruleset
          const prev = result.at(-1);
          const cur = chars[letter][line].at(0);
          if (!prev || !cur) {
            continue;
          }

          switch (this.cmpFIG(prev, cur)) {
            // equal character
            case 1: {
              if (
                !chars[letter - 1][line].includes("$") &&
                !chars[letter][line].includes("$")
              ) {
                chars[letter][line] = chars[letter][line].slice(1);
              }
              break;
            }

            // underscore
            case 2: {
              if (prev === "_") {
                result = result.slice(0, -1);
              } else {
                chars[letter][line] = chars[letter][line].slice(1);
              }

              break;
            }

            // hierarchy
            case 3: {
              if (
                FIGlet.#FIG_HIERACHY.indexOf(prev) <
                FIGlet.#FIG_HIERACHY.indexOf(cur)
              ) {
                result = result.slice(0, -1);
              } else {
                chars[letter][line] = chars[letter][line].slice(1);
              }

              break;
            }

            // opposite pairs
            case 4: {
              result = result.slice(0, -1);
              chars[letter][line] = chars[letter][line].slice(1);
              result += "|";
              break;
            }

            // Big X
            case 5: {
              if (prev === "/" && cur === "\\") {
                result = result.slice(0, -1);
                chars[letter][line] = chars[letter][line].slice(1);
                result += "|";
              } else if (prev === "\\" && cur === "/") {
                result = result.slice(0, -1);
                chars[letter][line] = chars[letter][line].slice(1);
                result += "Y";
              } else if (prev === ">" && cur === "<") {
                result = result.slice(0, -1);
                chars[letter][line] = chars[letter][line].slice(1);
                result += "X";
              }

              break;
            }

            // double hardblank
            case 6: {
              if (
                prev === this.#font.blankChar &&
                cur === this.#font.blankChar
              ) {
                result = result.slice(0, -1);
                chars[letter][line] = chars[letter][line].slice(1);
                result += this.#font.blankChar;
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
                if (!chars[letter - 1][line].includes(this.#font.blankChar)) {
                  result = result.slice(0, -1);
                }
              } else {
                if (!chars[letter][line].includes(this.#font.blankChar)) {
                  chars[letter][line] = chars[letter][line].slice(1);
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

        result += chars[letter][line];
      }

      result += "\n";
    }

    return result.replaceAll(this.#font.blankChar, " ");
  }
}

module.exports = {
  FIGlet,
};
