import React, { useState, useEffect, useContext, useCallback } from 'react';
import dayjs from 'dayjs';
import {
    Button, Tag, Modal, Input, Form, Select,
    Empty, Spin, Drawer, Alert, Divider, Badge,
    DatePicker, Tabs, Timeline, Avatar
} from 'antd';
import {
    SwapOutlined, CheckOutlined, CloseOutlined,
    ClockCircleOutlined, UserOutlined, SendOutlined,
    SyncOutlined, CalendarOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { fetchPost } from 'utils/fetch';
import { API_URL } from 'config';
import { AppContext } from './App';
import { LayoutContext } from './GridLayout';
import YScroll from 'components/YScroll';

const { TextArea } = Input;

// ── Estados possíveis ──────────────────────────────────────────
const ESTADOS = {
    pendente:         { label: 'Aguarda resposta',    color: 'orange' },
    aceite_dest:      { label: 'Aceite — aguarda chefe', color: 'blue' },
    aprovado_chefe:   { label: 'Aprovado',            color: 'green'  },
    rejeitado_dest:   { label: 'Recusado pelo colega', color: 'red'   },
    rejeitado_chefe:  { label: 'Rejeitado pelo chefe', color: 'red'   },
    cancelado:        { label: 'Cancelado',           color: 'default'},
};

const TagEstado = ({ estado }) => {
    const cfg = ESTADOS[estado] || { label: estado, color: 'default' };
    return <Tag color={cfg.color} className="font-bold text-xs">{cfg.label}</Tag>;
};

const fmtData  = d => d ? dayjs(d).format('DD/MM/YYYY') : '—';
const fmtDt    = d => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—';

// ── Cores por turno ────────────────────────────────────────────
const TURNO_COLORS = {
    MAN: { bg: 'bg-green-50',  text: 'text-green-700',  ring: 'ring-green-200',  hex: '#059669' },
    TAR: { bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-200',  hex: '#D97706' },
    NOI: { bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-200',   hex: '#1E40AF' },
    DSC: { bg: 'bg-gray-50',   text: 'text-gray-500',   ring: 'ring-gray-200',   hex: '#6B7280' },
    GER: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-200', hex: '#F59E0B' },
    REF: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', hex: '#FBBF24' },
    FER: { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-200', hex: '#9333EA' },
};

const TurnoBadge = ({ sigla }) => {
    const cfg = TURNO_COLORS[sigla] || TURNO_COLORS.DSC;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg
                          text-[11px] font-bold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
            <span className={`w-1.5 h-1.5 rounded-full`}
                  style={{ backgroundColor: cfg.hex }} />
            {sigla}
        </span>
    );
};

// ══════════════════════════════════════════════════════════════
// DRAWER: Detalhe de uma troca
// ══════════════════════════════════════════════════════════════
const DrawerDetalhe = ({ troca, open, onClose, authNum, isChefe, onRefresh }) => {
    const { openNotification } = useContext(LayoutContext);
    const [obs, setObs]         = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => { if (open) setObs(''); }, [open]);

    if (!troca) return null;

    const souRequerente = troca.num_req === authNum;
    const souDestino    = troca.num_dest === authNum;
    const podeAceitar   = souDestino   && troca.estado === 'pendente';
    const podeCancelar  = souRequerente && troca.estado === 'pendente';
    const podeAprovar   = isChefe && troca.estado === 'aceite_dest';

    const action = async (method, extraFilter) => {
        setLoading(true);
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method },
                filter: { ...extraFilter, obs }
            });
            if (r.data?.status === 'success') {
                openNotification('success', 'top', 'Sucesso', r.data.title);
                onRefresh();
                onClose();
            } else {
                openNotification('error', 'top', 'Erro', r.data?.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Drawer
            title={
                <div className="flex items-center gap-2">
                    <SwapOutlined className="text-indigo-500" />
                    <span className="font-black">Troca #{troca.id}</span>
                    <TagEstado estado={troca.estado} />
                </div>
            }
            width={480}
            open={open}
            onClose={onClose}
            destroyOnClose
            footer={
                <div className="flex gap-2 justify-end p-2">
                    {podeCancelar && (
                        <Button
                            danger
                            icon={<CloseOutlined />}
                            loading={loading}
                            onClick={() => action('TrocasCancelar', { id: troca.id, num_req: authNum })}
                        >
                            Cancelar pedido
                        </Button>
                    )}
                    {podeAceitar && (
                        <>
                            <Button
                                danger
                                icon={<CloseOutlined />}
                                loading={loading}
                                onClick={() => action('TrocasResponderDest', {
                                    id: troca.id, num_dest: authNum, acao: 'recusar'
                                })}
                            >
                                Recusar
                            </Button>
                            <Button
                                type="primary"
                                icon={<CheckOutlined />}
                                loading={loading}
                                className="bg-green-600 border-none hover:bg-green-700"
                                onClick={() => action('TrocasResponderDest', {
                                    id: troca.id, num_dest: authNum, acao: 'aceitar'
                                })}
                            >
                                Aceitar troca
                            </Button>
                        </>
                    )}
                    {podeAprovar && (
                        <>
                            <Button
                                danger
                                icon={<CloseOutlined />}
                                loading={loading}
                                onClick={() => {
                                    if (!obs.trim()) {
                                        openNotification('warning', 'top', 'Atenção', 'Indique o motivo da rejeição');
                                        return;
                                    }
                                    action('TrocasAprovarChefe', {
                                        id: troca.id, chefe_num: authNum, acao: 'rejeitar'
                                    });
                                }}
                            >
                                Rejeitar
                            </Button>
                            <Button
                                type="primary"
                                icon={<CheckOutlined />}
                                loading={loading}
                                className="bg-green-600 border-none hover:bg-green-700"
                                onClick={() => action('TrocasAprovarChefe', {
                                    id: troca.id, chefe_num: authNum, acao: 'aprovar'
                                })}
                            >
                                Aprovar troca
                            </Button>
                        </>
                    )}
                </div>
            }
        >
            <YScroll>
                <div className="space-y-4 p-1">

                    {/* ── Resumo da troca ── */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        {/* Requerente */}
                        <div className="flex items-center gap-3">
                            <Avatar
                                size={40}
                                icon={<UserOutlined />}
                                className="bg-indigo-600 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">
                                    {troca.nome_req || troca.num_req}
                                </p>
                                <p className="text-xs text-slate-400">{troca.num_req} · {troca.dep_req}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 mb-1">{fmtData(troca.data_req)}</p>
                                <TurnoBadge sigla={troca.turno_req} />
                            </div>
                        </div>

                        {/* Ícone de troca */}
                        <div className="flex items-center justify-center">
                            <div className="flex items-center gap-2 bg-white border border-slate-200
                                            rounded-full px-4 py-1.5 text-xs font-bold text-indigo-600">
                                <SwapOutlined />
                                troca com
                            </div>
                        </div>

                        {/* Destino */}
                        <div className="flex items-center gap-3">
                            <Avatar
                                size={40}
                                icon={<UserOutlined />}
                                className="bg-purple-600 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">
                                    {troca.nome_dest || troca.num_dest}
                                </p>
                                <p className="text-xs text-slate-400">{troca.num_dest} · {troca.dep_dest}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 mb-1">{fmtData(troca.data_dest)}</p>
                                <TurnoBadge sigla={troca.turno_dest} />
                            </div>
                        </div>
                    </div>

                    {/* ── Observação do requerente ── */}
                    {troca.obs_req && (
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                                Motivo do pedido
                            </p>
                            <p className="text-sm text-slate-700 italic">"{troca.obs_req}"</p>
                        </div>
                    )}

                    {/* ── Timeline do fluxo ── */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">
                            Fluxo de aprovação
                        </p>
                        <Timeline>
                            <Timeline.Item color="blue" dot={<SendOutlined />}>
                                <p className="text-xs font-bold text-slate-700">Pedido submetido</p>
                                <p className="text-xs text-gray-400">{fmtDt(troca.created_at)}</p>
                            </Timeline.Item>
                            <Timeline.Item
                                color={
                                    troca.estado === 'rejeitado_dest' ? 'red' :
                                    troca.dest_data ? 'green' : 'gray'
                                }
                            >
                                <p className="text-xs font-bold text-slate-700">
                                    {troca.estado === 'rejeitado_dest'
                                        ? 'Recusado pelo colega'
                                        : troca.dest_data
                                            ? 'Aceite pelo colega'
                                            : 'Aguarda resposta do colega'}
                                </p>
                                {troca.dest_data && (
                                    <p className="text-xs text-gray-400">{fmtDt(troca.dest_data)}</p>
                                )}
                                {troca.dest_obs && (
                                    <p className="text-xs text-gray-500 italic mt-0.5">"{troca.dest_obs}"</p>
                                )}
                            </Timeline.Item>
                            <Timeline.Item
                                color={
                                    troca.estado === 'rejeitado_chefe' ? 'red' :
                                    troca.estado === 'aprovado_chefe'  ? 'green' : 'gray'
                                }
                            >
                                <p className="text-xs font-bold text-slate-700">
                                    {troca.estado === 'aprovado_chefe'
                                        ? 'Aprovado pelo chefe'
                                        : troca.estado === 'rejeitado_chefe'
                                            ? 'Rejeitado pelo chefe'
                                            : 'Aguarda aprovação do chefe'}
                                </p>
                                {troca.chefe_data && (
                                    <p className="text-xs text-gray-400">{fmtDt(troca.chefe_data)}</p>
                                )}
                                {troca.chefe_obs && (
                                    <p className="text-xs text-gray-500 italic mt-0.5">"{troca.chefe_obs}"</p>
                                )}
                            </Timeline.Item>
                        </Timeline>
                    </div>

                    {/* ── Campo de observação (para acções pendentes) ── */}
                    {(podeAceitar || podeAprovar || podeCancelar) && (
                        <>
                            <Divider className="my-2" />
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase block mb-1.5">
                                    Observação
                                    {podeAprovar && <span className="text-red-400 ml-1">(obrigatória para rejeitar)</span>}
                                </label>
                                <TextArea
                                    rows={3}
                                    value={obs}
                                    onChange={e => setObs(e.target.value)}
                                    placeholder="Observação opcional..."
                                    maxLength={500}
                                    showCount
                                    className="rounded-lg"
                                />
                            </div>
                        </>
                    )}
                </div>
            </YScroll>
        </Drawer>
    );
};



// ══════════════════════════════════════════════════════════════
// MODAL: Nova troca  (versão corrigida)
// ══════════════════════════════════════════════════════════════
const ModalNovaTroca = ({ open, onClose, auth, onRefresh }) => {
    const { openNotification } = useContext(LayoutContext);
    const [form]                = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [colegas, setColegas] = useState([]);
    const [loadingColegas, setLoadingColegas] = useState(false);
    const [turnoReq,  setTurnoReq]  = useState(null);
    const [turnoDest, setTurnoDest] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [colega1Info, setColega1Info] = useState(null);
    const [colega2Info, setColega2Info] = useState(null);

    const isChefe = auth?.isChefe || false;
    const isRH    = auth?.isRH    || false;

    const handleClose = () => {
        form.resetFields();
        setTurnoReq(null);
        setTurnoDest(null);
        setColega1Info(null);
        setColega2Info(null);
        onClose();
    };

    // ── Carregar todos os colaboradores do(s) departamento(s) do chefe ─────
    useEffect(() => {
        if (!open || !auth?.num) return;

        setColegas([]);
        setColega1Info(null);
        setColega2Info(null);
        setLoadingColegas(true);

        fetchPost({
            url: `${API_URL}/rponto/sqlp/`,
            withCredentials: true,
            parameters: { method: 'ColaboradoresDepartamento' },
            filter: {
                num:        auth.num,
                dep:        (auth?.dep || auth?.departamento || '').trim(),
                isRH:       auth?.isRH       || false,
                isChefe:    auth?.isChefe    || false,
                deps_chefe: auth?.deps_chefe || [],
            }
        })
        .then(r => {
            if (r.data?.status === 'success') {
                setColegas(r.data.rows || []);
                if ((r.data.rows || []).length === 0) {
                    openNotification('warning', 'top', 'Sem colaboradores',
                        r.data.warn || 'Nenhum colaborador encontrado no departamento');
                }
            } else {
                openNotification('error', 'top', 'Erro', r.data?.title || 'Erro ao carregar colaboradores');
            }
        })
        .catch(e => openNotification('error', 'top', 'Erro', e.message))
        .finally(() => setLoadingColegas(false));
    }, [open, auth?.num]); // eslint-disable-line

    // ── Preview: buscar turno de um colaborador numa data ─────────────────
    const fetchTurnoColaborador = async (num, data) => {
        if (!num || !data) return null;
        try {
            const dataStr = dayjs.isDayjs(data) ? data.format('YYYY-MM-DD') : data;
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: {
                    method:      'GetTurnosColaborador',
                    data_inicio: dataStr,
                    data_fim:    dataStr
                },
                filter: { num, isRH: false, isChefe: false, deps_chefe: [] }
            });
            return (
                r.data?.escalas?.[0]?.equipas?.[0]?.turno_sigla ||
                r.data?.escalas?.[0]?.ger?.[0]?.turno_sigla     ||
                null
            );
        } catch (_) { return null; }
    };

    // Chamado sempre que qualquer campo relevante muda
    const previewTurnos = useCallback(async () => {
        const values = form.getFieldsValue();
        const { num_req, data_req, num_dest, data_dest } = values;

        if (num_req && data_req) {
            setPreviewLoading(true);
            fetchTurnoColaborador(num_req, data_req)
                .then(t => setTurnoReq(t))
                .finally(() => setPreviewLoading(false));
        } else {
            setTurnoReq(null);
        }

        if (num_dest && data_dest) {
            setPreviewLoading(true);
            fetchTurnoColaborador(num_dest, data_dest)
                .then(t => setTurnoDest(t))
                .finally(() => setPreviewLoading(false));
        } else {
            setTurnoDest(null);
        }
    }, [form]);

    // ── Submit ────────────────────────────────────────────────────────────
    const onSubmit = async (values) => {
        if (values.num_req === values.num_dest) {
            openNotification('error', 'top', 'Erro', 'Os dois colaboradores têm de ser diferentes.');
            return;
        }
        setLoading(true);
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                // Chefe cria a troca diretamente (sem fluxo de "aceite pelo colega")
                parameters: { method: 'TrocasSolicitarChefe' },
                filter: {
                    chefe_num: auth.num,
                    num_req:   values.num_req,
                    num_dest:  values.num_dest,
                    data_req:  values.data_req.format('YYYY-MM-DD'),
                    data_dest: values.data_dest.format('YYYY-MM-DD'),
                    obs_req:   values.obs_req || ''
                }
            });
            if (r.data?.status === 'success') {
                openNotification('success', 'top', 'Troca registada!', r.data.title);
                handleClose();
                onRefresh();
            } else {
                openNotification('error', 'top', 'Erro', r.data?.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Opções do select (excluir o outro colaborador já selecionado) ──────
    const numReqSelecionado  = Form.useWatch('num_req',  form);
    const numDestSelecionado = Form.useWatch('num_dest', form);

    const opcoesColega1 = colegas
        .filter(c => c.num !== numDestSelecionado)
        .map(c => ({
            value: c.num,
            label: `${c.nome && c.nome !== 'Nome não disponível' ? c.nome : c.num} (${c.num})`
        }));

    const opcoesColega2 = colegas
        .filter(c => c.num !== numReqSelecionado)
        .map(c => ({
            value: c.num,
            label: `${c.nome && c.nome !== 'Nome não disponível' ? c.nome : c.num} (${c.num})`
        }));

    return (
        <Modal
            open={open}
            onCancel={handleClose}
            footer={null}
            title={
                <div className="flex items-center gap-2">
                    <SwapOutlined className="text-indigo-500" />
                    <span className="font-black">Registar troca de turno</span>
                </div>
            }
            width={580}
            destroyOnClose
        >
            <Alert
                message="Como chefe, pode registar diretamente a troca entre dois colaboradores do seu departamento."
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                className="rounded-xl mb-4 text-xs"
            />

            {/* ── Visualização: COLEGA 1 ↔ COLEGA 2 ── */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase text-center mb-3">
                    Colaboradores da troca
                </p>
                <div className="flex items-center gap-3">
                    {/* Colaborador 1 */}
                    <div className={`flex-1 bg-white rounded-xl p-3 border text-center transition-all ${
                        colega1Info ? 'border-indigo-200 shadow-sm' : 'border-dashed border-slate-200'
                    }`}>
                        <Avatar
                            size={36}
                            icon={<UserOutlined />}
                            className={`mx-auto block mb-2 ${colega1Info ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        />
                        {colega1Info ? (
                            <>
                                <p className="text-xs font-bold text-slate-800 truncate">
                                    {colega1Info.nome || colega1Info.num}
                                </p>
                                <p className="text-[10px] text-slate-400">{colega1Info.num}</p>
                            </>
                        ) : (
                            <p className="text-[10px] text-slate-400 italic">Colaborador 1</p>
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-1 shrink-0">
                        <SwapOutlined className="text-slate-400 text-xl" />
                        <span className="text-[9px] text-slate-300 font-bold uppercase">troca</span>
                    </div>

                    {/* Colaborador 2 */}
                    <div className={`flex-1 bg-white rounded-xl p-3 border text-center transition-all ${
                        colega2Info ? 'border-purple-200 shadow-sm' : 'border-dashed border-slate-200'
                    }`}>
                        <Avatar
                            size={36}
                            icon={<UserOutlined />}
                            className={`mx-auto block mb-2 ${colega2Info ? 'bg-purple-600' : 'bg-slate-300'}`}
                        />
                        {colega2Info ? (
                            <>
                                <p className="text-xs font-bold text-slate-800 truncate">
                                    {colega2Info.nome || colega2Info.num}
                                </p>
                                <p className="text-[10px] text-slate-400">{colega2Info.num}</p>
                            </>
                        ) : (
                            <p className="text-[10px] text-slate-400 italic">Colaborador 2</p>
                        )}
                    </div>
                </div>
            </div>

            <Form form={form} layout="vertical" onFinish={onSubmit}>

                {/* ══ Colaborador 1 ══ */}
                <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 mb-3">
                    <p className="text-[10px] font-black text-indigo-600 uppercase mb-3">
                        Colaborador 1 — cede o turno de:
                    </p>

                    <Form.Item
                        name="num_req"
                        label={<span className="text-xs font-bold text-gray-600">Colaborador</span>}
                        rules={[{ required: true, message: 'Selecione o colaborador' }]}
                        className="mb-2"
                    >
                        <Select
                            showSearch
                            loading={loadingColegas}
                            placeholder={loadingColegas ? 'A carregar...' : 'Pesquisar colaborador...'}
                            filterOption={(input, option) =>
                                option?.label?.toLowerCase().includes(input.toLowerCase())
                            }
                            onChange={val => {
                                const info = colegas.find(c => c.num === val) || null;
                                setColega1Info(info);
                                previewTurnos();
                            }}
                            options={opcoesColega1}
                            disabled={loadingColegas}
                            notFoundContent={
                                loadingColegas
                                    ? <Spin size="small" />
                                    : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
                                             description="Sem colaboradores" style={{ padding: 4 }} />
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        name="data_req"
                        label={<span className="text-xs font-bold text-gray-600">Data do turno a ceder</span>}
                        rules={[{ required: true, message: 'Selecione a data' }]}
                        className="mb-0"
                    >
                        <DatePicker
                            format="DD/MM/YYYY"
                            style={{ width: '100%' }}
                            disabledDate={d => d && d.isBefore(dayjs(), 'day')}
                            onChange={previewTurnos}
                            placeholder="Data do turno"
                        />
                    </Form.Item>
                </div>

                {/* ══ Colaborador 2 ══ */}
                <div className="bg-purple-50/40 border border-purple-100 rounded-xl p-4 mb-3">
                    <p className="text-[10px] font-black text-purple-600 uppercase mb-3">
                        Colaborador 2 — cede o turno de:
                    </p>

                    <Form.Item
                        name="num_dest"
                        label={<span className="text-xs font-bold text-gray-600">Colaborador</span>}
                        rules={[{ required: true, message: 'Selecione o colaborador' }]}
                        className="mb-2"
                    >
                        <Select
                            showSearch
                            loading={loadingColegas}
                            placeholder={loadingColegas ? 'A carregar...' : 'Pesquisar colaborador...'}
                            filterOption={(input, option) =>
                                option?.label?.toLowerCase().includes(input.toLowerCase())
                            }
                            onChange={val => {
                                const info = colegas.find(c => c.num === val) || null;
                                setColega2Info(info);
                                previewTurnos();
                            }}
                            options={opcoesColega2}
                            disabled={loadingColegas}
                            notFoundContent={
                                loadingColegas
                                    ? <Spin size="small" />
                                    : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
                                             description="Sem colaboradores" style={{ padding: 4 }} />
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        name="data_dest"
                        label={<span className="text-xs font-bold text-gray-600">Data do turno a ceder</span>}
                        rules={[{ required: true, message: 'Selecione a data' }]}
                        className="mb-0"
                    >
                        <DatePicker
                            format="DD/MM/YYYY"
                            style={{ width: '100%' }}
                            disabledDate={d => d && d.isBefore(dayjs(), 'day')}
                            onChange={previewTurnos}
                            placeholder="Data do turno"
                        />
                    </Form.Item>
                </div>

                {/* ══ Preview dos turnos ══ */}
                {(turnoReq || turnoDest || previewLoading) && (
                    <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                        <p className="text-[10px] text-slate-400 uppercase text-center mb-2 font-bold">
                            Resultado da troca
                        </p>
                        {previewLoading ? (
                            <div className="flex justify-center py-2"><Spin size="small" /></div>
                        ) : (
                            <div className="flex items-center justify-around">
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-400 uppercase mb-1">
                                        {colega1Info?.nome || 'Colaborador 1'} fica com
                                    </p>
                                    {turnoDest
                                        ? <TurnoBadge sigla={turnoDest} />
                                        : <span className="text-xs text-slate-400">—</span>
                                    }
                                </div>
                                <SwapOutlined className="text-slate-400 text-lg" />
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-400 uppercase mb-1">
                                        {colega2Info?.nome || 'Colaborador 2'} fica com
                                    </p>
                                    {turnoReq
                                        ? <TurnoBadge sigla={turnoReq} />
                                        : <span className="text-xs text-slate-400">—</span>
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ══ Observação ══ */}
                <Form.Item
                    name="obs_req"
                    label={<span className="text-xs font-bold text-gray-600 uppercase">Motivo / observação</span>}
                >
                    <TextArea
                        rows={2}
                        maxLength={500}
                        showCount
                        placeholder="Ex: por acordo entre os colaboradores..."
                        className="rounded-lg"
                    />
                </Form.Item>

                <div className="flex gap-2 justify-end pt-2">
                    <Button onClick={handleClose}>Cancelar</Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        icon={<CheckOutlined />}
                        className="bg-indigo-600 border-none hover:bg-indigo-700 font-bold"
                        disabled={loadingColegas || colegas.length === 0}
                    >
                        Registar troca
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};


const CardTroca = ({ troca, authNum, onClick }) => {
    const souRequerente = troca.num_req  === authNum;
    const souDestino    = troca.num_dest === authNum;
    const pendenteMinha = souDestino && troca.estado === 'pendente';

    const borderClass =
        troca.estado === 'aprovado_chefe'                     ? 'border-green-200  bg-green-50/30'  :
        troca.estado === 'rejeitado_dest' ||
        troca.estado === 'rejeitado_chefe'                    ? 'border-red-200    bg-red-50/30'    :
        troca.estado === 'aceite_dest'                        ? 'border-blue-200   bg-blue-50/30'   :
        troca.estado === 'cancelado'                          ? 'border-gray-200   bg-gray-50/30'   :
                                                                'border-orange-200 bg-orange-50/30' ;

    return (
        <div
            className={`rounded-xl border shadow-sm p-4 cursor-pointer
                        hover:shadow-md transition-all ${borderClass}
                        ${pendenteMinha ? 'ring-2 ring-orange-400' : ''}`}
            onClick={() => onClick(troca)}
        >
            {pendenteMinha && (
                <div className="text-[10px] font-bold text-orange-600 uppercase mb-2
                                flex items-center gap-1">
                    <ClockCircleOutlined />
                    Aguarda a sua resposta
                </div>
            )}

            <div className="flex items-start justify-between gap-2 mb-3">
                <TagEstado estado={troca.estado} />
                <span className="text-[10px] text-slate-400">{fmtDt(troca.created_at)}</span>
            </div>

            {/* Linha da troca */}
            <div className="flex items-center gap-2 bg-white rounded-xl p-3 border border-slate-100">
                {/* Lado requerente */}
                <div className="flex-1 text-center min-w-0">
                    <p className="text-[10px] text-slate-400 mb-1 truncate">
                        {troca.nome_req || troca.num_req}
                    </p>
                    <p className="text-[10px] text-slate-400 mb-1">{fmtData(troca.data_req)}</p>
                    <TurnoBadge sigla={troca.turno_req} />
                    {souRequerente && (
                        <span className="block text-[9px] text-indigo-500 font-bold mt-1">EU</span>
                    )}
                </div>

                <SwapOutlined className="text-slate-400 text-base shrink-0" />

                {/* Lado destino */}
                <div className="flex-1 text-center min-w-0">
                    <p className="text-[10px] text-slate-400 mb-1 truncate">
                        {troca.nome_dest || troca.num_dest}
                    </p>
                    <p className="text-[10px] text-slate-400 mb-1">{fmtData(troca.data_dest)}</p>
                    <TurnoBadge sigla={troca.turno_dest} />
                    {souDestino && (
                        <span className="block text-[9px] text-purple-500 font-bold mt-1">EU</span>
                    )}
                </div>
            </div>

            {troca.obs_req && (
                <p className="text-[10px] text-slate-500 italic mt-2 border-l-2 border-slate-200 pl-2 truncate">
                    "{troca.obs_req}"
                </p>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function TrocasTurno() {
    const { auth }             = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);

    const isRH      = auth?.isRH      || false;
    const isChefe   = auth?.isChefe   || false;
    const deps_chefe = auth?.deps_chefe || [];

    const [rows,        setRows]        = useState([]);
    const [loading,     setLoading]     = useState(false);
    const [tabAtiva,    setTabAtiva]    = useState('minhas');
    const [selected,    setSelected]    = useState(null);
    const [drawerOpen,  setDrawerOpen]  = useState(false);
    const [modalOpen,   setModalOpen]   = useState(false);

    // ── Carregar trocas ────────────────────────────────────────
    const loadTrocas = useCallback(async () => {
        if (!auth?.num) return;
        setLoading(true);
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'TrocasListar' },
                filter: {
                    num:       auth.num,
                    isRH,
                    isChefe,
                    deps_chefe,
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
    }, [auth?.num, isRH, isChefe]);

    useEffect(() => { loadTrocas(); }, []);

    const handleOpen = (troca) => {
        setSelected(troca);
        setDrawerOpen(true);
    };

    // ── Filtrar por tab ────────────────────────────────────────
    const minhas      = rows.filter(r => r.num_req === auth?.num || r.num_dest === auth?.num);
    const paraAprovar = rows.filter(r => r.estado === 'aceite_dest');
    const todasDep    = rows;

    // Trocas que aguardam a minha resposta como destino
    const aguardamResposta = rows.filter(r =>
        r.num_dest === auth?.num && r.estado === 'pendente'
    );

    const rowsFiltradas =
        tabAtiva === 'minhas'      ? minhas      :
        tabAtiva === 'aprovar'     ? paraAprovar :
        tabAtiva === 'departamento' ? todasDep   : rows;

    const tabItems = [
        {
            key:   'minhas',
            label: (
                <Badge count={aguardamResposta.length} size="small" offset={[6, 0]}>
                    <span className="pr-2">As minhas</span>
                </Badge>
            )
        },
        ...(isChefe ? [{
            key:   'aprovar',
            label: (
                <Badge count={paraAprovar.length} size="small" offset={[6, 0]}>
                    <span className="pr-2">Para aprovar</span>
                </Badge>
            )
        }] : []),
        ...(isChefe || isRH ? [{
            key:   'departamento',
            label: `Todas (${todasDep.length})`
        }] : []),
    ];

    return (
        <div className="p-4 bg-gray-50 min-h-screen space-y-4">

            {/* ── Header ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5
                            flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500
                                    to-purple-600 flex items-center justify-center shadow">
                        <SwapOutlined className="text-white text-xl" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800">
                            Trocas de Turno
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {isChefe
                                ? `Gestão de trocas — ${deps_chefe.join(', ')}`
                                : isRH
                                    ? 'Visão global das trocas'
                                    : 'Peça ou gira as suas trocas de turno'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        icon={<SyncOutlined />}
                        onClick={loadTrocas}
                        loading={loading}
                        className="rounded-xl"
                    >
                        Atualizar
                    </Button>
                    {/* Colaboradores e Chefes podem solicitar trocas */}
                    {!isRH && (
                        <Button
                            type="primary"
                            icon={<SwapOutlined />}
                            onClick={() => setModalOpen(true)}
                            className="bg-indigo-600 border-none hover:bg-indigo-700
                                       font-bold rounded-xl"
                        >
                            Nova troca
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Alerta: aguardam a minha resposta ── */}
            {aguardamResposta.length > 0 && (
                <Alert
                    message={
                        <span className="font-bold">
                            Tem {aguardamResposta.length} pedido{aguardamResposta.length > 1 ? 's' : ''} de troca
                            a aguardar a sua resposta!
                        </span>
                    }
                    description="Clique numa troca para aceitar ou recusar."
                    type="warning"
                    showIcon
                    icon={<ClockCircleOutlined />}
                    className="rounded-xl"
                    action={
                        <Button
                            size="small"
                            onClick={() => setTabAtiva('minhas')}
                            className="font-semibold"
                        >
                            Ver
                        </Button>
                    }
                />
            )}

            {/* ── KPIs ── */}
            {rows.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        {
                            label: 'Pendentes',
                            value: rows.filter(r => r.estado === 'pendente').length,
                            color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100'
                        },
                        {
                            label: 'Aceites',
                            value: rows.filter(r => r.estado === 'aceite_dest').length,
                            color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100'
                        },
                        {
                            label: 'Aprovadas',
                            value: rows.filter(r => r.estado === 'aprovado_chefe').length,
                            color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100'
                        },
                        {
                            label: 'Rejeitadas',
                            value: rows.filter(r =>
                                r.estado === 'rejeitado_dest' || r.estado === 'rejeitado_chefe'
                            ).length,
                            color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100'
                        },
                    ].map(k => (
                        <div key={k.label}
                             className={`${k.bg} ${k.border} border rounded-xl p-4 text-center`}>
                            <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
                            <p className="text-[11px] text-gray-500 font-semibold mt-1">{k.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Tabs + lista ── */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <Tabs
                    activeKey={tabAtiva}
                    onChange={setTabAtiva}
                    items={tabItems}
                    className="px-4 pt-2"
                />

                <div className="p-4">
                    {loading ? (
                        <div className="flex justify-center items-center py-16">
                            <Spin size="large" />
                        </div>
                    ) : rowsFiltradas.length === 0 ? (
                        <div className="py-16">
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    <span className="text-gray-400 text-sm">
                                        {tabAtiva === 'aprovar'
                                            ? 'Nenhuma troca pendente de aprovação'
                                            : 'Nenhuma troca encontrada'}
                                    </span>
                                }
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {rowsFiltradas.map(troca => (
                                <CardTroca
                                    key={troca.id}
                                    troca={troca}
                                    authNum={auth?.num}
                                    onClick={handleOpen}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Como funciona ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="text-xs font-black text-slate-600 uppercase mb-3">
                    Como funciona?
                </h2>
                <Timeline className="mt-2">
                    <Timeline.Item color="indigo" dot={<SendOutlined />}>
                        <p className="text-xs font-bold text-slate-700">Solicita a troca</p>
                        <p className="text-[11px] text-gray-400">
                            Indica o colega e as datas a trocar (mesmo departamento)
                        </p>
                    </Timeline.Item>
                    <Timeline.Item color="orange" dot={<UserOutlined />}>
                        <p className="text-xs font-bold text-slate-700">Colega aceita ou recusa</p>
                        <p className="text-[11px] text-gray-400">
                            O colega recebe o pedido e responde
                        </p>
                    </Timeline.Item>
                    <Timeline.Item color="green" dot={<CheckOutlined />}>
                        <p className="text-xs font-bold text-slate-700">Chefe aprova</p>
                        <p className="text-[11px] text-gray-400">
                            Chefe de departamento valida a troca — fica registada no horário
                        </p>
                    </Timeline.Item>
                </Timeline>
            </div>

            {/* ── Drawer detalhe ── */}
            <DrawerDetalhe
                troca={selected}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                authNum={auth?.num}
                isChefe={isChefe}
                onRefresh={loadTrocas}
            />

            {/* ── Modal nova troca ── */}
            <ModalNovaTroca
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                auth={auth}
                onRefresh={loadTrocas}
            />
        </div>
    );
}