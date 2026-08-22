// ============ KONFIGURACJA FIREBASE ============
const firebaseConfig = {
  apiKey: "AIzaSyB7kgCifJsbmaaEfzg0APYf4DMQlf9ygO0",
  authDomain: "test-34119.firebaseapp.com",
  projectId: "test-34119",
  storageBucket: "test-34119.firebasestorage.app",
  messagingSenderId: "873426093218",
  appId: "1:873426093218:web:ec29ac10c8aa67d72f03fb",
  measurementId: "G-4YJJ291J8D"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ============ KONFIGURACJA EMAILJS ============
if (typeof emailjs !== 'undefined') {
    emailjs.init('YOUR_PUBLIC_KEY');
}
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

// ============ DANE LOGOWANIA TESTOWE ============
const USERS = [
    { login: 'cwel', password: 'cwel', role: 'user' },
    { login: 'gibi', password: 'gibi', role: 'admin' }
];

// ============ KODY RABATOWE ============
const DISCOUNT_CODES = {
    'NEXUS10': 10,
    'NEXUS20': 20
};

// ============ ZMIENNE GLOBALNE ============
let cart = [];
let products = [];
let currentOrderData = null;
let currentLicenseKey = '';
let currentUser = null;
let selectedRating = 0;
let appliedDiscount = 0;
let currentDetailProductId = null;
let editingProductId = null;
let confirmCallback = null;

// ============ FUNKCJE POMOCNICZE ============
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

function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) key += '-';
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

// ============ FUNKCJE FIREBASE ============
async function loadProducts() {
    const snapshot = await db.collection('products').get();
    products = [];
    snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
    });
    return products;
}

async function saveProduct(product) {
    if (product.id) {
        await db.collection('products').doc(product.id).set(product);
    } else {
        const docRef = await db.collection('products').add(product);
        product.id = docRef.id;
    }
}

async function deleteProductFromDb(id) {
    await db.collection('products').doc(id).delete();
}

async function loadOrders() {
    const snapshot = await db.collection('orders').get();
    const orders = [];
    snapshot.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
    });
    return orders;
}

async function saveOrder(order) {
    await db.collection('orders').add(order);
}

async function updateOrderStatusInDb(orderId, newStatus) {
    await db.collection('orders').doc(orderId).update({ status: newStatus });
}

async function clearOrdersFromDb() {
    const snapshot = await db.collection('orders').get();
    const batch = db.batch();
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}

async function logActivity(page, action, status = '200') {
    try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        const ip = ipData.ip;
        
        let city = 'Nieznana';
        try {
            const cityResponse = await fetch(`https://ipapi.co/${ip}/json/`);
            const cityData = await cityResponse.json();
            if (cityData && cityData.city) {
                city = cityData.city + ', ' + (cityData.country_name || '');
            }
        } catch(e) {}
        
        await db.collection('logs').add({
            date: firebase.firestore.FieldValue.serverTimestamp(),
            dateString: new Date().toLocaleString('pl-PL'),
            ip: ip,
            device: getDeviceType(navigator.userAgent),
            browser: getBrowserName(navigator.userAgent),
            page: page,
            action: action,
            status: status,
            city: city
        });
    } catch(e) {
        console.error('Błąd logowania:', e);
    }
}

async function loadLogs() {
    const snapshot = await db.collection('logs').orderBy('date', 'desc').limit(100).get();
    const logs = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        logs.push({ 
            id: doc.id, 
            ...data,
            date: data.dateString || '—'
        });
    });
    return logs;
}

