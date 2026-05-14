// seed-we-link-suppliers.js
// Save to: C:\AuditDNA\backend\seed-we-link-suppliers.js
const { Pool } = require('./node_modules/pg');
const pool = new Pool({ connectionString: process.env.DB_URL });

const suppliers = [
  { company_name:'Agri-Supply Mexicali', category:'Seeds + Inputs', region:'Mexicali Valley', discount_pct:15, products:['Broccoli seed','Fertilizer','Drip tape','Herbicide'], contact_name:'Carlos Mendez', contact_phone:'+52-686-500-1234', contact_email:'ventas@agrisupply-mxl.com', description:'Full-service agricultural supply. Specializes in Mexicali Valley row crops.' },
  { company_name:'Pacific Cold Chain', category:'Logistics + Cooling', region:'Baja California / SoCal', discount_pct:10, products:['Reefer transport','Cold storage','Cross-dock','Pre-cooling'], contact_name:'Roberto Fuentes', contact_phone:'+52-664-300-5678', contact_email:'ops@pacificcoldchain.com', description:'US-Mexico reefer logistics. Otay Mesa + Calexico crossing specialists.' },
  { company_name:'BioSeed Baja', category:'Organic Seeds', region:'Baja California', discount_pct:12, products:['Organic lettuce seed','Organic spinach','Heirloom varieties','Cover crops'], contact_name:'Ana Gutierrez', contact_phone:'+52-646-100-2345', contact_email:'info@bioseebdbaja.com', description:'Certified organic seed supplier. Ensenada valley specialists.' },
  { company_name:'IrriTech Sonora', category:'Irrigation Equipment', region:'Sonora / Yuma Corridor', discount_pct:8, products:['Drip systems','Pivot irrigation','Filters','Timers'], contact_name:'Miguel Torres', contact_phone:'+52-622-400-3456', contact_email:'sales@irrigtech-sonora.com', description:'Irrigation solutions for desert ag. US + Mexico installations.' },
  { company_name:'AgroBank Mexicali', category:'Agricultural Financing', region:'Mexicali Valley', discount_pct:0, products:['Crop loans','Equipment financing','Line of credit','Factoring'], contact_name:'Patricia Rios', contact_phone:'+52-686-200-4567', contact_email:'agro@agrobank-mxl.com', description:'Local agricultural bank. Specializes in US-Mexico corridor grower financing. MFG preferred partner.' },
  { company_name:'SENASICA Fast-Track', category:'Compliance + Certification', region:'National', discount_pct:20, products:['FSMA consulting','GlobalGAP','Organic certification','Phytosanitary'], contact_name:'Dr. Ernesto Vega', contact_phone:'+52-55-5000-6789', contact_email:'consulta@senasicarapido.com', description:'Accelerated ag compliance consulting. 90-day FSMA certification programs.' },
  { company_name:'MFG Packaging Co.', category:'Packaging + Cold Pack', region:'Salinas / Baja Corridor', discount_pct:18, products:['Cartons','Film','Clamshells','Labels','Pallet wrap'], contact_name:'Saul Garcia', contact_phone:'+1-831-251-3116', contact_email:'saul@mexausafg.com', description:'MFG preferred packaging partner. Volume discounts for WE LINK partners.' },
];

async function seed() {
  for (const s of suppliers) {
    await pool.query(
      "INSERT INTO we_link_suppliers (company_name,category,region,discount_pct,products,contact_name,contact_phone,contact_email,description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING",
      [s.company_name, s.category, s.region, s.discount_pct, s.products, s.contact_name, s.contact_phone, s.contact_email, s.description]
    );
    console.log('Seeded:', s.company_name);
  }
  pool.end();
}
seed().catch(e => { console.error(e.message); pool.end(); });
