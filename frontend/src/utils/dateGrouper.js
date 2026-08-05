/**
 * Helper utility to group alerts & notifications by date (WhatsApp style)
 * Labels: "Today", "Yesterday", or formatted date (e.g. "August 3, 2026")
 * Includes formatted 12-hour timestamp (e.g., "02:45 PM")
 */

export function formatNotificationTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function getDateGroupHeader(dateString) {
  if (!dateString) return 'Earlier';
  const notifDate = new Date(dateString);
  if (isNaN(notifDate.getTime())) return 'Earlier';

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Strip time for date comparison
  const isSameDay = (d1, d2) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (isSameDay(notifDate, today)) {
    return 'Today';
  }
  if (isSameDay(notifDate, yesterday)) {
    return 'Yesterday';
  }

  // Return formatted full date
  return notifDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: notifDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
}

export function groupNotificationsByDate(notificationsList) {
  if (!Array.isArray(notificationsList) || notificationsList.length === 0) return [];

  // Sort newest first
  const sorted = [...notificationsList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const groupsMap = new Map();

  sorted.forEach(notif => {
    const groupName = getDateGroupHeader(notif.createdAt);
    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, []);
    }
    groupsMap.get(groupName).push(notif);
  });

  // Convert map to array of { dateLabel, items }
  return Array.from(groupsMap.entries()).map(([dateLabel, items]) => ({
    dateLabel,
    items
  }));
}
