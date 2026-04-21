import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Acquisition channels that should be in preferred_channel
const ACQUISITION_CHANNELS = [
  'Paid Ads (Google/Meta)',
  'Organic Search',
  'Direct Traffic',
  'Referral',
  'Email / SMS',
  'Marketplace',
  'Offline (Store/Event)'
];

// Cities that are currently in preferred_channel (will become geography)
const CITIES = [
  'Delhi NCR',
  'Mumbai',
  'Bangalore',
  'Chennai',
  'Hyderabad',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
  'Kochi'
];

interface OldCustomerRecord {
  customer_id: string;
  customer_segment: string;
  loyalty_tier: string;
  total_spend: string;
  total_transactions: string;
  avg_basket: string;
  days_since_last_purchase: string;
  clv_12m: string;
  clv_tier: string;
  churn_prob_90d: string;
  churn_risk_tier: string;
  preferred_channel: string;
  top_category: string;
}

interface NewCustomerRecord extends Omit<OldCustomerRecord, 'preferred_channel'> {
  preferred_channel: string;
  geography: string;
}

function getRandomChannel(): string {
  // Weighted distribution based on channel analysis
  const weights = [
    { channel: 'Paid Ads (Google/Meta)', weight: 25 },
    { channel: 'Organic Search', weight: 19 },
    { channel: 'Direct Traffic', weight: 16 },
    { channel: 'Referral', weight: 13 },
    { channel: 'Email / SMS', weight: 11 },
    { channel: 'Marketplace', weight: 9 },
    { channel: 'Offline (Store/Event)', weight: 7 }
  ];

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const w of weights) {
    random -= w.weight;
    if (random <= 0) {
      return w.channel;
    }
  }

  return weights[0].channel;
}

function transformData() {
  const inputPath = path.join(__dirname, '../cache/cx360_customer_table.json');
  const outputPath = inputPath;

  console.log('Reading customer data...');
  const rawData = fs.readFileSync(inputPath, 'utf-8');
  const customers: OldCustomerRecord[] = JSON.parse(rawData);

  console.log(`Processing ${customers.length} customers...`);

  const transformedCustomers: NewCustomerRecord[] = customers.map((customer) => {
    const currentChannel = customer.preferred_channel;

    // Check if the current value is a city (geography)
    const isCity = CITIES.some(city =>
      currentChannel.toLowerCase().includes(city.toLowerCase()) ||
      city.toLowerCase().includes(currentChannel.toLowerCase())
    );

    let geography: string;
    let preferredChannel: string;

    if (isCity) {
      // Current value is a city, move it to geography
      geography = currentChannel;
      preferredChannel = getRandomChannel();
    } else if (ACQUISITION_CHANNELS.includes(currentChannel)) {
      // Current value is already a valid channel
      preferredChannel = currentChannel;
      geography = CITIES[Math.floor(Math.random() * CITIES.length)];
    } else {
      // Unknown value, default to both
      geography = CITIES[Math.floor(Math.random() * CITIES.length)];
      preferredChannel = getRandomChannel();
    }

    return {
      ...customer,
      preferred_channel: preferredChannel,
      geography: geography
    };
  });

  console.log('Writing transformed data...');
  fs.writeFileSync(outputPath, JSON.stringify(transformedCustomers, null, 2));
  console.log('Done!');
}

transformData();
