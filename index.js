#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import ImageAPI from 'imageapiai';

const apiKey =
  process.env.IMAGEAPIAI_API_KEY ||
  process.env.IMAGEAPI_API_KEY ||
  process.env.NEXT_PUBLIC_IMAGEAPIAI_API_KEY;

let client = null;
if (apiKey) {
  client = new ImageAPI({ apiKey });
}

const server = new Server(
  {
    name: '@imageapiai/mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

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
      },
      required: ['prompt'],
    },
  },
  {
    name: 'refine_image',
    description:
      'Refine or modify an existing generated image for 0 credits (up to 5 free retries per parent prompt ID). Appends prompt modifications to the locked base prompt.',
    inputSchema: {
      type: 'object',
      properties: {
        parent_prompt_id: {
          type: 'string',
          description: 'The prompt_id or generation_id of the original image generation.',
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
          description: 'Optional quality level override.',
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
      properties: {},
    },
  },
  {
    name: 'get_history',
    description:
      'Retrieve a list of all historical AI image generations associated with your ImageAPI account.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

function ensureClient() {
  if (client) return client;

  const currentKey =
    process.env.IMAGEAPIAI_API_KEY ||
    process.env.IMAGEAPI_API_KEY ||
    process.env.NEXT_PUBLIC_IMAGEAPIAI_API_KEY;

  if (!currentKey) {
    throw new Error(
      'IMAGEAPIAI_API_KEY environment variable is missing. Set IMAGEAPIAI_API_KEY in your MCP configuration or environment.'
    );
  }

  client = new ImageAPI({ apiKey: currentKey });
  return client;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const api = ensureClient();

    if (name === 'generate_image') {
      const { prompt, width, height, quality } = args;
      const res = await api.generate({
        prompt,
        width: width ? Number(width) : 512,
        height: height ? Number(height) : 512,
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
            text: `🖼️ **Image Generated Successfully!**\n\n![Generated Image](${imageUrl})\n\n- **Image URL:** ${imageUrl}\n- **Prompt ID:** \`${promptId}\`\n- **Credits Remaining:** ${creditsRemaining}\n- **Free Retries Remaining:** 5\n\n*Tip: You can refine this image for 0 credits by passing prompt_id \`${promptId}\` to the \`refine_image\` tool.*`,
          },
        ],
      };
    }

    if (name === 'refine_image') {
      const { parent_prompt_id, prompt_update, width, height, quality } = args;
      const res = await api.refine(parent_prompt_id, prompt_update, {
        width: width ? Number(width) : undefined,
        height: height ? Number(height) : undefined,
        quality,
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

    if (name === 'get_profile') {
      const res = await api.getProfile();
      const data = res.data || res;

      return {
        content: [
          {
            type: 'text',
            text: `👤 **ImageAPI Account Profile**\n\n- **Email:** ${data.email}\n- **Credit Balance:** ${data.credit_balance ?? data.creditBalance}\n- **Monthly Credit Allowance:** ${data.monthly_credits ?? data.monthlyCredits}\n- **Subscription Status:** ${data.subscription_status ?? data.subscriptionStatus}`,
          },
        ],
      };
    }

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
            `${idx + 1}. **ID:** \`${item.generation_id || item.generationId}\` | **Prompt:** "${item.prompt_text || item.original_prompt}"\n   - URL: ${item.r2_image_url || item.image_url}`
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

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ImageAPI MCP Server running on stdio');
}

runServer().catch((error) => {
  console.error('Fatal error starting ImageAPI MCP server:', error);
  process.exit(1);
});