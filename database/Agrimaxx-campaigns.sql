-- ============================================================================
-- AGRI-MAXX CAMPAIGN TEMPLATES
-- AuditDNA Platform | CM Products International | MexaUSA Food Group
-- 7 Bilingual Email Templates: Track A (4) + Track B (3)
-- PostgreSQL
-- ============================================================================

INSERT INTO agrimaxx_campaigns
(campaign_id, track, sequence_order, theme, send_delay_days,
 subject_en, preheader_en, body_en, cta_en,
 subject_es, preheader_es, body_es, cta_es,
 target_segments, target_crops, target_tiers)
VALUES

-- ============================================================================
-- TRACK A — GROWER CAMPAIGNS
-- ============================================================================

-- A1: AWARENESS — Day 0
(
'A1', 'A', 1, 'Awareness', 0,

-- ENGLISH
'The Water Technology Quietly Changing Agriculture',
'Farmers across North America are reducing inputs and increasing yields.',
'Dear [FIRST_NAME],

Water is becoming the most critical input in modern agriculture — and the most expensive to waste.

Farmers across the USA, Mexico, and Latin America are adopting a technology that restructures water at the molecular level using controlled electrical frequencies, improving how water moves through soil and plant systems.

The results reported by growers:

  - Up to 20% reduction in water consumption
  - Up to 20% reduction in fertilizer and chemical usage
  - Improved crop yield and quality
  - Reduced mineral scale in irrigation lines
  - Healthier root zones and soil absorption

This is the Agri-Maxx Water Energy System.

Through the AuditDNA intelligence platform, we can run a free Farm Efficiency Analysis for your operation — estimating your potential water savings, input cost reduction, and yield improvement in minutes.

No commitment required. Just data.

CM Products International works with growers across the USA and Mexico supply chain. We know your costs, your pressures, and what actually moves the needle on a farm.

Request your free Farm Efficiency Analysis today.

Best regards,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com
NMLS #337526',
'Request Your Free Farm Analysis',

-- SPANISH
'La tecnologia de agua que esta cambiando la agricultura',
'Productores en Norteamerica estan reduciendo insumos y aumentando rendimientos.',
'Estimado/a [FIRST_NAME],

El agua se esta convirtiendo en el insumo mas critico y costoso en la agricultura moderna.

Productores en Estados Unidos, Mexico y America Latina estan adoptando una tecnologia que reestructura el agua a nivel molecular usando frecuencias electricas controladas, mejorando como el agua se mueve a traves del suelo y los sistemas de riego.

Resultados reportados por productores:

  - Hasta 20% de reduccion en consumo de agua
  - Hasta 20% de reduccion en fertilizantes y quimicos
  - Mayor rendimiento y calidad del cultivo
  - Reduccion de incrustaciones minerales en tuberias
  - Mejor absorcion en zona radicular y suelo

Este es el Sistema de Energia de Agua Agri-Maxx.

A traves de la plataforma AuditDNA podemos realizar un Analisis de Eficiencia para su operacion — estimando su ahorro potencial en agua, reduccion de costos de insumos y mejora de rendimiento en minutos.

Sin compromiso. Solo datos.

CM Products International trabaja con productores en la cadena de suministro de Estados Unidos y Mexico. Conocemos sus costos, sus presiones y lo que realmente hace la diferencia en el campo.

Solicite su Analisis de Eficiencia gratuito hoy.

Saludos,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com',
'Solicitar Analisis de Eficiencia Gratuito',

ARRAY['Grower','Shipper','Packer','Nursery','Greenhouse','OrganicFarm'],
ARRAY['Avocado','Berries','Strawberries','Blueberries','Table Grapes','Citrus','Almonds','Tomatoes','Mixed'],
ARRAY[1,2]
),

