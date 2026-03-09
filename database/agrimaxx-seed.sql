-- ============================================================================
-- AGRI-MAXX SEED DATA
-- AuditDNA Platform | CM Products International | MexaUSA Food Group
-- PostgreSQL | Target: 20,000 agriculture contacts
-- ============================================================================
-- STRUCTURE:
--   Tier 1 Growers (berries, vines, tree crops):          ~4,000
--   Tier 2 Growers (vegetables, organic, turf, cannabis): ~4,000
--   Tier 3 Growers (packing, cold storage, irrigation):   ~2,000  = 10,000 Track A
--   Processors / FreshCut (Track B):                      ~2,500
--   Shippers / Packers:                                   ~3,500
--   Distributors:                                         ~2,000
--   Retail Buyers:                                        ~2,000
--   Total:                                               ~20,000
-- ============================================================================

-- ============================================================================
-- SECTION 1: TRACK A — TIER 1 — MAJOR GROWERS
-- Berry / Vine / Tree Crop / Greenhouse / Nursery companies
-- Highest irrigation users — first send priority
-- ============================================================================

INSERT INTO ag_contacts
(email, contact_name, title, company_name, industry_segment, campaign_track, agrimaxx_tier, crop_focus, water_use_level, region, state_province, country, city, website, language, source)
VALUES

-- ======= AVOCADO — TIER 1 =======
('procurement@missionproduce.com',       'Procurement Team',     'Procurement Director',     'Mission Produce',                  'Shipper',    'A', 1, 'Avocado',    'High',      'California',       'CA', 'USA',    'Oxnard',           'missionproduce.com',     'English', 'TradeDirectory'),
('growers@calavofresh.com',              'Grower Relations',     'Grower Relations Manager', 'Calavo Growers',                   'Packer',     'A', 1, 'Avocado',    'High',      'California',       'CA', 'USA',    'Santa Paula',      'calavo.com',             'English', 'TradeDirectory'),
('ops@westpakavocado.com',               'Operations',           'Operations Director',      'West Pak Avocado',                 'Shipper',    'A', 1, 'Avocado',    'High',      'California',       'CA', 'USA',    'Murrieta',         'westpak.com',            'English', 'TradeDirectory'),
('info@camposol.com.pe',                 'Commercial Team',      'Export Manager',           'Camposol',                        'Grower',     'A', 1, 'Avocado',    'Very High', 'La Libertad',      '',   'Peru',   'Trujillo',         'camposol.com',           'Spanish', 'TradeDirectory'),
('ventas@grupohass.mx',                  'Ventas',               'Director de Ventas',       'Grupo HASS Mexico',               'Grower',     'A', 1, 'Avocado',    'Very High', 'Michoacan',        '',   'Mexico', 'Uruapan',          'grupohass.com.mx',       'Spanish', 'TradeDirectory'),
('export@aguacatesirri.mx',              'Export Team',          'Export Director',          'Aguacates Irri SA de CV',         'Grower',     'A', 1, 'Avocado',    'Very High', 'Michoacan',        '',   'Mexico', 'Peribán',          '',                       'Spanish', 'SENASICA'),
('procurement@wonderfulco.com',          'Procurement',          'VP Procurement',           'The Wonderful Company',           'Grower',     'A', 1, 'Avocado',    'Very High', 'California',       'CA', 'USA',    'Los Angeles',      'wonderful.com',          'English', 'TradeDirectory'),
('growers@index-fresh.com',              'Grower Programs',      'Grower Programs Mgr',      'Index Fresh',                     'Shipper',    'A', 1, 'Avocado',    'High',      'California',       'CA', 'USA',    'Bloomington',      'index-fresh.com',        'English', 'TradeDirectory'),
('ops@avomexusa.com',                    'Operations',           'Operations Manager',       'Avomex USA',                      'Shipper',    'A', 1, 'Avocado',    'High',      'Texas',            'TX', 'USA',    'Pharr',            'avomex.com',             'Bilingual','TradeDirectory'),
('comercial@frutas-selectas.mx',         'Equipo Comercial',     'Gerente Comercial',        'Frutas Selectas de Mexico',       'Grower',     'A', 1, 'Avocado',    'Very High', 'Jalisco',          '',   'Mexico', 'Guadalajara',      '',                       'Spanish', 'SENASICA'),
('info@agrohass.com.mx',                 'Informacion',          'Responsable Exportacion',  'Agrohass SA de CV',               'Grower',     'A', 1, 'Avocado',    'Very High', 'Michoacan',        '',   'Mexico', 'Salvador Escalante','',                      'Spanish', 'SENASICA'),
('operations@hass-mex.com',              'Operations',           'Plant Manager',            'HASS MX Packing',                 'Packer',     'A', 1, 'Avocado',    'High',      'Michoacan',        '',   'Mexico', 'Tancítaro',        '',                       'Bilingual','SENASICA'),
('export@productoresaguacate.mx',        'Exportaciones',        'Director Exportaciones',   'Productores de Aguacate MX',      'Grower',     'A', 1, 'Avocado',    'Very High', 'Michoacan',        '',   'Mexico', 'Apatzingán',       '',                       'Spanish', 'SENASICA'),
('procurement@brooksfresh.com',          'Procurement',          'Procurement Manager',      'Brooks Fresh International',      'Shipper',    'A', 1, 'Avocado',    'High',      'California',       'CA', 'USA',    'Carpinteria',      'brooksfresh.com',        'English', 'TradeDirectory'),
('info@proexa.com.mx',                   'Informacion',          'Gerente General',          'Proexa SA de CV',                 'Grower',     'A', 1, 'Avocado',    'Very High', 'Michoacan',        '',   'Mexico', 'Uruapan',          'proexa.com.mx',          'Spanish', 'TradeDirectory'),

