import { CometChat } from "@cometchat/chat-sdk-javascript";
import {
  CalendarObject,
  CometChatMessageComposer,
  CometChatMessageEvents,
  CometChatMessageHeader,
  CometChatMessageList,
  CometChatMessageTemplate,
  CometChatUIKit,
  CometChatUIKitConstants,
  CometChatUIKitLoginListener,
  CometChatUserEvents,
  getLocalizedString,
  isMessageSentByMe,
  MessageBubbleAlignment,
} from "@cometchat/chat-uikit-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useContext, useEffect, useRef, useState } from "react";
import blockIcon from "../../assets/block.svg";
import deliveredIcon from "../../assets/message-delivered.svg";
import readIcon from "../../assets/message-read.svg";
import sentIcon from "../../assets/message-sent.svg";
import {
  BACKEND_API_URL,
  OppaiDragonUserRole,
  X_Auth_Token,
} from "../../constant/AppUserRole";
import "../../styles/CometChatMessages/CometChatMessages.css";
import "../../styles/CometChatMessages/MessageComposer.css";
import { CometChatSoundManager } from "../../utils/soundManager";
import { CustomMessageHeader } from "../CustomMessageHeader/CustomMessageHeader";
import { GifPicker } from "../GifPicker";
import axios from "axios";
import { AppContext } from "../../context/AppContext";
dayjs.extend(utc);
dayjs.extend(timezone);

interface MessagesViewProps {
  user?: CometChat.User;
  group?: CometChat.Group;
  headerMenu: () => JSX.Element;
  onThreadRepliesClick: (message: CometChat.BaseMessage) => void;
  showComposer?: boolean;
  isShowBackButton?: boolean;
  onBack?: () => void;
  showSideComponent?: any;
  userRole?: string | null;
  setUserAnalytics?: (value: {}) => void;
}

const BLOCKED_WORDS_KEY = "blocked_words";