-- A2: ECONOMIC IMPACT — Day 7
(
'A2', 'A', 2, 'Economic Impact', 7,

-- ENGLISH
'How Much Profit Is Your Irrigation System Leaving on the Table?',
'We ran the numbers on a 100-acre farm. The results are compelling.',
'Dear [FIRST_NAME],

Let us share some numbers.

On a standard 100-acre operation, here is what growers are seeing after adopting the Agri-Maxx Water Energy System:

  WATER SAVINGS
  Current usage reduced by up to 20%
  At $150/acre-foot, that is $3,000 - $6,000 in savings per season

  FERTILIZER AND CHEMICAL REDUCTION
  20% reduction in applied inputs
  On $40,000 in annual input costs, that is $8,000 back in your pocket

  YIELD IMPROVEMENT
  10 to 20% improvement in crop yield and quality
  On a $1,200/acre crop value, that adds $120 to $240 per acre
  On 100 acres: $12,000 to $24,000 in additional revenue

  COMBINED ESTIMATED BENEFIT: $300 to $1,200 per acre per season

This is not a projection — these are results reported by growers who have installed the system.

The Agri-Maxx system also removes mineral scale from irrigation lines, which improves pump efficiency and reduces maintenance costs.

AuditDNA can calculate your farm-specific ROI estimate using your actual acreage, crop type, water cost, and input spend.

Your numbers will be different from the example above — they might be better.

Request your personalized Farm ROI Analysis today. It takes under 5 minutes.

Best regards,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com',
'Get My Farm ROI Analysis',

-- SPANISH
'Cuanto dinero esta dejando en el campo su sistema de riego?',
'Calculamos los numeros para una operacion de 100 hectareas. Los resultados son convincentes.',
'Estimado/a [FIRST_NAME],

Permita que compartamos algunos numeros.

En una operacion tipica de 100 hectareas, esto es lo que estan obteniendo los productores que adoptaron el Sistema Agri-Maxx:

  AHORRO EN AGUA
  Reduccion de hasta 20% en consumo
  A $150/hectarea, eso representa $3,000 - $6,000 en ahorro por temporada

  REDUCCION DE FERTILIZANTES Y QUIMICOS
  20% menos en insumos aplicados
  En $40,000 de gasto anual, eso es $8,000 de regreso a su bolsillo

  MEJORA EN RENDIMIENTO
  10 a 20% de mejora en rendimiento y calidad
  En un cultivo valorado en $1,200/hectarea, eso agrega $120 a $240 por hectarea
  En 100 hectareas: $12,000 a $24,000 en ingresos adicionales

  BENEFICIO ESTIMADO TOTAL: $300 a $1,200 por hectarea por temporada

Esto no es una proyeccion — son resultados reportados por productores que ya instalaron el sistema.

El sistema Agri-Maxx tambien elimina incrustaciones minerales en tuberias, mejorando la eficiencia de bombas y reduciendo costos de mantenimiento.

AuditDNA puede calcular el retorno de inversion especifico para su operacion usando sus hectareas reales, tipo de cultivo, costo del agua y gasto en insumos.

Sus numeros seran diferentes al ejemplo — podrian ser mejores.

Solicite su Analisis de ROI personalizado hoy. Toma menos de 5 minutos.

Saludos,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com',
'Obtener Mi Analisis de ROI',

ARRAY['Grower','Shipper','Packer','Nursery','Greenhouse','OrganicFarm'],
ARRAY['Avocado','Berries','Strawberries','Blueberries','Table Grapes','Citrus','Almonds','Tomatoes','Mixed'],
ARRAY[1,2]
),

