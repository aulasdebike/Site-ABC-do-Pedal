'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Calendar, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  RotateCw, 
  ChevronRight,
  ChevronLeft,
  Share2,
  Check,
  Bike
} from 'lucide-react';
import { 
  GalleryItem, 
  getStoredGalleryItems, 
  subscribeToGalleryFirestore,
  getGalleryFromFirestore
} from '@/lib/gallery-store';

interface GaleriaVivaViewProps {
  onGoToBooking?: () => void;
}

export function GaleriaVivaView({ onGoToBooking }: GaleriaVivaViewProps) {
  // Master list of all gallery items from local storage and firestore
  const [items, setItems] = useState<GalleryItem[]>(() => {
    return getStoredGalleryItems();
  });

  // Filter out hidden items for public view
  const visibleItems = useMemo(() => {
    return items.filter((item) => !item.hidden);
  }, [items]);

  // Number of items displayed in initial mosaic batch (progressive loading)
  const [displayCount, setDisplayCount] = useState<number>(12);

  // Array of items currently assigned to the visible grid positions
  const [displayedItems, setDisplayedItems] = useState<GalleryItem[]>(() => {
    const initial = getStoredGalleryItems().filter((item) => !item.hidden);
    return initial.slice(0, 12);
  });

  // Track hover state for items
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Modal Lightbox state (permanecer dentro do próprio site, sem download e sem redirecionamento)
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Audio unmute feedback state
  const [isAudioActiveOnHover, setIsAudioActiveOnHover] = useState<boolean>(false);

  // Synchronize on mount and listen to updates (local storage, broadcast, and firestore)
  useEffect(() => {
    let isMounted = true;

    // Try fetching from Firestore asynchronously
    getGalleryFromFirestore().then((fsItems) => {
      if (!isMounted || !fsItems || fsItems.length === 0) return;
      setItems((prev) => {
        const map = new Map<string, GalleryItem>();
        prev.forEach((i) => map.set(i.id, i));
        fsItems.forEach((i) => map.set(i.id, i));
        const merged = Array.from(map.values()).sort((a, b) => a.order - b.order);
        return merged;
      });
      setDisplayedItems((prev) => {
        if (prev.length === 0) {
          const nonHidden = fsItems.filter((i) => !i.hidden);
          return nonHidden.slice(0, 12);
        }
        return prev;
      });
    }).catch(() => {});

    // Listen to firestore snapshot
    const unsubscribeFs = subscribeToGalleryFirestore((fsItems) => {
      if (!isMounted || !fsItems || fsItems.length === 0) return;
      setItems((prev) => {
        const map = new Map<string, GalleryItem>();
        prev.forEach((i) => map.set(i.id, i));
        fsItems.forEach((i) => map.set(i.id, i));
        return Array.from(map.values()).sort((a, b) => a.order - b.order);
      });
    });

    // Local custom event listener
    const handleLocalUpdate = (e: any) => {
      if (!isMounted) return;
      const latest = e.detail || getStoredGalleryItems();
      setItems(latest);
      setDisplayedItems((prev) => {
        const nonHidden = latest.filter((i: GalleryItem) => !i.hidden);
        return nonHidden.slice(0, Math.max(12, prev.length));
      });
    };
    window.addEventListener('abc_gallery_updated', handleLocalUpdate);

    return () => {
      isMounted = false;
      unsubscribeFs();
      window.removeEventListener('abc_gallery_updated', handleLocalUpdate);
    };
  }, []);

  // Conteúdos trocando automaticamente de forma suave (Smooth dynamic swapping of mosaic tiles)
  useEffect(() => {
    if (visibleItems.length <= 6) return;

    const swapInterval = setInterval(() => {
      setDisplayedItems((currentDisplayed) => {
        if (currentDisplayed.length === 0) return currentDisplayed;

        // Find items in visible pool that are NOT currently displayed
        const currentlyDisplayedIds = new Set(currentDisplayed.map((i) => i.id));
        const availableCandidates = visibleItems.filter((i) => !currentlyDisplayedIds.has(i.id));

        if (availableCandidates.length === 0) {
          // If all are displayed, pick another from visibleItems to rotate
          return currentDisplayed;
        }

        // Pick a random slot to swap, but NEVER swap the slot currently being hovered or opened in modal
        const eligibleSlotIndices = currentDisplayed
          .map((item, idx) => ({ item, idx }))
          .filter(({ item }) => item.id !== hoveredItemId && item.id !== selectedItem?.id)
          .map(({ idx }) => idx);

        if (eligibleSlotIndices.length === 0) return currentDisplayed;

        const targetSlotIndex = eligibleSlotIndices[Math.floor(Math.random() * eligibleSlotIndices.length)];
        const replacementItem = availableCandidates[Math.floor(Math.random() * availableCandidates.length)];

        const updated = [...currentDisplayed];
        updated[targetSlotIndex] = replacementItem;
        return updated;
      });
    }, 6000); // Swaps one tile every 6 seconds

    return () => clearInterval(swapInterval);
  }, [visibleItems, hoveredItemId, selectedItem]);

  // Lightbox navigation
  const handleOpenItem = (item: GalleryItem, index: number) => {
    setSelectedItem(item);
    setSelectedIndex(index);
  };

  const handleCloseItem = () => {
    setSelectedItem(null);
    setSelectedIndex(-1);
  };

  const handleNextItem = useCallback(() => {
    if (displayedItems.length === 0) return;
    const nextIdx = (selectedIndex + 1) % displayedItems.length;
    setSelectedIndex(nextIdx);
    setSelectedItem(displayedItems[nextIdx]);
  }, [selectedIndex, displayedItems]);

  const handlePrevItem = useCallback(() => {
    if (displayedItems.length === 0) return;
    const prevIdx = (selectedIndex - 1 + displayedItems.length) % displayedItems.length;
    setSelectedIndex(prevIdx);
    setSelectedItem(displayedItems[prevIdx]);
  }, [selectedIndex, displayedItems]);

  // Keyboard navigation for modal
  useEffect(() => {
    if (!selectedItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseItem();
      if (e.key === 'ArrowRight') handleNextItem();
      if (e.key === 'ArrowLeft') handlePrevItem();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, handleNextItem, handlePrevItem]);

  // Handle progressive load more
  const handleLoadMore = () => {
    setDisplayCount((prev) => {
      const nextCount = Math.min(prev + 6, visibleItems.length);
      setDisplayedItems(visibleItems.slice(0, nextCount));
      return nextCount;
    });
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] w-full py-4 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-6 relative select-none">
      
      {/* Discreet Header & Notification Banner */}
      <div className="w-[94vw] lg:w-[85vw] max-w-[1700px] mx-auto mb-4 sm:mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
            <span className="text-xs sm:text-sm font-mono tracking-widest uppercase text-pink-400 font-extrabold">
              Experiência Visual Viva
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            Galeria <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500">Viva</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-light mt-0.5">
            Momentos reais de superação, leveza e aprendizado sobre duas rodas.
          </p>
        </div>

        {/* Exibir discretamente: “Toque na imagem para ampliar” */}
        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono text-slate-300 bg-slate-950/70 border border-slate-800/80 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0 animate-pulse" />
          <span>Toque na imagem para ampliar</span>
        </div>
      </div>

      {/* 
        ===================================================================
        MOSAICO DINÂMICO EM TELA CHEIA (FULL-SCREEN RESPONSIVE GRID)
        - Blocos com diferentes tamanhos e proporções
        - Mistura fotos e vídeos no mesmo mosaico
        - Não indica visualmente quais são vídeos
        - Ao passar o mouse: amplia suavemente e ativa o áudio
        - Ao retirar o mouse: volta ao normal e interrompe áudio
        ===================================================================
      */}
      <div className="w-[94vw] lg:w-[85vw] max-w-[1700px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-[220px] sm:auto-rows-[250px] lg:auto-rows-[270px]">
          {displayedItems.map((item, index) => {
            return (
              <MosaicTile
                key={item.id}
                item={item}
                index={index}
                isHovered={hoveredItemId === item.id}
                onMouseEnter={() => {
                  setHoveredItemId(item.id);
                  if (item.type === 'video') setIsAudioActiveOnHover(true);
                }}
                onMouseLeave={() => {
                  if (hoveredItemId === item.id) {
                    setHoveredItemId(null);
                    setIsAudioActiveOnHover(false);
                  }
                }}
                onClick={() => handleOpenItem(item, index)}
              />
            );
          })}
        </div>

        {/* Progressive Loading Button if more items exist */}
        {visibleItems.length > displayedItems.length && (
          <div className="mt-8 text-center pb-6">
            <button
              onClick={handleLoadMore}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs sm:text-sm font-mono font-bold text-pink-400 hover:text-white border border-pink-500/30 hover:border-pink-500/60 shadow-lg transition-all cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Carregar Mais Momentos ({visibleItems.length - displayedItems.length} restantes)</span>
            </button>
          </div>
        )}
      </div>

      {/* 
        ===================================================================
        MODAL LIGHTBOX EM TELA CHEIA DENTRO DO PRÓPRIO SITE
        - Permanece dentro do próprio site
        - Não redireciona para YouTube ou outro site
        - Não disponibiliza download
        - Reproduz vídeo com áudio ativo e controles confortáveis
        ===================================================================
      */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-3 sm:p-6"
            onClick={handleCloseItem}
          >
            {/* Top Modal Controls */}
            <div 
              className="w-full max-w-5xl flex items-center justify-between z-20 pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                <span className="text-xs sm:text-sm font-mono font-bold text-slate-300">
                  {selectedItem.title || 'ABC do Pedal • Galeria Viva'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseItem}
                  className="p-2 sm:p-2.5 rounded-full bg-slate-900/90 hover:bg-pink-600 text-white border border-slate-700 hover:border-pink-500 transition-all cursor-pointer shadow-lg"
                  aria-label="Fechar ampliação"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Central Media Content */}
            <div 
              className="relative w-full max-w-5xl flex-1 flex items-center justify-center my-3 sm:my-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Previous item button */}
              {displayedItems.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevItem}
                  className="absolute left-2 sm:left-4 z-30 p-2.5 sm:p-3 rounded-full bg-black/70 hover:bg-pink-600 text-white border border-slate-800 hover:border-pink-500 transition-all cursor-pointer backdrop-blur-sm"
                  aria-label="Item anterior"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}

              {/* Next item button */}
              {displayedItems.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextItem}
                  className="absolute right-2 sm:right-4 z-30 p-2.5 sm:p-3 rounded-full bg-black/70 hover:bg-pink-600 text-white border border-slate-800 hover:border-pink-500 transition-all cursor-pointer backdrop-blur-sm"
                  aria-label="Próximo item"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}

              {/* Media Display: Photo or Video */}
              {selectedItem.type === 'video' && selectedItem.youtubeId ? (
                <div className="w-full h-full max-h-[75vh] aspect-[16/9] max-w-4xl rounded-2xl overflow-hidden shadow-2xl bg-black relative border border-slate-800">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${selectedItem.youtubeId}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`}
                    title={selectedItem.title || 'Vídeo ABC do Pedal'}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : selectedItem.type === 'video' && !selectedItem.youtubeId ? (
                <div className="w-full h-full max-h-[75vh] aspect-[16/9] max-w-4xl rounded-2xl overflow-hidden shadow-2xl bg-black relative border border-slate-800">
                  <video
                    src={selectedItem.url}
                    controls
                    autoPlay
                    playsInline
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div 
                  className="relative w-full h-full max-h-[78vh] flex items-center justify-center"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.title || 'Foto da Galeria Viva'}
                    className="max-h-[78vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800 select-none pointer-events-none"
                  />
                </div>
              )}
            </div>

            {/* Bottom Caption and CTA */}
            <div 
              className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left z-20 pb-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">
                  {selectedItem.title || 'ABC do Pedal • Aprender a pedalar'}
                </p>
                {selectedItem.caption && (
                  <p className="text-[11px] sm:text-xs text-slate-300 font-light mt-0.5">
                    {selectedItem.caption}
                  </p>
                )}
              </div>

              {onGoToBooking && (
                <button
                  type="button"
                  onClick={() => {
                    handleCloseItem();
                    onGoToBooking();
                  }}
                  className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-[#ff007f] hover:from-pink-500 hover:to-pink-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-pink-600/30 transition-all cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Quero Agendar Minha Aula</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ==========================================================================
// SUBCOMPONENT: MOSAIC TILE
// - Renders photo or video seamlessly without visual distinction
// - Supports different aspect ratios (tall, wide, large, normal)
// - Smooth hover enlargement (scale)
// - Activates audio on hover (for videos) via iframe postMessage API
// - Turns off audio on mouse leave
// ==========================================================================

interface MosaicTileProps {
  item: GalleryItem;
  index: number;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

function MosaicTile({
  item,
  index,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick
}: MosaicTileProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Dynamic grid span classes based on item aspectRatio or organic distribution
  const gridSpanClass = useMemo(() => {
    // If specified explicitly
    if (item.aspectRatio === 'large') return 'sm:col-span-2 sm:row-span-2';
    if (item.aspectRatio === 'wide') return 'sm:col-span-2 sm:row-span-1';
    if (item.aspectRatio === 'tall') return 'sm:col-span-1 sm:row-span-2';
    
    // Organic visual rhythm if default:
    // e.g. tile 0 is large, tile 4 is wide, tile 7 is tall
    const mod = index % 8;
    if (mod === 0) return 'sm:col-span-2 sm:row-span-2';
    if (mod === 3) return 'sm:col-span-2 sm:row-span-1';
    if (mod === 5) return 'sm:col-span-1 sm:row-span-2';
    return 'sm:col-span-1 sm:row-span-1';
  }, [item.aspectRatio, index]);

  // Handle audio unmute / mute on hover for YouTube iframe
  useEffect(() => {
    if (item.type !== 'video' || !item.youtubeId) return;
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    try {
      if (isHovered) {
        // Activate audio
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
          '*'
        );
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
          '*'
        );
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        );
      } else {
        // Mute audio
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'mute', args: [] }),
          '*'
        );
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [0] }),
          '*'
        );
      }
    } catch {
      // ignore cross-origin postMessage restrictions
    }
  }, [isHovered, item]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`relative group rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/80 shadow-md cursor-pointer transition-all duration-300 ${gridSpanClass} ${
        isHovered ? 'z-30 shadow-2xl shadow-pink-950/40 ring-2 ring-pink-500/60 scale-[1.02]' : 'hover:border-pink-500/30'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 
        NO VISUAL CLUES INDICATING WHICH IS VIDEO OR PHOTO:
        Both look identically sleek and integrated!
      */}
      {item.type === 'video' && item.youtubeId ? (
        <div className="w-full h-full absolute inset-0 overflow-hidden bg-black pointer-events-none">
          {/* 
            YouTube embed in muted autoplay with controls hidden:
            Scale up slightly to crop standard YouTube header/player edges 
          */}
          <iframe
            ref={iframeRef}
            src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?enablejsapi=1&autoplay=1&mute=1&loop=1&playlist=${item.youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1&showinfo=0&iv_load_policy=3&disablekb=1&fs=0`}
            title={item.title || 'Vídeo no mosaico'}
            className="w-[140%] h-[140%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      ) : item.type === 'video' && !item.youtubeId ? (
        <div className="w-full h-full absolute inset-0 overflow-hidden bg-black pointer-events-none">
          <video
            src={item.url}
            autoPlay
            muted
            loop
            playsInline
            controlsList="nodownload"
            className="w-full h-full object-cover pointer-events-none"
          />
        </div>
      ) : (
        <div className="w-full h-full absolute inset-0 overflow-hidden bg-slate-900 pointer-events-none">
          <img
            src={item.url}
            alt={item.title || 'Foto da Galeria Viva'}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 pointer-events-none select-none"
            loading="lazy"
          />
        </div>
      )}

      {/* Transparent Click Overlay to trigger in-site modal and avoid YouTube redirection */}
      <div className="absolute inset-0 z-10 cursor-pointer" />

      {/* Subtle Bottom Ambient Gradient Overlay for text readability on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none flex flex-col justify-end p-3 sm:p-4">
        {item.title && (
          <p className="text-xs sm:text-sm font-bold text-white leading-tight drop-shadow-md">
            {item.title}
          </p>
        )}
        {item.caption && (
          <p className="text-[10px] sm:text-xs text-slate-300 line-clamp-1 font-light mt-0.5 drop-shadow">
            {item.caption}
          </p>
        )}
      </div>

      {/* Audio indicator badge shown ONLY while hovering if audio is playing */}
      {isHovered && item.type === 'video' && (
        <div className="absolute top-2.5 right-2.5 z-20 bg-pink-600/90 text-white text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md pointer-events-none animate-fadeIn">
          <Volume2 className="w-3 h-3 animate-pulse" />
          <span>Áudio ativo</span>
        </div>
      )}
    </motion.div>
  );
}
