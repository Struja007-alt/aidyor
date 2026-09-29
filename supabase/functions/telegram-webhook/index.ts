import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = [
  'https://aidyor.app',
  'https://www.aidyor.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(origin) {
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const corsHeaders = getCorsHeaders(null);

const TELEGRAM_BOT_TOKEN = Deno.env.get("AIDYOR_BOT") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const WEB_APP_URL = "https://aidyor.app";
const EXAMPLE_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

async function getWebhookSecret() {
  const data = new TextEncoder().encode(`telegram-webhook:${TELEGRAM_BOT_TOKEN}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function safeEqual(a, b) {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Admin-only actions (set_webhook, get_webhook_info, setup_bot) require the service role key.
function isAdminRequest(req) {
  if (!SUPABASE_SERVICE_ROLE_KEY) return false;
  const auth = req.headers.get("Authorization") || "";
  return safeEqual(auth, `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`);
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const PREMIUM_PRICE_STARS = 750;
const PREMIUM_DURATION_DAYS = 30;
const FREE_DAILY_SCAN_LIMIT = 10;

const RISK_EMOJIS = {
  LOW: "✅",
  MEDIUM: "⚠️",
  HIGH: "🔴",
  CRITICAL: "☠️",
};

// ---------- Keyboards ----------

const startKeyboard = {
  inline_keyboard: [
    [{ text: "🔍 Try an example", callback_data: "example" }],
    [
      { text: "🌐 Open Web App", url: WEB_APP_URL },
      { text: "⭐ Go Pro", callback_data: "upgrade" },
    ],
  ],
};

const upgradeKeyboard = {
  inline_keyboard: [
    [{ text: `⭐ Go Pro (${PREMIUM_PRICE_STARS} Stars / month)`, callback_data: "upgrade" }],
  ],
};

const scanResultKeyboard = {
  inline_keyboard: [
    [{ text: "🌐 Full report in Web App", url: WEB_APP_URL }],
  ],
};

const webAppKeyboard = {
  inline_keyboard: [
    [{ text: "🌐 Open Web App", url: WEB_APP_URL }],
  ],
};

// ---------- Telegram helpers ----------

async function sendTelegramMessage(chatId, text, options = {}) {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode || "HTML",
        reply_to_message_id: options.replyToMessageId,
        reply_markup: options.replyMarkup,
        link_preview_options: { is_disabled: true },
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

async function answerCallbackQuery(callbackQueryId, text) {
  try {
    const response = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      console.error("[Telegram] Failed to answer callback query:", error);
    }
  } catch (error) {
    console.error("[Telegram] Error answering callback query:", error);
  }
}

async function sendInvoice(chatId, userId) {
  const invoicePayload = `premium_${userId}_${Date.now()}`;

  const { error: dbError } = await supabase
    .from("pending_orders")
    .insert({
      telegram_user_id: userId,
      invoice_payload: invoicePayload,
      amount_cents: PREMIUM_PRICE_STARS,
      currency: "XTR",
      status: "pending",
    });

  if (dbError) {
    console.error("[Telegram] Failed to create pending order:", dbError);
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/sendInvoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        title: "AIDYOR Pro Subscription",
        description: "Get unlimited token scans, priority alerts, and advanced AI analysis for 30 days.",
        payload: invoicePayload,
        provider_token: "",
        currency: "XTR",
        prices: [
          { label: "AIDYOR Pro (30 days)", amount: PREMIUM_PRICE_STARS }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Telegram] Failed to send invoice:", error);
      return false;
    }

    console.log(`[Telegram] Stars invoice sent to ${chatId} for user ${userId}`);
    return true;
  } catch (error) {
    console.error("[Telegram] Error sending invoice:", error);
    return false;
  }
}

async function answerPreCheckoutQuery(preCheckoutQueryId, ok, errorMessage) {
  try {
    const response = await fetch(`${TELEGRAM_API}/answerPreCheckoutQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pre_checkout_query_id: preCheckoutQueryId,
        ok,
        error_message: errorMessage,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Telegram] Failed to answer pre-checkout query:", error);
      return false;
    }

    console.log(`[Telegram] Pre-checkout query ${preCheckoutQueryId} answered: ${ok}`);
    return true;
  } catch (error) {
    console.error("[Telegram] Error answering pre-checkout query:", error);
    return false;
  }
}

