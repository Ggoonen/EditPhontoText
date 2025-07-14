// استيراد وحدات Firebase الضرورية
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getDatabase, ref, set, get, onValue, update } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js';
import { getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js';

// تهيئة Firebase - تم استبدال القيم بقيم مشروعك السابقة
const firebaseConfig = {
    apiKey: "AIzaSyAgmDkMKcfMG3r_16t_6rcjZQJOUFVpVOo",
    authDomain: "kingb7ar-935b8.firebaseapp.com",
    databaseURL: "https://kingb7ar-935b8-default-rtdb.firebaseio.com",
    projectId: "kingb7ar-935b8",
    storageBucket: "kingb7ar-935b8.firebaseapp.com",
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

let currentHouseIndex = 0; // فهرس البيت النشط حالياً
let houses = [ // تعريف البيوت الأربعة
    { id: 1, name: "البيت الأول", power: 1, unlocked: true, threshold: 25000, rewardedThresholds: [], img: "https://f.top4top.io/p_3479z75z10.png" },
    { id: 2, name: "البيت الثاني", power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [], img: "https://i.top4top.io/p_34791336l0.png" },
    { id: 3, name: "البيت الثالث", power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [], img: "https://k.top4top.io/p_3479f6o0n0.png" },
    { id: 4, name: "البيت الرابع", power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [], img: "https://l.top4top.io/p_347900b1w0.png" }
];
const HOUSE_UPGRADE_REWARDS = [
    { threshold: 250, dollars: 1250, points: 500 },
    { threshold: 500, dollars: 2500, points: 1000 },
    { threshold: 1000, dollars: 5000, points: 2000 },
    { threshold: 2000, dollars: 10000, points: 4000 },
    { threshold: 4000, dollars: 20000, points: 8000 },
    { threshold: 8000, dollars: 40000, points: 16000 },
    { threshold: 15000, dollars: 75000, points: 30000 },
    { threshold: 20000, dollars: 100000, points: 40000 }
];

let challengeState = 'ATTACK_READY'; // حالة نظام التحدي: 'ATTACK_READY' (جاهز للهجوم)، 'COOLDOWN' (في فترة تهدئة)
let currentChallengePlayer = null; // اللاعب المستهدف في التحدي الحالي
let challengeTimerRemaining = 0; // الوقت المتبقي في مؤقت التحدي (بالثواني)
let challengeTimerInterval = null; // معرف مؤقت التحدي
let globalAttacks = []; // سجل الهجمات العالمية (للعرض في سجل التحدي)
const MAX_GLOBAL_ATTACKS = 5;

let inventory = []; // { id: 'item-id', name: 'اسم العنصر', type: 'نوع العنصر', quantity: 1 }

const REDEEM_CODES = {
    "FREE2000": { dollars: 2000, points: 1000, power: 500, usedBy: [] },
    "POWERUP100": { dollars: 0, points: 0, power: 100, usedBy: [] },
    "POINTS500": { dollars: 0, points: 500, power: 0, usedBy: [] }
};

// عناصر DOM
const loadingOverlay = document.getElementById('loading-overlay');
const appDiv = document.querySelector('.w-full.max-w-md.mx-auto'); // العنصر الرئيسي للتطبيق

// عناصر القائمة الرئيسية
const playerNameDisplayMain = document.getElementById('player-name-display');
const playerPointsDisplayMain = document.getElementById('player-points-display');
const playerDollarsDisplayMain = document.getElementById('player-dollars-display');
const playerTotalPowerDisplayMain = document.getElementById('player-total-power-display-main');

const playMenuItem = document.getElementById('play-menu-item');
const attackLogMenuItem = document.getElementById('attack-log-menu-item');
const storeMenuItem = document.getElementById('store-menu-item');
const onlineMenuItem = document.getElementById('online-menu-item');
const challengeMenuItem = document.getElementById('challenge-menu-item');
const redeemCodeMenuItem = document.getElementById('redeem-code-menu-item');

// عناصر Game View
const gameView = document.getElementById('game-view');
const backToMainFromGame = document.getElementById('back-to-main-from-game');
const innovationPrevButton = document.getElementById('innovation-prev-button');
const innovationNextButton = document.getElementById('innovation-next-button');
const innovationButton = document.getElementById('innovation-button');
const innovationButtonText = document.getElementById('innovation-button-text');
const innovationTimerDisplay = document.getElementById('innovation-timer');
const timerDisplayValue = document.getElementById('timer-display-value');
const gameTotalPowerDisplay = document.getElementById('game-total-power-display');
const playerTotalPowerDisplayGame = document.getElementById('player-total-power-display-game');
const housesContainer = document.getElementById('houses-container');
const nextHouseInfo = document.getElementById('next-house-info');
const gameInfoIcon = document.getElementById('game-info-icon');
const inventoryIcon = document.getElementById('inventory-icon');
const inventoryCountDisplay = document.getElementById('inventory-count');

// عناصر Attack Log View
const attackLogView = document.getElementById('attack-log-view');
const backToMainFromAttackLog = document.getElementById('back-to-main-from-attack-log');
const globalAttacksList = document.getElementById('global-attacks-list');

// عناصر Store View
const storeView = document.getElementById('store-view');
const backToMainFromStore = document.getElementById('back-to-main-from-store');
const storePlayerPointsDisplay = document.getElementById('store-player-points-display');
const storePlayerDollarsDisplay = document.getElementById('store-player-dollars-display');
const storePlayerTotalPowerDisplay = document.getElementById('store-player-total-power-display');
const storeItemReduceTime = document.getElementById('store-item-reduce-time');
const storeItemConvertPoints = document.getElementById('store-item-convert-points');
const storeItemBuyInnovation3 = document.getElementById('store-item-buy-innovation3');

// عناصر Challenge View
const challengeView = document.getElementById('challenge-view');
const backToMainFromChallenge = document.getElementById('back-to-main-from-challenge');
const challengePlayersList = document.getElementById('challenge-players-list');

// عناصر Online View
const onlineView = document.getElementById('online-view');
const backToMainFromOnline = document.getElementById('back-to-main-from-online');
const onlinePlayersList = document.getElementById('online-players-list');
const allPlayersList = document.getElementById('all-players-list');
const playerTotalPowerDisplayOnline = document.getElementById('player-total-power-display-online');

// عناصر Redeem Code View
const redeemCodeView = document.getElementById('redeem-code-view');
const backToMainFromRedeemCode = document.getElementById('back-to-main-from-redeem-code');
const redeemCodeInput = document.getElementById('redeem-code-input');
const redeemCodeButton = document.getElementById('redeem-code-button');
const redeemStatusMessage = document.getElementById('redeem-status-message');

// عناصر Dollar Collector
const dollarCollector = document.getElementById('dollar-collector');
const dollarCollectorProgress = document.getElementById('dollar-collector-progress');
const accumulatedDollarsDisplay = document.getElementById('accumulated-dollars-display');
const accumulatedPointsDisplay = document.getElementById('accumulated-points-display');
const accumulatedPowerDisplay = document.getElementById('accumulated-power-display');
const collectDollarsButton = document.getElementById('collect-dollars-button');

// عناصر Popup Modal (للترقيات)
const popupModal = document.getElementById('popup-modal');
const powerIncreaseDisplay = document.getElementById('power-increase-display');
const totalPowerDisplayPopup = document.getElementById('total-power-display');
const popupCloseButton = document.getElementById('popup-close-button');

// عناصر House Info Modal
const houseInfoModal = document.getElementById('house-info-modal');
const houseUpgradeRewardsList = document.getElementById('house-upgrade-rewards-list');
const houseInfoCloseButton = document.getElementById('house-info-close-button');

// عناصر Message Modal
const messageModal = document.getElementById('message-modal');
const messageModalTitle = document.getElementById('message-modal-title');
const messageModalText = document.getElementById('message-modal-text');
const messageModalCloseButton = document.getElementById('message-modal-close-button');

// عناصر Password Input Modal
const passwordInputModal = document.getElementById('password-input-modal');
const passwordInput = document.getElementById('password-input');
const passwordConfirmButton = document.getElementById('password-confirm-button');
const passwordCancelButton = document.getElementById('password-cancel-button');

// عناصر Store Detail Modal
const storeDetailModal = document.getElementById('store-detail-modal');
const storeDetailImage = document.getElementById('store-detail-image');
const storeDetailTitle = document.getElementById('store-detail-title');
const storeDetailDescription = document.getElementById('store-detail-description');
const storeDetailQuantityMinus = document.getElementById('store-detail-quantity-minus');
const storeDetailQuantityDisplay = document.getElementById('store-detail-quantity-display');
const storeDetailTotalCost = document.getElementById('store-detail-total-cost');
const storeDetailConfirmButton = document.getElementById('store-detail-confirm-button');
const storeDetailCancelButton = document.getElementById('store-detail-cancel-button');
const storeDetailQuantityPlus = document.getElementById('store-detail-quantity-plus'); // تأكد من وجود هذا العنصر

// عناصر Inventory Modal
const inventoryModal = document.getElementById('inventory-modal');
const inventoryItemsList = document.getElementById('inventory-items-list');
const inventoryCloseButton = document.getElementById('inventory-close-button');

// عناصر Auth Flow Modal
const authFlowModal = document.getElementById('auth-flow-modal');
const authModalTitle = document.getElementById('auth-modal-title');
const setNameSection = document.getElementById('set-name-section');
const authEmailInput = document.getElementById('auth-email-input');
const authPasswordInput = document.getElementById('auth-password-input');
const authSignupButton = document.getElementById('auth-signup-button');
const authSigninButton = document.getElementById('auth-signin-button');
const showEmailAuthButton = document.getElementById('show-email-auth-button');
const backToNameSectionButton = document.getElementById('back-to-name-section-button');
const setNameConfirmButtonAuth = document.getElementById('set-name-confirm-button'); // تم تغيير الاسم لتجنب التعارض
const setNameContinueGuestButton = document.getElementById('set-name-continue-guest-button');
const authFlowCancelButton = document.getElementById('auth-flow-cancel-button'); // زر الإلغاء في مودال المصادقة

// عناصر Toast Notification
const toastNotification = document.getElementById('toast-notification');

// حالة المتجر الحالية
let currentStoreItem = null;
let currentStoreQuantity = 1;

// وظائف عامة للتحكم في واجهة المستخدم
function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.style.transform = 'translateX(100%)'; // تحريك جميع العروض إلى اليمين
        view.classList.remove('active'); // إزالة كلاس active
    });
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.style.transform = 'translateX(0)'; // تحريك العرض النشط إلى المنتصف
        activeView.classList.add('active'); // إضافة كلاس active
    }
    updateUI(); // تحديث الواجهة بعد تغيير العرض
}

