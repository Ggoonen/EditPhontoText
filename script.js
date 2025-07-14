import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getDatabase, ref, set, get, onValue, update } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js';

// تهيئة Firebase
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // استبدل هذا بمفتاح API الخاص بك
    authDomain: "YOUR_AUTH_DOMAIN", // استبدل هذا بنطاق المصادقة الخاص بك
    databaseURL: "YOUR_DATABASE_URL", // استبدل هذا بعنوان URL لقاعدة البيانات الخاصة بك
    projectId: "YOUR_PROJECT_ID", // استبدل هذا بمعرف المشروع الخاص بك
    storageBucket: "YOUR_STORAGE_BUCKET", // استبدل هذا بسلة التخزين الخاصة بك
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // استبدل هذا بمعرف مرسل الرسائل الخاص بك
    appId: "YOUR_APP_ID" // استبدل هذا بمعرف التطبيق الخاص بك
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// المتغيرات العامة
let userId = null;
let playerName = "لاعب جديد";
let dollars = 0;
let points = 0;
let totalPower = 0;
let innovationLevel = 1;
let innovationCost = 100;
let innovationPowerIncrease = 10;
let accumulatedDollars = 0;
let accumulatedPoints = 0;
let accumulatedPower = 0;
let lastCollectTime = 0; // Timestamp of last collection
const COLLECT_COOLDOWN_DURATION = 1 * 60 * 1000; // 1 minute in milliseconds
let collectCountdownInterval = null;

let isNameSetPermanently = false;
let lastPlayerNameChangeTimestamp = 0;
const NAME_CHANGE_COOLDOWN_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
let nameChangeCount = 0; // New: Track name changes
const MAX_NAME_CHANGES = 3; // New: Max allowed name changes

let activeHouseIndex = 0; // Index of the currently active house
let houses = [
    { id: 1, power: 1, unlocked: true, threshold: 25000, rewardedThresholds: [] }, // Max power for this house to unlock next
    { id: 2, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] },
    { id: 3, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] },
    { id: 4, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] }
];

let challengeState = 'ATTACK_READY'; // 'ATTACK_READY', 'COOLDOWN'
let currentChallengePlayer = null;
let challengeTimerRemaining = 0; // in seconds
let challengeTimerInterval = null;
let challengeLog = []; // { opponentName, result (win/lose), playerPower, opponentPower }

let notifications = []; // { message, type (success, error, info), timestamp }
const MAX_NOTIFICATIONS = 5;

// العناصر من DOM
const loadingOverlay = document.getElementById('loading-overlay');
const appDiv = document.getElementById('app');

const playerNameDisplay = document.getElementById('player-name');
const totalPowerDisplay = document.getElementById('total-power');
const playerDollarsDisplay = document.getElementById('player-dollars');
const playerPointsDisplay = document.getElementById('player-points');
const playerPowerDisplay = document.getElementById('player-power');

const innovationButton = document.getElementById('innovation-button');
const innovationCostDisplay = document.getElementById('innovation-cost');
const currentInnovationPowerDisplay = document.getElementById('current-innovation-power');
const housesProgressContainer = document.getElementById('houses-progress');
const currentHousePowerDisplay = document.getElementById('current-house-power-display');
const nextHouseThresholdDisplay = document.getElementById('next-house-threshold');

const challengeStatusDisplay = document.getElementById('challengeStatus');
const targetPlayerCard = document.getElementById('targetPlayerCard');
const targetPlayerNameDisplay = document.getElementById('targetPlayerName');
const targetPlayerPowerDisplay = document.getElementById('targetPlayerPower');
const attackButton = document.getElementById('attackButton');
const cooldownTimerDisplay = document.getElementById('cooldownTimer');
const timerDisplay = document.getElementById('timerDisplay');
const challengeResultDisplay = document.getElementById('challengeResult');
const challengeLogList = document.getElementById('challenge-log');

const accumulatedDollarsDisplay = document.getElementById('accumulated-dollars-display');
const accumulatedPointsDisplay = document.getElementById('accumulated-points-display');
const accumulatedPowerDisplay = document.getElementById('accumulated-power-display');
const collectDollarsButton = document.getElementById('collect-dollars-button');
const collectTimerDisplay = document.getElementById('collect-timer-display');
const collectCountdownDisplay = document.getElementById('collect-countdown');

const sidebar = document.getElementById('sidebar');
const settingsButton = document.getElementById('settings-button');
const closeSidebarButton = document.getElementById('close-sidebar');

const settingsModal = document.getElementById('settings-modal');
const closeSettingsModalButton = document.getElementById('close-settings-modal');
const playerNameInput = document.getElementById('player-name-input');
const setNameConfirmButton = document.getElementById('set-name-confirm-button');
const nameChangeCooldownMessage = document.getElementById('name-change-cooldown-message');
const nameChangeCooldownDisplay = document.getElementById('name-change-cooldown-display');
const saveGameButton = document.getElementById('save-game-button');
const loadGameButton = document.getElementById('load-game-button');
const resetGameButton = document.getElementById('reset-game-button');

const messageModal = document.getElementById('message-modal');
const messageModalTitle = document.getElementById('message-modal-title');
const messageModalBody = document.getElementById('message-modal-body');
const messageModalOkButton = document.getElementById('message-modal-ok');

const notificationsList = document.getElementById('notifications-list');

