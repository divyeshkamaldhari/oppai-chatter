import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import "../../styles/AnalyticsCard/UserAnalytics.css";
import { toast } from "react-toastify";
import deleteIcon from "../../assets/white-MaterialSymbolsDeleteOutlineRounded.svg";
import editIcon from "../../assets/White-MaterialSymbolsEditOutlineRounded.svg";
import cancelIcon from "../../assets/white-MaterialSymbolsCloseRounded.svg";
import saveIcon from "../../assets/white-MaterialSymbolsSaveRounded.svg";
import UserPurchases from "./UserPurchases";
import { BACKEND_API_URL, X_Auth_Token } from "../../constant/AppUserRole";

type Note = {
  id: string | number;
  note: string;
  created_at: string;
};

type UserAnalyticsType = {
  total_spent: number;
  spend_content: number;
  spend_gifts: number;
  purchase_count: number;
  notes?: Note[];
};

type Props = {
  userUID: any;
  waifuUId: any;
};

const UserAnalytics = ({ userUID, waifuUId }: Props) => {
  const userID = Number(userUID.split("_")[1]) || null;
  const waifuId = Number(waifuUId?.split("_")[1]) || null;
  const { userAnalytics, setUserAnalytics } = useContext(AppContext) as any;

  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [showAddBox, setShowAddBox] = useState(false);
  const [editId, setEditId] = useState<string | number | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);

  useEffect(() => {
    setNotes(userAnalytics?.notes || []);
  }, [userAnalytics]); 

  const noteAPI = async (payload: any) => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/auth/note_crud`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": X_Auth_Token,
        },
        body: JSON.stringify(payload),
      });
      return await response.json();
    } catch (err) {
      console.error("API error:", err);
      return null;
    }
  };

  const fetchAPI = async () => {
    if (userUID) {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("X-Auth-Token", X_Auth_Token);

      const raw = JSON.stringify({
        user_id: userUID,
      });

      const requestOptions: any = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
      };

      await fetch(`${BACKEND_API_URL}/api/auth/user-analitic`, requestOptions)
        .then((response) => response.text())
        .then((result) => {
          if (setUserAnalytics) {
            setUserAnalytics(JSON.parse(result));
          }
        })
        .catch((error) => console.error(error));
    }
  };

  const handleAddNote = async () => {
    try {
      if (newNote.trim()) {
        const tempId = Date.now();
        const note: Note = {
          id: tempId,
          note: newNote,
          created_at: new Date().toISOString(),
        };

        setNotes([note, ...notes]);
        setNewNote("");
        setShowAddBox(false);

        const res = await noteAPI({
          action: "create",
          user_id: userID,
          admin_id: waifuId,
          note: newNote,
        });

        if (res?.id) {
          setNotes((prev) =>
            prev.map((n) => (n.id === tempId ? { ...n, id: res.id } : n))
          );
          await fetchAPI();
          toast.success("Note add successfully.", {
            position: "top-right",
            autoClose: 3000,
            theme: "dark",
          });
        }
      }
    } catch (error) {
      console.error("Failed to add note:", error);
      toast.error("Failed to add note.", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
    }
  };

  const handleUpdateNote = async (id: string | number) => {
    try {
      setNotes(
        notes.map((n) =>
          n.id === id
            ? { ...n, note: editText, created_at: new Date().toISOString() }
            : n
        )
      );
      setEditId(null);
      setEditText("");

      await noteAPI({
        action: "update",
        id,
        user_id: userID,
        admin_id: waifuId,
        note: editText,
      });
      await fetchAPI();
      toast.success("Note update successfully.", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
    } catch (error) {
      console.error("Failed to update note:", error);
      toast.error("Failed to update note.", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
    }
  };

  const handleDeleteNote = async (id: string | number) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteNote = async (id: string | number) => {
    setNotes(notes.filter((n) => n.id !== id));
    setDeleteConfirmId(null);
    try {
      await noteAPI({
        action: "delete",
        id,
      });
      await fetchAPI();
      toast.success("Note deleted successfully.", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast.error("Failed to delete note.", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
    }
  };

  const cancelDeleteNote = () => {
    setDeleteConfirmId(null);
  };

  if (!userAnalytics) {
    return <p>Loading user analytics...</p>;
  }
  return (
    <>
      <div className="user-analytics">
        <div className="kpi-data-notes">
          <h2 className="cometchat-user-details__content-title">KPIs</h2>
          <div className="kpi-grid">
            <div className="kpi-card-wrap">
              <div className="kpi-card">
                <p>Total Spend</p>
                <h3>${userAnalytics?.total_spent?.toFixed(2) || 0}</h3>
              </div>
            </div>
            <div className="kpi-card-wrap">
              <div className="kpi-card">
                <p>Spend - Content</p>
                <h3>${userAnalytics?.spend_content?.toFixed(2) || 0}</h3>
              </div>
            </div>
            <div className="kpi-card-wrap">
              <div className="kpi-card">
                <p>Spend - Gifts</p>
                <h3>${userAnalytics?.spend_gifts || 0}</h3>
              </div>
            </div>
            <div className="kpi-card-wrap">
              <div className="kpi-card">
                <p>Purchase</p>
                <h3>{userAnalytics?.purchase_count || 0}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
      </div>
      <div className="user-analytics">
        <div className="kpi-data-notes">
          <h2 className="cometchat-user-details__content-title">Notes</h2>

          {/* Add button */}
          {!showAddBox ? (
            <button className="add-btn" onClick={() => setShowAddBox(true)}>
              + Add Note
            </button>
          ) : (
            <div className="comment-box">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write a new note..."
              />
              <div className="btn-wrap">
                <button onClick={handleAddNote}>Save</button>
                <button className="btn-cancel" onClick={() => setShowAddBox(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div className="note-list-wrap">
          {/* Notes list */}
          {notes.map((note) => (
            <div key={note.id} className="note-item">
              {editId === note.id ? (
                <>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                  <div className="btn-wrap note-actions">
                    <button onClick={() => handleUpdateNote(note.id)}>
                      {" "}
                      <span className="icon">
                        {" "}
                        <img src={saveIcon} alt="save" />{" "}
                      </span>{" "}
                      Save
                    </button>
                    <button
                      className="btn-delete btn-cancel"
                      onClick={() => setEditId(null)}
                    >
                      {" "}
                      <span className="icon">
                        {" "}
                        <img src={cancelIcon} alt="cancel" />{" "}
                      </span>{" "}
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ whiteSpace: "pre-line" }}>{note.note}</p>
                  {/* <p>{new Date(note.created_at).toLocaleString()}</p> */}
                  <div className="btn-wrap note-actions">
                    <button
                      className="btn-edit"
                      onClick={() => {
                        setEditId(note.id);
                        setEditText(note.note);
                      }}
                    >
                      <span className="icon">
                        {" "}
                        <img src={editIcon} alt="edit" />{" "}
                      </span>{" "}
                      
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <span className="icon">
                        {" "}
                        <img src={deleteIcon} alt="delete" />{" "}
                      </span>{" "}
                      
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="delete-confirmation-modal">
          <div className="delete-confirmation-content">
            <h3>Delete Note</h3>
            <p>Are you sure you want to delete this note? This action cannot be undone.</p>
            <div className="btn-wrap">
              <button 
                className="btn-delete" 
                onClick={() => confirmDeleteNote(deleteConfirmId)}
              >
                Delete
              </button>
              <button 
                className="btn-cancel" 
                onClick={cancelDeleteNote}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <UserPurchases userUID={userUID} />
    </>
  );
};

export default UserAnalytics;