// إظهار نافذة منبثقة (مودال)
function showModal(modalElement) {
    modalElement.classList.add('visible');
    // تأكد من أن العنصر الداخلي هو الذي يتحرك ويتغير شفافيته
    const innerContent = modalElement.querySelector('.popup-content, .message-modal-content, div:first-of-type > div:first-of-type');
    if (innerContent) {
        innerContent.classList.add('scale-100', 'opacity-100');
    }
}

// إخفاء نافذة منبثقة (مودال)
function hideModal(modalElement) {
    const innerContent = modalElement.querySelector('.popup-content, .message-modal-content, div:first-of-type > div:first-of-type');
    if (innerContent) {
        innerContent.classList.remove('scale-100', 'opacity-100');
    }
    modalElement.classList.remove('visible');
}

// عرض رسالة في نافذة منبثقة (مودال)
function showMessageModal(title, message) {
    messageModalTitle.textContent = title;
    messageModalText.textContent = message;
    showModal(messageModal);
}

// إظهار إشعار Toast
function showToast(message, type = 'info') {
    toastNotification.textContent = message;
    toastNotification.className = `fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg opacity-0 transition-opacity duration-300 z-50 ${type}`;
    toastNotification.classList.add('opacity-100');
    setTimeout(() => {
        toastNotification.classList.remove('opacity-100');
    }, 3000); // يختفي بعد 3 ثوانٍ
}

// تحديث جميع عناصر واجهة المستخدم بالقيم الحالية للمتغيرات
function updateUI() {
    playerNameDisplayMain.textContent = playerName;
    playerPointsDisplayMain.textContent = points.toLocaleString();
    playerDollarsDisplayMain.textContent = dollars.toLocaleString();
    playerTotalPowerDisplayMain.textContent = totalPower.toLocaleString();

    playerTotalPowerDisplayGame.textContent = totalPower.toLocaleString();
    playerTotalPowerDisplayOnline.textContent = totalPower.toLocaleString();

    storePlayerPointsDisplay.textContent = points.toLocaleString();
    storePlayerDollarsDisplay.textContent = dollars.toLocaleString();
    storePlayerTotalPowerDisplay.textContent = totalPower.toLocaleString();

    accumulatedDollarsDisplay.textContent = `$${Math.floor(accumulatedDollars).toLocaleString()}`;
    accumulatedPointsDisplay.textContent = Math.floor(accumulatedPoints).toLocaleString();
    accumulatedPowerDisplay.textContent = Math.floor(accumulatedPower).toLocaleString();

    updateCollectButtonState(); // تحديث حالة زر جمع الموارد
    renderHouses(); // إعادة رسم البيوت
    renderInventoryCount(); // تحديث عدد العناصر في المخزون
}

