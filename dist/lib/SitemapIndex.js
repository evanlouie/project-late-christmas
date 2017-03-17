"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const jsdom = require("jsdom");
const Document_1 = require("./Document");
const Sitemap_1 = require("./Sitemap");
class SitemapIndex extends Document_1.DOMDocument {
    // public async fetch(): Promise<string> {
    //     console.log(`[GET]: ${this.loc}`);
    //     return fetch(this.loc).then((response) => {
    //         console.log(`[${response.status}]: ${this.loc}`);
    //         if (response.status >= 400) {
    //             console.error(`[DIE]: ${this.loc}`);
    //             return response.text();
    //         } else {
    //             return response.text();
    //         }
    //     }).catch((err) => {
    //         console.error(`Failed to fetch ${this.loc}`);
    //         console.error(err);
    //         return err;
    //     });
    // }
    getSitemaps(shouldSave = true) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.body = yield this.fetch();
                if (shouldSave) {
                    this.writeToDB();
                }
                /** @TODO test cheerio for faster reads (is document object retrievable?) */
                // const window = cheerio.load(this.body);
                const window = jsdom.jsdom(this.body).defaultView;
                const document = window.document;
                // <sitemap>
                const sitemaps = Array.from(document.querySelectorAll("sitemap"))
                    .reduce((carry, sitemapNode) => {
                    const lastmodNode = sitemapNode.querySelector("lastmod");
                    const locNode = sitemapNode.querySelector("loc");
                    if (lastmodNode !== null && locNode !== null) {
                        const sitemap = {
                            lastmod: lastmodNode.innerHTML,
                            loc: locNode.innerHTML,
                        };
                        carry.push(sitemap);
                    }
                    return carry;
                }, []);
                // Insantiate Sitemaps
                this.sitemaps = sitemaps.map((sitemap) => {
                    return new Sitemap_1.default(sitemap.loc, new Sitemap_1.SitemapOptions());
                });
                return this.sitemaps;
            }
            catch (err) {
                console.error(err);
                return [];
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SitemapIndex;
