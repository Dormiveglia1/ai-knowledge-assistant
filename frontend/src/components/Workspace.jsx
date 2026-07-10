import React from "react";
import {
  Layers,
  Upload,
  Loader,
  AlertCircle,
  CheckCircle,
  Trash2,
} from "lucide-react";

function Workspace({
  file,
  uploadStatus,
  isUploading,
  availableFiles,
  selectedFile,
  setSelectedFile,
  handleFileChange,
  handleUpload,
  handleDeleteFile,
}) {
  return (
    <div
      style={{
        width: "360px",
        backgroundColor: "#ffffff",
        borderRight: "1px solid #e5e7eb",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Layers size={28} color="#2563eb" />
        <h2 style={{ margin: 0, fontSize: "20px", color: "#1f2937" }}>
          RAG Workspace
        </h2>
      </div>

      <p
        style={{
          fontSize: "13px",
          color: "#6b7280",
          margin: 0,
          lineHeight: "1.5",
        }}
      >
        Multi-document isolated RAG engine. Upload your knowledge assets below
        and segment context domains effortlessly.
      </p>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid #f3f4f6",
          margin: "4px 0",
        }}
      />

      {/* 🎯 Context Selector */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          width: "100%",
        }}
      >
        <label
          style={{ fontSize: "13px", fontWeight: "bold", color: "#4b5563" }}
        >
          Query Context Domain Target:
        </label>

        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            width: "100%",
          }}
        >
          <select
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              fontSize: "13px",
              color: "#1f2937",
              outline: "none",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              minWidth: "0",
            }}
          >
            <option value="">🌐 Global Search (All Documents)</option>
            {availableFiles &&
              availableFiles.length > 0 &&
              availableFiles.map((filename, idx) => (
                <option key={idx} value={filename}>
                  📄 Only: {filename}
                </option>
              ))}
          </select>

          <button
            onClick={handleDeleteFile}
            type="button"
            title="Evict this document permanently"
            style={{
              padding: "10px 12px",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fee2e2",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            <Trash2 size={16} color="#dc2626" />
          </button>
        </div>
      </div>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid #f3f4f6",
          margin: "4px 0",
        }}
      />

      {/* Upload Zone */}
      <div
        style={{
          border: "2px dashed #d1d5db",
          borderRadius: "8px",
          padding: "20px",
          textAlign: "center",
          backgroundColor: "#fafafa",
        }}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          id="pdf-file"
          style={{ display: "none" }}
        />
        <label
          htmlFor="pdf-file"
          style={{
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            color: "#4b5563",
            fontSize: "13px",
          }}
        >
          <Upload size={32} color="#9ca3af" />
          <span style={{ wordBreak: "break-all", padding: "0 4px" }}>
            {file ? file.name : "Choose a new PDF document"}
          </span>
        </label>
      </div>

      <button
        onClick={handleUpload}
        disabled={isUploading || !file}
        style={{
          width: "100%",
          padding: "11px",
          backgroundColor: file && !isUploading ? "#2563eb" : "#9ca3af",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: file && !isUploading ? "pointer" : "not-allowed",
          fontWeight: "bold",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px",
          fontSize: "14px",
        }}
      >
        {isUploading ? (
          <Loader size={18} style={{ animation: "spin 1s linear infinite" }} />
        ) : null}
        {isUploading ? "Ingesting Assets..." : "Inject into Vector DB"}
      </button>

      {/* Status Notifications */}
      {uploadStatus && (
        <div
          style={{
            padding: "12px",
            borderRadius: "6px",
            fontSize: "13px",
            lineHeight: "1.4",
            backgroundColor:
              uploadStatus.includes("❌") || uploadStatus.includes("Error")
                ? "#fef2f2"
                : "#ecfdf5",
            color:
              uploadStatus.includes("❌") || uploadStatus.includes("Error")
                ? "#991b1b"
                : "#065f46",
            display: "flex",
            alignItems: "flex-start",
            gap: "6px",
          }}
        >
          {uploadStatus.includes("❌") || uploadStatus.includes("Error") ? (
            <AlertCircle
              size={16}
              style={{ flexShrink: 0, marginTop: "2px" }}
            />
          ) : (
            <CheckCircle
              size={16}
              style={{ flexShrink: 0, marginTop: "2px" }}
            />
          )}
          <span>{uploadStatus}</span>
        </div>
      )}
    </div>
  );
}

export default Workspace;
