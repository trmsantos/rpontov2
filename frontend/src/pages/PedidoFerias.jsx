import React, { useState, useEffect, useContext } from 'react';
import dayjs from 'dayjs';
import {
    DatePicker, Input, Button, Tag, Modal,
    Form, Empty, Spin, Alert, Timeline, Drawer
} from 'antd';
import {
    PlusOutlined, CalendarOutlined, ClockCircleOutlined,
    CheckCircleOutlined, StopOutlined, SyncOutlined, SendOutlined,
    SwapOutlined
} from '@ant-design/icons';
import { fetchPost } from 'utils/fetch';
import { API_URL } from 'config';
import { AppContext } from './App';
import { LayoutContext } from './GridLayout';
import YScroll from 'components/YScroll';

const { RangePicker } = DatePicker;
const { TextArea }    = Input;

const ESTADOS = {
    pendente:                { label: 'Pendente',              color: 'orange'  },
    aprovado_chefe:          { label: 'Aprovado pelo Chefe',   color: 'blue'    },
    rejeitado_chefe:         { label: 'Rejeitado pelo Chefe',  color: 'red'     },
    aprovado_rh:             { label: 'Aprovado por RH',       color: 'green'   },
    rejeitado_rh:            { label: 'Rejeitado por RH',      color: 'red'     },
    cancelado:               { label: 'Cancelado',             color: 'default' },
    pedido_cancelamento:     { label: 'Cancelamento pedido',   color: 'volcano' },
    pedido_troca:            { label: 'Troca pedida',          color: 'purple'  },
};

const TagEstado = ({ estado }) => {
    const cfg = ESTADOS[estado] || { label: estado, color: 'default' };
    return <Tag color={cfg.color} className="font-bold text-xs">{cfg.label}</Tag>;
};

const fmtData = d => d ? dayjs(d).format('DD/MM/YYYY') : '—';
const fmtDt   = d => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—';

const calcDiasUteis = (range) => {
    if (!range?.[0] || !range?.[1]) return 0;
    let count = 0;
    let curr  = range[0].clone().startOf('day');
    const fim = range[1].clone().startOf('day');
    while (curr.isBefore(fim) || curr.isSame(fim, 'day')) {
        if (curr.day() !== 0 && curr.day() !== 6) count++;
        curr = curr.add(1, 'day');
    }
    return count;
};

/* ── Timeline do fluxo ───────────────────────────────── */
const FluxoPedido = ({ pedido }) => (
    <div className="px-2 pt-2">
        <Timeline>
            <Timeline.Item color="blue" dot={<SendOutlined />}>
                <p className="text-xs font-bold text-slate-700">Pedido submetido</p>
                <p className="text-xs text-gray-400">{fmtDt(pedido.created_at)}</p>
                {pedido.obs_colab && (
                    <p className="text-xs text-gray-500 italic mt-0.5">"{pedido.obs_colab}"</p>
                )}
            </Timeline.Item>
            <Timeline.Item
                color={pedido.estado === 'rejeitado_chefe' ? 'red' : pedido.chefe_data ? 'green' : 'gray'}
            >
                <p className="text-xs font-bold text-slate-700">
                    {pedido.chefe_data
                        ? pedido.estado === 'rejeitado_chefe' ? 'Rejeitado pelo chefe' : 'Aprovado pelo chefe'
                        : 'Aguarda aprovação do chefe'}
                </p>
                {pedido.chefe_data && <p className="text-xs text-gray-400">{fmtDt(pedido.chefe_data)}</p>}
                {pedido.chefe_obs  && <p className="text-xs text-gray-500 italic mt-0.5">"{pedido.chefe_obs}"</p>}
            </Timeline.Item>
            <Timeline.Item
                color={pedido.estado === 'rejeitado_rh' ? 'red' : pedido.estado === 'aprovado_rh' ? 'green' : 'gray'}
            >
                <p className="text-xs font-bold text-slate-700">
                    {pedido.estado === 'aprovado_rh'  ? 'Aprovado pelos RH'  :
                     pedido.estado === 'rejeitado_rh' ? 'Rejeitado pelos RH' :
                     'Aguarda validação dos RH'}
                </p>
                {pedido.rh_data && <p className="text-xs text-gray-400">{fmtDt(pedido.rh_data)}</p>}
                {pedido.rh_obs  && <p className="text-xs text-gray-500 italic mt-0.5">"{pedido.rh_obs}"</p>}
            </Timeline.Item>
            {/* Pedido de cancelamento ou troca */}
            {pedido.estado === 'pedido_cancelamento' && (
                <Timeline.Item color="volcano" dot={<StopOutlined />}>
                    <p className="text-xs font-bold text-slate-700">Cancelamento pedido pelo colaborador</p>
                    <p className="text-xs text-gray-400">Aguarda decisão dos RH</p>
                    {pedido.obs_pedido_alteracao && (
                        <p className="text-xs text-gray-500 italic mt-0.5">"{pedido.obs_pedido_alteracao}"</p>
                    )}
                </Timeline.Item>
            )}
            {pedido.estado === 'pedido_troca' && (
                <Timeline.Item color="purple" dot={<SwapOutlined />}>
                    <p className="text-xs font-bold text-slate-700">Troca de datas pedida pelo colaborador</p>
                    <p className="text-xs text-gray-400">Aguarda decisão dos RH</p>
                    {pedido.nova_data_ini && (
                        <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                            Novas datas: {fmtData(pedido.nova_data_ini)} → {fmtData(pedido.nova_data_fim)}
                        </p>
                    )}
                    {pedido.obs_pedido_alteracao && (
                        <p className="text-xs text-gray-500 italic mt-0.5">"{pedido.obs_pedido_alteracao}"</p>
                    )}
                </Timeline.Item>
            )}
        </Timeline>
    </div>
);

