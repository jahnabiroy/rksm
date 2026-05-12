import { useEffect, useMemo, useRef, useState } from 'react';
import PublicSite from './PublicSite';
import AdminSite from './AdminSite';
import { adminEmptyForm, eventEmptyForm, publicEmptyForm } from './constants';
import { normalizeAmount, pathnameIsAdmin } from './utils';

function getPathname() {
  return window.location.pathname || '/';
}

function getSearch() {
  return window.location.search || '';
}

function App() {
  const [pathname, setPathname] = useState(getPathname());
  const [searchString, setSearchString] = useState(getSearch());
  const [adminAuthorized, setAdminAuthorized] = useState(
    () => window.sessionStorage.getItem('admin-access') === 'granted',
  );
  const [pendingAdminPath, setPendingAdminPath] = useState('/admin');
  const [donations, setDonations] = useState([]);
  const [summary, setSummary] = useState({ totals: {}, daily: [], yearly: [] });
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [status, setStatus] = useState('Loading records...');
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventRegistrations, setEventRegistrations] = useState([]);
  const [eventRegistrationMessage, setEventRegistrationMessage] = useState('');
  const [receiptGeneratedAt, setReceiptGeneratedAt] = useState('');
  const [publicForm, setPublicForm] = useState(publicEmptyForm);
  const [adminForm, setAdminForm] = useState(adminEmptyForm);
  const [eventForm, setEventForm] = useState(eventEmptyForm);
  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [isPublicSubmitting, setIsPublicSubmitting] = useState(false);
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);
  const [isEventSubmitting, setIsEventSubmitting] = useState(false);
  const [isNoticeSubmitting, setIsNoticeSubmitting] = useState(false);
  const [latestSubmission, setLatestSubmission] = useState(null);
  const [isInquirySubmitting, setIsInquirySubmitting] = useState(false);
  const receiptRef = useRef(null);
  const declarationRef = useRef(null);

  const availableYears = useMemo(() => {
    const years = new Set(
      donations.map((donation) => String(donation.donationDate || donation.createdAt).slice(0, 4)),
    );
    return Array.from(years).filter(Boolean).sort((a, b) => b.localeCompare(a));
  }, [donations]);

  const pendingDonations = useMemo(
    () => donations.filter((donation) => donation.verificationStatus === 'Pending'),
    [donations],
  );

  const upcomingEvents = useMemo(
    () => events.filter((event) => event.status === 'Upcoming'),
    [events],
  );

  const pastEvents = useMemo(() => events.filter((event) => event.status === 'Past'), [events]);
  const homeNotices = useMemo(() => notices.filter((notice) => notice.page === 'home'), [notices]);
  const eventNotices = useMemo(() => notices.filter((notice) => notice.page === 'events'), [notices]);

  async function loadCoreData(message = 'Records loaded.') {
    const [donationsResponse, summaryResponse, eventsResponse, noticesResponse] = await Promise.all([
      fetch('/api/donations'),
      fetch('/api/summary'),
      fetch('/api/events'),
      fetch('/api/notices'),
    ]);
    const [donationsData, summaryData, eventsData, noticesData] = await Promise.all([
      donationsResponse.json(),
      summaryResponse.json(),
      eventsResponse.json(),
      noticesResponse.json(),
    ]);
    setDonations(donationsData);
    setSummary(summaryData);
    setEvents(eventsData);
    setNotices(noticesData);
    setStatus(message);
  }

  useEffect(() => {
    loadCoreData().catch(() => setStatus('Unable to load records right now.'));
  }, []);

  useEffect(() => {
    const handleNavigation = () => setPathname(getPathname());
    const handleSearch = () => setSearchString(getSearch());
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('popstate', handleSearch);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('popstate', handleSearch);
    };
  }, []);

  function navigate(nextPath) {
    const nextUrl = new URL(nextPath, window.location.origin);
    window.history.pushState({}, '', `${nextUrl.pathname}${nextUrl.search}`);
    setPathname(nextUrl.pathname);
    setSearchString(nextUrl.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    if (pathnameIsAdmin(pathname) && !adminAuthorized) {
      setPendingAdminPath(`${pathname}${searchString}`);
      window.history.replaceState({}, '', '/');
      setPathname('/');
      setSearchString('');
      setStatus('Enter the admin password to access the portal.');
    }
  }, [pathname, searchString, adminAuthorized]);

  useEffect(() => {
    if (pathname !== '/admin/donations' || !searchString || donations.length === 0) {
      return;
    }

    const params = new URLSearchParams(searchString);
    const donationId = params.get('donation');
    if (!donationId) {
      return;
    }

    const matchedDonation = donations.find(
      (donation) => donation.submissionId === donationId || donation.donationId === donationId,
    );

    if (matchedDonation) {
      setSelectedDonation(matchedDonation);
    }
  }, [pathname, searchString, donations]);

  async function loadEventRegistrations(eventId) {
    try {
      const response = await fetch(`/api/events/${eventId}/registrations`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to load registrations.');
      }
      setSelectedEvent(data.event);
      setEventRegistrations(data.rows || []);
      setEventRegistrationMessage(data.message || '');
      setStatus(`Loaded registrations for ${data.event.title}.`);
    } catch (error) {
      setEventRegistrations([]);
      setEventRegistrationMessage(error.message);
      setStatus(error.message);
    }
  }

  async function submitPublicDonation(event) {
    event.preventDefault();
    setIsPublicSubmitting(true);
    try {
      const response = await fetch('/api/public-donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...publicForm, amount: normalizeAmount(publicForm.amount) }),
      });
      const donation = await response.json();
      if (!response.ok) {
        throw new Error(donation.message || 'Unable to submit donation request.');
      }
      setLatestSubmission(donation);
      setPublicForm({ ...publicEmptyForm, donationDate: new Date().toISOString().slice(0, 10) });
      await loadCoreData('Donation request submitted and confirmed.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsPublicSubmitting(false);
    }
  }

  async function requestAdminAccess(password) {
    try {
      const response = await fetch('/api/admin-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to open admin portal.');
      }

      window.sessionStorage.setItem('admin-access', 'granted');
      setAdminAuthorized(true);
      navigate(pendingAdminPath || '/admin');
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async function submitInquiry(inquiryForm) {
    setIsInquirySubmitting(true);
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inquiryForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to send enquiry right now.');
      }
      return { success: true, message: data.message || 'Your enquiry has been sent successfully.' };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setIsInquirySubmitting(false);
    }
  }

  function logoutAdmin() {
    window.sessionStorage.removeItem('admin-access');
    setAdminAuthorized(false);
    setPendingAdminPath('/admin');
    navigate('/');
  }

  async function submitAdminDonation(event) {
    event.preventDefault();
    setIsAdminSubmitting(true);
    try {
      const response = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...adminForm, amount: normalizeAmount(adminForm.amount) }),
      });
      const donation = await response.json();
      if (!response.ok) {
        throw new Error(donation.message || 'Unable to save donation.');
      }
      setSelectedDonation(donation);
      setReceiptGeneratedAt(new Date().toLocaleString('en-IN'));
      setAdminForm({ ...adminEmptyForm, donationDate: new Date().toISOString().slice(0, 10) });
      await loadCoreData('Donation saved as confirmed.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsAdminSubmitting(false);
    }
  }

  async function submitEvent(event) {
    event.preventDefault();
    setIsEventSubmitting(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to save event.');
      }
      setEventForm(eventEmptyForm);
      setSelectedEvent(data);
      setEventRegistrations([]);
      setEventRegistrationMessage('Select or refresh registrations after linking the Google Sheet CSV URL.');
      await loadCoreData(`Event ${data.title} saved.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsEventSubmitting(false);
    }
  }

  async function submitNotice(page, message) {
    setIsNoticeSubmitting(true);
    try {
      const response = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page, message }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to save notice.');
      }
      await loadCoreData(`Notice added to ${page} page.`);
      return { success: true };
    } catch (error) {
      setStatus(error.message);
      return { success: false, message: error.message };
    } finally {
      setIsNoticeSubmitting(false);
    }
  }

  async function updateDonationStatus(submissionId, action, payload = {}) {
    try {
      const response = await fetch(`/api/donations/${submissionId}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const donation = await response.json();
      if (!response.ok) {
        throw new Error(donation.message || 'Unable to update donation.');
      }
      setSelectedDonation(donation);
      setReceiptGeneratedAt(new Date().toLocaleString('en-IN'));
      await loadCoreData(`Donation ${submissionId} updated.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  if (pathnameIsAdmin(pathname)) {
    return (
      <AdminSite
        pathname={pathname}
        navigate={navigate}
        status={status}
        summary={summary}
        donations={donations}
        selectedDonation={selectedDonation}
        setSelectedDonation={setSelectedDonation}
        adminForm={adminForm}
        setAdminForm={setAdminForm}
        submitAdminDonation={submitAdminDonation}
        isAdminSubmitting={isAdminSubmitting}
        updateDonationStatus={updateDonationStatus}
        search={search}
        setSearch={setSearch}
        verificationFilter={verificationFilter}
        setVerificationFilter={setVerificationFilter}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        availableYears={availableYears}
        receiptGeneratedAt={receiptGeneratedAt}
        receiptRef={receiptRef}
        declarationRef={declarationRef}
        events={events}
        upcomingEvents={upcomingEvents}
        pastEvents={pastEvents}
        eventForm={eventForm}
        setEventForm={setEventForm}
        submitEvent={submitEvent}
        isEventSubmitting={isEventSubmitting}
        selectedEvent={selectedEvent}
        setSelectedEvent={setSelectedEvent}
        loadEventRegistrations={loadEventRegistrations}
        eventRegistrations={eventRegistrations}
        eventRegistrationMessage={eventRegistrationMessage}
        logoutAdmin={logoutAdmin}
        homeNotices={homeNotices}
        eventNotices={eventNotices}
        submitNotice={submitNotice}
        isNoticeSubmitting={isNoticeSubmitting}
      />
    );
  }

  return (
    <PublicSite
      pathname={pathname}
      navigate={navigate}
      summary={summary}
      status={status}
      publicForm={publicForm}
      setPublicForm={setPublicForm}
      submitPublicDonation={submitPublicDonation}
      isPublicSubmitting={isPublicSubmitting}
      latestSubmission={latestSubmission}
      upcomingEvents={upcomingEvents}
      pastEvents={pastEvents}
      homeNotices={homeNotices}
      eventNotices={eventNotices}
      requestAdminAccess={requestAdminAccess}
      submitInquiry={submitInquiry}
      isInquirySubmitting={isInquirySubmitting}
    />
  );
}

export default App;
