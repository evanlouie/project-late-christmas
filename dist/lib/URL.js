"use strict";
const Document_1 = require("./Document");
class URLOptions extends Document_1.DocumentOptions {
}
exports.URLOptions = URLOptions;
class URL extends Document_1.DOMDocument {
    constructor(loc, options) {
        super(loc, options);
        this.loc = loc;
        this.lastmod = options.lastmod;
        this.changefreq = options.changefreq;
        this.priority = options.priority;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = URL;