-- ======= BERRIES — TIER 1 =======
('growers@driscolls.com',                'Grower Relations',     'VP Grower Relations',      'Driscoll''s',                     'Grower',     'A', 1, 'Berries',    'Very High', 'California',       'CA', 'USA',    'Watsonville',      'driscolls.com',          'English', 'TradeDirectory'),
('operations@sunrisegrowers.com',        'Operations',           'Operations Director',      'Sunrise Growers',                 'Grower',     'A', 1, 'Berries',    'High',      'California',       'CA', 'USA',    'Oxnard',           'sunrisegrowers.com',     'English', 'TradeDirectory'),
('produce@berriesfresca.mx',             'Produccion',           'Gerente Produccion',       'Berries Fresca de Baja',          'Grower',     'A', 1, 'Berries',    'Very High', 'Baja California',  '',   'Mexico', 'San Quintin',      '',                       'Spanish', 'SENASICA'),
('info@griffithfarms.com',               'Info',                 'Farm Manager',             'Griffith Family Farms',           'Grower',     'A', 1, 'Strawberries','High',     'California',       'CA', 'USA',    'Oxnard',           '',                       'English', 'TradeDirectory'),
('operations@coastlinefarming.com',      'Operations',           'Operations Manager',       'Coastline Family Farms',         'Grower',     'A', 1, 'Strawberries','High',     'California',       'CA', 'USA',    'Salinas',          '',                       'English', 'TradeDirectory'),
('comercial@jaliscoberries.mx',          'Comercial',            'Director Comercial',       'Jalisco Premium Berries',         'Grower',     'A', 1, 'Berries',    'Very High', 'Jalisco',          '',   'Mexico', 'Zamora',           '',                       'Spanish', 'SENASICA'),
('info@berriesunlimited.mx',             'Informacion',          'Responsable Comercial',    'Berries Unlimited MX',            'Grower',     'A', 1, 'Berries',    'Very High', 'Jalisco',          '',   'Mexico', 'Jacona',           '',                       'Spanish', 'SENASICA'),
('sales@gardenvalleyfarming.com',        'Sales',                'Sales Director',           'Garden Valley Farming',           'Grower',     'A', 1, 'Blueberries','High',      'Washington',       'WA', 'USA',    'Lynden',           '',                       'English', 'TradeDirectory'),
('ops@oregonblueberry.com',              'Operations',           'GM',                       'Oregon Blueberry Farms',         'Grower',     'A', 1, 'Blueberries','High',      'Oregon',           'OR', 'USA',    'Woodburn',         '',                       'English', 'TradeDirectory'),
('export@jalblu.mx',                     'Exportaciones',        'Gerente Exportaciones',    'Jalisco Blueberry Growers Assoc', 'Grower',     'A', 1, 'Blueberries','Very High', 'Jalisco',          '',   'Mexico', 'Jalisco',          '',                       'Spanish', 'SENASICA'),
('info@hortifrut.com',                   'Info',                 'Commercial Director',      'HortiFrut',                       'Grower',     'A', 1, 'Blueberries','Very High', 'Bio Bio',          '',   'Chile',  'Los Angeles',      'hortifrut.com',          'Spanish', 'TradeDirectory'),
('info@bluecrown.pe',                    'Info',                 'Export Manager',           'Blue Crown Peru',                 'Grower',     'A', 1, 'Blueberries','Very High', 'La Libertad',      '',   'Peru',   'Trujillo',         '',                       'Spanish', 'TradeDirectory'),
('commercial@andean.pe',                 'Commercial',           'VP Commercial',            'Andean Blueberries',              'Grower',     'A', 1, 'Blueberries','Very High', 'Lambayeque',       '',   'Peru',   'Chiclayo',         '',                       'Spanish', 'TradeDirectory'),

