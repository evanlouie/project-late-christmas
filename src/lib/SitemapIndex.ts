import * as jsdom from "jsdom";
import { DOMDocument } from "./Document";
import Sitemap, { SitemapOptions } from "./Sitemap";

export default class SitemapIndex extends DOMDocument {

    private sitemaps: Sitemap[];

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

    public async getSitemaps(shouldSave: boolean = true): Promise<Sitemap[]> {
        try {
            this.body = await this.fetch();
            if (shouldSave) {
                this.writeToDB();
            }

            /** @TODO test cheerio for faster reads (is document object retrievable?) */
            // const window = cheerio.load(this.body);
            const window = (new jsdom.JSDOM(this.body)).window;
            const document = window.document;

            // <sitemap>
            const sitemaps = Array.from(document.querySelectorAll("sitemap"))
                .reduce((carry: Array<{ lastmod: string, loc: string }>, sitemapNode: Element) => {
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
                return new Sitemap(sitemap.loc, new SitemapOptions());
            });

            return this.sitemaps;
        } catch (err) {
            console.error(err);
            return [];
        }
    }
}
