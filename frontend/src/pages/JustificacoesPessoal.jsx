import React, { useContext, useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import {
    Button, Form, Input, Select, DatePicker, Upload, Tag, Modal,
    Empty, Spin, Alert, Tooltip, Badge
} from 'antd';
import {
    PlusOutlined, UploadOutlined, FilePdfOutlined,
    EyeOutlined, ClockCircleOutlined, CheckCircleOutlined,
    CloseCircleOutlined, ExclamationCircleOutlined, FileTextOutlined
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
const { RangePicker } = DatePicker;

// ── Helpers de Status ──────────────────────────────────────────
const STATUS_CONFIG = {
    0: { label: 'Pendente (Chefe)',     color: 'orange',  icon: <ClockCircleOutlined /> },
    1: { label: 'Aguarda RH',           color: 'blue',    icon: <ClockCircleOutlined /> },
    2: { label: 'Aprovado',             color: 'green',   icon: <CheckCircleOutlined /> },
    3: { label: 'Rejeitado pelo Chefe', color: 'red',     icon: <CloseCircleOutlined /> },
    4: { label: 'Rejeitado pelo RH',    color: 'red',     icon: <CloseCircleOutlined /> },
};

const StatusTag = ({ status }) => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG[0];
    return (
        <Tag color={cfg.color} icon={cfg.icon} className="flex items-center gap-1 font-semibold">
            {cfg.label}
        </Tag>
    );
};

// ── Formulário de Nova Justificação ───────────────────────────
const NovaJustificacaoForm = ({ auth, motivos, onSuccess, onCancel }) => {
    const [form] = Form.useForm();
    const submitting = useSubmitting(false);
    const { openNotification } = useContext(LayoutContext);
    const [pdfFile, setPdfFile] = useState(null);
    const [justificacaoId, setJustificacaoId] = useState(null);
    const [step, setStep] = useState(1); // 1=form, 2=upload pdf

    const handleSubmitForm = async (values) => {
        submitting.trigger();
        try {
            const response = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "JustificacaoCreate" },
                filter: {
                    num: auth.num,
                    dt_inicio: values.periodo[0].format('YYYY-MM-DD'),
                    dt_fim: values.periodo[1].format('YYYY-MM-DD'),
                    motivo_codigo: values.motivo_codigo,
                    descricao: values.descricao || ''
                }
            });

            if (response.data.status === 'success') {
                setJustificacaoId(response.data.id);
                setStep(2);
            } else {
                openNotification('error', 'top', 'Erro', response.data.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            submitting.end();
        }
    };

    const handleUploadPDF = async () => {
        if (!pdfFile) {
            // Sem PDF — finalizar sem ficheiro
            openNotification('success', 'top', 'Sucesso', 'Justificação submetida com sucesso!');
            onSuccess();
            return;
        }

        submitting.trigger();
        try {
            const formData = new FormData();
            formData.append('id', justificacaoId);
            formData.append('pdf', pdfFile);

            const response = await fetch(`${API_URL}/rponto/justificacao/upload/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth'))?.access_token}`
                },
                body: formData
            });
            const data = await response.json();

            if (data.status === 'success') {
                openNotification('success', 'top', 'Sucesso', 'Justificação e PDF submetidos com sucesso!');
                onSuccess();
            } else {
                openNotification('error', 'top', 'Erro no upload', data.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            submitting.end();
        }
    };

    const beforeUpload = (file) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowed.includes(file.type)) {
            openNotification('error', 'top', 'Ficheiro inválido', 'Apenas PDF, JPG ou PNG são aceites.');
            return Upload.LIST_IGNORE;
        }
        if (file.size > 10 * 1024 * 1024) {
            openNotification('error', 'top', 'Ficheiro demasiado grande', 'Máximo permitido: 10MB.');
            return Upload.LIST_IGNORE;
        }
        setPdfFile(file);
        return false; // Não faz upload automático
    };

    if (step === 2) {
        return (
            <div className="flex flex-col gap-6">
                <Alert
                    message="Justificação criada com sucesso!"
                    description="Agora pode anexar o documento justificativo (PDF, JPG ou PNG). Este passo é opcional."
                    type="success"
                    showIcon
                    className="rounded-xl"
                />
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center gap-4 bg-slate-50">
                    <FilePdfOutlined className="text-5xl text-red-400" />
                    <p className="text-slate-600 font-medium text-center">
                        Anexe o documento justificativo
                    </p>
                    <p className="text-slate-400 text-xs text-center">
                        PDF, JPG ou PNG • Máx. 10MB
                    </p>
                    <Upload
                        beforeUpload={beforeUpload}
                        maxCount={1}
                        showUploadList={true}
                        onRemove={() => setPdfFile(null)}
                    >
                        <Button icon={<UploadOutlined />} size="large" className="rounded-lg">
                            Selecionar Ficheiro
                        </Button>
                    </Upload>
                </div>
                <div className="flex gap-3 justify-end">
                    <Button
                        onClick={handleUploadPDF}
                        type="primary"
                        size="large"
                        loading={submitting.state}
                        className="rounded-lg bg-blue-600 hover:bg-blue-700 border-none font-semibold"
                    >
                        {pdfFile ? 'Submeter com Documento' : 'Submeter sem Documento'}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Form form={form} layout="vertical" onFinish={handleSubmitForm} disabled={submitting.state}>
            <div className="grid grid-cols-1 gap-4">
                <Form.Item
                    name="periodo"
                    label={<span className="font-semibold text-slate-700">Período da Ausência</span>}
                    rules={[{ required: true, message: 'Selecione o período' }]}
                >
                    <RangePicker
                        style={{ width: '100%' }}
                        format={DATE_FORMAT}
                        size="large"
                        className="rounded-lg"
                    />
                </Form.Item>

                <Form.Item
                    name="motivo_codigo"
                    label={<span className="font-semibold text-slate-700">Motivo</span>}
                    rules={[{ required: true, message: 'Selecione o motivo' }]}
                >
                    <Select
                        size="large"
                        placeholder="Selecione o motivo..."
                        className="rounded-lg"
                        options={motivos.map(m => ({
                            value: m.codigo,
                            label: m.descricao
                        }))}
                    />
                </Form.Item>

                <Form.Item
                    name="descricao"
                    label={<span className="font-semibold text-slate-700">Descrição (opcional)</span>}
                >
                    <TextArea
                        rows={3}
                        placeholder="Informação adicional sobre a ausência..."
                        className="rounded-lg"
                        maxLength={500}
                        showCount
                    />
                </Form.Item>
            </div>

            <div className="flex gap-3 justify-end pt-2">
                <Button onClick={onCancel} size="large" className="rounded-lg">
                    Cancelar
                </Button>
                <Button
                    htmlType="submit"
                    type="primary"
                    size="large"
                    loading={submitting.state}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 border-none font-semibold"
                >
                    Continuar
                </Button>
            </div>
        </Form>
    );
};

