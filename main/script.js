// ============ KONFIGURACJA EMAILJS ============
if (typeof emailjs !== 'undefined') {
    emailjs.init('YOUR_PUBLIC_KEY');
}
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

// ============ DANE LOGOWANIA ============
const USERS = [
    { login: 'cwel', password: 'cwel', role: 'user' },
    { login: 'gibi', password: 'gibi', role: 'admin' }
];

// ============ KODY RABATOWE ============
const DISCOUNT_CODES = {
    'NEXUS10': 10,
    'NEXUS20': 20
};

// ============ LISTA PRODUKTÓW ============
const products = [
    { 
        id: 1, name: "Netflix Premium", price: 29.99, image: "https://logo.clearbit.com/netflix.com", stock: 25,
        description: "Netflix Premium 4K. Dostęp dla 4 urządzeń jednocześnie.",
        features: ["Jakość 4K UHD", "4 urządzenia", "Brak reklam", "Wszystkie kategorie"],
        specs: { "Jakość": "4K UHD", "Urządzenia": "4", "Reklamy": "Brak", "Profil": "Pełny" }
    },
    { 
        id: 2, name: "HBO Max", price: 24.99, image: "https://logo.clearbit.com/hbomax.com", stock: 18,
        description: "HBO Max Full HD. Dostęp dla 3 urządzeń.",
        features: ["Jakość Full HD", "3 urządzenia", "Hity kinowe", "Seriale HBO"],
        specs: { "Jakość": "Full HD", "Urządzenia": "3", "Reklamy": "Brak", "Biblioteka": "Pełna" }
    },
    { 
        id: 3, name: "Disney+", price: 19.99, image: "https://logo.clearbit.com/disneyplus.com", stock: 30,
        description: "Disney+ 4K. Marvel, Star Wars, Pixar i więcej.",
        features: ["Jakość 4K", "4 urządzenia", "Marvel", "Star Wars"],
        specs: { "Jakość": "4K", "Urządzenia": "4", "Reklamy": "Brak", "Biblioteka": "Pełna" }
    },
    { 
        id: 4, name: "Spotify Premium", price: 14.99, image: "https://logo.clearbit.com/spotify.com", stock: 50,
        description: "Spotify Premium. Muzyka bez reklam i offline.",
        features: ["Bez reklam", "Tryb offline", "Dowolna ilość urządzeń", "Wysoka jakość dźwięku"],
        specs: { "Reklamy": "Brak", "Offline": "Tak", "Jakość": "320kbps", "Urządzenia": "Bez limitu" }
    },
    { 
        id: 5, name: "YouTube Premium", price: 23.99, image: "https://logo.clearbit.com/youtube.com", stock: 20,
        description: "YouTube Premium rodzinny. Bez reklam i z YouTube Music.",
        features: ["Bez reklam", "YouTube Music", "Tryb offline", "6 kont rodzinnych"],
        specs: { "Reklamy": "Brak", "YouTube Music": "Tak", "Konta": "6", "Offline": "Tak" }
    },
    { 
        id: 6, name: "Amazon Prime Video", price: 19.99, image: "https://logo.clearbit.com/primevideo.com", stock: 15,
        description: "Amazon Prime Video. Filmy, seriale i Prime Delivery.",
        features: ["Filmy i seriale", "Prime Delivery", "4K HDR", "3 urządzenia"],
        specs: { "Jakość": "4K HDR", "Urządzenia": "3", "Prime": "Tak", "Reklamy": "Brak" }
    },
    { 
        id: 7, name: "Apple TV+", price: 17.99, image: "https://logo.clearbit.com/apple.com", stock: 22,
        description: "Apple TV+. Ekskluzywne seriale Apple Originals.",
        features: ["Seriale Apple", "4K Dolby Vision", "6 kont rodzinnych", "Bez reklam"],
        specs: { "Jakość": "4K Dolby Vision", "Konta": "6", "Reklamy": "Brak", "Biblioteka": "Apple Originals" }
    },
    { 
        id: 8, name: "Tidal HiFi", price: 21.99, image: "https://logo.clearbit.com/tidal.com", stock: 12,
        description: "Tidal HiFi. Bezstratna jakość dźwięku dla audiofilów.",
        features: ["Bezstratny dźwięk", "Master Quality", "Tryb offline", "Bez reklam"],
        specs: { "Jakość": "Bezstratna", "Master": "Tak", "Offline": "Tak", "Reklamy": "Brak" }
    }
];

