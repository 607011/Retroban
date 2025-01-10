#!/bin/sh

source .env

DIST=dist

mkdir -p sounds
mkdir -p ${DIST}/sounds
echo Copying files ...
rsync -Rrav puzzles/xsb-concat ${DIST}
cp puzzles/list.txt ${DIST}/puzzles
cp -r index.html js images manifest.json service-worker.js fonts ${DIST}
echo Minifying ...
minify ${DIST}/index.html -o ${DIST}/index.html
minify ${DIST}/js/game.js -o ${DIST}/js/game.js
echo Optimizing images ...
optipng -quiet -o7 ${DIST}/images/*.png
echo Syncing to ${DST} ...
cd ${DIST}
rsync --exclude '.DS_Store' -Rrav . ${DST}
