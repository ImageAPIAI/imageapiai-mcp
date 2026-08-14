ImageAPI AI MCP Server (@imageapiai/mcp)
========================================

Official Model Context Protocol (MCP) server for [ImageAPI AI](https://imageapiai.com). Connects AI coding assistants and agents (such as Cursor, Claude Desktop, and Windsurf) to generate high-resolution images, refine prompts for 0 credits, and inspect account credits directly within your development workflows and chat sessions.

⚡ Quick Start
-------------

### 1\. Claude Desktop Setup

Add the following to your claude_desktop_config.json:

-   macOS: ~/Library/Application Support/Claude/claude_desktop_config.json

-   Windows: %APPDATA%\Claude\claude_desktop_config.json

{\
  "mcpServers": {\
    "imageapiai": {\
      "command": "npx",\
      "args": ["-y", "@imageapiai/mcp"],\
      "env": {\
        "IMAGEAPIAI_API_KEY": "sk_live_YOUR_API_KEY_HERE"\
      }\
    }\
  }\
}

### 2\. Cursor IDE Setup

Add to your project root under .cursor/mcp.json (or globally in ~/.cursor/mcp.json):

{\
  "mcpServers": {\
    "imageapiai": {\
      "command": "npx",\
      "args": ["-y", "@imageapiai/mcp"],\
      "env": {\
        "IMAGEAPIAI_API_KEY": "sk_live_YOUR_API_KEY_HERE"\
      }\
    }\
  }\
}

### 3\. Windsurf Setup

Add to ~/.codeium/windsurf/mcp_config.json:

{\
  "mcpServers": {\
    "imageapiai": {\
      "command": "npx",\
      "args": ["-y", "@imageapiai/mcp"],\
      "env": {\
        "IMAGEAPIAI_API_KEY": "sk_live_YOUR_API_KEY_HERE"\
      }\
    }\
  }\
}

🛠️ Available MCP Tools
-----------------------

Once installed, your AI agent has native access to the following 4 tools:

### 1\. generate_image

Generates a new AI image from scratch based on a primary text prompt. Deducts standard credits from your account balance.

-   Parameters:

-   prompt (string, required): Primary text prompt describing the image to generate.

-   width (number, optional, default: 512): Width in pixels (min: 256, max: 2048).

-   height (number, optional, default: 512): Height in pixels (min: 256, max: 2048).

-   quality (string, optional, default: "medium"): Inference quality preset ("low", "medium", "high").

-   Example Prompt to AI:"Generate a 1024x1024 high quality cyberpunk city street in the rain."

-   Output: Returns JSON containing image_url, prompt_id, credits_remaining, and credits_deducted.

### 2\. refine_image

Refines an existing image by appending modifications to the original prompt. Allows up to 5 free retries per generation ID for 0 credits.

-   Parameters:

-   parent_prompt_id (string, required): The prompt_id or generation_id of the original base image.

-   prompt_update (string, required): Additions or modifications to append to the base prompt.

-   quality (string, optional, default: "medium"): Optional quality level override ("low", "medium", "high").

-   Example Prompt to AI:"Take image gen_a1b2c3d4e5f6 and refine it: add golden neon reflections on the ground."

-   Output: Returns JSON containing the updated image_url, retries_remaining, and effective_prompt.

### 3\. get_profile

Fetches user account details, current subscription status, and remaining monthly and purchased credit balance.

-   Parameters:  None

-   Example Prompt to AI:"Check how many ImageAPI credits I have left."

-   Output: Returns JSON with email, credit_balance, monthly_credits, purchased_credits, and subscription_status.

### 4\. get_history

Retrieves a list of recent historical image generations and their CDN asset URLs associated with the authenticated account.

-   Parameters:  None

-   Example Prompt to AI:"List my latest 5 generated images from ImageAPI."

-   Output: Returns an array of historical image objects containing generation_id, original_prompt, prompt_text, r2_image_url, and retry_number.

🔑 Environment Variables
------------------------
| Variable                       | Description                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| IMAGEAPIAI_API_KEY             | Your secret API key (sk_live_...). Obtainable from [imageapiai.com/dashboard](https://imageapiai.com/dashboard). |
| IMAGEAPI_API_KEY               | Supported alias fallback.                                                                                        |
| NEXT_PUBLIC_IMAGEAPIAI_API_KEY | Supported frontend/Next.js environment fallback.                                                                 |
🔗 Resources
------------

-   Website:  <https://imageapiai.com>

-   Dashboard & API Keys:  <https://imageapiai.com/dashboard>

-   API Documentation:  <https://imageapiai.com/docs>

-   Showcase Gallery:  <https://imageapiai.com/showcase>

-   npm Package:  <https://www.npmjs.com/package/@imageapiai/mcp>

📄 License
----------

MIT © [ImageAPI AI](https://imageapiai.com)