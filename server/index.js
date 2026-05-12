import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3001;
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const dataDir = path.join(__dirname, 'data');
const eventsFilePath = path.join(dataDir, 'events.json');
const noticesFilePath = path.join(dataDir, 'notices.json');
const sheetName = 'Donations';
const organisationName = process.env.SMTP_FROM_NAME || 'Your Organisation Name';
const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
const defaultDonationPurpose = 'General - Ashram maintenance';
const columns = [
  'Submission ID',
  'Donation ID',
  'Receipt Number',
  'Donation Date',
  'Donor Name',
  'Phone',
  'Email',
  'Postal Address',
  'Place',
  'PAN Number',
  'Donation Type',
  'Payment Method',
  'Cheque Number',
  'Draft Number',
  'Transaction Reference',
  'Bank Name',
  'Purpose',
  'Amount',
  'Notes',
  'Payment Proof',
  'Source',
  'Verification Status',
  'Receipt Status',
  'Corpus Fund',
  'Corpus Declaration Number',
  'Cancellation Reason',
  'Cancelled At',
  'Created At',
  'Verified At',
];

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(eventsFilePath)) {
  fs.writeFileSync(eventsFilePath, '[]');
}

if (!fs.existsSync(noticesFilePath)) {
  fs.writeFileSync(noticesFilePath, '[]');
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));

function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM_EMAIL,
  );
}

let mailTransporter;

function getMailTransporter() {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return mailTransporter;
}

function buildAdminDonationLink(donation) {
  return `${appBaseUrl}/admin/donations?donation=${encodeURIComponent(donation.submissionId || donation.donationId)}`;
}

function deriveDonationType(purpose, fallback = 'General') {
  const prefix = String(purpose || '')
    .split(' - ')
    .shift()
    .trim();

  if (['General', 'Educational', 'School'].includes(prefix)) {
    return prefix;
  }

  return fallback;
}

function generateReceiptPdfBuffer(donation) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).text(organisationName, { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(12).text('Official Donation Receipt');
    doc.moveDown();

    const rows = [
      ['Receipt Number', donation.receiptNumber || '-'],
      ['Donation ID', donation.donationId || '-'],
      ['Donor Name', donation.donorName || '-'],
      ['Donation Date', donation.donationDate || '-'],
      ['Payment Method', donation.paymentMethod || '-'],
      ['Transaction Reference', donation.transactionReference || '-'],
      ['Purpose', donation.purpose || defaultDonationPurpose],
      ['Amount', `Rs. ${normalizeAmount(donation.amount).toFixed(2)}`],
      ['Verified On', donation.verifiedAt || '-'],
    ];

    rows.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').fontSize(11).text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(String(value));
      doc.moveDown(0.3);
    });

    doc.moveDown();
    doc.font('Helvetica').fontSize(11).text(
      `Received with thanks from ${donation.donorName || 'the donor'} toward ${donation.purpose || defaultDonationPurpose}.`,
    );

    doc.end();
  });
}