// ── Card de Justificação ───────────────────────────────────────
const JustificacaoCard = ({ item, onViewPDF }) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <FileTextOutlined className="text-blue-500" />
                        <span className="font-bold text-slate-800">{item.motivo_descricao}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                        Submetido em {dayjs(item.dt_submissao).format('DD/MM/YYYY HH:mm')}
                    </p>
                </div>
                <StatusTag status={item.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Período</p>
                    <p className="text-sm font-semibold text-slate-700">
                        {dayjs(item.dt_inicio).format('DD/MM/YYYY')}
                        {item.dt_inicio !== item.dt_fim && (
                            <> → {dayjs(item.dt_fim).format('DD/MM/YYYY')}</>
                        )}
                    </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Departamento</p>
                    <p className="text-sm font-semibold text-slate-700">{item.dep_codigo || '—'}</p>
                </div>
            </div>

            {item.descricao && (
                <p className="text-sm text-slate-600 mb-3 bg-slate-50 rounded-lg p-3">
                    {item.descricao}
                </p>
            )}

            {/* Feedback do chefe */}
            {item.obs_chefe && (
                <div className={`rounded-lg p-3 mb-2 text-sm ${
                    item.status_chefe === 1 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                    <p className="font-semibold mb-1 text-xs uppercase tracking-wide text-slate-500">
                        Observação do Chefe
                    </p>
                    <p className={item.status_chefe === 1 ? 'text-green-700' : 'text-red-700'}>
                        {item.obs_chefe}
                    </p>
                </div>
            )}

            {/* Feedback do RH */}
            {item.obs_rh && (
                <div className={`rounded-lg p-3 mb-2 text-sm ${
                    item.status_rh === 1 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                    <p className="font-semibold mb-1 text-xs uppercase tracking-wide text-slate-500">
                        Observação do RH
                    </p>
                    <p className={item.status_rh === 1 ? 'text-green-700' : 'text-red-700'}>
                        {item.obs_rh}
                    </p>
                </div>
            )}

            {item.pdf_filename && (
                <div className="flex justify-end mt-2">
                    <Button
                        icon={<FilePdfOutlined />}
                        size="small"
                        onClick={() => onViewPDF(item.id)}
                        className="rounded-lg text-red-500 border-red-200 hover:bg-red-50"
                    >
                        Ver Documento
                    </Button>
                </div>
            )}
        </div>
    );
};

// ── Componente Principal ───────────────────────────────────────
export default function JustificacoesPessoal() {
    const { auth } = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [motivos, setMotivos] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formFilter] = Form.useForm();

    const loadMotivos = useCallback(async () => {
        try {
            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "JustificacaoMotivos" },
                filter: {}
            });
            if (res.data.status === 'success') setMotivos(res.data.rows);
        } catch (e) { /* silencioso */ }
    }, []);

    const loadData = useCallback(async (filters = {}) => {
        setLoading(true);
        try {
            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "JustificacoesList" },
                filter: { ...filters, _num: auth.num },
                pagination: { enabled: true, page: 1, pageSize: 50 }
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
    }, [auth.num, openNotification]);

    useEffect(() => {
        loadMotivos();
        loadData();
    }, []);

    const handleViewPDF = (id) => {
        const token = JSON.parse(localStorage.getItem('auth'))?.access_token;
        window.open(`${API_URL}/rponto/justificacao/pdf/${id}/?token=${token}`, '_blank');
    };

    const handleFilterFinish = (values) => {
        const filters = {
            fstatus: values.fstatus,
            fdata: values.fdata ? getFilterRangeValues(values.fdata?.formatted) : undefined
        };
        loadData(filters);
    };

    // Contadores por status
    const counts = {
        pendentes: rows.filter(r => r.status === 0 || r.status === 1).length,
        aprovados: rows.filter(r => r.status === 2).length,
        rejeitados: rows.filter(r => r.status === 3 || r.status === 4).length,
    };

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4
                            bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">As Minhas Justificações</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Submeta e acompanhe as suas justificações de ausência
                    </p>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => setShowModal(true)}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 border-none
                               font-semibold shadow-md shrink-0"
                >
                    Nova Justificação
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Em Curso', value: counts.pendentes, color: 'blue',   bg: 'bg-blue-50',   text: 'text-blue-600' },
                    { label: 'Aprovadas', value: counts.aprovados, color: 'green', bg: 'bg-green-50',  text: 'text-green-600' },
                    { label: 'Rejeitadas', value: counts.rejeitados, color: 'red', bg: 'bg-red-50',    text: 'text-red-600' },
                ].map(kpi => (
                    <div key={kpi.label}
                         className={`${kpi.bg} rounded-xl p-4 border border-${kpi.color}-100`}>
                        <p className={`text-2xl font-black ${kpi.text}`}>{kpi.value}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-1">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <Form form={formFilter} layout="inline" onFinish={handleFilterFinish}
                      className="flex flex-wrap gap-3 items-end">
                    <Form.Item name="fstatus" label="Estado" className="mb-0">
                        <Select
                            allowClear
                            placeholder="Todos"
                            style={{ width: 200 }}
                            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({
                                value: parseInt(k),
                                label: v.label
                            }))}
                        />
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

            {/* Lista */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {total} justificação{total !== 1 ? 'ões' : ''}
                    </span>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center p-16">
                        <Spin size="large" />
                    </div>
                ) : rows.length === 0 ? (
                    <Empty
                        description="Não tem justificações submetidas"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        className="py-16"
                    />
                ) : (
                    <YScroll>
                        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {rows.map(item => (
                                <JustificacaoCard
                                    key={item.id}
                                    item={item}
                                    onViewPDF={handleViewPDF}
                                />
                            ))}
                        </div>
                    </YScroll>
                )}
            </div>

            {/* Modal Nova Justificação */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <FileTextOutlined className="text-blue-500" />
                        <span>Nova Justificação</span>
                    </div>
                }
                open={showModal}
                onCancel={() => setShowModal(false)}
                footer={null}
                width={560}
                destroyOnClose
                className="rounded-xl"
            >
                <NovaJustificacaoForm
                    auth={auth}
                    motivos={motivos}
                    onSuccess={() => { setShowModal(false); loadData(); }}
                    onCancel={() => setShowModal(false)}
                />
            </Modal>
        </div>
    );
}