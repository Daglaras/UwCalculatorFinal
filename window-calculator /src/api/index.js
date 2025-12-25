// API base - works on both local (with proxy) and Vercel (serverless)
const API_BASE = '/api';

// ===================================
// PUBLIC API (for calculator)
// ===================================

export async function getTypes() {
  const res = await fetch(`${API_BASE}/types`);
  return res.json();
}

export async function getSeriesByType(typeId) {
  const res = await fetch(`${API_BASE}/types/${typeId}/series`);
  return res.json();
}

export async function getCategoriesByType(typeId) {
  const res = await fetch(`${API_BASE}/types/${typeId}/categories`);
  return res.json();
}

export async function getCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  return res.json();
}

export async function getSeries() {
  const res = await fetch(`${API_BASE}/series`);
  return res.json();
}

export async function getCategoriesForSeries(seriesId) {
  const res = await fetch(`${API_BASE}/series/${seriesId}/categories`);
  return res.json();
}

export async function getDriversForCategory(seriesId, categoryId) {
  const res = await fetch(`${API_BASE}/series/${seriesId}/category/${categoryId}/drivers`);
  return res.json();
}

export async function getSashesForSeries(seriesId) {
  const res = await fetch(`${API_BASE}/series/${seriesId}/sashes`);
  return res.json();
}

export async function getCategoryParams(seriesId, categoryId, sashId = null) {
  let url = `${API_BASE}/series/${seriesId}/category/${categoryId}/params`;
  if (sashId) {
    url += `?sash_id=${sashId}`;
  }
  const res = await fetch(url);
  return res.json();
}

export async function calculateWindow(data) {
  const res = await fetch(`${API_BASE}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Calculation failed');
  }
  return res.json();
}

// ===================================
// ADMIN API
// ===================================

export async function getAllData() {
  const res = await fetch(`${API_BASE}/admin/all-data`);
  return res.json();
}

export async function updateRecord(table, id, data) {
  const endpointMap = {
    'categories': 'categories',
    'series': 'series',
    'drivers': 'drivers',
    'sashes': 'sashes',
    'driver_categories': 'driver-categories',
    'series_category_params': 'series-category-params'
  };
  
  const res = await fetch(`${API_BASE}/admin/${endpointMap[table]}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function createRecord(table, data) {
  const endpointMap = {
    'categories': 'categories',
    'series': 'series',
    'drivers': 'drivers',
    'sashes': 'sashes',
    'driver_categories': 'driver-categories',
    'series_category_params': 'series-category-params'
  };
  
  const res = await fetch(`${API_BASE}/admin/${endpointMap[table]}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteRecord(table, id) {
  const endpointMap = {
    'categories': 'categories',
    'series': 'series',
    'drivers': 'drivers',
    'sashes': 'sashes',
    'driver_categories': 'driver-categories',
    'series_category_params': 'series-category-params'
  };
  
  const res = await fetch(`${API_BASE}/admin/${endpointMap[table]}/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}
