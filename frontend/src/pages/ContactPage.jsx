import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, MessageSquare, CheckCircle2 } from 'lucide-react';
import SharedHeader from '../components/SharedHeader';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-background text-text selection:bg-primary/30 flex flex-col items-center relative overflow-hidden">


      {/* Shared Glassmorphic Header */}
      <SharedHeader activeTab="contact" />

      {/* Main Form Section */}
      <div className="max-w-5xl w-full px-6 py-14 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6">
            <MessageSquare className="w-4 h-4" /> Get in Touch
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
            We'd Love to Hear From <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Your Community</span>
          </h1>
          <p className="text-text/80 text-base leading-relaxed mb-8 font-medium">
            Have questions about integrating AquaTrack into your housing society or need custom tariff assistance? Reach out to our dedicated support engineering team.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-text text-sm">Email Us</h4>
                <p className="text-text/70 text-sm">support@aquatrack.io</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-text text-sm">Call Center Support</h4>
                <p className="text-text/70 text-sm">+91 1800 425 9999 (Toll Free)</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-text text-sm">Headquarters</h4>
                <p className="text-text/70 text-sm">Infosys Innovation Hub, Bengaluru, India</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 rounded-3xl border border-border/60 shadow-xl">
          {submitted ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-bold text-text mb-2">Message Sent!</h3>
              <p className="text-text/70 text-sm">Thank you for reaching out. Our team will respond within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text/80 mb-2">Your Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border/70 text-text text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text/80 mb-2">Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@community.com"
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border/70 text-text text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text/80 mb-2">Subject</label>
                <input 
                  type="text" 
                  required 
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Society Onboarding Inquiry"
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border/70 text-text text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text/80 mb-2">Message</label>
                <textarea 
                  rows={4} 
                  required 
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we assist your residential society?"
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border/70 text-text text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-all shadow-md shadow-primary/30 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
