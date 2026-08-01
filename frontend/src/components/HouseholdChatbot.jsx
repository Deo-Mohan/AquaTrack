import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

const HouseholdChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // TTS State & Controls - Default OFF (depends upon user action)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const speakingMsgIdRef = useRef(null);
  const [currentLang, setCurrentLang] = useState(() => localStorage.getItem('selectedLang') || 'en');

  // Speech Recognition (STT Voice Input)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          processUserQuery(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice speech recognition is not supported in this browser. Please use Chrome, Edge, or Brave.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        const activeLang = currentLang || localStorage.getItem('selectedLang') || 'en';
        recognitionRef.current.lang = getBcp47Locale(activeLang);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Speech recognition start error:", err);
      }
    }
  };

  // Listen to instant language changes from Header
  useEffect(() => {
    const handleLangChange = (e) => {
      const newLang = e.detail?.lang || localStorage.getItem('selectedLang') || 'en';
      setCurrentLang(newLang);
    };
    window.addEventListener('languageChange', handleLangChange);
    return () => window.removeEventListener('languageChange', handleLangChange);
  }, []);

  // Map 2-letter codes to standard SpeechSynthesis BCP 47 locale codes
  const getBcp47Locale = (code) => {
    const map = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'bn': 'bn-IN',
      'te': 'te-IN',
      'mr': 'mr-IN',
      'ta': 'ta-IN',
      'ur': 'ur-PK',
      'gu': 'gu-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'pa': 'pa-IN',
      'or': 'or-IN',
      'as': 'as-IN'
    };
    return map[code] || 'en-US';
  };

  // Web Speech API TTS helper with Language Matching & Gender Voice Inversion
  const speakText = (text, msgId) => {
    if (!('speechSynthesis' in window) || !ttsEnabled) return;

    window.speechSynthesis.cancel(); // Stop any current speech
    
    // Strip markdown formatting for natural voice output
    const cleanText = text
      .replace(/[*_~`#]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/[^\w\s.,?!₹\-\n]/gi, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Detect active site language & set exact BCP 47 locale
    const activeLang = currentLang || localStorage.getItem('selectedLang') || 'en';
    const bcp47Locale = getBcp47Locale(activeLang);
    utterance.lang = bcp47Locale;

    // Retrieve user gender from localStorage (or fallback based on profile)
    const userGender = (localStorage.getItem('gender') || 'male').toLowerCase();
    // Rule: If user is Male -> target Female voice (sweet pitch 1.15). If Female -> target Male voice (pitch 0.9)
    const targetGender = userGender === 'male' ? 'female' : 'male';
    utterance.pitch = userGender === 'male' ? 1.15 : 0.9;
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    
    // Voice Selection Strategy:
    // 1. Find voice matching locale (e.g. 'hi-IN', 'ta-IN') & target gender
    // 2. Fallback to locale matching voice
    // 3. Fallback to language code prefix (e.g. 'hi', 'ta') matching voice
    let chosenVoice = voices.find(v => {
      const matchLang = v.lang.toLowerCase().includes(activeLang.toLowerCase()) || v.lang.toLowerCase().includes(bcp47Locale.toLowerCase());
      const nameLower = v.name.toLowerCase();
      const matchGender = targetGender === 'female' 
        ? (nameLower.includes('female') || nameLower.includes('zira') || nameLower.includes('samantha') || nameLower.includes('victoria') || nameLower.includes('natural'))
        : (nameLower.includes('male') || nameLower.includes('david') || nameLower.includes('george') || nameLower.includes('alex'));
      return matchLang && matchGender;
    });

    if (!chosenVoice) {
      chosenVoice = voices.find(v => v.lang.toLowerCase().includes(bcp47Locale.toLowerCase()) || v.lang.toLowerCase().includes(activeLang.toLowerCase()));
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      speakingMsgIdRef.current = msgId;
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      speakingMsgIdRef.current = null;
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      speakingMsgIdRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      speakingMsgIdRef.current = null;
    }
  };
  
  // Position state - defaulted to bottom-right fixed positioning
  const [position, setPosition] = useState({ x: 0, y: 0 }); 
  const [hasCustomPosition, setHasCustomPosition] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const windowRef = useRef(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, windowX: 0, windowY: 0 });
  const messagesEndRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve true User Profile Details & DB Information
  const storedName = localStorage.getItem('fullName') || localStorage.getItem('username') || localStorage.getItem('name') || '';
  const houseNo = localStorage.getItem('houseNumber') || localStorage.getItem('houseNo') || 'H-101';
  const role = localStorage.getItem('role') || 'ROLE_HOUSEHOLD_USER';

  // Strictly enforce Household User restriction: Do not render chatbot for Community Admins or Super Admins
  if (role === 'ROLE_COMMUNITY_ADMIN' || role === 'ROLE_ADMIN') {
    return null;
  }

  const [dbData, setDbData] = useState({
    recentBill: null,
    totalConsumption: null,
    unreadTickets: 0
  });

  // Ultra-Smooth Screen Dragging Implementation
  const handleMouseDown = (e) => {
    if (isMaximized) return;
    if (e.target.closest('button') || e.target.closest('input')) return;
    e.preventDefault();

    let initialX = position.x;
    let initialY = position.y;

    if (!hasCustomPosition && windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      setPosition({ x: initialX, y: initialY });
      setHasCustomPosition(true);
    }

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      windowX: initialX,
      windowY: initialY
    };

    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;

      const windowWidth = windowRef.current ? windowRef.current.offsetWidth : 400;
      const windowHeight = windowRef.current ? windowRef.current.offsetHeight : 550;

      const newX = Math.max(10, Math.min(window.innerWidth - windowWidth - 10, dragStartRef.current.windowX + deltaX));
      const newY = Math.max(10, Math.min(window.innerHeight - windowHeight - 10, dragStartRef.current.windowY + deltaY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Fetch real database records (Bills, Usage, Support) for household user
  useEffect(() => {
    const fetchHouseholdDbInfo = async () => {
      if (!houseNo || role !== 'ROLE_HOUSEHOLD_USER') return;
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
        console.error("Chatbot database sync error:", err);
      }
    };

    fetchHouseholdDbInfo();
  }, [houseNo, role]);

  const displayName = storedName ? storedName : 'Resident';

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  // Clear/Reset chat conversation history
  const handleClearChat = () => {
    stopSpeaking();
    let welcomeText = `Hello **${displayName}**! 👋 I am your **AI Insights Assistant** for House **${houseNo}**.\n\n`;
    if (dbData.recentBill) {
      const amt = dbData.recentBill.amount ? dbData.recentBill.amount.toFixed(2) : '0.00';
      const status = dbData.recentBill.status || 'UNPAID';
      welcomeText += `• **Latest Bill**: ₹${amt} (${status})\n`;
    }
    welcomeText += `How can I assist you with your water usage, billing, or support tickets today?`;

    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: welcomeText,
        actions: getContextualActions(location.pathname),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Welcome message with actual Resident Name & Household Database status
  useEffect(() => {
    if (messages.length === 0) {
      handleClearChat();
    }
  }, [displayName, houseNo, dbData.recentBill]);

  function getContextualPills(path) {
    switch (path) {
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
  }

  function getContextualActions(path) {
    if (path === '/bills') {
      return [
        { label: '💡 Water Saving Tips', action: 'nav', path: '/tips', type: 'secondary' },
        { label: '🎧 Support Desk', action: 'nav', path: '/support', type: 'secondary' }
      ];
    } else if (path === '/tips') {
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
  }

  const processUserQuery = async (queryText) => {
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await api.post('/chatbot/query', {
        query: queryText,
        houseNumber: houseNo,
        activePage: location.pathname
      });

      if (res.data && res.data.answer) {
        const botMsgId = Date.now() + 1;
        const botMsg = {
          id: botMsgId,
          sender: 'bot',
          text: res.data.answer,
          actions: res.data.actions || getContextualActions(location.pathname),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
        speakText(res.data.answer, botMsgId);
        return;
      }
    } catch (err) {
      console.warn("Backend chatbot API fallback triggered:", err);
    }

    setTimeout(() => {
      let botResponseText = "";
      let botActions = [];
      const lower = queryText.toLowerCase().trim();

      if (lower.startsWith('hi') || lower.startsWith('hello') || lower.startsWith('hey') || lower.startsWith('good morning')) {
        botResponseText = `Hello **${displayName}**! 👋 Welcome. How can I assist you with your water bills, usage, or maintenance tickets for House **${houseNo}** today?`;
        botActions = getContextualActions(location.pathname);
      } else if (lower.includes('who are you') || lower.includes('your name')) {
        botResponseText = `I am your **AI Insights Assistant**! ⚡\n\nI can help you track daily water usage, view & pay monthly bills, report leaks, and discover water-saving tips.`;
        botActions = getContextualActions(location.pathname);
      } else if (lower.includes('how are you')) {
        botResponseText = `I'm doing great and ready to assist you! How is everything with the water supply in House **${houseNo}**?`;
        botActions = getContextualActions(location.pathname);
      } else if (lower.includes('thank') || lower.includes('thanks')) {
        botResponseText = `You're very welcome! 😊 Feel free to ask if you need anything else.`;
        botActions = getContextualActions(location.pathname);
      } else if (lower.includes('bill') || lower.includes('pay') || lower.includes('tariff') || lower.includes('cost')) {
        let billInfo = dbData.recentBill 
          ? `Your current bill for **${houseNo}** is **₹${dbData.recentBill.amount?.toFixed(2)}** (Status: **${dbData.recentBill.status}**).`
          : `For house **${houseNo}**, usage up to standard limit is billed at base tariff rate, while excess usage incurs Tier 2 tariff.`;
        botResponseText = `${billInfo}\n\nYou can view your itemized billing statement or pay instantly via online gateway.`;
        botActions = [
          { label: '💳 Pay Bill', action: 'nav', path: '/bills', type: 'primary' },
          { label: '📊 Water Usage', action: 'nav', path: '/usage', type: 'secondary' }
        ];
      } else if (lower.includes('leak') || lower.includes('pipe') || lower.includes('issue') || lower.includes('support') || lower.includes('ticket')) {
        botResponseText = `Hi **${displayName}**, if you notice an urgent leak or water supply issue in house **${houseNo}**:\n\n1. Turn off main stop-cock valve.\n2. Raise a high-priority ticket on the Support Desk.`;
        botActions = [
          { label: '🛠️ Report Issue', action: 'nav', path: '/support', type: 'danger' },
          { label: '🌊 Water Tips', action: 'nav', path: '/tips', type: 'secondary' }
        ];
      } else if (lower.includes('tip') || lower.includes('save') || lower.includes('reduce') || lower.includes('excess')) {
        botResponseText = `Here are actionable ways to lower your monthly bill:\n\n• **Aerators**: Fit faucet aerators to save up to 30% water.\n• **Flush Leaks**: Check toilet tank flappers for hidden trickles.\n• **Track Usage**: Check daily graphs under My Usage.`;
        botActions = [
          { label: '🌊 Water Tips', action: 'nav', path: '/tips', type: 'primary' },
          { label: '💳 Bills History', action: 'nav', path: '/bills', type: 'secondary' }
        ];
      } else {
        botResponseText = `I am tuned specifically for your household water services! 💧\n\nI can help you with your **water bills, usage analytics, leakage reports, and conservation tips** for House **${houseNo}**.`;
        botActions = getContextualActions(location.pathname);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: botResponseText,
          actions: botActions,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    processUserQuery(input);
  };

  const handleActionClick = (act) => {
    if (act.action === 'nav' && act.path) {
      navigate(act.path);
    }
  };

  // Render formatted markdown text
  const renderMessageContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      let formatted = line;
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-emerald-800 dark:text-emerald-300">$1</strong>');
      return (
        <p key={idx} className="mb-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  return (
    <>
      {/* Floating Chat Container: Inspired by LexieLingua Neobrutal/Pastel AI Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={windowRef}
            initial={{ opacity: 0, scale: 0.85, y: 30, rotate: -1 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30, rotate: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            style={
              isMaximized
                ? { inset: '20px', position: 'fixed', zIndex: 9999, width: 'calc(100vw - 40px)', height: 'calc(100vh - 40px)' }
                : hasCustomPosition
                ? { left: `${position.x}px`, top: `${position.y}px`, position: 'fixed', zIndex: 9999 }
                : { right: '24px', bottom: '90px', position: 'fixed', zIndex: 9999 }
            }
            className={`${
              isMaximized ? '' : 'w-[390px] sm:w-[430px] max-w-[calc(100vw-32px)] h-[600px]'
            } rounded-3xl bg-surface/95 backdrop-blur-2xl border-2 border-primary/40 shadow-[0_20px_50px_rgba(0,120,255,0.25)] flex flex-col overflow-hidden text-text select-none ${
              isDragging ? 'transition-none ring-4 ring-primary/60' : 'transition-all duration-300'
            }`}
          >
            {/* Header: Aqua Accent Banner */}
            <div
              onMouseDown={handleMouseDown}
              className="px-5 py-4 bg-gradient-to-r from-blue-600/20 via-primary/15 to-cyan-500/20 border-b border-border/80 flex items-center justify-between cursor-grab active:cursor-grabbing z-20"
            >
              <div className="flex items-center space-x-3 pointer-events-none">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/40 shadow-md flex items-center justify-center bg-black relative">
                  <img 
                    src="https://cdn.dribbble.com/userupload/17215135/file/original-d9010db81823243083723c4ff1e1b909.gif" 
                    alt="AI Insights GIF" 
                    className="w-full h-full object-cover scale-[2.25] rounded-full"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-text flex items-center gap-1.5">
                    AI Insights
                  </h3>
                  <p className="text-[10px] text-text-muted font-semibold">Smart Household Recommendations</p>
                </div>
              </div>

              {/* Header Controls: Voice TTS Toggle, Minimize, Maximize, Close */}
              <div className="flex items-center space-x-1.5 z-30">
                {/* TTS Voice Toggle Button */}
                <button
                  onClick={() => {
                    if (isSpeaking) {
                      stopSpeaking();
                    }
                    setTtsEnabled(!ttsEnabled);
                  }}
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                    ttsEnabled 
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/30' 
                      : 'bg-surface text-text-muted border-border hover:bg-surface-lighter'
                  }`}
                  title={ttsEnabled ? "Voice Output Active (Click to Mute TTS)" : "Voice Output Muted (Click to Enable TTS)"}
                  aria-label="TTS Voice Toggle"
                >
                  {ttsEnabled ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 ${isSpeaking ? 'animate-bounce' : ''}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.287a5.25 5.25 0 010 7.426M12 6.75v10.5a.75.75 0 01-1.28.53l-4.72-4.72H4.5A2.25 2.25 0 012.25 10.8v-1.6c0-1.243 1.007-2.25 2.25-2.25h1.5l4.72-4.72a.75.75 0 011.28.53z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.84a.75.75 0 01-1.28.53l-4.72-4.72H4.5A2.25 2.25 0 012.25 13.2v-2.4c0-1.243 1.007-2.25 2.25-2.25h1.5z" />
                    </svg>
                  )}
                </button>

                {/* Clear / Refresh Chat Button */}
                <button
                  onClick={handleClearChat}
                  className="w-8 h-8 rounded-xl bg-surface hover:bg-primary/20 text-text-muted hover:text-primary border border-border flex items-center justify-center transition-all cursor-pointer active:scale-90 active:rotate-180 duration-300"
                  title="Clear Chat / Reset Conversation"
                  aria-label="Refresh Chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>

                {/* Minimize Window Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-surface hover:bg-primary/20 text-text-muted hover:text-primary border border-border flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  title="Minimize Window"
                  aria-label="Minimize Chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {/* Maximize / Restore Button */}
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="w-8 h-8 rounded-xl bg-surface hover:bg-primary/20 text-text-muted hover:text-primary border border-border flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  title={isMaximized ? "Restore Window" : "Maximize Window"}
                >
                  {isMaximized ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4.5 4.5m0 0H9m-4.5 0v4.5M15 9l4.5-4.5m0 0H15m4.5 0v4.5M9 15l-4.5 4.5m0 0H9m-4.5 0v-4.5M15 15l4.5 4.5m0 0H15m4.5 0v-4.5" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  )}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-surface hover:bg-rose-500 hover:text-white text-text-muted border border-border flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  title="Close Assistant"
                  aria-label="Close Chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-background/20 select-text z-10">
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs transition-all ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 via-primary to-cyan-500 text-white rounded-br-none font-bold shadow-md shadow-primary/30'
                        : 'bg-surface text-text border border-border rounded-bl-none shadow-sm'
                    }`}
                  >
                    {renderMessageContent(msg.text)}

                    {/* Styled Action Pill Buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-border/80 flex flex-wrap gap-2">
                        {msg.actions.map((act, i) => {
                          let btnStyle = "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 font-bold";
                          
                          // Distinct color themes per action button type/label
                          if (act.type === 'primary' || act.label.toLowerCase().includes('bill')) {
                            btnStyle = "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white border border-blue-400/50 shadow-sm font-extrabold hover:shadow-blue-500/30";
                          } else if (act.label.toLowerCase().includes('tips') || act.label.toLowerCase().includes('usage')) {
                            btnStyle = "bg-gradient-to-r from-cyan-500 to-teal-500 text-white border border-cyan-300/50 shadow-sm font-extrabold hover:shadow-cyan-500/30";
                          } else if (act.type === 'danger' || act.label.toLowerCase().includes('report') || act.label.toLowerCase().includes('issue')) {
                            btnStyle = "bg-gradient-to-r from-rose-500 to-amber-600 text-white border border-rose-400/50 shadow-sm font-extrabold hover:shadow-rose-500/30";
                          }

                          return (
                            <motion.button
                              key={i}
                              whileHover={{ scale: 1.04, y: -1 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => handleActionClick(act)}
                              className={`px-3.5 py-1.5 text-[11px] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${btnStyle}`}
                            >
                              <span>{act.label}</span>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-border/40">
                      {msg.sender === 'bot' && (
                        <button
                          onClick={() => {
                            if (isSpeaking && speakingMsgIdRef.current === msg.id) {
                              stopSpeaking();
                            } else {
                              speakText(msg.text, msg.id);
                            }
                          }}
                          className="text-[10px] text-primary hover:text-cyan-400 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Listen to message voice output"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3 h-3 ${isSpeaking && speakingMsgIdRef.current === msg.id ? 'animate-pulse text-cyan-400' : ''}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.287a5.25 5.25 0 010 7.426M12 6.75v10.5a.75.75 0 01-1.28.53l-4.72-4.72H4.5A2.25 2.25 0 012.25 10.8v-1.6c0-1.243 1.007-2.25 2.25-2.25h1.5l4.72-4.72a.75.75 0 011.28.53z" />
                          </svg>
                          <span>{isSpeaking && speakingMsgIdRef.current === msg.id ? 'Stop' : 'Listen'}</span>
                        </button>
                      )}
                      <span className={`text-[9px] font-medium ml-auto ${msg.sender === 'user' ? 'text-white/80' : 'text-text-muted'}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-lime-300 dark:border-lime-900 px-4 py-3 rounded-2xl rounded-bl-none w-fit shadow-sm"
                >
                  <span className="w-2 h-2 bg-[#84cc16] rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-lime-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Pills */}
            <div className="px-3.5 py-2.5 bg-[#d9f99d]/60 dark:bg-[#274e13]/60 border-t border-[#bef264] overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex items-center space-x-2 z-10">
              {getContextualPills(location.pathname).map((pill, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => processUserQuery(pill)}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-lime-400 text-lime-900 dark:text-lime-300 hover:border-lime-600 transition-all flex-shrink-0 cursor-pointer shadow-xs"
                >
                  {pill}
                </motion.button>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-900 border-t border-[#bef264] flex items-center gap-2 z-10">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening... speak now" : "Ask about water bills, leakages, or usage..."}
                className={`flex-1 text-xs px-4 py-2.5 rounded-2xl border transition-all focus:outline-none ${
                  isListening 
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/50 animate-pulse placeholder:text-rose-400 font-bold' 
                    : 'bg-lime-50/50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border-lime-300 dark:border-slate-700 focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/30 placeholder:text-slate-400'
                }`}
              />

              {/* Voice Command Microphone Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={toggleVoiceInput}
                className={`p-2.5 rounded-2xl transition-all flex items-center justify-center cursor-pointer border ${
                  isListening 
                    ? 'bg-rose-500 text-white border-rose-600 animate-bounce shadow-md shadow-rose-500/40' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-lime-500 hover:text-lime-600'
                }`}
                title={isListening ? "Listening... Click to stop" : "Speak Voice Command"}
                aria-label="Voice Command Mic"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 003-3V4.5a3 3 0 00-6 0v8.25a3 3 0 003 3z" />
                </svg>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 rounded-2xl bg-[#84cc16] hover:bg-[#65a30d] text-white disabled:opacity-40 transition-all shadow-md shadow-lime-600/30 cursor-pointer flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Launcher Button & Thought Cloud (Hidden when chat window is open) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* High-Fidelity SVG AI Thought Cloud Bubble */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, x: 25, y: 25 }}
                  animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, scale: 0.6, x: 25, y: 25 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  className="absolute bottom-16 right-10 flex flex-col items-end pointer-events-none z-50 filter drop-shadow-[0_14px_35px_rgba(0,120,255,0.45)]"
                >
                  <div className="relative w-[340px] h-[150px]">
                    {/* SVG Cloud Speech Bubble Vector */}
                    <svg viewBox="0 0 310 135" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <defs>
                        <linearGradient id="cloudBgLight" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
                          <stop offset="100%" stopColor="#f0f7ff" stopOpacity="0.96" />
                        </linearGradient>
                        <linearGradient id="cloudStrokeLight" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0078ff" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                      {/* Cloud Main Bubble Path */}
                      <path
                        d="M 50 45 
                           C 40 25, 65 5, 95 18 
                           C 115 2, 155 0, 185 15 
                           C 210 2, 245 10, 260 30 
                           C 285 30, 298 55, 290 75 
                           C 305 95, 285 120, 260 115 
                           C 240 128, 200 130, 170 118 
                           C 145 130, 105 125, 85 110 
                           C 60 118, 35 105, 30 85 
                           C 15 65, 25 45, 50 45 Z"
                        fill="url(#cloudBgLight)"
                        stroke="url(#cloudStrokeLight)"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        className="dark:fill-slate-900/95 dark:stroke-primary"
                      />
                      {/* 45-Degree Trailing Thought Circles */}
                      <circle cx="265" cy="118" r="6" fill="url(#cloudBgLight)" stroke="url(#cloudStrokeLight)" strokeWidth="2" className="dark:fill-slate-900 dark:stroke-primary" />
                      <circle cx="277" cy="126" r="4.5" fill="url(#cloudBgLight)" stroke="url(#cloudStrokeLight)" strokeWidth="1.5" className="dark:fill-slate-900 dark:stroke-primary" />
                      <circle cx="286" cy="132" r="3" fill="url(#cloudBgLight)" stroke="url(#cloudStrokeLight)" strokeWidth="1.5" className="dark:fill-slate-900 dark:stroke-primary" />
                    </svg>

                    {/* Text overlay strictly contained inside the SVG cloud center */}
                    <div className="absolute inset-0 top-3 left-7 right-9 bottom-7 flex items-center justify-center text-center px-4">
                      <p className="text-[13.5px] leading-relaxed font-bold text-slate-800 dark:text-slate-100 select-none">
                        <span className="font-extrabold text-blue-600 dark:text-cyan-300">AI Assistant:</span> How can I help you today, <strong className="font-black text-[#78350f] dark:text-[#f59e0b] drop-shadow-xs">{displayName}</strong>? 💭
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Launcher Button with Robot Icon */}
            <motion.button
              whileHover={{ scale: 1.15, rotate: [0, -4, 4, 0] }}
              whileTap={{ scale: 0.88 }}
              animate={{ y: [0, -4, 0] }}
              transition={{ y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } }}
              onClick={() => setIsOpen(true)}
              className="relative flex items-center justify-center w-16 h-16 rounded-full bg-slate-950 border-2 border-primary shadow-[0_15px_40px_rgba(0,120,255,0.5)] cursor-pointer group overflow-hidden"
              aria-label="Open Assistant"
            >
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <img 
                src="/robo-ai.gif" 
                alt="AI Chatbot Animated Icon" 
                className="w-full h-full object-cover scale-[2.75] rounded-full"
              />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HouseholdChatbot;
