/**
 * Flappy Bird Cloud - Core Game Engine
 * Điều khiển vật lý bay, sinh ống nước ngẫu nhiên, tính điểm, hiệu ứng hạt và vòng lặp 60FPS
 */

class FlappyBirdGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.width = this.canvas.width;   // 1000
        this.height = this.canvas.height; // 420
        this.groundHeight = 52;

        // Trạng thái game
        this.state = 'WAITING'; // WAITING, PLAYING, PAUSED, GAMEOVER
        this.score = 0;
        this.frameCount = 0;
        this.scrollX = 0;
        this.baseSpeed = 3.6;
        this.currentSpeed = this.baseSpeed;
        this.themeIndex = 0;

        // Đối tượng chú chim Flappy
        this.bird = {
            x: 190,
            y: 180,
            radius: 17,
            vy: 0,
            gravity: 0.36,
            jumpStrength: -7.2,
            diveBoost: 3.5,
            angle: 0
        };

        // Danh sách ống nước, đám mây và hạt hiệu ứng
        this.pipes = [];
        this.clouds = [];
        this.particles = [];

        this.initClouds();
        this.bindControls();
        this.loop();
    }

    initClouds() {
        this.clouds = [
            { x: 140, y: 65, r: 22, speed: 0.6 },
            { x: 420, y: 95, r: 28, speed: 0.45 },
            { x: 720, y: 55, r: 24, speed: 0.55 },
            { x: 920, y: 85, r: 20, speed: 0.5 }
        ];
    }

    bindControls() {
        // Bàn phím
        window.addEventListener('keydown', (e) => {
            const modal = document.getElementById('playerNameModal');
            if (modal && modal.classList.contains('active')) return;

            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault();
                if (this.state === 'GAMEOVER') {
                    this.restartGame();
                } else {
                    this.flap();
                }
            } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                e.preventDefault();
                this.dive();
            } else if (e.code === 'Enter' && this.state === 'GAMEOVER') {
                e.preventDefault();
                this.restartGame();
            } else if (e.code === 'KeyP') {
                e.preventDefault();
                this.togglePause();
            } else if (e.code === 'KeyM') {
                e.preventDefault();
                this.toggleMute();
            } else if (e.code === 'KeyT') {
                e.preventDefault();
                this.cycleTheme();
            }
        });

        // Click chuột trên Canvas
        this.canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (this.state === 'WAITING' || this.state === 'PLAYING') {
                this.flap();
            }
        });

        // Nút công cụ
        const muteBtn = document.getElementById('muteBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const themeBtn = document.getElementById('themeBtn');
        const restartBtn = document.getElementById('restartBtn');
        const btnJumpMobile = document.getElementById('btnJumpMobile');
        const btnDiveMobile = document.getElementById('btnDiveMobile');

        if (muteBtn) muteBtn.addEventListener('click', () => this.toggleMute());
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());
        if (themeBtn) themeBtn.addEventListener('click', () => this.cycleTheme());
        if (restartBtn) restartBtn.addEventListener('click', () => this.restartGame());

        if (btnJumpMobile) {
            btnJumpMobile.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (this.state === 'GAMEOVER') this.restartGame();
                else this.flap();
            });
        }
        if (btnDiveMobile) {
            btnDiveMobile.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.dive();
            });
        }
    }

    flap() {
        if (this.state === 'PAUSED' || this.state === 'GAMEOVER') return;

        if (this.state === 'WAITING') {
            this.state = 'PLAYING';
            const prompt = document.getElementById('startPrompt');
            if (prompt) prompt.style.display = 'none';
        }

        this.bird.vy = this.bird.jumpStrength;
        if (window.soundManager) window.soundManager.playFlap();

        // Tạo hạt lông vũ / bụi sáng khi vỗ cánh
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x: this.bird.x - 10,
                y: this.bird.y + 4,
                vx: -Math.random() * 2.5 - 1,
                vy: (Math.random() - 0.5) * 3,
                life: 22,
                color: '#fef08a',
                size: Math.random() * 4 + 2
            });
        }
    }

    dive() {
        if (this.state === 'PLAYING') {
            this.bird.vy += this.bird.diveBoost;
        }
    }

    togglePause() {
        const pauseModal = document.getElementById('pauseModal');
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            if (pauseModal) pauseModal.classList.add('active');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            if (pauseModal) pauseModal.classList.remove('active');
        }
    }

    toggleMute() {
        if (!window.soundManager) return;
        const muted = window.soundManager.toggleMute();
        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            muteBtn.innerHTML = muted
                ? '🔇 <span class="btn-text">Muted</span>'
                : '🔊 <span class="btn-text">Sound</span>';
        }
    }

    cycleTheme() {
        this.themeIndex = (this.themeIndex + 1) % 3;
    }

    spawnPipe() {
        const playableHeight = this.height - this.groundHeight;
        // Khoảng hở giảm nhẹ khi điểm cao nhưng vẫn đảm bảo công bằng
        const gap = Math.max(108, 138 - Math.floor(this.score * 0.6));
        const minTop = 42;
        const maxTop = playableHeight - gap - 48;
        const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

        this.pipes.push({
            x: this.width + 20,
            width: 64,
            topHeight: topHeight,
            gap: gap,
            passed: false
        });
    }

    update() {
        this.frameCount++;

        // Đám mây luôn trôi nhẹ
        this.clouds.forEach(c => {
            c.x -= c.speed;
            if (c.x + c.r * 2 < 0) {
                c.x = this.width + 40;
            }
        });

        if (this.state === 'WAITING') {
            // Chim bay lơ lửng nhẹ nhàng ở màn hình chờ
            this.bird.y = 180 + Math.sin(this.frameCount * 0.08) * 9;
            this.bird.angle = 0;
            this.scrollX += 1.5;
            return;
        }

        if (this.state !== 'PLAYING') return;

        // Tăng tốc độ nhẹ theo điểm số
        this.currentSpeed = Math.min(6.4, this.baseSpeed + Math.floor(this.score / 5) * 0.22);
        this.scrollX += this.currentSpeed;

        // Vật lý chim
        this.bird.vy += this.bird.gravity;
        this.bird.y += this.bird.vy;

        // Góc nghiêng đầu chim theo vận tốc rơi
        if (this.bird.vy < 0) {
            this.bird.angle = -0.32;
        } else {
            this.bird.angle = Math.min(Math.PI / 2.4, this.bird.vy * 0.07);
        }

        // Chạm trần
        if (this.bird.y - this.bird.radius < 0) {
            this.bird.y = this.bird.radius;
            this.bird.vy = 0;
        }

        // Chạm mặt đất -> Game Over
        const groundY = this.height - this.groundHeight;
        if (this.bird.y + this.bird.radius >= groundY) {
            this.bird.y = groundY - this.bird.radius;
            this.triggerGameOver();
            return;
        }

        // Sinh ống nước định kỳ
        const lastPipe = this.pipes[this.pipes.length - 1];
        const minSpacing = Math.max(245, 310 - this.score * 1.5);
        if (!lastPipe || (this.width - lastPipe.x >= minSpacing)) {
            this.spawnPipe();
        }

        // Cập nhật ống nước & kiểm tra va chạm
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= this.currentSpeed;

            // Kiểm tra ghi điểm
            if (!p.passed && p.x + p.width < this.bird.x) {
                p.passed = true;
                this.score++;
                this.updateScoreUI();
                if (window.soundManager) window.soundManager.playPoint();

                // Tự động chuyển bầu trời mỗi 10 điểm
                if (this.score > 0 && this.score % 10 === 0) {
                    this.themeIndex = (this.themeIndex + 1) % 3;
                }
            }

            // Kiểm tra va chạm hộp (AABB với bán kính thu gọn để cảm giác chơi mượt)
            const hitBoxR = this.bird.radius - 3;
            const withinPipeX = (this.bird.x + hitBoxR > p.x) && (this.bird.x - hitBoxR < p.x + p.width);
            if (withinPipeX) {
                const hitTop = (this.bird.y - hitBoxR < p.topHeight);
                const hitBottom = (this.bird.y + hitBoxR > p.topHeight + p.gap);
                if (hitTop || hitBottom) {
                    this.triggerGameOver();
                    return;
                }
            }

            // Xóa ống đã khuất màn hình
            if (p.x + p.width < -20) {
                this.pipes.splice(i, 1);
            }
        }

        // Cập nhật hạt hiệu ứng
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life--;
            if (pt.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateScoreUI() {
        const curEl = document.getElementById('currentScore');
        if (curEl) {
            curEl.textContent = String(this.score).padStart(5, '0');
        }
        if (window.leaderboardManager && this.score > window.leaderboardManager.playerBest) {
            const hiEl = document.getElementById('highScore');
            if (hiEl) {
                hiEl.textContent = 'HI ' + String(this.score).padStart(5, '0');
            }
        }
    }

    triggerGameOver() {
        this.state = 'GAMEOVER';
        if (window.soundManager) window.soundManager.playHit();

        // Lưu điểm lên Firebase & LocalStorage
        if (window.leaderboardManager) {
            window.leaderboardManager.submitScore(this.score);
        }

        const bestScore = window.leaderboardManager
            ? Math.max(this.score, window.leaderboardManager.playerBest)
            : this.score;

        let medal = '🥉 Đồng';
        if (this.score >= 30) medal = '💎 Kim Cương';
        else if (this.score >= 20) medal = '🥇 Vàng';
        else if (this.score >= 10) medal = '🥈 Bạc';

        const finalScoreEl = document.getElementById('finalScoreText');
        const medalEl = document.getElementById('medalText');
        const bestScoreEl = document.getElementById('bestScoreText');
        const gameOverModal = document.getElementById('gameOverModal');

        if (finalScoreEl) finalScoreEl.textContent = this.score;
        if (medalEl) medalEl.textContent = medal;
        if (bestScoreEl) bestScoreEl.textContent = bestScore;
        if (gameOverModal) gameOverModal.classList.add('active');
    }

    restartGame() {
        this.state = 'WAITING';
        this.score = 0;
        this.currentSpeed = this.baseSpeed;
        this.pipes = [];
        this.particles = [];
        this.bird.y = 180;
        this.bird.vy = 0;
        this.bird.angle = 0;

        this.updateScoreUI();

        const gameOverModal = document.getElementById('gameOverModal');
        const pauseModal = document.getElementById('pauseModal');
        const prompt = document.getElementById('startPrompt');

        if (gameOverModal) gameOverModal.classList.remove('active');
        if (pauseModal) pauseModal.classList.remove('active');
        if (prompt) prompt.style.display = 'block';
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // 1. Nền trời & thành phố
        window.FlappySprites.drawBackground(
            ctx,
            this.width,
            this.height,
            this.groundHeight,
            this.scrollX,
            this.themeIndex
        );

        // 2. Đám mây
        this.clouds.forEach(c => {
            window.FlappySprites.drawCloud(ctx, c, this.themeIndex);
        });

        // 3. Ống nước
        this.pipes.forEach(p => {
            window.FlappySprites.drawPipe(ctx, p, this.height, this.groundHeight, this.themeIndex);
        });

        // 4. Hạt hiệu ứng
        this.particles.forEach(pt => {
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // 5. Mặt đất
        window.FlappySprites.drawGround(
            ctx,
            this.width,
            this.height,
            this.groundHeight,
            this.scrollX,
            this.themeIndex
        );

        // 6. Chú chim Flappy
        window.FlappySprites.drawBird(ctx, this.bird, this.frameCount);

        // 7. Điểm số lớn giữa màn hình khi đang bay
        if (this.state === 'PLAYING') {
            ctx.save();
            ctx.font = '900 38px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 5;
            ctx.strokeText(String(this.score), this.width / 2, 58);
            ctx.fillText(String(this.score), this.width / 2, 58);
            ctx.restore();
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.flappyGame = new FlappyBirdGame();
});
