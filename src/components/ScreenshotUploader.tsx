import { useState, useCallback } from "react";
import { Upload, Image, X, Scan, AlertTriangle, FileText, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createWorker } from "tesseract.js";

interface AnalysisResult {
  tokenName: string;
  network: string;
  amount: string;
  riskLevel: "safe" | "warning" | "danger";
  warnings: string[];
  extractedAddresses?: string[];
}

// Contract address patterns for various blockchains
const ADDRESS_PATTERNS = {
  ethereum: /0x[a-fA-F0-9]{40}/g, // ETH, BSC, Polygon, etc.
  solana: /[1-9A-HJ-NP-Za-km-z]{32,44}/g, // Base58 addresses
  bitcoin: /[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59}/g,
  tron: /T[A-Za-z1-9]{33}/g,
};

// Sample token data for demo - simulates detected tokens
const sampleTokens = [
  { name: "PEPE", network: "Ethereum", amount: "1,000,000 PEPE" },
  { name: "SHIBA INU", network: "Ethereum", amount: "50,000,000 SHIB" },
  { name: "DOGE", network: "BNB Chain", amount: "25,000 DOGE" },
  { name: "BONK", network: "Solana", amount: "10,000,000 BONK" },
];

const extractAddresses = (text: string): string[] => {
  const addresses = new Set<string>();
  
  // Extract Ethereum-style addresses (ETH, BSC, Polygon, etc.)
  const ethMatches = text.match(ADDRESS_PATTERNS.ethereum);
  if (ethMatches) {
    ethMatches.forEach(addr => addresses.add(addr));
  }
  
  // Extract Solana addresses (filter out false positives)
  const words = text.split(/\s+/);
  words.forEach(word => {
    // Check if it looks like a Solana address (Base58, 32-44 chars)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(word)) {
      // Additional check: shouldn't be a common word
      if (word.length >= 40 && !/^[A-Za-z]+$/.test(word)) {
        addresses.add(word);
      }
    }
  });
  
  // Extract Tron addresses
  const tronMatches = text.match(ADDRESS_PATTERNS.tron);
  if (tronMatches) {
    tronMatches.forEach(addr => addresses.add(addr));
  }
  
  return Array.from(addresses);
};

