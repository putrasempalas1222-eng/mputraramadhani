import { CURATED_FREE_MODELS } from "../src/models.js";
import fs from "fs";

// Load .env manually
const envContent = fs.readFileSync(".env", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || "").trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
}

const kiraReferenceModels = {
  "mputra/v61-auto": env.MODEL_MPUTRA_V61_AUTO || "",
  "mputra/v61-cepat": env.MODEL_MPUTRA_V61_CEPAT || "",
  "mputra/v61-analisis": env.MODEL_MPUTRA_V61_ANALISIS || "",
  "mputra/v61-lite": env.MODEL_MPUTRA_V61_LITE || "",
  "mputra/v61-mini": env.MODEL_MPUTRA_V61_MINI || "",
  "mputra/v61-flash": env.MODEL_MPUTRA_V61_FLASH || "",
  "mputra/v61-vision": env.MODEL_MPUTRA_V61_VISION || "",
  "mputra/v61-fokus": env.MODEL_MPUTRA_V61_FOKUS || "",
  "mputra/v61-peduli": env.MODEL_MPUTRA_V61_PEDULI || "",
};
const tokenrouterReferenceModels = { "mputra/v61-gratis": env.MODEL_MPUTRA_V61_GRATIS || "" };
const orcarouterReferenceModels = { "mputra/v61-maya": env.MODEL_MPUTRA_V61_MAYA || "" };
const ceoweb3ReferenceModels = {
  "mputra/v62-astras-thinking": env.MODEL_MPUTRA_V62_ASTRAS_THINKING || "",
  "mputra/v62-astras-flash": env.MODEL_MPUTRA_V62_ASTRAS_FLASH || "",
  "mputra/v62-astras-medium": env.MODEL_MPUTRA_V62_ASTRAS_MEDIUM || "",
  "mputra/v62-trunty-flash": env.MODEL_MPUTRA_V62_TRUNTY_FLASH || "",
  "mputra/v62-dola": env.MODEL_MPUTRA_V62_DOLA || "",
  "mputra/v62-trunty-thinking": env.MODEL_MPUTRA_V62_TRUNTY_THINKING || "",
};

console.log("=== TESTING EACH MODEL DIRECTLY AT ITS NATIVE PROVIDER (NO FALLBACK) ===");

for (const model of CURATED_FREE_MODELS) {
  let url = "";
  let key = "";
  let targetModel = model.id;
  let providerName = "";

  if (ceoweb3ReferenceModels[model.id]) {
    url = env.CEOWEB3_API_URL + "/chat/completions";
    key = env.CEOWEB3_API_KEY;
    targetModel = ceoweb3ReferenceModels[model.id];
    providerName = "CEOWeb3";
  } else if (orcarouterReferenceModels[model.id]) {
    url = env.ORCAROUTER_API_URL + "/chat/completions";
    key = env.ORCAROUTER_API_KEY;
    targetModel = orcarouterReferenceModels[model.id];
    providerName = "OrcaRouter";
  } else if (tokenrouterReferenceModels[model.id]) {
    url = env.TOKENROUTER_API_URL + "/chat/completions";
    key = env.TOKENROUTER_API_KEY;
    targetModel = tokenrouterReferenceModels[model.id];
    providerName = "TokenRouter";
  } else if (kiraReferenceModels[model.id]) {
    url = env.KIRA_API_URL + "/chat/completions";
    key = env.KIRA_API_KEY;
    targetModel = kiraReferenceModels[model.id];
    providerName = "Kira";
  } else {
    url = env.OPENROUTER_API_URL + "/chat/completions";
    key = env.OPENROUTER_API_KEY;
    targetModel = model.id;
    providerName = "OpenRouter";
  }

  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Title": "M Putra Ramadhani"
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: "user", content: "Halo" }],
        max_tokens: 15
      }),
      signal: AbortSignal.timeout(5000)
    });
    const elapsed = Date.now() - t0;
    const body = await res.text();
    if (res.ok) {
      console.log(`[OK ${res.status}] ${model.id} via ${providerName} (${targetModel}) in ${elapsed}ms`);
    } else {
      console.log(`[FAIL ${res.status}] ${model.id} via ${providerName} (${targetModel}) in ${elapsed}ms -> ${body.slice(0, 80)}`);
    }
  } catch (err) {
    const elapsed = Date.now() - t0;
    console.log(`[ERR ${err.name}] ${model.id} via ${providerName} (${targetModel}) in ${elapsed}ms -> ${err.message}`);
  }
}
