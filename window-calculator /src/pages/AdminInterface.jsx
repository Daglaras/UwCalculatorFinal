import React, { useState, useEffect } from 'react';
import { useLanguage } from '../App';
import { getAllData, updateRecord, createRecord, deleteRecord } from '../api';

const tabs = [
  { id: 'series', label: 'Series', labelEl: 'Σειρές' },
  { id: 'categories', label: 'Categories', labelEl: 'Κατηγορίες' },
  { id: 'drivers', label: 'Drivers', labelEl: 'Οδηγοί' },
  { id: 'sashes', label: 'Sashes', labelEl: 'Φύλλα' },
  { id: 'params', label: 'Parameters', labelEl: 'Παράμετροι' }
];

export default function AdminInterface() {
  const { language } = useLanguage();
  const [data, setData] = useState({ 
    categories: [], 
    series: [], 
    drivers: [], 
    sashes: [], 
    driver_categories: [],
    series_category_params: [] 
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('series');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [filterSeries, setFilterSeries] = useState('all');
  const [notification, setNotification] = useState(null);

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try { setData(await getAllData()); } 
    catch (error) { showNotification('Error loading data', 'error'); }
    setLoading(false);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCellClick = (table, rowId, field, currentValue) => {
    setEditingCell({ table, rowId, field });
    setEditValue(currentValue === null ? '' : String(currentValue));
  };

  const handleSave = async () => {
    if (!editingCell) return;
    const { table, rowId, field } = editingCell;
    let newValue = editValue;
    
    // Numeric fields
    const numericFields = ['a', 'b', 'x', 'uf1', 'uf2', 'e', 'f', 'e_narrow', 'f_narrow', 'b_override', 'num_glasses', 'gw_divisor', 'gw_offset', 'gh_offset', 'narrow_gw_offset'];
    if (numericFields.includes(field)) {
      newValue = editValue === '' ? null : parseFloat(editValue.replace(',', '.'));
    }
    
    // Boolean fields
    if (field === 'has_special_calculation') {
      newValue = editValue.toLowerCase() === 'true' || editValue === '1';
    }
    
    try {
      await updateRecord(table, rowId, { [field]: newValue });
      setData(prev => ({ 
        ...prev, 
        [table]: prev[table].map(row => row.id === rowId ? { ...row, [field]: newValue } : row) 
      }));
      showNotification(language === 'el' ? 'Αποθηκεύτηκε' : 'Saved');
    } catch { showNotification('Error saving', 'error'); }
    setEditingCell(null);
  };

  const handleKeyDown = (e) => { 
    if (e.key === 'Enter') handleSave(); 
    if (e.key === 'Escape') setEditingCell(null); 
  };

  const addNewRow = async (table) => {
    let newRow = {};
    switch (table) {
      case 'series': 
        newRow = { name: 'New Series', code: 'NEW', a: 0, b: 0, x: 0, uf1: null, uf2: null, e: null, f: null, e_narrow: null, f_narrow: null }; 
        break;
      case 'categories': 
        newRow = { name: 'New Category', num_glasses: 2, has_special_calculation: false }; 
        break;
      case 'drivers': 
        newRow = { series_id: data.series[0]?.id || 1, name: 'New Driver' }; 
        break;
      case 'sashes': 
        newRow = { series_id: data.series[0]?.id || 1, name: 'New Sash', b_override: null }; 
        break;
      case 'series_category_params': 
        newRow = { series_id: data.series[0]?.id || 1, category_id: data.categories[0]?.id || 1, gw_divisor: 2, gw_offset: 0, gh_offset: 0, narrow_gw_offset: null }; 
        break;
    }
    try {
      const created = await createRecord(table, newRow);
      setData(prev => ({ ...prev, [table]: [...prev[table], created] }));
      showNotification(language === 'el' ? 'Προστέθηκε' : 'Added');
    } catch { showNotification('Error adding', 'error'); }
  };

  const handleDeleteRow = async (table, rowId) => {
    if (!confirm(language === 'el' ? 'Διαγραφή;' : 'Delete?')) return;
    try {
      await deleteRecord(table, rowId);
      setData(prev => ({ ...prev, [table]: prev[table].filter(row => row.id !== rowId) }));
      showNotification(language === 'el' ? 'Διαγράφηκε' : 'Deleted', 'warning');
    } catch { showNotification('Error deleting', 'error'); }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); 
    a.download = 'window_calculator_data.json'; 
    a.click();
  };

  const getSeriesName = (id) => data.series.find(s => s.id === id)?.name || '?';
  const getCategoryName = (id) => data.categories.find(c => c.id === id)?.name || '?';

  const Cell = ({ table, rowId, field, value }) => {
    const isEditing = editingCell?.table === table && editingCell?.rowId === rowId && editingCell?.field === field;
    if (isEditing) {
      return (
        <input 
          type="text" 
          value={editValue} 
          onChange={(e) => setEditValue(e.target.value)} 
          onBlur={handleSave} 
          onKeyDown={handleKeyDown} 
          autoFocus 
          className="w-full px-2 py-1 border-2 border-orange-500 rounded text-sm" 
        />
      );
    }
    return (
      <div 
        onClick={() => handleCellClick(table, rowId, field, value)} 
        className={`px-2 py-1 cursor-pointer rounded hover:bg-orange-50 ${value === null ? 'text-gray-300 italic' : ''}`}
      >
        {value === null ? '—' : String(value)}
      </div>
    );
  };

  const getTable = () => ({ 
    series: 'series', 
    categories: 'categories', 
    drivers: 'drivers', 
    sashes: 'sashes', 
    params: 'series_category_params' 
  }[activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 right-4 px-4 py-2 rounded-lg shadow-lg z-50 text-white text-sm ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'warning' ? 'bg-orange-500' : 'bg-red-500'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: language === 'el' ? 'Σειρές' : 'Series', count: data.series?.length || 0 },
          { label: language === 'el' ? 'Κατηγ.' : 'Categ.', count: data.categories?.length || 0 },
          { label: language === 'el' ? 'Οδηγοί' : 'Drivers', count: data.drivers?.length || 0 },
          { label: language === 'el' ? 'Φύλλα' : 'Sashes', count: data.sashes?.length || 0 },
          { label: language === 'el' ? 'Παράμ.' : 'Params', count: data.series_category_params?.length || 0 },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-lg p-3 border border-gray-200 text-center">
            <div className="text-xl font-bold text-orange-500">{s.count}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => { setActiveTab(tab.id); setFilterSeries('all'); }}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-orange-500 border border-b-0 border-gray-200' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {language === 'el' ? tab.labelEl : tab.label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            {(activeTab === 'drivers' || activeTab === 'sashes' || activeTab === 'params') && (
              <select 
                value={filterSeries} 
                onChange={(e) => setFilterSeries(e.target.value)} 
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              >
                <option value="all">{language === 'el' ? 'Όλες οι σειρές' : 'All series'}</option>
                {data.series?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => addNewRow(getTable())} className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm">+ Add</button>
            <button onClick={exportData} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-sm">↓ Export</button>
            <button onClick={fetchAllData} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-sm">↻ Refresh</button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {/* SERIES TABLE */}
          {activeTab === 'series' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-2 text-orange-500 font-medium">{language === 'el' ? 'Όνομα' : 'Name'}</th>
                  <th className="text-left p-2 text-orange-500 font-medium">Code</th>
                  <th className="text-left p-2 text-orange-500 font-medium">a</th>
                  <th className="text-left p-2 text-orange-500 font-medium">b</th>
                  <th className="text-left p-2 text-orange-500 font-medium">x</th>
                  <th className="text-left p-2 text-orange-500 font-medium">Uf1</th>
                  <th className="text-left p-2 text-orange-500 font-medium">Uf2</th>
                  <th className="text-left p-2 text-orange-500 font-medium">e</th>
                  <th className="text-left p-2 text-orange-500 font-medium">f</th>
                  <th className="text-left p-2 text-orange-500 font-medium">e'</th>
                  <th className="text-left p-2 text-orange-500 font-medium">f'</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {data.series?.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-1"><Cell table="series" rowId={r.id} field="name" value={r.name} /></td>
                    <td className="p-1"><Cell table="series" rowId={r.id} field="code" value={r.code} /></td>
                    <td className="p-1"><Cell table="series" rowId={r.id} field="a" value={r.a} /></td>
                    <td className="p-1"><Cell table="series" rowId={r.id} field="b" value={r.b} /></td>
                    <td className="p-1"><Cell table="series" rowId={r.id} field="x" value={r.x} /></td>
                    <td className="p-1"><Cell table="series" rowId={r.id} field="uf1" value={r.uf1} /></td>
                    <td className="p-1"><Cell table="series" rowId={r.id} field="uf2" value={r.uf2} /></td>
                    <td className="p-1"><Cell table="series" rowId={r.id} field="e" value={r.e} /></td>
                    <td className="p-1"><Cell table="series" rowId={r.id} field="f" value={r.f} /></td>
                    <td className="p-1"><Cell table="series" rowId={r.id} field="e_narrow" value={r.e_narrow} /></td>
                    <td className="p-1"><Cell table="series" rowId={r.id} field="f_narrow" value={r.f_narrow} /></td>
                    <td className="p-1">
                      <button onClick={() => handleDeleteRow('series', r.id)} className="text-red-300 hover:text-red-500">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* CATEGORIES TABLE */}
          {activeTab === 'categories' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-2 text-orange-500 font-medium">{language === 'el' ? 'Όνομα' : 'Name'}</th>
                  <th className="text-left p-2 text-orange-500 font-medium">{language === 'el' ? 'Φύλλα' : 'Glasses'}</th>
                  <th className="text-left p-2 text-orange-500 font-medium">{language === 'el' ? 'Ειδικός Υπολ.' : 'Special Calc'}</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {data.categories?.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-1"><Cell table="categories" rowId={r.id} field="name" value={r.name} /></td>
                    <td className="p-1"><Cell table="categories" rowId={r.id} field="num_glasses" value={r.num_glasses} /></td>
                    <td className="p-1">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        r.has_special_calculation ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {r.has_special_calculation ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-1">
                      <button onClick={() => handleDeleteRow('categories', r.id)} className="text-red-300 hover:text-red-500">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* DRIVERS TABLE */}
          {activeTab === 'drivers' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-2 text-orange-500 font-medium">{language === 'el' ? 'Σειρά' : 'Series'}</th>
                  <th className="text-left p-2 text-orange-500 font-medium">{language === 'el' ? 'Όνομα' : 'Name'}</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {data.drivers?.filter(d => filterSeries === 'all' || d.series_id === parseInt(filterSeries)).map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-1 text-gray-400">{getSeriesName(r.series_id)}</td>
                    <td className="p-1"><Cell table="drivers" rowId={r.id} field="name" value={r.name} /></td>
                    <td className="p-1">
                      <button onClick={() => handleDeleteRow('drivers', r.id)} className="text-red-300 hover:text-red-500">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* SASHES TABLE */}
          {activeTab === 'sashes' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-2 text-orange-500 font-medium">{language === 'el' ? 'Σειρά' : 'Series'}</th>
                  <th className="text-left p-2 text-orange-500 font-medium">{language === 'el' ? 'Όνομα' : 'Name'}</th>
                  <th className="text-left p-2 text-orange-500 font-medium">b override</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {data.sashes?.filter(s => filterSeries === 'all' || s.series_id === parseInt(filterSeries)).map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-1 text-gray-400">{getSeriesName(r.series_id)}</td>
                    <td className="p-1"><Cell table="sashes" rowId={r.id} field="name" value={r.name} /></td>
                    <td className="p-1"><Cell table="sashes" rowId={r.id} field="b_override" value={r.b_override} /></td>
                    <td className="p-1">
                      <button onClick={() => handleDeleteRow('sashes', r.id)} className="text-red-300 hover:text-red-500">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* PARAMS TABLE */}
          {activeTab === 'params' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-2 text-orange-500 font-medium">{language === 'el' ? 'Σειρά' : 'Series'}</th>
                  <th className="text-left p-2 text-orange-500 font-medium">{language === 'el' ? 'Κατηγ.' : 'Category'}</th>
                  <th className="text-left p-2 text-orange-500 font-medium">GW Div</th>
                  <th className="text-left p-2 text-orange-500 font-medium">GW Off</th>
                  <th className="text-left p-2 text-orange-500 font-medium">GH Off</th>
                  <th className="text-left p-2 text-orange-500 font-medium">Narrow Off</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {data.series_category_params?.filter(p => filterSeries === 'all' || p.series_id === parseInt(filterSeries)).map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-1 text-gray-400 text-xs">{getSeriesName(r.series_id)}</td>
                    <td className="p-1 text-gray-400 text-xs">{getCategoryName(r.category_id)}</td>
                    <td className="p-1"><Cell table="series_category_params" rowId={r.id} field="gw_divisor" value={r.gw_divisor} /></td>
                    <td className="p-1"><Cell table="series_category_params" rowId={r.id} field="gw_offset" value={r.gw_offset} /></td>
                    <td className="p-1"><Cell table="series_category_params" rowId={r.id} field="gh_offset" value={r.gh_offset} /></td>
                    <td className="p-1"><Cell table="series_category_params" rowId={r.id} field="narrow_gw_offset" value={r.narrow_gw_offset} /></td>
                    <td className="p-1">
                      <button onClick={() => handleDeleteRow('series_category_params', r.id)} className="text-red-300 hover:text-red-500">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="text-center text-gray-300 text-xs mt-4">
        {language === 'el' ? 'Κλικ για επεξεργασία • Enter αποθήκευση • Esc ακύρωση' : 'Click to edit • Enter to save • Esc to cancel'}
      </p>
    </div>
  );
}
