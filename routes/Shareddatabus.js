// ============================================================================
// SHARED DATA BUS - Central Nervous System for AuditDNA
// ALL modules read/write through this. No more islands.
//
// Data Flow:
//   Grower uploads product/certs -> inventory updates -> buyers see it
//   Manifest uploaded -> parsed -> inventory lots created -> exposed to buyers
//   USDA prices pulled -> price comparison engine -> buying decisions
//   Purchase order created -> PO finance/factoring option -> accounting
// ============================================================================

import React, { createContext, useContext, useReducer, useCallback } from 'react';

const API_BASE = 'http://localhost:5050/api';
const USDA_API_KEY = '4F158DB1-85C2-3243-BFFA-58B53FB40D23';

// ---------------------------------------------------------------------------
// INITIAL STATE
// ---------------------------------------------------------------------------
const initialState = {
  // Products & Inventory
  products: [],           // Master product catalog (500+ from USDA + custom)
  inventory: [],          // Current stock: { lotId, productId, qty, warehouse, manifestId, grower, certStatus }
  manifests: [],          // Uploaded manifests: { id, file, parsed, lots[], status }

  // Grower Data
  growers: [],            // Grower profiles: { id, name, region, products[], certs[], seasons[] }
  growerListings: [],     // What growers have available NOW: { growerId, productId, qty, price, season, certIds[] }

  // Buyer Data
  buyers: [],             // Buyer profiles
  tenders: [],            // Calls for tender: { buyerId, productId, qty, deadline, priceTarget }
  orders: [],             // Purchase orders: { id, buyerId, items[], status, financing }

  // Pricing & Market Intel
  usdaPrices: {},         // USDA live prices keyed by commodity
  priceComparisons: [],   // Active comparison sets (up to 50 products)
  portPricing: {},        // Price by port of entry
  historicalPrices: {},   // Weekly price history

  // Financial
  cogsEntries: [],        // Cost of goods sold records
  invoices: [],           // A/R invoices
  payables: [],           // A/P records
  poFinancing: [],        // PO finance/factoring records

  // System
  loading: {},            // Loading states by key
  errors: {},             // Error states by key
  lastSync: null
};

// ---------------------------------------------------------------------------
// ACTION TYPES
// ---------------------------------------------------------------------------
const ACTIONS = {
  // Products & Inventory
  SET_PRODUCTS: 'SET_PRODUCTS',
  ADD_PRODUCT: 'ADD_PRODUCT',
  SET_INVENTORY: 'SET_INVENTORY',
  ADD_INVENTORY_LOT: 'ADD_INVENTORY_LOT',
  UPDATE_INVENTORY_LOT: 'UPDATE_INVENTORY_LOT',
  DEDUCT_INVENTORY: 'DEDUCT_INVENTORY',

  // Manifests
  SET_MANIFESTS: 'SET_MANIFESTS',
  ADD_MANIFEST: 'ADD_MANIFEST',
  UPDATE_MANIFEST: 'UPDATE_MANIFEST',

  // Growers
  SET_GROWERS: 'SET_GROWERS',
  SET_GROWER_LISTINGS: 'SET_GROWER_LISTINGS',
  ADD_GROWER_LISTING: 'ADD_GROWER_LISTING',

  // Buyers
  SET_BUYERS: 'SET_BUYERS',
  SET_TENDERS: 'SET_TENDERS',
  ADD_TENDER: 'ADD_TENDER',
  SET_ORDERS: 'SET_ORDERS',
  ADD_ORDER: 'ADD_ORDER',
  UPDATE_ORDER: 'UPDATE_ORDER',

  // Pricing
  SET_USDA_PRICES: 'SET_USDA_PRICES',
  SET_PRICE_COMPARISONS: 'SET_PRICE_COMPARISONS',
  SET_PORT_PRICING: 'SET_PORT_PRICING',
  SET_HISTORICAL_PRICES: 'SET_HISTORICAL_PRICES',

  // Financial
  SET_COGS: 'SET_COGS',
  ADD_COGS_ENTRY: 'ADD_COGS_ENTRY',
  SET_INVOICES: 'SET_INVOICES',
  ADD_INVOICE: 'ADD_INVOICE',
  SET_PO_FINANCING: 'SET_PO_FINANCING',

  // System
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LAST_SYNC: 'SET_LAST_SYNC'
};

