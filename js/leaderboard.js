/**
 * Flappy Bird Cloud - Hệ thống Bảng xếp hạng Đa tầng (Firebase Firestore + Server API + LocalStorage)
 * Tương thích 100% với quy trình GitHub -> Vercel -> Firebase trong bài thuyết trình Điện toán đám mây
 */

// ==========================================
// 1. CẤU HÌNH FIREBASE FIRESTORE
// Bạn có thể giữ nguyên hoặc thay bằng firebaseConfig từ Project Firebase của bạn
// ==========================================
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA3vnklDHkGbJlMynjYye0o6c-cQbfH22A",
    authDomain: "rexx-3ad24.firebaseapp.com",
    projectId: "rexx-3ad24",
    storageBucket: "rexx-3ad24.firebasestorage.app",
    messagingSenderId: "422387830559",
    appId: "1:422387830559:web:ab1dce01886063205c6a2a",
    measurementId: "G-S3NHQH288Y"
};

// Tên collection trên Firestore (tách riêng hoặc dùng chung tùy ý)
const FIRESTORE_COLLECTION = "flappy_leaderboard";

// ==========================================
// 2. DATA PROVIDER: LOCAL STORAGE DỰ PHÒNG
// ==========================================
class LocalStorageDBProvider {
    constructor() {
        this.STORAGE_KEY = 'flappy_online_leaderboard_db';
        this.initDatabase();
    }

    initDatabase() {
        const existingData = localStorage.getItem(this.STORAGE_KEY);
        if (!existingData) {
            this.saveAll([]);
        }
    }

    getAll() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    saveAll(records) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
        } catch (e) {
            console.warn('Không thể lưu vào LocalStorage:', e);
        }
    }

    upsertScore(id, name, score) {
        const records = this.getAll();
        const idx = records.findIndex(r => r.id === id);
        const numScore = parseInt(score, 10) || 0;

        if (idx >= 0) {
            records[idx].name = name;
            if (numScore > (records[idx].score || 0)) {
                records[idx].score = numScore;
                records[idx].updatedAt = Date.now();
            }
        } else if (numScore > 0) {
            records.push({
                id,
                name,
                score: numScore,
                updatedAt: Date.now()
            });
        }
        records.sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt);
        this.saveAll(records);
        return records;
    }
}

// ==========================================
// 3. QUẢN LÝ NGƯỜI CHƠI & ĐỒNG BỘ FIREBASE
// ==========================================
class LeaderboardManager {
    constructor() {
        this.localDB = new LocalStorageDBProvider();
        this.firestoreDB = null;
        this.isFirebaseConnected = false;

        this.playerId = localStorage.getItem('flappy_player_id') || this.generatePlayerId();
        this.playerName = localStorage.getItem('flappy_player_name') || '';
        this.playerBest = parseInt(localStorage.getItem('flappy_player_best'), 10) || 0;

        this.initFirebase();
        this.bindUIEvents();
        this.checkPlayerProfile();
        this.refreshLeaderboard();
    }

    generatePlayerId() {
        const id = 'flappy_user_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36).slice(-4);
        localStorage.setItem('flappy_player_id', id);
        return id;
    }

    initFirebase() {
        try {
            if (typeof firebase !== 'undefined' && FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey) {
                if (!firebase.apps.length) {
                    firebase.initializeApp(FIREBASE_CONFIG);
                }
                this.firestoreDB = firebase.firestore();
                this.isFirebaseConnected = true;
                this.updateStatusBadge('🔥 Firebase Cloud', true);
            } else {
                this.updateStatusBadge('💾 Local Mode', false);
            }
        } catch (err) {
            console.warn('Chuyển sang chế độ Local do Firebase chưa sẵn sàng:', err);
            this.isFirebaseConnected = false;
            this.updateStatusBadge('💾 Local Mode', false);
        }
    }

    updateStatusBadge(text, isOnline) {
        const badgeText = document.getElementById('dbStatusText');
        const badge = document.getElementById('dbStatusBadge');
        if (badgeText) badgeText.textContent = text;
        if (badge) {
            badge.style.background = isOnline ? '#ecfdf5' : '#fef3c7';
            badge.style.color = isOnline ? '#059669' : '#d97706';
        }
    }

