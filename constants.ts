// Centralized configuration for AI Models
// If a model is deprecated, change it here.
export const AI_CONFIG = {
  // The smart model for deep reasoning (Chat/Architecture)
  SMART_MODEL: "gemini-3-pro-preview", 
  
  // The fast model for quick summaries (Ingestion)
  FAST_MODEL: "gemini-3-flash-preview",
  
  // Fallback if the others fail
  FALLBACK_MODEL: "gemini-3-flash-preview"
};

// Simple obfuscation for storage keys to prevent casual shoulder-surfing
export const STORAGE_KEYS = {
  API_KEY: 'monofile_k_sec', // Changed name to force a clean login session for the update
  GH_TOKEN: 'monofile_gh_t'
};
