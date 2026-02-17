

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ProjectReport = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  const [currentDailyReport, setCurrentDailyReport] = useState(null);
  const [dailyReportId, setDailyReportId] = useState(null);

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

  // ========== State for Site Images ==========
  const [siteImages, setSiteImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // ========== State for Signatures ==========
  const [signatures, setSignatures] = useState([]);
  const [signatureData, setSignatureData] = useState('');

  // ========== جلب بيانات المشروع + التقرير اليومي ==========
  useEffect(() => {
    console.log('Project ID:', projectId); // 👈 تحقق
    const init = async () => {
      await fetchProjectData();
      await fetchTodayDailyReport(); // بعد جلب التقرير نجيب كل البيانات المرتبطة
    };

    if (projectId) init();
  }, [projectId]);


  // ======= جلب التقرير اليومي =======
const fetchTodayDailyReport = async () => {
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
      
      // تحديث الـ state
      setCurrentDailyReport(data.report);
      setDailyReportId(reportId); // ✅ تعيين الـ ID الجديد

      // ✅ استخدام reportId مباشرة بدلاً من الاعتماد على state
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
  }
};

  // ======= جلب بيانات المشروع =======
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

    // ✅ هنا اضف هذا السطر للتأكد من البيانات اللي جاية
    console.log('Project data:', data);

    if (response.ok && data) {
      setProject(data); // هنا مباشرة object المشروع
    }

    setIsLoading(false);
  } catch (error) {
    console.error('Error fetching project:', error);
    setIsLoading(false);
  }
};



// ======================= Helpers =======================

// ✅ جلب dailyReportId لو مش موجود
const getDailyReportId = async () => {
  if (dailyReportId) return dailyReportId;

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:3000/daily-reports/project/${projectId}/today`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('لم يتم العثور على تقرير يومي لهذا المشروع');

    const data = await res.json();
    setDailyReportId(data.report.id);
    setCurrentDailyReport(data.report);
    return data.report.id;
  } catch (error) {
    console.error('Error fetching daily report ID:', error);
    alert('❌ فشل في جلب التقرير اليومي: ' + error.message);
    return null;
  }
};

// ======================= Work Items =======================
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

// ======================= Next Day Plans =======================
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

// ======================= Materials =======================
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
  if (!newMaterial.material_name) return alert('❌ اسم الخامة مطلوب');

  try {
    const token = localStorage.getItem('token');
    const id = await getDailyReportId();
    if (!id) return;

    const res = await fetch(`http://localhost:3000/materials/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newMaterial)
    });

    if (res.ok) {
      setNewMaterial({ material_name:'', material_type:'', quantity:0, storage_location:'', supplier_name:'', supplier_contact:'', supply_location:'' });
      fetchMaterials(id);
    }
  } catch (error) {
    console.error('Error adding material:', error);
    alert('❌ فشل في إضافة المادة: ' + error.message);
  }
};

