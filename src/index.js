


const express = require('express');
const app = express();

app.use(express.json());


const addUsersRoutes = require('./routes/addUsers');
app.use('/users', addUsersRoutes);  


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