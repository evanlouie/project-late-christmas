import { DOMDocument } from "./Document";
import Sitemap, { SitemapOptions } from "./Sitemap";
import * as jsdom from "jsdom";

export default class SitemapIndex extends DOMDocument {

    private sitemaps: Sitemap[];

    public async getSitemaps(): Promise<Sitemap[]> {
        this.body = await this.fetch();
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
            return new Sitemap(sitemap.loc, new SitemapOptions(this.db));
        });

        return this.sitemaps;
    }
}
