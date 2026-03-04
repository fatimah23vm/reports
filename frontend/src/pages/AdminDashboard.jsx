

// src/pages/AdminDashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import html2pdf from 'html2pdf.js';

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

  // ========== State للقوائم المنسدلة ==========
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 }); 
  const [selectedReport, setSelectedReport] = useState(null);

  // ========== State للتقارير ==========
  const [allReports, setAllReports] = useState([]);
  const [isLoadingAllReports, setIsLoadingAllReports] = useState(false);

  // ========== State للجوال ==========
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // ========== دوال التقرير PDF ==========
  const handleDownloadPDF = () => {
    if (!reportDetails) return;
    try {
      const element = document.querySelector('.report-content');
      if (!element) {
        alert('لم يتم العثور على محتوى التقرير');
        return;
      }
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `Report_${reportDetails.report_number || 'Project'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false
        },
        jsPDF: { 
          unit: 'in', 
          format: 'a4', 
          orientation: 'portrait'
        }
      };
      element.setAttribute('dir', 'rtl');
      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('خطأ في إنشاء PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    }
  };

  // ========== دوال القائمة المنسدلة ==========

const toggleDropdown = (projectId, event) => {
  event.stopPropagation();
  if (activeDropdown === projectId) {
    setActiveDropdown(null);
  } else {
    const rect = event.currentTarget.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const spaceBelow = windowHeight - rect.bottom;
    const dropdownHeight = 200; 
    
    if (isMobile) {
      // للجوال - نمركز المنيو تحت الزر إذا كان فيه مساحة كافية، وإلا فوقه
      if (spaceBelow < dropdownHeight) {
        // يظهر فوق الزر
        setPopupPosition({
          top: rect.top + window.scrollY - dropdownHeight - 5,
          left: rect.left + window.scrollX - 70,
        });
      } else {
        // يظهر تحت الزر
        setPopupPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX - 70,
        });
      }
    } else {
      // للديسكتوب - نفس المكان
      setPopupPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX - 70,
      });
    }
    setActiveDropdown(projectId);
  }
};

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

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

  const checkReportEditPermission = (createdAt) => {
    if (!createdAt) return false;
    const hoursDiff = (new Date() - new Date(createdAt)) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

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

  // ========== دوال التقارير ==========
  const fetchReportDetailsById = async (reportId) => {
    try {
      setIsLoadingReport(true);
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
      setWorkItems(Array.isArray(workItemsData) ? workItemsData : workItemsData.work_items || []);
      setNextDayPlans(Array.isArray(plansData) ? plansData : plansData.next_day_plans || []);
      setMaterials(Array.isArray(materialsData) ? materialsData : materialsData.materials || []);
      console.log('🔍 بيانات المواد الخام:', materialsData);
      setSiteImages(Array.isArray(imagesData) ? imagesData : imagesData.images || []);
      setSignatures(Array.isArray(signaturesData) ? signaturesData : signaturesData.signatures || []);
    } catch (error) {
      console.error('خطأ في جلب تفاصيل التقرير:', error);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const fetchAllReports = useCallback(async () => {
    try {
      setIsLoadingAllReports(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/daily-reports/all-reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('فشل في جلب التقارير');
      const data = await response.json();
      const reports = data.reports || [];
      const sortedReports = reports.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );
      let currentProjects = projects;
      if (currentProjects.length === 0) {
        const projResponse = await fetch('http://localhost:3000/owner-reports/reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const projData = await projResponse.json();
        currentProjects = projData || [];
      }
      const reportsWithProject = sortedReports.map(report => {
        const project = currentProjects.find(p => p.id === report.project_id);
        return {
          ...report,
          project: project || {
            report_number: report.report_number || 'غير متوفر',
            owner_name: report.owner_name || 'غير متوفر',
            location: report.location || 'غير متوفر',
            company_name: report.company_name || 'غير متوفر',
            engineer_name: report.engineer_name || 'غير معروف',
            workers_count: report.workers_count || 0,
            status: report.status || 'مرسل'
          }
        };
      });
      setAllReports(reportsWithProject);
    } catch (error) {
      console.error('خطأ في جلب جميع التقارير:', error);
    } finally {
      setIsLoadingAllReports(false);
    }
  }, []);

  const fetchProjectReport = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3000/daily-reports/project/${projectId}/latest`,
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
      console.error('❌ خطأ في جلب التقرير:', error);
      return null;
    }
  };

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

  const fetchReportDetails = async (projectId) => {
    try {
      setIsLoadingReport(true);
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
      const reportId = await fetchProjectReport(projectId);
      if (reportId) {
        await fetchReportDetailsById(reportId);
      } else {
        setWorkItems([]);
        setNextDayPlans([]);
        setMaterials([]);
        setSiteImages([]);
        setSignatures([]);
      }
      setShowReportModal(true);
    } catch (error) {
      console.error('خطأ في جلب تفاصيل التقرير:', error);
      alert('فشل الاتصال بالسيرفر');
    } finally {
      setIsLoadingReport(false);
    }
  };

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
      const loadInitialData = async () => {
        try {
          setIsLoading(true);
          await fetchEngineers();
          await fetchProjects();
          await fetchAllReports();
        } catch (error) {
          console.error('خطأ في تحميل البيانات:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadInitialData();
    }
  }, []); 

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

  // ========== كشف حجم الشاشة ==========
  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // ========== Menu Items ==========
  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم' },
    { id: 'addProject', label: 'إضافة مشروع' },
    { id: 'allProjects', label: 'جميع المشاريع' },
    { id: 'allReports', label: 'جميع التقارير' },
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


