import * as cluster from "cluster";
import * as express from "express";
import * as glob from "glob";
import * as fs from "graceful-fs";
import * as http from "http";
import * as https from "https";
import * as jsdom from "jsdom";
import * as mkdirp from "mkdirp";
import * as os from "os";
import * as request from "request";
import * as Url from "url";
import * as yargs from "yargs";
import Page from "./lib/Page";
import SitemapIndex from "./lib/SitemapIndex";
import SitemapURL, { URLOptions } from "./lib/SitemapURL";

http.globalAgent.maxSockets = 4;
https.globalAgent.maxSockets = 4;
const numCPUs = os.cpus().length;

const args = yargs.argv;

function previouslyScraped(url: SitemapURL): boolean {
    const dirAndFilename = Page.getDirAndFilenameFromURI(url.uri);
    const writeOutPath = Page.getWriteOutPath(dirAndFilename);
    const scraped = fs.existsSync(writeOutPath);

    return scraped;
}

async function scrape(
    sitemapURL: string,
    hosts: string[],
    maxSockets: number,
    save: boolean = true): Promise<string[]> {

    /**
     * Setup max sockets for both http/https; fetch will determine which one to use
     */
    http.globalAgent.maxSockets = maxSockets;
    https.globalAgent.maxSockets = maxSockets;

    /**
     * Parses and validates --sitemap
     */
    const getSitemap = (): string => {
        return sitemapURL;
    };

    const successfullyFetched: string[] = [];
    const sanitizedSitemapURL = getSitemap();
    const si = new SitemapIndex(sanitizedSitemapURL);

    try {
        const sitemaps = await si.getSitemaps(save);

        // Flatten out URL list
        const siteUrlSet: Set<SitemapURL> = new Set();
        const siteUrlListList: SitemapURL[][] = await Promise.all(sitemaps.map((sitemap) => {
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

        const newUrlResults = await Promise.all(newUrls.map((url) => {
            const urlObject = Url.parse(url.loc);
            // const urlObject = Url.parse(encodeURI(url.loc));
            return Page.fetchAndParse(urlObject).catch((err) => {
                console.error(err);
            });
        }));

        console.log("All new URLs fetched, continuing to old...");

        const oldUrlResults = await Promise.all(oldUrls.map((url) => {
            const urlObject = Url.parse(url.loc);
            return Page.fetchAndParse(urlObject).catch((err) => {
                console.error(err);
            });
        }));

    } catch (err) {
        console.error(err);
    }

    return successfullyFetched;
};

async function getAssetsForAllScrapedPages(): Promise<Set<string>> {
    const hrefs: Set<string> = new Set();
    try {
        const fileListPromise: Promise<string[]> = new Promise((resolve, reject) => {
            glob("public/**/*.html", (globErr, files) => {
                if (globErr) {
                    console.error(globErr);
                    reject(globErr);
                } else {
                    resolve(files);
                }
            });
        });

        console.log(`Generating file list...`);
        const fileList = await fileListPromise;
        console.log(`File list generated: ${fileList.length} files found`);

        const regex = new RegExp(`(src|href|url)=?["'\(](/[^/][^"']*\.(css|js|jpe?g|gif|png|svg|webm))["'\)]`, "gi");
        const tagRegex = new RegExp(`(src|href)=["'](/[^/][^"']+\.(css|js|jpe?g|gif|png|svg|webm))["']`, "gi");
        const cssRegex = new RegExp(`(url)\(["']([^"']+)["']\)`, "gi");

        const parsePromises: Array<Promise<boolean>> = fileList.map((file) => {
            return new Promise<boolean>((resolve, reject) => {
                fs.readFile(file, "utf8", (err, body) => {
                    if (err) {
                        reject(err);
                    } else {
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

        const parseDone = await Promise.all(parsePromises);
        return new Set([...hrefs].sort());
    } catch (err) {
        return hrefs;
    }
}

async function getHrefsForAllScrapedPages(): Promise<Set<string>> {
    const hrefs: Set<string> = new Set();

    try {
        const fileListPromise: Promise<string[]> = new Promise((resolve, reject) => {
            glob("public/**/*.html", (globErr, files) => {
                if (globErr) {
                    console.error(globErr);
                    reject(globErr);
                } else {
                    resolve(files);
                }
            });
        });

        console.log(`Generating file list...`);
        const fileList = await fileListPromise;
        console.log(`File list generated: ${fileList.length} files found`);

        const hrefRegex = new RegExp(`href=["']([^"'\.\#]*)["']`, "gi");
        const parsePromises: Array<Promise<boolean>> = fileList.map((file) => {
            return new Promise<boolean>((resolve, reject) => {
                fs.readFile(file, "utf8", (err, body) => {
                    if (err) {
                        reject(err);
                    } else {
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

        const parseDone = await Promise.all(parsePromises);

    } catch (err) {
        console.error(err);
    }

    return hrefs;
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
                // "https://hootsuite.com",
                // "http://cache1.prod.content.us-east-1.hootops.com",
                // "http://cache2.prod.content.us-east-1.hootops.com",
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
    .command("updateassets", "search previously scraped assets for internal/local URLS and scrape them", {

    }, (argv) => {
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
                // .filter((path) => {
                //     return path.match(/^\/(cms|var|bundle|content).*/gi);
                // })
                .map((query) => {
                    // return "https://hootsuite.com" + query;
                    return "http://preprod.hootsuite.com" + query;
                })
                .filter((url) => {
                    const urlObject = Url.parse(url);
                    const scraped = Page.isPreviouslyScraped(urlObject);
                    return !scraped;
                });

            console.log(`${urls.length} files to be downloaded...`);
            for (const [index, url] of urls.entries()) {
                console.log(`[${index + 1}/${urls.length}]: ${url}`);
                const fetch = new Promise<[request.RequestResponse, Buffer]>((resolve, reject) => {
                    request.get(encodeURI(url), { encoding: null }, (error, response, body) => {
                        if (error) {
                            console.log(error);
                            reject(error);
                        } else {
                            // console.log(`[${response.statusCode}]: ${url}`);
                            resolve([response, body]);
                        }
                    });
                }).then(([response, body]) => {
                    const contentType: string = response.headers["content-type"] || "";
                    const encoding = contentType.match(/text/gi) ? "utf8" : "binary";
                    const urlObject = Url.parse(response.url || "");
                    const path = (response.request as request.Options & { path: string }).path;
                    const dirAndFilename = Page.getDirAndFilenameFromURI(path);
                    const folderPath = Page.writeOutDir + dirAndFilename[0];
                    mkdirp(folderPath, (err) => {
                        if (err) {
                            console.error(err);
                        } else if (response.statusCode >= 400) {
                            console.error(`[${response.statusCode}]: ${response.statusMessage}`);
                        } else {
                            const filename = folderPath + dirAndFilename[1];
                            fs.writeFile(filename, body, encoding, (filewriteError) => {
                                if (filewriteError) {
                                    console.error(filewriteError);
                                } else {
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
    .command("scrapehrefs", "", {

    }, (argv) => {
        getHrefsForAllScrapedPages().then((hrefs) => {
            // console.log(hrefs);
            const notScraped: Set<string> = new Set([...hrefs]
                .map((uri) => Url.parse(decodeURI(`http://preprod.hootsuite.com${uri}`)))
                .filter((url) => !Page.isPreviouslyScraped(url))
                .map((url) => url.href || "")
                .sort());

            for (const [index, href] of [...notScraped].entries()) {
                const url = Url.parse(href);
                Page.fetchAndParse(url).then((assetUrls) => {
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
        const pathname: string = argv.pathname;
        const url = Url.parse(`http://preprod.hootsuite.com${pathname}`);
        console.log(`Scraping: ${url.href}`);
        Page.fetchAndParse(url).then((assetUrls) => {
            console.log("Done");
        }).catch((err) => {
            console.error(err);
        });
    })
    .help()
    .argv;
