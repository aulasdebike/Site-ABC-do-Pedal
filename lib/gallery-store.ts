'use client';

import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from './firebase';

export type GalleryMediaType = 'photo' | 'video';
export type GalleryAspectRatio = 'normal' | 'tall' | 'wide' | 'large';

export interface GalleryItem {
  id: string;
  type: GalleryMediaType;
  url: string;
  youtubeId?: string;
  title?: string;
  caption?: string;
  aspectRatio?: GalleryAspectRatio;
  hidden: boolean;
  order: number;
  createdAt: string;
  updatedAt?: string;
}

// Error handling conforming to Firebase skill
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path,
  };
  console.error('Firestore Gallery Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Extrai o ID de um vídeo do YouTube a partir de diversos formatos de links:
 * - https://www.youtube.com/watch?v=R_uOXPJf3zc
 * - https://youtu.be/R_uOXPJf3zc
 * - https://www.youtube.com/shorts/R_uOXPJf3zc
 * - https://www.youtube.com/embed/R_uOXPJf3zc
 * - R_uOXPJf3zc (ID direto de 11 caracteres)
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Se já for apenas o ID de 11 caracteres
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Padrões do YouTube
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i,
    /^[a-zA-Z0-9_-]{11}$/
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Detecta automaticamente o tipo de mídia (foto ou vídeo) a partir do link inserido
 */
export function detectMediaType(url: string): GalleryMediaType {
  if (!url) return 'photo';
  const trimmed = url.trim().toLowerCase();
  if (extractYouTubeId(url)) {
    return 'video';
  }
  if (
    trimmed.includes('youtube.com') ||
    trimmed.includes('youtu.be') ||
    trimmed.endsWith('.mp4') ||
    trimmed.endsWith('.webm') ||
    trimmed.endsWith('.mov')
  ) {
    return 'video';
  }
  return 'photo';
}

/**
 * Coleção inicial de conteúdos da Galeria Viva (Fotos autênticas e vídeos de alunos aprendendo)
 */
export const DEFAULT_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gal-1',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=R_uOXPJf3zc',
    youtubeId: 'R_uOXPJf3zc',
    title: 'Alunos reais descobrindo o equilíbrio no Parque Ibirapuera',
    caption: 'Primeira vez tirando os pés do chão sem apoio e com confiança total.',
    aspectRatio: 'tall',
    hidden: false,
    order: 1,
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'gal-2',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1200&auto=format&fit=crop',
    title: 'Superando o medo aos 52 anos',
    caption: 'A alegria indescritível de quem descobriu que nunca é tarde para começar.',
    aspectRatio: 'wide',
    hidden: false,
    order: 2,
    createdAt: '2026-09-02T11:00:00Z',
  },
  {
    id: 'gal-3',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?q=80&w=1200&auto=format&fit=crop',
    title: 'Paciência, didática e acolhimento',
    caption: 'Sem pressa e sem comparações: cada passo no ritmo do aluno.',
    aspectRatio: 'normal',
    hidden: false,
    order: 3,
    createdAt: '2026-09-03T12:00:00Z',
  },
  {
    id: 'gal-4',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=2v8vsvsqb4E',
    youtubeId: '2v8vsvsqb4E',
    title: 'A técnica do Método ABC-DE na prática',
    caption: 'Coordenação e controle de guidão com postura relaxada.',
    aspectRatio: 'normal',
    hidden: false,
    order: 4,
    createdAt: '2026-09-04T13:00:00Z',
  },
  {
    id: 'gal-5',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1200&auto=format&fit=crop',
    title: 'Conquistando a primeira volta completa',
    caption: 'A sensação de leveza do vento no rosto pela primeira vez.',
    aspectRatio: 'large',
    hidden: false,
    order: 5,
    createdAt: '2026-09-05T14:00:00Z',
  },
  {
    id: 'gal-6',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?q=80&w=1200&auto=format&fit=crop',
    title: 'Sorriso de dever cumprido',
    caption: 'Celebrando a superação de um bloqueio que durava décadas.',
    aspectRatio: 'normal',
    hidden: false,
    order: 6,
    createdAt: '2026-09-06T15:00:00Z',
  },
  {
    id: 'gal-7',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=kYJzE5XgH6s',
    youtubeId: 'kYJzE5XgH6s',
    title: 'Transição segura para o pedal completo',
    caption: 'Treino de frenagem suave e paradas precisas.',
    aspectRatio: 'tall',
    hidden: false,
    order: 7,
    createdAt: '2026-09-07T16:00:00Z',
  },
  {
    id: 'gal-8',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1471506480208-91b3a4cc78be?q=80&w=1200&auto=format&fit=crop',
    title: 'Pedalando com a família no fim de semana',
    caption: 'O objetivo final alcançado: autonomia e lazer sem depender de ninguém.',
    aspectRatio: 'wide',
    hidden: false,
    order: 8,
    createdAt: '2026-09-08T17:00:00Z',
  },
  {
    id: 'gal-9',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1520333789090-1afc82db536a?q=80&w=1200&auto=format&fit=crop',
    title: 'Segurança absoluta em cada curva',
    caption: 'Equipamento adaptado e instruções claras passo a passo.',
    aspectRatio: 'normal',
    hidden: false,
    order: 9,
    createdAt: '2026-09-09T18:00:00Z',
  },
  {
    id: 'gal-10',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=Z1BCujX3pw8',
    youtubeId: 'Z1BCujX3pw8',
    title: 'Treino de equilíbrio dinâmico e agilidade',
    caption: 'Superando o medo de inclinar a bicicleta.',
    aspectRatio: 'normal',
    hidden: false,
    order: 10,
    createdAt: '2026-09-10T19:00:00Z',
  },
  {
    id: 'gal-11',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?q=80&w=1200&auto=format&fit=crop',
    title: 'Manhã ensolarada no Parque Celso Daniel',
    caption: 'Aulas em Santo André e São Bernardo com estrutura completa.',
    aspectRatio: 'normal',
    hidden: false,
    order: 11,
    createdAt: '2026-09-11T20:00:00Z',
  },
  {
    id: 'gal-12',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=1200&auto=format&fit=crop',
    title: 'O olhar focado de quem venceu o receio',
    caption: 'A concentração e tranquilidade proporcionadas pelo método.',
    aspectRatio: 'wide',
    hidden: false,
    order: 12,
    createdAt: '2026-09-12T21:00:00Z',
  }
];

