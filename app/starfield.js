(function () {
    'use strict';

    if (window.__luavexStarfield) return;
    const canvas = document.getElementById('starfieldCanvas');
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const state = { width: 0, height: 0, scale: 1, stars: [], points: [], frame: 0, lastTime: 0 };
    const random = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);

    const createStar = (initial = false) => {
        const depth = random(.45, 1);
        return {
            x: initial ? random(-state.width * .15, state.width) : random(-180, -30),
            y: random(12, state.height - 12),
            length: random(48, 132) * depth,
            speed: random(235, 410) * depth,
            alpha: random(.12, .38) * depth,
            width: random(.45, 1.05),
            rise: random(.12, .2)
        };
    };

    const createPoint = depth => {
        const far = depth === 0;
        return {
            x: random(0, state.width), y: random(0, state.height), depth,
            radius: far ? random(.3, .65) : random(.6, 1.15),
            alpha: far ? random(.075, .2) : random(.13, .32),
            phase: random(0, Math.PI * 2), pulse: Math.random() < (far ? .38 : .22),
            pulseSpeed: random(.45, 1.1), drift: far ? random(1.2, 3.2) : random(3.5, 7.5)
        };
    };

    const starCount = () => Math.max(10, Math.min(21, Math.round((state.width * state.height) / 70000)));
    const populate = () => {
        state.stars = Array.from({ length: starCount() }, () => createStar(true));
        const farCount = Math.max(42, Math.min(105, Math.round((state.width * state.height) / 14500)));
        const mediumCount = Math.max(18, Math.min(46, Math.round((state.width * state.height) / 36000)));
        state.points = [
            ...Array.from({ length: farCount }, () => createPoint(0)),
            ...Array.from({ length: mediumCount }, () => createPoint(1))
        ];
    };
    const resize = () => {
        state.width = innerWidth;
        state.height = innerHeight;
        state.scale = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(state.width * state.scale);
        canvas.height = Math.round(state.height * state.scale);
        canvas.style.width = `${state.width}px`;
        canvas.style.height = `${state.height}px`;
        context.setTransform(state.scale, 0, 0, state.scale, 0, 0);
        populate();
    };

    const drawStar = star => {
        const tailX = star.x - star.length;
        const tailY = star.y + star.length * star.rise;
        context.globalAlpha = star.alpha;
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(star.x, star.y);
        context.strokeStyle = '#f7f9ff';
        context.lineWidth = star.width;
        context.lineCap = 'round';
        context.stroke();
        context.beginPath();
        context.arc(star.x, star.y, Math.max(.45, star.width * .72), 0, Math.PI * 2);
        context.globalAlpha = Math.min(.56, star.alpha * 1.45);
        context.fillStyle = '#fff';
        context.fill();
        context.globalAlpha = 1;
    };

    const drawPoints = (time, delta) => {
        for (let index = 0; index < state.points.length; index++) {
            const point = state.points[index];
            point.x += point.drift * delta;
            point.y -= point.drift * .12 * delta;
            if (point.x > state.width + 3 || point.y < -3) {
                point.x = random(-12, 0); point.y = random(0, state.height);
            }
            const pulse = point.pulse ? .62 + Math.sin(time * .001 * point.pulseSpeed + point.phase) * .38 : 1;
            context.globalAlpha = point.alpha * pulse;
            context.beginPath();
            context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
            context.fillStyle = '#fff';
            context.fill();
            if (point.pulse && pulse > .82) {
                context.globalAlpha = point.alpha * .075 * pulse;
                context.beginPath();
                context.arc(point.x, point.y, point.radius * 3.2, 0, Math.PI * 2);
                context.fill();
            }
        }
        context.globalAlpha = 1;
    };

    const render = time => {
        if (reducedMotion.matches || document.hidden) { state.frame = 0; return; }
        const delta = Math.min((time - (state.lastTime || time)) / 1000, .035);
        state.lastTime = time;
        context.clearRect(0, 0, state.width, state.height);
        drawPoints(time, delta);
        for (let index = 0; index < state.stars.length; index++) {
            const star = state.stars[index];
            star.x += star.speed * delta;
            star.y -= star.speed * star.rise * delta;
            if (star.x - star.length > state.width + 40 || star.y < -40) state.stars[index] = createStar();
            drawStar(state.stars[index]);
        }
        state.frame = requestAnimationFrame(render);
    };

    const syncMotion = () => {
        cancelAnimationFrame(state.frame);
        context.clearRect(0, 0, state.width, state.height);
        state.lastTime = 0;
        if (!reducedMotion.matches && !document.hidden) state.frame = requestAnimationFrame(render);
    };
    addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', syncMotion);
    reducedMotion.addEventListener?.('change', syncMotion);
    window.__luavexStarfield = Object.freeze({ canvas, syncMotion });
    resize();
    syncMotion();
})();