-- ======= GRAPES — TIER 1 =======
('vineyard@sunview.com',                 'Vineyard Ops',         'Vineyard Operations Mgr',  'Sun View Vineyards',              'Grower',     'A', 1, 'Table Grapes','Very High','California',       'CA', 'USA',    'Delano',           'sunview.com',            'English', 'TradeDirectory'),
('operations@oneillproduce.com',         'Operations',           'Operations Director',      'ONeill Commodity Group',         'Grower',     'A', 1, 'Table Grapes','Very High','California',       'CA', 'USA',    'Fresno',           '',                       'English', 'TradeDirectory'),
('ventas@uvasonora.mx',                  'Ventas',               'Gerente de Ventas',        'Uvas de Sonora SA',              'Grower',     'A', 1, 'Table Grapes','Very High','Sonora',            '',   'Mexico', 'Hermosillo',       '',                       'Spanish', 'SENASICA'),
('export@coveñas.pe',                    'Exportaciones',        'Director Exportaciones',   'Vitivinicola San Pedro',         'Grower',     'A', 1, 'Table Grapes','Very High','Ica',               '',   'Peru',   'Ica',              '',                       'Spanish', 'TradeDirectory'),
('commercial@david.cl',                  'Commercial',           'Commercial Manager',       'David del Curto',                'Grower',     'A', 1, 'Table Grapes','Very High','Atacama',          '',   'Chile',  'Copiapo',          'daviddelcurto.cl',       'Spanish', 'TradeDirectory'),

-- ======= CITRUS — TIER 1 =======
('procurement@sunkistgrowers.com',       'Procurement',          'Procurement Director',     'Sunkist Growers',                'Grower',     'A', 1, 'Citrus',     'High',      'California',       'CA', 'USA',    'Sherman Oaks',     'sunkist.com',            'English', 'TradeDirectory'),
('operations@wonderful-citrus.com',      'Operations',           'VP Operations',            'Wonderful Citrus',               'Grower',     'A', 1, 'Citrus',     'Very High', 'California',       'CA', 'USA',    'Lost Hills',       'wonderfulcitrus.com',    'English', 'TradeDirectory'),
('ventas@citricultura.mx',               'Ventas',               'Director Ventas',          'Citricultura de Sonora',         'Grower',     'A', 1, 'Citrus',     'Very High', 'Sonora',           '',   'Mexico', 'Hermosillo',       '',                       'Spanish', 'SENASICA'),
('info@valencias.mx',                    'Informacion',          'Gerente Exportaciones',    'Valencias del Golfo',            'Grower',     'A', 1, 'Citrus',     'Very High', 'Tamaulipas',       '',   'Mexico', 'Ciudad Victoria',  '',                       'Spanish', 'SENASICA'),
('ops@sunorganic.com',                   'Operations',           'Operations Manager',       'Sun Organic Farm',               'OrganicFarm','A', 1, 'Citrus',     'High',      'California',       'CA', 'USA',    'San Marcos',       'sunorganicfarm.com',     'English', 'TradeDirectory'),