// تحديث حالة زر جمع الموارد (نشط/معطل بناءً على المؤقت)
function updateCollectButtonState() {
    const now = Date.now();
    const timeLeftMs = COLLECT_COOLDOWN_DURATION - (now - lastCollectTime);
    const progress = Math.min(100, ((COLLECT_COOLDOWN_DURATION - timeLeftMs) / COLLECT_COOLDOWN_DURATION) * 100);
    dollarCollectorProgress.style.width = `${progress}%`;

    if (timeLeftMs <= 0) {
        collectDollarsButton.disabled = false;
        collectDollarsButton.classList.remove('opacity-50', 'cursor-not-allowed');
        dollarCollectorProgress.style.width = '100%';
        collectDollarsButton.textContent = 'استلام';
    } else {
        collectDollarsButton.disabled = true;
        collectDollarsButton.classList.add('opacity-50', 'cursor-not-allowed');
        const minutes = Math.floor(timeLeftMs / (1000 * 60));
        const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);
        collectDollarsButton.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// تحديث عرض عدد العناصر في المخزون
function renderInventoryCount() {
    const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
    inventoryCountDisplay.textContent = totalItems.toLocaleString();
    inventoryCountDisplay.classList.toggle('hidden', totalItems === 0);
}

// دمج وإعدادات Firebase: تتم المصادقة وتحميل البيانات الأولية هنا
onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid; // تعيين معرف المستخدم
        console.log("User authenticated:", userId);
        loadPlayerData(); // تحميل بيانات اللاعب
        loadHouses(); // تحميل بيانات البيوت
        loadGlobalAttacks(); // تحميل سجل الهجمات العالمية
        loadInventory(); // تحميل المخزون
        listenForPlayerUpdates(); // بدء الاستماع لتحديثات اللاعبين الآخرين (للترتيب وقائمة اللاعبين)
        updateOnlineStatus(true); // تعيين حالة المستخدم كـ "متصل"
        startAccumulationLoop(); // بدء حلقة تراكم الموارد
        loadingOverlay.classList.add('hidden'); // إخفاء شاشة التحميل
        showView('main-menu-view'); // عرض القائمة الرئيسية
    } else {
        // إذا لم يكن هناك مستخدم مسجل الدخول، حاول تسجيل الدخول كمستخدم مجهول
        signInAnonymously(auth)
            .then(() => {
                // إذا كان تسجيل الدخول المجهول ناجحاً، سيتم تشغيل onAuthStateChanged مرة أخرى
                // وإذا لم يكن المستخدم جديداً، سيتم تحميل بياناته
                console.log("Signed in anonymously.");
            })
            .catch((error) => {
                console.error("Error signing in anonymously: ", error);
                showMessageModal('خطأ', 'فشل تسجيل الدخول التلقائي. يرجى المحاولة مرة أخرى.', 'error');
            });
    }
});

// وظائف حفظ وتحميل البيانات من/إلى Firebase
function savePlayerData() {
    if (!userId) {
        console.warn("Cannot save player data: userId is null.");
        return;
    }
    set(ref(database, 'users/' + userId + '/data'), {
        playerName: playerName,
        dollars: dollars,
        points: points,
        totalPower: totalPower,
        innovationLevel: innovationLevel,
        innovationCost: innovationCost,
        innovationPowerIncrease: innovationPowerIncrease,
        accumulatedDollars: accumulatedDollars,
        accumulatedPoints: accumulatedPoints,
        accumulatedPower: accumulatedPower,
        lastCollectTime: lastCollectTime,
        isNameSetPermanently: isNameSetPermanently,
        lastPlayerNameChangeTimestamp: lastPlayerNameChangeTimestamp,
        nameChangeCount: nameChangeCount,
        lastOnline: Date.now() // تحديث وقت آخر اتصال
    }).then(() => {
        console.log("Player data saved successfully!");
    }).catch((error) => {
        console.error("Error saving player data: ", error);
        showToast('فشل حفظ البيانات.', 'error');
    });
}

function loadPlayerData() {
    if (!userId) {
        console.warn("Cannot load player data: userId is null.");
        return;
    }
    get(ref(database, 'users/' + userId + '/data')).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            playerName = data.playerName || "لاعب جديد";
            dollars = data.dollars || 0;
            points = data.points || 0;
            totalPower = data.totalPower || 0;
            innovationLevel = data.innovationLevel || 1;
            innovationCost = data.innovationCost || 100;
            innovationPowerIncrease = data.innovationPowerIncrease || 10;
            accumulatedDollars = data.accumulatedDollars || 0;
            accumulatedPoints = data.accumulatedPoints || 0;
            accumulatedPower = data.accumulatedPower || 0;
            lastCollectTime = data.lastCollectTime || 0;
            isNameSetPermanently = data.isNameSetPermanently || false;
            lastPlayerNameChangeTimestamp = data.lastPlayerNameChangeTimestamp || 0;
            nameChangeCount = data.nameChangeCount || 0;
            console.log("Player data loaded:", data);
        } else {
            console.log("No player data found. This is a new user or data was reset.");
            // إذا لم يتم العثور على بيانات، هذا يعني مستخدم جديد
            // يتم استدعاء showAuthFlowModal فقط إذا لم يكن الاسم قد تم تعيينه بشكل دائم
            if (!isNameSetPermanently) {
                showAuthFlowModal("أهلاً بك أيها المغامر الجديد!", "يرجى تعيين اسمك أو تسجيل الدخول لحفظ تقدمك.");
            }
            savePlayerData(); // حفظ البيانات الافتراضية للمستخدم الجديد
        }
        updateUI(); // تحديث واجهة المستخدم بعد التحميل
    }).catch((error) => {
        console.error("Error loading player data: ", error);
        showToast('فشل تحميل البيانات.', 'error');
    });
}

function saveHouses() {
    if (!userId) {
        console.warn("Cannot save houses: userId is null.");
        return;
    }
    set(ref(database, 'users/' + userId + '/houses'), houses)
        .then(() => console.log("Houses saved successfully"))
        .catch(error => console.error("Error saving houses: ", error));
    set(ref(database, 'users/' + userId + '/currentHouseIndex'), currentHouseIndex)
        .then(() => console.log("Current house index saved successfully"))
        .catch(error => console.error("Error saving current house index: ", error));
}

function loadHouses() {
    if (!userId) {
        console.warn("Cannot load houses: userId is null.");
        return;
    }
    get(ref(database, 'users/' + userId + '/houses')).then((snapshot) => {
        if (snapshot.exists()) {
            const loadedHouses = snapshot.val();
            console.log("Loaded houses raw:", loadedHouses);
            // التأكد من أن جميع البيوت المحملة تحتوي على الخصائص المطلوبة
            if (Array.isArray(loadedHouses) && loadedHouses.length === houses.length) {
                houses = loadedHouses.map((loadedHouse, index) => {
                    // دمج البيانات المحملة مع الخصائص الافتراضية لضمان عدم فقدان أي شيء
                    return {
                        ...houses[index], // الاحتفاظ بالخصائص الافتراضية مثل الاسم والصورة
                        ...loadedHouse, // دمج البيانات المحملة من Firebase
                        rewardedThresholds: loadedHouse.rewardedThresholds || [] // التأكد من وجود rewardedThresholds كـ array
                    };
                });
                console.log("Houses merged:", houses);
            } else {
                console.warn("Loaded houses structure is incorrect, resetting to default.");
                // إذا كانت البيانات غير متطابقة، قم بإعادة تعيينها إلى الافتراضي وحفظها
                houses = [
                    { id: 1, name: "البيت الأول", power: 1, unlocked: true, threshold: 25000, rewardedThresholds: [], img: "https://f.top4top.io/p_3479z75z10.png" },
                    { id: 2, name: "البيت الثاني", power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [], img: "https://i.top4top.io/p_34791336l0.png" },
                    { id: 3, name: "البيت الثالث", power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [], img: "https://k.top4top.io/p_3479f6o0n0.png" },
                    { id: 4, name: "البيت الرابع", power: 1, unlocked: false, threshold: 25000, rewardedThresholds: [], img: "https://l.top4top.io/p_347900b1w0.png" }
                ];
                saveHouses();
            }
        } else {
            console.log("No house data found. Saving default houses.");
            saveHouses(); // حفظ البيوت الافتراضية إذا لم يتم العثور عليها
        }
    }).then(() => {
        return get(ref(database, 'users/' + userId + '/currentHouseIndex'));
    }).then((snapshot) => {
        if (snapshot.exists()) {
            currentHouseIndex = snapshot.val();
            if (currentHouseIndex >= houses.length || currentHouseIndex < 0) {
                currentHouseIndex = 0; // إعادة تعيين إذا كان الفهرس غير صالح
            }
            console.log("Current house index loaded:", currentHouseIndex);
        } else {
            currentHouseIndex = 0;
            console.log("No current house index found. Setting to 0.");
        }
        updateUI(); // تحديث واجهة المستخدم بعد تحميل البيوت والفهرس النشط
    }).catch((error) => {
        console.error("Error loading houses or index: ", error);
        showToast('فشل تحميل معلومات البيوت.', 'error');
    });
}


