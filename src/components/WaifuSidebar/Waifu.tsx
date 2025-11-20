import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useContext,
} from "react";
import "./waiffu.css";
import { COMETCHAT_CONSTANTS } from "../../AppConstants";
import Loader from "../Loader";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { AppContext } from "../../context/AppContext";
import { CometChatMessageEvents } from "@cometchat/chat-uikit-react";
import NewUserBubble from "./NewUserBubble";
import { allWaifuCounts, fetchNewContentCounts, fetchNewUserCounts, updateNewUserCounts, updateNewUserContent, waifusUnreadCount } from "../../axios/waifu";
import NewUserContentBubble from "./NewUserContentBubble";

interface User {
  id: string;
  name: string;
  avatar: string;
  unread?: number;
}

interface Props {
  userUuid: string;
}
export const Waifu = ({ userUuid }: Props) => {
  const { users, setUsers } = useContext(AppContext) as any;
  const [loading, setLoading] = useState(false);
  const [activeUser, setActiveUser] = useState<string>("");
  const [newUserCounts, setNewUserCounts] = useState<any>({});
  const [newContentCounts, setNewContentCounts] = useState<any>({});
  const messageListenerId = useRef(`waifu_listener_${Date.now()}`);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unreadCountIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef<boolean>(true);
  const usersRef = useRef<User[]>([]);

  // Fetch waifu users from CometChat
  const fetchWaifuUsers = async () => {
    setLoading(true);
    try {
      const userRes = await allWaifuCounts();

      const waifuUsers: User[] = userRes.data.map((u: any) => ({
        id: u?.uid?.replace("users_", "") || "", // remove prefix
        name: u.name,
        avatar: u.avatar,
        unread: 0,
      }));

      // Custom order list
      const customOrder = [
        "Subject: 002",
        "Crimson Heiress",
        "Overseer of Guardians",
        "Thunder Priestess",
        "Zoe Grey",
        "Demon Princess",
        "Oni Maid",
        "Series 2: B-Class",
        "General of the North",
        "Titan Slayer",
      ];

      // Sort waifuUsers according to customOrder
      waifuUsers.sort((a, b) => {
        const indexA = customOrder.indexOf(a.name);
        const indexB = customOrder.indexOf(b.name);
        // If name not found, push it to the end
        return (
          (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
        );
      });

      // Show users immediately without unread counts
      setUsers(waifuUsers);
      usersRef.current = waifuUsers;
      setLoading(false);

      // Fetch unread counts for all waifu users
      fetchAllUserUnreadCounts();
    } catch (err) {
      console.error("Error fetching waifu users:", err);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchWaifuUsers();
  }, []);

  // Optimized function to fetch unread counts with batching and caching
  const fetchUnreadCountsOptimized = async (
    waifuUsers: User[],
    forceRefresh = false,
    showLoading = false
  ) => {
    // const BATCH_SIZE = 5; // Process 5 users at a time to avoid overwhelming the API
    // const CACHE_KEY = "waifu_unread_counts";
    // const CACHE_DURATION = 30000; // 30 seconds cache

    // // Check cache first (unless force refresh)
    // if (!forceRefresh) {
    //   const cached = localStorage.getItem(CACHE_KEY);
    //   if (cached) {
    //     try {
    //       const { data, timestamp } = JSON.parse(cached);
    //       if (Date.now() - timestamp < CACHE_DURATION) {
    //         // Use cached data
    //         setUsers((prevUsers: any) =>
    //           prevUsers.map((user: any) => ({
    //             ...user,
    //             unread: data[user.id] || 0,
    //           }))
    //         );
    //         return;
    //       }
    //     } catch (e) {
    //       console.log("Failed to parse cached unread counts", e);
    //     }
    //   }
    // }

    // const unreadCounts: Record<string, number> = {};

    // for (let i = 0; i < waifuUsers.length; i += BATCH_SIZE) {
    //   const batch = waifuUsers.slice(i, i + BATCH_SIZE);

    //   try {
    //     // Process batch with Promise.allSettled to handle individual failures
    //     const batchResults = await Promise.allSettled(
    //       batch.map(async (user) => {
    //         const response = await waifusUnreadCount(user.id);
    //         let total = 0;
    //         if (Array.isArray(response.data)) {
    //           response.data.forEach((item: any) => {
    //             if (
    //               item.count &&
    //               !item.conversationId?.startsWith(
    //                 `users_${user.id}_user_users_${user.id}`
    //               )
    //             ) {
    //               total += Number(item.count);
    //             }
    //           });
    //         }

    //         return { userId: user.id, count: total };
    //       })
    //     );

    //     // Process results and update counts
    //     batchResults.forEach((result, index) => {
    //       const user = batch[index];
    //       if (result.status === "fulfilled") {
    //         unreadCounts[result.value.userId] = result.value.count;
    //       } else {
    //         console.warn(
    //           `Failed to fetch unread count for user ${user.id}:`,
    //           result.reason
    //         );
    //         unreadCounts[user.id] = 0; // Default to 0 on failure
    //       }
    //     });

    //     // Update UI incrementally for better UX
    //     setUsers((prevUsers: any) =>
    //       prevUsers.map((user: any) => ({
    //         ...user,
    //         unread:
    //           unreadCounts[user.id] !== undefined
    //             ? unreadCounts[user.id]
    //             : user.unread,
    //       }))
    //     );

    //     // Small delay between batches to be respectful to the API
    //     if (i + BATCH_SIZE < waifuUsers.length) {
    //       await new Promise((resolve) => setTimeout(resolve, 100));
    //     }
    //   } catch (error) {
    //     console.error(`Error processing batch ${i}-${i + BATCH_SIZE}:`, error);
    //   }
    // }

    // // Cache the results
    // try {
    //   localStorage.setItem(
    //     CACHE_KEY,
    //     JSON.stringify({
    //       data: unreadCounts,
    //       timestamp: Date.now(),
    //     })
    //   );
    // } catch (e) {
    //   console.warn("Failed to cache unread counts");
    // }
  };

  // Function to fetch and update unread counts for all users
  const fetchAllUserUnreadCounts = async () => {
    const currentUsers = usersRef.current;
    if (currentUsers.length === 0) return;

    try {
      const unreadCounts: Record<string, number> = {};
      
      // Fetch unread counts for all users in parallel
      const results = await Promise.allSettled(
        currentUsers.map(async (user: User) => {
          try {
            const response = await waifusUnreadCount(user.id);
            let total = 0;
            if (Array.isArray(response.data)) {
              response.data.forEach((item: any) => {
                if (
                  item.count &&
                  !item.conversationId?.startsWith(
                    `users_${user.id}_user_users_${user.id}`
                  )
                ) {
                  total += Number(item.count);
                }
              });
            }
            return { userId: user.id, count: total };
          } catch (error) {
            console.warn(`Failed to fetch unread count for user ${user.id}:`, error);
            return { userId: user.id, count: user.unread || 0 };
          }
        })
      );

      // Process results
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          unreadCounts[result.value.userId] = result.value.count;
        }
      });

      // Update state with new unread counts
      setUsers((prevUsers: any) =>
        prevUsers.map((user: any) => ({
          ...user,
          unread: unreadCounts[user.id] !== undefined ? unreadCounts[user.id] : user.unread || 0,
        }))
      );

      // Update cache
      try {
        const CACHE_KEY = "waifu_unread_counts";
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: unreadCounts,
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        console.warn("Failed to cache unread counts");
      }
    } catch (error) {
      console.error("Error fetching all user unread counts:", error);
    }
  };

  // Function to update unread count for a specific user (optimistic update)
  const updateUnreadCountForUser = (
    userId: string,
    increment: boolean = true
  ) => {
    setUsers((prevUsers: any) =>
      prevUsers.map((user: any) => {
        if (user.id === userId) {
          const currentCount = user.unread || 0;
          const newCount = increment
            ? currentCount + 1
            : Math.max(0, currentCount - 1);
          return { ...user, unread: newCount };
        }
        return user;
      })
    );
  };

  useEffect(() => {
    const messageReadSub = CometChatMessageEvents.ccMessageRead.subscribe(
      (_messageReceipt: any) => {
        fetchAllUserUnreadCounts();
      }
    );

    return () => messageReadSub.unsubscribe();
  }, [fetchAllUserUnreadCounts]);

  // Setup real-time monitoring for logged-in user only
  const setupRealTimeMonitoring = useCallback(async () => {
    // Get the currently logged-in user
    let currentLoggedInUser = "";
    try {
      const loggedInUser = await CometChat.getLoggedInUser();
      if (loggedInUser) {
        currentLoggedInUser = loggedInUser.getUid();
      }
    } catch (error) {
      console.error("Error getting logged-in user:", error);
    }

    // Only setup listener for the currently logged-in user
    const messageListener = new CometChat.MessageListener({
      onTextMessageReceived: (textMessage: CometChat.TextMessage) => {
        handleLoggedInUserMessage(textMessage, currentLoggedInUser);
      },
      onMediaMessageReceived: (mediaMessage: CometChat.MediaMessage) => {
        handleLoggedInUserMessage(mediaMessage, currentLoggedInUser);
      },
      onCustomMessageReceived: (customMessage: CometChat.CustomMessage) => {
        handleLoggedInUserMessage(customMessage, currentLoggedInUser);
      },
      // onMessageDelivered: (messageReceipt: CometChat.MessageReceipt) => {
      //   console.log("✅ Message delivered for logged-in user");
      //   handleLoggedInUserMessageReceipt(messageReceipt, currentLoggedInUser);
      // },
      // onMessageRead: (messageReceipt: CometChat.MessageReceipt) => {
      //   console.log("👁️ Message read for logged-in user");
      //   handleLoggedInUserMessageReceipt(messageReceipt, currentLoggedInUser);
      // },
    });

    CometChat.addMessageListener(messageListenerId.current, messageListener);
    const onCustomMessageRead = CometChatMessageEvents.ccMessageRead.subscribe(
      (messageReceipt: any) => {
        handleLoggedInUserMessageReceipt(messageReceipt, currentLoggedInUser);
      }
    );

    // Helper function to handle messages for logged-in user
    const handleLoggedInUserMessage = (
      message: any,
      loggedInUserId: string
    ) => {
      try {
        const senderId = message.getSender()?.getUid();
        const receiverId = message.getReceiver()?.getUid();
        const receiverType = message.getReceiverType();

        // Only process user-to-user messages
        if (receiverType === CometChat.RECEIVER_TYPE.USER && loggedInUserId) {
          // If message is sent TO the logged-in user, increment unread count for sender
          if (receiverId === loggedInUserId && senderId) {
            const senderUserId: any = receiverId?.replace("users_", "")
              ? receiverId?.replace("users_", "")
              : receiverId;
            updateUnreadCountForUser(senderUserId, true);
          }
        }
        return () => {
          onCustomMessageRead?.unsubscribe();
        };
      } catch (error) {
        console.error(error);
      }
    };

    // Helper function to handle message receipts for logged-in user
    const handleLoggedInUserMessageReceipt = (
      messageReceipt: CometChat.MessageReceipt,
      loggedInUserId: string
    ) => {
      try {
        const senderId = messageReceipt.getSender()?.getUid();
        const receiverId = messageReceipt.getReceiver();
        const receiverType = messageReceipt.getReceiverType();

        // Handle receiverId - it might be a string or User object
        let receiverUserId = "";
        if (typeof receiverId === "string") {
          receiverUserId = receiverId;
        } else if (receiverId && "getUid" in receiverId) {
          receiverUserId = (receiverId as any).getUid();
        }

        // Only process user-to-user messages
        if (receiverType === CometChat.RECEIVER_TYPE.USER && loggedInUserId) {
          // If message is read BY the logged-in user, decrement unread count for sender
          if (receiverUserId === loggedInUserId && senderId) {
            const senderUserId: any =
              typeof receiverUserId === "string"
                ? receiverUserId?.replace("users_", "")
                : receiverUserId;
            updateUnreadCountForUser(senderUserId, false);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    // 3. Simple 30-second polling for all other users
    const startPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      pollingIntervalRef.current = setInterval(() => {
        if (usersRef.current.length > 0) {
          fetchAllUserUnreadCounts(); // Background polling, no loading
        }
      }, 8000); // Poll every 30 seconds
    };

    startPolling();

    // 4. Visibility change handler to pause/resume polling
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isActiveRef.current = false;
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        if (unreadCountIntervalRef.current) {
          clearInterval(unreadCountIntervalRef.current);
        }
      } else {
        isActiveRef.current = true;
        startPolling();
        // Immediate update when page becomes visible
        if (usersRef.current.length > 0) {
          fetchAllUserUnreadCounts();
        }
        // Resume 3-second interval
        if (usersRef.current.length > 0) {
          unreadCountIntervalRef.current = setInterval(() => {
            if (isActiveRef.current && usersRef.current.length > 0) {
              fetchAllUserUnreadCounts();
            }
          }, 3000);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup function
    return () => {
      // Remove main CometChat listener
      CometChat.removeMessageListener(messageListenerId.current);

      // Remove window event listeners

      // Remove visibility change listener
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      // Clear polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Clear unread count interval
      if (unreadCountIntervalRef.current) {
        clearInterval(unreadCountIntervalRef.current);
      }
    };
  }, [users]);

  const handleClick = async (userId: string, title: string) => {
    setActiveUser(userId); // ✅ mark as active

    // Immediately update the unread count for this user to 0 (optimistic update)
    // This simulates the user reading the messages
    // updateUnreadCountForUser(userId, false); // Decrement to 0
    // Update new user count on server (after 2 seconds delay)
    // if(newUserCounts?.[`users_${userId}`] > 0 || newContentCounts?.[`users_${userId}`] > 0){
    //   setTimeout(() => {
    //     updateNewUser(userId);
    //     updateNewContent(userId);
    //   }, 3000);
    // }
    // setUsers((prevUsers: any) =>
    //   prevUsers.map((user: any) =>
    //     user.id === userId ? { ...user, unread: 0 } : user
    //   )
    // );

    // Update cache to reflect the optimistic update
    try {
      const CACHE_KEY = "waifu_unread_counts";
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data } = JSON.parse(cached);
        data[userId] = 0;
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          })
        );
      }
    } catch (e) {
      console.warn("Failed to update cache after user click");
    }

    const event = new CustomEvent("cometchatUserevent", {
      detail: {
        userUID: `users_${userId}`,
        api_key: COMETCHAT_CONSTANTS.REST_API_KEY,
        event_name: "cometchatUserevent",
        selected_user: `users_${userId}`,
        user_bio: title,
        metadata: { clickedFrom: "waifu" },
      },
    });
    window.dispatchEvent(event);
  };

  useEffect(() => {
    if (userUuid) {
      const userID = userUuid.split("_")[1];
      setActiveUser(userID);
    }
  }, [userUuid]);

  // Setup comprehensive real-time monitoring when users are loaded
  useEffect(() => {
    if (users.length > 0) {
      let cleanup: (() => void) | undefined;

      const setupMonitoring = async () => {
        cleanup = await setupRealTimeMonitoring();
      };

      setupMonitoring();

      return () => {
        if (cleanup) {
          cleanup();
        }
      };
    }
  }, [users, setupRealTimeMonitoring]);

  // Update usersRef when users change
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  // Setup interval to fetch unread counts every 3 seconds
  useEffect(() => {
    if (users.length === 0) return;

    // Clear any existing interval
    if (unreadCountIntervalRef.current) {
      clearInterval(unreadCountIntervalRef.current);
    }

    // Fetch immediately on mount
    fetchAllUserUnreadCounts();

    // Set up interval to fetch every 3 seconds
    unreadCountIntervalRef.current = setInterval(() => {
      if (isActiveRef.current && usersRef.current.length > 0) {
        fetchAllUserUnreadCounts();
      }
    }, 3000);

    // Cleanup on unmount or when users change
    return () => {
      if (unreadCountIntervalRef.current) {
        clearInterval(unreadCountIntervalRef.current);
        unreadCountIntervalRef.current = null;
      }
    };
  }, [users.length]);

  // // Cleanup on component unmount
  // useEffect(() => {
  //   return () => {
  //     if (pollingIntervalRef.current) {
  //       clearInterval(pollingIntervalRef.current);
  //     }
  //     isActiveRef.current = false;
  //   };
  // }, []);

  const fetchNewUser = async () => {
    // Logic to fetch the count of new users
    try {
      const response = await fetchNewUserCounts();
      setNewUserCounts(response);
    } catch (error) {
      console.log('error: ', error);
    }
  }

  const updateNewUser = async(userId: string) => {
    try {
      await updateNewUserCounts(userId);
    } catch (error) {
      console.log('error: ', error);
    } finally {
      fetchNewUser();
    }
  }
  const fetchNewContent = async () => {
    // Logic to fetch the count of new users
    try {
      const response = await fetchNewContentCounts();
      setNewContentCounts(response);
    } catch (error) {
      console.log('error: ', error);
    }
  }
  const updateNewContent = async(userId: string) => {
    try {
      await updateNewUserContent(userId);
    } catch (error) {
      console.log('error: ', error);
    } finally {
      fetchNewContent();
    }
  }

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
    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <Loader />;
  }

  const AVATAR_SIZE = 60; // px
  const BADGE_MIN = 20; // px (badge min diameter)
  const formatCount = (n?: number) => (n && n > 99 ? "99+" : n ?? 0);

  return (
    <div className="commet-chat-section-users">
      {users.map((user: any) => (
        <div
          key={user.id}
          className="comet-chat-per-users"
          data-user-id={user.id}
          title={user.name}
          onClick={() => handleClick(user.id, user.name)}
          style={{
            cursor: "pointer",
            backgroundColor: activeUser === user.id ? "#60f" : "transparent",
            transition: "background-color 0.2s ease",
            overflow: "visible",
          }}
          aria-hidden={true}
        >
          <div
            className="comet-chat-avatar"
            style={{ position: "relative", overflow: "visible" }}
          >
            <img
              className="comet-chat-avatar-img"
              src={user.avatar}
              alt={user.name}
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
            />
            {(() => {
              const unread = Number(user.unread ?? 0);
              const newUsers = Number(
                newUserCounts?.[`users_${user?.id}`] ??
                newUserCounts?.[user?.id] ??
                newUserCounts?.users?.[`users_${user?.id}`] ??
                0
              );
              const newContent = Number(
                newContentCounts?.[`users_${user?.id}`] ??
                newContentCounts?.[user?.id] ??
                newContentCounts?.users?.[`users_${user?.id}`] ??
                0
              );
              const badges: Array<{ color: string; value: number; aria: string }> = [
                { color: "red", value: unread, aria: `${unread} unread` },
                { color: "green", value: newUsers, aria: `${newUsers} new users` },
                { color: "blue", value: newContent, aria: `${newContent} new content` },
              ].filter(badge => badge.value > 0);

              if (badges.length === 0) return null;

              return (
                <div
                  style={{
                    position: "absolute",
                    top: '22px',
                    right: -10,
                    transform: "translateY(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    zIndex: 2,
                  }}
                >
                  {badges.map((b, idx) => (
                    <span
                      key={`${b.color}-${idx}`}
                      aria-label={b.aria}
                      style={{
                        backgroundColor: b.color,
                        color: "#fff",
                        minWidth: BADGE_MIN,
                        height: BADGE_MIN,
                        padding: "0 6px",
                        borderRadius: 9999,
                        border: "2px solid #fff",
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: "center",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                      }}
                    >
                      {formatCount(b.value)}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      ))}
    </div>
  );
};