    bindUIEvents() {
        const editBtn = document.getElementById('editNameBtn');
        const saveBtn = document.getElementById('saveNameBtn');
        const cancelBtn = document.getElementById('cancelNameBtn');
        const refreshBtn = document.getElementById('refreshLeaderboardBtn');
        const nameInput = document.getElementById('playerNameInput');

        if (editBtn) {
            editBtn.addEventListener('click', () => this.openNameModal(true));
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.savePlayerName());
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeNameModal());
        }
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshLeaderboard());
        }
        if (nameInput) {
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.savePlayerName();
                }
            });
        }
    }

    checkPlayerProfile() {
        this.updateProfileBar();
        if (!this.playerName) {
            this.openNameModal(false);
        }
    }

    openNameModal(isEditing = false) {
        const modal = document.getElementById('playerNameModal');
        const input = document.getElementById('playerNameInput');
        const cancelBtn = document.getElementById('cancelNameBtn');
        if (!modal) return;

        if (cancelBtn) {
            cancelBtn.style.display = isEditing ? 'inline-flex' : 'none';
        }
        if (input) {
            input.value = this.playerName || '';
            setTimeout(() => input.focus(), 80);
        }
        modal.classList.add('active');
    }

    closeNameModal() {
        const modal = document.getElementById('playerNameModal');
        if (modal) modal.classList.remove('active');
    }

    async savePlayerName() {
        const input = document.getElementById('playerNameInput');
        let rawName = input ? input.value.trim() : '';
        if (!rawName) {
            rawName = 'Chim Én #' + this.playerId.slice(-3).toUpperCase();
        }
        this.playerName = rawName.substring(0, 15);
        localStorage.setItem('flappy_player_name', this.playerName);

        this.updateProfileBar();
        this.closeNameModal();

        if (this.playerBest > 0) {
            await this.submitScore(this.playerBest);
        } else {
            await this.refreshLeaderboard();
        }
    }

    updateProfileBar() {
        const nameEl = document.getElementById('profilePlayerName');
        const bestEl = document.getElementById('profilePlayerBest');
        const hiHeaderEl = document.getElementById('highScore');

        if (nameEl) nameEl.textContent = this.playerName || 'Khách';
        const formattedBest = String(this.playerBest).padStart(5, '0');
        if (bestEl) bestEl.textContent = formattedBest;
        if (hiHeaderEl) hiHeaderEl.textContent = 'HI ' + formattedBest;
    }

    async submitScore(newScore) {
        const scoreNum = parseInt(newScore, 10) || 0;
        if (scoreNum > this.playerBest) {
            this.playerBest = scoreNum;
            localStorage.setItem('flappy_player_best', String(this.playerBest));
        }
        this.updateProfileBar();

        const currentName = this.playerName || 'Phi Công Ẩn Danh';

        // 1. Lưu vào LocalStorage
        this.localDB.upsertScore(this.playerId, currentName, this.playerBest);

        // 2. Lưu lên Firebase Firestore nếu kết nối thành công
        if (this.isFirebaseConnected && this.firestoreDB && this.playerBest > 0) {
            try {
                const docRef = this.firestoreDB.collection(FIRESTORE_COLLECTION).doc(this.playerId);
                const docSnap = await docRef.get();
                let bestToSave = this.playerBest;
                if (docSnap.exists) {
                    const remoteScore = parseInt(docSnap.data().score, 10) || 0;
                    if (remoteScore > bestToSave) {
                        bestToSave = remoteScore;
                    }
                }
                await docRef.set({
                    name: currentName,
                    score: bestToSave,
                    updatedAt: Date.now()
                }, { merge: true });
                this.updateStatusBadge('🔥 Firebase Cloud', true);
            } catch (err) {
                console.warn('Không thể ghi điểm lên Firestore, dùng Local fallback:', err);
                this.updateStatusBadge('⚡ Local Synced', false);
            }
        }

        // 3. Thử đồng bộ qua API Server nội bộ (nếu chạy bằng node server.js)
        try {
            await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: this.playerId,
                    name: currentName,
                    score: this.playerBest
                })
            });
        } catch (_) {
            // Bỏ qua nếu đang chạy static trên Vercel
        }

        await this.refreshLeaderboard();
    }

    async refreshLeaderboard() {
        let records = [];

        // Ưu tiên lấy dữ liệu từ Firebase Firestore
        if (this.isFirebaseConnected && this.firestoreDB) {
            try {
                const snapshot = await this.firestoreDB
                    .collection(FIRESTORE_COLLECTION)
                    .orderBy('score', 'desc')
                    .limit(10)
                    .get();

                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data && typeof data.score === 'number') {
                        records.push({
                            id: doc.id,
                            name: data.name || 'Người chơi',
                            score: data.score,
                            updatedAt: data.updatedAt || 0
                        });
                    }
                });
                this.updateStatusBadge('🔥 Firebase Cloud', true);
            } catch (err) {
                console.warn('Đọc Firestore thất bại, chuyển sang nguồn dự phòng:', err);
            }
        }

        // Nếu Firestore trống hoặc chưa cấu hình, thử gọi API Server hoặc lấy từ LocalStorage
        if (records.length === 0) {
            try {
                const res = await fetch('/api/scores?limit=10');
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.scores)) {
                        records = data.scores;
                    }
                }
            } catch (_) {
                // Static hosting
            }
        }

        if (records.length === 0) {
            records = this.localDB.getAll();
        } else {
            // Gộp kỷ lục cá nhân hiện tại nếu vừa chơi xong
            const localAll = this.localDB.getAll();
            localAll.forEach(localItem => {
                if (!records.some(r => r.id === localItem.id)) {
                    records.push(localItem);
                }
            });
        }

        records.sort((a, b) => b.score - a.score || (a.updatedAt || 0) - (b.updatedAt || 0));
        this.renderLeaderboard(records);
    }

    renderLeaderboard(records) {
        const listEl = document.getElementById('leaderboardList');
        const noticeEl = document.getElementById('playerRankNotice');
        if (!listEl) return;

        const medals = ['🥇', '🥈', '🥉', '#4', '#5'];
        let html = '';

        for (let i = 0; i < 5; i++) {
            const item = records[i];
            if (item) {
                const isMe = item.id === this.playerId;
                const safeName = this.escapeHtml(item.name);
                const scoreStr = String(item.score).padStart(5, '0');
                html += `
                    <div class="leaderboard-row ${isMe ? 'is-me' : ''}">
                        <div class="rank-badge">${medals[i]}</div>
                        <div class="row-name">
                            ${safeName}
                            ${isMe ? '<span class="player-tag-me">BẠN</span>' : ''}
                        </div>
                        <div class="row-score">${scoreStr}</div>
                    </div>
                `;
            } else {
                html += `
                    <div class="leaderboard-row empty-row">
                        <div class="rank-badge">${medals[i]}</div>
                        <div class="row-name">Chưa có người chơi...</div>
                        <div class="row-score">-----</div>
                    </div>
                `;
            }
        }

        listEl.innerHTML = html;

        if (noticeEl) {
            const myIndex = records.findIndex(r => r.id === this.playerId);
            if (myIndex >= 0 && myIndex < 5) {
                noticeEl.textContent = `🎉 Xuất sắc! Bạn đang đứng hạng #${myIndex + 1} trong TOP 5 bảng xếp hạng!`;
            } else if (myIndex >= 5) {
                noticeEl.textContent = `💪 Bạn đang xếp hạng #${myIndex + 1}. Hãy vỗ cánh vượt qua các ống nước để lọt vào TOP 5!`;
            } else {
                noticeEl.textContent = `🚀 Hãy bay qua ít nhất 1 ống nước để ghi danh lên bảng xếp hạng Cloud!`;
            }
        }
    }

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.leaderboardManager = new LeaderboardManager();
});
