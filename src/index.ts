import * as express from "express";
import * as http from "http";
import * as https from "https";
import * as yargs from "yargs";
import SitemapIndex from "./lib/SitemapIndex";

const args = yargs.argv;

// const app: express.Express = express();
// const port: number = 9999;
// app.use(express.static("db"));
// app.listen(port, () => {
//     console.log(`Listing to port ${port}`);
// });

async function scrape(sitemapURL: string, host: string, maxSockets: number, save: boolean = true): Promise<string[]> {
    /**
     * Setup max sockets for both http/https; fetch will determine which one to use
     */
    http.globalAgent.maxSockets = maxSockets;
    https.globalAgent.maxSockets = maxSockets;

    /**
     * Parses and validates --sitemap from args
     */
    const getSitemap = (): string => {
        const isValidSitemapUrl = (url: string): boolean => {
            if (url.match(/https?.*\.sitemap.xml/i)) {
                return true;
            } else {
                return false;
            }
        };

        if (args.sitemap != null && isValidSitemapUrl(args.sitemap)) {
            return args.sitemap;
        } else {
            return "http://preprod.hootsuite.com/sitemap.xml";
        }
    };

    const successfullyFetched: string[] = [];
    const sanitizedSitemapURL = getSitemap();
    const si = new SitemapIndex(sanitizedSitemapURL);

    try {
        // Although the nested async/await don't work as expected of coroutines, order doesn't matter as long as
        // sitemap is downloaded before the actual page (which it is by definition)
        // http://calculist.org/blog/2011/12/14/why-coroutines-wont-work-on-the-web/
        const sitemaps = await si.getSitemaps(save);
        sitemaps.forEach(async (sitemap) => {
            const urls = await sitemap.getUrls(save);
            urls.forEach(async (url) => {
                const pageContent = await url.getContent(save);
                successfullyFetched.push(url.loc);
            });
        });
    } catch (err) {
        console.error(err);
    }

    return successfullyFetched;
};

/**
 * Cli Interface
 */
yargs
    .usage("<cmd> [args]")
    .command("scrape", "scrape and save the site locally", {
        host: {
            default: "https://hootsuite.com",
            type: "string",
        },
        maxSockets: {
            default: 2,
            type: "number",
        },
        save: {
            default: true,
            type: "boolean",
        },
        sitemap: {
            default: "https://hootsuite.com/sitemap.xml",
            type: "string",
        },
    }, (argv) => {
        scrape(argv.sitemap, argv.host, argv.maxSockets, argv.save).then((urlList) => {
            console.log(urlList);
        }).catch((err) => {
            console.error(err);
        });
    })
    .command("warmcache", "ping the URLs in a sitemap but don't save locally", {
        host: {
            default: "http://cache1.prod.content.us-east-1.hootops.com",
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
        scrape(argv.sitemap, argv.host, argv.maxSockets, argv.save).then((urlList) => {
            console.log(urlList);
        }).catch((err) => {
            console.error(err);
        });
    })
    .help()
    .argv;
