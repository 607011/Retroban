#!/usr/bin/env node

const fs = require('node:fs');
const axios = require('axios');

import * as fs from "node:fs";
import * as ax from "axios";

async function downloadFrom(url) {
    try {
        const response = await ax.get(url);
        return await response.data;
    }
    catch (error) {
        console.error(`Error downloading ${url}:`, error);
        throw error;
    }
}

async function download(baseUrl, destDir, n) {
    fs.mkdirSync(destDir, { recursive: true });
    for (let i = 0; i < n; ++i) {
        console.info(`Processing ${baseUrl}${i}.js ...`);
        const url = `${baseUrl}${i}.js`;
        try {
            const jsCode = await downloadFrom(url);
            fs.writeFileSync(`${destDir}/bunch-${i}.js`, jsCode);
        }
        catch (error) {
            console.error(`Failed to process ${url}:`, error);
        }
    }
}

async function main() {
    await download("https://ksokoban.online/levels/bunch3_", "ksokoban/levels", 48)
    await download("https://ksokoban.online/solutions/bunch10_", "ksokoban/solutions", 38)
}

main().catch(error => {
    console.error('An error occurred:', error);
});
