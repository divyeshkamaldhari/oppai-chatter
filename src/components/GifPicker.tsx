import React, { useEffect, useState, useRef } from "react";
import "../styles/Gif.css";

interface GifPickerProps {
  onSelectGif: (gifUrl: string) => void;
}

interface GiphyGif {
  id: string;
  images: {
    fixed_height: {
      url: string;
    };
  };
}

export const GifPicker: React.FC<GifPickerProps> = ({ onSelectGif }) => {
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const LIMIT = 20;
  const API_KEY = "ZADUIf7GMr8QtJb1LwAC9iDNKygF4J9Q";

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const fetchGIFs = async (query = "", newOffset = 0) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const endpoint =
        query.trim() === ""
          ? `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=${LIMIT}&offset=${newOffset}&rating=r`
          : `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${query}&limit=${LIMIT}&offset=${newOffset}&rating=r`;

      const res = await fetch(endpoint);
      const response = await res.json();

      const newGifs: GiphyGif[] = response.data || [];
      setGifs((prev) => {
        const existingIds = new Set(prev.map((gif) => gif.id));
        const filtered = newGifs.filter((gif) => !existingIds.has(gif.id));
        return newOffset === 0 ? filtered : [...prev, ...filtered];
      });

      offsetRef.current = newOffset + LIMIT;
    } catch (error) {
      console.error("GIF fetch failed:", error);
    } finally {
      loadingRef.current = false;
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      fetchGIFs(search, offsetRef.current);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      offsetRef.current = 0;
      fetchGIFs(search, 0);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  // Clear search when closing
  useEffect(() => {
    if (!show) setSearch("");
  }, [show]);

  useEffect(() => {
    const handleClickAnywhere = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // If clicked outside picker + button
      if (
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setShow(false);
      }

      // Extra: If clicked on any composer button (emoji, send, etc.)
      if (target.closest(".cometchat-message-composer__button") ||
        target.closest(".cometchat-message-composer__send-button")) {
        setShow(false);
      }
    };

    // Attach with capture phase
    document.addEventListener("click", handleClickAnywhere, true);

    return () => {
      document.removeEventListener("click", handleClickAnywhere, true);
    };
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        onClick={() => setShow((prev) => !prev)}
        style={{ color: "white", padding: "0px" }}
      >
        GIF
      </button>

      {show && (
        <div
          ref={pickerRef}
          style={{
            width: "400px",
            padding: "8px",
            background: "#141414",
            height: "355px",
            borderRadius: "8px",
            position: "absolute",
            bottom: "56px",
            right: "0",
            overflow: "hidden",
            zIndex: 1000,
          }}
        >
          <input
            type="text"
            placeholder="Search GIFs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="gifin"
            style={{ height: "40px", width: "100%", marginBottom: "8px" }}
          />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              maxHeight: "300px",
              overflowY: "auto",
            }}
            onScroll={handleScroll}
          >
            {gifs.length === 0 ? (
              <div
                style={{
                  width: "100%",
                  textAlign: "center",
                  padding: "20px",
                  color: "#888",
                }}
              >
                No GIFs found
              </div>
            ) : (
              gifs.map((gif) => (
                <img
                  key={gif.id}
                  src={gif.images.fixed_height.url}
                  alt="gif"
                  onClick={() => {
                    onSelectGif(gif.images.fixed_height.url);
                    setShow(false);
                  }}
                  style={{ cursor: "pointer", maxHeight: "120px" }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
