// ============================================
// نظام لوحة تحكم المدير
// ============================================
let siteData = {
    sectors: { 's_default': 'القطاع العام' },
    s_default: {
        colors: ["#4ecca3", "#1e293b"],
        vehicles: []
    }
};
let systemLogs = [];
let systemSettings = {};
let currentPage = 'dashboard';

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 بدء تحميل لوحة المدير...');
    
    // التحقق من الصلاحية
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    
    // تحديث واجهة المستخدم
    updateUserInterface();
    
    // إعداد الأحداث
    setupAdminEvents();
    
    // تحميل البيانات
    await loadAdminData();
    
    // تحديث الوقت
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    
    // تحميل الصفحة الرئيسية
    await loadPageContent('dashboard');
    
    console.log('✅ لوحة المدير جاهزة');
});

function updateUserInterface() {
    if (currentUser) {
        const userDisplayName = document.getElementById('userDisplayName');
        const userAvatar = document.getElementById('userAvatar');
        const userRoleBadge = document.getElementById('userRole');
        
        if (userDisplayName) userDisplayName.textContent = currentUser.displayName;
        if (userAvatar) userAvatar.textContent = currentUser.displayName.charAt(0);
        if (userRoleBadge) {
            userRoleBadge.textContent = getRoleName(currentUser.role);
            userRoleBadge.className = `user-role ${currentUser.role}`;
        }
    }
}

function setupAdminEvents() {
    // زر القائمة
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }
    
    // زر تسجيل الخروج
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    
    // العناصر التنقلية
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            if (page) {
                // إزالة النشط من جميع العناصر
                document.querySelectorAll('.nav-item').forEach(el => {
                    el.classList.remove('active');
                });
                // إضافة النشط للعنصر الحالي
                this.classList.add('active');
                
                navigateTo(page);
            }
        });
    });
    
    // زر إغلاق النافذة المنبثقة
    const modalClose = document.getElementById('modalClose');
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    // إغلاق النافذة بالضغط خارجها
    const modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }
}

async function loadAdminData() {
    try {
        if (db) {
            // تحميل بيانات الموقع
            const siteSnapshot = await db.ref('siteData').once('value');
            siteData = siteSnapshot.val() || {
                sectors: { 's_default': 'القطاع العام' },
                s_default: { colors: ["#4ecca3", "#1e293b"], vehicles: [] }
            };
            
            // تحميل سجلات النظام
            const logsSnapshot = await db.ref('systemLogs').once('value');
            const logsData = logsSnapshot.val();
            systemLogs = logsData ? Object.values(logsData) : [];
            
            // تحميل إعدادات النظام
            const settingsSnapshot = await db.ref('systemSettings').once('value');
            systemSettings = settingsSnapshot.val() || {};
            
            console.log('✅ تم تحميل بيانات المدير');
            
            // تحديث الإحصائيات
            updateDashboardStats();
        }
    } catch (error) {
        console.error('❌ Error loading admin data:', error);
        showToast('خطأ في تحميل البيانات', 'error');
    }
}

function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
    });
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

function updateDashboardStats() {
    // حساب إجمالي المركبات
    let totalVehicles = 0;
    let vipVehicles = 0;
    
    for (let sectorId in siteData) {
        if (sectorId !== 'sectors' && siteData[sectorId] && siteData[sectorId].vehicles) {
            totalVehicles += siteData[sectorId].vehicles.length;
            
            // حساب مركبات VIP
            if (siteData[sectorId].vehicles) {
                vipVehicles += siteData[sectorId].vehicles.filter(v => v.vip === true).length;
            }
        }
    }
    
    // تحديث العناصر
    const totalVehiclesElement = document.getElementById('totalVehicles');
    const totalUsersElement = document.getElementById('totalUsers');
    const totalVipElement = document.getElementById('totalVip');
    
    if (totalVehiclesElement) totalVehiclesElement.textContent = totalVehicles;
    if (totalUsersElement) totalUsersElement.textContent = Object.keys(usersData).length;
    if (totalVipElement) totalVipElement.textContent = vipVehicles;
}

