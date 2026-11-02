/**
 * Flappy Bird Cloud - Canvas Vector Sprites & Environment Renderer
 * Vẽ nhân vật Chim Flappy, Ống nước, Bầu trời, Đám mây, Thành phố & Hiệu ứng hạt
 */

const THEMES = [
    {
        name: 'Daylight',
        skyTop: '#38bdf8',
        skyBottom: '#bae6fd',
        cloudColor: 'rgba(255, 255, 255, 0.88)',
        cityColor: '#7dd3fc',
        cityFrontColor: '#38bdf8',
        groundTop: '#84cc16',
        groundMain: '#fde047',
        groundStripe: '#eab308',
        pipeMain: '#22c55e',
        pipeDark: '#15803d',
        pipeLight: '#86efac'
    },
    {
        name: 'Sunset',
        skyTop: '#f97316',
        skyBottom: '#fde047',
        cloudColor: 'rgba(254, 215, 170, 0.85)',
        cityColor: '#fb923c',
        cityFrontColor: '#ea580c',
        groundTop: '#65a30d',
        groundMain: '#fcd34d',
        groundStripe: '#d97706',
        pipeMain: '#10b981',
        pipeDark: '#047857',
        pipeLight: '#6ee7b7'
    },
    {
        name: 'Night Neon',
        skyTop: '#0f172a',
        skyBottom: '#1e1b4b',
        cloudColor: 'rgba(148, 163, 184, 0.25)',
        cityColor: '#1e293b',
        cityFrontColor: '#334155',
        groundTop: '#06b6d4',
        groundMain: '#1e293b',
        groundStripe: '#0891b2',
        pipeMain: '#8b5cf6',
        pipeDark: '#5b21b6',
        pipeLight: '#c4b5fd'
    }
];

