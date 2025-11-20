import { CometChatUIKit } from "@cometchat/chat-uikit-react";
import { useCallback, useEffect, useState } from "react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CometChatHome } from "./components/CometChatHome/CometChatHome";
import Login from "./components/CometChatLogin/CometChatLogin";
import Loader from "./components/Loader";
import { Waifu } from "./components/WaifuSidebar/Waifu";
import { AppContextProvider } from "./context/AppContext";
import "./styles/App.css";
import { X_Auth_Token } from "./constant/AppUserRole";

interface IAppProps {
  loggedInUser?: CometChat.User;
  theme?: string;
}

function App(props: IAppProps) {
  return (
    <div className="App">
      {/* MemoryRouter is here, so everything below can safely use useNavigate */}
      <MemoryRouter>
        <InnerApp theme={props.theme} />
      </MemoryRouter>
    </div>
  );
}

function InnerApp({ theme }: { theme?: string }) {
  // const navigate = useNavigate();

  const [userUuid, setUserUuid] = useState<any>(
    localStorage.getItem("switching_user")
      ? localStorage.getItem("switching_user")
      : "users_28"
  );
  const [selectedUserUuid, setSelectedUserUuid] = useState("");
  const [api_key, setApi_key] = useState("");
  const [event_name, setEvent_name] = useState("");
  const [user_bio_text, setUser_bio_text] = useState("");
  const [userMetaData, setUserMetaData] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [userTags, setUserTags] = useState<any>([]);

  const eventTriggerFunction = useCallback(async (event: any) => {
    setLoading(true);
    const userUID = event.detail.userUID;
    setApi_key(event.detail.api_key);
    setEvent_name(event.detail.event_name || "");
    setSelectedUserUuid(event.detail.selected_user);
    setUser_bio_text(event.detail.user_bio || "");
    setUserMetaData(event?.detail?.metadata);
    localStorage.setItem("switching_user", userUID);

    try {
      // 🔑 Call CometChat login
      await CometChatUIKit.logout();
      await CometChatUIKit.login(userUID);
      setUserUuid(userUID);
      // navigate("/home", { replace: true });
    } catch (error) {
      console.error("❌ CometChat login failed:", error);
    } finally {
      setLoading(false); // ✅ hide loader after done
    }
  }, []);

  useEffect(() => {
    window.addEventListener("cometchatUserevent", eventTriggerFunction);
    return () => {
      window.removeEventListener("cometchatUserevent", eventTriggerFunction);
    };
  }, [eventTriggerFunction]);

  useEffect(() => {
    const myHeaders = new Headers();
    myHeaders.append("X-Auth-Token", X_Auth_Token);
    myHeaders.append("accept", "application/json");

    const requestOptions: any = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };

    fetch("/wp-json/cometchat/v1/tags", requestOptions)
      .then((response) => response.text())
      .then((result) => {
        const resultData: any = result ? JSON.parse(result) : [];
        setUserTags([{ slug: "", title: "All" }, ...resultData]);
      })
      .catch((error) => console.error(error));
  }, []);

  return (
    <AppContextProvider>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      <Waifu userUuid={userUuid} />

      {loading ? (
        <Loader />
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          {userUuid && (
            <Route path="login" element={<Login userUuid={userUuid} />} />
          )}
          <Route
            path="home"
            element={
              <CometChatHome
                theme={theme}
                userUuid={userUuid}
                userBio={user_bio_text}
                selectedUserUuid={selectedUserUuid}
                userMetaData={userMetaData}
                userTags={userTags}
              />
            }
          />
        </Routes>
      )}
    </AppContextProvider>
  );
}

export default App;
