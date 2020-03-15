/*
 * Copyright (C) 2020 Ryc O'Chet <rycochet@rycochet.com>.
 *
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 */

import { copySubtitles, deleteEmpty, dryRun, interval, paths, verbose, watch } from "./args";
import { compare } from "./compare";
import { PlexVersions, rxPath } from "./const";
import { log } from "./log";
import chalk from "chalk";
import chokidar from "chokidar";
import { remove } from "diacritics";
import glob from "fast-glob";
import { copy, pathExists, rename, rmdir, unlink } from "fs-extra";
import { join, parse } from "path";
import pluralize from "pluralize";
import uniqid from "uniqid";

/**
 * Find the true show name for a Plex Versions show.
 */
function findShow(shows: string[], show: string) {
    const rxShow = new RegExp("^" + remove(show)
        .trim()
        .replace(/['_]/i, ".?")
        .replace(/\s/i, "_?[ \-]")
        .replace(/\(/i, "\\(")
        .replace(/\)/i, "")
        + (show.indexOf("(") < 0 ? " \\(" : ""), "i");

    return shows.find((val) => rxShow.test(remove(val)));
}

/**
 * Find the specific episode relative path.
 */
function findEpisode(episodes: string[], episode: string) {
    const rxEpisode = new RegExp("[\\/\\^]" + episode.replace(".mp4", "[ \\.\\-]"), "i");

    return episodes.find((val) => rxEpisode.test(val));
}

/**
 * Capitalise the first character of a line.
 */
function ucFirst(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

let running: boolean = false;
let timeout: NodeJS.Timeout;

async function run() {
    if (running) {
        return;
    }
    try {
        running = true;

        let copied = 0;
        let deleted = 0;
        let errors = 0;
        let skipped = 0;

        for (const path of paths) {
            log(`Searching "${path}"...\n`);

            const shows = (await glob("*", { cwd: path, dot: true, ignore: [PlexVersions], onlyDirectories: true })).sort();
            const episodes: { [show: string]: string[] } = {};
            const transcoded = (await glob("*/*/*.mp4", { absolute: true, cwd: join(path, PlexVersions), dot: true, ignore: [PlexVersions], onlyFiles: true })).sort();

            for (const episodePath of transcoded) {
                const [, show, episode] = rxPath.exec(episodePath)!;
                const realShow = findShow(shows, show);

                log(`${chalk.cyan("Checking")} "${show}/${episode}"...`);

                if (!realShow) {
                    log(`${chalk.red("Error finding")} "${show}"\n`);
                } else {
                    if (!episodes[realShow]) {
                        // Cache episode scan.
                        episodes[realShow] = await glob(["!**/*.nfo", "!**/*.srt", "!**/*.jpg", "**/s[[:digit:]]*.*"], { cwd: join(path, realShow), ignore: [PlexVersions], onlyFiles: true });
                    }
                    const realEpisode = findEpisode(episodes[realShow], episode);

                    if (!realEpisode) {
                        log(`${chalk.red("Error finding")} "${realShow}/${episode}"\n`);
                        errors++;
                    } else {
                        const suffix = realEpisode.endsWith("mp4") ? "m4v" : "mp4";
                        const realPath = join(path, realShow, realEpisode);

                        if (await compare(episodePath, realPath)) {
                            // Delete transcoded because it's already there.
                            try {
                                if (!dryRun) {
                                    await unlink(episodePath);
                                }
                                log(`${chalk.cyan("Skipped")} "${realShow}/${episode}"\n`, !verbose);
                                skipped++;
                            } catch (e) {
                                log(`${chalk.red("Error skipping")} "${realShow}/${episode}"\n`);
                                errors++;
                            }
                        } else {
                            // Copy (not move) as a temp file, rename when finished, then delete old file.
                            const tmpPath = realPath.replace(/\.[^\.]+$/, `.${uniqid()}.tmp`);

                            try {
                                log(`${chalk.cyan("Copying")}...`);
                                if (!dryRun) {
                                    await copy(episodePath, tmpPath, { preserveTimestamps: true });
                                    await unlink(realPath);
                                    await rename(tmpPath, realPath.replace(/\.[^\.]+$/, `.${suffix}`));

                                }
                                log(`${chalk.green("Copied")} "${realShow}/${episode}"\n`, !verbose);

                                const { base, dir } = parse(episodePath);
                                const subtitles = await glob(base.replace(".mp4", ".*.srt"), { absolute: true, cwd: dir, onlyFiles: true });

                                for (const subtitle of subtitles) {
                                    const lang = (/\.((?!forced\.)?[a-z]{,3})\.srt$/i.exec(subtitle) || ["", "eng"])[1];

                                    if (copySubtitles || lang.indexOf("forced") >= 0) {
                                        const subtitleFile = realPath.replace(/\.[^\.]+$/, `.${lang}.srt`);
                                        const subtitleName = episode.replace(/\.[^\.]+$/, `.${lang}.srt`);

                                        try {
                                            if (await pathExists(subtitleFile)) {
                                                if (!dryRun) {
                                                    await unlink(subtitle);
                                                }
                                                log(`${chalk.cyan("Skipped")} "${realShow}/${subtitleName}" (subtitle)\n`, !verbose);
                                                skipped++;
                                            } else {
                                                if (!dryRun) {
                                                    await copy(subtitle, subtitleFile, { preserveTimestamps: true });
                                                    await unlink(subtitle);
                                                }
                                                log(`${chalk.green("Copied")} "${realShow}/${subtitleName}" (subtitle)\n`, !verbose);
                                                copied++;
                                            }
                                        } catch {
                                            log(`${chalk.red("Error copying")} "${realShow}/${subtitleName}" (subtitle)\n`);
                                            errors++;
                                        }
                                    }
                                }

                                copied++;
                            } catch {
                                await unlink(tmpPath);
                                log(`${chalk.red("Error copying")} "${realShow}/${episode}"\n`);
                                errors++;
                            }
                        }
                    }
                }
            }

            if (deleteEmpty) {
                const folders = (await glob("*/*", { absolute: true, cwd: join(path, PlexVersions), dot: true, ignore: [PlexVersions], onlyDirectories: true })).sort();
                for (const folder of folders) {
                    const files = await glob("**", { cwd: folder, dot: true });

                    if (!files.length) {
                        const { base } = parse(folder);

                        try {
                            if (!dryRun) {
                                await rmdir(folder);
                            }
                            log(`${chalk.green("Deleted")} "${base}"\n`, !verbose);
                            deleted++;
                        } catch{
                            log(`${chalk.red("Error deleting")} "${base}"\n`);
                        }
                    }
                }
            }

            if (paths.length > 1) {
                log(`\n`);
            }
        }

        const output: string[] = [];

        if (dryRun) {
            output.push(`dry run`);
        }
        if (copied) {
            output.push(`copied ${copied} ${pluralize("file", copied)}`);
        }
        if (skipped) {
            output.push(`skipped ${skipped} ${pluralize("file", skipped)}`);
        }
        if (deleted) {
            output.push(`deleted ${deleted} ${pluralize("folder", deleted)}`);
        }
        if (errors) {
            output.push(`${errors} ${pluralize("error", errors)}`);
        }
        log(`\nFinished. ${ucFirst(output.join(", "))}.\n`);
    } finally {
        running = false;
    }
    if (interval) {
        clearTimeout(timeout);
        timeout = setTimeout(runInterval, interval * 60000);
    }
}

async function runInterval() {
    if (!running) {
        log(`\nRunning automatically every ${interval} ${pluralize("minute", interval)}.\n`);
        run();
    }
}

async function runWatch(path: string) {
    if (!running) {
        log(`\nDetected change in "${path}".\n`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Make sure any subtitles are also written.
        run();
    }
}

export async function main() {
    if (watch) {
        const watcher = chokidar
            .watch(paths.map((path) => join(path, PlexVersions)), {
                awaitWriteFinish: true,
                ignored: /\.inProgress/i
            });

        watcher.on("ready", () => watcher.on("add", runWatch));
    }
    run();
}
