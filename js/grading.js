const TRUECARD_GRADE_URL =
  "https://truecard-api.brentshortusda.workers.dev/grade-card";

async function requestCardGrade(frontImageData, backImageData = "") {
  if (!frontImageData) {
    throw new Error("Capture the front of the card first.");
  }

  const formData = new FormData();
  formData.append(
    "front",
    dataUrlToBlob(frontImageData),
    "card-front.jpg"
  );

  if (backImageData) {
    formData.append(
      "back",
      dataUrlToBlob(backImageData),
      "card-back.jpg"
    );
  }

  const response = await fetch(TRUECARD_GRADE_URL, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    let message =
      "The grading service is not available yet.";

    try {
      const errorBody = await response.json();
      message = errorBody.error || errorBody.message || message;
    } catch {
      // Keep the safe user-facing message when the worker returns no JSON.
    }

    throw new Error(message);
  }

  const result = await response.json();

  if (
    !result ||
    !result.suggested_grade ||
    !result.grade_explanation
  ) {
    throw new Error(
      "The grading service returned an incomplete estimate."
    );
  }

  return {
    suggestedGrade: String(result.suggested_grade).trim(),
    gradeExplanation: String(result.grade_explanation).trim(),
    factors: {
      centering: String(result.centering || "").trim(),
      corners: String(result.corners || "").trim(),
      edges: String(result.edges || "").trim(),
      surface: String(result.surface || "").trim(),
      back: String(result.back || "").trim()
    },
    confidence: String(result.confidence || "").trim(),
    disclaimer:
      result.disclaimer ||
      "Photo-based estimate only; not a professional grade."
  };
}

function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl).split(",");
  const metadata = parts[0] || "";
  const encoded = parts[1] || "";

  if (!encoded) {
    throw new Error("A captured card image could not be read.");
  }

  const mimeMatch = metadata.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}
