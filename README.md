# LanVTand0050 理財網站

這是一個以個人理財、財務獨立與退休規劃為主題的 GitHub Pages 靜態網站。

網站目前提供瀏覽器端財務試算工具，未來可擴充理財文章、主題指南與讀書心得。正式網站位於：

<https://lanvtand0050.github.io/>

## 網站內容

### FIRE 財務試算工具箱

工具箱位於：

<https://lanvtand0050.github.io/fire-calculators/>

目前包含：

- 退休達成年數試算器
- 退休資產存活率試算器
- 勞保年金試算器
- 費用率退休延後試算器
- 投資紀律檢查
- 資產配置再平衡試算器
- 貸款投資比較器
- 錯過最佳交易日成本試算器

所有試算都在使用者的瀏覽器內執行，不需要帳號、後端伺服器或資料庫。試算結果僅供情境規劃，不構成投資、借貸或保險建議。

## 目錄結構

```text
LanVTand0050.github.io/
├── index.html
├── privacy.html
├── robots.txt
├── sitemap.xml
├── README.md
└── fire-calculators/
    ├── index.html
    ├── style.css
    └── tools/
        ├── monte-carlo/
        ├── retirement-years/
        ├── loan-investment/
        ├── rebalance/
        ├── labor-insurance-annuity/
        ├── expense-delay/
        ├── timing-cost/
        └── investment-discipline/
```

未來內容可依類型加入獨立目錄：

```text
articles/       # 理財文章
book-notes/     # 讀書心得
guides/         # 主題指南
assets/         # 全站共用樣式、程式與圖片
```

## 技術架構

- 純 HTML、CSS 與 JavaScript
- GitHub Pages 靜態託管
- 工具計算皆在瀏覽器端完成
- 部分圖表透過 Chart.js 呈現
- 目前不需要 npm、打包工具、後端或資料庫

若文章數量增加，可在不改變既有工具網址的前提下導入 Jekyll，使用 Markdown、共用版型、分類與文章列表管理內容。

## 本機開發

網站沒有建置步驟，可使用任一靜態檔案伺服器預覽。請避免直接以 `file://` 開啟後就判斷所有路徑行為，因為正式環境部署在網站根目錄下。

修改工具時，應保留以下網址結構：

```text
/fire-calculators/
/fire-calculators/tools/<tool-name>/
```

## 部署

本 repository 應設定為從預設分支的根目錄發布 GitHub Pages。推送變更後，由 GitHub Pages 更新正式網站。

部署後應確認：

- 首頁與隱私權政策可正常開啟
- 工具箱及所有工具頁面回傳成功狀態
- 頁面 canonical 與正式網址一致
- `sitemap.xml` 涵蓋所有可索引頁面
- `robots.txt` 正確指向 sitemap

## 開發原則

- 保留既有公開網址與目錄路徑
- 優先使用簡單、可讀的瀏覽器原生程式碼
- 共用樣式集中管理，工具邏輯保留在各工具目錄
- 新增或修改財務公式時，明確說明假設、限制與輸入單位
- 對輸入值進行完整驗證，並測試零值、負值與極端情境
- 將財務結果定位為規劃估算，不宣稱保證報酬或官方核定結果
