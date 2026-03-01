



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

// ========== State للقوائم المنسدلة ==========
const [activeDropdown, setActiveDropdown] = useState(null);
const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 }); 
  //------
  const [selectedReport, setSelectedReport] = useState(null);

  // ========== State للتقارير ==========
const [allReports, setAllReports] = useState([]);
const [isLoadingAllReports, setIsLoadingAllReports] = useState(false);



// ========== دالة toggle للقائمة المنسدلة مع تحديد موقع الـ Popup ==========
const toggleDropdown = (projectId, event) => {
  // منع انتشار الحدث
  event.stopPropagation();
  
  if (activeDropdown === projectId) {
    setActiveDropdown(null);
  } else {
    // حساب موقع الزر
    const rect = event.currentTarget.getBoundingClientRect();
    setPopupPosition({
      top: rect.bottom + window.scrollY + 5,
      left: rect.left + window.scrollX - 70,
    });
    setActiveDropdown(projectId);
  }
};

// ========== إغلاق القائمة المنسدلة عند الضغط خارجها ==========
// ========== إغلاق القائمة المنسدلة عند الضغط خارجها ==========
useEffect(() => {
  const handleClickOutside = (event) => {
    // إذا كان الـ Popup مفتوح والضغط مش على الزر اللي فتحه
    if (activeDropdown) {
      setActiveDropdown(null);
    }
  };

  document.addEventListener('click', handleClickOutside);
  
  return () => {
    document.removeEventListener('click', handleClickOutside);
  };
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


// ========== دالة مساعدة للتحقق من صلاحية التعديل ==========
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


// ========== جلب تفاصيل تقرير معين (مثل SubAdminDashboard) ==========
// const fetchReportDetailsById = async (reportId) => {
//   try {
//     setIsLoadingReport(true);
//     const token = localStorage.getItem('token');

//     const [workItemsRes, plansRes, materialsRes, imagesRes, signaturesRes] = await Promise.all([
//       fetch(`http://localhost:3000/work-items/${reportId}`, {
//         headers: { 'Authorization': `Bearer ${token}` }
//       }),
//       fetch(`http://localhost:3000/next-day-plans/${reportId}`, {
//         headers: { 'Authorization': `Bearer ${token}` }
//       }),
//       fetch(`http://localhost:3000/materials/${reportId}`, {
//         headers: { 'Authorization': `Bearer ${token}` }
//       }),
//       fetch(`http://localhost:3000/site-images/${reportId}`, {
//         headers: { 'Authorization': `Bearer ${token}` }
//       }),
//       fetch(`http://localhost:3000/signatures/${reportId}`, {
//         headers: { 'Authorization': `Bearer ${token}` }
//       })
//     ]);

//     const workItemsData = await workItemsRes.json();
//     const plansData = await plansRes.json();
//     const materialsData = await materialsRes.json();
//     const imagesData = await imagesRes.json();
//     const signaturesData = await signaturesRes.json();

//     setWorkItems(Array.isArray(workItemsData) ? workItemsData : workItemsData.work_items || []);
//     setNextDayPlans(Array.isArray(plansData) ? plansData : plansData.next_day_plans || []);
//     setMaterials(Array.isArray(materialsData) ? materialsData : materialsData.materials || []);
//     setSiteImages(Array.isArray(imagesData) ? imagesData : imagesData.images || []);
//     setSignatures(Array.isArray(signaturesData) ? signaturesData : signaturesData.signatures || []);

//     console.log('✅ تم جلب تفاصيل التقرير بنجاح');

//   } catch (error) {
//     console.error('خطأ في جلب تفاصيل التقرير:', error);
//   } finally {
//     setIsLoadingReport(false);
//   }
// };

const fetchReportDetailsById = async (reportId) => {
  try {
    setIsLoadingReport(true);
    const token = localStorage.getItem('token');
    console.log('🔍 جلب تفاصيل التقرير رقم:', reportId);

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

    console.log('📡 حالة استجابة workItems:', workItemsRes.status);
    console.log('📡 حالة استجابة plans:', plansRes.status);
    console.log('📡 حالة استجابة materials:', materialsRes.status);
    console.log('📡 حالة استجابة images:', imagesRes.status);
    console.log('📡 حالة استجابة signatures:', signaturesRes.status);

    const workItemsData = await workItemsRes.json();
    const plansData = await plansRes.json();
    const materialsData = await materialsRes.json();
    const imagesData = await imagesRes.json();
    const signaturesData = await signaturesRes.json();

    console.log('📊 workItemsData:', workItemsData);
    console.log('📊 plansData:', plansData);
    console.log('📊 materialsData:', materialsData);
    console.log('📊 imagesData:', imagesData);
    console.log('📊 signaturesData:', signaturesData);

    setWorkItems(Array.isArray(workItemsData) ? workItemsData : workItemsData.work_items || []);
    setNextDayPlans(Array.isArray(plansData) ? plansData : plansData.next_day_plans || []);
    setMaterials(Array.isArray(materialsData) ? materialsData : materialsData.materials || []);
    setSiteImages(Array.isArray(imagesData) ? imagesData : imagesData.images || []);
    setSignatures(Array.isArray(signaturesData) ? signaturesData : signaturesData.signatures || []);

    console.log('✅ تم جلب تفاصيل التقرير بنجاح');

  } catch (error) {
    console.error('خطأ في جلب تفاصيل التقرير:', error);
  } finally {
    setIsLoadingReport(false);
  }
};

// ========== جلب جميع التقارير المرسلة ==========

const fetchAllReports = useCallback(async () => {
  try {
    setIsLoadingAllReports(true);
    const token = localStorage.getItem('token');

    const response = await fetch('http://localhost:3000/daily-reports/all-reports', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('فشل في جلب التقارير');
    }

    const data = await response.json();
    const reports = data.reports || [];

    // ترتيب التقارير من الأحدث إلى الأقدم
    const sortedReports = reports.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    // جلب المشاريع إذا كانت فارغة
    let currentProjects = projects;
    if (currentProjects.length === 0) {
      const token = localStorage.getItem('token');
      const projResponse = await fetch('http://localhost:3000/owner-reports/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const projData = await projResponse.json();
      currentProjects = projData || [];
    }

    // ربط كل تقرير بمشروعه
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

    console.log('✅ جميع التقارير:', reportsWithProject);
    setAllReports(reportsWithProject);

  } catch (error) {
    console.error('خطأ في جلب جميع التقارير:', error);
  } finally {
    setIsLoadingAllReports(false);
  }
}, []);







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
// جلب آخر تقرير للمشروع (معدلة مع console.log)
const fetchProjectReport = async (projectId) => {
  try {
    const token = localStorage.getItem('token');
    console.log('🔍 1. بدء جلب آخر تقرير للمشروع رقم:', projectId);
    
    const response = await fetch(
      `http://localhost:3000/daily-reports/project/${projectId}/latest`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('📡 2. حالة الاستجابة من السيرفر:', response.status);
    const data = await response.json();
    console.log('📊 3. البيانات المرسلة من السيرفر:', data);

    if (response.ok && data.report) {
      const reportId = data.report.id;
      setDailyReportId(reportId);
      console.log('✅ 4. تم العثور على آخر تقرير بنجاح! رقم التقرير:', reportId);
      return reportId;
    }
    
    if (response.status === 404) {
      console.log('ℹ️ 5. لا توجد تقارير لهذا المشروع (حالة 404)');
      return null;
    }
    
    console.log('⚠️ 5. استجابة غير متوقعة:', response.status);
    return null;
    
  } catch (error) {
    console.error('❌ خطأ في جلب التقرير:', error);
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


// دالة جلب تفاصيل التقرير الكامل (معدلة)

// دالة جلب تفاصيل التقرير الكامل (معدلة - تستخدم fetchReportDetailsById)
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
    
    // جلب آخر تقرير للمشروع
    const reportId = await fetchProjectReport(projectId);
    
    if (reportId) {
      // ✅ استخدم fetchReportDetailsById بدلاً من Promise.all
      await fetchReportDetailsById(reportId);
      console.log('✅ تم جلب بيانات التقرير:', reportId);
    } else {
      // إذا ما في تقارير، نفضي البيانات
      console.log('ℹ️ لا توجد تقارير لهذا المشروع');
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

  // دالة عرض التقرير
  const handleViewReport = (reportId) => {
    fetchReportDetails(reportId);
  };

  // ========== التهيئة ==========
 // في useEffect الموجود، أضف هذا السطر بعد fetchProjects()
// ========== التهيئة ==========
useEffect(() => {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('userRole');

  if (!token || role !== 'admin') {
    window.location.href = '/';
  } else {
    setUser({ username, role });
    
    // جلب البيانات الأساسية
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        
        // جلب المهندسين
        await fetchEngineers();
        
        // جلب المشاريع
        await fetchProjects();
        
        // بعد ما تخلص المشاريع، جلب التقارير
        // لكن استخدم دالة منفصلة أو استدع مباشر
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
  flexDirection: 'row',
  width: '100%'
}}>
  {/* التاريخ في جهة اليسار (الأول في الترتيب) */}
  <div style={{ 
    background: '#f8fafc', 
    padding: '8px 16px', 
    borderRadius: '30px',
    color: '#475569',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    flexShrink: 0
  }}>
    {new Date().toLocaleDateString('en-US')} 
  </div>
  
  {/* العنوان والنص في جهة اليمين (الثاني في الترتيب) */}
  <div style={{ 
    textAlign: 'right',
    flex: 1
  }}>
    <h1 style={{ fontSize: '24px', color: '#1a2634', marginBottom: '8px', fontWeight: '600', letterSpacing: '-0.5px' }}>
      {menuItems.find(item => item.id === activePage)?.label || 'لوحة التحكم'}
    </h1>
    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
      {activePage === 'dashboard' && 'نظرة عامة على النظام والإحصائيات'}
      {activePage === 'addProject' && 'إنشاء مشروع جديد'}
      {activePage === 'allProjects' && `عرض جميع المشاريع (${projects.length})`}
      {activePage === 'engineers' && `عرض المهندسين (${engineers.length})`}
      {activePage === 'addEngineer' && 'إضافة مهندس جديد إلى النظام'}
      {activePage === 'editEngineer' && 'تعديل بيانات المهندس'}
    </p>
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
                textAlign: 'right',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500',textAlign: 'right', letterSpacing: '0.3px' }}>إجمالي المشاريع</span>
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: '600', color: '#1a2634', margin: 0,textAlign: 'right', lineHeight: 1 }}>{stats.totalProjects}</h3>
              </div>

              <div style={{ 
                background: '#ffffff', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid rgba(0,0,0,0.02)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s ease',
                textAlign: 'right',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500',textAlign: 'right', letterSpacing: '0.3px' }}>إجمالي المهندسين</span>
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: '600', color: '#1a2634', margin: 0,textAlign: 'right', lineHeight: 1 }}>{stats.totalEngineers}</h3>
              </div>

              <div style={{ 
                background: '#ffffff', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid rgba(0,0,0,0.02)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s ease',
                textAlign: 'right',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500',textAlign: 'right', letterSpacing: '0.3px' }}>إجمالي العمال</span>
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: '600', color: '#1a2634', margin: 0,textAlign: 'right', lineHeight: 1 }}>{stats.totalWorkers}</h3>
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
  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
  width: '100%',
  overflow: 'hidden' // مهم
}}>
  <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '20px' 
  }}>
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
    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', margin: 0 }}>المهندسين</h3>
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
    <div style={{ width: '100%' }}>
      {engineers.slice(0, 5).map((eng, index) => (
        <div 
          key={eng.id} 
          style={{ 
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            padding: '12px 0',
            borderBottom: index < 4 ? '1px solid #f1f5f9' : 'none'
          }}
        >
          {/* تصنيف مهندس - على اليسار */}
          <span style={{ 
            fontSize: '12px', 
            color: '#64748b', 
            background: '#f8fafc', 
            padding: '4px 16px', 
            borderRadius: '20px',
            whiteSpace: 'nowrap',
            flex: '0 0 auto',
            marginRight: '12px',
            order: 1
          }}>
            مهندس
          </span>
          
          {/* اسم المهندس - على اليمين */}
          <div style={{ 
            flex: '1 1 auto',
            textAlign: 'right',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: '500', 
            color: '#1a2634', 
            fontSize: '14px',
            order: 2
          }}>
            {eng.username}
          </div>
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
<div style={{ 
  background: '#ffffff', 
  padding: '24px', 
  borderRadius: '16px', 
  border: '1px solid rgba(0,0,0,0.02)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
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
  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a2634', margin: 0 }}>آخر المشاريع</h3>
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
    {/* الأزرار والحالة في اليسار */}
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
    
    {/* رقم المشروع واسم المالك في اليمين */}
    <div style={{ flex: 1, textAlign: 'right' }}>
      <div style={{ fontWeight: '600', color: '#1a2634', fontSize: '14px', marginBottom: '4px' }}>{project.report_number}</div>
      <div style={{ fontSize: '12px', color: '#64748b' }}>{project.owner_name}</div>
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

{/* 5️⃣ جميع التقارير */}
{activePage === 'allReports' && (
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
        {allReports.length} تقرير
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

    {isLoadingAllReports ? (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px' }}>
        <p style={{ color: '#64748b', fontSize: '15px' }}>جاري تحميل التقارير...</p>
      </div>
    ) : allReports.length === 0 ? (
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
                المهندس
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
            {allReports.map((report, index) => {
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
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          fetchReportDetails(report.project_id);
                        }}
                        style={{
                          padding: '6px 16px',
                          background: '#2d3e50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '30px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(45, 62, 80, 0.2)'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#1a2634'}
                        onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
                      >
                        عرض
                      </button>
                    </div>
                  </td>
                  <td style={{ 
                    padding: '16px', 
                    color: '#475569', 
                    textAlign: 'center',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    {report.project?.engineer_name || report.engineer_name || '-'}
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


        {/* 2️⃣ إضافة مشروع جديد */}
        {activePage === 'addProject' && (
          <div style={{ 
            background: '#ffffff', 
            padding: '32px', 
            borderRadius: '16px', 
            border: '1px solid rgba(0,0,0,0.02)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ 
  fontSize: '18px', 
  color: '#1a2634', 
  marginBottom: '24px', 
  fontWeight: '600',
  textAlign: 'right' 
}}>إضافة مشروع جديد</h2>
            
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
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>اسم المهندس</label>
       <select 
  value={newProject.engineer_name} 
  onChange={(e) => setNewProject({ ...newProject, engineer_name: e.target.value })} 
  style={{ 
    width: '100%', 
    padding: '10px 14px', 
    height: '42px', 
    border: '1px solid #e2e8f0', 
    borderRadius: '10px', 
    fontSize: '14px', 
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    cursor: 'pointer',
    textAlign: 'right',
    boxSizing: 'border-box' 
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
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px',textAlign: 'right', display: 'block' }}>اسم المالك</label>
                  <input 
                    type="text" 
                    value={newProject.owner_name} 
                    onChange={(e) => setNewProject({ ...newProject, owner_name: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px',textAlign: 'right', transition: 'all 0.2s ease' }}
                    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px',textAlign: 'right', display: 'block' }}>اسم الشركة</label>
                  <input 
                    type="text" 
                    value={newProject.company_name} 
                    onChange={(e) => setNewProject({ ...newProject, company_name: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', textAlign: 'right', transition: 'all 0.2s ease' }}
                    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px',textAlign: 'right', display: 'block' }}>الموقع</label>
                  <input 
                    type="text" 
                    value={newProject.location} 
                    onChange={(e) => setNewProject({ ...newProject, location: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px',textAlign: 'right', transition: 'all 0.2s ease' }}
                    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required 
                  />
                </div>
              <div>
  <label
    style={{
      fontSize: '13px',
      fontWeight: '500',
      color: '#475569',
      marginBottom: '6px',
      textAlign: 'right',
      display: 'block'
    }}
  >
    تاريخ المشروع
  </label>
<input
  type="date"
  value={newProject.report_date}
  onChange={(e) =>
    setNewProject({
      ...newProject,
      report_date: e.target.value
    })
  }
  style={{
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    textAlign: 'right',
    direction: 'rtl',
    transition: 'all 0.2s ease'
  }}
  required
/>
</div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right',   flexDirection: 'row-reverse', display: 'block' }}>عدد العمال</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={newProject.workers_count} 
                    onChange={(e) => setNewProject({ ...newProject, workers_count: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px',textAlign: 'right', direction: 'rtl', transition: 'all 0.2s ease' }}
                    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required 
                  />
                </div>
              </div>
             <div style={{ 
  display: 'flex', 
  gap: '12px', 
  justifyContent: 'flex-end' 
}}>
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
            <h2 style={{ fontSize: '18px', color: '#1a2634', marginBottom: '24px', fontWeight: '600', textAlign: 'right'  }}>جميع المشاريع</h2>

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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', direction: 'rtl' }}>
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
  <div>
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleDropdown(project.id, e);
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
    {/* ✅ الآن العنوان في اليمين والزر في اليسار */}
    <div style={{ 
      display: 'flex', 
     flexDirection: 'row-reverse',
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '24px',
      width: '100%'
    }}>
      <h2 style={{ 
        fontSize: '18px', 
        color: '#1a2634', 
        fontWeight: '600', 
        margin: 0
      }}>المهندسين</h2>
      
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
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          fontSize: '14px',
          direction: 'rtl'
        }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>المعرف</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>اسم المستخدم</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>المهنة</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {engineers.map((eng) => (
              <tr key={eng.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px', textAlign: 'center', color: '#475569' }}>{eng.id}</td>
                <td style={{ padding: '16px', textAlign: 'center', fontWeight: '500', color: '#1a2634' }}>{eng.username}</td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
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
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(eng.id, e);
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
            <h2 style={{ fontSize: '18px', color: '#1a2634', marginBottom: '24px', textAlign: 'right', fontWeight: '600' }}>إضافة مهندس جديد</h2>
            
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
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px',textAlign: 'right', display: 'block' }}>اسم المستخدم</label>
                  <input 
                    type="text" 
                    value={newEngineer.username} 
                    onChange={(e) => setNewEngineer({ ...newEngineer, username: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px',textAlign: 'right', fontSize: '14px', transition: 'all 0.2s ease' }}
                    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>كلمة المرور</label>
                  <input 
                    type="password" 
                    value={newEngineer.password} 
                    onChange={(e) => setNewEngineer({ ...newEngineer, password: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px',textAlign: 'right', fontSize: '14px', transition: 'all 0.2s ease' }}
                    onFocus={(e) => e.target.style.borderColor = '#2d3e50'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end'  }}>
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
                    textAlign: 'rigth',
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
                    textAlign: 'rigth',
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
            <h2 style={{ fontSize: '18px', color: '#1a2634', marginBottom: '24px', textAlign: 'right',  fontWeight: '600' }}>
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
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px',textAlign: 'right',  display: 'block' }}>اسم المستخدم</label>
                  <input 
                    type="text" 
                    value={editingEngineer.username} 
                    onChange={(e) => setEditingEngineer({ ...editingEngineer, username: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', textAlign: 'right',  fontSize: '14px' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>كلمة المرور</label>
                  <input 
                    type="password" 
                    value={editingEngineer.password || ''} 
                    onChange={(e) => setEditingEngineer({ ...editingEngineer, password: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px',textAlign: 'right',  fontSize: '14px' }} 
                    placeholder="اترك فارغاً إذا لم ترد التغيير"
                  />
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', textAlign: 'right',  display: 'block' }}>
                    اترك الحقل فارغاً للاحتفاظ بكلمة المرور الحالية
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
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
                    textAlign: 'right', 
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
            textAlign: 'right',
            border: '1px solid rgba(0,0,0,0.02)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ fontSize: '18px', color: '#1a2634', marginBottom: '24px', fontWeight: '600' }}>
              تعديل المشروع - {editingProject.report_number}
            </h2>

            <form onSubmit={handleUpdateProject}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', display: 'block', textAlign: 'right' }}>اسم المهندس</label>
                  <input 
                    type="text" 
                    value={editingProject.engineer_name} 
                    onChange={(e) => setEditingProject({ ...editingProject, engineer_name: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px',  direction: 'rtl', fontSize: '14px' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px',textAlign: 'right', display: 'block' }}>اسم المالك</label>
                  <input 
                    type="text" 
                    value={editingProject.owner_name} 
                    onChange={(e) => setEditingProject({ ...editingProject, owner_name: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px',direction: 'rtl', fontSize: '14px' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>اسم الشركة</label>
                  <input 
                    type="text" 
                    value={editingProject.company_name} 
                    onChange={(e) => setEditingProject({ ...editingProject, company_name: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px',direction: 'rtl', fontSize: '14px' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px',textAlign: 'right',  display: 'block' }}>الموقع</label>
                  <input 
                    type="text" 
                    value={editingProject.location} 
                    onChange={(e) => setEditingProject({ ...editingProject, location: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px',direction: 'rtl', fontSize: '14px' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px', textAlign: 'right', display: 'block' }}>تاريخ المشروع</label>
                  <input 
                    type="date" 
                    value={editingProject.report_date} 
                    onChange={(e) => setEditingProject({ ...editingProject, report_date: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px',direction: 'rtl', fontSize: '14px' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '6px',textAlign: 'right',  display: 'block' }}>عدد العمال</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={editingProject.workers_count} 
                    onChange={(e) => setEditingProject({ ...editingProject, workers_count: e.target.value })} 
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px',direction: 'rtl', fontSize: '14px' }} 
                    required 
                  />
                </div>
              </div>
             <div style={{ 
  display: 'flex', 
  gap: '12px', 
  justifyContent: 'flex-end',  // ← غير هذا إلى 'flex-end'
  marginTop: '20px'            // ← أضف هذا إذا تريد مسافة من فوق
}}>
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
               {console.log('📊 workItems في الـ Modal:', workItems)}
{console.log('📊 nextDayPlans في الـ Modal:', nextDayPlans)}
{console.log('📊 materials في الـ Modal:', materials)}
{console.log('📊 siteImages في الـ Modal:', siteImages)}
{console.log('📊 signatures في الـ Modal:', signatures)}
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
    {/* ========== Popup الإجراءات ========== */}
{activeDropdown && (
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
      onClick={() => setActiveDropdown(null)}
    />
    
    {/* نافذة الـ Popup نفسها */}
    <div
      style={{
        position: 'fixed',
        top: popupPosition.top,
        left: popupPosition.left,
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
      
      {/* ✅ التحقق إذا كان العنصر مشروع (عرض التقرير فقط للمشاريع) */}
      {activePage === 'allProjects' && (
        <div
          onClick={() => {
            handleViewReport(activeDropdown);
            setActiveDropdown(null);
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
      )}
      
      {/* تعديل - متاح للكل */}
      <div
        onClick={() => {
          // التحقق إذا كان مشروع أو مهندس
          if (activePage === 'allProjects') {
            handleEditProject(activeDropdown);
          } else if (activePage === 'engineers') {
            handleEditEngineer(activeDropdown);
          }
          setActiveDropdown(null);
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
        تعديل
      </div>
      
      {/* حذف - متاح للكل */}
      <div
        onClick={() => {
          if (window.confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
            if (activePage === 'allProjects') {
              handleDeleteProject(activeDropdown);
            } else if (activePage === 'engineers') {
              handleDeleteEngineer(activeDropdown);
            }
          }
          setActiveDropdown(null);
        }}
        style={{
          padding: '14px 20px',
          cursor: 'pointer',
          color: '#e53e3e',
          fontSize: '14px',
          textAlign: 'center',
          transition: 'all 0.2s ease',
          fontWeight: '500'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#fff5f5'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
      >
        حذف
      </div>
      
      {/* زر إغلاق في الأسفل */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid #edf2f7',
        textAlign: 'center',
        background: '#f8fafc'
      }}>
        <button
          onClick={() => setActiveDropdown(null)}
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
          .full-width {
  width: 100%;
}

.react-datepicker {
  font-family: 'Inter', sans-serif;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.react-datepicker__header {
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.react-datepicker__day--selected {
  background-color: #2d3e50 !important;
}
      `}</style>
      
    </div>
  );
};

export default AdminDashboard;