async function handlePreCheckoutQuery(query) {
  if (!query) return;

  console.log(`[Telegram] Pre-checkout query from user ${query.from.id}: ${query.invoice_payload}`);

  const { data: order, error } = await supabase
    .from("pending_orders")
    .select("*")
    .eq("invoice_payload", query.invoice_payload)
    .eq("status", "pending")
    .maybeSingle();

  if (error || !order) {
    console.error("[Telegram] Order not found or expired:", query.invoice_payload);
    await answerPreCheckoutQuery(query.id, false, "Order not found or expired. Please try /upgrade again.");
    return;
  }

  if (order.amount_cents !== query.total_amount) {
    console.error("[Telegram] Amount mismatch:", order.amount_cents, "vs", query.total_amount);
    await answerPreCheckoutQuery(query.id, false, "Price mismatch. Please try /upgrade again.");
    return;
  }

  await answerPreCheckoutQuery(query.id, true);
}

async function handleSuccessfulPayment(message) {
  const payment = message.successful_payment;
  if (!payment) return;

  const userId = message.from?.id;
  if (!userId) {
    console.error("[Telegram] No user ID in successful payment");
    return;
  }

  console.log(`[Telegram] Successful payment from user ${userId}: ${payment.invoice_payload}`);

  const { error: orderError } = await supabase
    .from("pending_orders")
    .update({ status: "completed" })
    .eq("invoice_payload", payment.invoice_payload);

  if (orderError) {
    console.error("[Telegram] Failed to update order status:", orderError);
  }

  const startedAt = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PREMIUM_DURATION_DAYS);

  const { data: existingSub } = await supabase
    .from("premium_subscriptions")
    .select("*")
    .eq("telegram_user_id", userId)
    .maybeSingle();

  if (existingSub) {
    const currentExpiry = existingSub.expires_at ? new Date(existingSub.expires_at) : new Date();
    const newExpiry = currentExpiry > new Date() ? currentExpiry : new Date();
    newExpiry.setDate(newExpiry.getDate() + PREMIUM_DURATION_DAYS);

    const { error: updateError } = await supabase
      .from("premium_subscriptions")
      .update({
        status: "active",
        started_at: existingSub.started_at || startedAt.toISOString(),
        expires_at: newExpiry.toISOString(),
        telegram_payment_charge_id: payment.telegram_payment_charge_id,
        provider_payment_charge_id: payment.provider_payment_charge_id,
      })
      .eq("id", existingSub.id);

    if (updateError) {
      console.error("[Telegram] Failed to update subscription:", updateError);
    }
  } else {
    const { error: insertError } = await supabase
      .from("premium_subscriptions")
      .insert({
        telegram_user_id: userId,
        status: "active",
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        telegram_payment_charge_id: payment.telegram_payment_charge_id,
        provider_payment_charge_id: payment.provider_payment_charge_id,
      });

    if (insertError) {
      console.error("[Telegram] Failed to create subscription:", insertError);
    }
  }

  await sendTelegramMessage(
    message.chat.id,
    `🎉 <b>Payment Successful!</b>\n\n` +
    `✅ You are now an <b>AIDYOR Pro</b> user!\n\n` +
    `<b>Your benefits:</b>\n` +
    `• Unlimited token scans\n` +
    `• Priority whale & security alerts\n` +
    `• Advanced AI risk analysis\n` +
    `• 30-day subscription\n\n` +
    `Your Pro subscription expires on <b>${expiresAt.toLocaleDateString()}</b>\n\n` +
    `Thank you for supporting AIDYOR! 🙏`
  );
}

// ---------- Subscription / usage ----------

async function checkPremiumStatus(userId) {
  const { data: sub, error } = await supabase
    .from("premium_subscriptions")
    .select("*")
    .eq("telegram_user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !sub) {
    return { isPremium: false };
  }

  const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null;
  if (!expiresAt || expiresAt < new Date()) {
    await supabase
      .from("premium_subscriptions")
      .update({ status: "expired" })
      .eq("id", sub.id);
    return { isPremium: false };
  }

  return { isPremium: true, expiresAt };
}

async function getDailyScanCount(userId) {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("scan_usage")
    .select("scan_count")
    .eq("telegram_user_id", userId)
    .eq("scan_date", today)
    .maybeSingle();

  if (error || !data) {
    return 0;
  }

  return data.scan_count;
}

