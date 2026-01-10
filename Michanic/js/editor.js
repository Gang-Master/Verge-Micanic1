// ============================================
// نظام لوحة تحكم المحرر
// ============================================
let siteData = {
    sectors: { 's_default': 'القطاع العام' },
    s_default: {
        colors: ["#4ecca3", "#1e293b"],
        vehicles: []
    }
};
let currentPage = 'dashboard';

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 بدء تحميل لوحة المحرر...');
    
    // التحقق من الصلاحية
    if (!currentUser || (currentUser.role !== 'editor' && currentUser.role !== 'admin')) {
        window.location.href = 'index.html';
        return;
    }
    
    // تحديث واجهة المستخدم
    updateUserInterface();
    
    // إعداد الأحداث
    setupEditorEvents();
    
    // تحميل البيانات
    await loadEditorData();
    
    // تحديث الوقت
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    
    // تحميل الصفحة الرئيسية
    await loadPageContent('dashboard');
    
    console.log('✅ لوحة المحرر جاهزة');
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

function setupEditorEvents() {
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

async function loadEditorData() {
    try {
        if (db) {
            // تحميل بيانات الموقع
            const siteSnapshot = await db.ref('siteData').once('value');
            siteData = siteSnapshot.val() || {
                sectors: { 's_default': 'القطاع العام' },
                s_default: { colors: ["#4ecca3", "#1e293b"], vehicles: [] }
            };
            
            console.log('✅ تم تحميل بيانات المحرر');
            
            // تحديث الإحصائيات
            updateDashboardStats();
        }
    } catch (error) {
        console.error('❌ Error loading editor data:', error);
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
    
    for (let sectorId in siteData) {
        if (sectorId !== 'sectors' && siteData[sectorId] && siteData[sectorId].vehicles) {
            totalVehicles += siteData[sectorId].vehicles.length;
        }
    }
    
    // تحديث العناصر
    const totalVehiclesElement = document.getElementById('totalVehicles');
    const totalSectorsElement = document.getElementById('totalSectors');
    
    if (totalVehiclesElement) totalVehiclesElement.textContent = totalVehicles;
    if (totalSectorsElement) totalSectorsElement.textContent = Object.keys(siteData.sectors || {}).length;
}

function navigateTo(page) {
    currentPage = page;
    
    const pageTitles = {
        'dashboard': 'لوحة التحكم',
        'search': 'البحث العام',
        'vehicles': 'المركبات العامة',
        'add-vehicle': 'إضافة مركبة',
        'sectors': 'إدارة القطاعات'
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
        'vehicles': 'car',
        'add-vehicle': 'plus-circle',
        'sectors': 'layer-group'
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
            case 'vehicles':
                await loadVehiclesPage();
                break;
            case 'add-vehicle':
                await loadAddVehiclePage();
                break;
            case 'sectors':
                await loadSectorsPage();
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
    let activeVehicles = 0;
    let vipVehicles = 0;
    
    for (let sectorId in siteData) {
        if (sectorId !== 'sectors' && siteData[sectorId] && siteData[sectorId].vehicles) {
            const sectorVehicles = siteData[sectorId].vehicles;
            totalVehicles += sectorVehicles.length;
            activeVehicles += sectorVehicles.filter(v => v.status === 'active').length;
            vipVehicles += sectorVehicles.filter(v => v.vip === true).length;
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
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-info">
                    <h3>${activeVehicles}</h3>
                    <p>مركبات نشطة</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon warning">
                    <i class="fas fa-crown"></i>
                </div>
                <div class="stat-info">
                    <h3>${vipVehicles}</h3>
                    <p>مركبات VIP</p>
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
        
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-bolt"></i>
                    <span>الوصول السريع</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div class="quick-action-card" onclick="navigateTo('search')">
                    <div class="action-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <div class="action-content">
                        <h3>البحث العام</h3>
                        <p>ابحث في جميع المركبات حسب القطاع والرتبة</p>
                    </div>
                </div>
                
                <div class="quick-action-card" onclick="navigateTo('add-vehicle')">
                    <div class="action-icon">
                        <i class="fas fa-plus-circle"></i>
                    </div>
                    <div class="action-content">
                        <h3>إضافة مركبة</h3>
                        <p>أضف مركبة جديدة إلى النظام</p>
                    </div>
                </div>
                
                <div class="quick-action-card" onclick="navigateTo('sectors')">
                    <div class="action-icon">
                        <i class="fas fa-layer-group"></i>
                    </div>
                    <div class="action-content">
                        <h3>إدارة القطاعات</h3>
                        <p>أضف أو عدل أو احذف القطاعات</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    pageContent.innerHTML = html;
    
    // إضافة CSS للوصول السريع
    const style = document.createElement('style');
    style.textContent = `
        .quick-action-card {
            background: var(--card-light);
            padding: 25px;
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            gap: 20px;
            cursor: pointer;
            transition: var(--transition);
            border: 2px solid transparent;
        }
        
        .quick-action-card:hover {
            border-color: var(--primary);
            transform: translateY(-5px);
        }
        
        .action-icon {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: rgba(139, 92, 246, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: var(--primary);
        }
        
        .action-content h3 {
            font-size: 1.2rem;
            margin-bottom: 5px;
            color: var(--text);
        }
        
        .action-content p {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
    `;
    document.head.appendChild(style);
}

async function loadSearchPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    let html = `
        <div class="search-container">
            <div class="search-header">
                <i class="fas fa-search"></i>
                <span>البحث في المركبات</span>
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
            
            <button class="btn btn-primary btn-block" onclick="performSearch()">
                <i class="fas fa-search"></i> بحث
            </button>
            
            <div class="search-results" id="searchResults">
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
            
            // عند تغيير القطاع، تحميل الرتب الخاصة به
            sectorSelect.addEventListener('change', function() {
                const sectorId = this.value;
                const rankSelect = document.getElementById('searchRank');
                
                if (rankSelect) {
                    rankSelect.innerHTML = '<option value="">جميع الرتب</option>';
                    
                    if (sectorId && siteData[sectorId] && siteData[sectorId].vehicles) {
                        const ranksSet = new Set();
                        siteData[sectorId].vehicles.forEach(vehicle => {
                            if (vehicle.rank) ranksSet.add(vehicle.rank);
                        });
                        
                        const ranks = Array.from(ranksSet).sort();
                        ranks.forEach(rank => {
                            rankSelect.innerHTML += `<option value="${rank}">${rank}</option>`;
                        });
                    }
                }
            });
        }
        
        // تحميل الرتب من جميع المركبات
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

function performSearch() {
    const sectorId = document.getElementById('searchSector').value;
    const rank = document.getElementById('searchRank').value;
    const type = document.getElementById('searchType').value.toLowerCase();
    const status = document.getElementById('searchStatus').value;
    
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
            <div class="result-card">
                <div class="result-header">
                    <div class="result-title">${vehicle.type} - ${vehicle.serial}</div>
                    <div class="result-badges">
                        ${vehicle.vip ? '<span class="result-badge vip">VIP</span>' : ''}
                        <span class="result-badge ${vehicle.status === 'active' ? 'active' : 'inactive'}">
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
                
                <div class="result-actions">
                    <button class="btn btn-info btn-sm" onclick="editVehicle('${vehicle.sectorId}', '${vehicle.id}')">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteVehicle('${vehicle.sectorId}', '${vehicle.id}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
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
        
        .result-badges {
            display: flex;
            gap: 5px;
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

async function loadVehiclesPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    let html = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-car"></i>
                    <span>المركبات العامة</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-primary" onclick="navigateTo('add-vehicle')">
                        <i class="fas fa-plus"></i> إضافة مركبة
                    </button>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>الرقم التسلسلي</th>
                            <th>النوع</th>
                            <th>القطاع</th>
                            <th>الرتبة</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="vehiclesTable">
                        ${getAllVehicles().map((vehicle, index) => `
                            <tr>
                                <td>${index + 1}</td>
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
                                    <div class="action-buttons">
                                        <button class="btn btn-info btn-sm" onclick="editVehicle('${vehicle.sectorId}', '${vehicle.id}')">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteVehicle('${vehicle.sectorId}', '${vehicle.id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
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
                        <input type="checkbox" id="vehicleVip">
                        مركبة VIP
                    </label>
                    <small class="form-text">المركبات VIP تظهر فقط لأعضاء VIP</small>
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
                    <button type="button" class="btn" onclick="navigateTo('vehicles')" 
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
            await saveNewVehicle();
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

async function saveNewVehicle() {
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
        await addSystemLog('add', `تمت إضافة مركبة جديدة: ${serial} (${type})`, `القطاع: ${siteData.sectors[sectorId]}`);
        
        showToast('تمت إضافة المركبة بنجاح', 'success');
        
        // الانتقال لصفحة المركبات بعد 1.5 ثانية
        setTimeout(() => {
            navigateTo('vehicles');
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error adding vehicle:', error);
        showToast('خطأ في إضافة المركبة', 'error');
    }
}

async function editVehicle(sectorId, vehicleId) {
    // البحث عن المركبة
    let vehicle = null;
    if (siteData[sectorId] && siteData[sectorId].vehicles) {
        vehicle = siteData[sectorId].vehicles.find(v => v.id === vehicleId);
    }
    
    if (!vehicle) {
        showToast('لم يتم العثور على المركبة', 'error');
        return;
    }
    
    // عرض نموذج التعديل
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = 'تعديل مركبة';
    
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
            await updateVehicle(sectorId, vehicleId);
        });
    }
}

async function updateVehicle(oldSectorId, vehicleId) {
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
            createdBy: siteData[oldSectorId].vehicles[oldVehicleIndex].createdBy,
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
        await addSystemLog('edit', `تم تعديل مركبة: ${serial} (${type})`, 
                          `القطاع: ${siteData.sectors[newSectorId]} - الرتبة: ${rank}`);
        
        showToast('تم تحديث المركبة بنجاح', 'success');
        closeModal();
        navigateTo('vehicles');
        
    } catch (error) {
        console.error('❌ Error updating vehicle:', error);
        showToast('خطأ في تحديث المركبة', 'error');
    }
}

async function deleteVehicle(sectorId, vehicleId) {
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
        
        // حذف المركبة
        siteData[sectorId].vehicles.splice(vehicleIndex, 1);
        
        // حفظ في Firebase
        if (db) {
            await db.ref('siteData').set(siteData);
        }
        
        // إضافة سجل النظام
        await addSystemLog('delete', `تم حذف مركبة: ${vehicle.serial} (${vehicle.type})`, 
                          `القطاع: ${siteData.sectors[sectorId]}`);
        
        showToast('تم حذف المركبة بنجاح', 'success');
        
        // إعادة تحميل الصفحة الحالية
        if (currentPage === 'vehicles') {
            navigateTo('vehicles');
        } else if (currentPage === 'search') {
            performSearch();
        }
        
    } catch (error) {
        console.error('❌ Error deleting vehicle:', error);
        showToast('خطأ في حذف المركبة', 'error');
    }
}

async function loadSectorsPage() {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    let html = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-layer-group"></i>
                    <span>إدارة القطاعات</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-primary" onclick="showAddSectorModal()">
                        <i class="fas fa-plus"></i> إضافة قطاع
                    </button>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>اسم القطاع</th>
                            <th>عدد المركبات</th>
                            <th>تاريخ الإنشاء</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="sectorsTable">
                        ${Object.entries(siteData.sectors || {}).map(([sectorId, sectorName]) => {
                            const vehicleCount = siteData[sectorId] && siteData[sectorId].vehicles 
                                                ? siteData[sectorId].vehicles.length 
                                                : 0;
                            return `
                                <tr>
                                    <td>${sectorName}</td>
                                    <td>${vehicleCount}</td>
                                    <td>${siteData[sectorId]?.createdAt ? formatDate(siteData[sectorId].createdAt) : 'غير معروف'}</td>
                                    <td>
                                        ${sectorId !== 's_default' ? `
                                        <div class="action-buttons">
                                            <button class="btn btn-info btn-sm" onclick="editSector('${sectorId}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn btn-danger btn-sm" onclick="deleteSector('${sectorId}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                        ` : '<span style="color: var(--text-secondary); font-size: 0.9rem;">القطاع الأساسي</span>'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    pageContent.innerHTML = html;
}

function showAddSectorModal() {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = 'إضافة قطاع جديد';
    
    modalBody.innerHTML = `
        <form id="addSectorForm">
            <div class="form-group">
                <label class="form-label">اسم القطاع *</label>
                <input type="text" class="form-control" id="sectorName" required 
                       placeholder="أدخل اسم القطاع">
            </div>
            
            <div class="form-group">
                <label class="form-label">وصف القطاع (اختياري)</label>
                <textarea class="form-control" id="sectorDescription" rows="3" 
                          placeholder="وصف مختصر للقطاع"></textarea>
            </div>
            
            <button type="submit" class="btn btn-primary btn-block">
                <i class="fas fa-save"></i> حفظ القطاع
            </button>
        </form>
    `;
    
    modal.classList.add('active');
    
    // إضافة معالج الحدث للنموذج
    const form = document.getElementById('addSectorForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await addNewSector();
        });
    }
}

async function addNewSector() {
    try {
        const sectorName = document.getElementById('sectorName').value.trim();
        const description = document.getElementById('sectorDescription').value;
        
        if (!sectorName) {
            showToast('الرجاء إدخال اسم القطاع', 'error');
            return;
        }
        
        // التحقق من عدم تكرار اسم القطاع
        for (let sectorId in siteData.sectors) {
            if (siteData.sectors[sectorId] === sectorName) {
                showToast('اسم القطاع موجود مسبقاً', 'error');
                return;
            }
        }
        
        // إنشاء معرف فريد للقطاع
        const sectorId = 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        // إضافة القطاع
        siteData.sectors[sectorId] = sectorName;
        siteData[sectorId] = {
            colors: ["#4ecca3", "#1e293b"],
            vehicles: [],
            description: description,
            createdAt: new Date().toISOString(),
            createdBy: currentUser.username
        };
        
        // حفظ في Firebase
        if (db) {
            await db.ref('siteData').set(siteData);
        }
        
        // إضافة سجل النظام
        await addSystemLog('add', `تمت إضافة قطاع جديد: ${sectorName}`);
        
        showToast('تمت إضافة القطاع بنجاح', 'success');
        closeModal();
        navigateTo('sectors');
        
    } catch (error) {
        console.error('❌ Error adding sector:', error);
        showToast('خطأ في إضافة القطاع', 'error');
    }
}

async function editSector(sectorId) {
    const sectorName = siteData.sectors[sectorId];
    const sectorData = siteData[sectorId];
    
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = 'تعديل قطاع';
    
    modalBody.innerHTML = `
        <form id="editSectorForm">
            <div class="form-group">
                <label class="form-label">اسم القطاع *</label>
                <input type="text" class="form-control" id="editSectorName" 
                       value="${sectorName}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">وصف القطاع</label>
                <textarea class="form-control" id="editSectorDescription" rows="3">${sectorData?.description || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">عدد المركبات: ${sectorData?.vehicles?.length || 0}</label>
            </div>
            
            <button type="submit" class="btn btn-primary btn-block">
                <i class="fas fa-save"></i> حفظ التعديلات
            </button>
        </form>
    `;
    
    modal.classList.add('active');
    
    // إضافة معالج الحدث للنموذج
    const form = document.getElementById('editSectorForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await updateSector(sectorId);
        });
    }
}

async function updateSector(sectorId) {
    try {
        const newSectorName = document.getElementById('editSectorName').value.trim();
        const description = document.getElementById('editSectorDescription').value;
        
        if (!newSectorName) {
            showToast('الرجاء إدخال اسم القطاع', 'error');
            return;
        }
        
        // التحقق من عدم تكرار اسم القطاع (مع استثناء القطاع الحالي)
        for (let secId in siteData.sectors) {
            if (secId !== sectorId && siteData.sectors[secId] === newSectorName) {
                showToast('اسم القطاع موجود مسبقاً', 'error');
                return;
            }
        }
        
        // تحديث القطاع
        siteData.sectors[sectorId] = newSectorName;
        
        if (siteData[sectorId]) {
            siteData[sectorId].description = description;
            siteData[sectorId].lastUpdated = new Date().toISOString();
            siteData[sectorId].updatedBy = currentUser.username;
        }
        
        // حفظ في Firebase
        if (db) {
            await db.ref('siteData').set(siteData);
        }
        
        // إضافة سجل النظام
        await addSystemLog('edit', `تم تعديل قطاع: ${newSectorName}`);
        
        showToast('تم تحديث القطاع بنجاح', 'success');
        closeModal();
        navigateTo('sectors');
        
    } catch (error) {
        console.error('❌ Error updating sector:', error);
        showToast('خطأ في تحديث القطاع', 'error');
    }
}

async function deleteSector(sectorId) {
    if (!confirm('هل أنت متأكد من حذف هذا القطاع؟ سيتم حذف جميع المركبات الموجودة فيه. هذا الإجراء لا يمكن التراجع عنه.')) {
        return;
    }
    
    try {
        const sectorName = siteData.sectors[sectorId];
        const vehicleCount = siteData[sectorId]?.vehicles?.length || 0;
        
        // حذف القطاع
        delete siteData.sectors[sectorId];
        delete siteData[sectorId];
        
        // حفظ في Firebase
        if (db) {
            await db.ref('siteData').set(siteData);
        }
        
        // إضافة سجل النظام
        await addSystemLog('delete', `تم حذف قطاع: ${sectorName}`, 
                          `تم حذف ${vehicleCount} مركبة مع القطاع`);
        
        showToast('تم حذف القطاع بنجاح', 'success');
        navigateTo('sectors');
        
    } catch (error) {
        console.error('❌ Error deleting sector:', error);
        showToast('خطأ في حذف القطاع', 'error');
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
            if (['dashboard', 'vehicles', 'sectors', 'search'].includes(currentPage)) {
                loadPageContent(currentPage);
            }
        }
    });
}