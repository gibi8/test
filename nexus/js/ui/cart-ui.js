// ============================================
//   KOSZYK - UI
// ============================================

window.renderCart = function() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    const countHeader = document.getElementById('cart-count-header');
    const cartCount = document.getElementById('cart-count');
    
    if (!container) return;
    
    const totalItems = window.getCartCount ? window.getCartCount() : 0;
    if (cartCount) cartCount.textContent = totalItems;
    if (countHeader) countHeader.textContent = totalItems;
    
    const cart = window.cart || [];
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <span class="empty-icon">🛒</span>
                <h3>Twój koszyk jest pusty</h3>
                <p>Dodaj produkty, aby rozpocząć zakupy.</p>
                <button class="browse-btn" onclick="window.closeCart(); window.showPage('products')">Przeglądaj produkty</button>
            </div>
        `;
        if (totalEl) totalEl.textContent = '0.00';
        return;
    }
    
    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const imageUrl = item.image && item.image.trim() !== '' ? item.image : 'https://via.placeholder.com/56/0c121c/3b82f6?text=N';
        
        html += `
            <div class="cart-item" data-id="${item.id}">
                <img src="${imageUrl}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/56/0c121c/3b82f6?text=N'">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-variant">${item.plan || item.variant || 'Standard'}</div>
                </div>
                <div class="cart-item-price">${itemTotal.toFixed(2)} zł</div>
                <div class="cart-item-controls">
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="window.changeQuantity('${item.id}', -1); window.renderCart();">−</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="window.changeQuantity('${item.id}', 1); window.renderCart();">+</button>
                    </div>
                    <button class="remove-item-btn" onclick="window.removeFromCart('${item.id}'); window.renderCart();">Usuń</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    if (totalEl) totalEl.textContent = total.toFixed(2);
};

window.renderCartPage = function() {
    const container = document.getElementById('cart-page-products');
    const totalEl = document.getElementById('cart-page-total');
    if (!container) return;
    
    const cart = window.cart || [];
    const totalItems = window.getCartCount ? window.getCartCount() : 0;
    const cartCount = document.getElementById('cart-count');
    if (cartCount) cartCount.textContent = totalItems;
    const cartCountHeader = document.getElementById('cart-count-header');
    if (cartCountHeader) cartCountHeader.textContent = totalItems;
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-page-empty">
                <span class="empty-icon">🛒</span>
                <h3>Twój koszyk jest pusty</h3>
                <p>Dodaj produkty, aby rozpocząć zakupy.</p>
                <button class="browse-btn" onclick="window.showPage('products')">Przeglądaj produkty</button>
            </div>
        `;
        if (totalEl) totalEl.textContent = '0.00 zł';
        return;
    }
    
    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const imageUrl = item.image && item.image.trim() !== '' ? item.image : 'https://via.placeholder.com/70/0c121c/3b82f6?text=N';
        
        html += `
            <div class="cart-page-item" data-id="${item.id}">
                <img src="${imageUrl}" alt="${item.name}" class="cart-page-item-image" onerror="this.src='https://via.placeholder.com/70/0c121c/3b82f6?text=N'">
                <div class="cart-page-item-details">
                    <div class="cart-page-item-name">${item.name}</div>
                    <div class="cart-page-item-variant">${item.plan || item.variant || 'Standard'}</div>
                </div>
                <div class="cart-page-item-price">${itemTotal.toFixed(2)} zł</div>
                <div class="cart-page-item-controls">
                    <div class="cart-page-item-quantity">
                        <button class="cart-page-qty-btn" onclick="window.changeQuantity('${item.id}', -1); window.renderCartPage();">−</button>
                        <span>${item.quantity}</span>
                        <button class="cart-page-qty-btn" onclick="window.changeQuantity('${item.id}', 1); window.renderCartPage();">+</button>
                    </div>
                    <button class="cart-page-remove-btn" onclick="window.removeFromCart('${item.id}'); window.renderCartPage();">Usuń</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    if (totalEl) totalEl.textContent = total.toFixed(2) + ' zł';
};

window.openCart = function() {
    document.getElementById('cart-panel').classList.add('active');
    document.getElementById('cart-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    window.renderCart();
};

window.closeCart = function() {
    document.getElementById('cart-panel').classList.remove('active');
    document.getElementById('cart-overlay').classList.remove('active');
    document.body.style.overflow = '';
};

window.toggleCart = function() {
    const panel = document.getElementById('cart-panel');
    if (panel.classList.contains('active')) window.closeCart();
    else window.openCart();
};

window.showCartPage = function() {
    window.closeCart();
    window.showPage('cart');
};

console.log('✅ Cart UI - załadowane');