import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Risk level emoji mapping
const RISK_EMOJIS: Record<string, string> = {
  LOW: "✅",
  MEDIUM: "⚠️",
  HIGH: "🔴",
  CRITICAL: "☠️",
};

interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string; title?: string; username?: string };
  from?: { id: number; username?: string; first_name?: string };
  text?: string;
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

/**
 * Send a message to a Telegram chat
 */
async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options: { parseMode?: "HTML" | "Markdown"; replyToMessageId?: number } = {}
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode || "HTML",
        reply_to_message_id: options.replyToMessageId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Telegram] Failed to send message:", error);
      return false;
    }

    console.log(`[Telegram] Message sent to ${chatId}`);
    return true;
  } catch (error) {
    console.error("[Telegram] Error sending message:", error);
    return false;
  }
}

/**
 * Call the risk-orchestrator to scan a token
 */
async function scanToken(address: string, network?: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/risk-orchestrator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ address, network, includeAI: true }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[Telegram] Risk orchestrator returned ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    console.error("[Telegram] Error calling risk-orchestrator:", error);
    return null;
  }
}

/**
 * Format scan result as a Telegram message
 */
function formatScanResult(result: any): string {
  if (!result?.success || !result?.data) {
    return "❌ <b>Scan Failed</b>\n\nCould not analyze this token. It may not be listed on any DEX yet.";
  }

  const { token, riskAssessment, marketData, securityData, simulation, aiExplanation } = result.data;
  const emoji = RISK_EMOJIS[riskAssessment.riskLevel] || "❓";

  let message = `${emoji} <b>${token.name} (${token.symbol})</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Risk score
  message += `📊 <b>Risk Score:</b> ${riskAssessment.overallScore}/100 (${riskAssessment.riskLevel})\n`;
  message += `📈 <b>Trend:</b> ${riskAssessment.trend}\n`;
  message += `🔗 <b>Network:</b> ${token.network}\n\n`;

  // Market data
  message += `💰 <b>Market Data</b>\n`;
  message += `• Price: $${marketData.price < 0.01 ? marketData.price.toExponential(2) : marketData.price.toFixed(4)}\n`;
  message += `• Liquidity: $${formatNumber(marketData.liquidity)}\n`;
  message += `• 24h Volume: $${formatNumber(marketData.volume24h)}\n`;
  message += `• 24h Change: ${marketData.change24h > 0 ? "+" : ""}${marketData.change24h.toFixed(2)}%\n\n`;

  // Security flags
  message += `🛡️ <b>Security</b>\n`;
  message += `• Honeypot: ${securityData.isHoneypot ? "⚠️ YES" : "✅ No"}\n`;
  message += `• Buy Tax: ${securityData.buyTax}%\n`;
  message += `• Sell Tax: ${securityData.sellTax}%\n`;
  message += `• Mintable: ${securityData.isMintable ? "⚠️ Yes" : "✅ No"}\n`;
  
  if (securityData.lockInfo) {
    message += `• Liquidity Locked: ${securityData.lockInfo.isLocked ? `✅ ${securityData.lockInfo.lockPercentage}%` : "❌ No"}\n`;
  }
  message += "\n";

  // Pump/dump status
  message += `🎰 <b>Activity:</b> ${simulation.pumpDumpStatus.toUpperCase()}\n`;
  message += `${simulation.recommendation}\n\n`;

  // AI Recommendation
  if (aiExplanation) {
    message += `🤖 <b>AI Analysis</b>\n`;
    message += `${aiExplanation.recommendation}\n`;
  }

  message += `\n⏱️ <i>Scanned in ${(result.processingTime / 1000).toFixed(1)}s</i>`;

  return message;
}

/**
 * Format large numbers for display
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

/**
 * Parse command and arguments from message text
 */
function parseCommand(text: string): { command: string; args: string[] } {
  const parts = text.trim().split(/\s+/);
  const command = parts[0].toLowerCase().replace("@aidyor_bot", ""); // Handle @bot mentions
  return { command, args: parts.slice(1) };
}

/**
 * Validate Ethereum/BSC address format
 */
function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate Solana address format
 */
function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Handle incoming bot commands
 */
async function handleCommand(message: TelegramMessage): Promise<void> {
  const text = message.text || "";
  const chatId = message.chat.id;
  const { command, args } = parseCommand(text);

  console.log(`[Telegram] Command: ${command}, Args: ${args.join(", ")}, Chat: ${chatId}`);

  switch (command) {
    case "/start":
      await sendTelegramMessage(
        chatId,
        `🛡️ <b>Welcome to AIDYOR Bot!</b>\n\n` +
          `I help you analyze crypto tokens for risks before you invest.\n\n` +
          `<b>Commands:</b>\n` +
          `/scan &lt;address&gt; - Analyze a token\n` +
          `/scan &lt;address&gt; &lt;network&gt; - Analyze on specific chain\n` +
          `/help - Show this help message\n` +
          `/networks - List supported networks\n\n` +
          `<b>Example:</b>\n` +
          `<code>/scan 0xdAC17F958D2ee523a2206206994597C13D831ec7</code>\n\n` +
          `🔗 <a href="https://id-preview--eaa8d564-cf6a-4d6f-81e2-0ddab66a4a49.lovable.app">Use Web App</a>`
      );
      break;

    case "/help":
      await sendTelegramMessage(
        chatId,
        `📖 <b>AIDYOR Bot Help</b>\n\n` +
          `<b>How to scan a token:</b>\n` +
          `1. Copy the token's contract address\n` +
          `2. Send: <code>/scan &lt;address&gt;</code>\n\n` +
          `<b>Optional: Specify network</b>\n` +
          `<code>/scan &lt;address&gt; ethereum</code>\n` +
          `<code>/scan &lt;address&gt; bsc</code>\n` +
          `<code>/scan &lt;address&gt; solana</code>\n\n` +
          `<b>Risk Score Meanings:</b>\n` +
          `✅ 70-100: Low Risk\n` +
          `⚠️ 40-69: Medium Risk\n` +
          `🔴 20-39: High Risk\n` +
          `☠️ 0-19: Critical Risk\n\n` +
          `<i>Always DYOR - this is not financial advice!</i>`
      );
      break;

    case "/networks":
      await sendTelegramMessage(
        chatId,
        `🌐 <b>Supported Networks</b>\n\n` +
          `<b>EVM Chains:</b>\n` +
          `• ethereum (ETH)\n` +
          `• bsc (BNB Chain)\n` +
          `• polygon\n` +
          `• arbitrum\n` +
          `• base\n` +
          `• optimism\n` +
          `• avalanche\n\n` +
          `<b>Non-EVM:</b>\n` +
          `• solana\n\n` +
          `<i>Network is auto-detected if not specified.</i>`
      );
      break;

    case "/scan": {
      if (args.length === 0) {
        await sendTelegramMessage(
          chatId,
          `❌ Please provide a token address.\n\n<b>Usage:</b>\n<code>/scan &lt;address&gt;</code>\n<code>/scan &lt;address&gt; &lt;network&gt;</code>`,
          { replyToMessageId: message.message_id }
        );
        return;
      }

      const address = args[0];
      const network = args[1]?.toLowerCase();

      // Validate address format
      if (!isValidEvmAddress(address) && !isValidSolanaAddress(address)) {
        await sendTelegramMessage(
          chatId,
          `❌ Invalid address format.\n\nPlease provide a valid EVM (0x...) or Solana address.`,
          { replyToMessageId: message.message_id }
        );
        return;
      }

      // Send "scanning" message
      await sendTelegramMessage(
        chatId,
        `🔍 <b>Scanning...</b>\n\nAnalyzing <code>${address.slice(0, 10)}...${address.slice(-6)}</code>\n\nThis may take a few seconds.`,
        { replyToMessageId: message.message_id }
      );

      // Perform scan
      const result = await scanToken(address, network);
      const formattedResult = formatScanResult(result);

      await sendTelegramMessage(chatId, formattedResult);
      break;
    }

    default:
      // Check if message looks like an address (for quick scan)
      if (isValidEvmAddress(text) || isValidSolanaAddress(text)) {
        await sendTelegramMessage(
          chatId,
          `🔍 <b>Scanning...</b>\n\nAnalyzing <code>${text.slice(0, 10)}...${text.slice(-6)}</code>`,
          { replyToMessageId: message.message_id }
        );
        const result = await scanToken(text);
        await sendTelegramMessage(chatId, formatScanResult(result));
      } else if (text.startsWith("/")) {
        await sendTelegramMessage(
          chatId,
          `❓ Unknown command: ${command}\n\nUse /help to see available commands.`
        );
      }
  }
}

