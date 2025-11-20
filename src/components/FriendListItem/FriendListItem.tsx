import { Friend } from "../CometChatSelector/CometChatSelector";

type Props = {
    friend: Friend;
    onClick: (friend: Friend) => void;
  };

const FriendListItem = ({ friend, onClick }: Props) => {
  return (
    <div
      onClick={() => onClick(friend)}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px",
        cursor: "pointer",
        borderBottom: "1px solid #eee",
      }}
    >
      <img
        src={friend.avatar || "https://via.placeholder.com/40"}
        alt={friend.name}
        style={{ width: 40, height: 40, borderRadius: "50%", marginRight: 10 }}
      />
      <div>          
        <div style={{ fontWeight: "bold" }}>{friend.name}</div>
        <div style={{ fontSize: 12, color: "#888", display:"flex",justifyContent:"start " }}>{friend.status}</div>
      </div>
    </div>
  );
};

export default FriendListItem;
