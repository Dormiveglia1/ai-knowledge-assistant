import React from "react";
import { Bot, User, Loader } from "lucide-react";

function ChatConsole({ chatHistory, isChatting }) {
  return (
    <div
      style={{
        flex: 1,
        padding: "24px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {chatHistory.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#9ca3af",
            gap: "10px",
          }}
        >
          <Bot size={48} color="#cbd5e1" />
          <p style={{ margin: 0, fontSize: "14px" }}>
            System deployed. Upload documents or start asking global semantic
            queries below!
          </p>
        </div>
      ) : (
        chatHistory.map((msg, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "assistant" && (
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#dbeafe",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <Bot size={20} color="#2563eb" />
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                maxWidth: "75%",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  fontSize: "15px",
                  lineHeight: "1.6",
                  backgroundColor: msg.role === "user" ? "#2563eb" : "#ffffff",
                  color: msg.role === "user" ? "#ffffff" : "#1f2937",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.text}
              </div>

              {/* Traceability blocks */}
              {msg.role === "assistant" &&
                msg.sources &&
                msg.sources.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      padding: "10px",
                      backgroundColor: "#f3f4f6",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#4b5563",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <span style={{ fontWeight: "bold", color: "#374151" }}>
                      🔍 Traceability Sources:
                    </span>
                    {msg.sources.map((src, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          borderLeft: "3px solid #2563eb",
                          paddingLeft: "8px",
                          margin: "4px 0",
                          lineHeight: "1.4",
                        }}
                      >
                        <span style={{ fontWeight: "600", color: "#1f2937" }}>
                          [{src.id.split("_chunk_")[0]}]
                        </span>
                        <span style={{ color: "#6b7280", marginLeft: "6px" }}>
                          (Distance Score: {Number(src.score).toFixed(3)})
                        </span>
                        <p style={{ margin: "2px 0 0 0", fontStyle: "italic" }}>
                          "{src.text}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {msg.role === "user" && (
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#2563eb",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <User size={20} color="#ffffff" />
              </div>
            )}
          </div>
        ))
      )}

      {isChatting && (
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "#dbeafe",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Bot size={20} color="#2563eb" />
          </div>
          <span
            style={{
              fontSize: "13px",
              color: "#9ca3af",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Loader
              size={14}
              style={{ animation: "spin 1s linear infinite" }}
            />{" "}
            Agent scanning vector database shards and synthesizing response...
          </span>
        </div>
      )}
    </div>
  );
}

export default ChatConsole;
