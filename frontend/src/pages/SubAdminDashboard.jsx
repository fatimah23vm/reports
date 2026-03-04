

// src/pages/SubAdminDashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';

const SubAdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetails, setReportDetails] = useState({
    workItems: [],
    nextDayPlans: [],
    materials: [],
    siteImages: [],
    signatures: []
  });
  const [viewOnly, setViewOnly] = useState(false);

  // ========== State للجوال ==========
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // ========== دالة مساعدة للتحقق من صلاحية التعديل ==========
  const checkReportEditPermission = (createdAt) => {
    if (!createdAt) return false;
    const hoursDiff = (new Date() - new Date(createdAt)) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  // ========== State للقوائم المنسدلة في التقارير ==========
  const [activeReportDropdown, setActiveReportDropdown] = useState(null);
  const [reportPopupPosition, setReportPopupPosition] = useState({ top: 0, left: 0 });

  // ========== دالة تحميل التقرير كـ PDF ==========
  const handleDownloadPDF = () => {
    if (!selectedReport) {
      alert('لا يوجد تقرير محدد');
      return;
    }

    console.log('selectedReport:', selectedReport);
    console.log('report_number:', selectedReport.report_number);
    console.log('project:', selectedReport.project);

    try {
      const element = document.querySelector('.report-content');

      if (!element) {
        alert('لم يتم العثور على محتوى التقرير');
        return;
      }

      const reportNumber =
        selectedReport.report_number ||
        selectedReport.project?.report_number ||
        selectedReport.project_report_number ||
        'Report';

      console.log('📝 اسم الملف:', reportNumber);

      element.setAttribute('dir', 'rtl');

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `تقرير_${reportNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: true
        },
        jsPDF: {
          unit: 'in',
          format: 'a4',
          orientation: 'portrait'
        }
      };

      html2pdf().set(opt).from(element).save();

    } catch (error) {
      console.error('خطأ في إنشاء PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    }
  };

  // ========== دالة toggle للقائمة المنسدلة للتقارير ==========
  const toggleReportDropdown = (reportId, event) => {
    event.stopPropagation();

    if (activeReportDropdown === reportId) {
      setActiveReportDropdown(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      const dropdownHeight = 200; // ارتفاع تقريبي للقائمة

      if (isMobile) {
        // للجوال - نمركز المنيو
        if (spaceBelow < dropdownHeight) {
          // يظهر فوق الزر
          setReportPopupPosition({
            top: rect.top + window.scrollY - dropdownHeight - 5,
            left: rect.left + window.scrollX - 70,
          });
        } else {
          // يظهر تحت الزر
          setReportPopupPosition({
            top: rect.bottom + window.scrollY + 5,
            left: rect.left + window.scrollX - 70,
          });
        }
      } else {
        // للديسكتوب - نفس المكان
        setReportPopupPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX - 70,
        });
      }
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
        return myProjects;
      }
      return [];
    } catch (error) {
      console.error('خطأ في جلب المشاريع:', error);
      return [];
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

      let currentProjects = projects;
      if (currentProjects.length === 0) {
        console.log('🔄 جلب المشاريع أولاً...');
        const fetchedProjects = await fetchMyProjects();
        currentProjects = fetchedProjects || [];
      }

      console.log('📊 المشاريع المتاحة:', currentProjects);
      console.log('📊 التقارير:', sortedReports);

      const reportsWithProject = sortedReports.map(report => {
        const project = currentProjects.find(p => p.id === report.project_id);

        if (project) {
          console.log(`✅ تم العثور على مشروع للتقرير ${report.id}:`, project.report_number);
          return {
            ...report,
            project: project
          };
        }

        console.log(`❌ لم يتم العثور على مشروع للتقرير ${report.id}, project_id: ${report.project_id}`);
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
        isNewReport: true,
        projectData: project,
        viewMode: 'new'
      }
    });
  };

  // ========== عرض آخر تقرير للمشروع ==========
  const handleViewProjectDetails = (project) => {
    const projectReports = myReports.filter(r => r.project_id === project.id);

    if (projectReports.length > 0) {
      const sortedReports = projectReports.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );
      const latestReport = sortedReports[0];

      console.log(' عرض آخر تقرير للمشروع:', latestReport);

      navigate(`/project-report/${project.id}`, {
        state: {
          reportId: latestReport.id,
          reportData: latestReport,
          projectData: project,
          viewOnly: false,
          fromProjectsList: true
        }
      });
    } else {
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

    navigate(`/project-report/${report.project_id}`, {
      state: {
        reportId: report.id,
        reportData: report,
        projectData: report.project,
        viewOnly: true,
        fromReportsList: true
      }
    });
  };

  // ========== تعديل تقرير ==========
  const handleEditReport = (report) => {
    console.log('تعديل التقرير:', report);

    navigate(`/project-report/${report.project_id}`, {
      state: {
        reportId: report.id,
        reportData: report,
        projectData: report.project,
        viewOnly: false,
        fromReportsList: true
      }
    });
  };

  // ========== كشف حجم الشاشة ==========
  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

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
  height: isMobile ? '100%' : '100vh', 
  right: isMobile ? (showMobileMenu ? 0 : '-280px') : 0,
  top: 0,
  zIndex: 1000,
  overflowY: 'auto',
  overflowX: 'hidden', 
  borderLeft: '1px solid rgba(0,0,0,0.02)',
  transition: 'right 0.3s ease'
}}>

        {/* ========== حامل اللوقو وزر الإغلاق ========== */}
        <div style={{
          position: 'relative',
          width: '100%'
        }}>

          {/* ========== زر الإغلاق - في أعلى اليسار ========== */}
          {isMobile && showMobileMenu && (
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px',
                color: 'white',
                zIndex: 1001,
                transition: 'all 0.2s ease'
              }}
              onClick={() => setShowMobileMenu(false)}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            >
              ✕
            </div>
          )}

          {/* ========== اللوقو ========== */}
       
<div style={{
  padding: '32px 20px',
  background: 'linear-gradient(135deg, #2d3e50 0%, #1a2634 100%)',  
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
      borderRadius: '12px',
      filter: 'brightness(0) invert(1)' 
    }}
  />
</div>
        </div>

        {/* معلومات المستخدم */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid #edf2f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexDirection: 'row'
        }}>
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
            order: 1
          }}>
            {user?.username?.charAt(0).toUpperCase() || 'E'}
          </div>
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
              onClick={() => {
                setActivePage(item.id);
                if (isMobile) setShowMobileMenu(false);
              }}
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

      {/* ========== Overlay للجوال ========== */}
      {isMobile && showMobileMenu && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          transition: 'opacity 0.3s ease'
        }}
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* ========== MAIN CONTENT ========== */}
      <div style={{
        flex: 1,
        marginRight: isMobile ? '0' : '280px',
        padding: isMobile ? '16px' : '32px',
        paddingTop: isMobile ? '80px' : '32px',
        transition: 'margin-right 0.3s ease',
        background: '#f5f7fa',
        minHeight: '100vh'
      }}>

        {/* ========== HEADER (البطاقة) ========== */}
        <div style={{
          background: '#ffffff',
          padding: isMobile ? '24px 28px' : '28px 40px',
          borderRadius: '22px',
          marginBottom: '32px',
          border: '1px solid rgba(0,0,0,0.02)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexDirection: 'row',

          width: isMobile ? '92%' : '100%',
          maxWidth: isMobile ? '500px' : '100%',
          marginLeft: isMobile ? 'auto' : '0',
          marginRight: isMobile ? 'auto' : '0',

          minHeight: isMobile ? '190px' : '200px',
          position: 'relative'
        }}>

          {/* ========== التاريخ ========== */}
          <div style={{
            position: 'absolute',
            top: isMobile ? '18px' : '22px',
            left: isMobile ? '18px' : '28px',
            background: '#f8fafc',
            padding: '8px 18px',
            borderRadius: '40px',
            color: '#475569',
            fontSize: isMobile ? '12px' : '14px',
            border: '1px solid #e2e8f0',
            fontWeight: '500'
          }}>
            {new Date().toLocaleDateString('en-US')}
          </div>

          {/* ========== العنوان والزر ========== */}
          <div style={{
            textAlign: 'right',
            flex: 1,
            marginRight: isMobile ? '10px' : '20px',
            display: 'flex',
            alignItems: 'center'
          }}>

            {/* زر القائمة للجوال */}
            {isMobile && (
              <div
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  zIndex: 10
                }}
              >
                <span style={{
                  width: '24px',
                  height: '2px',
                  background: '#2d3e50',
                  borderRadius: '2px'
                }} />
                <span style={{
                  width: '24px',
                  height: '2px',
                  background: '#2d3e50',
                  borderRadius: '2px'
                }} />
                <span style={{
                  width: '24px',
                  height: '2px',
                  background: '#2d3e50',
                  borderRadius: '2px'
                }} />
              </div>
            )}

            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: isMobile ? '22px' : '28px',
                color: '#1a2634',
                marginBottom: '10px',
                fontWeight: '700',
                letterSpacing: '-0.5px',
                lineHeight: 1.3
              }}>
                {activePage === 'dashboard' && 'لوحة التحكم'}
                {activePage === 'myProjects' && 'مشاريعي'}
                {activePage === 'myReports' && 'تقاريري المرسلة'}
                {activePage === 'reportDetails' && 'تفاصيل التقرير'}
              </h1>
              <p style={{
                color: '#64748b',
                fontSize: isMobile ? '14px' : '16px',
                margin: 0,
                lineHeight: 1.5
              }}>
                {activePage === 'dashboard' && 'مرحباً بك في لوحة تحكم المهندس'}
                {activePage === 'myProjects' && `عرض جميع المشاريع المسندة إليك (${projects.length})`}
                {activePage === 'myReports' && `جميع التقارير التي أرسلتها (${myReports.length})`}
                {activePage === 'reportDetails' && selectedReport && `تقرير ${new Date(selectedReport.created_at).toLocaleDateString('en-US')}`}
              </p>
            </div>
          </div>
        </div>

        {/* ========== CONTENT ========== */}

        {/* 1️⃣ لوحة التحكم - Dashboard */}
        {activePage === 'dashboard' && (
          <div>
            {/* بطاقات الإحصائيات */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? '1fr'
                : 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
              marginBottom: '32px',
              justifyItems: isMobile ? 'center' : 'stretch'
            }}>
              <div style={{
                background: '#ffffff',
                width: isMobile ? '80%' : '100%',
                maxWidth: isMobile ? '300px' : '100%',
                padding: isMobile ? '26px 20px' : '24px',
                borderRadius: '22px',
                border: '1px solid #edf2f7',
                boxShadow: '0 8px 22px rgba(0,0,0,0.06)',
                textAlign: 'right',
                minHeight: isMobile ? '190px' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '18px' }}>إجمالي المشاريع المسندة</span>
                <h3 style={{ fontSize: isMobile ? '40px' : '36px', fontWeight: '700', color: '#1a2634', margin: 0 }}>{stats.totalProjects}</h3>
              </div>

              <div style={{
                background: '#ffffff',
                width: isMobile ? '80%' : '100%',
                maxWidth: isMobile ? '300px' : '100%',
                padding: isMobile ? '26px 20px' : '24px',
                borderRadius: '22px',
                border: '1px solid #edf2f7',
                boxShadow: '0 8px 22px rgba(0,0,0,0.06)',
                textAlign: 'right',
                minHeight: isMobile ? '190px' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '18px' }}>إجمالي عدد العمال</span>
                <h3 style={{ fontSize: isMobile ? '40px' : '36px', fontWeight: '700', color: '#1a2634', margin: 0 }}>{stats.totalWorkers}</h3>
              </div>

              <div style={{
                background: '#ffffff',
                width: isMobile ? '80%' : '100%',
                maxWidth: isMobile ? '300px' : '100%',
                padding: isMobile ? '26px 20px' : '24px',
                borderRadius: '22px',
                border: '1px solid #edf2f7',
                boxShadow: '0 8px 22px rgba(0,0,0,0.06)',
                textAlign: 'right',
                minHeight: isMobile ? '190px' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '18px' }}>إجمالي التقارير المرسلة</span>
                <h3 style={{ fontSize: isMobile ? '40px' : '36px', fontWeight: '700', color: '#059669', margin: 0 }}>{stats.totalReports}</h3>
              </div>
            </div>

            {/* آخر المشاريع */}
            <div style={{
              background: '#ffffff',
              width: isMobile ? '80%' : '100%',
              maxWidth: isMobile ? '300px' : '100%',
              margin: '0 auto',
              padding: isMobile ? '26px 20px' : '24px',
              borderRadius: '22px',
              border: '1px solid #edf2f7',
              boxShadow: '0 8px 22px rgba(0,0,0,0.06)',
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
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px',
      borderBottom: index < 4 ? '1px solid #f1f5f9' : 'none',
      borderRadius: '8px',
      transition: 'all 0.2s ease'
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
  >
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
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
      <span 
        onClick={() => handleViewProjectDetails(project)}
        style={{ 
          fontSize: '12px', 
          color: '#94a3b8',
          cursor: 'pointer',
          transition: 'color 0.2s ease'
        }}
        onMouseEnter={(e) => e.target.style.color = '#2d3e50'}
        onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
      >
        عرض التفاصيل ←
      </span>
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
              width: isMobile ? '80%' : '100%',
              maxWidth: isMobile ? '300px' : '100%',
              margin: '0 auto',
              padding: isMobile ? '26px 20px' : '24px',
              borderRadius: '22px',
              border: '1px solid #edf2f7',
              boxShadow: '0 8px 22px rgba(0,0,0,0.06)'
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
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: index < 4 ? '1px solid #f1f5f9' : 'none',
        borderRadius: '8px',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
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
        <span 
          onClick={() => handleViewReport(report)}
          style={{ 
            fontSize: '12px', 
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'color 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.color = '#2d3e50'}
          onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
        >
          عرض التقرير ←
        </span>
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
            padding: isMobile ? '16px' : '32px',
            borderRadius: '24px',
            border: '1px solid rgba(0,0,0,0.02)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.02)',
            maxWidth: isMobile ? '100%' : '1200px',
            margin: '0 auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
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
                {projects.length} مشروع
              </span>
              <h2 style={{
                fontSize: isMobile ? '18px' : '20px',
                color: '#1a2634',
                fontWeight: '600',
                margin: 0,
                textAlign: 'right'
              }}>
                جميع المشاريع المسندة إليك
              </h2>
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
              <>
                {/* للديسكتوب - جدول */}
                {!isMobile && (
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

                {/* للجوال - كروت */}
                {isMobile && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {projects.map((project) => {
                      const projectReportsCount = myReports.filter(r => r.project_id === project.id).length;

                      return (
                        <div key={project.id} style={{
                          background: '#ffffff',
                          border: '1px solid #edf2f7',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          borderRadius: '22px',
                          padding: '26px 20px',
                          direction: 'rtl'
                        }}>
                          {/* الصف الأول: رقم المشروع وعدد التقارير */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                            borderBottom: '1px solid #f1f5f9',
                            paddingBottom: '8px'
                          }}>
                            <span style={{
                              fontWeight: '600',
                              color: '#1a2634',
                              fontSize: '13px'
                            }}>
                              {project.report_number}
                            </span>
                            <span style={{
                              background: '#2d3e50',
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {projectReportsCount} تقرير
                            </span>
                          </div>

                          {/* المعلومات: المالك، الشركة، الموقع، التاريخ، العمال */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            marginBottom: '16px'
                          }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>المالك</div>
                              <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a2634' }}>{project.owner_name}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>الشركة</div>
                              <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a2634' }}>{project.company_name}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>الموقع</div>
                              <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a2634' }}>{project.location}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>التاريخ</div>
                              <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a2634' }}>{new Date(project.report_date).toLocaleDateString('en-US')}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>عدد العمال</div>
                              <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a2634' }}>{project.workers_count}</div>
                            </div>
                          </div>
{/* الأزرار */}
<div style={{
  display: 'flex',
  gap: '8px',
  borderTop: '1px solid #f1f5f9',
  paddingTop: '16px',
  flexDirection: 'row-reverse'
}}>
  <button
    onClick={() => {
      const projectReportsCount = myReports.filter(r => r.project_id === project.id).length;
      if (projectReportsCount > 0) {
        // إذا فيه تقارير سابقة، نعرض آخر تقرير
        handleViewProjectDetails(project);
      } else {
        // إذا ما فيه تقارير، ننشئ تقرير جديد
        handleViewProject(project);
      }
    }}
    style={{
      flex: 1,
      padding: '10px 0',
      background: '#2d3e50',
      color: 'white',
      border: 'none',
      borderRadius: '30px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 4px 10px rgba(45,62,80,0.2)'
    }}
  >
    {myReports.filter(r => r.project_id === project.id).length > 0 ? 'عرض التقرير' : 'تقرير جديد'}
  </button>
  <button
    onClick={() => handleViewProjectDetails(project)}
    style={{
      flex: 1,
      padding: '10px 0',
      background: 'transparent',
      color: '#2d3e50',
      border: '1px solid #2d3e50',
      borderRadius: '30px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer'
    }}
  >
    عرض التفاصيل
  </button>
</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 3️⃣ تقاريري المرسلة */}
        {activePage === 'myReports' && (
          <div style={{
            background: '#ffffff',
            padding: isMobile ? '16px' : '32px',
            borderRadius: '24px',
            border: '1px solid rgba(0,0,0,0.02)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.02)',
            maxWidth: isMobile ? '100%' : '1200px',
            margin: '0 auto'
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
                fontSize: isMobile ? '18px' : '20px',
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
              <>
                {/* للديسكتوب - جدول */}
                {!isMobile && (
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

                {/* للجوال - كروت */}
                {isMobile && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {myReports.map((report) => {
                      const canEdit = checkReportEditPermission(report.created_at);

                      return (
                        <div key={report.id} style={{
                          background: '#ffffff',
                          border: '1px solid #edf2f7',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          borderRadius: '22px',
                          padding: '26px 20px',
                          direction: 'rtl'
                        }}>
                          {/* الصف الأول: رقم المشروع والحالة */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                            borderBottom: '1px solid #f1f5f9',
                            paddingBottom: '8px'
                          }}>
                            <span style={{
                              fontWeight: '600',
                              color: '#1a2634',
                              fontSize: '13px'
                            }}>
                              {(() => {
                                const rawNumber = report.project?.report_number || report.report_number || '';
                                return rawNumber.replace(/-\d{8}$/, '').trim() || 'تقرير يومي';
                              })()}
                            </span>
                            <span style={{
                              background: canEdit ? '#10b981' : '#94a3b8',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '30px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {canEdit ? 'نشط' : 'منتهي'}
                            </span>
                          </div>

                          {/* المعلومات الأساسية */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            marginBottom: '16px'
                          }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>المالك</div>
                              <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a2634' }}>{report.project?.owner_name || report.owner_name || '-'}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>الموقع</div>
                              <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a2634' }}>{report.project?.location || report.location || '-'}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>تاريخ التقرير</div>
                              <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a2634' }}>{new Date(report.created_at).toLocaleDateString('en-US')}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>تاريخ الإرسال</div>
                              <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a2634' }}>{report.submitted_at ? new Date(report.submitted_at).toLocaleDateString('en-US') : '-'}</div>
                            </div>
                          </div>

                          {/* الأزرار */}
                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            borderTop: '1px solid #f1f5f9',
                            paddingTop: '16px',
                            flexDirection: 'row-reverse'
                          }}>
                          
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleReportDropdown(report.id, e);
                              }}
                              style={{
                                flex: 1,
                                padding: '10px 0',
                                background: 'transparent',
                                color: '#2d3e50',
                                border: '1px solid #2d3e50',
                                borderRadius: '30px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              الإجراءات
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 4️⃣ تفاصيل التقرير - عرض معلومات المشروع + محتوى التقرير */}
        {activePage === 'reportDetails' && selectedReport && (
          <div
            style={{
              background: '#ffffff',
              padding: isMobile ? '16px' : '32px',
              borderRadius: '24px',
              border: '1px solid rgba(0,0,0,0.02)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.02)',
              maxWidth: isMobile ? '100%' : '1200px',
              margin: '0 auto'
            }}
          >
            {/* زر العودة */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '24px' }}>
              <button
                onClick={() => setActivePage('myReports')}
                style={{
                  padding: isMobile ? '10px 20px' : '10px 20px',
                  background: '#2d3e50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '30px',
                  fontSize: isMobile ? '13px' : '14px',
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

            {/* محتوى التقرير المراد تصويره */}
            <div className="report-content">

              {/* معلومات المشروع */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '16px',
                padding: isMobile ? '20px' : '24px',
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

{isMobile ? (
  /* للجوال - تصميم محسن مثل Admin مع 4 صفوف كاملة - RTL */
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', direction: 'rtl' }}>
    {/* الصف الأول: رقم المشروع + المهندس */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e2e8f0', paddingBottom: '12px' }}>
      <div style={{ textAlign: 'right', width: '45%' }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>رقم المشروع</div>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#2d3e50' }}>
          {selectedReport.project?.report_number
            ? selectedReport.project.report_number.split('-').slice(0, 2).join('-')
            : selectedReport.report_number
              ? selectedReport.report_number.split('-').slice(0, 2).join('-')
              : 'غير متوفر'}
        </div>
      </div>
      <div style={{ textAlign: 'right', width: '45%' }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>المهندس</div>
        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a2634' }}>
          {selectedReport.project?.engineer_name || user?.username || 'غير متوفر'}
        </div>
      </div>
    </div>
    
    {/* الصف الثاني: المالك + الموقع */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e2e8f0', paddingBottom: '12px' }}>
      <div style={{ textAlign: 'right', width: '45%' }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>المالك</div>
        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a2634' }}>
          {selectedReport.project?.owner_name || 'غير متوفر'}
        </div>
      </div>
      <div style={{ textAlign: 'right', width: '45%' }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>الموقع</div>
        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a2634' }}>
          {selectedReport.project?.location || selectedReport.location || 'غير متوفر'}
        </div>
      </div>
    </div>
    
    {/* الصف الثالث: الشركة + التاريخ */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e2e8f0', paddingBottom: '12px' }}>
      <div style={{ textAlign: 'right', width: '45%' }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>الشركة</div>
        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a2634' }}>
          {selectedReport.project?.company_name || 'غير متوفر'}
        </div>
      </div>
      <div style={{ textAlign: 'right', width: '45%' }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>التاريخ</div>
        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a2634' }}>
          {selectedReport.project?.report_date
            ? new Date(selectedReport.project.report_date).toLocaleDateString('en-US')
            : 'غير متوفر'}
        </div>
      </div>
    </div>
    
    {/* الصف الرابع: عدد العمال + الحالة */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ textAlign: 'right', width: '45%' }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>عدد العمال</div>
        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a2634' }}>
          {selectedReport.project?.workers_count || 'غير متوفر'}
        </div>
      </div>
      <div style={{ textAlign: 'right', width: '45%' }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>الحالة</div>
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
) : (
                  /* للديسكتوب - تصميم */
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
                )}
              </div>

              {isLoadingReports ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <p style={{ color: '#64748b' }}>جاري تحميل تفاصيل التقرير...</p>
                </div>
              ) : (
                <>
                  {/* الأعمال الجارية */}
                  {reportDetails.workItems.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: '0 0 20px 0',
                        textAlign: 'right',
                        borderBottom: '2px solid #2d3e50',
                        paddingBottom: '10px'
                      }}>
                        الأعمال الجارية
                      </h3>

                     {isMobile ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px',  }}>
    {reportDetails.workItems.map((item, index) => (
      <div key={item.id} style={{
        background: '#f8fafc',
        padding: '16px',
        borderRadius: '16px',
        
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',  borderBottom: '1px dashed #e2e8f0', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a2634' }}>
            {item.item_name}
          </span>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>البند</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',  borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634' }}>{item.work_area}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>منطقة العمل</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between',  borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634' }}>{item.workers_count}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>عدد العمال</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634' }}>{item.quantity}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>الكمية</span>
          </div>
        </div>
      </div>
    ))}
  </div>
) : (
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
                              {reportDetails.workItems.map((item, index) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>{index + 1}</td>
                                  <td style={{ padding: '12px', textAlign: 'right', color: '#1a2634', fontWeight: '500' }}>{item.item_name}</td>
                                  <td style={{ padding: '12px', textAlign: 'right', color: '#475569' }}>{item.work_area}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{item.workers_count}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{item.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* خطة اليوم التالي */}
                  {reportDetails.nextDayPlans.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: '0 0 20px 0',
                        textAlign: 'right',
                        borderBottom: '2px solid #2d3e50',
                        paddingBottom: '10px'
                      }}>
                        خطة اليوم التالي
                      </h3>

                    {isMobile ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {reportDetails.nextDayPlans.map((plan, index) => (
      <div key={plan.id} style={{
        padding: '14px 16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #edf2f7'
      }}>
        {/* تم إزالة الـ div الفارغ الذي كان يسبب المشكلة */}
        <p style={{ 
          color: '#1a2634', 
          fontSize: '13px', 
          margin: 0, 
          textAlign: 'right',
          lineHeight: '1.5' // إضافة تباعد بسيط بين السطور إذا كان النص طويلاً
        }}>
          {plan.description}
        </p>
      </div>
    ))}
  </div>
) 
                      : (
                        reportDetails.nextDayPlans.map((plan) => (
                          <div key={plan.id} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #edf2f7', marginBottom: '8px' }}>
                            <p style={{ color: '#1a2634', fontSize: '14px', margin: 0, textAlign: 'center' }}>{plan.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* المواد */}
                  {reportDetails.materials.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: '0 0 20px 0',
                        textAlign: 'right',
                        borderBottom: '2px solid #2d3e50',
                        paddingBottom: '10px'
                      }}>
                        المواد
                      </h3>

                     {isMobile ? (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '12px',
   
  }}>
    {reportDetails.materials.map((material) => (
      <div key={material.id} style={{
        background: '#f8fafc',
        padding: '16px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634' }}>{material.material_name}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>الخامة</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634' }}>{material.quantity}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>الكمية</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634' }}>{material.material_type || '-'}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>النوع</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634' }}>{material.storage_location || '-'}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>مكان التخزين</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634' }}>{material.supplier_name || '-'}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>المورد</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634' }}>{material.supplier_contact || '-'}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>رقم المورد</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634' }}>{material.supply_location || '-'}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>مكان التوريد</span>
          </div>
        </div>
      </div>
    ))}
  </div>
)
                      : (
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
                              {reportDetails.materials.map(material => (
                                <tr key={material.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '12px', textAlign: 'center', color: '#1a2634' }}>{material.material_name}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.material_type || '-'}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.quantity}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.storage_location || '-'}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.supplier_name || '-'}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.supplier_contact || '-'}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.supply_location || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* صور الموقع */}
                  {reportDetails.siteImages.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: '0 0 20px 0',
                        textAlign: 'right',
                        borderBottom: '2px solid #2d3e50',
                        paddingBottom: '10px'
                      }}>
                        صور الموقع
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                        {reportDetails.siteImages.map(image => (
                          <div key={image.id} style={{
                            background: '#f8fafc',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid #edf2f7',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            aspectRatio: '1/1',
                            cursor: 'pointer'
                          }}>
                            <img
                              src={`http://localhost:3000/${image.image_path}`}
                              alt="Site"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
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
                    </div>
                  )}

{/* التوقيع */}
{reportDetails.signatures.length > 0 && (
  <div style={{ marginBottom: '20px' }}>
    <h3 style={{
      fontSize: '18px',
      fontWeight: '600',
      margin: '0 0 20px 0',
      textAlign: 'right',
      borderBottom: '2px solid #2d3e50',
      paddingBottom: '10px'
    }}>
      التوقيع
    </h3>

    {isMobile ? (
      /* للجوال - التصميم المطلوب */
      reportDetails.signatures.map(signature => (
        <div key={signature.id} style={{
          padding: '14px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #edf2f7',
          textAlign: 'center',
          maxWidth: '400px',
          margin: '0 auto 12px auto'
        }}>
          <div style={{ fontWeight: '600', color: '#1a2634', fontSize: '16px', marginBottom: '8px' }}>{signature.signed_by}</div>
          <div style={{ color: '#475569', fontSize: '15px', marginBottom: '12px', fontStyle: 'italic' }}>"{signature.signature_data}"</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', borderTop: '1px dashed #d1d5db', paddingTop: '10px' }}>
            تاريخ التوقيع: {new Date(signature.signed_at).toLocaleDateString('en-US')} - {new Date(signature.signed_at).toLocaleTimeString('en-US')}
          </div>
        </div>
      ))
    ) : (
      /* للديسكتوب - نفس التصميم القديم */
      reportDetails.signatures.map(signature => (
        <div key={signature.id} style={{
          padding: '20px',
          background: '#f8fafc',
          borderRadius: '12px',
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
)}


                </>
              )}
            </div> {/* نهاية report-content */}

            {/* أزرار الإجراءات - خارج report-content */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '12px' : '16px', marginTop: '32px' }}>
              <button
                onClick={handleDownloadPDF}
                style={{
                  padding: isMobile ? '12px 24px' : '12px 40px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '30px',
                  fontSize: isMobile ? '13px' : '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: isMobile ? 1 : 'none',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)'
                }}
                onMouseEnter={(e) => e.target.style.background = '#047857'}
                onMouseLeave={(e) => e.target.style.background = '#059669'}
              >
                <span></span>
                تحميل PDF
              </button>
              <button
                onClick={() => setActivePage('myReports')}
                style={{
                  padding: isMobile ? '12px 24px' : '12px 40px',
                  background: '#2d3e50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '30px',
                  fontSize: isMobile ? '13px' : '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flex: isMobile ? 1 : 'none',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(45, 62, 80, 0.3)'
                }}
                onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
              >
                إغلاق
              </button>
            </div>

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
                left: isMobile ? '50%' : reportPopupPosition.left,
                transform: isMobile ? 'translateX(-50%)' : 'none',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                zIndex: 9999,
                minWidth: isMobile ? '250px' : '250px',
                maxWidth: isMobile ? '90%' : '250px',
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
                        handleEditReport(report);
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
                    padding: '8px 24px',
                    background: 'transparent',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: '30px',
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