// عناصر التنقل (views)
const navDashboard = document.getElementById('nav-dashboard');
const navInnovation = document.getElementById('nav-innovation');
const navChallenge = document.getElementById('nav-challenge');
const navClan = document.getElementById('nav-clan');
const navRanking = document.getElementById('nav-ranking');
const navMarket = document.getElementById('nav-market');
const navAllPlayers = document.getElementById('nav-all-players');

const dashboardView = document.getElementById('dashboard-view');
const innovationView = document.getElementById('innovation-view');
const challengeView = document.getElementById('challenge-view');
const clanView = document.getElementById('clan-view');
const rankingView = document.getElementById('ranking-view');
const marketView = document.getElementById('market-view');
const allPlayersView = document.getElementById('all-players-view');
const rankingList = document.getElementById('ranking-list');
const allPlayersList = document.getElementById('all-players-list');

// وظائف عامة
function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
        view.classList.remove('active');
    });
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.classList.remove('hidden');
        activeView.classList.add('active');
        // تحديثات خاصة لكل عرض
        if (viewId === 'ranking-view') {
            fetchRanking();
        } else if (viewId === 'all-players-view') {
            fetchAllPlayers();
        } else if (viewId === 'challenge-view') {
            startChallengeFlow(); // Start or resume challenge flow when entering view
        }
    }
    sidebar.classList.remove('open'); // إغلاق الشريط الجانبي بعد اختيار العرض
}

function showMessageModal(title, message, type = 'info') {
    messageModalTitle.textContent = title;
    messageModalBody.textContent = message;
    // يمكنك إضافة تنسيقات بناءً على النوع (type) هنا
    messageModal.classList.remove('hidden');
}

function addNotification(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    notifications.unshift({ message, type, timestamp }); // Add to the beginning

    // Keep only the latest MAX_NOTIFICATIONS
    if (notifications.length > MAX_NOTIFICATIONS) {
        notifications = notifications.slice(0, MAX_NOTIFICATIONS);
    }
    renderNotifications();
    saveNotifications(); // Save to Firebase
}

function renderNotifications() {
    notificationsList.innerHTML = '';
    if (notifications.length === 0) {
        notificationsList.innerHTML = '<p class="text-gray-400">لا توجد إشعارات حالياً.</p>';
        return;
    }
    notifications.forEach(notif => {
        const p = document.createElement('p');
        let textColorClass = 'text-gray-300';
        if (notif.type === 'success') {
            textColorClass = 'text-green-400';
        } else if (notif.type === 'error') {
            textColorClass = 'text-red-400';
        } else if (notif.type === 'info') {
            textColorClass = 'text-blue-400';
        }
        p.className = `text-sm ${textColorClass}`;
        p.innerHTML = `<span class="text-gray-500 text-xs ml-2">[${notif.timestamp}]</span> ${notif.message}`;
        notificationsList.appendChild(p);
    });
}

function updateUI() {
    playerNameDisplay.textContent = playerName;
    playerDollarsDisplay.textContent = dollars.toLocaleString();
    playerPointsDisplay.textContent = points.toLocaleString();
    playerPowerDisplay.textContent = totalPower.toLocaleString();
    totalPowerDisplay.textContent = totalPower.toLocaleString();
    dashboardPlayerName.textContent = playerName;
    dashboardActiveHouse.textContent = `البيت ${houses[activeHouseIndex].id}`;
    dashboardHousePower.textContent = houses[activeHouseIndex].power.toLocaleString();

    currentInnovationPowerDisplay.textContent = innovationLevel.toLocaleString();
    innovationCostDisplay.textContent = innovationCost.toLocaleString();
    currentHousePowerDisplay.textContent = houses[activeHouseIndex].power.toLocaleString();
    updateNextHouseInfo();

    accumulatedDollarsDisplay.textContent = `$${Math.floor(accumulatedDollars).toLocaleString()}`;
    accumulatedPointsDisplay.textContent = Math.floor(accumulatedPoints).toLocaleString();
    accumulatedPowerDisplay.textContent = Math.floor(accumulatedPower).toLocaleString();

    updateCollectButtonState();
    renderHousesProgress();
    renderNotifications(); // Render notifications on UI update
}

function updateCollectButtonState() {
    const now = Date.now();
    if (now - lastCollectTime < COLLECT_COOLDOWN_DURATION) {
        collectDollarsButton.disabled = true;
        collectDollarsButton.classList.add('opacity-50', 'cursor-not-allowed');
        collectTimerDisplay.style.display = 'block';
        startCollectCountdown();
    } else {
        collectDollarsButton.disabled = false;
        collectDollarsButton.classList.remove('opacity-50', 'cursor-not-allowed');
        collectTimerDisplay.style.display = 'none';
        stopCollectCountdown();
    }
}

