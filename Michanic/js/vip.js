// ============================================
// نظام لوحة تحكم VIP
// ============================================
let siteData = {
    sectors: { 's_default': 'القطاع العام' },
    s_default: {
        colors: ["#4ecca3", "#1e293b"],
        vehicles: []
    }
};
let currentPage = 'dashboard';
let vipVehicles = [];

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 بدء تحميل لوحة VIP...');
    
    // التحقق من الصلاحية
    if (!currentUser || (currentUser.role !== 'vip' && currentUser.role !== 'admin')) {
        window.location.href = 'index.html';
        return;
    }
    
    // تحديث واجهة المستخدم
    updateUserInterface();
    
    // إعداد الأحداث
    setupVipEvents();
    
    // تحميل البيانات
    await loadVipData();
    
    // تحديث الوقت
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    
    // تحميل الصفحة الرئيسية
    await loadPageContent('dashboard');
    
    console.log('✅ لوحة VIP جاهزة');
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

function setupVipEvents() {
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

async function loadVipData() {
    try {
        if (db) {
            // تحميل بيانات الموقع
            const siteSnapshot = await db.ref('siteData').once('value');
            siteData = siteSnapshot.val() || {
                sectors: { 's_default': 'القطاع العام' },
                s_default: { colors: ["#4ecca3", "#1e293b"], vehicles: [] }
            };
            
            console.log('✅ تم تحميل بيانات VIP');
            
            // تحديث الإحصائيات
            updateDashboardStats();
        }
    } catch (error) {
        console.error('❌ Error loading VIP data:', error);
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
    // حساب إجمالي مركبات VIP
    let totalVipVehicles = 0;
    let myVehiclesCount = 0;
    
    // حساب مركبات المستخدم الحالي
    if (currentUser) {
        for (let sectorId in siteData) {
            if (sectorId !== 'sectors' && siteData[sectorId] && siteData[sectorId].vehicles) {
                const userVehicles = siteData[sectorId].vehicles.filter(
                    v => v.createdBy === currentUser.username || v.assignedTo === currentUser.username
                );
                myVehiclesCount += userVehicles.length;
            }
        }
    }
    
    // حساب جميع مركبات VIP
    for (let sectorId in siteData) {
        if (sectorId !== 'sectors' && siteData[sectorId] && siteData[sectorId].vehicles) {
            const vipVehiclesInSector = siteData[sectorId].vehicles.filter(v => v.vip === true);
            totalVipVehicles += vipVehiclesInSector.length;
        }
    }
    
    // تحديث العناصر
    const vipVehiclesElement = document.getElementById('vipVehicles');
    const myVehiclesElement = document.getElementById('myVehicles');
    
    if (vipVehiclesElement) vipVehiclesElement.textContent = totalVipVehicles;
    if (myVehiclesElement) myVehiclesElement.textContent = myVehiclesCount;
}

function navigateTo(page) {
    currentPage = page;
    
    const pageTitles = {
        'dashboard': 'لوحة التحكم',
        'search': 'البحث العام',
        'vip-search': 'بحث VIP',
        'my-vehicles': 'مركباتي',
        'add-vehicle': 'إضافة مركبة',
        'requests': 'طلباتي'
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
        'search': 'search',
        'vip-search': 'crown',
        'my-vehicles': 'car',
        'add-vehicle': 'plus-circle',
        'requests': 'envelope'
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
            case 'search':
                await loadSearchPage();
                break;
            case 'vip-search':
                await loadVipSearchPage();
                break;
            case 'my-vehicles':
                await loadMyVehiclesPage();
                break;
            case 'add-vehicle':
                await loadAddVehiclePage();
                break;
            case 'requests':
                await loadRequestsPage();
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
    let totalVipVehicles = 0;
    let myVehiclesCount = 0;
    let activeVipVehicles = 0;
    
    if (currentUser) {
        for (let sectorId in siteData) {
            if (sectorId !== 'sectors' && siteData[sectorId] && siteData[sectorId].vehicles) {
                // مركبات VIP
                const vipVehiclesInSector = siteData[sectorId].vehicles.filter(v => v.vip === true);
                totalVipVehicles += vipVehiclesInSector.length;
                activeVipVehicles += vipVehiclesInSector.filter(v => v.status === 'active').length;
                
                // مركبات المستخدم
                const userVehicles = siteData[sectorId].vehicles.filter(
                    v => v.createdBy === currentUser.username || v.assignedTo === currentUser.username
                );
                myVehiclesCount += userVehicles.length;
            }
        }
    }
    
    let html = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon primary">
                    <i class="fas fa-crown"></i>
                </div>
                <div class="stat-info">
                    <h3>${totalVipVehicles}</h3>
                    <p>مركبات VIP</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon success">
                    <i class="fas fa-car"></i>
                </div>
                <div class="stat-info">
                    <h3>${myVehiclesCount}</h3>
                    <p>مركباتي</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon warning">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-info">
                    <h3>${activeVipVehicles}</h3>
                    <p>مركبات VIP نشطة</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon info">
                    <i class="fas fa-layer-group"></i>
                </div>
                <div class="stat-info">
                    <h3>${Object.keys(siteData.sectors || {}).length}</h3>
                    <p>عدد القطاعات</p>
                </div>
            </div>
        </div>
        
        <div class="content-card vip-feature">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-bolt"></i>
                    <span>ميزات VIP الحصرية</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-crown"></i>
                    </div>
                    <div class="feature-content">
                        <h3>بحث VIP</h3>
                        <p>ابحث في جميع مركبات VIP الخاصة والسرية</p>
                        <button class="btn btn-primary btn-sm" onclick="navigateTo('vip-search')">
                            ابدأ البحث <i class="fas fa-arrow-left"></i>
                        </button>
                    </div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-plus-circle"></i>
                    </div>
                    <div class="feature-content">
                        <h3>إضافة مركبات</h3>
                        <p>أضف مركبات جديدة لنفسك أو للقطاعات العامة</p>
                        <button class="btn btn-primary btn-sm" onclick="navigateTo('add-vehicle')">
                            إضافة مركبة <i class="fas fa-arrow-left"></i>
                        </button>
                    </div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-car"></i>
                    </div>
                    <div class="feature-content">
                        <h3>مركباتي</h3>
                        <p>إدارة جميع المركبات التي أضفتها أو تم تعيينها لك</p>
                        <button class="btn btn-primary btn-sm" onclick="navigateTo('my-vehicles')">
                            عرض المركبات <i class="fas fa-arrow-left"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-history"></i>
                    <span>آخر مركبات VIP المضافة</span>
                </div>
                <button class="btn btn-info" onclick="navigateTo('vip-search')">
                    <i class="fas fa-list"></i> عرض الكل
                </button>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>المركبة</th>
                            <th>القطاع</th>
                            <th>الرتبة</th>
                            <th>الحالة</th>
                            <th>تاريخ الإضافة</th>
                        </tr>
                    </thead>
                    <tbody id="recentVipVehicles">
                        ${getRecentVipVehicles(10).map(vehicle => `
                            <tr>
                                <td>
                                    <strong>${vehicle.type}</strong>
                                    <div class="text-small">${vehicle.serial}</div>
                                </td>
                                <td>${siteData.sectors[vehicle.sectorId] || 'غير معروف'}</td>
                                <td>${vehicle.rank}</td>
                                <td>
                                    <span class="status-badge ${vehicle.status === 'active' ? 'active' : 'inactive'}">
                                        ${vehicle.status === 'active' ? 'نشط' : 'غير نشط'}
                                    </span>
                                </td>
                                <td>${vehicle.createdAt ? formatDate(vehicle.createdAt) : 'غير معروف'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    pageContent.innerHTML = html;
    
    // إضافة CSS
    const style = document.createElement('style');
    style.textContent = `
        .feature-card {
            background: var(--card-light);
            padding: 25px;
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            gap: 20px;
            transition: var(--transition);
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
            border-color: var(--primary);
        }
        
        .feature-icon {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: rgba(251, 191, 36, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: var(--primary);
        }
        
        .feature-content {
            flex: 1;
        }
        
        .feature-content h3 {
            font-size: 1.2rem;
            margin-bottom: 5px;
            color: var(--text);
        }
        
        .feature-content p {
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin-bottom: 15px;
        }
        
        .btn-sm {
            padding: 6px 12px;
            font-size: 0.85rem;
        }
        
        .text-small {
            font-size: 0.85rem;
            color: var(--text-secondary);
        }
        
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
    `;
    document.head.appendChild(style);
}

function getRecentVipVehicles(limit = 10) {
    let vipVehicles = [];
    
    for (let sectorId in siteData) {
        if (sectorId !== 'sectors' && siteData[sectorId] && siteData[sectorId].vehicles) {
            siteData[sectorId].vehicles.forEach(vehicle => {
                if (vehicle.vip === true) {
                    vipVehicles.push({
                        ...vehicle,
                        sectorId: sectorId
                    });
                }
            });
        }
    }
    
    // ترتيب حسب تاريخ الإنشاء (الأحدث أولاً)
    vipVehicles.sort((a, b) => {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    
    return vipVehicles.slice(0, limit);
}

async function loadSearchPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    let html = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-search"></i>
                    <span>البحث العام في المركبات</span>
                </div>
            </div>
            
            <div class="search-filters">
                <div class="form-group">
                    <label class="form-label">القطاع:</label>
                    <select class="form-control" id="searchSector">
                        <option value="">جميع القطاعات</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">الرتبة:</label>
                    <select class="form-control" id="searchRank">
                        <option value="">جميع الرتب</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">نوع المركبة:</label>
                    <input type="text" class="form-control" id="searchType" placeholder="أدخل نوع المركبة">
                </div>
                
                <div class="form-group">
                    <label class="form-label">الحالة:</label>
                    <select class="form-control" id="searchStatus">
                        <option value="">جميع الحالات</option>
                        <option value="active">نشط</option>
                        <option value="inactive">غير نشط</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <input type="checkbox" id="showOnlyVip" checked>
                    عرض مركبات VIP فقط
                </label>
            </div>
            
            <button class="btn btn-primary btn-block" onclick="performGeneralSearch()">
                <i class="fas fa-search"></i> بحث
            </button>
            
            <div class="search-results" id="searchResults" style="margin-top: 30px;">
                <!-- سيتم عرض النتائج هنا -->
            </div>
        </div>
    `;
    
    pageContent.innerHTML = html;
    
    // تحميل القطاعات
    setTimeout(() => {
        const sectorSelect = document.getElementById('searchSector');
        if (sectorSelect) {
            sectorSelect.innerHTML = '<option value="">جميع القطاعات</option>';
            for (let sectorId in siteData.sectors) {
                sectorSelect.innerHTML += `<option value="${sectorId}">${siteData.sectors[sectorId]}</option>`;
            }
        }
        
        // تحميل الرتب
        loadAllRanks();
    }, 100);
}

function loadAllRanks() {
    const rankSelect = document.getElementById('searchRank');
    if (!rankSelect) return;
    
    const ranksSet = new Set();
    
    for (let sectorId in siteData) {
        if (sectorId !== 'sectors' && siteData[sectorId] && siteData[sectorId].vehicles) {
            siteData[sectorId].vehicles.forEach(vehicle => {
                if (vehicle.rank) ranksSet.add(vehicle.rank);
            });
        }
    }
    
    const ranks = Array.from(ranksSet).sort();
    ranks.forEach(rank => {
        rankSelect.innerHTML += `<option value="${rank}">${rank}</option>`;
    });
}

function performGeneralSearch() {
    const sectorId = document.getElementById('searchSector').value;
    const rank = document.getElementById('searchRank').value;
    const type = document.getElementById('searchType').value.toLowerCase();
    const status = document.getElementById('searchStatus').value;
    const showOnlyVip = document.getElementById('showOnlyVip').checked;
    
    let results = [];
    
    // البحث في جميع المركبات
    for (let secId in siteData) {
        if (secId === 'sectors') continue;
        
        // إذا تم تحديد قطاع معين، تخطي القطاعات الأخرى
        if (sectorId && secId !== sectorId) continue;
        
        if (siteData[secId] && siteData[secId].vehicles) {
            siteData[secId].vehicles.forEach(vehicle => {
                // تطبيق الفلاتر
                let match = true;
                
                // فلتر VIP
                if (showOnlyVip && !vehicle.vip) match = false;
                
                if (rank && vehicle.rank !== rank) match = false;
                if (type && !vehicle.type.toLowerCase().includes(type)) match = false;
                if (status && vehicle.status !== status) match = false;
                
                if (match) {
                    results.push({
                        ...vehicle,
                        sectorId: secId,
                        sectorName: siteData.sectors[secId] || 'غير معروف'
                    });
                }
            });
        }
    }
    
    displaySearchResults(results);
}

function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 20px;"></i>
                <h3>لا توجد نتائج</h3>
                <p>لم يتم العثور على مركبات تطابق معايير البحث</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="results-summary">
            <p>تم العثور على <strong>${results.length}</strong> مركبة</p>
        </div>
        
        <div class="results-grid">
    `;
    
    results.forEach(vehicle => {
        html += `
            <div class="result-card ${vehicle.vip ? 'vip-feature' : ''}">
                <div class="result-header">
                    <div class="result-title">${vehicle.type} - ${vehicle.serial}</div>
                    <div class="result-badges">
                        ${vehicle.vip ? '<span class="vip-badge">VIP</span>' : ''}
                        <span class="status-badge ${vehicle.status === 'active' ? 'active' : 'inactive'}">
                            ${vehicle.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                    </div>
                </div>
                
                <div class="result-details">
                    <div class="result-detail">
                        <i class="fas fa-layer-group"></i>
                        <span>${vehicle.sectorName}</span>
                    </div>
                    <div class="result-detail">
                        <i class="fas fa-user-tag"></i>
                        <span>${vehicle.rank}</span>
                    </div>
                    <div class="result-detail">
                        <i class="fas fa-calendar"></i>
                        <span>${vehicle.createdAt ? formatDate(vehicle.createdAt) : 'غير معروف'}</span>
                    </div>
                </div>
                
                ${vehicle.notes ? `
                <div class="result-notes">
                    <i class="fas fa-sticky-note"></i>
                    <span>${vehicle.notes}</span>
                </div>
                ` : ''}
                
                ${vehicle.createdBy === currentUser.username ? `
                <div class="result-actions">
                    <button class="btn btn-info btn-sm" onclick="editMyVehicle('${vehicle.sectorId}', '${vehicle.id}')">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    
    searchResults.innerHTML = html;
    
    // إضافة CSS إضافي
    const style = document.createElement('style');
    style.textContent = `
        .results-summary {
            margin-bottom: 20px;
            padding: 15px;
            background: var(--card-light);
            border-radius: var(--radius);
            text-align: center;
        }
        
        .results-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }
        
        .result-card {
            background: var(--card-light);
            padding: 20px;
            border-radius: var(--radius);
            margin-bottom: 15px;
            border-right: 4px solid var(--primary);
        }
        
        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .result-title {
            font-weight: 700;
            font-size: 1.1rem;
        }
        
        .result-badges {
            display: flex;
            gap: 5px;
        }
        
        .result-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin-bottom: 10px;
        }
        
        .result-detail {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .result-detail i {
            color: var(--primary);
            width: 16px;
        }
        
        .result-notes {
            margin-top: 10px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.1);
            border-radius: var(--radius);
            font-size: 0.9rem;
            color: var(--text-secondary);
            display: flex;
            gap: 10px;
        }
        
        .result-notes i {
            color: var(--warning);
        }
        
        .result-actions {
            margin-top: 15px;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        
        .no-results {
            text-align: center;
            padding: 40px;
            color: var(--text-secondary);
        }
        
        .no-results h3 {
            margin-bottom: 10px;
            color: var(--text);
        }
    `;
    document.head.appendChild(style);
}

async function loadVipSearchPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    let html = `
        <div class="content-card vip-feature">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-crown"></i>
                    <span>بحث VIP الحصري</span>
                </div>
            </div>
            
            <div class="vip-search-info">
                <div class="vip-icon">
                    <i class="fas fa-crown"></i>
                </div>
                <div class="vip-info">
                    <h3>مرحباً ${currentUser.displayName}!</h3>
                    <p>يمكنك البحث في جميع مركبات VIP السرية والحصرية. استخدم الفلاتر أدناه للعثور على ما تبحث عنه.</p>
                </div>
            </div>
            
            <div class="search-filters">
                <div class="form-group">
                    <label class="form-label">القطاع:</label>
                    <select class="form-control" id="vipSearchSector">
                        <option value="">جميع القطاعات</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">الرتبة:</label>
                    <select class="form-control" id="vipSearchRank">
                        <option value="">جميع الرتب</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">نوع المركبة:</label>
                    <input type="text" class="form-control" id="vipSearchType" placeholder="أدخل نوع المركبة">
                </div>
                
                <div class="form-group">
                    <label class="form-label">الحالة:</label>
                    <select class="form-control" id="vipSearchStatus">
                        <option value="">جميع الحالات</option>
                        <option value="active">نشط</option>
                        <option value="inactive">غير نشط</option>
                    </select>
                </div>
            </div>
            
            <button class="btn btn-primary btn-block" onclick="performVipSearch()">
                <i class="fas fa-crown"></i> بحث VIP
            </button>
            
            <div class="vip-search-results" id="vipSearchResults" style="margin-top: 30px;">
                <!-- سيتم عرض النتائج هنا -->
            </div>
        </div>
    `;
    
    pageContent.innerHTML = html;
    
    // إضافة CSS للبحث VIP
    const style = document.createElement('style');
    style.textContent = `
        .vip-search-info {
            display: flex;
            align-items: center;
            gap: 20px;
            background: rgba(251, 191, 36, 0.1);
            padding: 20px;
            border-radius: var(--radius);
            margin-bottom: 30px;
            border: 2px solid var(--primary);
        }
        
        .vip-icon {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: var(--primary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: #000;
        }
        
        .vip-info h3 {
            color: var(--primary);
            margin-bottom: 5px;
        }
        
        .vip-info p {
            color: var(--text-secondary);
        }
        
        .vip-search-results .result-card {
            border: 2px solid var(--primary);
        }
    `;
    document.head.appendChild(style);
    
    // تحميل القطاعات
    setTimeout(() => {
        const sectorSelect = document.getElementById('vipSearchSector');
        if (sectorSelect) {
            sectorSelect.innerHTML = '<option value="">جميع القطاعات</option>';
            for (let sectorId in siteData.sectors) {
                sectorSelect.innerHTML += `<option value="${sectorId}">${siteData.sectors[sectorId]}</option>`;
            }
        }
    }, 100);
}

function performVipSearch() {
    const sectorId = document.getElementById('vipSearchSector').value;
    const rank = document.getElementById('vipSearchRank').value;
    const type = document.getElementById('vipSearchType').value.toLowerCase();
    const status = document.getElementById('vipSearchStatus').value;
    
    let results = [];
    
    // البحث في مركبات VIP فقط
    for (let secId in siteData) {
        if (secId === 'sectors') continue;
        
        // إذا تم تحديد قطاع معين، تخطي القطاعات الأخرى
        if (sectorId && secId !== sectorId) continue;
        
        if (siteData[secId] && siteData[secId].vehicles) {
            siteData[secId].vehicles.forEach(vehicle => {
                // تطبيق الفلاتر (فقط مركبات VIP)
                if (!vehicle.vip) return;
                
                let match = true;
                
                if (rank && vehicle.rank !== rank) match = false;
                if (type && !vehicle.type.toLowerCase().includes(type)) match = false;
                if (status && vehicle.status !== status) match = false;
                
                if (match) {
                    results.push({
                        ...vehicle,
                        sectorId: secId,
                        sectorName: siteData.sectors[secId] || 'غير معروف'
                    });
                }
            });
        }
    }
    
    displayVipSearchResults(results);
}

function displayVipSearchResults(results) {
    const searchResults = document.getElementById('vipSearchResults');
    if (!searchResults) return;
    
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-crown" style="font-size: 3rem; color: var(--primary); margin-bottom: 20px;"></i>
                <h3>لا توجد نتائج</h3>
                <p>لم يتم العثور على مركبات VIP تطابق معايير البحث</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="results-summary">
            <p>تم العثور على <strong>${results.length}</strong> مركبة VIP</p>
        </div>
        
        <div class="results-grid">
    `;
    
    results.forEach(vehicle => {
        html += `
            <div class="result-card vip-feature">
                <div class="result-header">
                    <div class="result-title">
                        <i class="fas fa-crown" style="color: var(--primary); margin-left: 5px;"></i>
                        ${vehicle.type} - ${vehicle.serial}
                    </div>
                    <div class="result-badges">
                        <span class="vip-badge">VIP</span>
                        <span class="status-badge ${vehicle.status === 'active' ? 'active' : 'inactive'}">
                            ${vehicle.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                    </div>
                </div>
                
                <div class="result-details">
                    <div class="result-detail">
                        <i class="fas fa-layer-group"></i>
                        <span>${vehicle.sectorName}</span>
                    </div>
                    <div class="result-detail">
                        <i class="fas fa-user-tag"></i>
                        <span>${vehicle.rank}</span>
                    </div>
                    <div class="result-detail">
                        <i class="fas fa-user"></i>
                        <span>${vehicle.createdBy || 'غير معروف'}</span>
                    </div>
                </div>
                
                ${vehicle.notes ? `
                <div class="result-notes">
                    <i class="fas fa-sticky-note"></i>
                    <span>${vehicle.notes}</span>
                </div>
                ` : ''}
                
                ${vehicle.technical ? `
                <div class="result-tech">
                    <i class="fas fa-cogs"></i>
                    <span>${vehicle.technical}</span>
                </div>
                ` : ''}
                
                ${vehicle.createdBy === currentUser.username ? `
                <div class="result-actions">
                    <button class="btn btn-info btn-sm" onclick="editMyVehicle('${vehicle.sectorId}', '${vehicle.id}')">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    
    searchResults.innerHTML = html;
    
    // إضافة CSS إضافي
    const style = document.createElement('style');
    style.textContent += `
        .result-tech {
            margin-top: 10px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: var(--radius);
            font-size: 0.85rem;
            color: var(--info);
            display: flex;
            gap: 10px;
            border-right: 3px solid var(--info);
        }
        
        .result-tech i {
            color: var(--info);
        }
    `;
    document.head.appendChild(style);
}

async function loadMyVehiclesPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    // الحصول على مركبات المستخدم
    const myVehicles = getMyVehicles();
    
    let html = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-car"></i>
                    <span>مركباتي</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-primary" onclick="navigateTo('add-vehicle')">
                        <i class="fas fa-plus"></i> إضافة مركبة
                    </button>
                </div>
            </div>
            
            ${myVehicles.length === 0 ? `
            <div class="no-vehicles">
                <i class="fas fa-car" style="font-size: 4rem; color: var(--text-secondary); margin-bottom: 20px;"></i>
                <h3>لا توجد مركبات</h3>
                <p>لم تقم بإضافة أي مركبات بعد</p>
                <button class="btn btn-primary" onclick="navigateTo('add-vehicle')" style="margin-top: 20px;">
                    <i class="fas fa-plus"></i> إضافة أول مركبة
                </button>
            </div>
            ` : `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>المركبة</th>
                            <th>القطاع</th>
                            <th>الرتبة</th>
                            <th>الحالة</th>
                            <th>VIP</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="myVehiclesTable">
                        ${myVehicles.map((vehicle, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>
                                    <strong>${vehicle.type}</strong>
                                    <div class="text-small">${vehicle.serial}</div>
                                </td>
                                <td>${siteData.sectors[vehicle.sectorId] || 'غير معروف'}</td>
                                <td>${vehicle.rank}</td>
                                <td>
                                    <span class="status-badge ${vehicle.status === 'active' ? 'active' : 'inactive'}">
                                        ${vehicle.status === 'active' ? 'نشط' : 'غير نشط'}
                                    </span>
                                </td>
                                <td>
                                    ${vehicle.vip ? '<i class="fas fa-crown" style="color: var(--primary);"></i>' : '-'}
                                </td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn btn-info btn-sm" onclick="editMyVehicle('${vehicle.sectorId}', '${vehicle.id}')">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteMyVehicle('${vehicle.sectorId}', '${vehicle.id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            `}
        </div>
    `;
    
    pageContent.innerHTML = html;
    
    // إضافة CSS
    const style = document.createElement('style');
    style.textContent = `
        .no-vehicles {
            text-align: center;
            padding: 40px;
            color: var(--text-secondary);
        }
        
        .no-vehicles h3 {
            margin-bottom: 10px;
            color: var(--text);
        }
        
        .action-buttons {
            display: flex;
            gap: 5px;
        }
        
        .btn-sm {
            padding: 5px 10px;
            font-size: 0.8rem;
        }
    `;
    document.head.appendChild(style);
}

function getMyVehicles() {
    let myVehicles = [];
    
    if (!currentUser) return myVehicles;
    
    for (let sectorId in siteData) {
        if (sectorId !== 'sectors' && siteData[sectorId] && siteData[sectorId].vehicles) {
            siteData[sectorId].vehicles.forEach(vehicle => {
                if (vehicle.createdBy === currentUser.username || vehicle.assignedTo === currentUser.username) {
                    myVehicles.push({
                        ...vehicle,
                        sectorId: sectorId
                    });
                }
            });
        }
    }
    
    return myVehicles;
}

async function loadAddVehiclePage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    let sectorsOptions = '';
    for (let sectorId in siteData.sectors) {
        sectorsOptions += `<option value="${sectorId}">${siteData.sectors[sectorId]}</option>`;
    }
    
    let html = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-plus-circle"></i>
                    <span>إضافة مركبة جديدة</span>
                </div>
            </div>
            
            <form id="addVehicleForm">
                <div class="form-group">
                    <label class="form-label">القطاع *</label>
                    <select class="form-control" id="vehicleSector" required>
                        <option value="">اختر القطاع</option>
                        ${sectorsOptions}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">الرقم التسلسلي *</label>
                    <input type="text" class="form-control" id="vehicleSerial" required 
                           placeholder="أدخل الرقم التسلسلي للمركبة">
                </div>
                
                <div class="form-group">
                    <label class="form-label">نوع المركبة *</label>
                    <input type="text" class="form-control" id="vehicleType" required 
                           placeholder="مثال: دبابة، عربة، شاحنة">
                </div>
                
                <div class="form-group">
                    <label class="form-label">الرتبة *</label>
                    <input type="text" class="form-control" id="vehicleRank" required 
                           placeholder="مثال: عريف، رقيب، ملازم">
                </div>
                
                <div class="form-group">
                    <label class="form-label">الحالة *</label>
                    <select class="form-control" id="vehicleStatus" required>
                        <option value="active">نشط</option>
                        <option value="inactive">غير نشط</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" id="vehicleVip" checked>
                        مركبة VIP
                    </label>
                    <small class="form-text">مركبات VIP تظهر فقط لأعضاء VIP</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">ملاحظات</label>
                    <textarea class="form-control" id="vehicleNotes" rows="3" 
                              placeholder="أي ملاحظات إضافية عن المركبة"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">المعلومات التقنية (اختياري)</label>
                    <textarea class="form-control" id="vehicleTech" rows="2" 
                              placeholder="معلومات تقنية عن المركبة"></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> حفظ المركبة
                    </button>
                    <button type="button" class="btn" onclick="navigateTo('my-vehicles')" 
                            style="background: var(--card-light); color: var(--text);">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                </div>
            </form>
        </div>
    `;
    
    pageContent.innerHTML = html;
    
    // إضافة معالج الحدث للنموذج
    const form = document.getElementById('addVehicleForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveNewVipVehicle();
        });
    }
    
    // إضافة CSS
    const style = document.createElement('style');
    style.textContent = `
        .form-actions {
            display: flex;
            gap: 10px;
            margin-top: 30px;
        }
    `;
    document.head.appendChild(style);
}

async function saveNewVipVehicle() {
    try {
        const sectorId = document.getElementById('vehicleSector').value;
        const serial = document.getElementById('vehicleSerial').value;
        const type = document.getElementById('vehicleType').value;
        const rank = document.getElementById('vehicleRank').value;
        const status = document.getElementById('vehicleStatus').value;
        const vip = document.getElementById('vehicleVip').checked;
        const notes = document.getElementById('vehicleNotes').value;
        const tech = document.getElementById('vehicleTech').value;
        
        if (!sectorId || !serial || !type || !rank) {
            showToast('الرجاء ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        // التحقق من عدم تكرار الرقم التسلسلي
        for (let secId in siteData) {
            if (secId !== 'sectors' && siteData[secId] && siteData[secId].vehicles) {
                const duplicate = siteData[secId].vehicles.find(v => v.serial === serial);
                if (duplicate) {
                    showToast('الرقم التسلسلي موجود مسبقاً', 'error');
                    return;
                }
            }
        }
        
        const newVehicle = {
            id: 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            serial: serial,
            type: type,
            rank: rank,
            status: status,
            vip: vip,
            notes: notes,
            technical: tech,
            createdAt: new Date().toISOString(),
            createdBy: currentUser.username,
            lastUpdated: new Date().toISOString(),
            updatedBy: currentUser.username
        };
        
        // إنشاء القطاع إذا لم يكن موجوداً
        if (!siteData[sectorId]) {
            siteData[sectorId] = {
                colors: ["#4ecca3", "#1e293b"],
                vehicles: []
            };
        }
        
        // إضافة المركبة للقطاع
        siteData[sectorId].vehicles.push(newVehicle);
        
        // حفظ في Firebase
        if (db) {
            await db.ref('siteData').set(siteData);
        }
        
        // إضافة سجل النظام
        await addSystemLog('add', `عضو VIP ${currentUser.username} أضاف مركبة جديدة: ${serial} (${type})`, 
                          `القطاع: ${siteData.sectors[sectorId]} - VIP: ${vip ? 'نعم' : 'لا'}`);
        
        showToast('تمت إضافة المركبة بنجاح', 'success');
        
        // الانتقال لصفحة مركباتي بعد 1.5 ثانية
        setTimeout(() => {
            navigateTo('my-vehicles');
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error adding vehicle:', error);
        showToast('خطأ في إضافة المركبة', 'error');
    }
}

async function editMyVehicle(sectorId, vehicleId) {
    // البحث عن المركبة
    let vehicle = null;
    if (siteData[sectorId] && siteData[sectorId].vehicles) {
        vehicle = siteData[sectorId].vehicles.find(v => v.id === vehicleId);
    }
    
    if (!vehicle) {
        showToast('لم يتم العثور على المركبة', 'error');
        return;
    }
    
    // التحقق من أن المركبة مملوكة للمستخدم الحالي
    if (vehicle.createdBy !== currentUser.username) {
        showToast('لا يمكنك تعديل هذه المركبة', 'error');
        return;
    }
    
    // عرض نموذج التعديل
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = 'تعديل مركبتي';
    
    let sectorsOptions = '';
    for (let secId in siteData.sectors) {
        sectorsOptions += `<option value="${secId}" ${secId === sectorId ? 'selected' : ''}>${siteData.sectors[secId]}</option>`;
    }
    
    modalBody.innerHTML = `
        <form id="editVehicleForm">
            <div class="form-group">
                <label class="form-label">القطاع</label>
                <select class="form-control" id="editVehicleSector" required>
                    ${sectorsOptions}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">الرقم التسلسلي</label>
                <input type="text" class="form-control" id="editVehicleSerial" 
                       value="${vehicle.serial}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">نوع المركبة</label>
                <input type="text" class="form-control" id="editVehicleType" 
                       value="${vehicle.type}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">الرتبة</label>
                <input type="text" class="form-control" id="editVehicleRank" 
                       value="${vehicle.rank}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">الحالة</label>
                <select class="form-control" id="editVehicleStatus" required>
                    <option value="active" ${vehicle.status === 'active' ? 'selected' : ''}>نشط</option>
                    <option value="inactive" ${vehicle.status === 'inactive' ? 'selected' : ''}>غير نشط</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <input type="checkbox" id="editVehicleVip" ${vehicle.vip ? 'checked' : ''}>
                    مركبة VIP
                </label>
            </div>
            
            <div class="form-group">
                <label class="form-label">ملاحظات</label>
                <textarea class="form-control" id="editVehicleNotes" rows="3">${vehicle.notes || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">المعلومات التقنية</label>
                <textarea class="form-control" id="editVehicleTech" rows="2">${vehicle.technical || ''}</textarea>
            </div>
            
            <button type="submit" class="btn btn-primary btn-block">
                <i class="fas fa-save"></i> حفظ التعديلات
            </button>
        </form>
    `;
    
    modal.classList.add('active');
    
    // إضافة معالج الحدث للنموذج
    const form = document.getElementById('editVehicleForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await updateMyVehicle(sectorId, vehicleId);
        });
    }
}

async function updateMyVehicle(oldSectorId, vehicleId) {
    try {
        const newSectorId = document.getElementById('editVehicleSector').value;
        const serial = document.getElementById('editVehicleSerial').value;
        const type = document.getElementById('editVehicleType').value;
        const rank = document.getElementById('editVehicleRank').value;
        const status = document.getElementById('editVehicleStatus').value;
        const vip = document.getElementById('editVehicleVip').checked;
        const notes = document.getElementById('editVehicleNotes').value;
        const tech = document.getElementById('editVehicleTech').value;
        
        if (!newSectorId || !serial || !type || !rank) {
            showToast('الرجاء ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        // البحث عن المركبة القديمة وحذفها
        let oldVehicleIndex = -1;
        if (siteData[oldSectorId] && siteData[oldSectorId].vehicles) {
            oldVehicleIndex = siteData[oldSectorId].vehicles.findIndex(v => v.id === vehicleId);
        }
        
        if (oldVehicleIndex === -1) {
            showToast('لم يتم العثور على المركبة', 'error');
            return;
        }
        
        // إنشاء القطاع الجديد إذا لم يكن موجوداً
        if (!siteData[newSectorId]) {
            siteData[newSectorId] = {
                colors: ["#4ecca3", "#1e293b"],
                vehicles: []
            };
        }
        
        // إنشاء المركبة المحدثة
        const updatedVehicle = {
            id: vehicleId,
            serial: serial,
            type: type,
            rank: rank,
            status: status,
            vip: vip,
            notes: notes,
            technical: tech,
            createdAt: siteData[oldSectorId].vehicles[oldVehicleIndex].createdAt,
            createdBy: currentUser.username,
            lastUpdated: new Date().toISOString(),
            updatedBy: currentUser.username
        };
        
        // إذا تغير القطاع، نقل المركبة
        if (oldSectorId !== newSectorId) {
            // حذف من القطاع القديم
            siteData[oldSectorId].vehicles.splice(oldVehicleIndex, 1);
            // إضافة للقطاع الجديد
            siteData[newSectorId].vehicles.push(updatedVehicle);
        } else {
            // تحديث في نفس القطاع
            siteData[oldSectorId].vehicles[oldVehicleIndex] = updatedVehicle;
        }
        
        // حفظ في Firebase
        if (db) {
            await db.ref('siteData').set(siteData);
        }
        
        // إضافة سجل النظام
        await addSystemLog('edit', `عضو VIP ${currentUser.username} قام بتعديل مركبة: ${serial} (${type})`);
        
        showToast('تم تحديث المركبة بنجاح', 'success');
        closeModal();
        navigateTo('my-vehicles');
        
    } catch (error) {
        console.error('❌ Error updating vehicle:', error);
        showToast('خطأ في تحديث المركبة', 'error');
    }
}

async function deleteMyVehicle(sectorId, vehicleId) {
    if (!confirm('هل أنت متأكد من حذف هذه المركبة؟ هذا الإجراء لا يمكن التراجع عنه.')) {
        return;
    }
    
    try {
        // البحث عن المركبة
        let vehicleIndex = -1;
        let vehicle = null;
        
        if (siteData[sectorId] && siteData[sectorId].vehicles) {
            vehicleIndex = siteData[sectorId].vehicles.findIndex(v => v.id === vehicleId);
            if (vehicleIndex !== -1) {
                vehicle = siteData[sectorId].vehicles[vehicleIndex];
            }
        }
        
        if (!vehicle) {
            showToast('لم يتم العثور على المركبة', 'error');
            return;
        }
        
        // التحقق من أن المركبة مملوكة للمستخدم الحالي
        if (vehicle.createdBy !== currentUser.username) {
            showToast('لا يمكنك حذف هذه المركبة', 'error');
            return;
        }
        
        // حذف المركبة
        siteData[sectorId].vehicles.splice(vehicleIndex, 1);
        
        // حفظ في Firebase
        if (db) {
            await db.ref('siteData').set(siteData);
        }
        
        // إضافة سجل النظام
        await addSystemLog('delete', `عضو VIP ${currentUser.username} قام بحذف مركبة: ${vehicle.serial} (${vehicle.type})`);
        
        showToast('تم حذف المركبة بنجاح', 'success');
        
        // إعادة تحميل الصفحة الحالية
        navigateTo('my-vehicles');
        
    } catch (error) {
        console.error('❌ Error deleting vehicle:', error);
        showToast('خطأ في حذف المركبة', 'error');
    }
}

async function loadRequestsPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    let html = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-envelope"></i>
                    <span>طلباتي</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-primary" onclick="showNewRequestModal()">
                        <i class="fas fa-plus"></i> طلب جديد
                    </button>
                </div>
            </div>
            
            <div class="requests-info">
                <div class="info-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="info-content">
                    <h4>نظام الطلبات</h4>
                    <p>يمكنك إرسال طلبات خاصة للمدير مثل طلب نقل مركبة، تعديل معلومات، أو أي طلبات أخرى.</p>
                </div>
            </div>
            
            <div class="requests-list" id="requestsList">
                <!-- سيتم عرض الطلبات هنا -->
                <div class="no-requests">
                    <i class="fas fa-envelope-open" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 20px;"></i>
                    <h3>لا توجد طلبات</h3>
                    <p>لم تقم بإرسال أي طلبات بعد</p>
                </div>
            </div>
        </div>
    `;
    
    pageContent.innerHTML = html;
    
    // إضافة CSS للطلبات
    const style = document.createElement('style');
    style.textContent = `
        .requests-info {
            display: flex;
            align-items: center;
            gap: 15px;
            background: rgba(59, 130, 246, 0.1);
            padding: 15px;
            border-radius: var(--radius);
            margin-bottom: 20px;
            border: 1px solid var(--info);
        }
        
        .info-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--info);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            color: white;
        }
        
        .info-content h4 {
            color: var(--info);
            margin-bottom: 5px;
        }
        
        .info-content p {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
        
        .requests-list .no-requests {
            text-align: center;
            padding: 40px;
            color: var(--text-secondary);
        }
        
        .requests-list .no-requests h3 {
            margin-bottom: 10px;
            color: var(--text);
        }
    `;
    document.head.appendChild(style);
}

function showNewRequestModal() {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = 'طلب جديد';
    
    modalBody.innerHTML = `
        <form id="newRequestForm">
            <div class="form-group">
                <label class="form-label">نوع الطلب *</label>
                <select class="form-control" id="requestType" required>
                    <option value="">اختر نوع الطلب</option>
                    <option value="transfer">نقل مركبة</option>
                    <option value="modify">تعديل معلومات</option>
                    <option value="add">إضافة مركبة</option>
                    <option value="delete">حذف مركبة</option>
                    <option value="other">طلب آخر</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">رقم المركبة (إن وجد)</label>
                <input type="text" class="form-control" id="requestVehicle" 
                       placeholder="أدخل الرقم التسلسلي للمركبة">
            </div>
            
            <div class="form-group">
                <label class="form-label">الموضوع *</label>
                <input type="text" class="form-control" id="requestSubject" required 
                       placeholder="أدخل موضوع الطلب">
            </div>
            
            <div class="form-group">
                <label class="form-label">تفاصيل الطلب *</label>
                <textarea class="form-control" id="requestDetails" rows="4" required 
                          placeholder="صف طلبك بالتفصيل"></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">الأولوية</label>
                <select class="form-control" id="requestPriority">
                    <option value="low">منخفضة</option>
                    <option value="medium" selected>متوسطة</option>
                    <option value="high">عالية</option>
                    <option value="urgent">عاجلة</option>
                </select>
            </div>
            
            <button type="submit" class="btn btn-primary btn-block">
                <i class="fas fa-paper-plane"></i> إرسال الطلب
            </button>
        </form>
    `;
    
    modal.classList.add('active');
    
    // إضافة معالج الحدث للنموذج
    const form = document.getElementById('newRequestForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await submitNewRequest();
        });
    }
}

async function submitNewRequest() {
    try {
        const requestType = document.getElementById('requestType').value;
        const vehicleSerial = document.getElementById('requestVehicle').value;
        const subject = document.getElementById('requestSubject').value;
        const details = document.getElementById('requestDetails').value;
        const priority = document.getElementById('requestPriority').value;
        
        if (!requestType || !subject || !details) {
            showToast('الرجاء ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        // هنا يمكنك إضافة كود لإرسال الطلب إلى قاعدة البيانات
        // مؤقتاً، سنعرض رسالة نجاح
        
        showToast('تم إرسال طلبك بنجاح وسيتم مراجعته من قبل المدير', 'success');
        closeModal();
        
        // إضافة سجل النظام
        await addSystemLog('add', `عضو VIP ${currentUser.username} أرسل طلباً جديداً`, 
                          `نوع الطلب: ${requestType} - الأولوية: ${priority}`);
        
    } catch (error) {
        console.error('❌ Error submitting request:', error);
        showToast('خطأ في إرسال الطلب', 'error');
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

// ============================================
// تحديث البيانات في الوقت الحقيقي
// ============================================
if (db) {
    // تحديث بيانات الموقع
    db.ref('siteData').on('value', snapshot => {
        const data = snapshot.val();
        if (data) {
            siteData = data;
            updateDashboardStats();
            
            // إعادة تحميل الصفحة الحالية إذا كانت تعتمد على البيانات
            if (['dashboard', 'my-vehicles', 'vip-search', 'search'].includes(currentPage)) {
                loadPageContent(currentPage);
            }
        }
    });
}