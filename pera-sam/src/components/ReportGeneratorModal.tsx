import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartRow {
  id: number;
  description: string;
  qty: string;
  unitPrice: string;
}

interface ReportData {
  companyName: string;
  companyAddress: string;
  customerName: string;
  customerPhone: string;
  appointmentDate: string;
  technicianName: string;
  machineType: string;
  brand: string;
  issueDescription: string;
  workDone: string;
  parts: PartRow[];
  laborCost: string;
  notes: string;
}

interface ReportGeneratorModalProps {
  onClose: () => void;
  companyName: string;
  companyAddress?: string;
  customerName: string;
  customerPhone?: string;
  machineType: string;
  brand: string;
  issueDescription: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toLocaleDateString('en-LK', {
  year: 'numeric', month: 'long', day: 'numeric',
});

const fmt = (n: string) => {
  const v = parseFloat(n);
  return isNaN(v) ? '0.00' : v.toFixed(2);
};

const calcTotal = (parts: PartRow[], labor: string) => {
  const partsTotal = parts.reduce((sum, p) => {
    const qty = parseFloat(p.qty) || 0;
    const unit = parseFloat(p.unitPrice) || 0;
    return sum + qty * unit;
  }, 0);
  const laborVal = parseFloat(labor) || 0;
  return (partsTotal + laborVal).toFixed(2);
};

// ─── Print-ready HTML builder ─────────────────────────────────────────────────

const buildPrintHTML = (d: ReportData) => {
  const partsRows = d.parts
    .filter(p => p.description.trim())
    .map((p, i) => {
      const qty = parseFloat(p.qty) || 0;
      const unit = parseFloat(p.unitPrice) || 0;
      const total = (qty * unit).toFixed(2);
      return `<tr>
        <td>${i + 1}</td>
        <td>${p.description}</td>
        <td style="text-align:center">${qty}</td>
        <td style="text-align:right">Rs. ${fmt(p.unitPrice)}</td>
        <td style="text-align:right">Rs. ${total}</td>
      </tr>`;
    })
    .join('');

  const partsTotal = d.parts.reduce((s, p) => s + (parseFloat(p.qty) || 0) * (parseFloat(p.unitPrice) || 0), 0);
  const labor = parseFloat(d.laborCost) || 0;
  const grandTotal = (partsTotal + labor).toFixed(2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Service Report – ${d.companyName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; background: #fff; font-size: 13px; line-height: 1.5; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; min-height: 100vh; display: flex; flex-direction: column; }

    /* Header */
    .header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 24px; border-bottom: 3px solid #1a3a8f; margin-bottom: 28px; }
    .header-left .company-name { font-size: 22px; font-weight: 700; color: #1a3a8f; letter-spacing: -0.5px; }
    .header-left .company-address { font-size: 11px; color: #666; margin-top: 3px; }
    .header-right { text-align: right; }
    .header-right .report-title { font-size: 26px; font-weight: 700; color: #1a3a8f; letter-spacing: -1px; }
    .header-right .report-sub { font-size: 11px; color: #888; margin-top: 2px; }
    .badge { display: inline-block; background: #1a3a8f; color: #fff; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; margin-top: 6px; letter-spacing: 0.5px; text-transform: uppercase; }

    /* Info grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-box { background: #f5f7ff; border: 1px solid #dde3f8; border-radius: 8px; padding: 14px 16px; }
    .info-box .label { font-size: 10px; font-weight: 600; color: #1a3a8f; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; }
    .info-box .value { font-size: 13px; font-weight: 500; color: #1a1a2e; }
    .info-box .sub-value { font-size: 11px; color: #666; margin-top: 2px; }

    /* Section heading */
    .section-title { font-size: 11px; font-weight: 700; color: #1a3a8f; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #dde3f8; padding-bottom: 6px; margin-bottom: 12px; margin-top: 22px; }

    /* Equipment & work */
    .detail-row { display: flex; gap: 8px; margin-bottom: 6px; }
    .detail-key { font-size: 11px; color: #888; min-width: 130px; font-weight: 500; }
    .detail-val { font-size: 12px; color: #1a1a2e; font-weight: 500; }
    .description-box { background: #f9f9fc; border: 1px solid #e5e7f0; border-radius: 6px; padding: 12px 14px; font-size: 12px; color: #333; white-space: pre-wrap; }

    /* Parts table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    thead tr { background: #1a3a8f; color: #fff; }
    thead th { padding: 9px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th:not(:first-child) { text-align: right; }
    thead th:nth-child(3) { text-align: center; }
    tbody tr:nth-child(even) { background: #f5f7ff; }
    tbody td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #eef0f8; vertical-align: top; }
    tfoot td { padding: 8px 12px; font-size: 12px; }

    /* Billing summary */
    .billing-summary { margin-left: auto; width: 280px; }
    .billing-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; color: #444; border-bottom: 1px solid #eee; }
    .billing-row.grand { font-size: 15px; font-weight: 700; color: #1a3a8f; border-bottom: none; padding-top: 10px; margin-top: 4px; }

    /* Notes */
    .notes-box { background: #fffef0; border: 1px solid #e8e0b0; border-radius: 6px; padding: 12px 14px; font-size: 12px; color: #555; }

    /* Footer */
    .footer { margin-top: auto; padding-top: 32px; }
    .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-bottom: 40px; }
    .sig-block { border-top: 1.5px solid #333; padding-top: 8px; }
    .sig-block .sig-label { font-size: 11px; color: #555; font-weight: 500; }
    .sig-block .sig-sub { font-size: 10px; color: #999; margin-top: 2px; }
    .seal-box { border: 1.5px dashed #aaa; border-radius: 6px; text-align: center; padding: 16px; font-size: 10px; color: #aaa; margin-top: 16px; }
    .copyright { text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 14px; margin-top: 20px; line-height: 1.6; }
    .copyright strong { color: #1a3a8f; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 24px 32px; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="company-name">${d.companyName}</div>
      ${d.companyAddress ? `<div class="company-address">${d.companyAddress}</div>` : ''}
      <div class="badge">Authorized Service Provider</div>
    </div>
    <div class="header-right">
      <div class="report-title">SERVICE REPORT</div>
      <div class="report-sub">Date: ${d.appointmentDate}</div>
      <div class="report-sub" style="margin-top:4px">Ref: SR-${Date.now().toString().slice(-6)}</div>
    </div>
  </div>

  <!-- Info Grid -->
  <div class="info-grid">
    <div class="info-box">
      <div class="label">Customer Details</div>
      <div class="value">${d.customerName}</div>
      ${d.customerPhone ? `<div class="sub-value">📞 ${d.customerPhone}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="label">Service Details</div>
      <div class="value">Technician: ${d.technicianName || '—'}</div>
      <div class="sub-value">Date: ${d.appointmentDate}</div>
    </div>
  </div>

  <!-- Equipment -->
  <div class="section-title">Equipment Information</div>
  <div class="detail-row"><span class="detail-key">Machine Type</span><span class="detail-val">${d.machineType}</span></div>
  <div class="detail-row"><span class="detail-key">Brand / Model</span><span class="detail-val">${d.brand || '—'}</span></div>
  ${d.issueDescription ? `
  <div style="margin-top:10px">
    <div class="detail-key" style="margin-bottom:5px">Issue / Complaint</div>
    <div class="description-box">${d.issueDescription}</div>
  </div>` : ''}

  <!-- Work Done -->
  ${d.workDone ? `
  <div class="section-title" style="margin-top:18px">Work Performed</div>
  <div class="description-box">${d.workDone}</div>` : ''}

  <!-- Parts & Billing -->
  <div class="section-title">Parts &amp; Billing</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;width:32px">#</th>
        <th style="text-align:left">Description / Part</th>
        <th style="text-align:center;width:70px">Qty</th>
        <th style="text-align:right;width:110px">Unit Price</th>
        <th style="text-align:right;width:110px">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${partsRows || `<tr><td colspan="5" style="text-align:center;color:#aaa;padding:16px">No parts listed</td></tr>`}
    </tbody>
  </table>

  <div class="billing-summary">
    <div class="billing-row"><span>Parts Subtotal</span><span>Rs. ${partsTotal.toFixed(2)}</span></div>
    <div class="billing-row"><span>Labour Charges</span><span>Rs. ${fmt(d.laborCost)}</span></div>
    <div class="billing-row grand"><span>TOTAL DUE</span><span>Rs. ${grandTotal}</span></div>
  </div>

  ${d.notes ? `
  <div class="section-title" style="margin-top:22px">Additional Notes</div>
  <div class="notes-box">${d.notes}</div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="sig-row">
      <div>
        <div class="sig-block">
          <div class="sig-label">Authorized Signature</div>
          <div class="sig-sub">${d.companyName}</div>
        </div>
        <div class="seal-box">Company Seal / Stamp</div>
      </div>
      <div>
        <div class="sig-block">
          <div class="sig-label">Customer Acknowledgement</div>
          <div class="sig-sub">I confirm the above services were received</div>
        </div>
      </div>
    </div>
    <div class="copyright">
      Generated by <strong>PERA-SAM</strong> &mdash; Predictive Equipment Risk Analysis &amp; Sound Anomaly Monitor<br/>
      &copy; ${new Date().getFullYear()} Team Invictus &bull; Department of Computer Engineering &bull; University of Peradeniya, Sri Lanka<br/>
      This document is system-generated. For queries contact: invictus2026sam@gmail.com
    </div>
  </div>

</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ReportGeneratorModal = ({
  onClose,
  companyName,
  companyAddress = '',
  customerName: initCustomerName,
  customerPhone: initPhone = '',
  machineType,
  brand,
  issueDescription,
}: ReportGeneratorModalProps) => {
  const [technicianName, setTechnicianName] = useState('');
  const [custName, setCustName] = useState(initCustomerName);
  const [custPhone, setCustPhone] = useState(initPhone);
  const [workDone, setWorkDone] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [notes, setNotes] = useState('');
  const [parts, setParts] = useState<PartRow[]>([
    { id: 1, description: '', qty: '1', unitPrice: '' },
  ]);

  const addPart = () =>
    setParts(p => [...p, { id: Date.now(), description: '', qty: '1', unitPrice: '' }]);

  const removePart = (id: number) =>
    setParts(p => p.filter(r => r.id !== id));

  const updatePart = (id: number, field: keyof PartRow, value: string) =>
    setParts(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const grandTotal = calcTotal(parts, laborCost);

  const handleGenerate = () => {
    const data: ReportData = {
      companyName,
      companyAddress,
      customerName: custName,
      customerPhone: custPhone,
      appointmentDate: today(),
      technicianName,
      machineType,
      brand,
      issueDescription,
      workDone,
      parts,
      laborCost,
      notes,
    };
    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(buildPrintHTML(data));
      win.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Generate Service Report</h2>
              <p className="text-xs text-muted-foreground">Fill in the details — a print-ready report will open</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">

          {/* Auto-filled banner */}
          <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-lg text-xs text-accent">
            <span className="font-semibold">Company:</span> {companyName}
            <span className="ml-auto font-semibold">Date:</span> {today()}
          </div>

          {/* Customer + Technician */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Customer Name</Label>
              <Input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Customer full name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Customer Phone</Label>
              <Input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="+94 77 ..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Technician Name <span className="text-destructive">*</span></Label>
            <Input
              value={technicianName}
              onChange={e => setTechnicianName(e.target.value)}
              placeholder="Name of the technician who performed the service"
            />
          </div>

          {/* Work done */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Work Performed</Label>
            <textarea
              rows={3}
              value={workDone}
              onChange={e => setWorkDone(e.target.value)}
              placeholder="Describe what was repaired, replaced or serviced..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Parts table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold">Parts / Receipt</Label>
              <Button variant="outline" size="sm" onClick={addPart} className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" /> Add Part
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Description / Part</th>
                    <th className="px-3 py-2 font-semibold text-muted-foreground w-16 text-center">Qty</th>
                    <th className="px-3 py-2 font-semibold text-muted-foreground w-28 text-right">Unit Price (Rs.)</th>
                    <th className="px-3 py-2 font-semibold text-muted-foreground w-24 text-right">Amount</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {parts.map(p => {
                    const amt = ((parseFloat(p.qty) || 0) * (parseFloat(p.unitPrice) || 0)).toFixed(2);
                    return (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-2 py-1.5">
                          <Input
                            value={p.description}
                            onChange={e => updatePart(p.id, 'description', e.target.value)}
                            placeholder="Part name or service"
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={p.qty}
                            onChange={e => updatePart(p.id, 'qty', e.target.value)}
                            type="number"
                            min="1"
                            className="h-7 text-xs text-center"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={p.unitPrice}
                            onChange={e => updatePart(p.id, 'unitPrice', e.target.value)}
                            type="number"
                            placeholder="0.00"
                            className="h-7 text-xs text-right"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium text-foreground">Rs. {amt}</td>
                        <td className="px-1 py-1.5">
                          <button
                            onClick={() => removePart(p.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Labour + Total */}
            <div className="mt-3 flex items-start justify-between gap-4">
              <div className="space-y-1.5 w-48">
                <Label className="text-xs font-semibold">Labour Charges (Rs.)</Label>
                <Input
                  value={laborCost}
                  onChange={e => setLaborCost(e.target.value)}
                  type="number"
                  placeholder="0.00"
                  className="text-right"
                />
              </div>
              <div className="text-right mt-auto">
                <p className="text-xs text-muted-foreground">Total Amount Due</p>
                <p className="text-2xl font-bold text-accent">Rs. {grandTotal}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Additional Notes (optional)</Label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Warranty info, follow-up dates, recommendations..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 flex-shrink-0">
          <p className="text-xs text-muted-foreground">
            Report will open in a new window — use your browser's Print dialog
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              variant="accent"
              onClick={handleGenerate}
              disabled={!technicianName.trim()}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Generate & Print
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
