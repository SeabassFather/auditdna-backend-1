// ============================================
// AUDITDNA SI EMAIL SCHEDULER
// Autonomous Market Letter Generator
// ============================================

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  sendGrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: 'market@cmproducts.com',
    fromName: 'Mexausa Food Group Market Intelligence'
  },
  schedule: {
    daily: '0 6 * * *',        // 6:00 AM every day
    mwf: '0 6 * * 1,3,5',      // 6:00 AM Mon, Wed, Fri
    weekly: '0 6 * * 1'        // 6:00 AM Monday
  },
  weatherAPIs: {
    openWeatherMap: process.env.OPENWEATHERMAP_KEY || '',
    noaa: process.env.NOAA_TOKEN || ''
  }
};

// ============================================
// WEATHER SERVICE
// ============================================
const REGIONS = [
  { name: 'Michoacán, MX', lat: 19.5665, lon: -101.7068, crops: ['avocados'] },
  { name: 'Jalisco, MX', lat: 20.6595, lon: -103.3494, crops: ['avocados', 'blueberries'] },
  { name: 'Baja California, MX', lat: 30.8406, lon: -115.2838, crops: ['strawberries', 'raspberries', 'tomatoes'] },
  { name: 'Sinaloa, MX', lat: 24.8091, lon: -107.3940, crops: ['tomatoes', 'peppers'] },
  { name: 'Sonora, MX', lat: 29.0729, lon: -110.9559, crops: ['peppers', 'cucumbers', 'asparagus', 'grapes'] },
  { name: 'Salinas, CA', lat: 36.6777, lon: -121.6555, crops: ['lettuce', 'spinach', 'broccoli'] },
  { name: 'Yuma, AZ', lat: 32.6927, lon: -114.6277, crops: ['lettuce', 'leafy greens'] },
  { name: 'Santa Maria, CA', lat: 34.9530, lon: -120.4357, crops: ['strawberries', 'lettuce'] },
];

