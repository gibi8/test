// ============================================
//   MAIN - START APLIKACJI
// ============================================

console.log('🚀 NEXUS MARKET - START');

// ============================================
//   PRELOADER
// ============================================

let preloaderHidden = false;
let progressTimer = null;
let progressInterval = null;

function updateProgress(value) {
    const fill = document.getElementById('preloader-progress-fill');
    if (fill) fill.style.width = Math.min(Math.max(value, 0), 100) + '%';
}

function hidePreloader() {
    if (preloaderHidden) return;
    preloaderHidden = true;
    if (progressTimer) { clearTimeout(progressTimer); progressTimer = null; }
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    updateProgress(100);
    setTimeout(() => {
        const preloader = document.getElementById('preloader-full');
        if (preloader) {
            preloader.classList.add('hidden');
            setTimeout(() => { if (preloader.parentNode) preloader.style.display = 'none'; }, 700);
        }
    }, 400);
}

function startProgress() {
    updateProgress(0);
    let progress = 0, step = 0;
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    progressInterval = setInterval(() => {
        step++;
        if (step < 10) progress += 2.5 + Math.random() * 1.5;
        else if (step < 20) progress += 1.8 + Math.random() * 1.2;
        else if (step < 35) progress += 1.2 + Math.random() * 1.0;
        else progress += 0.5 + Math.random() * 0.8;
        if (progress >= 95) { progress = 95; if (progressInterval) { clearInterval(progressInterval); progressInterval = null; } }
        updateProgress(progress);
    }, 150);
}

startProgress();

// ============================================
//   EVENT LISTENERS - INICJALIZACJA
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('📦 DOM załadowany, inicjalizacja...');
        const startTime = Date.now();
        
        // ===== ŁADOWANIE DANYCH =====
        await window.loadProducts();
        window.loadCartFromStorage();
        window.loadUserFromSession();
        window.updateLoginButton();
        
        try { window.initStars(); } catch(e) { console.log('Błąd initStars:', e); }
        
        window.renderCart();
        if (window.currentUser) window.renderMyTickets();
        
        // ===== PRELOADER =====
        const elapsed = Date.now() - startTime;
        const minDisplayTime = 2000;
        const waitTime = Math.max(0, minDisplayTime - elapsed);
        
        setTimeout(() => { 
            hidePreloader(); 
        }, waitTime + 300);
        
    } catch(e) {
        console.log('❌ Błąd ładowania:', e);
        setTimeout(hidePreloader, 1500);
    }
});

// ===== BEZPIECZNIK =====
setTimeout(() => { hidePreloader(); }, 5000);

