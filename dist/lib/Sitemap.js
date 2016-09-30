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
const URL_1 = require("./URL");
const jsdom = require("jsdom");
class SitemapOptions extends Document_1.DocumentOptions {
    constructor() {
        super(...arguments);
        this.lastmod = null;
        this.changefreq = null;
        this.priority = null;
    }
}
exports.SitemapOptions = SitemapOptions;
class Sitemap extends Document_1.DOMDocument {
    constructor(loc, options) {
        super(loc, options);
        this.lastmod = options.lastmod;
        this.changefreq = options.changefreq;
        this.priority = options.priority;
    }
    getUrls() {
        return __awaiter(this, void 0, void 0, function* () {
            this.body = yield this.fetch();
            yield this.writeToDB();
            const window = jsdom.jsdom(this.body).defaultView;
            const document = window.document;
            const urlNodes = Array.from(document.querySelectorAll("url"));
            this.urls = urlNodes.map((urlNode) => {
                const loc = urlNode.querySelector("loc").innerHTML;
                const options = new URL_1.URLOptions(this.db);
                Array.from(urlNode.children).forEach((child) => {
                    const key = child.tagName;
                    const value = child.innerHTML;
                    if (Object.keys(options).indexOf(key) > -1) {
                        options[key] = value;
                    }
                });
                return new URL_1.default(loc, options);
            });
            return this.urls;
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Sitemap;