<div style={{
  width: '280px',
  background: '#ffffff',
  boxShadow: '-4px 0 20px rgba(0,0,0,0.02)',
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  height: isMobile ? '100%' : '100vh',  // ← هذا هو التعديل
  right: isMobile ? (showMobileMenu ? 0 : '-280px') : 0, 
  top: 0,
  zIndex: 1000,
  overflowY: 'auto',
  overflowX: 'hidden',  // ← أضف هذا السطر
  maxHeight: '100vh',   // ← أضف هذا السطر
  borderLeft: '1px solid rgba(0,0,0,0.02)',
  transition: 'right 0.3s ease'
}}>
  
  {/* ========== حامل اللوقو وزر الإغلاق ========== */}
  <div style={{
    position: 'relative',  // عشان نحدد موقع الزر بالنسبة لهذا العنصر
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
            order: 2,
            flex: 1
          }}>
            <div style={{ fontWeight: '600', color: '#1a2634' }}>{user?.username}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>مدير النظام</div>
          </div>
        </div>

        {/* القائمة */}
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
  marginRight: isMobile ? '0' : '280px',  // ← الديسكتوب دايمًا 280px
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

  /* 👇 هذا المهم */
  width: isMobile ? '92%' : '100%',
  maxWidth: isMobile ? '500px' : '100%',
  marginLeft: isMobile ? 'auto' : '0',
  marginRight: isMobile ? 'auto' : '0',

  minHeight: isMobile ? '190px' : '200px',
  position: 'relative'
}}>
  
  {/* ========== التاريخ ========== */}
{/* ========== التاريخ (أعلى يسار الكارد) ========== */}
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
        {menuItems.find(item => item.id === activePage)?.label || 'لوحة التحكم'}
      </h1>

      <p style={{ 
        color: '#64748b', 
        fontSize: isMobile ? '14px' : '16px',
        margin: 0,
        lineHeight: 1.5
      }}>
        {activePage === 'dashboard' && 'نظرة عامة على النظام والإحصائيات'}
        {activePage === 'addProject' && 'إنشاء مشروع جديد'}
        {activePage === 'allProjects' && `عرض جميع المشاريع (${projects.length})`}
        {activePage === 'engineers' && `عرض المهندسين (${engineers.length})`}
        {activePage === 'addEngineer' && 'إضافة مهندس جديد إلى النظام'}
        {activePage === 'editEngineer' && 'تعديل بيانات المهندس'}
        {activePage === 'allReports' && 'عرض جميع التقارير المرسلة'}
      </p>
    </div>
  </div>
