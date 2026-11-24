#!/bin/sh
# index.html で読み込んでいる JS と CSS に ?v=日付時刻（日本時間）のバージョン番号を付ける／新しくする
# 使い方：sh tools/bump-version.sh  （push する前に毎回実行する）
cd "$(dirname "$0")/.." || exit 1
V=$(TZ=Asia/Tokyo date +%Y%m%d-%H%M)
sed -i -E "s#(src=\"js/main\.js)(\?v=[^\"]*)?\"#\1?v=$V\"#; s#(href=\"css/style\.css)(\?v=[^\"]*)?\"#\1?v=$V\"#" index.html
echo "バージョン番号を $V にしました"
grep -n "main.js\|style.css" index.html
