// src/components/Sidebar.jsx
import React from 'react';
import { Battery, Wifi, Navigation, Search, Heart } from 'lucide-react';

function Sidebar({
  userLoc, isLocating, handleLocateMe,
  searchQuery, setSearchQuery,
  filter, setFilter,
  filteredShops,
  getValidReport, calculateScore,
  favorites, toggleFavorite,
  setSelectedShop, mapRef,
  checkIsClosed // 🌟 新增：接收判斷是否打烊的函式
}) {
  return (
    <div className="col-3 bg-light p-3 overflow-auto border-end shadow-sm">
      <button className={`btn w-100 mb-4 d-flex align-items-center justify-content-center ${userLoc ? 'btn-dark' : 'btn-outline-dark'}`} onClick={handleLocateMe} disabled={isLocating}>
        <Navigation size={18} className="me-2" />{isLocating ? '定位中...' : (userLoc ? '已定位您的位置' : '定位我的位置')}
      </button>

      <div className="mb-3">
        <div className="input-group">
          <span className="input-group-text bg-white"><Search size={16} /></span>
          <input type="text" className="form-control" placeholder="搜尋咖啡廳名稱..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <h5 className="mb-2">篩選器</h5>
      <div className="d-flex flex-wrap gap-2 mb-4">
        <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('all')}>全部</button>
        <button className={`btn btn-sm ${filter === 'power' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('power')}><Battery size={16} /> 插座</button>
        <button className={`btn btn-sm ${filter === 'wifi' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('wifi')}><Wifi size={16} /> WiFi</button>
        <button className={`btn btn-sm ${filter === 'favorites' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => setFilter('favorites')}>
          <Heart size={14} fill={filter === 'favorites' ? 'currentColor' : 'none'} className="me-1"/> 收藏
        </button>
      </div>

      <div className="list-group">
        {filteredShops.map(shop => {
          const validReport = getValidReport(shop.id);
          const isFav = favorites.includes(shop.id);
          const isClosed = checkIsClosed(shop); // 🌟 判斷這家店目前是否打烊
          
          return (
            <button key={shop.id} className="list-group-item list-group-item-action p-3" onClick={() => { setSelectedShop(shop); if (mapRef.current) mapRef.current.flyTo([shop.lat, shop.lng], 16); }}>
              <div className="d-flex justify-content-between align-items-start">
                <h6 className="mb-1 fw-bold text-truncate" style={{ maxWidth: '70%' }}>{shop.name}</h6>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-success rounded-pill">{calculateScore(shop)}</span>
                  <Heart 
                    size={20} color={isFav ? "#dc3545" : "#adb5bd"} fill={isFav ? "#dc3545" : "none"} 
                    onClick={(e) => toggleFavorite(e, shop.id)}
                  />
                </div>
              </div>
              
              {/* 🌟 狀態標籤終極邏輯：打烊優先 > 實時回報 > 未知 */}
              {isClosed ? (
                <span className="badge bg-secondary mt-1">已打烊</span>
              ) : validReport ? (
                <span className={`badge ${validReport.status === 'full' ? 'bg-danger' : 'bg-success'} mt-1`}>
                  {validReport.status === 'full' ? '客滿' : '有位'}
                </span>
              ) : (
                <span className="badge bg-secondary mt-1">未知狀態</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Sidebar;