async function renderLogs() {
    const tbody = document.getElementById('logs-table-body');
    if (!tbody) return;
    
    const logs = await loadLogs();
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

async function clearLogsFromDb() {
    const snapshot = await db.collection('logs').get();
    const batch = db.batch();
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}

async function exportLogs() {
    const logs = await loadLogs();
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

// ============ PRELOADER ============
window.addEventListener('load', async function() {
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
    
    await loadProducts();
    renderProducts();
});

setTimeout(function() {
    const preloader = document.getElementById('preloader');
    if (preloader && !preloader.classList.contains('hidden')) {
        preloader.classList.add('hidden');
    }
}, 5000);

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
async function showPage(pageName) {
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
    
    if (pageName === 'products') await renderProducts();
    if (pageName === 'reviews') await renderReviews();
    if (pageName === 'account') await renderAccount();
    if (pageName === 'admin') {
        if (currentUser && currentUser.role === 'admin') {
            await renderAdminProducts();
            await renderOrders();
            await renderLogs();
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

function switchToRegister() {
    closeLogin();
    openRegister();
}

function switchToLogin() {
    closeRegister();
    openLogin();
}

document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const login = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    const testUser = USERS.find(u => u.login === login && u.password === password);
    if (testUser) {
        currentUser = testUser;
        sessionStorage.setItem('nexus_user', JSON.stringify(testUser));
        closeLogin();
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        updateLoginButton();
        logActivity('/login', 'Logowanie', 'Sukces');
        if (testUser.role === 'admin') showPage('admin');
        else showPage('account');
        return;
    }
    
    try {
        const usersSnapshot = await db.collection('users').where('login', '==', login).get();
        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();
            
            await auth.signInWithEmailAndPassword(userData.email, password);
            currentUser = { login: userData.login, email: userData.email, role: userData.role };
            sessionStorage.setItem('nexus_user', JSON.stringify(currentUser));
            
            closeLogin();
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
            updateLoginButton();
            logActivity('/login', 'Logowanie', 'Sukces');
            
            if (currentUser.role === 'admin') showPage('admin');
            else showPage('account');
            return;
        }
    } catch(error) {
        console.error('Błąd logowania:', error);
    }
    
    logActivity('/login', 'Logowanie', 'Błąd');
    document.getElementById('login-error').style.display = 'block';
});

async function logout() {
    try {
        await auth.signOut();
    } catch(e) {}
    
    currentUser = null;
    sessionStorage.removeItem('nexus_user');
    updateLoginButton();
    showPage('home');
}

// ============ REJESTRACJA ============
function openRegister() {
    document.getElementById('register-modal').classList.add('active');
    document.getElementById('register-error').style.display = 'none';
}

function closeRegister() {
    document.getElementById('register-modal').classList.remove('active');
}

document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    
    if (!username || !email || !password) {
        document.getElementById('register-error').textContent = 'Uzupełnij wszystkie pola';
        document.getElementById('register-error').style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        document.getElementById('register-error').textContent = 'Hasło musi mieć minimum 6 znaków';
        document.getElementById('register-error').style.display = 'block';
        return;
    }
    
    try {
        const usersSnapshot = await db.collection('users').where('login', '==', username).get();
        if (!usersSnapshot.empty) {
            document.getElementById('register-error').textContent = 'Ta nazwa użytkownika jest zajęta';
            document.getElementById('register-error').style.display = 'block';
            return;
        }
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await db.collection('users').add({
            login: username,
            email: email,
            role: 'user',
            uid: user.uid,
            createdAt: new Date().toLocaleString('pl-PL')
        });
        
        currentUser = { login: username, email: email, role: 'user', uid: user.uid };
        sessionStorage.setItem('nexus_user', JSON.stringify(currentUser));
        
        closeRegister();
        document.getElementById('register-username').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        
        updateLoginButton();
        logActivity('/register', 'Rejestracja', 'Sukces');
        showNotification('Konto utworzone!', 'success');
        showPage('account');
        
    } catch(error) {
        console.error('Błąd rejestracji:', error);
        document.getElementById('register-error').textContent = 'Błąd: ' + error.message;
        document.getElementById('register-error').style.display = 'block';
    }
});

