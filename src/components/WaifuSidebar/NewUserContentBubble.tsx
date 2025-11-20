
interface INewUserBubbleProps {
    unreadCount: number;
    newContentCount: number
}
const NewUserContentBubble = ({ unreadCount, newContentCount }: INewUserBubbleProps) => {
    return (
        <div>
            <span
                style={{
                    position: "absolute",
                    top: unreadCount > 0 ? 22 : 0,
                    right: 0,
                    transform: "translate(50%, -50%)",
                    backgroundColor: "blue",
                    color: "#fff",
                    minWidth: 20,
                    height: 20,
                    padding: "0 6px",
                    borderRadius: 9999,
                    border: "2px solid #fff",
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: "center",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    zIndex: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {newContentCount}
            </span>
        </div>
    )
}

export default NewUserContentBubble