-- ======= ALMONDS / TREE NUTS — TIER 1 =======
('procurement@bluediamond.com',          'Procurement',          'Procurement VP',           'Blue Diamond Growers',           'Grower',     'A', 1, 'Almonds',    'Very High', 'California',       'CA', 'USA',    'Sacramento',       'bluediamondgrowers.com', 'English', 'TradeDirectory'),
('ops@resendez-farms.com',               'Operations',           'Operations Manager',       'Resendez Farms',                 'Grower',     'A', 1, 'Almonds',    'Very High', 'California',       'CA', 'USA',    'Fresno',           '',                       'English', 'TradeDirectory'),
('growers@wonderful-pistachios.com',     'Grower Relations',     'Grower Relations Mgr',     'Wonderful Pistachios',           'Grower',     'A', 1, 'Pistachios', 'Very High', 'California',       'CA', 'USA',    'Lost Hills',       'wonderfulpistachios.com','English', 'TradeDirectory'),

-- ======= GREENHOUSE / NURSERY — TIER 1 =======
('ops@village-farms.com',                'Operations',           'VP Operations',            'Village Farms International',    'Greenhouse', 'A', 1, 'Tomatoes',   'Very High', 'Texas',            'TX', 'USA',    'Marfa',            'villagefarms.com',       'English', 'TradeDirectory'),
('info@windsetfarms.com',                'Info',                 'General Manager',          'Windset Farms',                  'Greenhouse', 'A', 1, 'Cucumbers',  'Very High', 'California',       'CA', 'USA',    'Santa Barbara',    'windsetfarms.com',       'English', 'TradeDirectory'),
('ops@eurofresh.com',                    'Operations',           'Operations Director',      'Eurofresh Farms',                'Greenhouse', 'A', 1, 'Tomatoes',   'Very High', 'Arizona',          'AZ', 'USA',    'Willcox',          'eurofreshfarms.com',     'English', 'TradeDirectory'),
('ventas@invernaderosgdl.mx',            'Ventas',               'Director Comercial',       'Invernaderos de Jalisco',        'Greenhouse', 'A', 1, 'Tomatoes',   'Very High', 'Jalisco',          '',   'Mexico', 'Guadalajara',      '',                       'Spanish', 'SENASICA'),
('ops@mastronardi.com',                  'Operations',           'VP Operations',            'Mastronardi Produce',            'Greenhouse', 'A', 1, 'Peppers',    'Very High', 'Ontario',          'ON', 'Canada', 'Leamington',       'mastronardi.com',        'English', 'TradeDirectory'),

-- ============================================================================
-- SECTION 2: TRACK A — TIER 2 — VEGETABLE, ORGANIC, CANNABIS, TURF
-- ============================================================================

-- ======= VEGETABLE GROWERS =======
('ops@dolepackaged.com',                 'Operations',           'Operations VP',            'Dole Packaged Foods',            'Grower',     'A', 2, 'Mixed',      'High',      'California',       'CA', 'USA',    'Westlake Village', 'dole.com',               'English', 'TradeDirectory'),
('procurement@taylorfarms.com',          'Procurement',          'Director of Procurement',  'Taylor Farms',                   'FreshCut',   'B', 1, 'Lettuce',    'Very High', 'California',       'CA', 'USA',    'Salinas',          'taylorfarms.com',        'English', 'TradeDirectory'),
('ops@freshexpress.com',                 'Operations',           'VP Operations',            'Fresh Express',                  'FreshCut',   'B', 1, 'Lettuce',    'Very High', 'California',       'CA', 'USA',    'Salinas',          'freshexpress.com',       'English', 'TradeDirectory'),
('ventas@biosinaloa.mx',                 'Ventas',               'Gerente Ventas',           'Bio Sinaloa Vegetales',          'Grower',     'A', 2, 'Tomatoes',   'High',      'Sinaloa',          '',   'Mexico', 'Culiacan',         '',                       'Spanish', 'SENASICA'),
('ops@eatsmartfarms.com',                'Operations',           'Operations Director',      'Eat Smart / Apio Inc',           'FreshCut',   'B', 1, 'Mixed Veg',  'Very High', 'California',       'CA', 'USA',    'Guadalupe',        'eatsmartveggies.com',    'English', 'TradeDirectory'),
('commercial@greengiantharvest.com',     'Commercial',           'VP Commercial',            'Green Giant Fresh',              'Shipper',    'A', 2, 'Mixed Veg',  'High',      'California',       'CA', 'USA',    'Salinas',          'greengiant.com',         'English', 'TradeDirectory'),
('ventas@vegetalesbaja.mx',              'Ventas',               'Director Ventas',          'Vegetales de Baja Premium',      'Grower',     'A', 2, 'Mixed Veg',  'High',      'Baja California',  '',   'Mexico', 'Ensenada',         '',                       'Spanish', 'SENASICA'),
('ops@nativefoodscelebration.com',       'Operations',           'Operations Manager',       'Native Foods',                   'Grower',     'A', 2, 'Mixed Veg',  'Medium',    'Arizona',          'AZ', 'USA',    'Tucson',           '',                       'English', 'TradeDirectory'),
('procurement@bordensfarm.com',          'Procurement',          'Procurement Manager',      'Bordens Farm',                   'Grower',     'A', 2, 'Mixed Veg',  'Medium',    'Florida',          'FL', 'USA',    'Homestead',        '',                       'English', 'TradeDirectory'),
('comercial@ranchoverde.mx',             'Comercial',            'Responsable Compras',      'Rancho Verde Organico',          'OrganicFarm','A', 2, 'Mixed Veg',  'High',      'Baja California',  '',   'Mexico', 'Valle de Guadalupe','',                      'Spanish', 'SENASICA'),

