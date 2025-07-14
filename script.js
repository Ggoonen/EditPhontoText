// استيراد وحدات Firebase الضرورية
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getDatabase, ref, set, get, onValue, update } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js';

// تهيئة Firebase - تم استبدال القيم بقيم مشروعك السابقة
const firebaseConfig = {
    apiKey: "AIzaSyAgmDkMKcfMG3r_16t_6rcjZQJOUFVpVOo",
    authDomain: "kingb7ar-935b8.firebaseapp.com",
    databaseURL: "https://kingb7ar-935b8-default-rtdb.firebaseio.com",
    projectId: "kingb7ar-935b8",
    storageBucket: "kingb7ar-935b8.firebaseapp.com", // تم تصحيح هذا المسار
    messagingSenderId: "157617641483",
    appId: "1:157617641483:web:f8a0e51c1cd1bc4199cf0e"
};

// تهيئة تطبيق Firebase وقاعدة البيانات والمصادقة
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// المتغيرات العامة للعبة
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
let lastCollectTime = 0; // وقت آخر عملية جمع للموارد
const COLLECT_COOLDOWN_DURATION = 1 * 60 * 1000; // مدة تهدئة جمع الموارد: دقيقة واحدة (بالمللي ثانية)
let collectCountdownInterval = null; // معرف مؤقت العد التنازلي لجمع الموارد

let isNameSetPermanently = false; // هل تم تعيين الاسم بشكل دائم (عبر تسجيل الدخول مثلاً)
let lastPlayerNameChangeTimestamp = 0; // وقت آخر تغيير للاسم
const NAME_CHANGE_COOLDOWN_DURATION = 30 * 24 * 60 * 60 * 1000; // مدة تهدئة تغيير الاسم: 30 يوماً (بالمللي ثانية)
let nameChangeCount = 0; // عدد مرات تغيير الاسم
const MAX_NAME_CHANGES = 3; // الحد الأقصى لعدد مرات تغيير الاسم

let activeHouseIndex = 0; // فهرس البيت النشط حالياً
let houses = [ // تعريف البيوت الأربعة
    { id: 1, power: 1, unlocked: true, threshold: 25000, rewardedThresholds: [] }, // البيت الأول مفتوح دائماً، يتطلب 25000 لفتح التالي
    { id: 2, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] },
    { id: 3, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] },
    { id: 4, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] }
];

let challengeState = 'ATTACK_READY'; // حالة نظام التحدي: 'ATTACK_READY' (جاهز للهجوم)، 'COOLDOWN' (في فترة تهدئة)
let currentChallengePlayer = null; // اللاعب المستهدف في التحدي الحالي
let challengeTimerRemaining = 0; // الوقت المتبقي في مؤقت التحدي (بالثواني)
let challengeTimerInterval = null; // معرف مؤقت التحدي
let challengeLog = []; // سجل التحديات: { opponentName, result (win/lose), playerPower, opponentPower }

let notifications = []; // قائمة الإشعارات: { message, type (success, error, info), timestamp }
const MAX_NOTIFICATIONS = 5; // الحد الأقصى لعدد الإشعارات المعروضة

// الحصول على عناصر DOM (واجهة المستخدم)
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

// عناصر التنقل (Views)
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

// وظائف عامة للتحكم في واجهة المستخدم
function showView(viewId) {
    // إخفاء جميع العروض
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
        view.classList.remove('active');
    });
    // إظهار العرض المطلوب
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.classList.remove('hidden');
        activeView.classList.add('active');
        // تحديثات خاصة لكل عرض عند إظهاره
        if (viewId === 'ranking-view') {
            fetchRanking();
        } else if (viewId === 'all-players-view') {
            fetchAllPlayers();
        } else if (viewId === 'challenge-view') {
            startChallengeFlow(); // بدء أو استئناف تدفق التحدي عند الدخول للعرض
        }
    }
    sidebar.classList.remove('open'); // إغلاق الشريط الجانبي بعد اختيار العرض
}

// عرض رسالة في نافذة منبثقة (مودال)
function showMessageModal(title, message, type = 'info') {
    messageModalTitle.textContent = title;
    messageModalBody.textContent = message;
    // يمكنك إضافة تنسيقات بناءً على النوع (type) هنا (مثلاً، تغيير لون الحدود)
    messageModal.classList.remove('hidden');
}