// ============ ZMIENNE GLOBALNE ============
let cart = [];
let currentOrderData = null;
let currentLicenseKey = '';
let currentUser = null;
let selectedRating = 0;
let appliedDiscount = 0;
let currentDetailProductId = null;
let editingProductId = null;
let confirmCallback = null;

// ============ PRELOADER ============
window.addEventListener('load', function() {
    const preloader = document.getElementById('preloader');
    const progress = document.getElementById('preloader-progress');
    
    let width = 0;
    const interval = setInterval(function() {
        width += Math.random() * 15;
        if (width >= 100) {
            width = 100;
            clearInterval(interval);
            setTimeout(function() { preloader.classList.add('hidden'); }, 400);
        }
        if (progress) progress.style.width = width + '%';
    }, 150);
    
    setTimeout(function() { preloader.classList.add('hidden'); }, 4000);
});

setTimeout(function() {
    const preloader = document.getElementById('preloader');
    if (preloader && !preloader.classList.contains('hidden')) {
        preloader.classList.add('hidden');
    }
}, 5000);

// ============ LOGOWANIE AKTYWNOŚCI ============
function getBrowserName(userAgent) {
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Inna';
}

function getDeviceType(userAgent) {
    if (userAgent.includes('iPhone') || userAgent.includes('Android')) return 'Mobile';
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) return 'Tablet';
    return 'PC';
}

function logActivity(page, action, status = '200') {
    const log = {
        date: new Date().toLocaleString('pl-PL'),
        ip: localStorage.getItem('nexus_last_ip') || 'Pobieranie...',
        device: getDeviceType(navigator.userAgent),
        browser: getBrowserName(navigator.userAgent),
        page: page,
        action: action,
        status: status,
        city: localStorage.getItem('nexus_last_city') || 'Nieznana'
    };
    
    let logs = loadLogs();
    logs.unshift(log);
    if (logs.length > 100) logs = logs.slice(0, 100);
    localStorage.setItem('nexus_visit_logs', JSON.stringify(logs));
    
    fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(data => {
            localStorage.setItem('nexus_last_ip', data.ip);
            logs.forEach(l => { if (l.ip === 'Pobieranie...') l.ip = data.ip; });
            localStorage.setItem('nexus_visit_logs', JSON.stringify(logs));
            
            return fetch(`https://ipapi.co/${data.ip}/json/`);
        })
        .then(r => r.json())
        .then(data => {
            if (data && data.city) {
                localStorage.setItem('nexus_last_city', data.city + ', ' + (data.country_name || ''));
                const updatedLogs = loadLogs();
                updatedLogs.forEach(l => { if (l.city === 'Nieznana' || l.city === 'Pobieranie...') l.city = data.city + ', ' + (data.country_name || ''); });
                localStorage.setItem('nexus_visit_logs', JSON.stringify(updatedLogs));
            }
        })
        .catch(() => {});
}

function loadLogs() {
    const saved = localStorage.getItem('nexus_visit_logs');
    if (!saved) return [];
    try { return JSON.parse(saved); } catch(e) { return []; }
}

