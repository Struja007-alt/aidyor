import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

// Dynamic CORS - restrict to allowed origins
const ALLOWED_ORIGINS = [
  'https://id-preview--eaa8d564-cf6a-4d6f-81e2-0ddab66a4a49.lovable.app',
  'https://aidyor.lovable.app',
  'https://aidyor.app',
  'https://www.aidyor.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

// Allow Lovable preview domains dynamically
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')) return true;
  return false;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const corsHeaders = getCorsHeaders(null); // Default for non-request contexts

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_PAYMENT_PROVIDER_TOKEN = Deno.env.get("TELEGRAM_PAYMENT_PROVIDER_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Supabase client with service role for database operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Subscription config
const PREMIUM_PRICE_CENTS = 999; // $9.99
const PREMIUM_DURATION_DAYS = 30;
const FREE_DAILY_SCAN_LIMIT = 10;

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
  successful_payment?: {
    currency: string;
    total_amount: number;
    invoice_payload: string;
    telegram_payment_charge_id: string;
    provider_payment_charge_id: string;
  };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  pre_checkout_query?: {
    id: string;
    from: { id: number; username?: string; first_name?: string };
    currency: string;
    total_amount: number;
    invoice_payload: string;
  };
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
 * Send an invoice for premium upgrade
 */
async function sendInvoice(chatId: number, userId: number): Promise<boolean> {
  const invoicePayload = `premium_${userId}_${Date.now()}`;
  
  // Store pending order in database
  const { error: dbError } = await supabase
    .from("pending_orders")
    .insert({
      telegram_user_id: userId,
      invoice_payload: invoicePayload,
      amount_cents: PREMIUM_PRICE_CENTS,
      currency: "USD",
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
        provider_token: TELEGRAM_PAYMENT_PROVIDER_TOKEN,
        currency: "USD",
        prices: [
          { label: "AIDYOR Pro (30 days)", amount: PREMIUM_PRICE_CENTS }
        ],
        photo_url: "https://id-preview--eaa8d564-cf6a-4d6f-81e2-0ddab66a4a49.lovable.app/icon-512.png",
        photo_width: 512,
        photo_height: 512,
        need_email: false,
        need_phone_number: false,
        need_shipping_address: false,
        is_flexible: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Telegram] Failed to send invoice:", error);
      return false;
    }

    console.log(`[Telegram] Invoice sent to ${chatId} for user ${userId}`);
    return true;
  } catch (error) {
    console.error("[Telegram] Error sending invoice:", error);
    return false;
  }
}

/**
 * Answer pre-checkout query (validate payment before processing)
 */
async function answerPreCheckoutQuery(
  preCheckoutQueryId: string,
  ok: boolean,
  errorMessage?: string
): Promise<boolean> {
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

/**
 * Handle pre-checkout query - validate payment before it's processed
 */
async function handlePreCheckoutQuery(query: TelegramUpdate["pre_checkout_query"]): Promise<void> {
  if (!query) return;

  console.log(`[Telegram] Pre-checkout query from user ${query.from.id}: ${query.invoice_payload}`);

  // Verify the order exists and is still pending
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

  // Verify amount matches
  if (order.amount_cents !== query.total_amount) {
    console.error("[Telegram] Amount mismatch:", order.amount_cents, "vs", query.total_amount);
    await answerPreCheckoutQuery(query.id, false, "Price mismatch. Please try /upgrade again.");
    return;
  }

  // All good - approve the payment
  await answerPreCheckoutQuery(query.id, true);
}

/**
 * Handle successful payment - activate premium subscription
 */
async function handleSuccessfulPayment(message: TelegramMessage): Promise<void> {
  const payment = message.successful_payment;
  if (!payment) return;

  const userId = message.from?.id;
  if (!userId) {
    console.error("[Telegram] No user ID in successful payment");
    return;
  }

  console.log(`[Telegram] Successful payment from user ${userId}: ${payment.invoice_payload}`);

  // Update pending order status
  const { error: orderError } = await supabase
    .from("pending_orders")
    .update({ status: "completed" })
    .eq("invoice_payload", payment.invoice_payload);

  if (orderError) {
    console.error("[Telegram] Failed to update order status:", orderError);
  }

  // Calculate subscription dates
  const startedAt = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PREMIUM_DURATION_DAYS);

  // Check if user already has a subscription
  const { data: existingSub } = await supabase
    .from("premium_subscriptions")
    .select("*")
    .eq("telegram_user_id", userId)
    .maybeSingle();

  if (existingSub) {
    // Extend existing subscription
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
    // Create new subscription
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

  // Send confirmation message
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

/**
 * Check if user has active premium subscription
 */
async function checkPremiumStatus(userId: number): Promise<{ isPremium: boolean; expiresAt?: Date }> {
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
    // Subscription expired - update status
    await supabase
      .from("premium_subscriptions")
      .update({ status: "expired" })
      .eq("id", sub.id);
    return { isPremium: false };
  }

  return { isPremium: true, expiresAt };
}

/**
 * Get today's scan count for a user
 */
async function getDailyScanCount(userId: number): Promise<number> {
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

/**
 * Increment scan count for a user (returns new count)
 */
async function incrementScanCount(userId: number): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  
  // Try to upsert the scan count
  const { data: existing } = await supabase
    .from("scan_usage")
    .select("id, scan_count")
    .eq("telegram_user_id", userId)
    .eq("scan_date", today)
    .maybeSingle();

  if (existing) {
    // Update existing record
    const newCount = existing.scan_count + 1;
    await supabase
      .from("scan_usage")
      .update({ scan_count: newCount })
      .eq("id", existing.id);
    return newCount;
  } else {
    // Insert new record
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

/**
 * Check if user can perform a scan (premium or under free limit)
 */
async function canUserScan(userId: number): Promise<{ allowed: boolean; remaining: number; isPremium: boolean }> {
  const { isPremium } = await checkPremiumStatus(userId);
  
  if (isPremium) {
    return { allowed: true, remaining: -1, isPremium: true }; // -1 = unlimited
  }

  const scanCount = await getDailyScanCount(userId);
  const remaining = FREE_DAILY_SCAN_LIMIT - scanCount;
  
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    isPremium: false,
  };
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
  const userId = message.from?.id;
  const { command, args } = parseCommand(text);

  console.log(`[Telegram] Command: ${command}, Args: ${args.join(", ")}, Chat: ${chatId}, User: ${userId}`);

  switch (command) {
    case "/start":
      await sendTelegramMessage(
        chatId,
        `🛡️ <b>Welcome to AIDYOR Bot!</b>\n\n` +
          `I help you analyze crypto tokens for risks before you invest.\n\n` +
          `<b>Commands:</b>\n` +
          `/scan &lt;address&gt; - Analyze a token\n` +
          `/scan &lt;address&gt; &lt;network&gt; - Analyze on specific chain\n` +
          `/upgrade - Get AIDYOR Pro subscription\n` +
          `/status - Check your subscription status\n` +
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
          `<b>Premium Commands:</b>\n` +
          `/upgrade - Get AIDYOR Pro ($19/month)\n` +
          `/status - Check subscription status\n\n` +
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

    case "/upgrade": {
      if (!userId) {
        await sendTelegramMessage(chatId, "❌ Could not identify your user ID. Please try again.");
        return;
      }

      // Check if already premium
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

      if (!TELEGRAM_PAYMENT_PROVIDER_TOKEN) {
        await sendTelegramMessage(
          chatId,
          `❌ <b>Payments not configured</b>\n\nPlease try again later or contact support.`
        );
        return;
      }

      // Send invoice
      const sent = await sendInvoice(chatId, userId);
      if (!sent) {
        await sendTelegramMessage(
          chatId,
          `❌ <b>Failed to create invoice</b>\n\nPlease try again later.`
        );
      }
      break;
    }

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
          `• Advanced AI risk analysis\n\n` +
          `Use /upgrade to get started! ($19/month)`
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

      // Validate address format
      if (!isValidEvmAddress(address) && !isValidSolanaAddress(address)) {
        await sendTelegramMessage(
          chatId,
          `❌ Invalid address format.\n\nPlease provide a valid EVM (0x...) or Solana address.`,
          { replyToMessageId: message.message_id }
        );
        return;
      }

      // Check scan limits for free users
      if (userId) {
        const { allowed, remaining, isPremium } = await canUserScan(userId);
        
        if (!allowed) {
          await sendTelegramMessage(
            chatId,
            `🚫 <b>Daily Limit Reached</b>\n\n` +
            `You've used all ${FREE_DAILY_SCAN_LIMIT} free scans for today.\n\n` +
            `<b>Options:</b>\n` +
            `• Wait until tomorrow for more free scans\n` +
            `• Upgrade to Pro for <b>unlimited scans</b>\n\n` +
            `Use /upgrade to get Pro ($19/month)`,
            { replyToMessageId: message.message_id }
          );
          return;
        }

        // Increment scan count for free users
        if (!isPremium) {
          await incrementScanCount(userId);
        }
      }

      // Send "scanning" message
      await sendTelegramMessage(
        chatId,
        `🔍 <b>Scanning...</b>\n\nAnalyzing <code>${address.slice(0, 10)}...${address.slice(-6)}</code>\n\nThis may take a few seconds.`,
        { replyToMessageId: message.message_id }
      );

      // Perform scan
      const scanResult = await scanToken(address, network);
      const formattedResult = formatScanResult(scanResult);

      // Show remaining scans for free users
      if (userId) {
        const { remaining: scansLeft, isPremium } = await canUserScan(userId);
        if (!isPremium && scansLeft >= 0) {
          await sendTelegramMessage(
            chatId,
            formattedResult + `\n\n📊 <i>Free scans remaining today: ${scansLeft}/${FREE_DAILY_SCAN_LIMIT}</i>`
          );
        } else {
          await sendTelegramMessage(chatId, formattedResult);
        }
      } else {
        await sendTelegramMessage(chatId, formattedResult);
      }
      break;
    }

    default:
      // Check if message looks like an address (for quick scan)
      if (isValidEvmAddress(text) || isValidSolanaAddress(text)) {
        // Check scan limits for free users
        if (userId) {
          const { allowed, isPremium } = await canUserScan(userId);
          
          if (!allowed) {
            await sendTelegramMessage(
              chatId,
              `🚫 <b>Daily Limit Reached</b>\n\n` +
              `You've used all ${FREE_DAILY_SCAN_LIMIT} free scans for today.\n\n` +
              `Use /upgrade to get unlimited scans!`,
              { replyToMessageId: message.message_id }
            );
            return;
          }

          if (!isPremium) {
            await incrementScanCount(userId);
          }
        }

        await sendTelegramMessage(
          chatId,
          `🔍 <b>Scanning...</b>\n\nAnalyzing <code>${text.slice(0, 10)}...${text.slice(-6)}</code>`,
          { replyToMessageId: message.message_id }
        );
        const quickResult = await scanToken(text);
        const quickFormatted = formatScanResult(quickResult);

        // Show remaining scans for free users
        if (userId) {
          const { remaining: scansLeft, isPremium } = await canUserScan(userId);
          if (!isPremium && scansLeft >= 0) {
            await sendTelegramMessage(
              chatId,
              quickFormatted + `\n\n📊 <i>Free scans remaining today: ${scansLeft}/${FREE_DAILY_SCAN_LIMIT}</i>`
            );
          } else {
            await sendTelegramMessage(chatId, quickFormatted);
          }
        } else {
          await sendTelegramMessage(chatId, quickFormatted);
        }
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
      const severityMap: Record<string, string> = {
        critical: "🚨",
        high: "⚠️",
        medium: "⚡",
        info: "ℹ️",
      };
      const severityEmoji = severityMap[data.severity as string] || "📢";
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
    // Log request type only - do NOT log sensitive payment data or PII
    const logSafeType = body.pre_checkout_query ? 'pre_checkout_query' : 
                        body.message?.successful_payment ? 'successful_payment' :
                        body.update_id ? 'telegram_update' : 
                        body.action || 'unknown';
    console.log("[Telegram] Incoming request type:", logSafeType);

    // Handle pre-checkout query (payment validation)
    if (body.pre_checkout_query) {
      await handlePreCheckoutQuery(body.pre_checkout_query);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle Telegram webhook updates (incoming messages)
    if (body.update_id && body.message) {
      const update = body as TelegramUpdate;
      
      // Handle successful payment
      if (update.message?.successful_payment) {
        await handleSuccessfulPayment(update.message);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Handle text commands
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

      case "check_premium":
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

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unknown action. Valid actions: send_alert, get_webhook_info, set_webhook, test, check_premium",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    // Log detailed error server-side only
    console.error("[Internal] Telegram webhook error:", error);
    // Return generic error message to client (no implementation details)
    return new Response(
      JSON.stringify({
        success: false,
        error: "Request processing failed",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
