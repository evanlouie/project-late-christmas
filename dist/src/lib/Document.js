"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fs = require("graceful-fs");
const fetch = require("isomorphic-fetch");
const mkdirp = require("mkdirp");
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
class DocumentOptions {
    constructor(db) {
        this.db = db;
    }
}
exports.DocumentOptions = DocumentOptions;
class Document {
    constructor(url, options) {
        this.loc = url;
        this.db = options.db;
        const uriMatches = this.loc.match(/^(.*hootsuite|.*hootops).com(:\d+)?\/(.*)/);
        if (uriMatches !== null) {
            this.uri = uriMatches[3];
        }
    }
    fetch() {
        return __awaiter(this, void 0, void 0, function* () {
            const host = "https://hootsuite.com";
            const url = `${host}/${this.uri}`;
            console.log(`[GET]: ${url}`);
            return fetch(url).then((response) => {
                console.log(`[${response.status}]: ${url}`);
                if (response.status >= 500) {
                    return this.fetch();
                }
                else {
                    return response.text();
                }
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
                const writeOutPath = process.cwd() + "/db/" + this.uri;
                mkdirp(writeOutPath, (err) => {
                    if (err) {
                        console.error(err);
                    }
                    else {
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
