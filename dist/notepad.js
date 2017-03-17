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
        let directory = "";
        let filename = "";
        // const regexMatch = this.uri.match(/(.*\/)([^\/]*)$/);
        const regexMatch = uri.match(/(.*\/)?([^\/]*)$/);
        if (regexMatch !== null) {
            // files on root directoy will lead to first match to be undefined
            directory = regexMatch[1] || "";
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
        const writeOutPath = process.cwd() + "/db/" + dirAndFilename[0] + dirAndFilename[1];
        return writeOutPath;
    }
    /**
     * [Url] -> boolean
     * Returns a booelan of whether or not a url has been previously scraped and saved
     */
    static isPreviouslyScraped(url) {
        const dirAndFilename = Page.getDirAndFilenameFromURI(url.path || "");
        const writeOutPath = Page.getWriteOutPath(dirAndFilename);
        return fs.existsSync(writeOutPath);
    }
    static fetchAndParse(root, depth = 0, maxDepth = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const page = new Page(root);
                const body = yield page.get();
                const localUrls = yield page.parseRelativeUrls(["src", "href"]);
                const assetUrls = localUrls.filter((url) => {
                    return (url.path || "").match(/\.(css|js|jpe?g|gif|png|svg|webm)/gi);
                });
                const unscrapedAssetUrls = assetUrls.filter((url) => {
                    return Page.isPreviouslyScraped(url) === false;
                });
                console.log(unscrapedAssetUrls.map((url) => url.href));
                const assetPromises = unscrapedAssetUrls.map((url) => {
                    const assetPage = new Page(url);
                    return assetPage.get();
                });
                return Promise.all(assetPromises);
            }
            catch (err) {
                console.error(err);
                return Promise.reject(err);
            }
        });
    }
    parseRelativeUrls(attributes = ["src", "href"]) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.body) {
                yield this.get();
            }
            const window = jsdom.jsdom(this.body, { url: this.url.href }).defaultView;
            const document = window.document;
            // PARSE SRC/HREF
            const selector = attributes.map((attribute) => `[${attribute}]`).join(",");
            // COMBINE TO URL ARRAY
            const elements = Array.from(document.querySelectorAll(selector));
            const urls = [];
            for (const element of elements) {
                for (const attribute of attributes) {
                    if (element.hasAttribute(attribute)) {
                        urls.push(url.parse(element[attribute]));
                    }
                }
            }
            // FILTER TO ONLY LOCAL/RELATIVE URLS
            const localUrlRegex = new RegExp(`${this.url.hostname}`, "gi");
            const localUrls = urls.filter((url) => {
                return (url.host || "").match(localUrlRegex);
            });
            return localUrls;
        });
    }
    get() {
        return __awaiter(this, void 0, void 0, function* () {
            const fetchPromise = new Promise((resolve, reject) => {
                // set encoding:null to allow for binary data. Use content-type later to determine
                request.get(this.url.href || "", { encoding: null }, (error, response, body) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        this.response = response;
                        this.body = body;
                        // only match for binary and utf8 encodings
                        const contentType = response.headers["content-type"] || "";
                        const encoding = contentType.match(/text/gi) ? "utf8" : "binary";
                        const textTypeRegex = /(html|xml|json)/gi;
                        if (contentType.match(textTypeRegex)) {
                            // SAVE AS INDEX.HTML IN FOLDER
                            console.log("TEXT");
                        }
                        else {
                            // PARSE OUT FILE NAME FROM URI AND SAVE AS FILE
                            // mkdirp for folder
                            const dirAndFilename = Page.getDirAndFilenameFromURI(this.url.path || "");
                            const folderPath = process.cwd() + "/db/" + dirAndFilename[0];
                            const filePath = folderPath + dirAndFilename[1];
                            mkdirp(folderPath, (err) => {
                                if (err) {
                                    console.error(err);
                                    reject(err);
                                }
                                else {
                                    fs.writeFile(filePath, body, encoding, (filewriteError) => {
                                        if (filewriteError) {
                                            console.error(filewriteError);
                                            reject(filewriteError);
                                        }
                                        else {
                                            console.log(`[OUT]: ${this.url.href} => ${filePath}`);
                                        }
                                    });
                                }
                            });
                        }
                        resolve(body);
                    }
                });
            });
            return fetchPromise;
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Page;
const hootsuite = url.parse("https://hootsuite.com/");
const hootsuitedotcom = new Page(hootsuite);
Page.fetchAndParse(hootsuite).then(() => {
    console.log("DONE");
});
