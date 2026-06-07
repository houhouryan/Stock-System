import React, { useState, useEffect } from 'react';
import { X, Star, Send } from 'lucide-react';

function ReviewModal({ shop, onClose, supabase }) {
  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當視窗打開時，去 Supabase 撈取這間店的歷史評論
  useEffect(() => {
    if (!shop) return;
    
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('cafe_reviews')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });
        
      if (data) setReviews(data);
    };
    
    fetchReviews();

    // 監聽即時新留言
    const subscription = supabase
      .channel(`reviews_${shop.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cafe_reviews', filter: `shop_id=eq.${shop.id}` }, payload => {
        setReviews(prev => [payload.new, ...prev]);
      }).subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [shop, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return alert('請輸入評論內容！');
    
    setIsSubmitting(true);
    const { error } = await supabase
      .from('cafe_reviews')
      .insert([{ shop_id: shop.id, rating: newRating, comment: newComment }]);
      
    if (error) alert('送出失敗，請檢查網路連線。');
    else setNewComment(''); // 送出成功後清空輸入框
    setIsSubmitting(false);
  };

  if (!shop) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="bg-white rounded p-4 shadow-lg" style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* 標題區 */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0 fw-bold">{shop.name} - 網友評論</h5>
          <button className="btn btn-sm btn-light" onClick={onClose}><X size={20} /></button>
        </div>

        {/* 歷史留言列表區 */}
        <div className="flex-grow-1 overflow-auto mb-3 p-2 bg-light rounded" style={{ minHeight: '200px' }}>
          {reviews.length === 0 ? (
            <div className="text-center text-muted mt-5">目前還沒有評論，來當第一個留言的人吧！</div>
          ) : (
            reviews.map(rev => (
              <div key={rev.id} className="card mb-2 border-0 shadow-sm">
                <div className="card-body p-2">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-warning">
                      {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < rev.rating ? "currentColor" : "none"} />)}
                    </span>
                    <small className="text-muted" style={{ fontSize: '10px' }}>
                      {new Date(rev.created_at).toLocaleString()}
                    </small>
                  </div>
                  <p className="mb-0" style={{ fontSize: '14px' }}>{rev.comment}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 新增留言區 */}
        <form onSubmit={handleSubmit} className="mt-auto border-top pt-3">
          <div className="mb-2 d-flex align-items-center gap-2">
            <span className="small">給個星級：</span>
            {[1, 2, 3, 4, 5].map(num => (
              <Star key={num} size={20} style={{ cursor: 'pointer' }} color={num <= newRating ? "#ffc107" : "#dee2e6"} fill={num <= newRating ? "#ffc107" : "none"} onClick={() => setNewRating(num)} />
            ))}
          </div>
          <div className="input-group">
            <input type="text" className="form-control" placeholder="寫下你的評價..." value={newComment} onChange={e => setNewComment(e.target.value)} disabled={isSubmitting} />
            <button type="submit" className="btn btn-primary d-flex align-items-center" disabled={isSubmitting}>
              <Send size={16} className="me-1" /> {isSubmitting ? '傳送中' : '送出'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default ReviewModal;