// إضافة إشعار جديد
function addNotification(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    notifications.unshift({ message, type, timestamp }); // إضافة الإشعار في بداية القائمة (الأحدث أولاً)

    // الاحتفاظ بآخر عدد محدد من الإشعارات فقط
    if (notifications.length > MAX_NOTIFICATIONS) {
        notifications = notifications.slice(0, MAX_NOTIFICATIONS);
    }
    renderNotifications(); // إعادة رسم الإشعارات
    saveNotifications(); // حفظ الإشعارات في Firebase
}

// عرض الإشعارات في واجهة المستخدم
function renderNotifications() {
    notificationsList.innerHTML = ''; // مسح القائمة الحالية
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

// تحديث جميع عناصر واجهة المستخدم بالقيم الحالية للمتغيرات
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
    updateNextHouseInfo(); // تحديث معلومات البيت التالي

    accumulatedDollarsDisplay.textContent = `$${Math.floor(accumulatedDollars).toLocaleString()}`;
    accumulatedPointsDisplay.textContent = Math.floor(accumulatedPoints).toLocaleString();
    accumulatedPowerDisplay.textContent = Math.floor(accumulatedPower).toLocaleString();

    updateCollectButtonState(); // تحديث حالة زر جمع الموارد
    renderHousesProgress(); // إعادة رسم تقدم البيوت
    renderNotifications(); // إعادة رسم الإشعارات
}

// تحديث حالة زر جمع الموارد (نشط/معطل بناءً على المؤقت)
function updateCollectButtonState() {
    const now = Date.now();
    if (now - lastCollectTime < COLLECT_COOLDOWN_DURATION) {
        collectDollarsButton.disabled = true;
        collectDollarsButton.classList.add('opacity-50', 'cursor-not-allowed');
        collectTimerDisplay.style.display = 'block';
        startCollectCountdown(); // بدء العد التنازلي إذا كان الزر معطلاً
    } else {
        collectDollarsButton.disabled = false;
        collectDollarsButton.classList.remove('opacity-50', 'cursor-not-allowed');
        collectTimerDisplay.style.display = 'none';
        stopCollectCountdown(); // إيقاف العد التنازلي إذا كان الزر نشطاً
    }
}

// بدء العد التنازلي لزر جمع الموارد
function startCollectCountdown() {
    if (collectCountdownInterval) clearInterval(collectCountdownInterval); // مسح أي مؤقت سابق
    collectCountdownInterval = setInterval(() => {
        const now = Date.now();
        const timeLeftMs = COLLECT_COOLDOWN_DURATION - (now - lastCollectTime);
        if (timeLeftMs <= 0) {
            clearInterval(collectCountdownInterval); // إيقاف المؤقت عند الانتهاء
            updateCollectButtonState(); // تحديث حالة الزر
            return;
        }
        const minutes = Math.floor(timeLeftMs / (1000 * 60));
        const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);
        collectCountdownDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000); // تحديث كل ثانية
}

// إيقاف العد التنازلي لزر جمع الموارد
function stopCollectCountdown() {
    if (collectCountdownInterval) {
        clearInterval(collectCountdownInterval);
        collectCountdownInterval = null;
    }
}

// تحديث معلومات البيت التالي المطلوب فتحه
function updateNextHouseInfo() {
    const currentHouse = houses[activeHouseIndex];
    const nextHouseIndex = activeHouseIndex + 1;

    if (nextHouseIndex < houses.length) {
        const nextHouse = houses[nextHouseIndex];
        nextHouseThresholdDisplay.textContent = nextHouse.threshold.toLocaleString();
    } else {
        nextHouseThresholdDisplay.textContent = 'لا يوجد بيت قادم'; // إذا كانت جميع البيوت مفتوحة
    }
}

