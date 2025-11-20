/**
 * iOS-specific optimizations for CometChat
 * This file contains utilities to improve performance and compatibility on iOS devices
 */

// iOS detection utility
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// iOS Safari detection
export const isIOSSafari = (): boolean => {
  return isIOS() && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);
};

// Fix for iOS Safari 100vh issue
export const fixIOSViewport = (): (() => void) => {
  if (!isIOS()) return () => {};
  
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('resize', setVH);
    window.removeEventListener('orientationchange', setVH);
  };
};

// Prevent zoom on input focus for iOS
export const preventIOSZoom = (): (() => void) => {
  if (!isIOS()) return () => {};
  
  const preventZoom = (e: TouchEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      e.target.style.fontSize = '16px';
    }
  };
  
  document.addEventListener('touchstart', preventZoom, { passive: true });
  
  // Return cleanup function
  return () => {
    document.removeEventListener('touchstart', preventZoom);
  };
};

// Optimize CometChat initialization for iOS
export const optimizeCometChatForIOS = (): void => {
  if (!isIOS()) return;
  
  // Set iOS-specific localStorage flags
  localStorage.setItem('cometchat_ios_optimized', 'true');
  
  // Disable some features that might cause issues on iOS
  localStorage.setItem('cometchat_disable_audio_context', 'true');
  localStorage.setItem('cometchat_disable_web_audio', 'true');
  
  // Enable iOS-specific optimizations
  localStorage.setItem('cometchat_enable_ios_scroll_optimization', 'true');
  localStorage.setItem('cometchat_enable_ios_touch_optimization', 'true');
};

// Apply iOS-specific CSS optimizations
export const applyIOSOptimizations = (): void => {
  if (!isIOS()) return;
  
  const style = document.createElement('style');
  style.textContent = `
    /* iOS-specific optimizations */
    .cometchat-root {
      -webkit-overflow-scrolling: touch;
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
    }
    
    .conversations-wrapper,
    .messages-wrapper,
    .selector-wrapper {
      -webkit-overflow-scrolling: touch;
    }
    
    /* Fix for iOS Safari momentum scrolling */
    * {
      -webkit-overflow-scrolling: touch;
    }
    
    /* Prevent iOS Safari from adding margins */
    body {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    
    /* iOS-specific touch improvements */
    button, a, [role="button"] {
      -webkit-tap-highlight-color: transparent;
      min-height: 44px;
      min-width: 44px;
    }
    
    /* Fix for iOS Safari input zoom */
    input, textarea, select {
      font-size: 16px !important;
      -webkit-appearance: none;
      border-radius: 0;
    }
    
    /* iOS Safari specific fixes */
    @supports (-webkit-touch-callout: none) {
      .cometchat-root {
        height: calc(var(--vh, 1vh) * 100);
      }
      
      /* Fix for iOS Safari viewport issues */
      .messages-wrapper {
        height: calc(var(--vh, 1vh) * 100);
      }
    }
  `;
  
  document.head.appendChild(style);
};

// Initialize all iOS optimizations
export const initializeIOSOptimizations = (): (() => void) => {
  if (!isIOS()) return () => {};
  
  const cleanupFunctions: (() => void)[] = [];
  
  // Apply optimizations
  optimizeCometChatForIOS();
  applyIOSOptimizations();
  
  // Fix viewport
  const viewportCleanup = fixIOSViewport();
  cleanupFunctions.push(viewportCleanup);
  
  // Prevent zoom
  const zoomCleanup = preventIOSZoom();
  cleanupFunctions.push(zoomCleanup);
  
  // Return cleanup function
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
};

// iOS-specific error handling
export const handleIOSError = (error: any): void => {
  if (!isIOS()) return;
  
  console.warn('iOS-specific error:', error);
  
  // Handle specific iOS errors
  if (error.message?.includes('timeout')) {
    console.warn('iOS timeout detected, retrying...');
    // Add retry logic here if needed
  }
  
  if (error.message?.includes('network')) {
    console.warn('iOS network error detected');
    // Add network error handling here if needed
  }
};

// iOS-specific performance monitoring
export const monitorIOSPerformance = (): void => {
  if (!isIOS()) return;
  
  // Monitor memory usage on iOS
  if ('memory' in performance) {
    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
        console.warn('High memory usage detected on iOS');
      }
    }, 10000);
  }
  
  // Monitor frame rate on iOS
  let frameCount = 0;
  let lastTime = performance.now();
  
  const countFrames = () => {
    frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - lastTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      if (fps < 30) {
        console.warn('Low frame rate detected on iOS:', fps);
      }
      frameCount = 0;
      lastTime = currentTime;
    }
    
    requestAnimationFrame(countFrames);
  };
  
  requestAnimationFrame(countFrames);
};

// Test function to verify iOS optimizations
export const testIOSOptimizations = (): void => {
 //console.log('Testing iOS optimizations...');
 //console.log('Is iOS device:', isIOS());
 //console.log('Is iOS Safari:', isIOSSafari());
 //console.log('User Agent:', navigator.userAgent);
 //console.log('Platform:', navigator.platform);
 //console.log('Max Touch Points:', navigator.maxTouchPoints);
  
  if (isIOS()) {
   //console.log('iOS optimizations are active');
   //console.log('iOS optimized flag:', localStorage.getItem('cometchat_ios_optimized'));
   //console.log('VH CSS variable:', getComputedStyle(document.documentElement).getPropertyValue('--vh'));
  } else {
   //console.log('Not an iOS device, optimizations skipped');
  }
}; 