function saveGlobalAttacks() {
    // Keep only the latest MAX_GLOBAL_ATTACKS
    if (globalAttacks.length > MAX_GLOBAL_ATTACKS) {
        globalAttacks = globalAttacks.slice(0, MAX_GLOBAL_ATTACKS);
    }
    set(ref(database, 'global/attacks'), globalAttacks)
        .then(() => console.log("Global attacks saved successfully"))
        .catch(error => console.error("Error saving global attacks: ", error));
}

function loadGlobalAttacks() {
    onValue(ref(database, 'global/attacks'), (snapshot) => {
        if (snapshot.exists()) {
            globalAttacks = snapshot.val() || [];
            renderGlobalAttacks();
        } else {
            globalAttacks = [];
            renderGlobalAttacks();
        }
    }, (error) => {
        console.error("Error loading global attacks: ", error);
    });
}

function renderGlobalAttacks() {
    globalAttacksList.innerHTML = '';
    if (globalAttacks.length === 0) {
        globalAttacksList.innerHTML = '<p class="text-gray-400 text-center">لا توجد هجمات عالمية حالياً.</p>';
        return;
    }
    globalAttacks.forEach(attack => {
        const attackElement = document.createElement('div');
        attackElement.className = `p-3 rounded-lg shadow-sm ${attack.result === 'win' ? 'bg-green-800' : 'bg-red-800'} text-gray-100 text-sm`;
        attackElement.innerHTML = `
            <p><span class="font-semibold">${attack.attackerName}</span> (قوة: ${attack.attackerPower.toLocaleString()}) هاجم <span class="font-semibold">${attack.defenderName}</span> (قوة: ${attack.defenderPower.toLocaleString()})</p>
            <p class="text-xs text-gray-300 mt-1">النتيجة: <span class="font-bold">${attack.result === 'win' ? 'فوز' : 'خسارة'}</span> - في ${new Date(attack.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
        `;
        globalAttacksList.appendChild(attackElement);
    });
}

function saveInventory() {
    if (!userId) {
        console.warn("Cannot save inventory: userId is null.");
        return;
    }
    set(ref(database, 'users/' + userId + '/inventory'), inventory)
        .then(() => console.log("Inventory saved successfully"))
        .catch(error => console.error("Error saving inventory: ", error));
}

function loadInventory() {
    if (!userId) {
        console.warn("Cannot load inventory: userId is null.");
        return;
    }
    get(ref(database, 'users/' + userId + '/inventory')).then((snapshot) => {
        if (snapshot.exists()) {
            inventory = snapshot.val() || [];
            console.log("Inventory loaded:", inventory);
        } else {
            inventory = [];
            console.log("No inventory data found.");
        }
        renderInventoryCount();
    }).catch((error) => {
        console.error("Error loading inventory: ", error);
    });
}

// تحديث حالة الاتصال بالإنترنت للمستخدم الحالي
function updateOnlineStatus(isOnline) {
    if (!userId) {
        console.warn("Cannot update online status: userId is null.");
        return;
    }
    update(ref(database, 'users/' + userId + '/data'), {
        isOnline: isOnline,
        lastOnline: Date.now()
    }).catch(error => console.error("Error updating online status: ", error));
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
        console.log("Firebase users data updated. Refreshing players lists.");
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
        showToast('انتظر قليلاً، المؤقت لا يزال نشطًا.', 'info');
        return;
    }

    // إضافة الموارد المتراكمة إلى رصيد اللاعب
    dollars += Math.floor(accumulatedDollars);
    points += Math.floor(accumulatedPoints);
    totalPower += Math.floor(accumulatedPower);
    showToast(`تم استلام $${Math.floor(accumulatedDollars).toLocaleString()} و ${Math.floor(accumulatedPoints).toLocaleString()} نقطة و ${Math.floor(accumulatedPower).toLocaleString()} قوة!`, 'success');

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
        const currentHouse = houses[currentHouseIndex];
        const houseBonus = currentHouse.power * 0.01; // مكافأة من قوة البيت الحالي (1%)

        accumulatedDollars += (incomeRate + houseBonus) / 60; // تتراكم كل ثانية (مقسمة على 60 لتكون معدل دقيقة)
        accumulatedPoints += (incomeRate + houseBonus) / 60;
        accumulatedPower += (powerIncomeRate + houseBonus / 10) / 60;

        updateUI(); // تحديث واجهة المستخدم بشكل متكرر لعرض التراكم
    }, 1000); // كل ثانية
}

// وظائف الابتكار (Play View)
function renderHouses() {
    housesContainer.innerHTML = '';
    houses.forEach((house, index) => {
        const houseCard = document.createElement('div');
        houseCard.className = `house-card ${index === currentHouseIndex ? 'active-house' : ''}`;
        houseCard.innerHTML = `
            <img src="${house.img}" alt="${house.name}" class="house-image">
            <h4 class="text-xl font-semibold text-gray-100 mb-1">${house.name}</h4>
            <p class="text-gray-300 text-sm">القوة: <span class="font-bold text-red-400">${house.power.toLocaleString()}</span></p>
            <p class="text-gray-400 text-xs mt-1">المطلوب للبيت التالي: ${house.threshold.toLocaleString()}</p>
        `;
        housesContainer.appendChild(houseCard);
    });

    // تحديث معلومات البيت التالي
    const nextHouse = houses[currentHouseIndex + 1];
    if (nextHouse && !nextHouse.unlocked) {
        nextHouseInfo.classList.remove('hidden');
        nextHouseInfo.innerHTML = `
            <p class="text-lg">البيت التالي: <span class="font-bold text-indigo-400">${nextHouse.name}</span></p>
            <p class="text-sm text-gray-400">يتطلب قوة ${nextHouse.threshold.toLocaleString()} لفتح.</p>
        `;
    } else {
        nextHouseInfo.classList.add('hidden');
    }
}

