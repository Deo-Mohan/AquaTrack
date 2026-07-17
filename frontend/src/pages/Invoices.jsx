import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Calendar, ArrowRight, Download, Search, FileText, X } from 'lucide-react';
import api from '../api';
import { printInvoice } from '../utils/invoiceGenerator';

export default function Invoices() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceModalBill, setInvoiceModalBill] = useState(null);

  const fetchPaidBills = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const houseNumber = localStorage.getItem('houseNumber');
        if (!houseNumber) { setLoading(false); return; }
        const res = await api.get(`/bills/household/${houseNumber}`);
        // Filter for paid bills
        const paid = res.data.filter(bill => bill.status === 'PAID');
        setBills(paid);
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaidBills();
  }, []);

  const filteredBills = bills.filter(bill => 
    bill.id.toString().includes(searchTerm) || 
    bill.generatedDate.includes(searchTerm) ||
    bill.amount.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">My Invoices</h1>
        <p className="text-text-muted mt-1">View, print and download receipts for your paid utility bills.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search by Inv ID, Date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-light border border-border rounded-xl text-text placeholder-text-muted focus:outline-none focus:border-primary text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-text-muted">Loading your invoices...</div>
      ) : filteredBills.length === 0 ? (
        <div className="p-8 text-center text-text-muted flex flex-col items-center glass-card">
          <FileText className="w-12 h-12 mb-3 opacity-20 text-primary" />
          <p>No paid invoices found matching your query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBills.map((bill, index) => (
            <motion.div
              key={bill.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card p-6 flex flex-col justify-between hover:border-primary/40 transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Paid Receipt
                  </div>
                  <span className="text-xs text-text-muted font-mono">#AQ-{String(bill.id).padStart(5, '0')}</span>
                </div>

                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Bill Amount</p>
                  <p className="text-3xl font-black text-text mt-1">₹{bill.amount.toFixed(2)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-border/45">
                  <div>
                    <span className="text-text-muted block">Paid Date</span>
                    <span className="font-semibold text-text">{bill.generatedDate}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Consumption</span>
                    <span className="font-semibold text-text">{bill.consumptionLiters || 0} Liters</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInvoiceModalBill(bill)}
                className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary-dark rounded-xl font-bold text-sm transition-all cursor-pointer border border-primary/20"
              >
                <span>View & Print Invoice</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          ))}
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
                  {invoiceModalBill.meterId && (
                    <p className="text-xs text-text-muted mt-0.5">Meter ID: <span className="font-semibold text-text">{invoiceModalBill.meterId}</span></p>
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
