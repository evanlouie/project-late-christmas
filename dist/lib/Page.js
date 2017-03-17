"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fs = require("graceful-fs");
const jsdom = require("jsdom");
const mkdirp = require("mkdirp");
const request = require("request");
const url = require("url");
class Page {
    constructor(url) {
        this.url = url;
    }
    //////// START LIB CODE ////////
    /**
     * string -> (string, string)
     * Returns a tuple of [directory, filename]
     */
    static getDirAndFilenameFromURI(uri) {
        let directory = ``;
        let filename = ``;
        // const regexMatch = this.uri.match(/(.*\/)([^\/]*)$/);
        const regexMatch = uri.match(/(.*\/)?([^\/]*)$/);
        if (regexMatch !== null) {
            // files on root directoy will lead to first match to be undefined
            directory = regexMatch[1] || ``;
            filename = regexMatch[2];
        }
        return [directory, filename];
    }
    ;
    /**
     * [string, string] -> string
     * Returns the write out path for a given (dir, filename) tuple
     */
    static getWriteOutPath(dirAndFilename) {
        const writeOutPath = Page.writeOutDir + "/" + dirAndFilename[0] + dirAndFilename[1];
        return writeOutPath;
    }
    /**
     * [Url] -> boolean
     * Returns a booelan of whether or not a url has been previously scraped and saved
     */
    static isPreviouslyScraped(url) {
        const dirAndFilename = Page.getDirAndFilenameFromURI(url.path || ``);
        const writeOutPath = Page.getWriteOutPath(dirAndFilename);
        // return await new Promise<boolean>((resolve, reject) => {
        //     fs.access(writeOutPath, fs.constants.F_OK, (err) => {
        //         if (err) {
        //             // reject(err);
        //             console.error(err);
        //             resolve(false);
        //         } else {
        //             resolve(true);
        //         }
        //     });
        // });
        return fs.existsSync(writeOutPath);
    }
    /**
     * Download a page and all associated assets
     */
    static fetchAndParse(root, depth = 0, maxDepth = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const page = new Page(root);
                const body = yield page.get();
                return [];
            }
            catch (err) {
                console.error(err);
                return [];
            }
        });
    }
    parseRelativeUrls(attributes = [`src`, `href`]) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.body) {
                    yield this.get();
                }
                const window = jsdom.jsdom(this.body, { url: this.url.href }).defaultView;
                const document = window.document;
                // PARSE SRC/HREF
                const selector = attributes.map((attribute) => `[${attribute}]`).join(`,`);
                // COMBINE TO URL ARRAY
                const elements = [...document.querySelectorAll(selector)];
                const urls = new Set();
                for (const element of elements) {
                    for (const attribute of attributes) {
                        if (element.hasAttribute(attribute)) {
                            const href = element[attribute];
                            if (typeof href !== `undefined`) {
                                urls.add(url.parse(element[attribute]));
                            }
                        }
                    }
                }
                // CLOSE JSDOM WINDOW TO CLEAR MEMORY
                window.close();
                // FILTER TO ONLY LOCAL/RELATIVE URLS
                const localUrlRegex = new RegExp(`${this.url.hostname}`, `gi`);
                const localUrls = [...new Set([...urls].filter((url) => {
                        return (url.host || ``).match(localUrlRegex);
                    }))];
                return localUrls;
            }
            catch (err) {
                console.error(err);
                return [];
            }
        });
    }
    fetch() {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = new Promise((resolve, reject) => {
                const uri = encodeURI(this.url.href || "");
                request.get(uri, { encoding: null, maxRedirects: 8 }, (error, response, body) => {
                    if (error) {
                        reject(error);
                    }
                    else if (response.statusCode >= 400) {
                        console.log(`[${response.statusCode}]: ${this.url.href}`);
                        reject(`[${response.statusCode}]: ${response.statusMessage}`);
                    }
                    else {
                        resolve({ response, body });
                    }
                });
            });
            return promise;
        });
    }
    get(attempt = 0, maxAttempts = 8) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`${attempt === 0 ? `[GET]` : `[RET]`}: ${this.url.href}`);
                try {
                    const fetch = yield this.fetch();
                    this.response = fetch.response;
                    this.body = fetch.body;
                }
                catch (err) {
                    if (attempt + 1 <= maxAttempts) {
                        return this.get(attempt + 1);
                    }
                    else {
                        // console.error(`[DIE]: ${this.url.href}`);
                        // return Promise.reject(err);
                        console.error(`[DIE]: ${this.url.href}`);
                        return Promise.reject(err);
                    }
                }
                // only match for binary and utf8 encodings
                const contentType = this.response.headers[`content-type`] || ``;
                const encoding = contentType.match(/text/gi) ? `utf8` : `binary`;
                const textTypeRegex = /(html|xml|json)/gi;
                const dirAndFilename = Page.getDirAndFilenameFromURI(this.url.path || ``);
                return yield new Promise((resolve, reject) => {
                    if (contentType.match(textTypeRegex)) {
                        // SAVE AS INDEX.HTML IN FOLDER
                        // folderPath will have full querypath as folder
                        const writeOutPath = Page.getWriteOutPath(dirAndFilename);
                        mkdirp(writeOutPath, (err) => {
                            if (err) {
                                console.error(err);
                                reject(err);
                            }
                            else {
                                const filename = `${writeOutPath}/index.html`;
                                fs.writeFile(filename, this.body, encoding, (filewriteError) => {
                                    if (filewriteError) {
                                        console.error(filewriteError);
                                        reject(filewriteError);
                                    }
                                    else {
                                        console.log(`[OUT]: ${this.url.href} => ${filename}`);
                                        resolve(this.body);
                                    }
                                });
                            }
                        });
                    }
                    else {
                        // PARSE OUT FILE NAME FROM URI AND SAVE AS FILE
                        // mkdirp for folder
                        const folderPath = Page.writeOutDir + dirAndFilename[0];
                        mkdirp(folderPath, (err) => {
                            if (err) {
                                console.error(err);
                                reject(err);
                            }
                            else {
                                const filename = folderPath + dirAndFilename[1];
                                fs.writeFile(filename, this.body, encoding, (filewriteError) => {
                                    if (filewriteError) {
                                        console.error(filewriteError);
                                        reject(filewriteError);
                                    }
                                    else {
                                        console.log(`[OUT]: ${this.url.href} => ${filename}`);
                                        resolve(this.body);
                                    }
                                });
                            }
                        });
                    }
                });
            }
            catch (err) {
                console.error(err);
                return Promise.reject(err);
            }
        });
    }
}
/** @var string writeOutDir - the directory pages will be written out to */
Page.writeOutDir = process.cwd() + `/public`;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Page;
