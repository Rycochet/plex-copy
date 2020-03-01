/*
 * Copyright (C) 2020 Ryc O'Chet <rycochet@rycochet.com>.
 *
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 */

import { PlexVersions } from "./const";
import { defaultOptions, IOptions, Usage } from "./options";
import glob from "fast-glob";
import yargs from "yargs";

export const {
    _: rootPaths,
    "copy-subtitles": copySubtitles,
    "delete-empty": deleteEmpty,
    "dry-run": dryRun,
    interval,
    verbose,
    watch,
} = yargs
    .env("PLEX_COPY")
    .options(defaultOptions)
    .usage(Usage)
    .parserConfiguration({
        "camel-case-expansion": false,
        "strip-aliased": true,
    })
    .wrap(Math.min(100, yargs.terminalWidth()))
    .help()
    .version()
    .argv as unknown as IOptions & { _: string[] };

export const paths: string[] = [];

for (const path of rootPaths) {
    if (path.indexOf("*") > 0) {
        paths.push(...glob.sync(path, { ignore: [PlexVersions], onlyDirectories: true }));
    } else {
        paths.push(path);
    }
}
