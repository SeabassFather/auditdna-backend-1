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
('AgrÃ­cola Chapi S.A.', 'Carlos Alberto FernÃ¡ndez', 'cafernandez@agricolachapi.pe', '+51-56-232001', 'Peru', 'Ica', 'Ica', 'Asparagus', ARRAY['Asparagus White', 'Grapes Table'], 680, 10200, ARRAY['GlobalGAP', 'HACCP', 'SENASA Peru', 'BRC Food'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 0, NOW()),
('Sociedad AgrÃ­cola Drokasa', 'MarÃ­a Elena Castillo', 'mecastillo@drokasa.pe', '+51-56-232002', 'Peru', 'Ica', 'Ica', 'Asparagus', ARRAY['Avocado Hass', 'Grapes Red Globe'], 520, 7800, ARRAY['GlobalGAP', 'SENASA Peru', 'Primus GFS', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Complejo Agroindustrial Beta', 'Roberto Miguel Ramos', 'rmramos@cabeta.pe', '+51-56-232003', 'Peru', 'Ica', 'Chincha', 'Asparagus', ARRAY['Asparagus Green', 'Citrus Mandarin'], 450, 6750, ARRAY['GlobalGAP', 'HACCP', 'SENASA Peru', 'SQF Level 2'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('Agroindustrias AIB S.A.', 'Ana SofÃ­a Mendoza', 'asmendoza@aib.pe', '+51-56-232004', 'Peru', 'Ica', 'Ica', 'Grapes Table', ARRAY['Grapes Red Seedless', 'Grapes Green'], 380, 5700, ARRAY['GlobalGAP', 'SENASA Peru', 'BRC Food'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Exportadora El Pedregal S.A.', 'Fernando Daniel Torres', 'fdtorres@elpedregal.pe', '+51-56-232005', 'Peru', 'Ica', 'VillacurÃ­', 'Asparagus Green', ARRAY['Avocado Hass', 'Blueberry'], 620, 9300, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru', 'Rainforest Alliance'], ARRAY['USA', 'Canada', 'Europe', 'Japan'], 'approved', 0, NOW()),
('AgrÃ­cola Pampa Baja', 'Claudia Patricia DÃ­az', 'cpdiaz@pampabaja.pe', '+51-56-232006', 'Peru', 'Ica', 'Ocucaje', 'Grapes Table', ARRAY['Grapes Crimson', 'Citrus'], 290, 4350, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Camposol S.A.', 'JosÃ© Luis GutiÃ©rrez', 'jlgutierrez@camposol.pe', '+51-44-485001', 'Peru', 'La Libertad', 'Trujillo', 'Avocado Hass', ARRAY['Blueberry', 'Asparagus', 'Mango'], 2200, 44000, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru', 'Fair Trade', 'Rainforest Alliance', 'BRC Food'], ARRAY['USA', 'Canada', 'Europe', 'Asia', 'China'], 'approved', 0, NOW()),
('Danper Trujillo S.A.C.', 'MarÃ­a Fernanda LÃ³pez', 'mflopez@danper.pe', '+51-44-485002', 'Peru', 'La Libertad', 'Trujillo', 'Asparagus', ARRAY['Asparagus Green', 'Avocado', 'Artichoke'], 850, 12750, ARRAY['GlobalGAP', 'HACCP', 'SENASA Peru', 'SQF Level 3', 'SMETA'], ARRAY['USA', 'Europe', 'Japan'], 'approved', 0, NOW()),
('Sociedad AgrÃ­cola VirÃº', 'Carlos Eduardo Navarro', 'cenavarro@saviru.pe', '+51-44-485003', 'Peru', 'La Libertad', 'VirÃº', 'Asparagus', ARRAY['Pepper Bell', 'Artichoke'], 580, 8700, ARRAY['GlobalGAP', 'SENASA Peru', 'Primus GFS', 'BRC Food'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Tal S.A.', 'Patricia Elena Rojas', 'perojas@talsa.pe', '+51-44-485004', 'Peru', 'La Libertad', 'Trujillo', 'Asparagus Green', ARRAY['Avocado Hass', 'Blueberry'], 420, 6300, ARRAY['GlobalGAP', 'SENASA Peru', 'HACCP'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('AgrÃ­cola Cerro Prieto', 'Miguel Ãngel Soto', 'masoto@cerroprieto.pe', '+51-44-485005', 'Peru', 'La Libertad', 'Chao', 'Blueberry', ARRAY['Avocado Hass', 'Asparagus'], 480, 3600, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru', 'Fair Trade'], ARRAY['USA', 'Canada', 'Europe', 'China'], 'approved', 0, NOW()),
('Hortifrut Peru', 'Ana Cristina Mendez', 'acmendez@hortifrut.pe', '+51-44-485006', 'Peru', 'La Libertad', 'Trujillo', 'Blueberry', ARRAY['Raspberry', 'Blackberry'], 350, 2625, ARRAY['GlobalGAP', 'SENASA Peru', 'Primus GFS'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('AgrÃ­cola Cerro Colorado', 'Roberto Carlos Luna', 'rcluna@cerrocolorado.pe', '+51-74-282001', 'Peru', 'Lambayeque', 'Motupe', 'Mango', ARRAY['Mango Kent', 'Lime', 'Avocado'], 380, 4560, ARRAY['GlobalGAP', 'SENASA Peru', 'Primus GFS', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Sunshine Export S.A.C.', 'Diana Laura Herrera', 'dlherrera@sunshineexport.pe', '+51-74-282002', 'Peru', 'Lambayeque', 'Olmos', 'Mango Kent', ARRAY['Mango Tommy', 'Lime Persian'], 290, 3480, ARRAY['GlobalGAP', 'SENASA Peru', 'BRC Food'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('Frutos Tropicales del Norte', 'Fernando Javier Castro', 'fjcastro@frutostrop.pe', '+51-74-282003', 'Peru', 'Lambayeque', 'Motupe', 'Lime Persian', ARRAY['Mango', 'Papaya'], 210, 3150, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('AgrÃ­cola Andrea S.A.C.', 'Guadalupe Fernanda RÃ­os', 'gfrios@agricolaandrea.pe', '+51-73-345001', 'Peru', 'Piura', 'Sullana', 'Mango', ARRAY['Mango Kent', 'Mango Haden', 'Banana Organic'], 420, 5040, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru', 'Fair Trade'], ARRAY['USA', 'Europe', 'Japan'], 'approved', 1, NOW()),
('Biofruit S.A.', 'Carlos Antonio Mendoza', 'camendoza@biofruit.pe', '+51-73-345002', 'Peru', 'Piura', 'Tambogrande', 'Banana Organic', ARRAY['Mango', 'Lime'], 350, 7000, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru', 'Fair Trade', 'Rainforest Alliance'], ARRAY['USA', 'Europe'], 'approved', 0, NOW()),
('AgrÃ­cola del Chira', 'MarÃ­a Teresa Valdez', 'mtvaldez@agricolachira.pe', '+51-73-345003', 'Peru', 'Piura', 'Sullana', 'Mango Kent', ARRAY['Lime', 'Avocado Hass'], 280, 3360, ARRAY['GlobalGAP', 'SENASA Peru', 'Primus GFS'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('AgrÃ­cola Pampa Verde', 'JosÃ© Eduardo Torres', 'jetorres@pampaverde.pe', '+51-54-428001', 'Peru', 'Arequipa', 'La Joya', 'Onion Red', ARRAY['Onion Yellow', 'Garlic'], 310, 9300, ARRAY['GlobalGAP', 'SENASA Peru', 'Primus GFS'], ARRAY['USA', 'Colombia', 'Chile'], 'approved', 1, NOW()),
('Productores de Arequipa Unidos', 'Laura Patricia Flores', 'lpflores@prodarequipa.pe', '+51-54-428002', 'Peru', 'Arequipa', 'CamanÃ¡', 'Garlic', ARRAY['Onion', 'Pepper Rocoto'], 220, 3300, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Mexico', 'Brazil'], 'approved', 2, NOW()),
('AgrÃ­cola La Venta', 'Ricardo Alberto Soto', 'rasoto@laventa.pe', '+51-1-717001', 'Peru', 'Lima', 'CaÃ±ete', 'Avocado Hass', ARRAY['Citrus Mandarin', 'Blueberry'], 340, 5100, ARRAY['GlobalGAP', 'SENASA Peru', 'BRC Food'], ARRAY['USA', 'Europe', 'Chile'], 'approved', 1, NOW()),
('Fundo Santa Patricia', 'Elena MarÃ­a GutiÃ©rrez', 'emgutierrez@santapatricia.pe', '+51-1-717002', 'Peru', 'Lima', 'Huaral', 'Citrus Mandarin', ARRAY['Orange Valencia', 'Avocado'], 260, 3900, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Canada'], 'approved', 2, NOW()),
('AgrÃ­cola San JosÃ©', 'Arturo RenÃ© Castillo', 'arcastillo@agrisanjose.pe', '+51-56-232008', 'Peru', 'Ica', 'Nazca', 'Grapes Table', ARRAY['Asparagus', 'Citrus'], 240, 3600, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Inca Farms S.A.C.', 'Silvia Marcela Ochoa', 'smochoa@incafarms.pe', '+51-44-485007', 'Peru', 'La Libertad', 'Pacasmayo', 'Blueberry', ARRAY['Raspberry'], 180, 1350, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),
('Agroindustrial Laredo', 'VÃ­ctor Hugo Ramos', 'vhramos@laredo.pe', '+51-44-485008', 'Peru', 'La Libertad', 'Laredo', 'Asparagus', ARRAY['Avocado'], 420, 6300, ARRAY['GlobalGAP', 'SENASA Peru', 'HACCP'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Fundo Choloque', 'Carmen LucÃ­a Moreno', 'clmoreno@choloque.pe', '+51-74-282004', 'Peru', 'Lambayeque', 'Jayanca', 'Mango', ARRAY['Lime', 'Papaya'], 195, 2340, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('AgrÃ­cola BGS', 'Jorge Luis Espinoza', 'jlespinoza@agricolabgs.pe', '+51-73-345004', 'Peru', 'Piura', 'Chulucanas', 'Mango Kent', ARRAY['Lime Persian'], 230, 2760, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Pacific Fruits Peru', 'Andrea SofÃ­a Vega', 'asvega@pacificfruits.pe', '+51-56-232009', 'Peru', 'Ica', 'Pisco', 'Grapes Table', ARRAY['Asparagus', 'Avocado'], 320, 4800, ARRAY['GlobalGAP', 'SENASA Peru', 'BRC Food'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('AgrÃ­cola Valle Grande', 'Roberto Javier Campos', 'rjcampos@vallegrande.pe', '+51-44-485009', 'Peru', 'La Libertad', 'ChepÃ©n', 'Asparagus', ARRAY['Avocado Hass'], 280, 4200, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Exportadora Frutas del Sol', 'MarÃ­a Isabel Torres', 'mitorres@frutassol.pe', '+51-73-345005', 'Peru', 'Piura', 'Piura', 'Mango', ARRAY['Banana', 'Lime'], 250, 3000, ARRAY['GlobalGAP', 'SENASA Peru', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('AgrÃ­cola Don Ricardo', 'Fernando AndrÃ©s Luna', 'faluna@donricardo.pe', '+51-56-232010', 'Peru', 'Ica', 'Ica', 'Asparagus Green', ARRAY['Grapes Table'], 350, 5250, ARRAY['GlobalGAP', 'SENASA Peru', 'HACCP'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Frutas Premium PerÃº', 'Claudia Fernanda Reyes', 'cfreyes@frutaspremium.pe', '+51-44-485010', 'Peru', 'La Libertad', 'Trujillo', 'Blueberry', ARRAY['Avocado Hass'], 210, 1575, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('AgrÃ­cola Santa Elena', 'Oscar Miguel Delgado', 'omdelgado@santaelena.pe', '+51-74-282005', 'Peru', 'Lambayeque', 'Motupe', 'Mango Kent', ARRAY['Lime'], 175, 2100, ARRAY['GlobalGAP', 'SENASA Peru'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Cooperativa Agraria Piura', 'Patricia Elena Mendoza', 'pemendoza@cooppiura.pe', '+51-73-345006', 'Peru', 'Piura', 'MorropÃ³n', 'Banana Organic', ARRAY['Mango', 'Cacao'], 290, 5800, ARRAY['USDA Organic', 'GlobalGAP', 'SENASA Peru', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW());

-- =====================================================
-- CHILE (25 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES
('Frutas de Chile S.A.', 'Rodrigo AndrÃ©s MuÃ±oz', 'ramunoz@frutaschile.cl', '+56-2-2345001', 'Chile', 'O''Higgins', 'Rancagua', 'Grapes Table', ARRAY['Cherry', 'Blueberry', 'Apple'], 850, 12750, ARRAY['GlobalGAP', 'SAG Chile', 'BRC Food', 'Rainforest Alliance'], ARRAY['USA', 'Europe', 'Asia', 'China'], 'approved', 0, NOW()),
('Exportadora del Maule', 'Carolina Andrea Soto', 'casoto@expmaule.cl', '+56-71-223002', 'Chile', 'Maule', 'Talca', 'Cherry', ARRAY['Blueberry', 'Apple', 'Kiwi'], 620, 7440, ARRAY['GlobalGAP', 'SAG Chile', 'SQF Level 2', 'Fair Trade'], ARRAY['USA', 'Europe', 'China', 'Japan'], 'approved', 0, NOW()),
('AgrÃ­cola Santa Rosa', 'Felipe Ignacio Vargas', 'fivargas@santarosa.cl', '+56-2-2345002', 'Chile', 'O''Higgins', 'San Fernando', 'Apple', ARRAY['Pear', 'Cherry', 'Plum'], 480, 7200, ARRAY['GlobalGAP', 'SAG Chile', 'Primus GFS'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Hortifrut Chile', 'MarÃ­a JosÃ© Contreras', 'mjcontreras@hortifrut.cl', '+56-41-221003', 'Chile', 'BiobÃ­o', 'Los Ãngeles', 'Blueberry', ARRAY['Raspberry', 'Blackberry', 'Strawberry'], 720, 5400, ARRAY['USDA Organic', 'GlobalGAP', 'SAG Chile', 'BRC Food'], ARRAY['USA', 'Canada', 'Europe', 'China'], 'approved', 0, NOW()),
('AgrÃ­cola El Retiro', 'SebastiÃ¡n Eduardo Lagos', 'selago@elretiro.cl', '+56-71-223003', 'Chile', 'Maule', 'CuricÃ³', 'Cherry', ARRAY['Blueberry', 'Grape'], 380, 4560, ARRAY['GlobalGAP', 'SAG Chile', 'SQF Level 2'], ARRAY['USA', 'Europe', 'China'], 'approved', 1, NOW()),
('Copefrut S.A.', 'CristÃ³bal Alejandro Reyes', 'careyes@copefrut.cl', '+56-71-223004', 'Chile', 'Maule', 'CuricÃ³', 'Apple', ARRAY['Pear', 'Kiwi', 'Cherry'], 520, 7800, ARRAY['GlobalGAP', 'SAG Chile', 'BRC Food', 'HACCP'], ARRAY['USA', 'Europe', 'Asia', 'Latin America'], 'approved', 0, NOW()),
('AgrÃ­cola GarcÃ©s', 'Andrea Patricia Morales', 'apmorales@garces.cl', '+56-2-2345003', 'Chile', 'O''Higgins', 'Rengo', 'Grapes Table', ARRAY['Cherry', 'Plum'], 340, 5100, ARRAY['GlobalGAP', 'SAG Chile', 'Primus GFS'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Exportadora Subsole', 'NicolÃ¡s Fernando Espinoza', 'nfespinoza@subsole.cl', '+56-2-2345004', 'Chile', 'Metropolitana', 'Buin', 'Cherry', ARRAY['Grape', 'Nectarine', 'Peach'], 290, 3480, ARRAY['GlobalGAP', 'SAG Chile', 'BRC Food'], ARRAY['USA', 'Europe', 'China'], 'approved', 1, NOW()),
('AgrÃ­cola Don Luis', 'Luis Alberto FernÃ¡ndez', 'lafernandez@donluis.cl', '+56-75-232005', 'Chile', 'Coquimbo', 'VicuÃ±a', 'Grapes Table', ARRAY['Avocado', 'Citrus Mandarin'], 420, 6300, ARRAY['GlobalGAP', 'SAG Chile', 'Primus GFS'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Frutas del PacÃ­fico', 'Valentina Isabel Cruz', 'vicruz@frutaspacifico.cl', '+56-32-268006', 'Chile', 'ValparaÃ­so', 'Quillota', 'Avocado Hass', ARRAY['Citrus Lemon', 'Walnut'], 380, 5700, ARRAY['GlobalGAP', 'SAG Chile', 'Fair Trade', 'Rainforest Alliance'], ARRAY['USA', 'Europe', 'Chile'], 'approved', 0, NOW()),
('AgrÃ­cola Valle Central', 'MatÃ­as AndrÃ©s GuzmÃ¡n', 'maguzman@vallecentral.cl', '+56-71-223006', 'Chile', 'Maule', 'Linares', 'Blueberry', ARRAY['Raspberry', 'Cherry'], 250, 1875, ARRAY['USDA Organic', 'GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('Exportadora RÃ­o Blanco', 'Francisca Elena Torres', 'fetorres@rioblanco.cl', '+56-63-241007', 'Chile', 'Los RÃ­os', 'Valdivia', 'Berry Mix', ARRAY['Raspberry', 'Blueberry', 'Cranberry'], 180, 1350, ARRAY['GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('AgrÃ­cola Los Andes', 'Diego Antonio Herrera', 'daherrera@losandes.cl', '+56-34-427008', 'Chile', 'ValparaÃ­so', 'San Felipe', 'Walnut', ARRAY['Almond', 'Avocado'], 320, 1920, ARRAY['GlobalGAP', 'SAG Chile', 'HACCP'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Fruticola San Clemente', 'Camila SofÃ­a Rojas', 'csrojas@sanclemente.cl', '+56-71-223009', 'Chile', 'Maule', 'San Clemente', 'Cherry', ARRAY['Blueberry', 'Apple'], 290, 3480, ARRAY['GlobalGAP', 'SAG Chile', 'Primus GFS'], ARRAY['USA', 'China', 'Europe'], 'approved', 1, NOW()),
('AgrÃ­cola El Huique', 'Alejandro JosÃ© Pizarro', 'ajpizarro@elhuique.cl', '+56-2-2345005', 'Chile', 'O''Higgins', 'Pichidegua', 'Kiwi', ARRAY['Cherry', 'Apple'], 210, 3150, ARRAY['GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('ViÃ±a Concha y Toro Fruits', 'Isabella MarÃ­a Undurraga', 'imundurraga@conchaytoro.cl', '+56-2-2345006', 'Chile', 'Maipo', 'Pirque', 'Grapes Wine', ARRAY['Grapes Table'], 450, 2700, ARRAY['GlobalGAP', 'SAG Chile', 'Organic'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Exportadora Aconcagua', 'TomÃ¡s Eduardo LarraÃ­n', 'telarrain@aconcagua.cl', '+56-34-427009', 'Chile', 'ValparaÃ­so', 'San Esteban', 'Grapes Table', ARRAY['Cherry', 'Avocado'], 380, 5700, ARRAY['GlobalGAP', 'SAG Chile', 'BRC Food'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('AgrÃ­cola La Campana', 'Antonia Paz ValdÃ©s', 'apvaldes@lacampana.cl', '+56-32-268010', 'Chile', 'ValparaÃ­so', 'Hijuelas', 'Avocado Hass', ARRAY['Citrus', 'Walnut'], 260, 3900, ARRAY['GlobalGAP', 'SAG Chile', 'Rainforest Alliance'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Frutas Premium Chile', 'BenjamÃ­n Ignacio Castro', 'bicastro@frutaspremium.cl', '+56-71-223010', 'Chile', 'Maule', 'Molina', 'Cherry', ARRAY['Blueberry'], 195, 2340, ARRAY['GlobalGAP', 'SAG Chile', 'Fair Trade'], ARRAY['USA', 'China', 'Europe'], 'approved', 1, NOW()),
('AgrÃ­cola Sur Andino', 'Josefina Elena Bravo', 'jebravo@surandino.cl', '+56-45-221011', 'Chile', 'AraucanÃ­a', 'Temuco', 'Apple', ARRAY['Pear', 'Berry'], 175, 2625, ARRAY['GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Latin America'], 'approved', 2, NOW()),
('Exportadora BioBÃ­o', 'Gonzalo MartÃ­n SepÃºlveda', 'gmsepulveda@expbiobio.cl', '+56-41-221012', 'Chile', 'BiobÃ­o', 'ChillÃ¡n', 'Blueberry', ARRAY['Raspberry', 'Cherry'], 220, 1650, ARRAY['USDA Organic', 'GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Canada', 'Europe'], 'approved', 1, NOW()),
('AgrÃ­cola Malleco', 'SofÃ­a Catalina MuÃ±oz', 'scmunoz@malleco.cl', '+56-45-221013', 'Chile', 'AraucanÃ­a', 'Angol', 'Apple', ARRAY['Pear', 'Hazelnut'], 165, 2475, ARRAY['GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Cerezas Premium Chile', 'MartÃ­n Alejandro Vidal', 'mavidal@cerezaspremium.cl', '+56-71-223011', 'Chile', 'Maule', 'Romeral', 'Cherry', ARRAY['Grape'], 310, 3720, ARRAY['GlobalGAP', 'SAG Chile', 'BRC Food', 'SQF Level 2'], ARRAY['USA', 'China', 'Europe', 'Japan'], 'approved', 0, NOW()),
('AgrÃ­cola Colchagua', 'Florencia Isabel Lagos', 'filago@colchagua.cl', '+56-72-271014', 'Chile', 'O''Higgins', 'Santa Cruz', 'Grapes Wine', ARRAY['Olive', 'Cherry'], 280, 1680, ARRAY['GlobalGAP', 'SAG Chile', 'Organic'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('Sur Fruits Export', 'Vicente Eduardo Riquelme', 'veriquelme@surfruits.cl', '+56-63-241015', 'Chile', 'Los RÃ­os', 'La UniÃ³n', 'Berry Mix', ARRAY['Blueberry', 'Raspberry', 'Cranberry'], 145, 1090, ARRAY['GlobalGAP', 'SAG Chile'], ARRAY['USA', 'Europe'], 'approved', 2, NOW());

-- =====================================================
-- GUATEMALA (15 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES
('Agroexportadora Unex', 'Carlos Roberto Mendez', 'crmendez@unex.gt', '+502-2334-1001', 'Guatemala', 'Guatemala', 'Guatemala City', 'Sugar Cane', ARRAY['Banana', 'Coffee'], 1200, 36000, ARRAY['GlobalGAP', 'MAGA Guatemala', 'BRC Food', 'Bonsucro'], ARRAY['USA', 'Europe'], 'approved', 0, NOW()),
('Del Monte Guatemala', 'MarÃ­a Elena CastaÃ±eda', 'mecastaneda@delmonte.gt', '+502-7832-2001', 'Guatemala', 'Escuintla', 'Escuintla', 'Banana', ARRAY['Pineapple', 'Melon'], 850, 34000, ARRAY['GlobalGAP', 'MAGA Guatemala', 'Rainforest Alliance', 'Fair Trade'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 0, NOW()),
('AgrÃ­cola PopoyÃ¡n', 'Fernando Daniel LÃ³pez', 'fdlopez@popoyan.gt', '+502-7832-2002', 'Guatemala', 'Escuintla', 'Santa LucÃ­a', 'Banana', ARRAY['Plantain'], 480, 19200, ARRAY['GlobalGAP', 'MAGA Guatemala', 'Primus GFS'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Exportadora de CafÃ© de Altura', 'Ana SofÃ­a Barrios', 'asbarrios@cafealtura.gt', '+502-7761-3001', 'Guatemala', 'Huehuetenango', 'Huehuetenango', 'Coffee Arabica', ARRAY['Coffee Specialty'], 320, 960, ARRAY['USDA Organic', 'Fair Trade', 'Rainforest Alliance', 'UTZ Certified'], ARRAY['USA', 'Europe', 'Japan'], 'approved', 0, NOW()),
('Cooperativa AgrÃ­cola AnacafÃ©', 'Roberto Miguel HernÃ¡ndez', 'rmhernandez@anacafe.gt', '+502-7761-3002', 'Guatemala', 'Antigua', 'Antigua Guatemala', 'Coffee Arabica', ARRAY['Coffee Washed'], 280, 840, ARRAY['USDA Organic', 'Fair Trade', 'MAGA Guatemala'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Hortalizas de ExportaciÃ³n', 'Patricia Elena Torres', 'petorres@hortexp.gt', '+502-7762-4001', 'Guatemala', 'Chimaltenango', 'Chimaltenango', 'Snow Pea', ARRAY['Sugar Snap Pea', 'French Bean'], 210, 3150, ARRAY['GlobalGAP', 'MAGA Guatemala', 'Primus GFS'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Vegetales Maya Export', 'Carlos Eduardo JuÃ¡rez', 'cejuarez@vegmaya.gt', '+502-7762-4002', 'Guatemala', 'SacatepÃ©quez', 'Sumpango', 'Broccoli', ARRAY['Cauliflower', 'Brussels Sprouts'], 180, 5400, ARRAY['GlobalGAP', 'MAGA Guatemala'], ARRAY['USA', 'Canada'], 'approved', 2, NOW()),
('Melones Guatemala S.A.', 'Laura Patricia Morales', 'lpmorales@melones.gt', '+502-7934-5001', 'Guatemala', 'Zacapa', 'Zacapa', 'Melon Cantaloupe', ARRAY['Melon Honeydew', 'Watermelon'], 350, 7000, ARRAY['GlobalGAP', 'MAGA Guatemala', 'Primus GFS', 'SQF Level 2'], ARRAY['USA', 'Canada'], 'approved', 1, NOW()),
('Frutas del AtlÃ¡ntico', 'Miguel Ãngel Contreras', 'macontreras@frutasatlantico.gt', '+502-7948-6001', 'Guatemala', 'Izabal', 'Puerto Barrios', 'Banana', ARRAY['Pineapple', 'Papaya'], 420, 16800, ARRAY['GlobalGAP', 'MAGA Guatemala', 'Rainforest Alliance'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Cardamomo Export S.A.', 'Guadalupe Fernanda GarcÃ­a', 'gfgarcia@cardamomo.gt', '+502-7952-7001', 'Guatemala', 'Alta Verapaz', 'CobÃ¡n', 'Cardamom', ARRAY['Black Pepper', 'Allspice'], 290, 870, ARRAY['USDA Organic', 'Fair Trade', 'MAGA Guatemala'], ARRAY['USA', 'Middle East', 'India'], 'approved', 1, NOW()),
('AgrÃ­cola San JosÃ©', 'Oscar Alejandro VelÃ¡squez', 'oavelasquez@agrisanjose.gt', '+502-7762-4003', 'Guatemala', 'Chimaltenango', 'San MartÃ­n', 'French Bean', ARRAY['Snow Pea', 'Mini Vegetable'], 165, 2475, ARRAY['GlobalGAP', 'MAGA Guatemala'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('CafÃ© Antigua Premium', 'Diana Carolina Ãlvarez', 'dcalvarez@cafeantigua.gt', '+502-7832-3001', 'Guatemala', 'SacatepÃ©quez', 'Antigua Guatemala', 'Coffee Specialty', ARRAY['Coffee Single Origin'], 145, 435, ARRAY['USDA Organic', 'Fair Trade', 'Rainforest Alliance', 'UTZ'], ARRAY['USA', 'Europe', 'Japan', 'Korea'], 'approved', 0, NOW()),
('PiÃ±as de Guatemala', 'Fernando Javier Ramos', 'fjramos@pinasgt.gt', '+502-7934-5002', 'Guatemala', 'PetÃ©n', 'San Benito', 'Pineapple', ARRAY['Papaya', 'Mango'], 280, 5600, ARRAY['GlobalGAP', 'MAGA Guatemala'], ARRAY['USA', 'Canada'], 'approved', 2, NOW()),
('Cooperativa AgrÃ­cola Maya', 'MarÃ­a Isabel Cuxil', 'micuxil@coopmaya.gt', '+502-7951-8001', 'Guatemala', 'SololÃ¡', 'Panajachel', 'Vegetable Organic', ARRAY['Tomato', 'Pepper', 'Herbs'], 95, 1425, ARRAY['USDA Organic', 'Fair Trade', 'MAGA Guatemala'], ARRAY['USA', 'Local'], 'approved', 1, NOW()),
('Exportadora Centra', 'Roberto Carlos Ortiz', 'rcortiz@expcentra.gt', '+502-7832-2003', 'Guatemala', 'Escuintla', 'Escuintla', 'Banana Organic', ARRAY['Plantain'], 320, 12800, ARRAY['USDA Organic', 'GlobalGAP', 'MAGA Guatemala', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW());

-- =====================================================
-- COLOMBIA (15 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES
('FederaciÃ³n Nacional de Cafeteros', 'AndrÃ©s Felipe RodrÃ­guez', 'afrodriguez@federacioncafe.co', '+57-1-313-1001', 'Colombia', 'Cundinamarca', 'BogotÃ¡', 'Coffee Arabica', ARRAY['Coffee Specialty', 'Coffee Washed'], 15000, 45000, ARRAY['USDA Organic', 'Fair Trade', 'Rainforest Alliance', 'UTZ', '4C Certified'], ARRAY['USA', 'Europe', 'Japan', 'Asia'], 'approved', 0, NOW()),
('Banacol S.A.', 'MarÃ­a Alejandra VÃ©lez', 'mavelez@banacol.co', '+57-4-444-2001', 'Colombia', 'Antioquia', 'ApartadÃ³', 'Banana', ARRAY['Plantain', 'Banana Organic'], 1200, 48000, ARRAY['GlobalGAP', 'ICA Colombia', 'Rainforest Alliance', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 0, NOW()),
('Uniban S.A.', 'Carlos Eduardo Jaramillo', 'cejaramillo@uniban.co', '+57-4-444-2002', 'Colombia', 'UrabÃ¡', 'Turbo', 'Banana', ARRAY['Banana Organic'], 950, 38000, ARRAY['GlobalGAP', 'ICA Colombia', 'Rainforest Alliance'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 0, NOW()),
('Flores El Rosal', 'Laura Cristina GÃ³mez', 'lcgomez@elrosal.co', '+57-1-863-3001', 'Colombia', 'Cundinamarca', 'Madrid', 'Flowers Rose', ARRAY['Flowers Carnation', 'Flowers Chrysanthemum'], 180, 5400, ARRAY['GlobalGAP', 'Florverde', 'Rainforest Alliance'], ARRAY['USA', 'Europe', 'Russia'], 'approved', 0, NOW()),
('Asocolflores Members', 'Patricia Elena Restrepo', 'perestrepo@asocolflores.co', '+57-1-257-4001', 'Colombia', 'Cundinamarca', 'BogotÃ¡', 'Flowers Mixed', ARRAY['Flowers Tropical', 'Foliage'], 350, 10500, ARRAY['GlobalGAP', 'Florverde', 'BASC', 'Rainforest Alliance'], ARRAY['USA', 'Europe', 'Japan'], 'approved', 0, NOW()),
('CafÃ© de Colombia Premium', 'SebastiÃ¡n AndrÃ©s Ospina', 'saospina@cafecolombia.co', '+57-6-321-5001', 'Colombia', 'Caldas', 'Manizales', 'Coffee Specialty', ARRAY['Coffee Single Origin'], 280, 840, ARRAY['USDA Organic', 'Fair Trade', 'Rainforest Alliance', 'UTZ'], ARRAY['USA', 'Europe', 'Japan', 'Korea'], 'approved', 0, NOW()),
('AgrÃ­cola Palmera del Llano', 'Roberto Miguel Pardo', 'rmpardo@palmera.co', '+57-8-635-6001', 'Colombia', 'Meta', 'Villavicencio', 'Palm Oil', ARRAY['Palm Kernel'], 850, 12750, ARRAY['RSPO Certified', 'ICA Colombia'], ARRAY['Europe', 'Asia'], 'approved', 1, NOW()),
('Frutas Tropicales de Colombia', 'Ana MarÃ­a Salazar', 'amsalazar@frutastropical.co', '+57-2-680-7001', 'Colombia', 'Valle del Cauca', 'Cali', 'Passion Fruit', ARRAY['Mango', 'Lulo', 'Gulupa'], 210, 2520, ARRAY['GlobalGAP', 'ICA Colombia', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Aguacates Hass Colombia', 'Fernando Daniel MejÃ­a', 'fdmejia@aguacatescol.co', '+57-4-268-8001', 'Colombia', 'Antioquia', 'MedellÃ­n', 'Avocado Hass', ARRAY['Avocado Varieties'], 380, 5700, ARRAY['GlobalGAP', 'ICA Colombia', 'Primus GFS'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 1, NOW()),
('Exotic Fruits Export', 'Claudia Patricia Herrera', 'cpherrera@exoticfruits.co', '+57-2-680-7002', 'Colombia', 'Valle del Cauca', 'Palmira', 'Gulupa', ARRAY['Granadilla', 'Pitahaya', 'Uchuva'], 145, 1450, ARRAY['GlobalGAP', 'ICA Colombia', 'Fair Trade'], ARRAY['USA', 'Europe', 'Canada'], 'approved', 1, NOW()),
('CafÃ© Huila Premium', 'Oscar Alejandro Trujillo', 'oatrujillo@cafehuila.co', '+57-8-871-9001', 'Colombia', 'Huila', 'Neiva', 'Coffee Arabica', ARRAY['Coffee Specialty'], 195, 585, ARRAY['USDA Organic', 'Fair Trade', 'UTZ'], ARRAY['USA', 'Europe', 'Japan'], 'approved', 1, NOW()),
('Platanera del QuindÃ­o', 'MarÃ­a Fernanda LondoÃ±o', 'mflondono@platanera.co', '+57-6-742-1001', 'Colombia', 'QuindÃ­o', 'Armenia', 'Plantain', ARRAY['Banana', 'Plantain Green'], 240, 7200, ARRAY['GlobalGAP', 'ICA Colombia'], ARRAY['USA', 'Europe'], 'approved', 2, NOW()),
('CÃ­tricos del Tolima', 'Diego Alejandro Vargas', 'davargas@citricostolima.co', '+57-8-263-1002', 'Colombia', 'Tolima', 'IbaguÃ©', 'Orange Valencia', ARRAY['Mandarin', 'Lime Tahiti'], 175, 2625, ARRAY['GlobalGAP', 'ICA Colombia'], ARRAY['USA', 'Local'], 'approved', 2, NOW()),
('PiÃ±as Export Colombia', 'Valentina Isabel Moreno', 'vimoreno@pinasexport.co', '+57-4-826-1003', 'Colombia', 'Santander', 'Lebrija', 'Pineapple Gold', ARRAY['Pineapple MD2'], 220, 4400, ARRAY['GlobalGAP', 'ICA Colombia', 'Primus GFS'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('Uchuvas Premium', 'Jorge Luis BermÃºdez', 'jlbermudez@uchuvas.co', '+57-1-863-3002', 'Colombia', 'BoyacÃ¡', 'Tunja', 'Uchuva', ARRAY['Physalis'], 95, 950, ARRAY['GlobalGAP', 'ICA Colombia', 'Fair Trade'], ARRAY['USA', 'Europe', 'Canada'], 'approved', 1, NOW());

-- =====================================================
-- ECUADOR (10 Growers)
-- =====================================================

INSERT INTO growers (
    business_name, contact_name, email, phone, country, state, city,
    primary_product, secondary_products, hectares, annual_volume_tons,
    certifications, export_markets, status, risk_tier, created_at
) VALUES
('Exportadora Noboa', 'Francisco Eduardo Noboa', 'fenoboa@noboa.ec', '+593-4-228-1001', 'Ecuador', 'Guayas', 'Guayaquil', 'Banana', ARRAY['Banana Organic', 'Plantain'], 2500, 100000, ARRAY['GlobalGAP', 'Agrocalidad', 'Rainforest Alliance', 'Fair Trade'], ARRAY['USA', 'Europe', 'Russia', 'Asia'], 'approved', 0, NOW()),
('Reybanpac S.A.', 'MarÃ­a Elena CÃ³rdova', 'mecordova@reybanpac.ec', '+593-4-228-1002', 'Ecuador', 'Los RÃ­os', 'Babahoyo', 'Banana', ARRAY['Banana Cavendish'], 1800, 72000, ARRAY['GlobalGAP', 'Agrocalidad', 'Rainforest Alliance', 'BASC'], ARRAY['USA', 'Europe', 'Middle East'], 'approved', 0, NOW()),
('Dole Ecuador', 'Carlos Roberto Andrade', 'crandrade@dole.ec', '+593-4-228-1003', 'Ecuador', 'El Oro', 'Machala', 'Banana', ARRAY['Pineapple'], 1200, 48000, ARRAY['GlobalGAP', 'Agrocalidad', 'Rainforest Alliance', 'Fair Trade', 'HACCP'], ARRAY['USA', 'Europe', 'Asia'], 'approved', 0, NOW()),
('AgrÃ­cola Prieto S.A.', 'Patricia Fernanda LÃ³pez', 'pflopez@agricolaprieto.ec', '+593-2-246-2001', 'Ecuador', 'Pichincha', 'Quito', 'Flowers Rose', ARRAY['Flowers Gypsophila', 'Flowers Mixed'], 280, 8400, ARRAY['GlobalGAP', 'Agrocalidad', 'FlorEcuador', 'Rainforest Alliance'], ARRAY['USA', 'Europe', 'Russia'], 'approved', 0, NOW()),
('Cacao Premium Ecuador', 'Fernando Daniel Salazar', 'fdsalazar@cacaopremium.ec', '+593-4-228-1004', 'Ecuador', 'Guayas', 'Guayaquil', 'Cacao Fine', ARRAY['Cacao Nacional', 'Cacao Arriba'], 420, 1260, ARRAY['USDA Organic', 'Fair Trade', 'Rainforest Alliance', 'UTZ'], ARRAY['USA', 'Europe', 'Switzerland'], 'approved', 0, NOW()),
('CamarÃ³n del PacÃ­fico', 'Ana Cristina VÃ©lez', 'acvelez@camaronpacifico.ec', '+593-4-228-1005', 'Ecuador', 'El Oro', 'Santa Rosa', 'Shrimp', ARRAY['Shrimp White', 'Shrimp Vannamei'], 650, 9750, ARRAY['BAP Certified', 'ASC', 'Agrocalidad', 'HACCP'], ARRAY['USA', 'Europe', 'Asia', 'China'], 'approved', 0, NOW()),
('Mango Ecuador Export', 'Roberto Miguel Herrera', 'rmherrera@mangoecuador.ec', '+593-4-228-1006', 'Ecuador', 'Guayas', 'Guayaquil', 'Mango Tommy', ARRAY['Mango Kent', 'Mango Haden'], 310, 3720, ARRAY['GlobalGAP', 'Agrocalidad', 'Primus GFS'], ARRAY['USA', 'Europe', 'Canada'], 'approved', 1, NOW()),
('PiÃ±as Tropicales S.A.', 'Laura Patricia Morales', 'lpmorales@pinastropical.ec', '+593-4-228-1007', 'Ecuador', 'Los RÃ­os', 'Quevedo', 'Pineapple MD2', ARRAY['Pineapple Gold'], 280, 5600, ARRAY['GlobalGAP', 'Agrocalidad', 'Fair Trade'], ARRAY['USA', 'Europe'], 'approved', 1, NOW()),
('BrÃ³coli Andino', 'Oscar Alejandro Torres', 'oatorres@brocoliandino.ec', '+593-2-246-2002', 'Ecuador', 'Cotopaxi', 'Latacunga', 'Broccoli', ARRAY['Cauliflower', 'Romanesco'], 195, 5850, ARRAY['GlobalGAP', 'Agrocalidad', 'Primus GFS'], ARRAY['USA', 'Europe', 'Japan'], 'approved', 1, NOW()),
('Palmito del Oriente', 'Claudia Fernanda GarcÃ­a', 'cfgarcia@palmito.ec', '+593-6-288-3001', 'Ecuador', 'Pichincha', 'Santo Domingo', 'Hearts of Palm', ARRAY['Palmito'], 240, 2400, ARRAY['GlobalGAP', 'Agrocalidad', 'Fair Trade'], ARRAY['USA', 'Europe', 'France'], 'approved', 1, NOW());

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count by country
-- SELECT country, COUNT(*) as grower_count FROM growers WHERE country IN ('Peru', 'Chile', 'Guatemala', 'Colombia', 'Ecuador') GROUP BY country ORDER BY grower_count DESC;

-- Count by risk tier
-- SELECT country, risk_tier, COUNT(*) as count FROM growers WHERE country IN ('Peru', 'Chile', 'Guatemala', 'Colombia', 'Ecuador') GROUP BY country, risk_tier ORDER BY country, risk_tier;

-- Total: 100 South/Central America Growers
-- Peru: 35, Chile: 25, Guatemala: 15, Colombia: 15, Ecuador: 10
