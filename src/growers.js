// =============================================================================
// GROWERS DATABASE - CM PRODUCTS INTERNATIONAL
// =============================================================================
// Generates 55 growers across Mexico, Peru, Chile
// Used by usdaRegistry.js and other routes
// =============================================================================

export function generateGrowersDatabase() {
  const mexicoStates = ['Michoacan', 'Jalisco', 'Nayarit', 'Mexico', 'Morelos', 'Sinaloa', 'Baja California'];
  const peruRegions = ['La Libertad', 'Lima', 'Ica', 'Ancash', 'Lambayeque'];
  const chileRegions = ['Valparaiso', 'Metropolitana', 'O\'Higgins'];
  const sizes = ['Small', 'Medium', 'Large', 'Very Large'];
  const certs = ['USDA Organic', 'GlobalGAP', 'Fair Trade', 'Rainforest Alliance', 'Primus GFS', 'SMETA', 'FSMA 204', 'SENASICA', 'HACCP', 'BRC', 'SQF'];
  const commodities = ['Avocados', 'Limes', 'Mangoes', 'Berries', 'Tomatoes', 'Peppers'];
  
  const growers = [];
  
  // MEXICO GROWERS (25)
  for (let i = 1; i <= 25; i++) {
    growers.push({
      id: `GR-MX-${String(i).padStart(3, '0')}`,
      name: `Aguacates de Mexico ${i}`,
      country: 'Mexico',
      region: mexicoStates[i % mexicoStates.length],
      products: i % 3 === 0 ? ['Limes'] : ['Avocados'],
      size: sizes[Math.floor(Math.random() * sizes.length)],
      acres: Math.floor(Math.random() * 3000) + 200,
      hectares: Math.floor((Math.random() * 3000 + 200) * 0.4047),
      annualVolume: `${Math.floor(Math.random() * 50) + 10}M lbs`,
      weeklyCapacity: Math.floor(Math.random() * 200) + 50,
      certifications: certs.slice(0, Math.floor(Math.random() * 4) + 3),
      contact: {
        email: `grower${i}@mexicoavocados.com`,
        phone: `+52 443 ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        name: `Contact ${i}`,
        whatsapp: `+52 443 ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`
      },
      established: 1990 + Math.floor(Math.random() * 30),
      compliance: {
        status: Math.random() > 0.2 ? 'Compliant' : 'Pending',
        fsma204: Math.random() > 0.3,
        globalGap: Math.random() > 0.2,
        organic: Math.random() > 0.5,
        score: Math.floor(Math.random() * 20) + 80
      },
      qualityScore: Math.floor(Math.random() * 15) + 85,
      riskScore: Math.floor(Math.random() * 30) + 5,
      onTimeDelivery: Math.floor(Math.random() * 10) + 90,
      location: {
        city: mexicoStates[i % mexicoStates.length],
        state: mexicoStates[i % mexicoStates.length],
        country: 'Mexico',
        coordinates: {
          lat: 19 + Math.random() * 3,
          lng: -102 - Math.random() * 3
        }
      }
    });
  }
  
  // PERU GROWERS (20)
  for (let i = 26; i <= 45; i++) {
    growers.push({
      id: `GR-PE-${String(i - 25).padStart(3, '0')}`,
      name: `Paltas del Peru ${i - 25}`,
      country: 'Peru',
      region: peruRegions[(i - 26) % peruRegions.length],
      products: i % 2 === 0 ? ['Avocados'] : ['Mangoes'],
      size: sizes[Math.floor(Math.random() * sizes.length)],
      acres: Math.floor(Math.random() * 2500) + 150,
      hectares: Math.floor((Math.random() * 2500 + 150) * 0.4047),
      annualVolume: `${Math.floor(Math.random() * 40) + 8}M lbs`,
      weeklyCapacity: Math.floor(Math.random() * 150) + 40,
      certifications: certs.slice(0, Math.floor(Math.random() * 4) + 3),
      contact: {
        email: `grower${i}@peruavocados.com`,
        phone: `+51 1 ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        name: `Contact ${i}`,
        whatsapp: `+51 1 ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`
      },
      established: 1995 + Math.floor(Math.random() * 25),
      compliance: {
        status: Math.random() > 0.15 ? 'Compliant' : 'Pending',
        fsma204: Math.random() > 0.4,
        globalGap: Math.random() > 0.3,
        organic: Math.random() > 0.6,
        score: Math.floor(Math.random() * 20) + 75
      },
      qualityScore: Math.floor(Math.random() * 15) + 80,
      riskScore: Math.floor(Math.random() * 35) + 10,
      onTimeDelivery: Math.floor(Math.random() * 15) + 85,
      location: {
        city: peruRegions[(i - 26) % peruRegions.length],
        state: peruRegions[(i - 26) % peruRegions.length],
        country: 'Peru',
        coordinates: {
          lat: -8 - Math.random() * 4,
          lng: -77 - Math.random() * 2
        }
      }
    });
  }
  
  // CHILE GROWERS (10)
  for (let i = 46; i <= 55; i++) {
    growers.push({
      id: `GR-CL-${String(i - 45).padStart(3, '0')}`,
      name: `Paltas Chilenas ${i - 45}`,
      country: 'Chile',
      region: chileRegions[(i - 46) % chileRegions.length],
      products: ['Avocados'],
      size: sizes[Math.floor(Math.random() * sizes.length)],
      acres: Math.floor(Math.random() * 2000) + 100,
      hectares: Math.floor((Math.random() * 2000 + 100) * 0.4047),
      annualVolume: `${Math.floor(Math.random() * 30) + 5}M lbs`,
      weeklyCapacity: Math.floor(Math.random() * 120) + 30,
      certifications: certs.slice(0, Math.floor(Math.random() * 4) + 3),
      contact: {
        email: `grower${i}@chileavocados.com`,
        phone: `+56 2 ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        name: `Contact ${i}`,
        whatsapp: `+56 2 ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`
      },
      established: 1985 + Math.floor(Math.random() * 35),
      compliance: {
        status: Math.random() > 0.1 ? 'Compliant' : 'Pending',
        fsma204: Math.random() > 0.5,
        globalGap: Math.random() > 0.25,
        organic: Math.random() > 0.7,
        score: Math.floor(Math.random() * 15) + 85
      },
      qualityScore: Math.floor(Math.random() * 10) + 90,
      riskScore: Math.floor(Math.random() * 25) + 5,
      onTimeDelivery: Math.floor(Math.random() * 8) + 92,
      location: {
        city: chileRegions[(i - 46) % chileRegions.length],
        state: chileRegions[(i - 46) % chileRegions.length],
        country: 'Chile',
        coordinates: {
          lat: -33 - Math.random() * 2,
          lng: -70 - Math.random() * 1
        }
      }
    });
  }
  
  return growers;
}

// Helper functions
export function getGrowerById(id) {
  const db = generateGrowersDatabase();
  return db.find(g => g.id === id);
}

export function getGrowersByCommodity(commodity) {
  const db = generateGrowersDatabase();
  return db.filter(g => 
    g.products.some(p => p.toLowerCase().includes(commodity.toLowerCase()))
  );
}

export function getGrowersByCountry(country) {
  const db = generateGrowersDatabase();
  return db.filter(g => 
    g.country.toLowerCase() === country.toLowerCase()
  );
}

export function getGrowersByRegion(region) {
  const db = generateGrowersDatabase();
  return db.filter(g => 
    g.region.toLowerCase().includes(region.toLowerCase())
  );
}

export function getGrowersByCertification(cert) {
  const db = generateGrowersDatabase();
  return db.filter(g => 
    g.certifications.some(c => c.toLowerCase().includes(cert.toLowerCase()))
  );
}

export function getCompliantGrowers() {
  const db = generateGrowersDatabase();
  return db.filter(g => g.compliance.status === 'Compliant');
}

// Export database
export const GROWERS_DATABASE = generateGrowersDatabase();

export default {
  generateGrowersDatabase,
  getGrowerById,
  getGrowersByCommodity,
  getGrowersByCountry,
  getGrowersByRegion,
  getGrowersByCertification,
  getCompliantGrowers,
  GROWERS_DATABASE
};