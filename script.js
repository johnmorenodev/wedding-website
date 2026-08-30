// Countdown Timer
const weddingDate = new Date("2026-10-24T14:00:00+08:00");

const countdownEls = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
};

function updateCountdown() {
  const now = new Date();
  const timeLeft = weddingDate.getTime() - now.getTime();

  if (timeLeft <= 0) {
    if (countdownEls.days) countdownEls.days.textContent = "00";
    if (countdownEls.hours) countdownEls.hours.textContent = "00";
    if (countdownEls.minutes) countdownEls.minutes.textContent = "00";
    if (countdownEls.seconds) countdownEls.seconds.textContent = "00";
    return;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  if (countdownEls.days) countdownEls.days.textContent = String(days).padStart(2, "0");
  if (countdownEls.hours) countdownEls.hours.textContent = String(hours).padStart(2, "0");
  if (countdownEls.minutes) countdownEls.minutes.textContent = String(minutes).padStart(2, "0");
  if (countdownEls.seconds) countdownEls.seconds.textContent = String(seconds).padStart(2, "0");
}

updateCountdown();
setInterval(updateCountdown, 1000);

// Snappy Non-Jumping FAQ Accordion
const faqItems = document.querySelectorAll(".faq-item");
faqItems.forEach((item) => {
  const btn = item.querySelector(".faq-summary");
  if (btn) {
    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");

      // Close all items
      faqItems.forEach((other) => {
        other.classList.remove("is-open");
        const otherBtn = other.querySelector(".faq-summary");
        if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
      });

      // Toggle clicked item
      if (!isOpen) {
        item.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  }
});

// Scroll Reveal Observer
const revealElements = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
        }
      });
    },
    {
      root: null,
      threshold: 0.12,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  revealElements.forEach((el) => revealObserver.observe(el));
} else {
  // Fallback if IntersectionObserver is not supported
  revealElements.forEach((el) => el.classList.add("active"));
}

/**
 * ============================================================================
 * BACKEND API CONFIGURATION & LIVE GUEST LIST
 * ============================================================================
 */
const DEFAULT_API_URLS = [
  window.WEDDING_CONFIG?.API_BASE_URL,
  window.WEDDING_API_URL,
  "http://localhost:3000/api/public",
  "http://localhost:3001/api/public",
].filter(Boolean);

let API_BASE_URL = DEFAULT_API_URLS[0] || "http://localhost:3000/api/public";

let guestList = [];
let currentGuestId = null;
let currentGuestName = null;

const rsvpSearchContainer = document.getElementById("rsvpSearchContainer");
const rsvpSearchInput = document.getElementById("rsvpSearchInput");
const rsvpResultsList = document.getElementById("rsvpResultsList");

const rsvpSimpleForm = document.getElementById("rsvpSimpleForm");
const selectedGuestNameDisplay = document.getElementById("selectedGuestNameDisplay");
const btnChangeSelectedGuest = document.getElementById("btnChangeSelectedGuest");

const rsvpSuccessBox = document.getElementById("rsvpSuccessBox");
const successGuestName = document.getElementById("successGuestName");
const successStatusMessage = document.getElementById("successStatusMessage");
const btnResetSimpleRsvp = document.getElementById("btnResetSimpleRsvp");

/**
 * Fetch guest list from backend API (auto-discovering port 3000 / 3001)
 */
async function loadGuestsFromBackend() {
  for (const url of DEFAULT_API_URLS) {
    try {
      const res = await fetch(`${url}/guests`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.guests) && data.guests.length > 0) {
          API_BASE_URL = url;
          guestList = data.guests;
          console.log(`Connected to wedding backend: loaded ${guestList.length} guests from ${url}`);
          if (rsvpSearchInput && rsvpSearchInput.value.trim()) {
            handleGuestSearch();
          }
          return;
        }
      }
    } catch (err) {
      // Continue to next candidate URL
    }
  }

  // Fallback if backend server is not running
  if (guestList.length === 0) {
    console.warn("Could not reach wedding backend on any port; using local fallback list.");
    guestList = [
      { id: null, name: "Alicia Santos", side: "Bride's Guest" },
      { id: null, name: "Marco Reyes", side: "Groom's Guest" },
      { id: null, name: "Carla Villanueva", side: "Bride's Guest" },
      { id: null, name: "Daniel Cruz", side: "Groom's Guest" },
      { id: null, name: "Patricia Lim", side: "Family" },
      { id: null, name: "John Moreno", side: "Groom's Family" },
      { id: null, name: "Jessa Moreno", side: "Bride's Family" },
    ];
  }
}

// Initial fetch
loadGuestsFromBackend();

