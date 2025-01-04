#!/bin/sh

source .env

DIST=dist

mkdir -p ${DIST}
echo Copying files ...
rsync -Rrav puzzles/xsb ${DIST}
cp -r index.html js images ${DIST}
echo Minifying ...
minify ${DIST}/index.html -o ${DIST}/index.html
minify ${DIST}/js/game.js -o ${DIST}/js/game.js
echo Optimizing images ...
optipng -quiet -o7 ${DIST}/images/*.png
echo Syncing to ${DST} ...
cd ${DIST}
rsync -Rrav . ${DST}
