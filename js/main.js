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
        
        await window.loadProducts();
        window.loadCartFromStorage();
        window.loadUserFromSession();
        window.updateLoginButton();
        
        try { window.initStars(); } catch(e) { console.log('Błąd initStars:', e); }
        
        window.renderCart();
        if (window.currentUser) window.renderMyTickets();
        
        const elapsed = Date.now() - startTime;
        const minDisplayTime = 2000;
        const waitTime = Math.max(0, minDisplayTime - elapsed);
        
        setTimeout(() => { hidePreloader(); }, waitTime + 300);
        
    } catch(e) {
        console.log('❌ Błąd ładowania:', e);
        setTimeout(hidePreloader, 1500);
    }
});

setTimeout(() => { hidePreloader(); }, 5000);

// ============================================
//   EVENT LISTENERS - PRZYCISKI
// ============================================

document.addEventListener('DOMContentLoaded', function() {
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
    
    document.getElementById('cart-toggle')?.addEventListener('click', window.toggleCart);
    document.getElementById('cart-close')?.addEventListener('click', window.closeCart);
    document.getElementById('cart-overlay')?.addEventListener('click', window.closeCart);
    document.getElementById('cart-checkout')?.addEventListener('click', () => { if (window.checkout) window.checkout(); });
    document.getElementById('cart-view-page')?.addEventListener('click', window.showCartPage);
    document.getElementById('cart-clear')?.addEventListener('click', window.clearCart);
    document.getElementById('cart-page-checkout')?.addEventListener('click', () => { if (window.checkout) window.checkout(); });
    document.getElementById('cart-page-clear')?.addEventListener('click', window.clearCart);
    
    document.getElementById('ticket-toggle')?.addEventListener('click', window.toggleTicketForm);
    document.getElementById('ticket-view-close')?.addEventListener('click', window.closeTicketViewModal);
    
    document.getElementById('admin-logout')?.addEventListener('click', async () => {
        await window.logoutUser();
        window.showPage('home');
    });
    document.getElementById('account-logout')?.addEventListener('click', async () => {
        await window.logoutUser();
        window.showPage('home');
    });
    
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
    
    document.getElementById('order-close')?.addEventListener('click', window.closeOrder);
    document.getElementById('order-summary')?.addEventListener('click', window.goToSummary);
    document.getElementById('summary-close')?.addEventListener('click', window.closeSummary);
    document.getElementById('summary-back')?.addEventListener('click', window.backToForm);
    document.getElementById('summary-pay')?.addEventListener('click', window.processPayment);
    document.getElementById('discount-apply')?.addEventListener('click', window.applyDiscount);
    
    document.getElementById('confirm-cancel')?.addEventListener('click', window.closeConfirmModal);
    document.getElementById('confirm-yes')?.addEventListener('click', window.confirmYes);
    
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

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.support-faq-question').forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.parentElement;
            const col = item.parentElement;
            col.querySelectorAll('.support-faq-item').forEach(el => {
                if (el !== item) el.classList.remove('active');
            });
            item.classList.toggle('active');
        });
    });
});

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

document.addEventListener('DOMContentLoaded', function() {
    const openBtn = document.getElementById('support-open-ticket-modal');
    if (openBtn) {
        openBtn.addEventListener('click', function() {
            if (window.toggleTicketForm) {
                window.toggleTicketForm();
            } else {
                document.getElementById('ticket-section').style.display = 'block';
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const viewAllBtn = document.getElementById('support-view-all');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function() {
            const list = document.getElementById('support-tickets-list');
            if (list) {
                list.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (window.renderMyTickets) {
                    window.renderMyTickets();
                }
            }
        });
    }
});

const originalRenderMyTickets = window.renderMyTickets || function() {};
window.renderMyTickets = function() {
    originalRenderMyTickets();
    if (document.getElementById('support-tickets-list')) {
        if (window.currentUser) {
            window.listenToUserTickets(
                window.currentUser.login || '',
                window.currentUser.email || '',
                renderUserTickets
            );
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const categorySelect = document.getElementById('ticket-category');
    if (categorySelect) {
        const options = [
            'Problem z kontem',
            'Zamówienie',
            'Płatność',
            'Zwrot',
            'Inne'
        ];
    }
});

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

document.addEventListener('DOMContentLoaded', function() {
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

// ============================================
//   SYSTEM TŁUMACZEŃ - PL/ENG
// ============================================

// Sprawdź czy tłumaczenia są dostępne
if (typeof window.translations !== 'undefined' && window.translations) {
    console.log('🌍 Tłumaczenia załadowane');
} else {
    console.warn('⚠️ Tłumaczenia nie są dostępne - używam domyślnych tekstów');
    // Tworzymy puste tłumaczenia żeby nie było błędów
    window.translations = { pl: {}, en: {} };
    window.getSavedLanguage = function() { return 'pl'; };
    window.setSavedLanguage = function(lang) { localStorage.setItem('nexus_lang', lang); };
    window.t = function(key) { return key; };
}

let currentLang = window.getSavedLanguage();

function translateElement(element) {
    // Obsługa data-i18n-html (zachowuje tagi HTML)
    const htmlKey = element.getAttribute('data-i18n-html');
    if (htmlKey) {
        const translation = window.t(htmlKey);
        if (translation && translation !== htmlKey) {
            element.innerHTML = translation;
        }
        return;
    }
    
    // Obsługa zwykłego data-i18n (tylko tekst)
    const key = element.getAttribute('data-i18n');
    if (key) {
        const translation = window.t(key);
        if (translation && translation !== key) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.hasAttribute('placeholder')) {
                    element.placeholder = translation;
                }
            } else {
                element.textContent = translation;
            }
        }
    }
}

function translatePage() {
    console.log('🌍 Tłumaczenie na:', currentLang);
    
    // Tłumacz wszystkie elementy z data-i18n-html (zachowują tagi)
    document.querySelectorAll('[data-i18n-html]').forEach(translateElement);
    
    // Tłumacz wszystkie elementy z data-i18n (tylko tekst)
    document.querySelectorAll('[data-i18n]').forEach(translateElement);
    
    // Zaktualizuj przyciski języka
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const lang = btn.getAttribute('data-lang');
        btn.classList.toggle('active', lang === currentLang);
    });
    
    // Odśwież dynamiczne elementy (produkty, koszyk itp.)
    setTimeout(() => {
        if (window.renderProducts) window.renderProducts();
        if (window.renderReviews) window.renderReviews();
        if (window.renderCart) window.renderCart();
        if (window.renderCartPage) window.renderCartPage();
        if (window.renderMyTickets) window.renderMyTickets();
        if (window.renderAccount) window.renderAccount();
    }, 50);
}