async function sendDonationConfirmationEmail(donation) {
  if (!donation.email) {
    return { attempted: false, reason: 'missing-recipient' };
  }

  const transporter = getMailTransporter();
  if (!transporter) {
    return { attempted: false, reason: 'email-not-configured' };
  }

  const amountText = `Rs. ${normalizeAmount(donation.amount).toFixed(2)}`;
  const fromAddress = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME || organisationName;
  const receiptPdf = await generateReceiptPdfBuffer(donation);

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: donation.email,
    subject: `Donation confirmed - ${donation.receiptNumber}`,
    text: [
      `Dear ${donation.donorName || 'Donor'},`,
      '',
      `Thank you for your donation to ${organisationName}.`,
      `Your donation has been confirmed.`,
      '',
      `Receipt Number: ${donation.receiptNumber || '-'}`,
      `Donation ID: ${donation.donationId || '-'}`,
      `Donation Date: ${donation.donationDate || '-'}`,
      `Amount: ${amountText}`,
      `Purpose: ${donation.purpose || defaultDonationPurpose}`,
      '',
      'We appreciate your support.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Donation Confirmation</h2>
        <p>Dear ${donation.donorName || 'Donor'},</p>
        <p>Thank you for your donation to <strong>${organisationName}</strong>.</p>
        <p>Your donation has been confirmed.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Receipt Number</strong></td><td>${donation.receiptNumber || '-'}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Donation ID</strong></td><td>${donation.donationId || '-'}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Donation Date</strong></td><td>${donation.donationDate || '-'}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Amount</strong></td><td>${amountText}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Purpose</strong></td><td>${donation.purpose || defaultDonationPurpose}</td></tr>
        </table>
        <p>We appreciate your support.</p>
      </div>
    `,
    attachments: [
      {
        filename: `${donation.receiptNumber || donation.donationId || 'donation-receipt'}.pdf`,
        content: receiptPdf,
        contentType: 'application/pdf',
      },
    ],
  });

  return { attempted: true, reason: 'sent' };
}

async function sendDonationCancellationEmail(donation) {
  const transporter = getMailTransporter();
  if (!transporter) {
    return { attempted: false, reason: 'email-not-configured' };
  }

  const adminRecipient = process.env.ADMIN_REVIEW_EMAIL || process.env.SMTP_FROM_EMAIL;
  const recipient = donation.email || adminRecipient;
  if (!recipient) {
    return { attempted: false, reason: 'missing-recipient' };
  }

  const fromAddress = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME || organisationName;
  if (donation.email) {
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: donation.email,
      subject: `Donation cancelled - ${donation.receiptNumber || donation.donationId}`,
      text: [
        `Dear ${donation.donorName || 'Donor'},`,
        '',
        `This is to inform you that your donation to ${organisationName} has been cancelled.`,
        `Donation ID: ${donation.donationId || '-'}`,
        `Receipt Number: ${donation.receiptNumber || '-'}`,
        `Amount: Rs. ${normalizeAmount(donation.amount).toFixed(2)}`,
        `Reason: ${donation.cancellationReason || 'Not specified'}`,
        '',
        'If you need any clarification, please contact the Mission office.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <h2 style="margin-bottom: 12px;">Donation Cancelled</h2>
          <p>Dear ${donation.donorName || 'Donor'},</p>
          <p>Your donation to <strong>${organisationName}</strong> has been cancelled.</p>
          <table style="border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 6px 12px 6px 0;"><strong>Donation ID</strong></td><td>${donation.donationId || '-'}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0;"><strong>Receipt Number</strong></td><td>${donation.receiptNumber || '-'}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0;"><strong>Amount</strong></td><td>Rs. ${normalizeAmount(donation.amount).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0;"><strong>Reason</strong></td><td>${donation.cancellationReason || 'Not specified'}</td></tr>
          </table>
          <p>If you need any clarification, please contact the Mission office.</p>
        </div>
      `,
    });
  }

  if (adminRecipient && adminRecipient !== donation.email) {
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: adminRecipient,
      subject: `Donation cancelled - ${donation.receiptNumber || donation.donationId}`,
      text: [
        `A donation to ${organisationName} has been cancelled.`,
        '',
        `Donation ID: ${donation.donationId || '-'}`,
        `Receipt Number: ${donation.receiptNumber || '-'}`,
        `Donor Name: ${donation.donorName || '-'}`,
        `Amount: Rs. ${normalizeAmount(donation.amount).toFixed(2)}`,
        `Reason: ${donation.cancellationReason || 'Not specified'}`,
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <h2 style="margin-bottom: 12px;">Donation Cancelled</h2>
          <p>A donation to <strong>${organisationName}</strong> has been cancelled.</p>
          <table style="border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 6px 12px 6px 0;"><strong>Donation ID</strong></td><td>${donation.donationId || '-'}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0;"><strong>Receipt Number</strong></td><td>${donation.receiptNumber || '-'}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0;"><strong>Donor Name</strong></td><td>${donation.donorName || '-'}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0;"><strong>Amount</strong></td><td>Rs. ${normalizeAmount(donation.amount).toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0;"><strong>Reason</strong></td><td>${donation.cancellationReason || 'Not specified'}</td></tr>
          </table>
        </div>
      `,
    });
  }

  return { attempted: true, reason: 'sent' };
}

async function sendAdminDonationRequestEmail(donation) {
  const transporter = getMailTransporter();
  if (!transporter) {
    return { attempted: false, reason: 'email-not-configured' };
  }

  const adminRecipient = process.env.ADMIN_REVIEW_EMAIL || process.env.SMTP_FROM_EMAIL;
  if (!adminRecipient) {
    return { attempted: false, reason: 'missing-admin-recipient' };
  }

  const amountText = `Rs. ${normalizeAmount(donation.amount).toFixed(2)}`;
  const fromAddress = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME || organisationName;
  const reviewLink = buildAdminDonationLink(donation);

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: adminRecipient,
    subject: `New donation received - ${donation.donationId}`,
    text: [
      'A new donation has been received and recorded in the system.',
      '',
      `Donation ID: ${donation.donationId}`,
      `Donor Name: ${donation.donorName}`,
      `Donation Date: ${donation.donationDate}`,
      `Amount: ${amountText}`,
      `Email: ${donation.email || '-'}`,
      `Phone: ${donation.phone || '-'}`,
      `Payment Method: ${donation.paymentMethod || '-'}`,
      `Transaction Reference: ${donation.transactionReference || '-'}`,
      '',
      `Review link: ${reviewLink}`,
      '',
      'Please open the admin dashboard to view the record and take any necessary follow-up action.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">New Donation Received</h2>
        <p>A new donation has been received and recorded in the system.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Donation ID</strong></td><td>${donation.donationId}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Donor Name</strong></td><td>${donation.donorName}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Donation Date</strong></td><td>${donation.donationDate}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Amount</strong></td><td>${amountText}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Email</strong></td><td>${donation.email || '-'}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Phone</strong></td><td>${donation.phone || '-'}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Payment Method</strong></td><td>${donation.paymentMethod || '-'}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Transaction Reference</strong></td><td>${donation.transactionReference || '-'}</td></tr>
        </table>
        <p><a href="${reviewLink}" target="_blank" rel="noreferrer">Open this donation in the admin dashboard</a></p>
        <p>Please open the admin dashboard to view the record and take any necessary follow-up action.</p>
      </div>
    `,
  });

  return { attempted: true, reason: 'sent' };
}

