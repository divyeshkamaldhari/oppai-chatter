import executeHttp from ".";
import { COMETCHAT_CONSTANTS } from "../AppConstants";
import { BACKEND_API_URL, X_Auth_Token } from "../constant/AppUserRole";

const cometChatAPIURL = `https://${COMETCHAT_CONSTANTS.APP_ID}.api-${COMETCHAT_CONSTANTS.REGION}.cometchat.io/v3`;

export const allWaifuCounts = async () => {
  try {
    const response = await executeHttp({
      method: "GET",
      url: `${cometChatAPIURL}/users?role=waifu`,
      headers: {
        apikey: COMETCHAT_CONSTANTS.REST_API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error("CometChat unread count error:", error);
    throw error;
  }
};

export const waifusUnreadCount = async (userId: string) => {
  try {
    const response = await executeHttp({
      method: "GET",
      url: `${cometChatAPIURL}/messages?count=true&unread=true`,
      headers: {
        apikey: COMETCHAT_CONSTANTS.REST_API_KEY,
        onBehalfOf: `users_${userId}`,
      },
    });
    return response.data;
  } catch (err) {
    console.error("CometChat unread count error:", err);
    throw err;
  }
};

export const fetchNewUserCounts = async () => {
  try {
    const response = await executeHttp({
      method: "GET",
      url: `${BACKEND_API_URL}/api/auth/new-user-come`,
      headers: {
        "X-Auth-Token": X_Auth_Token,
      },
    });
    // Normalize possible response shapes
    const body = response?.data ?? {};
    // Prefer nested 'users' map if present, else assume body is already the map
    const normalized = (body && typeof body === "object" && body.users && typeof body.users === "object")
      ? body.users
      : (typeof body === "object" ? body : {});
    return normalized;
  } catch (error) {
    console.log("error: ", error);
  }
};

export const updateNewUserCounts = async (userId: string) => {
  try {
    const response = await executeHttp({
      method: "GET",
      url: `${BACKEND_API_URL}/api/auth/update-user-count?user_id=${userId}`,
      headers: {
        "X-Auth-Token": X_Auth_Token,
      },
    });
    const responseData = response?.data?.users || {};
    return responseData;
  } catch (error) {
    console.log("error: ", error);
  }
};

export const updateLatestPurchasesAPI = async (userId: string, activeWaifuId?: string) => {
  try {
    let url = `${BACKEND_API_URL}/api/auth/update-latest-purchases?user_id=${userId}`;
    if (activeWaifuId) {
      url += `&waifu_id=${activeWaifuId}`;
    }
    
    const response = await executeHttp({
      method: "GET",
      url,
      headers: {
        "X-Auth-Token": X_Auth_Token,
      },
    });
    const responseData = response?.data?.users || {};
    return responseData;
  } catch (error) {
    console.log("error: ", error);
  }
};

export const restoreLatestPurchasesAPI = async (userId: string) => {
  try {
    const response = await executeHttp({
      method: "GET",
      url: `${BACKEND_API_URL}/api/auth/restore-latest-purchases?user_id=${userId}`,
      headers: {
        "X-Auth-Token": X_Auth_Token,
      },
    });
    const responseData = response?.data || {};
    return responseData;
  } catch (error) {
    console.log("error restoring latest purchases: ", error);
  }
};
export const fetchNewContentCounts = async () => {
  try {
    const response = await executeHttp({
      method: "GET",
      url: `${BACKEND_API_URL}/api/auth/waifu-notification`,
      headers: {
        "X-Auth-Token": X_Auth_Token,
      },
    });
    const responseData = response?.data?.user_counts || {};
    return responseData;
  } catch (error) {
    console.log("error: ", error);
  }
};

export const updateNewUserContent = async (userId: string) => {
  try {
    const response = await executeHttp({
      method: "GET",
      url: `${BACKEND_API_URL}/api/auth/update-waifu-notification?user_id=${userId}`,
      headers: {
        "X-Auth-Token": X_Auth_Token,
      },
    });
    const responseData = response?.data?.users || {};
    return responseData;
  } catch (error) {
    console.log("error: ", error);
  }
};

/**
 * Fetch latest purchase types for users
 * API Endpoint: GET /api/auth/waifu-latest-purchases?user_id={userId}
 * 
 * Returns latest_type for each user (chat, content, or gift)
 * Used for: Setting border colors in chat list
 * - chat → green border
 * - content → blue border
 * - unread → red border (handled separately)
 */
export const fetchLatestTypes = async (userId: string) => {
  try {
    const response = await executeHttp({
      method: "GET",
      url: `${BACKEND_API_URL}/api/auth/waifu-latest-purchases?user_id=${userId}`,
      headers: {
        "X-Auth-Token": X_Auth_Token,
      },
    });
    return response?.data || {};
  } catch (error) {
    console.log("error fetching latest types: ", error);
    return {};
  }
};