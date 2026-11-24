# アルファマックス（Alpha Max）

宇宙を舞台にしたターン制RPG。辺境のコロニーで修理屋をしているメカニック「レン」が、
がらくたの山で拾った伝説の機体「アルファ」を直し、宇宙生物に乗っ取られたマシンが暴れる荒野へ旅立つ。

- ブラウザで動く（スマホ横向き優先・PCはキーボードでも遊べる）
- マップは2Dタイル、キャラクター・マシン・敵は Three.js の3D（ローポリ）
- 音楽と効果音は WebAudio で作る電子音（同時発音16音まで）＋サウンドフォントの楽器

仕様は [CLAUDE.md](CLAUDE.md) にまとめています。

## 遊び方

| 操作 | スマホ | PC |
| --- | --- | --- |
| 移動 | 画面の左側を指でなぞる（指を置いた所にスティックが出る） | 矢印キー / WASD |
| 調べる・話す・乗る | 右下の丸ボタン、または相手をタップ | Enter / Space / Z |
| メニュー | 右上のボタン | Esc / X / M |
| ロボットに乗る・降りる | 近くでロボットをタップ（乗っている時は自分のロボットをタップ） | 近くで Enter |

- 町の中は生身で歩きます。荒野に出るときはガレージで「乗り込んで出発」
- セーブは宿屋・ガレージ・自分の修理屋で（手動3枠）。オートセーブもあります
- 全滅すると最後にセーブした町に戻され、所持ギアが半分になります

### v0.1（土台版）で遊べる範囲
- 町「ラストヘイヴン」：宿屋・武器屋・パーツ屋・道具屋・ガレージ・ハンターオフィス・酒場・レンの修理屋
- フィールド「ガラン荒野」：ザコ敵6種＋レア敵2種、賞金首「ラストドリラー」「スカイレイス」、隠しマシン
- ダンジョン「廃工場」：ザコ敵4種、最奥に賞金首「グラインドタイタン」（倒すと第1章クリア）
- 仲間：レン（メカニック）、ガルド（ソルジャー／酒場）、シオン（パイロット／条件あり）

## 動かし方（ローカル）

ビルドは不要です。ES Modules を使うので、ファイルを直接開くのではなくWebサーバー経由で開きます。

```sh
python3 -m http.server 8080
# または
npx serve .
```

ブラウザで http://localhost:8080/ を開く。URL に `?skip` を付けるとオープニングを飛ばします。

### 3Dモデル・サウンドの作り直し

```sh
npm install          # three（モデル書き出し用）
npm run models       # js/models/builders.js → models/*.glb
npm run soundfont    # サウンドフォントから楽器サンプルを取得 → assets/soundfont/
```

## GitHub Pages で公開する

1. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする
2. `main` ブランチに push すると `.github/workflows/pages.yml` が動いて公開される

（Source を「Deploy from a branch」にして `main` の `/ (root)` を選んでも、そのまま動きます）

## フォルダ構成

```
index.html / css/ / js/        ゲーム本体
js/data/                       数値の表（武器40種・パーツ・敵・マップなど）
models/                        3Dモデル（GLB）
assets/soundfont/              楽器サンプル（mp3）
tools/                         モデル書き出し・サウンドフォント取得のスクリプト
```

## ライセンス・クレジット

### サウンドフォント（楽器の音）
- **FluidR3_GM** — Frank Wen 作のGMサウンドフォント
  - 使用したのは [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) が mp3 に書き出したもの（ピアノ・ストリングス・ブラス・エレキベース・オーバードライブギター・パッド・ハープ）から、一部の音程だけを切り出したファイル
  - ライセンス：**Creative Commons Attribution 3.0（CC BY 3.0）** — 商用利用・再配布OK（クレジット表記が必要）
  - https://creativecommons.org/licenses/by/3.0/
  - ドラム・シンセ音・効果音はすべて WebAudio でその場で合成しています

### ライブラリ
- **three.js**（r170）— MIT License（`js/lib/THREE_LICENSE.txt`）

### フォント
- **DotGothic16**（Google Fonts）— SIL Open Font License 1.1

### その他
- 3Dモデル・マップ・曲・キャラクター・ストーリーはこのプロジェクトのオリジナルです
