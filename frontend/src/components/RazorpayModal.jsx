import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Shield, CheckCircle2, Loader2, Lock, AlertCircle, RefreshCw, CreditCard
} from 'lucide-react';
import api from '../api';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    
    // Check if script element already exists in document to prevent double injection
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RazorpayModal({ bill, onClose, onSuccess }) {
  const [step, setStep] = useState('loading'); // loading | paying | success | failed
  const [error, setError] = useState('');
  const [paymentData, setPaymentData] = useState(null); // razorpay response after success
  const amount = bill?.amount || 0;
  const isProcessing = useRef(false);

  useEffect(() => {
    let active = true;
    loadRazorpayScript().then(loaded => {
      if (!active) return;
      if (loaded) {
        setStep('paying');
        triggerPayment();
      } else {
        setStep('failed');
        setError('Failed to load Razorpay payment gateway. Please check your network connection.');
      }
    });
    return () => { active = false; };
  }, []);

  const triggerPayment = async () => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setError('');
    setStep('loading');
    
    try {
      let orderId, keyId;
      const cacheKey = `rzp_order_${bill.id}`;
      const cachedOrder = sessionStorage.getItem(cacheKey);

      if (cachedOrder) {
        try {
          const parsed = JSON.parse(cachedOrder);
          orderId = parsed.orderId;
          keyId = parsed.keyId;
        } catch (e) {
          sessionStorage.removeItem(cacheKey);
        }
      }

      if (!orderId || !keyId) {
        // 1. Request Order Creation from Backend
        const orderRes = await api.post(`/bills/${bill.id}/create-order`);
        orderId = orderRes.data.orderId;
        keyId = orderRes.data.keyId;

        // Cache the order details in session storage to avoid hitting API rate limits on retries/reopens
        sessionStorage.setItem(cacheKey, JSON.stringify({ orderId, keyId }));
      }

      if (!window.Razorpay) {
        setStep('failed');
        setError('Razorpay SDK not loaded correctly.');
        isProcessing.current = false;
        return;
      }

      const getPrefillValue = (key, fallback) => {
        const val = localStorage.getItem(key);
        return (!val || val.trim() === '' || val === 'null' || val === 'undefined') ? fallback : val;
      };

      const userName = getPrefillValue('fullName', getPrefillValue('username', 'Resident'));
      const userEmail = getPrefillValue('email', 'resident@aquatrack.in');
      const userPhone = getPrefillValue('mobileNumber', '9999999999');

      const options = {
        key: keyId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: 'AquaTrack Water Authority',
        description: `Water Bill Receipt #${String(bill?.id).padStart(5, '0')}`,
        image: `${window.location.origin}/logo.png`,
        order_id: orderId,
        prefill: {
          name: userName,
          email: userEmail,
          contact: userPhone,
        },
        notes: {
          bill_id: String(bill?.id),
          house_number: bill?.houseNumber,
        },
        theme: {
          color: '#2563eb',
          backdrop_color: 'rgba(15, 23, 42, 0.9)',
        },
        modal: {
          ondismiss: () => {
            setStep('failed');
            setError('Payment checkout cancelled.');
            isProcessing.current = false;
          },
        },
        handler: async function (response) {
          setStep('loading');
          try {
            // 2. Verify signature on backend
            await api.post(`/bills/${bill.id}/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            
            // Clear order cache on successful payment
            sessionStorage.removeItem(`rzp_order_${bill.id}`);

            const pData = {
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              paidAt: new Date().toLocaleString('en-IN', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }),
              method: 'Razorpay'
            };
            setPaymentData(pData);
            setStep('success');
            setTimeout(() => {
              onSuccess && onSuccess(pData);
            }, 2500);
          } catch (e) {
            setStep('failed');
            setError(e.response?.data || 'Signature verification failed.');
            isProcessing.current = false;
          }
        },
      };

      setStep('paying');
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setStep('failed');
        setError(resp.error?.description || 'Payment execution failed.');
        isProcessing.current = false;
      });
      rzp.open();

    } catch (err) {
      setStep('failed');
      setError(err.response?.data || 'Failed to create payment order on backend.');
    } finally {
      isProcessing.current = false;
    }
  };

  const baseCharge = bill?.baseCharge || 0;
  const excessCharge = bill?.excessCharge || 0;
  const fixedCharge = bill?.fixedCharge || 0;
  const sharedAreaCharge = bill?.sharedAreaCharge || 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
        
        {/* Cover for Razorpay Test Mode Banner in top-right corner */}
        {(step === 'paying' || step === 'loading') && (
          <div className="fixed top-0 right-0 w-[170px] h-[55px] bg-slate-950 z-[9999999999] pointer-events-none flex flex-col items-center justify-center border-l border-b border-white/10 shadow-2xl rounded-bl-2xl select-none">
            <div className="text-[10px] tracking-wider text-slate-300 font-bold uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Sandbox Mode
            </div>
            <span className="text-[9px] text-slate-500 mt-0.5 font-semibold">AquaTrack Test Gateway</span>
          </div>
        )}

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100"
        >
          {/* Top Decorative Wave Blob */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-600/10 blur-3xl pointer-events-none rounded-full" />

          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-inner">
                <Lock className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-wide text-white">AquaTrack Payment</h4>
                <p className="text-[11px] text-slate-400">Secure 256-bit SSL Transaction</p>
              </div>
            </div>
            {(step === 'failed' || step === 'paying') && (
              <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Content Body */}
          <div className="p-6 relative z-10">
            
            {/* STEP: Loading / Initiating */}
            {step === 'loading' && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                  <Loader2 className="w-6 h-6 text-blue-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-white">Preparing Secure Gateway</p>
                  <p className="text-xs text-slate-400">Communicating with payment servers...</p>
                </div>
              </div>
            )}

            {/* STEP: Redirecting / Paying */}
            {step === 'paying' && (
              <div className="py-4 flex flex-col items-center justify-center text-center space-y-5">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center animate-pulse">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-white">Launching Checkout Gateway</p>
                  <p className="text-xs text-slate-400">Please complete the payment in the Razorpay window.</p>
                </div>
                
                {/* Detailed Billing Summary Box */}
                <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-3 text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">House Details</span>
                    <span className="font-semibold text-white">{bill?.houseNumber} ({bill?.apartmentBlock || 'N/A'})</span>
                  </div>
                  
                  <div className="space-y-1.5 pt-0.5">
                    {bill?.waterUsageLiters !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Water Consumption</span>
                        <span className="font-medium text-slate-200">{(bill.waterUsageLiters || 0).toLocaleString()} Liters</span>
                      </div>
                    )}
                    {baseCharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Base Usage Charge</span>
                        <span className="font-medium text-slate-200">₹{baseCharge.toFixed(2)}</span>
                      </div>
                    )}
                    {excessCharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Excess Limit Charge</span>
                        <span className="font-bold text-amber-400">₹{excessCharge.toFixed(2)}</span>
                      </div>
                    )}
                    {fixedCharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Fixed Flat Rate</span>
                        <span className="font-medium text-slate-200">₹{fixedCharge.toFixed(2)}</span>
                      </div>
                    )}
                    {sharedAreaCharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Shared Block Cost</span>
                        <span className="font-medium text-slate-200">₹{sharedAreaCharge.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between border-t border-white/10 pt-2 text-sm">
                    <span className="font-bold text-slate-300">Total Billed</span>
                    <span className="font-extrabold text-blue-400">₹{Number(amount).toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={triggerPayment}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-xs tracking-wider rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-open Checkout Window
                </button>
              </div>
            )}

            {/* STEP: Success */}
            {step === 'success' && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </motion.div>
                <div className="space-y-1">
                  <p className="font-bold text-lg text-emerald-400">Payment Successful!</p>
                  <p className="text-xs text-slate-400">Receipt generated for House {bill?.houseNumber}</p>
                </div>
                {paymentData && (
                  <div className="w-full bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 text-left space-y-1.5 text-[11px]">
                    <p className="font-bold text-emerald-400 border-b border-emerald-500/10 pb-1">Transaction Details</p>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payment ID</span>
                      <span className="font-mono font-bold text-emerald-300 text-[10px]">{paymentData.paymentId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Order ID</span>
                      <span className="font-mono text-slate-300 text-[10px]">{paymentData.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Paid At</span>
                      <span className="text-slate-300">{paymentData.paidAt}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP: Failed */}
            {step === 'failed' && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-5">
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div className="space-y-2">
                  <p className="font-bold text-white">Checkout Failed / Cancelled</p>
                  {error && <p className="text-xs text-slate-400 bg-red-500/5 border border-red-500/10 rounded-lg p-3 max-w-xs">{error}</p>}
                </div>

                {/* Quick Credentials Info Box for Test Mode */}
                <div className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-left space-y-3 text-[11px] text-amber-300">
                  <p className="font-bold border-b border-amber-500/10 pb-1.5 mb-0.5 text-amber-200">Razorpay Test Mode — How to Pay</p>

                  {/* Option 1: Netbanking — always works */}
                  <div>
                    <p className="font-bold text-emerald-400 mb-1">✅ Option 1: Netbanking (Recommended)</p>
                    <p className="text-amber-300/80 leading-relaxed">Select <strong>Netbanking</strong> → pick any bank → click <strong>Pay Now</strong> → on the bank test page, click <strong>Success</strong>.</p>
                  </div>

                  {/* Option 2: UPI */}
                  <div>
                    <p className="font-bold text-blue-400 mb-1">✅ Option 2: UPI</p>
                    <p className="text-amber-300/80">Enter UPI ID: <span className="font-mono font-bold">success@razorpay</span></p>
                  </div>

                  {/* Option 3: Card */}
                  <div>
                    <p className="font-bold text-amber-300 mb-1">💳 Option 3: Card</p>
                    <div className="flex justify-between"><span>Number</span><span className="font-mono font-bold">4111 1111 1111 1111</span></div>
                    <div className="flex justify-between mt-0.5"><span>Expiry / CVV</span><span className="font-mono">12/28 / 123</span></div>
                    <p className="text-[10px] text-amber-300/50 mt-1">Note: May be rejected as international on some test accounts.</p>
                  </div>
                </div>

                <div className="w-full flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={triggerPayment}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/25 cursor-pointer"
                  >
                    Retry Payment
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-center gap-2 text-[10px] text-slate-500">
            <Shield className="w-3 h-3 text-slate-400" />
            <span>Secured by Razorpay · PCI-DSS Compliant</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
