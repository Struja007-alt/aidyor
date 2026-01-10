import { useState, useCallback } from "react";
import { Upload, Image, X, Scan, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  tokenName: string;
  network: string;
  amount: string;
  riskLevel: "safe" | "warning" | "danger";
  warnings: string[];
}

export const ScreenshotUploader = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

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
  }, []);

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
      setUploadedImage(e.target?.result as string);
      analyzeImage();
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = () => {
    setIsAnalyzing(true);
    setResult(null);
    
    setTimeout(() => {
      setResult({
        tokenName: "PEPE Token",
        network: "Ethereum",
        amount: "1,000,000 PEPE",
        riskLevel: "warning",
        warnings: [
          "Token has high volatility",
          "Recently created contract (< 30 days)",
          "Limited trading history"
        ]
      });
      setIsAnalyzing(false);
    }, 2500);
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setResult(null);
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
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Image className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-xl text-foreground">Screenshot Analyzer</h3>
          <p className="text-sm text-muted-foreground">Upload token transfer screenshots for analysis</p>
        </div>
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
                <Scan className="w-12 h-12 text-primary animate-scan mb-2" />
                <p className="font-display text-primary text-sm">ANALYZING IMAGE...</p>
              </div>
            )}
          </div>

          {result && !isAnalyzing && (
            <div className={cn(
              "p-4 rounded-xl border animate-fade-in",
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
          )}

          {!isAnalyzing && !result && (
            <Button 
              onClick={analyzeImage}
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
