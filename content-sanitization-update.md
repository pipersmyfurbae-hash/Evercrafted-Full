# Content Sanitization — Claude Code Update
# ==========================================
# Add this to server.js — a sanitization middleware function
# that runs on all POST routes before the input hits the AI.
#
# ADD THIS FUNCTION near the top of server.js, after the requires:

function sanitizeInput(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    // Strip HTML tags
    .replace(/<[^>]*>/g, '')
    // Strip script injections
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Strip prompt injection attempts
    .replace(/ignore previous instructions/gi, '')
    .replace(/system prompt/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/<<SYS>>/gi, '')
    // Strip SQL injection patterns
    .replace(/('|"|;|--|\bDROP\b|\bSELECT\b|\bINSERT\b|\bDELETE\b)/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Limit length
    .slice(0, 2000)
    .trim();
}

# THEN in the /api/scene route handler, sanitize before using:
# Replace the field extraction like this:

# BEFORE:
# const { memory, season, location, timeofday, who, sensory, feeling, locationData } = req.body;

# AFTER:
# const {
#   memory:    _memory,
#   season:    _season,
#   location:  _location,
#   timeofday: _timeofday,
#   who:       _who,
#   sensory:   _sensory,
#   feeling:   _feeling,
#   locationData,
# } = req.body;
#
# const memory    = sanitizeInput(_memory);
# const season    = sanitizeInput(_season);
# const location  = sanitizeInput(_location);
# const timeofday = sanitizeInput(_timeofday);
# const who       = sanitizeInput(_who);
# const sensory   = sanitizeInput(_sensory);
# const feeling   = sanitizeInput(_feeling);

# ALSO sanitize in /api/location:
# const location = sanitizeInput(req.body.location);

# ALSO sanitize in /api/waitlist:
# const email = sanitizeInput(req.body.email).slice(0, 254);
# const scene_title = sanitizeInput(req.body.scene_title);
# const memory = sanitizeInput(req.body.memory);

# That's it. No new dependencies needed.
# The sanitizeInput function:
# - Strips HTML/script tags (XSS prevention)
# - Strips prompt injection attempts
# - Strips SQL injection patterns
# - Caps input at 2000 characters
# - Normalizes whitespace
