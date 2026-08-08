const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

const PSA_SCALE = `
PSA 10 Gem Mint: Virtually perfect; razor-sharp corners, flawless surface, perfect gloss, centering approximately 55/45 or better.
PSA 9 Mint: Near-perfect with only minor flaws such as slight off-centering or tiny print imperfections.
PSA 8 Near Mint-Mint: Excellent condition with minor wear visible on corners or edges.
PSA 7 Near Mint: Slight surface or corner wear; still visually strong.
PSA 6 Excellent-Mint: Noticeable imperfections such as small creases or moderate corner wear.
PSA 5 Excellent: Moderate wear, minor creasing, or surface issues.
PSA 4 Very Good-Excellent: Obvious wear including rounded corners or surface loss.
PSA 3 Very Good: Heavy wear, creases, or discoloration.
PSA 2 Good: Significant damage such as major creases or staining.
PSA 1 Poor: Severe damage such as tears, missing paper, or heavy creasing.
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
  const prompt = `You are performing a careful visual condition inspection of the ${side} photograph of a trading card.

Your job in this step is NOT to assign a grade. Your job is to report only physical condition evidence that is actually visible in this photograph.

Inspect the entire card systematically:
1. Centering.
2. Each of the four corners for whitening, rounding, bends, or other wear.
3. Each edge for chipping, whitening, nicks, or wear.
4. The entire surface for scratches, dents, dings, indentations, wrinkles, creases, stains, print defects, discoloration, or other surface damage.
5. Image limitations such as glare, reflections, sleeve/holder artifacts, blur, lighting, focus, or resolution.

IMPORTANT EVIDENCE RULES:
- Never invent a defect.
- Do not report a crease, wrinkle, scratch, dent, ding, stain, or indentation unless the photograph contains visible evidence supporting that specific defect.
- Shadows, glare, reflections, normal card texture, borders, printing, sleeve/holder artifacts, and image-compression artifacts are NOT defects.
- If an apparent mark could reasonably be an image artifact and cannot be distinguished from a physical defect, classify it as UNCERTAIN rather than as a confirmed defect.
- Do not infer a defect from the condition of the opposite side.
- A clean-looking area may be reported as "no visible defect" but this does not prove that hidden damage is absent.
- Pay particular attention to small surface dings and indentations that may be easy to overlook.
- Every confirmed defect must include an approximate location on the card.
- If there is no visible evidence of a crease, explicitly say "No crease visible" rather than speculating that one may exist.

Use these status values for defects: "confirmed", "uncertain", or "none_visible".

Return only valid JSON in exactly this structure:
{
  "side": "${side}",
  "centering": "visible centering observations",
  "corners": "visible corner observations",
  "edges": "visible edge observations",
  "surface": "visible surface observations",
  "defects": [
    {
      "type": "crease | wrinkle | scratch | ding | dent | stain | whitening | corner_wear | edge_wear | print_defect | discoloration | other",
      "status": "confirmed | uncertain | none_visible",
      "location": "approximate location",
      "description": "only what is visibly supported by the photograph"
    }
  ],
  "overall_observation": "brief evidence-based assessment of this side",
  "image_limitations": "specific limitations visible in the photograph, or none apparent"
}`;

  const response = await ai.run(VISION_MODEL, { prompt, image: imageBytes, max_tokens: 1000, temperature: 0.05 });
  console.log(`Workers AI raw ${side} response:`, JSON.stringify(response, null, 2));
  return parseSideAnalysis(response, side);
}

async function combineGradeAnalyses(ai, frontAnalysis, backAnalysis) {
  const prompt = `You are producing a conservative photo-based trading-card grade estimate using the PSA grading framework below.

${PSA_SCALE}

FRONT VISUAL ANALYSIS:
${JSON.stringify(frontAnalysis)}

BACK VISUAL ANALYSIS:
${backAnalysis ? JSON.stringify(backAnalysis) : "No back photograph was provided."}

GRADING RULES:
- The PSA scale above is the governing grading framework. Do not substitute another grading system.
- Use only physical defects explicitly reported as CONFIRMED in the visual analyses. Do not invent new defects.
- An UNCERTAIN observation is not a confirmed defect and must not be stated as fact in the final explanation.
- Do not turn glare, reflection, printing, shadows, sleeves, holders, blur, or image artifacts into physical defects.
- Consider both sides when a back photograph is supplied.
- A defect on one side must not be attributed to the other side.
- The final grade must be consistent with the PSA descriptions. Do not give a high grade while simultaneously describing a defect that is inconsistent with that grade.
- In particular, a confirmed crease is a noticeable imperfection under the supplied PSA scale and cannot be reconciled with PSA 7-10. A confirmed small crease should place the estimate in PSA 6 territory or below depending on the total condition; more serious creasing should move lower.
- PSA 10 requires a virtually perfect card. Do not use PSA 10 when confirmed visible defects are present.
- PSA 9 is near-perfect and should be reserved for only very minor flaws such as slight centering or tiny print imperfections.
- PSA 8 allows minor corner or edge wear.
- PSA 7 allows slight surface or corner wear.
- PSA 6 allows noticeable imperfections such as small creases or moderate corner wear.
- Lower grades should be selected when the observed condition matches the lower PSA descriptions.
- Do not penalize the card for a defect that is not actually visible.
- Do not claim that a side is free of hidden defects. Say "no visible defect" when appropriate.
- If the photographs are inadequate to judge an area, state that limitation and lower confidence rather than inventing a defect.
- Return a grade RANGE no wider than one numerical grade, such as "7-8".
- Do not return a single definitive professional grade.

