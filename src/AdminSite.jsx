import { useEffect, useState } from 'react';
import { amountForPdf, currency, donationPurposeGroups, organisation } from './constants';
import { normalizeAmount } from './utils';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

function AdminSite({
  pathname,
  navigate,
  status,
  summary,
  donations,
  selectedDonation,
  setSelectedDonation,
  adminForm,
  setAdminForm,
  submitAdminDonation,
  isAdminSubmitting,
  updateDonationStatus,
  search,
  setSearch,
  verificationFilter,
  setVerificationFilter,
  selectedYear,
  setSelectedYear,
  availableYears,
  receiptGeneratedAt,
  receiptRef,
  declarationRef,
  events,
  upcomingEvents,
  pastEvents,
  eventForm,
  setEventForm,
  submitEvent,
  isEventSubmitting,
  selectedEvent,
  setSelectedEvent,
  loadEventRegistrations,
  eventRegistrations,
  eventRegistrationMessage,
  logoutAdmin,
  homeNotices,
  eventNotices,
  submitNotice,
  isNoticeSubmitting,
}) {
  const adminSection =
    pathname === '/admin/events' ? 'events' : pathname === '/admin/donations' ? 'donations' : 'home';

  useEffect(() => {
    if (adminSection === 'donations' && selectedDonation) {
      setTimeout(() => {
        receiptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, [adminSection, selectedDonation, receiptRef]);

  const [homeNoticeMessage, setHomeNoticeMessage] = useState('');
  const [eventNoticeMessage, setEventNoticeMessage] = useState('');
  const [openDonationMenuId, setOpenDonationMenuId] = useState('');
  const [cancelDonationTarget, setCancelDonationTarget] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancellingDonation, setIsCancellingDonation] = useState(false);

  function getDonationStatus(donation) {
    return donation.receiptStatus === 'Cancelled' ? 'Cancelled' : donation.verificationStatus;
  }

  function isActiveDonation(donation) {
    return getDonationStatus(donation) === 'Confirmed';
  }

  function updateDonationField(event) {
    const { name, value, checked, type } = event.target;
    setAdminForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function updateEventField(event) {
    const { name, value } = event.target;
    setEventForm((current) => ({ ...current, [name]: value }));
  }

  function formatNoticeDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async function handleNoticeSubmit(page) {
    const message = page === 'home' ? homeNoticeMessage : eventNoticeMessage;
    const result = await submitNotice(page, message);
    if (!result.success) {
      return;
    }

    if (page === 'home') {
      setHomeNoticeMessage('');
    } else {
      setEventNoticeMessage('');
    }
  }

  function openCancelDonationModal(donation) {
    setCancelDonationTarget(donation);
    setCancellationReason(donation.cancellationReason || '');
    setOpenDonationMenuId('');
  }

  async function handleCancelDonationSubmit(event) {
    event.preventDefault();
    if (!cancelDonationTarget || !cancellationReason.trim()) {
      return;
    }

    setIsCancellingDonation(true);
    try {
      await updateDonationStatus(cancelDonationTarget.submissionId, 'cancel', {
        reason: cancellationReason.trim(),
      });
      setCancelDonationTarget(null);
      setCancellationReason('');
    } finally {
      setIsCancellingDonation(false);
    }
  }

  const filteredDonations = donations.filter((donation) => {
    const status = getDonationStatus(donation);
    if (verificationFilter && status !== verificationFilter) {
      return false;
    }
    if (selectedYear && !String(donation.donationDate).startsWith(selectedYear)) {
      return false;
    }
    if (!search.trim()) {
      return true;
    }
    return Object.values(donation).some((value) =>
      String(value).toLowerCase().includes(search.trim().toLowerCase()),
    );
  });

  function openPrintableContent(title, content) {
    const printWindow = window.open('', '', 'width=1000,height=750');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            .print-sheet { max-width: 860px; margin: 0 auto; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function buildReceiptPdf(donation) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const left = 48;
    let top = 56;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(organisation.name, left, top);
    top += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Official Donation Receipt', left, top);
    top += 26;
    doc.roundedRect(left, top, 500, 250, 12, 12);
    top += 22;

    [
      `Receipt Number: ${donation.receiptNumber || '-'}`,
      `Donation ID: ${donation.donationId || '-'}`,
      `Donor Name: ${donation.donorName}`,
      `Donation Date: ${donation.donationDate}`,
      `Payment Method: ${donation.paymentMethod}`,
      `Transaction Reference: ${donation.transactionReference || '-'}`,
      `Purpose: ${donation.purpose}`,
      `Verified On: ${donation.verifiedAt || '-'}`,
      `Generated On: ${receiptGeneratedAt || new Date().toLocaleString('en-IN')}`,
    ].forEach((line) => {
      doc.text(line, left + 18, top);
      top += 22;
    });

    top += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text(`Rs. ${amountForPdf.format(normalizeAmount(donation.amount))}`, left + 18, top);
    return doc;
  }

  function downloadReceipt() {
    if (!selectedDonation || !isActiveDonation(selectedDonation)) {
      return;
    }
    const doc = buildReceiptPdf(selectedDonation);
    doc.save(`${selectedDonation.receiptNumber || selectedDonation.submissionId}.pdf`);
  }

  function printReceipt() {
    if (!selectedDonation || !isActiveDonation(selectedDonation) || !receiptRef.current) {
      return;
    }
    openPrintableContent(`Receipt ${selectedDonation.receiptNumber}`, receiptRef.current.innerHTML);
  }

  function printDeclaration() {
    if (!selectedDonation || !selectedDonation.isCorpusFund || !isActiveDonation(selectedDonation) || !declarationRef.current) {
      return;
    }
    openPrintableContent(
      `Corpus Declaration ${selectedDonation.corpusDeclarationNumber}`,
      declarationRef.current.innerHTML,
    );
  }

  function viewDonation(donation) {
    setSelectedDonation(donation);
    setTimeout(() => {
      receiptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function downloadDonationReceipt(donation) {
    if (!donation || !isActiveDonation(donation)) {
      return;
    }
    setSelectedDonation(donation);
    const doc = buildReceiptPdf(donation);
    doc.save(`${donation.receiptNumber || donation.donationId}.pdf`);
  }

  function printDonationReceipt(donation) {
    if (!donation || !isActiveDonation(donation)) {
      return;
    }
    setSelectedDonation(donation);
    setTimeout(() => {
      if (receiptRef.current) {
        openPrintableContent(`Receipt ${donation.receiptNumber}`, receiptRef.current.innerHTML);
      }
    }, 80);
  }

  function exportSummary() {
    const rows = filteredDonations.map((donation) => ({
      'Submission ID': donation.submissionId,
      'Receipt Number': donation.receiptNumber,
      Donor: donation.donorName,
      Date: donation.donationDate,
      Amount: donation.amount,
      Purpose: donation.purpose,
      Verification: donation.verificationStatus,
      Source: donation.source,
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Donation Summary');
    XLSX.writeFile(workbook, `donation-summary${selectedYear ? `-${selectedYear}` : ''}.xlsx`);
  }

  function exportWorkbook() {
    const url = selectedYear ? `/api/export?year=${selectedYear}` : '/api/export';
    window.open(url, '_blank');
  }

  return (
    <div className="site-shell admin-shell">
      <header className="topbar admin-topbar">
        <button type="button" className="brand admin-brand" onClick={() => navigate('/') }>
          <img className="brand-mark brand-logo-image" src="/assets/logo.png" alt="Ramakrishna Sarada Mission logo" />
          <span className="brand-copy">
            <strong>Ramakrishna Sarada Mission, Delhi</strong>
            <small>Admin Dashboard</small>
          </span>
        </button>
        <div className="topnav">
          <button
            type="button"
            className={`ghost-btn ${adminSection === 'home' ? 'active-tab' : ''}`}
            onClick={() => navigate('/admin')}
          >
            Home
          </button>
          <button
            type="button"
            className={`ghost-btn ${adminSection === 'donations' ? 'active-tab' : ''}`}
            onClick={() => navigate('/admin/donations')}
          >
            Donations
          </button>
          <button
            type="button"
            className={`ghost-btn ${adminSection === 'events' ? 'active-tab' : ''}`}
            onClick={() => navigate('/admin/events')}
          >
            Events Registration
          </button>
          <button type="button" className="ghost-btn" onClick={logoutAdmin}>
            Lock
          </button>
          <button type="button" className="ghost-btn" onClick={() => navigate('/')}>
            Public Site
          </button>
        </div>
      </header>

      {adminSection === 'home' ? (
        <>
          <section className="stats-grid">
            <article className="panel stat-card">
              <span>Pending Donations</span>
              <strong>{summary.totals.pendingDonations || 0}</strong>
            </article>
            <article className="panel stat-card">
              <span>Confirmed Donations</span>
              <strong>{summary.totals.confirmedDonations || 0}</strong>
            </article>
            <article className="panel stat-card">
              <span>Upcoming Events</span>
              <strong>{upcomingEvents.length}</strong>
            </article>
            <article className="panel stat-card">
              <span>Past Events</span>
              <strong>{pastEvents.length}</strong>
            </article>
          </section>

          <section className="info-grid">
            <article className="panel">
              <p className="eyebrow">Ramakrishna Sarada Mission, Delhi</p>
              <h2>Verify and manage donor records</h2>
              <p>Use the donation tab to review records, cancel donations when needed, issue receipts, and export data.</p>
              <button type="button" className="primary-btn" onClick={() => navigate('/admin/donations')}>
                Open Donations
              </button>
            </article>
            <article className="panel">
              <p className="eyebrow">Events Registration</p>
              <h2>Add events and connect Google Forms</h2>
              <p>Use the events tab to publish upcoming events and view registrations from linked Google Sheets.</p>
              <button type="button" className="primary-btn" onClick={() => navigate('/admin/events')}>
                Open Events Registration
              </button>
            </article>
            <article className="panel">
              <p className="eyebrow">Live Status</p>
              <h2>Shared backend status</h2>
              <p>{status}</p>
            </article>
          </section>

          <section className="panel">
            <p className="eyebrow">Homepage Notice Board</p>
            <h2>Post updates to the public homepage</h2>
            <div className="form-grid">
              <label className="full-width">
                Notice message
                <textarea
                  value={homeNoticeMessage}
                  onChange={(event) => setHomeNoticeMessage(event.target.value)}
                  rows="3"
                  placeholder="Write a notice for the homepage board..."
                />
              </label>
              <button
                type="button"
                className="primary-btn"
                disabled={isNoticeSubmitting || !homeNoticeMessage.trim()}
                onClick={() => handleNoticeSubmit('home')}
              >
                {isNoticeSubmitting ? 'Posting...' : 'Post Homepage Notice'}
              </button>
            </div>
            <div className="stack notice-admin-list">
              {homeNotices.length > 0 ? (
                homeNotices.map((notice) => (
                  <div key={notice.id} className="panel compact notice-admin-card">
                    <strong>{notice.message}</strong>
                    <span>{formatNoticeDateTime(notice.createdAt)}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">No homepage notices yet.</div>
              )}
            </div>
          </section>
        </>
      ) : null}

      {adminSection === 'donations' ? (
        <>
          <section className="admin-grid">
            <article className="panel">
              <p className="eyebrow">Manual Entry</p>
              <h2>Add an already received donation</h2>
              <form className="form-grid" onSubmit={submitAdminDonation}>
                <label>
                  Donor Name
                  <input name="donorName" value={adminForm.donorName} onChange={updateDonationField} required />
                </label>
                <label>
                  Donation Date
                  <input
                    name="donationDate"
                    type="date"
                    value={adminForm.donationDate}
                    onChange={updateDonationField}
                    required
                  />
                </label>
                <label>
                  Email
                  <input name="email" type="email" value={adminForm.email} onChange={updateDonationField} />
                </label>
                <label>
                  Phone
                  <input name="phone" value={adminForm.phone} onChange={updateDonationField} />
                </label>
                <label className="full-width">
                  Address
                  <textarea name="address" value={adminForm.address} onChange={updateDonationField} rows="2" />
                </label>
                <label>
                  Place
                  <input name="place" value={adminForm.place} onChange={updateDonationField} />
                </label>
                <label>
                  PAN Number
                  <input name="panNumber" value={adminForm.panNumber} onChange={updateDonationField} />
                </label>
                <label>
                  Payment Method
                  <select name="paymentMethod" value={adminForm.paymentMethod} onChange={updateDonationField}>
                    <option>Cash</option>
                    <option>UPI / QR</option>
                    <option>Bank Transfer</option>
                  </select>
                </label>
                <label>
                  Purpose
                  <select name="purpose" value={adminForm.purpose} onChange={updateDonationField}>
                    {donationPurposeGroups.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map((option) => {
                          const value = `${group.label} - ${option}`;
                          return (
                            <option key={value} value={value}>
                              {option}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label>
                  Amount
                  <input
                    name="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={adminForm.amount}
                    onChange={updateDonationField}
                    required
                  />
                </label>
                <label>
                  Transaction Reference
                  <input
                    name="transactionReference"
                    value={adminForm.transactionReference}
                    onChange={updateDonationField}
                  />
                </label>
                <label className="full-width">
                  Notes
                  <textarea name="notes" value={adminForm.notes} onChange={updateDonationField} rows="3" />
                </label>
                <button type="submit" className="primary-btn" disabled={isAdminSubmitting}>
                  {isAdminSubmitting ? 'Saving...' : 'Save Confirmed Donation'}
                </button>
              </form>
            </article>

            <article className="panel">
              <p className="eyebrow">Selected Donation</p>
              <h2>Preview receipt and declaration</h2>
              <div className="toolbar receipt-actions-toolbar">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={downloadReceipt}
                  disabled={!selectedDonation || !isActiveDonation(selectedDonation)}
                  aria-label="Download Receipt"
                  title="Download Receipt"
                >
                  <svg className="button-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M12 3v10m0 0 4-4m-4 4-4-4M5 17h14v3H5z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={printReceipt}
                  disabled={!selectedDonation || !isActiveDonation(selectedDonation)}
                  aria-label="Print Receipt"
                  title="Print Receipt"
                >
                  <svg className="button-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M7 8V4h10v4M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 13h10v7H7z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={printDeclaration}
                  disabled={!selectedDonation || !selectedDonation.isCorpusFund || !isActiveDonation(selectedDonation)}
                >
                  Print Declaration
                </button>
              </div>
              {selectedDonation ? (
                <div className="stack">
                  <div className="receipt-card" ref={receiptRef}>
                    <p className="eyebrow">Receipt Preview</p>
                    <h3>{organisation.name}</h3>
                    <div className="badge-row">
                      <span className={`status-pill ${getDonationStatus(selectedDonation).toLowerCase()}`}>
                        {getDonationStatus(selectedDonation)}
                      </span>
                      <span className="status-pill source">{selectedDonation.source}</span>
                    </div>
                    <div className="receipt-grid">
                      <div>
                        <span>Donation ID</span>
                        <strong>{selectedDonation.donationId}</strong>
                      </div>
                      <div>
                        <span>Receipt Number</span>
                        <strong>{selectedDonation.receiptNumber || 'Pending verification'}</strong>
                      </div>
                      <div>
                        <span>Donor Name</span>
                        <strong>{selectedDonation.donorName}</strong>
                      </div>
                      <div>
                        <span>Donation Date</span>
                        <strong>{selectedDonation.donationDate}</strong>
                      </div>
                      <div>
                        <span>Purpose</span>
                        <strong>{selectedDonation.purpose}</strong>
                      </div>
                      <div>
                        <span>Amount</span>
                        <strong>{currency.format(normalizeAmount(selectedDonation.amount))}</strong>
                      </div>
                    </div>
                    {getDonationStatus(selectedDonation) === 'Cancelled' && selectedDonation.cancellationReason ? (
                      <p className="cancellation-note">
                        Cancelled reason: <strong>{selectedDonation.cancellationReason}</strong>
                      </p>
                    ) : null}
                  </div>
                  <div className="receipt-card declaration-card" ref={declarationRef}>
                    <p className="eyebrow">Corpus Declaration</p>
                    <h3>{organisation.name}</h3>
                    {selectedDonation.isCorpusFund && isActiveDonation(selectedDonation) ? (
                      <p>
                        Corpus declaration number: <strong>{selectedDonation.corpusDeclarationNumber}</strong>
                      </p>
                    ) : (
                      <p className="empty-state compact">Available after a confirmed corpus donation is selected.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-state">Select a donation from the tables below.</div>
              )}
            </article>
          </section>

          <section className="panel">
            <div className="section-row">
              <div>
                <p className="eyebrow">All Records</p>
                <h2>Search across public and admin donations</h2>
              </div>
              <div className="toolbar">
                <select value={verificationFilter} onChange={(event) => setVerificationFilter(event.target.value)}>
                  <option value="">All statuses</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
                  <option value="">All years</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <input
                  className="search-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search donor, reference, receipt, purpose..."
                />
                <button type="button" className="secondary-btn" onClick={exportSummary}>
                  Export Summary
                </button>
                <button type="button" className="secondary-btn" onClick={exportWorkbook}>
                  Export Excel
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Donation ID</th>
                    <th>Receipt</th>
                    <th>Donor</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>More</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonations.length > 0 ? (
                    filteredDonations.map((donation) => (
                      <tr key={donation.submissionId}>
                        <td>{donation.donationId}</td>
                        <td>{donation.receiptNumber || '-'}</td>
                        <td>{donation.donorName}</td>
                        <td>{getDonationStatus(donation)}</td>
                        <td>{donation.source}</td>
                        <td>{donation.donationDate}</td>
                        <td>{currency.format(normalizeAmount(donation.amount))}</td>
                        <td>
                          <div className="row-menu-wrap">
                            <button
                              type="button"
                              className="table-btn row-menu-trigger"
                              onClick={() =>
                                setOpenDonationMenuId(
                                  openDonationMenuId === donation.submissionId ? '' : donation.submissionId,
                                )
                              }
                              aria-label="Open donation actions"
                            >
                              ⋯
                            </button>
                            {openDonationMenuId === donation.submissionId ? (
                              <div className="row-menu" role="menu">
                                <button
                                  type="button"
                                  className="row-menu-item danger"
                                  onClick={() => openCancelDonationModal(donation)}
                                >
                                  Cancel donation
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button type="button" className="table-btn" onClick={() => viewDonation(donation)}>
                              View
                            </button>
                            <button
                              type="button"
                              className="table-btn"
                              onClick={() => printDonationReceipt(donation)}
                              disabled={!isActiveDonation(donation)}
                            >
                              Print
                            </button>
                            <button
                              type="button"
                              className="table-btn"
                              onClick={() => downloadDonationReceipt(donation)}
                              disabled={!isActiveDonation(donation)}
                            >
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="empty-cell">
                        No donations match the active filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {cancelDonationTarget ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setCancelDonationTarget(null)}>
          <div className="cancel-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">Cancel Donation</p>
            <h2>Provide a cancellation reason</h2>
            <p className="helper-text">
              This donation will remain in the records, but it will be excluded from totals and summary counts.
            </p>
            <form className="admin-access-form" onSubmit={handleCancelDonationSubmit}>
              <div className="cancel-summary">
                <span>
                  <strong>Donation:</strong> {cancelDonationTarget.donationId || cancelDonationTarget.submissionId}
                </span>
                <span>
                  <strong>Donor:</strong> {cancelDonationTarget.donorName}
                </span>
              </div>
              <label>
                Reason for cancellation
                <textarea
                  value={cancellationReason}
                  onChange={(event) => setCancellationReason(event.target.value)}
                  rows="4"
                  placeholder="Explain why this donation is being cancelled"
                  autoFocus
                />
              </label>
              <div className="toolbar">
                <button type="submit" className="warning-btn" disabled={isCancellingDonation || !cancellationReason.trim()}>
                  {isCancellingDonation ? 'Cancelling...' : 'Cancel Donation'}
                </button>
                <button type="button" className="secondary-btn" onClick={() => setCancelDonationTarget(null)}>
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {adminSection === 'events' ? (
        <>
          <section className="panel">
            <article>
              <p className="eyebrow">Add Event</p>
              <h2>Create upcoming or past events</h2>
              <form className="form-grid" onSubmit={submitEvent}>
                <label>
                  Event Title
                  <input name="title" value={eventForm.title} onChange={updateEventField} required />
                </label>
                <label>
                  Location
                  <input name="location" value={eventForm.location} onChange={updateEventField} />
                </label>
                <label>
                  Start Date
                  <input name="startDate" type="date" value={eventForm.startDate} onChange={updateEventField} required />
                </label>
                <label>
                  End Date
                  <input name="endDate" type="date" value={eventForm.endDate} onChange={updateEventField} />
                </label>
                <label className="full-width">
                  Description
                  <textarea name="description" value={eventForm.description} onChange={updateEventField} rows="3" />
                </label>
                <label className="full-width">
                  Google Form URL
                  <input name="googleFormUrl" value={eventForm.googleFormUrl} onChange={updateEventField} />
                </label>
                <label className="full-width">
                  Google Sheet CSV URL for Registrations
                  <input
                    name="registrationsSheetUrl"
                    value={eventForm.registrationsSheetUrl}
                    onChange={updateEventField}
                  />
                </label>
                <button type="submit" className="primary-btn" disabled={isEventSubmitting}>
                  {isEventSubmitting ? 'Saving...' : 'Save Event'}
                </button>
              </form>
            </article>
          </section>

          <section className="panel">
            <p className="eyebrow">Events Notice Board</p>
            <h2>Post updates to the public events page</h2>
            <div className="form-grid">
              <label className="full-width">
                Notice message
                <textarea
                  value={eventNoticeMessage}
                  onChange={(event) => setEventNoticeMessage(event.target.value)}
                  rows="3"
                  placeholder="Write a notice for the events page..."
                />
              </label>
              <button
                type="button"
                className="primary-btn"
                disabled={isNoticeSubmitting || !eventNoticeMessage.trim()}
                onClick={() => handleNoticeSubmit('events')}
              >
                {isNoticeSubmitting ? 'Posting...' : 'Post Events Notice'}
              </button>
            </div>
            <div className="stack notice-admin-list">
              {eventNotices.length > 0 ? (
                eventNotices.map((notice) => (
                  <div key={notice.id} className="panel compact notice-admin-card">
                    <strong>{notice.message}</strong>
                    <span>{formatNoticeDateTime(notice.createdAt)}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">No event notices yet.</div>
              )}
            </div>
          </section>

          <section className="panel registrations-panel">
            <div className="section-row">
              <div>
                <p className="eyebrow">Selected Event</p>
                <h2>View registrations in table format</h2>
              </div>
              {selectedEvent ? (
                <>
                  <div className="registrations-meta">
                    <span className="status-pill source">
                      {eventRegistrations.length} registration{eventRegistrations.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
            {selectedEvent ? (
              <>
                <div className="event-card event-summary-card">
                    <span className="status-pill source">{selectedEvent.status}</span>
                    <h3>{selectedEvent.title}</h3>
                    <p>{selectedEvent.description || 'No description added yet.'}</p>
                    <p>
                      <strong>Date:</strong> {selectedEvent.startDate}
                    </p>
                    <p>
                      <strong>Location:</strong> {selectedEvent.location || 'Not specified'}
                    </p>
                    <div className="toolbar">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => loadEventRegistrations(selectedEvent.id)}
                      >
                        Load Registrations
                      </button>
                      {selectedEvent.googleFormUrl ? (
                        <a className="secondary-btn event-link" href={selectedEvent.googleFormUrl} target="_blank" rel="noreferrer">
                          Open Google Form
                        </a>
                      ) : null}
                    </div>
                </div>
                <p className="helper-text">{eventRegistrationMessage}</p>
                <div className="table-wrap registrations-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {eventRegistrations[0]
                          ? Object.keys(eventRegistrations[0]).map((key) => <th key={key}>{key}</th>)
                          : <th>Registrations</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {eventRegistrations.length > 0 ? (
                        eventRegistrations.map((row, index) => (
                          <tr key={`${selectedEvent.id}-${index}`}>
                            {Object.values(row).map((value, valueIndex) => (
                              <td key={`${selectedEvent.id}-${index}-${valueIndex}`}>{String(value)}</td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="empty-cell">No registration rows available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="empty-state">Select an event from below to view registrations.</div>
            )}
          </section>

          <section className="events-layout">
            <article className="panel">
              <p className="eyebrow">Upcoming Events</p>
              <h2>Events currently open or upcoming</h2>
              <div className="event-grid">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <button
                      type="button"
                      key={event.id}
                      className="event-card event-button"
                      onClick={() => {
                        setSelectedEvent(event);
                        loadEventRegistrations(event.id);
                      }}
                    >
                      <span className="status-pill pending">{event.status}</span>
                      <h3>{event.title}</h3>
                      <p>{event.startDate}</p>
                      <p>{event.location || 'No location yet'}</p>
                    </button>
                  ))
                ) : (
                  <div className="empty-state">No upcoming events yet.</div>
                )}
              </div>
            </article>
            <article className="panel">
              <p className="eyebrow">Past Events</p>
              <h2>Event archive</h2>
              <div className="event-grid">
                {pastEvents.length > 0 ? (
                  pastEvents.map((event) => (
                    <button
                      type="button"
                      key={event.id}
                      className="event-card event-button past-card"
                      onClick={() => {
                        setSelectedEvent(event);
                        loadEventRegistrations(event.id);
                      }}
                    >
                      <span className="status-pill source">{event.status}</span>
                      <h3>{event.title}</h3>
                      <p>{event.startDate}</p>
                      <p>{event.location || 'No location yet'}</p>
                    </button>
                  ))
                ) : (
                  <div className="empty-state">No past events yet.</div>
                )}
              </div>
            </article>
          </section>
        </>
      ) : null}

      <footer className="site-footer">
        <span>{organisation.name} Admin</span>
        <span>{status}</span>
      </footer>
    </div>
  );
}

export default AdminSite;
