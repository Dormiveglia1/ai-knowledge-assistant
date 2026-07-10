import React from "react";
import { Send } from "lucide-react";

function ChatInput({
  query,
  setQuery,
  handleSendMessage,
  isChatting,
  selectedFile,
}) {
  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e5e7eb",
        flexShrink: 0,
      }}
    >
      <form
        onSubmit={handleSendMessage}
        style={{ display: "flex", gap: "12px" }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            selectedFile
              ? `Context locked onto [${selectedFile}]. Ask anything...`
              : "Submit global query across entire knowledge base..."
          }
          disabled={isChatting}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isChatting || !query.trim()}
          style={{
            padding: "0 18px",
            backgroundColor:
              query.trim() && !isChatting ? "#2563eb" : "#9ca3af",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: query.trim() && !isChatting ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Send size={18} color="#ffffff" />
        </button>
      </form>
    </div>
  );
}

export default ChatInput;
