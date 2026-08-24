// ============================================
//   FUNKCJE POMOCNICZE
// ============================================

window.getBrowserName = function(userAgent) {
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Inna';
};

window.getDeviceType = function(userAgent) {
    if (userAgent.includes('iPhone') || userAgent.includes('Android')) return 'Mobile';
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) return 'Tablet';
    return 'PC';
};

window.generateLicenseKey = function() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) key += '-';
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
};

window.formatPrice = function(price) {
    return price.toFixed(2) + ' zł';
};

window.truncateText = function(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

console.log('✅ Helpers - załadowane');