import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Receipt, CheckCircle, Clock, AlertCircle, RefreshCw, X } from 'lucide-react';
import api from '../api';
import '../ticket.css';
import { printInvoice } from '../utils/invoiceGenerator';

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [payQrModalBill, setPayQrModalBill] = useState(null);
  const [invoiceModalBill, setInvoiceModalBill] = useState(null);

  const handleMarkBillPaid = async (bill) => {
    try {
      await api.post(`/bills/${bill.id}/mark-paid`);
      setPayQrModalBill(null);
      setSuccessMsg(`Payment completed successfully for bill #${bill.id}!`);
      // Open invoice modal for preview immediately
      const updatedRes = await api.get(`/bills/${bill.id}`);
      setInvoiceModalBill(updatedRes.data);
      await fetchBills();
    } catch (err) {
      console.error("Error marking bill paid:", err);
      setErrorMsg("Failed to process payment. Please try again.");
    }
  };

  const fetchBills = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const houseNumber = localStorage.getItem('houseNumber');
        if (!houseNumber) { setLoading(false); return; }
        const res = await api.get(`/bills/household/${houseNumber}`);
        setBills(res.data);
      }
    } catch (err) {
      console.error("Error fetching bills:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleGenerateBill = async () => {
    setGenerating(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const houseNumber = localStorage.getItem('houseNumber');
      if (!houseNumber) {
        setErrorMsg('House number not found in local storage.');
        return;
      }
      const res = await api.post(`/bills/household/${houseNumber}/generate`);
      setSuccessMsg(`Bill generated successfully! Amount: ₹${res.data.amount.toFixed(2)}`);
      await fetchBills();
    } catch (err) {
      console.error("Error generating bill:", err);
      if (err.response && err.response.data) {
        setErrorMsg(err.response.data);
      } else {
        setErrorMsg('Failed to generate bill. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'PAID': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'UNPAID': return <Clock className="w-5 h-5 text-amber-400" />;
      case 'OVERDUE': return <AlertCircle className="w-5 h-5 text-red-400" />;
      default: return <Receipt className="w-5 h-5 text-text-muted" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PAID': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'UNPAID': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'OVERDUE': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-surface-lighter text-text-muted border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">My Bills</h1>
          <p className="text-text-muted mt-1">View and manage your water utility bills.</p>
        </div>
        <button
          onClick={handleGenerateBill}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Receipt className="w-4 h-4" />
              Generate Bill
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm font-medium text-red-400 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm font-medium text-emerald-400 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-text">Billing History</h3>
        </div>
        
        {loading ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bg-background/50">
            <div className="h-72 rounded-2xl skeleton-pulse" />
            <div className="h-72 rounded-2xl skeleton-pulse" />
            <div className="h-72 rounded-2xl skeleton-pulse" />
          </div>
        ) : bills.length === 0 ? (
          <div className="p-8 text-center text-text-muted flex flex-col items-center">
            <Receipt className="w-12 h-12 mb-3 opacity-20" />
            <p>You have no bills on record.</p>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center bg-background/50">
            {bills.map((bill, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={bill.id} 
                className="flex flex-col items-center gap-5"
              >
                <div className="ticket-wrapper">
                  <div className="ticket">
                    <div className="t-main">
                      <div className="t-content">
                        <div className="t-header">
                          <div className="t-logo">
                            <svg viewBox="0 0 24 24">
                              <path
                                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              ></path>
                            </svg>
                            AquaTrack
                          </div>
                          <div className={`t-type ${bill.status.toLowerCase()}`}>{bill.status}</div>
                        </div>
                        <div className="t-title">WATER<br />BILL '26</div>
                        <div className="t-subtitle">Household Utility Invoice</div>
                        <div className="t-details">
                          <div className="t-detail-item">
                            <span className="t-label">Inv ID</span>
                            <span className="t-value">#{bill.id.toString().padStart(5, '0')}</span>
                          </div>
                          <div className="t-detail-item">
                            <span className="t-label">Billing Month</span>
                            <span className="t-value">
                              {(() => {
                                if (!bill.generatedDate) return 'N/A';
                                const d = new Date(bill.generatedDate);
                                return isNaN(d.getTime()) ? bill.generatedDate : d.toLocaleString('default', { month: 'long', year: 'numeric' });
                              })()}
                            </span>
                          </div>
                          <div className="t-detail-item">
                            <span className="t-label">Due Date</span>
                            <span className="t-value">{bill.dueDate}</span>
                          </div>
                          <div className="t-detail-item">
                            <span className="t-label">Consumption</span>
                            <span className="t-value">{bill.consumptionLiters ? bill.consumptionLiters.toLocaleString() : 0} L</span>
                          </div>
                          <div className="t-detail-item">
                            <span className="t-label">Apt Block</span>
                            <span className="t-value">{bill.apartmentBlock || 'Block A'}</span>
                          </div>
                          <div className="t-detail-item">
                            <span className="t-label">House No</span>
                            <span className="t-value">{bill.houseNumber}</span>
                          </div>
                        </div>
                      </div>
                      <div
                        className="t-perforation"
                        style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', transform: 'translateY(50%)' }}
                      >
                        <div className="t-perf-line"></div>
                      </div>
                    </div>
                    <div className="t-stub">
                      <div className="t-barcode-container">
                        <div className="t-barcode"></div>
                        <div className="t-barcode-id">AQ-{bill.houseNumber}-{bill.id.toString().padStart(3, '0')}</div>
                      </div>
                      <div className="t-admit">
                        <div className="t-admit-text">Amount</div>
                        <div className={`t-admit-num ${bill.status.toLowerCase()}`}>₹{bill.amount.toFixed(0)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {bill.status !== 'PAID' ? (
                  <button
                    onClick={() => setPayQrModalBill(bill)}
                    className="pay-btn cursor-pointer"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <span className="btn-text">Pay Now</span>
                    <div className="icon-container">
                      <svg viewBox="0 0 24 24" className="icon card-icon">
                        <path
                          d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18C2,19.11 2.89,20 4,20H20C21.11,20 22,19.11 22,18V6C22,4.89 21.11,4 20,4Z"
                          fill="currentColor"
                        ></path>
                      </svg>
                      <svg viewBox="0 0 24 24" className="icon payment-icon">
                        <path
                          d="M2,17H22V21H2V17M6.25,7H9V6H6V3H18V6H15V7H17.75L19,17H5L6.25,7M9,10H15V8H9V10M9,13H15V11H9V13Z"
                          fill="currentColor"
                        ></path>
                      </svg>
                      <svg viewBox="0 0 24 24" className="icon dollar-icon">
                        <path
                          d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"
                          fill="currentColor"
                        ></path>
                      </svg>
                      <svg viewBox="0 0 24 24" className="icon wallet-icon default-icon">
                        <path
                          d="M21,18V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V6H12C10.89,6 10,6.9 10,8V16A2,2 0 0,0 12,18M12,16H22V8H12M16,13.5A1.5,1.5 0 0,1 14.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,12A1.5,1.5 0 0,1 16,13.5Z"
                          fill="currentColor"
                        ></path>
                      </svg>
                      <svg viewBox="0 0 24 24" className="icon check-icon">
                        <path
                          d="M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z"
                          fill="currentColor"
                        ></path>
                      </svg>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => setInvoiceModalBill(bill)}
                    className="pay-btn cursor-pointer !bg-blue-600 hover:!bg-blue-700"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <span className="btn-text">View Invoice</span>
                    <div className="icon-container">
                      <Receipt className="w-4 h-4 text-white" />
                    </div>
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* QR Pay Modal */}
      {payQrModalBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl relative text-center">
            <button onClick={() => setPayQrModalBill(null)} className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"><X className="w-5 h-5" /></button>
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-text mb-1">Pay Utility Bill</h3>
            <p className="text-text-muted text-sm mb-4">Scan the QR code below using any UPI app to pay</p>
            <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`AquaTrack Bill|ID:${payQrModalBill.id}|House:${payQrModalBill.houseNumber}|Amount:${payQrModalBill.amount}|Due:${payQrModalBill.dueDate}`)}`}
                alt="Payment QR Code"
                className="w-44 h-44"
              />
            </div>
            <div className="bg-surface-lighter rounded-xl p-3 text-left mb-5 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-text-muted">House</span><span className="font-semibold text-text">{payQrModalBill.houseNumber}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Amount</span><span className="font-bold text-emerald-400">₹{payQrModalBill.amount}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Due Date</span><span className="font-semibold text-text">{payQrModalBill.dueDate}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Status</span><span className="text-amber-400 font-semibold">{payQrModalBill.status}</span></div>
            </div>
            <button
              onClick={() => handleMarkBillPaid(payQrModalBill)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all cursor-pointer"
            >
              ✅ I Have Scanned & Paid
            </button>
          </motion.div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceModalBill && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto pt-16 pb-10">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl relative my-8 overflow-hidden">
            
            {/* Header block with gradient */}
            <div className="bg-gradient-to-r from-blue-600/20 via-primary/10 to-transparent p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">
                  A
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text">AquaTrack Invoice</h3>
                  <p className="text-xs text-text-muted">Water Utility Bill Receipt</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => printInvoice(invoiceModalBill)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/10"
                >
                  ⬇ Download / Print PDF
                </button>
                <button onClick={() => setInvoiceModalBill(null)} className="text-text-muted hover:text-text cursor-pointer p-1.5 hover:bg-surface-lighter rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>

            {/* On-screen Modal Content */}
            <div className="p-8 space-y-6">
              
              {/* Brand & Inv Meta */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black text-2xl text-blue-500">AquaTrack</div>
                  <p className="text-xs text-text-muted">High-Quality Water Utility Management</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold text-text">INVOICE</h2>
                  <p className="text-xs text-text-muted mt-1">Invoice ID: <span className="font-semibold text-text">#AQ-{String(invoiceModalBill.id).padStart(5, '0')}</span></p>
                  <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    invoiceModalBill.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {invoiceModalBill.status}
                  </span>
                </div>
              </div>

              <hr className="border-border/50" />

              {/* Billing details columns */}
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Invoice From</p>
                  <p className="font-semibold text-text">AquaTrack Water Authority</p>
                  <p className="text-xs text-text-muted mt-1">Managed by Community Administration</p>
                  <p className="text-xs text-text-muted">Smart Billing System</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Invoice To</p>
                  <p className="font-bold text-text">Resident of House {invoiceModalBill.houseNumber}</p>
                  {invoiceModalBill.apartmentBlock && (
                    <p className="text-xs text-text-muted mt-1">Block: {invoiceModalBill.apartmentBlock}</p>
                  )}
                  <p className="text-xs text-text-muted">AquaTrack Registered Consumer</p>
                </div>
              </div>

              {/* Date metadata box */}
              <div className="bg-surface-lighter rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-text-muted block">Issue Date</span>
                  <span className="font-semibold text-text text-sm">{invoiceModalBill.generatedDate}</span>
                </div>
                <div>
                  <span className="text-text-muted block">Due Date</span>
                  <span className="font-semibold text-text text-sm">{invoiceModalBill.dueDate}</span>
                </div>
                <div>
                  <span className="text-text-muted block">Consumption</span>
                  <span className="font-semibold text-text text-sm">{invoiceModalBill.consumptionLiters || 0} L</span>
                </div>
                <div>
                  <span className="text-text-muted block">Rate / Liter</span>
                  <span className="font-semibold text-text text-sm">
                    ₹{invoiceModalBill.consumptionLiters ? (invoiceModalBill.amount / invoiceModalBill.consumptionLiters).toFixed(4) : '0.00'}
                  </span>
                </div>
              </div>

              {/* Table of charges */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-3 font-semibold text-text-muted">Item Description</th>
                      <th className="py-3 text-right font-semibold text-text-muted">Qty (Liters)</th>
                      <th className="py-3 text-right font-semibold text-text-muted">Unit Rate</th>
                      <th className="py-3 text-right font-semibold text-text-muted">Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-4 font-medium text-text">Water Utility Consumption Fee</td>
                      <td className="py-4 text-right text-text">{invoiceModalBill.consumptionLiters || 0} L</td>
                      <td className="py-4 text-right text-text">
                        ₹{invoiceModalBill.consumptionLiters ? (invoiceModalBill.amount / invoiceModalBill.consumptionLiters).toFixed(4) : '0.00'}
                      </td>
                      <td className="py-4 text-right font-semibold text-text">₹{invoiceModalBill.amount?.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary Table */}
              <div className="flex justify-end">
                <table className="w-64 text-sm">
                  <tbody>
                    <tr>
                      <td className="py-2 text-text-muted">Subtotal</td>
                      <td className="py-2 text-right font-medium text-text">₹{invoiceModalBill.amount?.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-text-muted">Tax & GST (0%)</td>
                      <td className="py-2 text-right font-medium text-text">₹0.00</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="py-3 font-bold text-text text-lg">Total Amount</td>
                      <td className="py-3 text-right font-black text-primary text-xl">₹{invoiceModalBill.amount?.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="text-center pt-6 border-t border-border/50 text-xs text-text-muted">
                <p>Thank you for using AquaTrack Water Management System. Please ensure timely payments to avoid supply cuts.</p>
                <p className="mt-1 font-bold">Generated electronically. No signature required.</p>
              </div>

            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