/**
 * Public API: Send alert to a specific chat
 */
interface SendAlertRequest {
  action: "send_alert";
  chatId: string | number;
  alertType: "whale" | "security" | "scan";
  data: any;
}

async function handleSendAlert(request: SendAlertRequest): Promise<Response> {
  const { chatId, alertType, data } = request;

  let message = "";

  switch (alertType) {
    case "whale":
      const emoji = data.type === "buy" ? "🐋📈" : "🐋📉";
      message =
        `${emoji} <b>Whale ${data.type.toUpperCase()} Alert!</b>\n\n` +
        `<b>${data.symbol}</b> (${data.network})\n` +
        `💰 Amount: ${data.amount}\n` +
        `${data.description || "Large transaction detected."}`;
      break;

    case "security":
      const severityEmoji = {
        critical: "🚨",
        high: "⚠️",
        medium: "⚡",
        info: "ℹ️",
      }[data.severity] || "📢";
      message =
        `${severityEmoji} <b>Security Alert</b>\n\n` +
        `<b>${data.title}</b>\n\n` +
        `${data.summary}\n\n` +
        `Source: ${data.source}`;
      if (data.link) {
        message += `\n\n<a href="${data.link}">Read More</a>`;
      }
      break;

    case "scan":
      message = formatScanResult(data);
      break;

    default:
      message = `📢 <b>Alert</b>\n\n${JSON.stringify(data, null, 2)}`;
  }

  const success = await sendTelegramMessage(chatId, message);

  return new Response(
    JSON.stringify({ success, message: success ? "Alert sent" : "Failed to send alert" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Public API: Get webhook info
 */
async function getWebhookInfo(): Promise<Response> {
  try {
    const response = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: "Failed to get webhook info" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

/**
 * Public API: Set webhook URL
 */
async function setWebhook(url: string): Promise<Response> {
  try {
    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await response.json();
    console.log("[Telegram] Webhook set response:", data);
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Telegram] Failed to set webhook:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to set webhook" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[Telegram] TELEGRAM_BOT_TOKEN is not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Bot token not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    console.log("[Telegram] Incoming request:", JSON.stringify(body).slice(0, 500));

    // Handle Telegram webhook updates (incoming messages)
    if (body.update_id && body.message) {
      const update = body as TelegramUpdate;
      if (update.message?.text) {
        await handleCommand(update.message);
      }
      // Telegram expects 200 OK for webhook updates
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle API calls
    const { action } = body;

    switch (action) {
      case "send_alert":
        return await handleSendAlert(body as SendAlertRequest);

      case "get_webhook_info":
        return await getWebhookInfo();

      case "set_webhook":
        const webhookUrl = body.url || `${SUPABASE_URL}/functions/v1/telegram-webhook`;
        return await setWebhook(webhookUrl);

      case "test":
        if (!body.chatId) {
          return new Response(
            JSON.stringify({ success: false, error: "chatId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const testSuccess = await sendTelegramMessage(
          body.chatId,
          "🛡️ <b>AIDYOR Bot Test</b>\n\n✅ Connection successful! You will receive alerts here."
        );
        return new Response(
          JSON.stringify({ success: testSuccess }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unknown action. Valid actions: send_alert, get_webhook_info, set_webhook, test",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[Telegram] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
