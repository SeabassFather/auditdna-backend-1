-- ═══════════════════════════════════════════════════════════════
-- AUDITDNA PRODUCT CATALOG - 500+ PRODUCTS
-- CM Products International | MexaUSA Food Group
-- Run after migration.sql
-- ═══════════════════════════════════════════════════════════════

-- Clear existing and reload
DELETE FROM product_catalog;

INSERT INTO product_catalog (sku, product_name, product_name_es, category, varieties, varieties_es, origin_country, origin_regions, seasonality, seasonality_es, unit_type, pack_sizes, organic_available, conventional_available, usda_commodity_name, cold_chain_required, shelf_life_days) VALUES
-- ═══════════════════════════════════════════════════════════════
-- AVOCADOS (15 SKUs)
-- ═══════════════════════════════════════════════════════════════
('AVO-32', 'Hass Avocado 32ct', 'Aguacate Hass 32ct', 'Avocados', 'Hass', 'Hass', 'Mexico', 'Michoacan, Jalisco', 'Year-round', 'Todo el ano', 'case', '32ct', true, true, 'Avocados', true, 21),
('AVO-36', 'Hass Avocado 36ct', 'Aguacate Hass 36ct', 'Avocados', 'Hass', 'Hass', 'Mexico', 'Michoacan, Jalisco', 'Year-round', 'Todo el ano', 'case', '36ct', true, true, 'Avocados', true, 21),
('AVO-40', 'Hass Avocado 40ct', 'Aguacate Hass 40ct', 'Avocados', 'Hass', 'Hass', 'Mexico', 'Michoacan, Jalisco', 'Year-round', 'Todo el ano', 'case', '40ct', true, true, 'Avocados', true, 21),
('AVO-48', 'Hass Avocado 48ct', 'Aguacate Hass 48ct', 'Avocados', 'Hass', 'Hass', 'Mexico', 'Michoacan, Jalisco, Mexico State', 'Year-round', 'Todo el ano', 'case', '48ct', true, true, 'Avocados', true, 21),
('AVO-60', 'Hass Avocado 60ct', 'Aguacate Hass 60ct', 'Avocados', 'Hass', 'Hass', 'Mexico', 'Jalisco, Michoacan', 'Year-round', 'Todo el ano', 'case', '60ct', true, true, 'Avocados', true, 21),
('AVO-70', 'Hass Avocado 70ct', 'Aguacate Hass 70ct', 'Avocados', 'Hass', 'Hass', 'Mexico', 'Jalisco, Michoacan', 'Year-round', 'Todo el ano', 'case', '70ct', true, true, 'Avocados', true, 21),
('AVO-84', 'Hass Avocado 84ct', 'Aguacate Hass 84ct', 'Avocados', 'Hass', 'Hass', 'Mexico', 'Michoacan', 'Year-round', 'Todo el ano', 'case', '84ct', true, true, 'Avocados', true, 21),
('AVO-FRT-40', 'Fuerte Avocado 40ct', 'Aguacate Fuerte 40ct', 'Avocados', 'Fuerte', 'Fuerte', 'Mexico', 'Michoacan, Jalisco', 'Oct-Mar', 'Oct-Mar', 'case', '40ct', false, true, 'Avocados', true, 18),
('AVO-FRT-48', 'Fuerte Avocado 48ct', 'Aguacate Fuerte 48ct', 'Avocados', 'Fuerte', 'Fuerte', 'Mexico', 'Michoacan', 'Oct-Mar', 'Oct-Mar', 'case', '48ct', false, true, 'Avocados', true, 18),
('AVO-BCN-48', 'Bacon Avocado 48ct', 'Aguacate Bacon 48ct', 'Avocados', 'Bacon', 'Bacon', 'Mexico', 'Michoacan', 'Nov-Feb', 'Nov-Feb', 'case', '48ct', false, true, 'Avocados', true, 16),
('AVO-ORG-48', 'Organic Hass Avocado 48ct', 'Aguacate Hass Organico 48ct', 'Avocados', 'Hass Organic', 'Hass Organico', 'Mexico', 'Michoacan, Jalisco', 'Year-round', 'Todo el ano', 'case', '48ct', true, false, 'Avocados', true, 21),
('AVO-ORG-60', 'Organic Hass Avocado 60ct', 'Aguacate Hass Organico 60ct', 'Avocados', 'Hass Organic', 'Hass Organico', 'Mexico', 'Michoacan, Jalisco', 'Year-round', 'Todo el ano', 'case', '60ct', true, false, 'Avocados', true, 21),
('AVO-PER-48', 'Hass Avocado 48ct Peru', 'Aguacate Hass 48ct Peru', 'Avocados', 'Hass', 'Hass', 'Peru', 'La Libertad, Lima, Ica', 'May-Sep', 'May-Sep', 'case', '48ct', true, true, 'Avocados', true, 25),
('AVO-COL-48', 'Hass Avocado 48ct Colombia', 'Aguacate Hass 48ct Colombia', 'Avocados', 'Hass', 'Hass', 'Colombia', 'Antioquia, Caldas', 'Year-round', 'Todo el ano', 'case', '48ct', false, true, 'Avocados', true, 23),
('AVO-CHL-48', 'Hass Avocado 48ct Chile', 'Aguacate Hass 48ct Chile', 'Avocados', 'Hass', 'Hass', 'Chile', 'Valparaiso, Coquimbo', 'Sep-Feb', 'Sep-Feb', 'case', '48ct', true, true, 'Avocados', true, 25),

-- ═══════════════════════════════════════════════════════════════
-- BERRIES (30 SKUs)
-- ═══════════════════════════════════════════════════════════════
('STR-8x1', 'Strawberries 8x1lb', 'Fresas 8x1lb', 'Berries', 'Conventional', 'Convencional', 'Mexico', 'Baja California, Guanajuato', 'Oct-Jun', 'Oct-Jun', 'flat', '8x1lb', true, true, 'Strawberries', true, 7),
('STR-12x1', 'Strawberries 12x1lb', 'Fresas 12x1lb', 'Berries', 'Conventional', 'Convencional', 'Mexico', 'Baja California, Guanajuato', 'Oct-Jun', 'Oct-Jun', 'flat', '12x1lb', true, true, 'Strawberries', true, 7),
('STR-4x2', 'Strawberries 4x2lb', 'Fresas 4x2lb', 'Berries', 'Conventional', 'Convencional', 'Mexico', 'Baja California', 'Oct-Jun', 'Oct-Jun', 'flat', '4x2lb', true, true, 'Strawberries', true, 7),
('STR-BLK', 'Strawberries Bulk 8lb', 'Fresas Granel 8lb', 'Berries', 'Conventional', 'Convencional', 'Mexico', 'Baja California, Jalisco', 'Oct-Jun', 'Oct-Jun', 'flat', '8lb bulk', false, true, 'Strawberries', true, 5),
('STR-ORG-8x1', 'Organic Strawberries 8x1lb', 'Fresas Organicas 8x1lb', 'Berries', 'Organic', 'Organica', 'Mexico', 'Baja California', 'Nov-May', 'Nov-May', 'flat', '8x1lb', true, false, 'Strawberries', true, 7),
('STR-GT-8x1', 'Strawberries Guatemala 8x1lb', 'Fresas Guatemala 8x1lb', 'Berries', 'Conventional', 'Convencional', 'Guatemala', 'Chimaltenango, Sacatepequez', 'Nov-Apr', 'Nov-Abr', 'flat', '8x1lb', false, true, 'Strawberries', true, 7),
('BLU-12x6', 'Blueberries 12x6oz', 'Arandanos 12x6oz', 'Berries', 'Conventional', 'Convencional', 'Mexico', 'Baja California, Jalisco, Sinaloa', 'Oct-May', 'Oct-May', 'flat', '12x6oz', true, true, 'Blueberries', true, 14),
('BLU-12x1PT', 'Blueberries 12x1pt', 'Arandanos 12x1pt', 'Berries', 'Conventional', 'Convencional', 'Mexico', 'Jalisco, Sinaloa', 'Oct-May', 'Oct-May', 'flat', '12x1pt', true, true, 'Blueberries', true, 14),
('BLU-ORG-12x6', 'Organic Blueberries 12x6oz', 'Arandanos Organicos 12x6oz', 'Berries', 'Organic', 'Organica', 'Mexico', 'Baja California, Jalisco', 'Nov-Apr', 'Nov-Abr', 'flat', '12x6oz', true, false, 'Blueberries', true, 14),
('BLU-PER-12x6', 'Blueberries Peru 12x6oz', 'Arandanos Peru 12x6oz', 'Berries', 'Conventional', 'Convencional', 'Peru', 'La Libertad, Lambayeque', 'Aug-Nov', 'Ago-Nov', 'flat', '12x6oz', true, true, 'Blueberries', true, 18),
('BLU-CHL-12x6', 'Blueberries Chile 12x6oz', 'Arandanos Chile 12x6oz', 'Berries', 'Conventional', 'Convencional', 'Chile', 'Maule, BioBio', 'Dec-Mar', 'Dic-Mar', 'flat', '12x6oz', true, true, 'Blueberries', true, 18),
('RSP-12x6', 'Raspberries 12x6oz', 'Frambuesas 12x6oz', 'Berries', 'Conventional', 'Convencional', 'Mexico', 'Baja California, Jalisco', 'Oct-Jun', 'Oct-Jun', 'flat', '12x6oz', true, true, 'Raspberries', true, 5),
('RSP-6x6', 'Raspberries 6x6oz', 'Frambuesas 6x6oz', 'Berries', 'Conventional', 'Convencional', 'Mexico', 'Baja California', 'Oct-Jun', 'Oct-Jun', 'flat', '6x6oz', true, true, 'Raspberries', true, 5),
('RSP-ORG-12x6', 'Organic Raspberries 12x6oz', 'Frambuesas Organicas 12x6oz', 'Berries', 'Organic', 'Organica', 'Mexico', 'Baja California', 'Nov-May', 'Nov-May', 'flat', '12x6oz', true, false, 'Raspberries', true, 5),
('RSP-GT-12x6', 'Raspberries Guatemala 12x6oz', 'Frambuesas Guatemala 12x6oz', 'Berries', 'Conventional', 'Convencional', 'Guatemala', 'Chimaltenango', 'Nov-Apr', 'Nov-Abr', 'flat', '12x6oz', false, true, 'Raspberries', true, 5),
('BLK-12x6', 'Blackberries 12x6oz', 'Zarzamoras 12x6oz', 'Berries', 'Conventional', 'Convencional', 'Mexico', 'Jalisco, Michoacan', 'Oct-May', 'Oct-May', 'flat', '12x6oz', true, true, 'Blackberries', true, 5),
('BLK-6x6', 'Blackberries 6x6oz', 'Zarzamoras 6x6oz', 'Berries', 'Conventional', 'Convencional', 'Mexico', 'Jalisco', 'Oct-May', 'Oct-May', 'flat', '6x6oz', true, true, 'Blackberries', true, 5),
('BLK-GT-12x6', 'Blackberries Guatemala 12x6oz', 'Zarzamoras Guatemala 12x6oz', 'Berries', 'Conventional', 'Convencional', 'Guatemala', 'Chimaltenango, Quetzaltenango', 'Year-round', 'Todo el ano', 'flat', '12x6oz', false, true, 'Blackberries', true, 5),
('MXB-8x6', 'Mixed Berries 8x6oz', 'Berries Mixtos 8x6oz', 'Berries', 'Strawberry, Blueberry, Raspberry', 'Fresa, Arandano, Frambuesa', 'Mexico', 'Baja California', 'Nov-May', 'Nov-May', 'flat', '8x6oz', false, true, 'Berries', true, 5),
('CRN-12x6', 'Cranberries 12x6oz', 'Arandanos Rojos 12x6oz', 'Berries', 'Conventional', 'Convencional', 'Chile', 'Maule, Araucania', 'Jan-Mar', 'Ene-Mar', 'flat', '12x6oz', false, true, 'Cranberries', true, 14),

