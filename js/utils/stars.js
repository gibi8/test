// ============================================
//   GWIAZDY - ANIMACJA TŁA
// ============================================

window.initStars = function() {
    try {
        const canvas = document.getElementById('stars-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        const stars = [];
        for (let i = 0; i < 200; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 1.5 + 0.5,
                alpha: Math.random(),
                speed: Math.random() * 0.005 + 0.002
            });
        }
        
        function animateStars() {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(star => {
                star.alpha += star.speed;
                if (star.alpha > 1 || star.alpha < 0.2) star.speed = -star.speed;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
                ctx.fill();
            });
            requestAnimationFrame(animateStars);
        }
        animateStars();
    } catch(e) {
        console.log('Błąd initStars:', e);
    }
};

console.log('✅ Stars - załadowane');