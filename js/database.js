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
