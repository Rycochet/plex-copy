/*
 * Copyright (C) 2020 Ryc O'Chet <rycochet@rycochet.com>.
 *
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 */

import { log } from "./log";
import chalk from "chalk";
import { close, open, read, stat } from "fs-extra";

export async function compare(file1: string, file2: string) {
    const length = 8192;

    const { size: size1 } = await stat(file1);
    const { size: size2 } = await stat(file2);

    if (size1 !== size2) {
        return false;
    }

    const tenth = Math.floor((size1 - length) / 10);
    const f1 = await open(file1, "r");
    const f2 = await open(file2, "r");
    try {
        const b1 = Buffer.alloc(length);
        const b2 = Buffer.alloc(length);

        for (let i = 0; i <= 10; i++) {
            const position = tenth * i;
            await read(f1, b1, 0, length, position);
            await read(f2, b2, 0, length, position);

            if (!b1.equals(b2)) {
                return false;
            }
        }
    } catch (e) {
        log(`${chalk.red("Error")} "${file1}": ${e}\n`);

        return false;
    } finally {
        await close(f1);
        await close(f2);
    }

    return true;
};
