import { DOMDocument } from "./Document";
import Sitemap, { SitemapOptions } from "./Sitemap";
import * as jsdom from "jsdom";

export default class SitemapIndex extends DOMDocument {

    private sitemaps: Sitemap[];

    public async getSitemaps(shouldSave: boolean = true): Promise<Sitemap[]> {
        try {
            this.body = await this.fetch();
            if (shouldSave) {
                this.writeToDB();
            }

            /** @TODO test cheerio for faster reads (is document object retrievable?) */
            // const window = cheerio.load(this.body);
            const window = jsdom.jsdom(this.body).defaultView;
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
