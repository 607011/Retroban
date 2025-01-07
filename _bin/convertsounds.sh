#!/bin/bash

mkdir -p sounds
for wav in "completed" "step" "push"; do
    ffmpeg -y -i _raw/${wav}.wav -vn -ar 44100 -ac 1 -b:a 96k sounds/${wav}.mp3
    ffmpeg -y -i _raw/${wav}.wav -vn -ar 24000 -ac 1 -b:a 96k sounds/${wav}.wav
    ffmpeg -y -i sounds/${wav}.wav -vn -ac 1 -acodec libopus sounds/${wav}.webm
    ffmpeg -y -i sounds/${wav}.wav -vn -ac 1 -acodec libvorbis sounds/${wav}.ogg
done