// رسم تقدم البيوت في واجهة المستخدم
function renderHousesProgress() {
    housesProgressContainer.innerHTML = ''; // مسح المحتوى الحالي
    houses.forEach((house, index) => {
        const isCurrent = (index === activeHouseIndex); // هل هذا هو البيت النشط؟
        const isUnlocked = house.unlocked; // هل البيت مفتوح؟
        const progress = Math.min(100, (house.power / house.threshold) * 100); // حساب نسبة التقدم
        const barColor = isUnlocked ? 'bg-green-500' : 'bg-gray-500'; // لون شريط التقدم
        const textColor = isUnlocked ? 'text-green-300' : 'text-gray-300'; // لون النص
        const borderColor = isCurrent ? 'border-2 border-indigo-400' : 'border border-gray-600'; // لون الحدود

        const houseDiv = document.createElement('div');
        houseDiv.className = `flex flex-col p-2 rounded-lg ${borderColor} mb-3 transition duration-300 ease-in-out`;
        if (isCurrent) {
            houseDiv.classList.add('bg-gray-600'); // خلفية مختلفة للبيت النشط
        } else if (isUnlocked) {
            houseDiv.classList.add('bg-gray-700');
        } else {
            houseDiv.classList.add('bg-gray-800', 'opacity-75'); // خلفية معتمة للبيوت المغلقة
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

// دمج وإعدادات Firebase: تتم المصادقة وتحميل البيانات الأولية هنا
onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid; // تعيين معرف المستخدم
        loadPlayerData(); // تحميل بيانات اللاعب
        loadHouses(); // تحميل بيانات البيوت
        loadChallengeLog(); // تحميل سجل التحديات
        loadNotifications(); // تحميل الإشعارات
        listenForPlayerUpdates(); // بدء الاستماع لتحديثات اللاعبين الآخرين (للترتيب وقائمة اللاعبين)
        updateOnlineStatus(true); // تعيين حالة المستخدم كـ "متصل"
        startAccumulationLoop(); // بدء حلقة تراكم الموارد
        appDiv.classList.remove('hidden'); // إظهار واجهة التطبيق
        loadingOverlay.classList.add('hidden'); // إخفاء شاشة التحميل
        showView('dashboard-view'); // عرض لوحة القيادة كأول شاشة
    } else {
        // إذا لم يكن هناك مستخدم مسجل الدخول، حاول تسجيل الدخول كمستخدم مجهول
        signInAnonymously(auth)
            .catch((error) => {
                console.error("Error signing in anonymously: ", error);
                showMessageModal('خطأ', 'فشل تسجيل الدخول التلقائي. يرجى المحاولة مرة أخرى.', 'error');
            });
    }
});

// وظائف حفظ وتحميل البيانات من/إلى Firebase
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
            nameChangeCount: nameChangeCount, // حفظ عدد مرات تغيير الاسم
            lastOnline: Date.now() // تحديث وقت آخر اتصال
        }).then(() => {
            console.log("Player data saved successfully!");
            // addNotification('تم حفظ بياناتك بنجاح.', 'success'); // اختياري: إظهار إشعار عند الحفظ
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
                nameChangeCount = data.nameChangeCount || 0; // تحميل عدد مرات تغيير الاسم
            } else {
                savePlayerData(); // حفظ البيانات الافتراضية إذا لم يتم العثور على بيانات
            }
            updateUI(); // تحديث واجهة المستخدم بعد التحميل
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
                // التأكد من أن مصفوفة البيوت تحتوي على 4 عناصر بالضبط. إذا لم يكن كذلك، قم بإعادة تعيينها أو تعديلها.
                if (!Array.isArray(houses) || houses.length !== 4) {
                    houses = [
                        { id: 1, power: 1, unlocked: true, threshold: 25000, rewardedThresholds: [] },
                        { id: 2, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] },
                        { id: 3, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] },
                        { id: 4, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] }
                    ];
                    saveHouses(); // حفظ الهيكل الصحيح
                } else {
                    // التأكد من أن جميع البيوت تحتوي على الخصائص المطلوبة (مثل rewardedThresholds)
                    houses.forEach(house => {
                        if (!house.rewardedThresholds) {
                            house.rewardedThresholds = [];
                        }
                        if (typeof house.threshold === 'undefined') {
                            house.threshold = 25000; // عتبة افتراضية إذا كانت مفقودة
                        }
                    });
                }
            } else {
                saveHouses(); // حفظ البيوت الافتراضية إذا لم يتم العثور عليها
            }
        }).then(() => {
            return get(ref(database, 'users/' + userId + '/activeHouseIndex'));
        }).then((snapshot) => {
            if (snapshot.exists()) {
                activeHouseIndex = snapshot.val();
                if (activeHouseIndex >= houses.length || activeHouseIndex < 0) {
                    activeHouseIndex = 0; // إعادة تعيين إذا كان الفهرس غير صالح
                }
            } else {
                activeHouseIndex = 0;
            }
            updateUI(); // تحديث واجهة المستخدم بعد تحميل البيوت والفهرس النشط
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

// تحديث حالة الاتصال بالإنترنت للمستخدم الحالي
function updateOnlineStatus(isOnline) {
    if (userId) {
        update(ref(database, 'users/' + userId + '/data'), {
            isOnline: isOnline,
            lastOnline: Date.now()
        }).catch(error => console.error("Error updating online status: ", error));
    }
}

// حدث عند إغلاق أو تحديث الصفحة: تحديث حالة الاتصال إلى "غير متصل"
window.addEventListener('beforeunload', () => {
    updateOnlineStatus(false);
});

// الاستماع لتحديثات بيانات اللاعبين الآخرين (للتصنيفات وقوائم اللاعبين)
function listenForPlayerUpdates() {
    onValue(ref(database, 'users'), (snapshot) => {
        // هذا المستمع سيتم تشغيله كلما تغيرت بيانات أي مستخدم
        // يستخدم لتحديث قوائم الترتيب وجميع اللاعبين
        console.log("Firebase users data updated. Refreshing rankings/players.");
        fetchRanking(); // تحديث الترتيب
        fetchAllPlayers(); // تحديث قائمة جميع اللاعبين
    }, (error) => {
        console.error("Error listening for user updates: ", error);
    });
}

// وظائف اللعبة الرئيسية: جمع الموارد
function collectDollars() {
    const now = Date.now();
    // التحقق من مؤقت التهدئة
    if (now - lastCollectTime < COLLECT_COOLDOWN_DURATION) {
        const timeLeftMs = COLLECT_COOLDOWN_DURATION - (now - lastCollectTime);
        const minutes = Math.floor(timeLeftMs / (1000 * 60));
        const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);
        showMessageModal('انتظر قليلاً', `لا يزال المؤقت نشطًا. يمكنك الاستلام بعد ${minutes} دقيقة و ${seconds} ثانية.`, 'info');
        return;
    }

    // إضافة الموارد المتراكمة إلى رصيد اللاعب
    dollars += Math.floor(accumulatedDollars);
    points += Math.floor(accumulatedPoints);
    totalPower += Math.floor(accumulatedPower);
    addNotification(`تم استلام $${Math.floor(accumulatedDollars).toLocaleString()} و ${Math.floor(accumulatedPoints).toLocaleString()} نقطة و ${Math.floor(accumulatedPower).toLocaleString()} قوة!`, 'success');

    // إعادة تعيين الموارد المتراكمة
    accumulatedDollars = 0;
    accumulatedPoints = 0;
    accumulatedPower = 0;
    lastCollectTime = now; // تحديث وقت آخر عملية جمع

    updateUI(); // تحديث واجهة المستخدم
    savePlayerData(); // حفظ بيانات اللاعب
}

// بدء حلقة تراكم الموارد (تزيد الموارد تلقائياً بمرور الوقت)
function startAccumulationLoop() {
    setInterval(() => {
        const incomeRate = 1 + (innovationLevel * 0.1); // معدل الدخل الأساسي + مكافأة من مستوى الابتكار
        const powerIncomeRate = 0.1 + (innovationLevel * 0.01); // معدل اكتساب القوة (أقل)
        const currentHouse = houses[activeHouseIndex];
        const houseBonus = currentHouse.power * 0.01; // مكافأة من قوة البيت الحالي (1%)

        accumulatedDollars += (incomeRate + houseBonus) / 60; // تتراكم كل ثانية (مقسمة على 60 لتكون معدل دقيقة)
        accumulatedPoints += (incomeRate + houseBonus) / 60;
        accumulatedPower += (powerIncomeRate + houseBonus / 10) / 60;

        updateUI(); // تحديث واجهة المستخدم بشكل متكرر لعرض التراكم
    }, 1000); // كل ثانية
}

// معالج حدث زر الابتكار
innovationButton.addEventListener('click', () => {
    if (dollars >= innovationCost) {
        dollars -= innovationCost; // خصم التكلفة
        innovationLevel++; // زيادة مستوى الابتكار
        totalPower += innovationPowerIncrease; // زيادة القوة الإجمالية للاعب
        innovationCost = Math.floor(innovationCost * 1.5); // زيادة تكلفة الابتكار التالي
        innovationPowerIncrease = Math.floor(innovationPowerIncrease * 1.1); // زيادة مكافأة القوة من الابتكار

        // زيادة قوة البيت الحالي
        houses[activeHouseIndex].power += 100; // كل ابتكار يضيف 100 قوة للبيت الحالي

        addNotification(`تم تطوير القوة الرئيسية. أصبحت قوتك ${totalPower.toLocaleString()}!`, 'success');

        // منطق فتح البيت الجديد: يجب أن يصل البيت الحالي إلى عتبة 25000 قوة
        const currentHouse = houses[activeHouseIndex];
        const nextHouseIndex = activeHouseIndex + 1;
        if (nextHouseIndex < houses.length && !houses[nextHouseIndex].unlocked) {
            if (currentHouse.power >= currentHouse.threshold) {
                houses[nextHouseIndex].unlocked = true; // فتح البيت التالي
                showMessageModal('بيت جديد مفتوح!', `تهانينا! لقد فتحت البيت رقم ${houses[nextHouseIndex].id}!`, 'success');
                // حالياً، لا يتم التبديل التلقائي للبيت الجديد، يتركه للاعب ليقوم بذلك يدوياً.
            }
        }

        // التحقق من مكافآت قوة البيت
        const rewardedThresholdsForHouse = [250, 500, 1000, 2000, 4000, 8000, 15000, 20000]; // عتبات أمثلة للمكافآت
        rewardedThresholdsForHouse.forEach(threshold => {
            if (currentHouse.power >= threshold && !currentHouse.rewardedThresholds.includes(threshold)) {
                // إعطاء مكافأة للوصول إلى هذه العتبة
                const rewardDollars = threshold * 5;
                const rewardPoints = threshold * 2;
                dollars += rewardDollars;
                points += rewardPoints;
                addNotification(`لقد وصلت قوة البيت ${currentHouse.id} إلى ${threshold.toLocaleString()}! حصلت على $${rewardDollars.toLocaleString()} و ${rewardPoints.toLocaleString()} نقطة مكافأة!`, 'success');
                currentHouse.rewardedThresholds.push(threshold); // وضع علامة على أنها مكافأة تم منحها
            }
        });

    } else {
        showMessageModal('مال غير كافٍ', 'ليس لديك مال كافٍ للابتكار!', 'error');
    }
    updateUI(); // تحديث واجهة المستخدم
    savePlayerData(); // حفظ بيانات اللاعب
    saveHouses(); // حفظ بيانات البيوت
});

// وظائف نظام التحدي
function startChallengeFlow() {
    stopChallengeTimer(); // إيقاف أي مؤقت تحدي سابق
    challengeState = 'ATTACK_READY'; // تعيين الحالة إلى "جاهز للهجوم" مباشرة
    challengePlayersList.innerHTML = '<p class="text-gray-300 text-center">جاري تحميل لاعب...</p>'; // رسالة تحميل
    selectRandomChallengePlayer(); // اختيار لاعب عشوائي جديد
}

function selectRandomChallengePlayer() {
    // جلب قائمة اللاعبين من Firebase، باستثناء اللاعب الحالي
    get(ref(database, 'users')).then((snapshot) => {
        const allPlayersData = snapshot.val();
        const eligiblePlayers = [];

        for (const uid in allPlayersData) {
            if (uid === userId) continue; // تخطي اللاعب الحالي

            const player = allPlayersData[uid].data;
            if (player && player.totalPower && player.playerName) {
                // اختيار اللاعبين ضمن نطاق قوة معقول (مثلاً، +/- 50% من قوة اللاعب)
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
            currentChallengePlayer = eligiblePlayers[randomIndex]; // تعيين اللاعب المستهدف

            challengeState = 'ATTACK_READY'; // جاهز للهجوم فوراً
            challengeTimerRemaining = 0; // لا يوجد وقت استعداد
            renderCurrentChallengePlayer(); // رسم اللاعب المستهدف
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
        challengeResultDisplay.classList.remove('hidden'); // إبقاء نتيجة التحدي مرئية أثناء فترة التهدئة
        // تحديث المؤقت يتم بواسطة startChallengeTimer
    } else {
        challengeStatusDisplay.textContent = 'جاري البحث عن خصم...';
        targetPlayerCard.classList.add('hidden');
        cooldownTimerDisplay.classList.add('hidden');
        challengeResultDisplay.classList.add('hidden');
    }
}

function startChallengeTimer() {
    if (challengeTimerInterval) clearInterval(challengeTimerInterval); // مسح أي مؤقت سابق
    challengeTimerInterval = setInterval(() => {
        challengeTimerRemaining--; // تقليل الوقت المتبقي
        const minutes = Math.floor(challengeTimerRemaining / 60);
        const seconds = challengeTimerRemaining % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (challengeTimerRemaining <= 0) {
            clearInterval(challengeTimerInterval); // إيقاف المؤقت عند الانتهاء
            if (challengeState === 'COOLDOWN') {
                startChallengeFlow(); // جلب لاعب جديد بعد انتهاء التهدئة
            }
        }
    }, 1000); // تحديث كل ثانية
}

function stopChallengeTimer() {
    if (challengeTimerInterval) {
        clearInterval(challengeTimerInterval);
        challengeTimerInterval = null;
    }
}

// معالج حدث زر الهجوم
function handleAttackClick() {
    if (challengeState === 'ATTACK_READY' && currentChallengePlayer) {
        const playerStrength = totalPower;
        const opponentStrength = currentChallengePlayer.totalPower;

        let result = '';
        let message = '';
        let playerDollarsGained = 0;
        let playerPointsGained = 0;
        let playerPowerGained = 0;

        // منطق بسيط للفوز/الخسارة: القوة الأعلى تفوز غالباً
        const winChance = playerStrength / (playerStrength + opponentStrength);
        const isWin = Math.random() < winChance;

        if (isWin) {
            result = 'win';
            playerDollarsGained = Math.floor(opponentStrength * 0.1); // كسب 10% من قوة الخصم كدولارات
            playerPointsGained = Math.floor(opponentStrength * 0.05); // كسب 5% كنقاط
            playerPowerGained = Math.floor(opponentStrength * 0.01); // كسب 1% كقوة
            dollars += playerDollarsGained;
            points += playerPointsGained;
            totalPower += playerPowerGained;
            message = `لقد فزت في التحدي ضد ${currentChallengePlayer.name}! حصلت على $${playerDollarsGained.toLocaleString()}، ${playerPointsGained.toLocaleString()} نقطة، و ${playerPowerGained.toLocaleString()} قوة.`;
            challengeResultDisplay.className = 'text-center text-xl font-semibold mt-4 text-green-500';
            challengeResultDisplay.textContent = 'فوز!';
        } else {
            result = 'lose';
            // عقوبات بسيطة للخسارة، أو عدم كسب أي شيء
            const penaltyDollars = Math.floor(dollars * 0.05); // خسارة 5% من الدولارات
            const penaltyPoints = Math.floor(points * 0.02); // خسارة 2% من النقاط
            dollars = Math.max(0, dollars - penaltyDollars);
            points = Math.max(0, points - penaltyPoints);
            message = `لقد خسرت في التحدي ضد ${currentChallengePlayer.name}. خسرت $${penaltyDollars.toLocaleString()} و ${penaltyPoints.toLocaleString()} نقطة.`;
            challengeResultDisplay.className = 'text-center text-xl font-semibold mt-4 text-red-500';
            challengeResultDisplay.textContent = 'خسارة!';
        }

        addNotification(message, isWin ? 'success' : 'error');
        // إضافة نتيجة التحدي إلى السجل
        challengeLog.unshift({
            opponentName: currentChallengePlayer.name,
            result: result,
            playerPower: playerStrength,
            opponentPower: opponentStrength
        });
        if (challengeLog.length > 10) challengeLog.pop(); // الاحتفاظ بآخر 10 إدخالات فقط في السجل

        savePlayerData(); // حفظ بيانات اللاعب المحدثة
        saveChallengeLog(); // حفظ سجل التحديات
        updateUI(); // تحديث واجهة المستخدم
        renderChallengeLog(); // إعادة رسم سجل التحديات

        // بدء فترة التهدئة بعد الهجوم (سواء فوز أو خسارة)
        challengeState = 'COOLDOWN';
        challengeTimerRemaining = 2 * 60; // مؤقت تهدئة لمدة دقيقتين بعد الهجوم
        renderCurrentChallengePlayer(); // تحديث عرض اللاعب المستهدف (ليظهر المؤقت)
        startChallengeTimer(); // بدء مؤقت التهدئة
    }
}

// وظائف الترتيب (Ranking)
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
                    isOnline: player.isOnline // تضمين حالة الاتصال
                });
            }
        }

        players.sort((a, b) => b.totalPower - a.totalPower); // ترتيب اللاعبين حسب القوة الإجمالية تنازلياً

        rankingList.innerHTML = ''; // مسح القائمة الحالية

        if (players.length === 0) {
            rankingList.innerHTML = '<tr><td colspan="3" class="py-2 px-4 text-center text-gray-400">لا يوجد لاعبون في الترتيب حالياً.</td></tr>';
            return;
        }

        players.forEach((player, index) => {
            const row = document.createElement('tr');
            const rankClass = (index === 0) ? 'text-yellow-400 font-bold' : // المركز الأول
                             (index === 1) ? 'text-gray-300 font-semibold' : // المركز الثاني
                             (index === 2) ? 'text-amber-500 font-semibold' : // المركز الثالث
                             'text-gray-300'; // باقي المراكز
            const highlightClass = (player.uid === userId) ? 'bg-indigo-700' : (index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-600'); // تمييز اللاعب الحالي

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

// وظائف جميع اللاعبين (All Players)
function fetchAllPlayers() {
    get(ref(database, 'users')).then((snapshot) => {
        const allPlayersData = snapshot.val();
        const allPlayersSorted = [];

        for (const uid in allPlayersData) {
            if (uid === userId) continue; // تخطي اللاعب الحالي

            const player = allPlayersData[uid].data;
            // لا توجد فلترة هنا، يتم عرض جميع اللاعبين بغض النظر عن حالة الاتصال أو القوة
            allPlayersSorted.push(player);
        }

        allPlayersSorted.sort((a, b) => b.totalPower - a.totalPower); // ترتيب اللاعبين حسب القوة الإجمالية تنازلياً

        allPlayersList.innerHTML = ''; // مسح القائمة الحالية

        if (allPlayersSorted.length === 0) {
            allPlayersList.innerHTML = '<p class="text-gray-400 col-span-full text-center">لا يوجد لاعبون لعرضهم حالياً.</p>';
            return;
        }

        allPlayersSorted.forEach(player => {
            const playerCard = document.createElement('div');
            const onlineStatusClass = player.isOnline ? 'bg-green-500' : 'bg-red-500';
            const onlineStatusText = player.isOnline ? 'متصل' : 'غير متصل';
            const bgColor = player.isOnline ? 'bg-gray-700' : 'bg-gray-800'; // خلفية مختلفة للمتصلين وغير المتصلين

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

// معالج حدث زر الإعدادات لفتح المودال
settingsButton.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    playerNameInput.value = playerName; // وضع الاسم الحالي في حقل الإدخال
    const now = Date.now();
    const timeSinceLastChange = now - lastPlayerNameChangeTimestamp;

    // منطق التحكم في تغيير الاسم
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

// معالج حدث زر إغلاق مودال الإعدادات
closeSettingsModalButton.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

// معالج حدث زر "موافق" في مودال الرسائل
messageModalOkButton.addEventListener('click', () => {
    messageModal.classList.add('hidden');
});

// معالج حدث زر إغلاق مودال الرسائل
closeMessageModalButton.addEventListener('click', () => {
    messageModal.classList.add('hidden');
});

// معالج حدث زر تأكيد تغيير الاسم
setNameConfirmButton.addEventListener('click', () => {
    const newName = playerNameInput.value.trim();
    if (newName && newName.length >= 3 && newName.length <= 20) { // التحقق من طول الاسم
        const oldPlayerName = playerName;
        playerName = newName;

        const now = Date.now();
        const timeSinceLastChange = now - lastPlayerNameChangeTimestamp;

        // إعادة فحص شروط تغيير الاسم (للتأكد مرة أخرى)
        if (isNameSetPermanently && nameChangeCount >= MAX_NAME_CHANGES) {
            showMessageModal('لا يمكن تغيير الاسم', `لقد وصلت إلى الحد الأقصى لتغيير الاسم (${MAX_NAME_CHANGES} مرات).`, 'info');
            return;
        }

        if (isNameSetPermanently && (Date.now() - lastPlayerNameChangeTimestamp < NAME_CHANGE_COOLDOWN_DURATION)) {
            const remainingTimeMs = NAME_CHANGE_COOLDOWN_DURATION - (now - lastPlayerNameChangeTimestamp);
            const remainingDays = Math.ceil(remainingTimeMs / (1000 * 60 * 60 * 24));
            showMessageModal('لا يمكن تغيير الاسم', `لا يمكنك تغيير اسمك إلا بعد مرور ${remainingDays} يوم(أيام) أخرى.`, 'info');
            return;
        }

        // زيادة عدد مرات تغيير الاسم فقط إذا تغير الاسم بالفعل وكان قد تم تعيينه بشكل دائم من قبل
        if (playerName !== oldPlayerName) {
            if (isNameSetPermanently) {
                nameChangeCount++;
            }
            isNameSetPermanently = true; // وضع علامة على أن الاسم تم تعيينه بشكل دائم
            lastPlayerNameChangeTimestamp = Date.now(); // تحديث وقت آخر تغيير للاسم
            addNotification(`تم تغيير اسمك إلى ${playerName}.`, 'success');
        } else {
            addNotification('لم يتغير الاسم.', 'info');
        }

        updateUI(); // تحديث واجهة المستخدم
        savePlayerData(); // حفظ بيانات اللاعب
        settingsModal.classList.add('hidden'); // إغلاق مودال الإعدادات
    } else {
        showMessageModal('اسم غير صالح', 'يجب أن يكون الاسم بين 3 و 20 حرفاً.', 'error');
    }
});

// معالج حدث زر حفظ اللعبة
saveGameButton.addEventListener('click', () => {
    savePlayerData();
    saveHouses();
    saveChallengeLog();
    saveNotifications();
    showMessageModal('حفظ اللعبة', 'تم حفظ بياناتك بنجاح!', 'success');
});

// معالج حدث زر تحميل اللعبة
loadGameButton.addEventListener('click', () => {
    loadPlayerData();
    loadHouses();
    loadChallengeLog();
    loadNotifications();
    showMessageModal('تحميل اللعبة', 'تم تحميل بياناتك بنجاح!', 'success');
});

// معالج حدث زر إعادة تعيين اللعبة
resetGameButton.addEventListener('click', () => {
    // تأكيد من المستخدم قبل إعادة التعيين
    if (confirm('هل أنت متأكد أنك تريد إعادة تعيين اللعبة؟ ستفقد كل تقدمك!')) {
        // إعادة تعيين جميع المتغيرات إلى قيمها الافتراضية
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
        nameChangeCount = 0; // إعادة تعيين عدد مرات تغيير الاسم
        activeHouseIndex = 0;
        houses = [ // إعادة تعيين البيوت إلى حالتها الافتراضية
            { id: 1, power: 1, unlocked: true, threshold: 25000, rewardedThresholds: [] },
            { id: 2, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] },
            { id: 3, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] },
            { id: 4, power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [] }
        ];
        challengeLog = []; // مسح سجل التحديات
        notifications = []; // مسح الإشعارات

        // مسح البيانات من Firebase أيضاً
        if (userId) {
            set(ref(database, 'users/' + userId + '/data'), null);
            set(ref(database, 'users/' + userId + '/houses'), null);
            set(ref(database, 'users/' + userId + '/challengeLog'), null);
            set(ref(database, 'users/' + userId + '/notifications'), null);
        }

        updateUI(); // تحديث واجهة المستخدم
        renderChallengeLog(); // إعادة رسم سجل التحديات
        renderNotifications(); // إعادة رسم الإشعارات
        showMessageModal('إعادة تعيين', 'تمت إعادة تعيين اللعبة بنجاح!', 'info');
        settingsModal.classList.add('hidden'); // إغلاق مودال الإعدادات
    }
});

// تبديل الشريط الجانبي (Sidebar)
sidebar.classList.remove('-translate-x-full'); // التأكد من إخفائه مبدئياً بواسطة CSS
settingsButton.addEventListener('click', () => {
    sidebar.classList.toggle('open'); // تبديل كلاس 'open' لإظهار/إخفاء الشريط
});

closeSidebarButton.addEventListener('click', () => {
    sidebar.classList.remove('open'); // إغلاق الشريط الجانبي
});

// روابط التنقل بين العروض المختلفة
navDashboard.addEventListener('click', () => showView('dashboard-view'));
navInnovation.addEventListener('click', () => showView('innovation-view'));
navChallenge.addEventListener('click', () => showView('challenge-view'));
navClan.addEventListener('click', () => showView('clan-view'));
navRanking.addEventListener('click', () => showView('ranking-view'));
navMarket.addEventListener('click', () => showView('market-view'));
navAllPlayers.addEventListener('click', () => showView('all-players-view'));

// معالج حدث زر الهجوم في نظام التحدي
attackButton.addEventListener('click', handleAttackClick);

// تحديث حالة اتصال المستخدم بالإنترنت بشكل دوري (كل دقيقة)
setInterval(() => {
    updateOnlineStatus(true);
}, 60 * 1000); // كل دقيقة
