

// src/pages/SubAdminDashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const SubAdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [myReports, setMyReports] = useState([]); // state جديد للتقارير المرسلة
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false); // حالة تحميل التقارير
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null); // للتقرير المحدد
  const [reportDetails, setReportDetails] = useState({ // تفاصيل التقرير
    workItems: [],
    nextDayPlans: [],
    materials: [],
    siteImages: [],
    signatures: []
  });

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
        // فلترة المشاريع - ناخذ فقط مشاريع المهندس الحالي
        const myProjects = data.filter(project => project.engineer_name === username);
        setProjects(myProjects);
      }
    } catch (error) {
      console.error('خطأ في جلب المشاريع:', error);
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
      
      // جلب كل التقارير اليومية للمهندس
      const response = await fetch(`http://localhost:3000/daily-reports/engineer/${username}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMyReports(data.reports || []);
      }
    } catch (error) {
      console.error('خطأ في جلب التقارير:', error);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

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
    navigate(`/project-report/${project.id}`);
  };

  // ========== عرض تقرير سابق ==========
  const handleViewReport = (report) => {
    setSelectedReport(report);
    fetchReportDetails(report.id);
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
      fetchMyProjects();
      fetchMyReports(); // جلب التقارير عند التحميل
    }
  }, [fetchMyProjects, fetchMyReports]);

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
    { id: 'myReports', label: 'تقاريري' }, // خانه جديده
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
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid #edf2f7',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
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
            fontSize: '16px'
          }}>
            {user?.username?.charAt(0).toUpperCase() || 'E'}
          </div>
          <div style={{ overflow: 'hidden', textAlign: 'right' }}>
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
              justifyContent: 'flex-end',
              gap: '12px',
              cursor: 'pointer',
              color: '#e53e3e',
              transition: 'all 0.2s ease',
              textAlign: 'right'
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
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', color: '#1a2634', marginBottom: '8px', fontWeight: '600', letterSpacing: '-0.5px' }}>
              {activePage === 'dashboard' && 'لوحة التحكم'}
              {activePage === 'myProjects' && 'مشاريعي'}
              {activePage === 'myReports' && 'تقاريري المرسلة'}
              {activePage === 'reportDetails' && 'تفاصيل التقرير'}
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              {activePage === 'dashboard' && 'مرحباً بك في لوحة تحكم المهندس'}
              {activePage === 'myProjects' && `عرض جميع المشاريع المسندة إليك (${projects.length})`}
              {activePage === 'myReports' && `جميع التقارير التي أرسلتها (${myReports.length})`}
              {activePage === 'reportDetails' && selectedReport && `تقرير ${new Date(selectedReport.created_at).toLocaleDateString('ar-SA')}`}
            </p>
          </div>
          <div style={{ 
            background: '#f8fafc', 
            padding: '8px 16px', 
            borderRadius: '30px',
            color: '#475569',
            fontSize: '14px',
            border: '1px solid #e2e8f0'
          }}>
            {new Date().toLocaleDateString('ar-SA')}
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
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s ease'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>إجمالي المشاريع المسندة</span>
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: '600', color: '#1a2634', margin: 0, lineHeight: 1 }}>{stats.totalProjects}</h3>
              </div>

              <div style={{ 
                background: '#ffffff', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid rgba(0,0,0,0.02)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s ease'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>إجمالي عدد العمال</span>
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: '600', color: '#1a2634', margin: 0, lineHeight: 1 }}>{stats.totalWorkers}</h3>
              </div>

              <div style={{ 
                background: '#ffffff', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid rgba(0,0,0,0.02)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s ease'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>إجمالي التقارير المرسلة</span>
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: '600', color: '#059669', margin: 0, lineHeight: 1 }}>{stats.totalReports}</h3>
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
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', margin: 0 }}>آخر المشاريع المسندة إليك</h3>
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
                      onClick={() => handleViewProject(project)}
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
                      <div>
                        <div style={{ fontWeight: '600', color: '#1a2634', fontSize: '14px', marginBottom: '4px' }}>{project.report_number}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{project.owner_name} - {project.company_name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>الموقع: {project.location}</div>
                      </div>
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
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', margin: 0 }}>آخر التقارير المرسلة</h3>
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
                  {myReports.slice(0, 5).map((report, index) => (
                    <div 
                      key={report.id} 
                      onClick={() => handleViewReport(report)}
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
                      <div>
                        <div style={{ fontWeight: '600', color: '#1a2634', fontSize: '14px', marginBottom: '4px' }}>
                          {report.project?.report_number || 'تقرير يومي'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          تاريخ التقرير: {new Date(report.created_at).toLocaleDateString('ar-SA')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                          وقت الإرسال: {report.submitted_at ? new Date(report.submitted_at).toLocaleTimeString('ar-SA') : '-'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          background: '#059669',
                          color: 'white',
                          padding: '6px 14px',
                          borderRadius: '30px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          مرسل
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>عرض التقرير ←</span>
                      </div>
                    </div>
                  ))}
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
              <h2 style={{ fontSize: '18px', color: '#1a2634', fontWeight: '600', margin: 0 }}>جميع المشاريع المسندة إليك</h2>
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
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>رقم المشروع</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>المالك</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>الشركة</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>الموقع</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>التاريخ</th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>العمال</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>الحالة</th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', fontWeight: '600', color: '#1a2634' }}>{project.report_number}</td>
                        <td style={{ padding: '16px', color: '#475569' }}>{project.owner_name}</td>
                        <td style={{ padding: '16px', color: '#475569' }}>{project.company_name}</td>
                        <td style={{ padding: '16px', color: '#475569' }}>{project.location}</td>
                        <td style={{ padding: '16px', color: '#64748b' }}>{new Date(project.report_date).toLocaleDateString('ar-SA')}</td>
                        <td style={{ padding: '16px', textAlign: 'center', color: '#475569' }}>{project.workers_count}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            background: project.status === 'completed' ? '#f0f9ff' : '#fefce8',
                            color: project.status === 'completed' ? '#0369a1' : '#854d0e',
                            padding: '6px 16px',
                            borderRadius: '30px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'inline-block',
                            border: project.status === 'completed' ? '1px solid #bae6fd' : '1px solid #fef9c3'
                          }}>
                            {project.status === 'completed' ? 'مكتمل' : 'مرسل'}
                          </span>
                        </td>
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
                            عرض التفاصيل
                          </button>
                        </td>
                      </tr>
                    ))}
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
            borderRadius: '16px', 
            border: '1px solid rgba(0,0,0,0.02)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', color: '#1a2634', fontWeight: '600', margin: 0 }}>جميع التقارير المرسلة</h2>
              <span style={{ 
                background: '#059669', 
                color: 'white', 
                padding: '6px 16px', 
                borderRadius: '30px', 
                fontSize: '13px', 
                fontWeight: '600' 
              }}>
                {myReports.length} تقرير
              </span>
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>#</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>المشروع</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>تاريخ التقرير</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>تاريخ الإرسال</th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>الحالة</th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myReports.map((report, index) => (
                      <tr key={report.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', fontWeight: '600', color: '#1a2634' }}>{index + 1}</td>
                        <td style={{ padding: '16px', color: '#475569' }}>
                          {report.project?.report_number || 'تقرير يومي'}
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                            {report.project?.owner_name || ''}
                          </div>
                        </td>
                        <td style={{ padding: '16px', color: '#64748b' }}>
                          {new Date(report.created_at).toLocaleDateString('ar-SA')}
                        </td>
                        <td style={{ padding: '16px', color: '#64748b' }}>
                          {report.submitted_at ? new Date(report.submitted_at).toLocaleString('ar-SA') : '-'}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <span style={{
                            background: '#059669',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '30px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'inline-block'
                          }}>
                            مرسل
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <button 
                            onClick={() => handleViewReport(report)} 
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
                            عرض التقرير
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4️⃣ تفاصيل التقرير */}
        {activePage === 'reportDetails' && selectedReport && (
          <div style={{ 
            background: '#ffffff', 
            padding: '32px', 
            borderRadius: '16px', 
            border: '1px solid rgba(0,0,0,0.02)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '18px', color: '#1a2634', fontWeight: '600', margin: 0 }}>
                  تفاصيل التقرير - {selectedReport.project?.report_number || 'تقرير يومي'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
                  تاريخ التقرير: {new Date(selectedReport.created_at).toLocaleDateString('ar-SA')}
                </p>
              </div>
              <button
                onClick={() => setActivePage('myReports')}
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  borderRadius: '30px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.target.style.background = 'white'}
              >
                ← العودة للتقارير
              </button>
            </div>

            {isLoadingReports ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ color: '#64748b' }}>جاري تحميل تفاصيل التقرير...</p>
              </div>
            ) : (
              <>
                {/* 1️⃣ الأعمال الجارية */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a2634', marginBottom: '16px', fontWeight: '600' }}>الأعمال الجارية</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>#</th>
                          <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>البند</th>
                          <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>منطقة العمل</th>
                          <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>عدد العمال</th>
                          <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>الكمية</th>
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
                              <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                              <td style={{ padding: '12px', textAlign: 'center', color: '#1a2634' }}>{item.item_name}</td>
                              <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{item.work_area}</td>
                              <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{item.workers_count}</td>
                              <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{item.quantity}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2️⃣ خطة اليوم التالي */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a2634', marginBottom: '16px', fontWeight: '600' }}>خطة اليوم التالي</h3>
                  {reportDetails.nextDayPlans.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                      لا توجد خطط مضافة
                    </div>
                  ) : (
                    reportDetails.nextDayPlans.map((plan) => (
                      <div key={plan.id} style={{
                        padding: '16px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #edf2f7',
                        marginBottom: '8px',
                        textAlign: 'center',
                        color: '#1a2634',
                        fontSize: '14px'
                      }}>
                        {plan.description}
                      </div>
                    ))
                  )}
                </div>

                {/* 3️⃣ المواد */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a2634', marginBottom: '16px', fontWeight: '600' }}>المواد</h3>
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

                {/* 4️⃣ صور الموقع */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a2634', marginBottom: '16px', fontWeight: '600' }}>صور الموقع</h3>
                  {reportDetails.siteImages.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                      لا توجد صور مضافة
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                      {reportDetails.siteImages.map(image => (
                        <div key={image.id} style={{
                          background: '#f8fafc',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid #edf2f7'
                        }}>
                          <img
                            src={`http://localhost:3000/${image.image_path}`}
                            alt="Site"
                            style={{
                              width: '100%',
                              height: '120px',
                              objectFit: 'cover',
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(`http://localhost:3000/${image.image_path}`, '_blank')}
                          />
                          <div style={{ padding: '8px', textAlign: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                              {new Date(image.uploaded_at).toLocaleDateString('ar-SA')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5️⃣ التوقيع */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a2634', marginBottom: '16px', fontWeight: '600' }}>التوقيع</h3>
                  {reportDetails.signatures.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                      لا يوجد توقيع
                    </div>
                  ) : (
                    reportDetails.signatures.map(signature => (
                      <div key={signature.id} style={{
                        padding: '16px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #edf2f7',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontWeight: '600', color: '#1a2634', marginBottom: '4px' }}>{signature.signed_by}</div>
                        <div style={{ color: '#475569', fontSize: '14px', marginBottom: '8px' }}>{signature.signature_data}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {new Date(signature.signed_at).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
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
          border-radius: 3px; 
        }
        ::-webkit-scrollbar-thumb:hover { 
          background: #94a3b8; 
        }
        input:focus, select:focus, button:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
};

export default SubAdminDashboard;