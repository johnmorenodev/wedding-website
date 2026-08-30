/**
 * ============================================================================
 * PHOTOGRAPHER PORTAL & DIRECT S3 UPLOADER
 * ============================================================================
 */

const DEFAULT_API_URLS = [
  window.WEDDING_CONFIG?.API_BASE_URL,
  window.WEDDING_API_URL,
  "http://localhost:3000/api/public",
  "http://localhost:3001/api/public",
].filter(Boolean);

let API_BASE_URL = DEFAULT_API_URLS[0] || "http://localhost:3000/api/public";
let currentToken = "";
let selectedFiles = []; // { id, file, name, sizeFormatted, thumbUrl, status, progress, caption }
let isUploading = false;

// DOM Elements
const tokenGateBox = document.getElementById("tokenGateBox");
const tokenInput = document.getElementById("tokenInput");
const btnSubmitToken = document.getElementById("btnSubmitToken");
const uploaderApp = document.getElementById("uploaderApp");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const uploaderQueue = document.getElementById("uploaderQueue");
const queueCount = document.getElementById("queueCount");
const fileListContainer = document.getElementById("fileListContainer");
const btnStartUpload = document.getElementById("btnStartUpload");
const btnClearQueue = document.getElementById("btnClearQueue");
const uploadSuccessBanner = document.getElementById("uploadSuccessBanner");

/**
 * Multi-port Auto Discovery for API
 */
async function discoverApiUrl() {
  if (window.WEDDING_CONFIG?.API_BASE_URL) {
    API_BASE_URL = window.WEDDING_CONFIG.API_BASE_URL;
    return;
  }

  for (const url of DEFAULT_API_URLS) {
    try {
      const res = await fetch(`${url}/photos?category=prenup`);
      if (res.ok) {
        API_BASE_URL = url;
        return;
      }
    } catch (e) {
      // try next
    }
  }
}

/**
 * Token Initialization & Validation
 */
function initToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get("token");

  if (tokenFromUrl) {
    currentToken = tokenFromUrl.trim();
    localStorage.setItem("wedding_photographer_token", currentToken);
    showUploader();
  } else {
    const savedToken = localStorage.getItem("wedding_photographer_token");
    if (savedToken) {
      currentToken = savedToken;
      showUploader();
    } else {
      showTokenGate();
    }
  }
}

function showTokenGate() {
  if (tokenGateBox) tokenGateBox.style.display = "block";
  if (uploaderApp) uploaderApp.style.display = "none";
}

function showUploader() {
  if (tokenGateBox) tokenGateBox.style.display = "none";
  if (uploaderApp) uploaderApp.style.display = "block";
}

if (btnSubmitToken && tokenInput) {
  btnSubmitToken.addEventListener("click", () => {
    const val = tokenInput.value.trim();
    if (val) {
      currentToken = val;
      localStorage.setItem("wedding_photographer_token", currentToken);
      showUploader();
    }
  });

  tokenInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      btnSubmitToken.click();
    }
  });
}

/**
 * Drag and Drop & File Selection
 */
if (dropzone && fileInput) {
  dropzone.addEventListener("click", () => fileInput.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("is-dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("is-dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("is-dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      fileInput.value = "";
    }
  });
}

function addFiles(files) {
  const validImages = files.filter((f) => f.type.startsWith("image/"));

  if (validImages.length === 0) {
    alert("Please select valid image files (JPG, PNG, WebP).");
    return;
  }

  validImages.forEach((file) => {
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const thumbUrl = URL.createObjectURL(file);
    selectedFiles.push({
      id: fileId,
      file: file,
      name: file.name,
      sizeFormatted: formatBytes(file.size),
      thumbUrl: thumbUrl,
      status: "queued", // 'queued' | 'uploading' | 'success' | 'error'
      progress: 0,
      caption: "",
    });
  });

  if (uploadSuccessBanner) uploadSuccessBanner.style.display = "none";
  renderQueue();
}

function renderQueue() {
  if (!uploaderQueue || !fileListContainer) return;

  if (selectedFiles.length === 0) {
    uploaderQueue.style.display = "none";
    return;
  }

  uploaderQueue.style.display = "block";
  if (queueCount) queueCount.textContent = selectedFiles.length;

  fileListContainer.innerHTML = selectedFiles
    .map(
      (item) => `
    <div class="uploader-file-item" id="fileItem-${item.id}">
      <img src="${item.thumbUrl}" alt="" class="uploader-thumb" />
      <div class="uploader-file-info">
        <span class="uploader-filename">${escapeHtml(item.name)}</span>
        <span class="uploader-filesize">${item.sizeFormatted}</span>
        <div class="uploader-item-progress">
          <div class="uploader-item-progress-fill" id="progressFill-${item.id}" style="width: ${item.progress}%;"></div>
        </div>
      </div>
      <span class="uploader-status-badge ${item.status}" id="statusBadge-${item.id}">
        ${getStatusLabel(item.status, item.progress)}
      </span>
    </div>
  `
    )
    .join("");
}