function activateInnovation() {
    if (dollars >= innovationCost) {
        dollars -= innovationCost;
        innovationLevel++;
        totalPower += innovationPowerIncrease;
        innovationCost = Math.floor(innovationCost * 1.5);
        innovationPowerIncrease = Math.floor(innovationPowerIncrease * 1.1);

        // زيادة قوة البيت الحالي
        houses[currentHouseIndex].power += 100;

        showToast(`تم تطوير القوة الرئيسية. أصبحت قوتك ${totalPower.toLocaleString()}!`, 'success');

        // عرض البوب أب
        powerIncreaseDisplay.textContent = innovationPowerIncrease.toLocaleString();
        totalPowerDisplayPopup.textContent = totalPower.toLocaleString();
        showModal(popupModal);

        // التحقق من فتح البيت التالي
        const currentHouse = houses[currentHouseIndex];
        const nextHouseIndex = currentHouseIndex + 1;
        if (nextHouseIndex < houses.length && !houses[nextHouseIndex].unlocked) {
            if (currentHouse.power >= currentHouse.threshold) {
                houses[nextHouseIndex].unlocked = true;
                showMessageModal('بيت جديد مفتوح!', `تهانينا! لقد فتحت البيت رقم ${houses[nextHouseIndex].id}: ${houses[nextHouseIndex].name}!`, 'success');
            }
        }

        // التحقق من مكافآت قوة البيت
        HOUSE_UPGRADE_REWARDS.forEach(reward => {
            if (currentHouse.power >= reward.threshold && !currentHouse.rewardedThresholds.includes(reward.threshold)) {
                dollars += reward.dollars;
                points += reward.points;
                showToast(`لقد وصلت قوة البيت ${currentHouse.id} إلى ${reward.threshold.toLocaleString()}! حصلت على $${reward.dollars.toLocaleString()} و ${reward.points.toLocaleString()} نقطة مكافأة!`, 'success');
                currentHouse.rewardedThresholds.push(reward.threshold);
            }
        });

    } else {
        showToast('مال غير كافٍ للابتكار!', 'error');
    }
    updateUI();
    savePlayerData();
    saveHouses();
}

// وظائف Store View
const storeItems = {
    'reduce-time': {
        id: 'reduce-time',
        title: 'تقليل وقت الابتكار',
        description: 'يقلل من وقت انتظار الابتكار التالي بنسبة 10%.',
        cost: 200,
        currency: 'dollars',
        img: 'https://f.top4top.io/p_3479ijdcl0.png',
        action: () => {
            // هذا العنصر سيتم استخدامه كعنصر مخزون
            const existingItem = inventory.find(item => item.id === 'reduce-time');
            if (existingItem) {
                existingItem.quantity++;
            } else {
                inventory.push({ id: 'reduce-time', name: 'تقليل وقت الابتكار', type: 'consumable', quantity: 1 });
            }
            showToast('تمت إضافة عنصر "تقليل وقت الابتكار" إلى حقيبتك!', 'success');
        }
    },
    'convert-points': {
        id: 'convert-points',
        title: 'تحويل النقاط',
        description: 'يحول 500 نقطة إلى 250 دولار.',
        cost: 500,
        currency: 'points',
        img: 'https://i.top4top.io/s_34795cyi20.png',
        action: () => {
            if (points >= 500) {
                points -= 500;
                dollars += 250;
                showToast('تم تحويل 500 نقطة إلى 250 دولار!', 'success');
            } else {
                showToast('نقاط غير كافية للتحويل.', 'error');
            }
        }
    },
    'buy-innovation3': {
        id: 'buy-innovation3',
        title: 'شراء ابتكار ثالث',
        description: 'يزيد مستوى الابتكار لديك بشكل كبير.',
        cost: 3000,
        currency: 'points',
        img: 'https://f.top4top.io/s_34796x9520.png',
        action: () => {
            innovationLevel += 3; // مثال: زيادة 3 مستويات ابتكار
            totalPower += innovationPowerIncrease * 3; // زيادة القوة بناءً على ذلك
            showToast('تم شراء ابتكار ثالث بنجاح!', 'success');
        }
    }
};

function openStoreDetailModal(itemId) {
    currentStoreItem = storeItems[itemId];
    if (!currentStoreItem) {
        console.error("Store item not found:", itemId);
        return;
    }

    storeDetailImage.src = currentStoreItem.img;
    storeDetailTitle.textContent = currentStoreItem.title;
    storeDetailDescription.textContent = currentStoreItem.description;
    currentStoreQuantity = 1; // إعادة تعيين الكمية عند فتح المودال
    updateStoreDetailCost();
    showModal(storeDetailModal);
}

function updateStoreDetailCost() {
    if (!currentStoreItem) return;
    const cost = currentStoreItem.cost * currentStoreQuantity;
    const currencySymbol = currentStoreItem.currency === 'dollars' ? '$' : '';
    storeDetailTotalCost.textContent = `${currencySymbol}${cost.toLocaleString()}`;
    storeDetailQuantityDisplay.textContent = currentStoreQuantity;
}

function confirmPurchase() {
    if (!currentStoreItem) return;

    const totalCost = currentStoreItem.cost * currentStoreQuantity;
    let canAfford = false;

    if (currentStoreItem.currency === 'dollars') {
        if (dollars >= totalCost) {
            dollars -= totalCost;
            canAfford = true;
        }
    } else if (currentStoreItem.currency === 'points') {
        if (points >= totalCost) {
            points -= totalCost;
            canAfford = true;
        }
    }

    if (canAfford) {
        for (let i = 0; i < currentStoreQuantity; i++) {
            currentStoreItem.action(); // تنفيذ الإجراء لكل كمية
        }
        showToast(`تم شراء ${currentStoreQuantity} من ${currentStoreItem.title} بنجاح!`, 'success');
        hideModal(storeDetailModal);
        updateUI();
        savePlayerData();
        saveInventory(); // تأكد من حفظ المخزون بعد الشراء
    } else {
        showToast('موارد غير كافية للشراء.', 'error');
    }
}

// وظائف Challenge View
function selectRandomChallengePlayer() {
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

        challengePlayersList.innerHTML = ''; // مسح القائمة الحالية

        if (eligiblePlayers.length > 0) {
            // عرض اللاعبين المؤهلين للتحدي
            eligiblePlayers.forEach(player => {
                const playerCard = document.createElement('div');
                playerCard.className = `player-card bg-gray-700 p-4 rounded-xl shadow-md flex items-center justify-between transition duration-200 ease-in-out hover:bg-gray-600 cursor-pointer`;
                playerCard.innerHTML = `
                    <div>
                        <h4 class="text-lg font-semibold text-white">${player.name}</h4>
                        <p class="text-sm text-gray-300">القوة: <span class="font-bold text-red-400">${player.totalPower.toLocaleString()}</span></p>
                    </div>
                    <button data-player-uid="${player.uid}" data-player-name="${player.name}" data-player-power="${player.totalPower}" class="attack-button bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200 ease-in-out">
                        هجوم
                    </button>
                `;
                challengePlayersList.appendChild(playerCard);
            });
        } else {
            challengePlayersList.innerHTML = '<p class="text-gray-400 text-center">لا يوجد خصوم متاحون حاليًا.</p>';
        }
    }).catch(error => {
        console.error("Error fetching players for challenge: ", error);
        challengePlayersList.innerHTML = '<p class="text-red-400 text-center">حدث خطأ في تحميل الخصوم.</p>';
    });
}

