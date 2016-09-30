import * as fetch from "isomorphic-fetch";
import levelup = require("levelup");

export enum ChangeFrequency {
    always,
    hourly,
    daily,
    weekly,
    monthly,
    yearly,
    never,
}

export interface IDocument {
    loc: string;
    body: string;
    fetch(): Promise<string>;
}

export class DocumentOptions {
    public db: LevelUp;

    constructor(db: LevelUp) {
        this.db = db;
    }
}

export abstract class Document implements IDocument {

    public loc: string;
    public body: string;
    protected db: LevelUp;

    constructor(url: string, options: DocumentOptions) {
        this.loc = url;
        this.db = options.db;
    }

    public async fetch(): Promise<string> {
        return fetch(this.loc).then((response) => {
            return Buffer.from(response.body).toString();
        });
    }

    protected async writeToDB(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const uriMatches = this.loc.match(/\hootsuite.com(.*)/);
            let uri = "";
            if (uriMatches !== null) {
                uri = uriMatches[1];
            }
            this.db.put(uri, this.body, (err) => {
                if (err) {
                    console.error(err);
                    return reject(false);
                }
                console.log(`${uri} written to db`);
                return resolve(true);
            });
        });
    }
}

export abstract class DOMDocument extends Document {
    public async fetch(): Promise<string> {
        return fetch(this.loc).then((response) => {
            return response.text();
        }).then((html) => {
            return html;
        });
    }
}

export abstract class JSONDocument extends Document {
    public async fetch(): Promise<string> {
        return fetch(this.loc).then((response) => {
            return response.json();
        }).then((json) => {
            return json;
        });
    }
}