function renderLogs() {
    const tbody = document.getElementById('logs-table-body');
    if (!tbody) return;
    
    const logs = loadLogs();
    tbody.innerHTML = '';
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:rgba(255,255,255,0.4);padding:30px;">Brak logów</td></tr>';
        return;
    }
    
    logs.forEach(log => {
        const tr = document.createElement('tr');
        
        let statusClass = 'info';
        if (log.status === '200' || log.status === 'Sukces') statusClass = 'success';
        if (log.status === 'Błąd') statusClass = 'error';
        
        tr.innerHTML = `
            <td>${log.date || '—'}</td>
            <td>${log.ip || '—'}</td>
            <td>${log.device || '—'}</td>
            <td>${log.browser || '—'}</td>
            <td>${log.page || '—'}</td>
            <td>${log.action || '—'}</td>
            <td><span class="log-status ${statusClass}">${log.status || '—'}</span></td>
            <td>${log.city || 'Nieznana'}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

function clearLogs() {
    showConfirmModal('Czyścić logi?', 'Czy na pewno chcesz usunąć wszystkie logi aktywności?', function() {
        localStorage.setItem('nexus_visit_logs', JSON.stringify([]));
        renderLogs();
        showNotification('Wyczyszczono logi', 'error');
    });
}

function exportLogs() {
    const logs = loadLogs();
    if (logs.length === 0) {
        showNotification('Brak logów do zapisania', 'error');
        return;
    }
    
    let csv = 'Data,IP,Urządzenie,Przeglądarka,Strona,Akcja,Status,Miejscowość\n';
    logs.forEach(log => {
        csv += `"${log.date || ''}","${log.ip || ''}","${log.device || ''}","${log.browser || ''}","${log.page || ''}","${log.action || ''}","${log.status || ''}","${log.city || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'logi.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('Zapisano logi do pliku CSV', 'success');
}

// ============ MODAL POTWIERDZENIA ============
function showConfirmModal(title, message, callback) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    confirmCallback = callback;
    document.getElementById('confirm-modal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('active');
    confirmCallback = null;
}

function confirmYes() {
    if (confirmCallback) confirmCallback();
    closeConfirmModal();
}

// ============ GWIAZDY W TLE ============
function initStars() {
    const canvas = document.getElementById('stars-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const stars = [];
    for (let i = 0; i < 300; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.5 + 0.5,
            alpha: Math.random(),
            speed: Math.random() * 0.02 + 0.005
        });
    }
    
    function animateStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(star => {
            star.alpha += star.speed;
            if (star.alpha > 1 || star.alpha < 0.2) star.speed = -star.speed;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            ctx.fill();
        });
        requestAnimationFrame(animateStars);
    }
    
    animateStars();
}

// ============ NAWIGACJA ============
function showPage(pageName) {
    const pages = ['home', 'products', 'product', 'reviews', 'support', 'account', 'admin'];
    
    pages.forEach(page => {
        const el = document.getElementById(`${page}-page`);
        if (el) el.style.display = 'none';
    });
    
    const target = document.getElementById(`${pageName}-page`);
    if (target) target.style.display = 'block';
    
    document.querySelectorAll('.sub-nav-btn').forEach(btn => btn.classList.remove('active'));
    
    const btnMap = { home: 0, products: 1, reviews: 2, support: 3 };
    if (btnMap[pageName] !== undefined) {
        const buttons = document.querySelectorAll('.sub-nav-btn');
        if (buttons[btnMap[pageName]]) buttons[btnMap[pageName]].classList.add('active');
    }
    
    updateLoginButton();
    
    if (pageName !== 'admin') logActivity('/' + pageName, 'Wejście', '200');
    
    if (pageName === 'products') renderProducts();
    if (pageName === 'reviews') renderReviews();
    if (pageName === 'account') renderAccount();
    if (pageName === 'admin') {
        if (currentUser && currentUser.role === 'admin') {
            renderAdminProducts();
            renderOrders();
            renderLogs();
        } else {
            showPage('home');
        }
    }
}

// ============ PRZYCISK LOGIN ============
function updateLoginButton() {
    const btn = document.getElementById('login-btn');
    if (!btn) return;
    
    if (currentUser) {
        if (currentUser.role === 'admin') btn.textContent = 'ADMIN PANEL';
        else btn.textContent = 'MOJE KONTO';
    } else {
        btn.textContent = 'LOGIN';
    }
}

// ============ LOGOWANIE ============
function handleLoginClick() {
    if (currentUser) {
        if (currentUser.role === 'admin') showPage('admin');
        else showPage('account');
    } else {
        openLogin();
    }
}