async function incrementScanCount(userId) {
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("scan_usage")
    .select("id, scan_count")
    .eq("telegram_user_id", userId)
    .eq("scan_date", today)
    .maybeSingle();

  if (existing) {
    const newCount = existing.scan_count + 1;
    await supabase
      .from("scan_usage")
      .update({ scan_count: newCount })
      .eq("id", existing.id);
    return newCount;
  } else {
    await supabase
      .from("scan_usage")
      .insert({
        telegram_user_id: userId,
        scan_date: today,
        scan_count: 1,
      });
    return 1;
  }
}

async function canUserScan(userId) {
  const { isPremium } = await checkPremiumStatus(userId);

  if (isPremium) {
    return { allowed: true, remaining: -1, isPremium: true };
  }

  const scanCount = await getDailyScanCount(userId);
  const remaining = FREE_DAILY_SCAN_LIMIT - scanCount;

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    isPremium: false,
  };
}

// ---------- Scanning ----------

async function scanToken(address, network) {
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

function formatScanResult(result) {
  if (!result?.success || !result?.data) {
    return "❌ <b>Scan Failed</b>\n\nCould not analyze this token. It may not be listed on any DEX yet.";
  }

  const { token, riskAssessment, marketData, securityData, simulation, aiExplanation } = result.data;
  const emoji = RISK_EMOJIS[riskAssessment.riskLevel] || "❓";

  let message = `${emoji} <b>${esc(token.name)} (${esc(token.symbol)})</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  message += `📊 <b>Risk Score:</b> ${riskAssessment.overallScore}/100 (${esc(riskAssessment.riskLevel)})\n`;
  message += `📈 <b>Trend:</b> ${esc(riskAssessment.trend)}\n`;
  message += `🔗 <b>Network:</b> ${esc(token.network)}\n\n`;

  message += `💰 <b>Market Data</b>\n`;
  message += `• Price: $${marketData.price < 0.01 ? marketData.price.toExponential(2) : marketData.price.toFixed(4)}\n`;
  message += `• Liquidity: $${formatNumber(marketData.liquidity)}\n`;
  message += `• 24h Volume: $${formatNumber(marketData.volume24h)}\n`;
  message += `• 24h Change: ${marketData.change24h > 0 ? "+" : ""}${marketData.change24h.toFixed(2)}%\n\n`;

  message += `🛡️ <b>Security</b>\n`;
  message += `• Honeypot: ${securityData.isHoneypot ? "⚠️ YES" : "✅ No"}\n`;
  message += `• Buy Tax: ${securityData.buyTax}%\n`;
  message += `• Sell Tax: ${securityData.sellTax}%\n`;
  message += `• Mintable: ${securityData.isMintable ? "⚠️ Yes" : "✅ No"}\n`;

  if (securityData.lockInfo) {
    message += `• Liquidity Locked: ${securityData.lockInfo.isLocked ? `✅ ${securityData.lockInfo.lockPercentage}%` : "❌ No"}\n`;
  }
  message += "\n";

  message += `🎰 <b>Activity:</b> ${esc(String(simulation.pumpDumpStatus).toUpperCase())}\n`;
  message += `${esc(simulation.recommendation)}\n\n`;

  if (aiExplanation) {
    message += `🤖 <b>AI Analysis</b>\n`;
    message += `${esc(aiExplanation.recommendation)}\n`;
  }

  message += `\n⏱️ <i>Scanned in ${(result.processingTime / 1000).toFixed(1)}s</i>`;

  return message;
}

function formatNumber(num) {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

function parseCommand(text) {
  const parts = text.trim().split(/\s+/);
  const command = parts[0].toLowerCase().replace("@aidyor_bot", "");
  return { command, args: parts.slice(1) };
}

function isValidEvmAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isValidSolanaAddress(address) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// Whole message is an address, or (private chats only) an EVM address is found inside the text.
function extractAddress(text, isPrivate) {
  const t = text.trim();
  if (isValidEvmAddress(t) || isValidSolanaAddress(t)) return t;
  if (isPrivate) {
    const match = t.match(/0x[a-fA-F0-9]{40}/);
    if (match) return match[0];
  }
  return null;
}

// Single scan flow used by /scan, plain-address messages, and the example button.
async function runScan(chatId, userId, address, network, replyToMessageId) {
  if (userId) {
    const { allowed, isPremium } = await canUserScan(userId);

    if (!allowed) {
      await sendTelegramMessage(
        chatId,
        `🚫 <b>Daily Limit Reached</b>\n\n` +
        `You've used all ${FREE_DAILY_SCAN_LIMIT} free scans for today.\n\n` +
        `<b>Options:</b>\n` +
        `• Wait until tomorrow for more free scans\n` +
        `• Upgrade to Pro for <b>unlimited scans</b>`,
        { replyToMessageId, replyMarkup: upgradeKeyboard }
      );
      return;
    }

    if (!isPremium) {
      await incrementScanCount(userId);
    }
  }

  await sendTelegramMessage(
    chatId,
    `🔍 <b>Scanning...</b>\n\nAnalyzing <code>${address.slice(0, 10)}...${address.slice(-6)}</code>\n\nThis may take a few seconds.`,
    { replyToMessageId }
  );

  const scanResult = await scanToken(address, network);
  let output = formatScanResult(scanResult);

  if (userId) {
    const { remaining: scansLeft, isPremium } = await canUserScan(userId);
    if (!isPremium && scansLeft >= 0) {
      output += `\n\n📊 <i>Free scans remaining today: ${scansLeft}/${FREE_DAILY_SCAN_LIMIT}</i>`;
    }
  }

  if (scanResult?.success) {
    output += `\n\n🛡️ <a href="https://t.me/AIDYOR_BOT">@AIDYOR_BOT</a>`;
  }

  await sendTelegramMessage(chatId, output, {
    replyMarkup: scanResult?.success ? scanResultKeyboard : undefined,
  });
}

