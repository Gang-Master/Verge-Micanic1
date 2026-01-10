// ============================================
// إعدادات الموقع
// ============================================
const SITE_CONFIG = {
    SITE_NAME: "ميكانيكي فيرج",
    VERSION: "2.1.0",
    DISCORD_WEBHOOK: "https://discord.com/api/webhooks/1458500452642459710/CdH2_1zjm_khy-CV_6MccOgA6GcE339W9t2KZ2kPVEa6j9ilfC6UMGzWYn15DuR6MKGF",
    LOG_RETENTION_DAYS: 30,
    SESSION_TIMEOUT: 120 // دقائق
};

// ============================================
// تهيئة Firebase
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyB7M71r2TRprVxzABMILImHoylagdY74JY",
    authDomain: "verg-micanic1.firebaseapp.com",
    databaseURL: "https://verg-micanic1-default-rtdb.firebaseio.com",
    projectId: "verg-micanic1",
    storageBucket: "verg-micanic1.firebasestorage.app",
    messagingSenderId: "796906815750",
    appId: "1:796906815750:web:5315930336c6a851d95e87",
    measurementId: "G-24QNS5X3FQ"
};

// تهيئة Firebase
let firebaseInitialized = false;
try {
    firebase.initializeApp(firebaseConfig);
    firebaseInitialized = true;
    console.log('✅ Firebase initialized');
} catch (error) {
    console.error('❌ Firebase error:', error);
}

const db = firebaseInitialized ? firebase.database() : null;

// ============================================
// وظائف عامة
// ============================================
function showAlert(elementId, message, type = 'error') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = `alert alert-${type}`;
        element.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                element.style.display = 'none';
            }, 3000);
        }
    }
}

function hashPassword(password) {
    return btoa(password + firebaseConfig.apiKey);
}

function verifyPassword(inputPassword, storedHash) {
    return hashPassword(inputPassword) === storedHash;
}

function getRoleName(role) {
    const roles = {
        'admin': 'مدير',
        'editor': 'محرر',
        'viewer': 'عضو',
        'vip': 'VIP'
    };
    return roles[role] || role;
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'غير معروف';
    }
}

// ============================================
// نظام إدارة السجلات
// ============================================
async function sendDiscordWebhook(logData) {
    try {
        if (!SITE_CONFIG.DISCORD_WEBHOOK) return;
        
        let color = 0x808080;
        switch(logData.type) {
            case 'login': color = 0x00ff00; break;
            case 'login_failed': color = 0xff0000; break;
            case 'logout': color = 0xffa500; break;
            case 'add': color = 0x0099ff; break;
            case 'edit': color = 0xffff00; break;
            case 'delete': color = 0xff0000; break;
            case 'error': color = 0xff0000; break;
        }
        
        let actionText = '';
        switch(logData.type) {
            case 'login': actionText = 'تسجيل دخول'; break;
            case 'login_failed': actionText = 'محاولة تسجيل دخول فاشلة'; break;
            case 'logout': actionText = 'تسجيل خروج'; break;
            case 'add': actionText = 'إضافة'; break;
            case 'edit': actionText = 'تعديل'; break;
            case 'delete': actionText = 'حذف'; break;
            case 'error': actionText = 'خطأ'; break;
            default: actionText = logData.type;
        }
        
        const embed = {
            title: `📝 ${actionText} - ${SITE_CONFIG.SITE_NAME}`,
            description: logData.message,
            color: color,
            fields: [
                {
                    name: "👤 المستخدم",
                    value: logData.user || "غير معروف",
                    inline: true
                },
                {
                    name: "🕐 الوقت",
                    value: new Date().toLocaleString('ar-SA'),
                    inline: true
                },
                {
                    name: "📍 عنوان IP",
                    value: logData.ip || "غير معروف",
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: `${SITE_CONFIG.SITE_NAME} v${SITE_CONFIG.VERSION}`
            }
        };
        
        if (logData.details) {
            embed.fields.push({
                name: "📋 تفاصيل",
                value: logData.details,
                inline: false
            });
        }
        
        const payload = {
            embeds: [embed],
            username: `${SITE_CONFIG.SITE_NAME} Logger`
        };
        
        await fetch(SITE_CONFIG.DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
    } catch (error) {
        console.error('❌ Error sending Discord webhook:', error);
    }
}

async function addSystemLog(type, message, details = null) {
    try {
        // محاولة الحصول على IP المستخدم
        let userIP = "غير معروف";
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            userIP = data.ip;
        } catch (e) {
            console.log('Could not get IP address');
        }
        
        const logData = {
            id: 'log_' + Date.now(),
            type: type,
            message: message,
            user: currentUser ? currentUser.username : 'system',
            details: details,
            ip: userIP,
            timestamp: new Date().toISOString(),
            timestampReadable: new Date().toLocaleString('ar-SA')
        };
        
        if (db) {
            await db.ref('systemLogs').push(logData);
        }
        
        await sendDiscordWebhook(logData);
        
        console.log(`📝 System Log: ${type} - ${message}`);
        
    } catch (error) {
        console.error('❌ Error adding system log:', error);
    }
}

// ============================================
// إدارة المستخدمين
// ============================================
let usersData = {};
let currentUser = null;

async function loadUsersData() {
    if (!db) return;
    
    try {
        const snapshot = await db.ref('users').once('value');
        usersData = snapshot.val() || {};
        console.log('Users loaded:', Object.keys(usersData).length);
        
        // إنشاء المستخدمين الافتراضيين إذا لم يكونوا موجودين
        await initializeDefaultUsers();
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
        usersData = {};
    }
}

async function initializeDefaultUsers() {
    const defaultUsers = {
        'admin': {
            password: hashPassword('admin123'),
            email: 'admin@verg.com',
            role: 'admin',
            displayName: 'المدير العام',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true,
            permissions: ['all']
        },
        'editor': {
            password: hashPassword('editor123'),
            email: 'editor@verg.com',
            role: 'editor',
            displayName: 'محرر النظام',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true,
            permissions: ['view', 'add', 'edit']
        },
        'vip': {
            password: hashPassword('vip123'),
            email: 'vip@verg.com',
            role: 'vip',
            displayName: 'عضو VIP',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true,
            permissions: ['view', 'vip_access']
        },
        'user': {
            password: hashPassword('user123'),
            email: 'user@verg.com',
            role: 'viewer',
            displayName: 'مستخدم عادي',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true,
            permissions: ['view']
        }
    };
    
    let needsUpdate = false;
    for (let username in defaultUsers) {
        if (!usersData[username]) {
            usersData[username] = defaultUsers[username];
            needsUpdate = true;
            console.log(`Added default user: ${username}`);
        }
    }
    
    if (needsUpdate && db) {
        try {
            await db.ref('users').set(usersData);
            console.log('Default users updated');
        } catch (error) {
            console.error('Error updating default users:', error);
        }
    }
}

async function updateUserLastLogin(username) {
    if (usersData[username] && db) {
        try {
            usersData[username].lastLogin = new Date().toISOString();
            await db.ref(`users/${username}/lastLogin`).set(usersData[username].lastLogin);
        } catch (error) {
            console.error('Error updating last login:', error);
        }
    }
}