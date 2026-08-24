// ============================================
//   OPINIE - LOGIKA
// ============================================

window.allReviews = [];
window.currentSort = 'newest';

const defaultReviews = [
    { stars: 5, text: "Automatyczna opinia po 7 dniach. Usługa działa bez zarzutu!", author: "Marek K.", product: "Netflix Premium", plan: "Premium", verified: true, createdAt: new Date('2026-08-20') },
    { stars: 5, text: "Wszystko działa zgodnie z opisem. Polecam!", author: "Ania W.", product: "Spotify Premium", plan: "Premium", verified: true, createdAt: new Date('2026-08-18') },
    { stars: 4, text: "Dobra cena, działa na 4 urządzeniach bez problemów.", author: "Piotr Z.", product: "Disney+", plan: "Premium", verified: true, createdAt: new Date('2026-08-15') },
    { stars: 5, text: "Szybka dostawa, dostęp otrzymałem w 5 minut.", author: "Kasia M.", product: "YouTube Premium", plan: "Premium", verified: true, createdAt: new Date('2026-08-12') },
    { stars: 4, text: "Dobra jakość, drobne problemy z kontem ale support szybko pomógł.", author: "Tomasz R.", product: "HBO Max", plan: "Premium", verified: true, createdAt: new Date('2026-08-10') },
    { stars: 5, text: "Najlepsza cena na rynku! Bardzo zadowolony.", author: "Magda L.", product: "Netflix Premium", plan: "Premium", verified: true, createdAt: new Date('2026-08-08') }
];

window.loadReviews = async function() {
    try {
        if (window.db) {
            const snapshot = await window.db.collection('reviews').get();
            const reviews = [];
            snapshot.forEach(doc => {
                reviews.push({ id: doc.id, ...doc.data() });
            });
            const combined = [...reviews, ...defaultReviews];
            window.allReviews = combined.map(r => {
                let date = r.createdAt;
                if (date && date.toDate) date = date.toDate();
                else if (date && typeof date === 'string') date = new Date(date);
                else if (!date) date = new Date();
                return { ...r, createdAt: date };
            });
            return window.allReviews;
        }
        window.allReviews = defaultReviews;
        return window.allReviews;
    } catch (error) {
        console.error('Błąd ładowania opinii:', error);
        window.allReviews = defaultReviews;
        return window.allReviews;
    }
};

window.saveReview = async function(stars, text, productName) {
    if (!text || stars === 0) {
        window.showNotification('Uzupełnij treść opinii i wybierz ocenę!', 'error');
        return false;
    }
    try {
        if (window.db) {
            await window.db.collection('reviews').add({
                stars, text,
                author: window.currentUser ? window.currentUser.login : 'Gość',
                product: productName,
                plan: 'Premium',
                verified: true,
                createdAt: new Date().toISOString(),
                userId: window.currentUser ? window.currentUser.uid : null,
                userEmail: window.currentUser ? window.currentUser.email : null
            });
            window.showNotification('Dziękujemy za opinię!', 'success');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Błąd zapisu opinii:', error);
        window.showNotification('Błąd: ' + error.message, 'error');
        return false;
    }
};

window.sortReviews = function(sortType, button) {
    window.currentSort = sortType;
    document.querySelectorAll('.review-filter').forEach(btn => btn.classList.remove('active'));
    if (button) button.classList.add('active');
    
    const sorted = window.getSortedReviews(sortType);
    window.renderReviewCards(sorted);
};

window.getSortedReviews = function(sortType) {
    const sorted = [...window.allReviews];
    switch(sortType) {
        case 'newest': sorted.sort((a, b) => b.createdAt - a.createdAt); break;
        case 'oldest': sorted.sort((a, b) => a.createdAt - b.createdAt); break;
        case 'highest': sorted.sort((a, b) => (b.stars || 0) - (a.stars || 0)); break;
        case 'lowest': sorted.sort((a, b) => (a.stars || 0) - (b.stars || 0)); break;
        default: sorted.sort((a, b) => b.createdAt - a.createdAt);
    }
    return sorted;
};

window.renderReviewCards = function(reviews) {
    const container = document.getElementById('reviews-grid');
    if (!container) return;
    container.innerHTML = '';
    
    if (reviews.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.4);grid-column:1/-1;padding:40px;">Brak opinii. Bądź pierwszy!</p>';
        return;
    }
    
    reviews.forEach(review => {
        const card = document.createElement('div');
        card.className = 'review-card';
        let starsHtml = '';
        const starsCount = Math.min(Math.max(review.stars || 0, 0), 5);
        for (let i = 0; i < 5; i++) starsHtml += i < starsCount ? '★' : '☆';
        
        let dateStr = '';
        if (review.createdAt) {
            const date = review.createdAt instanceof Date ? review.createdAt : new Date(review.createdAt);
            if (!isNaN(date)) dateStr = date.toLocaleDateString('pl-PL', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        const productName = review.product || review.productName || 'Unknown product';
        const productPlan = review.plan || 'Premium';
        
        card.innerHTML = `
            <div class="review-card-top">
                <div class="review-card-stars">${starsHtml}</div>
                ${review.verified !== false ? `<span class="review-card-verified">Zweryfikowano</span>` : ''}
                <span class="review-card-date">${dateStr}</span>
            </div>
            <div class="review-card-text">${review.text || review.comment || 'Brak komentarza.'}</div>
            <hr class="review-card-divider">
            <div class="review-card-product">
                <span class="product-dot"></span>
                <span class="product-name">${productName}</span>
                <span class="product-plan">(${productPlan})</span>
            </div>
        `;
        container.appendChild(card);
    });
};

window.renderReviews = async function() {
    await window.loadReviews();
    const sorted = window.getSortedReviews(window.currentSort || 'newest');
    window.renderReviewCards(sorted);
};

console.log('✅ Reviews - załadowane');