-- =====================================================
-- AuditDNA Grower Seed Data - SOUTH & CENTRAL AMERICA
-- Regions: Peru, Chile, Guatemala, Colombia, Ecuador
-- Total: 100 Growers
-- Generated: 2026-01-15
-- =====================================================

-- =====================================================
-- PERU (35 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES
('Agrícola Chapi S.A.', 'Carlos Alberto Fernández', 'cafernandez@agricolachapi.pe', '+51-56-232001', 'Peru', 'Ica', 'Ica', 'Asparagus', ARRAY['Asparagus White', 'Grapes Table'], 680, 10200, ARRAY['GlobalGAP', 'HACCP', 'SENASA Peru', 'BRC Food'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 0, NOW()),
('Sociedad Agrícola Drokasa', 'María Elena Castillo', 'mecastillo@drokasa.pe', '+51-56-232002', 'Peru', 'Ica', 'Ica', 'Asparagus', ARRAY['Avocado Hass', 'Grapes Red Globe'], 520, 7800, ARRAY['GlobalGAP', 'SENASA Peru', 'Primus GFS', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Complejo Agroindustrial Beta', 'Roberto Miguel Ramos', 'rmramos@cabeta.pe', '+51-56-232003', 'Peru', 'Ica', 'Chincha', 'Asparagus', ARRAY['Asparagus Green', 'Citrus Mandarin'], 450, 6750, ARRAY['GlobalGAP', 'HACCP', 'SENASA Peru', 'SQF Level 2'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('Agroindustrias AIB S.A.', 'Ana Sofía Mendoza', 'asmendoza@aib.pe', '+51-56-232004', 'Peru', 'Ica', 'Ica', 'Grapes Table', ARRAY['Grapes Red Seedless', 'Grapes Green'], 380, 5700, ARRAY['GlobalGAP', 'SENASA Peru', 'BRC Food'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Exportadora El Pedregal S.A.', 'Fernando Daniel Torres', 'fdtorres@elpedregal.pe', '+51-56-232005', 'Peru', 'Ica', 'Villacurí', 'Asparagus Green', ARRAY['Avocado Hass', 'Blueberry'], 620, 9300, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru', 'Rainforest Alliance'], ARRAY['USA', 'Canada', 'Europe', 'Japan'], 'approved', 0, NOW()),
('Agrícola Pampa Baja', 'Claudia Patricia Díaz', 'cpdiaz@pampabaja.pe', '+51-56-232006', 'Peru', 'Ica', 'Ocucaje', 'Grapes Table', ARRAY['Grapes Crimson', 'Citrus'], 290, 4350, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Camposol S.A.', 'José Luis Gutiérrez', 'jlgutierrez@camposol.pe', '+51-44-485001', 'Peru', 'La Libertad', 'Trujillo', 'Avocado Hass', ARRAY['Blueberry', 'Asparagus', 'Mango'], 2200, 44000, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru', 'Fair Trade', 'Rainforest Alliance', 'BRC Food'], ARRAY['USA', 'Canada', 'Europe', 'Asia', 'China'], 'approved', 0, NOW()),
('Danper Trujillo S.A.C.', 'María Fernanda López', 'mflopez@danper.pe', '+51-44-485002', 'Peru', 'La Libertad', 'Trujillo', 'Asparagus', ARRAY['Asparagus Green', 'Avocado', 'Artichoke'], 850, 12750, ARRAY['GlobalGAP', 'HACCP', 'SENASA Peru', 'SQF Level 3', 'SMETA'], ARRAY['USA', 'Europe', 'Japan'], 'approved', 0, NOW()),
('Sociedad Agrícola Virú', 'Carlos Eduardo Navarro', 'cenavarro@saviru.pe', '+51-44-485003', 'Peru', 'La Libertad', 'Virú', 'Asparagus', ARRAY['Pepper Bell', 'Artichoke'], 580, 8700, ARRAY['GlobalGAP', 'SENASA Peru', 'Primus GFS', 'BRC Food'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Tal S.A.', 'Patricia Elena Rojas', 'perojas@talsa.pe', '+51-44-485004', 'Peru', 'La Libertad', 'Trujillo', 'Asparagus Green', ARRAY['Avocado Hass', 'Blueberry'], 420, 6300, ARRAY['GlobalGAP', 'SENASA Peru', 'HACCP'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('Agrícola Cerro Prieto', 'Miguel Ángel Soto', 'masoto@cerroprieto.pe', '+51-44-485005', 'Peru', 'La Libertad', 'Chao', 'Blueberry', ARRAY['Avocado Hass', 'Asparagus'], 480, 3600, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru', 'Fair Trade'], ARRAY['USA', 'Canada', 'Europe', 'China'], 'approved', 0, NOW()),
('Hortifrut Peru', 'Ana Cristina Mendez', 'acmendez@hortifrut.pe', '+51-44-485006', 'Peru', 'La Libertad', 'Trujillo', 'Blueberry', ARRAY['Raspberry', 'Blackberry'], 350, 2625, ARRAY['GlobalGAP', 'SENASA Peru', 'Primus GFS'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('Agrícola Cerro Colorado', 'Roberto Carlos Luna', 'rcluna@cerrocolorado.pe', '+51-74-282001', 'Peru', 'Lambayeque', 'Motupe', 'Mango', ARRAY['Mango Kent', 'Lime', 'Avocado'], 380, 4560, ARRAY['GlobalGAP', 'SENASA Peru', 'Primus GFS', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Sunshine Export S.A.C.', 'Diana Laura Herrera', 'dlherrera@sunshineexport.pe', '+51-74-282002', 'Peru', 'Lambayeque', 'Olmos', 'Mango Kent', ARRAY['Mango Tommy', 'Lime Persian'], 290, 3480, ARRAY['GlobalGAP', 'SENASA Peru', 'BRC Food'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('Frutos Tropicales del Norte', 'Fernando Javier Castro', 'fjcastro@frutostrop.pe', '+51-74-282003', 'Peru', 'Lambayeque', 'Motupe', 'Lime Persian', ARRAY['Mango', 'Papaya'], 210, 3150, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Agrícola Andrea S.A.C.', 'Guadalupe Fernanda Ríos', 'gfrios@agricolaandrea.pe', '+51-73-345001', 'Peru', 'Piura', 'Sullana', 'Mango', ARRAY['Mango Kent', 'Mango Haden', 'Banana Organic'], 420, 5040, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru', 'Fair Trade'], ARRAY['USA', 'Europe', 'Japan'], 'approved', 1, NOW()),
('Biofruit S.A.', 'Carlos Antonio Mendoza', 'camendoza@biofruit.pe', '+51-73-345002', 'Peru', 'Piura', 'Tambogrande', 'Banana Organic', ARRAY['Mango', 'Lime'], 350, 7000, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru', 'Fair Trade', 'Rainforest Alliance'], ARRAY['USA', 'Europe'], 'approved', 0, NOW()),
('Agrícola del Chira', 'María Teresa Valdez', 'mtvaldez@agricolachira.pe', '+51-73-345003', 'Peru', 'Piura', 'Sullana', 'Mango Kent', ARRAY['Lime', 'Avocado Hass'], 280, 3360, ARRAY['GlobalGAP', 'SENASA Peru', 'Primus GFS'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Agrícola Pampa Verde', 'José Eduardo Torres', 'jetorres@pampaverde.pe', '+51-54-428001', 'Peru', 'Arequipa', 'La Joya', 'Onion Red', ARRAY['Onion Yellow', 'Garlic'], 310, 9300, ARRAY['GlobalGAP', 'SENASA Peru', 'Primus GFS'], ARRAY['USA', 'Colombia', 'Chile'], 'approved', 1, NOW()),
('Productores de Arequipa Unidos', 'Laura Patricia Flores', 'lpflores@prodarequipa.pe', '+51-54-428002', 'Peru', 'Arequipa', 'Camaná', 'Garlic', ARRAY['Onion', 'Pepper Rocoto'], 220, 3300, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Mexico', 'Brazil'], 'approved', 2, NOW()),
('Agrícola La Venta', 'Ricardo Alberto Soto', 'rasoto@laventa.pe', '+51-1-717001', 'Peru', 'Lima', 'Cañete', 'Avocado Hass', ARRAY['Citrus Mandarin', 'Blueberry'], 340, 5100, ARRAY['GlobalGAP', 'SENASA Peru', 'BRC Food'], ARRAY['USA', 'Europe', 'Chile'], 'approved', 1, NOW()),
('Fundo Santa Patricia', 'Elena María Gutiérrez', 'emgutierrez@santapatricia.pe', '+51-1-717002', 'Peru', 'Lima', 'Huaral', 'Citrus Mandarin', ARRAY['Orange Valencia', 'Avocado'], 260, 3900, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Canada'], 'approved', 2, NOW()),
('Agrícola San José', 'Arturo René Castillo', 'arcastillo@agrisanjose.pe', '+51-56-232008', 'Peru', 'Ica', 'Nazca', 'Grapes Table', ARRAY['Asparagus', 'Citrus'], 240, 3600, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Inca Farms S.A.C.', 'Silvia Marcela Ochoa', 'smochoa@incafarms.pe', '+51-44-485007', 'Peru', 'La Libertad', 'Pacasmayo', 'Blueberry', ARRAY['Raspberry'], 180, 1350, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),
('Agroindustrial Laredo', 'Víctor Hugo Ramos', 'vhramos@laredo.pe', '+51-44-485008', 'Peru', 'La Libertad', 'Laredo', 'Asparagus', ARRAY['Avocado'], 420, 6300, ARRAY['GlobalGAP', 'SENASA Peru', 'HACCP'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Fundo Choloque', 'Carmen Lucía Moreno', 'clmoreno@choloque.pe', '+51-74-282004', 'Peru', 'Lambayeque', 'Jayanca', 'Mango', ARRAY['Lime', 'Papaya'], 195, 2340, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Agrícola BGS', 'Jorge Luis Espinoza', 'jlespinoza@agricolabgs.pe', '+51-73-345004', 'Peru', 'Piura', 'Chulucanas', 'Mango Kent', ARRAY['Lime Persian'], 230, 2760, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Pacific Fruits Peru', 'Andrea Sofía Vega', 'asvega@pacificfruits.pe', '+51-56-232009', 'Peru', 'Ica', 'Pisco', 'Grapes Table', ARRAY['Asparagus', 'Avocado'], 320, 4800, ARRAY['GlobalGAP', 'SENASA Peru', 'BRC Food'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Agrícola Valle Grande', 'Roberto Javier Campos', 'rjcampos@vallegrande.pe', '+51-44-485009', 'Peru', 'La Libertad', 'Chepén', 'Asparagus', ARRAY['Avocado Hass'], 280, 4200, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Exportadora Frutas del Sol', 'María Isabel Torres', 'mitorres@frutassol.pe', '+51-73-345005', 'Peru', 'Piura', 'Piura', 'Mango', ARRAY['Banana', 'Lime'], 250, 3000, ARRAY['GlobalGAP', 'SENASA Peru', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Agrícola Don Ricardo', 'Fernando Andrés Luna', 'faluna@donricardo.pe', '+51-56-232010', 'Peru', 'Ica', 'Ica', 'Asparagus Green', ARRAY['Grapes Table'], 350, 5250, ARRAY['GlobalGAP', 'SENASA Peru', 'HACCP'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Frutas Premium Perú', 'Claudia Fernanda Reyes', 'cfreyes@frutaspremium.pe', '+51-44-485010', 'Peru', 'La Libertad', 'Trujillo', 'Blueberry', ARRAY['Avocado Hass'], 210, 1575, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('Agrícola Santa Elena', 'Oscar Miguel Delgado', 'omdelgado@santaelena.pe', '+51-74-282005', 'Peru', 'Lambayeque', 'Motupe', 'Mango Kent', ARRAY['Lime'], 175, 2100, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Cooperativa Agraria Piura', 'Patricia Elena Mendoza', 'pemendoza@cooppiura.pe', '+51-73-345006', 'Peru', 'Piura', 'Morropón', 'Banana Organic', ARRAY['Mango', 'Cacao'], 290, 5800, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW());

-- =====================================================
-- CHILE (25 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES
('Frutas de Chile S.A.', 'Rodrigo Andrés Muñoz', 'ramunoz@frutaschile.cl', '+56-2-2345001', 'Chile', 'O''Higgins', 'Rancagua', 'Grapes Table', ARRAY['Cherry', 'Blueberry', 'Apple'], 850, 12750, ARRAY['GlobalGAP', 'SAG Chile', 'BRC Food', 'Rainforest Alliance'], ARRAY['USA', 'Europe', 'Asia', 'China'], 'approved', 0, NOW()),
('Exportadora del Maule', 'Carolina Andrea Soto', 'casoto@expmaule.cl', '+56-71-223002', 'Chile', 'Maule', 'Talca', 'Cherry', ARRAY['Blueberry', 'Apple', 'Kiwi'], 620, 7440, ARRAY['GlobalGAP', 'SAG Chile', 'SQF Level 2', 'Fair Trade'], ARRAY['USA', 'Europe', 'China', 'Japan'], 'approved', 0, NOW()),
('Agrícola Santa Rosa', 'Felipe Ignacio Vargas', 'fivargas@santarosa.cl', '+56-2-2345002', 'Chile', 'O''Higgins', 'San Fernando', 'Apple', ARRAY['Pear', 'Cherry', 'Plum'], 480, 7200, ARRAY['GlobalGAP', 'SAG Chile', 'Primus GFS'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Hortifrut Chile', 'María José Contreras', 'mjcontreras@hortifrut.cl', '+56-41-221003', 'Chile', 'Biobío', 'Los Ángeles', 'Blueberry', ARRAY['Raspberry', 'Blackberry', 'Strawberry'], 720, 5400, ARRAY['USDA Organic', 'GlobalGAP', 'SAG Chile', 'BRC Food'], ARRAY['USA', 'Canada', 'Europe', 'China'], 'approved', 0, NOW()),
('Agrícola El Retiro', 'Sebastián Eduardo Lagos', 'selago@elretiro.cl', '+56-71-223003', 'Chile', 'Maule', 'Curicó', 'Cherry', ARRAY['Blueberry', 'Grape'], 380, 4560, ARRAY['GlobalGAP', 'SAG Chile', 'SQF Level 2'], ARRAY['USA', 'Europe', 'China'], 'approved', 1, NOW()),
('Copefrut S.A.', 'Cristóbal Alejandro Reyes', 'careyes@copefrut.cl', '+56-71-223004', 'Chile', 'Maule', 'Curicó', 'Apple', ARRAY['Pear', 'Kiwi', 'Cherry'], 520, 7800, ARRAY['GlobalGAP', 'SAG Chile', 'BRC Food', 'HACCP'], ARRAY['USA', 'Europe', 'Asia', 'Latin America'], 'approved', 0, NOW()),
('Agrícola Garcés', 'Andrea Patricia Morales', 'apmorales@garces.cl', '+56-2-2345003', 'Chile', 'O''Higgins', 'Rengo', 'Grapes Table', ARRAY['Cherry', 'Plum'], 340, 5100, ARRAY['GlobalGAP', 'SAG Chile', 'Primus GFS'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Exportadora Subsole', 'Nicolás Fernando Espinoza', 'nfespinoza@subsole.cl', '+56-2-2345004', 'Chile', 'Metropolitana', 'Buin', 'Cherry', ARRAY['Grape', 'Nectarine', 'Peach'], 290, 3480, ARRAY['GlobalGAP', 'SAG Chile', 'BRC Food'], ARRAY['USA', 'Europe', 'China'], 'approved', 1, NOW()),
('Agrícola Don Luis', 'Luis Alberto Fernández', 'lafernandez@donluis.cl', '+56-75-232005', 'Chile', 'Coquimbo', 'Vicuña', 'Grapes Table', ARRAY['Avocado', 'Citrus Mandarin'], 420, 6300, ARRAY['GlobalGAP', 'SAG Chile', 'Primus GFS'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Frutas del Pacífico', 'Valentina Isabel Cruz', 'vicruz@frutaspacifico.cl', '+56-32-268006', 'Chile', 'Valparaíso', 'Quillota', 'Avocado Hass', ARRAY['Citrus Lemon', 'Walnut'], 380, 5700, ARRAY['GlobalGAP', 'SAG Chile', 'Fair Trade', 'Rainforest Alliance'], ARRAY['USA', 'Europe', 'Chile'], 'approved', 0, NOW()),
('Agrícola Valle Central', 'Matías Andrés Guzmán', 'maguzman@vallecentral.cl', '+56-71-223006', 'Chile', 'Maule', 'Linares', 'Blueberry', ARRAY['Raspberry', 'Cherry'], 250, 1875, ARRAY['USDA Organic', 'GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('Exportadora Río Blanco', 'Francisca Elena Torres', 'fetorres@rioblanco.cl', '+56-63-241007', 'Chile', 'Los Ríos', 'Valdivia', 'Berry Mix', ARRAY['Raspberry', 'Blueberry', 'Cranberry'], 180, 1350, ARRAY['GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Agrícola Los Andes', 'Diego Antonio Herrera', 'daherrera@losandes.cl', '+56-34-427008', 'Chile', 'Valparaíso', 'San Felipe', 'Walnut', ARRAY['Almond', 'Avocado'], 320, 1920, ARRAY['GlobalGAP', 'SAG Chile', 'HACCP'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Fruticola San Clemente', 'Camila Sofía Rojas', 'csrojas@sanclemente.cl', '+56-71-223009', 'Chile', 'Maule', 'San Clemente', 'Cherry', ARRAY['Blueberry', 'Apple'], 290, 3480, ARRAY['GlobalGAP', 'SAG Chile', 'Primus GFS'], ARRAY['USA', 'China', 'Europe'], 'approved', 1, NOW()),
('Agrícola El Huique', 'Alejandro José Pizarro', 'ajpizarro@elhuique.cl', '+56-2-2345005', 'Chile', 'O''Higgins', 'Pichidegua', 'Kiwi', ARRAY['Cherry', 'Apple'], 210, 3150, ARRAY['GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Viña Concha y Toro Fruits', 'Isabella María Undurraga', 'imundurraga@conchaytoro.cl', '+56-2-2345006', 'Chile', 'Maipo', 'Pirque', 'Grapes Wine', ARRAY['Grapes Table'], 450, 2700, ARRAY['GlobalGAP', 'SAG Chile', 'Organic'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Exportadora Aconcagua', 'Tomás Eduardo Larraín', 'telarrain@aconcagua.cl', '+56-34-427009', 'Chile', 'Valparaíso', 'San Esteban', 'Grapes Table', ARRAY['Cherry', 'Avocado'], 380, 5700, ARRAY['GlobalGAP', 'SAG Chile', 'BRC Food'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Agrícola La Campana', 'Antonia Paz Valdés', 'apvaldes@lacampana.cl', '+56-32-268010', 'Chile', 'Valparaíso', 'Hijuelas', 'Avocado Hass', ARRAY['Citrus', 'Walnut'], 260, 3900, ARRAY['GlobalGAP', 'SAG Chile', 'Rainforest Alliance'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Frutas Premium Chile', 'Benjamín Ignacio Castro', 'bicastro@frutaspremium.cl', '+56-71-223010', 'Chile', 'Maule', 'Molina', 'Cherry', ARRAY['Blueberry'], 195, 2340, ARRAY['GlobalGAP', 'SAG Chile', 'Fair Trade'], ARRAY['USA', 'China', 'Europe'], 'approved', 1, NOW()),
('Agrícola Sur Andino', 'Josefina Elena Bravo', 'jebravo@surandino.cl', '+56-45-221011', 'Chile', 'Araucanía', 'Temuco', 'Apple', ARRAY['Pear', 'Berry'], 175, 2625, ARRAY['GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Latin America'], 'approved', 2, NOW()),
('Exportadora BioBío', 'Gonzalo Martín Sepúlveda', 'gmsepulveda@expbiobio.cl', '+56-41-221012', 'Chile', 'Biobío', 'Chillán', 'Blueberry', ARRAY['Raspberry', 'Cherry'], 220, 1650, ARRAY['USDA Organic', 'GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('Agrícola Malleco', 'Sofía Catalina Muñoz', 'scmunoz@malleco.cl', '+56-45-221013', 'Chile', 'Araucanía', 'Angol', 'Apple', ARRAY['Pear', 'Hazelnut'], 165, 2475, ARRAY['GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Cerezas Premium Chile', 'Martín Alejandro Vidal', 'mavidal@cerezaspremium.cl', '+56-71-223011', 'Chile', 'Maule', 'Romeral', 'Cherry', ARRAY['Grape'], 310, 3720, ARRAY['GlobalGAP', 'SAG Chile', 'BRC Food', 'SQF Level 2'], ARRAY['USA', 'China', 'Europe', 'Japan'], 'approved', 0, NOW()),
('Agrícola Colchagua', 'Florencia Isabel Lagos', 'filago@colchagua.cl', '+56-72-271014', 'Chile', 'O''Higgins', 'Santa Cruz', 'Grapes Wine', ARRAY['Olive', 'Cherry'], 280, 1680, ARRAY['GlobalGAP', 'SAG Chile', 'Organic'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Sur Fruits Export', 'Vicente Eduardo Riquelme', 'veriquelme@surfruits.cl', '+56-63-241015', 'Chile', 'Los Ríos', 'La Unión', 'Berry Mix', ARRAY['Blueberry', 'Raspberry', 'Cranberry'], 145, 1090, ARRAY['GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Europe'], 'approved', 2, NOW());

-- =====================================================
-- GUATEMALA (15 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES
('Agroexportadora Unex', 'Carlos Roberto Mendez', 'crmendez@unex.gt', '+502-2334-1001', 'Guatemala', 'Guatemala', 'Guatemala City', 'Sugar Cane', ARRAY['Banana', 'Coffee'], 1200, 36000, ARRAY['GlobalGAP', 'MAGA Guatemala', 'BRC Food', 'Bonsucro'], ARRAY['USA', 'Europe'], 'approved', 0, NOW()),
('Del Monte Guatemala', 'María Elena Castañeda', 'mecastaneda@delmonte.gt', '+502-7832-2001', 'Guatemala', 'Escuintla', 'Escuintla', 'Banana', ARRAY['Pineapple', 'Melon'], 850, 34000, ARRAY['GlobalGAP', 'MAGA Guatemala', 'Rainforest Alliance', 'Fair Trade'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 0, NOW()),
('Agrícola Popoyán', 'Fernando Daniel López', 'fdlopez@popoyan.gt', '+502-7832-2002', 'Guatemala', 'Escuintla', 'Santa Lucía', 'Banana', ARRAY['Plantain'], 480, 19200, ARRAY['GlobalGAP', 'MAGA Guatemala', 'Primus GFS'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Exportadora de Café de Altura', 'Ana Sofía Barrios', 'asbarrios@cafealtura.gt', '+502-7761-3001', 'Guatemala', 'Huehuetenango', 'Huehuetenango', 'Coffee Arabica', ARRAY['Coffee Specialty'], 320, 960, ARRAY['USDA Organic', 'Fair Trade', 'Rainforest Alliance', 'UTZ Certified'], ARRAY['USA', 'Europe', 'Japan'], 'approved', 0, NOW()),
('Cooperativa Agrícola Anacafé', 'Roberto Miguel Hernández', 'rmhernandez@anacafe.gt', '+502-7761-3002', 'Guatemala', 'Antigua', 'Antigua Guatemala', 'Coffee Arabica', ARRAY['Coffee Washed'], 280, 840, ARRAY['USDA Organic', 'Fair Trade', 'MAGA Guatemala'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Hortalizas de Exportación', 'Patricia Elena Torres', 'petorres@hortexp.gt', '+502-7762-4001', 'Guatemala', 'Chimaltenango', 'Chimaltenango', 'Snow Pea', ARRAY['Sugar Snap Pea', 'French Bean'], 210, 3150, ARRAY['GlobalGAP', 'MAGA Guatemala', 'Primus GFS'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Vegetales Maya Export', 'Carlos Eduardo Juárez', 'cejuarez@vegmaya.gt', '+502-7762-4002', 'Guatemala', 'Sacatepéquez', 'Sumpango', 'Broccoli', ARRAY['Cauliflower', 'Brussels Sprouts'], 180, 5400, ARRAY['GlobalGAP', 'MAGA Guatemala'], ARRAY['USA', 'Canada'], 'approved', 2, NOW()),
('Melones Guatemala S.A.', 'Laura Patricia Morales', 'lpmorales@melones.gt', '+502-7934-5001', 'Guatemala', 'Zacapa', 'Zacapa', 'Melon Cantaloupe', ARRAY['Melon Honeydew', 'Watermelon'], 350, 7000, ARRAY['GlobalGAP', 'MAGA Guatemala', 'Primus GFS', 'SQF Level 2'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),
('Frutas del Atlántico', 'Miguel Ángel Contreras', 'macontreras@frutasatlantico.gt', '+502-7948-6001', 'Guatemala', 'Izabal', 'Puerto Barrios', 'Banana', ARRAY['Pineapple', 'Papaya'], 420, 16800, ARRAY['GlobalGAP', 'MAGA Guatemala', 'Rainforest Alliance'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Cardamomo Export S.A.', 'Guadalupe Fernanda García', 'gfgarcia@cardamomo.gt', '+502-7952-7001', 'Guatemala', 'Alta Verapaz', 'Cobán', 'Cardamom', ARRAY['Black Pepper', 'Allspice'], 290, 870, ARRAY['USDA Organic', 'Fair Trade', 'MAGA Guatemala'], ARRAY['USA', 'Middle East', 'India'], 'approved', 1, NOW()),
('Agrícola San José', 'Oscar Alejandro Velásquez', 'oavelasquez@agrisanjose.gt', '+502-7762-4003', 'Guatemala', 'Chimaltenango', 'San Martín', 'French Bean', ARRAY['Snow Pea', 'Mini Vegetable'], 165, 2475, ARRAY['GlobalGAP', 'MAGA Guatemala'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Café Antigua Premium', 'Diana Carolina Álvarez', 'dcalvarez@cafeantigua.gt', '+502-7832-3001', 'Guatemala', 'Sacatepéquez', 'Antigua Guatemala', 'Coffee Specialty', ARRAY['Coffee Single Origin'], 145, 435, ARRAY['USDA Organic', 'Fair Trade', 'Rainforest Alliance', 'UTZ'], ARRAY['USA', 'Europe', 'Japan', 'Korea'], 'approved', 0, NOW()),
('Piñas de Guatemala', 'Fernando Javier Ramos', 'fjramos@pinasgt.gt', '+502-7934-5002', 'Guatemala', 'Petén', 'San Benito', 'Pineapple', ARRAY['Papaya', 'Mango'], 280, 5600, ARRAY['GlobalGAP', 'MAGA Guatemala'], ARRAY['USA', 'Canada'], 'approved', 2, NOW()),
('Cooperativa Agrícola Maya', 'María Isabel Cuxil', 'micuxil@coopmaya.gt', '+502-7951-8001', 'Guatemala', 'Sololá', 'Panajachel', 'Vegetable Organic', ARRAY['Tomato', 'Pepper', 'Herbs'], 95, 1425, ARRAY['USDA Organic', 'Fair Trade', 'MAGA Guatemala'], ARRAY['USA', 'Local'], 'approved', 1, NOW()),
('Exportadora Centra', 'Roberto Carlos Ortiz', 'rcortiz@expcentra.gt', '+502-7832-2003', 'Guatemala', 'Escuintla', 'Escuintla', 'Banana Organic', ARRAY['Plantain'], 320, 12800, ARRAY['USDA Organic', 'GlobalGAP', 'MAGA Guatemala', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW());

-- =====================================================
-- COLOMBIA (15 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES
('Federación Nacional de Cafeteros', 'Andrés Felipe Rodríguez', 'afrodriguez@federacioncafe.co', '+57-1-313-1001', 'Colombia', 'Cundinamarca', 'Bogotá', 'Coffee Arabica', ARRAY['Coffee Specialty', 'Coffee Washed'], 15000, 45000, ARRAY['USDA Organic', 'Fair Trade', 'Rainforest Alliance', 'UTZ', '4C Certified'], ARRAY['USA', 'Europe', 'Japan', 'Asia'], 'approved', 0, NOW()),
('Banacol S.A.', 'María Alejandra Vélez', 'mavelez@banacol.co', '+57-4-444-2001', 'Colombia', 'Antioquia', 'Apartadó', 'Banana', ARRAY['Plantain', 'Banana Organic'], 1200, 48000, ARRAY['GlobalGAP', 'ICA Colombia', 'Rainforest Alliance', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 0, NOW()),
('Uniban S.A.', 'Carlos Eduardo Jaramillo', 'cejaramillo@uniban.co', '+57-4-444-2002', 'Colombia', 'Urabá', 'Turbo', 'Banana', ARRAY['Banana Organic'], 950, 38000, ARRAY['GlobalGAP', 'ICA Colombia', 'Rainforest Alliance'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 0, NOW()),
('Flores El Rosal', 'Laura Cristina Gómez', 'lcgomez@elrosal.co', '+57-1-863-3001', 'Colombia', 'Cundinamarca', 'Madrid', 'Flowers Rose', ARRAY['Flowers Carnation', 'Flowers Chrysanthemum'], 180, 5400, ARRAY['GlobalGAP', 'Florverde', 'Rainforest Alliance'], ARRAY['USA', 'Europe', 'Russia'], 'approved', 0, NOW()),
('Asocolflores Members', 'Patricia Elena Restrepo', 'perestrepo@asocolflores.co', '+57-1-257-4001', 'Colombia', 'Cundinamarca', 'Bogotá', 'Flowers Mixed', ARRAY['Flowers Tropical', 'Foliage'], 350, 10500, ARRAY['GlobalGAP', 'Florverde', 'BASC', 'Rainforest Alliance'], ARRAY['USA', 'Europe', 'Japan'], 'approved', 0, NOW()),
('Café de Colombia Premium', 'Sebastián Andrés Ospina', 'saospina@cafecolombia.co', '+57-6-321-5001', 'Colombia', 'Caldas', 'Manizales', 'Coffee Specialty', ARRAY['Coffee Single Origin'], 280, 840, ARRAY['USDA Organic', 'Fair Trade', 'Rainforest Alliance', 'UTZ'], ARRAY['USA', 'Europe', 'Japan', 'Korea'], 'approved', 0, NOW()),
('Agrícola Palmera del Llano', 'Roberto Miguel Pardo', 'rmpardo@palmera.co', '+57-8-635-6001', 'Colombia', 'Meta', 'Villavicencio', 'Palm Oil', ARRAY['Palm Kernel'], 850, 12750, ARRAY['RSPO Certified', 'ICA Colombia'], ARRAY['Europe', 'Asia'], 'approved', 1, NOW()),
('Frutas Tropicales de Colombia', 'Ana María Salazar', 'amsalazar@frutastropical.co', '+57-2-680-7001', 'Colombia', 'Valle del Cauca', 'Cali', 'Passion Fruit', ARRAY['Mango', 'Lulo', 'Gulupa'], 210, 2520, ARRAY['GlobalGAP', 'ICA Colombia', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Aguacates Hass Colombia', 'Fernando Daniel Mejía', 'fdmejia@aguacatescol.co', '+57-4-268-8001', 'Colombia', 'Antioquia', 'Medellín', 'Avocado Hass', ARRAY['Avocado Varieties'], 380, 5700, ARRAY['GlobalGAP', 'ICA Colombia', 'Primus GFS'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Exotic Fruits Export', 'Claudia Patricia Herrera', 'cpherrera@exoticfruits.co', '+57-2-680-7002', 'Colombia', 'Valle del Cauca', 'Palmira', 'Gulupa', ARRAY['Granadilla', 'Pitahaya', 'Uchuva'], 145, 1450, ARRAY['GlobalGAP', 'ICA Colombia', 'Fair Trade'], ARRAY['USA', 'Europe', 'Canada'], 'approved', 1, NOW()),
('Café Huila Premium', 'Oscar Alejandro Trujillo', 'oatrujillo@cafehuila.co', '+57-8-871-9001', 'Colombia', 'Huila', 'Neiva', 'Coffee Arabica', ARRAY['Coffee Specialty'], 195, 585, ARRAY['USDA Organic', 'Fair Trade', 'UTZ'], ARRAY['USA', 'Europe', 'Japan'], 'approved', 1, NOW()),
('Platanera del Quindío', 'María Fernanda Londoño', 'mflondono@platanera.co', '+57-6-742-1001', 'Colombia', 'Quindío', 'Armenia', 'Plantain', ARRAY['Banana', 'Plantain Green'], 240, 7200, ARRAY['GlobalGAP', 'ICA Colombia'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Cítricos del Tolima', 'Diego Alejandro Vargas', 'davargas@citricostolima.co', '+57-8-263-1002', 'Colombia', 'Tolima', 'Ibagué', 'Orange Valencia', ARRAY['Mandarin', 'Lime Tahiti'], 175, 2625, ARRAY['GlobalGAP', 'ICA Colombia'], ARRAY['USA', 'Local'], 'approved', 2, NOW()),
('Piñas Export Colombia', 'Valentina Isabel Moreno', 'vimoreno@pinasexport.co', '+57-4-826-1003', 'Colombia', 'Santander', 'Lebrija', 'Pineapple Gold', ARRAY['Pineapple MD2'], 220, 4400, ARRAY['GlobalGAP', 'ICA Colombia', 'Primus GFS'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Uchuvas Premium', 'Jorge Luis Bermúdez', 'jlbermudez@uchuvas.co', '+57-1-863-3002', 'Colombia', 'Boyacá', 'Tunja', 'Uchuva', ARRAY['Physalis'], 95, 950, ARRAY['GlobalGAP', 'ICA Colombia', 'Fair Trade'], ARRAY['USA', 'Europe', 'Canada'], 'approved', 1, NOW());

-- =====================================================
-- ECUADOR (10 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES
('Exportadora Noboa', 'Francisco Eduardo Noboa', 'fenoboa@noboa.ec', '+593-4-228-1001', 'Ecuador', 'Guayas', 'Guayaquil', 'Banana', ARRAY['Banana Organic', 'Plantain'], 2500, 100000, ARRAY['GlobalGAP', 'Agrocalidad', 'Rainforest Alliance', 'Fair Trade'], ARRAY['USA', 'Europe', 'Russia', 'Asia'], 'approved', 0, NOW()),
('Reybanpac S.A.', 'María Elena Córdova', 'mecordova@reybanpac.ec', '+593-4-228-1002', 'Ecuador', 'Los Ríos', 'Babahoyo', 'Banana', ARRAY['Banana Cavendish'], 1800, 72000, ARRAY['GlobalGAP', 'Agrocalidad', 'Rainforest Alliance', 'BASC'], ARRAY['USA', 'Europe', 'Middle East'], 'approved', 0, NOW()),
('Dole Ecuador', 'Carlos Roberto Andrade', 'crandrade@dole.ec', '+593-4-228-1003', 'Ecuador', 'El Oro', 'Machala', 'Banana', ARRAY['Pineapple'], 1200, 48000, ARRAY['GlobalGAP', 'Agrocalidad', 'Rainforest Alliance', 'Fair Trade', 'HACCP'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 0, NOW()),
('Agrícola Prieto S.A.', 'Patricia Fernanda López', 'pflopez@agricolaprieto.ec', '+593-2-246-2001', 'Ecuador', 'Pichincha', 'Quito', 'Flowers Rose', ARRAY['Flowers Gypsophila', 'Flowers Mixed'], 280, 8400, ARRAY['GlobalGAP', 'Agrocalidad', 'FlorEcuador', 'Rainforest Alliance'], ARRAY['USA', 'Europe', 'Russia'], 'approved', 0, NOW()),
('Cacao Premium Ecuador', 'Fernando Daniel Salazar', 'fdsalazar@cacaopremium.ec', '+593-4-228-1004', 'Ecuador', 'Guayas', 'Guayaquil', 'Cacao Fine', ARRAY['Cacao Nacional', 'Cacao Arriba'], 420, 1260, ARRAY['USDA Organic', 'Fair Trade', 'Rainforest Alliance', 'UTZ'], ARRAY['USA', 'Europe', 'Switzerland'], 'approved', 0, NOW()),
('Camarón del Pacífico', 'Ana Cristina Vélez', 'acvelez@camaronpacifico.ec', '+593-4-228-1005', 'Ecuador', 'El Oro', 'Santa Rosa', 'Shrimp', ARRAY['Shrimp White', 'Shrimp Vannamei'], 650, 9750, ARRAY['BAP Certified', 'ASC', 'Agrocalidad', 'HACCP'], ARRAY['USA', 'Europe', 'Asia', 'China'], 'approved', 0, NOW()),
('Mango Ecuador Export', 'Roberto Miguel Herrera', 'rmherrera@mangoecuador.ec', '+593-4-228-1006', 'Ecuador', 'Guayas', 'Guayaquil', 'Mango Tommy', ARRAY['Mango Kent', 'Mango Haden'], 310, 3720, ARRAY['GlobalGAP', 'Agrocalidad', 'Primus GFS'], ARRAY['USA', 'Europe', 'Canada'], 'approved', 1, NOW()),
('Piñas Tropicales S.A.', 'Laura Patricia Morales', 'lpmorales@pinastropical.ec', '+593-4-228-1007', 'Ecuador', 'Los Ríos', 'Quevedo', 'Pineapple MD2', ARRAY['Pineapple Gold'], 280, 5600, ARRAY['GlobalGAP', 'Agrocalidad', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Brócoli Andino', 'Oscar Alejandro Torres', 'oatorres@brocoliandino.ec', '+593-2-246-2002', 'Ecuador', 'Cotopaxi', 'Latacunga', 'Broccoli', ARRAY['Cauliflower', 'Romanesco'], 195, 5850, ARRAY['GlobalGAP', 'Agrocalidad', 'Primus GFS'], ARRAY['USA', 'Europe', 'Japan'], 'approved', 1, NOW()),
('Palmito del Oriente', 'Claudia Fernanda García', 'cfgarcia@palmito.ec', '+593-6-288-3001', 'Ecuador', 'Pichincha', 'Santo Domingo', 'Hearts of Palm', ARRAY['Palmito'], 240, 2400, ARRAY['GlobalGAP', 'Agrocalidad', 'Fair Trade'], ARRAY['USA', 'Europe', 'France'], 'approved', 1, NOW());

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count by country
-- SELECT country, COUNT(*) as grower_count FROM growers WHERE country IN ('Peru', 'Chile', 'Guatemala', 'Colombia', 'Ecuador') GROUP BY country ORDER BY grower_count DESC;

-- Count by risk tier
-- SELECT country, risk_tier, COUNT(*) as count FROM growers WHERE country IN ('Peru', 'Chile', 'Guatemala', 'Colombia', 'Ecuador') GROUP BY country, risk_tier ORDER BY country, risk_tier;

-- Total: 100 South/Central America Growers
-- Peru: 35, Chile: 25, Guatemala: 15, Colombia: 15, Ecuador: 10