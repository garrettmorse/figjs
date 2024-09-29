export type Font = {
  blankChar: string;
  charConfig: Record<string, string[]>;
  charHeight: number;
  baseline: number;
  maxLength: number;
  smushRules: Record<string, boolean>;
  fontLines: string[];
};

// const DEBUG = process.env.FIG_DEBUG;

/** Represents a FIGlet font generator, given some configuration. */
export class FIGlet {

  // BUG
  // #previousLineLength: number;
  // #currentLineLength: number;
  #font: Font;
  constructor(font: Font) {
    this.#font = font;
  }

  /**
   * Compares 2 characters and 
   * @returns 
   * ```js
   * [charToPreserve, isCharA]
   * ```
   * else null if nothing to smush.
   */
  #smushFIG(a: string, b: string): [ string, boolean ] | null {
    // rules are implemented in the same order as the C source
    // i would've figured that they were in rule # order
    if (a === ' ') return [b, false];
    if (b === ' ') return [a, true];

    // not sure...see line 1364 in figlet.c
    // this is causing some bugs. i dont fully understand it i guess.
    // if (this.#previousLineLength < 1 || this.#currentLineLength < 1) {
    //   return null;
    // }

    // Rule 6: double hardblank
    if (this.#font.smushRules[6] && a === this.#font.blankChar && b === this.#font.blankChar) {
      return [a, true];
    }

    // not 100% on this one, but it's in the C source code
    if (a === this.#font.blankChar || b === this.#font.blankChar) {
      return null;
    }

    // Rule 1: equal character
    if (this.#font.smushRules[1] && a === b) {
      return [a, true];
    }

    // Rule 2: Underscore
    if (this.#font.smushRules[2]) {
      if (a === "_" && "|/\\[]{}()<>".indexOf(b) > -1) return [b, false];
      if (b === "_" && "|/\\[]{}()<>".indexOf(a) > -1) return [a, true];
    }

    // Rule 3: Hierarchy
    if (this.#font.smushRules[3]) {
      if (a === '|' && "/\\[]{}()<>".indexOf(b) > -1) return [b, false];
      if (b === '|' && "/\\[]{}()<>".indexOf(a) > -1) return [a, true];
      if ("/\\".indexOf(a) > -1 && "[]{}()<>".indexOf(b) > -1) return [b, false];
      if ("/\\".indexOf(b) > -1 && "[]{}()<>".indexOf(a) > -1) return [a, true];
      if ("[]".indexOf(a) > -1 && "{}()<>".indexOf(b) > -1) return [b, false];
      if ("[]".indexOf(b) > -1 && "{}()<>".indexOf(a) > -1) return [a, true];
      if ("{}".indexOf(a) > -1 && "()<>".indexOf(b) > -1) return [b, false];
      if ("{}".indexOf(b) > -1 && "()<>".indexOf(a) > -1) return [a, true];
      if ("()".indexOf(a) > -1 && "<>".indexOf(b) > -1) return [b, false];
      if ("()".indexOf(b) > -1 && "<>".indexOf(a) > -1) return [a, true];
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
      )
    {
      // arbitrary whether to return true/false, i think
      return ['|', true];
    }

    // Rule 5: Big X
    if (
      this.#font.smushRules[5]) {
        if (a === "/" && b === "\\") return ['|', true];
        if (a === "\\" && b === "/") return ['Y', true];
        if (a === ">" && b === "<") return ['X', true];
      }

