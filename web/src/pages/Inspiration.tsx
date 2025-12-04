import React, { useEffect, useState, ChangeEvent } from "react";
import { motion } from "framer-motion";

interface Item {
  id: string;
  file_url: string;
  thumb_url?: string | null;
  note?: string | null;
  source_type: "upload" | "link";
}

interface Board {
  id: string;
  name: string;
  items: Item[];
}

// Typ dla danych wysyłanych do API
type ApiData = FormData | Record<string, unknown>;

async function api<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  data?: ApiData
): Promise<T> {
  const token = localStorage.getItem("token") || "";
  const options: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${token}` },
  };

  if (data instanceof FormData) {
    options.body = data;
  } else if (data) {
    options.headers = { ...options.headers, "Content-Type": "application/json" };
    options.body = JSON.stringify(data);
  }

  const res = await fetch(`${import.meta.env.VITE_API_URL}${url}`, options);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  // TS wie, że res.json() zwraca obiekt typu T
  return res.json() as Promise<T>;
}

export default function Inspiration() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const loadBoards = async () => {
    try {
      const data = await api<Board[]>("GET", "/inspirations/boards");
      setBoards(data);
    } catch (error) {
      console.error("Failed to load boards:", error);
    }
  };

  useEffect(() => {
    loadBoards();
  }, []);

  const uploadFile = async (boardId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api("POST", `/inspirations/upload/${boardId}`, formData);
      loadBoards();
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const handleFileChange =
    (boardId: string) => (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      uploadFile(boardId, file);
    };

  const deleteItem = async (itemId: string) => {
    try {
      await api("DELETE", `/inspirations/item/${itemId}`);
      loadBoards();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  return (
    <div className="p-4 space-y-8">
      {boards.map((board) => (
        <div key={board.id}>
          <h2 className="text-xl font-bold mb-2">{board.name}</h2>

          <input type="file" onChange={handleFileChange(board.id)} />

          <div className="grid grid-cols-3 gap-4 mt-4">
            {board.items.map((item) => (
              <div
                key={item.id}
                className="cursor-pointer border rounded overflow-hidden shadow"
              >
                <img
                  src={item.thumb_url || item.file_url}
                  alt="Inspiration"
                  className="w-full h-32 object-cover"
                  onClick={() => setSelectedItem(item)}
                />
                <div className="p-2 flex justify-between items-center">
                  {item.note && <p className="text-sm">{item.note}</p>}
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded"
                    onClick={() => deleteItem(item.id)}
                  >
                    Usuń
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal podglądu */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedItem(null)}
        >
          <motion.img
            src={selectedItem.file_url}
            alt="Inspiration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-h-[80%] max-w-[80%]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