-- A3: CASE STUDIES — Day 18
(
'A3', 'A', 3, 'Case Studies', 18,

-- ENGLISH
'Real Growers. Real Results. Real Numbers.',
'See what farms in your region are reporting after installation.',
'Dear [FIRST_NAME],

We want to show you what growers are actually reporting after installing the Agri-Maxx Water Energy System.

AVOCADO OPERATION — MICHOACAN, MEXICO
  Before: Heavy mineral scale in drip lines, 30% plugged emitters
  After:  Scale reduced, emitters restored to full flow
  Result: 18% reduction in water consumption, 15% yield improvement

STRAWBERRY FARM — BAJA CALIFORNIA
  Before: High chemical input costs, inconsistent fruit size
  After:  Reduced sanitizer demand, improved water absorption
  Result: 22% reduction in chemical costs, improved grade-out

GREENHOUSE TOMATO OPERATION — SINALOA
  Before: Hard water damaging hydroponic system, high filter maintenance
  After:  Scale buildup reduced significantly
  Result: 20% lower maintenance costs, improved plant health

CITRUS GROWER — SONORA, MEXICO
  Before: Irrigation system underperforming due to mineral deposits
  After:  Water flow restored, reduced pumping energy
  Result: $180 per acre in energy savings, improved fruit quality

These results come from growers in the same supply chain you operate in.

The AuditDNA platform analyzed each of these farms before and after — and we can do the same for you.

Your Free Farm Efficiency Report will show:
  - Current estimated water waste
  - Potential fertilizer savings
  - Projected yield improvement
  - Total estimated annual benefit

No installation required to run the analysis.

Best regards,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com',
'Request My Farm Efficiency Report',

-- SPANISH
'Productores reales. Resultados reales. Numeros reales.',
'Vea lo que reportan granjas en su region despues de la instalacion.',
'Estimado/a [FIRST_NAME],

Queremos mostrarle lo que productores realmente estan reportando despues de instalar el Sistema Agri-Maxx.

OPERACION DE AGUACATE — MICHOACAN, MEXICO
  Antes:  Incrustaciones minerales severas en lineas de goteo, 30% de emisores tapados
  Despues: Incrustaciones reducidas, emisores restaurados a flujo completo
  Resultado: 18% de reduccion en consumo de agua, 15% de mejora en rendimiento

FINCA DE FRESA — BAJA CALIFORNIA
  Antes:  Costos altos de insumos quimicos, inconsistencia en tamano de fruta
  Despues: Menor demanda de sanitizantes, mejor absorcion de agua
  Resultado: 22% de reduccion en costos quimicos, mejor seleccion de calidad

OPERACION DE TOMATE EN INVERNADERO — SINALOA
  Antes:  Agua dura danando sistema hidroponico, alto mantenimiento de filtros
  Despues: Acumulacion de minerales reducida significativamente
  Resultado: 20% menos costos de mantenimiento, mejor salud de plantas

PRODUCTOR DE CITRICOS — SONORA, MEXICO
  Antes:  Sistema de riego con bajo rendimiento por depositos minerales
  Despues: Flujo de agua restaurado, menor energia de bombeo
  Resultado: $180 por hectarea en ahorro energetico, mejor calidad de fruta

Estos resultados provienen de productores en la misma cadena de suministro en la que usted opera.

La plataforma AuditDNA analizo cada una de estas granjas antes y despues — y podemos hacer lo mismo por usted.

Su Reporte de Eficiencia Gratuito mostrara:
  - Desperdicio actual estimado de agua
  - Ahorro potencial en fertilizantes
  - Mejora proyectada en rendimiento
  - Beneficio anual total estimado

No se requiere instalacion para correr el analisis.

Saludos,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com',
'Solicitar Mi Reporte de Eficiencia',

ARRAY['Grower','Shipper','Packer','Nursery','Greenhouse','OrganicFarm'],
ARRAY['Avocado','Berries','Strawberries','Blueberries','Table Grapes','Citrus','Almonds','Tomatoes','Mixed'],
ARRAY[1,2,3]
),

-- A4: RISK REVERSAL — Day 30
(
'A4', 'A', 4, 'Risk Reversal', 30,

-- ENGLISH
'Try It Risk Free — 1 Year Satisfaction Guarantee',
'Zero risk. If the system does not perform, you are protected.',
'Dear [FIRST_NAME],

Over the past weeks we have shared data, case studies, and ROI analysis for the Agri-Maxx Water Energy System.

We understand that as a grower, every dollar spent on new technology is a calculated decision.

That is why Agri-Maxx offers a 1-Year Satisfaction Guarantee.

If the system does not deliver measurable results in water efficiency, scale reduction, or input savings on your operation — you are protected.

THE RISK-FREE OFFER:
  - 1-Year satisfaction guarantee
  - No disruption to existing irrigation infrastructure
  - System installs without shutting down operations
  - No recurring monthly fees — one-time installation
  - AuditDNA tracks your before/after performance data

THE NEXT STEP IS SIMPLE:
  1. Request your Free Farm Efficiency Report (5 minutes)
  2. We analyze your operation using AuditDNA data
  3. We show you your estimated annual savings
  4. You decide — with full data in hand

There is no pressure. There is no sales pitch.
This is an intelligence-first approach — the data tells the story.

Request your Free Farm Report today.

Best regards,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com
NMLS #337526',
'Claim My Risk-Free Farm Analysis',

-- SPANISH
'Pruebelo sin riesgo — Garantia de satisfaccion de 1 ano',
'Cero riesgo. Si el sistema no funciona, usted esta protegido.',
'Estimado/a [FIRST_NAME],

Durante las ultimas semanas hemos compartido datos, casos de estudio y analisis de ROI sobre el Sistema Agri-Maxx.

Entendemos que como productor, cada peso invertido en nueva tecnologia es una decision calculada.

Por eso Agri-Maxx ofrece una Garantia de Satisfaccion de 1 Ano.

Si el sistema no entrega resultados medibles en eficiencia de agua, reduccion de incrustaciones o ahorro en insumos en su operacion — usted esta protegido.

LA OFERTA SIN RIESGO:
  - Garantia de satisfaccion de 1 ano
  - Sin interrupcion a su infraestructura de riego existente
  - Instalacion sin necesidad de parar operaciones
  - Sin cuotas mensuales recurrentes — instalacion unica
  - AuditDNA registra sus datos de desempeno antes/despues

EL SIGUIENTE PASO ES SENCILLO:
  1. Solicite su Reporte de Eficiencia Gratuito (5 minutos)
  2. Analizamos su operacion con datos de AuditDNA
  3. Le mostramos sus ahorros anuales estimados
  4. Usted decide — con todos los datos en mano

Sin presion. Sin argumentos de venta.
Este es un enfoque basado en inteligencia — los datos cuentan la historia.

Solicite su Reporte de Granja Gratuito hoy.

Saludos,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com',
'Reclamar Mi Analisis Gratuito sin Riesgo',

ARRAY['Grower','Shipper','Packer','Nursery','Greenhouse','OrganicFarm','Irrigation'],
NULL,
ARRAY[1,2,3]
),

