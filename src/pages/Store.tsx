import {useCallback, useEffect, useState} from 'react';
import SiteShell from '../components/SiteShell';
import {api, useAuth} from '../auth/auth';
import AuthModal from '../auth/AuthModal';
import {createRequestId} from '../utils/requestId';

type Product = {
  id: string; category: string; name: string; price: number; currency: 'gold' | 'diamonds'; preview: string;
  assetPath?: string; owned: boolean; equipped: boolean; requiredLevel?: number; consumable?: boolean;
  quantity?: number; unlockOnly?: boolean; requirement?: string;
};
const categories = ['EMOJİLER', 'UNVANLAR', 'ÇERÇEVELER', 'ROZETLER', 'HEDİYELER', 'TAKVİYELER'];
const format = (value: number) => new Intl.NumberFormat('tr-TR').format(value);

export default function Store() {
  const auth = useAuth();
  const [category, setCategory] = useState('EMOJİLER');
  const [items, setItems] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api<{items: Product[]}>(`/store/products?category=${encodeURIComponent(category)}`);
      setItems(response.items);
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Mağaza yüklenemedi.'); }
    finally { setLoading(false); }
  }, [category]);
  const userId = auth.user?.id;
  useEffect(() => { void load(); }, [load, userId]);

  const purchase = async () => {
    if (!selected || busy) return;
    if (!auth.user) { setSelected(null); setAuthOpen(true); return; }
    setBusy(true); setMessage('');
    try {
      const response = await api<{user: {gold: number; diamonds: number}}>('/store/purchase', {
        method: 'POST', body: JSON.stringify({productId: selected.id, requestId: createRequestId()}),
      });
      auth.patch({gold: response.user.gold, diamonds: response.user.diamonds});
      setMessage('Satın alma işlemi tamamlandı.');
      setSelected(null);
      await load();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Satın alma işlemi tamamlanamadı.'); }
    finally { setBusy(false); }
  };

  const equip = async (product: Product) => {
    if (!auth.user) { setAuthOpen(true); return; }
    if (busy || product.equipped) return;
    setBusy(true); setMessage('');
    try {
      await api('/store/equip', {method: 'POST', body: JSON.stringify({productId: product.id})});
      await auth.refresh();
      await load();
      setMessage(`${product.name} kullanıma alındı.`);
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Öğe kullanıma alınamadı.'); }
    finally { setBusy(false); }
  };

  const action = (product: Product) => {
    if (product.category === 'ROZETLER') return <button disabled>{product.owned ? 'MEVCUT' : 'KİLİTLİ'}</button>;
    if (product.unlockOnly) {
      if (!product.owned) return <button disabled>{product.requiredLevel ? 'SEVİYE GEREKLİ' : 'KİLİTLİ'}</button>;
      return <button disabled={product.equipped || busy} onClick={() => void equip(product)}>{product.equipped ? 'KULLANILIYOR' : 'KUŞAN'}</button>;
    }
    if (product.owned && !product.consumable) return <button disabled={product.equipped || busy} onClick={() => void equip(product)}>{product.equipped ? 'KULLANILIYOR' : product.category === 'ÇERÇEVELER' ? 'KUŞAN' : 'MEVCUT'}</button>;
    return <button disabled={busy} onClick={() => setSelected(product)}>{format(product.price)} {product.currency === 'gold' ? 'ALTIN' : 'ELMAS'} · SATIN AL</button>;
  };

  return <SiteShell><div className="page-body store-page">
    <h1>MAĞAZA</h1>
    <div className="store-cats" role="tablist" aria-label="Mağaza kategorileri">{categories.map(item => <button key={item} role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} onClick={() => {setCategory(item); setMessage('');}}>{item}</button>)}</div>
    {message && <div className="store-message" role="status">{message}</div>}
    {loading ? <div className="store-empty">Mağaza yükleniyor...</div> : items.length === 0 ? <div className="store-empty"><b>Bu kategoride şu anda öğe bulunmuyor.</b><span>Daha sonra yeniden kontrol edebilirsin.</span></div> : <div className="product-grid">{items.map(product => <article className="product-card" key={product.id}>
      <div className="product-preview">{product.assetPath ? <img src={product.assetPath} alt={product.name}/> : <span aria-hidden="true">{product.preview}</span>}</div>
      <b>{product.name}</b>
      <small>{product.requiredLevel ? `Seviye ${product.requiredLevel}` : product.requirement || (product.quantity ? `Adet: ${product.quantity}` : ' ')}</small>
      <div className="product-action">{action(product)}</div>
    </article>)}</div>}
  </div>
  {selected && <div className="modal-back" onMouseDown={event => {if (event.target === event.currentTarget && !busy) setSelected(null);}}><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="purchase-title"><h2 id="purchase-title">Satın alma onayı</h2><p><b>{selected.name}</b> öğesini {format(selected.price)} {selected.currency === 'gold' ? 'altın' : 'elmas'} karşılığında satın almak istiyor musunuz?</p><div><button onClick={() => setSelected(null)} disabled={busy}>İPTAL</button><button onClick={() => void purchase()} disabled={busy}>{busy ? 'BEKLEYİN…' : 'SATIN AL'}</button></div></div></div>}
  {authOpen && <AuthModal onClose={() => setAuthOpen(false)}/>}</SiteShell>;
}
