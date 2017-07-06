"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("graceful-fs");
const fetch = require("isomorphic-fetch");
const mkdirp = require("mkdirp");
const yargs = require("yargs");
const Page_1 = require("./Page");
var ChangeFrequency;
(function (ChangeFrequency) {
    ChangeFrequency[ChangeFrequency["always"] = 0] = "always";
    ChangeFrequency[ChangeFrequency["hourly"] = 1] = "hourly";
    ChangeFrequency[ChangeFrequency["daily"] = 2] = "daily";
    ChangeFrequency[ChangeFrequency["weekly"] = 3] = "weekly";
    ChangeFrequency[ChangeFrequency["monthly"] = 4] = "monthly";
    ChangeFrequency[ChangeFrequency["yearly"] = 5] = "yearly";
    ChangeFrequency[ChangeFrequency["never"] = 6] = "never";
})(ChangeFrequency = exports.ChangeFrequency || (exports.ChangeFrequency = {}));
class Document {
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
    /**
     * [string, string] -> string
     * Returns the write out path for a given (dir, filename) tuple
     */
    static getWriteOutPath(dirAndFilename) {
        const writeOutPath = Page_1.default.writeOutDir + `/` + dirAndFilename[0] + dirAndFilename[1];
        return writeOutPath;
    }
    constructor(url) {
        this.loc = url;
        // match for both hootsuite.com and hootops.com
        const uriMatches = this.loc.match(/^(.*hootsuite|.*hootops).com(:\d+)?\/(.*)/);
        if (uriMatches !== null) {
            this.uri = uriMatches[3];
        }
    }
    fetch() {
        return __awaiter(this, void 0, void 0, function* () {
            /**
             * Parses and validates --host from argsv; default to prerpod
             */
            const getHosts = () => {
                const isValidHost = (host) => {
                    if (host.match(/https?:\/\/.*/i)) {
                        return true;
                    }
                    else {
                        return false;
                    }
                };
                const args = yargs.argv;
                if (args.hosts != null && Array.isArray(args.hosts)) {
                    const areValid = args.hosts.reduce((carry, host) => {
                        if (!isValidHost(host)) {
                            console.log(`Invalid host provided: ${args.hosts}`);
                        }
                        return carry && isValidHost(host);
                    }, true);
                    if (areValid) {
                        return args.hosts;
                    }
                    else {
                        return ["https://hootsuite.com"];
                    }
                }
                else {
                    console.log("args.hosts is either null or not an array");
                    return ["https://hootsuite.com"];
                }
            };
            const fetches = getHosts().map((host) => {
                return this.attemptHost(host);
            });
            const result = yield Promise.race(fetches);
            return result;
        });
    }
    writeToDB() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const dirAndFilename = Document.getDirAndFilenameFromURI(this.uri);
                const writeOutPath = Document.getWriteOutPath(dirAndFilename);
                // recursively make directories to match url structure and write out file to index.html
                mkdirp(writeOutPath, (err) => {
                    if (err) {
                        console.error(err);
                        reject(false);
                    }
                    else {
                        // console.log(`New directy added: ${uri}`);
                        fs.writeFile(`${writeOutPath}/index.html`, this.body, (filewriteError) => {
                            if (filewriteError) {
                                console.error(filewriteError);
                                reject(false);
                            }
                            else {
                                console.log(`[OUT]: ${this.loc} => ${writeOutPath}`);
                                resolve(true);
                            }
                        });
                    }
                });
            });
        });
    }
    attemptHost(host, attempt = 1, maxAttempts = 10) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = encodeURI(`${host}/${this.uri}`);
            console.log(`[GET]: ${url}`);
            const promise = new Promise((resolve, reject) => {
                fetch(url).then((response) => {
                    console.log(`[${response.status}]: ${url}`);
                    // recursively try again in event of not found or error
                    if (response.status >= 400 && attempt <= maxAttempts) {
                        // failed but still allowed to retry
                        resolve(this.attemptHost(host, attempt + 1));
                    }
                    else if (response.status >= 400 && attempt > maxAttempts) {
                        // max attempts reached; die
                        console.error(`[DIE]: ${url}`);
                        response.text().then((err) => {
                            reject(err);
                        });
                    }
                    else {
                        // good response
                        response.text().then((content) => {
                            resolve(content);
                        });
                    }
                }).catch((err) => {
                    console.error(`Failed to fetch ${url}`);
                    console.error(err);
                    reject(err);
                });
            });
            return promise;
        });
    }
}
exports.Document = Document;
class DOMDocument extends Document {
}
exports.DOMDocument = DOMDocument;
class JSONDocument extends Document {
}
exports.JSONDocument = JSONDocument;
