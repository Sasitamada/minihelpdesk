import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';

const Settings = () => {
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    password: '',
    bio: ''
  });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [twoFA, setTwoFA] = useState({
    sms: false,
    totp: false
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setProfileData({
      fullName: user.fullName || user.full_name || 'User Name',
      email: user.email || '',
      password: '',
      bio: user.bio || ''
    });
    if (user.avatar) {
      setAvatarPreview(`http://localhost:5000${user.avatar}`);
    }
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        const response = await usersAPI.getById(user.id);
        const userData = response.data;
        setProfileData({
          fullName: userData.full_name || userData.fullName || '',
          email: userData.email || '',
          password: '',
          bio: userData.bio || ''
        });
        if (userData.avatar) {
          setAvatarPreview(`http://localhost:5000${userData.avatar}`);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.id) {
        alert('Please login first');
        return;
      }

      const formData = new FormData();
      formData.append('fullName', profileData.fullName);
      formData.append('email', profileData.email);
      formData.append('bio', profileData.bio);
      if (profileData.password) {
        formData.append('password', profileData.password);
      }
      if (avatar) {
        formData.append('avatar', avatar);
      }

      const response = await usersAPI.update(user.id, formData);
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify({
        ...user,
        fullName: response.data.full_name,
        email: response.data.email,
        bio: response.data.bio,
        avatar: response.data.avatar
      }));

      alert('Settings saved successfully!');
      if (avatar) {
        setAvatar(null);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(error.response?.data?.message || 'Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ 
        fontSize: '32px', 
        fontWeight: 'bold', 
        marginBottom: '24px',
        color: '#1a1a1a'
      }}>
        My Settings
      </h1>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e0e0e0',
        marginBottom: '32px'
      }}>
        <button
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: '3px solid #6b5ce6',
            color: '#6b5ce6',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          Profile
        </button>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 2fr', 
        gap: '40px',
        marginBottom: '40px'
      }}>
        {/* Left Column */}
        <div>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            marginBottom: '12px',
            color: '#1a1a1a'
          }}>
            Profile
          </h2>
          <p style={{ 
            color: '#6c757d', 
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            Your personal information and account security settings.
          </p>

          <div style={{ marginTop: '40px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              marginBottom: '20px',
              color: '#1a1a1a'
            }}>
              Two-factor authentication (2FA)
            </h3>
            <p style={{ 
              color: '#6c757d', 
              fontSize: '14px',
              marginBottom: '24px'
            }}>
              Keep your account secure by enabling 2FA via SMS or using a temporary one-time passcode (TOTP) from an authenticator app.
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Avatar and Name */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '20px',
            marginBottom: '40px'
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: avatarPreview ? 'none' : '#6b5ce6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
                overflow: 'hidden',
                backgroundImage: avatarPreview ? `url(${avatarPreview})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}>
                {!avatarPreview && getInitials(profileData.fullName)}
              </div>
              <label
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: '#6b5ce6',
                  color: 'white',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#5a4cd6'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#6b5ce6'}
                title="Change avatar"
              >
                📷
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div>
              <p style={{ 
                fontSize: '18px', 
                fontWeight: '500',
                marginBottom: '4px',
                color: '#1a1a1a'
              }}>
                {profileData.fullName}
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={profileData.fullName}
                onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  border: '2px solid #e4e6e8',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                placeholder="Enter your full name"
              />
              <span style={{ 
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px'
              }}>👤</span>
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  border: '2px solid #e4e6e8',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                placeholder="Enter your email"
              />
              <span style={{ 
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px'
              }}>📧</span>
            </div>
          </div>

          {/* Bio */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>
              Bio
            </label>
            <textarea
              value={profileData.bio}
              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e4e6e8',
                borderRadius: '8px',
                fontSize: '14px',
                minHeight: '100px',
                resize: 'vertical'
              }}
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '40px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={profileData.password}
                onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  border: '2px solid #e4e6e8',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                placeholder="Enter new password (leave blank to keep current)"
              />
              <span style={{ 
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px'
              }}>🔒</span>
            </div>
          </div>

          {/* 2FA Options */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginBottom: '8px'
            }}>
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                flex: 1
              }}>
                <input
                  type="checkbox"
                  checked={twoFA.sms}
                  onChange={(e) => setTwoFA({ ...twoFA, sms: e.target.checked })}
                  style={{ 
                    width: '20px', 
                    height: '20px', 
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontWeight: '600', color: '#1a1a1a' }}>
                  Text Message (SMS)
                </span>
              </label>
              <span style={{
                background: '#6b5ce6',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                Business
              </span>
            </div>
            <p style={{ 
              color: '#6c757d', 
              fontSize: '13px',
              marginLeft: '32px',
              marginBottom: '20px'
            }}>
              Receive a one-time passcode via SMS each time you log in.
            </p>
          </div>

          <div>
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={twoFA.totp}
                onChange={(e) => setTwoFA({ ...twoFA, totp: e.target.checked })}
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontWeight: '600', color: '#1a1a1a' }}>
                Authenticator App (TOTP)
              </span>
            </label>
            <p style={{ 
              color: '#6c757d', 
              fontSize: '13px',
              marginLeft: '32px'
            }}>
              Use an app to receive a temporary one-time passcode each time you log in.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        paddingTop: '32px',
        borderTop: '1px solid #e4e6e8'
      }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            background: loading ? '#ccc' : '#1a1a1a',
            color: 'white',
            padding: '14px 32px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => !loading && (e.target.style.background = '#333')}
          onMouseOut={(e) => !loading && (e.target.style.background = '#1a1a1a')}
        >
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
