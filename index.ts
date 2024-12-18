export type Font = {
  blankChar: string;
  charConfig: Record<string, string[]>;
  charHeight: number;
  baseline: number;
  maxLength: number;
  smushRules: Record<string, boolean>;
  fontLines: string[];
};

type Runtime = 'node' | 'browser' | 'unknown';

export type FigOptions = {
  /**
   * force a runtime
   */
  runtime?: Runtime;
  /**
   * when running in node, wrap to fit within a terminal
   */
  wrap?: boolean;
}

// const DEBUG = process.env.FIG_DEBUG;

/** Represents a FIGlet font generator, given some configuration. */
export class FIGlet {
  // BUG
  // #previousLineLength: number;
  // #currentLineLength: number;
  /**
   * The current character being processed from the input str
   */
  #currentChar: string;
  /**
   * Index from the input string whose result letter should be wrapped
   */
  #charIndexToStartWrapping: number | null = null;
  /**
   * The current result string to be returned from {@link write}
   */
  #currentResult: string;
  #runtime: Runtime;
  #wrap: boolean = true;
  #font: Font;
  constructor(font: Font, opts?: FigOptions) {
    this.#font = font;
    
    if (opts?.runtime) this.#runtime = opts.runtime;
    else if (typeof window !== 'undefined') this.#runtime = 'browser';
    else if (typeof process !== 'undefined') this.#runtime = 'node';
    else this.#runtime = 'unknown';

    if (opts?.wrap !== undefined) this.#wrap = opts.wrap;
  }

  #shouldWrap(): boolean {
    if (!this.#wrap) return false;
    if (this.#runtime !== 'node') return false;

    const termWidth = process.stdout.columns;
    const currentResultWidth = this.#currentResult.split('\n').at(-1).length;
    const currentCharWidth = this.#font.charConfig[this.#currentChar.codePointAt(0)].reduce((len, line) => line.length > len ? line.length : len, Number.MIN_SAFE_INTEGER);

    return (termWidth - currentResultWidth) < currentCharWidth;
  }

  /**
   * Compares 2 characters and
   * @returns
   * ```js
   * [charToPreserve, isCharA]
   * ```
   * else null if nothing to smush.
   */
  #smushFIG(a: string, b: string): [string, boolean] | null {
    // rules are implemented in the same order as the C source
    // i would've figured that they were in rule # order
    if (a === " ") return [b, false];
    if (b === " ") return [a, true];

    // not sure...see line 1364 in figlet.c
    // this is causing some bugs. i dont fully understand it i guess.
    // if (this.#previousLineLength < 1 || this.#currentLineLength < 1) {
    //   return null;
    // }

    // Rule 6: double hardblank
    if (
      this.#font.smushRules[6] &&
      a === this.#font.blankChar &&
      b === this.#font.blankChar
    ) {
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
      if (a === "|" && "/\\[]{}()<>".indexOf(b) > -1) return [b, false];
      if (b === "|" && "/\\[]{}()<>".indexOf(a) > -1) return [a, true];
      if ("/\\".indexOf(a) > -1 && "[]{}()<>".indexOf(b) > -1)
        return [b, false];
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
    ) {
      // arbitrary whether to return true/false, i think
      return ["|", true];
    }

    // Rule 5: Big X
    if (this.#font.smushRules[5]) {
      if (a === "/" && b === "\\") return ["|", true];
      if (a === "\\" && b === "/") return ["Y", true];
      if (a === ">" && b === "<") return ["X", true];
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
      );
    }

    if (charDefinition.every((line) => line.at(0) === " ")) {
      charDefinition.forEach((line, i) => {
        charDefinition[i] = line.slice(1);
      });
    }

    return (this.#font.charConfig[char] = charDefinition);
  }

  #clear() {
    this.#currentResult = "";
    this.#charIndexToStartWrapping = null;
    this.#currentChar = null;
  }

  /**
   * @param str The input string
   */
  write(str: string) {
    str = str.trim();
    this.#clear();
    const figChars: string[][] = [];
    // the first letter is never smushed.
    const initialSmushConfig: number[][] = [[0]];

    for (let letter = 0; letter < str.length; letter++) {
      this.#currentChar = str[letter];
      // retrieve the individual characters for the provided input string
      figChars[letter] = structuredClone(
        this.#parseChar(str.codePointAt(letter)),
      );
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
          if (smushable && str[letter] !== " " && str[letter - 1] !== " ")
            initialSmushConfig[letter][line]++;
          // smushConfig[letter] = numSpacesBetweenTwoChars;
        }
      }
    }
    // DEBUG && console.log(initialSmushConfig);

    const smushConfig = initialSmushConfig.map((smushConfigs) =>
      Math.min(...smushConfigs),
    );

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
        this.#currentChar = str[letter];
        // DEBUG && console.log(`\ncurrent letter: '${str[letter]}'`);
        if (letter > 0) {
          // DEBUG && console.log(`smushing line: '${figChars[letter][line]}'`);
          // DEBUG && console.log('into result:')
          // DEBUG && process.stdout.write(result + ' <--\n');
          for (
            let smushAmount = 0;
            smushAmount < smushConfig[letter];
            smushAmount++
          ) {
            const prevChar = this.#currentResult.at(-1);
            const currentChar = figChars[letter][line].at(0);
            // BUG
            // this.#previousLineLength = this.#currentLineLength ?? figChars[0][0].length;
            // this.#currentLineLength = figChars[letter][0].length;

            // DEBUG && console.log(`looking at ('${prevChar}','${currentChar}')`);

            const smushable = this.#smushFIG(prevChar, currentChar);

            if (smushable) {
              const [charToSmush, isLeft] = smushable;
              // need a pointer to figure out whether to concat into result or figChars
              this.#currentResult = this.#currentResult.slice(0, -1);
              figChars[letter][line] = figChars[letter][line].slice(1);
              if (isLeft) {
                this.#currentResult += charToSmush;
              } else {
                figChars[letter][line] = charToSmush + figChars[letter][line];
              }
            }
          }
        }
        if ((!this.#charIndexToStartWrapping || letter < this.#charIndexToStartWrapping) && this.#shouldWrap()) {
          const strPartsWithoutSpaces = str.split(' ');
          let indexOfWord = 0;
          let distance = letter;
          for (let i = 0; i < strPartsWithoutSpaces.length; i++) {
            const word = strPartsWithoutSpaces[i];
            distance -= word.length + 1; // +1 to account for the splitted space
            if (distance <= 0) {
              indexOfWord = i;
              break;
            } 
          }
          // are we wrapping an entire word, or just the letters?
          if (indexOfWord === 0) {
            this.#charIndexToStartWrapping = letter;
          } else {
            this.#charIndexToStartWrapping = strPartsWithoutSpaces.slice(0, indexOfWord).reduce((indexToWrap, word) => indexToWrap += word.length + 1, 0); // +1 to account for the splitted space
          }
        } 
        this.#currentResult += figChars[letter][line];
      }

      this.#currentResult += "\n";
    }

    let finalResult = this.#currentResult;
    // process for wrapping
    if (this.#charIndexToStartWrapping !== null) {
      const end = this.#charIndexToStartWrapping;
      this.#charIndexToStartWrapping = null;
      finalResult = this.write(str.slice(0, end));
      finalResult += this.write(str.slice(end));
    } 
    else this.#charIndexToStartWrapping = null;
    
    
    return finalResult.replaceAll(this.#font.blankChar, " ");
  }
}
