import { createContext, useEffect, useReducer, useState } from "react";
import { appReducer, defaultAppState } from "./appReducer";
import { X_Auth_Token } from "../constant/AppUserRole";

export const AppContext = createContext({
  appState: defaultAppState,
  setAppState: ({}) => {},
  userTags: [],
  setUserTags: ({}) => {},
  userAnalytics: { dob: "", content_type: "" },
  setUserAnalytics: ({}) => {},
  purchases: [],
  setPurchases: () => {}
});

export const AppContextProvider = ({ children }) => {


  const [appState, setAppState] = useReducer(appReducer, defaultAppState);
  const [userTags, setUserTags] = useState([]);
  const [userAnalytics, setUserAnalytics] = useState({});
  const [purchases, setPurchases] =  useState([]);
 const [users, setUsers] = useState([]);
  useEffect(() => {
    const myHeaders = new Headers();
    myHeaders.append("X-Auth-Token", X_Auth_Token);
    myHeaders.append("accept", "application/json");

    const requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };

    fetch("/wp-json/cometchat/v1/tags", requestOptions)
      .then((response) => response.text())
      .then((result) => {
          const resultData = result ? JSON.parse(result) : [];
      // ✅ Always add "All" in the beginning
      setUserTags([{ slug: "", title: "All" }, ...resultData]);
        // setUserTags([{ slug: "none", title: "None" }, ...resultData]);
      })
      .catch((error) => console.error(error));
  }, []);

  return (
    <AppContext.Provider
      value={{
        appState,
        setAppState,
        userTags,
        setUserTags,
        userAnalytics,
        setUserAnalytics,
        setPurchases,
        purchases,
        users, setUsers
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
