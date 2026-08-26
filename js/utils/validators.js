// ============================================
//   WALIDACJA
// ============================================

window.isValidEmail = function(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

window.isValidPassword = function(password) {
    return password.length >= 6;
};

window.isValidUsername = function(username) {
    return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
};

window.isValidPrice = function(price) {
    return typeof price === 'number' && price >= 0;
};

window.isValidStock = function(stock) {
    return Number.isInteger(stock) && stock >= 0;
};

window.parseFeatures = function(featuresInput) {
    if (!featuresInput || featuresInput.trim() === '') {
        return [];
    }
    return featuresInput.split(',').map(f => f.trim()).filter(f => f.length > 0);
};

window.parseSpecs = function(specsInput) {
    if (!specsInput || specsInput.trim() === '') {
        return {};
    }
    const specs = {};
    specsInput.split(',').forEach(item => {
        const parts = item.split(':').map(s => s.trim());
        if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) {
            specs[parts[0]] = parts[1];
        }
    });
    return specs;
};

console.log('✅ Validators - załadowane');