async function handleUpgrade(chatId, userId) {
  if (!userId) {
    await sendTelegramMessage(chatId, "❌ Could not identify your user ID. Please try again.");
    return;
  }

  const { isPremium, expiresAt } = await checkPremiumStatus(userId);
  if (isPremium && expiresAt) {
    await sendTelegramMessage(
      chatId,
      `⭐ <b>You're already an AIDYOR Pro user!</b>\n\n` +
      `Your subscription expires on <b>${expiresAt.toLocaleDateString()}</b>\n\n` +
      `Want to extend? Use /upgrade again after expiry.`
    );
    return;
  }

  const sent = await sendInvoice(chatId, userId);
  if (!sent) {
    await sendTelegramMessage(
      chatId,
      `❌ <b>Failed to create invoice</b>\n\nPlease try again later.`
    );
  }
}

// ---------- Handlers ----------

async function handleCommand(message) {
  const text = message.text || "";
  const chatId = message.chat.id;
  const userId = message.from?.id;
  const isPrivate = message.chat.type === "private";
  const { command, args } = parseCommand(text);

  console.log(`[Telegram] Command: ${command}, Args: ${args.join(", ")}, Chat: ${chatId}, User: ${userId}`);

  switch (command) {
    case "/start":
      if (args[0]) {
        console.log(`[Telegram] Start payload: ${String(args[0]).slice(0, 64)}`);
      }
      await sendTelegramMessage(
        chatId,
        `🛡️ <b>Is this token a scam?</b>\n\n` +
          `Paste a token address and get a risk score in seconds: honeypots, rug pulls, liquidity locks, taxes.\n\n` +
          `🌐 EVM chains + Solana · ${FREE_DAILY_SCAN_LIMIT} free scans/day · no signup\n` +
          `📸 Screenshot scanning is available in the Web App\n\n` +
          `<i>Not financial advice. Always DYOR.</i>`,
        { replyMarkup: startKeyboard }
      );
      break;

    case "/help":
      await sendTelegramMessage(
        chatId,
        `📖 <b>AIDYOR Bot Help</b>\n\n` +
          `<b>How to scan a token:</b>\n` +
          `1. Copy the token's contract address\n` +
          `2. Paste it here, or send: <code>/scan &lt;address&gt;</code>\n\n` +
          `<b>Optional: Specify network</b>\n` +
          `<code>/scan &lt;address&gt; ethereum</code>\n` +
          `<code>/scan &lt;address&gt; bsc</code>\n` +
          `<code>/scan &lt;address&gt; solana</code>\n\n` +
          `<b>Premium Commands:</b>\n` +
          `/upgrade - Get AIDYOR Pro (${PREMIUM_PRICE_STARS} ⭐/month)\n` +
          `/status - Check subscription status\n\n` +
          `<b>Risk Score Meanings:</b>\n` +
          `✅ 70-100: Low Risk\n` +
          `⚠️ 40-69: Medium Risk\n` +
          `🔴 20-39: High Risk\n` +
          `☠️ 0-19: Critical Risk\n\n` +
          `<i>Always DYOR - this is not financial advice!</i>`,
        { replyMarkup: webAppKeyboard }
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

    case "/upgrade":
      await handleUpgrade(chatId, userId);
      break;

    case "/status": {
      if (!userId) {
        await sendTelegramMessage(chatId, "❌ Could not identify your user ID.");
        return;
      }

      const { isPremium, expiresAt } = await checkPremiumStatus(userId);
      if (isPremium && expiresAt) {
        const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        await sendTelegramMessage(
          chatId,
          `⭐ <b>AIDYOR Pro Status</b>\n\n` +
          `✅ <b>Active</b>\n\n` +
          `Expires: <b>${expiresAt.toLocaleDateString()}</b>\n` +
          `Days remaining: <b>${daysLeft}</b>\n\n` +
          `<b>Your benefits:</b>\n` +
          `• Unlimited token scans\n` +
          `• Priority alerts\n` +
          `• Advanced AI analysis`
        );
      } else {
        const scansUsed = await getDailyScanCount(userId);
        const scansRemaining = FREE_DAILY_SCAN_LIMIT - scansUsed;
        await sendTelegramMessage(
          chatId,
          `📊 <b>AIDYOR Status</b>\n\n` +
          `You're on the <b>Free</b> plan.\n\n` +
          `<b>Today's usage:</b>\n` +
          `• Scans used: ${scansUsed}/${FREE_DAILY_SCAN_LIMIT}\n` +
          `• Remaining: ${Math.max(0, scansRemaining)} scans\n\n` +
          `<b>Upgrade to Pro for:</b>\n` +
          `• Unlimited token scans\n` +
          `• Priority whale & security alerts\n` +
          `• Advanced AI risk analysis`,
          { replyMarkup: upgradeKeyboard }
        );
      }
      break;
    }

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

      if (!isValidEvmAddress(address) && !isValidSolanaAddress(address)) {
        await sendTelegramMessage(
          chatId,
          `❌ Invalid address format.\n\nPlease provide a valid EVM (0x...) or Solana address.`,
          { replyToMessageId: message.message_id }
        );
        return;
      }

      await runScan(chatId, userId, address, network, message.message_id);
      break;
    }

    default: {
      if (command.startsWith("/")) {
        await sendTelegramMessage(
          chatId,
          `❓ Unknown command: ${esc(command)}\n\nUse /help to see available commands.`
        );
        break;
      }

      const found = extractAddress(text, isPrivate);
      if (found) {
        await runScan(chatId, userId, found, undefined, message.message_id);
      } else if (isPrivate) {
        await sendTelegramMessage(
          chatId,
          `👋 Send me a token contract address (0x… or Solana) and I'll scan it.`,
          { replyMarkup: startKeyboard }
        );
      }
    }
  }
}

