#!/bin/bash

# Run all LLM API calls
# Usage: ./curl-all.sh
# Make sure ANTHROPIC_API_KEY, GEMINI_API_KEY, and OPENAI_API_KEY are set as environment variables

set -e

echo "========================================"
echo "1. Anthropic (Claude)"
echo "========================================"
curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Hello, Claude"}
    ]
  }' | python3 -m json.tool 2>/dev/null || true

echo ""
echo "========================================"
echo "2. Gemini"
echo "========================================"
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }' | python3 -m json.tool 2>/dev/null || true

echo ""
echo "========================================"
echo "3. OpenAI (GPT)"
echo "========================================"
curl -s https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-5-nano",
    "input": "write a haiku about ai",
    "store": true
  }' | python3 -m json.tool 2>/dev/null || true

echo ""
echo "========================================"
echo "Done!"
echo "========================================"