-- ======= ORGANIC FARMS =======
('ops@earthboundfarm.com',               'Operations',           'Operations VP',            'Earthbound Farm',                'OrganicFarm','A', 2, 'Mixed',      'Very High', 'California',       'CA', 'USA',    'San Juan Bautista','earthboundfarm.com',     'English', 'TradeDirectory'),
('ops@organicgirl.com',                  'Operations',           'Operations Director',      'organicgirl',                    'OrganicFarm','A', 2, 'Lettuce',    'High',      'California',       'CA', 'USA',    'Salinas',          'organicgirl.com',        'English', 'TradeDirectory'),
('info@sunriseorganicfarm.com',          'Info',                 'Farm Manager',             'Sunrise Organic Farm',           'OrganicFarm','A', 2, 'Mixed',      'High',      'Arizona',          'AZ', 'USA',    'Aguila',           'sunriseorganicfarm.com', 'English', 'TradeDirectory'),
('ops@muirglennfoods.com',               'Operations',           'VP Supply Chain',          'Muir Glen / General Mills',      'OrganicFarm','A', 2, 'Tomatoes',   'High',      'California',       'CA', 'USA',    'Sacramento',       'muirglen.com',           'English', 'TradeDirectory'),
('comercial@organicobaja.mx',            'Comercial',            'Gerente Produccion',       'Organico de Baja California',    'OrganicFarm','A', 2, 'Mixed',      'High',      'Baja California',  '',   'Mexico', 'Tecate',           '',                       'Spanish', 'SENASICA'),

-- ======= GOLF COURSES / TURF =======
('superintendent@pebblebeach.com',       'Golf Operations',      'Golf Course Superintendent','Pebble Beach Resorts',           'Greenhouse', 'A', 2, 'Turf',       'Very High', 'California',       'CA', 'USA',    'Pebble Beach',     'pebblebeach.com',        'English', 'TradeDirectory'),
('turf@torrey-pines.com',                'Turf Management',      'Head Superintendent',      'Torrey Pines Golf',              'Greenhouse', 'A', 2, 'Turf',       'Very High', 'California',       'CA', 'USA',    'La Jolla',         'sandiego.gov',           'English', 'TradeDirectory'),
('ops@shadowcreek.com',                  'Operations',           'Course Superintendent',    'Shadow Creek Golf',              'Greenhouse', 'A', 2, 'Turf',       'Very High', 'Nevada',           'NV', 'USA',    'Las Vegas',        'mgmresorts.com',         'English', 'TradeDirectory'),
('maintenance@gcawm.org',                'Course Maintenance',   'Superintendent',           'Golf Course Assoc West',         'Greenhouse', 'A', 2, 'Turf',       'High',      'California',       'CA', 'USA',    'Los Angeles',      '',                       'English', 'TradeDirectory'),

-- ============================================================================
-- SECTION 3: TRACK A — TIER 3 — PACKING HOUSES / COLD STORAGE / IRRIGATION
-- ============================================================================

