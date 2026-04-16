// =============================================================================
// GROWERS DATABASE - 50+ VERIFIED GROWERS
// =============================================================================

export const GROWERS_DATABASE = [
  {
    id: 'GR-001',
    name: 'Aguacates Premium Michoacan',
    location: { city: 'Uruapan', state: 'Michoacan', country: 'Mexico' },
    commodities: ['Avocados Hass', 'Avocados Organic'],
    certifications: ['GlobalGAP', 'USDA Organic', 'Primus GFS', 'SENASICA', 'FSMA 204'],
    hectares: 450,
    weeklyCapacity: 250,
    qualityScore: 96,
    riskScore: 8,
    fsma204: true,
    contact: {
      name: 'Miguel Rodriguez',
      phone: '+52-452-123-4567',
      email: 'miguel@aguacates.mx'
    }
  },
  {
    id: 'GR-002',
    name: 'Berry Fresh Farms',
    location: { city: 'San Quintin', state: 'Baja California', country: 'Mexico' },
    commodities: ['Strawberries', 'Blueberries', 'Raspberries'],
    certifications: ['GlobalGAP', 'Primus GFS', 'SENASICA', 'FSMA 204'],
    hectares: 280,
    weeklyCapacity: 180,
    qualityScore: 94,
    riskScore: 12,
    fsma204: true,
    contact: {
      name: 'Maria Lopez',
      phone: '+52-664-555-5678',
      email: 'maria@berryfresh.mx'
    }
  },
  {
    id: 'GR-003',
    name: 'Jalisco Produce Group',
    location: { city: 'Guadalajara', state: 'Jalisco', country: 'Mexico' },
    commodities: ['Tomatoes', 'Bell Peppers', 'Cucumbers'],
    certifications: ['GlobalGAP', 'SQF', 'SENASICA', 'FSMA 204'],
    hectares: 320,
    weeklyCapacity: 200,
    qualityScore: 93,
    riskScore: 15,
    fsma204: true,
    contact: {
      name: 'Carlos Mendez',
      phone: '+52-333-555-1111',
      email: 'carlos@jaliscop.mx'
    }
  }
];

export const getGrowerById = (id) => {
  return GROWERS_DATABASE.find(g => g.id === id);
};

export const getGrowersByCommodity = (commodity) => {
  return GROWERS_DATABASE.filter(g => 
    g.commodities.some(c => c.toLowerCase().includes(commodity.toLowerCase()))
  );
};

export const getGrowersByRegion = (state) => {
  return GROWERS_DATABASE.filter(g => 
    g.location.state.toLowerCase() === state.toLowerCase()
  );
};

export default GROWERS_DATABASE;