function handleAttack(opponentUid, opponentName, opponentPower) {
    if (challengeState === 'COOLDOWN') {
        showToast('يجب الانتظار حتى انتهاء مؤقت التهدئة قبل الهجوم مرة أخرى.', 'info');
        return;
    }

    const playerStrength = totalPower;
    const opponentStrength = opponentPower;

    let result = '';
    let message = '';
    let playerDollarsGained = 0;
    let playerPointsGained = 0;
    let playerPowerGained = 0;

    const winChance = playerStrength / (playerStrength + opponentStrength);
    const isWin = Math.random() < winChance;

    if (isWin) {
        result = 'win';
        playerDollarsGained = Math.floor(opponentStrength * 0.1);
        playerPointsGained = Math.floor(opponentStrength * 0.05);
        playerPowerGained = Math.floor(opponentStrength * 0.01);
        dollars += playerDollarsGained;
        points += playerPointsGained;
        totalPower += playerPowerGained;
        message = `لقد فزت في التحدي ضد ${opponentName}! حصلت على $${playerDollarsGained.toLocaleString()}، ${playerPointsGained.toLocaleString()} نقطة، و ${playerPowerGained.toLocaleString()} قوة.`;
    } else {
        result = 'lose';
        const penaltyDollars = Math.floor(dollars * 0.05);
        const penaltyPoints = Math.floor(points * 0.02);
        dollars = Math.max(0, dollars - penaltyDollars);
        points = Math.max(0, points - penaltyPoints);
        message = `لقد خسرت في التحدي ضد ${opponentName}. خسرت $${penaltyDollars.toLocaleString()} و ${penaltyPoints.toLocaleString()} نقطة.`;
    }

    showToast(message, isWin ? 'success' : 'error');

    // إضافة الهجوم إلى السجل العالمي
    const attackEntry = {
        attackerUid: userId,
        attackerName: playerName,
        attackerPower: playerStrength,
        defenderUid: opponentUid,
        defenderName: opponentName,
        defenderPower: opponentPower,
        result: result,
        timestamp: Date.now()
    };
    globalAttacks.unshift(attackEntry); // إضافة في البداية (الأحدث أولاً)
    saveGlobalAttacks(); // حفظ السجل العالمي

    // بدء مؤقت التهدئة
    challengeState = 'COOLDOWN';
    challengeTimerRemaining = 2 * 60; // 2 دقائق تهدئة
    startChallengeTimer();

    updateUI();
    savePlayerData();
}

function startChallengeTimer() {
    if (challengeTimerInterval) clearInterval(challengeTimerInterval);
    challengeTimerInterval = setInterval(() => {
        challengeTimerRemaining--;
        const minutes = Math.floor(challengeTimerRemaining / 60);
        const seconds = challengeTimerRemaining % 60;
        challengePlayersList.innerHTML = `<p class="text-gray-300 text-center text-xl">الوقت المتبقي للتحدي التالي: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</p>`;

        if (challengeTimerRemaining <= 0) {
            clearInterval(challengeTimerInterval);
            challengeState = 'ATTACK_READY';
            selectRandomChallengePlayer(); // جلب لاعبين جدد بعد انتهاء التهدئة
        }
    }, 1000);
}

function stopChallengeTimer() {
    if (challengeTimerInterval) {
        clearInterval(challengeTimerInterval);
        challengeTimerInterval = null;
    }
}

// وظائف Online View
function fetchAllPlayers() {
    get(ref(database, 'users')).then((snapshot) => {
        const allPlayersData = snapshot.val();
        const onlinePlayers = [];
        const offlinePlayers = [];

        for (const uid in allPlayersData) {
            const player = allPlayersData[uid].data;
            if (player && player.playerName && player.totalPower) {
                const playerInfo = {
                    uid: uid,
                    name: player.playerName,
                    totalPower: player.totalPower,
                    isOnline: player.isOnline,
                    lastOnline: player.lastOnline || 0
                };
                // فلترة اللاعبين غير المتصلين ذوي القوة الأقل من 3000
                if (!player.isOnline && player.totalPower < 3000) {
                    continue; // تخطي هذا اللاعب من قائمة جميع اللاعبين
                }

                if (player.isOnline) {
                    onlinePlayers.push(playerInfo);
                } else {
                    offlinePlayers.push(playerInfo);
                }
            }
        }

        // ترتيب اللاعبين المتصلين حسب القوة
        onlinePlayers.sort((a, b) => b.totalPower - a.totalPower);
        // ترتيب اللاعبين غير المتصلين حسب القوة
        offlinePlayers.sort((a, b) => b.totalPower - a.totalPower);

        renderPlayerList(onlinePlayersList, onlinePlayers, true);
        renderPlayerList(allPlayersList, offlinePlayers, false); // عرض اللاعبين غير المتصلين هنا
    }).catch(error => {
        console.error("Error fetching all players: ", error);
        onlinePlayersList.innerHTML = '<p class="text-red-400 text-center">فشل تحميل قائمة اللاعبين المتصلين.</p>';
        allPlayersList.innerHTML = '<p class="text-red-400 text-center">فشل تحميل قائمة جميع اللاعبين.</p>';
    });
}

function renderPlayerList(container, players, isOnlineList) {
    container.innerHTML = '';
    if (players.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center">لا يوجد لاعبون ${isOnlineList ? 'متصلون' : 'غير متصلين'} حالياً.</p>`;
        return;
    }

    players.forEach(player => {
        const playerCard = document.createElement('div');
        const onlineStatusClass = player.isOnline ? 'bg-green-500' : 'bg-red-500';
        const onlineStatusText = player.isOnline ? 'متصل' : 'غير متصل';
        const bgColor = player.isOnline ? 'bg-gray-700' : 'bg-gray-800'; // خلفية مختلفة للمتصلين وغير المتصلين

        playerCard.className = `${bgColor} p-4 rounded-xl shadow-md flex items-center gap-4`;
        playerCard.innerHTML = `
            <div class="w-3 h-3 rounded-full ${onlineStatusClass} flex-shrink-0"></div>
            <div>
                <h4 class="text-lg font-semibold text-white">${player.name} ${player.uid === userId ? '<span class="text-indigo-400 text-xs">(أنت)</span>' : ''}</h4>
                <p class="text-sm text-gray-300">القوة: <span class="font-bold text-red-400">${player.totalPower.toLocaleString()}</span></p>
                <p class="text-xs text-gray-400">${onlineStatusText}</p>
            </div>
        `;
        container.appendChild(playerCard);
    });
}