// ============================================
//   EVENT LISTENERS - PRZYCISKI
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // ===== NAWIGACJA =====
    document.querySelectorAll('.nm-nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (page) window.showPage(page);
        });
    });
    
    document.getElementById('logo-home')?.addEventListener('click', () => window.showPage('home'));
    document.getElementById('hero-products-btn')?.addEventListener('click', () => window.showPage('products'));
    document.getElementById('hero-how-btn')?.addEventListener('click', () => {
        document.getElementById('nm-how')?.scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('search-btn')?.addEventListener('click', () => {
        window.showPage('products');
        setTimeout(() => {
            const input = document.getElementById('filter-search');
            if (input) input.focus();
        }, 200);
    });
    
    // ===== KOSZYK =====
    document.getElementById('cart-toggle')?.addEventListener('click', window.toggleCart);
    document.getElementById('cart-close')?.addEventListener('click', window.closeCart);
    document.getElementById('cart-overlay')?.addEventListener('click', window.closeCart);
    document.getElementById('cart-checkout')?.addEventListener('click', () => { if (window.checkout) window.checkout(); });
    document.getElementById('cart-view-page')?.addEventListener('click', window.showCartPage);
    document.getElementById('cart-clear')?.addEventListener('click', window.clearCart);
    document.getElementById('cart-page-checkout')?.addEventListener('click', () => { if (window.checkout) window.checkout(); });
    document.getElementById('cart-page-clear')?.addEventListener('click', window.clearCart);
    
    // ===== TICKET =====
    document.getElementById('ticket-toggle')?.addEventListener('click', window.toggleTicketForm);
    document.getElementById('ticket-view-close')?.addEventListener('click', window.closeTicketViewModal);
    
    // ===== LOGOUT =====
    document.getElementById('admin-logout')?.addEventListener('click', async () => {
        await window.logoutUser();
        window.showPage('home');
    });
    document.getElementById('account-logout')?.addEventListener('click', async () => {
        await window.logoutUser();
        window.showPage('home');
    });
    
    // ===== PRODUKT =====
    document.getElementById('back-to-products')?.addEventListener('click', () => window.showPage('products'));
    document.getElementById('product-detail-add-cart')?.addEventListener('click', () => {
        if (window.currentDetailProductId) window.addToCart(window.currentDetailProductId);
    });
    document.getElementById('product-detail-buy-now')?.addEventListener('click', () => {
        if (window.currentDetailProductId) {
            window.addToCart(window.currentDetailProductId);
            if (window.checkout) window.checkout();
        }
    });
    
    // ===== ADMIN =====
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) window.switchAdminTab(tabName);
        });
    });
    
    document.getElementById('admin-clear-orders')?.addEventListener('click', window.clearOrders);
    document.getElementById('admin-clear-logs')?.addEventListener('click', window.clearLogs);
    document.getElementById('admin-export-logs')?.addEventListener('click', window.exportLogs);
    
    document.getElementById('admin-add-product')?.addEventListener('click', async function() {
        const name = document.getElementById('admin-name').value.trim();
        const price = parseFloat(document.getElementById('admin-price').value);
        const image = document.getElementById('admin-image').value.trim();
        const stock = parseInt(document.getElementById('admin-stock').value) || 0;
        const description = document.getElementById('admin-description').value.trim();
        const features = document.getElementById('admin-features').value.trim();
        const specs = document.getElementById('admin-specs').value.trim();
        const success = await window.addProduct(name, price, image, stock, description, features, specs);
        if (success) {
            document.getElementById('admin-name').value = '';
            document.getElementById('admin-price').value = '';
            document.getElementById('admin-image').value = '';
            document.getElementById('admin-stock').value = '';
            document.getElementById('admin-description').value = '';
            document.getElementById('admin-features').value = '';
            document.getElementById('admin-specs').value = '';
            window.switchAdminTab('products');
        }
    });
    
    document.getElementById('edit-product-close')?.addEventListener('click', () => document.getElementById('edit-product-modal').classList.remove('active'));
    
    document.getElementById('edit-product-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('edit-name').value.trim();
        const price = parseFloat(document.getElementById('edit-price').value);
        const image = document.getElementById('edit-image').value.trim();
        const stock = parseInt(document.getElementById('edit-stock').value) || 0;
        const description = document.getElementById('edit-description').value.trim();
        const featuresInput = document.getElementById('edit-features').value.trim();
        const specsInput = document.getElementById('edit-specs').value.trim();
        if (!name || isNaN(price) || price < 0) {
            window.showNotification('Uzupełnij nazwę i poprawną cenę!', 'error');
            return;
        }
        const id = window.editingProductId;
        if (id) {
            const product = window.products ? window.products.find(p => p.id === id) : null;
            if (product) {
                product.name = name;
                product.price = price;
                product.image = image;
                product.stock = stock;
                product.description = description || 'Brak opisu.';
                product.features = featuresInput ? featuresInput.split(',').map(f => f.trim()).filter(f => f.length > 0) : [];
                const specs = {};
                if (specsInput) {
                    specsInput.split(',').forEach(item => {
                        const parts = item.split(':').map(s => s.trim());
                        if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) specs[parts[0]] = parts[1];
                    });
                }
                product.specs = specs;
                await window.saveProduct(product);
                await window.loadProducts();
                window.switchAdminTab('products');
                window.showNotification('Zaktualizowano produkt', 'success');
            }
        }
        document.getElementById('edit-product-modal').classList.remove('active');
    });
    
    // ===== SUKCES =====
    document.getElementById('success-close')?.addEventListener('click', window.closeSuccess);
    document.getElementById('success-review')?.addEventListener('click', () => {
        const container = document.getElementById('review-form-container');
        if (container) container.style.display = container.style.display === 'none' ? 'block' : 'none';
        window.selectedRating = 0;
        document.querySelectorAll('#star-rating span').forEach(s => s.classList.remove('active'));
        document.getElementById('review-text').value = '';
    });
    
    document.querySelectorAll('#star-rating span').forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-star'));
            window.selectedRating = rating;
            document.querySelectorAll('#star-rating span').forEach((s, index) => {
                if (index < rating) s.classList.add('active');
                else s.classList.remove('active');
            });
        });
    });
    
    document.getElementById('review-submit')?.addEventListener('click', async function() {
        const text = document.getElementById('review-text').value.trim();
        const rating = window.selectedRating || 0;
        if (!text || rating === 0) {
            window.showNotification('Uzupełnij treść opinii i wybierz ocenę!', 'error');
            return;
        }
        let productName = 'Produkt';
        if (window.currentOrderData && window.currentOrderData.items && window.currentOrderData.items.length > 0) {
            productName = window.currentOrderData.items[0].name || 'Produkt';
        }
        const success = await window.saveReview(rating, text, productName);
        if (success) {
            document.getElementById('review-text').value = '';
            window.selectedRating = 0;
            document.querySelectorAll('#star-rating span').forEach(s => s.classList.remove('active'));
            document.getElementById('review-form-container').style.display = 'none';
            document.getElementById('success-modal').classList.remove('active');
            window.showPage('reviews');
        }
    });
    
    // ===== ZAMÓWIENIE =====
    document.getElementById('order-close')?.addEventListener('click', window.closeOrder);
    document.getElementById('order-summary')?.addEventListener('click', window.goToSummary);
    document.getElementById('summary-close')?.addEventListener('click', window.closeSummary);
    document.getElementById('summary-back')?.addEventListener('click', window.backToForm);
    document.getElementById('summary-pay')?.addEventListener('click', window.processPayment);
    document.getElementById('discount-apply')?.addEventListener('click', window.applyDiscount);
    
    // ===== POTWIERDZENIE =====
    document.getElementById('confirm-cancel')?.addEventListener('click', window.closeConfirmModal);
    document.getElementById('confirm-yes')?.addEventListener('click', window.confirmYes);
    
    // ===== STOPKA =====
    document.querySelectorAll('.footer-links a[data-page]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (page === 'cart') window.showCartPage();
            else if (page) window.showPage(page);
        });
    });
});

