import * as cheerio from "cheerio";
import * as jsdom from "jsdom";
import { ChangeFrequency, DOMDocument } from "./Document";
import URL, { URLOptions } from "./URL";

export class SitemapOptions {
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
        super(loc);
        this.lastmod = options.lastmod;
        this.changefreq = options.changefreq;
        this.priority = options.priority;
    }

    public async getUrls(shouldSave: boolean = true): Promise<URL[]> {
        try {
            this.body = await this.fetch();

            if (shouldSave) {
                this.writeToDB();
            }
            const window = jsdom.jsdom(this.body).defaultView;
            const document = window.document;
            const urlNodes = Array.from(document.querySelectorAll("url"));
            this.urls = urlNodes.reduce((carry: URL[], urlNode) => {
                const locNode = urlNode.querySelector("loc");
                if (locNode !== null) {
                    const loc = locNode.innerHTML;
                    const options = new URLOptions();

                    Array.from(urlNode.children).forEach((child) => {
                        const key = child["tagName"];
                        const value = child["innerHTML"];
                        if (Object.keys(options).indexOf(key) > -1) {
                            options[key] = value;
                        }
                    });

                    carry.push(new URL(loc, options));
                }

                return carry;
            }, []);

            return this.urls;
        } catch (err) {
            console.error(err);
            return [];
        }
    }
}
