#!/bin/bash
# converte os B-rolls (iPhone 4K, girados) para 1080x1920 30fps h264 em public/reforma/
cd "$(dirname "$0")/../.."
for f in IMG_2890 IMG_2891 IMG_2892 IMG_2893 IMG_2896 IMG_2699 IMG_2727 copy_DDDA; do
  src=$(ls originais/04-reforma/$f.* | head -1)
  ffmpeg -v error -y -i "$src" -an -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p" -c:v libx264 -crf 18 -preset veryfast public/reforma/$f.mp4 && echo ok $f
done
