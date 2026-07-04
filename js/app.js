const cardForm = document.getElementById("cardForm");
const cardList = document.getElementById("cardList");
const searchInput = document.getElementById("searchInput");

const totalCards = document.getElementById("totalCards");
const totalValue = document.getElementById("totalValue");
const portfolioCards = document.getElementById("portfolioCards");
const portfolioValue = document.getElementById("portfolioValue");

const screenTitle = document.getElementById("screenTitle");

let allCards = [];

document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  await loadCards();
});

cardForm.addEventListener("submit", async event => {
  event.preventDefault();

  const scannedImages = getScannedImages();

  const card = {
    id: crypto.randomUUID(),
    player: document.getElementById("player").value.trim(),
    year: document.getElementById("year").value.trim(),
    setName: document.getElementById("setName").value.trim(),
    manufacturer: document.getElementById("manufacturer").value.trim(),
    cardNumber: document.getElementById("cardNumber").value.trim(),
    sport: document.getElementById("sport").value.trim(),
    currentValue: Number(document.getElementById("currentValue").value || 0),

    purchasePrice: null,
    purchaseDate: null,
    salePrice: null,
    saleDate: null,
    fees: null,
    shippingCost: null,
    gradingCost: null,

    storageLocation: "",
    notes: "",
    favorite: false,
    sold: false,
    wishlist: false,

    valueHistory: [],
    frontImage: scannedImages.frontImage,
    backImage: scannedImages.backImage,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveCard(card);

  cardForm.reset();
  clearScannedImages();
  await loadCards();
  navigateTo("collectionScreen");
});

searchInput.addEventListener("input", () => {
  renderCards(filterCards(searchInput.value));
});

function setupNavigation() {
  document.addEventListener("click", event => {
    const navButton = event.target.closest("[data-nav]");
    if (!navButton) return;

    navigateTo(navButton.dataset.nav);
  });
}

function navigateTo(screenId) {
  const targetScreen = document.getElementById(screenId);
  if (!targetScreen) return;

  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  targetScreen.classList.add("active");

  document.querySelectorAll(".bottom-nav button").forEach(button => {
    button.classList.toggle("active", button.dataset.nav === screenId);
  });

  const titles = {
    homeScreen: "Home",
    scanScreen: "Scan",
    collectionScreen: "Collection",
    portfolioScreen: "Portfolio",
    settingsScreen: "Settings"
  };

  screenTitle.textContent = titles[screenId] || "TrueCard";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadCards() {
  allCards = await getAllCards();
  renderDashboard(allCards);
  renderCards(allCards);
}

function renderDashboard(cards) {
  const value = cards.reduce((sum, card) => {
    return sum + Number(card.currentValue || 0);
  }, 0);

  totalCards.textContent = cards.length;
  totalValue.textContent = formatCurrency(value);
  portfolioCards.textContent = cards.length;
  portfolioValue.textContent = formatCurrency(value);
}

function renderCards(cards) {
  cardList.innerHTML = "";

  if (cards.length === 0) {
    cardList.innerHTML = `
      <div class="panel">
        <p class="helper-text">No cards yet. Scan or add your first card.</p>
      </div>
    `;
    return;
  }

  cards
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach(card => {
      const cardElement = document.createElement("article");
      cardElement.className = "collection-card";

      const frontImageHTML = card.frontImage
        ? `<img class="card-image" src="${card.frontImage}" alt="Front card image">`
        : "";

      const backImageHTML = card.backImage
        ? `<img class="card-image" src="${card.backImage}" alt="Back card image">`
        : "";

      cardElement.innerHTML = `
        ${frontImageHTML}
        ${backImageHTML}

        <h3>${escapeHTML(card.player || "Unknown Player")}</h3>
        <p>${escapeHTML(card.year || "Unknown Year")} ${escapeHTML(card.manufacturer || "")} ${escapeHTML(card.setName || "")}</p>
        <p>Card #: ${escapeHTML(card.cardNumber || "N/A")}</p>
        <p>Sport: ${escapeHTML(card.sport || "N/A")}</p>
        <p>Value: ${formatCurrency(card.currentValue || 0)}</p>

        <div class="card-actions">
          <button data-comps-id="${card.id}">130 Point</button>
          <button data-edit-id="${card.id}">Edit</button>
          <button class="delete-btn" data-id="${card.id}">Delete</button>
        </div>

        <div class="edit-panel" id="edit-${card.id}" hidden>
          <label>Player
            <input data-field="player" value="${escapeAttribute(card.player || "")}">
          </label>

          <label>Year
            <input data-field="year" value="${escapeAttribute(card.year || "")}">
          </label>

          <label>Manufacturer
            <input data-field="manufacturer" value="${escapeAttribute(card.manufacturer || "")}">
          </label>

          <label>Set
            <input data-field="setName" value="${escapeAttribute(card.setName || "")}">
          </label>

          <label>Card Number
            <input data-field="cardNumber" value="${escapeAttribute(card.cardNumber || "")}">
          </label>

          <label>Sport
            <input data-field="sport" value="${escapeAttribute(card.sport || "")}">
          </label>

          <label>Current Value
            <input data-field="currentValue" type="number" step="0.01" value="${escapeAttribute(card.currentValue || "")}">
          </label>

          <div class="card-actions">
            <button data-save-edit-id="${card.id}">Save Changes</button>
            <button class="secondary-btn" data-cancel-edit-id="${card.id}">Cancel</button>
          </div>
        </div>
      `;

      cardList.appendChild(cardElement);
    });

  wireCardButtons();
}

function wireCardButtons() {
  document.querySelectorAll("[data-edit-id]").forEach(button => {
    button.addEventListener("click", () => {
      const panel = document.getElementById(`edit-${button.dataset.editId}`);
      if (panel) panel.hidden = !panel.hidden;
    });
  });

  document.querySelectorAll("[data-cancel-edit-id]").forEach(button => {
    button.addEventListener("click", () => {
      const panel = document.getElementById(`edit-${button.dataset.cancelEditId}`);
      if (panel) panel.hidden = true;
    });
  });

  document.querySelectorAll("[data-save-edit-id]").forEach(button => {
    button.addEventListener("click", async () => {
      await saveInlineEdit(button.dataset.saveEditId);
    });
  });

  document.querySelectorAll("[data-comps-id]").forEach(button => {
    button.addEventListener("click", async () => {
      const card = allCards.find(item => item.id === button.dataset.compsId);
      if (!card) return;

      const query = buildCardSearchText(card);

      try {
        await navigator.clipboard.writeText(query);
        alert(`Copied search text:\n\n${query}\n\nPaste this into 130 Point.`);
      } catch {
        alert(`Search this on 130 Point:\n\n${query}`);
      }

      window.open("https://130point.com/sales/", "_blank", "noopener");
    });
  });

  document.querySelectorAll(".delete-btn").forEach(button => {
    button.addEventListener("click", async () => {
      const confirmed = confirm("Delete this card?");
      if (!confirmed) return;

      await deleteCard(button.dataset.id);
      await loadCards();
    });
  });
}

async function saveInlineEdit(cardId) {
  const card = allCards.find(item => item.id === cardId);
  const panel = document.getElementById(`edit-${cardId}`);

  if (!card || !panel) return;

  const updates = {};

  panel.querySelectorAll("[data-field]").forEach(input => {
    updates[input.dataset.field] = input.value.trim();
  });

  const previousValue = Number(card.currentValue || 0);
  const newValue = Number(updates.currentValue || 0);

  const valueHistory = Array.isArray(card.valueHistory)
    ? [...card.valueHistory]
    : [];

  if (newValue !== previousValue) {
    valueHistory.push({
      date: new Date().toISOString(),
      value: newValue,
      source: "manual"
    });
  }

  const updatedCard = {
    ...card,
    ...updates,
    currentValue: newValue,
    valueHistory,
    updatedAt: new Date().toISOString()
  };

  await saveCard(updatedCard);
  await loadCards();
}

function buildCardSearchText(card) {
  return [
    card.year,
    card.manufacturer,
    card.setName,
    card.player,
    card.cardNumber ? `#${card.cardNumber}` : ""
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function filterCards(query) {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return allCards;

  return allCards.filter(card => {
    return [
      card.player,
      card.year,
      card.setName,
      card.manufacturer,
      card.cardNumber,
      card.sport,
      card.currentValue
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}
