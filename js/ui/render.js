// ============================================
//   RENDEROWANIE - GŁÓWNE
// ============================================

window.showPage = async function(pageName) {
    const pages = ['home', 'products', 'product', 'reviews', 'support', 'account', 'admin', 'cart'];
    
    pages.forEach(page => {
        const el = document.getElementById(`${page}-page`);
        if (el) {
            el.style.display = 'none';
            el.classList.remove('page-visible');
        }
    });
    
    const target = document.getElementById(`${pageName}-page`);
    if (target) {
        target.style.display = 'block';
        target.classList.add('page-visible');
    }
    
    document.querySelectorAll('.nm-nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) link.classList.add('active');
    });
    
    if (window.updateLoginButton) window.updateLoginButton();
    if (pageName !== 'admin' && window.logActivity) window.logActivity('/' + pageName, 'Wejście', '200');
    
    if (pageName === 'products' && window.renderProducts) await window.renderProducts();
    if (pageName === 'reviews' && window.renderReviews) await window.renderReviews();
    if (pageName === 'cart' && window.renderCartPage) window.renderCartPage();
    if (pageName === 'account') {
        if (window.renderAccount) await window.renderAccount();
        if (window.renderMyTickets) window.renderMyTickets();
    }
    if (pageName === 'support') {
        if (window.currentUser) {
            if (window.renderMyTickets) window.renderMyTickets();
        } else {
            const el = document.getElementById('my-tickets-section');
            if (el) el.style.display = 'none';
        }
    }
    if (pageName === 'admin') {
        if (window.currentUser && window.currentUser.role === 'admin') {
            if (window.switchAdminTab) window.switchAdminTab('orders');
            if (window.renderTicketsRealTime) window.renderTicketsRealTime();
        } else {
            window.showPage('home');
            window.showNotification('Brak uprawnień', 'error');
        }
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.switchAdminTab = function(tabName) {
    document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(content => content.style.display = 'none');
    
    const tabMap = { orders: 0, logs: 1, products: 2, stats: 3, users: 4, keys: 5, tickets: 6 };
    const tabs = document.querySelectorAll('.admin-tab');
    if (tabs[tabMap[tabName]]) tabs[tabMap[tabName]].classList.add('active');
    
    const content = document.getElementById(`admin-tab-${tabName}`);
    if (content) content.style.display = 'block';
    
    if (tabName === 'orders' && window.renderOrders) window.renderOrders();
    if (tabName === 'logs' && window.renderLogsUI) window.renderLogsUI();
    if (tabName === 'products' && window.renderAdminProducts) window.renderAdminProducts();
    if (tabName === 'stats' && window.renderStats) window.renderStats();
    if (tabName === 'users' && window.renderUsersUI) window.renderUsersUI();
    if (tabName === 'keys' && window.renderKeysUI) window.renderKeysUI();
    if (tabName === 'tickets' && window.renderTicketsRealTime) window.renderTicketsRealTime();
};

console.log('✅ Render - załadowane');