# Codex Prompts

這份文件保存 `LanVTand0050.github.io` 理財網站可重複使用的 Codex 任務模板。

## 專案範圍

網站主要區域：

- `/index.html`：全站入口。
- `/privacy.html`：隱私權政策。
- `/sitemap.xml`：全站 sitemap。
- `/robots.txt`：搜尋引擎爬取設定。
- `/fire-calculators/`：FIRE 財務試算工具箱。
- `/fire-calculators/tools/`：各項財務工具。
- `/articles/`：未來的理財文章區。
- `/book-notes/`：未來的讀書心得區。
- `/guides/`：未來的理財主題指南區。

## 全站共通限制

除非使用者明確要求改變，否則遵守以下限制：

- 不改變既有公開網址或重新命名既有目錄。
- 保持與 GitHub Pages 相容。
- 新增可索引頁面時，同步處理 canonical、站內連結與 `sitemap.xml`。
- canonical 使用 `https://lanvtand0050.github.io/` 下的正式完整網址。
- 不加入後端、資料庫、登入系統或需要伺服器執行的功能。
- 不加入 API 或第三方服務依賴，除非使用者明確要求。
- 不在 repository 中加入密碼、API Key、個人資料或其他機密資訊。
- 不要 commit。
- 不要 push。

## 財務工具區限制

修改 `/fire-calculators/` 時，除非使用者明確要求，另外遵守：

- 使用瀏覽器原生 HTML、CSS 與 JavaScript。
- 不使用 npm、套件管理器、bundler 或 transpiler。
- 不新增工具區專用的建置流程。
- 工具計算維持在瀏覽器端執行。
- 不重新命名既有工具目錄。
- 工具頁使用 `/fire-calculators/tools/<tool-name>/` 網址結構。
- 工具邏輯放在各工具目錄的 `script.js`。
- 工具共用樣式優先放在 `/fire-calculators/style.css`。
- 新增或調整公式時，說明假設、限制、單位與計算時點。
- 驗證空值、非數字、零值、負值與合理的極端輸入。
- 財務結果必須清楚標示為情境估算，不宣稱保證報酬或官方核定。

全站未來可以在使用者明確要求時導入 Jekyll；不可因工具區維持純前端，就假設文章區永遠不能有靜態網站建置流程。

## 通用任務模板

```text
請先讀取目前的 LanVTand0050.github.io 專案與 README.md，確認任務涉及全站或 fire-calculators 工具區。

限制：
1. 不改變既有公開 URL。
2. 保持 GitHub Pages 相容。
3. 不加入後端或資料庫。
4. 新增公開頁面時檢查 canonical、站內連結與 sitemap.xml。
5. 不要 commit。
6. 不要 push。

任務：
[在這裡描述要做的修改]

完成後請回報：
1. 修改了哪些檔案
2. 主要修改內容
3. 執行了哪些測試或檢查
4. 是否影響網址、SEO 或 GitHub Pages 部署
```

## 新增財務工具

```text
請新增一個財務工具到 fire-calculators/tools/[tool-folder]/。

限制：
1. 使用純 HTML、CSS 與 JavaScript。
2. 不使用 npm、bundler、後端或資料庫。
3. 不修改或重新命名既有工具目錄。
4. 新工具使用 fire-calculators/tools/[tool-folder]/index.html 與 script.js。
5. 共用樣式優先放在 fire-calculators/style.css。
6. 將工具入口加入 fire-calculators/index.html。
7. 加入正確的 title、description、robots 與 canonical。
8. 將正式網址加入 sitemap.xml。
9. 說明公式假設、輸入單位、限制與免責聲明。
10. 測試空值、零值、負值、極端值與主要計算範例。
11. 不要 commit。
12. 不要 push。

工具需求：
[描述工具目的、輸入欄位、計算方式與輸出結果]
```

## 更新全站首頁

```text
請更新全站首頁 index.html。

限制：
1. 不改變 /fire-calculators/ 與既有內容區網址。
2. 首頁應清楚區分工具、文章、讀書心得與指南等內容入口。
3. 維持正確的 title、description、robots 與 canonical。
4. 檢查所有站內連結。
5. 不要 commit。
6. 不要 push。

首頁需求：
[描述要新增或調整的內容]
```

## 更新工具箱首頁

```text
請更新工具箱首頁 fire-calculators/index.html。

限制：
1. 維持純前端 HTML、CSS 與 JavaScript。
2. 不改變既有工具 URL。
3. 不修改既有工具計算邏輯，除非任務明確要求。
4. 維持正確的 canonical 與隱私權政策連結。
5. 不要 commit。
6. 不要 push。

工具箱首頁需求：
[描述要新增、移除或調整的內容]
```

## 更新工具共用樣式

```text
請更新 fire-calculators/style.css。

限制：
1. 維持純 CSS，不加入框架或建置流程。
2. 不改變既有 URL。
3. 不修改工具頁計算邏輯。
4. 檢查桌面與行動裝置版面。
5. 確認既有工具頁沒有明顯視覺回歸。
6. 不要 commit。
7. 不要 push。

樣式需求：
[描述視覺、排版、RWD 或元件樣式需求]
```

## 新增理財文章

```text
請在 articles/[article-slug]/ 建立一篇理財文章。

限制：
1. 使用清楚、準確且適合一般讀者的繁體中文。
2. 不捏造數據、研究或法規；時效性資訊應查證權威來源。
3. 清楚區分事實、估算、觀點與假設。
4. 加入 title、description、robots 與自我指向 canonical。
5. 將文章加入適當的站內入口與 sitemap.xml。
6. 涉及投資、稅務、保險或法規時加入適當限制說明。
7. 不要 commit。
8. 不要 push。

文章主題：
[文章主題]

目標讀者：
[目標讀者]

希望涵蓋：
[大綱、資料或觀點]
```

## 新增讀書心得

```text
請在 book-notes/[book-slug]/ 建立一篇讀書心得。

限制：
1. 以個人理解、評論與實際應用為主，不大量重製原書內容。
2. 不提供長篇原文或受版權保護內容。
3. 清楚標示書名、作者與心得主題。
4. 加入 title、description、robots 與自我指向 canonical。
5. 將頁面加入適當的站內入口與 sitemap.xml。
6. 不要 commit。
7. 不要 push。

書籍資料：
[書名、作者]

心得方向：
[重點概念、認同或質疑之處、實際應用]
```

## 部署前檢查

```text
請檢查目前專案是否適合部署到 GitHub Pages。

限制：
1. 只讀取檔案，不修改任何檔案。
2. 不要 commit。
3. 不要 push。

請檢查並回報：
1. 全站首頁與各內容區入口
2. fire-calculators 與所有工具 URL
3. 站內連結與資源相對路徑
4. canonical、robots.txt 與 sitemap.xml
5. 是否存在後端、建置或外部 CDN 依賴
6. JavaScript 語法與主要功能風險
7. GitHub Pages 部署注意事項
```

## 程式碼審查

```text
請 review 目前變更。

限制：
1. 只檢查問題，不直接修改。
2. 優先指出 bug、財務公式錯誤、部署風險、URL 破壞、SEO 問題與 GitHub Pages 相容性問題。
3. 檢查新增頁面的 canonical、站內入口與 sitemap.xml。
4. 不要 commit。
5. 不要 push。

請依嚴重程度排序 findings，並附上檔案與行號；若未發現問題，也請說明檢查範圍與剩餘風險。
```