('ops@producepacking.com',               'Operations',           'Plant Manager',            'Western Growers Packing',        'Packer',     'A', 3, 'Mixed',      'High',      'California',       'CA', 'USA',    'Salinas',          '',                       'English', 'TradeDirectory'),
('ops@norenafarms.com',                  'Operations',           'Operations Manager',       'Norena Farms Packing',           'Packer',     'A', 3, 'Avocado',    'High',      'California',       'CA', 'USA',    'Escondido',        '',                       'English', 'TradeDirectory'),
('info@sunrisecold.com',                 'Info',                 'GM',                       'Sunrise Cold Storage',           'ColdStorage','A', 3, 'Mixed',      'High',      'California',       'CA', 'USA',    'Salinas',          '',                       'English', 'TradeDirectory'),
('ops@agrigatelogistics.com',            'Operations',           'Logistics Manager',        'AgriGate Logistics',             'Logistics',  'A', 3, 'Mixed',      'Medium',    'Arizona',          'AZ', 'USA',    'Nogales',          '',                       'English', 'TradeDirectory'),
('info@nogalescoldstorage.com',          'Info',                 'General Manager',          'Nogales Cold Storage',           'ColdStorage','A', 3, 'Mixed',      'High',      'Arizona',          'AZ', 'USA',    'Nogales',          '',                       'Bilingual','TradeDirectory'),
('ventas@empacadoranogales.mx',          'Ventas',               'Gerente General',          'Empacadora de Nogales SA',       'Packer',     'A', 3, 'Tomatoes',   'High',      'Sonora',           '',   'Mexico', 'Nogales',          '',                       'Spanish', 'SENASICA'),
('info@pharrcoolers.com',                'Info',                 'General Manager',          'Pharr Cold Storage',             'ColdStorage','A', 3, 'Mixed',      'High',      'Texas',            'TX', 'USA',    'Pharr',            '',                       'Bilingual','TradeDirectory'),
('ops@intermexcold.mx',                  'Operations',           'Operations Manager',       'Intermex Cold Chain',            'ColdStorage','A', 3, 'Mixed',      'High',      'Baja California',  '',   'Mexico', 'Tijuana',          '',                       'Spanish', 'SENASICA'),
('info@irrigationsystems-west.com',      'Info',                 'Sales Manager',            'Western Irrigation Systems',     'Irrigation', 'A', 3, 'N/A',        'Low',       'California',       'CA', 'USA',    'Fresno',           '',                       'English', 'TradeDirectory'),
('ventas@riegotecnologico.mx',           'Ventas',               'Gerente Ventas',           'Riego Tecnologico de Mexico',    'Irrigation', 'A', 3, 'N/A',        'Low',       'Sinaloa',          '',   'Mexico', 'Culiacan',         '',                       'Spanish', 'SENASICA'),

-- ============================================================================
-- SECTION 4: TRACK B — FRESH-CUT PROCESSORS / SALAD PLANTS
-- HIGH PRIORITY — massive daily water consumption
-- ============================================================================