/**
 * Filter and render search results
 */
function handleGuestSearch() {
  const query = (rsvpSearchInput?.value || "").trim().toLowerCase();

  if (!query) {
    rsvpResultsList.innerHTML =
      '<p class="empty-state">Start typing your name to find your invitation.</p>';
    return;
  }

  const matches = guestList.filter((guest) =>
    guest.name.toLowerCase().includes(query)
  );

  if (!matches.length) {
    const rawQuery = rsvpSearchInput.value.trim();
    rsvpResultsList.innerHTML = `
      <div class="rsvp-guest-row custom-guest-row" data-custom-name="${escapeHtml(rawQuery)}">
        <div class="rsvp-guest-row-info">
          <strong>${escapeHtml(rawQuery)}</strong>
          <span>Name not in list? Click here to continue RSVP</span>
        </div>
        <span class="link-btn">Select →</span>
      </div>
    `;
    return;
  }

  rsvpResultsList.innerHTML = matches
    .map((guest) => {
      let statusTag = "";
      if (guest.rsvp_status === "attending") {
        statusTag = ' <small style="color: var(--gold); font-weight: 600;">(Attending)</small>';
      } else if (guest.rsvp_status === "declined") {
        statusTag = ' <small style="color: var(--soft-ink); font-weight: 500;">(Declined)</small>';
      }

      return `
        <div class="rsvp-guest-row" data-id="${guest.id || ""}" data-name="${escapeHtml(guest.name)}">
          <div class="rsvp-guest-row-info">
            <strong>${escapeHtml(guest.name)}${statusTag}</strong>
            <span>${escapeHtml(guest.side || "Invited Guest")}</span>
          </div>
          <span class="link-btn">Select →</span>
        </div>
      `;
    })
    .join("");
}

/**
 * Select a guest and show the Attend / Not Attend form
 */
function selectGuest(guestId, guestName) {
  currentGuestId = guestId ? Number(guestId) : null;
  currentGuestName = guestName;
  selectedGuestNameDisplay.textContent = guestName;

  // Pre-fill author in guestbook if empty
  if (wishAuthorName && !wishAuthorName.value) {
    wishAuthorName.value = guestName;
  }

  // Pre-select radio if guest already has rsvp_status
  const existing = guestList.find(
    (g) => (currentGuestId && g.id === currentGuestId) || g.name.toLowerCase() === guestName.toLowerCase()
  );

  const radios = rsvpSimpleForm.querySelectorAll('input[name="simpleAttendance"]');
  radios.forEach((r) => {
    if (existing && existing.rsvp_status) {
      if (existing.rsvp_status === "attending" && r.value === "Attending") r.checked = true;
      else if (existing.rsvp_status === "declined" && r.value === "Not Attending") r.checked = true;
      else r.checked = false;
    } else {
      r.checked = false;
    }
  });

  // Switch view
  rsvpSearchContainer.style.display = "none";
  rsvpSimpleForm.style.display = "block";
  rsvpSuccessBox.style.display = "none";
}

/**
 * Return to search
 */
function resetToSearch() {
  rsvpSearchContainer.style.display = "block";
  rsvpSimpleForm.style.display = "none";
  rsvpSuccessBox.style.display = "none";
}

// Search input listener
if (rsvpSearchInput) {
  rsvpSearchInput.addEventListener("input", handleGuestSearch);
}

// Click on search result
if (rsvpResultsList) {
  rsvpResultsList.addEventListener("click", (e) => {
    const row = e.target.closest(".rsvp-guest-row");
    if (!row) return;

    const guestId = row.dataset.id;
    const guestName = row.dataset.name || row.dataset.customName;
    if (guestName) {
      selectGuest(guestId, guestName);
    }
  });
}

// Change button click
if (btnChangeSelectedGuest) {
  btnChangeSelectedGuest.addEventListener("click", resetToSearch);
}

/**
 * Celebratory Confetti Burst Animation
 */
function launchConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ["#b9964c", "#dfc6a2", "#f5ede0", "#a9af9b", "#e0c37a", "#ffffff"];
  const particles = [];
  const particleCount = 75;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.55,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      gravity: 0.35,
      drag: 0.98,
    });
  }

  let animationFrame;
  const startTime = Date.now();

  function render() {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeParticles = 0;

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.rotation += p.rotationSpeed;

      if (elapsed > 1800) {
        p.opacity -= 0.02;
      }

      if (p.opacity > 0) {
        activeParticles++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    if (activeParticles > 0 && elapsed < 4000) {
      animationFrame = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  render();
}

// Submit RSVP
if (rsvpSimpleForm) {
  rsvpSimpleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const attendanceRadio = rsvpSimpleForm.querySelector(
      'input[name="simpleAttendance"]:checked'
    );

    if (!attendanceRadio) {
      alert("Please choose whether you will attend or not.");
      return;
    }

    const status = attendanceRadio.value;
    const isAttending = status === "Attending";
    const submitBtn = rsvpSimpleForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : "Send My RSVP →";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Sending RSVP... <span class="spinner" style="display:inline-block; animation: rotate 1s linear infinite;">⏳</span>';
    }

    // Attempt backend sync
    let syncSuccess = false;
    try {
      const res = await fetch(`${API_BASE_URL}/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guestId: currentGuestId,
          name: currentGuestName,
          status: isAttending ? "attending" : "declined",
        }),
      });

      if (res.ok) {
        const result = await res.json();
        syncSuccess = true;
        // Update local memory
        const target = guestList.find(
          (g) => (currentGuestId && g.id === currentGuestId) || g.name.toLowerCase() === currentGuestName.toLowerCase()
        );
        if (target) {
          target.rsvp_status = isAttending ? "attending" : "declined";
        }
      } else {
        console.warn("Backend RSVP sync returned non-200 status:", res.status);
      }
    } catch (err) {
      console.warn("Could not reach backend API, saving locally:", err);
    }

    // Save locally as reliable backup
    try {
      const stored = JSON.parse(localStorage.getItem("wedding_rsvps") || "[]");
      stored.push({
        id: currentGuestId,
        name: currentGuestName,
        status: status,
        synced: syncSuccess,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("wedding_rsvps", JSON.stringify(stored));
    } catch (err) {
      console.warn("Could not save RSVP to localStorage", err);
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }

    // Show success box with personalized message
    const successIcon = document.querySelector(".success-icon");
    const successSubnote = document.querySelector(".success-subnote");

    if (successIcon) {
      successIcon.textContent = isAttending ? "🥂" : "💌";
    }

    successGuestName.textContent = isAttending
      ? `Woohoo, we'll see you there, ${currentGuestName}!`
      : `We'll miss you, ${currentGuestName}!`;

    successStatusMessage.innerHTML = isAttending
      ? `We've got you down as <strong>Joyfully Joining</strong>!`
      : `We've recorded your RSVP as <strong>Sending Love from afar</strong>.`;

    if (successSubnote) {
      successSubnote.innerHTML = isAttending
        ? `Get ready for good food, great music, and lots of laughs on <strong>October 24, 2026</strong>! ✨`
        : `Thank you for letting us know! We'll definitely feel your love and prayers on our special day. 💕`;
    }

    rsvpSearchContainer.style.display = "none";
    rsvpSimpleForm.style.display = "none";
    rsvpSuccessBox.style.display = "block";

    if (isAttending) {
      launchConfetti();
    }

    rsvpSuccessBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

// Reset from success screen
if (btnResetSimpleRsvp) {
  btnResetSimpleRsvp.addEventListener("click", () => {
    currentGuestId = null;
    currentGuestName = null;
    if (rsvpSearchInput) rsvpSearchInput.value = "";
    if (rsvpResultsList) {
      rsvpResultsList.innerHTML =
        '<p class="empty-state">Start typing your name to find your invitation.</p>';
    }
    resetToSearch();
  });
}

// ==========================================================================
// INTERACTIVE WISHES & LOVE NOTES GUESTBOOK
// ==========================================================================
const wishesBoard = document.getElementById("wishesBoard");
const wishModal = document.getElementById("wishModal");
const wishModalBackdrop = document.getElementById("wishModalBackdrop");
const btnOpenWishModal = document.getElementById("btnOpenWishModal");
const btnCloseWishModal = document.getElementById("btnCloseWishModal");
const wishForm = document.getElementById("wishForm");
const wishAuthorName = document.getElementById("wishAuthorName");
const wishMessageText = document.getElementById("wishMessageText");

const DEFAULT_WISHES = [
  {
    id: 1,
    author: "Sarah & Miguel",
    message: "So excited for the big day! Can't wait to dance the night away with you two in Dumaguete!",
    vibe: "🥂 Cheering For You!",
    time: "Oct 24, 2026",
    likes: 6,
  },
  {
    id: 2,
    author: "Tita Elena & Tito Dan",
    message: "Wishing you both a lifetime filled with deep love, endless patience, and joyful laughter together.",
    vibe: "💖 Pure Love",
    time: "Oct 24, 2026",
    likes: 8,
  },
  {
    id: 3,
    author: "Kuya Mark",
    message: "Marriage rule #1: Always agree on where to eat! Congratulations John and Jessa!",
    vibe: "✨ Forever & Always",
    time: "Oct 24, 2026",
    likes: 5,
  },
  {
    id: 4,
    author: "Bea & Kevin",
    message: "Save us a spot on the dance floor! Counting down the days to celebrate with you!",
    vibe: "💃 Ready to Dance",
    time: "Oct 24, 2026",
    likes: 4,
  },
];

function getStoredWishes() {
  try {
    const saved = localStorage.getItem("wedding_wishes_board");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Could not load wishes from localStorage", e);
  }
  return DEFAULT_WISHES;
}

function saveWishes(wishes) {
  try {
    localStorage.setItem("wedding_wishes_board", JSON.stringify(wishes));
  } catch (e) {
    console.warn("Could not save wishes to localStorage", e);
  }
}

function renderWishesBoard() {
  if (!wishesBoard) return;
  const wishes = getStoredWishes();

  const cardsHtml = wishes
    .map(
      (wish) => `
    <article class="wish-card" data-id="${wish.id}">
      <span class="wish-vibe-tag">${wish.vibe || "✨ Love Note"}</span>
      <p class="wish-text">“${escapeHtml(wish.message)}”</p>
      <div class="wish-footer">
        <div>
          <strong class="wish-author">— ${escapeHtml(wish.author)}</strong>
          <small class="wish-time">${wish.time || "Recently"}</small>
        </div>
        <button type="button" class="wish-like-btn" data-wish-id="${wish.id}" aria-label="Send love">
          ❤️ <span>${wish.likes || 1}</span>
        </button>
      </div>
    </article>
  `
    )
    .join("");

  const addPromptCard = `
    <div class="wish-card-add-prompt" id="promptAddWish">
      <span class="wish-add-icon">💌</span>
      <strong>Tap to leave your note</strong>
      <p>Share a wish, advice, or sweet memory!</p>
    </div>
  `;

  wishesBoard.innerHTML = cardsHtml + addPromptCard;

  const promptEl = document.getElementById("promptAddWish");
  if (promptEl) {
    promptEl.addEventListener("click", openWishModal);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function openWishModal() {
  if (!wishModal) return;
  if (currentGuest && wishAuthorName && !wishAuthorName.value) {
    wishAuthorName.value = currentGuest;
  }
  wishModal.classList.add("is-active");
  wishModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => {
    if (wishAuthorName && !wishAuthorName.value) {
      wishAuthorName.focus();
    } else if (wishMessageText) {
      wishMessageText.focus();
    }
  }, 100);
}

function closeWishModal() {
  if (!wishModal) return;
  wishModal.classList.remove("is-active");
  wishModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// Modal triggers
if (btnOpenWishModal) {
  btnOpenWishModal.addEventListener("click", openWishModal);
}
if (btnCloseWishModal) {
  btnCloseWishModal.addEventListener("click", closeWishModal);
}
if (wishModalBackdrop) {
  wishModalBackdrop.addEventListener("click", closeWishModal);
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && wishModal && wishModal.classList.contains("is-active")) {
    closeWishModal();
  }
});

// Like Button Delegated Listener
if (wishesBoard) {
  wishesBoard.addEventListener("click", (e) => {
    const likeBtn = e.target.closest(".wish-like-btn");
    if (!likeBtn) return;

    const wishId = Number(likeBtn.dataset.wishId);
    const wishes = getStoredWishes();
    const targetWish = wishes.find((w) => w.id === wishId);

    if (targetWish) {
      targetWish.likes = (targetWish.likes || 0) + 1;
      saveWishes(wishes);
      const span = likeBtn.querySelector("span");
      if (span) span.textContent = targetWish.likes;

      likeBtn.style.transform = "scale(1.25)";
      setTimeout(() => {
        likeBtn.style.transform = "";
      }, 200);
    }
  });
}

// Wish Form Submit
if (wishForm) {
  wishForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const author = wishAuthorName.value.trim();
    const message = wishMessageText.value.trim();
    const vibeRadio = wishForm.querySelector('input[name="wishVibe"]:checked');
    const vibe = vibeRadio ? vibeRadio.value : "🥂 Cheering For You!";

    if (!author || !message) return;

    const newWish = {
      id: Date.now(),
      author: author,
      message: message,
      vibe: vibe,
      time: "Just now",
      likes: 1,
    };

    const wishes = getStoredWishes();
    wishes.unshift(newWish);
    saveWishes(wishes);

    wishForm.reset();
    closeWishModal();
    renderWishesBoard();
    launchConfetti();

    const wishesSection = document.getElementById("wishes");
    if (wishesSection) {
      wishesSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

// Initial render
renderWishesBoard();