function navigateTo(page) {
    currentPage = page;
    
    const pageTitles = {
        'dashboard': 'لوحة التحكم',
        'stats': 'الإحصائيات',
        'vehicles': 'إدارة المركبات',
        'sectors': 'إدارة القطاعات',
        'vip-vehicles': 'مركبات VIP',
        'users': 'إدارة المستخدمين',
        'logs': 'سجلات النظام',
        'settings': 'إعدادات النظام'
    };
    
    const pageTitleElement = document.getElementById('pageTitle');
    if (pageTitleElement) {
        pageTitleElement.innerHTML = `
            <i class="fas fa-${getPageIcon(page)}"></i>
            <span>${pageTitles[page] || 'صفحة'}</span>
        `;
    }
    
    loadPageContent(page);
    
    // إغلاق الشريط الجانبي على الجوال
    if (window.innerWidth < 992) {
        document.querySelector('.sidebar').classList.remove('active');
    }
}

function getPageIcon(page) {
    const icons = {
        'dashboard': 'home',
        'stats': 'chart-bar',
        'vehicles': 'car',
        'sectors': 'layer-group',
        'vip-vehicles': 'crown',
        'users': 'users-cog',
        'logs': 'history',
        'settings': 'cogs'
    };
    return icons[page] || 'file';
}

async function loadPageContent(page) {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري تحميل الصفحة...</p></div>';
    
    try {
        switch(page) {
            case 'dashboard':
                await loadDashboardPage();
                break;
            case 'vehicles':
                await loadVehiclesPage();
                break;
            case 'users':
                await loadUsersPage();
                break;
            case 'logs':
                await loadLogsPage();
                break;
            case 'settings':
                await loadSettingsPage();
                break;
            default:
                pageContent.innerHTML = `<div class="content-card"><p>صفحة ${page} قيد التطوير...</p></div>`;
        }
    } catch (error) {
        console.error('❌ Error loading page:', error);
        pageContent.innerHTML = '<div class="content-card"><p>حدث خطأ أثناء تحميل الصفحة</p></div>';
    }
}

