const db = require('./db');

const data = [
  {
    name: 'Post Matric Scholarship for SC Students',
    provider_type: 'Government', provider: 'Govt. of India / Maharashtra Social Justice Dept.',
    description: 'Helps Scheduled Caste students pay fees and maintenance after Class 10.',
    max_income: 250000, categories: 'SC', gender: 'ALL', levels: 'Diploma,UG,PG',
    min_percentage: null, disability_required: 0,
    link: 'https://mahadbt.maharashtra.gov.in'
  },
  {
    name: 'Post Matric Scholarship for ST Students',
    provider_type: 'Government', provider: 'Tribal Development Dept.',
    description: 'Financial support for Scheduled Tribe students in higher education.',
    max_income: 250000, categories: 'ST', gender: 'ALL', levels: 'Diploma,UG,PG',
    min_percentage: null, disability_required: 0,
    link: 'https://mahadbt.maharashtra.gov.in'
  },
  {
    name: 'Rajarshi Shahu Maharaj Shikshan Shulkh Shishyavrutti (EBC)',
    provider_type: 'Government', provider: 'Govt. of Maharashtra',
    description: 'Fee concession for economically backward students from the open category.',
    max_income: 800000, categories: 'Open,EWS', gender: 'ALL', levels: 'Diploma,UG,PG',
    min_percentage: null, disability_required: 0,
    link: 'https://mahadbt.maharashtra.gov.in'
  },
  {
    name: 'OBC / VJNT / SBC Scholarship',
    provider_type: 'Government', provider: 'Bahujan Kalyan Dept., Maharashtra',
    description: 'Scholarship for students from OBC, VJNT and SBC categories.',
    max_income: 800000, categories: 'OBC,VJNT,SBC', gender: 'ALL', levels: 'Diploma,UG,PG',
    min_percentage: null, disability_required: 0,
    link: 'https://mahadbt.maharashtra.gov.in'
  },
  {
    name: 'AICTE Pragati Scholarship for Girls',
    provider_type: 'Government', provider: 'AICTE (Govt. of India)',
    description: 'Supports girls studying in AICTE-approved technical degree or diploma courses.',
    max_income: 800000, categories: 'ALL', gender: 'Female', levels: 'Diploma,UG',
    min_percentage: null, disability_required: 0,
    link: 'https://scholarships.gov.in'
  },
  {
    name: 'AICTE Saksham Scholarship',
    provider_type: 'Government', provider: 'AICTE (Govt. of India)',
    description: 'For students with disabilities studying technical courses.',
    max_income: 800000, categories: 'ALL', gender: 'ALL', levels: 'Diploma,UG',
    min_percentage: null, disability_required: 1,
    link: 'https://scholarships.gov.in'
  },
  {
    name: 'Central Sector Scholarship Scheme',
    provider_type: 'Government', provider: 'Ministry of Education, Govt. of India',
    description: 'Merit-based support for college students from low-income families.',
    max_income: 450000, categories: 'ALL', gender: 'ALL', levels: 'UG,PG',
    min_percentage: 80, disability_required: 0,
    link: 'https://scholarships.gov.in'
  },
  {
    name: 'Private & Corporate Scholarships (Directory)',
    provider_type: 'Private', provider: 'Various companies and foundations',
    description: 'A directory of scholarships from private foundations and companies. Check each listing for current eligibility.',
    max_income: null, categories: 'ALL', gender: 'ALL', levels: 'ALL',
    min_percentage: null, disability_required: 0,
    link: 'https://www.buddy4study.com'
  }
];

const count = db.prepare('SELECT COUNT(*) AS c FROM scholarships').get().c;
if (count > 0) {
  console.log('Scholarships already exist. Delete scolarguide.db to reseed.');
} else {
  const insert = db.prepare(`
    INSERT INTO scholarships
    (name, provider_type, provider, description, max_income, categories, gender, levels, min_percentage, disability_required, link)
    VALUES (@name, @provider_type, @provider, @description, @max_income, @categories, @gender, @levels, @min_percentage, @disability_required, @link)
  `);
  data.forEach(s => insert.run(s));
  console.log(`Added ${data.length} scholarships.`);
}