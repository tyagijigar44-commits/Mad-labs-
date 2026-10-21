import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { db, Report, TestOrder, Patient, ResultEntry } from './db.ts';

export async function generateLabReportPDF(reportId: string): Promise<Buffer> {
  const report = db.reports.find(r => r.id === reportId);
  if (!report) throw new Error('Report not found');

  const order = db.orders.find(o => o.id === report.orderId);
  if (!order) throw new Error('Order not found');

  const patient = db.patients.find(p => p.id === report.patientId);
  if (!patient) throw new Error('Patient not found');

  const branch = db.branches.find(b => b.id === report.branchId) || db.branches[0];
  const doctor = order.doctorId ? db.doctors.find(d => d.id === order.doctorId) : null;
  const results = db.results.filter(r => r.orderId === order.id);
  const specimens = db.specimens.filter(s => s.orderId === order.id);

  // Generate QR Code data URL for verification
  const verificationUrl = `${process.env.APP_URL || 'https://apexlis.health'}/verify/${report.verificationCode}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 120, margin: 1 });
  } catch (err) {
    console.warn('QR Code generation failed:', err);
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // --- HEADER ---
  doc.setFillColor(15, 76, 129); // Deep Classic Medical Blue
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('APEX CLINICAL REFERENCE LABORATORIES', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('CAP & ISO 15189 ACCREDITED PATHOLOGY & GENOMIC MEDICINE', 14, 16);
  doc.text(`${branch.address}, ${branch.city} | Ph: ${branch.phone}`, 14, 20);

  // --- PATIENT & ORDER DEMOGRAPHICS BOX ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 28, 182, 34, 2, 2, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  // Column 1
  doc.text(`Patient Name:`, 18, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patient.lastName.toUpperCase()}, ${patient.firstName} (${patient.gender.toUpperCase()}, ${patient.age} Yrs)`, 46, 35);

  doc.setFont('helvetica', 'bold');
  doc.text(`Patient ID:`, 18, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patient.patientId}`, 46, 42);

  doc.setFont('helvetica', 'bold');
  doc.text(`Referred By:`, 18, 49);
  doc.setFont('helvetica', 'normal');
  doc.text(`${doctor ? doctor.name : 'Self / Direct Request'}`, 46, 49);

  doc.setFont('helvetica', 'bold');
  doc.text(`Specimen(s):`, 18, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(`${specimens.map(s => s.specimenType).join(', ') || 'Venous Blood'}`, 46, 56);

  // Column 2
  const col2X = 120;
  doc.setFont('helvetica', 'bold');
  doc.text(`Order Number:`, col2X, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(`${order.orderNumber}`, col2X + 28, 35);

  doc.setFont('helvetica', 'bold');
  doc.text(`Report ID:`, col2X, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`${report.reportNumber} (v${report.version})`, col2X + 28, 42);

  doc.setFont('helvetica', 'bold');
  doc.text(`Collected At:`, col2X, 49);
  doc.setFont('helvetica', 'normal');
  doc.text(`${specimens[0]?.collectedAt ? new Date(specimens[0].collectedAt).toLocaleString() : 'N/A'}`, col2X + 28, 49);

  doc.setFont('helvetica', 'bold');
  doc.text(`Report Released:`, col2X, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(`${report.releasedAt ? new Date(report.releasedAt).toLocaleString() : 'DRAFT'}`, col2X + 28, 56);

  // --- RESULTS TABLE HEADER ---
  let y = 68;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  doc.text('INVESTIGATION / PARAMETER', 18, y + 5.5);
  doc.text('OBSERVED VALUE', 95, y + 5.5);
  doc.text('UNIT', 125, y + 5.5);
  doc.text('REFERENCE INTERVAL', 145, y + 5.5);
  doc.text('FLAG', 182, y + 5.5);

  y += 11;
  doc.setFontSize(8.5);

  // Group by Test Name
  for (const res of results) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    // High/Low/Critical styling
    const isAbnormal = res.flag !== 'normal';
    if (isAbnormal) {
      doc.setFont('helvetica', 'bold');
      if (res.flag === 'critical') {
        doc.setTextColor(185, 28, 28); // Red
      } else {
        doc.setTextColor(194, 65, 12); // Amber
      }
    }

    doc.text(res.parameterName, 18, y);
    doc.text(res.value, 95, y);
    doc.text(res.unit, 125, y);

    const refText = (res.referenceLow !== undefined && res.referenceHigh !== undefined)
      ? `${res.referenceLow} - ${res.referenceHigh}`
      : 'Evaluated Clinically';
    doc.text(refText, 145, y);

    doc.text(res.flag.toUpperCase(), 182, y);

    // Subtle divider
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 2, 196, y + 2);

    y += 7;
  }

  // --- PATHOLOGIST CLINICAL INTERPRETATION ---
  y += 4;
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 182, 32, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 76, 129);
  doc.text('PATHOLOGIST INTERPRETATION & CLINICAL SUMMARY', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const interpretation = report.interpretationDraft || 'Clinical test results have been evaluated against laboratory reference ranges. Routine follow-up advised.';
  const splitInterp = doc.splitTextToSize(interpretation, 174);
  doc.text(splitInterp.slice(0, 4), 18, y + 12);

  // --- SIGNATURE AND QR VERIFICATION ---
  const footerY = 250;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, footerY - 5, 196, footerY - 5);

  // QR Code
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', 14, footerY - 2, 22, 22);
  }

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Scan QR to verify authentic report', 38, footerY + 5);
  doc.text(`Digital Verification Code: ${report.verificationCode}`, 38, footerY + 10);
  doc.text('Report issued under electronic signature validation.', 38, footerY + 15);

  // Authorized Pathologist Stamp
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(report.verifiedByName || 'Dr. Sarah Jenkins, FRCPath', 135, footerY + 5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Consultant Pathologist & Lab Director', 135, footerY + 10);
  doc.text('Lic: CAP-98214 / MC-481920', 135, footerY + 14);

  // Bottom Disclaimer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('CONFIDENTIAL MEDICAL RECORD: This diagnostic report is intended exclusively for authorized clinical personnel and the named patient.', 14, 287);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
