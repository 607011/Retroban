#!/bin/sh

source .env
rsync -Rrav index.html game.js images/* puzzles/*.xsb ${DST}
