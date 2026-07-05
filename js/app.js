const cardForm = document.getElementById("cardForm");
const cardList = document.getElementById("cardList");
const searchInput = document.getElementById("searchInput");
const filterBy = document.getElementById("filterBy");
const filterValue = document.getElementById("filterValue");
const sortBy = document.getElementById("sortBy");
const scanCardButton = document.querySelector('[data-nav="scanScreen"]');
const totalCards = document.getElementById("totalCards");
const totalValue = document.getElementById("totalValue");
const portfolioCards = document.getElementById("portfolioCards");
const portfolioValue = document.getElementById("portfolioValue");

const screenTitle = document.getElementById("screenTitle");

const detailPlayer = document.getElementById("detailPlayer");
const detailSubtitle = document.getElementById("detailSubtitle");
const detailYear = document.getElementById("detailYear");
const detailSet = document.getElementById("detailSet");
const detailManufacturer = document.getElementById("detailManufacturer");
const detailNumber = document.getElementById("detailNumber");
const detailSport = document.getElementById("detailSport");
const detailStatus = document.getElementById("detailStatus");
const detailValue = document.getElementById("detailValue");
const detailNotes = document.getElementById("detailNotes");
const detailFrontImage = document.getElementById("detailFrontImage");
const detailBackImage = document.getElementById("detailBackImage");
const detailCopySearchButton = document.getElementById("detailCopySearchButton");
const detailEditButton = document.getElementById("detailEditButton");
const detailDeleteButton = document.getElementById("detailDeleteButton");
const editCardPanel = document.getElementById("editCardPanel");
const editPlayer = document.getElementById("editPlayer");
const editYear = document.getElementById("editYear");
const editSetName = document.getElementById("editSetName");
const editManufacturer = document.getElementById("editManufacturer");
const editCardNumber = document.getElementById("editCardNumber");
const editSport = document.getElementById("editSport");
const editCurrentValue = document.getElementById("editCurrentValue");
const editNotes = document.getElementById("editNotes");
const saveEditButton = document.getElementById("saveEditButton");
let allCards = [];
let selectedCard = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  setupRecognitionListener();

  if (scanCardButton) {
    scanCardButton.addEventListener("click", () => {
      navigateTo("scanScreen");
    });
  }

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

searchInput.addEventListener("input", updateCollectionView);

filterBy.addEventListener("change", () => {
  populateFilterValues();
  updateCollectionView();
});

filterValue.addEventListener("change", updateCollectionView);
sortBy.addEventListener("change", updateCollectionView);

