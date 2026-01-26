/**
 * @fileoverview Telegram Bot configuration component
 * Allows users to connect their Telegram chat for receiving alerts
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Send, Bot, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TelegramSettingsProps {
  /** Callback when settings are saved */
  onSave?: (chatId: string, settings: TelegramAlertSettings) => void;
}

interface TelegramAlertSettings {
  whaleAlerts: boolean;
  securityAlerts: boolean;
  watchlistAlerts: boolean;
}

export function TelegramSettings({ onSave }: TelegramSettingsProps) {
  const [chatId, setChatId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [settings, setSettings] = useState<TelegramAlertSettings>({
    whaleAlerts: true,
    securityAlerts: true,
    watchlistAlerts: true,
  });

  const testConnection = useCallback(async () => {
    if (!chatId.trim()) {
      toast.error("Please enter your Telegram Chat ID");
      return;
    }

    setIsTesting(true);

    try {
      const { data, error } = await supabase.functions.invoke("telegram-webhook", {
        body: {
          action: "test",
          chatId: chatId.trim(),
        },
      });

      if (error) throw error;

      if (data?.success) {
        setIsConnected(true);
        toast.success("Connected! Check your Telegram for a test message.");
        
        // Store in localStorage
        localStorage.setItem("telegram_chat_id", chatId.trim());
        localStorage.setItem("telegram_settings", JSON.stringify(settings));
        
        onSave?.(chatId.trim(), settings);
      } else {
        throw new Error(data?.error || "Failed to send test message");
      }
    } catch (error) {
      console.error("Telegram test failed:", error);
      toast.error("Failed to connect. Check your Chat ID and try again.");
      setIsConnected(false);
    } finally {
      setIsTesting(false);
    }
  }, [chatId, settings, onSave]);

  const handleSettingChange = (key: keyof TelegramAlertSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    if (isConnected) {
      localStorage.setItem("telegram_settings", JSON.stringify(newSettings));
      onSave?.(chatId, newSettings);
    }
  };

  // Load saved settings on mount
  useState(() => {
    const savedChatId = localStorage.getItem("telegram_chat_id");
    const savedSettings = localStorage.getItem("telegram_settings");
    
    if (savedChatId) {
      setChatId(savedChatId);
      setIsConnected(true);
    }
    
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse saved Telegram settings");
      }
    }
  });

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#0088cc]/20">
                  <Bot className="h-5 w-5 text-[#0088cc]" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Telegram Bot
                    {isConnected && (
                      <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Receive alerts directly in Telegram
                  </CardDescription>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Instructions */}
            <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-foreground">How to connect:</p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                <li>
                  Open{" "}
                  <a
                    href="https://t.me/aidyor_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    @aidyor_bot <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  in Telegram
                </li>
                <li>Send <code className="bg-muted px-1 rounded">/start</code> to the bot</li>
                <li>
                  Get your Chat ID from{" "}
                  <a
                    href="https://t.me/userinfobot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    @userinfobot <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Paste your Chat ID below</li>
              </ol>
            </div>

            {/* Chat ID Input */}
            <div className="space-y-2">
              <Label htmlFor="telegram-chat-id">Chat ID</Label>
              <div className="flex gap-2">
                <Input
                  id="telegram-chat-id"
                  placeholder="e.g., 123456789"
                  value={chatId}
                  onChange={(e) => {
                    setChatId(e.target.value);
                    setIsConnected(false);
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={testConnection}
                  disabled={isTesting || !chatId.trim()}
                  variant={isConnected ? "outline" : "default"}
                  className="min-w-[100px]"
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isConnected ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Connected
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Test
                    </>
                  )}
                </Button>
              </div>
              {!isConnected && chatId && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Click Test to verify your connection
                </p>
              )}
            </div>

            {/* Alert Settings */}
            {isConnected && (
              <div className="space-y-4 pt-2 border-t border-border/50">
                <p className="text-sm font-medium">Alert Types</p>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="whale-alerts" className="text-sm">Whale Alerts</Label>
                    <p className="text-xs text-muted-foreground">Large transactions (&gt;$50k)</p>
                  </div>
                  <Switch
                    id="whale-alerts"
                    checked={settings.whaleAlerts}
                    onCheckedChange={(checked) => handleSettingChange("whaleAlerts", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="security-alerts" className="text-sm">Security Alerts</Label>
                    <p className="text-xs text-muted-foreground">Scams, hacks, vulnerabilities</p>
                  </div>
                  <Switch
                    id="security-alerts"
                    checked={settings.securityAlerts}
                    onCheckedChange={(checked) => handleSettingChange("securityAlerts", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="watchlist-alerts" className="text-sm">Watchlist Alerts</Label>
                    <p className="text-xs text-muted-foreground">Updates on your saved tokens</p>
                  </div>
                  <Switch
                    id="watchlist-alerts"
                    checked={settings.watchlistAlerts}
                    onCheckedChange={(checked) => handleSettingChange("watchlistAlerts", checked)}
                  />
                </div>
              </div>
            )}

            {/* Bot Commands */}
            {isConnected && (
              <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-2 mt-4">
                <p className="font-medium text-foreground">Bot Commands:</p>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <code className="text-xs bg-muted px-2 py-1 rounded">/scan &lt;address&gt;</code>
                  <span className="text-xs">Analyze a token</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">/help</code>
                  <span className="text-xs">Show all commands</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">/networks</code>
                  <span className="text-xs">List supported chains</span>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
