"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const http = require("http");
const https = require("https");
const yargs = require("yargs");
const SitemapIndex_1 = require("./lib/SitemapIndex");
const args = yargs.argv;
// const app: express.Express = express();
// const port: number = 9999;
// app.use(express.static("db"));
// app.listen(port, () => {
//     console.log(`Listing to port ${port}`);
// });
function scrape(sitemapURL, host, maxSockets, save = true) {
    return __awaiter(this, void 0, void 0, function* () {
        /**
         * Setup max sockets for both http/https; fetch will determine which one to use
         */
        http.globalAgent.maxSockets = maxSockets;
        https.globalAgent.maxSockets = maxSockets;
        /**
         * Parses and validates --sitemap from args
         */
        const getSitemap = () => {
            const isValidSitemapUrl = (url) => {
                if (url.match(/https?.*\.sitemap.xml/i)) {
                    return true;
                }
                else {
                    return false;
                }
            };
            if (args.sitemap != null && isValidSitemapUrl(args.sitemap)) {
                return args.sitemap;
            }
            else {
                return "http://preprod.hootsuite.com/sitemap.xml";
            }
        };
        const successfullyFetched = [];
        const sanitizedSitemapURL = getSitemap();
        const si = new SitemapIndex_1.default(sanitizedSitemapURL);
        try {
            // Although the nested async/await don't work as expected of coroutines, order doesn't matter as long as
            // sitemap is downloaded before the actual page (which it is by definition)
            // http://calculist.org/blog/2011/12/14/why-coroutines-wont-work-on-the-web/
            const sitemaps = yield si.getSitemaps(save);
            sitemaps.forEach((sitemap) => __awaiter(this, void 0, void 0, function* () {
                const urls = yield sitemap.getUrls(save);
                urls.forEach((url) => __awaiter(this, void 0, void 0, function* () {
                    const pageContent = yield url.getContent(save);
                    successfullyFetched.push(url.loc);
                }));
            }));
        }
        catch (err) {
            console.error(err);
        }
        return successfullyFetched;
    });
}
;
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