function openLogin() {
    document.getElementById('login-modal').classList.add('active');
    document.getElementById('login-error').style.display = 'none';
}

function closeLogin() {
    document.getElementById('login-modal').classList.remove('active');
}

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const login = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const user = USERS.find(u => u.login === login && u.password === password);
    
    if (user) {
        currentUser = user;
        sessionStorage.setItem('nexus_user', JSON.stringify(user));
        closeLogin();
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        updateLoginButton();
        logActivity('/login', 'Logowanie', 'Sukces');
        
        if (user.role === 'admin') showPage('admin');
        else showPage('account');
    } else {
        logActivity('/login', 'Logowanie', 'Błąd');
        document.getElementById('login-error').style.display = 'block';
    }
});

function logout() {
    currentUser = null;
    sessionStorage.removeItem('nexus_user');
    updateLoginButton();
    showPage('home');
}

// ============ KONTO UŻYTKOWNIKA ============
function renderAccount() {
    if (!currentUser) { showPage('home'); return; }
    
    document.getElementById('account-login').textContent = currentUser.login;
    document.getElementById('account-role').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Użytkownik';
    
    const orders = loadOrders();
    const userOrders = orders.filter(o => o.customer && o.customer.login === currentUser.login);
    const totalSpent = userOrders.reduce((sum, o) => sum + o.total, 0);
    
    document.getElementById('account-orders-count').textContent = userOrders.length;
    document.getElementById('account-total-spent').textContent = totalSpent.toFixed(2) + ' zł';
    
    const accountOrders = document.getElementById('account-orders');
    accountOrders.innerHTML = '';
    
    if (userOrders.length === 0) {
        accountOrders.innerHTML = '<p style="color:rgba(255,255,255,0.4);">Brak zamówień</p>';
        return;
    }
    
    userOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'order-card';
        
        let itemsHtml = '';
        order.items.forEach(item => {
            itemsHtml += `<li><span>${item.name} x${item.quantity}</span><span>${(item.price * item.quantity).toFixed(2)} zł</span></li>`;
        });
        
        card.innerHTML = `
            <div class="order-header">
                <span class="order-id">#${order.id}</span>
                <span class="order-date">${order.date}</span>
            </div>
            <ul class="order-items">${itemsHtml}</ul>
            <div class="order-total">Suma: ${order.total.toFixed(2)} zł</div>
            <div class="order-license">Klucz: ${order.licenseKey}</div>
            <div class="order-status-control"><span>Status:</span> ${order.status || 'Oczekujące'}</div>
        `;
        
        accountOrders.appendChild(card);
    });
}

// ============ ŁADOWANIE I ZAPISYWANIE DANYCH ============
function loadProducts() {
    const saved = localStorage.getItem('nexus_products');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                products.length = 0;
                parsed.forEach(p => products.push(p));
            }
        } catch(e) {}
    }
}

function saveProducts() {
    localStorage.setItem('nexus_products', JSON.stringify(products));
}

function loadOrders() {
    const saved = localStorage.getItem('nexus_orders');
    if (!saved) return [];
    try { return JSON.parse(saved); } catch(e) { return []; }
}

function saveOrders(orders) {
    localStorage.setItem('nexus_orders', JSON.stringify(orders));
}

function loadReviews() {
    const saved = localStorage.getItem('nexus_reviews');
    if (!saved) return [];
    try { return JSON.parse(saved); } catch(e) { return []; }
}

function saveReviews(reviews) {
    localStorage.setItem('nexus_reviews', JSON.stringify(reviews));
}

function saveCartToStorage() {
    localStorage.setItem('nexus_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem('nexus_cart');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) cart = parsed;
        } catch(e) {}
    }
    updateCart();
}

// ============ GENEROWANIE KLUCZA ============
function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) key += '-';
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

