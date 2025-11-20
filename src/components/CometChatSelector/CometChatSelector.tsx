import {
  Call,
  CometChat,
  Conversation,
  Group,
  User,
} from "@cometchat/chat-sdk-javascript";

import {
  CometChatAvatar,
  CometChatConversations,
  CometChatMessageEvents,
  CometChatOption,
  CometChatUIKitLoginListener,
  CometChatUsers,
} from "@cometchat/chat-uikit-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { COMETCHAT_CONSTANTS } from "../../AppConstants";
import muteIcon from "../../assets/MuteIcon.svg";
// import unread from "../../assets/unread (1).png";
// import read from "../../assets/read1.png";
import userIcon from "../../assets/user.svg";
import { AppContext } from "../../context/AppContext";
import "../../styles/CometChatSelector/CometChatSelector.css";
import FriendListItem from "../FriendListItem/FriendListItem";
import { OppaiDragonUserRole } from "../../constant/AppUserRole";
import mainLogo from "../../assets/main_logo.svg";
import axios from "axios";
import {
  fetchNewContentCounts,
  fetchNewUserCounts,
  fetchLatestTypes,
  updateLatestPurchasesAPI,
  restoreLatestPurchasesAPI,
} from "../../axios/waifu";

export interface Friend {
  uid: string;
  name: string;
  avatar?: string;
  status?: string;
  hasBlockedMe?: boolean;
  blockedByMe?: boolean;
  statusMessage?: string;
  role?: string;
  lastActiveAt?: number;
  conversationId?: string;
  deactivatedAt?: number;
}

interface SelectorProps {
  group?: Group;
  showJoinGroup?: boolean;
  activeTab?: string;
  activeItem?: User | Group | Conversation | Call;
  onSelectorItemClicked?: (
    input: User | Group | Conversation | Call,
    type: string
  ) => void;
  onProtectedGroupJoin?: (group: Group) => void;
  showCreateGroup?: boolean;
  setShowCreateGroup?: Dispatch<SetStateAction<boolean>>;
  onHide?: () => void;
  onNewChatClicked?: () => void;
  setSelectedTag: Dispatch<SetStateAction<string>>;
  onGroupCreated?: (group: Group) => void;
  selectedUserUuid?: string;
  selectedTag?: string;
}

