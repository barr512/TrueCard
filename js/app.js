const cardForm = document.getElementById("cardForm");
const cardList = document.getElementById("cardList");
const searchInput = document.getElementById("searchInput");
const filterBy = document.getElementById("filterBy");
const filterValue = document.getElementById("filterValue");
const sortBy = document.getElementById("sortBy");
const cardType = document.getElementById("cardType");
const gradedCardFields = document.getElementById("gradedCardFields");
const gradingCompany = document.getElementById("gradingCompany");
const professionalGrade = document.getElementById("professionalGrade");
const certificationNumber = document.getElementById("certificationNumber");
const scanCardButton = document.querySelector('[data-nav="scanScreen"]');
const addManualButton = document.getElementById("addManualButton");
const totalCards = document.getElementById("totalCards");
const totalValue = document.getElementById("totalValue");
const portfolioCards = document.getElementById("portfolioCards");
const portfolioValue = document.getElementById("portfolioValue");

const cardSetForm = document.getElementById("cardSetForm");
const cardSetList = document.getElementById("cardSetList");
const setYear = document.getElementById("setYear");
const setManufacturer = document.getElementById("setManufacturer");
const trackedSetName = document.getElementById("trackedSetName");
const setSport = document.getElementById("setSport");
const setGeneralGrade = document.getElementById("setGeneralGrade");
const setCardCount = document.getElementById("setCardCount");
const setNotes = document.getElementById("setNotes");

const screenTitle = document.getElementById("screenTitle");

const detailPlayer = document.getElementById("detailPlayer");
const detailSubtitle = document.getElementById("detailSubtitle");
const detailYear = document.getElementById("detailYear");
const detailSet = document.getElementById("detailSet");
const detailRelease = document.getElementById("detailRelease");
const detailManufacturer = document.getElementById("detailManufacturer");
const detailNumber = document.getElementById("detailNumber");
const detailSport = document.getElementById("detailSport");
const detailStatus = document.getElementById("detailStatus");
const detailValue = document.getElementById("detailValue");
const detailNotes = document.getElementById("detailNotes");
const detailCardType = document.getElementById("detailCardType");
const detailGradingCompany = document.getElementById("detailGradingCompany");
const detailProfessionalGrade = document.getElementById("detailProfessionalGrade");
const detailCertificationNumber = document.getElementById("detailCertificationNumber");
const detailSuggestedGrade = document.getElementById("detailSuggestedGrade");
const detailPurchasePrice = document.getElementById("detailPurchasePrice");
const detailDesiredSalePrice = document.getElementById("detailDesiredSalePrice");
const detailValueSource = document.getElementById("detailValueSource");
const detailGradeExplanation = document.getElementById("detailGradeExplanation");

const detailGradingCompanyRow =
  document.getElementById("detailGradingCompanyRow");

const detailGradeRow =
  document.getElementById("detailGradeRow");

const detailCertificationRow =
  document.getElementById("detailCertificationRow");
const detailFrontImage = document.getElementById("detailFrontImage");
const detailBackImage = document.getElementById("detailBackImage");
const detailCopySearchButton = document.getElementById("detailCopySearchButton");
const detailEditButton = document.getElementById("detailEditButton");
const detailDeleteButton = document.getElementById("detailDeleteButton");
const editCardPanel = document.getElementById("editCardPanel");
const editPlayer = document.getElementById("editPlayer");
const editYear = document.getElementById("editYear");
const editSetName = document.getElementById("editSetName");
const editReleaseName = document.getElementById("editReleaseName");
const editManufacturer = document.getElementById("editManufacturer");
const editCardNumber = document.getElementById("editCardNumber");
const editSport = document.getElementById("editSport");
const editCurrentValue = document.getElementById("editCurrentValue");
const editValueSource = document.getElementById("editValueSource");
const editPurchasePrice = document.getElementById("editPurchasePrice");
const editPurchaseDate = document.getElementById("editPurchaseDate");
const editDesiredSalePrice = document.getElementById("editDesiredSalePrice");
const editSalePlatform = document.getElementById("editSalePlatform");
const editSuggestedGrade = document.getElementById("editSuggestedGrade");
const editGradeExplanation = document.getElementById("editGradeExplanation");
const editCardType = document.getElementById("editCardType");
const editGradedCardFields =
  document.getElementById("editGradedCardFields");

