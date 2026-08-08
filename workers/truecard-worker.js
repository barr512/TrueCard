const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

const PSA_SCALE = `
PSA 10 Gem Mint: Virtually perfect: razor-sharp corners, flawless surface, perfect gloss, centering approximately 55/45 or better.
PSA 9 Mint: Near-perfect with only minor flaws such as slight off-centering or tiny print imperfections.
PSA 8 Near Mint-Mint: Excellent condition with minor wear visible on corners or edges.
PSA 7 Near Mint: Slight surface or corner wear; still visually strong.
PSA 6 Excellent-Mint: Noticeable imperfections such as small creases or moderate corner wear.
PSA 5 Excellent: Moderate wear, minor creasing, or surface issues.
PSA 4 Very Good-Excellent: Obvious wear including rounded corners or surface loss.
PSA 3 Very Good: Heavy wear, creases, or discoloration.
PSA 2 Good: Significant damage such as major creases or staining.
PSA 1 Poor: Severe damage: tears, missing paper, heavy creasing.
`;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/identify-card") return await identifyCard(request, env);
      if (url.pathname === "/grade-card") return await gradeCard(request, env);
      if (url.pathname === "/estimate-value") return await estimateValue(request, env);
      return new Response("Not found", { status: 404, headers: CORS_HEADERS });
    } catch (error) {
      console.error(error);
      return jsonResponse({ error: error?.message || "The TrueCard service encountered an error." }, 500);
    }
  }
};