-- ============================================================================
-- TRACK B — PROCESSOR / FACILITY CAMPAIGNS
-- ============================================================================

-- B1: PROCESSING EFFICIENCY — Day 0
(
'B1', 'B', 1, 'Processing Efficiency', 0,

-- ENGLISH
'Reduce Water Treatment Costs in Your Fresh-Cut Processing Operation',
'Processing plants are finding significant operational savings in their water systems.',
'Dear [FIRST_NAME],

Fresh-cut produce processing facilities depend on clean, high-performance water systems to maintain food safety standards and operational efficiency.

The challenge most plant managers know well:

  - Mineral scale building up in wash lines, flumes, and pipelines
  - Increasing chlorine and sanitizer demand to maintain safety levels
  - Pump efficiency losses from scale accumulation
  - Rising water treatment and disposal costs
  - Maintenance downtime for pipe and equipment cleaning

The Agri-Maxx Water Energy System uses controlled electrical frequency treatment to improve water performance throughout processing systems.

Facilities report:
  - Reduction in mineral scale buildup
  - Improved sanitizer efficiency — less chemical required for the same result
  - Better water flow through flumes and wash systems
  - Lower pump energy consumption
  - Reduced maintenance frequency

For a facility processing 50,000 to 500,000 gallons per day, even a 10% improvement in water efficiency and chemical usage represents meaningful operational savings.

Through the AuditDNA platform, we offer a free Processing Plant Water Efficiency Analysis for qualified facilities.

The analysis covers:
  - Daily water consumption baseline
  - Chemical cost per processing cycle
  - Estimated scale impact on system performance
  - Projected annual savings with Agri-Maxx

Request your facility analysis today.

Best regards,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com
NMLS #337526',
'Request My Facility Water Analysis',

-- SPANISH
'Reduzca los costos de tratamiento de agua en su planta de procesamiento',
'Las plantas procesadoras estan encontrando ahorros significativos en sus sistemas de agua.',
'Estimado/a [FIRST_NAME],

Las plantas procesadoras de productos frescos dependen de sistemas de agua limpios y de alto rendimiento para mantener los estandares de inocuidad alimentaria y eficiencia operativa.

El desafio que la mayoria de los gerentes de planta conocen bien:

  - Incrustaciones minerales en lineas de lavado, flumes y tuberias
  - Mayor demanda de cloro y sanitizantes para mantener niveles de seguridad
  - Perdidas de eficiencia en bombas por acumulacion de minerales
  - Costos crecientes de tratamiento y disposicion de agua
  - Tiempo de inactividad por limpieza de tuberias y equipos

El Sistema Agri-Maxx utiliza tratamiento de frecuencia electrica controlada para mejorar el rendimiento del agua en sistemas de procesamiento.

Las plantas reportan:
  - Reduccion en acumulacion de incrustaciones minerales
  - Mejor eficiencia de sanitizantes — menos quimico para el mismo resultado
  - Mejor flujo de agua en flumes y sistemas de lavado
  - Menor consumo de energia en bombas
  - Menor frecuencia de mantenimiento

Para una planta que procesa de 50,000 a 500,000 galones por dia, incluso una mejora del 10% en eficiencia de agua y uso de quimicos representa ahorros operativos significativos.

A traves de la plataforma AuditDNA ofrecemos un Analisis de Eficiencia de Agua gratuito para instalaciones calificadas.

El analisis incluye:
  - Linea base de consumo diario de agua
  - Costo de quimicos por ciclo de procesamiento
  - Impacto estimado de incrustaciones en el rendimiento del sistema
  - Ahorro anual proyectado con Agri-Maxx

Solicite el analisis de su instalacion hoy.

Saludos,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com',
'Solicitar Analisis de Agua de Mi Planta',

ARRAY['FreshCut','Processor','Packer','ColdStorage'],
ARRAY['Lettuce','Mixed Salad','Mixed','Broccoli','Apples','Mixed Veg'],
ARRAY[1,2]
),

