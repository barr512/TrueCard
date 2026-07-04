const DB_NAME = "TrueCardDB";
const DB_VERSION = 1;
const CARD_STORE = "cards";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = event => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(CARD_STORE)) {
        const store = db.createObjectStore(CARD_STORE, {
          keyPath: "id"
        });

        store.createIndex("player", "player", { unique: false });
        store.createIndex("year", "year", { unique: false });
        store.createIndex("setName", "setName", { unique: false });
        store.createIndex("sport", "sport", { unique: false });
      }
    };
  });
}

async function saveCard(card) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CARD_STORE, "readwrite");
    const store = transaction.objectStore(CARD_STORE);

    store.put(card);

    transaction.oncomplete = () => resolve(card);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getAllCards() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CARD_STORE, "readonly");
    const store = transaction.objectStore(CARD_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteCard(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CARD_STORE, "readwrite");
    const store = transaction.objectStore(CARD_STORE);

    store.delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