function getStatusLabel(status, progress) {
  switch (status) {
    case "uploading":
      return `${Math.round(progress)}%`;
    case "success":
      return "Uploaded ✓";
    case "error":
      return "Failed ✕";
    default:
      return "Queued";
  }
}

if (btnClearQueue) {
  btnClearQueue.addEventListener("click", () => {
    if (isUploading) return;
    selectedFiles = [];
    renderQueue();
  });
}

/**
 * Upload Processor (Batch Concurrency = 3)
 */
if (btnStartUpload) {
  btnStartUpload.addEventListener("click", async () => {
    if (isUploading || selectedFiles.length === 0) return;

    isUploading = true;
    btnStartUpload.disabled = true;
    btnStartUpload.textContent = "Uploading to CDN...";

    const queued = selectedFiles.filter((f) => f.status === "queued" || f.status === "error");

    // Process with concurrency limit of 3
    const CONCURRENCY = 3;
    let index = 0;

    async function processNext() {
      if (index >= queued.length) return;
      const current = queued[index++];
      await uploadSinglePhoto(current);
      await processNext();
    }

    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY, queued.length); i++) {
      workers.push(processNext());
    }

    await Promise.all(workers);

    isUploading = false;
    btnStartUpload.disabled = false;
    btnStartUpload.textContent = "Upload More Photos";

    const allSucceeded = selectedFiles.every((f) => f.status === "success");
    if (allSucceeded && uploadSuccessBanner) {
      uploadSuccessBanner.style.display = "block";
      uploadSuccessBanner.scrollIntoView({ behavior: "smooth" });
    }
  });
}

async function uploadSinglePhoto(item) {
  updateItemStatus(item, "uploading", 5);

  try {
    // 1. Get presigned URL
    const presignRes = await fetch(`${API_BASE_URL}/photos/presign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: currentToken,
        filename: item.file.name,
        contentType: item.file.type || "image/jpeg",
        category: "prenup",
      }),
    });

    if (!presignRes.ok) {
      const errData = await presignRes.json().catch(() => ({}));
      throw new Error(errData.error || `Presign failed HTTP ${presignRes.status}`);
    }

    const presignData = await presignRes.json();

    // 2. Perform direct upload
    if (presignData.mode === "s3") {
      // Direct S3 Upload via PUT
      await uploadToS3(presignData.uploadUrl, item.file, (percent) => {
        updateItemStatus(item, "uploading", 10 + percent * 0.8);
      });

      // 3. Confirm upload metadata to PostgreSQL
      const confirmRes = await fetch(`${API_BASE_URL}/photos/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: currentToken,
          s3Key: presignData.s3Key,
          publicUrl: presignData.publicUrl,
          caption: item.caption || null,
          category: "prenup",
        }),
      });

      if (!confirmRes.ok) throw new Error("Metadata confirmation failed");
    } else {
      // Local fallback upload mode
      await uploadLocalFile(item.file, (percent) => {
        updateItemStatus(item, "uploading", percent);
      });
    }

    updateItemStatus(item, "success", 100);
  } catch (err) {
    console.error(`Upload error for ${item.name}:`, err);
    updateItemStatus(item, "error", 0);
  }
}

function uploadToS3(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "image/jpeg");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed with HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during S3 upload"));
    xhr.send(file);
  });
}

function uploadLocalFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/photos/upload-local`, true);

    const formData = new FormData();
    formData.append("token", currentToken);
    formData.append("category", "prenup");
    formData.append("file", file);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Local upload failed with HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during local upload"));
    xhr.send(formData);
  });
}

function updateItemStatus(item, status, progress) {
  item.status = status;
  item.progress = progress;

  const fill = document.getElementById(`progressFill-${item.id}`);
  const badge = document.getElementById(`statusBadge-${item.id}`);

  if (fill) fill.style.width = `${progress}%`;
  if (badge) {
    badge.className = `uploader-status-badge ${status}`;
    badge.textContent = getStatusLabel(status, progress);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Start immediately
initToken();
discoverApiUrl();
