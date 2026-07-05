/******************************************************************************
 *  TrueCard
 *  app.js
 *  PART 1 OF 3
 *
 *  Replace the beginning of your existing app.js with this.
 *  Stop after the line:
 *
 *      // ===== RENDER COLLECTION =====
 *
 *  Part 2 will continue immediately from there.
 ******************************************************************************/

/*=========================================================================
    ELEMENTS
=========================================================================*/

const cardForm = document.getElementById("cardForm");
const cardList = document.getElementById("cardList");
const searchInput = document.getElementById("searchInput");

const totalCards = document.getElementById("totalCards");
const totalValue = document.getElementById("totalValue");
const portfolioCards = document.getElementById("portfolioCards");
const portfolioValue = document.getElementById("portfolioValue");

const screenTitle = document.getElementById("screenTitle");

/*=========================================================================
    DETAIL SCREEN
=========================================================================*/

const detailPlayer = document.getElementById("detailPlayer");
const detailYear = document.getElementById("detailYear");
const detailSet = document.getElementById("detailSet");
const detailManufacturer = document.getElementById("detailManufacturer");
const detailNumber = document.getElementById("detailNumber");
const detailSport = document.getElementById("detailSport");
const detailValue = document.getElementById("detailValue");

const detailFrontImage = document.getElementById("detailFrontImage");
const detailBackImage = document.getElementById("detailBackImage");

const detailEditButton = document.getElementById("detailEditButton");
const detailDeleteButton = document.getElementById("detailDeleteButton");

/*=========================================================================
    GLOBALS
=========================================================================*/

let allCards = [];
let selectedCard = null;

/*=========================================================================
    STARTUP
=========================================================================*/

document.addEventListener("DOMContentLoaded", async () => {

    setupNavigation();

    await loadCards();

});

/*=========================================================================
    SAVE CARD
=========================================================================*/

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

        currentValue: Number(
            document.getElementById("currentValue").value || 0
        ),

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

/*=========================================================================
    SEARCH
=========================================================================*/

searchInput.addEventListener("input", () => {

    renderCards(filterCards(searchInput.value));

});

/*=========================================================================
    NAVIGATION
=========================================================================*/

function setupNavigation() {

    document.addEventListener("click", event => {

        const button = event.target.closest("[data-nav]");

        if (!button) return;

        navigateTo(button.dataset.nav);

    });

}

function navigateTo(screenId) {

    const target = document.getElementById(screenId);

    if (!target) return;

    document.querySelectorAll(".screen").forEach(screen => {

        screen.classList.remove("active");

    });

    target.classList.add("active");

    document.querySelectorAll(".bottom-nav button").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.nav === screenId
        );

    });

    const titles = {

        homeScreen: "Home",

        scanScreen: "Scan",

        collectionScreen: "Collection",

        detailScreen: "Card Details",

        portfolioScreen: "Portfolio",

        settingsScreen: "Settings"

    };

    screenTitle.textContent =
        titles[screenId] || "TrueCard";

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}

/*=========================================================================
    DATABASE
=========================================================================*/

async function loadCards() {

    allCards = await getAllCards();

    renderDashboard(allCards);

    renderCards(allCards);

}

/*=========================================================================
    DASHBOARD
=========================================================================*/

function renderDashboard(cards) {

    const value = cards.reduce((sum, card) => {

        return sum + Number(card.currentValue || 0);

    }, 0);

    totalCards.textContent = cards.length;

    portfolioCards.textContent = cards.length;

    totalValue.textContent = formatCurrency(value);

    portfolioValue.textContent = formatCurrency(value);

}

/*=========================================================================
    RENDER COLLECTION
=========================================================================*/