// ============ RENDEROWANIE PRODUKTÓW ============
function renderProducts() {
    loadProducts();
    
    const container = document.getElementById('products');
    const searchQuery = document.getElementById('search-input').value.trim().toLowerCase();
    const sortType = document.getElementById('sort-select').value;
    
    let filtered = products.filter(p => p.name.toLowerCase().includes(searchQuery));
    
    switch(sortType) {
        case 'price-asc': filtered.sort((a,b) => a.price - b.price); break;
        case 'price-desc': filtered.sort((a,b) => b.price - a.price); break;
        case 'name-asc': filtered.sort((a,b) => a.name.localeCompare(b.name)); break;
        case 'name-desc': filtered.sort((a,b) => b.name.localeCompare(a.name)); break;
        case 'newest': filtered.sort((a,b) => b.id - a.id); break;
    }
    
    container.innerHTML = '';
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.4);grid-column:1/-1;">Brak produktów</p>';
        return;
    }
    
    filtered.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        card.innerHTML = `
            <div class="product-image">
                ${product.stock > 0 
                    ? `<span class="stock-badge">${product.stock} szt.</span>` 
                    : `<span class="stock-badge out-of-stock">Brak</span>`}
                <img src="${product.image || ''}" alt="${product.name}" onerror="this.style.display='none'">
            </div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${product.price.toFixed(2)} zł</div>
                <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})">Dodaj do koszyka</button>
            </div>
        `;
        
        card.addEventListener('click', () => openProductPage(product.id));
        container.appendChild(card);
    });
}

// ============ STRONA PRODUKTU ============
function openProductPage(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    currentDetailProductId = productId;
    
    document.getElementById('product-detail-image').src = product.image || '';
    document.getElementById('product-detail-name').textContent = product.name;
    document.getElementById('product-detail-price').textContent = product.price.toFixed(2) + ' zł';
    document.getElementById('product-detail-short').textContent = product.description || 'Brak opisu.';
    
    const featuresList = document.getElementById('product-detail-features');
    featuresList.innerHTML = '<h3>Najważniejsze cechy</h3><ul>';
    (product.features || []).forEach(f => featuresList.innerHTML += `<li>${f}</li>`);
    featuresList.innerHTML += '</ul>';
    
    const specsTable = document.getElementById('product-detail-specs-table');
    specsTable.innerHTML = '';
    if (product.specs) {
        Object.entries(product.specs).forEach(([key, value]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${key}</td><td>${value}</td>`;
            specsTable.appendChild(tr);
        });
    }
    
    showPage('product');
}

function addToCartFromDetail() {
    if (currentDetailProductId) addToCart(currentDetailProductId);
}

function buyNow() {
    if (currentDetailProductId) {
        addToCart(currentDetailProductId);
        checkout();
    }
}

// ============ OPINIE ============
function renderReviews() {
    const reviews = loadReviews();
    const container = document.getElementById('reviews-grid');
    container.innerHTML = '';
    
    const defaultReviews = [
        { stars: 5, text: "Netflix działa idealnie! Dostęp dostałem w 5 minut.", author: "Marek K." },
        { stars: 5, text: "Polecam! Spotify Premium bez problemów.", author: "Ania W." },
        { stars: 4, text: "Dobra cena. Disney+ działa na 4 urządzeniach.", author: "Piotr Z." }
    ];
    
    const allReviews = [...reviews, ...defaultReviews];
    
    allReviews.forEach(review => {
        const card = document.createElement('div');
        card.className = 'review-card';
        
        let starsHtml = '';
        for (let i = 0; i < 5; i++) starsHtml += i < review.stars ? '★' : '☆';
        
        card.innerHTML = `
            <div class="review-stars">${starsHtml}</div>
            <p class="review-text">"${review.text}"</p>
            <div class="review-author">- ${review.author}</div>
        `;
        
        container.appendChild(card);
    });
}

// ============ KOSZYK ============
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (product.stock <= 0) {
        showNotification('Produkt niedostępny!', 'error');
        return;
    }
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.quantity >= product.stock) {
            showNotification('Nie ma tylu sztuk na stanie!', 'error');
            return;
        }
        existing.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    updateCart();
    saveCartToStorage();
    showNotification(`Dodano: ${product.name}`, 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
    saveCartToStorage();
}

function updateCart() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.4);">Koszyk jest pusty</p>';
    } else {
        cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-name">${item.name} x${item.quantity}</div>
                <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)} zł</div>
                <button class="remove-item" onclick="removeFromCart(${item.id})">✕</button>
            `;
            cartItems.appendChild(div);
        });
    }
    
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartTotal.textContent = total.toFixed(2) + ' zł';
}

