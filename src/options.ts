/*
 * Copyright (C) 2020 Ryc O'Chet <rycochet@rycochet.com>.
 *
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 */

import { Options } from "yargs";

/**
 * Parsed options.
 */
export interface IOptions {
    "copy-subtitles": boolean;
    "delete-empty": boolean;
    "dry-run": boolean;
    "interval": number;
    "verbose": boolean;
    "watch": boolean;
}

/**
 * Command line usage.
 */
export const Usage = `Usage: $0 [OPTION]... PATHS...
Copy all Plex Optimised Versions to the correct directories, replacing originals.
Supply one or more source PATHS to check. If these are glob patterns then they
will be expanded (and dot prefixed folders ignored).`;

/**
 * Default options for yargs.
 */
export const defaultOptions: { [key in keyof IOptions]: Options } = {
    "copy-subtitles": {
        default: true,
        describe: "also copy subtitles (forced will always be copied)",
        type: "boolean",
    },
    "delete-empty": {
        default: false,
        describe: "delete empty folders",
        type: "boolean",
    },
    "dry-run": {
        default: false,
        describe: "do everything except actually change the filesystem",
        type: "boolean",
    },
    "interval": {
        default: 0,
        describe: "run every X minutes",
        type: "number",
    },
    "verbose": {
        default: true,
        describe: "show details on all operations",
        type: "boolean",
    },
    "watch": {
        default: false,
        describe: "watch for changes and automatically run",
        type: "boolean",
    },
};
