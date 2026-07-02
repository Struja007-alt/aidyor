import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, Loader2, ArrowLeft, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { usePasskey } from "@/hooks/usePasskey";
import { toast } from "sonner";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Auth = () => {
  useEffect(() => {
    document.title = "Sign In | AIDYOR";
  }, []);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { user, signIn, signUp } = useAuth();
  const { loading: passkeyLoading, isPasskeySupported, authenticateWithPasskey } = usePasskey();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const validateEmail = () => {
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setErrors(prev => ({ ...prev, email: result.error.errors[0].message }));
      return false;
    }
    setErrors(prev => ({ ...prev, email: undefined }));
    return true;
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Welcome back!");
          navigate("/");
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error("An account with this email already exists");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Account created successfully!");
          navigate("/");
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!validateEmail()) return;
    
    const success = await authenticateWithPasskey(email);
    if (success) {
      navigate("/");
    }
  };

  const isLoading = loading || passkeyLoading;
  const showPasskeyOption = isLogin && isPasskeySupported();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        {/* Auth Card */}
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Shield className="w-8 h-8 text-primary" />
            <span className="font-display text-2xl font-bold text-foreground">AIDYOR</span>
          </div>

          {/* Title */}
          <h1 className="text-xl font-display font-bold text-foreground text-center mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isLogin 
              ? "Sign in to sync your watchlist across devices" 
              : "Create an account to save your watchlist"}
          </p>

          {/* Passkey Login Option */}
          {showPasskeyOption && (
            <>
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="passkey-email">Email for Passkey</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="passkey-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-danger">{errors.email}</p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-primary/50 hover:bg-primary/10"
                  onClick={handlePasskeyLogin}
                  disabled={isLoading}
                >
                  {passkeyLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Fingerprint className="w-5 h-5" />
                  )}
                  Sign in with Passkey
                </Button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with password
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!showPasskeyOption && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-danger">{errors.email}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-danger">{errors.password}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                isLogin ? "Sign In with Password" : "Create Account"
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="ml-1 text-primary hover:underline font-medium"
                disabled={isLoading}
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>

          {/* Info */}
          <div className="mt-6 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground text-center">
              {isLogin ? (
                <>🔐 Use passkey (biometrics) for faster, more secure sign-in</>
              ) : (
                <>🔐 After signing up, you can add a passkey in settings</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;