function toggleCart() {
    document.getElementById('cart-panel').classList.toggle('active');
}

// ============ POWIADOMIENIA ============
function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = 'notification';
    if (type === 'error') notif.classList.add('error');
    
    notif.textContent = message;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 2000);
}

// ============ SYSTEM ZAMAWIANIA ============
function checkout() {
    if (cart.length === 0) {
        showNotification('Koszyk jest pusty!', 'error');
        return;
    }
    
    closeCart();
    appliedDiscount = 0;
    document.getElementById('discount-code').value = '';
    document.getElementById('discount-message').textContent = '';
    document.getElementById('discount-message').className = '';
    document.getElementById('order-modal').classList.add('active');
}

function closeOrder() {
    document.getElementById('order-modal').classList.remove('active');
}

function closeSummary() {
    document.getElementById('summary-modal').classList.remove('active');
}

function goToSummary() {
    const name = document.getElementById('order-name').value.trim();
    const email = document.getElementById('order-email').value.trim();
    const address = document.getElementById('order-address').value.trim();
    
    if (!name || !email || !address) {
        alert('Uzupełnij wszystkie pola!');
        return;
    }
    
    currentOrderData = {
        name,
        email,
        address,
        login: currentUser ? currentUser.login : 'guest'
    };
    
    closeOrder();
    
    const summaryItems = document.getElementById('summary-items');
    summaryItems.innerHTML = '';
    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'summary-item';
        div.innerHTML = `<span>${item.name} x${item.quantity}</span><span>${(item.price * item.quantity).toFixed(2)} zł</span>`;
        summaryItems.appendChild(div);
    });
    
    updateSummaryTotal();
    document.getElementById('summary-modal').classList.add('active');
}

function updateSummaryTotal() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = appliedDiscount > 0 ? subtotal * (1 - appliedDiscount / 100) : subtotal;
    document.getElementById('summary-total').textContent = total.toFixed(2) + ' zł';
}

function applyDiscount() {
    const code = document.getElementById('discount-code').value.trim().toUpperCase();
    const messageEl = document.getElementById('discount-message');
    
    if (DISCOUNT_CODES[code]) {
        appliedDiscount = DISCOUNT_CODES[code];
        messageEl.textContent = `Kod zaakceptowany! Zniżka: ${appliedDiscount}%`;
        messageEl.className = 'success';
    } else {
        appliedDiscount = 0;
        messageEl.textContent = 'Nieprawidłowy kod rabatowy';
        messageEl.className = '';
    }
    
    updateSummaryTotal();
}

function backToForm() {
    closeSummary();
    document.getElementById('order-modal').classList.add('active');
}

function processPayment() {
    const payBtn = document.querySelector('.pay-btn');
    payBtn.textContent = 'Przetwarzanie...';
    payBtn.disabled = true;
    
    setTimeout(() => {
        currentLicenseKey = generateLicenseKey();
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const total = appliedDiscount > 0 ? subtotal * (1 - appliedDiscount / 100) : subtotal;
        
        cart.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if (product) product.stock = Math.max(0, product.stock - item.quantity);
        });
        saveProducts();
        
        const orders = loadOrders();
        const newOrder = {
            id: orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 1,
            date: new Date().toLocaleString('pl-PL'),
            customer: currentOrderData,
            items: cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            })),
            total: total,
            licenseKey: currentLicenseKey,
            status: 'Oczekujące'
        };
        
        orders.push(newOrder);
        saveOrders(orders);
        sendConfirmationEmail(newOrder, currentLicenseKey);
        
        logActivity('/checkout', 'Zakup', 'Sukces');
        
        closeSummary();
        document.getElementById('license-key').textContent = currentLicenseKey;
        document.getElementById('success-modal').classList.add('active');
        
        cart = [];
        saveCartToStorage();
        updateCart();
        renderProducts();
        
        appliedDiscount = 0;
        payBtn.textContent = 'Zapłać';
        payBtn.disabled = false;
    }, 2000);
}

