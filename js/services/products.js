// ============================================
//   PRODUKTY - LOGIKA
// ============================================

window.products = [];

const defaultProducts = [
    { 
        id: 'netflix-1', 
        name: 'Netflix Premium', 
        price: 9.99, 
        stock: 10, 
        image: 'https://via.placeholder.com/300/0c121c/3b82f6?text=Netflix',
        description: 'Najlepsza platforma streamingowa z ogromną biblioteką filmów i seriali.',
        features: ['4K Ultra HD', 'HDR', 'Dolby Atmos', 'Oglądanie na 4 urządzeniach'],
        specs: { 'Jakość': '4K', 'Urządzenia': '4', 'Dźwięk': 'Dolby Atmos' }
    },
    { 
        id: 'spotify-1', 
        name: 'Spotify Premium', 
        price: 8.99, 
        stock: 15, 
        image: 'https://via.placeholder.com/300/0c121c/3b82f6?text=Spotify',
        description: 'Muzyka bez reklam, słuchaj offline i wybieraj dowolne utwory.',
        features: ['Brak reklam', 'Słuchanie offline', 'Najwyższa jakość dźwięku'],
        specs: { 'Jakość': '320kbps', 'Offline': 'Tak', 'Reklamy': 'Brak' }
    },
    { 
        id: 'disney-1', 
        name: 'Disney+ Premium', 
        price: 11.99, 
        stock: 8, 
        image: 'https://via.placeholder.com/300/0c121c/3b82f6?text=Disney%2B',
        description: 'Wszystkie filmy i seriale od Disney, Pixar, Marvel, Star Wars i National Geographic.',
        features: ['4K Ultra HD', 'HDR10', 'Dolby Atmos', 'Oglądanie na 4 urządzeniach'],
        specs: { 'Jakość': '4K', 'Urządzenia': '4', 'Dźwięk': 'Dolby Atmos' }
    },
    { 
        id: 'youtube-1', 
        name: 'YouTube Premium', 
        price: 9.99, 
        stock: 12, 
        image: 'https://via.placeholder.com/300/0c121c/3b82f6?text=YouTube',
        description: 'Oglądaj YouTube bez reklam, słuchaj w tle i pobieraj filmy.',
        features: ['Brak reklam', 'Słuchanie w tle', 'Pobieranie filmów'],
        specs: { 'Reklamy': 'Brak', 'Tło': 'Tak', 'Pobieranie': 'Tak' }
    },
    { 
        id: 'hbo-1', 
        name: 'HBO Max Premium', 
        price: 13.99, 
        stock: 6, 
        image: 'https://via.placeholder.com/300/0c121c/3b82f6?text=HBO+Max',
        description: 'Najlepsze seriale i filmy od HBO, DC, Cartoon Network i więcej.',
        features: ['4K Ultra HD', 'HDR', 'Dolby Atmos', 'Oglądanie na 3 urządzeniach'],
        specs: { 'Jakość': '4K', 'Urządzenia': '3', 'Dźwięk': 'Dolby Atmos' }
    }
];

window.loadProducts = async function() {
    try {
        if (window.db) {
            const snapshot = await window.db.collection('products').get();
            window.products = [];
            snapshot.forEach(doc => {
                window.products.push({ id: doc.id, ...doc.data() });
            });
            console.log('✅ Produkty załadowane z Firebase:', window.products.length);
            return window.products;
        } else {
            throw new Error('Firebase nie dostępny');
        }
    } catch (error) {
        console.error('❌ Błąd ładowania produktów:', error);
        console.log('🔄 Używam domyślnych produktów (fallback)');
        window.products = defaultProducts.map(p => ({ ...p }));
        window.showNotification('Używam zapasowych produktów', 'error');
        return window.products;
    }
};

window.saveProduct = async function(product) {
    try {
        if (product.id) {
            await window.db.collection('products').doc(product.id).set(product);
        } else {
            const docRef = await window.db.collection('products').add(product);
            product.id = docRef.id;
        }
    } catch (error) {
        console.error('Błąd zapisu produktu:', error);
        throw error;
    }
};

window.deleteProductFromDb = async function(id) {
    try {
        await window.db.collection('products').doc(id).delete();
    } catch (error) {
        console.error('Błąd usuwania produktu:', error);
        throw error;
    }
};

window.addProduct = async function(name, price, image, stock, description, featuresInput, specsInput) {
    if (!name || price <= 0 || stock < 0) {
        window.showNotification('Uzupełnij wszystkie pola poprawnie!', 'error');
        return false;
    }
    
    const features = window.parseFeatures ? window.parseFeatures(featuresInput) : [];
    const specs = window.parseSpecs ? window.parseSpecs(specsInput) : {};
    
    try {
        await window.saveProduct({
            name: name.trim(),
            price: price,
            image: image.trim() || '',
            stock: stock,
            description: description.trim() || 'Brak opisu.',
            features: features,
            specs: specs
        });
        await window.loadProducts();
        window.showNotification('Dodano nowy produkt!', 'success');
        return true;
    } catch (error) {
        window.showNotification('Błąd: ' + error.message, 'error');
        return false;
    }
};

window.getProductById = function(id) {
    let product = window.products.find(p => p.id === id);
    if (!product) {
        product = defaultProducts.find(p => p.id === id);
    }
    return product;
};

console.log('✅ Products - załadowane');