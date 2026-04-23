'use strict';
const ROLE_RULES = [
  { role: 'chain_store', keywords: ['walmart','costco','kroger','albertsons','safeway','vons','ralphs','whole foods','trader joe','target','heb','publix','wegmans','food lion','sprouts','aldi','cardenas','vallarta','superior','chedraui','soriana'], weight: 10 },
  { role: 'wholesaler', keywords: ['wholesale','wholesaler','foodservice','restaurant depot','us foods','sysco','gfs','gordon food','performance food'], weight: 8 },
  { role: 'distributor', keywords: ['distributor','distribution','distribuidor','dist.','distributing'], weight: 7 },
  { role: 'importer', keywords: ['importer','imports','import','importador','importaciones','trading','trade co','international'], weight: 6 },
  { role: 'packer', keywords: ['packing','packer','packinghouse','empaque','empacadora','cooling','precooler'], weight: 6 },
  { role: 'shipper', keywords: ['shipper','shipping','transport','trucking','freight','logistics','carrier','broker','forwarding'], weight: 5 },
  { role: 'grower', keywords: ['farms','farm','ranch','rancho','grower','produce co','produce inc','orchard','huerta','productor','agricola','agricultural','harvester'], weight: 4 },
  { role: 'buyer', keywords: ['buyer','procurement','purchasing','category manager','sourcing','comprador'], weight: 3 },
  { role: 'retailer', keywords: ['market','mercado','tienda','grocery','supermarket','supermercado','deli'], weight: 2 },
];
const DOMAIN_MAP = {
  'walmart.com':'chain_store','costco.com':'chain_store','kroger.com':'chain_store','albertsons.com':'chain_store',
  'safeway.com':'chain_store','wholefoods.com':'chain_store','target.com':'chain_store','heb.com':'chain_store',
  'publix.com':'chain_store','wegmans.com':'chain_store','sprouts.com':'chain_store','traderjoes.com':'chain_store',
  'cardenasmarkets.com':'chain_store','vallartasupermarkets.com':'chain_store','chedraui.com.mx':'chain_store',
  'soriana.com':'chain_store','sysco.com':'wholesaler','usfoods.com':'wholesaler','gfs.com':'wholesaler','pfgc.com':'wholesaler',
};
const COMMODITY_KEYWORDS = {
  'Avocados':['avocado','aguacate','hass','guacamole'],
  'Berries':['berry','berries','strawberry','blueberry','raspberry','blackberry','fresa','arandano','frambuesa','mora'],
  'Tomatoes':['tomato','tomatoes','tomate','roma','cherry tomato','grape tomato','beefsteak','tomatillo'],
  'Peppers':['pepper','peppers','bell pepper','jalapeno','habanero','serrano','poblano','chile','pimiento'],
  'Citrus':['citrus','lime','lemon','orange','grapefruit','limon','naranja','toronja'],
  'Tropical':['mango','papaya','pineapple','banana','plantain','dragon fruit','pitaya','platano','pina'],
  'Cucumbers':['cucumber','pepino','english cucumber','persian'],
  'Squash':['squash','zucchini','chayote','calabacin','calabaza'],
  'Leafy Greens':['lettuce','romaine','iceberg','spring mix','kale','spinach','cabbage','lechuga','espinaca'],
  'Herbs':['cilantro','parsley','basil','herb','perejil','albahaca','hierbas'],
  'Onions':['onion','garlic','cebolla','ajo','green onion','scallion'],
  'Asparagus':['asparagus','esparrago'],
  'Grapes':['grape','uva','table grape'],
  'Melons':['melon','cantaloupe','honeydew','watermelon','sandia'],
  'Root Veg':['carrot','jicama','ginger','yam','sweet potato','zanahoria','camote','jengibre'],
  'Brassica':['broccoli','cauliflower','brussels','brocoli','coliflor'],
  'Beans':['bean','green bean','sugar snap','ejote','judia'],
  'Corn':['corn','maiz','sweet corn','elote'],
  'Eggplant':['eggplant','berenjena'],
  'Mushrooms':['mushroom','shiitake','portobello','hongo','champinon'],
  'Potatoes':['potato','russet','papa'],
  'Specialty':['dates','pecans','medjool','date','pecan','nuez','datil'],
  'Stone Fruit':['cherry','peach','plum','nectarine','apricot','cereza','durazno','ciruela'],
  'Tree Fruit':['apple','pear','fuji','gala','honeycrisp','anjou','manzana','pera'],
};
const US_STATES = {
  'CA':['california','salinas','watsonville','oxnard','fresno','bakersfield','los angeles','san diego','san francisco','sacramento','stockton','modesto','riverside','santa maria','monterey'],
  'AZ':['arizona','nogales','phoenix','tucson','yuma'],
  'TX':['texas','mcallen','pharr','laredo','houston','dallas','el paso','san antonio','austin','brownsville'],
  'FL':['florida','miami','tampa','orlando','jacksonville','homestead','immokalee'],
  'WA':['washington','seattle','yakima','wenatchee','spokane'],
  'OR':['oregon','portland','hood river','salem'],
  'NY':['new york','nyc','bronx','hunts point','queens','brooklyn','long island','manhattan'],
  'NJ':['new jersey','newark','jersey city'],
  'IL':['illinois','chicago'],
  'GA':['georgia','atlanta','savannah'],
  'NC':['north carolina','charlotte','raleigh','durham'],
  'PA':['pennsylvania','philadelphia','philly','pittsburgh'],
  'MI':['michigan','detroit','grand rapids'],
  'CO':['colorado','denver','aurora','colorado springs'],
  'NV':['nevada','las vegas','reno'],
};
const MX_STATES = {
  'Michoacan':['michoacan','uruapan','peribán','tancitaro','periban'],
  'Jalisco':['jalisco','guadalajara','tepatitlan','zapopan'],
  'Sinaloa':['sinaloa','culiacan','los mochis','mazatlan','guasave'],
  'Baja California':['baja california','ensenada','tijuana','mexicali','san quintin','rosarito','tecate','maneadero'],
  'Baja California Sur':['baja california sur','la paz','los cabos','cabo','san jose del cabo'],
  'Sonora':['sonora','hermosillo','caborca','guaymas','obregon','navojoa'],
  'Chihuahua':['chihuahua','juarez','cuauhtemoc','delicias'],
  'Veracruz':['veracruz','xalapa','cordoba','orizaba'],
  'Nayarit':['nayarit','tepic','bahia de banderas'],
  'Guanajuato':['guanajuato','leon','irapuato','celaya','silao'],
  'Chiapas':['chiapas','tuxtla','tapachula'],
  'Yucatan':['yucatan','merida'],
  'Tamaulipas':['tamaulipas','reynosa','matamoros','tampico'],
  'Puebla':['puebla','atlixco','tehuacan'],
  'Colima':['colima','manzanillo','tecoman'],
};
const COUNTRY_RULES = [
  { code:'MX', keywords:['mexico','méxico','baja','sinaloa','michoacan','jalisco','sonora','chihuahua','guanajuato','chiapas'], phonePrefix:['+52','52 '] },
  { code:'USA', keywords:['usa','united states','california','texas','florida','washington','oregon','arizona','new york'], phonePrefix:['+1','1-'] },
  { code:'CAN', keywords:['canada','canadian','toronto','vancouver','montreal','ontario'], phonePrefix:['+1'] },
  { code:'PER', keywords:['peru','peruvian','lima','chincha','ica'], phonePrefix:['+51'] },
  { code:'CHL', keywords:['chile','chilean','santiago','valparaiso'], phonePrefix:['+56'] },
  { code:'COL', keywords:['colombia','colombian','bogota','medellin'], phonePrefix:['+57'] },
  { code:'GTM', keywords:['guatemala','guatemalan'], phonePrefix:['+502'] },
  { code:'CRI', keywords:['costa rica','costarican'], phonePrefix:['+506'] },
  { code:'ECU', keywords:['ecuador','ecuadorian','guayaquil','quito'], phonePrefix:['+593'] },
  { code:'HND', keywords:['honduras','honduran'], phonePrefix:['+504'] },
];
function normalize(t){return String(t||'').toLowerCase().trim();}
function emailDomain(e){const m=String(e||'').toLowerCase().match(/@([^>\s]+)/);return m?m[1].trim():'';}
function classifyRole(c){
  const blob=normalize([c.name,c.company,c.email,c.title,c.notes,c.signature].filter(Boolean).join(' '));
  const dom=emailDomain(c.email);
  if(DOMAIN_MAP[dom])return{role:DOMAIN_MAP[dom],confidence:0.95,method:'domain'};
  let best={role:'unclassified',score:0,confidence:0};
  for(const rule of ROLE_RULES){
    let score=0;
    for(const kw of rule.keywords){if(blob.includes(kw))score+=rule.weight;}
    if(score>best.score)best={role:rule.role,score,confidence:Math.min(0.9,0.3+score/30),method:'keyword'};
  }
  return best;
}
function classifyCommodities(c){
  const blob=normalize([c.name,c.company,c.notes,c.signature,c.title].filter(Boolean).join(' '));
  const matched=[];
  for(const[cat,kws]of Object.entries(COMMODITY_KEYWORDS)){
    for(const kw of kws){if(blob.includes(kw)){matched.push(cat);break;}}
  }
  return matched;
}
function classifyState(c){
  const blob=normalize([c.address,c.company,c.notes,c.city,c.state].filter(Boolean).join(' '));
  for(const[code,kws]of Object.entries(US_STATES)){
    for(const kw of kws){const re=new RegExp(`(^|[^a-z])${kw}([^a-z]|$)`,'i');if(re.test(blob))return{state:code,country:'USA'};}
  }
  for(const[name,kws]of Object.entries(MX_STATES)){
    for(const kw of kws){if(blob.includes(kw))return{state:name,country:'MX'};}
  }
  return{state:null,country:null};
}
function classifyCountry(c,hint){
  if(hint&&hint.country)return hint.country;
  const blob=normalize([c.address,c.company,c.notes,c.city,c.country].filter(Boolean).join(' '));
  const phone=String(c.phone||c.mobile||'').trim();
  for(const rule of COUNTRY_RULES){for(const pfx of(rule.phonePrefix||[])){if(phone.startsWith(pfx))return rule.code;}}
  for(const rule of COUNTRY_RULES){for(const kw of rule.keywords){if(blob.includes(kw))return rule.code;}}
  const dom=emailDomain(c.email);
  if(dom.endsWith('.mx'))return'MX';
  if(dom.endsWith('.ca'))return'CAN';
  if(dom.endsWith('.pe'))return'PER';
  if(dom.endsWith('.cl'))return'CHL';
  if(dom.endsWith('.co'))return'COL';
  return'USA';
}
function classifyHeat(c){
  const now=Date.now();
  const last=c.last_contacted?new Date(c.last_contacted).getTime():0;
  const days=last?(now-last)/86400000:9999;
  const opens=Number(c.open_count||0);
  const replies=Number(c.reply_count||0);
  if(replies>=1||(opens>=3&&days<14))return'HOT';
  if(opens>=1||days<30)return'WARM';
  return'COLD';
}
function classifyContact(c){
  if(!c)return null;
  const r=classifyRole(c);
  const comm=classifyCommodities(c);
  const st=classifyState(c);
  const ct=classifyCountry(c,st);
  const ht=classifyHeat(c);
  return{role:r.role,role_confidence:r.confidence,role_method:r.method,commodities:comm,state:st.state,country:ct,heat:ht};
}
function classifyBatch(contacts){
  const results=[];
  const stats={total:contacts.length,by_role:{},by_commodity:{},by_country:{},by_heat:{HOT:0,WARM:0,COLD:0}};
  for(const c of contacts){
    const t=classifyContact(c);
    if(!t)continue;
    results.push({...c,...t});
    stats.by_role[t.role]=(stats.by_role[t.role]||0)+1;
    stats.by_country[t.country]=(stats.by_country[t.country]||0)+1;
    stats.by_heat[t.heat]++;
    for(const com of t.commodities){stats.by_commodity[com]=(stats.by_commodity[com]||0)+1;}
  }
  return{results,stats};
}
function matchBuyersForInventory(contacts,item){
  const wanted=item.commodity_category;
  if(!wanted)return[];
  const isBuyer=(c)=>['buyer','chain_store','wholesaler','distributor','importer','retailer'].includes(c.role);
  const hasComm=(c)=>!c.commodities||!c.commodities.length||c.commodities.includes(wanted);
  return contacts.filter(c=>isBuyer(c)&&hasComm(c)&&c.email);
}
module.exports={classifyContact,classifyBatch,matchBuyersForInventory,ROLE_RULES,COMMODITY_KEYWORDS,US_STATES,MX_STATES};
