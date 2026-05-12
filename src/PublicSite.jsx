import { useEffect, useState } from 'react';
import { donationPurposeGroups, organisation, publicEmptyForm } from './constants';

function PublicSite({
  pathname,
  navigate,
  summary,
  status,
  publicForm,
  setPublicForm,
  submitPublicDonation,
  isPublicSubmitting,
  latestSubmission,
  upcomingEvents,
  pastEvents,
  homeNotices,
  eventNotices,
  requestAdminAccess,
  submitInquiry,
  isInquirySubmitting,
}) {
  const publicSection = pathname === '/events' ? 'events' : pathname === '/' ? 'home' : 'donations';
  const [isAdminPromptOpen, setIsAdminPromptOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [inquiryStatus, setInquiryStatus] = useState('');
  const carouselIntervalMs = 10000;

  function updateField(event) {
    const { name, value, checked, type } = event.target;
    setPublicForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleAdminAccess(event) {
    event.preventDefault();
    setIsCheckingAdmin(true);
    const result = await requestAdminAccess(adminPassword);
    if (!result.success) {
      setAdminError(result.message || 'Incorrect password.');
      setIsCheckingAdmin(false);
      return;
    }

    setAdminPassword('');
    setAdminError('');
    setIsCheckingAdmin(false);
    setIsAdminPromptOpen(false);
  }

  function updateInquiryField(event) {
    const { name, value } = event.target;
    setInquiryForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleInquirySubmit(event) {
    event.preventDefault();
    const result = await submitInquiry(inquiryForm);
    setInquiryStatus(result.message);
    if (!result.success) {
      return;
    }

    setInquiryForm({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    });
  }

  const heroSlides = [
    {
      title: 'Ramakrishna Sarada Mission Building',
      subtitle: 'The Mission campus at Hauz Khas, New Delhi',
      imageClass: 'slide-school',
      kind: 'image',
    },
    {
      title: 'Mission Entrance',
      subtitle: 'A short look at the Mission entrance and welcoming approach',
      kind: 'video',
      src: '/assets/entrance.mp4',
      imageClass: 'slide-entrance',
    },
    {
      title: 'Celebration and Prayer',
      subtitle: 'A devotional celebration in prayer and worship',
      imageClass: 'slide-assembly',
      kind: 'image',
    },
    {
      title: 'Cultural Celebration',
      subtitle: 'A cultural celebration of major festivals like Durga Puja and other devotional gatherings',
      imageClass: 'slide-cultural',
      kind: 'image',
    },
  ];

  const donationHighlights = [
    {
      title: 'General',
      text: 'Ashram maintenance, land and building, and capital reserve fund.',
    },
    {
      title: 'Educational',
      text: 'Educational health, refreshment, and scholarship stipend.',
    },
    {
      title: 'School',
      text: 'School maintenance and school scholarship.',
    },
  ];

  const activityCards = [
    {
      title: 'Vivekananda Balmandir',
      imageClass: 'activity-library',
      description:
        'Started for children in the 8 to 14 age group, Vivekananda Balmandir introduces young learners to scriptures, stories, music, recitation, dramatics, and the history and traditions of the country. Classes are conducted on Sunday afternoons by the monastic sisters, and the project also maintains a multilingual library to support this value-based cultural education.',
    },
    {
      title: 'Sarada Mandir',
      imageClass: 'activity-guidance',
      description:
        'Sarada Mandir was started for financially needy girls from the nearby Shahpurjat area. Students from classes V to XII studying in government schools receive free coaching in English, Science, and Mathematics, while also being encouraged through music, elocution, dramatics, and competitions. Alongside academic support, the Mission provides food, clothes, medicines, uniforms, and fee support to help the girls continue their studies with dignity.',
    },
    {
      title: "Balwadi, Women's Training, and Welfare",
      imageClass: 'activity-welfare',
      description:
        'The Chandramani Balwadi supports children from economically weaker sections with reading and writing classes, regular tiffin, and seasonal essentials such as blankets and clothing. Alongside this, the centre runs adult education as well as tailoring and knitting classes for women and girls from nearby localities, while also extending regular help to needy and meritorious students and providing welfare assistance in the form of food, clothes, and medicines.',
    },
  ];

  const featuredUpcomingEvent = upcomingEvents[0] || null;
  const featuredEventSlides = [
    {
      title: featuredUpcomingEvent?.title || 'Upcoming Retreats',
      subtitle:
        featuredUpcomingEvent?.description ||
        'Explore spiritual retreats, community gatherings, and public programmes at the Mission.',
      imageClass: 'event-slide-retreat',
      kind: 'image',
    },
    {
      title: 'Community Programmes',
      subtitle: 'Events create space for prayer, learning, participation, and shared reflection.',
      imageClass: 'event-slide-community',
      kind: 'image',
    },
    {
      title: 'Events And Celebrations',
      subtitle: 'A glimpse of event gatherings, devotional celebrations, and shared Mission moments.',
      imageClass: 'event-slide-registration',
      kind: 'video',
      src: '/assets/event.mp4',
    },
  ];
  const displayHomeNotices = homeNotices.length
    ? homeNotices
    : [
        {
          id: 'home-default-1',
          message: 'Visitors are requested to check event details and registration links before travelling.',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'home-default-2',
          message: 'Donation confirmations are issued immediately after submission and email delivery.',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'home-default-3',
          message: 'For programme-related questions, please use the enquiry form or contact the Mission directly.',
          createdAt: new Date().toISOString(),
        },
      ];

  const displayEventNotices = eventNotices.length
    ? eventNotices
    : [
        {
          id: 'events-default-1',
          message: featuredUpcomingEvent
            ? `Upcoming listing: ${featuredUpcomingEvent.title} on ${featuredUpcomingEvent.startDate}.`
            : 'New programme announcements will appear here when events are scheduled.',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'events-default-2',
          message: 'Registration links may open through Google Forms for selected programmes.',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'events-default-3',
          message: 'Past event cards remain visible below for reference.',
          createdAt: new Date().toISOString(),
        },
      ];

  function formatNoticeDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((value) => (value + 1) % heroSlides.length);
    }, carouselIntervalMs);

    return () => window.clearInterval(timer);
  }, [carouselIntervalMs, heroSlides.length]);

  return (
    <div className="site-shell">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => navigate('/')}>
          <img className="brand-mark brand-logo-image" src="/assets/logo.png" alt="Ramakrishna Sarada Mission logo" />
          <span className="brand-copy">
            <strong>{organisation.name}</strong>
            <small>New Delhi Centre</small>
          </span>
        </button>
        <nav className="topnav">
          <button
            type="button"
            className={`ghost-btn ${publicSection === 'home' ? 'active-tab' : ''}`}
            onClick={() => navigate('/')}
          >
            Home
          </button>
          <button
            type="button"
            className={`ghost-btn ${publicSection === 'donations' ? 'active-tab' : ''}`}
            onClick={() => navigate('/donations')}
          >
            Donations
          </button>
          <button
            type="button"
            className={`ghost-btn ${publicSection === 'events' ? 'active-tab' : ''}`}
            onClick={() => navigate('/events')}
          >
            Event Registration
          </button>
        </nav>
      </header>

      {publicSection === 'home' ? (
        <>
          <section className="hero-carousel panel">
            <div className={`carousel-visual ${heroSlides[currentSlide].imageClass}`}>
              {heroSlides[currentSlide].kind === 'video' ? (
                <video className="carousel-video" src={heroSlides[currentSlide].src} autoPlay muted loop playsInline />
              ) : null}
              <div className="carousel-overlay">
                <p className="eyebrow">Centre Glimpses</p>
                <h2>{heroSlides[currentSlide].title}</h2>
                <p>{heroSlides[currentSlide].subtitle}</p>
              </div>
            </div>
            <div className="carousel-dots" aria-label="Homepage image carousel">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Show ${slide.title}`}
                />
              ))}
            </div>
          </section>

          <section className="public-hero mission-hero">
            <div className="hero-copy-block">
              <p className="eyebrow">Ramakrishna Sarada Mission, New Delhi</p>
              <h1>Ramakrishna Sarada Mission, New Delhi</h1>
              <p className="hero-copy">
                Established in New Delhi in 1970, the centre grew from a Sister Nivedita centenary initiative
                into a serene campus of educational, cultural, and welfare activities for women and children,
                supported by devotees, friends, and well-wishers.
              </p>
              <div className="hero-actions">
                <button type="button" className="primary-btn" onClick={() => navigate('/donations')}>
                  Support the Mission
                </button>
                <button type="button" className="secondary-btn" onClick={() => navigate('/events')}>
                  Explore Events
                </button>
              </div>
            </div>
            <aside className="hero-aside">
              <button type="button" className="hero-stat-card action-card donation-card" onClick={() => navigate('/donations')}>
                <span className="stat-label">Donate Now</span>
                <strong>Support the Mission</strong>
                <p>Contribute towards educational, cultural, and welfare activities at the Delhi centre.</p>
                <span className="card-arrow">Go to donations →</span>
              </button>
              <button type="button" className="hero-stat-card action-card events-card" onClick={() => navigate('/events')}>
                <span className="stat-label">Upcoming Events</span>
                <strong>{featuredUpcomingEvent ? featuredUpcomingEvent.title : 'See our retreats and programmes'}</strong>
                <p>
                  {featuredUpcomingEvent
                    ? `Next listed programme: ${featuredUpcomingEvent.startDate}${featuredUpcomingEvent.location ? ` • ${featuredUpcomingEvent.location}` : ''}`
                    : 'See our upcoming events, retreats, and public programmes.'}
                </p>
                <span className="card-arrow">Explore events →</span>
              </button>
            </aside>
          </section>

          <section className="home-story-grid">
            <article className="panel">
              <p className="eyebrow">About The Centre</p>
              <h2>Founded to nurture women, children, and values-based education</h2>
              <p>
                The Delhi centre was started on 14 April 1970 at Hauz Khas with the aim of spreading cultural
                and spiritual ideals among women and children, irrespective of caste, creed, or financial status.
              </p>
              <p>
                What began with one educational project has grown into a wider network of schooling, coaching,
                value education, welfare support, and community-oriented activities in a calm and welcoming setting.
              </p>
            </article>
            <article className="panel service-panel">
              <p className="eyebrow">Key Activities</p>
              <h2>A centre built around education, guidance, and compassionate support</h2>
              <p>
                The official Delhi-centre profile presents the campus as a hive of activities that steadily grew
                from a single educational effort into several long-running projects for children, girls, women,
                and families in the surrounding communities.
              </p>
              <p>
                These activities combine schooling, coaching, scriptural and cultural learning, women&apos;s
                training, and regular welfare assistance so that education and care move together rather than
                as separate efforts.
              </p>
            </article>
          </section>

          <section className="home-feature-band">
            <article className="panel feature-panel feature-school merged-school-card full-span-school-card">
              <div className="feature-visual school-visual">
                <div className="feature-visual-copy">
                  <p className="eyebrow">Nivedita Vidya Mandir</p>
                  <h2>The school of the Delhi centre</h2>
                </div>
              </div>
              <div className="feature-text">
                <p>
                  Nivedita Vidya Mandir is one of the most visible expressions of the Mission&apos;s educational
                  work in Delhi, bringing together academic instruction, discipline, cultural grounding, and a
                  values-based atmosphere shaped by Sister Nivedita&apos;s ideals.
                </p>
                <p>
                  The centre&apos;s profile describes a school life enriched by patriotic observances, annual
                  celebrations, school functions, and the larger effort to help children grow up with a sense of
                  Indian identity, character, and responsibility. For families who want to explore the school in
                  more detail, the dedicated website is linked below.
                </p>
                <a
                  className="primary-btn inline-link-btn"
                  href="https://www.niveditavidyamandir.in/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit Nivedita Vidya Mandir Website
                </a>
              </div>
            </article>
          </section>

          <section className="home-feature-band">
            <article className="panel feature-panel">
              <div className="feature-visual books-visual">
                <div className="feature-visual-copy">
                  <p className="eyebrow">Publications</p>
                  <h2>Books and magazine desk</h2>
                </div>
              </div>
              <p className="eyebrow">Bookshop And Publications</p>
              <h2>Books, spiritual literature, and publications from the Delhi centre</h2>
              <p>
                The Mission&apos;s bookshop offers major works from Ramakrishna-Vivekananda literature along with
                books on yoga, philosophy, meditation, spiritual life, and reading material for children. This
                gives visitors a continuing way to engage with the ideals of the centre beyond attending the campus.
              </p>
              <p>
                The Delhi centre has also published books in English and Hindi, including titles on Sister
                Nivedita, Sri Ramakrishna, Sri Sarada Devi, and Vedantic thought. That publication work adds a
                strong educational and cultural dimension to the centre&apos;s public role in Delhi.
              </p>
              <p>
                The annual newsletter, Samvit, also shares reflections, updates, and highlights from the centre&apos;s
                work so readers can stay connected with its activities throughout the year.
              </p>
            </article>
            <article className="panel feature-panel">
              <div className="feature-visual culture-visual">
                <div className="feature-visual-copy">
                  <p className="eyebrow">Study Circles</p>
                  <h2>Weekly classes and observances</h2>
                </div>
              </div>
              <p className="eyebrow">Cultural And Spiritual Life</p>
              <h2>Study circles, devotional music, and observances through the year</h2>
              <p>
                The centre also conducts weekly activities for women such as scripture study in English and
                Bengali and devotional music classes. In addition, classes are held in other colonies in Delhi,
                helping the work of the centre reach beyond the immediate campus.
              </p>
              <p>
                Birth anniversaries of Sri Ramakrishna, Sri Sarada Devi, and Swami Vivekananda are observed with
                discourses and discussions, and the centre also marks the lives and teachings of other world
                teachers including Buddha, Mahavir, Shankaracharya, Nanak, and Jesus Christ.
              </p>
              <p>
                These gatherings usually include prayer, reflection, and devotional singing, creating a quieter
                space for learning, fellowship, and steady spiritual practice.
              </p>
            </article>
          </section>

          <section className="activity-grid">
            {activityCards.map((item) => (
              <article key={item.title} className="panel activity-card">
                <div className={`activity-image ${item.imageClass}`} aria-hidden="true" />
                <p className="eyebrow">Programme</p>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </section>

          <section className="home-feature-band">
            <article className="panel feature-panel full-span-contact-card notice-board-panel">
              <p className="eyebrow">Notice Board</p>
              <h2>Important updates for visitors and well-wishers</h2>
              <div className="notice-board-list">
                {displayHomeNotices.map((notice) => (
                  <div key={notice.id} className="notice-item">
                    <span className="notice-dot" aria-hidden="true" />
                    <div>
                      <p>{notice.message}</p>
                      <span className="notice-time">{formatNoticeDateTime(notice.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="home-feature-band">
            <article className="panel feature-panel full-span-contact-card">
              <div className="contact-layout">
                <div className="stack info-stack">
                  <p className="eyebrow">Contact Details</p>
                  <h2>Visit or connect with the Hauz Khas centre</h2>
                  <p>
                    <strong>Address:</strong> C-8A, Hauz Khas, New Delhi - 110016
                  </p>
                  <p>
                    <strong>Phone:</strong> {organisation.phone}
                  </p>
                  <p>
                    <strong>Mission Email:</strong> rksmdelhi@gmail.com
                  </p>
                  <p>
                    <strong>School Email:</strong> rksm.nvm@gmail.com
                  </p>
                  <p>
                    <a
                      className="inline-map-link"
                      href="https://maps.google.com/?q=Ramakrishna+Sarada+Mission+C-8A+Hauz+Khas+New+Delhi+110016"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open location in Google Maps
                    </a>
                  </p>
                </div>
                <div className="map-embed-card">
                  <iframe
                    title="Ramakrishna Sarada Mission, Delhi map"
                    className="map-frame"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src="https://maps.google.com/maps?q=Ramakrishna%20Sarada%20Mission%20C-8A%20Hauz%20Khas%20New%20Delhi%20110016&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  />
                </div>
              </div>
            </article>
          </section>

          <section className="home-feature-band">
            <article className="panel feature-panel full-span-contact-card inquiry-panel">
              <p className="eyebrow">Send An Enquiry</p>
              <h2>Reach out to the Mission</h2>
              <p className="helper-text">
                Use this form for general questions, visit-related queries, programme enquiries, or requests for
                more information.
              </p>
              <form className="form-grid inquiry-form" onSubmit={handleInquirySubmit}>
                <label>
                  Name
                  <input name="name" value={inquiryForm.name} onChange={updateInquiryField} required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" value={inquiryForm.email} onChange={updateInquiryField} required />
                </label>
                <label>
                  Phone
                  <input name="phone" value={inquiryForm.phone} onChange={updateInquiryField} />
                </label>
                <label>
                  Subject
                  <input name="subject" value={inquiryForm.subject} onChange={updateInquiryField} required />
                </label>
                <label className="full-width">
                  Message
                  <textarea
                    name="message"
                    rows="5"
                    value={inquiryForm.message}
                    onChange={updateInquiryField}
                    required
                  />
                </label>
                <button type="submit" className="primary-btn" disabled={isInquirySubmitting}>
                  {isInquirySubmitting ? 'Sending...' : 'Send Query'}
                </button>
              </form>
              {inquiryStatus ? <p className="inquiry-status">{inquiryStatus}</p> : null}
            </article>
          </section>
        </>
      ) : null}

      {publicSection === 'donations' ? (
        <>
          <section className="donation-hero panel">
            <div className="donation-hero-visual">
              <div className="donation-hero-overlay">
                <p className="eyebrow">Support The Mission</p>
                <h2>Every contribution helps sustain service, education, and care.</h2>
                <p>
                    This page lets supporters share their donation details after contributing through bank transfer,
                    UPI, or QR payment. Donations are confirmed immediately after submission and confirmation email.
                </p>
              </div>
            </div>
          </section>

          <section className="donation-story-grid">
            <article className="panel">
              <p className="eyebrow">Where Donations Go</p>
              <h2>General support for the Mission&apos;s work</h2>
              <p>
                Donations help support the Mission&apos;s everyday work in education, service, cultural activities,
                maintenance, and long-term development across the Delhi centre.
              </p>
              <p>
                Choose the category that best matches your contribution and share your donation details so the
                record can be kept accurately.
              </p>
              <p>
                Every contribution, whether large or small, helps the centre continue its activities with steadiness
                and care. These gifts support both the visible work people experience today and the long-term needs
                that keep the Mission active for years ahead.
              </p>
            </article>
            <article className="panel donation-purpose-panel">
              <p className="eyebrow">Giving With Intention</p>
              <h2>You can contribute toward different areas of service</h2>
              <div className="donation-highlight-list">
                {donationHighlights.map((item) => (
                  <div key={item.title} className="donation-highlight-item">
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="donation-layout">
            <article className="panel payment-panel">
              <p className="eyebrow">Payment Instructions</p>
              <h2>Pay outside the website for now</h2>
              <div className="qr-card">
                <div className="qr-placeholder">QR</div>
                <div>
                  <p>Replace this placeholder with the organisation&apos;s actual QR image.</p>
                  <p>Ask the donor to keep their UTR or transaction reference so the admin team can verify it.</p>
                </div>
              </div>
              <ul className="detail-list">
                <li>UPI ID: {organisation.upiId}</li>
                <li>Bank: {organisation.bankName}</li>
                <li>Account Number: {organisation.accountNumber}</li>
                <li>IFSC: {organisation.ifsc}</li>
                <li>Email: {organisation.email}</li>
              </ul>
            </article>

            <article className="panel">
              <p className="eyebrow">Donation Form</p>
              <h2>Submit donation details</h2>
              <form className="form-grid" onSubmit={submitPublicDonation}>
                <label>
                  Donor Name
                  <input name="donorName" value={publicForm.donorName} onChange={updateField} required />
                </label>
                <label>
                  Donation Date
                  <input
                    name="donationDate"
                    type="date"
                    value={publicForm.donationDate}
                    onChange={updateField}
                    required
                  />
                </label>
                <label>
                  Email
                  <input name="email" type="email" value={publicForm.email} onChange={updateField} />
                </label>
                <label>
                  Phone
                  <input name="phone" value={publicForm.phone} onChange={updateField} />
                </label>
                <label className="full-width">
                  Address
                  <textarea name="address" value={publicForm.address} onChange={updateField} rows="2" />
                </label>
                <label>
                  Place
                  <input name="place" value={publicForm.place} onChange={updateField} />
                </label>
                <label>
                  PAN Number
                  <input name="panNumber" value={publicForm.panNumber} onChange={updateField} />
                </label>
                <label>
                  Payment Method
                  <select name="paymentMethod" value={publicForm.paymentMethod} onChange={updateField}>
                    <option>UPI / QR</option>
                    <option>Bank Transfer</option>
                    <option>Cash at Office</option>
                  </select>
                </label>
                <label>
                  Purpose
                  <select name="purpose" value={publicForm.purpose} onChange={updateField}>
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
                    value={publicForm.amount}
                    onChange={updateField}
                    required
                  />
                </label>
                <label>
                  Transaction Reference / UTR
                  <input
                    name="transactionReference"
                    value={publicForm.transactionReference}
                    onChange={updateField}
                  />
                </label>
                <label className="full-width checkbox-row">
                  <input
                    type="checkbox"
                    name="isCorpusFund"
                    checked={publicForm.isCorpusFund}
                    onChange={updateField}
                  />
                  <span>This donation should be recorded as corpus fund</span>
                </label>
                <label className="full-width">
                  Notes
                  <textarea name="notes" value={publicForm.notes} onChange={updateField} rows="3" />
                </label>
                <button type="submit" className="primary-btn" disabled={isPublicSubmitting}>
                  {isPublicSubmitting ? 'Submitting...' : 'Submit Donation Request'}
                </button>
              </form>

              {latestSubmission ? (
                <div className="submission-card">
                  <strong>Submission received</strong>
                  <p>Reference: {latestSubmission.submissionId}</p>
                  <p>Status: {latestSubmission.verificationStatus}</p>
                  <p>Once verified, this record can trigger a confirmation email.</p>
                </div>
              ) : (
              <div className="submission-card muted-card">
                <strong>Ready to donate</strong>
                <p>Submit your donation details here after completing the transfer.</p>
              </div>
            )}
            </article>
          </section>
        </>
      ) : null}

      {publicSection === 'events' ? (
        <>
          <section className="hero-carousel panel">
            <div className={`carousel-visual ${featuredEventSlides[currentSlide].imageClass}`}>
              {featuredEventSlides[currentSlide].kind === 'video' ? (
                <video className="carousel-video event-carousel-video" src={featuredEventSlides[currentSlide].src} autoPlay muted loop playsInline />
              ) : null}
              <div className="carousel-overlay">
                <p className="eyebrow">Events And Retreats</p>
                <h2>{featuredEventSlides[currentSlide].title}</h2>
                <p>{featuredEventSlides[currentSlide].subtitle}</p>
              </div>
            </div>
            <div className="carousel-dots" aria-label="Events page carousel">
              {featuredEventSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Show ${slide.title}`}
                />
              ))}
            </div>
          </section>

          <section className="events-story-grid">
            <article className="panel">
              <p className="eyebrow">About Our Events</p>
              <h2>Programmes that bring people together in learning, devotion, and service</h2>
              <p>
                The events page brings together upcoming retreats, public gatherings, celebrations, and other
                Mission programmes so visitors can see what is happening and register where links are available.
              </p>
              <p>
                Some programmes are devotional or cultural in nature, while others may focus on learning,
                participation, or community connection. This page serves as a simple public window into those
                activities.
              </p>
            </article>
            <article className="panel events-note-panel">
              <p className="eyebrow">Notice Board</p>
              <h2>Current event-related updates</h2>
              <div className="notice-board-list compact-notice-list">
                {displayEventNotices.map((notice) => (
                  <div key={notice.id} className="notice-item">
                    <span className="notice-dot" aria-hidden="true" />
                    <div>
                      <p>{notice.message}</p>
                      <span className="notice-time">{formatNoticeDateTime(notice.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="events-layout">
            <article className="panel">
              <p className="eyebrow">Upcoming Events</p>
              <h2>Register for upcoming programmes</h2>
              <div className="event-grid">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="event-card">
                      <span className="status-pill pending">{event.status}</span>
                      <h3>{event.title}</h3>
                      <p>{event.description || 'Details will be shared by the organisation.'}</p>
                      <p>
                        <strong>Date:</strong> {event.startDate}
                      </p>
                      <p>
                        <strong>Location:</strong> {event.location || 'To be announced'}
                      </p>
                      {event.googleFormUrl ? (
                        <a className="primary-btn event-link" href={event.googleFormUrl} target="_blank" rel="noreferrer">
                          Register Now
                        </a>
                      ) : (
                        <span className="muted-inline">Registration link will be added soon.</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-state">No upcoming events yet.</div>
                )}
              </div>
            </article>

            <article className="panel">
              <p className="eyebrow">Past Events</p>
              <h2>Recently completed events</h2>
              <div className="event-grid">
                {pastEvents.length > 0 ? (
                  pastEvents.map((event) => (
                    <div key={event.id} className="event-card past-card">
                      <span className="status-pill source">{event.status}</span>
                      <h3>{event.title}</h3>
                      <p>{event.description || 'Event details archived.'}</p>
                      <p>
                        <strong>Date:</strong> {event.startDate}
                      </p>
                      <p>
                        <strong>Location:</strong> {event.location || 'Not specified'}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">No past events available yet.</div>
                )}
              </div>
            </article>
          </section>
        </>
      ) : null}

      <button type="button" className="admin-fab" onClick={() => setIsAdminPromptOpen(true)} aria-label="Open admin portal">
        A
      </button>

      {isAdminPromptOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsAdminPromptOpen(false)}>
          <div className="admin-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">Admin Portal</p>
            <h2>Enter password to continue</h2>
            <form className="admin-access-form" onSubmit={handleAdminAccess}>
              <label>
                Password
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  autoFocus
                />
              </label>
              {adminError ? <p className="form-error">{adminError}</p> : null}
              <div className="toolbar">
                <button type="submit" className="primary-btn" disabled={isCheckingAdmin}>
                  {isCheckingAdmin ? 'Checking...' : 'Open Admin'}
                </button>
                <button type="button" className="secondary-btn" onClick={() => setIsAdminPromptOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <footer className="site-footer public-footer">
        <div className="footer-grid">
          <div>
            <img className="footer-logo-slot footer-logo-image" src="/assets/logo.png" alt="Ramakrishna Sarada Mission logo" />
            <h3>{organisation.name}</h3>
            <p>
              A centre dedicated to education, spiritual-cultural life, and compassionate service in New Delhi.
            </p>
          </div>
          <div>
            <h4>Quick Links</h4>
            <div className="footer-links">
              <button type="button" className="footer-link-btn" onClick={() => navigate('/donations')}>
                <span className="footer-link-arrow" aria-hidden="true">↗</span>
                <span>Donate Now</span>
              </button>
              <button type="button" className="footer-link-btn" onClick={() => navigate('/events')}>
                <span className="footer-link-arrow" aria-hidden="true">↗</span>
                <span>Upcoming Events</span>
              </button>
              <a href="https://www.niveditavidyamandir.in/" target="_blank" rel="noreferrer">
                <span className="footer-link-arrow" aria-hidden="true">↗</span>
                <span>School Website</span>
              </a>
            </div>
          </div>
          <div>
            <h4>Contact Details</h4>
            <p>C-8A, Hauz Khas, New Delhi - 110016</p>
            <p className="footer-contact-line">
              <span className="footer-icon" aria-hidden="true">☎</span>
              <span>{organisation.phone}</span>
            </p>
            <p className="footer-contact-line">
              <span className="footer-icon" aria-hidden="true">✉</span>
              <span>rksmdelhi@gmail.com</span>
            </p>
            <p className="footer-contact-line">
              <span className="footer-icon" aria-hidden="true">✉</span>
              <span>rksm.nvm@gmail.com</span>
            </p>
          </div>
          <div>
            <h4>Visit</h4>
            <div className="footer-links">
              <a
                href="https://maps.google.com/?q=Ramakrishna+Sarada+Mission+C-8A+Hauz+Khas+New+Delhi+110016"
                target="_blank"
                rel="noreferrer"
              >
                <span className="footer-link-arrow" aria-hidden="true">↗</span>
                <span>Open in Google Maps</span>
              </a>
              <a href="mailto:rksmdelhi@gmail.com">
                <span className="footer-link-arrow" aria-hidden="true">↗</span>
                <span>Email the Mission</span>
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© Ramakrishna Sarada Mission, New Delhi. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

export default PublicSite;
