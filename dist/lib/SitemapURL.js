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
const Document_1 = require("./Document");
class URLOptions {
}
exports.URLOptions = URLOptions;
class SitemapURL extends Document_1.DOMDocument {
    constructor(loc, options) {
        super(loc);
        this.loc = loc;
        this.lastmod = options.lastmod;
        this.changefreq = options.changefreq;
        this.priority = options.priority;
    }
    getContent(shouldSave = true) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.body = yield this.fetch();
                if (shouldSave) {
                    this.writeToDB();
                }
            }
            catch (err) {
                // write will fail, log error
                console.error(err);
            }
            return this.body;
        });
    }
}
exports.default = SitemapURL;
