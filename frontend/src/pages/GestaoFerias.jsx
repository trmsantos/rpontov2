import React, { useState, useEffect, useContext, useCallback } from 'react';
import dayjs from 'dayjs';
import {
    Button, Tag, Modal, Input, Empty,
    Spin, Tabs, Badge
} from 'antd';
import {
    CheckOutlined, CloseOutlined, CalendarOutlined,
    SyncOutlined, UserOutlined
} from '@ant-design/icons';
import { fetchPost } from 'utils/fetch';
import { API_URL } from 'config';
import { AppContext } from './App';
import { LayoutContext } from './GridLayout';
import YScroll from 'components/YScroll';

const { TextArea } = Input;

const ESTADOS = {
    pendente:         { label: 'Pendente',             color: 'orange' },
    aprovado_chefe:   { label: 'Aprovado pelo Chefe',  color: 'blue'   },
    rejeitado_chefe:  { label: 'Rejeitado pelo Chefe', color: 'red'    },
    aprovado_rh:      { label: 'Aprovado por RH',      color: 'green'  },
    rejeitado_rh:     { label: 'Rejeitado por RH',     color: 'red'    },
    cancelado:        { label: 'Cancelado',            color: 'default'},
};

const TagEstado = ({ estado }) => {
    const cfg = ESTADOS[estado] || { label: estado, color: 'default' };
    return <Tag color={cfg.color} className="font-bold text-xs">{cfg.label}</Tag>;
};

const fmtData = d => d ? dayjs(d).format('DD/MM/YYYY') : '—';
const fmtDt   = d => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—';