function setupRecognitionListener() {
  document.addEventListener("frontImageCaptured", async event => {
    const blob = event.detail.blob;
    const status = document.getElementById("recognitionStatus");

    status.hidden = false;
    status.style.display = "flex";

    const result = await identifyCard(blob);

    status.style.display = "none";
    status.hidden = true;

    if (!result || !result.detections || result.detections.length === 0) {
      alert("No card match found. You can enter the card manually.");
      return;
    }

    const bestMatch = result.detections[0];
    const card = bestMatch.card || {};

    document.getElementById("player").value = card.name || "";
    document.getElementById("year").value = card.year || "";
    document.getElementById("manufacturer").value = card.manufacturer || "";

    document.getElementById("setName").value =
      card.releaseName && card.setName && card.setName !== "Base Set"
        ? `${card.releaseName} - ${card.setName}`
        : card.releaseName || card.setName || "";

    document.getElementById("cardNumber").value = card.number || "";

    console.log("Card identified:", {
      confidence: bestMatch.confidence,
      card
    });
    
  });
}
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
    detailScreen: "Card Details",
    portfolioScreen: "Portfolio",
    settingsScreen: "Settings"
  };

  screenTitle.textContent = titles[screenId] || "TrueCard";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadCards() {
  allCards = await getAllCards();
  renderDashboard(allCards);
  populateFilterValues();
  updateCollectionView();
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
        <p class="helper-text">No cards yet. Scan your first card to begin.</p>
      </div>
    `;
    return;
  }

  cards.forEach(card => {
      const cardElement = document.createElement("article");
      cardElement.className = "collection-card compact-card";

      const frontImageHTML = card.frontImage
        ? `<img class="card-image" src="${card.frontImage}" alt="Front card image">`
        : "";

      cardElement.innerHTML = `
        ${frontImageHTML}

        <h3>${escapeHTML(card.player || "Unknown Player")}</h3>

        <p>${escapeHTML(card.year || "Unknown Year")}
        ${escapeHTML(card.manufacturer || "")}
        ${escapeHTML(card.setName || "")}</p>

        <p>Card #: ${escapeHTML(card.cardNumber || "N/A")}</p>

        <p>Value: ${formatCurrency(card.currentValue || 0)}</p>

        <div class="card-actions">
          <button data-view-id="${card.id}">View</button>
          <button data-comps-id="${card.id}">Copy Search</button>
          <button class="delete-btn" data-delete-id="${card.id}">Delete</button>
        </div>
      `;

      cardList.appendChild(cardElement);
    });

  wireCardButtons();
}

function wireCardButtons() {
  document.querySelectorAll("[data-view-id]").forEach(button => {
    button.addEventListener("click", () => {
      const card = allCards.find(item => item.id === button.dataset.viewId);
      if (!card) return;

      openDetail(card);
    });
  });

  document.querySelectorAll("[data-comps-id]").forEach(button => {
    button.addEventListener("click", async () => {
      const card = allCards.find(item => item.id === button.dataset.compsId);
      if (!card) return;

      const query = buildCardSearchText(card);

      try {
        await navigator.clipboard.writeText(query);
        alert(`Copied search text:\n\n${query}`);
      } catch {
        alert(`Search text:\n\n${query}`);
      }
    });
  });

  document.querySelectorAll("[data-delete-id]").forEach(button => {
    button.addEventListener("click", async () => {
      const confirmed = confirm("Delete this card?");
      if (!confirmed) return;

      await deleteCard(button.dataset.deleteId);
      await loadCards();
    });
  });
}

function openDetail(card) {
  selectedCard = card;

  detailPlayer.textContent = card.player || "Unknown Player";

  detailSubtitle.textContent = [
    card.year,
    card.manufacturer,
    card.setName
  ]
    .filter(Boolean)
    .join(" • ");

  detailYear.textContent = card.year || "—";
  detailSet.textContent = card.setName || "—";
  detailManufacturer.textContent = card.manufacturer || "—";
  detailNumber.textContent = card.cardNumber || "—";
  detailSport.textContent = card.sport || "—";
  detailValue.textContent = formatCurrency(card.currentValue || 0);

  detailStatus.textContent = card.sold
    ? "Sold"
    : card.wishlist
      ? "Wishlist"
      : "Owned";

  detailNotes.textContent =
    card.notes?.trim() || "No notes yet.";

  if (card.frontImage) {
    detailFrontImage.hidden = false;
    detailFrontImage.src = card.frontImage;
  } else {
    detailFrontImage.hidden = true;
    detailFrontImage.src = "";
  }

  if (card.backImage) {
    detailBackImage.hidden = false;
    detailBackImage.src = card.backImage;
  } else {
    detailBackImage.hidden = true;
    detailBackImage.src = "";
  }

  detailCopySearchButton.onclick = async () => {
    const query = buildCardSearchText(card);

    try {
      await navigator.clipboard.writeText(query);
      alert(`Copied search text:\n\n${query}`);
    } catch {
      alert(`Search text:\n\n${query}`);
    }
  };
    detailEditButton.onclick = () => {
  editCardPanel.hidden = false;

  editPlayer.value = card.player || "";
  editYear.value = card.year || "";
  editSetName.value = card.setName || "";
  editManufacturer.value = card.manufacturer || "";
  editCardNumber.value = card.cardNumber || "";
  editSport.value = card.sport || "";
  editCurrentValue.value = card.currentValue || "";
  editNotes.value = card.notes || "";
};

  detailDeleteButton.onclick = async () => {
    const confirmed = confirm("Delete this card?");
    if (!confirmed) return;

    await deleteCard(card.id);
    selectedCard = null;
    await loadCards();
    navigateTo("collectionScreen");
  };

  navigateTo("detailScreen");
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
function updateCollectionView() {
  let cards = [...allCards];

  cards = applySearch(cards);
  cards = applyFilter(cards);
  cards = applySort(cards);

  renderCards(cards);
}

function applySearch(cards) {
  const query = searchInput.value.toLowerCase().trim();

  if (!query) return cards;

  return cards.filter(card => {
    return [
      card.player,
      card.year,
      card.setName,
      card.manufacturer,
      card.cardNumber,
      card.sport,
      card.currentValue
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function applyFilter(cards) {
  const type = filterBy.value;
  const value = filterValue.value;

  if (type === "all") return cards;

  if (type === "favorites") {
    return cards.filter(card => card.favorite);
  }

  if (type === "wishlist") {
    return cards.filter(card => card.wishlist);
  }

  if (type === "sold") {
    return cards.filter(card => card.sold);
  }

  if (!value) return cards;

  return cards.filter(card => {
    if (type === "year") return String(card.year || "") === value;
    if (type === "sport") return String(card.sport || "") === value;
    if (type === "manufacturer") return String(card.manufacturer || "") === value;
    if (type === "set") return String(card.setName || "") === value;

    return true;
  });
}

function applySort(cards) {
  const sort = sortBy.value;

  return [...cards].sort((a, b) => {
    if (sort === "favorites") {
      return Number(b.favorite) - Number(a.favorite);
    }

    if (sort === "newest") {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }

    if (sort === "oldest") {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }

    if (sort === "highValue") {
      return Number(b.currentValue || 0) - Number(a.currentValue || 0);
    }

    if (sort === "lowValue") {
      return Number(a.currentValue || 0) - Number(b.currentValue || 0);
    }

    if (sort === "playerAZ") {
  return String(a.player || "")
    .toLowerCase()
    .localeCompare(String(b.player || "").toLowerCase());
}

    if (sort === "playerZA") {
  return String(b.player || "")
    .toLowerCase()
    .localeCompare(String(a.player || "").toLowerCase());
}

    if (sort === "yearNewest") {
      return Number(b.year || 0) - Number(a.year || 0);
    }

    if (sort === "yearOldest") {
      return Number(a.year || 0) - Number(b.year || 0);
    }

    return 0;
  });
}

function populateFilterValues() {
  const type = filterBy.value;

  filterValue.innerHTML = `<option value="">All</option>`;

  if (
    type === "all" ||
    type === "favorites" ||
    type === "wishlist" ||
    type === "sold"
  ) {
    filterValue.disabled = true;
    return;
  }

  filterValue.disabled = false;

  let values = [];

  if (type === "year") {
    values = allCards.map(card => card.year);
  }

  if (type === "sport") {
    values = allCards.map(card => card.sport);
  }

  if (type === "manufacturer") {
    values = allCards.map(card => card.manufacturer);
  }

  if (type === "set") {
    values = allCards.map(card => card.setName);
  }

  const uniqueValues = [...new Set(values.filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b)));

  uniqueValues.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    filterValue.appendChild(option);
  });
}