-- B2: OPERATIONAL SAVINGS — Day 10
(
'B2', 'B', 2, 'Operational Savings', 10,

-- ENGLISH
'Water Efficiency for High-Volume Produce Processing — The Numbers',
'Here is what facilities your size are saving after implementation.',
'Dear [FIRST_NAME],

We want to share operational data from fresh-cut processing facilities that have implemented the Agri-Maxx Water Energy System.

MEDIUM FACILITY — 80,000 GALLONS/DAY USAGE
  Monthly chemical spend:     $28,000
  After Agri-Maxx (est 18%):  $22,960  |  SAVINGS: $5,040/month
  Annual chemical savings:    $60,480

  Monthly water/disposal:     $14,000
  After Agri-Maxx (est 15%):  $11,900  |  SAVINGS: $2,100/month
  Annual water savings:       $25,200

  COMBINED ESTIMATED ANNUAL BENEFIT: $85,680

LARGE FACILITY — 300,000 GALLONS/DAY USAGE
  Monthly chemical spend:     $95,000
  After Agri-Maxx (est 18%):  $77,900  |  SAVINGS: $17,100/month
  Annual savings:             $205,200

  Monthly water/disposal:     $52,000
  After Agri-Maxx (est 15%):  $44,200  |  SAVINGS: $7,800/month
  Annual savings:             $93,600

  COMBINED ESTIMATED ANNUAL BENEFIT: $298,800

Additional operational benefits:
  - Reduced pump maintenance and replacement frequency
  - Improved wash system performance
  - Reduced pipe descaling labor and downtime
  - Better water quality supporting food safety outcomes

The AuditDNA platform calculates facility-specific projections using your actual daily volume, chemical spend, and water costs.

Schedule a 20-minute processing plant analysis consultation with our team.

Best regards,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com',
'Schedule My Plant Consultation',

-- SPANISH
'Eficiencia del agua para procesamiento de alto volumen — Los numeros',
'Esto es lo que estan ahorrando instalaciones de su tamano despues de la implementacion.',
'Estimado/a [FIRST_NAME],

Queremos compartir datos operativos de plantas procesadoras de productos frescos que han implementado el Sistema Agri-Maxx.

PLANTA MEDIANA — 80,000 GALONES/DIA
  Gasto mensual en quimicos:      $28,000
  Despues de Agri-Maxx (est 18%): $22,960  |  AHORRO: $5,040/mes
  Ahorro anual en quimicos:       $60,480

  Agua/disposicion mensual:       $14,000
  Despues de Agri-Maxx (est 15%): $11,900  |  AHORRO: $2,100/mes
  Ahorro anual en agua:           $25,200

  BENEFICIO ANUAL ESTIMADO COMBINADO: $85,680

PLANTA GRANDE — 300,000 GALONES/DIA
  Gasto mensual en quimicos:      $95,000
  Despues de Agri-Maxx (est 18%): $77,900  |  AHORRO: $17,100/mes
  Ahorro anual:                   $205,200

  Agua/disposicion mensual:       $52,000
  Despues de Agri-Maxx (est 15%): $44,200  |  AHORRO: $7,800/mes
  Ahorro anual:                   $93,600

  BENEFICIO ANUAL ESTIMADO COMBINADO: $298,800

Beneficios operativos adicionales:
  - Menor frecuencia de mantenimiento y reemplazo de bombas
  - Mejor rendimiento de sistemas de lavado
  - Menor mano de obra y tiempo de inactividad por limpieza de tuberias
  - Mejor calidad del agua apoyando resultados de inocuidad alimentaria

La plataforma AuditDNA calcula proyecciones especificas para su instalacion usando su volumen diario real, gasto en quimicos y costos de agua.

Programe una consulta de analisis de planta de 20 minutos con nuestro equipo.

Saludos,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com',
'Programar Mi Consulta de Planta',

ARRAY['FreshCut','Processor','Packer','ColdStorage'],
ARRAY['Lettuce','Mixed Salad','Mixed','Broccoli','Apples','Mixed Veg'],
ARRAY[1,2]
),

