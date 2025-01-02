#!/usr/bin/env node

const fs = require('node:fs');

let window = {};

async function main() {
    for (let i = 0; i < 48; i++) {
        try {
            const jsCode = fs.readFileSync(`ksokoban/bunch-${i}.js`, 'utf8');
            eval(jsCode)
        }
        catch (err) {
            console.error(err);
        }
    }

    for (const [name, bunch] of Object.entries(window.SokobanLevels)) {
        let content = "";
        for (const level of bunch.map(s => s.split("|"))) {
            content += level.join("\n") + "\n\n";
        }
        try {
            fs.writeFileSync(`${name.replace(/\s+/g, "")}.xsb`, content);
        }
        catch (err) {
            console.error(err);
        }
    }
}

main().catch(error => {
    console.error('An error occurred:', error);
});