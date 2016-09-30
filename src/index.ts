import levelup = require("levelup");
import SitemapIndex from "./lib/SitemapIndex";
import * as express from "express";

const app: express.Express = express();
const db: LevelUp = levelup("./db");
const port: number = 9999;

// All keys are accessible via GET
// db.createKeyStream().on("data", (key) => {
//     app.get(key, (req, res) => {
//         db.get(key, (err, value) => {
//             if (err) {
//                 res.json(err);
//             } else {
//                 res.send(value);
//             }
//         });
//     });
// });

// Any get is piped 
app.get(/^\/(.+)/, (req, res) => {
    console.log(req.params[0]);
    db.get(req.params[0], (err, value) => {
        if (err) {
            res.json(err);
        } else {
            res.set('Content-Type', 'text/xml');
            res.send(value);
        }
    });
});

// Root is index listing
app.get("/", (req, res) => {
    const keys: string[] = [];
    db.createKeyStream().on("data", (key) => {
        keys.push(key);
    }).on("close", () => {
        res.json(keys);
    });
});

app.listen(port, () => {
    console.log(`Listing to port ${port}`);
});

const si = new SitemapIndex("https://hootsuite.com/sitemap.xml", { db });
try {
    si.getSitemaps().then((sitemaps) => {
        sitemaps.forEach((sitemap) => {
            sitemap.getUrls().then((urls) => {
                urls.forEach((url) => {
                    // console.log(url);
                });
            });
        });
    });
} catch (err) {
    console.error(err);
}
