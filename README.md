# LanVTand0050 理財網站

這是一個以個人理財、財務獨立與退休規劃為主題的 GitHub Pages 靜態網站。

網站目前以瀏覽器端財務試算工具為主，並使用純 HTML 發布工具使用心得與結果分析。正式網站位於：

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
- 定期定額 vs 單筆投入蒙地卡羅模擬

所有試算都在使用者的瀏覽器內執行，不需要帳號、後端伺服器或資料庫。試算結果僅供情境規劃，不構成投資、借貸或保險建議。

### 文章

文章列表位於：

<https://lanvtand0050.github.io/articles/>

文章使用純 HTML 撰寫，不需要 Jekyll 或其他建置工具。初期以財務工具的使用方式、試算結果解讀與個人心得為主。

新增文章時：

1. 複製 `articles/_template/` 資料夾。
2. 將複製的資料夾改成簡短的英文網址代稱，例如 `expense-ratio-retirement-delay`。
3. 編輯其中的 `index.html`，替換標題、摘要、canonical 網址、日期與文章內容。
4. 在 `articles/index.html` 複製註解中的文章卡片，填入文章連結與摘要。
5. 在 `sitemap.xml` 加入新文章網址。

文章公開網址會是：

```text
/articles/<article-slug>/
```

## 目錄結構

```text
LanVTand0050.github.io/
├── index.html
├── privacy.html
├── robots.txt
├── sitemap.xml
├── README.md
├── assets/
│   └── css/
│       ├── base.css
│       ├── content.css
│       └── articles.css
├── articles/
│   ├── index.html
│   └── _template/
│       └── index.html
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
        ├── lump-sum-vs-dca/
        └── investment-discipline/
```

## 技術架構

- 純 HTML、CSS 與 JavaScript
- GitHub Pages 靜態託管
- 工具計算皆在瀏覽器端完成
- 部分圖表透過 Chart.js 呈現
- 不需要 npm、打包工具、後端、資料庫或 Jekyll

文章先維持純 HTML 與手動文章列表，將網站重心保留在財務工具。只有在文章數量明顯增加、手動維護已造成負擔時，再評估內容管理工具。

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

- 首頁、文章列表與隱私權政策可正常開啟
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

