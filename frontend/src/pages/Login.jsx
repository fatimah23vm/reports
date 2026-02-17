

import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const Login = () => {
  const [formData, setFormData] = useState({ 
    username: '', 
    password: '' 
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
    if (errors.general) setErrors({ ...errors, general: '' });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'اسم المستخدم مطلوب';
    if (!formData.password) newErrors.password = 'كلمة المرور مطلوبة';
    else if (formData.password.length < 6) newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) return setErrors(validationErrors);

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'فشل تسجيل الدخول');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('username', formData.username);

      if (data.role === 'admin') {
        window.location.href = '/admin-dashboard';
      } else if (data.role === 'sub_admin') {
        window.location.href = '/subadmin-dashboard';
      }

    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      width: '100%',
      background: '#f5f7fa',
      margin: 0,
      padding: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      fontFamily: "'Cairo', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      direction: 'rtl'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        padding: '20px'
      }}>
        <div className="card border-0" style={{
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.02)'
        }}>
          <div className="card-body p-5">
            
            {/* Logo/Icon */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: '#f8f9fc',
                borderRadius: '16px',
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2d3e50',
                fontSize: '28px',
                border: '1px solid #edf2f7'
              }}>
                🔐
              </div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#1a2634',
                margin: '0 0 8px 0',
                letterSpacing: '-0.5px'
              }}>
                مرحباً بعودتك
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                margin: 0,
                fontWeight: '400'
              }}>
                الرجاء تسجيل الدخول إلى حسابك
              </p>
            </div>

            {/* General Error */}
            {errors.general && (
              <div style={{
                backgroundColor: '#fff5f5',
                border: '1px solid #feb2b2',
                color: '#9b2c2c',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '14px',
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                {errors.general}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              
              {/* Username */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#2d3e50',
                  marginBottom: '8px',
                  display: 'block',
                  letterSpacing: '0.3px'
                }}>
                  اسم المستخدم
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="أدخل اسم المستخدم"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: errors.username ? '1.5px solid #fc8181' : '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    backgroundColor: '#fafbfc',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    color: '#1a2634'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#a0aec0'}
                  onBlur={(e) => e.target.style.borderColor = errors.username ? '#fc8181' : '#e2e8f0'}
                />
                {errors.username && (
                  <div style={{
                    fontSize: '12px',
                    color: '#c53030',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>⚠️</span> {errors.username}
                  </div>
                )}
              </div>

              {/* Password */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#2d3e50',
                  marginBottom: '8px',
                  display: 'block',
                  letterSpacing: '0.3px'
                }}>
                  كلمة المرور
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="أدخل كلمة المرور"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '15px',
                      border: errors.password ? '1.5px solid #fc8181' : '1.5px solid #e2e8f0',
                      borderRadius: '10px',
                      backgroundColor: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#1a2634',
                      paddingLeft: '70px',
                      paddingRight: '16px'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#a0aec0'}
                    onBlur={(e) => e.target.style.borderColor = errors.password ? '#fc8181' : '#e2e8f0'}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#edf2f7'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {showPassword ? 'إخفاء' : 'إظهار'}
                  </button>
                </div>
                {errors.password && (
                  <div style={{
                    fontSize: '12px',
                    color: '#c53030',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>⚠️</span> {errors.password}
                  </div>
                )}
              </div>

              {/* Remember Me */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '28px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#4a5568'
                }}>
                  <input 
                    type="checkbox" 
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer',
                      accentColor: '#2d3e50'
                    }}
                  />
                  <span>تذكرني</span>
                </label>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#ffffff',
                  backgroundColor: '#2d3e50',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  letterSpacing: '0.3px'
                }}
                onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = '#1a2634')}
                onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = '#2d3e50')}
              >
                {isLoading ? (
                  <>
                    <span style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></span>
                    جاري تسجيل الدخول...
                  </>
                ) : 'تسجيل الدخول'}
              </button>

            </form>

            {/* Footer */}
            <div style={{
              marginTop: '32px',
              textAlign: 'center',
              fontSize: '12px',
              color: '#94a3b8',
              borderTop: '1px solid #edf2f7',
              paddingTop: '24px'
            }}>
              <span>دخول آمن • اتصال مشفر</span>
            </div>

          </div>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        `}
      </style>
    </div>
  );
};

export default Login;