const editGradingCompany =
  document.getElementById("editGradingCompany");

const editProfessionalGrade =
  document.getElementById("editProfessionalGrade");

const editCertificationNumber =
  document.getElementById("editCertificationNumber");
const editNotes = document.getElementById("editNotes");
const saveEditButton = document.getElementById("saveEditButton");
let allCards = [];
let selectedCard = null;

document.addEventListener("DOMContentLoaded", async () => {
  console.log("TrueCard location:", window.location.href);
  console.log("TrueCard origin:", window.location.origin);

  setupNavigation();
setupRecognitionListener();
setupCardTypeControls();
  setupSetTracking();

  if (addManualButton) {
    addManualButton.addEventListener("click", () => {
      prepareManualCardForm();
      navigateTo("scanScreen");
    });
  }

  try {
    await Promise.all([
      loadCards(),
      loadCardSets()
    ]);
    console.log(`Loaded ${allCards.length} stored cards.`);
  } catch (error) {
    console.error("Could not load saved cards:", error);
    alert(`Could not load saved cards:\n${error.message}`);
  }
});
function setupCardTypeControls() {
  if (cardType) {
    cardType.addEventListener("change", updateCardTypeFields);
  }

  if (editCardType) {
    editCardType.addEventListener(
      "change",
      updateEditCardTypeFields
    );
  }

  updateCardTypeFields();
  updateEditCardTypeFields();
}

function updateCardTypeFields() {
  const isGraded =
    cardType && cardType.value === "graded";

  if (gradedCardFields) {
    gradedCardFields.hidden = !isGraded;
  }

  if (scanFrontButton) {
    scanFrontButton.textContent = isGraded
      ? "Scan Slab Front"
      : "Scan Front";
  }

  if (scanBackButton) {
    scanBackButton.textContent = isGraded
      ? "Scan Slab Back"
      : "Scan Back";
  }
}

