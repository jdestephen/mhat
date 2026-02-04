'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { ShareLinkCard } from './components/ShareLinkCard';
import { CreateShareDialog } from './components/CreateShareDialog';

interface ShareLink {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  is_revoked: boolean;
  is_single_use: boolean;
  record_count: number;
  access_count: number;
  recipient_name?: string;
  recipient_email?: string;
  purpose?: string;
  share_type?: string;
}

export default function SharedLinksPage() {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'expired' | 'all'>('active');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchShares = async () => {
    try {
      const params = new URLSearchParams();
      if (filter === 'expired') {
        params.append('include_expired', 'true');
      } else if (filter === 'all') {
        params.append('include_expired', 'true');
        params.append('include_revoked', 'true');
      }

      const response = await api.get(`/hx/shares?${params.toString()}`);
      setShares(response.data.shares || []);
    } catch (error) {
      console.error('Failed to fetch shares:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
  }, [filter]);

  const handleRevoke = async (tokenId: string) => {
    if (!confirm('¿Estás seguro de que deseas revocar este enlace?')) {
      return;
    }

    try {
      await api.delete(`/hx/share/${tokenId}`);
      fetchShares(); // Refresh list
    } catch (error) {
      console.error('Failed to revoke share:', error);
      alert('Error al revocar el enlace');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-emerald-950">Mis Enlaces Compartidos</h1>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-emerald-900 hover:bg-emerald-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Enlace
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            filter === 'active'
              ? 'border-emerald-600 text-emerald-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Activos
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            filter === 'expired'
              ? 'border-emerald-600 text-emerald-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Expirados
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            filter === 'all'
              ? 'border-emerald-600 text-emerald-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Todos
        </button>
      </div>

      {/* Share Links List */}
      {shares.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-slate-200 text-center">
          <p className="text-slate-600 mb-4">
            {filter === 'active' 
              ? 'No tienes enlaces activos para compartir' 
              : filter === 'expired'
              ? 'No tienes enlaces expirados'
              : 'No has creado ningún enlace para compartir'}
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            variant="outline"
          >
            Crear Primer Enlace
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {shares.map((share) => (
            <ShareLinkCard
              key={share.id}
              share={share}
              onRevoke={() => handleRevoke(share.id)}
              onRefresh={fetchShares}
            />
          ))}
        </div>
      )}

      {/* Create Share Dialog */}
      <CreateShareDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchShares}
      />
    </div>
  );
}