async function loadDashboardPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    // حساب الإحصائيات
    let totalVehicles = 0;
    let totalSectors = Object.keys(siteData.sectors || {}).length;
    let todayLogs = systemLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        const today = new Date();
        return logDate.toDateString() === today.toDateString();
    }).length;
    
    for (let sectorId in siteData) {
        if (sectorId !== 'sectors' && siteData[sectorId] && siteData[sectorId].vehicles) {
            totalVehicles += siteData[sectorId].vehicles.length;
        }
    }
    
    let html = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon primary">
                    <i class="fas fa-car"></i>
                </div>
                <div class="stat-info">
                    <h3>${totalVehicles}</h3>
                    <p>إجمالي المركبات</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon success">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-info">
                    <h3>${Object.keys(usersData).length}</h3>
                    <p>إجمالي المستخدمين</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon info">
                    <i class="fas fa-layer-group"></i>
                </div>
                <div class="stat-info">
                    <h3>${totalSectors}</h3>
                    <p>عدد القطاعات</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon warning">
                    <i class="fas fa-history"></i>
                </div>
                <div class="stat-info">
                    <h3>${todayLogs}</h3>
                    <p>نشاطات اليوم</p>
                </div>
            </div>
        </div>
        
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-history"></i>
                    <span>آخر النشاطات</span>
                </div>
                <button class="btn btn-info" onclick="navigateTo('logs')">
                    <i class="fas fa-list"></i> عرض الكل
                </button>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>النشاط</th>
                            <th>المستخدم</th>
                            <th>الوقت</th>
                            <th>التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody id="recentActivities">
                        ${systemLogs.slice(0, 10).map(log => `
                            <tr>
                                <td>
                                    <span class="log-badge log-${log.type}">
                                        ${getLogTypeText(log.type)}
                                    </span>
                                </td>
                                <td>${log.user}</td>
                                <td>${log.timestampReadable || formatDate(log.timestamp)}</td>
                                <td>${log.message}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    pageContent.innerHTML = html;
    
    // إضافة CSS للشارات
    const style = document.createElement('style');
    style.textContent = `
        .log-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        .log-login { background: var(--success); color: white; }
        .log-login_failed { background: var(--danger); color: white; }
        .log-logout { background: var(--warning); color: #000; }
        .log-add { background: var(--info); color: white; }
        .log-edit { background: var(--primary); color: #000; }
        .log-delete { background: var(--danger); color: white; }
        .log-error { background: var(--danger); color: white; }
    `;
    document.head.appendChild(style);
}

function getLogTypeText(type) {
    const types = {
        'login': 'تسجيل دخول',
        'login_failed': 'دخول فاشل',
        'logout': 'تسجيل خروج',
        'add': 'إضافة',
        'edit': 'تعديل',
        'delete': 'حذف',
        'error': 'خطأ'
    };
    return types[type] || type;
}

async function loadVehiclesPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    let html = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-car"></i>
                    <span>إدارة المركبات</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-primary" onclick="showAddVehicleModal()">
                        <i class="fas fa-plus"></i> إضافة مركبة
                    </button>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>الرقم التسلسلي</th>
                            <th>النوع</th>
                            <th>القطاع</th>
                            <th>الرتبة</th>
                            <th>الحالة</th>
                            <th>VIP</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="vehiclesTable">
                        ${getAllVehicles().map(vehicle => `
                            <tr>
                                <td>${vehicle.serial}</td>
                                <td>${vehicle.type}</td>
                                <td>${siteData.sectors[vehicle.sectorId] || 'غير معروف'}</td>
                                <td>${vehicle.rank}</td>
                                <td>
                                    <span class="status-badge ${vehicle.status === 'active' ? 'active' : 'inactive'}">
                                        ${vehicle.status === 'active' ? 'نشط' : 'غير نشط'}
                                    </span>
                                </td>
                                <td>
                                    ${vehicle.vip ? '<i class="fas fa-crown" style="color: var(--vip);"></i>' : '-'}
                                </td>
                                <td>
                                    <button class="btn btn-info btn-sm" onclick="editVehicle('${vehicle.sectorId}', '${vehicle.id}')">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteVehicle('${vehicle.sectorId}', '${vehicle.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    pageContent.innerHTML = html;
    
    // إضافة CSS للحالة
    const style = document.createElement('style');
    style.textContent = `
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        .status-badge.active {
            background: var(--success);
            color: white;
        }
        .status-badge.inactive {
            background: var(--danger);
            color: white;
        }
        .btn-sm {
            padding: 6px 12px;
            font-size: 0.8rem;
        }
    `;
    document.head.appendChild(style);
}

function getAllVehicles() {
    let vehicles = [];
    for (let sectorId in siteData) {
        if (sectorId !== 'sectors' && siteData[sectorId] && siteData[sectorId].vehicles) {
            siteData[sectorId].vehicles.forEach(vehicle => {
                vehicles.push({
                    ...vehicle,
                    sectorId: sectorId
                });
            });
        }
    }
    return vehicles;
}

function showAddVehicleModal() {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = 'إضافة مركبة جديدة';
    
    let sectorsOptions = '';
    for (let sectorId in siteData.sectors) {
        sectorsOptions += `<option value="${sectorId}">${siteData.sectors[sectorId]}</option>`;
    }
    
    modalBody.innerHTML = `
        <form id="addVehicleForm">
            <div class="form-group">
                <label class="form-label">القطاع</label>
                <select class="form-control" id="vehicleSector" required>
                    <option value="">اختر القطاع</option>
                    ${sectorsOptions}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">الرقم التسلسلي</label>
                <input type="text" class="form-control" id="vehicleSerial" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">نوع المركبة</label>
                <input type="text" class="form-control" id="vehicleType" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">الرتبة</label>
                <input type="text" class="form-control" id="vehicleRank" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">الحالة</label>
                <select class="form-control" id="vehicleStatus" required>
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" id="vehicleVip">
                    مركبة VIP
                </label>
            </div>
            
            <div class="form-group">
                <label class="form-label">ملاحظات</label>
                <textarea class="form-control" id="vehicleNotes" rows="3"></textarea>
            </div>
            
            <button type="submit" class="btn btn-primary btn-block">
                <i class="fas fa-save"></i> حفظ المركبة
            </button>
        </form>
    `;
    
    modal.classList.add('active');
    
    // إضافة معالج الحدث للنموذج
    const form = document.getElementById('addVehicleForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await addNewVehicle();
        });
    }
}

async function addNewVehicle() {
    try {
        const sectorId = document.getElementById('vehicleSector').value;
        const serial = document.getElementById('vehicleSerial').value;
        const type = document.getElementById('vehicleType').value;
        const rank = document.getElementById('vehicleRank').value;
        const status = document.getElementById('vehicleStatus').value;
        const vip = document.getElementById('vehicleVip').checked;
        const notes = document.getElementById('vehicleNotes').value;
        
        if (!sectorId || !serial || !type || !rank) {
            showToast('الرجاء ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        const newVehicle = {
            id: 'v_' + Date.now(),
            serial: serial,
            type: type,
            rank: rank,
            status: status,
            vip: vip,
            notes: notes,
            createdAt: new Date().toISOString(),
            createdBy: currentUser.username
        };
        
        // إضافة المركبة للقطاع
        if (!siteData[sectorId]) {
            siteData[sectorId] = {
                colors: ["#4ecca3", "#1e293b"],
                vehicles: []
            };
        }
        
        siteData[sectorId].vehicles.push(newVehicle);
        
        // حفظ في Firebase
        if (db) {
            await db.ref('siteData').set(siteData);
        }
        
        // إضافة سجل النظام
        await addSystemLog('add', `تمت إضافة مركبة جديدة: ${serial}`);
        
        showToast('تمت إضافة المركبة بنجاح', 'success');
        closeModal();
        navigateTo('vehicles');
        
    } catch (error) {
        console.error('❌ Error adding vehicle:', error);
        showToast('خطأ في إضافة المركبة', 'error');
    }
}

async function loadUsersPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    let html = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-users-cog"></i>
                    <span>إدارة المستخدمين</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-primary" onclick="showAddUserModal()">
                        <i class="fas fa-user-plus"></i> إضافة مستخدم
                    </button>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>اسم المستخدم</th>
                            <th>الاسم المعروض</th>
                            <th>البريد الإلكتروني</th>
                            <th>الصلاحية</th>
                            <th>آخر دخول</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="usersTable">
                        ${Object.entries(usersData).map(([username, user]) => `
                            <tr>
                                <td>${username}</td>
                                <td>${user.displayName}</td>
                                <td>${user.email}</td>
                                <td>
                                    <span class="user-role ${user.role}">
                                        ${getRoleName(user.role)}
                                    </span>
                                </td>
                                <td>${user.lastLogin ? formatDate(user.lastLogin) : 'لم يسجل دخول'}</td>
                                <td>
                                    <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                                        ${user.isActive ? 'نشط' : 'معطل'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-info btn-sm" onclick="editUser('${username}')">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    ${username !== 'admin' ? `
                                    <button class="btn btn-danger btn-sm" onclick="deleteUser('${username}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                    ` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    pageContent.innerHTML = html;
}

async function loadLogsPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    let html = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-history"></i>
                    <span>سجلات النظام</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-danger" onclick="clearOldLogs()">
                        <i class="fas fa-trash"></i> حذف السجلات القديمة
                    </button>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">تصفية حسب النوع:</label>
                <select class="form-control" id="logFilter" onchange="filterLogs()">
                    <option value="">جميع السجلات</option>
                    <option value="login">تسجيلات الدخول</option>
                    <option value="logout">تسجيلات الخروج</option>
                    <option value="add">الإضافات</option>
                    <option value="edit">التعديلات</option>
                    <option value="delete">الحذف</option>
                    <option value="error">الأخطاء</option>
                </select>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ والوقت</th>
                            <th>النوع</th>
                            <th>المستخدم</th>
                            <th>الرسالة</th>
                            <th>التفاصيل</th>
                            <th>عنوان IP</th>
                        </tr>
                    </thead>
                    <tbody id="logsTable">
                        ${systemLogs.map(log => `
                            <tr>
                                <td>${log.timestampReadable || formatDate(log.timestamp)}</td>
                                <td>
                                    <span class="log-badge log-${log.type}">
                                        ${getLogTypeText(log.type)}
                                    </span>
                                </td>
                                <td>${log.user}</td>
                                <td>${log.message}</td>
                                <td>${log.details || '-'}</td>
                                <td>${log.ip || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    pageContent.innerHTML = html;
}

async function loadSettingsPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    let html = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-cogs"></i>
                    <span>إعدادات النظام</span>
                </div>
            </div>
            
            <form id="settingsForm">
                <div class="form-group">
                    <label class="form-label">اسم الموقع:</label>
                    <input type="text" class="form-control" id="siteName" 
                           value="${systemSettings.siteName || SITE_CONFIG.SITE_NAME}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">رابط Discord Webhook:</label>
                    <input type="text" class="form-control" id="discordWebhook" 
                           value="${systemSettings.discordWebhook || SITE_CONFIG.DISCORD_WEBHOOK}">
                    <small class="form-text">يستخدم لإرسال سجلات النظام إلى Discord</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">وقت انتهاء الجلسة (دقائق):</label>
                    <input type="number" class="form-control" id="sessionTimeout" 
                           value="${systemSettings.sessionTimeout || SITE_CONFIG.SESSION_TIMEOUT}" min="5" required>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="maintenanceMode" ${systemSettings.maintenanceMode ? 'checked' : ''}>
                        وضع الصيانة
                    </label>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="registrationEnabled" ${systemSettings.registrationEnabled !== false ? 'checked' : ''}>
                        السماح بالتسجيل الذاتي
                    </label>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-save"></i> حفظ الإعدادات
                </button>
            </form>
        </div>
    `;
    
    pageContent.innerHTML = html;
    
    // إضافة معالج الحدث للنموذج
    const form = document.getElementById('settingsForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveSystemSettings();
        });
    }
}

async function saveSystemSettings() {
    try {
        const updatedSettings = {
            siteName: document.getElementById('siteName').value,
            discordWebhook: document.getElementById('discordWebhook').value,
            sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
            maintenanceMode: document.getElementById('maintenanceMode').checked,
            registrationEnabled: document.getElementById('registrationEnabled').checked,
            lastUpdated: new Date().toISOString(),
            updatedBy: currentUser.username
        };
        
        if (db) {
            await db.ref('systemSettings').set(updatedSettings);
            systemSettings = updatedSettings;
            
            await addSystemLog('edit', 'تم تحديث إعدادات النظام');
            showToast('تم حفظ الإعدادات بنجاح', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showToast('خطأ في حفظ الإعدادات', 'error');
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function showToast(message, type = 'success', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

async function clearOldLogs() {
    if (!confirm('هل أنت متأكد من حذف السجلات القديمة؟')) return;
    
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - SITE_CONFIG.LOG_RETENTION_DAYS);
        
        const filteredLogs = systemLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= cutoffDate;
        });
        
        if (db) {
            await db.ref('systemLogs').set(filteredLogs);
            systemLogs = filteredLogs;
            
            await addSystemLog('delete', 'تم حذف السجلات القديمة');
            showToast('تم حذف السجلات القديمة بنجاح', 'success');
            navigateTo('logs');
        }
        
    } catch (error) {
        console.error('❌ Error clearing logs:', error);
        showToast('خطأ في حذف السجلات', 'error');
    }
}

// ============================================
// تحديث البيانات في الوقت الحقيقي
// ============================================
if (db) {
    // تحديث بيانات الموقع
    db.ref('siteData').on('value', snapshot => {
        const data = snapshot.val();
        if (data) {
            siteData = data;
            if (currentPage === 'dashboard' || currentPage === 'vehicles') {
                updateDashboardStats();
                if (currentPage === 'vehicles') {
                    navigateTo('vehicles');
                }
            }
        }
    });
    
    // تحديث سجلات النظام
    db.ref('systemLogs').on('value', snapshot => {
        const logsData = snapshot.val();
        systemLogs = logsData ? Object.values(logsData).reverse() : [];
    });
    
    // تحديث بيانات المستخدمين
    db.ref('users').on('value', snapshot => {
        const data = snapshot.val();
        if (data) {
            usersData = data;
            if (currentPage === 'users') {
                navigateTo('users');
            }
        }
    });
    
    // تحديث إعدادات النظام
    db.ref('systemSettings').on('value', snapshot => {
        const settings = snapshot.val();
        if (settings) {
            systemSettings = settings;
        }
    });
}