/* ── Modal decisão ───────────────────────────────────── */
const ModalDecisao = ({ visible, pedido, tipo, onConfirm, onCancel }) => {
    const [obs,     setObs]     = useState('');
    const [loading, setLoading] = useState(false);
    useEffect(() => { if (visible) setObs(''); }, [visible]);
    const isAprovar = tipo === 'aprovar';
    const handleOk  = async () => { setLoading(true); await onConfirm(obs); setLoading(false); };
    if (!pedido) return null;
    return (
        <Modal open={visible} onCancel={onCancel} footer={null}
               title={isAprovar ? '✅ Aprovar pedido' : '❌ Rejeitar pedido'}
               destroyOnClose centered>
            <div className="space-y-4 py-2">
                <div className="bg-slate-50 rounded-xl p-3 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white
                                        flex items-center justify-center font-black text-xs">
                            {(pedido.nome || pedido.num || 'U').charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800">{pedido.nome}</span>
                        <span className="text-xs text-gray-400 font-mono">{pedido.num}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                        <CalendarOutlined className="text-indigo-400" />
                        <span className="font-semibold">
                            {fmtData(pedido.data_ini)} → {fmtData(pedido.data_fim)}
                        </span>
                        <span className="text-xs text-gray-400">({pedido.n_dias}d úteis)</span>
                    </div>
                    {pedido.obs_colab && (
                        <p className="text-xs text-gray-500 italic mt-2 border-l-2 border-gray-200 pl-2">
                            "{pedido.obs_colab}"
                        </p>
                    )}
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                        Observações{!isAprovar && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <TextArea rows={3} value={obs} onChange={e => setObs(e.target.value)}
                              placeholder={isAprovar ? 'Observações (opcional)' : 'Motivo da rejeição (obrigatório)'}
                              maxLength={500} showCount className="rounded-lg" />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                    <Button onClick={onCancel} disabled={loading}>Cancelar</Button>
                    <button onClick={handleOk}
                            disabled={loading || (!isAprovar && !obs.trim())}
                            className={`px-5 py-2 text-white font-bold rounded-lg transition-colors
                                flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed
                                ${isAprovar ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
                        {loading && <SyncOutlined spin />}
                        {isAprovar ? 'Confirmar aprovação' : 'Confirmar rejeição'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

/* ── Card ────────────────────────────────────────────── */
const CardGestao = ({ pedido, role, onAprovar, onRejeitar }) => {
    const podeAprovarChefe = role === 'chefe' && pedido.estado === 'pendente';
    const podeAprovarRH    = role === 'rh'    && pedido.estado === 'aprovado_chefe';
    return (
        <div className="bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition-all space-y-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500
                                    to-purple-600 text-white flex items-center justify-center
                                    font-black text-sm shadow shrink-0">
                        {(pedido.nome || pedido.num || 'U').charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <p className="font-black text-slate-800 text-sm leading-tight truncate max-w-[160px]">
                            {pedido.nome || pedido.num}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">
                            {pedido.num} · {pedido.dep}
                        </p>
                    </div>
                </div>
                <TagEstado estado={pedido.estado} />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <CalendarOutlined className="text-indigo-400 text-sm" />
                <span className="text-sm font-bold text-slate-700">
                    {fmtData(pedido.data_ini)} → {fmtData(pedido.data_fim)}
                </span>
                <span className="text-xs text-gray-400 ml-auto">{pedido.n_dias}d úteis</span>
            </div>
            {pedido.obs_colab && (
                <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
                    "{pedido.obs_colab}"
                </p>
            )}
            <p className="text-[10px] text-gray-400">Submetido em {fmtDt(pedido.created_at)}</p>
            {(podeAprovarChefe || podeAprovarRH) && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button onClick={() => onAprovar(pedido)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2
                                       bg-green-600 hover:bg-green-700 text-white text-xs
                                       font-bold rounded-lg transition-colors">
                        <CheckOutlined />
                        {podeAprovarRH ? 'Aprovar (RH)' : 'Aprovar'}
                    </button>
                    <button onClick={() => onRejeitar(pedido)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2
                                       bg-red-500 hover:bg-red-600 text-white text-xs
                                       font-bold rounded-lg transition-colors">
                        <CloseOutlined /> Rejeitar
                    </button>
                </div>
            )}
        </div>
    );
};

/* ═══���═══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════ */
export default function GestaoFerias() {
    const { auth }             = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);

    const isRHUser   = auth?.isRH    || false;
    const isChefeUser= auth?.isChefe || false;
    const deps_chefe = auth?.deps_chefe || [];
    const role       = isRHUser ? 'rh' : 'chefe';
    const labelRole  = isRHUser ? 'Recursos Humanos' : 'Chefe de Departamento';

    const [rows,     setRows]     = useState([]);
    const [loading,  setLoading]  = useState(false);
    const [tabAtiva, setTabAtiva] = useState(
        isRHUser ? 'aprovado_chefe' : 'pendente'
    );
    const [modal, setModal] = useState({ visible: false, pedido: null, tipo: null });

    /* ── Carregar pedidos ─────────────────────────────── */
    const loadPedidos = useCallback(async () => {
        if (!auth?.num) return;

        // ✅ Chefe sem deps → não carregar
        if (isChefeUser && !isRHUser && deps_chefe.length === 0) {
            console.warn('[GestaoFerias] chefe sem deps_chefe');
            return;
        }

        setLoading(true);
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'FeriasListar', role },
                // ✅ CORRIGIDO: passa deps_chefe, isRH, isChefe — não dep isolado
                filter: {
                    isRH:       isRHUser,
                    isChefe:    isChefeUser,
                    deps_chefe: deps_chefe,   // ← ["DPLAN"]
                }
            });
            if (r.data?.status === 'success') {
                setRows(r.data.rows || []);
            } else {
                openNotification('error', 'top', 'Erro', r.data?.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            setLoading(false);
        }
    }, [auth?.num, isRHUser, isChefeUser, deps_chefe.length]);

    useEffect(() => {
        if (auth?.num) loadPedidos();
    }, [auth?.num, deps_chefe.length]);

    /* ── Confirmar decisão ────────────────────────────── */
    const handleConfirm = async (obs) => {
        const { pedido, tipo } = modal;
        try {
            const method = role === 'chefe' ? 'FeriasAprovarChefe' : 'FeriasAprovarRH';
            const filter = { id: pedido.id, acao: tipo, obs: obs || '' };
            if (role === 'chefe') filter.chefe_num = auth.num;
            else                  filter.rh_num    = auth.num;

            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method },
                filter
            });
            if (r.data?.status === 'success') {
                openNotification('success', 'top', 'Sucesso', r.data.title);
                setModal({ visible: false, pedido: null, tipo: null });
                loadPedidos();
            } else {
                openNotification('error', 'top', 'Erro', r.data?.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        }
    };

    /* ── Filtrar por tab ──────────────────────────────── */
    const porEstado     = (e)  => rows.filter(r => r.estado === e);
    const pendentes     = porEstado('pendente');
    const aprovadoChefe = porEstado('aprovado_chefe');
    const aprovadoRH    = porEstado('aprovado_rh');
    const rejeitados    = rows.filter(r => r.estado.startsWith('rejeitado'));

    const tabItems = [
        ...(role === 'chefe' ? [{
            key:   'pendente',
            label: <Badge count={pendentes.length} size="small" offset={[6,0]}><span className="pr-2">A aguardar</span></Badge>
        }] : []),
        ...(role === 'rh' ? [{
            key:   'aprovado_chefe',
            label: <Badge count={aprovadoChefe.length} size="small" offset={[6,0]}><span className="pr-2">Aprovados pelo Chefe</span></Badge>
        }] : []),
        { key: 'aprovado_rh',  label: `Aprovados RH (${aprovadoRH.length})`  },
        { key: 'rejeitados',   label: `Rejeitados (${rejeitados.length})`     },
        { key: 'todos',        label: `Todos (${rows.length})`                },
    ];

    const rowsFiltradas =
        tabAtiva === 'todos'          ? rows          :
        tabAtiva === 'rejeitados'     ? rejeitados    :
        tabAtiva === 'aprovado_chefe' ? aprovadoChefe :
        tabAtiva === 'aprovado_rh'    ? aprovadoRH    :
        tabAtiva === 'pendente'       ? pendentes     : rows;

    return (
        <div className="p-4 bg-gray-50 min-h-screen space-y-4">

            {/* Header */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5
                            flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500
                                    to-indigo-600 flex items-center justify-center shadow">
                        <UserOutlined className="text-white text-xl" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800">Gestão de Férias</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {labelRole}
                            {/* ✅ Mostra os deps do chefe */}
                            {isChefeUser && deps_chefe.length > 0 && ` — ${deps_chefe.join(', ')}`}
                        </p>
                    </div>
                </div>
                <Button icon={<SyncOutlined />} onClick={loadPedidos}
                        loading={loading} className="font-semibold">
                    Atualizar
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: role === 'chefe' ? 'A aguardar' : 'Pend. aprovação',
                      value: role === 'chefe' ? pendentes.length : aprovadoChefe.length,
                      color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
                    { label: 'Aprovados RH',  value: aprovadoRH.length,
                      color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-100'  },
                    { label: 'Rejeitados',    value: rejeitados.length,
                      color: 'text-red-500',   bg: 'bg-red-50',    border: 'border-red-100'    },
                    { label: 'Total',         value: rows.length,
                      color: 'text-slate-600', bg: 'bg-slate-50',  border: 'border-slate-200'  },
                ].map(k => (
                    <div key={k.label} className={`${k.bg} ${k.border} border rounded-xl p-4 text-center`}>
                        <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
                        <p className="text-[11px] text-gray-500 font-semibold mt-1">{k.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs + Cards */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <Tabs activeKey={tabAtiva} onChange={setTabAtiva}
                      items={tabItems} className="px-4 pt-2" />
                <div className="p-4">
                    {loading ? (
                        <div className="flex justify-center items-center py-16">
                            <Spin size="large" />
                        </div>
                    ) : rowsFiltradas.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
                               description="Nenhum pedido neste estado" className="py-16" />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {rowsFiltradas.map(pedido => (
                                <CardGestao key={pedido.id} pedido={pedido} role={role}
                                            onAprovar={p => setModal({ visible: true, pedido: p, tipo: 'aprovar'  })}
                                            onRejeitar={p => setModal({ visible: true, pedido: p, tipo: 'rejeitar' })} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ModalDecisao
                visible={modal.visible} pedido={modal.pedido} tipo={modal.tipo}
                onConfirm={handleConfirm}
                onCancel={() => setModal({ visible: false, pedido: null, tipo: null })}
            />
        </div>
    );
}