

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate , useLocation} from 'react-router-dom';
import html2pdf from 'html2pdf.js';

import '@fortawesome/fontawesome-free/css/all.min.css';

const ProjectReport = () => {
  const { projectId } = useParams();
 const location = useLocation();
const { isNewReport, projectData: passedProjectData, viewOnly, viewMode, reportId, reportData } = location.state || {};
  const navigate = useNavigate();
  
  // ========== States ==========
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  const [currentDailyReport, setCurrentDailyReport] = useState(null);
  const [dailyReportId, setDailyReportId] = useState(null);
  
  // ========== State للجوال ==========
  const [isMobile, setIsMobile] = useState(false);
  
  // ✅ States جديدة للصلاحية
  const [canEdit, setCanEdit] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isReportLocked, setIsReportLocked] = useState(false);
  const [existingReports, setExistingReports] = useState([]);

  // ========== State for Work Items ==========
  const [workItems, setWorkItems] = useState([]);
  const [newWorkItem, setNewWorkItem] = useState({
    item_name: '',
    work_area: '',
    workers_count: 0,
    quantity: 0
  });

  // ========== State for Next Day Plans ==========
  const [nextDayPlans, setNextDayPlans] = useState([]);
  const [newPlan, setNewPlan] = useState({ description: '' });

  // ========== State for Materials ==========
  const [materials, setMaterials] = useState([]);
  const [newMaterial, setNewMaterial] = useState({
    material_name: '',
    material_type: '',
    quantity: 0,
    storage_location: '',
    supplier_name: '',
    supplier_contact: '',
    supply_location: ''
  });

  const inputStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    backgroundColor: '#fafbfc',
    textAlign: 'center'
  };

  // ========== State for Site Images ==========
  const [siteImages, setSiteImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // ========== State for Signatures ==========
  const [signatures, setSignatures] = useState([]);
  const [signatureData, setSignatureData] = useState('');

  // ========== حالات التعديل ==========
  const [editingWorkItem, setEditingWorkItem] = useState(null);
  const [editWorkItemData, setEditWorkItemData] = useState({
    item_name: '',
    work_area: '',
    workers_count: 0,
    quantity: 0
  });

  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editMaterialData, setEditMaterialData] = useState({
    material_name: '',
    material_type: '',
    quantity: 0,
    storage_location: '',
    supplier_name: '',
    supplier_contact: '',
    supply_location: ''
  });

  const [editingPlan, setEditingPlan] = useState(null);
  const [editPlanData, setEditPlanData] = useState('');
  const [editingSignature, setEditingSignature] = useState(null);
  const [editSignatureData, setEditSignatureData] = useState('');

  // ========== كشف حجم الشاشة ==========
  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // ========== 1️⃣ دالة التحقق من صلاحية التعديل ==========
  const checkEditPermission = useCallback((reportCreatedAt) => {
    if (!reportCreatedAt) return true;
    
    const now = new Date();
    const created = new Date(reportCreatedAt);
    const hoursDiff = (now - created) / (1000 * 60 * 60);
    
    if (hoursDiff >= 24) {
      setIsReportLocked(true);
      setCanEdit(false);
      return false;
    } else {
      setIsReportLocked(false);
      setCanEdit(true);
      
      const remainingHours = 24 - hoursDiff;
      const remainingMinutes = Math.floor((remainingHours % 1) * 60);
      setTimeRemaining(`${Math.floor(remainingHours)} ساعة و ${remainingMinutes} دقيقة`);
      
      return true;
    }
  }, []);

  // ========== 2️⃣ جلب بيانات المشروع ==========
  const fetchProjectData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3000/owner-reports/${projectId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await response.json();
      console.log('Project data:', data);

      if (response.ok && data) {
        setProject(data);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching project:', error);
      setIsLoading(false);
    }
  };

  // ========== 3️⃣ جلب التقرير اليومي ==========
  const fetchTodayDailyReport = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (isNewReport) {
        console.log('📋 بدء عملية التقرير الجديد');
        setWorkItems([]);
        setNextDayPlans([]);
        setMaterials([]);
        setSiteImages([]);
        setSignatures([]);
        
        const reportId = await getDailyReportId();
        if (reportId) {
          console.log('✅ تم التمهيد للتقرير:', reportId);
          await Promise.all([
            fetchWorkItems(reportId),
            fetchNextDayPlans(reportId),
            fetchMaterials(reportId),
            fetchSiteImages(reportId),
            fetchSignatures(reportId)
          ]);
        }
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(
        `http://localhost:3000/daily-reports/project/${projectId}/today`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      const data = await response.json();
      
      if (response.ok && data.report) {
        const reportId = data.report.id;
        setCurrentDailyReport(data.report);
        setDailyReportId(reportId);
        checkEditPermission(data.report.created_at);
        
        await Promise.all([
          fetchWorkItems(reportId),
          fetchNextDayPlans(reportId),
          fetchMaterials(reportId),
          fetchSiteImages(reportId),
          fetchSignatures(reportId)
        ]);
      }
      
    } catch (error) {
      console.error('Error fetching daily report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ========== 4️⃣ Helper لجلب ID التقرير ==========
  const getDailyReportId = async () => {
    try {
      const token = localStorage.getItem('token');
      
      console.log('🔍 البحث عن تقرير اليوم للمشروع:', projectId);
      const checkRes = await fetch(`http://localhost:3000/daily-reports/project/${projectId}/today`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (checkRes.ok) {
        const data = await checkRes.json();
        if (data.report) {
          console.log('✅ تم العثور على تقرير موجود:', data.report.id);
          
          if (data.report.status === 'submitted') {
            console.log('⚠️ التقرير مرسل مسبقاً، لا يمكن التعديل');
            setCanEdit(false);
            setIsReportLocked(true);
          }
          
          setDailyReportId(data.report.id);
          setCurrentDailyReport(data.report);
          checkEditPermission(data.report.created_at);
          return data.report.id;
        }
      }
      
      console.log('📝 لا يوجد تقرير لليوم، سيتم إنشاء تقرير جديد');
      
      const createRes = await fetch(`http://localhost:3000/daily-reports/project/${projectId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({})
      });
      
      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => ({}));
        
        if (createRes.status === 400) {
          console.log('⚠️ التقرير موجود مسبقاً، جاري جلبه');
          
          const retryRes = await fetch(`http://localhost:3000/daily-reports/project/${projectId}/today`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            if (retryData.report) {
              setDailyReportId(retryData.report.id);
              setCurrentDailyReport(retryData.report);
              checkEditPermission(retryData.report.created_at);
              return retryData.report.id;
            }
          }
        }
        
        throw new Error(errorData.message || 'فشل في إنشاء تقرير جديد');
      }
      
      const createData = await createRes.json();
      console.log('✅ تم إنشاء تقرير جديد:', createData.report.id);
      
      setDailyReportId(createData.report.id);
      setCurrentDailyReport(createData.report);
      setCanEdit(true);
      setIsReportLocked(false);
      return createData.report.id;
      
    } catch (error) {
      console.error('❌ Error in getDailyReportId:', error);
      alert('❌ فشل في جلب أو إنشاء التقرير: ' + error.message);
      return null;
    }
  };

  // ========== Work Items ==========
  const fetchWorkItems = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const id = reportId || await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/work-items/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setWorkItems(Array.isArray(data) ? data : data.work_items || []);
    } catch (error) {
      console.error('Error fetching work items:', error);
    }
  };

  const handleAddWorkItem = async (e) => {
    e.preventDefault();
    
    if (!canEdit) {
      alert('❌ لا يمكن التعديل بعد انتهاء الـ 24 ساعة');
      return;
    }
    
    if (!newWorkItem.item_name || !newWorkItem.work_area) return alert('❌ البند ومنطقة العمل مطلوبان');

    try {
      const token = localStorage.getItem('token');
      const id = await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/work-items/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newWorkItem)
      });

      if (res.ok) {
        setNewWorkItem({ item_name: '', work_area: '', workers_count: 0, quantity: 0 });
        fetchWorkItems(id);
      }
    } catch (error) {
      console.error('Error adding work item:', error);
      alert('❌ فشل في إضافة البند: ' + error.message);
    }
  };

  const handleDeleteWorkItem = async (itemId) => {
    if (!canEdit) {
      alert('❌ لا يمكن التعديل بعد انتهاء الـ 24 ساعة');
      return;
    }
    
    if (!window.confirm('هل أنت متأكد من حذف هذا البند؟')) return;

    try {
      const token = localStorage.getItem('token');
      const id = await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/work-items/${id}/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) fetchWorkItems(id);
    } catch (error) {
      console.error('Error deleting work item:', error);
      alert('❌ فشل في حذف البند: ' + error.message);
    }
  };

  // ========== دوال تعديل الأعمال الجارية ==========
  const handleEditWorkItem = (item) => {
    if (!canEdit) {
      alert('❌ لا يمكن التعديل بعد انتهاء الـ 24 ساعة');
      return;
    }
    setEditingWorkItem(item.id);
    setEditWorkItemData({
      item_name: item.item_name,
      work_area: item.work_area,
      workers_count: item.workers_count,
      quantity: item.quantity
    });
  };

  const handleUpdateWorkItem = async (itemId) => {
    if (!canEdit) return;
    
    try {
      const token = localStorage.getItem('token');
      const id = await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/work-items/${id}/${itemId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(editWorkItemData)
      });

      if (res.ok) {
        setEditingWorkItem(null);
        fetchWorkItems(id);
        alert('✅ تم تعديل البند بنجاح');
      }
    } catch (error) {
      console.error('Error updating work item:', error);
      alert('❌ فشل في تعديل البند');
    }
  };

  // ========== Next Day Plans ==========
  const fetchNextDayPlans = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const id = reportId || await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/next-day-plans/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      setNextDayPlans(Array.isArray(data) ? data : data.next_day_plans || []);
    } catch (error) {
      console.error('Error fetching next day plans:', error);
    }
  };

  const handleAddPlan = async (e) => {
    e.preventDefault();
    
    if (!canEdit) {
      alert('❌ لا يمكن التعديل بعد انتهاء الـ 24 ساعة');
      return;
    }
    
    if (!newPlan.description) return alert('❌ الخطة مطلوبة');

    try {
      const token = localStorage.getItem('token');
      const id = await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/next-day-plans/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: newPlan.description })
      });

      if (res.ok) {
        setNewPlan({ description: '' });
        fetchNextDayPlans(id);
      }
    } catch (error) {
      console.error('Error adding plan:', error);
      alert('❌ فشل في إضافة الخطة: ' + error.message);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!canEdit) {
      alert('❌ لا يمكن التعديل بعد انتهاء الـ 24 ساعة');
      return;
    }
    
    if (!window.confirm('هل أنت متأكد من حذف هذه الخطة؟')) return;

    try {
      const token = localStorage.getItem('token');
      const id = await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/next-day-plans/${id}/${planId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) fetchNextDayPlans(id);
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('❌ فشل في حذف الخطة: ' + error.message);
    }
  };

  // ========== دوال تعديل خطة الغد ==========
  const handleEditPlan = (plan) => {
    if (!canEdit) {
      alert('❌ لا يمكن التعديل بعد انتهاء الـ 24 ساعة');
      return;
    }
    setEditingPlan(plan.id);
    setEditPlanData(plan.description);
  };

  const handleUpdatePlan = async (planId) => {
    if (!canEdit) return;
    
    try {
      const token = localStorage.getItem('token');
      const id = await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/next-day-plans/${id}/${planId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ description: editPlanData })
      });

      if (res.ok) {
        setEditingPlan(null);
        fetchNextDayPlans(id);
        alert('✅ تم تعديل الخطة بنجاح');
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('❌ فشل في تعديل الخطة');
    }
  };

  // ========== Materials ==========
  const fetchMaterials = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const id = reportId || await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/materials/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMaterials(Array.isArray(data) ? data : data.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();

    if (!canEdit) {
      alert('❌ لا يمكن التعديل بعد انتهاء الـ 24 ساعة');
      return;
    }

    if (!newMaterial.material_name.trim()) {
      alert('❌ اسم الخامة مطلوب');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const id = await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/materials/${id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(newMaterial)
      });

      if (res.ok) {
        setNewMaterial({ 
          material_name: '', 
          material_type: '', 
          quantity: 0, 
          storage_location: '', 
          supplier_name: '', 
          supplier_contact: '', 
          supply_location: '' 
        });
        fetchMaterials(id);
      } else {
        const data = await res.json();
        throw new Error(data.message || 'فشل الإضافة');
      }

    } catch (error) {
      console.error('Error adding material:', error);
      alert('❌ فشل في إضافة المادة: ' + error.message);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!canEdit) {
      alert('❌ لا يمكن التعديل بعد انتهاء الـ 24 ساعة');
      return;
    }
    
    if (!window.confirm('هل أنت متأكد من حذف هذه الخامة؟')) return;

    try {
      const token = localStorage.getItem('token');
      const id = await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/materials/${id}/${materialId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) fetchMaterials(id);
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('❌ فشل في حذف المادة: ' + error.message);
    }
  };

  // ========== دوال تعديل المواد ==========
  const handleEditMaterial = (material) => {
    if (!canEdit) {
      alert('❌ لا يمكن التعديل بعد انتهاء الـ 24 ساعة');
      return;
    }
    setEditingMaterial(material.id);
    setEditMaterialData({
      material_name: material.material_name,
      material_type: material.material_type || '',
      quantity: material.quantity,
      storage_location: material.storage_location || '',
      supplier_name: material.supplier_name || '',
      supplier_contact: material.supplier_contact || '',
      supply_location: material.supply_location || ''
    });
  };

  const handleUpdateMaterial = async (materialId) => {
    if (!canEdit) return;
    
    try {
      const token = localStorage.getItem('token');
      const id = await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/materials/${id}/${materialId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(editMaterialData)
      });

      if (res.ok) {
        setEditingMaterial(null);
        fetchMaterials(id);
        alert('✅ تم تعديل المادة بنجاح');
      }
    } catch (error) {
      console.error('Error updating material:', error);
      alert('❌ فشل في تعديل المادة');
    }
  };

  // ========== Site Images ==========
  const fetchSiteImages = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const id = reportId || await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/site-images/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSiteImages(Array.isArray(data) ? data : data.images || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const handleImageUpload = async (e) => {
    if (!canEdit) {
      alert('❌ لا يمكن التعديل بعد انتهاء الـ 24 ساعة');
      return;
    }
    
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      const id = await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/site-images/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) fetchSiteImages(id);
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('❌ فشل في رفع الصورة: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!canEdit) {
      alert('❌ لا يمكن التعديل بعد انتهاء الـ 24 ساعة');
      return;
    }
    
    if (!window.confirm('هل أنت متأكد من حذف هذه الصورة؟')) return;

    try {
      const token = localStorage.getItem('token');
      const id = await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/site-images/${id}/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) fetchSiteImages(id);
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('❌ فشل في حذف الصورة: ' + error.message);
    }
  };

  // ========== Signatures ==========
  const fetchSignatures = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const id = reportId || await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/signatures/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSignatures(Array.isArray(data) ? data : data.signatures || []);
    } catch (error) {
      console.error('Error fetching signatures:', error);
    }
  };

  const handleAddSignature = async () => {
    if (!canEdit) {
      alert('❌ لا يمكن التعديل بعد انتهاء الـ 24 ساعة');
      return;
    }
    
    if (!signatureData) return alert('❌ التوقيع مطلوب');

    try {
      const token = localStorage.getItem('token');
      const username = localStorage.getItem('username');
      const id = await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/signatures/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ signed_by: username, signature_data: signatureData })
      });

      if (res.ok) {
        setSignatureData('');
        fetchSignatures(id);
      }
    } catch (error) {
      console.error('Error adding signature:', error);
      alert('❌ فشل في إضافة التوقيع: ' + error.message);
    }
  };

  const handleDeleteSignature = async (sigId) => {
    if (!canEdit) {
      alert('❌ لا يمكن التعديل بعد انتهاء الـ 24 ساعة');
      return;
    }
    
    if (!window.confirm('هل أنت متأكد من حذف هذا التوقيع؟')) return;

    try {
      const token = localStorage.getItem('token');
      const id = await getDailyReportId();
      if (!id) return;

      const res = await fetch(`http://localhost:3000/signatures/${id}/${sigId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) fetchSignatures(id);
    } catch (error) {
      console.error('Error deleting signature:', error);
      alert('❌ فشل في حذف التوقيع: ' + error.message);
    }
  };

// ========== Generate PDF using html2pdf ==========
const handleGeneratePDF = async () => {
  setIsGeneratingPDF(true);
  
  try {
    // ✅ تحديد عنصر التقرير
    const element = document.querySelector('.report-content');
    
    if (!element) {
      alert('لم يتم العثور على محتوى التقرير');
      return;
    }

    // ✅ إنشاء اسم الملف
    const fileName = project?.report_number || 'Project-Report';

    // ✅ ضبط اتجاه النص وإضافة أنماط للعربية
    element.setAttribute('dir', 'rtl');
    element.style.direction = 'rtl';
    element.style.textAlign = 'right';
    element.style.fontFamily = 'Arial, sans-serif';

    // ✅ إضافة أنماط إضافية للجداول
    const tables = element.querySelectorAll('table');
    tables.forEach(table => {
      table.style.direction = 'rtl';
      table.style.textAlign = 'right';
    });

    // ✅ إعدادات html2pdf
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `Report_${fileName}.pdf`,
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

    // ✅ تحميل PDF
    await html2pdf().set(opt).from(element).save();
    
    alert('✅ تم تحميل التقرير بنجاح');
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    alert('❌ فشل في إنشاء ملف PDF: ' + error.message);
  } finally {
    setIsGeneratingPDF(false);
  }
};

  // ========== ✅ إرسال التقرير ==========
  const handleSubmitReport = async () => {
    if (!canEdit) {
      alert('❌ انتهت صلاحية التعديل على هذا التقرير (24 ساعة)');
      return;
    }
    
    if (!dailyReportId) {
      alert('❌ لا يوجد تقرير نشط للإرسال');
      return;
    }
    
    if (currentDailyReport?.status === 'submitted') {
      alert('❌ هذا التقرير تم إرساله مسبقاً');
      return;
    }
    
    if (window.confirm('هل أنت متأكد من إرسال التقرير؟')) {
      setIsSubmitting(true);
      setSubmitMessage({ type: '', text: '' });
      
      try {
        const token = localStorage.getItem('token');
        
        console.log('Submitting report:', dailyReportId);

        const updateResponse = await fetch(`http://localhost:3000/daily-reports/${dailyReportId}/submit`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const responseData = await updateResponse.json();
        console.log('Submit response:', responseData);

        if (updateResponse.ok) {
          setSubmitMessage({ 
            type: 'success', 
            text: '✅ تم إرسال التقرير بنجاح!' 
          });
          
          setCurrentDailyReport(prev => ({
            ...prev,
            status: 'submitted',
            submitted_at: new Date().toISOString()
          }));
          
          setCanEdit(false);
          
          setTimeout(() => {
            setIsSubmitting(false);
            setSubmitMessage({});
          }, 2000);
        } else {
          throw new Error(responseData.message || 'حدث خطأ غير متوقع');
        }
      } catch (error) {
        console.error('Error submitting report:', error);
        setSubmitMessage({ 
          type: 'error', 
          text: `❌ فشل إرسال التقرير: ${error.message}` 
        });
        setIsSubmitting(false);
      }
    }
  };

  // ========== useEffect ==========