// ===== GLOBALNE FUNKCJE =====
window.openProductSearch = function() {
    window.showPage('products');
    setTimeout(() => {
        const input = document.getElementById('filter-search');
        if (input) input.focus();
    }, 200);
};

window.checkout = function() {
    if (!window.cart || window.cart.length === 0) {
        window.showNotification('Koszyk jest pusty!', 'error');
        return;
    }
    if (!window.currentUser) {
        window.showNotification('Musisz się zalogować, aby złożyć zamówienie!', 'error');
        window.closeCart();
        window.openLogin();
        return;
    }
    window.closeCart();
    window.appliedDiscount = 0;
    document.getElementById('discount-code').value = '';
    document.getElementById('discount-message').textContent = '';
    document.getElementById('order-modal').classList.add('active');
};

window.addToCartFromDetail = function() {
    if (window.currentDetailProductId) window.addToCart(window.currentDetailProductId);
};

window.buyNow = function() {
    if (window.currentDetailProductId) {
        window.addToCart(window.currentDetailProductId);
        window.checkout();
    }
};

window.openReviewForm = function() {
    const container = document.getElementById('review-form-container');
    if (container) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
    window.selectedRating = 0;
    document.querySelectorAll('#star-rating span').forEach(s => s.classList.remove('active'));
    document.getElementById('review-text').value = '';
};

