// ============================================
//   PRODUKTY - UI
// ============================================

window.renderProducts = function() {
    if (window.products) {
        window.renderFilteredProducts(window.products);
        const countEl = document.getElementById('products-count');
        if (countEl) countEl.textContent = window.products.length + ' produktów';
    }
};

window.renderFilteredProducts = function(filteredProducts) {
    const container = document.getElementById('products');
    if (!container) return;
    container.innerHTML = '';
    
    if (!filteredProducts || filteredProducts.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.4);grid-column:1/-1;padding:40px;">Brak produktów</p>';
        return;
    }
    
    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        const stock = product.stock || 0;
        const imageUrl = product.image && product.image.trim() !== '' ? product.image : 'https://via.placeholder.com/300x300/0c121c/3b82f6?text=N';
        const priceDisplay = (product.price || 0).toFixed(2) + ' zł';
        
        card.innerHTML = `
            <div class="product-image" onclick="event.stopPropagation(); window.openProductPage('${product.id}')">
                <img src="${imageUrl}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x300/0c121c/3b82f6?text=N'">
            </div>
            <div class="product-info">
                <div class="product-name" onclick="event.stopPropagation(); window.openProductPage('${product.id}')">${product.name}</div>
                <div class="product-price" onclick="event.stopPropagation(); window.openProductPage('${product.id}')">${priceDisplay}</div>
                <hr class="product-divider">
                <div class="product-footer">
                    <span class="product-stock">${stock} ${stock === 1 ? 'szt.' : 'szt.'}</span>
                    <div class="product-actions">
                        <button class="btn-cart" onclick="event.stopPropagation(); window.addToCart('${product.id}')">Dodaj</button>
                        <button class="btn-buy" onclick="event.stopPropagation(); window.buyNow('${product.id}')">Kup</button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
};

window.buyNow = function(productId) {
    if (window.addToCart) window.addToCart(productId);
    if (window.checkout) window.checkout();
};

window.openProductPage = function(productId) {
    const product = window.products ? window.products.find(p => p.id === productId) : null;
    if (!product) {
        window.showNotification('Produkt nie znaleziony', 'error');
        return;
    }
    
    window.currentDetailProductId = productId;
    
    const img = document.getElementById('product-detail-image');
    const name = document.getElementById('product-detail-name');
    const price = document.getElementById('product-detail-price');
    const short = document.getElementById('product-detail-short');
    const imageUrl = product.image && product.image.trim() !== '' ? product.image : 'https://via.placeholder.com/400x300/0c121c/3b82f6?text=N';
    
    if (img) { img.src = imageUrl; img.onerror = function() { this.src = 'https://via.placeholder.com/400x300/0c121c/3b82f6?text=N'; }; }
    if (name) name.textContent = product.name;
    if (price) price.textContent = (product.price || 0).toFixed(2) + ' zł';
    if (short) short.textContent = product.description || 'Brak opisu.';
    
    const featuresList = document.getElementById('product-detail-features');
    if (featuresList) {
        featuresList.innerHTML = '<h3>Najważniejsze cechy</h3><ul>';
        if (product.features && Array.isArray(product.features)) {
            product.features.forEach(f => featuresList.innerHTML += `<li>${f}</li>`);
        } else {
            featuresList.innerHTML += '<li>Brak cech</li>';
        }
        featuresList.innerHTML += '</ul>';
    }
    
    const specsTable = document.getElementById('product-detail-specs-table');
    if (specsTable) {
        specsTable.innerHTML = '';
        if (product.specs && typeof product.specs === 'object') {
            Object.entries(product.specs).forEach(([key, value]) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${key}</td><td>${value}</td>`;
                specsTable.appendChild(tr);
            });
        } else {
            specsTable.innerHTML = '<tr><td colspan="2">Brak specyfikacji</td></tr>';
        }
    }
    window.showPage('product');
};

window.applyFilters = function() {
    const searchTerm = document.getElementById('filter-search').value.toLowerCase().trim();
    const minPrice = parseFloat(document.getElementById('filter-min').value) || 0;
    const maxPrice = parseFloat(document.getElementById('filter-max').value) || Infinity;
    const inStockOnly = document.getElementById('filter-instock').checked;
    
    const filtered = (window.products || []).filter(product => {
        const nameMatch = product.name.toLowerCase().includes(searchTerm);
        const price = product.price || 0;
        const priceMatch = price >= minPrice && price <= maxPrice;
        const stockMatch = !inStockOnly || (product.stock || 0) > 0;
        return nameMatch && priceMatch && stockMatch;
    });
    
    document.getElementById('products-count').textContent = filtered.length + ' produktów';
    window.renderFilteredProducts(filtered);
};

window.resetFilters = function() {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-min').value = '';
    document.getElementById('filter-max').value = '';
    document.getElementById('filter-instock').checked = false;
    window.renderFilteredProducts(window.products || []);
    document.getElementById('products-count').textContent = (window.products || []).length + ' produktów';
};

window.updatePriceFromInput = function() {
    const min = parseFloat(document.getElementById('filter-min').value) || 0;
    const max = parseFloat(document.getElementById('filter-max').value) || 200;
    document.getElementById('filter-min-range').value = Math.min(min, max);
    document.getElementById('filter-max-range').value = Math.max(min, max);
    document.getElementById('filter-min-display').textContent = Math.min(min, max);
    document.getElementById('filter-max-display').textContent = Math.max(min, max);
    window.applyFilters();
};

window.updatePriceRange = function() {
    const min = parseInt(document.getElementById('filter-min-range').value);
    const max = parseInt(document.getElementById('filter-max-range').value);
    document.getElementById('filter-min').value = min;
    document.getElementById('filter-max').value = max;
    document.getElementById('filter-min-display').textContent = min;
    document.getElementById('filter-max-display').textContent = max;
    window.applyFilters();
};

window.setView = function(view) {
    const grid = document.getElementById('products');
    const buttons = document.querySelectorAll('.view-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (view === 'grid') { grid.classList.remove('list-view'); buttons[0].classList.add('active'); }
    else { grid.classList.add('list-view'); buttons[1].classList.add('active'); }
};

console.log('✅ Products UI - załadowane');