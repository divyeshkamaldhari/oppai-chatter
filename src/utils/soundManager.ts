import { CometChat } from "@cometchat/chat-sdk-javascript";

// Immediately disable sounds on module load for all platforms
(function () {
  if (typeof window !== "undefined") {
    // Immediately disable sounds without waiting for initialization
    localStorage.setItem("cometchat_disable_sounds", "true");
    localStorage.setItem("cometchat_notification_sound", "false");
    localStorage.setItem("cometchat_message_sound", "false");
    localStorage.setItem("cometchat_call_sound", "false");
    localStorage.setItem("cometchat_ios_audio_disabled", "true");

    // Force disable any existing audio elements immediately
    if (typeof document !== "undefined") {
      const media = document.querySelectorAll("audio, video");
      media.forEach((el: any) => {
        el.volume = 0;
        el.muted = true;
        el.pause();
        el.preload = "none";
        el.autoplay = false;
        el.controls = false;
        el.loop = false;
      });
    }

    // Override Audio constructor immediately
    const OriginalAudio = window.Audio;
    window.Audio = function (src?: string) {
      const audio = new OriginalAudio(src);
      audio.volume = 0;
      audio.muted = true;
      audio.pause();
      audio.play = () => Promise.resolve();
      audio.preload = "none";
      audio.autoplay = false;
      audio.controls = false;
      return audio;
    } as any;
  }
})();

export class CometChatSoundManager {
  static async disableAllNotificationSounds(): Promise<void> {
    try {
      const currentUser = await CometChat.getLoggedinUser();
      if (!currentUser) {
        console.warn("No user logged in to disable sounds");
        return;
      }

      localStorage.setItem("cometchat_disable_sounds", "true");
      localStorage.setItem("cometchat_notification_sound", "false");
      localStorage.setItem("cometchat_message_sound", "false");
      localStorage.setItem("cometchat_call_sound", "false");

      //console.log("CometChat notification sounds disabled successfully");
    } catch (error) {
      console.error("Failed to disable CometChat sounds:", error);
    }
  }

  static async enableNotificationSounds(): Promise<void> {
    try {
      localStorage.removeItem("cometchat_disable_sounds");
      localStorage.removeItem("cometchat_notification_sound");
      localStorage.removeItem("cometchat_message_sound");
      localStorage.removeItem("cometchat_call_sound");
      //console.log("CometChat notification sounds enabled successfully");
    } catch (error) {
      console.error("Failed to enable CometChat sounds:", error);
    }
  }

  static areSoundsDisabled(): boolean {
    return localStorage.getItem("cometchat_disable_sounds") === "true";
  }

