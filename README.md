# Woofdoku 狗狗邏輯棋盤

狗狗主題的 RWD 邏輯解謎遊戲。觀察顏色色塊，幫每一隻卡通狗狗找到位置；支援手機觸控、滑動排除和免費無限提示。

[![Test and deploy](https://github.com/aiwlulu/woofdoku/actions/workflows/pages.yml/badge.svg)](https://github.com/aiwlulu/woofdoku/actions/workflows/pages.yml)

**GitHub Pages 遊玩網址：** <https://aiwlulu.github.io/woofdoku/>，首次成功部署後可用。

<img src="dist/assets/dog-cartoon.png" alt="Woofdoku 的棕色垂耳卡通狗狗" width="160">

## 玩法

每一行、每一列、每個顏色色塊都必須剛好有一隻狗狗。狗狗不能相鄰，斜角也算相鄰。

| 操作 | 效果 |
| --- | --- |
| 點一下格子 | 立即放叉叉，再點一次取消；不驗證對錯 |
| 按住滑動 | 連續放叉叉，每次滑動可一起復原 |
| 同一格點兩下 | 放狗狗，驗證是否為正確答案 |
| 免費提示 | 先提醒錯誤叉叉，再說明可排除的位置；排除完後才提示狗狗 |
| 復原 | 撤回標記或正確狗狗操作；不回復錯誤次數 |

每關最多錯三次。第三次放錯狗狗後整局結束，只能重新開始該關；重新整理也會保留失敗狀態。沒有廣告、付費提示或復活功能。

提示次數不限。彈出視窗會顯示原因與閃動目標，按確認才套用；也可以只看提示，再自己操作。

## 功能

- 60 個唯一解關卡，每關色塊都連通，最多一個只佔一格的色塊。
- 第 1 至 15 關為 5 × 5，16 至 30 關為 6 × 6，31 至 45 關為 7 × 7，46 至 60 關為 8 × 8。
- 手機主畫面依可視高度調整棋盤，關卡、說明、設定與重玩集中在選單。
- 瀏覽器自動儲存進度、設定、完成紀錄與最佳時間。
- 色塊編號、鍵盤操作與減少動態效果支援。
- 可加入手機主畫面。首次載入需要網路，目前沒有離線快取。
- 純靜態網站，無後端、帳號、分析追蹤或付費 API。

電腦可使用方向鍵移動焦點，空白鍵、Enter 或 X 鍵標叉叉，D 鍵放狗狗。

## 本機執行

需要 Python 3；執行測試另需 Node.js 22 或更新版本。沒有 npm 套件相依，也不需要建置。

```sh
git clone https://github.com/aiwlulu/woofdoku.git
cd woofdoku
python3 -m http.server 8000 --directory dist
```

開啟 <http://localhost:8000>。請使用 HTTP 伺服器，遊戲的 ES modules 與關卡載入需要正常的網址來源。

## 測試

```sh
npm test
```

測試涵蓋所有關卡的唯一解、色塊連通與單格數量限制，以及三次失敗鎖定、存檔驗證、即時單擊、雙擊回復叉叉後驗證、滑動、復原紀錄與提示順序。這些是邏輯測試，介面仍需在瀏覽器檢查。

## GitHub Pages 部署

本 repo 使用 GitHub Actions 測試後發布 `dist/`。GitHub Free 的公開 repo 可使用 GitHub Pages，無須綁定信用卡或購買網域。

1. 在 repo 的 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
2. 推送至 `main`，或到 **Actions → Test and deploy → Run workflow** 手動執行。
3. 等待 `test` 與 `deploy` 成功，從部署環境或 Pages 設定取得遊玩網址。

Pull request 只會執行測試。推送 `main` 或手動執行才會部署，測試失敗會阻止部署。網址與資源路徑皆使用相對路徑，支援 `/woofdoku/` 子目錄。

如果第一次部署在 `configure-pages` 失敗，請先確認 Source 已選 GitHub Actions，再重新執行 workflow。詳細步驟見 [GitHub 官方文件](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `dist/index.html`、`dist/styles.css` | 遊戲介面、RWD 與動態效果 |
| `dist/app.js` | 畫面、觸控事件、選單與存檔 |
| `dist/engine.js` | 遊戲規則、狗狗驗證與存檔檢查 |
| `dist/gestures.js` | 即時單擊、雙擊與滑動處理 |
| `dist/hints.js` | 帶理由的排除提示與約束搜尋 |
| `dist/levels.json` | 60 關固定棋盤與答案 |
| `dist/assets/dog-cartoon.png` | 為本專案生成的卡通狗狗素材 |
| `dist/manifest.webmanifest` | 加入手機主畫面設定 |
| `generate_levels.py` | 生成與檢查關卡 |
| `tests/` | Node.js 原生測試，無外部測試套件 |
| `.github/workflows/pages.yml` | 測試與 GitHub Pages 部署 |

## 關卡維護

```sh
python3 generate_levels.py
npm test
```

生成器從合法狗狗位置向外生長連通色塊，搜尋解的數量，只收錄唯一解且單格色塊不超過一個的棋盤。已符合條件的關卡會保留。

若手動修改既有棋盤，請提高該關 `revision`，避免套用不相容的舊進度。遊戲會保留未變更關卡的紀錄，變更過的關卡會重新開始。

## 進度與隱私

進度使用目前瀏覽器的 `localStorage`，不會跨裝置或同步到伺服器。清除網站資料會刪除進度。GitHub Pages 與原本的 Sites 網址屬於不同網站來源，進度各自儲存。

遊戲沒有收集分析資料。介面使用 Google Fonts，無法連線時回退至系統字型。公開 repo 包含關卡答案，適合個人休閒解謎。

## 貢獻與更新

回報問題、開發與驗收方式見 [CONTRIBUTING.md](CONTRIBUTING.md)，版本摘要見 [CHANGELOG.md](CHANGELOG.md)。本 repo 尚未指定開源授權；公開可讀不代表授權重用或散布。