const handleDeleteMaterial = async (materialId) => {
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

// ======================= Site Images =======================
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

// ======================= Signatures =======================
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
  // ========== Generate PDF ==========
  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      
      // عنوان التقرير
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(45, 62, 80);
      doc.text(`تقرير المشروع - ${project.report_number}`, 40, 40);
      
      // معلومات أساسية
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(`المالك: ${project.owner_name}`, 40, 80);
      doc.text(`الشركة: ${project.company_name}`, 40, 105);
      doc.text(`الموقع: ${project.location}`, 40, 130);
      doc.text(`المهندس المسؤول: ${project.engineer_name}`, 40, 155);
      doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, 40, 180);
      
      let yPosition = 220;
      
      // 1️⃣ الأعمال الجارية
      if (workItems.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(45, 62, 80);
        doc.text('الأعمال الجارية', 40, yPosition);
        yPosition += 20;
        
        const tableColumn = ['#', 'البند', 'منطقة العمل', 'عدد العمال', 'الكمية'];
        const tableRows = workItems.map((item, index) => [
          index + 1,
          item.item_name,
          item.work_area,
          item.workers_count || 0,
          item.quantity || 0
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [tableColumn],
          body: tableRows,
          theme: 'grid',
          styles: { 
            font: 'helvetica', 
            fontSize: 10,
            halign: 'center',
            valign: 'middle'
          },
          headStyles: { 
            fillColor: [45, 62, 80],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          }
        });
        
        yPosition = doc.lastAutoTable.finalY + 30;
      }
      
      // 2️⃣ خطة اليوم التالي
      if (nextDayPlans.length > 0) {
        // إضافة صفحة جديدة إذا كانت المساحة غير كافية
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 40;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(45, 62, 80);
        doc.text('خطة اليوم التالي', 40, yPosition);
        yPosition += 20;
        
        nextDayPlans.forEach((plan, index) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(71, 85, 105);
          
          const lines = doc.splitTextToSize(`${index + 1}. ${plan.description}`, 500);
          doc.text(lines, 40, yPosition);
          yPosition += lines.length * 20 + 10;
        });
        
        yPosition += 20;
      }
      
      // 3️⃣ المواد
      if (materials.length > 0) {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 40;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(45, 62, 80);
        doc.text('المواد المستخدمة', 40, yPosition);
        yPosition += 20;
        
        const tableColumn = ['اسم الخامة', 'النوع', 'الكمية', 'مكان التخزين', 'المورد'];
        const tableRows = materials.map(material => [
          material.material_name,
          material.material_type || '-',
          material.quantity || 0,
          material.storage_location || '-',
          material.supplier_name || '-'
        ]);
        برو
       autoTable(doc, {
          startY: yPosition,
          head: [tableColumn],
          body: tableRows,
          theme: 'grid',
          styles: { 
            font: 'helvetica', 
            fontSize: 9,
            halign: 'center',
            valign: 'middle'
          },
          headStyles: { 
            fillColor: [45, 62, 80],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          }
        });
        
        yPosition = doc.lastAutoTable.finalY + 30;
      }
      
      // 4️⃣ صور الموقع
      if (siteImages.length > 0) {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 40;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(45, 62, 80);
        doc.text('صور الموقع', 40, yPosition);
        yPosition += 20;
        
        siteImages.forEach((image, index) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(71, 85, 105);
          doc.text(`صورة ${index + 1} - ${new Date(image.uploaded_at).toLocaleDateString('ar-SA')}`, 40, yPosition);
          yPosition += 15;
          
          // إضافة رابط الصورة
          doc.setTextColor(37, 99, 235);
          doc.textWithLink('عرض الصورة', 40, yPosition, { url: `http://localhost:3000/${image.image_path}` });
          doc.setTextColor(71, 85, 105);
          yPosition += 25;
        });
        
        yPosition += 10;
      }
      
      // 5️⃣ التوقيع
      if (signatures.length > 0) {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 40;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(45, 62, 80);
        doc.text('التوقيع', 40, yPosition);
        yPosition += 20;
        
        signatures.forEach((signature) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(45, 62, 80);
          doc.text(signature.signed_by, 40, yPosition);
          yPosition += 15;
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(71, 85, 105);
          const lines = doc.splitTextToSize(signature.signature_data, 500);
          doc.text(lines, 40, yPosition);
          yPosition += lines.length * 20 + 10;
          
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9);
          doc.setTextColor(148, 163, 184);
          doc.text(`تاريخ التوقيع: ${new Date(signature.signed_at).toLocaleDateString('ar-SA')}`, 40, yPosition);
          yPosition += 30;
        });
      }
      
      // حفظ الملف
      doc.save(`Project-Report-${project.report_number}.pdf`);
      alert('✅ تم تحميل التقرير بنجاح');
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      alert('❌ فشل في إنشاء ملف PDF: ' + error.message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ========== إرسال التقرير ==========
  const handleSubmitReport = async () => {
    if (window.confirm('هل أنت متأكد من إرسال التقرير؟ لا يمكن التعديل بعد الإرسال')) {
      setIsSubmitting(true);
      setSubmitMessage({ type: '', text: '' });
      
      try {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        
        const response = await fetch(`http://localhost:3000/owner-reports/${projectId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...project,
            status: 'completed',
            submitted_by: username,
            submitted_at: new Date().toISOString()
          })
        });

        if (response.ok) {
          setSubmitMessage({ 
            type: 'success', 
            text: '✅ تم إرسال التقرير بنجاح! سيتم توجيهك إلى لوحة التحكم...' 
          });
          
          setTimeout(() => {
            navigate('/subadmin-dashboard');
          }, 2000);
        } else {
          const data = await response.json();
          setSubmitMessage({ 
            type: 'error', 
            text: `❌ فشل إرسال التقرير: ${data.message || 'حدث خطأ غير متوقع'}` 
          });
        }
      } catch (error) {
        console.error('Error submitting report:', error);
        setSubmitMessage({ 
          type: 'error', 
          text: '❌ فشل الاتصال بالسيرفر. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.' 
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>جاري التحميل...</div>;
  if (!project) return <div style={{ padding: '40px', textAlign: 'center' }}>المشروع غير موجود</div>;

  return (
    <div style={{
      padding: '32px',
      background: '#f5f7fa',
      minHeight: '100vh',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      {/* Header */}
<div style={{
  background: '#ffffff',
  padding: '24px 32px',
  borderRadius: '16px',
  marginBottom: '32px',
  border: '1px solid rgba(0,0,0,0.02)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start'
}}>
  <div style={{ flex: 1 }}>
    <h1 style={{ fontSize: '24px', color: '#1a2634', marginBottom: '16px', fontWeight: '600' }}>
      تقرير المشروع - {project.report_number}
    </h1>
    
    {/* بطاقة معلومات المشروع */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      background: '#f8fafc',
      padding: '16px',
      borderRadius: '12px',
      marginTop: '8px'
    }}>
      <div>
        <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '4px' }}>المالك</span>
        <span style={{ color: '#1a2634', fontSize: '16px', fontWeight: '500' }}>{project.owner_name}</span>
      </div>
      
      <div>
        <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '4px' }}>الشركة</span>
        <span style={{ color: '#1a2634', fontSize: '16px', fontWeight: '500' }}>{project.company_name}</span>
      </div>
      
      <div>
        <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '4px' }}>الموقع</span>
        <span style={{ color: '#1a2634', fontSize: '16px', fontWeight: '500' }}>{project.location}</span>
      </div>
      
      <div>
        <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '4px' }}>المهندس المسؤول</span>
        <span style={{ color: '#1a2634', fontSize: '16px', fontWeight: '500' }}>{project.engineer_name}</span>
      </div>
      
      <div>
        <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '4px' }}>تاريخ التقرير</span>
        <span style={{ color: '#1a2634', fontSize: '16px', fontWeight: '500' }}>
          {new Date(project.report_date).toLocaleDateString('ar-SA')}
        </span>
      </div>
      
      <div>
        <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '4px' }}>عدد العمال</span>
        <span style={{ color: '#1a2634', fontSize: '16px', fontWeight: '500' }}>{project.workers_count}</span>
      </div>
      
      <div>
        <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '4px' }}>حالة التقرير</span>
        <span style={{
          color: project.status === 'completed' ? '#059669' : '#f59e0b',
          fontSize: '14px',
          fontWeight: '600',
          background: project.status === 'completed' ? '#d1fae5' : '#fef3c7',
          padding: '4px 12px',
          borderRadius: '30px',
          display: 'inline-block'
        }}>
          {project.status === 'completed' ? 'مكتمل' : 'قيد الإعداد'}
        </span>
      </div>
    </div>
  </div>
  
  {/* أزرار التحكم */}
  <div style={{ display: 'flex', gap: '12px' }}>
    <button
      onClick={handleGeneratePDF}
      disabled={isGeneratingPDF}
      style={{
        padding: '10px 20px',
        background: isGeneratingPDF ? '#94a3b8' : '#2d3e50',
        color: 'white',
        border: 'none',
        borderRadius: '30px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: isGeneratingPDF ? 'wait' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: isGeneratingPDF ? 0.7 : 1
      }}
      onMouseEnter={(e) => !isGeneratingPDF && (e.target.style.background = '#1a2634')}
      onMouseLeave={(e) => !isGeneratingPDF && (e.target.style.background = '#2d3e50')}
    >
            {isGeneratingPDF ? 'جاري التحميل...' : 'تحميل PDF'}
          </button>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 20px',
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
            ← رجوع
          </button>
        </div>
      </div>

      {/* رسالة حالة الإرسال */}
      {submitMessage.text && (
        <div style={{
          padding: '16px 24px',
          borderRadius: '12px',
          marginBottom: '24px',
          backgroundColor: submitMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${submitMessage.type === 'success' ? '#86efac' : '#fecaca'}`,
          color: submitMessage.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '15px',
          fontWeight: '500',
          textAlign: 'center'
        }}>
          {submitMessage.text}
        </div>
      )}

      {/* ========== REPORT CONTENT ========== */}
      <div style={{
        background: '#ffffff',
        padding: '32px',
        borderRadius: '16px',
        border: '1px solid rgba(0,0,0,0.02)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        
        {/* 1️⃣ الأعمال الجارية */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', color: '#1a2634', marginBottom: '24px', fontWeight: '600', borderBottom: '2px solid #2d3e50', paddingBottom: '12px' }}>
            الأعمال الجارية
          </h2>
          
          {/* جدول الأعمال الجارية */}
          <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '8%' }}>#</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '23%' }}>البند</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '23%' }}>منطقة العمل</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '15%' }}>عدد العمال</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '15%' }}>الكمية</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '16%' }}>الإجراءات</th>
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
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteWorkItem(item.id)}
                        style={{
                          padding: '4px 12px',
                          background: 'white',
                          color: '#e53e3e',
                          border: '1px solid #e53e3e',
                          borderRadius: '30px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = '#e53e3e'; e.target.style.color = 'white'; }}
                        onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = '#e53e3e'; }}
                      >
                        حذف
                      </button>
                    </td>
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

          {/* نموذج إضافة بند جديد */}
          <form onSubmit={handleAddWorkItem}>
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              alignItems: 'center',
              width: '100%'
            }}>
              <div style={{ width: '8%' }}></div>
              <div style={{ width: '23%' }}>
                <input
                  type="text"
                  value={newWorkItem.item_name}
                  onChange={(e) => setNewWorkItem({ ...newWorkItem, item_name: e.target.value })}
                  placeholder="رقم البند"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    backgroundColor: '#fafbfc',
                    textAlign: 'center'
                  }}
                  required
                />
              </div>
              <div style={{ width: '23%' }}>
                <input
                  type="text"
                  value={newWorkItem.work_area}
                  onChange={(e) => setNewWorkItem({ ...newWorkItem, work_area: e.target.value })}
                  placeholder="منطقة العمل"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    backgroundColor: '#fafbfc',
                    textAlign: 'center'
                  }}
                  required
                />
              </div>
              <div style={{ width: '15%' }}>
                <input
                  type="number"
                  value={newWorkItem.workers_count}
                  onChange={(e) => setNewWorkItem({ ...newWorkItem, workers_count: parseInt(e.target.value) || 0 })}
                  placeholder="العمال"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    backgroundColor: '#fafbfc',
                    textAlign: 'center'
                  }}
                />
              </div>
              <div style={{ width: '15%' }}>
                <input
                  type="number"
                  value={newWorkItem.quantity}
                  onChange={(e) => setNewWorkItem({ ...newWorkItem, quantity: parseInt(e.target.value) || 0 })}
                  placeholder="الكمية"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    backgroundColor: '#fafbfc',
                    textAlign: 'center'
                  }}
                />
              </div>
              <div style={{ width: '16%' }}>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '10px 24px',
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
                  + إضافة
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* 2️⃣ خطة اليوم التالي */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', color: '#1a2634', marginBottom: '24px', fontWeight: '600', borderBottom: '2px solid #2d3e50', paddingBottom: '12px' }}>
            خطة اليوم التالي
          </h2>
          
          <div style={{ marginBottom: '20px' }}>
            {nextDayPlans.map((plan) => (
              <div
                key={plan.id}
                style={{
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #edf2f7',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <p style={{ color: '#1a2634', fontSize: '14px', margin: 0, flex: 1, textAlign: 'center' }}>{plan.description}</p>
                <button
                  onClick={() => handleDeletePlan(plan.id)}
                  style={{
                    padding: '4px 12px',
                    background: 'white',
                    color: '#e53e3e',
                    border: '1px solid #e53e3e',
                    borderRadius: '30px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = '#e53e3e'; e.target.style.color = 'white'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = '#e53e3e'; }}
                >
                  حذف
                </button>
              </div>
            ))}
            {nextDayPlans.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                لا توجد خطط مضافة
              </div>
            )}
          </div>

          <form onSubmit={handleAddPlan} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={newPlan.description}
              onChange={(e) => setNewPlan({ description: e.target.value })}
              placeholder="أضف خطة جديدة..."
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                backgroundColor: '#fafbfc',
                textAlign: 'center'
              }}
              required
            />
            <button
              type="submit"
              style={{
                padding: '10px 24px',
                background: '#2d3e50',
                color: 'white',
                border: 'none',
                borderRadius: '30px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '100px'
              }}
              onMouseEnter={(e) => e.target.style.background = '#1a2634'}
              onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
            >
              + إضافة
            </button>
          </form>
        </div>

        {/* 3️⃣ المواد */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', color: '#1a2634', marginBottom: '24px', fontWeight: '600', borderBottom: '2px solid #2d3e50', paddingBottom: '12px' }}>
            المواد
          </h2>
          
          {/* جدول المواد */}
          <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
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
                    <td style={{ padding: '12px', textAlign: 'center', color: '#1a2634' }}>{material.material_name}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.material_type || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.quantity}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.storage_location || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.supplier_name || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.supplier_contact || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{material.supply_location || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteMaterial(material.id)}
                        style={{
                          padding: '4px 12px',
                          background: 'white',
                          color: '#e53e3e',
                          border: '1px solid #e53e3e',
                          borderRadius: '30px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = '#e53e3e'; e.target.style.color = 'white'; }}
                        onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = '#e53e3e'; }}
                      >
                        حذف
                      </button>
                    </td>
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

          {/* نموذج إضافة مادة جديدة */}
          <form onSubmit={handleAddMaterial} style={{ 
            display: 'grid', 
            gridTemplateColumns: '12% 10% 8% 12% 12% 10% 12% 12%', 
            gap: '12px' 
          }}>
            <input
              type="text"
              value={newMaterial.material_name}
              onChange={(e) => setNewMaterial({ ...newMaterial, material_name: e.target.value })}
              placeholder="الخامة *"
              style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', backgroundColor: '#fafbfc', textAlign: 'center' }}
              required
            />
            <input
              type="text"
              value={newMaterial.material_type}
              onChange={(e) => setNewMaterial({ ...newMaterial, material_type: e.target.value })}
              placeholder="النوع"
              style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', backgroundColor: '#fafbfc', textAlign: 'center' }}
            />
            <input
              type="number"
              value={newMaterial.quantity}
              onChange={(e) => setNewMaterial({ ...newMaterial, quantity: parseInt(e.target.value) || 0 })}
              placeholder="الكمية"
              style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', backgroundColor: '#fafbfc', textAlign: 'center' }}
            />
            <input
              type="text"
              value={newMaterial.storage_location}
              onChange={(e) => setNewMaterial({ ...newMaterial, storage_location: e.target.value })}
              placeholder="التخزين"
              style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', backgroundColor: '#fafbfc', textAlign: 'center' }}
            />
            <input
              type="text"
              value={newMaterial.supplier_name}
              onChange={(e) => setNewMaterial({ ...newMaterial, supplier_name: e.target.value })}
              placeholder="المورد"
              style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', backgroundColor: '#fafbfc', textAlign: 'center' }}
            />
            <input
              type="text"
              value={newMaterial.supplier_contact}
              onChange={(e) => setNewMaterial({ ...newMaterial, supplier_contact: e.target.value })}
              placeholder="رقم المورد"
              style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', backgroundColor: '#fafbfc', textAlign: 'center' }}
            />
            <input
              type="text"
              value={newMaterial.supply_location}
              onChange={(e) => setNewMaterial({ ...newMaterial, supply_location: e.target.value })}
              placeholder="مكان التوريد"
              style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', backgroundColor: '#fafbfc', textAlign: 'center' }}
            />
            <button
              type="submit"
              style={{
                padding: '10px 24px',
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
              + إضافة
            </button>
          </form>
        </div>

        {/* 4️⃣ صور الموقع */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', color: '#1a2634', marginBottom: '24px', fontWeight: '600', borderBottom: '2px solid #2d3e50', paddingBottom: '12px' }}>
            صور الموقع
          </h2>
          
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '30px',
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
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
              <p style={{ color: '#475569', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                {uploading ? 'جاري الرفع...' : 'اضغط لرفع صورة'}
              </p>
              <p style={{ color: '#94a3b8', fontSize: '12px' }}>
                PNG, JPG, GIF
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
            {siteImages.map(image => (
              <div
                key={image.id}
                style={{
                  background: '#f8fafc',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #edf2f7'
                }}
              >
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
                <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    {new Date(image.uploaded_at).toLocaleDateString('ar-SA')}
                  </span>
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    style={{
                      padding: '4px 8px',
                      background: 'white',
                      color: '#e53e3e',
                      border: '1px solid #e53e3e',
                      borderRadius: '30px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => { e.target.style.background = '#e53e3e'; e.target.style.color = 'white'; }}
                    onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = '#e53e3e'; }}
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
            {siteImages.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                لا توجد صور
              </div>
            )}
          </div>
        </div>

        {/* 5️⃣ التوقيع */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', color: '#1a2634', marginBottom: '24px', fontWeight: '600', borderBottom: '2px solid #2d3e50', paddingBottom: '12px' }}>
            التوقيع
          </h2>
          
          <div style={{ marginBottom: '20px' }}>
            {signatures.map(signature => (
              <div
                key={signature.id}
                style={{
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #edf2f7',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontWeight: '600', color: '#1a2634', marginBottom: '4px' }}>{signature.signed_by}</div>
                  <div style={{ color: '#475569', fontSize: '14px' }}>{signature.signature_data}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    {new Date(signature.signed_at).toLocaleDateString('ar-SA')}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSignature(signature.id)}
                  style={{
                    padding: '4px 12px',
                    background: 'white',
                    color: '#e53e3e',
                    border: '1px solid #e53e3e',
                    borderRadius: '30px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = '#e53e3e'; e.target.style.color = 'white'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = '#e53e3e'; }}
                >
                  حذف
                </button>
              </div>
            ))}
            {signatures.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                لا يوجد توقيع
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <textarea
              value={signatureData}
              onChange={(e) => setSignatureData(e.target.value)}
              rows="3"
              placeholder="أدخل التوقيع..."
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                backgroundColor: '#fafbfc',
                resize: 'vertical',
                textAlign: 'center'
              }}
            />
            <button
              onClick={handleAddSignature}
              style={{
                padding: '12px 24px',
                background: '#2d3e50',
                color: 'white',
                border: 'none',
                borderRadius: '30px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                alignSelf: 'flex-start',
                minWidth: '120px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = '#1a2634'}
              onMouseLeave={(e) => e.target.style.background = '#2d3e50'}
            >
              إضافة توقيع
            </button>
          </div>
        </div>

        {/* 6️⃣ أزرار الإرسال والتحميل */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '20px', 
          marginTop: '32px',
          paddingTop: '32px',
          borderTop: '2px solid #e2e8f0'
        }}>
          <button
            onClick={handleSubmitReport}
            disabled={isSubmitting}
            style={{
              padding: '14px 40px',
              background: isSubmitting ? '#94a3b8' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isSubmitting ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isSubmitting ? 0.7 : 1
            }}
            onMouseEnter={(e) => !isSubmitting && (e.target.style.background = '#047857')}
            onMouseLeave={(e) => !isSubmitting && (e.target.style.background = '#059669')}
          >
            {isSubmitting ? 'جاري الإرسال...' : 'إرسال التقرير'}
          </button>
          
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            style={{
              padding: '14px 40px',
              background: isGeneratingPDF ? '#94a3b8' : '#2d3e50',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isGeneratingPDF ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isGeneratingPDF ? 0.7 : 1
            }}
            onMouseEnter={(e) => !isGeneratingPDF && (e.target.style.background = '#1a2634')}
            onMouseLeave={(e) => !isGeneratingPDF && (e.target.style.background = '#2d3e50')}
          >
            {isGeneratingPDF ? 'جاري التحميل...' : 'تحميل PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectReport; 