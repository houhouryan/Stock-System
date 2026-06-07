# my learning
# 城市漫遊 - 生產力地圖探索器 (City Wanderer Map)

本專案為「全球資訊網路程式設計」期中專案，旨在透過地理空間資訊整合與自定義演算法，為學生與遠端工作者尋找最佳生產力空間。

## 🛠️ 技術架構與開發工具

### 1. 核心前端技術
* **React 18 & JSX**：採用組件化架構設計，並透過 Hook 進行動態狀態管理，實現流暢的 UI 交互。
* **Bootstrap 5 & Lucide-react**：運用響應式網格布局與語意化圖示，強化介面視覺識別度與設備適應性。

### 2. 關鍵演算法與資料管理
* **生產力加權評分引擎**：自行實作量化演算邏輯，根據環境設施自動評分：
  $$ProductivityScore = (Power \times 0.4) + (WiFi \times 0.3) + (Quiet \times 0.3)$$
* **Leaflet.js & OpenStreetMap**：整合開源地圖庫，實作互動式標記定位、縮放與動態 Popup 資訊呈現。
* **Web Storage API (LocalStorage)**：實作前端資料持久化，模擬社群即時回報功能，確保使用者狀態不遺失。

### 3. 開發環境與系統建模
* **Vite**：現代化前端建置工具，提供極速的熱更新（HMR）開發體驗。
* **Visual Studio Code (VS Code)**：作為核心整合開發環境，進行程式碼開發與管理。
* **PlantUML / draw.io**：用於繪製使用者案例圖與活動圖，確保系統設計具備嚴謹的架構分析。
