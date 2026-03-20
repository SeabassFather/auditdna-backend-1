// AgIntelligence.jsx — USDA NASS Full Integration
// 100% functional: Grower leads, production, prices, acreage, county maps
// Save to: C:\AuditDNA\frontend\src\modules\AgIntelligence.jsx
import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const gold='#cba658',plat='#94a3b0',silver='#cbd5e1',dark='#0f172a',slate='#1e293b',white='#f1f5f9';
const S={
  card:{background:'rgba(30,41,59,0.7)',border:'1px solid rgba(148,163,176,0.15)',borderRadius:6,padding:16},
  hdr:{fontWeight:900,fontSize:11,letterSpacing:'0.09em',color:gold,marginBottom:10},
  label:{fontSize:9,fontWeight:700,color:plat,marginBottom:4,display:'block',letterSpacing:'0.06em'},
  input:{width:'100%',padding:'7px 10px',background:'#243044',border:'1px solid rgba(148,163,176,0.28)',color:white,fontSize:12,borderRadius:4,outline:'none',boxSizing:'border-box'},
  sel:{width:'100%',padding:'7px 10px',background:'#243044',border:'1px solid rgba(148,163,176,0.28)',color:white,fontSize:11,borderRadius:4,outline:'none',boxSizing:'border-box'},
  btn:{padding:'8px 18px',background:'rgba(203,166,88,0.2)',border:'1px solid rgba(203,166,88,0.5)',color:gold,fontWeight:900,fontSize:11,cursor:'pointer',borderRadius:3},
  td:{padding:'6px 10px',borderBottom:'1px solid rgba(148,163,176,0.08)',fontSize:11,color:white},
  th:{padding:'6px 10px',borderBottom:'1px solid rgba(148,163,176,0.2)',fontSize:9,fontWeight:700,color:plat,letterSpacing:'0.07em',textAlign:'left'},
};
const COMMODITIES=['AG LAND','AG SERVICES','AG SERVICES & RENT','ALCOHOL COPRODUCTS','ALMONDS','ALPACAS','AMARANTH','ANIMAL PRODUCTS, OTHER','ANIMAL SECTOR','ANIMAL TOTALS','ANIMALS, OTHER','ANNUAL PPI','APPLES','APRICOTS','AQUACULTURE TOTALS','AQUACULTURE, OTHER','AQUATIC PLANTS','ARONIA BERRIES','ARTICHOKES','ASPARAGUS','ASSETS','AUTOMOBILES','AUTOS','AVOCADOS','BAITFISH','BANANAS','BAREROOT HERBACEOUS PERENNIALS','BARLEY','BASIL','BEANS','BEDDING PLANT TOTALS','BEDDING PLANTS, ANNUAL','BEDDING PLANTS, HERBACEOUS PERENNIAL','BEEF','BEESWAX','BEETS','BERRIES, OTHER','BERRY TOTALS','BETEL NUTS','BISON','BITTERMELON','BLACKBERRIES','BLUEBERRIES','BOATS','BOYSENBERRIES','BREADFRUIT','BROCCOLI','BRUSSELS SPROUTS','BUCKWHEAT','BUILDING MATERIALS','BUILDINGS','BULBS & CORMS & RHIZOMES & TUBERS','BULBS & ROOTS','BUSINESS ACTIVITY','BUTTER','BUTTERMILK','CABBAGE','CACAO','CACTI & SUCCULENTS','CAKE & MEAL','CAMELINA','CANEBERRIES','CANOLA','CARABAO','CARROTS','CASH RECEIPT TOTALS','CASSAVA','CATTLE','CAULIFLOWER','CCC LOANS','CELERY','CHAIN SAWS','CHEESE','CHEMICAL TOTALS','CHEMICALS, OTHER','CHERIMOYAS','CHERRIES','CHESTNUTS','CHICKENS','CHICKPEAS','CHICORY','CHIRONJAS','CHIVES','CHUKARS','CILANTRO','CITRONS','CITRUS TOTALS','CITRUS, OTHER','COCONUTS','COFFEE','COFFEE DEPULPERS','COFFEE DRYERS','COFFEE WASHERS','COLD STORAGE CAPACITY','COMMODITY TOTALS','COMPUTERS','CONSUMER PRICE INDEX','CORIANDER','CORN','COTTON','CRAMBE','CRANBERRIES','CREAM','CROP SECTOR','CROP TOTALS','CROPS, OTHER','CRUDE PINE GUM','CRUSTACEANS','CUCUMBERS','CURRANTS','CUT CHRISTMAS TREES','CUT CHRISTMAS TREES & SHORT TERM WOODY TREES','CUT CULTIVATED GREENS','CUT FLOWERS','CUT FLOWERS & CUT CULTIVATED GREENS','DAIKON','DAIRY PRODUCT TOTALS','DAIRY PRODUCTS, OTHER','DASHEENS','DATES','DEBT','DECIDUOUS FLOWERING TREES','DECIDUOUS SHADE TREES','DECIDUOUS SHRUBS','DEER','DEPRECIATION','DILL','DRAGON FRUIT','DUCKS','EGGPLANT','EGGS','ELDERBERRIES','ELECTRICITY','ELK','EMERGENCY ELECTRIC GENERATORS','EMMER & SPELT','EMUS','ENERGY','EQUINE','EQUIPMENT, OTHER','ESCAROLE & ENDIVE','EVERGREENS, BROADLEAF','EVERGREENS, CONIFEROUS','EXPENSE TOTALS','EXPENSES, OTHER','FACILITIES & EQUIPMENT','FARM BY-PRODUCTS & WASTE','FARM OPERATIONS','FARM SECTOR','FEED','FEED GRAINS','FEED GRAINS & HAY','FEED PRICE RATIO','FERTILIZER','FERTILIZER & CHEMICAL TOTALS','FERTILIZER TOTALS','FERTILIZER, MIXED','FERTILIZER, OTHER','FIELD CROP & VEGETABLE TOTALS','FIELD CROP TOTALS','FIELD CROPS & VEGETABLES, OTHER','FIELD CROPS, OTHER','FIELDWORK','FIGS','FISH','FISH & GIANT CLAMS','FLAXSEED','FLORICULTURE TOTALS','FLORICULTURE, OTHER','FLOUR','FLOWER SEEDS','FLOWERING PLANTS, POTTED','FOLIAGE PLANTS','FOOD COMMODITIES','FOOD CROP TOTALS','FOOD CROP, OTHER','FOOD FISH','FOOD GRAINS','FRUIT & NUT PLANTS','FRUIT & TREE NUT TOTALS','FRUIT & TREE NUTS, OTHER','FRUIT BEARING TREES','FRUIT TOTALS','FRUIT, OTHER','FUELS','FUMIGANTS','FUNGICIDES','FUNGICIDES & OTHER','GADO','GARLIC','GEESE','GINGER ROOT','GINSENG','GOATS','GOOSEBERRIES','GOURDS','GOVT PROGRAM TOTALS','GOVT PROGRAMS','GRAIN','GRAIN STORAGE CAPACITY','GRAPEFRUIT','GRAPES','GRASSES','GRASSES & LEGUMES TOTALS','GRASSES & LEGUMES, OTHER','GREASE','GREENS','GROWING MEDIA','GUAR','GUAVAS','GUINEAS','HAY','HAY & HAYLAGE','HAYLAGE','HAZELNUTS','HEMP','HERBICIDES','HERBS','HERBS & SPICES','HOGS','HONEY','HOPS','HORSERADISH','HORTICULTURE TOTALS','HORTICULTURE, OTHER','ICE CREAM','IMPROVEMENT & CONSTRUCTION','INCOME, FARM-RELATED','INCOME, NET CASH FARM','INSECTICIDES','INTEREST','INTERNET','IRRIGATION ORGANIZATIONS','JICAMA','JOJOBA','K-EARLY CITRUS','KAVA','KIWIFRUIT','KUMQUATS','LABOR','LAMB & MUTTON','LAND AREA','LANDLORDS','LARD','LAUPELE','LEGUMES','LEMONS','LEMONS & LIMES','LENTILS','LETTUCE','LIMES','LIVESTOCK TOTALS','LIVESTOCK, OTHER','LLAMAS','LOGANBERRIES','LONGAN','LOTUS ROOT','LYCHEES','MACADAMIAS','MACHINERY','MACHINERY TOTALS','MACHINERY, OTHER','MANGOES','MAPLE SYRUP','MEAL','MEDICINE & DRUGS','MELLORINE','MELONS','MICROGREENS','MILK','MILK COOLERS','MILKING MACHINES','MILLET','MILLFEED','MINK','MINT','MISCANTHUS','MOHAIR','MOLLUSKS','MOUNTAIN APPLES','MULBERRIES','MUSHROOM SPAWN','MUSHROOMS','MUSTARD','NECTARINES','NITROGEN','NON-CITRUS FRUIT & TREE NUTS TOTALS','NON-CITRUS TOTALS','NON-CITRUS, OTHER','NONFARM SECTOR','NURSERY & FLORICULTURE TOTALS','NURSERY TOTALS','NURSERY, OTHER','OATS','OIL','OIL-BEARING CROPS','OKRA','OLIVES','ONIONS','OPERATORS','OPERATORS, FIRST FOUR OPERATORS','OPERATORS, PRINCIPAL','OPERATORS, SECOND','OPERATORS, THIRD','ORANGES','ORCHARDS','ORNAMENTAL FISH','ORNAMENTAL GRASSES','ORNAMENTAL TREE SEEDLINGS','OSTRICHES','PACKING FACILITY','PALMS','PAPAYAS','PARSLEY','PARSNIPS','PARTRIDGES','PASSION FRUIT','PASTURELAND','PAWPAWS','PEACHES','PEACHES & NECTARINES','PEAFOWL','PEANUTS','PEARS','PEAS','PEAS & CARROTS','PEAS & LENTILS','PECANS','PEPPERS','PERSIMMONS','PHEASANTS','PHOSPHATE','PICKLES','PIGEONS & SQUAB','PIMIENTOS','PINEAPPLES','PISTACHIOS','PITW','PLANTAINS','PLUM-APRICOT HYBRIDS','PLUMS','PLUMS & PRUNES','POINSETTIAS','POMEGRANATES','POPCORN','PORK','POTASH','POTASH & PHOSPHATE','POTATOES','POTATOES & DRY BEANS','POULTRY BY-PRODUCT MEALS','POULTRY FATS','POULTRY TOTALS','POULTRY, OTHER','PPITW','PRACTICES','PRICE INDEX RATIO','PRODUCERS','PRODUCERS, (EXCL PRINCIPAL)','PRODUCERS, FIRST FOUR PRODUCERS','PRODUCERS, PRIMARY','PRODUCERS, PRINCIPAL','PRODUCTION ITEMS','PRODUCTION ITEMS & CONSUMER PRICE INDEX','PROPAGATIVE MATERIAL','PROPAGATIVE MATERIALS TOTALS','PRUNES','PUMPKINS','PUMPS','QUAIL','QUENEPAS','RABBITS','RADISHES','RAMBUTAN','RAPESEED','RASPBERRIES','RED MEAT','RENT','REPAIRS','RETURNS & ALLOWANCES','RHEAS','RHUBARB','RICE','ROOT CELERY','ROOT CROPS & TUBERS','ROOT CROPS & TUBERS, OTHER','ROOTS & TUBERS','ROOTS, OTHER','ROW CROPS','RYE','SAFFLOWER','SEEDS','SEEDS & PLANTS TOTALS','SELF PROPELLED','SESAME','SHEEP','SHEEP & GOATS TOTALS','SHERBET','SHORT TERM WOODY TREES','SILAGE','SMALL GRAINS','SNOW','SOD','SOIL','SORGHUM','SORREL','SOURSOPS','SOYBEANS','SPECIALTY ANIMAL TOTALS','SPECIALTY ANIMALS, OTHER','SPINACH','SPORT FISH','SPRAYERS','SPROUTS','SQUASH','STARFRUIT','STRAWBERRIES','STRING TRIMMERS','SUGARBEETS','SUGARCANE','SUNFLOWER','SUPPLIES','SUPPLIES & REPAIRS','SWEET CORN','SWEET POTATOES','SWEET RICE','SWEETSOPS','SWITCHGRASS','TALLOW','TANGELOS','TANGERINES','TANIERS','TARO','TAXES','TEMPLES','TENANTS','TILLERS','TOBACCO','TOMATOES','TRACTORS','TRACTORS & SELF PROPELLED','TRANSPLANTS','TREE NUT TOTALS','TREE NUTS, OTHER','TRITICALE','TRUCKS','TRUCKS & AUTOS','TURKEYS','TURNIPS','VEAL','VEGETABLE SEEDS','VEGETABLE TOTALS','VEGETABLES, MIXED','VEGETABLES, OTHER','WALNUTS','WATER','WATER ICES','WATERCRESS','WELLS','WHEAT','WHEY','WILD RICE','WOOD CHIPPERS','WOODY ORNAMENTALS & VINES, OTHER','WOOL','YAMS','YOGURT']; // 467 commodities from USDA NASS live API
const US_STATES=['CA','AZ','TX','FL','WA','OR','GA','MI','NC','PA','NY','NJ','MN','WI','CO','ID','UT','NM','NV','SC','VA','OH','IN','IL','MO','AR','LA','MS','AL','TN'];
const TABS=[['leads','GROWER LEADS'],['snapshot','COMMODITY SNAPSHOT'],['prices','PRICE INTELLIGENCE'],['acreage','ACREAGE / SUPPLY'],['counties','COUNTY MAP']];

