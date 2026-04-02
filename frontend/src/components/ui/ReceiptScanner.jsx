import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { Camera, Upload, X, Check, Loader2, Receipt, Plus } from 'lucide-react';

export default function ReceiptScanner({ onClose }) {
  const { t, lang, locale } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedItems, setSavedItems] = useState([]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);
    setSavedItems([]);

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const scanReceipt = async () => {
    if (!preview) return;
    setScanning(true);
    setError('');

    try {
      // Extract base64 data and media type
      const [header, base64] = preview.split(',');
      const mediaType = header.match(/data:(.*?);/)?.[1] || 'image/jpeg';

      const res = await api.post('/ai/scan-receipt', {
        image: base64,
        media_type: mediaType,
        lang
      });

      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to scan receipt');
    }
    setScanning(false);
  };

  const saveItem = async (item, index) => {
    setSaving(true);
    try {
      await api.post('/transactions', {
        type: 'expense',
        amount: item.amount,
        description: item.description,
        date: item.date || result.date || new Date().toISOString().split('T')[0],
        category_id: item.category_id || '',
        account_id: ''
      });
      setSavedItems(prev => [...prev, index]);
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    } catch (err) {
      setError('Failed to save transaction');
    }
    setSaving(false);
  };

  const saveAll = async () => {
    if (!result?.items) return;
    setSaving(true);
    for (let i = 0; i < result.items.length; i++) {
      if (savedItems.includes(i)) continue;
      try {
        await api.post('/transactions', {
          type: 'expense',
          amount: result.items[i].amount,
          description: result.items[i].description,
          date: result.items[i].date || result.date || new Date().toISOString().split('T')[0],
          category_id: result.items[i].category_id || '',
          account_id: ''
        });
        setSavedItems(prev => [...prev, i]);
      } catch (err) {}
    }
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
    qc.invalidateQueries({ queryKey: ['accounts'] });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={18} color="var(--accent)" />
            {t('receipt.title') || 'Scan Receipt'}
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {!preview ? (
          <div style={{
            border: '2px dashed var(--border)', borderRadius: 12, padding: 40,
            textAlign: 'center', cursor: 'pointer', background: 'var(--bg-elevated)',
            transition: 'border-color 0.2s'
          }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            onDrop={e => {
              e.preventDefault();
              e.currentTarget.style.borderColor = 'var(--border)';
              const file = e.dataTransfer.files[0];
              if (file) { const dt = new DataTransfer(); dt.items.add(file); fileRef.current.files = dt.files; handleFile({ target: { files: [file] } }); }
            }}
          >
            <Camera size={40} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {t('receipt.upload') || 'Upload a receipt photo'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t('receipt.drag') || 'Drag & drop or click to browse'}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          </div>
        ) : (
          <>
            {/* Preview */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <img src={preview} alt="Receipt" style={{
                width: '100%', maxHeight: 250, objectFit: 'contain', borderRadius: 8,
                border: '1px solid var(--border)'
              }} />
              <button className="btn-icon" style={{
                position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)',
                color: 'white', borderRadius: 6
              }} onClick={() => { setPreview(null); setResult(null); setError(''); setSavedItems([]); }}>
                <X size={14} />
              </button>
            </div>

            {!result && !scanning && (
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
                onClick={scanReceipt}>
                <Camera size={14} /> {t('receipt.scan') || 'Scan with AI'}
              </button>
            )}

            {scanning && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div className="loader" style={{ margin: '0 auto 12px', width: 28, height: 28 }} />
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {t('receipt.scanning') || 'AI is analyzing your receipt...'}
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>
            )}

            {result && (
              <div>
                {result.store_name && (
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{result.store_name}</div>
                )}
                {result.summary && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{result.summary}</div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {result.items?.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      background: savedItems.includes(i) ? 'var(--green-bg)' : 'var(--bg-elevated)',
                      borderRadius: 8, transition: 'background 0.3s'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.description}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.date}</div>
                      </div>
                      <div style={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                        {formatCurrency(item.amount, user?.currency, locale)}
                      </div>
                      {savedItems.includes(i) ? (
                        <Check size={16} color="var(--green)" />
                      ) : (
                        <button className="btn-icon" onClick={() => saveItem(item, i)} disabled={saving}
                          style={{ color: 'var(--accent)' }}>
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {result.total && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', padding: '10px 12px',
                    background: 'var(--accent-glow)', borderRadius: 8, fontWeight: 700, fontSize: 14,
                    marginBottom: 12
                  }}>
                    <span>{t('receipt.total') || 'Total'}</span>
                    <span style={{ fontFamily: 'DM Mono', color: 'var(--accent)' }}>
                      {formatCurrency(result.total, user?.currency, locale)}
                    </span>
                  </div>
                )}

                {savedItems.length < (result.items?.length || 0) && (
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                    onClick={saveAll} disabled={saving}>
                    {saving ? '...' : t('receipt.save_all') || 'Save All Transactions'}
                  </button>
                )}

                {savedItems.length === result.items?.length && result.items?.length > 0 && (
                  <div style={{
                    textAlign: 'center', padding: 12, color: 'var(--green)', fontWeight: 700, fontSize: 14,
                    background: 'var(--green-bg)', borderRadius: 8
                  }}>
                    <Check size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
                    {t('receipt.all_saved') || 'All items saved!'}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
