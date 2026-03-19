import React, { useContext, useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import {
    Button, Form, Input, Select, Tag, Modal, Empty,
    Spin, Alert, Drawer, Avatar, Divider
} from 'antd';
import {
    CheckOutlined, CloseOutlined, FilePdfOutlined,
    UserOutlined, CalendarOutlined, FileTextOutlined,
    ClockCircleOutlined, FilterOutlined
} from '@ant-design/icons';
import { fetchPost } from "utils/fetch";
import { useSubmitting } from "utils";
import { API_URL } from "config";
import { AppContext } from "./App";
import { LayoutContext } from "./GridLayout";
import { RangeDateField } from 'components/FormFields';
import { getFilterRangeValues } from "utils";
import YScroll from 'components/YScroll';

const { TextArea } = Input;

const STATUS_CONFIG = {
    0: { label: 'Pendente',             color: 'orange' },
    1: { label: 'Aguarda RH',           color: 'blue'   },
    2: { label: 'Aprovado',             color: 'green'  },
    3: { label: 'Rejeitado pelo Chefe', color: 'red'    },
    4: { label: 'Rejeitado pelo RH',    color: 'red'    },
};

/* ── Drawer Detalhe ───────────────────────────────────── */
const DetalheDrawer = ({ item, open, onClose, onRefresh }) => {
    const { auth }             = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);
    const [form]               = Form.useForm();
    const submitting           = useSubmitting(false);

    if (!item) return null;

    const numAprovador = (
        auth?.num
        || auth?.numero
        || auth?.nfunc
        || auth?.employee_id
        || auth?.username
        || ''
    );

    // ✅ FIXED: handleViewPDF was missing — now defined here
    const handleViewPDF = () => {
        if (!item?.id) return;
        const token = auth?.token || localStorage.getItem('token') || '';
        const url = `${API_URL}/rponto/justificacoes/download/${item.id}/?token=${encodeURIComponent(token)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleAprovar = async () => {
        if (!numAprovador) {
            openNotification('error', 'top', 'Erro', 'Não foi possível identificar o utilizador. Por favor refresque a página e tente novamente.');
            return;
        }
        submitting.trigger();
        try {
            const obs = form.getFieldValue('obs') || '';
            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "JustificacaoAprovar" },
                filter: {
                    id:            item.id,
                    acao:          'aprovar',
                    obs,
                    num_aprovador: numAprovador,
                    tipo:          'chefe'
                }
            });
            if (res.data.status === 'success') {
                openNotification('success', 'top', 'Aprovado', res.data.title);
                onRefresh();
                onClose();
            } else {
                openNotification('error', 'top', 'Erro', res.data.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            submitting.end();
        }
    };

    const handleRejeitar = async () => {
        const obs = form.getFieldValue('obs');
        if (!obs?.trim()) {
            openNotification('warning', 'top', 'Atenção', 'Indique o motivo da rejeição.');
            return;
        }
        if (!numAprovador) {
            openNotification('error', 'top', 'Erro', 'Não foi possível identificar o utilizador. Por favor refresque a página e tente novamente.');
            return;
        }
        submitting.trigger();
        try {
            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "JustificacaoAprovar" },
                filter: {
                    id:            item.id,
                    acao:          'rejeitar',
                    obs,
                    num_aprovador: numAprovador,
                    tipo:          'chefe'
                }
            });
            if (res.data.status === 'success') {
                openNotification('success', 'top', 'Rejeitado', res.data.title);
                onRefresh();
                onClose();
            } else {
                openNotification('error', 'top', 'Erro', res.data.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            submitting.end();
        }
    };

    const isPendente = item.status === 0;

    return (
        <Drawer
            title={<div className="flex items-center gap-2"><FileTextOutlined className="text-blue-500" /><span>Detalhe da Justificação #{item.id}</span></div>}
            width={520} open={open} onClose={onClose} destroyOnClose
            footer={isPendente && (
                <div className="flex gap-3 justify-end p-2">
                    <Button danger icon={<CloseOutlined />} size="large"
                            onClick={handleRejeitar} loading={submitting.state}
                            className="rounded-xl font-semibold">
                        Rejeitar
                    </Button>
                    <Button type="primary" icon={<CheckOutlined />} size="large"
                            onClick={handleAprovar} loading={submitting.state}
                            className="rounded-xl bg-green-600 hover:bg-green-700 border-none font-semibold">
                        Aprovar
                    </Button>
                </div>
            )}
        >
            <YScroll>
                <div className="space-y-5 p-1">
                    <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
                        <Avatar size={48} icon={<UserOutlined />} className="bg-blue-600 shrink-0" />
                        <div>
                            <p className="font-bold text-slate-800 text-lg">{item.nome_colaborador || item.num}</p>
                            <p className="text-sm text-slate-500">{item.num} · {item.dep_codigo || 'Sem departamento'}</p>
                        </div>
                        <div className="ml-auto">
                            <Tag color={STATUS_CONFIG[item.status]?.color} className="font-semibold">
                                {STATUS_CONFIG[item.status]?.label}
                            </Tag>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Período</p>
                            <p className="font-bold text-slate-700 text-sm">{dayjs(item.dt_inicio).format('DD/MM/YYYY')}</p>
                            {item.dt_inicio !== item.dt_fim && (
                                <p className="font-bold text-slate-700 text-sm">→ {dayjs(item.dt_fim).format('DD/MM/YYYY')}</p>
                            )}
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Motivo</p>
                            <p className="font-bold text-slate-700 text-sm">{item.motivo_descricao}</p>
                        </div>
                    </div>
                    {item.descricao && (
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Descrição</p>
                            <p className="text-slate-700 text-sm">{item.descricao}</p>
                        </div>
                    )}
                    {item.pdf_filename ? (
                        <Button icon={<FilePdfOutlined />} block size="large" onClick={handleViewPDF}
                                className="rounded-xl border-red-200 text-red-500 hover:bg-red-50 font-semibold">
                            Visualizar Documento Justificativo
                        </Button>
                    ) : (
                        <Alert message="Sem documento anexado" type="warning" showIcon className="rounded-xl" />
                    )}
                    <Divider />
                    {isPendente && (
                        <Form form={form} layout="vertical">
                            <Form.Item name="obs"
                                       label={<span className="font-semibold text-slate-700">Observação (obrigatória para rejeitar)</span>}>
                                <TextArea rows={3} placeholder="Escreva uma observação..."
                                          className="rounded-lg" maxLength={500} showCount />
                            </Form.Item>
                        </Form>
                    )}
                    {item.obs_chefe && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Decisão do Chefe</p>
                            <p className="text-sm text-slate-700">{item.obs_chefe}</p>
                            <p className="text-xs text-slate-400 mt-1">{dayjs(item.dt_chefe).format('DD/MM/YYYY HH:mm')}</p>
                        </div>
                    )}
                </div>
            </YScroll>
        </Drawer>
    );
};

/* ── Componente Principal ─────────────────────────────── */
export default function JustificacoesChefe() {
    const { auth }             = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);

    const isRHUser   = auth?.isRH       || false;
    const isChefeUser= auth?.isChefe    || false;
    const deps_chefe = auth?.deps_chefe || [];

    const [rows,        setRows]        = useState([]);
    const [total,       setTotal]       = useState(0);
    const [loading,     setLoading]     = useState(false);
    const [selected,    setSelected]    = useState(null);
    const [drawerOpen,  setDrawerOpen]  = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [formFilter]                  = Form.useForm();

    /* ── Carregar dados ───────────────────────────────── */
    const loadData = useCallback(async (filters = {}) => {
        if (!auth?.num) return;

        if (isChefeUser && !isRHUser && deps_chefe.length === 0) {
            console.warn('[JustificacoesChefe] chefe sem deps_chefe');
            return;
        }

        setLoading(true);
        try {
            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "JustificacoesList" },
                filter: {
                    isRH:       isRHUser,
                    isChefe:    isChefeUser,
                    deps_chefe: deps_chefe,
                    ...filters,
                },
                pagination: { enabled: true, page: 1, pageSize: 100 }
            });
            if (res.data?.status === 'success') {
                setRows(res.data.rows  || []);
                setTotal(res.data.total || 0);
            } else {
                openNotification('error', 'top', 'Erro', res.data?.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            setLoading(false);
        }
    }, [auth?.num, isRHUser, isChefeUser, deps_chefe.length]);

    useEffect(() => {
        if (auth?.num && (isRHUser || (isChefeUser && deps_chefe.length > 0))) {
            loadData({ fstatus: 0 });
        }
    }, [auth?.num, deps_chefe.length]);

    const pendentes   = rows.filter(r => r.status === 0);
    const processadas = rows.filter(r => r.status !== 0);

    const handleOpen = (item) => { setSelected(item); setDrawerOpen(true); };

    const handleFilterFinish = (values) => {
        loadData({
            fstatus: values.fstatus ?? undefined,
            fdata:   values.fdata ? getFilterRangeValues(values.fdata?.formatted) : undefined,
            fnum:    values.fnum  || undefined,
        });
        setShowFilters(false);
    };

    const RowItem = ({ item }) => (
        <div className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer
                        transition-colors border-b border-slate-100 last:border-0 group"
             onClick={() => handleOpen(item)}>
            <Avatar icon={<UserOutlined />} className="bg-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-slate-800 truncate">
                        {item.nome_colaborador || item.num}
                    </span>
                    <span className="text-xs text-slate-400">{item.num}</span>
                    {item.dep_codigo && (
                        <Tag color="blue" className="!text-[10px] !px-1 !py-0 !m-0">
                            {item.dep_codigo}
                        </Tag>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{item.motivo_descricao}</span>
                    <span>·</span>
                    <span>
                        {dayjs(item.dt_inicio).format('DD/MM/YYYY')}
                        {item.dt_inicio !== item.dt_fim &&
                            ` → ${dayjs(item.dt_fim).format('DD/MM/YYYY')}`}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                {item.pdf_filename && <FilePdfOutlined className="text-red-400 text-lg" />}
                <Tag color={STATUS_CONFIG[item.status]?.color} className="font-semibold">
                    {STATUS_CONFIG[item.status]?.label}
                </Tag>
                <span className="text-slate-300 group-hover:text-slate-500 transition-colors">›</span>
            </div>
        </div>
    );

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center
                            justify-between gap-4 bg-white rounded-xl shadow-sm
                            border border-slate-200 p-5">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">
                        Justificações — Chefe de Departamento
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {deps_chefe.length > 0
                            ? `Departamento(s): ${deps_chefe.join(', ')}`
                            : 'Aprove ou rejeite as justificações da sua equipa'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {pendentes.length > 0 && (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200
                                        rounded-xl px-4 py-2">
                            <ClockCircleOutlined className="text-orange-500" />
                            <span className="font-bold text-orange-600">
                                {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                    <Button icon={<FilterOutlined />} onClick={() => setShowFilters(!showFilters)}
                            className="rounded-xl">
                        Filtros
                    </Button>
                </div>
            </div>

            {/* Aviso se JWT ainda não tem deps */}
            {isChefeUser && deps_chefe.length === 0 && (
                <Alert
                    type="warning"
                    showIcon
                    message="Sessão desatualizada"
                    description="Faça logout e login novamente para carregar os departamentos."
                    className="rounded-xl"
                />
            )}

            {/* Filtros */}
            {showFilters && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <Form form={formFilter} layout="inline"
                          onFinish={handleFilterFinish}
                          className="flex flex-wrap gap-3 items-end">
                        <Form.Item name="fstatus" label="Estado" className="mb-0">
                            <Select allowClear placeholder="Todos" style={{ width: 200 }}
                                    options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({
                                        value: parseInt(k), label: v.label
                                    }))} />
                        </Form.Item>
                        <Form.Item name="fnum" label="Nº Colaborador" className="mb-0">
                            <Input placeholder="F00001" style={{ width: 120 }} />
                        </Form.Item>
                        <Form.Item name="fdata" label="Período" className="mb-0">
                            <RangeDateField size="middle" />
                        </Form.Item>
                        <div className="flex gap-2">
                            <Button htmlType="submit" type="primary"
                                    className="rounded-lg bg-blue-600 border-none">
                                Filtrar
                            </Button>
                            <Button onClick={() => {
                                formFilter.resetFields();
                                loadData({ fstatus: 0 });
                                setShowFilters(false);
                            }} className="rounded-lg">
                                Limpar
                            </Button>
                        </div>
                    </Form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center p-16 bg-white rounded-xl border">
                    <Spin size="large" />
                </div>
            ) : (
                <div className="space-y-4">
                    {pendentes.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
                            <div className="bg-orange-50 px-5 py-3 border-b border-orange-200">
                                <span className="font-bold text-orange-700 text-sm uppercase tracking-wide">
                                    ⏳ Aguardam a sua decisão ({pendentes.length})
                                </span>
                            </div>
                            <div>{pendentes.map(item => <RowItem key={item.id} item={item} />)}</div>
                        </div>
                    )}
                    {processadas.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                                <span className="font-bold text-slate-500 text-sm uppercase tracking-wide">
                                    Histórico ({processadas.length})
                                </span>
                            </div>
                            <div>{processadas.map(item => <RowItem key={item.id} item={item} />)}</div>
                        </div>
                    )}
                    {rows.length === 0 && !loading && (
                        <div className="bg-white rounded-xl border border-slate-200">
                            <Empty description="Nenhuma justificação encontrada"
                                   image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-16" />
                        </div>
                    )}
                </div>
            )}

            <DetalheDrawer item={selected} open={drawerOpen}
                           onClose={() => setDrawerOpen(false)}
                           onRefresh={() => loadData({ fstatus: 0 })} />
        </div>
    );
}