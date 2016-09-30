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
const Sitemap_1 = require("./Sitemap");
const jsdom = require("jsdom");
class SitemapIndex extends Document_1.DOMDocument {
    getSitemaps() {
        return __awaiter(this, void 0, void 0, function* () {
            this.body = yield this.fetch();
            this.writeToDB(); // do not await
            const window = jsdom.jsdom(this.body).defaultView;
            const document = window.document;
            // <sitemap>
            const sitemaps = Array.from(document.querySelectorAll("sitemap")).map((sitemapNode) => {
                return {
                    lastmod: sitemapNode.querySelector("lastmod").innerHTML,
                    loc: sitemapNode.querySelector("loc").innerHTML,
                };
            });
            // Insantiate Sitemaps
            this.sitemaps = sitemaps.map((sitemap) => {
                return new Sitemap_1.default(sitemap.loc, new Sitemap_1.SitemapOptions(this.db));
            });
            return this.sitemaps;
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SitemapIndex;
