/*
 * Copyright (C) 2020 Ryc O'Chet <rycochet@rycochet.com>.
 *
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 */

import { dryRun } from "./args";
import chalk from "chalk";

const DryRun = dryRun ? chalk.green("Dry-run: ") : "";

export function log(text: string, hide?: boolean): void {
    const { stdout } = process;
    const { isTTY } = stdout;

    if (text.endsWith("\n")) {
        if (isTTY) {
            stdout.clearLine(0);
            stdout.cursorTo(0);
            if (hide) {
                text = text.replace(/\n$/, "");
            }
        }
    } else if (!isTTY) {
        text = text + "\n";
    }
    stdout.write(DryRun + text);
}
