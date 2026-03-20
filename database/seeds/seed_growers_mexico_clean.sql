-- =====================================================
-- AuditDNA Grower Seed Data - MEXICO
-- Regions: MichoacÃ¡n, Jalisco, Sinaloa, Baja California, Guanajuato
-- Total: 150 Growers
-- Generated: 2026-01-15
-- =====================================================

-- Clear existing Mexico growers (optional - comment out if appending)
-- DELETE FROM growers WHERE country = 'Mexico';

-- =====================================================
-- MICHOACÃN - Avocado Capital (50 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES

-- Uruapan District
('Aguacates El Dorado S.A. de C.V.', 'Roberto Mendoza GarcÃ­a', 'rmendoza@aguacateseldorado.mx', '+52-452-523-1001', 'Mexico', 'MichoacÃ¡n', 'Uruapan', 'Avocado Hass', ARRAY['Avocado Fuerte', 'Avocado Criollo'], 450, 2800, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada', 'Japan'], 'approved', 1, NOW()),

('Productores Unidos de Uruapan', 'MarÃ­a Elena VÃ¡zquez', 'mevazquez@puuuapan.mx', '+52-452-523-1002', 'Mexico', 'MichoacÃ¡n', 'Uruapan', 'Avocado Hass', ARRAY['Avocado Mendez'], 380, 2400, ARRAY['GlobalGAP', 'SENASICA', 'SQF Level 2'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Rancho Los Tres Hermanos', 'JosÃ© Luis RamÃ­rez Ortiz', 'jlramirez@treshermanos.mx', '+52-452-523-1003', 'Mexico', 'MichoacÃ¡n', 'Uruapan', 'Avocado Hass', ARRAY['Citrus Lime'], 220, 1400, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Aguacates Premium MichoacÃ¡n', 'Ana SofÃ­a Delgado', 'adelgado@premiumich.mx', '+52-452-523-1004', 'Mexico', 'MichoacÃ¡n', 'Uruapan', 'Avocado Hass', ARRAY['Avocado Hass Organic'], 520, 3200, ARRAY['USDA Organic', 'Fair Trade', 'GlobalGAP', 'SENASICA', 'Rainforest Alliance'], ARRAY['USA', 'Canada', 'Europe', 'Japan'], 'approved', 0, NOW()),

('Cooperativa Aguacatera del Valle', 'Francisco Javier Torres', 'fjtorres@coopvalle.mx', '+52-452-523-1005', 'Mexico', 'MichoacÃ¡n', 'Uruapan', 'Avocado Hass', ARRAY['Avocado Fuerte'], 180, 1100, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

('Exportadora San Miguel', 'Carlos Eduardo Navarro', 'cenavarro@expsanmiguel.mx', '+52-452-523-1006', 'Mexico', 'MichoacÃ¡n', 'Uruapan', 'Avocado Hass', ARRAY['Guava', 'Mango'], 340, 2100, ARRAY['GlobalGAP', 'SENASICA', 'BRC Food'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),

('Huertas El ParaÃ­so', 'Laura Patricia Medina', 'lpmedina@huertasparaiso.mx', '+52-452-523-1007', 'Mexico', 'MichoacÃ¡n', 'Uruapan', 'Avocado Hass', ARRAY['Blackberry'], 150, 950, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

('Aguacates Tierra FÃ©rtil', 'Miguel Ãngel Soto', 'masoto@tierrafertil.mx', '+52-452-523-1008', 'Mexico', 'MichoacÃ¡n', 'Uruapan', 'Avocado Hass', ARRAY['Avocado Organic'], 280, 1750, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Productora AgrÃ­cola del PacÃ­fico', 'Guadalupe HernÃ¡ndez', 'ghernandez@agripac.mx', '+52-452-523-1009', 'Mexico', 'MichoacÃ¡n', 'Uruapan', 'Avocado Hass', ARRAY['Lime Persian'], 410, 2600, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada', 'Japan'], 'approved', 1, NOW()),

('Rancho Santa Elena', 'Ricardo Alejandro Ruiz', 'raruiz@santaelena.mx', '+52-452-523-1010', 'Mexico', 'MichoacÃ¡n', 'Uruapan', 'Avocado Hass', ARRAY['Avocado Fuerte', 'Peach'], 195, 1200, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- TancÃ­taro District
('Aguacates TancÃ­taro Gold', 'Pedro Ignacio LÃ³pez', 'pilopez@tancitarogold.mx', '+52-452-597-2001', 'Mexico', 'MichoacÃ¡n', 'TancÃ­taro', 'Avocado Hass', ARRAY['Avocado Hass Premium'], 680, 4200, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA', 'Fair Trade', 'SQF Level 3'], ARRAY['USA', 'Canada', 'Europe', 'Japan', 'China'], 'approved', 0, NOW()),

('Sociedad Cooperativa TancÃ­taro', 'Martha Alicia GuzmÃ¡n', 'maguzan@cooptancitaro.mx', '+52-452-597-2002', 'Mexico', 'MichoacÃ¡n', 'TancÃ­taro', 'Avocado Hass', ARRAY['Avocado Mendez'], 420, 2650, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Huertas del VolcÃ¡n', 'Sergio Antonio Mora', 'samora@huertasvolcan.mx', '+52-452-597-2003', 'Mexico', 'MichoacÃ¡n', 'TancÃ­taro', 'Avocado Hass', ARRAY['Avocado Criollo'], 310, 1950, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

('Exportadora VolcÃ¡n de TancÃ­taro', 'Diana Carolina Flores', 'dcflores@expvolcan.mx', '+52-452-597-2004', 'Mexico', 'MichoacÃ¡n', 'TancÃ­taro', 'Avocado Hass', ARRAY['Avocado Organic', 'Blackberry'], 550, 3400, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA', 'Rainforest Alliance'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 0, NOW()),

('Rancho El Aguacate Verde', 'Armando Javier Castillo', 'ajcastillo@aguacateverde.mx', '+52-452-597-2005', 'Mexico', 'MichoacÃ¡n', 'TancÃ­taro', 'Avocado Hass', ARRAY['Avocado Fuerte'], 240, 1500, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Productores Asociados de TancÃ­taro', 'VerÃ³nica Isabel JimÃ©nez', 'vijimenez@patancitaro.mx', '+52-452-597-2006', 'Mexico', 'MichoacÃ¡n', 'TancÃ­taro', 'Avocado Hass', ARRAY['Avocado Hass', 'Raspberry'], 380, 2400, ARRAY['GlobalGAP', 'SENASICA', 'BRC Food'], ARRAY['USA', 'Canada', 'Japan'], 'approved', 1, NOW()),

('Aguacates Sierra Madre', 'Eduardo Felipe Vargas', 'efvargas@sierramadre.mx', '+52-452-597-2007', 'Mexico', 'MichoacÃ¡n', 'TancÃ­taro', 'Avocado Hass', ARRAY['Avocado Premium'], 290, 1800, ARRAY['SENASICA', 'GlobalGAP', 'Primus GFS'], ARRAY['USA'], 'approved', 2, NOW()),

('Huertas San JosÃ© del Valle', 'Rosa MarÃ­a Contreras', 'rmcontreras@sanjosevalle.mx', '+52-452-597-2008', 'Mexico', 'MichoacÃ¡n', 'TancÃ­taro', 'Avocado Hass', ARRAY['Citrus Mandarin'], 175, 1100, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- PeribÃ¡n District
('Aguacates PeribÃ¡n Premium', 'Juan Manuel Aguilar', 'jmaguilar@peribanpremium.mx', '+52-452-525-3001', 'Mexico', 'MichoacÃ¡n', 'PeribÃ¡n', 'Avocado Hass', ARRAY['Avocado Organic'], 460, 2900, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA', 'SQF Level 2'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),

('Cooperativa AgrÃ­cola PeribÃ¡n', 'Leticia Fernanda Ochoa', 'lfochoa@coopperiban.mx', '+52-452-525-3002', 'Mexico', 'MichoacÃ¡n', 'PeribÃ¡n', 'Avocado Hass', ARRAY['Avocado Fuerte', 'Lime'], 350, 2200, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Rancho Los Aguacates de Oro', 'HÃ©ctor RaÃºl DomÃ­nguez', 'hrdominguez@aguacatesoro.mx', '+52-452-525-3003', 'Mexico', 'MichoacÃ¡n', 'PeribÃ¡n', 'Avocado Hass', ARRAY['Avocado Mendez'], 210, 1300, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

('Exportadora Verde Valle', 'Claudia Berenice Salazar', 'cbsalazar@verdevalle.mx', '+52-452-525-3004', 'Mexico', 'MichoacÃ¡n', 'PeribÃ¡n', 'Avocado Hass', ARRAY['Blackberry', 'Raspberry'], 320, 2000, ARRAY['GlobalGAP', 'SENASICA', 'BRC Food'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Productores del Sol Naciente', 'Alberto GermÃ¡n RÃ­os', 'agrios@solnaciente.mx', '+52-452-525-3005', 'Mexico', 'MichoacÃ¡n', 'PeribÃ¡n', 'Avocado Hass', ARRAY['Avocado Criollo'], 185, 1150, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- Nuevo Parangaricutiro
('Aguacates Parangaricutiro', 'Salvador Enrique Luna', 'seluna@aguacatesparang.mx', '+52-452-594-4001', 'Mexico', 'MichoacÃ¡n', 'Nuevo Parangaricutiro', 'Avocado Hass', ARRAY['Avocado Organic', 'Peach'], 390, 2450, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada', 'Japan'], 'approved', 1, NOW()),

('Huertas El Nuevo VolcÃ¡n', 'Patricia Guadalupe Moreno', 'pgmoreno@nuevovolcan.mx', '+52-452-594-4002', 'Mexico', 'MichoacÃ¡n', 'Nuevo Parangaricutiro', 'Avocado Hass', ARRAY['Avocado Fuerte'], 270, 1700, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Rancho Las Cenizas FÃ©rtiles', 'Oscar IvÃ¡n Guerrero', 'oiguerrero@cenizasfertiles.mx', '+52-452-594-4003', 'Mexico', 'MichoacÃ¡n', 'Nuevo Parangaricutiro', 'Avocado Hass', ARRAY['Blackberry'], 160, 1000, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- Ario de Rosales
('Aguacates Ario Premium', 'Fernando Daniel Castro', 'fdcastro@ariopremium.mx', '+52-452-532-5001', 'Mexico', 'MichoacÃ¡n', 'Ario de Rosales', 'Avocado Hass', ARRAY['Avocado Hass', 'Guava'], 340, 2150, ARRAY['GlobalGAP', 'SENASICA', 'SQF Level 2'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Cooperativa Rosales Verde', 'Adriana Monserrat Herrera', 'amherrera@rosalesverde.mx', '+52-452-532-5002', 'Mexico', 'MichoacÃ¡n', 'Ario de Rosales', 'Avocado Hass', ARRAY['Avocado Organic'], 280, 1750, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

-- Los Reyes
('Frutillas Los Reyes S.A.', 'Gabriel Arturo Mendoza', 'gamendoza@frutillasreyes.mx', '+52-354-542-6001', 'Mexico', 'MichoacÃ¡n', 'Los Reyes', 'Blackberry', ARRAY['Raspberry', 'Blueberry', 'Strawberry'], 180, 1400, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS', 'Fair Trade'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),

('Berries del Valle Michoacano', 'Norma AngÃ©lica PeÃ±a', 'napena@berriesvalle.mx', '+52-354-542-6002', 'Mexico', 'MichoacÃ¡n', 'Los Reyes', 'Blackberry', ARRAY['Raspberry', 'Blueberry'], 220, 1700, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Exportadora FrutÃ­cola Reyes', 'Ramiro SebastiÃ¡n Ortega', 'rsortega@expfruticola.mx', '+52-354-542-6003', 'Mexico', 'MichoacÃ¡n', 'Los Reyes', 'Raspberry', ARRAY['Blackberry', 'Strawberry'], 150, 1150, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Cooperativa Frutillera del PacÃ­fico', 'Silvia Marcela Vega', 'smvega@coopfrutillera.mx', '+52-354-542-6004', 'Mexico', 'MichoacÃ¡n', 'Los Reyes', 'Blueberry', ARRAY['Blackberry', 'Raspberry'], 200, 1550, ARRAY['GlobalGAP', 'SENASICA', 'BRC Food'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

-- Zamora
('Fresas Zamora Premium', 'Luis Fernando Cervantes', 'lfcervantes@fresaszamora.mx', '+52-351-515-7001', 'Mexico', 'MichoacÃ¡n', 'Zamora', 'Strawberry', ARRAY['Blackberry', 'Raspberry'], 320, 4800, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS', 'SQF Level 2'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Berries Zamora Export', 'MarÃ­a JosÃ© Quintero', 'mjquintero@berrieszamora.mx', '+52-351-515-7002', 'Mexico', 'MichoacÃ¡n', 'Zamora', 'Strawberry', ARRAY['Blueberry'], 280, 4200, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),

('Productores de Fresa del Valle', 'Enrique Alberto Sandoval', 'easandoval@fresavalle.mx', '+52-351-515-7003', 'Mexico', 'MichoacÃ¡n', 'Zamora', 'Strawberry', ARRAY['Raspberry'], 190, 2850, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Cooperativa Fresera Michoacana', 'Yolanda Cristina Fuentes', 'ycfuentes@coopfresera.mx', '+52-351-515-7004', 'Mexico', 'MichoacÃ¡n', 'Zamora', 'Strawberry', ARRAY['Blackberry', 'Blueberry'], 240, 3600, ARRAY['GlobalGAP', 'SENASICA', 'Fair Trade'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

-- Jacona
('Fresas Jacona Gold', 'Arturo RenÃ© Ibarra', 'aribarra@fresasjacona.mx', '+52-351-516-8001', 'Mexico', 'MichoacÃ¡n', 'Jacona', 'Strawberry', ARRAY['Raspberry'], 210, 3150, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Productores FrutÃ­colas Jacona', 'Carmen LucÃ­a Espinoza', 'clespinoza@fruticolajacona.mx', '+52-351-516-8002', 'Mexico', 'MichoacÃ¡n', 'Jacona', 'Strawberry', ARRAY['Blackberry'], 175, 2625, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- TangancÃ­cuaro
('Berries TangancÃ­cuaro', 'Jorge Luis Maldonado', 'jlmaldonado@berriestanga.mx', '+52-351-517-9001', 'Mexico', 'MichoacÃ¡n', 'TangancÃ­cuaro', 'Blackberry', ARRAY['Raspberry', 'Blueberry'], 165, 1280, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 2, NOW()),

('Exportadora Frutas del Norte', 'Isabel Adriana Rojas', 'iarojas@frutasnorte.mx', '+52-351-517-9002', 'Mexico', 'MichoacÃ¡n', 'TangancÃ­cuaro', 'Raspberry', ARRAY['Blackberry'], 140, 1085, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- Tocumbo
('Aguacates Tocumbo Verde', 'RaÃºl Ernesto Ponce', 'reponce@tocumboverde.mx', '+52-352-538-1001', 'Mexico', 'MichoacÃ¡n', 'Tocumbo', 'Avocado Hass', ARRAY['Avocado Fuerte'], 230, 1450, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Huertas San Antonio Tocumbo', 'Marisela Del Carmen Villa', 'mdcvilla@sanantonio.mx', '+52-352-538-1002', 'Mexico', 'MichoacÃ¡n', 'Tocumbo', 'Avocado Hass', ARRAY['Avocado Organic'], 195, 1230, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

-- Additional MichoacÃ¡n Growers
('Aguacates Costa Verde', 'Alejandro Javier Morales', 'ajmorales@costaverde.mx', '+52-452-523-2001', 'Mexico', 'MichoacÃ¡n', 'Uruapan', 'Avocado Hass', ARRAY['Citrus Lime'], 310, 1950, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Rancho El Mirador Verde', 'Daniela Fernanda Cruz', 'dfcruz@miradorverde.mx', '+52-452-523-2002', 'Mexico', 'MichoacÃ¡n', 'Uruapan', 'Avocado Hass', ARRAY['Avocado Premium'], 265, 1670, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Productores Aguacateros del Sur', 'VÃ­ctor Hugo Reyes', 'vhreyes@aguacaterossur.mx', '+52-452-597-2009', 'Mexico', 'MichoacÃ¡n', 'TancÃ­taro', 'Avocado Hass', ARRAY['Avocado Organic', 'Raspberry'], 420, 2650, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA', 'Fair Trade'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 0, NOW()),

('Huertas La Esperanza', 'Teresa Guadalupe SolÃ­s', 'tgsolis@laesperanza.mx', '+52-452-525-3006', 'Mexico', 'MichoacÃ¡n', 'PeribÃ¡n', 'Avocado Hass', ARRAY['Blackberry'], 185, 1165, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW());

-- =====================================================
-- JALISCO - Berries & Agave (35 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES

-- Guadalajara Metro Area
('Berries Jalisco Premium S.A.', 'Antonio Carlos GutiÃ©rrez', 'acgutierrez@berriesjalisco.mx', '+52-33-3615-1001', 'Mexico', 'Jalisco', 'Zapopan', 'Blueberry', ARRAY['Raspberry', 'Blackberry'], 380, 2850, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 0, NOW()),

('Exportadora Frutas del BajÃ­o', 'MÃ³nica Patricia Lara', 'mplara@frutasbajio.mx', '+52-33-3615-1002', 'Mexico', 'Jalisco', 'Tlajomulco', 'Raspberry', ARRAY['Blueberry', 'Strawberry'], 290, 2175, ARRAY['GlobalGAP', 'SENASICA', 'SQF Level 2'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Agroberries de Occidente', 'Roberto Miguel Aguilera', 'rmaguilera@agroberries.mx', '+52-33-3615-1003', 'Mexico', 'Jalisco', 'Tlaquepaque', 'Blackberry', ARRAY['Raspberry'], 210, 1575, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

-- Sayula - Berry Belt
('Berries Sayula Export', 'Elena MarÃ­a Castellanos', 'emcastellanos@berriessayula.mx', '+52-342-422-2001', 'Mexico', 'Jalisco', 'Sayula', 'Blueberry', ARRAY['Raspberry', 'Blackberry'], 450, 3375, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA', 'Fair Trade', 'Rainforest Alliance'], ARRAY['USA', 'Canada', 'Europe', 'Japan'], 'approved', 0, NOW()),

('Cooperativa Frutillera Sayula', 'MartÃ­n Eduardo Pacheco', 'mepacheco@coopsayula.mx', '+52-342-422-2002', 'Mexico', 'Jalisco', 'Sayula', 'Raspberry', ARRAY['Blueberry'], 320, 2400, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Rancho Las Frambuesas', 'Ana Cristina Montes', 'acmontes@lasframbuesas.mx', '+52-342-422-2003', 'Mexico', 'Jalisco', 'Sayula', 'Raspberry', ARRAY['Strawberry'], 180, 1350, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

('Productores de Berries del Sur', 'David Alejandro NÃºÃ±ez', 'danunez@berriessur.mx', '+52-342-422-2004', 'Mexico', 'Jalisco', 'Sayula', 'Blueberry', ARRAY['Blackberry', 'Raspberry'], 275, 2065, ARRAY['GlobalGAP', 'SENASICA', 'BRC Food'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

-- Ciudad GuzmÃ¡n
('Frutas Ciudad GuzmÃ¡n', 'SofÃ­a Alejandra Romero', 'saromero@frutascg.mx', '+52-341-412-3001', 'Mexico', 'Jalisco', 'Ciudad GuzmÃ¡n', 'Raspberry', ARRAY['Blueberry', 'Blackberry'], 340, 2550, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),

('Berries del Nevado', 'JesÃºs Fernando Orozco', 'jforozco@berriesnevado.mx', '+52-341-412-3002', 'Mexico', 'Jalisco', 'Ciudad GuzmÃ¡n', 'Blueberry', ARRAY['Raspberry'], 260, 1950, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Exportadora Sur de Jalisco', 'Karla Ivonne Trejo', 'kitrejo@expsurjalisco.mx', '+52-341-412-3003', 'Mexico', 'Jalisco', 'Ciudad GuzmÃ¡n', 'Blackberry', ARRAY['Raspberry', 'Blueberry'], 195, 1465, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- Tapalpa
('Berries de Altura Tapalpa', 'Guillermo AndrÃ©s Zavala', 'gazavala@berriestapalpa.mx', '+52-343-432-4001', 'Mexico', 'Jalisco', 'Tapalpa', 'Blueberry', ARRAY['Raspberry'], 220, 1650, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Frutales Tapalpa S.A.', 'LucÃ­a Fernanda Campos', 'lfcampos@frutalestap.mx', '+52-343-432-4002', 'Mexico', 'Jalisco', 'Tapalpa', 'Raspberry', ARRAY['Blackberry'], 175, 1310, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

-- Tequila Region - Agave & Diversified
('Agave Azul Tequila Premium', 'Jorge Armando Valencia', 'javalencia@agaveazul.mx', '+52-374-742-5001', 'Mexico', 'Jalisco', 'Tequila', 'Agave Azul', ARRAY['Agave Varieties'], 850, 12750, ARRAY['CRT Certified', 'SENASICA', 'NOM Compliant'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 0, NOW()),

('Productores de Agave Tequilero', 'Margarita Elena Orozco', 'meorozco@agavetequilero.mx', '+52-374-742-5002', 'Mexico', 'Jalisco', 'Tequila', 'Agave Azul', ARRAY['Agave Weber'], 620, 9300, ARRAY['CRT Certified', 'SENASICA'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),

('Rancho Los Agaves Azules', 'Francisco Eduardo Padilla', 'fepadilla@agavesazules.mx', '+52-374-742-5003', 'Mexico', 'Jalisco', 'Tequila', 'Agave Azul', ARRAY['Agave Premium'], 480, 7200, ARRAY['CRT Certified', 'SENASICA', 'Organic'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

-- Arandas - Highland Agave
('Agave Highlands Premium', 'Carlos Emilio Sandoval', 'cesandoval@agavehighlands.mx', '+52-348-783-6001', 'Mexico', 'Jalisco', 'Arandas', 'Agave Azul', ARRAY['Agave Highland'], 720, 10800, ARRAY['CRT Certified', 'SENASICA', 'NOM Compliant', 'Organic'], ARRAY['USA', 'Europe', 'Japan'], 'approved', 0, NOW()),

('Cooperativa Agavera de los Altos', 'MarÃ­a Fernanda Delgado', 'mfdelgado@coopagavera.mx', '+52-348-783-6002', 'Mexico', 'Jalisco', 'Arandas', 'Agave Azul', ARRAY['Agave Varieties'], 540, 8100, ARRAY['CRT Certified', 'SENASICA'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),

('Rancho San Isidro Agave', 'Ricardo Antonio MejÃ­a', 'ramejia@sanisidroagave.mx', '+52-348-783-6003', 'Mexico', 'Jalisco', 'Arandas', 'Agave Azul', ARRAY['Agave Weber'], 390, 5850, ARRAY['CRT Certified', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

-- Jocotepec - Citrus & Vegetables
('CÃ­tricos Jocotepec S.A.', 'Paula Cristina Ãvila', 'pcavila@citricosjoco.mx', '+52-387-763-7001', 'Mexico', 'Jalisco', 'Jocotepec', 'Lime Persian', ARRAY['Orange Valencia', 'Lemon'], 280, 4200, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Productores de Lima del Lago', 'Sergio Daniel Cordero', 'sdcordero@limalago.mx', '+52-387-763-7002', 'Mexico', 'Jalisco', 'Jocotepec', 'Lime Persian', ARRAY['Lime Key'], 210, 3150, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- AutlÃ¡n - Tropical
('Frutas Tropicales AutlÃ¡n', 'Andrea Mariana Soto', 'amsoto@frutasautlan.mx', '+52-317-382-8001', 'Mexico', 'Jalisco', 'AutlÃ¡n', 'Mango', ARRAY['Papaya', 'Banana'], 420, 5040, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS', 'Fair Trade'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),

('Exportadora Tropical de Jalisco', 'Miguel Ãngel Pedroza', 'mapedroza@exptropical.mx', '+52-317-382-8002', 'Mexico', 'Jalisco', 'AutlÃ¡n', 'Papaya', ARRAY['Mango', 'Coconut'], 350, 4200, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Rancho Mangos del PacÃ­fico', 'Isabel Cristina Varela', 'icvarela@mangospacifico.mx', '+52-317-382-8003', 'Mexico', 'Jalisco', 'AutlÃ¡n', 'Mango', ARRAY['Avocado Hass'], 280, 3360, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- TomatlÃ¡n - Coastal Tropical
('Frutas Costa Alegre', 'Roberto Carlos LeÃ³n', 'rcleon@costaalegre.mx', '+52-322-285-9001', 'Mexico', 'Jalisco', 'TomatlÃ¡n', 'Mango', ARRAY['Papaya', 'Coconut', 'Banana'], 520, 6240, ARRAY['GlobalGAP', 'SENASICA', 'Rainforest Alliance'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),

('Exportadora TomatlÃ¡n Premium', 'Adriana SofÃ­a Mendez', 'asmendez@exptomat.mx', '+52-322-285-9002', 'Mexico', 'Jalisco', 'TomatlÃ¡n', 'Papaya', ARRAY['Mango', 'Pineapple'], 380, 4560, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Cooperativa FrutÃ­cola Costalegre', 'Juan Pablo Guerrero', 'jpguerrero@coopcostalegre.mx', '+52-322-285-9003', 'Mexico', 'Jalisco', 'TomatlÃ¡n', 'Coconut', ARRAY['Mango', 'Papaya'], 290, 2900, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- CihuatlÃ¡n
('Frutas CihuatlÃ¡n Export', 'Diana Laura Cervantes', 'dlcervantes@frutascihua.mx', '+52-315-355-1001', 'Mexico', 'Jalisco', 'CihuatlÃ¡n', 'Mango', ARRAY['Coconut', 'Lime'], 240, 2880, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 2, NOW()),

-- Lagos de Moreno - Vegetables
('Hortalizas Lagos Premium', 'Fernando Javier RÃ­os', 'fjrios@hortalizaslagos.mx', '+52-474-742-2001', 'Mexico', 'Jalisco', 'Lagos de Moreno', 'Tomato', ARRAY['Pepper Bell', 'Cucumber'], 180, 5400, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Productores de Vegetales del Norte', 'Claudia Esperanza Duarte', 'ceduarte@vegetnorte.mx', '+52-474-742-2002', 'Mexico', 'Jalisco', 'Lagos de Moreno', 'Pepper Bell', ARRAY['Tomato', 'Zucchini'], 150, 4500, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- Zapotlanejo - Mixed Agriculture
('Agroproductores Zapotlanejo', 'Oscar Alejandro Vega', 'oavega@agrozapot.mx', '+52-373-734-3001', 'Mexico', 'Jalisco', 'Zapotlanejo', 'Strawberry', ARRAY['Raspberry', 'Blackberry'], 165, 1240, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Berries Altos de Jalisco', 'VerÃ³nica Alejandra Ruiz', 'varuiz@berriesaltos.mx', '+52-373-734-3002', 'Mexico', 'Jalisco', 'Zapotlanejo', 'Raspberry', ARRAY['Blueberry'], 190, 1425, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

-- Additional Jalisco
('Frutas Premium de Jalisco', 'HÃ©ctor Eduardo Solano', 'hesolano@frutaspremiumjal.mx', '+52-33-3615-1004', 'Mexico', 'Jalisco', 'Guadalajara', 'Blueberry', ARRAY['Raspberry', 'Strawberry'], 310, 2325, ARRAY['GlobalGAP', 'SENASICA', 'BRC Food'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),

('Exportadora AgrÃ­cola TapatÃ­a', 'Martha Elena Ochoa', 'meochoa@agrotapatia.mx', '+52-33-3615-1005', 'Mexico', 'Jalisco', 'Guadalajara', 'Raspberry', ARRAY['Blackberry'], 230, 1725, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW());

-- =====================================================
-- SINALOA - Tomatoes & Vegetables (30 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES

-- CuliacÃ¡n - Tomato Capital
('Tomates CuliacÃ¡n Premium S.A.', 'JosÃ© RamÃ³n FÃ©lix', 'jrfelix@tomatesculiacan.mx', '+52-667-715-1001', 'Mexico', 'Sinaloa', 'CuliacÃ¡n', 'Tomato Roma', ARRAY['Tomato Beef', 'Tomato Cherry', 'Tomato Grape'], 680, 20400, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA', 'Primus GFS', 'SQF Level 3'], ARRAY['USA', 'Canada', 'Europe', 'Japan'], 'approved', 0, NOW()),

('Exportadora HortÃ­cola del PacÃ­fico', 'MarÃ­a Guadalupe Castro', 'mgcastro@hortipac.mx', '+52-667-715-1002', 'Mexico', 'Sinaloa', 'CuliacÃ¡n', 'Tomato Beef', ARRAY['Pepper Bell', 'Cucumber'], 520, 15600, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS', 'BRC Food'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Vegetales Premium Sinaloa', 'Carlos Alberto Valenzuela', 'cavalenzuela@vegpremium.mx', '+52-667-715-1003', 'Mexico', 'Sinaloa', 'CuliacÃ¡n', 'Tomato Cherry', ARRAY['Tomato Grape', 'Pepper JalapeÃ±o'], 380, 11400, ARRAY['GlobalGAP', 'SENASICA', 'SQF Level 2'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Agroindustrias El Valle', 'Patricia Fernanda Leyva', 'pfleyva@agroelvalle.mx', '+52-667-715-1004', 'Mexico', 'Sinaloa', 'CuliacÃ¡n', 'Pepper Bell', ARRAY['Tomato Roma', 'Cucumber', 'Eggplant'], 450, 13500, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),

('Rancho Los Mochis Produce', 'Fernando Arturo LÃ³pez', 'falopez@rancholosmochis.mx', '+52-667-715-1005', 'Mexico', 'Sinaloa', 'CuliacÃ¡n', 'Cucumber', ARRAY['Zucchini', 'Squash'], 290, 8700, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Cooperativa AgrÃ­cola CuliacÃ¡n', 'Rosa Elena Quintero', 'requintero@coopculiacan.mx', '+52-667-715-1006', 'Mexico', 'Sinaloa', 'CuliacÃ¡n', 'Tomato Roma', ARRAY['Pepper Bell', 'Tomato Beef'], 340, 10200, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Hortalizas Tres RÃ­os', 'Miguel Eduardo Mendoza', 'memendoza@tresrios.mx', '+52-667-715-1007', 'Mexico', 'Sinaloa', 'CuliacÃ¡n', 'Pepper JalapeÃ±o', ARRAY['Pepper Serrano', 'Tomato'], 210, 6300, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

('Exportadora Sinaloa Verde', 'Laura Patricia Osuna', 'lposuna@sinaloaverde.mx', '+52-667-715-1008', 'Mexico', 'Sinaloa', 'CuliacÃ¡n', 'Zucchini', ARRAY['Squash', 'Cucumber'], 180, 5400, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

-- Los Mochis
('AgrÃ­cola del Fuerte S.A.', 'Jorge Luis Moreno', 'jlmoreno@agricolafuerte.mx', '+52-668-812-2001', 'Mexico', 'Sinaloa', 'Los Mochis', 'Tomato Roma', ARRAY['Pepper Bell', 'Cucumber'], 420, 12600, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS', 'SQF Level 2'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Productores Unidos del Norte', 'Ana MarÃ­a Ochoa', 'amochoa@produnorte.mx', '+52-668-812-2002', 'Mexico', 'Sinaloa', 'Los Mochis', 'Pepper Bell', ARRAY['Tomato', 'Eggplant'], 350, 10500, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Hortalizas Los Mochis', 'Ricardo Daniel Flores', 'rdflores@hortlosmochis.mx', '+52-668-812-2003', 'Mexico', 'Sinaloa', 'Los Mochis', 'Cucumber', ARRAY['Zucchini', 'Tomato Cherry'], 260, 7800, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Cooperativa AgrÃ­cola del Fuerte', 'Silvia Guadalupe Acosta', 'sgacosta@coopfuerte.mx', '+52-668-812-2004', 'Mexico', 'Sinaloa', 'Los Mochis', 'Tomato Beef', ARRAY['Pepper JalapeÃ±o'], 195, 5850, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- Guasave
('Vegetales Guasave Premium', 'Alejandro Sergio Medina', 'asmedina@vegguasave.mx', '+52-687-872-3001', 'Mexico', 'Sinaloa', 'Guasave', 'Tomato Roma', ARRAY['Pepper Bell', 'Cucumber'], 480, 14400, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS', 'BRC Food'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),

('Exportadora AgrÃ­cola Guasave', 'Diana Carolina Ramos', 'dcramos@expagroguasave.mx', '+52-687-872-3002', 'Mexico', 'Sinaloa', 'Guasave', 'Pepper Bell', ARRAY['Tomato Cherry', 'Eggplant'], 380, 11400, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Rancho Santa Rosa Guasave', 'Pedro Ignacio Valdez', 'pivaldez@santarosagas.mx', '+52-687-872-3003', 'Mexico', 'Sinaloa', 'Guasave', 'Cucumber', ARRAY['Zucchini', 'Squash'], 240, 7200, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Productores de Guasave Unidos', 'Martha Alicia Torres', 'matorres@prodguasave.mx', '+52-687-872-3004', 'Mexico', 'Sinaloa', 'Guasave', 'Tomato Grape', ARRAY['Tomato Cherry'], 165, 4950, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- Navolato
('AgrÃ­cola Navolato S.A.', 'Roberto Enrique Castro', 'recastro@agricolanav.mx', '+52-672-727-4001', 'Mexico', 'Sinaloa', 'Navolato', 'Tomato Roma', ARRAY['Pepper Bell', 'Tomato Beef'], 390, 11700, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('HortÃ­cola del Valle Navolato', 'Adriana Fernanda RÃ­os', 'afrios@hortivalle.mx', '+52-672-727-4002', 'Mexico', 'Sinaloa', 'Navolato', 'Pepper Bell', ARRAY['Cucumber', 'Zucchini'], 290, 8700, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Exportadora Navolato Premium', 'Oscar Alejandro Soto', 'oasoto@expnavpremium.mx', '+52-672-727-4003', 'Mexico', 'Sinaloa', 'Navolato', 'Cucumber', ARRAY['Squash', 'Tomato'], 210, 6300, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- MazatlÃ¡n
('Frutas Tropicales MazatlÃ¡n', 'Carmen LucÃ­a BeltrÃ¡n', 'clbeltran@frutasmaz.mx', '+52-669-913-5001', 'Mexico', 'Sinaloa', 'MazatlÃ¡n', 'Mango', ARRAY['Papaya', 'Coconut'], 320, 3840, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS', 'Fair Trade'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),

('Exportadora Tropical del PacÃ­fico', 'Luis Fernando Gastelum', 'lfgastelum@exptropac.mx', '+52-669-913-5002', 'Mexico', 'Sinaloa', 'MazatlÃ¡n', 'Papaya', ARRAY['Mango', 'Banana'], 250, 3000, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 2, NOW()),

('Coconuts MazatlÃ¡n Export', 'Isabel Cristina Quiroz', 'icquiroz@cocosmaz.mx', '+52-669-913-5003', 'Mexico', 'Sinaloa', 'MazatlÃ¡n', 'Coconut', ARRAY['Mango'], 180, 1800, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- Ahome
('Vegetales Ahome Premium', 'Juan Carlos DomÃ­nguez', 'jcdominguez@vegahome.mx', '+52-668-815-6001', 'Mexico', 'Sinaloa', 'Ahome', 'Tomato Roma', ARRAY['Pepper Bell', 'Cucumber'], 340, 10200, ARRAY['GlobalGAP', 'SENASICA', 'SQF Level 2'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('AgrÃ­cola San Lorenzo', 'MarÃ­a Elena CÃ¡rdenas', 'mecardenas@agrisanlorenzo.mx', '+52-668-815-6002', 'Mexico', 'Sinaloa', 'Ahome', 'Pepper Bell', ARRAY['Tomato', 'Eggplant'], 270, 8100, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

-- Angostura
('Productores de Angostura', 'Sergio Antonio Verdugo', 'saverdugo@prodangostura.mx', '+52-697-734-7001', 'Mexico', 'Sinaloa', 'Angostura', 'Tomato Roma', ARRAY['Pepper JalapeÃ±o', 'Cucumber'], 220, 6600, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

('Hortalizas Costa de Angostura', 'VerÃ³nica Patricia Espinoza', 'vpespinoza@hortcosta.mx', '+52-697-734-7002', 'Mexico', 'Sinaloa', 'Angostura', 'Cucumber', ARRAY['Zucchini', 'Squash'], 175, 5250, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

-- El Rosario
('Frutas El Rosario Export', 'Arturo Rafael LÃ³pez', 'arlopez@frutasrosario.mx', '+52-694-952-8001', 'Mexico', 'Sinaloa', 'El Rosario', 'Mango', ARRAY['Chili Peppers', 'Tomato'], 190, 2280, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

-- Additional Sinaloa
('Hortalizas del Sol Sinaloa', 'Eduardo Francisco Ruiz', 'efruiz@hortsolsin.mx', '+52-667-715-1009', 'Mexico', 'Sinaloa', 'CuliacÃ¡n', 'Tomato Beef', ARRAY['Pepper Bell', 'Cucumber'], 310, 9300, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Exportadora AgrÃ­cola PacÃ­fico', 'Norma AngÃ©lica PÃ©rez', 'naperez@expagropacifico.mx', '+52-667-715-1010', 'Mexico', 'Sinaloa', 'CuliacÃ¡n', 'Pepper Bell', ARRAY['Tomato Roma', 'Eggplant'], 280, 8400, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW());

-- =====================================================
-- BAJA CALIFORNIA - Leafy Greens & Wine Grapes (20 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES

-- San QuintÃ­n - Leafy Greens Capital
('Lechugas San QuintÃ­n Premium', 'Roberto Carlos Ibarra', 'rcibarra@lechugassq.mx', '+52-616-165-1001', 'Mexico', 'Baja California', 'San QuintÃ­n', 'Lettuce Romaine', ARRAY['Lettuce Iceberg', 'Spinach', 'Kale'], 520, 15600, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA', 'Primus GFS', 'LGMA'], ARRAY['USA', 'Canada'], 'approved', 0, NOW()),

('Verduras del Valle S.A.', 'MarÃ­a Fernanda Ochoa', 'mfochoa@verdurasvalle.mx', '+52-616-165-1002', 'Mexico', 'Baja California', 'San QuintÃ­n', 'Spinach', ARRAY['Kale', 'Arugula', 'Chard'], 380, 11400, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS', 'LGMA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Exportadora HortÃ­cola PacÃ­fico', 'Carlos Eduardo Navarro', 'cenavarro@exphortpac.mx', '+52-616-165-1003', 'Mexico', 'Baja California', 'San QuintÃ­n', 'Lettuce Iceberg', ARRAY['Lettuce Romaine', 'Celery'], 420, 12600, ARRAY['GlobalGAP', 'SENASICA', 'SQF Level 2'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Productores de Hortalizas del Norte', 'Ana Cristina Mendez', 'acmendez@prodnorte.mx', '+52-616-165-1004', 'Mexico', 'Baja California', 'San QuintÃ­n', 'Kale', ARRAY['Spinach', 'Arugula'], 290, 8700, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 1, NOW()),

('Cooperativa AgrÃ­cola San QuintÃ­n', 'JesÃºs Manuel Torres', 'jmtorres@coopsanquintin.mx', '+52-616-165-1005', 'Mexico', 'Baja California', 'San QuintÃ­n', 'Celery', ARRAY['Lettuce', 'Broccoli'], 240, 7200, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Greens Premium Baja', 'SofÃ­a Alejandra Ruiz', 'saruiz@greenspremium.mx', '+52-616-165-1006', 'Mexico', 'Baja California', 'San QuintÃ­n', 'Arugula', ARRAY['Spinach', 'Mixed Greens'], 175, 5250, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Hortalizas Costa PacÃ­fica', 'Miguel Ãngel Vargas', 'mavargas@hortcostapac.mx', '+52-616-165-1007', 'Mexico', 'Baja California', 'San QuintÃ­n', 'Broccoli', ARRAY['Cauliflower', 'Cabbage'], 310, 9300, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Lechugas del Mar', 'Patricia Elena Soto', 'pesoto@lechugasmar.mx', '+52-616-165-1008', 'Mexico', 'Baja California', 'San QuintÃ­n', 'Lettuce Romaine', ARRAY['Lettuce Butter', 'Lettuce Red'], 220, 6600, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- Valle de Guadalupe - Wine Grapes
('ViÃ±edos Valle de Guadalupe', 'JosÃ© Antonio RodrÃ­guez', 'jarodriguez@vinedosvg.mx', '+52-646-155-2001', 'Mexico', 'Baja California', 'Valle de Guadalupe', 'Grapes Wine', ARRAY['Grapes Cabernet', 'Grapes Merlot', 'Grapes Tempranillo'], 180, 1080, ARRAY['Organic', 'SENASICA', 'VinMex Certified'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),

('Bodega Monte Xanic Vineyards', 'Elena MarÃ­a DomÃ­nguez', 'emdominguez@montexanic.mx', '+52-646-155-2002', 'Mexico', 'Baja California', 'Valle de Guadalupe', 'Grapes Cabernet', ARRAY['Grapes Chardonnay', 'Grapes Sauvignon'], 150, 900, ARRAY['Organic', 'SENASICA'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),

('ViÃ±as del Sol Baja', 'Francisco Javier PÃ©rez', 'fjperez@vinassol.mx', '+52-646-155-2003', 'Mexico', 'Baja California', 'Valle de Guadalupe', 'Grapes Merlot', ARRAY['Grapes Nebbiolo', 'Grapes Syrah'], 120, 720, ARRAY['SENASICA', 'VinMex Certified'], ARRAY['Mexico', 'USA'], 'approved', 2, NOW()),

-- Ensenada - Mixed
('Frutas y Verduras Ensenada', 'Guadalupe Fernanda Castro', 'gfcastro@frutasense.mx', '+52-646-178-3001', 'Mexico', 'Baja California', 'Ensenada', 'Strawberry', ARRAY['Tomato', 'Cucumber'], 280, 4200, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA'], 'approved', 1, NOW()),

('AgrÃ­cola Costa Baja', 'Ricardo Alberto Luna', 'raluna@agricostabaja.mx', '+52-646-178-3002', 'Mexico', 'Baja California', 'Ensenada', 'Tomato', ARRAY['Pepper Bell', 'Zucchini'], 195, 5850, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

-- Mexicali - Vegetables
('Hortalizas Mexicali Premium', 'Alberto Javier Sandoval', 'ajsandoval@hortmexicali.mx', '+52-686-552-4001', 'Mexico', 'Baja California', 'Mexicali', 'Lettuce Iceberg', ARRAY['Lettuce Romaine', 'Onion'], 350, 10500, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS', 'LGMA'], ARRAY['USA'], 'approved', 1, NOW()),

('Vegetales del Desierto', 'Diana Laura Moreno', 'dlmoreno@vegdesierto.mx', '+52-686-552-4002', 'Mexico', 'Baja California', 'Mexicali', 'Onion', ARRAY['Garlic', 'Asparagus'], 270, 8100, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Exportadora AgrÃ­cola Imperial', 'Fernando Daniel Ramos', 'fdramos@expimperial.mx', '+52-686-552-4003', 'Mexico', 'Baja California', 'Mexicali', 'Asparagus', ARRAY['Onion', 'Lettuce'], 190, 2850, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

-- Tijuana Metro
('Frutas Frescas Tijuana', 'Claudia Marcela Herrera', 'cmherrera@frutastj.mx', '+52-664-634-5001', 'Mexico', 'Baja California', 'Tijuana', 'Strawberry', ARRAY['Raspberry', 'Blueberry'], 160, 2400, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

-- Tecate
('AgrÃ­cola Valle de Tecate', 'Oscar Enrique Fuentes', 'oefuentes@agritecate.mx', '+52-665-654-6001', 'Mexico', 'Baja California', 'Tecate', 'Grapes Wine', ARRAY['Olive', 'Citrus'], 140, 840, ARRAY['Organic', 'SENASICA'], ARRAY['USA', 'Mexico'], 'approved', 2, NOW()),

-- Additional Baja California
('Greens Export Baja California', 'VerÃ³nica Isabel Contreras', 'vicontreras@greensexport.mx', '+52-616-165-1009', 'Mexico', 'Baja California', 'San QuintÃ­n', 'Mixed Greens', ARRAY['Spinach', 'Arugula', 'Kale'], 245, 7350, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA', 'LGMA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Productos del Campo Baja', 'HÃ©ctor Manuel Espinoza', 'hmespinoza@prodcampobaja.mx', '+52-616-165-1010', 'Mexico', 'Baja California', 'San QuintÃ­n', 'Cauliflower', ARRAY['Broccoli', 'Cabbage'], 210, 6300, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW());

-- =====================================================
-- GUANAJUATO - Vegetables & Strawberries (15 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES

-- Irapuato - Strawberry Capital
('Fresas Irapuato Premium S.A.', 'JosÃ© Luis GonzÃ¡lez', 'jlgonzalez@fresasirapuato.mx', '+52-462-624-1001', 'Mexico', 'Guanajuato', 'Irapuato', 'Strawberry', ARRAY['Raspberry', 'Blackberry'], 450, 6750, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA', 'Primus GFS', 'Fair Trade'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 0, NOW()),

('Cooperativa Fresera de Irapuato', 'MarÃ­a Teresa RamÃ­rez', 'mtramirez@coopfresera.mx', '+52-462-624-1002', 'Mexico', 'Guanajuato', 'Irapuato', 'Strawberry', ARRAY['Blueberry'], 350, 5250, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Exportadora Frutas del BajÃ­o', 'Carlos Eduardo Mendoza', 'cemendoza@frutasbajio.mx', '+52-462-624-1003', 'Mexico', 'Guanajuato', 'Irapuato', 'Strawberry', ARRAY['Raspberry'], 280, 4200, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Berries Irapuato Export', 'Ana SofÃ­a Delgado', 'asdelgado@berriesira.mx', '+52-462-624-1004', 'Mexico', 'Guanajuato', 'Irapuato', 'Raspberry', ARRAY['Strawberry', 'Blackberry'], 220, 1650, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

-- Celaya - Vegetables
('Hortalizas Celaya Premium', 'Roberto Miguel Aguilar', 'rmaguilar@hortcelaya.mx', '+52-461-614-2001', 'Mexico', 'Guanajuato', 'Celaya', 'Broccoli', ARRAY['Cauliflower', 'Lettuce', 'Cabbage'], 380, 11400, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS', 'SQF Level 2'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('Vegetales del BajÃ­o S.A.', 'Laura Patricia Ochoa', 'lpochoa@vegbajio.mx', '+52-461-614-2002', 'Mexico', 'Guanajuato', 'Celaya', 'Cauliflower', ARRAY['Broccoli', 'Romanesco'], 290, 8700, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

('Exportadora AgrÃ­cola Celaya', 'Fernando Javier Torres', 'fjtorres@expagrocelaya.mx', '+52-461-614-2003', 'Mexico', 'Guanajuato', 'Celaya', 'Lettuce Romaine', ARRAY['Lettuce Iceberg', 'Spinach'], 240, 7200, ARRAY['GlobalGAP', 'SENASICA', 'LGMA'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

-- LeÃ³n - Mixed Agriculture
('Agroproductores LeÃ³n', 'Guadalupe Fernanda RÃ­os', 'gfrios@agroproductores.mx', '+52-477-714-3001', 'Mexico', 'Guanajuato', 'LeÃ³n', 'Pepper Bell', ARRAY['Tomato', 'Cucumber'], 310, 9300, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA'], 'approved', 1, NOW()),

('Hortalizas Premium LeÃ³n', 'Miguel Ãngel Soto', 'masoto@hortleon.mx', '+52-477-714-3002', 'Mexico', 'Guanajuato', 'LeÃ³n', 'Tomato Roma', ARRAY['Pepper JalapeÃ±o', 'Cucumber'], 220, 6600, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- Salamanca
('Vegetales Salamanca Export', 'Patricia Elena Moreno', 'pemoreno@vegsalamanca.mx', '+52-464-648-4001', 'Mexico', 'Guanajuato', 'Salamanca', 'Broccoli', ARRAY['Cauliflower', 'Cabbage'], 260, 7800, ARRAY['GlobalGAP', 'SENASICA', 'Primus GFS'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),

('AgrÃ­cola San Miguel Salamanca', 'Oscar Alejandro Vargas', 'oavargas@agrisanmiguel.mx', '+52-464-648-4002', 'Mexico', 'Guanajuato', 'Salamanca', 'Lettuce Iceberg', ARRAY['Lettuce Romaine'], 190, 5700, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- Silao
('Productores de Silao', 'Carmen LucÃ­a Herrera', 'clherrera@prodsilao.mx', '+52-472-722-5001', 'Mexico', 'Guanajuato', 'Silao', 'Onion', ARRAY['Garlic', 'Pepper'], 175, 5250, ARRAY['GlobalGAP', 'SENASICA'], ARRAY['USA'], 'approved', 2, NOW()),

-- Dolores Hidalgo
('AgrÃ­cola Dolores Premium', 'Arturo RenÃ© Castillo', 'arcastillo@agridolores.mx', '+52-418-182-6001', 'Mexico', 'Guanajuato', 'Dolores Hidalgo', 'Pepper Chili', ARRAY['Tomato', 'Squash'], 140, 4200, ARRAY['SENASICA', 'GlobalGAP'], ARRAY['USA'], 'approved', 2, NOW()),

-- San Miguel de Allende
('Hortalizas San Miguel', 'Isabel Cristina Fuentes', 'icfuentes@hortsanmiguel.mx', '+52-415-152-7001', 'Mexico', 'Guanajuato', 'San Miguel de Allende', 'Lettuce Organic', ARRAY['Arugula', 'Kale', 'Spinach'], 120, 3600, ARRAY['USDA Organic', 'GlobalGAP', 'SENASICA'], ARRAY['USA', 'Mexico'], 'approved', 1, NOW()),

-- Additional Guanajuato
('Berries Premium Guanajuato', 'Sergio Daniel LÃ³pez', 'sdlopez@berriespremiumgto.mx', '+52-462-624-1005', 'Mexico', 'Guanajuato', 'Irapuato', 'Blueberry', ARRAY['Strawberry', 'Raspberry'], 195, 1465, ARRAY['GlobalGAP', 'SENASICA', 'BRC Food'], ARRAY['USA', 'Canada'], 'approved', 1, NOW());

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count growers by state
-- SELECT state, COUNT(*) as grower_count FROM growers WHERE country = 'Mexico' GROUP BY state ORDER BY grower_count DESC;

-- Count by primary product
-- SELECT primary_product, COUNT(*) as count FROM growers WHERE country = 'Mexico' GROUP BY primary_product ORDER BY count DESC;

-- Count by risk tier
-- SELECT risk_tier, COUNT(*) as count FROM growers WHERE country = 'Mexico' GROUP BY risk_tier;

-- Total: 150 Mexico Growers
-- MichoacÃ¡n: 50, Jalisco: 35, Sinaloa: 30, Baja California: 20, Guanajuato: 15