export const ScreenshotUploader = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [ocrEnabled]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setUploadedImage(imageData);
      analyzeImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const performOCR = async (imageData: string): Promise<string[]> => {
    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      
      const { data: { text } } = await worker.recognize(imageData);
      await worker.terminate();
      
      console.log("OCR Text:", text);
      
      const addresses = extractAddresses(text);
      return addresses;
    } catch (error) {
      console.error("OCR Error:", error);
      return [];
    }
  };

  const analyzeImage = async (imageData: string) => {
    setIsAnalyzing(true);
    setResult(null);
    setOcrProgress(0);
    
    let extractedAddresses: string[] = [];
    
    if (ocrEnabled) {
      extractedAddresses = await performOCR(imageData);
      
      if (extractedAddresses.length > 0) {
        toast.success(`Found ${extractedAddresses.length} contract address${extractedAddresses.length > 1 ? 'es' : ''}!`);
      }
    }
    
    // Simulate additional analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Randomly select a token for demo purposes
    const randomToken = sampleTokens[Math.floor(Math.random() * sampleTokens.length)];
    const riskLevels: Array<"safe" | "warning" | "danger"> = ["safe", "warning", "danger"];
    const randomRisk = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    
    const warningsPool = [
      "Token has high volatility",
      "Recently created contract (< 30 days)",
      "Limited trading history",
      "Large holder concentration detected",
      "Unverified contract source",
      "Low liquidity pool",
    ];
    
    // Select 2-3 random warnings
    const shuffled = warningsPool.sort(() => 0.5 - Math.random());
    const selectedWarnings = shuffled.slice(0, Math.floor(Math.random() * 2) + 2);
    
    setResult({
      tokenName: randomToken.name,
      network: randomToken.network,
      amount: randomToken.amount,
      riskLevel: randomRisk,
      warnings: randomRisk === "safe" ? [] : selectedWarnings,
      extractedAddresses: extractedAddresses.length > 0 ? extractedAddresses : undefined
    });
    setIsAnalyzing(false);
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setResult(null);
    setOcrProgress(0);
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast.success("Address copied to clipboard!");
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      toast.error("Failed to copy address");
    }
  };

  const getRiskConfig = (level: AnalysisResult["riskLevel"]) => {
    switch (level) {
      case "safe": return { color: "text-safe", bg: "bg-safe/10", border: "border-safe/30" };
      case "warning": return { color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" };
      case "danger": return { color: "text-danger", bg: "bg-danger/10", border: "border-danger/30" };
    }
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Image className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-xl text-foreground">Screenshot Analyzer</h3>
            <p className="text-sm text-muted-foreground">Upload token transfer screenshots for analysis</p>
          </div>
        </div>
      </div>

      {/* OCR Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <Label htmlFor="ocr-toggle" className="text-sm font-medium text-foreground cursor-pointer">
              OCR Address Extraction
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically detect contract addresses in screenshots
            </p>
          </div>
        </div>
        <Switch
          id="ocr-toggle"
          checked={ocrEnabled}
          onCheckedChange={setOcrEnabled}
        />
      </div>

      {!uploadedImage ? (
        <div
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-border/50 hover:border-border"
          )}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className={cn(
            "w-12 h-12 mx-auto mb-4 transition-colors",
            isDragging ? "text-primary" : "text-muted-foreground"
          )} />
          <p className="font-medium text-foreground mb-1">
            {isDragging ? "Drop your screenshot here" : "Drag & drop screenshot"}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse files
          </p>
          {ocrEnabled && (
            <p className="text-xs text-primary mt-2">
              OCR enabled - Contract addresses will be extracted automatically
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-border/50">
            <img 
              src={uploadedImage} 
              alt="Uploaded screenshot" 
              className="w-full h-48 object-cover"
            />
            <button
              onClick={clearUpload}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur flex flex-col items-center justify-center">
                <div className="scan-line" />
                {ocrEnabled && ocrProgress > 0 && ocrProgress < 100 ? (
                  <>
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-2" />
                    <p className="font-display text-primary text-sm">OCR PROCESSING... {ocrProgress}%</p>
                  </>
                ) : (
                  <>
                    <Scan className="w-12 h-12 text-primary animate-scan mb-2" />
                    <p className="font-display text-primary text-sm">ANALYZING IMAGE...</p>
                  </>
                )}
              </div>
            )}
          </div>

          {result && !isAnalyzing && (
            <div className="space-y-4 animate-fade-in">
              {/* Extracted Addresses Section */}
              {result.extractedAddresses && result.extractedAddresses.length > 0 && (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-primary" />
                    <h4 className="font-display text-sm text-primary uppercase">
                      Extracted Contract Addresses
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {result.extractedAddresses.map((address, i) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background/50 border border-border/50"
                      >
                        <code className="text-xs text-foreground font-mono truncate flex-1">
                          {address}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyAddress(address)}
                          className="h-7 w-7 p-0 shrink-0"
                        >
                          {copiedAddress === address ? (
                            <Check className="w-3.5 h-3.5 text-safe" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click copy to use address in Token Scanner
                  </p>
                </div>
              )}

              {/* Risk Analysis Section */}
              <div className={cn(
                "p-4 rounded-xl border",
                getRiskConfig(result.riskLevel).bg,
                getRiskConfig(result.riskLevel).border
              )}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-display text-lg text-foreground">{result.tokenName}</h4>
                    <p className="text-sm text-muted-foreground">{result.network} • {result.amount}</p>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-display uppercase",
                    getRiskConfig(result.riskLevel).bg,
                    getRiskConfig(result.riskLevel).color
                  )}>
                    {result.riskLevel}
                  </span>
                </div>
                
                {result.warnings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Findings:</p>
                    {result.warnings.map((warning, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-warning">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isAnalyzing && !result && (
            <Button 
              onClick={() => uploadedImage && analyzeImage(uploadedImage)}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-display"
            >
              <Scan className="w-5 h-5 mr-2" />
              ANALYZE SCREENSHOT
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