// ============ KONTO UŻYTKOWNIKA ============
async function renderAccount() {
    if (!currentUser) { showPage('home'); return; }
    
    document.getElementById('account-login').textContent = currentUser.login;
    document.getElementById('account-role').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Użytkownik';
    
    const orders = await loadOrders();
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
                <span class="order-id">#${order.id || '—'}</span>
                <span class="order-date">${order.date || '—'}</span>
            </div>
            <ul class="order-items">${itemsHtml}</ul>
            <div class="order-total">Suma: ${order.total.toFixed(2)} zł</div>
            <div class="order-license">Klucz: ${order.licenseKey}</div>
            <div class="order-status-control"><span>Status:</span> ${order.status || 'Oczekujące'}</div>
        `;
        
        accountOrders.appendChild(card);
    });
}

// ============ RENDEROWANIE PRODUKTÓW ============
async function renderProducts() {
    await loadProducts();
    
    const container = document.getElementById('products');
    const searchQuery = document.getElementById('search-input').value.trim().toLowerCase();
    const sortType = document.getElementById('sort-select').value;
    
    let filtered = products.filter(p => p.name.toLowerCase().includes(searchQuery));
    
    switch(sortType) {
        case 'price-asc': filtered.sort((a,b) => a.price - b.price); break;
        case 'price-desc': filtered.sort((a,b) => b.price - a.price); break;
        case 'name-asc': filtered.sort((a,b) => a.name.localeCompare(b.name)); break;
        case 'name-desc': filtered.sort((a,b) => b.name.localeCompare(a.name)); break;
        case 'newest': filtered.sort((a,b) => (b.id || 0) - (a.id || 0)); break;
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
                <button class="add-to-cart" onclick="event.stopPropagation(); addToCart('${product.id}')">Dodaj do koszyka</button>
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
async function renderReviews() {
    const snapshot = await db.collection('reviews').get();
    const reviews = [];
    snapshot.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));
    
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

function changeQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const newQuantity = item.quantity + delta;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > product.stock) {
        showNotification('Nie ma tylu sztuk na stanie!', 'error');
        return;
    }
    
    item.quantity = newQuantity;
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
                <img src="${item.image || ''}" alt="${item.name}" class="cart-item-image" onerror="this.style.display='none'">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="changeQuantity('${item.id}', -1)">−</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="changeQuantity('${item.id}', 1)">+</button>
                    </div>
                </div>
                <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)} zł</div>
                <button class="remove-item" onclick="removeFromCart('${item.id}')">✕</button>
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

function saveCartToStorage() {
    localStorage.setItem('nexus_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem('nexus_cart');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                cart = parsed.filter(item => item.price && item.name && products.some(p => p.id === item.id));
            }
        } catch(e) {
            localStorage.removeItem('nexus_cart');
        }
    }
    updateCart();
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

// ============ SYSTEM ZAMAWIANIA ============
function checkout() {
    if (cart.length === 0) {
        showNotification('Koszyk jest pusty!', 'error');
        return;
    }
    
    if (!currentUser) {
        showNotification('Musisz się zalogować, aby złożyć zamówienie!', 'error');
        closeCart();
        openLogin();
        return;
    }
    
    closeCart();
    appliedDiscount = 0;
    document.getElementById('discount-code').value = '';
    document.getElementById('discount-message').textContent = '';
    document.getElementById('discount-message').className = '';
    document.getElementById('order-modal').classList.add('active');
}

function closeOrder() { document.getElementById('order-modal').classList.remove('active'); }
function closeSummary() { document.getElementById('summary-modal').classList.remove('active'); }

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
    login: currentUser ? currentUser.login : 'guest',
    uid: currentUser ? currentUser.uid : null
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

async function processPayment() {
    const payBtn = document.querySelector('.pay-btn');
    payBtn.textContent = 'Przetwarzanie...';
    payBtn.disabled = true;
    
    setTimeout(async () => {
        currentLicenseKey = generateLicenseKey();
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const total = appliedDiscount > 0 ? subtotal * (1 - appliedDiscount / 100) : subtotal;
        
        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
            if (product) {
                product.stock = Math.max(0, product.stock - item.quantity);
                await saveProduct(product);
            }
        }
        
        const newOrder = {
            date: new Date().toLocaleString('pl-PL'),
            customer: currentOrderData,
            items: cart.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })),
            total: total,
            licenseKey: currentLicenseKey,
            status: 'Oczekujące'
        };
        
        await saveOrder(newOrder);
        sendConfirmationEmail(newOrder, currentLicenseKey);
        logActivity('/checkout', 'Zakup', 'Sukces');
        
        closeSummary();
        document.getElementById('license-key').textContent = currentLicenseKey;
        document.getElementById('success-modal').classList.add('active');
        
        cart = [];
        saveCartToStorage();
        updateCart();
        await renderProducts();
        
        appliedDiscount = 0;
        payBtn.textContent = 'Zapłać';
        payBtn.disabled = false;
    }, 2000);
}

function sendConfirmationEmail(order, licenseKey) {
    if (typeof emailjs === 'undefined') return;
    
    const templateParams = {
        to_email: order.customer.email,
        to_name: order.customer.name,
        order_id: order.id || '—',
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

function closeCart() { document.getElementById('cart-panel').classList.remove('active'); }

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

async function submitReview() {
    const text = document.getElementById('review-text').value.trim();
    
    if (!text || selectedRating === 0) {
        alert('Uzupełnij treść opinii i wybierz ocenę!');
        return;
    }
    
    await db.collection('reviews').add({
        stars: selectedRating,
        text: text,
        author: currentUser ? currentUser.login : 'Gość'
    });
    
    document.getElementById('review-text').value = '';
    selectedRating = 0;
    document.querySelectorAll('.star-rating span').forEach(s => s.classList.remove('active'));
    
    showNotification('Dziękujemy za opinię!', 'success');
    closeSuccess();
    showPage('reviews');
}

// ============ PANEL ADMINA ============
async function renderAdminProducts() {
    await loadProducts();
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
                <button class="edit-btn" onclick="openEditProductModal('${product.id}')">Edytuj</button>
                <button class="delete-btn" onclick="deleteProduct('${product.id}')">Usuń</button>
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

document.getElementById('edit-product-form').addEventListener('submit', async function(e) {
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
        await saveProduct(product);
        await renderAdminProducts();
        await renderProducts();
        showNotification('Zaktualizowano produkt', 'success');
    }
    
    closeEditProductModal();
});

async function addProduct() {
    const name = document.getElementById('admin-name').value.trim();
    const price = parseFloat(document.getElementById('admin-price').value);
    const image = document.getElementById('admin-image').value.trim();
    const stock = parseInt(document.getElementById('admin-stock').value) || 0;
    
    if (!name || !price) {
        alert('Uzupełnij nazwę i cenę!');
        return;
    }
    
    await saveProduct({ name, price, image, stock, description: 'Brak opisu.', features: [], specs: {} });
    
    document.getElementById('admin-name').value = '';
    document.getElementById('admin-price').value = '';
    document.getElementById('admin-image').value = '';
    document.getElementById('admin-stock').value = '';
    
    await renderAdminProducts();
    await renderProducts();
    showNotification('Dodano nowy produkt!', 'success');
}

async function deleteProduct(id) {
    await deleteProductFromDb(id);
    await renderAdminProducts();
    await renderProducts();
    showNotification('Usunięto produkt', 'error');
}

async function renderOrders() {
    const orders = await loadOrders();
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
        (order.items || []).forEach(item => {
            itemsHtml += `<li><span>${item.name} x${item.quantity}</span><span>${(item.price * item.quantity).toFixed(2)} zł</span></li>`;
        });
        
        card.innerHTML = `
            <div class="order-header">
                <span class="order-id">Zamówienie #${order.id || '—'}</span>
                <span class="order-date">${order.date || '—'}</span>
            </div>
            <div class="order-customer">
                <strong>${order.customer?.name || '—'}</strong> | ${order.customer?.email || '—'}<br>
                Adres: ${order.customer?.address || '—'}
            </div>
            <ul class="order-items">${itemsHtml}</ul>
            <div class="order-total">Suma: ${order.total.toFixed(2)} zł</div>
            <div class="order-license">Klucz: ${order.licenseKey}</div>
            <div class="order-status-control">
                <span>Status:</span>
                <select onchange="updateOrderStatus('${order.id}', this.value)">
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

async function updateOrderStatus(orderId, newStatus) {
    await updateOrderStatusInDb(orderId, newStatus);
    showNotification(`Status zamówienia zmieniony na: ${newStatus}`, 'success');
    await renderOrders();
}

function clearOrders() {
    showConfirmModal('Czyścić zamówienia?', 'Czy na pewno chcesz usunąć wszystkie zamówienia? Tej operacji nie można cofnąć.', async function() {
        await clearOrdersFromDb();
        await renderOrders();
        showNotification('Wyczyszczono zamówienia', 'error');
    });
}

function clearLogs() {
    showConfirmModal('Czyścić logi?', 'Czy na pewno chcesz usunąć wszystkie logi aktywności?', async function() {
        await clearLogsFromDb();
        await renderLogs();
        showNotification('Wyczyszczono logi', 'error');
    });
}

// ============ INICJALIZACJA ============
const savedUser = sessionStorage.getItem('nexus_user');
if (savedUser) {
    try { currentUser = JSON.parse(savedUser); } catch(e) {}
}

updateLoginButton();
loadCartFromStorage();
initStars();