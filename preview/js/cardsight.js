const TRUECARD_IDENTIFY_URL =
  "https://truecard-api.brentshortusda.workers.dev/identify-card";

const CACHE_DISTANCE_LIMIT = 3;

async function identifyCard(imageBlob) {
  let fingerprint = "";

  try {
    fingerprint = await createImageFingerprint(imageBlob);
    const cached = await findCachedRecognition(fingerprint);

    if (cached?.result) {
      await saveRecognition({
        ...cached,
        lastUsedAt: new Date().toISOString()
      });

      return {
        ...cached.result,
        truecardCache: {
          hit: true,
          source: cached.source || "cardsight"
        }
      };
    }
  } catch (error) {
    console.warn("Recognition cache check skipped:", error);
  }

  const formData = new FormData();
  formData.append("image", imageBlob);

  try {
    const response = await fetch(TRUECARD_IDENTIFY_URL, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`TrueCard API Error: ${response.status}`);
    }

    const result = await response.json();

    if (fingerprint && result?.detections?.length) {
      const bestCard = result.detections[0]?.card || {};

      await saveRecognition({
        fingerprint,
        cardIdentity: buildCardIdentity(bestCard),
        result,
        source: "cardsight"
      });
    }

    return {
      ...result,
      truecardCache: {
        hit: false,
        source: "cardsight"
      }
    };
  } catch (error) {
    console.error(error);
    alert("Unable to identify card.");
    return null;
  }
}

async function findCachedRecognition(fingerprint) {
  if (!fingerprint || typeof getAllRecognitions !== "function") {
    return null;
  }

  const records = await getAllRecognitions();
  let closest = null;
  let closestDistance = Infinity;

  records.forEach(record => {
    const distance = fingerprintDistance(
      fingerprint,
      record.fingerprint
    );

    if (distance < closestDistance) {
      closest = record;
      closestDistance = distance;
    }
  });

  return closestDistance <= CACHE_DISTANCE_LIMIT ? closest : null;
}

async function createImageFingerprint(imageBlob) {
  const source = await loadFingerprintImage(imageBlob);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", {
    willReadFrequently: true
  });

  canvas.width = 9;
  canvas.height = 8;
  context.drawImage(source, 0, 0, 9, 8);

  const pixels = context.getImageData(0, 0, 9, 8).data;
  let bits = "";

  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const left = grayscaleAt(pixels, row * 9 + column);
      const right = grayscaleAt(pixels, row * 9 + column + 1);
      bits += left > right ? "1" : "0";
    }
  }

  if (typeof source.close === "function") {
    source.close();
  }

  return binaryToHex(bits);
}

async function loadFingerprintImage(imageBlob) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(imageBlob);
  }

  const imageUrl = URL.createObjectURL(imageBlob);

  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(
        new Error("Could not read captured image.")
      );
      image.src = imageUrl;
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function grayscaleAt(pixelData, pixelIndex) {
  const offset = pixelIndex * 4;
  return (
    pixelData[offset] * 0.299 +
    pixelData[offset + 1] * 0.587 +
    pixelData[offset + 2] * 0.114
  );
}

function binaryToHex(bits) {
  return bits
    .match(/.{1,4}/g)
    .map(group => parseInt(group, 2).toString(16))
    .join("");
}

function fingerprintDistance(left, right) {
  if (!left || !right || left.length !== right.length) {
    return Infinity;
  }

  let distance = 0;

  for (let index = 0; index < left.length; index += 1) {
    const xor =
      parseInt(left[index], 16) ^
      parseInt(right[index], 16);

    distance += BIT_COUNTS[xor];
  }

  return distance;
}

function buildCardIdentity(card) {
  return [
    card.year,
    card.manufacturer,
    card.releaseName,
    card.setName,
    card.name,
    card.number
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase();
}

const BIT_COUNTS = [
  0, 1, 1, 2,
  1, 2, 2, 3,
  1, 2, 2, 3,
  2, 3, 3, 4
];