function startCollectCountdown() {
    if (collectCountdownInterval) clearInterval(collectCountdownInterval);
    collectCountdownInterval = setInterval(() => {
        const now = Date.now();
        const timeLeftMs = COLLECT_COOLDOWN_DURATION - (now - lastCollectTime);
        if (timeLeftMs <= 0) {
            clearInterval(collectCountdownInterval);
            updateCollectButtonState();
            return;
        }
        const minutes = Math.floor(timeLeftMs / (1000 * 60));
        const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);
        collectCountdownDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopCollectCountdown() {
    if (collectCountdownInterval) {
        clearInterval(collectCountdownInterval);
        collectCountdownInterval = null;
    }
}

function updateNextHouseInfo() {
    const currentHouse = houses[activeHouseIndex];
    const nextHouseIndex = activeHouseIndex + 1;

    if (nextHouseIndex < houses.length) {
        const nextHouse = houses[nextHouseIndex];
        nextHouseThresholdDisplay.textContent = nextHouse.threshold.toLocaleString();
    } else {
        nextHouseThresholdDisplay.textContent = 'لا يوجد بيت قادم';
    }
}

function renderHousesProgress() {
    housesProgressContainer.innerHTML = '';
    houses.forEach((house, index) => {
        const isCurrent = (index === activeHouseIndex);
        const isUnlocked = house.unlocked;
        const progress = Math.min(100, (house.power / house.threshold) * 100);
        const barColor = isUnlocked ? 'bg-green-500' : 'bg-gray-500';
        const textColor = isUnlocked ? 'text-green-300' : 'text-gray-300';
        const borderColor = isCurrent ? 'border-2 border-indigo-400' : 'border border-gray-600';

        const houseDiv = document.createElement('div');
        houseDiv.className = `flex flex-col p-2 rounded-lg ${borderColor} mb-3 transition duration-300 ease-in-out`;
        if (isCurrent) {
            houseDiv.classList.add('bg-gray-600');
        } else if (isUnlocked) {
            houseDiv.classList.add('bg-gray-700');
        } else {
            houseDiv.classList.add('bg-gray-800', 'opacity-75');
        }


        houseDiv.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span class="text-lg font-semibold ${textColor}">البيت ${house.id} ${isCurrent ? '(الحالي)' : ''}</span>
                <span class="text-sm ${textColor}">${isUnlocked ? 'مفتوح' : 'مغلق'}</span>
            </div>
            <div class="flex items-center">
                <div class="w-full bg-gray-600 rounded-full h-2">
                    <div class="${barColor} h-2 rounded-full" style="width: ${progress}%;"></div>
                </div>
                <span class="text-xs ${textColor} ml-2">${Math.round(progress)}%</span>
            </div>
            <p class="text-xs text-gray-400 mt-1">القوة: ${house.power.toLocaleString()}/${house.threshold.toLocaleString()}</p>
        `;
        housesProgressContainer.appendChild(houseDiv);
    });
}

// دمج وإعدادات Firebase
onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
        loadPlayerData();
        loadHouses();
        loadChallengeLog();
        loadNotifications();
        listenForPlayerUpdates(); // Start listening for other players' updates
        listenForOnlineUsers(); // Start listening for all online/offline users
        startAccumulationLoop(); // Start accumulating resources
        updateOnlineStatus(true); // Set user online
        appDiv.classList.remove('hidden');
        loadingOverlay.classList.add('hidden');
        showView('dashboard-view'); // عرض لوحة القيادة بعد التحميل
    } else {
        signInAnonymously(auth)
            .catch((error) => {
                console.error("Error signing in anonymously: ", error);
                showMessageModal('خطأ', 'فشل تسجيل الدخول التلقائي. يرجى المحاولة مرة أخرى.', 'error');
            });
    }
});

// وظائف حفظ وتحميل البيانات
function savePlayerData() {
    if (userId) {
        set(ref(database, 'users/' + userId + '/data'), {
            playerName: playerName,
            dollars: dollars,
            points: points,
            totalPower: totalPower,
            innovationLevel: innovationLevel,
            innovationCost: innovationCost,
            accumulatedDollars: accumulatedDollars,
            accumulatedPoints: accumulatedPoints,
            accumulatedPower: accumulatedPower,
            lastCollectTime: lastCollectTime,
            isNameSetPermanently: isNameSetPermanently,
            lastPlayerNameChangeTimestamp: lastPlayerNameChangeTimestamp,
            nameChangeCount: nameChangeCount, // Save name change count
            lastOnline: Date.now() // Update last online timestamp
        }).then(() => {
            console.log("Player data saved successfully!");
            // addNotification('تم حفظ بياناتك بنجاح.', 'success'); // Optional: show notification on save
        }).catch((error) => {
            console.error("Error saving player data: ", error);
            showMessageModal('خطأ', 'فشل حفظ البيانات. يرجى التحقق من اتصالك.', 'error');
        });
    }
}

function loadPlayerData() {
    if (userId) {
        get(ref(database, 'users/' + userId + '/data')).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                playerName = data.playerName || "لاعب جديد";
                dollars = data.dollars || 0;
                points = data.points || 0;
                totalPower = data.totalPower || 0;
                innovationLevel = data.innovationLevel || 1;
                innovationCost = data.innovationCost || 100;
                accumulatedDollars = data.accumulatedDollars || 0;
                accumulatedPoints = data.accumulatedPoints || 0;
                accumulatedPower = data.accumulatedPower || 0;
                lastCollectTime = data.lastCollectTime || 0;
                isNameSetPermanently = data.isNameSetPermanently || false;
                lastPlayerNameChangeTimestamp = data.lastPlayerNameChangeTimestamp || 0;
                nameChangeCount = data.nameChangeCount || 0; // Load name change count
            } else {
                savePlayerData();
            }
            updateUI();
        }).catch((error) => {
            console.error("Error loading player data: ", error);
            showMessageModal('خطأ', 'فشل تحميل البيانات. يرجى التحقق من اتصالك.', 'error');
        });
    }
}

function saveHouses() {
    if (userId) {
        set(ref(database, 'users/' + userId + '/houses'), houses)
            .then(() => console.log("Houses saved successfully"))
            .catch(error => console.error("Error saving houses: ", error));
        set(ref(database, 'users/' + userId + '/activeHouseIndex'), activeHouseIndex)
            .then(() => console.log("Active house index saved successfully"))
            .catch(error => console.error("Error saving active house index: ", error));
    }
}

function loadHouses() {
    if (userId) {
        get(ref(database, 'users/' + userId + '/houses')).then((snapshot) => {
            if (snapshot.exists()) {
                houses = snapshot.val();
                // Ensure houses array has exactly 4 elements. If not, reset or adjust.
                if (!Array.isArray(houses) || houses.length !== 4) {
                    houses = [
                        { id: 1, power: 1, unlocked: true, threshold: 25000, rewardedThresholds: [] },
                        { id: 2, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] },
                        { id: 3, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] },
                        { id: 4, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] }
                    ];
                    saveHouses(); // Save the corrected structure
                } else {
                    // Ensure all houses have required properties (e.g., rewardedThresholds)
                    houses.forEach(house => {
                        if (!house.rewardedThresholds) {
                            house.rewardedThresholds = [];
                        }
                        if (typeof house.threshold === 'undefined') {
                            house.threshold = 25000; // Default threshold if missing
                        }
                    });
                }
            } else {
                saveHouses(); // Save default houses if not found
            }
        }).then(() => {
            return get(ref(database, 'users/' + userId + '/activeHouseIndex'));
        }).then((snapshot) => {
            if (snapshot.exists()) {
                activeHouseIndex = snapshot.val();
                if (activeHouseIndex >= houses.length || activeHouseIndex < 0) {
                    activeHouseIndex = 0; // Reset if invalid
                }
            } else {
                activeHouseIndex = 0;
            }
            updateUI(); // Update UI after loading houses and active index
        }).catch((error) => {
            console.error("Error loading houses: ", error);
            showMessageModal('خطأ', 'فشل تحميل معلومات البيوت. يرجى التحقق من اتصالك.', 'error');
        });
    }
}

function saveChallengeLog() {
    if (userId) {
        set(ref(database, 'users/' + userId + '/challengeLog'), challengeLog)
            .then(() => console.log("Challenge log saved successfully"))
            .catch(error => console.error("Error saving challenge log: ", error));
    }
}

function loadChallengeLog() {
    if (userId) {
        get(ref(database, 'users/' + userId + '/challengeLog')).then((snapshot) => {
            if (snapshot.exists()) {
                challengeLog = snapshot.val() || [];
            } else {
                challengeLog = [];
            }
            renderChallengeLog();
        }).catch((error) => {
            console.error("Error loading challenge log: ", error);
        });
    }
}

function renderChallengeLog() {
    challengeLogList.innerHTML = '';
    if (challengeLog.length === 0) {
        challengeLogList.innerHTML = '<li class="text-gray-400">لا يوجد سجل تحديات حالياً.</li>';
        return;
    }
    challengeLog.forEach(entry => {
        const li = document.createElement('li');
        const resultText = entry.result === 'win' ? 'فوز' : 'خسارة';
        const resultColor = entry.result === 'win' ? 'text-green-400' : 'text-red-400';
        li.className = `${resultColor}`;
        li.innerHTML = `تحديت <span class="font-semibold">${entry.opponentName}</span> (قوته: ${entry.opponentPower.toLocaleString()}) و كانت النتيجة: <span class="font-bold">${resultText}</span> (قوتك: ${entry.playerPower.toLocaleString()})`;
        challengeLogList.appendChild(li);
    });
}

function saveNotifications() {
    if (userId) {
        set(ref(database, 'users/' + userId + '/notifications'), notifications)
            .then(() => console.log("Notifications saved successfully"))
            .catch(error => console.error("Error saving notifications: ", error));
    }
}

function loadNotifications() {
    if (userId) {
        get(ref(database, 'users/' + userId + '/notifications')).then((snapshot) => {
            if (snapshot.exists()) {
                notifications = snapshot.val() || [];
            } else {
                notifications = [];
            }
            renderNotifications();
        }).catch((error) => {
            console.error("Error loading notifications: ", error);
        });
    }
}

// تحديث حالة الاتصال بالإنترنت
function updateOnlineStatus(isOnline) {
    if (userId) {
        update(ref(database, 'users/' + userId + '/data'), {
            isOnline: isOnline,
            lastOnline: Date.now()
        }).catch(error => console.error("Error updating online status: ", error));
    }
}

// حدث عند إغلاق أو تحديث الصفحة
window.addEventListener('beforeunload', () => {
    updateOnlineStatus(false);
    // You might want to save data here as well, but Firebase's `onDisconnect` is better for true online status
    // savePlayerData();
});

// listener for online/offline status (not for specific user but for all)
// this is important for global player list and ranking
function listenForPlayerUpdates() {
    onValue(ref(database, 'users'), (snapshot) => {
        // This listener will trigger whenever any user data changes
        // It's used to update the ranking and all players lists.
        // The actual logic for updating UI for these lists is in fetchRanking and fetchAllPlayers
        console.log("Firebase users data updated. Refreshing rankings/players.");
        // We call fetch functions here to refresh data
        fetchRanking();
        fetchAllPlayers();
    }, (error) => {
        console.error("Error listening for user updates: ", error);
    });
}

// وظائف اللعبة الرئيسية
function collectDollars() {
    const now = Date.now();
    if (now - lastCollectTime < COLLECT_COOLDOWN_DURATION) {
        const timeLeftMs = COLLECT_COOLDOWN_DURATION - (now - lastCollectTime);
        const minutes = Math.floor(timeLeftMs / (1000 * 60));
        const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);
        showMessageModal('انتظر قليلاً', `لا يزال المؤقت نشطًا. يمكنك الاستلام بعد ${minutes} دقيقة و ${seconds} ثانية.`, 'info');
        return;
    }

    dollars += Math.floor(accumulatedDollars);
    points += Math.floor(accumulatedPoints);
    totalPower += Math.floor(accumulatedPower);
    addNotification(`تم استلام $${Math.floor(accumulatedDollars).toLocaleString()} و ${Math.floor(accumulatedPoints).toLocaleString()} نقطة و ${Math.floor(accumulatedPower).toLocaleString()} قوة!`, 'success');

    accumulatedDollars = 0;
    accumulatedPoints = 0;
    accumulatedPower = 0;
    lastCollectTime = now;

    updateUI();
    savePlayerData();
}

function startAccumulationLoop() {
    setInterval(() => {
        const incomeRate = 1 + (innovationLevel * 0.1); // Base + 10% per innovation level
        const powerIncomeRate = 0.1 + (innovationLevel * 0.01); // Smaller power gain
        const currentHouse = houses[activeHouseIndex];
        const houseBonus = currentHouse.power * 0.01; // 1% of current house power as bonus

        accumulatedDollars += (incomeRate + houseBonus) / 60; // accumulate per second for a minute
        accumulatedPoints += (incomeRate + houseBonus) / 60;
        accumulatedPower += (powerIncomeRate + houseBonus / 10) / 60;

        updateUI(); // Update UI more frequently to show accumulation
    }, 1000); // كل ثانية
}

innovationButton.addEventListener('click', () => {
    if (dollars >= innovationCost) {
        dollars -= innovationCost;
        innovationLevel++;
        totalPower += innovationPowerIncrease; // Increase player's total power
        innovationCost = Math.floor(innovationCost * 1.5); // Increase cost for next innovation
        innovationPowerIncrease = Math.floor(innovationPowerIncrease * 1.1); // Increase power gain

        // Increase current house's power
        houses[activeHouseIndex].power += 100; // Each innovation adds 100 power to current house

        addNotification(`تم تطوير القوة الرئيسية. أصبحت قوتك ${totalPower.toLocaleString()}!`, 'success');

        // New house unlock logic: current house must reach its threshold (25000)
        const currentHouse = houses[activeHouseIndex];
        const nextHouseIndex = activeHouseIndex + 1;
        if (nextHouseIndex < houses.length && !houses[nextHouseIndex].unlocked) {
            if (currentHouse.power >= currentHouse.threshold) {
                houses[nextHouseIndex].unlocked = true;
                showMessageModal('بيت جديد مفتوح!', `تهانينا! لقد فتحت البيت رقم ${houses[nextHouseIndex].id}!`, 'success');
                // Automatically switch to the new house? Or let player do it?
                // For now, don't auto-switch, player manually activates.
            }
        }

        // Check for house power rewards
        const rewardedThresholdsForHouse = [250, 500, 1000, 2000, 4000, 8000, 15000, 20000]; // Example thresholds for rewards
        rewardedThresholdsForHouse.forEach(threshold => {
            if (currentHouse.power >= threshold && !currentHouse.rewardedThresholds.includes(threshold)) {
                // Give reward for reaching this threshold
                const rewardDollars = threshold * 5;
                const rewardPoints = threshold * 2;
                dollars += rewardDollars;
                points += rewardPoints;
                addNotification(`لقد وصلت قوة البيت ${currentHouse.id} إلى ${threshold.toLocaleString()}! حصلت على $${rewardDollars.toLocaleString()} و ${rewardPoints.toLocaleString()} نقطة مكافأة!`, 'success');
                currentHouse.rewardedThresholds.push(threshold); // Mark as rewarded
            }
        });


    } else {
        showMessageModal('مال غير كافٍ', 'ليس لديك مال كافٍ للابتكار!', 'error');
    }
    updateUI();
    savePlayerData();
    saveHouses();
});

// وظائف التحدي
function startChallengeFlow() {
    stopChallengeTimer();
    challengeState = 'ATTACK_READY'; // No PREPARING state
    challengePlayersList.innerHTML = '<p class="text-gray-300 text-center">جاري تحميل لاعب...</p>';
    selectRandomChallengePlayer();
}

function selectRandomChallengePlayer() {
    // Fetch a list of players from Firebase, excluding self and highly powerful players
    get(ref(database, 'users')).then((snapshot) => {
        const allPlayersData = snapshot.val();
        const eligiblePlayers = [];

        for (const uid in allPlayersData) {
            if (uid === userId) continue; // Skip self

            const player = allPlayersData[uid].data;
            if (player && player.totalPower && player.playerName) {
                // Only select players within a reasonable power range (e.g., +/- 50% of player's power)
                const minPower = totalPower * 0.5;
                const maxPower = totalPower * 1.5;

                if (player.totalPower >= minPower && player.totalPower <= maxPower) {
                    eligiblePlayers.push({
                        uid: uid,
                        name: player.playerName,
                        totalPower: player.totalPower
                    });
                }
            }
        }

        if (eligiblePlayers.length > 0) {
            const randomIndex = Math.floor(Math.random() * eligiblePlayers.length);
            currentChallengePlayer = eligiblePlayers[randomIndex];

            challengeState = 'ATTACK_READY'; // Always ready to attack immediately
            challengeTimerRemaining = 0; // No prep time
            renderCurrentChallengePlayer();
        } else {
            challengeStatusDisplay.textContent = 'لا يوجد خصوم متاحون حاليًا.';
            targetPlayerCard.classList.add('hidden');
            cooldownTimerDisplay.classList.add('hidden');
            challengeResultDisplay.classList.add('hidden');
            currentChallengePlayer = null;
        }
    }).catch(error => {
        console.error("Error fetching players for challenge: ", error);
        challengeStatusDisplay.textContent = 'حدث خطأ في تحميل الخصوم.';
        targetPlayerCard.classList.add('hidden');
        cooldownTimerDisplay.classList.add('hidden');
    });
}

function renderCurrentChallengePlayer() {
    if (challengeState === 'ATTACK_READY' && currentChallengePlayer) {
        challengeStatusDisplay.textContent = 'خصم جاهز للتحدي!';
        targetPlayerNameDisplay.textContent = currentChallengePlayer.name;
        targetPlayerPowerDisplay.textContent = currentChallengePlayer.totalPower.toLocaleString();
        targetPlayerCard.classList.remove('hidden');
        attackButton.classList.remove('hidden');
        cooldownTimerDisplay.classList.add('hidden');
        challengeResultDisplay.classList.add('hidden');
    } else if (challengeState === 'COOLDOWN') {
        challengeStatusDisplay.textContent = 'انتظر اللاعب القادم...';
        targetPlayerCard.classList.add('hidden');
        attackButton.classList.add('hidden');
        cooldownTimerDisplay.classList.remove('hidden');
        challengeResultDisplay.classList.remove('hidden'); // Keep result visible during cooldown
        // Timer update handled by startChallengeTimer
    } else {
        challengeStatusDisplay.textContent = 'جاري البحث عن خصم...';
        targetPlayerCard.classList.add('hidden');
        cooldownTimerDisplay.classList.add('hidden');
        challengeResultDisplay.classList.add('hidden');
    }
}

function startChallengeTimer() {
    if (challengeTimerInterval) clearInterval(challengeTimerInterval);
    challengeTimerInterval = setInterval(() => {
        challengeTimerRemaining--;
        const minutes = Math.floor(challengeTimerRemaining / 60);
        const seconds = challengeTimerRemaining % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (challengeTimerRemaining <= 0) {
            clearInterval(challengeTimerInterval);
            if (challengeState === 'COOLDOWN') {
                startChallengeFlow(); // Get a new player after cooldown
            }
        }
    }, 1000);
}

function stopChallengeTimer() {
    if (challengeTimerInterval) {
        clearInterval(challengeTimerInterval);
        challengeTimerInterval = null;
    }
}

function handleAttackClick() {
    if (challengeState === 'ATTACK_READY' && currentChallengePlayer) {
        const playerStrength = totalPower;
        const opponentStrength = currentChallengePlayer.totalPower;

        let result = '';
        let message = '';
        let playerDollarsGained = 0;
        let playerPointsGained = 0;
        let playerPowerGained = 0;

        // Simple win/loss logic: higher power wins more often
        const winChance = playerStrength / (playerStrength + opponentStrength);
        const isWin = Math.random() < winChance;

        if (isWin) {
            result = 'win';
            playerDollarsGained = Math.floor(opponentStrength * 0.1); // Gain 10% of opponent's power as dollars
            playerPointsGained = Math.floor(opponentStrength * 0.05); // Gain 5% as points
            playerPowerGained = Math.floor(opponentStrength * 0.01); // Gain 1% as power
            dollars += playerDollarsGained;
            points += playerPointsGained;
            totalPower += playerPowerGained;
            message = `لقد فزت في التحدي ضد ${currentChallengePlayer.name}! حصلت على $${playerDollarsGained.toLocaleString()}، ${playerPointsGained.toLocaleString()} نقطة، و ${playerPowerGained.toLocaleString()} قوة.`;
            challengeResultDisplay.className = 'text-center text-xl font-semibold mt-4 text-green-500';
            challengeResultDisplay.textContent = 'فوز!';
        } else {
            result = 'lose';
            // Slight penalties for losing, or just no gain
            const penaltyDollars = Math.floor(dollars * 0.05); // Lose 5% of dollars
            const penaltyPoints = Math.floor(points * 0.02); // Lose 2% of points
            dollars = Math.max(0, dollars - penaltyDollars);
            points = Math.max(0, points - penaltyPoints);
            message = `لقد خسرت في التحدي ضد ${currentChallengePlayer.name}. خسرت $${penaltyDollars.toLocaleString()} و ${penaltyPoints.toLocaleString()} نقطة.`;
            challengeResultDisplay.className = 'text-center text-xl font-semibold mt-4 text-red-500';
            challengeResultDisplay.textContent = 'خسارة!';
        }

        addNotification(message, isWin ? 'success' : 'error');
        challengeLog.unshift({
            opponentName: currentChallengePlayer.name,
            result: result,
            playerPower: playerStrength,
            opponentPower: opponentStrength
        });
        if (challengeLog.length > 10) challengeLog.pop(); // Keep log to last 10 entries

        savePlayerData();
        saveChallengeLog();
        updateUI();
        renderChallengeLog();

        // Start cooldown after attack (win or lose)
        challengeState = 'COOLDOWN';
        challengeTimerRemaining = 2 * 60; // 2 minutes post-attack cooldown
        renderCurrentChallengePlayer();
        startChallengeTimer();
    }
}

// وظائف الترتيب
function fetchRanking() {
    get(ref(database, 'users')).then((snapshot) => {
        const allPlayersData = snapshot.val();
        const players = [];

        for (const uid in allPlayersData) {
            const player = allPlayersData[uid].data;
            if (player && player.playerName && player.totalPower) {
                players.push({
                    uid: uid,
                    name: player.playerName,
                    totalPower: player.totalPower,
                    isOnline: player.isOnline // Include online status
                });
            }
        }

        players.sort((a, b) => b.totalPower - a.totalPower); // Sort by totalPower descending

        rankingList.innerHTML = ''; // Clear current list

        if (players.length === 0) {
            rankingList.innerHTML = '<tr><td colspan="3" class="py-2 px-4 text-center text-gray-400">لا يوجد لاعبون في الترتيب حالياً.</td></tr>';
            return;
        }

        players.forEach((player, index) => {
            const row = document.createElement('tr');
            const rankClass = (index === 0) ? 'text-yellow-400 font-bold' :
                             (index === 1) ? 'text-gray-300 font-semibold' :
                             (index === 2) ? 'text-amber-500 font-semibold' :
                             'text-gray-300';
            const highlightClass = (player.uid === userId) ? 'bg-indigo-700' : (index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-600');

            row.className = `${highlightClass} hover:bg-gray-500 transition duration-150 ease-in-out`;
            row.innerHTML = `
                <td class="py-2 px-4 ${rankClass}">${index + 1}</td>
                <td class="py-2 px-4 text-gray-200">${player.name} ${player.isOnline ? '<span class="text-green-400 text-xs ml-1">(متصل)</span>' : ''}</td>
                <td class="py-2 px-4 text-red-300">${player.totalPower.toLocaleString()}</td>
            `;
            rankingList.appendChild(row);
        });
    }).catch(error => {
        console.error("Error fetching ranking: ", error);
        rankingList.innerHTML = '<tr><td colspan="3" class="py-2 px-4 text-center text-red-400">فشل تحميل الترتيب.</td></tr>';
    });
}

// وظائف جميع اللاعبين
function fetchAllPlayers() {
    get(ref(database, 'users')).then((snapshot) => {
        const allPlayersData = snapshot.val();
        const allPlayersSorted = [];

        for (const uid in allPlayersData) {
            if (uid === userId) continue;

            const player = allPlayersData[uid].data;
            
            // هذه الأسطر كانت تقوم بفلترة اللاعبين غير المتصلين ذوي القوة المنخفضة. تم إزالتها لعرض الجميع.
            // if (!player.isOnline && player.totalPower < 3000) {
            //     continue; // Skip this player for the all players list
            // }

            allPlayersSorted.push(player);
        }

        allPlayersSorted.sort((a, b) => b.totalPower - a.totalPower); // Sort by totalPower descending

        allPlayersList.innerHTML = ''; // Clear current list

        if (allPlayersSorted.length === 0) {
            allPlayersList.innerHTML = '<p class="text-gray-400 col-span-full text-center">لا يوجد لاعبون لعرضهم حالياً.</p>';
            return;
        }

        allPlayersSorted.forEach(player => {
            const playerCard = document.createElement('div');
            const onlineStatusClass = player.isOnline ? 'bg-green-500' : 'bg-red-500';
            const onlineStatusText = player.isOnline ? 'متصل' : 'غير متصل';
            const bgColor = player.isOnline ? 'bg-gray-700' : 'bg-gray-800'; // Different background for offline

            playerCard.className = `${bgColor} p-4 rounded-lg shadow-md flex items-center space-x-4 space-x-reverse`;
            playerCard.innerHTML = `
                <div class="w-2 h-2 rounded-full ${onlineStatusClass}"></div>
                <div>
                    <h4 class="text-lg font-semibold text-white">${player.playerName}</h4>
                    <p class="text-sm text-gray-300">القوة: <span class="font-bold text-red-400">${player.totalPower.toLocaleString()}</span></p>
                    <p class="text-xs text-gray-400">${onlineStatusText}</p>
                </div>
            `;
            allPlayersList.appendChild(playerCard);
        });
    }).catch(error => {
        console.error("Error fetching all players: ", error);
        allPlayersList.innerHTML = '<p class="text-red-400 col-span-full text-center">فشل تحميل قائمة اللاعبين.</p>';
    });
}

// معالجات الأحداث (Event Listeners)
collectDollarsButton.addEventListener('click', collectDollars);

settingsButton.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    playerNameInput.value = playerName;
    const now = Date.now();
    const timeSinceLastChange = now - lastPlayerNameChangeTimestamp;

    if (isNameSetPermanently && nameChangeCount >= MAX_NAME_CHANGES) {
        nameChangeCooldownMessage.textContent = `لقد وصلت إلى الحد الأقصى لتغيير الاسم (${MAX_NAME_CHANGES} مرات).`;
        nameChangeCooldownMessage.classList.remove('hidden');
        setNameConfirmButton.disabled = true;
        setNameConfirmButton.classList.add('opacity-50', 'cursor-not-allowed');
    } else if (isNameSetPermanently && timeSinceLastChange < NAME_CHANGE_COOLDOWN_DURATION) {
        const remainingTimeMs = NAME_CHANGE_COOLDOWN_DURATION - timeSinceLastChange;
        const remainingDays = Math.ceil(remainingTimeMs / (1000 * 60 * 60 * 24));
        nameChangeCooldownDisplay.textContent = `${remainingDays} يوم(أيام)`;
        nameChangeCooldownMessage.classList.remove('hidden');
        setNameConfirmButton.disabled = true;
        setNameConfirmButton.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        nameChangeCooldownMessage.classList.add('hidden');
        setNameConfirmButton.disabled = false;
        setNameConfirmButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
});

closeSettingsModalButton.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

messageModalOkButton.addEventListener('click', () => {
    messageModal.classList.add('hidden');
});

closeMessageModalButton.addEventListener('click', () => {
    messageModal.classList.add('hidden');
});

setNameConfirmButton.addEventListener('click', () => {
    const newName = playerNameInput.value.trim();
    if (newName && newName.length >= 3 && newName.length <= 20) {
        const oldPlayerName = playerName;
        playerName = newName;

        const now = Date.now();
        const timeSinceLastChange = now - lastPlayerNameChangeTimestamp;

        if (isNameSetPermanently && nameChangeCount >= MAX_NAME_CHANGES) {
            showMessageModal('لا يمكن تغيير الاسم', `لقد وصلت إلى الحد الأقصى لتغيير الاسم (${MAX_NAME_CHANGES} مرات).`, 'info');
            return;
        }

        if (isNameSetPermanently && (Date.now() - lastPlayerNameChangeTimestamp < NAME_CHANGE_COOLDOWN_DURATION)) {
            const remainingTimeMs = NAME_CHANGE_COOLDOWN_DURATION - (Date.now() - lastPlayerNameChangeTimestamp);
            const remainingDays = Math.ceil(remainingTimeMs / (1000 * 60 * 60 * 24));
            showMessageModal('لا يمكن تغيير الاسم', `لا يمكنك تغيير اسمك إلا بعد مرور ${remainingDays} يوم(أيام) أخرى.`, 'info');
            return;
        }

        // Only increment count if name actually changed AND it was set permanently before
        if (playerName !== oldPlayerName) {
            if (isNameSetPermanently) {
                nameChangeCount++;
            }
            isNameSetPermanently = true;
            lastPlayerNameChangeTimestamp = Date.now();
            addNotification(`تم تغيير اسمك إلى ${playerName}.`, 'success');
        } else {
            addNotification('لم يتغير الاسم.', 'info');
        }

        updateUI();
        savePlayerData();
        settingsModal.classList.add('hidden');
    } else {
        showMessageModal('اسم غير صالح', 'يجب أن يكون الاسم بين 3 و 20 حرفاً.', 'error');
    }
});

saveGameButton.addEventListener('click', () => {
    savePlayerData();
    saveHouses();
    saveChallengeLog();
    saveNotifications();
    showMessageModal('حفظ اللعبة', 'تم حفظ بياناتك بنجاح!', 'success');
});

loadGameButton.addEventListener('click', () => {
    loadPlayerData();
    loadHouses();
    loadChallengeLog();
    loadNotifications();
    showMessageModal('تحميل اللعبة', 'تم تحميل بياناتك بنجاح!', 'success');
});

resetGameButton.addEventListener('click', () => {
    if (confirm('هل أنت متأكد أنك تريد إعادة تعيين اللعبة؟ ستفقد كل تقدمك!')) {
        dollars = 0;
        points = 0;
        totalPower = 0;
        innovationLevel = 1;
        innovationCost = 100;
        innovationPowerIncrease = 10;
        accumulatedDollars = 0;
        accumulatedPoints = 0;
        accumulatedPower = 0;
        lastCollectTime = 0;
        playerName = "لاعب جديد";
        isNameSetPermanently = false;
        lastPlayerNameChangeTimestamp = 0;
        nameChangeCount = 0; // Reset name change count
        activeHouseIndex = 0;
        houses = [
            { id: 1, power: 1, unlocked: true, threshold: 25000, rewardedThresholds: [] },
            { id: 2, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] },
            { id: 3, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] },
            { id: 4, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] }
        ];
        challengeLog = [];
        notifications = [];

        // Clear data from Firebase
        if (userId) {
            set(ref(database, 'users/' + userId + '/data'), null);
            set(ref(database, 'users/' + userId + '/houses'), null);
            set(ref(database, 'users/' + userId + '/challengeLog'), null);
            set(ref(database, 'users/' + userId + '/notifications'), null);
        }

        updateUI();
        renderChallengeLog();
        renderNotifications();
        showMessageModal('إعادة تعيين', 'تمت إعادة تعيين اللعبة بنجاح!', 'info');
        settingsModal.classList.add('hidden');
    }
});

// Sidebar toggle
sidebar.classList.remove('-translate-x-full'); // Ensure it's hidden initially by CSS
settingsButton.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

closeSidebarButton.addEventListener('click', () => {
    sidebar.classList.remove('open');
});

// Navigation links
navDashboard.addEventListener('click', () => showView('dashboard-view'));
navInnovation.addEventListener('click', () => showView('innovation-view'));
navChallenge.addEventListener('click', () => showView('challenge-view'));
navClan.addEventListener('click', () => showView('clan-view'));
navRanking.addEventListener('click', () => showView('ranking-view'));
navMarket.addEventListener('click', () => showView('market-view'));
navAllPlayers.addEventListener('click', () => showView('all-players-view'));

attackButton.addEventListener('click', handleAttackClick);

// Keep user online status updated
setInterval(() => {
    updateOnlineStatus(true);
}, 60 * 1000); // كل دقيقةyl
