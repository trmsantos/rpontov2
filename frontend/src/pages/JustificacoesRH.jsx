import React, { useContext, useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import {
    Button, Form, Input, Select, Tag, Modal,
    Empty, Spin, Alert, Drawer, Avatar, Divider, Tabs, Badge
} from 'antd';
import {
    CheckOutlined, CloseOutlined, FilePdfOutlined,
    UserOutlined, FileTextOutlined, ClockCircleOutlined,
    FilterOutlined, ReloadOutlined
} from '@ant-design/icons';
import { fetchPost } from "utils/fetch";
import { useSubmitting } from "utils";
import { API_URL, DATE_FORMAT } from "config";
import { AppContext } from "./App";
import { LayoutContext } from "./GridLayout";
import { RangeDateField } from 'components/FormFields';
import { getFilterRangeValues } from "utils";
import YScroll from 'components/YScroll';

const { TextArea } = Input;

const STATUS_CONFIG = {
    0: { label: 'Pendente (Chefe)',     color: 'orange' },
    1: { label: 'Aguarda RH',           color: 'blue' },
    2: { label: 'Aprovado',             color: 'green' },
    3: { label: 'Rejeitado pelo Chefe', color: 'volcano' },
    4: { label: 'Rejeitado pelo RH',    color: 'red' },
};

// ── Drawer de Aprovação RH ────────────────────────────────────
const DetalheRHDrawer = ({ item, open, onClose, onRefresh }) => {
    const { auth } = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);
    const [form] = Form.useForm();
    const submitting = useSubmitting(false);

    if (!item) return null;

    // Resolver o num do aprovador — tentar todos os campos possíveis do auth
    const numAprovador = (
        auth?.num
        || auth?.numero
        || auth?.nfunc
        || auth?.employee_id
        || auth?.username
        || ''
    );

    const handleAcao = async (acao) => {
        const obs = form.getFieldValue('obs') || '';
        if (acao === 'rejeitar' && !obs.trim()) {
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
                    acao,
                    obs,
                    num_aprovador: numAprovador,
                    tipo:          'rh'
                }
            });
            if (res.data.status === 'success') {
                openNotification('success', 'top',
                    acao === 'aprovar' ? 'Aprovado' : 'Rejeitado',
                    res.data.title);
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

    const handleViewPDF = () => {
        const token = JSON.parse(localStorage.getItem('auth'))?.access_token;
        window.open(`${API_URL}/rponto/justificacao/pdf/${item.id}/?token=${token}`, '_blank');
    };

    const podeAprovar = item.status === 1 || item.status === 0; // RH pode aprovar em qualquer estado não final

    return (
        <Drawer
            title={
                <div className="flex items-center gap-2">
                    <FileTextOutlined className="text-blue-500" />
                    <span>Justificação #{item.id}</span>
                    <Tag color={STATUS_CONFIG[item.status]?.color} className="ml-2">
                        {STATUS_CONFIG[item.status]?.label}
                    </Tag>
                </div>
            }
            width={560}
            open={open}
            onClose={onClose}
            destroyOnClose
            footer={
                podeAprovar && (
                    <div className="flex gap-3 justify-end p-2">
                        <Button
                            danger
                            icon={<CloseOutlined />}
                            size="large"
                            onClick={() => handleAcao('rejeitar')}
                            loading={submitting.state}
                            className="rounded-xl font-semibold"
                        >
                            Rejeitar
                        </Button>
                        <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            size="large"
                            onClick={() => handleAcao('aprovar')}
                            loading={submitting.state}
                            className="rounded-xl bg-green-600 hover:bg-green-700 border-none font-semibold"
                        >
                            Aprovar
                        </Button>
                    </div>
                )
            }
        >
            <YScroll>
                <div className="space-y-4 p-1">
                    {/* Colaborador */}
                    <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
                        <Avatar size={48} icon={<UserOutlined />} className="bg-blue-600 shrink-0" />
                        <div className="flex-1">
                            <p className="font-bold text-slate-800">
                                {item.nome_colaborador || item.num}
                            </p>
                            <p className="text-sm text-slate-500">
                                {item.num} · {item.dep_codigo || '—'} · {item.tp_hor || '—'}
                            </p>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Período', value: `${dayjs(item.dt_inicio).format('DD/MM/YYYY')}${item.dt_inicio !== item.dt_fim ? ` → ${dayjs(item.dt_fim).format('DD/MM/YYYY')}` : ''}` },
                            { label: 'Motivo', value: item.motivo_descricao },
                            { label: 'Submetido em', value: dayjs(item.dt_submissao).format('DD/MM/YYYY HH:mm') },
                            { label: 'Departamento', value: item.dep_codigo || '—' },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-white border border-slate-200 rounded-xl p-3">
                                <p className="text-xs text-slate-400 uppercase mb-1">{label}</p>
                                <p className="font-semibold text-slate-700 text-sm">{value}</p>
                            </div>
                        ))}
                    </div>

                    {item.descricao && (
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="text-xs text-slate-400 uppercase mb-2">Descrição</p>
                            <p className="text-slate-700 text-sm">{item.descricao}</p>
                        </div>
                    )}

                    {/* PDF */}
                    {item.pdf_filename ? (
                        <Button icon={<FilePdfOutlined />} block size="large"
                                onClick={handleViewPDF}
                                className="rounded-xl border-red-200 text-red-500
                                           hover:bg-red-50 font-semibold">
                            Visualizar Documento Justificativo
                        </Button>
                    ) : (
                        <Alert message="Sem documento anexado"
                               type="warning" showIcon className="rounded-xl" />
                    )}

                    <Divider />

                    {/* Decisão do chefe */}
                    {item.status_chefe > 0 && (
                        <div className={`rounded-xl p-4 ${
                            item.status_chefe === 1
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                        }`}>
                            <p className="text-xs font-bold uppercase tracking-wide mb-2
                                          text-slate-500">
                                Decisão do Chefe de Departamento
                            </p>
                            <Tag color={item.status_chefe === 1 ? 'green' : 'red'}>
                                {item.status_chefe === 1 ? 'Aprovado' : 'Rejeitado'}
                            </Tag>
                            {item.obs_chefe && (
                                <p className="text-sm mt-2 text-slate-600">{item.obs_chefe}</p>
                            )}
                            {item.dt_chefe && (
                                <p className="text-xs text-slate-400 mt-1">
                                    {dayjs(item.dt_chefe).format('DD/MM/YYYY HH:mm')}
                                    {item.num_chefe && ` · ${item.num_chefe}`}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Campo observação RH */}
                    {podeAprovar && (
                        <Form form={form} layout="vertical">
                            <Form.Item
                                name="obs"
                                label={<span className="font-semibold text-slate-700">
                                    Observação do RH (obrigatória para rejeitar)
                                </span>}
                            >
                                <TextArea rows={3} placeholder="Observação..."
                                          className="rounded-lg" maxLength={500} showCount />
                            </Form.Item>
                        </Form>
                    )}

                    {/* Decisão do RH */}
                    {item.status_rh > 0 && (
                        <div className={`rounded-xl p-4 ${
                            item.status_rh === 1
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                        }`}>
                            <p className="text-xs font-bold uppercase tracking-wide mb-2
                                          text-slate-500">
                                Decisão do RH
                            </p>
                            <Tag color={item.status_rh === 1 ? 'green' : 'red'}>
                                {item.status_rh === 1 ? 'Aprovado' : 'Rejeitado'}
                            </Tag>
                            {item.obs_rh && (
                                <p className="text-sm mt-2 text-slate-600">{item.obs_rh}</p>
                            )}
                            {item.dt_rh && (
                                <p className="text-xs text-slate-400 mt-1">
                                    {dayjs(item.dt_rh).format('DD/MM/YYYY HH:mm')}
                                    {item.num_rh && ` · ${item.num_rh}`}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </YScroll>
        </Drawer>
    );
};

// ── Tabela de justificações ───────────────────────────────────
const JustificacoesTable = ({ rows, loading, onOpen }) => {
    if (loading) return (
        <div className="flex justify-center items-center p-16">
            <Spin size="large" />
        </div>
    );

    if (rows.length === 0) return (
        <Empty description="Nenhuma justificação encontrada"
               image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-16" />
    );

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        {['Colaborador', 'Departamento', 'Período', 'Motivo',
                          'Submetido', 'Estado', ''].map(h => (
                            <th key={h} className="px-4 py-3 text-xs font-bold
                                                   uppercase text-slate-500 tracking-wide">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map(item => (
                        <tr key={item.id}
                            className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                            onClick={() => onOpen(item)}>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <Avatar size={28} icon={<UserOutlined />}
                                            className="bg-blue-600 shrink-0" />
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">
                                            {item.nome_colaborador || item.num}
                                        </p>
                                        <p className="text-xs text-slate-400">{item.num}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                                {item.dep_codigo || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                                {dayjs(item.dt_inicio).format('DD/MM/YY')}
                                {item.dt_inicio !== item.dt_fim &&
                                    <> → {dayjs(item.dt_fim).format('DD/MM/YY')}</>}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                                {item.motivo_descricao}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                                {dayjs(item.dt_submissao).format('DD/MM/YY HH:mm')}
                            </td>
                            <td className="px-4 py-3">
                                <Tag color={STATUS_CONFIG[item.status]?.color}
                                     className="font-semibold">
                                    {STATUS_CONFIG[item.status]?.label}
                                </Tag>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex items-center gap-2 justify-end">
                                    {item.pdf_filename &&
                                        <FilePdfOutlined className="text-red-400" />}
                                    <span className="text-slate-300 group-hover:text-slate-500">›</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export default function JustificacoesRH() {
    const { auth } = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const [showFilters, setShowFilters] = useState(false);
    const [formFilter] = Form.useForm();

    const loadData = useCallback(async (filters = {}) => {
        setLoading(true);
        try {
            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "JustificacoesList" },  
                filter: {
                    isRH:    true,          
                    isChefe: false,
                    deps_chefe: [],
                    ...filters              
                },
                pagination: { enabled: true, page: 1, pageSize: 200 }
            });
            if (res.data.status === 'success') {
                setRows(res.data.rows || []);
                setTotal(res.data.total || 0);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            setLoading(false);
        }
    }, [openNotification]);

    useEffect(() => { loadData(); }, []);

    const aguardamRH  = rows.filter(r => r.status === 1);
    const aprovadas   = rows.filter(r => r.status === 2);
    const rejeitadas  = rows.filter(r => r.status === 3 || r.status === 4);
    const pendentes   = rows.filter(r => r.status === 0);

    const tabItems = [
        { key: '1', label: <Badge count={aguardamRH.length} size="small" color="#3b82f6" offset={[8, 0]}>Aguardam RH</Badge>, rows: aguardamRH },
        { key: '2', label: <Badge count={pendentes.length} size="small" color="#f97316" offset={[8, 0]}>Pendentes (Chefe)</Badge>, rows: pendentes },
        { key: '3', label: 'Aprovadas', rows: aprovadas },
        { key: '4', label: 'Rejeitadas', rows: rejeitadas },
        { key: '5', label: 'Todas', rows: rows },
    ];

    const currentRows = tabItems.find(t => t.key === activeTab)?.rows || [];

    const handleFilterFinish = (values) => {
        loadData({
            fstatus: values.fstatus,
            fdep: values.fdep,
            fnum: values.fnum,
            fdata: values.fdata ? getFilterRangeValues(values.fdata?.formatted) : undefined
        });
        setShowFilters(false);
    };

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center
                            justify-between gap-4 bg-white rounded-xl shadow-sm
                            border border-slate-200 p-5">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">
                        Gestão de Justificações — RH
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Gerir todas as justificações de ausência dos colaboradores
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button icon={<ReloadOutlined />} onClick={() => loadData()}
                            className="rounded-xl">
                        Atualizar
                    </Button>
                    <Button icon={<FilterOutlined />}
                            onClick={() => setShowFilters(!showFilters)}
                            className="rounded-xl"
                            type={showFilters ? 'primary' : 'default'}>
                        Filtros
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Aguardam RH',   value: aguardamRH.length,  color: 'blue',   bg: 'bg-blue-50',   border: 'border-blue-100',   text: 'text-blue-600' },
                    { label: 'Pend. Chefe',   value: pendentes.length,   color: 'orange', bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600' },
                    { label: 'Aprovadas',     value: aprovadas.length,   color: 'green',  bg: 'bg-green-50',  border: 'border-green-100',  text: 'text-green-600' },
                    { label: 'Rejeitadas',    value: rejeitadas.length,  color: 'red',    bg: 'bg-red-50',    border: 'border-red-100',    text: 'text-red-600' },
                ].map(kpi => (
                    <div key={kpi.label}
                         className={`${kpi.bg} ${kpi.border} border rounded-xl p-4`}>
                        <p className={`text-3xl font-black ${kpi.text}`}>{kpi.value}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-1">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            {showFilters && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <Form form={formFilter} layout="inline"
                          onFinish={handleFilterFinish}
                          className="flex flex-wrap gap-3 items-end">
                        <Form.Item name="fnum" label="Nº Colaborador" className="mb-0">
                            <Input placeholder="F00001" style={{ width: 120 }} />
                        </Form.Item>
                        <Form.Item name="fdep" label="Departamento" className="mb-0">
                            <Input placeholder="DPROD" style={{ width: 120 }} />
                        </Form.Item>
                        <Form.Item name="fstatus" label="Estado" className="mb-0">
                            <Select allowClear placeholder="Todos" style={{ width: 200 }}
                                    options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({
                                        value: parseInt(k), label: v.label
                                    }))} />
                        </Form.Item>
                        <Form.Item name="fdata" label="Período" className="mb-0">
                            <RangeDateField size="middle" />
                        </Form.Item>
                        <div className="flex gap-2">
                            <Button htmlType="submit" type="primary"
                                    className="rounded-lg bg-blue-600 border-none">
                                Filtrar
                            </Button>
                            <Button onClick={() => { formFilter.resetFields(); loadData(); }}
                                    className="rounded-lg">
                                Limpar
                            </Button>
                        </div>
                    </Form>
                </div>
            )}

            {/* Tabs + Tabela */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className="px-4 pt-2"
                    items={tabItems.map(t => ({ key: t.key, label: t.label }))}
                />
                <JustificacoesTable
                    rows={currentRows}
                    loading={loading}
                    onOpen={(item) => { setSelected(item); setDrawerOpen(true); }}
                />
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {currentRows.length} registo{currentRows.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <DetalheRHDrawer
                item={selected}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onRefresh={loadData}
            />
        </div>
    );
}