</div>
   {/* ========== CONTENT BASED ON ACTIVE PAGE ========== */}

        {/* 1️⃣ لوحة التحكم - Dashboard */}
{activePage === 'dashboard' && (
  <div>

    {/* كاردز الإحصائيات */}
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: isMobile 
        ? '1fr' 
        : 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '24px',
      marginBottom: '32px',
      justifyItems: isMobile ? 'center' : 'stretch'
    }}>
      
      {[ 
        { title: 'إجمالي المشاريع', value: stats.totalProjects },
        { title: 'إجمالي المهندسين', value: stats.totalEngineers },
        { title: 'إجمالي العمال', value: stats.totalWorkers }
      ].map((card, i) => (
        <div
          key={i}
          style={{ 
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
          }}
        >
          <span style={{ 
            fontSize: '13px',
            color: '#64748b',
            fontWeight: '500',
            marginBottom: '18px'
          }}>
            {card.title}
          </span>

          <h3 style={{ 
            fontSize: isMobile ? '40px' : '36px',
            fontWeight: '700',
            color: '#1a2634',
            margin: 0
          }}>
            {card.value}
          </h3>
        </div>
      ))}
    </div>

    {/* الكاردز السفلية (المهندسين + المشاريع) */}
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '24px',
      justifyItems: isMobile ? 'center' : 'stretch'
    }}>

      {/* بطاقة المهندسين */}
      <div style={{ 
        background: '#ffffff',
        width: isMobile ? '80%' : '100%',
        maxWidth: isMobile ? '300px' : '100%',
        padding: isMobile ? '26px 20px' : '24px',
        borderRadius: '22px',
        border: '1px solid #edf2f7',
        boxShadow: '0 8px 22px rgba(0,0,0,0.06)',
        textAlign: 'right',
        minHeight: isMobile ? '280px' : 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>

        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '18px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '10px'
        }}>
          <span style={{ 
            background: '#2d3e50',
            color: 'white',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {engineers.length}
          </span>
          <h3 style={{ fontSize: '16px', margin: 0 }}>
            المهندسين
          </h3>
        </div>

        {isLoading ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>جاري التحميل...</p>
        ) : engineers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <p style={{ color: '#64748b', marginBottom: '16px', fontWeight: '500' }}>
              لا يوجد مهندسين حالياً
            </p>
            <button
              onClick={() => setActivePage('addEngineer')}
              style={{
                padding: '10px 22px',
                background: '#2d3e50',
                color: 'white',
                border: 'none',
                borderRadius: '30px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              إضافة مهندس
            </button>
          </div>
        ) : (
          engineers.slice(0, 4).map((eng, index) => (
            <div key={eng.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: index < 3 ? '1px solid #f1f5f9' : 'none'
            }}>
              <span style={{
                fontSize: '11px',
                background: '#f1f5f9',
                padding: '4px 12px',
                borderRadius: '20px'
              }}>
                مهندس
              </span>
              <span style={{ fontWeight: '500', fontSize: '13px' }}>
                {eng.username}
              </span>
            </div>
          ))
        )}
      </div>

      {/* بطاقة المشاريع */}
      <div style={{ 
        background: '#ffffff',
        width: isMobile ? '80%' : '100%',
        maxWidth: isMobile ? '300px' : '100%',
        padding: isMobile ? '26px 20px' : '24px',
        borderRadius: '22px',
        border: '1px solid #edf2f7',
        boxShadow: '0 8px 22px rgba(0,0,0,0.06)',
        textAlign: 'right',
        minHeight: isMobile ? '280px' : 'auto',
        display: 'flex',
        
        flexDirection: 'column'
      }}>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '18px',

          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '10px'
          
        }}>
          <span style={{
            background: '#2d3e50',
            color: 'white',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {projects.length}
          </span>
          <h3 style={{ fontSize: '16px', margin: 0 }}>
            آخر المشاريع
          </h3>
        </div>

        {projects.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '30px 0', fontWeight: '500' }}>
            لا توجد مشاريع حالية
          </p>
        ) : (
        projects.slice(0, 4).map((project, index) => (
  <div key={project.id} style={{
    padding: '12px 0',
    borderBottom: index < 3 ? '1px solid #f1f5f9' : 'none'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '6px'
    }}>
      <span style={{
        background: project.status === 'completed' ? '#f0f9ff' : '#fefce8',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '10px',
        order: 1  
      }}>
        {project.status === 'completed' ? 'مكتمل' : 'مرسل'}
      </span>
      <span style={{ 
        fontWeight: '600', 
        fontSize: '12px',
        order: 2  
      }}>
        {project.report_number}
      </span>
    </div>

    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <button
        onClick={() => handleViewReport(project.id)}
        style={{
          padding: '4px 14px',
          background: 'transparent',
          border: '1px solid #2d3e50',
          borderRadius: '30px',
          fontSize: '10px',
          cursor: 'pointer',
          order: 1  
        }}
      >
        عرض
      </button>
      <span style={{ 
        fontSize: '11px', 
        color: '#64748b',
        order: 2 
      }}>
        {project.owner_name}
      </span>
    </div>
  </div>
))
        )}
      </div>

    </div>
  </div>
)}
     {/* 2️⃣ جميع التقارير */}
{activePage === 'allReports' && (
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
        {allReports.length} تقرير
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

    {isLoadingAllReports ? (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px' }}>
        <p style={{ color: '#64748b', fontSize: '15px' }}>جاري تحميل التقارير...</p>
      </div>
    ) : allReports.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px' }}>
        <p style={{ color: '#64748b', fontSize: '15px' }}>لا توجد تقارير مرسلة بعد</p>
      </div>
    ) : (
      <>
        {/* للديسكتوب - جدول */}
        {!isMobile && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderRadius: '12px' }}>
                  <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600', fontSize: '13px', borderBottom: '2px solid #e2e8f0' }}>الإجراءات</th>
                  <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600', fontSize: '13px', borderBottom: '2px solid #e2e8f0' }}>المهندس</th>
                  <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600', fontSize: '13px', borderBottom: '2px solid #e2e8f0' }}>الحالة</th>
                  <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600', fontSize: '13px', borderBottom: '2px solid #e2e8f0' }}>تاريخ التقرير</th>
                  <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600', fontSize: '13px', borderBottom: '2px solid #e2e8f0' }}>الموقع</th>
                  <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600', fontSize: '13px', borderBottom: '2px solid #e2e8f0' }}>المالك</th>
                  <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600', fontSize: '13px', borderBottom: '2px solid #e2e8f0' }}>رقم المشروع</th>
                  <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600', fontSize: '13px', borderBottom: '2px solid #e2e8f0' }}>#</th>
                </tr>
              </thead>
              <tbody>
                {allReports.map((report, index) => {
                  const canEdit = checkReportEditPermission(report.created_at);
                  return (
                    <tr key={report.id} style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <button onClick={() => { setSelectedReport(report); fetchReportDetails(report.project_id); }} style={{ padding: '6px 16px', background: '#2d3e50', color: 'white', border: 'none', borderRadius: '30px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(45, 62, 80, 0.2)' }}
                          onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                          onMouseLeave={(e) => e.target.style.background = '#2d3e50'}>
                          عرض
                        </button>
                      </td>
                      <td style={{ padding: '16px', color: '#475569', textAlign: 'center', fontSize: '13px', fontWeight: '500' }}>{report.project?.engineer_name || report.engineer_name || '-'}</td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{ background: canEdit ? '#10b981' : '#94a3b8', color: 'white', padding: '6px 14px', borderRadius: '30px', fontSize: '12px', fontWeight: '600', display: 'inline-block' }}>
                          {canEdit ? 'نشط' : 'منتهي'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#475569', textAlign: 'center', fontSize: '13px' }}>{new Date(report.created_at).toLocaleDateString('en-US')}</td>
                      <td style={{ padding: '16px', color: '#1e293b', textAlign: 'center', fontSize: '13px', fontWeight: '500' }}>{report.project?.location || report.location || '-'}</td>
                      <td style={{ padding: '16px', color: '#1e293b', textAlign: 'center', fontSize: '13px', fontWeight: '500' }}>{report.project?.owner_name || report.owner_name || '-'}</td>
                      <td style={{ padding: '16px', color: '#2d3e50', fontWeight: '700', textAlign: 'center', fontSize: '13px' }}>
                        {(() => {
                          const rawNumber = report.project?.report_number || report.report_number || '';
                          const cleaned = rawNumber.replace(/-\d{8}$/, '').trim();
                          return cleaned || 'غير متوفر';
                        })()}
                      </td>
                      <td style={{ padding: '16px', fontWeight: '600', color: '#94a3b8', textAlign: 'center', fontSize: '13px' }}>{index + 1}</td>
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
            {allReports.map((report) => {
              const hoursDiff = report.created_at ? (new Date() - new Date(report.created_at)) / (1000 * 60 * 60) : 24;
              const isActive = hoursDiff < 24;
              
              return (
                <div key={report.id} style={{ 
                  background: '#ffffff',
                  border: '1px solid #edf2f7',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  borderRadius: '22px',
                  padding: '20px 16px',
                  direction: 'rtl'
                }}>
                  {/* رقم المشروع فقط (بدون الحالة) */}
                  <div style={{ 
                    marginBottom: '16px',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '12px'
                  }}>
                    <span style={{ 
                      fontWeight: '700', 
                      color: '#1a2634', 
                      fontSize: '16px',
                      display: 'block',
                      textAlign: 'right'
                    }}>
                      {(() => {
                        const rawNumber = report.project?.report_number || report.report_number || '';
                        return rawNumber.replace(/-\d{8}$/, '').trim() || 'غير متوفر';
                      })()}
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
                      <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>المهندس</div>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a2634' }}>{report.project?.engineer_name || report.engineer_name || '-'}</div>
                    </div>
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
                  </div>

                  {/* صف الحالة - نشط / منتهي فقط */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    backgroundColor: '#f8fafc',
                    padding: '10px',
                    borderRadius: '12px',
                    marginBottom: '16px'
                  }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>حالة التقرير</span>
                    <span style={{ 
                      background: isActive ? '#10b981' : '#94a3b8',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '30px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {isActive ? 'نشط' : 'منتهي'}
                    </span>
                  </div>

                  {/* زر العرض */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '16px'
                  }}>
                    <button 
                      onClick={() => { setSelectedReport(report); fetchReportDetails(report.project_id); }} 
                      style={{ 
                        width: '100%',
                        padding: '12px 0', 
                        background: '#2d3e50', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '30px', 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(45,62,80,0.2)'
                      }}
                    >
                      عرض التقرير 
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

        {/* 3️⃣ إضافة مشروع جديد */}
     {/* 3️⃣ إضافة مشروع جديد */}
{activePage === 'addProject' && (
  <div style={{ 
    background: '#ffffff', 
    padding: isMobile ? '20px' : '32px', 
    borderRadius: '24px', 
    border: '1px solid #edf2f7',
    boxShadow: '0 8px 22px rgba(0,0,0,0.06)',
    maxWidth: isMobile ? '100%' : '1200px',
    margin: '0 auto'
  }}>
    <h2 style={{ 
      fontSize: isMobile ? '20px' : '18px', 
      color: '#1a2634', 
      marginBottom: '24px', 
      fontWeight: '700', 
      textAlign: 'right',
      borderBottom: '2px solid #f1f5f9',
      paddingBottom: '16px'
    }}>
      إضافة مشروع جديد
    </h2>
    
    {projectMessage && (
      <div style={{ 
        padding: '12px 16px', 
        borderRadius: '12px', 
        marginBottom: '24px', 
        backgroundColor: projectMessage.type === 'success' ? '#f0fdf4' : '#fef2f2', 
        border: '1px solid', 
        borderColor: projectMessage.type === 'success' ? '#86efac' : '#fecaca', 
        color: projectMessage.type === 'success' ? '#166534' : '#991b1b', 
        fontSize: '14px',
        textAlign: 'right'
      }}>
        {projectMessage.text}
      </div>
    )}
    
    <form onSubmit={handleAddProject}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px', 
        marginBottom: '28px' 
      }}>
        
        {/* اسم المهندس */}
        <div>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#1a2634', marginBottom: '8px', textAlign: 'right', display: 'block' }}>
            اسم المهندس
          </label>
          <select 
            value={newProject.engineer_name} 
            onChange={(e) => setNewProject({ ...newProject, engineer_name: e.target.value })} 
            style={{ width: '100%', padding: '12px 14px', height: '48px', border: '1px solid #e2e8f0', borderRadius: '14px', fontSize: '15px', backgroundColor: 'white', cursor: 'pointer', textAlign: 'right', color: '#1a2634' }} 
            required
          >
            <option value=""></option>
            {engineers.length > 0 ? engineers.map((eng) => (
              <option key={eng.id} value={eng.username}>{eng.username}</option>
            )) : <option value="" disabled>لا يوجد مهندسين متاحين</option>}
          </select>
        </div>

        {/* اسم المالك */}
        <div>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#1a2634', marginBottom: '8px', textAlign: 'right', display: 'block' }}>
            اسم المالك
          </label>
          <input 
            type="text" 
            value={newProject.owner_name} 
            onChange={(e) => setNewProject({ ...newProject, owner_name: e.target.value })} 
            style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '14px', fontSize: '15px', textAlign: 'right', color: '#1a2634' }} 
            required 
          />
        </div>

        {/* اسم الشركة */}
        <div>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#1a2634', marginBottom: '8px', textAlign: 'right', display: 'block' }}>
            اسم الشركة
          </label>
          <input 
            type="text" 
            value={newProject.company_name} 
            onChange={(e) => setNewProject({ ...newProject, company_name: e.target.value })} 
            style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '14px', fontSize: '15px', textAlign: 'right', color: '#1a2634' }} 
            required 
          />
        </div>

        {/* الموقع */}
        <div>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#1a2634', marginBottom: '8px', textAlign: 'right', display: 'block' }}>
            الموقع
          </label>
          <input 
            type="text" 
            value={newProject.location} 
            onChange={(e) => setNewProject({ ...newProject, location: e.target.value })} 
            style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '14px', fontSize: '15px', textAlign: 'right', color: '#1a2634' }} 
            required 
          />
        </div>

        {/* تاريخ المشروع */}
        <div>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#1a2634', marginBottom: '8px', textAlign: 'right', display: 'block' }}>
            تاريخ المشروع
          </label>
          <input 
            type="date" 
            value={newProject.report_date} 
            onChange={(e) => setNewProject({ ...newProject, report_date: e.target.value })} 
            style={{ 
              width: '100%', 
              padding: '12px 14px', 
              border: '1px solid #e2e8f0', 
              borderRadius: '14px', 
              fontSize: '15px', 
              textAlign: 'right',
              direction: 'rtl',
              color: '#1a2634',
              backgroundColor: 'white'
            }} 
            required 
          />
        </div>

        {/* عدد العمال */}
        <div>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#1a2634', marginBottom: '8px', textAlign: 'right', display: 'block' }}>
            عدد العمال
          </label>
          <input 
            type="number" 
            min="1" 
            value={newProject.workers_count} 
            onChange={(e) => setNewProject({ ...newProject, workers_count: e.target.value })} 
            style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '14px', fontSize: '15px', textAlign: 'right', color: '#1a2634', backgroundColor: 'white' }} 
            required 
          />
        </div>
      </div>

      {/* الأزرار */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
        <button 
          type="submit" 
          style={{ padding: '12px 28px', background: '#2d3e50', color: 'white', border: 'none', borderRadius: '40px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 10px rgba(45,62,80,0.2)' }}
          onMouseEnter={(e) => e.target.style.background = '#1a2634'}
          onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
        >
          إنشاء المشروع
        </button>
        
        <button 
          type="button" 
          onClick={() => setActivePage('dashboard')} 
          style={{ padding: '12px 28px', background: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '40px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
          onMouseLeave={(e) => e.target.style.background = 'white'}
        >
          رجوع
        </button>
      </div>
    </form>
  </div>
)}
       
{/* 4️⃣ جميع المشاريع */}
{activePage === 'allProjects' && (
  <div style={{ 
    background: '#ffffff', 
    padding: isMobile ? '16px' : '32px', 
    borderRadius: '16px', 
    border: '1px solid rgba(0,0,0,0.02)', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
    maxWidth: isMobile ? '100%' : '1200px',
    margin: '0 auto'
  }}>
    <h2 style={{ 
      fontSize: isMobile ? '18px' : '18px', 
      color: '#1a2634', 
      marginBottom: '20px', 
      fontWeight: '600', 
      textAlign: 'right' 
    }}>
      جميع المشاريع
    </h2>
    
    {projects.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px' }}>
        <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '15px' }}>لا توجد مشاريع</p>
        <button onClick={() => setActivePage('addProject')} style={{ padding: '12px 24px', background: '#2d3e50', color: 'white', border: 'none', borderRadius: '30px', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => e.target.style.background = '#1a2634'}
          onMouseLeave={(e) => e.target.style.background = '#2d3e50'}>
          إضافة مشروع
        </button>
      </div>
    ) : (
      <>
        {/* للديسكتوب - جدول */}
        {!isMobile && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', direction: 'rtl' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>رقم المشروع</th>
                  <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>المهندس</th>
                  <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>المالك</th>
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
                    <td style={{ padding: '16px', textAlign: 'center', color: '#475569' }}>{project.workers_count}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ background: project.status === 'completed' ? '#f0f9ff' : '#fefce8', color: project.status === 'completed' ? '#0369a1' : '#854d0e', padding: '6px 16px', borderRadius: '30px', fontSize: '12px', fontWeight: '600', display: 'inline-block', border: project.status === 'completed' ? '1px solid #bae6fd' : '1px solid #fef9c3' }}>
                        {project.status === 'completed' ? 'مكتمل' : 'مرسل'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button onClick={(e) => { e.stopPropagation(); toggleDropdown(project.id, e); }} style={{ padding: '6px 16px', background: 'transparent', color: '#2d3e50', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }}
                        onMouseEnter={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#2d3e50'; }}
                        onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = '#e2e8f0'; }}>
                        الإجراءات ▼
                      </button>
                    </td>
                  </tr>
                ))}
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
    {projects.map((project) => (
      <div key={project.id} style={{ 
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
            {project.report_number}
          </span>
          <span style={{ 
            background: project.status === 'completed' ? '#f0f9ff' : '#fefce8', 
            color: project.status === 'completed' ? '#0369a1' : '#854d0e', 
            padding: '3px 10px', 
            borderRadius: '30px', 
            fontSize: '10px', 
            fontWeight: '600', 
            border: project.status === 'completed' ? '1px solid #bae6fd' : '1px solid #fef9c3' 
          }}>
            {project.status === 'completed' ? 'مكتمل' : 'مرسل'}
          </span>
        </div>

                {/* المعلومات: المهندس، المالك، العمال */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginBottom: '12px'
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>المهندس</div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a2634' }}>{project.engineer_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>المالك</div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a2634' }}>{project.owner_name}</div>
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
                  paddingTop: '10px',
                  flexDirection: 'row-reverse'
                }}>
                 
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleDropdown(project.id, e); }} 
                    style={{ 
                      flex: 1,
                      padding: '8px 0', 
                      background: 'transparent', 
                      color: '#2d3e50', 
                      border: '1px solid #2d3e50', 
                      borderRadius: '30px', 
                      fontSize: '11px', 
                      fontWeight: '500', 
                      cursor: 'pointer'
                    }}
                  >
                    الإجراءات
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    )}
  </div>
)}
        {/* 5️⃣ قائمة المهندسين */}
        {activePage === 'engineers' && (
          <div style={{ background: '#ffffff', padding: isMobile ? '16px' : '32px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', width: '100%' }}>
              <h2 style={{ fontSize: isMobile ? '16px' : '18px', color: '#1a2634', fontWeight: '600', margin: 0 }}>المهندسين</h2>
              <button onClick={() => setActivePage('addEngineer')} style={{ padding: isMobile ? '8px 16px' : '10px 20px', background: '#2d3e50', color: 'white', border: 'none', borderRadius: '30px', fontSize: isMobile ? '12px' : '13px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                onMouseLeave={(e) => e.target.style.background = '#2d3e50'}>
                إضافة مهندس
              </button>
            </div>
            {deleteMessage && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', backgroundColor: deleteMessage.type === 'success' ? '#f0fdf4' : '#fef2f2', border: '1px solid', borderColor: deleteMessage.type === 'success' ? '#86efac' : '#fecaca', color: deleteMessage.type === 'success' ? '#166534' : '#991b1b', fontSize: '14px' }}>
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
                <button onClick={() => setActivePage('addEngineer')} style={{ padding: '12px 24px', background: '#2d3e50', color: 'white', border: 'none', borderRadius: '30px', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                  onMouseLeave={(e) => e.target.style.background = '#2d3e50'}>
                  إضافة مهندس
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? '12px' : '14px', direction: 'rtl' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: isMobile ? '8px' : '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>المعرف</th>
                      <th style={{ padding: isMobile ? '8px' : '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>اسم المستخدم</th>
                      <th style={{ padding: isMobile ? '8px' : '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>المهنة</th>
                      <th style={{ padding: isMobile ? '8px' : '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engineers.map((eng) => (
                      <tr key={eng.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: isMobile ? '8px' : '16px', textAlign: 'center', color: '#475569' }}>{eng.id}</td>
                        <td style={{ padding: isMobile ? '8px' : '16px', textAlign: 'center', fontWeight: '500', color: '#1a2634' }}>{eng.username}</td>
                        <td style={{ padding: isMobile ? '8px' : '16px', textAlign: 'center' }}>
                          <span style={{ background: '#f1f5f9', color: '#2d3e50', padding: isMobile ? '4px 8px' : '6px 16px', borderRadius: '30px', fontSize: isMobile ? '11px' : '12px', fontWeight: '500', display: 'inline-block' }}>
                            مهندس
                          </span>
                        </td>
                        <td style={{ padding: isMobile ? '8px' : '16px', textAlign: 'center' }}>
                          <button onClick={(e) => { e.stopPropagation(); toggleDropdown(eng.id, e); }} style={{ padding: isMobile ? '4px 8px' : '6px 16px', background: 'transparent', color: '#2d3e50', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: isMobile ? '12px' : '13px', fontWeight: '500', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }}
                            onMouseEnter={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#2d3e50'; }}
                            onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = '#e2e8f0'; }}>
                            الإجراءات ▼
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

        {/* 6️⃣ إضافة مهندس */}
        {activePage === 'addEngineer' && (
          <div style={{ background: '#ffffff', padding: isMobile ? '16px' : '32px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: isMobile ? '16px' : '18px', color: '#1a2634', marginBottom: '24px', textAlign: 'right', fontWeight: '600' }}>إضافة مهندس جديد</h2>
            {message && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: '1px solid', borderColor: message.type === 'success' ? '#86efac' : '#fecaca', color: message.type === 'success' ? '#166534' : '#991b1b', fontSize: '14px' }}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleAddEngineer}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>اسم المستخدم</label>
                  <input type="text" value={newEngineer.username} onChange={(e) => setNewEngineer({ ...newEngineer, username: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', textAlign: 'right', fontSize: '14px', transition: 'all 0.2s ease' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>كلمة المرور</label>
                  <input type="password" value={newEngineer.password} onChange={(e) => setNewEngineer({ ...newEngineer, password: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', textAlign: 'right', fontSize: '14px', transition: 'all 0.2s ease' }} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="submit" style={{ padding: '12px 28px', background: '#2d3e50', color: 'white', border: 'none', borderRadius: '30px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                  onMouseLeave={(e) => e.target.style.background = '#2d3e50'}>
                  إضافة مهندس
                </button>
                <button type="button" onClick={() => setActivePage('engineers')} style={{ padding: '12px 24px', background: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '30px', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}>
                  عرض المهندسين
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 7️⃣ تعديل مهندس */}
        {activePage === 'editEngineer' && editingEngineer && (
          <div style={{ background: '#ffffff', padding: isMobile ? '16px' : '32px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: isMobile ? '16px' : '18px', color: '#1a2634', marginBottom: '24px', textAlign: 'right', fontWeight: '600' }}>
              تعديل المهندس - {editingEngineer.username}
            </h2>
            {message && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: '1px solid', borderColor: message.type === 'success' ? '#86efac' : '#fecaca', color: message.type === 'success' ? '#166534' : '#991b1b', fontSize: '14px' }}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleUpdateEngineer}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>اسم المستخدم</label>
                  <input type="text" value={editingEngineer.username} onChange={(e) => setEditingEngineer({ ...editingEngineer, username: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', textAlign: 'right', fontSize: '14px' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>كلمة المرور</label>
                  <input type="password" value={editingEngineer.password || ''} onChange={(e) => setEditingEngineer({ ...editingEngineer, password: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', textAlign: 'right', fontSize: '14px' }} placeholder="اترك فارغاً إذا لم ترد التغيير" />
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', textAlign: 'right', display: 'block' }}>
                    اترك الحقل فارغاً للاحتفاظ بكلمة المرور الحالية
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="submit" style={{ padding: '12px 28px', background: '#2d3e50', color: 'white', border: 'none', borderRadius: '30px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                  onMouseLeave={(e) => e.target.style.background = '#2d3e50'}>
                  حفظ التعديلات
                </button>
                <button type="button" onClick={() => { setEditingEngineer(null); setActivePage('engineers'); setMessage(''); }} style={{ padding: '12px 24px', background: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '30px', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 8️⃣ تعديل مشروع */}
        {activePage === 'editProject' && editingProject && (
          <div style={{ background: '#ffffff', padding: isMobile ? '16px' : '32px', borderRadius: '16px', textAlign: 'right', border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: isMobile ? '16px' : '18px', color: '#1a2634', marginBottom: '24px', fontWeight: '600' }}>
              تعديل المشروع - {editingProject.report_number}
            </h2>
            <form onSubmit={handleUpdateProject}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block', textAlign: 'right' }}>اسم المهندس</label><input type="text" value={editingProject.engineer_name} onChange={(e) => setEditingProject({ ...editingProject, engineer_name: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', direction: 'rtl', fontSize: '14px' }} required /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>اسم المالك</label><input type="text" value={editingProject.owner_name} onChange={(e) => setEditingProject({ ...editingProject, owner_name: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', direction: 'rtl', fontSize: '14px' }} required /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>اسم الشركة</label><input type="text" value={editingProject.company_name} onChange={(e) => setEditingProject({ ...editingProject, company_name: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', direction: 'rtl', fontSize: '14px' }} required /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>الموقع</label><input type="text" value={editingProject.location} onChange={(e) => setEditingProject({ ...editingProject, location: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', direction: 'rtl', fontSize: '14px' }} required /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>تاريخ المشروع</label><input type="date" value={editingProject.report_date} onChange={(e) => setEditingProject({ ...editingProject, report_date: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', direction: 'rtl', fontSize: '14px' }} required /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>عدد العمال</label><input type="number" min="1" value={editingProject.workers_count} onChange={(e) => setEditingProject({ ...editingProject, workers_count: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', direction: 'rtl', fontSize: '14px' }} required /></div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="submit" style={{ padding: '12px 28px', background: '#2d3e50', color: 'white', border: 'none', borderRadius: '30px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                  onMouseLeave={(e) => e.target.style.background = '#2d3e50'}>
                  حفظ التعديلات
                </button>
                <button type="button" onClick={() => { setEditingProject(null); setActivePage('allProjects'); }} style={{ padding: '12px 24px', background: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '30px', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

{/* ========== Modal عرض التقرير ========== */}
{showReportModal && reportDetails && (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowReportModal(false)}>
    <div style={{ background: '#ffffff', borderRadius: '24px', width: isMobile ? '100%' : '95%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', direction: 'rtl' }} onClick={(e) => e.stopPropagation()}>
      <div style={{ padding: isMobile ? '16px' : '24px 32px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderRadius: '24px 24px 0 0', position: 'sticky', top: 0, zIndex: 10 }}>
        <h3 style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '600', color: '#1a2634', margin: 0 }}>
          تقرير مفصل - {reportDetails.report_number}
        </h3>
        <button onClick={() => setShowReportModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b', padding: '4px 8px', borderRadius: '8px', transition: 'all 0.2s ease' }}>✕</button>
      </div>
      <div className="report-content" style={{ padding: isMobile ? '16px' : '32px' }}>
        {/* بطاقة معلومات المشروع - تصميم محسن للجوال */}
        <div style={{ 
          background: '#f8fafc', 
          padding: isMobile ? '20px' : '24px', 
          borderRadius: '16px', 
          marginBottom: '32px', 
          border: '1px solid #e2e8f0' 
        }}>
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', marginBottom: '20px' }}>معلومات المشروع</h4>
          
          {isMobile ? (
            /* للجوال - كل صف فيه معلومتين متقابلتين */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* الصف الأول: المهندس (يمين) + رقم المشروع (يسار) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e2e8f0', paddingBottom: '12px' }}>
                <div style={{ textAlign: 'right', width: '45%' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>رقم المشروع</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#2d3e50' }}>{reportDetails.report_number}</div>
                </div>
                <div style={{ textAlign: 'left', width: '45%' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>المهندس</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a2634' }}>{reportDetails.engineer_name}</div>
                </div>
              </div>
              
              {/* الصف الثاني: الموقع (يمين) + المالك (يسار) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e2e8f0', paddingBottom: '12px' }}>
                <div style={{ textAlign: 'right', width: '45%' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>المالك</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a2634' }}>{reportDetails.owner_name}</div>
                </div>
                <div style={{ textAlign: 'left', width: '45%' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>الموقع</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a2634' }}>{reportDetails.location}</div>
                </div>
              </div>
              
              {/* الصف الثالث: التاريخ (يمين) */}
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ textAlign: 'right', width: '45%' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>التاريخ</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a2634' }}>{new Date(reportDetails.report_date).toLocaleDateString('en-US')}</div>
                </div>
              </div>
            </div>
          ) : (
            /* للديسكتوب - نفس التصميم القديم */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div><div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>رقم المشروع</div><div style={{ fontSize: '14px', fontWeight: '600', color: '#1a2634' }}>{reportDetails.report_number}</div></div>
              <div><div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>المهندس</div><div style={{ fontSize: '14px', color: '#475569' }}>{reportDetails.engineer_name}</div></div>
              <div><div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>المالك</div><div style={{ fontSize: '14px', color: '#475569' }}>{reportDetails.owner_name}</div></div>
              <div><div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>الموقع</div><div style={{ fontSize: '14px', color: '#475569' }}>{reportDetails.location}</div></div>
              <div><div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>التاريخ</div><div style={{ fontSize: '14px', color: '#475569' }}>{new Date(reportDetails.report_date).toLocaleDateString('en-US')}</div></div>
            </div>
          )}
        </div>

        {/* الأعمال الجارية */}
        {workItems.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', marginBottom: '16px' }}>الأعمال الجارية</h4>

            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {workItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: '#f8fafc',
                      padding: '16px',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                  {/* البند وقيمته في نفس السطر */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', borderBottom: '1px dashed #e2e8f0', fontWeight: '600' }}>البند</span>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a2634',  borderBottom: '1px dashed #e2e8f0',textAlign: 'left', wordBreak: 'break-word' }}>
            {item.item_name}
          </span>
        </div>

                    {/* التفاصيل */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', borderBottom: '1px dashed #e2e8f0' }}>منطقة العمل</span>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634', borderBottom: '1px dashed #e2e8f0' }}>{item.work_area}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', borderBottom: '1px dashed #e2e8f0' }}>عدد العمال</span>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634', borderBottom: '1px dashed #e2e8f0' }}>{item.workers_count}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between',  alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#64748b',  }}>الكمية</span>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634',  }}>{item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* للديسكتوب - جدول */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>البند</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>منطقة العمل</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>عدد العمال</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>الكمية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workItems.map((item, index) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ padding: '12px', textAlign: 'left' }}>{item.item_name}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{item.work_area}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{item.workers_count}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
{/* المواد - مع كل البيانات */}
{materials.length > 0 && (
  <div style={{ marginBottom: '32px' }}>
    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', marginBottom: '16px' }}>
      المواد
    </h4>
    
    {isMobile ? (
      /* للجوال - كروت مع كل البيانات */
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {materials.map((material, index) => (
          <div
            key={material.id}
            style={{
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>الخامة</span>
                <span style={{ fontSize: '13px', fontWeight: '500', borderBottom: '1px dashed #e2e8f0', color: '#1a2634' }}>
                  {material.material_name}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>الكمية</span>
                <span style={{ fontSize: '13px', fontWeight: '500', borderBottom: '1px dashed #e2e8f0', color: '#1a2634' }}>
                  {material.quantity}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>مكان التوريد</span>
                <span style={{ fontSize: '13px', fontWeight: '500', borderBottom: '1px dashed #e2e8f0', color: '#1a2634' }}>
                  {material.supply_location ?? material.supplyLocation ?? 'غير محدد'}
                </span>
              </div>

     <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
  <span style={{ fontSize: '12px', color: '#64748b' }}>رقم المورد</span>
  <span style={{ fontSize: '13px', fontWeight: '500', borderBottom: '1px dashed #e2e8f0', color: '#1a2634' }}>
    {material?.supplier_contact ||    // ← استخدم رقم التواصل
     material?.supplier_name ||       // ← أو اسم المورد
     'غير محدد'}
  </span>
</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>المورد</span>
                <span style={{ fontSize: '13px', fontWeight: '500', borderBottom: '1px dashed #e2e8f0', color: '#1a2634' }}>
                  {material.supplier_name ?? material.supplierName ?? material.vendor_name ?? material.vendorName ?? 'غير محدد'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>مكان التخزين</span>
                <span style={{ fontSize: '13px', fontWeight: '500', borderBottom: '1px dashed #e2e8f0', color: '#1a2634' }}>
                  {material.storage_location ?? material.storageLocation ?? 'غير محدد'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>النوع</span>
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a2634' }}>
                  {material.type ?? material.material_type ?? material.materialType ?? 'غير محدد'}
                </span>
              </div>

            </div>
          </div>
        ))}
      </div>
    ) : (
      /* للديسكتوب - جدول */
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px', textAlign: 'center' }}>#</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>الخامة</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>الكمية</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>مكان التوريد</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>رقم المورد</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>المورد</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>مكان التخزين</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>النوع</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material, index) => (
              <tr key={material.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', textAlign: 'center' }}>{index + 1}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{material.material_name}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{material.quantity}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {material.supply_location ?? material.supplyLocation ?? '-'}
                </td>
 <td style={{ padding: '12px', textAlign: 'center' }}>
  {material?.supplier_contact || material?.supplier_name || '-'}
</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {material.supplier_name ?? material.supplierName ?? material.vendor_name ?? material.vendorName ?? '-'}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {material.storage_location ?? material.storageLocation ?? '-'}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {material.type ?? material.material_type ?? material.materialType ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}

      
       {/* خطة اليوم التالي */}
{nextDayPlans.length > 0 && (
  <div style={{ marginBottom: '32px' }}>
    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', marginBottom: '16px' }}>خطة اليوم التالي</h4>
    {isMobile ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {nextDayPlans.map((plan, index) => (
          <div key={plan.id} style={{ 
            padding: '14px 16px', 
            background: '#f8fafc', 
            borderRadius: '12px', 
            border: '1px solid #edf2f7' 
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px dashed #e2e8f0',
              paddingBottom: '8px',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>الخطة </span>
            </div>
            <div style={{ 
              color: '#1a2634', 
              fontSize: '13px', 
              margin: 0, 
              textAlign: 'right',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              lineHeight: '1.6'
            }}>
              {plan.description}
            </div>
          </div>
        ))}
      </div>
    ) : (
      nextDayPlans.map((plan) => (
        <div key={plan.id} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #edf2f7', marginBottom: '8px' }}>
          <div style={{ 
            color: '#1a2634', 
            fontSize: '14px', 
            margin: 0, 
            textAlign: 'center',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            lineHeight: '1.6'
          }}>
            {plan.description}
          </div>
        </div>
      ))
    )}
  </div>
)}

        {/* صور الموقع */}
        {siteImages.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', marginBottom: '16px' }}>صور الموقع</h4>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
              {siteImages.map((image, index) => (
                <div key={image.id} style={{ 
                  background: '#f8fafc', 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  border: '1px solid #edf2f7', 
                  cursor: 'pointer',
                  aspectRatio: '1/1'
                }} onClick={() => window.open(`http://localhost:3000/${image.image_path}`, '_blank')}>
                  <img src={`http://localhost:3000/${image.image_path}`} alt={`صورة ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    right: 0, 
                    background: 'rgba(45,62,80,0.7)', 
                    color: 'white', 
                    padding: '2px 6px', 
                    fontSize: '10px',
                    borderRadius: '8px 0 0 0'
                  }}>
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* التوقيع */}
{signatures.length > 0 && (
  <div style={{ marginBottom: '32px' }}>
    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', marginBottom: '16px' }}>التوقيع</h4>
    {signatures.map((signature, index) => (
      <div key={signature.id} style={{ 
        padding: isMobile ? '16px' : '20px', 
        background: '#f8fafc', 
        borderRadius: '12px', 
        border: '1px solid #edf2f7', 
        marginBottom: '12px',
        textAlign: 'center',
        maxWidth: isMobile ? '100%' : '400px',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>
        <div style={{ 
          fontWeight: '600', 
          color: '#1a2634', 
          fontSize: isMobile ? '16px' : '16px', 
          marginBottom: '8px' 
        }}>
          {signature.signed_by}
        </div>
        
        <div style={{ 
          color: '#475569', 
          fontSize: isMobile ? '15px' : '15px', 
          marginBottom: '12px', 
          fontStyle: 'italic',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          padding: '0 4px'
        }}>
          "{signature.signature_data}"
        </div>
        
        <div style={{ 
          fontSize: isMobile ? '12px' : '12px', 
          color: '#94a3b8', 
          borderTop: '1px dashed #d1d5db', 
          paddingTop: '10px',
          marginTop: '4px'
        }}>
          تاريخ التوقيع: {new Date(signature.signed_at).toLocaleDateString('en-US')} - {new Date(signature.signed_at).toLocaleTimeString('en-US')}
        </div>
      </div>
    ))}
  </div>
)}
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: isMobile ? '12px' : '16px', 
        padding: isMobile ? '20px 16px' : '32px',
        borderTop: '1px solid #edf2f7',
        background: '#ffffff',
        position: 'sticky',
        bottom: 0,
        zIndex: 10
      }}>
        <button onClick={handleDownloadPDF} style={{ 
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
        }}>
          تحميل PDF
        </button>
        <button onClick={() => setShowReportModal(false)} style={{ 
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
        }}>
          إغلاق
        </button>
      </div>
    </div>
  </div>
)}

     {/* ========== Popup الإجراءات ========== */}
{activeDropdown && (
  <>
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} onClick={() => setActiveDropdown(null)} />
    <div style={{ 
      position: 'fixed', 
      top: popupPosition.top, 
      left: isMobile ? '50%' : popupPosition.left,
      transform: isMobile ? 'translateX(-50%)' : 'none',
      background: 'white', 
      borderRadius: '16px', 
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)', 
      zIndex: 9999, 
      minWidth: isMobile ? '250px' : '250px', 
      maxWidth: isMobile ? '90%' : '250px',
      border: '1px solid #edf2f7', 
      overflow: 'hidden'
    }}>
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
      
      {activePage === 'allProjects' && (
        <div onClick={() => { handleViewReport(activeDropdown); setActiveDropdown(null); }} style={{ 
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
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
          عرض التقرير
        </div>
      )}
      
      <div onClick={() => { 
        if (activePage === 'allProjects') handleEditProject(activeDropdown); 
        else if (activePage === 'engineers') handleEditEngineer(activeDropdown); 
        setActiveDropdown(null); 
      }} style={{ 
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
        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
        تعديل
      </div>
      
      <div onClick={() => { 
        if (window.confirm('هل أنت متأكد من حذف هذا العنصر؟')) { 
          if (activePage === 'allProjects') handleDeleteProject(activeDropdown); 
          else if (activePage === 'engineers') handleDeleteEngineer(activeDropdown); 
        } 
        setActiveDropdown(null); 
      }} style={{ 
        padding: '14px 20px', 
        cursor: 'pointer', 
        color: '#e53e3e', 
        fontSize: '14px', 
        textAlign: 'center', 
        transition: 'all 0.2s ease', 
        fontWeight: '500' 
      }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#fff5f5'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
        حذف
      </div>
      
      <div style={{ 
        padding: '12px 20px', 
        borderTop: '1px solid #edf2f7', 
        textAlign: 'center', 
        background: '#f8fafc' 
      }}>
        <button 
          onClick={() => setActiveDropdown(null)} 
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
          onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          إلغاء
        </button>
      </div>
    </div>
  </>
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
  
  /* إظهار أسهم الـ number input في الجوال */
  @media (max-width: 768px) {
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button {
      opacity: 1;
      height: 30px;
      width: 30px;
      margin-left: 0;
      margin-right: -5px;
      background: #f1f5f9;
      border-left: 1px solid #e2e8f0;
      border-radius: 0 12px 12px 0;
      cursor: pointer;
    }
    
    /* للـ Firefox */
    input[type=number] {
      -moz-appearance: textfield;
    }
    
    input[type=number]:hover,
    input[type=number]:focus {
      -moz-appearance: number-input;
    }
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