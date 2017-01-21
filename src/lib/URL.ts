import { ChangeFrequency, DOMDocument } from "./Document";

export class URLOptions {
    public lastmod: string | null;
    public changefreq: ChangeFrequency | null;
    public priority: number | null;
}

export default class URL extends DOMDocument {

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
        this.body = await this.fetch();
        if (shouldSave) {
            this.writeToDB();
        }
        return this.body;
    }
}
