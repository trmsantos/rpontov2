import React, { useContext, useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import {
    Button, Form, Input, Select, Tag, Modal, Table, Space,
    Card, Tooltip, Popconfirm, DatePicker, Typography, Divider,
    Empty, Spin, Alert
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, UserOutlined,
    TeamOutlined, ReloadOutlined, CheckCircleOutlined,
    CloseCircleOutlined, SettingOutlined
} from '@ant-design/icons';
import { fetchPost } from "utils/fetch";
import { useSubmitting } from "utils";
import { API_URL } from "config";
import { AppContext } from "./App";
import { LayoutContext } from "./GridLayout";

const { Text, Title } = Typography;

const EQUIPAS = ['A', 'B', 'C', 'D', 'E'];

const EQUIPA_CORES = {
    A: '#3B82F6',
    B: '#10B981',
    C: '#F59E0B',
    D: '#EF4444',
    E: '#8B5CF6',
};

/* ══════════════════════════════════════════════════════════
   MODAL — Adicionar Chefe de Turno
   ══════════════════════════════════════════════════════════ */
const AdicionarChefeModal = ({ open, onClose, onSuccess }) => {
    const { openNotification } = useContext(LayoutContext);
    const [form]               = Form.useForm();
    const submitting           = useSubmitting(false);
    const [colaboradores, setColaboradores] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const handleSearch = async (value) => {
        if (!value || value.length < 2) return;
        setSearchLoading(true);
        try {
            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "ColaboradoresSageLookup" },
                filter: { search: value }
            });
            setColaboradores(res.data?.rows || []);
        } catch {
            setColaboradores([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            submitting.trigger();

            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "ChefeTurnoSave" },
                filter: {
                    num_chefe:  values.num_chefe,
                    equipa:     values.equipa,
                    dep_codigo: 'DPROD',
                    dt_inicio:  values.dt_inicio
                        ? values.dt_inicio.format('YYYY-MM-DD')
                        : dayjs().format('YYYY-MM-DD')
                }
            });

            if (res.data.status === 'success') {
                openNotification('success', 'top', 'Sucesso', res.data.title);
                form.resetFields();
                onSuccess();
                onClose();
            } else {
                openNotification('error', 'top', 'Erro', res.data.title);
            }
        } catch (e) {
            if (e.errorFields) return;
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            submitting.end();
        }
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <PlusOutlined className="text-green-500" />
                    <span>Adicionar Chefe de Turno</span>
                </div>
            }
            open={open}
            onCancel={() => { form.resetFields(); onClose(); }}
            width={520}
            destroyOnClose
            footer={[
                <Button key="cancel" onClick={onClose}>Cancelar</Button>,
                <Button key="submit" type="primary" loading={submitting.state}
                        onClick={handleSubmit}
                        className="bg-green-600 hover:bg-green-700">
                    Atribuir Chefe de Turno
                </Button>
            ]}
        >
            <Form form={form} layout="vertical" className="mt-4">
                <Form.Item
                    name="num_chefe" label="Colaborador (Chefe de Turno)"
                    rules={[{ required: true, message: 'Selecione o colaborador' }]}
                >
                    <Select
                        showSearch
                        placeholder="Pesquisar por nome ou número..."
                        onSearch={handleSearch}
                        loading={searchLoading}
                        filterOption={false}
                        notFoundContent={searchLoading ? <Spin size="small" /> : 'Pesquise um colaborador'}
                    >
                        {colaboradores.map(c => (
                            <Select.Option key={c.num} value={c.num}>
                                <span className="font-semibold">{c.num}</span> — {c.nome}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="equipa" label="Equipa"
                    rules={[{ required: true, message: 'Selecione a equipa' }]}
                >
                    <Select placeholder="Selecione a equipa...">
                        {EQUIPAS.map(e => (
                            <Select.Option key={e} value={e}>
                                <Tag color={EQUIPA_CORES[e]} className="mr-1">{e}</Tag>
                                Equipa {e}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item name="dt_inicio" label="Data de Início" initialValue={dayjs()}>
                    <DatePicker format="YYYY-MM-DD" className="w-full" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

/* ══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════ */
export default () => {
    const { auth }             = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);

    const [loading, setLoading]     = useState(false);
    const [data, setData]           = useState([]);
    const [modalOpen, setModalOpen] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "ChefeTurnoList" },
                filter: { dep_codigo: 'DPROD' }
            });
            if (res.data.status === 'success') {
                setData(res.data.rows || []);
            }
        } catch (e) {
            console.error('[GestaoChefeTurno] loadData error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDelete = async (id) => {
        try {
            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "ChefeTurnoDelete" },
                filter: { id }
            });
            if (res.data.status === 'success') {
                openNotification('success', 'top', 'Sucesso', res.data.title);
                loadData();
            } else {
                openNotification('error', 'top', 'Erro', res.data.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        }
    };

    /* ── Agrupar por equipa ── */
    const dataByEquipa = {};
    EQUIPAS.forEach(e => { dataByEquipa[e] = []; });
    data.forEach(row => {
        const eq = (row.equipa || '').trim().toUpperCase();
        if (dataByEquipa[eq]) {
            dataByEquipa[eq].push(row);
        }
    });

    /* ── Colunas da tabela dentro de cada card ── */
    const columns = [
        {
            title: 'Número',
            dataIndex: 'num_chefe',
            width: 100,
            render: v => <Text strong className="text-blue-600">{v}</Text>
        },
        {
            title: 'Nome',
            dataIndex: 'nome_chefe',
            ellipsis: false,
            render: v => <Text>{v || '—'}</Text>
        },
        {
            title: 'Desde',
            dataIndex: 'dt_inicio',
            width: 120,
            render: v => <Text type="secondary">{v || '—'}</Text>
        },
        {
            title: 'Estado',
            dataIndex: 'ativo',
            width: 100,
            align: 'center',
            render: v => v
                ? <Tag icon={<CheckCircleOutlined />} color="success">Ativo</Tag>
                : <Tag icon={<CloseCircleOutlined />} color="error">Inativo</Tag>
        },
        {
            title: 'Ações',
            key: 'acoes',
            width: 80,
            align: 'center',
            render: (_, r) => r.ativo ? (
                <Popconfirm
                    title="Remover chefe de turno?"
                    description={`${r.num_chefe} — ${r.nome_chefe || ''}`}
                    onConfirm={() => handleDelete(r.id)}
                    okText="Sim, remover"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true }}
                >
                    <Tooltip title="Remover">
                        <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                    </Tooltip>
                </Popconfirm>
            ) : null
        }
    ];

    const totalAtivos = data.filter(r => r.ativo).length;

    return (
        <div className="p-4 max-w-[1400px] mx-auto">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <SettingOutlined className="text-xl text-purple-600" />
                    </div>
                    <div>
                        <Title level={4} className="!mb-0">Gestão de Chefes de Turno</Title>
                        <Text type="secondary">
                            DPROD — {totalAtivos} chefe{totalAtivos !== 1 ? 's' : ''} de turno ativo{totalAtivos !== 1 ? 's' : ''}
                        </Text>
                    </div>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
                        Atualizar
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setModalOpen(true)}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        Adicionar Chefe de Turno
                    </Button>
                </Space>
            </div>

            {loading && !data.length ? (
                <div className="flex justify-center py-20">
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    {/* ── Tabela completa (todos os chefes) ── */}
                    <Card className="mb-6 shadow-sm" bodyStyle={{ padding: 0 }}>
                        <div className="px-4 py-3 border-b border-gray-100">
                            <Text strong className="text-base">Todos os Chefes de Turno</Text>
                        </div>
                        <Table
                            columns={[
                                {
                                    title: 'Equipa',
                                    dataIndex: 'equipa',
                                    width: 90,
                                    align: 'center',
                                    filters: EQUIPAS.map(e => ({ text: `Equipa ${e}`, value: e })),
                                    onFilter: (value, record) => (record.equipa || '').trim().toUpperCase() === value,
                                    render: v => (
                                        <Tag
                                            color={EQUIPA_CORES[(v || '').trim().toUpperCase()] || 'default'}
                                            className="font-bold text-sm px-3"
                                        >
                                            {(v || '').trim().toUpperCase()}
                                        </Tag>
                                    )
                                },
                                ...columns
                            ]}
                            dataSource={data}
                            rowKey="id"
                            size="middle"
                            pagination={false}
                            loading={loading}
                            scroll={{ x: 700 }}
                            locale={{
                                emptyText: (
                                    <Empty
                                        description="Nenhum chefe de turno registado"
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    />
                                )
                            }}
                        />
                    </Card>

                    {/* ── Cards por equipa ── */}
                    <Divider className="!mb-4">
                        <Text type="secondary" className="text-xs uppercase tracking-wider">
                            Por Equipa
                        </Text>
                    </Divider>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {EQUIPAS.map(eq => {
                            const equipaData = dataByEquipa[eq];
                            const ativos     = equipaData.filter(r => r.ativo).length;

                            return (
                                <Card
                                    key={eq}
                                    title={
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Tag
                                                    color={EQUIPA_CORES[eq]}
                                                    className="font-bold text-sm px-3 py-0.5"
                                                >
                                                    {eq}
                                                </Tag>
                                                <span className="font-semibold">Equipa {eq}</span>
                                            </div>
                                            <Tag color={ativos > 0 ? 'blue' : 'default'}>
                                                {ativos} ativo{ativos !== 1 ? 's' : ''}
                                            </Tag>
                                        </div>
                                    }
                                    size="small"
                                    className="shadow-sm"
                                    bodyStyle={{ padding: equipaData.length ? 0 : undefined }}
                                >
                                    {equipaData.length === 0 ? (
                                        <Empty
                                            description="Sem chefes de turno"
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            className="py-2"
                                        />
                                    ) : (
                                        <div className="divide-y divide-gray-50">
                                            {equipaData.map(r => (
                                                <div
                                                    key={r.id}
                                                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Text strong className="text-blue-600 text-sm">
                                                                {r.num_chefe}
                                                            </Text>
                                                            {r.ativo
                                                                ? <Tag color="success" className="text-[10px]">Ativo</Tag>
                                                                : <Tag color="error" className="text-[10px]">Inativo</Tag>
                                                            }
                                                        </div>
                                                        <Text className="text-sm block truncate">
                                                            {r.nome_chefe || '—'}
                                                        </Text>
                                                        <Text type="secondary" className="text-xs">
                                                            Desde: {r.dt_inicio || '—'}
                                                        </Text>
                                                    </div>
                                                    {r.ativo && (
                                                        <Popconfirm
                                                            title="Remover?"
                                                            description={`${r.num_chefe}`}
                                                            onConfirm={() => handleDelete(r.id)}
                                                            okText="Sim"
                                                            cancelText="Não"
                                                            okButtonProps={{ danger: true }}
                                                        >
                                                            <Button
                                                                type="text"
                                                                danger
                                                                icon={<DeleteOutlined />}
                                                                size="small"
                                                            />
                                                        </Popconfirm>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ── Modal ── */}
            <AdicionarChefeModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={loadData}
            />
        </div>
    );
};