  static async initializeSoundSettings(): Promise<void> {
    try {
      const operations = [
        this.disableAllNotificationSounds(),
        Promise.resolve(this.overrideSoundSettings()),
        Promise.resolve(this.overrideWebAudioAPI()),
        Promise.resolve(this.disableMediaDevices()),
        Promise.resolve(this.disableCometChatSounds()),
      ];

      await Promise.allSettled(operations);

      // iOS-specific additional initialization
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        this.initializeIOSSoundSettings();
      }

      //console.log("Sound settings initialized successfully");
    } catch (error) {
      console.warn("Failed to initialize sound settings:", error);
    }
  }

  private static overrideSoundSettings(): void {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari =
      /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    // For iOS and Safari, we need to be more aggressive with sound disabling
    if (isSafari || isIOS) {
      console.log("iOS/Safari detected - applying aggressive audio overrides");
      this.forceDisableAllAudio();
      // Continue with overrides for iOS/Safari
    }

    const OriginalAudio = window.Audio;
    window.Audio = function (src?: string) {
      const audio = new OriginalAudio(src);
      if (
        CometChatSoundManager.areSoundsDisabled() ||
        (src &&
          (src.includes("incomingcall") ||
            src.includes("cometchat") ||
            src.includes("message") ||
            src.includes("notification")))
      ) {
        audio.volume = 0;
        audio.muted = true;
        audio.pause();
        audio.play = () => Promise.resolve();

        // iOS-specific: Override additional properties
        if (isIOS) {
          audio.preload = "none";
          audio.autoplay = false;
          audio.controls = false;
        }
      }
      return audio;
    } as any;

    const originalLoad = HTMLAudioElement.prototype.load;
    const originalPlay = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function () {
      if (CometChatSoundManager.areSoundsDisabled()) {
        this.volume = 0;
        this.muted = true;

        // iOS-specific: Additional properties
        if (isIOS) {
          this.preload = "none";
          this.autoplay = false;
          this.controls = false;
        }

        return Promise.resolve();
      }
      return originalPlay.call(this);
    };

    HTMLAudioElement.prototype.load = function () {
      if (CometChatSoundManager.areSoundsDisabled()) {
        this.volume = 0;
        this.muted = true;
        return;
      }
      return originalLoad.call(this);
    };
    Object.defineProperty(HTMLAudioElement.prototype, "volume", {
      get: function () {
        return CometChatSoundManager.areSoundsDisabled()
          ? 0
          : this._volume || 0;
      },
      set: function (value) {
        this._volume = CometChatSoundManager.areSoundsDisabled() ? 0 : value;
      },
    });

    Object.defineProperty(HTMLAudioElement.prototype, "muted", {
      get: function () {
        return CometChatSoundManager.areSoundsDisabled()
          ? true
          : this._muted || false;
      },
      set: function (value) {
        this._muted = CometChatSoundManager.areSoundsDisabled() ? true : value;
      },
    });
  }

  private static overrideWebAudioAPI(): void {
    if (typeof window !== "undefined" && window.AudioContext) {
      const OriginalAudioContext = window.AudioContext;
      const OriginalOfflineAudioContext = window.OfflineAudioContext;

      window.AudioContext = function () {
        const context = new OriginalAudioContext();
        if (CometChatSoundManager.areSoundsDisabled()) {
          const originalDestination = context.destination;
          const gainNode = context.createGain();
          gainNode.gain.value = 0;
          gainNode.connect(originalDestination);
          Object.defineProperty(context, "destination", {
            value: gainNode,
            writable: false,
          });
        }
        return context;
      } as any;

      if (OriginalOfflineAudioContext) {
        window.OfflineAudioContext = function (
          channels: number,
          length: number,
          rate: number
        ) {
          const context = new OriginalOfflineAudioContext(
            channels,
            length,
            rate
          );
          if (CometChatSoundManager.areSoundsDisabled()) {
            const gainNode = context.createGain();
            gainNode.gain.value = 0;
          }
          return context;
        } as any;
      }
    }
  }

  private static disableMediaDevices(): void {
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices?.getUserMedia
    ) {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = function (constraints) {
        if (
          CometChatSoundManager.areSoundsDisabled() &&
          constraints &&
          constraints.audio
        ) {
          constraints.audio = false;
        }
        return originalGetUserMedia.call(this, constraints);
      };
    }
  }

  private static disableCometChatSounds(): void {
    // Disable CometChat's internal sound mechanisms
    if (typeof window !== "undefined") {
      // Override any CometChat sound-related functions
      (window as any).CometChatSound = {
        play: () => Promise.resolve(),
        stop: () => {},
        pause: () => {},
        volume: 0,
        muted: true,
      };

      // Disable any CometChat audio elements
      const disableCometChatAudio = () => {
        const audioElements = document.querySelectorAll(
          'audio[src*="cometchat"], audio[src*="incomingcall"], audio[src*="message"], audio[src*="notification"], audio[src*="incomingcall.wav"]'
        );
        audioElements.forEach((el: any) => {
          el.volume = 0;
          el.muted = true;
          el.pause();
          el.preload = "none";
          el.autoplay = false;
          el.controls = false;
          el.loop = false;
          el.onplay = null;
          el.oncanplay = null;
          el.onloadeddata = null;
        });
      };

      // Run immediately and set up monitoring
      disableCometChatAudio();

      // Monitor for new CometChat audio elements
      if (typeof MutationObserver !== "undefined") {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node: any) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === "AUDIO") {
                  const src = node.src || node.getAttribute("src") || "";
                  if (
                    src.includes("cometchat") ||
                    src.includes("incomingcall") ||
                    src.includes("message") ||
                    src.includes("notification") ||
                    src.includes("incomingcall.wav")
                  ) {
                    node.volume = 0;
                    node.muted = true;
                    node.pause();
                    node.preload = "none";
                    node.autoplay = false;
                    node.controls = false;
                    node.loop = false;
                    node.onplay = null;
                    node.oncanplay = null;
                    node.onloadeddata = null;
                  }
                }
              }
            });
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["src", "autoplay"],
        });

        (window as any).__cometChatAudioObserver = observer;
      }
    }
  }

  static forceDisableAllAudio(): void {
    if (typeof document !== "undefined") {
      const media = document.querySelectorAll("audio, video");
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      media.forEach((el: any) => {
        el.volume = 0;
        el.muted = true;
        el.pause();

        // iOS-specific: Additional properties
        if (isIOS) {
          el.preload = "none";
          el.autoplay = false;
          el.controls = false;
          el.loop = false;
        }

        if (el.audioTracks) {
          for (let i = 0; i < el.audioTracks.length; i++) {
            el.audioTracks[i].enabled = false;
          }
        }
      });
    }
  }

  private static initializeIOSSoundSettings(): void {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return;

    // console.log("Initializing iOS-specific sound settings");

    // Disable all audio contexts on iOS
    if (typeof window !== "undefined" && window.AudioContext) {
      const OriginalAudioContext = window.AudioContext;
      window.AudioContext = function () {
        const context = new OriginalAudioContext();
        // Immediately suspend the context on iOS
        context.suspend();
        return context;
      } as any;
    }

    // Override any existing audio elements
    this.forceDisableAllAudio();

    // Set iOS-specific localStorage flags
    localStorage.setItem("cometchat_ios_audio_disabled", "true");
    localStorage.setItem("cometchat_disable_audio_context", "true");
    localStorage.setItem("cometchat_disable_web_audio", "true");

    // Monitor for new audio elements more aggressively on iOS
    if (
      typeof document !== "undefined" &&
      typeof MutationObserver !== "undefined"
    ) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node: any) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === "AUDIO" || node.tagName === "VIDEO") {
                // Immediately disable any new audio/video elements
                node.volume = 0;
                node.muted = true;
                node.pause();
                node.preload = "none";
                node.autoplay = false;
                node.controls = false;
                node.loop = false;

                // Remove any event listeners that might play sound
                node.onplay = null;
                node.oncanplay = null;
                node.onloadeddata = null;
              }
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "autoplay"],
      });

      (window as any).__cometChatIOSAudioObserver = observer;
    }
  }

  static startAudioMonitoring(): void {
    if (
      typeof document !== "undefined" &&
      typeof MutationObserver !== "undefined"
    ) {
      const observer = new MutationObserver((mutations) => {
        if (CometChatSoundManager.areSoundsDisabled()) {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node: any) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === "AUDIO" || node.tagName === "VIDEO") {
                  node.volume = 0;
                  node.muted = true;
                  node.pause();

                  // iOS-specific: Additional properties
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  if (isIOS) {
                    node.preload = "none";
                    node.autoplay = false;
                    node.controls = false;
                    node.loop = false;
                    // Remove any event listeners that might play sound
                    node.onplay = null;
                    node.oncanplay = null;
                    node.onloadeddata = null;
                  }
                }
                const nested = node.querySelectorAll?.("audio, video") || [];
                nested.forEach((el: any) => {
                  el.volume = 0;
                  el.muted = true;
                  el.pause();

                  // iOS-specific: Additional properties
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  if (isIOS) {
                    el.preload = "none";
                    el.autoplay = false;
                    el.controls = false;
                    el.loop = false;
                    // Remove any event listeners that might play sound
                    el.onplay = null;
                    el.oncanplay = null;
                    el.onloadeddata = null;
                  }
                });
              }
            });
          });
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "autoplay"],
      });

      (window as any).__cometChatAudioObserver = observer;
    }
  }
}