async function sendInquiryEmail(inquiry) {
  const transporter = getMailTransporter();
  if (!transporter) {
    return { attempted: false, reason: 'email-not-configured' };
  }

  const adminRecipient = process.env.ADMIN_REVIEW_EMAIL || process.env.SMTP_FROM_EMAIL;
  if (!adminRecipient) {
    return { attempted: false, reason: 'missing-admin-recipient' };
  }

  const fromAddress = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME || organisationName;

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: adminRecipient,
    replyTo: inquiry.email || undefined,
    subject: `New website enquiry - ${inquiry.subject}`,
    text: [
      'A new enquiry has been submitted from the public website.',
      '',
      `Name: ${inquiry.name}`,
      `Email: ${inquiry.email}`,
      `Phone: ${inquiry.phone || '-'}`,
      `Subject: ${inquiry.subject}`,
      '',
      'Message:',
      inquiry.message,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">New Website Enquiry</h2>
        <p>A new enquiry has been submitted from the public website.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Name</strong></td><td>${inquiry.name}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Email</strong></td><td>${inquiry.email}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Phone</strong></td><td>${inquiry.phone || '-'}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Subject</strong></td><td>${inquiry.subject}</td></tr>
        </table>
        <p><strong>Message</strong></p>
        <p style="white-space: pre-wrap;">${inquiry.message}</p>
      </div>
    `,
  });

  return { attempted: true, reason: 'sent' };
}

function normalizeAmount(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function buildEventStatus(startDate, endDate = '') {
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  if (Number.isNaN(start.getTime())) {
    return 'Upcoming';
  }

  if (end < now) {
    return 'Past';
  }

  return 'Upcoming';
}

function normalizeNotice(notice) {
  return {
    id: String(notice.id || `NOTICE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    page: notice.page === 'events' ? 'events' : 'home',
    message: String(notice.message || '').trim(),
    createdAt: String(notice.createdAt || new Date().toISOString()).trim(),
    source: String(notice.source || 'manual').trim(),
  };
}

