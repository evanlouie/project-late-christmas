import * as fs from "graceful-fs";
import * as http from "http";
import * as https from "https";
import * as jsdom from "jsdom";
import * as mkdirp from "mkdirp";
import * as request from "request";
import * as url from "url";
import { Url } from "url";

export default class Page {

    /** @var string writeOutDir - the directory pages will be written out to */
    public static readonly writeOutDir: string = process.cwd() + `/public`;

    //////// START LIB CODE ////////

    /**
     * string -> (string, string)
     * Returns a tuple of [directory, filename]
     */
    public static getDirAndFilenameFromURI(uri: string): [string, string] {
        let directory = ``;
        let filename = ``;
        // const regexMatch = this.uri.match(/(.*\/)([^\/]*)$/);
        const regexMatch = uri.match(/(.*\/)?([^\/]*)$/);
        if (regexMatch !== null) {
            // files on root directoy will lead to first match to be undefined
            directory = regexMatch[1] || ``;
            filename = regexMatch[2];
        }
        return [directory, filename];
    }

    /**
     * [string, string] -> string
     * Returns the write out path for a given (dir, filename) tuple
     */
    public static getWriteOutPath(dirAndFilename: [string, string]): string {
        const writeOutPath = Page.writeOutDir + "/" + dirAndFilename[0] + dirAndFilename[1];
        return writeOutPath;
    }

    /**
     * [Url] -> boolean
     * Returns a booelan of whether or not a url has been previously scraped and saved
     */
    public static isPreviouslyScraped(targetUrl: Url): boolean {
        const dirAndFilename = Page.getDirAndFilenameFromURI(targetUrl.path || ``);
        const writeOutPath = Page.getWriteOutPath(dirAndFilename);

        // return await new Promise<boolean>((resolve, reject) => {
        //     fs.access(writeOutPath, fs.constants.F_OK, (err) => {
        //         if (err) {
        //             // reject(err);
        //             console.error(err);
        //             resolve(false);
        //         } else {
        //             resolve(true);
        //         }
        //     });
        // });
        return fs.existsSync(writeOutPath);
    }

    /**
     * Download a page and all associated assets
     */
    public static async fetchAndParse(root: Url, depth: number = 0, maxDepth: number = 1): Promise<string[]> {
        try {
            const page = new Page(root);
            const body = await page.get();
            return [];

            // const localUrls = await page.parseRelativeUrls([`src`, `href`]);
            // const assetUrls = localUrls.filter((url) => {
            //     return (url.path || ``).match(/\.(css|js|jpe?g|gif|png|svg|webm)/gi);
            // }).filter((url) => {
            //     // filter out /var/ folder
            //     return !(url.path || ``).match(/\/var\//gi);
            // });
            // const unscrapedAssetUrls = assetUrls.filter((url) => {
            //     return Page.isPreviouslyScraped(url) === false;
            // });
            // const assetPromises: Array<Promise<string>> = unscrapedAssetUrls.map((url) => {
            //     const assetPage = new Page(url);
            //     return assetPage.get();
            // };
            // return await Promise.all(assetPromises);

        } catch (err) {
            console.error(err);
            return [];
        }
    }

    //////// END LIB CODE ////////

    public url: Url;
    public body: string;
    // public jsdom: jsdom.DocumentWithParentWindow;
    public response: request.RequestResponse;

    constructor(pageUrl: Url) {
        this.url = pageUrl;
    }