window.setRating = function(rating) {
    window.selectedRating = rating;
    document.querySelectorAll('#star-rating span').forEach((star, index) => {
        if (index < rating) star.classList.add('active');
        else star.classList.remove('active');
    });
};

window.submitReview = async function() {
    const text = document.getElementById('review-text').value.trim();
    const rating = window.selectedRating || 0;
    if (!text || rating === 0) {
        window.showNotification('Uzupełnij treść opinii i wybierz ocenę!', 'error');
        return;
    }
    let productName = 'Produkt';
    if (window.currentOrderData && window.currentOrderData.items && window.currentOrderData.items.length > 0) {
        productName = window.currentOrderData.items[0].name || 'Produkt';
    }
    const success = await window.saveReview(rating, text, productName);
    if (success) {
        document.getElementById('review-text').value = '';
        window.selectedRating = 0;
        document.querySelectorAll('#star-rating span').forEach(s => s.classList.remove('active'));
        document.getElementById('review-form-container').style.display = 'none';
        window.closeSuccess();
        window.showPage('reviews');
    }
};

window.closeEditProductModal = function() {
    document.getElementById('edit-product-modal').classList.remove('active');
    window.editingProductId = null;
};

console.log('✅ MAIN - załadowane pomyślnie!');
// ============================================
//   SUPPORT - TICKETY I FAQ
// ============================================

// ===== FAQ ACCORDION =====
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.support-faq-question').forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.parentElement;
            const isActive = item.classList.contains('active');
            
            // Zamknij wszystkie inne w tej samej kolumnie
            const col = item.parentElement;
            col.querySelectorAll('.support-faq-item').forEach(el => {
                if (el !== item) el.classList.remove('active');
            });
            
            item.classList.toggle('active');
        });
    });
});