export const CometChatMessages = (props: MessagesViewProps) => {
  const {
    user,
    group,
    headerMenu,
    onThreadRepliesClick,
    showComposer,
    isShowBackButton,
    userRole,
    showSideComponent,
    onBack = () => {},
    setUserAnalytics,
  } = props;

  const [showComposerState, setShowComposerState] = useState<
    boolean | undefined
  >(showComposer);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [templates, setTemplates] = useState<CometChatMessageTemplate[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  // const [topDateLabel, setTopDateLabel] = useState<string | null>(null);
  const listWrapperRef = useRef<HTMLDivElement | null>(null);
  const { setPurchases } = useContext(AppContext) as any;
  const sendGif = async (gifUrl: string) => {
    const response = await fetch(gifUrl);
    const blob = await response.blob();
    const file = new File([blob], "gif.gif", { type: "image/gif" });

    const receiverID: any = group?.getGuid() || user?.getUid();
    const receiverType = group
      ? CometChat.RECEIVER_TYPE.GROUP
      : CometChat.RECEIVER_TYPE.USER;

    const gifMessage = new CometChat.MediaMessage(
      receiverID,
      file, // File object
      CometChat.MESSAGE_TYPE.IMAGE,
      receiverType
    );

    try {
      const sentMessage: any = await CometChat.sendMessage(gifMessage);
      CometChatMessageEvents.onMediaMessageReceived.next(sentMessage);
    } catch (error) {
      console.error("GIF send failed:", error);
    }
  };

  const [blockedWords, setBlockedWords] = useState<string[]>(() => {
    // First check sessionStorage
    const storedWords = sessionStorage.getItem(BLOCKED_WORDS_KEY);

    if (storedWords) {
      const parsedWords = JSON.parse(storedWords);
      return parsedWords;
    }
    return [];
  });

  function handleError(error: CometChat.CometChatException) {
    if (
      error?.code === "ERR_BLOCKED_BY_EXTENSION" &&
      (error as any)?.source === "chat-api"
    ) {
      alert("Your message contains words that are not allowed.");
      return;
    }
    throw new Error("error from message composer");
  }

  // const onNewMessage = (message: any) => {
  //   window.dispatchEvent(
  //     new CustomEvent("new-message-from-messages", { detail: message })
  //   );
  //   if (message?.getSentAt) {
  //     setTopDateLabel(getDayLabel(message.getSentAt()));
  //   }
  // };

  // useEffect(() => {
  //   const messageSentSub = CometChatMessageEvents.ccMessageSent.subscribe(
  //     (message) => {
  //       onNewMessage(message);
  //     }
  //   );

  //   return () => messageSentSub.unsubscribe();
  // }, []);

  // Initialize sound manager to disable all sounds
  useEffect(() => {
    CometChatSoundManager.initializeSoundSettings().catch((err) =>
      console.warn("Sound settings initialization failed:", err)
    );
    CometChatSoundManager.startAudioMonitoring();
    CometChatSoundManager.forceDisableAllAudio();
  }, []);

  useEffect(() => {
    setShowComposerState(showComposer);
    if (user?.getBlockedByMe?.()) {
      setShowComposerState(false);
    }
  }, [user, showComposer]);

  // useEffect(() => {
  //   async function loadLatestMessageDate() {
  //     try {
  //       if (!user && !group) return;
  //       let builder = new CometChat.MessagesRequestBuilder().setLimit(1);
  //       if (user) builder = (builder as any).setUID(user.getUid());
  //       if (group) builder = (builder as any).setGUID(group.getGuid());
  //       const request = builder.build();
  //       const messages = await request.fetchPrevious();
  //       if (Array.isArray(messages) && messages.length > 0) {
  //         const ts = (messages[0] as any).getSentAt?.() ?? null;
  //         if (ts) setTopDateLabel(getDayLabel(ts));
  //       }
  //     } catch (_) {
  //       // ignore
  //     }
  //   }
  //   loadLatestMessageDate();
  // }, [user, group]);

  // Mirror SDK's sticky date header / separators into our top pill on scroll/DOM updates
  // useEffect(() => {
  //   const wrapper = listWrapperRef.current;
  //   if (!wrapper) return;

  //   const findStickyDateEl = (): HTMLElement | null => {
  //     // Try a set of likely selectors from the UI kit
  //     const selectors = [
  //       ".cometchat-sticky-date",
  //       '[class*="sticky-date"]',
  //       '.cometchat-message-list__sticky-date',
  //     ];
  //     for (const sel of selectors) {
  //       const el = wrapper.querySelector(sel) as HTMLElement | null;
  //       if (el && el.textContent && el.textContent.trim().length > 0) return el;
  //     }
  //     return null;
  //   };

  //   const syncFromSticky = () => {
  //     const el = findStickyDateEl();
  //     const text = el?.textContent?.trim();
  //     if (text && text !== topDateLabel) setTopDateLabel(text);
  //   };

  //   const syncFromSeparators = () => {
  //     const listBody = wrapper.querySelector('.cometchat-list__body') as HTMLElement | null;
  //     if (!listBody) return;
  //     const viewportTop = listBody.scrollTop + 8; // small padding
  //     // Collect potential date separators
  //     const separators = Array.from(
  //       listBody.querySelectorAll<HTMLElement>(
  //         '.cometchat-date-separator, [class*="date-separator"], .cometchat-message-list__date-separator'
  //       )
  //     );
  //     if (separators.length === 0) return;
  //     // Find the last separator above viewport top
  //     let current: HTMLElement | null = null;
  //     for (const sep of separators) {
  //       const offset = sep.offsetTop;
  //       if (offset <= viewportTop) current = sep;
  //       else break;
  //     }
  //     const label = (current?.textContent || '').trim();
  //     if (label && label !== topDateLabel) setTopDateLabel(label);
  //   };

  //   // Observe changes to update label
  //   const observer = new MutationObserver(() => {
  //     syncFromSticky();
  //     syncFromSeparators();
  //   });
  //   observer.observe(wrapper, {
  //     childList: true,
  //     subtree: true,
  //     characterData: true,
  //   });

  //   // Also listen to scroll on the list body
  //   const listBody = wrapper.querySelector('.cometchat-list__body') as HTMLElement | null;
  //   const onScroll = () => {
  //     // Prefer separators for accuracy; fallback to sticky
  //     syncFromSeparators();
  //     syncFromSticky();
  //   };
  //   listBody?.addEventListener('scroll', onScroll, { passive: true });

  //   // Initial sync
  //   syncFromSeparators();
  //   syncFromSticky();

  //   return () => {
  //     observer.disconnect();
  //     listBody?.removeEventListener('scroll', onScroll);
  //   };
  // }, [topDateLabel]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Then fetch fresh data
    fetch(`${BACKEND_API_URL}/custom/v1/keywords`)
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data.keywords)) {
          const words = data.keywords.map((word: string) => String(word));
          setBlockedWords(words);
          sessionStorage.setItem(BLOCKED_WORDS_KEY, JSON.stringify(words));
        }
      })
      .catch((error) => {
        // console.error("Failed to fetch blocked words:", error);
        // If fetch fails and no stored words, set empty array
        if (!sessionStorage.getItem(BLOCKED_WORDS_KEY)) {
          setBlockedWords([]);
        }
      });
    let definedTemplates =
      CometChatUIKit.getDataSource().getAllMessageTemplates();
    const template = definedTemplates.map((t) => {
      // Text message template
      if (
        t.type === CometChatUIKitConstants.MessageTypes.text &&
        t.category === CometChatUIKitConstants.MessageCategory.message
      ) {
        t.bubbleView = (message: any, alignment: MessageBubbleAlignment) => {
          const isSentByMe = isMessageSentByMe(
            message,
            CometChatUIKitLoginListener.getLoggedInUser()!
          );
          let textMessage = "";
          if (message.getText) {
            textMessage = message.getText();
          }
          // Moderation logic
          const moderationStatus = message.data.moderation?.status;
          const isBlocked = containsBlockedWord(textMessage);
          let statusIcon = sentIcon;
          let statusAlt = "sent";
          if (isSentByMe) {
            if (message.getReadAt && message.getReadAt() > 0) {
              statusIcon = readIcon;
              statusAlt = "read";
            } else if (message.getDeliveredAt && message.getDeliveredAt() > 0) {
              statusIcon = deliveredIcon;
              statusAlt = "delivered";
            }
          }
          if (moderationStatus === "disapproved" || isBlocked) {
            statusIcon = blockIcon;
            statusAlt = "blocked";
          }
          return (
            <div
              className={`bubble-view ${
                isSentByMe ? "bubble-view__outgoing" : "bubble-view__incoming"
              } ${message.sender?.role?.toLowerCase()}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isSentByMe ? "flex-end" : "flex-start",
                margin: "6px 0",
              }}
            >
              <div
                className="bubble-view__content"
                style={{
                  background: isSentByMe ? "#7B5AED" : "#fff",
                  color: isSentByMe ? "#fff" : "#222",
                  borderRadius: "12px",
                  padding: "10px 16px",
                  maxWidth: "340px",
                  minWidth: "60px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                  wordBreak: "break-word",
                }}
              >
                <div
                  className="bubble-view__content__text"
                  style={{ fontSize: "15px", lineHeight: "1.5" }}
                >
                  {textMessage}
                </div>
              </div>
              <div
                className="bubble-view__content__time"
                style={{
                  fontSize: "12px",
                  color: isSentByMe ? "#e0e0e0" : "#888",
                  marginTop: "2px",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "4px",
                  justifyContent: isSentByMe ? "flex-end" : "flex-start",
                  width: "100%",
                }}
              >
                {formatTime(message.getSentAt())}
                {isSentByMe && (
                  <img
                    src={statusIcon}
                    alt={statusAlt}
                    width="16px"
                    height="16px"
                    style={{ marginLeft: "2px" }}
                  />
                )}
              </div>
            </div>
          );
        };
        return t;
      }
      // Image message template
      if (
        t.type === CometChatUIKitConstants.MessageTypes.image &&
        t.category === CometChatUIKitConstants.MessageCategory.message
      ) {
        t.bubbleView = (message: any, alignment: MessageBubbleAlignment) => {
          const isSentByMe = isMessageSentByMe(
            message,
            CometChatUIKitLoginListener.getLoggedInUser()!
          );
          const moderationStatus = message.data.moderation?.status;
          let statusIcon = sentIcon;
          let statusAlt = "sent";
          if (isSentByMe) {
            if (message.getReadAt && message.getReadAt() > 0) {
              statusIcon = readIcon;
              statusAlt = "read";
            } else if (message.getDeliveredAt && message.getDeliveredAt() > 0) {
              statusIcon = deliveredIcon;
              statusAlt = "delivered";
            }
          }
          if (moderationStatus === "disapproved") {
            statusIcon = blockIcon;
            statusAlt = "blocked";
          }
          const imageUrl = message.getAttachment && message.getAttachment().url;
          return (
            <div
              className={`bubble-view ${
                isSentByMe ? "bubble-view__outgoing" : "bubble-view__incoming"
              }`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isSentByMe ? "flex-end" : "flex-start",
                margin: "6px 0",
              }}
            >
              <div
                className="bubble-view__content"
                style={{
                  background: isSentByMe ? "#7B5AED" : "#fff",
                  color: isSentByMe ? "#fff" : "#222",
                  borderRadius: "12px",
                  padding: "8px",
                  maxWidth: "340px",
                  minWidth: "60px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="sent-img"
                    style={{
                      maxWidth: "260px",
                      maxHeight: "260px",
                      borderRadius: "8px",
                      display: "block",
                    }}
                  />
                )}
              </div>
              <div
                className="bubble-view__content__time"
                style={{
                  fontSize: "12px",
                  color: isSentByMe ? "#e0e0e0" : "#888",
                  marginTop: "2px",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "4px",
                  justifyContent: isSentByMe ? "flex-end" : "flex-start",
                  width: "100%",
                }}
              >
                {formatTime(message.getSentAt())}
                {isSentByMe && (
                  <img
                    src={statusIcon}
                    alt={statusAlt}
                    width="16px"
                    height="16px"
                    style={{ marginLeft: "2px" }}
                  />
                )}
              </div>
            </div>
          );
        };
        return t;
      }
      return t;
    });
    setTemplates(template);
  }, []);

  const fetchPurchases = async (userUid: string) => {
    const userID = Number(userUid.split("_")[1]);
    try {
      const response = await axios.post(
        `${BACKEND_API_URL}/api/auth/get-user-purchases`,
        { user_id: userID, page: 1, per_page: 100 },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "8afb4e1b51166d2adfd7fc2c9d583089",
          },
        }
      );

      setPurchases(response.data?.purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
    }
  };

  const fetchUserAnalytics = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_API_URL}/api/auth/user-analitic`,
        {
          user_id: user?.getUid(),
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Token": X_Auth_Token,
          },
        }
      );

      if (setUserAnalytics) {
        setUserAnalytics(response.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const userUid = user?.getUid() || null;

    if (!userUid) return;

    // Initial fetch
    fetchUserAnalytics();
    fetchPurchases(userUid);

    // Set up interval
    const interval = setInterval(() => {
      fetchUserAnalytics();
      fetchPurchases(userUid);
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    async function markConversationAsRead() {
      let conversationId, conversationType;
      if (user) {
        conversationId = user.getUid();
        conversationType = CometChat.RECEIVER_TYPE.USER;
      } else if (group) {
        conversationId = group.getGuid();
        conversationType = CometChat.RECEIVER_TYPE.GROUP;
      } else {
        return;
      }

      // Fetch the conversation to get the last message
      const conversation = await CometChat.getConversation(
        conversationId,
        conversationType
      );
      const lastMessage = conversation.getLastMessage();
      if (lastMessage) {
        CometChat.markAsRead(lastMessage);
      }
    }
    markConversationAsRead();
  }, [user, group]);

  // function containsBlockedWord(text: string): boolean {
  //   const lowerText = text.toLowerCase();
  //   const blockkey = sessionStorage.getItem(BLOCKED_WORDS_KEY);
  //   if (!blockkey) return false;
  //   const words = JSON.parse(blockkey);
  //   return words.some((word: string) => lowerText.includes(word.toLowerCase()));
  // }

  function containsBlockedWord(text: string): boolean {
        const blockkey = sessionStorage.getItem(BLOCKED_WORDS_KEY);
        if (!blockkey) return false;

        const words: string[] = JSON.parse(blockkey);
        const lowerText = text.toLowerCase();

        // Escape regex special characters
        const escapeRegex = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Build regex with word boundaries
        const regex = new RegExp(`\\b(${words.map(escapeRegex).join("|")})\\b`, "i");

        return regex.test(lowerText);
    }

  function getDateFormat() {
    return new CalendarObject({
      today: "Last seen hh:mm A",
      yesterday: "Last seen [Yesterday]",
      otherDays: "Last seen MMMM D, h:mm A",
    });
  }

  function EnhanceClickableProfile({ enable = false }) {
    useEffect(() => {
      if (!enable) return;

      const interval = setInterval(() => {
        const avatar = document.querySelector(
          ".cometchat-avatar__image"
        ) as HTMLElement | null;
        const name = document.querySelector(
          ".cometchat-list-item__body-title"
        ) as HTMLElement | null;
        const subtitle = document.querySelector(
          ".cometchat-message-header__subtitle"
        ) as HTMLElement | null;
        const info = document.querySelector(
          ".cometchat-header__info"
        ) as HTMLElement | null;

        if (avatar && subtitle && info && name) {
          avatar.style.cursor = "pointer";
          subtitle.style.cursor = "pointer";
          name.style.cursor = "pointer";

          const triggerClick = () => info.click();

          avatar.onclick = triggerClick;
          subtitle.onclick = triggerClick;
          name.onclick = triggerClick;

          clearInterval(interval);
        }
      }, 300);
      return () => clearInterval(interval);
    }, [enable]);
    return null;
  }
  const userRole1 = window.localStorage.getItem("userRole");
  const listBodyElement = document.querySelector(
    ".cometchat-list__body"
  ) as HTMLElement | null;
  if (listBodyElement) {
    userRole1 == "subscriber" &&
      listBodyElement.classList.add("subscriber-list-body");
  }

  // Add custom bubble view for messages
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000); // Convert to milliseconds
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
    return `${formattedHours}:${formattedMinutes} ${period}`;
  };

  const getDayLabel = (timestampSeconds: number): string => {
    const d = dayjs.unix(timestampSeconds).tz(dayjs.tz.guess());
    const today = dayjs().tz(dayjs.tz.guess()).startOf("day");
    const yesterday = today.subtract(1, "day");
    if (d.isSame(today, "day")) return "Today";
    if (d.isSame(yesterday, "day")) return "Yesterday";
    return d.format("MMM D, YYYY");
  };

  const handleDrop = (event: any) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file?.type?.startsWith("image/")) {
      setImageFile(file);
    }
  };

  const handleSendImage = async () => {
    if (!imageFile) return;

    const receiverID: any = group?.getGuid() || user?.getUid();
    const receiverType = group
      ? CometChat.RECEIVER_TYPE.GROUP
      : CometChat.RECEIVER_TYPE.USER;

    const mediaMessage = new CometChat.MediaMessage(
      receiverID,
      imageFile,
      CometChat.MESSAGE_TYPE.IMAGE,
      receiverType
    );

    try {
      const sentMessage: any = await CometChat.sendMessage(mediaMessage);
      CometChatMessageEvents.onMediaMessageReceived.next(sentMessage);
      setImageFile(null);
    } catch (error) {
      console.error("Send image failed:", error);
    }
  };

  useEffect(() => {
    const sendButton = document.getElementsByClassName(
      "cometchat-message-composer__send-button"
    )[0] as HTMLButtonElement | null;
    if (sendButton && imageFile) {
      handleSendImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFile]);

  return (
    <div
      className="cometchat-messages-wrapper"
      onDrop={handleDrop}
      aria-hidden={true}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      style={{
        border: isDragging ? "2px dashed #aaa" : "none",
        padding: "8px",
        borderRadius: "4px",
        position: "relative",
      }}
    >
      <div className="cometchat-header-wrapper">
        <EnhanceClickableProfile enable={!!user?.getUid()} />
        {userRole1 === OppaiDragonUserRole.CHAT_APP.WAIFU_USER ||
        userRole1 === OppaiDragonUserRole.CHAT_APP.ADMIN ? (
          <CometChatMessageHeader
            user={user}
            group={group}
            auxiliaryButtonView={headerMenu()}
            onBack={onBack}
            showBackButton={isShowBackButton && isMobile}
            hideVideoCallButton={true}
            hideVoiceCallButton={true}
            lastActiveAtDateTimeFormat={getDateFormat()}
          />
        ) : (
          <CustomMessageHeader
            user={user}
            group={group}
            headerMenu={headerMenu}
            onBack={onBack}
            showSideComponent={showSideComponent}
          />
        )}
      </div>
      <div className="cometchat-message-list-wrapper" ref={listWrapperRef}>
        {/* {topDateLabel && (
          <div className="sticky-date-pill" aria-hidden={true}>
            {topDateLabel}
          </div>
        )} */}
        <CometChatMessageList
          user={user}
          group={group}
          hideDateSeparator={false}
          hideStickyDate={false}
          showScrollbar={true}
          separatorDateTimeFormat={new CalendarObject({
            today: 'Today',
            yesterday: 'Yesterday',
            otherDays: 'MMM D, YYYY',
          })}
          stickyDateTimeFormat={new CalendarObject({
            today: 'Today',
            yesterday: 'Yesterday',
            otherDays: 'MMM D, YYYY',
          })}
          onThreadRepliesClick={(message: any) => onThreadRepliesClick(message)}
          templates={templates}
        />
      </div>
      {showComposerState ? (
        <div className="cometchat-composer-wrapper">
          {/* <div
                    onDrop={handleDrop}
                    aria-hidden={true}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    style={{
                        border: isDragging ? "2px dashed #aaa" : "none",
                        padding: "8px",
                        borderRadius: "4px",
                        position: "relative",
                    }}
                    > */}
          <div
            style={{
              position: "absolute",
              marginTop: "0%",
              zIndex: "999",
              right: "68px",
            }}
          >
            <GifPicker onSelectGif={(url) => sendGif(url)} />
          </div>
          <CometChatMessageComposer
            user={user}
            group={group}
            onError={(err) => console.log("Error:", err)}
            // hideImageAttachmentOption={CometChatUIKitLoginListener.getLoggedInUser()?.getRole() !== 'waifu'}
            // hideVideoAttachmentOption={CometChatUIKitLoginListener.getLoggedInUser()?.getRole() !== 'waifu'}
            // hideAudioAttachmentOption={CometChatUIKitLoginListener.getLoggedInUser()?.getRole() !== 'waifu'}
            // hideFileAttachmentOption={CometChatUIKitLoginListener.getLoggedInUser()?.getRole() !== 'waifu'}
            disableSoundForMessage={true}
            hideVoiceRecordingButton={true}
            hideEmojiKeyboardButton={false}
          />
          {/* </div> */}
        </div>
      ) : (
        <div
          aria-hidden={true}
          className="message-composer-blocked"
          onClick={() => {
            if (user) {
              CometChat.unblockUsers([user?.getUid()]).then(() => {
                user.setBlockedByMe(false);
                CometChatUserEvents.ccUserUnblocked.next(user);
              });
            }
          }}
        >
          <div className="message-composer-blocked__text">
            {getLocalizedString("cannot_send_to_blocked_user")}{" "}
            <a href="#"> {getLocalizedString("click_to_unblock")}</a>
          </div>
        </div>
      )}
    </div>
  );
};
