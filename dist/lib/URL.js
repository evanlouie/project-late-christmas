"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const Document_1 = require("./Document");
class URLOptions {
}
exports.URLOptions = URLOptions;
class URL extends Document_1.DOMDocument {
    constructor(loc, options) {
        super(loc);
        this.loc = loc;
        this.lastmod = options.lastmod;
        this.changefreq = options.changefreq;
        this.priority = options.priority;
    }
    getContent(shouldSave = true) {
        return __awaiter(this, void 0, void 0, function* () {
            this.body = yield this.fetch();
            if (shouldSave) {
                this.writeToDB();
            }
            return this.body;
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = URL;
