import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import AdminInterface from './pages/AdminInterface'
import Calculator from './pages/Calculator'

// Language Context
const LanguageContext = createContext()

export const useLanguage = () => useContext(LanguageContext)

// Results Context (to store last calculation)
const ResultsContext = createContext()

export const useResults = () => useContext(ResultsContext)

// Translations
export const translations = {
  en: {
    calculator: 'U-Value Calculator',
    admin: 'Admin',
    backToSite: 'Back to Site',
    lastResults: 'Last Results',
    step: 'Step',
    step1Title: 'Select Window Type',
    step2Title: 'Select Series',
    step3Title: 'Select Window Category',
    step4Title: 'Select Driver',
    step5Title: 'Select Sash',
    step6Title: 'Enter Dimensions',
    step7Title: 'Results',
    sliding: 'Sliding',
    opening: 'Opening',
    next: 'Next',
    back: 'Back',
    calculate: 'Calculate',
    calculating: 'Calculating...',
    newCalculation: 'New Calculation',
    glasses: 'Glasses',
    glassPanels: 'glass panels',
    code: 'Code',
    value: 'value',
    driver: 'Driver',
    sash: 'Sash',
    selectDriver: 'Select a driver (case profile) for this category:',
    selectSash: 'Select a sash (glass profile) for this series:',
    plaisioHeight: 'Frame Height',
    plaisioWidth: 'Frame Width',
    ugValue: 'Ug Value',
    psiValue: 'Psi Value (Ψ)',
    narrowOption: 'Narrow Overlap (Στενή Επαλληλία)',
    narrowDescription: 'Check this for narrow overlap configuration, affects Akentrou calculation',
    addRolo: 'Add Roller Shutter (Ρολό)',
    roloHeight: 'Roller Height',
    urValue: 'Ur Value',
    results: 'Results',
    overallUValue: 'Overall U-value (Uw)',
    configuration: 'Configuration',
    series: 'Series',
    category: 'Category',
    rolo: 'Roller Shutter',
    yes: 'Yes',
    no: 'No',
    noResults: 'No calculations yet',
    specialCalc: 'Special calculation',
    specialCalcUsed: 'Special calculation (Φιλητό) applied',
    roloIncluded: 'Roller shutter included in calculation',
    roloOpen: 'Uw (Roller Open)',
    roloClosed: 'Uw (Roller Closed)',
    original: 'Original',
    effective: 'Effective',
    roloDescription: 'FH will be reduced by roller height for calculation',
    validationError: 'Please fix the errors in the form before calculating',
  },
  el: {
    calculator: 'Υπολογιστής U-Value',
    admin: 'Διαχείριση',
    backToSite: 'Επιστροφή',
    lastResults: 'Τελευταία Αποτελέσματα',
    step: 'Βήμα',
    step1Title: 'Επιλογή Τύπου Παραθύρου',
    step2Title: 'Επιλογή Σειράς',
    step3Title: 'Επιλογή Κατηγορίας Παραθύρου',
    step4Title: 'Επιλογή Οδηγού',
    step5Title: 'Επιλογή Φύλλου',
    step6Title: 'Εισαγωγή Διαστάσεων',
    step7Title: 'Αποτελέσματα',
    sliding: 'Συρόμενα',
    opening: 'Ανοιγόμενα',
    next: 'Επόμενο',
    back: 'Πίσω',
    calculate: 'Υπολογισμός',
    calculating: 'Υπολογισμός...',
    newCalculation: 'Νέος Υπολογισμός',
    glasses: 'Φύλλα',
    glassPanels: 'φύλλα',
    code: 'Κωδικός',
    value: 'τιμή',
    driver: 'Οδηγός',
    sash: 'Φύλλο',
    selectDriver: 'Επιλέξτε οδηγό (προφίλ κάσας) για αυτή την κατηγορία:',
    selectSash: 'Επιλέξτε φύλλο (προφίλ υαλοπίνακα) για αυτή τη σειρά:',
    plaisioHeight: 'Ύψος Πλαισίου',
    plaisioWidth: 'Πλάτος Πλαισίου',
    ugValue: 'Τιμή Ug',
    psiValue: 'Τιμή Psi (Ψ)',
    narrowOption: 'Στενή Επαλληλία',
    narrowDescription: 'Επιλέξτε για διαμόρφωση στενής επαλληλίας, επηρεάζει τον υπολογισμό Akentrou',
    addRolo: 'Προσθήκη Ρολού',
    roloHeight: 'Ύψος Ρολού',
    urValue: 'Τιμή Ur',
    results: 'Αποτελέσματα',
    overallUValue: 'Συνολική Τιμή U (Uw)',
    configuration: 'Διαμόρφωση',
    series: 'Σειρά',
    category: 'Κατηγορία',
    rolo: 'Ρολό',
    yes: 'Ναι',
    no: 'Όχι',
    noResults: 'Δεν υπάρχουν υπολογισμοί',
    specialCalc: 'Ειδικός υπολογισμός',
    specialCalcUsed: 'Εφαρμόστηκε ειδικός υπολογισμός (Φιλητό)',
    roloIncluded: 'Το ρολό συμπεριλαμβάνεται στον υπολογισμό',
    roloOpen: 'Uw (Ρολό Ανοιχτό)',
    roloClosed: 'Uw (Ρολό Κλειστό)',
    original: 'Αρχικό',
    effective: 'Ενεργό',
    roloDescription: 'Το FH θα μειωθεί κατά το ύψος του ρολού για τον υπολογισμό',
    validationError: 'Παρακαλώ διορθώστε τα σφάλματα πριν τον υπολογισμό',
  }
}