function updateEditCardTypeFields() {
  const isGraded =
    editCardType && editCardType.value === "graded";

  if (editGradedCardFields) {
    editGradedCardFields.hidden = !isGraded;
  }
}
function prepareManualCardForm() {
  cardForm.reset();
clearScannedImages();

cardType.value = "raw";
updateCardTypeFields();

  const recognitionStatus =
    document.getElementById("recognitionStatus");

  const recognizedCardDetails =
    document.getElementById("recognizedCardDetails");

  if (recognitionStatus) {
    recognitionStatus.hidden = true;
    recognitionStatus.style.display = "none";
  }

  if (recognizedCardDetails) {
    recognizedCardDetails.hidden = true;
    recognizedCardDetails.innerHTML = "";
  }
}
cardForm.addEventListener("submit", async event => {
  event.preventDefault();

  const scannedImages = getScannedImages();

  const card = {
    id: crypto.randomUUID(),
    player: document.getElementById("player").value.trim(),
    year: document.getElementById("year").value.trim(),
    setName: document.getElementById("setName").value.trim(),
    releaseName: document.getElementById("releaseName").value.trim(),
    manufacturer: document.getElementById("manufacturer").value.trim(),
    cardNumber: document.getElementById("cardNumber").value.trim(),
    sport: document.getElementById("sport").value,
    currentValue: Number(document.getElementById("currentValue").value || 0),
    valueSource: document.getElementById("valueSource").value.trim(),
    suggestedGrade: document.getElementById("suggestedGrade").value.trim(),
    gradeExplanation: document.getElementById("gradeExplanation").value.trim(),

cardType: cardType.value || "raw",

gradingCompany:
  cardType.value === "graded"
    ? gradingCompany.value.trim()
    : "",

professionalGrade:
  cardType.value === "graded"
    ? professionalGrade.value.trim()
    : "",

certificationNumber:
  cardType.value === "graded"
    ? certificationNumber.value.trim()
    : "",

purchasePrice: document.getElementById("purchasePrice").value
      ? Number(document.getElementById("purchasePrice").value)
      : null,
    purchaseDate: document.getElementById("purchaseDate").value || null,
    desiredSalePrice: document.getElementById("desiredSalePrice").value
      ? Number(document.getElementById("desiredSalePrice").value)
      : null,
    salePlatform: document.getElementById("salePlatform").value || "eBay",
    salePrice: null,
    saleDate: null,
    fees: null,
    shippingCost: null,
    gradingCost: null,

    storageLocation: "",
    notes: document.getElementById("notes").value.trim(),
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

const savedCards = await getAllCards();
console.log("Cards currently stored:", savedCards.length);

cardForm.reset();
clearScannedImages();

cardType.value = "raw";
updateCardTypeFields();

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
    document.getElementById("releaseName").value = card.releaseName || "";
    document.getElementById("setName").value = card.setName || "";
    document.getElementById("cardNumber").value = card.number || "";

    const recognizedSport = card.sport || "";
    const sportSelect = document.getElementById("sport");

    if (
      recognizedSport &&
      [...sportSelect.options].some(option => option.value === recognizedSport)
    ) {
      sportSelect.value = recognizedSport;
    }

    const recognizedCardDetails =
      document.getElementById("recognizedCardDetails");

    if (recognizedCardDetails) {
      const cacheHit = Boolean(result.truecardCache?.hit);
      recognizedCardDetails.hidden = false;
      recognizedCardDetails.innerHTML = `
        <h3>${cacheHit ? "Saved identification reused" : "Card identified"}</h3>
        <div class="detail-row">
          <span class="label">Source</span>
          <span class="value">
            ${cacheHit ? "Local recognition cache" : "CardSight"}
          </span>
        </div>
        <div class="detail-row">
          <span class="label">Confidence</span>
          <span class="value">
            ${escapeHTML(bestMatch.confidence || "Not provided")}
          </span>
        </div>
      `;
    }

    console.log("Card identified:", {
      confidence: bestMatch.confidence,
      cacheHit: Boolean(result.truecardCache?.hit),
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
    setsScreen: "Sets",
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
        ? `<img class="collection-thumbnail" src="${card.frontImage}" alt="Front of ${escapeHTML(card.player || "card")}">`
        : `<div class="collection-thumbnail placeholder">No image</div>`;

      const gradeLabel = card.cardType === "graded"
        ? [card.gradingCompany || "Graded", card.professionalGrade]
            .filter(Boolean)
            .join(" ")
        : card.suggestedGrade
          ? `Estimated ${card.suggestedGrade}`
          : "Raw card";

      cardElement.innerHTML = `
        <div class="compact-card-main">
          ${frontImageHTML}

          <div class="compact-card-copy">
            <div class="compact-card-heading">
              <div>
                <p class="compact-card-kicker">
                  ${escapeHTML([card.year, card.manufacturer].filter(Boolean).join(" • ") || "Card")}
                </p>
                <h3>${escapeHTML(card.player || "Unknown Player")}</h3>
              </div>
              <strong class="compact-card-value">
                ${formatCurrency(card.currentValue || 0)}
              </strong>
            </div>

            <p class="compact-card-set">
              ${escapeHTML(card.releaseName || card.setName || "Unknown set")}
              ${card.cardNumber ? ` • #${escapeHTML(card.cardNumber)}` : ""}
            </p>

            <div class="compact-card-badges">
              <span>${escapeHTML(gradeLabel)}</span>
              ${card.sport ? `<span>${escapeHTML(card.sport)}</span>` : ""}
              ${card.favorite ? "<span>Favorite</span>" : ""}
            </div>
          </div>
        </div>

        <div class="card-actions compact-actions">
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
  detailRelease.textContent = card.releaseName || "—";
  detailManufacturer.textContent = card.manufacturer || "—";
  detailNumber.textContent = card.cardNumber || "—";
  detailSport.textContent = card.sport || "—";
  detailValue.textContent = formatCurrency(card.currentValue || 0);
const isGraded = card.cardType === "graded";

detailCardType.textContent = isGraded
  ? "Graded Card"
  : "Raw Card";

detailGradingCompanyRow.hidden = !isGraded;
detailGradeRow.hidden = !isGraded;
detailCertificationRow.hidden = !isGraded;

detailGradingCompany.textContent =
  card.gradingCompany || "—";

detailProfessionalGrade.textContent =
  card.professionalGrade || "—";

detailCertificationNumber.textContent =
  card.certificationNumber || "—";

detailSuggestedGrade.textContent =
  card.suggestedGrade || "—";

detailPurchasePrice.textContent =
  card.purchasePrice == null
    ? "—"
    : formatCurrency(card.purchasePrice);

detailDesiredSalePrice.textContent =
  card.desiredSalePrice == null
    ? "—"
    : formatCurrency(card.desiredSalePrice);

detailValueSource.textContent =
  card.valueSource || "—";

detailGradeExplanation.textContent =
  card.gradeExplanation?.trim() ||
  "No grade estimate yet.";

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
  editReleaseName.value = card.releaseName || "";
  editManufacturer.value = card.manufacturer || "";
  editCardNumber.value = card.cardNumber || "";
  editSport.value = card.sport || "";
  editCurrentValue.value = card.currentValue ?? "";
  editValueSource.value = card.valueSource || "";
  editPurchasePrice.value = card.purchasePrice ?? "";
  editPurchaseDate.value = card.purchaseDate || "";
  editDesiredSalePrice.value = card.desiredSalePrice ?? "";
  editSalePlatform.value = card.salePlatform || "eBay";
  editSuggestedGrade.value = card.suggestedGrade || "";
  editGradeExplanation.value = card.gradeExplanation || "";

editCardType.value =
  card.cardType === "graded"
    ? "graded"
    : "raw";

editGradingCompany.value =
  card.gradingCompany || "";

editProfessionalGrade.value =
  card.professionalGrade || "";

editCertificationNumber.value =
  card.certificationNumber || "";

updateEditCardTypeFields();

editNotes.value = card.notes || "";
   saveEditButton.onclick = async () => {

  card.player = editPlayer.value.trim();
  card.year = editYear.value.trim();
  card.setName = editSetName.value.trim();
  card.releaseName = editReleaseName.value.trim();
  card.manufacturer = editManufacturer.value.trim();
  card.cardNumber = editCardNumber.value.trim();
  card.sport = editSport.value.trim();
 card.currentValue = Number(editCurrentValue.value || 0);
card.valueSource = editValueSource.value.trim();
card.purchasePrice = editPurchasePrice.value
  ? Number(editPurchasePrice.value)
  : null;
card.purchaseDate = editPurchaseDate.value || null;
card.desiredSalePrice = editDesiredSalePrice.value
  ? Number(editDesiredSalePrice.value)
  : null;
card.salePlatform = editSalePlatform.value || "eBay";
card.suggestedGrade = editSuggestedGrade.value.trim();
card.gradeExplanation = editGradeExplanation.value.trim();

card.cardType =
  editCardType.value === "graded"
    ? "graded"
    : "raw";

card.gradingCompany =
  card.cardType === "graded"
    ? editGradingCompany.value.trim()
    : "";

card.professionalGrade =
  card.cardType === "graded"
    ? editProfessionalGrade.value.trim()
    : "";

card.certificationNumber =
  card.cardType === "graded"
    ? editCertificationNumber.value.trim()
    : "";

card.notes = editNotes.value.trim();

card.updatedAt = new Date().toISOString();

  await saveCard(card);

  editCardPanel.hidden = true;

  await loadCards();

  openDetail(card);

  alert("Card updated successfully.");

};   
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

function setupSetTracking() {
  if (!cardSetForm) return;

  cardSetForm.addEventListener("submit", async event => {
    event.preventDefault();

    const year = setYear.value.trim();
    const manufacturer = setManufacturer.value.trim();

    if (!year || !manufacturer) {
      alert("Year and manufacturer are required.");
      return;
    }

    await saveCardSet({
      year,
      manufacturer,
      setName: trackedSetName.value.trim(),
      sport: setSport.value || "Baseball",
      generalGrade: setGeneralGrade.value.trim(),
      cardCount: setCardCount.value
        ? Number(setCardCount.value)
        : null,
      notes: setNotes.value.trim()
    });

    cardSetForm.reset();
    setSport.value = "Baseball";
    await loadCardSets();
  });
}

async function loadCardSets() {
  if (!cardSetList || typeof getAllCardSets !== "function") {
    return;
  }

  const sets = await getAllCardSets();
  sets.sort((a, b) => {
    const yearDifference =
      Number(b.year || 0) - Number(a.year || 0);

    if (yearDifference) return yearDifference;

    return String(a.manufacturer || "").localeCompare(
      String(b.manufacturer || "")
    );
  });

  renderCardSets(sets);
}

function renderCardSets(sets) {
  cardSetList.innerHTML = "";

  if (!sets.length) {
    cardSetList.innerHTML = `
      <div class="panel">
        <p class="helper-text">
          No sets tracked yet. Add a complete or partial set above.
        </p>
      </div>
    `;
    return;
  }

  sets.forEach(cardSet => {
    const element = document.createElement("article");
    element.className = "set-card";

    element.innerHTML = `
      <div class="set-card-heading">
        <div>
          <p class="compact-card-kicker">
            ${escapeHTML(
              [cardSet.year, cardSet.sport]
                .filter(Boolean)
                .join(" • ")
            )}
          </p>
          <h3>
            ${escapeHTML(
              cardSet.setName ||
              cardSet.manufacturer ||
              "Unnamed set"
            )}
          </h3>
          <p>
            ${escapeHTML(cardSet.manufacturer || "")}
          </p>
        </div>

        ${cardSet.cardCount != null
          ? `<strong>${Number(cardSet.cardCount).toLocaleString()} cards</strong>`
          : ""}
      </div>

      <div class="compact-card-badges">
        ${cardSet.generalGrade
          ? `<span>${escapeHTML(cardSet.generalGrade)}</span>`
          : ""}
        <span>${escapeHTML(cardSet.sport || "Other")}</span>
      </div>

      ${cardSet.notes
        ? `<p class="set-notes">${escapeHTML(cardSet.notes)}</p>`
        : ""}

      <button
        type="button"
        class="delete-btn set-delete"
        data-delete-set-id="${cardSet.id}"
      >
        Delete Set
      </button>
    `;

    cardSetList.appendChild(element);
  });

  document.querySelectorAll("[data-delete-set-id]")
    .forEach(button => {
      button.addEventListener("click", async () => {
        const confirmed = confirm(
          "Delete this tracked set? Individual card records will not be affected."
        );

        if (!confirmed) return;

        await deleteCardSet(button.dataset.deleteSetId);
        await loadCardSets();
      });
    });
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
card.currentValue,
card.cardType,
card.gradingCompany,
card.professionalGrade,
card.certificationNumber
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
card.currentValue,
card.cardType,
card.gradingCompany,
card.professionalGrade,
card.certificationNumber
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
  return getLastName(a.player).localeCompare(getLastName(b.player));
}

if (sort === "playerZA") {
  return getLastName(b.player).localeCompare(getLastName(a.player));
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
function getLastName(name) {
  const parts = String(name || "")
    .trim()
    .toLowerCase()
    .split(/\s+/);

  return parts.length ? parts[parts.length - 1] : "";
}