    return null;
  }

  /**
   * Returns number of blank spaces between two strings when concatenated
   * @private
   * @param {string} str1
   * @param {string} str2
   */
  static #getSpaces(str1: string, str2: string) {
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
  #parseChar(char: number) {
    if (char in this.#font.charConfig) {
      return this.#font.charConfig[char];
    }

    const charStart = (char - 32) * this.#font.charHeight;
    const charDefinition: string[] = [];

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

  write(str: string) {
    const figChars: string[][] = [];
    // the first letter is never smushed.
    const initialSmushConfig: number[][] = [[0]];
    let result = "";
    
    for (let letter = 0; letter < str.length; letter++) {
      // retrieve the individual characters for the provided input string
      figChars[letter] = structuredClone(this.#parseChar(str.codePointAt(letter)));
      if (letter === 0) continue;
      // now, how much to smush each letter
      // cannot smush more than the length the first line of the FIG character
      if (!initialSmushConfig[letter]) initialSmushConfig[letter] = [];
      // BUG?
      initialSmushConfig[letter].push(figChars[letter][0].length);
      // chars[letter]:
      // [
      //   '    _   __',
      //   '   / | / /',
      //   '  /  |/ / ',
      //   ' / /|  /  ',
      //   '/_/ |_/   ',
      //   '          '
      // ]
      const height = figChars[letter].length;
      
      for (let line = 0; line < height; line++) {
        const prevLine = figChars[letter - 1][line];
        const currentLine = figChars[letter][line];
        initialSmushConfig[letter][line] = initialSmushConfig[letter][0];

        const numSpacesBetweenTwoChars = FIGlet.#getSpaces(
          prevLine,
          currentLine,
        );

        if (numSpacesBetweenTwoChars === prevLine.length + currentLine.length) {
          // it's all spaces, skip analysis
          continue;
        }

        if (numSpacesBetweenTwoChars < initialSmushConfig[letter][line]) {
          // need to run the smush function to set this value more appropriately.
          // add 1 if it's safe to smush, else do not
          const smushable = this.#smushFIG(prevLine.at(-1), currentLine.at(0));
          initialSmushConfig[letter][line] = numSpacesBetweenTwoChars; 
          if (smushable && str[letter] !== ' ' && str[letter - 1] !== ' ') initialSmushConfig[letter][line]++;
          // smushConfig[letter] = numSpacesBetweenTwoChars;
        }
      }
    }
    // DEBUG && console.log(initialSmushConfig);
    
    const smushConfig = initialSmushConfig.map(smushConfigs => Math.min(...smushConfigs));

    // if (DEBUG) {
    //   console.log(smushConfig);
    // for (let line = 0; line < figChars[0].length; line++) {
    //   for (let letter = 0; letter < figChars.length; letter++) {
    //     process.stdout.write(figChars[letter][line]);
    //   }
    //   process.stdout.write('\n');
    // }
    // }

    for (let line = 0, height = figChars[0].length; line < height; line++) {
      for (let letter = 0; letter < str.length; letter++) {
        // DEBUG && console.log(`\ncurrent letter: '${str[letter]}'`);
        if (letter > 0) {
          // DEBUG && console.log(`smushing line: '${figChars[letter][line]}'`);
          // DEBUG && console.log('into result:')
          // DEBUG && process.stdout.write(result + ' <--\n');
          for (let smushAmount = 0; smushAmount < smushConfig[letter]; smushAmount++) {
            const prevChar = result.at(-1);
            const currentChar = figChars[letter][line].at(0);
            // BUG
            // this.#previousLineLength = this.#currentLineLength ?? figChars[0][0].length;
            // this.#currentLineLength = figChars[letter][0].length;

            // DEBUG && console.log(`looking at ('${prevChar}','${currentChar}')`);
  
            const smushable = this.#smushFIG(prevChar, currentChar);
            
            if (smushable) {
              const [charToSmush, isLeft] = smushable;
              // need a pointer to figure out whether to concat into result or figChars
              result = result.slice(0, -1);
              figChars[letter][line] = figChars[letter][line].slice(1);
              if (isLeft) {
                result += charToSmush;
              } else {
                figChars[letter][line] = charToSmush + figChars[letter][line];
              }
            }
          }
        }

        result += figChars[letter][line];
      }

      result += "\n";
    }
    return result.replaceAll(this.#font.blankChar, " ");
  }
}