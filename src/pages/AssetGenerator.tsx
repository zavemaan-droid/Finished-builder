import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2, Download, Film, Heart, ImageIcon, Loader2,
  PackagePlus, RefreshCw, Sparkles, Trash2, Upload, Video,
  Paintbrush, Undo2, X, Sliders, Type, Save, Palette, Check
} from "lucide-react";
import { useStudio } from "@/contexts/StudioContext";
import { generateImage, generateVideoStoryboard, type VideoStoryboard } from "@/lib/ai";

type Mode = "project" | "personal";
type AssetKind =
  | "icon" | "logo" | "background" | "character"
  | "screenshot" | "thumbnail" | "video" | "animation"
  | "splash" | "banner" | "product" | "placeholder"
  | "realistic_photo" | "presentation_slide";

type AssetStatus = "placeholder" | "generating" | "ready" | "error" | "storyboard";

type GeneratedAsset = {
  id: string;
  mode: Mode;
  kind: AssetKind;
  prompt: string;
  projectId?: string;
  createdAt: number;
  favorite?: boolean;
  status: AssetStatus;
  imageUrl?: string;
  storyboard?: VideoStoryboard;
  errorMsg?: string;
  manualUploadUrl?: string;
};

const STORAGE_KEY = "builder-studio:generated-assets";

function loadAssets(): GeneratedAsset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GeneratedAsset[]) : [];
  } catch { return []; }
}

