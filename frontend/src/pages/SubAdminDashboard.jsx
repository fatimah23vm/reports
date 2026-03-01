

// src/pages/SubAdminDashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const SubAdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetails, setReportDetails] = useState({
    workItems: [],
    nextDayPlans: [],
    materials: [],
    siteImages: [],
    signatures: []
  });
const [viewOnly, setViewOnly] = useState(false);
  // ========== دالة مساعدة للتحقق من صلاحية التعديل ==========
  const checkReportEditPermission = (createdAt) => {
    if (!createdAt) return false;
    const hoursDiff = (new Date() - new Date(createdAt)) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };
// ========== State للقوائم المنسدلة في التقارير ==========
const [activeReportDropdown, setActiveReportDropdown] = useState(null);
const [reportPopupPosition, setReportPopupPosition] = useState({ top: 0, left: 0 });

// ========== دالة toggle للقائمة المنسدلة للتقارير ==========
const toggleReportDropdown = (reportId, event) => {
  event.stopPropagation();
  
  if (activeReportDropdown === reportId) {
    setActiveReportDropdown(null);
  } else {
    const rect = event.currentTarget.getBoundingClientRect();
    setReportPopupPosition({
      top: rect.bottom + window.scrollY + 5,
      left: rect.left + window.scrollX - 70,
    });
    setActiveReportDropdown(reportId);
  }
};

// ========== إغلاق القائمة المنسدلة للتقارير عند الضغط خارجها ==========
useEffect(() => {
  const handleClickOutside = (event) => {
    if (activeReportDropdown) {
      setActiveReportDropdown(null);
    }
  };

  document.addEventListener('click', handleClickOutside);
  
  return () => {
    document.removeEventListener('click', handleClickOutside);
  };
}, [activeReportDropdown]);


