# 城市漫遊 - 生產力地圖探索器 (City Wanderer Map)

本專案為「全球資訊網路程式設計」期中專案，旨在透過地理空間資訊整合與自定義演算法，為學生與遠端工作者尋找最佳生產力空間。

## 🛠️ 技術架構與開發工具

### 1. 核心前端技術
* **React 18 & JSX**：採用組件化架構設計，並透過 Hook 進行動態狀態管理，實現流暢的 UI 交互。
* **Bootstrap 5 & Lucide-react**：運用響應式網格布局與語意化圖示，強化介面視覺識別度與設備適應性。

### 2. 關鍵演算法與資料管理
* **生產力加權評分引擎**：自行實作量化演算邏輯：
  $$ProductivityScore = (Power \times 0.4) + (WiFi \times 0.3) + (Quiet \times 0.3)$$
* **Leaflet.js & OpenStreetMap**：整合開源地圖圖資，實作互動式標記、縮放與動態 Popup 呈現。
* **Web Storage API (LocalStorage)**：實作前端資料持久化，模擬社群即時回報功能，確保使用者狀態不遺失。

### 3. 開發環境
* **Vite**：現代化前端建置工具，提供高效的開發與打包體驗。
* **Visual Studio Code**：核心開發與程式碼規範管理。
* **PlantUML / draw.io**：系統架構分析與 UML 建模。

## 🚀 如何在本地執行
1. 下載本資料夾內容
2. 執行 `npm install --legacy-peer-deps` 安裝依賴
3. 執行 `npm run dev` 啟動開發伺服器