// وظائف Redeem Code View
function redeemCode() {
    const code = redeemCodeInput.value.trim().toUpperCase();
    if (!code) {
        redeemStatusMessage.textContent = 'الرجاء إدخال رمز.';
        redeemStatusMessage.className = 'redeem-status error';
        return;
    }

    // جلب بيانات الرمز من Firebase
    get(ref(database, 'redeemCodes/' + code)).then(snapshot => {
        let codeData = snapshot.val();

        if (!codeData) {
            redeemStatusMessage.textContent = 'رمز غير صالح.';
            redeemStatusMessage.className = 'redeem-status error';
            return;
        }

        // التأكد من أن usedBy هو مصفوفة
        if (!codeData.usedBy || !Array.isArray(codeData.usedBy)) {
            codeData.usedBy = [];
        }

        if (codeData.usedBy.includes(userId)) {
            redeemStatusMessage.textContent = 'لقد استخدمت هذا الرمز بالفعل.';
            redeemStatusMessage.className = 'redeem-status error';
            return;
        }

        dollars += codeData.dollars || 0;
        points += codeData.points || 0;
        totalPower += codeData.power || 0;

        codeData.usedBy.push(userId); // تسجيل المستخدم الذي استخدم الرمز
        set(ref(database, 'redeemCodes/' + code), codeData) // تحديث الرمز في Firebase
            .then(() => {
                redeemStatusMessage.textContent = 'تم تفعيل الرمز بنجاح!';
                redeemStatusMessage.className = 'redeem-status success';
                showToast('تم تفعيل الرمز بنجاح!', 'success');
                updateUI();
                savePlayerData();
            })
            .catch(error => {
                console.error("Error updating redeem code usage: ", error);
                redeemStatusMessage.textContent = 'حدث خطأ أثناء تفعيل الرمز.';
                redeemStatusMessage.className = 'redeem-status error';
                showToast('حدث خطأ أثناء تفعيل الرمز.', 'error');
            });
    }).catch(error => {
        console.error("Error fetching redeem code: ", error);
        redeemStatusMessage.textContent = 'حدث خطأ في جلب بيانات الرمز.';
        redeemStatusMessage.className = 'redeem-status error';
    });
}


// وظائف Inventory Modal
function renderInventoryItems() {
    inventoryItemsList.innerHTML = '';
    if (inventory.length === 0) {
        inventoryItemsList.innerHTML = '<p class="text-gray-400 text-center">حقيبتك فارغة.</p>';
        return;
    }

    inventory.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.innerHTML = `
            <span>${item.name} (x${item.quantity})</span>
            <button class="use-button" data-item-id="${item.id}">استخدام</button>
        `;
        inventoryItemsList.appendChild(itemElement);
    });
}

function useInventoryItem(itemId) {
    const itemIndex = inventory.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        showToast('العنصر غير موجود في حقيبتك.', 'error');
        return;
    }

    const item = inventory[itemIndex];

    // منطق استخدام العناصر
    if (itemId === 'reduce-time') {
        // تقليل وقت الابتكار (يفترض وجود مؤقت ابتكار)
        // إذا كان لديك مؤقت ابتكار، قم بتعديله هنا
        // innovationTimerRemaining = Math.max(0, innovationTimerRemaining - 60); // مثال: تقليل دقيقة
        showToast('تم تقليل وقت الابتكار (إذا كان المؤقت نشطًا)!', 'info');
    } else if (itemId === 'some-other-item') {
        // منطق لعناصر أخرى
    }
    // أضف المزيد من منطق استخدام العناصر هنا

    item.quantity--;
    if (item.quantity <= 0) {
        inventory.splice(itemIndex, 1); // إزالة العنصر إذا نفدت الكمية
    }
    renderInventoryItems();
    renderInventoryCount();
    saveInventory();
    updateUI();
}

// وظائف Authentication Flow Modal
function showAuthFlowModal(title, message) {
    authModalTitle.textContent = title;
    // يمكنك عرض الرسالة في مكان ما داخل المودال إذا أردت
    showModal(authFlowModal);
    setNameSection.classList.remove('hidden');
    document.getElementById('email-auth-section').classList.add('hidden');
    authFlowCancelButton.classList.add('hidden');
}

function handleSetNameConfirm() {
    const newName = playerNameInput.value.trim();
    if (newName && newName.length >= 3 && newName.length <= 15) {
        const oldPlayerName = playerName;
        playerName = newName;

        const now = Date.now();
        const timeSinceLastChange = now - lastPlayerNameChangeTimestamp;

        if (isNameSetPermanently && nameChangeCount >= MAX_NAME_CHANGES) {
            showToast('لقد وصلت إلى الحد الأقصى لتغيير الاسم.', 'error');
            return;
        }

        if (isNameSetPermanently && (now - lastPlayerNameChangeTimestamp < NAME_CHANGE_COOLDOWN_DURATION)) {
            const remainingTimeMs = NAME_CHANGE_COOLDOWN_DURATION - (now - lastPlayerNameChangeTimestamp);
            const remainingDays = Math.ceil(remainingTimeMs / (1000 * 60 * 60 * 24));
            showToast(`لا يمكنك تغيير اسمك إلا بعد مرور ${remainingDays} يوم(أيام) أخرى.`, 'error');
            return;
        }

        if (playerName !== oldPlayerName) {
            if (isNameSetPermanently) { // إذا كان الاسم قد تم تعيينه مسبقًا (ليس أول مرة)
                nameChangeCount++;
            }
            isNameSetPermanently = true;
            lastPlayerNameChangeTimestamp = Date.now();
            showToast(`تم تعيين اسمك إلى ${playerName}.`, 'success');
        } else {
            showToast('لم يتغير الاسم.', 'info');
        }

        hideModal(authFlowModal);
        updateUI();
        savePlayerData();
    } else {
        showToast('اسم غير صالح. يجب أن يكون بين 3 و 15 حرفاً.', 'error');
    }
}


function handleContinueGuest() {
    isNameSetPermanently = false; // التأكد من أنه ضيف
    showToast('تمت المتابعة كضيف. لن يتم حفظ تقدمك بشكل دائم.', 'info');
    hideModal(authFlowModal);
    updateUI();
    // لا حاجة لحفظ البيانات هنا، لأنها لن تكون دائمة
}

function handleEmailSignup() {
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    if (!email || !password) {
        showToast('الرجاء إدخال البريد الإلكتروني وكلمة المرور.', 'error');
        return;
    }
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            userId = user.uid; // تحديث userId
            isNameSetPermanently = true; // الاسم يعتبر دائم الآن
            lastPlayerNameChangeTimestamp = Date.now(); // تحديث وقت تغيير الاسم
            nameChangeCount++; // زيادة عدد مرات تغيير الاسم
            showToast('تم إنشاء الحساب وتسجيل الدخول بنجاح!', 'success');
            hideModal(authFlowModal);
            // إعادة تحميل جميع البيانات للمستخدم الجديد المسجل
            loadPlayerData();
            loadHouses();
            loadGlobalAttacks();
            loadInventory();
            listenForPlayerUpdates();
            updateOnlineStatus(true);
            startAccumulationLoop();
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            showToast(`خطأ في إنشاء الحساب: ${errorMessage}`, 'error');
            console.error("Signup error:", errorCode, errorMessage);
        });
}