function sendConfirmationEmail(order, licenseKey) {
    if (typeof emailjs === 'undefined') {
        console.log('EmailJS nie jest załadowany – pomijam wysyłkę maila');
        return;
    }
    
    const templateParams = {
        to_email: order.customer.email,
        to_name: order.customer.name,
        order_id: order.id,
        order_total: order.total.toFixed(2),
        license_key: licenseKey,
        message: `Dziękujemy za zakup! Twój klucz: ${licenseKey}`
    };
    
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(() => console.log('Email wysłany'))
        .catch(err => console.error('Błąd wysyłania emaila:', err));
}

function closeSuccess() {
    document.getElementById('success-modal').classList.remove('active');
    document.getElementById('order-name').value = '';
    document.getElementById('order-email').value = '';
    document.getElementById('order-address').value = '';
    document.getElementById('review-form-container').style.display = 'none';
}

function closeCart() {
    document.getElementById('cart-panel').classList.remove('active');
}

// ============ OPINIE PO ZAKUPIE ============
function openReviewForm() {
    document.getElementById('review-form-container').style.display = 'block';
    selectedRating = 0;
}

function setRating(rating) {
    selectedRating = rating;
    document.querySelectorAll('.star-rating span').forEach((star, index) => {
        if (index < rating) star.classList.add('active');
        else star.classList.remove('active');
    });
}

function submitReview() {
    const text = document.getElementById('review-text').value.trim();
    
    if (!text || selectedRating === 0) {
        alert('Uzupełnij treść opinii i wybierz ocenę!');
        return;
    }
    
    const reviews = loadReviews();
    reviews.push({
        stars: selectedRating,
        text: text,
        author: currentUser ? currentUser.login : 'Gość'
    });
    saveReviews(reviews);
    
    document.getElementById('review-text').value = '';
    selectedRating = 0;
    document.querySelectorAll('.star-rating span').forEach(s => s.classList.remove('active'));
    
    showNotification('Dziękujemy za opinię!', 'success');
    closeSuccess();
    showPage('reviews');
}

// ============ PANEL ADMINA ============
function renderAdminProducts() {
    loadProducts();
    const adminList = document.getElementById('admin-list');
    adminList.innerHTML = '';
    
    products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'admin-item';
        item.innerHTML = `
            <div class="admin-item-info">
                <img src="${product.image || ''}" alt="" class="admin-item-image" onerror="this.style.display='none'">
                <div>
                    <div class="admin-item-name">${product.name}</div>
                    <div class="admin-item-price">${product.price.toFixed(2)} zł | Stan: ${product.stock} szt.</div>
                </div>
            </div>
            <div class="admin-item-actions">
                <button class="edit-btn" onclick="openEditProductModal(${product.id})">Edytuj</button>
                <button class="delete-btn" onclick="deleteProduct(${product.id})">Usuń</button>
            </div>
        `;
        adminList.appendChild(item);
    });
}

function openEditProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    editingProductId = productId;
    
    document.getElementById('edit-name').value = product.name;
    document.getElementById('edit-price').value = product.price;
    document.getElementById('edit-image').value = product.image || '';
    document.getElementById('edit-stock').value = product.stock;
    document.getElementById('edit-description').value = product.description || '';
    
    document.getElementById('edit-product-modal').classList.add('active');
}

function closeEditProductModal() {
    document.getElementById('edit-product-modal').classList.remove('active');
    editingProductId = null;
}

