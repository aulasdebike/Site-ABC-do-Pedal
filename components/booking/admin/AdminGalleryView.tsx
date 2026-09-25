'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit2, 
  Eye, 
  EyeOff, 
  Link as LinkIcon, 
  Video, 
  Image as ImageIcon, 
  Check, 
  X, 
  ExternalLink, 
  AlertCircle, 
  RefreshCw,
  Sliders,
  Layers,
  HelpCircle
} from 'lucide-react';
import { 
  GalleryItem, 
  GalleryAspectRatio, 
  GalleryMediaType,
  getStoredGalleryItems, 
  saveStoredGalleryItems, 
  saveGalleryItemToFirestore, 
  deleteGalleryItemFromFirestore,
  extractYouTubeId,
  detectMediaType,
  getGalleryFromFirestore,
  subscribeToGalleryFirestore
} from '@/lib/gallery-store';

export function AdminGalleryView() {
  const [items, setItems] = useState<GalleryItem[]>(() => {
    return getStoredGalleryItems();
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'photo' | 'video' | 'hidden'>('all');

  // Modal / Form state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);

  // Form fields
  const [formUrl, setFormUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formAspectRatio, setFormAspectRatio] = useState<GalleryAspectRatio>('normal');
  const [formHidden, setFormHidden] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Derived media type from url
  const detectedType = useMemo(() => {
    return detectMediaType(formUrl);
  }, [formUrl]);

  const detectedYouTubeId = useMemo(() => {
    return extractYouTubeId(formUrl);
  }, [formUrl]);

  // Load and subscribe
  useEffect(() => {
    let isMounted = true;

    // Initial fetch from Firestore
    getGalleryFromFirestore().then((fsItems) => {
      if (!isMounted || !fsItems || fsItems.length === 0) return;
      setItems((prev) => {
        const map = new Map<string, GalleryItem>();
        prev.forEach((i) => map.set(i.id, i));
        fsItems.forEach((i) => map.set(i.id, i));
        const merged = Array.from(map.values()).sort((a, b) => a.order - b.order);
        saveStoredGalleryItems(merged);
        return merged;
      });
    }).catch(() => {});

    // Listen to firestore snapshot
    const unsubscribeFs = subscribeToGalleryFirestore((fsItems) => {
      if (!isMounted || !fsItems || fsItems.length === 0) return;
      setItems((prev) => {
        const map = new Map<string, GalleryItem>();
        prev.forEach((i) => map.set(i.id, i));
        fsItems.forEach((i) => map.set(i.id, i));
        const merged = Array.from(map.values()).sort((a, b) => a.order - b.order);
        return merged;
      });
    });

    return () => {
      isMounted = false;
      unsubscribeFs();
    };
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterType === 'photo' && item.type !== 'photo') return false;
      if (filterType === 'video' && item.type !== 'video') return false;
      if (filterType === 'hidden' && !item.hidden) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchCaption = (item.caption || '').toLowerCase().includes(q);
        const matchUrl = item.url.toLowerCase().includes(q);
        if (!matchTitle && !matchCaption && !matchUrl) return false;
      }

      return true;
    });
  }, [items, filterType, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const photos = items.filter((i) => i.type === 'photo').length;
    const videos = items.filter((i) => i.type === 'video').length;
    const hidden = items.filter((i) => i.hidden).length;
    const visible = total - hidden;
    return { total, photos, videos, hidden, visible };
  }, [items]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormUrl('');
    setFormTitle('');
    setFormCaption('');
    setFormAspectRatio('normal');
    setFormHidden(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setFormUrl(item.url);
    setFormTitle(item.title || '');
    setFormCaption(item.caption || '');
    setFormAspectRatio(item.aspectRatio || 'normal');
    setFormHidden(item.hidden);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Save / Update Item
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUrl.trim()) {
      setFormError('Informe o link da foto ou do vídeo do YouTube.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const type = detectMediaType(formUrl);
      const ytId = extractYouTubeId(formUrl);

      const itemToSave: GalleryItem = {
        id: editingItem ? editingItem.id : `gal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        url: formUrl.trim(),
        youtubeId: ytId || undefined,
        title: formTitle.trim() || undefined,
        caption: formCaption.trim() || undefined,
        aspectRatio: formAspectRatio,
        hidden: formHidden,
        order: editingItem ? editingItem.order : items.length + 1,
        createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = editingItem
        ? items.map((i) => (i.id === itemToSave.id ? itemToSave : i))
        : [itemToSave, ...items];

      setItems(updated);
      saveStoredGalleryItems(updated);

      // Async sync to Firestore
      try {
        await saveGalleryItemToFirestore(itemToSave);
      } catch (fsErr) {
        console.warn('Erro ao salvar no Firestore (mantido localmente):', fsErr);
      }

      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      setFormError(err?.message || 'Erro ao salvar conteúdo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Visibility (Ocultar / Exibir)
  const handleToggleVisibility = async (item: GalleryItem) => {
    const updatedItem = { ...item, hidden: !item.hidden, updatedAt: new Date().toISOString() };
    const updatedList = items.map((i) => (i.id === item.id ? updatedItem : i));
    setItems(updatedList);
    saveStoredGalleryItems(updatedList);

    try {
      await saveGalleryItemToFirestore(updatedItem);
    } catch (fsErr) {
      console.warn('Erro ao atualizar visibilidade no Firestore:', fsErr);
    }
  };

  // Delete Item
  const handleDelete = async (item: GalleryItem) => {
    const confirmDelete = window.confirm(
      `Deseja realmente remover o conteúdo "${item.title || item.url}" da Galeria Viva?`
    );
    if (!confirmDelete) return;

    const updatedList = items.filter((i) => i.id !== item.id);
    setItems(updatedList);
    saveStoredGalleryItems(updatedList);

    try {
      await deleteGalleryItemFromFirestore(item.id);
    } catch (fsErr) {
      console.warn('Erro ao excluir do Firestore:', fsErr);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Metrics */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-pink-400">
                Gerenciamento de Conteúdos
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Painel da Galeria Viva
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Cadastre fotos e vídeos do YouTube através de links externos. O sistema armazena apenas as URLs necessárias, mantendo o carregamento progressivo e ultrarrápido.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-[#ff007f] hover:from-pink-500 hover:to-pink-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-pink-900/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Novo Conteúdo</span>
          </button>
        </div>

        {/* Counter cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-900">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-mono uppercase text-slate-400">Total no Catálogo</span>
            <p className="text-lg font-black text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-mono uppercase text-pink-400">Fotos Ativas</span>
            <p className="text-lg font-black text-pink-400">{stats.photos}</p>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-mono uppercase text-rose-400">Vídeos YouTube</span>
            <p className="text-lg font-black text-rose-400">{stats.videos}</p>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-mono uppercase text-amber-400">Ocultos / Rascunhos</span>
            <p className="text-lg font-black text-amber-400">{stats.hidden}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título ou link..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `Todos (${stats.total})` },
            { id: 'photo', label: `Fotos (${stats.photos})` },
            { id: 'video', label: `Vídeos (${stats.videos})` },
            { id: 'hidden', label: `Ocultos (${stats.hidden})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filterType === tab.id
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid View */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-950 p-12 text-center rounded-2xl border border-slate-800">
          <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-300">Nenhum conteúdo encontrado</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm ? 'Tente buscar com outros termos.' : 'Clique em "Adicionar Novo Conteúdo" para cadastrar seu primeiro link de foto ou vídeo.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const isVideo = item.type === 'video';
            const ytId = item.youtubeId;

            return (
              <div
                key={item.id}
                className={`bg-slate-950 rounded-xl border overflow-hidden flex flex-col transition-all ${
                  item.hidden
                    ? 'border-amber-900/40 opacity-70'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Media Preview Box */}
                <div className="relative aspect-video bg-black overflow-hidden group">
                  {isVideo && ytId ? (
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                      alt={item.title || 'Vídeo YouTube'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.title || 'Foto'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as any).src = 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=600';
                      }}
                    />
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-white backdrop-blur-sm border border-white/10 flex items-center gap-1">
                      {isVideo ? <Video className="w-3 h-3 text-rose-400" /> : <ImageIcon className="w-3 h-3 text-pink-400" />}
                      <span>{isVideo ? 'Vídeo' : 'Foto'}</span>
                    </span>

                    {item.aspectRatio && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900/90 text-slate-300 border border-slate-700">
                        {item.aspectRatio}
                      </span>
                    )}
                  </div>

                  {item.hidden && (
                    <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Oculto
                    </div>
                  )}

                  {/* Hover Quick Action */}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs text-white font-mono font-bold transition-opacity"
                  >
                    <span>Abrir Link Original</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Details Box */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-white line-clamp-1">
                      {item.title || 'Sem título definido'}
                    </h3>
                    {item.caption && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {item.caption}
                      </p>
                    )}
                    <p className="text-[10px] font-mono text-slate-400 truncate mt-1.5">
                      {item.url}
                    </p>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(item)}
                      title={item.hidden ? 'Exibir na Galeria Viva' : 'Ocultar da Galeria'}
                      className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-mono transition-colors cursor-pointer ${
                        item.hidden
                          ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
                          : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                      }`}
                    >
                      {item.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span className="text-[10px]">{item.hidden ? 'Oculto' : 'Visível'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        title="Editar Informações"
                        className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        title="Remover Conteúdo"
                        className="p-1.5 rounded-lg bg-slate-900 text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-slate-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 
        =========================================================
        MODAL: ADICIONAR / EDITAR CONTEÚDO POR LINK
        =========================================================
      */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-500" />
                <h3 className="text-base font-black text-white">
                  {editingItem ? 'Editar Conteúdo' : 'Adicionar Conteúdo por Link'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              
              {/* Link Input */}
              <div className="space-y-1.5">
                <label className="font-mono font-bold text-slate-300 flex items-center justify-between">
                  <span>Link da Foto ou Vídeo do YouTube *</span>
                  <span className="text-[10px] text-pink-400 font-normal">
                    {detectedType === 'video' ? 'Vídeo YouTube detectado' : 'Foto detectada'}
                  </span>
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... ou https://images.../foto.jpg"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono text-xs"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Aceita links do YouTube (padrão, shorts, compartilhamento youtu.be) ou URLs diretas de imagens (Unsplash, Imgur, Postimg, etc.).
                </p>
              </div>

              {/* Live Preview if valid link */}
              {formUrl.trim() && (
                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Pré-visualização do Link:
                  </span>
                  {detectedType === 'video' && detectedYouTubeId ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black max-w-xs mx-auto">
                      <img
                        src={`https://img.youtube.com/vi/${detectedYouTubeId}/hqdefault.jpg`}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-[10px] font-mono text-white bg-black/80 px-2 py-1 rounded">
                          YouTube ID: {detectedYouTubeId}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black max-w-xs mx-auto">
                      <img
                        src={formUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="font-mono font-bold text-slate-300">
                  Título ou Destaque (Opcional)
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Primeiras pedaladas no Ibirapuera"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 text-xs"
                />
              </div>

              {/* Caption Input */}
              <div className="space-y-1.5">
                <label className="font-mono font-bold text-slate-300">
                  Legenda / História do Momento (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  placeholder="Ex: Aluna superou o receio após 20 anos e pedalou com autonomia."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 text-xs resize-none"
                />
              </div>

              {/* Aspect Ratio in Mosaic */}
              <div className="space-y-1.5">
                <label className="font-mono font-bold text-slate-300">
                  Tamanho / Proporção no Mosaico
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'normal', label: 'Padrão (1x1)' },
                    { id: 'wide', label: 'Largo (2x1)' },
                    { id: 'tall', label: 'Alto / 9:16' },
                    { id: 'large', label: 'Grande (2x2)' },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setFormAspectRatio(ratio.id as GalleryAspectRatio)}
                      className={`py-2 px-2.5 rounded-lg text-[11px] font-mono transition-colors border cursor-pointer ${
                        formAspectRatio === ratio.id
                          ? 'bg-pink-600/30 text-pink-300 border-pink-500 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility Switch */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <div>
                  <span className="font-mono font-bold text-slate-200 block">
                    Visível na Galeria Viva
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Se desmarcado, o item fica salvo como rascunho e não aparece para o público.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormHidden(!formHidden)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    !formHidden ? 'bg-pink-600' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      !formHidden ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 font-mono text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono font-bold text-xs shadow-lg shadow-pink-900/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingItem ? 'Atualizar Conteúdo' : 'Salvar na Galeria'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
