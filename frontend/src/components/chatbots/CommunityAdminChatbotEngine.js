export const getCommunityAdminPills = () => [
  '📄 Generate P&L and audit PDF report',
  '💧 Add new water meter reading for household',
  '💰 What is the total unpaid collection in my block?',
  '📂 How to upload bulk CSV meter readings?',
  '🏠 Which households have unpaid bills in my block?',
  '⚙️ How to update base limit & late fee penalty?',
  '🎧 Show open resident support tickets for my block',
  '📩 How to send registration invites to new residents?',
  '📊 How is monthly profit & loss calculated?',
  '🔐 How to lock or unlock monthly resident billing cycle?',
  '🏷️ What is the current base tier tariff rate per KL?'
];

export const getCommunityAdminActions = () => [
  { label: '📊 Meter Workstation', action: 'nav', path: '/meter-workstation', type: 'primary' },
  { label: '📋 Tariff Settings', action: 'nav', path: '/tariff-settings', type: 'secondary' },
  { label: '🛠️ Ticket Management', action: 'nav', path: '/support-ticket-management', type: 'danger' }
];
