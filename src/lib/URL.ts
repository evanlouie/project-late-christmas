import { ChangeFrequency, DOMDocument, DocumentOptions } from "./Document";

export class URLOptions extends DocumentOptions {
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
        super(loc, options);
        this.loc = loc;
        this.lastmod = options.lastmod;
        this.changefreq = options.changefreq;
        this.priority = options.priority;
    }
}
