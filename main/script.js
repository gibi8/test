// ============ KONFIGURACJA EMAILJS ============
emailjs.init('YOUR_PUBLIC_KEY');
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
        id: 1, name: "Laptop Gamingowy", price: 4999.99, emoji: "💻", stock: 4,
        description: "Wydajny laptop dla graczy.",
        features: ["Karta RTX 4070", "32GB RAM", "Dysk 2TB NVMe", "Ekran 165Hz"],
        specs: { "Procesor": "Intel i9-13900H", "GPU": "RTX 4070", "RAM": "32GB", "Dysk": "2TB NVMe", "Ekran": "17.3\" 165Hz" }
    },
    { 
        id: 2, name: "Klawiatura Mechaniczna", price: 349.99, emoji: "⌨️", stock: 12,
        description: "Klawiatura z przełącznikami czerwonymi.",
        features: ["RGB", "Aluminiowa obudowa", "Hot-swap"],
        specs: { "Typ": "Mechaniczna", "Przełączniki": "Red", "Łączność": "USB-C" }
    },
    { 
        id: 3, name: "Myszka Bezprzewodowa", price: 199.99, emoji: "🖱️", stock: 25,
        description: "Lekka myszka dla profesjonalistów.",
        features: ["Sensor 26000 DPI", "Waga 58g", "Bateria 90h"],
        specs: { "DPI": "26000", "Waga": "58g", "Bateria": "90h" }
    },
    { 
        id: 4, name: "Słuchawki 7.1", price: 449.99, emoji: "🎧", stock: 8,
        description: "Dźwięk przestrzenny 7.1.",
        features: ["7.1 Surround", "Mikrofon ANC", "RGB"],
        specs: { "Dźwięk": "7.1", "Mikrofon": "ANC", "Waga": "320g" }
    },
    { 
        id: 5, name: "Monitor 27 cali", price: 1299.99, emoji: "🖥️", stock: 6,
        description: "Szybki monitor IPS 2K.",
        features: ["165Hz", "1ms", "IPS"],
        specs: { "Przekątna": "27\"", "Rozdzielczość": "2K", "Panel": "IPS" }
    },
    { 
        id: 6, name: "Konsola", price: 2499.99, emoji: "🎮", stock: 3,
        description: "Konsola nowej generacji.",
        features: ["Dysk 1TB", "4K 120fps", "SSD"],
        specs: { "Dysk": "1TB", "Wideo": "4K", "Pady": "2x" }
    },
    { 
        id: 7, name: "Tablet", price: 899.99, emoji: "📱", stock: 15,
        description: "Lekki tablet z rysikiem.",
        features: ["11 cali", "Rysik", "256GB"],
        specs: { "Ekran": "11\"", "Pamięć": "256GB", "Bateria": "12h" }
    },
    { 
        id: 8, name: "Smartwatch", price: 699.99, emoji: "⌚", stock: 20,
        description: "Nowoczesny zegarek z GPS.",
        features: ["AMOLED", "GPS", "Pulsoksymetr"],
        specs: { "Ekran": "AMOLED", "GPS": "Tak", "Woda": "50m" }
    }
];

// ============ ZMIENNE ============
let cart = [];
let currentOrderData = null;
let currentLicenseKey = '';
let currentUser = null;
let selectedRating = 0;
let appliedDiscount = 0;
let currentDetailProductId = null;
let editingProductId = null;

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
            setTimeout(function() {
                preloader.classList.add('hidden');
            }, 400);
        }
        if (progress) progress.style.width = width + '%';
    }, 150);
    
    setTimeout(function() {
        preloader.classList.add('hidden');
    }, 4000);
});

// ============ GWIAZDY ============
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
    
    if (pageName === 'products') renderProducts();
    if (pageName === 'reviews') renderReviews();
    if (pageName === 'account') renderAccount();
    if (pageName === 'admin') {
        if (currentUser && currentUser.role === 'admin') {
            renderAdminProducts();
            renderOrders();
        } else {
            showPage('home');
        }
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
        
        if (user.role === 'admin') showPage('admin');
        else showPage('account');
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
});

function logout() {
    currentUser = null;
    sessionStorage.removeItem('nexus_user');
    showPage('home');
}

// ============ KONTO ============
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

// ============ DANE ============
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

// ============ KLUCZ ============
function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) key += '-';
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

// ============ PRODUKTY ============
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
                ${product.emoji}
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

function openProductPage(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    currentDetailProductId = productId;
    
    document.getElementById('product-detail-emoji').textContent = product.emoji;
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
        { stars: 5, text: "Świetny sklep! Laptop dotarł w 2 dni.", author: "Marek K." },
        { stars: 5, text: "Polecam! Szybki kontakt i pomocna obsługa.", author: "Ania W." },
        { stars: 4, text: "Dobra jakość. Monitor super.", author: "Piotr Z." }
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
        showNotification('Produkt niedostępny!');
        return;
    }
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.quantity >= product.stock) {
            showNotification('Nie ma tylu sztuk na stanie!');
            return;
        }
        existing.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    updateCart();
    saveCartToStorage();
    showNotification(`Dodano: ${product.name}`);
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
function showNotification(message) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #6c5ce7, #fd79a8);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        z-index: 400;
        animation: slideIn 0.3s ease;
        font-weight: bold;
    `;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 2000);
}

// ============ ZAMAWIANIE ============
function checkout() {
    if (cart.length === 0) {
        showNotification('Koszyk jest pusty!');
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
        
        // Zmniejsz stan magazynowy
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
    
    showNotification('Dziękujemy za opinię!');
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
                <span class="admin-item-emoji">${product.emoji}</span>
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
    document.getElementById('edit-emoji').value = product.emoji;
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
    const emoji = document.getElementById('edit-emoji').value.trim() || '📦';
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
        product.emoji = emoji;
        product.stock = stock;
        product.description = description;
        saveProducts();
        renderAdminProducts();
        renderProducts();
        showNotification('Zaktualizowano produkt');
    }
    
    closeEditProductModal();
});

function addProduct() {
    const name = document.getElementById('admin-name').value.trim();
    const price = parseFloat(document.getElementById('admin-price').value);
    const emoji = document.getElementById('admin-emoji').value.trim() || '📦';
    const stock = parseInt(document.getElementById('admin-stock').value) || 0;
    
    if (!name || !price) {
        alert('Uzupełnij nazwę i cenę!');
        return;
    }
    
    loadProducts();
    const newId = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({ id: newId, name, price, emoji, stock, description: 'Brak opisu.', features: [], specs: {} });
    saveProducts();
    
    document.getElementById('admin-name').value = '';
    document.getElementById('admin-price').value = '';
    document.getElementById('admin-emoji').value = '';
    document.getElementById('admin-stock').value = '';
    
    renderAdminProducts();
    renderProducts();
    showNotification('Dodano nowy produkt!');
}

function deleteProduct(id) {
    loadProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
        products.splice(index, 1);
        saveProducts();
        renderAdminProducts();
        renderProducts();
        showNotification('Usunięto produkt');
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
        showNotification(`Status zamówienia #${orderId} zmieniony na: ${newStatus}`);
    }
}

function clearOrders() {
    if (confirm('Czy na pewno chcesz usunąć wszystkie zamówienia?')) {
        saveOrders([]);
        renderOrders();
        showNotification('Wyczyszczono zamówienia');
    }
}

// ============ INICJALIZACJA ============
const savedUser = sessionStorage.getItem('nexus_user');
if (savedUser) {
    try { currentUser = JSON.parse(savedUser); } catch(e) {}
}

loadCartFromStorage();
renderProducts();
initStars();