/* ── Modal pedir cancelamento ─────────────────────────── */
const ModalPedirCancelamento = ({ visible, pedido, onConfirm, onCancel }) => {
    const [obs,     setObs]     = useState('');
    const [loading, setLoading] = useState(false);
    useEffect(() => { if (visible) setObs(''); }, [visible]);

    if (!pedido) return null;
    return (
        <Modal open={visible} onCancel={onCancel} footer={null}
               title="🚫 Pedir cancelamento de férias" destroyOnClose centered>
            <div className="space-y-4 py-2">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-amber-700">⚠️ Férias já aprovadas</p>
                    <p className="text-xs text-amber-600 mt-1">
                        Como estas férias já foram aprovadas, o seu pedido de cancelamento será enviado aos RH para decisão.
                    </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                        <CalendarOutlined className="text-indigo-400" />
                        <span className="font-semibold">
                            {fmtData(pedido.data_ini)} → {fmtData(pedido.data_fim)}
                        </span>
                        <span className="text-xs text-gray-400">({pedido.n_dias}d úteis)</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                        Motivo do cancelamento <span className="text-red-500">*</span>
                    </label>
                    <TextArea rows={3} value={obs} onChange={e => setObs(e.target.value)}
                              placeholder="Indique o motivo do cancelamento..."
                              maxLength={500} showCount className="rounded-lg" />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                    <Button onClick={onCancel} disabled={loading}>Voltar</Button>
                    <button
                        onClick={async () => { setLoading(true); await onConfirm(obs); setLoading(false); }}
                        disabled={loading || !obs.trim()}
                        className="px-5 py-2 text-white font-bold rounded-lg transition-colors
                            flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed
                            bg-red-500 hover:bg-red-600">
                        {loading && <SyncOutlined spin />}
                        Enviar pedido de cancelamento
                    </button>
                </div>
            </div>
        </Modal>
    );
};

