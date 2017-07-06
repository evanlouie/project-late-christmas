import * as fs from "graceful-fs";
import * as http from "http";
import * as https from "https";
import * as fetch from "isomorphic-fetch";
import * as mkdirp from "mkdirp";
import * as yargs from "yargs";
import Page from "./Page";
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

    /**
     * string -> (string, string)
     * Returns a tuple of [directory, filename]
     */
    public static getDirAndFilenameFromURI(uri: string): [string, string] {
        let directory = "";
        let filename = "";
        // const regexMatch = this.uri.match(/(.*\/)([^\/]*)$/);
        const regexMatch = uri.match(/(.*\/)?([^\/]*)$/);
        if (regexMatch !== null) {
            // files on root directoy will lead to first match to be undefined
            directory = regexMatch[1] || "";
            filename = regexMatch[2];
        }
        return [directory, filename];
    }

    /**
     * [string, string] -> string
     * Returns the write out path for a given (dir, filename) tuple
     */
    public static getWriteOutPath(dirAndFilename: [string, string]): string {
        const writeOutPath = Page.writeOutDir + `/` + dirAndFilename[0] + dirAndFilename[1];
        return writeOutPath;
    }

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

    public async fetch(): Promise<string> {

        /**
         * Parses and validates --host from argsv; default to prerpod
         */
        const getHosts = (): string[] => {
            const isValidHost = (host: string): boolean => {
                if (host.match(/https?:\/\/.*/i)) {
                    return true;
                } else {
                    return false;
                }
            };

            const args = yargs.argv;
            if (args.hosts != null && Array.isArray(args.hosts)) {
                const areValid = args.hosts.reduce((carry, host) => {
                    if (!isValidHost(host)) {
                        console.log(`Invalid host provided: ${args.hosts}`);
                    }
                    return carry && isValidHost(host);
                }, true);
                if (areValid) {
                    return args.hosts;
                } else {
                    return ["https://hootsuite.com"];
                }
            } else {
                console.log("args.hosts is either null or not an array");
                return ["https://hootsuite.com"];
            }
        };

        const fetches: Array<Promise<string>> = getHosts().map((host) => {
            return this.attemptHost(host);
        });
        const result = await Promise.race(fetches);

        return result;
    }

    public async writeToDB(): Promise<boolean> {

        return new Promise<boolean>((resolve, reject) => {
            const dirAndFilename = Document.getDirAndFilenameFromURI(this.uri);
            const writeOutPath = Document.getWriteOutPath(dirAndFilename);

            // recursively make directories to match url structure and write out file to index.html
            mkdirp(writeOutPath, (err) => {
                if (err) {
                    console.error(err);
                    reject(false);
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

    private async attemptHost(host: string, attempt: number = 1, maxAttempts: number = 10): Promise<string> {
        const url = encodeURI(`${host}/${this.uri}`);
        console.log(`[GET]: ${url}`);

        const promise: Promise<string> = new Promise((resolve, reject) => {
            fetch(url).then((response) => {
                console.log(`[${response.status}]: ${url}`);

                // recursively try again in event of not found or error
                if (response.status >= 400 && attempt <= maxAttempts) {
                    // failed but still allowed to retry
                    resolve(this.attemptHost(host, attempt + 1));
                } else if (response.status >= 400 && attempt > maxAttempts) {
                    // max attempts reached; die
                    console.error(`[DIE]: ${url}`);
                    response.text().then((err) => {
                        reject(err);
                    });
                } else {
                    // good response
                    response.text().then((content) => {
                        resolve(content);
                    });
                }
            }).catch((err) => {
                console.error(`Failed to fetch ${url}`);
                console.error(err);
                reject(err);
            });
        });

        return promise;
    }
}

export abstract class DOMDocument extends Document { }

export abstract class JSONDocument extends Document { }
