import React, { useState } from "react";

interface Props {
  eventId: string;
  boardId: string;
  onUpload: () => void;
}

export default function BoardItemUpload({ eventId, boardId, onUpload }: Props) {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/events/${eventId}/inspirations/boards/${boardId}/items`, { method: "POST", body: form });
    if (res.ok) {
      onUpload();
      setFile(null);
    }
  };

  return (
    <div className="mb-4">
      <input type="file" onChange={e => e.target.files && setFile(e.target.files[0])} />
      <button onClick={handleUpload} className="ml-2 p-2 bg-blue-500 text-white rounded">Dodaj</button>
    </div>
  );
}
