"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fetch = require("isomorphic-fetch");
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
    }
    fetch() {
        return __awaiter(this, void 0, void 0, function* () {
            return fetch(this.loc).then((response) => {
                return Buffer.from(response.body).toString();
            });
        });
    }
    writeToDB() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const uriMatches = this.loc.match(/\hootsuite.com(.*)/);
                let uri = "";
                if (uriMatches !== null) {
                    uri = uriMatches[1];
                }
                this.db.put(uri, this.body, (err) => {
                    if (err) {
                        console.error(err);
                        return reject(false);
                    }
                    console.log(`${uri} written to db`);
                    return resolve(true);
                });
            });
        });
    }
}
exports.Document = Document;
class DOMDocument extends Document {
    fetch() {
        return __awaiter(this, void 0, void 0, function* () {
            return fetch(this.loc).then((response) => {
                return response.text();
            }).then((html) => {
                return html;
            });
        });
    }
}
exports.DOMDocument = DOMDocument;
class JSONDocument extends Document {
    fetch() {
        return __awaiter(this, void 0, void 0, function* () {
            return fetch(this.loc).then((response) => {
                return response.json();
            }).then((json) => {
                return json;
            });
        });
    }
}
exports.JSONDocument = JSONDocument;
