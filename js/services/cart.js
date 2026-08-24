// ============================================
//   KOSZYK - LOGIKA
// ============================================

window.cart = [];

window.setProducts = function(productsData) {
    window.products = productsData;
};

window.addToCart = function(productId) {
    const product = window.products ? window.products.find(p => p.id === productId) : null;
    if (!product) {
        window.showNotification('Produkt nie znaleziony', 'error');
        return;
    }
    
    const stock = product.stock || 0;
    if (stock <= 0) {
        window.showNotification('Produkt niedostępny!', 'error');
        return;
    }
    
    const existing = window.cart.find(item => item.id === productId);
    if (existing) {
        if (existing.quantity >= stock) {
            window.showNotification('Nie ma tylu sztuk na stanie!', 'error');
            return;
        }
        existing.quantity++;
    } else {
        window.cart.push({ ...product, quantity: 1 });
    }
    
    window.saveCartToStorage();
    window.showNotification(`Dodano: ${product.name}`, 'success');
    if (window.renderCart) window.renderCart();
    if (window.renderCartPage) window.renderCartPage();
};

window.removeFromCart = function(productId) {
    window.cart = window.cart.filter(item => item.id !== productId);
    window.saveCartToStorage();
    if (window.renderCart) window.renderCart();
    if (window.renderCartPage) window.renderCartPage();
};

window.changeQuantity = function(productId, delta) {
    const item = window.cart.find(i => i.id === productId);
    if (!item) return;
    
    const product = window.products ? window.products.find(p => p.id === productId) : null;
    if (!product) return;
    
    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
        window.removeFromCart(productId);
        return;
    }
    
    const stock = product.stock || 0;
    if (newQuantity > stock) {
        window.showNotification('Nie ma tylu sztuk na stanie!', 'error');
        return;
    }
    
    item.quantity = newQuantity;
    window.saveCartToStorage();
    if (window.renderCart) window.renderCart();
    if (window.renderCartPage) window.renderCartPage();
};

window.clearCart = function() {
    if (window.cart.length === 0) return;
    window.showConfirmModal('Opróżnić koszyk?', 'Czy na pewno chcesz usunąć wszystkie produkty z koszyka?', function() {
        window.cart = [];
        window.saveCartToStorage();
        if (window.renderCart) window.renderCart();
        if (window.renderCartPage) window.renderCartPage();
        window.showNotification('Koszyk został opróżniony', 'error');
        window.closeCart();
    });
};

window.getCartTotal = function() {
    return window.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
};

window.getCartCount = function() {
    return window.cart.reduce((sum, item) => sum + item.quantity, 0);
};

window.saveCartToStorage = function() {
    localStorage.setItem('nexus_cart', JSON.stringify(window.cart));
};

window.loadCartFromStorage = function() {
    const saved = localStorage.getItem('nexus_cart');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                window.cart = parsed.filter(item => item.price && item.name);
            } else {
                window.cart = [];
                localStorage.removeItem('nexus_cart');
            }
        } catch(e) {
            localStorage.removeItem('nexus_cart');
            window.cart = [];
        }
    } else {
        window.cart = [];
    }
    if (window.renderCart) window.renderCart();
};

window.loadOrders = async function() {
    try {
        if (window.db) {
            const snapshot = await window.db.collection('orders').get();
            const orders = [];
            snapshot.forEach(doc => {
                orders.push({ id: doc.id, ...doc.data() });
            });
            return orders;
        }
        return [];
    } catch (error) {
        console.error('Błąd ładowania zamówień:', error);
        return [];
    }
};

window.saveOrder = async function(order) {
    try {
        if (window.db) {
            await window.db.collection('orders').add(order);
        }
    } catch (error) {
        console.error('Błąd zapisu zamówienia:', error);
        throw error;
    }
};

window.updateOrderStatusInDb = async function(orderId, newStatus) {
    try {
        if (window.db) {
            await window.db.collection('orders').doc(orderId).update({ status: newStatus });
        }
    } catch (error) {
        console.error('Błąd aktualizacji statusu:', error);
        throw error;
    }
};

window.clearOrdersFromDb = async function() {
    try {
        if (window.db) {
            const snapshot = await window.db.collection('orders').get();
            const batch = [];
            snapshot.forEach(doc => {
                batch.push(window.db.collection('orders').doc(doc.id).delete());
            });
            await Promise.all(batch);
        }
    } catch (error) {
        console.error('Błąd czyszczenia zamówień:', error);
        throw error;
    }
};

console.log('✅ Cart - załadowane');