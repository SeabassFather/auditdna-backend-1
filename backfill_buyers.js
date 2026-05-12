const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:PMJobEqMsVuiwvFwHlHFUrGXarncSAQj@hopper.proxy.rlwy.net:55424/railway" });
const KW = {
  strawberry:["strawberry","fresa"],
  avocado:["avocado","aguacate"],
  tomato:["tomato","tomate"],
  lettuce:["lettuce","lechuga","romaine","iceberg","arugula","spinach","espinaca","mesclun"],
  carrot:["carrot","zanahoria"],
  beet:["beet","betabel","beets"],
  pepper:["pepper","chile","pimiento"],
  onion:["onion","cebolla"],
  garlic:["garlic","ajo"],
  broccoli:["broccoli","brocoli","broccolini"],
  cauliflower:["cauliflower","coliflor"],
  celery:["celery","apio"],
  cucumber:["cucumber","pepino"],
  zucchini:["zucchini","calabaza","squash"],
  grape:["grape","uva"],
  citrus:["lemon","lime","orange","grapefruit","limon","naranja","toronja","mandarin","tangerine"],
  berry:["blueberry","raspberry","blackberry","arandano","mora"],
  melon:["watermelon","cantaloupe","honeydew","melon","sandia"],
  mango:["mango"],
  banana:["banana","platano"],
  apple:["apple","manzana"],
  potato:["potato","papa","sweet potato","camote"],
  corn:["corn","maiz","elote"],
  asparagus:["asparagus","esparrago"],
  herb:["cilantro","basil","mint","parsley","oregano","albahaca"],
  ginger:["ginger","jengibre"],
  coconut:["coconut","coco"],
  produce:["produce","fruit","vegetable","fresh","organic","frutas","verduras"]
};
function detect(text){
  const t=String(text||"").toLowerCase();
  const found=new Set();
  for(const [tag,kws] of Object.entries(KW)){
    if(kws.some(k=>t.includes(k))) found.add(tag);
  }
  return[...found];
}
(async()=>{
  try{
    let tagged=0,skipped=0;
    console.log("Backfilling buyers...");
    const b=await p.query("SELECT b.id, COALESCE(b.legal_name,'') AS legal_name, COALESCE(b.trade_name,'') AS trade_name, COALESCE(b.product_specialties,'') AS product_specialties, COALESCE(b.buyer_type,'') AS buyer_type, COALESCE(b.primary_contact,'') AS primary_contact, COALESCE(b.email,'') AS email FROM buyers b LEFT JOIN contact_commodity_tags t ON t.contact_id::text = b.id::text AND t.contact_type='buyer' WHERE t.id IS NULL");
    console.log("Untagged buyers:",b.rows.length);
    for(const row of b.rows){
      const blob=[row.legal_name,row.trade_name,row.product_specialties,row.buyer_type,row.primary_contact,row.email].join(" ");
      const tags=detect(blob);
      if(tags.length===0){skipped++;continue;}
      for(const tag of tags){
        await p.query("INSERT INTO contact_commodity_tags (contact_id,contact_type,commodity,confidence,source,created_at) VALUES ($1,'buyer',$2,0.7,'auto-backfill',NOW())",[String(row.id),tag]);
        tagged++;
      }
    }
    console.log("=== DONE ===");
    console.log("Tags inserted:",tagged,"| Skipped:",skipped);
    const f=await p.query("SELECT commodity,contact_type,COUNT(*) AS count FROM contact_commodity_tags GROUP BY commodity,contact_type ORDER BY count DESC LIMIT 30");
    console.table(f.rows);
    const tot=await p.query("SELECT COUNT(*) AS total FROM contact_commodity_tags");
    console.log("TOTAL TAGS:",tot.rows[0].total);
    const byType=await p.query("SELECT contact_type,COUNT(DISTINCT contact_id) AS unique_contacts,COUNT(*) AS total_tags FROM contact_commodity_tags GROUP BY contact_type");
    console.table(byType.rows);
  }catch(e){console.error("ERR:",e.message);}
  p.end();
})();
