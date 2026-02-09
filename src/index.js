


const express = require('express');
const app = express();
app.use(express.json());

app.use('/uploads', express.static('uploads'));

// Users Management
const addUsersRoutes = require('./routes/addUsers');
app.use('/users', addUsersRoutes);  

// Owner Reports
const ownerReportsRoutes = require('./routes/AddownerReports');
app.use('/owner-reports', ownerReportsRoutes);

// Work Items 
const workItemsRoutes = require('./routes/AddworkItems');
app.use('/work-items', workItemsRoutes);

//Next Day Plans 
const nextDayPlansRoutes = require('./routes/AddNextDayPlans');
app.use('/next-day-plans', nextDayPlansRoutes);

// Materials Management
const materialsRoutes = require('./routes/AddMaterials');
app.use('/materials', materialsRoutes);

// Site Image Uplouds
const siteImagesRoutes = require('./routes/AddSiteImages');
app.use('/site-images', siteImagesRoutes);

// Signatures Management
const signaturesRoutes = require('./routes/AddSignatures');
app.use('/signatures', signaturesRoutes);

// inspection Request
const inspectionRequestsRouter = require('./routes/AddinspectionRequests');
app.use('/inspection-requests', inspectionRequestsRouter);

// supervisors Notes 
const supervisorsNotesRoutes = require('./routes/AddSupervisorsNotes');
app.use('/supervisors-notes', supervisorsNotesRoutes);


//  تهيئة المستخدمين (Admin + Sub Admin)
const { initUsers } = require('./models/user');

// استدعاء راوت تسجيل الدخول
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);


app.get('/', (req, res) => {
  res.send('DIT Reports API Running');
});

const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // إنشاء جدول المستخدمين + إضافة المستخدمين الثابتين
  await initUsers();
});
///Users/fatimahadeeb/Desktop/Dit Projects/src/index.js