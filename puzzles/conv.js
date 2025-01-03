#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";

let window = {};

async function main() {
    for (let i = 0; i <= 47; ++i) {
        try {
            const jsCodeLevels = fs.readFileSync(`ksokoban/levels/bunch-${i}.js`, "utf8");
            eval(jsCodeLevels);
        }
        catch (err) {
            console.error(err);
        }
    }

    for (let i = 0; i <= 37; ++i) {
        try {
            const jsCodeSolutions = fs.readFileSync(`ksokoban/solutions/bunch-${i}.js`, "utf8");
            eval(jsCodeSolutions);
        }
        catch (err) {
            console.error(err);
        }
    }

    const destDir = "xsb"
    fs.mkdirSync(destDir, { recursive: true });
    let levelCount = 0;
    for (const [name, bunch] of Object.entries(window.SokobanLevels)) {
        let content = "";
        const levels = bunch.map(s => s.split("|"));
        for (let i in levels) {
            const level = levels[i];
            const levelIdx = parseInt(i) + 1;
            const solution = window.SokobanSolutions[`${name}#${levelIdx}`]
            content += `;${levelIdx}\n` + level.join("\n") + "\n" + `Solution: ${solution}` + "\n\n";
            ++levelCount;
        }
        try {
            fs.writeFileSync(`${path.join(destDir, name.replace(/\s+/g, ""))}.xsb`, content);
        }
        catch (err) {
            console.error(err);
        }
    }
    console.info(`${levelCount} levels written.`);
}

main().catch(error => {
    console.error('An error occurred:', error);
});