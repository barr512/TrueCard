const DB_NAME = "TrueCardDB";
const DB_VERSION = 2;

const CARD_STORE = "cards";
const SET_STORE = "cardSets";
const RECOGNITION_STORE = "recognitionCache";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = event => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(CARD_STORE)) {
        const cards = db.createObjectStore(CARD_STORE, {
          keyPath: "id"
        });

        cards.createIndex("player", "player", { unique: false });
        cards.createIndex("year", "year", { unique: false });
        cards.createIndex("setName", "setName", { unique: false });
        cards.createIndex("sport", "sport", { unique: false });
      }

      if (!db.objectStoreNames.contains(SET_STORE)) {
        const sets = db.createObjectStore(SET_STORE, {
          keyPath: "id"
        });

        sets.createIndex("year", "year", { unique: false });
        sets.createIndex("manufacturer", "manufacturer", { unique: false });
        sets.createIndex("setName", "setName", { unique: false });
        sets.createIndex("sport", "sport", { unique: false });
      }

      if (!db.objectStoreNames.contains(RECOGNITION_STORE)) {
        const recognitionCache = db.createObjectStore(RECOGNITION_STORE, {
          keyPath: "fingerprint"
        });

        recognitionCache.createIndex("cardIdentity", "cardIdentity", {
          unique: false
        });
        recognitionCache.createIndex("createdAt", "createdAt", {
          unique: false
        });
      }
    };
  });
}

function runStoreRequest(storeName, mode, requestFactory) {
  return openDatabase().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = requestFactory(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  }));
}

async function saveCard(card) {
  await runStoreRequest(CARD_STORE, "readwrite", store => store.put(card));
  return card;
}

function getAllCards() {
  return runStoreRequest(CARD_STORE, "readonly", store => store.getAll());
}

function deleteCard(id) {
  return runStoreRequest(CARD_STORE, "readwrite", store => store.delete(id));
}

async function saveCardSet(cardSet) {
  const record = {
    id: cardSet.id || crypto.randomUUID(),
    year: "",
    manufacturer: "",
    setName: "",
    sport: "Baseball",
    generalGrade: "",
    cardCount: null,
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...cardSet
  };

  record.updatedAt = new Date().toISOString();
  await runStoreRequest(SET_STORE, "readwrite", store => store.put(record));
  return record;
}

function getAllCardSets() {
  return runStoreRequest(SET_STORE, "readonly", store => store.getAll());
}

function deleteCardSet(id) {
  return runStoreRequest(SET_STORE, "readwrite", store => store.delete(id));
}

async function saveRecognition(record) {
  const cached = {
    fingerprint: record.fingerprint,
    cardIdentity: record.cardIdentity || "",
    result: record.result || null,
    source: record.source || "cardsight",
    createdAt: record.createdAt || new Date().toISOString(),
    lastUsedAt: new Date().toISOString()
  };

  await runStoreRequest(
    RECOGNITION_STORE,
    "readwrite",
    store => store.put(cached)
  );

  return cached;
}

function getRecognition(fingerprint) {
  return runStoreRequest(
    RECOGNITION_STORE,
    "readonly",
    store => store.get(fingerprint)
  );
}

function getAllRecognitions() {
  return runStoreRequest(
    RECOGNITION_STORE,
    "readonly",
    store => store.getAll()
  );
}

function clearRecognitionCache() {
  return runStoreRequest(
    RECOGNITION_STORE,
    "readwrite",
    store => store.clear()
  );
}


async function createBackupSnapshot() {
  const [cards, cardSets, recognitions] = await Promise.all([
    getAllCards(),
    getAllCardSets(),
    getAllRecognitions()
  ]);

  return {
    format: "TrueCardBackup",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      cards,
      cardSets,
      recognitions
    }
  };
}

async function restoreBackupSnapshot(snapshot) {
  validateBackupSnapshot(snapshot);

  const db = await openDatabase();
  const transaction = db.transaction(
    [CARD_STORE, SET_STORE, RECOGNITION_STORE],
    "readwrite"
  );

  const cardStore = transaction.objectStore(CARD_STORE);
  const setStore = transaction.objectStore(SET_STORE);
  const recognitionStore =
    transaction.objectStore(RECOGNITION_STORE);

  snapshot.data.cards.forEach(card => {
    cardStore.put(card);
  });

  snapshot.data.cardSets.forEach(cardSet => {
    setStore.put(cardSet);
  });

  snapshot.data.recognitions.forEach(recognition => {
    recognitionStore.put(recognition);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({
      cards: snapshot.data.cards.length,
      cardSets: snapshot.data.cardSets.length,
      recognitions: snapshot.data.recognitions.length
    });

    transaction.onerror = () => reject(
      transaction.error ||
      new Error("The backup could not be restored.")
    );

    transaction.onabort = () => reject(
      transaction.error ||
      new Error("The backup restore was cancelled.")
    );
  });
}

function validateBackupSnapshot(snapshot) {
  if (
    !snapshot ||
    snapshot.format !== "TrueCardBackup" ||
    snapshot.version !== 1 ||
    !snapshot.data
  ) {
    throw new Error(
      "This file is not a supported TrueCard backup."
    );
  }

  const collections = [
    ["cards", snapshot.data.cards],
    ["card sets", snapshot.data.cardSets],
    ["recognition cache", snapshot.data.recognitions]
  ];

  collections.forEach(([label, value]) => {
    if (!Array.isArray(value)) {
      throw new Error(
        `The backup has an invalid ${label} section.`
      );
    }
  });

  snapshot.data.cards.forEach(card => {
    if (!card || typeof card.id !== "string") {
      throw new Error(
        "The backup contains a card without a valid ID."
      );
    }
  });

  snapshot.data.cardSets.forEach(cardSet => {
    if (!cardSet || typeof cardSet.id !== "string") {
      throw new Error(
        "The backup contains a set without a valid ID."
      );
    }
  });

  snapshot.data.recognitions.forEach(recognition => {
    if (
      !recognition ||
      typeof recognition.fingerprint !== "string"
    ) {
      throw new Error(
        "The backup contains an invalid recognition record."
      );
    }
  });
}