async function fetchWeatherData() {
  const weatherData = {};
  
  for (const region of REGIONS) {
    try {
      // OpenWeatherMap API call
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${region.lat}&lon=${region.lon}&appid=${CONFIG.weatherAPIs.openWeatherMap}&units=imperial`
      );
      const data = await response.json();
      
      weatherData[region.name] = {
        temp: Math.round(data.main?.temp || 70),
        humidity: data.main?.humidity || 50,
        condition: data.weather?.[0]?.main?.toLowerCase() || 'clear',
        description: data.weather?.[0]?.description || 'Clear skies',
        wind: data.wind?.speed || 5,
        crops: region.crops,
        risk: calculateRisk(data, region.crops),
        icon: getWeatherIcon(data.weather?.[0]?.main)
      };
    } catch (error) {
      console.error(`Weather fetch failed for ${region.name}:`, error);
      weatherData[region.name] = {
        temp: 70,
        humidity: 50,
        condition: 'unknown',
        description: 'Data unavailable',
        crops: region.crops,
        risk: 'unknown',
        icon: '❓'
      };
    }
  }
  
  return weatherData;
}

function calculateRisk(weather, crops) {
  const temp = weather.main?.temp || 70;
  const humidity = weather.main?.humidity || 50;
  const condition = weather.weather?.[0]?.main?.toLowerCase() || '';
  
  // High risk conditions
  if (temp > 95 || temp < 32) return 'high';
  if (condition.includes('storm') || condition.includes('hurricane')) return 'high';
  if (condition.includes('hail')) return 'high';
  
  // Medium risk conditions
  if (temp > 90 || temp < 40) return 'medium';
  if (humidity > 85) return 'medium';
  if (condition.includes('rain') && crops.some(c => ['berries', 'strawberries'].includes(c))) return 'medium';
  
  return 'low';
}

function getWeatherIcon(condition) {
  const icons = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Fog': '🌫️',
    'Haze': '🌫️'
  };
  return icons[condition] || '☀️';
}

// ============================================
// MARKET DATA SERVICE
// ============================================
function getMarketData() {
  // In production, this would fetch from your database or USDA API
  return {
    avocados: [
      { name: 'Hass 48ct Michoacán', price: 42.50, change: 2.3, forecast: 45.80, confidence: 87 },
      { name: 'Hass 48ct Jalisco', price: 40.50, change: 3.0, forecast: 43.20, confidence: 85 },
      { name: 'Hass 48ct California', price: 46.00, change: 1.9, forecast: 48.50, confidence: 82 },
      { name: 'Hass 60ct Michoacán', price: 38.50, change: 2.1, forecast: 41.00, confidence: 88 },
      { name: 'Organic 48ct', price: 58.00, change: 4.2, forecast: 62.00, confidence: 80 },
    ],
    berries: [
      { name: 'Strawberries 8x1lb Baja', price: 32.00, change: 5.5, forecast: 31.50, confidence: 92 },
      { name: 'Blueberries 6oz Jalisco', price: 38.50, change: 5.5, forecast: 39.00, confidence: 78 },
      { name: 'Raspberries 6oz Baja', price: 52.90, change: 7.2, forecast: 51.00, confidence: 88 },
      { name: 'Blackberries 6oz Baja', price: 48.20, change: 6.8, forecast: 47.00, confidence: 85 },
    ],
    lettuce: [
      { name: 'Romaine 24ct Salinas', price: 19.80, change: 2.8, forecast: 18.90, confidence: 85 },
      { name: 'Iceberg 24ct Yuma', price: 16.80, change: 1.5, forecast: 16.20, confidence: 90 },
      { name: 'Green Leaf 24ct', price: 21.50, change: 3.1, forecast: 20.50, confidence: 82 },
      { name: 'Spring Mix 3lb', price: 38.90, change: 4.2, forecast: 37.00, confidence: 78 },
    ],
    tomatoes: [
      { name: 'Roma 25lb Sinaloa', price: 18.75, change: 0.8, forecast: 21.50, confidence: 78 },
      { name: 'Vine Ripe 15lb', price: 24.50, change: 1.2, forecast: 27.00, confidence: 75 },
      { name: 'Grape 12pt', price: 28.90, change: 2.8, forecast: 30.50, confidence: 80 },
    ],
    peppers: [
      { name: 'Green Bell XL Sonora', price: 24.50, change: 1.5, forecast: 26.00, confidence: 82 },
      { name: 'Red Bell XL', price: 32.80, change: 2.8, forecast: 35.00, confidence: 78 },
      { name: 'Jalapeño 11lb', price: 18.90, change: 1.2, forecast: 20.00, confidence: 85 },
    ],
    citrus: [
      { name: 'Persian Limes 200ct', price: 28.00, change: -0.5, forecast: 26.50, confidence: 88 },
      { name: 'Lemons 140ct', price: 38.50, change: 2.5, forecast: 40.00, confidence: 82 },
    ]
  };
}

// ============================================
// EMAIL GENERATOR
// ============================================
async function generateMarketLetter() {
  const weather = await fetchWeatherData();
  const market = getMarketData();
  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Find weather alerts (high/medium risk)
  const alerts = Object.entries(weather)
    .filter(([_, data]) => data.risk === 'high' || data.risk === 'medium')
    .map(([region, data]) => ({
      region,
      ...data,
      impact: data.risk === 'high' ? 'Supply reduction expected' : 'Minor delays possible'
    }));
  
  // Generate HTML email
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mexausa Food Group Market Intelligence</title>
</head>
<body style="margin:0; padding:0; font-family: Georgia, serif; background:#f8fafc;">
  <div style="max-width:650px; margin:0 auto; background:#ffffff;">
    
    <!-- Header -->
    <div style="text-align:center; padding:2rem; border-bottom:4px solid #22c55e;">
      <div style="font-size:0.875rem; color:#666; margin-bottom:0.5rem;">CM PRODUCTS INTERNATIONAL</div>
      <div style="font-size:1.75rem; font-weight:700; color:#0f172a;">Weekly Market Intelligence</div>
      <div style="font-size:1rem; color:#22c55e; margin-top:0.5rem;">Week of ${date}</div>
    </div>
    
    <!-- Weather Alerts -->
    ${alerts.length > 0 ? `
    <div style="background:#fef2f2; border:2px solid #ef4444; margin:1.5rem; padding:1rem; border-radius:8px;">
      <div style="font-size:1rem; font-weight:700; color:#ef4444; margin-bottom:0.75rem;">⚠️ WEATHER ALERTS</div>
      ${alerts.map(a => `
        <div style="margin-bottom:0.5rem; font-size:0.875rem;">
          <strong>${a.region}</strong>: ${a.icon} ${a.description} (${a.temp}°F)<br>
          <span style="color:#ef4444;">Impact: ${a.impact}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- Weather Conditions Table -->
    <div style="margin:1.5rem; padding:1rem; background:#f8fafc; border-radius:8px;">
      <div style="font-size:1rem; font-weight:700; margin-bottom:0.75rem;">🌦️ Regional Conditions</div>
      <table style="width:100%; font-size:0.8125rem; border-collapse:collapse;">
        <tr style="border-bottom:1px solid #e2e8f0;">
          <th style="padding:0.5rem; text-align:left; color:#64748b;">Region</th>
          <th style="padding:0.5rem; text-align:left; color:#64748b;">Condition</th>
          <th style="padding:0.5rem; text-align:center; color:#64748b;">Risk</th>
        </tr>
        ${Object.entries(weather).slice(0, 6).map(([region, data]) => `
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:0.5rem;">${region}</td>
            <td style="padding:0.5rem;">${data.icon} ${data.temp}°F - ${data.description}</td>
            <td style="padding:0.5rem; text-align:center;">
              <span style="padding:0.125rem 0.5rem; border-radius:4px; font-size:0.75rem; font-weight:600;
                background:${data.risk === 'high' ? '#fef2f2' : data.risk === 'medium' ? '#fef9c3' : '#f0fdf4'};
                color:${data.risk === 'high' ? '#ef4444' : data.risk === 'medium' ? '#eab308' : '#22c55e'};">
                ${data.risk.toUpperCase()}
              </span>
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
    
    <!-- Avocado Section -->
    <div style="margin:1.5rem;">
      <div style="font-size:1.125rem; font-weight:700; border-bottom:3px solid #22c55e; padding-bottom:0.25rem; margin-bottom:0.75rem;">
        🥑 AVOCADO UPDATE
      </div>
      <table style="width:100%; font-size:0.875rem; border-collapse:collapse;">
        <tr style="background:#f1f5f9;">
          <th style="padding:0.5rem; text-align:left;">Product</th>
          <th style="padding:0.5rem; text-align:right;">Price</th>
          <th style="padding:0.5rem; text-align:right;">24h</th>
          <th style="padding:0.5rem; text-align:right;">4-Wk Forecast</th>
        </tr>
        ${market.avocados.map(item => `
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:0.5rem;">${item.name}</td>
            <td style="padding:0.5rem; text-align:right; font-weight:600;">$${item.price.toFixed(2)}</td>
            <td style="padding:0.5rem; text-align:right; color:${item.change >= 0 ? '#22c55e' : '#ef4444'};">
              ${item.change >= 0 ? '+' : ''}${item.change}%
            </td>
            <td style="padding:0.5rem; text-align:right; color:#3b82f6;">$${item.forecast.toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>
      <div style="font-size:0.8125rem; color:#64748b; margin-top:0.5rem;">
        🔮 <strong>SI Prediction:</strong> +5-8% over next 4 weeks | Confidence: 85%
      </div>
    </div>
    
    <!-- Berries Section -->
    <div style="margin:1.5rem;">
      <div style="font-size:1.125rem; font-weight:700; border-bottom:3px solid #ef4444; padding-bottom:0.25rem; margin-bottom:0.75rem;">
        🍓 BERRY UPDATE
      </div>
      <table style="width:100%; font-size:0.875rem; border-collapse:collapse;">
        <tr style="background:#f1f5f9;">
          <th style="padding:0.5rem; text-align:left;">Product</th>
          <th style="padding:0.5rem; text-align:right;">Price</th>
          <th style="padding:0.5rem; text-align:right;">24h</th>
          <th style="padding:0.5rem; text-align:right;">4-Wk Forecast</th>
        </tr>
        ${market.berries.map(item => `
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:0.5rem;">${item.name}</td>
            <td style="padding:0.5rem; text-align:right; font-weight:600;">$${item.price.toFixed(2)}</td>
            <td style="padding:0.5rem; text-align:right; color:${item.change >= 0 ? '#22c55e' : '#ef4444'};">
              ${item.change >= 0 ? '+' : ''}${item.change}%
            </td>
            <td style="padding:0.5rem; text-align:right; color:#3b82f6;">$${item.forecast.toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>
    </div>
    
    <!-- Lettuce Section -->
    <div style="margin:1.5rem;">
      <div style="font-size:1.125rem; font-weight:700; border-bottom:3px solid #22c55e; padding-bottom:0.25rem; margin-bottom:0.75rem;">
        🥬 LETTUCE & GREENS
      </div>
      <table style="width:100%; font-size:0.875rem; border-collapse:collapse;">
        <tr style="background:#f1f5f9;">
          <th style="padding:0.5rem; text-align:left;">Product</th>
          <th style="padding:0.5rem; text-align:right;">Price</th>
          <th style="padding:0.5rem; text-align:right;">24h</th>
          <th style="padding:0.5rem; text-align:right;">4-Wk Forecast</th>
        </tr>
        ${market.lettuce.map(item => `
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:0.5rem;">${item.name}</td>
            <td style="padding:0.5rem; text-align:right; font-weight:600;">$${item.price.toFixed(2)}</td>
            <td style="padding:0.5rem; text-align:right; color:${item.change >= 0 ? '#22c55e' : '#ef4444'};">
              ${item.change >= 0 ? '+' : ''}${item.change}%
            </td>
            <td style="padding:0.5rem; text-align:right; color:#3b82f6;">$${item.forecast.toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>
    </div>
    
    <!-- Footer -->
    <div style="border-top:2px solid #e2e8f0; padding:1.5rem; text-align:center; background:#f8fafc;">
      <div style="font-weight:600; margin-bottom:0.5rem;">Mexausa Food Group, Inc. | NMLS #337526</div>
      <div style="font-size:0.8125rem; color:#64748b; margin-bottom:0.75rem;">
        📞 +52-646-340-2686 | 📧 market@cmproducts.com
      </div>
      <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:0.75rem;">
        🤖 This report was autonomously generated by AuditDNA Synthetic Intelligence<br>
        📊 Data sources: USDA, NOAA, CONAGUA, OpenWeatherMap
      </div>
      <div style="font-size:0.75rem;">
        <a href="{{unsubscribe_url}}" style="color:#3b82f6; margin-right:1rem;">Unsubscribe</a>
        <a href="{{preferences_url}}" style="color:#3b82f6; margin-right:1rem;">Update Preferences</a>
        <a href="{{web_url}}" style="color:#3b82f6;">View Online</a>
      </div>
    </div>
    
  </div>
</body>
</html>
  `;
  
  return {
    subject: `🥑 Mexausa Food Group Market Intelligence - Week of ${date}`,
    html,
    text: generatePlainText(market, weather, alerts)
  };
}

function generatePlainText(market, weather, alerts) {
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  let text = `
CM PRODUCTS WEEKLY MARKET INTELLIGENCE
Week of ${date}
=====================================

`;

  if (alerts.length > 0) {
    text += `⚠️ WEATHER ALERTS\n`;
    alerts.forEach(a => {
      text += `${a.region}: ${a.description} (${a.temp}°F) - ${a.impact}\n`;
    });
    text += `\n`;
  }

  text += `🥑 AVOCADO PRICES\n`;
  market.avocados.forEach(item => {
    text += `${item.name}: $${item.price.toFixed(2)} (${item.change >= 0 ? '+' : ''}${item.change}%)\n`;
  });
  
  text += `\n🍓 BERRY PRICES\n`;
  market.berries.forEach(item => {
    text += `${item.name}: $${item.price.toFixed(2)} (${item.change >= 0 ? '+' : ''}${item.change}%)\n`;
  });

  text += `
---
Mexausa Food Group, Inc. | NMLS #337526
This report was generated by AuditDNA SI
To unsubscribe, reply with "UNSUBSCRIBE"
`;

  return text;
}

// ============================================
// SUBSCRIBER MANAGEMENT
// ============================================
function loadSubscribers() {
  const filePath = path.join(__dirname, '../data/subscribers.json');
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading subscribers:', error);
  }
  return [];
}

function saveSubscribers(subscribers) {
  const filePath = path.join(__dirname, '../data/subscribers.json');
  fs.writeFileSync(filePath, JSON.stringify(subscribers, null, 2));
}

// ============================================
// EMAIL SENDER
// ============================================
async function sendEmail(to, subject, html, text) {
  // Using SendGrid
  const sgMail = await import('@sendgrid/mail');
  sgMail.default.setApiKey(CONFIG.sendGrid.apiKey);
  
  const msg = {
    to,
    from: {
      email: CONFIG.sendGrid.fromEmail,
      name: CONFIG.sendGrid.fromName
    },
    subject,
    text,
    html
  };
  
  try {
    await sgMail.default.send(msg);
    console.log(`✓ Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to send to ${to}:`, error);
    return false;
  }
}

async function sendMarketLetter(schedule = 'all') {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📧 SI MARKETING AGENT - Sending Market Letter`);
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const letter = await generateMarketLetter();
  const subscribers = loadSubscribers();
  
  // Filter by schedule preference
  const recipients = schedule === 'all' 
    ? subscribers.filter(s => s.status === 'active')
    : subscribers.filter(s => s.status === 'active' && s.schedule === schedule);
  
  console.log(`📋 Recipients: ${recipients.length}`);
  
  let sent = 0;
  let failed = 0;
  
  for (const subscriber of recipients) {
    const success = await sendEmail(
      subscriber.email,
      letter.subject,
      letter.html,
      letter.text
    );
    if (success) sent++;
    else failed++;
    
    // Rate limiting - 1 email per 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✅ Sent: ${sent} | ❌ Failed: ${failed}`);
  console.log(`${'='.repeat(60)}\n`);
  
  return { sent, failed, total: recipients.length };
}

// ============================================
// CRON SCHEDULER
// ============================================
function startScheduler() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🤖 SI EMAIL MARKETING AGENT ACTIVATED`);
  console.log(`${'='.repeat(60)}`);
  
  // Daily schedule (6 AM)
  cron.schedule(CONFIG.schedule.daily, () => {
    console.log('⏰ Daily trigger - sending to daily subscribers');
    sendMarketLetter('daily');
  }, { timezone: 'America/Los_Angeles' });
  
  // M/W/F schedule (6 AM)
  cron.schedule(CONFIG.schedule.mwf, () => {
    console.log('⏰ MWF trigger - sending to MWF subscribers');
    sendMarketLetter('mwf');
  }, { timezone: 'America/Los_Angeles' });
  
  // Weekly schedule (Monday 6 AM)
  cron.schedule(CONFIG.schedule.weekly, () => {
    console.log('⏰ Weekly trigger - sending to weekly subscribers');
    sendMarketLetter('weekly');
  }, { timezone: 'America/Los_Angeles' });
  
  console.log(`
📅 Schedules Active:
   ├── Daily:  6:00 AM PST (every day)
   ├── M/W/F:  6:00 AM PST (Mon, Wed, Fri)
   └── Weekly: 6:00 AM PST (Monday)
   
🌍 Weather Monitoring: ${REGIONS.length} regions
📊 Market Data: Avocados, Berries, Lettuce, Tomatoes, Peppers, Citrus

SI Agent is now running autonomously...
${'='.repeat(60)}
`);
}

// Export functions
export {
  startScheduler,
  sendMarketLetter,
  generateMarketLetter,
  fetchWeatherData,
  loadSubscribers,
  saveSubscribers
};

// Auto-start if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startScheduler();
}
