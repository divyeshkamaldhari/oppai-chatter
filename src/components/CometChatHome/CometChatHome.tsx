import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import blockIcon from "../../assets/block.svg";
import deleteIcon from "../../assets/delete.svg";
import { COMETCHAT_CONSTANTS } from "../../AppConstants";
import { useNavigate } from "react-router-dom";
import {
  Call,
  CometChat,
  Conversation,
  Group,
  GroupType,
  MessagesRequestBuilder,
  User,
} from "@cometchat/chat-sdk-javascript";
import backbutton from "../../assets/arrow_back.svg";
import addMembersIcon from "../../assets/addMembers.svg";
import leaveGroupIcon from "../../assets/leaveGroup.svg";
import "../../styles/CometChatSelector/CometChatTabs.css";
import "../../styles/CometChatSelector/CometChatSelector.css";
import "../../styles/CometChatNewChat/CometChatNewChatView.css";
import "../../styles/CometChatMessages/CometChatMessages.css";
import "../../styles/CometChatDetails/CometChatDetails.css";
import { CometChatEmptyStateView } from "../CometChatMessages/CometChatEmptyStateView";
import { AppContext } from "../../context/AppContext";
import { CometChatMessages } from "../CometChatMessages/CometChatMessages";
import { CometChatTabs } from "../CometChatSelector/CometChatTabs";
import { CometChatSelector } from "../CometChatSelector/CometChatSelector";
import { CometChatUserDetails } from "../CometChatDetails/CometChatUserDetails";
import { CometChatThreadedMessages } from "../CometChatDetails/CometChatThreadedMessages";
import { CometChatAlertPopup } from "../CometChatAlertPopup/CometChatAlertPopup";
import {
  CometChatAvatar,
  CometChatButton,
  CometChatConfirmDialog,
  CometChatConversationEvents,
  CometChatGroupEvents,
  CometChatGroupMembers,
  CometChatGroups,
  CometChatIncomingCall,
  CometChatMessageEvents,
  CometChatToast,
  CometChatUIKit,
  CometChatUIKitConstants,
  CometChatUIKitLoginListener,
  CometChatUIKitUtility,
  CometChatUserEvents,
  CometChatUsers,
  CometChatUIEvents,
  getLocalizedString,
  IMessages,
  IMouseEvent,
  IActiveChatChanged,
  MessageStatus,
  IGroupMemberAdded,
  IGroupMemberKickedBanned,
  IGroupMemberJoined,
} from "@cometchat/chat-uikit-react";
import { CometChatSoundManager } from "../../utils/soundManager";
import { OppaiDragonUserRole } from "../../constant/AppUserRole";
import { isIOS } from "../../utils/iosOptimizations";
import axios from "axios";

interface TabContentProps {
  selectedTab: string;
}

interface ThreadProps {
  message: CometChat.BaseMessage;
}

