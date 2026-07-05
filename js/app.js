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
/******************************************************************************
 *  app.js
 *  PART 2 OF 3
 *
 *  Continue immediately after:
 *
 *  // ===== RENDER COLLECTION =====
 ******************************************************************************/

function renderCards(cards) {

    cardList.innerHTML = "";

    if (cards.length === 0) {

        cardList.innerHTML = `
            <div class="panel">
                <p class="helper-text">
                    No cards yet.
                    Scan your first card to begin.
                </p>
            </div>
        `;

        return;
    }

    cards
        .sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        )
        .forEach(card => {

            const article = document.createElement("article");

            article.className = "collection-card";

            article.innerHTML = `

                ${
                    card.frontImage
                        ? `<img
                                class="card-image"
                                src="${card.frontImage}">
                          `
                        : ""
                }

                <h3>${escapeHTML(card.player || "Unknown Player")}</h3>

                <p>
                    ${escapeHTML(card.year || "")}
                    ${escapeHTML(card.manufacturer || "")}
                    ${escapeHTML(card.setName || "")}
                </p>

                <p>
                    Card #
                    ${escapeHTML(card.cardNumber || "N/A")}
                </p>

                <p>
                    ${formatCurrency(card.currentValue || 0)}
                </p>

                <div class="card-actions">

                    <button
                        data-view-id="${card.id}">
                        View
                    </button>

                    <button
                        data-comps-id="${card.id}">
                        130 Point
                    </button>

                    <button
                        class="delete-btn"
                        data-delete-id="${card.id}">
                        Delete
                    </button>

                </div>

            `;

            cardList.appendChild(article);

        });

    wireButtons();

}

/*=========================================================================
    BUTTON EVENTS
=========================================================================*/

function wireButtons() {

    document
        .querySelectorAll("[data-view-id]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const card = allCards.find(

                    c => c.id === button.dataset.viewId

                );

                if (!card) return;

                openDetail(card);

            });

        });

    document
        .querySelectorAll("[data-comps-id]")
        .forEach(button => {

            button.addEventListener("click", async () => {

                const card = allCards.find(

                    c => c.id === button.dataset.compsId

                );

                if (!card) return;

                const query = buildCardSearchText(card);

                try {

                    await navigator.clipboard.writeText(query);

                    alert(
                        `Copied search text:\n\n${query}`
                    );

                }

                catch {

                    alert(query);

                }

                window.open(
                    "https://130point.com/sales/",
                    "_blank",
                    "noopener"
                );

            });

        });

    document
        .querySelectorAll("[data-delete-id]")
        .forEach(button => {

            button.addEventListener("click", async () => {

                if (!confirm("Delete this card?"))
                    return;

                await deleteCard(button.dataset.deleteId);

                await loadCards();

            });

        });

}

/*=========================================================================
    DETAIL SCREEN
=========================================================================*/

function openDetail(card) {

    selectedCard = card;

    detailPlayer.textContent =
        card.player || "Unknown Player";

    detailYear.textContent =
        card.year || "-";

    detailSet.textContent =
        card.setName || "-";

    detailManufacturer.textContent =
        card.manufacturer || "-";

    detailNumber.textContent =
        card.cardNumber || "-";

    detailSport.textContent =
        card.sport || "-";

    detailValue.textContent =
        formatCurrency(card.currentValue || 0);

    if (card.frontImage) {

        detailFrontImage.hidden = false;

        detailFrontImage.src = card.frontImage;

    } else {

        detailFrontImage.hidden = true;

    }

    if (card.backImage) {

        detailBackImage.hidden = false;

        detailBackImage.src = card.backImage;

    } else {

        detailBackImage.hidden = true;

    }

    detailEditButton.onclick = () => {

        alert(
            "Edit screen coming in the next sprint."
        );

    };

    detailDeleteButton.onclick = async () => {

        if (!confirm("Delete this card?"))
            return;

        await deleteCard(card.id);

        navigateTo("collectionScreen");

        await loadCards();

    };

    navigateTo("detailScreen");

}

/*=========================================================================
    FILTER
=========================================================================*/

function filterCards(query) {

    const q = query
        .trim()
        .toLowerCase();

    if (!q)
        return allCards;

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
            .includes(q);

    });

}

/*=========================================================================
    UTILITIES
=========================================================================*/
/******************************************************************************
 *  app.js
 *  PART 3 OF 3
 *
 *  Continue immediately after:
 *
 *  // ===== UTILITIES =====
 ******************************************************************************/

/*=========================================================================
    BUILD 130 POINT SEARCH
=========================================================================*/

function buildCardSearchText(card) {

    return [

        card.year,

        card.manufacturer,

        card.setName,

        card.player,

        card.cardNumber
            ? `#${card.cardNumber}`
            : ""

    ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

}

/*=========================================================================
    CURRENCY
=========================================================================*/

function formatCurrency(value) {

    return Number(value || 0).toLocaleString(

        "en-US",

        {

            style: "currency",

            currency: "USD"

        }

    );

}

/*=========================================================================
    HTML ESCAPE
=========================================================================*/

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

/*=========================================================================
    FUTURE PLACEHOLDERS
=========================================================================*/

/*
    Sprint 2
    --------

    editCard(card)

    saveCardEdits()

    cancelEdit()

*/

/*
    Sprint 3
    --------

    sortCards()

    filterBySport()

    filterByGrade()

    filterByManufacturer()

*/

/*
    Sprint 4
    --------

    AI Condition Analysis

    Auto Card Identification

    Auto Population

*/

/******************************************************************************
 *  END OF FILE
 ******************************************************************************/
