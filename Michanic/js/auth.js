// ============================================
// نظام تسجيل الدخول والخروج
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 بدء تحميل نظام المصادقة...');
    
    // تحميل بيانات المستخدمين أولاً
    if (firebaseInitialized) {
        await loadUsersData();
    } else {
        console.log('⚠️ Firebase not initialized, using local data');
        await initializeDefaultUsers();
    }
    
    // التحقق من الجلسة النشطة
    await checkActiveSession();
    
    // إعداد أحداث الأزرار
    setupEventListeners();
    
    console.log('✅ نظام المصادقة جاهز');
});

async function checkActiveSession() {
    const session = localStorage.getItem('verg_user_session');
    if (session) {
        try {
            const sessionData = JSON.parse(session);
            console.log('Checking session for:', sessionData.username);
            
            const user = usersData[sessionData.username];
            
            if (user && user.isActive) {
                const sessionAge = Date.now() - sessionData.timestamp;
                const sessionTimeout = SITE_CONFIG.SESSION_TIMEOUT * 60 * 1000;
                
                if (sessionAge < sessionTimeout) {
                    // جلسة صالحة، إعادة التوجيه للواجهة المناسبة
                    await redirectToDashboard(sessionData.username);
                } else {
                    console.log('Session expired');
                    localStorage.removeItem('verg_user_session');
                    showAlert('loginAlert', 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى', 'error');
                }
            }
        } catch (error) {
            console.error('Error checking session:', error);
            localStorage.removeItem('verg_user_session');
        }
    }
}

async function redirectToDashboard(username) {
    const user = usersData[username];
    if (!user) return;
    
    currentUser = {
        username: username,
        role: user.role,
        email: user.email,
        displayName: user.displayName || username,
        loginTime: new Date().toISOString()
    };
    
    // تحديث وقت آخر دخول
    await updateUserLastLogin(username);
    
    // حفظ الجلسة
    localStorage.setItem('verg_user_session', JSON.stringify({
        username: username,
        role: user.role,
        displayName: user.displayName || username,
        timestamp: Date.now()
    }));
    
    // إضافة سجل الدخول
    await addSystemLog('login', `${username} قام بتسجيل الدخول`);
    
    // التوجيه للواجهة المناسبة
    switch(user.role) {
        case 'admin':
            window.location.href = 'admin.html';
            break;
        case 'editor':
            window.location.href = 'editor.html';
            break;
        case 'vip':
            window.location.href = 'vip.html';
            break;
        default:
            window.location.href = 'viewer.html';
    }
}

function setupEventListeners() {
    const loginButton = document.getElementById('loginButton');
    const loginUsername = document.getElementById('loginUsername');
    const loginPassword = document.getElementById('loginPassword');
    
    if (loginButton) {
        loginButton.addEventListener('click', performLogin);
    }
    
    if (loginPassword) {
        loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performLogin();
        });
    }
}

async function performLogin() {
    console.log('🔑 Attempting login...');
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showAlert('loginAlert', 'الرجاء إدخال اسم المستخدم وكلمة المرور', 'error');
        return;
    }
    
    const user = usersData[username];
    
    if (!user) {
        // تسجيل محاولة دخول فاشلة
        await addSystemLog('login_failed', `محاولة دخول فاشلة - مستخدم غير موجود: ${username}`);
        showAlert('loginAlert', 'اسم المستخدم غير صحيح', 'error');
        return;
    }
    
    if (!user.isActive) {
        await addSystemLog('login_failed', `محاولة دخول فاشلة - حساب معطل: ${username}`);
        showAlert('loginAlert', 'هذا الحساب غير مفعل', 'error');
        return;
    }
    
    if (!verifyPassword(password, user.password)) {
        await addSystemLog('login_failed', `محاولة دخول فاشلة - كلمة مرور خاطئة: ${username}`);
        showAlert('loginAlert', 'كلمة المرور غير صحيحة', 'error');
        return;
    }
    
    // تسجيل الدخول الناجح
    showAlert('loginAlert', `مرحباً ${user.displayName}! جاري التوجيه...`, 'success');
    
    // تأخير للتأكد من عرض الرسالة
    setTimeout(async () => {
        await redirectToDashboard(username);
    }, 1500);
}

// ============================================
// وظيفة تسجيل الخروج (للاستخدام في الصفحات الأخرى)
// ============================================
async function logout() {
    if (currentUser) {
        await addSystemLog('logout', `${currentUser.username} قام بتسجيل الخروج`);
    }
    
    currentUser = null;
    localStorage.removeItem('verg_user_session');
    
    window.location.href = 'index.html';
}