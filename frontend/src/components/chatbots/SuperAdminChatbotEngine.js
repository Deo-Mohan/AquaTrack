export const getSuperAdminPills = () => [
  'Generate executive system PDF report',
  'What is total platform revenue & pending collection?',
  'Show all escalated support tickets for Super Admin',
  'How many total communities and admins are registered?',
  'What are the current global system tariff defaults?',
  'What is the current total system water consumption?' 
  
];

export const getSuperAdminActions = () => [
  { label: '📊 Executive Dashboard', action: 'nav', path: '/admin-dashboard', type: 'primary' },
  { label: '🏛️ Escalated Tickets', action: 'nav', path: '/super-admin-tickets', type: 'secondary' },
  { label: '👥 User Directory', action: 'nav', path: '/user-directory', type: 'secondary' }
];