export const CometChatSelector = (props: SelectorProps) => {
  const {
    group,
    showJoinGroup,
    activeItem,
    activeTab,
    onSelectorItemClicked = () => {},
    onProtectedGroupJoin = () => {},
    showCreateGroup,
    setShowCreateGroup = () => {},
    setSelectedTag,
    onHide = () => {},
    onNewChatClicked = () => {},
    onGroupCreated = () => {},
    selectedTag = "",
    selectedUserUuid = "",
  } = props;

  const [loggedInUser, setLoggedInUser] = useState<CometChat.User | null>();
  const [defaultUser, setDefaultUser] = useState<CometChat.User | null>();
  const navigate = useNavigate();
  const { setAppState, userTags, setUsers } = useContext<any>(AppContext);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [refreshConversations, setRefreshConversations] = useState(0);
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<
    Conversation | User | Group | Call | undefined
  >();
  const [newUserCounts, setNewUserCounts] = useState<any>({});
  const [newContentCounts, setNewContentCounts] = useState<any>({});
  const [latestTypes, setLatestTypes] = useState<Record<string, string>>({});
  const [tagUnreadCounts, setTagUnreadCounts] = useState<
    Record<string, number>
  >({});
  const userTagCacheRef = useRef<Map<string, string[]>>(new Map());
  const loggedInUserIdRef = useRef<string | null>(null);

  // Hook to get last message from a conversation
  const getLastMessage = useCallback(async (conversationId: string, receiverType: string) => {
    try {
      const conversation = await CometChat.getConversation(conversationId, receiverType);
      const lastMessage = conversation?.getLastMessage() || null;
      return lastMessage;
    } catch (error) {
      console.error("Error getting last message:", error);
      return null;
    }
  }, []);

  // Call WP endpoint to update latest purchases for current user
  const updateLatestPurchases = useCallback(async (domId: string, activeWaifuId?: string) => {
    try {
      // const switchingUser = localStorage.getItem("switching_user") || "";
      const numericUserId = domId ? domId.slice(6) : "";
      if (!numericUserId) return;
      
      // Extract numeric ID from activeWaifuId if provided (handle both "users_123" and "123" formats)
      let numericActiveWaifuId: string | undefined = undefined;
      if (activeWaifuId) {
        numericActiveWaifuId = activeWaifuId.startsWith("users_") 
          ? activeWaifuId.replace("users_", "") 
          : activeWaifuId;
      }
     
        await updateLatestPurchasesAPI(numericUserId, numericActiveWaifuId);
      
      
    } catch (err) {
      console.error("Failed to update latest purchases", err);
    }
  }, []);

  // Fetch muted users (for mute icon)
  useEffect(() => {
    const fetchMutedUsers = async () => {
      try {
        const liu = await CometChat.getLoggedinUser();
        const uid = liu?.getUid() || "";
        const res = await fetch(
          `https://${COMETCHAT_CONSTANTS.APP_ID}.api-${COMETCHAT_CONSTANTS.REGION}.cometchat.io/${COMETCHAT_CONSTANTS.COMET_CHAT_API_VERSION}/notifications/v1/preferences/mute?uid=${uid}`,
          {
            headers: {
              accept: "application/json",
              apikey: COMETCHAT_CONSTANTS.REST_API_KEY,
              "content-type": "application/json",
            },
          }
        );
        const result = await res.json();
        const muted = result?.data?.mutedConversations || [];
        const ids = new Set<string>(muted.map((m: any) => m.id as string));
        setMutedUsers(ids);
      } catch (err) {
        console.error("Failed to fetch muted users", err);
      }
    };

    fetchMutedUsers();
  }, []);

  // local event to refresh list
  useEffect(() => {
    const handleConversationUpdate = () => {
      setRefreshConversations((prev) => prev + 1);
      fetchLatestTypeData();
    };
    window.addEventListener("conversationUpdated", handleConversationUpdate);
    return () => {
      window.removeEventListener(
        "conversationUpdated",
        handleConversationUpdate
      );
    };
  }, []);

  // 🔔 realtime triggers to recompute tag unread counts
  useEffect(() => {
    const handleConversationUpdate = (e: any) => {
      const updatedConversation = e.detail;
    };

    window.addEventListener("conversationUpdated", handleConversationUpdate);
    
    return () => {
      window.removeEventListener(
        "conversationUpdated",
        handleConversationUpdate
      );
    };
  }, []);

  const conversationsHeaderView = () => {
    return (
      <div>
        <div className="cometchat-conversations-header">
          <div
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
            className="clickable-logo cometchat-conversations-header__title"
          >
            <img
              src={mainLogo}
              alt="Oppai App Logo"
              style={{ height: "35px", objectFit: "contain" }}
            />
          </div>
        </div>
        <div className="tag-selector">
          {userTags.length > 0 &&
            userTags.map((item: { slug: string; title: string }) => (
              <button
                key={item.slug}
                onClick={() => setSelectedTag(item.slug)}
                style={{ color: "white" }}
                className={`${item.slug === selectedTag ? "active" : ""}`}
              >
                {item.title}
                {typeof tagUnreadCounts[item.slug] === "number" &&
                  tagUnreadCounts[item.slug] > 0 && (
                    <span
                      style={{
                        marginLeft: 8,
                        backgroundColor: "red",
                        color: "white",
                        borderRadius: 10,
                        padding: "0 6px",
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1.6,
                      }}
                    >
                      {tagUnreadCounts[item.slug] > 99
                        ? "99+"
                        : tagUnreadCounts[item.slug]}
                    </span>
                  )}
              </button>
            ))}
        </div>
      </div>
    );
  };

  const sendAutoReply = useCallback(
    async (receiverId: string, senderId: string) => {
      if (!isWithinOfficeHours()) {
        const headers = {
          accept: "application/json",
          apikey: COMETCHAT_CONSTANTS.REST_API_KEY,
          "content-type": "application/json",
          onBehalfOf: receiverId,
        };

        const body = JSON.stringify({
          category: "message",
          type: "text",
          data: {
            text: "I’m away but back at 6 PM ET— send me a message and I will text you when I’m back! 💌",
          },
          receiver: senderId,
          receiverType: "user",
        });

        try {
          const sendMessageBaseUrl = `https://${COMETCHAT_CONSTANTS.APP_ID}.api-${COMETCHAT_CONSTANTS.REGION}.cometchat.io/${COMETCHAT_CONSTANTS.COMET_CHAT_API_VERSION}/messages`;
          await fetch(sendMessageBaseUrl, {
            method: "POST",
            headers,
            body,
          });
        } catch (err) {
          console.error("Error sending auto message:", err);
        }
      }
    },
    []
  );

  const handleNewMessage = useCallback(
    async (newMessage: any) => {
      const rawDetail = newMessage;
      const loggedInUser = CometChatUIKitLoginListener.getLoggedInUser();

      if (!rawDetail || !loggedInUser) {
        console.error("Message or logged-in user missing");
        return;
      }

      const message = rawDetail?.message ?? rawDetail;
      const senderId =
        message?.sender?.uid ?? message?.senderId ?? message?.uid ?? undefined;

      const receiverId =
        message?.receiver?.uid ??
        message?.receiver ??
        message?.receiverId ??
        undefined;

      const loggedInUserId = loggedInUser.getUid();
      if (
        senderId &&
        receiverId &&
        loggedInUserId !== receiverId &&
        message?.receiverType === CometChat.RECEIVER_TYPE.USER &&
        message?.category === CometChat.CATEGORY_MESSAGE
      ) {
        try {
          const receiverUser = await CometChat.getUser(receiverId);

          if (
            receiverUser?.getRole() === OppaiDragonUserRole.CHAT_APP.WAIFU_USER
          ) {
            sendAutoReply(receiverId, senderId);
          }
        } catch (error) {
          console.error("Failed to fetch receiver user:", error);
        }
      }
    },
    [sendAutoReply]
  );

  const isWithinOfficeHours = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const etOffset = -4 * 60;
    const etTime = new Date(utc + etOffset * 60000);
    const hours = etTime.getHours();
    return hours >= 14 && hours < 18;
  };

  useEffect(() => {
    const DEFAULT_MESSAGE = "Hey 🥰";
    const DEFAULT_RECEIVER_TYPE = CometChat.RECEIVER_TYPE.USER;
    const ZOE_UID = "users_13"; // Zoe

    const initChatWithZoe = async (liu: CometChat.User) => {
      if (!liu) return;
      const isSubscriber = liu.getRole() === "subscriber";
      if (!isSubscriber) return;
      if (ZOE_UID === liu.getUid()) return;

      try {
        const conversation = await CometChat.getConversation(
          ZOE_UID,
          DEFAULT_RECEIVER_TYPE
        );
        const lastMessage = conversation?.getLastMessage();
        const lastMessageText =
          lastMessage &&
          "getText" in lastMessage &&
          typeof (lastMessage as any).getText === "function"
            ? (lastMessage as any).getText()
            : null;

        const isMessageInvalid =
          !lastMessageText ||
          typeof lastMessageText !== "string" ||
          lastMessageText.trim() === "";

        if (!lastMessage || isMessageInvalid) {
          await sendDefaultMessage(ZOE_UID);
          return;
        }
        onSelectorItemClicked(conversation, "updateSelectedItem");
      } catch (error: any) {
        if (
          error?.code === "ERR_CONVERSATION_NOT_FOUND" ||
          error?.code === "ERR_CONVERSATION_NOT_ACCESSIBLE" ||
          error?.status === 403 ||
          error?.status === 404
        ) {
          await sendDefaultMessage(ZOE_UID);
        } else {
          console.error("Unexpected error fetching Zoe conversation:", error);
        }
      }
    };

    const sendDefaultMessage = async (receiverId: string) => {
      const textMessage = new CometChat.TextMessage(
        receiverId,
        DEFAULT_MESSAGE,
        DEFAULT_RECEIVER_TYPE
      );

      try {
        await CometChat.sendMessage(textMessage);
        setTimeout(async () => {
          try {
            const updatedConversation = await CometChat.getConversation(
              receiverId,
              DEFAULT_RECEIVER_TYPE
            );
            if (updatedConversation) {
              onSelectorItemClicked(updatedConversation, "updateSelectedItem");
              const customEvent = new CustomEvent("conversationUpdated", {
                detail: updatedConversation,
              });
              window.dispatchEvent(customEvent);
            }
          } catch (err) {
            console.error(
              "Failed to fetch updated conversation after message:",
              err
            );
          }
        }, 200);
      } catch (err) {
        console.error("Failed to send message to Zoe:", err);
      }
    };

    const liu = CometChatUIKitLoginListener.getLoggedInUser() as CometChat.User;
    setLoggedInUser(liu);

    if (liu) {
      loggedInUserIdRef.current = liu.getUid()?.replace("users_", "") || liu.getUid() || "";
      const role = liu.getRole();
      if (role === "subscriber") {
        initChatWithZoe(liu);
      }
    }
  }, []);

  // 🧮 Compute unread counts grouped by tag (query CometChat per tag)
  const computeTagUnreadCounts = useCallback(async () => {
    try {
      const tagsArray: Array<{ slug: string; title?: string }> = Array.isArray(userTags)
        ? userTags.filter((t: any) => (t?.slug || t?.name))
        : [];

      const newCounts: Record<string, number> = {};

      for (const t of tagsArray) {
        const slug = (t as any).slug || (t as any).name;
        if (!slug) continue;

        let total = 0;
        const builder = new CometChat.ConversationsRequestBuilder()
          .setLimit(50)
          .withTags(true)
          .setUserTags([slug]);
        const request = builder.build();

        // paginate through conversations for this tag
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        while (true) {
          const page: any = await (request as any).fetchNext?.();
          const list: Conversation[] = Array.isArray(page) ? page : [];
          if (!list.length) break;
          for (const conv of list) {
            total += conv.getUnreadMessageCount?.() || 0;
          }
        }

        newCounts[slug] = total;
      }

      setTagUnreadCounts(newCounts);
    } catch (err) {
      console.error("Failed to compute tag unread counts", err);
    }
  }, [userTags]);

  useEffect(() => {
    let isCancelled = false;

    const runCompute = async () => {
      if (!isCancelled) {
        await computeTagUnreadCounts();
      }
    };

    runCompute();
    const interval = setInterval(runCompute, 10000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [refreshConversations, computeTagUnreadCounts]);

  // hide entire wrapper for subscribers
  useEffect(() => {
    const wrapper = document.querySelector(
      ".conversations-wrapper"
    ) as HTMLElement;
    if (wrapper) {
      if (loggedInUser?.getRole() === "subscriber") {
        wrapper.style.display = "none";
      } else {
        wrapper.style.display = "flex";
      }
    }
  }, [loggedInUser]);

  useEffect(() => {
    const messageSentSub = CometChatMessageEvents.ccMessageSent.subscribe(
      (message) => {
        handleNewMessage(message);
        computeTagUnreadCounts();
        // console.log("message", message);
        // // Check if message text matches the AFK message
        // const AFK_MESSAGE_TEXT = "Oh no, sweetie, I'm AFK rn! I've been on ~7-11 PM Eastern Time (ET) most days lately. Remember, I'm real, not a bot 🥰 Text me and I'll reply soon! PS: Bored? Check my pics, read my emails, or just swing by later! Urgent Qs? Hit up Zoe via email 💌";
    
        // const actualMessage = (message as any)?.message ?? message;
        // const messageText = actualMessage?.getText?.() || "";
        // if (messageText === AFK_MESSAGE_TEXT) {
        //   setRefreshConversations((prev) => prev + 1);
        // }
      }
    );

    return () => messageSentSub.unsubscribe();
  }, [handleNewMessage]);

  // Listen for message read events and recompute tag unread counts
  useEffect(() => {
    const messageReadSub = CometChatMessageEvents.ccMessageRead.subscribe(
      (_messageReceipt: any) => {
        computeTagUnreadCounts();
      }
    );

    return () => messageReadSub.unsubscribe();
  }, [computeTagUnreadCounts]);

  const CustomLeadingView = (conversation: Conversation) => {
    const conversationObj = conversation.getConversationWith();
    const isUser = conversationObj instanceof CometChat.User;
    const isGroup = conversationObj instanceof CometChat.Group;

    const avatar = isUser
      ? (conversationObj as CometChat.User).getAvatar()
      : (conversationObj as CometChat.Group).getIcon();
    const name = conversationObj.getName();

    const uid = isUser ? (conversationObj as CometChat.User).getUid() : null;
    const isMuted = uid ? mutedUsers.has(uid) : false;

    return (
      <div
        className="conversations__leading-view"
        style={{ display: "flex", alignItems: "center", gap: "5px" }}
      >
        <div
          className="comet-chat-user-avtar"
          style={{ position: "relative", overflow: "visible" }}
        >
          <CometChatAvatar image={avatar} name={name} />
        </div>
        <div className="comet-chat-user-muted-icon">
          {isMuted && (
            <img
              className="img-svg-muted"
              id="muted-icon"
              src={muteIcon}
              alt="Muted"
              title="Muted"
              style={{ width: "18px", height: "18px" }}
            />
          )}
        </div>
      </div>
    );
  };

  // Fetch badge counts for chat list (green/blue)
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const userCounts = await fetchNewUserCounts();
        const contentCounts = await fetchNewContentCounts();
        setNewUserCounts(userCounts || {});
        setNewContentCounts(contentCounts || {});
      } catch (error) {
        console.error("Error fetching badge counts:", error);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, []);
  const fetchLatestTypeData = async () => {
    try {
      const liu = await CometChat.getLoggedinUser();
      if (!liu) return;

      const userId =
        liu.getUid()?.replace("users_", "") || liu.getUid() || "";
      if (!userId) return;

      const response = await fetchLatestTypes(userId);
      if (response?.waifu_users && Array.isArray(response.waifu_users)) {
        const typeMap: Record<string, string> = {};
        response.waifu_users.forEach((user: any) => {
          if (user.user_id && user.latest_type) {
            typeMap[user.user_id] = user.latest_type;
            typeMap[`users_${user.user_id}`] = user.latest_type;
          }
        });
        setLatestTypes(typeMap);
      }
    } catch (error) {
      console.error("Error fetching latest types:", error);
    }
  };
  // Fetch latest types for border colors
  useEffect(() => {
    

    fetchLatestTypeData();
    const interval = setInterval(fetchLatestTypeData, 10000);
    return () => clearInterval(interval);
  }, []);

//   const applyBorderColors = async () => {
//     try {
      
//       const liu = await CometChat.getLoggedinUser();
//       if (!liu) return;

//       const loggedInUserId =
//         liu.getUid()?.replace("users_", "") || liu.getUid() || "";

//       const conversationItems = document.querySelectorAll(
//         ".cometchat-conversations__list-item"
//       );

//       conversationItems.forEach((item) => {
//         const listItem = item.querySelector(".cometchat-list-item");
//         if (!listItem) return;

//         const conversationId =
//           listItem.getAttribute("id") || listItem.getAttribute("data-id") || "";
//         const matches = conversationId.match(/users_(\d+)/g);
//         if (matches && matches.length > 0) {
//           const userIds = matches.map((m) => m.replace("users_", ""));
//           const otherUserId =
//             userIds.find((uid) => uid !== loggedInUserId) || userIds[0];

//           let latestType: string | null = null;
//           if (latestTypes[otherUserId] || latestTypes[`users_${otherUserId}`]) {
//             latestType =
//               latestTypes[otherUserId] || latestTypes[`users_${otherUserId}`];
//           }

//           const unreadBadge = item.querySelector(
//             '.cometchat-conversations__unread-count, .cometchat-badge, [class*="unread"], [class*="badge"]'
//           );
//           const unreadText = unreadBadge?.textContent?.trim() || "";
//           const unreadNum = parseInt(unreadText) || 0;
//           const hasUnread =
//             unreadNum > 0 ||
//             unreadText.toLowerCase() === "unread" ||
//             item.classList.toString().toLowerCase().includes("unread");
// console.log("hasUnread", hasUnread);
//           listItem.removeAttribute("data-latest-type");
//           listItem.removeAttribute("data-has-unread");

//           if (hasUnread) {
//             listItem.setAttribute("data-latest-type", "unread");
//             listItem.setAttribute("data-has-unread", "true");
//           } else if (latestType) {
//             const allowed = new Set(["chat", "content", "gift"]);
//             if (allowed.has(latestType)) {
//               listItem.setAttribute("data-latest-type", latestType);
//             }
//           }
//         }
//       });
//     } catch (error) {
//       console.error("Error applying border colors:", error);
//     }
//   };

  // Optimized React-friendly border color application with debouncing and batching
  const rafIdRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef(false);
  const allowedTypes = useRef<Record<string, boolean>>({ chat: true, content: true, gift: true });

  const applyBorderColorsOptimized = useCallback(async () => {
    // Cancel pending RAF if exists
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Batch updates using requestAnimationFrame for better performance
    rafIdRef.current = requestAnimationFrame(async () => {
      try {
        if (!loggedInUserIdRef.current) {
          const liu = await CometChat.getLoggedinUser();
          if (!liu) return;
          loggedInUserIdRef.current = liu.getUid()?.replace("users_", "") || liu.getUid() || "";
        }

        const itemsCollection = document.getElementsByClassName("cometchat-conversations__list-item");
        const len = itemsCollection.length;
        if (len === 0) return;

        // Batch DOM reads first, then writes (better performance)
        const updates: Array<{ element: HTMLElement; latestType?: string; hasUnread: boolean }> = [];

        for (let i = 0; i < len; i++) {
          const item = itemsCollection[i] as HTMLElement;
          const listItem = item.querySelector(".cometchat-list-item") as HTMLElement | null;
          if (!listItem) continue;

          const conversationId = listItem.id || listItem.getAttribute("data-id") || "";
          if (!conversationId) continue;

          // Fast user ID extraction (no regex)
          const userIds: string[] = [];
          let idx = conversationId.indexOf("users_");
          while (idx !== -1) {
            let j = idx + 6;
            let num = "";
            while (j < conversationId.length) {
              const ch = conversationId.charCodeAt(j);
              if (ch >= 48 && ch <= 57) {
                num += conversationId[j++];
              } else break;
            }
            if (num) userIds.push(num);
            idx = conversationId.indexOf("users_", j);
          }

          if (userIds.length === 0) continue;

          const otherUserId = userIds.find(u => u !== loggedInUserIdRef.current) || userIds[0];

          // Check unread status (optimized query)
          const unreadBadge = item.querySelector('.cometchat-conversations__unread-count, .cometchat-badge');
          const unreadText = unreadBadge?.textContent?.trim() || "";
          const unreadNum = parseInt(unreadText, 10) || 0;
          const hasUnread = unreadNum > 0 || 
                           (unreadText && unreadText.toLowerCase() === "unread") ||
                           item.classList.contains("unread");

          // Determine latest type
          let latestType: string | undefined;
          if (hasUnread) {
            latestType = "unread";
          } else {
            const lt = latestTypes[otherUserId] || latestTypes[`users_${otherUserId}`];
            if (lt && allowedTypes.current[lt]) {
              latestType = lt;
            }
          }

          updates.push({ element: listItem, latestType, hasUnread });
        }

        // Batch DOM writes (single reflow - much faster)
        for (const { element, latestType, hasUnread } of updates) {
          delete element.dataset.latestType;
          delete element.dataset.hasUnread;
          
          if (hasUnread) {
            element.dataset.latestType = "unread";
            element.dataset.hasUnread = "true";
          } else if (latestType) {
            element.dataset.latestType = latestType;
          }
        }

        pendingUpdateRef.current = false;
      } catch (err) {
        console.error("Error applying border colors:", err);
        pendingUpdateRef.current = false;
      }
    });
  }, [latestTypes]);

  // Apply data attributes to conversation list items for border colors
  useEffect(() => {
    applyBorderColorsOptimized();

    // Debounce MutationObserver calls to avoid excessive updates
    let mutationTimeoutId: NodeJS.Timeout;
    const observer = new MutationObserver(() => {
      if (pendingUpdateRef.current) return;
      pendingUpdateRef.current = true;
      clearTimeout(mutationTimeoutId);
      mutationTimeoutId = setTimeout(() => {
        applyBorderColorsOptimized();
      }, 100); // Debounce to 100ms
    });


    const conversationsList = document.querySelector(
      ".cometchat-conversations__list"
    );
    if (conversationsList) {
      observer.observe(conversationsList, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();
      clearTimeout(mutationTimeoutId);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [latestTypes, refreshConversations, applyBorderColorsOptimized]);

  // Message listener to update border colors on new messages (debounced)
  useEffect(() => {
   
    let messageTimeoutId: NodeJS.Timeout;
    const debouncedApply = () => {
      if (pendingUpdateRef.current) return;
      pendingUpdateRef.current = true;
      // clearTimeout(messageTimeoutId);
      // messageTimeoutId = setTimeout(() => {
        applyBorderColorsOptimized();
      // }, 150); // Debounce message updates
    };
    
    const messageListenerId = `waifu_listener_${Date.now()}`;
    const messageListener = new CometChat.MessageListener({
      onTextMessageReceived: async (message: any) => {
        const lastMessage = await getLastMessage(message.receiverId, message.receiverType);
        // Check if message text matches the AFK message
        const AFK_MESSAGE_TEXT = "Oh no, sweetie, I'm AFK rn! I've been on ~7-11 PM Eastern Time (ET) most days lately. Remember, I'm real, not a bot 🥰 Text me and I'll reply soon! PS: Bored? Check my pics, read my emails, or just swing by later! Urgent Qs? Hit up Zoe via email 💌";
    
        const lastMessageText = lastMessage?.getText?.() || "";
        if (lastMessageText === AFK_MESSAGE_TEXT) {
          setRefreshConversations((prev) => prev + 1);
        }
        debouncedApply();
      },
      onMediaMessageReceived: async(_message: any) => {
        const lastMessage = await getLastMessage(_message.receiverId, _message.receiverType);
        // Check if message text matches the AFK message
        const AFK_MESSAGE_TEXT = "Oh no, sweetie, I'm AFK rn! I've been on ~7-11 PM Eastern Time (ET) most days lately. Remember, I'm real, not a bot 🥰 Text me and I'll reply soon! PS: Bored? Check my pics, read my emails, or just swing by later! Urgent Qs? Hit up Zoe via email 💌";
    
        const lastMessageText = lastMessage?.getText?.() || "";
        if (lastMessageText === AFK_MESSAGE_TEXT) {
          setRefreshConversations((prev) => prev + 1);
        }
        debouncedApply();
      },
      onCustomMessageReceived: async (_message: any) => {
        const lastMessage = await getLastMessage(_message.receiverId, _message.receiverType);
        // Check if message text matches the AFK message
        const AFK_MESSAGE_TEXT = "Oh no, sweetie, I'm AFK rn! I've been on ~7-11 PM Eastern Time (ET) most days lately. Remember, I'm real, not a bot 🥰 Text me and I'll reply soon! PS: Bored? Check my pics, read my emails, or just swing by later! Urgent Qs? Hit up Zoe via email 💌";
    
        const lastMessageText = lastMessage?.getText?.() || "";
        if (lastMessageText === AFK_MESSAGE_TEXT) {
          setRefreshConversations((prev) => prev + 1);
        }
        debouncedApply();
      },
    });

    CometChat.addMessageListener(messageListenerId, messageListener);

    return () => {
      CometChat.removeMessageListener(messageListenerId);
    };
  }, [applyBorderColorsOptimized]);

  useEffect(() => {
    const handleBlockedStatusChanged = async () => {
      setRefreshConversations((prev) => prev + 1);
    };
    const handleMuteStatusChanged = async () => {
      try {
        const liu = await CometChat.getLoggedinUser();
        if (!liu) throw new Error("User not logged in");

        const uid = liu.getUid();

        const res = await fetch(
          `https://${COMETCHAT_CONSTANTS.APP_ID}.api-${COMETCHAT_CONSTANTS.REGION}.cometchat.io/${COMETCHAT_CONSTANTS.COMET_CHAT_API_VERSION}/notifications/v1/preferences/mute?uid=${uid}`,
          {
            headers: {
              accept: "application/json",
              apikey: COMETCHAT_CONSTANTS.REST_API_KEY,
              "content-type": "application/json",
            },
          }
        );

        const result = await res.json();
        const muted = result?.data?.mutedConversations || [];
        const ids = new Set<string>(muted.map((m: any) => m.id as string));
        setMutedUsers(ids);

        setRefreshConversations((prev) => prev + 1);
      } catch (err) {
        console.error("Error handling muteStatusChanged:", err);
      }
    };

    window.addEventListener("muteStatusChanged", handleMuteStatusChanged);
    window.addEventListener("blockingUserChanged", handleBlockedStatusChanged);

    return () => {
      window.removeEventListener("muteStatusChanged", handleMuteStatusChanged);
      window.removeEventListener(
        "blockingUserChanged",
        handleBlockedStatusChanged
      );
    };
  }, []);

  const buildRequest = () => {
    let builder = new CometChat.ConversationsRequestBuilder()
      .setLimit(30)
      .withTags(true);

    if (selectedTag && selectedTag !== "All") {
      builder = builder.setUserTags([selectedTag]);
    }

    return builder;
  };

  
  const fetchData = async () => {
    const mainid: any = localStorage.getItem("switching_user");

    try {
      const res = await axios.get(
        `https://${COMETCHAT_CONSTANTS.APP_ID}.api-us.cometchat.io/v3/messages?count=true&unread=true`,
        {
          headers: {
            accept: "application/json",
            apikey: COMETCHAT_CONSTANTS.REST_API_KEY,
            onBehalfOf: `users_${mainid.slice(6)}`,
          },
        }
      );

      let unreadCount = 0;
      res.data?.data?.forEach((item: any) => {
        unreadCount += item.count || 0;
      });

      setUsers((prev: any) =>
        prev.map((u: any) =>
          u.id === mainid.slice(6) ? { ...u, unread: unreadCount } : u
        )
      );

      const CACHE_KEY = "waifu_unread_counts";
      const cached = localStorage.getItem(CACHE_KEY);
      const cacheData = cached ? JSON.parse(cached).data : {};
      cacheData[mainid.slice(6)] = unreadCount;
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: cacheData, timestamp: Date.now() })
      );
    } catch (err) {
      console.error(
        "Failed to fetch unread count for user",
        (mainid || "").slice(6),
        err
      );
    }
  };

  const getOptions = (conversation: Conversation) => {
    const unreadCount = conversation.getUnreadMessageCount?.() || 0;
    const isUnread = unreadCount > 0;
    const options: CometChatOption[] = [
      new CometChatOption({
        id: isUnread ? "markAsRead" : "markAsUnread",
        title: isUnread ? "Mark as Read" : "Mark as Unread",
        onClick: async () => {
          try {
            const lastMessage = conversation.getLastMessage();
            if (!lastMessage) {
              console.log("No messages in this conversation");
              return;
            }

            const convWith = conversation.getConversationWith();
            let baseEndpoint = "";

            if (convWith instanceof CometChat.User) {
              baseEndpoint = `/users/${convWith.getUid()}/conversation/read`;
            } else if (convWith instanceof CometChat.Group) {
              baseEndpoint = `/groups/${convWith.getGuid()}/conversation/read`;
            } else {
              console.log("Unsupported conversation type");
              return;
            }

            const url = `https://${COMETCHAT_CONSTANTS.APP_ID}.api-${COMETCHAT_CONSTANTS.REGION}.cometchat.io/v3${baseEndpoint}`;

            if (isUnread) {
              const response = await fetch(url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: COMETCHAT_CONSTANTS.REST_API_KEY,
                  onBehalfOf: loggedInUser?.getUid() || "",
                },
              });

              if (response.ok) {
                fetchData();
                setRefreshConversations((prev) => prev + 1);
                computeTagUnreadCounts();
                // Also call WP to restore latest purchases state for this user
               
              } else {
                const errorData = await response.json();
                console.error("Error marking as read:", errorData);
              }
            } else {
              const response = await fetch(url, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  apikey: COMETCHAT_CONSTANTS.REST_API_KEY,
                  onBehalfOf: loggedInUser?.getUid() || "",
                },
                body: JSON.stringify({
                  messageId: lastMessage.getId(),
                }),
              });

              if (response.ok) {
                fetchData();
                setRefreshConversations((prev) => prev + 1);
                try {
                  const uid = convWith instanceof CometChat.User ? convWith.getUid() : ""; // e.g., users_123
                  const numericId = uid.startsWith("users_") ? uid.replace("users_", "") : uid;
                  if (numericId) {
                    fetchLatestTypeData();
                    restoreLatestPurchasesAPI(numericId);
                    
                  }
                } catch (e) {
                  console.error("Failed to trigger restore-latest-purchases", e);
                }
              } else {
                const errorData = await response.json();
                console.error("Error marking as unread:", errorData);
              }
            }
          } catch (error) {
            console.error("Error toggling read/unread:", error);
          }
        },
      }),
    ];
    return options;
  };

  return (
    <div className="oppai-dragon-comet-chat chat-list">
      {loggedInUser?.getRole() !== "subscriber" && (
        <div style={{ width: "100%" }}>
          {activeTab === "chats" ? (
            <CometChatConversations
              conversationsRequestBuilder={buildRequest()}
              hideDeleteConversation={true}
              key={refreshConversations + selectedTag}
              onSelect={(e) => {
                onSelectorItemClicked(e, "updateSelectedItem");
              }}
              headerView={conversationsHeaderView()}
              onItemClick={(e) => {
                onSelectorItemClicked(e, "updateSelectedItem");
                if (e.getUnreadMessageCount() > 0) {
                  e.setUnreadMessageCount(0);
                  // setRefreshConversations((prev) => prev + 1); // 🔁 recompute tag badges immediately
                  setTimeout(() => {
                    fetchData();
                    computeTagUnreadCounts();
                  }, 400);
                }

                // Remove unread border instantly for the clicked item
                let domId = "";
                try {
                  const convWith = e.getConversationWith();
                  if (convWith instanceof CometChat.User) {
                    domId = convWith.getUid();
                  } else if (convWith instanceof CometChat.Group) {
                    domId = convWith.getGuid();
                  }
                  if (domId) {
                    const listItem = document.querySelector(
                      `.cometchat-list-item[id*="${domId}"]`
                    ) as HTMLElement | null;
                    listItem?.removeAttribute("data-latest-type");
                    listItem?.removeAttribute("data-has-unread");
                  }
                } catch {}
                // Fire-and-forget external update for latest purchases
                // Get current user's ID from localStorage for domId
                const switchingUser = localStorage.getItem("switching_user") || "";
                const activeWaifuId = switchingUser || "";
                if( latestTypes[domId] ) {
                  // setTimeout(() => {
                    updateLatestPurchases(domId, activeWaifuId || undefined);
                  // }, 3000);
                }
              }}
              options={getOptions}
              leadingView={CustomLeadingView}
              activeConversation={activeItem as Conversation}
            />
          ) : activeTab === "users" ? (
            <CometChatUsers
              activeUser={activeItem as CometChat.User}
              onItemClick={(e) => {
                onSelectorItemClicked(e, "updateSelectedItem");
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};
