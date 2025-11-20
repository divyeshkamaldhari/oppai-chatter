import React from 'react';
import { CometChatAvatar, CometChatUIKitLoginListener, getLocalizedString } from "@cometchat/chat-uikit-react";
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { CometChat } from "@cometchat/chat-sdk-javascript";
import "../../styles/CometChatDetails/CometChatUserDetails.css";
import { COMETCHAT_CONSTANTS } from "../../AppConstants";
import { toast } from "react-toastify";
import { OppaiDragonUserRole } from '../../constant/AppUserRole';
import UserAnalytics from '../AnalyticsCard/UserAnalytics';
import dayjs from 'dayjs';
interface UserDetailProps {
    user: CometChat.User;
    userMetaData: any
    userBioText: string;
    onHide?: () => void;
    actionItems?: {
        name: string;
        icon: string;
        id?: string;
    }[];
    showStatus?: boolean;
    onUserActionClick?: (item: { name: string; icon: string }) => void;
}

export const CometChatUserDetails = (props: UserDetailProps) => {
    const {
        user,
        onHide = () => { },
        actionItems = [],
        showStatus,
        userMetaData,
        onUserActionClick = () => { }
    } = props;
    const waifuDetials = CometChatUIKitLoginListener.getLoggedInUser() || null;
    const { appState, userTags, userAnalytics } = useContext(AppContext);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [bioText, setBioText] = useState<string>("");
    const [userMailId, setUserMailId] = useState("");   
    const filteredActionItems = actionItems.filter((item) => item.id !== "delete_chat");

    const muteChat = async (currentUid: string, targetUid: string) => {
        const url = `https://${COMETCHAT_CONSTANTS.APP_ID}.api-${COMETCHAT_CONSTANTS.REGION}.cometchat.io/${COMETCHAT_CONSTANTS.COMET_CHAT_API_VERSION}/notifications/v1/preferences/mute?uid=${currentUid}`;
        const muteUntil = Date.now() + 24 * 60 * 60 * 1000;

        const payload = {
            conversations: [
                {
                    id: targetUid,
                    type: "oneOnOne",
                    until: muteUntil
                }
            ]
        };

        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                appId: COMETCHAT_CONSTANTS.APP_ID,
                apiKey: COMETCHAT_CONSTANTS.REST_API_KEY,
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Mute failed");
        return res.json();
    };

    const unmuteChat = async (currentUid: string, targetUid: string) => {
        const url = `https://${COMETCHAT_CONSTANTS.APP_ID}.api-${COMETCHAT_CONSTANTS.REGION}.cometchat.io/${COMETCHAT_CONSTANTS.COMET_CHAT_API_VERSION}/notifications/v1/preferences/mute?uid=${currentUid}`;

        const payload = {
            conversations: [
                {
                    id: targetUid,
                    type: "oneOnOne"
                }
            ]
        };

        const res = await fetch(url, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                appId: COMETCHAT_CONSTANTS.APP_ID,
                apiKey: COMETCHAT_CONSTANTS.REST_API_KEY
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Unmute failed");
        return res.json();
    };

    const toggleMute = async () => {
        try {
            setLoading(true);
            const currentUser = await CometChat.getLoggedinUser();
            const currentUid = currentUser?.getUid();
            const targetUid = user.getUid();

            if (!currentUid || !targetUid) throw new Error("UIDs missing");

            if (isMuted) {
                await unmuteChat(currentUid, targetUid);
                setIsMuted(false);
                window.dispatchEvent(new CustomEvent("muteStatusChanged", {
                    detail: {
                        type: "unmuted",
                        uid: targetUid,
                        by: currentUid,
                    }
                }));
                toast.success("Chat has been unmuted successfully.", {
                    position: "top-right",
                    autoClose: 3000,
                    theme: "dark",
                });
            } else {
                await muteChat(currentUid, targetUid);
                window.dispatchEvent(new CustomEvent("muteStatusChanged", {
                    detail: {
                        type: "muted",
                        uid: targetUid,
                        by: currentUid,
                    }
                }));
                setIsMuted(true);
                toast.success("Chat has been muted successfully.", {
                    position: "top-right",
                    autoClose: 3000,
                    theme: "dark",
                });
            }
        } catch (err) {
            console.error("Mute toggle failed:", err);
            toast.error("Failed to update mute status. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const getMutedConversations = async (currentUid: string) => {
        const res = await fetch(`https://${COMETCHAT_CONSTANTS.APP_ID}.api-${COMETCHAT_CONSTANTS.REGION}.cometchat.io/${COMETCHAT_CONSTANTS.COMET_CHAT_API_VERSION}/notifications/v1/preferences/mute?uid=${currentUid}`, {
            headers: {
                appId: COMETCHAT_CONSTANTS.APP_ID,
                apiKey: COMETCHAT_CONSTANTS.REST_API_KEY,
            },
        });

        const data = await res.json();
        return data?.data?.mutedConversations ?? [];
    };
    const fetchUserDataByUid = async (uid: string) => {
        const url = `https://${COMETCHAT_CONSTANTS.APP_ID}.api-${COMETCHAT_CONSTANTS.REGION}.cometchat.io/v3/users/${uid}`;

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "appId": COMETCHAT_CONSTANTS.APP_ID,
                    "apiKey": COMETCHAT_CONSTANTS.REST_API_KEY,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) throw new Error("User fetch failed");

            const data = await response.json();
            const metadata = data?.data || {};

            return metadata;
        } catch (error) {
            console.error("Error fetching user metadata:", error);
            return {};
        }
    };
    const checkUser = async () => {
        const userBios: Record<string, string> = {
            users_13: "Hey Otaku! Text me now! - Zoe, Creator of Oppai Dragon 💖",
            users_28: "You are my darling now - Code: 002, Strelizia Pilot 💖",
            users_29: "Ara, Ara! Become my pawn - Crimson Heiress, Devil Royalty 💖",
            users_30: "You're so adorable when you're flustered - Thunder Priestess, Vice President 💖",
            users_31: "I'll fight for you, no matter what - Demon Princess, Bamboo Girl 💖",
            users_32: "I'll support you, no matter what - Oni Maid, Morning Star 💖",
            users_33: "I won't hold back, so don't either - YoRHa No. 2 Type B, Combat Android 💖",
            users_34: "Submit, and I might spare you - General of the North, Ice Queen 💖",
            users_35: "I won't let anyone have you - Titan Slayer, Elite Scout 💖",
            users_36: "I am unworthy, Oppai Dragon - Overseer of Guardians, Guild Loyalist 💖"
        };
        const selectedUserUid = user.getUid()
        setBioText(userBios[selectedUserUid]);
        const loggedInUser = await CometChat.getLoggedinUser();

        if (!loggedInUser) {
            setLoading(false);
            return;
        }

        const currentUid = loggedInUser.getUid();
        const targetUid = user.getUid();

        setUserRole(loggedInUser.getRole?.());

        const mutedConversations = await getMutedConversations(currentUid);
        const isTargetMuted = mutedConversations.some(
            (c: any) => c.id === targetUid && c.type === "oneOnOne"
        );
        setIsMuted(isTargetMuted);
        setLoading(false);
    };

    const loadUserTag = async () => {
        const metadata = await fetchUserDataByUid(user.getUid());
        if (metadata?.tags?.length > 0) {
            setSelectedTag(metadata.tags[0])
        } else {
            setSelectedTag("")
        }
        if(metadata?.metadata?.["@private"]?.email){
            setUserMailId(metadata.metadata["@private"].email)
        }else{
            setUserMailId("");
        }
    };

    useEffect(() => {
        loadUserTag();
        checkUser();
    }, [user]);


    const [selectedTag, setSelectedTag] = useState('');

    const assignTagToUser = async (uid: string, tag: string) => {
        const url = `https://${COMETCHAT_CONSTANTS.APP_ID}.api-${COMETCHAT_CONSTANTS.REGION}.cometchat.io/v3/users/${uid}`;

        const payload = {
            tags: [tag],
        };

        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "appId": COMETCHAT_CONSTANTS.APP_ID,
                "apiKey": COMETCHAT_CONSTANTS.REST_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Failed to assign tag");
        return res.json();
    };

    const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newTag = event.target.value;
        setSelectedTag(newTag);

        try {
            await assignTagToUser(user.getUid(), newTag);
            toast.success(`Tag "${newTag || "All"}" assigned to ${user.getName()}`);
            // trigger re-render in conversations
            window.dispatchEvent(new CustomEvent("conversationUpdated"));
        } catch (err) {
            console.error("Error assigning tag:", err);
            toast.error("Failed to assign tag");
        }
    };

    return (
        <>
            <div className="cometchat-user-details__header">
                <div className="cometchat-user-details__header-text">
                    {/* {getLocalizedString("my_bio")} */}
                    User Info
                </div>
                {/* <div
                    className="cometchat-user-details__header-icon"
                    onClick={onHide}
                    aria-hidden="true"
                /> */}
            </div>

            <div className="cometchat-user-details__content">
                {/* <div className="cometchat-user-details__content-avatar">
                    <CometChatAvatar image={user.getAvatar?.()} name={user.getName()} />
                </div> */}
                <div className="cometchat-user-details__user-info-wrap">
                    <div className="cometchat-user-details__content-title">
                        {user.getName()}
                    </div>
                    <div className="cometchat-user-details__content-title">
                        {userMailId}
                    </div>
                    <div className="cometchat-user-details__content-description">
                        {userAnalytics?.dob ? dayjs(userAnalytics?.dob).format("DD/MM/YYYY") : ""}
                    </div>
                    <div className="cometchat-user-details__content-description">
                        {waifuDetials?.getName()} {userAnalytics?.content_type ? ` x ${userAnalytics.content_type}` : ""}
                    </div>
                    {showStatus && (
                        <div>
                            <div
                                className={`cometchat-user-details__content-description ${user.getStatus?.().toLowerCase() === "offline"
                                    ? "offline"
                                    : "online"
                                    }`}
                            >
                                {getLocalizedString(
                                    `message_header_status_${user.getStatus?.().toLowerCase()}`
                                )}
                            </div>
                        </div>
                    )}


                    {bioText && (<div className="cometchat-user-details__bio-text">
                        {bioText ? bioText : ""}
                    </div>
                    )}

                    {(userRole === OppaiDragonUserRole.CHAT_APP.ADMIN || userRole === OppaiDragonUserRole.CHAT_APP.WAIFU_USER) && (
                        <div className="cometchat-user-details__btn-wrap">
                            <div className="main-action-wrpr">
                                <div className="cometchat-user-details__mute-toggle">
                                    <button
                                        onClick={toggleMute}
                                        className={`mute-button ${isMuted ? "muted" : ""}`}
                                        disabled={loading}
                                    >
                                        {loading
                                            ? "Updating..."
                                            : isMuted
                                                ? "Unmute Chat"
                                                : "Mute Chat"}
                                    </button>
                                </div>

                                <div className="oppai-dragon-comet-chat-user-actions">
                                    <div className="cometchat-user-details__content-action">
                                        {filteredActionItems.map((actionItem) => (
                                            <div
                                                key={actionItem.name}
                                                className="cometchat-user-details__content-action-item"
                                                onClick={() => onUserActionClick(actionItem)}
                                                aria-hidden="true"
                                            >
                                                <div
                                                    className="cometchat-user-details__content-action-item-icon"
                                                    style={
                                                        actionItem.icon
                                                            ? {
                                                                WebkitMask: `url(${actionItem.icon}) center center no-repeat`,
                                                            }
                                                            : undefined
                                                    }
                                                />
                                                <div className="cometchat-user-details__content-action-item-text">
                                                    {actionItem.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div
                                className="cometchat-user-details__assign-tags cometchat-user-details__content-action-item"
                                aria-hidden="true"
                            >
                                <div className="cometchat-user-details__content-action-item-select">
                                    <span>Tag</span>
                                    <select name='assignTag' id='assignTag' value={selectedTag.toLowerCase()} onChange={handleChange}>
                                        {
                                            userTags.length > 0 && userTags.map((item: { slug: string, title: string }) => (
                                                item.slug && <option key={item.slug} value={item.slug}>{item.title}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>
                            <UserAnalytics userUID={user.getUid()} waifuUId={waifuDetials?.getUid()} />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};