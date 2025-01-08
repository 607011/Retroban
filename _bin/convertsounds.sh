#!/bin/bash

mkdir -p sounds
for wav in "completed" "step" "push"; do
    echo Processing ${wav} ...
    ffmpeg -y -hide_banner -loglevel error -i _raw/${wav}.wav -vn -ar 44100 -ac 1 -b:a 96k sounds/${wav}.mp3
done
