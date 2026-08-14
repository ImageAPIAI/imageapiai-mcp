#!/usr/bin/env node

/**
 * Official ImageAPI AI Model Context Protocol (MCP) Server
 * https://imageapiai.com
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import ImageAPI from 'imageapiai';

// Server instance declaration
const server = new Server(
  {
    name: '@imageapiai/mcp',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tool schemas for AI clients
const TOOLS = [
  {
    name: 'generate_image',
    description:
      'Generate a fresh high-resolution AI image from a text prompt. Deducts credits from your ImageAPI account.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The detailed text prompt describing the image to generate.',
        },
        width: {
          type: 'number',
          description: 'Image width in pixels (Default: 512). Range: 256 to 2048.',
          default: 512,
        },
        height: {
          type: 'number',
          description: 'Image height in pixels (Default: 512). Range: 256 to 2048.',
          default: 512,
        },
        quality: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Inference quality level (Default: medium).',
          default: 'medium',
        },
        auth_token: {
          type: 'string',
          description: 'Optional runtime API key or Bearer token override.',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'refine_image',
    description:
      'Refine or modify an existing generated image for 0 credits (up to 5 free retries per parent prompt ID). Appends modifications to the locked base prompt.',
    inputSchema: {
      type: 'object',
      properties: {
        parent_prompt_id: {
          type: 'string',
          description: 'The prompt_id or generation_id of the original base image.',
        },
        prompt_update: {
          type: 'string',
          description: 'Additional text instructions or modifications to append to the base prompt.',
        },
        width: {
          type: 'number',
          description: 'Optional width override in pixels.',
        },
        height: {
          type: 'number',
          description: 'Optional height override in pixels.',
        },
        quality: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Optional quality level override (low, medium, high).',
        },
        auth_token: {
          type: 'string',
          description: 'Optional runtime API key or Bearer token override.',
        },
      },
      required: ['parent_prompt_id', 'prompt_update'],
    },
  },
  {
    name: 'get_profile',
    description:
      'Fetch your ImageAPI account profile, credit balance, monthly allowance, and active subscription status.',
    inputSchema: {
      type: 'object',
      properties: {
        auth_token: {
          type: 'string',
          description: 'Optional runtime API key or Bearer token override.',
        },
      },
    },
  },
  {
    name: 'get_history',
    description:
      'Retrieve a list of all historical AI image generations associated with your ImageAPI account.',
    inputSchema: {
      type: 'object',
      properties: {
        auth_token: {
          type: 'string',
          description: 'Optional runtime API key or Bearer token override.',
        },
      },
    },
  },
];

// Register tool discovery handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Helper: resolve API client dynamically per call
function getClient(overrideToken = null) {
  const token =
    overrideToken ||
    process.env.IMAGEAPIAI_API_KEY ||
    process.env.IMAGEAPI_API_KEY ||
    process.env.NEXT_PUBLIC_IMAGEAPIAI_API_KEY;

  if (!token) {
    throw new Error(
      'Missing API key. Set the IMAGEAPIAI_API_KEY environment variable or supply an auth_token parameter.'
    );
  }

  return new ImageAPI({ apiKey: token });
}

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    const api = getClient(args.auth_token);

    // 1. Tool: generate_image
    if (name === 'generate_image') {
      const { prompt, width, height, quality } = args;
      const res = await api.generate({
        prompt,
        width: width && !isNaN(Number(width)) ? Number(width) : 512,
        height: height && !isNaN(Number(height)) ? Number(height) : 512,
        quality: quality || 'medium',
      });

      const data = res.data || res;
      const imageUrl = data.image_url || data.imageUrl;
      const promptId = data.prompt_id || data.promptId;
      const creditsRemaining = data.credits_remaining ?? data.creditsRemaining;

      return {
        content: [
          {
            type: 'text',
            text: `🖼️ **Image Generated Successfully!**\n\n![Generated Image](${imageUrl})\n\n- **Image URL:** ${imageUrl}\n- **Prompt ID:** \`${promptId}\`\n- **Credits Remaining:** ${creditsRemaining}\n- **Free Retries Left:** 5\n\n*Tip: Refine this image for 0 credits by passing \`${promptId}\` to the \`refine_image\` tool.*`,
          },
        ],
      };
    }

    // 2. Tool: refine_image
    if (name === 'refine_image') {
      const { parent_prompt_id, prompt_update, width, height, quality } = args;
      const res = await api.refine(parent_prompt_id, prompt_update, {
        width: width && !isNaN(Number(width)) ? Number(width) : undefined,
        height: height && !isNaN(Number(height)) ? Number(height) : undefined,
        quality: quality || undefined,
      });

      const data = res.data || res;
      const imageUrl = data.image_url || data.imageUrl;
      const promptId = data.prompt_id || data.promptId;
      const retriesRemaining = data.retries_remaining ?? data.retriesRemaining;

      return {
        content: [
          {
            type: 'text',
            text: `✨ **Image Refined Successfully (0 Credits Charged)!**\n\n![Refined Image](${imageUrl})\n\n- **Image URL:** ${imageUrl}\n- **Prompt ID:** \`${promptId}\`\n- **Free Retries Left:** ${retriesRemaining}\n- **Effective Prompt:** "${data.effective_prompt || data.effectivePrompt}"`,
          },
        ],
      };
    }

    // 3. Tool: get_profile
    if (name === 'get_profile') {
      const res = await api.getProfile();
      const data = res.data || res;

      return {
        content: [
          {
            type: 'text',
            text: `👤 **ImageAPI Account Profile**\n\n- **Email:** ${data.email}\n- **Credit Balance:** ${data.credit_balance ?? data.creditBalance}\n- **Monthly Allowance:** ${data.monthly_credits ?? data.monthlyCredits}\n- **Subscription Status:** ${data.subscription_status ?? data.subscriptionStatus}`,
          },
        ],
      };
    }

    // 4. Tool: get_history
    if (name === 'get_history') {
      const res = await api.getHistory();
      const historyList = res.data || res;

      if (!Array.isArray(historyList) || historyList.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No past image generations found for this account.',
            },
          ],
        };
      }

      const formatted = historyList
        .slice(0, 10)
        .map(
          (item, idx) =>
            `${idx + 1}. **ID:** \`${item.generation_id || item.generationId}\` | **Prompt:** "${item.prompt_text || item.original_prompt}"\n   - **URL:** ${item.r2_image_url || item.image_url}`
        )
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `📜 **Recent Generation History (Latest ${Math.min(10, historyList.length)})**\n\n${formatted}`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `❌ **ImageAPI Tool Error:** ${error.message}`,
        },
      ],
    };
  }
});

// Start MCP Server over STDIO
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ImageAPI MCP Server running on stdio');
}

runServer().catch((error) => {
  console.error('Fatal error starting ImageAPI MCP server:', error);
  process.exit(1);
});