document.addEventListener('DOMContentLoaded', function() {
    translatePage();
    console.log('🌍 Język początkowy:', currentLang);
});
/*
const originalShowPageLang = window.showPage;
window.showPage = function(pageName) {
    if (typeof originalShowPageLang === 'function') {
        originalShowPageLang(pageName);
    }
    setTimeout(translatePage, 150);
};
*/

// ===== FUNKCJA ZMIANY JĘZYKA (GLOBALNA) =====
window.switchLanguage = function(lang) {
    if (lang === currentLang) return;
    currentLang = lang;
    window.setSavedLanguage(lang);
    
    // Tłumacz obecną stronę
    translatePage();
    
    // Odśwież dynamiczne elementy
    if (window.renderProducts) window.renderProducts();
    if (window.renderReviews) window.renderReviews();
    if (window.renderCart) window.renderCart();
    if (window.renderCartPage) window.renderCartPage();
    if (window.renderMyTickets) window.renderMyTickets();
    if (window.renderAccount) window.renderAccount();
    
    console.log('🌍 Język zmieniony na:', lang);
};

// ============================================
//   MARQUEE – TŁUMACZENIE I DUPLIKOWANIE
// ============================================

function updateMarquee() {
    const track = document.getElementById('marquee-track');
    if (!track) return;
    
    // Znajdź oryginalny span z tekstem
    const originalSpan = track.querySelector('.marquee-text[data-i18n-marquee]');
    if (!originalSpan) return;
    
    // Pobierz klucz tłumaczenia
    const key = originalSpan.getAttribute('data-i18n-marquee');
    
    // Pobierz przetłumaczony tekst
    const translatedText = window.t(key) || originalSpan.textContent.trim();
    
    // Wyczyść track (zostawiamy tylko pierwszy span jako wzór)
    track.innerHTML = '';
    
    // Oblicz ile razy trzeba powtórzyć tekst
    const screenWidth = window.innerWidth;
    
    // Stwórz tymczasowy element do pomiaru
    const tempSpan = document.createElement('span');
    tempSpan.className = 'marquee-text';
    tempSpan.textContent = translatedText;
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'nowrap';
    document.body.appendChild(tempSpan);
    
    const textWidth = tempSpan.offsetWidth;
    document.body.removeChild(tempSpan);
    
    // Powtarzaj aż łączna szerokość będzie > 2x szerokość ekranu
    let totalWidth = 0;
    let repeatCount = 0;
    const maxRepeats = 50; // zabezpieczenie przed nieskończoną pętlą
    
    while (totalWidth < screenWidth * 2 && repeatCount < maxRepeats) {
        const span = document.createElement('span');
        span.className = 'marquee-text';
        span.textContent = translatedText;
        track.appendChild(span);
        totalWidth += textWidth;
        repeatCount++;
    }
    
    // Dodaj jeszcze jeden na zapas (żeby nie było przerwy)
    const span = document.createElement('span');
    span.className = 'marquee-text';
    span.textContent = translatedText;
    track.appendChild(span);
    
    console.log('🌍 Marquee zaktualizowany, powtórzeń:', repeatCount + 1);
}

// ===== WYWOŁANIA =====
// Przy starcie
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(updateMarquee, 200);
});

// Po zmianie języka (nadpisujemy oryginalną funkcję)
const originalSwitchLang = window.switchLanguage;
window.switchLanguage = function(lang) {
    if (typeof originalSwitchLang === 'function') {
        originalSwitchLang(lang);
    }
    setTimeout(updateMarquee, 300);
};

