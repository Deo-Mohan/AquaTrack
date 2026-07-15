import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Shield, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../api';

export default function Support() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await api.get(`/users/contacts/${username}`);
        let fetchedContacts = res.data || [];
        
        if (role === 'ROLE_ADMIN') {
          fetchedContacts.push({
            id: 'developer_contact',
            username: 'Krishna Mohan Kumar',
            email: 'krishnamohan813101@gmail.com',
            role: 'DEVELOPER',
            apartmentBlock: 'System Core',
            colonyName: 'Dev Team'
          });
        }

        setContacts(fetchedContacts);
      } catch (err) {
        console.error('Error fetching contacts', err);
        setError('Failed to load support contacts.');
      } finally {
        setLoading(false);
      }
    };
    if (username) {
      fetchContacts();
    } else {
      setLoading(false);
      setError('User not logged in.');
    }
  }, [username]);

  const handleMailTo = (email) => {
    window.location.href = `mailto:${email}`;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-text">Support & Contacts</h1>
        <p className="text-text-muted">
          Need help? Reach out to your Community Admin or System Administrator for assistance.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
          {error}
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-surface border border-border p-8 rounded-2xl text-center">
          <p className="text-text-muted">No support contacts found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
          {contacts.map((contact, index) => {
            const isDev = contact.role === 'DEVELOPER';
            const isAdmin = contact.role === 'ROLE_ADMIN';
            
            // Inline style overrides for neobrutal card custom colors based on role
            const cardStyle = {
              '--primary': isDev ? '#b829e0' : isAdmin ? '#ff3e00' : '#4d61ff',
              '--secondary': isDev ? '#8b5cf6' : isAdmin ? '#ef4444' : '#3b82f6',
              '--secondary-hover': isDev ? '#7c3aed' : isAdmin ? '#dc2626' : '#2563eb',
            };

            const desc = isDev
              ? 'Award-winning developer crafting and maintaining the technical architecture and features of AquaTrack.'
              : isAdmin
              ? 'Platform administrator managing overall system rules, tariffs, and high-level notifications.'
              : 'Community manager coordinating local block tasks, approvals, and resident support.';

            const roleLabel = isDev ? 'Developer' : isAdmin ? 'System Admin' : 'Community Admin';
            const locationText = contact.role === 'ROLE_ADMIN' 
              ? 'Central Headquarters'
              : `${contact.apartmentBlock || 'Block A'}${contact.colonyName ? ', ' + contact.colonyName : ''}`;

            return (
              <motion.div
                key={contact.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="neobrutal-card max-w-[340px] md:max-w-none"
                style={cardStyle}
              >
                <div className="card-pattern-grid"></div>
                <div className="card-overlay-dots"></div>

                <div className="bold-pattern">
                  <svg viewBox="0 0 100 100">
                    <path
                      strokeDasharray="15 10"
                      strokeWidth="10"
                      stroke="currentColor"
                      className="text-text"
                      fill="none"
                      d="M0,0 L100,0 L100,100 L0,100 Z"
                    ></path>
                  </svg>
                </div>

                <div className="card-title-area">
                  <span className="font-extrabold pr-2 truncate flex-1">
                    {contact.fullName ? `${contact.fullName} (${contact.username})` : contact.username}
                  </span>
                  <span className="card-tag">{roleLabel}</span>
                </div>

                <div className="card-body">
                  <div className="card-description">
                    {desc}
                  </div>

                  <div className="feature-grid">
                    <div className="feature-item">
                      <div className="feature-icon">
                        <svg viewBox="0 0 24 24">
                          <path d="M20,4C21.1,4 22,4.9 22,6V18C22,19.1 21.1,20 20,20H4C2.9,20 2,19.1 2,18V6C2,4.9 2.9,4 4,4H20M4,6V18H20V6H4M6,9H18V11H6V9M6,13H16V15H6V13Z"></path>
                        </svg>
                      </div>
                      <span className="feature-text select-all">{contact.email}</span>
                    </div>

                    {(contact.mobileNumber || contact.whatsAppNumber) && (
                      <div className="feature-item">
                        <div className="feature-icon">
                          <svg viewBox="0 0 24 24">
                            <path d="M6.62,10.79C8.06,13.62 10.38,15.93 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"></path>
                          </svg>
                        </div>
                        <span className="feature-text select-all">
                          {contact.mobileNumber ? `Mob: ${contact.mobileNumber}` : ''}
                          {contact.whatsAppNumber && contact.whatsAppNumber !== contact.mobileNumber ? ` | WA: ${contact.whatsAppNumber}` : ''}
                        </span>
                      </div>
                    )}

                    <div className="feature-item">
                      <div className="feature-icon">
                        <svg viewBox="0 0 24 24">
                          <path d="M12,17.56L16.07,16.43L16.62,10.33H9.38L9.2,8.3H16.8L17,6.31H7L7.56,12.32H14.45L14.22,14.9L12,15.5L9.78,14.9L9.64,13.24H7.64L7.93,16.43L12,17.56M4.07,3H19.93L18.5,19.2L12,21L5.5,19.2L4.07,3Z"></path>
                        </svg>
                      </div>
                      <span className="feature-text">{locationText}</span>
                    </div>

                    <div className="feature-item">
                      <div className="feature-icon">
                        <svg viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path>
                        </svg>
                      </div>
                      <span className="feature-text">Availability: {isDev ? '24/7 Support' : 'Mon-Fri 9AM-6PM'}</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <div className="price">
                      Active
                      <span className="price-period">Support Channel</span>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleMailTo(contact.email)} 
                        className="card-button"
                      >
                        Email
                      </button>
                      
                      {(contact.whatsAppNumber || contact.mobileNumber) && (
                        <a
                          href={`https://wa.me/${(() => {
                            const raw = contact.whatsAppNumber || contact.mobileNumber || '';
                            let cleaned = raw.replace(/\D/g, '');
                            if (cleaned.length === 10) {
                              cleaned = '91' + cleaned;
                            }
                            return cleaned.replace(/^0+/, '');
                          })()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="card-button flex items-center justify-center gap-1.5 bg-[#25D366] text-white border-[#25D366] hover:bg-[#20ba5a] hover:text-white"
                          style={{ '--secondary': '#25D366', '--secondary-hover': '#20ba5a' }}
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.488 1.459 5.407 1.461 5.563 0 10.09-4.519 10.093-10.078a10.022 10.022 0 00-2.952-7.133 10.022 10.022 0 00-7.143-2.95c-5.567 0-10.094 4.52-10.098 10.079-.001 1.916.499 3.794 1.448 5.402L5.436 20.31l1.21-.356zM17.11 14.18c-.28-.14-1.654-.816-1.91-.908-.255-.092-.44-.14-.624.14-.184.28-.71.908-.87 1.092-.158.184-.317.208-.597.068-.28-.14-1.182-.435-2.251-1.39-1.378-1.23-1.644-2.856-1.727-3.003-.083-.14-.009-.216.061-.285.063-.063.14-.163.21-.244.07-.08.093-.135.14-.227.046-.093.023-.173-.011-.243-.035-.07-.624-1.503-.855-2.058-.225-.542-.472-.468-.624-.476l-.532-.007c-.183 0-.482.068-.734.34-.252.272-.962.94-.962 2.294 0 1.353.984 2.66 1.122 2.845.138.184 1.937 2.956 4.693 4.146.655.283 1.168.452 1.567.579.66.21 1.258.18 1.733.11.53-.08 1.654-.676 1.888-1.33.234-.654.234-1.216.164-1.33-.07-.11-.256-.18-.536-.32z"/>
                          </svg>
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="dots-pattern">
                  <svg viewBox="0 0 80 40">
                    <circle fill="currentColor" className="text-text" r="3" cy="10" cx="10"></circle>
                    <circle fill="currentColor" className="text-text" r="3" cy="10" cx="30"></circle>
                    <circle fill="currentColor" className="text-text" r="3" cy="10" cx="50"></circle>
                    <circle fill="currentColor" className="text-text" r="3" cy="10" cx="70"></circle>
                    <circle fill="currentColor" className="text-text" r="3" cy="20" cx="20"></circle>
                    <circle fill="currentColor" className="text-text" r="3" cy="20" cx="40"></circle>
                    <circle fill="currentColor" className="text-text" r="3" cy="20" cx="60"></circle>
                    <circle fill="currentColor" className="text-text" r="3" cy="30" cx="10"></circle>
                    <circle fill="currentColor" className="text-text" r="3" cy="30" cx="30"></circle>
                    <circle fill="currentColor" className="text-text" r="3" cy="30" cx="50"></circle>
                    <circle fill="currentColor" className="text-text" r="3" cy="30" cx="70"></circle>
                  </svg>
                </div>

                <div className="accent-shape"></div>
                <div className="corner-slice"></div>

                <div className="stamp">
                  <span className="stamp-text">Active</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