// PWA Install Prompt Component
function InstallPrompt() {
  const { t } = useLanguage()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show prompt after a delay
      setTimeout(() => setShowPrompt(true), 3000)
    }
    
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  
  const handleInstall = async () => {
    if (!deferredPrompt) return
    
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }
  
  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't show again for this session
    sessionStorage.setItem('pwa-dismissed', 'true')
  }
  
  // Check if already dismissed this session
  useEffect(() => {
    if (sessionStorage.getItem('pwa-dismissed')) {
      setShowPrompt(false)
    }
  }, [])
  
  if (!showPrompt || !deferredPrompt) return null
  
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">📱</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{t('installApp')}</h3>
          <p className="text-sm text-gray-500 mt-1">{t('installPrompt')}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
            >
              {t('install')}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors"
            >
              {t('dismiss')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Offline Indicator Component
function OfflineIndicator() {
  const { t } = useLanguage()
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  if (!isOffline) return null
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-1 text-sm font-medium z-50">
      ⚠️ {t('offline')}
    </div>
  )
}

// Header Component with Logo and Navigation
function Header() {
  const { language, setLanguage, t } = useLanguage()
  const { lastResults, goToResults } = useResults()
  const location = useLocation()
  
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Back to Site */}
          <div className="flex items-center gap-4">
            {/* Logo links to profilco.gr */}
            <a href="https://profilco.gr" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img 
                src="/images/logo.png" 
                alt="Profilco" 
                className="h-12 w-auto"
              />
            </a>
            <div className="h-8 w-px bg-gray-200"></div>
            <a 
              href="https://profilco.gr" 
              className="text-gray-400 hover:text-orange-500 transition-colors text-sm flex items-center gap-1"
            >
              ← {t('backToSite')}
            </a>
          </div>
          
          {/* Center: Title */}
          <div className="hidden md:block">
            <Link to="/" className="font-semibold text-gray-800">
              {t('calculator')}
            </Link>
          </div>
          
          {/* Right: Last Results + Admin + Language */}
          <div className="flex items-center gap-3">
            {/* Last Results Button */}
            {lastResults && location.pathname === '/' && (
              <button
                onClick={goToResults}
                className="px-3 py-1.5 bg-orange-100 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors flex items-center gap-1"
              >
                <span>📊</span> {t('lastResults')}
              </button>
            )}
            
            {/* Admin Link */}
            {location.pathname !== '/admin' ? (
              <Link 
                to="/admin" 
                className="text-gray-500 hover:text-orange-500 transition-colors text-sm"
              >
                {t('admin')}
              </Link>
            ) : (
              <Link 
                to="/" 
                className="text-gray-500 hover:text-orange-500 transition-colors text-sm"
              >
                {t('calculator')}
              </Link>
            )}
            
            {/* Language Switcher */}
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <button 
                onClick={() => setLanguage('el')}
                className={`px-3 py-1 text-sm transition-colors ${language === 'el' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                EL
              </button>
              <button 
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-sm transition-colors ${language === 'en' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

// Language Provider Component
function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('el')
  const t = (key) => translations[language][key] || key
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Results Provider Component
function ResultsProvider({ children }) {
  const [lastResults, setLastResults] = useState(null)
  const [shouldShowResults, setShouldShowResults] = useState(false)
  
  const saveResults = (results) => {
    setLastResults(results)
  }
  
  const goToResults = () => {
    setShouldShowResults(true)
  }
  
  const clearShowResults = () => {
    setShouldShowResults(false)
  }
  
  return (
    <ResultsContext.Provider value={{ lastResults, saveResults, shouldShowResults, goToResults, clearShowResults }}>
      {children}
    </ResultsContext.Provider>
  )
}

// Main App Component
function App() {
  return (
    <LanguageProvider>
      <ResultsProvider>
        <div className="min-h-screen bg-gray-50">
          <OfflineIndicator />
          <Header />
          <Routes>
            <Route path="/" element={<Calculator />} />
            <Route path="/admin" element={<AdminInterface />} />
          </Routes>
          <InstallPrompt />
        </div>
      </ResultsProvider>
    </LanguageProvider>
  )
}

export default App