export default function AgIntelligence(){
  const [tab,setTab]=useState('leads');
  const [commodity,setCommodity]=useState('TOMATOES');
  const [state,setState]=useState('CA');
  const [year,setYear]=useState(String(new Date().getFullYear()-1));
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [leads,setLeads]=useState(null);
  const [snapshot,setSnapshot]=useState(null);
  const [prices,setPrices]=useState(null);
  const [acreage,setAcreage]=useState(null);
  const [counties,setCounties]=useState(null);

  const go=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      let url='';
      if(tab==='leads')    url=`${API}/api/nass/leads?state=${state}&commodity=${commodity}`;
      if(tab==='snapshot') url=`${API}/api/nass/snapshot?commodity=${commodity}`;
      if(tab==='prices')   url=`${API}/api/nass/prices?commodity=${commodity}&state=${state}&year=${year}`;
      if(tab==='acreage')  url=`${API}/api/nass/acreage?commodity=${commodity}&state=${state}&year=${year}`;
      if(tab==='counties') url=`${API}/api/nass/counties?commodity=${commodity}&state=${state}`;
      const r=await fetch(url);
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const d=await r.json();
      if(tab==='leads')    setLeads(d);
      if(tab==='snapshot') setSnapshot(d);
      if(tab==='prices')   setPrices(d);
      if(tab==='acreage')  setAcreage(d);
      if(tab==='counties') setCounties(d);
    }catch(e){setError(e.message);}
    setLoading(false);
  },[tab,commodity,state,year]);

  useEffect(()=>{go();},[tab]);

  const Row=({cells})=>(
    <tr onMouseEnter={e=>e.currentTarget.style.background='rgba(203,166,88,0.04)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      {cells.map((c,i)=><td key={i} style={{...S.td,...(c.style||{})}}>{c.val}</td>)}
    </tr>
  );

  return(
    <div style={{padding:16,background:dark,minHeight:'100vh',fontFamily:'system-ui,sans-serif'}}>

      {/* HEADER */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontWeight:900,fontSize:16,color:gold,letterSpacing:'0.08em'}}>USDA NASS INTELLIGENCE</div>
          <div style={{color:plat,fontSize:10,marginTop:2}}>National Agricultural Statistics Service — 500+ Crops | Every US County | Grower Lead Engine</div>
          <div style={{color:plat,fontSize:9,marginTop:1}}>Key: 4F158DB1-85C2-3243-BFFA-58B53FB40D23 | quickstats.nass.usda.gov</div>
        </div>
        <button onClick={go} disabled={loading} style={{...S.btn,opacity:loading?0.5:1}}>{loading?'FETCHING NASS...':'RUN QUERY'}</button>
      </div>

      {/* CONTROLS */}
      <div style={{...S.card,marginBottom:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:10,alignItems:'flex-end'}}>
          <div><label style={S.label}>COMMODITY</label>
            <select value={commodity} onChange={e=>setCommodity(e.target.value)} style={S.sel}>
              {COMMODITIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={S.label}>STATE</label>
            <select value={state} onChange={e=>setState(e.target.value)} style={S.sel}>
              <option value="">ALL STATES</option>
              {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={S.label}>YEAR</label>
            <select value={year} onChange={e=>setYear(e.target.value)} style={S.sel}>
              {[2024,2023,2022,2021,2020,2019,2018].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={go} disabled={loading} style={{...S.btn,height:36,whiteSpace:'nowrap'}}>{loading?'LOADING...':'SEARCH'}</button>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
        {TABS.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{padding:'5px 14px',fontSize:10,fontWeight:700,cursor:'pointer',borderRadius:3,
              background:tab===k?'rgba(203,166,88,0.2)':'transparent',
              border:`1px solid ${tab===k?gold:'rgba(148,163,176,0.2)'}`,
              color:tab===k?gold:plat}}>
            {l}
          </button>
        ))}
      </div>

      {error&&<div style={{padding:'10px 14px',background:'rgba(203,166,88,0.1)',border:'1px solid rgba(203,166,88,0.3)',borderRadius:4,marginBottom:14,color:gold,fontSize:11}}>{error} — Check MiniAPI on port 4000.</div>}

      {/* GROWER LEADS */}
      {tab==='leads'&&leads&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
            {[[String(leads.count||0),'COUNTY RECORDS',gold],[leads.state||'ALL','STATE',silver],[commodity,'COMMODITY',plat]].map(([v,l,c])=>(
              <div key={l} style={{...S.card,textAlign:'center'}}><div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div><div style={{color:plat,fontSize:9,fontWeight:700,marginTop:3,letterSpacing:'0.06em'}}>{l}</div></div>
            ))}
          </div>
          <div style={S.card}>
            <div style={S.hdr}>GROWER OPERATIONS BY COUNTY — {commodity}</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>{['COUNTY','STATE','COMMODITY','OPERATIONS','YEAR'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {(leads.leads||[]).slice(0,100).map((r,i)=>(
                    <Row key={i} cells={[
                      {val:r.county,style:{fontWeight:700,color:gold}},
                      {val:r.state},
                      {val:r.commodity},
                      {val:r.operations,style:{fontWeight:900,color:silver}},
                      {val:r.year,style:{color:plat}},
                    ]}/>
                  ))}
                </tbody>
              </table>
              {!(leads.leads||[]).length&&<div style={{textAlign:'center',padding:30,color:plat,fontSize:11}}>No grower operations found. Try a different commodity or state.</div>}
            </div>
          </div>
        </div>
      )}

      {/* SNAPSHOT */}
      {tab==='snapshot'&&snapshot&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          {[['PRODUCTION',snapshot.production],['PRICE RECEIVED',snapshot.prices],['AREA PLANTED',snapshot.acreage]].map(([title,data])=>(
            <div key={title} style={S.card}>
              <div style={S.hdr}>{title}</div>
              {!(data||[]).length?<div style={{color:plat,fontSize:10}}>No data for {commodity}</div>
                :(data||[]).slice(0,15).map((r,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid rgba(148,163,176,0.07)'}}>
                    <div style={{color:plat,fontSize:10}}>{r.state_name||r.state_alpha}{r.county_name?` — ${r.county_name}`:''}</div>
                    <div style={{color:gold,fontSize:11,fontWeight:700}}>{r.Value} {r.unit_desc}</div>
                  </div>
                ))
              }
            </div>
          ))}
        </div>
      )}

      {/* PRICES */}
      {tab==='prices'&&prices&&(
        <div style={S.card}>
          <div style={S.hdr}>PRICE RECEIVED BY FARMERS — {commodity} | {state||'ALL'} | {year}</div>
          <div style={{marginBottom:12,color:plat,fontSize:10}}>{prices.count} records from USDA NASS Survey.</div>
          {!(prices.data||[]).length?<div style={{textAlign:'center',padding:30,color:plat,fontSize:11}}>No price data. Try a different year or state.</div>:(
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>{['STATE','COMMODITY','PERIOD','VALUE','UNIT','YEAR'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {(prices.data||[]).slice(0,80).map((r,i)=>(
                  <Row key={i} cells={[
                    {val:r.state_name,style:{fontWeight:700}},
                    {val:r.commodity_desc,style:{color:gold}},
                    {val:r.reference_period_desc},
                    {val:r.Value,style:{fontWeight:900,color:silver,fontSize:13}},
                    {val:r.unit_desc,style:{color:plat}},
                    {val:r.year,style:{color:plat}},
                  ]}/>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ACREAGE */}
      {tab==='acreage'&&acreage&&(
        <div style={S.card}>
          <div style={S.hdr}>AREA PLANTED — {commodity} | {state||'ALL'} | {year}</div>
          <div style={{marginBottom:12,color:plat,fontSize:10}}>Forward supply indicator 90-120 days. {acreage.count} records.</div>
          {!(acreage.data||[]).length?<div style={{textAlign:'center',padding:30,color:plat,fontSize:11}}>No acreage data for selected parameters.</div>:(
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>{['STATE','COMMODITY','ACRES PLANTED','UNIT','YEAR'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {(acreage.data||[]).slice(0,80).map((r,i)=>(
                  <Row key={i} cells={[
                    {val:r.state_name,style:{fontWeight:700,color:gold}},
                    {val:r.commodity_desc},
                    {val:r.Value,style:{fontWeight:900,color:silver,fontSize:13}},
                    {val:r.unit_desc,style:{color:plat}},
                    {val:r.year,style:{color:plat}},
                  ]}/>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* COUNTIES */}
      {tab==='counties'&&counties&&(
        <div style={S.card}>
          <div style={S.hdr}>COUNTY-LEVEL GROWER DISTRIBUTION — {commodity} | {state}</div>
          <div style={{color:plat,fontSize:10,marginBottom:12}}>USDA Census. High-density counties = prime outreach targets.</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8}}>
            {(counties.counties||[]).map((c,i)=>(
              <div key={i} style={{...S.card,padding:'10px 12px'}}>
                <div style={{fontWeight:800,color:gold,fontSize:12}}>{c.county}</div>
                <div style={{color:plat,fontSize:9}}>{c.state}</div>
                {(c.items||[]).map((item,j)=>(
                  <div key={j} style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                    <div style={{color:plat,fontSize:9}}>{item.stat}</div>
                    <div style={{color:silver,fontSize:10,fontWeight:700}}>{item.value}</div>
                  </div>
                ))}
              </div>
            ))}
            {!(counties.counties||[]).length&&<div style={{color:plat,fontSize:11,padding:20}}>No county data for {commodity} in {state}.</div>}
          </div>
        </div>
      )}

      {loading&&<div style={{textAlign:'center',padding:40,color:plat}}><div style={{fontSize:14,fontWeight:700,color:gold,marginBottom:8}}>QUERYING USDA NASS</div><div style={{fontSize:11}}>Fetching {commodity} data...</div></div>}

      <div style={{marginTop:20,padding:'8px 14px',background:'rgba(30,41,59,0.4)',border:'1px solid rgba(148,163,176,0.1)',borderRadius:4}}>
        <div style={{color:plat,fontSize:9}}>USDA NASS Quick Stats API | Key: 4F158DB1-85C2-3243-BFFA-58B53FB40D23 | Routes: /api/nass/leads | /api/nass/snapshot | /api/nass/prices | /api/nass/acreage | /api/nass/counties</div>
      </div>
    </div>
  );
}