async function handlePhoto(message) {
  if (message.chat.type !== "private") return;
  await sendTelegramMessage(
    message.chat.id,
    `📸 <b>Screenshot scanning</b> is available in the Web App.\n\n` +
    `Here in Telegram, paste the token's contract address and I'll scan it.`,
    { replyMarkup: webAppKeyboard }
  );
}

async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message?.chat?.id;
  const userId = callbackQuery.from?.id;

  await answerCallbackQuery(callbackQuery.id);
  if (!chatId) return;

  switch (callbackQuery.data) {
    case "example":
      await runScan(chatId, userId, EXAMPLE_ADDRESS, undefined, undefined);
      break;
    case "upgrade":
      await handleUpgrade(chatId, userId);
      break;
    default:
      console.log(`[Telegram] Unknown callback data: ${String(callbackQuery.data).slice(0, 32)}`);
  }
}

async function handleSendAlert(request) {
  const { chatId, alertType, data } = request;

  let message = "";

  switch (alertType) {
    case "whale": {
      const emoji = data.type === "buy" ? "🐋📈" : "🐋📉";
      message =
        `${emoji} <b>Whale ${data.type.toUpperCase()} Alert!</b>\n\n` +
        `<b>${data.symbol}</b> (${data.network})\n` +
        `💰 Amount: ${data.amount}\n` +
        `${data.description || "Large transaction detected."}`;
      break;
    }

    case "security": {
      const severityMap = {
        critical: "🚨",
        high: "⚠️",
        medium: "⚡",
        info: "ℹ️",
      };
      const severityEmoji = severityMap[data.severity] || "📢";
      message =
        `${severityEmoji} <b>Security Alert</b>\n\n` +
        `<b>${data.title}</b>\n\n` +
        `${data.summary}\n\n` +
        `Source: ${data.source}`;
      if (data.link) {
        message += `\n\n<a href="${data.link}">Read More</a>`;
      }
      break;
    }

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

async function getWebhookInfo() {
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

async function setWebhook(url) {
  try {
    const secretToken = await getWebhookSecret();
    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        secret_token: secretToken,
        allowed_updates: ["message", "edited_message", "pre_checkout_query", "callback_query"],
      }),
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

// Sets the command menu, description (shown before /start) and short description (shown on the bot profile).
async function setupBot() {
  const calls = [
    ["setMyCommands", {
      commands: [
        { command: "scan", description: "Scan a token: /scan <address> [network]" },
        { command: "networks", description: "List supported networks" },
        { command: "status", description: "Your plan and daily scans" },
        { command: "upgrade", description: "Get AIDYOR Pro" },
        { command: "help", description: "How to use the bot" },
      ],
    }],
    ["setMyDescription", {
      description:
        "Is this token a scam? Paste any token address and get a risk score in seconds: honeypot check, rug-pull signals, liquidity locks, taxes and holder concentration. EVM chains + Solana. Free daily scans, no signup.",
    }],
    ["setMyShortDescription", {
      short_description: "AI crypto token risk scanner. Paste an address, get a scam check in seconds.",
    }],
  ];

  const results = [];
  for (const [method, payload] of calls) {
    try {
      const response = await fetch(`${TELEGRAM_API}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      results.push({ method, ok: data.ok === true, description: data.description });
    } catch (error) {
      results.push({ method, ok: false, description: "request failed" });
    }
  }

  return new Response(JSON.stringify({ success: results.every((r) => r.ok), results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function forbidden() {
  return new Response(
    JSON.stringify({ success: false, error: "Forbidden" }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const dynamicCorsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: dynamicCorsHeaders });
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

    const isTelegramUpdate =
      typeof body.update_id === "number" &&
      (body.message || body.edited_message || body.pre_checkout_query || body.callback_query);

    if (isTelegramUpdate) {
      const expected = await getWebhookSecret();
      const provided = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (!safeEqual(provided, expected)) {
        console.warn("[Telegram] Rejected unauthenticated webhook update");
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const logSafeType = body.pre_checkout_query ? 'pre_checkout_query' :
                        body.callback_query ? 'callback_query' :
                        body.message?.successful_payment ? 'successful_payment' :
                        body.update_id ? 'telegram_update' :
                        body.action || 'unknown';
    console.log("[Telegram] Incoming request type:", logSafeType);

    if (body.pre_checkout_query) {
      await handlePreCheckoutQuery(body.pre_checkout_query);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.callback_query) {
      await handleCallbackQuery(body.callback_query);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.update_id && body.message) {
      const update = body;

      if (update.message?.successful_payment) {
        await handleSuccessfulPayment(update.message);
      } else if (update.message?.text) {
        await handleCommand(update.message);
      } else if (update.message?.photo) {
        await handlePhoto(update.message);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Other Telegram updates (e.g. edited_message): acknowledge so Telegram does not retry.
    if (isTelegramUpdate) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = body;

    switch (action) {
      case "send_alert":
        return await handleSendAlert(body);

      case "get_webhook_info":
        if (!isAdminRequest(req)) return forbidden();
        return await getWebhookInfo();

      case "set_webhook": {
        if (!isAdminRequest(req)) return forbidden();
        const webhookUrl = body.url || `${SUPABASE_URL}/functions/v1/telegram-webhook`;
        return await setWebhook(webhookUrl);
      }

      case "setup_bot":
        if (!isAdminRequest(req)) return forbidden();
        return await setupBot();

      case "test": {
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
      }

      case "check_premium": {
        if (!body.telegramUserId) {
          return new Response(
            JSON.stringify({ success: false, error: "telegramUserId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const premiumStatus = await checkPremiumStatus(body.telegramUserId);
        return new Response(
          JSON.stringify({ success: true, ...premiumStatus }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unknown action. Valid actions: send_alert, get_webhook_info, set_webhook, setup_bot, test, check_premium",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[Internal] Telegram webhook error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Request processing failed",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
