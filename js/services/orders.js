// ============================================
//   ZAMÓWIENIA
// ============================================

window.currentOrderData = null;
window.appliedDiscount = 0;

window.goToSummary = function() {
    const name = document.getElementById('order-name').value.trim();
    const email = document.getElementById('order-email').value.trim();
    const address = document.getElementById('order-address').value.trim();
    
    if (!name || !email || !address) {
        window.showNotification('Uzupełnij wszystkie pola!', 'error');
        return;
    }
    
    if (!email.includes('@')) {
        window.showNotification('Podaj poprawny adres email!', 'error');
        return;
    }
    
    window.currentOrderData = { name, email, address };
    document.getElementById('order-modal').classList.remove('active');
    
    const summaryItems = document.getElementById('summary-items');
    if (summaryItems) {
        summaryItems.innerHTML = '';
        window.cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'summary-item';
            div.innerHTML = `<span>${item.name} x${item.quantity}</span><span>${(item.price * item.quantity).toFixed(2)} zł</span>`;
            summaryItems.appendChild(div);
        });
    }
    
    const subtotal = window.getCartTotal ? window.getCartTotal() : 0;
    const total = window.appliedDiscount > 0 ? subtotal * (1 - window.appliedDiscount / 100) : subtotal;
    document.getElementById('summary-total').textContent = total.toFixed(2) + ' zł';
    document.getElementById('summary-modal').classList.add('active');
};

window.closeOrder = function() {
    document.getElementById('order-modal').classList.remove('active');
};

window.closeSummary = function() {
    document.getElementById('summary-modal').classList.remove('active');
};

window.backToForm = function() {
    document.getElementById('summary-modal').classList.remove('active');
    document.getElementById('order-modal').classList.add('active');
};

window.applyDiscount = function() {
    const code = document.getElementById('discount-code').value.trim().toUpperCase();
    const messageEl = document.getElementById('discount-message');
    const codes = window.DISCOUNT_CODES || {};
    
    if (codes[code]) {
        window.appliedDiscount = codes[code];
        messageEl.textContent = `Kod zaakceptowany! Zniżka: ${window.appliedDiscount}%`;
        messageEl.className = 'success';
        window.showNotification(`Zastosowano zniżkę ${window.appliedDiscount}%`, 'success');
    } else {
        window.appliedDiscount = 0;
        messageEl.textContent = 'Nieprawidłowy kod rabatowy';
        messageEl.className = '';
        window.showNotification('Nieprawidłowy kod', 'error');
    }
    const subtotal = window.getCartTotal ? window.getCartTotal() : 0;
    const total = window.appliedDiscount > 0 ? subtotal * (1 - window.appliedDiscount / 100) : subtotal;
    document.getElementById('summary-total').textContent = total.toFixed(2) + ' zł';
};

window.processPayment = async function() {
    const payBtn = document.querySelector('.pay-btn');
    if (payBtn) {
        payBtn.textContent = 'Przetwarzanie...';
        payBtn.disabled = true;
    }
    
    try {
        const licenseKey = window.generateLicenseKey ? window.generateLicenseKey() : 'XXXX-XXXX-XXXX-XXXX';
        const subtotal = window.getCartTotal ? window.getCartTotal() : 0;
        const total = window.appliedDiscount > 0 ? subtotal * (1 - window.appliedDiscount / 100) : subtotal;
        
        // Aktualizacja stanu magazynowego
        for (const item of window.cart) {
            const product = window.products ? window.products.find(p => p.id === item.id) : null;
            if (product) {
                product.stock = Math.max(0, (product.stock || 0) - item.quantity);
                if (window.saveProduct) await window.saveProduct(product);
            }
        }
        
        const orderData = window.currentOrderData || {};
        const newOrder = {
            date: new Date().toLocaleString('pl-PL'),
            customer: {
                name: orderData.name || 'Gość',
                email: orderData.email || '',
                address: orderData.address || '',
                login: window.currentUser ? window.currentUser.login : 'guest',
                uid: window.currentUser && window.currentUser.uid ? window.currentUser.uid : ''
            },
            items: window.cart.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })),
            total: total,
            licenseKey: licenseKey,
            status: 'Oczekujące'
        };
        
        if (window.saveOrder) await window.saveOrder(newOrder);
        
        // EmailJS
        if (typeof emailjs !== 'undefined') {
            try {
                await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
                    to_email: orderData.email,
                    to_name: orderData.name,
                    license_key: licenseKey,
                    order_total: total.toFixed(2)
                });
            } catch(e) {}
        }
        
        window.cart = [];
        window.saveCartToStorage();
        
        document.getElementById('summary-modal').classList.remove('active');
        document.getElementById('license-key').textContent = licenseKey;
        document.getElementById('success-modal').classList.add('active');
        window.appliedDiscount = 0;
        if (window.renderProducts) await window.renderProducts();
        window.showNotification('Zamówienie złożone pomyślnie!', 'success');
        
    } catch (error) {
        console.error('Błąd płatności:', error);
        window.showNotification('Błąd: ' + error.message, 'error');
    } finally {
        if (payBtn) {
            payBtn.textContent = 'Zapłać';
            payBtn.disabled = false;
        }
    }
};

window.closeSuccess = function() {
    document.getElementById('success-modal').classList.remove('active');
    document.getElementById('order-name').value = '';
    document.getElementById('order-email').value = '';
    document.getElementById('order-address').value = '';
    document.getElementById('review-form-container').style.display = 'none';
};

console.log('✅ Orders - załadowane');