// ========== جلب مشاريع المهندس الحالي ==========
const fetchMyProjects = useCallback(async () => {
  try {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    const response = await fetch('http://localhost:3000/owner-reports/reports', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (response.ok) {
      const allProjects = Array.isArray(data) ? data : data.reports || [];
      const myProjects = allProjects.filter(project => project.engineer_name === username);
      console.log('✅ المشاريع المحملة:', myProjects);
      setProjects(myProjects);
      return myProjects; // ✅ نرجع المشاريع للاستخدام المباشر
    }
    return []; // نرجع مصفوفة فارغة إذا فشل
  } catch (error) {
    console.error('خطأ في جلب المشاريع:', error);
    return []; // نرجع مصفوفة فارغة في حالة الخطأ
  } finally {
    setIsLoading(false);
  }
}, []);
 
   // ========== جلب كل التقارير المرسلة للمهندس الحالي ==========
const fetchMyReports = useCallback(async () => {
  try {
    setIsLoadingReports(true);
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    const response = await fetch(`http://localhost:3000/daily-reports/engineer/${username}/reports`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('فشل في جلب التقارير');
    }

    const data = await response.json();
    const reports = data.reports || [];

    const sortedReports = reports.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    // ✅ نحتاج للتأكد أن المشاريع محملة أولاً
    let currentProjects = projects;
    if (currentProjects.length === 0) {
      console.log('🔄 جلب المشاريع أولاً...');
      // ✅ الأهم: نستخدم القيمة المرجعة من fetchMyProjects
      const fetchedProjects = await fetchMyProjects();
      currentProjects = fetchedProjects || []; // نستخدم المشاريع التي تم جلبها
    }

    console.log('📊 المشاريع المتاحة:', currentProjects);
    console.log('📊 التقارير:', sortedReports);

    const reportsWithProject = sortedReports.map(report => {
      // نبحث عن المشروع المرتبط بهذا التقرير
      const project = currentProjects.find(p => p.id === report.project_id);
      
      if (project) {
        console.log(`✅ تم العثور على مشروع للتقرير ${report.id}:`, project.report_number);
        return {
          ...report,
          project: project  // المشروع كامل بكل بياناته
        };
      }
      
      console.log(`❌ لم يتم العثور على مشروع للتقرير ${report.id}, project_id: ${report.project_id}`);
      // إذا لم نجد المشروع، نستخدم البيانات المخزنة في التقرير نفسه
      return {
        ...report,
        project: {
          report_number: report.report_number || report.project_report_number || 'غير متوفر',
          owner_name: report.owner_name || 'غير متوفر',
          location: report.location || 'غير متوفر',
          company_name: report.company_name || 'غير متوفر',
          engineer_name: report.engineer_name || username,
          workers_count: report.workers_count || 0,
          status: report.status || 'مرسل'
        }
      };
    });

    console.log('✅ التقارير بعد الربط:', reportsWithProject);
    setMyReports(reportsWithProject);

  } catch (error) {
    console.error('خطأ في جلب التقارير:', error);
  } finally {
    setIsLoadingReports(false);
  }
}, [projects, fetchMyProjects]);

  // ========== جلب تفاصيل تقرير معين ==========
  const fetchReportDetails = async (reportId) => {
    try {
      setIsLoadingReports(true);
      const token = localStorage.getItem('token');

      const [workItemsRes, plansRes, materialsRes, imagesRes, signaturesRes] = await Promise.all([
        fetch(`http://localhost:3000/work-items/${reportId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3000/next-day-plans/${reportId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3000/materials/${reportId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3000/site-images/${reportId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3000/signatures/${reportId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const workItemsData = await workItemsRes.json();
      const plansData = await plansRes.json();
      const materialsData = await materialsRes.json();
      const imagesData = await imagesRes.json();
      const signaturesData = await signaturesRes.json();

      setReportDetails({
        workItems: Array.isArray(workItemsData) ? workItemsData : workItemsData.work_items || [],
        nextDayPlans: Array.isArray(plansData) ? plansData : plansData.next_day_plans || [],
        materials: Array.isArray(materialsData) ? materialsData : materialsData.materials || [],
        siteImages: Array.isArray(imagesData) ? imagesData : imagesData.images || [],
        signatures: Array.isArray(signaturesData) ? signaturesData : signaturesData.signatures || []
      });

      setActivePage('reportDetails');
    } catch (error) {
      console.error('خطأ في جلب تفاصيل التقرير:', error);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // ========== عرض تفاصيل المشروع (لتقرير جديد) ==========
      const handleViewProject = (project) => {
      console.log('إنشاء تقرير جديد للمشروع:', project);
      navigate(`/project-report/${project.id}`, {
       state: {
      isNewReport: true,  // هذا هو المهم
      projectData: project,
      viewMode: 'new'      // viewMode = 'new'
    }
  });
};

  // ========== عرض تفاصيل المشروع فقط (بدون تقرير جديد) ==========
// ========== عرض آخر تقرير للمشروع ==========
const handleViewProjectDetails = (project) => {
  // البحث عن آخر تقرير لهذا المشروع
  const projectReports = myReports.filter(r => r.project_id === project.id);
  
  if (projectReports.length > 0) {
    // ترتيب التقارير حسب التاريخ (الأحدث أولاً)
    const sortedReports = projectReports.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    const latestReport = sortedReports[0];
    
    console.log('📋 عرض آخر تقرير للمشروع:', latestReport);
    
    // الانتقال إلى صفحة التقرير مع viewOnly = true
    navigate(`/project-report/${project.id}`, {
      state: {
        reportId: latestReport.id,
        reportData: latestReport,
        projectData: project,
        viewOnly: true,
        fromProjectsList: true
      }
    });
  } else {
    // إذا لم يكن هناك تقارير، نعرض المشروع فقط (بدون بيانات تقرير)
    console.log('📋 لا توجد تقارير لهذا المشروع، عرض المشروع فقط');
    navigate(`/project-report/${project.id}`, {
      state: {
        projectData: project,
        viewOnly: true,
        noReports: true
      }
    });
  }
};


// ========== عرض تقرير سابق (للقراءة فقط) ==========

const handleViewReport = (report) => {
  console.log('عرض التقرير:', report);
  
  // الانتقال إلى صفحة ProjectReport مع viewOnly = true دائماً
  navigate(`/project-report/${report.project_id}`, {
    state: {
      reportId: report.id,
      reportData: report,
      projectData: report.project,
      viewOnly: true,  // 👈 دائماً true للعرض فقط
      fromReportsList: true
    }
  });
};

// ========== تعديل تقرير (ينتقل إلى صفحة التقرير مع صلاحية التعديل) ==========
const handleEditReport = (report) => {
  console.log('تعديل التقرير:', report);
  
  navigate(`/project-report/${report.project_id}`, {
    state: {
      reportId: report.id,
      reportData: report,
      projectData: report.project,
      viewOnly: false,  // 👈 هذا هو المهم - يسمح بالتعديل
      fromReportsList: true
    }
  });
};

  // ========== التهيئة ==========
  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('userRole');
if (!token || role !== 'sub_admin') {
    window.location.href = '/';
  } else {
    setUser({ username, role });

    fetchMyProjects().then(() => {
      fetchMyReports();
    });
    
    // ✅ التحقق من وجود page parameter في الرابط
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    if (page === 'myReports') {
      setActivePage('myReports');
    }
  }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  // ========== إحصائيات ==========
  const getStats = () => {
    const totalProjects = projects.length;
    const totalWorkers = projects.reduce((sum, p) => sum + (parseInt(p.workers_count) || 0), 0);
    const totalReports = myReports.length;

    return { totalProjects, totalWorkers, totalReports };
  };

  const stats = getStats();

  // ========== Menu Items ==========
  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم' },
    { id: 'myProjects', label: 'مشاريعي' },
    { id: 'myReports', label: 'تقاريري' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row-reverse',
      minHeight: '100vh',
      background: '#f5f7fa',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>

      {/* ========== SIDEBAR ========== */}
      <div style={{
        width: '280px',
        background: '#ffffff',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        right: 0,
        top: 0,
        zIndex: 50,
        overflowY: 'auto',
        borderLeft: '1px solid rgba(0,0,0,0.02)'
      }}>

        {/* ========== اللوقو ========== */}
        <div style={{
          padding: '32px 20px',
          borderBottom: '1px solid #edf2f7',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <img
            src="/logo/WAJAlogo.png"
            alt="WAJA Logo"
            style={{
              width: '140px',
              height: '70px',
              objectFit: 'contain',
              borderRadius: '12px'
            }}
          />
        </div>

     
    
       {/* معلومات المستخدم */}
{/* معلومات المستخدم */}
<div style={{
  padding: '24px 20px',
  borderBottom: '1px solid #edf2f7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexDirection: 'row'
}}>
  {/* المربع على اليسار */}
  <div style={{
    width: '40px',
    height: '40px',
    background: '#f1f5f9',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#2d3e50',
    fontWeight: '600',
    fontSize: '16px',
    order: 1 // يجعله في اليسار (لأن الاتجاه row-reverse)
  }}>
    {user?.username?.charAt(0).toUpperCase() || 'E'}
  </div>
  
  {/* النص على اليمين */}
  <div style={{ 
    overflow: 'hidden', 
    textAlign: 'right',
    order: 2
  }}>
    <div style={{ fontWeight: '600', color: '#1a2634' }}>{user?.username}</div>
    <div style={{ fontSize: '12px', color: '#64748b' }}>مهندس</div>
  </div>
</div>
        {/* قائمة المنيو */}
        <div style={{ flex: 1, padding: '24px 0' }}>
          {menuItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActivePage(item.id)}
              style={{
                padding: '12px 20px',
                margin: '4px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                cursor: 'pointer',
                backgroundColor: activePage === item.id ? '#f1f5f9' : 'transparent',
                color: activePage === item.id ? '#2d3e50' : '#475569',
                borderRight: activePage === item.id ? '3px solid #2d3e50' : 'none',
                transition: 'all 0.2s ease',
                textAlign: 'right'
              }}
              onMouseEnter={(e) => {
                if (activePage !== item.id) {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (activePage !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: activePage === item.id ? '600' : '400' }}>{item.label}</span>
              {item.id === 'myReports' && myReports.length > 0 && (
                <span style={{
                  background: '#2d3e50',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {myReports.length}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* زر تسجيل الخروج */}
        <div style={{ padding: '24px 20px', borderTop: '1px solid #edf2f7' }}>
          <div
    onClick={handleLogout}
    style={{
      padding: '12px 20px',
      margin: '0 16px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center', 
      gap: '12px',
      cursor: 'pointer',
      color: '#e53e3e',
      transition: 'all 0.2s ease',
      textAlign: 'center' 
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
  >
    <span style={{ fontSize: '14px', fontWeight: '500' }}>تسجيل الخروج</span>
  </div>
        </div>
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div style={{
        flex: 1,
        marginRight: '280px',
        padding: '32px',
        transition: 'margin-right 0.3s ease',
        background: '#f5f7fa',
        minHeight: '100vh'
      }}>


        {/* ========== HEADER ========== */}
        <div style={{
          background: '#ffffff',
          padding: '24px 32px',
          borderRadius: '16px',
          marginBottom: '32px',
          border: '1px solid rgba(0,0,0,0.02)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexDirection: 'row'
        }}>
          {/* التاريخ في جهة اليسار (بدلاً من اليمين) */}
          <div style={{
            background: '#f8fafc',
            padding: '8px 16px',
            borderRadius: '30px',
            color: '#475569',
            fontSize: '14px',
            border: '1px solid #e2e8f0'
          }}>
            {new Date().toLocaleDateString('en-US')}
          </div>

          {/* العنوان والنص في جهة اليمين (بدلاً من اليسار) */}
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ fontSize: '24px', color: '#1a2634', marginBottom: '8px', fontWeight: '600' }}>
              {activePage === 'dashboard' && 'لوحة التحكم'}
              {activePage === 'myProjects' && 'مشاريعي'}
              {activePage === 'myReports' && 'تقاريري المرسلة'}
              {activePage === 'reportDetails' && 'تفاصيل التقرير'}
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              {activePage === 'dashboard' && 'مرحباً بك في لوحة تحكم المهندس'}
              {activePage === 'myProjects' && `عرض جميع المشاريع المسندة إليك (${projects.length})`}
              {activePage === 'myReports' && `جميع التقارير التي أرسلتها (${myReports.length})`}
              {activePage === 'reportDetails' && selectedReport && `تقرير ${new Date(selectedReport.created_at).toLocaleDateString('en-US')}`}
            </p>
          </div>
        </div>
        {/* ========== CONTENT ========== */}

        {/* 1️⃣ لوحة التحكم - Dashboard */}
        {activePage === 'dashboard' && (
          <div>
            {/* بطاقات الإحصائيات */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>

              <div style={{
                background: '#ffffff',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid rgba(0,0,0,0.02)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}>
                <div style={{ marginBottom: '16px', textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>إجمالي المشاريع المسندة</span>
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: '600', color: '#1a2634', margin: 0, textAlign: 'right' }}>{stats.totalProjects}</h3>
              </div>

              <div style={{
                background: '#ffffff',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid rgba(0,0,0,0.02)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}>
                <div style={{ marginBottom: '16px', textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>إجمالي عدد العمال</span>
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: '600', color: '#1a2634', margin: 0, textAlign: 'right' }}>{stats.totalWorkers}</h3>
              </div>

              <div style={{
                background: '#ffffff',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid rgba(0,0,0,0.02)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}>
                <div style={{ marginBottom: '16px', textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>إجمالي التقارير المرسلة</span>
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: '600', color: '#059669', margin: 0, textAlign: 'right' }}>{stats.totalReports}</h3>
              </div>
            </div>

            {/* آخر المشاريع */}
            <div style={{
              background: '#ffffff',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid rgba(0,0,0,0.02)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{
                  background: '#f1f5f9',
                  color: '#2d3e50',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {projects.length}
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', margin: 0, textAlign: 'right' }}>آخر المشاريع المسندة إليك</h3>
              </div>

              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px' }}>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>جاري التحميل...</p>
                </div>
              ) : projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px' }}>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>لا توجد مشاريع مسندة إليك</p>
                </div>
              ) : (
                <div>
                  {projects.slice(0, 5).map((project, index) => (
                    <div
                      key={project.id}
                      onClick={() => handleViewProjectDetails(project)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        borderBottom: index < 4 ? '1px solid #f1f5f9' : 'none',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          background: project.status === 'completed' ? '#f0f9ff' : '#fefce8',
                          color: project.status === 'completed' ? '#0369a1' : '#854d0e',
                          padding: '6px 14px',
                          borderRadius: '30px',
                          fontSize: '12px',
                          fontWeight: '600',
                          border: project.status === 'completed' ? '1px solid #bae6fd' : '1px solid #fef9c3'
                        }}>
                          {project.status === 'completed' ? 'مكتمل' : 'مرسل'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>عرض التفاصيل ←</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '600', color: '#1a2634', fontSize: '14px', marginBottom: '4px' }}>{project.report_number}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{project.owner_name} - {project.company_name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>الموقع: {project.location}</div>
                      </div>
                    </div>
                  ))}
                  {projects.length > 5 && (
                    <button
                      onClick={() => setActivePage('myProjects')}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'none',
                        border: '1px solid #e2e8f0',
                        borderRadius: '30px',
                        marginTop: '20px',
                        cursor: 'pointer',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.target.style.background = 'none'}
                    >
                      عرض جميع المشاريع ({projects.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* آخر التقارير المرسلة */}
            <div style={{
              background: '#ffffff',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid rgba(0,0,0,0.02)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{
                  background: '#059669',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {myReports.length}
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', margin: 0, textAlign: 'right' }}>آخر التقارير المرسلة</h3>
              </div>

              {isLoadingReports ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px' }}>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>جاري تحميل التقارير...</p>
                </div>
              ) : myReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px' }}>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>لا توجد تقارير مرسلة بعد</p>
                </div>
              ) : (
                <div>
                  {myReports.slice(0, 5).map((report, index) => {
                    const canEdit = checkReportEditPermission(report.created_at);

                    return (
          <div
  key={report.id}
  onClick={() => handleViewReport(report)}  // استخدام الدالة المعدلة
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: index < 4 ? '1px solid #f1f5f9' : 'none',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.2s ease'
  }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
>
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <span style={{
      background: canEdit ? '#059669' : '#9ca3af',
      color: 'white',
      padding: '4px 12px',
      borderRadius: '30px',
      fontSize: '11px',
      fontWeight: '600'
    }}>
      {canEdit ? 'نشط' : 'منتهي'}
    </span>
    <span style={{ fontSize: '12px', color: '#94a3b8' }}>عرض التقرير ←</span>
  </div>
  <div style={{ textAlign: 'right' }}>
    <div style={{ fontWeight: '600', color: '#1a2634', fontSize: '14px', marginBottom: '4px' }}>
      {report.project?.report_number || report.project_report_number || 'تقرير يومي'} - {report.project?.owner_name || report.owner_name || ''}
    </div>
    <div style={{ fontSize: '12px', color: '#64748b' }}>
      تاريخ التقرير: {new Date(report.created_at).toLocaleDateString('en-US')}
    </div>
    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
      الموقع: {report.project?.location || report.location || '-'}
    </div>
  </div>
</div>
                    );
                  })}
                  {myReports.length > 5 && (
                    <button
                      onClick={() => setActivePage('myReports')}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'none',
                        border: '1px solid #e2e8f0',
                        borderRadius: '30px',
                        marginTop: '20px',
                        cursor: 'pointer',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.target.style.background = 'none'}
                    >
                      عرض جميع التقارير ({myReports.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2️⃣ جميع مشاريعي */}
        {activePage === 'myProjects' && (
          <div style={{
            background: '#ffffff',
            padding: '32px',
            borderRadius: '16px',
            border: '1px solid rgba(0,0,0,0.02)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{
                background: '#f1f5f9',
                color: '#2d3e50',
                padding: '6px 16px',
                borderRadius: '30px',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                {projects.length} مشروع
              </span>
              <h2 style={{ fontSize: '18px', color: '#1a2634', fontWeight: '600', margin: 0, textAlign: 'right' }}>جميع المشاريع المسندة إليك</h2>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px' }}>
                <p style={{ color: '#64748b', fontSize: '15px' }}>جاري التحميل...</p>
              </div>
            ) : projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px' }}>
                <p style={{ color: '#64748b', fontSize: '15px' }}>لا توجد مشاريع مسندة إليك</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>الإجراءات</th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>عدد التقارير</th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>العمال</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>التاريخ</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>الموقع</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>الشركة</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>المالك</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>رقم المشروع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => {
                      const projectReportsCount = myReports.filter(r => r.project_id === project.id).length;

                      return (
                        <tr key={project.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleViewProject(project)}
                              style={{
                                padding: '6px 20px',
                                background: '#2d3e50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '30px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                              onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
                            >
                              تقرير جديد
                            </button>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <span style={{
                              background: '#2d3e50',
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '12px'
                            }}>
                              {projectReportsCount}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center', color: '#475569' }}>{project.workers_count}</td>
                          <td style={{ padding: '16px', textAlign: 'right', color: '#64748b' }}>{new Date(project.report_date).toLocaleDateString('en-US')}</td>
                          <td style={{ padding: '16px', textAlign: 'right', color: '#475569' }}>{project.location}</td>
                          <td style={{ padding: '16px', textAlign: 'right', color: '#475569' }}>{project.company_name}</td>
                          <td style={{ padding: '16px', textAlign: 'right', color: '#475569' }}>{project.owner_name}</td>
                          <td style={{ padding: '16px', fontWeight: '600', color: '#1a2634', textAlign: 'right' }}>{project.report_number}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

{/* 3️⃣ تقاريري المرسلة */}
{activePage === 'myReports' && (
  <div style={{
    background: '#ffffff',
    padding: '32px',
    borderRadius: '24px',
    border: '1px solid rgba(0,0,0,0.02)',
    boxShadow: '0 8px 20px rgba(0,0,0,0.02)'
  }}>
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '28px',
      borderBottom: '2px solid #f1f5f9',
      paddingBottom: '16px'
    }}>
      <span style={{
        background: 'linear-gradient(135deg, #2d3e50 0%, #1a2634 100%)',
        color: 'white',
        padding: '8px 20px',
        borderRadius: '40px',
        fontSize: '14px',
        fontWeight: '600',
        boxShadow: '0 4px 8px rgba(45, 62, 80, 0.15)'
      }}>
        {myReports.length} تقرير
      </span>
      <h2 style={{ 
        fontSize: '20px', 
        color: '#1a2634', 
        fontWeight: '600', 
        margin: 0, 
        textAlign: 'right' 
      }}>
        جميع التقارير المرسلة
      </h2>
    </div>

    {isLoadingReports ? (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px' }}>
        <p style={{ color: '#64748b', fontSize: '15px' }}>جاري تحميل التقارير...</p>
      </div>
    ) : myReports.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px' }}>
        <p style={{ color: '#64748b', fontSize: '15px' }}>لا توجد تقارير مرسلة بعد</p>
      </div>
    ) : (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'separate', 
          borderSpacing: '0 8px',
          fontSize: '14px' 
        }}>
          <thead>
            <tr style={{ 
              background: '#f8fafc', 
              borderRadius: '12px'
            }}>
              <th style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: '#475569', 
                fontWeight: '600',
                fontSize: '13px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                الإجراءات
              </th>
              <th style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: '#475569', 
                fontWeight: '600',
                fontSize: '13px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                الحالة
              </th>
              <th style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: '#475569', 
                fontWeight: '600',
                fontSize: '13px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                تاريخ الإرسال
              </th>
              <th style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: '#475569', 
                fontWeight: '600',
                fontSize: '13px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                تاريخ التقرير
              </th>
              <th style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: '#475569', 
                fontWeight: '600',
                fontSize: '13px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                الموقع
              </th>
              <th style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: '#475569', 
                fontWeight: '600',
                fontSize: '13px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                المالك
              </th>
              <th style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: '#475569', 
                fontWeight: '600',
                fontSize: '13px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                رقم المشروع
              </th>
              <th style={{ 
                padding: '16px', 
                textAlign: 'center', 
                color: '#475569', 
                fontWeight: '600',
                fontSize: '13px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                #
              </th>
            </tr>
          </thead>
          <tbody>
            {myReports.map((report, index) => {
              const canEdit = checkReportEditPermission(report.created_at);

              return (
                <tr 
                  key={report.id} 
                  style={{ 
                    background: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                >
                <td style={{ padding: '16px', textAlign: 'center' }}>
  <div>
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleReportDropdown(report.id, e);
      }}
      style={{
        padding: '6px 16px',
        background: 'transparent',
        color: '#2d3e50',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.target.style.background = '#f8fafc';
        e.target.style.borderColor = '#2d3e50';
      }}
      onMouseLeave={(e) => {
        e.target.style.background = 'transparent';
        e.target.style.borderColor = '#e2e8f0';
      }}
    >
      الإجراءات
      <span style={{ 
        fontSize: '11px',
        transition: 'transform 0.2s ease',
        display: 'inline-block'
      }}>
        ▼
      </span>
    </button>
  </div>
</td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{
                      background: canEdit ? '#10b981' : '#94a3b8',
                      color: 'white',
                      padding: '6px 14px',
                      borderRadius: '30px',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'inline-block',
                      boxShadow: canEdit ? '0 2px 4px rgba(16, 185, 129, 0.2)' : 'none'
                    }}>
                      {canEdit ? 'نشط' : 'منتهي'}
                    </span>
                  </td>
                  <td style={{ 
                    padding: '16px', 
                    color: '#475569', 
                    textAlign: 'center',
                    fontSize: '13px'
                  }}>
                    {report.submitted_at ? new Date(report.submitted_at).toLocaleDateString('en-US') : '-'}
                  </td>
                  <td style={{ 
                    padding: '16px', 
                    color: '#475569', 
                    textAlign: 'center',
                    fontSize: '13px'
                  }}>
                    {new Date(report.created_at).toLocaleDateString('en-US')}
                  </td>
                  <td style={{ 
                    padding: '16px', 
                    color: '#1e293b', 
                    textAlign: 'center',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    {report.project?.location || report.location || '-'}
                  </td>
                  <td style={{ 
                    padding: '16px', 
                    color: '#1e293b', 
                    textAlign: 'center',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    {report.project?.owner_name || report.owner_name || '-'}
                  </td>
                  <td style={{ 
                    padding: '16px', 
                    color: '#2d3e50', 
                    fontWeight: '700', 
                    textAlign: 'center',
                    fontSize: '13px'
                  }}>
                    {(() => {
                      const rawNumber = report.project?.report_number || report.report_number || '';
                      const cleaned = rawNumber.replace(/-\d{8}$/, '').trim();
                      return cleaned || 'غير متوفر';
                    })()}
                  </td>
                  <td style={{ 
                    padding: '16px', 
                    fontWeight: '600', 
                    color: '#94a3b8', 
                    textAlign: 'center',
                    fontSize: '13px'
                  }}>
                    {index + 1}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}

  {/* 4️⃣ تفاصيل التقرير - عرض معلومات المشروع + محتوى التقرير */}
{activePage === 'reportDetails' && selectedReport && (
  <div 
    style={{
      background: '#ffffff',
      padding: '32px',
      borderRadius: '16px',
      border: '1px solid rgba(0,0,0,0.02)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
    }}
  >
    {/* زر العودة */}
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '24px' }}>
      <button
        onClick={() => setActivePage('myReports')}
        style={{
          padding: '10px 20px',
          background: '#2d3e50',
          color: 'white',
          border: 'none',
          borderRadius: '30px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => e.target.style.background = '#1a2634'}
        onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
      >
        ← العودة للتقارير
      </button>
    </div>

    {/* معلومات المشروع - بدون قيم افتراضية ثابتة */}
    <div style={{
      background: '#f8fafc',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '32px',
      border: '1px solid #e2e8f0'
    }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: '600',
        color: '#1a2634',
        margin: '0 0 16px 0',
        paddingBottom: '12px',
        borderBottom: '2px solid #2d3e50',
        textAlign: 'right'
      }}>
        معلومات المشروع
      </h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px'
      }}>
        {/* رقم المشروع */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>رقم المشروع</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#2d3e50' }}>
            {selectedReport.project?.report_number
              ? selectedReport.project.report_number.split('-').slice(0, 2).join('-')
              : selectedReport.report_number
                ? selectedReport.report_number.split('-').slice(0, 2).join('-')
                : 'غير متوفر'}
          </div>
        </div>

        {/* المالك */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>المالك</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a2634' }}>
            {selectedReport.project?.owner_name || 'غير متوفر'}
          </div>
        </div>

        {/* الشركة */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>الشركة</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a2634' }}>
            {selectedReport.project?.company_name || 'غير متوفر'}
          </div>
        </div>

        {/* الموقع */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>الموقع</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a2634' }}>
            {selectedReport.project?.location || selectedReport.location || 'غير متوفر'}
          </div>
        </div>

        {/* المهندس */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>المهندس</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a2634' }}>
            {selectedReport.project?.engineer_name || user?.username || 'غير متوفر'}
          </div>
        </div>

        {/* تاريخ المشروع */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>تاريخ المشروع</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a2634' }}>
            {selectedReport.project?.report_date 
              ? new Date(selectedReport.project.report_date).toLocaleDateString('en-US') 
              : 'غير متوفر'}
          </div>
        </div>

        {/* عدد العمال */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>عدد العمال</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a2634' }}>
            {selectedReport.project?.workers_count || 'غير متوفر'}
          </div>
        </div>
        
        {/* حالة المشروع */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>حالة المشروع</div>
          <span style={{
            background: selectedReport.project?.status === 'completed' ? '#f0f9ff' : '#fefce8',
            color: selectedReport.project?.status === 'completed' ? '#0369a1' : '#854d0e',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            display: 'inline-block',
            border: selectedReport.project?.status === 'completed' ? '1px solid #bae6fd' : '1px solid #fef9c3'
          }}>
            {selectedReport.project?.status === 'completed' ? 'مكتمل' : (selectedReport.project?.status || 'مرسل')}
          </span>
        </div>
      </div>
    </div>

    {isLoadingReports ? (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#64748b' }}>جاري تحميل تفاصيل التقرير...</p>
      </div>
    ) : (
      <>
        {/* الأعمال الجارية */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexDirection: 'row-reverse'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              margin: 0,
              textAlign: 'right',
              flex: 1,
              borderBottom: '2px solid #2d3e50',
              paddingBottom: '10px'
            }}>
              الأعمال الجارية
            </h3>
            {/* الأزرار تظهر فقط إذا لم تكن في وضع viewOnly وكان canEdit = true */}
            {!viewOnly && checkReportEditPermission(selectedReport.created_at) && (
              <div style={{ display: 'flex', gap: '10px' }}>
              
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', direction: 'rtl' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'right' }}>#</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>البند</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>منطقة العمل</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>عدد العمال</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>الكمية</th>
                </tr>
              </thead>
              <tbody>
                {reportDetails.workItems.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      لا توجد أعمال جارية
                    </td>
                  </tr>
                ) : (
                  reportDetails.workItems.map((item, index) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>{index + 1}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#1a2634', fontWeight: '500' }}>{item.item_name}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#475569' }}>{item.work_area}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{item.workers_count}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{item.quantity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* خطة اليوم التالي */}
       {/* خطة اليوم التالي */}
<div style={{ marginBottom: '40px' }}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    flexDirection: 'row-reverse'
  }}>
    <h3 style={{
      fontSize: '18px',
      fontWeight: '600',
      margin: 0,
      textAlign: 'right',
      flex: 1,
      borderBottom: '2px solid #2d3e50',
      paddingBottom: '10px'
    }}>
      خطة اليوم التالي
    </h3>
    {/* الأزرار تظهر فقط إذا لم تكن في وضع viewOnly وكان canEdit = true */}
    {!viewOnly && checkReportEditPermission(selectedReport.created_at) && (
      <div style={{ display: 'flex', gap: '10px' }}>
    
      </div>
    )}
  </div>

  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', direction: 'rtl' }}>
      <thead>
        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
          <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '10%' }}>#</th>
          <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '80%' }}>الخطة</th>
          {!viewOnly && checkReportEditPermission(selectedReport.created_at) && (
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '10%' }}>الإجراءات</th>
          )}
        </tr>
      </thead>
      <tbody>
        {reportDetails.nextDayPlans.length === 0 ? (
          <tr>
            <td colSpan={!viewOnly && checkReportEditPermission(selectedReport.created_at) ? "3" : "2"} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              لا توجد خطط مضافة
            </td>
          </tr>
        ) : (
          reportDetails.nextDayPlans.map((plan, index) => (
            <tr key={plan.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px', textAlign: 'center', color: '#64748b', verticalAlign: 'middle' }}>
                {index + 1}
              </td>
              <td style={{ padding: '12px', textAlign: 'right', color: '#1a2634', verticalAlign: 'middle' }}>
                {plan.description}
              </td>
              {!viewOnly && checkReportEditPermission(selectedReport.created_at) && (
                <td style={{ padding: '12px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                   
                  </div>
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</div>
        {/* المواد */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexDirection: 'row-reverse'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              margin: 0,
              textAlign: 'right',
              flex: 1,
              borderBottom: '2px solid #2d3e50',
              paddingBottom: '10px'
            }}>
              المواد
            </h3>
            {/* الأزرار تظهر فقط إذا لم تكن في وضع viewOnly وكان canEdit = true */}
            {!viewOnly && checkReportEditPermission(selectedReport.created_at) && (
              <div style={{ display: 'flex', gap: '10px' }}>
            
              </div>
            )}
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>اسم الخامة</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>النوع</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>الكمية</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>مكان التخزين</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>المورد</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>رقم المورد</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>مكان التوريد</th>
                </tr>
              </thead>
              <tbody>
                {reportDetails.materials.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      لا توجد مواد مضافة
                    </td>
                  </tr>
                ) : (
                  reportDetails.materials.map(material => (
                    <tr key={material.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#1a2634' }}>{material.material_name}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.material_type || '-'}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.quantity}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.storage_location || '-'}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.supplier_name || '-'}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.supplier_contact || '-'}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.supply_location || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* صور الموقع */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexDirection: 'row-reverse'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              margin: 0,
              textAlign: 'right',
              flex: 1,
              borderBottom: '2px solid #2d3e50',
              paddingBottom: '10px'
            }}>
              صور الموقع
            </h3>
            {/* أزرار إضافة وتعديل تظهر فقط إذا لم تكن في وضع viewOnly وكان canEdit = true */}
            {!viewOnly && checkReportEditPermission(selectedReport.created_at) && (
              <div style={{ display: 'flex', gap: '10px' }}>
            
              </div>
            )}
          </div>
          
          {reportDetails.siteImages.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
              لا توجد صور مضافة
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
              {reportDetails.siteImages.map(image => (
                <div key={image.id} style={{
                  background: '#f8fafc',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid #edf2f7',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  <img
                    src={`http://localhost:3000/${image.image_path}`}
                    alt="Site"
                    style={{
                      width: '100%',
                      height: '140px',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease'
                    }}
                    onClick={() => window.open(`http://localhost:3000/${image.image_path}`, '_blank')}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  />
                  <div style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(image.uploaded_at).toLocaleDateString('en-US')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* التوقيع */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexDirection: 'row-reverse'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              margin: 0,
              textAlign: 'right',
              flex: 1,
              borderBottom: '2px solid #2d3e50',
              paddingBottom: '10px'
            }}>
              التوقيع
            </h3>
            {/* أزرار إضافة وتعديل تظهر فقط إذا لم تكن في وضع viewOnly وكان canEdit = true */}
            {!viewOnly && checkReportEditPermission(selectedReport.created_at) && (
              <div style={{ display: 'flex', gap: '10px' }}>
             
              </div>
            )}
          </div>
          
          {reportDetails.signatures.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
              لا يوجد توقيع
            </div>
          ) : (
            reportDetails.signatures.map(signature => (
              <div key={signature.id} style={{
                padding: '20px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #edf2f7',
                textAlign: 'center',
                maxWidth: '400px',
                margin: '0 auto'
              }}>
                <div style={{ fontWeight: '600', color: '#1a2634', fontSize: '16px', marginBottom: '8px' }}>{signature.signed_by}</div>
                <div style={{ color: '#475569', fontSize: '15px', marginBottom: '12px', fontStyle: 'italic' }}>"{signature.signature_data}"</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', borderTop: '1px dashed #d1d5db', paddingTop: '10px' }}>
                  تاريخ التوقيع: {new Date(signature.signed_at).toLocaleDateString('en-US')} - {new Date(signature.signed_at).toLocaleTimeString('en-US')}
                </div>
              </div>
            ))
          )}
        </div>
      </>
    )}
  </div>
)}
      {/* ========== Popup الإجراءات للتقارير ========== */}
      {activeReportDropdown && (
        <>
          {/* Overlay شفاف لإغلاق الـ Popup */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
            }}
            onClick={() => setActiveReportDropdown(null)}
          />
          
          {/* نافذة الـ Popup نفسها */}
          <div
            style={{
              position: 'fixed',
              top: reportPopupPosition.top,
              left: reportPopupPosition.left,
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              zIndex: 9999,
              minWidth: '250px',
              border: '1px solid #edf2f7',
              overflow: 'hidden'
            }}
          >
            {/* عنوان الـ Popup */}
            <div style={{
              padding: '16px 20px',
              background: '#f8fafc',
              borderBottom: '1px solid #edf2f7',
              textAlign: 'center',
              fontWeight: '600',
              color: '#1a2634',
              fontSize: '16px'
            }}>
              الإجراءات المتاحة
            </div>
            
            {/* عرض التقرير */}
            <div
              onClick={() => {
                const report = myReports.find(r => r.id === activeReportDropdown);
                if (report) {
                  setSelectedReport(report);
                  fetchReportDetails(report.id);
                }
                setActiveReportDropdown(null);
              }}
              style={{
                padding: '14px 20px',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                color: '#2d3e50',
                fontSize: '14px',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              عرض التقرير
            </div>
            
            {/* تعديل - يظهر فقط إذا كان التقرير نشط (أقل من 24 ساعة) */}
            {myReports.find(r => r.id === activeReportDropdown) && 
             checkReportEditPermission(myReports.find(r => r.id === activeReportDropdown)?.created_at) && (
              <div
                onClick={() => {
                  const report = myReports.find(r => r.id === activeReportDropdown);
                  if (report) {
                    navigate(`/project-report/${report.project_id}`, {
                      state: {
                        reportId: report.id,
                        isEdit: true,
                        reportData: report,
                        projectData: report.project
                      }
                    });
                  }
                  setActiveReportDropdown(null);
                }}
                style={{
                  padding: '14px 20px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  color: '#f59e0b',
                  fontSize: '14px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fef3c7'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                تعديل
              </div>
            )}
            
            {/* زر إغلاق في الأسفل */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #edf2f7',
              textAlign: 'center',
              background: '#f8fafc'
            }}>
              <button
                onClick={() => setActiveReportDropdown(null)}
                style={{
                  padding: '6px 20px',
                  background: 'transparent',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f1f5f9';
                  e.target.style.borderColor = '#94a3b8';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.borderColor = '#e2e8f0';
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </>
      )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
          box-sizing: border-box;
        }
        body { 
          margin: 0; 
          padding: 0; 
          background: #f5f7fa;
        }
        ::-webkit-scrollbar { 
          width: 6px; 
          height: 6px; 
        }
        ::-webkit-scrollbar-track { 
          background: #f1f5f9; 
        }
        ::-webkit-scrollbar-thumb { 
          background: #cbd5e1; 
          borderRadius: 3px; 
        }
        ::-webkit-scrollbar-thumb:hover { 
          background: #94a3b8; 
        }
        input:focus, select:focus, button:focus {
          outline: none;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 12px;
        }
      `}</style>
    </div>
  );
};

export default SubAdminDashboard;