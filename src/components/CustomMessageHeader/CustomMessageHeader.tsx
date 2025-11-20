import { CometChat } from "@cometchat/chat-sdk-javascript";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { OppaiDragonUserRole } from "../../constant/AppUserRole";
import { CometChatAvatar } from "@cometchat/chat-uikit-react";
import "../../components/CustomMessageHeader/CustomMessageHeader.css";
import main_logo from '../../assets/main_logo.svg'

export const CustomMessageHeader = ({ user, group, headerMenu, onBack,showSideComponent }: {
    user?: CometChat.User;
    group?: CometChat.Group;
    headerMenu: () => JSX.Element;
    showSideComponent?: any;
    onBack?: () => void;
}) => {
    const [loggedInUser, setLoggedInUser] = useState<CometChat.User | null>(null);

    useEffect(() => {
        const getLoggedInUser = async () => {
            try {
                const user = await CometChat.getLoggedinUser();
                setLoggedInUser(user);
            } catch (error) {
               //console.log("Error fetching logged in user:", error);
            }
        };
        getLoggedInUser();
    }, []);

    const formatLastActiveTime = (lastActiveAt?: number) => {
        if (!lastActiveAt) return "Last seen a while ago";
        
        const lastActiveTime = dayjs(lastActiveAt * 1000);
        const now = dayjs();
        
        // Convert to US timezone (Eastern Time)
        const lastActiveUS = lastActiveTime.tz('America/New_York');
        const nowUS = now.tz('America/New_York');
        
        const diffInHours = nowUS.diff(lastActiveUS, 'hour');
        const diffInMinutes = nowUS.diff(lastActiveUS, 'minute');
        
        if (diffInMinutes < 1) {
            return "Online";
        } else if (diffInMinutes < 60) {
            return `Last seen ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        } else if (diffInHours < 24) {
            return `Last seen ${lastActiveUS.format('h:mm A')}`;
        } else {
            return `Last seen ${lastActiveUS.format('MMMM D, h:mm A')}`;
        }
    };

    const getDisplayName = () => {
        if (user) return user.getName();
        if (group) return group.getName();
        return "";
    };

    const getLastActiveTime = () => {
        if (user?.getLastActiveAt()) {
            return formatLastActiveTime(user.getLastActiveAt());
        }
        return "";
    };

    const handleLogoClick = () => {
        window.open('/account', '_blank', 'noopener,noreferrer');
    };
    const userRole1 = window.localStorage.getItem("userRole");


    return (
        <div className="custom-message-header">
            <div className="custom-message-header__left" onClick={handleLogoClick}>
                <img
                    src={main_logo}
                    alt="Oppai Dragon"
                    className="custom-message-header__logo"
                />
            </div>

            <div className="custom-message-header__center">
                <div className="custom-message-header__name">{getDisplayName()}</div>
                {user && (
                    <div className="custom-message-header__last-active">
                        {getLastActiveTime()}
                    </div>
                )}
            </div>

            <div className="custom-message-header__right">
                {user && (
                    <div className="custom-message-header__avatar" onClick={showSideComponent} style={{ cursor: 'pointer' }}>
                        <CometChatAvatar 
                            image={user.getAvatar()} 
                            name={user.getName()} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
};