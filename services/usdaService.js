// services/usdaService.js
// AuditDNA USDA Intelligence Service — Mexausa Food Group, Inc.
// API Key: 4F158DB1-85C2-3243-BFFA-58B53FB40D23
// Feeds: usdaRoutes.DISABLED endpoints

const https = require('https');

const USDA_KEY = process.env.USDA_API_KEY || '4F158DB1-85C2-3243-BFFA-58B53FB40D23';
const NASS_KEY = process.env.USDA_API_KEY || '4F158DB1-85C2-3243-BFFA-58B53FB40D23';
const AMS_AUTH = 'Basic ' + Buffer.from(USDA_KEY + ':').toString('base64');

const cache = {};
function cached(key, ttl, fn) {
  if (cache[key] && (Date.now()-cache[key].ts) < ttl) return Promise.resolve(cache[key].data);
  return fn().then(d => { cache[key]={data:d,ts:Date.now()}; return d; });
}

function amsGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname:'marsapi.ams.usda.gov',path,method:'GET',
      headers:{'Accept':'application/json','Authorization':AMS_AUTH},timeout:12000
    }, res => {
      let body='';res.on('data',c=>body+=c);
      res.on('end',()=>{try{resolve(JSON.parse(body));}catch(e){resolve({results:[]});}});
    });
    req.on('error',()=>resolve({results:[]}));
    req.on('timeout',()=>{req.destroy();resolve({results:[]});});
    req.end();
  });
}

function nassGet(params) {
  const qs = Object.entries({...params,key:NASS_KEY,format:'JSON'})
    .map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
  return new Promise((resolve,reject)=>{
    const req=https.request({
      hostname:'quickstats.nass.usda.gov',
      path:'/api/api_GET/?'+qs,method:'GET',
      headers:{'Accept':'application/json'},timeout:15000
    },res=>{
      let body='';res.on('data',c=>body+=c);
      res.on('end',()=>{try{resolve(JSON.parse(body));}catch(e){resolve({data:[]});}});
    });
    req.on('error',()=>resolve({data:[]}));
    req.on('timeout',()=>{req.destroy();resolve({data:[]});});
    req.end();
  });
}

const SEASONAL = {
  avocado:    [{region:'Mexico',start:'Jan',end:'Dec'},{region:'California',start:'Apr',end:'Sep'}],
  strawberry: [{region:'California',start:'May',end:'Aug'},{region:'Baja CA',start:'Aug',end:'Nov'},{region:'Michoacan',start:'Nov',end:'Mar'}],
  blueberry:  [{region:'Mexico',start:'Feb',end:'May'},{region:'Michigan',start:'Jul',end:'Sep'},{region:'Peru',start:'Oct',end:'Jan'}],
  raspberry:  [{region:'Mexico',start:'Jan',end:'Dec'},{region:'California',start:'May',end:'Oct'}],
  tomato:     [{region:'Sonora MX',start:'Oct',end:'May'},{region:'California',start:'Jun',end:'Oct'}],
  broccoli:   [{region:'Salinas CA',start:'Apr',end:'Nov'},{region:'Yuma AZ',start:'Nov',end:'Mar'},{region:'Mexico',start:'Oct',end:'Apr'}],
  mango:      [{region:'Sinaloa MX',start:'Mar',end:'Aug'},{region:'Guerrero MX',start:'May',end:'Sep'}],
  lime:       [{region:'Veracruz MX',start:'Jan',end:'Dec'},{region:'Colima MX',start:'Jan',end:'Dec'}],
  lemon:      [{region:'Sonora MX',start:'Sep',end:'May'},{region:'California',start:'Apr',end:'Oct'}],
};