function readNotices() {
  const raw = fs.readFileSync(noticesFilePath, 'utf8');
  return JSON.parse(raw || '[]')
    .map(normalizeNotice)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function writeNotices(notices) {
  fs.writeFileSync(noticesFilePath, JSON.stringify(notices.map(normalizeNotice), null, 2));
}

function addNotice(input) {
  const notices = readNotices();
  const notice = normalizeNotice({
    ...input,
    id: input.id || `NOTICE-${new Date().getFullYear()}-${Date.now()}`,
    createdAt: input.createdAt || new Date().toISOString(),
  });
  notices.unshift(notice);
  writeNotices(notices);
  return notice;
}

function normalizeEvent(event) {
  return {
    id: String(event.id || `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: String(event.title || 'Untitled Event').trim(),
    description: String(event.description || '').trim(),
    location: String(event.location || '').trim(),
    startDate: String(event.startDate || '').trim(),
    endDate: String(event.endDate || '').trim(),
    googleFormUrl: String(event.googleFormUrl || '').trim(),
    registrationsSheetUrl: String(event.registrationsSheetUrl || '').trim(),
    createdAt: String(event.createdAt || new Date().toISOString()).trim(),
    status: buildEventStatus(event.startDate, event.endDate),
  };
}

function readEvents() {
  const raw = fs.readFileSync(eventsFilePath, 'utf8');
  const events = JSON.parse(raw || '[]').map(normalizeEvent);
  return events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

function writeEvents(events) {
  fs.writeFileSync(eventsFilePath, JSON.stringify(events.map(normalizeEvent), null, 2));
}

function createEventPayload(input) {
  return normalizeEvent({
    ...input,
    registrationsSheetUrl: normalizeRegistrationsSheetUrl(input.registrationsSheetUrl || ''),
    id: input.id || `EVT-${new Date().getFullYear()}-${Date.now()}`,
    createdAt: input.createdAt || new Date().toISOString(),
  });
}

function normalizeRegistrationsSheetUrl(inputUrl) {
  if (!inputUrl) {
    return '';
  }

  try {
    const parsedUrl = new URL(inputUrl);
    if (!parsedUrl.hostname.includes('docs.google.com') || !parsedUrl.pathname.includes('/spreadsheets/d/')) {
      return inputUrl;
    }

    const pathMatch = parsedUrl.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    if (!pathMatch) {
      return inputUrl;
    }

    const spreadsheetId = pathMatch[1];
    const gidFromSearch = parsedUrl.searchParams.get('gid');
    const gidFromHash = parsedUrl.hash.startsWith('#gid=') ? parsedUrl.hash.replace('#gid=', '') : '';
    const gid = gidFromSearch || gidFromHash;
    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`);
    exportUrl.searchParams.set('format', 'csv');
    if (gid) {
      exportUrl.searchParams.set('gid', gid);
    }
    return exportUrl.toString();
  } catch {
    return inputUrl;
  }
}

function hasMeaningfulValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function formatRegistrationCell(cell) {
  if (!cell) {
    return '';
  }

  if (typeof cell.v === 'number') {
    const looksLikeSpreadsheetDate = cell.v > 30000 && cell.v < 60000;
    const parsedDate = looksLikeSpreadsheetDate ? XLSX.SSF.parse_date_code(cell.v) : null;
    if (parsedDate && parsedDate.y && parsedDate.m && parsedDate.d) {
      const date = new Date(
        parsedDate.y,
        parsedDate.m - 1,
        parsedDate.d,
        parsedDate.H || 0,
        parsedDate.M || 0,
        Math.floor(parsedDate.S || 0),
      );

      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
  }

  if (cell.w) {
    return String(cell.w).trim();
  }

  return String(cell.v ?? '').trim();
}

function extractRegistrationRows(worksheet) {
  if (!worksheet || !worksheet['!ref']) {
    return [];
  }

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const rows = [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    const row = [];
    for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      row.push(formatRegistrationCell(worksheet[cellRef]));
    }
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);
  const includedColumns = headerRow.map((header, colIndex) => {
    const headerHasValue = hasMeaningfulValue(header);
    const columnHasData = dataRows.some((row) => hasMeaningfulValue(row[colIndex]));
    return headerHasValue || columnHasData;
  });

  const visibleColumns = headerRow
    .map((header, colIndex) => ({
      label: hasMeaningfulValue(header) ? header : `Column ${colIndex + 1}`,
      originalColumnIndex: colIndex,
      include: includedColumns[colIndex],
    }))
    .filter((column) => column.include);

  return dataRows
    .map((row) => {
      const entry = {};
      visibleColumns.forEach((column) => {
        entry[column.label] = row[column.originalColumnIndex] || '';
      });
      return entry;
    })
    .filter((row) => Object.values(row).some(hasMeaningfulValue));
}

async function readEventRegistrations(event) {
  if (!event.registrationsSheetUrl) {
    return {
      rows: [],
      source: 'none',
      message: 'Add a published Google Sheets CSV URL for this event to view registrations.',
    };
  }

  const sheetUrl = normalizeRegistrationsSheetUrl(event.registrationsSheetUrl);
  const response = await fetch(sheetUrl);
  if (!response.ok) {
    throw new Error(`Unable to fetch registrations sheet (${response.status}).`);
  }

  const csvText = await response.text();
  if (csvText.trim().startsWith('<!DOCTYPE html') || csvText.trim().startsWith('<html')) {
    throw new Error('The registrations sheet URL is not returning CSV data.');
  }
  const workbook = XLSX.read(csvText, { type: 'string' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = extractRegistrationRows(worksheet);

  return {
    rows,
    source: 'google-sheet-csv',
    message: rows.length ? '' : 'No registrations found in the linked sheet yet.',
  };
}

function getYearFromDate(dateValue) {
  const parsed = new Date(dateValue);
  const year = Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
  return String(year);
}

function getWorkbookPath(year) {
  return path.join(dataDir, `donations-${year}.xlsx`);
}

function createWorkbookIfMissing(year) {
  const workbookPath = getWorkbookPath(year);
  if (fs.existsSync(workbookPath)) {
    return workbookPath;
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet([], { header: columns });
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, workbookPath);
  return workbookPath;
}

function listWorkbookFiles() {
  if (!fs.existsSync(dataDir)) {
    return [];
  }

  return fs
    .readdirSync(dataDir)
    .filter((file) => /^donations-\d{4}\.xlsx$/i.test(file))
    .map((file) => path.join(dataDir, file));
}

function readWorkbookRows(filePath) {
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
}

function normalizeVerificationStatus(row) {
  const value = String(row['Verification Status'] || '').trim().toLowerCase();
  if (value === 'confirmed') {
    return 'Confirmed';
  }
  if (value === 'rejected') {
    return 'Rejected';
  }
  return 'Pending';
}

function normalizeReceiptStatus(row, verificationStatus) {
  const value = String(row['Receipt Status'] || '').trim().toLowerCase();
  if (value === 'cancelled') {
    return 'Cancelled';
  }
  if (value === 'active' || value === 'issued') {
    return 'Active';
  }
  if (verificationStatus === 'Confirmed') {
    return 'Active';
  }
  if (verificationStatus === 'Rejected') {
    return 'Not Issued';
  }
  return 'Awaiting Confirmation';
}

function normalizeCancellationStatus(row) {
  const value = String(row['Receipt Status'] || '').trim().toLowerCase();
  if (value === 'cancelled') {
    return 'Cancelled';
  }
  return '';
}

function normalizeDonation(row) {
  const verificationStatus = normalizeVerificationStatus(row);
  const receiptStatusOverride = normalizeCancellationStatus(row);
  const paymentMethod = row['Payment Method'] || 'Cash/UPI';
  const transactionReference =
    row['Transaction Reference'] ||
    row['UTR'] ||
    row['Cheque Number'] ||
    row['Draft Number'] ||
    '';

  return {
    submissionId:
      row['Submission ID'] ||
      row['Donation ID'] ||
      row['Receipt Number'] ||
      `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    donationId: row['Donation ID'] || '',
    receiptNumber: row['Receipt Number'] || '',
    donationDate: row['Donation Date'] || '',
    donorName: row['Donor Name'] || '',
    phone: row['Phone'] || '',
    email: row['Email'] || '',
    address: row['Postal Address'] || row['Address'] || '',
    place: row['Place'] || '',
    panNumber: row['PAN Number'] || '',
    donationType: row['Donation Type'] || deriveDonationType(row['Purpose']),
    paymentMethod,
    chequeNumber: row['Cheque Number'] || '',
    draftNumber: row['Draft Number'] || '',
    transactionReference,
    bankName: row['Bank Name'] || '',
    purpose: row['Purpose'] || defaultDonationPurpose,
    amount: normalizeAmount(row['Amount']),
    notes: row['Notes'] || '',
    paymentProof: row['Payment Proof'] || '',
    source: row['Source'] || 'admin',
    verificationStatus,
    receiptStatus: receiptStatusOverride || normalizeReceiptStatus(row, verificationStatus),
    isCorpusFund:
      String(row['Corpus Fund'] || '')
        .trim()
        .toLowerCase() === 'yes',
    corpusDeclarationNumber: row['Corpus Declaration Number'] || '',
    cancellationReason: row['Cancellation Reason'] || '',
    cancelledAt: row['Cancelled At'] || '',
    createdAt: row['Created At'] || '',
    verifiedAt: row['Verified At'] || '',
  };
}

function formatForSheet(row) {
  return {
    'Submission ID': row.submissionId,
    'Donation ID': row.donationId,
    'Receipt Number': row.receiptNumber,
    'Donation Date': row.donationDate,
    'Donor Name': row.donorName,
    Phone: row.phone,
    Email: row.email,
    'Postal Address': row.address,
    Place: row.place || '',
    'PAN Number': row.panNumber || '',
    'Donation Type': row.donationType,
    'Payment Method': row.paymentMethod,
    'Cheque Number': row.chequeNumber || '',
    'Draft Number': row.draftNumber || '',
    'Transaction Reference': row.transactionReference || '',
    'Bank Name': row.bankName || '',
    Purpose: row.purpose,
    Amount: row.amount,
    Notes: row.notes,
    'Payment Proof': row.paymentProof || '',
    Source: row.source || 'admin',
    'Verification Status': row.verificationStatus || 'Pending',
    'Receipt Status': row.receiptStatus || 'Awaiting Confirmation',
    'Corpus Fund': row.isCorpusFund ? 'Yes' : 'No',
    'Corpus Declaration Number': row.corpusDeclarationNumber || '',
    'Cancellation Reason': row.cancellationReason || '',
    'Cancelled At': row.cancelledAt || '',
    'Created At': row.createdAt,
    'Verified At': row.verifiedAt || '',
  };
}

function readAllDonations() {
  const files = listWorkbookFiles();
  const rows = files.flatMap((filePath) => readWorkbookRows(filePath).map(normalizeDonation));
  rows.sort((a, b) => new Date(b.createdAt || b.donationDate) - new Date(a.createdAt || a.donationDate));
  return rows;
}

function readYearDonations(year) {
  const workbookPath = createWorkbookIfMissing(year);
  return readWorkbookRows(workbookPath).map(normalizeDonation);
}

function writeYearDonations(year, rows) {
  const workbookPath = getWorkbookPath(year);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows.map(formatForSheet), { header: columns });
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, workbookPath);
}

function writeDonationsGroupedByYear(rows) {
  const grouped = rows.reduce((accumulator, row) => {
    const year = getYearFromDate(row.donationDate || row.createdAt);
    accumulator[year] ||= [];
    accumulator[year].push(row);
    return accumulator;
  }, {});

  for (const filePath of listWorkbookFiles()) {
    fs.unlinkSync(filePath);
  }

  Object.entries(grouped).forEach(([year, donations]) => {
    writeYearDonations(year, donations);
  });
}

function getNextNumericSuffix(rows, fieldName) {
  const values = rows
    .map((row) => row[fieldName])
    .filter(Boolean)
    .map((value) => Number(String(value).split('-').pop()))
    .filter((value) => Number.isFinite(value));
  return (values.length ? Math.max(...values) : 0) + 1;
}

function buildBaseDonation(input, existingRows, defaults = {}) {
  const donationDate = input.donationDate || new Date().toISOString().slice(0, 10);
  const year = getYearFromDate(donationDate);
  const now = defaults.createdAt || input.createdAt || new Date().toISOString();
  const donationSequence = getNextNumericSuffix(existingRows, 'donationId');
  const receiptSequence = getNextNumericSuffix(existingRows, 'receiptNumber');
  const isCorpusFund =
    Boolean(input.isCorpusFund) ||
    String(input.donationType || '').toLowerCase().includes('corpus') ||
    String(input.purpose || '').toLowerCase().includes('corpus');
  const verificationStatus = defaults.verificationStatus || input.verificationStatus || 'Pending';
  const receiptStatus =
    defaults.receiptStatus ||
    input.receiptStatus ||
    (verificationStatus === 'Confirmed'
      ? 'Active'
      : verificationStatus === 'Rejected'
        ? 'Not Issued'
        : 'Awaiting Confirmation');
  const paymentMethod = String(input.paymentMethod || 'UPI / Bank Transfer').trim();
  const chequeNumber = String(input.chequeNumber || '').trim();
  const draftNumber = String(input.draftNumber || '').trim();
  const transactionReference = String(
    input.transactionReference || input.utr || chequeNumber || draftNumber || '',
  ).trim();
  const receiptNumber =
    verificationStatus === 'Confirmed'
      ? input.receiptNumber || `RCPT-${year}-${String(receiptSequence).padStart(4, '0')}`
      : input.receiptNumber || '';
  const donationId = input.donationId || `DON-${year}-${String(donationSequence).padStart(4, '0')}`;

  return {
    submissionId: input.submissionId || donationId,
    donationId,
    receiptNumber,
    donationDate,
    donorName: String(input.donorName || 'Unknown Donor').trim(),
    phone: String(input.phone || '').trim(),
    email: String(input.email || '').trim(),
    address: String(input.address || '').trim(),
    place: String(input.place || '').trim(),
    panNumber: String(input.panNumber || '').trim(),
    donationType: String(
      input.donationType || (isCorpusFund ? 'Corpus Fund' : deriveDonationType(input.purpose)),
    ).trim(),
    paymentMethod,
    chequeNumber,
    draftNumber,
    transactionReference,
    bankName: String(input.bankName || '').trim(),
    purpose: String(input.purpose || (isCorpusFund ? 'Corpus Fund' : defaultDonationPurpose)).trim(),
    amount: normalizeAmount(input.amount),
    notes: String(input.notes || '').trim(),
    paymentProof: String(input.paymentProof || '').trim(),
    source: String(defaults.source || input.source || 'admin').trim(),
    verificationStatus,
    receiptStatus,
    isCorpusFund,
    corpusDeclarationNumber:
      verificationStatus === 'Confirmed' && isCorpusFund
        ? input.corpusDeclarationNumber || `DECL-${year}-${String(receiptSequence).padStart(4, '0')}`
        : input.corpusDeclarationNumber || '',
    createdAt: now,
    verifiedAt:
      verificationStatus === 'Confirmed'
        ? defaults.verifiedAt || input.verifiedAt || now
        : input.verifiedAt || '',
  };
}

function findDonationBySubmissionId(rows, submissionId) {
  return rows.find((row) => row.submissionId === submissionId);
}

function updateDonation(submissionId, updater) {
  const allRows = readAllDonations();
  const target = findDonationBySubmissionId(allRows, submissionId);
  if (!target) {
    return null;
  }

  const updatedRows = allRows.map((row) => (row.submissionId === submissionId ? updater(row, allRows) : row));
  writeDonationsGroupedByYear(updatedRows);
  return updatedRows.find((row) => row.submissionId === submissionId) || null;
}

function mergeDonations(existingRows, incomingRows) {
  const mergedMap = new Map(existingRows.map((row) => [row.submissionId || row.receiptNumber, row]));

  for (const row of incomingRows) {
    const key = row.submissionId || row.receiptNumber;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, row);
    }
  }

  return Array.from(mergedMap.values());
}

function ensureDefaultYearWorkbook() {
  createWorkbookIfMissing(String(new Date().getFullYear()));
}

function buildSummary(rows) {
  const activeRows = rows.filter((row) => row.receiptStatus !== 'Cancelled');
  const confirmedRows = activeRows.filter(
    (row) => row.verificationStatus === 'Confirmed' && row.receiptStatus !== 'Cancelled',
  );
  const pendingRows = activeRows.filter((row) => row.verificationStatus === 'Pending');
  const rejectedRows = activeRows.filter((row) => row.verificationStatus === 'Rejected');
  const byDay = {};
  const byYear = {};

  for (const row of confirmedRows) {
    byDay[row.donationDate] ||= { donationDate: row.donationDate, donationCount: 0, totalAmount: 0 };
    byDay[row.donationDate].donationCount += 1;
    byDay[row.donationDate].totalAmount += Number(row.amount || 0);

    const year = getYearFromDate(row.donationDate || row.createdAt);
    byYear[year] ||= { year, donationCount: 0, totalAmount: 0, corpusAmount: 0 };
    byYear[year].donationCount += 1;
    byYear[year].totalAmount += Number(row.amount || 0);
    if (row.isCorpusFund) {
      byYear[year].corpusAmount += Number(row.amount || 0);
    }
  }

  return {
    totals: {
      totalDonations: activeRows.length,
      pendingDonations: pendingRows.length,
      confirmedDonations: confirmedRows.length,
      rejectedDonations: rejectedRows.length,
      cancelledDonations: rows.filter((row) => row.receiptStatus === 'Cancelled').length,
      totalAmount: confirmedRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    },
    daily: Object.values(byDay).sort((a, b) => b.donationDate.localeCompare(a.donationDate)),
    yearly: Object.values(byYear).sort((a, b) => b.year.localeCompare(a.year)),
  };
}

ensureDefaultYearWorkbook();

app.get('/api/donations', (req, res) => {
  let rows = readAllDonations();
  const verificationStatus = req.query.verificationStatus ? String(req.query.verificationStatus) : '';
  const source = req.query.source ? String(req.query.source) : '';

  if (verificationStatus) {
    rows = rows.filter(
      (row) => row.verificationStatus.toLowerCase() === verificationStatus.trim().toLowerCase(),
    );
  }

  if (source) {
    rows = rows.filter((row) => row.source.toLowerCase() === source.trim().toLowerCase());
  }

  res.json(rows);
});

app.get('/api/summary', (_req, res) => {
  res.json(buildSummary(readAllDonations()));
});

app.post('/api/admin-access', (req, res) => {
  const configuredPassword = process.env.ADMIN_PORTAL_PASSWORD || '';
  if (!configuredPassword) {
    return res.status(503).json({ message: 'Admin password is not configured yet.' });
  }

  const submittedPassword = String(req.body.password || '');
  if (submittedPassword !== configuredPassword) {
    return res.status(401).json({ message: 'Incorrect admin password.' });
  }

  return res.json({ success: true });
});

app.get('/api/events', (_req, res) => {
  res.json(readEvents());
});

app.get('/api/notices', (req, res) => {
  const page = String(req.query.page || '').trim().toLowerCase();
  const notices = readNotices();
  if (!page) {
    return res.json(notices);
  }
  return res.json(notices.filter((notice) => notice.page === page));
});

app.post('/api/notices', (req, res) => {
  const page = String(req.body.page || '').trim().toLowerCase();
  const message = String(req.body.message || '').trim();

  if (!['home', 'events'].includes(page) || !message) {
    return res.status(400).json({ message: 'A valid page and message are required.' });
  }

  const notice = addNotice({
    page,
    message,
    source: 'manual',
  });

  return res.status(201).json(notice);
});

app.post('/api/events', (req, res) => {
  const { title, startDate } = req.body;
  if (!title || !startDate) {
    return res.status(400).json({ message: 'Event title and start date are required.' });
  }

  const events = readEvents();
  const event = createEventPayload(req.body);
  events.push(event);
  writeEvents(events);

  const autoNoticeMessage = `New event posted: ${event.title} on ${event.startDate}${event.location ? ` at ${event.location}` : ''}.`;
  addNotice({ page: 'events', message: autoNoticeMessage, source: 'event-auto' });
  addNotice({ page: 'home', message: autoNoticeMessage, source: 'event-auto' });

  return res.status(201).json(event);
});

app.patch('/api/events/:eventId', (req, res) => {
  const events = readEvents();
  const existing = events.find((event) => event.id === req.params.eventId);

  if (!existing) {
    return res.status(404).json({ message: 'Event not found.' });
  }

  const updated = createEventPayload({
    ...existing,
    ...req.body,
    id: existing.id,
    createdAt: existing.createdAt,
  });

  writeEvents(events.map((event) => (event.id === existing.id ? updated : event)));
  return res.json(updated);
});

app.get('/api/events/:eventId/registrations', async (req, res) => {
  const event = readEvents().find((item) => item.id === req.params.eventId);

  if (!event) {
    return res.status(404).json({ message: 'Event not found.' });
  }

  try {
    const registrations = await readEventRegistrations(event);
    return res.json({ event, ...registrations });
  } catch (error) {
    return res.status(502).json({
      event,
      rows: [],
      source: 'google-sheet-csv',
      message: error.message || 'Unable to load registrations for this event.',
    });
  }
});

app.post('/api/donations', (req, res) => {
  const { donorName, amount } = req.body;
  if (!donorName || !amount) {
    return res.status(400).json({ message: 'Donor name and amount are required.' });
  }

  const year = getYearFromDate(req.body.donationDate);
  const existingRows = readYearDonations(year);
  const entry = buildBaseDonation(req.body, existingRows, {
    source: 'admin',
    verificationStatus: 'Confirmed',
    receiptStatus: 'Active',
    verifiedAt: new Date().toISOString(),
  });

  existingRows.push(entry);
  writeYearDonations(year, existingRows);

  sendDonationConfirmationEmail(entry).catch((error) => {
    console.error('Confirmation email failed:', error);
  });

  sendAdminDonationRequestEmail(entry).catch((error) => {
    console.error('Donation received email failed:', error);
  });

  return res.status(201).json(entry);
});

app.post('/api/public-donations', (req, res) => {
  const { donorName, amount, email, phone } = req.body;
  if (!donorName || !amount || (!email && !phone)) {
    return res.status(400).json({ message: 'Donor name, amount, and one contact method are required.' });
  }

  const year = getYearFromDate(req.body.donationDate);
  const existingRows = readYearDonations(year);
  const entry = buildBaseDonation(req.body, existingRows, {
    source: 'public',
    verificationStatus: 'Confirmed',
    receiptStatus: 'Active',
    verifiedAt: new Date().toISOString(),
  });

  existingRows.push(entry);
  writeYearDonations(year, existingRows);

  sendDonationConfirmationEmail(entry).catch((error) => {
    console.error('Confirmation email failed:', error);
  });

  sendAdminDonationRequestEmail(entry).catch((error) => {
    console.error('Donation received email failed:', error);
  });

  return res.status(201).json(entry);
});

app.post('/api/inquiries', async (req, res) => {
  const inquiry = {
    name: String(req.body.name || '').trim(),
    email: String(req.body.email || '').trim(),
    phone: String(req.body.phone || '').trim(),
    subject: String(req.body.subject || '').trim(),
    message: String(req.body.message || '').trim(),
  };

  if (!inquiry.name || !inquiry.email || !inquiry.subject || !inquiry.message) {
    return res.status(400).json({ message: 'Name, email, subject, and message are required.' });
  }

  try {
    const emailStatus = await sendInquiryEmail(inquiry);
    if (!emailStatus.attempted) {
      return res.status(503).json({ message: 'Email is not configured for enquiries yet.' });
    }

    return res.status(201).json({
      success: true,
      message: 'Your enquiry has been sent successfully.',
    });
  } catch (error) {
    console.error('Inquiry email failed:', error);
    return res.status(502).json({ message: 'Unable to send your enquiry right now.' });
  }
});

app.patch('/api/donations/:submissionId/verify', async (req, res) => {
  const updated = updateDonation(req.params.submissionId, (row, allRows) => {
    if (row.verificationStatus === 'Confirmed') {
      return row;
    }

    const year = getYearFromDate(row.donationDate || row.createdAt);
    const receiptSequence = getNextNumericSuffix(allRows.filter((item) => getYearFromDate(item.donationDate || item.createdAt) === year), 'receiptNumber');
    const donationSequence = getNextNumericSuffix(allRows.filter((item) => getYearFromDate(item.donationDate || item.createdAt) === year), 'donationId');
    const verifiedAt = new Date().toISOString();

    return {
      ...row,
      donationId: row.donationId || row.submissionId || `DON-${year}-${String(donationSequence).padStart(4, '0')}`,
      receiptNumber: row.receiptNumber || `RCPT-${year}-${String(receiptSequence).padStart(4, '0')}`,
      verificationStatus: 'Confirmed',
      receiptStatus: 'Active',
      verifiedAt,
      notes: req.body.notes ? String(req.body.notes).trim() : row.notes,
      transactionReference: req.body.transactionReference
        ? String(req.body.transactionReference).trim()
        : row.transactionReference,
      corpusDeclarationNumber:
        row.isCorpusFund && !row.corpusDeclarationNumber
          ? `DECL-${year}-${String(receiptSequence).padStart(4, '0')}`
          : row.corpusDeclarationNumber,
    };
  });

  if (!updated) {
    return res.status(404).json({ message: 'Donation not found.' });
  }

  let emailStatus = { attempted: false, reason: 'not-requested' };

  try {
    emailStatus = await sendDonationConfirmationEmail(updated);
  } catch (error) {
    console.error('Confirmation email failed:', error);
    emailStatus = { attempted: true, reason: 'failed', error: error.message };
  }

  return res.json({ ...updated, emailStatus });
});

app.patch('/api/donations/:submissionId/reject', (req, res) => {
  const updated = updateDonation(req.params.submissionId, (row) => ({
    ...row,
    verificationStatus: 'Rejected',
    receiptStatus: 'Not Issued',
    verifiedAt: '',
    notes: req.body.notes ? String(req.body.notes).trim() : row.notes,
  }));

  if (!updated) {
    return res.status(404).json({ message: 'Donation not found.' });
  }

  return res.json(updated);
});

app.patch('/api/donations/:submissionId/cancel', async (req, res) => {
  const cancellationReason = String(req.body.reason || req.body.cancellationReason || '').trim();
  if (!cancellationReason) {
    return res.status(400).json({ message: 'A cancellation reason is required.' });
  }

  const updated = updateDonation(req.params.submissionId, (row) => ({
    ...row,
    receiptStatus: 'Cancelled',
    cancellationReason,
    cancelledAt: new Date().toISOString(),
  }));

  if (!updated) {
    return res.status(404).json({ message: 'Donation not found.' });
  }

  let emailStatus = { attempted: false, reason: 'not-requested' };
  try {
    emailStatus = await sendDonationCancellationEmail(updated);
  } catch (error) {
    console.error('Cancellation email failed:', error);
    emailStatus = { attempted: true, reason: 'failed', error: error.message };
  }

  return res.json({ ...updated, emailStatus });
});

app.post('/api/import', (req, res) => {
  const { donations, mode = 'merge' } = req.body;
  if (!Array.isArray(donations)) {
    return res.status(400).json({ message: 'A donations array is required.' });
  }

  const existingRows = mode === 'replace' ? [] : readAllDonations();
  const stagedYearRows = new Map();
  const normalizedIncoming = donations.map((donation) => {
    const year = getYearFromDate(donation.donationDate);
    const baselineRows = stagedYearRows.get(year) || (mode === 'replace' ? [] : readYearDonations(year));
    const normalized = buildBaseDonation(donation, baselineRows, {
      source: donation.source || 'admin',
      verificationStatus: donation.verificationStatus || 'Confirmed',
      receiptStatus: donation.receiptStatus || 'Active',
      verifiedAt: donation.verifiedAt || donation.createdAt || new Date().toISOString(),
      createdAt: donation.createdAt,
    });
    stagedYearRows.set(year, [...baselineRows, normalized]);
    return normalized;
  });

  const finalRows = mode === 'merge' ? mergeDonations(existingRows, normalizedIncoming) : normalizedIncoming;
  writeDonationsGroupedByYear(finalRows);
  return res.json({ count: finalRows.length, mode });
});

app.get('/api/export', (req, res) => {
  const year = req.query.year ? String(req.query.year) : '';
  if (year) {
    createWorkbookIfMissing(year);
    return res.download(getWorkbookPath(year), `donations-${year}.xlsx`);
  }

  const rows = readAllDonations().map(formatForSheet);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const exportPath = path.join(dataDir, 'donations-all-years.xlsx');
  XLSX.writeFile(workbook, exportPath);
  return res.download(exportPath, 'donations-all-years.xlsx');
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    return res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Donation API running on http://localhost:${port}`);
});
