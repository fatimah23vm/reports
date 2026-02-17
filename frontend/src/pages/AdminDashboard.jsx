

// src/pages/AdminDashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';

const AdminDashboard = () => {
  // ========== State المستخدمين ==========
  const [user, setUser] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [newEngineer, setNewEngineer] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [editingEngineer, setEditingEngineer] = useState(null);

  // ========== State المشاريع ==========
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState({
    engineer_name: '',
    owner_name: '',
    company_name: '',
    location: '',
    report_date: new Date().toISOString().split('T')[0],
    workers_count: 0
  });
  const [projectMessage, setProjectMessage] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  
  // ========== State للقوائم ==========
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // ========== State للتقرير ==========
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDetails, setReportDetails] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  
  // ========== State إضافية للتقرير الكامل ==========
  const [workItems, setWorkItems] = useState([]);
  const [nextDayPlans, setNextDayPlans] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [siteImages, setSiteImages] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [dailyReportId, setDailyReportId] = useState(null);

  // ========== دوال المهندسين ==========
  const fetchEngineers = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/users/engineers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setEngineers(data);
      }
    } catch (error) {
      console.error('خطأ في جلب المهندسين:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddEngineer = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!newEngineer.username.trim() || !newEngineer.password.trim()) {
      setMessage({ type: 'error', text: 'اسم المستخدم وكلمة المرور مطلوبان' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/users/add-engineer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newEngineer.username.trim(),
          password: newEngineer.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'تم إضافة المهندس بنجاح' });
        setNewEngineer({ username: '', password: '' });
        await fetchEngineers();
      } else {
        setMessage({ type: 'error', text: data.message || 'حدث خطأ' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل الاتصال بالسيرفر' });
    }
  };

  const handleDeleteEngineer = async (engineerId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المهندس؟')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/users/engineer/${engineerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        setDeleteMessage({ type: 'success', text: 'تم حذف المهندس بنجاح' });
        await fetchEngineers();
        setTimeout(() => setDeleteMessage(''), 3000);
      } else {
        setDeleteMessage({ type: 'error', text: data.message || 'حدث خطأ' });
      }
    } catch (error) {
      setDeleteMessage({ type: 'error', text: 'فشل الاتصال بالسيرفر' });
    }
  };

  const handleEditEngineer = async (engineerId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/users/engineer/${engineerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setEditingEngineer(data);
        setActivePage('editEngineer');
      }
    } catch (error) {
      alert('فشل في جلب بيانات المهندس');
    }
  };

  const handleUpdateEngineer = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/users/engineer/${editingEngineer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: editingEngineer.username,
          password: editingEngineer.password || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'تم تحديث المهندس بنجاح' });
        setEditingEngineer(null);
        setActivePage('engineers');
        await fetchEngineers();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage({ type: 'error', text: data.message || 'حدث خطأ' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل الاتصال بالسيرفر' });
    }
  };

  // ========== دوال المشاريع ==========
  const fetchProjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/owner-reports/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setProjects(data);
    } catch (error) {
      console.error('خطأ في جلب المشاريع:', error);
    }
  }, []);

  // دالة إضافة مشروع
  const handleAddProject = async (e) => {
    e.preventDefault();
    setProjectMessage('');

    if (!newProject.engineer_name.trim() || !newProject.owner_name.trim() || 
        !newProject.company_name.trim() || !newProject.location.trim() || 
        !newProject.report_date || !newProject.workers_count) {
      setProjectMessage({ type: 'error', text: 'جميع الحقول مطلوبة' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/owner-reports/add-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          engineer_name: newProject.engineer_name.trim(),
          owner_name: newProject.owner_name.trim(),
          company_name: newProject.company_name.trim(),
          location: newProject.location.trim(),
          report_date: newProject.report_date,
          workers_count: parseInt(newProject.workers_count)
        })
      });

      const data = await response.json();

      if (response.ok) {
        setProjectMessage({ 
          type: 'success', 
          text: `تم إنشاء المشروع بنجاح - ${data.report.report_number}` 
        });
        setNewProject({
          engineer_name: '',
          owner_name: '',
          company_name: '',
          location: '',
          report_date: new Date().toISOString().split('T')[0],
          workers_count: 0
        });
        fetchProjects();
      } else {
        setProjectMessage({ type: 'error', text: data.message || 'حدث خطأ' });
      }
    } catch (error) {
      setProjectMessage({ type: 'error', text: 'فشل الاتصال بالسيرفر' });
    }
  };

  // دالة حذف مشروع
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المشروع؟')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/owner-reports/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        alert('تم حذف المشروع بنجاح');
        fetchProjects();
      } else {
        alert(data.message || 'حدث خطأ');
      }
    } catch (error) {
      alert('فشل الاتصال بالسيرفر');
    }
  };

  // دالة تعديل مشروع
  const handleEditProject = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/owner-reports/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setEditingProject(data);
        setActivePage('editProject');
      }
    } catch (error) {
      alert('فشل في جلب بيانات المشروع');
    }
  };

  // دالة تحديث مشروع
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/owner-reports/${editingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          engineer_name: editingProject.engineer_name,
          owner_name: editingProject.owner_name,
          company_name: editingProject.company_name,
          location: editingProject.location,
          report_date: editingProject.report_date,
          workers_count: parseInt(editingProject.workers_count),
          status: editingProject.status
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('تم تحديث المشروع بنجاح');
        setEditingProject(null);
        setActivePage('allProjects');
        fetchProjects();
      } else {
        alert(data.message || 'حدث خطأ');
      }
    } catch (error) {
      alert('فشل الاتصال بالسيرفر');
    }
  };

  // ========== دوال جلب بيانات التقرير الكامل ==========
  
  // جلب التقرير اليومي
  const fetchTodayDailyReport = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3000/daily-reports/project/${projectId}/today`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await response.json();

      if (response.ok && data.report) {
        const reportId = data.report.id;
        setDailyReportId(reportId);
        return reportId;
      }
      return null;
    } catch (error) {
      console.error('Error fetching daily report:', error);
      return null;
    }
  };

  // جلب الأعمال الجارية
  const fetchWorkItems = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/work-items/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setWorkItems(Array.isArray(data) ? data : data.work_items || []);
    } catch (error) {
      console.error('Error fetching work items:', error);
    }
  };

  // جلب خطة اليوم التالي
  const fetchNextDayPlans = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/next-day-plans/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setNextDayPlans(Array.isArray(data) ? data : data.next_day_plans || []);
    } catch (error) {
      console.error('Error fetching next day plans:', error);
    }
  };

  // جلب المواد
  const fetchMaterials = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/materials/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMaterials(Array.isArray(data) ? data : data.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  // جلب صور الموقع
  const fetchSiteImages = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/site-images/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSiteImages(Array.isArray(data) ? data : data.images || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  // جلب التوقيعات
  const fetchSignatures = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/signatures/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSignatures(Array.isArray(data) ? data : data.signatures || []);
    } catch (error) {
      console.error('Error fetching signatures:', error);
    }
  };

  // دالة جلب تفاصيل التقرير الكامل
  const fetchReportDetails = async (projectId) => {
    try {
      setIsLoadingReport(true);
      
      // جلب بيانات المشروع الأساسية
      const token = localStorage.getItem('token');
      const projectResponse = await fetch(`http://localhost:3000/owner-reports/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const projectData = await projectResponse.json();
      
      if (!projectResponse.ok) {
        alert('فشل في جلب بيانات المشروع');
        return;
      }
      
      setReportDetails(projectData);
      
      // جلب التقرير اليومي
      const reportId = await fetchTodayDailyReport(projectId);
      
      if (reportId) {
        // جلب جميع البيانات المرتبطة
        await Promise.all([
          fetchWorkItems(reportId),
          fetchNextDayPlans(reportId),
          fetchMaterials(reportId),
          fetchSiteImages(reportId),
          fetchSignatures(reportId)
        ]);
      }
      
      setShowReportModal(true);
    } catch (error) {
      console.error('خطأ في جلب تفاصيل التقرير:', error);
      alert('فشل الاتصال بالسيرفر');
    } finally {
      setIsLoadingReport(false);
    }
  };

  // دالة عرض التقرير
  const handleViewReport = (reportId) => {
    fetchReportDetails(reportId);
  };

  // ========== التهيئة ==========
  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('userRole');

    if (!token || role !== 'admin') {
      window.location.href = '/';
    } else {
      setUser({ username, role });
      fetchEngineers();
      fetchProjects();
    }
  }, [fetchEngineers, fetchProjects]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  // ========== إحصائيات ==========
  const getStats = () => {
    const totalProjects = projects.length;
    const totalEngineers = engineers.length;
    const totalWorkers = projects.reduce((sum, p) => sum + (parseInt(p.workers_count) || 0), 0);
    
    return { totalProjects, totalEngineers, totalWorkers };
  };

  const stats = getStats();

  // ========== Menu Items ==========
  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم' },
    { id: 'addProject', label: 'إضافة مشروع' },
    { id: 'allProjects', label: 'جميع المشاريع' },
    { id: 'engineers', label: 'المهندسين' },
    { id: 'addEngineer', label: 'إضافة مهندس' }
  ];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'row-reverse',
      minHeight: '100vh', 
      background: '#f5f7fa',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      
      {/* ========== SIDEBAR - على اليمين ========== */}
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
        
        {/* ========== اللوقو في المنتصف ========== */}
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
            {user?.username?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div style={{ overflow: 'hidden', textAlign: 'right' }}>
            <div style={{ fontWeight: '600', color: '#1a2634' }}>{user?.username}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>مدير النظام</div>
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
              {menuItems.find(item => item.id === activePage)?.label || 'لوحة التحكم'}
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              {activePage === 'dashboard' && 'نظرة عامة على النظام والإحصائيات'}
              {activePage === 'addProject' && 'إنشاء مشروع جديد مع رقم تقرير فريد'}
              {activePage === 'allProjects' && `عرض جميع المشاريع (${projects.length})`}
              {activePage === 'engineers' && `عرض المهندسين (${engineers.length})`}
              {activePage === 'addEngineer' && 'إضافة مهندس جديد إلى النظام'}
              {activePage === 'editEngineer' && 'تعديل بيانات المهندس'}
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

        {/* ========== CONTENT BASED ON ACTIVE PAGE ========== */}

        {/* 1️⃣ لوحة التحكم - Dashboard */}
        {activePage === 'dashboard' && (
          <div>
            {/* بطاقات الإحصائيات */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              <div style={{ 
                background: '#ffffff', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid rgba(0,0,0,0.02)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', letterSpacing: '0.3px' }}>إجمالي المشاريع</span>
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: '600', color: '#1a2634', margin: 0, lineHeight: 1 }}>{stats.totalProjects}</h3>
              </div>

              <div style={{ 
                background: '#ffffff', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid rgba(0,0,0,0.02)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', letterSpacing: '0.3px' }}>إجمالي المهندسين</span>
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: '600', color: '#1a2634', margin: 0, lineHeight: 1 }}>{stats.totalEngineers}</h3>
              </div>

              <div style={{ 
                background: '#ffffff', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid rgba(0,0,0,0.02)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', letterSpacing: '0.3px' }}>إجمالي العمال</span>
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: '600', color: '#1a2634', margin: 0, lineHeight: 1 }}>{stats.totalWorkers}</h3>
              </div>
            </div>

            {/* آخر المهندسين والمشاريع */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* بطاقة المهندسين */}
              <div style={{ 
                background: '#ffffff', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid rgba(0,0,0,0.02)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', margin: 0 }}>المهندسين</h3>
                  <span style={{ 
                    background: '#f1f5f9', 
                    color: '#2d3e50', 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: '600' 
                  }}>
                    {engineers.length}
                  </span>
                </div>
                
                {isLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px' }}>
                    <p style={{ color: '#64748b', fontSize: '14px' }}>جاري التحميل...</p>
                  </div>
                ) : engineers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px' }}>
                    <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>لا يوجد مهندسين</p>
                    <button 
                      onClick={() => setActivePage('addEngineer')}
                      style={{ 
                        padding: '10px 20px', 
                        background: '#2d3e50', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '30px', 
                        fontSize: '13px', 
                        fontWeight: '500', 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                      onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
                    >
                      إضافة مهندس
                    </button>
                  </div>
                ) : (
                  <div>
                    {engineers.slice(0, 5).map((eng, index) => (
                      <div key={eng.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '12px 0', 
                        borderBottom: index < 4 ? '1px solid #f1f5f9' : 'none' 
                      }}>
                        <span style={{ fontWeight: '500', color: '#1a2634', fontSize: '14px' }}>{eng.username}</span>
                        <span style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '4px 10px', borderRadius: '20px' }}>مهندس</span>
                      </div>
                    ))}
                    {engineers.length > 5 && (
                      <button 
                        onClick={() => setActivePage('engineers')}
                        style={{ 
                          width: '100%', 
                          padding: '10px', 
                          background: 'none', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '30px', 
                          marginTop: '16px', 
                          cursor: 'pointer', 
                          color: '#475569', 
                          fontSize: '13px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.target.style.background = 'none'}
                      >
                        عرض الكل ({engineers.length})
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* بطاقة آخر المشاريع */}
       {/* بطاقة آخر المشاريع */}
<div style={{ 
  background: '#ffffff', 
  padding: '24px', 
  borderRadius: '16px', 
  border: '1px solid rgba(0,0,0,0.02)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
}}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', margin: 0 }}>آخر المشاريع</h3>
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
  
  {projects.length === 0 ? (
    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px' }}>
      <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>لا توجد مشاريع</p>
      <button 
        onClick={() => setActivePage('addProject')}
        style={{ 
          padding: '10px 20px', 
          background: '#2d3e50', 
          color: 'white', 
          border: 'none', 
          borderRadius: '30px', 
          fontSize: '13px', 
          fontWeight: '500', 
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.target.style.background = '#1a2634'}
        onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
      >
        إضافة مشروع
      </button>
    </div>
  ) : (
    <div>
      {projects.slice(0, 5).map((project, index) => (
        <div key={project.id} style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px 0', 
          borderBottom: index < 4 ? '1px solid #f1f5f9' : 'none' 
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', color: '#1a2634', fontSize: '14px', marginBottom: '4px' }}>{project.report_number}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{project.owner_name}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => handleViewReport(project.id)} 
              style={{ 
                padding: '6px 12px', 
                background: '#2d3e50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '30px', 
                fontSize: '11px', 
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => e.target.style.background = '#1a2634'}
              onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
            >
              عرض التقرير
            </button>
            <span style={{
              background: project.status === 'completed' ? '#f0f9ff' : '#fefce8',
              color: project.status === 'completed' ? '#0369a1' : '#854d0e',
              padding: '6px 14px',
              borderRadius: '30px',
              fontSize: '12px',
              fontWeight: '600',
              border: project.status === 'completed' ? '1px solid #bae6fd' : '1px solid #fef9c3',
              whiteSpace: 'nowrap'
            }}>
              {project.status === 'completed' ? 'مكتمل' : 'مرسل'}
            </span>
          </div>
        </div>
      ))}
      {projects.length > 5 && (
        <button 
          onClick={() => setActivePage('allProjects')}
          style={{ 
            width: '100%', 
            padding: '10px', 
            background: 'none', 
            border: '1px solid #e2e8f0', 
            borderRadius: '30px', 
            marginTop: '16px', 
            cursor: 'pointer', 
            color: '#475569', 
            fontSize: '13px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
          onMouseLeave={(e) => e.target.style.background = 'none'}
        >
          عرض الكل ({projects.length})
        </button>
      )}
    </div>
  )}
</div>
            </div>
          </div>
        )}

        {/* 2️⃣ إضافة مشروع جديد */}
        {activePage === 'addProject' && (
          <div style={{ 
            background: '#ffffff', 
            padding: '32px', 
            borderRadius: '16px', 
            border: '1px solid rgba(0,0,0,0.02)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ fontSize: '18px', color: '#1a2634', marginBottom: '24px', fontWeight: '600' }}>إضافة مشروع جديد</h2>
            
            {projectMessage && (
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '10px', 
                marginBottom: '24px', 
                backgroundColor: projectMessage.type === 'success' ? '#f0fdf4' : '#fef2f2', 
                border: '1px solid', 
                borderColor: projectMessage.type === 'success' ? '#86efac' : '#fecaca',
                color: projectMessage.type === 'success' ? '#166534' : '#991b1b',
                fontSize: '14px'
              }}>
                {projectMessage.text}
              </div>
            )}

            <form onSubmit={handleAddProject}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>اسم المهندس</label>
                <select 
    value={newProject.engineer_name} 
    onChange={(e) => setNewProject({ ...newProject, engineer_name: e.target.value })} 
    style={{ 
      width: '100%', 
      padding: '10px 14px', 
      border: '1px solid #e2e8f0', 
      borderRadius: '10px', 
      fontSize: '14px', 
      transition: 'all 0.2s ease',
      backgroundColor: 'white',
      cursor: 'pointer'
    }}
    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
    required
  >
    <option value=""></option>
    {engineers.length > 0 ? (
      engineers.map((eng) => (
        <option key={eng.id} value={eng.username}>
          {eng.username}
        </option>
      ))
    ) : (
      <option value="" disabled>لا يوجد مهندسين متاحين</option>
    )}
  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>اسم المالك</label>
                  <input 
                    type="text" 
                    value={newProject.owner_name} 
                    onChange={(e) => setNewProject({ ...newProject, owner_name: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', transition: 'all 0.2s ease' }}
                    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>اسم الشركة</label>
                  <input 
                    type="text" 
                    value={newProject.company_name} 
                    onChange={(e) => setNewProject({ ...newProject, company_name: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', transition: 'all 0.2s ease' }}
                    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>الموقع</label>
                  <input 
                    type="text" 
                    value={newProject.location} 
                    onChange={(e) => setNewProject({ ...newProject, location: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', transition: 'all 0.2s ease' }}
                    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>تاريخ المشروع</label>
                  <input 
                    type="date" 
                    value={newProject.report_date} 
                    onChange={(e) => setNewProject({ ...newProject, report_date: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', transition: 'all 0.2s ease' }}
                    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>عدد العمال</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={newProject.workers_count} 
                    onChange={(e) => setNewProject({ ...newProject, workers_count: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', transition: 'all 0.2s ease' }}
                    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required 
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="submit" 
                  style={{ 
                    padding: '12px 28px', 
                    background: '#2d3e50', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '30px', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                  onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
                >
                  إنشاء المشروع
                </button>
                <button 
                  type="button" 
                  onClick={() => setActivePage('dashboard')} 
                  style={{ 
                    padding: '12px 24px', 
                    background: 'white', 
                    color: '#475569', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '30px', 
                    fontSize: '14px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  رجوع
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3️⃣ جميع المشاريع */}
        {activePage === 'allProjects' && (
          <div style={{ 
            background: '#ffffff', 
            padding: '32px', 
            borderRadius: '16px', 
            border: '1px solid rgba(0,0,0,0.02)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ fontSize: '18px', color: '#1a2634', marginBottom: '24px', fontWeight: '600' }}>جميع المشاريع</h2>

            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px' }}>
                <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '15px' }}>لا توجد مشاريع</p>
                <button 
                  onClick={() => setActivePage('addProject')} 
                  style={{ 
                    padding: '12px 24px', 
                    background: '#2d3e50', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '30px', 
                    fontSize: '14px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                  onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
                >
                  إضافة مشروع
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>رقم المشروع</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>المهندس</th>
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
                        <td style={{ padding: '16px', color: '#475569' }}>{project.engineer_name}</td>
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
                            onClick={() => handleViewReport(project.id)} 
                            style={{ 
                              padding: '6px 16px', 
                              background: '#2d3e50', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '30px', 
                              marginLeft: '8px', 
                              fontSize: '12px', 
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                            onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
                          >
                            عرض التقرير
                          </button>
                          <button 
                            onClick={() => handleEditProject(project.id)} 
                            style={{ 
                              padding: '6px 16px', 
                              background: '#f8fafc', 
                              color: '#475569', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '30px', 
                              marginLeft: '8px', 
                              fontSize: '12px', 
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                            onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                          >
                            تعديل
                          </button>
                          <button 
                            onClick={() => handleDeleteProject(project.id)} 
                            style={{ 
                              padding: '6px 16px', 
                              background: 'white', 
                              color: '#e53e3e', 
                              border: '1px solid #e53e3e', 
                              borderRadius: '30px', 
                              fontSize: '12px', 
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#e53e3e';
                              e.target.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'white';
                              e.target.style.color = '#e53e3e';
                            }}
                          >
                            حذف
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

        {/* 4️⃣ قائمة المهندسين */}
        {activePage === 'engineers' && (
          <div style={{ 
            background: '#ffffff', 
            padding: '32px', 
            borderRadius: '16px', 
            border: '1px solid rgba(0,0,0,0.02)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', color: '#1a2634', fontWeight: '600', margin: 0 }}>المهندسين</h2>
              <button 
                onClick={() => setActivePage('addEngineer')} 
                style={{ 
                  padding: '10px 20px', 
                  background: '#2d3e50', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '30px', 
                  fontSize: '13px', 
                  fontWeight: '500', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
              >
                إضافة مهندس
              </button>
            </div>
            
            {deleteMessage && (
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '10px', 
                marginBottom: '20px', 
                backgroundColor: deleteMessage.type === 'success' ? '#f0fdf4' : '#fef2f2', 
                border: '1px solid', 
                borderColor: deleteMessage.type === 'success' ? '#86efac' : '#fecaca',
                color: deleteMessage.type === 'success' ? '#166534' : '#991b1b',
                fontSize: '14px'
              }}>
                {deleteMessage.text}
              </div>
            )}
            
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px' }}>
                <p style={{ color: '#64748b', fontSize: '15px' }}>جاري التحميل...</p>
              </div>
            ) : engineers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px' }}>
                <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '15px' }}>لا يوجد مهندسين</p>
                <button 
                  onClick={() => setActivePage('addEngineer')} 
                  style={{ 
                    padding: '12px 24px', 
                    background: '#2d3e50', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '30px', 
                    fontSize: '14px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                  onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
                >
                  إضافة مهندس
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>المعرف</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>اسم المستخدم</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>الدور</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>تاريخ الإضافة</th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engineers.map((eng) => (
                      <tr key={eng.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', color: '#475569' }}>{eng.id}</td>
                        <td style={{ padding: '16px', fontWeight: '500', color: '#1a2634' }}>{eng.username}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ 
                            background: '#f1f5f9', 
                            color: '#2d3e50', 
                            padding: '6px 16px', 
                            borderRadius: '30px', 
                            fontSize: '12px', 
                            fontWeight: '500',
                            display: 'inline-block'
                          }}>
                            مهندس
                          </span>
                        </td>
                        <td style={{ padding: '16px', color: '#64748b' }}>
                          {eng.created_at ? new Date(eng.created_at).toLocaleDateString('ar-SA') : 'الآن'}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <button 
                            onClick={() => handleEditEngineer(eng.id)} 
                            style={{ 
                              padding: '6px 16px', 
                              background: '#f8fafc', 
                              color: '#475569', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '30px', 
                              marginLeft: '8px', 
                              fontSize: '12px', 
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                            onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                          >
                            تعديل
                          </button>
                          <button 
                            onClick={() => handleDeleteEngineer(eng.id)} 
                            style={{ 
                              padding: '6px 20px', 
                              background: 'white', 
                              color: '#e53e3e', 
                              border: '1px solid #e53e3e', 
                              borderRadius: '30px', 
                              fontSize: '12px', 
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#e53e3e';
                              e.target.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'white';
                              e.target.style.color = '#e53e3e';
                            }}
                          >
                            حذف
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

        {/* 5️⃣ إضافة مهندس */}
        {activePage === 'addEngineer' && (
          <div style={{ 
            background: '#ffffff', 
            padding: '32px', 
            borderRadius: '16px', 
            border: '1px solid rgba(0,0,0,0.02)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ fontSize: '18px', color: '#1a2634', marginBottom: '24px', fontWeight: '600' }}>إضافة مهندس جديد</h2>
            
            {message && (
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '10px', 
                marginBottom: '24px', 
                backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', 
                border: '1px solid', 
                borderColor: message.type === 'success' ? '#86efac' : '#fecaca',
                color: message.type === 'success' ? '#166534' : '#991b1b',
                fontSize: '14px'
              }}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleAddEngineer}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>اسم المستخدم</label>
                  <input 
                    type="text" 
                    value={newEngineer.username} 
                    onChange={(e) => setNewEngineer({ ...newEngineer, username: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', transition: 'all 0.2s ease' }}
                    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>كلمة المرور</label>
                  <input 
                    type="password" 
                    value={newEngineer.password} 
                    onChange={(e) => setNewEngineer({ ...newEngineer, password: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', transition: 'all 0.2s ease' }}
                    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required 
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="submit" 
                  style={{ 
                    padding: '12px 28px', 
                    background: '#2d3e50', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '30px', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                  onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
                >
                  إضافة مهندس
                </button>
                <button 
                  type="button" 
                  onClick={() => setActivePage('engineers')} 
                  style={{ 
                    padding: '12px 24px', 
                    background: 'white', 
                    color: '#475569', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '30px', 
                    fontSize: '14px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  عرض المهندسين
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 6️⃣ تعديل مهندس */}
        {activePage === 'editEngineer' && editingEngineer && (
          <div style={{ 
            background: '#ffffff', 
            padding: '32px', 
            borderRadius: '16px', 
            border: '1px solid rgba(0,0,0,0.02)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ fontSize: '18px', color: '#1a2634', marginBottom: '24px', fontWeight: '600' }}>
              تعديل المهندس - {editingEngineer.username}
            </h2>

            {message && (
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '10px', 
                marginBottom: '24px', 
                backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', 
                border: '1px solid', 
                borderColor: message.type === 'success' ? '#86efac' : '#fecaca',
                color: message.type === 'success' ? '#166534' : '#991b1b',
                fontSize: '14px'
              }}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleUpdateEngineer}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>اسم المستخدم</label>
                  <input 
                    type="text" 
                    value={editingEngineer.username} 
                    onChange={(e) => setEditingEngineer({ ...editingEngineer, username: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>كلمة المرور</label>
                  <input 
                    type="password" 
                    value={editingEngineer.password || ''} 
                    onChange={(e) => setEditingEngineer({ ...editingEngineer, password: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' }} 
                    placeholder="اترك فارغاً إذا لم ترد التغيير"
                  />
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                    اترك الحقل فارغاً للاحتفاظ بكلمة المرور الحالية
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="submit" 
                  style={{ 
                    padding: '12px 28px', 
                    background: '#2d3e50', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '30px', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                  onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
                >
                  حفظ التعديلات
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingEngineer(null);
                    setActivePage('engineers');
                    setMessage('');
                  }} 
                  style={{ 
                    padding: '12px 24px', 
                    background: 'white', 
                    color: '#475569', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '30px', 
                    fontSize: '14px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 7️⃣ تعديل مشروع */}
        {activePage === 'editProject' && editingProject && (
          <div style={{ 
            background: '#ffffff', 
            padding: '32px', 
            borderRadius: '16px', 
            border: '1px solid rgba(0,0,0,0.02)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ fontSize: '18px', color: '#1a2634', marginBottom: '24px', fontWeight: '600' }}>
              تعديل المشروع - {editingProject.report_number}
            </h2>

            <form onSubmit={handleUpdateProject}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>اسم المهندس</label>
                  <input 
                    type="text" 
                    value={editingProject.engineer_name} 
                    onChange={(e) => setEditingProject({ ...editingProject, engineer_name: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>اسم المالك</label>
                  <input 
                    type="text" 
                    value={editingProject.owner_name} 
                    onChange={(e) => setEditingProject({ ...editingProject, owner_name: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>اسم الشركة</label>
                  <input 
                    type="text" 
                    value={editingProject.company_name} 
                    onChange={(e) => setEditingProject({ ...editingProject, company_name: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>الموقع</label>
                  <input 
                    type="text" 
                    value={editingProject.location} 
                    onChange={(e) => setEditingProject({ ...editingProject, location: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>تاريخ المشروع</label>
                  <input 
                    type="date" 
                    value={editingProject.report_date} 
                    onChange={(e) => setEditingProject({ ...editingProject, report_date: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>عدد العمال</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={editingProject.workers_count} 
                    onChange={(e) => setEditingProject({ ...editingProject, workers_count: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block' }}>الحالة</label>
                  <select 
                    value={editingProject.status} 
                    onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' }}
                  >
                    <option value="sent">مرسل</option>
                    <option value="completed">مكتمل</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="submit" 
                  style={{ 
                    padding: '12px 28px', 
                    background: '#2d3e50', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '30px', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                  onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
                >
                  حفظ التعديلات
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingProject(null);
                    setActivePage('allProjects');
                  }} 
                  style={{ 
                    padding: '12px 24px', 
                    background: 'white', 
                    color: '#475569', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '30px', 
                    fontSize: '14px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ========== نافذة عرض التقرير الكامل ========== */}
      {showReportModal && reportDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setShowReportModal(false)}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '95%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            direction: 'rtl'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* رأس النافذة */}
            <div style={{
              padding: '24px 32px',
              borderBottom: '1px solid #edf2f7',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              borderRadius: '24px 24px 0 0',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1a2634',
                margin: 0
              }}>
                تقرير مفصل - {reportDetails.report_number}
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f1f5f9';
                  e.target.style.color = '#1a2634';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = '#64748b';
                }}
              >
                ✕
              </button>
            </div>

            {/* محتوى التقرير */}
            <div style={{ padding: '32px' }}>
              
              {/* معلومات المشروع الأساسية */}
              <div style={{
                background: '#f8fafc',
                padding: '24px',
                borderRadius: '16px',
                marginBottom: '32px',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', marginBottom: '16px' }}>معلومات المشروع</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>رقم المشروع</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a2634' }}>{reportDetails.report_number}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>المهندس</div>
                    <div style={{ fontSize: '14px', color: '#475569' }}>{reportDetails.engineer_name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>المالك</div>
                    <div style={{ fontSize: '14px', color: '#475569' }}>{reportDetails.owner_name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>الشركة</div>
                    <div style={{ fontSize: '14px', color: '#475569' }}>{reportDetails.company_name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>الموقع</div>
                    <div style={{ fontSize: '14px', color: '#475569' }}>{reportDetails.location}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>التاريخ</div>
                    <div style={{ fontSize: '14px', color: '#475569' }}>{new Date(reportDetails.report_date).toLocaleDateString('ar-SA')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>الحالة</div>
                    <span style={{
                      background: reportDetails.status === 'completed' ? '#f0f9ff' : '#fefce8',
                      color: reportDetails.status === 'completed' ? '#0369a1' : '#854d0e',
                      padding: '4px 12px',
                      borderRadius: '30px',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'inline-block'
                    }}>
                      {reportDetails.status === 'completed' ? 'مكتمل' : 'مرسل'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1️⃣ الأعمال الجارية */}
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', marginBottom: '16px' }}>الأعمال الجارية</h4>
                {workItems.length > 0 ? (
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
                        {workItems.map((item, index) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#1a2634' }}>{item.item_name}</td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{item.work_area}</td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{item.workers_count}</td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>لا توجد أعمال جارية</p>
                )}
              </div>

              {/* 2️⃣ خطة اليوم التالي */}
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', marginBottom: '16px' }}>خطة اليوم التالي</h4>
                {nextDayPlans.length > 0 ? (
                  <div>
                    {nextDayPlans.map((plan, index) => (
                      <div key={plan.id} style={{
                        padding: '12px 16px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #edf2f7',
                        marginBottom: '8px'
                      }}>
                        <p style={{ color: '#1a2634', fontSize: '14px', margin: 0, textAlign: 'center' }}>{plan.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>لا توجد خطط مضافة</p>
                )}
              </div>

              {/* 3️⃣ المواد */}
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', marginBottom: '16px' }}>المواد</h4>
                {materials.length > 0 ? (
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
                        {materials.map(material => (
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
                ) : (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>لا توجد مواد مضافة</p>
                )}
              </div>

              {/* 4️⃣ صور الموقع */}
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', marginBottom: '16px' }}>صور الموقع</h4>
                {siteImages.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                    {siteImages.map(image => (
                      <div key={image.id} style={{
                        background: '#f8fafc',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #edf2f7',
                        cursor: 'pointer'
                      }} onClick={() => window.open(`http://localhost:3000/${image.image_path}`, '_blank')}>
                        <img
                          src={`http://localhost:3000/${image.image_path}`}
                          alt="Site"
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover'
                          }}
                        />
                        <div style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                            {new Date(image.uploaded_at).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>لا توجد صور</p>
                )}
              </div>

              {/* 5️⃣ التوقيع */}
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', marginBottom: '16px' }}>التوقيع</h4>
                {signatures.length > 0 ? (
                  <div>
                    {signatures.map(signature => (
                      <div key={signature.id} style={{
                        padding: '16px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #edf2f7',
                        marginBottom: '8px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontWeight: '600', color: '#1a2634', marginBottom: '8px' }}>{signature.signed_by}</div>
                        <div style={{ color: '#475569', fontSize: '14px', marginBottom: '4px' }}>{signature.signature_data}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {new Date(signature.signed_at).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>لا يوجد توقيع</p>
                )}
              </div>

              {/* زر الإغلاق في الأسفل */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
                <button
                  onClick={() => setShowReportModal(false)}
                  style={{
                    padding: '12px 40px',
                    background: '#2d3e50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '30px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                  onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مؤشر التحميل للتقرير */}
      {isLoadingReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '24px 40px',
            borderRadius: '50px',
            fontSize: '16px',
            color: '#1a2634',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '3px solid #f1f5f9',
              borderTopColor: '#2d3e50',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            جاري تحميل التقرير...
          </div>
        </div>
      )}

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
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;