const usdaService = {
  async searchCommodities(query) {
    return cached('search:'+query, 30*60*1000, async () => {
      const data = await amsGet('/services/v1.2/reports?q='+encodeURIComponent(query)+'&limit=20');
      return (data.results||[]).map(r=>({
        id:r.slug_id,name:r.report_title,commodity:r.commodity_desc,
        market:r.market_location_name,date:r.published_date
      }));
    });
  },

  async getLivePricing(commodity) {
    return cached('price:'+commodity, 15*60*1000, async () => {
      const data = await amsGet('/services/v1.2/reports?q='+encodeURIComponent(commodity)+'&limit=5');
      const results = data.results||[];
      const prices = results.flatMap(r=>[r.high_price,r.low_price].filter(Boolean).map(Number)).filter(p=>p>0);
      const avg = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0)/prices.length*100)/100 : null;
      return { avg_price:avg, high:Math.max(...prices,0)||null, low:Math.min(...prices,999999)||null,
               reports:results.length, source:'USDA AMS MARS', unit:results[0]?.unit_of_sale||'per unit' };
    });
  },

  async getPortData(portName) {
    return cached('port:'+portName, 60*60*1000, async () => {
      const data = await amsGet('/services/v1.2/reports?market_location_city='+encodeURIComponent(portName)+'&limit=10');
      return { port:portName, reports:data.results||[], count:(data.results||[]).length };
    });
  },

  async getGrowers(state, crop) {
    return cached('growers:'+state+':'+crop, 60*60*1000, async () => {
      const params = { commodity_desc:(crop||'VEGETABLES').toUpperCase(), agg_level_desc:'STATE', statisticcat_desc:'OPERATIONS WITH SALES' };
      if(state) params.state_alpha=state.toUpperCase();
      const data = await nassGet(params);
      return (data.data||[]).map(r=>({ state:r.state_alpha, commodity:r.commodity_desc, year:r.year, value:r.Value, unit:r.unit_desc }));
    });
  },

  async getSeasonalCalendar(commodity) {
    const slug = commodity.toLowerCase().replace(/[^a-z]/g,'-');
    return SEASONAL[slug] || SEASONAL[Object.keys(SEASONAL).find(k=>slug.includes(k))||'avocado'] || [];
  },

  async getWeeklyReport(commodity, week) {
    return cached('weekly:'+commodity+':'+week, 60*60*1000, async () => {
      const data = await amsGet('/services/v1.2/reports?q='+encodeURIComponent(commodity)+'&published_date='+encodeURIComponent(week)+'&limit=10');
      return data.results||[];
    });
  },

  async getHistoricalData(commodity, days) {
    return cached('hist:'+commodity+':'+days, 30*60*1000, async () => {
      const data = await nassGet({ commodity_desc:commodity.toUpperCase(), statisticcat_desc:'PRICE RECEIVED', agg_level_desc:'NATIONAL', year:new Date().getFullYear().toString() });
      return (data.data||[]).slice(0,days).map(r=>({ date:r.reference_period_desc, value:r.Value, unit:r.unit_desc, year:r.year }));
    });
  },

  async getCertifications(growerName) {
    return cached('cert:'+growerName, 120*60*1000, async () => {
      try {
        const url = 'https://organic.ams.usda.gov/integrity/api/search?query='+encodeURIComponent(growerName)+'&limit=5';
        return new Promise(r=>{
          https.get(url,{headers:{Accept:'application/json'}},res=>{
            let d='';res.on('data',c=>d+=c);
            res.on('end',()=>{try{r(JSON.parse(d).results||[]);}catch(e){r([]);}});
          }).on('error',()=>r([]));
        });
      } catch(e) { return []; }
    });
  },

  async compareMarkets(commodity, markets) {
    const mktList = markets||['Los Angeles','Chicago','New York','Dallas','Atlanta'];
    return cached('compare:'+commodity+':'+mktList.join(','), 30*60*1000, async () => {
      const results = await Promise.all(mktList.map(async mkt => {
        const data = await amsGet('/services/v1.2/reports?q='+encodeURIComponent(commodity)+'&market_location_city='+encodeURIComponent(mkt)+'&limit=1');
        const r=data.results?.[0];
        return { market:mkt, high_price:r?.high_price, low_price:r?.low_price, avg_price:r?.mostly_high, report_date:r?.report_date };
      }));
      return results.filter(r=>r.high_price||r.low_price);
    });
  },

  async getForecast(commodity) {
    return cached('forecast:'+commodity, 60*60*1000, async () => {
      const current = await this.getLivePricing(commodity);
      const seasonal = await this.getSeasonalCalendar(commodity);
      const month = new Date().getMonth();
      const inSeason = seasonal.some(s=>{
        const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const start=months.indexOf(s.start),end=months.indexOf(s.end);
        return start<=month&&month<=end;
      });
      return {
        commodity, current_avg:current.avg_price,
        outlook: inSeason?'STABLE':'RISING',
        confidence:'MODERATE',
        note: inSeason?'Peak season — stable supply expected':'Off-season — expect price increase',
        seasonal_windows: seasonal
      };
    });
  }
};

module.exports = usdaService;
