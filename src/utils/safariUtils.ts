/**
 * Safari-specific utility functions for compatibility
 */

export class SafariUtils {
  /**
   * Check if the current browser is Safari
   */
  static isSafari(): boolean {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }

  /**
   * Check if the current browser is iOS Safari
   */
  static isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  /**
   * Check if the current browser is iOS Safari
   */
  static isIOSSafari(): boolean {
    return this.isIOS() && this.isSafari();
  }

  /**
   * Fix viewport height issues in Safari
   */
  static fixViewportHeight(): void {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
  }

  /**
   * Apply Safari-specific CSS fixes
   */
  static applySafariFixes(): void {
    if (!this.isSafari() && !this.isIOS()) return;

    // Fix for Safari input zoom
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    }

    // Fix for Safari flexbox issues
    (document.body.style as any).webkitOverflowScrolling = 'touch';

    // Fix for Safari animation issues
    (document.documentElement.style as any).webkitAnimationFillMode = 'both';

    // Fix for Safari touch targets
    const style = document.createElement('style');
    style.textContent = `
      button, [role="button"], .cometchat-button {
        min-height: 44px !important;
        min-width: 44px !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Fix Safari audio issues
   */
  static fixAudioIssues(): void {
    if (!this.isIOSSafari()) return;

    // iOS Safari requires user interaction to play audio
    const enableAudio = () => {
      const audio = new Audio();
      audio.play().catch(() => {
        // Audio play failed, which is expected without user interaction
      });
      document.removeEventListener('touchstart', enableAudio);
      document.removeEventListener('click', enableAudio);
    };

    document.addEventListener('touchstart', enableAudio, { once: true });
    document.addEventListener('click', enableAudio, { once: true });
  }

  /**
   * Fix Safari scroll issues
   */
  static fixScrollIssues(): void {
    if (!this.isSafari() && !this.isIOS()) return;

    // Add smooth scrolling for Safari
    document.documentElement.style.scrollBehavior = 'smooth';
    (document.documentElement.style as any).webkitScrollBehavior = 'smooth';

    // Fix for Safari momentum scrolling
    const scrollElements = document.querySelectorAll('.selector-wrapper, .messages-wrapper .cometchat-list__body, .side-component-content');
    scrollElements.forEach(element => {
      ((element as HTMLElement).style as any).webkitOverflowScrolling = 'touch';
    });
  }

  /**
   * Fix Safari input issues
   */
  static fixInputIssues(): void {
    if (!this.isSafari() && !this.isIOS()) return;

    // Fix for Safari input styling
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      ((input as HTMLElement).style as any).webkitAppearance = 'none';
      (input as HTMLElement).style.borderRadius = '0';
    });

    // Fix for Safari focus issues
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        ((input as HTMLElement).style as any).webkitTapHighlightColor = 'transparent';
      });
    });
  }

  /**
   * Fix Safari animation issues
   */
  static fixAnimationIssues(): void {
    if (!this.isSafari() && !this.isIOS()) return;

    // Add webkit prefixes for animations
    const style = document.createElement('style');
    style.textContent = `
      @-webkit-keyframes spin {
        0% { -webkit-transform: rotate(0deg); }
        100% { -webkit-transform: rotate(360deg); }
      }
      
      @-webkit-keyframes fadeIn {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
      
      @-webkit-keyframes slideIn {
        0% { -webkit-transform: translateX(-100%); }
        100% { -webkit-transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Initialize all Safari fixes
   */
  static initialize(): void {
    this.fixViewportHeight();
    this.applySafariFixes();
    this.fixAudioIssues();
    this.fixScrollIssues();
    this.fixInputIssues();
    this.fixAnimationIssues();

   //console.log('Safari compatibility fixes applied');
  }
} 