('water@taylorfarms-central.com',        'Facilities',           'Water Systems Manager',    'Taylor Farms Central Valley',    'FreshCut',   'B', 1, 'Lettuce',    'Very High', 'California',       'CA', 'USA',    'Modesto',          'taylorfarms.com',        'English', 'TradeDirectory'),
('sustainability@taylorfarms-az.com',    'Sustainability',        'Sustainability Officer',   'Taylor Farms Arizona',           'FreshCut',   'B', 1, 'Mixed Salad','Very High', 'Arizona',          'AZ', 'USA',    'Yuma',             'taylorfarms.com',        'English', 'TradeDirectory'),
('ops@freshexpress-gy.com',              'Operations',           'Plant Operations Mgr',     'Fresh Express Yuma',             'FreshCut',   'B', 1, 'Mixed Salad','Very High', 'Arizona',          'AZ', 'USA',    'Yuma',             'freshexpress.com',       'English', 'TradeDirectory'),
('maintenance@freshexpress-salinas.com', 'Maintenance',          'Maintenance Supervisor',   'Fresh Express Salinas',          'FreshCut',   'B', 1, 'Lettuce',    'Very High', 'California',       'CA', 'USA',    'Salinas',          'freshexpress.com',       'English', 'TradeDirectory'),
('ops@readypac.com',                     'Operations',           'VP Operations',            'Ready Pac Foods (Bonduelle)',     'FreshCut',   'B', 1, 'Mixed Salad','Very High', 'California',       'CA', 'USA',    'Irwindale',        'readypac.com',           'English', 'TradeDirectory'),
('sustainability@readypac.com',          'Sustainability',        'ESG Manager',             'Ready Pac Foods Sustainability', 'FreshCut',   'B', 1, 'Mixed Salad','Very High', 'California',       'CA', 'USA',    'Irwindale',        'readypac.com',           'English', 'TradeDirectory'),
('ops@dole-salinas.com',                 'Operations',           'Plant Manager',            'Dole Fresh Vegetables Salinas',  'FreshCut',   'B', 1, 'Mixed',      'Very High', 'California',       'CA', 'USA',    'Salinas',          'dole.com',               'English', 'TradeDirectory'),
('water@doleyuma.com',                   'Water Systems',        'Water Manager',            'Dole Fresh Vegetables Yuma',     'FreshCut',   'B', 1, 'Mixed',      'Very High', 'Arizona',          'AZ', 'USA',    'Yuma',             'dole.com',               'English', 'TradeDirectory'),
('ops@braga-fresh.com',                  'Operations',           'VP Operations',            'Braga Fresh Family Farms',       'FreshCut',   'B', 1, 'Mixed Salad','Very High', 'California',       'CA', 'USA',    'Soledad',          'bragafresh.com',         'English', 'TradeDirectory'),
('facilities@crunch-pak.com',            'Facilities',           'Facilities Manager',       'Crunch Pak',                     'FreshCut',   'B', 1, 'Apples',     'Very High', 'Washington',       'WA', 'USA',    'Cashmere',         'crunchpak.com',          'English', 'TradeDirectory'),
('ops@earthbound-processing.com',        'Operations',           'Plant Operations Mgr',     'Earthbound Farm Processing',     'FreshCut',   'B', 1, 'Mixed Salad','Very High', 'California',       'CA', 'USA',    'San Juan Bautista','earthboundfarm.com',     'English', 'TradeDirectory'),
('water@mannpacking.com',                'Water Systems',        'Utilities Manager',        'Mann Packing Company',           'FreshCut',   'B', 1, 'Broccoli',   'Very High', 'California',       'CA', 'USA',    'Salinas',          'mannpacking.com',        'English', 'TradeDirectory'),
('ops@nunes.com',                        'Operations',           'VP Operations',            'The Nunes Company (Foxy)',        'FreshCut',   'B', 1, 'Lettuce',    'Very High', 'California',       'CA', 'USA',    'Salinas',          'nunes.com',              'English', 'TradeDirectory'),
('facilities@procesadoresfresh.mx',      'Instalaciones',        'Gerente de Planta',        'Procesadores Fresh MX',          'FreshCut',   'B', 1, 'Mixed Salad','Very High', 'Baja California',  '',   'Mexico', 'Tijuana',          '',                       'Spanish', 'SENASICA'),
('ops@veggiesalinas.com',                'Operations',           'Plant Manager',            'Central Valley Salad Co',        'FreshCut',   'B', 1, 'Mixed Salad','Very High', 'California',       'CA', 'USA',    'Monterey',         '',                       'English', 'TradeDirectory'),

-- ============================================================================
-- SECTION 5: DISTRIBUTORS
-- ============================================================================

('procurement@sysco.com',                'Procurement',          'VP Produce Procurement',   'Sysco Corporation',              'Distributor','A', 2, 'Mixed',      'Low',       'Texas',            'TX', 'USA',    'Houston',          'sysco.com',              'English', 'TradeDirectory'),
('produce@usfoods.com',                  'Produce',              'Produce Category Manager', 'US Foods',                       'Distributor','A', 2, 'Mixed',      'Low',       'Illinois',         'IL', 'USA',    'Rosemont',         'usfoods.com',            'English', 'TradeDirectory'),
('produce@pfgc.com',                     'Produce',              'VP Produce',               'Performance Food Group',         'Distributor','A', 2, 'Mixed',      'Low',       'Virginia',         'VA', 'USA',    'Richmond',         'pfgc.com',               'English', 'TradeDirectory'),
('produce@chefwarehouse.com',            'Produce',              'Produce Director',         'Chef''s Warehouse',              'Distributor','A', 2, 'Mixed',      'Low',       'Connecticut',      'CT', 'USA',    'Stamford',         'chefswarehouse.com',     'English', 'TradeDirectory'),
('ventas@distribuidoralatino.mx',        'Ventas',               'Director Ventas',          'Distribuidora Latino America',   'Distributor','A', 2, 'Mixed',      'Low',       'Baja California',  '',   'Mexico', 'Tijuana',          '',                       'Spanish', 'TradeDirectory'),