async function identifyCard(request, env) {
  const formData = await request.formData();
  const image = formData.get("image");
  if (!image) return jsonResponse({ error: "Missing image" }, 400);
  const cardSightForm = new FormData();
  cardSightForm.append("image", image);
  const cardSightResponse = await fetch("https://api.cardsight.ai/v1/identify/card", {
    method: "POST",
    headers: { "X-API-Key": env.CARDSIGHT_API_KEY },
    body: cardSightForm
  });
  const result = await cardSightResponse.text();
  return new Response(result, { status: cardSightResponse.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

async function gradeCard(request, env) {
  if (!env.AI) return jsonResponse({ error: "Workers AI binding is not configured." }, 500);
  const formData = await request.formData();
  const front = formData.get("front");
  const back = formData.get("back");
  if (!front || typeof front.arrayBuffer !== "function") return jsonResponse({ error: "A front card image is required." }, 400);

  const frontAnalysis = await analyzeCardSide(env.AI, front, "front");
  let backAnalysis = null;
  if (back && typeof back.arrayBuffer === "function") backAnalysis = await analyzeCardSide(env.AI, back, "back");

  const combined = await combineGradeAnalyses(env.AI, frontAnalysis, backAnalysis);

  return jsonResponse({
    suggested_grade: combined.suggested_grade || "Unable to estimate",
    grade_explanation: combined.grade_explanation || "The photographs did not provide enough detail for a reliable estimate.",
    centering: combined.centering || frontAnalysis.centering || "",
    corners: combined.corners || frontAnalysis.corners || "",
    edges: combined.edges || frontAnalysis.edges || "",
    surface: combined.surface || frontAnalysis.surface || "",
    back: combined.back || backAnalysis?.overall_observation || "No back image was supplied.",
    confidence: combined.confidence || "Low",
    disclaimer: "Photo-based estimate only. Lighting, focus, holders, sleeves, and image resolution may hide defects. This is not a professional grade."
  });
}

async function analyzeCardSide(ai, imageFile, side) {
  const imageBytes = Array.from(new Uint8Array(await imageFile.arrayBuffer()));
  const prompt = `You are inspecting only the physical condition of the ${side} side of a trading card.

Do NOT identify the player, team, statistics, text, artwork, background, design, or other content unless it directly affects physical condition. Do not write a general description of the photograph.

Inspect only these grading factors:
- centering
- corners
- edges
- surface
- visible print defects
- visible whitening, wear, scratches, dings, dents, wrinkles, creases, stains, or discoloration

IMPORTANT:
- Report only physical defects that are actually visible.
- Never invent a defect.
- Do not interpret shadows, glare, reflections, normal printing, card borders, sleeve/holder artifacts, or image compression as physical damage.
- If a mark cannot clearly be distinguished from an image artifact, do not call it a confirmed defect.
- Do not infer a defect from the opposite side.
- Look carefully for small surface dings and indentations.
- Every actual defect should include a short location.
- If no crease is visibly supported, say "No visible crease."

Return ONLY this compact JSON:
{
  "side": "${side}",
  "centering": "brief condition observation",
  "corners": "brief condition observation",
  "edges": "brief condition observation",
  "surface": "brief condition observation",
  "confirmed_defects": ["short defect with location"],
  "uncertain_observations": ["short observation only if genuinely uncertain"],
  "overall_observation": "one short condition summary",
  "image_limitations": "only relevant limitations"
}

Keep every field concise. Do not include card facts, statistics, player information, artwork descriptions, background descriptions, or other irrelevant observations.`;

  const response = await ai.run(VISION_MODEL, {
    prompt,
    image: imageBytes,
    max_tokens: 550,
    temperature: 0.05
  });

  console.log(`Workers AI raw ${side} response:`, JSON.stringify(response, null, 2));
  return parseSideAnalysis(response, side);
}

async function combineGradeAnalyses(ai, frontAnalysis, backAnalysis) {
  const prompt = `You are producing a concise photo-based trading-card grade estimate using the PSA framework below.

${PSA_SCALE}

FRONT CONDITION ANALYSIS:
${JSON.stringify(frontAnalysis)}

BACK CONDITION ANALYSIS:
${backAnalysis ? JSON.stringify(backAnalysis) : "No back photograph was provided."}

GRADE RULES:
- The PSA scale above is the governing standard.
- Use only visible condition information supplied by the two analyses.
- Do not invent defects or add details not present in those analyses.
- Ignore uncertain observations when deciding the grade.
- A confirmed crease cannot be reconciled with PSA 7-10 under the supplied scale; a small crease places the card in PSA 6 territory or below depending on total condition.
- PSA 10 requires virtually perfect visible condition.
- PSA 9 is near-perfect with only very minor flaws.
- PSA 8 allows minor corner or edge wear.
- PSA 7 allows slight surface or corner wear.
- Lower grades apply when the visible condition matches the corresponding PSA description.
- Do not lower the grade for a defect that is not actually visible.
- Do not claim hidden defects are absent.
- Return a grade range no wider than one numerical grade, such as 7-8.

OUTPUT RULES:
The user needs a short grading assessment, NOT a forensic image report.
Do not mention the card's player, team, statistics, text, artwork, background, colors, design, or other irrelevant content.
Do not repeat all image-analysis details.
Mention only the condition observations that materially explain the grade.
If a side has no meaningful visible defect, say simply "No significant visible defect." Do not list everything that looks normal.

Return ONLY this JSON:
{
  "suggested_grade": "7-8",
  "grade_explanation": "one or two concise sentences explaining the grade and the key visible condition factors",
  "centering": "one short sentence",
  "corners": "one short sentence",
  "edges": "one short sentence",
  "surface": "one short sentence mentioning only meaningful visible surface issues",
  "back": "one short sentence about meaningful visible back condition",
  "confidence": "High, Medium, or Low"
}`;

  const response = await ai.run(VISION_MODEL, {
    prompt,
    max_tokens: 400,
    temperature: 0.05
  });

  console.log("Workers AI combined response:", JSON.stringify(response, null, 2));
  const result = parseModelJson(response);
  return enforceGradeConsistency(result, frontAnalysis, backAnalysis);
}

function enforceGradeConsistency(result, frontAnalysis, backAnalysis) {
  const analyses = [frontAnalysis, backAnalysis].filter(Boolean);
  const confirmed = analyses.flatMap(a => Array.isArray(a?.confirmed_defects) ? a.confirmed_defects : []);
  const creaseReported = confirmed.some(d => /\b(crease|creased|wrinkle|wrinkled)\b/i.test(String(d)));

  if (!creaseReported) return result;

  const range = parseGradeRange(result?.suggested_grade);
  if (!range || range.high <= 6) return result;

  return {
    ...result,
    suggested_grade: "5-6",
    grade_explanation: "A visible crease was reported, so the estimate has been constrained to the PSA 6-or-below range under the supplied PSA framework."
  };
}

function parseGradeRange(value) {
  const numbers = String(value || "").match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (!numbers.length) return null;
  if (numbers.length === 1) return { low: numbers[0], high: numbers[0] };
  return { low: Math.min(numbers[0], numbers[1]), high: Math.max(numbers[0], numbers[1]) };
}

async function estimateValue(request, env) {
  if (!env.GEMINI_API_KEY) return jsonResponse({ error: "Gemini API key is not configured." }, 500);
  const card = await request.json();
  if (!card?.player) return jsonResponse({ error: "Player or card name is required." }, 400);
  const cardDescription = [card.year, card.player, card.manufacturer, card.setName, card.releaseName, card.cardNumber ? `#${card.cardNumber}` : "", card.gradingCompany, card.professionalGrade ? `grade ${card.professionalGrade}` : "", !card.professionalGrade && card.suggestedGrade ? `estimated condition ${card.suggestedGrade}` : "", card.sport].filter(Boolean).join(" ");
  const prompt = `Estimate the current market value in US dollars for this trading card:\n\n${cardDescription}\n\nUse Google Search to find recent, relevant market information. Prioritize recent sold or completed sales and clearly matching cards. Do not treat asking prices as completed sales. Do not use SportsCardsPro. Do not invent sales, prices, dates, or sources. Return only valid JSON with estimated_value, low_estimate, high_estimate, currency, confidence, summary, comparables_found, and search_description.`;
  const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY }, body: JSON.stringify({ model: "gemini-3.5-flash", input: prompt, tools: [{ type: "google_search" }] }) });
  const geminiResult = await geminiResponse.json();
  if (!geminiResponse.ok) throw new Error(geminiResult?.error?.message || "Gemini could not complete the value search.");
  const modelOutput = geminiResult.steps?.find(step => step.type === "model_output");
  const textBlock = modelOutput?.content?.find(block => block.type === "text");
  if (!textBlock?.text) throw new Error("Gemini returned an empty value estimate.");
  const estimate = parseGeminiJson(textBlock.text);
  const sources = [];
  for (const step of geminiResult.steps || []) {
    if (step.type !== "model_output") continue;
    for (const block of step.content || []) for (const annotation of block.annotations || []) if (annotation.type === "url_citation" && annotation.url) sources.push({ title: annotation.title || "Internet source", url: annotation.url });
  }
  const uniqueSources = Array.from(new Map(sources.map(source => [source.url, source])).values()).slice(0, 8);
  return jsonResponse({ estimated_value: Number(estimate.estimated_value) || 0, low_estimate: Number(estimate.low_estimate) || 0, high_estimate: Number(estimate.high_estimate) || 0, currency: "USD", confidence: estimate.confidence || "Low", summary: estimate.summary || "Internet-based estimate using available comparable information.", comparables_found: Number(estimate.comparables_found) || 0, search_description: estimate.search_description || cardDescription, sources: uniqueSources, estimated_at: new Date().toISOString(), disclaimer: "Internet-based estimate only. Market prices and card condition can change the actual selling price." });
}

