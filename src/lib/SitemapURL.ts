import { ChangeFrequency, DOMDocument } from "./Document";

export class URLOptions {
    public lastmod: string | null;
    public changefreq: ChangeFrequency | null;
    public priority: number | null;
}

export default class SitemapURL extends DOMDocument {

    public loc: string;
    public lastmod: string | null;
    public changefreq: ChangeFrequency | null;
    public priority: number | null;

    constructor(loc: string, options: URLOptions) {
        super(loc);
        this.loc = loc;
        this.lastmod = options.lastmod;
        this.changefreq = options.changefreq;
        this.priority = options.priority;
    }

    public async getContent(shouldSave: boolean = true): Promise<string> {
        try {
            this.body = await this.fetch();
            if (shouldSave) {
                this.writeToDB();
            }
        } catch (err) {
            // write will fail, log error
            console.error(err);
        }

        return this.body;
    }
}
