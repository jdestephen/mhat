'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { X, Copy, Check, Clock, User, Mail, FileText } from 'lucide-react';
import api from '@/lib/api';

interface ShareRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordIds: string[];
  recordTitles?: string[];
}

export function ShareRecordDialog({ 
  open, 
  onOpenChange, 
  recordIds,
  recordTitles = []
}: ShareRecordDialogProps) {
  const [expiration, setExpiration] = useState('20');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isSingleUse, setIsSingleUse] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [copied, setCopied] = useState(false);

  const expirationOptions = [
    { value: '10', label: '10 minutes' },
    { value: '20', label: '20 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '240', label: '4 hours' },
    { value: '1440', label: '24 hours' },
    { value: '10080', label: '7 days' },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await api.post('/hx/share', {
        record_ids: recordIds,
        expiration_minutes: parseInt(expiration),
        is_single_use: isSingleUse,
        recipient_name: recipientName || undefined,
        recipient_email: recipientEmail || undefined,
        purpose: purpose || undefined,
      });

      setShareUrl(response.data.share_url);
      setExpiresAt(response.data.expires_at);
    } catch (error) {
      console.error('Failed to generate share link:', error);
      alert('Failed to generate share link. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleClose = () => {
    setShareUrl('');
    setExpiresAt('');
    setRecipientName('');
    setRecipientEmail('');
    setPurpose('');
    setIsSingleUse(false);
    setCopied(false);
    onOpenChange(false);
  };

  const formatExpirationDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Share Medical Records</DialogTitle>
          <DialogDescription>
            Generate a secure, time-limited link to share {recordIds.length} record{recordIds.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-4 py-4">
            {/* Record List */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Records to Share</label>
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50 max-h-32 overflow-y-auto">
                {recordTitles.length > 0 ? (
                  <ul className="space-y-1">
                    {recordTitles.map((title, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                        <FileText className="h-3 w-3 text-emerald-600" />
                        {title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">{recordIds.length} record{recordIds.length > 1 ? 's' : ''} selected</p>
                )}
              </div>
            </div>

            {/* Expiration Time */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Expiration Time
              </label>
              <Select
                options={expirationOptions}
                value={expiration}
                onChange={(val) => setExpiration(val.toString())}
              />
            </div>

            {/* Single Use Toggle */}
            <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-md">
              <input
                type="checkbox"
                id="singleUse"
                checked={isSingleUse}
                onChange={(e) => setIsSingleUse(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
              />
              <label htmlFor="singleUse" className="text-sm cursor-pointer">
                <span className="font-medium">Single-use link</span>
                <span className="text-slate-500 block text-xs">Link can only be accessed once</span>
              </label>
            </div>

            {/* Recipient Info (Optional) */}
            <div className="space-y-3 p-3 border border-slate-200 rounded-md bg-slate-50">
              <p className="text-sm font-medium text-slate-700">Recipient Info (Optional)</p>
              
              <div className="space-y-2">
                <label className="text-xs text-slate-600 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Name
                </label>
                <Input
                  placeholder="Dr. John Smith"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-600 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="doctor@hospital.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-600">Purpose</label>
                <Input
                  placeholder="e.g., Cardiology consultation"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? 'Generating...' : 'Generate Share Link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Success Message */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md">
              <p className="text-sm font-medium text-emerald-900">✓ Share link generated successfully!</p>
              <p className="text-xs text-emerald-700 mt-1">
                Expires: {formatExpirationDate(expiresAt)}
              </p>
            </div>

            {/* Share URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Shareable Link</label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="px-3"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-emerald-600">✓ Copied to clipboard</p>
              )}
            </div>

            {/* Instructions */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <p className="text-sm font-medium text-slate-700">Next Steps:</p>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                <li>Copy the link and share it with the recipient</li>
                <li>The link will expire in {expirationOptions.find(o => o.value === expiration)?.label}</li>
                {isSingleUse && <li>This link can only be accessed once</li>}
                <li>You can revoke access anytime from your shared links page</li>
              </ul>
            </div>

            {/* Close Button */}
            <Button onClick={handleClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
