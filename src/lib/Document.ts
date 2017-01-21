import * as fs from "graceful-fs";
import * as http from "http";
import * as https from "https";
import * as fetch from "isomorphic-fetch";
import * as mkdirp from "mkdirp";
import * as yargs from "yargs";
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

export abstract class Document implements IDocument {

    public loc: string;
    public body: string;
    public uri: string;

    constructor(url: string) {
        this.loc = url;
        // match for both hootsuite.com and hootops.com
        const uriMatches = this.loc.match(/^(.*hootsuite|.*hootops).com(:\d+)?\/(.*)/);
        if (uriMatches !== null) {
            this.uri = uriMatches[3];
        }
    }

    public async fetch(attempts: number = 0): Promise<string> {

        /**
         * Parses and validates --host from argsv; default to prerpod
         */
        const getHost = (): string => {
            const isValidHost = (host: string): boolean => {
                if (host.match(/https?:\/\/.*/i)) {
                    return true;
                } else {
                    return false;
                }
            };

            const args = yargs.argv;
            if (args.host != null && isValidHost(args.host)) {
                return args.host;
            } else {
                return "https://hootsuite.com";
            }
        };

        // Maxiumum attempts against same URL before giving up
        const maxAttempts: number = 10;
        const host = getHost();
        const url = encodeURI(`${host}/${this.uri}`);
        console.log(`[GET]: ${url}`);
        return fetch(url).then((response) => {
            console.log(`[${response.status}]: ${url}`);

            // recursively try again in event of not found or error
            if (response.status >= 400 && attempts <= maxAttempts) {
                // failed but still allowed to retry
                return this.fetch(attempts++);
            } else if (response.status >= 400 && attempts > maxAttempts) {
                // max attempts reached; die
                console.error(`[DIE]: ${url}`);
                return response.text();
            } else {
                // good response
                return response.text();
            }
            // return Buffer.from(response.body).toString();
        }).catch((err) => {
            console.error(`Failed to fetch ${url}`);
            console.error(err);
            return err;
        });
    }

    public async writeToDB(): Promise<boolean> {

        return new Promise<boolean>((resolve, reject) => {
            /**
             * string -> (string, string)
             * Returns a tuple of [directory, filename]
             */
            const getDirAndFilenameFromURI = (uri: string): [string, string] => {
                let directory = "";
                let filename = "";
                // const regexMatch = this.uri.match(/(.*\/)([^\/]*)$/);
                const regexMatch = this.uri.match(/(.*\/)?([^\/]*)$/);
                if (regexMatch !== null) {
                    // files on root directoy will lead to first match to be undefined
                    directory = regexMatch[1] || "";
                    filename = regexMatch[2];
                }
                return [directory, filename];
            };

            const dirAndFilename = getDirAndFilenameFromURI(this.uri);
            const writeOutPath = process.cwd() + "/db/" + dirAndFilename[0] + dirAndFilename[1];

            // recursively make directories to match url structure and write out file to index.html
            mkdirp(writeOutPath, (err) => {
                if (err) {
                    console.error(err);
                } else {
                    // console.log(`New directy added: ${uri}`);
                    fs.writeFile(`${writeOutPath}/index.html`, this.body, (filewriteError) => {
                        if (filewriteError) {
                            console.error(filewriteError);
                            reject(false);
                        } else {
                            console.log(`[OUT]: ${this.loc} => ${writeOutPath}`);
                            resolve(true);
                        }
                    });
                }
            });
        });
    }
}

export abstract class DOMDocument extends Document {

    // public async fetch(): Promise<string> {
    //     return fetch(this.loc).then((response) => {
    //         return response.text();
    //     }).then((html) => {
    //         return html;
    //     });
    // }
}

export abstract class JSONDocument extends Document {
    // public async fetch(): Promise<string> {
    //     return fetch(this.loc).then((response) => {
    //         return response.json();
    //     }).then((json) => {
    //         return json;
    //     });
    // }
}
