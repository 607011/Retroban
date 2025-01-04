#!/bin/sh

source .env

DIST=dist

mkdir -p ${DIST}
mkdir -p ${DIST}/puzzles/xsb
echo Copying files ...
rsync -rav puzzles/xsb ${DIST}/puzzles
cp -r index.html game.js images ${DIST}
echo Minifying ...
cd ${DIST}
minify index.html -o index.html
minify game.js -o game.js
echo Optimizing images ...
cd images
optipng -quiet -o7 *.png
cd ..
echo Syncing to ${DST} ...
rsync -Rrav . ${DST}