// Po zmianie rozmiaru okna
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateMarquee, 300);
});

// ============================================
//   TICKET – OBSŁUGA FORMULARZA (NAPRAWA)
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('ticket-form');
    if (!form) {
        console.warn('⚠️ Formularz ticketu nie znaleziony (id="ticket-form")');
        return;
    }

    // Usuń stare event listenery (jeśli są)
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();

        console.log('📝 Formularz ticketu wysłany');

        const name = document.getElementById('ticket-name')?.value?.trim() || 'Użytkownik';
        const email = document.getElementById('ticket-email')?.value?.trim() || (window.currentUser ? window.currentUser.email : '');
        const category = document.getElementById('ticket-category')?.value || '';
        const orderNumber = document.getElementById('ticket-order')?.value?.trim() || '';
        const message = document.getElementById('ticket-message')?.value?.trim() || '';

        if (!category || !message) {
            window.showNotification('Uzupełnij wszystkie wymagane pola!', 'error');
            return;
        }

        if (!email || !email.includes('@')) {
            window.showNotification('Podaj poprawny adres email!', 'error');
            return;
        }

        try {
            const ticketData = {
                name: name,
                email: email,
                category: category,
                subject: category,
                orderNumber: orderNumber || null,
                message: message,
                date: new Date().toLocaleString('pl-PL'),
                status: 'Otwarty',
                replies: [],
                userLogin: window.currentUser ? window.currentUser.login : null,
                userId: window.currentUser && window.currentUser.uid ? window.currentUser.uid : null,
                createdAt: new Date().toISOString()
            };

            // Zapisz w Firebase (używając db z config/firebase.js)
            if (window.db) {
                const docRef = await window.db.collection('tickets').add(ticketData);
                console.log('✅ Ticket zapisany, ID:', docRef.id);
            } else {
                console.error('❌ Firebase nie dostępny');
                window.showNotification('Błąd połączenia z bazą danych', 'error');
                return;
            }

            // Wyczyść formularz
            document.getElementById('ticket-category').value = '';
            document.getElementById('ticket-order').value = '';
            document.getElementById('ticket-message').value = '';
            document.getElementById('ticket-section').style.display = 'none';

            window.showNotification('Ticket wysłany! Oczekuj na odpowiedź.', 'success');

            // Odśwież tickety
            setTimeout(() => {
                if (window.renderMyTickets) window.renderMyTickets();
                if (window.renderUserTickets && window.currentUser) {
                    window.listenToUserTickets(
                        window.currentUser.login || '',
                        window.currentUser.email || '',
                        window.renderUserTickets
                    );
                }
            }, 500);

        } catch (error) {
            console.error('❌ Błąd zapisu ticketa:', error);
            window.showNotification('Błąd: ' + error.message, 'error');
        }
    });

    console.log('✅ Event listener dla ticket-form podpięty');
});

// ============================================
//   ADMIN – LIVE SEARCH (WYSZUKIWANIE NA ŻYWO)
// ============================================

function setupLiveSearch(inputId, containerSelector, filterFn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    input.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        const items = container.children;
        let visibleCount = 0;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let show = true;
            
            if (query) {
                const text = item.textContent.toLowerCase();
                if (filterFn) {
                    show = filterFn(item, query);
                } else {
                    show = text.includes(query);
                }
            }
            
            // Dla tabel (TR) ustaw display: table-row, dla reszty block/flex
            if (item.tagName === 'TR') {
                item.style.display = show ? 'table-row' : 'none';
            } else {
                item.style.display = show ? '' : 'none';
            }
            
            if (show) visibleCount++;
        }
        
        // Jeśli brak wyników, pokaż komunikat
        const existingMsg = container.querySelector('.no-search-results');
        if (visibleCount === 0 && items.length > 0) {
            if (!existingMsg) {
                const msg = document.createElement('div');
                msg.className = 'no-search-results';
                msg.style.cssText = 'text-align:center;padding:30px;color:rgba(255,255,255,0.4);grid-column:1/-1;';
                msg.textContent = 'Brak wyników';
                container.appendChild(msg);
            }
        } else {
            if (existingMsg) existingMsg.remove();
        }
    });
}

// ===== INICJALIZACJA WYSZUKIWAREK =====
document.addEventListener('DOMContentLoaded', function() {
    // Zamówienia
    setupLiveSearch('admin-search-orders', '.orders-list');
    // Logi (tabela)
    setupLiveSearch('admin-search-logs', '#logs-table-body');
    // Produkty
    setupLiveSearch('admin-search-products', '#admin-list');
    // Użytkownicy
    setupLiveSearch('admin-search-users', '#users-list');
    // Klucze
    setupLiveSearch('admin-search-keys', '#keys-list');
    // Tickety
    setupLiveSearch('admin-search-tickets', '#tickets-list');
});

window.logoutAndReload = async function() {
    await window.logoutUser();
    await window.logoutAndReload();
    window.location.reload();
};

console.log('🌍 System językowy załadowany');

console.log('✅ MAIN - załadowane pomyślnie!');
