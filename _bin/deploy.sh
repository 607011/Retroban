#!/bin/sh

source .env

DIST=dist

mkdir -p sounds
mkdir -p ${DIST}/sounds
echo Copying files ...
rsync -Rrav puzzles/xsb ${DIST}
cp puzzles/list.txt ${DIST}/puzzles
cp -r index.html js images manifest.json service-worker.js ${DIST}
echo Minifying ...
minify ${DIST}/index.html -o ${DIST}/index.html
minify ${DIST}/js/game.js -o ${DIST}/js/game.js
echo Optimizing images ...
optipng -quiet -o7 ${DIST}/images/*.png
echo Converting WAVs ...
for wav in "completed" "step" "push"; do
    ffmpeg -y -i _raw/${wav}.wav -vn -ar 44100 -ac 2 -b:a 96k ${DIST}/sounds/${wav}.mp3
    ffmpeg -y -i _raw/${wav}.wav -vn -ar 44100 -ac 2 -c:a libvorbis -b:a 96k ${DIST}/sounds/${wav}.ogg
done
echo Syncing to ${DST} ...
cd ${DIST}
rsync -Rrav . ${DST}
