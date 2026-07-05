const cardForm = document.getElementById("cardForm");
const cardList = document.getElementById("cardList");
const searchInput = document.getElementById("searchInput");

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

let allCards = [];
let selectedCard = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  setupRecognitionListener();
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