const LOCAL_STORAGE_KEY = 'abc_galeria_viva_items';

/**
 * Carrega a lista de conteúdos salvos localmente
 */
export function getStoredGalleryItems(): GalleryItem[] {
  if (typeof window === 'undefined') return DEFAULT_GALLERY_ITEMS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_GALLERY_ITEMS));
      return DEFAULT_GALLERY_ITEMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_GALLERY_ITEMS;
  } catch (err) {
    console.error('Erro ao ler galeria do localStorage:', err);
    return DEFAULT_GALLERY_ITEMS;
  }
}

/**
 * Salva a lista de conteúdos no localStorage e notifica os componentes
 */
export function saveStoredGalleryItems(items: GalleryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('abc_gallery_updated', { detail: items }));

    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('abc_gallery_sync_channel');
      channel.postMessage({ type: 'abc_gallery_updated', items });
      channel.close();
    }
  } catch (err) {
    console.error('Erro ao salvar galeria no localStorage:', err);
  }
}

/**
 * Salva ou atualiza um item na coleção do Firestore
 */
export async function saveGalleryItemToFirestore(item: GalleryItem): Promise<void> {
  const path = `gallery/${item.id}`;
  try {
    const docRef = doc(db, 'gallery', item.id);
    const cleaned: Record<string, any> = {
      id: item.id,
      type: item.type,
      url: item.url,
      hidden: item.hidden ?? false,
      order: item.order ?? Date.now(),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (item.youtubeId) cleaned.youtubeId = item.youtubeId;
    if (item.title) cleaned.title = item.title;
    if (item.caption) cleaned.caption = item.caption;
    if (item.aspectRatio) cleaned.aspectRatio = item.aspectRatio;

    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Exclui um item da coleção do Firestore
 */
export async function deleteGalleryItemFromFirestore(id: string): Promise<void> {
  const path = `gallery/${id}`;
  try {
    const docRef = doc(db, 'gallery', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Obtém todos os itens da galeria do Firestore
 */
export async function getGalleryFromFirestore(): Promise<GalleryItem[]> {
  const path = 'gallery';
  try {
    const colRef = collection(db, 'gallery');
    const snapshot = await getDocs(colRef);
    const list: GalleryItem[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as GalleryItem);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Listener em tempo real para sincronização com o Firestore
 */
export function subscribeToGalleryFirestore(onUpdate: (items: GalleryItem[]) => void) {
  const path = 'gallery';
  const colRef = collection(db, 'gallery');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: GalleryItem[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as GalleryItem);
      });
      if (list.length > 0) {
        onUpdate(list);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}
