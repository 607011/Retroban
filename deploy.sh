#!/bin/sh

source .env

DIST=dist

mkdir -p ${DIST}
echo Copying files ...
rsync -Rrav puzzles/xsb ${DIST}
cp puzzles/list.txt ${DIST}/puzzles
cp -r index.html js images manifest.json service-worker.js ${DIST}
echo Minifying ...
minify ${DIST}/index.html -o ${DIST}/index.html
minify ${DIST}/js/game.js -o ${DIST}/js/game.js
echo Optimizing images ...
optipng -quiet -o7 ${DIST}/images/*.png
echo Generating favicon ...
magick -background transparent "images/retroban-256.png" -define icon:auto-resize=16,24,32,48,64,72,96,128,256 "favicon.ico"
echo Syncing to ${DST} ...
cd ${DIST}
rsync -Rrav . ${DST}