const FlappySprites = {
    themes: THEMES,

    // Vẽ nền bầu trời + mặt trời/mặt trăng + thành phố xa
    drawBackground(ctx, width, height, groundHeight, scrollX, themeIndex) {
        const theme = THEMES[themeIndex % THEMES.length];

        // 1. Gradient bầu trời
        const grad = ctx.createLinearGradient(0, 0, 0, height - groundHeight);
        grad.addColorStop(0, theme.skyTop);
        grad.addColorStop(1, theme.skyBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height - groundHeight);

        // 2. Mặt trời / Mặt trăng
        ctx.save();
        if (themeIndex % 3 === 2) {
            // Sao đêm
            ctx.fillStyle = '#fef08a';
            for (let i = 0; i < 25; i++) {
                const sx = ((i * 97) % width);
                const sy = ((i * 53) % (height - groundHeight - 120));
                ctx.fillRect(sx, sy, 2, 2);
            }
            // Mặt trăng
            ctx.fillStyle = '#fef9c3';
            ctx.beginPath();
            ctx.arc(width - 120, 75, 28, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Mặt trời
            ctx.fillStyle = themeIndex % 3 === 1 ? '#fef08a' : '#fde047';
            ctx.beginPath();
            ctx.arc(width - 120, 75, 32, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // 3. Tòa nhà thành phố (Parallax)
        const cityScroll = (scrollX * 0.2) % 200;
        ctx.fillStyle = theme.cityColor;
        for (let x = -cityScroll; x < width + 200; x += 200) {
            ctx.fillRect(x, height - groundHeight - 95, 45, 95);
            ctx.fillRect(x + 50, height - groundHeight - 130, 55, 130);
            ctx.fillRect(x + 110, height - groundHeight - 75, 40, 75);
            ctx.fillRect(x + 155, height - groundHeight - 110, 40, 110);
        }
    },

    // Vẽ đám mây trôi
    drawCloud(ctx, cloud, themeIndex) {
        const theme = THEMES[themeIndex % THEMES.length];
        ctx.save();
        ctx.fillStyle = theme.cloudColor;
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.r * 0.85, cloud.y - cloud.r * 0.2, cloud.r * 0.85, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.r * 1.6, cloud.y + cloud.r * 0.05, cloud.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    // Vẽ ống nước trên & dưới
    drawPipe(ctx, pipe, canvasHeight, groundHeight, themeIndex) {
        const theme = THEMES[themeIndex % THEMES.length];
        const x = pipe.x;
        const w = pipe.width;
        const topH = pipe.topHeight;
        const bottomY = pipe.topHeight + pipe.gap;
        const bottomH = canvasHeight - groundHeight - bottomY;
        const capH = 24;
        const capOverhang = 5;

        ctx.save();

        // Hàm phụ vẽ thân ống có hiệu ứng 3D
        const drawCylinder = (rx, ry, rw, rh) => {
            ctx.fillStyle = theme.pipeMain;
            ctx.fillRect(rx, ry, rw, rh);

            // Vệt sáng bên trái
            ctx.fillStyle = theme.pipeLight;
            ctx.fillRect(rx + 6, ry, 8, rh);

            // Bóng tối bên phải
            ctx.fillStyle = theme.pipeDark;
            ctx.fillRect(rx + rw - 10, ry, 10, rh);

            // Viền ngoài
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.strokeRect(rx, ry, rw, rh);
        };

        // Ống trên
        if (topH > 0) {
            drawCylinder(x, 0, w, Math.max(0, topH - capH));
            drawCylinder(x - capOverhang, topH - capH, w + capOverhang * 2, capH);
        }

        // Ống dưới
        if (bottomH > 0) {
            drawCylinder(x, bottomY + capH, w, Math.max(0, bottomH - capH));
            drawCylinder(x - capOverhang, bottomY, w + capOverhang * 2, capH);
        }

        ctx.restore();
    },

    // Vẽ mặt đất chuyển động
    drawGround(ctx, width, height, groundHeight, scrollX, themeIndex) {
        const theme = THEMES[themeIndex % THEMES.length];
        const gy = height - groundHeight;

        ctx.save();
        // Lớp cỏ trên cùng
        ctx.fillStyle = theme.groundTop;
        ctx.fillRect(0, gy, width, 12);

        // Vạch chéo trên cỏ
        ctx.fillStyle = theme.groundStripe;
        const offset = scrollX % 28;
        for (let x = -offset; x < width + 28; x += 28) {
            ctx.beginPath();
            ctx.moveTo(x, gy + 12);
            ctx.lineTo(x + 12, gy);
            ctx.lineTo(x + 22, gy);
            ctx.lineTo(x + 10, gy + 12);
            ctx.closePath();
            ctx.fill();
        }

        // Phần đất chính
        ctx.fillStyle = theme.groundMain;
        ctx.fillRect(0, gy + 12, width, groundHeight - 12);

        // Đường viền mặt đất
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
        ctx.restore();
    },

    // Vẽ chú chim Flappy với hiệu ứng đập cánh & nghiêng góc
    drawBird(ctx, bird, frameCount) {
        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.rotate(bird.angle);

        const r = bird.radius;

        // Đuôi chim
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-r + 2, 0);
        ctx.lineTo(-r - 9, -6);
        ctx.lineTo(-r - 7, 6);
        ctx.closePath();
        ctx.fill();

        // Thân chim tròn
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        // Bụng sáng
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(-2, 4, r * 0.65, 0, Math.PI);
        ctx.fill();

        // Cánh đập theo frame
        const wingOffsetY = Math.sin(frameCount * 0.35) * 4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-4, 1 + wingOffsetY * 0.5, 8, 5.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Mắt trắng
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(6, -5, 6.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Con ngươi
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(8, -5, 2.6, 0, Math.PI * 2);
        ctx.fill();

        // Mỏ chim cam đỏ
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(r - 2, -2);
        ctx.lineTo(r + 11, 2);
        ctx.lineTo(r - 2, 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
};

window.FlappySprites = FlappySprites;
