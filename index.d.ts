/**
 * @typedef Font
 * @type {import('./fonts').Font}
 */
/**
 * @module FIGlet
 */
/** Represents a FIGlet font generator, given some configuration. */
export class FIGlet {
    /** @private @const */
    private static "__#1@#FIG_HIERACHY";
    /**
     * Returns number of blank spaces between two strings when concatenated
     * @private
     * @param {string} str1
     * @param {string} str2
     */
    private static getSpaces;
    /**
     *
     * @param {Font} font
     */
    constructor(font: Font);
    /**
     * Compares 2 FIG characters and determines hierarchy based on FIG spec
     * @private
     * @param {string} a
     * @param {string} b
     */
    private cmpFIG;
    /**
     * @private
     * @param {number} char
     */
    private parseChar;
    /**
     * @param {string} str
     * @returns {string}
     */
    write(str: string): string;
    #private;
}
export type Font = import("./fonts").Font;
