'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, RefreshCw, X, Package, CircleCheck as CheckCircle } from 'lucide-react';
import type { Supplier, Warehouse } from '@/lib/types';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier?: { name: string };
  status: string;
  total_amount: number;
}

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  product: { name: string; sku: string; unit: string };
  quantity: number;
  received_quantity: number;
  unit_cost: number;
}

interface GRN {
  id: string;
  grn_number: string;
  supplier_id: string;
  purchase_order_id: string;
  warehouse_id: string;
  received_date: string;
  status: string;
  notes: string;
  supplier?: { name: string };
  purchase_order?: { po_number: string };
  warehouse?: { name: string };
}

export default function GRNPage() {
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { loadGRNs(); }, []);

  async function loadGRNs() {
    setLoading(true);
    const { data } = await supabase
      .from('goods_receipt_notes')
      .select('*, supplier:suppliers(name), purchase_order:purchase_orders(po_number), warehouse:warehouses(name)')
      .order('created_at', { ascending: false });
    setGrns(data || []);
    setLoading(false);
  }

  const filtered = grns.filter(g =>
    !search || g.grn_number.toLowerCase().includes(search.toLowerCase()) || g.supplier?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Goods Receipt Notes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Record and verify incoming stock</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          New GRN
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search GRNs..."
            className="w-full pl-8 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <button onClick={loadGRNs} className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm hover:bg-muted transition">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="table-wrapper">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">GRN #</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Supplier</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">PO #</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Warehouse</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Date</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No GRNs recorded yet</td>
              </tr>
            ) : (
              filtered.map(g => (
                <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">{g.grn_number}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{g.supplier?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{g.purchase_order?.po_number || 'Direct'}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{g.warehouse?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(g.received_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge-status ${g.status === 'posted' ? 'bg-green-50 text-green-600' : g.status === 'verified' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <GRNModal onClose={() => setShowModal(false)} onSaved={loadGRNs} />
      )}
    </div>
  );
}

function GRNModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState(1);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [receiveItems, setReceiveItems] = useState<Record<string, number>>({});
  const [directMode, setDirectMode] = useState(false);
  const [directSupplier, setDirectSupplier] = useState('');
  const [directWarehouse, setDirectWarehouse] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const [supRes, whRes, poRes] = await Promise.all([
        supabase.from('suppliers').select('*').eq('is_active', true).order('name'),
        supabase.from('warehouses').select('*').eq('is_active', true).order('is_default', { ascending: false }),
        supabase.from('purchase_orders').select('id, po_number, supplier_id, status, total_amount, supplier:suppliers(name)').in('status', ['approved', 'partially_received']).order('order_date', { ascending: false }),
      ]);
      setSuppliers(supRes.data || []);
      setWarehouses(whRes.data || []);
      setPurchaseOrders((poRes.data || []).map((po: any) => ({
        ...po,
        supplier: Array.isArray(po.supplier) ? po.supplier[0] : po.supplier,
      })));
    }
    load();
  }, []);

  async function selectPO(po: PurchaseOrder) {
    setSelectedPO(po);
    const { data } = await supabase
      .from('purchase_order_items')
      .select('*, product:products(name, sku, unit)')
      .eq('purchase_order_id', po.id);
    setItems(data || []);
    // Initialize receive quantities with remaining quantities
    const initReceive: Record<string, number> = {};
    (data || []).forEach((item: any) => {
      initReceive[item.id] = Math.max(0, Number(item.quantity) - Number(item.received_quantity));
    });
    setReceiveItems(initReceive);
    setStep(2);
  }

  async function handleSave() {
    setError('');

    if (!directMode && !selectedPO) {
      setError('Please select a purchase order');
      return;
    }

    if (directMode && (!directSupplier || !directWarehouse)) {
      setError('Please select supplier and warehouse');
      return;
    }

    const itemsToReceive = Object.entries(receiveItems).filter(([_, qty]) => qty > 0);
    if (itemsToReceive.length === 0) {
      setError('Please enter quantities to receive');
      return;
    }

    setSaving(true);

    try {
      const grnId = crypto.randomUUID();
      const grnNumber = `GRN-${Date.now().toString().slice(-6)}`;
      const warehouseId = directMode ? directWarehouse : warehouses.find(w => w.is_default)?.id || warehouses[0]?.id;

      // Create GRN record
      await supabase.from('goods_receipt_notes').insert({
        id: grnId,
        tenant_id: '00000000-0000-0000-0000-000000000001',
        grn_number: grnNumber,
        supplier_id: directMode ? directSupplier : selectedPO!.supplier_id,
        purchase_order_id: directMode ? null : selectedPO!.id,
        warehouse_id: warehouseId,
        received_date: new Date().toISOString().split('T')[0],
        status: 'posted',
      });

      // Process each item
      for (const [itemId, qty] of itemsToReceive) {
        const item = items.find(i => i.id === itemId);
        if (!item) continue;

        // Create stock movement
        await supabase.from('stock_movements').insert({
          tenant_id: '00000000-0000-0000-0000-000000000001',
          product_id: item.product_id,
          warehouse_id: warehouseId,
          movement_type: 'purchase',
          quantity: qty,
          unit_cost: item.unit_cost,
          reference_type: 'grn',
          reference_id: grnId,
          reference_number: grnNumber,
        });

        // Update or create inventory item
        const { data: invItem } = await supabase
          .from('inventory_items')
          .select('id, quantity_on_hand')
          .eq('product_id', item.product_id)
          .eq('warehouse_id', warehouseId)
          .maybeSingle();

        if (invItem) {
          await supabase.from('inventory_items').update({
            quantity_on_hand: Number(invItem.quantity_on_hand) + qty,
            updated_at: new Date().toISOString(),
          }).eq('id', invItem.id);
        } else {
          await supabase.from('inventory_items').insert({
            tenant_id: '00000000-0000-0000-0000-000000000001',
            product_id: item.product_id,
            warehouse_id: warehouseId,
            quantity_on_hand: qty,
          });
        }

        // Update PO item received quantity
        if (!directMode && selectedPO) {
          await supabase.from('purchase_order_items').update({
            received_quantity: Number(item.received_quantity) + qty,
          }).eq('id', itemId);
        }
      }

      // Update PO status
      if (!directMode && selectedPO) {
        const { data: allItems } = await supabase
          .from('purchase_order_items')
          .select('quantity, received_quantity')
          .eq('purchase_order_id', selectedPO.id);

        const allReceived = (allItems || []).every(i => Number(i.received_quantity) >= Number(i.quantity));
        const someReceived = (allItems || []).some(i => Number(i.received_quantity) > 0);

        const newStatus = allReceived ? 'received' : someReceived ? 'partially_received' : 'approved';
        await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', selectedPO.id);
      }

      toast({ title: 'Success', description: `GRN ${grnNumber} created successfully` });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredPOs = purchaseOrders.filter(po =>
    !search || po.po_number.toLowerCase().includes(search.toLowerCase()) || po.supplier?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white">
          <h2 className="text-base font-bold">New Goods Receipt Note</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4">{error}</div>}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setDirectMode(false)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${!directMode ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}
                >
                  From Purchase Order
                </button>
                <button
                  onClick={() => setDirectMode(true)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${directMode ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}
                >
                  Direct Receipt (No PO)
                </button>
              </div>

              {!directMode ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search purchase orders..."
                      className="w-full pl-8 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="max-h-[350px] overflow-y-auto space-y-2">
                    {filteredPOs.map(po => (
                      <div
                        key={po.id}
                        onClick={() => selectPO(po)}
                        className="p-4 border border-border rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{po.po_number}</p>
                            <p className="text-sm text-muted-foreground">{po.supplier?.name || 'Unknown'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground">{formatCurrency(po.total_amount)}</p>
                            <p className="text-xs text-muted-foreground capitalize">{po.status.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredPOs.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-sm">No pending purchase orders found</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Supplier *</label>
                    <select
                      value={directSupplier}
                      onChange={e => setDirectSupplier(e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Warehouse *</label>
                    <select
                      value={directWarehouse}
                      onChange={e => setDirectWarehouse(e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} {w.is_default && '(Default)'}</option>)}
                    </select>
                  </div>

                  {directSupplier && directWarehouse && (
                    <div className="mt-4 p-4 border border-border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Enter items to receive:</p>
                      <p className="text-xs text-muted-foreground">Use the Inventory page to add products, then use Stock Movements to record direct receipts.</p>
                      <button
                        onClick={() => {
                          setError('Please add products to inventory first, then use Stock Movements for direct receipts');
                        }}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                      >
                        <Package className="w-4 h-4" />
                        Go to Inventory
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && selectedPO && !directMode && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{selectedPO.po_number}</p>
                    <p className="text-sm text-muted-foreground">{selectedPO.supplier?.name}</p>
                  </div>
                  <p className="font-bold">{formatCurrency(selectedPO.total_amount)}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium mb-3">Enter received quantities:</h4>
                <div className="space-y-2">
                  {items.map(item => {
                    const remaining = Number(item.quantity) - Number(item.received_quantity);
                    return (
                      <div key={item.id} className="p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-foreground text-sm">{item.product?.name}</p>
                            <p className="text-xs text-muted-foreground">SKU: {item.product?.sku}</p>
                          </div>
                          <p className="font-semibold">{formatCurrency(item.unit_cost)}/unit</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Ordered: {item.quantity}</span>
                              <span>Already Received: {item.received_quantity}</span>
                              <span className="font-medium text-blue-600">Remaining: {remaining}</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              value={receiveItems[item.id] || 0}
                              onChange={e => setReceiveItems({ ...receiveItems, [item.id]: Number(e.target.value) })}
                              className="w-full border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button onClick={() => setStep(1)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition">
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60"
                >
                  {saving ? 'Processing...' : <>
                    <CheckCircle className="w-4 h-4" />
                    Create GRN
                  </>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
