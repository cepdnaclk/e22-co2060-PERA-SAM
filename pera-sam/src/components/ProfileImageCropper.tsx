import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Camera,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Upload,
  Loader2,
  ImageIcon,
  Info,
} from 'lucide-react';

interface ProfileImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (croppedBlob: Blob) => Promise<void>;
  currentImageUrl?: string | null;
}

/** Standard output size: 400×400 px — common for modern profile pictures */
const OUTPUT_SIZE = 400;

export const ProfileImageCropper = ({
  open,
  onOpenChange,
  onCropComplete,
  currentImageUrl,
}: ProfileImageCropperProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setIsSaving(false);
    }
  }, [open]);

  // Load selected file into an Image object
  useEffect(() => {
    if (!selectedFile) {
      imageRef.current = null;
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      // Auto-fit zoom so the shortest side fills the crop circle
      const canvasSize = 280; // preview canvas CSS size
      const scale = canvasSize / Math.min(img.width, img.height);
      setZoom(scale);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  // Redraw preview canvas
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    // Draw dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    // Clip to circle
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    // Apply transformations
    ctx.translate(size / 2 + offset.x, size / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Draw the image centered
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    ctx.restore();

    // Draw circle border overlay
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw corner guides (semi-transparent overlay outside circle)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();
    ctx.restore();
  }, [zoom, rotation, offset]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // Mouse handlers for drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageRef.current) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageRef.current || e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        return;
      }
      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        return;
      }
      setSelectedFile(file);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    }
  };

  const handleCrop = async () => {
    const img = imageRef.current;
    if (!img) return;

    setIsSaving(true);

    try {
      // Create output canvas at the standard size
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = OUTPUT_SIZE;
      outputCanvas.height = OUTPUT_SIZE;
      const ctx = outputCanvas.getContext('2d');
      if (!ctx) return;

      // Scale factor: output size / preview canvas CSS size
      const previewSize = 280;
      const scaleFactor = OUTPUT_SIZE / previewSize;

      // Clip to circle
      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();

      // Apply the same transformations scaled up
      ctx.translate(
        OUTPUT_SIZE / 2 + offset.x * scaleFactor,
        OUTPUT_SIZE / 2 + offset.y * scaleFactor
      );
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom * scaleFactor, zoom * scaleFactor);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        outputCanvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create image blob'));
          },
          'image/webp',
          0.9
        );
      });

      await onCropComplete(blob);
      onOpenChange(false);
    } catch (error) {
      console.error('Crop error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-accent" />
            Profile Picture
          </DialogTitle>
          <DialogDescription>
            Upload and crop your profile photo. Recommended: square image, minimum 400×400px.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File selector or preview */}
          {!selectedFile ? (
            <div className="flex flex-col items-center gap-4">
              {/* Current avatar preview */}
              {currentImageUrl && (
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-accent/30">
                  <img
                    src={currentImageUrl}
                    alt="Current profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Upload area */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl p-8 hover:border-accent/50 hover:bg-accent/5 transition-all duration-200 flex flex-col items-center gap-3 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Upload className="h-6 w-6 text-accent" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Click to upload a photo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG or WebP • Max 5 MB
                  </p>
                </div>
              </button>

              <div className="flex items-start gap-2 p-3 bg-accent/5 rounded-lg border border-accent/10 w-full">
                <Info className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Tip:</strong> Use a square photo at least 400×400 pixels
                  for the best quality across all views.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {/* Preview canvas */}
              <div
                className="relative cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={280}
                  className="rounded-full"
                  style={{ width: 280, height: 280 }}
                />
              </div>

              {/* Zoom control */}
              <div className="w-full space-y-2">
                <div className="flex items-center gap-3">
                  <ZoomOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Slider
                    value={[zoom * 100]}
                    onValueChange={([v]) => setZoom(v / 100)}
                    min={10}
                    max={300}
                    step={1}
                    className="flex-1"
                  />
                  <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </div>

              {/* Rotate controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((r) => r - 90)}
                  className="gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((r) => r + 90)}
                  className="gap-1"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1 ml-2"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span className="text-xs">Change</span>
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Drag to reposition • Use slider to zoom • Output: {OUTPUT_SIZE}×{OUTPUT_SIZE}px
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          {selectedFile && (
            <Button
              variant="accent"
              onClick={handleCrop}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Save Photo
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
