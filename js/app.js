const cardForm = document.getElementById("cardForm");
const cardList = document.getElementById("cardList");
const searchInput = document.getElementById("searchInput");

const totalCards = document.getElementById("totalCards");
const totalValue = document.getElementById("totalValue");
const portfolioCards = document.getElementById("portfolioCards");
const portfolioValue = document.getElementById("portfolioValue");

const screenTitle = document.getElementById("screenTitle");
const navButtons = document.querySelectorAll("[data-nav]");

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
  navButtons.forEach(button => {
    button.addEventListener("click", () => {
      navigateTo(button.dataset.nav);
    });
  });
}

function navigateTo(screenId) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  document.getElementById(screenId).classList.add("active");

  navButtons.forEach(button => {
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

      const searchQuery = encodeURIComponent(
        `${card.year} ${card.manufacturer} ${card.setName} ${card.player} ${card.cardNumber}`
      );

      const frontImageHTML = card.frontImage
        ? `<img class="card-image" src="${card.frontImage}" alt="Front image of ${escapeHTML(card.player)} card">`
        : "";

      const backImageHTML = card.backImage
        ? `<img class="card-image" src="${card.backImage}" alt="Back image of ${escapeHTML(card.player)} card">`
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
          <a href="https://130point.com/sales/?search=${searchQuery}" target="_blank" rel="noopener">
            130 Point
          </a>

          <button class="delete-btn" data-id="${card.id}">
            Delete
          </button>
        </div>
      `;

      cardList.appendChild(cardElement);
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

function filterCards(query) {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return allCards;
  }

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
