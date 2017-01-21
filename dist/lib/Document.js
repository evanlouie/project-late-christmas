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
const fetch = require("isomorphic-fetch");
const mkdirp = require("mkdirp");
const yargs = require("yargs");
(function (ChangeFrequency) {
    ChangeFrequency[ChangeFrequency["always"] = 0] = "always";
    ChangeFrequency[ChangeFrequency["hourly"] = 1] = "hourly";
    ChangeFrequency[ChangeFrequency["daily"] = 2] = "daily";
    ChangeFrequency[ChangeFrequency["weekly"] = 3] = "weekly";
    ChangeFrequency[ChangeFrequency["monthly"] = 4] = "monthly";
    ChangeFrequency[ChangeFrequency["yearly"] = 5] = "yearly";
    ChangeFrequency[ChangeFrequency["never"] = 6] = "never";
})(exports.ChangeFrequency || (exports.ChangeFrequency = {}));
var ChangeFrequency = exports.ChangeFrequency;
class Document {
    constructor(url) {
        this.loc = url;
        // match for both hootsuite.com and hootops.com
        const uriMatches = this.loc.match(/^(.*hootsuite|.*hootops).com(:\d+)?\/(.*)/);
        if (uriMatches !== null) {
            this.uri = uriMatches[3];
        }
    }
    fetch(attempts = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            /**
             * Parses and validates --host from argsv; default to prerpod
             */
            const getHost = () => {
                const isValidHost = (host) => {
                    if (host.match(/https?:\/\/.*/i)) {
                        return true;
                    }
                    else {
                        return false;
                    }
                };
                const args = yargs.argv;
                if (args.host != null && isValidHost(args.host)) {
                    return args.host;
                }
                else {
                    return "https://hootsuite.com";
                }
            };
            // Maxiumum attempts against same URL before giving up
            const maxAttempts = 10;
            const host = getHost();
            const url = encodeURI(`${host}/${this.uri}`);
            console.log(`[GET]: ${url}`);
            return fetch(url).then((response) => {
                console.log(`[${response.status}]: ${url}`);
                // recursively try again in event of not found or error
                if (response.status >= 400 && attempts <= maxAttempts) {
                    // failed but still allowed to retry
                    return this.fetch(attempts++);
                }
                else if (response.status >= 400 && attempts > maxAttempts) {
                    // max attempts reached; die
                    console.error(`[DIE]: ${url}`);
                    return response.text();
                }
                else {
                    // good response
                    return response.text();
                }
                // return Buffer.from(response.body).toString();
            }).catch((err) => {
                console.error(`Failed to fetch ${url}`);
                console.error(err);
                return err;
            });
        });
    }
    writeToDB() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                /**
                 * string -> (string, string)
                 * Returns a tuple of [directory, filename]
                 */
                const getDirAndFilenameFromURI = (uri) => {
                    let directory = "";
                    let filename = "";
                    // const regexMatch = this.uri.match(/(.*\/)([^\/]*)$/);
                    const regexMatch = this.uri.match(/(.*\/)?([^\/]*)$/);
                    if (regexMatch !== null) {
                        // files on root directoy will lead to first match to be undefined
                        directory = regexMatch[1] || "";
                        filename = regexMatch[2];
                    }
                    return [directory, filename];
                };
                const dirAndFilename = getDirAndFilenameFromURI(this.uri);
                const writeOutPath = process.cwd() + "/db/" + dirAndFilename[0] + dirAndFilename[1];
                // recursively make directories to match url structure and write out file to index.html
                mkdirp(writeOutPath, (err) => {
                    if (err) {
                        console.error(err);
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
}
exports.Document = Document;
class DOMDocument extends Document {
}
exports.DOMDocument = DOMDocument;
class JSONDocument extends Document {
}
exports.JSONDocument = JSONDocument;
