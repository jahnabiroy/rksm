export const organisation = {
  name: 'Ramakrishna Sarada Mission, Delhi',
  tagline: 'Education, service, and spiritual-cultural uplift rooted in the ideals of Sister Nivedita.',
  mission:
    'Support the educational, cultural, and welfare activities of Ramakrishna Sarada Mission, Delhi while keeping donors informed from submission to confirmation.',
  upiId: 'donations@upi',
  bankName: 'Mission Bank Account',
  accountName: 'Ramakrishna Sarada Mission, Delhi',
  accountNumber: '123456789012',
  ifsc: 'EXAMPL0001',
  email: 'rksmdelhi@gmail.com',
  phone: '011 3557 1296',
};

export const donationPurposeGroups = [
  {
    label: 'General',
    options: ['Ashram maintenance', 'Land and building', 'Capital reserve fund'],
  },
  {
    label: 'Educational',
    options: ['Educational health', 'Refreshment', 'Scholarship stipend'],
  },
  {
    label: 'School',
    options: ['School maintenance', 'School scholarship'],
  },
];

export const purposeOptions = donationPurposeGroups.flatMap((group) =>
  group.options.map((option) => `${group.label} - ${option}`),
);

export const defaultPurpose = purposeOptions[0];

export const publicEmptyForm = {
  donorName: '',
  donationDate: new Date().toISOString().slice(0, 10),
  phone: '',
  email: '',
  address: '',
  place: '',
  panNumber: '',
  paymentMethod: 'UPI / QR',
  bankName: '',
  purpose: defaultPurpose,
  amount: '',
  transactionReference: '',
  notes: '',
  isCorpusFund: false,
};

export const adminEmptyForm = {
  donorName: '',
  donationDate: new Date().toISOString().slice(0, 10),
  phone: '',
  email: '',
  address: '',
  place: '',
  panNumber: '',
  paymentMethod: 'Cash',
  chequeNumber: '',
  draftNumber: '',
  bankName: '',
  purpose: defaultPurpose,
  amount: '',
  transactionReference: '',
  notes: '',
  isCorpusFund: false,
};

export const eventEmptyForm = {
  title: '',
  description: '',
  location: '',
  startDate: '',
  endDate: '',
  googleFormUrl: '',
  registrationsSheetUrl: '',
};

export const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export const amountForPdf = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