// ---------------------------------------------------------------------------
// REDUCER
// ---------------------------------------------------------------------------
function dataReducer(state, action) {
  switch (action.type) {
    // Products & Inventory
    case ACTIONS.SET_PRODUCTS:
      return { ...state, products: action.payload };
    case ACTIONS.ADD_PRODUCT:
      return { ...state, products: [...state.products, action.payload] };
    case ACTIONS.SET_INVENTORY:
      return { ...state, inventory: action.payload };
    case ACTIONS.ADD_INVENTORY_LOT:
      return { ...state, inventory: [...state.inventory, action.payload] };
    case ACTIONS.UPDATE_INVENTORY_LOT:
      return { ...state, inventory: state.inventory.map(lot =>
        lot.id === action.payload.id ? { ...lot, ...action.payload } : lot
      )};
    case ACTIONS.DEDUCT_INVENTORY:
      return { ...state, inventory: state.inventory.map(lot =>
        lot.id === action.payload.lotId
          ? { ...lot, quantity: lot.quantity - action.payload.qty }
          : lot
      )};

    // Manifests
    case ACTIONS.SET_MANIFESTS:
      return { ...state, manifests: action.payload };
    case ACTIONS.ADD_MANIFEST:
      return { ...state, manifests: [...state.manifests, action.payload] };
    case ACTIONS.UPDATE_MANIFEST:
      return { ...state, manifests: state.manifests.map(m =>
        m.id === action.payload.id ? { ...m, ...action.payload } : m
      )};

    // Growers
    case ACTIONS.SET_GROWERS:
      return { ...state, growers: action.payload };
    case ACTIONS.SET_GROWER_LISTINGS:
      return { ...state, growerListings: action.payload };
    case ACTIONS.ADD_GROWER_LISTING:
      return { ...state, growerListings: [...state.growerListings, action.payload] };

    // Buyers
    case ACTIONS.SET_BUYERS:
      return { ...state, buyers: action.payload };
    case ACTIONS.SET_TENDERS:
      return { ...state, tenders: action.payload };
    case ACTIONS.ADD_TENDER:
      return { ...state, tenders: [...state.tenders, action.payload] };
    case ACTIONS.SET_ORDERS:
      return { ...state, orders: action.payload };
    case ACTIONS.ADD_ORDER:
      return { ...state, orders: [...state.orders, action.payload] };
    case ACTIONS.UPDATE_ORDER:
      return { ...state, orders: state.orders.map(o =>
        o.id === action.payload.id ? { ...o, ...action.payload } : o
      )};

    // Pricing
    case ACTIONS.SET_USDA_PRICES:
      return { ...state, usdaPrices: { ...state.usdaPrices, ...action.payload } };
    case ACTIONS.SET_PRICE_COMPARISONS:
      return { ...state, priceComparisons: action.payload };
    case ACTIONS.SET_PORT_PRICING:
      return { ...state, portPricing: { ...state.portPricing, ...action.payload } };
    case ACTIONS.SET_HISTORICAL_PRICES:
      return { ...state, historicalPrices: { ...state.historicalPrices, ...action.payload } };

    // Financial
    case ACTIONS.SET_COGS:
      return { ...state, cogsEntries: action.payload };
    case ACTIONS.ADD_COGS_ENTRY:
      return { ...state, cogsEntries: [...state.cogsEntries, action.payload] };
    case ACTIONS.SET_INVOICES:
      return { ...state, invoices: action.payload };
    case ACTIONS.ADD_INVOICE:
      return { ...state, invoices: [...state.invoices, action.payload] };
    case ACTIONS.SET_PO_FINANCING:
      return { ...state, poFinancing: action.payload };

    // System
    case ACTIONS.SET_LOADING:
      return { ...state, loading: { ...state.loading, [action.payload.key]: action.payload.value } };
    case ACTIONS.SET_ERROR:
      return { ...state, errors: { ...state.errors, [action.payload.key]: action.payload.message } };
    case ACTIONS.CLEAR_ERROR:
      const newErrors = { ...state.errors };
      delete newErrors[action.payload];
      return { ...state, errors: newErrors };
    case ACTIONS.SET_LAST_SYNC:
      return { ...state, lastSync: action.payload };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// CONTEXT
// ---------------------------------------------------------------------------
const DataBusContext = createContext(null);

// ---------------------------------------------------------------------------
// API HELPERS
// ---------------------------------------------------------------------------
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options
  };
  const res = await fetch(url, config);
  if (!res.ok) throw new Error(`API ${endpoint}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function usdaFetch(commodity, endpoint = 'datamarket') {
  // USDA Market News API
  const url = `https://marsapi.ams.usda.gov/services/v1.2/${endpoint}?API_KEY=${USDA_API_KEY}&commodity=${encodeURIComponent(commodity)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USDA API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// PROVIDER COMPONENT
// ---------------------------------------------------------------------------
export function DataBusProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  // =========================================================================
  // PRODUCT & INVENTORY ACTIONS
  // =========================================================================

  const loadProducts = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'products', value: true } });
    try {
      const data = await apiCall('/products');
      dispatch({ type: ACTIONS.SET_PRODUCTS, payload: data });
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: { key: 'products', message: err.message } });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'products', value: false } });
    }
  }, []);

  const loadInventory = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'inventory', value: true } });
    try {
      const data = await apiCall('/inventory');
      dispatch({ type: ACTIONS.SET_INVENTORY, payload: data });
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: { key: 'inventory', message: err.message } });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'inventory', value: false } });
    }
  }, []);

  // =========================================================================
  // MANIFEST ACTIONS
  // Upload manifest -> parse -> create inventory lots -> notify
  // =========================================================================

  const uploadManifest = useCallback(async (file, metadata) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'manifest', value: true } });
    try {
      const formData = new FormData();
      formData.append('manifest', file);
      if (metadata) formData.append('metadata', JSON.stringify(metadata));

      const result = await fetch(`${API_BASE}/manifests/upload`, {
        method: 'POST',
        body: formData
      }).then(r => r.json());

      const manifest = {
        id: result.id || `MAN-${Date.now()}`,
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        status: 'PARSED',
        items: result.items || [],
        lots: result.lots || [],
        ...result
      };

      dispatch({ type: ACTIONS.ADD_MANIFEST, payload: manifest });

      // Auto-create inventory lots from manifest
      if (manifest.items && manifest.items.length > 0) {
        for (const item of manifest.items) {
          const lot = {
            id: `LOT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            manifestId: manifest.id,
            productId: item.productId || item.commodity,
            productName: item.productName || item.commodity,
            quantity: item.quantity,
            unit: item.unit || 'cases',
            warehouse: item.warehouse || 'PRIMARY',
            grower: item.grower || metadata?.grower || 'UNKNOWN',
            origin: item.origin || metadata?.origin || '',
            portOfEntry: item.portOfEntry || metadata?.port || '',
            arrivalDate: item.arrivalDate || new Date().toISOString(),
            lotStatus: 'RECEIVED',
            certStatus: 'PENDING',
            costPerUnit: item.costPerUnit || 0,
            totalCost: item.totalCost || (item.quantity * (item.costPerUnit || 0))
          };
          dispatch({ type: ACTIONS.ADD_INVENTORY_LOT, payload: lot });
        }
      }

      return manifest;
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: { key: 'manifest', message: err.message } });
      throw err;
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'manifest', value: false } });
    }
  }, []);

  // Client-side manifest parsing for CSV files (no backend needed)
  const parseManifestCSV = useCallback((csvText) => {
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      items.push({
        commodity: row.commodity || row.product || row.item || '',
        productName: row.product_name || row.name || row.commodity || '',
        quantity: parseFloat(row.quantity || row.qty || 0),
        unit: row.unit || 'cases',
        costPerUnit: parseFloat(row.cost || row.price || row.unit_cost || 0),
        grower: row.grower || row.supplier || '',
        origin: row.origin || row.country || '',
        portOfEntry: row.port || row.port_of_entry || '',
        warehouse: row.warehouse || row.location || 'PRIMARY'
      });
    }
    return items.filter(i => i.commodity || i.productName);
  }, []);

  // =========================================================================
  // GROWER ACTIONS
  // =========================================================================

  const loadGrowers = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'growers', value: true } });
    try {
      const data = await apiCall('/growers');
      dispatch({ type: ACTIONS.SET_GROWERS, payload: data });
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: { key: 'growers', message: err.message } });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'growers', value: false } });
    }
  }, []);

  const addGrowerListing = useCallback(async (listing) => {
    try {
      const result = await apiCall('/growers/listings', {
        method: 'POST',
        body: JSON.stringify(listing)
      });
      dispatch({ type: ACTIONS.ADD_GROWER_LISTING, payload: result });

      // Auto-update inventory when grower lists product
      const lot = {
        id: `LOT-GRW-${Date.now()}`,
        productId: listing.productId,
        productName: listing.productName,
        quantity: listing.quantity,
        unit: listing.unit || 'cases',
        warehouse: 'GROWER_ORIGIN',
        grower: listing.growerId,
        origin: listing.region,
        lotStatus: 'AVAILABLE_AT_ORIGIN',
        certStatus: listing.certIds?.length > 0 ? 'CERTIFIED' : 'PENDING',
        costPerUnit: listing.pricePerUnit || 0
      };
      dispatch({ type: ACTIONS.ADD_INVENTORY_LOT, payload: lot });

      return result;
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: { key: 'growerListing', message: err.message } });
      throw err;
    }
  }, []);

  // =========================================================================
  // BUYER ACTIONS
  // =========================================================================

  const loadBuyers = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'buyers', value: true } });
    try {
      const data = await apiCall('/buyers');
      dispatch({ type: ACTIONS.SET_BUYERS, payload: data });
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: { key: 'buyers', message: err.message } });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'buyers', value: false } });
    }
  }, []);

  const createTender = useCallback(async (tender) => {
    try {
      const result = await apiCall('/tenders', {
        method: 'POST',
        body: JSON.stringify(tender)
      });
      dispatch({ type: ACTIONS.ADD_TENDER, payload: result });
      return result;
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: { key: 'tender', message: err.message } });
      throw err;
    }
  }, []);

  const createOrder = useCallback(async (order) => {
    try {
      const result = await apiCall('/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...order,
          status: 'PENDING',
          createdAt: new Date().toISOString()
        })
      });
      dispatch({ type: ACTIONS.ADD_ORDER, payload: result });

      // Deduct from inventory
      if (order.items) {
        for (const item of order.items) {
          if (item.lotId) {
            dispatch({ type: ACTIONS.DEDUCT_INVENTORY, payload: { lotId: item.lotId, qty: item.quantity } });
          }
        }
      }

      return result;
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: { key: 'order', message: err.message } });
      throw err;
    }
  }, []);

  // =========================================================================
  // USDA PRICING & MARKET INTEL
  // =========================================================================

  const fetchUSDAPrice = useCallback(async (commodity) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: { key: `usda_${commodity}`, value: true } });
    try {
      const data = await usdaFetch(commodity);
      const priceData = {
        commodity,
        results: data.results || [],
        fetchedAt: new Date().toISOString(),
        // Extract pricing tiers
        lowPrice: data.results?.[0]?.low_price || 0,
        highPrice: data.results?.[0]?.high_price || 0,
        avgPrice: data.results?.[0]?.avg_price || data.results?.[0]?.mostly_low_price || 0,
        origin: data.results?.[0]?.origin || '',
        unit: data.results?.[0]?.package || ''
      };
      dispatch({ type: ACTIONS.SET_USDA_PRICES, payload: { [commodity]: priceData } });
      return priceData;
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: { key: `usda_${commodity}`, message: err.message } });
      // Return from backend cache if USDA API fails
      try {
        const cached = await apiCall(`/products/usda-price/${encodeURIComponent(commodity)}`);
        dispatch({ type: ACTIONS.SET_USDA_PRICES, payload: { [commodity]: cached } });
        return cached;
      } catch {
        throw err;
      }
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: { key: `usda_${commodity}`, value: false } });
    }
  }, []);

  const fetchBulkUSDA = useCallback(async (commodities) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'usda_bulk', value: true } });
    try {
      const results = {};
      // Batch fetch - 5 at a time to avoid rate limits
      for (let i = 0; i < commodities.length; i += 5) {
        const batch = commodities.slice(i, i + 5);
        const batchResults = await Promise.allSettled(
          batch.map(c => usdaFetch(c))
        );
        batch.forEach((commodity, idx) => {
          if (batchResults[idx].status === 'fulfilled') {
            const data = batchResults[idx].value;
            results[commodity] = {
              commodity,
              results: data.results || [],
              lowPrice: data.results?.[0]?.low_price || 0,
              highPrice: data.results?.[0]?.high_price || 0,
              avgPrice: data.results?.[0]?.avg_price || 0,
              origin: data.results?.[0]?.origin || '',
              fetchedAt: new Date().toISOString()
            };
          }
        });
        // Small delay between batches
        if (i + 5 < commodities.length) await new Promise(r => setTimeout(r, 200));
      }
      dispatch({ type: ACTIONS.SET_USDA_PRICES, payload: results });
      return results;
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: { key: 'usda_bulk', message: err.message } });
      throw err;
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'usda_bulk', value: false } });
    }
  }, []);

  const fetchPortPricing = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'ports', value: true } });
    try {
      const data = await apiCall('/ports/pricing');
      dispatch({ type: ACTIONS.SET_PORT_PRICING, payload: data });
      return data;
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: { key: 'ports', message: err.message } });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'ports', value: false } });
    }
  }, []);

  // =========================================================================
  // COGS & FINANCIAL ACTIONS
  // =========================================================================

  const calculateCOGS = useCallback((lot, additionalCosts = {}) => {
    const baseCost = lot.costPerUnit * lot.quantity;
    const freight = additionalCosts.freight || 0;
    const customs = additionalCosts.customs || 0;
    const insurance = additionalCosts.insurance || 0;
    const inspection = additionalCosts.inspection || 0;
    const coldChain = additionalCosts.coldChain || 0;
    const brokerage = additionalCosts.brokerage || 0;

    const totalLanded = baseCost + freight + customs + insurance + inspection + coldChain + brokerage;
    const landedPerUnit = lot.quantity > 0 ? totalLanded / lot.quantity : 0;

    const entry = {
      id: `COGS-${Date.now()}`,
      lotId: lot.id,
      productName: lot.productName,
      quantity: lot.quantity,
      baseCost,
      freight,
      customs,
      insurance,
      inspection,
      coldChain,
      brokerage,
      totalLanded,
      landedPerUnit,
      // Pricing tiers from landed cost
      wholesalePrice: landedPerUnit * 1.25,
      retailPrice: landedPerUnit * 1.85,
      chainStorePrice: landedPerUnit * 1.55,
      consumerPrice: landedPerUnit * 2.35,
      margins: {
        wholesale: 25,
        retail: 85,
        chainStore: 55,
        consumer: 135
      },
      calculatedAt: new Date().toISOString()
    };

    dispatch({ type: ACTIONS.ADD_COGS_ENTRY, payload: entry });
    return entry;
  }, []);

  const requestPOFinancing = useCallback(async (order, financingType = 'factoring') => {
    try {
      const result = await apiCall('/financing/request', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          type: financingType, // 'factoring' | 'po_finance' | 'trade_credit'
          amount: order.totalAmount,
          terms: order.terms,
          buyer: order.buyerId
        })
      });
      dispatch({ type: ACTIONS.SET_PO_FINANCING, payload: [...state.poFinancing, result] });
      return result;
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: { key: 'financing', message: err.message } });
      throw err;
    }
  }, [state.poFinancing]);

  // =========================================================================
  // SYNC ALL - Pull everything from backend
  // =========================================================================

  const syncAll = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'sync', value: true } });
    try {
      await Promise.allSettled([
        loadProducts(),
        loadInventory(),
        loadGrowers(),
        loadBuyers()
      ]);
      dispatch({ type: ACTIONS.SET_LAST_SYNC, payload: new Date().toISOString() });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: { key: 'sync', value: false } });
    }
  }, [loadProducts, loadInventory, loadGrowers, loadBuyers]);

  // =========================================================================
  // COMPUTED VALUES (derived from state)
  // =========================================================================

  const getAvailableInventory = useCallback(() => {
    return state.inventory.filter(lot =>
      lot.quantity > 0 && ['RECEIVED', 'IN_STOCK', 'AVAILABLE_AT_ORIGIN'].includes(lot.lotStatus)
    );
  }, [state.inventory]);

  const getInventoryByProduct = useCallback((productId) => {
    return state.inventory.filter(lot => lot.productId === productId && lot.quantity > 0);
  }, [state.inventory]);

  const getTotalStock = useCallback((productId) => {
    return state.inventory
      .filter(lot => lot.productId === productId && lot.quantity > 0)
      .reduce((sum, lot) => sum + lot.quantity, 0);
  }, [state.inventory]);

  const getOpenTenders = useCallback(() => {
    return state.tenders.filter(t => t.status !== 'CLOSED' && t.status !== 'FULFILLED');
  }, [state.tenders]);

  const getPriceGap = useCallback((commodity) => {
    const usdaData = state.usdaPrices[commodity];
    if (!usdaData) return null;
    const cost = usdaData.lowPrice || usdaData.avgPrice;
    return {
      cost,
      fob: cost * 1.08,
      wholesale: cost * 1.25,
      retail: cost * 1.85,
      chainStore: cost * 1.55,
      consumer: cost * 2.35,
      marginWholesale: ((cost * 1.25 - cost) / cost * 100).toFixed(1),
      marginRetail: ((cost * 1.85 - cost) / cost * 100).toFixed(1),
      marginChainStore: ((cost * 1.55 - cost) / cost * 100).toFixed(1)
    };
  }, [state.usdaPrices]);

  // =========================================================================
  // CONTEXT VALUE
  // =========================================================================

  const value = {
    // State
    ...state,

    // Product & Inventory
    loadProducts,
    loadInventory,
    getAvailableInventory,
    getInventoryByProduct,
    getTotalStock,

    // Manifests
    uploadManifest,
    parseManifestCSV,

    // Growers
    loadGrowers,
    addGrowerListing,

    // Buyers
    loadBuyers,
    createTender,
    createOrder,
    getOpenTenders,

    // Pricing
    fetchUSDAPrice,
    fetchBulkUSDA,
    fetchPortPricing,
    getPriceGap,

    // Financial
    calculateCOGS,
    requestPOFinancing,

    // System
    syncAll,
    dispatch,
    ACTIONS
  };

  return (
    <DataBusContext.Provider value={value}>
      {children}
    </DataBusContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// HOOK - Any module uses this to connect
// ---------------------------------------------------------------------------
export function useDataBus() {
  const context = useContext(DataBusContext);
  if (!context) {
    throw new Error('useDataBus must be used within a DataBusProvider');
  }
  return context;
}

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------
export { ACTIONS, API_BASE, USDA_API_KEY };
export default DataBusProvider;