function parseGeminiJson(raw) {
  const cleaned = String(raw).replace(/`json/gi, "").replace(/`/g, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    throw new Error("Gemini returned an unreadable value estimate.");
  }
}

function parseSideAnalysis(result, side) {
  try { return parseModelJson(result); } catch (error) {
    const raw = typeof result === "string" ? result : result?.response ?? result?.result?.response ?? result?.result ?? "";
    const text = String(raw).trim();
    if (!text) throw error;
    console.warn(`Workers AI returned a non-JSON ${side} analysis. Using the text as a fallback.`);
    return { side, centering: "", corners: "", edges: "", surface: text, confirmed_defects: [], uncertain_observations: [], overall_observation: text, image_limitations: "" };
  }
}

function parseModelJson(result) {
  const raw = typeof result === "string" ? result : result?.response ?? result?.result?.response ?? result?.result ?? result;
  if (raw === null || raw === undefined || raw === "") throw new Error("The AI model returned an empty response.");
  if (typeof raw === "object") return raw;
  const cleaned = String(raw).replace(/`json/gi, "").replace(/`/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const jsonText = extractFirstJsonObject(cleaned);
  if (jsonText) {
    try { return JSON.parse(jsonText); } catch (error) { console.error("Extracted grading JSON could not be parsed:", jsonText, error); }
  }
  console.error("Unreadable Workers AI grading response:", cleaned);
  throw new Error("The AI model returned an unreadable grading result.");
}

function extractFirstJsonObject(text) {
  const startIndex = text.indexOf("{");
  if (startIndex === -1) return null;
  let depth = 0, insideString = false, escaped = false;
  for (let index = startIndex; index < text.length; index++) {
    const character = text[index];
    if (insideString) {
      if (escaped) { escaped = false; continue; }
      if (character === "\\") { escaped = true; continue; }
      if (character === '"') insideString = false;
      continue;
    }
    if (character === '"') { insideString = true; continue; }
    if (character === "{") { depth++; continue; }
    if (character === "}") { depth--; if (depth === 0) return text.slice(startIndex, index + 1); }
  }
  return null;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
