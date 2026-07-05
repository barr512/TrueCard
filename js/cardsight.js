async function identifyCard(imageBlob) {
  const formData = new FormData();
  formData.append("image", imageBlob);

  try {
    const response = await fetch(
      "https://truecard-api.brentshortusda.workers.dev/identify-card",
      {
        method: "POST",
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`TrueCard API Error: ${response.status}`);
    }

    const result = await response.json();
    console.log("CardSight Response:", result);
    return result;
  } catch (error) {
    console.error(error);
    alert("Unable to identify card.");
    return null;
  }
}