document.getElementById('edit-product-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('edit-name').value.trim();
    const price = parseFloat(document.getElementById('edit-price').value);
    const image = document.getElementById('edit-image').value.trim();
    const stock = parseInt(document.getElementById('edit-stock').value) || 0;
    const description = document.getElementById('edit-description').value.trim();
    
    if (!name || !price) {
        alert('Uzupełnij nazwę i cenę!');
        return;
    }
    
    const product = products.find(p => p.id === editingProductId);
    if (product) {
        product.name = name;
        product.price = price;
        product.image = image;
        product.stock = stock;
        product.description = description;
        saveProducts();
        renderAdminProducts();
        renderProducts();
        showNotification('Zaktualizowano produkt', 'success');
    }
    
    closeEditProductModal();
});

function addProduct() {
    const name = document.getElementById('admin-name').value.trim();
    const price = parseFloat(document.getElementById('admin-price').value);
    const image = document.getElementById('admin-image').value.trim();
    const stock = parseInt(document.getElementById('admin-stock').value) || 0;
    
    if (!name || !price) {
        alert('Uzupełnij nazwę i cenę!');
        return;
    }
    
    loadProducts();
    const newId = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({ 
        id: newId, 
        name, 
        price, 
        image, 
        stock, 
        description: 'Brak opisu.', 
        features: [], 
        specs: {} 
    });
    saveProducts();
    
    document.getElementById('admin-name').value = '';
    document.getElementById('admin-price').value = '';
    document.getElementById('admin-image').value = '';
    document.getElementById('admin-stock').value = '';
    
    renderAdminProducts();
    renderProducts();
    showNotification('Dodano nowy produkt!', 'success');
}

function deleteProduct(id) {
    loadProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
        products.splice(index, 1);
        saveProducts();
        renderAdminProducts();
        renderProducts();
        showNotification('Usunięto produkt', 'error');
    }
}

function renderOrders() {
    const orders = loadOrders();
    const ordersList = document.getElementById('orders-list');
    ordersList.innerHTML = '';
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<div class="no-orders">Brak zamówień</div>';
        return;
    }
    
    orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'order-card';
        
        let itemsHtml = '';
        order.items.forEach(item => {
            itemsHtml += `<li><span>${item.name} x${item.quantity}</span><span>${(item.price * item.quantity).toFixed(2)} zł</span></li>`;
        });
        
        card.innerHTML = `
            <div class="order-header">
                <span class="order-id">Zamówienie #${order.id}</span>
                <span class="order-date">${order.date}</span>
            </div>
            <div class="order-customer">
                <strong>${order.customer.name}</strong> | ${order.customer.email}<br>
                Adres: ${order.customer.address}
            </div>
            <ul class="order-items">${itemsHtml}</ul>
            <div class="order-total">Suma: ${order.total.toFixed(2)} zł</div>
            <div class="order-license">Klucz: ${order.licenseKey}</div>
            <div class="order-status-control">
                <span>Status:</span>
                <select onchange="updateOrderStatus(${order.id}, this.value)">
                    <option value="Oczekujące" ${order.status === 'Oczekujące' ? 'selected' : ''}>Oczekujące</option>
                    <option value="Opłacone" ${order.status === 'Opłacone' ? 'selected' : ''}>Opłacone</option>
                    <option value="Wysłane" ${order.status === 'Wysłane' ? 'selected' : ''}>Wysłane</option>
                    <option value="Dostarczone" ${order.status === 'Dostarczone' ? 'selected' : ''}>Dostarczone</option>
                </select>
            </div>
        `;
        
        ordersList.appendChild(card);
    });
}

function updateOrderStatus(orderId, newStatus) {
    const orders = loadOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        saveOrders(orders);
        showNotification(`Status zamówienia #${orderId} zmieniony na: ${newStatus}`, 'success');
    }
}

function clearOrders() {
    showConfirmModal('Czyścić zamówienia?', 'Czy na pewno chcesz usunąć wszystkie zamówienia? Tej operacji nie można cofnąć.', function() {
        saveOrders([]);
        renderOrders();
        showNotification('Wyczyszczono zamówienia', 'error');
    });
}

// ============ INICJALIZACJA ============
const savedUser = sessionStorage.getItem('nexus_user');
if (savedUser) {
    try { currentUser = JSON.parse(savedUser); } catch(e) {}
}

updateLoginButton();
loadCartFromStorage();
renderProducts();
initStars();