    public async parseRelativeUrls(attributes: string[] = [`src`, `href`]): Promise<Url[]> {
        try {
            if (!this.body) {
                await this.get();
            }
            // const window = (new jsdom.JSDOM(this.body, { url: this.url.href })).defaultView;
            const window = (new jsdom.JSDOM(this.body, { url: this.url.href })).window;
            const document = window.document;

            // PARSE SRC/HREF
            const selector: string = attributes.map((attribute) => `[${attribute}]`).join(`,`);

            // COMBINE TO URL ARRAY
            const elements: Element[] = [...document.querySelectorAll(selector)];
            const urls: Set<Url> = new Set();
            for (const element of elements) {
                for (const attribute of attributes) {
                    if (element.hasAttribute(attribute)) {
                        const href = element[attribute];
                        if (typeof href !== `undefined`) {
                            urls.add(url.parse(element[attribute]));
                        }
                    }
                }
            }

            // CLOSE JSDOM WINDOW TO CLEAR MEMORY
            window.close();

            // FILTER TO ONLY LOCAL/RELATIVE URLS
            const localUrlRegex = new RegExp(`${this.url.hostname}`, `gi`);
            const localUrls = [...new Set([...urls].filter((localUrl) => {
                return (localUrl.host || ``).match(localUrlRegex);
            }))];

            return localUrls;
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    public async fetch(): Promise<{ response: request.RequestResponse, body: any }> {
        const promise = new Promise<{ response: request.RequestResponse, body: any }>((resolve, reject) => {
            const uri = encodeURI(this.url.href || "");
            request.get(uri, { encoding: null, maxRedirects: 8 }, (error, response, body) => {
                if (error) {
                    reject(error);
                } else if (typeof response.statusCode !== "undefined" && response.statusCode >= 400) {
                    console.log(`[${response.statusCode}]: ${this.url.href}`);
                    reject(`[${response.statusCode}]: ${response.statusMessage}`);
                } else {
                    resolve({ response, body });
                }
            });
        });

        return promise;
    }

    public async get(attempt: number = 0, maxAttempts: number = 8): Promise<string> {
        try {
            console.log(`${attempt === 0 ? `[GET]` : `[RET]`}: ${this.url.href}`);

            try {
                const fetch = await this.fetch();
                this.response = fetch.response;
                this.body = fetch.body;
            } catch (err) {
                if (attempt + 1 <= maxAttempts) {
                    return this.get(attempt + 1);
                } else {
                    // console.error(`[DIE]: ${this.url.href}`);
                    // return Promise.reject(err);
                    console.error(`[DIE]: ${this.url.href}`);
                    return Promise.reject(err);
                }
            }

            // only match for binary and utf8 encodings
            const responseType = this.response.headers[`content-type`];
            let contentType = "";
            if (responseType === "string") {
                contentType = responseType;
            }
            const encoding = contentType.match(/text/gi) ? `utf8` : `binary`;
            const textTypeRegex = /(html|xml|json)/gi;
            const dirAndFilename = Page.getDirAndFilenameFromURI(this.url.path || ``);

            return await new Promise<string>((resolve, reject) => {
                if (contentType.match(textTypeRegex)) {
                    // SAVE AS INDEX.HTML IN FOLDER
                    // folderPath will have full querypath as folder
                    const writeOutPath = Page.getWriteOutPath(dirAndFilename);
                    mkdirp(writeOutPath, (err) => {
                        if (err) {
                            console.error(err);
                            reject(err);
                        } else {
                            const filename = `${writeOutPath}/index.html`;
                            fs.writeFile(filename, this.body, encoding, (filewriteError) => {
                                if (filewriteError) {
                                    console.error(filewriteError);
                                    reject(filewriteError);
                                } else {
                                    console.log(`[OUT]: ${this.url.href} => ${filename}`);
                                    resolve(this.body);
                                }
                            });
                        }
                    });
                } else {
                    // PARSE OUT FILE NAME FROM URI AND SAVE AS FILE
                    // mkdirp for folder
                    const folderPath = Page.writeOutDir + dirAndFilename[0];
                    mkdirp(folderPath, (err) => {
                        if (err) {
                            console.error(err);
                            reject(err);
                        } else {
                            const filename = folderPath + dirAndFilename[1];
                            fs.writeFile(filename, this.body, encoding, (filewriteError) => {
                                if (filewriteError) {
                                    console.error(filewriteError);
                                    reject(filewriteError);
                                } else {
                                    console.log(`[OUT]: ${this.url.href} => ${filename}`);
                                    resolve(this.body);
                                }
                            });
                        }
                    });
                }
            });

        } catch (err) {
            console.error(err);
            return Promise.reject(err);
        }
    }
}
