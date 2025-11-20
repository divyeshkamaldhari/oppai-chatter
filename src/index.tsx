import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/sound-disable.css';
import './styles/safari-fixes.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { COMETCHAT_CONSTANTS } from './AppConstants';
import { CometChatUIKit, UIKitSettingsBuilder } from '@cometchat/chat-uikit-react';
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { metaInfo } from './metaInfo';
import { setupLocalization } from './utils/utils';
import { CometChatSoundManager } from './utils/soundManager';
import { PerformanceMonitor } from './utils/performanceMonitor';
import { SafariUtils } from './utils/safariUtils';
import { handleIOSError, initializeIOSOptimizations, isIOS, monitorIOSPerformance, testIOSOptimizations } from './utils/iosOptimizations';

// Initialize Safari compatibility fixes
if (typeof window !== 'undefined') {
  SafariUtils.initialize();
}

const getBrowserTheme = (): 'dark' | 'dark' => {
  const isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDarkTheme ? 'dark' : 'dark';
};

const appID: string = COMETCHAT_CONSTANTS.APP_ID || (localStorage.getItem('appId') ?? ""); // Use the latest appId if available
const region: string = COMETCHAT_CONSTANTS.REGION || (localStorage.getItem('region') ?? ""); // Default to 'us' if region is not found
const authKey: string = COMETCHAT_CONSTANTS.AUTH_KEY || (localStorage.getItem('authKey') ?? ""); // Default authKey if not found

// Start performance monitoring
PerformanceMonitor.startTimer('App Initialization');
PerformanceMonitor.monitorWebVitals();

// Test iOS optimizations in development
if (process.env.NODE_ENV === 'development') {
  testIOSOptimizations();
}

// Initialize iOS optimizations
const cleanupIOSOptimizations = initializeIOSOptimizations();
if (isIOS()) {
  monitorIOSPerformance();
}

