// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Coffee, Battery, Wifi, Volume2, Navigation, Search, Heart, MessageSquare, TrendingUp, PlusCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

import Sidebar from './components/Sidebar';
import ReviewModal from './components/ReviewModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("偵錯模式 - URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("偵錯模式 - KEY:", import.meta.env.VITE_SUPABASE_ANON_KEY);

const INITIAL_SHOPS = [
  { id: 1, name: "漫遊咖啡館", lat: 25.033, lng: 121.565, power: 5, wifi: 4, quiet: 3, type: "cafe", openTime: 9, closeTime: 19 },
  { id: 2, name: "程式設計實驗室", lat: 25.035, lng: 121.567, power: 4, wifi: 5, quiet: 5, type: "lab", openTime: 8, closeTime: 22 },
];

function MapInteraction({ onMapClick }) {
  useMapEvents({ click(e) { onMapClick(e.latlng); } });
  return null;
}

function FetchRealCafesButton({ onFetch }) {
  const map = useMap();
  const [loading, setLoading] = useState(false);

  const fetchCafes = async () => {
    setLoading(true);
    const bounds = map.getBounds();
    const query = `[out:json];node["amenity"="cafe"](${bounds.getSouthWest().lat},${bounds.getSouthWest().lng},${bounds.getNorthEast().lat},${bounds.getNorthEast().lng});out;`;
    
    try {
      const response = await fetch(`https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP 錯誤！狀態碼: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 防呆機制：如果這個區域真的沒有任何 OpenStreetMap 標記的咖啡廳
      if (!data.elements || data.elements.length === 0) {
        alert("目前這個地圖範圍內沒有找到公開的咖啡廳資料喔！");
        return;
      }

      const blacklist = ['茶的魔手', '茶湯會', '50嵐', '鮮茶道', '清心', '麻古', '可不可', '迷客夏', '得正', '五桐號', '龜記', '大苑子', '沙龍', '紅茶', '青草茶', '八曜', '水巷茶弄', '鶴茶樓', '三分春色', 'COMEBUY', '手搖'];
      const realCafes = data.elements
        .filter(el => el.tags && el.tags.name && !blacklist.some(keyword => el.tags.name.includes(keyword)))
        .map(el => ({
          id: el.id, name: el.tags.name, lat: el.lat, lng: el.lon,
          power: Math.floor(Math.random() * 3) + 3, wifi: Math.floor(Math.random() * 3) + 3, quiet: Math.floor(Math.random() * 3) + 3, type: "real_cafe",
          openTime: Math.floor(Math.random() * 3) + 7,  
          closeTime: Math.floor(Math.random() * 5) + 18 
        }));
        
      onFetch(realCafes);
    } catch (error) {
       console.error("地圖資料抓取失敗:", error); 
       alert("搜尋伺服器回應忙碌，請稍微將地圖平移或放大，再試一次！\n原因：" + error.message); 
    } finally {
       // 🌟 核心修正：不管是成功還失敗，最後一定會執行這裡，把「搜尋中...」關掉！
       setLoading(false); 
    }
  };
  return (
    <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 1000 }}>
      <button className="btn btn-primary shadow-sm d-flex align-items-center" onClick={fetchCafes} disabled={loading}>
        <Search size={18} className="me-2" />{loading ? '搜尋中...' : '搜尋此區真實咖啡廳'}
      </button>
    </div>
  );
}

function App() {
  const [shops, setShops] = useState(() => {
    const saved = localStorage.getItem('city_wanderer_shops'); return saved ? JSON.parse(saved) : INITIAL_SHOPS;
  });
  const [reports, setReports] = useState({});
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState(null);
  const [reviewingShop, setReviewingShop] = useState(null);
  
  const mapRef = useRef(null);
  const [isLocating, setIsLocating] = useState(false);
  const [draftLocation, setDraftLocation] = useState(null);
  const [newShopForm, setNewShopForm] = useState({ name: '', power: 3, wifi: 3, quiet: 3 });
  const [userLoc, setUserLoc] = useState(null);

  const [favorites, setFavorites] = useState(() => {
    const savedFavs = localStorage.getItem('city_wanderer_favs'); return savedFavs ? JSON.parse(savedFavs) : [];
  });

  useEffect(() => { localStorage.setItem('city_wanderer_shops', JSON.stringify(shops)); }, [shops]);
  useEffect(() => { localStorage.setItem('city_wanderer_favs', JSON.stringify(favorites)); }, [favorites]);

  useEffect(() => {
    const fetchInitialReports = async () => {
      const { data } = await supabase.from('cafe_reports').select('*').order('created_at', { ascending: false });
      if (data) {
        const latestReports = {};
        data.forEach(row => {
          if (!latestReports[row.shop_id]) {
            const reportTime = new Date(row.created_at);
            latestReports[row.shop_id] = { status: row.status, timeString: reportTime.toLocaleTimeString(), timestamp: reportTime.getTime() };
          }
        });
        setReports(latestReports);
      }
    };
    fetchInitialReports();

    const subscription = supabase
      .channel('public:cafe_reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cafe_reports' }, payload => {
        const newReport = payload.new;
        const reportTime = new Date(newReport.created_at);
        setReports(prev => ({
          ...prev, [newReport.shop_id]: { status: newReport.status, timeString: reportTime.toLocaleTimeString(), timestamp: reportTime.getTime() }
        }));
      }).subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  const calculateScore = (shop) => ((shop.power * 0.4) + (shop.wifi * 0.3) + (shop.quiet * 0.3)).toFixed(1);

  const createCustomIcon = (score) => {
    let bgColor = '#6c757d'; 
    if (score >= 4.5) bgColor = '#ffc107'; else if (score >= 4.0) bgColor = '#198754'; else if (score >= 3.0) bgColor = '#0dcaf0'; 
    return L.divIcon({
      html: `<div style="background-color: ${bgColor}; color: white; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4); font-weight: bold; font-size: 12px;">${score}</div>`,
      className: 'custom-score-icon', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
    });
  };

  // 🌟 1. 建立一個專屬於「使用者目前位置」的藍色發光圓點圖示
  const userLocationIcon = L.divIcon({
    html: `<div style="background-color: #0d6efd; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(13,110,253,0.8);"></div>`,
    className: 'user-location-icon', 
    iconSize: [18, 18], 
    iconAnchor: [9, 9] // 讓標記的中心點對準經緯度
  });

  const handleReport = async (e, id, status) => {
    e.stopPropagation(); 
    setReports(prev => ({ ...prev, [id]: { status, timeString: new Date().toLocaleTimeString(), timestamp: Date.now() } }));
    const { error } = await supabase.from('cafe_reports').insert([{ shop_id: id, status: status }]);
    if (error) { console.error('寫入失敗:', error); alert('回報失敗！'); }
  };

  const toggleFavorite = (e, shopId) => {
    e.stopPropagation(); 
    setFavorites(prev => prev.includes(shopId) ? prev.filter(id => id !== shopId) : [...prev, shopId]);
  };

  const getValidReport = (shopId) => {
    const report = reports[shopId];
    return (!report || !report.timestamp || Date.now() - report.timestamp > 2 * 60 * 60 * 1000) ? null : report;
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return alert('不支援定位！');
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // 更新 userLoc 狀態，這會觸發地圖重新渲染並畫出藍色小圓點
        setUserLoc([pos.coords.latitude, pos.coords.longitude]);
        if (mapRef.current) mapRef.current.flyTo([pos.coords.latitude, pos.coords.longitude], 15);
        setIsLocating(false);
      },
      () => { alert('無法取得位置！'); setIsLocating(false); }
    );
  };

  const handleStartNavigation = (shop) => { window.open(`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`, '_blank'); };

  const handleFetchRealCafes = (realCafes) => {
    const existingIds = new Set(shops.map(s => s.id));
    const newCafes = realCafes.filter(c => !existingIds.has(c.id));
    if (newCafes.length === 0) return alert("附近沒找到新咖啡廳喔！");
    setShops(prev => [...prev, ...newCafes]);
  };

  const handleAddNewShop = () => {
    if (!newShopForm.name.trim()) return alert('請輸入店名！');
    setShops([...shops, { 
      id: Date.now(), name: newShopForm.name, lat: draftLocation.lat, lng: draftLocation.lng, 
      power: Number(newShopForm.power), wifi: Number(newShopForm.wifi), quiet: Number(newShopForm.quiet), type: "user_added",
      openTime: 9, closeTime: 20
    }]);
    setDraftLocation(null); setNewShopForm({ name: '', power: 3, wifi: 3, quiet: 3 });
  };

  const checkIsClosed = (shop) => {
    const hour = new Date().getHours();
    const open = shop.openTime || 8;
    const close = shop.closeTime || 22;
    return hour < open || hour >= close;
  };

  const getPredictedFullness = (shop) => {
    if (checkIsClosed(shop)) return 0; 
    const hour = new Date().getHours();
    let baseProb = 20; 
    if (hour >= 8 && hour < 12) baseProb = 45;       
    else if (hour >= 12 && hour < 14) baseProb = 85; 
    else if (hour >= 14 && hour < 17) baseProb = 90; 
    else if (hour >= 17 && hour < 20) baseProb = 65; 
    else if (hour >= 20 && hour < 22) baseProb = 35; 

    const randomFactor = (shop.id % 20) - 10; 
    let finalProb = baseProb + randomFactor;

    if (finalProb > 95) finalProb = 95;
    if (finalProb < 5) finalProb = 5;
    return finalProb;
  };

  const filteredShops = shops.filter(shop => {
    const matchFilter = filter === 'all' || (filter === 'power' && shop.power >= 4) || (filter === 'wifi' && shop.wifi >= 4) || (filter === 'favorites' && favorites.includes(shop.id));
    const matchSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="container-fluid vh-100 p-0 d-flex flex-column">
      <nav className="navbar navbar-dark bg-dark px-3">
        <span className="navbar-brand mb-0 h1 d-flex align-items-center"><Coffee className="me-2" /> 城市漫遊 - 地圖探索器</span>
      </nav>

      <div className="d-flex flex-grow-1 overflow-hidden">
        <Sidebar 
          userLoc={userLoc} isLocating={isLocating} handleLocateMe={handleLocateMe}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} filter={filter} setFilter={setFilter}
          filteredShops={filteredShops} getValidReport={getValidReport} calculateScore={calculateScore}
          favorites={favorites} toggleFavorite={toggleFavorite} setSelectedShop={setSelectedShop} mapRef={mapRef}
          checkIsClosed={checkIsClosed}
        />

        <div className="col-9 position-relative">
          <MapContainer center={[22.796, 120.362]} zoom={13} style={{ height: '100%', width: '100%' }} ref={mapRef}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FetchRealCafesButton onFetch={handleFetchRealCafes} />
            <MapInteraction onMapClick={(latlng) => setDraftLocation(latlng)} />

            {/* 🌟 2. 只有當 userLoc (經緯度) 存在時，才會在地圖上畫出這個藍色標記 */}
            {userLoc && (
              <Marker position={userLoc} icon={userLocationIcon}>
                <Popup>
                  <div className="text-center fw-bold text-primary">📍 您目前的位置</div>
                </Popup>
              </Marker>
            )}

            {draftLocation && (
              <Marker position={[draftLocation.lat, draftLocation.lng]}>
                <Popup onClose={() => setDraftLocation(null)}>
                  <div style={{ width: '200px' }}>
                    <h6 className="fw-bold d-flex align-items-center"><PlusCircle size={16} className="me-1"/> 新增探索點</h6>
                    <input type="text" className="form-control form-control-sm mb-2" placeholder="輸入店名" value={newShopForm.name} onChange={e => setNewShopForm({...newShopForm, name: e.target.value})} />
                    <div className="mb-1"><label className="small text-muted mb-0">插座</label><input type="range" className="form-range" min="1" max="5" value={newShopForm.power} onChange={e => setNewShopForm({...newShopForm, power: e.target.value})} /></div>
                    <div className="mb-1"><label className="small text-muted mb-0">WiFi</label><input type="range" className="form-range" min="1" max="5" value={newShopForm.wifi} onChange={e => setNewShopForm({...newShopForm, wifi: e.target.value})} /></div>
                    <div className="mb-2"><label className="small text-muted mb-0">安靜</label><input type="range" className="form-range" min="1" max="5" value={newShopForm.quiet} onChange={e => setNewShopForm({...newShopForm, quiet: e.target.value})} /></div>
                    <button className="btn btn-sm btn-primary w-100" onClick={handleAddNewShop}>確認新增</button>
                  </div>
                </Popup>
              </Marker>
            )}

            {filteredShops.map(shop => {
              const score = calculateScore(shop);
              const validReport = getValidReport(shop.id);
              const isFav = favorites.includes(shop.id);
              
              const isClosed = checkIsClosed(shop);
              const predictedProb = getPredictedFullness(shop);
              
              let probColor = 'bg-success'; 
              if (isClosed) probColor = 'bg-secondary'; 
              else if (predictedProb >= 80) probColor = 'bg-danger'; 
              else if (predictedProb >= 50) probColor = 'bg-warning'; 

              return (
                <Marker key={shop.id} position={[shop.lat, shop.lng]} icon={createCustomIcon(score)}>
                  <Popup>
                    <div style={{ width: '200px' }}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <h6 className="fw-bold mb-0">{shop.name}</h6>
                        <Heart 
                          size={18} color={isFav ? "#dc3545" : "#6c757d"} fill={isFav ? "#dc3545" : "none"} 
                          style={{ cursor: 'pointer' }} onClick={(e) => toggleFavorite(e, shop.id)}
                        />
                      </div>
                      <hr className="my-2" />
                      
                      <div className="mb-2 p-2 bg-light rounded text-center">
                        {isClosed ? (
                          <><span className="badge bg-secondary">已打烊</span><small className="d-block text-muted mt-1" style={{ fontSize: '11px' }}>營業時間: {shop.openTime}:00 - {shop.closeTime}:00</small></>
                        ) : validReport ? (
                          <><span className={`badge ${validReport.status === 'full' ? 'bg-danger' : 'bg-success'}`}>{validReport.status === 'full' ? '目前客滿' : '目前有位'}</span><small className="d-block text-muted mt-1" style={{ fontSize: '11px' }}>即時回報: {validReport.timeString}</small></>
                        ) : (
                          <><span className="badge bg-secondary">未知狀態</span><small className="d-block text-muted mt-1" style={{ fontSize: '11px' }}>尚無即時回報資料</small></>
                        )}
                      </div>

                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <small className="fw-bold text-primary d-flex align-items-center">
                            <TrendingUp size={14} className="me-1" /> AI 預測客滿機率
                          </small>
                          <small className="fw-bold text-secondary">{isClosed ? '休息中' : `${predictedProb}%`}</small>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                          <div className={`progress-bar ${probColor}`} role="progressbar" style={{ width: isClosed ? '100%' : `${predictedProb}%` }}></div>
                        </div>
                      </div>

                      <div className="d-flex flex-column gap-1 mb-2">
                        <small><Battery size={14} /> 插座：{shop.power}/5</small>
                        <small><Wifi size={14} /> WiFi：{shop.wifi}/5</small>
                        <small><Volume2 size={14} /> 安靜：{shop.quiet}/5</small>
                      </div>
                      
                      <button className="btn btn-sm btn-outline-info w-100 mb-2 d-flex align-items-center justify-content-center" onClick={() => setReviewingShop(shop)}>
                        <MessageSquare size={16} className="me-2" /> 網友評論
                      </button>

                      <button className="btn btn-sm btn-primary w-100 mb-2 d-flex align-items-center justify-content-center" onClick={() => handleStartNavigation(shop)}>
                        <Navigation size={16} className="me-2" /> 帶我過去
                      </button>

                      <div className="d-flex gap-1 mt-2">
                        <button className="btn btn-xs btn-outline-success w-50" onClick={(e) => handleReport(e, shop.id, 'available')} disabled={isClosed}>
                          {isClosed ? '非營業時間' : '回報有位'}
                        </button>
                        <button className="btn btn-xs btn-outline-danger w-50" onClick={(e) => handleReport(e, shop.id, 'full')} disabled={isClosed}>
                          {isClosed ? '非營業時間' : '回報客滿'}
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {reviewingShop && (
        <ReviewModal shop={reviewingShop} onClose={() => setReviewingShop(null)} supabase={supabase} />
      )}
    </div>
  );
}

export default App;