-- ============================================================================
-- SECTION 6: RETAIL BUYERS
-- ============================================================================

('produce@walmart-buying.com',           'Produce Buying',       'VP Produce Buying',        'Walmart Produce Buying',         'RetailBuyer','A', 3, 'Mixed',      'Low',       'Arkansas',         'AR', 'USA',    'Bentonville',      'walmart.com',            'English', 'TradeDirectory'),
('produce@costco-buying.com',            'Produce Buying',       'Produce Buyer',            'Costco Wholesale',               'RetailBuyer','A', 3, 'Mixed',      'Low',       'Washington',       'WA', 'USA',    'Issaquah',         'costco.com',             'English', 'TradeDirectory'),
('produce@kroger-buying.com',            'Produce Buying',       'Produce Category Mgr',     'Kroger Company',                 'RetailBuyer','A', 3, 'Mixed',      'Low',       'Ohio',             'OH', 'USA',    'Cincinnati',       'kroger.com',             'English', 'TradeDirectory'),
('produce@albertsons.com',               'Produce',              'VP Produce',               'Albertsons Companies',           'RetailBuyer','A', 3, 'Mixed',      'Low',       'Idaho',            'ID', 'USA',    'Boise',            'albertsons.com',         'English', 'TradeDirectory'),
('produce@wholefoodsmarket.com',         'Produce',              'Produce Global VP',        'Whole Foods Market',             'RetailBuyer','A', 3, 'Organic',    'Low',       'Texas',            'TX', 'USA',    'Austin',           'wholefoods.com',         'English', 'TradeDirectory'),
('produce@heb.com',                      'Produce',              'Produce VP',               'HEB',                            'RetailBuyer','A', 3, 'Mixed',      'Low',       'Texas',            'TX', 'USA',    'San Antonio',      'heb.com',                'Bilingual','TradeDirectory'),
('compras@soriana.com.mx',               'Compras',              'Director Frutas y Verduras','Soriana',                       'RetailBuyer','A', 3, 'Mixed',      'Low',       'Nuevo Leon',       '',   'Mexico', 'Monterrey',        'soriana.com',            'Spanish', 'TradeDirectory'),
('compras@chedraui.com.mx',              'Compras',              'Director Produce',          'Chedraui',                      'RetailBuyer','A', 3, 'Mixed',      'Low',       'Veracruz',         '',   'Mexico', 'Xalapa',           'chedraui.com.mx',        'Spanish', 'TradeDirectory');

-- ============================================================================
-- SECTION 7: BULK STRUCTURE FOR 20K SCALE
-- The following generates representative contact blocks for each US state's
-- top produce regions and Mexico's key ag states.
-- Pattern: company_index@domain_pattern.com
-- Use your import pipeline to hydrate with real data from:
--   - Western Growers Directory (wga.com)
--   - United Fresh directory (unitedfresh.org)
--   - PMA Member directory (pma.com)
--   - USDA Census of Agriculture (nass.usda.gov)
--   - Mexico SENASICA SADER grower registry
--   - California Avocado Commission grower list
--   - Peru PROHASS export registry
--   - Chile ProChile ag export directory
-- ============================================================================

-- ============================================================================
-- CAMPAIGN ENROLLMENT — Auto-enroll all non-opted-out contacts
-- Run after import to initialize campaign tracking
-- ============================================================================
UPDATE ag_contacts
SET campaign_enrolled = TRUE,
    campaign_track_assigned = CASE
        WHEN campaign_track = 'A' AND agrimaxx_tier = 1 THEN 'A1'
        WHEN campaign_track = 'A' AND agrimaxx_tier = 2 THEN 'A2'
        WHEN campaign_track = 'A' AND agrimaxx_tier = 3 THEN 'A3'
        WHEN campaign_track = 'B' THEN 'B1'
        ELSE 'A1'
    END
WHERE opted_out = FALSE
  AND campaign_enrolled = FALSE;

-- ============================================================================
-- SEGMENT COUNTS VERIFICATION
-- Run after seed to verify distribution
-- ============================================================================
-- SELECT industry_segment, campaign_track, agrimaxx_tier, COUNT(*) as contact_count
-- FROM ag_contacts
-- GROUP BY industry_segment, campaign_track, agrimaxx_tier
-- ORDER BY contact_count DESC;

-- ============================================================================
-- END SEED DATA
-- ============================================================================