useEffect(() => {
  console.log('Project ID:', projectId);
  console.log('View Only Mode:', viewOnly);
  console.log('Report ID:', reportId);
  
  const init = async () => {
    if (passedProjectData) {
      setProject(passedProjectData);
    }
    
    await fetchProjectData();
    
    if (reportId) {
      // إذا كان هناك reportId، نجلب بيانات ذلك التقرير المحدد
      console.log('📋 جلب تقرير محدد:', reportId);
      setDailyReportId(reportId);
      
      // جلب جميع بيانات التقرير
      await Promise.all([
        fetchWorkItems(reportId),
        fetchNextDayPlans(reportId),
        fetchMaterials(reportId),
        fetchSiteImages(reportId),
        fetchSignatures(reportId)
      ]);
      
      // التحقق من صلاحية التعديل
      if (reportData?.created_at) {
        checkEditPermission(reportData.created_at);
      }
      
      setIsLoading(false);
    } else if (!viewOnly) {
      // إذا كان viewOnly = false، نجلب التقرير اليومي (وضع التعديل)
      await fetchTodayDailyReport();
    } else {
      // إذا كان viewOnly = true ولا يوجد reportId، فقط نوقف التحميل (عرض المشروع فقط)
      setIsLoading(false);
    }
  };

  if (projectId) init();
}, [projectId, viewOnly, reportId, reportData]);

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>جاري التحميل...</div>;
  if (!project) return <div style={{ padding: '40px', textAlign: 'center' }}>المشروع غير موجود</div>;

  return (
     <div className="report-content" style={{
      padding: isMobile ? '16px' : '32px',
      background: '#f5f7fa',
      minHeight: '100vh',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        padding: isMobile ? '20px' : '24px 32px',
        borderRadius: '16px',
        marginBottom: '32px',
        border: '1px solid rgba(0,0,0,0.02)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'flex-start',
        gap: isMobile ? '16px' : '0'
      }} dir="ltr">
        <div style={{ display: 'flex', gap: '12px', justifyContent: isMobile ? 'flex-start' : 'flex-start' }}>
        <div style={{ display: 'flex', gap: '12px', justifyContent: isMobile ? 'flex-flex-start' : 'flex-start' }}>
  <button
    onClick={() => navigate(-1)}
    style={{
      padding: isMobile ? '8px 16px' : '10px 20px',
      background: 'white',
      color: '#475569',
      border: '1px solid #e2e8f0',
      borderRadius: '30px',
      fontSize: isMobile ? '13px' : '14px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }}
    onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
    onMouseLeave={(e) => e.target.style.background = 'white'}
  >
    ← رجوع
  </button>
</div>
        </div>

        <div style={{ flex: 1, textAlign: 'right' }} dir="rtl">
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', color: '#1a2634', marginBottom: '16px', fontWeight: '600' }}>
            تقرير المشروع - {project.report_number}
          </h1>
          
          {/* معلومات المشروع - متجاوبة مع الجوال */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? '12px' : '16px',
            background: '#f8fafc',
            padding: isMobile ? '12px' : '16px',
            borderRadius: '12px',
            marginTop: '8px'
          }}>
            <div>
              <span style={{ color: '#64748b', fontSize: isMobile ? '11px' : '12px', display: 'block', marginBottom: '4px' }}>المالك</span>
              <span style={{ color: '#1a2634', fontSize: isMobile ? '13px' : '16px', fontWeight: '500' }}>{project.owner_name}</span>
            </div>
            
            <div>
              <span style={{ color: '#64748b', fontSize: isMobile ? '11px' : '12px', display: 'block', marginBottom: '4px' }}>الشركة</span>
              <span style={{ color: '#1a2634', fontSize: isMobile ? '13px' : '16px', fontWeight: '500' }}>{project.company_name}</span>
            </div>
            
            <div>
              <span style={{ color: '#64748b', fontSize: isMobile ? '11px' : '12px', display: 'block', marginBottom: '4px' }}>الموقع</span>
              <span style={{ color: '#1a2634', fontSize: isMobile ? '13px' : '16px', fontWeight: '500' }}>{project.location}</span>
            </div>
            
            <div>
              <span style={{ color: '#64748b', fontSize: isMobile ? '11px' : '12px', display: 'block', marginBottom: '4px' }}>المهندس</span>
              <span style={{ color: '#1a2634', fontSize: isMobile ? '13px' : '16px', fontWeight: '500' }}>{project.engineer_name}</span>
            </div>
            
            <div>
              <span style={{ color: '#64748b', fontSize: isMobile ? '11px' : '12px', display: 'block', marginBottom: '4px' }}>التاريخ</span>
              <span style={{ color: '#1a2634', fontSize: isMobile ? '13px' : '16px', fontWeight: '500' }}>
                {new Date(project.report_date).toLocaleDateString('en-US')}
              </span>
            </div>
            
            <div>
              <span style={{ color: '#64748b', fontSize: isMobile ? '11px' : '12px', display: 'block', marginBottom: '4px' }}>عدد العمال</span>
              <span style={{ color: '#1a2634', fontSize: isMobile ? '13px' : '16px', fontWeight: '500' }}>{project.workers_count}</span>
            </div>
            
            <div style={isMobile ? { gridColumn: 'span 2' } : {}}>
              <span style={{ color: '#64748b', fontSize: isMobile ? '11px' : '12px', display: 'block', marginBottom: '4px' }}>الحالة</span>
              <span style={{
                color: project.status === 'completed' ? '#059669' : '#f59e0b',
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: '600',
                background: project.status === 'completed' ? '#d1fae5' : '#fef3c7',
                padding: isMobile ? '3px 10px' : '4px 12px',
                borderRadius: '30px',
                display: 'inline-block'
              }}>
                {project.status === 'completed' ? 'مكتمل' : 'قيد الإعداد'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isReportLocked ? (
        <div style={{
          padding: isMobile ? '14px 16px' : '16px 24px',
          borderRadius: '12px',
          marginBottom: '24px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          fontSize: isMobile ? '14px' : '15px',
          fontWeight: '500',
          textAlign: 'center'
        }}>
          ⏰ هذا التقرير مغلق للتعديل (تم إرساله منذ أكثر من 24 ساعة)
        </div>
      ) : timeRemaining && (
        <div style={{
          padding: isMobile ? '12px 16px' : '12px 24px',
          borderRadius: '12px',
          marginBottom: '24px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          color: '#92400e',
          fontSize: isMobile ? '13px' : '14px',
          textAlign: 'center'
        }}>
           الوقت المتبقي للتعديل: {timeRemaining}
        </div>
      )}

      {submitMessage.text && (
        <div style={{
          padding: isMobile ? '14px 16px' : '16px 24px',
          borderRadius: '12px',
          marginBottom: '24px',
          backgroundColor: submitMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${submitMessage.type === 'success' ? '#86efac' : '#fecaca'}`,
          color: submitMessage.type === 'success' ? '#166534' : '#991b1b',
          fontSize: isMobile ? '14px' : '15px',
          fontWeight: '500',
          textAlign: 'center'
        }}>
          {submitMessage.text}
        </div>
      )}

      <div style={{
        background: '#ffffff',
        padding: isMobile ? '16px' : '32px',
        borderRadius: '16px',
        border: '1px solid rgba(0,0,0,0.02)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        
  {/* 1️⃣ الأعمال الجارية */}
  {(dailyReportId || reportId) && (
<div style={{ marginBottom: '48px' }}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    flexDirection: 'row-reverse'
  }}>
    <h3 style={{
      fontSize: isMobile ? '18px' : '20px',
      fontWeight: '600',
      margin: 0,
      textAlign: 'right',
      flex: 1,
      borderBottom: '2px solid #2d3e50',
      paddingBottom: '12px',
      color: '#1a2634'
    }}>
      الأعمال الجارية
    </h3>
  </div>
  
  {!isMobile ? (
    /* للديسكتوب - كما هو */
    <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', direction: 'rtl' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '8%' }}>#</th>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '23%' }}>رقم البند</th>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '23%' }}>منطقة العمل</th>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '15%' }}>عدد العمال</th>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '15%' }}>الكمية</th>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '16%' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {workItems.map((item, index) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              {editingWorkItem === item.id ? (
                <>
                  <td style={{ padding: '12px', textAlign: 'center', verticalAlign: 'middle' }}>{index + 1}</td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="text"
                      value={editWorkItemData.item_name}
                      onChange={(e) => setEditWorkItemData({...editWorkItemData, item_name: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#ffffff',
                        //textAlign: 'center',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        textAlign: 'right',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="text"
                      value={editWorkItemData.work_area}
                      onChange={(e) => setEditWorkItemData({...editWorkItemData, work_area: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#ffffff',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="number"
                      value={editWorkItemData.workers_count}
                      onChange={(e) => setEditWorkItemData({...editWorkItemData, workers_count: parseInt(e.target.value) || 0})}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#ffffff',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="number"
                      value={editWorkItemData.quantity}
                      onChange={(e) => setEditWorkItemData({...editWorkItemData, quantity: parseInt(e.target.value) || 0})}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#ffffff',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleUpdateWorkItem(item.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#059669';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(16,185,129,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#10b981';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(16,185,129,0.2)';
                        }}
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditingWorkItem(null)}
                        style={{
                          padding: '6px 12px',
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(107,114,128,0.2)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#4b5563';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(107,114,128,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#6b7280';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(107,114,128,0.2)';
                        }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#64748b', verticalAlign: 'middle' }}>{index + 1}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#1a2634', verticalAlign: 'middle' }}>{item.item_name}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569', verticalAlign: 'middle' }}>{item.work_area}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569', verticalAlign: 'middle' }}>{item.workers_count}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569', verticalAlign: 'middle' }}>{item.quantity}</td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {!viewOnly && canEdit ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEditWorkItem(item)}
                          disabled={!canEdit}
                          style={{
                            padding: '6px 12px',
                            background: !canEdit ? '#e2e8f0' : '#f97316',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: !canEdit ? 'not-allowed' : 'pointer',
                            opacity: !canEdit ? 0.5 : 1,
                            transition: 'all 0.2s ease',
                            boxShadow: !canEdit ? 'none' : '0 2px 4px rgba(249,115,22,0.2)'
                          }}
                          onMouseEnter={(e) => {
                            if (canEdit) {
                              e.currentTarget.style.background = '#ea580c';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(249,115,22,0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (canEdit) {
                              e.currentTarget.style.background = '#f97316';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(249,115,22,0.2)';
                            }
                          }}
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteWorkItem(item.id)}
                          disabled={!canEdit}
                          style={{
                            padding: '6px 12px',
                            background: !canEdit ? '#e2e8f0' : '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: !canEdit ? 'not-allowed' : 'pointer',
                            opacity: !canEdit ? 0.5 : 1,
                            transition: 'all 0.2s ease',
                            boxShadow: !canEdit ? 'none' : '0 2px 4px rgba(239,68,68,0.2)'
                          }}
                          onMouseEnter={(e) => {
                            if (canEdit) {
                              e.currentTarget.style.background = '#dc2626';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(239,68,68,0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (canEdit) {
                              e.currentTarget.style.background = '#ef4444';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(239,68,68,0.2)';
                            }
                          }}
                        >
                          حذف
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                </>
              )}
            </tr>
          ))}
          {workItems.length === 0 && (
            <tr>
              <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                لا توجد أعمال جارية مضافة
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  ) : (
    /* للجوال - كروت */
    <div style={{ marginBottom: '20px' }}>
      {workItems.map((item, index) => (
        <div
          key={item.id}
          style={{
            padding: '16px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #edf2f7',
            marginBottom: '12px',
            textAlign: 'right',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}
        >
          {editingWorkItem === item.id ? (
            /* وضع التعديل */
            <div>
              <input
                type="text"
                value={editWorkItemData.item_name}
                onChange={(e) => setEditWorkItemData({...editWorkItemData, item_name: e.target.value})}
                placeholder="رقم البند"
                style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'right' }}
              />
              <input
                type="text"
                value={editWorkItemData.work_area}
                onChange={(e) => setEditWorkItemData({...editWorkItemData, work_area: e.target.value})}
                placeholder="منطقة العمل"
                style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'right' }}
              />
              <input
                type="number"
                value={editWorkItemData.workers_count}
                onChange={(e) => setEditWorkItemData({...editWorkItemData, workers_count: parseInt(e.target.value) || 0})}
                placeholder="عدد العمال"
                style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'right' }}
              />
              <input
                type="number"
                value={editWorkItemData.quantity}
                onChange={(e) => setEditWorkItemData({...editWorkItemData, quantity: parseInt(e.target.value) || 0})}
                placeholder="الكمية"
                style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'right' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleUpdateWorkItem(item.id)}
                  style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px' }}
                >
                  حفظ
                </button>
                <button
                  onClick={() => setEditingWorkItem(null)}
                  style={{ flex: 1, padding: '10px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            /* وضع العرض */
            <div>
              <div style={{ marginBottom: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>رقم البند</span>
                <span style={{ color: '#1a2634', fontSize: '14px', fontWeight: '500' }}>{item.item_name}</span>
              </div>
              <div style={{ marginBottom: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>منطقة العمل</span>
                <span style={{ color: '#1a2634', fontSize: '14px', fontWeight: '500' }}>{item.work_area}</span>
              </div>
              <div style={{ marginBottom: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>عدد العمال</span>
                <span style={{ color: '#1a2634', fontSize: '14px', fontWeight: '500' }}>{item.workers_count}</span>
              </div>
              <div style={{ marginBottom: '12px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>الكمية</span>
                <span style={{ color: '#1a2634', fontSize: '14px', fontWeight: '500' }}>{item.quantity}</span>
              </div>
              {!viewOnly && canEdit && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEditWorkItem(item)}
                    disabled={!canEdit}
                    style={{ flex: 1, padding: '10px', background: '#f97316', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px' }}
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteWorkItem(item.id)}
                    disabled={!canEdit}
                    style={{ flex: 1, padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px' }}
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )}

  {!viewOnly && canEdit && (
    <form onSubmit={handleAddWorkItem} style={{ 
      display: 'flex', 
      gap: isMobile ? '12px' : '12px', 
      alignItems: 'center',
      width: '100%',
      flexDirection: isMobile ? 'column' : 'row',
      marginTop: '24px',
      padding: isMobile ? '16px' : '16px',
      background: '#f8fafc',
      borderRadius: '12px'
    }} dir="rtl">
      
      {!isMobile && <div style={{ width: '8%' }}></div>}
      
      <input
        type="text"
        value={newWorkItem.item_name}
        onChange={(e) => setNewWorkItem({ ...newWorkItem, item_name: e.target.value })}
        placeholder="رقم البند"
        style={{
          width: isMobile ? '100%' : '23%',
          padding: isMobile ? '12px' : '10px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: isMobile ? '14px' : '14px',
          backgroundColor: '#ffffff',
          textAlign: 'center'
        }}
        required
      />
      
      <input
        type="text"
        value={newWorkItem.work_area}
        onChange={(e) => setNewWorkItem({ ...newWorkItem, work_area: e.target.value })}
        placeholder="منطقة العمل"
        style={{
          width: isMobile ? '100%' : '23%',
          padding: isMobile ? '12px' : '10px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: isMobile ? '14px' : '14px',
          backgroundColor: '#ffffff',
          textAlign: 'center'
        }}
        required
      />
      
      <input
        type="number"
        value={newWorkItem.workers_count}
        onChange={(e) => setNewWorkItem({ ...newWorkItem, workers_count: parseInt(e.target.value) || 0 })}
        placeholder="عدد العمال"
        style={{
          width: isMobile ? '100%' : '15%',
          padding: isMobile ? '12px' : '10px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: isMobile ? '14px' : '14px',
          backgroundColor: '#ffffff',
          textAlign: 'center'
        }}
      />
      
      <input
        type="number"
        value={newWorkItem.quantity}
        onChange={(e) => setNewWorkItem({ ...newWorkItem, quantity: parseInt(e.target.value) || 0 })}
        placeholder="الكمية"
        style={{
          width: isMobile ? '100%' : '15%',
          padding: isMobile ? '12px' : '10px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: isMobile ? '14px' : '14px',
          backgroundColor: '#ffffff',
          textAlign: 'center'
        }}
      />
      
      <button
        type="submit"
        style={{
          width: isMobile ? '100%' : '16%',
          padding: isMobile ? '12px' : '10px 24px',
          background: '#2d3e50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: isMobile ? '14px' : '14px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        إضافة
      </button>
    </form>
  )}
</div>
  )}

{/* 2️⃣ خطة اليوم التالي */}
{(dailyReportId || reportId) && (
<div style={{ marginBottom: '48px' }}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    flexDirection: 'row-reverse'
  }}>
    <h3 style={{
      fontSize: '20px',
      fontWeight: '600',
      margin: 0,
      textAlign: 'right',
      flex: 1,
      borderBottom: '2px solid #2d3e50',
      paddingBottom: '12px',
      color: '#1a2634'
    }}>
      خطة اليوم التالي
    </h3>
  </div>
  
  {/* للديسكتوب */}
  {!isMobile && (
    <div style={{ marginBottom: '20px' }}>
      {nextDayPlans.map((plan) => (
        <div
          key={plan.id}
          style={{
            padding: '16px 20px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #edf2f7',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            textAlign: 'right',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'}
        >
          {editingPlan === plan.id && !viewOnly && canEdit ? (
            <>
              {/* الأزرار في اليسار - وضع التعديل */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleUpdatePlan(plan.id)}
                  style={{
                    padding: '8px 20px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#059669';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(16,185,129,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#10b981';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(16,185,129,0.2)';
                  }}
                >
                  حفظ
                </button>
                <button
                  onClick={() => setEditingPlan(null)}
                  style={{
                    padding: '8px 20px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(107,114,128,0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#4b5563';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(107,114,128,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#6b7280';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(107,114,128,0.2)';
                  }}
                >
                  إلغاء
                </button>
              </div>

              {/* حقل الإدخال */}
              <input
                type="text"
                value={editPlanData}
                onChange={(e) => setEditPlanData(e.target.value)}
                style={{
                  flex: 1,
                  marginRight: '16px',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  textAlign: 'right',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#f97316';
                  e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </>
          ) : (
            <>
              {/* الأزرار في اليسار - وضع العرض */}
              {!viewOnly && canEdit ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEditPlan(plan)}
                    disabled={!canEdit}
                    style={{
                      padding: '8px 20px',
                      background: !canEdit ? '#e2e8f0' : '#f97316',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: !canEdit ? 'not-allowed' : 'pointer',
                      opacity: !canEdit ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      boxShadow: !canEdit ? 'none' : '0 2px 4px rgba(249,115,22,0.2)'
                    }}
                    onMouseEnter={(e) => {
                      if (canEdit) {
                        e.currentTarget.style.background = '#ea580c';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(249,115,22,0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (canEdit) {
                        e.currentTarget.style.background = '#f97316';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(249,115,22,0.2)';
                      }
                    }}
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    disabled={!canEdit}
                    style={{
                      padding: '8px 20px',
                      background: !canEdit ? '#e2e8f0' : '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: !canEdit ? 'not-allowed' : 'pointer',
                      opacity: !canEdit ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      boxShadow: !canEdit ? 'none' : '0 2px 4px rgba(239,68,68,0.2)'
                    }}
                    onMouseEnter={(e) => {
                      if (canEdit) {
                        e.currentTarget.style.background = '#dc2626';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(239,68,68,0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (canEdit) {
                        e.currentTarget.style.background = '#ef4444';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(239,68,68,0.2)';
                      }
                    }}
                  >
                    حذف
                  </button>
                </div>
              ) : (
                <div style={{ width: '110px' }}></div> // عنصر فارغ للمحاذاة
              )}

              {/* نص الخطة في اليمين */}
              <p
                style={{
                  flex: 1,
                  margin: 0,
                  marginRight: '16px',
                  color: '#1a2634',
                  fontSize: '14px',
                  textAlign: 'right',
                  lineHeight: '1.6'
                }}
              >
                {plan.description}
              </p>
            </>
          )}
        </div>
      ))}

      {nextDayPlans.length === 0 && (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            color: '#94a3b8',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1'
          }}
        >
          لا توجد خطط مضافة
        </div>
      )}
    </div>
  )}


   {/* للجوال - كروت */}
  {isMobile && (
    <div style={{ marginBottom: '20px' }}>
      {nextDayPlans.map((plan) => (
        <div
          key={plan.id}
          style={{
            padding: '16px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #edf2f7',
            marginBottom: '12px',
            textAlign: 'right',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}
        >
          {editingPlan === plan.id && !viewOnly && canEdit ? (
            <div>
              <input
                type="text"
                value={editPlanData}
                onChange={(e) => setEditPlanData(e.target.value)}
                placeholder="عدل الخطة"
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  textAlign: 'right'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleUpdatePlan(plan.id)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                >
                  حفظ
                </button>
                <button
                  onClick={() => setEditingPlan(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <div>
             <div style={{ marginBottom: '12px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
  <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>الخطة</span>
  <div style={{ 
    color: '#1a2634', 
    fontSize: '14px', 
    fontWeight: '500',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    lineHeight: '1.6',
    marginTop: '4px'
  }}>
    {plan.description}
  </div>
</div>
              {!viewOnly && canEdit && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEditPlan(plan)}
                    disabled={!canEdit}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#f97316',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    disabled={!canEdit}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {nextDayPlans.length === 0 && (
        <div style={{
          padding: '30px',
          textAlign: 'center',
          color: '#94a3b8',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1'
        }}>
          لا توجد خطط مضافة
        </div>
      )}
    </div>
  )}

 {!viewOnly && canEdit && (
  <form onSubmit={handleAddPlan} style={{ 
    display: 'flex', 
    flexDirection: isMobile ? 'column' : 'row', // في الجوال: عمودي
    gap: '12px', 
    alignItems: isMobile ? 'stretch' : 'center',
    marginTop: '24px',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '12px',
    width: '100%'
  }} dir="rtl"
  >  
    
    {/* حقل الإدخال - في الأعلى للجوال */}
    <textarea
      value={newPlan.description}
      onChange={(e) => setNewPlan({ description: e.target.value })}
      placeholder="أضف خطة جديدة..."
      rows={isMobile ? 4 : 2}
      style={{
        width: '100%',
        padding: '14px 16px',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: isMobile ? '15px' : '14px',
        backgroundColor: '#ffffff',
        textAlign: 'right',
        transition: 'all 0.2s ease',
        outline: 'none',
        resize: 'vertical',
        minHeight: isMobile ? '120px' : '60px',
        maxHeight: '250px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        lineHeight: '1.6',
        wordWrap: 'break-word',
        whiteSpace: 'pre-wrap',
        overflowY: 'auto',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#2d3e50';
        e.target.style.boxShadow = '0 0 0 3px rgba(45,62,80,0.1)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#e2e8f0';
        e.target.style.boxShadow = 'none';
      }}
      required
    />
    
    {/* زر الإضافة - في الأسفل للجوال */}
     <button
        type="submit"
        style={{
          width: isMobile ? '100%' : '16%',
          padding: isMobile ? '12px' : '10px 24px',
          background: '#2d3e50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: isMobile ? '14px' : '14px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        إضافة
      </button>
  </form>
)}
</div>
)}

      {/* 3️⃣ المواد */}
  {(dailyReportId || reportId) && (
<div style={{ marginBottom: '48px' }}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    flexDirection: 'row-reverse'
  }}>
    <h3 style={{
      fontSize: isMobile ? '18px' : '20px',
      fontWeight: '600',
      margin: 0,
      textAlign: 'right',
      flex: 1,
      borderBottom: '2px solid #2d3e50',
      paddingBottom: '12px',
      color: '#1a2634'
    }}>
      المواد
    </h3>
  </div>
  
  {!isMobile ? (
    /* للديسكتوب - كما هو */
    <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', direction: 'rtl', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '12%' }}>اسم الخامة</th>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '10%' }}>النوع</th>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '8%' }}>الكمية</th>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '12%' }}>مكان التخزين</th>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '12%' }}>المورد</th>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '10%' }}>رقم المورد</th>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '12%' }}>مكان التوريد</th>
            <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '12%' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {materials.map(material => (
            <tr key={material.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              {editingMaterial === material.id && !viewOnly && canEdit ? (
                <>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="text"
                      value={editMaterialData.material_name}
                      onChange={(e) => setEditMaterialData({...editMaterialData, material_name: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: '#ffffff',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                         
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="text"
                      value={editMaterialData.material_type}
                      onChange={(e) => setEditMaterialData({...editMaterialData, material_type: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: '#ffffff',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="number"
                      value={editMaterialData.quantity}
                      onChange={(e) => setEditMaterialData({...editMaterialData, quantity: parseInt(e.target.value) || 0})}
                      style={{
                        width: '100%',
                        padding: '8px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: '#ffffff',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="text"
                      value={editMaterialData.storage_location}
                      onChange={(e) => setEditMaterialData({...editMaterialData, storage_location: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: '#ffffff',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="text"
                      value={editMaterialData.supplier_name}
                      onChange={(e) => setEditMaterialData({...editMaterialData, supplier_name: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: '#ffffff',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="text"
                      value={editMaterialData.supplier_contact}
                      onChange={(e) => setEditMaterialData({...editMaterialData, supplier_contact: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: '#ffffff',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="text"
                      value={editMaterialData.supply_location}
                      onChange={(e) => setEditMaterialData({...editMaterialData, supply_location: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: '#ffffff',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleUpdateMaterial(material.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(16,185,129,0.2)',
                          minWidth: '60px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#059669';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(16,185,129,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#10b981';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(16,185,129,0.2)';
                        }}
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditingMaterial(null)}
                        style={{
                          padding: '6px 12px',
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(107,114,128,0.2)',
                          minWidth: '60px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#4b5563';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(107,114,128,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#6b7280';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(107,114,128,0.2)';
                        }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#1a2634', verticalAlign: 'middle' }}>{material.material_name}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569', verticalAlign: 'middle' }}>{material.material_type || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569', verticalAlign: 'middle' }}>{material.quantity}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569', verticalAlign: 'middle' }}>{material.storage_location || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569', verticalAlign: 'middle' }}>{material.supplier_name || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569', verticalAlign: 'middle' }}>{material.supplier_contact || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569', verticalAlign: 'middle' }}>{material.supply_location || '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {!viewOnly && canEdit ? (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleEditMaterial(material)}
                          disabled={!canEdit}
                          style={{
                            padding: '6px 12px',
                            background: !canEdit ? '#e2e8f0' : '#f97316',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: !canEdit ? 'not-allowed' : 'pointer',
                            opacity: !canEdit ? 0.5 : 1,
                            transition: 'all 0.2s ease',
                            boxShadow: !canEdit ? 'none' : '0 2px 4px rgba(249,115,22,0.2)',
                            minWidth: '60px'
                          }}
                          onMouseEnter={(e) => {
                            if (canEdit) {
                              e.currentTarget.style.background = '#ea580c';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(249,115,22,0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (canEdit) {
                              e.currentTarget.style.background = '#f97316';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(249,115,22,0.2)';
                            }
                          }}
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(material.id)}
                          disabled={!canEdit}
                          style={{
                            padding: '6px 12px',
                            background: !canEdit ? '#e2e8f0' : '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: !canEdit ? 'not-allowed' : 'pointer',
                            opacity: !canEdit ? 0.5 : 1,
                            transition: 'all 0.2s ease',
                            boxShadow: !canEdit ? 'none' : '0 2px 4px rgba(239,68,68,0.2)',
                            minWidth: '60px'
                          }}
                          onMouseEnter={(e) => {
                            if (canEdit) {
                              e.currentTarget.style.background = '#dc2626';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(239,68,68,0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (canEdit) {
                              e.currentTarget.style.background = '#ef4444';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(239,68,68,0.2)';
                            }
                          }}
                        >
                          حذف
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                </>
              )}
            </tr>
          ))}
          {materials.length === 0 && (
            <tr>
              <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                لا توجد مواد مضافة
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  ) : (
    /* للجوال - كروت */
    <div style={{ marginBottom: '20px' }}>
      {materials.map((material) => (
        <div
          key={material.id}
          style={{
            padding: '16px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #edf2f7',
            marginBottom: '12px',
             textAlign: 'right',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}
        >
          {editingMaterial === material.id && !viewOnly && canEdit ? (
            <div>
              <input
                type="text"
                value={editMaterialData.material_name}
                onChange={(e) => setEditMaterialData({...editMaterialData, material_name: e.target.value})}
                placeholder="اسم الخامة"
                style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'right' }}
              />
              <input
                type="text"
                value={editMaterialData.material_type}
                onChange={(e) => setEditMaterialData({...editMaterialData, material_type: e.target.value})}
                placeholder="النوع"
                style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'right' }}
              />
              <input
                type="number"
                value={editMaterialData.quantity}
                onChange={(e) => setEditMaterialData({...editMaterialData, quantity: parseInt(e.target.value) || 0})}
                placeholder="الكمية"
                style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'right' }}
              />
              <input
                type="text"
                value={editMaterialData.storage_location}
                onChange={(e) => setEditMaterialData({...editMaterialData, storage_location: e.target.value})}
                placeholder="مكان التخزين"
                style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'right' }}
              />
              <input
                type="text"
                value={editMaterialData.supplier_name}
                onChange={(e) => setEditMaterialData({...editMaterialData, supplier_name: e.target.value})}
                placeholder="المورد"
                style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'right' }}
              />
              <input
                type="text"
                value={editMaterialData.supplier_contact}
                onChange={(e) => setEditMaterialData({...editMaterialData, supplier_contact: e.target.value})}
                placeholder="رقم المورد"
                style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'right' }}
              />
              <input
                type="text"
                value={editMaterialData.supply_location}
                onChange={(e) => setEditMaterialData({...editMaterialData, supply_location: e.target.value})}
                placeholder="مكان التوريد"
                style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'right' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleUpdateMaterial(material.id)}
                  style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px' }}
                >
                  حفظ
                </button>
                <button
                  onClick={() => setEditingMaterial(null)}
                  style={{ flex: 1, padding: '10px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>اسم الخامة</span>
                <span style={{ color: '#1a2634', fontSize: '14px', fontWeight: '500' }}>{material.material_name}</span>
              </div>
              <div style={{ marginBottom: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>النوع</span>
                <span style={{ color: '#1a2634', fontSize: '14px', fontWeight: '500' }}>{material.material_type || '-'}</span>
              </div>
              <div style={{ marginBottom: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>الكمية</span>
                <span style={{ color: '#1a2634', fontSize: '14px', fontWeight: '500' }}>{material.quantity}</span>
              </div>
              <div style={{ marginBottom: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>مكان التخزين</span>
                <span style={{ color: '#1a2634', fontSize: '14px', fontWeight: '500' }}>{material.storage_location || '-'}</span>
              </div>
              <div style={{ marginBottom: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>المورد</span>
                <span style={{ color: '#1a2634', fontSize: '14px', fontWeight: '500' }}>{material.supplier_name || '-'}</span>
              </div>
              <div style={{ marginBottom: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>رقم المورد</span>
                <span style={{ color: '#1a2634', fontSize: '14px', fontWeight: '500' }}>{material.supplier_contact || '-'}</span>
              </div>
              <div style={{ marginBottom: '12px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>مكان التوريد</span>
                <span style={{ color: '#1a2634', fontSize: '14px', fontWeight: '500' }}>{material.supply_location || '-'}</span>
              </div>
              {!viewOnly && canEdit && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEditMaterial(material)}
                    disabled={!canEdit}
                    style={{ flex: 1, padding: '10px', background: '#f97316', color: 'white', border: 'none', borderRadius: '6px' }}
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteMaterial(material.id)}
                    disabled={!canEdit}
                    style={{ flex: 1, padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px' }}
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )}

  {!viewOnly && canEdit && (
    <div style={{ 
      overflowX: 'auto', 
      marginTop: '24px',
      padding: isMobile ? '16px' : '16px',
      background: '#f8fafc',
      borderRadius: '12px'
    }}>
      {!isMobile ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', direction: 'rtl', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td style={{ width: '12%', padding: '4px' }}>
                <input
                  type="text"
                  placeholder="اسم الخامة *"
                  value={newMaterial.material_name}
                  onChange={(e) => setNewMaterial({ ...newMaterial, material_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2d3e50';
                    e.target.style.boxShadow = '0 0 0 3px rgba(45,62,80,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
              </td>
              <td style={{ width: '10%', padding: '4px' }}>
                <input
                  type="text"
                  placeholder="النوع"
                  value={newMaterial.material_type}
                  onChange={(e) => setNewMaterial({ ...newMaterial, material_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2d3e50';
                    e.target.style.boxShadow = '0 0 0 3px rgba(45,62,80,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </td>
              <td style={{ width: '8%', padding: '4px' }}>
                <input
                  type="number"
                  value={newMaterial.quantity}
                  onChange={(e) => setNewMaterial({ ...newMaterial, quantity: parseInt(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '10px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2d3e50';
                    e.target.style.boxShadow = '0 0 0 3px rgba(45,62,80,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </td>
              <td style={{ width: '12%', padding: '4px' }}>
                <input
                  type="text"
                  placeholder="مكان التخزين"
                  value={newMaterial.storage_location}
                  onChange={(e) => setNewMaterial({ ...newMaterial, storage_location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2d3e50';
                    e.target.style.boxShadow = '0 0 0 3px rgba(45,62,80,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </td>
              <td style={{ width: '12%', padding: '4px' }}>
                <input
                  type="text"
                  placeholder="المورد"
                  value={newMaterial.supplier_name}
                  onChange={(e) => setNewMaterial({ ...newMaterial, supplier_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2d3e50';
                    e.target.style.boxShadow = '0 0 0 3px rgba(45,62,80,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </td>
              <td style={{ width: '10%', padding: '4px' }}>
                <input
                  type="text"
                  placeholder="رقم المورد"
                  value={newMaterial.supplier_contact}
                  onChange={(e) => setNewMaterial({ ...newMaterial, supplier_contact: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2d3e50';
                    e.target.style.boxShadow = '0 0 0 3px rgba(45,62,80,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </td>
              <td style={{ width: '12%', padding: '4px' }}>
                <input
                  type="text"
                  placeholder="مكان التوريد"
                  value={newMaterial.supply_location}
                  onChange={(e) => setNewMaterial({ ...newMaterial, supply_location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2d3e50';
                    e.target.style.boxShadow = '0 0 0 3px rgba(45,62,80,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </td>
              <td style={{ width: '12%', padding: '4px', textAlign: 'center' }}>
                <button
                  onClick={handleAddMaterial}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    background: '#2d3e50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(45,62,80,0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#1a2634';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px rgba(45,62,80,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#2d3e50';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(45,62,80,0.2)';
                  }}
                >
                  إضافة
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        /* للجوال - إضافة المواد بشكل عمودي */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="اسم الخامة *"
            value={newMaterial.material_name}
            onChange={(e) => setNewMaterial({ ...newMaterial, material_name: e.target.value })}
            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', textAlign: 'right' }}
          />
          <input
            type="text"
            placeholder="النوع"
            value={newMaterial.material_type}
            onChange={(e) => setNewMaterial({ ...newMaterial, material_type: e.target.value })}
            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', textAlign: 'right' }}
          />
          <input
            type="number"
            placeholder="الكمية"
            value={newMaterial.quantity}
            onChange={(e) => setNewMaterial({ ...newMaterial, quantity: parseInt(e.target.value) || 0 })}
            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', textAlign: 'right' }}
          />
          <input
            type="text"
            placeholder="مكان التخزين"
            value={newMaterial.storage_location}
            onChange={(e) => setNewMaterial({ ...newMaterial, storage_location: e.target.value })}
            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', textAlign: 'right' }}
          />
          <input
            type="text"
            placeholder="المورد"
            value={newMaterial.supplier_name}
            onChange={(e) => setNewMaterial({ ...newMaterial, supplier_name: e.target.value })}
            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', textAlign: 'right' }}
          />
          <input
            type="text"
            placeholder="رقم المورد"
            value={newMaterial.supplier_contact}
            onChange={(e) => setNewMaterial({ ...newMaterial, supplier_contact: e.target.value })}
            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', textAlign: 'right' }}
          />
          <input
            type="text"
            placeholder="مكان التوريد"
            value={newMaterial.supply_location}
            onChange={(e) => setNewMaterial({ ...newMaterial, supply_location: e.target.value })}
            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', textAlign: 'right' }}
          />
          <button
            onClick={handleAddMaterial}
            style={{ width: '100%', padding: '14px', background: '#2d3e50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
          >
             إضافة 
          </button>
        </div>
      )}
    </div>
  )}
</div>
  )}

      {/* 4️⃣ صور الموقع */}
      {(dailyReportId || reportId) && (
        <div style={{ marginBottom: '48px', direction: 'rtl' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexDirection: 'row-reverse'
          }}>
            <h3 style={{
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '600',
              margin: 0,
              textAlign: 'right',
              flex: 1,
              borderBottom: '2px solid #2d3e50',
              paddingBottom: '12px',
              color: '#1a2634'
            }}>
              صور الموقع
            </h3>
          </div>

          {!viewOnly && canEdit && (
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '16px',
                  padding: isMobile ? '20px' : '30px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2d3e50'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                onClick={() => document.getElementById('imageUpload').click()}
              >
                <input
                  id="imageUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: isMobile ? '28px' : '32px', marginBottom: '8px' }}>📸</div>
                <p style={{ color: '#475569', fontSize: isMobile ? '13px' : '14px', fontWeight: '500', marginBottom: '4px' }}>
                  {uploading ? 'جاري الرفع...' : 'اضغط لرفع صورة'}
                </p>
                <p style={{ color: '#94a3b8', fontSize: isMobile ? '11px' : '12px' }}>
                  PNG, JPG, GIF
                </p>
              </div>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: isMobile ? '10px' : '20px'
          }}>
            {siteImages.map(image => (
              <div
                key={image.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid #edf2f7',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'}
              >
                <img
                  src={`http://localhost:3000/${image.image_path}`}
                  alt="Site"
                  style={{
                    width: '100%',
                    height: isMobile ? '100px' : '140px',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onClick={() => window.open(`http://localhost:3000/${image.image_path}`, '_blank')}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                />
                <div style={{
                  padding: isMobile ? '8px' : '12px',
                  display: 'flex',
                  flexDirection: 'row', // تم التعديل: ترتيب العناصر أفقياً
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  {/* تم تبديل أماكن العناصر: التاريخ في اليمين والزر في اليسار */}
                  <span style={{ fontSize: isMobile ? '10px' : '11px', color: '#64748b' }}>
                    {new Date(image.uploaded_at).toLocaleDateString('en-US')}
                  </span>

                  {!viewOnly && canEdit ? (
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      disabled={!canEdit}
                      style={{
                        padding: isMobile ? '4px 10px' : '6px 16px',
                        background: !canEdit ? '#e2e8f0' : '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: isMobile ? '10px' : '12px',
                        fontWeight: '500',
                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                        opacity: !canEdit ? 0.5 : 1,
                        transition: 'all 0.2s ease',
                        boxShadow: !canEdit ? 'none' : '0 2px 4px rgba(239,68,68,0.2)'
                      }}
                      onMouseEnter={(e) => {
                        if (canEdit) {
                          e.currentTarget.style.background = '#dc2626';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(239,68,68,0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (canEdit) {
                          e.currentTarget.style.background = '#ef4444';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(239,68,68,0.2)';
                        }
                      }}
                    >
                      حذف
                    </button>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                  )}
                </div>
              </div>
            ))}

            {siteImages.length === 0 && (
              <div style={{
                gridColumn: '1/-1',
                textAlign: 'center',
                padding: isMobile ? '30px' : '40px',
                color: '#94a3b8',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1'
              }}>
                لا توجد صور
              </div>
            )}
          </div>
        </div>
      )}

{/* 5️⃣ التوقيع */}
{(dailyReportId || reportId) && (
<div style={{ marginBottom: '48px' }}>
  {/* هيدر التوقيع */}
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      marginBottom: '20px',
      flexDirection: 'row-reverse'
    }}
  >
    <h3
      style={{
        fontSize: '20px',
        fontWeight: '600',
        margin: 0,
        textAlign: 'right',
        flex: 1,
        borderBottom: '2px solid #2d3e50',
        paddingBottom: '12px',
        color: '#1a2634'
      }}
    >
      التوقيع
    </h3>
  </div>

  {/* للديسكتوب */}
  {!isMobile && (
    <div style={{ marginBottom: '20px' }}>
      {Array.isArray(signatures) &&
        signatures.map((signature) => (
          <div
            key={signature.id}
            style={{
              padding: '20px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #edf2f7',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              textAlign: 'right',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'}
          >
            {editingSignature === signature.id && !viewOnly && canEdit ? (
              <>
                {/* أزرار الحفظ والإلغاء في اليسار - وضع التعديل */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleUpdateSignature(signature.id)}
                    style={{
                      padding: '6px 16px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px', // تم التعديل: 8px (مربع)
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#059669';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(16,185,129,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#10b981';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(16,185,129,0.2)';
                    }}
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setEditingSignature(null)}
                    style={{
                      padding: '6px 16px',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px', // تم التعديل: 8px (مربع)
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(107,114,128,0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#4b5563';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(107,114,128,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#6b7280';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(107,114,128,0.2)';
                    }}
                  >
                    إلغاء
                  </button>
                </div>

                {/* حقل تعديل التوقيع */}
                <input
                  type="text"
                  value={editSignatureData}
                  onChange={(e) => setEditSignatureData(e.target.value)}
                  style={{
                    flex: 1,
                    marginRight: '16px',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f97316';
                    e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </>
            ) : (
              <>
                {/* أزرار تعديل وحذف في اليسار - وضع العرض */}
                {!viewOnly && canEdit ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* زر التعديل */}
                    <button
                      onClick={() => handleEditSignature(signature)}
                      disabled={!canEdit}
                      style={{
                        padding: '6px 16px',
                        background: !canEdit ? '#e2e8f0' : '#f97316',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px', // تم التعديل: 8px (مربع)
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                        opacity: !canEdit ? 0.5 : 1,
                        transition: 'all 0.2s ease',
                        boxShadow: !canEdit ? 'none' : '0 2px 4px rgba(249,115,22,0.2)'
                      }}
                      onMouseEnter={(e) => {
                        if (canEdit) {
                          e.currentTarget.style.background = '#ea580c';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(249,115,22,0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (canEdit) {
                          e.currentTarget.style.background = '#f97316';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(249,115,22,0.2)';
                        }
                      }}
                    >
                      تعديل
                    </button>

                    {/* زر الحذف */}
                    <button
                      onClick={() => handleDeleteSignature(signature.id)}
                      disabled={!canEdit}
                      style={{
                        padding: '6px 16px',
                        background: !canEdit ? '#e2e8f0' : '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px', // تم التعديل: 8px (مربع)
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                        opacity: !canEdit ? 0.5 : 1,
                        transition: 'all 0.2s ease',
                        boxShadow: !canEdit ? 'none' : '0 2px 4px rgba(239,68,68,0.2)'
                      }}
                      onMouseEnter={(e) => {
                        if (canEdit) {
                          e.currentTarget.style.background = '#dc2626';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(239,68,68,0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (canEdit) {
                          e.currentTarget.style.background = '#ef4444';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(239,68,68,0.2)';
                        }
                      }}
                    >
                      حذف
                    </button>
                  </div>
                ) : (
                  <div style={{ width: '110px' }}></div>
                )}

                {/* محتوى التوقيع في الوسط */}
                <div
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    margin: '0 20px'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1a2634', fontSize: '15px' }}>
                    {signature.signed_by}
                  </div>
                  <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '4px' }}>
                    {signature.signature_data}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {signature.signed_at &&
                      new Date(signature.signed_at).toLocaleDateString('en-US')}
                  </div>
                </div>

                {/* عنصر فارغ للموازنة */}
                <div style={{ width: '110px' }}></div>
              </>
            )}
          </div>
        ))}

      {Array.isArray(signatures) && signatures.length === 0 && (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            color: '#94a3b8',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1'
          }}
        >
          لا يوجد توقيع
        </div>
      )}
    </div>
  )}

  {/* للجوال - كروت (تم تعديلها فقط لتحريك الأزرار للأسفل) */}
  {isMobile && (
    <div style={{ marginBottom: '20px' }}>
      {signatures.map((signature) => (
        <div
          key={signature.id}
          style={{
            padding: '16px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #edf2f7',
            marginBottom: '12px',
            textAlign: 'right',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}
        >
          {editingSignature === signature.id && !viewOnly && canEdit ? (
            <div>
              <input
                type="text"
                value={editSignatureData}
                onChange={(e) => setEditSignatureData(e.target.value)}
                placeholder="عدل التوقيع"
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  textAlign: 'right'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleUpdateSignature(signature.id)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                >
                  حفظ
                </button>
                <button
                  onClick={() => setEditingSignature(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: '600', color: '#1a2634', fontSize: '16px',textAlign: 'center', marginBottom: '8px' }}>{signature.signed_by}</div>
                          <div style={{ color: '#475569', fontSize: '15px', marginBottom: '12px',textAlign: 'center',  fontStyle: 'italic' }}>"{signature.signature_data}"</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8',textAlign: 'center',  borderTop: '1px dashed #d1d5db', paddingTop: '10px' }}>
                            تاريخ التوقيع: {new Date(signature.signed_at).toLocaleDateString('en-US')} - {new Date(signature.signed_at).toLocaleTimeString('en-US')}
                          </div>
              
              {/* أزرار تعديل وحذف - تم إنزالها للأسفل مع مسافة */}
              {!viewOnly && canEdit && (
                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  marginTop: '12px',
                  borderTop: '1px dashed #e2e8f0',
                  paddingTop: '16px'
                }}>
                  <button
                    onClick={() => {
                      setEditingSignature(signature.id);
                      setEditSignatureData(signature.signature_data);
                    }}
                    disabled={!canEdit}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#f97316',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteSignature(signature.id)}
                    disabled={!canEdit}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {signatures.length === 0 && (
        <div style={{
          padding: '30px',
          textAlign: 'center',
          color: '#94a3b8',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1'
        }}>
          لا توجد توقيعات
        </div>
      )}
    </div>
  )}

  {/* قسم إضافة توقيع جديد - تم تعديله للجوال فقط (حقل كبير والزر تحته) */}
  {!viewOnly && canEdit && (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '12px',
        alignItems: isMobile ? 'stretch' : 'center',
        marginTop: '24px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '12px',
        width: '100%'
      }}
      dir="rtl"
    >
      {/* حقل الإدخال - مكبر للجوال */}
      <textarea
        value={signatureData}
        onChange={(e) => setSignatureData(e.target.value)}
        placeholder="أدخل نص التوقيع"
        rows={isMobile ? 3 : 1}
        style={{
          width: '100%',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          fontSize: isMobile ? '16px' : '14px',
          backgroundColor: '#ffffff',
          textAlign: 'right',
          transition: 'all 0.2s ease',
          outline: 'none',
          resize: 'vertical',
          minHeight: isMobile ? '100px' : 'auto',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          lineHeight: '1.6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#2d3e50';
          e.target.style.boxShadow = '0 0 0 3px rgba(45,62,80,0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e2e8f0';
          e.target.style.boxShadow = 'none';
        }}
      />

      {/* زر الإضافة - تحت للجوال */}
      <button
        onClick={handleAddSignature}
        style={{
          padding: isMobile ? '14px 20px' : '12px 28px',
          background: '#2d3e50',
          color: 'white',
          border: 'none',
          borderRadius: isMobile ? '12px' : '8px', // تم التعديل: 8px (مربع) للديسكتوب
          fontSize: isMobile ? '16px' : '14px',
          fontWeight: '600',
          cursor: 'pointer',
          width: isMobile ? '100%' : 'auto',
          minWidth: isMobile ? '100%' : '110px',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 10px rgba(45,62,80,0.2)',
          marginTop: isMobile ? '4px' : '0'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#1a2634';
          e.target.style.transform = isMobile ? 'none' : 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 15px rgba(45,62,80,0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#2d3e50';
          e.target.style.transform = 'none';
          e.target.style.boxShadow = '0 4px 10px rgba(45,62,80,0.2)';
        }}
      >
         إضافة 
      </button>
    </div>
  )}
</div>
)}

        {/* 6️⃣ أزرار الإرسال والتحميل */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: isMobile ? '12px' : '20px', 
          marginTop: '32px',
          paddingTop: '32px',
          borderTop: '2px solid #e2e8f0',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <button
            onClick={handleSubmitReport}
            disabled={isSubmitting || !canEdit}
            style={{
              padding: isMobile ? '14px 20px' : '14px 40px',
              background: (isSubmitting || !canEdit) ? '#94a3b8' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: isMobile ? '12px' : '8px', // تم التعديل: 12px للجوال، 8px للديسكتوب (مربع)
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600',
              cursor: (isSubmitting || !canEdit) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: (isSubmitting || !canEdit) ? 0.5 : 1,
              width: isMobile ? '100%' : 'auto'
            }}
            onMouseEnter={(e) => !isSubmitting && canEdit && (e.target.style.background = '#047857')}
            onMouseLeave={(e) => !isSubmitting && canEdit && (e.target.style.background = '#059669')}
          >
            {isSubmitting ? 'جاري الإرسال...' : !canEdit ? 'التعديل مغلق' : 'إرسال التقرير'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectReport;