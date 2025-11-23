import React, { useState, useRef } from 'react';
import {
  Upload,
  Sparkles,
  Zap,
  Grid3x3,
  Loader,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  Share2,
} from 'lucide-react';

interface GeneratedFrame {
  id: string;
  src: string;
  timestamp: number;
  prompt: string;
}

interface AnimeGeneratorProps {
  onGenerate?: (prompt: string, images: File[]) => Promise<void>;
}

const AnimeGenerator: React.FC<AnimeGeneratorProps> = ({ onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFrames, setGeneratedFrames] = useState<GeneratedFrame[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<GeneratedFrame | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      ['image/png', 'image/jpeg'].includes(file.type)
    );

    if (files.length > 0) {
      setUploadedImages((prev) => [...prev, ...files].slice(0, 5));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedImages((prev) => [...prev, ...files].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      if (onGenerate) {
        await onGenerate(prompt, uploadedImages);
      } else {
        // Simulate generation for demo
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const newFrames: GeneratedFrame[] = Array.from({ length: 4 }).map(
          (_, i) => ({
            id: `frame-${Date.now()}-${i}`,
            src: `https://images.unsplash.com/photo-${1600000000000 + i}?w=400&h=400&fit=crop`,
            timestamp: Date.now() + i * 100,
            prompt: prompt,
          })
        );
        setGeneratedFrames((prev) => [...newFrames, ...prev]);
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const removeFrame = (id: string) => {
    setGeneratedFrames((prev) => prev.filter((frame) => frame.id !== id));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0F1419] via-[#1a1f2e] to-[#0a0d11] overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/%3E%3C/filter%3E%3Crect width="400" height="400" fill="white" filter="url(%23noiseFilter)"/%3E%3C/svg%3E")',
          backgroundSize: '200px 200px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-transparent">
              Create Anime From Prompt or Images
            </h1>
            <Zap className="w-8 h-8 text-pink-400" />
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Transform your imagination into stunning anime scenes with AI-powered generation
          </p>
        </div>

        {/* Main Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Left: Prompt Input */}
          <div className="group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-8 hover:bg-white/[0.08] transition-all duration-300 hover:border-purple-500/30 shadow-2xl">
                <label htmlFor="prompt" className="block text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles size={18} className="text-purple-400" />
                  Your Anime Prompt
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your anime scene in detail... e.g., 'A serene Japanese garden at sunset with cherry blossoms falling, soft pink sky, anime style'"
                  className="w-full h-32 bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all duration-300 focus:border-purple-500/60 focus:shadow-[0_0_20px_rgba(168,85,247,0.4)] focus:bg-white/6 resize-none"
                  aria-label="Anime prompt input"
                />
                <p className="text-xs text-gray-500 mt-3">
                  💡 Tip: Be specific about style, mood, characters, and environment for best results
                </p>
              </div>
            </div>
          </div>

          {/* Right: Image Upload */}
          <div className="group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div
                ref={dragRef}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative bg-white/5 backdrop-blur-[12px] border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer ${
                  dragActive
                    ? 'border-purple-500/60 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.5)]'
                    : 'border-white/10 hover:border-pink-500/30 hover:bg-white/[0.08]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Upload reference images"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center border border-pink-500/30">
                    <Upload size={32} className="text-pink-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {uploadedImages.length > 0 ? 'Add More Images' : 'Drop Images Here'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      or click to browse (PNG/JPG, max 5 images)
                    </p>
                  </div>
                </button>

                {/* Uploaded Images Preview */}
                {uploadedImages.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="text-xs text-gray-400 mb-3">
                      {uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''} selected
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {uploadedImages.map((file, index) => (
                        <div
                          key={index}
                          className="relative group/img rounded-lg overflow-hidden border border-white/10 bg-white/5"
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-20 object-cover"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"
                            aria-label="Remove image"
                          >
                            <X size={18} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center mb-16">
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className={`relative px-12 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
              isGenerating || !prompt.trim()
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] active:scale-[0.98]'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 rounded-xl opacity-100 blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 rounded-xl" />
            <div className="relative flex items-center justify-center gap-3 text-white">
              {isGenerating ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  <span>Generating Anime...</span>
                </>
              ) : (
                <>
                  <Zap size={20} />
                  <span>Generate Anime</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Processing State */}
        {isGenerating && (
          <div className="mb-12 bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-white font-semibold">Processing your request...</span>
              </div>
              <span className="text-sm text-gray-400">This may take a moment</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 rounded-full animate-pulse" />
            </div>
          </div>
        )}

        {/* Results Gallery */}
        {generatedFrames.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <Grid3x3 size={24} className="text-purple-400" />
              <h2 className="text-3xl font-bold text-white">Generated Anime Frames</h2>
              <span className="text-sm text-gray-400 ml-auto">
                {generatedFrames.length} frame{generatedFrames.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {generatedFrames.map((frame) => (
                <div
                  key={frame.id}
                  className="group relative rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:border-purple-500/50 transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedFrame(frame)}
                >
                  {/* Image Container */}
                  <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-purple-900/20 to-blue-900/20">
                    <img
                      src={frame.src}
                      alt="Generated anime frame"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 flex items-end justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex gap-2">
                      <button
                        className="p-2 rounded-lg bg-purple-500/80 hover:bg-purple-600 text-white transition-colors"
                        aria-label="Download frame"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        className="p-2 rounded-lg bg-blue-500/80 hover:bg-blue-600 text-white transition-colors"
                        aria-label="Share frame"
                      >
                        <Share2 size={16} />
                      </button>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFrame(frame.id);
                      }}
                      className="p-2 rounded-lg bg-red-500/80 hover:bg-red-600 text-white transition-colors"
                      aria-label="Delete frame"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Frame Info */}
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
                    <CheckCircle size={14} className="text-green-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isGenerating && generatedFrames.length === 0 && prompt && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-4">
              <AlertCircle size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-400">
              Click "Generate Anime" to create your first anime frames
            </p>
          </div>
        )}
      </div>

      {/* Modal for selected frame */}
      {selectedFrame && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedFrame(null)}
        >
          <div
            className="relative max-w-2xl w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#0F1419] to-[#1a1f2e] border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedFrame(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>

            <img
              src={selectedFrame.src}
              alt="Generated anime frame"
              className="w-full h-auto"
            />

            <div className="p-6 border-t border-white/10">
              <p className="text-sm text-gray-400 mb-4">
                <span className="font-semibold text-white">Prompt:</span> {selectedFrame.prompt}
              </p>
              <div className="flex gap-3">
                <button className="flex-1 px-4 py-2 rounded-lg bg-purple-500/80 hover:bg-purple-600 text-white font-semibold transition-colors flex items-center justify-center gap-2">
                  <Download size={18} />
                  Download
                </button>
                <button className="flex-1 px-4 py-2 rounded-lg bg-blue-500/80 hover:bg-blue-600 text-white font-semibold transition-colors flex items-center justify-center gap-2">
                  <Share2 size={18} />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimeGenerator;