function CometChatHome(props: {
  theme?: string;
  userBio: string;
  userUuid: any;
  selectedUserUuid: string;
  userMetaData: any;
  userTags: any;
}) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<string>(props.theme!);
  const [loggedInUser, setLoggedInUser] = useState<CometChat.User | null>(null);
  const appID: string =
    localStorage.getItem("appId") || COMETCHAT_CONSTANTS.APP_ID; // Use the latest appId if available
  const region: string =
    localStorage.getItem("region") || COMETCHAT_CONSTANTS.REGION; // Default to 'us' if region is not found
  const authKey: string =
    localStorage.getItem("authKey") || COMETCHAT_CONSTANTS.AUTH_KEY; // Default authKey if not found
  const [group, setGroup] = useState<Group>();
  const [isShowbackButton, setIsShowbackButton] = useState<boolean>(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("chats");
  const [selectedItem, setSelectedItem] = useState<
    Conversation | User | Group | Call | undefined
  >();
  const [showNewChat, setShowNewChat] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const showJoinGroupRef = useRef(false);
  const [newChat, setNewChat] = useState<
    | {
        user?: CometChat.User;
        group?: CometChat.Group;
      }
    | undefined
  >();
  const [showAlertPopup, setShowAlertPopup] = useState({
    visible: false,
    description: "",
  });
  const [showToast, setShowToast] = useState(false);
  const toastTextRef = useRef<string>("");
  const isFreshChatRef = useRef<boolean>(false);
  const currentChatRef = useRef<CometChat.Conversation | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { appState, setAppState, setUserAnalytics, setUsers } = useContext(
    AppContext
  ) as any;
  const [isMobileback, setIsMobileback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  function hasCredentials() {
    if (appID === "" || region === "" || authKey === "") return false;
    return true;
  }
  const metaData = props?.userMetaData;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const chatChanged = CometChatUIEvents.ccActiveChatChanged.subscribe(
      (activeChat: IActiveChatChanged) => {
        if (activeChat && !activeChat.message) {
          setAppState({ type: "updateIsFreshChat", payload: true });
          isFreshChatRef.current = true;
        } else {
          setAppState({ type: "updateIsFreshChat", payload: false });
          isFreshChatRef.current = false;
        }
      }
    );
    return () => chatChanged.unsubscribe();
  }, []);

  useEffect(() => {
    const listenerID = `HomeLoginListener_${new Date().getTime()}`;
    CometChat.addLoginListener(
      listenerID,
      new CometChat.LoginListener({
        logoutSuccess: () => {
          setSelectedItem(undefined);
          setNewChat(undefined);
          setAppState({ type: "updateSelectedItem", payload: undefined });
          setAppState({ type: "updateSelectedItemUser", payload: undefined });
          setAppState({ type: "updateSelectedItemGroup", payload: undefined });
          setAppState({ type: "newChat", payload: undefined });
        },
      })
    );
    return () => CometChat.removeConnectionListener(listenerID);
  });

  useEffect(() => {
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "dark");
    };
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(mediaQuery.matches ? "dark" : "dark");
    mediaQuery.addEventListener("change", handleThemeChange);
    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, []);

  useEffect(() => {
    const user = CometChatUIKitLoginListener.getLoggedInUser();
    setLoggedInUser(user);
    if (!user) {
      navigate("/login", {
        replace: true,
        state: { userUuid: props.userUuid },
      });
    } else {
      // Initialize sound settings in background, don't block UI
      CometChatSoundManager.initializeSoundSettings().catch((err) =>
        console.warn("Sound settings initialization failed:", err)
      );
      const role = user?.getRole?.();
      setUserRole(role);
      if (
        role === OppaiDragonUserRole.CHAT_APP.WAIFU_USER ||
        role === OppaiDragonUserRole.CHAT_APP.ADMIN
      ) {
        setIsShowbackButton(true);
      } else {
        setIsShowbackButton(false);
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const isMessageListOpen =
      selectedItem &&
      (selectedItem instanceof CometChat.User ||
        selectedItem instanceof CometChat.Group ||
        selectedItem instanceof CometChat.Conversation);

    if (activeTab === "chats" || isMessageListOpen) return;
    const messageListenerId = `misc-message_${Date.now()}`;
    attachMessageReceivedListener(messageListenerId);

    return () => {
      CometChat.removeMessageListener(messageListenerId);
    };
  }, [activeTab, selectedItem]);

  /**
   * Handles new received messages
   */
  const onMessageReceived = useCallback(
    async (message: CometChat.BaseMessage): Promise<void> => {
      if (
        message.getSender().getUid() !==
          CometChatUIKitLoginListener.getLoggedInUser()?.getUid() &&
        !message.getDeliveredAt()
      ) {
        try {
          CometChat.markAsDelivered(message);
        } catch (error) {
          console.error(error);
        }
      }
    },
    []
  );

  const attachMessageReceivedListener = useCallback(
    (messageListenerId: string) => {
      CometChat.addMessageListener(
        messageListenerId,
        new CometChat.MessageListener({
          onTextMessageReceived: (textMessage: CometChat.TextMessage) => {
            onMessageReceived(textMessage);
          },
          onMediaMessageReceived: (mediaMessage: CometChat.MediaMessage) => {
            onMessageReceived(mediaMessage);
          },
          onCustomMessageReceived: (customMessage: CometChat.CustomMessage) => {
            onMessageReceived(customMessage);
          },
        })
      );
    },
    [onMessageReceived]
  );
  const updateUserAfterBlockUnblock = (user: User) => {
    if (appState.selectedItemUser?.getUid() === user.getUid()) {
      setAppState({ type: "updateSelectedItemUser", payload: user });
    }
    if (
      (appState.selectedItem?.getConversationWith() as User)?.getUid?.() ===
      user.getUid()
    ) {
      appState.selectedItem?.setConversationWith(user);
      setAppState({
        type: "updateSelectedItem",
        payload: appState.selectedItem,
      });
    }
  };

  const TabComponent = () => {
    const onTabClicked = (tabItem: {
      name: string;
      icon: string;
      id: string;
    }) => {
      setAppState({
        type: "updateSideComponent",
        payload: { visible: false, type: "" },
      });
      setNewChat(undefined);
      setActiveTab(tabItem.id);
    };

    return (
      <CometChatTabs
        onTabClicked={onTabClicked}
        activeTab={activeTab}
        userRole={userRole}
      />
    );
  };

  useEffect(() => {
    if (activeTab === "chats" && appState.selectedItem) {
      setSelectedItem(appState.selectedItem);
    } else if (activeTab === "users" && appState.selectedItemUser) {
      setSelectedItem(appState.selectedItemUser);
    } else if (activeTab === "groups" && appState.selectedItemGroup) {
      setSelectedItem(appState.selectedItemGroup);
    } else if (activeTab === "calls" && appState.selectedItemCall) {
      setSelectedItem(appState.selectedItemCall);
    } else {
      setSelectedItem(undefined);
    }
  }, [activeTab]);

  const InformationComponent = useCallback(() => {
    return (
      <>
        {showNewChat ? (
          <CometChatNewChatView />
        ) : selectedItem || newChat?.user || newChat?.group ? (
          <CometChatMessagesViewComponent />
        ) : (
          <CometChatEmptyStateView activeTab={activeTab} />
        )}
      </>
    );
  }, [activeTab, showNewChat, selectedItem, newChat]);

  const CometChatMessagesViewComponent = () => {
    const [showComposer, setShowComposer] = useState(true);
    const [messageUser, setMessageUser] = useState<User>();
    const [messageGroup, setMessageGroup] = useState<Group>();
    const [threadedMessage, setThreadedMsg] = useState<
      CometChat.BaseMessage | undefined
    >();

    useEffect(() => {
      if (newChat?.user) {
        setMessageUser(newChat.user);
        setMessageGroup(undefined);
      } else if (newChat?.group) {
        setMessageUser(undefined);
        setMessageGroup(newChat.group);
      } else {
        if (activeTab === "chats") {
          if (
            (selectedItem as Conversation)?.getConversationType?.() ===
            CometChatUIKitConstants.MessageReceiverType.user
          ) {
            setMessageUser(
              (selectedItem as Conversation)?.getConversationWith() as User
            );
            setMessageGroup(undefined);
          } else if (
            (selectedItem as Conversation)?.getConversationType?.() ===
            CometChatUIKitConstants.MessageReceiverType.group
          ) {
            setMessageUser(undefined);
            setMessageGroup(
              (selectedItem as Conversation)?.getConversationWith() as Group
            );
          }
        } else if (activeTab === "users") {
          setMessageUser(selectedItem as User);
          setMessageGroup(undefined);
        } else if (activeTab === "groups") {
          setMessageUser(undefined);
          setMessageGroup(selectedItem as Group);
        } else {
          setMessageUser(undefined);
          setMessageGroup(undefined);
        }
      }
    }, [activeTab, selectedItem]);

    const updateisFirstChat = ({ message, status }: IMessages) => {
      const receiverId = message?.getReceiverId();
      const sender = message?.getSender();
      if (
        ((appState.selectedItemUser &&
          (appState.selectedItemUser.getUid() == receiverId ||
            ((!sender ||
              (sender &&
                appState.selectedItemUser.getUid() == sender.getUid())) &&
              receiverId == loggedInUser?.getUid()))) ||
          (appState.selectedItemGroup &&
            (appState.selectedItemGroup.getGuid() == receiverId ||
              loggedInUser?.getUid() == receiverId))) &&
        isFreshChatRef.current &&
        status == MessageStatus.success
      ) {
        setAppState({ type: "updateIsFreshChat", payload: false });
        isFreshChatRef.current = false;
        let conversationWith = appState.selectedItemUser
          ? appState.selectedItemUser.getUid()
          : appState.selectedItemGroup?.getGuid();
        let conversationType = appState.selectedItemUser
          ? CometChatUIKitConstants.MessageReceiverType.user
          : CometChatUIKitConstants.MessageReceiverType.group;
        if (!conversationWith) return;
        CometChat.getConversation(conversationWith, conversationType).then(
          (conversation) => {
            setAppState({ type: "updateSelectedItem", payload: conversation });
            currentChatRef.current = conversation;
          }
        );
      }
    };

    const subscribeToEvents = () => {
      const ccUserBlocked = CometChatUserEvents.ccUserBlocked.subscribe(
        (user) => {
          if (user.getBlockedByMe()) {
            setShowComposer(false);
          }
          updateUserAfterBlockUnblock(user);
        }
      );
      const ccUserUnblocked = CometChatUserEvents.ccUserUnblocked.subscribe(
        (user) => {
          if (!user.getBlockedByMe()) {
            setShowComposer(true);
          }
          updateUserAfterBlockUnblock(user);
        }
      );
      const ccMessageDeleted =
        CometChatMessageEvents.ccMessageDeleted.subscribe((message) => {
          if (message.getId() === threadedMessage?.getId()) {
            setAppState({
              type: "updateSideComponent",
              payload: { visible: false, type: "" },
            });
          }
        });
      const ccMessageSent = CometChatMessageEvents.ccMessageSent.subscribe(
        (data: IMessages) => {
          updateisFirstChat(data);
        }
      );
      const onTextMessageReceived =
        CometChatMessageEvents.onTextMessageReceived.subscribe(
          (textMessage: CometChat.TextMessage) => {
            updateisFirstChat({
              message: textMessage,
              status: MessageStatus.success,
            });
          }
        );
      const onMediaMessageReceived =
        CometChatMessageEvents.onMediaMessageReceived.subscribe(
          (mediaMessage: CometChat.MediaMessage) => {
            updateisFirstChat({
              message: mediaMessage,
              status: MessageStatus.success,
            });
          }
        );
      const onCustomMessageReceived =
        CometChatMessageEvents.onCustomMessageReceived.subscribe(
          (customMessage: CometChat.CustomMessage) => {
            updateisFirstChat({
              message: customMessage,
              status: MessageStatus.success,
            });
          }
        );
      return () => {
        ccUserBlocked?.unsubscribe();
        ccUserUnblocked?.unsubscribe();
        ccMessageDeleted?.unsubscribe();
        ccMessageSent?.unsubscribe();
        onTextMessageReceived?.unsubscribe();
        onMediaMessageReceived?.unsubscribe();
        onCustomMessageReceived?.unsubscribe();
      };
    };

    useEffect(() => {
      if (messageUser?.getBlockedByMe()) {
        setShowComposer(false);
      }
      const unsubscribeFromEvents = subscribeToEvents();
      return () => {
        unsubscribeFromEvents();
      };
    }, [subscribeToEvents, selectedItem]);

    const showSideComponent = () => {
      let type = "";
      if (activeTab === "chats") {
        if ((selectedItem as Conversation)?.getConversationType() === "group") {
          type = "group";
        } else {
          type = "user";
        }
      } else if (activeTab === "users") {
        type = "user";
      } else if (activeTab === "groups") {
        type = "group";
      }

      if (newChat?.user) {
        type = "user";
      } else if (newChat?.group) {
        type = "group";
      }
      setAppState({
        type: "updateSideComponent",
        payload: { visible: true, type },
      });
    };

    const headerMenu = () => {
      return (
        <div />
        // <div
        //     className="cometchat-header__info"
        //     onClick={showSideComponent}
        // />
      );
    };

    const updateThreadedMessage = (message: CometChat.BaseMessage) => {
      setThreadedMsg(message);
      setAppState({
        type: "updateSideComponent",
        payload: { visible: true, type: "threadedMessage" },
      });
      setAppState({ type: "updateThreadedMessage", payload: message });
    };

    const onBack = () => {
      setSelectedItem(undefined);
      setNewChat(undefined);
      setIsMobileback(true);
      setAppState({ type: "updateSelectedItem", payload: undefined });
      setAppState({ type: "updateSelectedItemUser", payload: undefined });
      setAppState({ type: "updateSelectedItemGroup", payload: undefined });
      setAppState({ type: "newChat", payload: undefined });
    };

    return (
      <>
        {
          <CometChatMessages
            user={messageUser}
            group={messageGroup}
            onBack={onBack}
            headerMenu={headerMenu}
            onThreadRepliesClick={(message) => updateThreadedMessage(message)}
            showComposer={showComposer}
            isShowBackButton={isShowbackButton}
            showSideComponent={showSideComponent}
            setUserAnalytics={setUserAnalytics}
          />
        }
      </>
    );
  };

  const CometChatNewChatView: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState<string>("user");
    const [group, setGroup] = useState<Group>();
    const loggedInUser = CometChatUIKitLoginListener.getLoggedInUser();

    const handleTabClick = (tab: string) => {
      setSelectedTab(tab);
    };

    const joinGroup = (e: Group) => {
      if (!e.getHasJoined()) {
        if (e.getType() === CometChatUIKitConstants.GroupTypes.public) {
          CometChat.joinGroup(e.getGuid(), e.getType() as GroupType)
            .then((response: any) => {
              setAppState({
                type: "updateSideComponent",
                payload: { visible: false, type: "" },
              });
              response.setHasJoined?.(true);
              response.setScope?.(
                CometChatUIKitConstants.groupMemberScope.participant
              );
              setNewChat({ group: response, user: undefined });
              setShowNewChat(false);
              setTimeout(() => {
                CometChatGroupEvents.ccGroupMemberJoined.next({
                  joinedGroup: response,
                  joinedUser: loggedInUser!,
                });
              }, 100);
            })
            .catch((error: unknown) => {});
        } else {
          setAppState({
            type: "updateSideComponent",
            payload: { visible: false, type: "" },
          });
          setGroup(e);
          showJoinGroupRef.current = true;
        }
      } else {
        setAppState({
          type: "updateSideComponent",
          payload: { visible: false, type: "" },
        });
        setNewChat({ group: e, user: undefined });
        setShowNewChat(false);
      }
    };

    const TabContent: React.FC<TabContentProps> = ({ selectedTab }) => {
      return selectedTab === "user" ? (
        <CometChatUsers
          onItemClick={(user: CometChat.User) => {
            setNewChat({ user, group: undefined });
            setAppState({
              type: "updateSideComponent",
              payload: { visible: false, type: "" },
            });
            setShowNewChat(false);
            setAppState({ type: "updateSelectedItemUser", payload: user });
            setAppState({
              type: "updateSelectedItemGroup",
              payload: undefined,
            });
          }}
        />
      ) : (
        <CometChatGroups
          groupsRequestBuilder={new CometChat.GroupsRequestBuilder()
            .joinedOnly(true)
            .setLimit(30)
            .withTags(true)}
          onItemClick={(e: CometChat.Group) => {
            setAppState({ type: "updateSelectedItemUser", payload: undefined });
            setAppState({ type: "updateSelectedItemGroup", payload: e });
            joinGroup(e);
          }}
        />
      );
    };

    return (
      <div className="cometchat-new-chat-view">
        {/* Header with back icon and title */}
        <div className="cometchat-new-chat-view__header">
          <CometChatButton
            iconURL={backbutton}
            onClick={() => {
              setShowNewChat(false);
            }}
          />
          <div className="cometchat-new-chat-view__header-title">New Chat</div>
        </div>

        {/* Tabs for User and Group */}
        <div className="cometchat-new-chat-view__tabs">
          <div
            className={`cometchat-new-chat-view__tabs-tab ${
              selectedTab == "user"
                ? "cometchat-new-chat-view__tabs-tab-active"
                : ""
            }`}
            onClick={() => handleTabClick("user")}
          >
            {" "}
            {getLocalizedString("user_title")}
          </div>
          <div
            className={`cometchat-new-chat-view__tabs-tab ${
              selectedTab == "group"
                ? "cometchat-new-chat-view__tabs-tab-active"
                : ""
            }`}
            onClick={() => handleTabClick("group")}
          >
            {" "}
            {getLocalizedString("group_title")}
          </div>
        </div>

        {/* Dynamic content based on selected tab */}
        <div style={{ overflow: "hidden" }}>
          <TabContent selectedTab={selectedTab} />
        </div>
      </div>
    );
  };

  const SideComponent = () => {
    const [group, setGroup] = useState<CometChat.Group>();
    const [user, setUser] = useState<CometChat.User>();

    useEffect(() => {
      if (activeTab == "chats") {
        if (
          (selectedItem as Conversation)?.getConversationType?.() === "user"
        ) {
          setUser(
            (
              selectedItem as Conversation
            )?.getConversationWith() as CometChat.User
          );
        } else if (
          (selectedItem as Conversation)?.getConversationType?.() === "group"
        ) {
          setGroup(
            (
              selectedItem as Conversation
            ).getConversationWith() as CometChat.Group
          );
        }
      } else if (activeTab === "users") {
        setUser(selectedItem as CometChat.User);
      } else if (activeTab === "groups") {
        setGroup(selectedItem as CometChat.Group);
      }
    }, [selectedItem, activeTab]);

    useEffect(() => {
      if (newChat?.user) {
        setUser(newChat.user);
      } else if (newChat?.group) {
        setGroup(newChat.group);
      }
    }, [newChat]);

    const updateGroupDetails = (eventGroup: CometChat.Group) => {
      if (eventGroup.getGuid() === group?.getGuid()) {
        group.setMembersCount(eventGroup.getMembersCount());
        group.setScope(eventGroup.getScope());
        group.setOwner(eventGroup.getOwner());
        setGroup(group);
      }
    };

    const attachSDKGroupListenerForDetails = () => {
      const listenerId = "GroupDetailsListener_" + String(Date.now());
      CometChat.addGroupListener(
        listenerId,
        new CometChat.GroupListener({
          onGroupMemberBanned: (
            message: CometChat.Action,
            bannedUser: CometChat.User,
            bannedBy: CometChat.User,
            bannedFrom: CometChat.Group
          ) => {
            updateGroupDetails(bannedFrom);
          },
          onGroupMemberKicked: (
            message: CometChat.Action,
            kickedUser: CometChat.User,
            kickedBy: CometChat.User,
            kickedFrom: CometChat.Group
          ) => {
            updateGroupDetails(kickedFrom);
          },
          onMemberAddedToGroup: (
            message: CometChat.Action,
            userAdded: CometChat.User,
            userAddedBy: CometChat.User,
            userAddedIn: CometChat.Group
          ) => {
            updateGroupDetails(userAddedIn);
          },
          onGroupMemberJoined: (
            message: CometChat.Action,
            joinedUser: CometChat.User,
            joinedGroup: CometChat.Group
          ) => {
            updateGroupDetails(joinedGroup);
          },
          onGroupMemberLeft: (
            message: CometChat.Action,
            leavingUser: CometChat.User,
            group: CometChat.Group
          ) => {
            updateGroupDetails(group);
          },
        })
      );
      return () => CometChat.removeGroupListener(listenerId);
    };

    useEffect(() => {
      if (loggedInUser) {
        const unsubscribeFromGroupEvents = attachSDKGroupListenerForDetails();
        return () => {
          unsubscribeFromGroupEvents();
        };
      }
    }, [loggedInUser, attachSDKGroupListenerForDetails]);

    return (
      <>
        <div className="side-component-wrapper">
          {user && <SideComponentUser user={user} userBio={props.userBio} />}
          {appState.sideComponent.visible && (
            <>
              {appState.sideComponent.type == "group" && group && (
                <SideComponentGroup group={group} />
              )}
              {appState.sideComponent.type == "threadedMessage" &&
                appState.threadedMessage && (
                  <SideComponentThread message={appState.threadedMessage} />
                )}
            </>
          )}
        </div>
      </>
    );
  };

  const SideComponentUser = (props: {
    user: CometChat.User;
    userBio: string;
  }) => {
    const { user, userBio } = props;

    const actionItemsArray = [
      {
        name: user.getBlockedByMe()
          ? getLocalizedString("user_details_unblock")
          : getLocalizedString("user_details_block"),
        icon: blockIcon,
        id: "block_unblock_user",
      },
      {
        name: getLocalizedString("delete_chat"),
        icon: deleteIcon,
        id: "delete_chat",
      },
    ];
    const [actionItems, setActionItems] = useState(actionItemsArray);
    const [showStatus, setShowStatus] = useState(true);
    const [showBlockUserDialog, setShowBlockUserDialog] = useState(false);
    const [showDeleteConversationDialog, setShowDeleteConversationDialog] =
      useState(false);

    const onBlockUserClicked: () => Promise<void> = () => {
      let UID = user.getUid();
      return new Promise(async (resolve, reject) => {
        CometChat.blockUsers([UID]).then(
          (list) => {
            user.setBlockedByMe(true);
            CometChatUserEvents.ccUserBlocked.next(user);
            toastTextRef.current = getLocalizedString("blocked_successfully");
            setShowToast(true);
            return resolve();
          },
          (error) => {
            return reject();
          }
        );
      });
    };

    const onUnblockUserClicked = () => {
      let UID = user.getUid();
      CometChat.unblockUsers([UID]).then(
        (list) => {
          setActionItems([
            {
              name: getLocalizedString("user_details_block"),
              icon: blockIcon,
              id: "block_unblock_user",
            },
            {
              name: getLocalizedString("delete_chat"),
              icon: deleteIcon,
              id: "delete_chat",
            },
          ]);
          user.setBlockedByMe(false);
          CometChatUserEvents.ccUserUnblocked.next(user);
        },
        (error) => {}
      );
    };

    const onDeleteConversationClicked: () => Promise<void> = () => {
      let UID = user.getUid();
      return new Promise(async (resolve, reject) => {
        CometChat.deleteConversation(UID, "user").then(
          (deletedConversation) => {
            setAppState({
              type: "updateSideComponent",
              payload: { visible: false, type: "" },
            });
            CometChatConversationEvents.ccConversationDeleted.next(
              currentChatRef.current ?? (selectedItem as CometChat.Conversation)
            );
            currentChatRef.current = null;
            toastTextRef.current = getLocalizedString(
              "chat_deleted_successfully"
            );
            setShowToast(true);
            setSelectedItem(undefined);
            return resolve();
          },
          (error) => {
            return reject();
          }
        );
      });
    };

    const onUserActionClick = (item: { name: string; icon: string }) => {
      if (item.name == getLocalizedString("user_details_block")) {
        setShowBlockUserDialog(true);
      } else if (item.name == getLocalizedString("user_details_unblock")) {
        onUnblockUserClicked();
      } else if (item.name == getLocalizedString("delete_chat")) {
        setShowDeleteConversationDialog(true);
      }
    };

    const subscribeToEvents = () => {
      const ccUserBlocked = CometChatUserEvents.ccUserBlocked.subscribe(
        (user) => {
          if (user.getBlockedByMe()) {
            setShowStatus(false);
            setActionItems([
              {
                name: getLocalizedString("user_details_unblock"),
                icon: blockIcon,
                id: "block_unblock_user",
              },
              {
                name: getLocalizedString("delete_chat"),
                icon: deleteIcon,
                id: "delete_chat",
              },
            ]);
          }
          window.dispatchEvent(
            new CustomEvent("blockingUserChanged", {
              detail: {
                type: "user_blocked",
                user: user,
              },
            })
          );
          updateUserAfterBlockUnblock(user);
        }
      );
      const ccUserUnblocked = CometChatUserEvents.ccUserUnblocked.subscribe(
        (user) => {
          if (!user.getBlockedByMe()) {
            setShowStatus(true);
            setActionItems([
              {
                name: getLocalizedString("user_details_block"),
                icon: blockIcon,
                id: "block_user",
              },
              {
                name: getLocalizedString("delete_chat"),
                icon: deleteIcon,
                id: "delete_chat",
              },
            ]);
          }
          updateUserAfterBlockUnblock(user);
          window.dispatchEvent(
            new CustomEvent("blockingUserChanged", {
              detail: {
                type: "user_unblocked",
                user: user,
              },
            })
          );
        }
      );

      return () => {
        ccUserBlocked?.unsubscribe();
        ccUserUnblocked?.unsubscribe();
      };
    };

    useEffect(() => {
      if (user.getBlockedByMe()) {
        setShowStatus(false);
      }
      const unsubscribeFromEvents = subscribeToEvents();
      return () => {
        unsubscribeFromEvents();
      };
    }, [subscribeToEvents, selectedItem]);

    const onHide = () =>
      setAppState({
        type: "updateSideComponent",
        payload: { visible: false, type: "" },
      });

    const getDeleteConversationConfirmationView = () => {
      return (
        <>
          <div className="cometchat-delete-chat-dialog__backdrop">
            <CometChatConfirmDialog
              title={getLocalizedString("delete_chat")}
              messageText={getLocalizedString("confirm_delete_chat")}
              confirmButtonText={getLocalizedString(
                "conversation_delete_title"
              )}
              onCancelClick={() => {
                setShowDeleteConversationDialog(!showDeleteConversationDialog);
              }}
              onSubmitClick={onDeleteConversationClicked}
            />
          </div>
        </>
      );
    };

    const getBlockUserConfirmationDialogView = () => {
      return (
        <>
          <div className="cometchat-block-user-dialog__backdrop">
            <CometChatConfirmDialog
              title={getLocalizedString("block_contact")}
              messageText={getLocalizedString("confirm_block_contact")}
              confirmButtonText={getLocalizedString("user_details_block")}
              onCancelClick={() => {
                setShowBlockUserDialog(!showBlockUserDialog);
              }}
              onSubmitClick={onBlockUserClicked}
            />
          </div>
        </>
      );
    };

    return (
      <>
        {showDeleteConversationDialog &&
          getDeleteConversationConfirmationView()}
        {showBlockUserDialog && getBlockUserConfirmationDialogView()}
        <CometChatUserDetails
          user={user}
          userBioText={userBio}
          actionItems={actionItems}
          onHide={onHide}
          showStatus={showStatus}
          onUserActionClick={onUserActionClick}
          userMetaData={metaData}
        />
      </>
    );
  };
  interface ActionItem {
    name: string;
    icon: string; // assuming the icon is a string, you can adjust based on the actual type (e.g., JSX.Element)
    type: "scope" | "alert"; // You can list the valid types here
    onClick: () => void; // Function that triggers the action
    isAllowed: () => boolean; // Function that checks if the action is allowed
    id?: string;
  }

  const SideComponentGroup = (props: { group: CometChat.Group }) => {
    const [groupTab, setGroupTab] = useState("view");
    const [showAddMembers, setShowAddMembers] = useState(false);
    const [showLeaveGroup, setShowLeaveGroup] = useState(false);
    const [showTransferownershipDialog, setShowTransferownershipDialog] =
      useState(false);
    const [showDeleteGroup, setShowDeleteGroup] = useState(false);
    const [showTransferOwnership, setShowTransferOwnership] = useState(false);
    const [showDeleteGroupChatDialog, setShowDeleteGroupChatDialog] =
      useState(false);
    const [actionItems, setActionItems] = useState<ActionItem[]>([]);
    const [scopeChanged, setScopeChanged] = useState(false);
    const { group } = props;
    const groupListenerRef = useRef(
      "groupinfo_GroupListener_" + String(Date.now())
    );
    const [memberCount, setMemberCount] = useState(group.getMembersCount());

    const [groupOwner, setGroupOwner] = useState(group.getOwner());

    const { appState, setAppState } = useContext(AppContext);

    useEffect(() => {
      CometChat.addGroupListener(
        groupListenerRef.current,
        new CometChat.GroupListener({
          onGroupMemberScopeChanged: (
            message: CometChat.Action,
            changedUser: CometChat.GroupMember,
            newScope: CometChat.GroupMemberScope,
            oldScope: CometChat.GroupMemberScope,
            changedGroup: CometChat.Group
          ) => {
            if (changedGroup.getGuid() !== group?.getGuid()) {
              return;
            }
            if (changedUser.getUid() == loggedInUser?.getUid()) {
              setGroup(changedGroup);
              setGroupOwner(changedGroup.getOwner());
              setScopeChanged(true);
            }
          },
          onGroupMemberKicked: (
            message: CometChat.BaseMessage,
            kickedUser: CometChat.User,
            kickedBy: CometChat.User,
            kickedFrom: CometChat.Group
          ): void => {
            setMemberCount(kickedFrom.getMembersCount());
            setGroup(kickedFrom);
            setGroupOwner(kickedFrom.getOwner());
          },
          onGroupMemberBanned: (
            message: CometChat.BaseMessage,
            bannedUser: CometChat.User,
            bannedBy: CometChat.User,
            bannedFrom: CometChat.Group
          ): void => {
            setMemberCount(bannedFrom.getMembersCount());
            setGroup(bannedFrom);
            setGroupOwner(bannedFrom.getOwner());
          },
          onMemberAddedToGroup: (
            message: CometChat.BaseMessage,
            userAdded: CometChat.User,
            userAddedBy: CometChat.User,
            userAddedIn: CometChat.Group
          ): void => {
            setMemberCount(userAddedIn.getMembersCount());
            setGroup(userAddedIn);
          },
          onGroupMemberLeft: (
            message: CometChat.BaseMessage,
            leavingUser: CometChat.GroupMember,
            group: CometChat.Group
          ): void => {
            setMemberCount(group.getMembersCount());
            setGroup(group);
            setGroupOwner(group.getOwner());
          },
          onGroupMemberJoined: (
            message: CometChat.BaseMessage,
            joinedUser: CometChat.GroupMember,
            joinedGroup: CometChat.Group
          ): void => {
            setMemberCount(joinedGroup.getMembersCount());
            setGroup(joinedGroup);
          },
        })
      );

      const ccGroupMemberAdded =
        CometChatGroupEvents.ccGroupMemberAdded.subscribe(
          (item: IGroupMemberAdded) => {
            setMemberCount(item.userAddedIn.getMembersCount());
            setGroup(item.userAddedIn);
          }
        );
      const ccGroupMemberBanned =
        CometChatGroupEvents.ccGroupMemberBanned.subscribe(
          (item: IGroupMemberKickedBanned) => {
            setMemberCount(item.kickedFrom.getMembersCount());
            setGroup(item.kickedFrom);
          }
        );
      const ccGroupMemberKicked =
        CometChatGroupEvents.ccGroupMemberKicked.subscribe(
          (item: IGroupMemberKickedBanned) => {
            setMemberCount(item.kickedFrom.getMembersCount());
            setGroup(item.kickedFrom);
          }
        );
      return () => {
        ccGroupMemberAdded?.unsubscribe();
        ccGroupMemberBanned?.unsubscribe();
        ccGroupMemberKicked?.unsubscribe();
        CometChat.removeGroupListener(groupListenerRef.current);
      };
    }, [group]);
    useEffect(() => {
      setActionItems([
        {
          name: getLocalizedString("add_members"),
          icon: addMembersIcon,
          id: "add_members",
          type: "scope",
          onClick: () => {
            setShowAddMembers(!showAddMembers);
          },
          isAllowed: () => {
            return isAdminOrOwner();
          },
        },
        {
          name: getLocalizedString("delete_chat"),
          id: "delete_chat",
          icon: deleteIcon,
          type: "alert",
          onClick: () => {
            setShowDeleteGroupChatDialog(true);
          },
          isAllowed: () => {
            return true;
          },
        },
        {
          name: getLocalizedString("leave"),
          id: "leave_group",
          icon: leaveGroupIcon,
          type: "alert",
          onClick: () => {
            if (
              group.getOwner() ==
              CometChatUIKitLoginListener.getLoggedInUser()?.getUid()
            ) {
              setShowTransferownershipDialog(!showTransferownershipDialog);
            } else {
              setShowLeaveGroup(!showLeaveGroup);
            }
          },
          isAllowed: () => {
            return (
              group.getMembersCount() > 1 ||
              (group.getMembersCount() == 1 &&
                loggedInUser?.getUid() !== group.getOwner())
            );
          },
        },
        {
          name: getLocalizedString("delete_and_exit"),
          id: "delete_exit",
          icon: deleteIcon,
          type: "alert",
          onClick: () => {
            setShowDeleteGroup(!showDeleteGroup);
          },
          isAllowed: () => {
            return isAdminOrOwner();
          },
        },
      ]);
    }, [scopeChanged, group, memberCount]);

    const isAdminOrOwner = () => {
      return (
        group.getScope() == CometChatUIKitConstants.groupMemberScope.admin ||
        loggedInUser?.getUid() == groupOwner
      );
    };

    function transferOwnershipDialogView() {
      return (
        <>
          <div className="cometchat-transfer-ownership-dialog__backdrop">
            <CometChatConfirmDialog
              title={getLocalizedString("ownership_transfer")}
              messageText={getLocalizedString("confirm_ownership_transfer")}
              confirmButtonText={getLocalizedString("continue")}
              onCancelClick={() => {
                setShowTransferownershipDialog(!showTransferownershipDialog);
              }}
              onSubmitClick={() => {
                return new Promise((resolve, reject) => {
                  setShowTransferownershipDialog(!showTransferownershipDialog);
                  setShowTransferOwnership(!showTransferOwnership);
                  return resolve();
                });
              }}
            />
          </div>
        </>
      );
    }
    const createGroupMemberLeftActionMessage = useCallback(
      (
        group: CometChat.Group,
        loggedInUser: CometChat.User
      ): CometChat.Action => {
        const action = CometChatUIKitConstants.groupMemberAction.LEFT;
        const actionMessage = new CometChat.Action(
          group.getGuid(),
          CometChatUIKitConstants.MessageTypes.groupMember,
          CometChatUIKitConstants.MessageReceiverType.group,
          CometChatUIKitConstants.MessageCategory
            .action as CometChat.MessageCategory
        );
        actionMessage.setAction(action);
        actionMessage.setActionBy(CometChatUIKitUtility.clone(loggedInUser));
        actionMessage.setActionFor(CometChatUIKitUtility.clone(group));
        actionMessage.setActionOn(CometChatUIKitUtility.clone(loggedInUser));
        actionMessage.setReceiver(CometChatUIKitUtility.clone(group));
        actionMessage.setSender(CometChatUIKitUtility.clone(loggedInUser));
        actionMessage.setConversationId("group_" + group.getGuid());
        actionMessage.setMuid(CometChatUIKitUtility.ID());
        actionMessage.setMessage(
          `${loggedInUser.getName()} ${action} ${loggedInUser.getUid()}`
        );
        actionMessage.setSentAt(CometChatUIKitUtility.getUnixTimestamp());
        return actionMessage;
      },
      []
    );
    function leaveGroupView() {
      return (
        <>
          <div className="cometchat-leave-group__backdrop">
            <CometChatConfirmDialog
              title={getLocalizedString("leave_group")}
              messageText={getLocalizedString("confirm_leave_group")}
              confirmButtonText={getLocalizedString("leave")}
              onCancelClick={() => {
                setShowLeaveGroup(!showLeaveGroup);
              }}
              onSubmitClick={() => {
                return new Promise((resolve, reject) => {
                  CometChat.leaveGroup(group.getGuid())
                    .then(() => {
                      let loggedInUser =
                        CometChatUIKitLoginListener.getLoggedInUser();
                      if (loggedInUser) {
                        const groupClone = CometChatUIKitUtility.clone(group);
                        groupClone.setHasJoined(false);
                        groupClone.setMembersCount(
                          groupClone.getMembersCount() - 1
                        );
                        CometChatGroupEvents.ccGroupLeft.next({
                          userLeft: CometChatUIKitUtility.clone(loggedInUser),
                          leftGroup: groupClone,
                          message: createGroupMemberLeftActionMessage(
                            groupClone,
                            loggedInUser
                          ),
                        });
                      }
                      setAppState({
                        type: "updateSideComponent",
                        payload: { visible: false, type: "" },
                      });
                      setSelectedItem(undefined);
                      setShowLeaveGroup(!showLeaveGroup);
                      toastTextRef.current = getLocalizedString("group_left");
                      setShowToast(true);
                      return resolve();
                    })
                    .catch(() => {
                      return reject();
                    });
                });
              }}
            />
          </div>
        </>
      );
    }

    const onDeleteGroupConversationClicked: () => Promise<void> = () => {
      const GUID = group.getGuid();
      return new Promise(async (resolve, reject) => {
        CometChat.deleteConversation(
          GUID,
          CometChatUIKitConstants.MessageReceiverType.group
        ).then(
          (deletedConversation) => {
            setSelectedItem(undefined);
            setAppState({
              type: "updateSideComponent",
              payload: { visible: false, type: "" },
            });
            CometChatConversationEvents.ccConversationDeleted.next(
              currentChatRef.current ?? (selectedItem as Conversation)!
            );
            currentChatRef.current = null;
            return resolve();
          },
          (error) => {
            return reject();
          }
        );
      });
    };

    const getDeleteConversationConfirmationView = () => {
      return (
        <>
          <div className="cometchat-delete-chat-dialog__backdrop">
            <CometChatConfirmDialog
              title={getLocalizedString("delete_chat")}
              messageText={getLocalizedString("confirm_delete_chat")}
              confirmButtonText={getLocalizedString(
                "conversation_delete_title"
              )}
              onCancelClick={() => {
                setShowDeleteGroupChatDialog(!showDeleteGroupChatDialog);
              }}
              onSubmitClick={onDeleteGroupConversationClicked}
            />
          </div>
        </>
      );
    };

    return (
      <>
        <div className="side-component-header">
          <div className="side-component-header__text">
            {getLocalizedString("group_info")}
          </div>
          <div
            className="side-component-header__icon"
            onClick={() =>
              setAppState({
                type: "updateSideComponent",
                payload: { visible: false, type: "" },
              })
            }
          />
        </div>
        <div className="side-component-content">
          <div className="side-component-content__group">
            <div className="side-component-content__avatar">
              <CometChatAvatar
                image={group?.getIcon()}
                name={group?.getName()}
              />
            </div>
            <div>
              <div className="side-component-content__title">
                {group?.getName()}
              </div>
              <div className="side-component-content__description">
                {group?.getMembersCount?.() +
                  " " +
                  getLocalizedString("group_members")}
              </div>
            </div>
          </div>

          <div className="side-component-content__action">
            {actionItems.map((actionItem, index) =>
              actionItem.isAllowed() ? (
                <div
                  key={actionItem.name + index}
                  className={`side-component-content__action-item ${
                    appState.isFreshChat && actionItem.id === "delete_chat"
                      ? "side-component-content__action-item-disabled"
                      : ""
                  } `}
                  onClick={() => {
                    if (actionItem.onClick) {
                      actionItem.onClick();
                    }
                  }}
                >
                  <div
                    className={
                      actionItem.type === "alert"
                        ? "side-component-content__action-item-icon"
                        : "side-component-content__action-item-icon-default"
                    }
                    style={
                      actionItem.icon
                        ? {
                            WebkitMask: `url(${actionItem.icon}) center center no-repeat`,
                          }
                        : undefined
                    }
                  />
                  <div
                    className={
                      actionItem.type === "alert"
                        ? "side-component-content__action-item-text"
                        : "side-component-content__action-item-text-default"
                    }
                  >
                    {actionItem.name}
                  </div>
                </div>
              ) : null
            )}
          </div>
          {group.getScope() !=
          CometChatUIKitConstants.groupMemberScope.participant ? (
            <div className="side-component-group-tabs-wrapper">
              <div className="side-component-group-tabs">
                <div
                  className={`side-component-group-tabs__tab ${
                    groupTab === "view"
                      ? "side-component-group-tabs__tab-active"
                      : ""
                  }`}
                  onClick={() => setGroupTab("view")}
                >
                  <div
                    className={`side-component-group-tabs__tab-text ${
                      groupTab === "view"
                        ? "side-component-group-tabs__tab-text-active"
                        : ""
                    }`}
                  >
                    {getLocalizedString("view_members")}
                  </div>
                </div>
                <div
                  className={`side-component-group-tabs__tab ${
                    groupTab === "banned"
                      ? "side-component-group-tabs__tab-active"
                      : ""
                  }`}
                  onClick={() => {
                    setGroupTab("banned");
                  }}
                >
                  <div
                    className={`side-component-group-tabs__tab-text ${
                      groupTab === "banned"
                        ? "side-component-group-tabs__tab-text-active"
                        : ""
                    }`}
                  >
                    {getLocalizedString("banned_members")}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        {showDeleteGroupChatDialog && getDeleteConversationConfirmationView()}
        {showLeaveGroup ? leaveGroupView() : null}

        {showTransferownershipDialog ? transferOwnershipDialogView() : null}
      </>
    );
  };

  const SideComponentThread = (props: ThreadProps) => {
    const { message } = props;

    const [requestBuilderState, setRequestBuilderState] =
      useState<MessagesRequestBuilder>();
    const [showComposer, setShowComposer] = useState(true);

    const requestBuilder = useCallback(() => {
      const threadMessagesBuilder = new CometChat.MessagesRequestBuilder()
        .setCategories(CometChatUIKit.getDataSource().getAllMessageCategories())
        .setTypes(CometChatUIKit.getDataSource().getAllMessageTypes())
        .hideReplies(true)
        .setLimit(20)
        .setParentMessageId(message.getId());
      setRequestBuilderState(threadMessagesBuilder);
    }, [message]);

    useEffect(() => {
      requestBuilder();
      let user: CometChat.User | null = null;

      if (selectedItem instanceof CometChat.User) {
        user = selectedItem;
      } else if (
        selectedItem instanceof CometChat.Conversation &&
        selectedItem?.getConversationType() === CometChat.RECEIVER_TYPE.USER &&
        selectedItem?.getConversationWith() instanceof CometChat.User
      ) {
        user = selectedItem.getConversationWith() as CometChat.User;
      }

      if (user?.getBlockedByMe()) {
        setShowComposer(false);
      }
      const ccUserBlocked = CometChatUserEvents.ccUserBlocked.subscribe(
        (user) => {
          if (user.getBlockedByMe()) {
            setShowComposer(false);
          }
          updateUserAfterBlockUnblock(user);
        }
      );
      const ccUserUnblocked = CometChatUserEvents.ccUserUnblocked.subscribe(
        (user) => {
          if (!user.getBlockedByMe()) {
            setShowComposer(true);
          }
          updateUserAfterBlockUnblock(user);
        }
      );

      return () => {
        ccUserBlocked?.unsubscribe();
        ccUserUnblocked?.unsubscribe();
      };
    }, [message]);

    const onClose = () =>
      setAppState({
        type: "updateSideComponent",
        payload: { visible: false, type: "" },
      });

    return (
      <CometChatThreadedMessages
        message={message}
        requestBuilderState={requestBuilderState}
        selectedItem={selectedItem}
        onClose={onClose}
        showComposer={showComposer}
      />
    );
  };

  useEffect(() => {
    if (newChat) {
      const convId = newChat.user?.getUid() || newChat.group?.getGuid();
      const convType = newChat.user
        ? CometChatUIKitConstants.MessageReceiverType.user
        : CometChatUIKitConstants.MessageReceiverType.group;
      CometChat.getConversation(convId!, convType).then(
        (conversation) => {
          setSelectedItem(conversation);
        },
        (error) => {
          setSelectedItem(undefined);
        }
      );
    }
  }, [newChat, newChat?.user, newChat?.group]);

  const onSelectorItemClicked = (
    e: Conversation | User | Group | Call,
    type: string
  ) => {
    setShowNewChat(false);
    if (type === "updateSelectedItemGroup" && !(e as Group).getHasJoined()) {
      if (
        (e as Group).getType() === CometChatUIKitConstants.GroupTypes.public
      ) {
        CometChat.joinGroup(
          (e as Group).getGuid(),
          (e as Group).getType() as GroupType
        )
          .then((response: any) => {
            setAppState({
              type: "updateSideComponent",
              payload: { visible: false, type: "" },
            });
            setNewChat(undefined);
            response.setHasJoined?.(true);
            response.setScope?.(
              CometChatUIKitConstants.groupMemberScope.participant
            );
            setSelectedItem(response as Group);
            setAppState({ type, payload: response });
            setTimeout(() => {
              CometChatGroupEvents.ccGroupMemberJoined.next({
                joinedGroup: response,
                joinedUser: loggedInUser!,
              });
            }, 100);
          })
          .catch((error: unknown) => {});
      } else {
        setAppState({
          type: "updateSideComponent",
          payload: { visible: false, type: "" },
        });
        setNewChat(undefined);
        setGroup(e as Group);
        setAppState({ type, payload: e });
        showJoinGroupRef.current = true;
      }
    } else {
      setAppState({
        type: "updateSideComponent",
        payload: { visible: false, type: "" },
      });
      setNewChat(undefined);
      setAppState({ type, payload: e });
      setSelectedItem(
        activeTab === "chats"
          ? (e as Conversation)
          : activeTab === "users"
          ? (e as User)
          : activeTab === "groups"
          ? (e as Group)
          : activeTab === "calls"
          ? (e as Call)
          : undefined
      );
    }
  };

  const subscribeToEvents = useCallback(() => {
    const ccConversationDeleted =
      CometChatConversationEvents.ccConversationDeleted.subscribe(
        (conversation: Conversation) => {
          if (
            newChat?.user &&
            conversation?.getConversationType() ===
              CometChatUIKitConstants.MessageReceiverType.user
          ) {
            if (
              (conversation.getConversationWith() as User).getUid() ===
              newChat.user.getUid()
            ) {
              setNewChat(undefined);
              setAppState({ type: "newChat", payload: undefined });
              setSelectedItem(undefined);
              setAppState({ type: "updateSelectedItem", payload: undefined });
            }
          } else if (
            newChat?.group &&
            conversation?.getConversationType() ===
              CometChatUIKitConstants.MessageReceiverType.group
          ) {
            if (
              (conversation.getConversationWith() as Group).getGuid() ===
              newChat.group.getGuid()
            ) {
              setNewChat(undefined);
              setAppState({ type: "newChat", payload: undefined });
              setSelectedItem(undefined);
              setAppState({ type: "updateSelectedItem", payload: undefined });
            }
          } else {
            if (
              (
                selectedItem as CometChat.Conversation
              )?.getConversationId?.() === conversation?.getConversationId?.()
            ) {
              setSelectedItem(undefined);
              setAppState({ type: "updateSelectedItem", payload: undefined });
            }
          }
        }
      );

    const ccOpenChat = CometChatUIEvents.ccOpenChat.subscribe((item) => {
      openChatForUser(item.user);
    });
    const ccGroupJoineed = CometChatGroupEvents.ccGroupMemberJoined.subscribe(
      (data: IGroupMemberJoined) => {
        setGroup(data.joinedGroup);
        setSelectedItem(data.joinedGroup);
        setAppState({
          type: "updateSelectedItemGroup",
          payload: data.joinedGroup,
        });
      }
    );

    const ccClickEvent = CometChatUIEvents.ccMouseEvent.subscribe(
      (mouseevent: IMouseEvent) => {
        if (
          mouseevent.event.type === "click" &&
          (mouseevent.body as { CometChatUserGroupMembersObject: User })
            ?.CometChatUserGroupMembersObject
        ) {
          openChatForUser(
            (mouseevent.body as { CometChatUserGroupMembersObject: User })
              ?.CometChatUserGroupMembersObject
          );
        }
      }
    );

    const openChatForUser = (user?: User) => {
      const uid = user?.getUid();
      if (uid) {
        setAppState({
          type: "updateSideComponent",
          payload: { visible: false, type: "" },
        });
        if (activeTab === "chats") {
          CometChat.getConversation(
            uid!,
            CometChatUIKitConstants.MessageReceiverType.user
          ).then(
            (conversation) => {
              setNewChat(undefined);
              setSelectedItem(conversation);
              setAppState({
                type: "updateSelectedItem",
                payload: conversation,
              });
            },
            (error) => {
              setNewChat({ user, group: undefined });
              setSelectedItem(undefined);
            }
          );
        } else if (activeTab === "users") {
          setNewChat(undefined);
          setSelectedItem(user);
          setAppState({ type: "updateSelectedItemUser", payload: user });
        } else if (activeTab === "groups") {
          setNewChat({ user, group: undefined });
          setSelectedItem(undefined);
        }
      }
    };

    return () => {
      ccConversationDeleted?.unsubscribe();
      ccOpenChat?.unsubscribe();
      ccClickEvent?.unsubscribe();
      ccGroupJoineed?.unsubscribe();
    };
  }, [newChat, selectedItem]);

  const attachSDKGroupListener = () => {
    const listenerId =
      "BannedOrKickedMembers_GroupListener_" + String(Date.now());
    CometChat.addGroupListener(
      listenerId,
      new CometChat.GroupListener({
        onGroupMemberBanned: (
          message: CometChat.Action,
          kickedUser: CometChat.User,
          kickedBy: CometChat.User,
          kickedFrom: CometChat.Group
        ) => {
          if (
            ((selectedItem as Group).getGuid?.() === kickedFrom.getGuid() ||
              (
                (selectedItem as Conversation).getConversationWith?.() as Group
              )?.getGuid?.() === kickedFrom.getGuid()) &&
            kickedUser.getUid() === loggedInUser?.getUid()
          ) {
            setShowAlertPopup({
              visible: true,
              description: getLocalizedString("member_banned"),
            });
          }
        },
        onGroupMemberKicked: (
          message: CometChat.Action,
          kickedUser: CometChat.User,
          kickedBy: CometChat.User,
          kickedFrom: CometChat.Group
        ) => {
          if (
            ((selectedItem as Group).getGuid?.() === kickedFrom.getGuid() ||
              (
                (selectedItem as Conversation).getConversationWith?.() as Group
              )?.getGuid?.() === kickedFrom.getGuid()) &&
            kickedUser.getUid() === loggedInUser?.getUid()
          ) {
            setShowAlertPopup({
              visible: true,
              description: getLocalizedString("member_removed"),
            });
          }
        },
      })
    );
    return () => CometChat.removeGroupListener(listenerId);
  };

  useEffect(() => {
    if (loggedInUser) {
      const unsubscribeFromEvents = subscribeToEvents();
      const unsubscribeFromGroupEvents = attachSDKGroupListener();
      return () => {
        unsubscribeFromEvents();
        unsubscribeFromGroupEvents();
      };
    }
  }, [loggedInUser, subscribeToEvents, attachSDKGroupListener]);

  const removedFromGroup = () => {
    setShowAlertPopup({ visible: false, description: "" });
    setSelectedItem(undefined);
    setAppState({ type: "updateSelectedItem", payload: undefined });
    setAppState({
      type: "updateSideComponent",
      payload: { visible: false, type: "" },
    });
  };
  function closeToast() {
    setShowToast(false);
  }

  const getActiveItem = () => {
    if (!selectedItem) return undefined;

    if (
      (activeTab === "chats" &&
        selectedItem instanceof CometChat.Conversation) ||
      (activeTab === "users" && selectedItem instanceof CometChat.User)
    ) {
      return selectedItem;
    }

    return undefined;
  };
  const activeItemmain: any = getActiveItem();
  useEffect(() => {
    const fetchData = async () => {
      const mainid: any = localStorage.getItem("switching_user");

      if (activeItemmain) {
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
          // const waifuUsers: User[] = res.data.data.map((u: any) => ({
          //   id: u.uid.replace("users_", ""),
          //   name: u.name,
          //   avatar: u.avatar,
          //   unread: 0,
          // }));
          const cached = localStorage.getItem("waifu_unread_counts");

          if (cached) {
            try {
              const { data, timestamp } = JSON.parse(cached);
              if (Date.now() - timestamp < 30000) {
                setUsers((prev: any) =>
                  prev.map((u: any) => ({ ...u, unread: data[u.id] || 0 }))
                );
                return;
              }
            } catch {}
          }
        } catch {
          //
        }
      }
    };

    fetchData();
  }, [activeItemmain]);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileback(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchConversations = async () => {
      try {
        // Reduce initial limit for faster loading
        const limit = 10;
        const conversationsRequest = new CometChat.ConversationsRequestBuilder()
          .setLimit(limit)
          .build();

        const conversationList = await conversationsRequest.fetchNext();

        // Check if component is still mounted to avoid state updates after unmount
        if (!isMounted) return;

        if (conversationList && conversationList.length > 0) {
          const firstConversation = conversationList[0];
          const conversationWith = firstConversation.getConversationWith();

          if (conversationWith instanceof CometChat.User) {
            const role = loggedInUser?.getRole();
            if (role === "subscriber") {
              if (conversationWith.getUid() !== loggedInUser?.getUid()) {
                setSelectedItem(firstConversation);
              }
            } else {
              setSelectedItem(undefined);
            }
          } else if (conversationWith instanceof CometChat.Group) {
            setSelectedItem(firstConversation);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error while setting default selectedItem:", err);
        }
      }
    };

    if (
      (selectedItem === null || selectedItem === undefined) &&
      loggedInUser &&
      isMobileback !== true
    ) {
      // Add small delay to allow UI to render first
      const timeoutId = setTimeout(fetchConversations, 100);
      return () => {
        clearTimeout(timeoutId);
        isMounted = false;
      };
    }

    return () => {
      isMounted = false;
    };
  }, [selectedItem, loggedInUser, isMobileback]);

  // Reset mobile back flag when screen resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileback(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const SideComponentWrapper = useMemo(() => {
    return <SideComponent />;
  }, [appState.sideComponent]);

  const [selectedTag, setSelectedTag] = useState<string>("");

  return (
    loggedInUser && (
      <div
        className="cometchat-root"
        data-theme={theme}
        style={{
          height: "100vh",
          // height: isIOS() ? 'calc(var(--vh, 1vh) * 100)' : '100vh',
          WebkitOverflowScrolling: "touch",
        }}
      >
        {isLoading && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(255, 255, 255, 0.9)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
              backdropFilter: "blur(5px)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #1CBD43",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            ></div>
            <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
          </div>
        )}
        {showAlertPopup.visible && (
          <CometChatAlertPopup
            onConfirmClick={removedFromGroup}
            title={getLocalizedString("no_longer_part_of_group")}
            description={`${getLocalizedString("you_have_been")} ${
              showAlertPopup.description
            } ${getLocalizedString("removed_by_admin")}`}
          />
        )}
        <div
          className="conversations-wrapper"
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="selector-wrapper">
            {
              <CometChatSelector
                activeItem={getActiveItem()}
                activeTab={activeTab}
                group={group}
                selectedUserUuid={props.selectedUserUuid}
                onProtectedGroupJoin={(group) => setSelectedItem(group)}
                onSelectorItemClicked={onSelectorItemClicked}
                setShowCreateGroup={setShowCreateGroup}
                showCreateGroup={showCreateGroup}
                showJoinGroup={showJoinGroupRef.current}
                onHide={() => (showJoinGroupRef.current = false)}
                onNewChatClicked={() => {
                  setShowNewChat(true);
                  setAppState({
                    type: "updateSideComponent",
                    payload: { type: "", visible: false },
                  });
                }}
                onGroupCreated={(group) => {
                  setAppState({
                    type: "updateSideComponent",
                    payload: { visible: false, type: "" },
                  });
                  setSelectedItem(group);
                }}
                selectedTag={selectedTag}
                setSelectedTag={setSelectedTag}
              />
            }
          </div>
          <TabComponent />
        </div>
        <div
          className="messages-wrapper"
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >
          <InformationComponent />
        </div>
        {SideComponentWrapper}
        {/* Temporarily disable incoming call component to prevent sounds */}
        {/* <CometChatIncomingCall /> */}
        {showToast ? (
          <CometChatToast text={toastTextRef.current} onClose={closeToast} />
        ) : null}
      </div>
    )
  );
}

export { CometChatHome };