-- ═══════════════════════════════════════════════════════════════
-- TOMATOES (25 SKUs)
-- ═══════════════════════════════════════════════════════════════
('TOM-ROM-25', 'Roma Tomatoes 25lb', 'Tomate Roma 25lb', 'Tomatoes', 'Roma, Saladette', 'Roma, Saladette', 'Mexico', 'Sinaloa, Sonora, Baja California', 'Year-round', 'Todo el ano', 'case', '25lb', true, true, 'Tomatoes', true, 14),
('TOM-ROM-20', 'Roma Tomatoes 20lb', 'Tomate Roma 20lb', 'Tomatoes', 'Roma', 'Roma', 'Mexico', 'Sinaloa, Sonora', 'Year-round', 'Todo el ano', 'case', '20lb', false, true, 'Tomatoes', true, 14),
('TOM-ROM-10', 'Roma Tomatoes 10lb', 'Tomate Roma 10lb', 'Tomatoes', 'Roma', 'Roma', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Tomatoes', true, 14),
('TOM-RND-25', 'Round Tomatoes 25lb', 'Tomate Bola 25lb', 'Tomatoes', 'Round, Vine-ripe', 'Bola, Racimo', 'Mexico', 'Sinaloa, Sonora, Jalisco', 'Year-round', 'Todo el ano', 'case', '25lb', true, true, 'Tomatoes', true, 14),
('TOM-RND-20', 'Round Tomatoes 20lb', 'Tomate Bola 20lb', 'Tomatoes', 'Round', 'Bola', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '20lb', false, true, 'Tomatoes', true, 14),
('TOM-BEF-25', 'Beefsteak Tomatoes 25lb', 'Tomate Beefsteak 25lb', 'Tomatoes', 'Beefsteak', 'Beefsteak', 'Mexico', 'Sinaloa, Baja California', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Tomatoes', true, 12),
('TOM-CHR-12', 'Cherry Tomatoes 12x1lb', 'Tomate Cherry 12x1lb', 'Tomatoes', 'Cherry', 'Cherry', 'Mexico', 'Baja California, Sinaloa', 'Year-round', 'Todo el ano', 'case', '12x1lb', true, true, 'Tomatoes', true, 10),
('TOM-CHR-10', 'Cherry Tomatoes 10x1lb', 'Tomate Cherry 10x1lb', 'Tomatoes', 'Cherry', 'Cherry', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '10x1lb', false, true, 'Tomatoes', true, 10),
('TOM-GRP-12', 'Grape Tomatoes 12x1lb', 'Tomate Grape 12x1lb', 'Tomatoes', 'Grape', 'Uva', 'Mexico', 'Jalisco, Sinaloa', 'Year-round', 'Todo el ano', 'case', '12x1lb', true, true, 'Tomatoes', true, 12),
('TOM-VIN-15', 'Vine Tomatoes 15lb', 'Tomate Racimo 15lb', 'Tomatoes', 'Vine-ripe, Cluster', 'Racimo', 'Mexico', 'Sinaloa, Jalisco', 'Year-round', 'Todo el ano', 'case', '15lb', false, true, 'Tomatoes', true, 10),
('TOM-TOV-11', 'Tomatoes on Vine 11lb', 'Tomate en Rama 11lb', 'Tomatoes', 'TOV', 'TOV', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '11lb', false, true, 'Tomatoes', true, 10),
('TOM-CAM-25', 'Campari Tomatoes 12x1lb', 'Tomate Campari 12x1lb', 'Tomatoes', 'Campari', 'Campari', 'Mexico', 'Sinaloa, Jalisco', 'Year-round', 'Todo el ano', 'case', '12x1lb', false, true, 'Tomatoes', true, 12),
('TOM-HRL-12', 'Heirloom Tomatoes 12lb', 'Tomate Heirloom 12lb', 'Tomatoes', 'Heirloom Mix', 'Heirloom Mix', 'Mexico', 'Baja California, Sinaloa', 'Dec-May', 'Dic-May', 'case', '12lb', true, true, 'Tomatoes', true, 7),
('TOM-GRN-25', 'Green Tomatoes (Tomatillo) 25lb', 'Tomate Verde 25lb', 'Tomatoes', 'Tomatillo', 'Tomatillo', 'Mexico', 'Sinaloa, Jalisco, Puebla', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Tomatillos', true, 14),
('TOM-GRN-10', 'Tomatillos 10lb', 'Tomate Verde 10lb', 'Tomatoes', 'Tomatillo', 'Tomatillo', 'Mexico', 'Sinaloa, Puebla', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Tomatillos', true, 14),
('TOM-ORG-ROM-25', 'Organic Roma Tomatoes 25lb', 'Tomate Roma Organico 25lb', 'Tomatoes', 'Roma Organic', 'Roma Organico', 'Mexico', 'Sinaloa, Baja California', 'Year-round', 'Todo el ano', 'case', '25lb', true, false, 'Tomatoes', true, 12),
('TOM-ORG-CHR-12', 'Organic Cherry Tomatoes 12x1lb', 'Tomate Cherry Organico 12x1lb', 'Tomatoes', 'Cherry Organic', 'Cherry Organico', 'Mexico', 'Baja California', 'Year-round', 'Todo el ano', 'case', '12x1lb', true, false, 'Tomatoes', true, 10),
('TOM-GT-ROM-25', 'Roma Tomatoes Guatemala 25lb', 'Tomate Roma Guatemala 25lb', 'Tomatoes', 'Roma', 'Roma', 'Guatemala', 'Jutiapa, Chiquimula', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Tomatoes', true, 14),

-- ═══════════════════════════════════════════════════════════════
-- PEPPERS (35 SKUs)
-- ═══════════════════════════════════════════════════════════════
('PEP-GRN-11', 'Green Bell Pepper XL 11lb', 'Pimiento Verde XL 11lb', 'Peppers', 'Green Bell', 'Morron Verde', 'Mexico', 'Sinaloa, Sonora, Baja California', 'Year-round', 'Todo el ano', 'case', '11lb', true, true, 'Peppers', true, 14),
('PEP-GRN-25', 'Green Bell Pepper 25lb', 'Pimiento Verde 25lb', 'Peppers', 'Green Bell', 'Morron Verde', 'Mexico', 'Sinaloa, Sonora', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Peppers', true, 14),
('PEP-RED-11', 'Red Bell Pepper XL 11lb', 'Pimiento Rojo XL 11lb', 'Peppers', 'Red Bell', 'Morron Rojo', 'Mexico', 'Sinaloa, Sonora', 'Year-round', 'Todo el ano', 'case', '11lb', true, true, 'Peppers', true, 14),
('PEP-RED-25', 'Red Bell Pepper 25lb', 'Pimiento Rojo 25lb', 'Peppers', 'Red Bell', 'Morron Rojo', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Peppers', true, 14),
('PEP-YEL-11', 'Yellow Bell Pepper 11lb', 'Pimiento Amarillo 11lb', 'Peppers', 'Yellow Bell', 'Morron Amarillo', 'Mexico', 'Jalisco, Sinaloa', 'Year-round', 'Todo el ano', 'case', '11lb', true, true, 'Peppers', true, 14),
('PEP-ORG-11', 'Orange Bell Pepper 11lb', 'Pimiento Naranja 11lb', 'Peppers', 'Orange Bell', 'Morron Naranja', 'Mexico', 'Sinaloa, Jalisco', 'Year-round', 'Todo el ano', 'case', '11lb', false, true, 'Peppers', true, 14),
('PEP-MIX-11', 'Mixed Bell Pepper 11lb', 'Pimiento Mixto 11lb', 'Peppers', 'Mixed (Red, Yellow, Orange)', 'Mixto (Rojo, Amarillo, Naranja)', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '11lb', false, true, 'Peppers', true, 14),
('PEP-JAL-10', 'Jalapeno 10lb', 'Chile Jalapeno 10lb', 'Peppers', 'Jalapeno', 'Jalapeno', 'Mexico', 'Chihuahua, Sinaloa, Veracruz', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', true, 14),
('PEP-JAL-25', 'Jalapeno 25lb', 'Chile Jalapeno 25lb', 'Peppers', 'Jalapeno', 'Jalapeno', 'Mexico', 'Chihuahua, Sinaloa', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Peppers', true, 14),
('PEP-SER-10', 'Serrano 10lb', 'Chile Serrano 10lb', 'Peppers', 'Serrano', 'Serrano', 'Mexico', 'Veracruz, Sinaloa, Tamaulipas', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', true, 14),
('PEP-SER-25', 'Serrano 25lb', 'Chile Serrano 25lb', 'Peppers', 'Serrano', 'Serrano', 'Mexico', 'Veracruz, Sinaloa', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Peppers', true, 14),
('PEP-POB-10', 'Poblano 10lb', 'Chile Poblano 10lb', 'Peppers', 'Poblano', 'Poblano', 'Mexico', 'Puebla, Sinaloa, Guanajuato', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', true, 10),
('PEP-POB-25', 'Poblano 25lb', 'Chile Poblano 25lb', 'Peppers', 'Poblano', 'Poblano', 'Mexico', 'Puebla, Sinaloa', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Peppers', true, 10),
('PEP-ANH-10', 'Anaheim 10lb', 'Chile Anaheim 10lb', 'Peppers', 'Anaheim', 'Anaheim', 'Mexico', 'Chihuahua, Sinaloa', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', true, 12),
('PEP-HAB-5', 'Habanero 5lb', 'Chile Habanero 5lb', 'Peppers', 'Habanero', 'Habanero', 'Mexico', 'Yucatan, Campeche, Tabasco', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Peppers', true, 14),
('PEP-HAB-10', 'Habanero 10lb', 'Chile Habanero 10lb', 'Peppers', 'Habanero', 'Habanero', 'Mexico', 'Yucatan, Campeche', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', true, 14),
('PEP-MAN-10', 'Manzano 10lb', 'Chile Manzano 10lb', 'Peppers', 'Manzano/Rocoto', 'Manzano/Rocoto', 'Mexico', 'Puebla, Michoacan', 'Jul-Dec', 'Jul-Dic', 'case', '10lb', false, true, 'Peppers', true, 10),
('PEP-GUJ-10', 'Guajillo Dried 10lb', 'Chile Guajillo Seco 10lb', 'Peppers', 'Guajillo Dried', 'Guajillo Seco', 'Mexico', 'Zacatecas, Durango, Aguascalientes', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', false, 180),
('PEP-ANC-10', 'Ancho Dried 10lb', 'Chile Ancho Seco 10lb', 'Peppers', 'Ancho Dried', 'Ancho Seco', 'Mexico', 'Zacatecas, Durango', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', false, 180),
('PEP-ARB-5', 'Arbol Dried 5lb', 'Chile de Arbol Seco 5lb', 'Peppers', 'Arbol Dried', 'Arbol Seco', 'Mexico', 'Jalisco, Nayarit', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Peppers', false, 180),
('PEP-PAS-10', 'Pasilla Dried 10lb', 'Chile Pasilla Seco 10lb', 'Peppers', 'Pasilla Dried', 'Pasilla Seco', 'Mexico', 'Guanajuato, Queretaro', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', false, 180),
('PEP-CHI-10', 'Chipotle Dried 10lb', 'Chile Chipotle Seco 10lb', 'Peppers', 'Chipotle Dried', 'Chipotle Seco', 'Mexico', 'Chihuahua, Veracruz', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', false, 180),
('PEP-FRS-10', 'Fresno 10lb', 'Chile Fresno 10lb', 'Peppers', 'Fresno', 'Fresno', 'Mexico', 'Sinaloa, Sonora', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', true, 14),
('PEP-CUB-10', 'Cubanelle 10lb', 'Chile Cubanelle 10lb', 'Peppers', 'Cubanelle/Italian', 'Cubanelle/Italiano', 'Mexico', 'Sinaloa', 'Nov-May', 'Nov-May', 'case', '10lb', false, true, 'Peppers', true, 12),
('PEP-SHP-10', 'Shishito 10lb', 'Chile Shishito 10lb', 'Peppers', 'Shishito', 'Shishito', 'Mexico', 'Baja California, Sinaloa', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', true, 10),
('PEP-MNP-11', 'Mini Sweet Pepper 11lb', 'Mini Pimiento Dulce 11lb', 'Peppers', 'Mini Sweet', 'Mini Dulce', 'Mexico', 'Sinaloa, Jalisco', 'Year-round', 'Todo el ano', 'case', '11lb', false, true, 'Peppers', true, 14),

-- ═══════════════════════════════════════════════════════════════
-- LEAFY GREENS (20 SKUs)
-- ═══════════════════════════════════════════════════════════════
('LET-ROM-24', 'Romaine Lettuce 24ct', 'Lechuga Romana 24ct', 'Leafy Greens', 'Romaine Whole Head', 'Romana Cabeza', 'Mexico', 'Guanajuato, Baja California, Queretaro', 'Nov-Apr', 'Nov-Abr', 'case', '24ct', false, true, 'Lettuce', true, 10),
('LET-ROM-H24', 'Romaine Hearts 24ct', 'Corazones de Romana 24ct', 'Leafy Greens', 'Romaine Hearts', 'Corazones de Romana', 'Mexico', 'Guanajuato, Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '24ct 3-pack', true, true, 'Lettuce', true, 10),
('LET-ICE-24', 'Iceberg Lettuce 24ct', 'Lechuga Iceberg 24ct', 'Leafy Greens', 'Iceberg', 'Iceberg', 'Mexico', 'Guanajuato, Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '24ct', false, true, 'Lettuce', true, 14),
('LET-GRN-24', 'Green Leaf Lettuce 24ct', 'Lechuga Verde 24ct', 'Leafy Greens', 'Green Leaf', 'Hoja Verde', 'Mexico', 'Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '24ct', false, true, 'Lettuce', true, 7),
('LET-RED-24', 'Red Leaf Lettuce 24ct', 'Lechuga Roja 24ct', 'Leafy Greens', 'Red Leaf', 'Hoja Roja', 'Mexico', 'Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '24ct', false, true, 'Lettuce', true, 7),
('LET-BUT-24', 'Butter Lettuce 24ct', 'Lechuga Mantequilla 24ct', 'Leafy Greens', 'Butter/Boston', 'Mantequilla/Boston', 'Mexico', 'Guanajuato, Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '24ct', true, true, 'Lettuce', true, 5),
('SPN-2.5', 'Baby Spinach 2.5lb', 'Espinaca Baby 2.5lb', 'Leafy Greens', 'Baby Spinach', 'Espinaca Baby', 'Mexico', 'Guanajuato, Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '2.5lb', true, true, 'Spinach', true, 7),
('SPN-5', 'Baby Spinach 5lb', 'Espinaca Baby 5lb', 'Leafy Greens', 'Baby Spinach', 'Espinaca Baby', 'Mexico', 'Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '5lb', true, true, 'Spinach', true, 7),
('SPN-BDL', 'Spinach Bunched 24ct', 'Espinaca Manojo 24ct', 'Leafy Greens', 'Bunched Spinach', 'Espinaca Manojo', 'Mexico', 'Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '24 bunches', false, true, 'Spinach', true, 5),
('KAL-12', 'Kale Bunched 12ct', 'Kale Manojo 12ct', 'Leafy Greens', 'Curly, Lacinato', 'Rizada, Lacinato', 'Mexico', 'Baja California, Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '12 bunches', true, true, 'Kale', true, 7),
('ARG-2', 'Arugula 2lb', 'Arugula 2lb', 'Leafy Greens', 'Baby Arugula', 'Arugula Baby', 'Mexico', 'Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '2lb', true, true, 'Arugula', true, 5),
('MXG-3', 'Mixed Greens 3lb', 'Lechugas Mixtas 3lb', 'Leafy Greens', 'Spring Mix', 'Mezcla Primavera', 'Mexico', 'Guanajuato, Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '3lb', true, true, 'Greens', true, 5),
('CHL-12', 'Chard Bunched 12ct', 'Acelga Manojo 12ct', 'Leafy Greens', 'Swiss Chard, Rainbow', 'Acelga, Arcoiris', 'Mexico', 'Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '12 bunches', false, true, 'Chard', true, 7),
('CLT-30', 'Collard Greens 30ct', 'Berza 30ct', 'Leafy Greens', 'Collard', 'Berza', 'Mexico', 'Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '30 bunches', false, true, 'Collards', true, 7),

-- ═══════════════════════════════════════════════════════════════
-- CUCUMBERS (15 SKUs)
-- ═══════════════════════════════════════════════════════════════
('CUC-SLC-24', 'Slicer Cucumber 24ct', 'Pepino Americano 24ct', 'Cucumbers', 'Slicer/American', 'Americano', 'Mexico', 'Sinaloa, Sonora, Baja California', 'Year-round', 'Todo el ano', 'case', '24ct', false, true, 'Cucumbers', true, 10),
('CUC-SLC-36', 'Slicer Cucumber 36ct', 'Pepino Americano 36ct', 'Cucumbers', 'Slicer/American', 'Americano', 'Mexico', 'Sinaloa, Sonora', 'Year-round', 'Todo el ano', 'case', '36ct', false, true, 'Cucumbers', true, 10),
('CUC-PER-BU', 'Persian Cucumber Bushel', 'Pepino Persa Bushel', 'Cucumbers', 'Persian/Mini', 'Persa/Mini', 'Mexico', 'Sinaloa, Baja California', 'Year-round', 'Todo el ano', 'bushel', '20lb', true, true, 'Cucumbers', true, 10),
('CUC-PER-12', 'Persian Cucumber 12x1lb', 'Pepino Persa 12x1lb', 'Cucumbers', 'Persian', 'Persa', 'Mexico', 'Sinaloa, Baja California', 'Year-round', 'Todo el ano', 'case', '12x1lb', true, true, 'Cucumbers', true, 10),
('CUC-ENG-12', 'English Cucumber 12ct', 'Pepino Ingles 12ct', 'Cucumbers', 'English/European', 'Ingles/Europeo', 'Mexico', 'Sinaloa, Baja California', 'Year-round', 'Todo el ano', 'case', '12ct wrapped', true, true, 'Cucumbers', true, 10),
('CUC-PKL-BU', 'Pickling Cucumber Bushel', 'Pepino para Encurtir Bushel', 'Cucumbers', 'Kirby/Pickling', 'Kirby/Encurtir', 'Mexico', 'Sinaloa, Sonora', 'Year-round', 'Todo el ano', 'bushel', '20lb', false, true, 'Cucumbers', true, 7),
('CUC-JAP-10', 'Japanese Cucumber 10lb', 'Pepino Japones 10lb', 'Cucumbers', 'Japanese', 'Japones', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Cucumbers', true, 10),

-- ═══════════════════════════════════════════════════════════════
-- SQUASH (15 SKUs)
-- ═══════════════════════════════════════════════════════════════
('SQU-ZUC-20', 'Zucchini 20lb', 'Calabaza Italiana 20lb', 'Squash', 'Zucchini', 'Italiana', 'Mexico', 'Sinaloa, Sonora, Guanajuato', 'Year-round', 'Todo el ano', 'case', '20lb', true, true, 'Squash', true, 10),
('SQU-ZUC-22', 'Zucchini 22lb', 'Calabaza Italiana 22lb', 'Squash', 'Zucchini', 'Italiana', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '22lb', false, true, 'Squash', true, 10),
('SQU-YEL-20', 'Yellow Squash 20lb', 'Calabaza Amarilla 20lb', 'Squash', 'Yellow Crookneck', 'Amarilla', 'Mexico', 'Sinaloa, Sonora', 'Year-round', 'Todo el ano', 'case', '20lb', true, true, 'Squash', true, 10),
('SQU-GRY-20', 'Grey Squash 20lb', 'Calabaza Gris 20lb', 'Squash', 'Grey/Mexican', 'Gris/Mexicana', 'Mexico', 'Sinaloa, Guanajuato', 'Year-round', 'Todo el ano', 'case', '20lb', false, true, 'Squash', true, 10),
('SQU-TAT-20', 'Tatume Squash 20lb', 'Calabaza Tatume 20lb', 'Squash', 'Tatume/Round', 'Tatume/Redonda', 'Mexico', 'Sinaloa, Sonora', 'Year-round', 'Todo el ano', 'case', '20lb', false, true, 'Squash', true, 10),
('SQU-CHY-20', 'Chayote 20lb', 'Chayote 20lb', 'Squash', 'Green, White', 'Verde, Blanco', 'Mexico', 'Veracruz, Michoacan', 'Year-round', 'Todo el ano', 'case', '20lb', false, true, 'Chayote', false, 14),
('SQU-BTN-35', 'Butternut Squash 35lb', 'Calabaza Butternut 35lb', 'Squash', 'Butternut', 'Butternut', 'Mexico', 'Sonora, Guanajuato', 'Sep-Mar', 'Sep-Mar', 'case', '35lb', false, true, 'Squash', false, 30),
('SQU-KAB-35', 'Kabocha Squash 35lb', 'Calabaza Kabocha 35lb', 'Squash', 'Kabocha', 'Kabocha', 'Mexico', 'Sonora', 'Sep-Mar', 'Sep-Mar', 'case', '35lb', false, true, 'Squash', false, 30),
('SQU-SPA-35', 'Spaghetti Squash 35lb', 'Calabaza Spaghetti 35lb', 'Squash', 'Spaghetti', 'Spaghetti', 'Mexico', 'Sonora', 'Sep-Mar', 'Sep-Mar', 'case', '35lb', false, true, 'Squash', false, 30),
('SQU-ACN-35', 'Acorn Squash 35lb', 'Calabaza Bellota 35lb', 'Squash', 'Acorn', 'Bellota', 'Mexico', 'Sonora', 'Sep-Mar', 'Sep-Mar', 'case', '35lb', false, true, 'Squash', false, 30),

-- ═══════════════════════════════════════════════════════════════
-- CITRUS (25 SKUs)
-- ═══════════════════════════════════════════════════════════════
('LIM-40', 'Persian Lime 40lb', 'Limon Persa 40lb', 'Citrus', 'Persian', 'Persa', 'Mexico', 'Veracruz, Oaxaca, Michoacan', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Limes', true, 21),
('LIM-200', 'Persian Lime 200ct', 'Limon Persa 200ct', 'Citrus', 'Persian', 'Persa', 'Mexico', 'Veracruz, Oaxaca', 'Year-round', 'Todo el ano', 'case', '200ct', false, true, 'Limes', true, 21),
('LIM-230', 'Persian Lime 230ct', 'Limon Persa 230ct', 'Citrus', 'Persian', 'Persa', 'Mexico', 'Veracruz', 'Year-round', 'Todo el ano', 'case', '230ct', false, true, 'Limes', true, 21),
('LIM-KEY-10', 'Key Lime 10lb', 'Limon Mexicano 10lb', 'Citrus', 'Key/Mexican', 'Mexicano', 'Mexico', 'Colima, Michoacan', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Limes', true, 14),
('LEM-75', 'Lemon 75ct', 'Limon Amarillo 75ct', 'Citrus', 'Eureka, Lisbon', 'Eureka, Lisbon', 'Mexico', 'Michoacan, Tamaulipas', 'Year-round', 'Todo el ano', 'case', '75ct', false, true, 'Lemons', true, 28),
('LEM-115', 'Lemon 115ct', 'Limon Amarillo 115ct', 'Citrus', 'Eureka', 'Eureka', 'Mexico', 'Michoacan', 'Year-round', 'Todo el ano', 'case', '115ct', false, true, 'Lemons', true, 28),
('LEM-140', 'Lemon 140ct', 'Limon Amarillo 140ct', 'Citrus', 'Eureka', 'Eureka', 'Mexico', 'Michoacan, Tamaulipas', 'Year-round', 'Todo el ano', 'case', '140ct', false, true, 'Lemons', true, 28),
('LEM-165', 'Lemon 165ct', 'Limon Amarillo 165ct', 'Citrus', 'Eureka', 'Eureka', 'Mexico', 'Michoacan', 'Year-round', 'Todo el ano', 'case', '165ct', false, true, 'Lemons', true, 28),
('LEM-200', 'Lemon 200ct', 'Limon Amarillo 200ct', 'Citrus', 'Eureka', 'Eureka', 'Mexico', 'Michoacan', 'Year-round', 'Todo el ano', 'case', '200ct', false, true, 'Lemons', true, 28),
('ORG-56', 'Valencia Orange 56ct', 'Naranja Valencia 56ct', 'Citrus', 'Valencia', 'Valencia', 'Mexico', 'Sonora, Veracruz', 'Dec-Jun', 'Dic-Jun', 'case', '56ct', false, true, 'Oranges', true, 28),
('ORG-72', 'Valencia Orange 72ct', 'Naranja Valencia 72ct', 'Citrus', 'Valencia', 'Valencia', 'Mexico', 'Sonora, Veracruz', 'Dec-Jun', 'Dic-Jun', 'case', '72ct', false, true, 'Oranges', true, 28),
('ORG-88', 'Navel Orange 88ct', 'Naranja Navel 88ct', 'Citrus', 'Navel', 'Navel', 'Mexico', 'Sonora', 'Nov-Apr', 'Nov-Abr', 'case', '88ct', true, true, 'Oranges', true, 28),
('ORG-NAR-40', 'Sour Orange 40lb', 'Naranja Agria 40lb', 'Citrus', 'Seville/Sour', 'Agria/Sevilla', 'Mexico', 'Yucatan, Veracruz', 'Dec-Apr', 'Dic-Abr', 'case', '40lb', false, true, 'Oranges', true, 21),
('GRF-32', 'Grapefruit 32ct', 'Toronja 32ct', 'Citrus', 'Ruby Red', 'Rubi Roja', 'Mexico', 'Sonora, Veracruz', 'Nov-May', 'Nov-May', 'case', '32ct', false, true, 'Grapefruit', true, 28),
('GRF-40', 'Grapefruit 40ct', 'Toronja 40ct', 'Citrus', 'Ruby Red, White', 'Rubi Roja, Blanca', 'Mexico', 'Sonora, Veracruz', 'Nov-May', 'Nov-May', 'case', '40ct', false, true, 'Grapefruit', true, 28),
('MND-25', 'Mandarin 25lb', 'Mandarina 25lb', 'Citrus', 'Clementine, W. Murcott', 'Clementina, W. Murcott', 'Mexico', 'Sonora, Nuevo Leon', 'Nov-Mar', 'Nov-Mar', 'case', '25lb', false, true, 'Mandarins', true, 21),
('TNG-40', 'Tangerine 40lb', 'Tangerina 40lb', 'Citrus', 'Tangerine', 'Tangerina', 'Mexico', 'Sonora', 'Nov-Mar', 'Nov-Mar', 'case', '40lb', false, true, 'Tangerines', true, 21),

-- ═══════════════════════════════════════════════════════════════
-- TROPICAL (35 SKUs)
-- ═══════════════════════════════════════════════════════════════
('MNG-K-8', 'Mango Kent 8ct', 'Mango Kent 8ct', 'Tropical', 'Kent', 'Kent', 'Mexico', 'Sinaloa, Nayarit, Chiapas', 'Apr-Aug', 'Abr-Ago', 'case', '8ct', false, true, 'Mangoes', true, 14),
('MNG-K-9', 'Mango Kent 9ct', 'Mango Kent 9ct', 'Tropical', 'Kent', 'Kent', 'Mexico', 'Sinaloa, Nayarit', 'Apr-Aug', 'Abr-Ago', 'case', '9ct', false, true, 'Mangoes', true, 14),
('MNG-K-10', 'Mango Kent 10ct', 'Mango Kent 10ct', 'Tropical', 'Kent', 'Kent', 'Mexico', 'Sinaloa, Nayarit, Chiapas', 'Apr-Aug', 'Abr-Ago', 'case', '10ct', false, true, 'Mangoes', true, 14),
('MNG-K-12', 'Mango Kent 12ct', 'Mango Kent 12ct', 'Tropical', 'Kent', 'Kent', 'Mexico', 'Nayarit, Guerrero', 'Apr-Aug', 'Abr-Ago', 'case', '12ct', false, true, 'Mangoes', true, 14),
('MNG-AT-12', 'Mango Ataulfo 12ct', 'Mango Ataulfo 12ct', 'Tropical', 'Ataulfo/Honey', 'Ataulfo/Honey', 'Mexico', 'Chiapas, Oaxaca, Guerrero', 'Mar-Jul', 'Mar-Jul', 'case', '12ct', false, true, 'Mangoes', true, 10),
('MNG-AT-14', 'Mango Ataulfo 14ct', 'Mango Ataulfo 14ct', 'Tropical', 'Ataulfo', 'Ataulfo', 'Mexico', 'Chiapas, Oaxaca', 'Mar-Jul', 'Mar-Jul', 'case', '14ct', false, true, 'Mangoes', true, 10),
('MNG-TM-10', 'Mango Tommy Atkins 10ct', 'Mango Tommy Atkins 10ct', 'Tropical', 'Tommy Atkins', 'Tommy Atkins', 'Mexico', 'Sinaloa, Nayarit', 'Apr-Aug', 'Abr-Ago', 'case', '10ct', false, true, 'Mangoes', true, 14),
('MNG-KT-10', 'Mango Keitt 10ct', 'Mango Keitt 10ct', 'Tropical', 'Keitt', 'Keitt', 'Mexico', 'Oaxaca, Chiapas', 'Jul-Sep', 'Jul-Sep', 'case', '10ct', false, true, 'Mangoes', true, 14),
('MNG-PER-10', 'Mango Kent Peru 10ct', 'Mango Kent Peru 10ct', 'Tropical', 'Kent', 'Kent', 'Peru', 'Piura, Lambayeque', 'Dec-Mar', 'Dic-Mar', 'case', '10ct', false, true, 'Mangoes', true, 16),
('MNG-ECU-10', 'Mango Ecuador 10ct', 'Mango Ecuador 10ct', 'Tropical', 'Tommy Atkins, Kent', 'Tommy Atkins, Kent', 'Ecuador', 'Guayas, El Oro', 'Oct-Jan', 'Oct-Ene', 'case', '10ct', false, true, 'Mangoes', true, 16),
('MNG-GT-10', 'Mango Guatemala 10ct', 'Mango Guatemala 10ct', 'Tropical', 'Tommy, Kent', 'Tommy, Kent', 'Guatemala', 'Escuintla, Retalhuleu', 'Mar-Jun', 'Mar-Jun', 'case', '10ct', false, true, 'Mangoes', true, 14),
('PAP-MAR-30', 'Papaya Maradol 30lb', 'Papaya Maradol 30lb', 'Tropical', 'Maradol', 'Maradol', 'Mexico', 'Chiapas, Veracruz, Oaxaca, Colima', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Papayas', true, 10),
('PAP-MAR-35', 'Papaya Maradol 35lb', 'Papaya Maradol 35lb', 'Tropical', 'Maradol', 'Maradol', 'Mexico', 'Chiapas, Veracruz', 'Year-round', 'Todo el ano', 'case', '35lb', false, true, 'Papayas', true, 10),
('PAP-VEG-30', 'Papaya Vegas 30lb', 'Papaya Vegas 30lb', 'Tropical', 'Vegas', 'Vegas', 'Mexico', 'Oaxaca, Colima', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Papayas', true, 10),
('PAP-TAI-30', 'Papaya Tainung 30lb', 'Papaya Tainung 30lb', 'Tropical', 'Tainung/Formosa', 'Tainung/Formosa', 'Mexico', 'Chiapas', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Papayas', true, 10),
('PAP-GT-30', 'Papaya Guatemala 30lb', 'Papaya Guatemala 30lb', 'Tropical', 'Maradol', 'Maradol', 'Guatemala', 'Escuintla, Suchitepequez', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Papayas', true, 12),
('PIN-8', 'Pineapple 8ct', 'Pina 8ct', 'Tropical', 'MD-2/Golden', 'MD-2/Golden', 'Mexico', 'Veracruz, Oaxaca, Tabasco', 'Year-round', 'Todo el ano', 'case', '8ct', false, true, 'Pineapples', true, 14),
('PIN-7', 'Pineapple 7ct', 'Pina 7ct', 'Tropical', 'MD-2/Golden', 'MD-2/Golden', 'Mexico', 'Veracruz, Oaxaca', 'Year-round', 'Todo el ano', 'case', '7ct', false, true, 'Pineapples', true, 14),
('PIN-CR-8', 'Pineapple Costa Rica 8ct', 'Pina Costa Rica 8ct', 'Tropical', 'MD-2/Golden', 'MD-2/Golden', 'Costa Rica', 'San Carlos, Puntarenas', 'Year-round', 'Todo el ano', 'case', '8ct', false, true, 'Pineapples', true, 16),
('BAN-40', 'Banana 40lb', 'Platano 40lb', 'Tropical', 'Cavendish', 'Cavendish', 'Mexico', 'Chiapas, Tabasco', 'Year-round', 'Todo el ano', 'case', '40lb', true, true, 'Bananas', true, 10),
('BAN-PL-50', 'Plantain 50lb', 'Platano Macho 50lb', 'Tropical', 'Plantain/Macho', 'Macho', 'Mexico', 'Chiapas, Tabasco, Veracruz', 'Year-round', 'Todo el ano', 'case', '50lb', false, true, 'Plantains', true, 14),
('BAN-MZ-40', 'Baby Banana 40lb', 'Platano Dominico 40lb', 'Tropical', 'Dominico/Lady Finger', 'Dominico', 'Mexico', 'Chiapas, Tabasco', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Bananas', true, 7),
('COC-20', 'Coconut 20ct', 'Coco 20ct', 'Tropical', 'Brown/Peludo', 'Peludo', 'Mexico', 'Colima, Guerrero, Tabasco', 'Year-round', 'Todo el ano', 'sack', '20ct', false, true, 'Coconuts', false, 30),
('COC-25', 'Coconut 25ct', 'Coco 25ct', 'Tropical', 'Brown/Peludo', 'Peludo', 'Mexico', 'Colima, Guerrero', 'Year-round', 'Todo el ano', 'sack', '25ct', false, true, 'Coconuts', false, 30),
('COC-YNG-12', 'Young Coconut 12ct', 'Coco Joven 12ct', 'Tropical', 'Young/Thai', 'Joven', 'Mexico', 'Colima, Tabasco', 'Year-round', 'Todo el ano', 'case', '12ct', false, true, 'Coconuts', true, 14),
('JFR-EA', 'Jackfruit Each', 'Jack Fruit Pieza', 'Tropical', 'Whole', 'Entero', 'Mexico', 'Nayarit, Jalisco', 'Apr-Sep', 'Abr-Sep', 'piece', 'each', false, true, 'Jackfruit', true, 7),
('GUA-10', 'Guava 10lb', 'Guayaba 10lb', 'Tropical', 'Pink, White', 'Rosa, Blanca', 'Mexico', 'Aguascalientes, Michoacan, Zacatecas', 'Oct-Mar', 'Oct-Mar', 'case', '10lb', false, true, 'Guavas', true, 7),
('GUA-20', 'Guava 20lb', 'Guayaba 20lb', 'Tropical', 'Pink', 'Rosa', 'Mexico', 'Aguascalientes, Michoacan', 'Oct-Mar', 'Oct-Mar', 'case', '20lb', false, true, 'Guavas', true, 7),
('PSF-12', 'Passion Fruit 12ct', 'Maracuya 12ct', 'Tropical', 'Purple, Yellow', 'Morada, Amarilla', 'Colombia', 'Huila, Valle del Cauca', 'Year-round', 'Todo el ano', 'case', '12ct', false, true, 'Passion Fruit', true, 7),
('DRG-8', 'Dragon Fruit 8ct', 'Pitahaya 8ct', 'Tropical', 'Red, White', 'Roja, Blanca', 'Mexico', 'Jalisco, Quintana Roo, Yucatan', 'Jun-Oct', 'Jun-Oct', 'case', '8ct', false, true, 'Dragon Fruit', true, 7),
('LYC-12', 'Lychee 12x1lb', 'Lichi 12x1lb', 'Tropical', 'Lychee', 'Lichi', 'Mexico', 'Sinaloa, Puebla', 'May-Jul', 'May-Jul', 'case', '12x1lb', false, true, 'Lychee', true, 5),
('RAM-10', 'Rambutan 10lb', 'Rambutan 10lb', 'Tropical', 'Rambutan', 'Rambutan', 'Mexico', 'Chiapas, Tabasco', 'Aug-Oct', 'Ago-Oct', 'case', '10lb', false, true, 'Rambutan', true, 5),

-- ═══════════════════════════════════════════════════════════════
-- ONIONS & GARLIC (20 SKUs)
-- ═══════════════════════════════════════════════════════════════
('ONI-YEL-25', 'Yellow Onion 25lb', 'Cebolla Amarilla 25lb', 'Onions', 'Yellow', 'Amarilla', 'Mexico', 'Chihuahua, Tamaulipas, Baja California', 'May-Aug', 'May-Ago', 'sack', '25lb', true, true, 'Onions', true, 30),
('ONI-YEL-40', 'Yellow Onion 40lb', 'Cebolla Amarilla 40lb', 'Onions', 'Yellow', 'Amarilla', 'Mexico', 'Chihuahua, Tamaulipas', 'May-Aug', 'May-Ago', 'sack', '40lb', false, true, 'Onions', true, 30),
('ONI-YEL-50', 'Yellow Onion 50lb', 'Cebolla Amarilla 50lb', 'Onions', 'Yellow', 'Amarilla', 'Mexico', 'Chihuahua', 'May-Aug', 'May-Ago', 'sack', '50lb', false, true, 'Onions', true, 30),
('ONI-WHT-25', 'White Onion 25lb', 'Cebolla Blanca 25lb', 'Onions', 'White', 'Blanca', 'Mexico', 'Chihuahua, Tamaulipas, Puebla', 'May-Aug', 'May-Ago', 'sack', '25lb', false, true, 'Onions', true, 30),
('ONI-WHT-40', 'White Onion 40lb', 'Cebolla Blanca 40lb', 'Onions', 'White', 'Blanca', 'Mexico', 'Chihuahua', 'May-Aug', 'May-Ago', 'sack', '40lb', false, true, 'Onions', true, 30),
('ONI-RED-25', 'Red Onion 25lb', 'Cebolla Morada 25lb', 'Onions', 'Red/Purple', 'Morada', 'Mexico', 'Chihuahua, Baja California', 'May-Aug', 'May-Ago', 'sack', '25lb', true, true, 'Onions', true, 30),
('ONI-RED-40', 'Red Onion 40lb', 'Cebolla Morada 40lb', 'Onions', 'Red/Purple', 'Morada', 'Mexico', 'Chihuahua', 'May-Aug', 'May-Ago', 'sack', '40lb', false, true, 'Onions', true, 30),
('ONI-GRN-48', 'Green Onion 48ct', 'Cebollita Cambray 48ct', 'Onions', 'Green/Scallion', 'Cambray', 'Mexico', 'Baja California, Puebla', 'Year-round', 'Todo el ano', 'case', '48 bunches', false, true, 'Green Onions', true, 7),
('ONI-SW-40', 'Sweet Onion 40lb', 'Cebolla Dulce 40lb', 'Onions', 'Sweet/Vidalia type', 'Dulce', 'Mexico', 'Tamaulipas', 'Apr-Jun', 'Abr-Jun', 'sack', '40lb', false, true, 'Onions', true, 21),
('ONI-PRL-5', 'Pearl Onion 5lb', 'Cebollita Perla 5lb', 'Onions', 'Pearl/Cipollini', 'Perla/Cipollini', 'Mexico', 'Guanajuato', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Onions', true, 21),
('SHL-5', 'Shallot 5lb', 'Chalota 5lb', 'Onions', 'Shallot', 'Chalota', 'Mexico', 'Guanajuato, Baja California', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Shallots', true, 30),
('GAR-WHT-30', 'White Garlic 30lb', 'Ajo Blanco 30lb', 'Onions', 'White', 'Blanco', 'Mexico', 'Guanajuato, Zacatecas, Aguascalientes', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Garlic', false, 60),
('GAR-PRP-30', 'Purple Garlic 30lb', 'Ajo Morado 30lb', 'Onions', 'Purple', 'Morado', 'Mexico', 'Guanajuato, Zacatecas', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Garlic', false, 60),
('GAR-BLK-5', 'Black Garlic 5lb', 'Ajo Negro 5lb', 'Onions', 'Black/Fermented', 'Negro/Fermentado', 'Mexico', 'Guanajuato', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Garlic', false, 90),
('GAR-ELP-1', 'Elephant Garlic 1lb', 'Ajo Elefante 1lb', 'Onions', 'Elephant', 'Elefante', 'Mexico', 'Guanajuato', 'Year-round', 'Todo el ano', 'case', '10x1lb', false, true, 'Garlic', false, 60),

-- ═══════════════════════════════════════════════════════════════
-- MELONS (15 SKUs)
-- ═══════════════════════════════════════════════════════════════
('WAT-SDG-EA', 'Seedless Watermelon Each', 'Sandia sin Semilla Pieza', 'Melons', 'Seedless', 'Sin semilla', 'Mexico', 'Sonora, Jalisco, Chihuahua', 'Apr-Oct', 'Abr-Oct', 'bin', 'each', false, true, 'Watermelons', true, 14),
('WAT-SDG-3', 'Seedless Watermelon 3ct', 'Sandia sin Semilla 3ct', 'Melons', 'Seedless', 'Sin semilla', 'Mexico', 'Sonora, Jalisco', 'Apr-Oct', 'Abr-Oct', 'bin', '3ct', false, true, 'Watermelons', true, 14),
('WAT-SDG-5', 'Seedless Watermelon 5ct', 'Sandia sin Semilla 5ct', 'Melons', 'Seedless', 'Sin semilla', 'Mexico', 'Sonora, Jalisco', 'Apr-Oct', 'Abr-Oct', 'bin', '5ct', false, true, 'Watermelons', true, 14),
('WAT-MIN-6', 'Mini Watermelon 6ct', 'Sandia Mini 6ct', 'Melons', 'Mini/Personal', 'Mini/Personal', 'Mexico', 'Sonora, Jalisco', 'Apr-Oct', 'Abr-Oct', 'case', '6ct', false, true, 'Watermelons', true, 14),
('WAT-YEL-EA', 'Yellow Watermelon Each', 'Sandia Amarilla Pieza', 'Melons', 'Yellow Flesh', 'Amarilla', 'Mexico', 'Sonora', 'May-Sep', 'May-Sep', 'bin', 'each', false, true, 'Watermelons', true, 14),
('CAN-9', 'Cantaloupe 9ct', 'Melon Cantaloupe 9ct', 'Melons', 'Western', 'Occidental', 'Mexico', 'Sonora, Durango, Coahuila', 'Apr-Oct', 'Abr-Oct', 'case', '9ct', false, true, 'Cantaloupes', true, 10),
('CAN-12', 'Cantaloupe 12ct', 'Melon Cantaloupe 12ct', 'Melons', 'Western', 'Occidental', 'Mexico', 'Sonora, Durango', 'Apr-Oct', 'Abr-Oct', 'case', '12ct', false, true, 'Cantaloupes', true, 10),
('CAN-15', 'Cantaloupe 15ct', 'Melon Cantaloupe 15ct', 'Melons', 'Western', 'Occidental', 'Mexico', 'Sonora', 'Apr-Oct', 'Abr-Oct', 'case', '15ct', false, true, 'Cantaloupes', true, 10),
('HON-5', 'Honeydew 5ct', 'Melon Chino 5ct', 'Melons', 'Green Flesh', 'Verde', 'Mexico', 'Sonora, Durango, Coahuila', 'May-Oct', 'May-Oct', 'case', '5ct', false, true, 'Honeydew', true, 14),
('HON-6', 'Honeydew 6ct', 'Melon Chino 6ct', 'Melons', 'Green Flesh', 'Verde', 'Mexico', 'Sonora, Durango', 'May-Oct', 'May-Oct', 'case', '6ct', false, true, 'Honeydew', true, 14),
('HON-8', 'Honeydew 8ct', 'Melon Chino 8ct', 'Melons', 'Green Flesh', 'Verde', 'Mexico', 'Sonora', 'May-Oct', 'May-Oct', 'case', '8ct', false, true, 'Honeydew', true, 14),
('GAL-5', 'Galia Melon 5ct', 'Melon Galia 5ct', 'Melons', 'Galia', 'Galia', 'Mexico', 'Sonora', 'May-Sep', 'May-Sep', 'case', '5ct', false, true, 'Honeydew', true, 10),
('CRW-6', 'Crenshaw Melon 6ct', 'Melon Crenshaw 6ct', 'Melons', 'Crenshaw', 'Crenshaw', 'Mexico', 'Sonora', 'Jun-Sep', 'Jun-Sep', 'case', '6ct', false, true, 'Melons', true, 10),
('CAS-6', 'Casaba Melon 6ct', 'Melon Casaba 6ct', 'Melons', 'Casaba', 'Casaba', 'Mexico', 'Sonora', 'Jun-Oct', 'Jun-Oct', 'case', '6ct', false, true, 'Melons', true, 14),

-- ═══════════════════════════════════════════════════════════════
-- GRAPES (12 SKUs)
-- ═══════════════════════════════════════════════════════════════
('GRP-RED-18', 'Red Seedless Grapes 18lb', 'Uva Roja sin Semilla 18lb', 'Grapes', 'Red Seedless (Flame, Crimson)', 'Roja sin Semilla', 'Mexico', 'Sonora, Baja California', 'May-Aug', 'May-Ago', 'case', '18lb', false, true, 'Grapes', true, 14),
('GRP-RED-19', 'Red Seedless Grapes 19lb', 'Uva Roja sin Semilla 19lb', 'Grapes', 'Red Seedless', 'Roja sin Semilla', 'Mexico', 'Sonora', 'May-Aug', 'May-Ago', 'case', '19lb', false, true, 'Grapes', true, 14),
('GRP-GRN-18', 'Green Seedless Grapes 18lb', 'Uva Verde sin Semilla 18lb', 'Grapes', 'Green Seedless (Thompson)', 'Verde sin Semilla', 'Mexico', 'Sonora, Baja California', 'May-Aug', 'May-Ago', 'case', '18lb', false, true, 'Grapes', true, 14),
('GRP-GRN-19', 'Green Seedless Grapes 19lb', 'Uva Verde sin Semilla 19lb', 'Grapes', 'Green Seedless', 'Verde sin Semilla', 'Mexico', 'Sonora', 'May-Aug', 'May-Ago', 'case', '19lb', false, true, 'Grapes', true, 14),
('GRP-BLK-18', 'Black Seedless Grapes 18lb', 'Uva Negra sin Semilla 18lb', 'Grapes', 'Black Seedless (Autumn Royal)', 'Negra sin Semilla', 'Mexico', 'Sonora', 'May-Aug', 'May-Ago', 'case', '18lb', false, true, 'Grapes', true, 14),
('GRP-CTN-9', 'Cotton Candy Grapes 9x1lb', 'Uva Cotton Candy 9x1lb', 'Grapes', 'Cotton Candy', 'Cotton Candy', 'Mexico', 'Sonora', 'Jun-Aug', 'Jun-Ago', 'case', '9x1lb', false, true, 'Grapes', true, 10),
('GRP-PER-18', 'Grapes Peru 18lb', 'Uva Peru 18lb', 'Grapes', 'Red Globe, Crimson', 'Red Globe, Crimson', 'Peru', 'Ica, Piura', 'Nov-Mar', 'Nov-Mar', 'case', '18lb', false, true, 'Grapes', true, 18),
('GRP-CHL-18', 'Grapes Chile 18lb', 'Uva Chile 18lb', 'Grapes', 'Red, Green, Black', 'Roja, Verde, Negra', 'Chile', 'Atacama, Coquimbo', 'Dec-Apr', 'Dic-Abr', 'case', '18lb', false, true, 'Grapes', true, 18),

-- ═══════════════════════════════════════════════════════════════
-- CRUCIFEROUS & BRASSICA (20 SKUs)
-- ═══════════════════════════════════════════════════════════════
('BRC-14', 'Broccoli Crowns 14ct', 'Brocoli Corona 14ct', 'Cruciferous', 'Crown', 'Corona', 'Mexico', 'Guanajuato, Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '14ct', true, true, 'Broccoli', true, 10),
('BRC-18', 'Broccoli Bunched 18ct', 'Brocoli Manojo 18ct', 'Cruciferous', 'Bunched', 'Manojo', 'Mexico', 'Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '18ct', false, true, 'Broccoli', true, 10),
('BRC-FLR-3', 'Broccoli Florets 3lb', 'Brocoli Florete 3lb', 'Cruciferous', 'Florets', 'Floretes', 'Mexico', 'Guanajuato, Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '4x3lb', true, true, 'Broccoli', true, 7),
('CAU-12', 'Cauliflower 12ct', 'Coliflor 12ct', 'Cruciferous', 'White', 'Blanca', 'Mexico', 'Guanajuato, Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '12ct', true, true, 'Cauliflower', true, 10),
('CAU-GRN-12', 'Green Cauliflower 12ct', 'Coliflor Verde 12ct', 'Cruciferous', 'Green/Romanesco', 'Verde/Romanesco', 'Mexico', 'Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '12ct', false, true, 'Cauliflower', true, 10),
('CAB-GRN-50', 'Green Cabbage 50lb', 'Col Verde 50lb', 'Cruciferous', 'Green', 'Verde', 'Mexico', 'Guanajuato, Puebla', 'Year-round', 'Todo el ano', 'sack', '50lb', false, true, 'Cabbage', true, 21),
('CAB-RED-50', 'Red Cabbage 50lb', 'Col Morada 50lb', 'Cruciferous', 'Red/Purple', 'Morada', 'Mexico', 'Guanajuato', 'Year-round', 'Todo el ano', 'sack', '50lb', false, true, 'Cabbage', true, 21),
('CAB-NAP-24', 'Napa Cabbage 24ct', 'Col China 24ct', 'Cruciferous', 'Napa/Chinese', 'China', 'Mexico', 'Guanajuato, Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '24ct', false, true, 'Cabbage', true, 14),
('BRS-25', 'Brussels Sprouts 25lb', 'Col de Bruselas 25lb', 'Cruciferous', 'Conventional, Organic', 'Convencional, Organica', 'Mexico', 'Guanajuato, Baja California', 'Year-round', 'Todo el ano', 'case', '25lb', true, true, 'Brussels Sprouts', true, 14),
('BOK-12', 'Bok Choy 12ct', 'Bok Choy 12ct', 'Cruciferous', 'Regular, Baby', 'Regular, Baby', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '12ct', false, true, 'Bok Choy', true, 7),

-- ═══════════════════════════════════════════════════════════════
-- ROOT VEGETABLES (20 SKUs)
-- ═══════════════════════════════════════════════════════════════
('CAR-25', 'Carrots 25lb', 'Zanahoria 25lb', 'Root Vegetables', 'Jumbo, US #1', 'Jumbo', 'Mexico', 'Guanajuato, Puebla', 'Year-round', 'Todo el ano', 'sack', '25lb', true, true, 'Carrots', true, 21),
('CAR-50', 'Carrots 50lb', 'Zanahoria 50lb', 'Root Vegetables', 'Jumbo', 'Jumbo', 'Mexico', 'Guanajuato', 'Year-round', 'Todo el ano', 'sack', '50lb', false, true, 'Carrots', true, 21),
('CAR-BBY-4', 'Baby Carrots 4x5lb', 'Zanahoria Baby 4x5lb', 'Root Vegetables', 'Baby Cut', 'Baby', 'Mexico', 'Guanajuato', 'Year-round', 'Todo el ano', 'case', '4x5lb', true, true, 'Carrots', true, 14),
('RAD-30', 'Radish 30ct', 'Rabano 30ct', 'Root Vegetables', 'Red, White Tip', 'Rojo', 'Mexico', 'Guanajuato, Puebla', 'Year-round', 'Todo el ano', 'case', '30 bunches', false, true, 'Radishes', true, 10),
('RAD-DAI-12', 'Daikon Radish 12ct', 'Rabano Daikon 12ct', 'Root Vegetables', 'Daikon', 'Daikon', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '12ct', false, true, 'Radishes', true, 14),
('JIC-40', 'Jicama 40lb', 'Jicama 40lb', 'Root Vegetables', 'Conventional', 'Convencional', 'Mexico', 'Nayarit, Guanajuato, Jalisco', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Jicama', false, 30),
('GIN-30', 'Ginger 30lb', 'Jengibre 30lb', 'Root Vegetables', 'Conventional', 'Convencional', 'Mexico', 'Veracruz, Oaxaca', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Ginger', false, 30),
('TUR-5', 'Turmeric 5lb', 'Curcuma 5lb', 'Root Vegetables', 'Fresh Root', 'Raiz Fresca', 'Mexico', 'Oaxaca', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Turmeric', false, 21),
('BET-25', 'Beets 25lb', 'Betabel 25lb', 'Root Vegetables', 'Red, Gold', 'Rojo, Dorado', 'Mexico', 'Guanajuato, Puebla', 'Year-round', 'Todo el ano', 'case', '25lb', true, true, 'Beets', true, 21),
('TRN-25', 'Turnip 25lb', 'Nabo 25lb', 'Root Vegetables', 'White, Purple Top', 'Blanco', 'Mexico', 'Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '25lb', false, true, 'Turnips', true, 14),
('CAS-40', 'Cassava/Yuca 40lb', 'Yuca 40lb', 'Root Vegetables', 'Cassava', 'Yuca', 'Mexico', 'Tabasco, Veracruz', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Cassava', false, 14),
('SWP-40', 'Sweet Potato 40lb', 'Camote 40lb', 'Root Vegetables', 'Orange, Japanese', 'Naranja, Japones', 'Mexico', 'Guanajuato, Michoacan', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Sweet Potatoes', true, 30),
('POT-50', 'White Potato 50lb', 'Papa Blanca 50lb', 'Root Vegetables', 'White, Russet', 'Blanca', 'Mexico', 'Sinaloa, Sonora', 'Year-round', 'Todo el ano', 'sack', '50lb', false, true, 'Potatoes', false, 30),

-- ═══════════════════════════════════════════════════════════════
-- HERBS & SPECIALTY (40 SKUs)
-- ═══════════════════════════════════════════════════════════════
('CIL-30', 'Cilantro 30ct', 'Cilantro 30ct', 'Herbs', 'Conventional', 'Convencional', 'Mexico', 'Baja California, Puebla, Guanajuato', 'Year-round', 'Todo el ano', 'case', '30 bunches', true, true, 'Cilantro', true, 7),
('CIL-60', 'Cilantro 60ct', 'Cilantro 60ct', 'Herbs', 'Conventional', 'Convencional', 'Mexico', 'Baja California, Puebla', 'Year-round', 'Todo el ano', 'case', '60 bunches', false, true, 'Cilantro', true, 7),
('PRS-30', 'Parsley Flat 30ct', 'Perejil Plano 30ct', 'Herbs', 'Italian Flat', 'Plano Italiano', 'Mexico', 'Baja California, Puebla', 'Year-round', 'Todo el ano', 'case', '30 bunches', false, true, 'Parsley', true, 7),
('PRS-CRL-30', 'Parsley Curly 30ct', 'Perejil Rizado 30ct', 'Herbs', 'Curly', 'Rizado', 'Mexico', 'Baja California', 'Year-round', 'Todo el ano', 'case', '30 bunches', false, true, 'Parsley', true, 7),
('BSL-12', 'Basil 12ct', 'Albahaca 12ct', 'Herbs', 'Sweet, Genovese', 'Dulce, Genovesa', 'Mexico', 'Baja California', 'Year-round', 'Todo el ano', 'case', '12 clamshells', true, true, 'Basil', true, 5),
('MNT-12', 'Mint 12ct', 'Menta 12ct', 'Herbs', 'Spearmint, Peppermint', 'Hierbabuena, Menta', 'Mexico', 'Puebla, Baja California', 'Year-round', 'Todo el ano', 'case', '12 bunches', false, true, 'Mint', true, 5),
('DLL-12', 'Dill 12ct', 'Eneldo 12ct', 'Herbs', 'Fresh Dill', 'Eneldo Fresco', 'Mexico', 'Baja California', 'Year-round', 'Todo el ano', 'case', '12 bunches', false, true, 'Dill', true, 5),
('RSM-12', 'Rosemary 12ct', 'Romero 12ct', 'Herbs', 'Fresh Rosemary', 'Romero Fresco', 'Mexico', 'Baja California', 'Year-round', 'Todo el ano', 'case', '12 clamshells', false, true, 'Rosemary', true, 10),
('THY-12', 'Thyme 12ct', 'Tomillo 12ct', 'Herbs', 'Fresh Thyme', 'Tomillo Fresco', 'Mexico', 'Baja California', 'Year-round', 'Todo el ano', 'case', '12 clamshells', false, true, 'Thyme', true, 7),
('ORG-12', 'Oregano Fresh 12ct', 'Oregano Fresco 12ct', 'Herbs', 'Mexican Oregano', 'Oregano Mexicano', 'Mexico', 'Baja California, Oaxaca', 'Year-round', 'Todo el ano', 'case', '12 bunches', false, true, 'Oregano', true, 7),
('EPZ-30', 'Epazote 30ct', 'Epazote 30ct', 'Herbs', 'Epazote', 'Epazote', 'Mexico', 'Puebla, Oaxaca', 'Year-round', 'Todo el ano', 'case', '30 bunches', false, true, 'Herbs', true, 5),
('HPJ-30', 'Hoja Santa 30ct', 'Hoja Santa 30ct', 'Herbs', 'Hoja Santa/Acuyo', 'Hoja Santa/Acuyo', 'Mexico', 'Veracruz, Oaxaca', 'Year-round', 'Todo el ano', 'case', '30 leaves', false, true, 'Herbs', true, 5),
('LMG-5', 'Lemongrass 5lb', 'Zacate Limon 5lb', 'Herbs', 'Lemongrass', 'Zacate Limon', 'Mexico', 'Veracruz', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Herbs', true, 10),
('NOP-10', 'Nopales Fresh 10lb', 'Nopales Frescos 10lb', 'Specialty', 'Fresh Paddles', 'Pencas Frescas', 'Mexico', 'Milpa Alta, Tlalnepantla, Puebla', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Cactus Pads', true, 10),
('NOP-20', 'Nopales Fresh 20lb', 'Nopales Frescos 20lb', 'Specialty', 'Fresh Paddles', 'Pencas Frescas', 'Mexico', 'Milpa Alta, Puebla', 'Year-round', 'Todo el ano', 'case', '20lb', false, true, 'Cactus Pads', true, 10),
('TUN-20', 'Prickly Pear 20lb', 'Tuna 20lb', 'Specialty', 'Red, Green, White', 'Roja, Verde, Blanca', 'Mexico', 'Zacatecas, Puebla, Hidalgo', 'Jul-Oct', 'Jul-Oct', 'case', '20lb', false, true, 'Prickly Pear', true, 10),
('TAM-25', 'Tamarind 25lb', 'Tamarindo 25lb', 'Specialty', 'Fresh Pod', 'Vaina Fresca', 'Mexico', 'Guerrero, Chiapas', 'Feb-Jun', 'Feb-Jun', 'case', '25lb', false, true, 'Tamarind', false, 30),
('HBN-5', 'Banana Leaf 5lb', 'Hoja de Platano 5lb', 'Specialty', 'Banana Leaf', 'Hoja de Platano', 'Mexico', 'Chiapas, Tabasco, Veracruz', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Banana Leaves', true, 7),
('CRN-HK-48', 'Corn Husks Dried 48ct', 'Hoja para Tamal 48ct', 'Specialty', 'Dried Corn Husks', 'Hoja Seca de Maiz', 'Mexico', 'Sinaloa, Jalisco', 'Year-round', 'Todo el ano', 'case', '48 packs', false, true, 'Corn Husks', false, 365),
('FLR-CAL-5', 'Calendula/Cempasuchil 5lb', 'Flor de Cempasuchil 5lb', 'Specialty', 'Marigold', 'Cempasuchil', 'Mexico', 'Puebla, Mexico State', 'Oct-Nov', 'Oct-Nov', 'case', '5lb', false, true, 'Edible Flowers', true, 5),
('FLR-JAM-5', 'Jamaica/Hibiscus Dried 5lb', 'Flor de Jamaica 5lb', 'Specialty', 'Dried Hibiscus', 'Jamaica Seca', 'Mexico', 'Guerrero, Oaxaca', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Hibiscus', false, 365),
('CHI-PQN-2', 'Chile Piquin Fresh 2lb', 'Chile Piquin Fresco 2lb', 'Specialty', 'Piquin', 'Piquin', 'Mexico', 'Sonora, Sinaloa', 'Aug-Nov', 'Ago-Nov', 'case', '2lb', false, true, 'Peppers', true, 7),
('MSH-10', 'Mushrooms White 10lb', 'Champiñones Blancos 10lb', 'Specialty', 'White Button', 'Blanco', 'Mexico', 'Tlaxcala, Puebla', 'Year-round', 'Todo el ano', 'case', '10lb', true, true, 'Mushrooms', true, 7),

-- ═══════════════════════════════════════════════════════════════
-- VEGETABLES - MISC (30 SKUs)
-- ═══════════════════════════════════════════════════════════════
('ASP-11', 'Asparagus 11lb', 'Esparrago 11lb', 'Vegetables', 'Green Standard', 'Verde Estandar', 'Mexico', 'Sonora, Baja California, Guanajuato', 'Jan-May', 'Ene-May', 'case', '11lb', true, true, 'Asparagus', true, 7),
('ASP-28', 'Asparagus 28lb', 'Esparrago 28lb', 'Vegetables', 'Green Jumbo', 'Verde Jumbo', 'Mexico', 'Sonora, Baja California', 'Jan-May', 'Ene-May', 'case', '28lb', false, true, 'Asparagus', true, 7),
('ASP-WHT-11', 'White Asparagus 11lb', 'Esparrago Blanco 11lb', 'Vegetables', 'White', 'Blanco', 'Mexico', 'Sonora', 'Feb-Apr', 'Feb-Abr', 'case', '11lb', false, true, 'Asparagus', true, 5),
('ASP-PER-11', 'Asparagus Peru 11lb', 'Esparrago Peru 11lb', 'Vegetables', 'Green', 'Verde', 'Peru', 'Ica, La Libertad', 'Year-round', 'Todo el ano', 'case', '11lb', true, true, 'Asparagus', true, 10),
('EGG-ITA-25', 'Italian Eggplant 25lb', 'Berenjena Italiana 25lb', 'Vegetables', 'Italian/Globe', 'Italiana/Globo', 'Mexico', 'Sinaloa, Sonora', 'Nov-May', 'Nov-May', 'case', '25lb', false, true, 'Eggplant', true, 10),
('EGG-JAP-10', 'Japanese Eggplant 10lb', 'Berenjena Japonesa 10lb', 'Vegetables', 'Japanese/Chinese', 'Japonesa/China', 'Mexico', 'Sinaloa', 'Nov-May', 'Nov-May', 'case', '10lb', false, true, 'Eggplant', true, 10),
('GRB-25', 'Green Beans 25lb', 'Ejotes 25lb', 'Vegetables', 'Round', 'Redondo', 'Mexico', 'Sinaloa, Sonora, Guanajuato', 'Nov-May', 'Nov-May', 'case', '25lb', false, true, 'Green Beans', true, 7),
('GRB-30', 'Green Beans 30lb', 'Ejotes 30lb', 'Vegetables', 'Round', 'Redondo', 'Mexico', 'Sinaloa', 'Nov-May', 'Nov-May', 'case', '30lb', false, true, 'Green Beans', true, 7),
('GRB-FRN-10', 'French Beans 10lb', 'Ejotes Frances 10lb', 'Vegetables', 'French/Haricot Vert', 'Frances/Haricot', 'Mexico', 'Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '10lb', true, true, 'Green Beans', true, 5),
('GRB-GT-25', 'Green Beans Guatemala 25lb', 'Ejotes Guatemala 25lb', 'Vegetables', 'Round', 'Redondo', 'Guatemala', 'Chimaltenango, Sacatepequez', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Green Beans', true, 7),
('CEL-24', 'Celery 24ct', 'Apio 24ct', 'Vegetables', 'Pascal', 'Pascal', 'Mexico', 'Baja California, Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '24ct', true, true, 'Celery', true, 14),
('CEL-30', 'Celery 30ct', 'Apio 30ct', 'Vegetables', 'Pascal', 'Pascal', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '30ct', false, true, 'Celery', true, 14),
('CEL-HRT-12', 'Celery Hearts 12ct', 'Corazones de Apio 12ct', 'Vegetables', 'Hearts', 'Corazones', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '12x3pk', true, true, 'Celery', true, 10),
('CRN-48', 'Corn 48ct', 'Elote 48ct', 'Vegetables', 'Sweet Corn, Bi-color', 'Elote Dulce', 'Mexico', 'Sinaloa, Jalisco', 'Year-round', 'Todo el ano', 'case', '48 ears', false, true, 'Corn', true, 5),
('OKR-10', 'Okra 10lb', 'Quimbombo 10lb', 'Vegetables', 'Green', 'Verde', 'Mexico', 'Sinaloa', 'Apr-Oct', 'Abr-Oct', 'case', '10lb', false, true, 'Okra', true, 5),
('ART-12', 'Artichoke 12ct', 'Alcachofa 12ct', 'Vegetables', 'Globe', 'Globo', 'Mexico', 'Baja California', 'Mar-May', 'Mar-May', 'case', '12ct', false, true, 'Artichokes', true, 7),
('FEN-12', 'Fennel 12ct', 'Hinojo 12ct', 'Vegetables', 'Florence', 'Florencia', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '12ct', false, true, 'Fennel', true, 10),
('LEK-12', 'Leeks 12ct', 'Puerro 12ct', 'Vegetables', 'Standard', 'Estandar', 'Mexico', 'Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '12 bunches', false, true, 'Leeks', true, 10),
('END-12', 'Endive 12ct', 'Endivia 12ct', 'Vegetables', 'Belgian Endive', 'Endivia Belga', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '12ct', false, true, 'Endive', true, 10),
('RCH-12', 'Radicchio 12ct', 'Radicchio 12ct', 'Vegetables', 'Chioggia', 'Chioggia', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '12ct', false, true, 'Radicchio', true, 10),
('KOH-12', 'Kohlrabi 12ct', 'Colinabo 12ct', 'Vegetables', 'Green, Purple', 'Verde, Morado', 'Mexico', 'Guanajuato', 'Nov-Apr', 'Nov-Abr', 'case', '12ct', false, true, 'Kohlrabi', true, 14),
('PPR-12', 'Pea Pods 12x8oz', 'Vainas de Chicharo 12x8oz', 'Vegetables', 'Snow Peas, Sugar Snap', 'Chino, Sugar Snap', 'Guatemala', 'Chimaltenango, Sacatepequez', 'Year-round', 'Todo el ano', 'case', '12x8oz', false, true, 'Peas', true, 5),
('PPR-GT-10', 'Snow Peas Guatemala 10lb', 'Chicharo Chino Guatemala 10lb', 'Vegetables', 'Snow Peas', 'Chino', 'Guatemala', 'Chimaltenango', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peas', true, 5)
ON CONFLICT (sku) DO NOTHING;

SELECT COUNT(*) AS total_products FROM product_catalog;
SELECT category, COUNT(*) as count FROM product_catalog GROUP BY category ORDER BY count DESC;
-- ═══════════════════════════════════════════════════════════════
-- AUDITDNA PRODUCT CATALOG - PART 2 (250+ MORE)
-- Run AFTER products_500.sql
-- ═══════════════════════════════════════════════════════════════

INSERT INTO product_catalog (sku, product_name, product_name_es, category, varieties, varieties_es, origin_country, origin_regions, seasonality, seasonality_es, unit_type, pack_sizes, organic_available, conventional_available, usda_commodity_name, cold_chain_required, shelf_life_days) VALUES

-- ═══════════════════════════════════════════════════════════════
-- MORE AVOCADOS - LATAM Origins (10)
-- ═══════════════════════════════════════════════════════════════
('AVO-DR-48', 'Hass Avocado 48ct Dominican Rep', 'Aguacate Hass 48ct RD', 'Avocados', 'Hass', 'Hass', 'Dominican Republic', 'San Jose de Ocoa, Constanza', 'Year-round', 'Todo el ano', 'case', '48ct', false, true, 'Avocados', true, 20),
('AVO-DR-60', 'Hass Avocado 60ct Dominican Rep', 'Aguacate Hass 60ct RD', 'Avocados', 'Hass', 'Hass', 'Dominican Republic', 'Jarabacoa, La Vega', 'Year-round', 'Todo el ano', 'case', '60ct', false, true, 'Avocados', true, 20),
('AVO-GT-48', 'Hass Avocado 48ct Guatemala', 'Aguacate Hass 48ct Guatemala', 'Avocados', 'Hass', 'Hass', 'Guatemala', 'San Marcos, Quetzaltenango', 'Year-round', 'Todo el ano', 'case', '48ct', false, true, 'Avocados', true, 22),
('AVO-MX-RIPE-48', 'Hass Avocado Ripe 48ct', 'Aguacate Hass Maduro 48ct', 'Avocados', 'Hass Pre-conditioned', 'Hass Pre-madurado', 'Mexico', 'Michoacan', 'Year-round', 'Todo el ano', 'case', '48ct ripe', true, true, 'Avocados', true, 7),
('AVO-MX-RIPE-60', 'Hass Avocado Ripe 60ct', 'Aguacate Hass Maduro 60ct', 'Avocados', 'Hass Pre-conditioned', 'Hass Pre-madurado', 'Mexico', 'Michoacan', 'Year-round', 'Todo el ano', 'case', '60ct ripe', true, true, 'Avocados', true, 7),
('AVO-ORG-32', 'Organic Hass Avocado 32ct', 'Aguacate Hass Organico 32ct', 'Avocados', 'Hass Organic', 'Hass Organico', 'Mexico', 'Michoacan', 'Year-round', 'Todo el ano', 'case', '32ct', true, false, 'Avocados', true, 21),
('AVO-ORG-40', 'Organic Hass Avocado 40ct', 'Aguacate Hass Organico 40ct', 'Avocados', 'Hass Organic', 'Hass Organico', 'Mexico', 'Michoacan, Jalisco', 'Year-round', 'Todo el ano', 'case', '40ct', true, false, 'Avocados', true, 21),
('AVO-ORG-70', 'Organic Hass Avocado 70ct', 'Aguacate Hass Organico 70ct', 'Avocados', 'Hass Organic', 'Hass Organico', 'Mexico', 'Jalisco', 'Year-round', 'Todo el ano', 'case', '70ct', true, false, 'Avocados', true, 21),
('AVO-ORG-84', 'Organic Hass Avocado 84ct', 'Aguacate Hass Organico 84ct', 'Avocados', 'Hass Organic', 'Hass Organico', 'Mexico', 'Michoacan', 'Year-round', 'Todo el ano', 'case', '84ct', true, false, 'Avocados', true, 21),
('AVO-BRZ-48', 'Hass Avocado 48ct Brazil', 'Aguacate Hass 48ct Brasil', 'Avocados', 'Hass', 'Hass', 'Brazil', 'Sao Paulo, Minas Gerais', 'Mar-Sep', 'Mar-Sep', 'case', '48ct', false, true, 'Avocados', true, 23),

-- ═══════════════════════════════════════════════════════════════
-- MORE BERRIES - Expanded sizes & origins (15)
-- ═══════════════════════════════════════════════════════════════
('STR-ORG-12x1', 'Organic Strawberries 12x1lb', 'Fresas Organicas 12x1lb', 'Berries', 'Organic', 'Organica', 'Mexico', 'Baja California', 'Nov-May', 'Nov-May', 'flat', '12x1lb', true, false, 'Strawberries', true, 6),
('STR-ORG-4x2', 'Organic Strawberries 4x2lb', 'Fresas Organicas 4x2lb', 'Berries', 'Organic', 'Organica', 'Mexico', 'Baja California', 'Nov-May', 'Nov-May', 'flat', '4x2lb', true, false, 'Strawberries', true, 6),
('BLU-4.4-12', 'Blueberries 12x4.4oz', 'Arandanos 12x4.4oz', 'Berries', 'Conventional', 'Convencional', 'Mexico', 'Jalisco', 'Oct-May', 'Oct-May', 'flat', '12x4.4oz', true, true, 'Blueberries', true, 14),
('BLU-ORG-PT', 'Organic Blueberries 12x1pt', 'Arandanos Organicos 12x1pt', 'Berries', 'Organic', 'Organica', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'flat', '12x1pt', true, false, 'Blueberries', true, 14),
('BLU-COL-12x6', 'Blueberries Colombia 12x6oz', 'Arandanos Colombia 12x6oz', 'Berries', 'Conventional', 'Convencional', 'Colombia', 'Cundinamarca, Boyaca', 'Year-round', 'Todo el ano', 'flat', '12x6oz', false, true, 'Blueberries', true, 16),
('RSP-ORG-6x6', 'Organic Raspberries 6x6oz', 'Frambuesas Organicas 6x6oz', 'Berries', 'Organic', 'Organica', 'Mexico', 'Baja California', 'Nov-May', 'Nov-May', 'flat', '6x6oz', true, false, 'Raspberries', true, 4),
('BLK-ORG-12x6', 'Organic Blackberries 12x6oz', 'Zarzamoras Organicas 12x6oz', 'Berries', 'Organic', 'Organica', 'Mexico', 'Jalisco', 'Oct-May', 'Oct-May', 'flat', '12x6oz', true, false, 'Blackberries', true, 4),
('BLK-COL-12x6', 'Blackberries Colombia 12x6oz', 'Moras Colombia 12x6oz', 'Berries', 'Mora de Castilla', 'Mora de Castilla', 'Colombia', 'Cundinamarca, Boyaca', 'Year-round', 'Todo el ano', 'flat', '12x6oz', false, true, 'Blackberries', true, 5),
('STR-PER-8x1', 'Strawberries Peru 8x1lb', 'Fresas Peru 8x1lb', 'Berries', 'Conventional', 'Convencional', 'Peru', 'Lima, Ica', 'Jun-Nov', 'Jun-Nov', 'flat', '8x1lb', false, true, 'Strawberries', true, 8),
('BLU-ARG-12x6', 'Blueberries Argentina 12x6oz', 'Arandanos Argentina 12x6oz', 'Berries', 'Conventional', 'Convencional', 'Argentina', 'Tucuman, Entre Rios', 'Oct-Dec', 'Oct-Dic', 'flat', '12x6oz', false, true, 'Blueberries', true, 18),
('GOS-12x6', 'Gooseberries 12x6oz', 'Uchuva 12x6oz', 'Berries', 'Cape Gooseberry/Uchuva', 'Uchuva', 'Colombia', 'Boyaca, Cundinamarca', 'Year-round', 'Todo el ano', 'flat', '12x6oz', false, true, 'Berries', true, 14),
('STR-CHL-8x1', 'Strawberries Chile 8x1lb', 'Fresas Chile 8x1lb', 'Berries', 'Conventional', 'Convencional', 'Chile', 'Maule, OHiggins', 'Nov-Mar', 'Nov-Mar', 'flat', '8x1lb', false, true, 'Strawberries', true, 8),
('RSP-CHL-12x6', 'Raspberries Chile 12x6oz', 'Frambuesas Chile 12x6oz', 'Berries', 'Conventional', 'Convencional', 'Chile', 'Maule, BioBio', 'Dec-Mar', 'Dic-Mar', 'flat', '12x6oz', false, true, 'Raspberries', true, 6),
('BLU-URG-12x6', 'Blueberries Uruguay 12x6oz', 'Arandanos Uruguay 12x6oz', 'Berries', 'Conventional', 'Convencional', 'Uruguay', 'Salto', 'Oct-Dec', 'Oct-Dic', 'flat', '12x6oz', false, true, 'Blueberries', true, 18),
('ACB-12x4', 'Acai Berry Frozen 12x4oz', 'Acai Congelado 12x4oz', 'Berries', 'Frozen Puree', 'Pure Congelado', 'Brazil', 'Para, Amazonas', 'Year-round', 'Todo el ano', 'case', '12x4oz', true, true, 'Berries', true, 365),

-- ═══════════════════════════════════════════════════════════════
-- EXPANDED TOMATOES (12)
-- ═══════════════════════════════════════════════════════════════
('TOM-ROM-GT-20', 'Roma Tomatoes Guatemala 20lb', 'Tomate Roma Guatemala 20lb', 'Tomatoes', 'Roma', 'Roma', 'Guatemala', 'Jutiapa', 'Year-round', 'Todo el ano', 'case', '20lb', false, true, 'Tomatoes', true, 14),
('TOM-ORG-RND-25', 'Organic Round Tomatoes 25lb', 'Tomate Bola Organico 25lb', 'Tomatoes', 'Round Organic', 'Bola Organico', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '25lb', true, false, 'Tomatoes', true, 12),
('TOM-ORG-GRP-12', 'Organic Grape Tomatoes 12x1lb', 'Tomate Grape Organico 12x1lb', 'Tomatoes', 'Grape Organic', 'Uva Organico', 'Mexico', 'Baja California', 'Year-round', 'Todo el ano', 'case', '12x1lb', true, false, 'Tomatoes', true, 10),
('TOM-PLM-25', 'Plum Tomatoes 25lb', 'Tomate Pera 25lb', 'Tomatoes', 'Plum/San Marzano', 'Pera/San Marzano', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Tomatoes', true, 12),
('TOM-YEL-12', 'Yellow Tomatoes 12lb', 'Tomate Amarillo 12lb', 'Tomatoes', 'Yellow Cherry/Grape', 'Amarillo Cherry', 'Mexico', 'Sinaloa, Baja California', 'Nov-May', 'Nov-May', 'case', '12lb', false, true, 'Tomatoes', true, 10),
('TOM-MED-12', 'Medley Tomatoes 12x1lb', 'Tomate Medley 12x1lb', 'Tomatoes', 'Mixed Cherry/Grape', 'Mixto Cherry/Grape', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '12x1lb', false, true, 'Tomatoes', true, 10),
('TOM-HN-25', 'Roma Tomatoes Honduras 25lb', 'Tomate Roma Honduras 25lb', 'Tomatoes', 'Roma', 'Roma', 'Honduras', 'Comayagua', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Tomatoes', true, 14),
('TOM-CR-25', 'Hydroponic Tomatoes CR 25lb', 'Tomate Hidroponico CR 25lb', 'Tomatoes', 'Hydroponic Round', 'Hidroponico Bola', 'Costa Rica', 'Cartago', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Tomatoes', true, 14),
('TOM-GHR-25', 'Greenhouse Tomatoes 25lb', 'Tomate Invernadero 25lb', 'Tomatoes', 'Greenhouse Round', 'Invernadero Bola', 'Mexico', 'Sinaloa, Sonora', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Tomatoes', true, 14),
('TOM-GHR-ROM-25', 'Greenhouse Roma 25lb', 'Tomate Roma Invernadero 25lb', 'Tomatoes', 'Greenhouse Roma', 'Roma Invernadero', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Tomatoes', true, 14),
('TOM-KMT-12', 'Kumato Tomatoes 12lb', 'Tomate Kumato 12lb', 'Tomatoes', 'Kumato/Brown', 'Kumato/Cafe', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '12lb', false, true, 'Tomatoes', true, 10),
('TOM-GLT-10', 'Glorys Tomatoes 10x10oz', 'Tomate Glorys 10x10oz', 'Tomatoes', 'Glorys Snacking', 'Glorys Snack', 'Mexico', 'Sinaloa, Jalisco', 'Year-round', 'Todo el ano', 'case', '10x10oz', false, true, 'Tomatoes', true, 10),

-- ═══════════════════════════════════════════════════════════════
-- EXPANDED CITRUS (13)
-- ═══════════════════════════════════════════════════════════════
('LIM-ORG-40', 'Organic Persian Lime 40lb', 'Limon Persa Organico 40lb', 'Citrus', 'Persian Organic', 'Persa Organico', 'Mexico', 'Veracruz', 'Year-round', 'Todo el ano', 'case', '40lb', true, false, 'Limes', true, 21),
('LIM-150', 'Persian Lime 150ct', 'Limon Persa 150ct', 'Citrus', 'Persian', 'Persa', 'Mexico', 'Veracruz, Oaxaca', 'Year-round', 'Todo el ano', 'case', '150ct', false, true, 'Limes', true, 21),
('LIM-COL-40', 'Lime Colombia 40lb', 'Limon Colombia 40lb', 'Citrus', 'Tahiti', 'Tahiti', 'Colombia', 'Santander, Tolima', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Limes', true, 21),
('LIM-GT-40', 'Lime Guatemala 40lb', 'Limon Guatemala 40lb', 'Citrus', 'Persian', 'Persa', 'Guatemala', 'Escuintla, Suchitepequez', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Limes', true, 21),
('LEM-ORG-75', 'Organic Lemon 75ct', 'Limon Amarillo Organico 75ct', 'Citrus', 'Eureka Organic', 'Eureka Organico', 'Mexico', 'Michoacan', 'Year-round', 'Todo el ano', 'case', '75ct', true, false, 'Lemons', true, 28),
('LEM-MYR-75', 'Meyer Lemon 75ct', 'Limon Meyer 75ct', 'Citrus', 'Meyer', 'Meyer', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '75ct', false, true, 'Lemons', true, 21),
('ORG-BGO-40', 'Blood Orange 40lb', 'Naranja Sangre 40lb', 'Citrus', 'Blood/Moro', 'Sangre/Moro', 'Mexico', 'Sonora', 'Dec-Mar', 'Dic-Mar', 'case', '40lb', false, true, 'Oranges', true, 21),
('ORG-CAR-40', 'Cara Cara Orange 40lb', 'Naranja Cara Cara 40lb', 'Citrus', 'Cara Cara', 'Cara Cara', 'Mexico', 'Sonora', 'Dec-Apr', 'Dic-Abr', 'case', '40lb', false, true, 'Oranges', true, 28),
('MND-ORG-25', 'Organic Mandarin 25lb', 'Mandarina Organica 25lb', 'Citrus', 'Clementine Organic', 'Clementina Organica', 'Mexico', 'Sonora', 'Nov-Mar', 'Nov-Mar', 'case', '25lb', true, false, 'Mandarins', true, 21),
('MND-PER-25', 'Mandarin Peru 25lb', 'Mandarina Peru 25lb', 'Citrus', 'W. Murcott', 'W. Murcott', 'Peru', 'Lima, Ica', 'Apr-Sep', 'Abr-Sep', 'case', '25lb', false, true, 'Mandarins', true, 21),
('MND-CHL-25', 'Mandarin Chile 25lb', 'Mandarina Chile 25lb', 'Citrus', 'Clementine', 'Clementina', 'Chile', 'Coquimbo, Valparaiso', 'May-Sep', 'May-Sep', 'case', '25lb', false, true, 'Mandarins', true, 21),
('PML-24', 'Pomelo 24ct', 'Pomelo 24ct', 'Citrus', 'Pink, White', 'Rosa, Blanco', 'Mexico', 'Veracruz', 'Nov-Mar', 'Nov-Mar', 'case', '24ct', false, true, 'Pomelo', true, 21),
('KMQ-10', 'Kumquat 10lb', 'Kumquat 10lb', 'Citrus', 'Nagami', 'Nagami', 'Mexico', 'Veracruz', 'Dec-Apr', 'Dic-Abr', 'case', '10lb', false, true, 'Kumquats', true, 14),

-- ═══════════════════════════════════════════════════════════════
-- EXPANDED TROPICAL (15)
-- ═══════════════════════════════════════════════════════════════
('MNG-ORG-10', 'Organic Mango Kent 10ct', 'Mango Kent Organico 10ct', 'Tropical', 'Kent Organic', 'Kent Organico', 'Mexico', 'Chiapas, Oaxaca', 'Apr-Jul', 'Abr-Jul', 'case', '10ct', true, false, 'Mangoes', true, 14),
('MNG-ORG-AT-12', 'Organic Mango Ataulfo 12ct', 'Mango Ataulfo Organico 12ct', 'Tropical', 'Ataulfo Organic', 'Ataulfo Organico', 'Mexico', 'Chiapas', 'Mar-Jul', 'Mar-Jul', 'case', '12ct', true, false, 'Mangoes', true, 10),
('PAP-ORG-30', 'Organic Papaya 30lb', 'Papaya Organica 30lb', 'Tropical', 'Maradol Organic', 'Maradol Organica', 'Mexico', 'Chiapas', 'Year-round', 'Todo el ano', 'case', '30lb', true, false, 'Papayas', true, 10),
('PAP-HN-30', 'Papaya Honduras 30lb', 'Papaya Honduras 30lb', 'Tropical', 'Tainung', 'Tainung', 'Honduras', 'Comayagua, Olancho', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Papayas', true, 12),
('PIN-HN-8', 'Pineapple Honduras 8ct', 'Pina Honduras 8ct', 'Tropical', 'MD-2', 'MD-2', 'Honduras', 'La Ceiba, Comayagua', 'Year-round', 'Todo el ano', 'case', '8ct', false, true, 'Pineapples', true, 14),
('PIN-ORG-8', 'Organic Pineapple 8ct', 'Pina Organica 8ct', 'Tropical', 'MD-2 Organic', 'MD-2 Organica', 'Costa Rica', 'San Carlos', 'Year-round', 'Todo el ano', 'case', '8ct', true, false, 'Pineapples', true, 14),
('BAN-ORG-40', 'Organic Banana 40lb', 'Platano Organico 40lb', 'Tropical', 'Cavendish Organic', 'Cavendish Organico', 'Mexico', 'Chiapas', 'Year-round', 'Todo el ano', 'case', '40lb', true, false, 'Bananas', true, 10),
('BAN-GT-40', 'Banana Guatemala 40lb', 'Platano Guatemala 40lb', 'Tropical', 'Cavendish', 'Cavendish', 'Guatemala', 'Izabal, Escuintla', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Bananas', true, 10),
('BAN-HN-40', 'Banana Honduras 40lb', 'Platano Honduras 40lb', 'Tropical', 'Cavendish', 'Cavendish', 'Honduras', 'La Ceiba, Tela', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Bananas', true, 10),
('BAN-ECU-40', 'Banana Ecuador 40lb', 'Platano Ecuador 40lb', 'Tropical', 'Cavendish', 'Cavendish', 'Ecuador', 'Guayas, Los Rios, El Oro', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Bananas', true, 12),
('PLT-GT-50', 'Plantain Guatemala 50lb', 'Platano Macho Guatemala 50lb', 'Tropical', 'Plantain', 'Macho', 'Guatemala', 'Izabal, Alta Verapaz', 'Year-round', 'Todo el ano', 'case', '50lb', false, true, 'Plantains', true, 14),
('PLT-HN-50', 'Plantain Honduras 50lb', 'Platano Macho Honduras 50lb', 'Tropical', 'Plantain', 'Macho', 'Honduras', 'Atlantida, Cortes', 'Year-round', 'Todo el ano', 'case', '50lb', false, true, 'Plantains', true, 14),
('PLT-ECU-50', 'Plantain Ecuador 50lb', 'Platano Macho Ecuador 50lb', 'Tropical', 'Barraganete, Dominico', 'Barraganete, Dominico', 'Ecuador', 'Los Rios, Esmeraldas', 'Year-round', 'Todo el ano', 'case', '50lb', false, true, 'Plantains', true, 14),
('STF-5', 'Star Fruit 5lb', 'Carambola 5lb', 'Tropical', 'Carambola', 'Carambola', 'Mexico', 'Tabasco, Veracruz', 'Aug-Feb', 'Ago-Feb', 'case', '5lb', false, true, 'Star Fruit', true, 7),
('SAP-10', 'Sapote 10lb', 'Zapote 10lb', 'Tropical', 'Mamey, Black', 'Mamey, Negro', 'Mexico', 'Veracruz, Tabasco, Chiapas', 'Apr-Sep', 'Abr-Sep', 'case', '10lb', false, true, 'Sapote', true, 7),

-- ═══════════════════════════════════════════════════════════════
-- CENTRAL AMERICA EXPANSION (25)
-- ═══════════════════════════════════════════════════════════════
('GRB-HN-25', 'Green Beans Honduras 25lb', 'Ejotes Honduras 25lb', 'Vegetables', 'Round', 'Redondo', 'Honduras', 'Comayagua, Intibuca', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Green Beans', true, 7),
('CUC-GT-24', 'Cucumber Guatemala 24ct', 'Pepino Guatemala 24ct', 'Cucumbers', 'Slicer', 'Americano', 'Guatemala', 'Zacapa, Baja Verapaz', 'Year-round', 'Todo el ano', 'case', '24ct', false, true, 'Cucumbers', true, 10),
('CUC-HN-24', 'Cucumber Honduras 24ct', 'Pepino Honduras 24ct', 'Cucumbers', 'Slicer', 'Americano', 'Honduras', 'Comayagua', 'Year-round', 'Todo el ano', 'case', '24ct', false, true, 'Cucumbers', true, 10),
('PEP-GT-GRN-25', 'Bell Pepper Guatemala 25lb', 'Pimiento Guatemala 25lb', 'Peppers', 'Green Bell', 'Morron Verde', 'Guatemala', 'Jutiapa, Zacapa', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Peppers', true, 14),
('PEP-HN-JAL-10', 'Jalapeno Honduras 10lb', 'Chile Jalapeno Honduras 10lb', 'Peppers', 'Jalapeno', 'Jalapeno', 'Honduras', 'Comayagua', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', true, 14),
('SQU-GT-ZUC-20', 'Zucchini Guatemala 20lb', 'Calabaza Guatemala 20lb', 'Squash', 'Zucchini', 'Italiana', 'Guatemala', 'Chimaltenango', 'Year-round', 'Todo el ano', 'case', '20lb', false, true, 'Squash', true, 10),
('SQU-HN-YEL-20', 'Yellow Squash Honduras 20lb', 'Calabaza Amarilla Honduras 20lb', 'Squash', 'Yellow', 'Amarilla', 'Honduras', 'Comayagua', 'Year-round', 'Todo el ano', 'case', '20lb', false, true, 'Squash', true, 10),
('ONI-GT-25', 'White Onion Guatemala 25lb', 'Cebolla Guatemala 25lb', 'Onions', 'White', 'Blanca', 'Guatemala', 'Jutiapa, Quetzaltenango', 'Year-round', 'Todo el ano', 'sack', '25lb', false, true, 'Onions', true, 30),
('ONI-HN-25', 'Yellow Onion Honduras 25lb', 'Cebolla Honduras 25lb', 'Onions', 'Yellow', 'Amarilla', 'Honduras', 'Ocotepeque, Intibuca', 'Year-round', 'Todo el ano', 'sack', '25lb', false, true, 'Onions', true, 30),
('CAR-GT-25', 'Carrots Guatemala 25lb', 'Zanahoria Guatemala 25lb', 'Root Vegetables', 'Jumbo', 'Jumbo', 'Guatemala', 'Chimaltenango, Quetzaltenango', 'Year-round', 'Todo el ano', 'sack', '25lb', false, true, 'Carrots', true, 21),
('BRC-GT-14', 'Broccoli Guatemala 14ct', 'Brocoli Guatemala 14ct', 'Cruciferous', 'Crown', 'Corona', 'Guatemala', 'Chimaltenango, Sacatepequez', 'Year-round', 'Todo el ano', 'case', '14ct', false, true, 'Broccoli', true, 10),
('CAU-GT-12', 'Cauliflower Guatemala 12ct', 'Coliflor Guatemala 12ct', 'Cruciferous', 'White', 'Blanca', 'Guatemala', 'Chimaltenango', 'Year-round', 'Todo el ano', 'case', '12ct', false, true, 'Cauliflower', true, 10),
('CAB-GT-50', 'Cabbage Guatemala 50lb', 'Col Guatemala 50lb', 'Cruciferous', 'Green', 'Verde', 'Guatemala', 'Chimaltenango, Quetzaltenango', 'Year-round', 'Todo el ano', 'sack', '50lb', false, true, 'Cabbage', true, 21),
('CEL-GT-24', 'Celery Guatemala 24ct', 'Apio Guatemala 24ct', 'Vegetables', 'Pascal', 'Pascal', 'Guatemala', 'Chimaltenango', 'Year-round', 'Todo el ano', 'case', '24ct', false, true, 'Celery', true, 14),
('LET-GT-ROM-24', 'Romaine Lettuce Guatemala 24ct', 'Lechuga Romana Guatemala 24ct', 'Leafy Greens', 'Romaine', 'Romana', 'Guatemala', 'Chimaltenango, Sacatepequez', 'Year-round', 'Todo el ano', 'case', '24ct', false, true, 'Lettuce', true, 10),
('CRN-GT-48', 'Sweet Corn Guatemala 48ct', 'Elote Guatemala 48ct', 'Vegetables', 'Sweet Corn', 'Elote Dulce', 'Guatemala', 'Retalhuleu', 'Year-round', 'Todo el ano', 'case', '48 ears', false, true, 'Corn', true, 5),
('MNG-GT-AT-12', 'Mango Ataulfo Guatemala 12ct', 'Mango Ataulfo Guatemala 12ct', 'Tropical', 'Ataulfo', 'Ataulfo', 'Guatemala', 'Retalhuleu, Escuintla', 'Mar-Jun', 'Mar-Jun', 'case', '12ct', false, true, 'Mangoes', true, 10),
('WAT-GT-EA', 'Watermelon Guatemala Each', 'Sandia Guatemala Pieza', 'Melons', 'Seedless', 'Sin semilla', 'Guatemala', 'Zacapa, Jutiapa', 'Year-round', 'Todo el ano', 'bin', 'each', false, true, 'Watermelons', true, 14),
('CAN-GT-12', 'Cantaloupe Guatemala 12ct', 'Melon Guatemala 12ct', 'Melons', 'Western', 'Occidental', 'Guatemala', 'Zacapa', 'Year-round', 'Todo el ano', 'case', '12ct', false, true, 'Cantaloupes', true, 10),
('HON-GT-6', 'Honeydew Guatemala 6ct', 'Melon Chino Guatemala 6ct', 'Melons', 'Green Flesh', 'Verde', 'Guatemala', 'Zacapa', 'Year-round', 'Todo el ano', 'case', '6ct', false, true, 'Honeydew', true, 14),
('LIM-GT-40B', 'Persian Lime Guatemala 40lb', 'Limon Persa Guatemala 40lb', 'Citrus', 'Persian', 'Persa', 'Guatemala', 'Escuintla, Alta Verapaz', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Limes', true, 21),
('LIM-HN-40', 'Persian Lime Honduras 40lb', 'Limon Persa Honduras 40lb', 'Citrus', 'Persian', 'Persa', 'Honduras', 'Comayagua, Cortes', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Limes', true, 21),
('COC-GT-20', 'Coconut Guatemala 20ct', 'Coco Guatemala 20ct', 'Tropical', 'Brown', 'Peludo', 'Guatemala', 'Escuintla, Izabal', 'Year-round', 'Todo el ano', 'sack', '20ct', false, true, 'Coconuts', false, 30),
('CIL-GT-30', 'Cilantro Guatemala 30ct', 'Cilantro Guatemala 30ct', 'Herbs', 'Conventional', 'Convencional', 'Guatemala', 'Chimaltenango', 'Year-round', 'Todo el ano', 'case', '30 bunches', false, true, 'Cilantro', true, 7),
('CHY-GT-20', 'Chayote Guatemala 20lb', 'Chayote Guatemala 20lb', 'Squash', 'Green', 'Verde', 'Guatemala', 'Chimaltenango', 'Year-round', 'Todo el ano', 'case', '20lb', false, true, 'Chayote', false, 14),

-- ═══════════════════════════════════════════════════════════════
-- SOUTH AMERICA EXPANSION (25)
-- ═══════════════════════════════════════════════════════════════
('ASP-PER-28', 'Asparagus Peru 28lb', 'Esparrago Peru 28lb', 'Vegetables', 'Green Jumbo', 'Verde Jumbo', 'Peru', 'Ica, La Libertad', 'Year-round', 'Todo el ano', 'case', '28lb', true, true, 'Asparagus', true, 10),
('ASP-PER-ORG-11', 'Organic Asparagus Peru 11lb', 'Esparrago Organico Peru 11lb', 'Vegetables', 'Green Organic', 'Verde Organico', 'Peru', 'Ica', 'Year-round', 'Todo el ano', 'case', '11lb', true, false, 'Asparagus', true, 10),
('GRP-PER-RED-18', 'Red Grapes Peru 18lb', 'Uva Roja Peru 18lb', 'Grapes', 'Red Globe, Crimson, Flame', 'Red Globe, Crimson, Flame', 'Peru', 'Ica, Piura', 'Nov-Mar', 'Nov-Mar', 'case', '18lb', false, true, 'Grapes', true, 18),
('GRP-PER-GRN-18', 'Green Grapes Peru 18lb', 'Uva Verde Peru 18lb', 'Grapes', 'Thompson, Superior', 'Thompson, Superior', 'Peru', 'Ica, Piura', 'Nov-Mar', 'Nov-Mar', 'case', '18lb', false, true, 'Grapes', true, 18),
('GRP-CHL-RED-18', 'Red Grapes Chile 18lb', 'Uva Roja Chile 18lb', 'Grapes', 'Crimson, Flame', 'Crimson, Flame', 'Chile', 'Atacama, Coquimbo, OHiggins', 'Dec-Apr', 'Dic-Abr', 'case', '18lb', false, true, 'Grapes', true, 18),
('GRP-CHL-GRN-18', 'Green Grapes Chile 18lb', 'Uva Verde Chile 18lb', 'Grapes', 'Thompson, Sugraone', 'Thompson, Sugraone', 'Chile', 'Atacama, Coquimbo', 'Dec-Apr', 'Dic-Abr', 'case', '18lb', false, true, 'Grapes', true, 18),
('GRP-CHL-BLK-18', 'Black Grapes Chile 18lb', 'Uva Negra Chile 18lb', 'Grapes', 'Autumn Royal, Black Seedless', 'Autumn Royal, Negra', 'Chile', 'Atacama', 'Dec-Apr', 'Dic-Abr', 'case', '18lb', false, true, 'Grapes', true, 18),
('MNG-BRZ-10', 'Mango Brazil 10ct', 'Mango Brasil 10ct', 'Tropical', 'Tommy Atkins, Palmer', 'Tommy Atkins, Palmer', 'Brazil', 'Bahia, Vale Sao Francisco', 'Sep-Jan', 'Sep-Ene', 'case', '10ct', false, true, 'Mangoes', true, 16),
('LIM-BRZ-40', 'Lime Brazil 40lb', 'Limon Brasil 40lb', 'Citrus', 'Tahiti', 'Tahiti', 'Brazil', 'Sao Paulo, Minas Gerais', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Limes', true, 21),
('PAP-BRZ-30', 'Papaya Brazil 30lb', 'Papaya Brasil 30lb', 'Tropical', 'Golden, Formosa', 'Golden, Formosa', 'Brazil', 'Bahia, Espirito Santo', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Papayas', true, 12),
('PSF-COL-12', 'Passion Fruit Colombia 12ct', 'Maracuya Colombia 12ct', 'Tropical', 'Yellow Passion Fruit', 'Maracuya Amarilla', 'Colombia', 'Huila, Valle del Cauca', 'Year-round', 'Todo el ano', 'case', '12ct', false, true, 'Passion Fruit', true, 7),
('PSF-ECU-12', 'Passion Fruit Ecuador 12ct', 'Maracuya Ecuador 12ct', 'Tropical', 'Maracuya', 'Maracuya', 'Ecuador', 'Manabi, Esmeraldas', 'Year-round', 'Todo el ano', 'case', '12ct', false, true, 'Passion Fruit', true, 7),
('GRN-COL-5', 'Granadilla Colombia 5lb', 'Granadilla Colombia 5lb', 'Tropical', 'Sweet Granadilla', 'Granadilla Dulce', 'Colombia', 'Huila, Boyaca', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Passion Fruit', true, 10),
('TRT-COL-5', 'Tree Tomato Colombia 5lb', 'Tomate de Arbol Colombia 5lb', 'Tropical', 'Tomate de Arbol', 'Tomate de Arbol', 'Colombia', 'Antioquia, Nariño', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Specialty', true, 10),
('FJA-COL-5', 'Feijoa Colombia 5lb', 'Feijoa Colombia 5lb', 'Tropical', 'Pineapple Guava', 'Feijoa', 'Colombia', 'Boyaca, Cundinamarca', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Specialty', true, 14),
('CHR-CHL-18', 'Cherries Chile 18lb', 'Cerezas Chile 18lb', 'Stone Fruit', 'Bing, Rainier, Lapin', 'Bing, Rainier, Lapin', 'Chile', 'OHiggins, Maule', 'Dec-Feb', 'Dic-Feb', 'case', '18lb', false, true, 'Cherries', true, 14),
('PCH-CHL-25', 'Peaches Chile 25lb', 'Duraznos Chile 25lb', 'Stone Fruit', 'Yellow, White', 'Amarillo, Blanco', 'Chile', 'OHiggins, Maule', 'Dec-Mar', 'Dic-Mar', 'case', '25lb', false, true, 'Peaches', true, 10),
('PLM-CHL-25', 'Plums Chile 25lb', 'Ciruelas Chile 25lb', 'Stone Fruit', 'Black, Red, Yellow', 'Negra, Roja, Amarilla', 'Chile', 'OHiggins, Maule', 'Dec-Mar', 'Dic-Mar', 'case', '25lb', false, true, 'Plums', true, 14),
('NCT-CHL-25', 'Nectarines Chile 25lb', 'Nectarinas Chile 25lb', 'Stone Fruit', 'Yellow, White', 'Amarillo, Blanco', 'Chile', 'OHiggins, Maule', 'Dec-Mar', 'Dic-Mar', 'case', '25lb', false, true, 'Nectarines', true, 10),
('APR-CHL-12', 'Apricots Chile 12lb', 'Damascos Chile 12lb', 'Stone Fruit', 'Patterson', 'Patterson', 'Chile', 'OHiggins, Maule', 'Dec-Jan', 'Dic-Ene', 'case', '12lb', false, true, 'Apricots', true, 7),
('KWI-CHL-25', 'Kiwi Chile 25lb', 'Kiwi Chile 25lb', 'Stone Fruit', 'Hayward', 'Hayward', 'Chile', 'Maule, BioBio', 'Apr-Oct', 'Abr-Oct', 'case', '25lb', false, true, 'Kiwi', true, 30),
('APL-CHL-40', 'Apple Chile 40lb', 'Manzana Chile 40lb', 'Pome Fruit', 'Gala, Fuji, Granny Smith', 'Gala, Fuji, Granny Smith', 'Chile', 'OHiggins, Maule', 'Mar-Sep', 'Mar-Sep', 'case', '40lb', false, true, 'Apples', true, 60),
('PER-CHL-40', 'Pear Chile 40lb', 'Pera Chile 40lb', 'Pome Fruit', 'Bartlett, Bosc, DAngou', 'Bartlett, Bosc, DAngou', 'Chile', 'OHiggins, Maule', 'Feb-Aug', 'Feb-Ago', 'case', '40lb', false, true, 'Pears', true, 45),
('PER-ARG-40', 'Pear Argentina 40lb', 'Pera Argentina 40lb', 'Pome Fruit', 'Williams, Packham', 'Williams, Packham', 'Argentina', 'Rio Negro, Neuquen', 'Feb-Jul', 'Feb-Jul', 'case', '40lb', false, true, 'Pears', true, 45),
('APL-ARG-40', 'Apple Argentina 40lb', 'Manzana Argentina 40lb', 'Pome Fruit', 'Gala, Red Delicious, Granny', 'Gala, Red Delicious, Granny', 'Argentina', 'Rio Negro, Neuquen, Mendoza', 'Feb-Sep', 'Feb-Sep', 'case', '40lb', false, true, 'Apples', true, 60),

-- ═══════════════════════════════════════════════════════════════
-- DRIED, FROZEN, VALUE-ADD (20)
-- ═══════════════════════════════════════════════════════════════
('FRZ-STR-30', 'Frozen Strawberries 30lb', 'Fresas Congeladas 30lb', 'Frozen', 'IQF Whole/Sliced', 'IQF Entera/Rebanada', 'Mexico', 'Baja California, Guanajuato', 'Year-round', 'Todo el ano', 'case', '30lb', true, true, 'Strawberries', true, 365),
('FRZ-BLU-30', 'Frozen Blueberries 30lb', 'Arandanos Congelados 30lb', 'Frozen', 'IQF', 'IQF', 'Mexico', 'Jalisco', 'Year-round', 'Todo el ano', 'case', '30lb', true, true, 'Blueberries', true, 365),
('FRZ-RSP-30', 'Frozen Raspberries 30lb', 'Frambuesas Congeladas 30lb', 'Frozen', 'IQF', 'IQF', 'Mexico', 'Baja California', 'Year-round', 'Todo el ano', 'case', '30lb', true, true, 'Raspberries', true, 365),
('FRZ-BLK-30', 'Frozen Blackberries 30lb', 'Zarzamoras Congeladas 30lb', 'Frozen', 'IQF', 'IQF', 'Mexico', 'Jalisco', 'Year-round', 'Todo el ano', 'case', '30lb', true, true, 'Blackberries', true, 365),
('FRZ-MNG-30', 'Frozen Mango Chunks 30lb', 'Mango Congelado 30lb', 'Frozen', 'IQF Chunks', 'IQF Trozos', 'Mexico', 'Sinaloa, Nayarit', 'Year-round', 'Todo el ano', 'case', '30lb', true, true, 'Mangoes', true, 365),
('FRZ-PIN-30', 'Frozen Pineapple Chunks 30lb', 'Pina Congelada 30lb', 'Frozen', 'IQF Chunks', 'IQF Trozos', 'Costa Rica', 'San Carlos', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Pineapples', true, 365),
('FRZ-AVO-12', 'Frozen Avocado Halves 12x1lb', 'Aguacate Congelado 12x1lb', 'Frozen', 'IQF Halves', 'IQF Mitades', 'Mexico', 'Michoacan', 'Year-round', 'Todo el ano', 'case', '12x1lb', true, true, 'Avocados', true, 365),
('FRZ-GUA-30', 'Frozen Guava Puree 30lb', 'Pulpa Guayaba Congelada 30lb', 'Frozen', 'Puree', 'Pulpa', 'Mexico', 'Aguascalientes', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Guavas', true, 365),
('FRZ-PSF-30', 'Frozen Passion Fruit Puree 30lb', 'Pulpa Maracuya Congelada 30lb', 'Frozen', 'Puree', 'Pulpa', 'Colombia', 'Valle del Cauca', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Passion Fruit', true, 365),
('FRZ-ACL-30', 'Frozen Acerola Puree 30lb', 'Pulpa Acerola Congelada 30lb', 'Frozen', 'Puree', 'Pulpa', 'Brazil', 'Ceara, Pernambuco', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Berries', true, 365),
('DRD-MNG-10', 'Dried Mango 10lb', 'Mango Deshidratado 10lb', 'Dried', 'Dried Slices', 'Rebanadas Deshidratadas', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '10lb', true, true, 'Mangoes', false, 365),
('DRD-PIN-10', 'Dried Pineapple 10lb', 'Pina Deshidratada 10lb', 'Dried', 'Dried Rings', 'Anillos Deshidratados', 'Costa Rica', 'San Carlos', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Pineapples', false, 365),
('DRD-BAN-10', 'Dried Banana Chips 10lb', 'Chips Platano 10lb', 'Dried', 'Chips', 'Chips', 'Mexico', 'Chiapas', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Bananas', false, 365),
('DRD-COC-10', 'Dried Coconut Shredded 10lb', 'Coco Rallado 10lb', 'Dried', 'Shredded/Flaked', 'Rallado/Hojuelas', 'Mexico', 'Colima', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Coconuts', false, 365),
('DRD-PAP-10', 'Dried Papaya 10lb', 'Papaya Deshidratada 10lb', 'Dried', 'Dried Chunks', 'Trozos Deshidratados', 'Mexico', 'Chiapas', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Papayas', false, 365),
('JCE-LIM-GAL', 'Lime Juice Concentrate Gallon', 'Jugo Limon Concentrado Galon', 'Juice', 'Concentrate', 'Concentrado', 'Mexico', 'Veracruz', 'Year-round', 'Todo el ano', 'jug', '1 gallon', false, true, 'Limes', true, 90),
('JCE-ORG-GAL', 'Orange Juice NFC Gallon', 'Jugo Naranja NFC Galon', 'Juice', 'Not From Concentrate', 'No Concentrado', 'Mexico', 'Sonora, Veracruz', 'Year-round', 'Todo el ano', 'jug', '1 gallon', false, true, 'Oranges', true, 30),
('JCE-GUA-GAL', 'Guava Nectar Gallon', 'Nectar Guayaba Galon', 'Juice', 'Nectar', 'Nectar', 'Mexico', 'Aguascalientes', 'Year-round', 'Todo el ano', 'jug', '1 gallon', false, true, 'Guavas', true, 60),
('JCE-TAM-GAL', 'Tamarind Concentrate Gallon', 'Concentrado Tamarindo Galon', 'Juice', 'Concentrate', 'Concentrado', 'Mexico', 'Guerrero, Chiapas', 'Year-round', 'Todo el ano', 'jug', '1 gallon', false, true, 'Tamarind', true, 120),
('JCE-PSF-GAL', 'Passion Fruit Concentrate Gallon', 'Concentrado Maracuya Galon', 'Juice', 'Concentrate', 'Concentrado', 'Colombia', 'Valle del Cauca, Huila', 'Year-round', 'Todo el ano', 'jug', '1 gallon', false, true, 'Passion Fruit', true, 120),

-- ═══════════════════════════════════════════════════════════════
-- ORGANIC PREMIUM LINE (20)
-- ═══════════════════════════════════════════════════════════════
('ORG-LET-ROM-24', 'Organic Romaine 24ct', 'Lechuga Romana Organica 24ct', 'Leafy Greens', 'Romaine Organic', 'Romana Organica', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '24ct', true, false, 'Lettuce', true, 7),
('ORG-SPN-2.5', 'Organic Baby Spinach 2.5lb', 'Espinaca Baby Organica 2.5lb', 'Leafy Greens', 'Baby Spinach Organic', 'Espinaca Organica', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '2.5lb', true, false, 'Spinach', true, 5),
('ORG-KAL-12', 'Organic Kale 12ct', 'Kale Organico 12ct', 'Leafy Greens', 'Curly Organic', 'Rizado Organico', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '12 bunches', true, false, 'Kale', true, 7),
('ORG-CIL-30', 'Organic Cilantro 30ct', 'Cilantro Organico 30ct', 'Herbs', 'Organic', 'Organico', 'Mexico', 'Baja California', 'Year-round', 'Todo el ano', 'case', '30 bunches', true, false, 'Cilantro', true, 7),
('ORG-BRC-14', 'Organic Broccoli 14ct', 'Brocoli Organico 14ct', 'Cruciferous', 'Crown Organic', 'Corona Organica', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '14ct', true, false, 'Broccoli', true, 10),
('ORG-CAU-12', 'Organic Cauliflower 12ct', 'Coliflor Organica 12ct', 'Cruciferous', 'White Organic', 'Blanca Organica', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '12ct', true, false, 'Cauliflower', true, 10),
('ORG-ZUC-20', 'Organic Zucchini 20lb', 'Calabaza Italiana Organica 20lb', 'Squash', 'Zucchini Organic', 'Italiana Organica', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '20lb', true, false, 'Squash', true, 10),
('ORG-CUC-PER-BU', 'Organic Persian Cucumber Bushel', 'Pepino Persa Organico Bushel', 'Cucumbers', 'Persian Organic', 'Persa Organico', 'Mexico', 'Baja California', 'Year-round', 'Todo el ano', 'bushel', '20lb', true, false, 'Cucumbers', true, 10),
('ORG-PEP-GRN-11', 'Organic Green Bell Pepper 11lb', 'Pimiento Verde Organico 11lb', 'Peppers', 'Green Bell Organic', 'Morron Verde Organico', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '11lb', true, false, 'Peppers', true, 14),
('ORG-PEP-RED-11', 'Organic Red Bell Pepper 11lb', 'Pimiento Rojo Organico 11lb', 'Peppers', 'Red Bell Organic', 'Morron Rojo Organico', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '11lb', true, false, 'Peppers', true, 14),
('ORG-TOM-ROM-25', 'Organic Roma Tomato 25lb', 'Tomate Roma Organico 25lb', 'Tomatoes', 'Roma Organic', 'Roma Organico', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '25lb', true, false, 'Tomatoes', true, 12),
('ORG-TOM-RND-25', 'Organic Round Tomato 25lb', 'Tomate Bola Organico 25lb', 'Tomatoes', 'Round Organic', 'Bola Organico', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '25lb', true, false, 'Tomatoes', true, 12),
('ORG-CAR-25', 'Organic Carrots 25lb', 'Zanahoria Organica 25lb', 'Root Vegetables', 'Organic', 'Organica', 'Mexico', 'Guanajuato', 'Year-round', 'Todo el ano', 'sack', '25lb', true, false, 'Carrots', true, 21),
('ORG-ONI-YEL-25', 'Organic Yellow Onion 25lb', 'Cebolla Amarilla Organica 25lb', 'Onions', 'Yellow Organic', 'Amarilla Organica', 'Mexico', 'Chihuahua', 'May-Aug', 'May-Ago', 'sack', '25lb', true, false, 'Onions', true, 30),
('ORG-GRB-25', 'Organic Green Beans 25lb', 'Ejotes Organicos 25lb', 'Vegetables', 'Round Organic', 'Redondo Organico', 'Mexico', 'Guanajuato', 'Nov-May', 'Nov-May', 'case', '25lb', true, false, 'Green Beans', true, 7),
('ORG-CEL-24', 'Organic Celery 24ct', 'Apio Organico 24ct', 'Vegetables', 'Pascal Organic', 'Pascal Organico', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '24ct', true, false, 'Celery', true, 14),
('ORG-GRP-RED-18', 'Organic Red Grapes 18lb', 'Uva Roja Organica 18lb', 'Grapes', 'Red Seedless Organic', 'Roja Organica', 'Mexico', 'Sonora', 'May-Aug', 'May-Ago', 'case', '18lb', true, false, 'Grapes', true, 14),
('ORG-BSL-12', 'Organic Basil 12ct', 'Albahaca Organica 12ct', 'Herbs', 'Sweet Organic', 'Dulce Organica', 'Mexico', 'Baja California', 'Year-round', 'Todo el ano', 'case', '12 clamshells', true, false, 'Basil', true, 5),
('ORG-MXG-3', 'Organic Spring Mix 3lb', 'Lechugas Mixtas Organicas 3lb', 'Leafy Greens', 'Spring Mix Organic', 'Mezcla Organica', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '3lb', true, false, 'Greens', true, 5),
('ORG-ARG-2', 'Organic Arugula 2lb', 'Arugula Organica 2lb', 'Leafy Greens', 'Baby Arugula Organic', 'Arugula Organica', 'Mexico', 'Baja California', 'Nov-Apr', 'Nov-Abr', 'case', '2lb', true, false, 'Arugula', true, 5),

-- ═══════════════════════════════════════════════════════════════
-- ADDITIONAL MISC TO HIT 500+ (15)
-- ═══════════════════════════════════════════════════════════════
('CAC-10', 'Cactus Fruit/Pitaya 10lb', 'Pitaya 10lb', 'Specialty', 'Red Flesh, White Flesh', 'Roja, Blanca', 'Mexico', 'Jalisco, Puebla', 'Jun-Oct', 'Jun-Oct', 'case', '10lb', false, true, 'Dragon Fruit', true, 7),
('TJO-5', 'Tejocote 5lb', 'Tejocote 5lb', 'Specialty', 'Fresh', 'Fresco', 'Mexico', 'Puebla, Mexico State', 'Oct-Dec', 'Oct-Dic', 'case', '5lb', false, true, 'Specialty', true, 14),
('CPN-10', 'Capulin/Wild Cherry 10lb', 'Capulin 10lb', 'Specialty', 'Fresh', 'Fresco', 'Mexico', 'Mexico State, Puebla', 'Jul-Sep', 'Jul-Sep', 'case', '10lb', false, true, 'Specialty', true, 5),
('XOC-5', 'Xoconostle 5lb', 'Xoconostle 5lb', 'Specialty', 'Sour Prickly Pear', 'Xoconostle', 'Mexico', 'Hidalgo, Mexico State', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Specialty', false, 30),
('CHR-MX-5', 'Chirimoya/Cherimoya 5lb', 'Chirimoya 5lb', 'Tropical', 'Cherimoya', 'Chirimoya', 'Mexico', 'Michoacan, Jalisco', 'Nov-Apr', 'Nov-Abr', 'case', '5lb', false, true, 'Specialty', true, 7),
('MMS-5', 'Mamey Sapote 5lb', 'Mamey 5lb', 'Tropical', 'Mamey', 'Mamey', 'Mexico', 'Veracruz, Chiapas, Tabasco', 'Mar-Sep', 'Mar-Sep', 'case', '5lb', false, true, 'Sapote', true, 7),
('SRS-5', 'Soursop/Guanabana 5lb', 'Guanabana 5lb', 'Tropical', 'Guanabana', 'Guanabana', 'Mexico', 'Colima, Nayarit', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Specialty', true, 5),
('ZPT-5', 'Zapote Negro 5lb', 'Zapote Negro 5lb', 'Tropical', 'Black Sapote', 'Zapote Negro', 'Mexico', 'Veracruz, Chiapas', 'Oct-Feb', 'Oct-Feb', 'case', '5lb', false, true, 'Sapote', true, 5),
('HCL-5', 'Huachinango Cactus Leaf 5lb', 'Verdolaga 5lb', 'Specialty', 'Purslane/Verdolaga', 'Verdolaga', 'Mexico', 'Mexico State, Puebla', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Specialty', true, 3),
('QUL-10', 'Quelite/Wild Greens 10lb', 'Quelites 10lb', 'Specialty', 'Mixed Wild Greens', 'Quelites Mixtos', 'Mexico', 'Oaxaca, Puebla', 'Jun-Oct', 'Jun-Oct', 'case', '10lb', false, true, 'Specialty', true, 3),
('FLZ-5', 'Flor de Calabaza 5lb', 'Flor de Calabaza 5lb', 'Specialty', 'Squash Blossoms', 'Flor de Calabaza', 'Mexico', 'Puebla, Mexico State', 'Jun-Oct', 'Jun-Oct', 'case', '5lb', false, true, 'Specialty', true, 2),
('HUT-5', 'Huitlacoche 5lb', 'Huitlacoche 5lb', 'Specialty', 'Corn Truffle', 'Huitlacoche', 'Mexico', 'Puebla, Tlaxcala', 'Jul-Sep', 'Jul-Sep', 'case', '5lb', false, true, 'Specialty', true, 3),
('CHM-5', 'Chamomile Fresh 5lb', 'Manzanilla Fresca 5lb', 'Herbs', 'Fresh Chamomile', 'Manzanilla Fresca', 'Mexico', 'Puebla', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Herbs', true, 5),
('RDA-5', 'Ruda/Rue 5lb', 'Ruda 5lb', 'Herbs', 'Fresh Rue', 'Ruda Fresca', 'Mexico', 'Puebla, Oaxaca', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Herbs', true, 7),
('PIH-10', 'Pipicha/Pepicha 10ct', 'Pipicha 10ct', 'Herbs', 'Fresh Pipicha', 'Pipicha Fresca', 'Mexico', 'Oaxaca, Puebla', 'Year-round', 'Todo el ano', 'case', '10 bunches', false, true, 'Herbs', true, 3)

ON CONFLICT (sku) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- FINAL COUNT
-- ═══════════════════════════════════════════════════════════════
SELECT COUNT(*) AS total_products FROM product_catalog;
SELECT category, COUNT(*) as count FROM product_catalog GROUP BY category ORDER BY count DESC;
-- ═══════════════════════════════════════════════════════════════
-- AUDITDNA PRODUCT CATALOG - PART 3 (75+ MORE to hit 500+)
-- Run AFTER products_500.sql and products_500_part2.sql
-- ═══════════════════════════════════════════════════════════════

INSERT INTO product_catalog (sku, product_name, product_name_es, category, varieties, varieties_es, origin_country, origin_regions, seasonality, seasonality_es, unit_type, pack_sizes, organic_available, conventional_available, usda_commodity_name, cold_chain_required, shelf_life_days) VALUES

-- ═══════════════════════════════════════════════════════════════
-- STONE FRUIT - Mexico & LATAM (12)
-- ═══════════════════════════════════════════════════════════════
('PCH-MX-25', 'Peaches Mexico 25lb', 'Durazno Mexico 25lb', 'Stone Fruit', 'Yellow, White', 'Amarillo, Blanco', 'Mexico', 'Chihuahua, Zacatecas, Puebla', 'May-Sep', 'May-Sep', 'case', '25lb', false, true, 'Peaches', true, 10),
('PLM-MX-25', 'Plums Mexico 25lb', 'Ciruela Mexico 25lb', 'Stone Fruit', 'Red, Black', 'Roja, Negra', 'Mexico', 'Chihuahua, Puebla', 'Jun-Sep', 'Jun-Sep', 'case', '25lb', false, true, 'Plums', true, 14),
('NCT-MX-25', 'Nectarines Mexico 25lb', 'Nectarina Mexico 25lb', 'Stone Fruit', 'Yellow', 'Amarillo', 'Mexico', 'Chihuahua', 'Jun-Aug', 'Jun-Ago', 'case', '25lb', false, true, 'Nectarines', true, 10),
('PCH-CHL-WHT-25', 'White Peaches Chile 25lb', 'Durazno Blanco Chile 25lb', 'Stone Fruit', 'White Flesh', 'Pulpa Blanca', 'Chile', 'OHiggins, Maule', 'Dec-Mar', 'Dic-Mar', 'case', '25lb', false, true, 'Peaches', true, 10),
('PLM-CHL-BLK-25', 'Black Plums Chile 25lb', 'Ciruela Negra Chile 25lb', 'Stone Fruit', 'Angeleno, Black Amber', 'Angeleno, Black Amber', 'Chile', 'OHiggins', 'Jan-Mar', 'Ene-Mar', 'case', '25lb', false, true, 'Plums', true, 14),
('CHR-CHL-RNR-18', 'Rainier Cherries Chile 18lb', 'Cerezas Rainier Chile 18lb', 'Stone Fruit', 'Rainier', 'Rainier', 'Chile', 'OHiggins', 'Dec-Jan', 'Dic-Ene', 'case', '18lb', false, true, 'Cherries', true, 10),
('CHR-CHL-LPN-18', 'Lapin Cherries Chile 18lb', 'Cerezas Lapin Chile 18lb', 'Stone Fruit', 'Lapin', 'Lapin', 'Chile', 'OHiggins, Maule', 'Dec-Feb', 'Dic-Feb', 'case', '18lb', false, true, 'Cherries', true, 14),
('CHR-ARG-18', 'Cherries Argentina 18lb', 'Cerezas Argentina 18lb', 'Stone Fruit', 'Bing, Sweetheart', 'Bing, Sweetheart', 'Argentina', 'Mendoza, Patagonia', 'Dec-Feb', 'Dic-Feb', 'case', '18lb', false, true, 'Cherries', true, 14),
('KWI-CHL-GLD-25', 'Golden Kiwi Chile 25lb', 'Kiwi Dorado Chile 25lb', 'Stone Fruit', 'SunGold', 'Dorado', 'Chile', 'Maule', 'May-Sep', 'May-Sep', 'case', '25lb', false, true, 'Kiwi', true, 21),
('FIG-MX-5', 'Fresh Figs Mexico 5lb', 'Higos Frescos 5lb', 'Stone Fruit', 'Black Mission, Kadota', 'Mision, Kadota', 'Mexico', 'Baja California, Sonora', 'Jun-Oct', 'Jun-Oct', 'case', '5lb', false, true, 'Figs', true, 5),
('PMG-CHL-30', 'Pomegranate Chile 30lb', 'Granada Chile 30lb', 'Stone Fruit', 'Wonderful', 'Wonderful', 'Chile', 'Atacama, Coquimbo', 'Mar-Jun', 'Mar-Jun', 'case', '30lb', false, true, 'Pomegranates', true, 30),
('PMG-MX-30', 'Pomegranate Mexico 30lb', 'Granada Mexico 30lb', 'Stone Fruit', 'Wonderful, Sweet', 'Wonderful, Dulce', 'Mexico', 'Sonora, Hidalgo', 'Sep-Dec', 'Sep-Dic', 'case', '30lb', false, true, 'Pomegranates', true, 30),

-- ═══════════════════════════════════════════════════════════════
-- POME FRUIT Expanded (8)
-- ═══════════════════════════════════════════════════════════════
('APL-CHL-GAL-40', 'Gala Apple Chile 40lb', 'Manzana Gala Chile 40lb', 'Pome Fruit', 'Gala', 'Gala', 'Chile', 'OHiggins, Maule', 'Mar-Sep', 'Mar-Sep', 'case', '40lb', false, true, 'Apples', true, 60),
('APL-CHL-FUJ-40', 'Fuji Apple Chile 40lb', 'Manzana Fuji Chile 40lb', 'Pome Fruit', 'Fuji', 'Fuji', 'Chile', 'OHiggins', 'Apr-Oct', 'Abr-Oct', 'case', '40lb', false, true, 'Apples', true, 60),
('APL-CHL-GRN-40', 'Granny Smith Apple Chile 40lb', 'Manzana Verde Chile 40lb', 'Pome Fruit', 'Granny Smith', 'Granny Smith', 'Chile', 'OHiggins, Maule', 'Mar-Sep', 'Mar-Sep', 'case', '40lb', false, true, 'Apples', true, 90),
('APL-ARG-GAL-40', 'Gala Apple Argentina 40lb', 'Manzana Gala Argentina 40lb', 'Pome Fruit', 'Gala', 'Gala', 'Argentina', 'Rio Negro, Neuquen', 'Feb-Aug', 'Feb-Ago', 'case', '40lb', false, true, 'Apples', true, 60),
('APL-ARG-RD-40', 'Red Delicious Apple Argentina 40lb', 'Manzana Red Delicious Argentina 40lb', 'Pome Fruit', 'Red Delicious', 'Red Delicious', 'Argentina', 'Rio Negro', 'Mar-Sep', 'Mar-Sep', 'case', '40lb', false, true, 'Apples', true, 60),
('APL-BRZ-40', 'Gala Apple Brazil 40lb', 'Manzana Gala Brasil 40lb', 'Pome Fruit', 'Gala', 'Gala', 'Brazil', 'Santa Catarina, Rio Grande do Sul', 'Feb-Jul', 'Feb-Jul', 'case', '40lb', false, true, 'Apples', true, 60),
('PER-CHL-BTL-40', 'Bartlett Pear Chile 40lb', 'Pera Bartlett Chile 40lb', 'Pome Fruit', 'Bartlett', 'Bartlett', 'Chile', 'OHiggins', 'Feb-Jun', 'Feb-Jun', 'case', '40lb', false, true, 'Pears', true, 45),
('PER-CHL-BSC-40', 'Bosc Pear Chile 40lb', 'Pera Bosc Chile 40lb', 'Pome Fruit', 'Bosc', 'Bosc', 'Chile', 'OHiggins, Maule', 'Mar-Jul', 'Mar-Jul', 'case', '40lb', false, true, 'Pears', true, 45),

-- ═══════════════════════════════════════════════════════════════
-- EXPANDED PEPPERS - More origins & dried (10)
-- ═══════════════════════════════════════════════════════════════
('PEP-MOR-10', 'Morita Dried 10lb', 'Chile Morita Seco 10lb', 'Peppers', 'Morita Dried', 'Morita Seco', 'Mexico', 'Chihuahua, Veracruz', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', false, 180),
('PEP-CAS-5', 'Cascabel Dried 5lb', 'Chile Cascabel Seco 5lb', 'Peppers', 'Cascabel Dried', 'Cascabel Seco', 'Mexico', 'Durango, Zacatecas', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Peppers', false, 180),
('PEP-MUL-10', 'Mulato Dried 10lb', 'Chile Mulato Seco 10lb', 'Peppers', 'Mulato Dried', 'Mulato Seco', 'Mexico', 'Guanajuato, Puebla', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', false, 180),
('PEP-NM-10', 'New Mexico Dried 10lb', 'Chile Nuevo Mexico Seco 10lb', 'Peppers', 'New Mexico/California Dried', 'Nuevo Mexico Seco', 'Mexico', 'Chihuahua, Durango', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', false, 180),
('PEP-PQN-DRY-2', 'Piquin Dried 2lb', 'Chile Piquin Seco 2lb', 'Peppers', 'Piquin Dried', 'Piquin Seco', 'Mexico', 'Sonora, Tamaulipas', 'Year-round', 'Todo el ano', 'case', '2lb', false, true, 'Peppers', false, 365),
('PEP-TAB-10', 'Tabasco Pepper 10lb', 'Chile Tabasco 10lb', 'Peppers', 'Tabasco Fresh', 'Tabasco Fresco', 'Mexico', 'Tabasco, Chiapas', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', true, 14),
('PEP-CHT-10', 'Chiltepin Fresh 10lb', 'Chile Chiltepin 10lb', 'Peppers', 'Chiltepin', 'Chiltepin', 'Mexico', 'Sonora, Sinaloa', 'Sep-Dec', 'Sep-Dic', 'case', '10lb', false, true, 'Peppers', true, 7),
('PEP-GUR-10', 'Guero Pepper 10lb', 'Chile Guero 10lb', 'Peppers', 'Guero/Banana', 'Guero/Banana', 'Mexico', 'Sinaloa, Sonora', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', true, 14),
('PEP-CHP-10', 'Chilaca Pepper 10lb', 'Chile Chilaca 10lb', 'Peppers', 'Chilaca Fresh', 'Chilaca Fresco', 'Mexico', 'Guanajuato, Aguascalientes', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Peppers', true, 10),
('PEP-COL-AJI-5', 'Aji Amarillo 5lb', 'Aji Amarillo 5lb', 'Peppers', 'Aji Amarillo', 'Aji Amarillo', 'Peru', 'Ica, Lima', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Peppers', true, 14),

-- ═══════════════════════════════════════════════════════════════
-- MORE CUCUMBERS & SQUASH ORIGINS (8)
-- ═══════════════════════════════════════════════════════════════
('CUC-ORG-ENG-12', 'Organic English Cucumber 12ct', 'Pepino Ingles Organico 12ct', 'Cucumbers', 'English Organic', 'Ingles Organico', 'Mexico', 'Baja California', 'Year-round', 'Todo el ano', 'case', '12ct wrapped', true, false, 'Cucumbers', true, 10),
('CUC-ORG-SLC-24', 'Organic Slicer Cucumber 24ct', 'Pepino Organico 24ct', 'Cucumbers', 'Slicer Organic', 'Americano Organico', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '24ct', true, false, 'Cucumbers', true, 10),
('CUC-ARM-10', 'Armenian Cucumber 10lb', 'Pepino Armenio 10lb', 'Cucumbers', 'Armenian/Serpent', 'Armenio/Serpiente', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Cucumbers', true, 7),
('SQU-PTY-20', 'Pattypan Squash 20lb', 'Calabaza Pattypan 20lb', 'Squash', 'Pattypan/Scallop', 'Pattypan', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '20lb', false, true, 'Squash', true, 10),
('SQU-DLC-35', 'Delicata Squash 35lb', 'Calabaza Delicata 35lb', 'Squash', 'Delicata', 'Delicata', 'Mexico', 'Sonora', 'Sep-Mar', 'Sep-Mar', 'case', '35lb', false, true, 'Squash', false, 30),
('SQU-PMP-35', 'Pumpkin 35lb', 'Calabaza de Castilla 35lb', 'Squash', 'Sugar Pie, Cinderella', 'Castilla, Cenicienta', 'Mexico', 'Sonora, Chihuahua', 'Sep-Dec', 'Sep-Dic', 'case', '35lb', false, true, 'Pumpkins', false, 60),
('SQU-ORG-YEL-20', 'Organic Yellow Squash 20lb', 'Calabaza Amarilla Organica 20lb', 'Squash', 'Yellow Organic', 'Amarilla Organica', 'Mexico', 'Sinaloa', 'Year-round', 'Todo el ano', 'case', '20lb', true, false, 'Squash', true, 10),
('SQU-LUF-10', 'Luffa/Estropajo 10lb', 'Estropajo 10lb', 'Squash', 'Luffa/Chinese Okra', 'Estropajo', 'Mexico', 'Sinaloa, Nayarit', 'Jun-Oct', 'Jun-Oct', 'case', '10lb', false, true, 'Squash', true, 7),

-- ═══════════════════════════════════════════════════════════════
-- MORE FROZEN & VALUE-ADD (10)
-- ═══════════════════════════════════════════════════════════════
('FRZ-AVO-GUAC-6', 'Frozen Guacamole 6x2lb', 'Guacamole Congelado 6x2lb', 'Frozen', 'HPP Guacamole', 'Guacamole HPP', 'Mexico', 'Michoacan', 'Year-round', 'Todo el ano', 'case', '6x2lb', false, true, 'Avocados', true, 365),
('FRZ-AVO-CHUNK-12', 'Frozen Avocado Chunks 12x1lb', 'Aguacate Trozos Congelado 12x1lb', 'Frozen', 'IQF Chunks', 'IQF Trozos', 'Mexico', 'Michoacan', 'Year-round', 'Todo el ano', 'case', '12x1lb', true, true, 'Avocados', true, 365),
('FRZ-BAN-30', 'Frozen Banana Slices 30lb', 'Platano Congelado Rebanado 30lb', 'Frozen', 'IQF Slices', 'IQF Rebanadas', 'Mexico', 'Chiapas', 'Year-round', 'Todo el ano', 'case', '30lb', true, true, 'Bananas', true, 365),
('FRZ-PAP-30', 'Frozen Papaya Chunks 30lb', 'Papaya Congelada Trozos 30lb', 'Frozen', 'IQF Chunks', 'IQF Trozos', 'Mexico', 'Chiapas', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Papayas', true, 365),
('FRZ-MXB-30', 'Frozen Mixed Berries 30lb', 'Berries Mixtos Congelados 30lb', 'Frozen', 'IQF Strawberry, Blueberry, Raspberry', 'IQF Fresa, Arandano, Frambuesa', 'Mexico', 'Baja California, Jalisco', 'Year-round', 'Todo el ano', 'case', '30lb', true, true, 'Berries', true, 365),
('FRZ-MXF-30', 'Frozen Tropical Mix 30lb', 'Mix Tropical Congelado 30lb', 'Frozen', 'IQF Mango, Pineapple, Papaya', 'IQF Mango, Pina, Papaya', 'Mexico', 'Sinaloa, Chiapas', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Tropical', true, 365),
('FRZ-LIM-GAL', 'Frozen Lime Juice Gallon', 'Jugo Limon Congelado Galon', 'Frozen', 'Fresh Squeezed Frozen', 'Recien Exprimido Congelado', 'Mexico', 'Veracruz', 'Year-round', 'Todo el ano', 'jug', '1 gallon', false, true, 'Limes', true, 365),
('FRZ-CHR-CHL-30', 'Frozen Cherries Chile 30lb', 'Cerezas Congeladas Chile 30lb', 'Frozen', 'IQF Pitted', 'IQF Deshuesada', 'Chile', 'OHiggins', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Cherries', true, 365),
('FRZ-PCH-CHL-30', 'Frozen Peach Slices Chile 30lb', 'Durazno Congelado Chile 30lb', 'Frozen', 'IQF Slices', 'IQF Rebanadas', 'Chile', 'OHiggins, Maule', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Peaches', true, 365),
('FRZ-GRP-CHL-30', 'Frozen Grape Halves Chile 30lb', 'Uva Congelada Chile 30lb', 'Frozen', 'IQF Halves', 'IQF Mitades', 'Chile', 'Atacama', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Grapes', true, 365),

-- ═══════════════════════════════════════════════════════════════
-- NUTS & SEEDS - Mexico (8)
-- ═══════════════════════════════════════════════════════════════
('PEC-30', 'Pecans In-Shell 30lb', 'Nuez Pecanera con Cascara 30lb', 'Nuts', 'Western Schley, Wichita', 'Western Schley, Wichita', 'Mexico', 'Chihuahua, Sonora, Coahuila', 'Oct-Jan', 'Oct-Ene', 'sack', '30lb', false, true, 'Pecans', false, 180),
('PEC-SHL-25', 'Pecan Halves Shelled 25lb', 'Nuez Pecanera Mitades 25lb', 'Nuts', 'Halves', 'Mitades', 'Mexico', 'Chihuahua, Sonora', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Pecans', true, 120),
('PEC-PCS-25', 'Pecan Pieces 25lb', 'Nuez Pecanera Trozos 25lb', 'Nuts', 'Pieces', 'Trozos', 'Mexico', 'Chihuahua', 'Year-round', 'Todo el ano', 'case', '25lb', false, true, 'Pecans', true, 120),
('MAC-25', 'Macadamia In-Shell 25lb', 'Macadamia con Cascara 25lb', 'Nuts', 'In-Shell', 'Con Cascara', 'Mexico', 'Chiapas, Veracruz, Puebla', 'Year-round', 'Todo el ano', 'sack', '25lb', false, true, 'Macadamia', false, 180),
('MAC-SHL-10', 'Macadamia Shelled 10lb', 'Macadamia Pelada 10lb', 'Nuts', 'Shelled Whole', 'Pelada Entera', 'Mexico', 'Chiapas', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Macadamia', true, 120),
('PNT-50', 'Peanuts Raw 50lb', 'Cacahuate Crudo 50lb', 'Nuts', 'Virginia, Runner', 'Virginia, Runner', 'Mexico', 'Chihuahua, Sinaloa, Oaxaca', 'Year-round', 'Todo el ano', 'sack', '50lb', false, true, 'Peanuts', false, 180),
('PEP-SED-10', 'Pepita/Pumpkin Seed 10lb', 'Pepita 10lb', 'Nuts', 'Hulled Green', 'Verde Sin Cascara', 'Mexico', 'Campeche, Yucatan, Chiapas', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Seeds', false, 180),
('CHI-SED-10', 'Chia Seed 10lb', 'Chia 10lb', 'Nuts', 'Black, White', 'Negra, Blanca', 'Mexico', 'Jalisco, Puebla, Oaxaca', 'Year-round', 'Todo el ano', 'case', '10lb', true, true, 'Seeds', false, 365),

-- ═══════════════════════════════════════════════════════════════
-- ADDITIONAL SPECIALTY MEXICAN PRODUCE (10)
-- ═══════════════════════════════════════════════════════════════
('CHP-10', 'Chayote Root/Chinchayote 10lb', 'Chinchayote 10lb', 'Specialty', 'Chayote Root', 'Raiz de Chayote', 'Mexico', 'Veracruz, Michoacan', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Specialty', true, 14),
('HJV-5', 'Hoja de Aguacate 5lb', 'Hoja de Aguacate 5lb', 'Specialty', 'Avocado Leaf', 'Hoja de Aguacate', 'Mexico', 'Puebla, Oaxaca', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Specialty', true, 10),
('PIH-CHP-10', 'Chipilin 10ct', 'Chipilin 10ct', 'Herbs', 'Fresh Chipilin', 'Chipilin Fresco', 'Mexico', 'Chiapas, Tabasco', 'Year-round', 'Todo el ano', 'case', '10 bunches', false, true, 'Herbs', true, 3),
('VRD-5', 'Verdolaga/Purslane 5lb', 'Verdolaga 5lb', 'Specialty', 'Purslane', 'Verdolaga', 'Mexico', 'Mexico State, Puebla', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Specialty', true, 3),
('CAM-10', 'Camote Morado 10lb', 'Camote Morado 10lb', 'Root Vegetables', 'Purple Sweet Potato', 'Camote Morado', 'Mexico', 'Guanajuato, Michoacan', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Sweet Potatoes', true, 30),
('MLC-10', 'Malanga/Taro 10lb', 'Malanga 10lb', 'Root Vegetables', 'Malanga Blanca, Lila', 'Blanca, Lila', 'Mexico', 'Tabasco, Veracruz', 'Year-round', 'Todo el ano', 'case', '10lb', false, true, 'Specialty', false, 21),
('CHN-5', 'Chiles en Nogada Mix 5lb', 'Mezcla Chile en Nogada 5lb', 'Specialty', 'Poblano, Walnut, Pomegranate, Parsley', 'Poblano, Nuez, Granada, Perejil', 'Mexico', 'Puebla', 'Aug-Sep', 'Ago-Sep', 'case', '5lb kit', false, true, 'Specialty', true, 5),
('MZQ-5', 'Mezquite Pod 5lb', 'Vaina de Mezquite 5lb', 'Specialty', 'Mesquite Pod/Dried', 'Vaina Mezquite', 'Mexico', 'Sonora, Chihuahua', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Specialty', false, 365),
('AML-5', 'Amaranth Greens 5lb', 'Quelite de Amaranto 5lb', 'Specialty', 'Fresh Amaranth Leaf', 'Hoja de Amaranto', 'Mexico', 'Puebla, Oaxaca', 'Jun-Oct', 'Jun-Oct', 'case', '5lb', false, true, 'Specialty', true, 3),
('PAZ-5', 'Papaloquelite 5lb', 'Papaloquelite 5lb', 'Herbs', 'Fresh Papaloquelite', 'Papaloquelite Fresco', 'Mexico', 'Puebla, Oaxaca', 'Year-round', 'Todo el ano', 'case', '5lb', false, true, 'Herbs', true, 3)

ON CONFLICT (sku) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- FINAL COUNT
-- ═══════════════════════════════════════════════════════════════
SELECT COUNT(*) AS total_products FROM product_catalog;
SELECT category, COUNT(*) as count FROM product_catalog GROUP BY category ORDER BY count DESC;
SELECT origin_country, COUNT(*) as count FROM product_catalog GROUP BY origin_country ORDER BY count DESC;