import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Home, Shield, Save, Key, Loader2, ChevronDown } from 'lucide-react';
import api from '../api';

export default function Profile() {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [genderOpen, setGenderOpen] = useState(false);
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');
  
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    role: '',
    houseNumber: '',
    colonyName: '',
    apartmentBlock: 'Block A',
    gender: 'female',
    fullName: '',
    mobileNumber: '',
    whatsAppNumber: '',
    waterRatePerLiter: 0,
    monthlyLimitLiters: 0,
    excessRatePerLiter: 0,
    status: 'PENDING',
    verificationStatus: 'NOT_SUBMITTED',
    meterId: 'N/A'
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const username = localStorage.getItem('username');
      const token = localStorage.getItem('token');
      if (username && token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const res = await api.get(`/users/profile/${username}`);
          
          setProfileData({
            username: res.data.username || '',
            email: res.data.email || '',
            role: res.data.role === 'ROLE_ADMIN' ? 'Admin' : 
                  res.data.role === 'ROLE_COMMUNITY_ADMIN' ? 'Community Admin' : 'Household User',
            houseNumber: res.data.houseNumber || '',
            colonyName: res.data.colonyName || '',
            apartmentBlock: res.data.apartmentBlock || '',
            gender: res.data.gender || 'female',
            fullName: res.data.fullName || '',
            mobileNumber: res.data.mobileNumber || '',
            whatsAppNumber: res.data.whatsAppNumber || '',
            waterRatePerLiter: res.data.waterRatePerLiter || 0,
            monthlyLimitLiters: res.data.monthlyLimitLiters || 0,
            excessRatePerLiter: res.data.excessRatePerLiter || 0,
            status: res.data.status || 'PENDING',
            verificationStatus: res.data.verificationStatus || 'NOT_SUBMITTED',
            meterId: res.data.meterId || 'N/A'
          });
        } catch (err) {
          console.error("Error fetching profile details from server:", err);
          setProfileData({
            username: localStorage.getItem('username') || '',
            email: localStorage.getItem('email') || '',
            role: localStorage.getItem('role') === 'ROLE_ADMIN' ? 'Admin' : 
                  localStorage.getItem('role') === 'ROLE_COMMUNITY_ADMIN' ? 'Community Admin' : 'Household User',
            houseNumber: localStorage.getItem('houseNumber') || '',
            colonyName: localStorage.getItem('colonyName') || '',
            apartmentBlock: localStorage.getItem('apartmentBlock') || '',
            gender: localStorage.getItem('gender') || 'female',
            fullName: localStorage.getItem('fullName') || '',
            mobileNumber: localStorage.getItem('mobileNumber') || '',
            whatsAppNumber: localStorage.getItem('whatsAppNumber') || '',
            waterRatePerLiter: parseFloat(localStorage.getItem('waterRatePerLiter')) || 0,
            monthlyLimitLiters: parseFloat(localStorage.getItem('monthlyLimitLiters')) || 0,
            excessRatePerLiter: parseFloat(localStorage.getItem('excessRatePerLiter')) || 0,
            status: localStorage.getItem('status') || 'PENDING',
            verificationStatus: localStorage.getItem('verificationStatus') || 'NOT_SUBMITTED',
            meterId: localStorage.getItem('meterId') || 'N/A'
          });
        }
      }
    };
    fetchProfile();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdSuccess('');
    setPwdError('');

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setPwdLoading(true);
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');

    if (username && token) {
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await api.put(`/users/profile/change-password/${username}`, {
          currentPassword,
          newPassword
        });
        
        setPwdSuccess(res.data.message || 'Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPwdSuccess(''), 3000);
      } catch (err) {
        console.error("Error changing password:", err);
        const errMsg = err.response?.data?.message || err.response?.data || 'Failed to change password. Please check your current password.';
        setPwdError(typeof errMsg === 'string' ? errMsg : 'Failed to change password.');
      } finally {
        setPwdLoading(false);
      }
    } else {
      setPwdLoading(false);
      setPwdError('Session expired. Please login again.');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    // Convert email to lowercase and validate @
    if (!profileData.email || !profileData.email.includes('@')) {
      setSuccessMsg('Email must contain "@" and be valid.');
      return;
    }
    const cleanEmail = profileData.email.trim().toLowerCase();

    // Validate mobile/whatsapp lengths
    if (!profileData.mobileNumber || !/^\d{10}$/.test(profileData.mobileNumber)) {
      setSuccessMsg('Mobile number must be exactly 10 digits.');
      return;
    }
    if (!profileData.whatsAppNumber || !/^\d{10}$/.test(profileData.whatsAppNumber)) {
      setSuccessMsg('WhatsApp number must be exactly 10 digits.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');
    
    if (username && token) {
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await api.put(`/users/profile/${username}`, {
          email: cleanEmail,
          gender: profileData.gender,
          fullName: profileData.fullName,
          mobileNumber: profileData.mobileNumber,
          whatsAppNumber: profileData.whatsAppNumber
        });
        
        // Update localStorage as well
        localStorage.setItem('email', res.data.email || '');
        localStorage.setItem('gender', res.data.gender || 'female');
        localStorage.setItem('fullName', res.data.fullName || '');
        localStorage.setItem('mobileNumber', res.data.mobileNumber || '');
        localStorage.setItem('whatsAppNumber', res.data.whatsAppNumber || '');
        
        setSuccessMsg('Profile updated successfully in database!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        console.error("Error saving profile details:", err);
        setSuccessMsg('Failed to save profile changes to database.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Account Profile</h1>
          <p className="text-text-muted mt-1">Manage your personal information and preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6 flex flex-col items-center lg:items-stretch">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center h-fit w-full [perspective:1000px] relative group/wrapper"
          >
            {/* 3D Liquid Glow behind the card */}
            <div className="absolute inset-x-8 inset-y-4 bg-gradient-to-r from-primary/30 to-[#58b0e0]/30 rounded-3xl opacity-0 group-hover/wrapper:opacity-90 blur-2xl transition-all duration-500 -z-10 scale-95 group-hover/wrapper:scale-105" />

            <div className="profile-card w-[300px] rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.12)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.4)] hover:shadow-[0_30px_60px_rgba(88,176,224,0.35)] overflow-hidden z-10 relative cursor-pointer bg-surface border border-border/80 flex flex-col items-center justify-center gap-3 transition-all duration-500 [transform-style:preserve-3d] hover:[transform:translateY(-10px)_rotateX(8deg)_rotateY(-8deg)] group">
              {/* Glossy Liquid Refraction Glass Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-30 [transform:translateZ(50px)]" />

              <div className="avatar w-full pt-5 flex items-center justify-center flex-col gap-1 [transform-style:preserve-3d] [transform:translateZ(40px)]">
                <div className="img_container w-full flex items-center justify-center relative z-40 after:absolute after:h-[6px] after:w-full after:bg-[#58b0e0] after:top-4 after:group-hover:size-[1%] after:delay-300 after:group-hover:delay-0 after:group-hover:transition-all after:group-hover:duration-300 after:transition-all after:duration-300 before:absolute before:h-[6px] before:w-full before:bg-[#58b0e0] before:bottom-4 before:group-hover:size-[1%] before:delay-300 before:group-hover:delay-0 before:group-hover:transition-all before:group-hover:duration-300 before:transition-all before:duration-300">
                  {profileData.gender === 'female' ? (
                    <svg className="size-36 z-40 border-4 border-surface rounded-full group-hover:border-8 group-hover:transition-all group-hover:duration-300 transition-all duration-300 bg-[#58b0e0]" id="avatar" viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg">
                      <g data-name="Layer 2">
                        <g data-name="—ÎÓÈ 1">
                          <path d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.266 0-21.281-35.266 0-35.266z" fillRule="evenodd" fill="#ffe8be"></path>
                          <circle fill="#58b0e0" r="30.9" cy="30.9" cx="30.9"></circle>
                          <path d="M45.487 19.987l-29.173.175s1.048 16.148-2.619 21.21h35.701c-.92-1.35-3.353-1.785-3.909-21.385z" fillRule="evenodd" fill="#60350a"></path>
                          <path d="M18.135 45.599l7.206-3.187 11.55-.3 7.42 3.897-5.357 11.215-7.613 4.088-7.875-4.35-5.331-11.363z" fillRule="evenodd" fill="#d5e1ed"></path>
                          <path d="M24.744 38.68l12.931.084v8.949l-12.931-.085V38.68z" fillRule="evenodd" fill="#f9dca4"></path>
                          <path opacity=".11" d="M37.677 38.778v3.58a9.168 9.168 0 0 1-.04 1.226 6.898 6.898 0 0 1-.313 1.327c-4.37 4.165-11.379.78-12.49-6.333z" fillRule="evenodd"></path>
                          <path d="M52.797 52.701a30.896 30.896 0 0 1-44.08-.293l1.221-3.098 9.103-4.122c3.262 5.98 6.81 11.524 12.317 15.455A45.397 45.397 0 0 0 43.2 45.483l8.144 3.853z" fillRule="evenodd" fill="#434955"></path>
                          <path d="M19.11 24.183c-2.958 1.29-.442 7.41 1.42 7.383a30.842 30.842 0 01-1.42-7.383zM43.507 24.182c2.96 1.292.443 7.411-1.419 7.384a30.832 30.832 0 001.419-7.384z" fillRule="evenodd" fill="#f9dca4"></path>
                          <path d="M31.114 8.666c8.722 0 12.377 6.2 12.601 13.367.307 9.81-5.675 21.43-12.6 21.43-6.56 0-12.706-12.018-12.333-21.928.26-6.953 3.814-12.869 12.332-12.869z" fillRule="evenodd" fill="#ffe8be"></path>
                          <path d="M33.399 24.983a7.536 7.536 0 0 1 5.223-.993h.005c5.154.63 5.234 2.232 4.733 2.601a2.885 2.885 0 0 0-.785 1.022 6.566 6.566 0 0 1-1.052 2.922 5.175 5.175 0 0 1-3.464 2.312c-.168.027-.34.048-.516.058a4.345 4.345 0 0 1-3.65-1.554 8.33 8.33 0 0 1-1.478-2.53v.003s-.797-1.636-2.072-.114a8.446 8.446 0 0 1-1.52 2.64 4.347 4.347 0 0 1-3.651 1.555 5.242 5.242 0 0 1-.516-.058 5.176 5.176 0 0 1-3.464-2.312 6.568 6.568 0 0 1-1.052-2.921 2.75 2.75 0 0 0-.77-1.023c-.5-.37-.425-1.973 4.729-2.603h.002a7.545 7.545 0 0 1 5.24 1.01l-.001-.001.003.002.215.131a3.93 3.93 0 0 0 3.842-.148l-.001.001zm-4.672.638a6.638 6.638 0 0 0-6.157-.253c-1.511.686-1.972 1.17-1.386 3.163a5.617 5.617 0 0 0 .712 1.532 4.204 4.204 0 0 0 3.326 1.995 3.536 3.536 0 0 0 2.966-1.272 7.597 7.597 0 0 0 1.36-2.37c.679-1.78.862-1.863-.82-2.795zm10.947-.45a6.727 6.727 0 0 0-5.886.565c-1.538.911-1.258 1.063-.578 2.79a7.476 7.476 0 0 0 1.316 2.26 3.536 3.536 0 0 0 2.967 1.272 4.228 4.228 0 0 0 .43-.048 4.34 4.34 0 0 0 2.896-1.947 5.593 5.593 0 0 0 .684-1.44c.702-2.25.076-2.751-1.828-3.451z" fillRule="evenodd" fill="#464449"></path>
                          <path d="M17.89 25.608c0-.638.984-.886 1.598 2.943a22.164 22.164 0 0 0 .956-4.813c1.162.225 2.278 2.848 1.927 5.148 3.166-.777 11.303-5.687 13.949-12.324 6.772 3.901 6.735 12.094 6.735 12.094s.358-1.9.558-3.516c.066-.538.293-.733.798-.213C48.073 17.343 42.3 5.75 31.297 5.57c-15.108-.246-17.03 16.114-13.406 20.039z" fillRule="evenodd" fill="#8a5c42"></path>
                          <path d="M24.765 42.431a14.125 14.125 0 0 0 6.463 5.236l-4.208 6.144-5.917-9.78z" fillRule="evenodd" fill="#fff"></path>
                          <path d="M37.682 42.431a14.126 14.126 0 0 1-6.463 5.236l4.209 6.144 5.953-9.668z" fillRule="evenodd" fill="#fff"></path>
                          <circle fill="#434955" r=".839" cy="52.562" cx="31.223"></circle>
                          <circle fill="#434955" r=".839" cy="56.291" cx="31.223"></circle>
                          <path d="M41.997 24.737c1.784.712 1.719 1.581 1.367 1.841a2.886 2.886 0 0 0-.785 1.022 6.618 6.618 0 0 1-.582 2.086v-4.949zm-21.469 4.479a6.619 6.619 0 0 1-.384-1.615 2.748 2.748 0 0 0-.77-1.023c-.337-.249-.413-1.06 1.154-1.754z" fillRule="evenodd" fill="#464449"></path>
                        </g>
                      </g>
                    </svg>
                  ) : profileData.gender === 'male' && profileData.role === 'Admin' ? (
                    <img src="/male_admin.png" alt="Admin Avatar" className="size-36 z-40 border-4 border-surface rounded-full group-hover:border-8 group-hover:transition-all group-hover:duration-300 transition-all duration-300 object-cover bg-surface-lighter" />
                  ) : profileData.gender === 'male' ? (
                    <img src="/male_household.png" alt="Household Avatar" className="size-36 z-40 border-4 border-surface rounded-full group-hover:border-8 group-hover:transition-all group-hover:duration-300 transition-all duration-300 object-cover bg-surface-lighter" />
                  ) : (
                    <svg className="size-36 z-40 border-4 border-surface rounded-full group-hover:border-8 group-hover:transition-all group-hover:duration-300 transition-all duration-300 bg-[#58b0e0]" viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg">
                      <g data-name="Layer 2">
                        <g data-name="Male Avatar">
                          <path d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.266 0-21.281-35.266 0-35.266z" fillRule="evenodd" fill="#ffe8be"></path>
                          <circle fill="#58b0e0" r="30.9" cy="30.9" cx="30.9"></circle>
                          <path d="M52.797 52.701a30.896 30.896 0 0 1-44.08-.293l1.221-3.098 9.103-4.122c3.262 5.98 6.81 11.524 12.317 15.455A45.397 45.397 0 0 0 43.2 45.483l8.144 3.853z" fillRule="evenodd" fill="#2c3e50"></path>
                          <path d="M18.135 45.599l7.206-3.187 11.55-.3 7.42 3.897-5.357 11.215-7.613 4.088-7.875-4.35-5.331-11.363z" fillRule="evenodd" fill="#ecf0f1"></path>
                          <path d="M24.744 38.68l12.931.084v8.949l-12.931-.085V38.68z" fillRule="evenodd" fill="#f9dca4"></path>
                          <path opacity=".11" d="M37.677 38.778v3.58a9.168 9.168 0 0 1-.04 1.226 6.898 6.898 0 0 1-.313 1.327c-4.37 4.165-11.379.78-12.49-6.333z" fillRule="evenodd"></path>
                          <path d="M29.5 45.5l2.8-1.5 2.8 1.5-1.5 12h-2.6l-1.5-12z" fill="#e74c3c"></path>
                          <path d="M31.114 8.666c8.722 0 12.377 6.2 12.601 13.367.307 9.81-5.675 21.43-12.6 21.43-6.56 0-12.706-12.018-12.333-21.928.26-6.953 3.814-12.869 12.332-12.869z" fillRule="evenodd" fill="#ffe8be"></path>
                          <path d="M19.11 24.183c-2.958 1.29-.442 7.41 1.42 7.383a30.842 30.842 0 01-1.42-7.383zM43.507 24.182c2.96 1.292.443 7.411-1.419 7.384a30.832 30.832 0 001.419-7.384z" fillRule="evenodd" fill="#f9dca4"></path>
                          <path d="M17.89 25.608c0-5.6 4.98-15.8 13.4-15.8 8.42 0 13.4 10.2 13.4 15.8-2-8-6.5-11.5-13.4-11.5-6.9 0-11.4 3.5-13.4 11.5z" fillRule="evenodd" fill="#34495e"></path>
                          <path d="M44.7 20.8c-3-8.5-8.5-14.5-13.6-14.5-5.1 0-10.6 6-13.6 14.5 2-4 6-7.5 13.6-7.5 7.6 0 11.6 3.5 13.6 7.5z" fill="#2c3e50"></path>
                          <path d="M21 16c2-4 6-7 10-7s8 3 10 7c-2-2-6-4-10-4s-8 2-10 4z" fill="#1a252f"></path>
                          <path d="M24.765 24.431a4.125 4.125 0 0 0 6.463 5.236l-4.208 6.144-5.917-9.78z" fillRule="evenodd" fill="#fff" opacity="0.3"></path>
                          <path d="M37.682 24.431a4.126 4.126 0 0 1-6.463 5.236l4.209 6.144 5.953-9.668z" fillRule="evenodd" fill="#fff" opacity="0.3"></path>
                          <circle fill="#2c3e50" r="1.5" cy="24.5" cx="26.2"></circle>
                          <circle fill="#2c3e50" r="1.5" cy="24.5" cx="36.2"></circle>
                          <path d="M27 34c1 1 3 1.5 4 1.5s3-.5 4-1.5c0 1-2 2-4 2s-4-1-4-2z" fill="#34495e"></path>
                        </g>
                      </g>
                    </svg>
                  )}
                  <div className="absolute bg-[#58b0e0] z-10 size-[60%] w-full group-hover:size-[1%] group-hover:transition-all group-hover:duration-300 transition-all duration-300 delay-700 group-hover:delay-0"></div>
                </div>
              </div>
              <div className="headings *:text-center *:leading-4 [transform:translateZ(30px)]">
                <p className="text-xl font-serif font-semibold text-text uppercase">{profileData.fullName || profileData.username || 'ANNA WILSON'}</p>
                <p className="text-xs font-semibold text-text-muted mt-1">@{profileData.username}</p>
                <p className="text-xs font-semibold text-text-muted uppercase mt-1">{profileData.role || 'DEVELOPER'}</p>
              </div>
              <div className="w-full items-center justify-center flex [transform:translateZ(20px)]">
                <ul className="flex flex-col items-start gap-2 has-[:last]:border-b-0 *:inline-flex *:gap-2 *:items-center *:justify-center *:border-b-[1.5px] *:border-b-border *:border-dotted *:text-xs *:font-semibold *:text-text-muted pb-3">
                  {profileData.mobileNumber && (
                    <li>
                      <svg id="phone" viewBox="0 0 24 24" className="fill-text-muted group-hover:fill-primary transition-colors" height="15" width="15" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0h24v24H0V0z" fill="none"></path>
                        <path d="M19.23 15.26l-2.54-.29c-.61-.07-1.21.14-1.64.57l-1.84 1.84c-2.83-1.44-5.15-3.75-6.59-6.59l1.85-1.85c.43-.43.64-1.03.57-1.64l-.29-2.52c-.12-1.01-.97-1.77-1.99-1.77H5.03c-1.13 0-2.07.94-2 2.07.53 8.54 7.36 15.36 15.89 15.89 1.13.07 2.07-.87 2.07-2v-1.73c.01-1.01-.75-1.86-1.76-1.98z"></path>
                      </svg>
                      <p>+91 {profileData.mobileNumber}</p>
                    </li>
                  )}
                  {profileData.whatsAppNumber && (
                    <li>
                      <svg className="fill-text-muted group-hover:fill-primary transition-colors" height="15" width="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.488 1.459 5.407 1.461 5.563 0 10.09-4.519 10.093-10.078a10.022 10.022 0 00-2.952-7.133 10.022 10.022 0 00-7.143-2.95c-5.567 0-10.094 4.52-10.098 10.079-.001 1.916.499 3.794 1.448 5.402L5.436 20.31l1.21-.356zM17.11 14.18c-.28-.14-1.654-.816-1.91-.908-.255-.092-.44-.14-.624.14-.184.28-.71.908-.87 1.092-.158.184-.317.208-.597.068-.28-.14-1.182-.435-2.251-1.39-1.378-1.23-1.644-2.856-1.727-3.003-.083-.14-.009-.216.061-.285.063-.063.14-.163.21-.244.07-.08.093-.135.14-.227.046-.093.023-.173-.011-.243-.035-.07-.624-1.503-.855-2.058-.225-.542-.472-.468-.624-.476l-.532-.007c-.183 0-.482.068-.734.34-.252.272-.962.94-.962 2.294 0 1.353.984 2.66 1.122 2.845.138.184 1.937 2.956 4.693 4.146.655.283 1.168.452 1.567.579.66.21 1.258.18 1.733.11.53-.08 1.654-.676 1.888-1.33.234-.654.234-1.216.164-1.33-.07-.11-.256-.18-.536-.32z"/>
                      </svg>
                      <p>+91 {profileData.whatsAppNumber}</p>
                    </li>
                  )}
                  <li>
                    <svg className="fill-text-muted group-hover:fill-primary transition-colors" height="15" width="15" id="mail" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16,14.81,28.78,6.6A3,3,0,0,0,27,6H5a3,3,0,0,0-1.78.6Z"></path>
                      <path d="M16.54,16.84h0l-.17.08-.08,0A1,1,0,0,1,16,17h0a1,1,0,0,1-.25,0l-.08,0-.17-.08h0L2.1,8.26A3,3,0,0,0,2,9V23a3,3,0,0,0,3,3H27a3,3,0,0,0,3-3V9a3,3,0,0,0-.1-.74Z"></path>
                    </svg>
                    <p>{profileData.email || 'smkys@gmail.com'}</p>
                  </li>
                  <li>
                    <svg className="fill-text-muted group-hover:fill-primary transition-colors" height="15" width="15" id="globe" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <g data-name="Layer 2">
                        <path data-name="globe" d="M22 12A10 10 0 0 0 12 2a10 10 0 0 0 0 20 10 10 0 0 0 10-10zm-2.07-1H17a12.91 12.91 0 0 0-2.33-6.54A8 8 0 0 1 19.93 11zM9.08 13H15a11.44 11.44 0 0 1-3 6.61A11 11 0 0 1 9.08 13zm0-2A11.4 11.4 0 0 1 12 4.4a11.19 11.19 0 0 1 3 6.6zm.36-6.57A13.18 13.18 0 0 0 7.07 11h-3a8 8 0 0 1 5.37-6.57zM4.07 13h3a12.86 12.86 0 0 0 2.35 6.56A8 8 0 0 1 4.07 13zm10.55 6.55A13.14 13.14 0 0 0 17 13h2.95a8 8 0 0 1-5.33 6.55z"></path>
                      </g>
                    </svg>
                    <p>aquatrack.app</p>
                  </li>
                  {profileData.role !== 'Admin' && (
                    <li>
                      <svg id="map" viewBox="0 0 16 16" className="fill-text-muted group-hover:fill-primary transition-colors" height="15" width="15" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 0C5.2 0 3 2.2 3 5s4 11 5 11 5-8.2 5-11-2.2-5-5-5zm0 8C6.3 8 5 6.7 5 5s1.3-3 3-3 3 1.3 3-3 3z"></path>
                      </svg>
                      <p>
                        {profileData.role === 'Community Admin' 
                          ? `${profileData.apartmentBlock}${profileData.colonyName ? ', ' + profileData.colonyName : ''}` 
                          : `${profileData.apartmentBlock}, ${profileData.houseNumber}${profileData.colonyName ? ' (' + profileData.colonyName + ')' : ''}`}
                      </p>
                    </li>
                  )}
                </ul>
              </div>
              <hr className="w-full group-hover:h-5 h-3 bg-[#58b0e0] group-hover:transition-all group-hover:duration-300 transition-all duration-300 border-none m-0 [transform:translateZ(15px)]" />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 w-full max-w-[300px] mx-auto lg:max-w-none"
          >
            <h3 className="font-semibold text-text mb-4 border-b border-border pb-3 flex items-center gap-2">
              <Key className="w-4.5 h-4.5 text-primary" /> Change Password
            </h3>
            
            {pwdSuccess && (
              <div className="mb-4 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                {pwdSuccess}
              </div>
            )}
            {pwdError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {pwdError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 text-text"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 text-text"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 text-text"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={pwdLoading}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-70 mt-2"
              >
                {pwdLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Update Password
              </button>
            </form>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <h3 className="font-semibold text-text mb-6 border-b border-border pb-4">Personal Information</h3>
          
          {successMsg && (
            <div className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Username (Read-only)</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="text" 
                    value={profileData.username}
                    disabled
                    className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-muted cursor-not-allowed opacity-75 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="text" 
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                    className="w-full bg-surface-lighter border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 text-text"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Mobile Number (10 digits)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">+91</span>
                  <input 
                    type="tel" 
                    maxLength="10"
                    value={profileData.mobileNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setProfileData({...profileData, mobileNumber: val});
                    }}
                    className="w-full bg-surface-lighter border border-border rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 text-text"
                    placeholder="Mobile number"
                    required
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-medium text-text-muted font-medium">WhatsApp Number (10 digits)</label>
                  <button
                    type="button"
                    onClick={() => setProfileData(prev => ({ ...prev, whatsAppNumber: prev.mobileNumber }))}
                    className="text-xs text-primary font-semibold hover:underline focus:outline-none"
                  >
                    Same as Mobile
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">+91</span>
                  <input 
                    type="tel" 
                    maxLength="10"
                    value={profileData.whatsAppNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setProfileData({...profileData, whatsAppNumber: val});
                    }}
                    className="w-full bg-surface-lighter border border-border rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 text-text"
                    placeholder="WhatsApp number"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="email" 
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    className="w-full bg-surface-lighter border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 text-text"
                    placeholder="Enter your email address"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Gender</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setGenderOpen(!genderOpen)}
                    className="w-full bg-surface-lighter border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 text-text flex items-center justify-between text-left"
                  >
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <span>
                      {profileData.gender === 'female' ? 'Female' :
                       profileData.gender === 'male' ? 'Male' : 'Other'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${genderOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {genderOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 w-full mt-2 bg-surface border border-primary/30 rounded-xl overflow-hidden shadow-2xl z-50 backdrop-blur-md"
                      >
                        <button
                          type="button"
                          onClick={() => { setProfileData({...profileData, gender: 'female'}); setGenderOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${profileData.gender === 'female' ? 'bg-primary/20 text-primary font-medium' : 'text-text hover:bg-surface-lighter'}`}
                        >
                          Female
                        </button>
                        <button
                          type="button"
                          onClick={() => { setProfileData({...profileData, gender: 'male'}); setGenderOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${profileData.gender === 'male' ? 'bg-primary/20 text-primary font-medium' : 'text-text hover:bg-surface-lighter'}`}
                        >
                          Male
                        </button>
                        <button
                          type="button"
                          onClick={() => { setProfileData({...profileData, gender: 'other'}); setGenderOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${profileData.gender === 'other' ? 'bg-primary/20 text-primary font-medium' : 'text-text hover:bg-surface-lighter'}`}
                        >
                          Other
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {profileData.role === 'Admin' && (
              <>
                <h3 className="font-semibold text-text mt-8 mb-6 border-b border-border pb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> Administrative Authority & System Info
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">System Access Level</label>
                    <div className="relative">
                      <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        disabled
                        value="Super Administrator (Full System Control)"
                        className="w-full bg-surface/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-muted cursor-not-allowed opacity-70"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Operations Scope</label>
                    <div className="relative">
                      <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        disabled
                        value="Global Access (All Colonies, Water Meters & Users)"
                        className="w-full bg-surface/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-muted cursor-not-allowed opacity-70"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Account Status</label>
                    <div className="relative">
                      <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        disabled
                        value={`${profileData.status} (System Verified)`}
                        className="w-full bg-surface/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-emerald-400 font-semibold cursor-not-allowed opacity-90"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Administrative Privileges</label>
                    <div className="relative">
                      <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        disabled
                        value="Manage Tariffs, Reset Database, View Global Stats, Access Logs"
                        className="w-full bg-surface/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-muted cursor-not-allowed opacity-70"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {profileData.role === 'Community Admin' && (
              <>
                <h3 className="font-semibold text-text mt-8 mb-6 border-b border-border pb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> Community Administration & Tariff Settings
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Assigned Colony Name</label>
                    <div className="relative">
                      <Home className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        disabled
                        value={profileData.colonyName || 'N/A'}
                        className="w-full bg-surface/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text font-medium cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Monitored Apartment Block</label>
                    <div className="relative">
                      <Home className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        disabled
                        value={profileData.apartmentBlock || 'N/A'}
                        className="w-full bg-surface/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text font-medium cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Default Water Rate</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">₹</span>
                      <input 
                        type="text" 
                        disabled
                        value={`${profileData.waterRatePerLiter} / Litre`}
                        className="w-full bg-surface/50 border border-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-text cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Monthly Base Water Limit</label>
                    <div className="relative">
                      <Home className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        disabled
                        value={`${profileData.monthlyLimitLiters} Liters`}
                        className="w-full bg-surface/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Penalty Rate (Above limit)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">₹</span>
                      <input 
                        type="text" 
                        disabled
                        value={`${profileData.excessRatePerLiter} / Litre`}
                        className="w-full bg-surface/50 border border-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-text cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Account Scope & Actions</label>
                    <div className="relative">
                      <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        disabled
                        value="Invite & Verify Residents, Log Daily Readings, Generate Bills"
                        className="w-full bg-surface/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-muted cursor-not-allowed opacity-70"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {profileData.role === 'Household User' && (
              <>
                <h3 className="font-semibold text-text mt-8 mb-6 border-b border-border pb-4 flex items-center gap-2">
                  <Home className="w-5 h-5 text-primary" /> Household & Meter Configuration
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Apartment Block</label>
                    <div className="relative">
                      <Home className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        disabled
                        value={profileData.apartmentBlock}
                        className="w-full bg-surface/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">House / Flat Number</label>
                    <div className="relative">
                      <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        disabled
                        value={profileData.houseNumber}
                        className="w-full bg-surface/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Colony Name</label>
                    <div className="relative">
                      <Home className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        disabled
                        value={profileData.colonyName || 'N/A'}
                        className="w-full bg-surface/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Assigned Meter ID</label>
                    <div className="relative">
                      <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        disabled
                        value={profileData.meterId || 'Not Assigned'}
                        className="w-full bg-surface/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end pt-6 mt-6 border-t border-border">
              <button 
                type="submit" 
                disabled={loading}
                className="action_has has_saved !w-auto !h-auto !bg-primary hover:!bg-primary-dark !text-white !border-none !gap-2 !rounded-xl !px-6 !py-2.5 transition-colors disabled:opacity-70"
                style={{ '--color-has': '211deg 100% 100%', '--sz': '1rem' }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    fill="none"
                    style={{ color: 'white' }}
                  >
                    <path
                      d="m19,21H5c-1.1,0-2-.9-2-2V5c0-1.1.9-2,2-2h11l5,5v11c0,1.1-.9,2-2,2Z"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      data-path="box"
                    ></path>
                    <path
                      d="M7 3L7 8L15 8"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      data-path="line-top"
                    ></path>
                    <path
                      d="M17 20L17 13L7 13L7 20"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      data-path="line-bottom"
                    ></path>
                  </svg>
                )}
                <span className="font-medium text-white">Save Changes</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
