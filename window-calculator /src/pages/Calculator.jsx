import React, { useState, useEffect } from 'react';
import { useLanguage, useResults } from '../App';
import { 
  getTypes,
  getSeriesByType,
  getCategoriesByType,
  getCategoriesForSeries, 
  getDriversForCategory, 
  getSashesForSeries, 
  calculateWindow 
} from '../api';

// Placeholder images
const TYPE_IMAGE = '/images/type-placeholder.jpg';
const SERIES_IMAGE = '/images/series-placeholder.jpg';
const CATEGORY_IMAGE = '/images/category-placeholder.jpg';

// Validation limits
const LIMITS = {
  plaisioHeight: { min: 300, max: 5000 },
  plaisioWidth: { min: 300, max: 10000 },
  ugValue: { min: 0.3, max: 7.0 },
  roloHeight: { min: 100, max: 1000 },
  urValue: { min: 0.6, max: 10.0 }
};

// Standard Psi values
const PSI_OPTIONS = [
  { value: '0.05', label: '0.05' },
  { value: '0.08', label: '0.08' },
  { value: '0.11', label: '0.11' }
];

export default function Calculator() {
  const { t, language } = useLanguage();
  const { lastResults, saveResults, shouldShowResults, clearShowResults } = useResults();
  
  // Form state - Flow: Type → Series → Category → Driver → Sash → Parameters → Results
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedSash, setSelectedSash] = useState(null);
  
  // Dimensions
  const [plaisioHeight, setPlaisioHeight] = useState('');
  const [plaisioWidth, setPlaisioWidth] = useState('');
  const [ugValue, setUgValue] = useState('1.0');
  const [psiValue, setPsiValue] = useState('0.05');
  
  // Options
  const [isNarrow, setIsNarrow] = useState(false); // Στενή Επαλληλία
  const [hasRolo, setHasRolo] = useState(false);
  const [roloHeight, setRoloHeight] = useState('');
  const [urValue, setUrValue] = useState('');
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});
  
  // Data from API
  const [types, setTypes] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [sashes, setSashes] = useState([]);
  
  // Results
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Validation function
  const validateField = (name, value) => {
    if (!value || value === '') return null;
    const numValue = parseFloat(value);
    const limit = LIMITS[name];
    if (!limit) return null;
    
    if (numValue < limit.min) {
      return `Min: ${limit.min}`;
    }
    if (numValue > limit.max) {
      return `Max: ${limit.max}`;
    }
    return null;
  };

  const validateAllFields = () => {
    const errors = {};
    
    errors.plaisioHeight = validateField('plaisioHeight', plaisioHeight);
    errors.plaisioWidth = validateField('plaisioWidth', plaisioWidth);
    errors.ugValue = validateField('ugValue', ugValue);
    
    if (hasRolo) {
      errors.roloHeight = validateField('roloHeight', roloHeight);
      errors.urValue = validateField('urValue', urValue);
    }
    
    setValidationErrors(errors);
    
    // Return true if no errors
    return !Object.values(errors).some(e => e !== null);
  };

  // Load types on mount
  useEffect(() => { loadTypes(); }, []);
  
  // Check if we should show last results
  useEffect(() => {
    if (shouldShowResults && lastResults) {
      setResults(lastResults);
      setStep(7);
      clearShowResults();
    }
  }, [shouldShowResults, lastResults]);
  
  // Load series when type changes
  useEffect(() => { 
    if (selectedType) { 
      loadSeriesByType(selectedType.id);
    } 
  }, [selectedType]);
  
  // Load categories when series changes
  useEffect(() => { 
    if (selectedSeries) { 
      loadCategoriesForSeries(selectedSeries.id); 
      loadSashes(selectedSeries.id);
    } 
  }, [selectedSeries]);
  
  // Load drivers when category changes
  useEffect(() => { 
    if (selectedSeries && selectedCategory) { 
      loadDrivers(selectedSeries.id, selectedCategory.id); 
    } 
  }, [selectedSeries, selectedCategory]);

  const loadTypes = async () => { 
    try { 
      setTypes(await getTypes()); 
    } catch (err) { 
      setError('Failed to load types'); 
    } 
  };

  const loadSeriesByType = async (typeId) => { 
    try { 
      setSeriesList(await getSeriesByType(typeId)); 
    } catch (err) { 
      setError('Failed to load series'); 
    } 
  };
  
  const loadCategoriesForSeries = async (seriesId) => { 
    try { 
      setCategories(await getCategoriesForSeries(seriesId)); 
    } catch (err) { 
      setError('Failed to load categories'); 
    } 
  };
  
  const loadDrivers = async (seriesId, categoryId) => { 
    try { 
      setDrivers(await getDriversForCategory(seriesId, categoryId)); 
    } catch (err) { 
      setError('Failed to load drivers'); 
    } 
  };
  
  const loadSashes = async (seriesId) => { 
    try { 
      setSashes(await getSashesForSeries(seriesId)); 
    } catch (err) { 
      setError('Failed to load sashes'); 
    } 
  };

  const handleCalculate = async () => {
    // Validate all fields first
    if (!validateAllFields()) {
      setError(t('validationError'));
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await calculateWindow({
        series_id: selectedSeries.id,
        category_id: selectedCategory.id,
        driver_id: selectedDriver.id,
        sash_id: selectedSash.id,
        plaisio_height: parseFloat(plaisioHeight),
        plaisio_width: parseFloat(plaisioWidth),
        ug_value: parseFloat(ugValue),
        psi_value: parseFloat(psiValue),
        is_narrow: isNarrow,
        has_rolo: hasRolo,
        rolo_height: hasRolo ? parseFloat(roloHeight) : null,
        ur_value: hasRolo ? parseFloat(urValue) : null
      });
      setResults(result);
      saveResults(result);
      setStep(7);
    } catch (err) {
      setError(err.message || 'Calculation failed');
    }
    setLoading(false);
  };

  const resetCalculator = () => {
    setStep(1);
    setSelectedType(null);
    setSelectedSeries(null);
    setSelectedCategory(null);
    setSelectedDriver(null);
    setSelectedSash(null);
    setPlaisioHeight('');
    setPlaisioWidth('');
    setUgValue('1.0');
    setPsiValue('0.05');
    setIsNarrow(false);
    setHasRolo(false);
    setValidationErrors({});
    setRoloHeight('');
    setUrValue('');
    setResults(null);
    setError(null);
  };

  // Clear results when going back from results step
  const handleBack = () => {
    if (step === 7) {
      setResults(null);
    }
    setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return selectedType !== null;
      case 2: return selectedSeries !== null;
      case 3: return selectedCategory !== null;
      case 4: return selectedDriver !== null;
      case 5: return selectedSash !== null;
      case 6: return plaisioHeight && plaisioWidth && (!hasRolo || (roloHeight && urValue));
      default: return false;
    }
  };

  const getStepTitle = () => {
    const titles = { 
      1: t('step1Title'), 
      2: t('step2Title'), 
      3: t('step3Title'), 
      4: t('step4Title'), 
      5: t('step5Title'),
      6: t('step6Title'), 
      7: t('step7Title') 
    };
    return titles[step];
  };

  const renderStep = () => {
    switch (step) {
      // Step 1: Select Type (Sliding/Opening)
      case 1:
        return (
          <div className="grid md:grid-cols-2 gap-4">
            {types.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type)}
                className={`rounded-xl overflow-hidden border-2 transition-all text-left ${
                  selectedType?.id === type.id
                    ? 'border-orange-500 shadow-lg'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  <img 
                    src={type.image_url || TYPE_IMAGE}
                    alt={type.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 bg-white">
                  <div className="font-semibold text-lg text-gray-800">{type.name}</div>
                  <div className="text-orange-500 text-sm">{type.name_gr}</div>
                </div>
              </button>
            ))}
          </div>
        );

      // Step 2: Select Series
      case 2:
        return (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seriesList.map(series => (
              <button
                key={series.id}
                onClick={() => setSelectedSeries(series)}
                className={`rounded-xl overflow-hidden border-2 transition-all text-left ${
                  selectedSeries?.id === series.id
                    ? 'border-orange-500 shadow-lg'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  <img 
                    src={series.image_url || SERIES_IMAGE}
                    alt={series.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 bg-white">
                  <div className="font-semibold text-lg text-gray-800">{series.name}</div>
                  <div className="text-orange-500 text-sm">Code: {series.code}</div>
                </div>
              </button>
            ))}
          </div>
        );

      // Step 3: Select Category
      case 3:
        return (
          <div className="grid md:grid-cols-2 gap-4">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl overflow-hidden border-2 transition-all text-left ${
                  selectedCategory?.id === cat.id
                    ? 'border-orange-500 shadow-lg'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  <img 
                    src={cat.image_url || CATEGORY_IMAGE}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 bg-white">
                  <div className="font-semibold text-gray-800">{cat.name}</div>
                  <div className="text-orange-500 text-sm">{cat.num_glasses} {t('glasses')}</div>
                  {cat.has_special_calculation && (
                    <div className="text-xs text-gray-400 mt-1">{t('specialCalc')}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        );

      // Step 4: Select Driver
      case 4:
        return (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm mb-4">{t('selectDriver')}</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {drivers.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => setSelectedDriver(driver)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedDriver?.id === driver.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300 bg-white'
                  }`}
                >
                  <div className="font-semibold text-gray-800">{driver.name}</div>
                </button>
              ))}
            </div>
          </div>
        );

      // Step 5: Select Sash
      case 5:
        return (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm mb-4">{t('selectSash')}</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sashes.map(sash => (
                <button
                  key={sash.id}
                  onClick={() => setSelectedSash(sash)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedSash?.id === sash.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300 bg-white'
                  }`}
                >
                  <div className="font-semibold text-gray-800">{sash.name}</div>
                  {sash.b_override && (
                    <div className="text-xs text-gray-400">b: {sash.b_override}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      // Step 6: Parameters
      case 6:
        return (
          <div className="space-y-5">
            {/* Dimensions */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  {t('plaisioHeight')} (mm)
                  <span className="text-gray-400 font-normal ml-2">{LIMITS.plaisioHeight.min}-{LIMITS.plaisioHeight.max}</span>
                </label>
                <input 
                  type="number" 
                  min={LIMITS.plaisioHeight.min}
                  max={LIMITS.plaisioHeight.max}
                  value={plaisioHeight} 
                  onChange={(e) => {
                    setPlaisioHeight(e.target.value);
                    setValidationErrors({...validationErrors, plaisioHeight: validateField('plaisioHeight', e.target.value)});
                  }} 
                  placeholder="1500"
                  className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 ${
                    validationErrors.plaisioHeight ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {validationErrors.plaisioHeight && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.plaisioHeight}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  {t('plaisioWidth')} (mm)
                  <span className="text-gray-400 font-normal ml-2">{LIMITS.plaisioWidth.min}-{LIMITS.plaisioWidth.max}</span>
                </label>
                <input 
                  type="number" 
                  min={LIMITS.plaisioWidth.min}
                  max={LIMITS.plaisioWidth.max}
                  value={plaisioWidth} 
                  onChange={(e) => {
                    setPlaisioWidth(e.target.value);
                    setValidationErrors({...validationErrors, plaisioWidth: validateField('plaisioWidth', e.target.value)});
                  }} 
                  placeholder="2000"
                  className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 ${
                    validationErrors.plaisioWidth ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {validationErrors.plaisioWidth && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.plaisioWidth}</p>
                )}
              </div>
            </div>
            
            {/* Ug and Psi */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  {t('ugValue')} (W/m²K)
                  <span className="text-gray-400 font-normal ml-2">{LIMITS.ugValue.min}-{LIMITS.ugValue.max}</span>
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  min={LIMITS.ugValue.min}
                  max={LIMITS.ugValue.max}
                  value={ugValue} 
                  onChange={(e) => {
                    setUgValue(e.target.value);
                    setValidationErrors({...validationErrors, ugValue: validateField('ugValue', e.target.value)});
                  }}
                  className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 ${
                    validationErrors.ugValue ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {validationErrors.ugValue && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.ugValue}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">{t('psiValue')} (W/mK)</label>
                <select 
                  value={psiValue} 
                  onChange={(e) => setPsiValue(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 bg-white"
                >
                  {PSI_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Στενή Επαλληλία Checkbox */}
            <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isNarrow} 
                  onChange={(e) => setIsNarrow(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500" 
                />
                <span className="font-medium text-gray-700">{t('narrowOption')}</span>
              </label>
              <p className="text-xs text-gray-400 mt-2 ml-8">{t('narrowDescription')}</p>
            </div>
            
            {/* Ρολό Checkbox */}
            <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={hasRolo} 
                  onChange={(e) => setHasRolo(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500" 
                />
                <span className="font-medium text-gray-700">{t('addRolo')}</span>
              </label>
              {hasRolo && (
                <>
                  <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        {t('roloHeight')} (mm)
                        <span className="text-gray-400 font-normal ml-2">{LIMITS.roloHeight.min}-{LIMITS.roloHeight.max}</span>
                      </label>
                      <input 
                        type="number" 
                        min={LIMITS.roloHeight.min}
                        max={LIMITS.roloHeight.max}
                        value={roloHeight} 
                        onChange={(e) => {
                          setRoloHeight(e.target.value);
                          setValidationErrors({...validationErrors, roloHeight: validateField('roloHeight', e.target.value)});
                        }} 
                        placeholder="300"
                        className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 ${
                          validationErrors.roloHeight ? 'border-red-400 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                      {validationErrors.roloHeight && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.roloHeight}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        {t('urValue')} (W/m²K)
                        <span className="text-gray-400 font-normal ml-2">{LIMITS.urValue.min}-{LIMITS.urValue.max}</span>
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        min={LIMITS.urValue.min}
                        max={LIMITS.urValue.max}
                        value={urValue} 
                        onChange={(e) => {
                          setUrValue(e.target.value);
                          setValidationErrors({...validationErrors, urValue: validateField('urValue', e.target.value)});
                        }} 
                        placeholder="2.0"
                        className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 ${
                          validationErrors.urValue ? 'border-red-400 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                      {validationErrors.urValue && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.urValue}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {t('roloDescription')}
                  </p>
                </>
              )}
            </div>
          </div>
        );

      // Step 7: Results
      case 7:
        return (
          <div className="space-y-5">
            {results && (
              <>
                {/* Main Uw Result - Different display for Rolo */}
                {results.has_rolo ? (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Uw Open (Roller Up) */}
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-center text-white">
                      <div className="text-white/80 text-xs mb-1">{t('roloOpen')}</div>
                      <div className="text-3xl font-bold">{results.Uw_open?.toFixed(3)}</div>
                      <div className="text-white/80 text-xs mt-1">W/(m²·K)</div>
                    </div>
                    {/* Uw Closed (Roller Down) */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-center text-white">
                      <div className="text-white/80 text-xs mb-1">{t('roloClosed')}</div>
                      <div className="text-3xl font-bold">{results.Uw_closed?.toFixed(3)}</div>
                      <div className="text-white/80 text-xs mt-1">W/(m²·K)</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-8 text-center text-white">
                    <div className="text-white/80 text-sm mb-1">{t('overallUValue')}</div>
                    <div className="text-5xl font-bold">{results.Uw?.toFixed(3)}</div>
                    <div className="text-white/80 text-sm mt-1">W/(m²·K)</div>
                  </div>
                )}
                
                {/* Rolo Height Info */}
                {results.has_rolo && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-blue-600 text-sm font-medium">{t('roloIncluded')}</div>
                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">FH {t('original')}: </span>
                        <span className="font-semibold text-gray-800">{results.FH_original} mm</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('roloHeight')}: </span>
                        <span className="font-semibold text-gray-800">{results.rolo_height} mm</span>
                      </div>
                      <div>
                        <span className="text-gray-500">FH' ({t('effective')}): </span>
                        <span className="font-semibold text-gray-800">{results.FH_effective} mm</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Calculated Values */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'l', value: results.l?.toFixed(4), unit: 'm' },
                    { label: 'GW', value: results.GW?.toFixed(2), unit: 'mm' },
                    { label: 'GH', value: results.GH?.toFixed(2), unit: 'mm' },
                    { label: 'Af1', value: results.Af1?.toFixed(4), unit: 'm²' },
                    { label: 'Af2', value: results.Af2?.toFixed(4), unit: 'm²' },
                    { label: 'Af', value: results.Af?.toFixed(4), unit: 'm²' },
                    { label: 'Ag', value: results.Ag?.toFixed(4), unit: 'm²' },
                    { label: 'Ig', value: results.Ig?.toFixed(4), unit: 'm' },
                    { label: 'Aff2', value: results.has_special ? results.Aff2?.toFixed(4) : '', unit: results.has_special ? 'm²' : '' },
                  ].map((item, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                      <div className="text-gray-400 text-xs">{item.label}</div>
                      <div className="text-lg font-semibold text-gray-800">{item.value || '-'}</div>
                      {item.unit && <div className="text-gray-400 text-xs">{item.unit}</div>}
                    </div>
                  ))}
                </div>
                
                {/* Afilitou (only for Φιλητό) */}
                {results.Afilitou && (
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="text-orange-600 text-sm font-medium">{t('specialCalcUsed')}</div>
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">Afilitou: </span>
                      <span className="font-semibold text-gray-800">{results.Afilitou?.toFixed(4)} m²</span>
                    </div>
                  </div>
                )}
                
                {/* Configuration Summary */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm font-medium text-gray-400 mb-3">{t('configuration')}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>{t('series')}: <span className="text-orange-500 font-medium">{results.series_name}</span></div>
                    <div>{t('category')}: <span className="text-orange-500 font-medium">{results.category_name}</span></div>
                    <div>{t('driver')}: <span className="text-orange-500 font-medium">{results.driver_name}</span></div>
                    <div>{t('sash')}: <span className="text-orange-500 font-medium">{results.sash_name}</span></div>
                    <div>{t('glasses')}: <span className="text-orange-500 font-medium">{results.num_glasses}</span></div>
                    {results.is_narrow && <div>{t('narrowOption')}: <span className="text-orange-500 font-medium">{t('yes')}</span></div>}
                    {results.has_rolo && <div>{t('rolo')}: <span className="text-orange-500 font-medium">{t('yes')}</span></div>}
                  </div>
                </div>
                
                {/* Debug Info */}
                {results.debug && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm font-medium text-gray-400 mb-3">Debug Info - All Variables</div>
                    
                    {/* Input Values */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Input Values:</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs text-gray-600">
                        <div>FW: <span className="font-mono">{results.debug.input_FW} mm</span></div>
                        <div>FH: <span className="font-mono">{results.debug.input_FH} mm</span></div>
                        <div>Ug: <span className="font-mono">{results.debug.Ug}</span></div>
                        <div>Ψ: <span className="font-mono">{results.debug.Psi}</span></div>
                      </div>
                    </div>
                    
                    {/* Series Values */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Series Values:</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs text-gray-600">
                        <div>a: <span className="font-mono">{results.debug.a}</span></div>
                        <div>b: <span className="font-mono">{results.debug.b}</span></div>
                        <div>x: <span className="font-mono">{results.debug.x}</span></div>
                        <div>uf1: <span className="font-mono">{results.debug.uf1}</span></div>
                        <div>uf2: <span className="font-mono">{results.debug.uf2}</span></div>
                        <div>e: <span className="font-mono">{results.debug.e}</span></div>
                        <div>f: <span className="font-mono">{results.debug.f}</span></div>
                        <div>e': <span className="font-mono">{results.debug.e_narrow || '-'}</span></div>
                        <div>f': <span className="font-mono">{results.debug.f_narrow || '-'}</span></div>
                      </div>
                    </div>
                    
                    {/* Params Values */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Params (GW/GH):</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs text-gray-600">
                        <div>gw_divisor: <span className="font-mono">{results.debug.gw_divisor}</span></div>
                        <div>gw_offset: <span className="font-mono">{results.debug.gw_offset}</span></div>
                        <div>gh_offset: <span className="font-mono">{results.debug.gh_offset}</span></div>
                        <div>narrow_gw: <span className="font-mono">{results.debug.narrow_gw_offset || '-'}</span></div>
                      </div>
                    </div>
                    
                    {/* Calculated Intermediate */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Calculated Intermediate:</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs text-gray-600">
                        <div>l: <span className="font-mono">{results.debug.l}</span></div>
                        <div>GW: <span className="font-mono">{results.debug.GW}</span></div>
                        <div>GH: <span className="font-mono">{results.debug.GH}</span></div>
                        <div>Kentro_h: <span className="font-mono">{results.debug.Kentro_height}</span></div>
                        <div>kentro_w: <span className="font-mono">{results.debug.kentro_width}</span></div>
                        <div>akentrou_val: <span className="font-mono">{results.debug.akentrou_value}</span></div>
                      </div>
                    </div>
                    
                    {/* Areas */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Areas (m²):</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs text-gray-600">
                        <div>Akoufomatos: <span className="font-mono">{results.debug.Akoufomatos}</span></div>
                        <div>Af1: <span className="font-mono">{results.debug.Af1}</span></div>
                        <div>Af2: <span className="font-mono">{results.debug.Af2}</span></div>
                        <div>Aff2: <span className="font-mono">{results.debug.Aff2}</span></div>
                        <div>Af: <span className="font-mono">{results.debug.Af}</span></div>
                        <div>Ag: <span className="font-mono">{results.debug.Ag}</span></div>
                        <div>Aw: <span className="font-mono">{results.debug.Aw}</span></div>
                        <div>Afilitou: <span className="font-mono">{results.debug.Afilitou || '-'}</span></div>
                        <div>Ar: <span className="font-mono">{results.debug.Ar || '-'}</span></div>
                      </div>
                    </div>
                    
                    {/* Final Calculations */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Final Calculations:</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs text-gray-600">
                        <div>Ig (m): <span className="font-mono">{results.debug.Ig}</span></div>
                        <div>Af×Uf: <span className="font-mono">{results.debug.Af_Uf}</span></div>
                        <div>Uw: <span className="font-mono font-bold text-orange-600">{results.debug.Uw_final}</span></div>
                        <div>num_glasses: <span className="font-mono">{results.debug.num_glasses}</span></div>
                        <div>has_special: <span className="font-mono">{results.debug.has_special ? 'Yes' : 'No'}</span></div>
                        <div>is_narrow: <span className="font-mono">{results.debug.is_narrow ? 'Yes' : 'No'}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
    }
  };

  const totalSteps = 7;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          {[1, 2, 3, 4, 5, 6, 7].map(s => (
            <div key={s} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                s === step ? 'bg-orange-500 text-white' :
                s < step ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {s < step ? '✓' : s}
              </div>
            </div>
          ))}
        </div>
        <div className="h-1 bg-gray-200 rounded-full">
          <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Step Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="mb-5">
          <div className="text-orange-500 text-sm font-medium">{t('step')} {step} / {totalSteps}</div>
          <h2 className="text-xl font-semibold text-gray-800">{getStepTitle()}</h2>
        </div>
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        {step > 1 && step < 7 ? (
          <button onClick={handleBack}
            className="px-6 py-2.5 border-2 border-gray-200 text-gray-600 font-medium rounded-lg hover:border-orange-500 hover:text-orange-500 transition-colors">
            ← {t('back')}
          </button>
        ) : step === 7 ? (
          <button onClick={handleBack}
            className="px-6 py-2.5 border-2 border-gray-200 text-gray-600 font-medium rounded-lg hover:border-orange-500 hover:text-orange-500 transition-colors">
            ← {t('back')}
          </button>
        ) : <div />}
        
        {step < 6 && (
          <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
            className={`px-6 py-2.5 font-medium rounded-lg transition-colors ${
              canProceed() ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            {t('next')} →
          </button>
        )}
        
        {step === 6 && (
          <button onClick={handleCalculate} disabled={!canProceed() || loading}
            className={`px-6 py-2.5 font-medium rounded-lg transition-colors ${
              canProceed() && !loading ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            {loading ? t('calculating') : t('calculate')}
          </button>
        )}
        
        {step === 7 && (
          <button onClick={resetCalculator}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors">
            {t('newCalculation')}
          </button>
        )}
      </div>
    </div>
  );
}
