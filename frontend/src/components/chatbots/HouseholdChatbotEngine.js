import React, { useState, useEffect } from 'react';
import api from '../../api';

export const useHouseholdData = (houseNo, role) => {
  const [dbData, setDbData] = useState({
    recentBill: null,
    totalConsumption: null,
    unreadTickets: 0
  });

  useEffect(() => {
    const fetchHouseholdDbInfo = async () => {
      if (!houseNo || (role !== 'ROLE_HOUSEHOLD_USER' && role !== 'ROLE_RESIDENT')) return;
      try {
        const token = localStorage.getItem('token');
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const [billRes, statsRes] = await Promise.allSettled([
            api.get(`/bills/household/${houseNo}`),
            api.get(`/dashboard/household/${houseNo}`)
          ]);

          let latestBill = null;
          if (billRes.status === 'fulfilled' && billRes.value.data && billRes.value.data.length > 0) {
            latestBill = billRes.value.data[0];
          }

          let stats = null;
          if (statsRes.status === 'fulfilled' && statsRes.value.data) {
            stats = statsRes.value.data;
          }

          setDbData({
            recentBill: latestBill,
            totalConsumption: stats?.currentMonthUsageLiters || stats?.totalConsumption || null,
            unreadTickets: stats?.pendingTickets || 0
          });
        }
      } catch (err) {
        console.error("Household Chatbot database sync error:", err);
      }
    };

    fetchHouseholdDbInfo();
  }, [houseNo, role]);

  return dbData;
};

export const getHouseholdPills = (pathname) => {
  switch (pathname) {
    case '/bills':
    case '/invoices':
      return [
        'What are my current tariff rates?',
        'How is my monthly bill calculated?',
        'What is my total pending bill amount?',
        'Show bill details for March month',
        'What payment methods are supported?',
        'What is the late fee penalty rate?'
      ];
    case '/tips':
      return [
        'Give me top 3 household water-saving tips',
        'How to detect silent toilet leaks?',
        'Tips to lower excess water charge',
        'What are peak water usage hours?',
        'How faucet aerators save water'
      ];
    case '/support':
      return [
        'How do I check my ticket status?',
        'Report an urgent pipe leakage',
        'Who is my community admin?',
        'How to escalate ticket to Super Admin?',
        'Support response timeframe'
      ];
    case '/usage':
    case '/history':
      return [
        'Show my peak water consumption hours',
        'How is excess water tariff calculated?',
        'What is my monthly base water limit?',
        'How to buy extra top-up water?',
        'What is my daily average consumption?'
      ];
    case '/water-purchase':
      return [
        'How to purchase extra water quota?',
        'What is the cost per liter for top-up?',
        'When does extra water get credited?'
      ];
    default:
      return [
        'What are my current tariff rates?',
        'How is my monthly bill calculated?',
        'What is my total pending bill amount?',
        'Show bill details for March month',
        'How to buy extra top-up water?',
        'Who is my community admin?',
        'Report an urgent pipe leakage',
        'Give me top 3 household water-saving tips',
        'Show my peak water consumption hours',
        'How is excess water tariff calculated?',
        'What is my monthly base water limit?'
      ];
  }
};

export const getHouseholdActions = (pathname) => {
  if (pathname === '/bills') {
    return [
      { label: '💡 Water Saving Tips', action: 'nav', path: '/tips', type: 'secondary' },
      { label: '🎧 Support Desk', action: 'nav', path: '/support', type: 'secondary' }
    ];
  } else if (pathname === '/tips') {
    return [
      { label: '💳 Pay Water Bill', action: 'nav', path: '/bills', type: 'primary' },
      { label: '📊 View Usage History', action: 'nav', path: '/usage', type: 'secondary' }
    ];
  } else {
    return [
      { label: '💳 Pay Water Bill', action: 'nav', path: '/bills', type: 'primary' },
      { label: '🌊 Water Tips', action: 'nav', path: '/tips', type: 'secondary' },
      { label: '🛠️ Report Issue', action: 'nav', path: '/support', type: 'danger' }
    ];
  }
};