CONSISTENCY REQUIREMENT:
Before returning the result, compare every stated defect against the proposed grade. If the explanation contains a confirmed crease, major surface damage, or other condition that contradicts the proposed PSA range, revise the grade downward so the statements are consistent. Conversely, do not lower the grade for uncertain or unsupported defects.

Return only this JSON object and nothing else:
{
  "suggested_grade": "7-8",
  "grade_explanation": "clear explanation based only on confirmed visible condition",
  "centering": "combined centering assessment",
  "corners": "combined corner assessment",
  "edges": "combined edge assessment",
  "surface": "combined surface assessment",
  "back": "back assessment based only on confirmed visible evidence, or note that no back was supplied",
  "confidence": "High, Medium, or Low"
}`;

  const response = await ai.run(VISION_MODEL, { prompt, max_tokens: 700, temperature: 0.05 });
  console.log("Workers AI combined response:", JSON.stringify(response, null, 2));
  const result = parseModelJson(response);
  return enforceGradeConsistency(result, frontAnalysis, backAnalysis);
}

function enforceGradeConsistency(result, frontAnalysis, backAnalysis) {
  const analyses = [frontAnalysis, backAnalysis].filter(Boolean);
  const confirmed = analyses.flatMap(a => Array.isArray(a?.defects) ? a.defects : []).filter(d => d?.status === "confirmed");
  const hasConfirmedCrease = confirmed.some(d => ["crease", "wrinkle"].includes(String(d.type).toLowerCase()));
  if (!hasConfirmedCrease) return result;

  const range = parseGradeRange(result?.suggested_grade);
  if (!range) return result;
  if (range.high <= 6) return result;

  const explanation = String(result.grade_explanation || "").replace(/\b7\s*[-–]\s*8\b|\b8\s*[-–]\s*9\b|\b9\s*[-–]\s*10\b/g, "6 or below");
  return {
    ...result,
    suggested_grade: "5-6",
    grade_explanation: `${explanation}${explanation ? " " : ""}A confirmed visible crease is present, so the estimate is constrained to the PSA 6-or-below range under the supplied PSA framework.`
  };
}

function parseGradeRange(value) {
  const text = String(value || "");
  const numbers = text.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (!numbers.length) return null;
  if (numbers.length === 1) return { low: numbers[0], high: numbers[0] };
  return { low: Math.min(numbers[0], numbers[1]), high: Math.max(numbers[0], numbers[1]) };
}

async function estimateValue(request, env) {
  if (!env.GEMINI_API_KEY) return jsonResponse({ error: "Gemini API key is not configured." }, 500);
  const card = await request.json();
  if (!card?.player) return jsonResponse({ error: "Player or card name is required." }, 400);
  const cardDescription = [card.year, card.player, card.manufacturer, card.setName, card.releaseName, card.cardNumber ? `#${card.cardNumber}` : "", card.gradingCompany, card.professionalGrade ? `grade ${card.professionalGrade}` : "", !card.professionalGrade && card.suggestedGrade ? `estimated condition ${card.suggestedGrade}` : "", card.sport].filter(Boolean).join(" ");
  const prompt = `Estimate the current market value in US dollars for this trading card:\n\n${cardDescription}\n\nUse Google Search to find recent, relevant market information.\n\nPrioritize:\n- Recent sold or completed sales\n- Clearly matching year, player, set, card number, variation, grading company, and grade\n- Sales from approximately the last 90 days when available\n- Multiple comparable sales rather than one unusual result\n\nDo not treat active asking prices as completed sales.\nDo not use SportsCardsPro.\nDo not claim that an asking price is a sold price.\nDo not invent sales, prices, dates, or sources.\n\nIf exact sold comparisons are unavailable, use the closest reasonable matches and clearly lower the confidence.\n\nReturn only valid JSON with this exact structure:\n{\n  "estimated_value": 0,\n  "low_estimate": 0,\n  "high_estimate": 0,\n  "currency": "USD",\n  "confidence": "High, Medium, or Low",\n  "summary": "Brief explanation of how the estimate was determined",\n  "comparables_found": 0,\n  "search_description": "${cardDescription}"\n}`;
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
    return { side, centering: "", corners: "", edges: "", surface: text, defects: [], major_defects: [], overall_observation: text, image_limitations: "The vision model returned a written assessment instead of structured JSON." };
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
