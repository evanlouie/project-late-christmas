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
const jsdom = require("jsdom");
const Document_1 = require("./Document");
const SitemapURL_1 = require("./SitemapURL");
class SitemapOptions {
    constructor() {
        this.lastmod = null;
        this.changefreq = null;
        this.priority = null;
    }
}
exports.SitemapOptions = SitemapOptions;
class Sitemap extends Document_1.DOMDocument {
    constructor(loc, options) {
        super(loc);
        this.lastmod = options.lastmod;
        this.changefreq = options.changefreq;
        this.priority = options.priority;
    }
    getUrls(shouldSave = true) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.body = yield this.fetch();
                if (shouldSave) {
                    this.writeToDB();
                }
                // const window = jsdom.jsdom(this.body).defaultView;
                const window = (new jsdom.JSDOM(this.body)).window;
                const document = window.document;
                const urlNodes = Array.from(document.querySelectorAll("url"));
                this.urls = urlNodes.reduce((carry, urlNode) => {
                    const locNode = urlNode.querySelector("loc");
                    if (locNode !== null) {
                        const loc = locNode.innerHTML;
                        const options = new SitemapURL_1.URLOptions();
                        Array.from(urlNode.children).forEach((child) => {
                            const key = child.tagName;
                            const value = child.value;
                            if (Object.keys(options).indexOf(key) > -1) {
                                options[key] = value;
                            }
                        });
                        carry.push(new SitemapURL_1.default(loc, options));
                    }
                    return carry;
                }, []);
                return this.urls;
            }
            catch (err) {
                console.error(err);
                return [];
            }
        });
    }
}
exports.default = Sitemap;
