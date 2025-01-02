#!/usr/bin/env node

const fs = require('node:fs');
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

async function main() {
    const baseUrl = "https://ksokoban.online/levels/bunch3_";
    const destDir = "ksokoban"
    fs.mkdirSync(destDir, { recursive: true });
    for (let i = 0; i < 48; i++) {
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

main().catch(error => {
    console.error('An error occurred:', error);
});