// ===== RENDEROWANIE TICKETÓW UŻYTKOWNIKA =====
function renderUserTickets(tickets) {
    const container = document.getElementById('support-tickets-list');
    if (!container) return;
    
    if (!tickets || tickets.length === 0) {
        container.innerHTML = `
            <div class="support-tickets-empty">
                Nie masz jeszcze żadnych zgłoszeń. Utwórz pierwsze zgłoszenie!
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    tickets.forEach(ticket => {
        const item = document.createElement('div');
        item.className = 'support-ticket-item';
        
        const statusMap = {
            'Otwarty': 'open',
            'W trakcie': 'progress',
            'Rozwiązany': 'resolved',
            'Zamknięty': 'resolved',
            'Odpowiedziano': 'waiting',
            'Oczekuje na odpowiedź': 'waiting'
        };
        const statusClass = statusMap[ticket.status] || 'open';
        const statusLabel = ticket.status || 'Otwarty';
        
        item.innerHTML = `
            <div class="support-ticket-left">
                <span class="support-ticket-id">#${ticket.id ? ticket.id.substring(0, 6) : '0000'}</span>
                <span class="support-ticket-title">${ticket.category || 'Inne'}</span>
                <span class="support-ticket-date">${ticket.date || '—'}</span>
                <span class="support-ticket-status ${statusClass}">${statusLabel}</span>
            </div>
            <button class="support-ticket-open" onclick="window.openUserTicketView('${ticket.id}')">Otwórz →</button>
        `;
        container.appendChild(item);
    });
}

// ===== OTWIERANIE MODALA TICKET =====
document.addEventListener('DOMContentLoaded', function() {
    const openBtn = document.getElementById('support-open-ticket-modal');
    if (openBtn) {
        openBtn.addEventListener('click', function() {
            // Użyj istniejącego systemu ticketów
            if (window.toggleTicketForm) {
                window.toggleTicketForm();
            } else {
                document.getElementById('ticket-section').style.display = 'block';
            }
        });
    }
});

// ===== PRZYCISK "ZOBACZ WSZYSTKIE" =====
document.addEventListener('DOMContentLoaded', function() {
    const viewAllBtn = document.getElementById('support-view-all');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function() {
            // Przewiń do listy ticketów i załaduj wszystkie
            const list = document.getElementById('support-tickets-list');
            if (list) {
                list.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Odśwież tickety użytkownika
                if (window.renderMyTickets) {
                    window.renderMyTickets();
                }
            }
        });
    }
});

// ===== NADPISANIE RENDER MY TICKETS DLA SUPPORT =====
const originalRenderMyTickets = window.renderMyTickets || function() {};
window.renderMyTickets = function() {
    originalRenderMyTickets();
    // Aktualizuj również listę w zakładce Support
    if (document.getElementById('support-tickets-list')) {
        // Tickety są już renderowane przez listenToUserTickets
        // Wywołaj ponownie aby odświeżyć
        if (window.currentUser) {
            window.listenToUserTickets(
                window.currentUser.login || '',
                window.currentUser.email || '',
                renderUserTickets
            );
        }
    }
};

// ===== INICJALIZACJA TICKETÓW W SUPPORT =====
document.addEventListener('DOMContentLoaded', function() {
    // Obsługa formularza ticketu - dodanie kategorii z support
    const categorySelect = document.getElementById('ticket-category');
    if (categorySelect) {
        // Dodaj brakujące kategorie z wymagań
        const options = [
            'Problem z kontem',
            'Zamówienie',
            'Płatność',
            'Zwrot',
            'Inne'
        ];
        // Już istnieją, ale upewniamy się
    }
});
// ============================================
//   SUPPORT - RENDEROWANIE TICKETÓW UŻYTKOWNIKA
// ============================================

window.renderUserTickets = function(tickets) {
    const container = document.getElementById('support-tickets-list');
    if (!container) return;
    
    console.log('📝 Renderowanie ticketów w SUPPORT:', tickets);
    
    if (!tickets || tickets.length === 0) {
        container.innerHTML = `
            <div class="support-tickets-empty">
                Nie masz jeszcze żadnych zgłoszeń. Utwórz pierwsze zgłoszenie!
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    tickets.forEach(ticket => {
        const item = document.createElement('div');
        item.className = 'support-ticket-item';
        
        const statusMap = {
            'Otwarty': 'open',
            'W trakcie': 'progress',
            'Rozwiązany': 'resolved',
            'Zamknięty': 'resolved',
            'Odpowiedziano': 'waiting',
            'Oczekuje na odpowiedź': 'waiting'
        };
        const statusClass = statusMap[ticket.status] || 'open';
        const statusLabel = ticket.status || 'Otwarty';
        
        const shortId = ticket.id ? ticket.id.substring(0, 6) : '0000';
        
        item.innerHTML = `
            <div class="support-ticket-left">
                <span class="support-ticket-id">#${shortId}</span>
                <span class="support-ticket-title">${ticket.category || 'Inne'}</span>
                <span class="support-ticket-date">${ticket.date || '—'}</span>
                <span class="support-ticket-status ${statusClass}">${statusLabel}</span>
            </div>
            <button class="support-ticket-open" onclick="window.openUserTicketView('${ticket.id}')">Otwórz →</button>
        `;
        container.appendChild(item);
    });
};

// ===== INICJALIZACJA TICKETÓW W SUPPORT =====
// Po załadowaniu strony, jeśli jesteśmy w support i mamy użytkownika
document.addEventListener('DOMContentLoaded', function() {
    // Obsługa przycisku "Zobacz wszystkie"
    const viewAllBtn = document.getElementById('support-view-all');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function() {
            const list = document.getElementById('support-tickets-list');
            if (list) {
                list.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (window.currentUser && window.listenToUserTickets) {
                    window.listenToUserTickets(
                        window.currentUser.login || '',
                        window.currentUser.email || '',
                        window.renderUserTickets
                    );
                }
            }
        });
    }
});