if (appID && region && authKey) {
  const uiKitSettings = new UIKitSettingsBuilder()
    .setAppId(appID)
    .setRegion(region)
    .setAuthKey(authKey)
    .subscribePresenceForAllUsers()
    .build();

  // Initialize localization for the sample app and UI Kit.
  // Pass a specific language code (e.g., 'en' for English, 'fr' for French') 
  // or leave it undefined to use the browser's default language.
  PerformanceMonitor.startTimer('Localization Setup');
  setupLocalization();
  PerformanceMonitor.endTimer('Localization Setup');

/*
 * Note:
 * If you need to update the localization strings for a specific language in the UI Kit,
 * use the `CometChatLocalize.init` method. This allows you to override or add custom 
 * translations for a language. Here's an example:
 *
 * CometChatLocalize.init('fr', { 
 *     'fr': { 
 *         "CONTINUE": "Continuer",
 *         "NAME": "Nom",
 *     }
 * });
 *
 * In this example, the French localization is updated with custom strings for "CONTINUE" and "NAME".
 */

  // Optimize initialization by running operations in parallel
  const initPromise = CometChatUIKit.init(uiKitSettings);
  const rootElement = document.getElementById('root') as HTMLElement;
  const root = ReactDOM.createRoot(rootElement);
  
  // Detect mobile device for better timeout handling
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSafari = SafariUtils.isSafari();
  const timeoutDuration = isMobile ? 30000 : 15000; // 30 seconds for mobile, 15 for desktop
  
  // Show early loading indicator
  root.render(
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: 'calc(var(--vh, 1vh) * 100)',
      flexDirection: 'column',
      background: '#fff',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #1CBD43',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        WebkitAnimation: 'spin 0.8s linear infinite'
      }}></div>
      <p style={{ 
        color: '#141414',
        fontSize: '16px',
        margin: '20px 0 0 0',
        textAlign: 'center',
        padding: '0 20px'
      }}>
        {isMobile ? 'Loading Chat App (Mobile)...' : 'Loading Chat App...'}
      </p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); -webkit-transform: rotate(0deg); }
          100% { transform: rotate(360deg); -webkit-transform: rotate(360deg); }
        }
        @-webkit-keyframes spin {
          0% { -webkit-transform: rotate(0deg); }
          100% { -webkit-transform: rotate(360deg); }
        }
        @supports (-webkit-touch-callout: none) {
          /* iOS-specific styles */
          body { -webkit-text-size-adjust: 100%; }
        }
      `}</style>
    </div>
  );

  // Add timeout to initialization
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Initialization timeout after ${timeoutDuration/1000}s`)), timeoutDuration)
  );

  Promise.race([initPromise, timeoutPromise]).then(async (response) => {
    
    // Initialize sound management in parallel with app rendering
    const soundPromise = CometChatSoundManager.initializeSoundSettings().catch(err => 
      console.warn('Sound manager initialization failed:', err)
    );
    
    // Start audio monitoring to catch new audio elements
    CometChatSoundManager.startAudioMonitoring();
    CometChatSoundManager.forceDisableAllAudio();
    
    // Render app immediately, don't wait for sound initialization
    root.render(<App theme={getBrowserTheme()} />);
    
    // Complete sound initialization in background
    await soundPromise;
  }).catch(error => {
    console.error('CometChat initialization failed:', error);
    // Show error state with mobile-friendly messaging
    root.render(
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 'calc(var(--vh, 1vh) * 100)',
        flexDirection: 'column',
        background: '#fff',
        padding: '20px'
      }}>
        <div style={{ color: '#c33', textAlign: 'center' }}>
          <h2>Failed to Initialize Chat</h2>
          <p>{isMobile ? 'Please check your internet connection and try again.' : 'Please refresh the page to try again.'}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '10px 20px',
              background: '#1CBD43',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px',
              fontSize: '16px',
              minHeight: '44px', // Better touch target for mobile
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none'
            }}
          >
            {isMobile ? 'Retry' : 'Refresh Page'}
          </button>
        </div>
      </div>
    );
  });

  Promise.race([initPromise, timeoutPromise])
    .then(async (response) => {
      
      // Initialize sound management in parallel with app rendering
      const soundPromise = CometChatSoundManager.initializeSoundSettings().catch(err => 
        console.warn('Sound manager initialization failed:', err)
      );
      
      // Start audio monitoring to catch new audio elements
      CometChatSoundManager.startAudioMonitoring();
      CometChatSoundManager.forceDisableAllAudio();
      
      // Render app immediately, don't wait for sound initialization
      root.render(<App theme={getBrowserTheme()} />);
      
      // Complete sound initialization in background
      await soundPromise;
    })
    .catch(error => {
      console.error('CometChat initialization failed:', error);
      
      // Handle iOS-specific errors
      handleIOSError(error);
      
      // Show error state with iOS-specific styling
      root.render(
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(var(--vh, 1vh) * 100)',
          flexDirection: 'column',
          background: '#fff',
          padding: '20px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999
        }}>
          <div style={{ color: '#c33', textAlign: 'center', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
              {isIOS() ? 'Chat App Loading Failed' : 'Failed to Initialize Chat'}
            </h2>
            <p style={{ fontSize: '16px', lineHeight: '1.5', marginBottom: '20px' }}>
              {isIOS() 
                ? 'Please check your internet connection and try again. If the problem persists, try refreshing the page.'
                : 'Please refresh the page to try again.'
              }
            </p>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                padding: '12px 24px',
                background: '#1CBD43',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                minHeight: '44px', // iOS minimum touch target
                WebkitAppearance: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {isIOS() ? 'Try Again' : 'Refresh Page'}
            </button>
          </div>
        </div>
      );
    });
  try { CometChat.setDemoMetaInfo(metaInfo) } catch (err) { }
} else {
  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <App theme={getBrowserTheme()} />
  );
}

// Register service worker for caching and performance
if ('serviceWorker' in navigator) {
  // Check if we're on iOS Safari
  const isIOS = SafariUtils.isIOS();
  const isSafari = SafariUtils.isSafari();
  
  // Be more careful with service worker on iOS Safari
  if (isIOS && isSafari) {

  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
         
        })
        .catch((registrationError) => {
        
          // Don't show error to user, just log it
        });
    });
  }
}

// Cleanup iOS optimizations on page unload
window.addEventListener('beforeunload', () => {
  cleanupIOSOptimizations();
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
