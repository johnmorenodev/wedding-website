/**
 * ============================================================================
 * PRENUP PHOTO GALLERY JAVASCRIPT
 * ============================================================================
 */

const DEFAULT_API_URLS = [
  window.WEDDING_CONFIG?.API_BASE_URL,
  window.WEDDING_API_URL,
  "http://localhost:3000/api/public",
  "http://localhost:3001/api/public",
].filter(Boolean);

let API_BASE_URL = DEFAULT_API_URLS[0] || "http://localhost:3000/api/public";
let photos = [];
let currentIndex = 0;

// DOM Elements
const prenupGrid = document.getElementById("prenupGrid");
const photoCountPill = document.getElementById("photoCountPill");
const photoCountNumber = document.getElementById("photoCountNumber");
const lightboxModal = document.getElementById("lightboxModal");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxCounter = document.getElementById("lightboxCounter");
const lightboxCloseBtn = document.getElementById("lightboxCloseBtn");
const lightboxPrevBtn = document.getElementById("lightboxPrevBtn");
const lightboxNextBtn = document.getElementById("lightboxNextBtn");

/**
 * Fetch photos from backend with multi-port auto discovery
 */
async function loadPrenupPhotos() {
  if (prenupGrid) {
    prenupGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--soft-ink);">
        <p style="font-family: 'Cinzel', serif; font-size: 1.1rem; letter-spacing: 0.1em;">Loading our love story...</p>
      </div>
    `;
  }

  for (const url of DEFAULT_API_URLS) {
    try {
      const res = await fetch(`${url}/photos?category=prenup`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.photos)) {
          API_BASE_URL = url;
          photos = data.photos;
          renderGallery();
          return;
        }
      }
    } catch (e) {
      // try next
    }
  }

  // If no backend reached or empty
  renderGallery();
}

/**
 * Render masonry gallery
 */
function renderGallery() {
  if (!prenupGrid) return;

  if (photos.length === 0) {
    if (photoCountPill) photoCountPill.style.display = "none";
    prenupGrid.innerHTML = `
      <div class="gallery-empty">
        <div class="empty-icon-badge">📷</div>
        <p class="eyebrow" style="margin-bottom: 0.25rem;"><span class="script-accent">coming soon</span> &bull; Our Story</p>
        <h3>Our Gallery is Coming Soon</h3>
        <p>
          Our photographer is putting the finishing touches on our prenup album. Check back soon to see our favorite moments!
        </p>
      </div>
    `;
    return;
  }

  if (photoCountPill && photoCountNumber) {
    photoCountPill.style.display = "inline-flex";
    photoCountNumber.textContent = `${photos.length} Photographs`;
  }

  const itemsHtml = photos
    .map(
      (photo, idx) => `
      <article class="gallery-item" data-index="${idx}">
        <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.caption || 'Prenup Photo')}" loading="lazy" />
        <div class="gallery-item-overlay">
          <span class="gallery-item-zoom-icon">🔍</span>
          ${photo.caption ? `<p class="gallery-item-caption">${escapeHtml(photo.caption)}</p>` : ''}
        </div>
      </article>
    `
    )
    .join('');

  prenupGrid.innerHTML = itemsHtml;
}

/**
 * Lightbox Navigation
 */
function openLightbox(index) {
  if (index < 0 || index >= photos.length) return;
  currentIndex = index;
  updateLightbox();

  if (lightboxModal) {
    lightboxModal.classList.add("is-active");
    lightboxModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
}

function updateLightbox() {
  const photo = photos[currentIndex];
  if (!photo) return;

  if (lightboxImg) {
    lightboxImg.src = photo.url;
    lightboxImg.alt = photo.caption || "Prenup Photo";
  }

  if (lightboxCaption) {
    lightboxCaption.textContent = photo.caption || "";
    lightboxCaption.style.display = photo.caption ? "block" : "none";
  }

  if (lightboxCounter) {
    lightboxCounter.textContent = `${currentIndex + 1} / ${photos.length}`;
  }
}

function closeLightbox() {
  if (lightboxModal) {
    lightboxModal.classList.remove("is-active");
    lightboxModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

function showNextPhoto() {
  if (photos.length === 0) return;
  currentIndex = (currentIndex + 1) % photos.length;
  updateLightbox();
}

function showPrevPhoto() {
  if (photos.length === 0) return;
  currentIndex = (currentIndex - 1 + photos.length) % photos.length;
  updateLightbox();
}

// Event Listeners
if (prenupGrid) {
  prenupGrid.addEventListener("click", (e) => {
    const item = e.target.closest(".gallery-item");
    if (!item) return;
    const index = parseInt(item.dataset.index, 10);
    if (!isNaN(index)) {
      openLightbox(index);
    }
  });
}

if (lightboxCloseBtn) lightboxCloseBtn.addEventListener("click", closeLightbox);
if (lightboxNextBtn) lightboxNextBtn.addEventListener("click", showNextPhoto);
if (lightboxPrevBtn) lightboxPrevBtn.addEventListener("click", showPrevPhoto);

if (lightboxModal) {
  lightboxModal.addEventListener("click", (e) => {
    if (e.target === lightboxModal) {
      closeLightbox();
    }
  });
}

// Keyboard controls
window.addEventListener("keydown", (e) => {
  if (!lightboxModal || !lightboxModal.classList.contains("is-active")) return;

  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") showNextPhoto();
  if (e.key === "ArrowLeft") showPrevPhoto();
});

// Touch Swipe Gesture for Mobile Lightbox
let touchStartX = 0;
let touchEndX = 0;

if (lightboxModal) {
  lightboxModal.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );

  lightboxModal.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    },
    { passive: true }
  );
}

function handleSwipe() {
  const swipeDiff = touchEndX - touchStartX;
  if (Math.abs(swipeDiff) > 50) {
    if (swipeDiff < 0) {
      showNextPhoto();
    } else {
      showPrevPhoto();
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initialize
loadPrenupPhotos();