-- B3: SUSTAINABILITY / ESG — Day 21
(
'B3', 'B', 3, 'Sustainability', 21,

-- ENGLISH
'Lower Your Water Footprint in Produce Processing — ESG Reporting Ready',
'Water reduction metrics that satisfy sustainability reporting requirements.',
'Dear [FIRST_NAME],

Fresh-cut produce processing companies face increasing pressure from retail buyers, investors, and regulators on Environmental, Social, and Governance (ESG) performance.

Water footprint reduction is now one of the top metrics evaluated in sustainability audits and retail supplier scorecards.

THE CHALLENGE FOR PROCESSORS:
  - Major retailers (Walmart, Costco, Kroger, Whole Foods) require documented sustainability performance
  - Water consumption per unit of product is a tracked metric
  - Wastewater discharge regulations are tightening in California, Arizona, and Mexico
  - Consumer brands are publishing water reduction commitments

THE AGRI-MAXX ADVANTAGE FOR ESG:
  - Documented water consumption reduction (measurable, reportable)
  - Reduced chemical usage — lower environmental load on discharge
  - Improved water system performance without infrastructure replacement
  - AuditDNA tracks before/after data for your ESG reporting

WHAT AuditDNA PROVIDES:
  - Processing Plant Water Intelligence Report
  - Gallons reduced per day / month / year
  - Chemical load reduction documentation
  - Estimated CO2 reduction equivalent
  - ESG-ready data for retail supplier audits

This gives your sustainability officer a quantified, documented improvement to report.

Request your Processing Plant Water Intelligence Report today.

Best regards,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com
NMLS #337526',
'Get My ESG Water Intelligence Report',

-- SPANISH
'Reduzca la huella hidrica de su planta — Listo para reporte ESG',
'Metricas de reduccion de agua que satisfacen los requisitos de reportes de sostenibilidad.',
'Estimado/a [FIRST_NAME],

Las empresas procesadoras de productos frescos enfrentan una presion creciente de compradores minoristas, inversionistas y reguladores en materia de desempeno ambiental, social y de gobernanza (ESG).

La reduccion de la huella hidrica es ahora una de las principales metricas evaluadas en auditorias de sostenibilidad y tarjetas de puntuacion de proveedores minoristas.

EL DESAFIO PARA LAS PROCESADORAS:
  - Los principales minoristas (Walmart, Costco, Kroger, Whole Foods) requieren desempeno de sostenibilidad documentado
  - El consumo de agua por unidad de producto es una metrica rastreada
  - Las regulaciones de descarga de aguas residuales se estan endureciendo en California, Arizona y Mexico
  - Las marcas de consumo estan publicando compromisos de reduccion de agua

LA VENTAJA AGRI-MAXX PARA ESG:
  - Reduccion documentada del consumo de agua (medible, reportable)
  - Reduccion en uso de quimicos — menor carga ambiental en descarga
  - Mejor rendimiento del sistema de agua sin reemplazo de infraestructura
  - AuditDNA registra datos antes/despues para sus reportes ESG

LO QUE AuditDNA PROPORCIONA:
  - Reporte de Inteligencia de Agua para Planta Procesadora
  - Galones reducidos por dia / mes / ano
  - Documentacion de reduccion de carga quimica
  - Reduccion estimada equivalente de CO2
  - Datos listos para ESG para auditorias de proveedores minoristas

Esto le da a su responsable de sostenibilidad una mejora cuantificada y documentada para reportar.

Solicite su Reporte de Inteligencia de Agua hoy.

Saludos,
Saul Garcia
CEO | CM Products International | MexaUSA Food Group
Saul@mexausafg.com',
'Obtener Mi Reporte ESG de Agua',

ARRAY['FreshCut','Processor','Packer'],
ARRAY['Lettuce','Mixed Salad','Mixed','Broccoli','Apples','Mixed Veg'],
ARRAY[1,2,3]
);

-- ============================================================================
-- VERIFY TEMPLATES LOADED
-- ============================================================================
-- SELECT campaign_id, track, sequence_order, theme, subject_en, send_delay_days
-- FROM agrimaxx_campaigns
-- ORDER BY track, sequence_order;

-- ============================================================================
-- END CAMPAIGN TEMPLATES
-- ============================================================================