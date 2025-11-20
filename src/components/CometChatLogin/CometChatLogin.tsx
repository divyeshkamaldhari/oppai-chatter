import React, { useCallback, useEffect, useState, memo } from "react";
import "../../styles//CometChatLogin/CometChatLogin.css";
import { useLocation, useNavigate } from "react-router-dom";
import cometChatLogo from "../../assets/cometchat_logo.svg"
import cometChatLogoDark from "../../assets/cometchat_logo_dark.svg";
import { CometChatUIKit, CometChatUIKitLoginListener } from "@cometchat/chat-uikit-react";
import { COMETCHAT_CONSTANTS } from "../../AppConstants";
// import { sampleUsers } from "./sampledata";

type User = {
  name: string;
  uid: string;
  avatar: string;
};

type UserJson = {
  users: User[];
};

const CometChatLogin = memo((userUuid: any) => {
  const [selectedUid, setSelectedUid] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [initializationStep, setInitializationStep] = useState("Initializing...");
  const navigate = useNavigate();

  function hasCredentials() {
    const appID: string = localStorage.getItem('appId') || COMETCHAT_CONSTANTS.APP_ID;
    const region: string = localStorage.getItem('region') || COMETCHAT_CONSTANTS.REGION;
    const authKey: string = localStorage.getItem('authKey') || COMETCHAT_CONSTANTS.AUTH_KEY;

    if (appID === '' || region === '' || authKey === '') return false;
    return true;
  }

  useEffect(() => {
    // Fast check for already logged in user
    const loggedInUser = CometChatUIKitLoginListener.getLoggedInUser();
    if (loggedInUser) {
      navigate('/home', { replace: true });
      return;
    }

    if (!hasCredentials()) {
      navigate('/credentials');
      return;
    }

    // Only proceed with auto-login if needed
    handleAutoLogin();
  }, []);

  // Optimized login function with better error handling and faster execution
  async function login(uid: string) {
    if (isLoggingIn) {
      return;
    }

    setIsLoggingIn(true);
    setSelectedUid(uid);
    setLoginError(null);

    try {
      setInitializationStep("Connecting to chat...");

      // Detect mobile device for better timeout handling
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const timeoutDuration = isMobile ? 30000 : 15000; // 30 seconds for mobile, 15 for desktop

      // Use Promise.race to add timeout for login
      const loginPromise = CometChatUIKit.login(uid);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Login timeout after ${timeoutDuration / 1000}s`)), timeoutDuration)
      );

      const loggedInUser = await Promise.race([loginPromise, timeoutPromise]) as any;

      if (loggedInUser) {
        setInitializationStep("Setting up session...");

        const authToken = loggedInUser.getAuthToken();
        const role = loggedInUser.getRole();
        // Parallel execution of storage operations
        await Promise.all([
          // Store auth token
          new Promise(resolve => {
            localStorage.setItem("AuthToken", authToken);
            localStorage.setItem("userRole", role);
            document.cookie = `auth_token=${authToken};  path=/;`;
            resolve(void 0);
          }),
          // Set cookie with auth token
          new Promise(resolve => {
            const expires = new Date();
            expires.setDate(expires.getDate() + 1);
            document.cookie = `auth_token=${authToken}; expires=${expires.toUTCString()}; path=/;`;
            resolve(void 0);
          })
        ]);

        setInitializationStep("Redirecting...");

        // Use requestAnimationFrame for smoother transition
        requestAnimationFrame(() => {
          navigate("/home", { replace: true });
        });
      }
    } catch (error: any) {
      console.error("Auto-login failed:", error);
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      let errorMessage = "Failed to login automatically. Please try again.";
      if (error.message.includes('timeout')) {
        errorMessage = isMobile
          ? "Connection timeout. Please check your internet connection and try again."
          : "Connection timeout. Please check your internet connection.";
      } else if (error.message.includes('network')) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error.message.includes('unauthorized')) {
        errorMessage = "Authentication failed. Please try again.";
      }

      setLoginError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleAutoLogin() {
    if (!userUuid?.userUuid) {
      console.error("No user UUID provided for auto-login");
      setLoginError("No user ID provided");
      return;
    }

    if (!hasCredentials()) {
      console.error("Missing CometChat credentials");
      setLoginError("Missing app credentials");
      return;
    }

    try {
      await login(userUuid.userUuid);
    } catch (error) {
      console.error("Auto-login error:", error);
      setLoginError("Auto-login failed");
    }
  }

  function getUserBtnWithKeyAdded({ name, uid, avatar }: User) {
    return (
      <>
        <div
          key={uid}
          onClick={() => login(uid)}
          className={`cometchat-login__user ${selectedUid === uid ? "cometchat-login__user-selected " : ""}`}
        >
          {selectedUid === uid ? (
            <>
              <div className='cometchat-login__user-selection-indicator'>
                <div className='cometchat-login__user-selection-checked'></div>
              </div>
            </>
          ) : (
            null
          )}

          <img
            src={avatar}
            alt={`${name}'s avatar`}
            className='cometchat-login__user-avatar'
          />
          <div className='cometchat-login__user-name-and-uid cometchat-login__user-details'>
            <div className='cometchat-login__user-name'>{name}</div>
            <div className='cometchat-login__user-uid'>{uid}</div>
          </div>
        </div>
      </>
    );
  }

  const handleChangeCredentials = () => {
    localStorage.removeItem("region");
    localStorage.removeItem("appId");
    localStorage.removeItem("authKey");
    navigate('/credentials');
  }

  return (
    <div className="cometchat-login__container" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      background: 'var(--cometchat-background-color-01, #fff)'
    }}>
      {/* {
      isLoggingIn && (
        <>
          <div className="spinner-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div className="spinner" style={{
              width: '50px',
              height: '50px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #1CBD43',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}></div>
            <div style={{
              textAlign: 'center'
            }}>
              <p style={{ 
                color: 'var(--cometchat-text-color-primary, #141414)',
                fontSize: '18px',
                fontWeight: '600',
                margin: '0 0 8px 0'
              }}>
                {initializationStep}
              </p>
              <p style={{ 
                color: 'var(--cometchat-text-color-secondary, #727272)',
                fontSize: '14px',
                margin: 0
              }}>
                Please wait while we set up your chat experience
              </p>
            </div>
          </div>
        </>
      )}   */}

      {loginError && !isLoggingIn && (
        <div style={{
          padding: '24px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '12px',
          color: '#c33',
          textAlign: 'center',
          maxWidth: '400px',
          width: '90%'
        }}>
          <div style={{
            fontSize: '20px',
            marginBottom: '12px'
          }}>⚠️</div>
          <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', fontSize: '16px' }}>
            Connection Failed
          </p>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.4' }}>
            {loginError}
          </p>
          <button
            onClick={() => handleAutoLogin()}
            style={{
              padding: '12px 24px',
              background: '#1CBD43',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#17a33a'}
            onMouseOut={(e) => e.currentTarget.style.background = '#1CBD43'}
          >
            Try Again
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .spinner-container {
          backdrop-filter: none;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .spinner {
            animation: spin 1.5s linear infinite;
          }
        }
      `}</style>
    </div>
  );
});

export default CometChatLogin;