function saveAssets(assets: GeneratedAsset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

const KINDS: { id: AssetKind; label: string; isVideo?: boolean }[] = [
  { id: "icon",        label: "App icon" },
  { id: "logo",        label: "Logo" },
  { id: "splash",      label: "Splash screen" },
  { id: "banner",      label: "Banner / header" },
  { id: "background",  label: "Background" },
  { id: "character",   label: "Character / avatar" },
  { id: "screenshot",  label: "Screenshot / mockup" },
  { id: "thumbnail",   label: "Thumbnail" },
  { id: "product",     label: "Product image" },
  { id: "placeholder", label: "Placeholder image" },
  { id: "realistic_photo",   label: "Ultra-realistic Photo" },
  { id: "presentation_slide", label: "Presentation Slide Mockup" },
  { id: "animation",   label: "Loading animation", isVideo: true },
  { id: "video",       label: "Short video / intro", isVideo: true },
];

const SIZE_PRESETS: Record<string, { w: number; h: number; label: string }> = {
  icon:        { w: 512,  h: 512,  label: "512×512" },
  logo:        { w: 512,  h: 256,  label: "512×256" },
  splash:      { w: 640,  h: 1136, label: "640×1136" },
  banner:      { w: 1200, h: 400,  label: "1200×400" },
  background:  { w: 1024, h: 576,  label: "1024×576" },
  character:   { w: 512,  h: 512,  label: "512×512" },
  screenshot:  { w: 640,  h: 1136, label: "640×1136" },
  thumbnail:   { w: 640,  h: 360,  label: "640×360" },
  product:     { w: 512,  h: 512,  label: "512×512" },
  placeholder: { w: 512,  h: 512,  label: "512×512" },
  realistic_photo:    { w: 1024, h: 768,  label: "1024×768" },
  presentation_slide: { w: 1024, h: 576,  label: "1024×576" },
  animation:   { w: 640,  h: 360,  label: "16:9 storyboard" },
  video:       { w: 640,  h: 360,  label: "16:9 storyboard" },
};

function StatusBadge({ status }: { status: AssetStatus }) {
  if (status === "ready")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">Ready</span>;
  if (status === "generating")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" />Generating…</span>;
  if (status === "storyboard")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">Storyboard</span>;
  if (status === "error")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">Error</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Saved</span>;
}

export default function AssetGeneratorPage() {
  const { projects } = useStudio();
  const [mode, setMode]          = useState<Mode>("project");
  const [kind, setKind]          = useState<AssetKind>("icon");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [prompt, setPrompt]       = useState("");
  const [assets, setAssets]       = useState<GeneratedAsset[]>(loadAssets);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const [activeEditorAsset, setActiveEditorAsset] = useState<GeneratedAsset | null>(null);

  const handleSaveEditedAsset = (dataUrl: string, summary: string) => {
    if (!activeEditorAsset) return;
    const id = `asset-${Date.now()}`;
    const newAsset: GeneratedAsset = {
      id,
      mode: activeEditorAsset.mode,
      kind: activeEditorAsset.kind,
      prompt: `${activeEditorAsset.prompt} (${summary})`,
      projectId: activeEditorAsset.projectId,
      createdAt: Date.now(),
      status: "ready",
      imageUrl: dataUrl,
    };
    setAssets(prev => {
      const next = [newAsset, ...prev];
      saveAssets(next);
      return next;
    });
    setActiveEditorAsset(null);
  };

  const filteredAssets = useMemo(
    () => assets.filter(a => a.mode === mode),
    [assets, mode]
  );

  const updateAsset = useCallback((id: string, patch: Partial<GeneratedAsset>) => {
    setAssets(prev => {
      const next = prev.map(a => a.id === id ? { ...a, ...patch } : a);
      saveAssets(next);
      return next;
    });
  }, []);

  const isVideoKind = KINDS.find(k => k.id === kind)?.isVideo ?? false;

  const generate = useCallback(async () => {
    if (!prompt.trim()) return;
    const id = `asset-${Date.now()}`;
    const newAsset: GeneratedAsset = {
      id,
      mode,
      kind,
      prompt: prompt.trim(),
      projectId: mode === "project" ? projectId || undefined : undefined,
      createdAt: Date.now(),
      status: "generating",
    };
    setAssets(prev => { const next = [newAsset, ...prev]; saveAssets(next); return next; });
    setPrompt("");

    if (isVideoKind) {
      // Video: build storyboard + placeholder still
      try {
        const storyboard = await generateVideoStoryboard(
          newAsset.prompt,
          "cinematic",
          6,
          "16:9"
        );
        updateAsset(id, {
          status: "storyboard",
          storyboard,
          imageUrl: storyboard.placeholderImageUrl,
        });
      } catch (err) {
        updateAsset(id, { status: "error", errorMsg: (err as Error).message });
      }
    } else {
      // Image: generate via Pollinations (free, no key needed)
      const preset = SIZE_PRESETS[kind] ?? { w: 512, h: 512 };
      try {
        let enhancedPrompt = newAsset.prompt;
        if (kind === "realistic_photo") {
          enhancedPrompt = `${enhancedPrompt}, ultra realistic, real continuous skin texture, high fidelity photograph, depth of field, award-winning photography, 8k professional raw portrait, Canon EOS R5 shot, realistic shadows and highlights, cinematic lighting`;
        } else if (kind === "presentation_slide") {
          enhancedPrompt = `${enhancedPrompt}, highly detailed presentation infographic slide mockup, clean vector design layout, professional powerpoint template graphic, modern corporate visual hierarchy, labeled charts or UI cards, sleek slide deck template`;
        }
        const imageUrl = await generateImage(enhancedPrompt, {
          width:  preset.w,
          height: preset.h,
        });
        
        // ACTUAL CREATION: Convert and save as Base64 so it's a physical, permanent binary asset
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            updateAsset(id, { status: "ready", imageUrl: base64 });
          };
          reader.readAsDataURL(blob);
        } catch {
          // fallback if CORS block or offline
          updateAsset(id, { status: "ready", imageUrl });
        }
      } catch (err) {
        updateAsset(id, { status: "error", errorMsg: (err as Error).message });
      }
    }
  }, [prompt, mode, kind, projectId, isVideoKind, updateAsset]);

  const remove = (id: string) => {
    setAssets(prev => { const next = prev.filter(a => a.id !== id); saveAssets(next); return next; });
  };

  const toggleFavorite = (id: string) => {
    setAssets(prev => {
      const next = prev.map(a => a.id === id ? { ...a, favorite: !a.favorite } : a);
      saveAssets(next);
      return next;
    });
  };

  const handleManualUpload = (assetId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      updateAsset(assetId, { status: "ready", imageUrl: dataUrl, manualUploadUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const downloadAsset = (asset: GeneratedAsset) => {
    if (!asset.imageUrl) return;
    const a = document.createElement("a");
    a.href = asset.imageUrl;
    a.download = `${asset.kind}-${asset.id}.jpg`;
    a.target = "_blank";
    a.click();
  };

  const retryAsset = async (asset: GeneratedAsset) => {
    updateAsset(asset.id, { status: "generating", errorMsg: undefined });
    if (isVideoKind || asset.kind === "video" || asset.kind === "animation") {
      try {
        const storyboard = await generateVideoStoryboard(asset.prompt, "cinematic", 6, "16:9");
        updateAsset(asset.id, { status: "storyboard", storyboard, imageUrl: storyboard.placeholderImageUrl });
      } catch (err) {
        updateAsset(asset.id, { status: "error", errorMsg: (err as Error).message });
      }
    } else {
      const preset = SIZE_PRESETS[asset.kind] ?? { w: 512, h: 512 };
      try {
        let enhancedPrompt = asset.prompt;
        if (asset.kind === "realistic_photo") {
          enhancedPrompt = `${enhancedPrompt}, ultra realistic, real continuous skin texture, high fidelity photograph, depth of field, award-winning photography, 8k professional raw portrait, Canon EOS R5 shot, realistic shadows and highlights, cinematic lighting`;
        } else if (asset.kind === "presentation_slide") {
          enhancedPrompt = `${enhancedPrompt}, highly detailed presentation infographic slide mockup, clean vector design layout, professional powerpoint template graphic, modern corporate visual hierarchy, labeled charts or UI cards, sleek slide deck template`;
        }
        const imageUrl = await generateImage(enhancedPrompt, { width: preset.w, height: preset.h });
        
        // ACTUAL CREATION: Convert and save as Base64 so it's a physical, permanent binary asset
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            updateAsset(asset.id, { status: "ready", imageUrl: base64 });
          };
          reader.readAsDataURL(blob);
        } catch {
          updateAsset(asset.id, { status: "ready", imageUrl });
        }
      } catch (err) {
        updateAsset(asset.id, { status: "error", errorMsg: (err as Error).message });
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-semibold">Asset Generator</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Free image generation via Pollinations · Video storyboards · Project &amp; personal media
        </p>
      </div>

      <div className="p-5 space-y-4 max-w-2xl mx-auto w-full">
        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("project")}
            className={`rounded-xl border p-4 text-left transition-colors ${mode === "project" ? "border-primary bg-primary/10" : "border-border bg-card"}`}
          >
            <PackagePlus className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-semibold">Project Assets</p>
            <p className="text-xs text-muted-foreground mt-1">Icons, images, and media for app builds.</p>
          </button>
          <button
            onClick={() => setMode("personal")}
            className={`rounded-xl border p-4 text-left transition-colors ${mode === "personal" ? "border-primary bg-primary/10" : "border-border bg-card"}`}
          >
            <ImageIcon className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-semibold">Personal Media</p>
            <p className="text-xs text-muted-foreground mt-1">Owner-only personal picture &amp; video generation.</p>
          </button>
        </div>

        {/* Generator form */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Asset type</span>
              <select
                value={kind}
                onChange={e => setKind(e.target.value as AssetKind)}
                className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm"
              >
                {KINDS.map(k => (
                  <option key={k.id} value={k.id}>
                    {k.label}{k.isVideo ? " 🎬" : ""}
                  </option>
                ))}
              </select>
            </label>

            {mode === "project" && (
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Attach to project</span>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm"
                >
                  <option value="">No project selected</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            )}
          </div>

          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">
              Prompt
              {isVideoKind && <span className="ml-2 text-blue-400">(storyboard + still frame)</span>}
              {!isVideoKind && <span className="ml-2 text-emerald-400">({SIZE_PRESETS[kind]?.label ?? "512×512"} · free)</span>}
            </span>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={3}
              placeholder={
                mode === "project"
                  ? isVideoKind
                    ? "Short intro video for a dark AI builder app, dramatic reveal…"
                    : "Clean Android launcher icon for a dark AI builder app, neon blue glow…"
                  : "Cinematic personal portrait with dramatic lighting…"
              }
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm resize-none"
            />
          </label>

          <button
            onClick={() => { void generate(); }}
            disabled={!prompt.trim()}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
          >
            {isVideoKind ? <Video className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {isVideoKind ? "Generate storyboard" : "Generate image (free)"}
          </button>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Images: Pollinations AI — free, no key needed. Videos: storyboard + still frame placeholder until a real video provider is configured. Approve &amp; attach generated assets to builds from the gallery below.
          </p>
        </div>

        {/* Gallery */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {mode === "project" ? "Project asset gallery" : "Personal media gallery"}
            </h2>
            <span className="text-xs text-muted-foreground">{filteredAssets.length} saved</span>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No assets yet. Describe what you need above and hit Generate.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
              {filteredAssets.map(asset => (
                <div key={asset.id} className="rounded-xl border border-border bg-background/40 p-3 space-y-3">
                  {/* Preview */}
                  <div className="aspect-video rounded-lg bg-muted/40 border border-border flex items-center justify-center overflow-hidden relative">
                    {asset.status === "generating" ? (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs">Generating…</span>
                      </div>
                    ) : asset.imageUrl ? (
                      <>
                        <img src={asset.imageUrl} alt={asset.prompt} className="w-full h-full object-cover rounded-lg" />
                        {asset.status === "storyboard" && (
                          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Film className="w-2.5 h-2.5" /> Storyboard
                          </div>
                        )}
                        {asset.status === "ready" && (
                          <div className="absolute bottom-1 right-1 bg-emerald-500/80 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                          </div>
                        )}
                      </>
                    ) : asset.status === "error" ? (
                      <div className="flex flex-col items-center gap-2 p-3 text-center">
                        <p className="text-destructive text-xs font-medium">Generation failed</p>
                        <p className="text-[10px] text-muted-foreground">{asset.errorMsg}</p>
                        <label className="text-[10px] text-primary underline cursor-pointer">
                          Upload manually
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleManualUpload(asset.id, e.target.files[0])} />
                        </label>
                      </div>
                    ) : (
                      asset.kind === "video" || asset.kind === "animation"
                        ? <Film className="w-8 h-8 text-muted-foreground" />
                        : <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Meta */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold capitalize">{asset.kind.replace("_", " ")}</p>
                      <StatusBadge status={asset.status} />
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{asset.prompt}</p>
                    {asset.storyboard && (
                      <p className="text-[10px] text-blue-400 mt-1">
                        {asset.storyboard.frames.length} frames · {asset.storyboard.durationSec}s · {asset.storyboard.aspectRatio}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => toggleFavorite(asset.id)}
                      className={`h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 transition-colors ${asset.favorite ? "text-pink-400 border-pink-400/30" : "text-muted-foreground"}`}
                    >
                      <Heart className="w-3 h-3" />
                    </button>
                    {(asset.status === "ready" || asset.status === "storyboard") && asset.imageUrl && (
                      <button
                        onClick={() => downloadAsset(asset)}
                        className="h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Download className="w-3 h-3" /> Export
                      </button>
                    )}
                    {(asset.status === "ready" || asset.status === "storyboard") && asset.imageUrl && (
                      <button
                        onClick={() => setActiveEditorAsset(asset)}
                        className="h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 text-primary hover:text-primary-foreground hover:bg-primary transition-colors"
                        title="Doodle, add branding, watermarks or retro filters in the workshop"
                      >
                        <Paintbrush className="w-3 h-3" /> Paint / Customize
                      </button>
                    )}
                    {asset.status === "error" && (
                      <button
                        onClick={() => { void retryAsset(asset); }}
                        className="h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Retry
                      </button>
                    )}
                    {(asset.status === "storyboard") && (
                      <label className="h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 text-blue-400 cursor-pointer hover:text-blue-300 transition-colors">
                        <Upload className="w-3 h-3" /> Upload MP4
                        <input type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && handleManualUpload(asset.id, e.target.files[0])} />
                      </label>
                    )}
                    <button
                      onClick={() => remove(asset.id)}
                      className="h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 text-destructive ml-auto hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeEditorAsset && (
        <InteractiveWorkshopModal
          asset={activeEditorAsset}
          onClose={() => setActiveEditorAsset(null)}
          onSave={handleSaveEditedAsset}
        />
      )}
    </div>
  );
}

interface InteractiveWorkshopModalProps {
  asset: GeneratedAsset;
  onClose: () => void;
  onSave: (dataUrl: string, editSummary: string) => void;
}

function InteractiveWorkshopModal({ asset, onClose, onSave }: InteractiveWorkshopModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<"brush" | "eraser">("brush");
  const [brushColor, setBrushColor] = useState("#3b82f6");
  const [brushSize, setBrushSize] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);

  // Text tools
  const [textOverlay, setTextOverlay] = useState("");
  const [textSize, setTextSize] = useState(32);
  const [textPosition, setTextPosition] = useState<"top" | "center" | "bottom">("center");
  const [textAlignment, setTextAlignment] = useState<"left" | "center" | "right">("center");

  // Custom filters
  const [filter, setFilter] = useState("none");
  const [editSummary, setEditSummary] = useState("Customized Studio Version");

  // Load and draw image
  useEffect(() => {
    if (!asset.imageUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = asset.imageUrl;
    img.onload = () => {
      canvas.width = img.width || 512;
      canvas.height = img.height || 512;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
  }, [asset.imageUrl]);

  const applyCanvasFilter = (filterVal: string) => {
    setFilter(filterVal);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (filterVal === "sepia") ctx.filter = "sepia(0.8)";
    else if (filterVal === "grayscale") ctx.filter = "grayscale(1)";
    else if (filterVal === "invert") ctx.filter = "invert(1)";
    else if (filterVal === "hologram") ctx.filter = "hue-rotate(180deg) saturate(3.5) brightness(1.2) contrast(1.1)";
    else if (filterVal === "vintage") ctx.filter = "contrast(1.2) saturate(0.8) sepia(0.2)";
    else ctx.filter = "none";

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = asset.imageUrl || "";
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.filter = "none"; // Reset filter so subsequent edits are drawn on top cleanly
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (activeTool === "brush") {
      ctx.strokeStyle = brushColor;
      ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.globalCompositeOperation = "destination-out";
    }

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const applyText = () => {
    if (!textOverlay.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = brushColor;
    ctx.font = `bold ${textSize}px sans-serif`;
    ctx.textAlign = textAlignment;

    let x = canvas.width / 2;
    let y = canvas.height / 2;

    if (textAlignment === "left") x = 40;
    else if (textAlignment === "right") x = canvas.width - 40;

    if (textPosition === "top") y = 40 + textSize;
    else if (textPosition === "bottom") y = canvas.height - 40;

    ctx.fillText(textOverlay, x, y);
    setTextOverlay("");
  };

  const applyRotation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;
    tempCtx.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(tempCanvas, -canvas.width / 2, -canvas.height / 2);
    ctx.restore();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onSave(dataUrl, editSummary);
  };

  const colors = [
    "#ef4444", "#10b981", "#3b82f6", "#8b5cf6",
    "#f59e0b", "#ffffff", "#000000", "#ec4899", "#14b8a6"
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Paintbrush className="w-4 h-4 text-primary animate-pulse" /> Asset Modification Workshop
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Draw, watermark, brand, filter, and rotate — actually create assets permanently
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Canvas display (Left 2 cols) */}
          <div className="md:col-span-2 bg-black/40 flex items-center justify-center p-6 overflow-auto">
            <div className="relative border border-border/80 bg-muted/10 rounded-xl overflow-hidden shadow-lg p-2">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={() => setIsDrawing(false)}
                className="max-w-full max-h-[55vh] rounded-lg cursor-crosshair block"
              />
            </div>
          </div>

          {/* Core controls panel (Right 1 col) */}
          <div className="p-5 flex flex-col gap-4 overflow-y-auto">
            {/* Tool selectors */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Tool</span>
              <div className="grid grid-cols-2 gap-1 px-1">
                <button
                  onClick={() => setActiveTool("brush")}
                  className={`py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${activeTool === "brush" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted text-muted-foreground"}`}
                >
                  <Paintbrush className="w-3.5 h-3.5" /> Draw Brush
                </button>
                <button
                  onClick={() => setActiveTool("eraser")}
                  className={`py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${activeTool === "eraser" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted text-muted-foreground"}`}
                >
                  <Sliders className="w-3.5 h-3.5" /> Eraser
                </button>
              </div>
            </div>

            {/* Brush properties */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Brush / Tool styling</span>
              <div className="space-y-3 p-3 border border-border/60 rounded-xl bg-background/30">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                    <span>Brush Size:</span>
                    <span>{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={brushSize}
                    onChange={e => setBrushSize(Number(e.target.value))}
                    className="w-full accent-primary bg-muted rounded-lg appearance-none h-1.5"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] text-muted-foreground">Brush/Text color:</span>
                  <div className="flex flex-wrap gap-1">
                    {colors.map(c => (
                      <button
                        key={c}
                        onClick={() => setBrushColor(c)}
                        className={`w-5 h-5 rounded-full border transition-all ${brushColor === c ? "scale-105 border-primary shadow" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={brushColor}
                      onChange={e => setBrushColor(e.target.value)}
                      className="w-5 h-5 rounded-full border-0 p-0 overflow-hidden cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Futuristic Jarvis Filters */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tactical Filters</span>
              <div className="grid grid-cols-3 gap-1">
                {["none", "grayscale", "sepia", "invert", "vintage", "hologram"].map(f => (
                  <button
                    key={f}
                    onClick={() => applyCanvasFilter(f)}
                    className={`py-1 rounded text-[10px] font-medium border capitalize transition-colors ${filter === f ? "bg-primary/20 text-primary border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Overlay Tool */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Text Overlays (Copyrights / Brand stamps)</span>
              <div className="p-3 border border-border/60 rounded-xl bg-background/30 space-y-2">
                <input
                  type="text"
                  value={textOverlay}
                  onChange={e => setTextOverlay(e.target.value)}
                  placeholder="Watermark text here..."
                  className="w-full bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 outline-none placeholder:text-muted-foreground"
                />
                <div className="flex gap-1">
                  <select
                    value={textPosition}
                    onChange={e => setTextPosition(e.target.value as "top" | "center" | "bottom")}
                    className="flex-1 bg-background border border-border rounded text-[10px] px-1 py-1"
                  >
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                    <option value="bottom">Bottom</option>
                  </select>
                  <select
                    value={textAlignment}
                    onChange={e => setTextAlignment(e.target.value as "left" | "center" | "right")}
                    className="flex-1 bg-background border border-border rounded text-[10px] px-1 py-1"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                  <span>Size: {textSize}px</span>
                  <input
                    type="range"
                    min="12"
                    max="72"
                    value={textSize}
                    onChange={e => setTextSize(Number(e.target.value))}
                    className="w-1/2 accent-primary h-1 bg-muted rounded appearance-none"
                  />
                </div>
                <button
                  onClick={applyText}
                  disabled={!textOverlay.trim()}
                  className="w-full py-1 bg-muted hover:bg-muted/80 text-[10px] font-semibold text-foreground/80 rounded border border-border flex items-center justify-center gap-1"
                >
                  <Type className="w-3 h-3" /> Insert Text Stamp
                </button>
              </div>
            </div>

            {/* Orientation rotation */}
            <div className="space-y-1">
              <button
                onClick={applyRotation}
                className="w-full py-1.5 border border-border hover:bg-muted text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin-slow" /> Rotate 90° Clockwise
              </button>
            </div>

            {/* Save Section */}
            <div className="mt-auto space-y-2 border-t border-border pt-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Commit Changes</span>
              <input
                type="text"
                value={editSummary}
                onChange={e => setEditSummary(e.target.value)}
                placeholder="Asset modification description..."
                className="w-full bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 outline-none placeholder:text-muted-foreground"
              />
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 border border-border hover:bg-muted text-xs font-semibold rounded-lg text-muted-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 bg-primary hover:bg-primary/95 text-xs font-semibold text-primary-foreground rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" /> Save Modified
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
