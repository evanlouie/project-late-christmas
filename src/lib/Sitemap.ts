import { ChangeFrequency, DOMDocument, DocumentOptions } from "./Document";
import URL, { URLOptions } from "./URL";
import * as jsdom from "jsdom";

export class SitemapOptions extends DocumentOptions {
    public lastmod: string | null = null;
    public changefreq: ChangeFrequency | null = null;
    public priority: number | null = null;
}


export default class Sitemap extends DOMDocument {

    public loc: string;
    public lastmod: string | null;
    public changefreq: ChangeFrequency | null;
    public priority: number | null;
    private urls: URL[];

    public constructor(loc: string, options: SitemapOptions) {
        super(loc, options);
        this.lastmod = options.lastmod;
        this.changefreq = options.changefreq;
        this.priority = options.priority;
    }

    public async getUrls(): Promise<URL[]> {
        this.body = await this.fetch();
        await this.writeToDB();

        const window = jsdom.jsdom(this.body).defaultView;
        const document = window.document;
        const urlNodes = Array.from(document.querySelectorAll("url"));
        this.urls = urlNodes.map((urlNode) => {
            const loc = urlNode.querySelector("loc").innerHTML;
            const options = new URLOptions(this.db);

            Array.from(urlNode.children).forEach((child) => {
                const key = child.tagName;
                const value = child.innerHTML;
                if (Object.keys(options).indexOf(key) > -1) {
                    options[key] = value;
                }
            });

            return new URL(loc, options);
        });

        return this.urls;
    }
}
