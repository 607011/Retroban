#!/usr/bin/env node

const fs = require('node:fs');

/*
const axios = require('axios');
async function downloadFrom(url) {
    try {
        const response = await axios.get(url);
        return await response.data;
    } catch (error) {
        console.error(`Error downloading ${url}:`, error);
        throw error;
    }
}

async function download() {
    const baseUrl = "https://ksokoban.online/levels/bunch3_";
    for (let i = 0; i < 48; i++) {
        console.info(`Processing ${baseUrl}${i}.js ...`);
        const url = `${baseUrl}${i}.js`;
        try {
            const jsCode = await download(url);
            fs.writeFileSync(`bunch-${i}.js`, jsCode);
        } catch (error) {
            console.error(`Failed to process ${url}:`, error);
        }
    }
}
*/

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