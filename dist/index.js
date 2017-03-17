"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const glob = require("glob");
const fs = require("graceful-fs");
const http = require("http");
const https = require("https");
const mkdirp = require("mkdirp");
const os = require("os");
const request = require("request");
const Url = require("url");
const yargs = require("yargs");
const Page_1 = require("./lib/Page");
const SitemapIndex_1 = require("./lib/SitemapIndex");
http.globalAgent.maxSockets = 4;
https.globalAgent.maxSockets = 4;
const numCPUs = os.cpus().length;
const args = yargs.argv;
function previouslyScraped(url) {
    const dirAndFilename = Page_1.default.getDirAndFilenameFromURI(url.uri);
    const writeOutPath = Page_1.default.getWriteOutPath(dirAndFilename);
    const scraped = fs.existsSync(writeOutPath);
    return scraped;
}
function scrape(sitemapURL, hosts, maxSockets, save = true) {
    return __awaiter(this, void 0, void 0, function* () {
        /**
         * Setup max sockets for both http/https; fetch will determine which one to use
         */
        http.globalAgent.maxSockets = maxSockets;
        https.globalAgent.maxSockets = maxSockets;
        /**
         * Parses and validates --sitemap
         */
        const getSitemap = () => {
            return sitemapURL;
        };
        const successfullyFetched = [];
        const sanitizedSitemapURL = getSitemap();
        const si = new SitemapIndex_1.default(sanitizedSitemapURL);
        try {
            const sitemaps = yield si.getSitemaps(save);
            // Flatten out URL list
            const siteUrlSet = new Set();
            const siteUrlListList = yield Promise.all(sitemaps.map((sitemap) => {
                return sitemap.getUrls(save);
            }));
            for (const siteUrlList of siteUrlListList) {
                for (const url of siteUrlList) {
                    // mutate url if needed
                    url.loc = url.loc.replace(/https:\/\/hootsuite.com/gi, "http://preprod.hootsuite.com");
                    siteUrlSet.add(url);
                }
            }
            // fetch new unscraped content first
            const siteUrls = [...siteUrlSet];
            const newUrls = siteUrls.filter((url) => {
                return previouslyScraped(url) === false;
            });
            const oldUrls = siteUrls.filter((url) => {
                return previouslyScraped(url) === true;
            });
            console.log(`${siteUrls.length} URL found.`);
            console.log(`${newUrls.length} unscraped URL found; fetching first...`);
            console.log(`${oldUrls.length} previously scraped URL found; fetching last...`);
            const newUrlResults = yield Promise.all(newUrls.map((url) => {
                const urlObject = Url.parse(url.loc);
                // const urlObject = Url.parse(encodeURI(url.loc));
                return Page_1.default.fetchAndParse(urlObject).catch((err) => {
                    console.error(err);
                });
            }));
            console.log("All new URLs fetched, continuing to old...");
            const oldUrlResults = yield Promise.all(oldUrls.map((url) => {
                const urlObject = Url.parse(url.loc);
                return Page_1.default.fetchAndParse(urlObject).catch((err) => {
                    console.error(err);
                });
            }));
        }
        catch (err) {
            console.error(err);
        }
        return successfullyFetched;
    });
}
;
function getAssetsForAllScrapedPages() {
    return __awaiter(this, void 0, void 0, function* () {
        const hrefs = new Set();
        try {
            const fileListPromise = new Promise((resolve, reject) => {
                glob("public/**/*.html", (globErr, files) => {
                    if (globErr) {
                        console.error(globErr);
                        reject(globErr);
                    }
                    else {
                        resolve(files);
                    }
                });
            });
            console.log(`Generating file list...`);
            const fileList = yield fileListPromise;
            console.log(`File list generated: ${fileList.length} files found`);
            const regex = new RegExp(`(src|href|url)=?["'\(](/[^/][^"']*\.(css|js|jpe?g|gif|png|svg|webm))["'\)]`, "gi");
            const tagRegex = new RegExp(`(src|href)=["'](/[^/][^"']+\.(css|js|jpe?g|gif|png|svg|webm))["']`, "gi");
            const cssRegex = new RegExp(`(url)\(["']([^"']+)["']\)`, "gi");
            const parsePromises = fileList.map((file) => {
                return new Promise((resolve, reject) => {
                    fs.readFile(file, "utf8", (err, body) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            // const tag = (body.match(tagRegex) || []);
                            // const css = (body.match(cssRegex) || []);
                            // const paths = tag.concat(css)
                            //     .map((match) => {
                            //         return (/["'](.*)["']/gi.exec(match) || [])[1];
                            //     })
                            //     .filter((e) => e);
                            const paths = ((body || "")
                                .match(regex) || [])
                                .map((match) => {
                                return (/["'\(](.*)["'\)]/gi.exec(match) || [])[1];
                            })
                                .filter((e) => e)
                                .filter((e) => !e.match(/\/var\//gi))
                                .filter((e) => e.match(/(content|cms|bundles)/gi));
                            for (const path of paths) {
                                hrefs.add(path);
                            }
                            resolve(true);
                        }
                    });
                });
            });
            const parseDone = yield Promise.all(parsePromises);
            return new Set([...hrefs].sort());
        }
        catch (err) {
            return hrefs;
        }
    });
}
function getHrefsForAllScrapedPages() {
    return __awaiter(this, void 0, void 0, function* () {
        const hrefs = new Set();
        try {
            const fileListPromise = new Promise((resolve, reject) => {
                glob("public/**/*.html", (globErr, files) => {
                    if (globErr) {
                        console.error(globErr);
                        reject(globErr);
                    }
                    else {
                        resolve(files);
                    }
                });
            });
            console.log(`Generating file list...`);
            const fileList = yield fileListPromise;
            console.log(`File list generated: ${fileList.length} files found`);
            const hrefRegex = new RegExp(`href=["']([^"'\.\#]*)["']`, "gi");
            const parsePromises = fileList.map((file) => {
                return new Promise((resolve, reject) => {
                    fs.readFile(file, "utf8", (err, body) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            const paths = ((body || "")
                                .match(hrefRegex) || [])
                                .map((match) => {
                                return (/["'](.*)["']/gi.exec(match) || [])[1];
                            })
                                .filter((e) => e);
                            for (const path of paths) {
                                hrefs.add(path);
                            }
                            resolve(true);
                        }
                    });
                });
            });
            const parseDone = yield Promise.all(parsePromises);
        }
        catch (err) {
            console.error(err);
        }
        return hrefs;
    });
}
/**
 * Cli Interface
 */
yargs
    .usage("<cmd> [args]")
    .command("scrape", "scrape and save the site locally", {
    hosts: {
        default: [
            "http://preprod.hootsuite.com",
        ],
        type: "array",
    },
    maxSockets: {
        default: 1,
        type: "number",
    },
    save: {
        default: true,
        type: "boolean",
    },
    sitemap: {
        // default: "https://hootsuite.com/sitemap.xml",
        default: "http://dev.hootsuite.com:8888/sitemap.xml",
        type: "string",
    },
    sitemapHost: {
        default: "http://dev.hootsuite.com:8888",
        type: "string",
    },
}, (argv) => {
    scrape(argv.sitemap, argv.hosts, argv.maxSockets, argv.save).then((fetchedUrls) => {
        console.log(`Scaping complete. ${fetchedUrls.length} urls scraped and written out.`);
        console.log(fetchedUrls);
    }).catch((err) => {
        console.error(err);
    });
})
    .command("warmhosts", "ping the URLs in a sitemap on a single host but don't save locally", {
    hosts: {
        default: [
            "http://cache1.prod.content.us-east-1.hootops.com",
            "http://cache2.prod.content.us-east-1.hootops.com",
        ],
        type: "array",
    },
    maxSockets: {
        default: 4,
    },
    save: {
        default: false,
        type: "boolean",
    },
    sitemap: {
        default: "http://cache1.prod.content.us-east-1.hootops.com/sitemap.xml",
    },
}, (argv) => {
    scrape(argv.sitemap, argv.hosts, argv.maxSockets, argv.save).then((fetchedUrls) => {
        console.log(`Cache warming complete. ${fetchedUrls.length} urls pinged and returned 200's.`);
        console.log(fetchedUrls);
    });
})
    .command("updateassets", "search previously scraped assets for internal/local URLS and scrape them", {}, (argv) => {
    getAssetsForAllScrapedPages().then((fileList) => {
        // const urls: Set<string> = new Set([...fileList]
        //     .map((path) => Url.parse(decodeURI(`http://preprod.hootsuite.com${path}`)))
        //     .filter((url) => !Page.isPreviouslyScraped(url))
        //     .map((url) => url.href || "")
        //     .sort());
        // console.log(urls);
        // process.exit(1);
        // for (const [index, href] of [...urls].entries()) {
        //     const url = Url.parse(href);
        //     Page.fetchAndParse(url).then((assetUrls) => {
        //         console.log(`[${index + 1}/${urls.size}]: ${href}`);
        //     });
        // }
        const urls = [...fileList]
            .map((query) => {
            // return "https://hootsuite.com" + query;
            return "http://preprod.hootsuite.com" + query;
        })
            .filter((url) => {
            const urlObject = Url.parse(url);
            const scraped = Page_1.default.isPreviouslyScraped(urlObject);
            return !scraped;
        });
        console.log(`${urls.length} files to be downloaded...`);
        for (const [index, url] of urls.entries()) {
            console.log(`[${index + 1}/${urls.length}]: ${url}`);
            const fetch = new Promise((resolve, reject) => {
                request.get(encodeURI(url), { encoding: null }, (error, response, body) => {
                    if (error) {
                        console.log(error);
                        reject(error);
                    }
                    else {
                        // console.log(`[${response.statusCode}]: ${url}`);
                        resolve([response, body]);
                    }
                });
            }).then(([response, body]) => {
                const contentType = response.headers["content-type"] || "";
                const encoding = contentType.match(/text/gi) ? "utf8" : "binary";
                const urlObject = Url.parse(response.url || "");
                const path = response.request.path;
                const dirAndFilename = Page_1.default.getDirAndFilenameFromURI(path);
                const folderPath = Page_1.default.writeOutDir + dirAndFilename[0];
                mkdirp(folderPath, (err) => {
                    if (err) {
                        console.error(err);
                    }
                    else if (response.statusCode >= 400) {
                        console.error(`[${response.statusCode}]: ${response.statusMessage}`);
                    }
                    else {
                        const filename = folderPath + dirAndFilename[1];
                        fs.writeFile(filename, body, encoding, (filewriteError) => {
                            if (filewriteError) {
                                console.error(filewriteError);
                            }
                            else {
                                console.log(`[${index + 1}/${urls.length}]: ${url} => ${filename}`);
                            }
                        });
                    }
                });
            }).catch((error) => {
                console.error(error);
            });
        }
    }).catch((err) => {
        console.error(err);
    }).then(() => console.log("Done!"));
})
    .command("scrapehrefs", "", {}, (argv) => {
    getHrefsForAllScrapedPages().then((hrefs) => {
        // console.log(hrefs);
        const notScraped = new Set([...hrefs]
            .map((uri) => Url.parse(decodeURI(`http://preprod.hootsuite.com${uri}`)))
            .filter((url) => !Page_1.default.isPreviouslyScraped(url))
            .map((url) => url.href || "")
            .sort());
        for (const [index, href] of [...notScraped].entries()) {
            const url = Url.parse(href);
            Page_1.default.fetchAndParse(url).then((assetUrls) => {
                console.log(`[${index + 1}/${notScraped.size}]: ${href}`);
            });
        }
    }).catch((err) => {
        console.error(err);
    });
})
    .command("scrapeurl", "", {
    pathname: {
        default: "/",
        type: "string",
    },
}, (argv) => {
    const pathname = argv.pathname;
    const url = Url.parse(`http://preprod.hootsuite.com${pathname}`);
    console.log(`Scraping: ${url.href}`);
    Page_1.default.fetchAndParse(url).then((assetUrls) => {
        console.log("Done");
    }).catch((err) => {
        console.error(err);
    });
})
    .help()
    .argv;
