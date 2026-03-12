import React, { useState, useEffect, useContext } from 'react';
import dayjs from 'dayjs';
import {
    Button, Tag, Modal, Input, Empty,
    Spin, Tabs, Badge, Drawer
} from 'antd';
import {
    CheckOutlined, CloseOutlined, CalendarOutlined,
    SyncOutlined, UserOutlined, StopOutlined,
    EyeOutlined, SwapOutlined
} from '@ant-design/icons';
import { fetchPost } from 'utils/fetch';
import { API_URL } from 'config';
import { AppContext } from './App';
import { LayoutContext } from './GridLayout';
import YScroll from 'components/YScroll';

const { TextArea } = Input;

const ESTADOS = {
    pendente:              { label: 'Pendente',             color: 'orange'  },
    aprovado_chefe:        { label: 'Aprovado pelo Chefe',  color: 'blue'    },
    rejeitado_chefe:       { label: 'Rejeitado pelo Chefe', color: 'red'     },
    aprovado_rh:           { label: 'Aprovado por RH',      color: 'green'   },
    rejeitado_rh:          { label: 'Rejeitado por RH',     color: 'red'     },
    cancelado:             { label: 'Cancelado',            color: 'default' },
    pedido_cancelamento:   { label: 'Cancelamento pedido',  color: 'volcano' },
    pedido_troca:          { label: 'Troca pedida',         color: 'purple'  },
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

    const config = {
        aprovar:             { title: '✅ Aprovar pedido',            btnClass: 'bg-green-600 hover:bg-green-700', btnLabel: 'Confirmar aprovação',       obsRequired: false },
        rejeitar:            { title: '❌ Rejeitar pedido',            btnClass: 'bg-red-500 hover:bg-red-600',     btnLabel: 'Confirmar rejeição',       obsRequired: true  },
        cancelar:            { title: '🚫 Cancelar férias',            btnClass: 'bg-gray-600 hover:bg-gray-700',   btnLabel: 'Confirmar cancelamento',   obsRequired: true  },
        aprovar_cancelamento:{ title: '✅ Aprovar cancelamento',       btnClass: 'bg-green-600 hover:bg-green-700', btnLabel: 'Aprovar cancelamento',     obsRequired: false },
        rejeitar_cancelamento:{ title: '❌ Rejeitar cancelamento',     btnClass: 'bg-red-500 hover:bg-red-600',     btnLabel: 'Rejeitar cancelamento',    obsRequired: true  },
        aprovar_troca:       { title: '✅ Aprovar troca de datas',     btnClass: 'bg-purple-600 hover:bg-purple-700', btnLabel: 'Aprovar troca',          obsRequired: false },
        rejeitar_troca:      { title: '❌ Rejeitar troca de datas',    btnClass: 'bg-red-500 hover:bg-red-600',     btnLabel: 'Rejeitar troca',           obsRequired: true  },
    };
    const cfg = config[tipo] || config.aprovar;

    const handleOk = async () => { setLoading(true); await onConfirm(obs); setLoading(false); };
    if (!pedido) return null;

    return (
        <Modal open={visible} onCancel={onCancel} footer={null}
               title={cfg.title} destroyOnClose centered>
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

                {/* Info extra para cancelamento */}
                {(tipo === 'aprovar_cancelamento' || tipo === 'rejeitar_cancelamento') && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-xs font-bold text-orange-700">📋 Motivo do colaborador:</p>
                        <p className="text-xs text-orange-600 mt-1 italic">
                            "{pedido.obs_pedido_alteracao || 'Sem motivo indicado'}"
                        </p>
                    </div>
                )}

                {/* Info extra para troca */}
                {(tipo === 'aprovar_troca' || tipo === 'rejeitar_troca') && (
                    <>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-purple-700">📋 Motivo do colaborador:</p>
                            <p className="text-xs text-purple-600 mt-1 italic">
                                "{pedido.obs_pedido_alteracao || 'Sem motivo indicado'}"
                            </p>
                        </div>
                        {pedido.nova_data_ini && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                <p className="text-xs font-bold text-indigo-700">🔄 Novas datas pretendidas:</p>
                                <p className="text-sm font-bold text-indigo-800 mt-1">
                                    {fmtData(pedido.nova_data_ini)} → {fmtData(pedido.nova_data_fim)}
                                </p>
                            </div>
                        )}
                    </>
                )}

                {tipo === 'aprovar_cancelamento' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-bold text-amber-700">⚠️ Atenção</p>
                        <p className="text-xs text-amber-600 mt-1">
                            Ao aprovar, as férias serão canceladas e os {pedido.n_dias} dias devolvidos ao saldo.
                        </p>
                    </div>
                )}

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                        Observações{cfg.obsRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <TextArea rows={3} value={obs} onChange={e => setObs(e.target.value)}
                              placeholder={cfg.obsRequired ? 'Motivo (obrigatório)' : 'Observações (opcional)'}
                              maxLength={500} showCount className="rounded-lg" />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                    <Button onClick={onCancel} disabled={loading}>Voltar</Button>
                    <button onClick={handleOk}
                            disabled={loading || (cfg.obsRequired && !obs.trim())}
                            className={`px-5 py-2 text-white font-bold rounded-lg transition-colors
                                flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed
                                ${cfg.btnClass}`}>
                        {loading && <SyncOutlined spin />}
                        {cfg.btnLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

/* ── Card ────────────────────────────────────────────── */
const CardGestao = ({ pedido, role, onAprovar, onRejeitar, onCancelar, onDecidirAlteracao }) => {
    const podeAprovarChefe = role === 'chefe' && pedido.estado === 'pendente';
    const podeAprovarRH    = role === 'rh'    && pedido.estado === 'aprovado_chefe';
    const podeCancelarRH   = role === 'rh'    && ['pendente', 'aprovado_chefe', 'aprovado_rh'].includes(pedido.estado);

    // Novos: RH decide sobre pedido de cancelamento ou troca
    const temPedidoCancelamento = role === 'rh' && pedido.estado === 'pedido_cancelamento';
    const temPedidoTroca        = role === 'rh' && pedido.estado === 'pedido_troca';

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

            {/* Novas datas pretendidas (troca) */}
            {pedido.estado === 'pedido_troca' && pedido.nova_data_ini && (
                <div className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                    <SwapOutlined className="text-purple-500 text-sm" />
                    <span className="text-xs font-bold text-purple-700">
                        Novas datas: {fmtData(pedido.nova_data_ini)} → {fmtData(pedido.nova_data_fim)}
                    </span>
                </div>
            )}

            {/* Motivo do colaborador (cancelamento/troca) */}
            {pedido.obs_pedido_alteracao && (
                <div className="flex items-start gap-1.5 bg-orange-50 rounded-lg px-3 py-2 border border-orange-100">
                    <span className="text-[10px] font-bold text-orange-600 uppercase shrink-0 mt-0.5">Motivo:</span>
                    <span className="text-xs text-orange-700 italic">"{pedido.obs_pedido_alteracao}"</span>
                </div>
            )}

            {pedido.obs_colab && (
                <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
                    "{pedido.obs_colab}"
                </p>
            )}
            {(pedido.chefe_obs || pedido.rh_obs) && (
                <div className="space-y-1">
                    {pedido.chefe_obs && (
                        <div className="flex items-start gap-1.5">
                            <span className="text-[10px] font-bold text-blue-500 uppercase shrink-0 mt-0.5">Chefe:</span>
                            <span className="text-xs text-gray-600 italic">"{pedido.chefe_obs}"</span>
                        </div>
                    )}
                    {pedido.rh_obs && (
                        <div className="flex items-start gap-1.5">
                            <span className="text-[10px] font-bold text-green-600 uppercase shrink-0 mt-0.5">RH:</span>
                            <span className="text-xs text-gray-600 italic">"{pedido.rh_obs}"</span>
                        </div>
                    )}
                </div>
            )}
            <p className="text-[10px] text-gray-400">Submetido em {fmtDt(pedido.created_at)}</p>

            {/* ── Botões de acção ── */}
            <div className="flex gap-2 pt-2 border-t border-gray-100 flex-wrap">

                {/* Aprovar/Rejeitar normal (chefe ou RH) */}
                {(podeAprovarChefe || podeAprovarRH) && (
                    <>
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
                    </>
                )}

                {/* Decidir pedido de CANCELAMENTO */}
                {temPedidoCancelamento && (
                    <>
                        <button onClick={() => onDecidirAlteracao(pedido, 'aprovar_cancelamento')}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2
                                           bg-green-600 hover:bg-green-700 text-white text-xs
                                           font-bold rounded-lg transition-colors">
                            <CheckOutlined /> Aprovar cancelamento
                        </button>
                        <button onClick={() => onDecidirAlteracao(pedido, 'rejeitar_cancelamento')}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2
                                           bg-red-500 hover:bg-red-600 text-white text-xs
                                           font-bold rounded-lg transition-colors">
                            <CloseOutlined /> Rejeitar
                        </button>
                    </>
                )}

                {/* Decidir pedido de TROCA */}
                {temPedidoTroca && (
                    <>
                        <button onClick={() => onDecidirAlteracao(pedido, 'aprovar_troca')}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2
                                           bg-purple-600 hover:bg-purple-700 text-white text-xs
                                           font-bold rounded-lg transition-colors">
                            <SwapOutlined /> Aprovar troca
                        </button>
                        <button onClick={() => onDecidirAlteracao(pedido, 'rejeitar_troca')}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2
                                           bg-red-500 hover:bg-red-600 text-white text-xs
                                           font-bold rounded-lg transition-colors">
                            <CloseOutlined /> Rejeitar
                        </button>
                    </>
                )}

                {/* Cancelar directamente (RH, férias aprovadas sem pedido) */}
                {podeCancelarRH && !(podeAprovarChefe || podeAprovarRH) && (
                    <button onClick={() => onCancelar(pedido)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2
                                       bg-gray-500 hover:bg-gray-600 text-white text-xs
                                       font-bold rounded-lg transition-colors">
                        <StopOutlined /> Cancelar férias
                    </button>
                )}
                {podeCancelarRH && (podeAprovarChefe || podeAprovarRH) && (
                    <button onClick={() => onCancelar(pedido)}
                            className="flex items-center justify-center gap-1 py-2 px-3
                                       bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs
                                       font-semibold rounded-lg transition-colors"
                            title="Cancelar férias">
                        <StopOutlined />
                    </button>
                )}
            </div>
        </div>
    );
};

/* ── Drawer saldo ─────────────────────────────────────── */
const DrawerSaldos = ({ visible, onClose, saldos, loadingSaldos }) => (
    <Drawer
        title={<div className="flex items-center gap-2">
            <CalendarOutlined className="text-green-500" />
            <span className="font-black">Saldo de Férias — Todos</span>
        </div>}
        width={480} open={visible} onClose={onClose} destroyOnClose
    >
        <div className="space-y-3">
            {loadingSaldos ? (
                <div className="flex justify-center py-16"><Spin size="large" /></div>
            ) : saldos.length === 0 ? (
                <Empty description="Nenhum colaborador com saldo registado" />
            ) : (
                saldos.map(s => {
                    const pct = s.total_direito > 0
                        ? Math.round((s.ferias_saldo / s.total_direito) * 100) : 0;
                    const cor = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
                    return (
                        <div key={`${s.num}-${s.ano}`} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600
                                                    text-white flex items-center justify-center font-black text-xs shadow">
                                        {(s.nome || s.num || 'U').charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{s.nome || s.num}</p>
                                        <p className="text-[10px] text-gray-400 font-mono">{s.num}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xl font-black ${s.ferias_saldo <= 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                        {s.ferias_saldo}
                                    </p>
                                    <p className="text-[10px] text-gray-400">de {s.total_direito}</p>
                                </div>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div className={`${cor} h-1.5 rounded-full transition-all`}
                                     style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                            </div>
                            <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
                                <span>Base: {s.dias_direito}d</span>
                                <span>Anterior: {s.dias_ano_anterior}d</span>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    </Drawer>
);

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════ */
export default function GestaoFerias() {
    const { auth, authLoading }    = useContext(AppContext);
    const { openNotification }     = useContext(LayoutContext);

    const isRHUser    = auth?.isRH    || false;
    const isChefeUser = auth?.isChefe || false;
    const deps_chefe  = auth?.deps_chefe || [];
    const role        = isRHUser ? 'rh' : 'chefe';
    const labelRole   = isRHUser ? 'Recursos Humanos' : 'Chefe de Departamento';

    const [rows,     setRows]     = useState([]);
    const [loading,  setLoading]  = useState(false);
    const [tabAtiva, setTabAtiva] = useState(
        isRHUser ? 'aprovado_chefe' : 'pendente'
    );
    const [modal, setModal] = useState({ visible: false, pedido: null, tipo: null });

    const [showSaldos,    setShowSaldos]    = useState(false);
    const [saldos,        setSaldos]        = useState([]);
    const [loadingSaldos, setLoadingSaldos] = useState(false);

    const loadPedidos = async () => {
            if (!isRHUser && !isChefeUser) return;
            setLoading(true);
            try {
                const r = await fetchPost({
                    url: `${API_URL}/rponto/sqlp/`,
                    withCredentials: true,
                    parameters: { method: 'FeriasListar', role },
                    filter: {
                        isRH:       isRHUser,
                        isChefe:    isChefeUser,
                        deps_chefe: deps_chefe,
                        // num NÃO é enviado por defeito
                        // RH vê tudo (sem filtro de num)
                        // Chefe vê tudo do seu dep (filtrado por deps_chefe no backend)
                    }
                });
                if (r.data?.status === 'success') setRows(r.data.rows || []);
                else openNotification('error', 'top', 'Erro', r.data?.title);
            } catch (e) {
                openNotification('error', 'top', 'Erro', e.message);
            } finally {
                setLoading(false);
            }
    };

    useEffect(() => {
        if (authLoading) return;
        if (isRHUser || (isChefeUser && auth?.num)) loadPedidos();
    }, [authLoading, auth?.num, auth?.isRH, auth?.isChefe]);

    /* ── Carregar saldos ──────────────────────────────── */
    const loadSaldos = async () => {
        setLoadingSaldos(true);
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'FeriasSaldo' },
                filter: {}
            });
            if (r.data?.status === 'success') setSaldos(r.data.rows || []);
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            setLoadingSaldos(false);
        }
    };

    /* ── Confirmar decisão ────────────────────────────── */
    const handleConfirm = async (obs) => {
        const { pedido, tipo } = modal;
        try {
            let method, filter;

            if (tipo === 'cancelar') {
                method = 'FeriasCancelarRH';
                filter = { id: pedido.id, rh_num: auth?.num || '', obs };
            } else if (tipo === 'aprovar_cancelamento' || tipo === 'rejeitar_cancelamento' ||
                       tipo === 'aprovar_troca' || tipo === 'rejeitar_troca') {
                method = 'FeriasDecidirAlteracao';
                const acao = tipo.startsWith('aprovar') ? 'aprovar' : 'rejeitar';
                filter = { id: pedido.id, acao, rh_num: auth?.num || '', obs };
            } else if (role === 'chefe') {
                method = 'FeriasAprovarChefe';
                filter = { id: pedido.id, acao: tipo, obs, chefe_num: auth.num };
            } else {
                method = 'FeriasAprovarRH';
                filter = { id: pedido.id, acao: tipo, obs, rh_num: auth?.num || '' };
            }

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

    /* ── Filtrar por tab ────────────────────────��─────── */
    const porEstado        = (e) => rows.filter(r => r.estado === e);
    const pendentes        = porEstado('pendente');
    const aprovadoChefe    = porEstado('aprovado_chefe');
    const aprovadoRH       = porEstado('aprovado_rh');
    const rejeitados       = rows.filter(r => r.estado.startsWith('rejeitado'));
    const cancelados       = porEstado('cancelado');
    const pedidosAlteracao = rows.filter(r => r.estado === 'pedido_cancelamento' || r.estado === 'pedido_troca');

    const tabItems = [
        ...(role === 'chefe' ? [{
            key: 'pendente',
            label: <Badge count={pendentes.length} size="small" offset={[6,0]}><span className="pr-2">A aguardar</span></Badge>
        }] : []),
        ...(role === 'rh' ? [{
            key: 'aprovado_chefe',
            label: <Badge count={aprovadoChefe.length} size="small" offset={[6,0]}><span className="pr-2">Aprovados pelo Chefe</span></Badge>
        }] : []),
        ...(role === 'rh' ? [{
            key: 'alteracoes',
            label: <Badge count={pedidosAlteracao.length} size="small" offset={[6,0]}>
                <span className="pr-2">Cancelamentos/Trocas</span>
            </Badge>
        }] : []),
        { key: 'aprovado_rh',  label: `Aprovados RH (${aprovadoRH.length})`  },
        { key: 'rejeitados',   label: `Rejeitados (${rejeitados.length})`     },
        { key: 'cancelados',   label: `Cancelados (${cancelados.length})`     },
        { key: 'todos',        label: `Todos (${rows.length})`                },
    ];

    const rowsFiltradas =
        tabAtiva === 'todos'          ? rows             :
        tabAtiva === 'rejeitados'     ? rejeitados       :
        tabAtiva === 'cancelados'     ? cancelados       :
        tabAtiva === 'aprovado_chefe' ? aprovadoChefe    :
        tabAtiva === 'aprovado_rh'    ? aprovadoRH       :
        tabAtiva === 'pendente'       ? pendentes        :
        tabAtiva === 'alteracoes'     ? pedidosAlteracao  : rows;

    if (authLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Spin size="large" /></div>;
    }

    if (!isRHUser && !isChefeUser) {
        return <div className="flex items-center justify-center min-h-screen">
            <Empty description="Sem permissões para aceder a esta página." />
        </div>;
    }

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
                            {isChefeUser && deps_chefe.length > 0 && ` — ${deps_chefe.join(', ')}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isRHUser && (
                        <Button icon={<EyeOutlined />} onClick={() => { setShowSaldos(true); loadSaldos(); }}
                                className="font-semibold">
                            Ver saldos
                        </Button>
                    )}
                    <Button icon={<SyncOutlined />} onClick={loadPedidos}
                            loading={loading} className="font-semibold">
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className={`grid gap-3 ${isRHUser ? 'grid-cols-2 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-5'}`}>
                {[
                    { label: role === 'chefe' ? 'A aguardar' : 'Pend. aprovação',
                      value: role === 'chefe' ? pendentes.length : aprovadoChefe.length,
                      color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
                    ...(isRHUser ? [{
                      label: 'Cancel./Trocas', value: pedidosAlteracao.length,
                      color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' }] : []),
                    { label: 'Aprovados RH',  value: aprovadoRH.length,
                      color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-100'  },
                    { label: 'Rejeitados',    value: rejeitados.length,
                      color: 'text-red-500',   bg: 'bg-red-50',    border: 'border-red-100'    },
                    { label: 'Cancelados',    value: cancelados.length,
                      color: 'text-gray-500',  bg: 'bg-gray-50',   border: 'border-gray-200'   },
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
                        <div className="flex justify-center items-center py-16"><Spin size="large" /></div>
                    ) : rowsFiltradas.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
                               description="Nenhum pedido neste estado" className="py-16" />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {rowsFiltradas.map(pedido => (
                                <CardGestao key={pedido.id} pedido={pedido} role={role}
                                    onAprovar={p  => setModal({ visible: true, pedido: p, tipo: 'aprovar'  })}
                                    onRejeitar={p => setModal({ visible: true, pedido: p, tipo: 'rejeitar' })}
                                    onCancelar={p => setModal({ visible: true, pedido: p, tipo: 'cancelar' })}
                                    onDecidirAlteracao={(p, tipo) => setModal({ visible: true, pedido: p, tipo })}
                                />
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

            <DrawerSaldos
                visible={showSaldos} onClose={() => setShowSaldos(false)}
                saldos={saldos} loadingSaldos={loadingSaldos}
            />
        </div>
    );
}