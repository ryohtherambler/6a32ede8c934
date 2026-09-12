# 作業ログ（WORKLOG）

このファイルには、Claudeが作業のたびに記録を追記します。
（日付／何をしたか／Pull RequestのURL／マージ状況／完成品のバージョン更新／次にやること）

Claudeへ：会話の履歴はDesktopアプリ・VS Code・PC間で引き継がれません。
次回の作業はこのログとGitの状態だけから再開されるので、「次にやること」まで必ず書いてください。

※ファイル名は、zip解凍時の文字化けを防ぐため英字（WORKLOG.md)で固定しています。日本語名に変更しないでください。

---

## 2026-09-12

**やったこと**
- GitHubにPublicリポジトリ `taiikusai-shinpanyoukou-mobile`（owner: ryohtherambler）を新規作成し、初期状態をmainにPush済み
- 作業用ブランチ `feature/excel-data-analysis` で作業
- Node.js（LTS, winget導入）+ exceljsで、Excel（審判要項）から種目データを抽出する変換スクリプトを作成
  - `scripts/build-events.mjs` → `site/data/events.json`（13種目の時刻・対象・競技方法・審判の役割・得点・コース構成など）
  - `scripts/build-assignments.mjs` → `site/data/assignments.json`（配置管理表シートの○印から、種目ごとの担当スタッフ・担当町を自動生成）
  - `site/data/roster.json`：執行部3名・4町体育部長・各町スタッフ一覧（手入力、PROJECT.md記載の通り）
  - `site/data/equipment.json`：docsに追加された「競技要項」PDFから用具リストを手入力（Excelにはない情報のため）
- PowerPoint（配置図）をCOM経由でスライド画像として書き出し。スライド3〜15が種目①〜⑬に対応することを画像を目視して確認し、`site/images/layout/01.png`〜`13.png`として保存
- サイト本体（`site/`）を実装：タイムライン表示、種目詳細画面、担当町フィルタ、配置図タップ拡大、PWA対応（マニフェスト・Service Worker・アイコン）
- Playwright（動作確認用に導入）でヘッドレスブラウザから操作し、表示崩れがないこと・担当町フィルタ・現在時刻の自動ハイライト・オフライン動作（一覧/詳細/配置図画像）を確認済み
- 上記一式をCommit済み（ブランチ内、まだPush・PR前）

**参考：ローカルテスト時の注意**
- Node.js簡易サーバーを`0.0.0.0`（全ネットワーク）で起動してしまい、Windowsファイアウォールで誤って「許可」してしまう場面があった → ルールは削除して復旧済み。次回以降、確認用サーバーは`127.0.0.1`（このPCのみ）でlistenさせること

**次にやること**
- GitHub PagesでのPublic公開に向けて、URLを推測困難にする方法を検討・実施（リポジトリ名や公開設定の調整）
- 実際にGitHub Pagesへ公開し、スマホ実機で表示確認
- 問題なければ「保存して」の手順（Commit確認→Push→PR作成→マージ方式の相談→マージ）に進む
- QRコード化は、公開URLが確定してから対応

## 2026-09-12（続き）

**やったこと**
- リポジトリ名を `taiikusai-shinpanyoukou-mobile` → `6a32ede8c934`（ランダム文字列）に変更。URLを推測困難にするため（PROJECT.md記載の方針）
- `site/robots.txt` と `<meta name="robots" content="noindex, nofollow">` を追加し、検索エンジンに拾われにくくした
- `.github/workflows/deploy-pages.yml` を追加し、GitHub Actionsで `site` フォルダをGitHub Pagesへ自動デプロイする設定にした
- GitHub Pages を有効化（ソース: GitHub Actions）
- PR #1 を作成し、Squashマージでmainに統合。作業ブランチ `feature/excel-data-analysis` は削除済み
- mainへのマージにより自動デプロイが実行され、成功を確認
- 公開URL：**https://ryohtherambler.github.io/6a32ede8c934/**
- Playwright（iPhoneのUser-Agent）で公開URLに実際にアクセスし、一覧・詳細画面が正しく表示されることを確認

**次にやること（このセクション時点）**
- QRコード化（上記の公開URLを紙の審判要項に印刷する形で使う）
- 当日ギリギリまでのExcel更新運用の最終確認（Excel修正→`node scripts/build-events.mjs`・`node scripts/build-assignments.mjs`実行→Commit・Push→自動デプロイ、の流れをもう一度リハーサルしておくと安心）
- 体育祭終了後、リポジトリを削除するかどうかは別途相談

## 2026-09-12（続き・QRコード追加）

**やったこと**
- 公開URL（https://ryohtherambler.github.io/6a32ede8c934/）のQRコードを、このPC内だけで生成（外部のQRコード作成サイトは不使用）
  - `qrcode/shinpan-youkou-qrcode.png`：印刷用のQRコード画像（誤り訂正レベル最高(H)、汚れ・折れに強い設定）
  - `scripts/generate-qrcode.mjs`：生成スクリプト。実行後、生成したQRコードを実際に読み取ってURLと一致することを自動検証している
- PR #3 をSquashマージでmainに統合。作業ブランチ `feature/qrcode` は削除済み

**次にやること（このセクション時点）**
- `qrcode/shinpan-youkou-qrcode.png` を紙の審判要項（PDF/印刷物）に貼り付けて配布
- 当日ギリギリまでのExcel更新運用の最終確認（Excel修正→`node scripts/build-events.mjs`・`node scripts/build-assignments.mjs`実行→Commit・Push→自動デプロイ、の流れをもう一度リハーサルしておくと安心）
- 体育祭終了後、リポジトリを削除するかどうかは別途相談

## 2026-09-12（続き・利用者フィードバックの反映）

**やったこと**
- 配置図が指でピンチ拡大できなかった問題を修正（viewportのmaximum-scale制限を撤廃）
- 画像の全画面表示に閉じるボタン（✕）を追加。画像自体のタップでは閉じないようにして、ピンチ操作の邪魔をしないようにした
- 「町ごとの担当フィルタ」は、ほぼ全種目が全町に関係してしまい実用性がなかったため、**担当者（個人）を選んで絞り込む方式**に変更（`site/data/roster.json`を使ってプルダウンを生成）
- 競技要項PDF由来の「用具」セクションは不要とのことで削除（`site/data/equipment.json`も削除）
- PR #5 をSquashマージでmainに統合。作業ブランチ `fix/staff-filter-and-zoom` は削除済み
- 自動デプロイ成功を確認済み

**次にやること**
- `qrcode/shinpan-youkou-qrcode.png` を紙の審判要項（PDF/印刷物）に貼り付けて配布
- 当日ギリギリまでのExcel更新運用の最終確認（Excel修正→`node scripts/build-events.mjs`・`node scripts/build-assignments.mjs`実行→Commit・Push→自動デプロイ、の流れをもう一度リハーサルしておくと安心）
- 体育祭終了後、リポジトリを削除するかどうかは別途相談