function handleEmailSignin() {
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    if (!email || !password) {
        showToast('الرجاء إدخال البريد الإلكتروني وكلمة المرور.', 'error');
        return;
    }
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            userId = user.uid; // تحديث userId
            isNameSetPermanently = true; // الاسم يعتبر دائم الآن
            showToast('تم تسجيل الدخول بنجاح!', 'success');
            hideModal(authFlowModal);
            // إعادة تحميل جميع البيانات للمستخدم الذي سجل الدخول
            loadPlayerData();
            loadHouses();
            loadGlobalAttacks();
            loadInventory();
            listenForPlayerUpdates();
            updateOnlineStatus(true);
            startAccumulationLoop();
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            showToast(`خطأ في تسجيل الدخول: ${errorMessage}`, 'error');
            console.error("Signin error:", errorCode, errorMessage);
        });
}

// معالجات الأحداث (Event Listeners)
collectDollarsButton.addEventListener('click', collectDollars);

// أحداث التنقل في القائمة الرئيسية
playMenuItem.addEventListener('click', () => showView('game-view'));
attackLogMenuItem.addEventListener('click', () => showView('attack-log-view'));
storeMenuItem.addEventListener('click', () => showView('store-view'));
onlineMenuItem.addEventListener('click', () => showView('online-view'));
challengeMenuItem.addEventListener('click', () => showView('challenge-view'));
redeemCodeMenuItem.addEventListener('click', () => showView('redeem-code-view'));

// أحداث أزرار العودة
backToMainFromGame.addEventListener('click', () => showView('main-menu-view'));
backToMainFromAttackLog.addEventListener('click', () => showView('main-menu-view'));
backToMainFromStore.addEventListener('click', () => showView('main-menu-view'));
backToMainFromChallenge.addEventListener('click', () => {
    stopChallengeTimer(); // إيقاف المؤقت عند العودة
    showView('main-menu-view');
});
backToMainFromOnline.addEventListener('click', () => showView('main-menu-view'));
backToMainFromRedeemCode.addEventListener('click', () => showView('main-menu-view'));

// أحداث Game View (الابتكار)
innovationPrevButton.addEventListener('click', () => {
    if (currentHouseIndex > 0) {
        currentHouseIndex--;
        updateUI();
        saveHouses();
    } else {
        showToast('أنت في البيت الأول بالفعل.', 'info');
    }
});

innovationNextButton.addEventListener('click', () => {
    if (currentHouseIndex < houses.length - 1) {
        if (houses[currentHouseIndex + 1].unlocked) {
            currentHouseIndex++;
            updateUI();
            saveHouses();
        } else {
            showToast('البيت التالي غير مفتوح بعد!', 'error');
        }
    } else {
        showToast('لا يوجد بيوت أخرى لفتحها.', 'info');
    }
});

innovationButton.addEventListener('click', activateInnovation);
gameInfoIcon.addEventListener('click', () => {
    // إعادة تعيين حالة المودال قبل إظهاره لضمان عمل الانتقال
    const innerContent = houseInfoModal.querySelector('div:first-of-type > div:first-of-type');
    if (innerContent) {
        innerContent.classList.remove('scale-100', 'opacity-100');
    }
    houseInfoModal.classList.remove('visible');
    
    houseUpgradeRewardsList.innerHTML = '';
    const currentHouse = houses[currentHouseIndex]; // تأكد من استخدام البيت الحالي
    HOUSE_UPGRADE_REWARDS.forEach(reward => {
        const li = document.createElement('li');
        const isRewarded = currentHouse.rewardedThresholds.includes(reward.threshold);
        li.className = `mb-1 ${isRewarded ? 'text-green-400 line-through' : 'text-gray-200'}`;
        li.innerHTML = `وصول قوة البيت إلى ${reward.threshold.toLocaleString()}: +$${reward.dollars.toLocaleString()}، +${reward.points.toLocaleString()} نقطة`;
        houseUpgradeRewardsList.appendChild(li);
    });
    showModal(houseInfoModal);
});
houseInfoCloseButton.addEventListener('click', () => hideModal(houseInfoModal));

// أحداث Store View
storeItemReduceTime.addEventListener('click', () => openStoreDetailModal('reduce-time'));
storeItemConvertPoints.addEventListener('click', () => openStoreDetailModal('convert-points'));
storeItemBuyInnovation3.addEventListener('click', () => openStoreDetailModal('buy-innovation3'));

// أحداث Store Detail Modal
storeDetailQuantityMinus.addEventListener('click', () => {
    if (currentStoreQuantity > 1) {
        currentStoreQuantity--;
        updateStoreDetailCost();
    }
});
storeDetailQuantityPlus.addEventListener('click', () => {
    currentStoreQuantity++;
    updateStoreDetailCost();
});
storeDetailConfirmButton.addEventListener('click', confirmPurchase);
storeDetailCancelButton.addEventListener('click', () => hideModal(storeDetailModal));

// أحداث Challenge View (أزرار الهجوم)
challengePlayersList.addEventListener('click', (event) => {
    const attackBtn = event.target.closest('.attack-button');
    if (attackBtn) {
        const opponentUid = attackBtn.dataset.playerUid;
        const opponentName = attackBtn.dataset.playerName; // استخدام dataset مباشرة
        const opponentPower = parseInt(attackBtn.dataset.playerPower); // استخدام dataset مباشرة
        
        handleAttack(opponentUid, opponentName, opponentPower);
    }
});

// أحداث Redeem Code View
redeemCodeButton.addEventListener('click', redeemCode);

// أحداث Popup Modal
popupCloseButton.addEventListener('click', () => hideModal(popupModal));

// أحداث Message Modal
messageModalCloseButton.addEventListener('click', () => hideModal(messageModal));

// أحداث Inventory
inventoryIcon.addEventListener('click', () => {
    renderInventoryItems();
    showModal(inventoryModal);
});
inventoryCloseButton.addEventListener('click', () => hideModal(inventoryModal));
inventoryItemsList.addEventListener('click', (event) => {
    const useButton = event.target.closest('.use-button');
    if (useButton) {
        const itemId = useButton.dataset.itemId;
        useInventoryItem(itemId);
    }
});

// أحداث Auth Flow Modal
setNameConfirmButtonAuth.addEventListener('click', handleSetNameConfirm); // استخدام الاسم الجديد
setNameContinueGuestButton.addEventListener('click', handleContinueGuest);
showEmailAuthButton.addEventListener('click', () => {
    setNameSection.classList.add('hidden');
    document.getElementById('email-auth-section').classList.remove('hidden');
    authModalTitle.textContent = "تسجيل دخول / إنشاء حساب";
    authFlowCancelButton.classList.remove('hidden'); // إظهار زر الإلغاء
});
backToNameSectionButton.addEventListener('click', () => {
    setNameSection.classList.remove('hidden');
    document.getElementById('email-auth-section').classList.add('hidden');
    authModalTitle.textContent = "أهلاً بك أيها المغامر الجديد!";
    authFlowCancelButton.classList.add('hidden'); // إخفاء زر الإلغاء
});
authSignupButton.addEventListener('click', handleEmailSignup);
authSigninButton.addEventListener('click', handleEmailSignin);
authFlowCancelButton.addEventListener('click', () => hideModal(authFlowModal));

// تحديث حالة اتصال المستخدم بالإنترنت بشكل دوري (كل دقيقة)
setInterval(() => {
    updateOnlineStatus(true);
}, 60 * 1000); // كل دقيقة