/* ── Modal pedir troca de datas ───────────────────────── */
const ModalPedirTroca = ({ visible, pedido, onConfirm, onCancel }) => {
    const [obs,       setObs]       = useState('');
    const [novasDatas, setNovasDatas] = useState(null);
    const [novosDias,  setNovosDias]  = useState(null);
    const [loading,   setLoading]   = useState(false);
    useEffect(() => {
        if (visible) { setObs(''); setNovasDatas(null); setNovosDias(null); }
    }, [visible]);

    if (!pedido) return null;
    return (
        <Modal open={visible} onCancel={onCancel} footer={null}
               title="🔄 Pedir troca de datas" destroyOnClose centered width={480}>
            <div className="space-y-4 py-2">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-purple-700">Troca de férias aprovadas</p>
                    <p className="text-xs text-purple-600 mt-1">
                        O pedido de troca será enviado aos RH. As datas actuais mantêm-se até à aprovação.
                    </p>
                </div>

                {/* Datas actuais */}
                <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Datas actuais</p>
                    <div className="flex items-center gap-2 text-slate-600">
                        <CalendarOutlined className="text-indigo-400" />
                        <span className="font-semibold text-sm">
                            {fmtData(pedido.data_ini)} → {fmtData(pedido.data_fim)}
                        </span>
                        <span className="text-xs text-gray-400">({pedido.n_dias}d)</span>
                    </div>
                </div>

                {/* Novas datas */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                        Novas datas pretendidas <span className="text-red-500">*</span>
                    </label>
                    <RangePicker
                        format="DD/MM/YYYY"
                        style={{ width: '100%' }}
                        onChange={(v) => { setNovasDatas(v); setNovosDias(calcDiasUteis(v)); }}
                        disabledDate={d => d && d.isBefore(dayjs(), 'day')}
                        placeholder={['Nova data início', 'Nova data fim']}
                    />
                    {novosDias !== null && novosDias > 0 && (
                        <p className="text-xs text-indigo-600 font-semibold mt-1.5">
                            → {novosDias} dia{novosDias !== 1 ? 's' : ''} útil{novosDias !== 1 ? 'eis' : ''}
                        </p>
                    )}
                </div>

                {/* Motivo */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                        Motivo da troca <span className="text-red-500">*</span>
                    </label>
                    <TextArea rows={3} value={obs} onChange={e => setObs(e.target.value)}
                              placeholder="Indique o motivo da troca de datas..."
                              maxLength={500} showCount className="rounded-lg" />
                </div>

                <div className="flex gap-2 justify-end pt-1">
                    <Button onClick={onCancel} disabled={loading}>Voltar</Button>
                    <button
                        onClick={async () => {
                            setLoading(true);
                            await onConfirm(obs, novasDatas);
                            setLoading(false);
                        }}
                        disabled={loading || !obs.trim() || !novasDatas?.[0] || !novasDatas?.[1] || novosDias === 0}
                        className="px-5 py-2 text-white font-bold rounded-lg transition-colors
                            flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed
                            bg-purple-600 hover:bg-purple-700">
                        {loading && <SyncOutlined spin />}
                        Enviar pedido de troca
                    </button>
                </div>
            </div>
        </Modal>
    );
};

/* ── Card de pedido ──────────────────────────────────── */
const CardPedido = ({ pedido, authNum, onCancelar, onPedirCancelamento, onPedirTroca, onVerDetalhe }) => {
    // Cancelar directamente: só pendente ou aprovado_chefe
    const podeCancelarDirecto = pedido.num === authNum &&
        (pedido.estado === 'pendente' || pedido.estado === 'aprovado_chefe');

    // Pedir cancelamento/troca ao RH: só aprovado_rh
    const podePedirAlteracao = pedido.num === authNum && pedido.estado === 'aprovado_rh';

    // Já tem pedido pendente de alteração
    const temPedidoPendente = pedido.estado === 'pedido_cancelamento' || pedido.estado === 'pedido_troca';

    const borderClass =
        pedido.estado === 'aprovado_rh'           ? 'border-green-200  bg-green-50/30'   :
        pedido.estado.startsWith('rejeitado')     ? 'border-red-200    bg-red-50/30'     :
        pedido.estado === 'aprovado_chefe'        ? 'border-blue-200   bg-blue-50/30'    :
        pedido.estado === 'cancelado'             ? 'border-gray-200   bg-gray-50/30'    :
        pedido.estado === 'pedido_cancelamento'   ? 'border-orange-200 bg-orange-50/30'  :
        pedido.estado === 'pedido_troca'          ? 'border-purple-200 bg-purple-50/30'  :
                                                    'border-orange-200 bg-orange-50/30'  ;
    return (
        <div className={`rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${borderClass}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600
                                    flex items-center justify-center shrink-0 shadow">
                        <CalendarOutlined className="text-white text-base" />
                    </div>
                    <div>
                        <p className="font-black text-slate-800 text-sm leading-tight">
                            {fmtData(pedido.data_ini)} → {fmtData(pedido.data_fim)}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            {pedido.n_dias} dia{pedido.n_dias !== 1 ? 's' : ''} útil{pedido.n_dias !== 1 ? 'eis' : ''}
                        </p>
                    </div>
                </div>
                <TagEstado estado={pedido.estado} />
            </div>

            {/* Novas datas (se pedido_troca) */}
            {pedido.estado === 'pedido_troca' && pedido.nova_data_ini && (
                <div className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2 mb-3 border border-purple-100">
                    <SwapOutlined className="text-purple-500 text-sm" />
                    <span className="text-xs font-bold text-purple-700">
                        Novas datas: {fmtData(pedido.nova_data_ini)} → {fmtData(pedido.nova_data_fim)}
                    </span>
                </div>
            )}

            {pedido.obs_colab && (
                <p className="text-xs text-gray-500 italic mb-3 border-l-2 border-gray-200 pl-2">
                    "{pedido.obs_colab}"
                </p>
            )}
            {pedido.obs_pedido_alteracao && (
                <div className="flex items-start gap-1.5 mb-3">
                    <span className="text-[10px] font-bold text-purple-600 uppercase shrink-0 mt-0.5">Motivo:</span>
                    <span className="text-xs text-gray-600 italic">"{pedido.obs_pedido_alteracao}"</span>
                </div>
            )}
            {(pedido.chefe_obs || pedido.rh_obs) && (
                <div className="mb-3 space-y-1.5">
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
            <p className="text-[10px] text-gray-400 mb-3">Submetido em {fmtDt(pedido.created_at)}</p>

            <div className="flex gap-2 pt-2 border-t border-gray-100/80 flex-wrap">
                <button
                    onClick={() => onVerDetalhe(pedido)}
                    className="text-xs text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                >
                    Ver fluxo
                </button>

                {/* Cancelar directamente (pendente/aprovado_chefe) */}
                {podeCancelarDirecto && (
                    <button
                        onClick={() => onCancelar(pedido)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg font-semibold transition-colors ml-auto"
                    >
                        <StopOutlined /> Cancelar
                    </button>
                )}

                {/* Pedir cancelamento ou troca ao RH (aprovado_rh) */}
                {podePedirAlteracao && (
                    <>
                        <button
                            onClick={() => onPedirTroca(pedido)}
                            className="flex items-center gap-1 text-xs text-purple-600 hover:bg-purple-50 px-2.5 py-1.5 rounded-lg font-semibold transition-colors ml-auto"
                        >
                            <SwapOutlined /> Trocar datas
                        </button>
                        <button
                            onClick={() => onPedirCancelamento(pedido)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                        >
                            <StopOutlined /> Pedir cancelamento
                        </button>
                    </>
                )}

                {/* Indicação de pedido pendente */}
                {temPedidoPendente && (
                    <span className="text-[10px] text-gray-400 italic ml-auto self-center">
                        Aguarda decisão dos RH...
                    </span>
                )}
            </div>
        </div>
    );
};

/* ── Card de saldo ───────────────────────────────────── */
const CardSaldo = ({ saldo }) => {
    if (!saldo) return null;
    const percentagem = saldo.total_direito > 0
        ? Math.round((saldo.ferias_saldo / saldo.total_direito) * 100)
        : 0;
    const corBarra =
        percentagem > 50 ? 'bg-green-500'  :
        percentagem > 20 ? 'bg-amber-500'  :
                           'bg-red-500';
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-black text-slate-600 uppercase mb-4 flex items-center gap-2">
                <CalendarOutlined className="text-green-500" /> O meu saldo de férias ({saldo.ano})
            </h2>
            <div className="space-y-3">
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-4xl font-black text-slate-800">{saldo.ferias_saldo}</p>
                        <p className="text-xs text-slate-400 mt-0.5">dias disponíveis</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-500">{saldo.total_direito}</p>
                        <p className="text-[10px] text-slate-400">dias totais</p>
                    </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className={`${corBarra} h-2.5 rounded-full transition-all duration-500`}
                         style={{ width: `${percentagem}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-sm font-black text-slate-700">{saldo.dias_direito}</p>
                        <p className="text-[10px] text-slate-400">Dias base</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-sm font-black text-slate-700">{saldo.dias_ano_anterior}</p>
                        <p className="text-[10px] text-slate-400">Ano anterior</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════ */
export default function PedidoFerias() {
    const { auth }             = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);

    const [rows,       setRows]       = useState([]);
    const [saldo,      setSaldo]      = useState(null);
    const [loading,    setLoading]    = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [detalhe,    setDetalhe]    = useState(null);

    // Modais de alteração
    const [modalCancelamento, setModalCancelamento] = useState({ visible: false, pedido: null });
    const [modalTroca,        setModalTroca]        = useState({ visible: false, pedido: null });

    const [form]      = Form.useForm();
    const [dateRange, setDateRange] = useState(null);
    const [nDias,     setNDias]     = useState(null);

    /* ── Carregar pedidos ─────────────────────────────── */
    useEffect(() => {
        if (!auth?.num) return;
        const loadPedidos = async () => {
            setLoading(true);
            try {
                const r = await fetchPost({
                    url: `${API_URL}/rponto/sqlp/`,
                    withCredentials: true,
                    parameters: { method: 'FeriasListar', role: 'colaborador' },
                    filter: { num: auth.num }
                });
                if (r.data?.status === 'success') {
                    setRows(r.data.rows || []);
                } else {
                    openNotification('error', 'top', 'Erro', r.data?.title || 'Erro ao carregar');
                }
            } catch (e) {
                openNotification('error', 'top', 'Erro', e.message);
            } finally {
                setLoading(false);
            }
        };
        loadPedidos();
    }, [auth?.num]);

    /* ── Carregar saldo ───────────────────────────────── */
    const loadSaldo = async () => {
        if (!auth?.num) return;
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'FeriasSaldo' },
                filter: { num: auth.num }
            });
            if (r.data?.status === 'success' && r.data.rows?.length > 0) {
                const anoAtual = new Date().getFullYear();
                const saldoAno = r.data.rows.find(s => s.ano === anoAtual) || r.data.rows[0];
                setSaldo(saldoAno);
            }
        } catch (e) {
            console.error('[PedidoFerias] erro ao carregar saldo:', e);
        }
    };

    useEffect(() => {
        if (auth?.num) loadSaldo();
    }, [auth?.num]);

    /* ── Reload ───────────────────────────────────────── */
    const reloadPedidos = async () => {
        if (!auth?.num) return;
        setLoading(true);
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'FeriasListar', role: 'colaborador' },
                filter: { num: auth.num }
            });
            if (r.data?.status === 'success') setRows(r.data.rows || []);
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            setLoading(false);
        }
        loadSaldo();
    };

    /* ── Submeter novo pedido ─────────────────────────── */
    const onFinish = async (values) => {
        if (!auth?.num) {
            openNotification('error', 'top', 'Erro', 'Utilizador não identificado');
            return;
        }
        const [ini, fim] = values.periodo;
        const diasPedidos = calcDiasUteis([ini, fim]);

        if (saldo && diasPedidos > saldo.ferias_saldo) {
            openNotification('warning', 'top', 'Saldo insuficiente',
                `Tem ${saldo.ferias_saldo} dias disponíveis mas está a pedir ${diasPedidos}.`);
            return;
        }

        setSubmitting(true);
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'FeriasSubmeter' },
                filter: {
                    num:      auth.num,
                    dep:      auth.dep || '',
                    data_ini: ini.format('YYYY-MM-DD'),
                    data_fim: fim.format('YYYY-MM-DD'),
                    obs:      values.obs || ''
                }
            });
            if (r.data?.status === 'success') {
                openNotification('success', 'top', 'Pedido submetido!', r.data.title);
                form.resetFields();
                setDateRange(null);
                setNDias(null);
                reloadPedidos();
            } else {
                openNotification('error', 'top', 'Erro', r.data?.title || 'Erro desconhecido');
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Cancelar directamente (pendente/aprovado_chefe) ── */
    const handleCancelar = (pedido) => {
        Modal.confirm({
            title:      'Cancelar pedido?',
            content:    `Cancelar férias de ${fmtData(pedido.data_ini)} a ${fmtData(pedido.data_fim)}?`,
            okText:     'Sim, cancelar',
            okType:     'danger',
            cancelText: 'Não',
            onOk: async () => {
                try {
                    const r = await fetchPost({
                        url: `${API_URL}/rponto/sqlp/`,
                        withCredentials: true,
                        parameters: { method: 'FeriasCancelar' },
                        filter: { id: pedido.id, num: auth.num }
                    });
                    if (r.data?.status === 'success') {
                        openNotification('success', 'top', 'Cancelado', r.data.title);
                        reloadPedidos();
                    } else {
                        openNotification('error', 'top', 'Erro', r.data?.title);
                    }
                } catch (e) {
                    openNotification('error', 'top', 'Erro', e.message);
                }
            }
        });
    };

    /* ── Pedir cancelamento ao RH (aprovado_rh) ───────── */
    const handlePedirCancelamento = async (obs) => {
        const pedido = modalCancelamento.pedido;
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'FeriasPedirCancelamento' },
                filter: { id: pedido.id, num: auth.num, obs }
            });
            if (r.data?.status === 'success') {
                openNotification('success', 'top', 'Pedido enviado', r.data.title);
                setModalCancelamento({ visible: false, pedido: null });
                reloadPedidos();
            } else {
                openNotification('error', 'top', 'Erro', r.data?.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        }
    };

    /* ── Pedir troca de datas ao RH (aprovado_rh) ─────── */
    const handlePedirTroca = async (obs, novasDatas) => {
        const pedido = modalTroca.pedido;
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'FeriasPedirTroca' },
                filter: {
                    id:            pedido.id,
                    num:           auth.num,
                    obs:           obs,
                    nova_data_ini: novasDatas[0].format('YYYY-MM-DD'),
                    nova_data_fim: novasDatas[1].format('YYYY-MM-DD'),
                }
            });
            if (r.data?.status === 'success') {
                openNotification('success', 'top', 'Pedido enviado', r.data.title);
                setModalTroca({ visible: false, pedido: null });
                reloadPedidos();
            } else {
                openNotification('error', 'top', 'Erro', r.data?.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        }
    };

    /* ── KPIs ─────────────────────────────────────────── */
    const pendentes  = rows.filter(r => r.estado === 'pendente').length;
    const aprovados  = rows.filter(r => r.estado === 'aprovado_rh').length;
    const rejeitados = rows.filter(r => r.estado.startsWith('rejeitado')).length;

    return (
        <div className="p-4 space-y-4 bg-gray-50 min-h-screen">

            {/* Título */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow">
                    <CalendarOutlined className="text-white text-xl" />
                </div>
                <div>
                    <h1 className="text-lg font-black text-slate-800">Pedido de Férias</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Submeta o seu pedido — será aprovado pelo chefe e depois pelos RH
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                {/* ── Coluna esquerda ── */}
                <div className="lg:col-span-2 space-y-4">
                    <CardSaldo saldo={saldo} />

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h2 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
                            <PlusOutlined className="text-indigo-500" /> Novo pedido
                        </h2>
                        <Form form={form} layout="vertical" onFinish={onFinish} className="space-y-1">
                            <Form.Item
                                name="periodo"
                                label={<span className="text-xs font-bold text-gray-600 uppercase">Período de férias *</span>}
                                rules={[{ required: true, message: 'Selecione o período' }]}
                            >
                                <RangePicker
                                    format="DD/MM/YYYY"
                                    style={{ width: '100%' }}
                                    onChange={(v) => { setDateRange(v); setNDias(calcDiasUteis(v)); }}
                                    disabledDate={d => d && d.isBefore(dayjs(), 'day')}
                                    placeholder={['Data início', 'Data fim']}
                                />
                            </Form.Item>

                            {nDias !== null && (
                                <Alert
                                    message={
                                        nDias === 0
                                            ? 'Nenhum dia útil no período selecionado'
                                            : saldo && nDias > saldo.ferias_saldo
                                                ? <><strong>{nDias}</strong> dias — <span className="text-red-600 font-bold">excede o saldo ({saldo.ferias_saldo}d)</span></>
                                                : <><strong>{nDias}</strong> dia{nDias !== 1 ? 's' : ''} útil{nDias !== 1 ? 'eis' : ''} de férias</>
                                    }
                                    type={nDias === 0 ? 'warning' : saldo && nDias > saldo.ferias_saldo ? 'error' : 'success'}
                                    showIcon className="rounded-lg mb-3"
                                />
                            )}

                            <Form.Item
                                name="obs"
                                label={<span className="text-xs font-bold text-gray-600 uppercase">Observações (opcional)</span>}
                            >
                                <TextArea rows={3} maxLength={500} showCount placeholder="Ex: Férias de verão..." className="rounded-lg" />
                            </Form.Item>

                            <Button
                                type="primary" htmlType="submit"
                                loading={submitting}
                                disabled={nDias === 0 || (saldo && nDias > saldo.ferias_saldo)}
                                icon={<SendOutlined />} block size="large"
                                className="bg-indigo-600 hover:bg-indigo-700 border-none font-bold rounded-xl mt-2"
                            >
                                Submeter pedido
                            </Button>
                        </Form>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h2 className="text-xs font-black text-slate-600 uppercase mb-3">Como funciona?</h2>
                        <Timeline className="mt-2">
                            <Timeline.Item color="blue" dot={<SendOutlined />}>
                                <p className="text-xs font-bold text-slate-700">Submete o pedido</p>
                                <p className="text-[11px] text-gray-400">Indica as datas e observações</p>
                            </Timeline.Item>
                            <Timeline.Item color="orange" dot={<ClockCircleOutlined />}>
                                <p className="text-xs font-bold text-slate-700">Chefe de departamento avalia</p>
                                <p className="text-[11px] text-gray-400">Aprova ou rejeita o pedido</p>
                            </Timeline.Item>
                            <Timeline.Item color="green" dot={<CheckCircleOutlined />}>
                                <p className="text-xs font-bold text-slate-700">Recursos Humanos valida</p>
                                <p className="text-[11px] text-gray-400">Confirmação final e registo</p>
                            </Timeline.Item>
                        </Timeline>
                    </div>

                    {rows.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: 'Pendentes',  value: pendentes,  color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
                                { label: 'Aprovados',  value: aprovados,  color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100'  },
                                { label: 'Rejeitados', value: rejeitados, color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100'    },
                            ].map(k => (
                                <div key={k.label} className={`${k.bg} ${k.border} border rounded-xl p-3 text-center`}>
                                    <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
                                    <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{k.label}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Coluna direita — Histórico ── */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                            <h2 className="text-sm font-black text-slate-700 flex items-center gap-2">
                                <ClockCircleOutlined className="text-slate-400" />
                                Os meus pedidos
                                <span className="text-xs font-normal text-gray-400">({rows.length})</span>
                            </h2>
                            <button
                                onClick={reloadPedidos} disabled={loading}
                                className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1 font-semibold transition-colors"
                            >
                                <SyncOutlined spin={loading} /> Atualizar
                            </button>
                        </div>
                        <div className="p-4">
                            {loading ? (
                                <div className="flex justify-center items-center py-16"><Spin size="large" /></div>
                            ) : rows.length === 0 ? (
                                <div className="py-16">
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
                                           description={<span className="text-gray-400 text-sm">Ainda não submeteu nenhum pedido de férias</span>} />
                                </div>
                            ) : (
                                <YScroll style={{ maxHeight: 'calc(100vh - 320px)' }}>
                                    <div className="space-y-3">
                                        {rows.map(pedido => (
                                            <CardPedido
                                                key={pedido.id}
                                                pedido={pedido}
                                                authNum={auth?.num}
                                                onCancelar={handleCancelar}
                                                onPedirCancelamento={p => setModalCancelamento({ visible: true, pedido: p })}
                                                onPedirTroca={p => setModalTroca({ visible: true, pedido: p })}
                                                onVerDetalhe={setDetalhe}
                                            />
                                        ))}
                                    </div>
                                </YScroll>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drawer detalhe */}
            <Drawer
                title={<div className="flex items-center gap-2"><CalendarOutlined className="text-green-500" /><span className="font-black">Estado do pedido</span></div>}
                width={420} open={!!detalhe} onClose={() => setDetalhe(null)} destroyOnClose
            >
                {detalhe && (
                    <div className="p-2 space-y-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow">
                                    <CalendarOutlined className="text-white" />
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 text-sm">
                                        {fmtData(detalhe.data_ini)} → {fmtData(detalhe.data_fim)}
                                    </p>
                                    <p className="text-xs text-gray-400">{detalhe.n_dias} dias úteis</p>
                                </div>
                            </div>
                            <TagEstado estado={detalhe.estado} />
                        </div>
                        <FluxoPedido pedido={detalhe} />
                    </div>
                )}
            </Drawer>

            {/* Modal pedir cancelamento */}
            <ModalPedirCancelamento
                visible={modalCancelamento.visible}
                pedido={modalCancelamento.pedido}
                onConfirm={handlePedirCancelamento}
                onCancel={() => setModalCancelamento({ visible: false, pedido: null })}
            />

            {/* Modal pedir troca */}
            <ModalPedirTroca
                visible={modalTroca.visible}
                pedido={modalTroca.pedido}
                onConfirm={handlePedirTroca}
                onCancel={() => setModalTroca({ visible: false, pedido: null })}
            />
        </div>
    );
}